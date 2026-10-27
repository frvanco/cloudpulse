import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { IngestAppModule } from './../src/ingest-app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import {
  TaskQueue,
  type EnqueueResult,
  type QueuedHttpTask,
} from './../src/ingestion/task-queue.js';
import {
  EventPublisher,
  type DomainEvent,
} from './../src/events/event-publisher.js';

// File factice : reproduit le dédoublonnage par nom de Cloud Tasks.
class FakeTaskQueue extends TaskQueue {
  readonly tasks = new Map<string, QueuedHttpTask>();

  enqueue(task: QueuedHttpTask): Promise<EnqueueResult> {
    if (this.tasks.has(task.id)) return Promise.resolve('exists');
    this.tasks.set(task.id, task);
    return Promise.resolve('created');
  }
}

// Éditeur factice : garde les événements publiés, ou échoue à la demande.
class FakeEventPublisher extends EventPublisher {
  readonly events: DomainEvent[] = [];
  failing = false;

  publish(event: DomainEvent): Promise<string> {
    if (this.failing) return Promise.reject(new Error('unavailable'));
    this.events.push(event);
    return Promise.resolve(String(this.events.length));
  }
}

const series = (closes: Record<string, string>) =>
  Response.json({
    meta: { symbol: 'NVDA', interval: '1day', currency: 'USD' },
    values: Object.entries(closes).map(([datetime, close]) => ({
      datetime,
      open: '180.00',
      high: '185.00',
      low: '179.00',
      close,
      volume: '150000000',
    })),
    status: 'ok',
  });

const providerError = (code: number) =>
  Response.json({ status: 'error', code, message: 'error' });

describe('Ingestion (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let queue: FakeTaskQueue;
  let events: FakeEventPublisher;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    queue = new FakeTaskQueue();
    events = new FakeEventPublisher();

    const moduleFixture = await Test.createTestingModule({
      imports: [IngestAppModule],
    })
      .overrideProvider(TaskQueue)
      .useValue(queue)
      .overrideProvider(EventPublisher)
      .useValue(events)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$executeRaw`TRUNCATE company, quote, daily_price RESTART IDENTITY CASCADE`;
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  const createCompany = (symbol: string) =>
    prisma.company.create({
      data: { symbol, name: symbol, exchange: 'NASDAQ', currency: 'USD' },
    });

  describe('POST /internal/ingestion/dispatch', () => {
    it('enqueues one task per company, once per day', async () => {
      await createCompany('NVDA');
      await createCompany('BRK.B');

      const first = await request(app.getHttpServer())
        .post('/internal/ingestion/dispatch')
        .expect(200);
      expect(first.body).toMatchObject({
        companies: 2,
        enqueued: 2,
        alreadyQueued: 0,
      });

      const date = first.body.date as string;
      expect(queue.tasks.get(`BRK_B-${date}`)?.url).toBe(
        'https://ingest.example.test/internal/ingestion/symbols/BRK.B',
      );
      expect(queue.tasks.has(`NVDA-${date}`)).toBe(true);

      // Relancer le dispatch le même jour ne recrée pas les tâches.
      const second = await request(app.getHttpServer())
        .post('/internal/ingestion/dispatch')
        .expect(200);
      expect(second.body).toMatchObject({ enqueued: 0, alreadyQueued: 2 });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('POST /internal/ingestion/symbols/:symbol', () => {
    const ingest = (symbol: string) =>
      request(app.getHttpServer()).post(
        `/internal/ingestion/symbols/${symbol}`,
      );

    it('stores daily prices and stays idempotent when replayed', async () => {
      await createCompany('NVDA');
      fetchMock.mockResolvedValueOnce(
        series({ '2026-10-14': '183.25', '2026-10-13': '181.00' }),
      );

      await ingest('NVDA').expect(200).expect({
        symbol: 'NVDA',
        status: 'ingested',
        days: 2,
        published: true,
      });

      const url = new URL(String(fetchMock.mock.calls[0][0]));
      expect(url.pathname).toBe('/time_series');
      expect(url.searchParams.get('interval')).toBe('1day');
      expect(url.searchParams.get('outputsize')).toBe('5');

      // Rejouer la tâche avec une valeur corrigée : mise à jour, pas de doublon.
      fetchMock.mockResolvedValueOnce(series({ '2026-10-14': '184.00' }));
      await ingest('NVDA').expect(200);

      const rows = await prisma.dailyPrice.findMany({
        orderBy: { date: 'asc' },
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.date.toISOString().slice(0, 10))).toEqual([
        '2026-10-13',
        '2026-10-14',
      ]);
      expect(rows[1].close.toString()).toBe('184');
      expect(rows[1].volume).toBe(150000000n);
    });

    it('publishes the latest day with its previous close', async () => {
      await createCompany('NVDA');
      fetchMock.mockResolvedValueOnce(
        series({ '2026-10-14': '183.25', '2026-10-13': '181.00' }),
      );

      await ingest('NVDA').expect(200);

      expect(events.events).toEqual([
        {
          type: 'prices.ingested',
          id: 'NVDA-2026-10-14',
          attributes: { symbol: 'NVDA' },
          data: expect.objectContaining({
            eventId: 'NVDA-2026-10-14',
            symbol: 'NVDA',
            date: '2026-10-14',
            close: '183.25',
            previousClose: '181.00',
            currency: 'USD',
          }) as unknown,
        },
      ]);
    });

    it('does not publish without a previous day', async () => {
      await createCompany('NVDA');
      fetchMock.mockResolvedValueOnce(series({ '2026-10-14': '183.25' }));

      const res = await ingest('NVDA').expect(200);
      expect(res.body.published).toBe(false);
      expect(events.events).toHaveLength(0);
    });

    it('returns 503 when publication fails so Cloud Tasks replays the task', async () => {
      await createCompany('NVDA');
      // Une Response neuve par appel : son corps ne se lit qu'une fois.
      fetchMock.mockImplementation(() =>
        Promise.resolve(
          series({ '2026-10-14': '183.25', '2026-10-13': '181.00' }),
        ),
      );
      events.failing = true;

      await ingest('NVDA').expect(503);
      // Les cours sont déjà en base : le rejeu les réécrit puis publie.
      expect(await prisma.dailyPrice.count()).toBe(2);

      events.failing = false;
      await ingest('NVDA').expect(200);
      expect(await prisma.dailyPrice.count()).toBe(2);
      expect(events.events).toHaveLength(1);
    });

    it('skips an unknown company without calling the provider', async () => {
      await ingest('NVDA').expect(200).expect({
        symbol: 'NVDA',
        status: 'skipped',
        reason: 'unknown company',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('acknowledges (2xx) a symbol unknown to the provider so it is not retried', async () => {
      await createCompany('XXXXX');
      fetchMock.mockResolvedValue(providerError(404));
      const res = await ingest('XXXXX').expect(200);
      expect(res.body.status).toBe('skipped');
    });

    it('returns 429 on provider rate limit so Cloud Tasks retries', async () => {
      await createCompany('NVDA');
      fetchMock.mockResolvedValue(providerError(429));
      await ingest('NVDA').expect(429);
      expect(await prisma.dailyPrice.count()).toBe(0);
    });

    it('rejects an invalid symbol', () => {
      return ingest('NV%20DA').expect(400);
    });
  });

  it('does not expose the public API routes', () => {
    return request(app.getHttpServer())
      .get('/companies/NVDA/quote')
      .expect(404);
  });

  it('exposes the readiness probe for the pipeline smoke test', () => {
    return request(app.getHttpServer()).get('/health/ready').expect(200);
  });
});

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const nvdaQuote = {
  symbol: 'NVDA',
  name: 'NVIDIA Corp',
  exchange: 'NASDAQ',
  currency: 'USD',
  datetime: '2026-09-29',
  timestamp: 1790640000,
  open: '180.10',
  high: '184.00',
  low: '179.50',
  close: '183.25',
  volume: '150000000',
  previous_close: '180.00',
  change: '3.25',
  percent_change: '1.80556',
  is_market_open: false,
};

const providerError = (code: number, message = 'error') =>
  Response.json({ status: 'error', code, message });

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$executeRaw`TRUNCATE company, quote RESTART IDENTITY CASCADE`;
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  const getQuote = (symbol: string) =>
    request(app.getHttpServer()).get(`/companies/${symbol}/quote`);

  // Rend le cours en base plus vieux que le TTL.
  const expireCachedQuotes = () =>
    prisma.quote.updateMany({ data: { fetchedAt: new Date(0) } });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  describe('GET /companies/:symbol/quote', () => {
    it('fetches from the provider, stores and returns the quote', async () => {
      fetchMock.mockResolvedValue(Response.json(nvdaQuote));

      const res = await getQuote('nvda').expect(200);

      expect(res.body).toMatchObject({
        symbol: 'NVDA',
        name: 'NVIDIA Corp',
        exchange: 'NASDAQ',
        currency: 'USD',
        price: 183.25,
        previousClose: 180,
        change: 3.25,
        changePercent: 1.80556,
        isMarketOpen: false,
        marketTimestamp: '2026-09-29T00:00:00.000Z',
        stale: false,
      });
      expect(await prisma.company.count()).toBe(1);
      expect((await prisma.quote.findFirstOrThrow()).price.toString()).toBe(
        '183.25',
      );

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe('https://api.twelvedata.com/quote?symbol=NVDA');
      expect(new Headers(init?.headers).get('Authorization')).toBe(
        'apikey test-key',
      );
    });

    it('serves a fresh quote from the database without calling the provider', async () => {
      fetchMock.mockResolvedValue(Response.json(nvdaQuote));
      await getQuote('NVDA').expect(200);

      await getQuote('NVDA').expect(200);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('refreshes an expired quote without duplicating rows', async () => {
      fetchMock.mockResolvedValueOnce(Response.json(nvdaQuote));
      await getQuote('NVDA').expect(200);
      await expireCachedQuotes();

      fetchMock.mockResolvedValueOnce(
        Response.json({ ...nvdaQuote, close: '190.00' }),
      );
      const res = await getQuote('NVDA').expect(200);

      expect(res.body.price).toBe(190);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(await prisma.company.count()).toBe(1);
      expect(await prisma.quote.count()).toBe(1);
    });

    it('serves a stale quote when the provider rate limit is reached', async () => {
      fetchMock.mockResolvedValueOnce(Response.json(nvdaQuote));
      await getQuote('NVDA').expect(200);
      await expireCachedQuotes();

      fetchMock.mockResolvedValueOnce(providerError(429));
      const res = await getQuote('NVDA').expect(200);

      expect(res.body).toMatchObject({ price: 183.25, stale: true });
    });

    it('returns 429 when the rate limit is reached and nothing is stored', () => {
      fetchMock.mockResolvedValue(providerError(429));
      return getQuote('NVDA').expect(429);
    });

    it('returns 404 when the provider reports an unknown symbol with HTTP 200', () => {
      fetchMock.mockResolvedValue(providerError(404, 'symbol not found'));
      return getQuote('XXXXX').expect(404);
    });

    it('returns 502 and hides the provider message on an invalid API key', async () => {
      fetchMock.mockResolvedValue(providerError(401, 'bad key test-key'));
      const res = await getQuote('NVDA').expect(502);
      expect(JSON.stringify(res.body)).not.toContain('test-key');
    });

    it('returns 502 when the provider is unreachable', () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      return getQuote('NVDA').expect(502);
    });

    it('rejects an invalid symbol without calling the provider', async () => {
      await getQuote('NV%20DA%3Bx').expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

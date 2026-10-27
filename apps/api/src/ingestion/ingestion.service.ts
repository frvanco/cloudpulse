import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import { EventPublisher } from '../events/event-publisher.js';
import {
  buildPricesIngestedEvent,
  PRICES_INGESTED,
} from '../events/prices-ingested.event.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TwelveDataService } from '../twelve-data/twelve-data.service.js';
import type { TwelveDataTimeSeriesValue } from '../twelve-data/twelve-data.types.js';
import { ingestionTaskId } from './task-id.js';
import { TaskQueue } from './task-queue.js';

export interface DispatchResult {
  date: string;
  companies: number;
  enqueued: number;
  alreadyQueued: number;
}

export type IngestResult =
  | { symbol: string; status: 'ingested'; days: number; published: boolean }
  | { symbol: string; status: 'skipped'; reason: string };

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twelveData: TwelveDataService,
    private readonly queue: TaskQueue,
    private readonly events: EventPublisher,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Appelé par Cloud Scheduler : une tâche par entreprise connue.
  // Le débit vers Twelve Data est régulé par la file, pas par ce code.
  async dispatch(now = new Date()): Promise<DispatchResult> {
    const date = now.toISOString().slice(0, 10);
    const companies = await this.prisma.company.findMany({
      select: { symbol: true },
      orderBy: { symbol: 'asc' },
    });
    const target = this.config.get('INGESTION_TARGET_URL');

    let enqueued = 0;
    let alreadyQueued = 0;
    for (const { symbol } of companies) {
      const result = await this.queue.enqueue({
        id: ingestionTaskId(symbol, date),
        url: `${target}/internal/ingestion/symbols/${encodeURIComponent(symbol)}`,
      });
      if (result === 'created') enqueued++;
      else alreadyQueued++;
    }

    const summary = {
      date,
      companies: companies.length,
      enqueued,
      alreadyQueued,
    };
    this.logger.log({ event: 'ingestion.dispatch', ...summary });
    return summary;
  }

  // Appelé par Cloud Tasks, une fois par entreprise. Idempotent : rejouer la
  // tâche réécrit les mêmes lignes (upsert sur (entreprise, date)).
  async ingestSymbol(symbol: string): Promise<IngestResult> {
    const company = await this.prisma.company.findUnique({ where: { symbol } });
    if (!company) {
      return this.skip(symbol, 'unknown company');
    }

    let values: TwelveDataTimeSeriesValue[];
    try {
      const series = await this.twelveData.getDailySeries(
        symbol,
        this.config.get('INGESTION_HISTORY_DAYS'),
      );
      values = series.values;
    } catch (error) {
      // Erreur définitive : réessayer ne servirait à rien. On répond 2xx pour
      // que Cloud Tasks n'insiste pas. Les erreurs passagères (429, 502)
      // remontent en 4xx/5xx et déclenchent un retry avec backoff.
      if (error instanceof NotFoundException) {
        return this.skip(symbol, 'unknown symbol at provider');
      }
      throw error;
    }

    await this.prisma.$transaction(
      values.map((value) => {
        const row = toDailyPriceRow(value);
        return this.prisma.dailyPrice.upsert({
          where: { companyId_date: { companyId: company.id, date: row.date } },
          create: { companyId: company.id, ...row },
          update: row,
        });
      }),
    );

    const messageId = await this.publishIngested(
      symbol,
      company.currency,
      values,
    );

    const result: IngestResult = {
      symbol,
      status: 'ingested',
      days: values.length,
      published: messageId !== null,
    };
    this.logger.log({ event: 'ingestion.symbol', ...result, messageId });
    return result;
  }

  // Publié après l'écriture en base, hors transaction : si la publication
  // échoue, la tâche est rejouée (503), l'upsert réécrit les mêmes lignes et
  // l'événement est republié. Un consommateur peut donc le recevoir en double.
  private async publishIngested(
    symbol: string,
    currency: string,
    values: TwelveDataTimeSeriesValue[],
  ): Promise<string | null> {
    const event = buildPricesIngestedEvent(symbol, currency, values);
    if (!event) return null;

    try {
      return await this.events.publish({
        type: PRICES_INGESTED,
        id: event.eventId,
        data: event,
        attributes: { symbol },
      });
    } catch (error) {
      this.logger.error({
        event: 'event.publish',
        type: PRICES_INGESTED,
        eventId: event.eventId,
        outcome: 'error',
        error: (error as Error).message,
      });
      throw new ServiceUnavailableException('Event publication failed');
    }
  }

  private skip(symbol: string, reason: string): IngestResult {
    const result: IngestResult = { symbol, status: 'skipped', reason };
    this.logger.warn({ event: 'ingestion.symbol', ...result });
    return result;
  }
}

// Les prix restent des chaînes jusqu'à PostgreSQL (NUMERIC) : pas de float.
function toDailyPriceRow(value: TwelveDataTimeSeriesValue) {
  return {
    date: new Date(`${value.datetime.slice(0, 10)}T00:00:00Z`),
    open: value.open,
    high: value.high,
    low: value.low,
    close: value.close,
    volume: value.volume ? BigInt(value.volume) : null,
  };
}

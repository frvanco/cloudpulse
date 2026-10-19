import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
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
  | { symbol: string; status: 'ingested'; days: number }
  | { symbol: string; status: 'skipped'; reason: string };

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twelveData: TwelveDataService,
    private readonly queue: TaskQueue,
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

    const result: IngestResult = {
      symbol,
      status: 'ingested',
      days: values.length,
    };
    this.logger.log({ event: 'ingestion.symbol', ...result });
    return result;
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

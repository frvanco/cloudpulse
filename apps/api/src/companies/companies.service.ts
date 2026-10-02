import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TwelveDataService } from '../twelve-data/twelve-data.service.js';
import type { TwelveDataQuoteResponse } from '../twelve-data/twelve-data.types.js';
import type { QuoteDto } from './quote.dto.js';

type StoredQuote = NonNullable<
  Awaited<ReturnType<CompaniesService['findStoredQuote']>>
>;

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twelveData: TwelveDataService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Cache-aside : base d'abord, Twelve Data seulement si absent ou périmé.
  async getQuote(symbol: string): Promise<QuoteDto> {
    const stored = await this.findStoredQuote(symbol);
    if (stored && this.isFresh(stored.fetchedAt)) {
      return toQuoteDto(stored, false);
    }

    let fresh: TwelveDataQuoteResponse;
    try {
      fresh = await this.twelveData.getQuote(symbol);
    } catch (error) {
      // Dégradation gracieuse : quota atteint ou fournisseur en panne, on sert
      // la dernière valeur connue en le signalant.
      if (stored && isTransientProviderError(error)) {
        this.logger.warn(`Serving stale quote for ${symbol}`);
        return toQuoteDto(stored, true);
      }
      throw error;
    }

    return toQuoteDto(await this.saveQuote(symbol, fresh), false);
  }

  private findStoredQuote(symbol: string) {
    return this.prisma.quote.findFirst({
      where: { company: { symbol } },
      include: { company: true },
    });
  }

  // Écriture idempotente : rejouer le même appel ne crée pas de doublon.
  private async saveQuote(
    symbol: string,
    quote: TwelveDataQuoteResponse,
  ): Promise<StoredQuote> {
    const company = {
      name: quote.name,
      exchange: quote.exchange,
      currency: quote.currency,
    };
    // Les prix restent des chaînes jusqu'à PostgreSQL (NUMERIC) : pas de float.
    const data = {
      price: quote.close,
      previousClose: quote.previous_close,
      change: quote.change,
      changePercent: quote.percent_change,
      isMarketOpen: quote.is_market_open,
      marketTimestamp: new Date(quote.timestamp * 1000),
      fetchedAt: new Date(),
    };
    const saved = await this.prisma.company.upsert({
      where: { symbol },
      create: { symbol, ...company, quote: { create: data } },
      update: { ...company, quote: { upsert: { create: data, update: data } } },
      include: { quote: true },
    });
    const { quote: savedQuote, ...savedCompany } = saved;
    return { ...savedQuote!, company: savedCompany };
  }

  private isFresh(fetchedAt: Date): boolean {
    const ttlMs = this.config.get('QUOTE_TTL_SECONDS') * 1000;
    return Date.now() - fetchedAt.getTime() < ttlMs;
  }
}

function isTransientProviderError(error: unknown): boolean {
  return (
    error instanceof HttpException &&
    [HttpStatus.TOO_MANY_REQUESTS, HttpStatus.BAD_GATEWAY].includes(
      error.getStatus(),
    )
  );
}

function toQuoteDto(quote: StoredQuote, stale: boolean): QuoteDto {
  return {
    symbol: quote.company.symbol,
    name: quote.company.name,
    exchange: quote.company.exchange,
    currency: quote.company.currency,
    price: quote.price.toNumber(),
    previousClose: quote.previousClose.toNumber(),
    change: quote.change.toNumber(),
    changePercent: quote.changePercent.toNumber(),
    isMarketOpen: quote.isMarketOpen,
    marketTimestamp: quote.marketTimestamp.toISOString(),
    fetchedAt: quote.fetchedAt.toISOString(),
    stale,
  };
}

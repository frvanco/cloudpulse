import { Injectable } from '@nestjs/common';
import { TwelveDataService } from '../twelve-data/twelve-data.service.js';
import type { TwelveDataQuoteResponse } from '../twelve-data/twelve-data.types.js';
import type { QuoteDto } from './quote.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly twelveData: TwelveDataService) {}

  async getQuote(symbol: string): Promise<QuoteDto> {
    const quote = await this.twelveData.getQuote(symbol);
    return toQuoteDto(quote);
  }
}

function toQuoteDto(quote: TwelveDataQuoteResponse): QuoteDto {
  return {
    symbol: quote.symbol,
    name: quote.name,
    exchange: quote.exchange,
    currency: quote.currency,
    price: Number(quote.close),
    previousClose: Number(quote.previous_close),
    change: Number(quote.change),
    changePercent: Number(quote.percent_change),
    isMarketOpen: quote.is_market_open,
    marketTimestamp: new Date(quote.timestamp * 1000).toISOString(),
  };
}

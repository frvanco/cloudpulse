import {
  BadRequestException,
  Controller,
  Get,
  Param,
  type PipeTransform,
} from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import type { QuoteDto } from './quote.dto.js';

// Tickers : lettres, chiffres, point, tiret et deux-points (ex. BRK.B, MC:EPA).
const SYMBOL_PATTERN = /^[A-Za-z0-9.:-]{1,20}$/;

class SymbolPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!SYMBOL_PATTERN.test(value)) {
      throw new BadRequestException('Invalid symbol');
    }
    return value.toUpperCase();
  }
}

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get(':symbol/quote')
  getQuote(@Param('symbol', SymbolPipe) symbol: string): Promise<QuoteDto> {
    return this.companies.getQuote(symbol);
  }
}

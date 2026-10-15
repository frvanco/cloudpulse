import { Controller, Get, Param } from '@nestjs/common';
import { SymbolPipe } from '../common/symbol.pipe.js';
import { CompaniesService } from './companies.service.js';
import type { QuoteDto } from './quote.dto.js';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get(':symbol/quote')
  getQuote(@Param('symbol', SymbolPipe) symbol: string): Promise<QuoteDto> {
    return this.companies.getQuote(symbol);
  }
}

import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { SymbolPipe } from '../common/symbol.pipe.js';
import {
  IngestionService,
  type DispatchResult,
  type IngestResult,
} from './ingestion.service.js';

// Routes internes : montées uniquement dans le service cloudpulse-ingest
// (APP_MODE=ingest), privé et appelé par Cloud Scheduler et Cloud Tasks.
@Controller('internal/ingestion')
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post('dispatch')
  @HttpCode(200)
  dispatch(): Promise<DispatchResult> {
    return this.ingestion.dispatch();
  }

  @Post('symbols/:symbol')
  @HttpCode(200)
  ingestSymbol(
    @Param('symbol', SymbolPipe) symbol: string,
  ): Promise<IngestResult> {
    return this.ingestion.ingestSymbol(symbol);
  }
}

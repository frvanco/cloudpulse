import { Module } from '@nestjs/common';
import { TwelveDataService } from './twelve-data.service.js';

@Module({
  providers: [TwelveDataService],
  exports: [TwelveDataService],
})
export class TwelveDataModule {}

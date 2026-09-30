import { Module } from '@nestjs/common';
import { TwelveDataModule } from '../twelve-data/twelve-data.module.js';
import { CompaniesController } from './companies.controller.js';
import { CompaniesService } from './companies.service.js';

@Module({
  imports: [TwelveDataModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}

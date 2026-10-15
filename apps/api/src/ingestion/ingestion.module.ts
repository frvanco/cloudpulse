import { Module } from '@nestjs/common';
import { TwelveDataModule } from '../twelve-data/twelve-data.module.js';
import { IngestionController } from './ingestion.controller.js';
import { IngestionService } from './ingestion.service.js';
import { CloudTasksQueue, TaskQueue } from './task-queue.js';

@Module({
  imports: [TwelveDataModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    { provide: TaskQueue, useClass: CloudTasksQueue },
  ],
})
export class IngestionModule {}

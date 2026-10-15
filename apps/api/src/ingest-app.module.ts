import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthController } from './health/health.controller.js';
import { IngestionModule } from './ingestion/ingestion.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

// Mode « ingest » : l'ingestion périodique (service cloudpulse-ingest, privé).
@Module({
  imports: [AppConfigModule, PrismaModule, IngestionModule],
  controllers: [HealthController],
})
export class IngestAppModule {}

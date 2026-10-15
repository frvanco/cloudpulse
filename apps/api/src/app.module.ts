import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

// Mode « api » : l'API publique (service cloudpulse-api).
@Module({
  imports: [AppConfigModule, PrismaModule, CompaniesModule],
  controllers: [HealthController],
})
export class AppModule {}

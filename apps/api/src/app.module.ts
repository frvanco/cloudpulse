import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CompaniesModule } from './companies/companies.module.js';
import { validateEnv } from './config/env.validation.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // En local on lit .env ; sur Cloud Run il n'existe pas et seules les
      // variables d'environnement du service sont utilisées.
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    CompaniesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation.js';

// Configuration commune aux deux modes (api et ingest).
export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnv,
  // En local on lit .env ; sur Cloud Run il n'existe pas et seules les
  // variables d'environnement du service sont utilisées.
  ignoreEnvFile: process.env.NODE_ENV === 'production',
});

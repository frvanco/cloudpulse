import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Cloud Run envoie SIGTERM avant d'arrêter une instance : arrêt propre.
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  // 0.0.0.0 : écouter sur toutes les interfaces, pas seulement localhost,
  // sinon le trafic entrant dans le conteneur n'atteint pas l'application.
  await app.listen(config.get('PORT'), '0.0.0.0');
}
await bootstrap();

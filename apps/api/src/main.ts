import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.validation.js';
import { IngestAppModule } from './ingest-app.module.js';

async function bootstrap() {
  // Même image, deux services : APP_MODE choisit le module racine. La valeur
  // est ensuite revalidée par la configuration.
  const rootModule =
    process.env.APP_MODE === 'ingest' ? IngestAppModule : AppModule;
  const app = await NestFactory.create(rootModule);
  // Cloud Run envoie SIGTERM avant d'arrêter une instance : arrêt propre.
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  // 0.0.0.0 : écouter sur toutes les interfaces, pas seulement localhost,
  // sinon le trafic entrant dans le conteneur n'atteint pas l'application.
  await app.listen(config.get('PORT'), '0.0.0.0');
}
await bootstrap();

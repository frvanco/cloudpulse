import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.validation.js';
import { IngestAppModule } from './ingest-app.module.js';
import { GcpJsonLogger } from './observability/gcp-json-logger.js';
import { requestContextMiddleware } from './observability/request-context.js';

async function bootstrap() {
  // Même image, deux services : APP_MODE choisit le module racine. La valeur
  // est ensuite revalidée par la configuration.
  const rootModule =
    process.env.APP_MODE === 'ingest' ? IngestAppModule : AppModule;

  // Le logger est choisi avant le chargement de la configuration, pour que
  // même une erreur de configuration au démarrage sorte en JSON sur Cloud Run.
  const logFormat =
    process.env.LOG_FORMAT ??
    (process.env.NODE_ENV === 'production' ? 'json' : 'pretty');
  const logger =
    logFormat === 'json'
      ? new GcpJsonLogger({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
          service: process.env.K_SERVICE,
          version: process.env.K_REVISION,
        })
      : undefined;

  const app = await NestFactory.create(rootModule, { logger });
  app.use(requestContextMiddleware);
  // Cloud Run envoie SIGTERM avant d'arrêter une instance : arrêt propre.
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  // 0.0.0.0 : écouter sur toutes les interfaces, pas seulement localhost,
  // sinon le trafic entrant dans le conteneur n'atteint pas l'application.
  await app.listen(config.get('PORT'), '0.0.0.0');
}
await bootstrap();

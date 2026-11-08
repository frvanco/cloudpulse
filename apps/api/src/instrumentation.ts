// Chargé avant l'application : node --import ./dist/instrumentation.js dist/main.js
// L'instrumentation doit être en place avant que http, express, pg ou fetch ne
// soient importés, sinon leurs appels ne produisent pas de spans.
import { register } from 'node:module';
import { onTelemetryShutdown } from './observability/telemetry-shutdown.js';

const service = process.env.K_SERVICE ?? 'cloudpulse-api';
const version = process.env.K_REVISION ?? 'local';

// Le logger de l'application n'existe pas encore : ligne JSON directe.
function log(fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({ severity: 'INFO', message: fields.event, ...fields }),
  );
}

if (process.env.TRACING_ENABLED === 'true') {
  // Application en modules ES : le hook import-in-the-middle intercepte les
  // import (en plus des require) pour que les instrumentations s'appliquent.
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  // Traces seulement : sans cela, NodeSDK crée aussi des exportateurs OTLP de
  // métriques et de logs vers localhost:4318, qui échouent en boucle et
  // retardent l'arrêt. Les logs passent par stdout (Cloud Logging).
  process.env.OTEL_METRICS_EXPORTER ??= 'none';
  process.env.OTEL_LOGS_EXPORTER ??= 'none';

  const { NodeSDK, resources, tracing } =
    await import('@opentelemetry/sdk-node');
  const { HttpInstrumentation } =
    await import('@opentelemetry/instrumentation-http');
  const { ExpressInstrumentation } =
    await import('@opentelemetry/instrumentation-express');
  const { PgInstrumentation } =
    await import('@opentelemetry/instrumentation-pg');
  const { UndiciInstrumentation } =
    await import('@opentelemetry/instrumentation-undici');

  // Ratio appliqué aux requêtes sans décision d'échantillonnage. Si l'appelant
  // (Cloud Run, Cloud Tasks) en transmet une dans traceparent, elle est suivie.
  const ratio = Number(process.env.TRACE_SAMPLE_RATIO ?? '0.1');
  const exporter =
    process.env.TRACE_EXPORTER === 'console'
      ? new tracing.ConsoleSpanExporter()
      : new (
          await import('@google-cloud/opentelemetry-cloud-trace-exporter')
        ).TraceExporter();

  const sdk = new NodeSDK({
    resource: resources.resourceFromAttributes({
      'service.name': service,
      'service.version': version,
    }),
    sampler: new tracing.ParentBasedSampler({
      root: new tracing.TraceIdRatioBasedSampler(ratio),
    }),
    spanProcessors: [new tracing.BatchSpanProcessor(exporter)],
    instrumentations: [
      new HttpInstrumentation({
        // Les sondes et vérifications appellent /health* en continu : bruit.
        ignoreIncomingRequestHook: (req) =>
          req.url?.startsWith('/health') ?? false,
      }),
      new ExpressInstrumentation(),
      new PgInstrumentation(),
      new UndiciInstrumentation(),
    ],
  });
  sdk.start();
  // Appelé par main.ts après la fermeture de l'application, avant de quitter :
  // les spans en attente sont envoyés.
  onTelemetryShutdown(() => sdk.shutdown());
  log({ event: 'tracing.started', ratio, service, version });
}

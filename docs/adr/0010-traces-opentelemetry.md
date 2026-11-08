# ADR 0010 — Traces avec OpenTelemetry et Cloud Trace

- Statut : acceptée
- Date : 2026-11-08

## Contexte

Les logs disent ce qui s'est passé et les métriques combien de fois, mais pas où passe le
temps d'une requête (Twelve Data, PostgreSQL, code) ni comment une ingestion traverse
Cloud Tasks, l'ingest et Pub/Sub.

## Décisions

1. **OpenTelemetry**, exporté vers **Cloud Trace**, dans l'API et l'ingest. Instrumentation
   de HTTP (entrant et sortant), Express, `pg` et `fetch` (undici), chargée avant
   l'application (`node --import ./dist/instrumentation.js`) ; le hook
   import-in-the-middle couvre les modules ES.
2. **Désactivé par défaut** (`TRACING_ENABLED`) : rien ne change en local, en test, ni sur
   un service qui ne l'active pas.
3. **Échantillonnage** : la décision de l'appelant (`traceparent`) est suivie ; sinon
   `TRACE_SAMPLE_RATIO` (10 % par défaut). Les sondes `/health*` ne sont pas tracées.
4. **Traces seulement** : les exportateurs OTLP de métriques et de logs que `NodeSDK` crée
   par défaut (vers `localhost:4318`) sont désactivés ; les logs restent sur stdout.
5. **Corrélation** : chaque log porte la trace, le span (`spanId`) et `trace_sampled`.
6. **Pub/Sub** : `enableOpenTelemetryTracing` propage le contexte dans les messages publiés.
7. **Arrêt** : sur SIGTERM, fermeture de l'application, puis envoi des spans en attente,
   puis sortie.
8. **Versions** : `@google-cloud/opentelemetry-cloud-trace-exporter` repose sur la
   génération 2.x du SDK OpenTelemetry ; le SDK et les instrumentations sont figés sur les
   versions compatibles (une seule version de `@opentelemetry/core`).

## Option écartée : Cloud Profiler

L'agent Node.js dépend de `pprof`, un module natif compilé à l'installation (node-gyp :
Python, make, g++), absents de l'image `node:24-slim` ; l'étape `prod-deps` installe en
outre avec `--ignore-scripts`. L'ajouter imposerait une chaîne de compilation dans le
build Docker. Reporté.

## Conséquences

- Les comptes des services tracés ont besoin de `roles/cloudtrace.agent`.
- Le traçage ajoute un léger surcoût par requête échantillonnée et quelques dépendances.

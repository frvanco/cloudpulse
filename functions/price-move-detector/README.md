# price-move-detector

Cloud Run function (TypeScript, [Functions Framework](https://github.com/GoogleCloudPlatform/functions-framework-nodejs))
abonnée au topic `prices-ingested` via Eventarc. Voir [ADR 0007](../../docs/adr/0007-evenements-pubsub.md).

Pour chaque événement `prices.ingested`, calcule la variation entre `previousClose` et
`close` et écrit un log structuré :

| `event` | Quand | Sévérité |
|---|---|---|
| `price.move` | `abs(changePercent) >= MOVE_THRESHOLD_PERCENT` | WARNING |
| `price.checked` | sinon | INFO |

Champs : `eventId`, `symbol`, `date`, `close`, `previousClose`, `changePercent`,
`thresholdPercent`, `messageId`.

Un message illisible (corps absent, non JSON, champ manquant, prix invalide) fait échouer
la fonction (500) : Pub/Sub réessaie, puis le range dans le dead-letter topic s'il est
configuré.

## Configuration

| Variable | Défaut |
|---|---|
| `MOVE_THRESHOLD_PERCENT` | `5` |

Point d'entrée : `detectPriceMove` (signature CloudEvent).

## Commandes

```bash
npm ci
npm test
npm run build
npm start                 # http://localhost:8080
```

Envoyer un événement en local (en-têtes CloudEvent en mode *binary*, corps au format
Eventarc Pub/Sub, `data` encodé en base64) :

```bash
DATA=$(printf '%s' '{"eventId":"NVDA-2026-10-27","symbol":"NVDA","date":"2026-10-27","close":"189.00","previousClose":"180.00","currency":"USD","ingestedAt":"2026-10-28T06:00:00Z"}' | base64 -w0)
curl -i localhost:8080 \
  -H 'Content-Type: application/json' \
  -H 'ce-id: 1' -H 'ce-specversion: 1.0' \
  -H 'ce-type: google.cloud.pubsub.topic.v1.messagePublished' \
  -H 'ce-source: //pubsub.googleapis.com/projects/PROJET/topics/prices-ingested' \
  -d "{\"message\":{\"data\":\"$DATA\",\"messageId\":\"1\"}}"
```

## Déploiement

Depuis les sources : Cloud Build construit l'image avec les buildpacks Node.js, qui
exécutent le script `gcp-build` (compilation TypeScript). `.gcloudignore` exclut
`node_modules/` et `dist/`.

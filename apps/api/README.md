# CloudPulse API

API REST NestJS de CloudPulse.

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/companies/:symbol/quote` | Cours actuel (Twelve Data) |

## Configuration

Variables d'environnement, validées au démarrage (`src/config/env.validation.ts`) :

| Variable | Obligatoire | Défaut |
|---|---|---|
| `TWELVE_DATA_API_KEY` | oui | — |
| `PORT` | non | `8080` |
| `TWELVE_DATA_BASE_URL` | non | `https://api.twelvedata.com` |
| `TWELVE_DATA_TIMEOUT_MS` | non | `5000` |

En local, copier `.env.example` en `.env`. En production (`NODE_ENV=production`),
le fichier `.env` est ignoré : seules les variables d'environnement du service comptent.

## Commandes

```bash
npm ci
npm run start:dev      # développement avec rechargement
npm test               # tests unitaires
npm run test:e2e       # tests de bout en bout (Twelve Data simulé)
npm run lint
```

## Docker

```bash
docker build -t cloudpulse-api .
docker run --rm -p 8080:8080 --env-file .env cloudpulse-api
curl localhost:8080/health
curl localhost:8080/companies/NVDA/quote
```

# CloudPulse API

API REST NestJS de CloudPulse.

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/companies/:symbol/quote` | Cours actuel : base d'abord, Twelve Data si absent ou plus vieux que `QUOTE_TTL_SECONDS` ; renvoie la dernière valeur connue avec `stale: true` si Twelve Data est indisponible |

## Configuration

Variables d'environnement, validées au démarrage (`src/config/env.validation.ts`) :

| Variable | Obligatoire | Défaut |
|---|---|---|
| `TWELVE_DATA_API_KEY` | oui | — |
| `DATABASE_URL` | oui | — |
| `DATABASE_POOL_MAX` | non | `5` |
| `QUOTE_TTL_SECONDS` | non | `300` |
| `PORT` | non | `8080` |
| `TWELVE_DATA_BASE_URL` | non | `https://api.twelvedata.com` |
| `TWELVE_DATA_TIMEOUT_MS` | non | `5000` |

En local, copier `.env.example` en `.env`. En production (`NODE_ENV=production`),
le fichier `.env` est ignoré : seules les variables d'environnement du service comptent.

## Commandes

```bash
npm ci                    # installe et génère le client Prisma
npm run prisma:migrate    # crée/applique les migrations (dev)
npm run prisma:studio     # explorer la base dans le navigateur
npm run start:dev         # développement avec rechargement
npm test                  # tests unitaires
npm run test:e2e          # tests de bout en bout : base cloudpulse_test, Twelve Data simulé
npm run lint
```

Les tests e2e nécessitent `docker compose up -d` (racine du repo). Ils utilisent la base
`cloudpulse_test`, ou `TEST_DATABASE_URL` si défini.

## Base de données

- Schéma : `prisma/schema.prisma`, migrations versionnées dans `prisma/migrations/`.
- Client Prisma généré dans `src/generated/` (non versionné).
- Prix en `NUMERIC`, horodatages en `timestamptz` (UTC).

## Docker

```bash
docker build -t cloudpulse-api .
docker run --rm -p 8080:8080 --env-file .env --network cloudpulse_default \
  -e DATABASE_URL=postgresql://cloudpulse:cloudpulse@db:5432/cloudpulse cloudpulse-api
curl localhost:8080/health
curl localhost:8080/companies/NVDA/quote
```

Image de migration (cible `migrate`, exécutée en Cloud Run Job) :

```bash
docker build --target migrate -t cloudpulse-migrate .
docker run --rm --network cloudpulse_default \
  -e DATABASE_URL=postgresql://cloudpulse:cloudpulse@db:5432/cloudpulse cloudpulse-migrate
```

CI : les changements de l’API sur main sont validés par Cloud Build.

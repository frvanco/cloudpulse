# Architecture

Parcours progressif « cloud first » : voir [ADR 0003](adr/0003-parcours-cloud-first.md).

## Déployé (phase 2) : API sans base sur Cloud Run

```
Client (curl + jeton d'identité)
   │  HTTPS, authentifié (roles/run.invoker)
   ▼
Cloud Run : API NestJS  ──────▶ Twelve Data (API externe)
   │  identité : service account dédié cloudpulse-api
   │  image    : Artifact Registry
   └─ secret   : TWELVE_DATA_API_KEY via Secret Manager
```

Endpoints :

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/companies/:symbol/quote` | Cours actuel via Twelve Data, non persisté |

## En local (phase 1b) : API + PostgreSQL

```
API NestJS ──▶ Twelve Data
   │  Prisma (adapter pg)
   ▼
PostgreSQL 17 (docker compose)
```

`GET /companies/:symbol/quote` applique le cache-aside décrit plus bas (tables `company` et
`quote`). Cette version exige `DATABASE_URL` : elle sera déployée avec Cloud SQL (phase 3).

## Principes

- **Stateless** : aucun état en mémoire ou sur disque local (contrat Cloud Run).
- **Configuration par variables d'environnement** (12-factor), validée au démarrage.
- **Aucun secret dans Git ni dans l'image** : `.env` local ignoré, Secret Manager sur GCP.
- **Moindre privilège** : service account dédié, rôles prédéfinis au plus près de la ressource.
- **Maîtrise des coûts** : scale-to-zero, `max-instances` bas, alerte budgétaire.

## Architecture cible (introduite progressivement)

```
SvelteKit ──▶ Cloud Run (API NestJS) ──▶ Cloud SQL PostgreSQL

Cloud Scheduler ──▶ Pub/Sub ──▶ Cloud Run (ingestion) ──▶ Twelve Data
                                        └──▶ Cloud SQL
```

Transverses : Secret Manager, Artifact Registry, Cloud Build, Cloud Logging/Monitoring, Terraform.

## Modèle de données

| Table | Rôle | Points clés |
|---|---|---|
| `Company` | Données de référence | `symbol` unique |
| `Quote` | Dernier cours, 1 ligne par entreprise | upsert, `fetchedAt` sert de TTL de cache |
| `DailyPrice` | (avec l'endpoint historique) Historique journalier OHLCV | unique `(companyId, date)`, prix en `NUMERIC` |
| `WatchlistItem` | (plus tard) Entreprises suivies | — |

Voir [ADR 0002](adr/0002-modele-de-donnees.md).

## Flux cible des données de marché

Cache-aside : l'API lit d'abord PostgreSQL, n'appelle Twelve Data que si la donnée est
absente ou périmée, persiste le résultat (upsert idempotent). En cas d'erreur provider
(429/5xx), renvoi de la dernière donnée connue avec `stale: true`.

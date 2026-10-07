# Architecture

Parcours progressif « cloud first » : voir [ADR 0003](adr/0003-parcours-cloud-first.md).

## Déployé (phase 3) : API + Cloud SQL

```
Client (curl + jeton d'identité)
   │  HTTPS, authentifié (roles/run.invoker)
   ▼
Cloud Run : API NestJS ─────────────────────▶ Twelve Data (API externe)
   │  identité : service account cloudpulse-api
   │  image    : Artifact Registry (europe-west9, tags immuables)
   │  secrets  : TWELVE_DATA_API_KEY, DATABASE_URL (Secret Manager, versions fixées)
   │  max-instances 2 × pool 5 = 10 connexions max
   │
   │  socket Unix /cloudsql/… (--add-cloudsql-instances, roles/cloudsql.client)
   ▼
Cloud SQL PostgreSQL 17 (cloudpulse-db) : Enterprise, db-f1-micro, zonale, IP publique
sans réseau autorisé ; utilisateur applicatif cloudpulse_app
```

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Health check (ne dépend pas de la base) |
| GET | `/companies/:symbol/quote` | Cours actuel, cache-aside en base (voir plus bas) |

Migrations : `prisma migrate deploy`, lancé depuis un poste via le Cloud SQL Auth Proxy
(phase 3), puis par un Cloud Run Job utilisant l'image `--target migrate` (phase 5).

En local, la même API tourne avec PostgreSQL dans Docker Compose (voir le README).

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

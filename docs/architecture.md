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
| GET | `/health` | Liveness (ne dépend pas de la base) |
| GET | `/health/ready` | Readiness : vérifie la base, sans appeler Twelve Data |
| GET | `/companies/:symbol/quote` | Cours actuel, cache-aside en base (voir plus bas) |

Migrations : `prisma migrate deploy`, lancé depuis un poste via le Cloud SQL Auth Proxy
(phase 3), puis par un Cloud Run Job utilisant l'image `--target migrate` (phase 5).

En local, la même API tourne avec PostgreSQL dans Docker Compose (voir le README).

## Ingestion quotidienne (phase 4)

Voir [ADR 0005](adr/0005-ingestion-cloud-tasks.md).

```
Cloud Scheduler (lun.–ven. soir, heure de Paris)
   │  POST + jeton OIDC
   ▼
cloudpulse-ingest (Cloud Run privé, même image, APP_MODE=ingest)
   POST /internal/ingestion/dispatch
   │  1 tâche par entreprise : SYMBOLE-AAAA-MM-JJ (dédoublonnage par nom)
   ▼
Cloud Tasks, file ingest-quotes en europe-west1 (débit < 8 req/min, concurrence 1, retries + backoff)
   │  POST + jeton OIDC (INGESTION_INVOKER_SA)
   ▼
cloudpulse-ingest
   POST /internal/ingestion/symbols/:symbol ──▶ Twelve Data time_series (1 crédit)
   │  upsert (company_id, date)
   ▼
Cloud SQL : daily_price
```

- Erreur définitive (entreprise ou symbole inconnu) : réponse 200, la tâche n'est pas rejouée.
- Erreur passagère (429, 502) : réponse 4xx/5xx, Cloud Tasks réessaie avec backoff.
- Rejouer une tâche ou un dispatch n'a pas d'effet de bord (dédoublonnage + upsert).

## Livraison continue (phase 5)

```
Pull request ──▶ déclencheur cloudpulse-api-pr (SA cloudpulse-pr : logs uniquement)
                 lint + tests unitaires + build des deux images, sans push

Fusion sur main ──▶ déclencheur cloudpulse-api-main (SA cloudpulse-build)
   test ─▶ build API + migrate (tag $SHORT_SHA) ─▶ push
        ─▶ Cloud Run Job cloudpulse-migrate (SA cloudpulse-migrate, prisma migrate deploy, 0 retry)
        ─▶ deploy --no-traffic --tag=candidate
        ─▶ smoke test : GET {candidate}/health/ready avec jeton d'identité (run.invoker sur le service)
        ─▶ promotion à 100 % du trafic
```

- Un échec à n'importe quelle étape arrête le pipeline : la production reste sur la révision précédente.
- Rollback : redirection du trafic vers une révision existante (pas de rebuild ; tags immuables).
- Pipelines : `infra/terraform/pipelines/cloudbuild.yaml` (main) et `cloudbuild-pr.yaml` (PR) ; le pipeline ne fixe que l'image, les tags et le trafic.
- Migrations compatibles avec la version N-1 du code (*expand and contract*).

## Infrastructure as Code (phase 7)

Toute l'infrastructure est décrite dans `infra/terraform/` (voir [ADR 0006](adr/0006-terraform.md)),
état distant dans le bucket `cloudpulse-001-tfstate` :

| Fichier | Contenu |
|---|---|
| `apis.tf` | APIs du projet (`disable_on_destroy = false`) |
| `service-accounts.tf`, `iam-*.tf`, `IAM-AUDIT.md` | Identités et liaisons IAM (uniquement `*_iam_member`), audit justifié |
| `artifact-registry.tf` | Dépôt d'images, tags immuables, cleanup policies |
| `secrets.tf` | Secrets (sans leurs valeurs) |
| `cloud-sql.tf` | Instance et base, `deletion_protection` + `prevent_destroy` |
| `cloud-run-services.tf`, `cloud-run-jobs.tf` | Configuration des services et jobs ; l'image et le trafic sont gérés par le pipeline (`ignore_changes`) |
| `cloud-tasks.tf`, `scheduler.tf` | File d'ingestion, déclenchements planifiés |
| `logging-metrics.tf`, `monitoring-*.tf`, `dashboards/` | Métriques basées sur les logs, alertes, SLO, tableau de bord |
| `cloud-build.tf`, `pipelines/` | Connexion GitHub, déclencheurs, définitions des pipelines |
| `terraform-ci-iam.tf` | Identités de la CI Terraform : `tf-plan` (lecture seule) et `tf-apply` (administration, rôles listés et rôles personnalisés) |

Répartition des responsabilités : **Terraform** possède la configuration ; **Cloud Build**
déploie une image et gère le trafic entre révisions.

Les changements d'infrastructure passent eux aussi par Cloud Build :

```
PR touchant infra/terraform/**  ─▶ infra-plan  (SA tf-plan, lecture seule) : fmt, validate, plan -lock=false
Fusion sur main                  ─▶ infra-apply (SA tf-apply) : approbation manuelle, puis plan -out et apply du plan
```

## Événements (phase 8)

Voir [ADR 0007](adr/0007-evenements-pubsub.md).

```
cloudpulse-ingest (après l'upsert de daily_price)
   │  publish (roles/pubsub.publisher sur le topic)
   ▼
Topic prices-ingested
   ├─▶ abonnement push créé par Eventarc ──▶ Cloud Run function price-move-detector
   │                                          └─ log price.move ──▶ métrique ──▶ alerte
   ├─▶ abonnement BigQuery ──▶ table d'archive
   └─ chaque abonnement : retry policy + dead-letter topic
```

## Principes

- **Stateless** : aucun état en mémoire ou sur disque local (contrat Cloud Run).
- **Configuration par variables d'environnement** (12-factor), validée au démarrage.
- **Aucun secret dans Git ni dans l'image** : `.env` local ignoré, Secret Manager sur GCP.
- **Moindre privilège** : service account dédié, rôles prédéfinis au plus près de la ressource.
- **Maîtrise des coûts** : scale-to-zero, `max-instances` bas, alerte budgétaire.
- **Observabilité** : logs JSON structurés sur stdout (Cloud Logging), corrélés aux traces, exceptions remontées dans Error Reporting, événements métier (`event`) exploitables en métriques basées sur les logs. Voir `apps/api/README.md`.

## Architecture en place

```
Client HTTP ──▶ Cloud Run (API NestJS) ──▶ Cloud SQL PostgreSQL

Cloud Scheduler ──▶ Cloud Run (ingestion) ──▶ Cloud Tasks ──▶ Cloud Run (ingestion) ──▶ Twelve Data
                                                                              ├──▶ Cloud SQL
                                                                              └──▶ Pub/Sub ──▶ function, BigQuery
```

Transverses : Secret Manager, Artifact Registry, Cloud Build, Cloud Logging/Monitoring, Terraform.

## Modèle de données

| Table | Rôle | Points clés |
|---|---|---|
| `Company` | Données de référence | `symbol` unique |
| `Quote` | Dernier cours, 1 ligne par entreprise | upsert, `fetchedAt` sert de TTL de cache |
| `DailyPrice` | Historique journalier OHLCV, alimenté par l'ingestion | unique `(companyId, date)`, prix en `NUMERIC` |
| `WatchlistItem` | (plus tard) Entreprises suivies | — |

Voir [ADR 0002](adr/0002-modele-de-donnees.md).

## Flux cible des données de marché

Cache-aside : l'API lit d'abord PostgreSQL, n'appelle Twelve Data que si la donnée est
absente ou périmée, persiste le résultat (upsert idempotent). En cas d'erreur provider
(429/5xx), renvoi de la dernière donnée connue avec `stale: true`.

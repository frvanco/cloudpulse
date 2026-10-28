# CloudPulse

Plateforme web de suivi des marchés financiers, centrée sur les entreprises technologiques cotées
(des GAFAM/NVIDIA aux small caps tech).

Projet d'apprentissage construit progressivement pour préparer la certification
**Google Cloud Professional Cloud Developer** : chaque service Google Cloud n'est introduit
que lorsqu'il a une vraie justification architecturale.

## Stack

| Couche | Technologies |
|---|---|
| Backend | NestJS, TypeScript, Prisma |
| Fonctions | Cloud Run functions (Functions Framework, TypeScript) |
| Base de données | PostgreSQL / Cloud SQL |
| Données de marché | [Twelve Data](https://twelvedata.com/docs) |
| Infra | Docker, Google Cloud, Terraform |

## Documentation

- [Architecture](docs/architecture.md)
- [Décisions d'architecture (ADR)](docs/adr/)

## Roadmap

- [x] **Phase 0** — Préparation : Node, Docker, exploration de l'API Twelve Data
- [x] **Phase 1a** — API NestJS minimale : `/health`, configuration, client Twelve Data, endpoint quote, Dockerfile
- [x] **Phase 2** — Premier déploiement : projet GCP, IAM, service account, Artifact Registry, Secret Manager, Cloud Run
- [x] **Phase 1b** — PostgreSQL (Docker) + Prisma en local
- [x] **Phase 3** — Cloud SQL, connexion Cloud Run → Cloud SQL, migrations
- [x] **Phase 5** — CI/CD : Cloud Build → Artifact Registry → Cloud Run, migrations en Cloud Run Job ([ADR 0004](docs/adr/0004-ci-cd-avant-ingestion.md))
- [x] **Phase 4** — Ingestion quotidienne : Cloud Scheduler, Cloud Tasks ([ADR 0005](docs/adr/0005-ingestion-cloud-tasks.md))
- [x] **Phase 6** — Observabilité : Logging, Monitoring, Error Reporting
- [x] **Phase 7** — Terraform : import de l'infrastructure existante, plan sur PR et apply approuvé dans Cloud Build ([ADR 0006](docs/adr/0006-terraform.md))
- [ ] **Phase 8** — Événements : Pub/Sub, Eventarc, Cloud Run functions, abonnement BigQuery, dead-letter ([ADR 0007](docs/adr/0007-evenements-pubsub.md))
- [ ] **Phase 9** — Livraison progressive : Cloud Deploy, canary sur Cloud Run
- [ ] **Phase 10** — GKE Autopilot : même image, Workload Identity, Gateway, HPA
- [ ] **Phase 11** — Traces et performance : Cloud Trace (OpenTelemetry), Cloud Profiler
- [ ] *(optionnelle)* Exposition : API Gateway ou load balancer + Cloud Armor, IAP

## Démarrage local

Prérequis : Node.js 24 LTS, Docker.

```bash
docker compose up -d          # PostgreSQL local (bases cloudpulse et cloudpulse_test)
cd apps/api
cp .env.example .env          # puis renseigner TWELVE_DATA_API_KEY
npm ci                        # génère aussi le client Prisma (postinstall)
npm run prisma:migrate        # applique les migrations
npm run start:dev
curl localhost:8080/health
curl localhost:8080/companies/NVDA/quote
```

Détails : [apps/api/README.md](apps/api/README.md).

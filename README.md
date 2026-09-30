# CloudPulse

Plateforme web de suivi des marchés financiers, centrée sur les entreprises technologiques cotées
(des GAFAM/NVIDIA aux small caps tech).

Projet d'apprentissage construit progressivement pour préparer la certification
**Google Cloud Professional Cloud Developer** : chaque service Google Cloud n'est introduit
que lorsqu'il a une vraie justification architecturale.

## Stack

| Couche | Technologies |
|---|---|
| Frontend | SvelteKit, TypeScript |
| Backend | NestJS, TypeScript, Prisma |
| Base de données | PostgreSQL / Cloud SQL |
| Données de marché | [Twelve Data](https://twelvedata.com/docs) |
| Infra | Docker, Google Cloud, Terraform |

## Documentation

- [Architecture](docs/architecture.md)
- [Décisions d'architecture (ADR)](docs/adr/)

## Roadmap

- [ ] **Phase 0** — Préparation : Node, Docker, exploration de l'API Twelve Data
- [ ] **Phase 1a** — API NestJS minimale : `/health`, configuration, client Twelve Data, endpoint quote, Dockerfile
- [ ] **Phase 2** — Premier déploiement : projet GCP, IAM, service account, Artifact Registry, Secret Manager, Cloud Run
- [ ] **Phase 1b** — PostgreSQL (Docker) + Prisma en local
- [ ] **Phase 3** — Cloud SQL, connexion Cloud Run → Cloud SQL, migrations
- [ ] **Phase 4** — Ingestion périodique : Cloud Scheduler, Pub/Sub
- [ ] **Phase 5** — CI/CD : Cloud Build → Artifact Registry → Cloud Run
- [ ] **Phase 6** — Observabilité : Logging, Monitoring, Error Reporting
- [ ] **Phase 7** — Terraform
- [ ] **Phase 8** — Enrichissement : frontend SvelteKit, historique, graphiques, watchlist, alertes

## Démarrage local

_À compléter au fil de la construction._

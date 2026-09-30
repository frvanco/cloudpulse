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
| Base de données | PostgreSQL |
| Données de marché | [Twelve Data](https://twelvedata.com/docs) |
| Infra (à venir) | Docker, Google Cloud, Terraform |

## Documentation

- [Architecture V1](docs/architecture.md)
- [Décisions d'architecture (ADR)](docs/adr/)

## Roadmap V1 (locale)

- [ ] 0. Exploration de l'API Twelve Data
- [ ] 1. Squelette du repo + PostgreSQL via Docker Compose
- [ ] 2. API NestJS + `/health` + configuration
- [ ] 3. Prisma : schéma et migrations
- [ ] 4. Provider de données de marché (Twelve Data)
- [ ] 5. Endpoints recherche / détail entreprise
- [ ] 6. Endpoint cours actuel + cache
- [ ] 7. Endpoint historique + stockage incrémental
- [ ] 8. Frontend SvelteKit : recherche et détail
- [ ] 9. Graphique d'historique
- [ ] 10. Tests + Dockerfile de l'API
- [ ] 11. (V1.1) Watchlist

## Démarrage local

_À compléter au fil de la construction._

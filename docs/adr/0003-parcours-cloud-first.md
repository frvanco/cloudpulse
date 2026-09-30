# ADR 0003 — Parcours « cloud first » : déployer tôt, enrichir ensuite

- Statut : acceptée
- Date : 2026-09-30
- Remplace : le plan « V1 locale complète » de `architecture.md` (version initiale)

## Contexte

Le projet sert avant tout à apprendre Google Cloud. Construire une V1 locale complète
(base, historique, frontend, graphique) retarderait trop le premier contact avec GCP.

Mettre PostgreSQL/Prisma avant le premier déploiement imposerait Cloud SQL dès le premier
Cloud Run : trois sujets nouveaux à la fois (projet/IAM, Cloud Run, Cloud SQL), donc un
diagnostic difficile en cas d'échec.

## Décision

1. **Phase 1a** : backend NestJS sans base de données (`/health`, configuration validée,
   client Twelve Data, `GET /companies/:symbol/quote`, Dockerfile).
2. **Phase 2** : projet GCP, IAM, service account dédié, Artifact Registry, Cloud Run,
   et **Secret Manager** pour la clé Twelve Data (jamais en variable d'environnement en clair).
3. **Phase 1b** : PostgreSQL (Docker) + Prisma en local, utilisé comme cache des cours.
4. **Phase 3** : Cloud SQL, connexion depuis Cloud Run, migrations.
5. Phases suivantes : Scheduler/Pub/Sub, CI/CD, observabilité, Terraform, enrichissement.

Chaque service GCP n'est introduit que lorsqu'un besoin concret le justifie.

## Conséquences

- Un seul concept nouveau par étape, premier déploiement dès la deuxième étape.
- Le service Cloud Run est **authentifié** (`roles/run.invoker`) pour protéger le quota Twelve Data.
- Le modèle de données de l'ADR 0002 reste valable, il est simplement implémenté plus tard.

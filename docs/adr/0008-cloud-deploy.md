# ADR 0008 — Livraison progressive de l'API avec Cloud Deploy

- Statut : acceptée
- Date : 2026-10-29

## Contexte

Le pipeline Cloud Build déploie l'API sans trafic, teste la révision par son URL de tag,
puis bascule 100 % du trafic. Tout est scripté : pas de mise en production progressive,
pas d'historique des releases, pas de rollback outillé, pas d'approbation avant la
production.

## Décisions

1. **Périmètre : `cloudpulse-api`.** L'ingest reste déployé par Cloud Build. Comme il
   partage la base, Cloud Build exécute les migrations **avant** de le déployer, puis crée
   la release de l'API : les migrations s'appliquent donc avant l'approbation (sans risque
   avec des migrations *expand/contract*), et le hook `predeploy` n'a en général plus rien
   à appliquer.
2. **Cloud Build fait l'intégration continue** (tests, images) et crée une *release*
   Cloud Deploy. **Cloud Deploy fait la livraison** : une *rollout* par cible.
3. **Une cible `prod`, stratégie canary 10 % → 50 % → 100 %.** Pas de staging : une
   seconde cible partagerait la base Cloud SQL et ses migrations.
4. **Hook `predeploy`** : exécution du job de migration. **`verify`** : à chaque phase,
   un tag temporaire cible la nouvelle révision, dont `/health/ready` doit répondre
   (`deploy/api/skaffold.yaml`).
5. **Approbation** de la cible `prod` et passage manuel entre les phases.
6. **Un seul propriétaire de la configuration du service** : le manifeste Cloud Run du
   dépôt, rendu par Skaffold. Terraform gère le pipeline, la cible et l'IAM, et retire le
   service de son état (bloc `removed`, sans destruction).
7. **Service account d'exécution dédié** pour Cloud Deploy.

## Conséquences

- `/health` et `/health/ready` renvoient la révision qui a répondu (`K_REVISION`) : la
  répartition du trafic est observable pendant le canary.
- Les migrations restent compatibles avec la révision précédente (*expand/contract*) :
  pendant le canary, les deux révisions utilisent le même schéma.
- Un rollback redéploie la release précédente, sans revenir sur les migrations.

## Migration Terraform — étape du 2026-11-04

Cette étape importe la cible `prod` dans Terraform.
Le pipeline `cloudpulse-api` reste géré par `deploy/clouddeploy.yaml`,
qui contient uniquement sa définition. Son import Terraform est reporté
en raison du bug hashicorp/terraform-provider-google#30495.
Le canary et le hook `predeploy` sont conservés.
Le transfert de gestion du service Cloud Run prévu à la décision 6 reste à réaliser.

### Transfert du service API — 2026-11-05

La configuration de `cloudpulse-api` est gérée par Cloud Deploy via
`deploy/api/service.yaml`. Un bloc Terraform `removed` avec
`destroy = false` retire le service de l'état sans le détruire.
Les ressources IAM et le monitoring restent gérés par Terraform et
référencent le service existant via une data source.
Le service ingest et le job de migration restent gérés par Terraform.

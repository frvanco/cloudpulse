# ADR 0008 — Livraison progressive de l'API avec Cloud Deploy

- Statut : acceptée
- Date : 2026-10-29

## Contexte

Le pipeline Cloud Build déploie l'API sans trafic, teste la révision par son URL de tag,
puis bascule 100 % du trafic. Tout est scripté : pas de mise en production progressive,
pas d'historique des releases, pas de rollback outillé, pas d'approbation avant la
production.

## Décisions

1. **Périmètre : `cloudpulse-api`.** L'ingest reste sur le pipeline actuel.
2. **Cloud Build fait l'intégration continue** (tests, images) et crée une *release*
   Cloud Deploy. **Cloud Deploy fait la livraison** : une *rollout* par cible.
3. **Une cible `prod`, stratégie canary 10 % → 50 % → 100 %.** Pas de staging : une
   seconde cible partagerait la base Cloud SQL et ses migrations.
4. **Hook `predeploy`** : exécution du job de migration. **`verify`** : le test de
   fumée (`node dist/smoke/main.js`, dans l'image de l'API) interroge l'URL du service à
   chaque phase ; toutes les révisions qui reçoivent du trafic doivent répondre.
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

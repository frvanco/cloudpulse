# ADR 0004 — CI/CD avant l'ingestion périodique

- Statut : acceptée
- Date : 2026-10-07

## Contexte

Après la phase 3, l'API est déployée manuellement : `docker build`, `docker push`,
`gcloud run deploy`. Lors de la phase 2, une image construite avant un `git pull` puis
taguée à la main avec un SHA de commit a été déployée à la place du bon code ; le tag
immuable a ensuite empêché la correction silencieuse. La phase 4 (ingestion) ajoutera un
deuxième service à déployer.

## Décision

Réaliser la phase 5 (CI/CD avec Cloud Build) avant la phase 4 :

- l'image est construite et taguée par le pipeline à partir du commit (`$COMMIT_SHA`) ;
- les tests bloquent le déploiement ;
- les migrations sont appliquées par un Cloud Run Job (image `--target migrate`) avant le
  déploiement de l'API.

## Conséquences

- Plus de build ni de déploiement manuels de l'API.
- Le pipeline a sa propre identité (service account dédié) avec des droits minimaux.
- La phase 4 bénéficiera directement du pipeline pour son service d'ingestion.

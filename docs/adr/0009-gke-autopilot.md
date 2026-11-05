# ADR 0009 — GKE Autopilot pour comparer avec Cloud Run

- Statut : acceptée
- Date : 2026-11-05

## Contexte

L'API tourne sur Cloud Run. Pour comparer les deux plateformes, la même image est déployée
sur GKE Autopilot, le temps de la phase 10. Cloud Run reste la plateforme de production.

## Décisions

1. **Cluster Autopilot** en `europe-west9`, **créé par Terraform** (et non importé),
   détruit à la fin de la phase.
2. **Même image**, namespace `cloudpulse`. Les objets Kubernetes (Deployment, Service,
   HPA, PodDisruptionBudget, Gateway) sont dans `deploy/gke/` (Kustomize), appliqués avec
   `kubectl`, hors Terraform.
3. **Identité : Workload Identity Federation for GKE.** Le *Kubernetes service account*
   reçoit directement les rôles IAM, sans clé.
4. **Cloud SQL : Cloud SQL Auth Proxy en sidecar natif**, socket Unix dans un volume
   partagé : la chaîne de connexion du secret `database-url` reste valable.
5. **Secrets : module Secret Manager pour GKE** (pilote CSI), montés en fichiers et lus
   via `DATABASE_URL_FILE` et `TWELVE_DATA_API_KEY_FILE`.
6. **Exposition** : `kubectl port-forward`, puis brièvement un Gateway (Gateway API,
   équilibreur de charge externe), détruit ensuite.

## Conséquences

- Le budget de connexions PostgreSQL (`max_connections` = 25) inclut les pods GKE :
  nombre de pods × `DATABASE_POOL_MAX`.
- L'application s'arrête proprement sur SIGTERM (log `app.shutdown`), envoyé par Cloud Run
  comme par Kubernetes (mise à jour progressive, réduction d'échelle).
- Coût : frais de gestion du cluster (couverts par le crédit gratuit d'un cluster par
  compte de facturation, à vérifier), pods facturés selon leurs *requests*, équilibreur de
  charge tant qu'il existe.

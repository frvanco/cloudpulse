# ADR 0006 — Terraform pour l'infrastructure existante

- Statut : acceptée
- Date : 2026-10-26

## Contexte

L'infrastructure de CloudPulse a été créée à la main (gcloud, console) pour en comprendre
chaque brique. Elle n'est décrite nulle part de façon reproductible : toute modification
manuelle passe inaperçue (dérive de configuration) et recréer l'environnement serait long.

## Décisions

1. **État distant** dans le bucket Cloud Storage `cloudpulse-001-tfstate` (versionné, accès
   uniforme, pas d'accès public), backend `gcs` avec verrouillage natif. Le bucket est créé
   hors Terraform (*bootstrap*).
2. **Import** des ressources existantes (blocs `import`) plutôt que recréation. Critère de
   fin : `terraform plan` sans changement.
3. **Secrets** : Terraform gère les secrets Secret Manager et leurs droits, jamais leurs
   valeurs (qui finiraient en clair dans l'état). Idem pour le mot de passe de la base.
4. **Cloud Run** : Terraform gère la configuration des services et jobs ; le pipeline Cloud
   Build gère l'image (`lifecycle { ignore_changes }` sur l'image et les champs modifiés
   par le déploiement).
5. **Organisation** : `infra/terraform/`, un fichier par domaine, sans modules tant qu'il
   n'existe qu'un environnement.

## Conséquences

- Toute modification d'infrastructure passe par une PR et un `plan` relu.
- Les ressources critiques (Cloud SQL) sont protégées par `deletion_protection` et
  `lifecycle { prevent_destroy = true }`.
- La responsabilité est partagée explicitement : Terraform (configuration) et Cloud Build
  (version déployée).

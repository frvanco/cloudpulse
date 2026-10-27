# Audit IAM CloudPulse

Projet : `cloudpulse-001`.

Les identités abrégées ci-dessous désignent les service accounts
`cloudpulse-IDENTITE@cloudpulse-001.iam.gserviceaccount.com`.
Tous les rôles portent le préfixe `roles/`.

## Liaisons gérées par Terraform

| Identité | Ressource | Rôle | Justification |
|---|---|---|---|
| api | Projet | cloudsql.client | Connexion PostgreSQL |
| ingest | Projet | cloudsql.client | Connexion PostgreSQL |
| migrate | Projet | cloudsql.client | Migrations PostgreSQL |
| build | Projet | logging.logWriter | Logs des builds |
| pr | Projet | logging.logWriter | Logs des validations PR |
| watchdog | Projet | logging.viewer | Recherche du dernier dispatch |
| build | SA cloudpulse-api | iam.serviceAccountUser | Déploiement avec cette identité |
| build | SA cloudpulse-ingest | iam.serviceAccountUser | Déploiement avec cette identité |
| build | SA cloudpulse-migrate | iam.serviceAccountUser | Configuration du job de migration |
| ingest | SA cloudpulse-ingest-invoker | iam.serviceAccountUser | Identité OIDC des tâches |
| build | SA cloudpulse-build | iam.serviceAccountOpenIdTokenCreator | Jetons OIDC des smoke tests |
| api | Secret database-url | secretmanager.secretAccessor | Connexion PostgreSQL |
| ingest | Secret database-url | secretmanager.secretAccessor | Connexion PostgreSQL |
| migrate | Secret database-url | secretmanager.secretAccessor | Connexion PostgreSQL |
| api | Secret twelve-data-api-key | secretmanager.secretAccessor | Appels Twelve Data |
| ingest | Secret twelve-data-api-key | secretmanager.secretAccessor | Appels Twelve Data |
| build | Service cloudpulse-api, europe-west9 | run.developer | Déploiement et promotion |
| build | Service cloudpulse-api, europe-west9 | run.invoker | Smoke test |
| build | Service cloudpulse-ingest, europe-west9 | run.developer | Déploiement et promotion |
| build | Service cloudpulse-ingest, europe-west9 | run.invoker | Smoke test |
| ingest-invoker | Service cloudpulse-ingest, europe-west9 | run.invoker | Appels Tasks et Scheduler |
| build | Job cloudpulse-migrate, europe-west9 | run.developer | Déploiement et exécution des migrations |
| ingest-invoker | Job cloudpulse-ingest-watchdog, europe-west9 | run.invoker | Exécution par Scheduler |
| ingest | File ingest-quotes, europe-west1 | cloudtasks.enqueuer | Création des tâches |
| build | Dépôt cloudpulse, europe-west9 | artifactregistry.writer | Publication des images |
| build | Bucket cloudpulse-001_cloudbuild | storage.objectViewer | Lecture des sources des builds manuels |

## Éléments exclus de la gestion Terraform

- Compte utilisateur Owner.
- Compte Compute Engine par défaut, qui conserve actuellement Editor.
- Service agents Google.
- Compte Cloud Build historique : 595188864600@cloudbuild.gserviceaccount.com.
- Groupes historiques projectOwner, projectEditor et projectViewer des buckets.
- Autorisations automatiques de la connexion GitHub et de son secret régional.

La configuration d'audit DATA_WRITE d'Artifact Registry reste inchangée.

## Choix de gestion

Les sept comptes CloudPulse et les 26 liaisons ci-dessus sont importés.

Les ressources *_iam_member gèrent chaque autorisation individuellement :
elles préservent les autres membres, mais ne suppriment pas automatiquement
des autorisations supplémentaires accordées hors de Terraform.

Les 15 APIs sélectionnées utilisent disable_on_destroy = false :
leur retrait de Terraform ne doit pas les désactiver.

Les ressources IAM des secrets ne lisent pas leurs valeurs.

## CI Terraform

| Identité | Ressource | Rôle | Justification |
|---|---|---|---|
| tf-plan | Secret terraform-approver-member | secretmanager.secretAccessor | Valeur de `approver_member` pour le plan |
| tf-apply | Secret terraform-approver-member | secretmanager.secretAccessor | Valeur de `approver_member` pour le plan de l'apply |
| `var.approver_member` | Projet | cloudbuild.builds.approver | Approbation des builds `infra-apply` |

L'approbateur n'est pas écrit dans le dépôt : la variable `approver_member` n'a pas
de valeur par défaut. En CI, elle est lue dans le secret `terraform-approver-member`
(`secretEnv` → `TF_VAR_approver_member`). En local, elle vient de `terraform.tfvars`
(ignoré par Git) ou de la variable d'environnement `TF_VAR_approver_member`.
Le secret et sa valeur sont créés hors Terraform, puis importés (`imports.tf`).

## Utilisateur PostgreSQL hors Terraform

L'utilisateur `cloudpulse_app` de l'instance `cloudpulse-db` reste géré
hors Terraform. Son mot de passe n'est ni fourni à Terraform ni lu depuis
Secret Manager par Terraform. La connexion applicative reste stockée dans
la version du secret `database-url`.

Les arrêts et démarrages manuels de l'instance sont conservés grâce à
ignore_changes sur settings[0].activation_policy.
La croissance automatique du disque est conservée grâce à ignore_changes
sur settings[0].disk_size.

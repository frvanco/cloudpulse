# Audit IAM CloudPulse

Projet : `cloudpulse-001`. Région principale : `europe-west9`.

## État de la migration

La PR des droits CI de la phase 8 a été appliquée. La PR d’import est en préparation :
le dernier plan vérifié annonce **21 to import, 0 to add, 0 to change, 0 to destroy**.
Ces 21 ressources ne seront considérées comme importées qu’après le succès de
l’apply de cette PR en CI.

Les blocs de `imports-phase8.tf` restent présents jusqu’à cet apply.
Leur suppression fera ensuite l’objet d’une PR séparée, dont le plan devra
afficher **No changes**.

## Identités et conventions

Les identités applicatives abrégées désignent les comptes
`cloudpulse-IDENTITE@cloudpulse-001.iam.gserviceaccount.com`.
Les comptes CI sont `tf-plan@cloudpulse-001.iam.gserviceaccount.com` et
`tf-apply@cloudpulse-001.iam.gserviceaccount.com`, sans préfixe `cloudpulse-`.

Tous les rôles prédéfinis des tableaux portent le préfixe `roles/`.
Les rôles personnalisés sont indiqués par leur identifiant propre.

| Identité | Identifiant du compte | Usage |
|---|---|---|
| api | cloudpulse-api | API privée |
| build | cloudpulse-build | Construction, publication et déploiement applicatif |
| pr | cloudpulse-pr | Validation des pull requests applicatives |
| migrate | cloudpulse-migrate | Migrations PostgreSQL |
| ingest | cloudpulse-ingest | Ingestion et publication des événements |
| ingest-invoker | cloudpulse-ingest-invoker | Invocation par Tasks et Scheduler |
| watchdog | cloudpulse-watchdog | Surveillance des dispatchs |
| price-move | cloudpulse-price-move | Exécution de la fonction de détection ; aucun rôle projet direct observé |
| eventarc | cloudpulse-eventarc | Identité d’invocation du trigger ; aucun rôle projet direct observé |
| tf-plan | tf-plan | Lecture de l’infrastructure et calcul des plans |
| tf-apply | tf-apply | Application de la configuration après approbation |

Les neuf comptes applicatifs et les deux comptes CI sont déclarés comme
ressources Terraform dans la configuration cible. Les deux comptes
`price-move` et `eventarc` font partie des imports en attente de la phase 8.

Le service agent Pub/Sub est identifié dans le code à partir de
`data.google_project.phase8.number` :
`service-NUMERO_PROJET@gcp-sa-pubsub.iam.gserviceaccount.com`.
Son compte est géré par Google ; seules les liaisons explicitement ajoutées
pour la phase 8 sont gérées par Terraform.

## Liaisons applicatives déjà importées

| Identité | Ressource | Rôle | Justification |
|---|---|---|---|
| api | Projet | cloudsql.client | Connexion PostgreSQL |
| ingest | Projet | cloudsql.client | Connexion PostgreSQL |
| migrate | Projet | cloudsql.client | Migrations PostgreSQL |
| build | Projet | logging.logWriter | Écriture des logs des builds |
| pr | Projet | logging.logWriter | Écriture des logs des validations PR |
| watchdog | Projet | logging.viewer | Recherche du dernier dispatch |
| build | SA cloudpulse-api | iam.serviceAccountUser | Déploiement avec cette identité |
| build | SA cloudpulse-ingest | iam.serviceAccountUser | Déploiement avec cette identité |
| build | SA cloudpulse-migrate | iam.serviceAccountUser | Mise à jour du job de migration |
| ingest | SA cloudpulse-ingest-invoker | iam.serviceAccountUser | Identité OIDC des tâches |
| build | SA cloudpulse-build | iam.serviceAccountOpenIdTokenCreator | Jetons OIDC des tests de fumée |
| api | Secret database-url | secretmanager.secretAccessor | Connexion PostgreSQL |
| ingest | Secret database-url | secretmanager.secretAccessor | Connexion PostgreSQL |
| migrate | Secret database-url | secretmanager.secretAccessor | Connexion PostgreSQL |
| api | Secret twelve-data-api-key | secretmanager.secretAccessor | Appels Twelve Data |
| ingest | Secret twelve-data-api-key | secretmanager.secretAccessor | Appels Twelve Data |
| build | Service cloudpulse-api, europe-west9 | run.developer | Déploiement et promotion |
| build | Service cloudpulse-api, europe-west9 | run.invoker | Test de fumée |
| build | Service cloudpulse-ingest, europe-west9 | run.developer | Déploiement et promotion |
| build | Service cloudpulse-ingest, europe-west9 | run.invoker | Test de fumée |
| ingest-invoker | Service cloudpulse-ingest, europe-west9 | run.invoker | Appels Tasks et Scheduler |
| build | Job cloudpulse-migrate, europe-west9 | run.developer | Mise à jour et exécution des migrations |
| ingest-invoker | Job cloudpulse-ingest-watchdog, europe-west9 | run.invoker | Exécution par Scheduler |
| ingest | File ingest-quotes, europe-west1 | cloudtasks.enqueuer | Création des tâches |
| build | Dépôt cloudpulse, europe-west9 | artifactregistry.writer | Publication des images |
| build | Bucket cloudpulse-001_cloudbuild | storage.objectViewer | Lecture des sources des builds manuels |

## Liaisons applicatives à importer avec la phase 8

| Identité | Ressource | Rôle | Justification |
|---|---|---|---|
| ingest | Topic prices-ingested | pubsub.publisher | Publication des événements d’ingestion |
| Service agent Pub/Sub | Topic prices-ingested-dlq | pubsub.publisher | Transfert des messages au rebut |
| Service agent Pub/Sub | Abonnement prices-ingested-bq | pubsub.subscriber | Transfert au rebut après échec de livraison |
| Service agent Pub/Sub | Abonnement de transport Eventarc | pubsub.subscriber | Transfert au rebut après échec de livraison |
| eventarc | Service price-move-detector, europe-west9 | run.invoker | Invocation authentifiée de la fonction |
| Service agent Pub/Sub | Table cloudpulse_events.prices_ingested | bigquery.dataEditor | Écriture des événements et des métadonnées |
| build | Projet | run.builder | Construction de la fonction depuis les sources |

Les deux tableaux applicatifs représentent 33 liaisons : 26 déjà importées
et 7 à importer dans cette phase. Les liaisons CI sont inventoriées séparément.

## CI Terraform

### Lecture au niveau du projet : tf-plan

| Identité | Ressource | Rôle | Justification |
|---|---|---|---|
| tf-plan | Projet | artifactregistry.reader | Lecture des dépôts et de leur configuration |
| tf-plan | Projet | cloudbuild.builds.viewer | Lecture des déclencheurs Cloud Build |
| tf-plan | Projet | cloudbuild.connectionViewer | Lecture de la connexion GitHub et du dépôt lié |
| tf-plan | Projet | cloudscheduler.viewer | Lecture des jobs Scheduler |
| tf-plan | Projet | cloudsql.viewer | Lecture des instances et bases Cloud SQL |
| tf-plan | Projet | cloudtasks.viewer | Lecture des files Cloud Tasks |
| tf-plan | Projet | iam.securityReviewer | Lecture des politiques IAM nécessaires au plan |
| tf-plan | Projet | iam.serviceAccountViewer | Lecture des comptes de service |
| tf-plan | Projet | logging.viewer | Lecture de la configuration de journalisation et des métriques |
| tf-plan | Projet | monitoring.viewer | Lecture des alertes, canaux, SLO et tableaux de bord |
| tf-plan | Projet | run.viewer | Lecture des services et jobs Cloud Run |
| tf-plan | Projet | secretmanager.viewer | Lecture des métadonnées des secrets |
| tf-plan | Projet | serviceusage.serviceUsageViewer | Lecture des API activées |
| tf-plan | Projet | serviceusage.serviceUsageConsumer | Utilisation des API du projet |
| tf-plan | Projet | pubsub.viewer | Lecture des topics, abonnements et schémas |
| tf-plan | Projet | eventarc.viewer | Lecture des triggers Eventarc |
| tf-plan | Projet | bigquery.metadataViewer | Lecture des métadonnées des datasets et tables |

`iam.securityReviewer` complète la lecture des politiques IAM des ressources.
La lecture des métadonnées BigQuery ne doit pas être confondue avec l’exécution
de requêtes ou la lecture du contenu des tables. Le plan doit aussi pouvoir lire
la politique IAM de la table (`bigquery.tables.getIamPolicy`).

### Administration au niveau du projet : tf-apply

| Identité | Ressource | Rôle | Justification |
|---|---|---|---|
| tf-apply | Projet | artifactregistry.admin | Gestion du dépôt Artifact Registry et de son IAM |
| tf-apply | Projet | cloudbuild.builds.editor | Gestion des déclencheurs sans rôle d’approbation dédié |
| tf-apply | Projet | cloudbuild.connectionAdmin | Gestion de la connexion GitHub et du dépôt lié |
| tf-apply | Projet | cloudscheduler.admin | Gestion des jobs Scheduler |
| tf-apply | Projet | cloudsql.admin | Gestion de l’instance et de la base Cloud SQL |
| tf-apply | Projet | cloudtasks.admin | Gestion des files Cloud Tasks et de leur IAM |
| tf-apply | Projet | iam.roleAdmin | Gestion des rôles personnalisés utilisés par Terraform |
| tf-apply | Projet | iam.securityReviewer | Lecture des politiques IAM nécessaires au plan |
| tf-apply | Projet | iam.serviceAccountAdmin | Gestion des comptes de service et de leur IAM |
| tf-apply | Projet | logging.configWriter | Gestion des métriques basées sur les logs |
| tf-apply | Projet | monitoring.admin | Gestion des alertes, canaux, SLO et tableaux de bord |
| tf-apply | Projet | resourcemanager.projectIamAdmin | Gestion additive des liaisons IAM du projet |
| tf-apply | Projet | run.admin | Gestion de la configuration et de l’IAM Cloud Run |
| tf-apply | Projet | secretmanager.viewer | Lecture des métadonnées des secrets |
| tf-apply | Projet | serviceusage.serviceUsageAdmin | Gestion de l’activation des API |
| tf-apply | Projet | serviceusage.serviceUsageConsumer | Utilisation des API du projet |
| tf-apply | Projet | pubsub.admin | Gestion des topics, schémas, abonnements et de leur IAM |
| tf-apply | Projet | eventarc.admin | Gestion des triggers Eventarc |
| tf-apply | Projet | bigquery.admin | Gestion des datasets, tables et de leur IAM, dont getIamPolicy et setIamPolicy |

Les privilèges de `tf-apply`, notamment `resourcemanager.projectIamAdmin`,
sont élevés. Les rôles personnalisés de métadonnées ne constituent donc pas
une garantie d’impossibilité d’élévation de privilèges ou d’accès indirect aux
secrets. La protection opérationnelle repose notamment sur la revue des PR,
la protection de main et l’approbation du build d’apply.

### Logs, état, sources, secrets et approbation

| Identité | Ressource | Rôle | Justification |
|---|---|---|---|
| tf-plan | Projet | logging.logWriter | Écriture des logs du plan |
| tf-apply | Projet | logging.logWriter | Écriture des logs de l’apply |
| tf-plan | Bucket cloudpulse-001-tfstate | storage.objectViewer | Lecture de l’état ; aucun droit d’écriture de verrou |
| tf-apply | Bucket cloudpulse-001-tfstate | storage.objectAdmin | Lecture et mise à jour de l’état et des verrous |
| tf-plan | Bucket cloudpulse-001_cloudbuild | storage.objectViewer | Lecture des sources Cloud Build |
| tf-apply | Bucket cloudpulse-001_cloudbuild | storage.objectViewer | Lecture des sources Cloud Build |
| tf-apply | Projet | terraformSecretMetadataAdmin (personnalisé) | Gestion des métadonnées et de l’IAM des secrets |
| tf-apply | Bucket cloudpulse-001-tfstate | terraformBucketIamAdmin (personnalisé) | Lecture des métadonnées et gestion de l’IAM du bucket |
| tf-apply | Bucket cloudpulse-001_cloudbuild | terraformBucketIamAdmin (personnalisé) | Lecture des métadonnées et gestion de l’IAM du bucket |
| tf-plan | Secret terraform-approver-member | secretmanager.secretAccessor | Chargement de approver_member pour le plan |
| tf-apply | Secret terraform-approver-member | secretmanager.secretAccessor | Chargement de approver_member pour le plan précédant l’apply |
| var.approver_member | Projet | cloudbuild.builds.approver | Approbation des builds infra-apply |

Le rôle personnalisé `terraformSecretMetadataAdmin` contient :
`secretmanager.secrets.create`, `delete`, `get`, `getIamPolicy`, `list`,
`setIamPolicy` et `update`, tous sous le préfixe `secretmanager.secrets.`.
Il ne contient pas `secretmanager.versions.access`.

Le rôle personnalisé `terraformBucketIamAdmin` contient :
`storage.buckets.get`, `storage.buckets.getIamPolicy` et
`storage.buckets.setIamPolicy`.

### Autorisations actAs de tf-apply

Chaque ligne correspond à une liaison `iam.serviceAccountUser` sur le compte
cible, sans attribution de ce rôle au niveau du projet.

| Identité | Compte cible | Rôle | Justification |
|---|---|---|---|
| tf-apply | cloudpulse-api | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-build | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-pr | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-migrate | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-ingest | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-ingest-invoker | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-watchdog | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-price-move | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | cloudpulse-eventarc | iam.serviceAccountUser | Configurer les services, jobs ou déclencheurs avec cette identité |
| tf-apply | tf-plan | iam.serviceAccountUser | Configurer le déclencheur CI avec cette identité |
| tf-apply | tf-apply | iam.serviceAccountUser | Configurer le déclencheur CI avec cette identité |

Le compte `pr` appartient également à la liste des identités de déclencheurs
gérées. Les clés de `terraform_managed_service_accounts` sont conservées lors
du remplacement des sources de données de la PR 1 par les ressources importées.

### Approbateur et bootstrap du secret

L’approbateur n’est pas écrit dans le dépôt : `approver_member` n’a pas de valeur
par défaut. En CI, sa valeur vient de Secret Manager
(`secretEnv` → `TF_VAR_approver_member`). En local, elle est chargée dans
`TF_VAR_approver_member`, ou dans un fichier de variables ignoré par Git.

Le secret `terraform-approver-member` et les deux liaisons de lecture CI ont
été créés par un apply Terraform local de bootstrap. Ils sont désormais gérés
dans l’état Terraform. La valeur de sa version a été ajoutée hors Terraform :
aucune ressource `secret_version` ne doit introduire cette valeur dans l’état.

Le rôle d’approbateur est géré par une liaison additive distincte du rôle Owner.
`tf-apply` n’a pas de liaison explicite `cloudbuild.builds.approver` ; ses droits
d’administration IAM restent néanmoins privilégiés.

## Éléments exclus de la gestion Terraform

- Rôle Owner du compte utilisateur au niveau du projet.
- Compte Compute Engine par défaut et sa liaison Editor existante.
- Comptes des service agents Google et liaisons automatiques de service agent,
  à l’exception des liaisons Pub/Sub explicitement inventoriées ci-dessus.
- Compte Cloud Build historique :
  `595188864600@cloudbuild.gserviceaccount.com`, et sa liaison historique.
- Accès historiques `projectOwner`, `projectEditor` et `projectViewer`
  des buckets.
- Autorisations automatiques de la connexion GitHub et de son secret régional.
- Valeurs et versions des secrets applicatifs et du secret d’approbation.
- ACL existantes du dataset `cloudpulse_events` :
  accès OWNER du créateur, OWNER pour `projectOwners`, READER pour
  `projectReaders`, WRITER pour `projectWriters`.
  Elles sont conservées par `ignore_changes = [access]` sur le dataset.
  La liaison du service agent sur la table reste gérée séparément.
- Utilisateur PostgreSQL `cloudpulse_app`, détaillé ci-dessous.
- Configuration du build, image, image de base et trafic de
  `price-move-detector`, gérés par le déploiement depuis les sources et
  exclus des mises à jour Terraform par `ignore_changes`.

### Abonnement de transport Eventarc

L’abonnement appartient à Eventarc et n’est pas importé comme ressource
`google_pubsub_subscription`. Son nom actuel est :

`eventarc-europe-west9-prices-ingested-to-price-move-sub-337`.

Les réglages ajoutés manuellement restent hors Terraform :

| Réglage | Valeur |
|---|---|
| Topic source | prices-ingested |
| Topic de rebut | prices-ingested-dlq |
| Maximum de livraisons configuré | 5 |
| Backoff minimal | 10 s |
| Backoff maximal | 600 s |
| Ack deadline observée | 10 s |
| Rétention observée | 86 400 s |

La liaison `pubsub.subscriber` du service agent sur cet abonnement est importée
séparément. Sa configuration référence l’abonnement retourné par le trigger,
et ne fige donc pas son nom dans la ressource IAM.

Après une recréation du trigger, vérifier le nouveau nom d’abonnement,
réappliquer la dead-letter policy et la retry policy, puis vérifier la liaison
IAM. Ces réglages exclus ne sont pas surveillés ni restaurés par Terraform :
un plan vide ne prouve pas leur conformité.

### Artefacts du déploiement depuis les sources

Le déploiement de la fonction a également créé le dépôt
`cloud-run-source-deploy` et utilise le bucket
`run-sources-cloudpulse-001-europe-west9`. Ils ne font pas partie des
21 imports de cette PR. Leur cycle de vie et leur IAM doivent être
inventoriés avant de les considérer comme couverts par Terraform ;
la gestion du build reste déléguée au déploiement depuis les sources.

La configuration d’audit DATA_WRITE d’Artifact Registry reste hors du
périmètre de modification de cette migration.

## Choix de gestion

Les ressources `*_iam_member` gèrent chaque liaison individuellement.
Elles préservent les autres membres, mais ne suppriment pas automatiquement
les autorisations supplémentaires accordées hors de Terraform.

Les 18 API sélectionnées utilisent `disable_on_destroy = false` :
leur retrait de Terraform ne doit pas les désactiver. Le nombre inclut
Pub/Sub, Eventarc et BigQuery ajoutés à la phase 8.

Les ressources IAM des secrets ne lisent pas leurs valeurs. L’accès explicite
de la CI au contenu des secrets est limité, dans les liaisons inventoriées,
au secret d’approbation. Le plan local reçoit sa valeur via une variable.

Pour l’application et la fonction, Terraform possède la configuration
d’exécution ; les champs d’image et de trafic délégués au déploiement sont
ignorés. `EVENTS_TOPIC` sur `cloudpulse-ingest` référence désormais le topic
déclaré dans Terraform.

Le dataset et la table BigQuery sont protégés par `prevent_destroy`.
La table conserve également `deletion_protection = true`.
Le schéma Avro et le schéma de table sont conservés dans deux fichiers
distincts, lus avec `file()`.

## Utilisateur PostgreSQL hors Terraform

L’utilisateur `cloudpulse_app` de l’instance `cloudpulse-db` reste géré hors
Terraform. Son mot de passe n’est ni fourni à Terraform ni lu depuis
Secret Manager par Terraform. La connexion applicative reste stockée dans
la version du secret `database-url`.

Les arrêts et démarrages manuels de l’instance sont conservés grâce à
`ignore_changes` sur `settings[0].activation_policy`.
La croissance automatique du disque est conservée grâce à
`ignore_changes` sur `settings[0].disk_size`.
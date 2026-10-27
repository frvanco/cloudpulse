resource "google_service_account" "tf_plan" {
  project         = var.project_id
  account_id      = "tf-plan"
  display_name    = "CloudPulse - Terraform plan"
  deletion_policy = "DELETE"
}

resource "google_service_account" "tf_apply" {
  project         = var.project_id
  account_id      = "tf-apply"
  display_name    = "CloudPulse - Terraform apply"
  deletion_policy = "DELETE"
}

locals {
  terraform_state_bucket     = "cloudpulse-001-tfstate"
  cloud_build_sources_bucket = "cloudpulse-001_cloudbuild"

  terraform_ci_accounts = {
    plan  = google_service_account.tf_plan
    apply = google_service_account.tf_apply
  }

  # Lecture des ressources et de leurs politiques IAM.
  terraform_plan_roles = toset([
    "roles/artifactregistry.reader",
    "roles/cloudbuild.builds.viewer",
    "roles/cloudbuild.connectionViewer",
    "roles/cloudscheduler.viewer",
    "roles/cloudsql.viewer",
    "roles/cloudtasks.viewer",
    "roles/iam.securityReviewer",
    "roles/iam.serviceAccountViewer",
    "roles/logging.viewer",
    "roles/monitoring.viewer",
    "roles/run.viewer",
    "roles/secretmanager.viewer",
    "roles/serviceusage.serviceUsageViewer",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  # Administration des familles de ressources présentes dans cet état.
  terraform_apply_roles = toset([
    "roles/artifactregistry.admin",
    "roles/cloudbuild.builds.editor",
    "roles/cloudbuild.connectionAdmin",
    "roles/cloudscheduler.admin",
    "roles/cloudsql.admin",
    "roles/cloudtasks.admin",
    "roles/iam.roleAdmin",
    "roles/iam.securityReviewer",
    "roles/iam.serviceAccountAdmin",
    "roles/logging.configWriter",
    "roles/monitoring.admin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/run.admin",
    "roles/secretmanager.viewer",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  # Identités utilisées par les services, jobs et déclencheurs gérés.
  terraform_managed_service_accounts = {
    api            = google_service_account.api
    build          = google_service_account.build
    pr             = google_service_account.pr
    migrate        = google_service_account.migrate
    ingest         = google_service_account.ingest
    ingest_invoker = google_service_account.ingest_invoker
    watchdog       = google_service_account.watchdog
    tf_plan        = google_service_account.tf_plan
    tf_apply       = google_service_account.tf_apply
  }
}

resource "google_project_iam_member" "tf_plan_read" {
  for_each = local.terraform_plan_roles

  project = var.project_id
  role    = each.value
  member  = google_service_account.tf_plan.member
}

resource "google_project_iam_member" "tf_apply_manage" {
  for_each = local.terraform_apply_roles

  project = var.project_id
  role    = each.value
  member  = google_service_account.tf_apply.member
}

# Les deux builds écrivent leurs logs dans Cloud Logging.
resource "google_project_iam_member" "terraform_ci_logs" {
  for_each = local.terraform_ci_accounts

  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = each.value.member
}

# Le plan lit l'état, mais ne peut ni le modifier ni créer de verrou.
resource "google_storage_bucket_iam_member" "tf_plan_state_read" {
  bucket = local.terraform_state_bucket
  role   = "roles/storage.objectViewer"
  member = google_service_account.tf_plan.member
}

# L'apply écrit l'état et crée/supprime les objets de verrouillage.
resource "google_storage_bucket_iam_member" "tf_apply_state_write" {
  bucket = local.terraform_state_bucket
  role   = "roles/storage.objectAdmin"
  member = google_service_account.tf_apply.member
}

resource "google_storage_bucket_iam_member" "terraform_ci_sources_read" {
  for_each = local.terraform_ci_accounts

  bucket = local.cloud_build_sources_bucket
  role   = "roles/storage.objectViewer"
  member = each.value.member
}

# Gestion des secrets déclarés, sans accès au contenu des versions.
resource "google_project_iam_custom_role" "terraform_secret_metadata" {
  project     = var.project_id
  role_id     = "terraformSecretMetadataAdmin"
  title       = "Terraform Secret Metadata Admin"
  description = "Manage secret metadata and IAM, without accessing secret payloads."
  stage       = "GA"

  permissions = [
    "secretmanager.secrets.create",
    "secretmanager.secrets.delete",
    "secretmanager.secrets.get",
    "secretmanager.secrets.getIamPolicy",
    "secretmanager.secrets.list",
    "secretmanager.secrets.setIamPolicy",
    "secretmanager.secrets.update",
  ]
}

resource "google_project_iam_member" "tf_apply_secret_metadata" {
  project = var.project_id
  role    = google_project_iam_custom_role.terraform_secret_metadata.name
  member  = google_service_account.tf_apply.member
}

# Terraform gère des liaisons IAM sur ces buckets, pas leur cycle de vie.
resource "google_project_iam_custom_role" "terraform_bucket_iam" {
  project     = var.project_id
  role_id     = "terraformBucketIamAdmin"
  title       = "Terraform Bucket IAM Admin"
  description = "Read bucket metadata and manage bucket IAM policies."
  stage       = "GA"

  permissions = [
    "storage.buckets.get",
    "storage.buckets.getIamPolicy",
    "storage.buckets.setIamPolicy",
  ]
}

resource "google_storage_bucket_iam_member" "tf_apply_bucket_iam" {
  for_each = toset([
    local.terraform_state_bucket,
    local.cloud_build_sources_bucket,
  ])

  bucket = each.value
  role   = google_project_iam_custom_role.terraform_bucket_iam.name
  member = google_service_account.tf_apply.member
}

resource "google_service_account_iam_member" "tf_apply_act_as" {
  for_each = local.terraform_managed_service_accounts

  service_account_id = each.value.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.tf_apply.member
}

# Liaison additive : le rôle Owner existant reste indépendant.
resource "google_project_iam_member" "terraform_build_approver" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.approver"
  member  = "user:antoine.vancompernolle@gmail.com"
}
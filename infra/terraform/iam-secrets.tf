resource "google_secret_manager_secret_iam_member" "api_database" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.api.member
}

resource "google_secret_manager_secret_iam_member" "ingest_database" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.ingest.member
}

resource "google_secret_manager_secret_iam_member" "migrate_database" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.migrate.member
}

resource "google_secret_manager_secret_iam_member" "api_twelve_data" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.twelve_data_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.api.member
}

resource "google_secret_manager_secret_iam_member" "ingest_twelve_data" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.twelve_data_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.ingest.member
}

resource "google_secret_manager_secret_iam_member" "terraform_ci_approver_member" {
  for_each = local.terraform_ci_accounts

  project   = var.project_id
  secret_id = google_secret_manager_secret.terraform_approver_member.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = each.value.member
}

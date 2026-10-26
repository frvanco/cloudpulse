resource "google_project_iam_member" "api_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = google_service_account.api.member
}

resource "google_project_iam_member" "ingest_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = google_service_account.ingest.member
}

resource "google_project_iam_member" "migrate_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = google_service_account.migrate.member
}

resource "google_project_iam_member" "build_logs" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = google_service_account.build.member
}

resource "google_project_iam_member" "pr_logs" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = google_service_account.pr.member
}

resource "google_project_iam_member" "watchdog_logs" {
  project = var.project_id
  role    = "roles/logging.viewer"
  member  = google_service_account.watchdog.member
}

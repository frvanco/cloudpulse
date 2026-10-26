resource "google_service_account" "api" {
  project         = var.project_id
  account_id      = "cloudpulse-api"
  display_name    = "cloudpulse-api"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_service_account" "build" {
  project         = var.project_id
  account_id      = "cloudpulse-build"
  display_name    = "CloudPulse - build et publication des images"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_service_account" "pr" {
  project         = var.project_id
  account_id      = "cloudpulse-pr"
  display_name    = "CloudPulse - validation des pull requests"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_service_account" "migrate" {
  project         = var.project_id
  account_id      = "cloudpulse-migrate"
  display_name    = "CloudPulse - migrations PostgreSQL"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_service_account" "ingest" {
  project         = var.project_id
  account_id      = "cloudpulse-ingest"
  display_name    = "CloudPulse - service ingestion"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_service_account" "ingest_invoker" {
  project         = var.project_id
  account_id      = "cloudpulse-ingest-invoker"
  display_name    = "CloudPulse - invocation ingestion"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_service_account" "watchdog" {
  project         = var.project_id
  account_id      = "cloudpulse-watchdog"
  display_name    = "CloudPulse - surveillance ingestion"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_cloud_run_v2_service_iam_member" "build_deploy_api" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-api"
  role     = "roles/run.developer"
  member   = google_service_account.build.member
}

resource "google_cloud_run_v2_service_iam_member" "build_invoke_api" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-api"
  role     = "roles/run.invoker"
  member   = google_service_account.build.member
}

resource "google_cloud_run_v2_service_iam_member" "build_deploy_ingest" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-ingest"
  role     = "roles/run.developer"
  member   = google_service_account.build.member
}

resource "google_cloud_run_v2_service_iam_member" "build_invoke_ingest" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-ingest"
  role     = "roles/run.invoker"
  member   = google_service_account.build.member
}

resource "google_cloud_run_v2_service_iam_member" "tasks_scheduler_invoke_ingest" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-ingest"
  role     = "roles/run.invoker"
  member   = google_service_account.ingest_invoker.member
}

resource "google_cloud_run_v2_job_iam_member" "build_deploy_migrate" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-migrate"
  role     = "roles/run.developer"
  member   = google_service_account.build.member
}

resource "google_cloud_run_v2_job_iam_member" "scheduler_invoke_watchdog" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-ingest-watchdog"
  role     = "roles/run.invoker"
  member   = google_service_account.ingest_invoker.member
}

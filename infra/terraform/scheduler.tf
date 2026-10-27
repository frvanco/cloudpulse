locals {
  ingestion_service_url = "https://cloudpulse-ingest-595188864600.europe-west9.run.app"
}

resource "google_cloud_scheduler_job" "ingest_daily" {
  project          = var.project_id
  region           = var.region
  name             = "ingest-daily"
  schedule         = "30 23 * * 1-5"
  time_zone        = "Europe/Paris"
  paused           = false
  attempt_deadline = "180s"
  deletion_policy  = "DELETE"

  http_target {
    uri         = "${local.ingestion_service_url}/internal/ingestion/dispatch"
    http_method = "POST"
    body        = base64encode("{}")

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      audience              = local.ingestion_service_url
      service_account_email = google_service_account.ingest_invoker.email
    }
  }

  retry_config {
    retry_count          = 0
    min_backoff_duration = "5s"
    max_backoff_duration = "3600s"
    max_doublings        = 5
    max_retry_duration   = "0s"
  }
}

resource "google_cloud_scheduler_job" "ingestion_watchdog" {
  project          = var.project_id
  region           = var.region
  name             = "check-ingestion-daily"
  schedule         = "35 1 * * 2-6"
  time_zone        = "Europe/Paris"
  paused           = false
  attempt_deadline = "180s"
  deletion_policy  = "DELETE"

  http_target {
    uri         = "https://run.googleapis.com/v2/${google_cloud_run_v2_job.watchdog.id}:run"
    http_method = "POST"
    body        = base64encode("{}")

    headers = {
      "Content-Type" = "application/json"
    }

    oauth_token {
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
      service_account_email = google_service_account.ingest_invoker.email
    }
  }

  retry_config {
    retry_count          = 0
    min_backoff_duration = "5s"
    max_backoff_duration = "3600s"
    max_doublings        = 5
    max_retry_duration   = "0s"
  }
}

resource "google_cloud_tasks_queue" "ingest_quotes" {
  project         = var.project_id
  location        = "europe-west1"
  name            = "ingest-quotes"
  desired_state   = "RUNNING"
  deletion_policy = "DELETE"

  rate_limits {
    max_concurrent_dispatches = 1
    max_dispatches_per_second = 0.05
  }

  retry_config {
    max_attempts  = 5
    min_backoff   = "60s"
    max_backoff   = "600s"
    max_doublings = 3
  }
}

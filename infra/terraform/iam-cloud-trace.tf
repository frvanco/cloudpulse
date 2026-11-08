resource "google_project_iam_member" "cloud_trace_agent" {
  for_each = {
    api    = google_service_account.api.member
    ingest = google_service_account.ingest.member
  }

  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = each.value
}

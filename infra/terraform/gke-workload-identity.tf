locals {
  gke_api_principal = "principal://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${var.project_id}.svc.id.goog/subject/ns/cloudpulse/sa/cloudpulse-api"
}

resource "google_project_iam_member" "gke_api_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = local.gke_api_principal
}

resource "google_secret_manager_secret_iam_member" "gke_api_secrets" {
  for_each = {
    database_url = google_secret_manager_secret.database_url.secret_id
    twelve_data  = google_secret_manager_secret.twelve_data_api_key.secret_id
  }

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = local.gke_api_principal
}

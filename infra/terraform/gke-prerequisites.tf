resource "google_service_account" "gke_nodes" {
  project         = var.project_id
  account_id      = "cloudpulse-gke-nodes"
  display_name    = "CloudPulse - noeuds GKE"
  deletion_policy = "DELETE"
}

resource "google_project_iam_member" "gke_nodes_default" {
  project = var.project_id
  role    = "roles/container.defaultNodeServiceAccount"
  member  = google_service_account.gke_nodes.member
}

resource "google_artifact_registry_repository_iam_member" "gke_nodes_reader" {
  project    = var.project_id
  location   = google_artifact_registry_repository.cloudpulse.location
  repository = google_artifact_registry_repository.cloudpulse.name
  role       = "roles/artifactregistry.reader"
  member     = google_service_account.gke_nodes.member
}

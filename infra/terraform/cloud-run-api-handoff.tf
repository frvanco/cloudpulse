# Configuration du service API gérée par Cloud Deploy.
data "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-api"
}

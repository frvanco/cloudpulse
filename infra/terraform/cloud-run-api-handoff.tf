# Configuration du service API gérée par Cloud Deploy.
data "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-api"
}

# Conserver le service existant lors du retrait de l'état Terraform.
removed {
  from = google_cloud_run_v2_service.api

  lifecycle {
    destroy = false
  }
}

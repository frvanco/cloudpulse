resource "google_monitoring_service" "api" {
  project         = "595188864600"
  service_id      = "20bvW_TfSPe-95PnWKTKSA"
  display_name    = google_cloud_run_v2_service.api.name
  deletion_policy = "DELETE"

  basic_service {
    service_type = "CLOUD_RUN"

    service_labels = {
      location     = google_cloud_run_v2_service.api.location
      service_name = google_cloud_run_v2_service.api.name
    }
  }
}

resource "google_monitoring_slo" "api_availability" {
  project             = var.project_id
  service             = google_monitoring_service.api.service_id
  slo_id              = "i329kXktTIW4magEvfl54w"
  display_name        = "CloudPulse API — disponibilité 99 % sur 7 jours"
  goal                = 0.99
  rolling_period_days = 7
  deletion_policy     = "DELETE"

  basic_sli {
    availability {
      enabled = true
    }
  }
  lifecycle {
    prevent_destroy = true

    # Le provider ne restitue pas le champ service lors de cet import.
    # Le parent existant reste identifié dans le nom complet du SLO.
    ignore_changes = [service]
  }
}

resource "google_clouddeploy_target" "prod" {
  project          = var.project_id
  location         = var.region
  name             = "prod"
  description      = "Cloud Run CloudPulse en production"
  require_approval = true
  deletion_policy  = "DELETE"

  run {
    location = "projects/${var.project_id}/locations/${var.region}"
  }

  execution_configs {
    usages            = ["RENDER", "PREDEPLOY", "DEPLOY", "VERIFY"]
    service_account   = google_service_account.deploy.email
    artifact_storage  = "gs://europe-west9.deploy-artifacts.cloudpulse-001.appspot.com"
    execution_timeout = "1200s"
  }
}

import {
  to = google_clouddeploy_target.prod
  id = "projects/cloudpulse-001/locations/europe-west9/targets/prod"
}

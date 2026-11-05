resource "google_project_iam_custom_role" "cloud_deploy_operation_viewer" {
  project = var.project_id
  role_id = "cloudDeployOperationViewer"
  title   = "Cloud Deploy operation reader"
  stage   = "GA"

  permissions = ["clouddeploy.operations.get"]
}

resource "google_project_iam_member" "build_clouddeploy_operations" {
  project = var.project_id
  role    = google_project_iam_custom_role.cloud_deploy_operation_viewer.name
  member  = google_service_account.build.member
}

resource "google_clouddeploy_delivery_pipeline_iam_member" "build_releaser" {
  project  = var.project_id
  location = var.region
  name     = "cloudpulse-api"
  role     = "roles/clouddeploy.releaser"
  member   = google_service_account.build.member
}

import {
  to = google_project_iam_custom_role.cloud_deploy_operation_viewer
  id = "projects/cloudpulse-001/roles/cloudDeployOperationViewer"
}

import {
  to = google_project_iam_member.build_clouddeploy_operations
  id = "cloudpulse-001 projects/cloudpulse-001/roles/cloudDeployOperationViewer serviceAccount:cloudpulse-build@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_clouddeploy_delivery_pipeline_iam_member.build_releaser
  id = "projects/cloudpulse-001/locations/europe-west9/deliveryPipelines/cloudpulse-api roles/clouddeploy.releaser serviceAccount:cloudpulse-build@cloudpulse-001.iam.gserviceaccount.com"
}

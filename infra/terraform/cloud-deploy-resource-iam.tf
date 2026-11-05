resource "google_cloud_run_v2_service_iam_member" "deploy_api" {
  for_each = toset([
    "roles/run.developer",
    "roles/run.invoker",
  ])

  project  = var.project_id
  location = var.region
  name     = data.google_cloud_run_v2_service.api.name
  role     = each.value
  member   = google_service_account.deploy.member
}

resource "google_cloud_run_v2_job_iam_member" "deploy_migrate" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.migrate.name
  role     = "roles/run.developer"
  member   = google_service_account.deploy.member
}

resource "google_service_account_iam_member" "deploy_act_as_runtime" {
  for_each = {
    api     = google_service_account.api.name
    migrate = google_service_account.migrate.name
  }

  service_account_id = each.value
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deploy.member
}

resource "google_storage_bucket_iam_member" "build_deploy_artifacts" {
  for_each = toset([
    "roles/storage.bucketViewer",
    "roles/storage.objectCreator",
  ])

  bucket = "europe-west9.deploy-artifacts.cloudpulse-001.appspot.com"
  role   = each.value
  member = google_service_account.build.member
}

import {
  to = google_cloud_run_v2_service_iam_member.deploy_api["roles/run.developer"]
  id = "projects/cloudpulse-001/locations/europe-west9/services/cloudpulse-api roles/run.developer serviceAccount:cloudpulse-deploy@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_cloud_run_v2_service_iam_member.deploy_api["roles/run.invoker"]
  id = "projects/cloudpulse-001/locations/europe-west9/services/cloudpulse-api roles/run.invoker serviceAccount:cloudpulse-deploy@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_cloud_run_v2_job_iam_member.deploy_migrate
  id = "projects/cloudpulse-001/locations/europe-west9/jobs/cloudpulse-migrate roles/run.developer serviceAccount:cloudpulse-deploy@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_service_account_iam_member.deploy_act_as_runtime["api"]
  id = "projects/cloudpulse-001/serviceAccounts/cloudpulse-api@cloudpulse-001.iam.gserviceaccount.com roles/iam.serviceAccountUser serviceAccount:cloudpulse-deploy@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_service_account_iam_member.deploy_act_as_runtime["migrate"]
  id = "projects/cloudpulse-001/serviceAccounts/cloudpulse-migrate@cloudpulse-001.iam.gserviceaccount.com roles/iam.serviceAccountUser serviceAccount:cloudpulse-deploy@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_storage_bucket_iam_member.build_deploy_artifacts["roles/storage.bucketViewer"]
  id = "b/europe-west9.deploy-artifacts.cloudpulse-001.appspot.com roles/storage.bucketViewer serviceAccount:cloudpulse-build@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_storage_bucket_iam_member.build_deploy_artifacts["roles/storage.objectCreator"]
  id = "b/europe-west9.deploy-artifacts.cloudpulse-001.appspot.com roles/storage.objectCreator serviceAccount:cloudpulse-build@cloudpulse-001.iam.gserviceaccount.com"
}

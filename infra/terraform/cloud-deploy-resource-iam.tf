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

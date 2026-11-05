resource "google_service_account" "deploy" {
  project         = var.project_id
  account_id      = "cloudpulse-deploy"
  display_name    = "CloudPulse - exécution Cloud Deploy"
  disabled        = false
  deletion_policy = "DELETE"
}

resource "google_project_iam_member" "deploy_job_runner" {
  project = var.project_id
  role    = "roles/clouddeploy.jobRunner"
  member  = google_service_account.deploy.member
}

resource "google_service_account_iam_member" "build_act_as_deploy" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.build.member
}

resource "google_service_account_iam_member" "deploy_oidc_token" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.serviceAccountOpenIdTokenCreator"
  member             = google_service_account.deploy.member
}

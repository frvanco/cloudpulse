resource "google_service_account_iam_member" "build_act_as_api" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.build.member
}

resource "google_service_account_iam_member" "build_act_as_ingest" {
  service_account_id = google_service_account.ingest.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.build.member
}

resource "google_service_account_iam_member" "build_act_as_migrate" {
  service_account_id = google_service_account.migrate.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.build.member
}

resource "google_service_account_iam_member" "ingest_act_as_invoker" {
  service_account_id = google_service_account.ingest_invoker.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.ingest.member
}

resource "google_service_account_iam_member" "build_oidc_token" {
  service_account_id = google_service_account.build.name
  role               = "roles/iam.serviceAccountOpenIdTokenCreator"
  member             = google_service_account.build.member
}

resource "google_cloud_tasks_queue_iam_member" "ingest_enqueue" {
  project  = google_cloud_tasks_queue.ingest_quotes.project
  location = google_cloud_tasks_queue.ingest_quotes.location
  name     = google_cloud_tasks_queue.ingest_quotes.name
  role     = "roles/cloudtasks.enqueuer"
  member   = google_service_account.ingest.member
}

resource "google_artifact_registry_repository_iam_member" "build_publish" {
  project    = google_artifact_registry_repository.cloudpulse.project
  location   = google_artifact_registry_repository.cloudpulse.location
  repository = google_artifact_registry_repository.cloudpulse.repository_id
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.build.member
}

resource "google_storage_bucket_iam_member" "build_read_sources" {
  bucket = "cloudpulse-001_cloudbuild"
  role   = "roles/storage.objectViewer"
  member = google_service_account.build.member
}

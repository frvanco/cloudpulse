data "google_project" "current" {
  project_id = var.project_id
}

locals {
  pubsub_service_agent_member = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Publication des événements après ingestion.
resource "google_pubsub_topic_iam_member" "ingest_publish" {
  project = var.project_id
  topic   = google_pubsub_topic.prices_ingested.name
  role    = "roles/pubsub.publisher"
  member  = google_service_account.ingest.member
}

# Transfert des messages en échec vers le rebut.
resource "google_pubsub_topic_iam_member" "pubsub_publish_dlq" {
  project = var.project_id
  topic   = google_pubsub_topic.prices_ingested_dlq.name
  role    = "roles/pubsub.publisher"
  member  = local.pubsub_service_agent_member
}

resource "google_pubsub_subscription_iam_member" "pubsub_bq_dead_letter" {
  subscription = google_pubsub_subscription.prices_ingested_bq.id
  role         = "roles/pubsub.subscriber"
  member       = local.pubsub_service_agent_member
}

resource "google_pubsub_subscription_iam_member" "pubsub_eventarc_dead_letter" {
  subscription = google_eventarc_trigger.prices_ingested.transport[0].pubsub[0].subscription
  role         = "roles/pubsub.subscriber"
  member       = local.pubsub_service_agent_member
}

# Invocation authentifiée de la fonction par Eventarc.
resource "google_cloud_run_v2_service_iam_member" "eventarc_invoke_price_move" {
  project  = var.project_id
  location = google_cloud_run_v2_service.price_move_detector.location
  name     = google_cloud_run_v2_service.price_move_detector.name
  role     = "roles/run.invoker"
  member   = google_service_account.eventarc.member
}

# Écriture des événements dans cette table uniquement.
resource "google_bigquery_table_iam_member" "pubsub_write_prices" {
  project    = var.project_id
  dataset_id = google_bigquery_table.prices_ingested.dataset_id
  table_id   = google_bigquery_table.prices_ingested.table_id
  role       = "roles/bigquery.dataEditor"
  member     = local.pubsub_service_agent_member
}

# Construction de la fonction depuis ses sources.
resource "google_project_iam_member" "build_run_builder" {
  project = var.project_id
  role    = "roles/run.builder"
  member  = google_service_account.build.member
}

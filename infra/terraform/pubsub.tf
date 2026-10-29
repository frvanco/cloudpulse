resource "google_pubsub_schema" "prices_ingested" {
  project         = var.project_id
  name            = "prices-ingested-v1"
  type            = "AVRO"
  definition      = file("${path.module}/schemas/prices-ingested-v1.avsc")
  deletion_policy = "DELETE"
}

resource "google_pubsub_topic" "prices_ingested" {
  project                    = var.project_id
  name                       = "prices-ingested"
  message_retention_duration = "86400s"
  deletion_policy            = "DELETE"

  schema_settings {
    schema   = google_pubsub_schema.prices_ingested.id
    encoding = "JSON"
  }
}

resource "google_pubsub_topic" "prices_ingested_dlq" {
  project         = var.project_id
  name            = "prices-ingested-dlq"
  deletion_policy = "DELETE"
}

resource "google_pubsub_subscription" "prices_ingested_bq" {
  project                    = var.project_id
  name                       = "prices-ingested-bq"
  topic                      = google_pubsub_topic.prices_ingested.id
  ack_deadline_seconds       = 10
  message_retention_duration = "86400s"
  deletion_policy            = "DELETE"

  bigquery_config {
    # Référence à la table ajoutée lors de son import.
    table            = "${google_bigquery_table.prices_ingested.project}:${google_bigquery_table.prices_ingested.dataset_id}.${google_bigquery_table.prices_ingested.table_id}"
    use_topic_schema = true
    write_metadata   = true
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.prices_ingested_dlq.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  # Politique existante : expiration après 31 jours sans activité.
  expiration_policy {
    ttl = "2678400s"
  }
}

resource "google_pubsub_subscription" "prices_ingested_dlq_inspect" {
  project                    = var.project_id
  name                       = "prices-ingested-dlq-inspect"
  topic                      = google_pubsub_topic.prices_ingested_dlq.id
  ack_deadline_seconds       = 30
  message_retention_duration = "604800s"
  deletion_policy            = "DELETE"

  # Politique existante, conservée pour cet import.
  expiration_policy {
    ttl = "2678400s"
  }
}
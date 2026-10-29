resource "google_bigquery_dataset" "cloudpulse_events" {
  project                    = var.project_id
  dataset_id                 = "cloudpulse_events"
  location                   = var.region
  max_time_travel_hours      = 168
  delete_contents_on_destroy = false
  deletion_policy            = "DELETE"

  lifecycle {
    prevent_destroy = true

    # Les accès existants du dataset restent hors de cette ressource,
    # notamment l'accès personnel du propriétaire.
    ignore_changes = [access]
  }
}

resource "google_bigquery_table" "prices_ingested" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.cloudpulse_events.dataset_id
  table_id            = "prices_ingested"
  deletion_policy     = "DELETE"
  deletion_protection = true

  schema = file("${path.module}/schemas/prices-ingested-bigquery.json")

  time_partitioning {
    type  = "DAY"
    field = "publish_time"
  }

  lifecycle {
    prevent_destroy = true
  }
}
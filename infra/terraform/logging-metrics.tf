# __generated__ by Terraform
# Please review these resources and move them into your main configuration files.

# __generated__ by Terraform from "cloudpulse-001 ingestion_dispatch"
resource "google_logging_metric" "ingestion_dispatch" {
  deletion_policy = "DELETE"
  description     = "Nombre de dispatchs d'ingestion termines."
  disabled        = false
  filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"cloudpulse-ingest\" AND jsonPayload.event=\"ingestion.dispatch\""
  name            = "ingestion_dispatch"
  project         = var.project_id
  metric_descriptor {
    metric_kind = "DELTA"
    unit        = "1"
    value_type  = "INT64"
  }
}

# __generated__ by Terraform from "cloudpulse-001 ingestion_symbols"
resource "google_logging_metric" "ingestion_symbols" {
  deletion_policy = "DELETE"
  description     = "Resultats d'ingestion par symbole et statut."
  disabled        = false
  filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"cloudpulse-ingest\" AND jsonPayload.event=\"ingestion.symbol\""
  label_extractors = {
    status = "EXTRACT(jsonPayload.status)"
  }
  name    = "ingestion_symbols"
  project = var.project_id
  metric_descriptor {
    metric_kind = "DELTA"
    unit        = "1"
    value_type  = "INT64"
    labels {
      description = "Resultat : ingested ou skipped."
      key         = "status"
      value_type  = "STRING"
    }
  }
}

# __generated__ by Terraform from "cloudpulse-001 provider_latency"
resource "google_logging_metric" "provider_latency" {
  deletion_policy = "DELETE"
  description     = "Duree en millisecondes des appels Twelve Data journalises."
  disabled        = false
  filter          = "resource.type=\"cloud_run_revision\" AND (resource.labels.service_name=\"cloudpulse-api\" OR resource.labels.service_name=\"cloudpulse-ingest\") AND jsonPayload.event=\"provider.request\" AND jsonPayload.durationMs:*"
  name            = "provider_latency"
  project         = var.project_id
  value_extractor = "EXTRACT(jsonPayload.durationMs)"
  bucket_options {
    explicit_buckets {
      bounds = [0, 50, 100, 250, 500, 1000, 2000, 5000, 10000]
    }
  }
  metric_descriptor {
    metric_kind = "DELTA"
    unit        = "ms"
    value_type  = "DISTRIBUTION"
  }
}

# __generated__ by Terraform from "cloudpulse-001 quotes_served"
resource "google_logging_metric" "quotes_served" {
  deletion_policy = "DELETE"
  description     = "Cotations servies par l'API, selon leur source."
  disabled        = false
  filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"cloudpulse-api\" AND jsonPayload.event=\"quote.served\""
  label_extractors = {
    source = "EXTRACT(jsonPayload.source)"
  }
  name    = "quotes_served"
  project = var.project_id
  metric_descriptor {
    metric_kind = "DELTA"
    unit        = "1"
    value_type  = "INT64"
    labels {
      description = "Origine : cache, provider ou stale."
      key         = "source"
      value_type  = "STRING"
    }
  }
}

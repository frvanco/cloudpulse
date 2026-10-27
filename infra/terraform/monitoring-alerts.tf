# __generated__ by Terraform
# Please review these resources and move them into your main configuration files.

# __generated__ by Terraform from "projects/cloudpulse-001/notificationChannels/8306273279556979972"
resource "google_monitoring_notification_channel" "email" {
  deletion_policy = "DELETE"
  display_name    = "Antoine"
  enabled         = true
  force_delete    = false
  labels = {
    email_address = "antoinevancompernolle@gmail.com"
  }
  project     = var.project_id
  type        = "email"
  user_labels = {}
}

# __generated__ by Terraform from "projects/cloudpulse-001/alertPolicies/6039403299915611820"
resource "google_monitoring_alert_policy" "ingestion_watchdog" {
  combiner              = "OR"
  deletion_policy       = "DELETE"
  display_name          = "CloudPulse — dispatch absent depuis 26 h"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  severity              = "ERROR"
  user_labels           = {}
  alert_strategy {
    auto_close           = "604800s"
    notification_prompts = ["OPENED"]
    notification_rate_limit {
      period = "3600s"
    }
  }
  conditions {
    display_name = "Log match condition"
    condition_matched_log {
      filter           = "resource.type=\"cloud_run_job\"\nresource.labels.job_name=\"cloudpulse-ingest-watchdog\"\njsonPayload.event=\"ingestion.watchdog.missing\"\nseverity>=ERROR"
      label_extractors = {}
    }
  }
}

# __generated__ by Terraform from "projects/cloudpulse-001/alertPolicies/6215435606373575685"
resource "google_monitoring_alert_policy" "api_burn_rate" {
  combiner              = "OR"
  deletion_policy       = "DELETE"
  display_name          = "API — burn rate > 10 sur 1 h"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  user_labels           = {}
  conditions {
    display_name = "API — burn rate > 10 sur 1 h"
    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "0s"
      filter          = "select_slo_burn_rate(\"${google_monitoring_slo.api_availability.name}\", \"3600s\")"
      threshold_value = 10
      trigger {
        count   = 1
        percent = 0
      }
    }
  }
}

# __generated__ by Terraform from "projects/cloudpulse-001/alertPolicies/15882279880063891397"
resource "google_monitoring_alert_policy" "sql_connections" {
  combiner              = "OR"
  deletion_policy       = "DELETE"
  display_name          = "CloudPulse — connexions PostgreSQL > 20"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  user_labels           = {}
  alert_strategy {
    notification_prompts = ["OPENED"]
  }
  conditions {
    display_name = "Connexions PostgreSQL > 20"
    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "60s"
      filter          = "resource.type = \"cloudsql_database\" AND resource.labels.database_id = \"${var.project_id}:${google_sql_database_instance.cloudpulse.name}\" AND metric.type = \"cloudsql.googleapis.com/database/postgresql/num_backends\""
      threshold_value = 20
      aggregations {
        alignment_period     = "60s"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = []
        per_series_aligner   = "ALIGN_MEAN"
      }
      trigger {
        count   = 1
        percent = 0
      }
    }
  }
  documentation {
    content   = "Le nombre total de connexions PostgreSQL de cloudpulse-db dépasse 20 pendant au moins 60 secondes."
    mime_type = "text/markdown"
    subject   = "Dépassement 20 connec base PSQL - CLOUD PULSE"
  }
}

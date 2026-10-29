import {
  to = google_pubsub_schema.prices_ingested
  id = "projects/cloudpulse-001/schemas/prices-ingested-v1"
}

import {
  to = google_pubsub_topic.prices_ingested
  id = "projects/cloudpulse-001/topics/prices-ingested"
}

import {
  to = google_pubsub_topic.prices_ingested_dlq
  id = "projects/cloudpulse-001/topics/prices-ingested-dlq"
}

import {
  to = google_pubsub_subscription.prices_ingested_bq
  id = "projects/cloudpulse-001/subscriptions/prices-ingested-bq"
}

import {
  to = google_pubsub_subscription.prices_ingested_dlq_inspect
  id = "projects/cloudpulse-001/subscriptions/prices-ingested-dlq-inspect"
}

import {
  to = google_bigquery_dataset.cloudpulse_events
  id = "projects/cloudpulse-001/datasets/cloudpulse_events"
}

import {
  to = google_bigquery_table.prices_ingested
  id = "projects/cloudpulse-001/datasets/cloudpulse_events/tables/prices_ingested"
}

import {
  to = google_service_account.price_move
  id = "projects/cloudpulse-001/serviceAccounts/cloudpulse-price-move@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_service_account.eventarc
  id = "projects/cloudpulse-001/serviceAccounts/cloudpulse-eventarc@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_cloud_run_v2_service.price_move_detector
  id = "projects/cloudpulse-001/locations/europe-west9/services/price-move-detector"
}

import {
  to = google_eventarc_trigger.prices_ingested
  id = "projects/cloudpulse-001/locations/europe-west9/triggers/prices-ingested-to-price-move"
}

import {
  to = google_pubsub_topic_iam_member.ingest_publish
  id = "projects/${var.project_id}/topics/prices-ingested roles/pubsub.publisher serviceAccount:cloudpulse-ingest@${var.project_id}.iam.gserviceaccount.com"
}

import {
  to = google_pubsub_topic_iam_member.pubsub_publish_dlq
  id = "projects/${var.project_id}/topics/prices-ingested-dlq roles/pubsub.publisher ${local.pubsub_service_agent_member}"
}

import {
  to = google_pubsub_subscription_iam_member.pubsub_bq_dead_letter
  id = "projects/${var.project_id}/subscriptions/prices-ingested-bq roles/pubsub.subscriber ${local.pubsub_service_agent_member}"
}

import {
  to = google_pubsub_subscription_iam_member.pubsub_eventarc_dead_letter
  id = "projects/${var.project_id}/subscriptions/eventarc-europe-west9-prices-ingested-to-price-move-sub-337 roles/pubsub.subscriber ${local.pubsub_service_agent_member}"
}

import {
  to = google_cloud_run_v2_service_iam_member.eventarc_invoke_price_move
  id = "projects/${var.project_id}/locations/${var.region}/services/price-move-detector roles/run.invoker serviceAccount:cloudpulse-eventarc@${var.project_id}.iam.gserviceaccount.com"
}

import {
  to = google_bigquery_table_iam_member.pubsub_write_prices
  id = "projects/${var.project_id}/datasets/cloudpulse_events/tables/prices_ingested roles/bigquery.dataEditor ${local.pubsub_service_agent_member}"
}

import {
  to = google_project_iam_member.build_run_builder
  id = "${var.project_id} roles/run.builder serviceAccount:cloudpulse-build@${var.project_id}.iam.gserviceaccount.com"
}

import {
  to = google_logging_metric.price_change_percent
  id = "cloudpulse-001 price_change_percent"
}

import {
  to = google_monitoring_alert_policy.price_move
  id = "projects/cloudpulse-001/alertPolicies/10208954173869625131"
}

import {
  to = google_monitoring_alert_policy.dlq_backlog
  id = "projects/cloudpulse-001/alertPolicies/9216780358841151151"
}
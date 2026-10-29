resource "google_eventarc_trigger" "prices_ingested" {
  project         = var.project_id
  location        = var.region
  name            = "prices-ingested-to-price-move"
  service_account = google_service_account.eventarc.email
  deletion_policy = "DELETE"

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.pubsub.topic.v1.messagePublished"
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.price_move_detector.name
      region  = google_cloud_run_v2_service.price_move_detector.location
    }
  }

  transport {
    pubsub {
      topic = google_pubsub_topic.prices_ingested.id
    }
  }
}
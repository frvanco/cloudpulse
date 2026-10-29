resource "google_logging_metric" "price_change_percent" {
  deletion_policy = "DELETE"
  description     = "Variation signee en pourcentage : 6 signifie +6 %, -6 signifie -6 %."
  disabled        = false
  filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.price_move_detector.name}\" AND (jsonPayload.event=\"price.move\" OR jsonPayload.event=\"price.checked\") AND jsonPayload.changePercent:*"
  name            = "price_change_percent"
  project         = var.project_id
  value_extractor = "EXTRACT(jsonPayload.changePercent)"
  bucket_options {
    explicit_buckets {
      bounds = [-100, -20, -10, -5, -2, -1, 0, 1, 2, 5, 10, 20, 100]
    }
  }
  metric_descriptor {
    metric_kind = "DELTA"
    unit        = "1"
    value_type  = "DISTRIBUTION"
  }
}

resource "google_monitoring_alert_policy" "price_move" {
  combiner              = "OR"
  deletion_policy       = "DELETE"
  display_name          = "CloudPulse — forte variation de prix"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  severity              = "WARNING"
  alert_strategy {
    auto_close           = "1800s"
    notification_prompts = []
    notification_rate_limit {
      period = "300s"
    }
  }
  conditions {
    display_name = "Événement price.move"
    condition_matched_log {
      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.price_move_detector.name}\" AND jsonPayload.event=\"price.move\""
      label_extractors = {
        change_percent = "EXTRACT(jsonPayload.changePercent)"
        symbol         = "EXTRACT(jsonPayload.symbol)"
      }
    }
  }
  documentation {
    content   = "## Mouvement de prix\n\n- Symbole : **$${log.extracted_label.symbol}**\n- Variation : **$${log.extracted_label.change_percent} %**\n\nOuvrir les logs de `price-move-detector`, retrouver l'événement `price.move`, puis vérifier ses prix et son `eventId`. Une livraison Pub/Sub peut être répétée : plusieurs logs peuvent correspondre au même événement métier."
    mime_type = "text/markdown"
    subject   = "CloudPulse — mouvement de prix détecté"
  }
}

resource "google_monitoring_alert_policy" "dlq_backlog" {
  combiner              = "OR"
  deletion_policy       = "DELETE"
  display_name          = "CloudPulse — messages en attente dans le rebut"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.email.name]
  project               = var.project_id
  severity              = "ERROR"
  alert_strategy {
    auto_close           = "1800s"
    notification_prompts = ["OPENED", "CLOSED"]
  }
  conditions {
    display_name = "Backlog DLQ supérieur à zéro"
    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "0s"
      filter          = "resource.type=\"pubsub_subscription\" AND resource.labels.subscription_id=\"${google_pubsub_subscription.prices_ingested_dlq_inspect.name}\" AND metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\""
      threshold_value = 0
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
      trigger {
        count = 1
      }
    }
  }
  documentation {
    content   = "## Diagnostic\n\n1. Inspecter les messages de `prices-ingested-dlq-inspect`, sans acquittement automatique pendant le diagnostic.\n2. Relever `CloudPubSubDeadLetterSourceSubscription` et `CloudPubSubDeadLetterSourceDeliveryCount`.\n3. Examiner le corps et les logs de `price-move-detector`. Si la source est `prices-ingested-bq`, examiner aussi la compatibilite avec la table BigQuery.\n4. Corriger la cause et conserver les informations utiles avant toute suppression.\n5. Apres traitement, acquitter les messages. Pour vider volontairement tout le backlog, utiliser un seek a l'instant present : cette operation abandonne les messages precedents de cet abonnement.\n\nLa resolution de l'incident peut prendre quelques minutes apres le retour du backlog a zero."
    mime_type = "text/markdown"
    subject   = "CloudPulse — message au rebut"
  }
}

locals {
  # Image existante utilisée uniquement pour la création initiale d'un service.
  # Les mises à jour d'image sont gérées par le pipeline.
  cloud_run_bootstrap_image = "${google_artifact_registry_repository.cloudpulse.registry_uri}/cloudpulse-api:f27859f"
}

resource "google_cloud_run_v2_service" "api" {
  project             = var.project_id
  location            = var.region
  name                = "cloudpulse-api"
  deletion_policy     = "DELETE"
  deletion_protection = true

  # Accès réseau autorisé ; authentification IAM obligatoire.
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = false

  scaling {
    max_instance_count = 3
  }

  template {
    service_account                  = google_service_account.api.email
    max_instance_request_concurrency = 80
    timeout                          = "300s"

    scaling {
      max_instance_count = 2
    }

    containers {
      # Image gérée par le pipeline, ignorée par Terraform après création.
      image = local.cloud_run_bootstrap_image

      env {
        name = "DATABASE_URL"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "1"
          }
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name = "TWELVE_DATA_API_KEY"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.twelve_data_api_key.secret_id
            version = "1"
          }
        }
      }

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        cpu_idle          = true
        startup_cpu_boost = true

        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      startup_probe {
        failure_threshold = 1
        period_seconds    = 240
        timeout_seconds   = 240

        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [google_sql_database_instance.cloudpulse.connection_name]
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
      traffic,

      # Nom de révision et traçabilité gérés par Cloud Deploy.
      template[0].revision,
      template[0].labels["delivery-pipeline-id"],
      template[0].labels["location"],
      template[0].labels["managed-by"],
      template[0].labels["project-id"],
      template[0].labels["release-id"],
      template[0].labels["target-id"],
    ]
  }
}

resource "google_cloud_run_v2_service" "ingest" {
  project             = var.project_id
  location            = var.region
  name                = "cloudpulse-ingest"
  deletion_policy     = "DELETE"
  deletion_protection = true

  # Authentification IAM obligatoire ; accès conservé pour le smoke test.
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = false

  scaling {
    max_instance_count = 2
  }

  template {
    service_account                  = google_service_account.ingest.email
    max_instance_request_concurrency = 80
    timeout                          = "300s"

    scaling {
      max_instance_count = 1
    }

    containers {
      # Image gérée par le pipeline, ignorée par Terraform après création.
      image = local.cloud_run_bootstrap_image

      env {
        name  = "APP_MODE"
        value = "ingest"
      }

      env {
        name  = "DATABASE_POOL_MAX"
        value = "2"
      }

      env {
        name = "DATABASE_URL"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "1"
          }
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "INGESTION_INVOKER_SA"
        value = google_service_account.ingest_invoker.email
      }

      env {
        name  = "INGESTION_QUEUE"
        value = google_cloud_tasks_queue.ingest_quotes.id
      }

      env {
        name  = "INGESTION_TARGET_URL"
        value = local.ingestion_service_url
      }

      env {
        name = "TWELVE_DATA_API_KEY"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.twelve_data_api_key.secret_id
            version = "1"
          }
        }
      }

      env {
        name  = "EVENTS_TOPIC"
        value = google_pubsub_topic.prices_ingested.id
      }

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        cpu_idle          = true
        startup_cpu_boost = true

        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      startup_probe {
        failure_threshold = 1
        period_seconds    = 240
        timeout_seconds   = 240

        tcp_socket {
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"

      cloud_sql_instance {
        instances = [google_sql_database_instance.cloudpulse.connection_name]
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
      traffic,
    ]
  }
}
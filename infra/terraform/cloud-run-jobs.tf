resource "google_cloud_run_v2_job" "migrate" {
  project             = var.project_id
  location            = var.region
  name                = "cloudpulse-migrate"
  deletion_policy     = "DELETE"
  deletion_protection = true

  template {
    parallelism = 1
    task_count  = 1

    template {
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      service_account       = google_service_account.migrate.email
      max_retries           = 0
      timeout               = "300s"

      containers {
        image = "europe-west9-docker.pkg.dev/${var.project_id}/cloudpulse/cloudpulse-migrate:f27859f"

        env {
          name = "DATABASE_URL"

          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url.secret_id
              version = "1"
            }
          }
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
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
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].template[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_v2_job" "watchdog" {
  project             = var.project_id
  location            = var.region
  name                = "cloudpulse-ingest-watchdog"
  deletion_policy     = "DELETE"
  deletion_protection = true

  template {
    parallelism = 1
    task_count  = 1

    template {
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      service_account       = google_service_account.watchdog.email
      max_retries           = 0
      timeout               = "120s"

      containers {
        image   = "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
        command = ["bash"]
        args = [
          "-c",
          file("${path.module}/scripts/check-ingestion-dispatch.sh"),
        ]

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
    ]
  }
}

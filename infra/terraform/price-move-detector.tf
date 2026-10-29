resource "google_cloud_run_v2_service" "price_move_detector" {
  project             = var.project_id
  location            = var.region
  name                = "price-move-detector"
  deletion_policy     = "DELETE"
  deletion_protection = true

  # Eventarc/Pub/Sub du même projet utilisent l’URL run.app interne.
  ingress              = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  invoker_iam_disabled = false

  scaling {
    max_instance_count = 2
  }

  template {
    service_account                  = google_service_account.price_move.email
    max_instance_request_concurrency = 80
    timeout                          = "300s"

    scaling {
      max_instance_count = 1
    }

    containers {
      # Image de bootstrap existante.
      # Les mises à jour sont gérées par le déploiement depuis les sources
      # et ignorées par Terraform.
      image = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/price-move-detector@sha256:9a944161739d35a747b77a6d0e63596b9e150ddb0c571d4dab79bd33eae8d96b"

      env {
        name  = "MOVE_THRESHOLD_PERCENT"
        value = "5"
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
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      build_config,
      template[0].containers[0].image,
      template[0].containers[0].base_image_uri,
      traffic,
    ]
  }
}

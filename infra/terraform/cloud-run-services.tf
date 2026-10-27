# __generated__ by Terraform
# Please review these resources and move them into your main configuration files.

# __generated__ by Terraform from "projects/cloudpulse-001/locations/europe-west9/services/cloudpulse-ingest"
resource "google_cloud_run_v2_service" "ingest" {

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].revision,
      template[0].containers[0].image,
      traffic,
    ]
  }

  annotations          = {}
  client               = "gcloud"
  client_version       = "589.0.0"
  custom_audiences     = []
  default_uri_disabled = false
  deletion_policy      = "DELETE"
  deletion_protection  = true
  description          = null
  iap_enabled          = false
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = false
  labels               = {}
  launch_stage         = "GA"
  location             = var.region
  name                 = "cloudpulse-ingest"
  project              = var.project_id
  ssh_enabled          = false
  tags                 = null
  scaling {
    manual_instance_count = 0
    max_instance_count    = 5
    min_instance_count    = 0
    scaling_mode          = null
  }
  template {
    annotations                      = {}
    encryption_key                   = null
    execution_environment            = null
    gpu_zonal_redundancy_disabled    = false
    health_check_disabled            = false
    labels                           = {}
    max_instance_request_concurrency = 80
    revision                         = "cloudpulse-ingest-00006-doh"
    service_account                  = google_service_account.ingest.email
    session_affinity                 = false
    timeout                          = "300s"
    containers {
      args             = []
      base_image_uri   = null
      command          = []
      depends_on       = []
      image            = "europe-west9-docker.pkg.dev/cloudpulse-001/cloudpulse/cloudpulse-api:f27859f"
      name             = null
      sandbox_launcher = false
      working_dir      = null
      env {
        name  = "APP_MODE"
        value = "ingest"
      }
      env {
        name  = "DATABASE_URL"
        value = null
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
        name  = "TWELVE_DATA_API_KEY"
        value = null
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
        cpu_idle = true
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        startup_cpu_boost = true
      }
      startup_probe {
        failure_threshold     = 1
        initial_delay_seconds = 0
        period_seconds        = 240
        timeout_seconds       = 240
        tcp_socket {
          port = 8080
        }
      }
      volume_mounts {
        mount_path = "/cloudsql"
        name       = "cloudsql"
        sub_path   = null
      }
    }
    scaling {
      concurrency_utilization = 0
      cpu_utilization         = 0
      max_instance_count      = 1
      min_instance_count      = 0
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.cloudpulse.connection_name]
      }
    }
  }
  traffic {
    percent  = 100
    revision = "cloudpulse-ingest-00006-doh"
    tag      = null
    type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
  }
  traffic {
    percent  = 0
    revision = "cloudpulse-ingest-00006-doh"
    tag      = "candidate"
    type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
  }
}

# __generated__ by Terraform from "projects/cloudpulse-001/locations/europe-west9/services/cloudpulse-api"
resource "google_cloud_run_v2_service" "api" {

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].revision,
      template[0].containers[0].image,
      traffic,
    ]
  }

  annotations          = {}
  client               = "gcloud"
  client_version       = "589.0.0"
  custom_audiences     = []
  default_uri_disabled = false
  deletion_policy      = "DELETE"
  deletion_protection  = true
  description          = null
  iap_enabled          = false
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = false
  labels               = {}
  launch_stage         = "GA"
  location             = var.region
  name                 = "cloudpulse-api"
  project              = var.project_id
  ssh_enabled          = false
  tags                 = null
  scaling {
    manual_instance_count = 0
    max_instance_count    = 3
    min_instance_count    = 0
    scaling_mode          = null
  }
  template {
    annotations                      = {}
    encryption_key                   = null
    execution_environment            = null
    gpu_zonal_redundancy_disabled    = false
    health_check_disabled            = false
    labels                           = {}
    max_instance_request_concurrency = 80
    revision                         = "cloudpulse-api-00031-fuv"
    service_account                  = google_service_account.api.email
    session_affinity                 = false
    timeout                          = "300s"
    containers {
      args             = []
      base_image_uri   = null
      command          = []
      depends_on       = []
      image            = "europe-west9-docker.pkg.dev/cloudpulse-001/cloudpulse/cloudpulse-api:f27859f"
      name             = null
      sandbox_launcher = false
      working_dir      = null
      env {
        name  = "DATABASE_URL"
        value = null
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
        name  = "TWELVE_DATA_API_KEY"
        value = null
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
        cpu_idle = true
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        startup_cpu_boost = true
      }
      startup_probe {
        failure_threshold     = 1
        initial_delay_seconds = 0
        period_seconds        = 240
        timeout_seconds       = 240
        tcp_socket {
          port = 8080
        }
      }
      volume_mounts {
        mount_path = "/cloudsql"
        name       = "cloudsql"
        sub_path   = null
      }
    }
    scaling {
      concurrency_utilization = 0
      cpu_utilization         = 0
      max_instance_count      = 2
      min_instance_count      = 0
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.cloudpulse.connection_name]
      }
    }
  }
  traffic {
    percent  = 100
    revision = "cloudpulse-api-00031-fuv"
    tag      = null
    type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
  }
  traffic {
    percent  = 0
    revision = "cloudpulse-api-00031-fuv"
    tag      = "candidate"
    type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
  }
}

resource "google_secret_manager_secret" "database_url" {
  project             = var.project_id
  secret_id           = "database-url"
  deletion_policy     = "DELETE"
  deletion_protection = false

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "twelve_data_api_key" {
  project             = var.project_id
  secret_id           = "twelve-data-api-key"
  deletion_policy     = "DELETE"
  deletion_protection = false

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

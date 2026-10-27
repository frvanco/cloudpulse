resource "google_sql_database_instance" "cloudpulse" {
  project          = var.project_id
  region           = var.region
  name             = "cloudpulse-db"
  database_version = "POSTGRES_17"

  deletion_policy                      = "DELETE"
  deletion_protection                  = true
  enforce_new_sql_network_architecture = true

  settings {
    tier                        = "db-f1-micro"
    edition                     = "ENTERPRISE"
    availability_type           = "ZONAL"
    activation_policy           = "ALWAYS"
    auto_upgrade_enabled        = false
    deletion_protection_enabled = true

    disk_type             = "PD_SSD"
    disk_size             = 10
    disk_autoresize       = true
    disk_autoresize_limit = 0

    connector_enforcement       = "REQUIRED"
    enable_dataplex_integration = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = false
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled   = true
      server_ca_mode = "GOOGLE_MANAGED_INTERNAL_CA"
      ssl_mode       = "ENCRYPTED_ONLY"
    }

    location_preference {
      zone = "europe-west9-b"
    }
  }

  lifecycle {
    prevent_destroy = true

    ignore_changes = [
      settings[0].activation_policy,
      settings[0].disk_size,
    ]
  }
}

resource "google_sql_database" "cloudpulse" {
  project         = var.project_id
  instance        = google_sql_database_instance.cloudpulse.name
  name            = "cloudpulse"
  charset         = "UTF8"
  collation       = "en_US.UTF8"
  deletion_policy = "DELETE"

  lifecycle {
    prevent_destroy = true
  }
}

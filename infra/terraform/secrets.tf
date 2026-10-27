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

# Valeur non sensible mais hors du dépôt : lue par les pipelines Terraform.
resource "google_secret_manager_secret" "terraform_approver_member" {
  project             = var.project_id
  secret_id           = "terraform-approver-member"
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

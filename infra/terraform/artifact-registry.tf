resource "google_artifact_registry_repository" "cloudpulse" {
  project       = var.project_id
  location      = var.region
  repository_id = "cloudpulse"
  description   = "CloudPulse Docker images"
  format        = "DOCKER"
  mode          = "STANDARD_REPOSITORY"

  deletion_policy        = "DELETE"
  cleanup_policy_dry_run = false

  docker_config {
    immutable_tags = true
  }

  cleanup_policies {
    id     = "keep-last-10"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-tagged-after-30-days"
    action = "DELETE"

    condition {
      tag_state  = "TAGGED"
      older_than = "2592000s"
    }
  }
}

# Vérification de la détection de dérive par la CI.

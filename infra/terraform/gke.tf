resource "google_container_cluster" "cloudpulse" {
  project             = var.project_id
  name                = "cloudpulse-autopilot"
  location            = var.region
  enable_autopilot    = true
  deletion_protection = true

  network    = "default"
  subnetwork = "default"

  ip_allocation_policy {}

  release_channel {
    channel = "REGULAR"
  }

  cluster_autoscaling {
    auto_provisioning_defaults {
      service_account = google_service_account.gke_nodes.email
    }
  }

  secret_manager_config {
    enabled = true
  }

  private_cluster_config {
    enable_private_nodes = false
  }
}

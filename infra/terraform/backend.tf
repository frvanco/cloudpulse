terraform {
  backend "gcs" {
    bucket = "cloudpulse-001-tfstate"
    prefix = "cloudpulse/prod"
  }
}

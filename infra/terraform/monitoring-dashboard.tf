resource "google_monitoring_dashboard" "cloudpulse" {
  project        = "595188864600"
  dashboard_json = file("${path.module}/dashboards/cloudpulse.json")
}
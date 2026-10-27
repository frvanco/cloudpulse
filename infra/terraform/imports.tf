# Secret et droits créés avec gcloud avant la PR (le plan en a besoin pour s'exécuter).
# À supprimer une fois l'apply réussi.
import {
  to = google_secret_manager_secret.terraform_approver_member
  id = "projects/cloudpulse-001/secrets/terraform-approver-member"
}

import {
  to = google_secret_manager_secret_iam_member.terraform_ci_approver_member["plan"]
  id = "projects/cloudpulse-001/secrets/terraform-approver-member roles/secretmanager.secretAccessor serviceAccount:tf-plan@cloudpulse-001.iam.gserviceaccount.com"
}

import {
  to = google_secret_manager_secret_iam_member.terraform_ci_approver_member["apply"]
  id = "projects/cloudpulse-001/secrets/terraform-approver-member roles/secretmanager.secretAccessor serviceAccount:tf-apply@cloudpulse-001.iam.gserviceaccount.com"
}

resource "google_cloudbuildv2_connection" "github" {
  project         = var.project_id
  location        = var.region
  name            = "cloudpulse-github"
  deletion_policy = "DELETE"

  github_config {
    app_installation_id = 169487372

    authorizer_credential {
      oauth_token_secret_version = "projects/cloudpulse-001/locations/europe-west9/secrets/cloudpulse-github-github-oauthtoken-7ee322/versions/latest"
    }
  }
}

resource "google_cloudbuildv2_repository" "cloudpulse" {
  project           = var.project_id
  location          = var.region
  name              = "cloudpulse"
  parent_connection = google_cloudbuildv2_connection.github.name
  remote_uri        = "https://github.com/frvanco/cloudpulse.git"
  deletion_policy   = "DELETE"
}

resource "google_cloudbuild_trigger" "main" {
  project         = var.project_id
  location        = var.region
  name            = "cloudpulse-api-main"
  filename        = "infra/terraform/pipelines/cloudbuild.yaml"
  service_account = google_service_account.build.name
  included_files  = ["apps/api/**", "infra/terraform/pipelines/cloudbuild.yaml"]
  deletion_policy = "DELETE"

  approval_config {
    approval_required = false
  }

  repository_event_config {
    repository = google_cloudbuildv2_repository.cloudpulse.id

    push {
      branch = "^main$"
    }
  }
}

resource "google_cloudbuild_trigger" "pr" {
  project         = var.project_id
  location        = var.region
  name            = "cloudpulse-api-pr"
  filename        = "infra/terraform/pipelines/cloudbuild-pr.yaml"
  service_account = google_service_account.pr.name
  deletion_policy = "DELETE"

  approval_config {
    approval_required = false
  }

  repository_event_config {
    repository = google_cloudbuildv2_repository.cloudpulse.id

    pull_request {
      branch          = "^main$"
      comment_control = "COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY"
    }
  }
}

resource "google_cloudbuild_trigger" "infra_plan" {
  project         = var.project_id
  location        = var.region
  name            = "infra-plan"
  filename        = "infra/terraform/pipelines/terraform-plan.yaml"
  service_account = google_service_account.tf_plan.name
  included_files  = ["infra/terraform/**"]
  deletion_policy = "DELETE"

  approval_config {
    approval_required = false
  }

  repository_event_config {
    repository = google_cloudbuildv2_repository.cloudpulse.id

    pull_request {
      branch          = "^main$"
      comment_control = "COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY"
    }
  }

  depends_on = [
    google_project_iam_member.tf_plan_read,
    google_project_iam_member.terraform_ci_logs,
    google_storage_bucket_iam_member.tf_plan_state_read,
    google_storage_bucket_iam_member.terraform_ci_sources_read,
    google_secret_manager_secret_iam_member.terraform_ci_approver_member,
  ]
}

resource "google_cloudbuild_trigger" "infra_apply" {
  project         = var.project_id
  location        = var.region
  name            = "infra-apply"
  filename        = "infra/terraform/pipelines/terraform-apply.yaml"
  service_account = google_service_account.tf_apply.name
  included_files  = ["infra/terraform/**"]
  deletion_policy = "DELETE"

  approval_config {
    approval_required = true
  }

  repository_event_config {
    repository = google_cloudbuildv2_repository.cloudpulse.id

    push {
      branch = "^main$"
    }
  }

  depends_on = [
    google_project_iam_member.tf_apply_manage,
    google_project_iam_member.tf_apply_secret_metadata,
    google_project_iam_member.terraform_ci_logs,
    google_service_account_iam_member.tf_apply_act_as,
    google_storage_bucket_iam_member.tf_apply_state_write,
    google_storage_bucket_iam_member.tf_apply_bucket_iam,
    google_storage_bucket_iam_member.terraform_ci_sources_read,
    google_project_iam_member.terraform_build_approver,
    google_secret_manager_secret_iam_member.terraform_ci_approver_member,
  ]
}
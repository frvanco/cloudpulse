variable "project_id" {
  description = "Identifiant du projet Google Cloud CloudPulse."
  type        = string
  default     = "cloudpulse-001"
}

variable "region" {
  description = "Région Google Cloud par défaut."
  type        = string
  default     = "europe-west9"
}

# Pas de valeur par défaut : l'identité de l'approbateur ne figure pas dans le dépôt.
# En CI, elle vient du secret terraform-approver-member (TF_VAR_approver_member).
variable "approver_member" {
  description = "Principal autorisé à approuver les builds, de préférence un groupe (group:...)."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^(user|group|serviceAccount):", var.approver_member))
    error_message = "Format attendu : user:..., group:... ou serviceAccount:..."
  }
}

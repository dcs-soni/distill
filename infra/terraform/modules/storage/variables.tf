# =============================================================================
# Storage Module — Variables
# =============================================================================

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "cors_allowed_origins" {
  description = "Allowed origins for S3 CORS (presigned URL uploads from SPA)"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

# =============================================================================
# Terraform Backend Configuration
# =============================================================================
# Remote state stored in S3 with DynamoDB locking for team collaboration.
# This file defines the backend configuration; environment-specific values
# are passed via -backend-config during `terraform init`.
# =============================================================================

terraform {
  required_version = ">= 1.7.0"

  backend "s3" {
    bucket         = "distill-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "distill-terraform-locks"

    # Enable state file versioning for rollback capability
    # Actual bucket versioning must be enabled on the S3 bucket
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.40"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# =============================================================================
# Networking Module — Variables
# =============================================================================

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones (minimum 2 for HA)"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ, for load balancers)"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per AZ, for services + databases)"
  type        = list(string)
}

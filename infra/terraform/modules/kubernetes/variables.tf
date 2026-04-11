# =============================================================================
# Kubernetes Module — Variables
# =============================================================================

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.30"
}

variable "vpc_id" {
  description = "VPC ID from the networking module"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for node groups (from networking module)"
  type        = list(string)
}

variable "service_sg_id" {
  description = "Security group ID for services (from networking module)"
  type        = string
}

# Node Group: General
variable "general_instance_type" {
  description = "EC2 instance type for general node group"
  type        = string
  default     = "t3.large"
}

variable "general_node_min" {
  description = "Minimum number of general nodes"
  type        = number
  default     = 2
}

variable "general_node_max" {
  description = "Maximum number of general nodes"
  type        = number
  default     = 5
}

variable "general_node_desired" {
  description = "Desired number of general nodes"
  type        = number
  default     = 2
}

# Node Group: Extraction (AI workers)
variable "extraction_instance_type" {
  description = "EC2 instance type for extraction node group"
  type        = string
  default     = "t3.xlarge"
}

variable "extraction_node_min" {
  description = "Minimum number of extraction nodes"
  type        = number
  default     = 2
}

variable "extraction_node_max" {
  description = "Maximum number of extraction nodes"
  type        = number
  default     = 10
}

variable "extraction_node_desired" {
  description = "Desired number of extraction nodes"
  type        = number
  default     = 2
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the EKS API server public endpoint"
  type        = list(string)
  default     = []
}

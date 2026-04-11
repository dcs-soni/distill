# =============================================================================
# Distill — Dev Environment Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "distill"
}

# -----------------------------------------------------------------------------
# Networking
# -----------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use (minimum 2)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# -----------------------------------------------------------------------------
# Kubernetes (EKS)
# -----------------------------------------------------------------------------
variable "cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.30"
}

variable "general_node_min" {
  description = "Minimum number of nodes in the general node group"
  type        = number
  default     = 2
}

variable "general_node_max" {
  description = "Maximum number of nodes in the general node group"
  type        = number
  default     = 5
}

variable "general_node_desired" {
  description = "Desired number of nodes in the general node group"
  type        = number
  default     = 2
}

variable "general_instance_type" {
  description = "EC2 instance type for general node group"
  type        = string
  default     = "t3.large"
}

variable "extraction_node_min" {
  description = "Minimum number of nodes in the extraction node group"
  type        = number
  default     = 2
}

variable "extraction_node_max" {
  description = "Maximum number of nodes in the extraction node group"
  type        = number
  default     = 10
}

variable "extraction_node_desired" {
  description = "Desired number of nodes in the extraction node group"
  type        = number
  default     = 2
}

variable "extraction_instance_type" {
  description = "EC2 instance type for extraction (AI) node group"
  type        = string
  default     = "t3.xlarge"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the EKS API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict in production
}

# -----------------------------------------------------------------------------
# Database (RDS)
# -----------------------------------------------------------------------------
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS (recommended for prod)"
  type        = bool
  default     = false
}

variable "db_backup_retention" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "databases" {
  description = "Map of database names and configurations"
  type = map(object({
    name     = string
    username = string
  }))
  default = {
    auth = {
      name     = "auth_db"
      username = "distill_auth"
    }
    document = {
      name     = "document_db"
      username = "distill_document"
    }
    extraction = {
      name     = "extraction_db"
      username = "distill_extraction"
    }
    review = {
      name     = "review_db"
      username = "distill_review"
    }
    analytics = {
      name     = "analytics_db"
      username = "distill_analytics"
    }
  }
}

# -----------------------------------------------------------------------------
# Storage (S3)
# -----------------------------------------------------------------------------
variable "cors_allowed_origins" {
  description = "Allowed origins for S3 CORS configuration"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

# -----------------------------------------------------------------------------
# Redis (ElastiCache)
# -----------------------------------------------------------------------------
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.small"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 1
}

# -----------------------------------------------------------------------------
# RabbitMQ (Amazon MQ)
# -----------------------------------------------------------------------------
variable "rabbitmq_instance_type" {
  description = "Amazon MQ broker instance type"
  type        = string
  default     = "mq.t3.micro"
}

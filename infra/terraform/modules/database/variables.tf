# =============================================================================
# Database Module — Variables
# =============================================================================

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID from networking module"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for DB placement"
  type        = list(string)
}

variable "database_sg_id" {
  description = "Security group ID for databases"
  type        = string
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "databases" {
  description = "Map of database configurations"
  type = map(object({
    name     = string
    username = string
  }))
}

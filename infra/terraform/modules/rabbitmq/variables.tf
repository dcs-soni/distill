# =============================================================================
# RabbitMQ Module — Variables
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
  description = "Private subnet IDs for broker placement"
  type        = list(string)
}

variable "rabbitmq_sg_id" {
  description = "Security group ID for RabbitMQ"
  type        = string
}

variable "instance_type" {
  description = "Amazon MQ broker instance type"
  type        = string
  default     = "mq.t3.micro"
}

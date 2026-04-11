# =============================================================================
# Distill — Dev Environment Outputs
# =============================================================================

# Networking
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

# Kubernetes
output "cluster_name" {
  description = "EKS cluster name"
  value       = module.kubernetes.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.kubernetes.cluster_endpoint
  sensitive   = true
}

output "kubeconfig_command" {
  description = "AWS CLI command to configure kubectl"
  value       = module.kubernetes.kubeconfig_command
}

# Database
output "db_endpoints" {
  description = "Database endpoints per service"
  value       = module.database.db_endpoints
}

output "db_secret_arns" {
  description = "Secrets Manager ARNs for database credentials"
  value       = module.database.db_secret_arns
}

# Storage
output "documents_bucket" {
  description = "S3 bucket name for documents"
  value       = module.storage.documents_bucket_name
}

# Redis
output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.redis_endpoint
}

# RabbitMQ
output "rabbitmq_endpoint" {
  description = "RabbitMQ endpoint"
  value       = module.rabbitmq.rabbitmq_endpoint
  sensitive   = true
}

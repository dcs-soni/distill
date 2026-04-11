# =============================================================================
# Networking Module — Outputs
# =============================================================================
# Exposes VPC, subnet, and security group IDs for downstream modules.
# =============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (for load balancers)"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (for services + databases)"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ip" {
  description = "Public IP of the NAT Gateway (for allowlisting)"
  value       = aws_eip.nat.public_ip
}

output "service_sg_id" {
  description = "Security group ID for microservices"
  value       = aws_security_group.services.id
}

output "database_sg_id" {
  description = "Security group ID for databases (ingress from services only)"
  value       = aws_security_group.databases.id
}

output "rabbitmq_sg_id" {
  description = "Security group ID for RabbitMQ (ingress from services only)"
  value       = aws_security_group.rabbitmq.id
}

output "redis_sg_id" {
  description = "Security group ID for Redis (ingress from services only)"
  value       = aws_security_group.redis.id
}

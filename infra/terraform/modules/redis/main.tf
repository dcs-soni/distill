# =============================================================================
# Distill — Redis Module (ElastiCache)
# =============================================================================
# ElastiCache Redis for session caching, OIDC state, and rate limiting.
# Encryption in transit + at rest. AUTH required.
# =============================================================================

# -----------------------------------------------------------------------------
# Redis Subnet Group — private subnets only
# -----------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-redis-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet"
  }
}

# -----------------------------------------------------------------------------
# Random auth token for Redis
# -----------------------------------------------------------------------------
resource "random_password" "redis_auth" {
  length           = 64
  special          = false # Redis AUTH tokens don't support all special chars
}

# -----------------------------------------------------------------------------
# Custom Parameter Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis7-params"
  }
}

# -----------------------------------------------------------------------------
# ElastiCache Redis Cluster
# -----------------------------------------------------------------------------
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description          = "Distill Redis cluster for sessions, caching, and rate limiting"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_clusters   = var.num_cache_nodes
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [var.redis_sg_id]

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  # Maintenance
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_window          = "03:00-04:00"
  snapshot_retention_limit = 7
  auto_minor_version_upgrade = true

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for Redis Slow Logs
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/distill/${var.environment}/redis/slow-log"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  }
}

# -----------------------------------------------------------------------------
# Store Redis auth token in Secrets Manager
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "redis_auth" {
  name = "${var.project_name}/${var.environment}/redis/auth"

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-auth"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
    endpoint   = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
    url        = "rediss://:${random_password.redis_auth.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  })
}

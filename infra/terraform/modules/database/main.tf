# =============================================================================
# Distill — Database Module (RDS PostgreSQL 16)
# =============================================================================
# Creates RDS PostgreSQL instances for each service with:
#   - Multi-AZ support (prod) / single-AZ (dev)
#   - Automated backups with configurable retention
#   - Encryption at rest via KMS
#   - Force SSL connections
#   - No public accessibility (private subnets only)
# =============================================================================

# -----------------------------------------------------------------------------
# Random password generation for each database
# -----------------------------------------------------------------------------
resource "random_password" "db_passwords" {
  for_each = var.databases

  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+"
}

# -----------------------------------------------------------------------------
# DB Subnet Group — places RDS instances in private subnets
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# -----------------------------------------------------------------------------
# KMS Key for RDS Encryption at Rest
# -----------------------------------------------------------------------------
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption at rest"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-kms"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}-${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# -----------------------------------------------------------------------------
# Custom Parameter Group — optimized PostgreSQL settings + force SSL
# -----------------------------------------------------------------------------
resource "aws_db_parameter_group" "postgres16" {
  name   = "${var.project_name}-${var.environment}-postgres16"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking > 1s
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres16-params"
  }
}

# -----------------------------------------------------------------------------
# RDS PostgreSQL Instances — one per service
# -----------------------------------------------------------------------------
resource "aws_db_instance" "main" {
  for_each = var.databases

  identifier = "${var.project_name}-${var.environment}-${each.key}"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  db_name  = each.value.name
  username = each.value.username
  password = random_password.db_passwords[each.key].result

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  # Networking — private subnets only, no public access
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.database_sg_id]
  publicly_accessible    = false
  port                   = 5432

  # High Availability
  multi_az = var.multi_az

  # Backups
  backup_retention_period = var.backup_retention
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Configuration
  parameter_group_name = aws_db_parameter_group.postgres16.name

  # Protection
  deletion_protection       = var.environment == "prod" ? true : false
  skip_final_snapshot       = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment != "dev" ? "${var.project_name}-${var.environment}-${each.key}-final" : null

  # Monitoring
  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  tags = {
    Name    = "${var.project_name}-${var.environment}-${each.key}"
    Service = each.key
  }
}

# -----------------------------------------------------------------------------
# IAM Role for Enhanced Monitoring
# -----------------------------------------------------------------------------
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring.name
}

# -----------------------------------------------------------------------------
# Store passwords in AWS Secrets Manager
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "db_passwords" {
  for_each = var.databases

  name = "${var.project_name}/${var.environment}/db/${each.key}"

  tags = {
    Name    = "${var.project_name}-${var.environment}-${each.key}-db-secret"
    Service = each.key
  }
}

resource "aws_secretsmanager_secret_version" "db_passwords" {
  for_each = var.databases

  secret_id = aws_secretsmanager_secret.db_passwords[each.key].id
  secret_string = jsonencode({
    username = each.value.username
    password = random_password.db_passwords[each.key].result
    host     = aws_db_instance.main[each.key].address
    port     = aws_db_instance.main[each.key].port
    dbname   = each.value.name
    url      = "postgresql://${each.value.username}:${random_password.db_passwords[each.key].result}@${aws_db_instance.main[each.key].address}:${aws_db_instance.main[each.key].port}/${each.value.name}?sslmode=require"
  })
}

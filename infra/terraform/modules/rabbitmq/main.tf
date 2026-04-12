# =============================================================================
# Distill — RabbitMQ Module (Amazon MQ)
# =============================================================================
# Amazon MQ broker with RabbitMQ engine for event-driven messaging.
# Deployed in private subnets with encryption in transit + at rest.
# =============================================================================

# -----------------------------------------------------------------------------
# Random password for RabbitMQ admin user
# -----------------------------------------------------------------------------
resource "random_password" "rabbitmq_admin" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+"
}

# -----------------------------------------------------------------------------
# Amazon MQ Broker (RabbitMQ)
# -----------------------------------------------------------------------------
resource "aws_mq_broker" "main" {
  broker_name = "${var.project_name}-${var.environment}-rabbitmq"

  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = var.instance_type
  deployment_mode    = var.environment == "prod" ? "CLUSTER_MULTI_AZ" : "SINGLE_INSTANCE"

  # Networking — private subnets only
  subnet_ids         = var.environment == "prod" ? var.private_subnet_ids : [var.private_subnet_ids[0]]
  security_groups    = [var.rabbitmq_sg_id]
  publicly_accessible = false

  # Authentication
  user {
    username = "admin"
    password = random_password.rabbitmq_admin.result
  }

  # Encryption
  encryption_options {
    use_aws_owned_key = true
  }

  # Maintenance
  maintenance_window_start_time {
    day_of_week = "SUNDAY"
    time_of_day = "04:00"
    time_zone   = "UTC"
  }

  # Logging
  logs {
    general = true
  }

  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-${var.environment}-rabbitmq"
  }
}

# -----------------------------------------------------------------------------
# Store RabbitMQ credentials in Secrets Manager
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "rabbitmq_admin" {
  name = "${var.project_name}/${var.environment}/rabbitmq/admin"

  tags = {
    Name = "${var.project_name}-${var.environment}-rabbitmq-admin"
  }
}

resource "aws_secretsmanager_secret_version" "rabbitmq_admin" {
  secret_id = aws_secretsmanager_secret.rabbitmq_admin.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.rabbitmq_admin.result
    endpoint = aws_mq_broker.main.instances[0].endpoints[0]
    url      = "amqps://admin:${random_password.rabbitmq_admin.result}@${replace(aws_mq_broker.main.instances[0].endpoints[0], "amqps://", "")}"
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms for RabbitMQ
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "rabbitmq_queue_depth" {
  alarm_name          = "${var.project_name}-${var.environment}-rabbitmq-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MessageCount"
  namespace           = "AWS/AmazonMQ"
  period              = 300
  statistic           = "Average"
  threshold           = 10000
  alarm_description   = "RabbitMQ queue depth exceeds 10,000 messages"

  dimensions = {
    Broker = aws_mq_broker.main.broker_name
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rabbitmq-queue-alarm"
  }
}

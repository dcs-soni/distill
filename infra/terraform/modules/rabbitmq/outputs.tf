# =============================================================================
# RabbitMQ Module — Outputs
# =============================================================================

output "rabbitmq_endpoint" {
  description = "RabbitMQ AMQPS endpoint"
  value       = aws_mq_broker.main.instances[0].endpoints[0]
}

output "rabbitmq_console_url" {
  description = "RabbitMQ Management Console URL"
  value       = aws_mq_broker.main.instances[0].console_url
}

output "rabbitmq_secret_arn" {
  description = "ARN of the Secrets Manager secret containing RabbitMQ credentials"
  value       = aws_secretsmanager_secret.rabbitmq_admin.arn
}

output "rabbitmq_broker_id" {
  description = "Amazon MQ broker ID"
  value       = aws_mq_broker.main.id
}

# =============================================================================
# Database Module — Outputs
# =============================================================================

output "db_endpoints" {
  description = "Map of database service names to their endpoints"
  value = {
    for key, db in aws_db_instance.main : key => {
      address = db.address
      port    = db.port
      name    = db.db_name
    }
  }
}

output "db_secret_arns" {
  description = "Map of database service names to their Secrets Manager ARNs"
  value = {
    for key, secret in aws_secretsmanager_secret.db_passwords : key => secret.arn
  }
}

output "db_instance_ids" {
  description = "Map of database service names to their RDS instance IDs"
  value = {
    for key, db in aws_db_instance.main : key => db.id
  }
}

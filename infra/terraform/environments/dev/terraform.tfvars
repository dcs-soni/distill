# =============================================================================
# Distill — Dev Environment Values
# =============================================================================
# These are dev-specific overrides. Defaults in variables.tf apply otherwise.
# =============================================================================

environment  = "dev"
project_name = "distill"
aws_region   = "us-east-1"

# Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

# Kubernetes — smaller for dev
cluster_version          = "1.30"
general_node_min         = 2
general_node_max         = 5
general_node_desired     = 2
general_instance_type    = "t3.large"
extraction_node_min      = 2
extraction_node_max      = 10
extraction_node_desired  = 2
extraction_instance_type = "t3.xlarge"
allowed_cidr_blocks      = ["0.0.0.0/0"] # Restrict in staging/prod

# Database — single-AZ for dev
db_instance_class  = "db.t3.medium"
db_multi_az        = false
db_backup_retention = 7

# S3 CORS
cors_allowed_origins = ["http://localhost:5173"]

# Redis — minimal for dev
redis_node_type       = "cache.t3.small"
redis_num_cache_nodes = 1

# RabbitMQ — small for dev
rabbitmq_instance_type = "mq.t3.micro"

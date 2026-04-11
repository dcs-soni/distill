# =============================================================================
# Distill — Dev Environment
# =============================================================================
# Entry point for the dev environment. Composes all infrastructure modules.
# =============================================================================

terraform {
  required_version = ">= 1.7.0"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "distill"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Networking Module — VPC, Subnets, NAT, Security Groups
# -----------------------------------------------------------------------------
module "networking" {
  source = "../../modules/networking"

  environment         = var.environment
  project_name        = var.project_name
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# -----------------------------------------------------------------------------
# Kubernetes Module — EKS Cluster + Node Groups
# -----------------------------------------------------------------------------
module "kubernetes" {
  source = "../../modules/kubernetes"

  environment        = var.environment
  project_name       = var.project_name
  cluster_version    = var.cluster_version
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  service_sg_id      = module.networking.service_sg_id

  general_node_min     = var.general_node_min
  general_node_max     = var.general_node_max
  general_node_desired = var.general_node_desired
  general_instance_type = var.general_instance_type

  extraction_node_min     = var.extraction_node_min
  extraction_node_max     = var.extraction_node_max
  extraction_node_desired = var.extraction_node_desired
  extraction_instance_type = var.extraction_instance_type

  allowed_cidr_blocks = var.allowed_cidr_blocks
}

# -----------------------------------------------------------------------------
# Database Module — RDS PostgreSQL Instances
# -----------------------------------------------------------------------------
module "database" {
  source = "../../modules/database"

  environment        = var.environment
  project_name       = var.project_name
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  database_sg_id     = module.networking.database_sg_id

  db_instance_class = var.db_instance_class
  multi_az          = var.db_multi_az
  backup_retention  = var.db_backup_retention

  databases = var.databases
}

# -----------------------------------------------------------------------------
# Storage Module — S3 Buckets
# -----------------------------------------------------------------------------
module "storage" {
  source = "../../modules/storage"

  environment  = var.environment
  project_name = var.project_name

  cors_allowed_origins = var.cors_allowed_origins
}

# -----------------------------------------------------------------------------
# Redis Module — ElastiCache
# -----------------------------------------------------------------------------
module "redis" {
  source = "../../modules/redis"

  environment        = var.environment
  project_name       = var.project_name
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  redis_sg_id        = module.networking.redis_sg_id

  node_type       = var.redis_node_type
  num_cache_nodes = var.redis_num_cache_nodes
}

# -----------------------------------------------------------------------------
# RabbitMQ Module — Amazon MQ
# -----------------------------------------------------------------------------
module "rabbitmq" {
  source = "../../modules/rabbitmq"

  environment        = var.environment
  project_name       = var.project_name
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  rabbitmq_sg_id     = module.networking.rabbitmq_sg_id

  instance_type = var.rabbitmq_instance_type
}

#!/bin/bash

# rotate-secrets.sh
# Safely rotates secrets in Kubernetes (and outputs updated .env variables for local dev)

set -e

ENV=${1:-dev}

if [ "$ENV" == "prod" ]; then
  echo "Rotating Production Secrets is a manual operation via AWS Secrets Manager."
  echo "Please check docs/security.md for the runbook."
  exit 1
fi

echo "Rotating arbitrary secrets for $ENV environment..."

# Generate new secrets
NEW_JWT_KEY=$(openssl rand -base64 32)
NEW_RABBITMQ_PASS=$(openssl rand -hex 16)
NEW_REDIS_PASS=$(openssl rand -hex 16)

echo "Updating Kubernetes Secrets for namespace: distill-$ENV"

# Assuming you've set up kubectl context properly
# Generate patch payload or replace secret via dry-run
kubectl create secret generic distill-secrets \
  --from-literal=JWT_SECRET="$NEW_JWT_KEY" \
  --from-literal=RABBITMQ_PASSWORD="$NEW_RABBITMQ_PASS" \
  --from-literal=REDIS_PASSWORD="$NEW_REDIS_PASS" \
  --dry-run=client -o yaml | kubectl apply -n "distill-$ENV" -f -

# Restart dependent deployments to pick up new secrets
kubectl rollout restart deployment/auth-service -n "distill-$ENV"
kubectl rollout restart deployment/gateway -n "distill-$ENV"
# Additional deployments would go here...

echo "Secrets rotated successfully!"
echo "If you need to update local '.env' manually, use these values:"
echo "JWT_SECRET=$NEW_JWT_KEY"
echo "RABBITMQ_PASSWORD=$NEW_RABBITMQ_PASS"
echo "REDIS_PASSWORD=$NEW_REDIS_PASS"

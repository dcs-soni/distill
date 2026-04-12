#!/bin/bash

# Ensure script halts on any error
set -e

SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: ./scripts/scaffold-service.sh <service-name>"
  exit 1
fi

SERVICE_PATH="services/$SERVICE_NAME"

if [ -d "$SERVICE_PATH" ]; then
  echo "Service $SERVICE_NAME already exists!"
  exit 1
fi

echo "Scaffolding service $SERVICE_NAME at $SERVICE_PATH..."

mkdir -p "$SERVICE_PATH/src/domain/entities"
mkdir -p "$SERVICE_PATH/src/domain/value-objects"
mkdir -p "$SERVICE_PATH/src/domain/events"
mkdir -p "$SERVICE_PATH/src/application/ports"
mkdir -p "$SERVICE_PATH/src/application/use-cases"
mkdir -p "$SERVICE_PATH/src/application/dto"
mkdir -p "$SERVICE_PATH/src/infrastructure/persistence/prisma"
mkdir -p "$SERVICE_PATH/src/infrastructure/messaging"
mkdir -p "$SERVICE_PATH/src/infrastructure/web/routes"
mkdir -p "$SERVICE_PATH/src/infrastructure/web/controllers"
mkdir -p "$SERVICE_PATH/tests/unit"
mkdir -p "$SERVICE_PATH/tests/integration"

# Generate READMEs for Hexagonal architecture guidance
cat << 'EOF' > "$SERVICE_PATH/src/domain/entities/README.md"
# Entities
Contains Aggregate Roots and Entities. Entities are pure TypeScript classes with NO external dependencies (no DB, no libraries).
EOF

cat << 'EOF' > "$SERVICE_PATH/src/domain/value-objects/README.md"
# Value Objects
Contains Value Objects. They are immutable and identifiable only by their values.
EOF

cat << 'EOF' > "$SERVICE_PATH/src/domain/events/README.md"
# Domain Events
Events that indicate something important happened in the domain.
EOF

cat << 'EOF' > "$SERVICE_PATH/src/application/ports/README.md"
# Ports (Outbound Interfaces)
Abstract interfaces for anything the application needs from the outside world (e.g. Repositories, Third-Party APIs, Message Brokers).
EOF

cat << 'EOF' > "$SERVICE_PATH/src/application/use-cases/README.md"
# Use Cases
Application logic. Orchestrates domain objects to fulfill a specific use-case.
EOF

cat << 'EOF' > "$SERVICE_PATH/src/infrastructure/messaging/README.md"
# Messaging Adapters
RabbitMQ publishers and consumers.
EOF

# Generate package.json
cat << EOF > "$SERVICE_PATH/package.json"
{
  "name": "@distill/${SERVICE_NAME}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/bootstrap.ts",
    "build": "tsc",
    "start": "node dist/bootstrap.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@distill/types": "*",
    "@distill/utils": "*",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@prisma/client": "^5.12.1",
    "fastify": "^4.26.2",
    "amqplib": "^0.10.3",
    "pino": "^8.20.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "@types/amqplib": "^0.10.5",
    "prisma": "^5.12.1",
    "tsx": "^4.7.2",
    "typescript": "^5.4.5",
    "vitest": "^1.5.0"
  }
}
EOF

# Generate tsconfig.json
cat << 'EOF' > "$SERVICE_PATH/tsconfig.json"
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# Generate Prisma setup
cat << 'EOF' > "$SERVICE_PATH/src/infrastructure/persistence/prisma/schema.prisma"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
EOF

# Generate bootstrap.ts
cat << 'EOF' > "$SERVICE_PATH/src/bootstrap.ts"
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from '@distill/utils/src/logger.js';

const server = Fastify({
  logger: false, // We use custom Pino logic instead
});

server.register(cors);
server.register(helmet);

server.get('/health', async (_, reply) => {
  return reply.send({ status: 'ok' });
});

server.get('/ready', async (_, reply) => {
  return reply.send({ status: 'ready' });
});

server.get('/metrics', async (_, reply) => {
  return reply.send('# HELP placeholder metrics output\\n# TYPE placeholder counter\\n');
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await server.listen({ port, host: '0.0.0.0' });
    logger.info({ service: process.env.SERVICE_NAME || 'unknown' }, \`Server listening on port \${port}\`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(\`Received \${signal}. Shutting down gracefully...\`);
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(reason as Error, 'Unhandled Rejection');
  process.exit(1);
});

start();
EOF

# Generate Dockerfile
cat << 'EOF' > "$SERVICE_PATH/Dockerfile"
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/SERVICE_NAME/package.json ./services/SERVICE_NAME/
COPY shared/types ./shared/types
COPY shared/utils ./shared/utils

RUN npm ci

COPY services/SERVICE_NAME ./services/SERVICE_NAME
RUN npm run build --workspace=services/SERVICE_NAME

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: non-root user
USER node

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/types /app/shared/types
COPY --from=builder /app/shared/utils /app/shared/utils
COPY --from=builder /app/services/SERVICE_NAME/dist ./services/SERVICE_NAME/dist
COPY --from=builder /app/services/SERVICE_NAME/package.json ./services/SERVICE_NAME/

EXPOSE 3000

CMD ["node", "services/SERVICE_NAME/dist/bootstrap.js"]
EOF
sed -i "s/SERVICE_NAME/$SERVICE_NAME/g" "$SERVICE_PATH/Dockerfile"

# Generate .env.example
cat << 'EOF' > "$SERVICE_PATH/.env.example"
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
SERVICE_NAME="SERVICE_NAME"
EOF
sed -i "s/SERVICE_NAME/$SERVICE_NAME/g" "$SERVICE_PATH/.env.example"

# Tests setup
cat << 'EOF' > "$SERVICE_PATH/tests/unit/setup.ts"
// Setup file for unit tests
EOF

cat << 'EOF' > "$SERVICE_PATH/tests/integration/setup.ts"
// Setup file for integration tests
EOF

echo "Done! Service scaffolded. Run 'npm install' at the root to install deps."

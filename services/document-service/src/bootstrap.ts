import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { AppError, logger } from '@distill/utils';

import { PrismaDocumentRepository } from './infrastructure/persistence/PrismaDocumentRepository.js';
import { S3StorageAdapter } from './infrastructure/storage/S3StorageAdapter.js';
import { PrismaBatchRepository } from './infrastructure/persistence/PrismaBatchRepository.js';
import { RabbitMQPublisher } from './infrastructure/messaging/RabbitMQPublisher.js';
import { OutboxRelay } from './infrastructure/messaging/OutboxRelay.js';
import { UploadDocument } from './application/use-cases/UploadDocument.js';
import { UploadBatch } from './application/use-cases/UploadBatch.js';
import {
  ListDocuments,
  GetDocument,
  DeleteDocument,
} from './application/use-cases/QueryDocuments.js';
import { DocumentController } from './infrastructure/web/controllers/DocumentController.js';
import { documentRoutes } from './infrastructure/web/routes/document.routes.js';
import { prisma } from './infrastructure/persistence/prismaClient.js';
import type { EventPublisher } from './application/ports/EventPublisher.port.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const server = Fastify({
  logger: false,
  bodyLimit: MAX_FILE_SIZE + 1024,
});

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

void server.register(cors);
void server.register(helmet);
void server.register(multipart, {
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 100,
  },
});

const documentRepo = new PrismaDocumentRepository();
const batchRepo = new PrismaBatchRepository();
const storage = new S3StorageAdapter({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  bucket: process.env.S3_BUCKET || 'distill-documents',
  forcePathStyle: true,
});

let publisher: RabbitMQPublisher | null = null;
let outboxRelay: OutboxRelay | null = null;

/**
 * Lazy publisher proxy that delegates to the real RabbitMQ publisher when
 * available. In development without RABBITMQ_URL, publish() throws so the
 * caller's catch block fires and the outbox record stays PENDING (which is
 * the correct behavior for the transactional outbox pattern).
 */
const lazyPublisher: EventPublisher = {
  publish: async (exchange, routingKey, event) => {
    if (!publisher) {
      throw new Error('Event publisher is not available — outbox relay will handle delivery');
    }
    return publisher.publish(exchange, routingKey, event);
  },
  connect: async () => {},
  close: async () => {},
};

const uploadDocument = new UploadDocument(documentRepo, storage, lazyPublisher);
const uploadBatch = new UploadBatch(documentRepo, batchRepo, storage, lazyPublisher);
const listDocuments = new ListDocuments(documentRepo);
const getDocument = new GetDocument(documentRepo, storage);
const deleteDocument = new DeleteDocument(documentRepo, storage);

const controller = new DocumentController(
  uploadDocument,
  uploadBatch,
  listDocuments,
  getDocument,
  deleteDocument
);

void server.register(documentRoutes(controller), { prefix: '/documents' });

server.setErrorHandler((error: FastifyError & { statusCode?: number }, _request, reply) => {
  if (error.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.validation,
    });
  }

  if (error instanceof AppError) {
    const response: { error: string; message: string; details?: unknown } = {
      error: error.code,
      message: error.message,
    };
    if (process.env.NODE_ENV !== 'production' && error.details !== undefined) {
      response.details = error.details;
    }
    return reply.status(error.statusCode).send(response);
  }

  logger.error(error, 'Unhandled request error');
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
});

server.get('/health', async (_, reply) => {
  return reply.send({ status: 'ok' });
});

server.get('/ready', async (_, reply) => {
  return reply.send({ status: 'ready' });
});

server.get('/metrics', async (_, reply) => {
  return reply.send('# HELP placeholder metrics output\n# TYPE placeholder counter\n');
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

    if (process.env.RABBITMQ_URL) {
      publisher = new RabbitMQPublisher(process.env.RABBITMQ_URL);
      await publisher.connect();

      // Start the transactional outbox relay to pick up PENDING events.
      // The relay guarantees at-least-once delivery even when inline publish fails.
      outboxRelay = new OutboxRelay(prisma, publisher);
      outboxRelay.start();
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('RABBITMQ_URL is required in production');
      }
      logger.warn(
        'RABBITMQ_URL not set, event publishing disabled — outbox events will accumulate'
      );
    }

    await server.listen({ port, host: '0.0.0.0' });
    logger.info(
      { service: process.env.SERVICE_NAME || 'document-service' },
      `Server listening on port ${port}`
    );
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Stop the outbox relay first to prevent new publishes during shutdown
  if (outboxRelay) {
    outboxRelay.stop();
  }

  await server.close();

  if (publisher) {
    await publisher.close();
  }

  // Disconnect Prisma to release the PostgreSQL connection pool
  await prisma.$disconnect();

  process.exit(0);
};

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(reason, 'Unhandled Rejection');
  process.exit(1);
});

void start();

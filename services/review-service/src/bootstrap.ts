import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { logger, AppError } from '@distill/utils';

import { PrismaReviewRepository } from './infrastructure/persistence/PrismaReviewRepository.js';
import { RabbitMQPublisher } from './infrastructure/messaging/RabbitMQPublisher.js';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer.js';
import { GetPendingReviews } from './application/use-cases/GetPendingReviews.js';
import { GetReviewDetail } from './application/use-cases/GetReviewDetail.js';
import { SubmitReview } from './application/use-cases/SubmitReview.js';
import { GetReviewerStats } from './application/use-cases/GetReviewerStats.js';
import { ReviewController } from './infrastructure/web/controllers/ReviewController.js';
import { reviewRoutes } from './infrastructure/web/routes/review.routes.js';

const server = Fastify({
  logger: false, // We use custom Pino logic instead
});

void server.register(cors);
void server.register(helmet);

// @ts-expect-error Type mismatch between fastify and fastify-type-provider-zod versions
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Health check
server.get('/health', async (_, reply) => {
  return reply.send({ status: 'ok' });
});

server.get('/ready', async (_, reply) => {
  return reply.send({ status: 'ready' });
});

server.get('/metrics', async (_, reply) => {
  return reply.send('# HELP placeholder metrics output\n# TYPE placeholder counter\n');
});

// Error handler
server.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    logger.warn({ err: error, url: request.url }, 'AppError occurred');
    const statusCode =
      {
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
        EXTERNAL_SERVICE_ERROR: 502,
        INTERNAL_ERROR: 500,
      }[error.code] || 500;

    return reply.status(statusCode).send({
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  // Fastify validation errors
  if (error.validation) {
    logger.warn({ err: error, url: request.url }, 'Validation Error');
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request parameters',
      details: error.validation,
    });
  }

  logger.error({ err: error, url: request.url }, 'Unhandled server error');
  return reply.status(500).send({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
});

let consumer: RabbitMQConsumer;
let publisher: RabbitMQPublisher;

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;
    const rabbitMqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672/distill';

    // 1. Init Infrastructure
    const reviewRepository = new PrismaReviewRepository();
    publisher = new RabbitMQPublisher(rabbitMqUrl);
    consumer = new RabbitMQConsumer(rabbitMqUrl, reviewRepository);

    // 2. Connect RabbitMQ
    await publisher.connect();
    await consumer.start();

    // 3. Init Use Cases
    const getPendingReviews = new GetPendingReviews(reviewRepository);
    const getReviewDetail = new GetReviewDetail(reviewRepository);
    const submitReview = new SubmitReview(reviewRepository, publisher);
    const getReviewerStats = new GetReviewerStats(reviewRepository);

    // 4. Init Controllers & Routes
    const controller = new ReviewController(
      getPendingReviews,
      getReviewDetail,
      submitReview,
      getReviewerStats
    );

    void server.register(reviewRoutes, { prefix: '/api/reviews', controller });

    await server.listen({ port, host: '0.0.0.0' });
    logger.info(
      { service: process.env.SERVICE_NAME || 'review-service' },
      `Server listening on port ${port}`
    );
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (consumer) await consumer.stop();
  if (publisher) await publisher.close();
  await server.close();
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
  logger.error(reason as Error, 'Unhandled Rejection');
  process.exit(1);
});

void start();

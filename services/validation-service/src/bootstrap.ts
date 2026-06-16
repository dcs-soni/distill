import { setupMetrics } from '@distill/utils';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { logger } from '@distill/utils';
import Redis from 'ioredis';
import { TenantConfigAdapter } from './infrastructure/config/TenantConfigAdapter';
import { ExtractionAdapter } from './infrastructure/config/ExtractionAdapter';
import { RabbitMQPublisher } from './infrastructure/messaging/RabbitMQPublisher';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import { ValidateExtraction } from './application/use-cases/ValidateExtraction';
import { ValidationController } from './infrastructure/web/controllers/ValidationController';
import validationRoutes from './infrastructure/web/routes/validation.routes';

const PORT = parseInt(process.env.PORT || '3004', 10);
const HOST = process.env.HOST || '0.0.0.0';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL || 'http://localhost:3003';

async function bootstrap() {
  const fastify = Fastify({
    logger: logger.child({ module: 'fastify' }),
  });

  void setupMetrics(fastify, 'validation-service');

  // Security and CORS
  await fastify.register(cors, { origin: true });
  await fastify.register(helmet, { global: true });

  // Validation
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Infrastructure Setup
  const redis = new Redis(REDIS_URL);
  const tenantConfigAdapter = new TenantConfigAdapter(redis, AUTH_SERVICE_URL, logger);
  const extractionAdapter = new ExtractionAdapter(EXTRACTION_SERVICE_URL, logger);
  const eventPublisher = new RabbitMQPublisher(RABBITMQ_URL, logger);

  const validateExtraction = new ValidateExtraction(
    tenantConfigAdapter,
    extractionAdapter,
    eventPublisher,
    logger
  );

  const validationController = new ValidationController(validateExtraction, tenantConfigAdapter);
  const rabbitMQConsumer = new RabbitMQConsumer(RABBITMQ_URL, validateExtraction, logger);

  // Routes
  fastify.get('/health', () => ({ status: 'ok', service: 'validation-service' }));
  fastify.get('/ready', () => ({ status: 'ok', rabbitmq: 'connected', redis: redis.status }));

  void fastify.register(validationRoutes, {
    prefix: '/api/validations',
    controller: validationController,
  });

  // Lifecycle
  let isShuttingDown = false;

  const gracefulShutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info('Shutting down Validation Service...');

    try {
      await rabbitMQConsumer.stop();
      await eventPublisher.close();
      await redis.quit();
      await fastify.close();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void gracefulShutdown();
  });
  process.on('SIGTERM', () => {
    void gracefulShutdown();
  });

  try {
    // Start RabbitMQ
    await eventPublisher.connect();
    await rabbitMQConsumer.start();

    // Start Fastify
    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`Validation Service listening on http://${HOST}:${PORT}`);
  } catch (error) {
    logger.error({ error }, 'Failed to start Validation Service');
    process.exit(1);
  }
}

void bootstrap();

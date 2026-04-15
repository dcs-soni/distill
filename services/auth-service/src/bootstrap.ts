import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from '@distill/utils';

import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { AuthPlugin } from './infrastructure/web/plugins/AuthPlugin.js';
import { authRoutes } from './infrastructure/web/routes/auth.routes.js';
import { tenantRoutes } from './infrastructure/web/routes/tenant.routes.js';

const server = Fastify({
  logger: false, // We use custom Pino logic instead
});

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

void server.register(cors);
void server.register(helmet);

void server.register(AuthPlugin);
void server.register(authRoutes, { prefix: '/auth' });
void server.register(tenantRoutes, { prefix: '/tenants' });

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
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(
      { service: process.env.SERVICE_NAME || 'unknown' },
      `Server listening on port ${port}`
    );
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
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

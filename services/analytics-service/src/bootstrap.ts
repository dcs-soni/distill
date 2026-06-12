import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from '@distill/utils/src/logger.js';
import { PrismaClient } from './infrastructure/persistence/generated/client/index.js';
import { startConsumer } from './infrastructure/messaging/MetricsConsumer.js';
import { RecordDocumentMetrics } from './application/use-cases/RecordDocumentMetrics.js';
import { RecordReviewMetrics } from './application/use-cases/RecordReviewMetrics.js';
import { GetDashboardMetrics } from './application/use-cases/GetDashboardMetrics.js';
import { GetAccuracyReport } from './application/use-cases/GetAccuracyReport.js';
import { GetCostReport } from './application/use-cases/GetCostReport.js';
import { GetReviewerReport } from './application/use-cases/GetReviewerReport.js';
import { metricsRoutes } from './interfaces/http/routes/metrics.js';

const prisma = new PrismaClient();
const recordDocumentMetrics = new RecordDocumentMetrics(prisma);
const recordReviewMetrics = new RecordReviewMetrics(prisma);
const getDashboardMetrics = new GetDashboardMetrics(prisma);
const getAccuracyReport = new GetAccuracyReport(prisma);
const getCostReport = new GetCostReport(prisma);
const getReviewerReport = new GetReviewerReport(prisma);

const server = Fastify({
  logger: false, // We use custom Pino logic instead
});

void server.register(cors);
void server.register(helmet);

server.get('/health', async (_, reply) => {
  return reply.send({ status: 'ok' });
});

server.get('/ready', async (_, reply) => {
  return reply.send({ status: 'ready' });
});

server.get('/metrics', async (_, reply) => {
  return reply.send('# HELP placeholder metrics output\n# TYPE placeholder counter\n');
});

void server.register(
  metricsRoutes({
    getDashboardMetrics,
    getAccuracyReport,
    getCostReport,
    getReviewerReport,
  }),
  { prefix: '/api/metrics' }
);

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL/TimescaleDB');

    await startConsumer(recordDocumentMetrics, recordReviewMetrics);

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3006;
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(
      { service: process.env.SERVICE_NAME || 'analytics-service' },
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
  logger.error(reason as Error, 'Unhandled Rejection');
  process.exit(1);
});

void start();

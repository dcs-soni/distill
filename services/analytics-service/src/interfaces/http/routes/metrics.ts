import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { GetDashboardMetrics } from '../../../application/use-cases/GetDashboardMetrics.js';
import { GetAccuracyReport } from '../../../application/use-cases/GetAccuracyReport.js';
import { GetCostReport } from '../../../application/use-cases/GetCostReport.js';
import { GetReviewerReport } from '../../../application/use-cases/GetReviewerReport.js';

interface MetricsRoutesOptions {
  getDashboardMetrics: GetDashboardMetrics;
  getAccuracyReport: GetAccuracyReport;
  getCostReport: GetCostReport;
  getReviewerReport: GetReviewerReport;
}

export const metricsRoutes = (options: MetricsRoutesOptions): FastifyPluginAsync => {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async (fastify: FastifyInstance) => {
    fastify.get('/dashboard', async (request, reply) => {
      // In a real system, tenantId would come from the auth token
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default-tenant';
      const result = await options.getDashboardMetrics.execute(tenantId);
      return reply.send(result);
    });

    fastify.get('/reports/accuracy', async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default-tenant';
      const result = await options.getAccuracyReport.execute(tenantId);
      return reply.send(result);
    });

    fastify.get('/reports/cost', async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default-tenant';
      const result = await options.getCostReport.execute(tenantId);
      return reply.send(result);
    });

    fastify.get('/reports/reviewers', async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default-tenant';
      const result = await options.getReviewerReport.execute(tenantId);
      return reply.send(result);
    });
  };
};

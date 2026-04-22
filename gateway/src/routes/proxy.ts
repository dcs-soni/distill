import { FastifyPluginAsync } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { servicesConfig } from '../config/services.js';

export const proxyRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth Service Proxy
  await fastify.register(httpProxy, {
    upstream: servicesConfig.authServiceUrl,
    prefix: '/api/auth',
    rewritePrefix: '/auth', // e.g., /api/auth/me -> /auth/me on auth-service
  });

  // Document Service Proxy
  await fastify.register(httpProxy, {
    upstream: servicesConfig.documentServiceUrl,
    prefix: '/api/documents',
    rewritePrefix: '/documents',
  });

  // Extraction Service Proxy
  await fastify.register(httpProxy, {
    upstream: servicesConfig.extractionServiceUrl,
    prefix: '/api/extractions',
    rewritePrefix: '/extractions',
  });

  // Validation Service Proxy
  await fastify.register(httpProxy, {
    upstream: servicesConfig.validationServiceUrl,
    prefix: '/api/validations',
    rewritePrefix: '/validations',
  });

  // Review Service Proxy
  await fastify.register(httpProxy, {
    upstream: servicesConfig.reviewServiceUrl,
    prefix: '/api/reviews',
    rewritePrefix: '/reviews',
  });

  // Analytics Service Proxy
  await fastify.register(httpProxy, {
    upstream: servicesConfig.analyticsServiceUrl,
    prefix: '/api/analytics',
    rewritePrefix: '/analytics',
  });

  // Notification Service Proxy (with WebSocket support)
  await fastify.register(httpProxy, {
    upstream: servicesConfig.notificationServiceUrl,
    prefix: '/ws',
    rewritePrefix: '/ws',
    websocket: true,
  });
};

export default proxyRoutes;

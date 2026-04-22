import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { Redis } from 'ioredis';

export interface RateLimitPluginOptions {
  redisUrl?: string;
}

const rateLimitPlugin: FastifyPluginAsync<RateLimitPluginOptions> = async (fastify, options) => {
  const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);

  // We need to define rate limit based on plan or IP.
  await fastify.register(rateLimit, {
    redis,
    keyGenerator: (request) => {
      // Per-tenant rate limiting if authenticated
      if (request.user?.tenantId) {
        return `ratelimit:tenant:${request.user.tenantId}`;
      }
      // Per-IP rate limiting for auth routes / unauthenticated
      return `ratelimit:ip:${request.ip}`;
    },
    max: (request, key) => {
      if (key.startsWith('ratelimit:tenant:')) {
        // Default to PRO tier rate limits for scaffold (1000 req/min)
        // In real app, we'd query the tenant's plan from Redis/Auth
        return 1000;
      }
      // Unauthenticated IP limit (20 req/min)
      return 20;
    },
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`,
      };
    },
  });
};

export default fp(rateLimitPlugin, {
  name: 'rate-limit-plugin',
  dependencies: ['tenant-plugin'],
});

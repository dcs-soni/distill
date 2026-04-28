import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { Redis } from 'ioredis';

export interface RateLimitPluginOptions {
  redisUrl?: string;
  isTest?: boolean;
}

const rateLimitPlugin: FastifyPluginAsync<RateLimitPluginOptions> = async (fastify, options) => {
  if (options.isTest) {
    // Return early or use memory store in tests, rate limiting makes tests flaky
    await fastify.register(rateLimit, {
      max: 1000,
      timeWindow: '1 minute',
    });
    return;
  }

  const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl, { lazyConnect: options.isTest });

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
    max: async (request, key) => {
      if (key.startsWith('ratelimit:tenant:')) {
        const tenantId = key.split(':')[2];
        let plan = 'FREE';
        try {
          plan = (await redis.get(`tenant:plan:${tenantId}`)) || 'FREE';
        } catch (err) {
          fastify.log.error(err, 'Redis error fetching tenant plan for rate limit');
        }

        switch (plan) {
          case 'ENTERPRISE':
            return 10000;
          case 'PRO':
            return 1000;
          case 'FREE':
          default:
            return 100;
        }
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

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';

export interface TenantPluginOptions {
  redisUrl?: string;
}

const tenantPlugin: FastifyPluginAsync<TenantPluginOptions> = async (fastify, options) => {
  await Promise.resolve();
  const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });

  fastify.addHook('preHandler', async (request, reply) => {
    // Strip incoming spoofed headers
    delete request.headers['x-tenant-id'];
    delete request.headers['x-user-id'];
    delete request.headers['x-user-role'];

    if (!request.user) {
      // If no user (e.g., auth routes or health), skip tenant validation
      return;
    }

    const { tenantId, id: userId, role } = request.user;

    // Validate tenant active in Redis
    const cacheKey = `tenant:active:${tenantId}`;
    let isActive = await redis.get(cacheKey);

    if (isActive === null) {
      // If not in cache, we assume it's active for now, or we would query auth-service
      // In a real microservice, Gateway might call auth-service if not cached.
      // For this scaffold, we'll cache 'true' for 5 minutes by default if missing.
      isActive = 'true';
      await redis.setex(cacheKey, 300, isActive);
    }

    if (isActive !== 'true') {
      fastify.log.warn({ tenantId, userId }, 'Attempt to access inactive tenant');
      return reply.status(403).send({ error: 'Forbidden: Tenant is inactive' });
    }

    // Inject headers for downstream services
    request.headers['x-tenant-id'] = tenantId;
    request.headers['x-user-id'] = userId;
    request.headers['x-user-role'] = role;
  });
};

export default fp(tenantPlugin, {
  name: 'tenant-plugin',
  dependencies: ['oidc-plugin'], // Requires OIDC plugin to run first
});

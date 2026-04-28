import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';

export interface TenantPluginOptions {
  redisUrl?: string;
  isTest?: boolean;
}

const tenantPlugin: FastifyPluginAsync<TenantPluginOptions> = async (fastify, options) => {
  await Promise.resolve();
  let redis: Redis | null = null;
  if (!options.isTest) {
    const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl);
    fastify.addHook('onClose', async () => {
      await redis?.quit();
    });
  }

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

    if (options.isTest) {
      request.headers['x-tenant-id'] = tenantId;
      request.headers['x-user-id'] = userId;
      request.headers['x-user-role'] = role;
      return;
    }

    // Validate tenant active in Redis
    const cacheKey = `tenant:active:${tenantId}`;
    let isActive: string | null = null;

    if (redis) {
      try {
        isActive = await redis.get(cacheKey);
      } catch (err) {
        fastify.log.error(err, 'Redis error when checking tenant active status');
      }
    }

    if (isActive === null) {
      // Query auth-service for active status
      try {
        const authUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
        const res = await fetch(`${authUrl}/tenants/${tenantId}`, {
          headers: {
            'x-request-id': request.id,
            authorization: request.headers.authorization || '',
          },
        });

        if (res.ok) {
          const tenantData = (await res.json()) as { isActive?: boolean; plan?: string };
          isActive = tenantData.isActive !== false ? 'true' : 'false';
          const plan = tenantData.plan ? String(tenantData.plan) : 'FREE';

          if (redis) {
            await redis
              .pipeline()
              .setex(cacheKey, 300, isActive)
              .setex(`tenant:plan:${tenantId}`, 300, plan)
              .exec();
          }
        } else {
          fastify.log.warn({ tenantId, status: res.status }, 'Auth service rejected tenant check');
          isActive = 'false';
        }
      } catch (err) {
        fastify.log.error(err, 'Failed to fetch tenant status from auth-service');
        isActive = 'false'; // Fail closed
      }
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

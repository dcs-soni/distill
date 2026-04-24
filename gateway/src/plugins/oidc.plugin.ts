import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import * as jose from 'jose';
import { Redis } from 'ioredis';

export interface OidcPluginOptions {
  redisUrl?: string;
  isTest?: boolean;
}

const oidcPlugin: FastifyPluginAsync<OidcPluginOptions> = async (fastify, options) => {
  await Promise.resolve();
  const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl, { lazyConnect: options.isTest });

  if (!options.isTest) {
    // Note: ioredis connects automatically, lazyConnect: false is the default
    redis.on('error', (err) => fastify.log.error(err, 'Redis connection error'));
  }

  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const jwksUrl = new URL(`${authServiceUrl}/api/auth/jwks.json`);

  const JWKS = jose.createRemoteJWKSet(jwksUrl, {
    cooldownDuration: 30000,
    cacheMaxAge: 600000,
  });

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });

  const whiteList = ['/health', '/ready', '/api/auth/authorize', '/api/auth/callback', '/metrics'];

  fastify.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];

    // Skip whitelisted routes
    if (whiteList.includes(path) || path.startsWith('/api/auth/')) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      fastify.log.warn({ ip: request.ip, path }, 'Missing or invalid Authorization header');
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer: 'distill-auth',
        audience: 'distill-gateway',
      });

      const sid = payload.sid as string;
      if (sid && !options.isTest) {
        try {
          const isRevoked = await redis.get(`session:revoked:${sid}`);
          if (isRevoked) {
            fastify.log.warn({ sid }, 'Revoked session attempt');
            return reply.status(401).send({ error: 'Unauthorized: Session revoked' });
          }
        } catch (err) {
          fastify.log.error(err, 'Redis error checking session revocation');
        }
      }

      request.user = {
        id: payload.sub as string,
        tenantId: payload.tenantId as string,
        role: payload.role as string,
      };

      if (!request.user.id || !request.user.tenantId || !request.user.role) {
        throw new Error('Missing required claims');
      }
    } catch (error) {
      fastify.log.warn({ ip: request.ip, error }, 'Invalid JWT token');
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
  });
};

export default fp(oidcPlugin, {
  name: 'oidc-plugin',
});

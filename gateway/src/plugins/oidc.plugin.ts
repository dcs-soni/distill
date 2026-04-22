import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import * as jose from 'jose';

export interface OidcPluginOptions {
  publicKey?: string;
}

const oidcPlugin: FastifyPluginAsync<OidcPluginOptions> = async (fastify, options) => {
  const publicKeyStr = options.publicKey || process.env.JWT_PUBLIC_KEY;
  if (!publicKeyStr) {
    fastify.log.warn('JWT_PUBLIC_KEY is not set. OIDC verification will fail.');
  }

  let publicKey: jose.KeyLike | undefined;

  try {
    if (publicKeyStr) {
      publicKey = await jose.importSPKI(publicKeyStr, 'ES256');
    }
  } catch (error) {
    fastify.log.error(error, 'Failed to import JWT_PUBLIC_KEY');
  }

  const whiteList = ['/health', '/ready', '/api/auth/authorize', '/api/auth/callback', '/metrics'];

  fastify.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];

    // Skip whitelisted routes
    if (whiteList.includes(path) || path.startsWith('/api/auth/')) {
      // NOTE: We allow all /api/auth routes to pass through to the auth service,
      // because auth service handles its own token verification for endpoints like /me.
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      fastify.log.warn({ ip: request.ip, path }, 'Missing or invalid Authorization header');
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!publicKey) {
      return reply.status(500).send({ error: 'Internal Server Error: Missing public key' });
    }

    try {
      const { payload } = await jose.jwtVerify(token, publicKey, {
        issuer: 'distill-auth-service',
      });

      request.user = {
        id: payload.sub as string,
        tenantId: payload.tenantId as string,
        role: payload.role as string,
      };
    } catch (error) {
      fastify.log.warn({ ip: request.ip, error }, 'Invalid JWT token');
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
  });
};

export default fp(oidcPlugin, {
  name: 'oidc-plugin',
});

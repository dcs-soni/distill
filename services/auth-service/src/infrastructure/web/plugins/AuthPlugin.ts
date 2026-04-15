import fp from 'fastify-plugin';
import type { preHandlerAsyncHookHandler } from 'fastify';
import { JwtSessionService } from '../../services/JwtSessionService.js';
import { UnauthorizedError } from '@distill/utils';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
  sid: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }

  interface FastifyInstance {
    authenticate: preHandlerAsyncHookHandler;
  }
}

export const AuthPlugin = fp((fastify, _opts, done) => {
  const sessionService = new JwtSessionService();

  const authenticate: preHandlerAsyncHookHandler = async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid Authorization header');
      }

      const token = authHeader.substring(7);
      const session = await sessionService.verifySession(token);
      request.user = session;
    } catch (err) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: err instanceof Error ? err.message : 'Invalid token',
      });
    }
  };

  fastify.decorate('authenticate', authenticate);
  done();
});

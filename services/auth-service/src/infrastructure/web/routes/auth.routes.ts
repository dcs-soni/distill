import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AuthController } from '../controllers/AuthController.js';
import { OIDCAdapter } from '../../oidc/OIDCAdapter.js';
import { RedisOIDCStore } from '../../oidc/RedisOIDCStore.js';
import { HandleOIDCCallback } from '../../../application/use-cases/HandleOIDCCallback.js';
import { GetUserProfile } from '../../../application/use-cases/GetUserProfile.js';
import { JwtSessionService } from '../../services/JwtSessionService.js';
import { PrismaAuthRepository } from '../../persistence/PrismaAuthRepository.js';
import {
  OIDCCallbackSchema,
  AuthResponseSchema,
  RefreshTokenSchema,
  type OIDCCallbackDTO,
  type RefreshTokenDTO,
} from '../../../application/dto/auth.dto.js';
import { z } from 'zod';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const oidcAdapter = new OIDCAdapter(
    process.env.OIDC_CLIENT_ID || 'client',
    process.env.OIDC_CLIENT_SECRET || 'secret'
  );
  try {
    await oidcAdapter.discoverProvider(process.env.OIDC_ISSUER_URL || 'http://localhost:8080');
  } catch (e) {
    fastify.log.error(e, 'Failed to discover OIDC provider');
  }

  const oidcStore = new RedisOIDCStore();
  const sessionService = new JwtSessionService();
  const authRepository = new PrismaAuthRepository();
  const handleCallbackUc = new HandleOIDCCallback(
    oidcAdapter,
    oidcStore,
    sessionService,
    authRepository
  );
  const getUserProfileUc = new GetUserProfile(authRepository);

  const controller = new AuthController(
    oidcAdapter,
    oidcStore,
    handleCallbackUc,
    getUserProfileUc,
    sessionService
  );

  const route = fastify.withTypeProvider<ZodTypeProvider>();
  const requireAuth: preHandlerHookHandler = (request, reply, done) => {
    void fastify.authenticate(request, reply).then(
      () => {
        if (!reply.sent) {
          done();
        }
      },
      (error: Error) => done(error)
    );
  };

  route.get(
    '/authorize',
    {
      schema: {
        response: {
          200: z.object({ url: z.string() }),
        },
      },
    },
    (request, reply) => controller.authorize(request, reply)
  );

  route.get<{ Querystring: OIDCCallbackDTO }>(
    '/callback',
    {
      schema: {
        querystring: OIDCCallbackSchema,
        response: { 200: AuthResponseSchema },
      },
    },
    (request, reply) => controller.callback(request, reply)
  );

  route.post<{ Body: RefreshTokenDTO }>(
    '/refresh',
    {
      schema: {
        body: RefreshTokenSchema,
      },
    },
    (request, reply) => controller.refresh(request, reply)
  );

  route.post('/logout', { preHandler: requireAuth }, (request, reply) =>
    controller.logout(request, reply)
  );

  route.get('/me', { preHandler: requireAuth }, (request, reply) => controller.me(request, reply));

  route.get('/jwks.json', (request, reply) => controller.jwks(request, reply));
};

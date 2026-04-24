import { FastifyRequest, FastifyReply } from 'fastify';
import { HandleOIDCCallback } from '../../../application/use-cases/HandleOIDCCallback.js';
import { GetUserProfile } from '../../../application/use-cases/GetUserProfile.js';
import crypto from 'crypto';
import type { OIDCProviderPort } from '../../../application/ports/OIDCProvider.port.js';
import type { OIDCStateStorePort } from '../../../application/ports/OIDCStateStore.port.js';
import type { SessionServicePort } from '../../../application/ports/SessionService.port.js';

export class AuthController {
  constructor(
    private readonly oidcAdapter: OIDCProviderPort,
    private readonly oidcStore: OIDCStateStorePort,
    private readonly handleOidcCallback: HandleOIDCCallback,
    private readonly getUserProfile: GetUserProfile,
    private readonly sessionService: SessionServicePort
  ) {}

  async authorize(request: FastifyRequest, reply: FastifyReply) {
    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const redirectUri = process.env.OIDC_REDIRECT_URI || 'http://localhost:5173/auth/callback';

    await this.oidcStore.saveAuthContext(state, nonce, codeVerifier, redirectUri);

    const url = this.oidcAdapter.getAuthorizationUrl(state, nonce, codeChallenge, redirectUri);

    return reply.send({ url });
  }

  async callback(
    request: FastifyRequest<{ Querystring: { code: string; state: string } }>,
    reply: FastifyReply
  ) {
    const { code, state } = request.query;
    const result = await this.handleOidcCallback.execute(code, state);
    return reply.send(result);
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    if (request.user?.sid) {
      await this.sessionService.revokeSession(request.user.sid);
    }
    return reply.send({ success: true });
  }

  async refresh(request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) {
    const { refreshToken } = request.body;
    const result = await this.sessionService.refreshSession(refreshToken);
    return reply.send(result);
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) return reply.status(401).send({ error: 'Unauthorized' });
    const profile = await this.getUserProfile.execute(request.user.userId);
    return reply.send(profile);
  }

  async jwks(request: FastifyRequest, reply: FastifyReply) {
    const { JwtSessionService } = await import('../../services/JwtSessionService.js');
    const jwks = await JwtSessionService.getJwks();
    return reply.send(jwks);
  }
}

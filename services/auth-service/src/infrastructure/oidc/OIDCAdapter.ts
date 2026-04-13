import { Issuer, Client, TokenSet } from 'openid-client';
import { OIDCProviderPort } from '../../application/ports/OIDCProvider.port.js';
import { ExternalServiceError, UnauthorizedError } from '@distill/utils';
import { logger } from '@distill/utils';

export class OIDCAdapter implements OIDCProviderPort {
  private client: Client | null = null;
  private issuer: Issuer<Client> | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  async discoverProvider(issuerUrl: string): Promise<void> {
    try {
      this.issuer = await Issuer.discover(issuerUrl);
      this.client = new this.issuer.Client({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        response_types: ['code'],
      });
      logger.info(`Discovered OIDC Provider: ${this.issuer.issuer as string}`);
    } catch (error) {
      logger.error(error as Error, `Failed to discover OIDC provider at ${issuerUrl}`);
      throw new ExternalServiceError(`OIDC Discovery Failed`, error);
    }
  }

  getAuthorizationUrl(
    state: string,
    nonce: string,
    codeChallenge: string,
    redirectUri: string
  ): string {
    if (!this.client) throw new Error('OIDC client not initialized');

    return this.client.authorizationUrl({
      scope: 'openid profile email',
      redirect_uri: redirectUri,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string) {
    if (!this.client) throw new Error('OIDC client not initialized');

    try {
      const tokenSet = await this.client.callback(
        redirectUri,
        { code },
        { code_verifier: codeVerifier }
      );

      if (!tokenSet.id_token || !tokenSet.access_token) {
        throw new UnauthorizedError('Tokens not provided in OIDC callback response');
      }

      return {
        idToken: tokenSet.id_token,
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
      };
    } catch (error) {
      logger.error(error as Error, 'Error exchanging code to token');
      throw new UnauthorizedError('Failed to exchange auth code', error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyIdToken(idToken: string, nonce: string) {
    if (!this.client) throw new Error('OIDC client not initialized');

    try {
      const tokenSet = new TokenSet({ id_token: idToken });
      const claims = tokenSet.claims();

      if (claims.nonce !== nonce) {
        throw new UnauthorizedError('Nonce mismatch in ID token');
      }

      return {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
      };
    } catch (error) {
      logger.error(error as Error, 'Error verifying ID Token');
      throw new UnauthorizedError('Invalid ID Token', error);
    }
  }

  async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    if (!this.client) throw new Error('OIDC client not initialized');

    try {
      return await this.client.userinfo(accessToken);
    } catch (error) {
      logger.error(error as Error, 'Error fetching user profile');
      throw new ExternalServiceError('Failed to fetch userinfo', error);
    }
  }

  async refreshAccessToken(refreshToken: string) {
    if (!this.client) throw new Error('OIDC client not initialized');

    try {
      const tokenSet = await this.client.refresh(refreshToken);

      if (!tokenSet.id_token || !tokenSet.access_token) {
        throw new UnauthorizedError('Failed to refresh tokens properly');
      }

      return {
        idToken: tokenSet.id_token,
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
      };
    } catch (error) {
      logger.error(error as Error, 'Error refreshing access token');
      throw new UnauthorizedError('Invalid or expired refresh token', error);
    }
  }
}

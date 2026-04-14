import { redisClient } from '../redis/redisClient.js';
import { ExternalServiceError } from '@distill/utils';

export class RedisOIDCStore {
  async saveAuthContext(
    state: string,
    nonce: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<void> {
    try {
      const payload = JSON.stringify({ nonce, codeVerifier, redirectUri });
      await redisClient.setex(`oidc:state:${state}`, 600, payload); // 10 min TTL
    } catch (e) {
      throw new ExternalServiceError('Failed to save OIDC state', e);
    }
  }

  async getAuthContext(
    state: string
  ): Promise<{ nonce: string; codeVerifier: string; redirectUri: string } | null> {
    try {
      const v = await redisClient.get(`oidc:state:${state}`);
      if (!v) return null;
      // Delete after fetch for one-time use (PKCE replay protection)
      await redisClient.del(`oidc:state:${state}`);
      return JSON.parse(v) as { nonce: string; codeVerifier: string; redirectUri: string };
    } catch (e) {
      throw new ExternalServiceError('Failed to get OIDC state', e);
    }
  }
}

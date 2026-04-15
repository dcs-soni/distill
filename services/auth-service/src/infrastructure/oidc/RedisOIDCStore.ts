import { redisClient } from '../redis/redisClient.js';
import { ExternalServiceError } from '@distill/utils';
import { z } from 'zod';
import type {
  OIDCAuthContext,
  OIDCStateStorePort,
} from '../../application/ports/OIDCStateStore.port.js';

const OIDCAuthContextSchema = z.object({
  nonce: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().url(),
});

export class RedisOIDCStore implements OIDCStateStorePort {
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

  async getAuthContext(state: string): Promise<OIDCAuthContext | null> {
    try {
      const v = await redisClient.get(`oidc:state:${state}`);
      if (!v) return null;
      await redisClient.del(`oidc:state:${state}`);
      return OIDCAuthContextSchema.parse(JSON.parse(v));
    } catch (e) {
      throw new ExternalServiceError('Failed to get OIDC state', e);
    }
  }
}

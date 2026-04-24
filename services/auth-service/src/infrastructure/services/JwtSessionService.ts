import { SignJWT, jwtVerify, generateKeyPair, importPKCS8, importSPKI, KeyLike } from 'jose';
import prismaClient from '../persistence/prismaClient.js';
import { redisClient } from '../redis/redisClient.js';
import { UnauthorizedError, ExternalServiceError, hashValue } from '@distill/utils';
import crypto from 'crypto';
import type {
  AuthenticatedSession,
  SessionServicePort,
  SessionTokens,
} from '../../application/ports/SessionService.port.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const readPemEnv = (name: string): string | undefined => {
  return process.env[name]?.replace(/\\n/g, '\n');
};

const getStringClaim = (payload: Record<string, unknown>, key: string): string => {
  const value = payload[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new UnauthorizedError(`Invalid or missing ${key} claim`);
  }
  return value;
};

export class JwtSessionService implements SessionServicePort {
  private static privateKey: KeyLike;
  public static publicKey: KeyLike;
  private static initialized = false;

  public static async initKeys(): Promise<void> {
    if (this.initialized) return;

    const privateKeyPem = readPemEnv('JWT_PRIVATE_KEY');
    const publicKeyPem = readPemEnv('JWT_PUBLIC_KEY');

    if (privateKeyPem && publicKeyPem) {
      this.privateKey = await importPKCS8(privateKeyPem, 'ES256');
      this.publicKey = await importSPKI(publicKeyPem, 'ES256');
      this.initialized = true;
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ExternalServiceError('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required');
    }

    const { publicKey, privateKey } = await generateKeyPair('ES256');
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.initialized = true;
  }

  async createSession(userId: string, tenantId: string, role: string): Promise<SessionTokens> {
    if (!JwtSessionService.initialized) await JwtSessionService.initKeys();

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashValue(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session = await prismaClient.session.create({
      data: {
        userId,
        tenantId,
        tokenHash,
        expiresAt,
      },
    });

    // Sign Access Token
    // 15 minutes TTL for Access Token
    const accessToken = await new SignJWT({
      sub: userId,
      tenantId,
      role,
      sid: session.id,
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'distill-auth-key-1' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .setIssuer('distill-auth')
      .setAudience('distill-gateway')
      .sign(JwtSessionService.privateKey);

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }

  async verifySession(token: string): Promise<AuthenticatedSession> {
    if (!JwtSessionService.initialized) await JwtSessionService.initKeys();

    try {
      const { payload } = await jwtVerify(token, JwtSessionService.publicKey, {
        issuer: 'distill-auth',
        audience: 'distill-gateway',
      });

      const claims = payload as Record<string, unknown>;
      const sid = getStringClaim(claims, 'sid');
      const isRevoked = await redisClient.get(`session:revoked:${sid}`);
      if (isRevoked) {
        throw new UnauthorizedError('Session has been revoked');
      }

      return {
        userId: getStringClaim(claims, 'sub'),
        tenantId: getStringClaim(claims, 'tenantId'),
        role: getStringClaim(claims, 'role'),
        sid,
      };
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
      throw new UnauthorizedError(
        'Invalid or expired token',
        e instanceof Error ? e : new Error(String(e))
      );
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    try {
      await prismaClient.session.delete({ where: { id: sessionId } }).catch(() => null);
      await redisClient.setex(`session:revoked:${sessionId}`, REFRESH_TOKEN_TTL_SECONDS, '1');
    } catch (e) {
      throw new ExternalServiceError(
        'Failed to revoke session',
        e instanceof Error ? e : new Error(String(e))
      );
    }
  }

  async refreshSession(refreshToken: string): Promise<SessionTokens> {
    const tokenHash = hashValue(refreshToken);

    const session = await prismaClient.session.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { memberships: true } },
      },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const member = session.user.memberships.find(
      (m: { tenantId: string; role: string }) => m.tenantId === session.tenantId
    );
    if (!member) {
      throw new UnauthorizedError('User is no longer a member of this tenant');
    }

    // Rotate refresh token - delete old, create new
    await this.revokeSession(session.id);
    return this.createSession(session.userId, session.tenantId, member.role);
  }

  static async getJwks() {
    if (!this.initialized) await this.initKeys();
    const { exportJWK } = await import('jose');
    const jwk = await exportJWK(this.publicKey);
    return {
      keys: [
        {
          ...jwk,
          kid: 'distill-auth-key-1',
          use: 'sig',
          alg: 'ES256',
        },
      ],
    };
  }
}

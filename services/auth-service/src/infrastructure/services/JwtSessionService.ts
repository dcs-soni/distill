import { SignJWT, jwtVerify, generateKeyPair, KeyLike } from 'jose';
import prismaClient from '../persistence/prismaClient.js';
import { redisClient } from '../redis/redisClient.js';
import { UnauthorizedError, ExternalServiceError, hashValue } from '@distill/utils';
import crypto from 'crypto';

export class JwtSessionService {
  private static privateKey: KeyLike;
  public static publicKey: KeyLike;
  private static initialized = false;

  public static async initKeys() {
    if (this.initialized) return;
    const { publicKey, privateKey } = await generateKeyPair('ES256');
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.initialized = true;
  }

  async createSession(userId: string, tenantId: string, role: string) {
    if (!JwtSessionService.initialized) await JwtSessionService.initKeys();

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashValue(refreshToken);

    // 7 days for refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .setIssuer('distill-auth')
      .setAudience('distill-gateway')
      .sign(JwtSessionService.privateKey);

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }

  async verifySession(token: string) {
    if (!JwtSessionService.initialized) await JwtSessionService.initKeys();

    try {
      const { payload } = await jwtVerify(token, JwtSessionService.publicKey, {
        issuer: 'distill-auth',
        audience: 'distill-gateway',
      });

      const sid = payload.sid as string;
      const isRevoked = await redisClient.get(`session:revoked:${sid}`);
      if (isRevoked) {
        throw new UnauthorizedError('Session has been revoked');
      }

      return {
        userId: payload.sub as string,
        tenantId: payload.tenantId as string,
        role: payload.role as string,
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

  async revokeSession(sessionId: string) {
    try {
      await prismaClient.session.delete({ where: { id: sessionId } }).catch(() => null);
      // Blacklist the session id in redis for a long time (7 days maximum life)
      await redisClient.setex(`session:revoked:${sessionId}`, 7 * 24 * 60 * 60, '1');
    } catch (e) {
      throw new ExternalServiceError(
        'Failed to revoke session',
        e instanceof Error ? e : new Error(String(e))
      );
    }
  }

  async refreshSession(refreshToken: string) {
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

    const member = session.user.memberships.find((m) => m.tenantId === session.tenantId);
    if (!member) {
      throw new UnauthorizedError('User is no longer a member of this tenant');
    }

    // Rotate refresh token - delete old, create new
    await this.revokeSession(session.id);
    return this.createSession(session.userId, session.tenantId, member.role);
  }
}

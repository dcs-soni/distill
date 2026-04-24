import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(),
    jwtVerify: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid-token') {
        return {
          payload: {
            sub: 'user-1',
            tenantId: 'tenant-1',
            role: 'ADMIN',
            sid: 'session-1',
          },
        };
      }
      throw new Error('Invalid token');
    }),
  };
});

describe('Gateway Server', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // We mock environment variables to avoid connecting to real Redis
    process.env.REDIS_URL = 'redis://mocked';
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return ok for /health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'api-gateway' });
  });

  it('should return ready for /ready', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready' });
  });

  it('should expose /metrics endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/metrics',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.payload).toContain('http_request_duration_ms');
  });
  it('should reject requests without authorization header to protected routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/documents',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should accept valid tokens on protected routes and forward to proxy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/documents',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    // We expect 500 or 502 from the http-proxy because there is no upstream server running in tests.
    // If it returns 401, then auth failed.
    expect(response.statusCode).not.toBe(401);
  });
});

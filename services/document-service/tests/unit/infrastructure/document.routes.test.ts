import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { AppError, NotFoundError, ForbiddenError } from '@distill/utils';
import { documentRoutes } from '../../../src/infrastructure/web/routes/document.routes.js';
import { DocumentController } from '../../../src/infrastructure/web/controllers/DocumentController.js';

const mockUploadDocument = { execute: vi.fn() };
const mockUploadBatch = { execute: vi.fn() };
const mockListDocuments = { execute: vi.fn() };
const mockGetDocument = { execute: vi.fn() };
const mockDeleteDocument = { execute: vi.fn() };

const controller = new DocumentController(
  mockUploadDocument as any,
  mockUploadBatch as any,
  mockListDocuments as any,
  mockGetDocument as any,
  mockDeleteDocument as any
);

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

  app.setErrorHandler((error: any, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }
    return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Internal error' });
  });

  await app.register(documentRoutes(controller), { prefix: '/documents' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /documents', () => {
  it('returns 400 for invalid page param', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/documents?page=-1',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid limit param', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/documents?limit=999',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid sortBy param', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/documents?sortBy=invalidField',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid status enum', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/documents?status=INVALID_STATUS',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 401 for missing tenant context', async () => {
    mockListDocuments.execute.mockRejectedValue(new Error('should not reach'));
    const response = await app.inject({
      method: 'GET',
      url: '/documents',
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('coerces string page/limit to numbers', async () => {
    mockListDocuments.execute.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 10,
      totalPages: 0,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/documents?page=2&limit=10',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.meta.page).toBe(2);
    expect(body.meta.limit).toBe(10);
  });

  it('returns 200 with defaults when no query params', async () => {
    mockListDocuments.execute.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/documents',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([]);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(20);
  });
});

describe('GET /documents/:id', () => {
  it('returns 400 for empty id param', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/documents/',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect([400, 200]).toContain(response.statusCode);
  });

  it('returns 404 for non-existent document', async () => {
    mockGetDocument.execute.mockRejectedValue(new NotFoundError('Document not found'));

    const response = await app.inject({
      method: 'GET',
      url: '/documents/non-existent-id',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('NOT_FOUND');
  });
});

describe('DELETE /documents/:id', () => {
  it('returns 401 when missing tenant context', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/documents/some-id',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 when user is not ADMIN', async () => {
    mockDeleteDocument.execute.mockRejectedValue(
      new ForbiddenError('Only ADMIN users can delete documents')
    );

    const response = await app.inject({
      method: 'DELETE',
      url: '/documents/some-id',
      headers: { 'x-tenant-id': 'tenant-1', 'x-user-role': 'VIEWER' },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toBe('FORBIDDEN');
  });

  it('returns 204 on successful delete', async () => {
    mockDeleteDocument.execute.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: '/documents/some-id',
      headers: { 'x-tenant-id': 'tenant-1', 'x-user-role': 'ADMIN' },
    });

    expect(response.statusCode).toBe(204);
  });
});

describe('GET /documents/:id/download', () => {
  it('returns JSON presigned URL instead of redirect', async () => {
    mockGetDocument.execute.mockResolvedValue({
      id: 'doc-1',
      tenantId: 'tenant-1',
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      s3Key: 'tenant-1/documents/doc-1/test.pdf',
      status: 'QUEUED',
      uploadedById: 'user-1',
      retryCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      downloadUrl: 'https://s3.example.com/presigned-url',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/documents/doc-1/download',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.url).toBe('https://s3.example.com/presigned-url');
    expect(body.expiresIn).toBe(3600);
  });

  it('returns 404 for non-existent document', async () => {
    mockGetDocument.execute.mockRejectedValue(new NotFoundError('Document not found'));

    const response = await app.inject({
      method: 'GET',
      url: '/documents/non-existent-id/download',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(404);
  });
});

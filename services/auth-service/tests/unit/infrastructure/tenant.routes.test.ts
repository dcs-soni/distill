import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AppError, ForbiddenError, NotFoundError, ConflictError } from '@distill/utils';
import fp from 'fastify-plugin';
import type { preHandlerAsyncHookHandler } from 'fastify';
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  InviteMemberSchema,
  AssignRoleSchema,
  SwitchTenantSchema,
  TenantIdParamsSchema,
  TenantMemberParamsSchema,
} from '../../../src/application/dto/tenant.dto.js';

const testUser = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  role: 'ADMIN',
  sid: 'session-1',
  email: 'admin@example.com',
};

const mockCreateTenant = vi.fn();
const mockGetTenant = vi.fn();
const mockUpdateTenant = vi.fn();
const mockInviteMember = vi.fn();
const mockAssignRole = vi.fn();
const mockListTenantMembers = vi.fn();
const mockSwitchTenant = vi.fn();
const mockListUserTenants = vi.fn();
const mockRemoveTenantMember = vi.fn();

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const mockAuthPlugin = fp((fastify: FastifyInstance, _opts: unknown, done: () => void) => {
    const authenticate: preHandlerAsyncHookHandler = async (request) => {
      request.user = { ...testUser };
    };
    fastify.decorate('authenticate', authenticate);
    done();
  });

  await app.register(mockAuthPlugin);

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

  await app.register(
    async function tenantPlugin(fastify) {
      const route = fastify.withTypeProvider<ZodTypeProvider>();
      route.addHook('preHandler', fastify.authenticate);

      route.post('/', { schema: { body: CreateTenantSchema } }, async (req, reply) => {
        if (!req.user) throw new ForbiddenError('Unauthorized');
        const result = await mockCreateTenant(req.user.userId, req.body.name, req.body.slug);
        return reply.send(result);
      });

      route.get('/', async (req, reply) => {
        if (!req.user) throw new ForbiddenError('Unauthorized');
        const result = await mockListUserTenants(req.user.userId);
        return reply.send(result);
      });

      route.get('/:id', { schema: { params: TenantIdParamsSchema } }, async (req, reply) => {
        if (!req.user) throw new ForbiddenError('Unauthorized');
        const result = await mockGetTenant(req.user.userId, (req.params as any).id);
        return reply.send(result);
      });

      route.put(
        '/:id',
        { schema: { params: TenantIdParamsSchema, body: UpdateTenantSchema } },
        async (req, reply) => {
          if (!req.user) throw new ForbiddenError('Unauthorized');
          const result = await mockUpdateTenant(req.user.userId, (req.params as any).id, req.body);
          return reply.send(result);
        }
      );

      route.post('/switch', { schema: { body: SwitchTenantSchema } }, async (req, reply) => {
        if (!req.user) throw new ForbiddenError('Unauthorized');
        const result = await mockSwitchTenant(req.user.userId, (req.body as any).tenantId);
        return reply.send(result);
      });

      route.get(
        '/:id/members',
        { schema: { params: TenantIdParamsSchema } },
        async (req, reply) => {
          if (!req.user) throw new ForbiddenError('Unauthorized');
          const result = await mockListTenantMembers(req.user.userId, (req.params as any).id);
          return reply.send(result);
        }
      );

      route.post(
        '/:id/members',
        { schema: { body: InviteMemberSchema, params: TenantIdParamsSchema } },
        async (req, reply) => {
          if (!req.user) throw new ForbiddenError('Unauthorized');
          const result = await mockInviteMember(
            req.user.userId,
            (req.params as any).id,
            (req.body as any).email,
            (req.body as any).role
          );
          return reply.send(result);
        }
      );

      route.put(
        '/:id/members/:memberId/role',
        { schema: { body: AssignRoleSchema, params: TenantMemberParamsSchema } },
        async (req, reply) => {
          if (!req.user) throw new ForbiddenError('Unauthorized');
          const result = await mockAssignRole(
            req.user.userId,
            (req.params as any).id,
            (req.params as any).memberId,
            (req.body as any).role
          );
          return reply.send(result);
        }
      );

      route.delete(
        '/:id/members/:memberId',
        { schema: { params: TenantMemberParamsSchema } },
        async (req, reply) => {
          if (!req.user) throw new ForbiddenError('Unauthorized');
          await mockRemoveTenantMember(
            req.user.userId,
            (req.params as any).id,
            (req.params as any).memberId
          );
          return reply.send({ success: true });
        }
      );
    },
    { prefix: '/tenants' }
  );

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /tenants', () => {
  it('returns 400 for missing name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tenants',
      payload: { slug: 'test-slug' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid slug format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tenants',
      payload: { name: 'Test', slug: 'INVALID SLUG!' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for slug too short', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tenants',
      payload: { name: 'Test', slug: 'ab' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 200 for valid payload', async () => {
    mockCreateTenant.mockResolvedValue({
      id: 'tenant-new',
      name: 'Test Org',
      slug: 'test-org',
      plan: 'FREE',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/tenants',
      payload: { name: 'Test Org', slug: 'test-org' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('Test Org');
    expect(body.slug).toBe('test-org');
  });
});

describe('GET /tenants/:id', () => {
  it('returns 404 when tenant not found', async () => {
    mockGetTenant.mockRejectedValue(new NotFoundError('Tenant not found'));

    const response = await app.inject({
      method: 'GET',
      url: '/tenants/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 200 for valid tenant', async () => {
    mockGetTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Test Org',
      slug: 'test-org',
      plan: 'PRO',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe('tenant-1');
  });
});

describe('PUT /tenants/:id', () => {
  it('returns 400 for empty body', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/tenants/tenant-1',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid slug format', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/tenants/tenant-1',
      payload: { slug: 'BAD SLUG' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 409 for duplicate slug', async () => {
    mockUpdateTenant.mockRejectedValue(new ConflictError('Tenant slug is already taken'));

    const response = await app.inject({
      method: 'PUT',
      url: '/tenants/tenant-1',
      payload: { slug: 'taken-slug' },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toBe('CONFLICT');
  });

  it('returns 200 for valid name update', async () => {
    mockUpdateTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Updated Org',
      slug: 'test-org',
      plan: 'PRO',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/tenants/tenant-1',
      payload: { name: 'Updated Org' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.name).toBe('Updated Org');
  });
});

describe('POST /tenants/:id/members', () => {
  it('returns 400 for invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/members',
      payload: { email: 'not-an-email', role: 'VIEWER' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/members',
      payload: { email: 'user@example.com', role: 'SUPER_ADMIN' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 200 for valid invite', async () => {
    mockInviteMember.mockResolvedValue({
      id: 'member-new',
      userId: 'user-2',
      tenantId: 'tenant-1',
      role: 'VIEWER',
      joinedAt: new Date().toISOString(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/members',
      payload: { email: 'user@example.com', role: 'VIEWER' },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe('PUT /tenants/:id/members/:memberId/role', () => {
  it('returns 400 for invalid role', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/tenants/tenant-1/members/member-1/role',
      payload: { role: 'INVALID_ROLE' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 200 for valid role assignment', async () => {
    mockAssignRole.mockResolvedValue({
      id: 'member-1',
      userId: 'user-2',
      tenantId: 'tenant-1',
      role: 'ADMIN',
      joinedAt: new Date().toISOString(),
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/tenants/tenant-1/members/member-1/role',
      payload: { role: 'ADMIN' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.role).toBe('ADMIN');
  });
});

describe('DELETE /tenants/:id/members/:memberId', () => {
  it('returns 200 on successful removal', async () => {
    mockRemoveTenantMember.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: '/tenants/tenant-1/members/member-1',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
  });
});

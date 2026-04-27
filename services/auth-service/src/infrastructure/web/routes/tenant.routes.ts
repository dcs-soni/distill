import type { FastifyPluginCallback } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { TenantController } from '../controllers/TenantController.js';
import { CreateTenant } from '../../../application/use-cases/CreateTenant.js';
import { GetTenant } from '../../../application/use-cases/GetTenant.js';
import { UpdateTenant } from '../../../application/use-cases/UpdateTenant.js';
import { InviteMember } from '../../../application/use-cases/InviteMember.js';
import { AssignRole } from '../../../application/use-cases/AssignRole.js';
import { ListTenantMembers } from '../../../application/use-cases/ListTenantMembers.js';
import { SwitchTenant } from '../../../application/use-cases/SwitchTenant.js';
import { JwtSessionService } from '../../services/JwtSessionService.js';
import { PrismaAuthRepository } from '../../persistence/PrismaAuthRepository.js';
import { ListUserTenants } from '../../../application/use-cases/ListUserTenants.js';
import { RemoveTenantMember } from '../../../application/use-cases/RemoveTenantMember.js';
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  InviteMemberSchema,
  AssignRoleSchema,
  SwitchTenantSchema,
  TenantResponseSchema,
  TenantMemberResponseSchema,
  TenantIdParamsSchema,
  TenantMemberParamsSchema,
  ErrorResponseSchema,
  type AssignRoleDTO,
  type CreateTenantDTO,
  type InviteMemberDTO,
  type SwitchTenantDTO,
  type TenantIdParamsDTO,
  type TenantMemberParamsDTO,
  type UpdateTenantDTO,
} from '../../../application/dto/tenant.dto.js';
import { z } from 'zod';

export const tenantRoutes: FastifyPluginCallback = (app, _opts, done) => {
  const sessionService = new JwtSessionService();
  const authRepository = new PrismaAuthRepository();
  const createTenantUc = new CreateTenant(authRepository);
  const getTenantUc = new GetTenant(authRepository);
  const updateTenantUc = new UpdateTenant(authRepository);
  const inviteMemberUc = new InviteMember(authRepository);
  const assignRoleUc = new AssignRole(authRepository);
  const listTenantMembersUc = new ListTenantMembers(authRepository);
  const switchTenantUc = new SwitchTenant(authRepository, sessionService);
  const listUserTenantsUc = new ListUserTenants(authRepository);
  const removeTenantMemberUc = new RemoveTenantMember(authRepository);

  const controller = new TenantController(
    createTenantUc,
    getTenantUc,
    updateTenantUc,
    inviteMemberUc,
    assignRoleUc,
    listTenantMembersUc,
    switchTenantUc,
    listUserTenantsUc,
    removeTenantMemberUc
  );

  const route = app.withTypeProvider<ZodTypeProvider>();

  route.addHook('preHandler', app.authenticate);

  route.post<{ Body: CreateTenantDTO }>(
    '/',
    {
      schema: {
        body: CreateTenantSchema,
        response: {
          200: TenantResponseSchema,
          400: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.createTenant(request, reply)
  );

  route.get(
    '/',
    {
      schema: {
        response: {
          200: z.array(TenantResponseSchema),
          403: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.listTenants(request, reply)
  );

  route.get<{ Params: TenantIdParamsDTO }>(
    '/:id',
    {
      schema: {
        params: TenantIdParamsSchema,
        response: {
          200: TenantResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.getTenant(request, reply)
  );

  route.put<{ Params: TenantIdParamsDTO; Body: UpdateTenantDTO }>(
    '/:id',
    {
      schema: {
        params: TenantIdParamsSchema,
        body: UpdateTenantSchema,
        response: {
          200: TenantResponseSchema,
          400: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.updateTenant(request, reply)
  );

  route.post<{ Body: SwitchTenantDTO }>(
    '/switch',
    {
      schema: { body: SwitchTenantSchema },
    },
    (request, reply) => controller.switchTenant(request, reply)
  );

  route.get<{ Params: TenantIdParamsDTO }>(
    '/:id/members',
    {
      schema: {
        params: TenantIdParamsSchema,
        response: {
          200: z.array(TenantMemberResponseSchema),
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.listMembers(request, reply)
  );

  route.post<{ Params: TenantIdParamsDTO; Body: InviteMemberDTO }>(
    '/:id/members',
    {
      schema: {
        body: InviteMemberSchema,
        params: TenantIdParamsSchema,
        response: {
          200: TenantMemberResponseSchema,
          400: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.inviteMember(request, reply)
  );

  route.put<{ Params: TenantMemberParamsDTO; Body: AssignRoleDTO }>(
    '/:id/members/:memberId/role',
    {
      schema: {
        body: AssignRoleSchema,
        params: TenantMemberParamsSchema,
        response: {
          200: TenantMemberResponseSchema,
          400: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.assignRole(request, reply)
  );

  route.delete<{ Params: TenantMemberParamsDTO }>(
    '/:id/members/:memberId',
    {
      schema: {
        params: TenantMemberParamsSchema,
        response: {
          200: z.object({ success: z.boolean() }),
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    (request, reply) => controller.removeMember(request, reply)
  );

  done();
};

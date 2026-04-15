import type { FastifyPluginCallback } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { TenantController } from '../controllers/TenantController.js';
import { CreateTenant } from '../../../application/use-cases/CreateTenant.js';
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
  InviteMemberSchema,
  AssignRoleSchema,
  SwitchTenantSchema,
  TenantResponseSchema,
  TenantMemberResponseSchema,
  type AssignRoleDTO,
  type CreateTenantDTO,
  type InviteMemberDTO,
  type SwitchTenantDTO,
} from '../../../application/dto/tenant.dto.js';
import { z } from 'zod';

type TenantIdParams = {
  id: string;
};

type TenantMemberParams = {
  id: string;
  memberId: string;
};

export const tenantRoutes: FastifyPluginCallback = (app, _opts, done) => {
  const sessionService = new JwtSessionService();
  const authRepository = new PrismaAuthRepository();
  const createTenantUc = new CreateTenant(authRepository);
  const inviteMemberUc = new InviteMember(authRepository);
  const assignRoleUc = new AssignRole(authRepository);
  const listTenantMembersUc = new ListTenantMembers(authRepository);
  const switchTenantUc = new SwitchTenant(authRepository, sessionService);
  const listUserTenantsUc = new ListUserTenants(authRepository);
  const removeTenantMemberUc = new RemoveTenantMember(authRepository);

  const controller = new TenantController(
    createTenantUc,
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
        response: { 200: TenantResponseSchema },
      },
    },
    (request, reply) => controller.createTenant(request, reply)
  );

  route.get(
    '/',
    {
      schema: {
        response: { 200: z.array(TenantResponseSchema) },
      },
    },
    (request, reply) => controller.listTenants(request, reply)
  );

  route.post<{ Body: SwitchTenantDTO }>(
    '/switch',
    {
      schema: { body: SwitchTenantSchema },
    },
    (request, reply) => controller.switchTenant(request, reply)
  );

  route.get<{ Params: TenantIdParams }>(
    '/:id/members',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.array(TenantMemberResponseSchema) },
      },
    },
    (request, reply) => controller.listMembers(request, reply)
  );

  route.post<{ Params: TenantIdParams; Body: InviteMemberDTO }>(
    '/:id/members',
    { schema: { body: InviteMemberSchema, params: z.object({ id: z.string() }) } },
    (request, reply) => controller.inviteMember(request, reply)
  );

  route.put<{ Params: TenantMemberParams; Body: AssignRoleDTO }>(
    '/:id/members/:memberId/role',
    {
      schema: {
        body: AssignRoleSchema,
        params: z.object({ id: z.string(), memberId: z.string() }),
      },
    },
    (request, reply) => controller.assignRole(request, reply)
  );

  route.delete<{ Params: TenantMemberParams }>(
    '/:id/members/:memberId',
    { schema: { params: z.object({ id: z.string(), memberId: z.string() }) } },
    (request, reply) => controller.removeMember(request, reply)
  );

  done();
};

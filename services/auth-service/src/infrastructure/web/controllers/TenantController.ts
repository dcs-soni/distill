import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateTenant } from '../../../application/use-cases/CreateTenant.js';
import { GetTenant } from '../../../application/use-cases/GetTenant.js';
import { UpdateTenant } from '../../../application/use-cases/UpdateTenant.js';
import { InviteMember } from '../../../application/use-cases/InviteMember.js';
import { AssignRole } from '../../../application/use-cases/AssignRole.js';
import { ListTenantMembers } from '../../../application/use-cases/ListTenantMembers.js';
import { SwitchTenant } from '../../../application/use-cases/SwitchTenant.js';
import { ListUserTenants } from '../../../application/use-cases/ListUserTenants.js';
import { RemoveTenantMember } from '../../../application/use-cases/RemoveTenantMember.js';
import { ForbiddenError } from '@distill/utils';
import type {
  CreateTenantDTO,
  UpdateTenantDTO,
  TenantIdParamsDTO,
  TenantMemberParamsDTO,
  InviteMemberDTO,
  AssignRoleDTO,
  SwitchTenantDTO,
} from '../../../application/dto/tenant.dto.js';

export class TenantController {
  constructor(
    private readonly createTenantUc: CreateTenant,
    private readonly getTenantUc: GetTenant,
    private readonly updateTenantUc: UpdateTenant,
    private readonly inviteMemberUc: InviteMember,
    private readonly assignRoleUc: AssignRole,
    private readonly listTenantMembersUc: ListTenantMembers,
    private readonly switchTenantUc: SwitchTenant,
    private readonly listUserTenantsUc: ListUserTenants,
    private readonly removeTenantMemberUc: RemoveTenantMember
  ) {}

  async createTenant(request: FastifyRequest<{ Body: CreateTenantDTO }>, reply: FastifyReply) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.createTenantUc.execute(
      request.user.userId,
      request.body.name,
      request.body.slug
    );
    return reply.send(result);
  }

  async listTenants(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const tenants = await this.listUserTenantsUc.execute(request.user.userId);
    return reply.send(tenants);
  }

  async getTenant(request: FastifyRequest<{ Params: TenantIdParamsDTO }>, reply: FastifyReply) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.getTenantUc.execute(request.user.userId, request.params.id);
    return reply.send(result);
  }

  async updateTenant(
    request: FastifyRequest<{ Params: TenantIdParamsDTO; Body: UpdateTenantDTO }>,
    reply: FastifyReply
  ) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.updateTenantUc.execute(
      request.user.userId,
      request.params.id,
      request.body
    );
    return reply.send(result);
  }

  async switchTenant(request: FastifyRequest<{ Body: SwitchTenantDTO }>, reply: FastifyReply) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.switchTenantUc.execute(
      request.user.userId,
      request.user.sid,
      request.body.tenantId
    );
    return reply.send(result);
  }

  async listMembers(request: FastifyRequest<{ Params: TenantIdParamsDTO }>, reply: FastifyReply) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.listTenantMembersUc.execute(request.user.userId, request.params.id);
    return reply.send(result);
  }

  async inviteMember(
    request: FastifyRequest<{ Params: TenantIdParamsDTO; Body: InviteMemberDTO }>,
    reply: FastifyReply
  ) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.inviteMemberUc.execute(
      request.user.userId,
      request.params.id,
      request.body.email,
      request.body.role
    );
    return reply.send(result);
  }

  async assignRole(
    request: FastifyRequest<{ Params: TenantMemberParamsDTO; Body: AssignRoleDTO }>,
    reply: FastifyReply
  ) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.assignRoleUc.execute(
      request.user.userId,
      request.params.id,
      request.params.memberId,
      request.body.role
    );
    return reply.send(result);
  }

  async removeMember(
    request: FastifyRequest<{ Params: TenantMemberParamsDTO }>,
    reply: FastifyReply
  ) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    await this.removeTenantMemberUc.execute(
      request.user.userId,
      request.params.id,
      request.params.memberId
    );
    return reply.send({ success: true });
  }
}

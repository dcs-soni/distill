import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateTenant } from '../../../application/use-cases/CreateTenant.js';
import { InviteMember } from '../../../application/use-cases/InviteMember.js';
import { AssignRole } from '../../../application/use-cases/AssignRole.js';
import { ListTenantMembers } from '../../../application/use-cases/ListTenantMembers.js';
import { SwitchTenant } from '../../../application/use-cases/SwitchTenant.js';
import { ForbiddenError } from '@distill/utils';
import prismaClient from '../../persistence/prismaClient.js';
import type { Tenant } from '@prisma/client';

export class TenantController {
  constructor(
    private createTenantUc: CreateTenant,
    private inviteMemberUc: InviteMember,
    private assignRoleUc: AssignRole,
    private listTenantMembersUc: ListTenantMembers,
    private switchTenantUc: SwitchTenant
  ) {}

  async createTenant(
    request: FastifyRequest<{ Body: { name: string; slug: string } }>,
    reply: FastifyReply
  ) {
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
    const user = await prismaClient.user.findUnique({
      where: { id: request.user.userId },
      include: { memberships: { include: { tenant: true } } },
    });
    const tenants: Tenant[] = user?.memberships.map(({ tenant }) => tenant) ?? [];
    return reply.send(tenants);
  }

  async switchTenant(request: FastifyRequest<{ Body: { tenantId: string } }>, reply: FastifyReply) {
    if (!request.user) throw new ForbiddenError('Unauthorized');
    const result = await this.switchTenantUc.execute(
      request.user.userId,
      request.user.sid,
      request.body.tenantId
    );
    return reply.send(result);
  }

  async listMembers(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await this.listTenantMembersUc.execute(request.params.id);
    return reply.send(result);
  }

  async inviteMember(
    request: FastifyRequest<{ Params: { id: string }; Body: { email: string; role: string } }>,
    reply: FastifyReply
  ) {
    if (request.user?.role !== 'ADMIN') throw new ForbiddenError('Requires ADMIN role');
    const result = await this.inviteMemberUc.execute(
      request.params.id,
      request.body.email,
      request.body.role
    );
    return reply.send(result);
  }

  async assignRole(
    request: FastifyRequest<{ Params: { id: string; memberId: string }; Body: { role: string } }>,
    reply: FastifyReply
  ) {
    if (request.user?.role !== 'ADMIN') throw new ForbiddenError('Requires ADMIN role');
    const result = await this.assignRoleUc.execute(
      request.params.id,
      request.params.memberId,
      request.body.role
    );
    return reply.send(result);
  }

  async removeMember(
    request: FastifyRequest<{ Params: { id: string; memberId: string } }>,
    reply: FastifyReply
  ) {
    if (request.user?.role !== 'ADMIN') throw new ForbiddenError('Requires ADMIN role');
    await prismaClient.tenantMember.delete({ where: { id: request.params.memberId } });
    return reply.send({ success: true });
  }
}

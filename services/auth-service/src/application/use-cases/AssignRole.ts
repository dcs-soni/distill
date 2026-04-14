import prismaClient from '../../infrastructure/persistence/prismaClient.js';
import { NotFoundError } from '@distill/utils';

export class AssignRole {
  async execute(tenantId: string, memberId: string, newRole: string) {
    const membership = await prismaClient.tenantMember.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!membership) {
      throw new NotFoundError('Tenant member not found');
    }

    return await prismaClient.tenantMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });
  }
}

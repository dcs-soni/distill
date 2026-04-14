import prismaClient from '../../infrastructure/persistence/prismaClient.js';
import { NotFoundError, ConflictError } from '@distill/utils';

export class InviteMember {
  async execute(tenantId: string, email: string, role: string) {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundError(`User with email ${email} not found`);
    }

    const existing = await prismaClient.tenantMember.findUnique({
      where: {
        tenantId_userId: { tenantId, userId: user.id },
      },
    });

    if (existing) {
      throw new ConflictError('User is already a member of this tenant');
    }

    return await prismaClient.tenantMember.create({
      data: {
        tenantId,
        userId: user.id,
        role,
      },
    });
  }
}

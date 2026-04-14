import prismaClient from '../../infrastructure/persistence/prismaClient.js';

export class ListTenantMembers {
  async execute(tenantId: string) {
    const members = await prismaClient.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members;
  }
}

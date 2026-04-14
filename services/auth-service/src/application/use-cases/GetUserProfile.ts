import prismaClient from '../../infrastructure/persistence/prismaClient.js';
import { NotFoundError } from '@distill/utils';

export class GetUserProfile {
  async execute(userId: string) {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      tenants: user.memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
        isActive: m.tenant.isActive,
      })),
    };
  }
}

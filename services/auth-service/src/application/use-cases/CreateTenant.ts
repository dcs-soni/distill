import prismaClient from '../../infrastructure/persistence/prismaClient.js';
import { ConflictError } from '@distill/utils';

export class CreateTenant {
  async execute(userId: string, name: string, slug: string) {
    const existing = await prismaClient.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError(`Tenant with slug ${slug} already exists`);
    }

    const tenant = await prismaClient.tenant.create({
      data: {
        name,
        slug,
        memberships: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
      },
    });

    return tenant;
  }
}

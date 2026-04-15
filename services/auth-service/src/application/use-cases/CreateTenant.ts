import { ConflictError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class CreateTenant {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(userId: string, name: string, slug: string) {
    const existing = await this.authRepository.findTenantBySlug(slug);
    if (existing) {
      throw new ConflictError(`Tenant with slug ${slug} already exists`);
    }

    return this.authRepository.createTenantWithAdminMember({
      userId,
      name,
      slug,
      role: 'ADMIN',
    });
  }
}

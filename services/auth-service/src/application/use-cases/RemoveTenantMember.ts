import { NotFoundError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class RemoveTenantMember {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(tenantId: string, memberId: string): Promise<void> {
    const deleted = await this.authRepository.deleteTenantMember(tenantId, memberId);
    if (!deleted) {
      throw new NotFoundError('Tenant member not found');
    }
  }
}

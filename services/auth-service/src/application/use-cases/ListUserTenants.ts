import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class ListUserTenants {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(userId: string) {
    return this.authRepository.listUserTenants(userId);
  }
}

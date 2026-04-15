import { NotFoundError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class GetUserProfile {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(userId: string) {
    const user = await this.authRepository.getUserProfile(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}

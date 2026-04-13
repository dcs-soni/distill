import { ValidationError } from '@distill/utils';
import { UserRole } from '@distill/types';

export class Role {
  private readonly roleName: UserRole;

  constructor(role: string) {
    const validRoles: UserRole[] = ['ADMIN', 'REVIEWER', 'VIEWER', 'API_USER'];
    if (!validRoles.includes(role as UserRole)) {
      throw new ValidationError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }
    this.roleName = role as UserRole;
  }

  get value(): UserRole {
    return this.roleName;
  }

  isAdmin(): boolean {
    return this.roleName === 'ADMIN';
  }

  isAtLeastReviewer(): boolean {
    return this.roleName === 'ADMIN' || this.roleName === 'REVIEWER';
  }
}

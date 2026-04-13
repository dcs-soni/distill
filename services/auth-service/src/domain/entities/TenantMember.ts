import { Role } from '../value-objects/Role.js';

export interface TenantMemberProps {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
  joinedAt: Date;
}

export class TenantMember {
  private props: TenantMemberProps;

  constructor(props: TenantMemberProps) {
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get role(): string {
    return this.props.role.value;
  }
  get joinedAt(): Date {
    return this.props.joinedAt;
  }

  changeRole(newRole: Role): void {
    this.props.role = newRole;
  }

  isAdmin(): boolean {
    return this.props.role.isAdmin();
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      role: this.role,
      joinedAt: this.joinedAt.toISOString(),
    };
  }
}

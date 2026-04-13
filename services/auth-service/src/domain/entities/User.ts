import { Email } from '../value-objects/Email.js';
import { ValidationError } from '@distill/utils';

export interface UserProps {
  id: string;
  email: Email;
  name: string;
  oidcSubject: string;
  oidcIssuer: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    if (!props.oidcSubject || props.oidcSubject.trim() === '') {
      throw new ValidationError('User must have an OIDC subject');
    }
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email.value;
  }
  get name(): string {
    return this.props.name;
  }
  get oidcSubject(): string {
    return this.props.oidcSubject;
  }
  get oidcIssuer(): string {
    return this.props.oidcIssuer;
  }
  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  updateLastLogin(date: Date = new Date()): void {
    this.props.lastLoginAt = date;
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatarUrl: this.avatarUrl,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt?.toISOString(),
      createdAt: this.createdAt.toISOString(),
    };
  }
}

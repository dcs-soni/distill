import { TenantSlug } from '../value-objects/TenantSlug.js';
import { ValidationError } from '@distill/utils';

export interface TenantSettings {
  allowAutoApprove: boolean;
  minConfidence: number;
}

export interface TenantProps {
  id: string;
  name: string;
  slug: TenantSlug;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  settings: TenantSettings;
  isActive: boolean;
  createdAt: Date;
}

export class Tenant {
  private props: TenantProps;

  constructor(props: TenantProps) {
    if (!props.name || props.name.trim() === '') {
      throw new ValidationError('Tenant name cannot be empty');
    }
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug.value;
  }
  get plan(): 'FREE' | 'PRO' | 'ENTERPRISE' {
    return this.props.plan;
  }
  get settings(): TenantSettings {
    return this.props.settings;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  updateSettings(settings: Partial<TenantSettings>): void {
    this.props.settings = { ...this.props.settings, ...settings };
  }

  upgradePlan(plan: 'PRO' | 'ENTERPRISE'): void {
    this.props.plan = plan;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      plan: this.plan,
      settings: this.settings,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

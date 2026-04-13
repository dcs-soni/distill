import { ValidationError } from '@distill/utils';

export class TenantSlug {
  private readonly slug: string;

  constructor(slug: string) {
    if (!slug) {
      throw new ValidationError('Tenant slug cannot be empty');
    }
    const sanitized = slug.trim().toLowerCase();
    if (sanitized.length < 3) {
      throw new ValidationError('Tenant slug must be at least 3 characters long');
    }
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(sanitized)) {
      throw new ValidationError(
        'Tenant slug must be URL-safe (lowercase letters, numbers, and hyphens only)'
      );
    }
    this.slug = sanitized;
  }

  get value(): string {
    return this.slug;
  }

  equals(other: TenantSlug): boolean {
    return this.slug === other.value;
  }
}

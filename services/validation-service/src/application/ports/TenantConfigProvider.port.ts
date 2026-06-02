import { TenantValidationConfig } from '../../domain/value-objects/TenantValidationConfig';

export interface TenantConfigProvider {
  getValidationConfig(tenantId: string): Promise<TenantValidationConfig>;
  updateValidationConfig(tenantId: string, config: Partial<TenantValidationConfig>): Promise<TenantValidationConfig>;
}

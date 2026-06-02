import { TenantConfigProvider } from '../../application/ports/TenantConfigProvider.port';
import { TenantValidationConfig, DEFAULT_VALIDATION_CONFIG } from '../../domain/value-objects/TenantValidationConfig';
import Redis from 'ioredis';
import { AppError } from '@distill/utils';

export class TenantConfigAdapter implements TenantConfigProvider {
  constructor(
    private readonly redis: Redis,
    private readonly authServiceUrl: string,
    private readonly logger: any
  ) {}

  async getValidationConfig(tenantId: string): Promise<TenantValidationConfig> {
    const cacheKey = `tenant:config:${tenantId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      this.logger.warn({ error: e, tenantId }, 'Failed to read from Redis cache');
    }

    try {
      const response = await fetch(`${this.authServiceUrl}/api/tenants/${tenantId}/config`, {
        headers: {
          'X-Internal-Service': 'validation-service'
        }
      });

      if (!response.ok) {
        throw new Error(`Auth service returned ${response.status}`);
      }

      const data = await response.json();
      const config = { ...DEFAULT_VALIDATION_CONFIG, ...(data.settings?.validation || {}) };

      try {
        await this.redis.set(cacheKey, JSON.stringify(config), 'EX', 300); // 5 min TTL
      } catch (e) {
        this.logger.warn({ error: e, tenantId }, 'Failed to write to Redis cache');
      }

      return config;
    } catch (error) {
      this.logger.error({ error, tenantId }, 'Failed to fetch tenant config, using defaults');
      return DEFAULT_VALIDATION_CONFIG;
    }
  }

  async updateValidationConfig(tenantId: string, config: Partial<TenantValidationConfig>): Promise<TenantValidationConfig> {
    // In reality this would PUT to auth-service.
    // For this milestone, we will simulate it by clearing the cache and throwing an error if the user tries it without auth-service support
    const cacheKey = `tenant:config:${tenantId}`;
    try {
      await this.redis.del(cacheKey);
    } catch (e) {}

    throw new AppError('updateValidationConfig must be routed via Auth Service directly', 'NOT_IMPLEMENTED', 501);
  }
}

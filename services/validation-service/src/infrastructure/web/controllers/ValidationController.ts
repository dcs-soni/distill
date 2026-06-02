import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidateExtraction } from '../../../application/use-cases/ValidateExtraction';
import { TenantConfigProvider } from '../../../application/ports/TenantConfigProvider.port';
import { ValidateExtractionRequest } from '../../../application/dto/ValidateExtractionRequest';
import { ValidationConfigUpdateRequest } from '../../../application/dto/ValidationConfigUpdateRequest';
import { TenantValidationConfig } from '../../../domain/value-objects/TenantValidationConfig';
import { ALL_RULES } from '../../../domain/rules';

export class ValidationController {
  constructor(
    private readonly validateExtraction: ValidateExtraction,
    private readonly configProvider: TenantConfigProvider
  ) {}

  async triggerValidation(
    req: FastifyRequest<{ Body: ValidateExtractionRequest }>,
    reply: FastifyReply
  ) {
    const requestPayload = req.body;

    // Security check: tenantId must match the token's tenantId if multi-tenant architecture enforces it
    // Assuming gateway strips and injects X-Tenant-Id header
    const tenantIdFromHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdFromHeader && tenantIdFromHeader !== requestPayload.tenantId) {
      return reply.status(403).send({ error: 'Tenant mismatch' });
    }

    const result = await this.validateExtraction.execute(requestPayload);
    return reply.status(200).send(result);
  }

  async listRules(req: FastifyRequest, reply: FastifyReply) {
    const rules = ALL_RULES.map((r) => ({
      name: r.name,
      category: r.category,
      severity: r.severity,
      description: r.description,
    }));
    return reply.status(200).send(rules);
  }

  async getConfig(req: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) {
    const tenantIdFromHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdFromHeader && tenantIdFromHeader !== req.params.tenantId) {
      return reply.status(403).send({ error: 'Tenant mismatch' });
    }

    const config = await this.configProvider.getValidationConfig(req.params.tenantId);
    return reply.status(200).send(config);
  }

  async updateConfig(
    req: FastifyRequest<{ Params: { tenantId: string }; Body: ValidationConfigUpdateRequest }>,
    reply: FastifyReply
  ) {
    const tenantIdFromHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdFromHeader && tenantIdFromHeader !== req.params.tenantId) {
      return reply.status(403).send({ error: 'Tenant mismatch' });
    }

    const config = await this.configProvider.updateValidationConfig(
      req.params.tenantId,
      req.body as unknown as TenantValidationConfig
    );
    return reply.status(200).send(config);
  }
}

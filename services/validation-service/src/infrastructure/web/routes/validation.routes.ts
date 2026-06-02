import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ValidationController } from '../controllers/ValidationController';
import { ValidateExtractionRequestSchema } from '../../../application/dto/ValidateExtractionRequest';
import { ValidationConfigUpdateRequestSchema } from '../../../application/dto/ValidationConfigUpdateRequest';
import { z } from 'zod';

export default async function validationRoutes(fastify: FastifyInstance, options: { controller: ValidationController }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { controller } = options;

  app.post('/validate', {
    schema: {
      body: ValidateExtractionRequestSchema,
      response: {
        200: z.any()
      }
    }
  }, controller.triggerValidation.bind(controller));

  app.get('/rules', {
    schema: {
      response: {
        200: z.array(z.object({
          name: z.string(),
          category: z.string(),
          severity: z.string(),
          description: z.string()
        }))
      }
    }
  }, controller.listRules.bind(controller));

  app.get('/tenants/:tenantId/config', {
    schema: {
      params: z.object({
        tenantId: z.string()
      }),
      response: {
        200: z.any()
      }
    }
  }, controller.getConfig.bind(controller));

  app.put('/tenants/:tenantId/config', {
    schema: {
      params: z.object({
        tenantId: z.string()
      }),
      body: ValidationConfigUpdateRequestSchema,
      response: {
        200: z.any()
      }
    }
  }, controller.updateConfig.bind(controller));
}

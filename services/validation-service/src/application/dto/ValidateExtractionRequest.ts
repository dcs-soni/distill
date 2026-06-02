import { z } from 'zod';

export const ValidateExtractionRequestSchema = z.object({
  documentId: z.string(),
  tenantId: z.string(),
  extractionId: z.string(),
});

export type ValidateExtractionRequest = z.infer<typeof ValidateExtractionRequestSchema>;

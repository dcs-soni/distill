import { z } from 'zod';

export const ValidationConfigUpdateRequestSchema = z.object({
  autoApproveThreshold: z.number().min(0).max(1).optional(),
  reviewThreshold: z.number().min(0).max(1).optional(),
  fieldConfidenceMin: z.number().min(0).max(1).optional(),
  requiredFields: z.array(z.string()).optional(),
  disabledRules: z.array(z.string()).optional(),
  tolerances: z.object({
    revenueVsProfit: z.number().min(0).max(1).optional(),
    assetsVsLiabilities: z.number().min(0).max(1).optional(),
  }).optional()
}).refine(data => {
  if (data.autoApproveThreshold !== undefined && data.reviewThreshold !== undefined) {
    return data.autoApproveThreshold >= data.reviewThreshold;
  }
  return true;
}, {
  message: "autoApproveThreshold must be greater than or equal to reviewThreshold"
});

export type ValidationConfigUpdateRequest = z.infer<typeof ValidationConfigUpdateRequestSchema>;

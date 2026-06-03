import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ReviewController } from '../controllers/ReviewController.js';

// eslint-disable-next-line @typescript-eslint/require-await
export async function reviewRoutes(
  fastify: FastifyInstance,
  options: { controller: ReviewController }
) {
  const { controller } = options;

  fastify.get(
    '/',
    {
      schema: {
        querystring: z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
          priority: z.enum(['NORMAL', 'HIGH', 'ESCALATED']).optional(),
          docType: z.string().optional(),
          sortBy: z.enum(['priority', 'createdAt', 'confidence']).optional(),
        }),
      },
    },
    controller.getPendingReviews
  );

  fastify.get('/stats', controller.getReviewerStats);

  fastify.get(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    controller.getReviewDetail
  );

  fastify.post(
    '/:id/action',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          action: z.enum(['APPROVED', 'CORRECTED', 'REJECTED', 'ESCALATED']),
          corrections: z
            .array(
              z.object({
                field: z.string(),
                originalValue: z.unknown(),
                correctedValue: z.unknown(),
              })
            )
            .optional(),
          notes: z.string().optional(),
          durationMs: z.number().int().positive(),
        }),
      },
    },
    controller.submitReview
  );
}

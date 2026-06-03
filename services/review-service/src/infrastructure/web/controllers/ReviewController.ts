import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Correction } from '@distill/types';
import { UnauthorizedError, ForbiddenError } from '@distill/utils';
import type { GetPendingReviews } from '../../../application/use-cases/GetPendingReviews.js';
import type { GetReviewDetail } from '../../../application/use-cases/GetReviewDetail.js';
import type { SubmitReview } from '../../../application/use-cases/SubmitReview.js';
import type { GetReviewerStats } from '../../../application/use-cases/GetReviewerStats.js';

export class ReviewController {
  constructor(
    private readonly getPendingReviewsUseCase: GetPendingReviews,
    private readonly getReviewDetailUseCase: GetReviewDetail,
    private readonly submitReviewUseCase: SubmitReview,
    private readonly getReviewerStatsUseCase: GetReviewerStats
  ) {}

  private extractTenantAndUser(req: FastifyRequest) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const role = req.headers['x-user-role'] as string;

    if (!tenantId || !userId) {
      throw new UnauthorizedError('Missing tenant or user context');
    }

    return { tenantId, userId, role };
  }

  getPendingReviews = async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, role } = this.extractTenantAndUser(req);

    if (role !== 'ADMIN' && role !== 'REVIEWER') {
      throw new ForbiddenError('Insufficient permissions');
    }

    const query = req.query as {
      page?: string;
      limit?: string;
      sortBy?: string;
      priority?: string;
    };
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);

    const result = await this.getPendingReviewsUseCase.execute(
      tenantId,
      page,
      limit,
      query.sortBy,
      query.priority
    );

    return reply.send(result);
  };

  getReviewDetail = async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, role } = this.extractTenantAndUser(req);

    if (role !== 'ADMIN' && role !== 'REVIEWER') {
      throw new ForbiddenError('Insufficient permissions');
    }

    const { id } = req.params as { id: string };
    const result = await this.getReviewDetailUseCase.execute(tenantId, id);

    return reply.send(result);
  };

  submitReview = async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId, role } = this.extractTenantAndUser(req);

    if (role !== 'ADMIN' && role !== 'REVIEWER') {
      throw new ForbiddenError('Insufficient permissions');
    }

    const { id } = req.params as { id: string };
    const body = req.body as {
      action: 'APPROVED' | 'CORRECTED' | 'REJECTED' | 'ESCALATED';
      corrections?: Correction[];
      notes?: string;
      durationMs: number;
    };

    const result = await this.submitReviewUseCase.execute({
      tenantId,
      reviewId: id,
      reviewerId: userId,
      action: body.action,
      corrections: body.corrections,
      notes: body.notes,
      durationMs: body.durationMs,
    });

    return reply.send(result);
  };

  getReviewerStats = async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId, role } = this.extractTenantAndUser(req);

    if (role !== 'ADMIN' && role !== 'REVIEWER') {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Admins can see stats for any reviewer by passing reviewerId in query, otherwise it's self
    const query = req.query as { reviewerId?: string };
    let targetReviewerId = userId;

    if (query.reviewerId) {
      if (role !== 'ADMIN' && query.reviewerId !== userId) {
        throw new ForbiddenError('Cannot view stats for other reviewers');
      }
      targetReviewerId = query.reviewerId;
    }

    const result = await this.getReviewerStatsUseCase.execute(tenantId, targetReviewerId);

    return reply.send(result);
  };
}

import type { ReviewAction } from '@distill/types';

export const REVIEW_ACTIONS: ReviewAction[] = ['APPROVED', 'CORRECTED', 'REJECTED', 'ESCALATED'];

export function isValidReviewAction(action: string): action is ReviewAction {
  return (REVIEW_ACTIONS as string[]).includes(action);
}

export const REVIEW_PRIORITIES = ['NORMAL', 'HIGH', 'ESCALATED'] as const;
export type ReviewPriority = (typeof REVIEW_PRIORITIES)[number];

export function isValidReviewPriority(priority: string): priority is ReviewPriority {
  return REVIEW_PRIORITIES.includes(priority as ReviewPriority);
}

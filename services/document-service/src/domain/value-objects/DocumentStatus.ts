import { ValidationError } from '@distill/utils';

const VALID_TRANSITIONS: Record<string, string[]> = {
  QUEUED: ['PROCESSING', 'FAILED'],
  PROCESSING: ['EXTRACTED', 'FAILED'],
  EXTRACTED: ['VALIDATED', 'REVIEW_NEEDED', 'FAILED'],
  VALIDATED: ['APPROVED'],
  REVIEW_NEEDED: ['APPROVED', 'REJECTED', 'FAILED'],
  APPROVED: [],
  REJECTED: [],
  FAILED: ['QUEUED'],
};

const ALL_STATUSES = Object.keys(VALID_TRANSITIONS);

export type DocumentStatusValue =
  | 'QUEUED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'VALIDATED'
  | 'REVIEW_NEEDED'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED';

export class DocumentStatus {
  private readonly status: DocumentStatusValue;

  constructor(value: string) {
    if (!ALL_STATUSES.includes(value)) {
      throw new ValidationError(`Invalid document status: ${value}`);
    }
    this.status = value as DocumentStatusValue;
  }

  get value(): DocumentStatusValue {
    return this.status;
  }

  canTransitionTo(next: DocumentStatusValue): boolean {
    return VALID_TRANSITIONS[this.status].includes(next);
  }

  transitionTo(next: DocumentStatusValue): DocumentStatus {
    if (!this.canTransitionTo(next)) {
      throw new ValidationError(`Invalid state transition: ${this.status} → ${next}`);
    }
    return new DocumentStatus(next);
  }

  isTerminal(): boolean {
    return VALID_TRANSITIONS[this.status].length === 0;
  }

  equals(other: DocumentStatus): boolean {
    return this.status === other.value;
  }
}

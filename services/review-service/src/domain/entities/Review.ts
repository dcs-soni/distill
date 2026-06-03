import type { ReviewAction, Correction } from '@distill/types';
import { ReviewPriority } from '../value-objects/ReviewPriority.js';

export interface ReviewProps {
  id: string;
  tenantId: string;
  documentId: string;
  extractionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: ReviewPriority;
  reviewerId: string | null;
  action: ReviewAction | null;
  corrections: Correction[];
  notes: string | null;
  durationMs: number | null;
  assignedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Review {
  private props: ReviewProps;

  constructor(props: ReviewProps) {
    this.props = { ...props };
  }

  get id() {
    return this.props.id;
  }
  get tenantId() {
    return this.props.tenantId;
  }
  get documentId() {
    return this.props.documentId;
  }
  get extractionId() {
    return this.props.extractionId;
  }
  get status() {
    return this.props.status;
  }
  get priority() {
    return this.props.priority;
  }
  get reviewerId() {
    return this.props.reviewerId;
  }
  get action() {
    return this.props.action;
  }
  get corrections() {
    return [...this.props.corrections];
  }
  get notes() {
    return this.props.notes;
  }
  get durationMs() {
    return this.props.durationMs;
  }
  get createdAt() {
    return this.props.createdAt;
  }

  static create(
    props: Omit<
      ReviewProps,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'status'
      | 'reviewerId'
      | 'action'
      | 'corrections'
      | 'notes'
      | 'durationMs'
      | 'assignedAt'
      | 'completedAt'
    > & { id: string }
  ): Review {
    return new Review({
      ...props,
      status: 'PENDING',
      reviewerId: null,
      action: null,
      corrections: [],
      notes: null,
      durationMs: null,
      assignedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  startReview(reviewerId: string): void {
    if (this.props.status === 'COMPLETED') {
      throw new Error('Cannot start a completed review');
    }
    this.props.status = 'IN_PROGRESS';
    this.props.reviewerId = reviewerId;
    this.props.assignedAt = new Date();
    this.props.updatedAt = new Date();
  }

  submitApproval(reviewerId: string, durationMs: number): void {
    this.validateReviewerAndStatus(reviewerId);
    this.props.action = 'APPROVED';
    this.props.durationMs = durationMs;
    this.markCompleted();
  }

  submitCorrection(reviewerId: string, corrections: Correction[], durationMs: number): void {
    this.validateReviewerAndStatus(reviewerId);
    if (!corrections || corrections.length === 0) {
      throw new Error('Corrections must be provided for CORRECTED action');
    }
    this.props.action = 'CORRECTED';
    this.props.corrections = corrections;
    this.props.durationMs = durationMs;
    this.markCompleted();
  }

  submitRejection(reviewerId: string, notes: string, durationMs: number): void {
    this.validateReviewerAndStatus(reviewerId);
    if (!notes || notes.trim().length === 0) {
      throw new Error('Notes must be provided for REJECTED action');
    }
    this.props.action = 'REJECTED';
    this.props.notes = notes;
    this.props.durationMs = durationMs;
    this.markCompleted();
  }

  escalate(reviewerId: string, notes: string, durationMs: number): void {
    this.validateReviewerAndStatus(reviewerId);
    if (!notes || notes.trim().length === 0) {
      throw new Error('Notes must be provided for ESCALATED action');
    }
    this.props.action = 'ESCALATED';
    this.props.priority = 'ESCALATED';
    this.props.notes = notes;
    this.props.durationMs = durationMs;
    // Note: Escalate does NOT mark the review as COMPLETED because it goes back into the queue
    this.props.status = 'PENDING';
    this.props.reviewerId = null;
    this.props.assignedAt = null;
    this.props.updatedAt = new Date();
  }

  isCompleted(): boolean {
    return this.props.status === 'COMPLETED';
  }

  toDTO(): ReviewProps {
    return { ...this.props };
  }

  private validateReviewerAndStatus(reviewerId: string): void {
    if (this.props.status === 'COMPLETED') {
      throw new Error('Review is already completed');
    }
    if (this.props.reviewerId && this.props.reviewerId !== reviewerId) {
      throw new Error('Review is currently assigned to another reviewer');
    }
  }

  private markCompleted(): void {
    this.props.status = 'COMPLETED';
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }
}

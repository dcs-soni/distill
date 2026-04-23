import { ValidationError } from '@distill/utils';

export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BatchProps {
  id: string;
  tenantId: string;
  name: string;
  totalDocuments: number;
  processedCount: number;
  failedCount: number;
  status: BatchStatus;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Batch {
  private props: BatchProps;

  constructor(props: BatchProps) {
    if (!props.tenantId || props.tenantId.trim() === '') {
      throw new ValidationError('Batch must have a tenantId');
    }
    if (!props.name || props.name.trim() === '') {
      throw new ValidationError('Batch must have a name');
    }
    if (props.totalDocuments <= 0) {
      throw new ValidationError('Batch must have at least 1 document');
    }
    if (props.totalDocuments > 100) {
      throw new ValidationError('Batch cannot exceed 100 documents');
    }
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get totalDocuments(): number {
    return this.props.totalDocuments;
  }
  get processedCount(): number {
    return this.props.processedCount;
  }
  get failedCount(): number {
    return this.props.failedCount;
  }
  get status(): BatchStatus {
    return this.props.status;
  }
  get uploadedById(): string {
    return this.props.uploadedById;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  incrementProcessed(): void {
    this.props.processedCount += 1;
    this.props.updatedAt = new Date();
    if (this.isComplete()) {
      this.props.status =
        this.props.failedCount === this.props.totalDocuments ? 'FAILED' : 'COMPLETED';
    }
  }

  incrementFailed(): void {
    this.props.failedCount += 1;
    this.props.processedCount += 1;
    this.props.updatedAt = new Date();
    if (this.isComplete()) {
      this.props.status =
        this.props.failedCount === this.props.totalDocuments ? 'FAILED' : 'COMPLETED';
    }
  }

  markProcessing(): void {
    this.props.status = 'PROCESSING';
    this.props.updatedAt = new Date();
  }

  isComplete(): boolean {
    return this.props.processedCount >= this.props.totalDocuments;
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      totalDocuments: this.totalDocuments,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      status: this.status,
      uploadedById: this.uploadedById,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

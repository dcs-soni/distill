import { ValidationError } from '@distill/utils';
import { DocumentStatus, type DocumentStatusValue } from '../value-objects/DocumentStatus.js';
import { FileName, FileSize, MimeType } from '../value-objects/FileProperties.js';

export interface DocumentProps {
  id: string;
  tenantId: string;
  fileName: FileName;
  mimeType: MimeType;
  fileSize: FileSize;
  s3Key: string;
  status: DocumentStatus;
  documentType?: string;
  pageCount?: number;
  isScanned?: boolean;
  uploadedById: string;
  batchId?: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Document {
  private props: DocumentProps;

  constructor(props: DocumentProps) {
    if (!props.tenantId || props.tenantId.trim() === '') {
      throw new ValidationError('Document must have a tenantId');
    }
    if (!props.uploadedById || props.uploadedById.trim() === '') {
      throw new ValidationError('Document must have an uploadedById');
    }
    if (!props.s3Key || props.s3Key.trim() === '') {
      throw new ValidationError('Document must have an s3Key');
    }
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get fileName(): string {
    return this.props.fileName.value;
  }
  get mimeType(): string {
    return this.props.mimeType.value;
  }
  get fileSize(): number {
    return this.props.fileSize.value;
  }
  get s3Key(): string {
    return this.props.s3Key;
  }
  get status(): DocumentStatusValue {
    return this.props.status.value;
  }
  get documentType(): string | undefined {
    return this.props.documentType;
  }
  get pageCount(): number | undefined {
    return this.props.pageCount;
  }
  get isScanned(): boolean | undefined {
    return this.props.isScanned;
  }
  get uploadedById(): string {
    return this.props.uploadedById;
  }
  get batchId(): string | undefined {
    return this.props.batchId;
  }
  get retryCount(): number {
    return this.props.retryCount;
  }
  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  startProcessing(): void {
    this.props.status = this.props.status.transitionTo('PROCESSING');
    this.props.updatedAt = new Date();
  }

  markExtracted(documentType: string, pageCount: number, isScanned: boolean): void {
    this.props.status = this.props.status.transitionTo('EXTRACTED');
    this.props.documentType = documentType;
    this.props.pageCount = pageCount;
    this.props.isScanned = isScanned;
    this.props.updatedAt = new Date();
  }

  markValidated(): void {
    this.props.status = this.props.status.transitionTo('VALIDATED');
    this.props.updatedAt = new Date();
  }

  markReviewNeeded(): void {
    this.props.status = this.props.status.transitionTo('REVIEW_NEEDED');
    this.props.updatedAt = new Date();
  }

  approve(): void {
    const validFrom: DocumentStatusValue[] = ['VALIDATED', 'REVIEW_NEEDED'];
    if (!validFrom.includes(this.props.status.value)) {
      throw new ValidationError(`Cannot approve document in status: ${this.props.status.value}`);
    }
    this.props.status = this.props.status.transitionTo('APPROVED');
    this.props.updatedAt = new Date();
  }

  reject(): void {
    this.props.status = this.props.status.transitionTo('REJECTED');
    this.props.updatedAt = new Date();
  }

  markFailed(errorMessage: string): void {
    this.props.status = this.props.status.transitionTo('FAILED');
    this.props.errorMessage = errorMessage;
    this.props.retryCount += 1;
    this.props.updatedAt = new Date();
  }

  canRetry(): boolean {
    return this.props.status.value === 'FAILED' && this.props.retryCount < 3;
  }

  requeueForRetry(): void {
    if (!this.canRetry()) {
      throw new ValidationError(
        'Document cannot be retried (max retries reached or not in FAILED state)'
      );
    }
    this.props.status = this.props.status.transitionTo('QUEUED');
    this.props.errorMessage = undefined;
    this.props.updatedAt = new Date();
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      fileName: this.fileName,
      mimeType: this.mimeType,
      fileSize: this.fileSize,
      s3Key: this.s3Key,
      status: this.status,
      documentType: this.documentType,
      pageCount: this.pageCount,
      isScanned: this.isScanned,
      uploadedById: this.uploadedById,
      batchId: this.batchId,
      retryCount: this.retryCount,
      errorMessage: this.errorMessage,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

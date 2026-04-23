import { describe, it, expect } from 'vitest';
import { Document } from '../../../src/domain/entities/Document.js';
import { DocumentStatus } from '../../../src/domain/value-objects/DocumentStatus.js';
import { FileName, FileSize, MimeType } from '../../../src/domain/value-objects/FileProperties.js';

function createValidProps(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'doc-123',
    tenantId: 'tenant-abc',
    fileName: new FileName('report.pdf'),
    mimeType: new MimeType('application/pdf'),
    fileSize: new FileSize(1024),
    s3Key: 'tenant-abc/documents/doc-123/report.pdf',
    status: new DocumentStatus('QUEUED'),
    uploadedById: 'user-456',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Document Entity', () => {
  describe('construction', () => {
    it('creates a valid document with all required fields', () => {
      const doc = new Document(createValidProps());
      expect(doc.id).toBe('doc-123');
      expect(doc.tenantId).toBe('tenant-abc');
      expect(doc.fileName).toBe('report.pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.fileSize).toBe(1024);
      expect(doc.s3Key).toBe('tenant-abc/documents/doc-123/report.pdf');
      expect(doc.status).toBe('QUEUED');
      expect(doc.uploadedById).toBe('user-456');
      expect(doc.retryCount).toBe(0);
    });

    it('throws ValidationError when tenantId is empty', () => {
      expect(() => new Document(createValidProps({ tenantId: '' }))).toThrow('tenantId');
    });

    it('throws ValidationError when tenantId is whitespace only', () => {
      expect(() => new Document(createValidProps({ tenantId: '   ' }))).toThrow('tenantId');
    });

    it('throws ValidationError when uploadedById is empty', () => {
      expect(() => new Document(createValidProps({ uploadedById: '' }))).toThrow('uploadedById');
    });

    it('throws ValidationError when uploadedById is whitespace only', () => {
      expect(() => new Document(createValidProps({ uploadedById: '   ' }))).toThrow('uploadedById');
    });

    it('throws ValidationError when s3Key is empty', () => {
      expect(() => new Document(createValidProps({ s3Key: '' }))).toThrow('s3Key');
    });

    it('throws ValidationError when s3Key is whitespace only', () => {
      expect(() => new Document(createValidProps({ s3Key: '   ' }))).toThrow('s3Key');
    });

    it('accepts optional fields as undefined', () => {
      const doc = new Document(createValidProps());
      expect(doc.documentType).toBeUndefined();
      expect(doc.pageCount).toBeUndefined();
      expect(doc.isScanned).toBeUndefined();
      expect(doc.batchId).toBeUndefined();
      expect(doc.errorMessage).toBeUndefined();
    });

    it('accepts optional fields when provided', () => {
      const doc = new Document(
        createValidProps({
          documentType: 'annual_report',
          pageCount: 42,
          isScanned: false,
          batchId: 'batch-1',
          errorMessage: 'some error',
        })
      );
      expect(doc.documentType).toBe('annual_report');
      expect(doc.pageCount).toBe(42);
      expect(doc.isScanned).toBe(false);
      expect(doc.batchId).toBe('batch-1');
      expect(doc.errorMessage).toBe('some error');
    });
  });

  describe('state transitions', () => {
    it('transitions from QUEUED to PROCESSING', () => {
      const doc = new Document(createValidProps());
      doc.startProcessing();
      expect(doc.status).toBe('PROCESSING');
    });

    it('transitions from PROCESSING to EXTRACTED', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('PROCESSING') }));
      doc.markExtracted('annual_report', 30, false);
      expect(doc.status).toBe('EXTRACTED');
      expect(doc.documentType).toBe('annual_report');
      expect(doc.pageCount).toBe(30);
      expect(doc.isScanned).toBe(false);
    });

    it('transitions from EXTRACTED to VALIDATED', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('EXTRACTED') }));
      doc.markValidated();
      expect(doc.status).toBe('VALIDATED');
    });

    it('transitions from EXTRACTED to REVIEW_NEEDED', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('EXTRACTED') }));
      doc.markReviewNeeded();
      expect(doc.status).toBe('REVIEW_NEEDED');
    });

    it('transitions from VALIDATED to APPROVED', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('VALIDATED') }));
      doc.approve();
      expect(doc.status).toBe('APPROVED');
    });

    it('transitions from REVIEW_NEEDED to APPROVED', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('REVIEW_NEEDED') }));
      doc.approve();
      expect(doc.status).toBe('APPROVED');
    });

    it('transitions from REVIEW_NEEDED to REJECTED', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('REVIEW_NEEDED') }));
      doc.reject();
      expect(doc.status).toBe('REJECTED');
    });

    it('throws when approving from QUEUED', () => {
      const doc = new Document(createValidProps());
      expect(() => doc.approve()).toThrow('Cannot approve');
    });

    it('throws when approving from PROCESSING', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('PROCESSING') }));
      expect(() => doc.approve()).toThrow('Cannot approve');
    });

    it('transitions to FAILED from QUEUED', () => {
      const doc = new Document(createValidProps());
      doc.markFailed('network error');
      expect(doc.status).toBe('FAILED');
      expect(doc.errorMessage).toBe('network error');
      expect(doc.retryCount).toBe(1);
    });

    it('transitions to FAILED from PROCESSING', () => {
      const doc = new Document(createValidProps({ status: new DocumentStatus('PROCESSING') }));
      doc.markFailed('extraction timeout');
      expect(doc.status).toBe('FAILED');
      expect(doc.retryCount).toBe(1);
    });

    it('updates the updatedAt timestamp on state transition', () => {
      const oldDate = new Date('2020-01-01');
      const doc = new Document(createValidProps({ updatedAt: oldDate }));
      doc.startProcessing();
      expect(doc.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('retry logic', () => {
    it('canRetry returns true when FAILED with retryCount < 3', () => {
      const doc = new Document(
        createValidProps({
          status: new DocumentStatus('FAILED'),
          retryCount: 0,
        })
      );
      expect(doc.canRetry()).toBe(true);
    });

    it('canRetry returns true when FAILED with retryCount 2', () => {
      const doc = new Document(
        createValidProps({
          status: new DocumentStatus('FAILED'),
          retryCount: 2,
        })
      );
      expect(doc.canRetry()).toBe(true);
    });

    it('canRetry returns false when retryCount >= 3', () => {
      const doc = new Document(
        createValidProps({
          status: new DocumentStatus('FAILED'),
          retryCount: 3,
        })
      );
      expect(doc.canRetry()).toBe(false);
    });

    it('canRetry returns false when not in FAILED status', () => {
      const doc = new Document(createValidProps());
      expect(doc.canRetry()).toBe(false);
    });

    it('requeueForRetry transitions FAILED back to QUEUED', () => {
      const doc = new Document(
        createValidProps({
          status: new DocumentStatus('FAILED'),
          retryCount: 1,
          errorMessage: 'old error',
        })
      );
      doc.requeueForRetry();
      expect(doc.status).toBe('QUEUED');
      expect(doc.errorMessage).toBeUndefined();
    });

    it('requeueForRetry throws when max retries reached', () => {
      const doc = new Document(
        createValidProps({
          status: new DocumentStatus('FAILED'),
          retryCount: 3,
        })
      );
      expect(() => doc.requeueForRetry()).toThrow('cannot be retried');
    });

    it('requeueForRetry throws when not in FAILED state', () => {
      const doc = new Document(createValidProps());
      expect(() => doc.requeueForRetry()).toThrow('cannot be retried');
    });
  });

  describe('toDTO', () => {
    it('serializes all fields to a plain object', () => {
      const now = new Date('2026-01-15T10:00:00Z');
      const doc = new Document(
        createValidProps({
          createdAt: now,
          updatedAt: now,
          documentType: 'annual_report',
          pageCount: 25,
          isScanned: true,
          batchId: 'batch-1',
        })
      );

      const dto = doc.toDTO();
      expect(dto.id).toBe('doc-123');
      expect(dto.tenantId).toBe('tenant-abc');
      expect(dto.fileName).toBe('report.pdf');
      expect(dto.mimeType).toBe('application/pdf');
      expect(dto.fileSize).toBe(1024);
      expect(dto.status).toBe('QUEUED');
      expect(dto.documentType).toBe('annual_report');
      expect(dto.pageCount).toBe(25);
      expect(dto.isScanned).toBe(true);
      expect(dto.batchId).toBe('batch-1');
      expect(dto.createdAt).toBe('2026-01-15T10:00:00.000Z');
      expect(dto.updatedAt).toBe('2026-01-15T10:00:00.000Z');
    });

    it('serializes undefined optional fields', () => {
      const dto = new Document(createValidProps()).toDTO();
      expect(dto.documentType).toBeUndefined();
      expect(dto.pageCount).toBeUndefined();
      expect(dto.batchId).toBeUndefined();
    });
  });
});

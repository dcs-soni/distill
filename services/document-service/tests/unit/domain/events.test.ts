import { describe, it, expect } from 'vitest';
import { createDocumentUploadedEvent } from '../../../src/domain/events/DocumentUploaded.js';
import { createDocumentFailedEvent } from '../../../src/domain/events/DocumentFailed.js';

describe('DocumentUploaded Event', () => {
  it('creates an event with all required fields', () => {
    const event = createDocumentUploadedEvent(
      {
        documentId: 'doc-1',
        tenantId: 'tenant-1',
        s3Key: 'tenant-1/documents/doc-1/report.pdf',
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
        uploadedById: 'user-1',
      },
      'correlation-123'
    );

    expect(event.eventId).toBeDefined();
    expect(event.eventId.length).toBeGreaterThan(0);
    expect(event.eventType).toBe('document.uploaded');
    expect(event.timestamp).toBeDefined();
    expect(event.tenantId).toBe('tenant-1');
    expect(event.correlationId).toBe('correlation-123');
    expect(event.payload.documentId).toBe('doc-1');
    expect(event.payload.s3Key).toBe('tenant-1/documents/doc-1/report.pdf');
    expect(event.payload.fileName).toBe('report.pdf');
    expect(event.payload.mimeType).toBe('application/pdf');
    expect(event.payload.fileSize).toBe(2048);
    expect(event.payload.uploadedById).toBe('user-1');
  });

  it('includes optional batchId when provided', () => {
    const event = createDocumentUploadedEvent(
      {
        documentId: 'doc-2',
        tenantId: 'tenant-1',
        s3Key: 'key',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        uploadedById: 'user-1',
        batchId: 'batch-99',
      },
      'corr-1'
    );

    expect(event.payload.batchId).toBe('batch-99');
  });

  it('generates unique eventIds', () => {
    const payload = {
      documentId: 'doc-1',
      tenantId: 'tenant-1',
      s3Key: 'key',
      fileName: 'file.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      uploadedById: 'user-1',
    };

    const event1 = createDocumentUploadedEvent(payload, 'c1');
    const event2 = createDocumentUploadedEvent(payload, 'c2');
    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('produces a valid ISO timestamp', () => {
    const event = createDocumentUploadedEvent(
      {
        documentId: 'doc-1',
        tenantId: 'tenant-1',
        s3Key: 'key',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        uploadedById: 'user-1',
      },
      'c1'
    );

    const parsed = new Date(event.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });
});

describe('DocumentFailed Event', () => {
  it('creates an event with all required fields', () => {
    const event = createDocumentFailedEvent(
      {
        documentId: 'doc-1',
        tenantId: 'tenant-1',
        errorMessage: 'Extraction timeout',
        retryCount: 2,
        stage: 'extraction',
      },
      'correlation-456'
    );

    expect(event.eventId).toBeDefined();
    expect(event.eventType).toBe('document.failed');
    expect(event.timestamp).toBeDefined();
    expect(event.tenantId).toBe('tenant-1');
    expect(event.correlationId).toBe('correlation-456');
    expect(event.payload.documentId).toBe('doc-1');
    expect(event.payload.errorMessage).toBe('Extraction timeout');
    expect(event.payload.retryCount).toBe(2);
    expect(event.payload.stage).toBe('extraction');
  });

  it('generates unique eventIds', () => {
    const payload = {
      documentId: 'doc-1',
      tenantId: 'tenant-1',
      errorMessage: 'error',
      retryCount: 0,
      stage: 'upload',
    };

    const event1 = createDocumentFailedEvent(payload, 'c1');
    const event2 = createDocumentFailedEvent(payload, 'c2');
    expect(event1.eventId).not.toBe(event2.eventId);
  });
});

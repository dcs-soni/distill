import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { generateId } from '@distill/utils';
import { PrismaDocumentRepository } from '../../src/infrastructure/persistence/PrismaDocumentRepository.js';
import { PrismaBatchRepository } from '../../src/infrastructure/persistence/PrismaBatchRepository.js';
import { S3StorageAdapter } from '../../src/infrastructure/storage/S3StorageAdapter.js';
import { RabbitMQPublisher } from '../../src/infrastructure/messaging/RabbitMQPublisher.js';
import { OutboxRelay } from '../../src/infrastructure/messaging/OutboxRelay.js';
import { UploadDocument } from '../../src/application/use-cases/UploadDocument.js';
import { UploadBatch } from '../../src/application/use-cases/UploadBatch.js';
import { prisma } from '../../src/infrastructure/persistence/prismaClient.js';

const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]);

describe('Document Service Integration Tests', () => {
  let documentRepo: PrismaDocumentRepository;
  let batchRepo: PrismaBatchRepository;
  let storage: S3StorageAdapter;
  let publisher: RabbitMQPublisher;
  let uploadDocument: UploadDocument;
  let uploadBatch: UploadBatch;
  let outboxRelay: OutboxRelay;

  beforeAll(async () => {
    documentRepo = new PrismaDocumentRepository();
    batchRepo = new PrismaBatchRepository();
    storage = new S3StorageAdapter({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      bucket: process.env.S3_BUCKET || 'distill-documents-test',
      forcePathStyle: true,
    });

    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    publisher = new RabbitMQPublisher(rabbitUrl);
    await publisher.connect();

    outboxRelay = new OutboxRelay(prisma, publisher, 100); // 100ms for fast testing

    uploadDocument = new UploadDocument(documentRepo, storage, publisher);
    uploadBatch = new UploadBatch(documentRepo, batchRepo, storage, publisher);
  });

  afterAll(async () => {
    await publisher.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up DB before each test
    await prisma.outboxEvent.deleteMany();
    await prisma.document.deleteMany();
    await prisma.batch.deleteMany();
  });

  it('Uploading a PDF creates the DB record, stores the object, and emits exactly one durable event', async () => {
    const tenantId = generateId();
    const uploadedById = generateId();
    const fileBuffer = Buffer.concat([PDF_MAGIC_BYTES, Buffer.from('dummy content')]);

    const result = await uploadDocument.execute(
      {
        tenantId,
        uploadedById,
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        fileSize: fileBuffer.length,
      },
      fileBuffer
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // Verify DB record
    const doc = await documentRepo.findById(tenantId, result.id as string);
    expect(doc).not.toBeNull();
    expect(doc?.fileName).toBe('test.pdf');

    // Verify Outbox Event was created and marked PUBLISHED since inline publish should succeed
    const outboxEvents = await prisma.outboxEvent.findMany();
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].status).toBe('PUBLISHED');
  });

  it('If publishing fails, the system has a retryable outbox record', async () => {
    const tenantId = generateId();
    const uploadedById = generateId();
    const fileBuffer = Buffer.concat([PDF_MAGIC_BYTES, Buffer.from('dummy content')]);

    // Create a publisher that throws an error
    const failingPublisher = {
      publish: async () => {
        throw new Error('RabbitMQ unavailable');
      },
      connect: async () => {},
      close: async () => {},
    };

    const failingUploadDocument = new UploadDocument(
      documentRepo,
      storage,
      failingPublisher as any
    );

    const result = await failingUploadDocument.execute(
      {
        tenantId,
        uploadedById,
        fileName: 'fail.pdf',
        mimeType: 'application/pdf',
        fileSize: fileBuffer.length,
      },
      fileBuffer
    );

    expect(result).toBeDefined();

    // Verify Outbox Event is PENDING
    const outboxEvents = await prisma.outboxEvent.findMany();
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].status).toBe('PENDING');

    // Now start the relay to prove it retries
    outboxRelay.start();
    await new Promise((resolve) => setTimeout(resolve, 500));
    outboxRelay.stop();

    // Assuming actual RabbitMQ is running, it should have been published by the relay now
    const updatedOutboxEvents = await prisma.outboxEvent.findMany();
    expect(updatedOutboxEvents[0].status).toBe('PUBLISHED');
  });

  it('Batch documents have the correct batchId', async () => {
    const tenantId = generateId();
    const uploadedById = generateId();
    const fileBuffer1 = Buffer.concat([PDF_MAGIC_BYTES, Buffer.from('dummy content 1')]);
    const fileBuffer2 = Buffer.concat([PDF_MAGIC_BYTES, Buffer.from('dummy content 2')]);

    const result = await uploadBatch.execute(
      {
        tenantId,
        uploadedById,
        batchName: 'Test Batch',
      },
      [
        {
          fileName: 'doc1.pdf',
          mimeType: 'application/pdf',
          fileSize: fileBuffer1.length,
          buffer: fileBuffer1,
        },
        {
          fileName: 'doc2.pdf',
          mimeType: 'application/pdf',
          fileSize: fileBuffer2.length,
          buffer: fileBuffer2,
        },
      ]
    );

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(result.batch).toBeDefined();

    const batchId = result.batch.id as string;

    const doc1 = await documentRepo.findById(tenantId, result.succeeded[0]);
    const doc2 = await documentRepo.findById(tenantId, result.succeeded[1]);

    expect(doc1?.batchId).toBe(batchId);
    expect(doc2?.batchId).toBe(batchId);
  });
});

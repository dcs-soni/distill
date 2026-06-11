import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startConsumer } from '../../../../src/infrastructure/messaging/rabbitmq_consumer.js';
import { RabbitMQClient } from '@distill/utils/src/amqp.js';
import { getIO } from '../../../../src/infrastructure/web/SocketIOAdapter.js';
import { emailAdapter } from '../../../../src/infrastructure/email/EmailAdapter.js';

vi.mock('@distill/utils/src/amqp.js', () => ({
  RabbitMQClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    assertTopology: vi.fn().mockResolvedValue(undefined),
    createConsumer: vi.fn(),
  })),
}));

vi.mock('../../../../src/infrastructure/web/SocketIOAdapter.js', () => {
  const emitMock = vi.fn();
  const toMock = vi.fn().mockReturnValue({ emit: emitMock });
  return {
    getIO: vi.fn().mockReturnValue({
      to: toMock,
    }),
  };
});

vi.mock('../../../../src/infrastructure/email/EmailAdapter.js', () => ({
  emailAdapter: {
    sendDocumentFailedEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('RabbitMQ Consumer Event Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize client, connect, assert topology, and start consumer', async () => {
    await startConsumer();

    const clientInstance = vi.mocked(RabbitMQClient).mock.results[0].value;
    expect(clientInstance.connect).toHaveBeenCalled();
    expect(clientInstance.assertTopology).toHaveBeenCalledTimes(5);
    expect(clientInstance.createConsumer).toHaveBeenCalled();
  });

  it('should correctly route document.failed event to socket and email', async () => {
    await startConsumer();

    const clientInstance = vi.mocked(RabbitMQClient).mock.results[0].value;
    const consumerCallback = vi.mocked(clientInstance.createConsumer).mock.calls[0][1];

    const mockEvent = {
      eventId: 'evt-123',
      eventType: 'document.failed',
      tenantId: 'tenant-1',
      timestamp: new Date().toISOString(),
      payload: {
        documentId: 'doc-123',
        fileName: 'test.pdf',
        error: 'Invalid format',
      },
    };

    await consumerCallback(mockEvent);

    const io = getIO();
    expect(io.to).toHaveBeenCalledWith('tenant:tenant-1');
    expect(io.to).toHaveBeenCalledWith('document:doc-123');

    // Emit called twice: once for tenant, once for document
    // Wait, the emit on the object returned by to() should have been called twice.
    const toMockFn = io.to as any;
    const emitFn = toMockFn().emit;

    expect(emitFn).toHaveBeenCalledWith(
      'notification',
      expect.objectContaining({
        type: 'document.failed',
        eventId: 'evt-123',
      })
    );

    expect(emitFn).toHaveBeenCalledWith(
      'document_update',
      expect.objectContaining({
        type: 'document.failed',
        eventId: 'evt-123',
      })
    );

    expect(emailAdapter.sendDocumentFailedEmail).toHaveBeenCalledWith(
      expect.any(String),
      'test.pdf',
      'Invalid format'
    );
  });
});

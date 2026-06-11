import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { initializeSocketIO } from '../../src/infrastructure/web/SocketIOAdapter.js';
import { startConsumer } from '../../src/infrastructure/messaging/rabbitmq_consumer.js';
import { io as Client } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import { SignJWT } from 'jose';

// We mock EmailAdapter to avoid sending actual emails during integration tests
vi.mock('../../src/infrastructure/email/EmailAdapter.js', () => ({
  emailAdapter: {
    sendDocumentFailedEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

// We mock amqp RabbitMQClient to avoid needing a real RabbitMQ broker for this test,
// but we will test the routing flow using an in-memory emitter if we want, or just
// trigger the callback directly. Since this is an integration test of the components
// interacting with Socket.io, let's trigger the callback manually.
let registeredConsumer: any = null;

vi.mock('@distill/utils/src/amqp.js', () => {
  return {
    RabbitMQClient: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      assertTopology: vi.fn().mockResolvedValue(undefined),
      createConsumer: vi.fn().mockImplementation((queue, callback) => {
        registeredConsumer = callback;
        return Promise.resolve();
      }),
    })),
  };
});

describe('Notification Flow Integration', () => {
  let server: any;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll(async () => {
    server = Fastify();
    initializeSocketIO(server);

    await server.listen({ port: 0, host: '127.0.0.1' });
    port = server.server.address().port;

    await startConsumer();

    // Generate a valid JWT token
    const secret = new TextEncoder().encode('generate-es256-key-here'); // matching the SocketIOAdapter
    const token = await new SignJWT({ tenantId: 'tenant-int-test' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    clientSocket = Client(`http://127.0.0.1:${port}`, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  afterAll(async () => {
    clientSocket.disconnect();
    await server.close();
    vi.restoreAllMocks();
  });

  it('should deliver notification to connected client for the correct tenant', async () => {
    expect(registeredConsumer).toBeDefined();

    const mockEvent = {
      eventId: 'evt-int-123',
      eventType: 'extraction.completed',
      tenantId: 'tenant-int-test',
      timestamp: new Date().toISOString(),
      payload: {
        documentId: 'doc-int-123',
        status: 'SUCCESS',
      },
    };

    const notificationPromise = new Promise<any>((resolve) => {
      clientSocket.on('notification', (data) => {
        resolve(data);
      });
    });

    // Simulate RabbitMQ delivering a message
    await registeredConsumer(mockEvent);

    const receivedData = await notificationPromise;
    expect(receivedData.eventId).toBe('evt-int-123');
    expect(receivedData.type).toBe('extraction.completed');
    expect(receivedData.data.documentId).toBe('doc-int-123');
  });
});

import { Server, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { jwtVerify } from 'jose';
import { logger } from '@distill/utils/src/logger.js';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Gauge, Counter } from 'prom-client';

export const connectedClientsGauge = new Gauge({
  name: 'socketio_connected_clients',
  help: 'Number of currently connected Socket.IO clients',
});

export const socketErrorsCounter = new Counter({
  name: 'socketio_errors_total',
  help: 'Total number of Socket.IO connection errors',
});

let io: Server;

export const initializeSocketIO = (server: FastifyInstance) => {
  io = new Server(server.server, {
    cors: {
      origin: '*', // We can restrict this in production
      methods: ['GET', 'POST'],
    },
  });

  const redisUrl = process.env.REDIS_URL || 'redis://:redis_password@localhost:6379';
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter initialized');
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to initialize Redis adapter');
    });

  io.use((socket: Socket, next) => {
    void (async () => {
      try {
        const token =
          (socket.handshake.auth.token as string | undefined) ||
          socket.handshake.headers['authorization']?.replace('Bearer ', '');
        if (!token) {
          return next(new Error('Authentication error: Token missing'));
        }

        const secret = process.env.JWT_SECRET || 'generate-es256-key-here';
        const encodedSecret = new TextEncoder().encode(secret);

        const { payload } = await jwtVerify(token, encodedSecret);

        if (!payload.tenantId) {
          return next(new Error('Authentication error: Invalid tenant'));
        }

        const socketData = socket.data as { user?: unknown; tenantId?: string };
        socketData.user = payload;
        socketData.tenantId = payload.tenantId as string;

        next();
      } catch (err) {
        logger.warn(err, 'Socket authentication failed');
        socketErrorsCounter.inc();
        next(new Error('Authentication error'));
      }
    })();
  });

  io.on('connection', (socket: Socket) => {
    connectedClientsGauge.inc();
    const socketData = socket.data as { tenantId: string };
    const tenantId = socketData.tenantId;
    logger.info(`Client connected: ${socket.id} (Tenant: ${tenantId})`);

    // Join tenant room
    void socket.join(`tenant:${tenantId}`);

    socket.on('join_document', (documentId: string) => {
      void socket.join(`document:${documentId}`);
      logger.info(`Client ${socket.id} joined document:${documentId}`);
    });

    socket.on('leave_document', (documentId: string) => {
      void socket.leave(`document:${documentId}`);
      logger.info(`Client ${socket.id} left document:${documentId}`);
    });

    socket.on('disconnect', () => {
      connectedClientsGauge.dec();
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

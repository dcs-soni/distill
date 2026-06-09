import { Server, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { jwtVerify } from 'jose';
import { logger } from '@distill/utils/src/logger.js';

let io: Server;

export const initializeSocketIO = (server: FastifyInstance) => {
  io = new Server(server.server, {
    cors: {
      origin: '*', // We can restrict this in production
      methods: ['GET', 'POST'],
    },
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
        next(new Error('Authentication error'));
      }
    })();
  });

  io.on('connection', (socket: Socket) => {
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

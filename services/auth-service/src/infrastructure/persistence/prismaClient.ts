import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@distill/utils';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
    // @ts-expect-error - Prisma Client doesn't natively expose event types unless generic params are set
    global.prisma.$on('query', (e: Prisma.QueryEvent) => {
      logger.debug(`Query: ${e.query}`);
    });
  }
  prisma = global.prisma;
}

export default prisma;

import { PrismaClient, Prisma } from './generated/client/index.js';
import { logger } from '@distill/utils';

type ExtendedPrismaClient = PrismaClient<
  Prisma.PrismaClientOptions,
  'query' | 'info' | 'warn' | 'error'
>;

declare global {
  // eslint-disable-next-line no-var
  var prisma: ExtendedPrismaClient | undefined;
}

const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
};

let prisma: ExtendedPrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaClientOptions);

    global.prisma.$on('query', (e: Prisma.QueryEvent) => {
      logger.debug(`Query: ${e.query}`);
    });
  }
  prisma = global.prisma;
}

export default prisma;

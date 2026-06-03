import { PrismaClient } from '@prisma/client';
import { logger } from '@distill/utils';

export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration >= 100) {
    logger.warn({ query: e.query, durationMs: e.duration }, 'Slow Prisma Query');
  }
});

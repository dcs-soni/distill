import { Redis } from 'ioredis';
import { logger } from '@distill/utils';

const redisUrl = process.env.REDIS_URL || 'redis://:redis_password@localhost:6379';

export const redisClient = new Redis(redisUrl, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('error', (err) => {
  logger.error(err, 'Redis Client Error');
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

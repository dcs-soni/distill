import { vi } from 'vitest';

vi.mock('ioredis', () => {
  const RedisMock = vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
    defineCommand: vi.fn(),
    eval: vi.fn(), // for rate-limiter
  }));
  return { Redis: RedisMock, default: RedisMock };
});

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@distill/utils': resolve(__dirname, '../../shared/utils/src/index.ts'),
      '@distill/types': resolve(__dirname, '../../shared/types/src/index.ts'),
    },
  },
});

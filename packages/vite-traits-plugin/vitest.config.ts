import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

const config: UserConfig = defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.node.test.ts'],
  },
});

export default config;

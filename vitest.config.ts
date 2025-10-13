import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

export const isCI: boolean = process.env['CI'] === 'true';

export const root: URL = new URL('../../', import.meta.url);
export const cwd: URL = pathToFileURL(`${process.cwd()}/`);

const config: UserConfig = defineConfig({
  build: {
    target: 'esnext',
  },
  cacheDir: '.vite',
  esbuild: {
    supported: {
      decorators: false,
      'top-level-await': true,
    },
  },
  test: {
    includeSource: ['src2/**/*.ts'],
    coverage: {
      enabled: false,
      all: true,
      provider: 'v8',
      reportsDirectory: fileURLToPath(new URL('.coverage/', cwd)),
      clean: true,
      reporter: isCI ? ['lcov'] : ['html'],
    },
    includeTaskLocation: !isCI,
  },
});

export default config;

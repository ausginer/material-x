import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
// eslint-disable-next-line import-x/no-relative-packages
import { createTprocTestConfig } from '../../.scripts/vitest-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createTprocTestConfig(new URL('./', import.meta.url)),
);

export default config;

import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
// eslint-disable-next-line import-x/no-relative-packages
import { createMutatorTestConfig } from '../../.scripts/vitest-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createMutatorTestConfig(new URL('./', import.meta.url)),
);

export default config;

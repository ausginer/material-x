/* eslint-disable import-x/no-relative-packages */
import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createYdinTestConfig } from '../../.scripts/vitest-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createYdinTestConfig(new URL('./', import.meta.url)),
);

export default config;

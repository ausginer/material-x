/* eslint-disable import-x/no-relative-packages */
import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createMaterialXTestConfig } from '../../.scripts/vitest-config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  createMaterialXTestConfig(env, new URL('./', import.meta.url)),
);

export default config;

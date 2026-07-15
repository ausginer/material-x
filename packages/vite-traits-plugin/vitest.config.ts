import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
// eslint-disable-next-line import-x/no-relative-packages
import { createViteTraitsPluginTestConfig } from '../../.scripts/vitest-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createViteTraitsPluginTestConfig(new URL('./', import.meta.url)),
);

export default config;

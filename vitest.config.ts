import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createWorkspaceTestConfig } from './.scripts/vitest-config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  createWorkspaceTestConfig(env, {
    root: new URL('./', import.meta.url),
    materialXRoot: new URL('./packages/material-x/', import.meta.url),
    ydinRoot: new URL('./packages/ydin/', import.meta.url),
  }),
);

export default config;

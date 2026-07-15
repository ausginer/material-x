import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createWorkspaceTestConfig } from './.scripts/vitest-config.ts';
// Test-only infrastructure is deliberately not a package runtime export.
// eslint-disable-next-line import-x/no-relative-packages
import { materialXBrowserCommands } from './packages/material-x/test/support/visual-contracts.node.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  createWorkspaceTestConfig(env, {
    root: new URL('./', import.meta.url),
    materialXRoot: new URL('./packages/material-x/', import.meta.url),
    materialXCommands: materialXBrowserCommands,
    coreRoot: new URL('./packages/core/', import.meta.url),
    tprocRoot: new URL('./packages/tproc/', import.meta.url),
    viteTraitsPluginRoot: new URL(
      './packages/vite-traits-plugin/',
      import.meta.url,
    ),
  }),
);

export default config;

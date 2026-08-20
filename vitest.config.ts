import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createWorkspaceTestConfig } from './.scripts/vitest-config.ts';
// Test-only infrastructure is deliberately not a package runtime export.
// eslint-disable-next-line import-x/no-relative-packages
import { materialXBrowserCommands } from './packages/material-x/tests/support/visual-contracts.node.ts';
// eslint-disable-next-line import-x/no-relative-packages
import { dragBrowserCommands } from './packages/drag2/tests/support/pointer-commands.node.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  createWorkspaceTestConfig(env, {
    root: new URL('./', import.meta.url),
    boxQuadRoot: new URL('./packages/box-quad/', import.meta.url),
    materialXRoot: new URL('./packages/material-x/', import.meta.url),
    materialXCommands: materialXBrowserCommands,
    coreRoot: new URL('./packages/core/', import.meta.url),
    dragRoot: new URL('./packages/drag/', import.meta.url),
    drag2Root: new URL('./packages/drag2/', import.meta.url),
    drag2Commands: dragBrowserCommands,
    tprocRoot: new URL('./packages/tproc/', import.meta.url),
    viteTraitsPluginRoot: new URL(
      './packages/vite-traits-plugin/',
      import.meta.url,
    ),
  }),
);

export default config;

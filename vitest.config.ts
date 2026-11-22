import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createWorkspaceTestConfig } from './.scripts/vitest-config.ts';
// Test-only infrastructure is deliberately not a package runtime export, so
// both of these are reached by path rather than by specifier.
// eslint-disable-next-line import-x/no-relative-packages
import { dragBrowserCommands } from './packages/drag/tests/support/commands.node.ts';
// eslint-disable-next-line import-x/no-relative-packages
import { materialXBrowserCommands } from './packages/material-x/tests/support/commands.node.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  createWorkspaceTestConfig(env, {
    root: new URL('./', import.meta.url),
    boxQuadRoot: new URL('./packages/box-quad/', import.meta.url),
    signalsRoot: new URL('./packages/signals/', import.meta.url),
    materialXRoot: new URL('./packages/material-x/', import.meta.url),
    materialXCommands: materialXBrowserCommands,
    coreRoot: new URL('./packages/core/', import.meta.url),
    dragRoot: new URL('./packages/drag/', import.meta.url),
    dragCommands: dragBrowserCommands,
    tprocRoot: new URL('./packages/tproc/', import.meta.url),
    viteTraitsPluginRoot: new URL(
      './packages/vite-traits-plugin/',
      import.meta.url,
    ),
  }),
);

export default config;

import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
// eslint-disable-next-line import-x/no-relative-packages
import { createMaterialXTestConfig } from '../../.scripts/vitest-config.ts';
import { materialXBrowserCommands } from './tests/support/visual-contracts.node.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  createMaterialXTestConfig(
    env,
    new URL('./', import.meta.url),
    materialXBrowserCommands,
  ),
);

export default config;

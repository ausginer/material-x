/* eslint-disable import-x/no-relative-packages */
import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createDragTestConfig } from '../../.scripts/vitest-config.ts';
import { dragBrowserCommands } from './tests/support/pointer-commands.node.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createDragTestConfig(new URL('./', import.meta.url), dragBrowserCommands),
);

export default config;

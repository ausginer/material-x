/* eslint-disable import-x/no-relative-packages */
import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import {
  createDragTestConfig,
  DRAG2_NODE_BUILD,
  DRAG2_SHIPPED_BROWSER_TESTS,
} from '../../.scripts/vitest-config.ts';
import { dragBrowserCommands } from './tests/support/pointer-commands.node.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createDragTestConfig(
    new URL('./', import.meta.url),
    dragBrowserCommands,
    DRAG2_SHIPPED_BROWSER_TESTS,
    DRAG2_NODE_BUILD,
  ),
);

export default config;

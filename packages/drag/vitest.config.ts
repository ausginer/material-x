/* eslint-disable import-x/no-relative-packages */
import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import {
  createDragTestConfig,
  DRAG_SHIPPED_BROWSER_TESTS,
} from '../../.scripts/vitest-config.ts';
import { dragBrowserCommands } from './tests/support/commands.node.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createDragTestConfig(
    new URL('./', import.meta.url),
    dragBrowserCommands,
    DRAG_SHIPPED_BROWSER_TESTS,
  ),
);

export default config;

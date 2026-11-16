/* eslint-disable import-x/no-relative-packages */
import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import {
  createDragTestConfig,
  DRAG_CONSUMER,
  DRAG_NODE_BUILD,
  DRAG_SHIPPED_BROWSER_TESTS,
} from '../../.scripts/vitest-config.ts';
import { dragBrowserCommands } from './tests/support/commands.node.ts';
import { probeCommands } from './tests/support/probe.node.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createDragTestConfig(
    new URL('./', import.meta.url),
    { ...dragBrowserCommands, ...probeCommands },
    DRAG_SHIPPED_BROWSER_TESTS,
    DRAG_NODE_BUILD,
    DRAG_CONSUMER,
  ),
);

export default config;

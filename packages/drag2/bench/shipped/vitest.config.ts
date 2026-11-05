/**
 * The package's test configuration with the allocation harness also routed to
 * the `shipped` browser project, where `__DEV__` is `false` and every
 * development-only instrument folds away as in a published build.
 *
 * The ordinary configuration runs that harness with `__DEV__` `true`, which is
 * what every other browser file sees. Measuring what a consumer's build
 * allocates needs the other definition, and the one place it is set is the
 * `shipped` project, so this file adds the harness to that project's list and
 * changes nothing else:
 *
 * ```sh
 * VITE_DRAG_MEASURE=1 npx vitest run -c bench/shipped/vitest.config.ts \
 *   --project shipped tests/perf/d208-step6.browser.test.ts
 * ```
 */
/* eslint-disable import-x/no-relative-packages */
import type { UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import {
  createDragTestConfig,
  DRAG2_NODE_BUILD,
  DRAG2_SHIPPED_BROWSER_TESTS,
} from '../../../../.scripts/vitest-config.ts';
import { dragBrowserCommands } from '../../tests/support/pointer-commands.node.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createDragTestConfig(
    new URL('../../', import.meta.url),
    dragBrowserCommands,
    [...DRAG2_SHIPPED_BROWSER_TESTS, 'tests/perf/d208-step6.browser.test.ts'],
    DRAG2_NODE_BUILD,
  ),
);

export default config;

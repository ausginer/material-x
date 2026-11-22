/* eslint-disable import-x/no-relative-packages */
import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';
import { createMaterialXTestConfig } from '../../../.scripts/vitest-config.ts';
import { materialXBrowserCommands } from '../tests/support/commands.node.ts';

/**
 * The material-x browser project, in the engines it runs in, running the probes under
 * `bench/` instead of the tests.
 */
const config: UserConfigFnObject = defineConfig((env) => {
  const { test } = createMaterialXTestConfig(
    env,
    new URL('../', import.meta.url),
    materialXBrowserCommands,
  );
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const projects = (test!.projects as UserConfig[]).filter(
    (project) => project.test?.name === 'browser',
  );

  return {
    test: {
      projects: projects.map((project) => ({
        ...project,
        test: {
          ...project.test,
          include: ['bench/**/*.probe.browser.ts'],
          exclude: [],
        },
      })),
    },
  };
});

export default config;

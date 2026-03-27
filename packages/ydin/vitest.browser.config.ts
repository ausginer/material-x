/* eslint-disable import-x/no-relative-packages */
import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import vitestBrowserConfig from '../../vitest.browser.config.ts';
import viteConfig from './vite.config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(mergeConfig(viteConfig(env), vitestBrowserConfig(env)), {
    test: {
      include: ['tests/**/*.spec.ts'],
      setupFiles: ['tests/setup.ts'],
      typecheck: {
        include: ['tests/**/*.test-d.ts'],
        ignoreSourceErrors: true,
      },
    },
  } satisfies UserConfig),
);

export default config;

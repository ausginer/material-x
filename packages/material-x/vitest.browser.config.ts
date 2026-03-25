import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import vitestBrowserConfig from '../../vitest.browser.config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(vitestBrowserConfig(env), {
    root: '.',
    test: {
      include: ['src/**/*.spec.ts'],
      exclude: ['src/.tproc/**/*.ts'],
    },
  } satisfies UserConfig),
);

export default config;

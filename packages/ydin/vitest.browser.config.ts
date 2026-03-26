import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';
import vitestBrowserConfig from '../../vitest.browser.config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(mergeConfig(viteConfig(env), vitestBrowserConfig(env)), {
    test: {
      include: ['tests/**/*.spec.ts'],
      setupFiles: ['tests/setup.ts'],
    },
  } satisfies UserConfig),
);

export default config;

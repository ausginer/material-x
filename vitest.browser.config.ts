import { playwright } from '@vitest/browser-playwright';
import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import defaultConfig from './.scripts/vitest.base.config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(defaultConfig(env), {
    test: {
      include: ['src/**/*.spec.ts'],
      exclude: ['src/.tproc/**/*.ts'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
    },
  } satisfies UserConfig),
);

export default config;

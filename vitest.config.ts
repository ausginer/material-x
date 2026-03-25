import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

const isCI = process.env['CI'] === 'true';

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      coverage: {
        enabled: false,
        provider: 'v8',
        reportsDirectory: '.coverage',
        clean: true,
        reporter: isCI ? ['lcov'] : ['html'],
      },
      includeTaskLocation: !isCI,
    },
  } satisfies UserConfig),
);

export default config;

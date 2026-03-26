import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig } from 'vitest/config';

const isCI = process.env['CI'] === 'true';

const config: UserConfigFnObject = defineConfig(
  () =>
    ({
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
    }) satisfies UserConfig,
);

export default config;

import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import defaultConfig from './vite.base.config.ts';

export const isCI: boolean = process.env['CI'] === 'true';

export const root: URL = new URL('../', import.meta.url);

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(defaultConfig(env), {
    test: {
      coverage: {
        enabled: false,
        provider: 'v8',
        reportsDirectory: fileURLToPath(new URL('.coverage/', root)),
        clean: true,
        reporter: isCI ? ['lcov'] : ['html'],
      },
      includeTaskLocation: !isCI,
    },
  } satisfies UserConfig),
);

export default config;

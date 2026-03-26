import { existsSync } from 'node:fs';
import { playwright } from '@vitest/browser-playwright';
import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import vitestConfig from './vitest.config.ts';

function resolveChromeExecutable(): string {
  const executable =
    process.env['CHROME_EXECUTABLE'] ?? '/usr/local/bin/chrome';

  if (!existsSync(executable)) {
    throw new Error(
      `Chrome executable was not found at '${executable}'. Set CHROME_EXECUTABLE to override it.`,
    );
  }

  return executable;
}

const config: UserConfigFnObject = defineConfig(
  (env) =>
    mergeConfig(vitestConfig(env), {
      test: {
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({
            launchOptions: {
              executablePath: resolveChromeExecutable(),
            },
          }),
          instances: [{ browser: 'chromium' }],
        },
      },
    }) satisfies UserConfig,
);

export default config;

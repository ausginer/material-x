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

const isDebug = process.env['DEBUG'] === '1';

const config: UserConfigFnObject = defineConfig(
  (env) =>
    mergeConfig(vitestConfig(env), {
      test: {
        fileParallelism: !isDebug,
        browser: {
          enabled: true,
          headless: true,
          ui: isDebug,
          api: {
            host: '0.0.0.0',
            port: 9876,
            allowExec: true,
            // strictPort: true,
          },
          provider: playwright({
            launchOptions: {
              executablePath: resolveChromeExecutable(),
              args: isDebug
                ? [
                    '--remote-debugging-port=9222',
                    '--remote-allow-origins=*',
                    '--no-sandbox',
                  ]
                : [],
            },
          }),
          instances: [{ browser: 'chromium' }],
        },
      },
    }) satisfies UserConfig,
);

export default config;

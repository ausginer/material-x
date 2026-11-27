import { playwright } from '@vitest/browser-playwright';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

// One project per run: the browser project in `chromium`, and the node project
// in the engines `a` and `b`, which only the environment tells apart.
const config: ViteUserConfig = defineConfig({
  test:
    process.env['FIXTURE_ENGINE'] === 'chromium'
      ? {
          name: 'browser',
          include: ['tests/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { channel: 'chromium' } }),
            instances: [{ browser: 'chromium' }],
          },
        }
      : { name: 'node', include: ['tests/**/*.node.test.ts'] },
});

export default config;

/**
 * Copied into `packages/box-quad/tests/` for one run and removed after it. It
 * reads the browser's product and user agent over CDP, writes them to
 * `chromium-version.json` beside the test file, and keeps the page open for
 * five seconds so the process list can be read from outside.
 */
import { expect, it } from 'vitest';
import { cdp, commands } from 'vitest/browser';

it('should report the browser that Playwright started', async () => {
  const version = await cdp().send('Browser.getVersion');

  await commands.writeFile(
    'chromium-version.json',
    JSON.stringify({ version, userAgent: navigator.userAgent }, null, 2),
  );
  await new Promise((resolve) => {
    setTimeout(resolve, 5000);
  });
  expect(version).toBeDefined();
});

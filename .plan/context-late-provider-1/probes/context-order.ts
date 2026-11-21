// Probe for RF-69: does a context consumer that connects before its provider
// is defined ever resolve it?
//
// node context-order.ts <packages/material-x> <engine>
//
// The page has static markup, `<mx-button-group disabled>` around two
// `<mx-button>`s, before any element is defined. `button.js` and
// `button-group.js` are separate module entries of one build, so they share
// core and the context token, as an application's chunks do. The probe reads
// each button's inner `<button>`.disabled, which is true only when the button
// resolved the group's context.
//   group-first   - button-group.js, then button.js
//   button-first  - button.js, then button-group.js after the button upgraded
//   lazy          - button.js, then button-group.js 200 ms later, by import()
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit } from 'playwright';
import { join } from 'node:path';

const [MX, ENGINE] = process.argv.slice(2) as [string, string];
const build = await rolldown({
  input: {
    button: join(MX, 'button/button.js'),
    group: join(MX, 'button-group/button-group.js'),
  },
  platform: 'browser',
});
const { output } = await build.generate({ format: 'es' });
const files = new Map(
  output
    .filter((c) => c.type === 'chunk')
    .map((c) => [c.fileName, (c as { code: string }).code]),
);

const ORIGIN = 'http://probe.test';
const CASES: Record<string, string> = {
  'group-first': `await import('./group.js'); await import('./button.js');`,
  'button-first': `await import('./button.js'); await customElements.whenDefined('mx-button'); await new Promise((r) => setTimeout(r, 0)); await import('./group.js');`,
  lazy: `await import('./button.js'); await new Promise((r) => setTimeout(r, 200)); await import('./group.js');`,
};

const type = { chromium, firefox, webkit }[ENGINE]!;
const browser = await type.launch();
console.log(`# engine ${ENGINE} ${browser.version()}`);
for (const [name, script] of Object.entries(CASES)) {
  const page = await browser.newPage();
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname.slice(1);
    if (path === '') {
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><mx-button-group disabled><mx-button>One</mx-button><mx-button>Two</mx-button></mx-button-group>
<script type="module">${script} window.__done = true;</script>`,
      });
    }
    const code = files.get(path);
    return code === undefined
      ? route.fulfill({ status: 404, body: '' })
      : route.fulfill({ contentType: 'text/javascript', body: code });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => (window as { __done?: boolean }).__done);
  await page.waitForTimeout(100);
  const result = await page.evaluate(() =>
    [...document.querySelectorAll('mx-button')].map(
      (b) => b.shadowRoot!.querySelector('button')!.disabled,
    ),
  );
  console.log(`${name.padEnd(13)} inner disabled: ${result.join(', ')}`);
  await page.close();
}
await browser.close();

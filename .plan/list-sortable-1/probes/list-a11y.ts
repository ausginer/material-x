// Scratch probe: how Chromium exposes mx-list and its items.
import { rolldown } from 'rolldown';
import { chromium } from 'playwright';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const MX = process.argv[2]!;
const entry = join(tmpdir(), `list-a11y-${process.pid}.js`);
await writeFile(
  entry,
  [
    'list/list.js',
    'list/list-item.js',
    'list/list-button-item.js',
    'list/list-link-item.js',
  ]
    .map((f) => `import ${JSON.stringify(join(MX, f))};`)
    .join('\n'),
);
const bundle = await rolldown({ input: entry, platform: 'browser' });
const { output } = await bundle.generate({ format: 'es' });
await rm(entry);
const code = output
  .filter((c) => c.type === 'chunk')
  .map((c) => (c as { code: string }).code)
  .join('\n');
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror: ' + e.message));
page.on('console', (m) => console.log('console: ' + m.text()));
await page.setContent(`<mx-list id="l">
  <mx-list-item>Static one<span slot="trail" data-handle>≡</span></mx-list-item>
  <mx-list-item>Static two</mx-list-item>
  <mx-list-button-item>Button item</mx-list-button-item>
  <mx-list-link-item href="#x">Link item</mx-list-link-item>
</mx-list>`);
await page.addScriptTag({ content: code, type: 'module' });
await page.waitForFunction(() => customElements.get('mx-list-link-item'));
await page.waitForTimeout(200);
console.log(
  'ariaSnapshot of #l:\n' + (await page.locator('#l').ariaSnapshot()),
);
const cdp = await page.context().newCDPSession(page);
const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
  nodes: Array<{
    ignored: boolean;
    role?: { value: string };
    name?: { value: string };
  }>;
};
console.log('\nCDP AX tree (not ignored):');
for (const n of nodes)
  if (!n.ignored)
    console.log(
      `  ${n.role?.value ?? '?'} ${JSON.stringify(n.name?.value ?? '')}`,
    );
const tab: string[] = [];
await page.locator('body').focus();
for (let i = 0; i < 5; i++) {
  await page.keyboard.press('Tab');
  tab.push(
    await page.evaluate(() => {
      let e: Element | null = document.activeElement;
      let s = e?.tagName ?? '';
      while (e?.shadowRoot?.activeElement) {
        e = e.shadowRoot.activeElement;
        s += ' > ' + e.tagName;
      }
      return s;
    }),
  );
}
console.log('\nTab order: ' + tab.join(' | '));
await browser.close();

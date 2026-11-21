// Scratch probe: how Chromium exposes mx-list, mx-sortable-list and their
// items, the tab order, and each focused element's role, name and description.
import { rolldown } from 'rolldown';
import { chromium } from 'playwright';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const MX = process.argv[2]!;
const entry = join(tmpdir(), `list-a11y-${process.pid}.js`);
await writeFile(
  entry,
  // The sortable list first: the markup is parsed before the bundle runs,
  // and an item that upgrades before its provider is defined doesn't resolve
  // it until repo:RF-69's repair.
  [
    'list/sortable-list.js',
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
</mx-list>
<mx-sortable-list id="s">
  <mx-list-item>Sortable static with handle<span slot="trail" data-handle>≡</span></mx-list-item>
  <mx-list-item>Sortable static without handle</mx-list-item>
  <mx-list-button-item>Sortable button item</mx-list-button-item>
</mx-sortable-list>`);
await page.addScriptTag({ content: code, type: 'module' });
await page.waitForFunction(() => customElements.get('mx-sortable-list'));
await page.waitForTimeout(200);
for (const id of ['l', 's']) {
  console.log(
    `ariaSnapshot of #${id}:\n` + (await page.locator(`#${id}`).ariaSnapshot()),
  );
}
const cdp = await page.context().newCDPSession(page);
type AXNode = {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  properties?: Array<{ name: string; value: { value: unknown } }>;
};
const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
  nodes: AXNode[];
};
console.log('\nCDP AX tree (not ignored):');
for (const n of nodes)
  if (!n.ignored)
    console.log(
      `  ${n.role?.value ?? '?'} ${JSON.stringify(n.name?.value ?? '')}`,
    );
const tab: string[] = [];
await page.locator('body').focus();
const focusedNodes: string[] = [];
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('Tab');
  tab.push(
    await page.evaluate(() => {
      let e: Element | null = document.activeElement;
      let s = e?.tagName ?? '';
      while (e?.shadowRoot?.activeElement) {
        e = e.shadowRoot.activeElement;
        s += ' > ' + e.tagName;
      }
      return `${s} (${e?.closest('mx-sortable-list, mx-list')?.id ?? ''}${e?.getRootNode() instanceof ShadowRoot ? ' ' + (e.getRootNode() as ShadowRoot).host.textContent?.trim() : ' ' + (e?.textContent?.trim() ?? '')})`;
    }),
  );
  const { result } = (await cdp.send('Runtime.evaluate', {
    expression: `(() => { let e = document.activeElement; while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement; return e; })()`,
  })) as { result: { objectId?: string } };
  const { nodes: own } = (await cdp.send('Accessibility.getPartialAXTree', {
    objectId: result.objectId!,
    fetchRelatives: false,
  })) as { nodes: AXNode[] };
  const focused = own[0];
  focusedNodes.push(
    focused
      ? `role ${focused.role?.value ?? '?'}, name ${JSON.stringify(focused.name?.value ?? '')}, description ${JSON.stringify(focused.description?.value ?? '')}`
      : 'no AX node',
  );
}
console.log('\nTab order, with the focused AX node:');
for (const [i, stop] of tab.entries()) {
  console.log(`  ${i + 1}. ${stop}: ${focusedNodes[i]}`);
}
await browser.close();

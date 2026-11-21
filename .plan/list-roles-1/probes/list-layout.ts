// Probe for RF-68's property 5: every item's `.host` rect and the list's rect,
// in Chromium, Firefox and WebKit, on the built package.
//
// node list-layout.ts <packages/material-x>
//
// The fixture is a list with a 12 px gap holding one-, two- and three-line
// items of each kind, with lead and trail content, and a disabled button and
// link item. The output is one line per element, so two builds' readings
// compare with `diff`.
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit } from 'playwright';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [MX] = process.argv.slice(2) as [string];

const dir = await mkdtemp(join(tmpdir(), 'list-layout-'));
const entry = join(dir, 'entry.js');
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
const build = await rolldown({ input: entry, platform: 'browser' });
const { output } = await build.generate({ format: 'iife' });
await rm(dir, { recursive: true });
const code = output
  .filter((c) => c.type === 'chunk')
  .map((c) => (c as { code: string }).code)
  .join('\n');

const item = (tag: string, id: string, lines: number, extra = '') => {
  const attrs = tag === 'mx-list-link-item' ? ' href="#x"' : '';
  const overline = lines === 3 ? '<span slot="overline">Overline</span>' : '';
  const support =
    lines >= 2 ? '<span slot="support">Supporting text</span>' : '';
  return `<${tag} id="${id}"${attrs}${extra}><span slot="lead" data-icon>★</span>${overline}Label ${id}${support}<span slot="trail">100+</span></${tag}>`;
};

const BODY = `<mx-list id="l" style="gap: 12px; inline-size: 360px">
${['mx-list-item', 'mx-list-button-item', 'mx-list-link-item']
  .flatMap((tag) =>
    [1, 2, 3].map((n) => item(tag, `${tag.slice(8, 12)}${n}`, n)),
  )
  .join('\n')}
${item('mx-list-button-item', 'butt-disabled', 1, ' disabled')}
${item('mx-list-link-item', 'link-disabled', 1, ' disabled')}
</mx-list>`;

for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin: 0">${BODY}</body></html>`,
  );
  await page.addScriptTag({ content: code });
  await page.waitForFunction(() => customElements.get('mx-list-link-item'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  const rects = await page.evaluate(() => {
    const show = (r: DOMRect) => `${r.x} ${r.y} ${r.width} ${r.height}`;
    const list = document.getElementById('l')!;
    return [
      `list ${show(list.getBoundingClientRect())}`,
      ...[...list.children].map(
        (i) =>
          `${i.id} ${show(i.shadowRoot!.querySelector('.host')!.getBoundingClientRect())}`,
      ),
    ];
  });
  console.log(`# engine ${name} ${browser.version()}`);
  for (const line of rects) {
    console.log(line);
  }
  await browser.close();
}

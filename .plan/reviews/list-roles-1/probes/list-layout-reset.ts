// Feature proof of RF-68 on RD-31 (de24d50d5): a copy of
// .plan/list-roles-1/probes/list-layout.ts with a `reset` mode, which adds a
// page's universal reset, as Tailwind v4's preflight writes it, to the page's
// head, and with four more static items: a label only, a lead only, a trail
// only and a large lead. The reading without `reset` and with it compare with
// `diff`, and their screenshots with `cmp`.
//
// node list-layout-reset.ts <packages/material-x> [reset] [--png <dir>]
//
// The original header follows.
//
// Probe for RF-68's property 5: every item's `.host` rect and the list's rect,
// in Chromium, Firefox and WebKit, on the built package.
//
// node list-layout.ts <packages/material-x> [hostbox] [--png <dir>]
//   hostbox - added by the architect on 2026-11-21: each item's shadow root
//             adopts `:host { display: block }` after its own styles, as a
//             box host would have it
//   --png <dir> - added by the architect for the second re-ruling of
//             2026-11-21: also writes <dir>/<engine>-level<N>.png, a
//             screenshot of the page with every item at elevation level 0
//             and 6, so two builds' pixels compare with `cmp`. The level is
//             the custom property that the elevation's `:host` rule
//             transitions, `--_level` as a build may rename it
// An item without a `.host`, as a folded `mx-list-item`, is read by its host.
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

const args = process.argv.slice(2);
const pngAt = args.indexOf('--png');
const PNG = pngAt === -1 ? undefined : args.splice(pngAt, 2)[1];
const [MX, MODE] = args as [string, string | undefined];

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
<mx-list-item id="label-only">Label only</mx-list-item>
<mx-list-item id="lead-only"><span slot="lead" data-icon>★</span></mx-list-item>
<mx-list-item id="trail-only"><span slot="trail">100+</span></mx-list-item>
<mx-list-item id="lead-large"><span slot="lead" data-large style="display: block; inline-size: 56px; block-size: 56px; background: #888"></span>Large lead</mx-list-item>
</mx-list>`;
const RESET =
  MODE === 'reset'
    ? '<style>*, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; }</style>'
    : '';

for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8">${RESET}</head><body style="margin: 0">${BODY}</body></html>`,
  );
  await page.addScriptTag({ content: code });
  await page.waitForFunction(() => customElements.get('mx-list-link-item'));
  await page.evaluate(() => document.fonts.ready);
  if (MODE === 'hostbox') {
    await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(':host { display: block; }');
      for (const item of document.getElementById('l')!.children) {
        item.shadowRoot!.adoptedStyleSheets = [
          ...item.shadowRoot!.adoptedStyleSheets,
          sheet,
        ];
      }
    });
  }
  await page.waitForTimeout(100);
  const rects = await page.evaluate(() => {
    const show = (r: DOMRect) => `${r.x} ${r.y} ${r.width} ${r.height}`;
    const list = document.getElementById('l')!;
    return [
      `list ${show(list.getBoundingClientRect())}`,
      ...[...list.children].map(
        (i) =>
          `${i.id} ${show((i.shadowRoot!.querySelector('.host') ?? i).getBoundingClientRect())}`,
      ),
    ];
  });
  console.log(`# engine ${name} ${browser.version()}`);
  for (const line of rects) {
    console.log(line);
  }
  if (PNG) {
    for (const level of [0, 6]) {
      await page.evaluate((level) => {
        const items = document.getElementById('l')!
          .children as HTMLCollectionOf<HTMLElement>;
        const name = items[0]!
          .shadowRoot!.adoptedStyleSheets.flatMap((sheet) => [
            ...sheet.cssRules,
          ])
          .map((rule) => (rule as CSSStyleRule).style?.transitionProperty)
          .find((value) => value?.startsWith('--'))!;
        for (const item of items) {
          item.style.setProperty(name, String(level));
          item.style.transition = 'none';
        }
      }, level);
      await page.waitForTimeout(50);
      await page.screenshot({
        path: join(PNG, `${name}-level${level}.png`),
        animations: 'disabled',
      });
    }
  }
  await browser.close();
}

// Probe for the select plan, after popup.ts: three ways to place the menu, the
// direction of its inline alignment, and the order of a pointer press on the
// field against the popover's light dismiss.
//
//   P1  position-area with flips, a last @position-try that shrinks below
//   P2  P1, with the inline span in the menu's own direction (span-self-inline-end)
//   P3  P1, with a physical span chosen by :dir() of the host
//   P4  P1, with the menu's box in ltr and its options in the host's direction
//   P5  P3, with the menu's box in ltr and its options in the host's direction
//
// node placement.ts <chromium|firefox|webkit> [document-rtl]
//
// With document-rtl, the document is rtl and no case sets its own direction.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.argv[2]!;
const launcher = { chromium, firefox, webkit }[ENGINE]!;
const DOCUMENT_RTL = process.argv[3] === 'document-rtl';

const options = (n: number, cls = '') =>
  Array.from(
    { length: n },
    (_, i) => `<x-opt class="${cls}">Option ${i + 1}</x-opt>`,
  ).join('');

// a: room below. c: at the bottom edge, flips above. e: 30 options, no room
// for them on either side, shrinks below. f: rtl, as wide as the field.
// h: rtl, wider than the field. i: ltr, wider, at the right edge, flips
// inline. j: rtl, wider, at the left edge, flips inline.
const CASES = {
  a: ['top: 40px; left: 20px;', '', options(3)],
  c: ['top: 520px; left: 20px;', '', options(5)],
  e: ['top: 260px; left: 20px;', '', options(30)],
  f: ['top: 140px; right: 20px;', 'rtl', options(3)],
  h: ['top: 140px; left: 300px;', 'rtl', options(1, 'wide')],
  i: ['top: 40px; right: 10px;', '', options(1, 'wide')],
  j: ['top: 380px; left: 10px;', 'rtl', options(1, 'wide')],
} as const;

const VARIANTS = {
  P1: 'position-area: block-end span-inline-end;',
  P2: 'position-area: block-end span-self-inline-end;',
  P3: 'position-area: bottom span-right;',
  P4: 'position-area: block-end span-inline-end;',
  P5: 'position-area: bottom span-right;',
} as const;

const HTML = `<!doctype html><html dir="${DOCUMENT_RTL ? 'rtl' : 'ltr'}"><meta charset="utf-8">
<style>
body { margin: 0; block-size: 3000px; font: 16px/24px sans-serif; }
x-sel { position: absolute; }
.wide { inline-size: 300px; }
</style>
<div id="stage"></div>
<script>
const DOCUMENT_RTL = ${DOCUMENT_RTL};
const VARIANTS = ${JSON.stringify(VARIANTS)};
const css = (v) => \`
:host { display: inline-block; }
.field { anchor-name: --field; inline-size: 200px; block-size: 56px; background: #ddd; }
.menu {
  position-anchor: --field;
  inset: auto;
  margin: 0;
  padding: 0;
  border: 0;
  \${VARIANTS[v]}
  position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline, --shrink;
  min-inline-size: anchor-size(width);
  overflow: auto;
  box-sizing: border-box;
  background: #eee;
}
\${v === 'P3' || v === 'P5' ? ':host(:dir(rtl)) .menu { position-area: bottom span-left; }' : ''}
\${v === 'P4' || v === 'P5' ? '.menu { direction: ltr; } :host(:dir(rtl)) ::slotted(*) { direction: rtl; }' : ''}
@position-try --shrink {
  \${VARIANTS[v]}
  max-block-size: 100%;
}
::slotted(x-opt) { display: block; block-size: 48px; }
\`;
customElements.define('x-opt', class extends HTMLElement {});
customElements.define('x-sel', class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.log = [];
    this.addEventListener('pointerdown', () => this.log.push('pointerdown open=' + this.menu.matches(':popover-open')), true);
    this.addEventListener('pointerup', () => this.log.push('pointerup open=' + this.menu.matches(':popover-open')), true);
    this.addEventListener('click', () => this.log.push('click open=' + this.menu.matches(':popover-open')), true);
  }
  render(v) {
    this.tabIndex = 0;
    this.shadowRoot.innerHTML = '<style>' + css(v) + '</style><div class="field"></div><div class="menu" popover="auto"><slot></slot></div>';
    this.menu = this.shadowRoot.querySelector('.menu');
    this.field = this.shadowRoot.querySelector('.field');
  }
});
const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
window.setup = (cases, v) => {
  const stage = document.getElementById('stage');
  stage.replaceChildren();
  for (const [id, [style, dir, opts]] of Object.entries(cases)) {
    const s = document.createElement('x-sel');
    s.id = id; s.style.cssText = style; if (dir && !DOCUMENT_RTL) s.dir = dir; s.innerHTML = opts;
    stage.append(s); s.render(v);
  }
};
window.open1 = async (id) => {
  const s = document.getElementById(id);
  s.focus(); s.menu.showPopover();
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  const f = r(s.field), m = r(s.menu);
  const side = m[1] >= f[3] ? 'below' : m[3] <= f[1] ? 'above' : 'overlap';
  const inline = m[0] === f[0] ? 'left edges' : m[2] === f[2] ? 'right edges' : 'neither edge';
  return { field: f, menu: m, side, inline, height: m[3] - m[1], scrolls: s.menu.scrollHeight > s.menu.clientHeight };
};
</script>`;

const dir = await mkdtemp(join(tmpdir(), 'select-placement-'));
const file = join(dir, 'index.html');
await writeFile(file, HTML);

const browser = await launcher.launch();
console.log(
  `# ${ENGINE} ${browser.version()}${DOCUMENT_RTL ? ', document rtl' : ''}`,
);
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(pathToFileURL(file).href);

for (const v of Object.keys(VARIANTS)) {
  await page.evaluate(([c, v]) => (window as any).setup(c, v), [
    CASES,
    v,
  ] as const);
  for (const id of Object.keys(CASES)) {
    const o = await page.evaluate((id) => (window as any).open1(id), id);
    console.log(
      `  ${v} ${id}  ${o.side.padEnd(6)} ${o.inline.padEnd(12)} h=${o.height} scrolls=${o.scrolls} field=${JSON.stringify(o.field)} menu=${JSON.stringify(o.menu)}`,
    );
  }
}

// The order of a press on the field of an open menu, against light dismiss.
await page.evaluate(([c, v]) => (window as any).setup(c, v), [
  CASES,
  'P1',
] as const);
await page.evaluate((id) => (window as any).open1(id), 'a');
await page.mouse.click(30, 50);
console.log(
  `  press on the field of an open menu: ${await page.evaluate(() => (document.getElementById('a') as any).log.join(', '))}`,
);

await browser.close();
await rm(dir, { recursive: true });

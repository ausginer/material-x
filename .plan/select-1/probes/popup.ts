// Probe for the select plan: a popover listbox in a shadow root, anchored to a
// field of the same shadow root by CSS anchor positioning. Reads its place,
// width, flipping, scroll tracking, escape from clipping, light dismiss and
// focus in each engine.
//
// node popup.ts <chromium|firefox|webkit>
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.argv[2]!;
const launcher = { chromium, firefox, webkit }[ENGINE]!;

const options = (n: number) =>
  Array.from({ length: n }, (_, i) => `<x-opt>Option ${i + 1}</x-opt>`).join(
    '',
  );

// a, b: two selects side by side, so a fixed anchor name must stay tree-scoped.
// c: near the viewport's bottom edge, so the menu flips above.
// d: inside a clipping, transformed scroller.
// e: 30 options with no room for them either way: the menu must shrink.
// f: dir=rtl.
// g, h: options wider than the field, ltr and rtl.
// i: wider options at the inline end of the viewport, so the menu flips inline.
const HTML = `<!doctype html><meta charset="utf-8">
<style>
body { margin: 0; block-size: 3000px; font: 16px/24px sans-serif; }
#a { position: absolute; top: 40px; left: 20px; }
#b { position: absolute; top: 40px; left: 300px; }
#c { position: absolute; top: 520px; left: 20px; }
#scroller { position: absolute; top: 140px; left: 300px; inline-size: 260px; block-size: 70px; overflow: hidden; transform: translateZ(0); }
#e { position: absolute; top: 260px; left: 20px; }
#f { position: absolute; top: 140px; right: 20px; }
#g { position: absolute; top: 380px; left: 20px; }
#h { position: absolute; top: 380px; left: 300px; }
#i { position: absolute; top: 40px; right: 10px; }
.wide { inline-size: 300px; }
</style>
<x-sel id="a">${options(3)}</x-sel>
<x-sel id="b">${options(3)}</x-sel>
<x-sel id="c">${options(5)}</x-sel>
<div id="scroller"><x-sel id="d">${options(5)}</x-sel></div>
<x-sel id="e">${options(30)}</x-sel>
<x-sel id="f" dir="rtl">${options(3)}</x-sel>
<x-sel id="g"><x-opt class="wide">Wide</x-opt></x-sel>
<x-sel id="h" dir="rtl"><x-opt class="wide">Wide</x-opt></x-sel>
<x-sel id="i"><x-opt class="wide">Wide</x-opt></x-sel>
<script>
const css = \`
:host { display: inline-block; }
.field { anchor-name: --field; inline-size: 200px; block-size: 56px; background: #ddd; }
.menu {
  position-anchor: --field;
  inset: auto;
  margin: 0;
  padding: 0;
  border: 0;
  position-area: block-end span-inline-end;
  position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
  position-try-order: most-block-size;
  min-inline-size: anchor-size(width);
  max-block-size: 100%;
  overflow: auto;
  box-sizing: border-box;
  background: #eee;
}
::slotted(x-opt) { display: block; block-size: 48px; }
\`;
customElements.define('x-opt', class extends HTMLElement {});
customElements.define('x-sel', class extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + css + '</style><div class="field" part="field"></div><div class="menu" popover="auto"><slot></slot></div>';
    this.tabIndex = 0;
    this.menu = root.querySelector('.menu');
    this.field = root.querySelector('.field');
    this.events = [];
    this.menu.addEventListener('toggle', (e) => this.events.push('toggle:' + e.newState));
  }
});
const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
window.read = (id) => {
  const s = document.getElementById(id);
  const open = s.menu.matches(':popover-open');
  const [ml, mt, mr, mb] = r(s.menu);
  const [fl, ft, fr, fb] = r(s.field);
  const cx = (ml + mr) / 2, cy = (mt + Math.min(mb, mt + 20)) / 2;
  const hit = document.elementFromPoint(cx, cy);
  return { open, field: [fl, ft, fr, fb], menu: [ml, mt, mr, mb], height: mb - mt,
    scrollable: s.menu.scrollHeight > s.menu.clientHeight,
    hit: hit === s ? 'host' : hit?.localName + (hit?.parentElement === s ? ' of host' : ''),
    focused: document.activeElement?.id ?? null, events: s.events.join(' ') };
};
window.supportsSource = (() => { let read = false; try { const p = document.createElement('div'); p.popover = 'auto'; document.body.append(p); p.showPopover({ get source() { read = true; return document.body; } }); p.hidePopover(); p.remove(); } catch (e) { return 'threw ' + e.name; } return read; })();
window.frames2 = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
</script>`;

const dir = await mkdtemp(join(tmpdir(), 'select-popup-'));
const file = join(dir, 'index.html');
await writeFile(file, HTML);

const browser = await launcher.launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.goto(pathToFileURL(file).href);

console.log(
  '  showPopover reads source:',
  await page.evaluate(() => (window as any).supportsSource),
);
const show = async (id: string, source = false) =>
  page.evaluate(
    async ([id, source]) => {
      const s = document.getElementById(id as string) as any;
      s.focus();
      s.menu.showPopover(source ? { source: s } : undefined);
      await (window as any).frames2();
      return (window as any).read(id);
    },
    [id, source] as const,
  );
const read = async (id: string) =>
  page.evaluate(async (id) => {
    await (window as any).frames2();
    return (window as any).read(id);
  }, id);
const line = (label: string, o: unknown) =>
  console.log(`  ${label.padEnd(30)} ${JSON.stringify(o)}`);

line('a open', await show('a'));
line('b open', await show('b'));
line('a after b opened', await read('a'));
line('c open (bottom edge)', await show('c'));
line('d open (clipped scroller)', await show('d'));
line('e open (30 options)', await show('e'));
line('f open (rtl)', await show('f'));
line('g open (wide, ltr)', await show('g'));
line('h open (wide, rtl)', await show('h'));
line('i open (wide, inline end)', await show('i'));
line('a open again', await show('a'));
await page.evaluate(() => window.scrollBy(0, 30));
line('a after page scroll 30', await read('a'));
await page.evaluate(() => window.scrollTo(0, 0));
await page.setViewportSize({ width: 700, height: 500 });
line('a after resize', await read('a'));
line('c open after resize', await show('c'));
await page.setViewportSize({ width: 800, height: 600 });
await show('a');
await page.mouse.click(780, 580);
line('a after click outside', await read('a'));
await show('a');
await page.keyboard.press('Escape');
line('a after Escape', await read('a'));
await show('a');
await page.mouse.click(30, 50);
line('a after click on own field', await read('a'));
await show('a', true);
await page.mouse.click(30, 50);
line('a, source: click on own field', await read('a'));
await page.mouse.click(780, 580);
line('a, source: click outside', await read('a'));

await browser.close();
await rm(dir, { recursive: true });

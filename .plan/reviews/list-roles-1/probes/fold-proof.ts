// Probe of the feature proof of RF-68's second re-ruling: what a folded
// `mx-list-item` and a box-host interactive item do, on a built package, in
// Chromium, Firefox and WebKit. Run it on `main`'s build and on the branch's,
// and `diff` the outputs.
//
// node fold-proof.ts <packages/material-x> <engine> [<png dir>]
//
// Sections:
//   lift     - core's reorderable trait itself lifts the item, grabbed from the
//              keyboard on its `[data-handle]`: the list's flow, the footprint,
//              the lifted element's styles and pseudo-element layers, and,
//              with a png dir, a screenshot of the list during the lift
//   focus    - `focus()` on each item's host, enabled and disabled
//   tab      - the Tab order of a list whose hosts carry a consumer `tabindex`
//   layers   - the computed box-shadow layers of each item's box
//   reset    - a document rule `*, ::before, ::after { margin: 0; padding: 0;
//              border: 0 solid }`, as Tailwind v4's preflight writes it: each
//              item's box and its label
//   popover  - a document rule `[popover] { padding: 16px; background: red;
//              overflow: auto }`: the lift's styles with it
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit, type Page } from 'playwright';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [MX, ENGINE, PNG] = process.argv.slice(2) as [string, string, string?];

const dir = await mkdtemp(join(tmpdir(), 'fold-proof-'));
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

const type = { chromium, firefox, webkit }[ENGINE]!;
const browser = await type.launch();
console.log(`# engine ${ENGINE} ${browser.version()}`);

async function open(body: string, head = ''): Promise<Page> {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8">${head}</head><body style="margin: 0">${body}</body></html>`,
  );
  await page.addScriptTag({ content: code });
  await page.waitForFunction(() => customElements.get('mx-list-link-item'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  return page;
}

const handle = '<span slot="trail" data-handle>Grip</span>';
const LIFT_LIST = `<mx-list id="l" reorderable style="gap: 12px; inline-size: 360px">
  <mx-list-item id="s0">Before</mx-list-item>
  <mx-list-item id="s">Static ${handle}</mx-list-item>
  <mx-list-button-item id="b">Button item ${handle}</mx-list-button-item>
  <mx-list-link-item id="a" href="#x">Link item</mx-list-link-item>
</mx-list>`;

// The element that is the item's box: its `.host`, or the host without one.
const BOX = `(i) => i.shadowRoot.querySelector('.host') ?? i`;

async function lift(id: string, head: string, tag: string) {
  const page = await open(LIFT_LIST, head);
  const read = (phase: string) =>
    page.evaluate(
      ([id, phase, box]) => {
        const boxOf = eval(box) as (i: Element) => HTMLElement;
        const show = (r: DOMRect) => `${r.x} ${r.y} ${r.width} ${r.height}`;
        const list = document.getElementById('l')!;
        const item = document.getElementById(id)!;
        // The element core's trait lifts: whichever matches `:popover-open`.
        const lifted =
          [item, item.shadowRoot!.querySelector('.host')].find((e) =>
            e?.matches(':popover-open'),
          ) ?? boxOf(item);
        const s = getComputedStyle(lifted);
        const before = getComputedStyle(lifted, '::before');
        const after = getComputedStyle(lifted, '::after');
        // Every list child in the list's flow, and the sum of their heights and
        // gaps: equal to the list's height when no empty box is left behind.
        const flow = [...list.children].filter((c) => {
          const el = c.shadowRoot ? boxOf(c) : c;
          return (
            !c.matches(':popover-open') &&
            !el.matches(':popover-open') &&
            el.getClientRects().length > 0
          );
        });
        const emptyBoxes = [...list.children].filter((c) => {
          const open = c.shadowRoot?.querySelector(':popover-open');
          return open && c.getClientRects().length > 0;
        });
        const gap = parseFloat(getComputedStyle(list).rowGap);
        const sum =
          flow.reduce(
            (t, c) =>
              t + (c.shadowRoot ? boxOf(c) : c).getBoundingClientRect().height,
            0,
          ) +
          gap * (flow.length - 1);
        const footprint = list.querySelector('[data-footprint]');
        return [
          `${phase}: list ${list.getBoundingClientRect().height}, flow ${flow.map((c) => c.id || c.localName + (c.hasAttribute('data-footprint') ? '[fp]' : '')).join(' ')} sum ${sum}, hosts with a box around a lifted .host ${emptyBoxes.length}`,
          `${phase}: next item top ${boxOf(document.getElementById('a')!).getBoundingClientRect().top}`,
          `${phase}: footprint ${footprint ? `${show(footprint.getBoundingClientRect())} before ${footprint.nextElementSibling?.id}` : 'none'}`,
          `${phase}: lifted ${lifted === item ? 'host' : lifted.className || lifted.localName} open ${lifted.matches(':popover-open')} rect ${show(lifted.getBoundingClientRect())}`,
          `${phase}: lifted padding ${s.padding} overflow ${s.overflow} background ${s.backgroundColor} color ${s.color} box-shadow ${s.boxShadow} border ${s.borderTopWidth} radius ${s.borderTopLeftRadius}`,
          `${phase}: ::before ${before.content} ${before.position} ${before.inset} ${before.boxShadow} | ::after ${after.content} ${after.position} ${after.inset} ${after.boxShadow}`,
          `${phase}: host attrs popover=${item.getAttribute('popover')} style="${item.getAttribute('style') ?? ''}"`,
        ];
      },
      [id, phase, BOX] as const,
    );
  const out = [...(await read('before'))];
  await page.focus(`#${id} [data-handle]`);
  await page.keyboard.press(' ');
  await page.waitForTimeout(800);
  out.push(...(await read('lifted')));
  if (PNG) {
    await page.screenshot({
      path: join(PNG, `${ENGINE}-${tag}-${id}.png`),
      clip: { x: 0, y: 0, width: 400, height: 260 },
      animations: 'disabled',
    });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  out.push(...(await read('after')));
  await page.close();
  return out;
}

for (const id of ['s', 'b']) {
  console.log(`## lift #${id}`);
  for (const line of await lift(id, '', 'lift')) console.log(line);
}

console.log('## focus');
{
  const page = await open(`<mx-list id="l">
  <mx-list-item id="s">Static</mx-list-item>
  <mx-list-item id="st" tabindex="0">Static with tabindex</mx-list-item>
  <mx-list-button-item id="b">Button</mx-list-button-item>
  <mx-list-button-item id="bd" disabled>Button disabled</mx-list-button-item>
  <mx-list-link-item id="a" href="#x">Link</mx-list-link-item>
  <mx-list-link-item id="ad" href="#x" disabled>Link disabled</mx-list-link-item>
</mx-list><button id="after">After</button>`);
  for (const id of ['s', 'st', 'b', 'bd', 'a', 'ad']) {
    const r = await page.evaluate((id) => {
      (document.activeElement as HTMLElement | null)?.blur();
      const host = document.getElementById(id)!;
      host.focus();
      const a = document.activeElement;
      const inner = a?.shadowRoot?.activeElement;
      return `${id}.focus(): active ${a?.id || a?.localName} inner ${inner ? inner.localName + '.' + inner.className : 'none'} host :focus ${host.matches(':focus')}`;
    }, id);
    console.log(r);
  }
  // A click on each interactive host's box.
  for (const id of ['b', 'a']) {
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    const box = await page.evaluate(
      ([id, b]) =>
        (eval(b) as (i: Element) => HTMLElement)(document.getElementById(id)!)
          .getBoundingClientRect()
          .toJSON() as DOMRect,
      [id, BOX] as const,
    );
    await page.mouse.click(box.x + 20, box.y + box.height / 2);
    const r = await page.evaluate((id) => {
      const a = document.activeElement;
      const inner = a?.shadowRoot?.activeElement;
      return `click #${id}: active ${a?.id || a?.localName} inner ${inner ? inner.localName : 'none'}`;
    }, id);
    console.log(r);
    await page.evaluate(() => (location.hash = ''));
  }
  await page.close();
}

console.log('## tab');
for (const variant of ['0', '-1']) {
  const page = await open(`<button id="start">Start</button><mx-list id="l">
  <mx-list-item id="s">Static</mx-list-item>
  <mx-list-item id="st" tabindex="${variant}">Static with tabindex</mx-list-item>
  <mx-list-button-item id="b">Button</mx-list-button-item>
  <mx-list-button-item id="bt" tabindex="${variant}">Button with tabindex</mx-list-button-item>
  <mx-list-link-item id="at" href="#x" tabindex="${variant}">Link with tabindex</mx-list-link-item>
</mx-list><button id="after">After</button>`);
  await page.focus('#start');
  const seq: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    seq.push(
      await page.evaluate(() => {
        const a = document.activeElement!;
        const inner = a.shadowRoot?.activeElement;
        return `${a.id || a.localName}${inner ? '>' + inner.localName : ''}${a.matches(':focus-visible') ? '(fv)' : ''}`;
      }),
    );
  }
  console.log(`tabindex="${variant}" on #st, #bt, #at: ${seq.join(' | ')}`);
  await page.close();
}

console.log('## layers');
{
  const page = await open(LIFT_LIST.replace(' reorderable', ''));
  const lines = await page.evaluate((box) => {
    const boxOf = eval(box) as (i: Element) => HTMLElement;
    return ['s', 'b', 'a'].flatMap((id) => {
      const host = document.getElementById(id)!;
      const el = boxOf(host);
      return [el, host].flatMap((e) =>
        ['', '::before', '::after'].map((p) => {
          const s = getComputedStyle(e, p || null);
          return `#${id} ${e === host ? 'host' : '.host'}${p}: content ${s.content} display ${s.display} position ${s.position} inset ${s.inset} radius ${s.borderTopLeftRadius} shadow ${s.boxShadow} events ${s.pointerEvents}`;
        }),
      );
    });
  }, BOX);
  for (const line of lines) console.log(line);
  await page.close();
}

console.log('## reset');
{
  const head =
    '<style>*, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; }</style>';
  for (const h of ['', head]) {
    const page = await open(LIFT_LIST.replace(' reorderable', ''), h);
    const lines = await page.evaluate((box) => {
      const boxOf = eval(box) as (i: Element) => HTMLElement;
      const show = (r: DOMRect) => `${r.x} ${r.y} ${r.width} ${r.height}`;
      return ['s0', 'b', 'a'].map((id) => {
        const el = boxOf(document.getElementById(id)!);
        const label =
          el.getRootNode() instanceof ShadowRoot
            ? (el.getRootNode() as ShadowRoot).querySelector('.label')!
            : el.shadowRoot!.querySelector('.label')!;
        const s = getComputedStyle(el);
        return `#${id} box ${show(el.getBoundingClientRect())} padding ${s.padding} label ${show(label.getBoundingClientRect())}`;
      });
    }, BOX);
    for (const line of lines)
      console.log(`${h ? 'with reset' : 'no reset  '} ${line}`);
    await page.close();
  }
}

console.log('## popover');
for (const id of ['s', 'b']) {
  const lines = await lift(
    id,
    '<style>[popover] { padding: 16px; background: red; overflow: auto; }</style>',
    'popover',
  );
  for (const line of lines.filter((l) => l.startsWith('lifted: lifted'))) {
    console.log(`#${id} ${line}`);
  }
}

await browser.close();

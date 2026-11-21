// Probe for RF-68's re-ruling of 2026-11-21: what folding mx-list-item's inner
// `.host` div into its host changes, and what lifting each item's host itself,
// instead of its `.host`, changes, in Chromium, Firefox and WebKit.
//
// node list-fold.ts <packages/material-x> <engine>
//
// It reads the built package and emulates the decision in the page:
//   fold    - each static item's `.host` div is removed and its children move
//             to the shadow root. Each of the item's adopted sheets that names
//             `.host` is replaced by a copy in which `.host` reads `:host` and
//             `all: unset` is dropped (the `unset` longhands it serializes
//             as are removed), so the item's box rule and the
//             elevation's `.host` rules style the host
//             and the folded host adopts \`:host { box-shadow: none }\`: on
//             main, the \`all: unset\` of the item's \`.host\` rule comes after
//             the elevation's \`.host\` rule and removes its penumbra
//   box     - each interactive item's shadow root adopts `:host { display:
//             block }`, as the box host of the decision has it
// The reference, `main`, is the built package unchanged.
//
// Sections, each printed with its own header:
//   layout  - every item's box (`.host` on main; the host of a folded static
//             item) and the list's box, for the fixture of list-layout.ts
//   computed - every computed property of the static items' box, and of its
//             ::before and ::after, that differs between main and the fold
//   pixels  - a screenshot of the list, on main and folded, with every item at
//             elevation level 0 and at 6; equal PNG bytes mean equal pixels
//   lift    - lifts the static and the button item four ways, in a list with a
//             12 px gap, at elevation level 6:
//               inner      - main: the item's `.host`, as core's trait does
//               core       - folded: the host, as core's trait does (inline
//                            position, inset, top, left, width, height,
//                            margin and border, then a manual popover)
//               core-reset - the same, with the item's resets of the UA
//                            popover properties that core's trait doesn't
//                            write: `overflow: visible` on a folded static
//                            host, and `padding: 0; overflow: visible;
//                            background: none; color: inherit` on a box host
//               drag       - folded: the host, as @ydinjs/drag's lift on
//                            repo/list-sortable-1 does: the UA_PROPS
//                            (padding, border, overflow, color,
//                            background-color) written inline from their
//                            computed values first
//             For each: the list's height and the link item's top, before and
//             during; whether the visual keeps its rect; its computed padding,
//             overflow and background during; how far the visual and the
//             item's box (its `.host`, or the folded host) moved and grew;
//             and whether a screenshot of the
//             item's area during the lift equals `inner`'s
//   focus   - a folded static item with `tabindex="0"`, and a box-host button
//             item: what `focus()` and Tab reach, whether `:focus-visible`
//             matches, and whether focus survives a lift of the host
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit, type Page } from 'playwright';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [MX, ENGINE] = process.argv.slice(2) as [string, string];

const dir = await mkdtemp(join(tmpdir(), 'list-fold-'));
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

// `--fk` is `--_level`, the elevation level, as the build mangles it.
const HELPERS = `
const sheet = (text) => { const s = new CSSStyleSheet(); s.replaceSync(text); return s; };
const adopt = (item, text) => {
  item.shadowRoot.adoptedStyleSheets = [...item.shadowRoot.adoptedStyleSheets, sheet(text)];
};
window.folded = [];
window.fold = (item) => {
  const root = item.shadowRoot;
  const div = root.querySelector('.host');
  root.append(...div.childNodes);
  div.remove();
  root.adoptedStyleSheets = root.adoptedStyleSheets.map((s) => {
    const text = [...s.cssRules].map((r) => r.cssText).join('\\n');
    if (!text.includes('.host')) return s;
    // \`all: unset\` serializes as one \`unset\` longhand per property that
    // the rule doesn't declare again, so those longhands are what is removed.
    const copy = sheet(text);
    for (const r of copy.cssRules) {
      if (r.selectorText === '.host') {
        for (const p of [...r.style]) {
          if (r.style.getPropertyValue(p) === 'unset') r.style.removeProperty(p);
        }
      }
    }
    folded.push(...([...copy.cssRules].map((r) => r.cssText).join('').match(/[\\w-]+:\\s*unset/g) ?? []));
    return sheet([...copy.cssRules].map((r) => r.cssText).join('\\n').replaceAll('.host', ':host'));
  });
};
window.decide = (list, resets) => {
  for (const item of list.children) {
    if (item.localName === 'mx-list-item') {
      fold(item);
      // On main, the item's \`all: unset\` comes after the elevation's
      // \`.host\` rule and removes its penumbra, which the fold keeps out.
      adopt(item, ':host { box-shadow: none; }');
      if (resets) adopt(item, ':host { overflow: visible; }');
    } else {
      adopt(item, ':host { display: block; }' + (resets ? ':host { padding: 0; overflow: visible; background: none; color: inherit; }' : ''));
    }
  }
};
window.boxOf = (item) =>
  item.shadowRoot.querySelector('.host') ?? item;
window.UA_PROPS = ['padding', 'border-width', 'border-style', 'border-color', 'overflow', 'color', 'background-color'];
window.lift = (visual, how, rect = visual.getBoundingClientRect()) => {
  if (how === 'drag') {
    const cs = getComputedStyle(visual);
    const values = UA_PROPS.map((p) => cs.getPropertyValue(p));
    visual.style.boxSizing = 'border-box';
    visual.style.margin = '0';
    UA_PROPS.forEach((p, i) => visual.style.setProperty(p, values[i]));
    visual.style.transition = 'none';
    visual.style.position = 'fixed';
    visual.style.inset = 'auto';
    visual.style.top = rect.top + 'px';
    visual.style.left = rect.left + 'px';
    visual.style.width = rect.width + 'px';
    visual.style.height = rect.height + 'px';
  } else {
    visual.style.position = 'fixed';
    visual.style.inset = 'auto';
    visual.style.top = rect.top + 'px';
    visual.style.left = rect.left + 'px';
    visual.style.width = rect.width + 'px';
    visual.style.height = rect.height + 'px';
    visual.style.margin = '0';
    visual.style.border = '0';
  }
  visual.popover = 'manual';
  visual.showPopover();
  return rect;
};
window.drop = (visual) => {
  visual.hidePopover();
  visual.removeAttribute('popover');
};
`;

const type = { chromium, firefox, webkit }[ENGINE]!;
const browser = await type.launch();
console.log(`# engine ${ENGINE} ${browser.version()}`);

async function open(body: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>body { margin: 16px; }</style></head><body>${body}</body></html>`,
  );
  await page.addScriptTag({ content: code });
  await page.addScriptTag({ content: HELPERS });
  await page.waitForFunction(() => customElements.get('mx-list-link-item'));
  await page.waitForTimeout(100);
  return page;
}

// layout: list-layout.ts's fixture.
const item = (tag: string, id: string, lines: number, extra = '') => {
  const attrs = tag === 'mx-list-link-item' ? ' href="#x"' : '';
  const overline = lines === 3 ? '<span slot="overline">Overline</span>' : '';
  const support =
    lines >= 2 ? '<span slot="support">Supporting text</span>' : '';
  return `<${tag} id="${id}"${attrs}${extra}><span slot="lead" data-icon>★</span>${overline}Label ${id}${support}<span slot="trail">100+</span></${tag}>`;
};
const LAYOUT = `<mx-list id="l" style="gap: 12px; inline-size: 360px">
${['mx-list-item', 'mx-list-button-item', 'mx-list-link-item']
  .flatMap((tag) =>
    [1, 2, 3].map((n) => item(tag, `${tag.slice(8, 12)}${n}`, n)),
  )
  .join('\n')}
${item('mx-list-button-item', 'butt-disabled', 1, ' disabled')}
${item('mx-list-link-item', 'link-disabled', 1, ' disabled')}
</mx-list>`;

async function layout(decided: boolean): Promise<string[]> {
  const page = await open(LAYOUT);
  const lines = await page.evaluate((decided) => {
    const list = document.getElementById('l')!;
    if (decided) (window as any).decide(list, false);
    const r = (e: Element) => {
      const b = e.getBoundingClientRect();
      return `${b.x} ${b.y} ${b.width} ${b.height}`;
    };
    const out = [`list ${r(list)}`];
    for (const item of list.children) {
      out.push(`${item.id} ${r((window as any).boxOf(item))}`);
    }
    // The fold's own sanity: the static host's ::before is the elevation's.
    const s = document.getElementById('item1')!;
    const before = getComputedStyle(s, '::before');
    out.push(
      `sanity item1 host display=${getComputedStyle(s).display} ::before content=${before.content} position=${before.position} unset-left=${JSON.stringify((window as any).folded)} shadow-children=${[...s.shadowRoot!.children].map((c) => c.localName + (c.className ? '.' + c.className : '')).join(',')}`,
    );
    return out;
  }, decided);
  await page.close();
  return lines;
}

const mainLayout = await layout(false);
const foldLayout = await layout(true);
console.log('## layout');
for (let i = 0; i < mainLayout.length; i++) {
  const same = mainLayout[i] === foldLayout[i];
  console.log(
    same
      ? `equal  ${mainLayout[i]}`
      : `DIFFER main: ${mainLayout[i]}\n       fold: ${foldLayout[i]}`,
  );
}

async function computed(decided: boolean): Promise<Record<string, string>> {
  const page = await open(LAYOUT);
  const values = await page.evaluate((decided) => {
    const list = document.getElementById('l')!;
    if (decided) (window as any).decide(list, false);
    const out: Record<string, string> = {};
    for (const id of ['item1', 'item3']) {
      const box = (window as any).boxOf(document.getElementById(id));
      for (const pseudo of ['', '::before', '::after']) {
        const cs = getComputedStyle(box, pseudo || null);
        for (const name of cs) {
          if (!name.startsWith('--')) {
            out[`${id}${pseudo} ${name}`] = cs.getPropertyValue(name);
          }
        }
      }
    }
    return out;
  }, decided);
  await page.close();
  return values;
}

console.log(
  "## computed (item1 and item3: main's .host and the folded host, with their ::before and ::after; only the differences)",
);
{
  const a = await computed(false);
  const b = await computed(true);
  for (const key of Object.keys(a)) {
    if (a[key] !== b[key]) {
      console.log(
        `${key}: main ${JSON.stringify(a[key])}, fold ${JSON.stringify(b[key])}`,
      );
    }
  }
}

async function pixels(decided: boolean, level: number): Promise<Buffer> {
  const page = await open(LAYOUT);
  await page.evaluate(
    ({ decided, level }) => {
      const list = document.getElementById('l')!;
      if (decided) (window as any).decide(list, false);
      for (const item of list.children as HTMLCollectionOf<HTMLElement>) {
        item.style.setProperty('--fk', String(level));
        item.style.transition = 'none';
      }
    },
    { decided, level },
  );
  await page.waitForTimeout(50);
  const shot = await page.screenshot({ animations: 'disabled' });
  await page.close();
  return shot;
}

console.log('## pixels');
for (const level of [0, 6]) {
  const a = await pixels(false, level);
  const b = await pixels(true, level);
  console.log(
    `level ${level}: main and fold screenshots ${a.equals(b) ? 'equal' : 'DIFFER'} (${a.length} and ${b.length} bytes)`,
  );
}

const LIFT = `<mx-list id="l" style="gap: 12px; inline-size: 360px">
  <mx-list-item id="s">Static</mx-list-item>
  <mx-list-button-item id="b">Button item</mx-list-button-item>
  <mx-list-link-item id="a" href="#x">Link item</mx-list-link-item>
</mx-list>`;

async function lift(
  mode: string,
  id: string,
): Promise<{ text: string; shot: Buffer }> {
  const page = await open(LIFT);
  const r = await page.evaluate(
    ({ mode, id }) => {
      const w = window as any;
      const list = document.getElementById('l')!;
      if (mode !== 'inner') w.decide(list, mode === 'core-reset');
      for (const item of list.children as HTMLCollectionOf<HTMLElement>) {
        item.style.setProperty('--fk', '6');
        item.style.transition = 'none';
      }
      const link = w.boxOf(document.getElementById('a'));
      const before = {
        list: list.getBoundingClientRect().height,
        link: link.getBoundingClientRect().top,
      };
      const item = document.getElementById(id)!;
      const content: HTMLElement = w.boxOf(item);
      const contentRect = content.getBoundingClientRect();
      const visual: HTMLElement =
        mode === 'inner' ? item.shadowRoot!.querySelector('.host')! : item;
      const rect = visual.getBoundingClientRect();
      const footprint = document.createElement('div');
      footprint.style.width = `${rect.width}px`;
      footprint.style.height = `${rect.height}px`;
      item.before(footprint);
      w.lift(visual, mode === 'drag' ? 'drag' : 'core', rect);
      const lifted = visual.getBoundingClientRect();
      const moved = content.getBoundingClientRect();
      const shift = `visual ${lifted.width - rect.width}x${lifted.height - rect.height} larger at ${lifted.x - rect.x},${lifted.y - rect.y}; its box ${moved.width - contentRect.width}x${moved.height - contentRect.height} larger at ${moved.x - contentRect.x},${moved.y - contentRect.y}`;
      const cs = getComputedStyle(visual);
      return {
        clip: {
          x: rect.x - 16,
          y: rect.y - 16,
          width: rect.width + 32,
          height: rect.height + 32,
        },
        text: `list ${before.list} -> ${list.getBoundingClientRect().height}, link top ${before.link} -> ${link.getBoundingClientRect().top}, rect kept=${['x', 'y', 'width', 'height'].every((k) => (lifted as any)[k] === (rect as any)[k])}, padding=${cs.paddingTop}/${cs.paddingLeft} overflow=${cs.overflowY} background=${cs.backgroundColor}, ${shift}`,
      };
    },
    { mode, id },
  );
  await page.waitForTimeout(50);
  const shot = await page.screenshot({ clip: r.clip, animations: 'disabled' });
  await page.close();
  return { text: r.text, shot };
}

console.log('## lift');
for (const id of ['s', 'b']) {
  const ref = await lift('inner', id);
  console.log(`${id} inner      ${ref.text}`);
  for (const mode of ['core', 'core-reset', 'drag']) {
    const r = await lift(mode, id);
    console.log(
      `${id} ${mode.padEnd(10)} ${r.text}, pixels ${r.shot.equals(ref.shot) ? 'equal to inner' : 'DIFFER from inner'}`,
    );
  }
}

console.log('## focus');
{
  const page = await open(`<button id="before">Before</button>
<mx-list id="l">
  <mx-list-item id="s" tabindex="0">Static</mx-list-item>
  <mx-list-item id="n">No tabindex</mx-list-item>
  <mx-list-button-item id="b">Button item</mx-list-button-item>
</mx-list>
<button id="after">After</button>`);
  await page.evaluate(() =>
    (window as any).decide(document.getElementById('l'), false),
  );
  const deep = () =>
    page.evaluate(() => {
      let e: Element | null = document.activeElement;
      let s = e?.id ? `#${e.id}` : (e?.localName ?? '');
      while (e?.shadowRoot?.activeElement) {
        e = e.shadowRoot.activeElement;
        s += ` > ${e.localName}`;
      }
      return s;
    });
  await page.evaluate(() => document.getElementById('s')!.focus());
  console.log(`s.focus() reaches ${await deep()}`);
  await page.evaluate(() => document.getElementById('b')!.focus());
  console.log(`b.focus() reaches ${await deep()}`);
  await page.locator('#before').focus();
  const order: string[] = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    order.push(
      `${await deep()}${await page.evaluate(() => (document.activeElement?.id === 's' ? ` (:focus-visible ${document.activeElement.matches(':focus-visible')})` : ''))}`,
    );
  }
  console.log(`Tab from #before: ${order.join(' | ')}`);
  for (const id of ['s', 'b']) {
    await page.evaluate((id) => document.getElementById(id)!.focus(), id);
    const during = await page.evaluate((id) => {
      const item = document.getElementById(id)!;
      (window as any).lift(item, 'core');
      return document.activeElement?.id;
    }, id);
    const duringDeep = await deep();
    await page.evaluate((id) => {
      (window as any).drop(document.getElementById(id)!);
    }, id);
    await page.waitForTimeout(50);
    console.log(
      `focus on #${id}, host lifted: ${duringDeep} (${during}); after the drop: ${await deep()}`,
    );
  }
  await page.close();
}

await browser.close();

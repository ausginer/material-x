// Probe for the architect's ruling on the feature proof's `reviewer-2` and
// `reviewer-3` (RF-68, second re-ruling): which fixes keep a folded or box host
// as it is when a page's own rules match it, in Chromium, Firefox and WebKit,
// on the branch's built package. Each fix is emulated in the page.
//
// node fold-cascade.ts <packages/material-x> <engine> <png dir>
//
// Sections:
//   reset  - a page rule `*, ::before, ::after { box-sizing: border-box;
//            margin: 0; padding: 0; border: 0 solid }`, as Tailwind v4's
//            preflight writes it, on property 5's fixture and on static items
//            with only a lead, only a trail, or neither. Variants:
//              branch  - the build unchanged
//              spacing - `mx-list-item`'s spacing moves from its host's
//                        padding to margins of its shadow children: the
//                        block space on `.lead`, `.content` and `.trail`, the
//                        leading space on the first of them shown and the
//                        trailing space on the last
//            Each variant writes <png dir>/<engine>-reset-<variant>-<page>-
//            level<N>.png, so the pixels compare with `cmp`. A last line reads
//            a consumer's `padding-inline: 24px` on an `mx-list-item`.
//   lift   - core's trait lifts `mx-list-item` (#s) and `mx-list-button-item`
//            (#b) from the keyboard, under three page rules: none, a popover
//            rule `[popover] { padding: 16px; background: red; overflow: auto;
//            color: blue; box-shadow: 0 0 0 4px lime }`, and the consumer's own
//            `#s { padding-inline: 24px; background-color: rgb(0, 0, 255) }`.
//            Variants:
//              branch    - the build unchanged
//              inline    - the trait keeps the visual's computed padding,
//                          overflow, color and background color, read before
//                          `popover` is set and written inline, as drag's lift
//                          does, and restores them with the attribute. The
//                          items' `:host` lift resets are removed
//              important - the resets and `mx-list-item`'s own padding,
//                          background and color are written again under
//                          `:host(:popover-open)` with `!important`
//            Each lift writes <png dir>/<engine>-lift-<variant>-<rule>-<id>.png.
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit, type Page } from 'playwright';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [MX, ENGINE, PNG] = process.argv.slice(2) as [string, string, string];

const dir = await mkdtemp(join(tmpdir(), 'fold-cascade-'));
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

// `mx-list-item`'s own declarations, as the build names its private properties.
const staticBox = await readFile(
  join(MX, 'list/styles/item/static-box.css.js'),
  'utf8',
);
const decl = (prop: string) =>
  new RegExp(`[{;]${prop}:([^;}]+)`).exec(staticBox)![1]!;
const BLOCK = decl('padding-block');
const [LEAD, TRAIL] = decl('padding-inline').split(/\) (?=var)/) as [
  string,
  string,
];
const LEAD_SPACE = `${LEAD})`;
const TRAIL_SPACE = TRAIL;

const SPACING = `:host { padding: 0; }
.lead, .content, .trail { margin-block: ${BLOCK}; }
.lead { margin-inline-start: ${LEAD_SPACE}; }
.trail { margin-inline-end: ${TRAIL_SPACE}; }
.content { margin-inline: ${LEAD_SPACE} ${TRAIL_SPACE}; }
.lead.has-slotted + .content { margin-inline-start: 0; }
.content:has(+ .trail.has-slotted) { margin-inline-end: 0; }`;

const IMPORTANT_STATIC = `:host(:popover-open) {
  padding-block: ${BLOCK} !important;
  padding-inline: ${LEAD_SPACE} ${TRAIL_SPACE} !important;
  background: ${decl('background')} !important;
  color: ${decl('color')} !important;
  overflow: visible !important;
  box-shadow: none !important;
}`;
const IMPORTANT_INTERACTIVE = `:host(:popover-open) {
  padding: 0 !important;
  overflow: visible !important;
  background: none !important;
  color: inherit !important;
  box-shadow: none !important;
}`;

const type = { chromium, firefox, webkit }[ENGINE]!;
const browser = await type.launch();
console.log(`# engine ${ENGINE} ${browser.version()}`);
console.log(`# block ${BLOCK} | lead ${LEAD_SPACE} | trail ${TRAIL_SPACE}`);

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

// Adopts `css` after each matching item's own sheets.
async function adopt(page: Page, tag: string, css: string) {
  await page.evaluate(
    ([tag, css]) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      for (const item of document.querySelectorAll(tag)) {
        item.shadowRoot!.adoptedStyleSheets = [
          ...item.shadowRoot!.adoptedStyleSheets,
          sheet,
        ];
      }
    },
    [tag, css] as const,
  );
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------- reset

const item = (tag: string, id: string, lines: number, extra = '') => {
  const attrs = tag === 'mx-list-link-item' ? ' href="#x"' : '';
  const overline = lines === 3 ? '<span slot="overline">Overline</span>' : '';
  const support =
    lines >= 2 ? '<span slot="support">Supporting text</span>' : '';
  return `<${tag} id="${id}"${attrs}${extra}><span slot="lead" data-icon>★</span>${overline}Label ${id}${support}<span slot="trail">100+</span></${tag}>`;
};

const RESET_BODY = `<mx-list id="l" style="gap: 12px; inline-size: 360px">
${['mx-list-item', 'mx-list-button-item', 'mx-list-link-item']
  .flatMap((tag) =>
    [1, 2, 3].map((n) => item(tag, `${tag.slice(8, 12)}${n}`, n)),
  )
  .join('\n')}
${item('mx-list-button-item', 'butt-disabled', 1, ' disabled')}
${item('mx-list-link-item', 'link-disabled', 1, ' disabled')}
<mx-list-item id="bare">Label only</mx-list-item>
<mx-list-item id="leadonly"><span slot="lead" data-icon>★</span>Lead only</mx-list-item>
<mx-list-item id="trailonly">Trail only<span slot="trail">100+</span></mx-list-item>
<mx-list-item id="large"><img slot="lead" data-large width="56" height="56" alt="">Large lead<span slot="trail">100+</span></mx-list-item>
</mx-list>`;

const RESET =
  '<style>*, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; }</style>';

async function readRects(page: Page) {
  return page.evaluate(() => {
    const show = (r: DOMRect) => `${r.x} ${r.y} ${r.width} ${r.height}`;
    const list = document.getElementById('l')!;
    return [
      `list ${show(list.getBoundingClientRect())}`,
      ...[...list.children].map((i) => {
        const root = i.shadowRoot!;
        const box = root.querySelector<HTMLElement>('.host') ?? i;
        const part = (sel: string) => {
          const el = root.querySelector(sel)!;
          return el.getClientRects().length
            ? show(el.getBoundingClientRect())
            : '-';
        };
        return `${i.id} box ${show(box.getBoundingClientRect())} lead ${part('.lead')} content ${part('.content')} trail ${part('.trail')}`;
      }),
    ];
  });
}

async function screenshots(page: Page, name: string) {
  for (const level of [0, 6]) {
    await page.evaluate((level) => {
      const items = document.getElementById('l')!
        .children as HTMLCollectionOf<HTMLElement>;
      const prop = items[0]!
        .shadowRoot!.adoptedStyleSheets.flatMap((s) => [...s.cssRules])
        .map((r) => (r as CSSStyleRule).style?.transitionProperty)
        .find((v) => v?.startsWith('--'))!;
      for (const i of items) {
        i.style.setProperty(prop, String(level));
        i.style.transition = 'none';
      }
    }, level);
    await page.waitForTimeout(50);
    await page.screenshot({
      path: join(PNG, `${ENGINE}-reset-${name}-level${level}.png`),
      animations: 'disabled',
    });
  }
}

console.log('## reset');
for (const variant of ['branch', 'spacing']) {
  for (const [pageName, head] of [
    ['plain', ''],
    ['reset', RESET],
  ] as const) {
    const page = await open(RESET_BODY, head);
    if (variant === 'spacing') await adopt(page, 'mx-list-item', SPACING);
    console.log(`### ${variant} ${pageName}`);
    for (const line of await readRects(page)) console.log(line);
    await screenshots(page, `${variant}-${pageName}`);
    await page.close();
  }
}
{
  const page = await open(
    RESET_BODY,
    '<style>#item1 { padding-inline: 24px; }</style>',
  );
  const before = (await readRects(page)).find((l) => l.startsWith('item1 '));
  await adopt(page, 'mx-list-item', SPACING);
  const after = (await readRects(page)).find((l) => l.startsWith('item1 '));
  console.log(`### consumer #item1 { padding-inline: 24px }`);
  console.log(`branch  ${before}`);
  console.log(`spacing ${after}`);
  await page.close();
}

// ----------------------------------------------------------------- lift

// Emulates the trait keeping the visual's own values, as drag's lift does.
function keepOwnValues() {
  const PROPS = [
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'overflow-x',
    'overflow-y',
    'color',
    'background-color',
  ];
  const desc = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'popover',
  )!;
  const saved = new WeakMap<HTMLElement, [string, string, string][]>();
  Object.defineProperty(HTMLElement.prototype, 'popover', {
    ...desc,
    set(this: HTMLElement, value: string | null) {
      if (value !== null && !this.hasAttribute('popover')) {
        const style = getComputedStyle(this);
        const values = PROPS.map((p) => style.getPropertyValue(p));
        saved.set(
          this,
          PROPS.map((p) => [
            p,
            this.style.getPropertyValue(p),
            this.style.getPropertyPriority(p),
          ]),
        );
        PROPS.forEach((p, i) => this.style.setProperty(p, values[i]!));
      }
      desc.set!.call(this, value);
    },
  });
  const remove = Element.prototype.removeAttribute;
  Element.prototype.removeAttribute = function (this: HTMLElement, name) {
    remove.call(this, name);
    const prior = saved.get(this);
    if (name === 'popover' && prior) {
      for (const [p, v, priority] of prior) {
        if (v) this.style.setProperty(p, v, priority);
        else this.style.removeProperty(p);
      }
      saved.delete(this);
    }
  };
}

// Removes the items' `:host` lift resets from the shared sheets.
async function removeResets(page: Page) {
  await page.evaluate(() => {
    for (const id of ['s', 'b']) {
      for (const sheet of document.getElementById(id)!.shadowRoot!
        .adoptedStyleSheets) {
        for (const rule of [...sheet.cssRules] as CSSStyleRule[]) {
          if (rule.selectorText !== ':host' || !rule.style) continue;
          if (rule.style.minBlockSize) rule.style.removeProperty('overflow');
          else if (rule.style.paddingTop === '0px') {
            for (const p of ['padding', 'overflow', 'background', 'color'])
              rule.style.removeProperty(p);
          }
        }
      }
    }
  });
}

const handle = '<span slot="trail" data-handle>Grip</span>';
const LIFT_LIST = `<mx-list id="l" reorderable style="gap: 12px; inline-size: 360px">
  <mx-list-item id="s0">Before</mx-list-item>
  <mx-list-item id="s">Static ${handle}</mx-list-item>
  <mx-list-button-item id="b">Button item ${handle}</mx-list-button-item>
  <mx-list-link-item id="a" href="#x">Link item</mx-list-link-item>
</mx-list>`;

const RULES = {
  none: '',
  popover:
    '<style>[popover] { padding: 16px; background: red; overflow: auto; color: blue; box-shadow: 0 0 0 4px lime; }</style>',
  consumer:
    '<style>#s { padding-inline: 24px; background-color: rgb(0, 0, 255); }</style>',
};

async function lift(variant: string, rule: keyof typeof RULES, id: string) {
  const page = await open(LIFT_LIST, RULES[rule]);
  if (variant === 'inline') {
    await page.evaluate(keepOwnValues);
    await removeResets(page);
  }
  if (variant === 'important') {
    await adopt(page, 'mx-list-item', IMPORTANT_STATIC);
    await adopt(page, 'mx-list-button-item', IMPORTANT_INTERACTIVE);
  }
  const read = (phase: string) =>
    page.evaluate(
      ([id, phase]) => {
        const item = document.getElementById(id)!;
        const s = getComputedStyle(item);
        const r = item.getBoundingClientRect();
        return `${phase} open ${item.matches(':popover-open')} rect ${r.x} ${r.y} ${r.width} ${r.height} padding ${s.padding} overflow ${s.overflow} background ${s.backgroundColor} color ${s.color} shadow ${s.boxShadow} style="${item.getAttribute('style') ?? ''}"`;
      },
      [id, phase] as const,
    );
  const out = [await read('before')];
  await page.focus(`#${id} [data-handle]`);
  await page.keyboard.press(' ');
  await page.waitForTimeout(800);
  out.push(await read('lifted'));
  await page.screenshot({
    path: join(PNG, `${ENGINE}-lift-${variant}-${rule}-${id}.png`),
    clip: { x: 0, y: 0, width: 400, height: 280 },
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  out.push(await read('after'));
  await page.close();
  return out;
}

console.log('## lift');
for (const variant of ['branch', 'inline', 'important']) {
  for (const rule of Object.keys(RULES) as (keyof typeof RULES)[]) {
    for (const id of ['s', 'b']) {
      if (rule === 'consumer' && id === 'b') continue;
      console.log(`### ${variant} ${rule} #${id}`);
      for (const line of await lift(variant, rule, id)) console.log(line);
    }
  }
}

await browser.close();

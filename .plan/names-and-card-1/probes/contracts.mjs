// Readings for RD-58, RD-59, RF-139 and RD-53's note of 2026-11-25, on the built elements.
// Run from packages/material-x, with the packages built:
//   node ../../.plan/names-and-card-1/probes/contracts.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
  'button/button',
  'button/icon-button',
  'button/split-button',
  'checkbox/checkbox',
  'fab/fab',
  'card/card',
];
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? entries
              .map(
                (e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`,
              )
              .join('')
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output
  .map((c) => c.code ?? '')
  .join('\n')
  .replaceAll('</script', '<\\/script');
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.setContent(
    `<!doctype html><style>body { margin: 0; font: 14px sans-serif }</style><div id="r" style="padding: 20px"></div><script>${code}</script>`,
  );
  const lines = await page.evaluate(async () => {
    const out = [];
    const root = document.querySelector('#r');
    const settle = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const adopt = (e, css) => {
      const s = new CSSStyleSheet();
      s.replaceSync(css);
      e.shadowRoot.adoptedStyleSheets.push(s);
    };
    const corner = (e) => getComputedStyle(e).borderStartStartRadius;

    // 1. mx-card: what a direct child, a grandchild and a nested card inherit.
    for (const [name, css] of [
      ['built', ''],
      ['slot inherits', 'slot { border-radius: inherit }'],
    ])
      for (const [shape, style] of [
        ['token', ''],
        ['consumer 20px', '--md-card-container-shape: 20px'],
        ['consumer 4 corners', '--md-card-container-shape: 1px 2px 3px 4px'],
        ['page radius', 'border-radius: 7px'],
      ]) {
        root.innerHTML = `<mx-card variant="elevated" style="--md-card-padding: 0; inline-size: 200px; ${style}"><div id="c" style="border-start-start-radius: inherit; border-start-end-radius: inherit; block-size: 50px"><i id="g" style="border-start-start-radius: inherit">g</i></div><p id="p">plain</p><mx-button id="b">B</mx-button><mx-card id="n">N</mx-card></mx-card>`;
        const card = root.firstChild;
        adopt(card, css);
        await settle();
        const q = (s) => root.querySelector(s);
        out.push(
          `card, ${name}, ${shape}: card ${corner(card)} | child ${corner(q('#c'))} ${getComputedStyle(q('#c')).borderStartEndRadius} | grandchild ${corner(q('#g'))} | plain ${corner(q('#p'))} | button ${corner(q('#b').shadowRoot.querySelector('.host'))} | nested card ${corner(q('#n'))}`,
        );
      }
    // 2. mx-card: a page's own layout, with the content laid out directly.
    for (const layout of [
      'display: grid; grid-template-columns: 1fr 1fr; column-gap: 8px',
      'display: flex; gap: 8px',
    ]) {
      root.innerHTML = `<mx-card style="inline-size: 232px; ${layout}"><div style="inline-size: auto; flex: 1">a</div><div style="flex: 1">b</div></mx-card>`;
      await settle();
      const c = root.firstChild.getBoundingClientRect();
      out.push(
        `card, page's ${layout.split(';')[0]}: ${[...root.firstChild.children]
          .map((e) => {
            const b = e.getBoundingClientRect();
            return `${Math.round(b.left - c.left)},${Math.round(b.top - c.top)} ${Math.round(b.width)}`;
          })
          .join(
            ' | ',
          )} (card padding ${getComputedStyle(root.firstChild).paddingInlineStart})`,
      );
    }
    // 3. mx-card: a page's `overflow: clip`, the other way to round media.
    root.innerHTML = `<mx-card variant="elevated" style="--md-card-padding: 0; inline-size: 200px; overflow: clip"><div style="block-size: 50px">a</div></mx-card>`;
    await settle();
    out.push(
      `card, overflow clip: shadow ${getComputedStyle(root.firstChild).boxShadow === 'none' ? 'none' : 'kept'}`,
    );

    // 4. List item: the candidate `bound`, for controls wider than half of the item.
    const TEXT = '.trail::slotted(:not(mx-icon):not([data-icon]))';
    const base = `.trail { overflow: visible; text-overflow: clip }`;
    const bound = `${base} .content { flex: 1 1 0; min-inline-size: 0 } .trail { flex: 0 1 auto; min-inline-size: min-content; max-inline-size: 50% } ${TEXT} { white-space: normal; overflow-wrap: anywhere }`;
    for (const [name, css] of [
      ['built', ''],
      ['bound', bound],
    ])
      for (const [what, html] of [
        [
          'wide button',
          '<mx-button slot="trail">A button with a label that is very wide</mx-button>',
        ],
        [
          'wide button, long label',
          '<mx-button slot="trail">A button with a label that is very wide</mx-button> and a label of several words',
        ],
        ['two words', '<mx-button slot="trail">Two words</mx-button>'],
        [
          'long text',
          '<span slot="trail">A trailing text that is much longer than the item it is in</span>',
        ],
        ['checkbox', '<mx-checkbox slot="trail"></mx-checkbox>'],
      ])
        for (const dir of ['ltr', 'rtl']) {
          root.innerHTML = `<mx-list dir="${dir}" style="inline-size: 300px"><mx-list-item>Label${html}</mx-list-item></mx-list>`;
          const item = root.querySelector('mx-list-item');
          adopt(item, css);
          await settle();
          const i = item.getBoundingClientRect();
          // A button's host is `display: contents`, so its control is measured.
          const el = root.querySelector('[slot=trail]');
          const range = document.createRange();
          range.selectNodeContents(el);
          const text = range.getBoundingClientRect();
          const t = (
            el.shadowRoot?.querySelector('.host') ?? el
          ).getBoundingClientRect();
          const past = Math.round(
            dir === 'ltr' ? t.right - i.right : i.left - t.left,
          );
          out.push(
            `list, ${name}, ${what}, ${dir}: trail ${Math.round(t.width)}x${Math.round(t.height)}, its text ${Math.round(text.width)}x${Math.round(text.height)}, item height ${Math.round(i.height)}, past the end ${Math.max(0, past)}, page scroll ${document.documentElement.scrollWidth - innerWidth}`,
          );
        }

    // 5. mx-icon: the box of the icon and its content with the slot in a span.
    for (const [name, wrap] of [
      ['built', false],
      ['span', true],
    ])
      for (const [what, html] of [
        ['ligature', '<mx-icon id="i">keyboard_arrow_down</mx-icon>'],
        [
          'svg',
          '<mx-icon id="i"><svg width="16" height="16"><rect width="16" height="16"/></svg></mx-icon>',
        ],
        [
          'svg 100%',
          '<mx-icon id="i" style="font-size: 24px"><svg width="100%" height="100%"><rect width="16" height="16"/></svg></mx-icon>',
        ],
        [
          'in a button',
          '<mx-button><mx-icon slot="icon" id="i">edit</mx-icon>Save</mx-button>',
        ],
        ['in a FAB', '<mx-fab><mx-icon id="i">edit</mx-icon></mx-fab>'],
      ]) {
        root.innerHTML = html;
        const icon = root.querySelector('#i');
        if (wrap) {
          const slot = icon.shadowRoot.querySelector('slot');
          const span = document.createElement('span');
          span.ariaHidden = 'true';
          slot.replaceWith(span);
          span.append(slot);
        }
        await settle();
        const b = icon.getBoundingClientRect();
        const svg = icon.querySelector('svg')?.getBoundingClientRect();
        out.push(
          `icon, ${name}, ${what}: ${b.width}x${b.height} at ${b.left},${b.top}${svg ? ` svg ${svg.width}x${svg.height} at ${svg.left - b.left},${svg.top - b.top}` : ''}`,
        );
      }

    // 6. Split button: the inner icon button given the attributes.
    root.innerHTML = '<mx-split-button>Save</mx-split-button>';
    const trailing = root.firstChild.shadowRoot.querySelector('mx-icon-button');
    const native = trailing.shadowRoot.querySelector('.host');
    trailing.setAttribute('aria-label', 'More');
    trailing.setAttribute('aria-expanded', 'false');
    await settle();
    out.push(
      `split button: native aria-label ${native.ariaLabel}, aria-expanded ${native.ariaExpanded}`,
    );
    return out;
  });
  console.log(lines.join('\n'));
  await browser.close();
}

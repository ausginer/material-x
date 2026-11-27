// Chromium's accessibility tree (CDP) for a divider-like host that holds its
// line in several ways, with and without internals role "none", and what
// Firefox and WebKit read back of the internals' role. Run:
// node .plan/divider-1/probes/host-role.mjs
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../../packages/material-x/package.json', import.meta.url),
);
const pw = require('playwright');
const VARIANTS = {
  'no style': '',
  'block, background on host':
    ':host{display:block;block-size:1px;background:gray}',
  '::before static':
    ':host{display:block}:host::before{content:"";display:block;block-size:1px;background:gray}',
  '::before absolute, host static':
    ':host{display:block;block-size:1px}:host::before{content:"";position:absolute;inset-inline:0;block-size:1px;background:gray}',
  'host relative, no ::before':
    ':host{display:block;position:relative;block-size:1px}',
  'host relative + ::before absolute (implementer)':
    ':host{display:block;position:relative;block-size:1px}:host::before{content:"";position:absolute;inset-inline:0;block-size:1px;background:gray}',
  'host contain:layout + ::before absolute':
    ':host{display:block;contain:layout;block-size:1px}:host::before{content:"";position:absolute;inset-inline:0;block-size:1px;background:gray}',
  'host transform + ::before absolute':
    ':host{display:block;transform:translate(0);block-size:1px}:host::before{content:"";position:absolute;inset-inline:0;block-size:1px;background:gray}',
};
const ROLES = {
  'internals none': 'none',
  'internals presentation': 'presentation',
};
async function setup(page) {
  await page.setContent('<main id="m"></main>');
  await page.evaluate((variants) => {
    customElements.define(
      'x-list',
      class extends HTMLElement {
        constructor() {
          super();
          this.attachInternals().role = 'list';
          this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>';
        }
      },
    );
    customElements.define(
      'x-item',
      class extends HTMLElement {
        constructor() {
          super();
          this.attachInternals().role = 'listitem';
        }
      },
    );
    customElements.define(
      'x-divider',
      class extends HTMLElement {
        constructor() {
          super();
          const css = this.getAttribute('css') ?? '';
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
          this.attachShadow({ mode: 'open' }).adoptedStyleSheets = [sheet];
          this.internals = this.attachInternals();
          const r = this.getAttribute('irole');
          if (r) this.internals.role = r;
        }
      },
    );
  }, VARIANTS);
}
const esc = (s) => s.replace(/"/g, '&quot;');
const cases = [];
for (const [v, css] of Object.entries(VARIANTS)) cases.push([v, css, '', '']);
const impl = VARIANTS['host relative + ::before absolute (implementer)'];
for (const [n, r] of Object.entries(ROLES))
  cases.push([`implementer + ${n}`, impl, r, '']);
cases.push([
  'implementer + internals none + page role=separator',
  impl,
  'none',
  'role="separator"',
]);
cases.push([
  'implementer + internals none + page separator vertical',
  impl,
  'none',
  'role="separator" aria-orientation="vertical"',
]);
cases.push([
  'implementer + internals none + page aria-label',
  impl,
  'none',
  'aria-label="x"',
]);
const chromium = await pw.chromium.launch();
const page = await chromium.newPage();
await setup(page);
const cdp = await page.context().newCDPSession(page);
console.log(
  '== Chromium',
  chromium.version(),
  'accessibility tree, unignored roles under the container',
);
for (const [name, css, irole, attrs] of cases) {
  const out = [];
  for (const [where, open, close, kid] of [
    ['list', '<x-list>', '</x-list>', 'x-item'],
    ['div', '<div id="c">', '</div>', 'p'],
  ]) {
    await page.evaluate(
      (html) => {
        document.getElementById('m').innerHTML = html;
      },
      `${open}<${kid}>A</${kid}><x-divider css="${esc(css)}" irole="${irole}" ${attrs}></x-divider><${kid}>B</${kid}>${close}`,
    );
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const byId = new Map(nodes.map((n) => [n.nodeId, n]));
    const main = nodes.find((n) => n.role?.value === 'main');
    const walk = (n, acc) => {
      for (const id of n.childIds ?? []) {
        const c = byId.get(id);
        if (!c) continue;
        if (
          !c.ignored &&
          c.role?.value !== 'StaticText' &&
          c.role?.value !== 'InlineTextBox'
        ) {
          const o = c.properties?.find((p) => p.name === 'orientation');
          acc.push(c.role.value + (o ? ':' + o.value.value : ''));
        }
        walk(c, acc);
      }
      return acc;
    };
    out.push(`${where}: ${walk(main, []).join(',')}`);
  }
  console.log(`${name} | ${out.join(' | ')}`);
}
await chromium.close();
for (const type of ['chromium', 'firefox', 'webkit']) {
  const b = await pw[type].launch();
  const p = await b.newPage();
  await setup(p);
  const r = await p.evaluate((impl) => {
    const m = document.getElementById('m');
    m.innerHTML = `<x-divider css="${impl.replace(/"/g, '&quot;')}" irole="none"></x-divider><x-divider css="" irole="none" role="separator"></x-divider>`;
    const [a, s] = m.children;
    return {
      internalsRole: a.internals.role,
      computedRoleBare: 'computedRole' in a ? a.computedRole : 'n/a',
      computedRoleSeparator: 'computedRole' in s ? s.computedRole : 'n/a',
      position: getComputedStyle(a).position,
    };
  }, impl);
  console.log(`== ${type} ${b.version()}`, JSON.stringify(r));
  await b.close();
}

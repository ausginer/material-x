// How axe and Chromium's accessibility tree treat a divider-like custom
// element without a role, with role="separator", and with role="none", inside
// an element whose ElementInternals role is "list" (as mx-list's is), inside a
// plain container, and vertical. Run: node .plan/divider-1/probes/aria.mjs
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../../packages/material-x/package.json', import.meta.url),
);
const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<main id="m"></main>');
await page.addScriptTag({ path: axePath });
await page.evaluate(() => {
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
        this.attachShadow({ mode: 'open' });
      }
    },
  );
});
const cases = {
  'list, divider without role':
    '<x-list><x-item>A</x-item><x-divider></x-divider><x-item>B</x-item></x-list>',
  'list, divider role=separator':
    '<x-list><x-item>A</x-item><x-divider role="separator"></x-divider><x-item>B</x-item></x-list>',
  'list, divider role=none':
    '<x-list><x-item>A</x-item><x-divider role="none"></x-divider><x-item>B</x-item></x-list>',
  'div, divider without role':
    '<div><p>A</p><x-divider></x-divider><p>B</p></div>',
  'div, divider role=separator':
    '<div><p>A</p><x-divider role="separator"></x-divider><p>B</p></div>',
  'div, vertical separator':
    '<div><p>A</p><x-divider role="separator" aria-orientation="vertical"></x-divider><p>B</p></div>',
};
const cdp = await page.context().newCDPSession(page);
for (const [name, html] of Object.entries(cases)) {
  const r = await page.evaluate(async (html) => {
    const m = document.getElementById('m');
    m.innerHTML = html;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    const res = await axe.run(m, {
      rules: { 'color-contrast': { enabled: false } },
    });
    return res.violations.map(
      (v) =>
        `${v.id}: ${v.nodes.map((n) => n.failureSummary.replace(/\s+/g, ' ')).join(' | ')}`,
    );
  }, html);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const tree = nodes
    .filter(
      (n) =>
        !n.ignored &&
        n.role?.value !== 'StaticText' &&
        n.role?.value !== 'InlineTextBox',
    )
    .map(
      (n) =>
        `${n.role?.value}${(n.properties ?? [])
          .filter((p) => p.name === 'orientation')
          .map((p) => `[${p.value.value}]`)
          .join('')}`,
    );
  console.log(
    `== ${name}\naxe violations: ${JSON.stringify(r)}\nax tree (not ignored): ${tree.join(' > ')}\n`,
  );
}
console.log('chromium', browser.version());
await browser.close();

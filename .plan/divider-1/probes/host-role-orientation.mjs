// Chromium: internals role "none" with internals ariaOrientation under a
// page role="separator", and the in-card case. Run:
// node .plan/divider-1/probes/host-role-orientation.mjs
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../../packages/material-x/package.json', import.meta.url),
);
const { chromium } = require('playwright');
const b = await chromium.launch();
const page = await b.newPage();
await page.setContent('<main id="m"></main>');
await page.evaluate(() =>
  customElements.define(
    'x-divider',
    class extends HTMLElement {
      constructor() {
        super();
        const s = new CSSStyleSheet();
        s.replaceSync(this.getAttribute('css') ?? '');
        this.attachShadow({ mode: 'open' }).adoptedStyleSheets = [s];
        const i = this.attachInternals();
        i.role = 'none';
        if (this.hasAttribute('ivertical')) i.ariaOrientation = 'vertical';
      }
    },
  ),
);
const cdp = await page.context().newCDPSession(page);
const REL =
  ':host{display:block;position:relative;block-size:1px}:host::before{content:"";position:absolute;inset-inline:0;block-size:1px;background:gray}';
const CARD =
  ':host{display:block;position:static;block-size:1px}:host::before{content:"";position:absolute;inset-inline:0;block-size:1px;background:gray}';
for (const [name, css, attrs] of [
  ['separator, internals vertical', REL, 'role="separator" ivertical'],
  [
    'separator, internals vertical, page horizontal',
    REL,
    'role="separator" ivertical aria-orientation="horizontal"',
  ],
  ['no page role, internals vertical', REL, 'ivertical'],
  ['in-card case: static host, absolute ::before', CARD, ''],
]) {
  await page.evaluate(
    ([css, attrs]) => {
      document.getElementById('m').innerHTML =
        `<div style="position:relative"><p>A</p><x-divider css='${css}' ${attrs}></x-divider><p>B</p></div>`;
    },
    [css, attrs],
  );
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const roles = nodes
    .filter(
      (n) =>
        !n.ignored &&
        !['StaticText', 'InlineTextBox', 'RootWebArea', 'main'].includes(
          n.role?.value,
        ),
    )
    .map((n) => {
      const o = n.properties?.find((p) => p.name === 'orientation');
      return n.role.value + (o ? ':' + o.value.value : '');
    });
  console.log(`${name} | ${roles.join(',')}`);
}
await b.close();

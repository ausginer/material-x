// Whether Chromium's accessibility tree has a node for a divider-like custom
// element whose host is `position: relative`, as the plan's geometry 8 requires,
// with and without an ElementInternals role of `none`, in a plain container and
// in an element whose internals role is `list`, as mx-list's is.
// Run: node .plan/divider-1/probes/ax-positioned.mjs
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../../packages/material-x/package.json', import.meta.url),
);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<main id="m"></main>');

const SHEETS = {
  'no style': '',
  'display: block': ':host { display: block; }',
  'display: block; position: relative':
    ':host { display: block; position: relative; }',
  "the divider's line, host not positioned":
    ':host { display: block; block-size: 1px; } :host::before { content: ""; display: block; block-size: 1px; background: #000; }',
  "the divider's line, host position: relative":
    ':host { display: block; position: relative; block-size: 1px; } :host::before { content: ""; position: absolute; inset-inline: 0; block-size: 1px; background: #000; }',
};
const ROLES = { 'no role': '', 'internals role none': 'none' };

await page.evaluate(
  ({ SHEETS, ROLES }) => {
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
    let n = 0;
    window.tags = {};
    for (const [sheetName, css] of Object.entries(SHEETS)) {
      for (const [roleName, role] of Object.entries(ROLES)) {
        const tag = `x-divider-${n++}`;
        window.tags[`${sheetName} — ${roleName}`] = tag;
        customElements.define(
          tag,
          class extends HTMLElement {
            constructor() {
              super();
              if (role) {
                this.attachInternals().role = role;
              }
              const sheet = new CSSStyleSheet();
              sheet.replaceSync(css);
              this.attachShadow({ mode: 'open' }).adoptedStyleSheets = [sheet];
            }
          },
        );
      }
    }
  },
  { SHEETS, ROLES },
);

const tags = await page.evaluate(() => window.tags);
const cdp = await page.context().newCDPSession(page);

async function tree(html) {
  await page.evaluate(async (html) => {
    document.getElementById('m').innerHTML = html;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  }, html);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  return nodes
    .filter(
      (n) =>
        !n.ignored &&
        !['StaticText', 'InlineTextBox', 'RootWebArea', 'main'].includes(
          n.role?.value,
        ),
    )
    .map(
      (n) =>
        `${n.role?.value}${(n.properties ?? [])
          .filter((p) => p.name === 'orientation')
          .map((p) => `[${p.value.value}]`)
          .join('')}`,
    )
    .join(' > ');
}

for (const [name, tag] of Object.entries(tags)) {
  console.log(`== ${name}`);
  console.log(`  div:  ${await tree(`<p>A</p><${tag}></${tag}><p>B</p>`)}`);
  console.log(
    `  list: ${await tree(`<x-list><x-item>A</x-item><${tag}></${tag}><x-item>B</x-item></x-list>`)}`,
  );
  console.log(
    `  role="separator": ${await tree(`<p>A</p><${tag} role="separator"></${tag}><p>B</p>`)}`,
  );
  console.log(
    `  role="separator" aria-orientation="vertical": ${await tree(`<p>A</p><${tag} role="separator" aria-orientation="vertical"></${tag}><p>B</p>`)}`,
  );
}
console.log('\nchromium', browser.version());
await browser.close();

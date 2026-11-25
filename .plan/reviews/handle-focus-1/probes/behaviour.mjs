// Computed outlines of handles that the rows don't read, and what a clip in `.trail` changes for contents the unit's
// trail-clip.mjs doesn't have. Run from packages/material-x, with the packages built:
//   node ../../.plan/reviews/handle-focus-1/probes/behaviour.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/list',
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
  'button/icon-button',
  'button/button',
  'checkbox/checkbox',
  'radio/radio',
  'slider/slider',
  'text-field/text-field',
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

const PLACES = {
  'handle in lead': ['<mx-icon data-c data-handle slot="lead">H</mx-icon>'],
  'handle in trail': ['<mx-icon data-c data-handle slot="trail">H</mx-icon>'],
  'two handles, the second in trail': [
    '<mx-icon data-handle slot="lead">H</mx-icon><mx-icon data-c data-handle slot="trail" tabindex="0">H</mx-icon>',
  ],
  'nested in a span in trail, tabindex': [
    '<span slot="trail"><mx-icon data-c data-handle tabindex="0">H</mx-icon></span>',
  ],
  'data-handle in the label slot, tabindex': [
    '<b data-c data-handle tabindex="0">H</b>',
  ],
  'data-handle in support, tabindex': [
    '<b data-c data-handle tabindex="0" slot="support">H</b>',
  ],
  'checkbox with data-handle': [
    '<mx-checkbox data-c data-handle slot="trail"></mx-checkbox>',
  ],
  'link with data-handle': [
    '<a href="#x" data-c data-handle slot="trail">H</a>',
  ],
  'consumer element, :host(:focus-visible) { outline: none }': [
    '<x-grip data-c data-handle slot="trail"></x-grip>',
  ],
  'page: [data-handle] { outline: none }': [
    '<mx-icon data-c data-handle slot="trail">H</mx-icon>',
    '[data-handle] { outline: none }',
  ],
  'page: :focus-visible { outline: 1px solid red }': [
    '<mx-icon data-c data-handle slot="trail">H</mx-icon>',
    ':focus-visible { outline: 1px solid red }',
  ],
  'page: * { outline: 0 }': [
    '<mx-icon data-c data-handle slot="trail">H</mx-icon>',
    '* { outline: 0 }',
  ],
  'page: @layer rule': [
    '<mx-icon data-c data-handle slot="trail">H</mx-icon>',
    '@layer a { [data-handle]:focus-visible { outline: 1px solid red } }',
  ],
  'page: :focus-visible { outline-color: red }': [
    '<mx-icon data-c data-handle slot="trail">H</mx-icon>',
    ':focus-visible { outline-color: rgb(255, 0, 0) }',
  ],
  'inline outline: none': [
    '<mx-icon data-c data-handle slot="trail" style="outline:none">H</mx-icon>',
  ],
  'handle in plain mx-list, tabindex': [
    '<mx-icon data-c data-handle slot="trail" tabindex="0">H</mx-icon>',
    '',
    'mx-list',
  ],
  'handle in plain mx-list, no tabindex': [
    '<mx-icon data-c data-handle slot="trail">H</mx-icon>',
    '',
    'mx-list',
  ],
  'in a nested plain list': [
    '<mx-icon data-c data-handle slot="trail" tabindex="0">H</mx-icon>',
    '',
    'nested',
  ],
};
const read = () => {
  const c = document.querySelector('[data-c]');
  const f = (e) => {
    const s = getComputedStyle(e);
    return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} offset ${s.outlineOffset}`;
  };
  const inner = c.shadowRoot?.activeElement;
  return `active ${document.activeElement === c}, focus-visible ${c.matches(':focus-visible')}, ${f(c)}${inner ? `; inner ${inner.localName} ${f(inner)}` : ''}`;
};
const TEXT = 'Some trailing text of words ';
const CONTENT = {
  'img 100%':
    '<img slot="trail" style="max-inline-size:100%" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2240%22%3E%3Crect width=%2280%22 height=%2240%22 fill=%22red%22/%3E%3C/svg%3E">',
  'input 100%': '<input slot="trail" style="inline-size:100%" value="text">',
  input: '<input slot="trail" value="text">',
  select: '<select slot="trail"><option>one two three</select>',
  progress: '<progress slot="trail"></progress>',
  textarea: '<textarea slot="trail">text</textarea>',
  video: '<video slot="trail" controls></video>',
  'mx-slider': '<mx-slider slot="trail" style="inline-size:120px"></mx-slider>',
  'mx-text-field': '<mx-text-field slot="trail">L</mx-text-field>',
  float: `<div slot="trail" style="float:left;inline-size:60px">${TEXT}</div>`,
  grid: `<div slot="trail" style="display:grid;grid-template-columns:40px 40px"><i>a</i><i>b</i></div>`,
  margins: '<p slot="trail" style="margin:20px">text</p>',
  'line-height 0.5': '<span slot="trail" style="line-height:.5">gjpq</span>',
  'height 10px text':
    '<span slot="trail" style="display:block;block-size:5px">gjpq</span>',
  'width 50%': `<div slot="trail" style="inline-size:50%">${TEXT}</div>`,
  'max-width 60%': `<div slot="trail" style="max-inline-size:60%;white-space:normal">${TEXT}</div>`,
  'direct overflow text with ellipsis': `<span slot="trail" style="display:inline-block;max-inline-size:60px;overflow:hidden;text-overflow:ellipsis">${TEXT}</span>`,
  'display contents': `<div slot="trail" style="display:contents"><span>${TEXT}</span></div>`,
  'absolute badge':
    '<span slot="trail" style="position:relative">12<b style="position:absolute;inset:-20px -20px auto auto;background:red;inline-size:16px;block-size:16px"></b></span>',
};
for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  const grip =
    'customElements.define("x-grip", class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = "<style>:host { display: inline-block; inline-size: 24px; block-size: 24px } :host(:focus-visible) { outline: none } :host(:focus-visible) b { box-shadow: 0 0 0 3px red }</style><b>G</b>"; } });';
  for (const [
    name,
    [html, style = '', list = 'mx-sortable-list'],
  ] of Object.entries(PLACES))
    for (const tag of ['mx-list-item', 'mx-list-button-item']) {
      await page.setContent(
        `<!doctype html><style>${style}</style><button id="b">b</button><script>${code}</script><script>${grip}</script><div id="r"></div>`,
      );
      await page.evaluate(
        ([list, tag, html]) => {
          const inner = `<${tag}>A${html}</${tag}>`;
          document.querySelector('#r').innerHTML =
            list === 'nested'
              ? `<mx-sortable-list><mx-list-item><mx-list slot="support">${inner}</mx-list></mx-list-item></mx-sortable-list>`
              : `<${list} style="inline-size:300px">${inner}</${list}>`;
        },
        [list, tag, html],
      );
      await page.waitForTimeout(60);
      await page.evaluate(() => document.querySelector('#b').focus());
      let on = false;
      for (let i = 0; i < 5 && !on; i += 1) {
        await page.keyboard.press(E === 'webkit' ? 'Alt+Tab' : 'Tab');
        on = await page.evaluate(() =>
          document.activeElement?.hasAttribute('data-c'),
        );
      }
      const keyboard = await page.evaluate(read);
      await page.evaluate(() => document.activeElement?.blur());
      const box = await page.locator('[data-c]').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
      console.log(
        `${name} | ${tag} | Tab: ${on ? keyboard : 'no focus'} | click: ${await page.evaluate(read)}`,
      );
    }
  console.log('## clip');
  for (const width of [300, 120])
    for (const tag of ['mx-list-item', 'mx-list-button-item'])
      for (const [name, html] of Object.entries(CONTENT)) {
        const got = [];
        for (const o of ['overflow: hidden; text-overflow: ellipsis', '']) {
          await page.setContent(
            `<!doctype html><script>${code}</script><div style="padding:60px"><mx-list style="inline-size:${width}px"><${tag}>Label${html}</${tag}></mx-list></div>`,
          );
          await page.waitForTimeout(60);
          got.push(
            await page.evaluate((o) => {
              const item = document.querySelector('mx-list > *');
              const s = new CSSStyleSheet();
              s.replaceSync(`.trail { ${o} }`);
              item.shadowRoot.adoptedStyleSheets.push(s);
              const t = item.shadowRoot.querySelector('.trail');
              const r = [
                item,
                t,
                item.shadowRoot.querySelector('.content'),
                document.querySelector('[slot=trail]'),
              ].map((e) => {
                const q = e.getBoundingClientRect();
                return [q.x, q.y, q.width, q.height]
                  .map((v) => v.toFixed(1))
                  .join(',');
              });
              return {
                boxes: r.join(' '),
                page: document.documentElement.scrollWidth,
                clipped:
                  t.scrollWidth > t.clientWidth ||
                  t.scrollHeight > t.clientHeight,
              };
            }, o),
          );
        }
        console.log(
          `${width}px ${tag} ${name}: ${got[0].boxes === got[1].boxes ? 'same boxes' : `MOVED ${got[0].boxes} -> ${got[1].boxes}`}; slot overflows ${got[0].clipped}; page scroll ${got[0].page} -> ${got[1].page}`,
        );
      }
  await browser.close();
}

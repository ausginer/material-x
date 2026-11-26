// node orders.mjs <packages> <chromium|webkit>
// The built mx-icon in the engine's own tree, by the order of definition and by
// what the page does after. The tree is read once before the definition, so the
// nodes of the undefined elements exist. Build the packages first.
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [PACKAGES, engine] = process.argv.slice(2);
const require = createRequire(join(PACKAGES, 'material-x/package.json'));
const playwright = require('playwright');
const { rolldown } = await import(pathToFileURL(require.resolve('rolldown')));
const bundle = async (f) =>
  (
    await (
      await rolldown({
        input: join(PACKAGES, 'material-x', `${f}.js`),
        platform: 'browser',
      })
    ).generate({ format: 'iife' })
  ).output[0].code;
const ICON = await bundle('icon/icon');
const BUTTON = await bundle('button/button');
const ICONS = (attrs = '', text = 'edit') =>
  `<mx-button id=b><mx-icon slot=icon ${attrs}>${text}</mx-icon>Save</mx-button><p><mx-icon ${attrs}>${text}</mx-icon></p><button id=n><mx-icon ${attrs}>${text}</mx-icon></button><p id=s><b>moved</b></p><div id=d></div>`;
const replace =
  "for (const i of document.querySelectorAll('mx-icon')) i.textContent = 'late';";
const CASES = [
  ['icon then button', ICONS(), [ICON, BUTTON]],
  ['button then icon', ICONS(), [BUTTON, ICON]],
  [
    'defined, then inserted',
    '<main></main>',
    [
      ICON,
      BUTTON,
      `document.querySelector('main').innerHTML = ${JSON.stringify(ICONS())};`,
    ],
  ],
  ['then the text is replaced', ICONS(), [ICON, BUTTON, replace]],
  [
    'then text from the page moves in',
    ICONS('', ''),
    [
      ICON,
      BUTTON,
      "document.querySelector('mx-icon').append(document.querySelector('b'))",
    ],
  ],
  [
    'then each icon moves',
    ICONS(),
    [
      ICON,
      BUTTON,
      "document.getElementById('d').append(...document.querySelectorAll('mx-icon'))",
    ],
  ],
  ['a named icon', ICONS('role=img aria-label=Draft'), [ICON, BUTTON]],
];
const dir = await mkdtemp(join(tmpdir(), 'icon-orders-'));
const browser = await playwright[engine].launch();
console.log(`# ${engine} ${browser.version()}`);
for (const [label, html, steps] of CASES) {
  const page = await browser.newPage();
  const file = join(dir, 'p.html');
  await writeFile(
    file,
    `<!doctype html><html lang=en><meta charset=utf-8><title>x</title><body>${html}`,
  );
  await page.goto(pathToFileURL(file).href);
  const cdp =
    engine === 'chromium' && (await page.context().newCDPSession(page));
  const read = async () => {
    if (cdp) {
      await cdp.send('Accessibility.enable');
      return (await cdp.send('Accessibility.getFullAXTree')).nodes
        .filter(
          (n) =>
            !n.ignored &&
            ['button', 'StaticText', 'image', 'img'].includes(n.role?.value),
        )
        .map((n) => `${n.role.value} ${JSON.stringify(n.name?.value)}`)
        .join(', ');
    }
    const s = page._connection.toImpl(page).delegate._session;
    await s.send('DOM.getDocument');
    const { result: list } = await s.send('Runtime.evaluate', {
      expression:
        "[...document.querySelectorAll('mx-icon')].flatMap((i) => [...i.childNodes]).concat([document.querySelector('mx-button')?.shadowRoot?.querySelector('.host'), document.querySelector('button')].filter(Boolean))",
    });
    const { properties } = await s.send('Runtime.getProperties', {
      objectId: list.objectId,
      ownProperties: true,
    });
    const out = [];
    for (const { name, value } of properties)
      if (/^\d+$/.test(name)) {
        const { nodeId } = await s.send('DOM.requestNode', {
          objectId: value.objectId,
        });
        const { properties: a } = await s.send(
          'DOM.getAccessibilityPropertiesForNode',
          { nodeId },
        );
        out.push(
          `${value.description?.slice(0, 12)} ${a.exists ? (a.ignored ? 'ignored' : `${a.role || 'text'} ${JSON.stringify(a.label ?? '')}`) : 'no object'}${a.hidden ? ' hidden' : ''}`,
        );
      }
    return out.join(', ');
  };
  const before = await read();
  for (const step of steps) {
    await page.addScriptTag({ content: step });
    await page.waitForTimeout(200);
    await read();
  }
  await page.waitForTimeout(300);
  console.log(`${label}\n  before: ${before}\n  after:  ${await read()}`);
  await page.close();
}
await browser.close();
await rm(dir, { recursive: true });

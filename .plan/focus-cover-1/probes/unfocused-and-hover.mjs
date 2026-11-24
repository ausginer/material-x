// 1. Whether the group's stacking context changes the paint of a connected group
//    with no focus, against the same built group with `isolation: auto`.
// 2. Whether the ripple of a hovered, focused list item paints over the inside
//    indicator: the indicator's pixel at the middle of the block start edge.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/focus-cover-1/probes/unfocused-and-hover.mjs <chromium|firefox|webkit>
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
let path;
try {
  path = require.resolve('rolldown');
} catch {
  path = rootRequire.resolve('rolldown');
}
const { rolldown } = await import(path);
const entries = [
  'list/list',
  'list/list-button-item',
  'list/list-link-item',
  'button/button',
  'button/split-button',
  'button/switch-button',
  'button-group/connected-button-group',
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
const engine = process.argv[2];
const browser = await playwright[engine].launch();
console.log(`# ${engine} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 500, height: 200 } });
const load = async (html) => {
  await page.setContent(
    `<!doctype html><style>body{margin:40px;font:16px sans-serif}</style>${html}<script>${code}</script>`,
  );
  await page.waitForTimeout(400);
};
for (const [name, html] of [
  [
    'buttons',
    '<mx-connected-button-group><mx-button>One</mx-button><mx-button>Two</mx-button></mx-connected-button-group>',
  ],
  [
    'elevated buttons',
    '<mx-connected-button-group color=elevated><mx-button>One</mx-button><mx-button>Two</mx-button></mx-connected-button-group>',
  ],
  [
    'selected switches',
    '<mx-connected-button-group value=b><mx-switch-button value=a>One</mx-switch-button><mx-switch-button value=b>Two</mx-switch-button></mx-connected-button-group>',
  ],
  ['split button', '<mx-split-button>Save</mx-split-button>'],
]) {
  await load(html);
  const built = await page.screenshot();
  await page.evaluate(() => {
    const groups = [
      document,
      ...[...document.querySelectorAll('*')]
        .map((e) => e.shadowRoot)
        .filter(Boolean),
    ].flatMap((r) => [...r.querySelectorAll('mx-connected-button-group')]);
    if (
      groups.length !== 1 ||
      getComputedStyle(groups[0]).isolation !== 'isolate'
    )
      throw new Error('no isolated group');
    groups[0].style.isolation = 'auto';
  });
  console.log(
    `${name}: ${built.equals(await page.screenshot()) ? 'same paint' : 'DIFFERS'} without isolation`,
  );
}
for (const tag of ['mx-list-button-item', 'mx-list-link-item']) {
  await load(
    `<mx-list style="inline-size:300px"><${tag} href="#x">Item</${tag}></mx-list>`,
  );
  await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
  await page.waitForTimeout(400);
  const read = async () => {
    const data = (await page.screenshot()).toString('base64');
    return page.evaluate(
      async ([d, t]) => {
        const i = new Image();
        i.src = `data:image/png;base64,${d}`;
        await i.decode();
        const c = document.createElement('canvas');
        c.width = i.width;
        c.height = i.height;
        const x = c.getContext('2d');
        x.drawImage(i, 0, 0);
        const r = document.querySelector(t).getBoundingClientRect();
        return [...x.getImageData(r.x + r.width / 2, r.y + 1, 1, 1).data]
          .slice(0, 3)
          .join(' ');
      },
      [data, tag],
    );
  };
  const rest = await read();
  await page.mouse.move(150, 60);
  await page.waitForTimeout(300);
  console.log(`${tag}: indicator ${rest}, hovered ${await read()}`);
}
await browser.close();

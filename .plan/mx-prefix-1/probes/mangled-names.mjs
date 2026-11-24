// Run from packages/material-x, built:
//   node ../../.plan/mx-prefix-1/probes/mangled-names.mjs [names.json]
// Reads, in each engine, what the published names of the private properties do
// to a page that uses the same names. The page's names come from names.json, or
// from the build's own map when there is no argument.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const playwright = require('playwright');
const { rolldown } = await import(
  createRequire(`${process.cwd()}/../../package.json`).resolve('rolldown')
);
const names = JSON.parse(
  await readFile(
    process.argv[2] ?? '../../node_modules/.cache/css/css-private-props.json',
    'utf8',
  ),
);
const bundle = await rolldown({
  input: 'virtual:entry',
  logLevel: 'silent',
  plugins: [
    {
      name: 'entry',
      resolveId: (id) => (id === 'virtual:entry' ? id : null),
      load: (id) =>
        id === 'virtual:entry'
          ? [
              'checkbox/checkbox',
              'text-field/text-field',
              'list/list-item',
              'button/button',
              'fab/fab',
            ]
              .map((f) => `import '${process.cwd()}/${f}.js';`)
              .join('\n')
          : null,
    },
  ],
});
const { output } = await bundle.generate({ format: 'esm' });
const code = output.map((c) => c.code ?? '').join('\n');
const n = (name) => names[`--_${name}`];
console.log(
  `names: level ${n('level')}, container-color ${n('container-color')}, border-radius ${n('border-radius')}, suffix color ${n('input-text-suffix-color')}`,
);
const html = `<!doctype html><script type=module src=/lib.js></script>
<style>
  .page-a { color: var(${n('input-text-suffix-color')}); background-color: var(${n('input-text-suffix-color')}, rgb(4, 5, 6)); }
  :root { ${n('border-radius')}: 3px; ${n('container-color')}: rgb(255, 0, 0); }
  .page-b { ${n('level')}: solid; border-style: var(${n('level')}, dotted); }
</style>
<body style="color: rgb(1, 2, 3)">
<span class=page-a id=outside>x</span>
<mx-text-field><span class=page-a id=inside slot=suffix>x</span></mx-text-field>
<mx-button id=button>Text</mx-button>
<mx-checkbox id=checkbox></mx-checkbox>
<p class=page-b id=level>x</p>`;
const server = createServer((request, response) => {
  const js = request.url === '/lib.js';
  response.writeHead(200, {
    'content-type': js ? 'text/javascript' : 'text/html',
  });
  response.end(js ? code : html);
});
await new Promise((r) => server.listen(0, r));
for (const name of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[name].launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.waitForTimeout(400);
  console.log(
    name,
    browser.version(),
    JSON.stringify(
      await page.evaluate(() => {
        const css = (id) => getComputedStyle(document.getElementById(id));
        return {
          'page content outside': css('outside').color,
          'page content in a text field': css('inside').color,
          'its background, not inherited, fallback rgb(4, 5, 6)':
            css('inside').backgroundColor,
          'button corner': getComputedStyle(
            document.getElementById('button').shadowRoot.querySelector('.host'),
          ).borderTopLeftRadius,
          'unchecked checkbox ::after': getComputedStyle(
            document.getElementById('checkbox'),
            '::after',
          ).backgroundColor,
          'page rule on the registered name': css('level').borderTopStyle,
        };
      }),
    ),
  );
  await browser.close();
}
server.close();

// RF-121: what the place of the avatar's selector changes, on the built list item.
// Run from packages/material-x, built: node avatar-cascade.mjs <the bundle of reviews/hidden-1/probes/bundle.mjs>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const ruled = readFileSync(process.argv[2], 'utf8');
const from =
  '&::slotted([data-avatar]:not([hidden]:not([hidden=until-found i]))){';
if (ruled.split(from).length !== 2) throw new Error('the avatar rule');
const variants = {
  before: ruled.replace(from, '&::slotted([data-avatar]){'),
  ruled,
  where: ruled.replace(
    from,
    '&::slotted([data-avatar]:where(:not([hidden]:not([hidden=until-found i])))){',
  ),
};
// `display` alone has the ruled selector.
variants.split = variants.before.replace(
  /&::slotted\(\[data-avatar\]\)\{([^}]*?)display:grid;?([^}]*)\}/u,
  (_, a, b) => `${from}display:grid}&::slotted([data-avatar]){${a}${b}}`,
);
if (variants.split === variants.before) throw new Error('the split');
const pixel =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const cases = {
  'span avatar': '<span slot="lead" data-avatar>A</span>',
  'span avatar hidden': '<span slot="lead" data-avatar hidden>A</span>',
  'span avatar hidden, page display':
    '<span slot="lead" data-avatar hidden style="display:block">A</span>',
  'img avatar': `<img slot="lead" data-avatar src="${pixel}">`,
  'div avatar image': '<div slot="lead" data-avatar data-image></div>',
  'img avatar image': `<img slot="lead" data-avatar data-image src="${pixel}">`,
  'div avatar video': '<div slot="lead" data-avatar data-video></div>',
  'div avatar video, large':
    '<div slot="lead" data-avatar data-video></div><span slot="overline">o</span><span slot="support">s</span>',
};
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  for (const [variant, code] of Object.entries(variants)) {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html>${Object.values(cases)
        .map((c) => `<mx-list-item>${c}Text</mx-list-item>`)
        .join('')}<script>${code}</script>`,
    );
    await page.waitForTimeout(300);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('[slot=lead]')].map((e) => {
        const s = getComputedStyle(e);
        return `${s.display} ${e.offsetWidth}x${e.offsetHeight} radius ${s.borderRadius} background ${s.backgroundColor}`;
      }),
    );
    console.log(`\n## ${variant}`);
    Object.keys(cases).forEach((name, i) =>
      console.log(`  ${name}: ${rows[i]}`),
    );
    await page.close();
  }
  await browser.close();
}

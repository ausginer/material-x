// A click on each kind of slotted content of a disabled split button, and of a
// disabled mx-button and a native button as controls, on built bundles.
// Run from packages/material-x: node slotted.mjs <head.js> <main.js>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const codes = Object.fromEntries(
  ['head', 'main'].map((name, n) => [
    name,
    readFileSync(process.argv[2 + n], 'utf8'),
  ]),
);
const CONTENTS = {
  text: 'Save',
  span: '<span>Save</span>',
  'icon, at the icon': '<mx-icon slot="icon">edit</mx-icon>Save',
};
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  for (const [name, code] of Object.entries(codes))
    for (const tag of ['mx-split-button', 'mx-button', 'button'])
      for (const state of ['disabled', '', 'fieldset'])
        for (const [label, content] of Object.entries(CONTENTS)) {
          const page = await browser.newPage();
          const el = `<${tag} id="el" ${state === 'disabled' ? 'disabled' : ''}>${content}</${tag}>`;
          await page.setContent(
            `<!doctype html><div style="padding:30px">${state === 'fieldset' ? `<fieldset disabled>${el}</fieldset>` : el}</div><script>${code}</script>`,
          );
          await page.waitForTimeout(250);
          const at = await page.evaluate(() => {
            window.log = [];
            const e = document.querySelector('#el');
            for (const t of ['click', 'secondaryaction'])
              e.addEventListener(t, (v) =>
                window.log.push(`${t} at ${v.target.localName}`),
              );
            const inner = e.querySelector('*');
            const r = document.createRange();
            r.selectNodeContents(inner ?? e);
            const b = (inner ?? r).getBoundingClientRect();
            return [b.x + b.width / 2, b.y + b.height / 2];
          });
          await page.mouse.click(...at);
          console.log(
            `${name} | ${tag} | ${state || 'enabled'} | ${label} | ${(await page.evaluate(() => window.log.join(' + '))) || 'none'}`,
          );
          await page.close();
        }
  await browser.close();
}

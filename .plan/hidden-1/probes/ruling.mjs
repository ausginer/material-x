// The ruling's readings of RF-121's feature proof: what a member that can't take
// focus does to a connected group's tab stop and arrow keys, a native radio group
// as the reference, and a hidden avatar.
// Run from packages/material-x: node ruling.mjs <dir with head.js, roving.js, avatar.js>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const dir = process.argv[2];
const code = Object.fromEntries(
  ['head', 'roving', 'avatar'].map((n) => [
    n,
    readFileSync(`${dir}/${n}.js`, 'utf8'),
  ]),
);
const ids = [...'abc'];
const member = (x) =>
  `<mx-switch-button id="${x}" value="${x}">${x}</mx-switch-button>`;
const radio = (x) =>
  `<label id="l${x}"><input type="radio" name="r" id="${x}" value="${x}">${x}</label>`;
const ways = {
  'a hidden, then shown': (p) =>
    p.evaluate(() => {
      document.querySelector('#a').hidden = true;
    }),
  'a display: none by class': (p) =>
    p.evaluate(() => document.querySelector('#a').classList.add('off')),
  'a disabled': (p) =>
    p.evaluate(() => {
      document.querySelector('#a').disabled = true;
    }),
  'b hidden': (p) =>
    p.evaluate(() => {
      document.querySelector('#b').hidden = true;
    }),
  'a hidden, a page display shows it': (p) =>
    p.evaluate(() => {
      const a = document.querySelector('#a');
      a.hidden = true;
      a.style.display = 'contents';
    }),
};
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  const tab = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
  console.log(`\n# ${engine} ${browser.version()}`);
  const open = async (name, html) => {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><style>.off{display:none!important}</style><button id="before">B</button>${html}<button id="after">A</button><script>${code[name]}</script>`,
    );
    await page.waitForTimeout(250);
    return page;
  };
  const focused = (page) =>
    page.evaluate(() => document.activeElement.id || 'body');
  const from = async (page) => {
    await page.evaluate(() => document.querySelector('#before').focus());
    await page.keyboard.press(tab);
    return await focused(page);
  };
  for (const [name, make] of [
    ['head', 'group'],
    ['roving', 'group'],
    ['native', 'radio'],
  ]) {
    console.log(`\n## ${name}`);
    for (const [label, way] of Object.entries(ways)) {
      const page = await open(
        make === 'group' ? name : 'head',
        make === 'group'
          ? `<mx-connected-button-group>${ids.map(member).join('')}</mx-connected-button-group>`
          : ids.map(radio).join(''),
      );
      await way(page);
      await page.waitForTimeout(100);
      const first = await from(page);
      const keys = [];
      await page.evaluate(() => document.querySelector('#c').focus());
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press('ArrowRight');
        keys.push(await focused(page));
      }
      let shown = '';
      if (label.endsWith('then shown')) {
        await page.evaluate(() => {
          document.querySelector('#a').hidden = false;
        });
        await page.waitForTimeout(100);
        shown = `; shown again, Tab ${await from(page)}`;
      }
      console.log(
        `  ${label}: Tab ${first}; ArrowRight from c ${keys.join(', ')}${shown}`,
      );
      await page.close();
    }
  }
  for (const name of ['head', 'avatar']) {
    const out = [];
    for (const [tagName, value] of [
      ['mx-icon', ''],
      ['mx-icon', 'true'],
      ['mx-icon', 'until-found'],
      ['span', ''],
      ['span', 'UNTIL-FOUND'],
      ['mx-icon', null],
      ['span', null],
    ]) {
      const page = await open(
        name,
        `<mx-list><mx-list-item><${tagName} id="x" slot="lead" data-avatar ${value === null ? '' : `hidden="${value}"`}>A</${tagName}>Text</mx-list-item></mx-list>`,
      );
      out.push(
        `${tagName} ${value === null ? 'without' : `"${value}"`} ${await page.evaluate(() => getComputedStyle(document.querySelector('#x')).display)}`,
      );
      await page.close();
    }
    const page = await open(
      name,
      '<style>#x{display:inline-block}</style><mx-list><mx-list-item><mx-icon id="x" slot="lead" data-avatar hidden>A</mx-icon>T</mx-list-item></mx-list>',
    );
    out.push(
      `a page's display ${await page.evaluate(() => getComputedStyle(document.querySelector('#x')).display)}`,
    );
    await page.close();
    console.log(`\n## avatar, ${name}\n  ${out.join(', ')}`);
  }
  await browser.close();
}

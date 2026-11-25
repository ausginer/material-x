// A hidden member of a sortable list and of a connected group, the lifted item
// hidden in a drag, and an until-found host's content. `display` is the control:
// a page rule that hides the same element, on the base's bundle too.
// Run from packages/material-x: node lists.mjs <head.js> <main.js>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const codes = {
  head: readFileSync(process.argv[2], 'utf8'),
  main: readFileSync(process.argv[3], 'utf8'),
};
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  for (const [name, how] of [
    ['head', 'hidden'],
    ['head', 'display'],
    ['main', 'hidden'],
    ['main', 'display'],
  ]) {
    const open = async (html) => {
      const page = await browser.newPage({
        viewport: { width: 500, height: 600 },
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setContent(
        `<!doctype html><style>body{margin:20px}.off{display:none!important}</style><button id="before">B</button>${html}<button id="after">A</button><script>${codes[name]}</script>`,
      );
      await page.waitForTimeout(300);
      await page.evaluate((h) => {
        window.hide = (e) =>
          h === 'hidden' ? (e.hidden = true) : e.classList.add('off');
        window.order = () =>
          [...document.querySelectorAll('mx-list-item')]
            .map((e) => e.id)
            .join('');
        const l = document.querySelector('mx-sortable-list');
        l?.addEventListener('reorder', (v) => {
          window.n = (window.n ?? 0) + 1;
          l.insertBefore(v.item, v.next);
        });
      }, how);
      return { page, errors };
    };
    const L = `<mx-sortable-list>${[...'abcd'].map((x) => `<mx-list-item id="${x}">${x}</mx-list-item>`).join('')}</mx-sortable-list>`;
    const at = (page, id) =>
      page.evaluate((i) => {
        const r = document.querySelector(`#${i}`).getBoundingClientRect();
        return [r.x + r.width / 2, r.y + r.height / 2];
      }, id);
    const out = [];
    {
      const { page, errors } = await open(L);
      await page.evaluate(() => hide(document.querySelector('#b')));
      await page.waitForTimeout(100);
      await page.evaluate(() => document.querySelector('#a').focus());
      const r = [];
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(500);
        r.push(await page.evaluate(() => order()));
      }
      out.push(
        `b hidden, keys from a: ${r.join(', ')}; errors ${errors.length} ${errors[0] ?? ''}`,
      );
      await page.close();
    }
    {
      const { page, errors } = await open(L);
      await page.evaluate(() => hide(document.querySelector('#b')));
      await page.waitForTimeout(100);
      const [x, y] = await at(page, 'a'),
        [, z] = await at(page, 'c');
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 10, { steps: 4 });
      await page.mouse.move(x, z + 8, { steps: 10 });
      await page.waitForTimeout(400);
      await page.mouse.up();
      await page.waitForTimeout(900);
      out.push(
        `b hidden, a dragged over c: ${await page.evaluate(() => order())}; errors ${errors.length} ${errors[0] ?? ''}`,
      );
      await page.close();
    }
    {
      const { page, errors } = await open(L);
      const [x, y] = await at(page, 'a'),
        [, z] = await at(page, 'c');
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 10, { steps: 4 });
      await page.mouse.move(x, z, { steps: 10 });
      await page.waitForTimeout(300);
      const was = await page.evaluate(() => [
        document.querySelector('#a').matches(':popover-open'),
        getComputedStyle(document.querySelector('#a')).display,
      ]);
      await page.evaluate(() => hide(document.querySelector('#a')));
      await page.waitForTimeout(100);
      const during = await page.evaluate(() => [
        document.querySelector('#a').matches(':popover-open'),
        getComputedStyle(document.querySelector('#a')).display,
      ]);
      await page.mouse.move(x, z + 5, { steps: 3 });
      await page.mouse.up();
      await page.waitForTimeout(1000);
      const end = await page.evaluate(
        () =>
          `${order()} ${document.querySelector('#a').getAttribute('style')} popover ${document.querySelector('#a').getAttribute('popover')}`,
      );
      await page.evaluate(() => {
        const a = document.querySelector('#a');
        a.hidden = false;
        a.classList.remove('off');
      });
      await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelector('#d').focus());
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(600);
      out.push(
        `a hidden while lifted: ${was} then ${during}, end ${end}, the next key move ${await page.evaluate(() => order())}; errors ${errors.length} ${errors[0] ?? ''}`,
      );
      await page.close();
    }
    for (const when of ['in the markup', 'after the connect']) {
      const { page } = await open(
        `<mx-connected-button-group>${[...'abc'].map((x, n) => `<mx-switch-button id="${x}" value="${x}" ${when === 'in the markup' && n === 0 ? (how === 'hidden' ? 'hidden' : 'class="off"') : ''}>${x}</mx-switch-button>`).join('')}</mx-connected-button-group>`,
      );
      if (when !== 'in the markup')
        await page.evaluate(() => hide(document.querySelector('#a')));
      await page.waitForTimeout(100);
      await page.evaluate(() => document.querySelector('#before').focus());
      const s = [];
      for (let i = 0; i < 2; i += 1) {
        await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        s.push(await page.evaluate(() => document.activeElement.id || 'body'));
      }
      const left = await page.evaluate(
        () =>
          getComputedStyle(
            document.querySelector('#b').shadowRoot.querySelector('.host'),
          ).borderRadius,
      );
      await page.mouse.click(
        ...(await page.evaluate(() => {
          const r = document
            .querySelector('#c')
            .shadowRoot.querySelector('.host')
            .getBoundingClientRect();
          return [r.x + r.width / 2, r.y + r.height / 2];
        })),
      );
      await page.evaluate(() => document.querySelector('#c').focus());
      const k = [];
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press('ArrowRight');
        k.push(await page.evaluate(() => document.activeElement.id || 'body'));
      }
      const t = [];
      await page.evaluate(() => document.querySelector('#before').focus());
      await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
      t.push(await page.evaluate(() => document.activeElement.id || 'body'));
      out.push(
        `connected group, a hidden ${when}: Tab ${s.join(', ')}; b's corners ${left}; ArrowRight from c ${k.join(', ')}; then Tab from before ${t}`,
      );
      await page.close();
    }
    if (how === 'hidden') {
      const { page } = await open('<div id="r"></div>');
      const r = await page.evaluate(async () => {
        const o = [];
        for (const t of [...TAGS, 'button']) {
          const e = document.createElement(t);
          e.setAttribute('hidden', 'until-found');
          e.innerHTML = '<span>Text</span>';
          document.querySelector('#r').replaceChildren(e);
          await new Promise((f) => setTimeout(f, 30));
          const s = e.querySelector('span');
          const h = e.shadowRoot?.querySelector('.host');
          o.push(
            `${t} ${s.checkVisibility({ contentVisibilityAuto: true }) && s.getClientRects().length > 0 ? 'SHOWN' : 'skipped'}`,
          );
        }
        return o;
      });
      out.push(`until-found, the content: ${r.join(', ')}`);
      await page.close();
    }
    console.log(`\n## ${name}, ${how}\n  ${out.join('\n  ')}`);
  }
  await browser.close();
}

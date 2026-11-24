// A disabled split button: the native `disabled` of its two inner buttons, whether a click and the keyboard reach them, and
// with which way of disabling. Beside it, a plain mx-button.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/records-batch-1/probes/split-disabled.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? ['button/button', 'button/split-button']
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
const CASES = {
  enabled: '<mx-split-button>Save</mx-split-button>',
  'disabled attribute': '<mx-split-button disabled>Save</mx-split-button>',
  'disabled set later': '<mx-split-button data-later>Save</mx-split-button>',
  'in a disabled fieldset':
    '<fieldset disabled><mx-split-button>Save</mx-split-button></fieldset>',
  'disabled, and the inner group disabled by script':
    '<mx-split-button disabled data-group>Save</mx-split-button>',
  'mx-button, disabled': '<mx-button disabled>Save</mx-button>',
};
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  for (const [name, html] of Object.entries(CASES)) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    await page.setContent(
      `<!doctype html><button id="before">B</button><div id="r">${html}</div><script>${code}</script>`,
    );
    const inner = await page.evaluate(async () => {
      const el = document.querySelector('#r mx-split-button, #r mx-button');
      if (el.hasAttribute('data-later')) el.disabled = true;
      if (el.hasAttribute('data-group'))
        el.shadowRoot.querySelector('mx-connected-button-group').disabled =
          true;
      window.log = [];
      for (const type of ['click', 'secondaryaction'])
        el.addEventListener(type, () => window.log.push(type));
      await new Promise((r) => setTimeout(r, 600));
      const parts =
        el.localName === 'mx-button'
          ? [el]
          : [
              ...el.shadowRoot.querySelectorAll(
                '[part=leading], [part=trailing]',
              ),
            ];
      window.parts = parts;
      return parts.map((p) => {
        const b = p.shadowRoot.querySelector('.host');
        const r = b.getBoundingClientRect();
        return {
          part: p.getAttribute('part') ?? p.localName,
          disabled: b.disabled,
          state: p.matches(':state(disabled)'),
          background: getComputedStyle(b).backgroundColor,
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
        };
      });
    });
    const read = [];
    for (const { x, y, part, disabled, state, background } of inner) {
      await page.evaluate(() => (window.log.length = 0));
      await page.mouse.click(x, y);
      const click = await page.evaluate(() => window.log.join('+') || 'none');
      read.push(
        `${part}: button.disabled ${disabled}, :state(disabled) ${state}, background ${background}, a click gives ${click}`,
      );
    }
    await page.evaluate(() => {
      window.log.length = 0;
      document.querySelector('#before').focus();
    });
    const stops = [];
    for (let i = 0; i < 2; i += 1) {
      await page.keyboard.press('Tab');
      stops.push(
        await page.evaluate(() => {
          let a = document.activeElement;
          const path = [];
          while (a) {
            path.push(a.getAttribute('part') ?? a.localName);
            a = a.shadowRoot?.activeElement;
          }
          return path.join('>');
        }),
      );
      await page.keyboard.press('Enter');
    }
    console.log(
      `${name}\n  ${read.join('\n  ')}\n  Tab twice: ${stops.join(', ')}; Enter on each gives ${await page.evaluate(() => window.log.join('+') || 'none')}`,
    );
    await page.close();
  }
  await browser.close();
}

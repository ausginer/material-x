// The slider's held state from `:active`, as built, and from a custom state that
// pointer events set, as a candidate: the handle's width and the indicator, by
// press and by engine. The candidate is the built element with listeners added
// here, on the same input, and a sheet in place of `:active`.
// Run from packages/material-x, with the packages built:
//   node ../../.plan/slider-1/probes/held-state.ts
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { chromium, firefox, webkit } = require('playwright');
let path: string;
try {
  path = require.resolve('rolldown');
} catch {
  path = rootRequire.resolve('rolldown');
}
const { rolldown } = await import(path);
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id: string) => (id === 'entry' ? id : null),
      load: (id: string) =>
        id === 'entry'
          ? `import ${JSON.stringify(`${process.cwd()}/slider/slider.js`)};`
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output
  .map((c: any) => c.code ?? '')
  .join('\n')
  .replaceAll('</script', '<\\/script');

const CANDIDATE = `
  const s = document.querySelector('mx-slider'), q = s.shadowRoot.querySelector('.input');
  let id = -1;
  const end = () => { s.toggleAttribute('data-held', false); id = -1; };
  q.addEventListener('pointerdown', (e) => { if (e.button === 0 && id < 0) { id = e.pointerId; s.toggleAttribute('data-held', true); } });
  for (const t of ['pointerup', 'pointercancel']) q.addEventListener(t, (e) => { if (e.pointerId === id) end(); });`;

const PRESSES: Record<
  string,
  (
    page: any,
    at: readonly [number, number],
    label: readonly [number, number],
  ) => Promise<void>
> = {
  'the track, still': async (p, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.waitForTimeout(400);
  },
  'the track, still, then moved out of the slider': async (p, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.waitForTimeout(400);
    await p.mouse.move(x, y + 150, { steps: 4 });
    await p.waitForTimeout(150);
  },
  'the same, released there': async (p, [x, y]) => {
    await PRESSES['the track, still, then moved out of the slider']!(
      p,
      [x, y],
      [0, 0],
    );
    await p.mouse.up();
    await p.waitForTimeout(150);
  },
  'moved out at once': async (p, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x, y + 150, { steps: 4 });
    await p.waitForTimeout(400);
  },
  'the label': async (p, _, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.waitForTimeout(50);
  },
  'the right button': async (p, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down({ button: 'right' });
    await p.waitForTimeout(50);
  },
  'disabled during': async (p, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.evaluate(() =>
      document.querySelector('mx-slider')!.toggleAttribute('disabled', true),
    );
    await p.waitForTimeout(100);
  },
  'removed and put back during, released': async (p, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.evaluate(() => {
      const s = document.querySelector('mx-slider')!;
      document.body.append(s);
    });
    await p.mouse.up();
    await p.waitForTimeout(150);
  },
  'display: none during, released, shown again': async (p, [x, y]) => {
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.evaluate(() =>
      (document.querySelector('mx-slider') as HTMLElement).style.setProperty(
        'display',
        'none',
      ),
    );
    await p.waitForTimeout(50);
    await p.mouse.up();
    await p.evaluate(() =>
      (document.querySelector('mx-slider') as HTMLElement).style.removeProperty(
        'display',
      ),
    );
    await p.waitForTimeout(150);
  },
};

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`# ${type.name()} ${browser.version()}`);
  for (const [name, act] of Object.entries(PRESSES)) {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><div style="padding:60px;width:400px"><mx-slider indicator><span slot=label>Volume</span></mx-slider><div style="height:200px"></div></div><script>${code}</script><script>${CANDIDATE}</script>`,
    );
    await page.waitForTimeout(100);
    const [at, label] = await page.evaluate(() => {
      const s = document.querySelector('mx-slider')!;
      const r = s.shadowRoot!.querySelector('.track')!.getBoundingClientRect();
      const l = s.querySelector('[slot=label]')!.getBoundingClientRect();
      return [
        [r.left + 100, r.top + r.height / 2],
        [l.left + 10, l.top + l.height / 2],
      ] as const;
    });
    await act(page, at as any, label as any);
    const r = await page.evaluate(() => {
      const s = document.querySelector('mx-slider')!;
      const q = s.shadowRoot!.querySelector('.input')!;
      return `:active ${q.matches(':active')}, handle ${getComputedStyle(s.shadowRoot!.querySelector('.handle')!).width}, indicator ${getComputedStyle(s.shadowRoot!.querySelector('.indicator')!).opacity}, focus-visible ${q.matches(':focus-visible')} | candidate held ${s.hasAttribute('data-held')}`;
    });
    console.log(`${name}: ${r}`);
    await page.close();
  }
  await browser.close();
}

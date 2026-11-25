// Copy to packages/material-x and run there, with the packages built:
//   node box-rows.ts <packages> <chromium|firefox|webkit>
// On the bar with the area-above target: what a moved bar and an `auto` box do,
// so that the rows on them have a witness.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
];
const AREA: [string, string][] = [
  [
    'rootMargin: "0px 1000000px"',
    'rootMargin: "10000000px 1000000px -100%", threshold: 1e-9',
  ],
  [
    '!entries.at(-1).isIntersecting',
    'entries.at(-1).boundingClientRect.top < 0',
  ],
  [
    'border:0;block-size:0;inline-size:0;',
    'border:0;block-size:1px;inline-size:1px;',
  ],
];
const VARIANTS: Record<string, [string, string][]> = {
  control: AREA,
  'nothing at a connect while the box is open': [
    ...AREA,
    [
      'if (scrollStart.isConnected) {',
      'if (scrollStart.isConnected && !scrollStart.matches(":popover-open")) {',
    ],
  ],
  'no connected check': [...AREA, ['if (scrollStart.isConnected) {', '{']],
  'popover auto': [...AREA, ['popover=manual', 'popover=auto']],
  'popover hint': [...AREA, ['popover=manual', 'popover=hint']],
};
const browser = await { chromium, firefox, webkit }[ENGINE].launch(
  ENGINE === 'chromium' ? { channel: 'chromium' } : {},
);
console.log(`# ${ENGINE} ${browser.version()}`);
for (const [name, edits] of Object.entries(VARIANTS)) {
  const done = new Set<string>();
  const b = await rolldown({
    input: 'entry',
    platform: 'browser',
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => (id === 'entry' ? id : null),
        load: (id) =>
          id === 'entry'
            ? `import ${JSON.stringify(join(PACKAGES, 'material-x/top-app-bar/top-app-bar.js'))};`
            : null,
        transform: (code, id) => {
          if (!id.includes('/top-app-bar/')) return null;
          let text = code;
          for (const [from, to] of edits)
            if (text.includes(from)) {
              text = text.replace(from, () => to);
              done.add(from);
            }
          return text;
        },
      },
    ],
  });
  const { output } = await b.generate({ format: 'iife' });
  if (done.size !== edits.length) throw new Error(`no match in ${name}`);
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 60)));
  await page.setContent(
    '<!doctype html><style>body{margin:0}</style><div id=to></div><div id=pop popover>p</div><div style="height:5000px"></div>',
  );
  await page.addScriptTag({
    content: output.map((c) => ('code' in c ? c.code : '')).join('\n'),
  });
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setTimeout(r, 60)),
          ),
        ),
    );
  const at = async (y: number) => {
    await page.evaluate((v) => scrollTo(0, v), y);
    await settle();
    return page.evaluate(
      () =>
        `${document.querySelector('mx-top-app-bar')!.matches(':state(scrolled)') ? 'on' : 'off'}@${scrollY}`,
    );
  };
  await page.evaluate(() => {
    customElements.define(
      'x-mover',
      class extends HTMLElement {
        connectedCallback() {
          document.getElementById('to')!.append(...this.children);
        }
      },
    );
    const c = document.createElement('x-mover');
    c.append(document.createElement('mx-top-app-bar'));
    document.body.append(c);
  });
  await settle();
  const moved = [await at(0), await at(300), await at(0)].join(' ');
  await page.evaluate(() => {
    const bar = document.querySelector('mx-top-app-bar')!;
    bar.remove();
    document.getElementById('pop')!.showPopover();
    document.body.prepend(bar);
  });
  await settle();
  const kept = await page.evaluate(() =>
    document.getElementById('pop')!.matches(':popover-open'),
  );
  await page.mouse.click(400, 500);
  await settle();
  const clicked = [await at(0), await at(300), await at(0)].join(' ');
  console.log(
    `${name} | moved as it connects: ${moved}, errors ${errors.length} ${errors.join()} | the page's open auto popover stays open ${kept} | after a click: ${clicked}`,
  );
  await page.close();
}
await browser.close();

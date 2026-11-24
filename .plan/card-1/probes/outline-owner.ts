// Which box of the built mx-card draws the outline, in cards that are smaller
// than their content, and what each candidate costs elsewhere. A candidate is
// a stylesheet that the probe adopts after the card's own. The outline is read
// as red pixels on a screenshot, and not as a declaration.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/card-1/probes/outline-owner.ts <chromium|firefox|webkit>
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const playwright = require('playwright');
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { rolldown } = await import(
  (() => {
    try {
      return require.resolve('rolldown');
    } catch {
      return rootRequire.resolve('rolldown');
    }
  })()
);

const ENGINE = process.argv[2] as 'chromium' | 'firefox' | 'webkit';
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'entry',
      resolveId: (id: string) => (id === 'entry' ? id : null),
      load: (id: string) =>
        id === 'entry'
          ? `import ${JSON.stringify(`${process.cwd()}/card/card.js`)};import ${JSON.stringify(`${process.cwd()}/button/button.js`)};`
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'card' });
const code = output
  .map((c: any) => ('code' in c ? c.code : ''))
  .join('\n')
  .replaceAll('</script', '<\\/script');

const COLOR = 'var(--md-card-outline-color, gray)';
const NONE = ':host(:state(outlined)) slot { outline: none }';
const SHRINK = 'slot { flex: 1 1 auto; min-block-size: 0 }';
const onHost = (state: string, important: string) =>
  `${NONE} :host(${state}) { outline: 1px solid ${COLOR} ${important}; outline-offset: -1px ${important} }`;
const border = (slot: string) =>
  `${NONE} :host { box-sizing: border-box !important } :host(:state(outlined)) { border: 1px solid ${COLOR} !important } ${slot}`;

const CANDIDATES: Readonly<Record<string, string>> = {
  'slot (built)': '',
  'slot, shrinks': SHRINK,
  'slot, shrinks, overflow: inherit': `${SHRINK} slot { overflow: inherit }`,
  'host outline': onHost(':state(outlined)', ''),
  'host outline !important': onHost(':state(outlined)', '!important'),
  'host outline !important, not when focused': onHost(
    ':state(outlined):not(:focus-visible)',
    '!important',
  ),
  'host border !important': border(''),
  'host border !important, slot margin -1px': border(
    ':host(:state(outlined)) slot { margin: -1px }',
  ),
  'host inset shadow': `${NONE} :host(:state(outlined)) { box-shadow: inset 0 0 0 1px ${COLOR} }`,
  'host ::after border': `${NONE} :host(:state(outlined))::after { border: 1px solid ${COLOR}; box-sizing: border-box }`,
};

// Chromium's scrollbars are hidden by default in Playwright, and the outline
// shares the edge with them.
const browser = await playwright[ENGINE].launch(
  ENGINE === 'chromium' ? { ignoreDefaultArgs: ['--hide-scrollbars'] } : {},
);
console.log(`# ${ENGINE} ${browser.version()}`);
const context = await browser.newContext({
  viewport: { width: 400, height: 400 },
});
const page = await context.newPage();

const load = async (css: string, body: string, pageCss = ''): Promise<void> => {
  await page.setContent(
    `<!doctype html><style>body{margin:0;padding:50px;background:#fff}mx-card{inline-size:200px;--md-card-outline-color:rgb(255,0,0);--md-card-container-color:rgb(220,220,220);--md-card-container-shape:0px}</style><style>${pageCss}</style>${body}<script>${code}</script>`,
  );
  await page.evaluate((css: string) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    for (const card of document.querySelectorAll('mx-card')) {
      card.shadowRoot!.adoptedStyleSheets.push(sheet);
    }
  }, css);
};

/** The share of each edge of the host's box that is red, and the red box. */
const red = async (): Promise<string> => {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async (png: string) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const c = canvas.getContext('2d')!;
    c.drawImage(image, 0, 0);
    const { data } = c.getImageData(0, 0, image.width, image.height);
    const isRed = (x: number, y: number): boolean => {
      const i = (y * image.width + x) * 4;
      return data[i]! > 240 && data[i + 1]! < 15 && data[i + 2]! < 15;
    };
    const r = document.querySelector('mx-card')!.getBoundingClientRect();
    const [x0, y0, x1, y1] = [r.left, r.top, r.right - 1, r.bottom - 1];
    const share = (n: number, at: (i: number) => boolean): string => {
      let hits = 0;
      for (let i = 0; i < n; i++) hits += Number(at(i));
      return String(Math.round((100 * hits) / n));
    };
    let outside = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const edge =
          x >= x0 &&
          x <= x1 &&
          y >= y0 &&
          y <= y1 &&
          (x === x0 || x === x1 || y === y0 || y === y1);
        outside += Number(isRed(x, y) && !edge);
      }
    }
    return `top ${share(r.width, (i) => isRed(x0 + i, y0))}% right ${share(r.height, (i) => isRed(x1, y0 + i))}% bottom ${share(r.width, (i) => isRed(x0 + i, y1))}% left ${share(r.height, (i) => isRed(x0, y0 + i))}%, elsewhere ${outside}px`;
  }, png);
};

const card = (style: string, html: string, attrs = 'variant="outlined"') =>
  `<mx-card ${attrs} style="${style}">${html}</mx-card>`;
const tall = '<div id="c" style="block-size:400px">x</div>';
const short = '<div id="c" style="block-size:40px">x</div>';
const GREEN = 'background:rgb(0,160,0);block-size:400px';
const RESET = '*,*::before,*::after{margin:0;padding:0;border:0;outline:0}';

for (const [name, css] of Object.entries(CANDIDATES)) {
  console.log(`\n## ${name}`);
  const read = async (
    label: string,
    body: string,
    pageCss = '',
    act?: () => Promise<unknown>,
  ) => {
    await load(css, body, pageCss);
    const note = await act?.();
    console.log(
      `${label}: ${await red()}${note == null ? '' : ` | ${JSON.stringify(note)}`}`,
    );
  };
  const scroll = (to: number) => () =>
    page.evaluate((to: number) => {
      const el = document.querySelector('mx-card')!;
      el.scrollTop = to;
      return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight };
    }, to);

  await read('natural', card('', short));
  await read('block-size 40, content 40', card('block-size:40px', short));
  await read(
    'block-size 100, overflow hidden',
    card('block-size:100px;overflow:hidden', tall),
  );
  await read(
    'max 100, overflow auto, at 0',
    card('max-block-size:100px;overflow:auto', tall),
    '',
    scroll(0),
  );
  await read(
    'max 100, overflow auto, at 120',
    card('max-block-size:100px;overflow:auto', tall),
    '',
    scroll(120),
  );
  await read(
    'max 100, overflow auto, at the end',
    card('max-block-size:100px;overflow:auto', tall),
    '',
    async () => {
      await scroll(9999)();
      return page.evaluate(() => {
        const el = document.querySelector('mx-card')!;
        const c = document.querySelector('#c')!.getBoundingClientRect();
        const s = el.shadowRoot!.querySelector('slot')!;
        s.scrollTop = 9999;
        const c2 = document.querySelector('#c')!.getBoundingClientRect();
        return {
          scrollTop: el.scrollTop,
          slotScrollTop: s.scrollTop,
          spaceAfterContent:
            el.getBoundingClientRect().bottom - (s.scrollTop ? c2 : c).bottom,
        };
      });
    },
  );
  await read(
    'the same, positioned full-bleed content, at 120',
    card(
      'max-block-size:100px;overflow:auto;--md-card-padding:0',
      `<div style="${GREEN};position:relative"></div>`,
    ),
    '',
    scroll(120),
  );
  await read(
    'the same, isolation: isolate, at 120',
    card(
      'max-block-size:100px;overflow:auto;isolation:isolate;--md-card-padding:0',
      `<div style="${GREEN};position:relative"></div>`,
    ),
    '',
    scroll(120),
  );
  await read(
    'full-bleed, natural',
    card(
      '--md-card-padding:0',
      `<div style="${GREEN.replace('400', '60')}"></div>`,
    ),
  );
  await read(
    'full-bleed, natural, positioned',
    card(
      '--md-card-padding:0',
      `<div style="${GREEN.replace('400', '60')};position:relative"></div>`,
    ),
  );
  await read('reset', card('', short), RESET);
  await read(
    'reset, after the sheet is !important',
    card('', short),
    RESET.replaceAll(/:0/gu, ':0!important'),
  );
  await read(
    'utility preflight',
    card('', short),
    '*,::before,::after{box-sizing:border-box;margin:0;padding:0;border:0 solid}',
  );
  await read(
    'keyboard focus, tabindex 0',
    card('', short, 'variant="outlined" tabindex="0"'),
    '',
    async () => {
      await page.keyboard.press(ENGINE === 'webkit' ? 'Alt+Tab' : 'Tab');
      return page.evaluate(() => {
        const el = document.querySelector('mx-card')!;
        const s = getComputedStyle(el);
        return {
          focusVisible: el.matches(':focus-visible'),
          host: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
        };
      });
    },
  );
  await read(
    "a page's own outline",
    card('', short),
    'mx-card{outline:3px solid blue}',
    () =>
      page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('mx-card')!);
        return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`;
      }),
  );
  await load(
    css,
    ['', 'variant="elevated"', 'variant="outlined"']
      .flatMap((v) => [
        card('', short, v),
        card('--md-card-padding:0', short, v),
        card('--md-card-padding:8px 24px', short, v),
        card('inline-size:200px;box-sizing:content-box', short, v),
      ])
      .join(''),
  );
  console.log(
    'host size and content inset (left, top), padding 16, 0, 8px 24px, 16 in content-box, for filled, elevated and outlined:',
    JSON.stringify(
      await page.evaluate(() =>
        [...document.querySelectorAll('mx-card')].map((el) => {
          const r = el.getBoundingClientRect();
          const c = el.firstElementChild!.getBoundingClientRect();
          return `${r.width}x${r.height} ${c.left - r.left},${c.top - r.top}`;
        }),
      ),
    ),
  );
  await load(
    css,
    card('block-size:300px', '<div style="block-size:100%">x</div>'),
  );
  console.log(
    'percent-height child of a 300px card:',
    await page.evaluate(
      () =>
        document.querySelector('mx-card > div')!.getBoundingClientRect().height,
    ),
  );
  const column =
    '<div class="t" style="block-size:300px;inline-size:40px"></div>';
  const full = '<div style="block-size:100%">x</div>';
  await load(
    css,
    `<div style="display:grid;grid-template-columns:200px 40px">${card('', full)}${column}</div><div style="display:flex">${card('', full)}${column}</div>${card('min-block-size:300px', full)}`,
  );
  console.log(
    'percent-height child of a card that is 300px by a grid, a flex row and min-block-size:',
    JSON.stringify(
      await page.evaluate(() =>
        [...document.querySelectorAll('mx-card > div')].map(
          (e) => e.getBoundingClientRect().height,
        ),
      ),
    ),
  );
  const focused = () =>
    page.evaluate(() => {
      const el = document.querySelector('mx-card')!;
      const s = getComputedStyle(el);
      return {
        focused: document.activeElement === el,
        focusVisible: el.matches(':focus-visible'),
        host: `${s.outlineStyle} ${s.outlineWidth}`,
      };
    });
  await load(css, card('max-block-size:100px;overflow:auto', tall));
  await page.keyboard.press(ENGINE === 'webkit' ? 'Alt+Tab' : 'Tab');
  console.log(
    'Tab to a scrolling card with no tabindex:',
    JSON.stringify(await focused()),
  );
  await load(css, card('', short, 'variant="outlined" tabindex="0"'));
  await page.mouse.click(150, 80);
  console.log(
    'click on a card with tabindex 0:',
    await red(),
    JSON.stringify(await focused()),
  );
  await load(
    css,
    card('', short, 'variant="outlined" tabindex="0"'),
    'mx-card:focus-visible{outline:3px solid blue}',
  );
  await page.keyboard.press(ENGINE === 'webkit' ? 'Alt+Tab' : 'Tab');
  console.log("a page's own focus outline:", JSON.stringify(await focused()));
  await page.emulateMedia({ forcedColors: 'active' });
  await load(css, card('--md-card-outline-color:rgb(255,0,0)', short));
  // Forced colors replace the red, so the edge is read against its neighbours.
  const png = (await page.screenshot()).toString('base64');
  console.log(
    'forced colors, top edge against the pixel above and below:',
    await page.evaluate(async (png: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const c = canvas.getContext('2d')!;
      c.drawImage(image, 0, 0);
      const r = document.querySelector('mx-card')!.getBoundingClientRect();
      return [-1, 0, 1]
        .map((d) =>
          [...c.getImageData(r.left + 100, r.top + d, 1, 1).data]
            .slice(0, 3)
            .join(),
        )
        .join(' | ');
    }, png),
  );
  await page.emulateMedia({ forcedColors: 'none' });
}
// The default shape, where the two draw the outline on the same box.
for (const [label, style] of [
  ['natural', ''],
  ['stretched to 120px', 'block-size:120px'],
] as const) {
  const shots: Buffer[] = [];
  for (const css of [
    '',
    CANDIDATES['host outline !important, not when focused']!,
  ]) {
    await load(css, card(`${style};--md-card-container-shape:initial`, short));
    shots.push(await page.screenshot());
  }
  console.log(
    `\n${label}, 12px shape, the host's outline against the slot's: ${shots[0]!.equals(shots[1]!) ? 'the same screenshot' : 'DIFFERS'}`,
  );
}
await browser.close();

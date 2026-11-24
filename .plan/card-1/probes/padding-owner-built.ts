// The readings of padding-owner.ts on the built mx-card, whose host draws the
// padding, with the layout before it as the candidate.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/card-1/probes/padding-owner-built.ts <chromium|firefox|webkit>
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
          ? ['card/card', 'button/button', 'checkbox/checkbox']
              .map(
                (e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`,
              )
              .join('')
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'card' });
const code = output
  .map((c: any) => ('code' in c ? c.code : ''))
  .join('\n')
  .replaceAll('</script', '<\\/script');

// The second entry gives the slot back the padding that the host draws, so the
// screenshots compare the built card with the layout before it.
const CANDIDATES: Readonly<Record<string, string>> = {
  'host (built)': '',
  'slot (before)':
    ':host { display: flex; flex-direction: column; box-sizing: content-box !important; padding: 0 !important } slot { display: block; flex: 1 0 auto; padding: var(--md-card-padding, 16px) }',
};

const RESET = '* { padding: 0; border: 0; outline: 0 }';
const RESET_IMPORTANT =
  '* { padding: 0 !important; box-sizing: content-box !important }';
const BASE =
  'html body { margin: 0; padding: 40px !important } mx-card, .ref { scrollbar-width: none } .ref { box-sizing: border-box; padding: 16px }';

const browser = await playwright[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });

async function load(html: string, sheet: string, css = ''): Promise<void> {
  await page.setContent(
    `<!doctype html><style>${BASE}${css}</style>${html}<script>${code}</script>`,
  );
  await page.evaluate((s: string) => {
    for (const c of document.querySelectorAll('mx-card')) {
      const x = new CSSStyleSheet();
      x.replaceSync(s);
      c.shadowRoot!.adoptedStyleSheets.push(x);
    }
  }, sheet);
}

/** The space between the card's edges and its first child's, after a scroll to the end. */
const spaceAtEnd = () =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('mx-card, .ref')!;
    const rtl = getComputedStyle(c).direction === 'rtl';
    c.scrollTo(rtl ? -9999 : 9999, 9999);
    const p = c.firstElementChild!.getBoundingClientRect();
    const b = c.getBoundingClientRect();
    return `inline ${rtl ? p.left - b.left : b.right - p.right} block ${b.bottom - p.bottom} scroll ${Math.abs(c.scrollLeft)},${c.scrollTop}`;
  });

const inset = () =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('mx-card, .ref')!;
    const p = c.firstElementChild!.getBoundingClientRect();
    const b = c.getBoundingClientRect();
    return `card ${b.width}x${b.height} inset ${p.top - b.top} ${b.right - p.right} ${b.bottom - p.bottom} ${p.left - b.left}`;
  });

const SCROLLS: ReadonlyArray<readonly [string, string, string]> = [
  [
    'block',
    'inline-size:200px;max-block-size:100px;overflow:auto',
    'block-size:400px',
  ],
  [
    'inline',
    'inline-size:100px;overflow:auto',
    'inline-size:500px;block-size:40px',
  ],
  [
    'inline, rtl',
    'direction:rtl;inline-size:100px;overflow:auto',
    'inline-size:500px;block-size:40px',
  ],
  [
    'both',
    'inline-size:100px;block-size:100px;overflow:auto',
    'inline-size:500px;block-size:400px',
  ],
  [
    'both, hidden',
    'inline-size:100px;block-size:100px;overflow:hidden',
    'inline-size:500px;block-size:400px',
  ],
  [
    'inline, vertical-rl',
    'writing-mode:vertical-rl;block-size:100px;inline-size:100px;overflow:auto',
    'inline-size:400px;block-size:40px',
  ],
];

const BOX = '<div style="block-size:40px"></div>';
type Case = readonly [string, string, string];
const INSETS: readonly Case[] = [
  ['natural', `<mx-card style="inline-size:200px">${BOX}</mx-card>`, ''],
  ['reset', `<mx-card style="inline-size:200px">${BOX}</mx-card>`, RESET],
  [
    'reset !important, content-box',
    `<mx-card style="inline-size:200px">${BOX}</mx-card>`,
    RESET_IMPORTANT,
  ],
  [
    'inline-size: 100%',
    `<div style="inline-size:200px"><mx-card style="inline-size:100%">${BOX}</mx-card></div>`,
    '',
  ],
  [
    'fit-content',
    `<mx-card style="inline-size:fit-content"><div style="inline-size:120px;block-size:40px"></div></mx-card>`,
    '',
  ],
  [
    'padding 0',
    `<mx-card style="inline-size:200px;--md-card-padding:0">${BOX}</mx-card>`,
    '',
  ],
  [
    'padding 8px 24px',
    `<mx-card style="inline-size:200px;--md-card-padding:8px 24px">${BOX}</mx-card>`,
    '',
  ],
  [
    'padding 0, a margin of 20px',
    `<mx-card style="inline-size:200px;--md-card-padding:0"><div style="block-size:40px;margin-block:20px"></div></mx-card>`,
    '',
  ],
  [
    'percentage, in a stretching grid',
    `<div style="display:grid;grid-template-columns:200px 200px"><mx-card><div style="block-size:100%"></div></mx-card><div style="block-size:300px"></div></div>`,
    '',
  ],
  [
    'percentage, in a stretching flex',
    `<div style="display:flex"><mx-card style="inline-size:200px"><div style="block-size:100%"></div></mx-card><div style="block-size:300px"></div></div>`,
    '',
  ],
  [
    'percentage, in a block size',
    `<mx-card style="inline-size:200px;block-size:300px"><div style="block-size:100%"></div></mx-card>`,
    '',
  ],
  [
    'percentage, in a flex: 1',
    `<div style="display:flex;flex-direction:column;block-size:300px"><mx-card style="flex:1"><div style="block-size:100%"></div></mx-card></div>`,
    '',
  ],
  [
    'absolute child, inset 0',
    `<mx-card style="inline-size:200px"><div style="position:absolute;inset:0"></div>x</mx-card>`,
    '',
  ],
  [
    'page padding 40px',
    `<mx-card style="inline-size:200px;padding:40px">${BOX}</mx-card>`,
    '',
  ],
];

for (const [name, sheet] of Object.entries(CANDIDATES)) {
  console.log(`## ${name}`);
  for (const [n, style, inner] of SCROLLS) {
    await load(
      `<mx-card variant=outlined style="${style}"><div style="${inner}"></div></mx-card>`,
      sheet,
    );
    const s = await spaceAtEnd();
    await load(
      `<div class="ref" style="${style}"><div style="${inner}"></div></div>`,
      '',
    );
    console.log(`  scroll ${n}: ${s} | div: ${await spaceAtEnd()}`);
  }
  for (const [n, html, css] of INSETS) {
    await load(html, sheet, css);
    console.log(`  ${n}: ${await inset()}`);
  }
  // A paragraph and a scroller beside content that is wider than the card.
  await load(
    '<mx-card style="inline-size:200px"><p style="margin:0">text text text text text text text text text text text text</p><pre style="margin:0;overflow:auto">a long line of code, a long line of code, a long line of code</pre></mx-card>',
    sheet,
  );
  console.log(
    `  a scroller inside: ${await page.evaluate(() => [...document.querySelectorAll('mx-card > *')].map((e) => `${e.localName} ${e.getBoundingClientRect().width}`).join(', '))}`,
  );
  await load(
    '<mx-card style="inline-size:200px"><mx-checkbox></mx-checkbox></mx-card>',
    sheet,
  );
  console.log(
    `  a checkbox's container: ${await page.evaluate(() => getComputedStyle(document.querySelector('mx-checkbox')!, '::after').backgroundColor)}`,
  );
  // The whole paint, against the built card.
  const diffs: string[] = [];
  for (const [n, html] of [
    [
      'text and a button',
      '<mx-card variant=V style="inline-size:280px"><h3 style="margin:0">Heading</h3><p>Supporting text about the subject of the card.</p><mx-button color=text>Details</mx-button></mx-card>',
    ],
    [
      'margins of the content',
      '<mx-card variant=V style="inline-size:280px"><h3>Heading</h3><p>Text</p></mx-card>',
    ],
    [
      'full bleed',
      '<mx-card variant=V style="inline-size:280px;--md-card-padding:0"><div style="block-size:80px;background:teal"></div><div style="padding:16px">x</div></mx-card>',
    ],
    [
      'block size 60px',
      '<mx-card variant=V style="inline-size:280px;block-size:60px"><h3>Heading</h3><p>Text</p></mx-card>',
    ],
    [
      'scrolled',
      '<mx-card variant=V style="inline-size:280px;block-size:60px;overflow:auto"><h3>Heading</h3><p>Text</p></mx-card>',
    ],
    [
      'bare text',
      '<mx-card variant=V style="inline-size:280px">Text</mx-card>',
    ],
  ] as const) {
    for (const v of ['filled', 'elevated', 'outlined']) {
      const shots: Buffer[] = [];
      for (const s of ['', sheet]) {
        await load(
          html.replace('variant=V', v === 'filled' ? '' : `variant=${v}`),
          s,
        );
        if (n === 'scrolled')
          await page.evaluate(() =>
            document.querySelector('mx-card')!.scrollTo(0, 30),
          );
        shots.push(await page.screenshot());
      }
      if (!shots[0]!.equals(shots[1]!)) diffs.push(`${n}, ${v}`);
    }
  }
  console.log(
    `  screenshots that differ from the built card's, of 18: ${diffs.length}${diffs.length > 0 ? ` (${diffs.join('; ')})` : ''}`,
  );
}
await browser.close();

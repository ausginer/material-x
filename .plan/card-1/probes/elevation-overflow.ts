// What an elevated mx-card and a lifted mx-list-item paint outside their box
// when the box has an overflow, with the three boxes as built and with the
// three shadows in one list on the host. Each reading is a screenshot against
// the same element without an overflow, outside its border box only.
// It also reads where the list and the three boxes differ, over the whole page.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/card-1/probes/elevation-overflow.ts <chromium|firefox|webkit>
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
          ? `import ${JSON.stringify(`${process.cwd()}/card/card.js`)};import ${JSON.stringify(`${process.cwd()}/list/list-item.js`)};`
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'card' });
const code = output
  .map((c: any) => ('code' in c ? c.code : ''))
  .join('\n')
  .replaceAll('</script', '<\\/script');

const browser = await playwright[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 300, height: 200 } });

const shot = async (
  tag: string,
  level: number,
  style: string,
  list: boolean,
): Promise<string> => {
  await page.setContent(
    `<!doctype html><style>body{margin:0;padding:50px;background:#fff}${tag}{inline-size:200px;block-size:80px}</style><${tag} style="${style}">x</${tag}><script>${code}</script>`,
  );
  await page.evaluate(
    ({ tag, level, list }) => {
      const root = document.querySelector(tag)!.shadowRoot!;
      const text = root.adoptedStyleSheets
        .flatMap((s) => [...s.cssRules])
        .map((r) => r.cssText)
        .join('\n');
      const name = (rule: RegExp): string => rule.exec(text)![1]!;
      const penumbra = name(/:host \{[^}]*box-shadow: var\((--\w+)\)/u);
      const umbra = name(/:host::before \{[^}]*box-shadow: var\((--\w+)\)/u);
      const ambient = name(/:host::after \{[^}]*box-shadow: var\((--\w+)\)/u);
      const lvl = /min\(var\((--\w+)\)/u.exec(text)![1]!;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(
        `:host { ${lvl}: ${level}; transition: none }` +
          (list
            ? `:host::before, :host::after { content: none } :host { box-shadow: var(${umbra}), var(${penumbra}), var(${ambient}) }`
            : ''),
      );
      root.adoptedStyleSheets.push(sheet);
    },
    { tag, level, list },
  );
  return (await page.screenshot()).toString('base64');
};

const compare = async (
  a: string,
  b: string,
  outsideOnly: boolean,
): Promise<string> =>
  page.evaluate(
    async ([a, b, outsideOnly]) => {
      const read = async (data: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const c = canvas.getContext('2d')!;
        c.drawImage(image, 0, 0);
        return c.getImageData(0, 0, image.width, image.height);
      };
      const [x, y] = [await read(a), await read(b)];
      const r = document
        .querySelector('mx-card, mx-list-item')!
        .getBoundingClientRect();
      let pixels = 0;
      let max = 0;
      let sum = 0;
      let atEdge = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const px = (i / 4) % x.width;
        const py = Math.floor(i / 4 / x.width);
        const inside =
          px >= r.left && px < r.right && py >= r.top && py < r.bottom;
        if (outsideOnly && inside) continue;
        const d = Math.max(
          ...[0, 1, 2].map((c) => Math.abs(x.data[i + c]! - y.data[i + c]!)),
        );
        if (d > 0) {
          pixels++;
          sum += d;
          max = Math.max(max, d);
          const near = (v: number, a: number, b: number): boolean =>
            Math.min(Math.abs(v - a), Math.abs(v - b)) <= 13;
          atEdge += Number(
            near(px, r.left, r.right) && near(py, r.top, r.bottom),
          );
        }
      }
      return `${pixels}px differ, max ${max}, mean ${pixels ? (sum / pixels).toFixed(1) : 0}, ${atEdge} at the corners`;
    },
    [a, b, outsideOnly] as const,
  );

for (const [tag, level] of [
  ['mx-card', 1],
  ['mx-card', 3],
  ['mx-list-item', 1],
  ['mx-list-item', 8],
] as const) {
  console.log(`## ${tag} at level ${level}`);
  const three = await shot(tag, level, '', false);
  const list = await shot(tag, level, '', true);
  const none = await shot(tag, 0, '', false);
  console.log(
    `no shadow against the shadow: ${await compare(none, three, true)}`,
  );
  for (const overflow of ['hidden', 'auto', 'clip']) {
    const style = `overflow:${overflow}`;
    console.log(
      `overflow ${overflow} against visible: three boxes ${await compare(await shot(tag, level, style, false), three, true)} | list ${await compare(await shot(tag, level, style, true), list, true)}`,
    );
  }
  console.log(`list against three boxes: ${await compare(list, three, false)}`);
}
await browser.close();

/**
 * The page errors that docs pages raise while they load in WebKit at 375 px, in
 * an ordinary and in a very tall viewport. The controls are other packages' docs
 * pages, box-quad's page with the former range and stage declarations in place
 * from the start, and box-quad's page with its sliders' rows removed.
 *
 * Run from the repository root against a served build:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/recheck-webkit-load.ts <origin>`.
 */
import { webkit } from 'playwright';

const origin = process.argv[2]!;
const RUNS = 10;
const FORMER =
  '[class*="nested-stage"]{block-size:440px!important;padding:72px!important}[class*="range"]>input{inline-size:auto!important;flex:0 1 200px!important}';
const NO_CONTROLS = '[class*="controls"]{display:none!important}';
const index = (await (await fetch(`${origin}/index.json`)).json()) as {
  entries: Record<string, { type: string; id: string }>;
};
const others = Object.values(index.entries)
  .filter((e) => e.type === 'docs' && !e.id.startsWith('box-quad'))
  .map((e) => e.id);
const browser = await webkit.launch();
console.log(`## webkit ${browser.version()}`);

async function read(
  id: string,
  height: number,
  css: string,
): Promise<readonly [number, readonly string[]]> {
  let pages = 0;
  const messages = new Set<string>();

  for (let run = 0; run < RUNS; run += 1) {
    const page = await browser.newPage({ viewport: { width: 375, height } });
    let errors = 0;
    page.on('pageerror', (error) => {
      errors += 1;
      messages.add(error.message);
    });

    if (css) {
      await page.addInitScript((content) => {
        const add = (): void => {
          const style = document.createElement('style');
          style.textContent = content;
          document.documentElement.append(style);
        };

        if (document.documentElement) {
          add();
        } else {
          addEventListener('DOMContentLoaded', add);
        }
      }, css);
    }

    await page.goto(`${origin}/iframe.html?id=${id}&viewMode=docs`);
    await page.waitForSelector('.sbdocs-content');
    await page.waitForTimeout(1500);
    pages += Number(errors > 0);
    await page.close();
  }

  return [pages, [...messages]];
}

for (const height of [900, 5200]) {
  for (const [name, css] of [
    ['as built', ''],
    ['former declarations', FORMER],
    ['controls hidden', NO_CONTROLS],
  ] as const) {
    const [pages, messages] = await read('box-quad--docs', height, css);
    console.log(
      `  height ${height} box-quad ${name}: ${pages} of ${RUNS} loads raise a page error ${messages.join('; ')}`,
    );
  }

  for (const id of others.slice(0, 8)) {
    const [pages, messages] = await read(id, height, '');
    console.log(
      `  height ${height} ${id}: ${pages} of ${RUNS} loads raise a page error ${messages.join('; ')}`,
    );
  }
}

await browser.close();

/**
 * What scrolls sideways in the docs page at 375 px: per story block, at the
 * defaults, the nearest scrolling ancestor of the story, its sideways overflow
 * as built, with the former range and stage declarations, with the controls
 * hidden, and the slider rows' right edges against that scroller's.
 *
 * Run from the repository root against a served build:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/recheck-docs-375.ts <origin> [screenshot directory]`.
 */
import { chromium, firefox, webkit } from 'playwright';

const origin = process.argv[2]!;
const shots = process.argv[3];
const VARIANTS = {
  'as built': '/* */',
  former:
    '[class*="nested-stage"]{block-size:440px!important;padding:72px!important}[class*="range"]>input{inline-size:auto!important;flex:0 1 200px!important}',
  'controls hidden': '[class*="controls"]{display:none!important}',
};

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  for (const [variant, content] of Object.entries(VARIANTS)) {
    const page = await browser.newPage({
      viewport: { width: 375, height: 900 },
    });
    await page.goto(`${origin}/iframe.html?id=box-quad--docs&viewMode=docs`);
    await page.waitForSelector('input[name="targetRotation"]');
    await page.waitForTimeout(800);
    await page.addStyleTag({ content });
    await page.waitForTimeout(200);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('.docs-story')].map((block) => {
        const story =
          block.querySelector('[class*="controls"]')?.parentElement ??
          block.querySelector('[class*="stage"]') ??
          block;
        const scrollers: string[] = [];

        for (
          let e: Element | null = story;
          e && e !== document.documentElement;
          e = e.parentElement
        ) {
          const over = e.scrollWidth - e.clientWidth;

          if (over > 0) {
            scrollers.push(
              `${e.className.toString().split(' ')[0] || e.id || e.tagName} ${getComputedStyle(e).overflowX} +${over}`,
            );
          }
        }

        const ranges = [...story.querySelectorAll('input[type="range"]')];
        const values = ranges.map((i) => {
          const b = block.getBoundingClientRect();
          const o = i
            .parentElement!.querySelector('output')!
            .getBoundingClientRect();
          const r = i.getBoundingClientRect();
          return `range ${(b.right - r.right).toFixed(0)}, value ${(b.right - o.right).toFixed(0)}`;
        });
        return `${block.querySelector('[class*="nested-stage"]') ? 'nested ' : ''}overflow [${scrollers.join('; ')}] inside the block's right edge by [${values.join(' | ')}]`;
      }),
    );
    console.log(`  ${variant}`);

    for (const row of rows) {
      console.log(`    ${row}`);
    }

    if (shots && type === chromium) {
      await page
        .locator('.docs-story', {
          has: page.locator('[class*="nested-stage"]'),
        })
        .screenshot({
          path: `${shots}/docs375-${variant.replace(' ', '-')}.png`,
        });
    }

    await page.close();
  }

  await browser.close();
}

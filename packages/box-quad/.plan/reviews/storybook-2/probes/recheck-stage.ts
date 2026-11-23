/**
 * The recheck of reviewer-1 and reviewer-2: what the repaired stage of _Nested
 * Spaces_ and the wider ranges change on the page. Each reading is taken twice on
 * the same built page: as built, and with the former declarations
 * injected, which is the control (`before`).
 *
 * For _Nested Spaces_ at 1600, 1000, 700, 375 and 320 px and for the docs page
 * at 1600, 1000 and 375 px, over the ancestor's 91 rotations and 31 zooms (every
 * third rotation on the docs page, and every third of both in Firefox and
 * WebKit, the extremes included), with the target at -45, -20 and 45 degrees
 * for the story:
 *
 * - the pairs at which any range on the page is covered at any hit-tested point,
 *   the docs page's other stories' ranges included. The viewport is tall enough
 *   to hold the whole page, because `elementFromPoint` reads only the viewport;
 * - how far the ancestor's box leaves the stage on each side at worst;
 * - the pairs at which the page, or the docs story block, scrolls sideways;
 * - the page's height, the range widths and whether a range's row overflows its
 *   controls row.
 *
 * Run from the repository root against a served build:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/recheck-stage.ts <origin> [screenshot directory] [engines]`.
 */
import { chromium, firefox, webkit } from 'playwright';

const origin = process.argv[2]!;
const shots = process.argv[3];
// Comma-separated engine names, to read fewer than the three.
const engines = process.argv[4]?.split(',');
const FORMER = `
  [class*="nested-stage"] { block-size: 440px !important; padding: 72px !important; }
  [class*="range"] > input { inline-size: auto !important; flex: 0 1 200px !important; }
`;

for (const type of [chromium, firefox, webkit]) {
  if (engines && !engines.includes(type.name())) {
    continue;
  }

  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  const coarse = type !== chromium;

  for (const [view, width] of [
    ['story', 1600],
    ['story', 1000],
    ['story', 700],
    ['story', 375],
    ['story', 320],
    ['docs', 1600],
    ['docs', 1000],
    ['docs', 375],
  ] as const) {
    for (const former of [true, false]) {
      const page = await browser.newPage({
        viewport: { width, height: view === 'docs' ? 5200 : 1000 },
      });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        `${origin}/iframe.html?id=box-quad--${view === 'docs' ? 'docs' : 'nested-spaces'}&viewMode=${view}`,
      );
      await page.waitForSelector('input[type="range"][name="targetRotation"]');
      await page.waitForTimeout(800);

      if (former) {
        await page.addStyleTag({ content: FORMER });
        await page.waitForTimeout(200);
      }

      const result = await page.evaluate(
        async ({ docs, coarse }) => {
          const inputs = [
            ...document.querySelectorAll<HTMLInputElement>(
              'input[type="range"]',
            ),
          ];
          const stage = document.querySelector('[class*="nested-stage"]')!;
          const ancestor = document.querySelector(
            '[class*="nested-ancestor"]',
          )!;
          const story = stage.parentElement!;
          const own = [
            ...story.querySelectorAll<HTMLInputElement>('input[type="range"]'),
          ];
          const set = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
          )!.set!;
          const write = (name: string, value: number): void => {
            const input = own.find((i) => i.name === name)!;
            set.call(input, String(value));
            input.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const block = docs
            ? (story.closest('.docs-story') ??
              story.closest('[id^="story--"]')!)
            : undefined;
          const root = document.documentElement;
          const covered: Record<string, number> = {};
          const out = { top: 0, left: 0, right: 0, bottom: 0 };
          let pairs = 0;
          let applied = 0;
          let sideways = 0;
          let blockSideways = 0;
          let unreachable = 0;

          for (const target of docs ? [-20] : [-45, -20, 45]) {
            write('targetRotation', target);

            for (
              let rotation = -45;
              rotation <= 45;
              rotation += docs || coarse ? 3 : 1
            ) {
              for (let step = 0; step <= 30; step += coarse ? 3 : 1) {
                const zoom = Math.round((0.5 + step * 0.05) * 100) / 100;
                write('ancestorRotation', rotation);
                write('ancestorZoom', zoom);
                await Promise.resolve();
                pairs += 1;
                const style = getComputedStyle(ancestor);

                if (
                  (style.rotate === 'none' ? 0 : parseFloat(style.rotate)) ===
                    rotation &&
                  Math.abs(Number(style.zoom) - zoom) < 1e-3
                ) {
                  applied += 1;
                }

                const a = ancestor.getBoundingClientRect();
                const s = stage.getBoundingClientRect();
                out.top = Math.max(out.top, s.top - a.top);
                out.left = Math.max(out.left, s.left - a.left);
                out.right = Math.max(out.right, a.right - s.right);
                out.bottom = Math.max(out.bottom, a.bottom - s.bottom);
                sideways += Number(root.scrollWidth > root.clientWidth);
                blockSideways += Number(
                  !!block && block.scrollWidth > block.clientWidth,
                );

                for (const [index, input] of inputs.entries()) {
                  const r = input.getBoundingClientRect();

                  if (r.bottom > innerHeight || r.width === 0) {
                    unreachable += 1;
                    continue;
                  }

                  let hit = false;

                  for (let x = 1; x < r.width && !hit; x += 6) {
                    for (const y of [1, r.height / 2, r.height - 1]) {
                      hit ||=
                        document.elementFromPoint(r.left + x, r.top + y) !==
                        input;
                    }
                  }

                  if (hit) {
                    const key = `${index}:${input.name}`;
                    covered[key] = (covered[key] ?? 0) + 1;
                  }
                }
              }
            }
          }

          write('ancestorRotation', 45);
          write('ancestorZoom', 0.5);
          write('targetRotation', -20);
          const c = story
            .querySelector('[class*="controls"]')!
            .getBoundingClientRect();
          const s = stage.getBoundingClientRect();

          return {
            pairs,
            applied,
            covered,
            out: Object.values(out).map((n) => n.toFixed(1)),
            sideways,
            blockSideways,
            unreachable,
            height: root.scrollHeight,
            stage: `${s.width.toFixed(0)} x ${s.height.toFixed(0)}`,
            widths: [
              ...new Set(
                inputs.map((i) => i.getBoundingClientRect().width.toFixed(0)),
              ),
            ],
            rows: own.filter(
              (i) =>
                i.parentElement!.getBoundingClientRect().right > c.right + 0.5,
            ).length,
            smallestRow: own.filter((i) => {
              const label = i.parentElement!.getBoundingClientRect();
              return i.parentElement!.scrollWidth > label.width + 1;
            }).length,
          };
        },
        { docs: view === 'docs', coarse },
      );
      console.log(
        `  ${view} ${width} ${former ? 'before' : 'after '}: ${result.pairs} settings, ${result.applied} applied; covered ${JSON.stringify(result.covered)}; ancestor past the stage's top, left, right, bottom ${result.out.join(', ')} px; page sideways at ${result.sideways}, story block sideways at ${result.blockSideways}; ranges out of the viewport ${result.unreachable}; stage ${result.stage}, page height ${result.height}; range widths ${result.widths.join(', ')}; rows past the controls ${result.rows}, rows overflowing ${result.smallestRow}; page errors ${errors.length}${errors.length ? ` (${errors.join('; ')})` : ''}`,
      );

      if (shots) {
        await page.waitForTimeout(100);
        await page.screenshot({
          path: `${shots}/${type.name()}-${view}-${width}-${former ? 'before' : 'after'}.png`,
          fullPage: view === 'story',
        });
      }

      await page.close();
    }
  }

  await browser.close();
}

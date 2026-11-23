/**
 * Whether anything covers _Nested Spaces_' sliders, at every ancestor rotation
 * and zoom the sliders can be set to (91 rotations, 31 zooms), at 1000 and
 * 1600 px, in Chromium, Firefox and WebKit. `covered-drag.ts` of the review
 * samples every second zoom and one line of each range. This reads a grid of
 * points over the whole range. It also reads the least distance from the
 * controls row's bottom down to the ancestor's top, and each range's width.
 *
 * Run from the repository root against a Storybook origin:
 * `node packages/box-quad/.plan/probes/storybook-demo/covered-grid.ts <origin>`.
 */
import { chromium, firefox, webkit } from 'playwright';

const origin = process.argv[2]!;

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  for (const width of [1000, 1600]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(
      `${origin}/iframe.html?id=box-quad--nested-spaces&viewMode=story`,
    );
    await page.waitForSelector('input[type="range"]');
    await page.waitForTimeout(800);
    const result = await page.evaluate(async () => {
      const inputs = [
        ...document.querySelectorAll<HTMLInputElement>('input[type="range"]'),
      ];
      const ancestor = document.querySelector('[class*="nested-ancestor"]')!;
      const controls = document.querySelector('[class*="controls"]')!;
      const set = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      const write = (name: string, value: number): void => {
        const input = inputs.find((i) => i.name === name)!;
        set.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const covered: Record<string, number> = {};
      let pairs = 0;
      let applied = 0;
      let least = Infinity;
      let at = '';

      for (const input of inputs) {
        covered[input.name] = 0;
      }

      for (let rotation = -45; rotation <= 45; rotation += 1) {
        for (let step = 0; step <= 30; step += 1) {
          const zoom = Math.round((0.5 + step * 0.05) * 100) / 100;
          pairs += 1;
          write('ancestorRotation', rotation);
          write('ancestorZoom', zoom);
          await Promise.resolve();
          const style = getComputedStyle(ancestor);
          const turned =
            style.rotate === 'none' ? 0 : Number.parseFloat(style.rotate);

          if (
            turned === rotation &&
            Math.abs(Number(style.zoom) - zoom) < 1e-3
          ) {
            applied += 1;
          }

          const gap =
            ancestor.getBoundingClientRect().top -
            controls.getBoundingClientRect().bottom;

          if (gap < least) {
            least = gap;
            at = `rotation ${rotation}, zoom ${zoom}`;
          }

          for (const input of inputs) {
            const r = input.getBoundingClientRect();
            let hit = false;

            for (let x = 1; x < r.width && !hit; x += 4) {
              for (let y = 1; y < r.height && !hit; y += 3) {
                hit =
                  document.elementFromPoint(r.left + x, r.top + y) !== input;
              }
            }

            covered[input.name]! += Number(hit);
          }
        }
      }

      return {
        pairs,
        applied,
        covered,
        least,
        at,
        widths: inputs.map((i) => i.getBoundingClientRect().width),
      };
    });
    console.log(
      `  width ${width}: ${result.pairs} pairs, ${result.applied} applied; least distance from the controls to the ancestor ${result.least.toFixed(1)} px (${result.at}); range widths ${result.widths.join(', ')}`,
    );

    for (const [name, pairs] of Object.entries(result.covered)) {
      console.log(`    ${name.padEnd(17)} covered at ${pairs} pairs`);
    }

    await page.close();
  }

  await browser.close();
}

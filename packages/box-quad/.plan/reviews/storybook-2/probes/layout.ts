/**
 * The sliders' layout: at 1000, 375 and 320 px, whether any story scrolls the
 * page sideways, the smallest range, and whether moving a slider across its
 * whole range moves any slider or the stage (a shown value that changes width
 * would). On the docs page, the same at 1000 and 375 px. And screenshots.
 *
 * Run from the repository root against a Storybook dev server:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/layout.ts <origin> <screenshot directory>`.
 */
import { chromium, firefox, webkit } from 'playwright';

const origin = process.argv[2]!;
const shots = process.argv[3]!;

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  for (const width of [1000, 375, 320]) {
    for (const id of ['live-demo', 'nested-spaces', 'pointer-delta', 'docs']) {
      if (id === 'docs' && width === 320) continue;
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(
        `${origin}/iframe.html?id=box-quad--${id}&viewMode=${id === 'docs' ? 'docs' : 'story'}`,
      );
      await page.waitForSelector('input[type="range"]');
      await page.waitForTimeout(800);
      const result = await page.evaluate(async () => {
        const inputs = [
          ...document.querySelectorAll<HTMLInputElement>('input[type="range"]'),
        ];
        const place = (): string =>
          [...inputs, ...document.querySelectorAll('[class*="stage"]')]
            .map((e) => {
              const r = e.getBoundingClientRect();
              return [r.x, r.y, r.width].map((n) => n.toFixed(1)).join(',');
            })
            .join(' ');
        const set = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!;
        const write = (input: HTMLInputElement, value: string): void => {
          set.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        };
        const start = place();
        let moved = 0;
        const movers: string[] = [];
        for (const input of inputs) {
          const initial = input.value;
          const [min, max, step] = [input.min, input.max, input.step].map(
            Number,
          ) as [number, number, number];
          const count = Math.round((max - min) / step);
          for (
            let i = 0;
            i <= count;
            i += Math.max(1, Math.floor(count / 12))
          ) {
            write(input, String(min + i * step));
            await new Promise((r) => {
              requestAnimationFrame(r);
            });
            if (place() !== start) {
              moved += 1;
              if (!movers.includes(input.name)) movers.push(input.name);
            }
          }
          write(input, initial);
          await new Promise((r) => {
            requestAnimationFrame(r);
          });
        }
        return {
          sideways:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
          smallest: Math.min(
            ...inputs.map((i) => i.getBoundingClientRect().width),
          ),
          clipped: inputs.filter((i) => {
            const o = i.parentElement!.querySelector('output')!;
            return o.getBoundingClientRect().right > innerWidth;
          }).length,
          moved,
          movers,
        };
      });
      console.log(
        `  width ${width} ${id.padEnd(14)} page scrolls sideways ${result.sideways}, smallest range ${result.smallest.toFixed(0)} px, shown values past the right edge ${result.clipped}, samples where a slider or stage moved ${result.moved}${result.movers.length ? ` (${result.movers.join(', ')})` : ''}`,
      );
      await page.screenshot({
        path: `${shots}/${type.name()}-${id}-${width}.png`,
        fullPage: true,
      });
      await page.close();
    }
  }

  await browser.close();
}

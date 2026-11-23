/**
 * Whether a covered slider still takes the pointer. For every ancestor rotation
 * and zoom _Nested Spaces_' sliders can be set to, the share of each range
 * input's pixels (and its thumb's centre) where the topmost element isn't the
 * input. Then one real reproduction: the two sliders at rotation 45, then −45, and zoom
 * 0.5, and a Playwright mouse press at the covered part of each range.
 *
 * Run from the repository root against a Storybook dev server:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/covered-drag.ts <origin> [screenshot directory]`.
 */
import { chromium, firefox, webkit } from 'playwright';

const origin = process.argv[2]!;
const shots = process.argv[3];

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  for (const width of [1600, 1000]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(
      `${origin}/iframe.html?id=box-quad--nested-spaces&viewMode=story`,
    );
    await page.waitForSelector('input[type="range"]');
    await page.waitForTimeout(800);
    const sweep = await page.evaluate(async () => {
      const inputs = [
        ...document.querySelectorAll<HTMLInputElement>('input[type="range"]'),
      ];
      const set = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      const write = (name: string, value: number): void => {
        const input = inputs.find((i) => i.name === name)!;
        set.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const out: Record<
        string,
        { pairs: number; thumb: number; worst: number; at: string }
      > = {};
      let pairs = 0;
      for (const i of inputs)
        out[i.name] = { pairs: 0, thumb: 0, worst: 0, at: '' };
      for (let rotation = -45; rotation <= 45; rotation += 1) {
        for (let z = 0; z <= 30; z += 2) {
          const zoom = Math.round((0.5 + z * 0.05) * 100) / 100;
          pairs += 1;
          write('ancestorRotation', rotation);
          write('ancestorZoom', zoom);
          await Promise.resolve();
          for (const input of inputs) {
            const r = input.getBoundingClientRect();
            const y = r.top + r.height / 2;
            let covered = 0;
            for (let x = 1; x < r.width; x += 2) {
              if (document.elementFromPoint(r.left + x, y) !== input)
                covered += 1;
            }
            const share = covered / Math.floor(r.width / 2);
            const ratio =
              (Number(input.value) - Number(input.min)) /
              (Number(input.max) - Number(input.min));
            const entry = out[input.name]!;
            if (covered > 0) entry.pairs += 1;
            if (
              document.elementFromPoint(
                r.left + 8 + ratio * (r.width - 16),
                y,
              ) !== input
            ) {
              entry.thumb += 1;
            }
            if (share > entry.worst) {
              entry.worst = share;
              entry.at = `rotation ${rotation}, zoom ${zoom}`;
            }
          }
        }
      }
      return { pairs, out };
    });
    console.log(
      `  width ${width}, ${sweep.pairs} pairs of ancestor rotation and zoom`,
    );
    for (const [name, e] of Object.entries(sweep.out)) {
      console.log(
        `    ${name.padEnd(17)} partly covered at ${e.pairs}, thumb covered at ${e.thumb}, worst ${(e.worst * 100).toFixed(0)} % of the range (${e.at || '-'})`,
      );
    }

    // The reproduction, with the native keys, then the mouse.
    for (const rotation of ['End', 'Home']) {
      await page.locator('input[name="ancestorRotation"]').focus();
      await page.keyboard.press(rotation);
      await page.locator('input[name="ancestorZoom"]').focus();
      await page.keyboard.press('Home');
      await page.waitForTimeout(100);
      for (const name of [
        'ancestorRotation',
        'ancestorZoom',
        'targetRotation',
      ]) {
        const range = page.locator(`input[name="${name}"]`);
        const found = await range.evaluate((input) => {
          const r = input.getBoundingClientRect();
          const y = r.top + r.height / 2;
          for (let x = 1; x < r.width; x += 1) {
            const hit = document.elementFromPoint(r.left + x, y);
            if (hit && hit !== input) {
              return { x: r.left + x + 1, y, hit: hit.className };
            }
          }
          return undefined;
        });
        if (found) {
          const before = await range.inputValue();
          await page.mouse.click(found.x, found.y);
          await page.waitForTimeout(50);
          console.log(
            `    ancestorRotation ${rotation}, zoom 0.5: click on ${name} at its covered pixel (topmost: ${found.hit}) changes it: ${before !== (await range.inputValue())}`,
          );
        }
      }
      // The thumb at its default value, dragged with the mouse, and the same
      // key steps as a control that the slider itself works.
      const target = page.locator('input[name="targetRotation"]');
      const thumb = await target.evaluate((input: HTMLInputElement) => {
        const r = input.getBoundingClientRect();
        const ratio =
          (Number(input.value) - Number(input.min)) /
          (Number(input.max) - Number(input.min));
        return {
          x: r.left + 8 + ratio * (r.width - 16),
          y: r.top + r.height / 2,
          value: input.value,
        };
      });
      await page.mouse.move(thumb.x, thumb.y);
      await page.mouse.down();
      await page.mouse.move(thumb.x + 40, thumb.y, { steps: 10 });
      await page.mouse.up();
      const dragged = await target.inputValue();
      await target.focus();
      await page.keyboard.press('ArrowRight');
      console.log(
        `    ancestorRotation ${rotation}, zoom 0.5: targetRotation's thumb at ${thumb.value} dragged 40 px: ${dragged}; then ArrowRight: ${await target.inputValue()}`,
      );
      if (shots) {
        await page.screenshot({
          path: `${shots}/covered-${type.name()}-${width}-${rotation}.png`,
        });
      }
    }
    await page.close();
  }

  await browser.close();
}

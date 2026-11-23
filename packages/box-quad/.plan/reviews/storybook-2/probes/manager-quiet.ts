/**
 * Whether Storybook's manager does anything while a box-quad story's slider is
 * dragged, by what the manager does rather than by profiler attribution:
 * mutations of the manager's DOM, its `history.replaceState` calls, and the
 * events on its channel, over a 40-move drag of each slider. The preview's
 * `replaceState` on `top` is counted too. The last row is the control: 40
 * `updateStoryArgs` events on the manager's channel, the path the sliders took
 * before, for the same story.
 *
 * Also read on the manager page: dev-build console errors, React warnings among
 * them, and whether keys pressed on a focused slider reach the manager's
 * keyboard shortcuts. And a theme switch with sliders moved: their values stay.
 *
 * Run from the repository root against a Storybook dev server:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/manager-quiet.ts <origin> [screenshot directory]`.
 */
import { chromium, firefox, webkit } from 'playwright';

const origin = process.argv[2]!;
const shots = process.argv[3];
type Counts = { mutations: number; replaceState: number; events: string[] };

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  for (const id of ['live-demo', 'nested-spaces', 'pointer-delta']) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        problems.push(`${message.type()}: ${message.text()}`);
      }
    });
    await page.goto(`${origin}/?path=/story/box-quad--${id}`);
    const preview = (await (
      await page.waitForSelector('#storybook-preview-iframe')
    ).contentFrame())!;
    await preview.waitForSelector('#storybook-root input[type="range"]');
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const counts: Counts = { mutations: 0, replaceState: 0, events: [] };
      (globalThis as Record<string, unknown>)['__counts'] = counts;
      new MutationObserver((records) => {
        counts.mutations += records.length;
      }).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      const replace = history.replaceState.bind(history);
      history.replaceState = (...args) => {
        counts.replaceState += 1;
        replace(...args);
      };
      const channel = (globalThis as Record<string, unknown>)[
        '__STORYBOOK_ADDONS_CHANNEL__'
      ] as {
        emit(name: string, ...rest: unknown[]): void;
        handleEvent?(event: { type: string }): void;
      };
      const emit = channel.emit.bind(channel);
      channel.emit = (name, ...rest) => {
        counts.events.push(name);
        emit(name, ...rest);
      };
      const handle = channel.handleEvent?.bind(channel);
      if (handle) {
        channel.handleEvent = (event) => {
          counts.events.push(event.type);
          handle(event);
        };
      }
    });
    const take = (): Promise<Counts> =>
      page.evaluate(() => {
        const counts = (globalThis as Record<string, unknown>)[
          '__counts'
        ] as Counts;
        const copy = { ...counts, events: [...new Set(counts.events)] };
        Object.assign(counts, { mutations: 0, replaceState: 0, events: [] });
        return copy;
      });
    const show = (label: string, counts: Counts, extra = ''): void => {
      console.log(
        `  ${id.padEnd(14)} ${label.padEnd(34)} manager mutations ${counts.mutations}, replaceState ${counts.replaceState}, channel events [${counts.events.join(', ')}]${extra}`,
      );
    };
    const ranges = preview.locator('#storybook-root input[type="range"]');

    for (let index = 0; index < (await ranges.count()); index += 1) {
      const range = ranges.nth(index);
      const name = await range.getAttribute('name');
      const box = (await range.boundingBox())!;
      await page.mouse.move(box.x + 8, box.y + box.height / 2);
      // The pointer's arrival over the iframe is not the slider's doing.
      await page.waitForTimeout(300);
      await take();
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2, {
        steps: 40,
      });
      await page.mouse.up();
      await page.waitForTimeout(300);
      show(
        `${name} dragged`,
        await take(),
        `, ends at ${await range.inputValue()}`,
      );
    }

    // Keys that Storybook's manager binds, on a focused slider.
    const last = ranges.last();
    await last.focus();
    const url = page.url();
    for (const key of ['s', 'a', 'd', 'f', 't', '/', 'ArrowLeft']) {
      await page.keyboard.press(key);
    }
    await page.waitForTimeout(300);
    show(
      'shortcut keys on a slider',
      await take(),
      `, url unchanged: ${page.url() === url}`,
    );

    const values = (): Promise<string[]> =>
      ranges.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      );
    const before = await values();
    await page.evaluate(() => {
      (
        (globalThis as Record<string, unknown>)[
          '__STORYBOOK_ADDONS_CHANNEL__'
        ] as { emit(name: string, payload: unknown): void }
      ).emit('THEME_CHANGED', 'dark');
    });
    await page.waitForTimeout(400);
    console.log(
      `  ${id.padEnd(14)} theme switched: values kept ${String(before) === String(await values())}, accent ${await last.evaluate((input) => getComputedStyle(input).accentColor)}`,
    );
    if (shots) {
      await page.screenshot({
        path: `${shots}/${type.name()}-${id}-manager-dark.png`,
      });
    }

    // Before the control, whose own flood of arg changes raises WebKit's
    // replaceState limit.
    console.log(
      `  ${id.padEnd(14)} console errors and warnings: ${problems.length}${problems.length ? ` ${[...new Set(problems)].map((p) => p.slice(0, 160)).join(' | ')}` : ''}`,
    );

    await take();
    for (let index = 0; index < 40; index += 1) {
      await page.evaluate(
        ([storyId, value]) => {
          (
            (globalThis as Record<string, unknown>)[
              '__STORYBOOK_ADDONS_CHANNEL__'
            ] as { emit(name: string, payload: unknown): void }
          ).emit('updateStoryArgs', {
            storyId,
            updatedArgs: { rotation: value },
          });
          return new Promise((resolve) => {
            requestAnimationFrame(resolve);
          });
        },
        [`box-quad--${id}`, index] as const,
      );
    }
    await page.waitForTimeout(500);
    show('control: updateStoryArgs x 40', await take());
    await page.close();
  }

  await browser.close();
}

/**
 * Where the main thread's time goes while a box-quad story's arg changes
 * continuously, as when its range control is dragged.
 *
 * Each scenario changes _Live Demo_'s `rotation` 60 times, one change per
 * animation frame, and samples the renderer's one isolate with the CPU profiler.
 * The manager and the preview are same-origin frames of one renderer process,
 * so one profile holds both, and each sample is attributed by the URL of the
 * nearest script frame on its stack:
 *
 * - `manager`: `/sb-manager/` and `/sb-addons/`, the manager frame's bundles;
 * - `box-quad`: `packages/box-quad/src/`, the stories and the package's source;
 * - `preview`: any other script, which is the preview iframe's;
 * - `gc` and `program`: the collector, and native work outside any script frame,
 *   such as style, layout and paint.
 *
 * Scenarios:
 *
 * 1. `controls`: the manager page, with the pointer dragging the Controls
 *    panel's `rotation` range, which is what the owner did. `controls, sidebar
 *    hidden` does the same with `&nav=false` in the manager URL, and
 *    `in-story range` drags the story's own `input[type="range"][name="rotation"]`,
 *    on the same manager page.
 * 2. `channel, panel shown`: the manager page, with the manager emitting
 *    `updateStoryArgs` on its channel, the panel's own path, and no pointer.
 * 3. `channel, panel hidden` and `channel, sidebar hidden`: the same, with
 *    `&panel=false` or `&nav=false` in the manager URL.
 * 4. `preview only`: `iframe.html` alone, with the preview emitting
 *    `updateStoryArgs` on its own channel. No manager exists, so this is the
 *    cost of the args path inside the preview, and an upper bound for an in-story
 *    control that re-renders the story's React tree.
 * 5. `direct write`: `iframe.html` alone, with no arg change: the target's
 *    `transform` is written and box-quad's read and the overlay's redraw are
 *    repeated by hand, as an in-story control that skips React would do.
 *
 * A scenario whose range the story doesn't have is skipped, and so are 2 to 4
 * when the story no longer takes `rotation` as an arg. So the same script reads
 * _Live Demo_ before its controls move into the story and after.
 *
 * Each scenario also reports the frames the manager window and the preview
 * window produced during the 60 changes, the number of distinct transforms the
 * target was given, and the wall time the 60 changes took.
 *
 * Run from the repository root against a running Storybook dev server, such as
 * `aube exec just docs-dev`:
 * `node packages/box-quad/.plan/probes/storybook-demo/controls-cost.ts [origin]`.
 * The origin defaults to `http://127.0.0.1:6006`. A second argument names a
 * directory that receives each scenario's `.cpuprofile`. `MX_IN_STORY` names
 * another story for `in-story range`, such as a prototype.
 */
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chromium, type CDPSession, type Frame } from 'playwright';

const origin = process.argv[2] ?? 'http://127.0.0.1:6006';
const profiles = process.argv[3]
  ? pathToFileURL(`${process.argv[3]}/`)
  : undefined;
const STORY = 'box-quad--live-demo';
const CHANGES = 60;
// The story whose own range `in-story range` drags: _Live Demo_ once its
// controls are in the story, or another story named by `MX_IN_STORY`.
const IN_STORY = process.env['MX_IN_STORY'] ?? STORY;

type ProfileNode = Readonly<{
  id: number;
  parent?: number;
  children?: readonly number[];
  callFrame: Readonly<{ functionName: string; url: string }>;
}>;
type Profile = Readonly<{
  nodes: readonly ProfileNode[];
  samples: readonly number[];
  timeDeltas: readonly number[];
}>;

function classify(
  node: ProfileNode,
  parents: ReadonlyMap<number, ProfileNode>,
): string {
  const name = node.callFrame.functionName;

  if (name === '(idle)') {
    return 'idle';
  }

  if (name === '(garbage collector)') {
    return 'gc';
  }

  for (
    let current: ProfileNode | undefined = node;
    current;
    current = parents.get(current.id)
  ) {
    const { url } = current.callFrame;

    if (url.includes('/sb-manager/') || url.includes('/sb-addons/')) {
      return 'manager';
    }

    if (url.includes('/packages/box-quad/src/')) {
      return 'box-quad';
    }

    if (url) {
      return 'preview';
    }
  }

  return 'program';
}

/** Milliseconds of samples per class. */
function attribute(profile: Profile): Record<string, number> {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map<number, ProfileNode>();

  for (const node of profile.nodes) {
    for (const child of node.children ?? []) {
      parents.set(child, node);
    }
  }

  const totals: Record<string, number> = {};

  for (const [index, id] of profile.samples.entries()) {
    const key = classify(byId.get(id)!, parents);
    totals[key] =
      (totals[key] ?? 0) + (profile.timeDeltas[index + 1] ?? 0) / 1000;
  }

  return totals;
}

/** Counts animation frames in `frame`'s window until `stop()` is called. */
async function countFrames(frame: Frame): Promise<() => Promise<number>> {
  await frame.evaluate(() => {
    const state = { frames: 0, running: true };
    (globalThis as Record<string, unknown>)['__frames'] = state;
    const tick = (): void => {
      if (state.running) {
        state.frames += 1;
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });

  return () =>
    frame.evaluate(() => {
      const state = (globalThis as Record<string, unknown>)['__frames'] as {
        frames: number;
        running: boolean;
      };
      state.running = false;
      return state.frames;
    });
}

/** Counts the distinct transforms the preview's target is given. */
async function countUpdates(preview: Frame): Promise<() => Promise<number>> {
  await preview.evaluate(() => {
    const root = document.querySelector('#storybook-root')!;
    const seen = new Set<string>();
    const record = (): void => {
      const target = root.querySelector<HTMLElement>('[style*="skewX"]');

      if (target) {
        seen.add(target.style.transform);
      }
    };
    const observer = new MutationObserver(record);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true,
    });
    (globalThis as Record<string, unknown>)['__updates'] = () => {
      observer.disconnect();
      return seen.size;
    };
  });

  return () =>
    preview.evaluate(() =>
      ((globalThis as Record<string, unknown>)['__updates'] as () => number)(),
    );
}

function nextFrame(frame: Frame): Promise<void> {
  return frame.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      }),
  );
}

async function waitForStory(preview: Frame): Promise<void> {
  await preview.waitForSelector('#storybook-root [style*="skewX"]');
  await nextFrame(preview);
  await nextFrame(preview);
}

/** Waits until the preview's target shows `rotation`. */
async function waitForRotation(
  preview: Frame,
  rotation: number,
  timeout?: number,
): Promise<void> {
  await preview.waitForFunction(
    (value) =>
      // Null-safe: Storybook may replace the story's tree while it settles.
      document
        .querySelector<HTMLElement>('#storybook-root [style*="skewX"]')
        ?.style.transform.startsWith(`rotate(${value}deg)`),
    rotation,
    { timeout },
  );
}

type Reading = Readonly<{
  scenario: string;
  wallMs: number;
  managerFrames: number | undefined;
  previewFrames: number;
  updates: number;
  totals: Record<string, number>;
}>;

async function measure(
  session: CDPSession,
  scenario: string,
  manager: Frame | undefined,
  preview: Frame,
  change: (rotation: number) => Promise<void>,
  lastRotation: () => Promise<number>,
): Promise<Reading> {
  await session.send('Profiler.enable');
  await session.send('Profiler.setSamplingInterval', { interval: 100 });
  const stopManager = manager ? await countFrames(manager) : undefined;
  const stopPreview = await countFrames(preview);
  const stopUpdates = await countUpdates(preview);
  await session.send('Profiler.start');
  const start = performance.now();

  for (let index = 0; index < CHANGES; index += 1) {
    await change(index);
  }

  await waitForRotation(preview, await lastRotation());
  const wallMs = performance.now() - start;
  const { profile } = (await session.send('Profiler.stop')) as unknown as {
    profile: Profile;
  };
  if (profiles) {
    await writeFile(
      new URL(`${scenario.replaceAll(/\W+/g, '-')}.cpuprofile`, profiles),
      JSON.stringify(profile),
    );
  }

  const reading = {
    scenario,
    wallMs,
    managerFrames: stopManager ? await stopManager() : undefined,
    previewFrames: await stopPreview(),
    updates: await stopUpdates(),
    totals: attribute(profile),
  };
  await session.send('Profiler.disable');
  return reading;
}

/** Emits `updateStoryArgs` on the channel of `frame`'s window. */
function emitRotation(frame: Frame, rotation: number): Promise<void> {
  return frame.evaluate(
    ([storyId, value]) =>
      new Promise<void>((resolve) => {
        const channel = (globalThis as Record<string, unknown>)[
          '__STORYBOOK_ADDONS_CHANNEL__'
        ] as { emit(event: string, payload: unknown): void };
        channel.emit('updateStoryArgs', {
          storyId,
          updatedArgs: { rotation: value },
        });
        requestAnimationFrame(() => {
          resolve();
        });
      }),
    [STORY, rotation] as const,
  );
}

const browser = await chromium.launch();
const readings: Reading[] = [];

// 1. A range dragged with the pointer: the Controls panel's, with the sidebar
// shown and hidden, and one inside the story. A scenario whose range the story
// doesn't have is skipped.
for (const [scenario, story, query, inStory] of [
  ['controls', STORY, '', false],
  ['controls, sidebar hidden', STORY, '&nav=false', false],
  ['in-story range', IN_STORY, '', true],
] as const) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  await page.goto(`${origin}/?path=/story/${story}${query}`);
  const preview = (await (
    await page.waitForSelector('#storybook-preview-iframe')
  ).contentFrame())!;
  await waitForStory(preview);
  const range = await (inStory ? preview : page.mainFrame())
    .waitForSelector(
      inStory
        ? '#storybook-root input[type="range"][name="rotation"]'
        : 'input#control-rotation',
      { timeout: 5000 },
    )
    .catch(() => undefined);

  if (!range) {
    console.log(`${scenario}: skipped, the story has no such range`);
    await page.close();
    continue;
  }

  // In viewport coordinates, for a range in either frame.
  const box = (await range.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  // The range spans −55 to 55; drag from its left end, one step per change.
  const y = box.y + box.height / 2;
  const xAt = (index: number): number =>
    box.x + 8 + ((box.width - 16) * index) / (CHANGES - 1);
  await page.mouse.move(xAt(0), y);
  await page.mouse.down();
  await nextFrame(page.mainFrame());
  readings.push(
    await measure(
      session,
      scenario,
      page.mainFrame(),
      preview,
      async (index) => {
        await page.mouse.move(xAt(index), y);
        await nextFrame(page.mainFrame());
      },
      // Where the pointer left the range.
      () => range.evaluate((input: HTMLInputElement) => Number(input.value)),
    ),
  );
  await page.mouse.up();
  await page.close();
}

/**
 * Whether the story still takes `rotation` as an arg: one `updateStoryArgs`
 * must reach the target within two seconds. Once the controls are in the story,
 * it doesn't, and the scenarios that change the arg are skipped.
 */
async function takesRotationArg(
  emitter: Frame,
  preview: Frame,
): Promise<boolean> {
  await emitRotation(emitter, 0);
  return waitForRotation(preview, 0, 2000).then(
    () => true,
    () => false,
  );
}

// 2 and 3. The manager's channel, with the panel shown and hidden.
for (const [scenario, query] of [
  ['channel, panel shown', ''],
  ['channel, panel hidden', '&panel=false'],
  ['channel, sidebar hidden', '&nav=false'],
] as const) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  await page.goto(`${origin}/?path=/story/${STORY}${query}`);
  const preview = await (
    await page.waitForSelector('#storybook-preview-iframe')
  ).contentFrame();
  await waitForStory(preview!);

  if (!(await takesRotationArg(page.mainFrame(), preview!))) {
    console.log(`${scenario}: skipped, the story takes no rotation arg`);
    await page.close();
    continue;
  }

  const session = await page.context().newCDPSession(page);
  readings.push(
    await measure(
      session,
      scenario,
      page.mainFrame(),
      preview!,
      (index) => emitRotation(page.mainFrame(), index - 4),
      () => Promise.resolve(CHANGES - 5),
    ),
  );
  await page.close();
}

// 4. The preview alone, through its own channel.
{
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  await page.goto(`${origin}/iframe.html?id=${STORY}&viewMode=story`);
  const preview = page.mainFrame();
  await waitForStory(preview);
  const takesArg = await takesRotationArg(preview, preview);

  if (!takesArg) {
    console.log('preview only: skipped, the story takes no rotation arg');
  }

  const session = await page.context().newCDPSession(page);
  if (takesArg) {
    readings.push(
      await measure(
        session,
        'preview only',
        undefined,
        preview,
        (index) => emitRotation(preview, index - 4),
        () => Promise.resolve(CHANGES - 5),
      ),
    );
  }

  await page.close();
}

// 5. No arg change: the transform is written and the read repeated by hand.
{
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  await page.goto(`${origin}/iframe.html?id=${STORY}&viewMode=story`);
  const preview = page.mainFrame();
  await waitForStory(preview);
  await preview.evaluate(async () => {
    const { coordinates, projection } = (await import(
      // A dev server path, resolved by Vite.
      '/packages/box-quad/src/index.ts' as string
    )) as typeof import('../../../src/index.ts');
    const root = document.querySelector('#storybook-root')!;
    const target = root.querySelector<HTMLElement>('[style*="skewX"]')!;
    const stage = target.closest<HTMLElement>('[class*="stage"]')!;
    const polygon = root.querySelector('polygon')!;
    const source = new Float64Array(8);
    const relativeTo = new Float64Array(8);
    const quad = new Float64Array(8);
    (globalThis as Record<string, unknown>)['__write'] = (rotation: number) => {
      target.style.transform = `rotate(${rotation}deg) skewX(8deg)`;

      if (
        coordinates(target, source) &&
        coordinates(stage, relativeTo) &&
        projection(source, quad, relativeTo)
      ) {
        polygon.setAttribute(
          'points',
          `${quad[0]},${quad[1]} ${quad[2]},${quad[3]} ${quad[4]},${quad[5]} ${quad[6]},${quad[7]}`,
        );
      }
    };
  });
  const session = await page.context().newCDPSession(page);
  readings.push(
    await measure(
      session,
      'direct write',
      undefined,
      preview,
      (index) =>
        preview.evaluate(
          (rotation) =>
            new Promise<void>((resolve) => {
              (
                (globalThis as Record<string, unknown>)['__write'] as (
                  value: number,
                ) => void
              )(rotation);
              requestAnimationFrame(() => {
                resolve();
              });
            }),
          index - 4,
        ),
      () => Promise.resolve(CHANGES - 5),
    ),
  );
  await page.close();
}

const version = browser.version();
await browser.close();

const CLASSES = ['manager', 'preview', 'box-quad', 'gc', 'program', 'idle'];
console.log(
  `Chromium ${version}, ${CHANGES} changes of rotation, one per frame, against ${origin}`,
);
console.log(
  [
    'scenario',
    'wall ms',
    'manager frames',
    'preview frames',
    'updates',
    ...CLASSES.map((c) => `${c} ms`),
  ].join('\t'),
);

for (const reading of readings) {
  console.log(
    [
      reading.scenario,
      reading.wallMs.toFixed(0),
      reading.managerFrames ?? '-',
      reading.previewFrames,
      reading.updates,
      ...CLASSES.map((c) => (reading.totals[c] ?? 0).toFixed(1)),
    ].join('\t'),
  );
}

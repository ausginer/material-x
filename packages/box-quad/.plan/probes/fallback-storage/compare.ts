/* oxlint-disable no-await-in-loop, no-console -- a measurement script: serial, and it prints */
/**
 * Chromium comparison of `coordinates`' fallback storage: the base's `[]`
 * against `new Float64Array(5)` in `candidate.ts`, with and without `above`.
 *
 * Usage, from the repository root:
 *
 * ```sh
 * P=packages/box-quad/.plan/probes/fallback-storage
 * node $P/compare.ts <mode> <out.json> base=packages/box-quad/src/index.ts \
 *   base2=packages/box-quad/src/index.ts F=$P/candidate.ts
 * ```
 *
 * `<mode>` is `backing`, `allocation` or `timing`. **Run `timing` only under
 * an owner hold**: nothing else may load the machine while it runs.
 *
 * The first arm is the reference. The second must be the same source as the
 * first: it is the A/A arm, whose differences bound the noise. Each arm is
 * bundled separately with Rolldown, unminified, so the A/A arm is a distinct
 * module instance with its own feedback.
 *
 * Every page measures one scenario, so a scenario's feedback is its own. The
 * scenarios are `coordinates` without `above` at three depths, with `above`
 * alone, as drag's `lift` calls it, and with `above` after the same arm has
 * also run without `above`, so its inherited reads have seen both kinds of
 * storage. Each page warms every arm with `CALLS` calls of its scenario.
 *
 * - `backing`: one page. The sampling heap profiler reads the bytes per
 *   allocation of `[]` grown to five slots, of `new Float64Array(5)` and of
 *   `new Float64Array(16)`. `Runtime.getHeapUsage` reads the V8 heap and the
 *   array-buffer backing stores before and after `BACKING_COUNT` of each are
 *   retained. This shows whether a five-slot typed array's elements are on
 *   the V8 heap, where the profiler counts them.
 * - `allocation`: `ALLOCATION_PAGES` pages per scenario. In each, every arm
 *   gets its own window: a forced GC, then the CDP sampling heap profiler,
 *   with a 32-byte interval and objects collected by minor and major GC
 *   included, over `ALLOCATION_CALLS` calls. The reading is sampled bytes per
 *   call.
 * - `timing`: `TIMING_PAGES` pages per scenario. In each, every arm takes
 *   `SAMPLES` samples, the arm order rotating between samples. A sample is one
 *   `performance.now()` span over `CALLS` calls, in ns per call, and a page
 *   keeps each arm's median. The verdict per scenario and arm compares each
 *   page's median with the reference's on the same page. It is "faster" or
 *   "slower" when the difference has the same sign on at least six of seven
 *   pages and its median exceeds the largest A/A difference on any page, and
 *   "no difference shown" otherwise.
 */
import { writeFile } from 'node:fs/promises';
import { chromium, type CDPSession, type Page } from 'playwright';
import { rolldown } from 'rolldown';

const CALLS = 4000;
const SAMPLES = 9;
const TIMING_PAGES = 7;
const ALLOCATION_CALLS = 20000;
const ALLOCATION_PAGES = 3;
const BACKING_COUNT = 10000;

type Scenario = {
  readonly name: string;
  readonly depth: number;
  readonly above: boolean;
  readonly mixed: boolean;
};

const SCENARIOS: readonly Scenario[] = [
  { name: 'fallback, depth 2', depth: 0, above: false, mixed: false },
  { name: 'fallback, depth 14', depth: 12, above: false, mixed: false },
  { name: 'fallback, depth 32', depth: 30, above: false, mixed: false },
  { name: 'above, depth 14', depth: 12, above: true, mixed: false },
  {
    name: 'above after fallback, depth 14',
    depth: 12,
    above: true,
    mixed: true,
  },
];

const [mode, output, ...armArguments] = process.argv.slice(2);

if (mode !== 'backing' && mode !== 'allocation' && mode !== 'timing') {
  throw new Error('mode must be backing, allocation or timing');
}

const arms = armArguments.map((argument) => {
  const [name, path] = argument.split('=') as [string, string];

  return { name, path };
});
const names = arms.map(({ name }) => name);

async function bundle(name: string, path: string): Promise<string> {
  const build = await rolldown({ input: path, logLevel: 'silent' });
  const { output: chunks } = await build.generate({
    format: 'iife',
    name: `__arm_${name}`,
  });

  await build.close();
  return `${chunks[0].code}\n//# sourceURL=arm-${name}.js`;
}

const sources = await Promise.all(
  arms.map(({ name, path }) => bundle(name, path)),
);
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/chrome',
  headless: true,
});

/**
 * Defines, in the page, `__fixture(depth)`, which builds a chain of `depth`
 * transformed ancestors around a measured element, and `__prepare(...)`, which
 * builds a scenario and defines `__run(name, count)` over it. For `backing`,
 * `__maker(kind, count)` selects an allocation and defines `__churn(count)`,
 * which discards what it allocates, and `__keep(count)`, which retains it.
 */
const setup = `
globalThis.__fixture = (depth) => {
  document.body.replaceChildren();
  let parent = document.body;
  for (let level = 0; level < depth; level += 1) {
    const node = document.createElement('div');
    node.style.cssText = 'position:absolute;left:1px;top:1px;width:200px;height:200px;transform-origin:0 0;rotate:3deg;scale:1.01';
    parent.append(node);
    parent = node;
  }
  const element = document.createElement('div');
  element.style.cssText = 'position:absolute;left:2px;top:3px;width:20px;height:10px;box-sizing:border-box;transform-origin:0 0;rotate:-7deg';
  parent.append(element);
  return element;
};
globalThis.__prepare = (names, depth, above, mixed, calls) => {
  const element = globalThis.__fixture(depth);
  const space = [];
  const out = [];
  globalThis['__arm_' + names[0]].ancestry(element, space);
  const passed = above ? space : undefined;
  if (mixed) {
    for (const name of names) {
      const coordinates = globalThis['__arm_' + name].coordinates;
      for (let call = 0; call < calls; call += 1) coordinates(element, out);
    }
  }
  globalThis.__run = (name, count) => {
    const coordinates = globalThis['__arm_' + name].coordinates;
    let accepted = 0;
    for (let call = 0; call < count; call += 1) {
      accepted += coordinates(element, out, passed) ? 1 : 0;
    }
    if (accepted !== count) throw new Error('a call returned false');
  };
  for (const name of names) globalThis.__run(name, calls);
};
const makers = {
  'array, five slots': () => { const s = []; s[0] = 0.5; s[1] = 1.5; s[2] = 2.5; s[3] = 3.5; s[4] = 4.5; return s; },
  'Float64Array(5)': () => { const s = new Float64Array(5); s[0] = 0.5; return s; },
  'Float64Array(16)': () => { const s = new Float64Array(16); s[0] = 0.5; return s; },
};
globalThis.__maker = (kind, count) => {
  const make = makers[kind];
  const sink = [];
  globalThis.__churn = (n) => {
    for (let index = 0; index < n; index += 1) sink[index % 8] = make();
  };
  globalThis.__keep = (n) => {
    globalThis.__kept = n ? Array.from({ length: n }, make) : undefined;
  };
  globalThis.__churn(count);
};
`;

/** What `setup` defines in the page. */
type PageGlobals = {
  __prepare(
    names: readonly string[],
    depth: number,
    above: boolean,
    mixed: boolean,
    calls: number,
  ): void;
  __run(name: string, count: number): void;
  __maker(kind: string, count: number): void;
  __churn(count: number): void;
  __keep(count: number): void;
};

async function open(scenario: Scenario): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });

  await page.setContent('<!doctype html><html><body></body></html>');

  for (const content of sources) {
    await page.addScriptTag({ content });
  }

  await page.addScriptTag({ content: setup });
  await page.evaluate(
    ({ names, depth, above, mixed, calls }) =>
      (globalThis as unknown as PageGlobals).__prepare(
        names,
        depth,
        above,
        mixed,
        calls,
      ),
    { names, ...scenario, calls: CALLS },
  );
  return page;
}

function median(values: readonly number[]): number {
  const sorted = values.toSorted((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

type ProfileNode = {
  callFrame: { functionName: string; url: string };
  selfSize: number;
  children: ProfileNode[];
};

/** Runs `run` inside a sampling window and returns the sampled bytes. */
async function sampled(
  session: CDPSession,
  run: () => Promise<unknown>,
): Promise<{ total: number; byFunction: Record<string, number> }> {
  await session.send('HeapProfiler.collectGarbage');
  await session.send('HeapProfiler.startSampling', {
    samplingInterval: 32,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  await run();

  const { profile } = (await session.send(
    'HeapProfiler.stopSampling',
  )) as unknown as {
    profile: { head: ProfileNode };
  };
  const byFunction: Record<string, number> = {};
  let total = 0;
  const visit = (node: ProfileNode, path: string): void => {
    const frame = node.callFrame.functionName || '(anonymous)';
    const here = node.callFrame.url.startsWith('arm-')
      ? `${path}>${frame}`
      : path;

    total += node.selfSize;

    if (node.selfSize) {
      byFunction[here || frame] =
        (byFunction[here || frame] ?? 0) + node.selfSize;
    }

    for (const child of node.children) {
      visit(child, here);
    }
  };

  visit(profile.head, '');
  return { total, byFunction };
}

const result: {
  browser: string;
  mode: string;
  arms: Array<{ name: string; path: string }>;
  backing?: Record<string, unknown>;
  allocation?: Record<
    string,
    Record<
      string,
      Array<{ bytesPerCall: number; byFunctionPerCall: Record<string, number> }>
    >
  >;
  timing?: Record<string, Record<string, number[]>>;
  verdicts?: Record<string, Record<string, unknown>>;
} = {
  browser: browser.version(),
  mode,
  arms,
};

if (mode === 'backing') {
  const page = await browser.newPage();
  const session = await page.context().newCDPSession(page);
  const rows: Record<string, unknown> = {};

  await session.send('HeapProfiler.enable');

  await page.addScriptTag({ content: setup });

  for (const label of [
    'array, five slots',
    'Float64Array(5)',
    'Float64Array(16)',
  ]) {
    await page.evaluate(
      ({ label, count }) => {
        (globalThis as unknown as PageGlobals).__maker(label, count);
      },
      { label, count: BACKING_COUNT },
    );

    const window = await sampled(session, () =>
      page.evaluate((count) => {
        (globalThis as unknown as PageGlobals).__churn(count);
      }, ALLOCATION_CALLS),
    );

    await session.send('HeapProfiler.collectGarbage');
    const before = await session.send('Runtime.getHeapUsage');

    await page.evaluate((count) => {
      (globalThis as unknown as PageGlobals).__keep(count);
    }, BACKING_COUNT);
    await session.send('HeapProfiler.collectGarbage');
    const after = await session.send('Runtime.getHeapUsage');

    await page.evaluate(() => {
      (globalThis as unknown as PageGlobals).__keep(0);
    });
    rows[label] = {
      sampledBytesPerAllocation: window.total / ALLOCATION_CALLS,
      retainedHeapBytesEach: (after.usedSize - before.usedSize) / BACKING_COUNT,
      retainedBackingStoreBytesEach:
        ((after as { backingStorageSize?: number }).backingStorageSize! -
          (before as { backingStorageSize?: number }).backingStorageSize!) /
        BACKING_COUNT,
      before,
      after,
    };
  }

  result.backing = rows;
  await page.close();
} else if (mode === 'allocation') {
  const allocation: Record<
    string,
    Record<
      string,
      Array<{ bytesPerCall: number; byFunctionPerCall: Record<string, number> }>
    >
  > = {};

  for (let round = 0; round < ALLOCATION_PAGES; round += 1) {
    for (const scenario of SCENARIOS) {
      const page = await open(scenario);
      const session = await page.context().newCDPSession(page);

      await session.send('HeapProfiler.enable');

      for (const name of names) {
        const window = await sampled(session, () =>
          page.evaluate(
            ({ name, count }) => {
              (globalThis as unknown as PageGlobals).__run(name, count);
            },
            { name, count: ALLOCATION_CALLS },
          ),
        );

        ((allocation[scenario.name] ??= {})[name] ??= []).push({
          bytesPerCall: window.total / ALLOCATION_CALLS,
          byFunctionPerCall: Object.fromEntries(
            Object.entries(window.byFunction)
              .filter(([, bytes]) => bytes / ALLOCATION_CALLS >= 1)
              .map(([key, bytes]) => [key, bytes / ALLOCATION_CALLS]),
          ),
        });
      }

      await page.close();
    }
  }

  result.allocation = allocation;
} else {
  const timing: Record<string, Record<string, number[]>> = {};

  for (let round = 0; round < TIMING_PAGES; round += 1) {
    for (const scenario of SCENARIOS) {
      const page = await open(scenario);
      const medians = await page.evaluate(
        ({ names, calls, samples }) => {
          const page = globalThis as unknown as PageGlobals;
          const times: number[][] = names.map(() => []);

          for (let sample = 0; sample < samples; sample += 1) {
            for (let offset = 0; offset < names.length; offset += 1) {
              const index = (sample + offset) % names.length;
              const start = performance.now();

              page.__run(names[index]!, calls);
              times[index]!.push(((performance.now() - start) / calls) * 1e6);
            }
          }

          return times.map(
            (values) =>
              values.toSorted((x, y) => x - y)[Math.floor(values.length / 2)]!,
          );
        },
        { names, calls: CALLS, samples: SAMPLES },
      );

      for (const [index, name] of names.entries()) {
        ((timing[scenario.name] ??= {})[name] ??= []).push(medians[index]!);
      }

      await page.close();
    }
  }

  const verdicts: Record<string, Record<string, unknown>> = {};

  for (const scenario of SCENARIOS) {
    const rows = timing[scenario.name]!;
    const reference = rows[names[0]!]!;
    const bound = Math.max(
      ...rows[names[1]!]!.map((value, round) =>
        Math.abs(value - reference[round]!),
      ),
    );
    const needed = Math.ceil((TIMING_PAGES * 6) / 7);

    verdicts[scenario.name] = Object.fromEntries(
      names.slice(1).map((name) => {
        const differences = rows[name]!.map(
          (value, round) => value - reference[round]!,
        );
        const lower = differences.filter((difference) => difference < 0).length;
        const higher = differences.filter(
          (difference) => difference > 0,
        ).length;
        const middle = median(differences);
        const verdict =
          Math.abs(middle) > bound && lower >= needed
            ? 'faster'
            : Math.abs(middle) > bound && higher >= needed
              ? 'slower'
              : 'no difference shown';

        return [
          name,
          {
            referenceMedianNs: median(reference),
            medianNs: median(rows[name]!),
            medianDifferenceNs: middle,
            lower,
            higher,
            aaBoundNs: bound,
            verdict,
          },
        ];
      }),
    );
  }

  result.timing = timing;
  result.verdicts = verdicts;
}

await browser.close();
await writeFile(output!, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.verdicts ?? result.backing ?? '', null, 2));

if (result.allocation) {
  for (const [scenario, rows] of Object.entries(result.allocation)) {
    for (const [name, readings] of Object.entries(rows)) {
      console.log(
        scenario,
        name,
        readings.map(({ bytesPerCall }) => bytesPerCall.toFixed(1)).join(' '),
      );
    }
  }
}

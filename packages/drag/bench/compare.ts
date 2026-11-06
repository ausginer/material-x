/* oxlint-disable no-await-in-loop, no-console, no-template-curly-in-string -- a measurement script: serial, printing, and its injections are source text */
/* eslint-disable @typescript-eslint/strict-void-return -- a frame's promise and `promisify` take these callbacks as they are */
/**
 * Before/after cost in one browser process: drag2, the prototype, production, and
 * production again as the noise floor. Arms are interleaved and every run has a
 * fresh page. CDP metrics, so Chromium only and headless, with no real compositing
 * cost.
 *
 * `node bench/compare.ts [--rounds n] [--out file]` runs the comparison.
 * `node bench/compare.ts --prove [--out file]` injects a known cost into a scratch
 * copy of production, and exits non-zero unless the comparison flags each one.
 *
 * The rules are stated before running, in `RULES`, and `judge` applies them.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { type Browser, type CDPSession, chromium, type Page } from 'playwright';
import { rolldown } from 'rolldown';

const execFile = promisify(execFileCallback);
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BOX_QUAD = join(ROOT, '../box-quad/src/index.ts');
const PROTOTYPE_REVISION = '599684791';
const MOVES = 300;
const PRESSES = 100;
const CYCLES = 50;
const KEYS = 50;
const OPERATIONS = 200;
const ANIMATION_WAIT = 90;
const X = 140;
const Y0 = 40 + 40 * 2 + 20;
const ROWS = 9;

/** What the page's lab bundle installs. */
declare const lab: Readonly<{
  log: readonly string[];
  sortable(options: LabOptions): void;
  freeDrag(): void;
  noLift(): void;
  destroy(): Promise<void>;
}>;

type Metrics = Readonly<Record<string, number>>;
type Reading = Readonly<Record<string, number>>;

/** Lab source bundled into an IIFE, unminified so that functions keep their names. */
async function bundle(lab: string, sourceRoot: string): Promise<string> {
  const built = await rolldown({
    input: lab,
    platform: 'browser',
    resolve: { alias: { '@ydinjs/box-quad': BOX_QUAD } },
    transform: { define: { __DEV__: 'false' } },
    plugins: [
      {
        name: 'arm-source',
        resolveId(id) {
          return id.startsWith('../src/')
            ? join(sourceRoot, id.slice('../src/'.length))
            : null;
        },
      },
    ],
    onLog(level, log, handler) {
      if (log.code === 'UNRESOLVED_IMPORT') {
        throw new Error(`compare: ${log.message}`);
      }

      handler(level, log);
    },
  });

  try {
    const { output } = await built.generate({
      format: 'iife',
      name: 'labExports',
    });

    return output[0].code;
  } finally {
    await built.close();
  }
}

type PageContext = Readonly<{
  page: Page;
  cdp: CDPSession;
  metrics(): Promise<Metrics>;
}>;

async function openPage(browser: Browser, code: string): Promise<PageContext> {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  await page.setContent('<!doctype html><body style="margin:40px"></body>');
  await page.addScriptTag({ content: code });
  page.on('pageerror', (error) => {
    console.log(`page error: ${error.message}`);
  });

  const cdp = await page.context().newCDPSession(page);

  await cdp.send('Performance.enable');

  const metrics = async (): Promise<Metrics> =>
    Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map(
        ({ name, value }) => [name, value],
      ),
    );

  return { page, cdp, metrics };
}

const delta = (before: Metrics, after: Metrics, count: number): Reading => ({
  layouts: after['LayoutCount']! - before['LayoutCount']!,
  // Not judged. These say where a task-time difference went.
  layoutUs:
    ((after['LayoutDuration']! - before['LayoutDuration']!) * 1e6) / count,
  styleUs:
    ((after['RecalcStyleDuration']! - before['RecalcStyleDuration']!) * 1e6) /
    count,
  scriptUs:
    ((after['ScriptDuration']! - before['ScriptDuration']!) * 1e6) / count,
  taskUs: ((after['TaskDuration']! - before['TaskDuration']!) * 1e6) / count,
});

type LabOptions = Readonly<{
  count: number;
  cached: boolean;
  landed: boolean;
  refocus: boolean;
}>;

const mount = (page: Page, options: LabOptions): Promise<void> =>
  page.evaluate((opts) => {
    lab.sortable(opts);
  }, options);

async function grabAndCross(page: Page): Promise<void> {
  await page.mouse.move(X, Y0);
  await page.mouse.down();
  await page.mouse.move(X, Y0 + 12, { steps: 2 });
  await page.mouse.move(X, Y0 + 20);
  await page.waitForTimeout(50);
}

const movePhase = (i: number): number =>
  Y0 + 20 + Math.abs(((i / 60) % 2) - 1) * ROWS * 40;

type Scenario = Readonly<{
  id: string;
  /** The rule stated before running, in the handoff's terms. */
  rule: 'exact-and-floor' | 'floor' | 'report' | 'retained' | 'bytes';
  arms: 'sortable' | 'free-drag' | 'no-lift' | 'all';
  run(context: PageContext, arm: string): Promise<Reading>;
}>;

function movesScenario(count: number): Scenario {
  return {
    id: `300 moves, one frame each, ${count} items`,
    rule: 'exact-and-floor',
    arms: 'sortable',
    async run({ page, metrics }) {
      await mount(page, { count, cached: true, landed: true, refocus: false });
      await grabAndCross(page);

      const before = await metrics();

      for (let i = 0; i < MOVES; i += 1) {
        await page.mouse.move(X, movePhase(i));
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }

      const after = await metrics();

      await page.mouse.up();
      return delta(before, after, MOVES);
    },
  };
}

type HeapNode = Readonly<{
  callFrame: Readonly<{ functionName: string; scriptId: string }>;
  selfSize: number;
  children: readonly HeapNode[];
}>;

/** Bytes per move by function, with no harness `evaluate` during the run. */
async function samplingProfile(
  context: PageContext,
  moves: (i: number) => Promise<void>,
): Promise<Reading> {
  const { cdp } = context;

  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', {
    samplingInterval: 64,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });

  for (let i = 0; i < MOVES; i += 1) {
    await moves(i);
  }

  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  const bytes = new Map<string, number>();
  // A built-in such as `push` has no script, and its bytes belong to its caller.
  // Counted under its own name, the kernel's allocation would escape the rule.
  const walk = (node: HeapNode, caller: string): void => {
    const name =
      node.callFrame.scriptId === '0' && caller
        ? caller
        : node.callFrame.functionName || '(anonymous)';

    bytes.set(name, (bytes.get(name) ?? 0) + node.selfSize);
    node.children.forEach((child) => {
      walk(child, name);
    });
  };

  walk(profile.head, '');
  return Object.fromEntries(
    [...bytes]
      .map(([name, size]) => [name, Math.round(size / MOVES)] as const)
      .filter(([, size]) => size > 0),
  );
}

const SCENARIOS: readonly Scenario[] = [
  movesScenario(20),
  movesScenario(2000),
  {
    id: 'bytes per move by function, 20 items',
    rule: 'bytes',
    arms: 'sortable',
    async run(context) {
      const { page } = context;

      await mount(page, {
        count: 20,
        cached: true,
        landed: true,
        refocus: false,
      });
      await grabAndCross(page);

      const reading = await samplingProfile(context, async (i) => {
        await page.mouse.move(X, movePhase(i));
        await page.waitForTimeout(16);
      });

      await page.mouse.up();
      return reading;
    },
  },
  ...[20, 2000].flatMap((count) =>
    [false, true].map((cached): Scenario => ({
      id: `press and release below the threshold, ${count} items, ${cached ? 'cached array' : '[...root.children]'}`,
      rule: 'report',
      arms: 'sortable',
      async run({ page, metrics }) {
        await mount(page, { count, cached, landed: false, refocus: false });
        await page.mouse.move(X, Y0);
        await page.waitForTimeout(30);

        const before = await metrics();

        for (let i = 0; i < PRESSES; i += 1) {
          await page.mouse.down();
          await page.mouse.up();
        }

        const after = await metrics();

        return delta(before, after, PRESSES);
      },
    })),
  ),
  ...[20, 2000].flatMap((count) =>
    [false, true].map((landed): Scenario => ({
      id: `50 activate-and-drop cycles, ${count} items, ${landed ? 'with' : 'no'} landing`,
      rule: 'exact-and-floor',
      arms: 'sortable',
      async run({ page, metrics }, arm) {
        await mount(page, {
          count,
          cached: true,
          landed,
          // Only production restores focus itself, and a press focuses a row.
          refocus: !arm.startsWith('production'),
        });
        await page.waitForTimeout(30);

        const before = await metrics();

        for (let i = 0; i < CYCLES; i += 1) {
          await page.mouse.move(X, Y0);
          await page.mouse.down();
          await page.mouse.move(X, Y0 + 12, { steps: 2 });
          await page.mouse.move(X, Y0 + 45);
          await page.evaluate(() => new Promise(requestAnimationFrame));
          await page.mouse.up();

          // A press during a row animation can hit the gap it is closing, and drag2
          // refuses a press until its landing ends. Node's timer adds nothing to the
          // page's own metrics.
          await page.waitForTimeout(ANIMATION_WAIT);
        }

        const after = await metrics();
        const ended = await page.evaluate(() => lab.log.length);

        if (ended !== CYCLES) {
          throw new Error(
            `${arm}: ${ended} of ${CYCLES} cycles ended: ${JSON.stringify(await page.evaluate(() => lab.log.slice(0, 6)))}`,
          );
        }

        return delta(before, after, CYCLES);
      },
    })),
  ),
  ...[20, 2000].map((count): Scenario => ({
    id: `50 keyboard reorders, ${count} items, with focus restoration`,
    rule: 'exact-and-floor',
    arms: 'sortable',
    async run({ page, metrics }, arm) {
      await mount(page, {
        count,
        cached: true,
        landed: false,
        // Only production restores focus itself.
        refocus: !arm.startsWith('production'),
      });
      await page.evaluate(() => {
        document.querySelector<HTMLElement>('#i3')!.focus();
      });

      const before = await metrics();

      for (let i = 0; i < KEYS; i += 1) {
        await page.keyboard.press(i % 2 === 0 ? 'ArrowDown' : 'ArrowUp');
      }

      const after = await metrics();
      const ended = await page.evaluate(() => lab.log.length);

      if (ended !== KEYS) {
        throw new Error(`${ended} of ${KEYS} keyboard reorders ended`);
      }

      return delta(before, after, KEYS);
    },
  })),
  ...[OPERATIONS, 0].map((operations): Scenario => ({
    id: `${operations} operations, then destroy: retained heap against an empty page`,
    rule: 'retained',
    arms: 'sortable',
    async run({ page, cdp, metrics }) {
      const heap = async (): Promise<number> => {
        await cdp.send('HeapProfiler.collectGarbage');
        await page.waitForTimeout(50);
        await cdp.send('HeapProfiler.collectGarbage');
        return (await metrics())['JSHeapUsedSize']!;
      };
      const empty = await heap();

      await mount(page, {
        count: 20,
        cached: true,
        landed: true,
        refocus: false,
      });

      for (let i = 0; i < operations; i += 1) {
        await page.mouse.move(X, Y0);
        await page.mouse.down();
        await page.mouse.move(X, Y0 + 12, { steps: 2 });
        await page.mouse.move(X, Y0 + 45);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        await page.mouse.up();
        await page.waitForTimeout(ANIMATION_WAIT);
      }

      await page.evaluate(async () => {
        await lab.destroy();
      });
      await page.waitForTimeout(300);
      await page.mouse.move(800, 600);
      await page.waitForTimeout(50);

      return { retainedBytes: (await heap()) - empty };
    },
  })),
  {
    id: 'free drag, 300 moves, one frame each',
    rule: 'exact-and-floor',
    arms: 'free-drag',
    async run({ page, metrics }) {
      await page.evaluate(() => {
        lab.freeDrag();
      });
      await page.mouse.move(100, 60);
      await page.mouse.down();
      await page.mouse.move(100, 80, { steps: 2 });
      await page.waitForTimeout(50);

      const before = await metrics();

      for (let i = 0; i < MOVES; i += 1) {
        await page.mouse.move(100 + (i % 200), 80 + (i % 100));
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }

      const after = await metrics();

      await page.mouse.up();
      return delta(before, after, MOVES);
    },
  },
  {
    id: 'draggable no-lift, move: script',
    rule: 'report',
    arms: 'no-lift',
    async run({ page, metrics }) {
      await page.evaluate(() => {
        lab.noLift();
      });
      await page.mouse.move(100, 60);
      await page.mouse.down();
      await page.mouse.move(100, 80, { steps: 2 });
      await page.waitForTimeout(50);

      const before = await metrics();

      for (let i = 0; i < MOVES; i += 1) {
        await page.mouse.move(100 + (i % 200), 80 + (i % 100));
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }

      const after = await metrics();

      await page.mouse.up();
      return delta(before, after, MOVES);
    },
  },
  {
    id: 'draggable no-lift, move: bytes per move by function',
    rule: 'bytes',
    arms: 'no-lift',
    async run(context) {
      const { page } = context;

      await page.evaluate(() => {
        lab.noLift();
      });
      await page.mouse.move(100, 60);
      await page.mouse.down();
      await page.mouse.move(100, 80, { steps: 2 });
      await page.waitForTimeout(50);

      const reading = await samplingProfile(context, async (i) => {
        await page.mouse.move(100 + (i % 200), 80 + (i % 100));
        await page.waitForTimeout(16);
      });

      await page.mouse.up();
      return reading;
    },
  },
];

const median = (values: readonly number[]): number =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]!;

const spread = (values: readonly number[]): number =>
  Math.max(...values) - Math.min(...values);

/** The kernel's methods are private, so their names start with `#`, except these. */
const isKernelFunction = (name: string): boolean =>
  name.startsWith('#') || name === 'requestStep' || name === 'requestCancel';

type ArmReadings = Readonly<Record<string, readonly Reading[]>>;
export type Verdict = Readonly<{
  against: string;
  measure: string;
  result: string;
}>;

/**
 * - **Layouts, exact:** production at or below each before arm.
 * - **Script and task:** a difference within the control's spread is no difference,
 *   and above it production is slower.
 * - **Bytes:** only the lift's CSS string may appear from the kernel and the lift.
 * - **Retained:** no growth beyond the control's spread.
 */
export function judge(
  rule: Scenario['rule'],
  arms: ArmReadings,
  after = 'production',
  control = 'control',
  against: readonly string[] = ['drag2', 'prototype'],
): readonly Verdict[] {
  const verdicts: Verdict[] = [];
  const of = (arm: string, key: string): number[] =>
    (arms[arm] ?? []).map((reading) => reading[key] ?? 0);

  if (rule === 'bytes') {
    for (const reading of arms[after] ?? []) {
      for (const [name, bytes] of Object.entries(reading)) {
        if (isKernelFunction(name) && bytes >= 16) {
          verdicts.push({
            against: 'rule',
            measure: name,
            result: `FLAG ${bytes} B per move`,
          });
        }
      }
    }

    return verdicts;
  }

  for (const before of against) {
    if (!arms[before]) {
      continue;
    }

    if (rule === 'retained') {
      const difference =
        median(of(after, 'retainedBytes')) -
        median(of(before, 'retainedBytes'));
      const floor = spread(of(control, 'retainedBytes'));

      verdicts.push({
        against: before,
        measure: 'retainedBytes',
        result: `${difference > floor ? 'FLAG slower' : difference < -floor ? 'less' : 'no difference'}: ${Math.round(difference)} B, floor ${Math.round(floor)} B`,
      });
      continue;
    }

    if (rule === 'exact-and-floor') {
      const layouts = median(of(after, 'layouts'));
      const beforeLayouts = median(of(before, 'layouts'));

      verdicts.push({
        against: before,
        measure: 'layouts',
        result: `${layouts > beforeLayouts ? 'FLAG more' : 'at or below'}: ${layouts} against ${beforeLayouts}`,
      });
    }

    for (const key of ['scriptUs', 'taskUs']) {
      const difference = median(of(after, key)) - median(of(before, key));
      const floor = spread(of(control, key));
      const label =
        difference > floor
          ? 'FLAG slower'
          : difference < -floor
            ? 'faster'
            : 'no difference';

      verdicts.push({
        against: before,
        measure: key,
        result: `${label}: ${Math.round(difference)} µs, floor ${Math.round(floor)} µs`,
      });
    }
  }

  return verdicts;
}

function applicableArms(
  scenario: Scenario,
  all: Readonly<Record<string, string>>,
  noLift: string,
): Record<string, string> {
  if (scenario.arms === 'no-lift') {
    return { production: noLift, control: noLift };
  }

  return { ...all };
}

async function runScenarios(
  browser: Browser,
  scenarios: readonly Scenario[],
  arms: Readonly<Record<string, string>>,
  noLift: string,
  rounds: number,
): Promise<Record<string, Record<string, Reading[]>>> {
  const raw: Record<string, Record<string, Reading[]>> = {};

  for (let round = 0; round < rounds; round += 1) {
    for (const scenario of scenarios) {
      const armsHere = applicableArms(scenario, arms, noLift);
      const names = Object.keys(armsHere);
      // A different arm goes first each round, so no arm always runs on a cold cache.
      const order = names.map((_, i) => names[(i + round) % names.length]!);

      for (const arm of order) {
        const context = await openPage(browser, armsHere[arm]!);

        try {
          const reading = await scenario.run(context, arm);

          ((raw[scenario.id] ??= {})[arm] ??= []).push(reading);
        } finally {
          await context.page.close();
        }
      }

      console.log(`round ${round + 1}/${rounds}: ${scenario.id}`);
    }
  }

  return raw;
}

function summarize(
  raw: Record<string, Record<string, Reading[]>>,
  scenarios: readonly Scenario[],
  after?: string,
  against?: readonly string[],
) {
  return scenarios
    .filter((scenario) => raw[scenario.id])
    .map((scenario) => {
      const arms = raw[scenario.id]!;
      const medians = Object.fromEntries(
        Object.entries(arms).map(([arm, readings]) => [
          arm,
          Object.fromEntries(
            [...new Set(readings.flatMap((reading) => Object.keys(reading)))]
              .map((key) => {
                const values = readings.map((reading) => reading[key] ?? 0);

                return [
                  key,
                  {
                    median: Math.round(median(values)),
                    min: Math.round(Math.min(...values)),
                    max: Math.round(Math.max(...values)),
                  },
                ];
              })
              .filter(
                ([, value]) =>
                  scenario.rule !== 'bytes' ||
                  (value as { median: number }).median > 0,
              ),
          ),
        ]),
      );

      return {
        scenario: scenario.id,
        rule: scenario.rule,
        medians,
        verdicts: judge(scenario.rule, arms, after, 'control', against),
      };
    });
}

/** Each entry: a text patch on a scratch copy of production, and the row that must flag it. */
const INJECTIONS: ReadonlyArray<
  Readonly<{
    name: string;
    file: string;
    find: string;
    replace: string;
    scenario: string;
    expect: RegExp;
  }>
> = [
  {
    name: 'one forced layout per move',
    file: 'sortable.ts',
    find: 'drag.translate(drag.x - drag.originX, drag.y - drag.originY);\n      drag.state.frame!.schedule();',
    replace:
      'root.style.minHeight = `${drag.y}px`;\n      void root.offsetHeight;\n      drag.translate(drag.x - drag.originX, drag.y - drag.originY);\n      drag.state.frame!.schedule();',
    scenario: '300 moves, one frame each, 20 items',
    expect: /FLAG more/u,
  },
  {
    name: 'one O(n) walk per move',
    file: 'sortable.ts',
    find: 'drag.translate(drag.x - drag.originX, drag.y - drag.originY);\n      drag.state.frame!.schedule();',
    replace:
      'for (let i = 0; i < 3; i += 1) { void [...config.items()].map((row) => row.id).join(); }\n      drag.translate(drag.x - drag.originX, drag.y - drag.originY);\n      drag.state.frame!.schedule();',
    scenario: '300 moves, one frame each, 2000 items',
    expect: /FLAG slower/u,
  },
  {
    name: '1 KB allocated per move',
    file: 'draggable.ts',
    find: 'view.x = event.clientX;\n    view.y = event.clientY;\n\n    if (session.phase === ACTIVE) {',
    replace:
      '(globalThis as Record<string, unknown>)["__kept"] = new Array(256).fill(session);\n    view.x = event.clientX;\n    view.y = event.clientY;\n\n    if (session.phase === ACTIVE) {',
    scenario: 'bytes per move by function, 20 items',
    expect: /FLAG/u,
  },
  {
    name: 'one entry on the step list per frame',
    file: 'draggable.ts',
    find: 'this.#enter(this.#runStep, step);',
    replace:
      'this.#steps.push(step);\n      this.#enter(NOOP as never, null as never);',
    scenario: 'bytes per move by function, 20 items',
    expect: /FLAG/u,
  },
  {
    name: 'an item retained after destruction',
    file: 'sortable.ts',
    find: 'start(drag) {\n      config.onStart?.(drag.item);',
    replace:
      "start(drag) {\n      ((globalThis as Record<string, unknown[]>)['__retained'] ??= []).push(drag, new Array(4096).fill(drag.item), drag.state);\n      config.onStart?.(drag.item);",
    scenario:
      '200 operations, then destroy: retained heap against an empty page',
    expect: /FLAG slower/u,
  },
];

async function prove(
  browser: Browser,
  productionCode: string,
  noLift: string,
  out?: string,
): Promise<boolean> {
  const results: unknown[] = [];
  let allFlagged = true;

  for (const injection of INJECTIONS) {
    const directory = await mkdtemp(join(tmpdir(), 'drag-inject-'));

    try {
      await cp(join(ROOT, 'src'), join(directory, 'src'), { recursive: true });

      const file = join(directory, 'src', injection.file);
      const source = await readFile(file, 'utf8');

      if (!source.includes(injection.find)) {
        throw new Error(`injection does not apply: ${injection.name}`);
      }

      await writeFile(file, source.replace(injection.find, injection.replace));

      const injected = await bundle(
        join(ROOT, 'bench/lab.ts'),
        join(directory, 'src'),
      );
      const scenario = SCENARIOS.find(
        (each) => each.id === injection.scenario,
      )!;
      const raw = await runScenarios(
        browser,
        [scenario],
        { injected, production: productionCode, control: productionCode },
        noLift,
        3,
      );
      const arms = raw[scenario.id]!;
      const verdicts = judge(scenario.rule, arms, 'injected', 'control', [
        'production',
      ]);
      const flagged = verdicts.some((verdict) =>
        injection.expect.test(verdict.result),
      );

      allFlagged &&= flagged;
      results.push({
        injection: injection.name,
        scenario: scenario.id,
        flagged,
        verdicts,
        raw: arms,
      });
      console.log(
        `${flagged ? 'flagged' : 'NOT FLAGGED'}: ${injection.name} ${JSON.stringify(verdicts)}`,
      );
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }

  if (out) {
    await writeFile(out, `${JSON.stringify(results, null, 1)}\n`);
  }

  return allFlagged;
}

const { values } = parseArgs({
  options: {
    rounds: { type: 'string', default: '7' },
    out: { type: 'string' },
    prove: { type: 'boolean', default: false },
    only: { type: 'string' },
  },
});
/** The comparison itself, printed and written to `--out`. */
async function compareArms(
  browser: Browser,
  bundles: Readonly<
    Record<'drag2' | 'prototype' | 'production' | 'noLift', string>
  >,
): Promise<void> {
  const { drag2, prototype, production, noLift } = bundles;
  const scenarios = values.only
    ? SCENARIOS.filter((each) => each.id.includes(values.only!))
    : SCENARIOS;
  const raw = await runScenarios(
    browser,
    scenarios,
    { drag2, prototype, production, control: production },
    noLift,
    Number(values.rounds),
  );
  const summary = summarize(raw, scenarios);

  if (values.out) {
    await writeFile(
      values.out,
      `${JSON.stringify({ chrome: browser.version(), rounds: Number(values.rounds), moves: MOVES, summary, raw }, null, 1)}\n`,
    );
  }

  for (const row of summary) {
    console.log(`\n${row.scenario}`);

    for (const verdict of row.verdicts) {
      console.log(`  ${verdict.against} ${verdict.measure}: ${verdict.result}`);
    }
  }
}

const scratch = await mkdtemp(join(tmpdir(), 'drag-compare-'));

try {
  const archive = join(scratch, 'tree.tar');

  await execFile(
    'git',
    [
      'archive',
      PROTOTYPE_REVISION,
      '--output',
      archive,
      'packages/drag/prototype/src',
    ],
    { cwd: join(ROOT, '../..') },
  );
  await execFile('tar', ['-xf', archive, '-C', scratch]);

  const production = await bundle(
    join(ROOT, 'bench/lab.ts'),
    join(ROOT, 'src'),
  );
  const prototype = await bundle(
    join(ROOT, 'bench/lab.ts'),
    join(scratch, 'packages/drag/prototype/src'),
  );
  const drag2 = await bundle(
    join(ROOT, 'bench/lab-drag2.ts'),
    join(ROOT, 'src'),
  );
  const noLift = await bundle(
    join(ROOT, 'bench/lab-no-lift.ts'),
    join(ROOT, 'src'),
  );
  const browser = await chromium.launch({
    executablePath: process.env['CHROME_EXECUTABLE'] ?? '/usr/local/bin/chrome',
  });

  try {
    if (values.prove) {
      process.exitCode = (await prove(browser, production, noLift, values.out))
        ? 0
        : 1;
    } else {
      await compareArms(browser, { drag2, prototype, production, noLift });
    }
  } finally {
    await browser.close();
  }
} finally {
  await rm(scratch, { force: true, recursive: true });
}

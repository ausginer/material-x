/* oxlint-disable no-await-in-loop, no-console, no-template-curly-in-string -- a measurement script: serial, printing, and its injections are source text */
/* eslint-disable @typescript-eslint/strict-void-return -- a frame's promise and `promisify` take these callbacks as they are */
/**
 * Before/after cost in one browser process: drag2, the prototype, production, and
 * production again as the noise floor. Arms are interleaved and every run has a
 * fresh page. CDP metrics, so Chromium only and headless, with no real compositing
 * cost.
 *
 * `node bench/compare.ts [--rounds n] [--rows validation] [--only text] [--out file]`
 * runs the comparison. `--before <revision>` replaces drag2 and the prototype with
 * production's `src` at that revision.
 * `node bench/compare.ts --prove [--out file]` injects a known cost into a scratch
 * copy of production, and exits non-zero unless the comparison flags each one, or
 * if the control flags against itself. With `--only a|b`, only the injections whose
 * name contains one of the texts run, and the A/A pass runs in full. Every selected
 * injection is applied before a browser starts, and the first one whose text does
 * not occur exactly once, or whose patch leaves the bundle unchanged, ends the run.
 * `--prove --dry` stops after that check: it launches no browser, and exits 0 when
 * every selected injection applies.
 * `node bench/compare.ts --rejudge <file>` applies `judge` to a recorded run.
 * `node bench/compare.ts --profile --only <row>` profiles one run of a row per arm,
 * and `--attribute` gives the retained row's growth per constructor per arm.
 *
 * The rules are stated before running, in `judge`'s comment.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { type Browser, type CDPSession, chromium, type Page } from 'playwright';
import { rolldown } from 'rolldown';
import { retainedObjects } from './heap-snapshot.ts';

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

/** The 0-based line at which a module's code starts in a bundle, and its key. */
type ModuleStart = Readonly<{ line: number; key: string }>;
type Bundle = Readonly<{ code: string; modules: readonly ModuleStart[] }>;

/**
 * Lab source bundled into an IIFE, unminified so that functions keep their names.
 * The bundler writes a line `// <path from the working directory>` where each
 * module starts. A module's key is its path under `sourceRoot`, such as
 * `kernel/session.ts`, so that every arm built from this package's source keys a
 * module alike. Any other module is keyed by its path from the package, such as
 * `bench/lab.ts`.
 */
async function bundle(lab: string, sourceRoot: string): Promise<Bundle> {
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

    const [chunk] = output;
    const ids = new Set(chunk.moduleIds);
    const modules: ModuleStart[] = [];

    chunk.code.split('\n').forEach((text, line) => {
      const marker = /^\t\/\/ (\S+)$/u.exec(text)?.[1];
      const path = marker && resolve(marker);

      if (path && ids.has(path)) {
        const key = relative(sourceRoot, path);

        modules.push({
          line,
          key: key.startsWith('..') ? relative(ROOT, path) : key,
        });
      }
    });

    return { code: chunk.code, modules };
  } finally {
    await built.close();
  }
}

/** The key of the module whose code holds `line`, or `null` before the first one. */
function moduleAt(
  modules: readonly ModuleStart[],
  line: number,
): string | null {
  let found: string | null = null;

  for (const start of modules) {
    if (start.line > line) {
      break;
    }

    found = start.key;
  }

  return found;
}

interface PageContext {
  readonly browser: Browser;
  readonly arm: Arm;
  readonly page: Page;
  readonly cdp: CDPSession;
  readonly metrics: () => Promise<Metrics>;
}

/** One arm: its lab bundle, and whether its library restores focus itself. */
type Arm = Bundle & Readonly<{ restoresFocus: boolean }>;

async function openPage(browser: Browser, arm: Arm): Promise<PageContext> {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  await page.setContent('<!doctype html><body style="margin:40px"></body>');
  await page.addScriptTag({ content: arm.code });
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

  return { browser, arm, page, cdp, metrics };
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

interface Scenario {
  readonly id: string;
  /** The rule stated before running, in the handoff's terms. */
  readonly rule: 'exact-and-floor' | 'floor' | 'report' | 'retained' | 'bytes';
  readonly arms: 'sortable' | 'free-drag' | 'no-lift' | 'all';
  run(context: PageContext): Promise<Reading>;
}

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
  callFrame: Readonly<{
    functionName: string;
    scriptId: string;
    lineNumber: number;
  }>;
  selfSize: number;
  children: readonly HeapNode[];
}>;

/**
 * Bytes per move by function, with no harness `evaluate` during the run. A frame
 * in the lab bundle is keyed `<module>:<function>`, such as
 * `kernel/session.ts:#move`.
 */
async function samplingProfile(
  context: PageContext,
  moves: (i: number) => Promise<void>,
): Promise<Reading> {
  const { cdp, arm } = context;

  // A sampled frame of an inline script has no url, so the lab bundle's script is
  // found from one of its functions, before sampling starts.
  const { result } = await cdp.send('Runtime.evaluate', {
    expression:
      "Object.values(lab).find((value) => typeof value === 'function')",
  });
  const { internalProperties } = await cdp.send('Runtime.getProperties', {
    objectId: result.objectId!,
    ownProperties: true,
  });
  const labScript = (
    internalProperties?.find(({ name }) => name === '[[FunctionLocation]]')
      ?.value?.value as { scriptId: string } | undefined
  )?.scriptId;

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
    const { scriptId, lineNumber, functionName } = node.callFrame;
    const module =
      scriptId === labScript ? moduleAt(arm.modules, lineNumber) : null;
    const name =
      scriptId === '0' && caller
        ? caller
        : `${module ? `${module}:` : ''}${functionName || '(anonymous)'}`;

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

/**
 * Mounts a 20-item sortable, runs `operations` landed cycles, destroys it and reads
 * the retained JavaScript objects after forced GC, with `JSHeapUsedSize` beside
 * them for continuity.
 */
async function operateAndDestroy(
  { page, cdp, metrics }: PageContext,
  operations: number,
): Promise<
  Readonly<{
    objects: number;
    heap: number;
    byName: Readonly<Record<string, number>>;
  }>
> {
  await mount(page, { count: 20, cached: true, landed: true, refocus: false });

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

  const { bytes, byName } = await retainedObjects(cdp);

  return {
    objects: bytes,
    heap: (await metrics())['JSHeapUsedSize']!,
    byName,
  };
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
      async run({ page, metrics, arm }) {
        await mount(page, {
          count,
          cached: true,
          landed,
          // A press focuses a row. An arm whose library does not restore focus
          // gets the consumer's repair.
          refocus: !arm.restoresFocus,
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
            `${ended} of ${CYCLES} cycles ended: ${JSON.stringify(await page.evaluate(() => lab.log.slice(0, 6)))}`,
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
    async run({ page, metrics, arm }) {
      await mount(page, {
        count,
        cached: true,
        landed: false,
        refocus: !arm.restoresFocus,
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
  {
    id: `${OPERATIONS} operations, then destroy: retained JavaScript objects`,
    rule: 'retained',
    arms: 'sortable',
    async run(context) {
      const empty = await openPage(context.browser, context.arm);
      let zero: Awaited<ReturnType<typeof operateAndDestroy>>;

      try {
        zero = await operateAndDestroy(empty, 0);
      } finally {
        await empty.page.close();
      }

      const operated = await operateAndDestroy(context, OPERATIONS);

      return {
        growth: operated.objects - zero.objects,
        objects0: zero.objects,
        objects200: operated.objects,
        heap0: zero.heap,
        heap200: operated.heap,
      };
    },
  },
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

/** The middle value, or the mean of the two middle values. */
const median = (values: readonly number[]): number => {
  const sorted = values.toSorted((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

/** A bytes key in a kernel module: one under `kernel/`, or `draggable.ts`. */
const isKernelKey = (key: string): boolean =>
  key.startsWith('kernel/') || key.startsWith('draggable.ts:');

/** Whether a bytes key names its module, as `samplingProfile` keys a lab frame. */
const hasModule = (key: string): boolean => /^[^:]+\.[cm]?[jt]sx?:/u.test(key);

type ArmReadings = Readonly<Record<string, readonly Reading[]>>;
export type Verdict = Readonly<{
  against: string;
  measure: string;
  result: string;
  /** Per round, production minus the before arm. */
  differences?: readonly number[];
  /** Per round, the A/A difference the bound comes from. */
  aa?: readonly number[];
  higher?: number;
  lower?: number;
  median?: number;
  bound?: number;
}>;

/** Rounds in which a timing difference must have one sign: 6 of 7. */
const timingSigns = (rounds: number): number => Math.ceil((rounds * 6) / 7);

/**
 * One paired comparison. `differences` and `aa` are per round. A verdict needs the
 * sign in `required` rounds **and** a median beyond the largest absolute A/A
 * difference. Anything else is no difference shown, which is not equality.
 */
function pairedVerdict(
  against: string,
  measure: string,
  differences: readonly number[],
  aa: readonly number[],
  required: number,
  words: readonly [more: string, less: string],
  unit: string,
): Verdict {
  const higher = differences.filter((value) => value > 0).length;
  const lower = differences.filter((value) => value < 0).length;
  const middle = median(differences);
  const bound = Math.max(...aa.map((value) => Math.abs(value)));
  const label =
    higher >= required && middle > bound
      ? `FLAG ${words[0]}`
      : lower >= required && -middle > bound
        ? words[1]
        : 'no difference shown';

  return {
    against,
    measure,
    result: `${label}: higher in ${higher} of ${differences.length}, median ${Math.round(middle)} ${unit}, A/A bound ${Math.round(bound)} ${unit}`,
    differences: differences.map((value) => Math.round(value)),
    aa: aa.map((value) => Math.round(value)),
    higher,
    lower,
    median: Math.round(middle),
    bound: Math.round(bound),
  };
}

/**
 * The rules, fixed before running (remediation handoff, step 6):
 *
 * - **Layouts, exact:** production's median at or below each before arm's.
 * - **Script and task, paired:** per round, production minus the before arm, and
 *   production minus control. Slower when higher in at least 6 of 7 rounds and the
 *   median difference exceeds the largest absolute A/A difference. Faster is the
 *   mirror.
 * - **Retained objects, over 3 rounds:** an arm's growth is its 200-operation sum
 *   minus its 0-operation sum in the same round. Per round, production's growth
 *   minus the before arm's, and control's minus production's. Retains more when
 *   positive in every round and the median exceeds the largest absolute A/A
 *   difference, which may be 0 B. Retains less is the mirror.
 * - **Bytes, production only:** a function in a kernel module, under `kernel/` or
 *   `draggable.ts`, flags at 16 B per move or more. No other module is judged.
 *
 * Readings are paired by index, which is the round.
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
        if (isKernelKey(name) && bytes >= 16) {
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

  const minus = (a: readonly number[], b: readonly number[]): number[] =>
    a.map((value, round) => value - b[round]!);

  for (const before of against) {
    if (!arms[before]) {
      continue;
    }

    if (rule === 'retained') {
      const growth = of(after, 'growth');

      verdicts.push(
        pairedVerdict(
          before,
          'retained objects',
          minus(growth, of(before, 'growth')),
          minus(of(control, 'growth'), growth),
          growth.length,
          ['retains more', 'retains less'],
          'B',
        ),
      );
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
      const timed = of(after, key);

      verdicts.push(
        pairedVerdict(
          before,
          key,
          minus(timed, of(before, key)),
          minus(timed, of(control, key)),
          timingSigns(timed.length),
          ['slower', 'faster'],
          'µs',
        ),
      );
    }
  }

  return verdicts;
}

function applicableArms(
  scenario: Scenario,
  all: Readonly<Record<string, Arm>>,
  noLift: Arm,
): Record<string, Arm> {
  if (scenario.arms === 'no-lift') {
    return { production: noLift, control: noLift };
  }

  return { ...all };
}

/** Rounds for a rule: the retained rule is fixed at 3, everything else at `rounds`. */
const roundsFor = (scenario: Scenario, rounds: number): number =>
  scenario.rule === 'retained' ? Math.min(rounds, 3) : rounds;

async function runScenarios(
  browser: Browser,
  scenarios: readonly Scenario[],
  arms: Readonly<Record<string, Arm>>,
  noLift: Arm,
  rounds: number,
): Promise<Record<string, Record<string, Reading[]>>> {
  const raw: Record<string, Record<string, Reading[]>> = {};

  for (let round = 0; round < rounds; round += 1) {
    for (const scenario of scenarios) {
      if (round >= roundsFor(scenario, rounds)) {
        continue;
      }

      const armsHere = applicableArms(scenario, arms, noLift);
      const names = Object.keys(armsHere);
      // A different arm goes first each round, so no arm always runs on a cold cache.
      const order = names.map((_, i) => names[(i + round) % names.length]!);

      for (const arm of order) {
        const context = await openPage(browser, armsHere[arm]!);

        try {
          const reading = await scenario.run(context);

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
  raw: Readonly<Record<string, ArmReadings>>,
  rules: Readonly<Record<string, Scenario['rule']>>,
  against: readonly string[],
) {
  return Object.keys(rules)
    .filter((id) => raw[id])
    .map((id) => {
      const arms = raw[id]!;
      const rule = rules[id]!;
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
                  rule !== 'bytes' || (value as { median: number }).median > 0,
              ),
          ),
        ]),
      );

      return {
        scenario: id,
        rule,
        medians,
        verdicts: judge(rule, arms, 'production', 'control', against),
      };
    });
}

/** The rows the remediation's validation reads, and only those. */
const VALIDATION_ROWS: readonly string[] = [
  '50 activate-and-drop cycles, 20 items, no landing',
  '50 activate-and-drop cycles, 20 items, with landing',
  '50 activate-and-drop cycles, 2000 items, no landing',
  '50 activate-and-drop cycles, 2000 items, with landing',
  '50 keyboard reorders, 20 items, with focus restoration',
  '300 moves, one frame each, 20 items',
  '300 moves, one frame each, 2000 items',
  'press and release below the threshold, 20 items, cached array',
  'press and release below the threshold, 20 items, [...root.children]',
  'press and release below the threshold, 2000 items, cached array',
  'press and release below the threshold, 2000 items, [...root.children]',
  `${OPERATIONS} operations, then destroy: retained JavaScript objects`,
];

/**
 * A text patch on a scratch copy of production's `src`. `file` is the module's path
 * under `src`, and `find` must occur in it exactly once. `declaration` is appended
 * to the module, for a module-level variable the patch stores into.
 */
type Injection = Readonly<{
  name: string;
  file: string;
  find: string;
  replace: string;
  declaration?: string;
}>;

/** Each entry: an injection, and the row that must flag it. */
const INJECTIONS: ReadonlyArray<
  Injection & Readonly<{ scenario: string; expect: RegExp }>
> = [
  {
    name: 'about 1 ms of script per cycle, at the drop',
    file: 'sortable/operation.ts',
    find: 'const request = buildReorderRequest(',
    replace:
      'const until = performance.now() + 1;\n    while (performance.now() < until) {}\n    const request = buildReorderRequest(',
    scenario: '50 activate-and-drop cycles, 20 items, no landing',
    expect: /FLAG slower/u,
  },
  {
    name: 'one object of about 1 KB retained per operation past destruction',
    file: 'sortable/operation.ts',
    find: 'start(): void {\n    this.#behavior.config.onStart?.(this.#query.item);',
    replace:
      "start(): void {\n    ((globalThis as Record<string, unknown[]>)['__retained'] ??= []).push(new Array(126).fill(0.5));\n    this.#behavior.config.onStart?.(this.#query.item);",
    scenario: `${OPERATIONS} operations, then destroy: retained JavaScript objects`,
    expect: /FLAG retains more/u,
  },
  {
    // The list's height changes with every move, so the read lays it out again.
    name: 'one forced layout per move',
    file: 'sortable/operation.ts',
    find: 'this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);',
    replace:
      'drag.item.parentElement!.style.minHeight = `${drag.y}px`;\n    void drag.item.parentElement!.offsetHeight;\n    this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);',
    scenario: '300 moves, one frame each, 20 items',
    expect: /FLAG more/u,
  },
  {
    name: 'one O(n) walk per move',
    file: 'sortable/operation.ts',
    find: 'this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);',
    replace:
      'for (let i = 0; i < 3; i += 1) { void [...this.#query.snapshot.items].map((row) => row.id).join(); }\n    this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);',
    scenario: '300 moves, one frame each, 2000 items',
    expect: /FLAG slower/u,
  },
  {
    // `#up` writes the same two lines, so the comment that follows them here is
    // part of the text.
    name: '1 KB allocated per move',
    file: 'kernel/session.ts',
    find: 'this.#drag.x = event.clientX;\n    this.#drag.y = event.clientY;\n\n    // Motion is open',
    replace:
      "(globalThis as Record<string, unknown>)['__kept'] = new Array(256).fill(this);\n    this.#drag.x = event.clientX;\n    this.#drag.y = event.clientY;\n\n    // Motion is open",
    scenario: 'bytes per move by function, 20 items',
    expect: /FLAG/u,
  },
  {
    name: 'one entry on the step list per frame',
    file: 'kernel/gesture.ts',
    find: 'this.enter(\n        step,\n        this.#session ? this.#session.stepTarget() : null,\n        receiver,\n      );',
    replace: 'this.#steps.add(step, receiver);\n      this.enter();',
    scenario: 'bytes per move by function, 20 items',
    expect: /FLAG/u,
  },
  {
    // Every sample and every frame enters a pass, and the module is the kernel's
    // whatever the function's name.
    name: 'an array of four numbers per sample, in Gesture.enter',
    file: 'kernel/gesture.ts',
    find: 'this.#running = true;',
    replace:
      'enterCount += 1;\n    enterWitness = [enterCount, enterCount, enterCount, enterCount];\n    this.#running = true;',
    declaration: 'let enterCount = 0;\nlet enterWitness: number[] = [];\n',
    scenario: 'bytes per move by function, 20 items',
    expect: /FLAG/u,
  },
];

/** The selected entries: those whose name contains one of `only`'s `|`-separated texts. */
const select = <Entry extends Readonly<{ name: string }>>(
  entries: readonly Entry[],
  only: string | undefined,
): Entry[] =>
  entries.filter(
    (each) => !only || only.split('|').some((part) => each.name.includes(part)),
  );

/**
 * Production's lab bundle from a copy of `src` with `injection` applied. Throws
 * unless `find` occurs exactly once and the patch changes the bundle. The
 * comparison is with the copy's own bundle before the patch, because a bundle of
 * another directory differs by its module paths.
 */
async function applyInjection(injection: Injection): Promise<Arm> {
  const { name, file, find, replace, declaration = '' } = injection;
  const directory = await mkdtemp(join(tmpdir(), 'drag-inject-'));

  try {
    const source = join(directory, 'src');

    await cp(join(ROOT, 'src'), source, { recursive: true });

    const path = join(source, file);
    const text = await readFile(path, 'utf8');

    if (text.split(find).length !== 2) {
      throw new Error(`injection does not apply in ${file}: ${find}`);
    }

    const lab = join(ROOT, 'bench/lab.ts');
    const unpatched = (await bundle(lab, source)).code;

    await writeFile(path, text.replace(find, () => replace) + declaration);

    const patched = await bundle(lab, source);

    if (patched.code === unpatched) {
      throw new Error(
        `injection does not apply: ${name} leaves the bundle unchanged`,
      );
    }

    return { ...patched, restoresFocus: true };
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

/** Every entry applied, in order, before any browser starts. The first failure throws. */
async function applyAll<Entry extends Injection>(
  entries: readonly Entry[],
): Promise<Array<Readonly<{ entry: Entry; arm: Arm }>>> {
  const applied: Array<Readonly<{ entry: Entry; arm: Arm }>> = [];

  for (const entry of entries) {
    applied.push({ entry, arm: await applyInjection(entry) });
    console.log(`applies: ${entry.name}`);
  }

  return applied;
}

/**
 * Each injection runs as `production` against unpatched production, with a second
 * copy of the injected bundle as its control, and must flag. Then the control runs
 * against itself on every validation row: three copies of one bundle, none of which
 * may flag.
 */
async function prove(
  browser: Browser,
  injections: ReadonlyArray<
    Readonly<{ entry: (typeof INJECTIONS)[number]; arm: Arm }>
  >,
  production: Arm,
  noLift: Arm,
  rounds: number,
  out?: string,
): Promise<boolean> {
  const results: unknown[] = [];
  let proven = true;

  for (const { entry: injection, arm: injected } of injections) {
    const scenario = SCENARIOS.find((each) => each.id === injection.scenario)!;
    const scenarioRounds = scenario.rule === 'bytes' ? 3 : rounds;
    const raw = await runScenarios(
      browser,
      [scenario],
      { production: injected, base: production, control: injected },
      noLift,
      scenarioRounds,
    );
    const arms = raw[scenario.id]!;
    const verdicts = judge(scenario.rule, arms, 'production', 'control', [
      'base',
    ]);
    const flagged = verdicts.some((verdict) =>
      injection.expect.test(verdict.result),
    );

    proven &&= flagged;
    results.push({
      injection: injection.name,
      scenario: scenario.id,
      flagged,
      verdicts,
      raw: arms,
    });
    console.log(
      `${flagged ? 'flagged' : 'NOT FLAGGED'}: ${injection.name} ${JSON.stringify(verdicts.map((verdict) => verdict.result))}`,
    );
  }

  const scenarios = SCENARIOS.filter((each) =>
    VALIDATION_ROWS.includes(each.id),
  );
  const raw = await runScenarios(
    browser,
    scenarios,
    { production, base: production, control: production },
    noLift,
    rounds,
  );

  for (const scenario of scenarios) {
    const verdicts = judge(
      scenario.rule,
      raw[scenario.id]!,
      'production',
      'control',
      ['base'],
    );
    const flagged = verdicts.filter((verdict) =>
      verdict.result.startsWith('FLAG'),
    );

    proven &&= flagged.length === 0;
    results.push({
      aa: scenario.id,
      flagged: flagged.length > 0,
      verdicts,
      raw: raw[scenario.id],
    });
    console.log(
      `${flagged.length === 0 ? 'quiet' : 'A/A FLAGGED'}: ${scenario.id} ${JSON.stringify(verdicts.map((verdict) => verdict.result))}`,
    );
  }

  if (out) {
    await writeFile(out, `${JSON.stringify(results, null, 1)}\n`);
  }

  return proven;
}

type ProfileNode = Readonly<{
  id: number;
  callFrame: Readonly<{
    functionName: string;
    url: string;
    lineNumber: number;
  }>;
}>;

/**
 * One run of `scenario` under the CPU profiler, as self time in µs per function.
 * The whole run is profiled, including the page's setup.
 */
async function profileOnce(
  browser: Browser,
  scenario: Scenario,
  arm: Arm,
): Promise<Record<string, number>> {
  const context = await openPage(browser, arm);

  try {
    const { cdp } = context;

    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 50 });
    await cdp.send('Profiler.start');
    await scenario.run(context);

    const { profile } = (await cdp.send('Profiler.stop')) as unknown as {
      profile: {
        nodes: readonly ProfileNode[];
        samples: readonly number[];
        timeDeltas: readonly number[];
      };
    };
    const self = new Map<number, number>();

    profile.samples.forEach((id, i) => {
      self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0));
    });

    const byName: Record<string, number> = {};

    for (const node of profile.nodes) {
      const time = self.get(node.id);

      if (time) {
        const { functionName, lineNumber } = node.callFrame;
        const name = functionName || `(anonymous, line ${lineNumber})`;

        byName[name] = (byName[name] ?? 0) + time;
      }
    }

    return byName;
  } finally {
    await context.page.close();
  }
}

/** Growth in retained self bytes per constructor, 200 operations against 0. */
async function attributeRetained(
  browser: Browser,
  arm: Arm,
): Promise<Record<string, number>> {
  const run = async (operations: number) => {
    const context = await openPage(browser, arm);

    try {
      return (await operateAndDestroy(context, operations)).byName;
    } finally {
      await context.page.close();
    }
  };
  const zero = await run(0);
  const operated = await run(OPERATIONS);
  const growth: Record<string, number> = {};

  for (const name of new Set([
    ...Object.keys(zero),
    ...Object.keys(operated),
  ])) {
    const change = (operated[name] ?? 0) - (zero[name] ?? 0);

    if (change !== 0) {
      growth[name] = change;
    }
  }

  return growth;
}

const { values } = parseArgs({
  options: {
    rounds: { type: 'string', default: '7' },
    out: { type: 'string' },
    prove: { type: 'boolean', default: false },
    only: { type: 'string' },
    rows: { type: 'string' },
    before: { type: 'string' },
    rejudge: { type: 'string' },
    profile: { type: 'boolean', default: false },
    attribute: { type: 'boolean', default: false },
    dry: { type: 'boolean', default: false },
  },
});

function print(summary: ReturnType<typeof summarize>): void {
  for (const row of summary) {
    console.log(`\n${row.scenario}`);

    for (const verdict of row.verdicts) {
      console.log(`  ${verdict.against} ${verdict.measure}: ${verdict.result}`);
    }
  }
}

/** The comparison itself, printed and written to `--out`. */
async function compareArms(
  browser: Browser,
  arms: Readonly<Record<string, Arm>>,
  noLift: Arm,
): Promise<void> {
  const scenarios = SCENARIOS.filter(
    (each) =>
      (values.rows !== 'validation' || VALIDATION_ROWS.includes(each.id)) &&
      (!values.only || each.id.includes(values.only)),
  );
  const raw = await runScenarios(
    browser,
    scenarios,
    arms,
    noLift,
    Number(values.rounds),
  );
  const against = Object.keys(arms).filter(
    (arm) => arm !== 'production' && arm !== 'control',
  );
  const summary = summarize(
    raw,
    Object.fromEntries(scenarios.map((each) => [each.id, each.rule])),
    against,
  );

  if (values.out) {
    await writeFile(
      values.out,
      `${JSON.stringify({ chrome: browser.version(), rounds: Number(values.rounds), moves: MOVES, arms: Object.keys(arms), before: values.before ?? null, summary, raw }, null, 1)}\n`,
    );
  }

  print(summary);
}

/** Production's `src` at `revision`, extracted under `scratch`. */
async function archivedSource(
  scratch: string,
  revision: string,
  path: string,
): Promise<string> {
  const archive = join(scratch, `${revision}.tar`);
  const target = join(scratch, revision);

  await execFile('git', ['archive', revision, '--output', archive, path], {
    cwd: join(ROOT, '../..'),
  });
  await execFile('mkdir', ['-p', target]);
  await execFile('tar', ['-xf', archive, '-C', target]);
  return join(target, path);
}

/** The two before arms: drag2's lab, and the lab on the prototype's `src`. */
async function beforeArms(
  scratch: string,
  lab: string,
): Promise<Readonly<{ drag2: Arm; prototype: Arm }>> {
  return {
    drag2: {
      ...(await bundle(join(ROOT, 'bench/lab-drag2.ts'), join(ROOT, 'src'))),
      restoresFocus: false,
    },
    prototype: {
      ...(await bundle(
        lab,
        await archivedSource(
          scratch,
          PROTOTYPE_REVISION,
          'packages/drag/prototype/src',
        ),
      )),
      restoresFocus: false,
    },
  };
}

/** `--profile` or `--attribute`: one diagnostic reading per arm, printed and written. */
async function diagnose(
  browser: Browser,
  arms: Readonly<Record<string, Arm>>,
): Promise<void> {
  const scenario = SCENARIOS.find((each) =>
    each.id.includes(values.only ?? '\u0000'),
  );
  const result: Record<string, Record<string, number>> = {};

  for (const [name, arm] of Object.entries(arms)) {
    result[name] = values.attribute
      ? await attributeRetained(browser, arm)
      : await profileOnce(browser, scenario!, arm);
    console.log(
      `${name}: ${JSON.stringify(
        Object.entries(result[name])
          .toSorted((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
          .slice(0, 25),
      )}`,
    );
  }

  if (values.out) {
    await writeFile(values.out, `${JSON.stringify(result, null, 1)}\n`);
  }
}

/** Every mode that launches a browser. */
async function run(
  injections: ReadonlyArray<
    Readonly<{ entry: (typeof INJECTIONS)[number]; arm: Arm }>
  >,
): Promise<void> {
  const scratch = await mkdtemp(join(tmpdir(), 'drag-compare-'));

  try {
    const lab = join(ROOT, 'bench/lab.ts');
    const production: Arm = {
      ...(await bundle(lab, join(ROOT, 'src'))),
      restoresFocus: true,
    };
    const noLift: Arm = {
      ...(await bundle(join(ROOT, 'bench/lab-no-lift.ts'), join(ROOT, 'src'))),
      restoresFocus: true,
    };
    const browser = await chromium.launch({
      executablePath:
        process.env['CHROME_EXECUTABLE'] ?? '/usr/local/bin/chrome',
    });

    try {
      if (values.prove) {
        process.exitCode = (await prove(
          browser,
          injections,
          production,
          noLift,
          Number(values.rounds),
          values.out,
        ))
          ? 0
          : 1;
      } else if (values.profile || values.attribute) {
        await diagnose(browser, {
          ...(await beforeArms(scratch, lab)),
          production,
        });
      } else if (values.before) {
        const before: Arm = {
          ...(await bundle(
            lab,
            await archivedSource(scratch, values.before, 'packages/drag/src'),
          )),
          restoresFocus: true,
        };

        await compareArms(
          browser,
          { before, production, control: production },
          noLift,
        );
      } else {
        const { drag2, prototype } = await beforeArms(scratch, lab);

        await compareArms(
          browser,
          { drag2, prototype, production, control: production },
          noLift,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await rm(scratch, { force: true, recursive: true });
  }
}

if (values.rejudge) {
  // A recorded run: its own rules and arms, judged by the current `judge`.
  const recorded = JSON.parse(await readFile(values.rejudge, 'utf8')) as {
    summary: ReadonlyArray<{ scenario: string; rule: Scenario['rule'] }>;
    raw: Record<string, ArmReadings>;
  };
  // The retained rule reads per-round growth, which a recorded absolute heap does
  // not carry. The bytes rule selects by module, which a recording keyed by
  // function name alone does not carry. Such rows keep their recorded verdicts.
  const rules = Object.fromEntries(
    recorded.summary
      .filter((row) => {
        const kept =
          row.rule === 'bytes'
            ? Object.values(recorded.raw[row.scenario] ?? {}).some((readings) =>
                readings.some((reading) =>
                  Object.keys(reading).some(hasModule),
                ),
              )
            : row.rule !== 'retained';

        if (!kept) {
          console.log(
            `not judged, the recording cannot carry its rule: ${row.scenario}`,
          );
        }

        return kept;
      })
      .map((row) => [row.scenario, row.rule]),
  );
  const summary = summarize(recorded.raw, rules, ['drag2', 'prototype']);

  if (values.out) {
    await writeFile(values.out, `${JSON.stringify(summary, null, 1)}\n`);
  }

  print(summary);
} else {
  const injections = values.prove
    ? await applyAll(select(INJECTIONS, values.only))
    : [];

  if (values.dry) {
    console.log(`${injections.length} applied, no browser launched`);
  } else {
    await run(injections);
  }
}

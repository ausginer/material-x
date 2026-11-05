/**
 * Protocol M-2″'s decision rule, computed once from the raw file after the last
 * round:
 *
 * ```sh
 * node bench/m2pp/rule.ts <raw.jsonl>
 * ```
 *
 * Every threshold here is the protocol's, fixed before its first round. The
 * functions are exported so `tests/perf/m2pp-rule.node.test.ts` can pin them on
 * made-up data, which is the only data they meet before that one computation.
 */
/* oxlint-disable no-console -- this script's output is its report */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export type Reading = Readonly<{
  f: number;
  b: number;
  a: number;
  extra: number;
}>;
export type Figure = Readonly<{
  count: number;
  kind: string;
  e1: number;
  e2: number;
  warmups: readonly Reading[];
  readings: readonly Reading[];
}>;
export type Verdict = 'regression' | 'no regression' | 'inconclusive';
export type Paired = Readonly<{
  verdict: Verdict;
  n: number;
  k: number;
  p: number;
  m: number;
  lowest: number;
  highest: number;
}>;

export const KINDS: readonly string[] = ['sortable', 'mixed', 'free'];
const COUNTS = [100, 1000];
const WARMUP = 3;
const HEAP_RUNS = 5;
const FIELDS = 4;
const LOW_BYTES = 2;
const LOW_SHARE_AT_1000 = 0.01;
const PROBE_FIGURES = 36;
const CLASS_SHARE = 0.8;
const PREDICTED_LOW = 3;
const CONTINUITY: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  base: { sortable: 3701, mixed: 3277, free: 2714 },
  candidate: { sortable: 3625, mixed: 3239, free: 2708 },
};
const RETAINED = { tie: 1, regression: 0.01, clear: 0.05 } as const;
const ALLOCATION = { tie: 0.05, regression: 0.0005, clear: 0.0025 } as const;
const INJECTED_LOW = 3;
const INJECTED_HIGH = 5;
const SAME_TREE_MEDIAN = 1;
const T_ALPHA = 0.01;

/** `r` per allocation cell, shipped then DEV: step 6's tip range width. */
export const ALLOCATION_R: Readonly<Record<string, readonly [number, number]>> =
  {
    'sortable sample': [1.0, 0.9],
    'free sample bare': [3.6, 0.8],
    'free sample bounds(element)': [4.6, 5.4],
    'free sample bounds(thunk)': [0.9, 0.2],
    'free sample onMove': [0.3, 0.2],
    'committed move moving': [62, 59],
    'committed move still': [10, 9],
    'free drop': [42, 15],
    'sortable drop': [34, 39],
    'free moveTo': [7.7, 1.0],
  };
const CHANGED_FUNCTION =
  /^kernel\/kernel\.ts:(?:.*\.)?(?:ArmedController|channel|#arm|deliverUnlessApplied|reportToSpec|report)$/u;

export function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function choose(n: number, k: number): number {
  let result = 1;

  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - k + i)) / i;
  }

  return result;
}

/** Exact one-sided sign test: `Σ_{j=k}^{n} C(n, j) / 2^n`. */
export function signTest(n: number, k: number): number {
  if (n === 0) {
    return 1;
  }

  let sum = 0;

  for (let j = k; j <= n; j += 1) {
    sum += choose(n, j);
  }

  return sum / 2 ** n;
}

export function pairedRule(
  differences: readonly number[],
  thresholds: Readonly<{
    tie: number;
    regression: number;
    clear: number;
  }> = RETAINED,
  allowance = 0,
): Paired {
  const untied = differences.filter((d) => Math.abs(d) >= thresholds.tie);
  const n = untied.length;
  const k = untied.filter((d) => d > 0).length;
  const p = signTest(n, k);
  const m = n === 0 ? 0 : median(untied);
  let verdict: Verdict = 'inconclusive';

  if (p < thresholds.regression) {
    verdict = 'regression';
  } else if (p >= thresholds.clear && m <= allowance) {
    verdict = 'no regression';
  }

  return {
    verdict,
    n,
    k,
    p,
    m,
    lowest: Math.min(...differences),
    highest: Math.max(...differences),
  };
}

/** Two-sided Fisher exact test on `[[a, b], [c, d]]`. */
export function fisherTwoSided(
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  const row = a + b;
  const column = a + c;
  const total = a + b + c + d;
  const probability = (x: number): number =>
    (choose(row, x) * choose(total - row, column - x)) / choose(total, column);
  const observed = probability(a);
  let sum = 0;

  for (
    let x = Math.max(0, column - (total - row));
    x <= Math.min(row, column);
    x += 1
  ) {
    const p = probability(x);

    if (p <= observed * (1 + 1e-7)) {
      sum += p;
    }
  }

  return Math.min(sum, 1);
}

export type LowClass = 'high-B' | 'low-A' | 'unclassed';

/** Classes the low reading at `index` against its run's other four. */
export function classify(
  readings: readonly Reading[],
  index: number,
  deficit: number,
): LowClass {
  const others = readings.filter((_, i) => i !== index);
  const reading = readings[index]!;

  if (reading.b - median(others.map(({ b }) => b)) >= deficit / 2) {
    return 'high-B';
  }

  return median(others.map(({ a }) => a)) - reading.a >= deficit / 2
    ? 'low-A'
    : 'unclassed';
}

export type Gates = Readonly<{ v0: boolean; v1: boolean; v2: boolean }>;
export type Conditions = Readonly<{
  gates: Gates;
  /** `R` on `E1` in G, at every population and count. */
  e1: readonly Verdict[];
  /** `R` on `E1` in G at 1000 controllers: the tip's range lies above base's. */
  rangeAbove: boolean;
  /** `R` on `E2` in G, at every population and count. */
  e2: readonly Verdict[];
  L: number;
  literalMisses: number;
  tP: number;
}>;
export type Outcome = 'A' | 'B' | 'C' | 'D' | 'unmapped';

/**
 * §26.6's table. `unmapped` is the one combination it does not name, a range
 * above the baseline's at 1000 with nothing else wrong, which is not outcome A
 * and goes to the architect with the figures.
 */
export function outcomeOf(conditions: Conditions): Outcome {
  const { gates, e1, rangeAbove, e2, L, literalMisses, tP } = conditions;

  if (!gates.v0 || !gates.v1 || !gates.v2) {
    return 'D';
  }

  if (e1.includes('regression')) {
    return 'B';
  }

  if (
    e1.includes('inconclusive') ||
    e2.includes('regression') ||
    (L === 0 && literalMisses > 0) ||
    tP < T_ALPHA
  ) {
    return 'C';
  }

  return rangeAbove ? 'unmapped' : 'A';
}

export type AllocationOutcome = 'a1' | 'a2' | 'a3';

export function allocationOutcome(
  verdicts: readonly Verdict[],
  attributedBytes: number,
): AllocationOutcome {
  if (verdicts.includes('regression')) {
    return 'a2';
  }

  return verdicts.includes('inconclusive') || attributedBytes > 0 ? 'a3' : 'a1';
}

type Ledger = Readonly<{ count: number; readings: readonly number[] }>;
type Cell = Readonly<{
  label: string;
  per: number;
  libraryTotal: number;
  harness: number;
  other: number;
  library: Readonly<Record<string, number>>;
}>;
type RawRun = Readonly<{
  id: string;
  block: number;
  set: string;
  round: number;
  arm: string;
  tree: string;
  mode: string;
  project: string;
  ok: boolean;
  load: readonly [number, number];
  ledgers?: readonly Ledger[];
  cells?: readonly Cell[];
}>;

export function figuresOf(ledger: Ledger): readonly Figure[] {
  return KINDS.map((kind, kindIndex) => {
    const all = Array.from({ length: WARMUP + HEAP_RUNS }, (_, i) => {
      const at = (kindIndex * (WARMUP + HEAP_RUNS) + i) * FIELDS;

      return {
        f: ledger.readings[at]!,
        b: ledger.readings[at + 1]!,
        a: ledger.readings[at + 2]!,
        extra: ledger.readings[at + 3]!,
      };
    });
    const readings = all.slice(WARMUP);
    const retained = readings.map(({ a, b }) => a - b);

    return {
      count: ledger.count,
      kind,
      e1: Math.min(...retained) / ledger.count,
      e2: median(retained) / ledger.count,
      warmups: all.slice(0, WARMUP),
      readings,
    };
  });
}

const figure = (run: RawRun, count: number, kind: string): Figure | undefined =>
  run.ledgers
    ?.filter((ledger) => ledger.count === count)
    .flatMap(figuresOf)
    .find((entry) => entry.kind === kind);

const required = (run: RawRun, count: number, kind: string): Figure =>
  figure(run, count, kind)!;

type Pairing = Readonly<{ round: number; tip: Figure; base: Figure }>;

/** A set's rounds as `(tip, base)` pairs for one population and count. */
function pairs(
  runs: readonly RawRun[],
  set: string,
  tipArm: string,
  baseArm: string,
  count: number,
  kind: string,
): readonly Pairing[] {
  const inSet = runs.filter((run) => run.set === set);

  return inSet
    .filter((run) => run.arm === tipArm)
    .map((tip) => ({
      round: tip.round,
      tip: required(tip, count, kind),
      base: required(
        inSet.find((run) => run.arm === baseArm && run.round === tip.round)!,
        count,
        kind,
      ),
    }));
}

const key = (tree: string, count: number, kind: string): string =>
  `${tree}/${count}/${kind}`;

function blockOneFigures(
  runs: readonly RawRun[],
  tree: string,
  count: number,
  kind: string,
): readonly Figure[] {
  return runs
    .filter((run) => run.block === 1 && run.tree === tree)
    .map((run) => required(run, count, kind));
}

function isLow(value: number, floor: number, count: number): boolean {
  return count === 100
    ? value < floor - LOW_BYTES
    : value < floor * (1 - LOW_SHARE_AT_1000);
}

/** The class of each low reading among a figure's five. */
function lowClasses(entry: Figure, floor: number): readonly LowClass[] {
  const { count, readings } = entry;

  return readings.flatMap((reading, i) => {
    const value = (reading.a - reading.b) / count;

    return isLow(value, floor, count)
      ? [classify(readings, i, (floor - value) * count)]
      : [];
  });
}

type Bound = Readonly<{ round: number; tip: number; base: number; d: number }>;

function rows(
  paired: readonly Pairing[],
  metric: 'e1' | 'e2',
): readonly Bound[] {
  return paired.map(({ round, tip, base }) => ({
    round,
    tip: tip[metric],
    base: base[metric],
    d: tip[metric] - base[metric],
  }));
}

function retainedReport(runs: readonly RawRun[]) {
  const trees = ['base', 'candidate'];
  const floors: Record<string, number> = {};

  for (const tree of trees) {
    for (const count of COUNTS) {
      for (const kind of KINDS) {
        floors[key(tree, count, kind)] = median(
          blockOneFigures(runs, tree, count, kind).map(({ e1 }) => e1),
        );
      }
    }
  }

  const v0Rows = trees.flatMap((tree) =>
    KINDS.map((kind) => {
      const floor = floors[key(tree, 100, kind)]!;
      const expected = CONTINUITY[tree]![kind]!;

      return {
        tree,
        kind,
        floor,
        expected,
        ok: Math.abs(floor - expected) <= LOW_BYTES,
      };
    }),
  );
  const injected = COUNTS.flatMap((count) =>
    KINDS.map((kind) => {
      const paired = rows(pairs(runs, 'P', 'tip', 'base', count, kind), 'e1');
      const rule = pairedRule(paired.map(({ d }) => d));

      return { count, kind, rounds: paired, rule };
    }),
  );
  const v1Rows = injected
    .filter(({ count }) => count === 100)
    .map(({ kind, rule }) => ({
      kind,
      verdict: rule.verdict,
      m: rule.m,
      ok:
        rule.verdict !== 'no regression' &&
        rule.m >= INJECTED_LOW &&
        rule.m <= INJECTED_HIGH,
    }));
  const sameTree = ['AB', 'AC'].flatMap((set) =>
    KINDS.map((kind) => {
      const paired = rows(pairs(runs, set, 'tip', 'base', 100, kind), 'e1');
      const med = median(paired.map(({ d }) => d));

      return {
        set,
        kind,
        rounds: paired,
        median: med,
        ok: Math.abs(med) <= SAME_TREE_MEDIAN,
        over: paired.filter(({ d }) => d > LOW_BYTES).length,
      };
    }),
  );
  const L = sameTree.reduce((sum, { over }) => sum + over, 0);
  const governing = COUNTS.flatMap((count) =>
    KINDS.map((kind) => {
      const paired = pairs(runs, 'G', 'candidate', 'base', count, kind);
      const e1Rows = rows(paired, 'e1');
      const e2Rows = rows(paired, 'e2');
      const tips = e1Rows.map(({ tip }) => tip);
      const bases = e1Rows.map(({ base }) => base);

      return {
        count,
        kind,
        rounds: e1Rows,
        e1: pairedRule(e1Rows.map(({ d }) => d)),
        e2: pairedRule(e2Rows.map(({ d }) => d)),
        e2Rounds: e2Rows,
        tipRange: [Math.min(...tips), Math.max(...tips)],
        baseRange: [Math.min(...bases), Math.max(...bases)],
        literalMisses: e1Rows.filter(
          ({ tip, base }) => Number(tip.toFixed(0)) > Number(base.toFixed(0)),
        ).length,
      };
    }),
  );
  const at100 = governing.filter(({ count }) => count === 100);
  const at1000 = governing.filter(({ count }) => count === 1000);
  const rangeAbove = at1000.some(
    ({ tipRange, baseRange }) => tipRange[0]! > baseRange[1]!,
  );
  const tails = trees.map((tree) => {
    const figures = KINDS.flatMap((kind) =>
      blockOneFigures(runs, tree, 100, kind).map((entry) => ({
        kind,
        low: isLow(entry.e1, floors[key(tree, 100, kind)]!, 100),
      })),
    );

    return {
      tree,
      figures: figures.length,
      low: figures.filter(({ low }) => low).length,
    };
  });
  const [tailBase, tailCandidate] = tails as [
    (typeof tails)[number],
    (typeof tails)[number],
  ];
  const tP = fisherTwoSided(
    tailBase.low,
    tailBase.figures - tailBase.low,
    tailCandidate.low,
    tailCandidate.figures - tailCandidate.low,
  );
  const classes = trees.flatMap((tree) =>
    COUNTS.map((count) => {
      const tally: Record<LowClass, number> = {
        'high-B': 0,
        'low-A': 0,
        unclassed: 0,
      };
      let lowFigures = 0;
      let lowReadings = 0;

      for (const kind of KINDS) {
        const floor = floors[key(tree, count, kind)]!;

        for (const entry of blockOneFigures(runs, tree, count, kind)) {
          const classes = lowClasses(entry, floor);

          lowFigures += isLow(entry.e1, floor, count) ? 1 : 0;
          lowReadings += classes.length;

          for (const name of classes) {
            tally[name] += 1;
          }
        }
      }

      return { tree, count, lowFigures, lowReadings, tally };
    }),
  );
  const probes = ['d1', 'd2'].flatMap((mode) =>
    trees.map((tree) => {
      const probeRuns = runs.filter(
        (run) => run.set === 'D' && run.mode === mode && run.tree === tree,
      );
      const figures = KINDS.flatMap((kind) =>
        probeRuns.map((run) => ({ kind, entry: required(run, 100, kind) })),
      );
      const low = figures.filter(({ kind, entry }) =>
        isLow(entry.e1, floors[key(tree, 100, kind)]!, 100),
      ).length;
      const floorsHere = KINDS.map((kind) => ({
        kind,
        floor: figures.length
          ? median(
              figures
                .filter((row) => row.kind === kind)
                .map(({ entry }) => entry.e1),
            )
          : null,
        block1: floors[key(tree, 100, kind)]!,
      }));

      return {
        mode,
        tree,
        figures: figures.length,
        low,
        floors: floorsHere,
        floorsHold: floorsHere.every(
          ({ floor, block1 }) =>
            floor !== null && Math.abs(floor - block1) <= LOW_BYTES,
        ),
      };
    }),
  );
  const causes = trees.map((tree) => {
    const entry = classes.find(
      (row) => row.tree === tree && row.count === 100,
    )!;
    const { tally, lowReadings, lowFigures } = entry;
    const top = (['high-B', 'low-A'] as const).find(
      (name) => lowReadings > 0 && tally[name] / lowReadings >= CLASS_SHARE,
    );
    const probe = top
      ? probes.find(
          (row) =>
            row.tree === tree && row.mode === (top === 'high-B' ? 'd1' : 'd2'),
        )
      : undefined;
    const predicted = (lowFigures / tails[0]!.figures) * PROBE_FIGURES;
    const supported = Boolean(
      top &&
      probe?.figures === PROBE_FIGURES &&
      probe.low === 0 &&
      predicted >= PREDICTED_LOW &&
      probe.floorsHold,
    );

    return {
      tree,
      class: top ?? null,
      predictedIn36: predicted,
      status: supported ? 'supported' : 'unestablished',
    };
  });
  const gates: Gates = {
    v0: v0Rows.every(({ ok }) => ok),
    v1: v1Rows.every(({ ok }) => ok),
    v2: sameTree.every(({ ok }) => ok),
  };
  const conditions: Conditions = {
    gates,
    e1: governing.map(({ e1 }) => e1.verdict),
    rangeAbove,
    e2: governing.map(({ e2 }) => e2.verdict),
    L,
    literalMisses: at100.reduce(
      (sum, { literalMisses }) => sum + literalMisses,
      0,
    ),
    tP,
  };

  return {
    outcome: outcomeOf(conditions),
    conditions,
    v0: v0Rows,
    v1: v1Rows,
    injected,
    sameTree,
    governing,
    tails,
    tP,
    classes,
    probes,
    causes,
  };
}

const total = (cell: Cell): number =>
  (cell.libraryTotal + cell.harness + cell.other) / cell.per;

function allocationReport(runs: readonly RawRun[]) {
  const projects = [
    { name: 'shipped', width: 0 },
    { name: 'dev', width: 1 },
  ] as const;
  const inSet = runs.filter((run) => run.set === 'Alloc');
  const cells = projects.flatMap(({ name, width }) =>
    Object.entries(ALLOCATION_R).map(([label, allowances]) => {
      const candidate = inSet.filter((run) => run.arm === `candidate-${name}`);
      const roundRows = candidate.map((run) => {
        const input = inSet.find(
          (other) => other.arm === `input-${name}` && other.round === run.round,
        )!;
        const at = (entry: RawRun): number =>
          total(entry.cells!.find((cell) => cell.label === label)!);

        return {
          round: run.round,
          candidate: at(run),
          input: at(input),
          d: at(run) - at(input),
        };
      });
      const r = allowances[width];

      return {
        project: name,
        label,
        r,
        rounds: roundRows,
        rule: pairedRule(
          roundRows.map(({ d }) => d),
          ALLOCATION,
          r,
        ),
      };
    }),
  );
  const attributed: Record<string, number> = {};
  const booked = inSet
    .filter(({ tree }) => tree === 'candidate')
    .flatMap((run) =>
      run
        .cells!.filter(({ label }) => label in ALLOCATION_R)
        .flatMap(({ label, library }) =>
          Object.entries(library)
            .filter(([name]) => CHANGED_FUNCTION.test(name))
            .map(([name, bytes]) => ({
              where: `${run.arm} ${label} ${name}`,
              bytes,
            })),
        ),
    );

  for (const { where, bytes } of booked) {
    attributed[where] = (attributed[where] ?? 0) + bytes;
  }

  const attributedBytes = Object.values(attributed).reduce(
    (sum, bytes) => sum + bytes,
    0,
  );

  return {
    outcome: allocationOutcome(
      cells.map(({ rule }) => rule.verdict),
      attributedBytes,
    ),
    cells,
    attributed,
    attributedBytes,
  };
}

function report(all: readonly RawRun[]) {
  const runs = all.filter(({ ok }) => ok);

  return {
    runs: runs.length,
    failedAttempts: all.length - runs.length,
    d2Run: runs.some(({ mode }) => mode === 'd2'),
    retained: retainedReport(runs),
    allocation: allocationReport(runs),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = await readFile(process.argv[2]!, 'utf8');
  const raw = text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RawRun);

  console.log(JSON.stringify(report(raw), null, 1));
}

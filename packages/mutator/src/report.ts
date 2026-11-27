import type { Expectation, Group, Selector } from './format.ts';

export type RowStatus = 'passed' | 'failed' | 'skipped';

/** One row of a Vitest run: its test file, relative to the root, and full name. */
export type Row = Readonly<{
  file: string;
  name: string;
  status: RowStatus;
  /** The first lines of each failure message. */
  messages?: readonly string[];
}>;

/** One Vitest run's rows, and why each test file that has a message failed. */
export type VitestRun = Readonly<{
  rows: readonly Row[];
  /** The first lines of the message of each test file that failed as a whole. */
  errors: Readonly<Record<string, readonly string[]>>;
  /**
   * Vitest's exit code and the first lines of the errors that it printed, when
   * it ran a test file and exited with a failure that no row and no test
   * file's message reports, as when a browser didn't start.
   */
  failure?: readonly string[];
}>;

/**
 * A row has a verdict with a mutation when it passed unmutated and ran with the
 * mutation. `as expected`: every selected row failed, or no row failed for
 * _survives_. `missed`: a selected row passed. `caught`: _survives_ was
 * expected and rows failed. `void`: a selected row, or for _survives_ a row
 * that passed unmutated, has no verdict.
 */
export type Outcome = 'as expected' | 'missed' | 'caught' | 'void';

export type MutationResult = Readonly<{
  name: string;
  group: Group;
  /** The expectation that applies in this engine. */
  expect: Expectation;
  /**
   * Why this engine's expectation differs from the mutation's, when the
   * mutation gives this engine one of its own.
   */
  engineReason?: string;
  outcome: Outcome;
  /** Rows that passed unmutated and fail with the mutation. */
  failed: readonly string[];
  /** Selected rows that passed with the mutation. */
  missed: readonly string[];
  /** The rows without a verdict that make the outcome _void_. */
  voided: readonly string[];
  /**
   * Rows that passed unmutated and didn't run with the mutation, each with the
   * reason that Vitest gave for its test file.
   */
  unrun: Readonly<Record<string, readonly string[]>>;
  /** Failure messages of the rows in `failed`, by row. */
  messages: Readonly<Record<string, readonly string[]>>;
}>;

/** One engine's unmutated rows and its share of the mutations. */
export type Leg = Readonly<{
  engine: string;
  /** The leg's shard, from 1, and the count. */
  shard: readonly [number, number];
  rows: readonly Row[];
  mutations: readonly MutationResult[];
}>;

export type Report = Readonly<{
  /** The mutation file's path in its repository. */
  file: string;
  /** The commit whose code ran. */
  commit: string;
  /**
   * The commit that holds the file, the config and the runner as they ran,
   * when one checkout's head holds all three.
   */
  fileCommit?: string;
  legs: readonly Leg[];
}>;

export const rowKey = ({ file, name }: Pick<Row, 'file' | 'name'>): string =>
  `${file} > ${name}`;

const ran = (row: Row): boolean => row.status !== 'skipped';

/** The rows that ran unmutated and that `selector` covers. */
export function covered(
  selector: Selector,
  rows: readonly Row[],
): readonly Row[] {
  return rows.filter(
    (row) =>
      ran(row) && row.file === selector.file && row.name.includes(selector.row),
  );
}

type Judgement = Pick<
  MutationResult,
  'outcome' | 'failed' | 'missed' | 'voided' | 'unrun' | 'messages'
>;

/**
 * Vitest's reason that a row didn't run: its test file's message, else the
 * failure that Vitest exited with.
 */
const reasonOf = (
  row: Row | undefined,
  { errors, failure }: VitestRun,
  file: string,
): readonly string[] =>
  row
    ? ['the row was skipped']
    : (errors[file] ?? failure ?? ['Vitest reported no row of its file']);

/**
 * Compares a mutated run with the unmutated one. A row has a verdict when it
 * passed unmutated and ran with the mutation, so neither a row that fails
 * unmutated nor one that the mutation stops from running counts as failed or
 * as passed.
 */
export function judge(
  expect: Expectation,
  baseline: readonly Row[],
  mutated: VitestRun,
): Judgement {
  const after = new Map(mutated.rows.map((row) => [rowKey(row), row]));
  const failedRows: Row[] = [];
  const unrun: Record<string, readonly string[]> = {};

  for (const row of baseline.filter(({ status }) => status === 'passed')) {
    const key = rowKey(row);
    const next = after.get(key);

    if (next?.status === 'failed') {
      failedRows.push(next);
    } else if (next?.status !== 'passed') {
      unrun[key] = reasonOf(next, mutated, row.file);
    }
  }

  const failed = failedRows.map(rowKey);
  const messages = Object.fromEntries(
    failedRows.flatMap((row) =>
      row.messages ? [[rowKey(row), row.messages]] : [],
    ),
  );

  if ('survives' in expect) {
    const voided = Object.keys(unrun);

    return {
      outcome:
        failed.length > 0
          ? 'caught'
          : voided.length > 0
            ? 'void'
            : 'as expected',
      failed,
      missed: [],
      voided,
      unrun,
      messages,
    };
  }

  const selected = new Map(
    expect.fails.flatMap((selector) =>
      covered(selector, baseline).map((row) => [rowKey(row), row]),
    ),
  );
  const voided = [...selected]
    .filter(([key, row]) => row.status === 'failed' || key in unrun)
    .map(([key]) => key);
  const failedSet = new Set(failed);
  const missed = [...selected.keys()].filter(
    (key) => !voided.includes(key) && !failedSet.has(key),
  );

  return {
    outcome:
      voided.length > 0 ? 'void' : missed.length > 0 ? 'missed' : 'as expected',
    failed,
    missed,
    voided,
    unrun,
    messages,
  };
}

type Merged = Readonly<{
  /** The unmutated rows of each engine. */
  rows: ReadonlyMap<string, readonly Row[]>;
  /** Each mutation's result in each engine, in the order they were first read. */
  results: ReadonlyMap<string, ReadonlyMap<string, MutationResult>>;
}>;

/** Merges the legs of every report, shards of one engine into one. */
function merge(reports: readonly Report[]): Merged {
  const rows = new Map<string, readonly Row[]>();
  const results = new Map<string, Map<string, MutationResult>>();

  for (const { legs } of reports) {
    for (const leg of legs) {
      rows.set(leg.engine, leg.rows);

      for (const result of leg.mutations) {
        const byEngine = results.get(result.name) ?? new Map();
        byEngine.set(leg.engine, result);
        results.set(result.name, byEngine);
      }
    }
  }

  return { rows, results };
}

/**
 * Whether a mutation fails a different set of rows in one engine than in
 * another, counting only the rows that have a verdict in each engine compared.
 * An engine with an expectation of its own has the reason for its difference,
 * so only the engines whose expectation is the mutation's are compared.
 */
export function differs(
  byEngine: ReadonlyMap<string, MutationResult>,
  rows: ReadonlyMap<string, readonly Row[]>,
): boolean {
  const engines = [...byEngine]
    .filter(([, result]) => result.engineReason === undefined)
    .map(([engine]) => engine);

  if (engines.length < 2) {
    return false;
  }

  const verdicts = engines.map((engine) => {
    const { unrun } = byEngine.get(engine)!;
    return new Set(
      (rows.get(engine) ?? [])
        .filter((row) => row.status === 'passed')
        .map(rowKey)
        .filter((key) => !(key in unrun)),
    );
  });
  const common = [...verdicts[0]!].filter((key) =>
    verdicts.every((set) => set.has(key)),
  );
  const sets = engines.map((engine) => {
    const failed = new Set(byEngine.get(engine)!.failed);
    return common.filter((key) => failed.has(key)).join('\n');
  });

  return sets.some((set) => set !== sets[0]);
}

/** The mutations of `reports` that differ between engines. */
export function differing(reports: readonly Report[]): readonly string[] {
  const { rows, results } = merge(reports);

  return [...results]
    .filter(([, byEngine]) => differs(byEngine, rows))
    .map(([name]) => name);
}

export type Summary = Readonly<{
  markdown: string;
  /** Every outcome is as expected and no mutation differs. */
  ok: boolean;
}>;

/** The summary of every leg of `reports`, in Markdown. */
export function summarize(reports: readonly Report[]): Summary {
  const { rows, results } = merge(reports);
  const engines = [...rows.keys()];
  const lines = [
    `# Mutations: ${[...new Set(reports.map(({ file }) => file))].join(', ')}`,
    '',
    `The code at ${[...new Set(reports.map(({ commit }) => commit))].join(', ')}, the file and the runner at ${[...new Set(reports.map(({ fileCommit }) => fileCommit ?? 'no commit that holds them as they ran'))].join(', ')}, in ${engines.join(', ')}.`,
    '',
    ...engines.map((engine) => {
      const engineRows = rows.get(engine)!;
      const failing = engineRows.filter((row) => row.status === 'failed');
      return `- ${engine}, unmutated: ${engineRows.filter(ran).length} rows ran, ${failing.length} failed, ${engineRows.length - engineRows.filter(ran).length} skipped`;
    }),
    '',
    `| Mutation | Group | ${engines.join(' | ')} | Engines |`,
    `| --- | --- | ${engines.map(() => '---').join(' | ')} | --- |`,
  ];
  const details: string[] = [];
  let ok = true;

  for (const [name, byEngine] of results) {
    const first = byEngine.values().next().value!;
    const flag = differs(byEngine, rows);
    const cells = engines.map((engine) => {
      const result = byEngine.get(engine);
      return result ? `${result.outcome} (${result.failed.length})` : '—';
    });

    ok &&= !flag;
    lines.push(
      `| ${name} | ${first.group} | ${cells.join(' | ')} | ${flag ? '**differs**' : ''} |`,
    );

    for (const [engine, result] of byEngine) {
      ok &&= result.outcome === 'as expected';

      const reason = (key: string): readonly string[] =>
        result.unrun[key]!.map((line) => `    - ${line}`);
      const notes = [
        ...result.missed.map((key) => `  - missed: ${key}`),
        ...result.voided.flatMap((key) =>
          key in result.unrun
            ? [`  - void, did not run: ${key}`, ...reason(key)]
            : [`  - void, fails unmutated: ${key}`],
        ),
        ...Object.keys(result.unrun)
          .filter((key) => !result.voided.includes(key))
          .flatMap((key) => [
            `  - no verdict, did not run: ${key}`,
            ...reason(key),
          ]),
        ...result.failed.map((key) => `  - failed: ${key}`),
      ];
      const expectation =
        'survives' in result.expect
          ? `survives: ${result.expect.survives}`
          : `fails: ${result.expect.fails.map(({ file, row }) => `${file} > ${row}`).join('; ')}`;

      details.push(
        `### ${name}, ${engine}: ${result.outcome}`,
        '',
        `- expected ${expectation}${result.engineReason ? ` (this engine: ${result.engineReason})` : ''}`,
        ...notes,
        '',
      );
    }
  }

  const groups = [...results.values()].map(
    (byEngine) => byEngine.values().next().value!.group,
  );
  lines.push(
    '',
    `Groups: ${(['mechanism', 'engine', 'doubted', 'other'] as const)
      .map((group) => `${group} ${groups.filter((g) => g === group).length}`)
      .join(', ')}.`,
    '',
    ok
      ? 'Every outcome is as expected, and no mutation differs between engines.'
      : 'An outcome other than _as expected_, or a mutation that differs between engines, is the reviewer’s to judge.',
    '',
    '## Each mutation',
    '',
    ...details,
  );

  return { markdown: `${lines.join('\n').trimEnd()}\n`, ok };
}

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

/**
 * `as expected`: every selected row failed, or no row failed for _survives_.
 * `missed`: a selected row passed. `caught`: _survives_ was expected and rows
 * failed. `void`: the unmutated run already fails a selected row.
 */
export type Outcome = 'as expected' | 'missed' | 'caught' | 'void';

export type MutationResult = Readonly<{
  name: string;
  group: Group;
  /** The expectation that applies in this engine. */
  expect: Expectation;
  /** Why this engine's expectation differs from the mutation's, if it does. */
  engineReason?: string;
  /** Whether the mutation states an expectation of its own for any engine. */
  hasEngineExpectations: boolean;
  outcome: Outcome;
  /** Rows that ran unmutated and passed, and fail or don't run with the mutation. */
  failed: readonly string[];
  /** Selected rows that passed with the mutation. */
  missed: readonly string[];
  /** Selected rows that the unmutated run already fails. */
  voided: readonly string[];
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
  file: string;
  commit: string;
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
  'outcome' | 'failed' | 'missed' | 'voided' | 'messages'
>;

/**
 * Compares a mutated run with the unmutated one. A row that ran and passed
 * unmutated fails when the mutated run fails it or doesn't run it, as when the
 * mutation stops its test file from loading.
 */
export function judge(
  expect: Expectation,
  baseline: readonly Row[],
  mutated: readonly Row[],
): Judgement {
  const after = new Map(mutated.map((row) => [rowKey(row), row]));
  const failedRows = baseline.filter(
    (row) =>
      row.status === 'passed' && after.get(rowKey(row))?.status !== 'passed',
  );
  const failed = failedRows.map(rowKey);
  const messages = Object.fromEntries(
    failedRows.map((row) => {
      const key = rowKey(row);
      return [key, after.get(key)?.messages ?? ['the row did not run']];
    }),
  );

  if ('survives' in expect) {
    return {
      outcome: failed.length === 0 ? 'as expected' : 'caught',
      failed,
      missed: [],
      voided: [],
      messages,
    };
  }

  const selected = new Map(
    expect.fails.flatMap((selector) =>
      covered(selector, baseline).map((row) => [rowKey(row), row]),
    ),
  );
  const voided = [...selected.values()]
    .filter((row) => row.status === 'failed')
    .map(rowKey);
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
 * another, counting only the rows that ran unmutated in each engine compared.
 * An expectation of its own for an engine gives the reason, so it doesn't.
 */
export function differs(
  byEngine: ReadonlyMap<string, MutationResult>,
  rows: ReadonlyMap<string, readonly Row[]>,
): boolean {
  const engines = [...byEngine.keys()];

  if (
    engines.length < 2 ||
    [...byEngine.values()].some((result) => result.hasEngineExpectations)
  ) {
    return false;
  }

  const ranIn = engines.map(
    (engine) => new Set((rows.get(engine) ?? []).filter(ran).map(rowKey)),
  );
  const common = [...ranIn[0]!].filter((key) =>
    ranIn.every((set) => set.has(key)),
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
    `At ${[...new Set(reports.map(({ commit }) => commit))].join(', ')}, in ${engines.join(', ')}.`,
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

      const notes = [
        ...result.missed.map((key) => `  - missed: ${key}`),
        ...result.voided.map((key) => `  - void, fails unmutated: ${key}`),
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

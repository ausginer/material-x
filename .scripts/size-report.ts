/**
 * The pull request's size report: a head reading against an optional base
 * reading, as Markdown with a hidden marker, and the measurement rows' results.
 * It reads files and writes text, and it calls no network. The workflow posts
 * the text as one comment, found again by the marker, or writes it to the job
 * summary.
 *
 * `node .scripts/size-report.ts --head <file> [--base <file>] [--tests <file>]
 * --out <file>`, where each reading is what `.scripts/size-reading.ts` writes and
 * `--tests` is Vitest's JSON report of the measurement rows. A base file that is
 * missing or holds no reading gives "no base reading". Every exceeded limit and
 * every failed measurement row is also printed to stdout as a GitHub Actions
 * warning annotation.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs, stripVTControlCharacters } from 'node:util';

/** One row that the root `just size` measures. */
export type SizeRow = Readonly<{
  package: string;
  row: string;
  brotli: number;
  /** `null` where the instrument reports no gzip figure. */
  gzip: number | null;
  /** `null` for a row without a limit. */
  limit: number | null;
}>;

export type SizeReading = Readonly<{ rows: readonly SizeRow[] }>;

export type MeasurementResult = Readonly<{
  name: string;
  passed: boolean;
  /** The first line of the failure, for a failed row. */
  message: string | null;
}>;

export type SizeReportInput = Readonly<{
  head: SizeReading;
  /** `null` when the base tree gave no reading. */
  base: SizeReading | null;
  /** `null` when the measurement rows did not report. */
  measurements: readonly MeasurementResult[] | null;
}>;

/** Identifies the comment, so that each run updates it instead of adding one. */
export const SIZE_REPORT_MARKER = '<!-- mx-size-report -->';

const key = (row: SizeRow): string => `${row.package}\u0000${row.row}`;

/** Table text, with the pipes that would end its cell escaped. */
function cell(text: string): string {
  return text.replaceAll('|', String.raw`\|`);
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function over(row: SizeRow): number {
  return row.limit !== null && row.brotli > row.limit
    ? row.brotli - row.limit
    : 0;
}

function sizeLine(
  head: SizeRow | undefined,
  base: SizeRow | undefined,
  hasBase: boolean,
): string {
  const row = (head ?? base)!;
  const brotli = head ? String(head.brotli) : '—';
  let baseCell = '—';
  let change = '';

  if (!hasBase) {
    change = '';
  } else if (head && base) {
    baseCell = String(base.brotli);
    change = signed(head.brotli - base.brotli);
  } else if (head) {
    change = 'added';
  } else if (base) {
    baseCell = String(base.brotli);
    change = 'removed';
  }

  let limit = head?.limit == null ? '—' : String(head.limit);

  if (head && over(head) > 0) {
    limit = `${limit} **over by ${over(head)} B**`;
  }

  const gzip = head?.gzip == null ? '—' : String(head.gzip);

  return `| ${cell(row.package)} | ${cell(row.row)} | ${brotli} | ${baseCell} | ${change} | ${limit} | ${gzip} |`;
}

/** The report as Markdown, starting with the hidden marker. */
export function renderSizeReport(input: SizeReportInput): string {
  const { head, base, measurements } = input;
  const baseRows = new Map(base?.rows.map((row) => [key(row), row]));
  const headKeys = new Set(head.rows.map(key));
  const lines = [SIZE_REPORT_MARKER, '## Sizes', ''];

  lines.push(
    base
      ? 'Brotli bytes at the head and at the merge base with the base branch. gzip at the head, where the instrument reports it.'
      : '**No base reading:** the merge base gave no machine-readable reading, so only the head is reported.',
    '',
    '| Package | Row | Brotli | Base | Change | Limit | gzip |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  );

  for (const row of head.rows) {
    lines.push(sizeLine(row, baseRows.get(key(row)), base !== null));
  }

  for (const row of base?.rows ?? []) {
    if (!headKeys.has(key(row))) {
      lines.push(sizeLine(undefined, row, true));
    }
  }

  lines.push('', '## Measurement rows', '');

  if (measurements === null) {
    lines.push('**No result:** the measurement rows did not report.');
  } else if (measurements.length === 0) {
    lines.push('No measurement row ran.');
  } else {
    lines.push('| Row | Result |', '| --- | --- |');

    for (const result of measurements) {
      lines.push(
        `| ${cell(result.name)} | ${result.passed ? 'passed' : `**failed:** ${cell(result.message ?? '')}`} |`,
      );
    }
  }

  lines.push(
    '',
    'Sizes, allocations and times are reported here and never fail the build.',
  );

  return `${lines.join('\n')}\n`;
}

/** One warning per exceeded limit and per failed measurement row. */
export function sizeWarnings(input: SizeReportInput): string[] {
  return [
    ...input.head.rows
      .filter((row) => over(row) > 0)
      .map(
        (row) =>
          `${row.package}, ${row.row}: ${row.brotli} B is over its ${row.limit} B limit by ${over(row)} B`,
      ),
    ...(input.measurements ?? [])
      .filter((result) => !result.passed)
      .map((result) => `${result.name}: ${result.message ?? 'failed'}`),
  ];
}

type VitestAssertion = Readonly<{
  fullName: string;
  status: string;
  failureMessages?: readonly string[];
}>;

type VitestReport = Readonly<{
  testResults: ReadonlyArray<
    Readonly<{
      assertionResults: readonly VitestAssertion[];
    }>
  >;
}>;

/** The rows that ran, from Vitest's JSON report. A skipped row didn't run. */
export function parseVitestReport(report: VitestReport): MeasurementResult[] {
  return report.testResults.flatMap((file) =>
    file.assertionResults
      .filter(
        (assertion) =>
          assertion.status === 'passed' || assertion.status === 'failed',
      )
      .map((assertion) => ({
        name: assertion.fullName,
        passed: assertion.status === 'passed',
        message:
          assertion.status === 'failed'
            ? (stripVTControlCharacters(assertion.failureMessages?.[0] ?? '')
                .split('\n')[0]
                ?.trim() ?? null)
            : null,
      })),
  );
}

async function readJSON(path: string | undefined): Promise<unknown> {
  if (path == null) {
    return null;
  }

  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function isReading(value: unknown): value is SizeReading {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { rows?: unknown }).rows)
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      head: { type: 'string' },
      base: { type: 'string' },
      tests: { type: 'string' },
      out: { type: 'string' },
    },
  });

  if (values.head == null || values.out == null) {
    throw new Error(
      'usage: node .scripts/size-report.ts --head <file> [--base <file>] [--tests <file>] --out <file>',
    );
  }

  const head = await readJSON(values.head);

  if (!isReading(head)) {
    throw new Error(`${values.head} holds no size reading`);
  }

  const base = await readJSON(values.base);
  const tests = await readJSON(values.tests);
  const input: SizeReportInput = {
    head,
    base: isReading(base) ? base : null,
    measurements:
      tests === null ? null : parseVitestReport(tests as VitestReport),
  };

  await writeFile(values.out, renderSizeReport(input));

  for (const warning of sizeWarnings(input)) {
    process.stdout.write(`::warning title=Measurement::${warning}\n`);
  }
}

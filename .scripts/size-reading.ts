/**
 * Writes the machine-readable size reading of the tree it runs in: every row
 * that the root `just size` measures, with its package, Brotli bytes, gzip bytes
 * where the instrument reports them, and its limit. One nx run builds the
 * measured packages, and nx's task graph builds their prerequisites first, so
 * the script reads a tree where only the install has run. Each package is then
 * measured by its own instrument: size-limit's `--json` for `box-quad`,
 * `signals`, `core` and `material-x`, and `bench/size/measure.ts --json` for `drag`. A row over
 * its limit is still read; an instrument that prints no reading fails the
 * script.
 *
 * `node .scripts/size-reading.ts <output.json>`
 */
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SizeReading, SizeRow } from './size-report.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

type Output = Readonly<{ stdout: string; stderr: string }>;

async function run(
  command: string,
  args: readonly string[],
  cwd: string,
  { allowFailure = false }: Readonly<{ allowFailure?: boolean }> = {},
): Promise<Output> {
  return await new Promise<Output>((resolve, reject) => {
    execFile(
      command,
      [...args],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error && !allowFailure) {
          reject(
            new Error(
              `${command} ${args.join(' ')} failed in ${cwd}:\n${stdout}${stderr}`,
            ),
          );
          return;
        }

        resolve({ stdout, stderr });
      },
    );
  });
}

type SizeLimitRow = Readonly<{
  name: string;
  size: number;
  sizeLimit?: number;
}>;

type DragRow = Readonly<{
  row: string;
  brotli: number;
  gzip: number;
  limit: number;
}>;

/** The last line of the output, which is where each instrument prints its JSON. */
function parseLastJSON(stdout: string, instrument: string): unknown {
  const text = stdout.trim();
  const start = text.lastIndexOf('\n[');

  try {
    return JSON.parse(start === -1 ? text : text.slice(start + 1));
  } catch {
    throw new Error(`${instrument} printed no JSON reading:\n${stdout}`);
  }
}

async function readSizeLimit(name: string): Promise<SizeRow[]> {
  const cwd = join(ROOT, 'packages', name);

  // size-limit exits non-zero when a row is over its limit, and still prints it.
  const { stdout } = await run(
    'aube',
    ['exec', '--', 'size-limit', '--json'],
    cwd,
    {
      allowFailure: true,
    },
  );
  const rows = parseLastJSON(stdout, `${name}: size-limit`) as SizeLimitRow[];

  return rows.map((row) => ({
    package: name,
    row: row.name,
    brotli: row.size,
    gzip: null,
    limit: row.sizeLimit ?? null,
  }));
}

async function readDrag(): Promise<SizeRow[]> {
  const cwd = join(ROOT, 'packages/drag');

  // The gate exits non-zero on a violation, and still prints the reading.
  const { stdout } = await run(
    'node',
    ['bench/size/measure.ts', '--json'],
    cwd,
    { allowFailure: true },
  );
  const rows = parseLastJSON(stdout, 'drag: measure.ts') as DragRow[];

  return rows.map((row) => ({
    package: 'drag',
    row: row.row,
    brotli: row.brotli,
    gzip: row.gzip,
    limit: row.limit,
  }));
}

const [output] = process.argv.slice(2);

if (output == null) {
  throw new Error('usage: node .scripts/size-reading.ts <output.json>');
}

/** The packages that the root `just size` measures, in the reading's order. */
const MEASURED = ['box-quad', 'signals', 'core', 'material-x', 'drag'] as const;

await run(
  'aube',
  [
    'exec',
    '--',
    'nx',
    'run-many',
    '-t',
    'build',
    `--projects=${MEASURED.join(',')}`,
    '--skipNxCache',
  ],
  ROOT,
);

// Each instrument bundles into its own temporary directory, so the packages
// are read concurrently. The rows keep the list's order.
const reading: SizeReading = {
  rows: (
    await Promise.all(
      MEASURED.map(async (name) =>
        name === 'drag' ? await readDrag() : await readSizeLimit(name),
      ),
    )
  ).flat(),
};

await writeFile(output, `${JSON.stringify(reading, null, 2)}\n`);

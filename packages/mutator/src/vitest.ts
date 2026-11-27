import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { Run } from './format.ts';
import { exec } from './process.ts';
import type { Row, RowStatus, VitestRun } from './report.ts';

type AssertionResult = Readonly<{
  fullName: string;
  status: string;
  failureMessages?: readonly string[];
}>;

type JsonReport = Readonly<{
  testResults: ReadonlyArray<
    Readonly<{
      name: string;
      status: string;
      message?: string;
      assertionResults: readonly AssertionResult[];
    }>
  >;
}>;

/** How many lines of a failure message the report keeps. */
const MESSAGE_LINES = 8;

const statusOf = (status: string): RowStatus =>
  status === 'passed' || status === 'failed' ? status : 'skipped';

/** The first lines of `message`, without the empty ones. */
const firstLines = (message: string): readonly string[] =>
  message.split('\n').filter(Boolean).slice(0, MESSAGE_LINES);

/**
 * The Vitest that `dir` resolves, as the program that runs its command line.
 * Vitest is the package's peer, so the copy's own install provides it.
 */
function vitestOf(dir: string): readonly string[] {
  const require = createRequire(join(dir, 'package.json'));
  const manifest = require.resolve('vitest/package.json');
  const { bin } = require(manifest) as Readonly<{
    bin: string | Readonly<Record<string, string>>;
  }>;
  const path = typeof bin === 'string' ? bin : bin['vitest']!;

  return [process.execPath, join(manifest, '..', path)];
}

/**
 * Runs Vitest once for `run` in the copy at `root`, with `env`, and reads every
 * row of its JSON report. A test file that fails before its rows run adds no
 * row, and its message is kept as the reason that its rows didn't run. When
 * Vitest runs a test file and exits with a failure that neither a row nor a
 * test file reports, as when a browser doesn't start, the errors that it prints
 * are kept as the run's failure. A run that selects no test file has no
 * failure: it has no row, so the file's selectors refuse it.
 */
export async function runVitest(
  root: string,
  run: Run,
  env: Readonly<Record<string, string>>,
  signal: AbortSignal,
): Promise<VitestRun> {
  const dir = join(root, run.dir);
  const scratch = await mkdtemp(join(tmpdir(), 'mutator-report-'));
  const output = join(scratch, 'report.json');

  try {
    const result = await exec(
      [
        ...vitestOf(dir),
        'run',
        ...(run.config ? ['--config', run.config] : []),
        ...run.tests,
        '--reporter=json',
        `--outputFile.json=${output}`,
        // The JSON report has no unhandled error, and this reporter prints
        // them on the standard error.
        '--reporter=dot',
      ],
      dir,
      { env, signal },
    );
    let report: JsonReport;

    try {
      report = JSON.parse(await readFile(output, 'utf8')) as JsonReport;
    } catch {
      throw new Error(
        `Vitest wrote no report in ${dir}, exit ${result.code}\n${result.stderr || result.stdout}`,
      );
    }

    const errors: Record<string, readonly string[]> = {};
    const rows = report.testResults.flatMap(
      ({ name, message, assertionResults }) => {
        const file = relative(root, name);

        if (message) {
          errors[file] = firstLines(message);
        }

        return assertionResults.map((assertion): Row => {
          const status = statusOf(assertion.status);
          const messages = assertion.failureMessages?.flatMap(firstLines);

          return status === 'failed' && messages?.length
            ? { file, name: assertion.fullName, status, messages }
            : { file, name: assertion.fullName, status };
        });
      },
    );

    const reported =
      report.testResults.length === 0 ||
      Object.keys(errors).length > 0 ||
      rows.some(({ status }) => status === 'failed');

    if (result.code === 0 || reported) {
      return { rows, errors };
    }

    // Without the stack frames, the code frames and the reporter's banner,
    // which would fill the lines kept before the error.
    const printed = firstLines(
      result.stderr.replaceAll(
        /^(?:\s+(?:at |❯ |\d*\|)|⎯|Vitest caught |This might cause ).*$/gmu,
        '',
      ),
    );

    return {
      rows,
      errors,
      failure: [
        `Vitest exited with ${result.code} and reported no failed row:`,
        ...(printed.length > 0 ? printed : ['Vitest printed no error']),
      ],
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

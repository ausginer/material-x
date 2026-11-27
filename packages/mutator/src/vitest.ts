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

/** The dot reporter's banner over the errors outside every row. */
const UNHANDLED = /^⎯+ Unhandled Errors? ⎯+$/mu;

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
 * row, and its message is kept as the reason that its rows didn't run. When a
 * listed test file has no row and no message and Vitest exits with a failure
 * that no row reports, as when a browser doesn't start, the errors that it
 * prints are kept as the run's failure. When the rows ran, an error that Vitest
 * prints outside them, such as an unhandled rejection, is kept as the run's
 * error, and the run is judged. A run that selects no test file has neither: it
 * has no row, so the file's selectors refuse it.
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

    const lines = (text: string): readonly string[] =>
      // Without the stack frames, the code frames and the reporter's banner,
      // which would fill the lines kept before the error.
      firstLines(
        text.replaceAll(
          /^(?:\s+(?:at |❯ |\d*\|)|⎯|Vitest caught |This might cause ).*$/gmu,
          '',
        ),
      );
    const banner = UNHANDLED.exec(result.stderr);
    const unhandled = banner ? lines(result.stderr.slice(banner.index)) : [];
    const explained =
      report.testResults.length === 0 ||
      Object.keys(errors).length > 0 ||
      rows.some(({ status }) => status === 'failed');

    if (result.code === 0 || explained) {
      return unhandled.length > 0
        ? { rows, errors, runError: unhandled }
        : { rows, errors };
    }

    const printed = lines(result.stderr);
    const reason = printed.length > 0 ? printed : ['Vitest printed no error'];

    // A listed test file with no row and no message didn't run: the engine,
    // not the code, failed.
    return report.testResults.some(
      ({ assertionResults, message }) =>
        assertionResults.length === 0 && !message,
    )
      ? {
          rows,
          errors,
          failure: [
            `Vitest exited with ${result.code} and reported no failed row:`,
            ...reason,
          ],
        }
      : {
          rows,
          errors,
          runError: unhandled.length > 0 ? unhandled : reason,
        };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

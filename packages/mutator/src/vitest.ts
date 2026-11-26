import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { Run } from './format.ts';
import { exec } from './process.ts';
import type { Row, RowStatus } from './report.ts';

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
 * row, so its rows read as not run.
 */
export async function runVitest(
  root: string,
  run: Run,
  env: Readonly<Record<string, string>>,
): Promise<readonly Row[]> {
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
        `--outputFile=${output}`,
      ],
      dir,
      env,
    );
    let report: JsonReport;

    try {
      report = JSON.parse(await readFile(output, 'utf8')) as JsonReport;
    } catch {
      throw new Error(
        `Vitest wrote no report in ${dir}, exit ${result.code}\n${result.stderr || result.stdout}`,
      );
    }

    return report.testResults.flatMap(({ name, assertionResults }) => {
      const file = relative(root, name);

      return assertionResults.map((assertion) => {
        const status = statusOf(assertion.status);
        const messages = assertion.failureMessages
          ?.flatMap((message) => message.split('\n').slice(0, MESSAGE_LINES))
          .filter(Boolean);

        return status === 'failed' && messages?.length
          ? { file, name: assertion.fullName, status, messages }
          : { file, name: assertion.fullName, status };
      });
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

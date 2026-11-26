#!/usr/bin/env node
/**
 * ```
 * mutator run <file> [--ref <commit>] [--engine <name>]… [--only <mutation>]…
 *   [--config <path>] [--shard <i>/<n>] [--report <json>] [--summary <md>]
 * mutator check <file> [--ref <commit>]
 * mutator summary <report>… [--out <md>]
 * ```
 *
 * `run` applies the mutations in a worktree of the commit that it creates, and
 * reads the file from its own path, so the code at `--ref` doesn't have to hold
 * it. It prints the summary, writes the JSON report and the summary where
 * asked, and exits with 0 when every outcome is as expected and no mutation
 * differs between engines, 1 when one is or does, 2 when it refuses the file,
 * and 128 plus the signal's number when `SIGINT` or `SIGTERM` stops it.
 * `check` refuses stale edits and prints the file's engines as JSON. `summary`
 * merges the reports of a run's legs and exits as `run` does.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { Config, MutationFile } from './format.ts';
import { check, exec } from './process.ts';
import { summarize, type Report } from './report.ts';
import { checkEdits, Interrupted, load, Refusal, run, select } from './run.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    ref: { type: 'string', default: 'HEAD' },
    engine: { type: 'string', multiple: true },
    only: { type: 'string', multiple: true },
    config: { type: 'string' },
    shard: { type: 'string' },
    report: { type: 'string' },
    summary: { type: 'string' },
    out: { type: 'string' },
  },
});
const [command, ...paths] = positionals;

const log = (line: string): void => {
  process.stderr.write(`mutator: ${line}\n`);
};

async function main(): Promise<number> {
  if (command === 'summary') {
    const reports = await Promise.all(
      paths.map(
        async (path) => JSON.parse(await readFile(path, 'utf8')) as Report,
      ),
    );
    const { markdown, ok } = summarize(reports);

    if (values.out) {
      await writeFile(values.out, markdown);
    }

    process.stdout.write(markdown);
    return ok ? 0 : 1;
  }

  const root = (
    await check(['git', 'rev-parse', '--show-toplevel'], process.cwd())
  ).trim();
  const commit = (
    await check(
      ['git', 'rev-parse', '--verify', `${values.ref}^{commit}`],
      root,
    )
  ).trim();
  const path = resolve(paths[0]!);
  const file = await load<MutationFile>(path);

  if (command === 'check') {
    await checkEdits(root, commit, select(file, values.only));
    process.stdout.write(
      `${JSON.stringify({ commit, engines: file.engines })}\n`,
    );
    return 0;
  }

  // The checkout that holds the file, which in CI is the runner's, not `root`.
  const source = await exec(
    ['git', 'rev-parse', '--show-toplevel', 'HEAD'],
    dirname(path),
  );
  const [sourceRoot, fileCommit] = source.stdout.trim().split('\n');
  const [index, count] = (values.shard ?? '1/1').split('/').map(Number);
  const report = await run({
    root,
    label: source.code === 0 ? relative(sourceRoot!, path) : path,
    file,
    commit,
    ...(source.code === 0 ? { fileCommit: fileCommit! } : {}),
    config: await load<Config>(
      resolve(values.config ?? `${root}/mutator.config.ts`),
    ),
    ...(values.engine ? { engines: values.engine } : {}),
    ...(values.only ? { only: values.only } : {}),
    shard: [index!, count!],
    log,
  });
  const { markdown, ok } = summarize([report]);

  if (values.report) {
    await writeFile(values.report, `${JSON.stringify(report, null, 1)}\n`);
  }

  if (values.summary) {
    await writeFile(values.summary, markdown);
  }

  process.stdout.write(markdown);
  return ok ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`mutator: ${(error as Error).message}\n`);
  process.exitCode =
    error instanceof Refusal
      ? 2
      : error instanceof Interrupted
        ? 128 + constants.signals[error.signal]
        : 3;
}

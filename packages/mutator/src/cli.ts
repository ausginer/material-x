#!/usr/bin/env node
/**
 * ```
 * mutator run <file> [--ref <commit>] [--engine <name>]… [--only <mutation>]…
 *   [--config <path>] [--shard <i>/<n>] [--workdir <dir>] [--report <json>]
 *   [--summary <md>]
 * mutator check <file> [--ref <commit>]
 * mutator summary <report>… [--out <md>]
 * ```
 *
 * `run` prints the summary, writes the JSON report and the summary where asked,
 * and exits with 0 when every outcome is as expected and no mutation differs
 * between engines, 1 when one is or does, and 2 when it refuses the file.
 * `check` refuses stale edits and prints the file's engines as JSON. `summary`
 * merges the reports of a run's legs and exits as `run` does.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { Config, MutationFile } from './format.ts';
import { check } from './process.ts';
import { summarize, type Report } from './report.ts';
import { checkEdits, load, Refusal, run, select } from './run.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    ref: { type: 'string', default: 'HEAD' },
    engine: { type: 'string', multiple: true },
    only: { type: 'string', multiple: true },
    config: { type: 'string' },
    shard: { type: 'string' },
    workdir: { type: 'string' },
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

  const [index, count] = (values.shard ?? '1/1').split('/').map(Number);
  const report = await run({
    root,
    label: relative(root, path),
    file,
    commit,
    config: await load<Config>(
      resolve(values.config ?? `${root}/mutator.config.ts`),
    ),
    ...(values.engine ? { engines: values.engine } : {}),
    ...(values.only ? { only: values.only } : {}),
    shard: [index!, count!],
    ...(values.workdir ? { workdir: resolve(values.workdir) } : {}),
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
  process.exitCode = error instanceof Refusal ? 2 : 3;
}

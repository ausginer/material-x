import { readFile, writeFile } from 'node:fs/promises';
import { join, matchesGlob } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCopy, removeStale } from './copy.ts';
import type { Config, Expectation, Mutation, MutationFile } from './format.ts';
import { check } from './process.ts';
import {
  covered,
  judge,
  type Leg,
  type MutationResult,
  type Report,
  type Row,
  type VitestRun,
} from './report.ts';
import { runVitest } from './vitest.ts';

/** A file that can't run as written, refused before any mutation is applied. */
export class Refusal extends Error {
  readonly reasons: readonly string[];

  constructor(message: string, reasons: readonly string[]) {
    super(`${message}\n${reasons.map((reason) => `  - ${reason}`).join('\n')}`);
    this.reasons = reasons;
  }
}

/**
 * A run that `SIGINT` or `SIGTERM` stopped, after its commands exited and its
 * copy was removed.
 */
export class Interrupted extends Error {
  readonly signal: NodeJS.Signals;

  constructor(signal: NodeJS.Signals) {
    super(`stopped by ${signal}`);
    this.signal = signal;
  }
}

/** Imports a TypeScript module and returns its default export. */
export async function load<T>(path: string): Promise<T> {
  const module = (await import(pathToFileURL(path).href)) as Readonly<{
    default: T;
  }>;
  return module.default;
}

/** The mutations that `only` names, or all of them. */
export function select(
  file: MutationFile,
  only: readonly string[] | undefined,
): readonly Mutation[] {
  return only?.length
    ? file.mutations.filter(({ name }) => only.includes(name))
    : file.mutations;
}

/** The engines that `mutation` runs in, of those the run selects. */
const enginesOf = (
  mutation: Mutation,
  engines: readonly string[],
): readonly string[] =>
  mutation.engines
    ? engines.filter((e) => mutation.engines!.includes(e))
    : engines;

const expectationOf = (mutation: Mutation, engine: string): Expectation =>
  mutation.byEngine?.[engine]?.expect ?? mutation.expect;

/**
 * Refuses every edit whose text doesn't occur exactly once in its file at
 * `commit`, naming each one, before anything runs.
 */
export async function checkEdits(
  root: string,
  commit: string,
  mutations: readonly Mutation[],
): Promise<void> {
  const sources = new Map<string, Promise<string | undefined>>();
  const read = async (file: string): Promise<string | undefined> => {
    if (!sources.has(file)) {
      sources.set(
        file,
        check(['git', 'show', `${commit}:${file}`], root).catch(
          () => undefined,
        ),
      );
    }

    return await sources.get(file)!;
  };
  const stale: string[] = [];

  for (const { name, edits } of mutations) {
    for (const { file, text } of edits) {
      // oxlint-disable-next-line no-await-in-loop -- each file is read once
      const source = await read(file);
      const count = source === undefined ? 0 : source.split(text).length - 1;

      if (source === undefined) {
        stale.push(`${name}: ${file} doesn't exist at ${commit}`);
      } else if (count !== 1) {
        stale.push(
          `${name}: in ${file}, the text occurs ${count} times: ${JSON.stringify(text.slice(0, 80))}`,
        );
      }
    }
  }

  if (stale.length > 0) {
    throw new Refusal(`stale edits at ${commit}`, stale);
  }
}

/**
 * Refuses every selector that covers no row that ran unmutated in an engine
 * whose expectation uses it.
 */
function checkSelectors(
  mutations: readonly Mutation[],
  engines: readonly string[],
  baselines: ReadonlyMap<string, readonly Row[]>,
): void {
  const empty = mutations.flatMap((mutation) =>
    enginesOf(mutation, engines).flatMap((engine) => {
      const expect = expectationOf(mutation, engine);

      return 'fails' in expect
        ? expect.fails
            .filter(
              (selector) =>
                covered(selector, baselines.get(engine)!).length === 0,
            )
            .map(
              ({ file, row }) =>
                `${mutation.name}, ${engine}: ${file} > ${row} covers no row that ran`,
            )
        : [];
    }),
  );

  if (empty.length > 0) {
    throw new Refusal('selectors that cover no row', empty);
  }
}

export type RunOptions = Readonly<{
  /** The invoking repository's root. */
  root: string;
  /** The mutation file's path, as the report names it. */
  label: string;
  file: MutationFile;
  commit: string;
  config: Config;
  engines?: readonly string[];
  only?: readonly string[];
  /** The commit that holds the file, the config and the runner as they run. */
  fileCommit?: string;
  /** This leg's shard, from 1, and the count. */
  shard?: readonly [number, number];
  log(line: string): void;
}>;

/**
 * Runs the file's mutations at `commit` in a copy of the repository, which it
 * removes afterwards, also after a failure. On `SIGINT` or `SIGTERM` it stops
 * the command that runs, waits for it to exit, removes the copy and rejects
 * with {@link Interrupted}.
 */
export async function run(options: RunOptions): Promise<Report> {
  const { root, file, commit, config, log } = options;
  const [index, count] = options.shard ?? [1, 1];
  const engines = options.engines ?? file.engines;
  const mutations = select(file, options.only).filter(
    (_, at) => at % count === index - 1,
  );

  await checkEdits(root, commit, mutations);

  for (const dir of await removeStale(root)) {
    log(`removed a copy that an earlier run left: ${dir}`);
  }

  const copy = await createCopy(root, commit);
  const stop = new AbortController();
  let stoppedBy: NodeJS.Signals | undefined;
  const onSignal = (signal: NodeJS.Signals): void => {
    stoppedBy = signal;
    stop.abort();
  };
  const { signal } = stop;

  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    for (const command of config.setup) {
      log(`setup: ${command.join(' ')}`);
      // oxlint-disable-next-line no-await-in-loop -- in order
      await check(command, copy.dir, { quiet: false, signal });
    }

    const runAll = async (engine: string): Promise<VitestRun> => {
      const rows: Row[] = [];
      const errors: Record<string, readonly string[]> = {};
      const failure: string[] = [];
      const runError: string[] = [];

      for (const target of file.runs) {
        // oxlint-disable-next-line no-await-in-loop -- one Vitest at a time
        const result = await runVitest(
          copy.dir,
          target,
          config.engines[engine]!.env,
          signal,
        );
        rows.push(...result.rows);
        Object.assign(errors, result.errors);
        failure.push(...(result.failure ?? []));
        runError.push(...(result.runError ?? []));
      }

      return {
        rows,
        errors,
        ...(failure.length > 0 ? { failure } : {}),
        ...(runError.length > 0 ? { runError } : {}),
      };
    };
    const baselines = new Map<string, readonly Row[]>();
    const runErrors = new Map<string, readonly string[]>();

    for (const engine of engines) {
      log(`unmutated, ${engine}`);
      // oxlint-disable-next-line no-await-in-loop -- one engine at a time
      const { rows, failure, runError } = await runAll(engine);

      // The engine, not the file, failed: the run is a failure outside the
      // tests, which a later run may not repeat, and not a refusal.
      if (failure) {
        throw new Error(`unmutated, ${engine}: ${failure.join('\n')}`);
      }

      baselines.set(engine, rows);

      if (runError) {
        runErrors.set(engine, runError);
      }
    }

    checkSelectors(mutations, engines, baselines);

    const results = new Map<string, MutationResult[]>(
      engines.map((engine) => [engine, []]),
    );

    for (const mutation of mutations) {
      // oxlint-disable-next-line no-await-in-loop -- one mutation at a time
      await withMutation(copy.dir, config, mutation, signal, log, async () => {
        for (const engine of enginesOf(mutation, engines)) {
          log(`${mutation.name}, ${engine}`);
          const expect = expectationOf(mutation, engine);
          const engineReason = mutation.byEngine?.[engine]?.reason;
          // oxlint-disable-next-line no-await-in-loop -- one engine at a time
          const mutated = await runAll(engine);

          results.get(engine)!.push({
            name: mutation.name,
            group: mutation.group,
            expect,
            ...(engineReason ? { engineReason } : {}),
            ...judge(expect, baselines.get(engine)!, mutated),
            ...(mutated.runError ? { runError: mutated.runError } : {}),
          });
        }
      });
    }

    const legs: Leg[] = engines.map((engine) => ({
      engine,
      shard: [index, count],
      rows: baselines.get(engine)!,
      ...(runErrors.has(engine) ? { runError: runErrors.get(engine)! } : {}),
      mutations: results.get(engine)!,
    }));

    return {
      file: options.label,
      commit,
      ...(options.fileCommit ? { fileCommit: options.fileCommit } : {}),
      legs,
    };
  } catch (error) {
    throw stoppedBy ? new Interrupted(stoppedBy) : error;
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    await copy.remove();
  }
}

/**
 * Applies `mutation`'s edits in the copy, rebuilds what a matching edit needs,
 * calls `body`, and then restores the sources and rebuilds again.
 */
async function withMutation(
  dir: string,
  config: Config,
  mutation: Mutation,
  signal: AbortSignal,
  log: (line: string) => void,
  body: () => Promise<void>,
): Promise<void> {
  const files = [...new Set(mutation.edits.map(({ file }) => file))];
  const originals = new Map(
    await Promise.all(
      files.map(
        async (file) =>
          [file, await readFile(join(dir, file), 'utf8')] as const,
      ),
    ),
  );
  const rebuilds = (config.rebuilds ?? []).filter(({ files: pattern }) =>
    files.some((file) => matchesGlob(file, pattern)),
  );
  const rebuild = async (): Promise<void> => {
    for (const { command } of rebuilds) {
      log(`rebuild: ${command.join(' ')}`);
      // oxlint-disable-next-line no-await-in-loop -- in order
      await check(command, dir, { signal });
    }
  };

  try {
    for (const file of files) {
      let text = originals.get(file)!;

      for (const edit of mutation.edits) {
        if (edit.file === file) {
          text = text.replace(edit.text, () => edit.replacement);
        }
      }

      // oxlint-disable-next-line no-await-in-loop -- few files
      await writeFile(join(dir, file), text);
    }

    await rebuild();
    await body();
  } finally {
    await Promise.all(
      files.map(
        async (file) => await writeFile(join(dir, file), originals.get(file)!),
      ),
    );
    await rebuild();
  }
}

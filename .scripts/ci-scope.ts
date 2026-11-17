/**
 * `verify`'s mode (`repo:RD-15`). A run is `reduced` only if its commit _H_
 * carries `[noci]`, a last fully verified commit _B_ exists among `verify.yml`'s
 * recent successful runs, and every path that differs from _B_ to _H_ is a
 * record or Markdown. Every other case, a failure to read the API or the history
 * included, is `full`.
 *
 * `node .scripts/ci-scope.ts`, in a full-history checkout, with `EVENT` (the
 * event name), `HEAD_SHA` (_H_), `GITHUB_REPOSITORY` and a token `gh` reads. It
 * uses Node's built-in modules, `git` and `gh`, and installs nothing. It writes
 * `mode` to `GITHUB_OUTPUT` and a line to `GITHUB_STEP_SUMMARY` when those are
 * set, and exits non-zero only if it can't name a mode.
 */
import { execFile } from 'node:child_process';
import { appendFile } from 'node:fs/promises';

export type Mode = 'full' | 'reduced';

export type VerifiedRun = Readonly<{ sha: string; url: string }>;

export type Decision = Readonly<{
  mode: Mode;
  /** Why the mode is what it is. */
  reason: string;
  head: string;
  /** `null` when no last fully verified commit was found or looked for. */
  base: VerifiedRun | null;
  /** The paths in the range that are neither records nor Markdown. */
  fullPaths: readonly string[];
}>;

/** One `gh api` request: the parsed JSON answer for an API path. */
export type Api = (path: string) => Promise<unknown>;

export type DecideOptions = Readonly<{
  event: string;
  head: string;
  repository: string;
  /** The full-history checkout that `git` reads. */
  cwd: string;
  api: Api;
}>;

type WorkflowRuns = Readonly<{
  workflow_runs: ReadonlyArray<
    Readonly<{ id: number; head_sha: string; html_url: string }>
  >;
}>;

type RunJobs = Readonly<{
  jobs: ReadonlyArray<Readonly<{ name: string; conclusion: string | null }>>;
}>;

/** The jobs that make a successful run a full one. */
const FULL_JOBS: readonly string[] = [
  'static',
  'chromium',
  'firefox',
  'webkit',
  'docs',
];

const MARKER = '[noci]';

/** A path under a directory named `.plan`, at any depth, or a `.md` file. */
export function isRecordPath(path: string): boolean {
  return path.endsWith('.md') || path.split('/').slice(0, -1).includes('.plan');
}

export function hasMarker(message: string): boolean {
  return message.includes(MARKER);
}

type GitResult = Readonly<{ code: number; stdout: string }>;

/** Runs `git`, and resolves with its exit status whatever it is. */
function git(cwd: string, args: readonly string[]): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile(
      'git',
      [...args],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => {
        resolve({
          code: error ? (typeof error.code === 'number' ? error.code : -1) : 0,
          stdout,
        });
      },
    );
  });
}

/** Runs `git`, and resolves with its output, or rejects unless it exits 0. */
async function gitOutput(
  cwd: string,
  args: readonly string[],
): Promise<string> {
  const { code, stdout } = await git(cwd, args);

  if (code !== 0) {
    throw new Error(`git ${args.join(' ')} exited with ${code}`);
  }

  return stdout;
}

/**
 * Whether `ancestor` is `commit` or one of its ancestors. The checkout holds
 * `commit`'s whole history, so a commit it doesn't hold, such as the head of a
 * deleted branch, is not an ancestor.
 */
async function isAncestor(
  cwd: string,
  ancestor: string,
  commit: string,
): Promise<boolean> {
  if ((await git(cwd, ['cat-file', '-e', `${ancestor}^{commit}`])).code !== 0) {
    return false;
  }

  const { code } = await git(cwd, [
    'merge-base',
    '--is-ancestor',
    ancestor,
    commit,
  ]);

  // Exit status 1 is the answer _no_; any other failure is no answer.
  if (code > 1 || code < 0) {
    throw new Error(`git merge-base --is-ancestor exited with ${code}`);
  }

  return code === 0;
}

/**
 * _B_: among the ancestors of _H_, _H_ included, whose successful `verify` run
 * concluded every full-mode job with `success`, the newest, which is the one
 * with the fewest commits between it and _H_. A tie goes to the newer run.
 */
async function findBase(options: DecideOptions): Promise<VerifiedRun | null> {
  const { cwd, head, repository, api } = options;
  const { workflow_runs: runs } = (await api(
    `repos/${repository}/actions/workflows/verify.yml/runs?status=success&per_page=100`,
  )) as WorkflowRuns;

  const verified = await Promise.all(
    runs.map(async (run) => {
      if (!(await isAncestor(cwd, run.head_sha, head))) {
        return null;
      }

      const { jobs } = (await api(
        `repos/${repository}/actions/runs/${run.id}/jobs?per_page=100`,
      )) as RunJobs;
      const isFull = FULL_JOBS.every((name) =>
        jobs.some((job) => job.name === name && job.conclusion === 'success'),
      );

      if (!isFull) {
        return null;
      }

      const distance = Number(
        await gitOutput(cwd, [
          'rev-list',
          '--count',
          `${run.head_sha}..${head}`,
        ]),
      );

      return { sha: run.head_sha, url: run.html_url, distance };
    }),
  );

  let base: (VerifiedRun & Readonly<{ distance: number }>) | null = null;

  for (const candidate of verified) {
    if (candidate && (!base || candidate.distance < base.distance)) {
      base = candidate;
    }
  }

  return base && { sha: base.sha, url: base.url };
}

export async function decide(options: DecideOptions): Promise<Decision> {
  const { head } = options;
  const full = (
    reason: string,
    base: VerifiedRun | null = null,
    fullPaths: readonly string[] = [],
  ): Decision => ({
    mode: 'full',
    reason,
    head,
    base,
    fullPaths,
  });

  if (options.event === 'workflow_dispatch') {
    return full('a workflow_dispatch run is always full');
  }

  let message: string;
  try {
    message = await gitOutput(options.cwd, ['log', '-1', '--format=%B', head]);
  } catch (error) {
    return full(`the message of ${head} can't be read: ${String(error)}`);
  }

  if (!hasMarker(message)) {
    return full(`${head}'s message carries no ${MARKER}`);
  }

  let base: VerifiedRun | null;
  try {
    base = await findBase(options);
  } catch (error) {
    return full(
      `the last fully verified commit can't be found: ${String(error)}`,
    );
  }

  if (!base) {
    return full('no fully verified ancestor of the head was found');
  }

  let paths: string[];
  try {
    paths = (
      await gitOutput(options.cwd, [
        'diff',
        '--name-only',
        '--no-renames',
        base.sha,
        head,
      ])
    )
      .split('\n')
      .filter((path) => path !== '');
  } catch (error) {
    return full(`the range can't be computed: ${String(error)}`, base);
  }

  const fullPaths = paths.filter((path) => !isRecordPath(path));

  if (fullPaths.length > 0) {
    return full(
      'the range changes paths that are neither records nor Markdown',
      base,
      fullPaths,
    );
  }

  return {
    mode: 'reduced',
    reason: `${MARKER}, and every path in the range is a record or Markdown`,
    head,
    base,
    fullPaths,
  };
}

async function ghApi(path: string): Promise<unknown> {
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      'gh',
      ['api', path],
      { maxBuffer: 64 * 1024 * 1024 },
      (error, output) => {
        if (error) {
          reject(new Error(`gh api ${path} failed`, { cause: error }));
        } else {
          resolve(output);
        }
      },
    );
  });

  return JSON.parse(stdout);
}

if (import.meta.main) {
  const {
    EVENT,
    HEAD_SHA,
    GITHUB_REPOSITORY,
    GITHUB_OUTPUT,
    GITHUB_STEP_SUMMARY,
  } = process.env;

  if (!EVENT || !HEAD_SHA || !GITHUB_REPOSITORY) {
    throw new Error('EVENT, HEAD_SHA and GITHUB_REPOSITORY must be set');
  }

  const decision = await decide({
    event: EVENT,
    head: HEAD_SHA,
    repository: GITHUB_REPOSITORY,
    cwd: process.cwd(),
    api: ghApi,
  });

  const lines = [
    `H: ${decision.head}`,
    `B: ${decision.base ? `${decision.base.sha} (${decision.base.url})` : 'none'}`,
    `mode: ${decision.mode}, because ${decision.reason}`,
    ...decision.fullPaths.map((path) => `kept full by: ${path}`),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);

  if (GITHUB_OUTPUT) {
    await appendFile(GITHUB_OUTPUT, `mode=${decision.mode}\n`);
  }

  if (GITHUB_STEP_SUMMARY) {
    await appendFile(
      GITHUB_STEP_SUMMARY,
      `**verify mode: ${decision.mode}**, because ${decision.reason}.\n`,
    );
  }
}

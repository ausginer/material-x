/**
 * Protocol M-2″'s driver. Run from the package directory, on a scratch root
 * outside the repository:
 *
 * ```sh
 * node bench/m2pp/run.ts setup <root> <harness-revision>
 * node bench/m2pp/run.ts check <root>
 * node bench/m2pp/run.ts block <root> <1|2|3|4> [--no-d2]
 * ```
 *
 * `setup` builds the three trees and `check` confirms each src tree and that
 * every tree carries the same measurement code. `block` runs a block's fixed
 * runs and appends every attempt to `<root>/raw.jsonl`. It prints counts and
 * never a figure: the rule's computation is `rule.ts`, and it runs once, after
 * the last round.
 *
 * A run is rerun only if it fails a row or does not report every cell and every
 * reading. The failed attempt stays in the raw file with its output.
 */
/* oxlint-disable no-await-in-loop -- runs are one at a time by definition */
/* oxlint-disable no-console -- a driver reports to its terminal */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFile,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BLOCK_RUNS, schedule, type Run, type Tree } from './protocol.ts';
import { ALLOCATION_R } from './rule.ts';

const PACKAGE = 'packages/drag2';
const BASE_REVISION = '6905af249';
const EXPECTED_SRC: Readonly<Record<Tree, string>> = {
  base: '19f0b867e4094c764c11f1cf5016f7d2796fac98',
  input: '4630579d236624eb32f124268b1c026482f84da2',
  candidate: 'c0713204a55b24ffc44f9ac0a92d80efa28c7aeb',
};
const M2 = `${PACKAGE}/tests/perf/m2-prime.browser.test.ts`;
const ALLOCATION = `${PACKAGE}/tests/perf/d208-step6.browser.test.ts`;
const CONFIG = '.scripts/vitest-config.ts';
const SHIPPED_CONFIG = `${PACKAGE}/bench/shipped/vitest.config.ts`;
const RECORD = `${PACKAGE}/.plan/measurements/d208-step6.md`;
const DIFF_HEADING = "#### The candidate's whole diff";
const FLAG_OFF = "'--js-flags=--expose-gc'";
const FLAG_SWITCH =
  "process.env['M2PP_D2'] ? '--js-flags=--expose-gc --no-flush-bytecode' : '--js-flags=--expose-gc'";
/** Each of the two `M-2′` rows, three populations, eight readings, four fields. */
const LEDGER_LENGTH = 3 * 8 * 4;
const MAX_FAILURES = 6;
const RUN_TIMEOUT_MS = 1_500_000;
const KEPT_OUTPUT = 40_000;

type Result = Readonly<{ code: number | null; output: string }>;

function exec(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  timeout = RUN_TIMEOUT_MS,
): Promise<Result> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';

    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      output += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('close', (code) => {
      resolve({ code, output });
    });
  });
}

async function git(cwd: string, ...args: readonly string[]): Promise<string> {
  const { code, output } = await exec('git', args, cwd);

  if (code !== 0) {
    throw new Error(`git ${args.join(' ')}: ${output}`);
  }

  return output.trim();
}

/** The src tree a worktree holds on disk, read through a throwaway index. */
async function srcTree(tree: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'm2pp-index-'));
  const env = { ...process.env, GIT_INDEX_FILE: join(directory, 'index') };

  try {
    const steps = [
      ['read-tree', 'HEAD'],
      ['add', '--', `${PACKAGE}/src`],
      ['write-tree', `--prefix=${PACKAGE}/src/`],
    ];
    let last = '';

    for (const args of steps) {
      const { code, output } = await exec('git', args, tree, env);

      if (code !== 0) {
        throw new Error(`git ${args.join(' ')}: ${output}`);
      }

      last = output.trim();
    }

    return last;
  } finally {
    await rm(directory, { recursive: true });
  }
}

const sha = (text: string): string =>
  createHash('sha256').update(text).digest('hex');

const atBase = (text: string): string =>
  text.replaceAll('requestDestroy', 'destroy');

function candidateDiff(record: string): string {
  const after = record.slice(record.indexOf(DIFF_HEADING));
  const open = after.indexOf('```diff\n') + '```diff\n'.length;
  const close = after.indexOf('\n```\n', open);

  return `${after.slice(open, close)}\n`;
}

async function shareModules(shared: string, tree: string): Promise<void> {
  await symlink(join(shared, 'node_modules'), join(tree, 'node_modules'));

  for (const name of await readdir(join(shared, 'packages'))) {
    const modules = join(shared, 'packages', name, 'node_modules');
    const present = await readdir(modules).catch(() => null);
    const here = await readdir(join(tree, 'packages', name)).catch(() => null);

    if (present && here) {
      await symlink(modules, join(tree, 'packages', name, 'node_modules'));
    }
  }
}

async function switchFlag(tree: string): Promise<void> {
  const path = join(tree, CONFIG);
  const text = await readFile(path, 'utf8');

  if (text.split(FLAG_OFF).length !== 2) {
    throw new Error(`expected one flag site in ${path}`);
  }

  await writeFile(path, text.replace(FLAG_OFF, FLAG_SWITCH));
}

async function check(root: string): Promise<void> {
  for (const name of ['base', 'input', 'candidate'] as const) {
    const actual = await srcTree(join(root, name));

    console.log(`src tree ${name} ${actual}`);

    if (actual !== EXPECTED_SRC[name]) {
      throw new Error(`${name}: expected ${EXPECTED_SRC[name]}`);
    }
  }

  const input = await readFile(join(root, 'input', M2), 'utf8');
  const candidate = await readFile(join(root, 'candidate', M2), 'utf8');
  const base = await readFile(join(root, 'base', M2), 'utf8');
  const allocation = await readFile(join(root, 'input', ALLOCATION), 'utf8');
  const allocationAtCandidate = await readFile(
    join(root, 'candidate', ALLOCATION),
    'utf8',
  );

  if (input !== candidate || atBase(input) !== base) {
    throw new Error('the three trees differ in the retained-heap harness');
  }

  if (allocation !== allocationAtCandidate) {
    throw new Error('input and candidate differ in the allocation harness');
  }

  console.log(`harness m2-prime ${sha(input)}`);
  console.log(`harness d208-step6 ${sha(allocation)}`);
}

async function setup(root: string, revision: string): Promise<void> {
  const main = await git(process.cwd(), 'rev-parse', '--show-toplevel');
  const harness = await git(main, 'rev-parse', revision);

  await mkdir(root, { recursive: true });

  const revisions: Readonly<Record<Tree, string>> = {
    base: BASE_REVISION,
    input: harness,
    candidate: harness,
  };

  for (const name of ['base', 'input', 'candidate'] as const) {
    const tree = join(root, name);

    await git(main, 'worktree', 'add', '--detach', tree, revisions[name]);
    await shareModules(main, tree);
  }

  const input = join(root, 'input');
  const base = join(root, 'base');
  const candidate = join(root, 'candidate');
  const diffPath = join(root, 'candidate.diff');
  const record = await readFile(join(input, RECORD), 'utf8');

  await writeFile(diffPath, candidateDiff(record));
  await git(candidate, 'apply', diffPath);

  await mkdir(join(base, PACKAGE, 'bench/shipped'), { recursive: true });

  for (const path of [CONFIG, `${PACKAGE}/vitest.config.ts`, SHIPPED_CONFIG]) {
    await copyFile(join(input, path), join(base, path));
  }

  await writeFile(
    join(base, M2),
    atBase(await readFile(join(input, M2), 'utf8')),
  );
  await switchFlag(base);
  await switchFlag(candidate);

  for (const name of ['base', 'input', 'candidate'] as const) {
    // A structural run, with no measurement, so the first measured run in a
    // tree does not also build that tree's dependency cache.
    const { code, output } = await exec(
      'npx',
      [
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        '--project',
        'browser',
        'tests/perf/m2-prime.browser.test.ts',
        '-t',
        'declared behavior mix',
      ],
      join(root, name, PACKAGE),
    );

    if (code !== 0) {
      throw new Error(`warming ${name} failed:\n${output}`);
    }
  }

  await check(root);
}

function commandFor(run: Run): readonly string[] {
  return run.project === 'shipped'
    ? [
        'vitest',
        'run',
        '-c',
        'bench/shipped/vitest.config.ts',
        '--project',
        'shipped',
        '--reporter=verbose',
        'tests/perf/d208-step6.browser.test.ts',
      ]
    : run.set === 'Alloc'
      ? [
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--project',
          'browser',
          '--reporter=verbose',
          'tests/perf/d208-step6.browser.test.ts',
        ]
      : [
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--project',
          'browser',
          '--reporter=verbose',
          'tests/perf/m2-prime.browser.test.ts',
          '-t',
          'per-controller',
        ];
}

function envFor(run: Run): NodeJS.ProcessEnv {
  return {
    ...process.env,
    VITE_DRAG_MEASURE: '1',
    ...(run.mode === 'inject' ? { VITE_M2_INJECT: '1' } : {}),
    ...(run.mode === 'd1' ? { VITE_M2_QUIESCE: '1' } : {}),
    ...(run.mode === 'd2' ? { M2PP_D2: '1' } : {}),
  };
}

const JSON_LINE = (prefix: string, output: string): readonly unknown[] =>
  output
    .split('\n')
    .filter((line) => line.startsWith(prefix))
    .map((line) => JSON.parse(line.slice(prefix.length)) as unknown);

type Ledger = Readonly<{ count: number; readings: readonly number[] }>;
type Cell = Readonly<{ label: string }>;

function parsed(run: Run, output: string): Record<string, unknown> | null {
  if (run.set === 'Alloc') {
    const cells = JSON_LINE('D208-RAW ', output) as readonly Cell[];
    const labels = cells.map(({ label }) => label);

    return Object.keys(ALLOCATION_R).every(
      (cell) => labels.filter((label) => label === cell).length === 1,
    )
      ? {
          cells,
          counts: output
            .split('\n')
            .filter(
              (line) => line.startsWith('D208-6 ') && !line.includes(' per='),
            ),
        }
      : null;
  }

  const ledgers = JSON_LINE('M-2″ ledger ', output) as readonly Ledger[];
  const complete = [100, 1000].every((count) =>
    ledgers.some(
      (ledger) =>
        ledger.count === count &&
        ledger.readings.length === LEDGER_LENGTH &&
        ledger.readings.every((value, i) =>
          i % 4 === 3 ? Number.isFinite(value) : value > 0,
        ),
    ),
  );

  return complete && ledgers.length === 2 ? { ledgers } : null;
}

async function load(): Promise<number> {
  const text = await readFile('/proc/loadavg', 'utf8');

  return Number(text.split(' ')[0]);
}

type Attempt = Readonly<{ id: string; ok: boolean }>;

async function attempts(path: string): Promise<readonly Attempt[]> {
  const text = await readFile(path, 'utf8').catch(() => '');

  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Attempt);
}

async function block(
  root: string,
  number: number,
  skipD2: boolean,
): Promise<void> {
  const rawPath = join(root, 'raw.jsonl');
  const runs = schedule().filter(
    (run) => run.block === number && !(skipD2 && run.mode === 'd2'),
  );
  const past = await attempts(rawPath);
  const done = new Set(past.filter(({ ok }) => ok).map(({ id }) => id));
  let failures = past.filter(({ ok }) => !ok).length;
  let completed = runs.filter(({ id }) => done.has(id)).length;

  for (const run of runs) {
    if (done.has(run.id)) {
      continue;
    }

    let finished = false;

    while (!finished) {
      const started = new Date().toISOString();
      const loadAtStart = await load();
      const { code, output } = await exec(
        'npx',
        commandFor(run),
        join(root, run.tree, PACKAGE),
        envFor(run),
      );
      const data = code === 0 ? parsed(run, output) : null;
      const ok = data !== null;

      await appendFile(
        rawPath,
        `${JSON.stringify({
          ...run,
          ok,
          code,
          started,
          ended: new Date().toISOString(),
          load: [loadAtStart, await load()],
          ...(data ?? { output: output.slice(-KEPT_OUTPUT) }),
        })}\n`,
      );

      finished = ok;

      if (!ok) {
        failures += 1;
        console.log(`${run.id} did not report; failures so far ${failures}`);

        if (failures > MAX_FAILURES) {
          console.log('blocked: more than six failed runs');
          process.exit(3);
        }
      }
    }

    completed += 1;
    console.log(
      `block ${number}: ${completed}/${runs.length}, ${BLOCK_RUNS[number]} scheduled`,
    );
  }
}

const [command, root, argument, flag] = process.argv.slice(2);

if (command === 'setup') {
  await setup(root!, argument!);
} else if (command === 'check') {
  await check(root!);
} else if (command === 'block') {
  await block(root!, Number(argument), flag === '--no-d2');
} else {
  throw new Error(`unknown command ${command ?? ''}`);
}

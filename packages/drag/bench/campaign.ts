/* oxlint-disable no-await-in-loop, no-console -- a campaign runs its steps in order and prints its status */
/**
 * Runs a long measurement campaign: shell commands in order, each awaited until
 * its process exits, stopping at the first one that fails or at an interruption.
 *
 * `node bench/campaign.ts run [--dir d] [--id id] -- '<command>' ...` runs the
 * commands from the current directory. `--dir` defaults to this package's
 * `.campaigns`, and `--id` to the start time.
 * `node bench/campaign.ts status [--dir d] [--json] [id ...]` reports every run in
 * `--dir`, or the named ones.
 *
 * A run's directory `<dir>/<id>/` holds `status.json` and one log per step,
 * `<n>.log`, which receives the step's stdout and stderr directly. Nothing is
 * deleted. The status records each step's command, revision, process, start and
 * end times, exit code or signal, and log path.
 *
 * The runner writes the status only when a step's process has been spawned and
 * when it has exited, and does no work while it runs: the step's output goes to
 * its file descriptor, not through the runner. A measured section inside a
 * command therefore runs with the runner idle.
 *
 * A step runs in its own process group, so SIGINT, SIGTERM or SIGHUP to the runner
 * reaches the whole step, browsers included. The runner then waits for the step to
 * exit and records the run as interrupted. A runner that dies without recording
 * an end, from SIGKILL or a lost machine, is reported as interrupted by `status`,
 * which compares the recorded process with `/proc`; so this runs on Linux only.
 */
import {
  type ChildProcess,
  execFile as execFileCallback,
  spawn,
} from 'node:child_process';
import { once } from 'node:events';
import {
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';
import { constants } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

// eslint-disable-next-line @typescript-eslint/strict-void-return -- `promisify` takes the callback form as it is
const execFile = promisify(execFileCallback);
const DEFAULT_DIR = fileURLToPath(new URL('../.campaigns/', import.meta.url));
const STATUS = 'status.json';
const INTERRUPTS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

export type StepState =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'interrupted';
export type RunState = Exclude<StepState, 'pending'>;

/**
 * The process and its start time in clock ticks since boot, from `/proc`. Both
 * together identify a process, because a PID alone can be reused.
 */
export type ProcessIdentity = Readonly<{ pid: number; start: string }>;

export type Revision = Readonly<{ commit: string; dirty: boolean }>;

/** One step. The runner updates it in place as the step starts and ends. */
export type Step = {
  readonly command: string;
  readonly log: string;
  state: StepState;
  revision: Revision | null;
  process: ProcessIdentity | null;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

/** The content of `status.json`. The runner updates it in place. */
export type Status = {
  readonly id: string;
  readonly cwd: string;
  readonly runner: ProcessIdentity;
  state: RunState;
  readonly startedAt: string;
  endedAt: string | null;
  interruptedBy: NodeJS.Signals | null;
  readonly steps: readonly Step[];
};

/**
 * A run as `status` reports it. `state` differs from the recorded one only when
 * the recorded run is `running` and its runner no longer exists: then it is
 * `interrupted`. `stepAlive` says whether the step recorded as running still
 * exists, and is null when no step is recorded as running.
 */
export type Report = Readonly<{
  id: string;
  state: RunState;
  stepAlive: boolean | null;
  status: Status;
}>;

async function processStart(pid: number): Promise<string | null> {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8');
    // The fields after the parenthesised name start at field 3; the start time is field 22.
    return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]!;
  } catch {
    return null;
  }
}

async function isAlive({ pid, start }: ProcessIdentity): Promise<boolean> {
  return (await processStart(pid)) === start;
}

async function revision(): Promise<Revision | null> {
  try {
    const [{ stdout: commit }, { stdout: changes }] = await Promise.all([
      execFile('git', ['rev-parse', 'HEAD']),
      execFile('git', ['status', '--porcelain']),
    ]);
    return { commit: commit.trim(), dirty: changes !== '' };
  } catch {
    return null;
  }
}

async function save(dir: string, status: Status): Promise<void> {
  const temporary = join(dir, `${STATUS}.tmp`);
  await writeFile(temporary, `${JSON.stringify(status, null, 2)}\n`);
  await rename(temporary, join(dir, STATUS));
}

function exitCodeOf(signal: NodeJS.Signals): number {
  return 128 + constants.signals[signal];
}

/** Runs the commands in order and returns the runner's exit code. */
export async function run(
  dir: string,
  id: string,
  commands: readonly string[],
): Promise<number> {
  const runDir = resolve(dir, id);
  await mkdir(resolve(dir), { recursive: true });
  // Not recursive, so an existing run is never overwritten.
  await mkdir(runDir);

  const status: Status = {
    id,
    cwd: process.cwd(),
    runner: { pid: process.pid, start: (await processStart(process.pid))! },
    state: 'running',
    startedAt: new Date().toISOString(),
    endedAt: null,
    interruptedBy: null,
    steps: commands.map((command, index) => ({
      command,
      log: join(runDir, `${index + 1}.log`),
      state: 'pending',
      revision: null,
      process: null,
      startedAt: null,
      endedAt: null,
      exitCode: null,
      signal: null,
    })),
  };

  let child: ChildProcess | undefined;
  const interrupt = (signal: NodeJS.Signals) => {
    status.interruptedBy ??= signal;
    if (child) {
      try {
        process.kill(-child.pid!, signal);
      } catch {
        // The step's group has already exited; its exit is awaited below.
      }
    }
  };
  for (const signal of INTERRUPTS) {
    process.on(signal, interrupt);
  }

  await save(runDir, status);

  for (const step of status.steps) {
    step.revision = await revision();
    const log = await open(step.log, 'w');
    if (status.interruptedBy) {
      await log.close();
      break;
    }
    child = spawn(step.command, {
      shell: true,
      detached: true,
      stdio: ['ignore', log.fd, log.fd],
    });
    const exit = once(child, 'exit') as Promise<
      [number | null, NodeJS.Signals | null]
    >;
    await log.close();
    step.state = 'running';
    step.startedAt = new Date().toISOString();
    step.process = {
      pid: child.pid!,
      start: (await processStart(child.pid!))!,
    };
    await save(runDir, status);

    const [exitCode, signal] = await exit;
    child = undefined;
    step.endedAt = new Date().toISOString();
    step.exitCode = exitCode;
    step.signal = signal;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the signal handler sets it while the step runs
    step.state = status.interruptedBy
      ? 'interrupted'
      : exitCode === 0
        ? 'succeeded'
        : 'failed';
    if (step.state !== 'succeeded') {
      break;
    }
  }

  status.state = status.interruptedBy
    ? 'interrupted'
    : status.steps.some((step) => step.state === 'failed')
      ? 'failed'
      : 'succeeded';
  status.endedAt = new Date().toISOString();
  await save(runDir, status);
  for (const signal of INTERRUPTS) {
    process.off(signal, interrupt);
  }

  if (status.interruptedBy) {
    return exitCodeOf(status.interruptedBy);
  }
  const failed = status.steps.find((step) => step.state === 'failed');
  if (failed) {
    return failed.exitCode ?? exitCodeOf(failed.signal!);
  }
  return 0;
}

/** Reports the named runs in `dir`, or every run in it, sorted by id. */
export async function report(
  dir: string,
  ids?: readonly string[],
): Promise<Report[]> {
  const selected = ids?.length
    ? ids
    : (await readdir(dir, { withFileTypes: true }).catch(() => []))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
  const reports: Report[] = [];
  for (const id of selected.toSorted()) {
    let status: Status;
    try {
      status = JSON.parse(
        await readFile(join(dir, id, STATUS), 'utf8'),
      ) as Status;
    } catch {
      continue;
    }
    const running = status.steps.find((step) => step.state === 'running');
    reports.push({
      id,
      state:
        status.state === 'running' && !(await isAlive(status.runner))
          ? 'interrupted'
          : status.state,
      stepAlive: running?.process ? await isAlive(running.process) : null,
      status,
    });
  }
  return reports;
}

function describe({ state, stepAlive, status }: Report): string {
  const started = status.steps.filter((step) => step.state !== 'pending');
  const last = started.at(-1);
  const parts = [status.id, state, `${started.length}/${status.steps.length}`];
  if (last) {
    parts.push(
      last.signal ? `signal ${last.signal}` : `exit ${last.exitCode ?? '-'}`,
      JSON.stringify(last.command),
    );
  }
  if (stepAlive !== null) {
    parts.push(stepAlive ? 'step alive' : 'step gone');
  }
  return parts.join('  ');
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: 'string', default: DEFAULT_DIR },
      id: { type: 'string' },
      json: { type: 'boolean', default: false },
    },
  });
  const [subcommand, ...rest] = positionals;

  if (subcommand === 'run' && rest.length > 0) {
    process.exitCode = await run(
      values.dir,
      values.id ?? new Date().toISOString().replaceAll(':', '-'),
      rest,
    );
  } else if (subcommand === 'status') {
    const reports = await report(values.dir, rest);
    console.log(
      values.json
        ? JSON.stringify(reports, null, 2)
        : reports.map(describe).join('\n'),
    );
  } else {
    console.error(
      'usage: campaign.ts run [--dir d] [--id id] -- <command> ...\n       campaign.ts status [--dir d] [--json] [id ...]',
    );
    process.exitCode = 2;
  }
}

if (import.meta.main) {
  await main();
}

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Report, Status } from '../bench/campaign.ts';

const RUNNER = fileURLToPath(new URL('../bench/campaign.ts', import.meta.url));

function startRunner(
  dir: string,
  id: string,
  commands: readonly string[],
): ChildProcess {
  return spawn(
    process.execPath,
    [RUNNER, 'run', '--dir', dir, '--id', id, '--', ...commands],
    {
      stdio: 'ignore',
    },
  );
}

async function runToEnd(
  dir: string,
  id: string,
  commands: readonly string[],
): Promise<number> {
  const [code] = (await once(startRunner(dir, id, commands), 'exit')) as [
    number,
  ];
  return code;
}

async function readStatus(dir: string, id: string): Promise<Status> {
  return JSON.parse(
    await readFile(join(dir, id, 'status.json'), 'utf8'),
  ) as Status;
}

function statusCommand(dir: string, id: string): Report {
  const [report] = JSON.parse(
    execFileSync(
      process.execPath,
      [RUNNER, 'status', '--dir', dir, '--json', id],
      {
        encoding: 'utf8',
      },
    ),
  ) as Report[];
  return report!;
}

async function exists(path: string): Promise<boolean> {
  return await access(path).then(
    () => true,
    () => false,
  );
}

/** Polls until the condition holds; each check needs the previous one's answer. */
async function waitUntil(condition: () => Promise<boolean>): Promise<void> {
  // oxlint-disable-next-line no-await-in-loop -- polling is sequential
  while (!(await condition())) {
    // oxlint-disable-next-line no-await-in-loop -- polling is sequential
    await delay(20);
  }
}

/** Waits until the runner has recorded the first step's process. */
async function waitForFirstStep(dir: string, id: string): Promise<void> {
  await waitUntil(
    async () =>
      !!(await readStatus(dir, id).catch(() => null))?.steps[0]!.process,
  );
}

describe('campaign runner', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'campaign-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('a run whose steps all succeed', () => {
    let exitCode: number;
    let status: Status;

    beforeAll(async () => {
      exitCode = await runToEnd(dir, 'success', [
        'echo first',
        'echo second >&2',
      ]);
      status = await readStatus(dir, 'success');
    });

    it('should exit 0', () => {
      expect(exitCode).toBe(0);
    });

    it('should record the run as succeeded', () => {
      expect(status.state).toBe('succeeded');
    });

    it('should record each command with exit code 0', () => {
      expect(
        status.steps.map(({ command, state, exitCode: code }) => [
          command,
          state,
          code,
        ]),
      ).toEqual([
        ['echo first', 'succeeded', 0],
        ['echo second >&2', 'succeeded', 0],
      ]);
    });

    it("should write each step's stdout and stderr to its log", async () => {
      expect(
        await Promise.all(
          status.steps.map(async ({ log }) => await readFile(log, 'utf8')),
        ),
      ).toEqual(['first\n', 'second\n']);
    });

    it('should record the revision of each step', () => {
      const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim();

      expect(status.steps.map((step) => step.revision?.commit)).toEqual([
        commit,
        commit,
      ]);
    });

    it('should record ordered start and end times', () => {
      const times = [
        status.startedAt,
        ...status.steps.flatMap((step) => [step.startedAt!, step.endedAt!]),
        status.endedAt!,
      ].map((time) => Date.parse(time));

      expect(times).toEqual(times.toSorted((a, b) => a - b));
    });

    it('should be reported as succeeded', () => {
      expect(statusCommand(dir, 'success').state).toBe('succeeded');
    });
  });

  describe('a run with a failing step', () => {
    let exitCode: number;
    let status: Status;
    let marker: string;

    beforeAll(async () => {
      marker = join(dir, 'failure-marker');
      exitCode = await runToEnd(dir, 'failure', [
        'echo before',
        'echo failing; exit 3',
        `touch ${marker}`,
      ]);
      status = await readStatus(dir, 'failure');
    });

    it("should exit with the failing step's exit code", () => {
      expect(exitCode).toBe(3);
    });

    it('should record the run as failed', () => {
      expect(status.state).toBe('failed');
    });

    it('should record the failing step and its exit code', () => {
      expect(
        status.steps.map(({ state, exitCode: code }) => [state, code]),
      ).toEqual([
        ['succeeded', 0],
        ['failed', 3],
        ['pending', null],
      ]);
    });

    it('should not run the steps after the failure', async () => {
      expect(await exists(marker)).toBe(false);
    });

    it("should keep the failing step's log", async () => {
      expect(await readFile(status.steps[1]!.log, 'utf8')).toBe('failing\n');
    });

    it('should be reported as failed', () => {
      expect(statusCommand(dir, 'failure').state).toBe('failed');
    });
  });

  describe('a run whose runner receives SIGTERM during a step', () => {
    let runningReport: Report;
    let exitCode: number;
    let status: Status;
    let marker: string;

    beforeAll(async () => {
      marker = join(dir, 'interrupt-marker');
      const runner = startRunner(dir, 'interrupt', [
        'echo started; sleep 60',
        `touch ${marker}`,
      ]);
      const exit = once(runner, 'exit') as Promise<[number]>;
      await waitForFirstStep(dir, 'interrupt');
      // The step writes its log as it starts.
      await waitUntil(
        async () =>
          (await readFile(join(dir, 'interrupt', '1.log'), 'utf8')) !== '',
      );
      runningReport = statusCommand(dir, 'interrupt');
      runner.kill('SIGTERM');
      [exitCode] = await exit;
      status = await readStatus(dir, 'interrupt');
    });

    it('should be reported as running while the step runs', () => {
      expect([runningReport.state, runningReport.stepAlive]).toEqual([
        'running',
        true,
      ]);
    });

    it('should exit with the code of SIGTERM', () => {
      expect(exitCode).toBe(143);
    });

    it('should record the run as interrupted by SIGTERM', () => {
      expect([status.state, status.interruptedBy]).toEqual([
        'interrupted',
        'SIGTERM',
      ]);
    });

    it('should stop the step and record it as interrupted', () => {
      expect([status.steps[0]!.state, status.steps[0]!.signal]).toEqual([
        'interrupted',
        'SIGTERM',
      ]);
    });

    it('should not run the steps after the interruption', async () => {
      expect([status.steps[1]!.state, await exists(marker)]).toEqual([
        'pending',
        false,
      ]);
    });

    it("should keep the interrupted step's log", async () => {
      expect(await readFile(status.steps[0]!.log, 'utf8')).toBe('started\n');
    });

    it('should be reported as interrupted with no step alive', () => {
      const { state, stepAlive } = statusCommand(dir, 'interrupt');

      expect([state, stepAlive]).toEqual(['interrupted', null]);
    });
  });

  describe('a run whose runner is killed during a step', () => {
    let report: Report;
    let recorded: Status;

    beforeAll(async () => {
      const runner = startRunner(dir, 'killed', ['sleep 60']);
      await waitForFirstStep(dir, 'killed');
      runner.kill('SIGKILL');
      await once(runner, 'exit');
      report = statusCommand(dir, 'killed');
      recorded = await readStatus(dir, 'killed');
      // The step outlives its runner in its own process group; stop it.
      process.kill(-recorded.steps[0]!.process!.pid, 'SIGTERM');
    });

    it('should leave the recorded state as running', () => {
      expect(recorded.state).toBe('running');
    });

    it('should be reported as interrupted', () => {
      expect(report.state).toBe('interrupted');
    });

    it('should report that the orphaned step is still alive', () => {
      expect(report.stepAlive).toBe(true);
    });
  });
});

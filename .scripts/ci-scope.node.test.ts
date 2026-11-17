import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Api, decide, isRecordPath } from './ci-scope.ts';

const REPOSITORY = 'owner/repo';
const FULL_JOBS = ['static', 'chromium', 'firefox', 'webkit', 'docs'];

let root: string;

const git = async (...args: string[]): Promise<string> =>
  await new Promise((resolve, reject) => {
    execFile('git', args, { cwd: root }, (error, stdout) => {
      if (error) {
        reject(new Error(`git ${args.join(' ')} failed`, { cause: error }));
      } else {
        resolve(stdout.trim());
      }
    });
  });

/** Writes the files, commits them with the message, and returns the commit. */
async function commit(
  message: string,
  files: Readonly<Record<string, string>>,
): Promise<string> {
  await Promise.all(
    Object.entries(files).map(async ([path, text]) => {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), text);
    }),
  );
  await git('add', '-A');
  await git('commit', '-q', '--allow-empty', '-m', message);
  return await git('rev-parse', 'HEAD');
}

/** An API whose successful runs are `runs`, each with its jobs' conclusions. */
function api(
  runs: ReadonlyArray<
    Readonly<{ sha: string; jobs?: Readonly<Record<string, string>> }>
  >,
): Api {
  const answer = (path: string): unknown => {
    if (
      path.endsWith(
        '/actions/workflows/verify.yml/runs?status=success&per_page=100',
      )
    ) {
      return {
        workflow_runs: runs.map((run, id) => ({
          id,
          head_sha: run.sha,
          html_url: `https://example.test/runs/${id}`,
        })),
      };
    }

    const id = Number(/\/actions\/runs\/(\d+)\/jobs/u.exec(path)?.[1]);
    const jobs =
      runs[id]?.jobs ??
      Object.fromEntries(FULL_JOBS.map((name) => [name, 'success']));
    return {
      jobs: Object.entries(jobs).map(([name, conclusion]) => ({
        name,
        conclusion,
      })),
    };
  };

  return async (path) => await Promise.resolve(answer(path));
}

const run = async (head: string, runApi: Api, event = 'pull_request') =>
  await decide({ event, head, repository: REPOSITORY, cwd: root, api: runApi });

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ci-scope-'));
  await git('init', '-q', '-b', 'main');
  await git('config', 'user.email', 'test@example.test');
  await git('config', 'user.name', 'test');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('isRecordPath', () => {
  it('should accept a path under a root .plan directory', () => {
    expect(isRecordPath('.plan/ci-speed-1/report.json')).toBe(true);
  });

  it('should accept a path under a package .plan directory', () => {
    expect(isRecordPath('packages/drag/.plan/00-index.md')).toBe(true);
    expect(isRecordPath('packages/drag/.plan/measurements/run.ts')).toBe(true);
  });

  it('should accept a .md file anywhere', () => {
    expect(isRecordPath('packages/core/README.md')).toBe(true);
  });

  it('should refuse a .mdx file', () => {
    expect(isRecordPath('.storybook/docs/Intro.mdx')).toBe(false);
  });

  it('should refuse a source file', () => {
    expect(isRecordPath('packages/drag/src/plan.ts')).toBe(false);
  });

  it('should refuse a file named .plan', () => {
    expect(isRecordPath('packages/drag/.plan')).toBe(false);
  });
});

describe('decide', () => {
  it('should reduce a marked commit that changes only records since the verified one', async () => {
    const base = await commit('src', { 'src/a.ts': '1' });
    const head = await commit('[noci] drag: changed plan', {
      'packages/drag/.plan/00-index.md': 'x',
      '.plan/checks/reading.txt': 'y',
      'README.md': 'z',
    });

    const decision = await run(head, api([{ sha: base }]));

    expect(decision.mode).toBe('reduced');
    expect(decision.base?.sha).toBe(base);
  });

  it('should keep a marked commit full when the range changes a .mdx file', async () => {
    const base = await commit('src', { 'src/a.ts': '1' });
    const head = await commit('[noci] docs', { '.storybook/Intro.mdx': 'x' });

    const decision = await run(head, api([{ sha: base }]));

    expect(decision.mode).toBe('full');
    expect(decision.fullPaths).toEqual(['.storybook/Intro.mdx']);
  });

  it('should count both paths of a rename out of .plan', async () => {
    await commit('plan', { '.plan/probe.ts': 'export {};\n' });
    const base = await git('rev-parse', 'HEAD');
    await git('mv', '.plan/probe.ts', 'probe.ts');
    const head = await commit('[noci] move', {});

    const decision = await run(head, api([{ sha: base }]));

    expect(decision.mode).toBe('full');
    expect(decision.fullPaths).toEqual(['probe.ts']);
  });

  it('should count the source path of a rename into .plan', async () => {
    await commit('src', { 'src/probe.ts': 'export {};\n' });
    const base = await git('rev-parse', 'HEAD');
    await mkdir(join(root, '.plan'));
    await git('mv', 'src/probe.ts', '.plan/probe.ts');
    const head = await commit('[noci] move', {});

    const decision = await run(head, api([{ sha: base }]));

    expect(decision.mode).toBe('full');
    expect(decision.fullPaths).toEqual(['src/probe.ts']);
  });

  it('should count every path a merge commit brings', async () => {
    const base = await commit('src', { 'src/a.ts': '1' });
    await git('checkout', '-q', '-b', 'side');
    await commit('side', { 'src/b.ts': '2' });
    await git('checkout', '-q', 'main');
    await commit('plan', { '.plan/a.md': 'x' });
    await git('merge', '-q', '--no-ff', '-m', '[noci] merge side', 'side');
    const head = await git('rev-parse', 'HEAD');

    const decision = await run(head, api([{ sha: base }]));

    expect(decision.mode).toBe('full');
    expect(decision.fullPaths).toEqual(['src/b.ts']);
  });

  it('should reduce an empty range', async () => {
    const head = await commit('[noci] verified already', { 'src/a.ts': '1' });

    const decision = await run(head, api([{ sha: head }]));

    expect(decision.mode).toBe('reduced');
    expect(decision.base?.sha).toBe(head);
  });

  it('should keep a commit without the marker full', async () => {
    const base = await commit('src', { 'src/a.ts': '1' });
    const head = await commit('drag: changed plan', { '.plan/a.md': 'x' });

    const decision = await run(head, api([{ sha: base }]));

    expect(decision.mode).toBe('full');
    expect(decision.base).toBeNull();
  });

  it('should not read [no ci] with a space as the marker', async () => {
    const base = await commit('src', { 'src/a.ts': '1' });
    const head = await commit('[no ci] drag: changed plan', {
      '.plan/a.md': 'x',
    });

    const decision = await run(head, api([{ sha: base }]));

    expect(decision.mode).toBe('full');
  });

  it('should keep a run full when no fully verified commit exists', async () => {
    const head = await commit('[noci] plan', { '.plan/a.md': 'x' });

    const decision = await run(head, api([]));

    expect(decision.mode).toBe('full');
    expect(decision.reason).toContain('no fully verified ancestor');
  });

  it('should not count a successful run in which a full-mode job was skipped', async () => {
    const base = await commit('src', { 'src/a.ts': '1' });
    const head = await commit('[noci] plan', { '.plan/a.md': 'x' });
    const reduced = {
      ...Object.fromEntries(FULL_JOBS.map((name) => [name, 'skipped'])),
      records: 'success',
    };

    const decision = await run(head, api([{ sha: base, jobs: reduced }]));

    expect(decision.mode).toBe('full');
    expect(decision.base).toBeNull();
  });

  it('should keep a run full when the API fails', async () => {
    await commit('src', { 'src/a.ts': '1' });
    const head = await commit('[noci] plan', { '.plan/a.md': 'x' });
    const failing: Api = async () =>
      await Promise.reject(new Error('HTTP 502'));

    const decision = await run(head, failing);

    expect(decision.mode).toBe('full');
    expect(decision.reason).toContain('HTTP 502');
  });

  it('should not take a verified commit that is not an ancestor as B', async () => {
    await commit('src', { 'src/a.ts': '1' });
    await git('checkout', '-q', '-b', 'side');
    const side = await commit('side', { 'src/b.ts': '2' });
    await git('checkout', '-q', 'main');
    const head = await commit('[noci] plan', { '.plan/a.md': 'x' });

    const decision = await run(
      head,
      api([{ sha: side }, { sha: 'f'.repeat(40) }]),
    );

    expect(decision.mode).toBe('full');
    expect(decision.base).toBeNull();
  });

  it('should take the verified ancestor nearest the head as B', async () => {
    const older = await commit('src', { 'src/a.ts': '1' });
    const newer = await commit('src again', { 'src/a.ts': '2' });
    const head = await commit('[noci] plan', { '.plan/a.md': 'x' });

    const decision = await run(head, api([{ sha: older }, { sha: newer }]));

    expect(decision.mode).toBe('reduced');
    expect(decision.base?.sha).toBe(newer);
  });

  it('should keep a workflow_dispatch run full', async () => {
    const head = await commit('[noci] plan', { '.plan/a.md': 'x' });

    const decision = await run(head, api([{ sha: head }]), 'workflow_dispatch');

    expect(decision.mode).toBe('full');
  });
});

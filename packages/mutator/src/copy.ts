import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { check, exec } from './process.ts';

export type Copy = Readonly<{
  dir: string;
  remove(): Promise<void>;
}>;

/** The lock reason of a copy: the tool's name and the process that owns it. */
const LOCK = /^mutator (\d+)$/u;

/** Whether the process `pid` still runs. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Unlocks and removes the worktree at `dir`, and its temporary parent. */
async function removeWorktree(root: string, dir: string): Promise<void> {
  await exec(['git', 'worktree', 'unlock', dir], root);
  await exec(['git', 'worktree', 'remove', '--force', dir], root);
  await exec(['git', 'worktree', 'prune'], root);
  await rm(dirname(dir), { recursive: true, force: true });
}

/**
 * Removes the copies that an earlier run left behind: the worktrees locked by
 * this tool for a process that no longer runs, as when it was killed.
 */
export async function removeStale(root: string): Promise<readonly string[]> {
  const listing = await check(['git', 'worktree', 'list', '--porcelain'], root);
  const stale = listing
    .split('\n\n')
    .map((entry) => {
      const lines = entry.split('\n');
      const path = lines.find((line) => line.startsWith('worktree '))?.slice(9);
      const pid = LOCK.exec(
        lines.find((line) => line.startsWith('locked '))?.slice(7) ?? '',
      )?.[1];

      return path && pid && !alive(Number(pid)) ? path : undefined;
    })
    .filter((path) => path !== undefined);

  for (const dir of stale) {
    // oxlint-disable-next-line no-await-in-loop -- git locks its admin files
    await removeWorktree(root, dir);
  }

  return stale;
}

/**
 * A detached worktree of the repository at `root`, at `commit`, in a temporary
 * directory, locked for this process. It changes no file and no ref of the
 * invoking checkout. `remove` removes it, and a run that can't, such as a
 * killed one, leaves it for the next run to remove.
 */
export async function createCopy(root: string, commit: string): Promise<Copy> {
  const parent = await mkdtemp(join(tmpdir(), 'mutator-'));
  const dir = join(parent, 'copy');
  const remove = async (): Promise<void> => {
    await removeWorktree(root, dir);
  };

  try {
    await check(
      [
        'git',
        'worktree',
        'add',
        '--quiet',
        '--detach',
        '--lock',
        '--reason',
        `mutator ${process.pid}`,
        dir,
        commit,
      ],
      root,
    );
  } catch (error) {
    await remove();
    throw error;
  }

  return { dir, remove };
}

import { execFile } from 'node:child_process';
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const CL = join(import.meta.dirname, 'cl.sh');

/** Prints each argument on its own line, then the working directory. */
const STUB_CLAUDE = `#!/usr/bin/env sh
for arg do printf '%s\\n' "$arg"; done
printf 'cwd=%s\\n' "$PWD"
`;

/** Answers that every directory is a mount point. */
const STUB_MOUNTPOINT = '#!/usr/bin/env sh\nexit 0\n';

type Run = Readonly<{ code: number; stdout: string; stderr: string }>;

let scratch: string;
/** The clone `cl` runs from; its `origin` is a sibling repository. */
let checkout: string;
/** Holds the stub `claude`. */
let bin: string;
/** Holds the stub `mountpoint`, on `PATH` only where a case puts it. */
let mountBin: string;
/** The slot root that `CL_SLOT_ROOT` gives `cl`. */
let slots: string;

async function exec(
  file: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Run> {
  return await new Promise((resolve) => {
    execFile(file, args, { cwd, env }, (error, stdout, stderr) => {
      resolve({ code: error ? Number(error.code) : 0, stdout, stderr });
    });
  });
}

async function git(cwd: string, ...args: string[]): Promise<string> {
  const run = await exec(
    'git',
    ['-c', 'user.name=cl', '-c', 'user.email=cl@example.test', ...args],
    cwd,
  );
  if (run.code !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${run.stderr}`);
  }
  return run.stdout.trim();
}

/** Writes a role definition whose frontmatter is `frontmatter`. */
async function define(
  root: string,
  agent: string,
  frontmatter: string,
): Promise<void> {
  await writeFile(
    join(root, '.claude/agents', `${agent}.md`),
    `---\nname: ${agent}\n${frontmatter}---\n\nBody.\neffort: low\n`,
  );
}

/** Runs the checkout's `cl.sh` with the stub `claude` first on `PATH`. */
async function cl(
  args: readonly string[],
  options: Readonly<{ mounted?: boolean; effortLevel?: string }> = {},
): Promise<Run> {
  const path = [bin, ...(options.mounted === false ? [] : [mountBin])];
  return await exec(join(checkout, '.scripts/cl.sh'), args, tmpdir(), {
    ...process.env,
    CLAUDE_CODE_EFFORT_LEVEL: options.effortLevel,
    CL_SLOT_ROOT: slots,
    PATH: `${path.join(':')}:${process.env['PATH']}`,
  });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'cl-'));
  const origin = join(scratch, 'origin');
  checkout = join(scratch, 'checkout');
  bin = join(scratch, 'bin');
  mountBin = join(scratch, 'mount-bin');
  slots = join(scratch, 'slots');
  await Promise.all(
    [
      join(origin, '.scripts'),
      join(origin, '.claude/agents'),
      bin,
      mountBin,
      slots,
    ].map(async (dir) => await mkdir(dir, { recursive: true })),
  );
  await copyFile(CL, join(origin, '.scripts/cl.sh'));
  await define(origin, 'architect', 'model: opus\neffort: high\n');
  await define(origin, 'implementer', 'model: opus\neffort: medium\n');
  await define(origin, 'coordinator', 'model: opus\neffort: medium\n');
  await git(origin, 'init', '-q', '-b', 'main');
  await git(origin, 'add', '-A');
  await git(origin, 'commit', '-q', '-m', 'roles');
  await git(scratch, 'clone', '-q', origin, checkout);
  await writeFile(join(bin, 'claude'), STUB_CLAUDE);
  await chmod(join(bin, 'claude'), 0o755);
  await writeFile(join(mountBin, 'mountpoint'), STUB_MOUNTPOINT);
  await chmod(join(mountBin, 'mountpoint'), 0o755);
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe('cl', () => {
  describe('effort', () => {
    it('should pass the effort the architect definition declares', async () => {
      const run = await cl(['architect']);
      expect(run.code).toBe(0);
      expect(run.stdout).toBe(
        `--agent\narchitect\n--effort\nhigh\n--resume\nMx Architect\ncwd=${checkout}\n`,
      );
    });

    it('should pass the effort the implementer definition declares', async () => {
      const run = await cl(['implementer']);
      expect(run.stdout).toContain('--effort\nmedium\n');
    });

    it('should pass a changed effort from the definition', async () => {
      await define(checkout, 'implementer', 'model: opus\neffort: xhigh\n');
      const run = await cl(['implementer']);
      expect(run.stdout).toContain('--effort\nxhigh\n');
    });

    it('should refuse a definition without effort', async () => {
      await define(checkout, 'implementer', 'model: opus\n');
      const run = await cl(['implementer']);
      expect(run.code).toBe(78);
      expect(run.stdout).toBe('');
    });

    it('should refuse a missing definition', async () => {
      await rm(join(checkout, '.claude/agents/implementer.md'));
      const run = await cl(['implementer']);
      expect(run.code).toBe(78);
      expect(run.stdout).toBe('');
    });

    it('should refuse a set CLAUDE_CODE_EFFORT_LEVEL', async () => {
      const run = await cl(['architect'], { effortLevel: 'low' });
      expect(run.code).toBe(78);
      expect(run.stdout).toBe('');
    });

    it('should read the repository definitions at their declared levels', async () => {
      const declared = async (agent: string): Promise<string | undefined> =>
        /^effort: (\S+)$/mu.exec(
          await readFile(
            join(import.meta.dirname, '../.claude/agents', `${agent}.md`),
            'utf8',
          ),
        )?.[1];
      expect(await declared('architect')).toBe('high');
      expect(await declared('implementer')).toBe('medium');
    });
  });

  describe('sessions', () => {
    it('should name the session instead of resuming it with --init', async () => {
      const run = await cl(['--init', 'architect']);
      expect(run.stdout).toContain('--name\nMx Architect\n');
      expect(run.stdout).not.toContain('--resume');
    });

    it('should keep the coordinator in the main checkout', async () => {
      const run = await cl(['coordinator']);
      expect(run.stdout).toBe(
        `--agent\ncoordinator\n--effort\nmedium\n--resume\nMx Coordinator\ncwd=${checkout}\n`,
      );
    });

    it('should exit 64 for an unknown profile', async () => {
      expect((await cl(['nobody'])).code).toBe(64);
    });
  });

  describe('slots', () => {
    it('should create a missing slot locked and detached at origin/main', async () => {
      const run = await cl(['implementer', 'b']);
      const dir = join(slots, 'b');
      expect(run.code).toBe(0);
      expect(run.stdout).toBe(
        `--agent\nimplementer\n--effort\nmedium\n--resume\nMx Implementer B\ncwd=${dir}\n`,
      );
      const list = await git(checkout, 'worktree', 'list', '--porcelain');
      const head = await git(checkout, 'rev-parse', 'origin/main');
      expect(list).toContain(
        `worktree ${dir}\nHEAD ${head}\ndetached\nlocked session slot`,
      );
    });

    it('should name the slot session instead of resuming it with --init', async () => {
      const run = await cl(['--init', 'implementer', 'b']);
      expect(run.stdout).toContain('--name\nMx Implementer B\n');
      expect(run.stdout).not.toContain('--resume');
    });

    it('should reuse an existing slot without touching it', async () => {
      await cl(['implementer', 'b']);
      const dir = join(slots, 'b');
      await writeFile(join(dir, 'untracked.txt'), 'kept\n');
      await git(dir, 'commit', '-q', '--allow-empty', '-m', 'slot work');
      const head = await git(dir, 'rev-parse', 'HEAD');

      const run = await cl(['implementer', 'b']);

      expect(run.code).toBe(0);
      expect(await readFile(join(dir, 'untracked.txt'), 'utf8')).toBe('kept\n');
      expect(await git(dir, 'rev-parse', 'HEAD')).toBe(head);
    });

    it('should read the effort from the slot definition', async () => {
      await define(checkout, 'implementer', 'model: opus\neffort: xhigh\n');
      const run = await cl(['implementer', 'b']);
      expect(run.stdout).toContain('--effort\nmedium\n');
    });

    it('should exit 64 for an upper-case slot', async () => {
      expect((await cl(['implementer', 'B'])).code).toBe(64);
    });

    it('should exit 64 for a two-letter slot', async () => {
      expect((await cl(['implementer', 'bb'])).code).toBe(64);
    });

    it('should exit 64 for the main slot letter', async () => {
      expect((await cl(['implementer', 'a'])).code).toBe(64);
    });

    it('should refuse a slot root that is not a mount point and create nothing', async () => {
      const run = await cl(['implementer', 'b'], { mounted: false });
      expect(run.code).not.toBe(0);
      expect(run.stdout).toBe('');
      expect(run.stderr).toContain(`${slots} is not a mount point`);
      expect(run.stderr).toContain('_worktrees volume');
      expect(await readdir(slots)).toEqual([]);
      expect(await exists(join(checkout, '.git/worktrees'))).toBe(false);
    });
  });
});

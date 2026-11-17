import { execFile } from 'node:child_process';
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
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

type Run = Readonly<{ code: number; stdout: string; stderr: string }>;

let root: string;
let bin: string;

/** Writes a role definition whose frontmatter is `frontmatter`. */
async function define(agent: string, frontmatter: string): Promise<void> {
  await writeFile(
    join(root, '.claude/agents', `${agent}.md`),
    `---\nname: ${agent}\n${frontmatter}---\n\nBody.\neffort: low\n`,
  );
}

/** Runs the copied `cl.sh` with the stub `claude` first on `PATH`. */
async function cl(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>> = {},
): Promise<Run> {
  return await new Promise((resolve) => {
    execFile(
      join(root, '.scripts/cl.sh'),
      args,
      {
        cwd: tmpdir(),
        env: {
          ...process.env,
          CLAUDE_CODE_EFFORT_LEVEL: undefined,
          ...env,
          PATH: `${bin}:${process.env['PATH']}`,
        },
      },
      (error, stdout, stderr) => {
        resolve({ code: error ? Number(error.code) : 0, stdout, stderr });
      },
    );
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cl-'));
  bin = join(root, 'bin');
  await mkdir(join(root, '.scripts'));
  await mkdir(join(root, '.claude/agents'), { recursive: true });
  await mkdir(bin);
  await copyFile(CL, join(root, '.scripts/cl.sh'));
  await writeFile(join(bin, 'claude'), STUB_CLAUDE);
  await chmod(join(bin, 'claude'), 0o755);
  await define('architect', 'model: opus\neffort: high\n');
  await define('implementer', 'model: opus\neffort: medium\n');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('cl', () => {
  it('should pass the effort the architect definition declares', async () => {
    const run = await cl(['architect']);
    expect(run.code).toBe(0);
    expect(run.stdout).toBe(
      `--agent\narchitect\n--effort\nhigh\n--resume\nMx Architect\ncwd=${root}\n`,
    );
  });

  it('should pass the effort the implementer definition declares', async () => {
    const run = await cl(['implementer']);
    expect(run.stdout).toContain('--effort\nmedium\n');
  });

  it('should pass a changed effort from the definition', async () => {
    await define('implementer', 'model: opus\neffort: xhigh\n');
    const run = await cl(['implementer']);
    expect(run.stdout).toContain('--effort\nxhigh\n');
  });

  it('should name the session instead of resuming it with --init', async () => {
    const run = await cl(['--init', 'architect']);
    expect(run.stdout).toContain('--name\nMx Architect\n');
    expect(run.stdout).not.toContain('--resume');
  });

  it('should refuse a definition without effort', async () => {
    await define('implementer', 'model: opus\n');
    const run = await cl(['implementer']);
    expect(run.code).toBe(78);
    expect(run.stdout).toBe('');
  });

  it('should refuse a missing definition', async () => {
    await rm(join(root, '.claude/agents/implementer.md'));
    const run = await cl(['implementer']);
    expect(run.code).toBe(78);
    expect(run.stdout).toBe('');
  });

  it('should refuse a set CLAUDE_CODE_EFFORT_LEVEL', async () => {
    const run = await cl(['architect'], { CLAUDE_CODE_EFFORT_LEVEL: 'low' });
    expect(run.code).toBe(78);
    expect(run.stdout).toBe('');
  });

  it('should exit 64 for an unknown profile', async () => {
    const run = await cl(['nobody']);
    expect(run.code).toBe(64);
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

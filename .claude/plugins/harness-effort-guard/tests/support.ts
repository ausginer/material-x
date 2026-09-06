import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type Run = Readonly<{
  code: number;
  stdout: string;
  stderr: string;
}>;

/** The plugin's own `scripts/` directory, so tests address the real entrypoints. */
export const SCRIPTS = join(import.meta.dirname, '..', 'scripts');

/**
 * A throwaway project root holding `.claude/agents/<name>` for each entry.
 *
 * Fixtures rather than the repository's own roles: a test asserting that
 * `haiku` resolves as exempt must keep saying so after `explore.md` is edited
 * or retired, and the guard's contract is about definitions, not about which
 * ones this tree happens to carry today.
 */
export async function project(
  definitions: Readonly<Record<string, string>>,
  prefix = 'harness-effort-guard-',
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const dir = join(root, '.claude', 'agents');

  await mkdir(dir, { recursive: true });
  await Promise.all(
    Object.entries(definitions).map(([name, body]) =>
      writeFile(join(dir, name), body),
    ),
  );

  return root;
}

/**
 * A project root whose `.claude/agents` exists and cannot be read: the name is
 * a symlink to itself, so every `stat` and `readdir` of it fails with `ELOOP`.
 *
 * A self-loop rather than an unreadable mode, because a mode fixture asserts
 * nothing when the suite runs as root, and nothing here should depend on which
 * user is running it. It stands for the whole class the guard must not read as
 * absence — permissions, loops, I/O errors — since the classification is by
 * error code and treats them alike.
 */
export async function unreadableDomain(): Promise<string> {
  const root = await mkdtemp(
    join(tmpdir(), 'harness-effort-guard-unreadable-'),
  );

  await mkdir(join(root, '.claude'), { recursive: true });
  await symlink('agents', join(root, '.claude', 'agents'));

  return root;
}

/** A role definition carrying `fields` as its frontmatter. */
export function definition(fields: string): string {
  return `---\n${fields}\n---\n\nDo the work.\n`;
}

export type Options = Readonly<{
  cwd?: string;
  env?: Readonly<Record<string, string | undefined>>;
  input?: string;
}>;

/**
 * Run a command to completion, reporting its exit status rather than throwing.
 *
 * A non-zero exit is the subject of several cases here, so it is a value the
 * assertion reads. An `undefined` in `env` unsets that variable for the child,
 * which is how a case states independence from the ambient environment.
 */
export async function run(
  command: string,
  args: readonly string[],
  { cwd, env, input = '' }: Options = {},
): Promise<Run> {
  const child = spawn(command, [...args], {
    cwd,
    env: { ...process.env, ...env },
  });
  const out: Buffer[] = [];
  const err: Buffer[] = [];

  child.stdout.on('data', (chunk: Buffer) => out.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => err.push(chunk));
  child.stdin.end(input);

  const code = await new Promise<number>((resolve) => {
    child.on('close', (status) => resolve(status ?? 0));
  });

  return {
    code,
    stdout: Buffer.concat(out).toString('utf8'),
    stderr: Buffer.concat(err).toString('utf8'),
  };
}

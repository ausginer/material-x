import { spawn } from 'node:child_process';

export type Result = Readonly<{ code: number; stdout: string; stderr: string }>;

/**
 * Runs `command` in `cwd` and resolves with its exit code and output. With
 * `quiet` off, the output goes to this process's standard error too, so a long
 * setup or test run shows progress.
 */
export async function exec(
  command: readonly string[],
  cwd: string,
  env: Readonly<Record<string, string>> = {},
  quiet = true,
): Promise<Result> {
  const [program, ...args] = command;

  return await new Promise((done, reject) => {
    const child = spawn(program!, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => {
      out.push(chunk);

      if (!quiet) {
        process.stderr.write(chunk);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      err.push(chunk);

      if (!quiet) {
        process.stderr.write(chunk);
      }
    });
    child.on('error', reject);
    child.on('close', (code) => {
      done({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      });
    });
  });
}

/** Runs `command` and rejects, with its output, unless it exits with 0. */
export async function check(
  command: readonly string[],
  cwd: string,
  env?: Readonly<Record<string, string>>,
  quiet?: boolean,
): Promise<string> {
  const result = await exec(command, cwd, env, quiet);

  if (result.code !== 0) {
    throw new Error(
      `${command.join(' ')} exited with ${result.code} in ${cwd}\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

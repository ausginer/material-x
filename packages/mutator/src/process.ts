import { spawn } from 'node:child_process';

export type Result = Readonly<{ code: number; stdout: string; stderr: string }>;

export type ExecOptions = Readonly<{
  env?: Readonly<Record<string, string>>;
  /** With `quiet` off, the output goes to this process's standard error too. */
  quiet?: boolean;
  /** Stops the command with `SIGTERM` when it aborts. */
  signal?: AbortSignal;
}>;

/**
 * Runs `command` in `cwd` and resolves with its exit code and output. A command
 * that `signal` stops rejects with the abort's reason once it has exited, so
 * nothing that it writes outlives the call.
 */
export async function exec(
  command: readonly string[],
  cwd: string,
  { env = {}, quiet = true, signal }: ExecOptions = {},
): Promise<Result> {
  const [program, ...args] = command;

  return await new Promise((done, reject) => {
    const child = spawn(program!, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(signal ? { signal } : {}),
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let failure: Error | undefined;

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
    child.on('error', (error) => {
      // A command that never started has nothing to wait for.
      if (child.pid === undefined) {
        reject(error);
      } else {
        failure = error;
      }
    });
    child.on('close', (code) => {
      if (failure !== undefined) {
        reject(failure);
      } else {
        done({
          code: code ?? 1,
          stdout: Buffer.concat(out).toString('utf8'),
          stderr: Buffer.concat(err).toString('utf8'),
        });
      }
    });
  });
}

/** Runs `command` and rejects, with its output, unless it exits with 0. */
export async function check(
  command: readonly string[],
  cwd: string,
  options?: ExecOptions,
): Promise<string> {
  const result = await exec(command, cwd, options);

  if (result.code !== 0) {
    throw new Error(
      `${command.join(' ')} exited with ${result.code} in ${cwd}\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

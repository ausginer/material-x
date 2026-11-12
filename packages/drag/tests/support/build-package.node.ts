/**
 * The consumer project's one build of this package, as a Vitest global setup.
 *
 * It runs what `just build` runs: the clean, then `tsdown`. The emit writes the
 * package root, and the tree is valid only when the build has ended. Building
 * here, before any consumer file starts, means that no test reads the tree during
 * a build.
 *
 * A failed build is provided rather than thrown, because a throw here ends the
 * run for every project. `require-build.ts` raises it in each consumer file. It
 * is a string because printing an `Error` from a global setup loses its message
 * at this Vitest version.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** What the build reported if it failed, including its output. */
    buildFailure: string | null;
  }
}

const ROOT = resolve(import.meta.dirname, '../..');

const STEPS: ReadonlyArray<readonly [string, ...string[]]> = [
  ['node', '../../.scripts/package-files.ts', 'clean', '--package', '.'],
  ['npx', 'tsdown', '--config', 'tsdown.config.ts'],
];

/** Runs one step, and resolves with its failure, or `null` when it exits 0. */
function run([command, ...args]: readonly [string, ...string[]]): Promise<
  string | null
> {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd: ROOT });
    let output = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('error', ({ message }) => {
      done(`${command} did not start: ${message}`);
    });
    child.on('close', (code) => {
      done(
        code === 0
          ? null
          : `${[command, ...args].join(' ')} exited with ${code}\n${output}`,
      );
    });
  });
}

export async function setup(project: TestProject): Promise<void> {
  let failure: string | null = null;

  for (const step of STEPS) {
    // oxlint-disable-next-line no-await-in-loop -- the build follows the clean
    failure = await run(step);

    if (failure !== null) {
      break;
    }
  }

  project.provide('buildFailure', failure);
}

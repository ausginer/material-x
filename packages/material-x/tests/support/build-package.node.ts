/**
 * The one build of this package per Vitest run, as the node project's global
 * setup, for the tests that read the published files.
 *
 * It runs what `just build-prepare` and `just build-lib` run: it collects the
 * sheets' private properties, which mangling reads, from the tree under test,
 * then runs `tsdown`, which writes the package root.
 * Vitest runs every project's global setup before any file starts, so no test
 * reads the tree during the build. A project evaluates this module in its own
 * module runner, so the first one to run it starts the build and keeps it on the
 * process's global object, and any other waits for that build.
 *
 * A failed build is provided rather than thrown, because a throw here ends the
 * run for every project. `require-build.ts` raises it in each file of the
 * project. It is a string because printing an `Error` from a global setup loses
 * its message at this Vitest version.
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
const BUILD = Symbol.for('@ydinjs/material-x: the build of this run');

/** Runs `command`, and resolves with its failure, or `null` when it exits 0. */
function run(command: readonly string[]): Promise<string | null> {
  return new Promise((done) => {
    const child = spawn(command[0]!, command.slice(1), { cwd: ROOT });
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
      done(`${command[0]!} did not start: ${message}`);
    });
    child.on('close', (code) => {
      done(
        code === 0
          ? null
          : `${command.join(' ')} exited with ${code}\n${output}`,
      );
    });
  });
}

/** Runs the build, and resolves with its failure, or `null` when it succeeds. */
async function build(): Promise<string | null> {
  const failure = await run(['node', '../../.scripts/css/collect-props.ts']);

  if (failure) {
    return failure;
  }

  return await run([
    'aube',
    'exec',
    '--',
    'tsdown',
    '--config',
    'tsdown.config.ts',
  ]);
}

export async function setup(project: TestProject): Promise<void> {
  const shared = globalThis as typeof globalThis &
    Partial<Record<typeof BUILD, Promise<string | null>>>;

  shared[BUILD] ??= build();
  project.provide('buildFailure', await shared[BUILD]);
}

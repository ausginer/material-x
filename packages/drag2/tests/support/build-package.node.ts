/**
 * The node project's one build of this package, as a Vitest global setup.
 *
 * The emit writes the package root, and every declaration carries a dangling
 * `sourceMappingURL` until `build:done` strips it, so the tree is only valid once
 * the build has ended. Building here, before any file starts, means no test can
 * read the tree during a build and no test's verdict can depend on another's.
 *
 * A failed build is provided rather than thrown, because a throw here ends the
 * run for every project. `require-build.node.ts` raises it in this project's
 * files. It is a string because printing an `Error` from a global setup loses
 * its message at this Vitest version.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** When this project's build started, in epoch milliseconds. */
    builtAt: number;
    /** What the build reported if it failed, including its output. */
    buildFailure: string | null;
  }
}

const ROOT = resolve(import.meta.dirname, '../..');

function build(): Promise<string | null> {
  return new Promise((done) => {
    const child = spawn('npx', ['tsdown', '--config', 'tsdown.config.ts'], {
      cwd: ROOT,
    });
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
      done(`tsdown did not start: ${message}`);
    });
    child.on('close', (code) => {
      done(code === 0 ? null : `tsdown exited with ${code}\n${output}`);
    });
  });
}

export async function setup(project: TestProject): Promise<void> {
  project.provide('builtAt', Date.now());
  project.provide('buildFailure', await build());
}

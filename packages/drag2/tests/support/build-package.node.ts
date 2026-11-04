/**
 * The node project's one build of this package, as a Vitest global setup.
 *
 * The emit writes the package root, and every declaration carries a dangling
 * `sourceMappingURL` until `build:done` strips it, so the tree is only valid once
 * the build has ended. Building here, before any file starts, means no test can
 * read the tree during a build and no test's verdict can depend on another's.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** When this project's build started, in epoch milliseconds. */
    builtAt: number;
  }
}

const ROOT = resolve(import.meta.dirname, '../..');

function build(): Promise<void> {
  return new Promise((done, fail) => {
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
    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) {
        done();
        return;
      }

      fail(new Error(`tsdown exited with ${code}\n${output}`));
    });
  });
}

export async function setup(project: TestProject): Promise<void> {
  project.provide('builtAt', Date.now());
  await build();
}

/**
 * A consumer's typecheck against the build: one module outside the workspace
 * imports every entry of the exports map by its package specifier, and `tsc`
 * resolves each entry's `types` with no error. The package is linked, not packed,
 * because a link resolves the same specifiers through the same exports map.
 */
import { spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const TSC = resolve(ROOT, '../../node_modules/.bin/tsc');

type Result = Readonly<{ code: number | null; output: string }>;

function run(args: readonly string[], cwd: string): Promise<Result> {
  return new Promise((done, fail) => {
    const child = spawn(TSC, [...args], { cwd });
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
      done({ code, output });
    });
  });
}

describe('the published entries in a consumer typecheck', () => {
  let fixture = '';
  let entries: string[] = [];
  let result: Result = { code: null, output: '' };

  beforeAll(async () => {
    const manifest = JSON.parse(
      await readFile(join(ROOT, 'package.json'), 'utf8'),
    ) as Readonly<{ exports: Readonly<Record<string, unknown>> }>;

    entries = Object.keys(manifest.exports)
      .filter((key) => key.endsWith('.js'))
      .map((key) => key.slice('./'.length, -'.js'.length));
    fixture = await mkdtemp(join(tmpdir(), 'drag-consumer-'));
    await mkdir(join(fixture, 'node_modules/@ydinjs'), { recursive: true });
    await symlink(ROOT, join(fixture, 'node_modules/@ydinjs/drag'), 'dir');
    await symlink(
      resolve(ROOT, '../box-quad'),
      join(fixture, 'node_modules/@ydinjs/box-quad'),
      'dir',
    );
    await writeFile(
      join(fixture, 'package.json'),
      JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
    );
    await writeFile(
      join(fixture, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'es2024',
          lib: ['es2024', 'dom', 'dom.iterable'],
          strict: true,
          noEmit: true,
          types: [],
          // The published declarations are what is checked.
          skipLibCheck: false,
        },
        files: ['consumer.ts'],
      }),
    );
    await writeFile(
      join(fixture, 'consumer.ts'),
      `${entries
        .map(
          (entry, at) =>
            `import * as entry${at} from '@ydinjs/drag/${entry}.js';`,
        )
        .join('\n')}\n\nexport const entries = [${entries
        .map((_, at) => `entry${at}`)
        .join(', ')}];\n`,
    );
    result = await run(['-p', '.', '--listFiles'], fixture);
  }, 120_000);

  afterAll(async () => {
    await rm(fixture, { recursive: true, force: true });
  });

  it('should typecheck every entry with no error', () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(
      result.output.split('\n').filter((line) => line.includes(' error TS')),
    ).toEqual([]);
    expect(result.code).toBe(0);
  });

  it('should resolve each entry to its published declaration', () => {
    const files = new Set(result.output.split('\n').map((line) => line.trim()));

    expect(
      entries.filter((entry) => !files.has(join(ROOT, `${entry}.d.ts`))),
    ).toEqual([]);
  });
});

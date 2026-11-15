/**
 * `.scripts/entry.sh`, driven through the shell wrapper, because the wrapper is
 * the documented interface: the runner line, the argument forwarding and the exit
 * codes are part of what a caller relies on.
 */
import { execFile } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type Result = Readonly<{ code: number; out: string; err: string }>;

const REPOSITORY = resolve(import.meta.dirname, '..');

const run = async (root: string, args: readonly string[]): Promise<Result> =>
  await new Promise<Result>((done) => {
    execFile(
      join(root, '.scripts/entry.sh'),
      [...args],
      { cwd: root },
      (error, stdout, stderr) => {
        done({
          code: (error as Readonly<{ code?: number }> | null)?.code ?? 0,
          out: stdout,
          err: stderr,
        });
      },
    );
  });

const read = async (address: string): Promise<Result> =>
  await run(REPOSITORY, [address]);

const heading = (result: Result): string => result.out.split('\n')[0]!;

describe('entry.sh', () => {
  it('should print a titleless entry', async () => {
    const result = await read('drag2:D-171');

    expect(result.code).toBe(0);
    expect(heading(result)).toBe('#### D-171');
  });

  it('should print a titled entry with its title', async () => {
    const result = await read('drag:DRD-1');

    expect(result.code).toBe(0);
    expect(heading(result)).toBe('#### DRD-1 — Single-pass control');
  });

  it('should match the local id exactly rather than by prefix', async () => {
    const short = await read('drag2:D-16');
    const long = await read('drag2:D-163');

    expect(heading(short)).toBe('#### D-16');
    expect(heading(long)).toBe('#### D-163');
    expect(short.out).not.toBe(long.out);
  });

  it('should keep a sub-clause inside the entry that owns it', async () => {
    const { out } = await read('drag2:D-66');

    expect(out).toContain('##### D-66 §The progress marker');
    expect(out).toContain('`RESOLVING` is truthful by construction');
  });

  it('should resolve a multi-letter family through the same syntax', async () => {
    const result = await read('drag2:SC-7');

    expect(result.code).toBe(0);
    expect(heading(result)).toBe('#### SC-7');
  });

  it('should resolve an entry of the repository record', async () => {
    const result = await read('repo:RD-1');

    expect(result.code).toBe(0);
    expect(heading(result)).toBe(
      '#### RD-1 — Repository-level records have their own scope and their own series',
    );
  });

  it('should resolve an entry of the drag contract', async () => {
    const result = await read('drag:DRI-7');

    expect(result.code).toBe(0);
    expect(heading(result)).toBe('#### DRI-7 — Faults');
  });

  it('should print a retired entry as the resolver printed it at its commit', async () => {
    const result = await read('drag2:D-210');
    const expected = await readFile(
      join(import.meta.dirname, 'fixtures/entry-drag2-D-210.txt'),
      'utf8',
    );

    expect(result.code).toBe(0);
    expect(result.out).toBe(expected);
  });

  it('should refuse an unknown scope', async () => {
    const { code, err } = await read('boxquad:D-1');

    expect(code).toBe(1);
    expect(err).toContain('unknown scope: boxquad');
  });

  it('should refuse an unknown local id', async () => {
    const { code, err } = await read('drag:DRD-99999');

    expect(code).toBe(1);
    expect(err).toContain('unknown local id in drag: DRD-99999');
  });

  it('should refuse an unqualified id and offer the qualified form', async () => {
    const { code, err } = await read('DRD-13');

    expect(code).toBe(1);
    expect(err).toContain('not a qualified address');
    expect(err).toContain('drag:DRD-13');
  });

  it('should tell the three refusals apart', async () => {
    const messages = await Promise.all(
      ['boxquad:D-1', 'drag:DRD-99999', 'DRD-13'].map(
        async (address) => (await read(address)).err.split('\n')[0],
      ),
    );

    expect(new Set(messages).size).toBe(3);
  });
});

/**
 * A copy of the resolver in a repository of its own, so a fixture can hold a
 * duplicate and the clone holds no commit for the retired scope.
 */
describe('entry.sh in a fixture repository', () => {
  let root = '';

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'entry-'));
    await mkdir(join(root, '.scripts'));
    await mkdir(join(root, '.plan'));
    await copyFile(
      join(REPOSITORY, '.scripts/entry.sh'),
      join(root, '.scripts/entry.sh'),
    );
    await copyFile(
      join(REPOSITORY, '.scripts/entry.ts'),
      join(root, '.scripts/entry.ts'),
    );
    await writeFile(
      join(root, '.plan/00-index.md'),
      '#### RD-1 — First\n\nOne.\n\n#### RD-1 — Second\n\nTwo.\n',
    );
    await new Promise<void>((done, reject) => {
      execFile('git', ['init', '-q'], { cwd: root }, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          done();
        }
      });
    });
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('should refuse a local id the record defines twice', async () => {
    const { code, err } = await run(root, ['repo:RD-1']);

    expect(code).toBe(1);
    expect(err).toContain('duplicated local id in repo: RD-1');
  });

  it('should name the commit when the clone does not hold a retired scope', async () => {
    const { code, err } = await run(root, ['drag2:D-171']);

    expect(code).toBe(1);
    expect(err).toContain('0870abd75');
    expect(err).not.toContain('unknown');
  });
});

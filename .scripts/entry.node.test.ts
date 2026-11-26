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

const git = async (cwd: string, args: readonly string[]): Promise<void> => {
  await new Promise<void>((done, reject) => {
    execFile('git', [...args], { cwd }, (error: Error | null) => {
      if (error) {
        reject(error);
      } else {
        done();
      }
    });
  });
};

/**
 * A repository holding a copy of the resolver and the given current-state
 * documents of `repo` and `drag`, relative to the repository's root.
 */
async function createFixture(
  documents: Readonly<Record<string, string>>,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'entry-duplicates-'));
  const files: Readonly<Record<string, string>> = {
    '.plan/00-index.md': '#### RD-1 — Repository\n',
    'packages/drag/.plan/00-index.md': '#### DRD-1 — Drag\n',
    'packages/drag/.plan/contract.md': '#### DRI-1 — Contract\n',
    ...documents,
  };

  await mkdir(join(root, '.scripts'));
  await Promise.all(
    ['entry.sh', 'entry.ts'].map(
      async (name) =>
        await copyFile(
          join(REPOSITORY, '.scripts', name),
          join(root, '.scripts', name),
        ),
    ),
  );

  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), source);
    }),
  );

  await git(root, ['init', '-q']);

  return root;
}

describe('entry.sh --duplicates', () => {
  const roots: string[] = [];

  const fixture = async (
    documents: Readonly<Record<string, string>>,
  ): Promise<string> => {
    const root = await createFixture(documents);
    roots.push(root);
    return root;
  };

  afterAll(async () => {
    await Promise.all(
      roots.map(
        async (root) => await rm(root, { recursive: true, force: true }),
      ),
    );
  });

  it('should name both lines of a number that two entries take', async () => {
    const root = await fixture({
      '.plan/00-index.md':
        '#### RD-1 — First\n\nOne.\n\n#### RD-2 — Second\n\nTwo.\n\n#### RD-2 — Third\n\nThree.\n',
    });

    const { code, err } = await run(root, ['--duplicates']);

    expect(code).toBe(1);
    expect(err).toContain(
      'repo:RD-2\n  .plan/00-index.md:5\n  .plan/00-index.md:9',
    );
  });

  it('should refuse an id claimed in two documents of one scope', async () => {
    const root = await fixture({
      'packages/drag/.plan/contract.md': '#### DRD-1 — Again\n',
    });

    const { code, err } = await run(root, ['--duplicates']);

    expect(code).toBe(1);
    expect(err).toContain(
      'drag:DRD-1\n  .plan/00-index.md:1\n  .plan/contract.md:1',
    );
  });

  it('should pass when a sub-clause or a mention repeats an id', async () => {
    const root = await fixture({
      '.plan/00-index.md':
        '#### RD-1 — First\n\n##### RD-1 §Clause\n\n### A section (RD-1)\n',
    });

    const { code, out } = await run(root, ['--duplicates']);

    expect(code).toBe(0);
    expect(out).toBe('no duplicated address in drag, repo\n');
  });

  it('should read the documents at a commit when one is given', async () => {
    const root = await fixture({
      '.plan/00-index.md': '#### RD-1 — First\n\n#### RD-1 — Again\n',
    });
    await git(root, ['add', '.']);
    await git(root, [
      '-c',
      'user.name=fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'fixture',
    ]);
    await writeFile(join(root, '.plan/00-index.md'), '#### RD-1 — First\n');

    const [atHead, tree] = await Promise.all([
      run(root, ['--duplicates', 'HEAD']),
      run(root, ['--duplicates']),
    ]);

    expect([atHead, tree]).toEqual([
      {
        code: 1,
        out: '',
        err: expect.stringContaining(
          'repo:RD-1\n  .plan/00-index.md:1\n  .plan/00-index.md:3',
        ) as string,
      },
      { code: 0, out: 'no duplicated address in drag, repo\n', err: '' },
    ]);
  });

  it('should refuse a commit the clone does not hold as a failed read', async () => {
    const root = await fixture({});

    const { code, err } = await run(root, ['--duplicates', '0000000']);

    expect(code).toBe(1);
    expect(err).toContain('cannot read 0000000');
    expect(err).not.toContain('duplicated');
  });

  /**
   * The span of `.plan/00-index.md` at `1cf222c32`, a merge of `main` into a
   * stacked branch that kept both sides of a conflict, from `RF-73` to the end
   * of the second `RF-75`. No ref on `origin` holds that commit, so the span is
   * committed as a fixture.
   */
  it('should name the duplicates that the merge 1cf222c32 left', async () => {
    const root = await fixture({
      '.plan/00-index.md': await readFile(
        join(import.meta.dirname, 'fixtures/entry-duplicates-1cf222c32.txt'),
        'utf8',
      ),
    });

    const { code, err } = await run(root, ['--duplicates']);

    expect(code).toBe(1);
    expect(err.split('\n').slice(1)).toEqual([
      'repo:RF-74',
      '  .plan/00-index.md:20',
      '  .plan/00-index.md:61',
      'repo:RF-75',
      '  .plan/00-index.md:45',
      '  .plan/00-index.md:86',
      '',
    ]);
  });
});

describe('entry.sh with a decisions directory', () => {
  const roots: string[] = [];

  const fixture = async (
    documents: Readonly<Record<string, string>>,
  ): Promise<string> => {
    const root = await createFixture(documents);
    roots.push(root);
    return root;
  };

  afterAll(async () => {
    await Promise.all(
      roots.map(
        async (root) => await rm(root, { recursive: true, force: true }),
      ),
    );
  });

  it('should resolve an entry of a decisions file in each scope', async () => {
    const root = await fixture({
      '.plan/00-index.md': '#### RF-1 — Finding\n',
      '.plan/decisions/RD-1.md': '#### RD-1 — Repository\n\nOne.\n',
      'packages/drag/.plan/00-index.md': '#### DRF-1 — Finding\n',
      'packages/drag/.plan/decisions/DRD-1.md': '#### DRD-1 — Drag\n\nTwo.\n',
    });

    const results = await Promise.all(
      ['repo:RD-1', 'drag:DRD-1'].map(async (address) => {
        const { code, out } = await run(root, [address]);
        return [code, out];
      }),
    );

    expect(results).toEqual([
      [0, '#### RD-1 — Repository\n\nOne.\n'],
      [0, '#### DRD-1 — Drag\n\nTwo.\n'],
    ]);
  });

  it('should refuse an id claimed in an index and in a decisions file', async () => {
    const root = await fixture({
      '.plan/decisions/RD-1.md': '#### RD-1 — Repository\n',
    });

    const [lookup, duplicates] = await Promise.all([
      run(root, ['repo:RD-1']),
      run(root, ['--duplicates']),
    ]);

    expect([lookup.code, duplicates.code]).toEqual([1, 1]);
    expect(lookup.err).toContain('duplicated local id in repo: RD-1');
    expect(duplicates.err).toContain(
      'repo:RD-1\n  .plan/00-index.md:1\n  .plan/decisions/RD-1.md:1',
    );
  });

  it('should read the index alone at a commit without the directory', async () => {
    const root = await fixture({});
    await git(root, ['add', '.']);
    await git(root, [
      '-c',
      'user.name=fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'fixture',
    ]);
    await mkdir(join(root, '.plan/decisions'));
    await writeFile(
      join(root, '.plan/decisions/RD-1.md'),
      '#### RD-1 — Repository\n',
    );

    const [atHead, tree] = await Promise.all([
      run(root, ['--duplicates', 'HEAD']),
      run(root, ['--duplicates']),
    ]);

    expect([atHead.code, atHead.out, tree.code]).toEqual([
      0,
      'no duplicated address in drag, repo\n',
      1,
    ]);
    expect(tree.err).toContain(
      'repo:RD-1\n  .plan/00-index.md:1\n  .plan/decisions/RD-1.md:1',
    );
  });

  it('should read the index alone in a working tree without the directory', async () => {
    const root = await fixture({});

    const [lookup, duplicates] = await Promise.all([
      run(root, ['repo:RD-1']),
      run(root, ['--duplicates']),
    ]);

    expect([lookup, duplicates]).toEqual([
      { code: 0, out: '#### RD-1 — Repository\n\n\n', err: '' },
      { code: 0, out: 'no duplicated address in drag, repo\n', err: '' },
    ]);
  });
});

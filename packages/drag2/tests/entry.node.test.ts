/**
 * `.scripts/entry.sh`, the one way a reader gets a single entry back.
 *
 * **Driven through the shell wrapper rather than by importing the module**,
 * because the wrapper is part of the interface: the documented invocation in
 * `CONTRIBUTING.md` is `entry.sh <scope>:<local-id>`, and a test that imported
 * `entry.ts` would leave the runner line, the argument forwarding and the exit
 * codes unasserted — which is exactly the seam a "thin wrapper" is allowed to
 * rot in.
 *
 * The address is qualified from the first release (D-171 as amended), so every
 * case here is written the way a caller writes it.
 */
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { documents, entries, PACKAGE } from './ledger.ts';

type Result = Readonly<{ code: number; out: string; err: string }>;

const ENTRY = join(PACKAGE, '.scripts/entry.sh');

const run = async (file: string, args: readonly string[]): Promise<Result> =>
  await new Promise<Result>((resolve) => {
    execFile(file, [...args], { cwd: PACKAGE }, (error, stdout, stderr) => {
      resolve({
        code: (error as Readonly<{ code?: number }> | null)?.code ?? 0,
        out: stdout,
        err: stderr,
      });
    });
  });

const read = async (...args: readonly string[]): Promise<Result> =>
  await run(ENTRY, args);

describe('reading one entry back', () => {
  it('should print a titleless entry', async () => {
    const { code, out } = await read('drag2:D-171');

    expect(code).toBe(0);
    expect(out.split('\n')[0]).toBe('#### D-171');
  });

  it('should print a titled entry with its title', async () => {
    const { out } = await read('drag2:F-283');

    expect(out.split('\n')[0]).toBe(
      '#### F-283 — A published entry signature drags its own intermediate aliases onto the published surface',
    );
  });

  it('should match the local id exactly rather than by prefix', async () => {
    // `D-16` answering for `D-163` is the failure the em-dash-or-end anchor
    // exists to prevent, and it is silent: both are real entries, so a prefix
    // match returns a plausible wrong answer rather than nothing.
    const short = await read('drag2:D-16');
    const long = await read('drag2:D-163');

    expect(short.out.split('\n')[0]).toBe('#### D-16');
    expect(long.out.split('\n')[0]).toBe('#### D-163');
    expect(short.out).not.toBe(long.out);
  });

  it('should keep a subordinate heading inside the entry that owns it', async () => {
    // D-66's `§The progress marker` is `#####`, so it is part of D-66 and is
    // not an entry. An extractor terminating on any heading would cut it off;
    // one terminating on any `#` prefix would also stop at it.
    const { out } = await read('drag2:D-66');

    expect(out).toContain('##### D-66 §The progress marker');
    expect(out).toContain('`RESOLVING` is truthful by construction');
  });

  it('should resolve a multi-letter family through the same syntax', async () => {
    // The local id is an opaque exact key: nothing in the reader knows that
    // `SC` is a standing condition, which is what lets `box-quad:BQ-9` be a
    // row in the scope map rather than a change to the address grammar.
    const { code, out } = await read('drag2:SC-7');

    expect(code).toBe(0);
    expect(out.split('\n')[0]).toBe('#### SC-7');
  });

  it('should read an entry out of a satellite document', async () => {
    // The reader finds the file over the current-state roots, so a caller does
    // not have to know which of the eight documents holds an identifier.
    const { code, out } = await read('drag2:Q-5');

    expect(code).toBe(0);
    expect(out).toContain('#### Q-5 — ');
  });

  it('should refuse an unknown scope', async () => {
    const { code, err } = await read('boxquad:D-1');

    expect(code).toBe(1);
    expect(err).toContain('unknown scope: boxquad');
  });

  it('should refuse an unknown local id', async () => {
    const { code, err } = await read('drag2:D-99999');

    expect(code).toBe(1);
    expect(err).toContain('unknown local id in drag2: D-99999');
  });

  it('should refuse an unqualified id rather than accepting it', async () => {
    // A convenience form is what every caller ends up written against, and it
    // cannot answer once a second scope exists — so it would break exactly
    // when it was most used.
    const { code, err } = await read('D-171');

    expect(code).toBe(1);
    expect(err).toContain('not a qualified address');
    expect(err).toContain('drag2:D-171');
  });

  it('should tell the three refusals apart', async () => {
    // Distinct failures with distinct repairs: an address for a package this
    // build cannot see, a citation of something the record never states, and a
    // defect in the record. One shared message would collapse all three.
    const messages = await Promise.all(
      ['boxquad:D-1', 'drag2:D-99999', 'D-171'].map(
        async (address) => (await read(address)).err.split('\n')[0],
      ),
    );

    expect(new Set(messages).size).toBe(3);
  });

  it('should refuse a local id the record defines twice', async () => {
    // A first match would hide a duplicate, which is a defect *in the record*
    // — and one this very migration could have introduced silently, by
    // recovering an entry under an identifier a rendered row already used.
    // F-283 exists because that case was real.
    //
    // The duplicate has to be planted inside a current-state root, because
    // that is the only place the reader looks; anywhere else would assert the
    // *unknown* branch while claiming to assert this one.
    const planted = join(PACKAGE, '.plan/contract/zz-duplicate-probe.md');

    try {
      await writeFile(planted, '#### D-171\n\nA second definition.\n');

      const { code, err } = await read('drag2:D-171');

      expect(code).toBe(1);
      expect(err).toContain('duplicated local id in drag2: D-171');
      expect(err).toContain('.plan/contract/00-index.md');
      expect(err).toContain('.plan/contract/zz-duplicate-probe.md');
    } finally {
      await rm(planted, { force: true });
    }
  });

  it('should hold exactly one definition of every entry in the record', async () => {
    // The duplicate refusal above can only fire if the record stays clean, and
    // this is what keeps it clean: every identifier the reader can be asked
    // for resolves to one place.
    const paths = await documents();
    const sources = await Promise.all(
      paths.map(async (path) => await readFile(path, 'utf8')),
    );
    const seen = new Map<string, number>();

    for (const source of sources) {
      for (const entry of entries(source.split('\n'))) {
        seen.set(entry.id, (seen.get(entry.id) ?? 0) + 1);
      }
    }

    expect([...seen].filter(([, count]) => count > 1)).toEqual([]);
    expect(seen.size).toBeGreaterThan(400);
  });
});

/**
 * `tests/COVERAGE.md` against the suite it describes (B-2).
 *
 * The ledger is what a reviewer reads to decide a property is covered — it is
 * why review 1 could state "the row does not exist" about a missing acceptance
 * case and be believed. Nothing checked that its citations resolved, and at the
 * end of Revision 2 **twenty of 242 did not**: rows a rename left behind, rows
 * whose subject a decision deleted, and — the finding inside the finding — six
 * consecutive rows for a kernel-tier property that had never had a test at all.
 * A ledger that is 8 % fiction weakens every conclusion drawn from it,
 * including the conclusion that something is safe to change.
 *
 * So the citation is made **mechanical**: a renamed test is now a failing build
 * rather than silent drift.
 *
 * ## What this proves, and what it does not
 *
 * It proves every cited test *exists*, in the file the same row names. It
 * cannot prove the test asserts what the row claims — that is a reading, and
 * the rows say why they close their invariant precisely so it can be read. The
 * cheap half is the half that rots unattended, which is the half worth
 * automating.
 *
 * Source-level, and necessarily so: a test name is a string argument to `it`,
 * and importing the suites here would run them.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const TESTS = resolve(import.meta.dirname, '.');

/**
 * Backticks and typographic apostrophes are markdown decoration on one side and
 * literal characters on the other, and neither is worth a manual edit to keep
 * in step.
 */
const normalize = (text: string): string =>
  text.replaceAll('`', '').replaceAll('’', "'").replaceAll(/\s+/gu, ' ').trim();

async function testFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return await testFiles(path);
      }

      return path.endsWith('.test.ts') ? [path] : [];
    }),
  );

  return nested.flat();
}

/** Every `it(…)` title in the suite, keyed by the file it lives in. */
async function titlesByFile(): Promise<
  ReadonlyMap<string, ReadonlySet<string>>
> {
  const files = await testFiles(TESTS);
  const sources = await Promise.all(
    files.map((file) => readFile(file, 'utf8')),
  );
  const titles = new Map<string, ReadonlySet<string>>();

  files.forEach((file, index) => {
    const found = new Set<string>();

    // `it`, `it.skip`, `it.each` alike: the title is the first string literal.
    for (const match of sources[index]!.matchAll(
      /\bit(?:\.\w+)*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/gu,
    )) {
      found.add(normalize(match[2]!));
    }

    titles.set(
      // Package-relative, which is the form COVERAGE.md cites.
      file.slice(resolve(TESTS, '..').length + 1),
      found,
    );
  });

  return titles;
}

/** `tests/sortable/{y,xy}.browser.test.ts` → both paths. One level, no nesting. */
function expandBraces(path: string): readonly string[] {
  const match = /\{([^}]+)\}/u.exec(path);

  return match === null
    ? [path]
    : match[1]!
        .split(',')
        .map((alternative) => path.replace(match[0], alternative.trim()));
}

type Citation = Readonly<{
  line: number;
  name: string;
  files: readonly string[];
}>;

/**
 * The cited test names of one line, with the files cited beside them.
 *
 * The italic run is `_…_`, and an underscore **inside** a name is real —
 * `AT_PROPOSAL` is a constant, not the end of an emphasis. Permitting one only
 * when a word character follows separates the two without needing a markdown
 * parser: `AT_P` continues the name, `opens_ |` closes it.
 */
function citations(line: string, index: number): readonly Citation[] {
  const files = [...line.matchAll(/`(tests\/[^`]+\.test\.ts)`/gu)].flatMap(
    // The ledger writes a pair of sibling suites as `{y,xy}`, and that is worth
    // keeping: the axis rows exist twice by construction, and spelling both out
    // would make the row about the file list rather than about the invariant.
    (match) => expandBraces(match[1]!),
  );

  return [...line.matchAll(/_(should(?:[^_\n]|_(?=\w))*)_/gu)].map((match) => ({
    line: index + 1,
    name: normalize(match[1]!),
    files,
  }));
}

describe('the coverage ledger', () => {
  it('should cite only tests that exist, in the files it names', async () => {
    const titles = await titlesByFile();
    const ledger = await readFile(join(TESTS, 'COVERAGE.md'), 'utf8');
    const dangling: string[] = [];

    for (const { line, name, files } of ledger.split('\n').flatMap(citations)) {
      // A row that names no file — prose, or a row continuing the one above —
      // is checked against the whole suite. A row that names files is checked
      // against **those** files, which is the half that catches a test moved
      // between suites while the ledger kept pointing at the old tier.
      const scope = files.length > 0 ? files : [...titles.keys()];

      if (!scope.some((file) => titles.get(file)?.has(name))) {
        dangling.push(
          `COVERAGE.md:${line} cites "${name}"${
            files.length > 0 ? `, absent from ${files.join(', ')}` : ''
          }`,
        );
      }
    }

    // **A failure here is a decision, not a typo hunt.** Either the row's
    // subject still exists and the citation should be re-pointed, or the
    // subject went with a decision and the row should go with it — and if it
    // went while the property survived, the row is a missing test, which is
    // what six of the original twenty turned out to be.
    expect(dangling).toEqual([]);
  });
});

/**
 * Cross-references in the normative tree resolve (D-112, F-81).
 *
 * The package already has one instrument for record continuity —
 * `decisions.node.test.ts` — and it sees exactly one shape: a **decision**, in
 * **one file**, deferred to a **destination**, witnessed by a **source-level
 * fact**. A citation is none of those. It is a claim that something exists
 * somewhere else, it lives in `src/` rather than in the ledger, and nothing has
 * ever checked one — which is why twelve dangling references survived
 * twenty-two phases, six checkpoint reviews and three Phase 22 entries, and why
 * two of them were found, written down and declined twice as _not this
 * document's to land_. A defect with no owner is what an instrument is for.
 *
 * A citation is how this package carries an argument between the code and the
 * contract. One that resolves to nothing is a premise a later reader cannot
 * check, which is the mechanism of every instance of F-81.
 *
 * ## Scope is the normative tree, and the tense rule is why it is this narrow
 *
 * `src/`, `tests/`, `bench/`, `.scripts/`, `.plan/contract/` and
 * `.plan/obligations.md` describe the tree as it is **now**, so staleness in
 * them is a defect. Dated history is not: `.plan/reviews/**` and
 * `.plan/measurements/**` were correct when written, and a **decision-ledger
 * row** is a dated act whose reasoning stands as it stood — D-101 still names
 * ~~`src/kernel/dev.ts`~~ and needs no repair, because D-108 supersedes it
 * rather than falsifying it. Ledger rows are therefore skipped **by shape**,
 * not by file: `00-index.md`'s findings, verdict and index prose stay in scope.
 *
 * **The register is the sixth root, and it is why the skip is sound** (D-116).
 * The tense rule classifies by register and this file skips by container, and
 * the two coincide everywhere except a decision row, which holds dated
 * reasoning *and* — in three rows out of one hundred and sixteen — a condition
 * a later pass must act on. Under D-116 (a) such a clause is not stated there
 * at all: it is carried in `.plan/obligations.md` §Standing conditions, in the
 * present tense, and the row cites its `SC-n`. So everything the tense rule
 * calls live is inside this scope, and the skip is true rather than merely
 * convenient.
 *
 * The roots are asserted to exist. A scope root that is renamed away would
 * otherwise contribute zero citations and zero failures, which is the
 * fail-open shape D-115 forbids.
 *
 * ## Three reference kinds, and one rule that keeps the check honest
 *
 * A **contract citation** — `NN §…`, or a bare `§…` — resolves to a heading or
 * a declared row id. A **repository path** in backticks resolves on disk. A
 * **cited source or test file** is a path, so it is the same check.
 *
 * A reference to something deliberately absent is legitimate and is **marked**:
 * strike-through, the convention this record already uses for a retired symbol,
 * extended to paths and sections. `vocabulary.node.test.ts` correctly records
 * that ~~`src/kernel/dev.ts`~~ _is retired_, and that is prose to keep, not a
 * dangling path.
 *
 * ## Unparseable is a failure, not a skip (D-115 applied to this file)
 *
 * Every `§` in scope is classified: resolved, deliberately retired, or a
 * citation into dated history whose target the tense rule puts out of scope.
 * Anything else fails. That is what forces the citation form to converge
 * without anyone legislating a syntax — and it is the reason the resolver may
 * be strict about a one-word heading. A citation is checkable exactly as far as
 * it is delimited, so `07 §Validation already publishes …` is a failure and
 * `07 §Validation, which already publishes …` is not. The alternative — accept
 * a one-word prefix and let prose run on — cannot tell a correct short citation
 * from `05 §Measurements owed`, which is the largest dangling instance in the
 * tree and reads identically.
 *
 * Two censuses by machine disagreed with each other before this file existed,
 * both wrong in both directions. That is the argument for classifying rather
 * than matching: a resolver that under-matches silently is the same failure one
 * level up.
 */
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGE = resolve(import.meta.dirname, '..');
const MONOREPO = resolve(PACKAGE, '../..');
const CONTRACT = join(PACKAGE, '.plan/contract');
const REGISTER = join(PACKAGE, '.plan/obligations.md');

/**
 * The normative tree, present tense. `.scripts/` is the monorepo's and is in
 * scope because `packaging.node.test.ts` already imports from it; the rest are
 * this package's.
 */
const ROOTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [join(PACKAGE, 'src'), ['.ts']],
  [join(PACKAGE, 'tests'), ['.ts', '.md']],
  [join(PACKAGE, 'bench'), ['.ts', '.js', '.md']],
  [CONTRACT, ['.md']],
  [join(MONOREPO, '.scripts'), ['.ts']],
  // The one `.plan/` file outside `contract/` that is present tense by
  // construction: it carries the live obligations and the standing conditions
  // (D-116 (b)). A file rather than a directory, and `walk` reads it as one.
  [REGISTER, ['.md']],
];

/**
 * A decision-ledger row: a dated act, and out of scope because D-116 (a) keeps
 * every live clause out of one — the register carries those, and it is in scope.
 */
const LEDGER_ROW = /^\| D-\d+ \|/u;

/**
 * A citation into a dated artifact — a review, a handoff, a synthesis, a
 * checkpoint finding, a decision or measurement record, a numbered section of
 * one. The tense rule puts those targets out of scope; the kind is still named
 * here rather than skipped, because an unnamed skip is what clause 4 forbids.
 */
const HISTORY =
  /(?:review\s+\d+|ledger|handoff|synthesis v\d+|C\d-\d\d|CE\d-\d\d|[A-Z]{1,3}\d?-\d+(?:'s)?|`[^`]+`|\d+(?:\.\d+)?)\s*$/iu;

/** `NN §…` or `contract NN §…`, never the `00` inside `D-100`. */
const QUALIFIER = /(?:^|[^-\w])(?:contract\s+)?(0[0-7])\s*$/u;

/**
 * A citation that has already named its target document, as a markdown link
 * immediately before the `§`. Following the link is strictly better than
 * demoting the citation: the record legitimately cites
 * `bundle-structure.md §Headroom` and `q7.md §Answer 1`, and both headings
 * exist. Quoted here rather than cited, because naming a citation is not
 * making one — the specimen rule below, applied to this block.
 */
const LINKED = /\]\(([^)]+\.md)\)[^`[\]]{0,3}$/u;

/**
 * A citation that names its target document **in backticks** — the form the
 * record reaches for when a link would be noise, and the one MNT-04 found
 * swallowed: `HISTORY`'s any-backticked-token alternative fired first, so ten
 * checkable citations were classified as dated history and never resolved. A
 * document that cannot be located is a failure, not a demotion; that is the
 * fail-open this closes rather than moves.
 *
 * **A source or test file is named the same way and is checked the same way.**
 * `free-drag/spec.ts §Behavior actions` names a comment lead-in,
 * `tests/kernel/kernel.browser.test.ts §the landing origin` a `describe` title
 * and `tests/consumer.node.test.ts §\`FREE_DRAG\`` a declaration — all three
 * swallowed while this pattern read `.md` alone, which left the rule as
 * written in this block wider than the rule as implemented (the MNT-04
 * residue). Quoted, not cited, for the reason the specimen rule gives.
 */
const NAMED = /`([\w./-]+\.(?:md|ts|js))`[^`[\]]{0,3}$/u;

/** Where a cited title ends. A citation is checkable as far as it is delimited. */
const TITLE_END = /^(.*?)(?:[()\][|":]|\*\/|,\s|;\s|\.\s|\s—\s|$)/su;

/**
 * A backticked **repository** path: one anchored at a known top-level
 * directory, which is the only form that names a file without also naming what
 * it is relative to. Deliberately not every slashed string — `sortable/feature.js`
 * is a package subpath, `lib/tsc.js` is inside a dependency, and `./x.d.ts` is
 * relative to whatever the sentence around it is talking about.
 */
const PATH =
  /(~~)?`((?:src|tests|bench|docs|packages|\.plan|\.scripts|\.agents)\/[\w./-]*[\w-]\.\w{1,5})`(~~)?/gu;

type Seg = Readonly<{ words: readonly string[]; heading: boolean }>;
type Doc = Readonly<{ segs: readonly Seg[]; ids: ReadonlySet<string> }>;
type Line = Readonly<{ text: string; line: number }>;
type Para = Readonly<{ text: string; marks: readonly Line[] }>;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[`*~_]/gu, '')
    .replaceAll(/[^a-z0-9′]+/gu, ' ')
    .trim();
}

/**
 * A heading is cited by its distinctive opening, not by its whole text, so it
 * is split where its own punctuation splits it and each piece is matchable.
 */
function segmentsOf(title: string): readonly string[] {
  return title
    .split(/[,;:—(){}[\]]|\s-\s/u)
    .map(normalize)
    .filter((piece) => piece !== '');
}

async function walk(
  dir: string,
  extensions: readonly string[],
): Promise<readonly string[]> {
  // A root may name one file — the register is a scope root, not a tree.
  if (!(await stat(dir)).isDirectory()) {
    return [dir];
  }
  const entries = (await readdir(dir, { withFileTypes: true })).filter(
    (entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.vite'),
  );
  const found = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return await walk(path, extensions);
      }
      return extensions.some((extension) => entry.name.endsWith(extension))
        ? [path]
        : [];
    }),
  );

  return found.flat().sort();
}

/**
 * Prose, joined the way it is read rather than the way it is wrapped: a
 * citation split across three comment lines is one citation. Table rows stay
 * one row, so a ledger row can be recognized as one.
 */
function paragraphs(source: string, markdown: boolean): readonly Para[] {
  const out: Para[] = [];
  let buffer: string[] = [];
  let marks: Line[] = [];
  let width = 0;
  const flush = (): void => {
    if (buffer.length > 0) {
      out.push({ text: buffer.join(' '), marks });
    }
    buffer = [];
    marks = [];
    width = 0;
  };
  for (const [index, raw] of source.split('\n').entries()) {
    const body = markdown
      ? raw
      : /^\s*(?:\/\*\*|\*\/|\*|\/\/)\s?(.*)$/u.exec(raw)?.[1];
    if (body === undefined || body.trim() === '') {
      flush();
      continue;
    }
    const piece = body.trim();
    if (markdown && piece.startsWith('|')) {
      flush();
      out.push({ text: piece, marks: [{ text: piece, line: index + 1 }] });
      continue;
    }
    marks.push({ text: piece, line: index + 1 });
    buffer.push(piece);
    width += piece.length + 1;
  }
  flush();
  return out;
}

/**
 * What a citation may name. A **heading** may be cited by name alone; a bolded
 * lead-in is a weaker anchor and needs two matching words, because accepting a
 * one-word match against every bolded phrase in a contract would resolve
 * `03 §Validation` — which is the defect, not the section.
 */
function analyse(markdown: string): Doc {
  const segs: Seg[] = [];
  const ids = new Set<string>();
  const add = (title: string, heading: boolean): void => {
    for (const piece of segmentsOf(title)) {
      segs.push({ words: piece.split(' '), heading });
    }
  };
  for (const line of markdown.split('\n')) {
    const heading = /^#{1,6}\s+(.*)$/u.exec(line);
    if (heading !== null) {
      add(heading[1]!, true);
      // `## 10. Open questions for the owner` is cited as `§Open questions`.
      add(heading[1]!.replace(/^\d+\.\s*/u, ''), true);
      // A heading may itself carry a `§`, and the part after it is the name a
      // citation uses: `#### D-66 §The progress marker`.
      const marker = heading[1]!.indexOf('§');
      if (marker >= 0) {
        add(heading[1]!.slice(marker + 1), true);
      }
    }
    const bold = /^\*\*(.+?)\*\*/u.exec(line);
    if (bold !== null) {
      add(bold[1]!, false);
    }
    for (const row of line.matchAll(
      /(?:^|\|\s*|#{1,6}\s+|\*\*)([A-Z]{1,3}\d?-\d+)(?:['’]s)?\b/gu,
    )) {
      ids.add(row[1]!);
    }
  }
  return { segs, ids };
}

function resolvesIn(cite: readonly string[], doc: Doc): boolean {
  if (cite.length === 0) {
    return false;
  }
  for (const { words, heading } of doc.segs) {
    let matched = 0;
    while (
      matched < words.length &&
      matched < cite.length &&
      words[matched] === cite[matched]
    ) {
      matched += 1;
    }
    if (matched >= 2 || (matched === cite.length && heading)) {
      return true;
    }
  }
  return false;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * What a **source or test file** offers a citation beyond its sections: a
 * top-level declaration, which is cited by name, and the **lead-in** of a
 * comment block, which is cited the way a markdown bold lead-in is. The
 * lead-in is a weak anchor for the same reason `analyse` makes one weak — a
 * one-word match against a line of prose resolves nothing — and it is the
 * *first* line of its block rather than any line in it, so this indexes what a
 * group is called and not everything said inside it.
 */
const COMMENT = /^\s*(?:\/\/|\/\*\*?|\*)\s?(.*)$/u;
const RULE = /^[-=*_\s]+$/u;

function anchorsOf(source: string): readonly Seg[] {
  const found: Seg[] = [];
  const lines = source.split('\n');
  for (const [index, raw] of lines.entries()) {
    const declaration =
      /^(?:export\s+)?(?:declare\s+)?(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/u.exec(
        raw.trim(),
      )?.[1];
    if (declaration !== undefined) {
      found.push({ words: normalize(declaration).split(' '), heading: true });
    }
    const comment = COMMENT.exec(raw)?.[1];
    // A ruled-off banner is how this package writes a section header in code,
    // so a divider above the line does not make the line a continuation.
    const above = COMMENT.exec(lines[index - 1] ?? '')?.[1]?.trim();
    if (
      comment === undefined ||
      comment.trim() === '' ||
      (above !== undefined && above !== '' && !RULE.test(above))
    ) {
      continue;
    }
    for (const piece of segmentsOf(comment)) {
      found.push({ words: piece.split(' '), heading: false });
    }
  }

  return found;
}

/**
 * The sections of a document or a test file: its markdown headings, and the
 * `describe` titles a test cites the way a document cites a heading.
 */
function sectionsOf(file: string, source: string): readonly Seg[] {
  const markdown = file.endsWith('.md');
  const found: Seg[] = [];
  const add = (title: string | undefined): void => {
    if (title === undefined) {
      return;
    }
    const marker = title.indexOf('§');
    const titles = marker >= 0 ? [title, title.slice(marker + 1)] : [title];
    for (const piece of titles.flatMap((one) => segmentsOf(one))) {
      found.push({ words: piece.split(' '), heading: true });
    }
  };
  for (const raw of source.split('\n')) {
    const body = markdown ? raw : /^\s*(?:\*|\/\/)\s?(.*)$/u.exec(raw)?.[1];
    add(
      markdown
        ? undefined
        : /^\s*describe(?:\.\w+\([^)]*\))?\(\s*'((?:[^'\\]|\\.)*)'/u.exec(
            raw,
          )?.[1],
    );
    add(body === undefined ? undefined : /^#{1,6}\s+(.*)$/u.exec(body)?.[1]);
  }

  return found;
}

type Scope = Readonly<{
  files: readonly string[];
  sources: ReadonlyMap<string, string>;
  contracts: ReadonlyMap<string, Doc>;
  shared: Doc;
}>;

let cached: Promise<Scope> | undefined;

function scope(): Promise<Scope> {
  cached ??= (async () => {
    const files = (
      await Promise.all(
        ROOTS.map(([root, extensions]) => walk(root, extensions)),
      )
    ).flat();
    const sources = new Map(
      await Promise.all(
        files.map(
          async (file) => [file, await readFile(file, 'utf8')] as const,
        ),
      ),
    );
    const named = (await readdir(CONTRACT)).filter((name) =>
      /^\d\d-/u.test(name),
    );
    const contracts = new Map(
      await Promise.all(
        named.map(
          async (name) =>
            [
              /^(\d\d)-/u.exec(name)![1]!,
              analyse(await readFile(join(CONTRACT, name), 'utf8')),
            ] as const,
        ),
      ),
    );
    // A bare `§…` may also name a section of a document or a suite of a test
    // file, so those headings and `describe` titles join the shared anchors.
    const extra = files
      .filter((file) => !file.startsWith(CONTRACT))
      .flatMap((file) => sectionsOf(file, sources.get(file)!));
    return {
      files,
      sources,
      contracts,
      shared: {
        segs: [...[...contracts.values()].flatMap((doc) => doc.segs), ...extra],
        ids: new Set([...contracts.values()].flatMap((doc) => [...doc.ids])),
      },
    };
  })();
  return cached;
}

const linkedDocs = new Map<string, Doc | undefined>();

/**
 * The headings of a document a citation names, indexed once. A link is
 * relative to the citing file; a backticked name is written the way a reader
 * would say it, so three bases are tried and no search is run — beside the
 * citing file, at the package root, and in the record. A name that resolves
 * against none of them fails.
 */
async function linkedDoc(dir: string, spec: string): Promise<Doc | undefined> {
  const key = `${dir}\u0000${spec}`;
  if (!linkedDocs.has(key)) {
    const bases = [dir, PACKAGE, join(PACKAGE, '.plan'), join(PACKAGE, 'src')];
    const paths = bases.map((base) => resolve(base, spec));
    const present = await Promise.all(paths.map((path) => exists(path)));
    const found = paths.find((_, index) => present[index]);
    const source =
      found === undefined ? undefined : await readFile(found, 'utf8');
    linkedDocs.set(
      key,
      source === undefined
        ? undefined
        : // A document is read as headings; a source or test file as the
          // headings and `describe` titles a citation names, which is the
          // same index the bare `§…` form already resolves against.
          found!.endsWith('.md')
          ? analyse(source)
          : {
              segs: [...sectionsOf(found!, source), ...anchorsOf(source)],
              ids: new Set<string>(),
            },
    );
  }
  return linkedDocs.get(key);
}

/** The source line a paragraph offset came from, for the failure message. */
function lineAt(paragraph: Para, cursor: number): number {
  let line = paragraph.marks[0]?.line ?? 1;
  let offset = 0;
  for (const { line: at, text } of paragraph.marks) {
    if (offset <= cursor) {
      line = at;
    }
    offset += text.length + 1;
  }

  return line;
}

/**
 * Which offsets sit inside a code span. A citation quoted inside one is a
 * **specimen**, not a citation: D-112's own ledger row and this file's doc
 * block both name dangling references, and quoting one is not making one.
 */
function codeSpans(text: string): readonly boolean[] {
  const quoted: boolean[] = [];
  let open = false;
  for (const character of text) {
    open = character === '`' ? !open : open;
    quoted.push(character === '`' ? true : open);
  }

  return quoted;
}

/** What a `§` occurrence is, once read. Never "unknown" — that is the point. */
type Verdict = 'resolved' | 'history' | 'failed';

/**
 * Classify one citation. Every branch returns a verdict, so no occurrence can
 * leave this function unaccounted for (D-112 clause 4).
 */
async function classify(
  before: string,
  after: string,
  index: Readonly<{
    contracts: ReadonlyMap<string, Doc>;
    shared: Doc;
    dir: string;
  }>,
): Promise<Verdict> {
  const number = QUALIFIER.exec(before)?.[1];

  // `§[NN](path)` and `§[NN §Title](path)` — a linked citation.
  if (after.startsWith('[')) {
    const link = /^\[(?:contract\s+)?(\d\d)(?:\s*§([^\]]*))?\]/u.exec(after);
    const target = link === null ? undefined : index.contracts.get(link[1]!);
    if (target === undefined) {
      return 'failed';
    }
    const [, , title] = link!;
    return title === undefined ||
      resolvesIn(normalize(title).split(' ').filter(Boolean), target)
      ? 'resolved'
      : 'failed';
  }

  // A bare section number cites a dated document, never a contract.
  if (number === undefined && /^\d/u.test(after)) {
    return 'history';
  }
  const linked =
    number === undefined
      ? (LINKED.exec(before)?.[1] ?? NAMED.exec(before)?.[1])
      : undefined;
  const target =
    number !== undefined
      ? index.contracts.get(number)
      : linked !== undefined
        ? await linkedDoc(index.dir, linked)
        : index.shared;
  if (target === undefined) {
    return 'failed';
  }
  if (
    number === undefined &&
    linked === undefined &&
    HISTORY.test(before.trimEnd())
  ) {
    return 'history';
  }
  const title = TITLE_END.exec(after)![1]!;
  const id = /^([A-Z]{1,3}\d?-\d+)/u.exec(title.trim())?.[1];
  if (id !== undefined) {
    return target.ids.has(id) ? 'resolved' : 'failed';
  }

  return resolvesIn(normalize(title).split(' ').filter(Boolean), target)
    ? 'resolved'
    : 'failed';
}

const where = (file: string, line: number): string =>
  `${relative(PACKAGE, file)}:${line}`;

/**
 * The history and the ledger addresses a pattern can see, in a register that
 * may carry neither.
 *
 * **The same eight forms `packaging.node.test.ts` holds over the emitted
 * declarations**, and the two lists are one register now rather than two. The
 * `src/` list used to be three, on the argument that a decision identifier is
 * an index entry for a maintainer where it is noise for a consumer. What that
 * argument leaves out is that a reader of this source is not thereby a reader
 * of `.plan/`: an identifier names a document that answers *why this was
 * decided*, and a comment's job is *what holds now*. A comment that needs the
 * ledger to be understood has moved its own content somewhere the code cannot
 * reach.
 *
 * So the rule is the tense rule with its corollary attached. A struck sentence
 * is a claim the reader must first determine is false; a date and a phase
 * number say when something happened and nothing about what holds; and a
 * decision number, a section citation or a record path says *the reason lives
 * elsewhere*, which is the same absence in a different spelling.
 *
 * **This forbids the address, not the argument.** Where a citation was carrying
 * a real constraint, the constraint stays and says itself; where removing the
 * citation leaves nothing, there was nothing but archaeology. History belongs
 * in `.plan/`, and it is not copied here in prose to survive the sweep.
 *
 * **Supersession narration is not here, and that is deliberate.** _Restored_,
 * _deleted_ and _no longer_ occur in ordinary present-tense prose, so a pattern
 * over them would fail correct comments. That population is a reviewed list.
 *
 * It lives in this file rather than beside its published sibling because the
 * property is the tense rule and `src/` is already one of this file's scope
 * roots — `packaging.node.test.ts` is about the tarball, and `src/` reaches no
 * tarball.
 */
const HISTORY_FORMS: ReadonlyArray<readonly [string, RegExp]> = [
  ['strikethrough', /~~/u],
  ['date', /\b20\d{2}-\d{2}-\d{2}\b/u],
  ['phase number', /\bphase \d/iu],
  [
    'decision, finding or probe number',
    /\b(?:MNT|CE1|C[2-5]|D|F|I|E|Q|M|K|B|A|H|L|N|P|R|C)-\d+/u,
  ],
  ['section citation', /§/u],
  ['contract document', /\bcontract \d/iu],
  ['size policy citation', /CODE_OF_SIZE/u],
  ['record path', /\.plan\//u],
];

describe('the source tree', () => {
  it('should carry no history in a comment', async () => {
    const files = await walk(join(PACKAGE, 'src'), ['.ts']);
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );
    const offences: string[] = [];
    let comments = 0;

    for (const [ordinal, file] of files.entries()) {
      for (const [index, raw] of sources[ordinal]!.split('\n').entries()) {
        // The same prose extractor the path check uses: a comment line, never a
        // string literal and never a specifier.
        const prose = /^\s*(?:\/\*\*|\*|\/\/)\s?(.*)$/u.exec(raw)?.[1];

        if (prose === undefined) {
          continue;
        }

        comments += 1;

        for (const [what, pattern] of HISTORY_FORMS) {
          if (pattern.test(prose)) {
            offences.push(`${where(file, index + 1)} ${what}`);
          }
        }
      }
    }

    expect(offences).toEqual([]);
    // Non-vacuity: an extractor that stopped matching would read no prose at
    // all and pass, which is the fail-open shape D-115 forbids.
    expect(files.length).toBeGreaterThan(50);
    expect(comments).toBeGreaterThan(5_000);
  });
});

describe('the normative tree', () => {
  it('should scan every scope root D-112 names', async () => {
    const present = await Promise.all(ROOTS.map(([root]) => exists(root)));

    expect(
      ROOTS.filter((_, index) => !present[index]).map(([root]) =>
        relative(MONOREPO, root),
      ),
    ).toEqual([]);
  });

  it('should carry contract citations that all resolve', async () => {
    const { files, sources, contracts, shared } = await scope();
    const unresolved: string[] = [];
    let resolved = 0;
    let history = 0;
    let specimens = 0;
    for (const file of files) {
      const source = sources.get(file)!;
      if (!source.includes('§')) {
        continue;
      }
      const ledger = file === join(CONTRACT, '00-index.md');
      for (const paragraph of paragraphs(source, file.endsWith('.md'))) {
        if (ledger && LEDGER_ROW.test(paragraph.text)) {
          continue;
        }
        const quoted = codeSpans(paragraph.text);
        for (const marker of paragraph.text.matchAll(/§/gu)) {
          const at = marker.index;
          if (quoted[at] === true) {
            specimens += 1;
            continue;
          }
          const line = lineAt(paragraph, at);
          const before = paragraph.text.slice(0, at);
          const after = paragraph.text.slice(at + 1);
          // Sequential because a linked citation names the document it must be
          // resolved against, which is not known until this citation is read.
          // oxlint-disable-next-line no-await-in-loop
          const verdict = await classify(before, after, {
            contracts,
            shared,
            dir: dirname(file),
          });
          if (verdict === 'history') {
            history += 1;
          } else if (verdict === 'resolved') {
            resolved += 1;
          } else {
            const cited = `${QUALIFIER.exec(before)?.[1] ?? '(bare)'} §${after.slice(0, 60)}`;
            unresolved.push(`${where(file, line)} :: ${cited}`);
          }
        }
      }
    }
    expect(unresolved).toEqual([]);
    // Non-vacuity, both ways: the scan really read the tree, and the history
    // classification is a named kind rather than a hiding place.
    expect(resolved).toBeGreaterThan(300);
    expect(history).toBeLessThan(resolved);
    expect(specimens).toBeGreaterThan(0);
  });

  it('should carry repository paths that all resolve on disk', async () => {
    const { files, sources } = await scope();
    const cited: Array<readonly [string, string]> = [];
    let retired = 0;
    for (const file of files) {
      const source = sources.get(file)!;
      const markdown = file.endsWith('.md');
      const ledger = file === join(CONTRACT, '00-index.md');
      for (const [index, raw] of source.split('\n').entries()) {
        // Prose only. A specifier in code is resolved by the module loader and
        // by `packaging.node.test.ts`; a path in a fixture string is data.
        const prose = markdown
          ? raw
          : /^\s*(?:\/\*\*|\*|\/\/)\s?(.*)$/u.exec(raw)?.[1];
        if (prose === undefined || (ledger && LEDGER_ROW.test(prose.trim()))) {
          continue;
        }
        for (const match of prose.matchAll(PATH)) {
          const [, open, path, close] = match;
          if (open !== undefined && close !== undefined) {
            // Struck through: a deliberate reference to something retired.
            retired += 1;
            continue;
          }
          cited.push([`${where(file, index + 1)} :: \`${path!}\``, path!]);
        }
      }
    }
    // Every candidate is collected first, so the disk reads run as one batch
    // rather than one per citation.
    const found = await Promise.all(
      cited.map(
        async ([, path]) =>
          (await exists(join(PACKAGE, path))) ||
          (await exists(join(MONOREPO, path))),
      ),
    );

    expect(
      cited.filter((_, index) => !found[index]).map(([site]) => site),
    ).toEqual([]);
    expect(cited.length).toBeGreaterThan(100);
    expect(retired).toBeGreaterThan(0);
  });
});

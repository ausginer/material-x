#!/usr/bin/env node
/**
 * The D-171/D-172 migration gate, kept runnable.
 *
 * **The claim it checks**: the canonical entries the index rendered before the
 * migration, plus every fragment D-172 recovered, equals the entries the index
 * carries now — by identifier, and by content down to the clause.
 *
 * The pre-migration state is read out of git rather than a fixture, because a
 * fixture is a transcription and a transcription is the thing this gate exists
 * to distrust. The historical table reading lives here rather than in
 * `tests/ledger.ts`: that file interprets the shape the record has, and this
 * one interprets a shape it no longer has.
 *
 *     node .scripts/corpus-equivalence.ts [ref]
 *
 * Exits non-zero, naming every identifier whose text is not wholly accounted
 * for, and every identifier that appears on one side only.
 *
 * **An identifier the pass itself amended is classified, not skipped.** D-171
 * marks its own decision implemented in the same pass that migrates it, so its
 * entry legitimately differs from the row it came from. Listing those by name
 * with a reason — rather than letting the gate go quiet about them — is the
 * same rule `references.node.test.ts` states for an unresolved `§`: an
 * unnamed exemption is where a real loss would sit.
 */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import MarkdownIt from 'markdown-it';
import { entries, index } from '../tests/ledger.ts';

const PACKAGE = resolve(import.meta.dirname, '..');
const REF = process.argv[2] ?? 'ea798134';
const FRAGMENTS = join(
  PACKAGE,
  '.plan/reviews/phase-24/recovered-fragments.md',
);

const md = new MarkdownIt('commonmark').enable(['table']);
const DELIM = /^\|(?:\s*:?-{2,}:?\s*\|)+$/u;
const ID = /^(?:\*\*)?([A-Z]{1,3}-\d+)(?:\*\*)?$/u;

/** A row's authored cells, asked of the parser — see D-171 on why not a split. */
function cells(row: string): string[] {
  for (let n = 1; n <= 40; n += 1) {
    const tokens = md.parse(`${row}\n|${' --- |'.repeat(n)}\n| x |\n`, {});
    if (!tokens.some((t) => t.type === 'table_open')) continue;
    const out: string[] = [];
    let head = false;
    for (const t of tokens) {
      if (t.type === 'thead_open') head = true;
      else if (t.type === 'thead_close') break;
      else if (head && t.type === 'inline') out.push(t.content);
    }
    return out;
  }
  return [];
}

const prose = new MarkdownIt('commonmark').enable(['strikethrough']);

/**
 * A fragment's *content*, with its markup resolved.
 *
 * The repository formatter rewrites `*emphasis*` as `_emphasis_`, so comparing
 * raw Markdown would report a normalization as a lost clause — and, worse,
 * would train the reader of this gate to expect noise. Link destinations are
 * kept because a citation is content: losing the target of
 * `[record](…-claude.md)` is exactly the kind of silent loss this exists for.
 *
 * **Markup delimiters are dropped rather than paired.** A code span is
 * delimited by *matching* runs, so the same sentence pairs differently inside
 * one table cell than inside a whole entry body — and when pairing shifts, an
 * `_emphasis_` that was markup in one parse is literal text in the other.
 * F-130's whole defect was an unmatched backtick. Comparing delimiters would
 * report both the repair and the formatter's normalization as lost prose;
 * comparing the words between them is what the claim is actually about.
 */
function plain(source: string): string {
  let out = '';

  for (const token of prose.parseInline(source, {})[0]?.children ?? []) {
    if (token.type === 'text' || token.type === 'code_inline') {
      out += token.content;
    } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
      out += ' ';
    } else if (token.type === 'link_open') {
      out += `${token.attrGet('href') ?? ''} `;
    }
  }

  return out;
}

const norm = (s: string): string =>
  plain(s)
    .replaceAll(/[`_*~]/gu, '')
    .replaceAll(/\s+/gu, ' ')
    .trim();

/** What the renderer showed before the migration: the first `width` cells. */
function rendered(lines: readonly string[]): Map<string, string[]> {
  const D4 = new Set([
    '| ID | Decision | Why | vs probe 1 |',
    '| ID | Decision | Why | Supersedes |',
  ]);
  const out = new Map<string, string[]>();
  let header: string | null = null;
  let width = 0;
  for (const [n, line] of lines.entries()) {
    if (!line.startsWith('|')) continue;
    if (DELIM.test(line)) {
      header = lines[n - 1]!;
      width = D4.has(header) ? 4 : 3;
      continue;
    }
    if (header === null || line === header) continue;
    if (
      !D4.has(header) &&
      header !== '| Decision | What and why | Supersedes |' &&
      header !== '| ID | Finding | Status |'
    )
      continue;
    const c = cells(line);
    const id = ID.exec(c[0]?.trim() ?? '')?.[1];
    if (id === undefined) continue;
    out.set(
      id,
      c
        .slice(1, width)
        .map(norm)
        .filter((x) => x !== ''),
    );
  }
  return out;
}

/** D-172's corpus: the fenced blocks, by the identifier each one lands under. */
async function corpus(): Promise<Map<string, string[]>> {
  const lines = (await readFile(FRAGMENTS, 'utf8')).split('\n');
  const out = new Map<string, string[]>();
  let heading: string | null = null;
  let fence = false;
  let buf: string[] = [];
  for (const line of lines) {
    if (line.startsWith('```text')) {
      fence = true;
      buf = [];
      continue;
    }
    if (fence && line.startsWith('```')) {
      fence = false;
      const text = buf.join('\n');
      // the renumbered fragment lands under F-283; every other under its heading's id
      const id = heading!.startsWith('F-283')
        ? 'F-283'
        : /^([A-Z]{1,3}-\d+)/u.exec(heading!)![1]!;
      const title = /^TITLE\s{2}(.+)$/mu.exec(text)?.[1];
      const status = /^STATUS (.+)$/mu.exec(text)?.[1];
      out.set(id, [
        ...(out.get(id) ?? []),
        ...(title === undefined ? [norm(text)] : [norm(title), norm(status!)]),
      ]);
      continue;
    }
    if (fence) {
      buf.push(line);
      continue;
    }
    const h = /^#{3,4} (.+)$/u.exec(line);
    if (h !== null) heading = h[1]!.trim();
  }
  return out;
}

const before = rendered(
  execFileSync(
    'git',
    ['show', `${REF}:packages/drag2/.plan/contract/00-index.md`],
    {
      cwd: resolve(PACKAGE, '../..'),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  ).split('\n'),
);
const recovered = await corpus();
const after = new Map(
  entries(await index()).map((e) => [e.id, norm(`${e.title ?? ''} ${e.body}`)]),
);

/**
 * Entries this pass rewrote rather than carried, and why. An amendment still
 * has to carry every *recovered* fragment: the allowance is over the
 * pre-migration text only, so it cannot hide a dropped recovery.
 */
const AMENDED: ReadonlyMap<string, string> = new Map([
  ['D-171', 'marks its own decision implemented and restates what it touches'],
]);

/**
 * Entries this pass created that no pre-migration row and no fragment holds.
 * Named for the same reason `AMENDED` is: an unexplained new identifier is
 * indistinguishable from a migration that invented content.
 */
const MINTED: ReadonlyMap<string, string> = new Map([
  [
    'F-286',
    'raised by the migration: three satellite tables it could not migrate',
  ],
  ['D-173', 'settles F-286: the three deferred tables, one answer each'],
  [
    'D-174',
    'settles F-287: satellites cite a canonical identifier, they do not claim one',
  ],
  [
    'F-287',
    "raised by D-173: 47 finding identifiers have an entry in two documents, masked by 05's heading depth",
  ],
  [
    'D-175',
    "settles F-288 and F-289: an entry's anchor is its address, and one identifier grammar is shared",
  ],
  [
    'F-288',
    "raised by the owner against D-174: `#f-2` addresses nothing, because a GFM anchor carries the heading's title",
  ],
  [
    'F-289',
    'raised by the owner against D-174: three expressions cap an opaque local identifier at three letters',
  ],
  [
    'F-290',
    'raised by D-175: whether a review-scope identifier such as `P18A-04` is citable is unsettled',
  ],
]);

const say = (text: string): void => {
  process.stdout.write(`${text}\n`);
};

const missing: string[] = [];
const orphan: string[] = [];
const amended: string[] = [];

type Side = readonly ['before' | 'recovered', string, readonly string[]];

const sides: readonly Side[] = [
  ...[...before].map(([id, texts]): Side => ['before', id, texts]),
  ...[...recovered].map(([id, texts]): Side => ['recovered', id, texts]),
];

for (const [kind, id, texts] of sides) {
  const text = after.get(id);

  if (text === undefined) {
    orphan.push(`absent after migration: ${id}`);
    continue;
  }

  const allowance = kind === 'before' ? AMENDED.get(id) : undefined;

  for (const chunk of texts) {
    if (text.includes(chunk)) {
      continue;
    }

    if (allowance !== undefined) {
      amended.push(`${id}: amended by this pass — ${allowance}`);
      continue;
    }

    missing.push(`${id}: text not carried over — «${chunk.slice(0, 110)}…»`);
  }
}

for (const id of after.keys()) {
  if (before.has(id) || recovered.has(id)) {
    continue;
  }

  const reason = MINTED.get(id);

  if (reason === undefined) {
    orphan.push(`present only after migration: ${id}`);
  } else {
    amended.push(`${id}: minted by this pass — ${reason}`);
  }
}

say(
  `before ${before.size} entries + recovered ${recovered.size} → after ${after.size}`,
);
for (const line of [...new Set(amended)]) say(`  ${line}`);
for (const line of [...orphan, ...missing]) console.error(line);
if (orphan.length + missing.length > 0) {
  console.error(`\n${orphan.length + missing.length} discrepancies`);
  process.exitCode = 1;
} else {
  say(
    'corpus equivalence holds: every clause is carried, and no identifier is invented or lost.',
  );
}

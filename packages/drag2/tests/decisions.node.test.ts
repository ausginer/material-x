/**
 * Decisions the contract states and the code has not implemented (K-5, F-63).
 *
 * D-34 and D-35 were normative in three contract documents and absent from the
 * source across a checkpoint and a whole revision, with every suite green. That
 * is not a paradox: **a green suite is evidence about the implemented contract
 * only.** `docs.node.test.ts` closes the documented surface over what is
 * exported, `packaging.node.test.ts` asserts the entry table, the fixtures
 * assert the shapes that exist — and every one of those instruments takes the
 * code as its subject and the contract as its predicate. None of them can see a
 * sentence in the contract with no counterpart in the code at all.
 *
 * So the instrument runs the other way, and it is deliberately cheap: the
 * contract carries a table of what it has decided and not yet built, and this
 * file asserts that the table is **complete in both directions** and that
 * nothing on it has quietly landed.
 *
 * ## The destination is a closed vocabulary (F-70)
 *
 * Both halves of the instrument used to read one destination form — `Phase
 * _n_` — and both **silently skipped** anything else. A decision deferred to
 * anywhere but a numbered phase therefore parsed as no marker and no row, and
 * two skips agree with each other: the completeness assertions pass on a
 * document that accounts for nothing. That is the F-63 shape reappearing inside
 * the instrument built to catch it, and it was about to be reached in earnest —
 * remediation work is booked neither to a phase nor to a release.
 *
 * So the vocabulary is closed and shared. Three destinations are recognized —
 * `Phase <n>`, `Before Phase <n>` and `Remediation` — the marker and the table
 * row are read against the **same** list, and a destination outside it is a
 * failure rather than a skip. Anything shaped like a marker or like a row and
 * unparseable is a failure too, for the same reason: the only thing this file
 * must never do quietly is nothing.
 *
 * ## What it proves, and what it cannot
 *
 * It cannot prove a decision is implemented — that is a reading, and if it were
 * mechanizable the decision would be a test rather than a decision. What it
 * makes impossible is the *silent* version of F-63: deferring a decision
 * without recording it, and recording one without ever retiring it. The
 * witnesses are what stop the table becoming a wall of stale good intentions —
 * each is a fact about the tree that holds only while its decision is
 * unimplemented, so landing the decision breaks the row that describes it.
 *
 * ## A standing condition is registered, not embedded (D-116)
 *
 * The second subject of this file, and it is the same failure one register
 * over. A decision row is a **dated act** — that is why `references.node.test.ts`
 * skips one whole — but three rows also carried a clause a later pass must act
 * on, and a live clause inside a skipped container is the one thing in the tree
 * no instrument can see. F-78 is the proof that this is not hypothetical: a
 * revisit condition embedded in `kernel/dev.ts`'s prose fired unnoticed across
 * three revisions.
 *
 * So the clause moves to `.plan/obligations.md` §Standing conditions under an
 * `SC-n` id, and the row cites the id. **What is checkable is the vocabulary,
 * not the intent**: a bold condition lead-in in a decision row must name an
 * `SC-n`, every cited id must exist in the register, and every registered id
 * must be cited from the ledger.
 *
 * **Its premise is open and is stated rather than hidden** (D-115). Whether a
 * *new* decision embeds a condition instead of registering it cannot be
 * observed — that is D-114 (b)'s argument and it is not re-derived here — and a
 * fifth lead-in nobody has spelled yet escapes this. The register entry is the
 * load-bearing artifact; this is a backstop over four known forms — three that
 * name the clause and were there from the start, and the fourth, a sentence
 * about what would reopen a decision, which was already in D-105 when D-116
 * called the gap prospective (C-02). Bold is the
 * discriminator because it is already this record's typography for a live
 * clause, while an italic or backticked mention is how it quotes the term: D-114
 * and D-116 both say _Overturned by_ **about** the rule, and neither is a
 * condition.
 *
 * ## A row renders every cell it authors (F-83)
 *
 * The third subject, and it is a rendering failure rather than a reading one.
 * GFM **discards a row's excess cells** and pads its missing ones, so a row
 * with one cell too many is well-formed to every tool and silently short one
 * clause to every reader. Twenty rows in this file were in that state, losing
 * their whole _Supersedes_ column while the rendered table showed the evidence
 * half in its place, and nothing failed anywhere.
 *
 * Source-level and text-based, necessarily: the subject is a document.
 */
import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';

const PACKAGE = resolve(import.meta.dirname, '..');
const INDEX = join(PACKAGE, '.plan/contract/00-index.md');
const REGISTER = join(PACKAGE, '.plan/obligations.md');

/** The heading whose table accounts for every marked decision. */
const SECTION = '### Decisions not yet implemented';

/**
 * **The closed destination vocabulary** (F-70), read by both halves. Kept as
 * one pattern rather than one per half, because the failure this replaced was
 * exactly the two halves agreeing on a form neither could parse.
 */
const DESTINATION = /^(?:Phase \d+|Before Phase \d+|Remediation)$/u;

/** The marker a decision row carries while its subject is not in the code. */
const MARKER = /^\| (D-\d+) \| \*\*Unimplemented \(([^)]*)\)\.\*\*/u;

/**
 * Anything claiming unimplementedness in a decision row, however spelled. A
 * line that is this and not `MARKER` is malformed, not absent.
 */
const MARKER_SHAPED = /^\| D-\d+ \|[^|]*\bUnimplemented\b/u;

/** A row of §Decisions not yet implemented. */
const LISTED =
  /^\| (D-\d+) \| ([^|]+?) \| [^|]+ \| (absent|present): `([^`]+)`(?: :: `([^`]+)`)? \|/u;

/** Anything shaped like one of that table's rows. */
const ROW_SHAPED = /^\| D-\d+ \|/u;

/**
 * A bold span, paired left to right. Bold is the discriminator because it is
 * already this record's typography for a live clause, while an italic or
 * backticked mention is how it quotes the term.
 */
const BOLD = /\*\*((?:[^*]|\*(?!\*))+?)\*\*/gu;

/**
 * The four condition lead-ins the record actually uses (D-116 (d)). Three name
 * the clause and are matched whole; the fourth is a sentence about what would
 * reopen a decision, and is matched on the two words that make it one. **The
 * vocabulary is still open** — a fifth spelling escapes this, which is why the
 * register entry is the load-bearing artifact and this is a backstop.
 */
const LEAD_IN =
  /^(?:Overturned by|Re-base conditions?|Revisit conditions?)$|\breopening conditions?\b/iu;

/** A row of the register's §Standing conditions table. */
const DECLARED = /^\| (SC-\d+) \|/u;

/** A reference to one, wherever it is written. */
const REFERENCE = /SC-\d+/gu;

type Deferred = Readonly<{
  decision: string;
  destination: string;
  form: string;
  path: string;
  text: string | undefined;
}>;

async function index(): Promise<readonly string[]> {
  return (await readFile(INDEX, 'utf8')).split('\n');
}

/**
 * The lines of §Decisions not yet implemented. Scoped, because "a row that
 * does not parse is a failure" is only a safe rule where every row is supposed
 * to be one of these — the decision tables above carry rows of another shape.
 */
function section(lines: readonly string[]): readonly string[] {
  const start = lines.indexOf(SECTION);

  if (start < 0) {
    return [];
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('#'));

  return end < 0 ? rest : rest.slice(0, end);
}

/** Decisions whose own row says they are not implemented yet. */
function marked(lines: readonly string[]): readonly string[] {
  return lines.flatMap((line) => {
    const match = MARKER.exec(line);

    return match === null ? [] : [`${match[1]!} (${match[2]!})`];
  });
}

/** The rows of the table that is supposed to account for them. */
function listed(lines: readonly string[]): readonly Deferred[] {
  return section(lines).flatMap((line) => {
    const match = LISTED.exec(line);

    return match === null
      ? []
      : [
          {
            decision: match[1]!,
            destination: match[2]!,
            form: match[3]!,
            path: match[4]!,
            text: match[5],
          },
        ];
  });
}

/**
 * Everything the two readers above would drop on the floor: a marker or a row
 * that does not parse, and a destination outside the closed vocabulary. Each is
 * reported as one line rather than as a boolean, so the failure names the text
 * that has to change.
 */
function unrecognized(lines: readonly string[]): readonly string[] {
  const bad: string[] = [];

  for (const line of lines) {
    const match = MARKER.exec(line);

    if (match === null) {
      if (MARKER_SHAPED.test(line)) {
        bad.push(`unparseable marker: ${line.slice(0, 60)}`);
      }

      continue;
    }

    if (!DESTINATION.test(match[2]!)) {
      bad.push(`marker destination: ${match[1]!} → "${match[2]!}"`);
    }
  }

  for (const line of section(lines)) {
    const match = LISTED.exec(line);

    if (match === null) {
      if (ROW_SHAPED.test(line)) {
        bad.push(`unparseable row: ${line.slice(0, 60)}`);
      }

      continue;
    }

    if (!DESTINATION.test(match[2]!)) {
      bad.push(`row destination: ${match[1]!} → "${match[2]!}"`);
    }
  }

  return bad;
}

/**
 * Every decision row whose bold condition lead-in names no `SC-n`. The clause
 * runs from its lead-in to the next one or to the end of the row, so a row
 * carrying two conditions is answered twice.
 */
function embedded(lines: readonly string[]): readonly string[] {
  const bad: string[] = [];

  for (const line of lines.filter((row) => ROW_SHAPED.test(row))) {
    const at = [...line.matchAll(BOLD)].filter((bold) =>
      LEAD_IN.test(bold[1]!.trim()),
    );

    for (const [ordinal, lead] of at.entries()) {
      const end = at[ordinal + 1]?.index ?? line.length;
      const clause = line.slice(lead.index, end);

      if (!REFERENCE.test(clause)) {
        bad.push(`${/^\| (D-\d+)/u.exec(line)![1]!}: ${lead[0]}`);
      }

      REFERENCE.lastIndex = 0;
    }
  }

  return bad;
}

/** The ids the register declares, and the ids the ledger cites. */
const ids = (lines: readonly string[], row: RegExp): readonly string[] => [
  ...new Set(lines.flatMap((line) => row.exec(line)?.[1] ?? [])),
];

function cited(lines: readonly string[]): readonly string[] {
  return [
    ...new Set(
      lines
        .filter((line) => ROW_SHAPED.test(line))
        .flatMap((line) => [...line.matchAll(REFERENCE)].map(([id]) => id)),
    ),
  ];
}

const markdown = new MarkdownIt('commonmark').enable(['table']);

/** The delimiter row, which is a table's shape and not one of its rows. */
const DELIMITER = /^\|(?:\s*:?-{2,}:?\s*\|)+$/u;

/**
 * How many cells a row **authors** — asked of the parser rather than counted.
 *
 * A parsed row is always its header's width, because the parser truncates and
 * pads to it, so comparing parsed lengths would compare one number with
 * itself: the vacuity F-83 is made of, and D-115 forbids. So the row is
 * offered to the parser **as a header** instead, whose width the delimiter row
 * must match for the block to be a table at all. The width the parser accepts
 * is the width the row authored, with escaped pipes and pipes inside code
 * spans resolved by the parser and not by this file.
 */
function width(row: string): number | undefined {
  for (let count = 1; count <= 12; count += 1) {
    const table = `${row}\n|${' --- |'.repeat(count)}\n| x |\n`;

    if (
      markdown.parse(table, {}).some((token) => token.type === 'table_open')
    ) {
      return count;
    }
  }

  return undefined;
}

type Shape = Readonly<{ rows: number; wrong: readonly string[] }>;

/** Every row whose authored width is not the width its own header declares. */
function shape(lines: readonly string[]): Shape {
  const wrong: string[] = [];
  let header = 0;
  let rows = 0;

  for (const [index, line] of lines.entries()) {
    if (!line.startsWith('|')) {
      header = 0;
      continue;
    }

    if (DELIMITER.test(line)) {
      continue;
    }

    const cells = width(line);

    if (header === 0) {
      header = cells ?? 0;
      continue;
    }

    rows += 1;

    if (cells !== header) {
      wrong.push(`${index + 1}: ${cells ?? '?'} cells against ${header}`);
    }
  }

  return { rows, wrong };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(join(PACKAGE, path));
    return true;
  } catch {
    return false;
  }
}

/**
 * A minimal index, so both readers can be falsified without editing the real
 * one. It carries a **settled** decision row above the section as well, because
 * one half of the section rule is that `| D-nn |` outside it is ordinary
 * content rather than a malformed row.
 */
const fixture = (marker: string, row: string): readonly string[] => [
  '| ID | Decision | Why | Supersedes |',
  '| D-78 | **Something already landed.** | Why | — |',
  marker,
  SECTION,
  '| Decision | Lands | What is missing | Witness |',
  '| --- | --- | --- | --- |',
  row,
  '',
  '## Findings',
];

const MARKED_79 =
  '| D-79 | **Unimplemented (Remediation).** Something. | Why |';
const LISTED_79 =
  '| D-79 | Remediation | Something | absent: `src/nothing.ts` |';

describe('the destination vocabulary', () => {
  it('should read a numbered phase from both halves', () => {
    const lines = fixture(
      '| D-79 | **Unimplemented (Phase 19).** Something. | Why |',
      '| D-79 | Phase 19 | Something | absent: `src/nothing.ts` |',
    );

    expect(marked(lines)).toEqual(['D-79 (Phase 19)']);
    expect(listed(lines).map((row) => row.destination)).toEqual(['Phase 19']);
    expect(unrecognized(lines)).toEqual([]);
  });

  it('should read a pre-phase destination from both halves', () => {
    // The form D-76 and D-77 both landed under, which the instrument could not
    // express while it read one destination shape.
    const lines = fixture(
      '| D-79 | **Unimplemented (Before Phase 19).** Something. | Why |',
      '| D-79 | Before Phase 19 | Something | absent: `src/nothing.ts` |',
    );

    expect(marked(lines)).toEqual(['D-79 (Before Phase 19)']);
    expect(listed(lines).map((row) => row.destination)).toEqual([
      'Before Phase 19',
    ]);
    expect(unrecognized(lines)).toEqual([]);
  });

  it('should read a remediation destination from both halves', () => {
    const lines = fixture(MARKED_79, LISTED_79);

    expect(marked(lines)).toEqual(['D-79 (Remediation)']);
    expect(listed(lines).map((row) => row.destination)).toEqual([
      'Remediation',
    ]);
    expect(unrecognized(lines)).toEqual([]);
  });

  it('should refuse a marker destination outside the vocabulary', () => {
    // **The whole point of F-70.** The old reader returned `[]` here — not a
    // failure, an absence — and the table half returned `[]` too, so the two
    // completeness assertions agreed about a decision neither had seen.
    const lines = fixture(
      '| D-79 | **Unimplemented (someday).** Something. | Why |',
      '| D-79 | someday | Something | absent: `src/nothing.ts` |',
    );

    // Both halves still pair it up — they capture the destination raw, so a
    // spelling neither recognizes agrees with itself and the two completeness
    // assertions are satisfied by it. That agreement is precisely why the
    // vocabulary is checked separately rather than by narrowing the readers.
    expect(marked(lines)).toEqual(['D-79 (someday)']);
    expect(unrecognized(lines)).toEqual([
      'marker destination: D-79 → "someday"',
      'row destination: D-79 → "someday"',
    ]);
  });

  it('should refuse a row destination outside the vocabulary', () => {
    const lines = fixture(MARKED_79, '| D-79 | v2 | Something | absent: `x` |');

    expect(unrecognized(lines)).toEqual(['row destination: D-79 → "v2"']);
  });

  it('should refuse a marker it cannot parse rather than skipping it', () => {
    const lines = fixture(
      '| D-79 | Unimplemented, Phase 19. Something. | Why |',
      LISTED_79,
    );

    expect(marked(lines)).toEqual([]);
    expect(unrecognized(lines)).toHaveLength(1);
  });

  it('should refuse a table row it cannot parse rather than skipping it', () => {
    // A dropped witness is the failure this catches: the row still reads as
    // bookkeeping to a human and accounts for nothing to the instrument.
    const lines = fixture(MARKED_79, '| D-79 | Remediation | Something |');

    expect(listed(lines)).toEqual([]);
    expect(unrecognized(lines)).toHaveLength(1);
  });

  it('should not read the decision tables as deferred rows', () => {
    // `ROW_SHAPED` is only a defect outside the section, and the decision
    // tables above are full of `| D-nn |` lines that are not this table's.
    expect(unrecognized(fixture(MARKED_79, LISTED_79))).toEqual([]);
  });
});

describe('the deferred decisions', () => {
  it('should spell every destination in the closed vocabulary', async () => {
    // Runs before the two completeness assertions for a reason: each of them
    // compares two sets built by the same readers, so an unparsed destination
    // is invisible to both. This is what makes their silence mean something.
    expect(unrecognized(await index())).toEqual([]);
  });

  it('should list every decision its own row marks as unimplemented', async () => {
    const lines = await index();
    const accounted = new Set(
      listed(lines).map((row) => `${row.decision} (${row.destination})`),
    );

    // **A failure here is the F-63 shape, caught at the moment it is created.**
    // Either the decision is implemented and the marker should go, or it is
    // not and it owes a row — with a witness, so that the row cannot outlive
    // its reason.
    expect(marked(lines).filter((entry) => !accounted.has(entry))).toEqual([]);
  });

  it('should mark every decision it lists', async () => {
    const lines = await index();
    const markers = new Set(marked(lines));

    // The other direction, and it is not symmetric bookkeeping. A row here for
    // an *unmarked* decision means a reader of the ledger — which is where
    // decisions are read — sees a decision presented as settled while the
    // table quietly says it is not built. The ledger is the document people
    // act on; a footnote elsewhere does not reach them.
    expect(
      listed(lines)
        .map((row) => `${row.decision} (${row.destination})`)
        .filter((entry) => !markers.has(entry)),
    ).toEqual([]);
  });

  it('should hold every witness it claims', async () => {
    const lines = await index();
    const rows = listed(lines);
    const landed: string[] = [];

    // **The section exists, which is what this can check** — not that it has
    // rows. It asserted `rows.length > 0` while there were always rows, on the
    // reasoning that a renamed section would otherwise make this and the two
    // tests above pass vacuously against nothing. Phase 19 emptied the table
    // legitimately: every decision the contract states is implemented, and an
    // empty table is a state rather than an omission.
    //
    // The vacuity it guarded is still covered, and by the stronger instrument:
    // a **renamed** section makes `listed()` return nothing while `marked()`
    // keeps finding markers, so *should list every decision its own row marks
    // as unimplemented* fails. What no longer fails is the honest empty case.
    expect(section(lines).length).toBeGreaterThan(0);

    for (const row of rows) {
      // oxlint-disable-next-line no-await-in-loop
      const present = await exists(row.path);

      if (row.form === 'absent') {
        if (present) {
          landed.push(`${row.decision}: ${row.path} exists`);
        }

        continue;
      }

      const source = present
        ? // oxlint-disable-next-line no-await-in-loop
          await readFile(join(PACKAGE, row.path), 'utf8')
        : '';

      if (!source.includes(row.text!)) {
        landed.push(`${row.decision}: ${row.path} no longer has ${row.text!}`);
      }
    }

    // **This failing is good news read wrongly.** It means a listed decision
    // has landed — so the row is what is stale, not the code. Delete the row
    // and the marker on the decision it names; do not weaken the witness to
    // keep the row alive.
    expect(landed).toEqual([]);
  });
});

describe('the condition vocabulary', () => {
  const CONDITION = '**Overturned by** something an observer meets';

  it('should accept a lead-in that names a registered condition', () => {
    expect(embedded([`| D-79 | ${CONDITION} — see SC-4 | Why |`])).toEqual([]);
  });

  it('should refuse a lead-in that names none', () => {
    // The whole finding: the clause is live, the row is skipped by the
    // resolver as a dated act, and nothing else reads it.
    expect(embedded([`| D-79 | ${CONDITION} | Why |`])).toEqual([
      'D-79: **Overturned by**',
    ]);
  });

  it('should answer both conditions in a row separately', () => {
    // A clause runs to the next lead-in, so an id in the first does not
    // satisfy the second — the failure a whole-row search would hide.
    expect(
      embedded([
        `| D-79 | ${CONDITION} — SC-4. **Re-base conditions**: x | Y |`,
      ]),
    ).toEqual(['D-79: **Re-base conditions**']);
  });

  it('should read a quoted mention as a quotation rather than a condition', () => {
    // D-112's specimen rule, applied to a lead-in. D-114's own row says
    // _Overturned by_ about the rule and decides nothing.
    expect(
      embedded([
        '| D-79 | An _Overturned by_ clause states a condition | Why |',
      ]),
    ).toEqual([]);
  });

  it('should read a reopening sentence as a lead-in', () => {
    // The fourth form, and it was in D-105 before D-116 called the gap
    // prospective (C-02). It names no clause; it is a sentence about what
    // would reopen the decision, which is the same thing.
    expect(
      embedded([
        '| D-79 | **The reopening conditions that remain are measured** — SC-4 | Y |',
      ]),
    ).toEqual([]);
    expect(
      embedded([
        '| D-79 | **The reopening conditions that remain are measured** | Y |',
      ]),
    ).toEqual(['D-79: **The reopening conditions that remain are measured**']);
  });

  it('should not read an unbolded reopening mention as a lead-in', () => {
    // D-105's row says _the reopening condition …_ in ordinary prose about a
    // condition it has already dismissed. Bold is what separates the two.
    expect(
      embedded([
        '| D-79 | and the reopening condition _x_ (P01-08), which | Y |',
      ]),
    ).toEqual([]);
  });

  it('should not read a condition outside a decision row', () => {
    expect(
      embedded(['**Overturned by** something, in ordinary prose']),
    ).toEqual([]);
  });
});

describe('the standing conditions', () => {
  const register = async (): Promise<readonly string[]> =>
    (await readFile(REGISTER, 'utf8')).split('\n');

  it('should state no live condition inside a decision row', async () => {
    expect(embedded(await index())).toEqual([]);
  });

  it('should cite only conditions the register declares', async () => {
    const declared = new Set(ids(await register(), DECLARED));

    expect(cited(await index()).filter((id) => !declared.has(id))).toEqual([]);
  });

  it('should carry no condition the ledger never cites', async () => {
    const declared = ids(await register(), DECLARED);
    const references = new Set(cited(await index()));

    // The other direction, and it is what keeps the register from drifting
    // into a second ledger: a condition nobody decided is not a condition.
    expect(declared.filter((id) => !references.has(id))).toEqual([]);
    // Non-vacuity, and the whole floor this backstop can carry: the standing
    // set is non-empty. It cannot see a *new* decision that embeds a clause
    // rather than registering one — that is stated in this file's doc block
    // rather than implied by a green row.
    expect(declared.length).toBeGreaterThan(0);
  });
});

describe('the ledger tables', () => {
  const table = (row: string): readonly string[] => [
    '| A | B |',
    '| --- | --- |',
    row,
  ];

  it('should find a row that authors one cell too many', () => {
    // **The whole finding.** GFM accepts this row and drops `three`, so the
    // clause exists where it is written and is absent where it is read.
    expect(shape(table('| one | two | three |')).wrong).toEqual([
      '3: 3 cells against 2',
    ]);
  });

  it('should find a row that authors one too few', () => {
    expect(shape(table('| one |')).wrong).toEqual(['3: 1 cells against 2']);
  });

  it('should not miscount a pipe the parser does not read as one', () => {
    // Escaped, and inside a code span. Both are why this asks the parser
    // rather than counting `|` — the two rows F-83's sweep found last were
    // `HTMLElement \| null` written without the escape.
    expect(shape(table('| `a \\| b` | two |')).wrong).toEqual([]);
  });

  it('should count rows against their own header, not the first one', () => {
    expect(
      shape([
        ...table('| one | two |'),
        '',
        '| A | B | C |',
        '| --- | --- | --- |',
        '| 1 | 2 | 3 |',
      ]).wrong,
    ).toEqual([]);
  });

  it('should give every row of the ledger the width its header declares', async () => {
    const { rows, wrong } = shape(await index());

    expect(wrong).toEqual([]);
    // Non-vacuity: the reader really walked the tables. A file whose tables
    // stopped being recognized would otherwise report nothing wrong.
    expect(rows).toBeGreaterThan(150);
  });
});

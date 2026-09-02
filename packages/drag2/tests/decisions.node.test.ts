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
 * revisit condition embedded in ~~`kernel/dev.ts`~~'s prose fired unnoticed across
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
 * ## A decision has exactly one canonical row, and one status (§Decision status)
 *
 * The fourth subject, and it is a vocabulary rather than a completeness claim.
 * A `D-n` opens more rows than there are decisions, because the record also
 * tabulates decisions it is talking **about** — the precedence table above the
 * ledger, and the deferred table below it. So the ledger and its subsections,
 * less §Decisions not yet implemented, define the **canonical** set, and every
 * other `D-n` is a reference to it. A reference to an id with no canonical row
 * names nothing, which is the one failure a reader cannot see: the id looks
 * like every other id on the page.
 *
 * The status register is projected against exactly that set — one entry per
 * canonical decision, no entry without one, `active` or `inactive` and nothing
 * else, and one entry each. The value vocabulary is enforced as part of the
 * row's shape rather than downstream, so a third value is an unparseable row
 * and is refused by this file's standing rule rather than defaulted.
 *
 * The reading itself lives in `ledger.ts`, which the projection script imports
 * too: two readers of one document are two definitions of that document.
 *
 * Source-level and text-based, necessarily: the subject is a document.
 */
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canonical,
  cited,
  dangling,
  embedded,
  entries,
  index,
  ledger,
  listed,
  malformed,
  marked,
  PACKAGE,
  projection,
  registered,
  retired,
  section,
  SECTION,
  surplus,
  unaccounted,
  unrecognized,
} from './ledger.ts';

const REGISTER = join(PACKAGE, '.plan/obligations.md');

/** A row of the register's §Standing conditions table. */
const DECLARED = /^#### (SC-\d+)(?: — |$)/u;

/** The ids the register declares. */
const ids = (lines: readonly string[], row: RegExp): readonly string[] => [
  ...new Set(lines.flatMap((line) => row.exec(line)?.[1] ?? [])),
];

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
 * one. It carries a **settled** entry above the section as well, because one
 * half of the section rule is that `| D-nn |` outside it is ordinary content
 * rather than a malformed row — the deferred table is still a table, being a
 * projection.
 */
const fixture = (marker: readonly string[], row: string): readonly string[] => [
  '#### D-78',
  '',
  '**Something already landed.**',
  ...marker,
  SECTION,
  '| Decision | Lands | What is missing | Witness |',
  '| --- | --- | --- | --- |',
  row,
  '',
  '## Findings',
];

const marker = (opening: string): readonly string[] => [
  '#### D-79',
  '',
  opening,
];

const MARKED_79 = marker('**Unimplemented (Remediation).** Something.');
const LISTED_79 =
  '| D-79 | Remediation | Something | absent: `src/nothing.ts` |';

describe('the destination vocabulary', () => {
  it('should read a numbered phase from both halves', () => {
    const lines = fixture(
      marker('**Unimplemented (Phase 19).** Something.'),
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
      marker('**Unimplemented (Before Phase 19).** Something.'),
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
      marker('**Unimplemented (someday).** Something.'),
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
      marker('**Unimplemented, Phase 19.** Something.'),
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
    expect(embedded(['#### D-79', '', `${CONDITION} — see SC-4`])).toEqual([]);
  });

  it('should refuse a lead-in that names none', () => {
    // The whole finding: the clause is live, the row is skipped by the
    // resolver as a dated act, and nothing else reads it.
    expect(embedded(['#### D-79', '', CONDITION])).toEqual([
      'D-79: **Overturned by**',
    ]);
  });

  it('should answer both conditions in a row separately', () => {
    // A clause runs to the next lead-in, so an id in the first does not
    // satisfy the second — the failure a whole-row search would hide.
    expect(
      embedded([
        '#### D-79',
        '',
        `${CONDITION} — SC-4. **Re-base conditions**: x`,
      ]),
    ).toEqual(['D-79: **Re-base conditions**']);
  });

  it('should read a quoted mention as a quotation rather than a condition', () => {
    // D-112's specimen rule, applied to a lead-in. D-114's own row says
    // _Overturned by_ about the rule and decides nothing.
    expect(
      embedded([
        '#### D-79',
        '',
        'An _Overturned by_ clause states a condition',
      ]),
    ).toEqual([]);
  });

  it('should read a reopening sentence as a lead-in', () => {
    // The fourth form, and it was in D-105 before D-116 called the gap
    // prospective (C-02). It names no clause; it is a sentence about what
    // would reopen the decision, which is the same thing.
    expect(
      embedded([
        '#### D-79',
        '',
        '**The reopening conditions that remain are measured** — SC-4',
      ]),
    ).toEqual([]);
    expect(
      embedded([
        '#### D-79',
        '',
        '**The reopening conditions that remain are measured**',
      ]),
    ).toEqual(['D-79: **The reopening conditions that remain are measured**']);
  });

  it('should not read an unbolded reopening mention as a lead-in', () => {
    // D-105's row says _the reopening condition …_ in ordinary prose about a
    // condition it has already dismissed. Bold is what separates the two.
    expect(
      embedded([
        '#### D-79',
        '',
        'and the reopening condition _x_ (P01-08), which',
      ]),
    ).toEqual([]);
  });

  it('should not read a condition outside an entry', () => {
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

describe('the surviving tables', () => {
  const table = (...rows: readonly string[]): readonly string[] => [
    '| A | B |',
    '| --- | --- |',
    ...rows,
  ];

  it('should find a clause truncated off the end of a row', () => {
    // **Half of F-284.** GFM accepts this row and discards `three`, so the
    // clause exists where it is written and is absent where it is read.
    expect(surplus(table('| one | two | three |'))).toEqual([
      'truncated clause at line 3, in the row of one: 1 cell(s) past 2',
    ]);
  });

  it('should find a whole entry hidden behind the last rendered cell', () => {
    // **The other half, and the discriminator is D-172's**: a surplus cell
    // opening with an identifier is an entry, not a clause. A count over row
    // length conflates the two and reports thirteen rows as one defect.
    expect(
      surplus(table('| one | two | | F-128 | a title | a status |')),
    ).toEqual(['hidden entries at line 3, in the row of one: F-128']);
  });

  it('should keep counting against the header across a blank line', () => {
    // **Why `shape()` could not be migrated.** It reset its header on any
    // non-pipe line, and every row of the record's long tables is surrounded
    // by blank lines — so each row became its own header and was compared
    // against nothing. Every one of F-284's thirteen rows sits like this.
    expect(
      surplus([...table('| one | two |'), '', '| three | four | five |']),
    ).toEqual([
      'truncated clause at line 5, in the row of three: 1 cell(s) past 2',
    ]);
  });

  it('should not miscount a pipe the parser does not read as one', () => {
    // Escaped, and inside a code span. Both are why this asks the parser
    // rather than counting `|` — the rows F-83's sweep found last were
    // `HTMLElement \| null` written without the escape.
    expect(surplus(table('| `a \\| b` | two |'))).toEqual([]);
  });

  it('should count each table against its own header', () => {
    expect(
      surplus([
        ...table('| one | two |'),
        '',
        '| A | B | C |',
        '| --- | --- | --- |',
        '| 1 | 2 | 3 |',
      ]),
    ).toEqual([]);
  });

  it('should find no surplus cell anywhere in the record', async () => {
    // The state D-172's recovery left. This is not evidence that the reader
    // works — the cases above are — but it is what makes the class stay closed.
    expect(surplus(await index())).toEqual([]);
  });
});

describe('the canonical occurrence', () => {
  const LEDGER = '## Decision ledger';

  const document = (...body: readonly string[]): readonly string[] => [
    '| # | Drift | Restores | Corrects |',
    '| D-61 | A row about a decision, above the ledger | x | y |',
    LEDGER,
    '### A group',
    ...body,
    SECTION,
    '| D-155 | Phase 24 | Something | absent: `src/nothing.ts` |',
    '## Decision status',
    '| Decision | Status |',
    '| --- | --- |',
    '| D-1 | active |',
    '## Findings',
    '#### F-1 — A finding that mentions D-61',
    '',
    'Open.',
  ];

  const decision = (
    id: string,
    ...body: readonly string[]
  ): readonly string[] => [`#### ${id}`, '', ...body];

  it('should read an entry inside the ledger as canonical', () => {
    expect(
      canonical(document(...decision('D-1', 'A statement'))).map(
        ({ id }) => id,
      ),
    ).toEqual(['D-1']);
  });

  it('should not read a row above the ledger as canonical', () => {
    // D-61…D-65 open rows in the precedence table as well as their own, and
    // the precedence row is the record talking *about* the decision.
    expect(canonical(document()).map(({ id }) => id)).toEqual([]);
  });

  it('should not read a deferred row as canonical', () => {
    // D-155's deferred row is nested inside the ledger rather than above it,
    // and it stays a row because it is a projection.
    expect(ledger(document()).some((line) => line.startsWith('| D-155'))).toBe(
      false,
    );
  });

  it('should not read a finding entry as a canonical decision', () => {
    // The Findings section now carries `####` entries too, and they are
    // outside the ledger span. A canonical set read document-wide would
    // swallow all 268 of them as decisions.
    expect(
      canonical(document(...decision('D-1', 'A statement'))).map(
        ({ id }) => id,
      ),
    ).toEqual(['D-1']);
  });

  it('should take the statement from the whole body', () => {
    expect(
      canonical(document(...decision('D-1', 'A **bold** `span` and _more_')))[0]
        ?.statement,
    ).toBe('A bold span and more');
  });

  it('should keep a subordinate heading inside the entry that owns it', () => {
    // **Rule 3.** `#####` belongs to the entry; the terminator stops at four
    // hashes, so D-66's progress marker cannot become an entry of its own and
    // cannot be lost from D-66's statement either.
    const [entry] = entries(
      decision(
        'D-66',
        'The parent clause.',
        '',
        '##### D-66 §The sub-clause',
        '',
        'Owned text.',
      ),
    );

    expect(entry?.id).toBe('D-66');
    expect(entry?.body).toContain('Owned text.');
    expect(
      entries(decision('D-66', 'x', '', '##### D-66 §The sub-clause', '', 'y')),
    ).toHaveLength(1);
  });

  it('should match an identifier exactly rather than by prefix', () => {
    // `D-16` must not answer for `D-163`, which a prefix anchor does.
    expect(
      entries(['#### D-163', '', 'The long one.']).map(({ id }) => id),
    ).toEqual(['D-163']);
    expect(entries(['#### D-16', '', 'The short one.'])[0]?.body).toBe(
      'The short one.',
    );
  });

  it('should read a titled entry and a titleless one', () => {
    expect(
      entries([
        '#### F-1 — A title',
        '',
        'Body.',
        '#### D-1',
        '',
        'Other.',
      ]).map(({ id, title }) => [id, title]),
    ).toEqual([
      ['F-1', 'A title'],
      ['D-1', undefined],
    ]);
  });

  it('should read a multi-letter identifier family', () => {
    // The reader is not restricted to `D-` and `F-`: the satellites carry
    // `SC-`, and an entry key is opaque to everything above this.
    expect(entries(['#### SC-7', '', 'A condition.'])[0]?.id).toBe('SC-7');
  });

  it('should drop a struck span from the statement', () => {
    // The one span whose text must not reach the statement: keeping it would
    // report the retracted half of a decision as what the decision says.
    expect(
      canonical(document(...decision('D-1', '~~Withdrawn~~ **Current**')))[0],
    ).toEqual({ id: 'D-1', statement: 'Current', struck: ['Withdrawn'] });
  });

  it('should read a struck span that spans the whole body', () => {
    // **What D-171 removed.** A struck span used to be able to open in one
    // cell and close in the next, striking nothing and reaching no projection.
    // There is no cell boundary left for it to fall across.
    expect(
      canonical(
        document(
          ...decision('D-1', '~~Withdrawn', '', 'and still withdrawn~~'),
        ),
      )[0]?.struck,
    ).toEqual(['Withdrawn and still withdrawn']);
  });

  it('should read a pipe the table form could not hold', () => {
    // 200 rows carried one inside a code span and 22 an escaped one. Outside a
    // table it is an ordinary character.
    expect(
      canonical(document(...decision('D-1', 'A `Placeholder | null` holds')))[0]
        ?.statement,
    ).toBe('A Placeholder | null holds');
  });

  it('should refuse a reference naming no canonical row', () => {
    // The failure a reader cannot see: the id looks like every other id.
    expect(
      dangling(document(...decision('D-1', 'A statement mentioning D-999'))),
    ).toEqual(['D-61', 'D-999', 'D-155']);
  });

  it('should accept a reference whose decision has a canonical row', () => {
    expect(
      dangling(document(...decision('D-1', 'x'), ...decision('D-999', 'y'))),
    ).not.toContain('D-999');
  });

  it('should give the ledger one canonical entry per decision', async () => {
    const ids = canonical(await index()).map(({ id }) => id);

    expect(ids).toEqual([...new Set(ids)]);
    // Non-vacuity: the reader really walked the ledger.
    expect(ids.length).toBeGreaterThan(150);
  });

  it('should name no decision the ledger never states', async () => {
    expect(dangling(await index())).toEqual([]);
  });
});

describe('the status register', () => {
  const register = (...rows: readonly string[]): readonly string[] => [
    '## Decision ledger',
    '### A group',
    '#### D-41',
    '',
    'A statement',
    '#### D-42',
    '',
    '~~Withdrawn~~ **Current**',
    '## Decision status',
    '| Decision | Status |',
    '| --- | --- |',
    ...rows,
    '## Findings',
  ];

  it('should read both values of the vocabulary', () => {
    expect(
      registered(register('| D-41 | active |', '| D-42 | inactive |')),
    ).toEqual([
      { decision: 'D-41', status: 'active' },
      { decision: 'D-42', status: 'inactive' },
    ]);
  });

  it('should refuse a value outside the vocabulary', () => {
    // The vocabulary is part of the row's shape, so a third value is an
    // unparseable row rather than a status this file has never heard of.
    expect(registered(register('| D-41 | retired |'))).toEqual([]);
    expect(malformed(register('| D-41 | retired |'))).toEqual([
      'unparseable entry: | D-41 | retired |',
    ]);
  });

  it('should refuse a duplicate entry', () => {
    // Two answers to one question is no answer, and the second silently wins
    // in every map built from the table.
    expect(
      malformed(register('| D-41 | active |', '| D-41 | inactive |')),
    ).toEqual(['duplicate entry: D-41']);
  });

  it('should refuse a decision the register never answers', () => {
    expect(unaccounted(register('| D-41 | active |'))).toEqual([
      'no status: D-42',
    ]);
  });

  it('should refuse an entry naming no canonical decision', () => {
    expect(
      unaccounted(
        register('| D-41 | active |', '| D-42 | active |', '| D-99 | active |'),
      ),
    ).toEqual(['no decision: D-99']);
  });

  it('should blank the statement of an inactive decision', () => {
    // An inactive statement is retired content; the projection reports what
    // the record says now, and the retired projection is where the rest goes.
    expect(
      projection(register('| D-41 | active |', '| D-42 | inactive |')),
    ).toEqual([
      { decision: 'D-41', status: 'active', statement: 'A statement' },
      { decision: 'D-42', status: 'inactive', statement: '' },
    ]);
  });

  it('should collect retired content from both its sources', () => {
    // One shape, two sources: the whole statement of an inactive decision,
    // and every struck span of any decision.
    expect(
      retired(register('| D-41 | active |', '| D-42 | inactive |')),
    ).toEqual([
      { decision: 'D-42', status: 'inactive', text: 'Current' },
      { decision: 'D-42', status: 'inactive', text: 'Withdrawn' },
    ]);
  });

  it('should read a register the formatter has padded', () => {
    // **F-224, made a witness.** A document this repository parses and `oxfmt`
    // rewrites has two authors, and the formatter wins on every save: it pads
    // a table's cells to align its columns, and `AGENTS.md` instructs every
    // edited Markdown file to be formatted. A parser admitting exactly one
    // space around a cell stops seeing these rows the moment anyone runs it.
    //
    // **And it stops seeing them silently**, which is why the witness is here
    // rather than left to the live file: an unpadded pattern makes a padded
    // row match *nothing*, so it is absent rather than malformed — the shape
    // assertions stay green and only the completeness one fails, reporting
    // that every decision in the record has no status, with nothing in the
    // message pointing at whitespace.
    //
    // The rows below are in the formatter's own shape, column-aligned to the
    // widest cell.
    const padded = register(
      '| D-41     | active   |',
      '| D-42     | inactive |',
    );

    expect(registered(padded)).toEqual([
      { decision: 'D-41', status: 'active' },
      { decision: 'D-42', status: 'inactive' },
    ]);
    expect(malformed(padded)).toEqual([]);
    expect(unaccounted(padded)).toEqual([]);
  });

  it('should read a padded row of every table that remains', () => {
    // The register is where the trap was sprung; it is not where the trap
    // lives. Every surviving table is padded by the same run, so the fix is
    // the class rather than the instance — a deferred row and a register
    // entry, both in formatter-shaped spacing, beside an entry the padding
    // cannot reach at all now that it is a heading.
    const lines = [
      '## Decision ledger',
      '### A group',
      '#### D-79',
      '',
      '**Unimplemented (Remediation).** Something.',
      SECTION,
      '| Decision | Lands       | What is missing | Witness                 |',
      '| -------- | ----------- | --------------- | ----------------------- |',
      '| D-79     | Remediation | Something       | absent: `src/nothing.ts` |',
      '',
      '## Findings',
    ];

    expect(marked(lines)).toEqual(['D-79 (Remediation)']);
    expect(listed(lines)).toEqual([
      {
        decision: 'D-79',
        destination: 'Remediation',
        form: 'absent',
        path: 'src/nothing.ts',
        text: undefined,
      },
    ]);
    expect(unrecognized(lines)).toEqual([]);
    expect(canonical(lines).map(({ id }) => id)).toEqual(['D-79']);
  });

  it('should not read a decision row as a status entry', () => {
    expect(
      malformed(register('| D-41 | active |', '| D-42 | active |')),
    ).toEqual([]);
  });

  it('should give every entry a shape it can read', async () => {
    // First, for the reason the destination vocabulary is checked first: the
    // completeness assertion below compares two sets, and an unparsed row is
    // absent from one of them rather than wrong in it.
    expect(malformed(await index())).toEqual([]);
  });

  it('should answer every canonical decision exactly once', async () => {
    expect(unaccounted(await index())).toEqual([]);
  });
});

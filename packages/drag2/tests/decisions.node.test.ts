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
 * Source-level and text-based, necessarily: the subject is a document.
 */
import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGE = resolve(import.meta.dirname, '..');
const INDEX = join(PACKAGE, '.plan/contract/00-index.md');

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
    const rows = listed(await index());
    const landed: string[] = [];

    // Parsed at least one row, or the two tests above pass vacuously against a
    // renamed section and this one asserts nothing about nothing.
    expect(rows.length).toBeGreaterThan(0);

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

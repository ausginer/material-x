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

/** The marker a decision row carries while its subject is not in the code. */
const MARKER = /^\| (D-\d+) \| \*\*Unimplemented \(Phase (\d+)\)\.\*\*/u;

/** A row of §Decisions not yet implemented. */
const LISTED =
  /^\| (D-\d+) \| Phase (\d+) \| [^|]+ \| (absent|present): `([^`]+)`(?: :: `([^`]+)`)? \|/u;

type Deferred = Readonly<{
  decision: string;
  phase: string;
  form: string;
  path: string;
  text: string | undefined;
}>;

async function index(): Promise<readonly string[]> {
  return (await readFile(INDEX, 'utf8')).split('\n');
}

/** Decisions whose own row says they are not implemented yet. */
function marked(lines: readonly string[]): readonly string[] {
  return lines.flatMap((line) => {
    const match = MARKER.exec(line);

    return match === null ? [] : [`${match[1]!} (Phase ${match[2]!})`];
  });
}

/** The rows of the table that is supposed to account for them. */
function listed(lines: readonly string[]): readonly Deferred[] {
  return lines.flatMap((line) => {
    const match = LISTED.exec(line);

    return match === null
      ? []
      : [
          {
            decision: match[1]!,
            phase: match[2]!,
            form: match[3]!,
            path: match[4]!,
            text: match[5],
          },
        ];
  });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(join(PACKAGE, path));
    return true;
  } catch {
    return false;
  }
}

describe('the deferred decisions', () => {
  it('should list every decision its own row marks as unimplemented', async () => {
    const lines = await index();
    const accounted = new Set(
      listed(lines).map((row) => `${row.decision} (Phase ${row.phase})`),
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
        .map((row) => `${row.decision} (Phase ${row.phase})`)
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

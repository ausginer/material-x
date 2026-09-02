# The record's entries become headings, and the table form is kept for values

**Read at `9694adaf`**, branch `drag2/fin-review`. No production code or test was changed.

**The form is decided and this record scopes it.** An entry in a current-state record — a decision, a finding, a standing condition, a parity row — is a `####` heading with its body beneath it. A table is kept where every cell is a value.

---

## 1. Why the table form is being left, and it is not the formatter

`oxfmt` joining rows is the presenting symptom. The reason to move is that **three defect classes exist only because prose is inside table cells**, and each has an instrument in `tests/ledger.ts` built to catch it.

**A cell cannot hold a pipe.** [`ledger.ts:344`](../../../tests/ledger.ts) `width()` offers every row to `markdown-it` **as its own header**, growing a delimiter row one column at a time until the parser accepts it, because escaped pipes and pipes inside code spans cannot be counted by splitting. **200 rows of `00-index.md` carry a pipe inside a code span** and 22 carry `\|`. `shape()` and `DELIMITER` exist to compare that count against the header's.

**A strikethrough span cannot cross a cell boundary.** `residual()` carries thirty lines of comment explaining that `~~` opened in the _Decision_ cell and closed in the _Why_ cell renders as literal tildes — struck nowhere, and invisible to the retired projection. **67 rows carry strikethrough.** The failure is silent in both directions, which is why it is an assertion rather than something the flattener tidies away.

**A row is a line, so the line structure is load-bearing.** F-231 and F-282 are the same failure twice, ten days apart.

**The form is also hostile to writing it.** Of the four ledger edits made in the session that produced D-170, two failed their pipe-count guard on the first attempt, and marking D-167 and D-169 superseded needed a helper to place the closing `~~` before the cell boundary rather than at the end of the clause.

**The row recording this decision could not be written as a table row.** Its witness cell named the findings table's own header, `| ID | Finding | Status |`, inside a code span — and `shape()` counted the pipes and failed the deferred table's width, because a code span does not hide a pipe from the row's own cell split. The witness was changed to a heading with no pipes in it. That is the argument in one line: **the record cannot cite its own structure.**

**And once more, mid-session.** Between `9694adaf` and this record the working copy of `00-index.md` was rejoined again — two rows over twenty thousand characters, sixty-four lines gone — by an invocation this pass could not identify from its own history. It was restored from the commit and the instruments are 58 of 58. The point is not which command did it: **the file cannot be defended by knowing which commands are safe.**

---

## 2. The form

```markdown
### Phase 24

#### D-163

**Implemented, 2026-08-30 (Remediation).** The statement, in full prose.

**Touches:** extends D-4; records F-273.
```

1. **An entry is a `####` heading.** Its text is the identifier alone, or the identifier followed by `—` and a title. Nothing else at `####` may begin with an identifier.
2. **Every entry sits under a `###` group**, so depth is uniform across sections regardless of how the section was nested before. `## Findings` gains group headings; the ledger already has them.
3. **`#####` and deeper belong to the entry** and are never an entry themselves. The four `#### D-66 §…`, `#### D-62 §…` and `#### D-68 §…` headings in `00-index.md` are sub-clauses of a decision and move to `#####`, which is what they always were.
4. **The status marker keeps its own sentence**, first in the body: `**Implemented, <date> (<destination>).**`, `**Unimplemented (<destination>).**`, `**Superseded by D-<n>, <date>.**`.
5. **The last column becomes a trailing `**Touches:**` line** where the table had one.

**Verified against the repository formatter**: a document in this form is byte-identical after `oxfmt` and stable on a second pass, with the repo's `proseWrap: never` in force. The only delta is oxfmt dropping the file's trailing newline, which it does to every markdown file and which is not this form's problem.

---

## 3. Scope — by what the cells hold, not by a list of files

**A table row that carries prose is not a table row.** The table is right when every cell is a value: an identifier, a status, a date, a short label. It is wrong as soon as a cell carries a sentence with its own emphasis, links, or a struck clause. **A median row width above roughly 400 characters is the diagnostic that finds them, not the definition.**

Applied to `00-index.md`: **392 rows migrate, 225 stay.**

| section | rows | median |  |
| --- | --: | --: | --- |
| Findings | 211 | 926 | migrate |
| The Phase 21 measurement contract | 72 | 3 921 | migrate |
| Decision ledger and its eleven sub-sections | 109 | 452–3 996 | migrate |
| **Decision status** | 171 | **23** | **keep** |
| Decisions not yet implemented | 2 | 200 | keep |
| Artifacts, The model, Verdict, Normative precedence, Preserved from probe 1 | 47 | 126–357 | keep |

**The register is a table and stays one.** Four narrow columns, already padded, and the instrument reads it padded. Converting 171 rows of `| D-149 | active |` into 171 headings would be the same mistake facing the other way.

**Across the package**, by the same measure: `.plan/contract/05-lifecycle-invariants.md` (29 rows), `.plan/ledger.md` (47), `.plan/contract/07-free-drag-contract.md` (29), `06-vertical-sortable-trace.md` (17), `03-feature-composition.md` (15), `.plan/obligations.md` (14), `02-kernel-behavior-contract.md` (13). About 556 rows in eight files.

**Dated provenance is excluded and that is a boundary, not an omission.** `.plan/reviews/**`, `.plan/plan.md` and `.plan/measurements/**` are history; a later record supersedes them rather than editing them, so their tables stay as written. This is also where the instrument boundary already falls: the reference test's current-state roots are `src/`, `tests/`, `bench/`, `.scripts/`, `.plan/contract/` and `.plan/obligations.md`.

**And the rule limits itself.** `packages/box-quad/.plan/contract/00-index.md` has eighteen rows at a median of 78 characters and nothing to migrate. It needs no exemption; it simply does not match.

---

## 4. What the instrument gains and loses

**Deleted, not migrated**: `DELIMITER`, `width()`, `shape()`, `residual()` and the tests over them, together with the `markdown-it` table parse each row currently pays for. Four functions and roughly six tests.

**Re-anchored**: `MARKER`, `MARKER_SHAPED`, `LISTED`, `ROW_SHAPED`, `OPENS`, `REGISTERED`, `STATUS_SHAPED`, `DECLARED` move from a row prefix to a heading, and the seven readers over them follow. **The marker gets stronger**: `/^\*\*Unimplemented \((.+)\)\.\*\*/` is anchored to a line, where today it must reach past a cell boundary from the row start.

**Unchanged**: `references.node.test.ts` entirely, and `cited`, `embedded`, `retired` and `flatten`.

**The migration is verifiable by the instrument that already exists.** `canonical()` returns identifier-to-statement pairs today. **Required property: that map is identical before and after, modulo cell-boundary artefacts**, and `registered()` and `marked()` likewise. This turns 556 transcriptions into a checked transformation with a red-green gate, and it is the reason the change is safe to make in one pass per file rather than row by row.

---

## 5. Reading one entry back

**The house pattern already exists.** [`.scripts/decision-status.ts`](../../../.scripts/decision-status.ts) projects the ledger by importing `tests/ledger.ts` — one interpretation of the record, asserted in one place and projected from it. The reader belongs beside it, not as a shell script and not as a skill.

**Required properties of `.scripts/entry.ts`:**

- `node .scripts/entry.ts D-163` prints the entry — heading and body, sub-headings included — on stdout.
- It **finds the file**, over the current-state roots, so the caller need not know which document holds the identifier.
- It **refuses rather than guesses**, as `decision-status.ts` does: an unknown identifier and an identifier defined in two places are both a non-zero exit with a message, never a blank or a first match.
- It reads through `tests/ledger.ts`, so the reader and the assertion cannot drift.

**It cannot be written before the migration**, because it reads a shape that does not exist yet. It lands with the first file.

**The no-dependency fallback**, for a reader with no toolchain and for `CONTRIBUTING.md` beside the section-extraction idiom it already documents:

```sh
awk -v re="^#### D-163( —|\$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  .plan/contract/00-index.md
```

**Both halves of the anchor are load-bearing and were checked against the cases that break a naive one.** `( —|$)` stops `D-16` from returning `D-163`, and stops `#### D-66 §The progress marker` from answering for `D-66` — which is why rule 3 above moves those to `#####`. The terminator `#{1,4}` cannot match `##### `, because after four hashes the next character must be a space and is not, so an entry's own sub-headings stay inside the extraction. Verified on a sample carrying all five cases, including a missing identifier, which correctly returns nothing.

---

## 6. Order

Per file, and each is independent once the reader is re-anchored.

| # | step |
| --: | --- |
| 1 | Re-anchor `tests/ledger.ts`; delete `width`, `shape`, `DELIMITER`, `residual` and their tests. |
| 2 | `.plan/contract/00-index.md` — the ledger, then Findings, then the Phase 21 measurement contract. The register and the deferred table are untouched. |
| 3 | `.scripts/entry.ts`, against the shape step 2 produced. |
| 4 | `.plan/obligations.md`, then the remaining six documents, in any order. |

Step 1 before step 2 because the gate in §4 is what makes step 2 safe. Step 3 after step 2 because it reads that shape.

---

## 7. What this settles and what it leaves

**F-282 is closed by this decision**, on the second of the two properties it stated — the instrument stops depending on line structure. The first, a mechanical ignore entry, is no longer needed for this package.

**What it leaves is not this package's**: the root `proseWrap: never` still exposes every other package's records, and `oxfmt` drops the trailing newline of every markdown file it writes, on both 0.58.0 and 0.66.0. Both stay recorded on F-282's row as residue rather than being carried here.

**F-231 is not reopened.** Its convention is superseded by a form that does not need one.

---

## 8. Method

The width profile, the pipe and strikethrough counts and the per-section table are taken by script over `00-index.md` at `9694adaf` and re-read here. The form was verified by writing a sample carrying every hard case — a short identifier that is a prefix of a long one, an entry with `#####` sub-clauses whose text begins with the same identifier, an entry with a titled heading, a body containing a bullet list and a pipe inside a code span, and a missing identifier — then formatting it with the repository's own `oxfmt` twice and running the extractor against both. The heading-depth census is over `.plan/contract/`, where `####` is already used for prose subsections in three documents and `#####` in one.

**LSP plugin — available; not used**: nothing here turns on a code symbol. The subjects are markdown structure, a formatter's output and two regex censuses, and all three are text-level.
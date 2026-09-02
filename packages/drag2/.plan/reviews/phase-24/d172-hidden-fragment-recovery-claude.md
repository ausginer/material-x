# Fourteen entries were in the file and not in the record

**Read at `41c03b4e`**, branch `drag2/fin-review`. No production code, test or migration was written. The corpus this adjudication produces is [`recovered-fragments.md`](recovered-fragments.md).

D-171's implementation stopped against `00-index.md` because the document does not say what it appears to say. **Thirteen physical rows author more cells than their table has columns**, and GFM discards the surplus without a diagnostic. What is discarded is not decoration: it includes **fourteen complete finding entries**, seven of them cited from `tests/` and from another contract document.

---

## 1. What is actually wrong, and it is two different things

**Thirteen rows, and they fail in two ways that a single count conflates.**

| kind | rows | what is lost |
| --- | --: | --- |
| **Whole entries behind the third cell** | 3 | 14 complete `ID / title / status` triples |
| **A single cell truncated off the end** | 10 | 7 `Supersedes` clauses, 1 amendment, 1 severed code span, 1 amendment |

**The discriminator is whether the fourth cell opens with an identifier**, and nothing else. A count taken from row length alone cannot separate them: an 11-cell row carries two hidden entries, a 27-cell row carries six, and a 4-cell row carries none at all — it carries a truncated clause. **This is the count mismatch.** Fourteen entries, ten truncated cells, thirteen rows; the three numbers answer three different questions and none of them is a row-length arithmetic.

---

## 2. Why no instrument saw it, which is the part worth keeping

`shape()` compares each row's authored width against its table's header. Its header resets on **any** non-pipe line:

```
if (!line.startsWith('|')) { header = 0; continue; }
```

Every row in §Findings is surrounded by blank lines. Lines 919, 921, 941, 943, 963 and 965 are blank, so **each of the three host rows is treated as a header and compared against nothing.** The instrument that exists to catch exactly this defect is structurally blind to the section that has it, and it is blind for the same reason F-282 gave: **the record's line structure is load-bearing and nothing declares it.**

It is not a formatter's doing. At the commit that introduced each fragment, the fragment's own row start does not exist:

| host row | introduced | probe | result |
| --- | --- | --- | --- |
| line 920, `F-127` | `65a9f382`, 2026-08-27 | `grep -c '^\| F-128 \|'` | **0** |
| line 942, `F-145` | `cdc83990`, 2026-08-28 | `grep -c '^\| F-132 \|'` | **0** |
| line 964, `F-156` | `dc2a1d4c`, 2026-08-28 | `grep -c '^\| F-147 \|'` | **0** |

**They were authored already joined.** Someone appended an entry to a row instead of to a line, the render swallowed it, and no reader — human or instrument — could tell.

---

## 3. The canonical map

Seven fragments hold identifiers that no rendered row uses, and whose gaps in the sequence are exactly their own absence. **They keep their identifiers**, because the rest of the repository already cites them.

| id | host | status the text establishes | cited outside `00-index.md` |
| --- | --- | --- | --- |
| F-128 | 920 c5 | Closed 2026-08-27 by D-146's deletion, amended same day | `03-feature-composition.md`, `plan.md`, 3 reviews |
| F-129 | 920 c9 | Closed 2026-08-27 by D-146, by construction | `plan.md`, 2 reviews |
| F-132 | 942 c5 | Closed 2026-08-28 | `tests/COVERAGE.md`, `tests/free-drag/feature.declaration.test.ts`, `plan.md`, 3 reviews |
| F-133 | 942 c9 | Closed 2026-08-28 | `tests/COVERAGE.md`, `tests/composition.declaration.test.ts`, 3 reviews |
| F-134 | 942 c13 | Closed 2026-08-28 | `tests/COVERAGE.md`, `tests/free-drag/validation.browser.test.ts`, 3 reviews |
| F-135 | 942 c17 | Closed 2026-08-28 | 3 reviews |
| F-136 | 942 c21 | Closed 2026-08-28 | `plan.md`, `bundle-structure.md`, 5 reviews |

**Five of the seven are cited from `tests/`.** The record outside the index has been treating them as real for five days; only the index has been unable to show them.

### The one collision that is a genuine new entry

**F-283**, recovered from the malformed identifier `F-146` at line 942 cell 25 — _A published entry signature drags its own intermediate aliases onto the published surface_, **Open, tier C — closed by construction here**. Its subject is `SortableUnique`/`FreeDragUnique` being inlined so the docs closure gate is satisfied; the rendered F-146 is about `free-drag/controller.d.ts`'s `invalidate()`. **Different findings sharing one number**, so the number cannot be shared: it takes the next canonical identifier, and `F-146` survives only as recovery provenance.

### The six that are the same findings twice

Line 964 cells 5–27 hold `F-146`…`F-151`, and each is **the same defect as the rendered row of that number**: the same file, the same fix, the same date. Hidden F-149 and rendered F-149 both say D-146's row carried the two figures F-136 disproved; hidden F-151 and rendered F-151 both name `tests/free-drag/lifecycle.browser.test.ts` and both record it falsified against a forward loop.

**The history explains it exactly.** The hidden six were authored at `dc2a1d4c`, 10:46. The rendered six were authored at `450b7e68`, **11:30 the same morning** — forty-four minutes later, by a pass that could not see them, which allocated the same six numbers in good faith to its own shorter statements of the same six defects.

**So they are duplicates, and no new identifiers are minted for them.** But the hidden text is the _earlier and fuller_ one, and the rendered text carries _later_ information the hidden text cannot — F-148's residue closing with F-163, F-150's supersession by F-157. **Recovery is a merge with a direction**: the rendered entry keeps its identifier and its status, and the hidden text is appended to it as the fuller original statement, marked as recovered. Neither half is authoritative alone, which is why neither is discarded.

---

## 4. The truncated cells, and who owns each

**Seven `Supersedes` clauses.** Line 428 declares `| Decision | What and why | Supersedes |` — three columns. D-146 through D-152 author four, so the **last** cell is dropped, and the last cell is the supersession clause: _narrows D-45 and D-12; retracts D-77's surviving `claim` clause_, _D-150 entire_, and five more. Cells 2 and 3 are both body — cell 2 ends at a record citation and cell 3 opens with a bold lead-in — so the split between them is authored and only the fourth cell is loss.

**One amendment that must not be filed as a supersession.** D-162 is the one row of the eight whose **third** cell is the supersession clause. Its fourth cell is a 2026-08-30 amendment ending _Superseded by D-164_ — status history, not a `Supersedes` field. Filing it by position would put an argument about routing a coordinate space into the column that says which decisions were replaced.

**One severed code span, and it is not a fourth column at all.** F-130's author wrote `` `PlaceholderFactory | null` ``, and the unescaped pipe inside the code span split the cell mid-word: cell 3 ends `…is \`PlaceholderFactory` and cell 4 opens ``null`, the per-controller adapter closure…``. **The repair is to rejoin the two with the pipe escaped**, restoring one sentence. Nothing was lost that is not restored by putting it back.

**One appended amendment.** F-198's fourth cell opens _Amended 2026-08-29 — the mechanism becomes the fold, and the property stands_. It belongs to F-198's status, after the existing text.

---

## 5. What D-171 underspecified

### 5.1 The rule is the identifier, and the row length was only the diagnostic

D-171 scoped the migration by median row width and reported 392 rows migrating against 225 staying. **That is a measurement, not a rule**, and it fails on its own terms: `### Revision 2.2 — the kernel vocabulary (D-68)` has a median of 170 because two short rows sit beside D-68's long one, so D-68 — a canonical decision — would stay in a table and be the only decision no `#### D-68` could address.

**The rule is the owner's: every canonical `D-*` and `F-*` entry becomes a `####` heading, without exception.** No threshold, no median, no per-section judgement.

**And the exception is principled rather than measured.** The Decision status register is identifier-keyed and stays a table, because its rows are not entries — `| D-149 | active |` is a **projection** of an entry, and a projection of one fact per identifier is what a table is for. The deferred table is the same: identifier, destination, witness. **A table holds what is derived from entries; a heading holds the entry.**

The corrected counts: **442 entries** — 176 canonical decisions, 258 rendered findings, 7 recovered, 1 renumbered — and **203 rows staying in tables**: 171 register, 2 deferred, 30 in tables not keyed by an identifier at all.

### 5.2 The least-inventive grouping for §Findings is no grouping

§Findings spans lines 787–1135 and contains **zero headings**. D-171 required every entry to sit under a `###` group so that depth would be uniform; §Findings has no groups to sit under.

**Every available grouping invents a fact.** By phase requires assigning 258 findings to phases the rows do not individually state. By status is unstable, because a finding closes. By identifier block is arbitrary. **A single group repeating the section's own name adds a heading that classifies nothing.**

**So the requirement is corrected to what it was actually for: entries are at `####`, uniformly.** The `###` group is how a section that _already_ has groups reaches that depth, not a group to be invented for one that does not. §Findings goes `## Findings` → `#### F-1`, skipping a level, which is legal and which the extractor does not care about — it anchors on `####` and terminates on `#{1,4}`.

### 5.3 The corpus is the migration's input, not a note in a review

The fourteen entries and ten clauses cannot be recovered by re-reading `00-index.md` during the migration, because **reading it is what loses them** — every renderer, every markdown-aware tool and the repository's own instrument all agree on a document that is missing them.

[`recovered-fragments.md`](recovered-fragments.md) carries every fragment as fenced verbatim text, keyed by its recovered identifier and its host row. **Fenced, for the reason the recovery exists**: the text contains unescaped pipes, and any container that splits on one truncates it a second time. **D-171's step 2 takes that file as an input alongside `00-index.md`**, and its gate extends: `canonical()` before, plus the corpus, equals the entries after.

---

## 6. What is not recovered, and why it is a different question

Seventeen identifiers are absent from `00-index.md` altogether: **F-174, F-176–F-179, F-214–F-217, F-220, F-221, F-249–F-251**. Two more, F-175 and F-218/F-219, appear only as citations inside decision rows and have no entry of their own.

**These are not hidden and this pass does not recover them**, because there is no authored text to preserve — the difference between a fragment and a gap is whether the file contains it. They are recorded as F-285 so the next pass can decide whether they were allocated and dropped, or never allocated.

---

## 7. What is decided

**D-172** settles the dispositions: seven identifiers kept, one renumbered to F-283 with `F-146` retained as provenance, six merged into their rendered namesakes with direction, ten clauses returned to the entries that own them, and F-130's pipe escaped.

**D-171 is amended** on three points: the identifier rule replaces the median, §Findings needs no invented group, and the corpus is a named input to step 2.

**Nothing is written back into the table form.** The recovered entries are not re-inserted as rows — they carry the unescaped pipes that truncated them, and re-inserting them would reproduce the defect in the form being abandoned. They land as headings, once, in D-171's step 2.

**F-284** records the defect class: content authored into a canonical record, discarded by the renderer, and invisible to the instrument built to catch it. **F-285** records the seventeen absent identifiers.

---

## 8. Method

Every claim is taken from `00-index.md` at `41c03b4e` by offering each row to `markdown-it` as its own header — the same reading `tests/ledger.ts` uses, so the census and the instrument cannot disagree. The thirteen malformed rows come from comparing each row's authored width against its own table's header, where a header is a pipe row followed by a delimiter, which is the correction that made the count 13 rather than 19. The introduction commits are `git log -S` on a distinctive clause of each fragment, and the _already-joined_ finding is `grep -c` for the fragment's row start in the file **at** that commit. The duplicate determination is a full-text reading of all six pairs, not a title comparison — the titles differ in every pair and the substance is identical in every pair. Citation counts are `grep -rl` across `.plan`, `tests` and `src`.

**LSP plugin — available; not used**: no claim here turns on a code symbol. The subjects are markdown cell structure, git history and text censuses.
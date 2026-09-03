# The satellites cite, they do not restate — and the rule for that was written in August

**Read at `34ff1b31`**, branch `drag2/fin-review`, on 2026-09-03. D-173 is not implemented, the forty-seven records are not migrated, the qualified-scope syntax is untouched and F-285 is not absorbed.

---

## 1. The four shapes, measured

Forty-eight identifier-shaped headings sit at `###` in the current-state documents: forty-three `F-*` in `05-lifecycle-invariants.md`, four in `07-free-drag-contract.md`, and one `I-*` in `02-kernel-behavior-contract.md`. Together they carry **71,238 characters** of authored text.

| shape F-287 asks about                                              |  count |
| ------------------------------------------------------------------- | -----: |
| an exact restatement of the index entry                             |  **0** |
| complementary evidence or explanation belonging to the same finding | **48** |
| a local projection or reference to the canonical finding            |  **0** |
| genuinely a different finding sharing an identifier                 |  **0** |

**No pair is an exact restatement, and this is the load-bearing measurement**, because it is what forbids resolving the collision by deletion. Comparing each satellite's title and body against its index entry's title and body, the closest pair in the corpus is F-65 at 0.72 containment — and it still carries twenty substantive words the index does not. **Every one of the forty-seven satellite bodies is longer than its index body**, and the median satellite carries roughly three times the index's text.

**No pair is a different finding**, and the five lowest title-agreement pairs were read in full rather than scored. F-2 scores 0.00 because the satellite's title is the label _part factory determinism_ and the index's is the statement _Part factories must be deterministic and folded in a fixed order for both frames; TypeScript proves neither_. Same defect. F-37, F-40, F-42 and F-45 are the same story: `finalized`'s binary predicate, `moved()`'s missing wrapper, the feature-authoring boundary, the pointer-delta landing origin — one subject each, stated twice at different lengths.

**So the corpus has one shape, and it is the middle one.** The index entry is the **register**: its title is the statement and its body is the status and the history — §Findings says so itself, _severity is about the model … resolved entries are kept with their original numbers so the review record stays readable_. The satellite is where the finding was **raised and analysed**, in the document whose subject produced it. Neither is derived from the other, and neither is complete alone.

That is the same relationship D-173 settled for `M-*` a day earlier: **one subject, two authored facets.** What differs is that `M-*`'s two facets were in one document, so collapsing them into one entry cost nothing. Here they are in two documents with two different jobs, and collapsing them would empty one of the two.

---

## 2. The rule already exists, and one of the forty-eight is already forbidden by it

`05`'s own `I-31` row carries this clause:

> **a per-behavior document may cite this row but must not restate it** (D-83, F-75)

**D-83 decided this in August**, and its own words are _the durable half of this row is the prohibition on restating I-31 at all_. **F-75 is why**, and it is not a tidiness argument: `07`'s B-4 (b) restated I-31 as a property of a validation table, _a table has no antecedent to carry_, so the condition **and the controller remains alive** was dropped in the copy — and three rows then asserted a terminal that D-66 forbids. The contradiction arrived as a **passing test** against a contract that says otherwise.

**So F-287 is not a new question. It is an existing rule that was never given an instrument, applied to one identifier instead of to the class.** And `02-kernel-behavior-contract.md:882` still opens `### I-31 — once a start is notified, exactly one terminal callback follows`, which is a heading claiming an identifier whose own canonical row forbids restating it.

---

## 3. Canonical ownership

**The canonical owner of an identifier is the register that holds its family**: `00-index.md` for `F-*`, `05-lifecycle-invariants.md` for `I-*`. This is not a new allocation — it is where each family's complete, ordered set already lives, and where a reader who does not already know the answer looks first.

**The satellite is not demoted and nothing moves.** All 71,238 characters stay exactly where they are, in the document whose argument they belong to. What changes is a claim, not a location: **the satellite stops asserting ownership of the identifier and starts citing it.**

---

## 4. What remains in the satellite, and how a local reader navigates

**The identifier leaves the heading-key position and becomes a citation inside the heading:**

```
### F-2 — part factory determinism · open, tier C          →   ### Part factory determinism (F-2)
### I-31 — once a start is notified, exactly one terminal  →   ### The terminal guarantee, qualified (I-31)
```

**This is what makes the fix structural rather than a convention.** A heading whose first token is the identifier is an ownership claim at any depth; a heading that mentions the identifier in a parenthesis is prose. The distinction is mechanical, it does not depend on how many hashes precede it, and **it cannot be undone by a depth change** — which is precisely the failure F-287 records.

**Three things remain in the satellite**, and the first two are unchanged:

1. **The whole analysis, verbatim** — the evidence, the reasoning, the local consequences, the retracted clauses with their strikethrough intact.
2. **Its place in the document's argument.** `05`'s findings are interleaved with the invariants they bear on; `07`'s four are the conflicts that document raised against the kernel. Moving them into the register would strip both documents of their own reasoning and would put 20,697 characters of F-47 into a register whose job is one statement and one status.
3. **A canonical pointer, first line of the subsection**: `**Canonical entry: `F-2` — [`00-index.md`](00-index.md) §Findings.**` A local reader following the document's argument reaches the analysis where it belongs and reaches the status in one hop.

**And the register gains the reciprocal**, one line in the canonical entry naming where the analysis lives. The register keeps its job — statement, severity, status — and stops being the only place a reader can find out that a longer treatment exists.

**Nothing is deleted, nothing is moved, and exactly one heading claims each identifier.**

---

## 5. The structural invariant

**An identifier may open a heading only in the document that canonically owns it, and only at `####`.**

The integrity layer reads claims at **every** depth:

```
CLAIM = /^#{1,6} ([A-Za-z]{1,3}-\d+)(?: — |$)/
```

over every current-state document, asserting two things:

- **every claim is at `####`** — an identifier-shaped heading at any other depth is a defect, not an unrelated heading;
- **no identifier is claimed twice** — across documents, not within one.

**The extractor is unchanged and stays at `####`.** That separation is the point: `entry.ts`'s `ENTRY` regex answers _what can I address_, and `CLAIM` answers _what claims to be addressable_. F-287 exists because those two questions had one answer, so a heading the extractor ignored was treated as absent rather than as wrong. **A reader's blind spot became the record's invariant**, and that is the thing the invariant is there to stop.

Run against the tree today it reports 47 duplicates and 48 off-depth claims — which is the finding, stated executably.

---

## 6. The migration boundary, and why the two must land together

**Forty-eight claims: the forty-seven `F-*` pairs and `02`'s `I-31`.** That is the whole unit, and it is smaller than it looks — no content moves, so the edit is one heading rewrite and one pointer line per claim, plus one pointer line in each of the forty-seven canonical entries.

**`I-31` is why this cannot follow D-173 rather than accompany it.** It is not a duplicate today: `05`'s `I-31` is still a table row, and a row is not a claim. **D-173's migration turns that row into `#### I-31` — and creates the forty-eighth duplicate on the day it lands.** So:

- landing D-173 alone takes the duplicate count from 47 to 48 and puts `entry.sh drag2:I-31` into the ambiguous state the reader refuses;
- landing the invariant alone, before D-173, is green on the `I-*` family and red on the 47, which is the finding and is fine;
- landing D-173's migration and this disposition in one unit is the only order in which the invariant is never knowingly left red for a reason someone has already fixed.

**The smallest boundary is therefore: D-173's three tables, the forty-eight claims, and the `CLAIM` check, in one pass** — with the check landing last, because it is the gate on the other two rather than a step beside them.

---

## 7. Method

The pair census is a scope-walk over `.plan/contract/*.md`, `.plan/obligations.md` and `.plan/ledger.md`, matching `/^(#{1,6}) ([A-Za-z]{1,3}-\d+)(?: — |$)/` and grouping by identifier: 496 identifiers claimed, 47 claimed twice, 48 claimed off-depth. Similarity is word-set containment over the satellite's title-plus-body against the index's title-plus-body, on words of five characters or more — **the first run compared bodies only and understated every pair**, because the index puts its statement in the title, and that error is corrected here. The shape classification was not left to the scores: the five lowest title-agreement pairs and the highest-containment pair were read in full. The D-83 and F-75 texts were read through `.scripts/entry.sh`.

**LSP plugin — available; not used**: nothing here turns on a code symbol. The subjects are markdown heading structure, two regexes and a text census.

---

## Amended by D-175, 2026-09-03

Two details of the mechanism above are superseded by [`d175-stable-anchor-and-shared-identifier-claude.md`](d175-stable-anchor-and-shared-identifier-claude.md), and the ownership disposition is not.

1. **The reciprocal pointer is the qualified address, not a heading fragment.** `00-index.md#f-2` addresses nothing — a GFM anchor is the slug of the heading's whole title (F-288) — and the pointer form above has been corrected in place.
2. **`CLAIM` and `ENTRY` share one exported `LOCAL_ID` = `[A-Za-z][A-Za-z0-9]*-\d+`** rather than capping the prefix at three letters (F-289), and the invariant gains a second clause: a heading whose identifier is followed by ` §` is a named sub-clause, legal below `####` and required to nest inside the entry claiming that identifier. Four such headings exist today and are legitimate.

The measured failure counts — 47 duplicate claims, 48 off-depth claims — and the migration boundary are unchanged.
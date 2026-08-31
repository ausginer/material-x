# F-244 … F-248 closure — feature proof

**Commit read at:** `2919b975` (`drag2: finish the D-165 migration across the kernel behavior contract`). Confirmed the single commit in the range: `git log --oneline 55a20d2f..2919b975` returns one line. `HEAD` is `2919b975`, and `git diff 2919b975..HEAD -- packages/drag2/.plan/contract packages/drag2/src` is empty, so the working tree is the reviewed tree.

**Diff range:** `55a20d2f..2919b975` — four files: `.plan/contract/00-index.md`, `.plan/contract/02-kernel-behavior-contract.md`, `.plan/plan.md`, `src/sortable/spec.ts`.

## Scope

**Not diff-bounded, and not citation-bounded.** The prior three rounds each swept only as far as the previous finding's citations pointed, so this pass drew its boundary from where the wording can live rather than from where it had been found.

- **The whole of `02-kernel-behavior-contract.md` at `2919b975`, all 2026 lines, read start to finish** in seven sequential reads (1–340, 340–660, 660–960, 960–1260, 1260–1560, 1560–1859, 1859–2026), including every section no prior round touched or cited — the input-policy sections, the D-68 vocabulary tables, post-commit ordering, the settlement gate, the landing sections, the phase legality table, queue semantics, failure classification, and §Where the four changes touch each other. Tables, fenced/ASCII diagrams, doc comments inside `ts` fences, headings and parenthetical clauses were read as first-class sites, not skimmed as prose.
- **The whole of `src/`** — all 60 `.ts`/`.tsx` files under `packages/drag2/src/`, swept by regex for the retired wording class rather than by following F-247's citation.
- **Cross-references to shipped source**: `src/kernel/spec.ts` (`AdmissionSubject`, `ActivationScope`), `src/kernel/presentation.ts` (`acquireLift`, `InheritedSpace`, `LiftAcquisition`), `src/kernel/kernel.ts` (the acquisition call site), `src/sortable/spec.ts` (`seedDraft`, `admitFrom`).
- **E-01's original text**, located at `.plan/reviews/checkpoint-e/review-checkpoint-e-1-codex.md:28-30`.
- **`00-index.md`'s D-85 row** and the citation-form norm across that file.

**Not covered:** the other contract pages (`01`, `03`–`07`), `tests/`, and `.plan/` records other than `plan.md`'s new entry and `00-index.md`'s D-85 row. Silence about those is absence of coverage, not a clean result.

## Verdict on the load-bearing claim

> The D-165 migration is now complete across `02-kernel-behavior-contract.md`, and the retired two-role/single-space wording class no longer survives as a live claim on that page or in `src/`.

**The claim holds.** No live (unstruck) statement anywhere on the 2026-line page or anywhere under `src/` asserts `AdmissionSubject` as `{ visual, box }`, a single `ActivationScope.inheritedSpace`, or a single ancestry read as the current model. Every surviving instance of the retired forms is either inside a strike, inside an explicit "it read X until D-165" retirement note, or a use of a shared word (`pair`, `half`) in an unrelated sense.

One residue is recorded below as `proof-1` at tier **C**. It is a scope ambiguity in the commit's own clarifying sentence, not a surviving false claim, and it misleads no reader about the shape. I am reporting it because the pass asked for the full "pair" census with all three categories, and it is the single instance that falls in neither the clearly-governed nor the clearly-unrelated bucket. **If the consolidator reads it as below the bar, the correct outcome is a null result for this pass** — I did not find a surviving instance of the retired wording class.

## What was verified

### 1. Whole-page sweep for the retired class

Mechanical sweeps over the full file, each cross-checked against the end-to-end read:

| Pattern | Live (unstruck) instances asserting the retired model |
| --- | --- |
| `{ visual, box }` / `visual: HTMLElement; box` | **none.** L271 and L433 are inside `~~…~~`; L1092 is an explicit retirement note beneath a fence; L434–435 are the two _rejected_ candidate forms in D-59's verdict table, which are meant to name shapes that were refused. L276 and L1075 are the current three-role forms. |
| `inheritedSpace` | **none.** L1003 is inside `~~…~~`; L1034 is the struck old heading with its retirement note. |
| single-ancestry-read claims (`one read`, `second read`, `second traversal`, `one traversal`) | **none.** L984 is inside the struck block in `visualSpace`'s doc; L1044 is the struck F-244 sentence; L1046 is the replacement. L1019 — _"the kernel reads one ancestry and shares one buffer"_ — is explicitly scoped to _"whenever the item is the visual, which is the default"_, and is true of `acquireLift`'s `item === visual ? above : space()`. |
| `two roles` / `three roles` / `second half` / `box half` | **none live and stale.** L259 states _"D-165 makes it three roles"_; L950's `~~box half~~` is a strike; L817/L1971/L1992's "second half" are unrelated (a two-clause sentence, D-64, D-60). |

The `admit` seam-table row (L455) and the `AdmissionSubject`/`ActivationScope` type blocks were checked as tables and fences specifically, since F-245 and F-248 established that a prose-only sweep reads past exactly those forms. All are current.

### 2. F-244 — the D-85 placement argument

**The heading rename landed** (L1032): `#### Why the inherited space is on the scope and not on the session (D-85, D-165, E-01)`, with the retired heading struck beneath it at L1034 in the page's established prose-strike form.

**The new argument (L1046) is factually correct against the tree.** Every clause was traced to `src/kernel/presentation.ts`:

- _"three observations, one policy"_ — `acquireLift` at `src/kernel/presentation.ts:511-521` gates on one `if` with three disjuncts and one throw:

  ```ts
  if (
    !ancestry(visual, above) ||
    (itemAbove !== above && !ancestry(item, itemAbove)) ||
    // The visual is measured **through** the ancestry just read, so the
    // matrix and the space it is decomposed against are one observation.
    !coordinates(visual, measured, above)
  ) {
    throw new Error('drag: presentation/visual-no-box-space');
  }
  ```

  This is exactly the prose's _"the visual's ancestry, the item's when the two are different elements, and the visual's box measured through the first."_ The `itemAbove !== above` guard matches _"when the two are different elements"_ (`itemAbove` is `item === visual ? above : space()`, `:508`).

- _"the caller classifies `FAILURE_ACTIVATION`"_ — matches `acquireLift`'s own doc, `:488-491`: _"Throws when either space cannot be read… The caller classifies it as `FAILURE_ACTIVATION`."_ The new prose is **more** precise than the struck sentence it replaces, which attributed the classification to `acquireLift` itself.
- _"The reads are all taken before anything is mutated"_ — `:474-479` and `:536-539` (`// Everything below mutates the visual`), with the spaces computed at `:527-529` above that line.
- _"no reading outside `acquireLift` has existed since"_ — `grep -rn "ancestry(" src/` returns exactly two call sites, both inside `acquireLift`. `captureLocalSpace` exists nowhere in `src/`; it survives only in `.plan/` records and one historical test comment.
- _"D-165 … does add a read"_ — matches `:481-486` (_"The item's ancestry is a second walk, and it is spent deliberately"_) and `src/kernel/kernel.ts:1207` (_"One acquisition, three products"_).

**Against E-01's original text.** `.plan/reviews/checkpoint-e/review-checkpoint-e-1-codex.md:30` reads: _"The two reads also disagree on failure: `acquireLift()` rejects an unreadable space as `FAILURE_ACTIVATION`, while `captureLocalSpace()` silently substitutes identity for unreadable, singular, or non-finite geometry."_ The new sentence — _"What E-01 found was two policies, not two reads: `acquireLift` refused an unreadable space while the behavior's own `captureLocalSpace` silently substituted the identity"_ — is a faithful restatement of E-01's own sentence, not a reconstruction. The "two policies, not two reads" reading is supported by E-01's text rather than imposed on it.

**The `00-index.md` D-85 citation resolves.** The row now cites _"§Why the inherited space is on the scope"_ (`00-index.md:371`). The live heading is _"Why the inherited space is on the scope and not on the session (D-85, D-165, E-01)"_ — the citation is a prefix truncation, and a unique one on the page. **Truncated/informal section citation is the norm in this document**, not an exception: sampling `00-index.md`'s `§` references turns up `§Landing states as normative`, `§Failure classification lists every stage with a recovery`, `§Teardown's "physical release completes before it returns"`, `§The join's "the terminal callback is skipped after a consequential failure"`, `§The public/internal boundary's "public and stable at the ordinary tier"`. Judged against that norm the citation is consistent, and it now points at a heading that no longer names the retired field. No stale `§Why \`inheritedSpace\` is on the scope`citation survives anywhere in`.plan/contract/`; the only remaining occurrences of that string are in prior review artifacts, which are historical records.

### 3. `src/` sweep

Regex sweep across all 60 files under `src/` for `\bpair(ed|s)?\b`, `\bhalf\b`, `two.role`, `second half`, `first half`, `box half`, `visual half`, `inheritedSpace`, `inherited space`. **No instance of the retired class survives.** Every hit is unrelated: `queue.ts:25` (arrays positionally paired), `frames.ts:49` / `sortable/frames.ts:35` / `free-drag/frames.ts:40` (create/reset pair), `kernel/types.ts:10` (a coordinate pair), `sortable/config.ts:45,57,74` (the `{from, to}` pair), `kernel/kernel.ts:162` (`targetX`/`targetY`), `input-policy.ts:5-8` / `behavior.ts:14,29` / `free-drag/feature.ts:112-114` (two-halves-of-a-thing rhetoric), and a family of `half-built` / `half-written` / `half-started` compounds.

Two `sortable/spec.ts` sites were read in full rather than pattern-matched, because they name admission and could have been the retired form:

- **`:382`** — _"The second half of admission: resolve the visual and the box, and seed the draft with an item **already resolved**."_ This describes the _process_ split between `admitFrom` and `seedDraft` (the item arrives as a parameter, so only the visual and box are resolved here). Correct, and not a claim about the subject's shape.
- **`:453`** — _"The half of admission both ingresses share: resolve the item, the visual and the box… Returns the admission subject — a bare element when all three coincide, or the triple when they do not."_ Current three-role wording.

The commit's own edit at `:424` (_"So it travels as a named member of the admission subject"_) is the F-247 site, and the surrounding code returns `{ visual, box: visual, item }` / `{ visual, box, item }` at `:432` and `:449`.

### 4. Residue check on "pair" — the full census

Word-boundary census of the whole page: 15 occurrences, at L258, 314, 439 (×2), 447, 455, 657, 888, 974, 1070, 1100, 1304, 1488, 1491, 1933.

**(a) Admission-shape sense, correct under the object-form reading:**

| Line | Text | Status |
| --- | --- | --- |
| 439 | _"the **pair** is the only way to say 'different'"_ | Above the clarifier (L443), explicitly governed. Reads correctly: the object form is the only way to say "different". |
| 439 | _"The **pair** with `box === visual` is legal, inert and pointless"_ | Above the clarifier, governed. Reads correctly under the object form, where `box === visual` with a distinct `item` is a legal, inert composition. |
| 447 | _"an `HTMLElement` is always truthy and the **pair** is an object"_ | Substantively correct — the object form is an object, which is the whole of the truthiness argument, and cardinality is irrelevant to it. But it sits **after** the clarifier, whose scope word is _"above"_. See `proof-1`. |

**(a′) Retired, and correctly retired** — these are inside strikes and are not live claims:

| Line | Text |
| --- | --- |
| 258 | _"~~… The **pair** form names a separate geometry source.~~"_ — inside the struck block in `AdmissionSubject`'s doc |
| 314 | _"~~… optionally **paired** with the element the kernel should measure …~~"_ — inside the struck `admit` doc clause |
| 455 | _"~~**return the subject** — the visual …, **paired** with the box … when the two differ (D-59).~~"_ — the struck half of the `admit` seam-table cell, restored to a strike by F-246 |

**(b) Unrelated senses** — nine, none of which touches admission:

| Line | Sense |
| --- | --- |
| 657 | the `data-drag-ignore` attribute _pairs with_ `data-drag-placeholder` |
| 888 | the _pairing_ between a subscription's start and its end (I-31) |
| 974 | `OffsetBox`'s width/height _pair_ |
| 1070 | api-1 measured only nested _pairs_ — box/visual nesting for the footprint, a genuinely two-element relationship |
| 1100 | a `getBoundingClientRect()` _pair_ — the two measurement windows |
| 1304, 1488, 1491 | the `targetX`/`targetY` scalar _pair_ (D-145) |
| 1933 | a frame-_pair_ swap in the queue |

**(c) Silently retaining two-role semantics: none.** No occurrence of "pair" on the page still asserts, or can be read as asserting, that the admission subject has two members.

### 5. Shape fidelity against shipped types

| Contract site | Shipped | Agrees |
| --- | --- | --- |
| `AdmissionSubject` (L274-276) | `src/kernel/spec.ts:116-128` | **yes** — `HTMLElement \| Readonly<{ visual; box; item }>`, same three members in the same order, all required |
| `ActivationScope` (L940-1029) | `src/kernel/spec.ts:157-232` | **yes** — nine members, same names and same order: `visual`, `originRect`, `box`, `boxPre`, `visualSpace`, `itemSpace`, `lift`, `motion`, `presentation`. Neither carries an `item` member, so the contract is not over- or under-stating the scope. |
| `InheritedSpace` (L933-938) | `src/kernel/presentation.ts:349-354` | **yes** — `Readonly<{ a; b; c; d }> \| null` |
| D-59 verdict table's "this" row (L433) | as above | **yes** — `HTMLElement \| { visual, box, item } \| null` |
| D-52 ownership diagram (L1075) | as above | **yes** — `RETURNS { visual, box, item }` |

**No live prose anywhere on the page asserts a single `inheritedSpace`, a single ancestry read, or `{ visual, box }` as the current admission shape.** Verified by the end-to-end read and by the four sweeps in §1.

### 6. Behavior-neutrality

- `git diff 55a20d2f..2919b975 -- packages/drag2/src` is **exactly two lines**, one comment removed and one added:

  ```
  -    // So it travels as the second half of the admission subject.
  +    // So it travels as a named member of the admission subject.
  ```

- Stripping comment lines from both versions of `src/sortable/spec.ts` and diffing yields **identical** output. No logic, no type, no runtime change, and no diagnostic string (the F-241 case) is involved.
- `git diff --name-only` confirms **no file under `tests/` is touched**, so no measurement, composition or perf fixture moved. Nothing in this delta gives cause to reopen one: the only source change is a comment inside a factory closure that reaches no emitted declaration.

## Findings

### `proof-1` — the clarifying sentence's scope is ambiguous, and one later use of "pair" falls in the ambiguity

**Tier: C.** Internal to the document's own retirement bookkeeping; no consumer-observable effect, and no reader is misled about the admission shape.

**Current text.** L443 closes D-59's reasoning with: _"**Read *the pair* above as *the object form* from here on**: the reasons are unchanged, the cardinality in the name is not."_ The sentence carries two scope markers that point in opposite directions — _"the pair **above**"_ (backward, at L439's two uses) and _"from here on"_ (forward). L447, four lines later, still reads: _"an `HTMLElement` is always truthy and **the pair** is an object."_

**Why it is a problem.** Under the backward reading the clarifier does not reach L447, leaving one live use of the retired cardinality name ungoverned; under the forward reading it does. The two readings are both available from one sentence, so which of them a reader takes decides whether the page has finished retiring the name. This is the same class the round is closing — a retirement whose stated boundary is narrower than where the wording lives — at one-sentence scale.

**What is _not_ wrong.** L447's argument is about the union having no falsy member. The object form is an object and therefore truthy; the count of its members plays no part. So the sentence is **substantively correct** under the object-form reading and asserts nothing about two roles. This is a residue, not a surviving false claim, which is why it is tier C rather than tier B.

**Evidence.** `packages/drag2/.plan/contract/02-kernel-behavior-contract.md:443` and `:447`. Full census in §4 above: L447 is the only one of the 15 occurrences that is neither clearly governed by the clarifier nor clearly unrelated to the admission shape.

**Required property.** Every live use of "pair" for the admission shape on this page is unambiguously governed by a retirement whose scope a reader can determine from the retirement's own wording.

## Non-findings, recorded so silence is not mistaken for coverage

These were examined and are **not** findings. They are listed because each is a place a later pass might otherwise re-derive as new.

- **`00-index.md:371`'s D-85 "Why" column still reads _"`acquireLift` throws `FAILURE_ACTIVATION` for an unreadable space."_** Strictly, `acquireLift` throws `new Error('drag: presentation/visual-no-box-space')` and the _caller_ classifies (`src/kernel/presentation.ts:520`, `:490`). But this shorthand is the house form and is used by the shipped source itself — `src/kernel/spec.ts` carries _"`acquireLift` throws `FAILURE_ACTIVATION` for an unreadable space"_ verbatim in `visualSpace`'s doc. It is pre-existing, is not in the D-165 wording class, and this commit did not touch it. Not raised.
- **L1121** — _"The lift, `originRect`, `box`, `boxPre` and both lifetimes are acquired identically"_ for a pointerless operation — enumerates pointer-independent scope facts without naming `visualSpace`/`itemSpace`. The list is not claimed exhaustive, the omission asserts nothing about the space count, and the text is pre-existing (untouched by this diff). Not the retired class.
- **L979-1002**, `visualSpace`'s doc body, including _"The walk itself is no longer shared with the measurement"_ — pre-existing at `55a20d2f`; this commit added only the `~~inheritedSpace~~` retirement paragraph at L1003-1005. It is D-165-aware and outside this pass's claim.
- **L434-435**, D-59's two _rejected_ verdict rows (`{ visual, box? }`), correctly still spell the shapes that were refused; rewriting them would destroy the record of what was rejected.

## Summary

The migration is complete on the surface the claim covers. The commit is docs-and-records plus exactly one source comment, and the source is byte-identical once comment lines are stripped. F-244's replacement argument is not merely non-false — it is checkable against `acquireLift` clause by clause, and it is a faithful reading of E-01's own text rather than a reconstruction of it. The heading rename and the `00-index.md` D-85 citation resolve against each other and against the file's citation norm. `proof-1` is a one-sentence scope ambiguity at tier C and is offered for the consolidator's judgement; setting it aside, this pass found no surviving instance of the retired wording class.
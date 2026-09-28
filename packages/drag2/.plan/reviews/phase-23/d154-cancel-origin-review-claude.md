# D-154 `origin: CancelOrigin` — implementation review

**Independent review, 2026-08-29.** Subject: `5c9269e8`, which implements D-154 (`c556df4a`). The decision is taken as settled; this pass asks whether the landed code preserves it, whether the producer mapping is exhaustive and correct, and whether the measurement and documentation updates are internally consistent with the tree they describe.

**Verdict: the mechanism is correct and the mapping is exhaustive.** Every producer routes to the intended origin, `reason` carries no provenance on any kernel-decided path, the three deleted strings are gone from runtime and tests, the export siting matches the decision, and **every one of the fourteen size figures reproduces to the byte**. Five findings, all tier C, all in the record rather than the runtime: three are bookkeeping in the census and the budget prose, one is a missing test row, one is an undocumented interaction between `origin` and the failure-precedence rule, and one is a dead-link defect in the decision record itself.

---

## 0. What was checked, and how

Read `5c9269e8` in full — source, tests and records — then verified each claim against the tree rather than against the diff. Instruments:

- **Runtime enumeration.** `kernel.js`, `sortable.js`, `free-drag.js` and `drag.js` imported and their export keys counted, against the arrays the suites assert and against every count written in prose.
- **Mutation.** Three one-token source mutations, each applied, run and reverted inside a single command; the tree is byte-clean after each.
- **A probe on the live suite.** One deliberately-wrong assertion inserted to read back a value nothing asserts, then reverted.
- **Byte measurement.** `bench/size/measure.ts`'s own `measureAll` run against `5c9269e8` and against a worktree built at `c556df4a`, raw rather than the rounded display.

Suite at HEAD: **65 files, 1219 passed, 116 skipped, no type errors**; `typecheck` exit 0; build exit 0.

---

## 1. The producer mapping is exhaustive and every arm is right

`cancelWith(reason, origin)` is the sole writer of `cancelRequest`, and it is reached from exactly three places in `src/`:

| Site | Call | Origin |
| --- | --- | --- |
| `kernel.ts:725` | `cancel(reason?)` → `cancelWith(reason, CANCEL_SUPPLIED)` | `SUPPLIED` |
| `kernel.ts:848` | `case POINTER_CANCEL: case LOST_POINTER_CAPTURE:` → `cancelWith(undefined, CANCEL_INTERRUPTED)` | `INTERRUPTED` |
| `kernel.ts:856` | `onEscape` → `cancelWith(undefined, CANCEL_ABORTED)` | `ABORTED` |

`grep` over `src/` finds no fourth. The fourth origin is minted by the behaviors and only there: `CANCEL_FAILED` appears in a value position at `sortable/spec.ts:1623` and `free-drag/spec.ts:777`, both inside the `SETTLED_FAILED` fallback, and nowhere else.

**`KernelHost.cancel` is always `SUPPLIED`, including from a behavior.** `cancel` is a one-line face over `cancelWith` and there is no second entry point; a behavior's controller spreads it through unchanged, which is the decision's own argument reaching the code intact. `sortable/spec.ts:1316` — `host.cancel(staged.cancelReason)`, carrying `CANCEL_ITEM_REMOVED` or `CANCEL_COLLECTION_INVALIDATED` — therefore lands on `SUPPLIED`, and the sortable suite asserts both spellings through the public entry.

**Escape carries no provenance on `reason`.** `cancelWith(undefined, CANCEL_ABORTED)`, and `onEscape` is reachable from one listener only (`armCancelInput`, `pointer.ts:58`, gated on `event.key === KEY_ESCAPE`). Falsifier: restoring the smuggle — `cancelWith('drag:escape', CANCEL_ABORTED)` — fails **3 rows across all three suites** (`should carry no reason for an Escape`, kernel/sortable/free-drag). The assertion is real.

**`pointercancel` and `lostpointercapture` genuinely share one arm.** They are two `case` labels falling through to one statement, not two calls that happen to agree — so no edit can separate them without being visible. Falsifier: splitting them and giving `LOST_POINTER_CAPTURE` a different origin fails **2 files** (kernel, sortable); see §5 for the third.

**`CANCEL_FAILED` preserves the throw verbatim.** The fallback writes `reason: input.error`, and `SettlementInput`'s failed arm carries `error: unknown` (the raw throw) beside `report: DraggableError` (the built public error). The fallback takes the former. Confirmed behaviorally: both `should mark a classified failure as failed` rows assert `reason: failure` against the identical `Error` instance the consumer threw, not a wrapper.

**`destroy()` publishes no canceled terminal.** `destroy` sets `queue.closed` and nothing else on the closing statement; `cancelWith`'s first guard is `queue.closed`, so no latch is set and no `CANCEL` is dispatched. Asserted directly by the new `should publish no terminal at all when the controller is destroyed` — `cancels` and `finishes` both empty — which is F-172 turned from prose into a row.

---

## 2. The three kernel sentinels are deleted, not relocated

`CANCEL_ESCAPE`, `CANCEL_POINTER_CANCELED`, `CANCEL_CAPTURE_LOST` and the three string values they held return **zero hits** across `src/`, `bench/`, `files.json` and the built artifacts. One hit survives in `tests/kernel/kernel.browser.test.ts:3075`, inside a comment explaining what used to travel there — which is the correct place for a deleted vocabulary to be named.

No behavior constructs a `DraggableError`: minting stays where it was, and `origin` changes nothing about classification, precedence or the checkpoint. The `??=` tie-break is untouched, and it does the right thing with the new field in both directions — a settlement that already committed a canceled result keeps its own origin when a later failure arrives, and a failure that arrives first mints `CANCEL_FAILED`.

---

## 3. The export siting matches the decision

Enumerated at runtime rather than read off the diff:

| Entry | Runtime exports | `CANCEL_*` origins | Sortable's two reasons |
| --- | --: | --- | --- |
| `kernel.js` | 35 | all four | — |
| `sortable.js` | 10 | all four | both |
| `free-drag.js` | 11 | all four | — |
| `drag.js` | 14 | **none** | — |

`drag.js` is untouched, which is the siting decision's negative half, and it shows up in the measurement as a 0/0 row. `sortable/feature.js` and the other sub-entries gained nothing. `CancelOrigin` is added to `vocabulary.node.test.ts`'s `PUBLISHED_TYPES` and the packed-consumer fixtures name and discriminate it off all three ordinary entries.

The packed-consumer fixture also pins the other half — the `@ts-expect-error: an open channel narrows to nothing` on `const claimed: string = result.reason` — so a future widening of `reason` into something narrowable would fail the consumer build rather than pass quietly. That is the assertion that keeps provenance off the open channel, and it is the right one.

---

## 4. Size: every figure reproduces

`measureAll` at `5c9269e8` against a worktree built at `c556df4a`, raw bytes:

| Row | Brotli | Δ brotli | Δ minified | Modules | Recorded |
| --- | --: | --: | --: | --: | --- |
| minimal | 9,913 | +11 | +23 | 31 → 31 | ✔ |
| minimal (xy) | 9,580 | +16 | +23 | 30 → 30 | ✔ |
| minimal + layoutAnimation | 10,353 | +6 | +23 | 32 → 32 | ✔ |
| minimal + landing | 10,178 | +16 | +23 | 33 → 33 | ✔ |
| complete | 10,595 | +9 | +23 | 34 → 34 | ✔ |
| free drag minimal | 7,750 | +11 | +22 | 25 → 25 | ✔ |
| free drag + bounds | 7,897 | +8 | +22 | 26 → 26 | ✔ |
| free drag + landing | 8,017 | +9 | +22 | 27 → 27 | ✔ |
| free drag complete | 8,151 | +8 | +22 | 28 → 28 | ✔ |
| both behaviors | 11,927 | +19 | +48 | 45 → 45 | ✔ |
| `drag.js` | 142 | 0 | 0 | 2 → 2 | ✔ |
| `kernel.js` | 6,063 | +7 | **−4** | 14 → 14 | ✔ |
| baseline A | 10,375 | +4 | +23 | 29 → 29 | ✔ |
| baseline B | 6,889 | 0 | 0 | 26 → 26 | ✔ |

**All fourteen absolutes, both delta columns and all fourteen slack values reproduce exactly.** The module topology is unchanged on every row, and the two controls are byte-identical, so the harness did not move. The budgets in the table match `measure.ts`'s fourteen declared numbers one for one, and `measure.ts` is not in the commit — the run really was taken with the instrument unchanged.

The qualitative attribution is sound where it is checkable. `kernel.js` is the only row that shrinks in source, and it is the only row that publishes the new constants — the composition rows import `{ sortable }` / `{ freeDrag }` by name, so the four cells are tree-shaken out of them and the +22/+23 there is entirely the field plumbing net of three deleted literals. That is the shape the paragraph claims.

**One clause in that paragraph does not follow from its own table.** _"+22 to +23 B minified on every row that carries a behavior — twice on `both behaviors`, which carries two"_ predicts 44–46 B; the measured figure is +48. The row does not decompose either: with `K` the shared kernel plumbing, `K + S = 23` and `K + F = 22` against `K + S + F = 48` gives `K = −3`. At this scale the residue is mangling pressure, not a mechanism, so the honest reading is that the +48 is measured and not explained — which is weaker than the sentence claims but stronger than the sentence needs.

---

## 5. Findings

### F-174 — the kernel-tier value census is written at four sites with three different numbers, and none of them is the tree's

**Tier C.** `kernel.js` exports **35** runtime values (enumerated by import). The commit updates every count by adding four to a base nobody re-derived:

| Site                          | Says          | Actual | Before D-154    |
| ----------------------------- | ------------- | -----: | --------------- |
| `02 §The vocabulary`          | "Values — 32" |     35 | said 32, was 31 |
| `03 §The export topology`     | "36 values"   |     35 | said 32, was 31 |
| `tests/exports.node.test.ts`  | "37 names"    |     35 | said 33, was 31 |
| `tests/consumer.node.test.ts` | "37 values"   |     35 | said 33, was 31 |

`03`'s own enumeration in the same cell — `draggable` + 12 + 3 + 5 + 2 + 4 + 8 — sums to **35**, so the sentence disagrees with the list it is the total of.

The type half has the same shape: `03` adds `CancelOrigin` to the type column and leaves "**35 types**" standing, while `PUBLISHED_TYPES` in `tests/kernel/vocabulary.node.test.ts` goes 35 → **36** in this same commit.

**The load-bearing part is not the arithmetic.** `03` delegates the enumeration explicitly — _"enumerated in [02] §The kernel tier's public vocabulary"_ — and `02` received a four-line edit in this commit that touches only the settlement mapping table. Its §The vocabulary has **no row for the cancel origins at all** (the value table runs Construction / Failure stages / Lift modes / Settlement inputs / Cancel stages / Phases) and **no `CancelOrigin` row** in the type table. So the document `03` names as the census does not contain the four values and the one type that D-154 published, and `02` says of its own totals that _"a future addition that satisfies it does not need this sentence's permission, only its correction"_ — the correction it asks for was not made.

**Witness:** `node -e "console.log(Object.keys(await import('./kernel.js')).length)"` → `35`. **Falsifier:** if `02` gains a `Cancel origins — 4` row and the four totals are re-derived rather than incremented, this dissolves.

### F-175 — the slack range 456–630 B is asserted over rows it does not cover

**Tier C.** Measured slack across the fourteen rows the run tabulates is **63–630 B**. Three rows fall outside the quoted range, and two of them are declared budget rows:

| Row         | Brotli | Budget |   Slack |
| ----------- | -----: | -----: | ------: |
| `drag.js`   |    142 |    205 |  **63** |
| baseline B  |  6,889 |  7,040 | **151** |
| `kernel.js` |  6,063 |  6,309 | **246** |

The claim is made three times, each with a different scope and each wrong in a different way:

- `budget-rebases.md` §SC-1 fires — _"Every one is under budget with 456–630 B of slack"_, immediately after tabulating all fourteen.
- `obligations.md` SC-1 — _"**Every row** is under budget with 456–630 B of slack"_. This replaced the previously-live "Slack is 114–154 B", so the register's live headroom figure moved from one stale number to one that excludes its own tightest rows.
- `00-index.md` D-154 — _"456–630 B of slack on the twelve behavior rows"_. The range is correct for the rows that carry a behavior, but there are **eleven** of those (ten compositions plus baseline A), not twelve.

**Why it matters beyond tidiness.** The two rows the range drops are the ones with the least margin in the table, and `drag.js` at 63 B against a 205 B budget is the row whose whole job is to notice a module arriving in the vocabulary root — the instrument §Headroom says the budgets exist for. Quoting 456–630 as the state of the table overstates that row's margin by roughly seven times, in the same paragraph that concludes no re-base is earned.

**Falsifier:** compute `budget − brotli` for all fourteen rows of the run's own table.

### F-176 — the composition-premium series is not extended, and its standing figure is now stale

**Tier C.** `bundle-structure.md` is not in this commit at all. Its §What composition costs is a running series in which each of the last four landed changes carries its own dated subsection with per-row deltas and a premium — D-152 (208 B, 1.96%), the error classes (211 B, 1.99%), the re-entry withdrawal (216 B, 2.04%), D-153 (215 B, 2.03%). D-154 adds none, and it moves the number: `complete` 10,586 → 10,595 against baseline A 10,371 → 10,375, so the premium is **220 B, 2.08%**. The last recorded value reads as current and is 5 B behind.

The premium is not a decoration in that document — it is the answer to the question `03 §What isolation cannot shake` asks and §What composition costs exists to keep answering, and this same file records two prior findings (F-136, F-157) whose shared form is _a number carried forward instead of taken_. Leaving a moved premium unrecorded is the adjacent failure: a number not taken at all.

A second consequence follows from the same omission. `obligations.md` SC-1 cites `bundle-structure.md §Headroom` as where its rule was decided; that section's live-tense _"Slack runs 114–154 B"_ was in sync with the register until this commit rewrote the register's half to 456–630. The pair now disagrees, and by F-175 neither is right. §Headroom's own closing sentence — _"The list above is the wording as decided and stands as it stands"_ — defends the frozen L-11 trigger text below it, and reasonably; it does not obviously cover the slack sentence above it, which is written in the present tense about the current table.

**Witness:** `10595 − 10375 = 220`; `220 / 10595 = 2.08%`. The prior pair `10586 − 10371 = 215`, `2.03%`, reproduces the recorded D-153 figure exactly, so the series and the instrument agree — only the last row is missing.

### F-177 — the free-drag provenance suite omits the one producer whose collapse the decision argues for

**Tier C.** The new `cancellation provenance` block in `tests/free-drag/free-drag.browser.test.ts` opens by claiming the mapping is _"the entire contract rather than half of it"_ for this behavior, because a free drag mints no reason of its own. It then covers five producer spellings and not `lostpointercapture`. The kernel and sortable blocks both carry that row.

This is the pair D-154 spends §4 of its record arguing about — the claim that `pointercancel` and `lostpointercapture` are two DOM spellings of one fact — so it is the row a reader of that record would look for first in the behavior whose provenance is entirely `origin`.

**Falsifier, run:** split the shared `case` and route `LOST_POINTER_CAPTURE` to `CANCEL_ABORTED`. Result: **2 files failed, 1 passed** — `tests/free-drag/free-drag.browser.test.ts` is green against a kernel that reports Escape's origin for a lost capture. The file already imports `CANCEL_INTERRUPTED` and already has the pointer helper, so the row costs four lines.

### F-178 — `origin` on the failure-superseded-by-cancel path is neither documented nor pinned

**Tier C.** `CANCEL_FAILED` is glossed identically in four places — `failures.ts`, `07 §The results`, `06`, and the decision record — as _"a classified failure decided the operation … `onError` has already fired"_. The second clause is true wherever the first is, but the converse does not hold, and the case where it fails is a documented precedence rule: `handleFailed` drops a checkpoint that arrives while `cancelRequest` is held, reports `drag: failure/superseded-by-cancel` as a `DraggableWarning`, and lets the cancel own the terminal.

**Probed on the live suite.** Against `should apply work a callback queued before it threw` ([`tests/sortable/composition.browser.test.ts:695`](../../../tests/sortable/composition.browser.test.ts)) — where `onStart` queues a collection replacement and then throws — the terminal's origin is **`30` (`CANCEL_SUPPLIED`)** while `onError` receives the superseded-by-cancel warning. That is correct: the failure did not decide. But it means a consumer branching `origin === CANCEL_FAILED` to answer _did something break?_ gets `false` on a drag that broke, and nothing in the record says so.

The existing test asserts `cancels` has length 1, the warning's class, its message and its cause, and never looks at `origin` — so the interaction is one `toMatchObject` line from being pinned, in a row that already drives it.

### F-179 — every source citation in the D-154 record is a dead link

**Tier C, and it belongs to `c556df4a` rather than to the implementation.** `cancellation-provenance-claude.md` cites seven files with `../../`, which from `.plan/reviews/phase-23/` resolves to `.plan/` and not to the package root. All seven are dead:

`../../src/kernel/kernel.ts`, `../../src/kernel/failures.ts`, `../../src/kernel/lifetimes.ts`, `../../src/sortable/spec.ts`, `../../src/free-drag/spec.ts`, `../../tests/sortable/composition.browser.test.ts`, `../../tests/free-drag/free-drag.browser.test.ts`.

Every sibling document in the same directory uses `../../../`, and every `.plan/contract/` citation the implementation commit added resolves correctly — including the D-154 row in `00-index.md`, which cites the same two behavior sites and gets there. So the defect is local to the record, and it is the record §2 rests on: the five-producer table that decides the whole decision is the part whose citations do not open. (Two unrelated dead links in `00-index.md` predate this work and are not D-154's.)

**Witness:** from `.plan/reviews/phase-23/`, `test -e ../../src/kernel/kernel.ts` fails and `test -e ../../../src/kernel/kernel.ts` succeeds.

---

## 6. What holds, stated explicitly

Each of these was checked directly and none produced a finding:

- `refuseReentry`-style ordering is not in scope here, but the cancel latch is unchanged: `cancelWith`'s three guards, the `cancelRequest = null` consumption in `handleCancel`, the `ACTIVATING` checkpoint outranking, and the `handleFailed` precedence check are byte-identical to `c556df4a` apart from the added field.
- `settleCancellation` now takes the request object rather than its `reason`, which is why the two fields cannot drift apart — there is one carrier, not two parameters.
- `SettlementInput`'s canceled arm's `origin` is required and the behaviors forward it (`origin: input.origin`); no behavior can omit it and typecheck.
- Both terminal result types carry `origin: CancelOrigin` inside their existing `Readonly<>`, each with a `reason` doc rewritten to say what the channel now means and each pointing at `origin` for provenance. The two differ only where the behaviors differ.
- The five origin-discriminating test rows are behavioral, not structural: each drives a real producer (a controller call, a synthetic `keydown`, a pointer event, a throwing resolver) and reads the result off `onEnd`, not off the settlement input. The `should not let a supplied reason forge an origin` row is the one that would fail first if provenance ever moved back onto `reason`, and it exists in all three suites.
- SC-1's trigger text is rewritten with the original struck rather than replaced, which is the repository's convention and makes the declined deliverable still readable.
- F-172's correction is asserted rather than described, in both behaviors.

## 7. Falsifiers for this review

- **F-174** dissolves if `kernel.js` exports something other than 35 values; run the import.
- **F-175** dissolves if `budget − brotli` is inside 456–630 for all fourteen rows.
- **F-176** dissolves if `bundle-structure.md` §What composition costs is shown to be a closed historical series rather than a live one, or if the premium is unchanged at 215 B.
- **F-177** dissolves if the free-drag suite fails under the split-`case` mutation.
- **F-178** dissolves if any row asserts `origin` on a path where a failure was superseded by a cancel.
- **F-179** dissolves if the seven paths resolve from `.plan/reviews/phase-23/`.
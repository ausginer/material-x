# Checkpoint D fifth review — implementation record

Covers **C5-01**, **C5-02**, **C5-04**, the architect's decision for **C5-03** ([`checkpoint-d-5-resolution-c5-03.md`](checkpoint-d-5-resolution-c5-03.md)), and the **sortable stretch table** that decision's §7 defines and §8 makes Checkpoint D's remaining closure obligation.

The review file was `checkpoint-d-5.md` misspelled as `checkpoitn-d-5.md`. The misspelling was kept at the time, then corrected on disk without the references following; C6-08 recorded the drift, and it is closed here — the file is [`checkpoint-d-5.md`](checkpoint-d-5.md) and every reference points at it.

**Order of work, as directed**: C5-01 and C5-02 first, then the stretch table, then C5-03's wording, then C5-04. The table confirmed both fixes and extended them — it found **seven more defects of the same species**, all in this pass rather than in a sixth review.

---

## 1 — The headline numbers

|  |  |
| --- | --- |
| Stretches enumerated | **62**, complete against `ls src/sortable/*.ts` (twenty modules; fourteen carry stretches, six carry none) |
| (a) reading-headed | **38** |
| (b) bracket-discharged | **6** |
| (c) conforming residue with an executable pin | **18** |
| **(d) surviving consequence, no reading** | **0 — after nine were found and fixed** |
| (d) findings, by provenance | **2** the fifth review's (C5-01, C5-02) · **7** new, found by the sweep |
| Stretches those nine findings covered | **11** (two findings each close two stretches with one reading) |
| New tests | **10 regressions**, every one verified to fail against pre-fix source · **2 conformance pins**, both mutation-checked |
| Test count | 752 → **768** passing, 18 skipped |
| Size, `complete` | 10,934 → **11,025 B (+91)** |
| Budgets | **re-based** (Phase 21 pulled forward) — see §6 |
| Per-frame cost | **zero** — not one added reading is on the pointer-sample path |

**Is I-36 discharged against §8's condition? Yes.** The table exists in `contract/05`, it is complete against a directory listing, every row carries one of the three verdicts with its bracket cited or its pin named, and no row is (d). What that sentence is worth is discussed honestly in §8.

---

## 2 — C5-01 · `layoutAnimation()` could retain an animation after retirement

**The finding, restated as landed.** C4-01's reading after `element.animate()` was not the end of the acquisition. Three more consumer-reachable steps followed with no terminal check: the overridable `animation.finished` accessor, its `.then(…)`, and the publication into `running`. The code and its tests already treated `finished` as fallible and `then` as a call — but only against a **throw**. The failing path is a synchronous `controller.destroy()` that _returns normally_: the `catch` never fires, `retire()` has already run with `running` empty, and `running.set()` then retains a row and leaves a live displacement on it that nothing will ever cancel. Floor acts 1, 2 and 3.

**The fix** (`src/sortable/layout-animation.ts`). One reading between the `finished.then(…)` sequence and `running.set()`, cancelling the untracked animation on a closed reading — the same all-or-nothing shape the `catch` beside it already uses. C4-01's reading after `animate()` is **kept**: removing it would let the accessor and the call run after a closed reading, which is a barrier regression, not a simplification.

**Coverage.** Two permanent regressions in `tests/sortable/displacement.browser.test.ts`, both driven through an overridden `animate()` returning an instrumented animation, and both asserting the surviving animation list rather than any resulting state:

- _should cancel an animation whose `finished` accessor closed the controller_
- _should cancel an animation whose `finished` thenable closed the controller_

Both verified to fail against pre-fix source (expected `[]`, received one live `Animation`).

---

## 3 — C5-02 · `createPlaceholder()` guarded the factory but not its mechanics

**The finding.** On a live reading, `applyMechanics()` ran an unchecked sequence over consumer-owned objects: two `setAttribute()` calls, `item.getAttribute()`, a slot mutation, three style writes, and `visual.offsetWidth`/`offsetHeight`. Every one is overridable, and the mutations land on an element a `placeholder()` feature may own and that teardown never adopted — so nothing undoes them. Floor act 3, six statements deep. `preparationValid()` is **not** a bracket here: it discards the _preparation_, not a `setAttribute` on somebody else's element.

**The fix** (`src/sortable/placement.ts`). Restructured to **every read before any write, then one reading per write**:

1. `item.getAttribute('slot')`, `visual.offsetWidth`, `visual.offsetHeight` — the whole read run first, so a destroy from any of them leaves nothing behind at all;
2. one reading, then `data-drag-placeholder`;
3. one reading, then `aria-hidden`;
4. one reading, then the slot mirror;
5. `placeholder.style` read once — it is an accessor a custom element may define — then one reading before each of `boxSizing`, `width`, `height`, because a consumer-supplied declaration's property setters are consumer code like any other.

Six write stretches, each reading-headed. The default-placeholder path shares the code and passes the same reading; it would leave nothing either way, but one path is cheaper than a branch.

**Coverage**, `tests/sortable/placement.browser.test.ts`, all three verified to fail pre-fix:

- _should write no further attribute once a mechanics write closes the controller_ — asserts the **write list** on the instrumented element: `['data-drag-placeholder']`, not `['data-drag-placeholder', 'aria-hidden', 'style']`;
- _should write no attribute at all once a visual offset read closes the controller_ — the read run, custom placeholder, expected `[]`;
- _should apply no mechanics to the default placeholder once a visual offset read closes the controller_ — the same reading through the **default** composition.

**`tests/COVERAGE.md:374`'s record is corrected, and the correction is the interesting part.** Review 4 recorded the factory-to-`applyMechanics` reading as uncovered defence in depth because "the preparation is discarded whole". The first consumer-reachable call _inside_ `applyMechanics` discriminates, and once a fixture existed the mechanics turned out to breach the floor. The same re-examination applied to review 4's other two uncovered readings (`anchorTarget`, `release.effect`) found a second unguarded stretch behind each. The lesson is now recorded in COVERAGE.md rather than the excuse: _"no discriminating fixture was found"_ is a statement about the fixtures tried, and at a floor-level barrier it is a reason to try a different level.

---

## 4 — C5-03 · the architect's decision, applied

Applied verbatim from §3.1–§3.11 and §9's required list. Every sweep item landed; the "checked, no change needed" table was not re-swept.

| Item | Landed |
| --- | --- |
| 1–3 | I-36 cell 2: provisioning **bimodal**, the floor's antecedent fixed, the register split into **ceilings** and **brackets** |
| 4 | I-6 cell 2: **afterwards no callback fires that leaves anything behind**, with the kernel's F-30 relinquishment named. **The Tier cell is untouched** |
| 5 | I-6 mechanism cell: the retention claim removed, the supersession of C3-03's verbatim retention stated **here** rather than by editing C3-03's record |
| 6 | Tier legend: _mechanism prose that reinterprets an invariant does not change the invariant's operative sentence_ |
| 7–9 | F-47: the `landing()` row **bracket-discharged**, the `LandingStart` row recording the admitted post-terminal call, the residue paragraph replaced |
| 10 | F-47's "fourth site" sentence extended with review 5's completion |
| 11 | Contract 05's test matrix, _Terminal barrier in a resolver sequence_ — **rebased onto C5-01/C5-02's rows rather than re-resolved**, as §10 directs |
| 12 | F-38's `05:285` — **not edited** |
| 13 | Contract 01 §Teardown's converse-obligation clause |
| 14 | Contract 03's ceiling paragraph gains the register's two-section clause |
| 15 | Ledger L-12 |
| 16–21 | `plan.md`: the residue bullet, the review-4 bullet, a new review-5 section, Phase 18's stretch form, Phase 21's withdrawal + re-base + rule, and the stretch table as a named closure obligation |
| 22–24 | `tests/COVERAGE.md`: the blockquote, the landing pin's citation and relabel, and the §5 case |
| 25 | The conformance test's comment block |

**The public conformance test's assertions are unchanged.** `tests/sortable/features.browser.test.ts` › `landing` › _should leave nothing behind when the duration thunk destroys the controller_ keeps `expect(calls).toEqual(['animate'])`, `getAnimations() === []`, `style.transform === ''`, the null placeholder, the empty `errors`/`reported` and both empty terminal-callback lists. Only the comment changed, and the label became _the bracket-discharge witness_.

**The test §5 owes is landed**: _should destroy a consumer runner's handle exactly once when the runner destroyed the controller_. A `landing({ run })` runner destroys the controller and still returns an instrumented handle; the assertion is the **call list on the consumer-authored object** — `['destroy']`, never `retarget` — plus a flag proving it ran after `controller.destroy()` returned, and the same closing block as the existing pin.

**Both landing pins were mutation-checked** by removing `runner.destroy()` from F-30's `!settlementLive(attempt)` branch. Both fail against it (`expected [Animation] to deeply equal []`, `expected [] to deeply equal ['destroy']`). Neither is vacuous.

**`FeatureContext.live()` was not implemented**, and is removed as a queued item from F-47's residue paragraph, ledger L-12, the Checkpoint D bullets and Phase 21. It is recorded in all four places as available, measured and _not queued_, with the bracket-discharge falsifier as its trigger.

---

## 5 — The stretch table · Checkpoint D's closure obligation

In `contract/05`, beside F-47, and **it replaces F-47's per-foreign-call table as the normative enumeration**; F-47's table stays as the historical record of how the sites were found.

**62 stretches across twenty modules: 38 (a), 6 (b), 18 (c), 0 (d).** Six modules carry no consumer-reaching stretch — `behavior.ts`, `feature.ts`, `frames.ts`, `handle.ts`, `keyboard.ts`, `slots.ts` — each listed with the reason rather than omitted.

**One definition had to be sharpened to run the sweep at all, and it is stated in the table.** A _consumer-reachable call_ includes an **overridable accessor on a consumer-owned node** — `isConnected`, `parentElement`, `offsetWidth`, `style`, `animation.finished` — not only a declared slot. Both the review and the decision use that reading (`offsetWidth` and `finished` are the review's own examples), but neither wrote it down, and under the narrower reading six of the seven new findings are invisible.

### The nine (d) rows, all fixed

| # | Site | Act | What survived |
| --- | --- | --- | --- |
| 1 | `layout-animation.ts` — subscription (C5-01) | 1, 2, 3 | a retained row and a live displacement |
| 2 | `placement.ts` — `applyMechanics` (C5-02) | 3 | attribute and style writes on an unadopted consumer element |
| 3 | `placeholder.ts` — `classList.add` after `create` | 3 | classes on the consumer's own element |
| 4 | `spec.ts` `seedDraft` — the seed after `getVisual` | 1, 2 | item, visual and snapshot pinned in a scrubbed frame |
| 5 | `spec.ts` `command.admit` — the destination after the seed | 1, 2 | the same, plus the command's gap |
| 6 | `spec.ts` `activation.effect` — publications and `onStart` after the survival conjuncts | 1, 4 | the placeholder, lift and per-operation view republished, and a declared callback fired |
| 7 | `spec.ts` `release.prepare` — `draft.insertion`/`draft.proposal` (two stretches, one reading) | 1, 2 | the released snapshot and the item pinned in a scrubbed frame |
| 8 | `spec.ts` `release.effect` — `rt.pendingRequest` after the render | 1, 2 | a request outliving the operation |
| 9 | `spec.ts` `settlement.prepare` — `draft.domain` after the resolution's accessors | 1, 2 | the proposal pinned in a scrubbed frame |
| 10 | `spec.ts` `anchorTarget` — the re-anchor after its conjuncts | 3 | a footprint re-inserted into the consumer's list after teardown |

That is ten rows for nine findings because #4 and #5 are one reading, as are the two stretches of #7. Counting by _finding_: nine. Counting by _stretch_: eleven.

**They share one shape, and it is the shape review 4's completeness claim hid.** Six of the seven new ones are **publications into a frame teardown has already scrubbed and will never scrub again**. Teardown scrubs both frames and _then_ returns into the middle of the behavior callback that was running, so every draft write after that point is retention past `retire()` (I-20) at a module that was fully provisioned. The module-level quantifier cannot see it; the stretch decomposition finds it mechanically.

### The two rows that needed a second look

Two of the nine were nearly recorded as (c), and the honest reasoning is worth keeping:

- **#6 and #10 are guarded a second time by the DOM teardown leaves behind.** After a destroy the placeholder is detached, so `!placeholder.isConnected` makes the activation survival test **throw** rather than publish, and `item.parentElement === placeholder.parentElement` makes the re-anchor's mutation unreachable. Both are (d) only when a consumer element's accessor _also_ returns something other than the truth — which is exactly what a custom element that proxies `isConnected` or `parentElement` does. The library must not depend on the consumer's accessors telling the truth, so both were fixed and both fixtures instrument the accessors. Their tests were **rewritten once** after the first drafts turned out to pass pre-fix for precisely this reason — recorded because it is the same trap C4-04 named and review 4 hit three times.

### What was deliberately _not_ fixed

- **`movePlaceholder`'s own sequence** is (c): teardown removed the placeholder, so its container test refuses. The pin is the existing _should refuse to move a placeholder that is no longer in the tree_.
- **`y()`/`xy()`'s tail** — the arithmetic and the returned `Insertion` — is (c): the module publishes nothing, and both callers now take a reading before writing the draft. The pin is _should build no proposal when the axis destroys the controller while resolving the release_.
- **`collection.ts` and `controller.ts`** are (b): the kernel queue's closed latch on `dispatch`, whose undo is that the snapshot is never dispatched. `version` is a scalar with no referent.
- **`assemble.ts` and `runtime.ts`'s construction reads** are (c): `install` has not returned, so there is no controller to close.

---

## 6 — Size, and the budget re-base

**Phase 21's re-base was pulled ahead of this pass**, as the architect recommended. It was needed: mid-pass the fixes took `complete` to **11,041 B against an 11,040 B budget — 1 B over**. Per the rule now written into Phase 21, the budget re-based and the fix landed; nothing was shaved and nothing was deferred.

Brotli then gave some of it back as the repeated `rt.closed` guards began sharing a dictionary, so the **landed** figures are lower than the intermediate ones:

| Composition          | Before | After      | Δ   |
| -------------------- | ------ | ---------- | --- |
| minimal              | 10,116 | **10,199** | +83 |
| minimal (xy)         | 10,168 | **10,245** | +77 |
| + layoutAnimation    | 10,563 | **10,653** | +90 |
| + landing            | 10,405 | **10,487** | +82 |
| complete             | 10,934 | **11,025** | +91 |
| baseline A           | 10,668 | **10,765** | +97 |
| baseline B (shipped) | 6,889  | **6,889**  | 0   |

Module counts unchanged. Every budget is now its measurement plus ~150 B — the headroom the Phase 17 re-base left, and still under one module's worth. **The re-base stays even though the final `complete` figure would have fitted inside the old budget with 15 B to spare**: 15 B is not a margin the next correctness fix should be planning against, and taking the byte count out of the terminal-safety argument is the point of pulling it forward.

**The rule is recorded in Phase 21 and in `bench/size/measure.ts`**: _a size budget is never a reason to defer a fix for a floor breach; if the fix does not fit, the budget re-bases and the fix lands. What a budget may defer is defence in depth._

**Per-frame cost: zero.** Not one added reading is on the pointer-sample path.

- `applyMechanics`'s six readings: once per **operation**, inside `activation.prepare`.
- `placeholder()`'s: once per operation, and only when the feature is composed.
- `seedDraft`'s: once per **admission**, and only when a `visual()` is composed — it sits inside the `slots.getVisual !== null` branch, so the minimal composition pays nothing at runtime.
- `activation.effect`'s: once per activation.
- `release.prepare`'s, `release.effect`'s, `settlement.prepare`'s, `anchorTarget`'s: once per operation each.
- `layoutAnimation()`'s new one: once per animated row per **committed move**, on a line that already forces layout.

---

## 7 — C5-04 · the pre-resolution claims

- **`contract/06`** — the illustrative trace no longer says the two features measure the same list or that Q-7/M-4 is an open duplicate-read cost; it states the landed answer (the axis reads every candidate's visual, displacement reads the crossed span, 0.156 ms against 2.3 ms at 800 rows, no shared read phase needed). Q-12 is no longer "the one open mechanism".
- **`tests/COVERAGE.md`** — the Q-12 section opens with the landed answer instead of "what stays open", and closes by recording the closure instead of recommending it.
- **`ledger.md:276`** — the explanation is corrected per name rather than in aggregate. `CancellationReason` was never a named export, `ResolutionContext` was only structurally exposed, and shipped `DragSubject` was exported by both `sortable.js` and `draggable.js`. The negative assertions themselves are sound and unchanged; only the reason _why one entry is enough_ was wrong.

---

## 8 — What did not match, what the review understated, and what I would flag to a sixth reviewer

**Where the decision did not match the artifact.**

- **§7's seed row for `spec.ts`** says "re-check the `release.effect` and spatial-bracket stretches". Both were fine; what was not fine was **seven other stretches in the same file**, six of them draft or runtime publications rather than DOM. The seed row pointed at the sites the previous review had touched, which is the natural place to look and was the wrong one.
- **§7's `handle.ts`, `placeholder.ts`, `callbacks.ts`, `collection.ts`, `keyboard.ts` row** — "pass-through or thin; verified to make no consumer-reaching call of their own" — is right for four of the five. **`placeholder.ts` makes one**, and it was a floor breach. The decision was right to say "to be confirmed and recorded by the sweep, not assumed from here"; this is what that instruction was for.
- **§9 item 12's F-38 verification holds.** `05:285`'s _"Destroying the returned handle later does not un-call it"_ survives the qualified headline verbatim, for the reason §2.4 gives.
- **§Verification's factual correction stands**: there are twenty modules in `src/sortable/`, not ten.

**What the review understated.** C5-02 is described as "one liveness check after the factory, then an unchecked sequence" — accurate, but the reproduction it offers (the second `setAttribute`) is the _shallowest_ of six unguarded writes, and the deepest is a style write behind an accessor a custom element may define. The remedy the review asks for ("thread liveness through the mechanics sequence") is exactly right; the fix is larger than the reproduction suggests.

**What the review got wrong.** Nothing. Both findings reproduced, both remedies were the right ones, and its instruction to cover the accessor _and_ the call in C5-01 — "a synchronous destroy that returns normally is the failing path" — is precisely the case a naive fix would have missed.

**One behavioural change worth flagging.** `seedDraft` now **declines** on a closed reading, so a `visual()` resolver that destroys the controller during admission no longer reaches `event.preventDefault()`. Previously the visual was returned non-null, the kernel prevented the default, and _then_ its post-admission recheck declined. Declining outright is what I-32 promises and what the README already claimed for `handle()`; the README's §57 sentence is updated to say so for `visual()` too. No test asserted the old behaviour.

**What I would flag.** The sweep is only as good as the definition of "consumer-reachable call", and this pass widened it to include accessors on consumer-owned nodes. That widening is what found six of seven. A sixth reviewer disputing a row should say which statements survive which stretch — that argument terminates. A sixth reviewer who thinks the _definition_ is still too narrow has the more interesting objection, and the place to make it is the table's opening paragraph.

---

## 9 — Constraints, confirmed

- **The conformance test's assertions are unchanged** — comment and label only.
- **`FeatureContext.live()` was not implemented**, and was withdrawn as a queued item everywhere review 4 recorded it.
- **No landed liveness reading was removed anywhere.** Nine C4-01 readings, C3-01's return channel and C2-01's nine pins all stand; every fix in this pass _adds_ a reading or moves consumer reads earlier.
- **Nothing was added to any public entrypoint or to the frozen SPI.** `PlaceholderSlot` is an **internal** slot type: the public `PlaceholderFactory` a consumer implements is byte-for-byte unchanged, `SortableContribution` is unexported from every entrypoint, and the built `.d.ts` files carry no new name. `tests/consumer.node.test.ts`, `tests/exports.node.test.ts` and `tests/packaging.node.test.ts` pass unchanged.
- **C2-01's mechanism, C3-01's return channel, C3-03's tier split, D2, D5 and L-11's Phase 23 deferral are untouched.** I-6's Tier cell is not edited. `src/kernel/**` is not modified.
- **No resolution record was edited.** C3-03's supersession is stated in I-6's mechanism cell, as §3.5 directs.
- **`README.md`'s register-ceiling sentence was re-checked against the fixed source and is still true** — and is now slightly stronger, per the `seedDraft` change above.

---

## 10 — Verification

From `packages/drag2`:

```text
npx just fmt <changed files>          PASS
npx just lint-fix <changed files>     PASS
npx just typecheck                    PASS — no errors
npx just test                         PASS — 33 files, 768 passed, 18 skipped, no type errors
npx just size                         PASS — all seven compositions inside their re-based budgets

minimal                                       10.20 kB brotli  (31 modules)
minimal (xy)                                  10.24 kB brotli  (31 modules)
minimal + layoutAnimation                     10.65 kB brotli  (32 modules)
minimal + landing                             10.49 kB brotli  (32 modules)
complete                                      11.03 kB brotli  (35 modules)
baseline A - feature-matched, non-composed    10.77 kB brotli  (30 modules)
baseline B - shipped @ydinjs/drag sortable.js  6.89 kB brotli  (26 modules)
```

Every one of the ten new regressions was run against a **targeted** revert of just its own fix and observed to fail; the working tree carried uncommitted review-4 changes, so a whole-file `git stash` is not a valid pre-fix baseline and was not used as one. Both conformance pins were mutation-checked. Two regression drafts passed pre-fix and were rewritten (§5).

---

## 11 — Two arithmetic corrections found by re-verifying this record against the artifact

Both were found by re-deriving the record's own numbers from the table and the harness rather than reading them, and both are the C5-04 species — a document retaining a figure the artifact contradicts. **No source, test or verdict-bearing judgement changed**; the gates were re-run after each (typecheck PASS, 33 files / **768 passed** / 18 skipped, all seven compositions inside budget).

**1 — the stretch table's rows did not tally to its own headline.** The headline says **38 (a), 6 (b), 18 (c)**; the rows summed to **39 / 6 / 17**. The total, 62, was right, so the error was a single row classified into the wrong column — a compensating mistake the total could not catch.

The row is `placement.ts` › `createPlaceholder`: `isElement` / `isConnected` → `applyMechanics`'s reads. It was verdicted **(a)** while its own survival column gave a **(c)** justification — "this stretch leaves nothing whichever read closes" is the conforming-residue answer, not the reading-headed one. The artifact settles it: the stretch runs from the adoption check through `getAttribute('slot')`, `visual.offsetWidth` and `visual.offsetHeight` to the reading that heads the first write (`src/sortable/placement.ts:63-67`), and **performs no consequential act at all**. (a) is defined as a reading preceding the next consequential act; there is no consequential act here, so the verdict is **(c)**, and (c) owes an executable pin. Two already exist and are now cited on the row: _should write no attribute at all once a visual offset read closes the controller_ and the same reading through the default composition (`tests/sortable/placement.browser.test.ts:119`, `:143`).

Re-tallied: **62 stretches — 38 (a), 6 (b), 18 (c), 0 (d)**, matching the headline exactly. §8's closure condition is unaffected in substance — the row was never (d), and reclassifying it moves a stretch between two conforming verdicts — but a normative enumeration whose rows contradict its own summary cannot be cited as complete, which is what §8 asks it to be.

**2 — Phase 21's re-base paragraph carried two wrong figures** (`plan.md:905`), while §6 of this record and every other citation carried the right ones. It said the landed cost was **+89 B** on `complete` (it is **+91**: 10,934 → 11,025) and that **17 B** is not a margin to plan against (the margin is **15 B**: the old budget was 11,040). The 17 came from the harness line `0.17 kB under budget`, which is headroom against the **re-based** 11,200 budget — a different quantity from the old budget's leftover, and the one number in that sentence that must _not_ be used, since the whole point of the sentence is what the old budget would have allowed. Corrected to +91 B and 15 B, with the old budget named so the two quantities cannot be conflated again.
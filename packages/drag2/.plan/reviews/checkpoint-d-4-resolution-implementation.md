# Checkpoint D fourth review — implementation record

All four findings in [`checkpoint-d-4.md`](checkpoint-d-4.md) are closed. **No architect decision was needed and none was made**: C2-01's mechanism (behavior-owned latch on `SortableRuntime.closed`, frozen SPI shut, `live` on the per-operation view), C3-01's boolean return channel, C3-03's tier split, D2, D5 and L-11's Phase 23 deferral are all untouched. The one question that would have needed a decision is **left open and stated** rather than decided — see §Residues.

---

## C4-01 — I-36 still permitted callbacks and state publication after `destroy()`

### The diagnosis, re-derived rather than accepted

The review is right, and one detail of it is worth correcting because it changes which tests discriminate.

Pre-fix, the check was **not** inside the `getVisual !== null` branch, whatever the comment above it claimed. The order per candidate was `getVisual(item)` → `live()` → `visual.getBoundingClientRect()` → write. So:

- a destroy raised from candidate _k_'s **geometry** was already caught before candidate _k+1_'s geometry — but **not** before candidate _k+1_'s `getVisual`, which ran first;
- a destroy raised from the **last** candidate's geometry fell through to the write **and** to the trailing bookkeeping, marking a retired cache clean and measured at the snapshot's own version;
- with **no `visual()` composed** the reading was still taken, so that composition aborted one candidate late rather than not at all.

The consequence for testing is direct and cost two drafts: **a case that destroys from an earlier candidate's geometry passes against pre-fix source.** Only the last candidate discriminates. This is the third time in a row the "verify it fails first" convention caught a non-discriminating assertion, and the second time it caught one written by someone who had read the finding carefully.

### Site-by-site or a general mechanism — the judgement, and its argument

**A general mechanism, and the argument is that the site list does not terminate.**

C2-01 derived F-47's enumeration by asking _which consumer callbacks does the library invoke_ — `getHandle`, `getVisual`, `createPlaceholder`, the hooks, `onStart`, `onReorder`, the landing runner. That question has a finite answer, and each of the three passes closed exactly the site the previous reviewer reproduced. But C3-03 §3.2 changed the question without changing the enumeration: under the indirect-invocation clause the governing set is **every DOM method the library calls on a consumer-owned node**, because any of them can be overridden on a consumer's custom element. Enumerated as a list of method names that set includes `getBoundingClientRect`, `animate`, `offsetWidth`/`offsetHeight`, `before`/`after`/`remove`, `compareDocumentPosition`, `nextElementSibling`, `isConnected`, `getAttribute`/`setAttribute` — and a fourth reviewer would find the one the third did not name. **That is the pattern, and it is worth saying explicitly: a site-by-site barrier against an open-ended set converges only by exhaustion of reviewers.**

Three general mechanisms were considered:

- **Wrapping consumer-owned elements** (a proxy, or a per-call bracket helper). Rejected on cost and on the same ownership ground C2-01 rejected a kernel-owned mechanism: it is an allocation per element per operation on a per-frame geometry path, and it would put library machinery between a consumer and their own DOM.
- **One revalidation per traversal.** Rejected: it permits every call _within_ the traversal, which is exactly what C4-01 reports.
- **The rule made structural, which is what landed.** A liveness reading at the **head of every loop that touches consumer-owned nodes**, after each consumer-reachable call inside it, and before the next foreign call, DOM mutation or state publication — and, crucially, **every participant that touches consumer DOM is handed a liveness reading** rather than having its caller patched. That is what makes it checkable by inspection: "does this module touch a consumer-owned node, and does it have `live`?" is a question with a mechanical answer, where "is `getBoundingClientRect` on the list?" is not.

The one non-obvious consequence, accepted deliberately: **the minimal composition now pays for the barrier.** C2-01's cost story was "with no `visual()` composed there is no consumer callback in the loop, so the minimal build pays nothing". That was true of the _resolver_ and false of the loop — with no resolver, the candidate item is its own visual and its `getBoundingClientRect()` is the consumer call. The reading is one boolean-returning closure call per candidate per **rebuild**, on the same line as a `getBoundingClientRect()` that forces layout.

### The re-derived enumeration

Every sequence in `src/sortable/**` containing two or more consumer-reachable calls, derived from the source rather than from F-47:

| # | Sequence | Consumer-reachable calls | Disposition |
| --- | --- | --- | --- |
| 1 | `resolveItem` → `seedDraft` | `getHandle`, `getVisual` | barrier present (C2-01) |
| 2 | `RectIndex.refresh` — entry | first `getVisual` of a rebuild entered already closed | **added**: entry reading before the loop |
| 3 | `RectIndex.refresh` — per candidate | `getVisual(item)`, then `visual.getBoundingClientRect()` | **added**: reading after the geometry read as well as after the resolver; the geometry one sits **outside** the `getVisual !== null` branch |
| 4 | `y().resolve` after `refresh` | `centreOf(placeholder)` | barrier present (C3-01 return channel); nothing consumer-reachable follows it |
| 5 | `xy().resolve` after `refresh` | `placeholder.getBoundingClientRect()`, then `placeholder.compareDocumentPosition(...)` | **added**: reading between them. `y()` needs none — it derives the gap side from two centres it has already measured |
| 6 | `createPlaceholder` | consumer `placeholder()` factory, then `applyMechanics` → `visual.offsetWidth`/`offsetHeight`, `setAttribute` on the returned element | **added**: reading after the factory; returns the element unmechanized rather than throwing |
| 7 | `activation.effect` | `item.after(placeholder)` → `connectedCallback`, then `onStart` | barrier present (`presentation.signal.aborted`) |
| 8 | `action.effect(TAG_SPATIAL)` — `beforeMove` pipeline | each hook's interior; `layoutAnimation()` reads rows | **added**: `rt.closed` between the hook loop and `movePlaceholder` |
| 9 | `layoutAnimation.beforeInsertionMove` | `collect`'s sibling walk, then `getBoundingClientRect()` per row | **added**: reading at the loop head and after it |
| 10 | `action.effect(TAG_SPATIAL)` — after `movePlaceholder` | placeholder reactions, then the eager rebuild | barrier present (C2-01), and `measureInSeam`'s own |
| 11 | `layoutAnimation.afterInsertionMove` | `getBoundingClientRect()`, then `animate()`, then `running.set()` per row | **added**: three readings — loop head, before `animate()`, after `animate()` (which cancels the untracked animation) |
| 12 | `settleDisplacement` → `release.prepare` resolve | hook interiors, then `getVisual` | covered by #2's entry reading; `release.prepare` deliberately takes no guard of its own (C2-01 §4D, unchanged) |
| 13 | `release.effect` | `movePlaceholder` reactions, then `rt.lift.write`, then `rt.pendingRequest = …` | **added**: `rt.closed` after the move. `retire()` has nulled `rt.lift`, so the next statement was a `TypeError`, and the publication would outlive the operation (I-20) |
| 14 | `anchorTarget` | `item.before(placeholder)` or `homeGap` → `movePlaceholder`, then `placeholder.getBoundingClientRect()` | **added**: `rt.closed` before the measurement |
| 15 | `landing()`'s `start` | `duration` thunk, then `visual.animate()` | **open, see §Residues** |

Nine readings landed, across five modules. `DisplacementView` gained `live()` — the **fifth** additive widening of a consumer-declared view, which C2-01 §9.5 recorded in advance as a routine act rather than a re-litigation of D-13.

### Things the review understated or got wrong

- **The pre-fix check was outside the `getVisual !== null` branch**, not inside it as its own comment said. That is why an earlier-candidate destroy is not a regression, and why three of the first-draft tests passed against unfixed source.
- **`release.effect` was a crash, not only a barrier gap** (#13). A placeholder reaction destroying inside the release write left `rt.lift === null` and the next statement was `rt.lift!.write(...)`. Not named by the review.
- **`anchorTarget` and `createPlaceholder`** (#14, #6) are the same species and were not named either.
- **`xy()` makes a second call on the placeholder that `y()` does not** (#5). The review treated the two axes as mirror images throughout; on this one point they are not.

### Cost

| composition         |   before |        after |   Δ |
| ------------------- | -------: | -----------: | --: |
| minimal             | 10,079 B | **10,116 B** | +37 |
| minimal (xy)        | 10,125 B | **10,168 B** | +43 |
| + `layoutAnimation` | 10,493 B | **10,563 B** | +70 |
| + `landing`         | 10,391 B | **10,405 B** | +14 |
| complete            | 10,864 B | **10,934 B** | +70 |
| baseline A          | 10,581 B | **10,668 B** | +87 |
| baseline B          |  6,889 B |      6,889 B |   0 |

**Every composition stayed inside the budget it already had; no budget was raised.** Headroom 106–155 B (**0.11–0.16 kB**), tightest on `+ layoutAnimation` and `complete` at 106 B each. Module counts unchanged.

Per-frame:

- **Candidate loop**: one boolean-returning closure call per candidate per **rebuild**, plus one per rebuild at entry, plus a second per candidate when a `visual()` is composed. Never on a warm cache, which is the common spatial frame. This is the one place the minimal composition's cost went from zero to non-zero, and it is stated rather than hidden.
- **`xy()`**: one call per resolution **that proposes a gap change** — placed after the `nearest === -1` early return, so an inert frame pays nothing.
- **Displacement bracket**: one call per affected row per **committed move**, in each pass, plus one after each `animate()`. Committed moves are rare relative to pointer frames, and the bracket already forces two layout passes over the same rows.
- **Behavior-side readings** (`beforeMove` pipeline, `release.effect`, `anchorTarget`): one boolean field read each, per committed move / per release / per landing anchor.
- **`createPlaceholder`**: one call per activation.
- **The M-1 hot path is untouched.** `moved` → `lift.write` → `frame.schedule` gains nothing.
- **Heap**: nothing. `live` is one existing closure copied by reference onto a view that already carried it.

### Tests — 16 new, every one verified to fail against pre-fix source

`tests/sortable/y.browser.test.ts` and `xy.browser.test.ts`, new group _the terminal barrier on candidate geometry_ (4 + 5 cases); `tests/sortable/displacement.browser.test.ts`, new group _the terminal barrier in the displacement bracket_ (5 cases, driven directly through `unbrandFeature(layoutAnimation())` with a hand-built `DisplacementView`); `tests/sortable/features.browser.test.ts`, two composed cases added to the existing I-36 group.

Two traps found while writing them, both recorded in `tests/COVERAGE.md`:

1. **The last candidate is the discriminating one** (above).
2. **The composed after-pass case needs the instrumented rect returned _shifted_.** Teardown removes the placeholder and drops the lift, which puts the row back exactly where the pass measured it — so an honest rect makes `delta === 0`, `animate()` is skipped for a reason with nothing to do with the barrier, and the assertion stops discriminating. The reviewer's own reproduction shifted the rect too; the finding did not say why it mattered.

Test count 736 → **752**. Nothing was weakened or removed. Two existing comments that overclaimed were not found in this pass — C3-01 had already corrected them — and the `placement.browser.test.ts` fixture gained the new `live` parameter with a defaulted helper argument, which changes no assertion.

---

## C4-02 — the normative account denied the implemented return channel

`contract/03-feature-composition.md` §`y()` no longer says "no new return channel exists and `resolve`'s control flow is unchanged". It now states the boolean channel, why it was needed (the placeholder read happens **before** the candidate scan, so `count === 0` cannot stand in for it), and — as the finding requires now that C4-01 has landed — **the complete set of calls capable of causing the abort**: entry, the `visual()` resolver, and the candidate's own `getBoundingClientRect()`. It also records `xy()`'s second placeholder reading and why `y()` needs none.

---

## C4-03 — Q-7 and Q-12 carried mutually exclusive statuses

- **Q-7** now has a row in contract 05's **resolved** table stating M-4's answer in full, including the half that resolved the other way from the question's expectation (no shared read phase, no shared geometry capability). Its _Open before implementation_ entry is retained and rewritten to say it is answered and that its "blocking before implementation sign-off" label is **discharged** — retained rather than deleted because two records carried the blocking status forward after the answer landed, and deleting the entry would make those look like references to something that never existed. The section preamble names Q-7 alongside Q-1 and Q-12. `plan.md`'s Phase 11 gate note says it cleared. `reviews/checkpoint-d-3-resolution-implementation.md`'s carry-forward is annotated as wrong in place, since implementation records are historical.
- **Q-12**: contract 03's "remains open pending a fixture" is replaced with the Phase 10 answer and a pointer to the checked-in fixture, matching contract 05.
- **`measurements/q7.md`** gains a dated correction note at the top and a second inside answer 2. It was written when the axis rule was one feature called `vertical()` that rebuilt **lazily on the next spatial frame**; both are stale. The lazy-timing argument is the one the implementation overtook — the rebuild is now eager, inside the committed-move bracket — and it is recorded as _strengthening_ the conclusion: the two features' reads now sit in the same bracket and still share nothing, because they read different things (every candidate's visual, against the span's rows). The measurements were not re-run and are not restated.

**The sweep found two more the review did not name:**

- **`contract/00-index.md` F-5** — _`admit` runs inside native dispatch and can throw into the event loop_ — was still marked **Open**, deferring to Q-1, although Q-1 is in contract 05's resolved table and the mechanism (`BehaviorSpec.reportFailure`) has existed since Phase 4. Corrected to resolved, with the answer stated.
- **`contract/05` M-3's row** published the 2026-08-02 absolute figures (9.33 kB / 10.09 kB / 0.26 kB / 2.44 kB) with nothing marking them as a baseline rather than the live numbers, in a document a reader consults for current status. Annotated: the _property_ M-3 asserts survives, the bytes live in contract 03 and are re-measured.

Every other `Q-*` and `M-*` reference across contracts 00–05, `measurements/`, `plan.md`, `ledger.md` and `README.md` was checked and agrees.

---

## C4-04 — size-derived prose

Every figure below is derived from **this pass's own final `npx just size` run**, not copied:

- composition cost **266 B = 0.27 kB = 2.5%** (complete 10,934 B against baseline A 10,668 B);
- migration cost **3,227 B = 3.23 kB** (minimal 10,116 B against baseline B 6,889 B);
- headroom **106–155 B = 0.11–0.16 kB**.

Updated in `contract/03` §Tree-shaking (table, deltas, remeasurement label → 2026-08-08, both cost figures), `README.md` §Size budgets (same), and `plan.md` §Phase 21 (the `0.16–0.21 kB` sentence, which the review correctly flagged as disagreeing with the then-current `0.17–0.23 kB`, and which is now `0.11–0.16 kB` with C4-01 measured in). **Exact byte counts are quoted beside every rounded figure**, so that the next reader can tell a stale number from a current one without re-running the harness — the failure mode of the last three passes.

`ledger.md`'s "all four omitted type names were **dropped from** `sortable.js`" is now "**omitted from the decided `sortable.js` surface**", with a note that "dropped" was true of three of the four and not of `CancellationReason`, which its own row records as never having been a named export.

---

## Residues — open, and deliberately not decided here

1. **`landing()`'s `duration` thunk → `visual.animate()`** (enumeration #15). The thunk is consumer code invoked inside `LandingStart`, and the next statement animates the consumer's own visual — an indirect consumer call under I-36. `LandingContext` carries `visual`, `compose`, `from`, `target` and `realm` and **no liveness reading**, and the kernel invokes the runner, so no behavior-side shape reaches the interior of `start`. Closing it means widening a frozen SPI type, which contract 00 permits only on a failing executable lifecycle case the frozen SPI cannot express. **Not decided, not patched, stated in F-47** as an open residue with its blast radius (one `animate()` on an element the kernel is about to stop rendering; the landing itself never starts, F-30).
2. **Three readings are defence in depth with no discriminating fixture**: `anchorTarget`, `release.effect` and `createPlaceholder`. Each was attempted; the recovery and release paths tear the placeholder down along the same edge as the write, and the preparation is discarded whole. Kept for C2-01 §7's reason — they sit inside brotli's noise band (removing the `createPlaceholder` one measured 5–9 B in most compositions and _added_ 25 B in one, which is noise) — and recorded in `tests/COVERAGE.md` rather than left to be re-found.
3. **Headroom is now 0.11–0.16 kB against budgets set with ~0.3 kB.** Nothing is over budget and no budget was raised. Phase 21's re-base is the next size-affecting change's precondition rather than a nice-to-have.
4. **L-11** — unchanged, Phase 23, not reopened.
5. **I-7's precondition dependency on I-30** — unchanged watch item from C3-03 §4.

---

## Verification

From `packages/drag2`:

```text
npx just fmt <11 changed files>          Finished in 46ms on 11 files
npx just lint-fix <11 changed files>     clean (oxlint + eslint, no findings)
npx just typecheck                       tsc -p tsconfig.json --noEmit — clean
npx just test                            33 files passed, 752 passed, 18 skipped, no type errors
npx just size                            all 7 compositions under budget
  minimal                     10.12 kB brotli  (31 modules, 0.14 kB under budget)
  minimal (xy)                10.17 kB brotli  (31 modules, 0.14 kB under budget)
  minimal + layoutAnimation   10.56 kB brotli  (32 modules, 0.11 kB under budget)
  minimal + landing           10.40 kB brotli  (32 modules, 0.15 kB under budget)
  complete                    10.93 kB brotli  (35 modules, 0.11 kB under budget)
  baseline A                  10.67 kB brotli  (30 modules, 0.14 kB under budget)
  baseline B                   6.89 kB brotli  (26 modules, 0.21 kB under budget)
```

Pre-fix verification of every new case was run by stashing `src/` only and re-running the four affected suites: **16 failures, one per new test**, with no other suite affected.

## What is untouched

The frozen SPI (`KernelHost`, `BehaviorSpec`, every seam signature, every kernel type), the public surface (`live` sits on unexported per-operation types; `DisplacementView` is internal to `slots.ts`; nothing was added to any entrypoint), D2, D5, C2-01's latch and its shut-SPI conclusion, C3-01's return channel, C3-03's tier split, and L-11's Phase 23 deferral.
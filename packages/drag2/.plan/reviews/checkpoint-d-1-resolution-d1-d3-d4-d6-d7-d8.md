# Checkpoint D review 1 — resolution of D1, D3, D4, D6, D7 and D8

Scope: the six findings in [`checkpoint-d-1.md`](checkpoint-d-1.md) left open after the architect closed D2 and D5 in [`checkpoint-d-1-resolution-d2-d5.md`](checkpoint-d-1-resolution-d2-d5.md). **Both of those decisions are preserved verbatim** — candidate rects are still measured through the installed `visual()` resolver with a nullable third argument to `RectIndex.refresh`, and `src/sortable.ts` still exports exactly the 18 type names and 4 runtime names the contract-03 export table specifies. Nothing was added to any public entrypoint by this pass.

All six close. Four are behavior fixes with regressions; two are documents of record. One thing the review did not name is recorded below as the pass's own finding.

## The shape of what was found

Three of the four behavior defects were **drift, not decisions**. D1 contradicted the ledger's own shared-admission-rule row, D3 contradicted the `updateItems` no-op promise, D4 contradicted `landing({ duration })`'s own documented call timing. I looked for a recorded decision behind each — plan phases, probes, measurements, contract, review prose — and there is none. So each is fixed as a regression against the existing specification rather than reclassified, and no deviation is owed for the behavior change itself. What is owed, and recorded in `plan.md`, is the reasoning about scope: where a fix stopped, and why.

Every regression added here was **verified to fail against the pre-fix source**, by reverting each fix in turn and re-running. That is worth stating because two of the four were initially written in a form that passed against the defect.

## D1 — resolve the item once, seed from it

**Decision: fix. `command.admit` resolves the item exactly once per keydown.**

`resolveItem` is split from the draft-seeding half. A new `seedDraft(item, snapshot, draft)` takes an already-resolved item, resolves the visual and writes the three draft fields; `admitFrom` is now `resolveItem` composed with it, so the press path is byte-equivalent. `command.admit` calls `resolveItem` once, uses that item for both `keyboardInsertion` and `seedDraft`, and keeps the feasibility test **in front of** the seeding.

That ordering is the one judgement call. It could have gone the other way — seed first, then test the edge — and the result would differ observably: an edge-item command would resolve a `visual()` for an admission it is not going to make. The press path resolves a visual only for an admission it makes, so the command path matches it. There is now a test for the declined case as well as the admitted one, because the fix moved that boundary.

The review's framing understates the consequence slightly. The stateful-resolver argument is real, but the sharper one is the `updateItems()` case it also names: one arrow key queued two collection actions, consumed two versions, and reconciled the command's destination through two snapshots. The regression pins the request's `version` at 1 rather than 2, which is what makes it a statement about the number of snapshots rather than about the number of calls.

**Evidence.** `tests/sortable/keyboard.browser.test.ts` §`handle()` — four tests: exact-once on an admitted keydown, exact-once on a declined one, equality with the press path's count, and the `updateItems()`-queueing resolver. The pre-existing handle-gating test is kept unchanged.

## D3 — a terminal latch on the controller, on `updateItems` only

**Decision: fix, scoped to `updateItems`. `cancel`, `destroy` and `ready` are deliberately not latched, and the asymmetry is the decision rather than an omission.**

`updateItems` checks a `closed` flag before validating; `destroy` sets it before delegating to `host.destroy()`.

- **`updateItems` needs it** because validation runs in front of the dispatch, so the kernel's own latch — which guards the dispatch — is one step too late. "No-op after `destroy()`" has to mean the whole method, invalid input included, or the promise is only true for calls that would have been silent anyway.
- **`cancel` and `destroy` do not.** They *are* `host.cancel` and `host.destroy`, spread through unchanged, and the kernel's `queue.closed` already makes both inert and idempotent before they do any work. A second latch in front of them would be duplicated state that can disagree with the first.
- **`ready()` deliberately keeps reporting.** A post-`destroy()` acknowledgement is stale by definition — `rt.pendingRequest` is cleared at retirement — and naming that for an integrator whose layout effect outlived its controller is the entire reason that `DEV` report exists. Silencing it would remove the diagnostic for exactly the case it was written for.

The latch lives on the controller rather than being read from the kernel because `KernelHost` does not expose `closed`, and widening a frozen SPI type for a controller's private bookkeeping is the change contract 00 forbids without a failing executable case. The latch is faithful because `controller.destroy()` is the only externally reachable path to `queue.closed = true`.

**Deeper than described.** The review presents this as a throw returned to the caller. The sharper arrival is a callback: `onStart` runs inside `activation.effect`, so a consumer that destroys from a callback and then lets its own store notification land gets the `TypeError` classified as **`FAILURE_ACTIVATION` against an operation it already destroyed** — a fabricated failure report, not merely a surprising throw. That case is pinned separately.

**Evidence.** `tests/sortable/sortable.browser.test.ts` §`updateItems after destroy` — valid replacement inert (and the controller wholly silent), invalid replacement does not throw, and the reentrant callback arrival produces no classified failure and no platform report.

## D4 — resolve and validate first, then collapse

**Decision: fix.** In `landing.ts`, the authored duration is resolved into a local `resolved` — the fixed value, or `requireFinite(timing(), …)` — and only then does `duration: reduced ? 0 : resolved` apply the reduced-motion collapse.

The option's own doc comment says the thunk is called "once per landing, immediately before the runner builds its animation". It does not say "unless the user prefers reduced motion", and the shipped `landingTiming()` was likewise invoked with its result adjusted afterwards. Resolving inside the collapse made a consumer's settle-time side effect, and a thrown or invalid result, observable only for users who had *not* asked for reduced motion — the least likely population to notice a suppressed diagnostic.

The collapse itself is unchanged: still zero, still through the runner, still one lifecycle.

**Evidence.** `tests/sortable/features.browser.test.ts` §`landing` — the thunk is read under a matching media query *and* the duration still collapses to 0; and a thunk returning `NaN` under the same query is classified as a landing failure. The pre-existing reduced-motion and once-per-landing tests are kept; the `matchMedia` stub is hoisted into a `withReducedMotion` helper they now share.

One incidental trap, recorded because the next person will hit it: a zero-duration landing finishes inside the microtasks an `await` on that helper itself introduces, and the kernel then destroys the runner — so the animation must be read *inside* the reduced-motion block, not after it.

## D6 — `'ease'`, as retained; the absence of a decision is the finding

**Decision: retain, with the implementation corrected.** `DEFAULT_EASING` is `'ease'`.

The review offered two outs: change it, or classify it as a deliberate redesign. The second requires a redesign to have happened, so I went looking for one — `plan.md` phases 8b, 13b, 15 and 22, the probes, `measurements/`, contract 03's `landing()` section, the ledger's §2 and §7 rows. **Nothing anywhere records a decision to change the default easing.** No rationale, no cost, no consumer-visible difference stated. Classifying it as a redesign now would be writing a justification backwards for something nobody chose, which is exactly the failure mode the ledger exists to prevent. It is drift, in a default that silently changes the motion of every consumer who installs `landing()` without an easing, and it closes as retain.

**`layoutAnimation()`'s own `DEFAULT_EASING = 'ease-out'` is deliberately left alone.** It has no shipped counterpart — the shipped sortable animates nothing but the lift (ledger §8) — so it carries no parity constraint, and unifying the two defaults would be a redesign nobody asked for and this pass has no mandate for.

**Evidence.** `tests/sortable/features.browser.test.ts` — the default easing and the default duration, both read off the real `KeyframeEffect`'s authored timing.

## D7 — advance the live authorities; leave history alone

**Decision: update the sections declared normative; supersede one criterion outright.** The rule applied throughout: only documents declared as current authorities have to stop giving two executable readings. Part I prose, the probe write-ups and the review files keep `vertical()` as provenance, deliberately.

### `contract/03-feature-composition.md`

- **§First-iteration features** now lists `y()` and `xy()`, and states that exactly one axis feature is required and either satisfies it.
- **§`vertical()`** becomes **§`y()` — the one-dimensional axis rule**, with "the only module containing axis geometry" corrected to name its sibling. The D2 amendment paragraph inside it is untouched, word for word.
- **A new §`xy()`** carries the 2-D rule, the second frame-view widening, the `y()`-is-not-`xy()`-with-an-axis-off argument, the packaging reason the sibling shape won, and the shared rect index.
- **The assembly sketch and the diagnostics table** carry the new axis-neutral message (D8's), so the contract and the implementation agree on the string.
- **§Private feature state** names `y()`, `xy()` and records that the index module is shared while each instance's index is private.
- **§The minimal fixture, exactly** imports `y()`, and the "minimal vertical sortable" sentence is generalized.
- **§Tree-shaking** publishes the re-measured five-composition table, and says explicitly that what the section asserts is the **deltas** — which are unchanged since M-3 — while the absolute figures moved with D-33, Phase 16, Phase 17 and this pass.

**One row of the criterion is withdrawn, not restated.** "Any input mode other than pointer must be absent from the minimal build" predates D-32 and is contradicted by the artifact: keyboard is a `BehaviorSpec` member, so every composition carries it and no consumer can shake it away. That was Phase 16's deliberate accessibility position — the alternative would have made an accessibility floor opt-in — but the criterion it invalidated was never updated, and leaving it standing made the minimal build's own packaging test unpassable in principle. It is withdrawn with the reason attached.

### `ledger.md`

- **§5's Phase 17 deferral is closed**, with the decided shape (`xy()` as a sibling on its own subpath), the argument that eliminated the two alternatives, the rename, and the measured cost. Consequence 2's open question — whether D-13's view mechanism generalises — is **answered**: it did, twice, additively, which makes it a growing structural contract rather than a fixed one. `sortable/vertical.ts` is stated as no longer existing.
- **Admission-resolver failures are `FAILURE_ADMISSION`**, not `FAILURE_ACTIVATION`. Verified against `src/kernel/kernel.ts:707` and `tests/COVERAGE.md`; the ledger was the only document with it wrong, which is why nothing failed on it.
- **`SortableController` retains four members.** Verified — the D2/D5 resolution had already corrected this, and its wording is kept.

## D8 — axis-neutral diagnostics, corrected evidence, real numbers

**Decision: fix all three.**

- `src/sortable/assemble.ts` now throws `sortable: an axis feature — y() or xy() — is required`. `tests/sortable/assemble.browser.test.ts` is updated to the new wording, and contract 03's two copies of the string with it.
- `tests/COVERAGE.md` points at `tests/sortable/y.browser.test.ts`, which is where _should keep the incumbent gap on a tie_ actually lives.
- The `README.md` size table is **re-measured, not recopied**. It had been at the pre-keyboard four-composition figures; the harness has five compositions now, and the D2 resolution had already moved them again. The table also gained an accounting line, so the growth over M-3 is attributable rather than mysterious. The two-baselines paragraph's stale deltas (0.26 kB / 2.44 kB) are corrected to the measured 0.28 kB / 3.12 kB.

## L-11 — deferred to Phase 23, by the owner's decision

Not implemented. The five library-produced cancel *reason* sentinels stay unexported for now.

`ledger.md` §L-11 no longer reads "flagged for the owner, not taken": it records the decision as **deferred to Phase 23, and taken there**, with the reason — it is the only change in the Checkpoint D pass that would *add* to the frozen public surface, and Checkpoint D's exit condition is about closing parity items, not about growing the surface. `plan.md` §Phase 23 gains the work as a deliverable: the three kernel sentinels from `drag.js` beside the `FAILURE_*` constants, the two sortable ones from `sortable.js`, `reason` left `unknown`, plus the M-3 re-measurement and the contract 03 export-topology amendment that five new runtime cells on two frozen entries require. Phase 23 is where it lands because that is the phase that reviews the complete public surface, and the phase at which "deferred" is explicitly not an available classification — so it is the last phase at which this can still be open.

## What changed

**Source** — four files, all behavior, no public surface:

- `src/sortable/spec.ts` — `seedDraft` split out; `command.admit` resolves once (D1)
- `src/sortable/controller.ts` — the `closed` latch and `destroy`'s wrapper (D3)
- `src/sortable/landing.ts` — duration resolved before the collapse (D4); `DEFAULT_EASING = 'ease'` (D6)
- `src/sortable/assemble.ts` — axis-neutral missing-axis diagnostic (D8)

**Tests** — +11, none removed or weakened:

- `tests/sortable/keyboard.browser.test.ts` — +4 (D1), plus a `handleCalls` recorder and an `onResolveHandle` hook on the fixture
- `tests/sortable/sortable.browser.test.ts` — +3 (D3), a new §`updateItems after destroy`
- `tests/sortable/features.browser.test.ts` — +4 (D4, D6), and the `withReducedMotion` helper the pre-existing reduced-motion test now shares
- `tests/sortable/assemble.browser.test.ts` — the new wording (D8)

**Documents of record:**

- `.plan/plan.md` — the Checkpoint D deviations entry; L-11 as a Phase 23 deliverable
- `.plan/ledger.md` — D6's classification; D3's and D1's rows; `FAILURE_ADMISSION`; §5's deferral closed; L-11 deferred with a phase
- `.plan/contract/03-feature-composition.md` — the sections listed under D7
- `tests/COVERAGE.md` — the `y.browser.test.ts` correction and eight new evidence rows
- `README.md` — the re-measured size table

## Cost

`npx just size`, against the D2/D5 resolution's figures:

| Composition  | Before   | After        |
| ------------ | -------- | ------------ |
| minimal      | 9.97 kB  | **10.01 kB** |
| minimal (xy) | 10.04 kB | **10.05 kB** |
| complete     | 10.78 kB | **10.82 kB** |

+10 B to +40 B, module counts unchanged, every composition inside its M-3 budget. Almost all of it is D1's split and D3's latch; D4 is a reordering and D6 is three characters.

## Verification

From `packages/drag2`:

```text
npx just fmt        clean (8 files)
npx just lint-fix   clean
npx just typecheck  PASS
npx just test       PASS — 33 files, 724 passed, 18 skipped, no type errors
npx just size       PASS — all seven measurements under budget (table above)
```

Test count 713 → 724. Each of the eleven was confirmed to fail against the pre-fix source by reverting the corresponding fix and re-running; eight failed on the first faithful revert, and the remaining three only after the D4 revert was made faithful, which is itself worth noting — a partial revert can leave a regression passing for the wrong reason.

## What this does not close

Nothing sortable, as far as this review goes. All eight findings of `checkpoint-d-1.md` are now resolved: D2 and D5 in the architect's pass, D1/D3/D4/D6/D7/D8 here. **Checkpoint D's exit is a second review's call, not this document's.**

Two things are open by design and are not defects:

- **L-11**, deferred to Phase 23 with the work attached there. It is the only known gap in the public surface's discriminability, and it is a gap against nothing shipped.
- **The contract's remaining `vertical()` occurrences** in Part I prose (01, 02, 04, 05, 06, `challenge-response.md`) and in the plan and probe write-ups. Those are provenance and are deliberately not rewritten. If a later phase promotes any of them to a current authority — 06's trace is the likely candidate at Phase 24, since it is the document a maintainer reads start to finish — it has to be advanced then. That is a Phase 24 concern, not an open Checkpoint D item.

# `drag2` Checkpoint B — reconciliation of review B against HEAD

Date: 2026-08-02

Reconciles [`drag2-review-B-claude.md`](drag2-review-B-claude.md) against `packages/drag2` at `c7614c3e`, after both correctness passes (`d581d7f2 drag: checkpoint B pass 1`, `c7614c3e drag: checkpoint B address issues`).

Read-only. No source, test, contract, plan or README file was modified. The working tree is unchanged apart from this document.

## Verification performed at HEAD

- `npx just typecheck` — clean.
- `npx just test` — **23 files, 568 passed, 3 skipped, no type errors**. The three skips are the Q-7 _timing_ suite, now gated behind `VITE_DRAG_MEASURE`; its structural claim was reworked into two always-on read-count assertions.
- `npx just build` — clean.
- `npx just size` — re-measured; see [N-3](#n-3--the-fix-passes-cost-04-05-kb-brotli).
- Full diff read of `bee2c15f..HEAD` across `src/`, `tests/`, `contract/` and `plan.md`.

Baseline for comparison: review B was written at `bee2c15f` (phase 8b), where the suite was 22 files / 518 tests and minimal was 10.26 kB brotli.

## Status summary

| # | Finding | Status | Owning phase |
| --- | --- | --- | --- |
| B-01 | Seam driver's `staged` slot never cleared | **CLOSED** | — |
| B-02 | `RECOVERY_HOME` re-anchor unguarded | **CLOSED** | — |
| B-03 | `vertical()` caches FLIP-transformed geometry | **PARTIALLY CLOSED** | Phase 10 |
| B-04 | `captureInlineStyles` destroys authored longhands | **CLOSED** | — |
| B-05 | Third action tag / empty 8b deviation ledger | **PARTIALLY CLOSED** | Maintainability |
| B-06 | `drag.js` leaks the internal SPI | **DEFERRED** | Phase 9 |
| B-07 | `readinessTimeout` hardcoded and unreachable | **DEFERRED** | Phase 9 |
| B-08 | `admit` is O(path × items) | **DEFERRED** | Phase 11 |
| B-09 | `activate()` has no second-lift guard (note) | **DEFERRED** | Maintainability |
| B-10 | Incumbent anchor read is never cached | **DEFERRED** | Phase 11 |
| B-11 | Hot path costs ~7 indirect calls, not 3 | **DEFERRED** | Phase 11 |
| B-12 | One frame copy per rAF, not per move (note) | **DEFERRED** | Phase 11 |
| B-13 | Unreachable runtime shipped (note) | **DEFERRED** | Phase 11 |
| M-1 | `kernel.ts` concentration | **DEFERRED** | Maintainability |
| M-2 | `pendingFailure` outside the documented runtime | **DEFERRED** | Maintainability |
| M-3 | README stale | **DEFERRED** | Maintainability |
| M-4 | No coverage map | **DEFERRED** | Phase 10 |

Four new observations found while verifying, reported separately as [N-1 … N-4](#new-observations-found-while-verifying).

---

## Correctness findings

### B-01 — Seam driver's `staged` slot never cleared · **CLOSED**

**Original claim.** `staged` was written after every committed transition and cleared only at the top of the next `runCore` or by `consumeStaged()`, whose only caller was `runReleaseSeam`. `runActivationSeam` staged the placeholder _element_ and nobody consumed it; settlement staged a `PreparedSettlement` carrying the consumer's readiness promise and nobody consumed that. The sharp repro: `onStart` calls `destroy()`, teardown runs to completion, and `runCore` then assigns the placeholder to `staged` _after_ `destroy()` returned.

**Current implementation.** Three independent mechanisms, each closing a different half:

- `seams.ts:420` — staging is now conditional: `staged = context.preparationValid() ? prepared : null`. The exact repro above now stages `null`, because the effect abandoned the operation.
- `seams.ts:498-502` — `runActivationSeam` calls `driver.consumeStaged()` **before** the policy runs, so nothing the seam triggers can read the placeholder either.
- `kernel.ts:596-605` — a new `dropStaged()` helper, called from `openSettlement` (`:1363`), the failure report's `finally` (`:1780`) and `handleBehaviorAction`'s `finally` (`:1819`). Every seam the kernel drives directly now drops what it staged.
- `seams.ts:374-383` — a `DEV` report fires if a value is _still_ in the slot as the next seam opens, which converts a future regression from invisible into loud.

The contract records the rule at 02 §The staged value never outlives its transaction, and 05 F-31/D-27 were amended alongside.

**Coverage.** Directly and at two layers:

- `tests/kernel/seams.node.test.ts:926` — stages nothing when the effect abandoned the operation; `:948` — reports a value an earlier seam left unconsumed; `:1378` — nothing staged after a committed activation; `:1391` — dropped before the policy runs; `:1554` — the consumer is never invoked when the release effect abandoned the operation.
- `tests/sortable/sortable.browser.test.ts:2371` — `seam staging across whole operations`, which drives two consecutive real drags and a failed drag and asserts the `DEV` leak report never fires. That is the mutation-resistant form: any future seam that forgets to drop fails this without needing its own test.

**Remaining risk.** None identified. The `DEV` report is the standing guard, and it is `true` in every browser (B-13/`dev.ts`), so it is live for consumers too.

**Credit where it is beyond the finding.** `runReleaseSeam` now also refuses to execute a `null` command on an otherwise-`SEAM_COMMITTED` outcome (`seams.ts:533-536`), which closes a case I did not identify: a release whose `effect` reentrantly destroyed the controller would previously have opened the consumer round-trip for a retired operation.

---

### B-02 — `RECOVERY_HOME` re-anchor unguarded · **CLOSED**

**Original claim.** The destination branch of `anchorTarget` carried all three Q-12 conjuncts; the home branch went through `movePlaceholder` with no connectivity or parentage check, so a consumer reparenting the home neighbour during a rejection or cancellation could have the placeholder relocated into a foreign container, with the pin then measured there. I recommended fixing the class rather than the instance, in the shared writer.

**Current implementation.** Exactly that. `placement.ts:159-164`:

```ts
const anchor = after ?? insertion.before!;

if (anchor.parentNode !== placeholder.parentNode) {
  throw new Error(
    'drag: the insertion anchor is not in the placeholder’s container; …',
  );
}
```

Placed after the `placeholderAt` inertness check, so the already-correct case still costs nothing. Because it lives in the canonical writer it covers all three callers at once, each classifying at its own stage: `FAILURE_PLACEHOLDER_MOVE` (spatial), `FAILURE_RELEASE` (release write), `FAILURE_LANDING_TARGET` (home recovery). Recorded normatively in 00 D-27 and 05 F-31.

**Coverage.**

- `tests/sortable/placement.browser.test.ts:169, 181, 191, 204` — the writer in isolation: a foreign anchor as an internal gap, as an end gap, that the placeholder does not move, and a detached placeholder.
- `tests/sortable/sortable.browser.test.ts:2279` — `the placeholder container guard`, end-to-end for all four recovery paths, including the destination case which correctly stays a graceful no-op.

**Remaining risk — one consumer-visible consequence, deliberate and documented.** `sortable.browser.test.ts:2334` pins it: a cancellation whose home anchor was reparented now produces `onError(FAILURE_LANDING_TARGET)` and **no `onCancel`**. That is the contract's stated policy for a consequential join failure, and D-27 now says so — but it is the opposite disposition from the one Q-12 chose for the destination anchor ("degraded but not stranded, and no crash"). The asymmetry is defensible (home _writes_, destination only re-anchors when already adjacent) and is now explicit rather than accidental; I register it so Q-12's sufficiency question is understood to cover both branches when Phase 10 judges it.

---

### B-03 — `vertical()` caches FLIP-transformed geometry · **PARTIALLY CLOSED**

**Original claim.** `invalidateInsertion()` ran _before_ `afterMove` started the displacement animations, and `vertical()` rebuilt lazily on the next spatial frame — i.e. mid-animation — then set `dirty = false`, freezing intermediate centres until the next invalidation. A feature that only animates could change what the drag decided.

**Current implementation — the premise is confirmed and the frame loop is closed.** This was addressed more thoroughly than I proposed, and the diagnosis was accepted verbatim in contract 03 §Insertion geometry is _settled presentation geometry_, which is a new normative definition rather than a patch.

- `feature.ts:59-77` / `slots.ts:105-121` — a new optional `InsertionGeometry.measure`, flattened by the assembler (`assemble.ts:143-147`) to a nullable `slots.measureInsertion`. `invalidate()` stays lazy by contract, because its other callers are the scroll and resize listeners.
- `vertical.ts:196-215` — `measure()` refreshes eagerly.
- `spec.ts:522-548` — the bracket is now `beforeMove → movePlaceholder → invalidate → measureInSeam → afterMove`, and `measureInSeam` (`:167-183`) narrows a throw to `FAILURE_INVALIDATION`.
- `layout-animation.ts:159-171` — `beforeMove` now releases **every** offset the feature owns, not just this span's, after capturing First. That is what creates the settled window; releasing only the span would have left an in-flight row from a previous move corrupting the rebuild.

Two adjacent improvements landed with it, both beyond the finding: displacement now writes the individual `translate` property with `composite: 'add'` rather than `transform` (`layout-animation.ts:182-199`), and the affected set is explicitly `snapshot members ∩ crossed span ∪ in-flight`, minus the dragged item and the placeholder (`:75-143`, via the new `DisplacementView.item`).

**Coverage.** The strongest new suite in the package, `tests/sortable/displacement.browser.test.ts` (774 lines):

- `:284` `settled presentation geometry` — the regression itself ("should not propose a reversal while a displacement is running"), an equivalence test against a run with every displacement cancelled, and a joint invariant comparing every intermediate order _and_ the final `ReorderRequest` with and without `layoutAnimation()`.
- `:375` ownership, `:522` authored presentation, `:627` retargeting, `:702` the read-count bound, `:752` teardown.
- `tests/sortable/sortable.browser.test.ts:1922` — a failing `measure()` is classified as `FAILURE_INVALIDATION`.

**Remaining risk — the committed-move path is closed; the other three invalidation sources are not.** `measureInSeam` is called at exactly one site (`spec.ts:544`). The remaining callers of `invalidateInsertion()` all still trigger a _lazy_ rebuild that can land mid-displacement:

| Site | Rebuild happens | Exposure |
| --- | --- | --- |
| `spec.ts:336` scroll/resize listener | next spatial frame | a scroll during an active drag with a displacement in flight |
| `spec.ts:572` collection publication | next spatial frame | `updateItems()` mid-drag |
| **`spec.ts:602` `release.prepare`** | **immediately, in the same call** | **decides the final proposal** |

The release path is the one that matters. `handleUp` disposes the motion lifetime, which cancels the frame task and pointer capture but **not** the displacement animations — nothing cancels those until `spec.retire()`. So a release within the 160 ms default duration of the last committed move reaches `release.prepare`, which calls `invalidateInSeam()` (discarding the settled cache the bracket just built) and then `resolveInsertion` immediately, against mid-flight rects.

That is the same mixed field the closed finding describes, at the one moment it changes what the consumer is asked to apply. `displacement.browser.test.ts:334` does release while a displacement runs, but at coordinates where the settled and mid-flight answers coincide (`step(110)` then `release(110)`), so it does not discriminate. The discriminating shape is the one `:285` already establishes as answering differently — `activate; drag(55); release(45)` — which no test performs.

**Owning phase: Phase 10.** The matrix closure is where a release-during-displacement fixture belongs, and it decides whether a source change is needed at all. If one is, the seam already exists: either `release.prepare` reuses the settled cache instead of invalidating, or it calls `measureInsertion` the way the bracket does.

---

### B-04 — `captureInlineStyles` destroys authored longhands · **CLOSED**

**Original claim.** `LIFTED_PROPS` captured shorthands. `getPropertyValue('margin')` returns `''` unless every longhand is set, so `style="margin-left: 12px"` recorded nothing and the restore path's `removeProperty('margin')` dropped it permanently. Same for `inset`→`right`/`bottom`, `padding-*`, `border-*` and `overflow-x|y`. I recommended longhand expansion over a wholesale attribute restore, because a wholesale restore would clobber consumer writes made during the drag.

**Current implementation.** `presentation.ts:55-131` — `LIFTED_PROPS` is expanded to 36 longhands, and the module comment states both halves of the reasoning, including one I missed: `!important` priority is per declaration, so an authored `padding-top: 4px !important` beside three ordinary paddings cannot be expressed as a shorthand entry at all. The "never restore the `style` attribute wholesale" rule is recorded normatively in contract 01 §The inline-style snapshot is per longhand.

**Coverage.** `tests/kernel/presentation.browser.test.ts:141, 154, 180, 194` — a single authored longhand under a written shorthand, every shorthand the lift writes, priority preservation, and the negative case (a consumer write to an untouched property is left alone).

**Remaining risk.** None identified. The list is now a fixed inventory that must be kept in step with what the lift writes; `:154` is the test that fails if a new shorthand write is added without its longhands.

---

### B-05 — Third action tag and the empty 8b deviation ledger · **PARTIALLY CLOSED**

**Original claim.** `SORTABLE_ACTION_TAGS = 3` against a contract that says `config.actionTags: 2` and calls a third tag a "signal worth investigating" (Q-4); and phase 8b had no _Deviations recorded while implementing_ section while at least three deviations had landed.

**Current implementation — the ledger half is closed.** `plan.md` phase 8b now carries two deviation blocks (7 entries for 8b, 6 for pass 2) plus a contract-amendment summary. `DisplacementView.insertion`, `DisplacementView.item` and `InsertionGeometry.measure` are all recorded, and contract 03 §Consumer -declared views gained a table of both view widenings with the reason each sketch could not work. The `landing()` generation counter and `fill: 'forwards'` deviations I had not raised are recorded too.

**What is not closed.** `TAG_INVALIDATION` appears nowhere in the contract or the plan:

```
$ grep -rn "TAG_INVALIDATION\|actionTags: 3" packages/drag2/.plan/
(no matches)
$ grep -n "actionTags" packages/drag2/.plan/contract/02-kernel-behavior-contract.md
1171: collection replacement, so it declares `config.actionTags: 2`.
```

Contract 02 §`ActionTransition` still asserts two tags, Q-4 in contract 05 is unamended, and `plan.md`'s risk table still reads _"Explicitly deferred to a kernel-contract revision, not a third tag."_ The code declares three.

**Coverage.** The mechanism is exercised — `sortable.browser.test.ts` covers the invalidation-failure round trip, and `arm()` validates the count the spec declares, so nothing is _broken_. There is no test asserting the declared count, and none could catch a documentation divergence.

**Remaining risk.** Documentation only. The mechanism is sound and well argued in `spec.ts:279-292`: a native scroll listener is not a seam, so `host.fail` there would be silently downgraded and `FAILURE_INVALIDATION` would have no producer. The risk is that Q-4 is a _signal_ the contract asked to be investigated, and a reader comparing code to contract today finds a mismatch rather than an answer.

**Owning phase: Maintainability.** One deviation entry plus an amended Q-4 sentence; nothing in the surface, the tests or the measurements depends on it.

---

### B-06 — `drag.js` leaks the internal SPI · **DEFERRED (Phase 9)**

**Original claim.** `drag.ts` re-exports `ActivationScope`, `BehaviorInstall`, `BehaviorSpec`, `KernelHost`, `ResolutionCommand` and `SeamRejection`, all listed by contract 03 as _internal and unstable_, while the types the export table requires on `drag.js` — `Point`, `DragErrorContext`, `FailureStage`, `DOMRealm` — are not exported. `consumer.node.test.ts` claims to catch exactly this and proves it for one identifier (`BehaviorFactory`).

**Current implementation.** `src/drag.ts` is byte-identical at HEAD; the export block at `:10-18` is unchanged. `consumer.node.test.ts` is unchanged.

**Coverage.** Unchanged — one `@ts-expect-error` line for `BehaviorFactory`; the six above still pass through.

**Remaining risk.** Unchanged. The emitted `drag.d.ts` plus `kernel/spec.d.ts` still ship the whole authoring surface, and `DragErrorContext` is still unreachable from any entry, so a consumer cannot type its own `onError` handler.

**Owning phase: Phase 9** — this is exactly what "freeze what ships" means, and the plan's phase-9 deliverable already names the fixture obligation.

---

### B-07 — `readinessTimeout` hardcoded and unreachable · **DEFERRED (Phase 9)**

**Original claim.** `spec.ts` sets `readinessTimeout: 500` as a literal with no consumer path, so an authored commit exceeding 500 ms yields `FAILURE_PRESENTATION_READY`, `onError` only, and no `onFinish` — for a drop the consumer accepted and applied. `liftMode: LIFT_FLAT` is hardcoded the same way. `assemble` also accepts `threshold: NaN`, which permanently disables activation.

**Current implementation.** `src/sortable/spec.ts:200-205` is unchanged:

```ts
config: { threshold: slots.threshold, liftMode: LIFT_FLAT, readinessTimeout: 500, actionTags: SORTABLE_ACTION_TAGS },
```

`assemble.ts` gained only the `measureInsertion` flattening; no validation was added.

**Coverage.** The timeout path itself is tested (the readiness watch and its replacement semantics); there is no test for configurability because there is none to test.

**Remaining risk.** Unchanged. Of the three, the timeout is the one with a consumer-visible failure mode on a _successful_ drop.

**Owning phase: Phase 9** — `SortableCallbacks` is the surface being frozen, and `threshold` is already the precedent for "one consumer-facing place".

---

### B-08 — `admit` is O(path × items) · **DEFERRED (Phase 11)**

**Original claim.** `snapshot.items.includes(node)` inside the `composedPath()` loop, inside the native `pointerdown` handler, before `preventDefault()`. Up to ~12,000 identity comparisons for an 800-row list nested 15 deep, while `copyUniqueItems` already builds and discards exactly the `Set` needed.

**Current implementation.** `src/sortable/spec.ts:211-243` is unchanged.

**Premise partially changed, in a way that reinforces the finding.** `layout-animation.ts:51, 78-86` now maintains precisely this data structure — a `Set<HTMLElement>` of snapshot members, rebuilt only when `snapshot.version` moves, with the comment _"A linear `includes` per candidate would make the walk O(distance × list)"_. The identical argument now exists in the codebase, applied to the displacement walk but not to admission.

**Coverage.** Behavioural coverage of admission is thorough; nothing counts comparisons, and nothing would.

**Remaining risk.** Unchanged, and now with an in-repo precedent for the fix.

**Owning phase: Phase 11** — it is a perf item with no correctness consequence, and M-1/M-2 are where the package's cost claims are settled.

---

### B-09 — `activate()` has no second-lift guard · **DEFERRED (Maintainability)**

**Original claim.** A note, not a defect: `acquireActivation` has no `lift === null` precondition, and the invariant that makes a double acquisition unreachable lives in `failOperation` three hundred lines away. A second `acquireLift` would capture the _lifted_ styles as authored and stack a second presentation disposer.

**Current implementation.** `kernel.ts:788-806` is unchanged.

**Premise re-checked at HEAD.** Still unreachable: all four `failOperation` downgrade conditions (`queue.closed`, no operation, cancel latched, `reporting` or `phase === REPORTING`) remain unsatisfiable at `PENDING` during activation, and the new `admitting` boundary does not add a path — it defers _dispatch_, and admission commits `PENDING` before it drains.

**Coverage.** None, and none is possible while the state is unreachable.

**Remaining risk.** Unchanged and latent. Worth noting that B-04's fix raises the cost of the failure mode slightly: `LIFTED_PROPS` is now 36 longhands, so a double capture would record 36 lifted values as authored rather than 19.

**Owning phase: Maintainability.**

---

## Performance findings

### B-10 — The incumbent anchor read is never cached · **DEFERRED (Phase 11)**

**Original claim.** `centreOf(placeholder)` calls `getBoundingClientRect()` on every `resolve`, i.e. every animation frame, even when `refresh` short-circuits. The placeholder's layout position changes only on the events that already dirty the index, so it is exactly as cacheable as the rows and is the only one that is not.

**Current implementation.** `vertical.ts:147` is unchanged.

**Premise sharpened by the B-03 fix.** With the rebuild re-timed into the bracket, `refresh` now short-circuits on _more_ frames than before — the eager `measure()` clears `dirty` at the committed move, so the next spatial frame's `refresh` is a no-op. `centreOf(placeholder)` is therefore now a larger share of the per-frame geometry work than when I raised it: on a steady-state frame it is the _only_ layout read the axis performs.

**Coverage.** `displacement.browser.test.ts:702` counts reads on collection _items_ only, so it does not observe the placeholder read at all.

**Remaining risk.** Unchanged in kind, larger in proportion.

**Owning phase: Phase 11.**

---

### B-11 — The hot path costs ~7 indirect calls, not 3 · **DEFERRED (Phase 11)**

**Original claim.** Contract 00 and 06 account for three post-`MOVE` indirect calls; the implemented path is `handle → handleMove → runLeaf → runPhase → runMoved → spec.moved → lift.write → compose`, plus `frame.schedule`, with a re-entry check, two latch writes and a `try/catch` per sample. Not a defect — the wrapper is mandated by F-40 — but M-1's framing is aimed at the wrong cost.

**Current implementation.** `kernel.ts` `handleMove`/`runMoved` and `seams.ts` `runPhase`/`runLeaf` are unchanged on this path. `runCore` gained a `DEV`-only staged check, but that is `runCore`, not `runLeaf`, so `moved` is unaffected.

**Coverage.** Behavioural only; nothing counts calls.

**Remaining risk.** Unchanged. Contract 00 §D-8/F-8 and 06 §The hot path still quote three.

**Owning phase: Phase 11** — M-1 explicitly.

---

### B-12 — One frame copy per rAF, not per move · **DEFERRED (Phase 11)**

**Original claim.** `runCore` calls `begin()` before `prepare`, so a spatial frame that discards still pays a 15-field `Object.assign`. Deliberate and correct; recorded because contract 02 frames the extra copy as _per `pointerup`_, understating the steady-state rate.

**Current implementation.** `seams.ts:385` unchanged.

**Coverage / remaining risk.** Unchanged.

**Owning phase: Phase 11** (M-1/M-2 input).

---

### B-13 — Unreachable runtime shipped · **DEFERRED (Phase 11)**

**Original claim.** `FrameTask.flush()`, `Lifetime.finalized`, `seamFailed` and the two unreachable lift modes.

**Current implementation, re-checked item by item at HEAD:**

| Item | State |
| --- | --- |
| `FrameTask.flush()` | still no caller in `src/` **or** `tests/` (`grep -rn "\.flush("` → nothing) |
| `Lifetime.finalized` | still no reader in `src/`; now read by `tests/kernel/lifetimes.node.test.ts:149-180` |
| `seamFailed` | still test-only (`seams.node.test.ts:1625`) |
| `LIFT_FAITHFUL` / `LIFT_IN_PLACE` | still unreachable from the sortable composition; `acquireLift` still branches on a runtime value, so the in-place projection and matrix base cannot be shaken out |

**Remaining risk.** Unchanged, and slightly larger in absolute terms — see [N-3](#n-3--the-fix-passes-cost-04-05-kb-brotli).

**Owning phase: Phase 11** (M-3).

---

## Maintainability observations

### M-1 — `kernel.ts` concentration · **DEFERRED (Maintainability)**

**Original claim.** 1,915 lines in one closure over ~35 mutually visible bindings, with pairwise consistency rules enforced by prose; the settlement machinery is separable behind an explicit context object, as `SeamContext` already is for the driver.

**Current state.** 1,971 lines, and one more closure-scope latch: `admitting` (`kernel.ts:270-288`), whose correctness rule — _dispatch must not drain for the whole of native admission, and the flag must be cleared in a `finally`_ — is a fifth prose-enforced pairing alongside `armedStamp`/`stamp`, `pinned`/`current.operation`, `reporting`/`phase`, and the four settlement latches. The new latch is well documented and clearly necessary; the trend is the observation.

**Remaining risk.** Unchanged in kind, one increment larger.

### M-2 — `pendingFailure` outside the documented runtime · **DEFERRED (Maintainability)**

**Original claim.** A per-controller closure binding in `createSortableSpec` holding seam state that is not on `SortableRuntime`, so the documented inventory of the behavior's mutable state is incomplete.

**Current state.** `spec.ts:134` unchanged. `PresentationView` gained a `readonly item` field (`runtime.ts:44-50`), so `runtime.ts`'s "Seven mutable fields" header is now further from the object it describes.

**Remaining risk.** Discoverability only, unchanged.

### M-3 — README stale · **DEFERRED (Maintainability)**

**Original claim.** §Status says "Phases 0–6 complete", "`assemble()` is phase 7 and the feature modules are phase 8, so `sortable(items, ...features)` does not exist yet", and "`src/sortable.ts` is still a stub". All false.

**Current state.** `README.md` is **unchanged at HEAD** — it is not in the `bee2c15f..HEAD` diff at all. It is now materially more stale: the deliberate- differences list omits the cross-container refusal, per-longhand style restoration, all-or-nothing landing acquisition, the admission queue boundary, and the settled-presentation-geometry rule — five behavioural differences added since it was written.

**Remaining risk.** A contributor's first file is wrong about what exists and about what the package guarantees.

### M-4 — No coverage map · **DEFERRED (Phase 10)**

**Original claim.** No matrix row → test → invariant map; two specific composition gaps worth pulling forward.

**Current state.** No map exists (`tests/` contains no coverage artefact). One of the two gaps I named is now closed and closed well — `displacement.browser.test.ts` covers `vertical()` + `layoutAnimation()` — and the other, the home re-anchor against a reparenting consumer, is covered at `sortable.browser.test.ts:2334`. The suite grew 518 → 568 across 13 new describes. The map itself remains phase 10's deliverable, and it now has more to map: `displacement.browser.test.ts` and `the admission queue boundary` are both new groups with no matrix row naming them.

---

## New observations found while verifying

Reported separately, as instructed. None is a defect in a fix; N-1 and N-4 are documentation consequences of the fixes.

### N-1 — `q7.md` now contradicts contract 03 and its own harness

`packages/drag2/.plan/measurements/q7.md` is **unchanged** since `bee2c15f`. Its §Answer 2 still concludes:

> **They do not happen at the same moment anyway.** `vertical()` is invalidated by the committed move but rebuilds lazily, on the _next_ spatial frame … So: no behavior-owned read phase, no shared geometry-read capability.

Both sentences were reversed by the B-03 fix, and contract 03 now says so explicitly: _"The behavior-owned read phase the open question anticipated exists, but it costs nothing, and it is there for correctness rather than for cost."_ `plan.md` carries M-4's write-up into Phase 11 as the record; two normative documents currently disagree about whether the read phase exists.

Owning phase: **Phase 11** (M-4 is written up there), though it is a five-minute amendment.

### N-2 — The container refusal converts silent degradation into classified failure

Registered under B-02 as remaining risk rather than repeated here. Summarised: `movePlaceholder` throwing is a behaviour change on three call sites, and its most visible consequence is that a cancelled or rejected drop whose home anchor was reparented now delivers `onError` and **no terminal callback**, where previously it silently mis-placed. Deliberate, documented in D-27, and tested — recorded so Phase 10 judges Q-12's "degraded but not stranded" principle against both branches.

### N-3 — The fix passes cost 0.4–0.5 kB brotli

Re-measured with `npx just size` at HEAD, against the figures in review B:

| Composition                   | at `bee2c15f` | at HEAD      | Δ             |
| ----------------------------- | ------------- | ------------ | ------------- |
| minimal                       | 10.26 kB      | **10.63 kB** | +0.37 (+3.6%) |
| minimal + `layoutAnimation()` | 10.78 kB      | 11.24 kB     | +0.46         |
| minimal + `landing()`         | 10.65 kB      | 11.02 kB     | +0.37         |
| complete                      | 11.47 kB      | **11.95 kB** | +0.48 (+4.2%) |

Shipped `@ydinjs/drag` baseline is unchanged: `sortable.js` 6.98 kB, combined 11.30 kB. So the minimal composition has gone from 47% to **52% larger than the shipped feature-complete `sortable.js`**, and `complete` has crossed above `combined`.

The spend is defensible — most of it is `LIFTED_PROPS` (36 string literals), the container-guard message, the `DEV` staged-leak message, and the settled-geometry bracket — but it is spent in the _always-present_ layer, which is the one review B identified as the weak number. Owning phase: **Phase 11** (M-3), which is where the budgets are set; recorded so the trend is visible rather than discovered at sign-off.

### N-4 — The Q-7 timing assertions are now opt-in

`tests/perf/q7.browser.test.ts:279` gates the timing suite behind `VITE_DRAG_MEASURE`, which is why the default run reports 3 skipped. The structural claim was replaced by two deterministic read-count assertions (`:238` span = 2 reads, `:251` full destination view = 200), which is a strictly better gate — a ratio between two wall-clock samples on a shared machine could only fail for reasons unrelated to the library.

The consequence to register: the numbers `q7.md` quotes are no longer regenerated by any default run, and `q7.md` §Harness still describes the old arrangement ("checked in and run in CI. It is a measurement that also asserts"). Same amendment as N-1. Owning phase: **Phase 11**.

---

## Verdict 1 — Checkpoint B's composition-model exit criteria

**Satisfied.**

The plan's exit is _"Phases 7–8a green; any composition-model concern resolved before optional features multiply the cost of changing it."_ Taking the five "what to review" questions in turn against HEAD:

| Question | At `bee2c15f` | At HEAD |
| --- | --- | --- |
| Contribution/slot shape and the flattened geometry pair (D-19, D-12) | Held; one view change needed | **Held, and now proven under stress.** `InsertionGeometry` gained an optional third method; the pair became a triple for a stated reason, and the assembler flattening scaled to it in five lines. `SortableContribution` is still unchanged since phase 7. |
| Assembler unwind, claim diagnostics, normalization under real factories | Held | **Held.** Unchanged except for one flattening; the duplicate-axis cleanup and reverse-order tests still pass. |
| Consumer-declared views without an import edge back to the behavior runtime (D-13, D-20) | Held, two widenings | **Held, three widenings, all recorded** in contract 03 with a table stating why each sketch was one field short. No feature imports a behavior runtime type. |
| Minimal module graph and first size reading | Measured | **Re-measured** (N-3). The graph is unchanged and still clean. |
| Gate semantics observed: readiness held with no landing feature (I-9) | Verified at two layers | Unchanged, still verified. |

The one composition-model concern I raised — B-03, a purely visual feature changing what the drag decided — was not deflected. It produced a normative definition of insertion geometry, a new optional capability with a stated lazy/eager split, a rewritten displacement feature with explicit ownership, and a 774-line suite whose strongest test asserts that installing `layoutAnimation()` changes no intermediate order and no final request. That is the checkpoint doing its job.

The residual on the release path (B-03, PARTIALLY CLOSED) is **not** a composition-model concern: the model expresses the fix already, and closing the residual is a call-site decision inside the behavior plus a fixture. It does not argue for changing the contribution shape, so it does not hold this checkpoint open.

## Verdict 2 — release blockers vs future-phase work

**Release blockers before the Phase 11 sign-off gate** (2):

1. **B-03 residual, Phase 10.** A release inside the displacement window re-resolves the final insertion against mid-flight geometry, and that determines the `ReorderRequest` the consumer is asked to apply. The discriminating fixture is one test away from an existing one; it must be written and the answer acted on before sign-off, because it is the same defect class the fix pass just declared closed.
2. **B-06 and B-07 together, Phase 9.** Not blockers on their own merits, but Phase 9 _is_ the freeze: shipping `drag.js` with six internal SPI types and without `DragErrorContext`, and shipping a 500 ms readiness bound a consumer cannot raise, both become semver-visible the moment the surface is frozen.

**Future-phase work, not blocking** (11):

- _Phase 9_: B-06, B-07 (as above, if taken before the freeze rather than as part of it).
- _Phase 10_: M-4 coverage map, which now has two unmapped new groups.
- _Phase 11_: B-08, B-10, B-11, B-12, B-13, N-3's budget decision, and N-1/N-4's M-4 write-up amendment.
- _Maintainability_: B-05's Q-4/tag record, B-09's latent guard, M-1's kernel concentration, M-2's runtime inventory, and **M-3, the README** — which is the cheapest item on this list and the one a new contributor hits first.

**Closed and not carried forward** (3): B-01, B-02, B-04. All three have direct regression coverage, and B-01 additionally has a standing `DEV` guard that makes a future regression self-reporting rather than needing a new test.
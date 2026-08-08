# Checkpoint D fifth review — not ready to close

I independently reviewed the Review 4 implementation record, the subsequent architect decision for the `landing()` residue, that decision's implementation record, the current source and tests, the parity ledger, the contract set, and the live Checkpoint D verification gates.

C4-02 is closed, C4-03's normative Q-7/Q-12 correction is substantively closed, and C4-04's live size evidence is accurate. C4-01 is not closed: the new liveness channel reaches the modules named by the resolution, but two consumer-reachable continuations still mutate or publish after `destroy()`. Both were reproduced with temporary browser regressions and both violate the Review 4 architect decision's own five-act floor. The later `landing()` decision also calls provisioning universal while explicitly deferring provisioning for `landing()`, and retains an I-6 headline contradicted by its conformance test. Checkpoint D cannot close.

## Verdict

| Review 4 item | Fifth-review result |
| --- | --- |
| C4-01 — structural I-36 barrier | **Keep open.** The reported candidate-geometry and direct `animate()` paths are fixed, but animation subscription and placeholder mechanics still cross the barrier (C5-01, C5-02). |
| C4-02 — abort return-channel documentation | **Closed.** Contract 03 now describes `RectIndex.refresh(): boolean`, every current abort source, and `xy()`'s second placeholder check. |
| C4-03 — Q-7/Q-12 status | **Normative core closed.** Contracts 03 and 05, the plan, and the Q-7 measurement now agree. Current illustrative/evidence prose still carries the old statuses (C5-04). |
| C4-04 — size and loss-accounting evidence | **Size evidence closed.** Exact live bytes and derived costs match the README, contract 03, and plan. One ledger explanation remains factually wrong (C5-04). |
| Review 4 landing-residue decision | **Keep open.** Its universal provisioning rule and I-6 headline contradict both the source and its new conformance test (C5-03). |
| L-11 | Owner-deferred to Phase 23; not reopened by this pass. |
| Checkpoint D | **Keep open.** |

## C5-01 — major: `layoutAnimation()` can retain a new animation after retirement

The C4-01 implementation correctly checks `view.live()` after `element.animate()` and cancels an untracked animation when `animate()` itself destroyed the controller (`src/sortable/layout-animation.ts:253-266`). It then performs another acquisition sequence without a terminal check:

1. read the overridable `animation.finished` accessor;
2. call its `.then(...)` member (`:268-281`);
3. publish the animation into `running` (`:291-293`).

The code and existing tests already treat `finished` as a fallible accessor and `then` as a call (`layout-animation.ts:268-288`; `tests/sortable/displacement.browser.test.ts:565-601`). They are also consumer-reachable when a consumer overrides `element.animate()` and returns an instrumented animation. If the `finished` getter or returned thenable calls `controller.destroy()`, `retire()` runs while `running` is still empty and therefore cannot cancel this animation. Control returns, subscribes, and executes `running.set()` after retirement. The result both retains the row/animation past `retire()` and leaves a displacement effect alive on the consumer's row — I-36 floor acts 1, 2, and 3 (`contract/05-lifecycle-invariants.md:54`).

I reproduced this through the real public composition with a temporary regression, then removed it. The row's `animate()` returned a real animation whose `finished` getter destroyed the controller. Expected displacement animations after the spatial frame: `[]`; received: one live `Animation`. The focused suite otherwise passed 26 tests. Existing C4-01 cases stop at destroy from geometry or `animate()` itself (`tests/sortable/displacement.browser.test.ts:980-1066`) and do not exercise subscription-triggered retirement.

Treat subscription as part of all-or-nothing acquisition: revalidate after the `finished.then(...)` sequence and before `running.set()`, cancel the untracked animation on a closed reading, and add a permanent accessor/thenable regression. The terminal check must cover both the accessor and the call, not only a throwing accessor — a synchronous destroy that returns normally is the failing path.

## C5-02 — major: `createPlaceholder()` guards the factory but not its consumer-owned mechanics

Review 4 added one liveness check after the consumer's placeholder factory returns (`src/sortable/placement.ts:76-91`). On a live reading, `applyMechanics()` then performs an unchecked sequence over consumer-owned objects (`:32-55`): two `setAttribute()` calls, `item.getAttribute()`, a slot mutation, style writes, and `visual.offsetWidth` / `offsetHeight` reads. Each method or getter is overridable, but no liveness reading exists inside that sequence.

For a concrete path, a consumer-returned placeholder can override its first `setAttribute()` to call `controller.destroy()`. Control returns and the library immediately invokes the second `setAttribute()` and continues the remaining reads and writes. Those mutations remain on the consumer-owned element; teardown never adopted it and does not undo them. This is exactly I-36 floor act 3, and it also contradicts the operative sentence that a participant reads the latch between consumer invocations (`contract/05-lifecycle-invariants.md:54`).

I reproduced this with a temporary direct `createPlaceholder()` regression, then removed it. The first mechanics write flipped `live()` false. Expected write list: `['data-drag-placeholder']`; received: `['data-drag-placeholder', 'aria-hidden']`. The focused file otherwise passed 13 tests. The Review 4 evidence explicitly records the factory-to-`applyMechanics` reading as uncovered defence in depth (`tests/COVERAGE.md:374`), but the first consumer-reachable call *inside* `applyMechanics` provides a discriminating fixture.

Thread liveness through the mechanics sequence and stop before the next consumer call or surviving DOM mutation. Add coverage for a custom placeholder method and a visual offset getter; the latter also exercises the default-placeholder composition.

## C5-03 — major: the landing-residue decision makes I-6/I-36 internally inconsistent

The architect decision replaces I-36's open-ended indirect-call quantifier with three obligations. Its first is explicit: **“Provisioning — universal and closed. Every module that reaches consumer code … holds a liveness reading”** (`contract/05-lifecycle-invariants.md:54`). The same row's opening sentence still requires a participant driving multiple consumer calls to read the latch between invocations.

`landing()` is an admitted counterexample:

- it invokes the consumer's duration thunk, `matchMedia`, and `visual.animate()` in sequence (`src/sortable/landing.ts:82-104`, `:122-135`);
- `FeatureContext` contains only `realm`, `root`, and `report` (`src/sortable/feature.ts:29-41`), and `landing()` ignores that context;
- the resolution explicitly does **not** implement `FeatureContext.live`, deferring it behind Phase 21's budget re-base (`contract/05-lifecycle-invariants.md:385-390`; `plan.md:815`, `:891`; `reviews/checkpoint-d-4-resolution-landing-residue-implementation.md:30`, `:72-75`).

The contract therefore calls provisioning universal and closed while naming a first-party module that is not provisioned. Applying only the five-act floor does not repair this: without a liveness reading, “after a closed reading” is vacuous, and the separate provisioning obligation remains false.

I-6 retains a second incompatible promise: `destroy()` is terminal and **“no callback fires afterwards”**, including participant-driven sequences (`contract/05-lifecycle-invariants.md:24`). The new conformance test deliberately requires one overridden `animate()` call after the duration thunk destroyed the controller (`tests/sortable/features.browser.test.ts:805-855`). Mechanism prose that reinterprets this as “no callback with a consequence the operation outlives” does not change the invariant's operative sentence.

Resolve one coherent contract before closing D. Either land `FeatureContext.live` and stop the first-party landing sequence, or explicitly narrow both I-36 provisioning and I-6's callback guarantee so the registered exception is part of the invariant rather than a contradiction in its mechanism note. Whichever decision is taken must also remain consistent with the public conformance test. The current text cannot support a claim that I-36 is discharged.

## C5-04 — minor: current supporting documents retain pre-resolution claims

These do not outweigh the runtime blockers, but should be corrected in the closure pass:

- The illustrative sortable trace still says the two features measure the same list and Q-7/M-4 is an **open** duplicate-read cost (`contract/06-vertical-sortable-trace.md:246-248`), while the resolved contract says the axis reads every candidate visual, displacement reads the crossed span, and no shared read phase is needed. The same trace calls Q-12 “the one open mechanism” (`:622`), although contracts 03/05 resolve it.
- The live coverage ledger opens its Q-12 section with “What stays open is whether the fallback is good enough” and ends by recommending closure (`tests/COVERAGE.md:395-408`). That should state the landed answer directly.
- The parity ledger says the three omitted names other than `AnimationTiming` were names “`sortable.js` alone ever exported” (`ledger.md:276`). Its own rows say `CancellationReason` was never a named export and `ResolutionContext` was structurally exposed, while shipped `DragSubject` was exported by both `sortable.js` and `draggable.js` (`packages/drag/src/sortable.ts:26-30`; `packages/drag/src/draggable.ts:30-38`). The negative assertions proving absence from drag2's decided `sortable.js` surface are sound; only this explanation is not.

## What did close

- C4-02's normative return-channel account matches `RectIndex`, `y()`, and `xy()` (`contract/03-feature-composition.md:410-418`).
- Q-7 and Q-12 have consistent resolved status in the current normative sources (`contract/03-feature-composition.md:569`, `:625`; `contract/05-lifecycle-invariants.md:405-427`; `plan.md:293-300`).
- The live size values are minimal `10,116 B`, minimal xy `10,168 B`, layout `10,563 B`, landing `10,405 B`, complete `10,934 B`, baseline A `10,668 B`, and baseline B `6,889 B`. The documented composition cost (`266 B`, 0.27 kB, 2.5%), migration cost (`3,227 B`, 3.23 kB), and headroom (`106–155 B`, 0.11–0.16 kB) are correct.
- C4-01's reported candidate-geometry, placeholder-anchor, direct `animate()`, release-write, and behavior-side bracket paths have appropriate guards and regressions. The problem is that the claimed general mechanism stops before the two continuations above.

## Verification performed

From `packages/drag2`:

```text
npx just typecheck
  PASS

npx just test
  PASS outside the sandbox (the browser runner requires a local port)
  33 test files passed
  753 tests passed
  18 skipped
  no type errors

npx just size
  PASS — all seven compositions within their existing budgets
  minimal:                    10.12 kB Brotli, 31 modules
  minimal (xy):              10.17 kB Brotli, 31 modules
  minimal + layoutAnimation: 10.56 kB Brotli, 32 modules
  minimal + landing:         10.40 kB Brotli, 32 modules
  complete:                  10.93 kB Brotli, 35 modules

Temporary displacement regression
  FAIL as expected
  Expected surviving displacement animations: 0; received: 1
  Remaining focused tests: 26 passed

Temporary placeholder-mechanics regression
  FAIL as expected
  Expected attribute writes after the destroying write: 0; received: 1
  Remaining focused tests: 13 passed

Both temporary regressions were removed after reproduction.
```

No production or test source was changed by this review. The requested review file is the only review-owned workspace change.

# Checkpoint D second review — not ready to close

I reviewed the current Phase 15–17 artifact against Checkpoint D in [`plan.md`](../plan.md), both first-review resolution documents, the parity ledger, the normative 00–05 contract, the shipped `@ydinjs/drag` sortable, and the refreshed tests and size evidence.

Most of the first review's runtime fixes are correct. D1, D3, D6 and D8 close; D2's candidate geometry is restored; and D4's reduced-motion ordering is fixed. The second pass nevertheless found one reproducible terminal-barrier defect and three places where the claimed documentary/parity closures still contradict the live artifact. Checkpoint D's exit condition — no open sortable parity item before a second behavior reaches the kernel — is therefore not met.

## Verdict

| First-review item | Second-review result |
| --- | --- |
| D1 — keyboard handle exact-once | **Closed.** One `resolveItem`, then `seedDraft`; the admitted, declined, pointer-parity and reentrant-update cases are pinned. |
| D2 — candidate visual geometry | **Geometry closed; lifecycle follow-up open.** `y()` and `xy()` now measure candidate visuals, but the expanded callback path can cross `destroy()`'s terminal barrier (C2-01). |
| D3 — `updateItems()` after destroy | **Closed.** The controller latch precedes copying and validation; valid, invalid and reentrant arrivals are pinned. |
| D4 — settle-time duration thunk | **Behavior closed; public contract still open.** Resolution and validation precede reduced-motion collapse, but the normative API still describes the old fixed-duration contract (C2-02). |
| D5 — sortable type exports | **Decision accepted; loss accounting still open.** The frozen surface may remain unchanged, but two parity rows do not state the actual migration loss (C2-03). |
| D6 — landing default | **Closed.** The default is the retained `'ease'`, with an authored-timing assertion. |
| D7 — live authorities | **Partially closed.** Contract 03 and the ledger were advanced; other documents explicitly ranked normative were not (C2-04). |
| D8 — diagnostic and evidence | **Behavior closed.** The diagnostic, coverage path and live size table are corrected; a few evidence statements remain stale (C2-05). |
| Checkpoint D | **Keep open.** |

## C2-01 — major: resolver traversal continues after synchronous `destroy()`

Contract I-6 says `destroy()` is synchronous and terminal and that no callback fires afterwards (`contract/05-lifecycle-invariants.md:22`). The restored D2 geometry path violates that rule. `RectIndex.refresh()` loops over the collection and invokes the consumer's `getVisual` for each candidate (`src/sortable/rect-index.ts:82-110`). If one invocation calls `controller.destroy()`, the loop continues and invokes `getVisual` for the following candidates after teardown has returned. There is no liveness check between consumer calls.

I reproduced this with a temporary focused browser regression, then removed it: a three-item composition recorded the dragged visual, destroyed the controller while resolving the first candidate visual, and asserted that resolution stopped there. The actual sequence also contained the second candidate. The focused run failed with the received three-item call list versus the expected two-item list.

The same missing boundary is visible during admission. `resolveItem()` invokes `getHandle` (`src/sortable/spec.ts:112-139`), and `seedDraft()` then invokes `getVisual` (`:153-163`) without a way to observe that the handle resolver destroyed the controller. The kernel's post-`admit` closed check prevents a new operation from being published, but it runs only after the whole behavior admission callback returns; it cannot make the later consumer callback un-happen.

This is the failing executable lifecycle case contract 00 requires before reopening the frozen SPI (`contract/00-index.md:24-28`). Make resolver sequences terminal-aware — whether through a narrowly exposed liveness capability or an equivalent behavior/kernel mechanism — and stop immediately after a reentrant destroy. Pin at least both paths:

- `handle()` destroys during admission, so `visual()` is not called afterwards;
- a candidate `visual()` destroys during a cache rebuild, so no later candidate resolver is called.

The tests should cover both `y()` and `xy()` if the fix is axis-owned rather than shared by `RectIndex`.

## C2-02 — moderate: D4's implementation is fixed, but the public landing contract still specifies the old API

The implementation exposes `LandingOptions.duration?: number | (() => number)` and validates a thunk once at settlement (`src/sortable/landing.ts:26-39,82-99`). The normative feature contract still exposes only `duration?: number` (`contract/03-feature-composition.md:554-563`) and says every option is validated at construction (`:733-747`). The README repeats the all-at-construction claim (`README.md:89-98`).

The parity ledger also gives both readings at once: its retained behavior row says the thunk closed the gap in Phase 15, but opens with “fixes timing at construction” (`ledger.md:50`), and L-6 still calls the option a future Phase 15-or-22 change (`:229`). This is not historical provenance in a review file; these are the documents Checkpoint D names as the live contract and parity authority.

Amend the public signature and domain text to distinguish fixed durations (validated at construction) from thunks (invoked and validated once per landing), and reconcile both ledger statements. Without that, D4 is behaviorally fixed but not documentarily closed.

## C2-03 — moderate: D5's reclassification understates two real consumer losses

Keeping the frozen drag2 entrypoint unchanged is a defensible D5 decision, but the ledger's required “what a consumer loses” accounting is factually inaccurate in two rows.

- `AnimationTiming` is a real named export of the shipped sortable entry (`packages/drag/src/sortable.ts:26-30`), defined as `Pick<EffectTiming, 'duration' | 'easing'>` (`packages/drag/src/kernel/types.ts:43`). Removing it loses a source-compatible import and the common annotation consumers used for `landingTiming()`. The ledger instead says “nothing nameable” (`ledger.md:68`). Its claim that drag2's duration domain is “strictly wider” is also false: the active DOM `EffectTiming.duration` accepts `number | CSSNumericValue | string`, while drag2 accepts `number | (() => number)`; the domains overlap, but neither contains the other.
- The shipped `CancellationReason` is not itself a named export from `sortable.js`, but it is structurally exposed through the exported `SortableCancelResult`: canceled results carry `{ reason: { type: 43 | 44 | 45 | 46 | 47; detail?: unknown } }` (`packages/drag/src/sortable/options.ts:43,167-174`; `packages/drag/src/kernel/protocol.ts:73-88`). Drag2 replaces that closed built-in-reason shape with `reason: unknown` and adds the orthogonal `stage` field (`src/sortable/domain.ts:180-186`). A consumer loses direct access to the built-in reason's `type` and `detail`; “nothing against shipped” (`ledger.md:72`) is therefore wrong even if the redesign remains preferable.

Correct the ledger to state those migration losses and remove the “strictly wider” rationale. The consumer type fixture should also pin the deliberate absences (`AnimationTiming`, `DragSubject`, `ResolutionContext`, `CancellationReason`) with negative assertions, as it already does for internal names and `OUTCOME_*`; otherwise the frozen omission decisions have no executable guard.

## C2-04 — moderate: D7 leaves present-tense statements in documents that contract 00 explicitly ranks normative

The D7 resolution says remaining Part I `vertical()` prose is provenance. Contract 00 says the opposite: documents 00–04 are normative, in precedence order (`contract/00-index.md:13-24`). Those live authorities still publish the removed API and ownership model in present tense:

- contract 00 says the cache lives inside `vertical()` and links the insertion rule to the now-nonexistent `vertical()` heading (`contract/00-index.md:75,113`);
- contract 01's consumer-facing construction example still calls `vertical()` (`contract/01-construction-ownership.md:99-111`) and later assigns the cache/rule to it (`:243,268`);
- contract 04's current feature-state table still names `vertical()` (`contract/04-frame-slicing.md:165-170`).

Contract 03 still has some historical uses that can reasonably stay when explicitly framed as earlier drafts, but the entries above are current declarations and examples. Either advance all current statements in 00–04 to `y()`/`xy()`, or change contract 00's precedence/status language so the reader can tell which portions are intentionally historical. Calling normative prose provenance only in the resolution document leaves the source of truth internally inconsistent, so D7 is not closed as written.

## C2-05 — minor: the refreshed documentation and evidence still contain several verifiable residues

These do not independently block the runtime, but they should be corrected before Checkpoint D is recorded as closed:

- Contract 03's `SortableCallbacks` listing omits the public `readinessTimeout?: number` (`contract/03-feature-composition.md:427-438` versus `src/sortable/feature.ts:87-113`), even though the same contract documents the option at `:740-745`.
- Phase 17 added `sortable/xy.js`, so `typedoc.json` has nine entrypoints, while contract 03 and the README still say TypeDoc covers eight (`contract/03-feature-composition.md:731`; `README.md:85`).
- Contract 03 says the optional-feature deltas are unchanged since M-3 (`contract/03-feature-composition.md:658-668`), but M-3 recorded `landing()` at +0.27 kB and complete at +0.76 kB; the live figures are +0.28 and +0.81 kB. The module-graph property remains true, but the numeric statement does not.
- The source pseudocode for both axes still says candidate “item” while the corrected normative rule and implementation measure the candidate visual (`src/sortable/y.ts:6-8`; `src/sortable/xy.ts:4-6`).
- `plan.md:791` attributes the eleven new tests as five D1, three D3 and three D4/D6. The actual split is four D1, three D3 and four D4/D6.

## Verification performed

From `packages/drag2`:

```text
npx just typecheck
  PASS

npx just test
  PASS outside the sandbox (the browser runner requires a local port)
  33 test files passed
  724 tests passed
  18 skipped
  no type errors

npx just size
  PASS
  minimal:                    10.01 kB Brotli, 31 modules
  minimal (xy):              10.05 kB Brotli, 31 modules
  minimal + layoutAnimation: 10.42 kB Brotli, 32 modules
  minimal + landing:         10.29 kB Brotli, 32 modules
  complete:                  10.82 kB Brotli, 35 modules

npx vitest --run tests/sortable/features.browser.test.ts
  Temporary terminal-barrier regression: FAIL as expected
  Received one post-destroy candidate visual callback
  Temporary test removed after reproduction
```

No production or test source remains changed by this review.

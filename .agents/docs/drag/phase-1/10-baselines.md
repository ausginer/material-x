# Artifact 10 — Reproducible baselines

## 1. Environment

| Field | Value |
| --- | --- |
| Source commit | `1ce3003d2340ea60baa3b8134639d820fd67173b` (`main`) |
| Working tree | clean for `packages/drag/src` and `packages/drag/tests`; untracked docs and `src/experiment/` present but not built into the entry points |
| Package | `packages/drag` (`@ydinjs/drag`) |
| Node | v26.4.0 |
| tsdown | 0.22.7 |
| Vitest | 4.1.10 |
| Bundler for size | Rolldown, via `size-limit` |
| Platform | linux-x64, Linux 7.1.4-202.fc44.x86_64 |
| Date measured | 2026-07-24 |

## 2. Bundle size — the primary gate

Command:

```sh
cd packages/drag && npx just size
```

`just size` depends on `build`, so it always measures freshly built output. Entries come from `.size-limit.json`: `draggable.js`, `sortable.js`, and both together.

| Entry       |       Brotli | Proposal's stated baseline | Match |
| ----------- | -----------: | -------------------------: | :---: |
| `draggable` |  **7.52 kB** |                    7,517 B |   ✓   |
| `sortable`  |  **8.83 kB** |                    8,831 B |   ✓   |
| `combined`  | **14.61 kB** |                   14,609 B |   ✓   |

Supporting figure from the same run: 151 emitted files, 503.09 kB total unminified output, build time 114 ms.

Record raw, minified and Brotli bytes after every coherent vertical implementation. `size-limit` reports Brotli only, so raw/minified must be read from the tsdown output listing in the same run.

## 3. Test baseline

```sh
cd packages/drag && npx just test
```

| Metric      | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Test files  | 20 passed / 20                                         |
| Tests       | 276 passed / 276                                       |
| Type errors | none (`typecheck` runs inside the Vitest config)       |
| Duration    | 6.02 s (transform 1.33 s, import 2.81 s, tests 6.26 s) |

Per-file counts are in [artifact 9](09-test-classification.md).

## 4. Runtime performance — author-owned, measured manually

**Runtime speed is the repo author's responsibility, measured by hand.** There is deliberately no committed benchmark harness and none is planned for this redesign. Automated agents do not gate on performance numbers.

This policy and the observed **7–12 ms** sortable activation range were explicitly approved by the package owner on 2026-07-24.

Current method: a Brave DevTools performance trace of a sortable drag start. Observed across several attempts:

| Attempt          | Drag start |
| ---------------- | ---------: |
| slowest observed |     ~12 ms |
| typical          |      ~9 ms |
| fastest observed |      ~7 ms |

The proposal's "≈ 11 ms, earlier iterations closer to 7 ms" is consistent with this.

**Interpretation.** The spread is roughly ±40 % of the median across runs of identical code. That is larger than any plausible regression the redesign would introduce, so these numbers **cannot serve as a regression gate** — they are a sanity check for gross regressions (a drag start jumping to 50 ms or 200 ms), not a measurement of incremental change.

Consequences for the redesign:

1. Performance is not a Phase 2 exit criterion. The proposal's own framing already supports this: performance is "not currently a release blocker" and reduced runtime work is "a secondary result of simplifying the architecture".
2. The gates that _are_ enforceable and reproducible — bundle size (§2) and the test suite (§3) — carry the measurement burden.
3. If a specific hot path later needs a real number, the right response is a targeted one-off measurement of that path, not a general harness.

Qualitative expectations worth checking by hand after each vertical slice (no thresholds, no pass/fail):

- sortable drag start stays in the same order of magnitude;
- pointer-move handling produces no visible jank at 60 Hz;
- no obvious allocation churn on the hot path in a heap sample.

## 5. <a id="waivers"></a>Allowed regressions and waivers

Only the reproducible metrics are gated. Per §4, runtime timings are not.

| Metric | Allowed regression without a waiver | Gated |
| --- | --- | :-: |
| `combined` Brotli | none — a regression requires an explicit review decision | ✓ |
| `draggable` / `sortable` Brotli individually | +2 % if `combined` improves | ✓ |
| observable contract tests | zero failures, no exceptions | ✓ |
| typecheck | clean | ✓ |
| sortable drag start | order-of-magnitude only, judged by the author | — |
| pointer-move / hot-path allocations | judged by the author | — |

Waiver approver: the package owner (Vladimir Rindevich). A waiver must be recorded in this file with the measured numbers and the reason.

The proposal's own guidance applies: _"no arbitrary byte target overrides correctness and architectural clarity. A negligible size change must be explicitly justified by structural simplification; a material regression requires an explicit review decision."_

## 6. Measurement log

Append one row per coherent vertical implementation.

| Date | Commit | Phase | draggable | sortable | combined | tests | Author perf check | Notes |
| --- | --- | --- | --: | --: | --: | --- | --- | --- |
| 2026-07-24 | `1ce3003d` | baseline | 7.52 kB | 8.83 kB | 14.61 kB | 276/276 | drag start 7–12 ms (Brave trace) | Pre-rewrite. |
| 2026-07-24 | working tree | Phase 2 | 7.55 kB | 8.86 kB | 14.63 kB | 298/298 | not re-measured | New runtime private; see §6.1. |
| 2026-07-24 | working tree | Phase 3 | **6.11 kB** | 8.84 kB | **13.62 kB** | 273/273 | not re-measured | Draggable cut over; old machine/effects deleted. See §6.2. |
| 2026-07-24 | working tree | Phase 4 | 6.11 kB | **7.35 kB** | **11.92 kB** | 281/281 | not re-measured | Sortable cut over; kernel session/runtime deleted. See §6.3. |
| 2026-07-24 | working tree | Phase 5 | 6.12 kB | 7.36 kB | 11.92 kB | 281/281 | not re-measured | Shared lifecycle extracted. Size-neutral; see §6.4. |

### 6.4 Phase 5 — consolidate proven sharing

Phase 5 is explicitly measure-first, and the measurements were mostly negative.
They are recorded here in full, including the extraction that was tried and
partly walked back, because "we measured and it did not pay" is the useful
result.

#### What the duplication actually was

Comparing the two `runtime/actions.ts` files with the feature-specific runtime
type name normalised away:

| | Functions | Lines |
| --- | ---: | ---: |
| Byte-identical | 11 | 232 |
| Analogous but genuinely different | 17 | 789 |

And a stronger signal: **both features had independently converged on the same
eight-phase lifecycle with the same numeric values** — draggable's `DRAGGING`
and sortable's `SORTABLE_ACTIVE` were both `3`, and every other phase matched.
That is a proven shared concept, not a speculative one.

#### What was extracted

`src/kernel/lifecycle.ts` — the phase vocabulary, `OperationIdentity`,
`beginTransition` / `commitTransition`, `preparationValid`,
`isCurrentOperation`, and the consumer-resolution attempt shape
(`ResolutionAttempt`, `createResolutionAttempt`, `isThenable`,
`isExplicitResolution`). Plus `PointerCoordinates` moved to `kernel/pointer.ts`,
and both features' hand-rolled failure reporting replaced with the existing
`reportError_`.

No base class, no registry, no middleware, no generic effect runtime, and no
dispatch indirection. Each feature still owns its frame shape, action table and
every handler.

#### Measurements

| Step | draggable | sortable | combined |
| --- | ---: | ---: | ---: |
| Phase 4 baseline | 6.11 kB | 7.35 kB | 11.92 kB |
| Extract to two kernel modules | 6.12 kB | 7.35 kB | **11.94 kB (+20 B)** |
| Drop the per-feature alias re-exports | 6.12 kB | 7.35 kB | 11.94 kB (+20 B) |
| Merge the two kernel modules into one | 6.12 kB | 7.36 kB | **11.92 kB (±0)** |

Three findings:

1. **Deduplicating source text bought nothing.** Brotli had already collapsed
   the repetition; removing ~120 duplicated source lines moved the compressed
   bundle by less than the module boundaries cost.
2. **Module count, not code volume, was the lever.** Two new kernel modules cost
   +20 B on `combined`; folding them into one recovered all of it.
3. **The net is size-neutral**: `combined` unchanged at 11.92 kB, +10 B on each
   individual entry (+0.16 % / +0.14 %, inside the §5 individual allowance).

#### Decision

**Kept, on correctness grounds rather than size.** It buys one definition of:
the lifecycle both features run; the two-frame commit primitive; and the
`completed`-versus-`settlement` distinction on a resolution attempt — which was
the source of a real defect during the Phase 3 cutover, where a completed
resolver had its own `AbortSignal` aborted because the guard keyed off a payload
that is cleared on consumption.

Because `combined` is flat rather than improved, this is a judgement call and is
recorded as one. It is cleanly reversible: the shared module has no dependents
beyond the two runtimes.

#### Deliberately not shared

The remaining 232 identical lines (`dispatch`, `receivePointer`, `requestCancel`,
`watchReadiness`, `handleLandingSettled`, `handleFinalized`,
`handleErrorReported`, `settleResolution`) all need to dispatch a feature action.
Sharing them requires either a `dispatch` function reference on the runtime
container or a generic runtime parameterised by its action table. Both add an
indirect call to the hot pointer path, and the second is precisely the "generic
effect runtime" the proposal prohibits. Given the measurements above showed no
size upside from deduplication, there is no case for paying a runtime cost to
get it. **Left duplicated, deliberately.**

### 6.3 Phase 4 — sortable cutover

`sortable()` now builds the action-driven runtime. Deleted: `sortable/machine.ts`
+ `machine/` (11 files), `sortable/effects.ts` + `effects/` (10 files),
`sortable/collection.ts` (the snapshot is four lines in the controller), and —
with the last consumer gone — `kernel/session.ts`, `kernel/runtime.ts` and
`kernel/operation-resources.ts`.

| Entry | Baseline | Phase 4 | Delta |
| --- | ---: | ---: | ---: |
| `draggable` | 7.52 kB | 6.11 kB | −1.41 kB, −18.8 % |
| `sortable` | 8.83 kB | **7.35 kB** | **−1.48 kB, −16.8 %** |
| `combined` | 14.61 kB | **11.92 kB** | **−2.69 kB, −18.4 %** |

**The last ledger item is closed.** Sortable went 8.84 → 7.35 kB, so the +10 B
`composeXY` residual from §6.2 is gone: the helper is now live code on the only
path that exists, in both features.

Source files: **90 → 38**. The whole `event → reducer → effect → router → owner
→ result event` protocol is gone from both features; what remains is the pure
domain (geometry, insertion, rect index, collection policy, keyboard, request,
landing, placeholder), the platform kernel, and four runtime files per feature.

Test movement (273 → 281):

| Change | Δ |
| --- | ---: |
| deleted `sortable/machine.node.test.ts` (semantic, replaced) | −7 |
| deleted `sortable/resolution.node.test.ts` (semantic, replaced) | −2 |
| deleted `kernel/session.node.test.ts` (semantic, replaced by the queue) | −9 |
| deleted `kernel/operation-resources.node.test.ts` (module replaced by lifetimes) | −5 |
| deleted `kernel/runtime.node.test.ts` (representation-only, no replacement) | −3 |
| added `kernel/queue.node.test.ts` | +10 |
| added `kernel/lifetimes.node.test.ts` | +11 |
| added `sortable/runtime.browser.test.ts` | +13 |

All 37 tests in `sortable.browser.test.ts` pass **unmodified** apart from two
type-only lint fixes (see below), which is the artifact 9 acceptance gate.

#### Lint gate repaired

`npx just lint` was failing on the committed tree — verified by stashing the
branch and re-running. `just lint` runs oxlint then eslint, and oxlint exited
first on a single `prefer-const`, so **eslint had never run**. Fixing that one
error surfaced 19 pre-existing `strict-void-return` errors in
`kernel/resource-scope.node.test.ts`, `kernel/invalidation.node.test.ts` and
`sortable.browser.test.ts` — all mechanical (untyped `vi.fn()` in void callback
slots, and `order.push(...)` as a concise arrow body). All fixed; the package
now lints clean end to end for the first time.

### 6.1 Phase 2 — private draggable runtime

The action-driven runtime is complete but not reachable from a public entry, so
it is absent from the shipped bundles. It was measured through a temporary
`draggable-next` entry exporting `createDraggableController` plus the same
public option/result types, built and weighed by the normal `just size`
toolchain, then removed.

| Entry | Brotli | Against current `draggable` |
| --- | ---: | ---: |
| `draggable` (current, protocol architecture) | 7.55 kB | — |
| **`draggable-next` (action-driven runtime)** | **6.09 kB** | **−1.46 kB, −19.3 %** |

That is the headline Phase 2 result: the same behavioural contract, minus the
event/effect/owner protocol, is roughly a fifth smaller. It replaces
`machine/{state,event,effect,decide,idle,pending,activating,active,resolving,settling,reporting,finalizing,helpers}.ts`
and `effects/{operation,presentation,motion,resolution,barrier,landing,callbacks}.ts`
with `runtime/{frames,runtime,actions,controller}.ts`.

**Transient regression on the shipped entries: +30 B draggable, +30 B sortable,
+20 B combined.** Attributed by measurement, not inference: stashing only
`kernel/presentation.ts` and `kernel/pointer.ts` and rebuilding returns exactly
7.52 / 8.83 / 14.61 kB. The cost is `VisualLiftSession.composeXY`, a scalar
transform composer added so the hot pointer path composes a transform without
allocating a `Point` per move. Both shipped entries currently pay for it while
only the private runtime uses it.

This clears at the Phase 3 cutover, when the old draggable machine and effect
tree are deleted and `composeXY` becomes live code on the only path that exists.
Per §5 a `combined` regression needs an explicit decision, so it is recorded
here rather than absorbed: **accepted as transient, to be re-checked at
cutover.** If Phase 3 does not recover it, `composeXY` should be reconsidered
against the allocation it saves.

### 6.2 Phase 3 — atomic draggable cutover

`draggable()` now builds the action-driven runtime. Deleted:
`draggable/machine.ts`, `draggable/machine/` (13 files), `draggable/effects.ts`,
`draggable/effects/` (7 files), and the now-orphaned `draggable/admission.ts`.

| Entry | Baseline | Phase 3 | Delta |
| --- | ---: | ---: | ---: |
| `draggable` | 7.52 kB | **6.11 kB** | **−1.41 kB, −18.8 %** |
| `sortable` | 8.83 kB | 8.84 kB | +10 B |
| `combined` | 14.61 kB | **13.62 kB** | **−0.99 kB, −6.8 %** |

**The §6.1 regression is resolved.** Combined is now 990 B *below* the original
baseline. The residual +10 B on `sortable` is the same `composeXY` cost: sortable
still runs the old machine and pays for the helper without using it. It should
disappear at the Phase 4 sortable cutover, and is the last open item on that
ledger entry.

Test movement, reconciled exactly (276 → 273):

| Change | Δ |
| --- | ---: |
| deleted `draggable/machine.node.test.ts` (semantic, replaced) | −23 |
| deleted `draggable/effects.node.test.ts` (semantic, replaced) | −3 |
| removed `clampDelta` / `constrainAxis` cases from `bounds.node.test.ts` | −12 |
| added `draggable/motion.node.test.ts` | +13 |
| added `draggable/runtime.browser.test.ts` | +22 |

All 51 tests in `draggable.browser.test.ts` pass **unmodified**, which is the
artifact 9 acceptance gate for this phase.

#### Coverage correction made during the cutover

`clampDelta` and `constrainAxis` had 12 unit tests but **no** browser coverage of
the resulting values, and the new runtime clamped inline rather than calling
them — so the shipped clamping was effectively untested while the tests
exercised code nothing ran. The math now lives in exactly one place,
`applyMotionDelta` (scalar, allocation-free, mutates the draft), and
`draggable/motion.node.test.ts` covers it directly with the cases ported over
plus two new ones (no origin rect; axis constrained before clamping).
`bounds.ts` keeps only `resolveBounds`.
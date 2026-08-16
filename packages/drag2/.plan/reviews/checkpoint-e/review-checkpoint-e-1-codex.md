# Checkpoint E — independent cross-behavior review 1

**Reviewer:** Codex  
**Date:** 2026-08-16  
**Subject:** the Phase 20 sortable and free-drag implementations, current contracts, and executable matrices

## Verdict

Checkpoint E is **not closed**. The kernel remains behavior-agnostic in its frame, settlement, and packaging structure, and several apparent asymmetries are correct domain choices. The completed artifact nevertheless has six concrete blockers that should be resolved before Phase 21 establishes performance and size baselines:

| Finding | Disposition |
| --- | --- |
| E-01 — F-72 repeats the activation geometry traversal after lift mutation | Change the kernel SPI before Phase 21; carry a behavior-safe inherited-delta projection from the existing lift measurement. Do not expose the raw box buffer. |
| E-02 — both activation effects can call `onStart` after a contributed capability destroys the controller | Add behavior-side terminal revalidation at the actual call sites and permanent discriminating tests for both behaviors. |
| E-03 — the common admission report path can call `onError` after `destroy()` | Guard the kernel-owned calls to `reportFailure` after the failing consumer call, including the quality path. |
| E-04 — free-drag actions are accepted in terminal/landing phases | Define free-drag action phase legality and make late `moveTo`/`invalidate` deterministic no-ops; do not globally restrict sortable actions. |
| E-05 — invalid `home` results escape the landing-target quality seam | Validate and copy the free-drag point inside `anchorTarget`; keep the validation behavior-owned. |
| E-06 — the two behavior-specific installer types are mutually assignable | Make cross-behavior installation unsupported and non-assignable, with negative declaration tests. Do not unify the full contribution types. |

F-65 does **not** justify a kernel change before measurement. The unconditional offset-box read is presently extra work for free drag, but it is not a correctness defect and removing it would add a capability/optional-state branch whose value Phase 21 has not measured.

## Blocking findings

### E-01 — major: F-72 is a split activation snapshot, not only duplicate work

The kernel already performs one box-quad traversal in `acquireLift()` before it mutates the visual (`src/kernel/presentation.ts:469-486`). That measurement contains the inherited linear coefficients free drag needs. The kernel then exposes `visual`, `originRect`, `box`, `boxPre`, and the narrowed lift session through `ActivationScope`, but not those coefficients or their inverse (`src/kernel/spec.ts:164-199`).

Free drag consequently calls `captureLocalSpace(visual)` from `activation.effect` (`src/free-drag/spec.ts:265-277`). That function allocates another box buffer, performs a second `coordinates()` traversal, reads the inherited coefficients, and inverts them (`src/free-drag/geometry.ts:21-31,72-99`). This occurs **after** `acquireLift()` has changed positioning, dimensions, top-layer state, and/or transforms. It is therefore not the same logical snapshot.

The dependency's own contract makes the falsifier explicit: the inherited coefficients are returned by the same walk because a second traversal can observe a different layout and disagree (`packages/box-quad/src/index.ts:19-30,138-145`). The two reads also disagree on failure: `acquireLift()` rejects an unreadable space as `FAILURE_ACTIVATION`, while `captureLocalSpace()` silently substitutes identity for unreadable, singular, or non-finite geometry. A single activation can therefore lift according to one coordinate snapshot and report consumer deltas according to another.

**Disposition:** change the kernel SPI before Phase 21. Carry the minimal read-only inherited-delta projection produced from the existing lift measurement, most naturally through `BehaviorLiftSession` already present in `ActivationScope`. The behavior needs only a safe viewport-delta-to-local-delta projection (or the four coefficients needed to derive it); it does not need the raw `Box`, rendered state, or disposal authority. Delete the second traversal when this lands and pin transformed/zoomed activation against a mutation-sensitive fixture. Measuring the current double traversal would baseline a correctness defect.

### E-02 — major: the claimed activation terminal barriers do not exist at the final consumer boundary

The free-drag terminal table says the `onStart` latch is read immediately before the call (`.plan/contract/07-free-drag-contract.md:410-420`). The implementation checks only after the optional axis source (`src/free-drag/spec.ts:299-310`). It then calls `deriveMotion()`, whose optional `constrain.apply` is a third-party capability call (`:125-141`), writes the lift, advances the progress marker, builds geometry, and calls `onStart` (`:317-347`) without another liveness read.

A temporary public Chromium probe installed `bounds(() => { destroy(); return rect; })`. The contract expectation was zero starts after logical closure; the implementation invoked `onStart` once.

Sortable has the same lifecycle defect through a different capability. Activation publishes runtime state and calls `invalidateInSeam()` (`src/sortable/spec.ts:830-857`). The helper calls third-party `invalidateInsertion()` and returns `true` without checking `host.closed` (`:421-429`); activation then marks the operation started and invokes `onStart` (`:859-867`). A temporary `AxisInstaller` whose insertion invalidator destroyed the controller likewise produced one `onStart` where zero was expected.

This is shared lifecycle policy but not missing kernel machinery: the kernel sees one opaque `activation.effect` and cannot place a barrier between two calls inside it. Both behaviors already have `host.closed`.

**Disposition:** put a behavior-owned liveness read after the last contributed/consumer-reachable activation call and before the first subsequent write, publication, progress change, or `onStart`. Add both discriminating regressions. Do not add a new liveness SPI or extract the two activation effects merely because the fixes have the same shape.

### E-03 — major: `reportFailure` can publish after logical closure in both behaviors

`runAdmission()` catches a throwing `admit` and unconditionally invokes `active.reportFailure()` (`src/kernel/kernel.ts:815-830`). If the resolver calls `destroy()` and then throws, the catch runs after the controller is logically closed. Both behavior implementations call their declared `onError` slot without a liveness check (`src/sortable/spec.ts:1690-1692`; `src/free-drag/spec.ts:781-783`).

A temporary public free-drag Chromium probe used a `handle` resolver that destroyed its controller and then threw. The contract expectation was no declared callback after `destroy()`; `onError` received one `DraggableError { code: 'consumer' }`.

The quality route has the same ordering risk: `reportQuality` unconditionally delegates to `spec.reportFailure` (`src/kernel/kernel.ts:724-738`), while its consumer-reaching producer is allowed to destroy before throwing. The later `settlementLive()` check in `armSettlement()` occurs only after that report.

**Disposition:** guard the two kernel-owned `reportFailure` routes after the consumer call has returned/thrown and before invoking behavior code. Pin admission and landing-target destroy-then-throw cases. This belongs in the kernel because both behaviors use the same call sites and the rule is controller lifetime, not domain settlement.

### E-04 — major: free-drag action legality permits writes after the landing handoff and presentation release

`FreeDragController.invalidate()` and `moveTo()` reject only a closed controller (`src/free-drag/controller.ts:58-80`). The kernel routes every behavior tag without phase filtering (`src/kernel/kernel.ts:2216-2240`), and free drag's action transition has no phase check (`src/free-drag/spec.ts:396-465`). `TAG_POSITION` therefore remains capable of calling `rt.lift.write()` in `RELEASING`, `SETTLING`, and `FINALIZING`, despite `RELEASING` being the point at which input is closed and geometry is final (`src/kernel/phases.ts:21-28`). `BehaviorLiftSession` explicitly states that writes after the landing origin is sampled or after retirement are outside contract (`src/kernel/presentation.ts:345-352`).

The success join exposes a concrete leak. It disposes presentation, invokes `finalized`/`onEnd`, and only then enqueues `RETIRE` (`src/kernel/kernel.ts:1626-1659`). A reentrant `moveTo()` from `onEnd` is FIFO-ahead of `RETIRE` and writes through the already-disposed lift. A temporary public Chromium probe expected the final inline transform to be empty; it received:

```text
translate(80px, 30px) matrix(1, 0, 0, 1, 0, 0)
```

This also creates a success/failure divergence: the failure terminal path retires inline after `finalized`, so its equivalent queued action is discarded. Calls from `onDrop` can instead alter geometry after release has fixed the request and landing origin, and calls during settlement can contend with the landing runner.

**Disposition:** define phase legality separately for `TAG_POSITION` and `TAG_POLICY`, allowing only the phases in which free drag still owns writable behavior geometry (including intentional activation reentry if retained), and make all later phases no-ops. Add regressions from `onDrop`, a landing runner, and `onEnd`, including final inline-style restoration. Do not solve this by globally changing kernel `RETIRE` ordering or rejecting all late behavior actions: sortable intentionally accepts collection invalidations in phases where free-drag geometry must be frozen.

### E-05 — major: the free-drag `home` result leaves its attributed seam unvalidated

The contract promises that a throwing or non-finite `home` result is a `FAILURE_LANDING_TARGET` quality fault (`.plan/contract/07-free-drag-contract.md:176,384`). Current `anchorTarget` returns the consumer object verbatim (`src/free-drag/spec.ts:710-752`). The kernel's quality wrapper covers the call only (`src/kernel/kernel.ts:1426-1429`); it reads `anchor.x` and `anchor.y` later, outside the wrapper (`:1458-1465`).

Consequences depend on the returned shape and composition:

- `null`, missing fields, or throwing accessors panic outside the quality seam;
- non-finite values can reach target composition or a renderer;
- with landing installed, malformed data can be re-attributed as `FAILURE_LANDING_CREATE`.

The Phase 20 matrix tests only a `home` function that throws before returning (`tests/free-drag/validation.browser.test.ts:179-200`). A temporary public probe returning `null` expected one attributed `onError` and received none.

**Disposition:** inside free drag's `anchorTarget`, read `x` and `y`, require finite numbers, and return a copied plain point. Throw there so the existing quality wrapper owns the fault. Do not put generic point validation in the kernel: sortable produces its anchor from behavior-owned DOM geometry, whereas free drag uniquely crosses a consumer-result boundary here.

### E-06 — moderate: behavior-specific installer tiers are structurally interchangeable and silently lossy

The contracts and source present `SortableInstaller` and `FreeDragInstaller` as behavior-specific aliases because their contribution records differ (`src/shared/composition.ts:18-20`; `src/sortable/feature.ts:124-139,172-174`; `src/free-drag/feature.ts:104-115`). TypeScript currently treats them as mutually assignable. A strict temporary declaration probe compiled all of these with exit code 0:

```ts
const freeFromAxis: FreeDragInstaller = axisInstaller;
const freeFromSortable: FreeDragInstaller = sortableInstaller;
const sortableFromFree: SortableInstaller = freeDragInstaller;
```

`AxisInstaller -> FreeDragInstaller` is the strongest falsifier: even the required sortable `insertion` contribution does not protect the boundary. Supplying `y()` or `xy()` in free drag's public `plugins` slot compiles, then the free assembler reads only `constrain`, `startLanding`, and `retire`; `insertion` is silently discarded (`src/free-drag/assemble.ts:88-117`). The reverse direction can likewise erase free-drag-only capability data. This is a silent no-op at a supported middle-tier API, not harmless structural convenience.

**Disposition:** declare cross-behavior installers unsupported and make the aliases non-assignable, with negative declaration tests for both directions and specifically `AxisInstaller -> FreeDragInstaller`. Preserve the shared `FeatureContext` identity and the shared landing runner/options. Do not unify the complete contribution types. If cross-behavior installers are ever intended, introduce an explicit common contribution contract and explicit handling/rejection of unsupported slots rather than relying on excess-property erasure.

## Non-blocking evidence corrections

### E-07 — the accepted-Infinity matrix claim is impossible for free drag

The test named “should refuse Infinity and let the accepted drop survive it” actually returns and asserts a rejected result (`tests/free-drag/validation.browser.test.ts:404-423`), matching the executed path but contradicting its title and B-4(d) (`.plan/contract/07-free-drag-contract.md:484`). Free drag intentionally does not arm landing for an accepted result (`src/free-drag/spec.ts:676-690`), so an accepted drop never evaluates the duration and cannot exercise landing creation failure.

**Disposition:** retain the semantic asymmetry. Rename/restate the row as preservation of a committed **rejected** verdict. If accepted post-commit preservation needs its own executable proof, use an accepted-path failure that is reachable, such as the authoritative pin write; do not force accepted free drag through a zero-distance landing for test symmetry.

### E-08 — two coverage/prose gaps should be repaired with the blockers

- B-3 says documentation closure runs per entry, but `tests/docs.node.test.ts` has isolated runs only for the kernel and sortable ordinary tier (`:113-184`); free drag currently relies on the whole-entry run (`:94-111`), which can hide cross-tier resolution. An isolated `free-drag.ts + drag.ts + free-drag/feature.ts` TypeDoc probe passes today, so this is missing discrimination rather than a current export leak. Add the isolated run.
- The generic action failure stages are correctly derived from the seam where a throw occurs. The Phase 20 bounds rows prove activation, moved, action-effect, and release attribution separately (`tests/free-drag/validation.browser.test.ts:260-329`), and sortable's later collection pull similarly belongs to action-prepare. Keep the closed 13-stage vocabulary; do not add behavior-selected stages. Narrow the comment in `src/kernel/errors.ts:75-77`, which says the mapping is fault attribution rather than pipeline position more strongly than the actual call sites support.

## Measurement and generalization dispositions

### F-65 — retain until Phase 21 measurement

The kernel unconditionally reads `box.offsetWidth` and `box.offsetHeight` before lift (`src/kernel/kernel.ts:1097-1118`) and requires `boxPre` in `ActivationScope`. Sortable consumes both windows for placeholder footprint (`src/sortable/spec.ts:632-650`); free drag returns a bare visual and consumes neither `box` nor `boxPre`.

This is proven extra work for free drag but not proven harmful work. Removing it requires some form of behavior capability flag, optional staged state, or a new pre-lift hook, each adding control flow and surface area to activation. No correctness or lifecycle claim depends on removal.

**Disposition:** leave F-65 unchanged for the Phase 21 workload, measure the two offset reads and any candidate branch under both behaviors, then decide. Do not “balance” F-65 with F-72: F-72 is a split-snapshot defect and must be fixed first; F-65 is an optimization question.

### Frame and per-sample work — measure, do not normalize

The frame-part model holds with two distinct shapes: sortable owns eight behavior fields (`src/sortable/frames.ts:20-29`), free drag five (`src/free-drag/frames.ts:24-44`). The common kernel commits samples by reusing the draft/current frames and a two-array FIFO (`src/kernel/kernel.ts:1828-1846`; `src/kernel/queue.ts:42-49`). Both shapes must be measured against M-1's 12-to-16-field cliff; neither number can be inferred from the other.

The hot-path divergence is intentional:

- sortable writes immediately, increments a sequence, and coalesces spatial work to animation frames (`src/sortable/spec.ts:875-892`);
- free drag derives/clamps/writes immediately and invokes `onMove` after the write; geometry allocation is inside the nullable callback branch, so a no-`onMove` composition builds no geometry object per sample (`src/free-drag/spec.ts:350-389`);
- `bounds()` adds one indirect call and scalar clamp work only when installed, and its constraint mutates the reusable motion draft (`src/free-drag/bounds.ts:91-121`).

**Disposition:** keep these schedules separate. Phase 21 M-1/M-2 should measure both part shapes, free drag with and without bounds, and free drag with and without `onMove`.

### Shared machinery and M-3 — keep the proven sharing, add a combined fixture

The shared landing runner and `LandingOptions` are genuinely one implementation/declaration (`src/shared/landing-runner.ts`; thin wrappers at `src/sortable/landing.ts:14-31` and `src/free-drag/landing.ts:17-34`). Packaging tests prove behavior graphs are isolated in both directions and both landing entries reach the shared runner (`tests/packaging.node.test.ts:117-177`). `FeatureContext` is also correctly one shared declaration. No other assembler or domain mapper should be generalized for visual symmetry.

The current M-3 harness remains sortable-only (`bench/size/measure.ts:126-199`). Separate future free-drag bundles can establish tree-shaking, but cannot reveal whether importing both behaviors amortizes the runner/context or duplicates claim, merge, and wrapper machinery.

**Disposition:** retain per-behavior minimal/feature compositions and add one feature-matched bundle importing both behaviors. Use it to decide any further F-64 sharing; do not extract common assemblers before that measurement.

## Cross-behavior claims that remain validated

- **Kernel behavior neutrality:** kernel runtime and SPI do not read a collection, placeholder, insertion, sortable frame field, or free-drag frame field. Behavior-specific words remain in explanatory comments, not runtime dependencies. `draggable()` infers controller, frame part, and activation staging from a plain `BehaviorFactory` (`src/kernel.ts:227-245`; `src/kernel/spec.ts:408-416,538-553`).
- **Common lifecycle ownership:** the kernel closes motion before release, closes cancellation before settlement effect, records the rendered landing origin, measures the target once, and owns relinquish → pin → release → terminal ordering. Both behaviors use the same private MINTED/STARTED/RESOLVING progression and the same “existing result wins, otherwise canceled” fallback, without sharing domain result shapes.
- **Landing semantics:** sortable accepted landing travels to the authored collection destination; accepted free drag is already at its destination and joins immediately. Rejected/canceled free drag may travel home. This difference is semantic and should remain.
- **Failure vocabulary:** the renamed action and resolution stages are behavior-generic seam names with stable numeric values. Path-dependent coarse codes are a consequence of the actual call site, not accidental cross-behavior divergence.
- **Composition/public tiers:** ordinary, kernel, and middle-tier entries remain graph-isolated as intended; the defect is specifically the structural assignability inside the supported middle-tier plugin slots, not an import-graph leak.

## Verification evidence

The unchanged package gates established the baseline:

```text
npx just typecheck
  PASS

npx just test
  44 files passed
  950 tests passed
  25 skipped
```

Temporary falsification probes were removed after execution:

```text
activation terminal probes (Chromium)
  free drag: expected onStart 0, received 1
  sortable:  expected onStart 0, received 1

free-drag late action probe (Chromium)
  expected final transform ""
  received "translate(80px, 30px) matrix(1, 0, 0, 1, 0, 0)"

free-drag invalid-home probe (Chromium)
  expected attributed onError count 1, received 0

free-drag admission close-then-throw probe (Chromium)
  expected onError count 0, received 1 DraggableError("consumer")

strict installer assignability probe
  AxisInstaller -> FreeDragInstaller: PASS (unexpected)
  SortableInstaller <-> FreeDragInstaller: PASS both ways (unexpected)
```

No implementation, contract, or permanent test source was modified by this review. Phase 21 should start only after E-01 through E-06 are resolved and pinned; E-07/E-08 should be corrected in the same closure pass so the executable matrix and its prose describe the paths they actually run.
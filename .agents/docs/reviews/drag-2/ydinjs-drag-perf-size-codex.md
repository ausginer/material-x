# `@ydinjs/drag` performance and size review

Scope: `packages/drag`, with the implementation reviewed against `packages/drag/DESIGN.md`.

The review is based on direct source inspection, generated bundle inspection, source-map attribution, `npm run size`, and `npm pack --dry-run --json`. Runtime ratings are architectural and workload-based; they are not the result of a browser microbenchmark.

## Executive summary

| Area | Rating | Summary |
| --- | --: | --- |
| Draggable performance | 6.5/10 | Sound lifecycle architecture, but motion is calculated twice and visual writes are not frame-coalesced. |
| Sortable performance | 4.5/10 | Hit testing is scheduled with rAF, but each frame still performs full-collection layout reads and transient allocation. |
| Runtime bundle size | 7.5/10 | Both entrypoints pass their budgets, but each has less than 0.5 kB of headroom. |
| Published package efficiency | 4/10 | Source maps dominate the published contents, while the root source-map references are not published consistently. |

The package has a careful lifecycle and resource model. Assignment-before-effects, operation currencies, scoped cleanup, abort handling, and explicit settlement are all strong. The primary performance problems are localized rather than reasons to replace the architecture.

The most important improvements are:

1. Calculate draggable motion once per event.
2. Implement the `RectIndex` already specified by `DESIGN.md`.
3. Suppress unchanged sortable insertion transitions and DOM writes.
4. Coalesce transform and bounds work to animation frames where semantics permit.
5. Replace private `Symbol` discriminants with compact primitive tags.
6. Choose a consistent source-map publication policy.

## Size baseline

Running `cd packages/drag && npm run size` produced:

| Entry       | Brotli size |  Limit | Remaining headroom |
| ----------- | ----------: | -----: | -----------------: |
| `draggable` |     7.88 kB | 8.3 kB |     0.42 kB / 5.1% |
| `sortable`  |     8.97 kB | 9.4 kB |     0.43 kB / 4.6% |

The corresponding minified bundles before compression are approximately 32.2 kB and 37.4 kB. Source-map attribution shows that reducer and gesture code accounts for roughly 40% of each minified entrypoint. These are the meaningful areas to optimize; small leaf modules and public helper objects are not.

## What is already strong

- `createSession` assigns the new state before routing effects, preserving correct behavior under synchronous re-entrant dispatch (`kernel/session.ts:50-64`).
- Referential no-op transitions retain the previous root state, allowing the session to skip effect routing.
- Operation, resolution, spatial, and landing identity protect asynchronous work from stale completion.
- Gesture resources have explicit interaction and presentation lifetimes and are disposed in a controlled order.
- Active movement uses transform writes rather than layout-position writes (`kernel/presentation.ts:306-310`).
- Expensive transform-chain capture is activation-scoped rather than normally repeated during pointer movement.
- Sortable spatial resolution is already rAF-coalesced, even though the work performed inside the frame still needs improvement.

These properties should be preserved while optimizing. In particular, the root state should not be mutated in place to avoid allocations: doing so could break re-entrant transition correctness.

## Performance findings

### P1: draggable motion is calculated twice per event

`createDraggableReducer` invokes `reduceMotionSlice` once to derive `nextDelta` and then invokes it again to derive `motion` (`draggable/reducer.ts:1009-1018`).

For an active move, both calls execute `pointerDelta` and create their own point and motion records (`draggable/reducer.ts:698-715`, `draggable/motion.ts:19-31`). Bounds arithmetic is duplicated as well.

Compute `motion` once, then derive `nextDelta` from that result:

```ts
const motion = reduceMotionSlice(from, event, phase);
const nextDelta = motion?.viewportDelta ?? from.motion?.viewportDelta ?? ORIGIN;
```

This is the highest-confidence, lowest-risk hot-path improvement.

### P1: sortable rebuilds all geometry every rendered frame

The design calls for a `RectIndex` and cached spatial resolution (`DESIGN.md:965-983`), but the implementation currently performs the following work for every scheduled resolution:

- creates a new `Map`;
- calls `getBoundingClientRect()` on every item except the dragged item (`sortable/geometry.ts:22-35`);
- loops over the collection again;
- allocates a center `Point` for every candidate (`sortable/geometry.ts:43-70`);
- filters a new destination array and scans it with `indexOf` (`sortable/insertion.ts:40-65`).

This is O(n) layout reads plus several O(n) passes and O(n) transient allocation per frame. A 100-item collection at 60 fps can approach 6,000 rectangle reads per second while the pointer is moving. This is likely the package's dominant scalability problem.

Implement the designed dirty rectangle index. It should retain scalar centers or rectangles keyed to the current collection version and be invalidated by:

- collection replacement;
- scroll and resize;
- relevant item resizing;
- committed placeholder movement;
- any change that can alter `getVisual(item)` geometry.

The release path must still flush or remeasure against the actual release point, as required by `DESIGN.md:981-983`. A stale cache would be a correctness regression, so the invalidation contract is as important as the cache itself.

Before implementing the full cache, `measure`, `nearestItem`, `filter`, and `indexOf` can be fused into one scalar loop. That removes the `Map`, center-point records, destination array, and repeated scans without changing cache semantics.

### P1: unchanged sortable insertions still transition and touch the DOM

`SortableGesture.#resolveInsertion` dispatches whenever a nearest candidate produces an insertion (`sortable/gesture.ts:396-402`). The reducer then always allocates a new ready insertion slice (`sortable/reducer.ts:952-958`). The gesture observes the new slice and can call `placeholder.placeBefore` again (`sortable/gesture.ts:354-364`).

Compare the resolved `version`, `index`, `before`, and `after` with the incumbent insertion before dispatch. This avoids a second reducer traversal, root-state allocation, effect routing, and a potentially redundant DOM insertion.

### P2: transform writes are not frame-coalesced

Free drag renders synchronously for every committed movement (`draggable/gesture.ts:214-221`). Sortable coalesces hit testing but still writes the transform for every pointer event (`sortable/gesture.ts:354-371`). High-rate mouse and stylus input can therefore produce multiple style writes per paint.

Keep semantic pointer state authoritative, but schedule only the latest visual delta for the next animation frame. Pending visual work must be flushed on release and before settlement transfers transform ownership to the landing runner. If public `onMove` semantics require every pointer sample, callback delivery can remain separate from visual rendering.

### P2: draggable resolves bounds too early and too often

The facade resolves bounds while constructing every move and release event (`draggable.ts:238-256`). Element bounds call `getBoundingClientRect()` (`draggable/bounds.ts:26-30`), and callback bounds may perform arbitrary work.

This happens before the reducer rejects foreign pointer identifiers, and while a gesture is still below its activation threshold even though active motion cannot use the value.

At minimum, check current pointer ownership and phase before resolving bounds. Bounds work can then be frame-coalesced with rendering. Caching requires care: callback bounds are intentionally live, and element geometry can change without a window resize. A cache needs an explicit invalidation contract rather than an activation-only snapshot.

### P2: sub-threshold movement still allocates and commits state

Both reducers replace `pointer.latest` for every owned move (`draggable/reducer.ts:743-747`, `sortable/reducer.ts:841-844`). While pending, threshold classification already uses the incoming event point directly, so a below-threshold move does not need to update authoritative pointer history.

Passing the lifecycle classification into the pointer projection, or adding a pending fast path, can return `from` until activation is crossed. This avoids a new pointer slice, root state, transition callback, and gesture traversal for ordinary clicks and small pointer motion.

### P2: avoidable per-move sortable allocations

`sortableDelta()` returns a new `Point` and is called through `#render` and again for `#lastDelta` during the same move (`sortable/gesture.ts:350-371`). Compute it once and reuse the same value.

`FrameTask.schedule()` stores every latest value in a new `{ value }` wrapper (`kernel/invalidation.ts:57-75`), even when an animation frame is already queued. A direct value slot plus a pending boolean eliminates one allocation per pointer event.

### P3: coordinate mapping uses native object allocation in warm paths

`CoordinateMapper` captures matrices only once, which is good, but mapping calls still construct a `DOMPoint` and then a plain `Point` (`kernel/coordinate.ts:167-181`). `deltaFromViewport` can run during every free drag `onMove`, and during every in-place render.

Capture the required matrix coefficients and calculate the result directly:

```ts
const x = a * point.x + c * point.y + e;
const y = b * point.x + d * point.y + f;
```

Delta conversion uses the inverse linear coefficients without translation. This removes native `DOMPoint` construction and `transformPoint` dispatch from warm paths. It is lower priority than eliminating layout reads.

### P3: pointer adaptation creates multiple records per browser event

Both facades create a `Point` and then an internal event object for every browser pointer event (`draggable.ts:238-248`, `sortable.ts:210-218`). Flattening `x` and `y` into internal events or classifying directly from the native event could remove one record, but the gain is modest compared with the geometry and render work. Preserve cross-realm behavior and immutable reducer input if pursuing this.

## Architecture alignment

The implementation broadly follows the target dependency and lifetime model, but sortable spatial state is the main gap.

`DESIGN.md:1026-1033` and `DESIGN.md:1050-1069` place semantic operation and pointer ownership in the root reducer. `SortableGesture` additionally retains `#originRect`, `#lastPoint`, `#lastDelta`, and `#currentOperation` (`sortable/gesture.ts:140-142`, `sortable/gesture.ts:293-296`, `sortable/gesture.ts:375-409`). The implementation also lacks the designed resolving insertion slice and spatial currency.

This makes stale spatial work and cache currency implicit. When implementing the rectangle index, spatial work should be driven by a tagged, committed request. Mechanical cached geometry may remain outside the semantic reducer, but its ownership and invalidation rules should be explicit.

Cold-path cleanup should not be optimized at the expense of safety. For example, `ResourceScope` drains its disposer collection before invoking re-entrant cleanup callbacks. Its occasional allocation is intentional and insignificant relative to active pointer work.

## Runtime bundle-size findings

### S1: private `Symbol` discriminants are the strongest size target

The built bundles contain 67 `Symbol(...)` constructions in `draggable` and 81 in `sortable`. They are concentrated in:

- `kernel/protocol.ts:27-61,189-193,239-267,289-312,344-404`;
- `draggable/reducer.ts:87-109`;
- `sortable/reducer.ts:87-156`.

Build-only experiments, without repository changes, measured:

| Experiment | Draggable | Sortable | Tradeoff |
| --- | --: | --: | --- |
| Remove all symbol descriptions | -300 B Brotli / -3.8% | -346 B / -3.9% | Preserves identity and equality, but loses `symbol.description` and debugging labels. |
| Replace all discriminants with compact primitive tags | -496 B / -6.3% | -583 B / -6.5% | Changes runtime representation and potentially public API values. |

Use compact numeric constants first for private FSM phases, events, stages, and recovery tags. They can be inlined and cannot collide with the string-valued native browser event names. Public outcomes and cancellation values should only change through an explicit API decision because `FreeDropResolution`, `ReorderResolution`, and result helpers expose them.

If public representation is still intentionally provisional, compact string result tags are worth considering: they are serializable and easier for consumers to inspect than symbols. This needs API tests and a fresh size measurement.

### S2: reducer and gesture code dominates both bundles

Approximate generated, unminified module sizes are:

| Module            | Generated size |
| ----------------- | -------------: |
| Draggable reducer |        15.8 kB |
| Draggable gesture |        13.1 kB |
| Sortable reducer  |        18.2 kB |
| Sortable gesture  |        14.6 kB |

The explicit lifecycle taxonomy explains much of this size. Shared settlement and resolution behavior contains visible duplication, but extracting a generic abstraction is not automatically a win: the two public entrypoints are budgeted independently, and extra indirection may make each one larger or slower. Any extraction should be accepted only after measuring both independent size checks.

Some reductions can improve performance and size simultaneously:

- calculate motion once;
- suppress unchanged insertion events;
- fuse spatial loops;
- replace private symbol tags;
- perform coordinate mapping with scalar coefficients.

These should be preferred over removing defensive lifecycle behavior.

### S3: public helper splitting has negligible value

Named-only bundle experiments show that public resolution/result helper objects cost approximately 81 bytes in `draggable` and 97 bytes in `sortable` after Brotli compression. Splitting `FreeDropResolution`, `FreeDropResult`, `ReorderResolution`, or `SortableResult` would add API and packaging complexity for less than 0.1 kB per entry.

Similarly, moving keyboard support behind an optional sortable entrypoint might save a few hundred bytes but would weaken baseline accessibility. It is not a good default tradeoff.

Adding `"sideEffects": false` may help conservative consumer bundlers, once all top-level modules have been verified, but it will not reduce the current Vite size checks.

## Published-package size

`npm pack --dry-run --json` reports:

| Metric               |              Value |
| -------------------- | -----------------: |
| Tarball size         |           98,921 B |
| Unpacked size        |          416,504 B |
| Published files      |                 83 |
| Internal source maps | 266,534 B unpacked |

Internal source maps account for approximately 64% of the unpacked package. They are enabled by `sourcemap: true` (`tsdown.config.ts:16`) and are published because `package.json` includes the complete `draggable`, `sortable`, and `kernel` directories (`package.json:5-13`).

The root `draggable.js` and `sortable.js` files contain `sourceMappingURL` references, but their root `.map` files are not matched by the package's `files` list. Internal maps are therefore published while the most visible root map references are broken for consumers.

Choose one release policy:

1. Omit source maps from the npm artifact. This provides the smallest transfer and install footprint, at the cost of consumer source debugging.
2. Publish maps consistently, including root entry maps. This repairs debugging but retains the larger artifact.
3. Publish a deliberately reduced or hidden-map configuration if debugging value is required without exposing every internal map.

The current inconsistent middle state has the cost of maps without complete debugging coverage.

## Recommended implementation order

### Phase 1: low-risk hot-path fixes

1. Calculate draggable motion once.
2. Skip unchanged sortable insertion dispatches.
3. Calculate sortable delta once per event.
4. Remove the `FrameTask` wrapper allocation.
5. Gate draggable bounds resolution by pointer ownership and phase.

These are small, measurable changes that should not alter public behavior.

### Phase 2: sortable spatial architecture

1. Fuse the current measurement and nearest-item scans.
2. Add the versioned dirty `RectIndex` described by `DESIGN.md`.
3. Define invalidation for collection, scrolling, resizing, visual changes, and placeholder commits.
4. Preserve a true-release-point flush and add large-collection browser tests or benchmarks.

### Phase 3: rendering and coordinate work

1. Coalesce transform writes per animation frame and flush on release.
2. Decide whether `onMove` remains per sample or follows visual frames.
3. Replace `DOMPoint.transformPoint` in warm delta mapping with scalar arithmetic.
4. Consider pending-operation no-op fast paths.

### Phase 4: size policy

1. Convert private symbol discriminants and re-run both size checks.
2. Decide whether public symbols remain part of the pre-alpha API.
3. Choose and enforce one source-map publication policy.
4. Add `sideEffects: false` only after verifying every published module.

## Final assessment

The package is not inefficient because it has too many modules or because its lifecycle model is too explicit. Its largest runtime problems come from doing the same pure calculation twice and rebuilding mutable browser geometry too often. Its largest avoidable bundle cost is runtime discriminator representation, while its largest package-transfer cost is source-map publication.

Preserving the state machine, currencies, and resource scopes while tightening the movement and spatial paths should produce a materially faster sortable implementation and recover enough size headroom for future behavior without weakening correctness.
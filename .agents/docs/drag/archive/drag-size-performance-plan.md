# `@ydinjs/drag`: Size and Performance Optimization Plan

## 1. Baseline

Current Brotli sizes:

| Entry point |     Size |
| ----------- | -------: |
| `draggable` |  7.88 kB |
| `sortable`  |  8.97 kB |
| combined    | 15.52 kB |

Reducer and gesture code account for roughly 40% of each minified entry point. This is where most of the size reduction potential lies. Splitting small public helpers or leaf modules is unlikely to have a meaningful effect.

The shared kernel is already small. Based on the difference between the sum of individual entry points and the combined build, the shared runtime is approximately 1.33 kB Brotli.

The existing lifecycle architecture must remain intact:

- committed state is assigned before effects run;
- referential no-ops do not route effects;
- immutable committed state remains the source of truth;
- operation, resolution, spatial, and landing currencies reject stale asynchronous work;
- interaction and presentation resources have explicit lifetimes;
- release, settlement, recovery, and cleanup preserve their current guarantees.

The optimization target is the physical runtime representation and the hot paths, not the lifecycle model itself.

---

## 2. Targets

### Bundle size

Provisional first-pass estimates:

| Entry point |  Working estimate |
| ----------- | ----------------: |
| `draggable` |   6–6.5 kB Brotli |
| `sortable`  |   7–7.5 kB Brotli |
| combined    | 11.5–12 kB Brotli |

These values are planning estimates, not CI budgets or promised outcomes. Actual budgets should be set only after Phase 0 attributes bytes to concrete modules and Track A establishes a measured floor.

A later aspirational stretch target is approximately 3–4 kB per entry point. The current plan does not yet claim a complete path to that result.

### Runtime performance

For sortable:

- perform at most one spatial calculation per animation frame;
- avoid transient O(n) allocations per frame;
- avoid DOM geometry reads on cache hits;
- use a single sequential TypedArray scan;
- avoid repeated dispatch and DOM commits for an unchanged insertion;
- always flush pending work on release.

Practical frame budgets:

| Refresh rate | Drag work p95 |
| ------------ | ------------: |
| 60 Hz        |        < 8 ms |
| 120 Hz       |        < 4 ms |

“Drag work” includes geometry reads, hit testing, and library-owned DOM writes, but excludes consumer rendering.

---

## 3. Compact Runtime Representation

### 3.1. Private symbols → integer discriminants

Public outcome and cancellation tokens can keep their current representation initially. Private FSM phases, events, stages, recovery modes, and readiness states should move from symbols to integer literals.

As an intermediate publish transform, symbol descriptions can be removed:

```ts
Symbol('presentation-ready');
```

becomes:

```ts
Symbol();
```

This already reduces the current bundles by approximately:

- `draggable`: 300 B Brotli;
- `sortable`: 346 B Brotli.

Replacing private discriminants with primitive values produced larger reductions in review experiments. Integer discriminants should therefore be part of the high-confidence track.

```ts
const PHASE_IDLE = 0 as const;
const PHASE_PENDING = 1 as const;
const PHASE_ACTIVATING = 2 as const;
const PHASE_DRAGGING = 3 as const;
const PHASE_AWAITING_RESULT = 4 as const;
const PHASE_SETTLING = 5 as const;

type Phase =
  | typeof PHASE_IDLE
  | typeof PHASE_PENDING
  | typeof PHASE_ACTIVATING
  | typeof PHASE_DRAGGING
  | typeof PHASE_AWAITING_RESULT
  | typeof PHASE_SETTLING;
```

This preserves ordinary discriminated-union narrowing:

```ts
if (state.phase === PHASE_DRAGGING) {
  // `state` narrows to the dragging variant.
}
```

The integer conversion must be measured independently from any later packed representation.

---

### 3.2. Optional packed protocol word

Packing several discriminants into one protocol word is a separate, evidence-gated experiment. It must not be treated as an automatic consequence of replacing symbols with integers.

```ts
type Protocol = number;
```

Example layout:

```ts
// bits 0–2: root phase
const PHASE_SHIFT = 0;
const PHASE_MASK = 0b111;

const PHASE_IDLE = 0;
const PHASE_PENDING = 1;
const PHASE_ACTIVATING = 2;
const PHASE_DRAGGING = 3;
const PHASE_AWAITING_RESULT = 4;
const PHASE_SETTLING = 5;

// bits 3–5: landing stage
const LANDING_SHIFT = 3;
const LANDING_MASK = 0b111 << LANDING_SHIFT;

const LANDING_NONE = 0 << LANDING_SHIFT;
const LANDING_PREPARING = 1 << LANDING_SHIFT;
const LANDING_RUNNING = 2 << LANDING_SHIFT;
const LANDING_COMPLETING = 3 << LANDING_SHIFT;
const LANDING_SETTLED = 4 << LANDING_SHIFT;

// independent flags
const PRESENTATION_READY = 1 << 6;
const FAILURE_REPORTED = 1 << 7;
```

Rules:

- mutually exclusive values use masked enum slots;
- orthogonal facts use flags;
- reducers never use unexplained numeric literals;
- slot and flag operations go through named helpers.

```ts
const setSlot = (protocol: Protocol, mask: number, value: number): Protocol =>
  (protocol & ~mask) | value;

const hasFlag = (protocol: Protocol, flag: number): boolean =>
  (protocol & flag) !== 0;
```

TypeScript narrowing can be preserved with a single generic protocol guard:

```ts
function isPhase<P extends Phase>(
  state: DraggableState,
  phase: P,
): state is Extract<DraggableState, { readonly phaseType: P }> {
  return (state.protocol & PHASE_MASK) === phase;
}
```

The discriminant used only for typing can be phantom or otherwise erased from runtime representation.

```ts
if (isPhase(state, PHASE_DRAGGING)) {
  // `state` narrows to the dragging variant.
}
```

A custom lowering pass is therefore optional, not required. A normal generic guard may be small enough to keep as-is, and minifiers may inline it naturally.

The real cost of a packed protocol is not the loss of narrowing. It is the need to maintain a correct relationship between:

- bit layout;
- named masks and values;
- phantom state types;
- generic guards;
- development decoding.

Development builds should expose a removable decoder:

```ts
inspectProtocol(state.protocol);
```

It should return readable phase, landing, outcome, recovery, and flag information. Decoder tables must not be included in production output.

Adopt a packed protocol only when it demonstrates enough size or runtime benefit beyond plain integer discriminants to justify the additional representation machinery.

---

### 3.3. Internal events → discriminated tuples

Internal event tuples are an evidence-gated representation experiment rather than a required first-pass change.

They preserve discriminated-union narrowing:

```ts
type DraggableEvent =
  | readonly [type: typeof MOVE, pointerId: number, x: number, y: number]
  | readonly [type: typeof RELEASE, pointerId: number, x: number, y: number]
  | readonly [
      type: typeof PRESENTATION_SETTLED,
      operationId: number,
      resolutionId: number,
      error: unknown,
    ]
  | readonly [type: typeof CANCEL, reason: CancellationReason];
```

Dispatch:

```ts
dispatch([MOVE, pointerId, x, y]);
```

Reducer:

```ts
switch (event[0]) {
  case MOVE: {
    const [, pointerId, x, y] = event;
    break;
  }
}
```

Public request, result, and geometry payloads should remain objects. Tuples are only candidates for the internal FSM protocol.

Branded currencies make positional transposition a type error.

Nested protocol payloads should also be flattened:

```ts
[CANCEL, CANCEL_CONSUMER, reason];
```

instead of:

```ts
{
  type: CANCEL,
  reason: {
    type: CANCEL_CONSUMER,
    detail: reason,
  },
}
```

Tuples still allocate one array. Their size benefit must be measured before accepting the debugging and readability cost of positional payloads.

Source-level constructors may preserve intent:

```ts
const presentationSettled = (
  operationId: OperationId,
  resolutionId: ResolutionId,
  error: unknown,
): DraggableEvent => [PRESENTATION_SETTLED, operationId, resolutionId, error];
```

A fixed-arity positional dispatch should only be considered later if profiling shows tuple allocation to be significant.

---

### 3.4. Scalars in hot paths

Hot-path calculations should prefer scalar fields:

```ts
pointerX;
pointerY;
originX;
originY;
deltaX;
deltaY;
```

instead of temporary point objects:

```ts
{
  (x, y);
}
```

Public `Point`, `DragGeometry`, and callback payloads should be materialized only at the consumer boundary.

The first pass does not need to change event or state representation. Its scope is limited to scalar pointer and motion calculations and avoiding temporary geometry records in hot paths.

Packed protocol state, tuple events, and removal of nested protocol records remain independent Track B experiments.

---

## 4. Gesture Effect Runtime Experiment

`FreeDragGesture` and `SortableGesture` are strong candidates for a later data-oriented rewrite because they interpret committed transitions and retain only operation-scoped mechanical resources.

This remains an evidence-gated experiment. It should not run before the high-confidence hot-path fixes.

```text
gesture class
→ module-level effect functions
  + mutable operation context
```

### 4.1. Initial scope

Start with `FreeDragGesture` only after Track A has been measured.

Do not refactor `FreeDragControllerImpl` in the same change set beyond the minimal adapter changes required to create, route, and destroy the new gesture representation.

Replace:

```ts
new FreeDragGesture(deps);
gesture.scope;
gesture.handle(from, to, event);
gesture.destroy();
```

with module-level operations:

```ts
const gesture = createFreeDragGesture(deps);

freeDragGestureScope(gesture);
handleFreeDragGesture(gesture, from, to, event);
destroyFreeDragGesture(gesture);
```

Do not create an object facade containing closure methods. The goal is to remove the class without replacing prototype methods with per-instance closures.

### 4.2. Mutable object as the default candidate

The initial non-class representation should use a named mutable object:

```ts
type FreeDragGesture = {
  deps: FreeGestureDeps;
  scope: GestureScope;
  lift: VisualLiftSession | null;
  renderer: DragRenderer | null;
  resolution: DropResolutionEffect | null;
  landing: LandingRunner | null;
  presentationWatch: Disposer | null;
};
```

This preserves:

- named-field debugging;
- readable teardown ordering;
- a stable object shape;
- explicit mechanical ownership;
- straightforward comparison with the current class.

Private field names already minify well. The tuple form must therefore prove a distinct benefit rather than being assumed to be the target.

### 4.3. Tuple control variant

A tuple remains a valid size experiment:

```ts
const DEPS = 0;
const SCOPE = 1;
const LIFT = 2;
const RENDERER = 3;
const RESOLUTION = 4;
const LANDING = 5;
const PRESENTATION_WATCH = 6;

type FreeDragGestureTuple = [
  deps: FreeGestureDeps,
  scope: GestureScope,
  lift: VisualLiftSession | null,
  renderer: DragRenderer | null,
  resolution: DropResolutionEffect | null,
  landing: LandingRunner | null,
  presentationWatch: Disposer | null,
];
```

Adopt the tuple only if it beats the named object by enough to justify worse debugging in resource teardown code.

A negligible byte reduction is not sufficient.

### 4.4. Module-level effect steps

Each private class method becomes a module-level function whose first argument is the operation context:

```ts
function renderFreeDrag(gesture: FreeDragGesture, to: DraggableState): void {
  gesture.renderer?.render(to.motion?.viewportDelta ?? ORIGIN);
}
```

The transition router becomes:

```ts
function handleFreeDragGesture(
  gesture: FreeDragGesture,
  from: DraggableState,
  to: DraggableState,
  event: DraggableEvent,
): void {
  if (from.phase === PHASE_PENDING && to.phase === PHASE_ACTIVATING) {
    acquireFreeDrag(gesture, to);
    return;
  }

  // Remaining committed transition routing.
}
```

Preserve the current rules:

- effect steps read semantic values from `(from, to, event)`;
- the operation context stores no independent semantic phase;
- effect-triggered transitions still dispatch through the session;
- committed state is assigned before effect routing;
- teardown remains idempotent;
- interaction and presentation ownership remain explicit.

### 4.5. Controller integration

The pointer source and transition router should use module-level functions rather than per-operation `.bind(this)` calls where practical. Avoid recreating bound `currentBounds` and `emit` functions for every admitted gesture.

This cleanup is secondary to the gesture rewrite and should not expand into a full controller rewrite in the same commit.

### 4.6. Sortable follow-up and partial kernel extraction

After measuring the free-drag rewrite, apply the same representation to `SortableGesture`.

Do not force both gestures into one generic context before both rewrites exist.

Once both implementations use module-level functions, compare them structurally and move only genuinely shared mechanics into a kernel module, for example:

```text
kernel/gesture-effects.ts
```

Potential extraction candidates:

- common gesture destruction and scope finalization;
- renderer invocation;
- landing runner ownership and teardown;
- presentation-ready watcher ownership and disposal;
- guarded terminal callback execution;
- shared failure-reporting mechanics;
- common transition steps that are behaviorally identical.

Keep feature-specific behavior outside the kernel:

- free-drag home target resolution;
- reorder proposal building and stabilization;
- placeholder ownership;
- feature-specific resolution invocation;
- feature-specific callback payload construction.

A generic abstraction that increases either standalone entry point should not be retained merely for conceptual symmetry.

### 4.7. Measurement

Compare:

```text
A. Current class
B. Module-level functions + mutable named object
C. Module-level functions + mutable tuple
```

Measure:

```text
minified size
Brotli size
gesture creation cost
allocations per gesture
pointer-move/rAF task duration
individual entry-point size
combined entry-point size
```

Expected benefit:

- primarily smaller and more optimizable output;
- simpler sharing between draggable and sortable;
- fewer avoidable bound callbacks;
- improved inlining and dead-code elimination opportunities.

Do not assume a large pointer-move speedup solely from removing the class. Prototype methods are already shared.

---

## 5. High-Confidence Hot-Path Rationale

The normative execution order is defined in §12, Track A. This section explains why those changes are prioritized.

### Draggable

The current pointer path resolves live bounds before validating whether the event can affect the active gesture. Phase and pointer ownership checks must therefore run before any geometry provider or `getBoundingClientRect()` call.

Bounds caching should use `InvalidationSource` when compatible with the public bounds-provider contract:

- a truly dynamic provider may require evaluation on every relevant move;
- a geometry provider may be cached until invalidation.

Motion reduction, coordinate mapping, and geometry construction should each happen once per relevant transition. Temporary point objects should be avoided in warm paths where scalar coordinates are sufficient.

### Sortable

The current spatial path performs repeated full-collection work and creates transient arrays and objects. The target path should:

- build or refresh one `RectIndex`;
- perform one allocation-free scan over cached numeric geometry;
- suppress unchanged insertions;
- schedule at most one spatial pass per animation frame;
- flush and remeasure on release.

### Event-directed reducer execution

Event-directed reducer execution belongs in Track A and does not depend on tuple events or packed protocol state.

```ts
switch (event.type) {
  case LIFECYCLE_MOVE:
    return reduceMove(from, event);

  case LIFECYCLE_RELEASE:
    return reduceRelease(from, event);

  case PRESENTATION_SETTLED:
    return reducePresentationSettled(from, event);
}
```

The critical invariant is unchanged:

- every reducer path reads one immutable `from`;
- semantic no-ops return that exact `from`;
- `createSession` must continue to skip effect routing when `to === from`;
- skipping unrelated projections must not manufacture a fresh root object for a no-op.

This optimization should be introduced independently from any event-encoding experiment.

---

## 6. TypedArray `RectIndex`

### 6.1. Purpose

`RectIndex` is a mechanical cache for sortable geometry. It is not semantic state and does not replace collection versions, committed insertions, or spatial currencies.

It belongs to the current `SortableGesture` and exists only for the lifetime of the active operation.

### 6.2. Representation

Use one packed `Float64Array`.

```ts
const RECT_STRIDE = 6;

const RECT_LEFT = 0;
const RECT_TOP = 1;
const RECT_RIGHT = 2;
const RECT_BOTTOM = 3;
const RECT_CENTER_X = 4;
const RECT_CENTER_Y = 5;

type RectIndex = {
  values: Float64Array;
  count: number;

  collectionVersion: number;
  geometryVersion: number;

  dirty: number;
};
```

Layout:

```text
item 0:
  left, top, right, bottom, centerX, centerY

item 1:
  left, top, right, bottom, centerX, centerY
```

`Float64Array` is intentional:

- DOM geometry and JavaScript arithmetic use double precision;
- coordinates may include large scroll offsets and transforms;
- memory usage is negligible.

For 500 items:

```text
500 × 6 × 8 bytes = 24 kB
```

The item snapshot remains a normal array:

```ts
items[index];
```

The TypedArray stores only numeric geometry.

### 6.3. Capacity management

The buffer must not be reallocated on every update.

```ts
capacity = nextPowerOfTwo(itemCount);
values = new Float64Array(capacity * RECT_STRIDE);
```

Allocate a new buffer only when the current collection no longer fits. Do not shrink the buffer during an active gesture.

### 6.4. Rebuild

```ts
function rebuildRectIndex(
  index: RectIndex,
  items: readonly Element[],
  draggedIndex: number,
): void {
  for (let i = 0; i < items.length; i++) {
    const offset = i * RECT_STRIDE;

    if (i === draggedIndex) {
      continue;
    }

    const rect = items[i].getBoundingClientRect();

    index.values[offset + RECT_LEFT] = rect.left;
    index.values[offset + RECT_TOP] = rect.top;
    index.values[offset + RECT_RIGHT] = rect.right;
    index.values[offset + RECT_BOTTOM] = rect.bottom;
    index.values[offset + RECT_CENTER_X] = (rect.left + rect.right) * 0.5;
    index.values[offset + RECT_CENTER_Y] = (rect.top + rect.bottom) * 0.5;
  }

  index.count = items.length;
  index.dirty = 0;
  index.geometryVersion++;
}
```

Do not retain `DOMRect` objects. After rebuilding, hit testing should operate only on the TypedArray.

### 6.5. Invalidation flags

```ts
const DIRTY_COLLECTION = 1 << 0;
const DIRTY_SCROLL = 1 << 1;
const DIRTY_VIEWPORT_RESIZE = 1 << 2;
const DIRTY_ITEM_RESIZE = 1 << 3;
const DIRTY_PLACEHOLDER = 1 << 4;
const DIRTY_VISUAL = 1 << 5;
```

```ts
index.dirty |= DIRTY_SCROLL;
```

The index should rebuild once on the next scheduled frame regardless of how many invalidation reasons accumulate.

Invalidation sources:

- collection replacement or version change;
- scrolling in the owning realm or container;
- viewport resize;
- relevant item or container `ResizeObserver` notifications;
- committed placeholder movement;
- changes to `getVisual(item)` identity;
- explicit internal invalidation for geometry changes that cannot be observed reliably.

`ResizeObserver` does not detect every CSS transform or compositor-only geometry change. The library must not pretend that arbitrary consumer geometry can always be observed automatically. Unsupported cases need an explicit invalidation contract.

### 6.6. Spatial currency

Each scheduled spatial request receives an identity:

```ts
type SpatialRequest = readonly [
  currency: number,
  collectionVersion: number,
  pointerX: number,
  pointerY: number,
];
```

A result is accepted only when:

- the operation is still current;
- the spatial currency matches;
- the collection version is unchanged;
- the gesture remains in a compatible phase.

The mechanical `RectIndex` may live outside the reducer, but stale spatial results must never become committed semantic state.

### 6.7. Hit testing

Use one allocation-free loop:

```ts
function nearestIndex(
  rects: Float64Array,
  count: number,
  draggedIndex: number,
  pointerX: number,
  pointerY: number,
): number {
  let nearest = -1;
  let nearestDistance = Infinity;

  for (let i = 0; i < count; i++) {
    if (i === draggedIndex) {
      continue;
    }

    const offset = i * RECT_STRIDE;
    const dx = pointerX - rects[offset + RECT_CENTER_X];
    const dy = pointerY - rects[offset + RECT_CENTER_Y];

    const distance = dx * dx + dy * dy;

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = i;
    }
  }

  return nearest;
}
```

This removes:

- `Map`;
- temporary `Point` objects;
- `filter`;
- destination arrays;
- `indexOf`;
- `Math.sqrt`;
- multiple O(n) passes.

### 6.8. Placeholder commit

After placeholder movement:

```ts
rectIndex.dirty |= DIRTY_PLACEHOLDER;
spatialTask.schedule(latestPointer);
```

Moving the placeholder may change the layout of many items, especially in grid or flex layouts. The previous cache must therefore be considered stale after a DOM commit.

One frame between placeholder placement and remeasurement is acceptable, but release must always use current geometry.

### 6.9. Release flush

Release path:

1. record the real release point;
2. flush pending visual and spatial work;
3. rebuild `RectIndex` synchronously if dirty;
4. recompute insertion from the release point;
5. commit only the current proposal;
6. enter resolution and settlement.

This is a correctness requirement, not an optional optimization.

---

## 7. Frame Pipeline

Pointer events may arrive more frequently than browser paints. DOM geometry and style writes should not run for every pointer sample.

### Pointer event

```ts
latestPointerX = event.clientX;
latestPointerY = event.clientY;

dispatch([MOVE, pointerId, latestPointerX, latestPointerY]);
frameTask.schedule();
```

Semantic pointer state may remain authoritative for every sample. Visual and spatial work should be coalesced.

### Animation frame

Required order:

```text
1. Validate the current operation and currency
2. Rebuild RectIndex when dirty
3. Resolve insertion from the TypedArray
4. Dispatch only a changed insertion
5. Compute the latest visual delta
6. Perform DOM writes
```

All DOM reads must occur before library-owned writes.

Avoid pipelines such as:

```text
read item
write placeholder
read another item
```

because they can cause layout thrashing.

### Visual rendering

Transform writes for draggable and sortable should be coalesced to one write per frame.

```ts
pendingDeltaX = deltaX;
pendingDeltaY = deltaY;
renderTask.schedule();
```

Release and transform ownership transfer to `LandingRunner` must flush pending rendering first.

`onMove` may remain per pointer sample if that is part of the public contract. The visual renderer should still remain frame-based.

---

## 8. Reducer Representation Follow-ups

Event-directed execution is part of Track A and is described in §5 and §12.

Track B may later change how reducer inputs are represented:

- object events → discriminated tuples;
- integer discriminants → packed protocol slots;
- source-level guards → generic `isPhase` checks.

These representation changes must preserve the same reducer invariants:

- every affected path reads the same immutable `from`;
- reducers never observe a partially constructed next state;
- semantic no-ops return `from`;
- committed state is assigned before effects run.

Do not introduce mutable root state as part of these experiments.

---

## 9. Additional Performance Work

These are follow-up candidates after the main pass.

### Incremental spatial search

Start from the current insertion and nearby indices:

```text
current - 1
current
current + 1
```

During normal dragging, the pointer usually moves locally, so average search cost may approach O(1).

The generic O(n) TypedArray scan remains the fallback for arbitrary grid or spatial layouts.

### Axis-specialized lists

Known linear vertical or horizontal collections may use binary or incremental search over center coordinates.

Do not introduce specialization until the generic TypedArray implementation has been benchmarked.

### Lazy public geometry

`localDelta` and `currentRect` may be materialized lazily if benchmarks show that most consumers only use `viewportDelta`.

---

## 10. Test Preservation and Experimental Discipline

The package currently has a large behavioral test suite. Representation work can create false confidence when production code and representation-specific assertions are rewritten together.

Rules:

- preserve lifecycle and browser tests unchanged whenever possible;
- separate representation-only test changes from behavioral changes;
- treat any required rewrite of a behavioral expectation as a reason to pause and inspect the semantic change;
- keep every representation experiment independently revertible;
- do not combine class removal, tuple conversion, event encoding, and protocol packing in one commit;
- record before/after size and performance numbers for every experiment;
- retain an experiment only when its measured benefit justifies its correctness and maintenance cost.

Tests that assert private symbol identity or internal event object shape may need targeted updates. Tests that verify lifecycle ordering, stale-work rejection, cleanup, release behavior, and consumer callbacks should remain stable.

Add browser-level performance regression guards for geometry reads:

- instrument `getBoundingClientRect`;
- simulate a fixed drag sequence, such as ten pointer moves;
- assert that irrelevant or sub-threshold moves do not resolve bounds;
- assert that sortable geometry is not remeasured more often than the intended invalidation/frame policy;
- include release flushing as a separate expected read.

These tests should pin call counts or upper bounds rather than elapsed time, making them stable enough for CI while still detecting the return of synchronous-layout work.

This discipline is what makes the plan falsifiable.

---

## 11. Benchmark Plan

### Workloads

| Item count | Layout        |
| ---------: | ------------- |
|         20 | vertical list |
|        100 | vertical list |
|        200 | vertical list |
|        500 | vertical list |
|        100 | grid          |
|        200 | grid          |
|        500 | grid          |

Additional cases:

- nested scroll container;
- window scroll;
- placeholder-induced reflow;
- item resize during drag;
- collection replacement;
- `getVisual(item) !== item`;
- release immediately after high-rate pointer movement.

### Refresh and input rates

- 60 Hz display;
- 120 Hz display;
- high-rate pointer or stylus samples;
- multiple pointer samples between two animation frames.

### Metrics

Measure separately:

```text
pointer handler duration
reducer duration
RectIndex rebuild duration
TypedArray hit-test duration
DOM write duration
total rAF drag task
layout and style recalculation
allocations per frame
GC pauses
dropped frames
release flush duration
```

Track at least:

- median;
- p95;
- p99;
- worst frame;
- total allocations;
- number of forced layouts.

### Size measurement

After every independent change set:

```text
draggable minified
draggable Brotli
sortable minified
sortable Brotli
combined minified
combined Brotli
```

Do not combine multiple representation experiments into one commit before measuring them independently.

---

## 12. Implementation Order

The work is split into two independently justified tracks.

### Phase 0 — Baseline and attribution

1. Record current standalone and combined bundle sizes.
2. Attribute bytes to major modules and feature areas.
3. Create a sortable benchmark harness.
4. Record 20, 100, 200, and 500-item baselines.
5. Add allocation and release-flush measurements.
6. Treat current size targets as provisional estimates, not CI budgets.

### Track A — High-confidence work

#### A1. Draggable bounds, motion, and reducer routing

1. Add a browser regression test for `getBoundingClientRect` call counts.
2. Gate bounds resolution behind phase and pointer ownership checks.
3. Decide and document the dynamic bounds-provider contract.
4. Add invalidation-based bounds caching when compatible with that contract.
5. Compute motion once.
6. Avoid unnecessary sub-threshold state commits.
7. Replace warm-path `DOMPoint` mapping with scalar matrix arithmetic.
8. Route move/release events only through affected reducer paths.
9. Preserve the exact-`from` semantic no-op invariant.

#### A2. Sortable spatial path

1. Add browser regression tests for geometry-read call counts.
2. Compute sortable delta once.
3. Remove the `FrameTask` wrapper allocation.
4. Suppress unchanged insertions.
5. Add the pending fast path.
6. Introduce `Float64Array RectIndex` with capacity reuse.
7. Fuse filtering, nearest search, and index resolution into one scan over `RectIndex`.
8. Add invalidation flags.
9. Add collection and spatial currencies.
10. Route spatial events only through affected reducer paths while preserving exact-`from` no-ops.
11. Add release rebuild and flush.
12. Add browser tests for stale geometry and release-time remeasurement.

#### A3. Compact low-risk representation

1. Brand operation, resolution, and landing currencies.
2. Replace private symbol discriminants with integer literals.
3. Preserve ordinary discriminated-union narrowing.
4. Re-measure standalone and combined bundles.
5. Use symbol-description stripping only as a fallback stopgap if integer conversion is delayed.

#### A4. Rendering

1. Coalesce transform writes.
2. Flush rendering before release and landing.
3. Separate semantic pointer samples from visual frames.
4. Verify callback semantics.

### Track B — Evidence-gated representation experiments

Run only after Track A establishes the remaining size and performance gap.

Each item must be independently measured and revertible.

1. `FreeDragGesture` class → module-level functions + mutable named object.
2. Named gesture object → tuple control variant.
3. Apply the winning gesture representation to sortable.
4. Extract only measured shared gesture mechanics into the kernel.
5. Event objects → discriminated tuples using the existing branded currencies.
6. Integer discriminants → optional packed protocol word.
7. Preserve narrowing through a generic `isPhase`-style guard.
8. Consider fixed-arity dispatch only if tuple allocation is visible in profiles.
9. Add incremental neighbor search and linear-list specialization only if the generic `RectIndex` scan remains material.

Track B may be skipped entirely when Track A reaches acceptable size and frame-time results.

---

## 13. Release Blockers Unrelated to Optimization

Run this work in parallel with Track A rather than waiting for optimization to finish.

Before publishing:

1. Rewrite the README, which still describes the previous architecture and old resolution/cancel semantics.
2. Fix JSDoc examples with outdated imports and `{ type: 'accepted' }`.
3. Add type-checked documentation examples.
4. Choose one consistent source-map policy.
5. Fix the current state where internal maps are published but root source-map references are incomplete.
6. Add `draggable`, `sortable`, and `combined` size budgets to CI.

---

## 14. Final Direction

The plan has one high-confidence optimization track and one evidence-gated representation track.

### Track A

```text
unconditional bounds reads  → gated/cached geometry
sortable multi-pass work    → fused loop + RectIndex
frame allocations           → reusable scalar state
private symbols             → integer discriminants
numeric currencies          → branded identity types
unconditional reducer fanout → event-directed execution
DOM writes                  → one commit per frame
```

Track A contains the clearest performance wins and the most realistic immediate size reductions while preserving the existing semantic representation and most of the test suite.

### Track B

```text
gesture classes     → module-level functions + measured context form
event objects       → optional discriminated tuples
integer state tags  → optional packed protocol
shared mechanics    → measured kernel extraction
```

Track B is not presumed necessary. It exists to close a measured remaining gap.

Its safety mechanisms include:

- mutable named objects as the default gesture candidate;
- tuples accepted only after a meaningful measured win;
- branded operation, resolution, and landing currencies;
- generic `isPhase`-style guards for packed-state narrowing;
- development decoders for compact runtime representations;
- unchanged behavioral tests wherever possible;
- one representation experiment per commit.

The two tracks reinforce each other without depending on one another:

- Track A can deliver most of the expected runtime improvement independently;
- Track B can pursue a smaller runtime representation without forcing source code into untyped positional assembly;
- release flushing, immutable committed state, and currencies preserve correctness throughout.

This is not a commitment to rewrite the drag engine into bytecode. It is a falsifiable optimization program: take the obvious wins first, measure the remaining problem, and adopt compact representations only when they prove their value.
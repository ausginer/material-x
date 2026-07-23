# `@ydinjs/drag` — performance and size review

Scope: `packages/drag/src`, read against `packages/drag/DESIGN.md`. Baseline measured with `npm run size` (size-limit + Vite, brotli):

| Entry       | Size     | Limit  |
| ----------- | -------- | ------ |
| `draggable` | 7.88 kB  | 8.3 kB |
| `sortable`  | 8.97 kB  | 9.4 kB |
| `combined`  | 15.52 kB | —      |

## Summary

| Axis | Rating | Summary |
| --- | --- | --- |
| Performance — draggable | 8.5/10 | Well designed; the "no matrix in the move path" promise mostly holds |
| Performance — sortable | 5/10 | Per-frame full re-measure of the item field is the dominant cost |
| Size | 7.5/10 | Respectable, but ~1 kB of the combined bundle is avoidable |

The architecture is not the problem. DESIGN.md rule 8 — "hot pointer movement stays allocation-light and does not perform matrix or layout work unnecessarily" — is the right rule, and the kernel honours it. Every violation below is in feature-level code, and in two cases the correct kernel entity already exists and simply is not being used.

### What is already right

Worth stating explicitly, since it is the load-bearing part:

- pointer tracking stays in raw viewport coordinates; the matrix walk runs only at grab, drop, and settle;
- the root reducers return the `from` identity when nothing changed, so `createSession` skips effect routing entirely (`kernel/session.ts:62`);
- `DragTransition` passes `(from, to, event)` positionally instead of allocating a record per edge.

Those are the decisions that matter most and they are all made correctly.

## Performance findings

### P1. Forced layout on every `pointermove`, unconditionally (draggable)

`draggable.ts:243` calls `#currentBounds()` inline in the move dispatch, and `draggable/bounds.ts:284` ends in `bounds.getBoundingClientRect()`. Every single `pointermove` therefore triggers a synchronous layout flush — including while the phase is still `pending` (below threshold) and when the pointer does not own the gesture. `classifyMove` then discards the result.

Highest value-to-effort fix in the package. Gate the call on phase:

```ts
const dragging = this.#session.state().phase === PHASE_DRAGGING;
bounds: dragging ? this.#currentBounds() : null,
```

Better still, cache the resolved rect for the gesture and re-resolve only on the `InvalidationSource` signal (`kernel/invalidation.ts:22`). A bounds rect can only change on scroll or resize — exactly what that source emits.

### P2. Sortable re-measures the entire field every frame

`sortable/insertion.ts:171` → `sortable/geometry.ts:22`: `measure()` calls `getBoundingClientRect()` for every non-dragged item and allocates a fresh `Map`, from the rAF task, on every frame the pointer moves. `placeholder.rect()` (`insertion.ts:172`) adds one more forced layout. For a 200-item list that is 201 layout reads per frame; it will not hold 60fps.

Nothing in that measurement can change between frames except via scroll, resize, or a committed insertion (placeholder move) — all three already observable. The fix is a rect cache invalidated by `InvalidationSource` plus insertion commits. This is precisely the "layout may be stale" signal the design doc says that source exists to provide; the sortable feature just is not consuming it here.

### P3. Sortable per-frame allocations

Per `resolveSpatialInsertion` call, per frame:

- `measure()` — a `Map` plus N `DOMRect`s (`geometry.ts:27`);
- `center(rect)` — one `Point` **per item** inside the `nearestItem` loop (`geometry.ts:61`);
- `items.filter(...)` — a whole new array (`insertion.ts:179`);
- `indexOf(nearest)` — a second O(n) scan over that array;
- `rects.get(item)` — a hash lookup per item where a parallel array indexed by position would be a pointer deref.

`nearestItem` should compare scalars rather than allocate:

```ts
const cx = rect.left + rect.width / 2;
const cy = rect.top + rect.height / 2;
const dx = pointer.x - cx;
const dy = pointer.y - cy;
const d = dx * dx + dy * dy;
```

The `filter`/`indexOf` pair is redundant: track the destination index while walking the field in the same loop that finds the nearest item. That collapses three O(n) passes and two array allocations into one pass with zero.

### P4. `FrameTask` allocates a wrapper per schedule

`kernel/invalidation.ts:72`: `pending = { value }` runs on every `schedule()` call — i.e. every move event, not every frame. A `hasPending: boolean` flag alongside a bare `pending: T` field allocates nothing.

### P5. `CoordinateMapper` allocates `DOMPoint`s in warm paths

`kernel/coordinate.ts:172-181`: each mapping call allocates a `DOMPoint` _and_ a `Point` and goes through `transformPoint`. The matrix walk correctly stays out of the hot path, but `deltaFromViewport` is called per move via `freeGeometry` → `geometryOf` whenever `onMove` is configured (`draggable/motion.ts:382`).

Destructure the six matrix scalars once at capture and do the arithmetic directly:

```ts
const { a, b, c, d, e, f } = matrix;
// toViewport:      { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f }
// deltaFromViewport: same formula on the inverse, without e / f
```

Removes `DOMPoint` from every warm call, halves allocations, and lets `linearOf` and one `DOMMatrix` construction be deleted — a size win alongside the perf win.

### P6. `freeGeometry` builds a full geometry object even when partly unused

`draggable/motion.ts:378` constructs a `DragGeometry` with a `localDelta` and a realm `DOMRectReadOnly` per move. The important guard — `options.onMove` existing (`draggable/gesture.ts:364`) — is already in place. If more is wanted, make `localDelta` and `currentRect` lazy getters: most consumers read `viewportDelta` only, and `currentRect` costs a `DOMRectReadOnly` construction each move.

## Size findings

### S1. Symbol descriptions — the largest avoidable cost

104 `Symbol('description')` call sites across the source carry roughly 1,270 bytes of description strings. Those strings are pure debugging affordance, they survive minification untouched (a minifier cannot prove them unobservable), and each `Symbol(...)` call site also costs runtime bytes plus a heap allocation at module init.

Small integer constants are strictly better on every axis here:

```ts
export const PHASE_IDLE = 0;
export const PHASE_PENDING = 1;
```

The same nominal-ish typing survives via `typeof PHASE_IDLE` literal-type unions, comparisons become integer compares instead of reference compares, and the `switch` in `transitionKernelPhase` (`kernel/protocol.ts:96`) can compile to a jump table rather than a chain of reference tests. The reducers compare these constants constantly, so this is a genuine hot-path win as well as a size win.

Because these constants live in the shared `protocol.ts`, the saving lands in the common code: estimate **0.8–1.1 kB off the combined bundle**, not off each entry.

The one real cost is debuggability — `Symbol(dragging)` inspects better than `3`. A dev-only `PHASE_NAMES` array stripped by build condition recovers that.

### S2. Shared-kernel duplication — not an issue

Initially flagged, then retracted. The `combined` size-limit entry reports 15.52 kB against a 16.85 kB naive sum of the two entries, so the deduplicated shared kernel is only ~1.33 kB brotlied. A consumer importing both features already pays close to the theoretical minimum. Splitting a shared `kernel.js` chunk would buy at most that 1.33 kB in exchange for an extra request and a worse single-feature story — not worth doing.

Recommendation: keep the `combined` entry and give it an explicit limit in CI. It is the number that actually tracks whether the two entries' shared code starts drifting apart, which the per-entry limits cannot catch.

### S3. Minor

- `LIFTED_PROPS` + `UA_PROPS` (`kernel/presentation.ts:31-56`) — 19 property strings, and `captureInlineStyles` iterates all of them twice. Cold path; leave as-is.
- Deleting `linearOf` and `pointOf` per P5 removes a small amount of code.
- The two reducers are 1035 and 1079 lines, but they are comment-dense and the shipped size reflects that. No action needed.

## Recommended order

1. **P1** — gate `#currentBounds()` on phase. One-line change, removes a forced layout per move event.
2. **P2** — cache sortable rects against `InvalidationSource`. Largest win; uses an entity the design already provides for exactly this purpose.
3. **S1** — integer constants for Symbols. ~1 kB off the combined bundle plus faster reducer comparisons. Broad but mechanical.
4. **P3** — fuse the sortable geometry passes, drop the per-item `Point` allocation.
5. **P5** — scalar-ize `CoordinateMapper`. Perf and size together.
6. **P4** — `FrameTask` wrapper allocation. Trivial.

P1, P2, and P3 are behaviour-preserving and should be covered by the existing tests.

Before locking any of this in, benchmark the sortable move path at ~200 items. DESIGN.md line 200 explicitly requires pointer-path allocation and emitted size to be benchmarked before the physical field layout is fixed; as far as I can tell that has not happened yet, and P2/P3 are precisely the measurements it was asking for.
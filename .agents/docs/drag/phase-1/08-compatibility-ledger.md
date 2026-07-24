# Artifact 8 — Public compatibility ledger

Every public promise, linked to the test that pins it, plus every place the redesign would change observable behaviour.

## 1. Exported surface

Verified against `src/draggable.ts` and `src/sortable.ts`. The rewrite must reproduce this exactly; a declaration snapshot test is added in [artifact 9](09-test-classification.md).

### 1.1 `@ydinjs/drag/draggable`

| Export | Kind |
| --- | --- |
| `draggable(item, options)` | function → `FreeDragController` |
| `FreeDragController` | type — `update`, `cancel`, `destroy` |
| `FreeDropResolution` | const (`accept`, `reject`) + type |
| `FreeDropResult` | const (`isAccepted`, `isRejected`, `isCanceled`) + type |
| `DragBounds`, `DraggableOptions`, `DragUpdate` | types |
| `FreeDragCancelResult`, `FreeDragFinishResult` | types (aliases of `FreeDropCancelResult` / `FreeDropFinishResult`) |
| `FreeHomeRequest`, `FreeHomeTarget`, `LiftMode` | types |
| `AnimationTiming`, `CoordinateMapper`, `DragAxis`, `DragGeometry`, `DragSubject`, `FreeDropRequest`, `Point` | types re-exported from the kernel |

### 1.2 `@ydinjs/drag/sortable`

| Export | Kind |
| --- | --- |
| `sortable(container, options)` | function → `SortableController` |
| `SortableController` | type — `updateItems`, `cancel`, `destroy` |
| `ReorderResolution` | const + type |
| `SortableResult` | const (`isAccepted`, `isRejected`, `isCanceled`, `isNoOp`) + type |
| `PlaceholderContext`, `SortableOptions`, `SortableCancelResult`, `SortableFinishResult` | types |
| `AnimationTiming`, `DragSubject`, `ReorderRequest` | types re-exported |

Entry points are declared in `packages/drag/files.json` (`"runtime": ["draggable", "sortable"]`).

## 2. Controller method semantics

| Method | Promise | Pinned by |
| --- | --- | --- |
| `draggable()` | throws `TypeError('draggable: \`onDrop\` is required.')`when`onDrop` is not a function | `tests/draggable.browser.test.ts` |
| `sortable()` | throws `TypeError('sortable: \`onReorder\` is required.')` | `tests/sortable.browser.test.ts` |
| `update(next)` | no-op after `destroy()`; merges into the retained policy; `bounds: undefined` **is** a change (bumps `boundsVersion`) only when the key is present | draggable browser tests |
| `update({position})` | dispatched as a separate action **after** the policy update | — (gap, see §5) |
| `updateItems(items)` | no-op after `destroy()`; shallow-copies; bumps version; notifies | `tests/sortable/collection-policy.node.test.ts` + browser |
| `cancel(reason?)` | no-op when idle; wraps `reason` as `{type: CANCEL_CONSUMER, detail: reason}` | both browser suites |
| `destroy()` | idempotent; **synchronous physical teardown**; no terminal callback afterwards | both browser suites |

## 3. Callback timing guarantees

| Guarantee | Status |
| --- | --- |
| `onStart` runs after the lift is acquired and before the first `onMove` | preserved |
| `onMove` runs after the visual has been written for that motion | preserved |
| `onDrop`/`onReorder` receive a dedicated `AbortSignal` that aborts if the operation ends before they settle | preserved |
| `onError` receives `{cause: {stage}, domain}` where `domain` is the in-flight result or `null` | preserved |
| `onFinish`/`onCancel` run **after** temporary presentation is released | preserved — load-bearing |
| No callback fires after `destroy()` | preserved |

## 4. Resolved ledger decisions

### <a id="d-1"></a>D-1 — release-time interaction and cancellation

**Today:** pointer listeners, capture, invalidation and Escape remain armed through consumer resolution.

**Target decision:** after release, commit an input-closed state, stop pointer movement/release, pointer capture, spatial frame work and invalidation before final geometry. Keep a distinct cancellation ingress alive until the consumer resolver settles:

- `controller.cancel()` remains valid;
- Escape remains valid;
- cancellation aborts the resolver's dedicated signal;
- pointer movement, pointer release, pointercancel and stale frames cannot change the proposal after release.

This preserves the user's escape hatch without retaining mutable release-time geometry.

### <a id="d-2"></a>D-2 — per-operation cancel latch

Adopt a first-valid-cancel-wins latch keyed to the exact current operation. `cancel()` is a no-op when closed, idle or non-cancellable and must not touch the latch or queue in those cases. Clear the latch on consumption, stale ignore, retirement, destroy and panic.

### <a id="d-3"></a>D-3 — readiness failure terminal reporting

Fix sortable's current double-reporting behaviour. A readiness rejection or timeout reports `onError` only; neither feature may subsequently invoke `onFinish` or `onCancel` for that operation. Recovery remains feature-specific: draggable uses home/immediate replacement recovery, sortable remains immediate.

### <a id="d-4"></a>D-4 — live policy updates

Preserve current behaviour: `POLICY_UPDATED` applies in every draggable phase, including settling, reporting and finalizing. A landing that has not yet read `landingTiming` may observe a policy update.

### <a id="d-5"></a>D-5 — async identity checks

Validate attempt identity once at the async producer/completion boundary and again when the queued action is applied. This is a semantic two-layer check, not a requirement for a dedicated owner object.

### <a id="l-7"></a>L-7 — admission-factory throws

Preserve current behaviour: `handle`, `getVisual` and `getHandle` may throw out of the native listener. No operation is committed and the controller remains idle and usable. Add explicit tests.

### <a id="l-8"></a>L-8 — unused failure stages

Remove `FAILURE_CONTROLLED_UPDATE` and `FAILURE_SCHEDULED_FRAME` from the target public union unless a real target path is introduced before cutover. The package is pre-release and neither stage has ever been raised.

### <a id="l-9"></a>L-9 — sortable cancellation during activation

Fix the latent bug:

- while activation resources are still local/uncommitted, cancellation rolls them back and abandons silently;
- after activation resources commit and `onStart` is in flight, cancellation enters normal canceled settlement and eventually `onCancel`;
- cancellation is never reported as `FAILURE_ACTIVATION` and a `CancellationReason` is never passed as an error.

### <a id="l-10"></a>L-10 — controlled position ownership

Copy `x` and `y` at dispatch instead of retaining a caller-owned `Point`.

### <a id="l-11"></a>L-11 — panic ingress retention

Panic aborts controller ingress, tears down all resources, clears both frames, queue arguments, latches, attempts and DOM-bearing caches, then reports.

## 5. Required coverage added by the ledger

1. `update({position})` is applied after policy update and copies coordinates.
2. `bounds: undefined` explicitly clears bounds and bumps `boundsVersion`.
3. Admission-factory throws escape while leaving the controller idle and usable.
4. Sortable activation cancellation follows the new acquisition/starting split.
5. Declaration/export snapshot for both entry points.
6. Readiness failure reports only `onError` in both features while retaining the approved feature-specific recovery.
7. Escape/controller cancellation remains available during async resolution, while pointer/spatial input is already closed.
8. Panic removes controller ingress and operation-owned references.

Every item is a coverage obligation in artifact 9; the number of physical tests is intentionally not prescribed.
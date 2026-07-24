# Artifact 2 — Action classification and queue traces

Classifies every ingress into the five classes the proposal defines, fixes the argument-ownership rule for each, and records the queue traces the new runner must reproduce.

## 1. The runner today

`createSession` (`src/kernel/session.ts`) is already a FIFO run-to-completion runner:

- `dispatch` pushes onto `queue` and returns immediately if a drain is running;
- the outermost drain iterates `queue` by index, so entries appended during the drain are processed in the same pass;
- `finally { queue.length = 0 }` clears the queue only in the outermost frame;
- a throw anywhere in decide-or-effect calls `close()` then `panic(error)`;
- `close()` sets `terminal`, clears the queue and **nulls the state**, so every later `dispatch` is a no-op.

The new runner must preserve all five properties. The observable consequences are tested in `tests/kernel/session.node.test.ts` (9 tests).

## 2. Classification

### 2.1 Edge-triggered external input

Every invocation is preserved with its own argument, in FIFO order.

| Action | Feature | Argument | Ownership class | Source |
| --- | --- | --- | --- | --- |
| `ADMIT_POINTER` | both | admission snapshot (item, visual, pointerId, point[, collection snapshot]) | 2 — library-owned immutable snapshot, built in the native listener | `#admitPress` |
| `ADMIT_KEYBOARD` | sortable | as above + precomputed `insertion` | 2 | `#handleKeydown` |
| `POINTER_MOVED` | both | `{pointerId, point}` — a **copied** `Point`, not the native event | 2 | `operation.begin` emit callback |
| `POINTER_RELEASED` | both | as above | 2 | ditto |
| `OPERATION_CANCELED` | both | `CancellationReason` | 2 | `cancel()`, Escape, pointercancel, policy |
| `COLLECTION_UPDATED` | sortable | `CollectionSnapshot` | 2 — `collection.replace` shallow-copies the caller array | `#handleSnapshot` |
| `POLICY_UPDATED` | draggable | freshly built `DraggablePolicy` | 2 | `update()` |
| `CONTROLLED_POSITION` | draggable | caller-supplied `Point` | **3 — caller-owned, retained by reference** | `update()` |

> **Finding.** `CONTROLLED_POSITION` carries `next.position` straight from the caller onto the queue without copying (`draggable.ts:168`). A caller that mutates the object it passed to `update()` before the drain reaches the event would change the committed position. `Point` is typed `Readonly<>`, so this is a type-level guarantee only. The new runtime should copy the two scalars at dispatch. No test covers this today.

Baseline for collection ownership is already correct: `createCollection.replace` does `[...items]` and bumps `version`, so a later caller mutation cannot change an already-queued snapshot. The proposal's requirement 23 is satisfied today and must stay satisfied.

#### Target transport rule

The table above records the **current** transport, not a required allocation shape. The target runtime preserves semantic ownership as follows:

- stable scalar pointer input (`pointerId`, `clientX`, `clientY`) may queue the existing native `PointerEvent` by reference under a narrow `Pick<>` type; the event must be consumed by the synchronous runner and must not cross into rAF, promises, animations or stored operation state;
- dispatch-scoped admission data (`composedPath()`, timely `preventDefault()`, listener target context) must be captured or acted on before the native listener returns; a small admission snapshot is allowed;
- caller-owned controlled coordinates are copied as two scalars at dispatch;
- collection replacement always owns a shallow ordered snapshot.

Meaningful external input values are not the protocol envelopes the redesign is removing.

### 2.2 Level-triggered / coalesced

Only the latest condition matters.

| Slot | Feature | Key | Invalidation rule |
| --- | --- | --- | --- |
| `pendingMotion` | draggable | `motionId` | Overwritten by any later `POINTER_MOVED`, `INVALIDATED` or `CONTROLLED_POSITION`; the superseded observation result fails its `motionId` guard and is dropped. |
| `pendingSpatial` | sortable | `(operationId, collectionVersion, spatialId)` | Overwritten per move; also invalidated by a collection version bump. |
| `FrameTask` | kernel | — | One rAF handle, latest value only; `flush()` runs pending work synchronously, `cancel()` drops it. |
| `InvalidationSource` | kernel | — | Scroll (capture) + resize both collapse into a single `INVALIDATED` action per event. |

Only these are latest-wins. Pointer and collection input are **not** coalesced.

### 2.3 Reentrant callback checkpoints

Today these are named as result events. The proposal requires role-descriptive names; the mapping the new runtime should use:

| Today | Role | Proposed name |
| --- | --- | --- |
| `START_SUCCEEDED` | resume after `onStart` returned | `COMMIT_START_AFTER_CALLBACK` |
| `FAILURE_REPORTED` | resume after `onError` returned | `CONTINUE_AFTER_ERROR_REPORT` |
| `FINALIZATION_COMPLETED` | resume after `onFinish`/`onCancel` returned | `RETIRE_AFTER_TERMINAL_CALLBACK` |
| `INTERACTION_STOPPED` | gate flip after listeners aborted | `INTERACTION_GATE_CLOSED` |

All four carry `operationId` and are guarded by `sameOperation`. All four are dispatched **only if `operation.current(effect)` still holds** after the callback returns — a callback that destroyed the controller or retired the operation produces no checkpoint at all.

### 2.4 Async completion

| Attempt | Identity | Staging | Completion action |
| --- | --- | --- | --- |
| Drop/reorder resolution | `AbortController` + `completed()` flag + `ResolutionCurrency` | one-shot `complete()` | `DROP_RESOLVED` / `REORDER_RESOLVED` or `*_FAILED` |
| Presentation readiness | `ResolutionCurrency` + `done` flag + 500 ms timer | `settle()` guarded by `done` | `PRESENTATION_SETTLED` |
| Landing animation | `LandingCurrency` | animation `finished` promise | `LANDING_FINISHED` / `LANDING_FAILED` |
| Spatial frame | `SpatialCurrency` | `FrameTask` | `ACTIVE_INSERTION_RESOLVED` / `PROPOSAL_INSERTION_RESOLVED` |

Every one is intended to validate identity twice: once at the async producer/completion boundary before dispatching, and once when the queued action is applied. Current sortable readiness validates only in the FSM — see [D-5](06-presentation-readiness.md#currency). The target must use both checks, but neither check requires a dedicated owner object.

### 2.5 Barrier actions

`PRESENTATION_SETTLED` and the landing chain are barrier completions. They are never coalesced and never survive operation retirement: `stopSettlementOwners()` disposes the resolution, barrier and landing owners together, and every owner's `stop()` makes its pending settlement inert.

## 3. Required queue traces

These are the traces the proposal names explicitly. Each must be a test.

### 3.1 `MOVE(A), MOVE(B)`

```
dispatch POINTER_MOVED(A)      queue=[A]            drain starts
  decide DRAGGING+A            pendingMotion=m1(A)  effect OBSERVE(m1)
  effect OBSERVE(m1) -> dispatch MOTION_OBSERVED(m1)   queue=[A, obs1]
dispatch POINTER_MOVED(B)      queue=[A, obs1, B]   (nested; appended)
  decide obs1                  commit A; pendingMotion=null; PRESENT + INVOKE_MOVE
  decide B                     pendingMotion=m2(B)  effect OBSERVE(m2)
  ...                          commit B
```

Both moves are committed, in order. Neither argument is lost.

### 3.2 `MOVE(A), CANCEL, MOVE(B)`

```
queue=[A]  -> obs1 appended
CANCEL arrives (consumer calls cancel() from onMove)
queue=[A, obs1, CANCEL, B]
  obs1   -> commits A, invokes onMove (which enqueued CANCEL)
  CANCEL -> DRAGGING accepts: settlement, STOP_INTERACTION, -> DRAG_SETTLING
  B      -> DRAG_SETTLING ignores POINTER_MOVED  (dropped, deterministically)
```

Cancellation wins; the later move is inert, not an error. **`MOVE(B)` must not resurrect the operation.**

### 3.3 Callback queues cancel then throws

```
onMove:  controller.cancel(r);  throw e;
queue=[..., OPERATION_CANCELED, MOVE_CALLBACK_FAILED]
```

`callbacks.move` catches, re-checks `operation.current`, then dispatches `MOVE_CALLBACK_FAILED` — which lands _after_ the cancel the callback already queued. FIFO gives `CANCEL -> FAILURE_CHECKPOINT`, which is exactly the ordering the proposal mandates. **This is preserved behaviour, not a change.**

If the callback calls `destroy()` instead, `session.close()` sets `terminal`; the subsequent `dispatch` is a no-op and `runEffect` returns `false`, stopping the batch. The failure is inert and silent, as required.

### 3.4 Collection replacement during a drain

```
onReorder: controller.updateItems([...])   (reentrant)
  collection.replace  -> subscriber -> dispatch COLLECTION_UPDATED
  queue=[..., REORDER_RESOLVED, COLLECTION_UPDATED]
  REORDER_RESOLVED    -> SORTABLE_SETTLING
  COLLECTION_UPDATED  -> SORTABLE_SETTLING ignores it
```

See [artifact 7](07-sortable-collection-matrix.md) for the full phase matrix.

### 3.5 Operation replacement

A new `ADMIT_POINTER` can only be accepted from idle — both controllers gate on `state.phase === IDLE` in the native listener _and_ the FSM only accepts `ADMIT_*` in `decideIdle`. So operation replacement never overlaps: operation _N+1_ cannot begin until _N_ has retired.

`BEGIN_POINTER_OPERATION` nevertheless calls `retire()` first (draggable `operation.ts:76`), and `execute` calls `resetOwners()` before it, so a defensive double-retire is a no-op.

### 3.6 Stale checkpoint reaching a new same-named phase

The dangerous shape is: operation 1 reaches `DRAG_SETTLING`, is retired, and operation 2 later reaches `DRAG_SETTLING`; a checkpoint minted by operation 1 arrives.

Every checkpoint carries `operationId`, and `operationId` is monotonic per controller (`nextOperationId`), so `sameOperation` rejects it. Additionally the effect owner's `current()` returns false once `operationId` has been reset to 0 by `retire()`, so most stale checkpoints are never dispatched at all.

The two-layer check must be preserved: **producer-level identity prevents a stale dispatch, action-level identity prevents a stale transition.** Dropping either layer leaves a hole. These layers are semantic boundaries, not a mandate to recreate owner objects.

## 4. Rules for the new runtime

1. Copy `CONTROLLED_POSITION`'s coordinates at dispatch (fixes §2.1 finding).
2. Keep the single `pendingMotion` / `pendingSpatial` coalescing slots; do not generalise them into a shared latest-wins mechanism.
3. Validate currency at both the async producer boundary and the queued action boundary; do not recreate owner objects merely to host those checks.
4. Closing must make dispatch structurally inert and clear both frames, queue arguments, attempts, latches and DOM-bearing caches.
5. Preserve FIFO precedence of a callback-queued cancel over that callback's own throw checkpoint.
6. On release, close movement/spatial ingress but retain a dedicated Escape/controller-cancel ingress until consumer resolution settles (D-1).
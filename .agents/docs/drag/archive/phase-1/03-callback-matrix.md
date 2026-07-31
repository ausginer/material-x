# Artifact 3 — Callback and factory matrix

Every consumer boundary in the package, with the seven properties the proposal requires: entry state, commit timing, cancel/destroy behaviour, mandatory post-callback checks, rollback, continuation, and throw precedence.

Columns:

- **When** — before or after the semantic commit that the callback describes.
- **Post-check** — what must be revalidated after it returns.
- **Throws →** — the failure stage and the state the machine enters.

---

## 1. Value-producing factories (run during preparation)

These run **before** commit and their result determines the next state. They are the reentrancy-critical boundaries.

| Boundary | Feature | Called from | When | Visible phase on entry | Post-check | Rollback on throw | Throws → |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `options.handle(item)` | draggable | native `pointerdown` listener | before any dispatch | `DRAG_IDLE` | controller `#terminal` + phase re-read | none needed — nothing acquired | propagates to the DOM listener (uncaught) |
| `options.getVisual(item)` | draggable | constructor only | construction | n/a | n/a | n/a | propagates from `draggable()` |
| `options.getVisual(item)` | sortable | native listener, per admission | before dispatch | `SORTABLE_IDLE` | as above | none | propagates to the DOM listener |
| `options.getHandle(item)` | sortable | `resolveSortablePress` in native listener | before dispatch | `SORTABLE_IDLE` | as above | none | propagates to the DOM listener |
| `options.items()` | sortable | constructor + `updateItems` | — | any | — | none | propagates to caller |
| `createPlaceholder(ctx)` | sortable | activation acquisition | before `ACTIVATION_READY` | `SORTABLE_ACTIVATING{acquiring}` | `operation.current` | activation coordinator disposes partial acquisitions | `ACTIVATION_FAILED` → `FAILURE_ACTIVATION` → idle |
| `resolveHomeTarget(req)` | draggable | `PREPARE_FREE_LANDING` | before `LANDING_PLAN_RESOLVED` | `DRAG_SETTLING`, landing `PREPARING` | landing currency | none — plan not yet committed | `LANDING_PLAN_FAILED` → `FAILURE_HOME_TARGET` |
| `landingTiming()` | both | `START_LANDING` | before `LANDING_STARTED` | `DRAG_SETTLING`, landing `STARTING` | landing currency | animation not created | `LANDING_TIMING_FAILED` → `FAILURE_LANDING_TIMING` |

> **Finding.** `handle`, `getVisual` and `getHandle` are invoked directly inside the native listener with no `try`/`catch`. A throwing resolver escapes to the DOM, is reported by the browser, and leaves the controller idle and usable. That is defensible, but it is undocumented and untested. The new runtime must **Resolved (L-7).** Preserve this behaviour: the exception escapes the native listener, no operation is committed, and the controller remains idle and usable.

## 2. Resolution callbacks (async, own an attempt)

| Boundary | Feature | When | Entry phase | Attempt identity | Cancel during | Destroy during | Post-check | Throws / rejects → |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `onDrop(request, {signal})` | draggable | before commit of the outcome | `DRAG_AWAITING_CONSUMER` | `ResolutionCurrency` + `AbortController` + `completed()` | accepted: `OPERATION_CANCELED` settles as `OUTCOME_CANCELED`; the resolution's signal is aborted by the interaction scope disposer | `destroy()` aborts the signal and makes the settlement inert | currency match in owner **and** FSM | `DROP_RESOLUTION_FAILED` → `FAILURE_DROP_RESOLUTION` → failed settlement |
| `onReorder(request, {signal})` | sortable | before commit | `SORTABLE_RESOLVING` | same shape | `OPERATION_CANCELED` → `OUTCOME_CANCELED` at `REORDER_CANCELED_AT_CONSUMER`, **proposal preserved** | as above | as above | `REORDER_RESOLUTION_FAILED` → `FAILURE_REORDER_RESOLUTION` |

Both are validated on return: a resolved value that is not a `{type: OUTCOME_ACCEPTED|OUTCOME_REJECTED}` object is rejected by `isResolution` and routed to the failure path. **A fulfilled invalid value and a rejected promise must stay distinguishable** — the settlement is a discriminated union, not a nullable value. This is an explicit invariant in the proposal and holds today.

`signal` is aborted through `operation.useInteraction(...)` with a `completed()` guard, so completing normally does not abort, and stopping interaction on an unfinished resolution does.

## 3. Notification callbacks (run after commit)

| Boundary | Feature | When | Entry phase | Resources visible | Post-check | Continuation | Throws → |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `onStart(geometry)` | draggable | after `DRAG_STARTING` committed, before `DRAGGING` | `DRAG_STARTING` | lift + renderer held; interaction armed | `operation.current` → checkpoint `START_SUCCEEDED` | queued checkpoint | `START_FAILED` → `FAILURE_ACTIVATION` → idle |
| `onStart(item)` | sortable | after activation committed | `SORTABLE_ACTIVATING{starting}` | placeholder + visual held | `operation.current` | queued checkpoint | `START_FAILED` → `FAILURE_ACTIVATION` → idle |
| `onMove(geometry)` | draggable | after motion committed and **after** `PRESENT_MOTION` | `DRAGGING` | all | `operation.current` decides `CONTINUE_BATCH`/`STOP_BATCH`; no checkpoint on success | none — it is the last effect of the batch | `MOVE_CALLBACK_FAILED` → `FAILURE_MOVE` → failed settlement |
| `onError(error, {cause, domain})` | both | after `DRAG_REPORTING_FAILURE`/`SORTABLE_REPORTING` committed | reporting | varies | `operation.current` → `FAILURE_REPORTED` | queued checkpoint | swallowed by `reportError_`, which falls back to platform reporting |
| `onFinish(result)` | both | after presentation released | finalizing | **none** — presentation already disposed | `operation.current` → `FINALIZATION_COMPLETED` | queued checkpoint | `FINALIZATION_FAILED` → `FAILURE_FINISH_CALLBACK` |
| `onCancel(result)` | both | as above | finalizing | none | as above | as above | `FINALIZATION_FAILED` → `FAILURE_CANCEL_CALLBACK` |

### 3.1 The `onMove` continuation rule

`onMove` is emitted as the **second** element of the motion effect array, after `PRESENT_MOTION`. Nothing follows it in the batch. It therefore satisfies the proposal's rule 1 ("literally the last externally visible operation in the action") without needing post-callback guards for correctness — but `callbacks.move` still returns `STOP_BATCH` when the operation went stale, which matters because a reentrant `destroy()` inside `onMove` must not let any later effect in a longer batch run. Preserve both.

### 3.2 Terminal callbacks run after cleanup

`callbacks.finalize` does, in order:

```
presentation.release()      // dispose temporary presentation
stopSettlementOwners()      // resolution, barrier, landing inert
effect.callback?.()         // onFinish / onCancel
dispatch(FINALIZATION_COMPLETED)
```

**`onFinish`/`onCancel` therefore observe the DOM with the lift and placeholder already gone.** This is a load-bearing public guarantee (a consumer commits its authored DOM in `onFinish` and must not fight the temporary presentation) and is covered by browser tests. It is invariant "terminal callbacks occur after required presentation cleanup" in the proposal.

## 4. Destroy and cancel behaviour inside callbacks

| Consumer action inside a callback | Effect |
| --- | --- |
| `controller.cancel(r)` | If closed, idle or not cancellable, no-op without touching latches or the queue. Otherwise the first valid request for the current operation wins, becomes immediately visible to preparation through the latch, and is enqueued in FIFO order. During consumer resolution the dedicated cancel ingress remains alive even though pointer/spatial ingress is closed. |
| `controller.destroy()` | **Synchronous physical teardown before `destroy()` returns**: `session.close()` (queue cleared, state nulled) then `effects.destroy()` (owners reset, `OperationResources.destroy()`) then `controllerAbort.abort()`. Every later dispatch is inert. No terminal callback fires. |
| `controller.update(...)` (draggable) | Two dispatches, both enqueued; policy first, then controlled position. |
| `controller.updateItems(...)` (sortable) | Collection replaced synchronously (version bumped), subscriber dispatches `COLLECTION_UPDATED`, enqueued. |

The synchronous-teardown property is the one most at risk in a rewrite. It must be tested from inside `onStart`, `onMove`, `onDrop`/`onReorder`, `onError`, `onFinish` and `onCancel` — six cases per feature.

## 5. Rules for the new runtime

1. Notification callbacks stay after commit; factories stay before it.
2. After every consumer boundary, re-check operation currency before doing anything externally visible.
3. Preserve `presentation.release()` → `stopSettlementOwners()` → terminal callback ordering exactly.
4. Preserve "callback-queued cancel precedes that callback's own throw".
5. Do not build a generic callback framework. Use a focused helper only where it centralizes non-trivial ordering, currency, rollback or error semantics; call trivial boundaries directly.
6. Preserve L-7: admission factories may throw through the native listener while leaving the controller idle and usable.
7. Sortable activation cancellation follows L-9: silent abandon during local acquisition, normal canceled settlement after resources have committed.
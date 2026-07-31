# 7. Failure, cancellation and resource exit

## Precedence

For one operation, highest first:

```text
DESTROY  >  CANCEL  >  FAILURE_CHECKPOINT
```

Destroy terminalizes: the queue is cleared and the state scrubbed, so a failure
queued afterwards is never dispatched and never observable. A callback that
queues `cancel()` and then throws produces **cancel then failure**, because the
throw checkpoint is enqueued from the `catch` after the body already ran — the
ordering is a consequence of FIFO, not a special case.

## Classified failures

A classified failure is a real execution failure the library expected could
happen. It carries a `FailureCause.stage` and a recovery policy, and it is
**always queued** — never thrown at the producer — so work a consumer callback
already enqueued keeps its place.

```ts
type FailureCause = Readonly<{ stage: number }>;

type DragErrorContext = Readonly<{
  cause: FailureCause;
  domain: ReorderTransactionResult | null;
}>;
```

### Stages for vertical sortable

Derived from what this behavior can actually fail at. The shipped package's
draggable-only stages are not carried over.

| Stage | Raised when | Recovery |
| --- | --- | --- |
| `FAILURE_ADMISSION` | arming operation ingress throws | none; stay idle |
| `FAILURE_ACTIVATION` | lift, placeholder factory, capture or `onStart` throws | `IMMEDIATE` |
| `FAILURE_RENDERER_WRITE` | the transform write on the lifted visual throws | `HOME` |
| `FAILURE_INSERTION` | the insertion rule throws or resolves nothing | `HOME` |
| `FAILURE_PLACEHOLDER_MOVE` | repositioning the placeholder throws | `HOME` |
| `FAILURE_INVALIDATION` | a scroll/resize invalidation handler throws | `HOME` |
| `FAILURE_SCHEDULED_FRAME` | the coalesced frame task throws | `HOME` |
| `FAILURE_REORDER_RESOLUTION` | `onReorder` throws, rejects, or resolves to a non-explicit value | `HOME` |
| `FAILURE_LANDING_CREATE` | the landing runner factory throws | `IMMEDIATE` |
| `FAILURE_LANDING_INTERRUPTED` | the runner reports interruption | `IMMEDIATE` |
| `FAILURE_LANDING_PIN` | `pin()` throws | `IMMEDIATE` |
| `FAILURE_LANDING_TARGET` | measuring the landing plan throws | `IMMEDIATE` |
| `FAILURE_PRESENTATION_READY` | readiness rejects or times out | `IMMEDIATE`, settlement replaced |
| `FAILURE_TERMINAL_CALLBACK` | `onFinish` / `onCancel` throws | none; retire |

Every stage in this table is reachable from vertical sortable. A stage that
cannot be raised does not enter the public union.

### Reporting

`onError(error, { cause, domain })` runs in `REPORTING`. Exactly one report per
failure, and reporting never replaces the initiating error: if `onError` itself
throws, the fallback is the platform reporter, and the original error is still
what reached the consumer first.

`ERROR_REPORTED` carries the operation identity and resumes the stored
`pendingContinuation`, which either settles the operation with `OUTCOME_FAILED`
or retires it outright.

## Cancellation

```ts
type CancellationReason = Readonly<{ type: number; detail?: unknown }>;
```

| Reason | Source |
| --- | --- |
| `CANCEL_POINTER` | `pointercancel` for the owning pointer |
| `CANCEL_ESCAPE` | `Escape` while the cancellation lifetime is open |
| `CANCEL_CONSUMER` | `controller.cancel(reason)` |
| `CANCEL_ITEM_REMOVED` | the dragged item left the collection |
| `CANCEL_COLLECTION_INVALIDATED` | the insertion's neighbours no longer hold |

Rules:

- **First valid cancel per operation wins.** The latch stores the operation
  identity with the reason; a second request for the same operation is dropped.
- **Idle cancel is a no-op** that leaves no latch behind. It must not affect the
  next operation.
- **Cancellation cannot be followed by resurrection.** Once latched, no
  subsequent action re-enters `ACTIVE`.
- The latch clears on consume, stale ignore, retirement, destroy and panic.
- Cancellation stays armed after release, through consumer resolution, and
  aborts the resolver's signal — which is why lifetimes 2a and 2b are separate.
- Cancellation **during activation**, before resources commit, cleanly abandons:
  local acquisitions roll back in reverse order, nothing is published, and no
  callback fires. After activation commits, cancellation follows normal
  settlement and reports through `onCancel`, never `onError`.

## Destruction

`destroy()` is a **synchronous terminal barrier**:

1. set `closed` and `destroyRequested` — every subsequent guard fails;
2. clear the queue and drop every retained argument;
3. retire the operation: attempts inert, all three lifetimes disposed,
   presentation removed, caches emptied, both frames scrubbed;
4. abort controller ingress.

Physical release is complete before `destroy()` returns. No callback fires after
completed destruction. Pending asynchronous work becomes inert at both
validation points. `destroy()` is idempotent.

## Panic

An unexpected throw escaping an action handler is an invariant violation, not a
classified failure. The response is fixed: **close ingress, tear down exactly
once, then report.** Teardown precedes reporting, and a disposer failure never
replaces the initiating error.

## Resource exit paths

Every acquisition has exactly one release path. Cleanup is idempotent and
best-effort: one failing disposer is reported and does not prevent the rest.

| Resource | Acquired at | Released by | Also released by |
| --- | --- | --- | --- |
| Controller `pointerdown` | construction | `destroy()` | panic |
| Motion listeners, pointer capture | activation | release | cancel, destroy, panic |
| Scroll/resize invalidation | activation | release | cancel, destroy, panic |
| Coalesced frame task | activation | release (`cancel()`) | settlement entry, retire |
| `Escape` listener, resolver abort guard | admission | settlement entry | resolver completion, destroy, panic |
| Lift + inline-style snapshot | activation | finalization | cancel, destroy, panic |
| Placeholder element | activation | finalization | cancel, destroy, panic |
| Resolution attempt | release | consumption | retirement, destroy, panic |
| Readiness watch | settlement entry | settlement or timeout | retirement, destroy, panic |
| Landing runner | settlement entry | completion or `destroy()` | retirement, destroy, panic |
| Displacement animations | placeholder move | feature `retire` hook | retirement, destroy, panic |
| Geometry cache element array | first refresh | retirement | destroy, panic |

Invariants:

- temporary DOM presentation never outlives the operation;
- an idle controller retains no DOM from a completed drag;
- ownership transfers only at a deliberate commit boundary;
- a partial acquisition rolls back locally, in reverse order, publishing nothing;
- a committed transition is never silently reverted by a post-commit failure — a
  new failure transition is entered from the committed state instead;
- terminal callbacks occur **after** presentation cleanup, so the consumer
  observes its own authored DOM.

### Required test matrix

Partial activation failure · placeholder factory throws · presentation
acquisition throws · animation creation throws · destroy during active movement
· destroy during consumer resolution · destroy during long landing · disposer
failure does not prevent remaining cleanup · `onStart` cancels · `onStart`
destroys · `onReorder` cancels · `onReorder` destroys · a callback queues work
and then throws · a terminal callback destroys.

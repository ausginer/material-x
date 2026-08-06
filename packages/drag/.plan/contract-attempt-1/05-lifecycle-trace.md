# 5. Lifecycle, seams and the hot path

## Phase × action legality

`—` means the action is ignored deterministically in that phase. Ignoring is never an error and never throws; a handler must be total.

| Action | IDLE | PENDING | ACTIVATING | ACTIVE | RELEASING | SETTLING | REPORTING | FINALIZING |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ADMIT` | → PENDING | — | — | — | — | — | — | — |
| `MOVE` | — | commit sample; maybe activate | — | commit sample; `moved()` | — | — | — | — |
| `UP` | — | retire (below threshold) | — | → RELEASING | — | — | — | — |
| `CANCEL` | — | retire | abandon, no callbacks | → SETTLING (canceled) | → SETTLING (canceled) | — | — | — |
| `START_COMMITTED` | — | — | → ACTIVE | — | — | — | — | — |
| behavior: spatial frame | — | — | — | resolve + commit insertion | — | — | — | — |
| behavior: collection | publish | publish + rebind | deferred | reconcile or cancel | publish only | publish only | publish only | publish only |
| `RESOLUTION_SETTLED` | — | — | — | — | classify → SETTLING | — | — | — |
| `READINESS_SETTLED` | — | — | — | — | — | open gate / replace | — | — |
| `LANDING_SETTLED` | — | — | — | — | — | pin, open gate | — | — |
| `FAILED` | — | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| `ERROR_REPORTED` | — | — | — | — | — | — | continue | — |
| `RETIRE` | — | — | — | — | — | — | — | → IDLE |

Only kernel lifecycle handlers write `phase`.

## Transition anatomy

Every substantial action is three stages.

**1. Prepare.** Ingress and phase validation, pure calculation, DOM reads, building immutable public values, and _local_ resource acquisition. Preparation must not mutate `current`.

**2. Commit.** Short and effectively non-throwing: publish prepared leases onto the runtime, then swap the frames.

**3. Post-commit effects.** DOM writes, rendering, closing lifetime stages, scheduling continuations, and notification callbacks for an already-committed transition. If a post-commit effect fails, the committed state stands and a new failure transition is entered from it.

```ts
try {
  lift = acquireLift(/* … */);
  placeholder = slots.createPlaceholder
    ? slots.createPlaceholder(context)
    : realm.document.createElement('div');
  item.after(placeholder);
  releaseCapture = acquirePointerCapture(item, pointerId);
} catch (error) {
  releaseCapture?.(); // reverse order
  placeholder?.remove();
  lift?.dispose();
  kernel.fail(operation, ACTIVATION, error);
  return false;
}

if (!kernel.preparationValid(operation)) {
  // a reentrant destroy or cancel from the placeholder factory: roll back,
  // publish nothing, report nothing
  releaseCapture?.();
  placeholder.remove();
  lift.dispose();
  return false;
}

// ownership transfers here; nothing above this line has been published
```

## Reentrancy

- A nested public call during a drain appends and returns. It never interrupts the action already running.
- A consumer callback may call `cancel()` or `destroy()`; the drain observes the terminal latch on its next iteration.
- Every queued invocation retains its own argument.
- Every post-callback continuation revalidates the operation that created it (`START_COMMITTED`, `ERROR_REPORTED`, `RETIRE` all carry `OperationIdentity`).
- Every factory and callback boundary inside a preparation is followed by a `preparationValid()` re-check before anything is published.

## Complete lifecycle trace

One successful downward reorder, in a controlled React application, with `layoutAnimation()` and `landing({ duration: 200 })` installed. `>` is a queue drain step; indentation is direct calls.

```text
pointerdown on item 2
> kernel listener: !closed, current.operation === null, isPrimaryPress ✔
    kernel.begin()
    spec.admit(event, next)          → resolves item via slots.getHandle,
                                       writes item/visual/snapshot; true
    kernel mints OperationIdentity, creates the three lifetimes,
      arms motion + cancellation ingress
    next.phase = PENDING; pointer scalars = origin
    kernel.commit()

pointermove (+3 px)
> MOVE: phase PENDING, pointerId matches
    begin(); pointerX/Y = sample; commit()
    |Δ| < threshold(8) → nothing further

pointermove (+11 px)
> MOVE: begin(); commit(); |Δ| ≥ threshold
    kernel opens activation:
      originRect = visual.getBoundingClientRect()
      lift = acquireLift(visual, LIFT_FAITHFUL, …)      [prepare]
      spec.activate():
        placeholder = default div, sized from offset box  [prepare]
        item.after(placeholder)
        capture = acquirePointerCapture(item, pointerId)
        preparationValid ✔  → publish:
          presentation.use(() => placeholder.remove())
          presentation.use(lift.dispose)
          motion.use(capture)
          runtime.placeholder = placeholder; rects.dirty = true
          invalidate(motion.signal, () => rects.dirty = true)
        next.insertion = home insertion            → true
      next.phase = ACTIVATING; kernel.commit()
      spec.notifyStart() → slots.onStart(item)
      preparationValid ✔ → dispatch(START_COMMITTED, operation)
> START_COMMITTED: phase ACTIVATING, operation current
    begin(); next.phase = ACTIVE; commit()
    lift.visual.style.transform = composeXY(dx, dy)

pointermove × N                                        ← the hot path
> MOVE: phase ACTIVE, pointerId matches
    begin(); pointerX/Y = sample; commit()
    lift.visual.style.transform = composeXY(dx, dy)
    spec.moved(): spatialSeq += 1; frame.schedule(spatialSeq)

rAF fires
> BEHAVIOR spatial frame: pendingSpatial === attempt, phase ACTIVE ✔
    slots.resolveInsertion(runtime, pointerY)
      refresh rects if dirty (one Float64Array rebuild)
      nearest centre beats the placeholder's own slot → gap 4
    begin(); next.insertion = gap 4; commit()
    slots.beforeMove[…]  → measure neighbour rects
    placeholder DOM move  (sole writer)   ; rects.dirty = true
    slots.afterMove[…]   → re-measure, write inverted transforms, play

pointerup
> UP: phase ACTIVE, pointerId matches
    begin(); phase = RELEASING; pointerX/Y = release point; commit()
    frame.cancel(); pendingSpatial = 0; lifetimes.motion.dispose()
      ── nothing queued can move the result from here on ──
    lift.visual.style.transform = composeXY(dx, dy)
    spec.release():
      rects.dirty = true
      slots.resolveInsertion(…)  synchronous, from the committed release point
      proposal = buildReorderProposal(snapshot, item, insertion)   (immutable)
      begin(); insertion, proposal; commit()
      placeholder DOM move to the final gap
      kernel.resolve(slots.onReorder)
        attempt = createResolutionAttempt()
        cancellation.useWhile(() => !attempt.completed, abort)
        onReorder(request, { signal })
          consumer: setPendingRequest(request); setItems(applyReorder)
          consumer: return accept({ presentationReady: readiness.promise })
        settleResolution(attempt, { ok: true, value })
> RESOLUTION_SETTLED: attempt current, phase RELEASING, settlement present
    consume settlement once; validate explicit resolution ✔
    spec.classify(resolution, next) → OUTCOME_ACCEPTED, RECOVERY_DESTINATION,
                                       next.domain = { ACCEPTED, proposal }
    begin(); phase = SETTLING; outcome; recovery
             landingDone = false; readyDone = false; commit()
    frame.cancel(); lifetimes.cancellation.dispose()
    watchReadiness(presentationReady)         ← gate A opens
    spec.startLanding(RECOVERY_DESTINATION):
      plan = destinationPlan(placeholder.rect, originRect, delta)
      runner = slots.createLandingRunner({ … })   ← gate B opens
    advanceSettlement: gates incomplete → return

React commits; useLayoutEffect resolves readiness
> READINESS_SETTLED: attempt current, phase SETTLING, no error
    begin(); readyDone = true; commit()
    advanceSettlement: landingDone false → return

landing animation finishes (200 ms)
> LANDING_SETTLED: attempt current, phase SETTLING, no error
    runner.pin()   — idempotently commit the completed target
    begin(); landingDone = true; commit()
    advanceSettlement: both gates ✔
      begin(); phase = FINALIZING; commit()
      lifetimes.presentation.dispose()   → placeholder removed, lift restored
      lift = null; placeholder = null; retireAttempts()
      spec.notifyTerminal() → slots.onFinish({ ACCEPTED, proposal })
        ← the consumer observes its own authored DOM, not the drag presentation
      dispatch(RETIRE, operation)
> RETIRE: operation current
    retireOperation() → lifetimes disposed, caches emptied, both frames scrubbed
    phase = IDLE, controller retains no DOM
```

## The pointer-move hot path

The ACTIVE branch, and what the implementation must satisfy.

**Exact call sequence**

1. native `pointermove` listener (motion ingress, `{ signal }`)
2. `receivePointer` — one `current.operation !== operation` identity check, one `event.type` comparison
3. `kernel.dispatch(MOVE, event)` — two array pushes, no allocation
4. `drain` — `running` was `false`, so this frame owns the pass
5. `handleAction(MOVE, event)` — kernel switch, no indirection
6. phase + `pointerId` guards
7. `Object.assign(draft, current)` — 17 fields, fixed shape, one hidden class
8. two scalar writes (`pointerX`, `pointerY`)
9. commit — two reference assignments
10. `lift.composeXY(dx, dy)` — template string, no `Point`
11. `visual.style.transform = …` — the only DOM write
12. `spec.moved()` — one indirect call
13. `spatialSeq += 1`; `frame.schedule(spatialSeq)` — stores a number, may call `requestAnimationFrame` once per frame

**Allocations: none.** The native event is queued by reference under a narrow `PointerCoordinates` (`pointerId`, `clientX`, `clientY`) contract and is not retained past the drain. The spatial attempt is a number, not an object (C-8) — this is the one place the contract deliberately diverges from `packages/drag`, which allocates `{}` per move. The transform string is unavoidable: it is the value the CSSOM requires.

**DOM reads: none.** All geometry the move path needs is already committed as scalars. Measurement happens on the coalesced frame, not per move.

**DOM writes: one.** The transform on the lifted visual.

**Indirect calls: two.** `spec.moved()` and `lift.composeXY()`. Both are stable fields on objects created once per controller/operation.

**Scheduling: one rAF at most per animation frame**, coalesced by the frame task holding the latest value with a presence flag.

**Explicitly forbidden per move:** context objects, candidate objects, tuples, result messages, temporary arrays, plugin descriptors, normalized event wrappers, `Point` allocations, feature iteration, feature filtering, runtime view materialization, `Array.prototype` helpers over the collection.

**Not forbidden:** the `Object.assign` frame copy. It is a fixed-shape, 17-field, monomorphic copy with no allocation, and it is what makes preparation failure unable to corrupt `current`. Removing it to save a branch would be performance theatre; the contract keeps it and requires the implementation to measure rather than assume.

## Release stability

The order in `spec.release()` is normative and must not be reordered:

1. commit the release point and the input-closed phase;
2. close motion ingress and cancel pending frame work;
3. synchronously refresh the geometry required for the final decision;
4. commit exactly one final insertion;
5. construct exactly one immutable reorder proposal;
6. move the placeholder to the final gap;
7. invoke the consumer resolver;
8. on settlement, begin readiness and landing;
9. release temporary presentation only when both gates complete.

Because step 2 precedes step 3, no pending frame, no later pointer sample and no invalidation can alter the proposal. This is why the design needs no separate proposal-stabilisation phase.

The lifted visual lands at the **current** placeholder position, measured after step 6 — never at an earlier measured position.
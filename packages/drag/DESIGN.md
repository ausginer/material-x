# `@ydinjs/drag` architecture

This documents the architecture that ships. It replaces the entity catalogue that described the previous reducer/effect design; that design and its migration are archived under `.agents/docs/drag/`.

The package is an **imperative, action-driven state machine over one runtime container with two transactional state frames**. Input and async completions enqueue actions; each action validates itself against the committed frame, mutates a reusable draft, commits by swapping the two frames, then runs its effects inline.

There is no event object, no effect description, no effect router, no owner graph and no result-event round-trip. Data stays put; control moves.

## Module map

```
src/
  kernel/            platform and lifecycle primitives, feature-agnostic
    lifecycle.ts       phase vocabulary, frame transaction, resolution attempts
    queue.ts           FIFO run-to-completion action queue
    lifetimes.ts       the three releasable stages of one operation
    resource-scope.ts  LIFO, idempotent, best-effort disposer stack
    pointer.ts         pointer ingress, capture, admission predicate
    presentation.ts    inline-style and top-layer leases, lift strategies
    presentation-ready.ts  the authored-presentation barrier (500 ms)
    animation.ts       one landing animation
    invalidation.ts    scroll/resize invalidation, coalesced frame task
    coordinate.ts      viewport <-> local coordinate mapping
    realm.ts           the owning document/window
    protocol.ts        shared enums: failure stages, outcomes, recoveries
    errors.ts          report-once-with-fallback
    types.ts           public geometry and request value types

  draggable/         free dragging
    runtime/{frames,runtime,actions,controller}.ts
    options.ts bounds.ts motion.ts landing.ts request.ts   (pure domain)

  sortable/          collection reordering
    runtime/{frames,runtime,actions,controller}.ts
    options.ts admission.ts geometry.ts insertion.ts rect-index.ts
    keyboard.ts landing.ts placeholder.ts request.ts collection-policy.ts
```

Each feature is four runtime files plus pure domain modules. The pure modules read no state and perform no effects; they are unit-tested directly.

## The runtime container

One object per controller holds everything that controller owns: the action queue fields, both state frames, frozen config and live policy, platform handles, the lifetime stages, and the replaceable async attempts.

`runtime.ts` in each feature defines the container and its teardown paths and **imports nothing from `actions.ts`**. The dependency runs one way: actions read and mutate the container; the container knows nothing about actions.

## Two transactional state frames

`current` is the committed source of truth. `draft` is a reusable candidate.

```ts
const next = beginTransition(runtime); // Object.assign(draft, current)
next.pointerX = event.clientX;
next.pointerY = event.clientY;
applyMotionDelta(next, axis, bounds);
commitTransition(runtime); // swap the two references
```

No transition allocates a state object.

### The shallow-copy contract

`Object.assign(draft, current)` is shallow, so every frame field must be one of:

1. a scalar;
2. immutable from the library's point of view;
3. replace-on-write.

Never copy and then mutate a value both frames now reference. Collections, caches, disposer stacks and attempt records therefore live **outside** the frames, on the container.

### Fixed shape

Both frames are built by the same factory, so they share one key set and one hidden class. `Object.assign` only overwrites keys present on the source, so a fixed shape is what prevents a stale key surviving into a later candidate. Do not add phase-specific properties dynamically.

### Scrubbing

After commit, the inactive frame holds the previous committed state. It is a reusable transaction buffer, not a history snapshot. `resetStateFrame()` clears every reference-bearing field while preserving the shape, and runs on operation retirement — including when the controller stays alive and idle afterwards. An idle controller must not pin the DOM of the drag it just finished.

Destroy and panic additionally clear both frames, the queue and its arguments, the cancel latch, staged attempt settlements, and DOM-bearing caches.

## The action queue

`kernel/queue.ts`. Actions are two parallel arrays — tags and arguments — so an enqueue costs two pushes and no allocation.

- **FIFO.** Entries are processed in order.
- **Run-to-completion.** A nested `dispatch` during a drain appends and returns; the outermost frame owns the pass and reaches the appended entry in the same drain. Nested calls never interrupt an action midway.
- **Terminal latch.** `closed` is re-read every iteration, so a consumer calling `destroy()` from inside a callback stops the drain immediately.
- **Panic.** A throw escaping a handler is an invariant violation: the queue is cleared, the controller is torn down exactly once, and the initiating error is reported afterwards.

Internal synchronous steps do **not** become queue entries. A pointer move is one action that validates, prepares, commits, renders and calls `onMove` — not six.

### What is queued, and why

| Class | Examples | Argument ownership |
| --- | --- | --- |
| Edge-triggered input | pointer move/up, admission, cancel, collection replacement | stable native sample, or a library-owned snapshot |
| Callback checkpoint | `COMMIT_START_AFTER_CALLBACK`, `CONTINUE_AFTER_ERROR_REPORT`, `RETIRE_AFTER_TERMINAL_CALLBACK` | operation identity |
| Async completion | resolution, readiness, landing, spatial frame settled | the attempt object |

Native events are queued by reference under a narrow `PointerCoordinates` (`pointerId`, `clientX`, `clientY`) contract and are never retained past the synchronous drain. Anything needed later is committed as scalars first.

Coalescing is limited to enumerated slots: sortable's single `pendingSpatial` attempt and the rAF `FrameTask`. Pointer and collection input are never coalesced.

## Transition anatomy

Every substantial action is three stages.

**1. Prepare** — ingress and phase validation, pure calculation, DOM reads, building immutable public values, and _local_ resource acquisition. Preparation must not mutate `current`.

**2. Commit** — short and effectively non-throwing: publish prepared leases onto the container, then swap the frames.

**3. Post-commit effects** — DOM writes, rendering, closing lifetime stages, scheduling continuations, and notification callbacks for an already-committed transition. If a post-commit effect fails, the committed state stands; a new failure transition is entered from it.

Acquisition stays local until the commit point:

```ts
try {
  lift = acquireLift(...);
  placeholder = insertPlaceholder(...);
  releaseCapture = acquirePointerCapture(...);
} catch (error) {
  releaseCapture?.(); // reverse order
  placeholder?.dispose();
  lift?.dispose();
  fail(...);
  return;
}

if (!preparationValid(runtime, operation)) {
  /* a reentrant destroy or cancel: roll back, publish nothing */
  return;
}

// ownership transfers here; nothing above this line has been published
```

## The operation lifecycle

Both features run the same eight phases, with the same numeric values (`kernel/lifecycle.ts`). Draggable's active phase and sortable's are the same phase.

| Phase        | Meaning                                                      |
| ------------ | ------------------------------------------------------------ |
| `IDLE`       | No operation. The only phase that admits input.              |
| `PENDING`    | Admitted; below the activation threshold.                    |
| `ACTIVATING` | Presentation acquired and committed; `onStart` in flight.    |
| `ACTIVE`     | Live, tracking input.                                        |
| `RELEASING`  | Input closed, geometry final, consumer resolving.            |
| `SETTLING`   | Outcome committed; awaiting the landing and readiness gates. |
| `REPORTING`  | `onError` in flight.                                         |
| `FINALIZING` | Presentation released; terminal callback in flight.          |

Only lifecycle action handlers change `phase`.

## Resource lifetimes

Five, in release order. `kernel/lifetimes.ts` owns the middle three.

| # | Lifetime | Contents | Closed at |
| --- | --- | --- | --- |
| 1 | Controller ingress | `pointerdown`; sortable's container `keydown` | `destroy()` / panic |
| 2a | Motion ingress | pointer move/up/cancel, pointer capture, scroll + resize invalidation, spatial frame | **release** |
| 2b | Cancellation & resolution | Escape listener, `cancel()` admissibility, the guarded abort for the current resolution attempt | resolver settles, or settlement entry |
| 3 | Temporary presentation | lift, style snapshot, renderer, placeholder | finalization, after landing + readiness |
| 4 | Async attempts | resolution, readiness, landing, spatial | per-attempt retirement |

**2a and 2b must stay separate.** Release closes motion so nothing can move the geometry the proposal was resolved from, while cancellation stays armed so a consumer can still abandon an unresolved drop. They previously shared one `AbortSignal`; closing them together would abort the resolver's signal the instant `onDrop` opened.

Every close is latched and idempotent. Disposal within a stage is LIFO and best-effort: one disposer throwing is reported and does not stop the rest.

## Async attempts and identity

An attempt is a plain record on the container, compared by object identity. There are no branded currency objects and no ids threaded through call chains.

Identity is validated **twice**: once at the producer boundary before dispatching, and again when the queued action is applied. The two layers guard different windows — an owner may be reset at a different moment than the frame phase — so both are required.

A resolution attempt distinguishes `completed` from `settlement`:

- `settlement` is the discriminated payload, **cleared once consumed**, so a fulfilled `undefined` and a rejected `undefined` stay distinguishable;
- `completed` records that the resolver produced a result at all.

The abort guard keys off `completed`. Keying it off the payload aborts a finished resolver's own signal.

## Failure model

Classified failures carry a `FailureCause.stage` and a recovery policy, and are **always queued**, so work a consumer callback already enqueued keeps its place.

Precedence for one operation, highest first:

```
DESTROY  >  CANCEL  >  FAILURE_CHECKPOINT
```

Destroy terminalizes: the queue is cleared and the state scrubbed, so a failure queued afterwards is never dispatched and never observable. A callback that queues `cancel()` and then throws produces cancel-then-failure, because the throw checkpoint is enqueued from the `catch` after the body already ran.

An unexpected throw is a panic: close ingress, tear down exactly once, then report. Teardown precedes reporting, and a disposer failure never replaces the initiating error.

## The authored-presentation barrier

Temporary presentation is released only when **both** independent gates are complete:

```
landing finished or was skipped   AND   authored presentation is ready
```

The gates start and settle independently; neither awaits the other. A resolution may carry `presentationReady`; absent, that gate is complete immediately. The wait is bounded by `PRESENTATION_READY_TIMEOUT` (500 ms) — a promise that never settles would otherwise strand the gesture with the lift held.

A readiness rejection or timeout **replaces the settlement** while keeping the presentation owned and visible: old attempts go inert, the outcome becomes `OUTCOME_FAILED` with the domain result preserved, and recovery restarts. It reports through `onError` **only** — no `onFinish` or `onCancel` follows. Draggable's replacement recovery is home-or-immediate; sortable's is immediate.

Terminal callbacks run **after** presentation is released, so a consumer observes its own authored DOM rather than the drag presentation.

## Draggable specifics

The hot path is allocation-free: a committed frame holds pointer and delta as loose scalars, `applyMotionDelta` writes the axis-constrained, bounds-clamped delta straight into the draft, and `VisualLiftSession.composeXY` composes the transform from scalars.

Bounds are cached per `boundsVersion`; a function-valued `bounds` is authoritative on every read and never cached. A policy update from `update()` applies in every phase, settlement included.

## Sortable specifics

**Release contract.** Release commits the exact release point and an input-closed phase, _then_ closes motion ingress and cancels pending frame work, _then_ re-measures and resolves the final insertion synchronously, builds the proposal, and enters consumer resolution. Nothing pending can move the result. This is why sortable needs no separate proposal-stabilisation phase.

**Placeholder position is committed state.** The insertion lives in the frame; moving the placeholder is a post-commit effect and the sole writer of its DOM position.

**Geometry.** `RectIndex` packs every non-dragged item's rect into one `Float64Array` (stride 6) with a parallel element array, indexed by destination slot, so a frame's nearest-centre search is one scalar scan. It is marked dirty by scroll, resize, a committed placeholder move, a collection version change, and release; a refresh rebuilds only when dirty or the version moved.

**Hysteresis.** The placeholder's own slot is a candidate in the nearest-centre search, so a gap is proposed only once another item's centre is genuinely closer.

**Keyboard.** A command is a complete one-slot move, not an interactive drag: it activates without a threshold, carries its own authoritative gap, and goes straight to the release path.

**Collection changes.** `reconcileCollection` is pure and identity-based: a gap survives only if its exact neighbours remain adjacent. Intent is never recomputed from the latest pointer — the gap survives or the operation ends. Replacements are ignored from `RELEASING` onward; the transaction is decided.

## Deliberately duplicated

Roughly 230 lines across the two `actions.ts` files are structurally identical (`dispatch`, `receivePointer`, `requestCancel`, `watchReadiness`, `handleLandingSettled`, `handleFinalized`, `handleErrorReported`, `settleResolution`). They are **not** shared, deliberately.

Sharing them requires either a `dispatch` reference on the container or a runtime generic over its action table. The first adds an indirect call to the hot pointer path; the second is a generic action runtime. Measurement showed that deduplicating source text yields no compressed-size benefit — Brotli already collapses the repetition — so there is nothing to buy with that cost.

What _is_ shared is what was proven shared: the lifecycle vocabulary, the frame transaction primitives, the resolution-attempt completion semantics, and the platform kernel.

## Invariants

**State.** `current` is always valid. `draft` is never observable as authoritative. A preparation throw cannot partially mutate `current`. Commit is a short, non-throwing swap. The inactive frame is scrubbed once its previous-state window closes.

**Lifecycle.** At most one operation per controller. Stale actions are ignored deterministically. Cancellation cannot be followed by resurrection. Destroy is terminal and synchronous; no callback fires afterwards. No stale async continuation mutates a newer operation.

**Reentrancy.** Nested calls never interrupt an action. FIFO ordering is explicit and tested. Edge-triggered invocations keep their own arguments. Checkpoints validate their creating operation. Idle `cancel()` is a no-op that leaves no latch behind; the first valid cancel per operation wins.

**Resources.** Every acquisition has one release path. Partial activation rolls back locally, in reverse order. Ownership transfers only at commit. Cleanup is idempotent and best-effort. Terminal callbacks occur after presentation cleanup.

## Where to look

| Question | File |
| --- | --- |
| What phases exist, how a commit works | `kernel/lifecycle.ts` |
| How ordering and reentrancy are guaranteed | `kernel/queue.ts` |
| What is released when | `kernel/lifetimes.ts` |
| What a feature does on a given input | `<feature>/runtime/actions.ts` |
| What one operation owns | `<feature>/runtime/runtime.ts` |
| What is committed state | `<feature>/runtime/frames.ts` |
| How native input gets in | `<feature>/runtime/controller.ts` |
| The public surface | `<feature>/options.ts` |

The behavioural contract, decision ledger and measurement log live in `.agents/docs/drag/phase-1/`.
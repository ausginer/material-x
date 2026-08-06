# `@ydinjs/drag` runtime architecture reset

## Status

**Revision 3 — implemented and accepted. Historical.**

All six phases shipped. `packages/drag/DESIGN.md` has been rewritten to document the architecture that actually ships and is now the normative reference; this document is kept as the statement of intent that produced it.

**Where this proposal and the shipped code differ, the code and [`phase-1/`](phase-1/) win.** The phase-1 artifacts record every deviation that was accepted, with reasons — most importantly the three-lifetime split that D-1 turned out to require, and the decision to leave the two feature action tables duplicated rather than pay for a generic action runtime.

Delivered against the original goals: `draggable` 7.52 → 6.11 kB, `sortable` 8.83 → 7.35 kB, `combined` 14.61 → 11.92 kB (−18.4 %); source files 90 → 38; observable behaviour preserved except for the documented ledger decisions.

The rest of this document is the proposal as approved, unedited.

## Purpose

The current implementation is correct, heavily tested, and sufficiently fast, but its internal architecture is substantially more complicated than the domain requires.

Today, local synchronous browser work is represented as a message-oriented protocol:

```text
input
  -> event object
    -> immutable FSM decision
      -> new state objects
      -> effect object or effect array
        -> effect router
          -> resource owner
            -> result event object
              -> FSM again
```

This produces a large amount of machinery:

- event variants;
- effect variants;
- lifecycle protocol stages;
- immutable state copies;
- currency objects and identifiers;
- owner factories and capability interfaces;
- success and failure round-trips;
- repeated transport of data already owned by the active operation.

The next implementation must remove this protocol rather than merely encode it more compactly.

## Current baseline

Current Brotli sizes:

| Entry       | Exact size |
| ----------- | ---------: |
| `draggable` |    7,517 B |
| `sortable`  |    8,831 B |
| `combined`  |   14,609 B |

Performance is not currently a release blocker. Observed sortable activation is approximately 11 ms at its slowest current point; earlier iterations were closer to 7 ms. Reducing runtime work and allocations is desirable, but it is a secondary result of simplifying the architecture.

Primary goals:

1. reduce bundle size;
2. reduce architectural surface area;
3. make control flow locally understandable;
4. preserve or improve correctness;
5. preserve deterministic reentrancy and cleanup;
6. make allocations and runtime work naturally cheaper.

## Non-goals

This redesign is not:

- an object-event to tuple-event rewrite;
- a class to factory-function rewrite;
- a property-name shortening exercise;
- a bitfield experiment;
- an inheritance or shared-base experiment;
- an attempt to eliminate every allocation;
- an attempt to preserve the current internal API;
- an attempt to preserve the current event, effect, owner, or state taxonomy.

Previous representation experiments changed the physical encoding of the old architecture and produced little or no Brotli improvement. This proposal removes protocol layers and duplicated control flow.

# Core diagnosis

The live domain contains only a small number of changing facts:

1. input and pointer ownership;
2. operation and lifecycle state;
3. collection membership and geometry;
4. presentation and resource state;
5. settlement and asynchronous attempts.

The current implementation repeatedly repackages these facts into new objects. For example, pointer coordinates may travel through:

```text
PointerEvent
  -> Point
    -> pointer event object
      -> pending motion state
        -> observation effect
          -> observation result event
            -> active operation state
              -> geometry request
                -> public geometry object
```

Likewise, item, visual, origin geometry, coordinate mappers, callbacks, insertion state, landing plans, and operation identities are repeatedly copied into events and effects even though they already belong to the active operation.

The redesign must make data stationary and move control instead.

# Target architecture

## One runtime container, two transactional state frames

Each controller owns one stable runtime container.

The runtime contains two reusable, identically shaped state frames:

- `current`: the committed source of truth;
- `draft`: a mutable candidate for the next committed state.

```ts
interface DragRuntime {
  current: DragStateFrame;
  draft: DragStateFrame;

  queue: ActionQueue;
  running: boolean;
  closed: boolean;

  resources: ResourceRuntime;
  attempts: AttemptRuntime;
  geometry: GeometryRuntime;

  cancelRequest: CancelRequest | null;
  destroyRequested: boolean;
}
```

A transition follows this algorithm:

```text
validate ingress against current
  -> copy current into draft
    -> mutate and validate draft
      -> commit by swapping current and draft
        -> execute post-commit effects
```

If preparation fails before commit, `current` remains valid and `draft` is simply discarded and overwritten by the next transition.

```ts
function beginTransition(runtime: DragRuntime): DragStateFrame {
  Object.assign(runtime.draft, runtime.current);
  return runtime.draft;
}

function commitTransition(runtime: DragRuntime): void {
  const previous = runtime.current;
  runtime.current = runtime.draft;
  runtime.draft = previous;
}
```

This provides reducer-like atomic state publication without allocating a new state object for every transition.

## Frame construction

Both frames should normally be created by the same factory:

```ts
function createStateFrame(): DragStateFrame {
  return {
    phase: IDLE,
    operation: null,
    pointerId: NO_POINTER,
    pointerX: 0,
    pointerY: 0,
    deltaX: 0,
    deltaY: 0,
    collection: EMPTY_COLLECTION,
    landingDone: false,
    authoredPresentationReady: false,
  };
}

const runtime = {
  current: createStateFrame(),
  draft: createStateFrame(),
  // ...
};
```

Creating one frame and cloning it once during session construction would also be acceptable if every value is cloneable and identity semantics are preserved. This initialization choice is not architecturally important. Do not spend time optimizing it before the rest of the design works.

`structuredClone()` must not be used per transition.

## Shallow-copy contract

`Object.assign(draft, current)` is intentionally shallow.

Therefore, every field referenced by a transactional frame must satisfy one of these rules:

1. it is a scalar;
2. it is immutable from the library's point of view;
3. it is replace-on-write;
4. it is independently double-buffered;
5. it lives outside the transactional frame and has its own recovery policy.

Unsafe:

```ts
Object.assign(draft, current);
draft.items.push(item); // also mutates current.items
```

Safe:

```ts
Object.assign(draft, current);
draft.items = nextItems;
```

Mutable arrays, maps, sets, caches, disposer stacks, and attempt records must not be shared between `current` and `draft` and then mutated in place.

Start with one reasonably flat frame. Split it into independently double-buffered sections only if measurement or readability demonstrates a real need.

## Fixed shape, frame retirement, and reference scrubbing

Both frames must have exactly the same fixed own-key set, created by the same factory. Do not add phase-specific own properties dynamically. `Object.assign()` only overwrites keys present on the source; a fixed shape prevents stale keys from surviving into later candidates.

After commit, the inactive frame temporarily contains the previous committed state. Post-commit code may read that previous state only until the current action finishes. Any required previous values should be captured into narrow locals.

At the action-finalization boundary, after all post-commit effects that require the previous state have completed, scrub every reference-bearing field in the inactive frame:

```ts
function finishAction(runtime: DragRuntime): void {
  resetStateFrame(runtime.draft);
}
```

`resetStateFrame()` must preserve the fixed shape while clearing operation-owned references such as DOM elements, collections, callbacks, proposals, results, reasons, rectangles, and attempt-related values.

Operation retirement must clear retired references even when the controller remains alive and idle and no later transition occurs.

Destroy and panic must additionally clear:

- both state frames;
- queued action arguments;
- cancel reasons and request latches;
- staged attempt settlements and errors;
- geometry entries that reference DOM elements;
- any other operation-owned retained graph.

The inactive frame is a reusable transaction buffer, not an indefinite history snapshot.

## What belongs outside the frames

Double buffering makes **semantic FSM state** transactional. It cannot undo external side effects.

The following normally live outside the state frames:

- DOM listeners and pointer capture;
- `AbortController` instances;
- placeholder, lift, renderer, and animation leases;
- disposer stacks;
- Promise, rAF, readiness, and landing attempt objects;
- mutable geometry caches;
- browser-owned DOM and animation objects.

These require explicit ownership, attempt identity, local transactional acquisition, or failure recovery.

## Action-driven state machine

The state machine no longer maps data events to immutable state plus effects.

Rejected:

```ts
(state, event) => ({
  state: nextState,
  effects,
});
```

Target:

```ts
function handleAction(
  runtime: DragRuntime,
  action: Action,
  argument: ActionArgument,
): void;
```

An action:

- validates itself against `runtime.current`;
- creates a candidate in `runtime.draft`;
- mutates the candidate directly;
- commits by swapping frame references;
- performs direct post-commit effects;
- enqueues only true external actions or continuations;
- ignores itself when its phase or identity guard is stale.

The FSM determines which operation happens next. It does not transport all data required by that operation through an internal protocol.

Only lifecycle action handlers may change `phase`.

# Ingress and action queue

## The runner is the mutation boundary

External ingress must not mutate the committed state frame before entering the runner.

Rejected:

```ts
runtime.current.pointerX = event.clientX;
runtime.current.pointerY = event.clientY;
dispatch(runtime, POINTER_MOVED);
```

Target:

```ts
dispatch(runtime, POINTER_MOVED, event);
```

The action handler validates the event against `current`, copies `current` into `draft`, and only then commits the new coordinates.

## Stable native samples and dispatch-scoped admission

Native ingress is divided into two categories.

### Stable-field input

A native `PointerEvent` is browser-owned and already allocated. For actions that need only stable scalar fields, the synchronous run-to-completion queue may retain the event reference until the queue drains.

Internal handlers should accept only the fields they require:

```ts
type PointerCoordinates = Pick<
  PointerEvent,
  'pointerId' | 'clientX' | 'clientY'
>;
```

```ts
function pointerMoved(runtime: DragRuntime, event: PointerCoordinates): void {
  dispatch(runtime, POINTER_MOVED, event);
}
```

The handler validates ownership before committing coordinates:

```ts
function handlePointerMoved(
  runtime: DragRuntime,
  event: PointerCoordinates,
): void {
  const current = runtime.current;

  if (current.phase !== DRAGGING || event.pointerId !== current.pointerId) {
    return;
  }

  const next = beginTransition(runtime);
  next.pointerX = event.clientX;
  next.pointerY = event.clientY;
  calculateMotion(runtime, current, next);
  commitTransition(runtime);

  presentMotion(runtime);
  invokeMoveCallback(runtime);
}
```

This creates no library-owned pointer sample or internal event envelope.

The native reference must not escape into Promise continuations, rAF work, animations, persistent operation state, or public callback values. Any data needed beyond the synchronous queue must first be committed as scalars or an owned immutable value.

### Dispatch-scoped admission

Pointer admission and keyboard admission may depend on data or effects that are valid only during the browser's native event dispatch, including:

- `event.composedPath()`;
- `event.currentTarget`;
- timely `event.preventDefault()`;
- other admission preflight that must finish before the listener returns.

Such work must happen synchronously in the native listener. The listener then queues a minimal admitted-input value or an explicit rejection/no-op.

```ts
function onPointerDown(event: PointerEvent): void {
  const path = event.composedPath();
  const admission = preflightPointerAdmission(runtime, event, path);

  if (admission !== null) {
    dispatch(runtime, ADMIT_POINTER, admission);
  }
}
```

A small admission snapshot is meaningful external input, not a recreation of the old internal message protocol.

If keyboard default prevention depends on admissibility, define a synchronous preflight that can safely decide and call `preventDefault()` before queueing the semantic action. Consumer factories used by admission, such as handle or visual resolution, must have explicit reentrancy and rollback rules.

## Action classes

Do not force every action into one storage policy. Classify actions explicitly.

### Edge-triggered external input

Every invocation is preserved in FIFO order with its minimal owned or stable argument.

Examples:

- stable pointer move and release samples;
- admitted pointer and keyboard commands captured during native dispatch;
- a valid per-operation `cancel(reason)`;
- collection replacement;
- explicit controlled updates where intermediate ordering matters.

Arguments must be classified as one of:

1. stable native scalar view queued by reference;
2. library-owned immutable snapshot;
3. caller-owned value read synchronously only;
4. intentionally retained identity/reference;
5. normalized async settlement.

Caller-owned mutable collections are not immutable merely because their type is `readonly`. `updateItems(items)` must synchronously shallow-copy the ordered elements before enqueueing so that a later caller mutation cannot change an already ordered invocation.

A new generic event envelope is not required.

### Level-triggered refresh

Only the latest condition matters and duplicate work may be coalesced.

Examples may include:

- geometry invalidation;
- pending spatial-frame scheduling;
- controlled refreshes explicitly documented as latest-wins.

Only enumerated actions may use a shared pending slot. Do not silently classify pointer or collection input as latest-wins.

### Reentrant callback checkpoint

A checkpoint exists only to preserve ordering after a callback returns.

Use names that describe this role, for example:

```ts
const COMMIT_START_AFTER_CALLBACK = 3;
```

Do not call it a generic `START_SUCCEEDED` result event.

A checkpoint must validate the operation identity that created it if it can survive cancellation, replacement, or a new operation.

### Async completion

A Promise, animation, rAF, or readiness callback:

1. validates its owned attempt identity;
2. stages its result once on that attempt;
3. dispatches a completion action with the attempt reference;
4. lets the runner revalidate identity;
5. commits the semantic result transactionally.

External async callbacks must not mutate committed state directly.

### Barrier action

Barrier completions must preserve their operation and attempt identity and must not be coalesced across cancel, destroy, or operation retirement.

## Queue representation

The exact representation is an implementation detail and must be measured. Possible forms include:

```ts
runtime.actions.push(action);
runtime.arguments.push(argument);
```

or a flat array:

```ts
runtime.queue.push(action, argument);
```

or a small reusable queue structure.

Avoid allocating a tuple or wrapper object for every entry unless measurements show that it is preferable.

## Run-to-completion

Nested controller calls enqueue work instead of interrupting an action midway.

```ts
function dispatch(
  runtime: DragRuntime,
  action: Action,
  argument?: ActionArgument,
): void {
  enqueue(runtime, action, argument);

  if (runtime.running) {
    return;
  }

  runtime.running = true;

  try {
    drain(runtime);
  } catch (error) {
    panic(runtime, error);
  } finally {
    runtime.running = false;
  }
}
```

Internal synchronous steps must not become queue entries merely because a queue exists.

Rejected:

```text
POINTER_MOVED
READ_BOUNDS
BOUNDS_READY
CALCULATE_DELTA
PRESENT_MOTION
CALL_ON_MOVE
```

Target:

```text
POINTER_MOVED
  -> validate current
  -> prepare draft
  -> calculate motion
  -> commit
  -> render
  -> call onMove
```

# Transition and effect ordering

## Three transition stages

Every substantial action should be understandable as three stages.

### 1. Prepare

May include:

- ingress and phase validation;
- copying `current` to `draft`;
- pure calculations;
- DOM reads;
- creation of immutable public proposals;
- local transactional acquisition;
- value-producing callbacks when their result is required to determine the next semantic state.

Preparation must not mutate `current`.

### 2. Commit

Commit should be short and effectively non-throwing:

- publish prepared resource leases;
- retire or replace attempt references;
- swap `current` and `draft`;
- update small runtime-container control fields where required.

### 3. Post-commit effects

May include:

- DOM writes;
- rendering;
- pointer capture and release;
- scheduling rAF, animation, and Promise continuations;
- notification callbacks for an already committed transition.

If a post-commit effect fails, do not swap back. The committed semantic state is valid. Enter a new failure transition from that state.

## Direct synchronous effects

Synchronous work should execute through direct top-level functions.

```ts
function updateFreeMotion(runtime: FreeDragRuntime): void {
  refreshBoundsIfNeeded(runtime);
  calculateFreeDelta(runtime);
  presentFreeMotion(runtime);
  invokeMoveCallback(runtime);
}
```

Do not represent each step as an effect object followed by a success or failure event.

Top-level functions are preferred because they:

- keep one visible control flow;
- avoid per-operation closure factories;
- remain independently testable;
- make mutation boundaries reviewable;
- permit inlining and dead-code elimination.

Objects and classes remain acceptable when they model a real platform resource or materially improve clarity. The redesign bans unnecessary authorities and routing, not objects themselves.

# Reentrancy and callback checkpoints

## General rule

After invoking arbitrary consumer code, no earlier assumption may be trusted unless the transition is already committed or an explicit checkpoint validates that the operation is still current.

Prefer notification callbacks after commit. The callback then observes a valid, already-published state, and a reentrant controller call is processed afterward through the FIFO queue.

## Immediate cancel and destroy requests

Cancel and destroy have different public semantics and must not share one vague latch policy.

### Cancellation

`cancel()` is a no-op when:

- the controller is closed;
- there is no current operation;
- the current phase is not cancellable.

A valid request is associated with the exact current operation. The first valid cancel request for that operation wins; later reasons for the same operation are ignored unless Phase 1 deliberately changes the public contract.

```ts
function cancel(runtime: DragRuntime, reason: CancelReason): void {
  if (runtime.closed) {
    return;
  }

  const operation = runtime.current.operation;

  if (operation === null || !isCancellable(runtime.current.phase)) {
    return;
  }

  if (runtime.cancelRequest?.operation === operation) {
    return;
  }

  const request = { operation, reason };
  runtime.cancelRequest = request;
  dispatch(runtime, CANCEL, request);
}
```

Consuming, ignoring as stale, retiring the operation, destroy, and panic must all have exact latch-clearing rules. Idle cancellation must never leave a request that can poison a future operation.

### Destruction

`destroy()` is terminal, silent, and idempotent. Preserve the existing observable contract that physical teardown is synchronous even when destruction is called reentrantly from a consumer callback or factory.

Before `destroy()` returns it must:

1. mark the controller closed and set `destroyRequested`;
2. stop accepting new ingress;
3. invalidate async attempts;
4. release all resources already owned by the runtime exactly once;
5. prevent all later callbacks and queued work from becoming observable.

If the action runner is active, the currently preparing action detects the latch and rolls back resources still held locally. A queued or internal terminal action may publish the final semantic frame, but no externally observable teardown is delayed until that action runs.

Public methods and `dispatch()` must reject work after close.

### Preparation checkpoint

After every value-producing callback or factory that can reenter the controller:

```ts
if (
  runtime.closed ||
  runtime.destroyRequested ||
  runtime.cancelRequest?.operation === operation
) {
  rollbackPreparedResources();
  return;
}
```

The queue preserves authoritative FIFO ordering; the latches prevent the active preparation from continuing unsafe work.

## Callback placement and continuation rule

Place notification callbacks after semantic commit and after the DOM state they are documented to observe has been established.

Every external callback must satisfy one executable rule:

1. it is literally the last externally visible operation in the action; or
2. every remaining DOM write, schedule, resource publication, or callback is preceded by a mandatory `closed` / destroy / cancel / current-operation check.

“As late as practical” is guidance, not a correctness rule.

For every callback or factory, Phase 1 must define:

- visible phase and resources on entry;
- whether the callback runs before or after semantic commit;
- synchronous cancel and destroy behavior;
- mandatory post-callback identity and terminal checks;
- local rollback requirements;
- whether normal return commits directly or queues a checkpoint;
- failure stage and FIFO precedence when it throws;
- exact work, if any, allowed after it returns.

Do not create a large generic callback framework. Use focused helper functions and tests for actual boundaries.

# Resource ownership

## Ownership remains mandatory

The redesign removes the graph of independent resource-owner objects, not the ownership guarantees.

Preserve:

- one clear owner for every acquired resource;
- idempotent cleanup;
- LIFO disposal where order matters;
- best-effort cleanup when one disposer throws;
- separate interaction and presentation lifetimes;
- transactional rollback after partial activation;
- deterministic destroy behavior;
- cleanup before terminal callbacks where required;
- stale asynchronous work becoming inert.

A compact `ResourceScope` may remain if it is the clearest way to preserve these semantics.

## Transactional acquisition

Resources acquired during preparation remain local until commit.

```ts
function prepareActivation(runtime: DragRuntime): PreparedActivation {
  const prepared = createPreparedActivation();

  try {
    prepared.placeholder = acquirePlaceholder(runtime, prepared.scope);
    checkCurrentPreparation(runtime);

    prepared.lift = acquireLift(runtime, prepared.scope);
    checkCurrentPreparation(runtime);

    prepared.renderer = createRenderer(prepared.lift, prepared.scope);
    checkCurrentPreparation(runtime);

    return prepared;
  } catch (error) {
    disposePreparedActivation(prepared);
    throw error;
  }
}
```

At the commit point, ownership transfers to the runtime. Before that point, rollback releases local acquisitions in reverse order.

Every leaf acquisition must itself be exception-safe. It must either:

- be all-or-nothing; or
- register rollback with a local scope before its first DOM/resource side effect.

Action-level rollback cannot repair a leaf function that performs several writes and throws before returning a lease.

Preparation-time mutation outside the frames—attempt records, geometry caches, resource scopes, or platform state—must have one explicit policy:

1. local rollback;
2. replace-on-commit publication;
3. reconstructible cache plus dirty invalidation;
4. terminal panic when invariants cannot be restored.

Do not register a resource into a closed or reusable scope after a reentrant destroy. A scope must either reject late registration or immediately dispose the incoming resource.

## Required lifetimes

At minimum, model these separately:

1. controller ingress lifetime;
2. admitted-operation interaction lifetime;
3. temporary presentation lifetime;
4. replaceable async attempts such as resolution, readiness, frame, and landing.

Not every lifetime requires its own class. It does require its own explicit retirement rule.

# Failure model

## Known failures and FIFO precedence

Catch expected failures at the operation that knows their stage and recovery policy:

- DOM read/write;
- renderer;
- geometry;
- consumer callback;
- resolver;
- placeholder or visual factory;
- presentation readiness;
- landing;
- controlled reconciliation.

Before commit:

- leave `current` unchanged;
- rollback locally prepared resources;
- preserve actions already raised by arbitrary consumer code;
- enqueue a typed failure checkpoint behind those actions.

After commit:

- keep the committed state;
- enqueue or enter a new transactional failure/recovery transition according to the same precedence rules.

After arbitrary consumer code, direct failure recovery is forbidden when that callback could have enqueued an earlier action. Required ordering:

```text
CANCEL -> callback throws -> FAILURE_CHECKPOINT
DESTROY -> callback throws -> FAILURE_CHECKPOINT
```

Cancellation wins over the later failure checkpoint for the same operation. Destroy terminalizes the controller and makes the later operation failure inert and silent. A direct failure transition is allowed only where no arbitrary code could have enqueued earlier work, or where an explicit Phase 1 precedence table proves equivalence.

Most current `*_FAILED` event variants should disappear. A small failure action with stage, operation identity, and error is legitimate when it preserves a real callback or asynchronous ordering boundary; it must not recreate success/failure pairs for ordinary synchronous calls.

## Unexpected panic

An unexpected action or invariant failure is terminal for the controller:

1. close ingress;
2. retire the queue and clear queued arguments;
3. invalidate attempts and clear staged settlements;
4. release all resources exactly once, best-effort;
5. clear both frames, latches, reasons, and DOM-bearing caches;
6. report the initiating error after teardown;
7. never reopen the operation.

Disposer failures must not replace the initiating error or stop later disposers. An absent or throwing `onError` falls through to platform `reportError` or the project's equivalent reporting mechanism.

Do not try to continue from a frame whose invariants are unknown.

# Asynchronous attempts and currency

Operation IDs, motion IDs, spatial IDs, resolution IDs, and landing IDs must not be transported everywhere by default.

Currency exists only across a real stale-work boundary.

Preferred mechanisms:

1. object identity;
2. generation number;
3. `AbortSignal`;
4. dedicated attempt token.

```ts
type ResolutionSettlement =
  | Readonly<{ status: 'fulfilled'; value: unknown }>
  | Readonly<{ status: 'rejected'; reason: unknown }>;

interface ResolutionAttempt {
  controller: AbortController;
  settlement: ResolutionSettlement | null;
}
```

```ts
promise.then(
  (value) =>
    settleResolutionAttempt(runtime, attempt, {
      status: 'fulfilled',
      value,
    }),
  (reason) =>
    settleResolutionAttempt(runtime, attempt, {
      status: 'rejected',
      reason,
    }),
);
```

```ts
function settleResolutionAttempt(
  runtime: DragRuntime,
  attempt: ResolutionAttempt,
  settlement: ResolutionSettlement,
): void {
  if (runtime.attempts.resolution !== attempt || attempt.settlement !== null) {
    return;
  }

  attempt.settlement = settlement;
  dispatch(runtime, RESOLUTION_SETTLED, attempt);
}
```

The runner validates identity again, consumes the discriminated settlement once, validates only the fulfilled branch as a public resolution, then clears the payload. Retirement, destroy, and panic also clear staged values and reasons. This preserves the difference between fulfilled `null` and rejected `null`/`undefined`.

Do not preserve branded currency objects merely because the previous architecture used them.

# Authored-presentation barrier

Temporary drag presentation may be released only when both independent gates are complete:

```text
landing finished or was skipped
AND
the consumer's authored presentation is ready
```

These branches start and settle independently. Neither must await the other.

The committed settlement frame should contain the semantic gate state:

```ts
interface DragStateFrame {
  // ...
  landingDone: boolean;
  authoredPresentationReady: boolean;
}
```

Attempt identity, timeout handles, animations, and Promise resources live outside the frame.

Required semantics:

- absent authored readiness completes that gate immediately;
- landing and readiness start and settle independently;
- the readiness timeout is `PRESENTATION_READY_TIMEOUT = 500 ms`;
- late readiness or landing completion is inert by attempt identity;
- interaction may stop before temporary presentation is released;
- reduced motion and accepted free drops still obey both gates;
- terminal callbacks run only after temporary presentation has been released;
- both completion orders must be tested.

```ts
function canReleasePresentation(state: DragStateFrame): boolean {
  return state.landingDone && state.authoredPresentationReady;
}
```

### Readiness failure replaces settlement

A readiness rejection or timeout is not merely a failed boolean gate. It replaces the active settlement while retaining temporary presentation.

The replacement algorithm must:

1. retire the destination readiness and landing attempts;
2. keep temporary presentation owned and visible;
3. select the feature-specific failed outcome and recovery plan;
4. reset the landing/readiness gates for the replacement settlement;
5. start or skip the replacement landing independently;
6. release presentation only when the replacement settlement reaches its own terminal gates;
7. invoke terminal callbacks only after release.

For draggable, preserve the current failed-settlement home recovery when a home target exists and define the no-home fallback. For sortable, preserve the current feature-specific recovery behavior unless the Phase 1 compatibility ledger explicitly approves a behavioral change.

Both `landing first -> readiness failure` and `readiness failure first` must be covered. Old attempts become inert before the replacement is published.

# Sortable-specific rules

## Active movement

Sortable may retain a rect index, geometry cache, placeholder state, and one coalesced spatial frame.

A pointer move is still preserved as ingress and committed transactionally. The post-commit effect may update visual motion immediately and schedule one latest-state spatial frame.

The frame reads committed runtime state; it does not receive a newly allocated request containing every runtime field.

## Release-time geometry

Pointer release is not merely a flush of the active-frame path.

Because aborting interaction resources is an external side effect, release uses two semantic commits rather than destroying interaction during preparation.

First commit:

1. validate the actual release event and active pointer identity;
2. commit the exact release coordinates;
3. commit a logical `RELEASING` / no-more-input phase.

Post-commit effects then:

4. abort interaction listeners and release pointer capture;
5. cancel or invalidate pending active-frame work;
6. mark required geometry dirty.

The action then synchronously:

7. refreshes geometry from the release point, current collection, placeholder, and current layout;
8. constructs exactly one immutable reorder proposal;
9. transactionally commits proposal/resolution state;
10. enters consumer resolution.

If geometry or proposal construction fails after the first commit, the controller enters the defined failure recovery from a valid input-closed state. It must not return to active dragging with interaction resources already gone.

A pending frame must not allow a stale incumbent insertion to be committed.

## Collection changes

Collection updates require explicit phase-specific behavior. At minimum, tests must cover:

- source removal before activation;
- source removal while active;
- neighbor insertion or removal while active;
- complete replacement while active;
- repeated reentrant replacements;
- replacement after proposal creation;
- replacement during consumer resolution;
- replacement during landing;
- stale frame from operation A after operation B becomes active.

The Phase 1 compatibility matrix must choose the outcome for every case before sortable implementation begins. Preserve current observable behavior by default; a different policy requires an explicit compatibility-ledger entry.

Every accepted replacement owns a shallow snapshot of its ordered elements. Do not retain a caller-owned mutable array as the queued collection value.

# Allocation policy

There is no requirement to reach literally one heap allocation per drag.

Reasonable allocations include:

- one operation identity object;
- two stable state frames per session;
- real `AbortController` instances;
- browser-created rects and animations;
- public callback geometry or proposal objects;
- Promise attempt tokens;
- temporary arrays where they simplify cold code.

Unacceptable allocations include objects created solely to carry data already present in the runtime through an internal protocol.

The hot pointer path should aim for:

- no internal event envelope;
- no copied `Point`;
- no newly allocated state object;
- no effect object or effect array;
- no currency object;
- no rAF request snapshot solely to transport runtime-owned data.

`Object.assign(draft, current)` is the default copying strategy. If profiling shows that copying a large frame affects the hot path, optimize only the measured section by splitting frames or copying selected fields. Do not preemptively recreate a complex state hierarchy.

# Proposed module structure

Organize files by behavior, not protocol taxonomy.

```text
src/
  kernel/
    queue.ts
    resources.ts
    pointer.ts
    coordinate.ts
    presentation.ts
    animation.ts
    invalidation.ts

  draggable/
    runtime.ts
    actions.ts
    admission.ts
    motion.ts
    settlement.ts
    options.ts

  sortable/
    runtime.ts
    actions.ts
    admission.ts
    geometry.ts
    insertion.ts
    settlement.ts
    options.ts

  draggable.ts
  sortable.ts
```

Do not automatically create separate `event.ts`, `effect.ts`, `state.ts`, `decide.ts`, and owner modules for every feature.

# Migration strategy

Do not create a long-lived hybrid in which the old immutable machine and the new runtime both claim lifecycle authority.

## Phase 1: behavioral contract and baselines

Phase 1 is approved. Phase 2 must not begin until the following artifacts are written, reviewed, and accepted.

1. **Per-feature phase/action tables** containing guards, operation identity, required entry fields/resources, draft mutations, commit point, post-effects, callbacks, queued checkpoints, next phase, stale behavior, and exit invariants.
2. **Action classification and queue traces** for edge-triggered, coalesced, callback-checkpoint, async-completion, and barrier actions, including: `MOVE(A), MOVE(B)`, `MOVE(A), CANCEL, MOVE(B)`, collection replacement, operation replacement, and old checkpoints reaching a new same-named phase.
3. **Callback/factory matrix** defining commit timing, synchronous destroy, cancel behavior, post-callback continuation, throw precedence, and local rollback for every consumer boundary.
4. **Known-failure table** defining stage, FIFO precedence, reporting, recovery, and whether later queued work drains or becomes stale.
5. **Resource exit-path matrix** for abandonment, partial activation, cancel, accept, reject, failure, readiness replacement, finalization, destroy, and panic, including exact cleanup and callback order.
6. **Presentation-readiness replacement algorithm** with both completion orders, 500 ms timeout, attempt retirement, gate reset, home/no-home behavior, and feature-specific compatibility.
7. **Sortable phase × collection-change matrix** and complete geometry invalidation sources.
8. **Public compatibility ledger** linked promise-by-promise to browser tests, including callback timing, controller method semantics, resolver `AbortSignal`, cleanup order, pointer capture, keyboard/focus, DOM/ARIA, exports, and declarations.
9. **Test classification** into observable contract, semantic replacement, and obsolete representation-only coverage. Add public declaration/API snapshot coverage.
10. **Reproducible baselines** recording source commit, commands, build and tool versions, browser/hardware, fixture layout and collection size, move count, warmup, repetitions, statistic/variance, allocation method, artifact location, allowed regressions, and the reviewer/waiver process.
11. **Retention and teardown tests** proving idle retirement and destroy/panic clear both frames, queue arguments, attempts, and DOM-bearing caches.

Do not preserve reducer/effect tests merely to keep test count constant. Replace their semantic coverage at the new action and operation boundaries.

## Phase 2: complete private draggable runtime

Build a complete private draggable implementation using:

- one runtime container;
- two stable state frames;
- the action queue;
- direct operations;
- transactional resources;
- async attempt identity;
- authored-presentation barrier;
- full settlement and cleanup.

Expose it behind a test-only factory until it satisfies the behavioral contract. Do not bridge individual hot-path transitions back and forth between old and new semantic authorities.

## Phase 3: atomic draggable cutover

Switch the public draggable controller to the new runtime in one coherent cutover. Remove old draggable event, effect, owner, reducer, and routing code as soon as replacement coverage passes.

Measure completed behavior, not compatibility scaffolding.

## Phase 4: sortable implementation and cutover

Apply the same architecture to sortable while preserving its real feature specifics:

- pointer and keyboard admission;
- collection reconciliation;
- placeholder lifetime;
- rect index and invalidation;
- coalesced spatial work;
- release-time synchronous geometry;
- insertion hysteresis;
- reorder resolution;
- destination and home landing.

## Phase 5: consolidate proven sharing

After both features stabilize:

- retain genuinely shared platform and resource primitives;
- avoid base classes, generic effect runtimes, registries, middleware, and command buses without measured benefit;
- prefer small duplicated orchestration over abstraction machinery;
- measure before and after every proposed shared layer.

## Phase 6: replace obsolete design documentation

After acceptance:

1. rewrite `packages/drag/DESIGN.md`;
2. remove obsolete rules prohibiting the mutable runtime and transactional frames;
3. document queue and reentrancy semantics;
4. document frame-copy, commit, and effect ordering;
5. document resource and async-attempt lifetimes;
6. document the authored-presentation barrier and sortable release contract;
7. archive or label superseded redesign notes and experiments.

# Required invariants

## Transactional state

- `current` is always a valid committed state;
- only action handlers commit phase changes;
- `draft` is never externally observable as authoritative state;
- a preparation throw cannot partially mutate `current`;
- values shared by both frames are never mutated in place unless independently transactional;
- commit is a short, non-throwing swap/publication step;
- the inactive frame is scrubbed after its previous-state window closes;
- idle operation retirement does not retain retired DOM or consumer graphs;
- both frames and queued/staged references are cleared on destroy and panic.

## Lifecycle

- at most one active operation per controller;
- invalid and stale actions are ignored deterministically;
- cancellation cannot be followed by accidental resurrection;
- destroy is terminal;
- no terminal callback fires after destroy;
- no stale async continuation mutates a newer operation.

## Reentrancy

- nested controller calls do not interrupt an action midway;
- FIFO ordering is explicit and tested;
- edge-triggered invocations preserve their own arguments;
- callback checkpoints validate their creating operation;
- immediate cancel/destroy latches stop unsafe preparation work;
- callback-triggered destroy performs synchronous physical teardown exactly once;
- idle cancel is a no-op and cannot poison later operations;
- first valid cancel wins per operation;
- callback-raised cancel/destroy precedes a later throw checkpoint in FIFO order.

## Resources

- every acquisition has one release path;
- partial activation rolls back locally;
- every leaf acquisition is exception-safe before it can return a lease;
- ownership transfers only at commit;
- interaction cleanup may precede presentation cleanup;
- cleanup is idempotent and best-effort;
- closed scopes do not retain late resources;
- terminal callbacks occur after required presentation cleanup.

## Failures

- known failures retain a meaningful stage and recovery policy;
- pre-commit failures leave `current` unchanged;
- post-commit failures enter a new transition;
- unexpected panic closes ingress and tears down exactly once;
- disposer and `onError` failures do not reopen the controller;
- fulfilled invalid values and rejected nullish reasons remain distinguishable;
- destroy makes later queued operation failures inert and silent.

## Sortable

- release uses the actual release point and synchronous current geometry;
- stale frame work cannot change insertion after settlement;
- collection changes in each phase have tested behavior;
- source removal cannot commit a stale reorder;
- consumer resolution remains explicit and is never inferred from DOM shape;
- release first commits an input-closed state before aborting interaction;
- collection replacements own shallow snapshots of ordered items.

# Measurement gates

Record after every coherent vertical implementation:

- raw emitted bytes;
- minified bytes;
- Brotli bytes for `draggable`, `sortable`, and `combined`;
- sortable activation duration;
- representative pointer-move and spatial-frame duration;
- allocation profile for the hot path;
- observable contract test status;
- public declaration/export status;
- structural deletion of event/effect/owner routes;
- inactive-frame and cache-retention assertions;
- exact command, environment, repetitions, statistic, and artifact location.

Before Phase 2, Phase 1 must record allowed performance and allocation regressions and identify who may approve a waiver. The rewrite should produce a material combined-size reduction, but no arbitrary byte target overrides correctness and architectural clarity. A negligible size change must be explicitly justified by structural simplification; a material regression requires an explicit review decision.

# Agent instructions

Agents implementing this redesign must follow these rules:

1. Treat the current internal architecture as replaceable.
2. Treat `packages/drag/DESIGN.md` as obsolete for this work.
3. Preserve externally observable behavior unless a change is documented and tested.
4. Use one runtime container with committed and draft state frames.
5. Mutate only the draft during transition preparation.
6. Commit semantic state by swapping frame references.
7. Run externally visible effects after commit unless they are required for preparation and are transactionally rolled back.
8. Do not recreate event/effect message passing under different names.
9. Do not introduce a command bus, actor model, middleware pipeline, generic reducer framework, or owner registry.
10. Preserve edge-triggered ingress arguments; do not overwrite them in shared committed fields before queue processing.
11. Queue stable native pointer samples by reference with a narrow `Pick<>` contract when synchronous draining is sufficient.
12. Capture dispatch-scoped admission data and perform required `preventDefault()` synchronously before the native listener returns.
13. Do not retain native events across Promise, rAF, animation, or persistent operation boundaries.
14. Use payloadless actions only for genuinely payloadless checkpoints.
15. Use identity only across genuine stale-work boundaries.
16. Preserve FIFO precedence when a callback queues cancel/destroy and then throws.
17. Use normal exceptions for synchronous control flow; do not create generic success/failure action pairs.
18. Preserve explicit resource ownership, leaf exception safety, and local transactional rollback.
19. Scrub the inactive frame and all retired operation references.
20. Preserve synchronous public destroy teardown.
21. Preserve the authored-presentation barrier and replacement settlement exactly.
22. Commit an input-closed sortable release phase before aborting interaction, then resolve final geometry synchronously from the release point.
23. Snapshot caller-owned collection order before enqueueing replacement.
24. Measure complete implementations before adding abstractions.
25. Delete obsolete machinery as soon as replacement coverage passes.
26. Prefer direct, readable control flow over abstract purity.
27. Rewrite `DESIGN.md` only after the implementation is accepted.

# Final direction

The package should become an imperative, action-driven state machine over one runtime authority with reusable transactional state frames.

Intended control flow:

```text
native input or async completion
  -> capture dispatch-scoped admission data when required
    -> enqueue action plus minimal stable/owned argument
      -> validate against committed frame
        -> copy committed frame into reusable draft
          -> mutate and validate draft
            -> commit by swapping frames
              -> execute direct post-commit effects
                -> scrub inactive frame
                  -> optionally enqueue continuation
```

Not:

```text
data event
  -> immutable reducer
    -> effect description
      -> effect router
        -> owner object
          -> result event
            -> reducer again
```

Correctness remains the first priority. The new architecture must preserve the valuable guarantees of the current implementation while deleting the protocol that currently makes those guarantees expensive to express.
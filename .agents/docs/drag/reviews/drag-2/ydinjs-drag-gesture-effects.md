# `@ydinjs/drag` gesture/effects architecture review

Scope: `packages/drag/src/draggable/gesture.ts`, `packages/drag/src/sortable/gesture.ts`, their reducers, the generic session, and the directly related effect/resource helpers.

## Executive conclusion

The proposed pipeline is the right direction:

```text
event
  -> pure decision (state transition + semantic effects)
  -> commit complete next state
  -> execute effects
  -> dispatch currency-tagged result events
```

The important qualification is that running effects after the FSM commit is not the current design mistake. `createSession()` already commits `current = next` before invoking the transition hook (`kernel/session.ts:50-64`), which is exactly what makes synchronous re-entrancy safe. The problem is that each `Gesture` currently combines three different layers:

1. interpreting a committed transition and deciding what it means;
2. executing browser and consumer effects;
3. owning the mechanical resources created by those effects.

`FreeDragGesture.handle()` and `SortableGesture.handle()` are therefore second, implicit transition tables after the authoritative reducers. The rest of each class contains activation, rendering, async resolution, landing, cleanup, callback, and error-policy implementations. Together the files are 1,459 lines, and their size is a symptom of this concentration rather than the primary fault.

The recommended target is a pure feature decision function composed from two pure pieces:

```ts
decide(from, event) {
  const state = transition(from, event);
  const effects = planEffects(from, state, event);
  return { state, effects };
}
```

The session commits `state`, then a small router sends each semantic effect to a narrow executor. The current gesture classes can disappear or become operation-lifetime resource aggregates with no knowledge of FSM edges. This preserves the existing reducers' useful parallel-slice structure while making the command decision atomic with reduction.

## What the code does today

The current high-level flow is already close to the desired architecture:

```text
native/public input
  -> facade normalizes an event
  -> reducer constructs one complete state
  -> session commits it
  -> Gesture.handle(from, to, event) infers work from the edge
  -> effect code touches DOM/callbacks/promises
  -> effect dispatches a tagged result event
  -> reducer accepts or rejects that result
```

The good foundations should remain:

- The feature reducer is the authoritative owner of phase, operation, motion/insertion, transaction, and settlement state.
- Referential no-op reduction suppresses effects entirely.
- Operation, resolution, landing, and collection identities protect against stale async results.
- `GestureScope` separates interaction resources from presentation resources.
- `DropResolutionEffect`, `ReorderResolutionEffect`, `LandingRunner`, `FrameTask`, `RectIndex`, `DragRenderer`, and `PlaceholderLease` are already useful narrow seams.
- Destroy is terminal and intentionally does not manufacture a normal cancel/finish outcome.

The awkward part is between state and those narrow seams.

### Draggable responsibilities

`FreeDragGesture` currently owns or coordinates all of the following:

| Responsibility | Evidence |
| --- | --- |
| Decode committed FSM edges | `handle()`, `gesture.ts:188-260` |
| Transactional activation | measurement, mapper, lift, pointer capture, invalidation, `gesture.ts:272-329` |
| Start and movement callbacks | `gesture.ts:331-379` |
| Rendering | `gesture.ts:356-358` |
| Consumer resolution lifecycle | `gesture.ts:382-415` |
| Settlement choreography | `gesture.ts:417-500` |
| Home-target validation and plan construction | `gesture.ts:502-562` |
| Landing runner lifecycle | `gesture.ts:564-597` |
| Authored-presentation readiness | `gesture.ts:599-622` |
| Cleanup and finish/cancel callback policy | `gesture.ts:624-687` |
| Error classification/reporting | `gesture.ts:166-185`, plus most effect methods |

The release chain illustrates how much choreography is implicit:

```text
RELEASE
  -> proposal-ready state
  -> gesture creates resolver and dispatches RESOLUTION_STARTED
  -> awaiting-consumer state
  -> gesture invokes onDrop
  -> DROP_RESOLVED / DROP_RESOLUTION_FAILED
  -> settling state
  -> gesture starts readiness/home/landing work
  -> several landing progress events
  -> idle state
  -> gesture releases presentation and invokes the terminal callback
```

Each state is legitimate, but several exist mainly to wake the transition observer for its next imperative step.

### Sortable responsibilities

`SortableGesture` has the same common responsibilities and additionally owns:

| Responsibility | Evidence |
| --- | --- |
| Placeholder acquisition and committed placement | `gesture.ts:243-335`, `364-376` |
| rAF scheduling, rectangle cache, invalidation, and hit testing | `gesture.ts:293-307`, `389-418` |
| A mirror of the current FSM operation | `observe()` / `#currentOperation`, `gesture.ts:420-424` |
| Proposal stabilization and no-op selection | `gesture.ts:426-509` |
| Reorder resolver lifecycle | `gesture.ts:511-545` |
| Home/destination landing selection | `gesture.ts:618-654` |

The strongest architecture smell is `observe(to)`: the facade must update `#currentOperation` before `handle()` so later invalidation/frame work can inspect a mirror of reducer-owned semantic state (`sortable.ts:361-362`). `#lastPoint` and `#lastDelta` are similar mirrors used by invalidation. Mechanical caches are valid outside the FSM; copied semantic authority is not.

## Where semantic decisions still leak out of the reducer

The reducers already own most business semantics. The gestures should continue to own DOM observations and resource mechanics, but they should not decide what those observations mean.

The boundary should be:

| Reducer/decision layer owns | Effect executors own |
| --- | --- |
| Whether an event is accepted | DOM reads and writes |
| Phase/stage/outcome/recovery choice | Lift, capture, placeholder, animation, and timers |
| Whether a proposal is no-op/accepted/rejected/canceled/failed | Calling consumer hooks |
| Which semantic work is requested and in what order | Normalizing success/failure into tagged events |
| Operation/effect currency | Abort controllers and idempotent mechanical handles |
| Whether a result may progress the operation | Caches reconstructible from committed state |

Current leaks across that boundary include:

- `SortableGesture.#stabilize()` chooses keyboard versus pointer fallback, builds the proposal, and decides `REORDER_NOOP` versus `PROPOSAL_BUILT`. Spatial measurement must remain effectful, but the effect can return a tagged resolved insertion; pure proposal construction and no-op classification can then occur in the reducer/decision layer.
- `SortableGesture.#prepareLanding()` turns `visual.isConnected === false` into `SETTLEMENT_COMPLETED`. DOM connectivity is an observation, not a semantic completion decision. It should produce a specific result such as `LANDING_UNAVAILABLE` or `PRESENTATION_INVALID`; the reducer should choose failed/skipped recovery.
- Both `#settle()` methods interpret landing sub-stages and decide when to start, pin, or complete. Those are commands implied by accepted FSM edges and should be explicit outputs of the decision.
- Both classes scrape transient input from `event` after reduction: the raw failure for reporting and `presentationReady` for the watcher. An explicit effect is the natural transient carrier; neither value needs to become durable state.
- Completion uses `from.settlement` because the committed idle state has correctly erased it. A `FINALIZE_OPERATION` effect should capture the terminal result as part of the decision that clears state.

## Concrete issues exposed by the current concentration

These are not merely naming or line-count observations. They are reasons to make effect boundaries explicit.

### 1. Some failures are reported before failed state is committed

Activation and movement catches call `onError` before dispatching the failure event:

- draggable: `gesture.ts:323-327`, `345-352`, `367-378`;
- sortable: `gesture.ts:330-335`, `349-356`.

A re-entrant `onError` therefore observes the pre-failure phase. The desired rule is:

```text
effect throws
  -> dispatch typed failure event
  -> reducer commits failed/idle/settling state
  -> emitted REPORT_FAILURE effect invokes onError
```

This is one of the clearest benefits of reducer-emitted effects.

### 2. The readiness watcher outlives `destroy()`

Both `destroy()` implementations settle interaction, destroy the landing runner, and release presentation, but neither disposes `#presentationWatchDisposer` (`draggable/gesture.ts:262-268`, `sortable/gesture.ts:236-241`). The disposer is cleared only during normal completion (`draggable/gesture.ts:624-630`, `sortable/gesture.ts:717-723`). Session closure makes its eventual dispatch inert, but the timer/promise continuation remains retained until it settles or times out.

The presentation-barrier executor should own and dispose its watch on replacement, completion, and destroy.

### 3. A recovery landing can overwrite a still-running landing

When `presentationReady` rejects or times out, each reducer can replace the current settlement with a fresh home recovery. In sortable this happens at `reducer.ts:697-713`. The gesture prepares a new plan and assigns a new runner to `#landing` without first destroying an existing destination runner (`gesture.ts:581-595`, `618-687`). Two animations can then target the same visual; the old callback may be rejected by currency, but its browser animation still exists.

A landing executor should own exactly one runner and provide an atomic `replace(plan, currency)` operation that terminates the old runner before exposing the new one.

### 4. Sortable spatial currency is incomplete

`ProposalBasis` contains `spatialId` (`sortable/reducer.ts:1020-1026`), but proposal result events carry only `operationId`. Active `INSERTION_RESOLVED` similarly lacks a spatial request identity, and the reducer does not validate the returned insertion version against the operation's current snapshot before accepting it (`reducer.ts:956-969`). This is fragile if spatial work becomes asynchronous or if consumer `getVisual` calls re-enter and replace the collection during measurement.

Every spatial result should echo `{ operationId, collectionVersion, spatialId }`; the reducer should compare all three before inspecting the payload.

### 5. Effect failure coverage is inconsistent

Renderer writes, placeholder movement, spatial measurement, landing timing, animation creation, and pinning are not consistently converted into failure events. The protocol already declares stages such as `FAILURE_RENDERER_WRITE`, `FAILURE_LANDING_TIMING`, `FAILURE_ANIMATION_CREATE`, and `FAILURE_LANDING_PIN` (`kernel/protocol.ts:238-267`), but the gesture implementations do not use them.

Each executor needs a documented failure policy: result event, recovery mode, reporting order, and whether normal callbacks remain possible.

### 6. The reducers are not currently replay-pure

Both reducer factories accept a mutable `OperationIdentitySource`. They call `ids.next()` while constructing landing state; sortable also does so for proposal spatial identity (`draggable/reducer.ts:522-555`, `sortable/reducer.ts:588-596`, `1020-1026`). Reducing the same `(state, event)` twice can therefore produce different states.

Use state-local attempt counters paired with `operationId`, or put preallocated identifiers on ingress/result events. The effect executor may allocate a handle ID only when acquisition itself must be acknowledged by a separate event. Do not describe a reducer as pure while it consumes a mutable allocator.

### 7. Readiness currency assumes one resolution per operation

`PRESENTATION_SETTLED` carries a `resolutionId`, but settlement acceptance checks the operation and pending status rather than the complete resolution currency (`draggable/reducer.ts:474-480`, `960-983`; `sortable/reducer.ts:541-547`, `697-715`). This is safe only while an operation can never open a second consumer resolution. A more extensible command model should preserve and compare the exact resolution currency in settlement state.

## Recommended target architecture

### 1. A pure decision, not a reducer that performs effects

Keep state reduction and effect planning individually testable, then compose them behind one contract:

```ts
type Effects<Fx> = Fx | readonly Fx[] | null;

type Decision<State, Fx> = Readonly<{
  state: State;
  effects: Effects<Fx>;
}>;

function decideDraggable(
  from: DraggableState,
  event: DraggableEvent,
): Decision<DraggableState, DraggableEffect> {
  const state = transitionDraggable(from, event);

  if (state === from) {
    return { state, effects: null };
  }

  return { state, effects: planDraggableEffects(from, state, event) };
}
```

`transitionDraggable` remains a pure complete-state reducer. `planDraggableEffects` is a pure mapping from one accepted edge to commands. Composing them as `decideDraggable` ensures callers cannot commit state without obtaining its effects, while avoiding effect accumulation inside the parallel slice reducers.

The same applies to sortable. This is semantically the user's proposed `reducer -> next state + semantic effects`, but it keeps the two pure responsibilities separate internally.

### 2. Semantic commands, never closures

Commands should say what accepted semantic edge occurred, not expose a DOM method to call. They should carry complete currency and immutable input when practical.

Representative commands are:

```ts
type SpatialCurrency = Readonly<{
  operationId: number;
  collectionVersion: number;
  spatialId: number;
}>;

type CommonEffect =
  | Readonly<{ type: 'disarm'; operationId: number }>
  | Readonly<{ type: 'stop-interaction'; operationId: number }>
  | Readonly<{ type: 'invoke-start'; operationId: number }>
  | Readonly<{ type: 'start-landing'; currency: LandingCurrency; plan: LandingPlan }>
  | Readonly<{ type: 'pin-landing'; currency: LandingCurrency }>
  | Readonly<{ type: 'watch-presentation'; currency: ResolutionCurrency; ready: PromiseLike<void> }>
  | Readonly<{ type: 'report-failure'; operationId: number; cause: FailureCause; error: unknown }>
  | Readonly<{ type: 'finalize-operation'; operationId: number; result: unknown }>;

type DraggableEffect =
  | CommonEffect
  | Readonly<{ type: 'acquire-free-activation'; operationId: number }>
  | Readonly<{ type: 'publish-free-motion'; operationId: number }>
  | Readonly<{ type: 'open-drop-resolution'; operationId: number; proposal: FreeDropProposal }>
  | Readonly<{ type: 'resolve-free-home'; currency: LandingCurrency }>;

type SortableEffect =
  | CommonEffect
  | Readonly<{ type: 'acquire-sortable-activation'; operationId: number }>
  | Readonly<{ type: 'publish-sortable-motion'; operationId: number }>
  | Readonly<{ type: 'resolve-active-insertion'; currency: SpatialCurrency }>
  | Readonly<{ type: 'place-committed-insertion'; operationId: number; insertion: Insertion }>
  | Readonly<{ type: 'resolve-proposal-insertion'; currency: SpatialCurrency }>
  | Readonly<{ type: 'open-reorder-resolution'; operationId: number; proposal: ReorderProposal }>
  | Readonly<{ type: 'prepare-sortable-landing'; currency: LandingCurrency; recovery: SettlementRecovery }>;
```

The exact names are less important than these rules:

- no command contains an executable closure;
- no executor must inspect phases to discover why it was called;
- every async/fallible command carries enough currency to make stale work inert;
- commands are transient and never become a second semantic state store;
- result events report observations; the reducer decides their semantic consequence.

For hot paths, benchmark representation before settling it. `null | Effect | readonly Effect[]` avoids allocating an empty array and avoids a one-element array in the common case. A compact numeric tag plus the immutable committed transition can be used where payload duplication is expensive. Do not introduce a generic observable/event-bus layer.

### 3. Narrow executors and explicit ownership

Suggested logical entities are:

| Entity | Only responsibility |
| --- | --- |
| `DraggableDecision` / `SortableDecision` | Produce complete next state and semantic commands |
| `DragSession` | Store state, commit it, then run the returned command batch |
| `OperationResources` | Aggregate operation-lifetime capabilities and terminal disposal order |
| `FreeActivationExecutor` | Acquire free-drag activation resources and emit ready/failure |
| `SortableActivationExecutor` | Acquire lift/placeholder/capture and emit ready/failure |
| `MotionPresenter` | Apply committed transforms |
| `SpatialInsertionExecutor` | Own frame task/rect index; resolve tagged spatial observations |
| `PlaceholderPresenter` | Apply a committed insertion to the placeholder |
| `DropResolutionEffect` / `ReorderResolutionEffect` | Invoke one abortable consumer resolution and normalize its result |
| `PresentationBarrierExecutor` | Own exactly one readiness watch |
| `LandingExecutor` | Own exactly one replaceable runner; start/pin/destroy it |
| `LifecycleCallbacks` | Invoke start/move/finish/cancel with their distinct error policies |
| `ErrorReporter` | Report a committed failure and contain errors thrown by `onError` |

These are logical entities, not a requirement for one class or one file per row. Stateless executors should usually be functions. Stateful entities are justified for a browser handle, cache, or resource lifetime. A thin feature router may compose them, but it should only switch on command type.

`GestureScope` remains valuable. What disappears is the gesture object as an FSM interpreter and owner of every unrelated handle.

### 4. Preserve recursive dispatch safely

The current session permits an effect or consumer callback to synchronously dispatch. Explicit batches add one new hazard: command 1 can cause a nested transition that makes command 2 stale.

The least surprising policy is to preserve current immediate re-entrancy and gate every command before execution:

```text
commit outer state
  -> execute command 1
     -> nested dispatch may commit newer state
  -> before command 2, compare its operation/stage/currency guard
  -> skip command 2 if the edge is no longer current
```

The executor should also recheck after every consumer-controlled call (`onStart`, `onMove`, `getVisual`, target/timing resolvers, callbacks) before its next write or dispatch. A FIFO event queue is another valid policy, but it changes observable synchronous ordering and should be treated as a separate behavioral redesign, not slipped into this refactor.

Externally visible ordering must remain explicit:

- state commits before any effect;
- render precedes `onMove` where that is the current contract;
- interaction disposal precedes settlement work;
- a completed resolution is marked mechanical-complete before settlement aborts interaction resources;
- presentation resources are released before `onFinish` / `onCancel`;
- destroy closes ingress, stops interaction, destroys landing, then releases presentation, with no normal callback.

## Architecture variants

| Variant | Responsibility separation | Migration risk | Runtime/size risk | Recommendation |
| --- | ---: | ---: | ---: | --- |
| A. Small transition reactors | Medium | Low | Low/medium | Useful short-lived extraction |
| B. Pure planner after the reducer | High | Low/medium | Low/medium | Best immediate architecture |
| C. Decision returns state + commands | Highest | Medium | Medium until measured | Recommended target contract |
| D. Declarative statechart with actions | High | High | Medium/high | Only with a broader reducer redesign |
| E. Shared/base `Gesture` class | Low | Medium | Already measured worse | Reject |

### Variant A: several transition reactors

Split `handle(from, to, event)` into activation, motion, resolution, settlement, and completion reactors. Each reactor still recognizes its own state edges and calls a narrow executor.

This is easy to migrate and improves navigation, but several subscribers can overlap, ordering is distributed, and FSM knowledge remains outside the reducer. It is better than the current monolith but should not be mistaken for the final single-responsibility design.

### Variant B: pure state-transition-to-command planner

Keep `reduce(from, event) -> to`; add `planEffects(from, to, event)`. Commit `to`, then execute only the returned commands.

This removes transition interpretation from resource owners, makes command planning unit-testable, and minimally disturbs the reducers and session. It is the recommended first stable step. The planner still derives effects from a state diff, but it is pure and has exactly one responsibility.

### Variant C: one decision result containing state and commands

Expose `decide(from, event) -> { state, effects }` to the session. Internally compose the existing state reducer with the pure planner. Once the command algebra stabilizes, some wake-up-only intermediate events may be collapsed where no real acquisition acknowledgement is needed.

This most closely matches the proposed pipeline and prevents state/effect drift. It requires hot-path allocation and bundle measurements, and it requires the nested-dispatch guard policy above.

### Variant D: phase-specific statechart transitions with entry actions

Replace the parallel state shape with phase-specific variants and handlers that return state plus commands. This can make invalid combinations unrepresentable and place commands beside their transitions. It is also the largest breaking change, complicates cross-slice updates, and may increase emitted code. It is justified only if the reducers themselves are being redesigned, not merely to shorten gesture files.

### Variant E: inheritance, one generic gesture, or a shared settlement class

These approaches deduplicate mechanics but do not move semantic effect decisions to the FSM boundary. The repository's experiment 04a/04b/04c work already found nested composition, stateless behaviors, and inheritance to increase compressed bundle size; inheritance alone added about 0.36-0.40 kB to each standalone entry (`.agents/docs/experiments/04-gesture-base.md`).

More importantly, a shared base would still be a multi-responsibility effect interpreter. Do not use class hierarchy as the primary answer to this problem. Extract shared commands or narrow executors only after both feature-specific algebras reveal truly identical invariants.

## Suggested migration sequence

### Phase 1: characterize and expose the hidden command table

1. Define `DraggableEffect` and `SortableEffect` without changing behavior.
2. Extract pure `planDraggableEffects(from, to, event)` and `planSortableEffects(from, to, event)` from the two `handle()` methods.
3. Keep the existing classes temporarily as executors.
4. Add planner tests asserting exact commands and ordering for every accepted edge, plus no commands for ignored/stale/no-op events.

This is a reversible step and reveals the real command vocabulary before changing session or reducer contracts.

### Phase 2: split effect mechanics by capability

1. Extract `SpatialInsertionExecutor` and remove `observe()` / `#currentOperation`.
2. Extract `LandingExecutor` and `PresentationBarrierExecutor`; make replacement and destroy ownership explicit.
3. Separate callback/error policy from DOM/resource operations.
4. Register all acquired resources immediately in the appropriate scope and route every failure through a typed result event.
5. Reduce the gesture classes to command routing plus an operation resource aggregate, or delete them.

Fix the watcher leak, runner replacement, failure-ordering, and spatial-currency issues during this phase; they are ownership defects, not optional cleanup.

### Phase 3: adopt the decision/session contract

1. Change the session from `(reducer, onTransition)` to `(decide, execute)`.
2. Commit `decision.state` before executing `decision.effects`.
3. Preserve `state === from` plus `effects === null` for ignored events.
4. Add currency guards between commands in a batch and after consumer re-entry.
5. Make identity creation deterministic or event-supplied.
6. Consider removing `RESOLUTION_STARTED`, proposal-ready, or similar wake-up edges only when the corresponding acquisition is atomic and no meaningful public/internal state is lost.

### Phase 4: measure before sharing or compressing

Measure draggable, sortable, and combined Brotli size plus pointer-move allocation. Compare at least:

- transition callback baseline;
- pure planner with current session;
- `null | single | array` command results;
- any compact numeric/bit representation proposed for hot motion effects.

Prefer source-level responsibility clarity, but do not add per-move arrays, closures, subscriber iteration, or generic framework machinery without evidence. The prior gesture-sharing experiments show that apparent source deduplication is not necessarily a bundle win.

## Required tests for the refactor

The existing reducer and browser suites cover much of the behavior, but explicit effect architecture needs focused layers.

### Decision/planner tests

- every meaningful edge emits the exact semantic command(s) once;
- ignored, duplicate, and stale events preserve state identity and emit nothing;
- failure result commits failed state and only then emits `REPORT_FAILURE`;
- terminal callback data is captured when transitioning to idle;
- all async commands contain full operation/effect currency;
- effect order is explicit for motion, settlement, and finalization.

### Executor tests with fake ports

- partial activation rolls back in LIFO order;
- each fallible browser/consumer boundary maps to the correct failure event;
- readiness watches dispose on completion, replacement, and destroy;
- replacing a landing destroys the old runner before starting the next;
- spatial results after collection replacement or operation replacement are inert;
- a completed resolver is not aborted when its own result enters settlement;
- re-entrant callbacks invalidate stale remaining commands;
- destroy is idempotent and silent.

### Integration/characterization tests to retain

- release uses the true `pointerup` point;
- interaction resources end before settlement work;
- landing and authored-presentation barriers may run concurrently, and both must settle before cleanup;
- presentation cleanup precedes `onFinish` / `onCancel`;
- accepted/no-op calls finish, rejected/canceled calls cancel, failed calls neither;
- keyboard and pointer sortable paths converge on the same proposal semantics;
- stale resolution, landing, spatial, and readiness events never affect a later operation.

## Final recommendation

Adopt Variant B immediately and shape it so the public internal contract becomes Variant C:

```text
event
  -> transition(state, event)
  -> planEffects(from, next, event)
  -> Decision(next, effects)
  -> commit next
  -> execute guarded semantic commands through narrow executors
  -> dispatch tagged observations/results
```

Do not try to solve the problem with a shared `Gesture` base class. The FSM is already a strong state authority and the post-commit boundary is correct. The architectural improvement is to make effect intent explicit at that boundary, remove semantic edge decoding from resource owners, and give each mechanical lifetime one narrow owner.

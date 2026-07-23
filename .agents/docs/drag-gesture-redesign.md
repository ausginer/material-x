# 05 — Explicit FSM Decisions and Effect Executors, Version 2

**Status:** Target architecture for implementation review  
**Scope:** `@ydinjs/drag`, first `draggable`, then `sortable`  
**Primary objective:** one semantic authority, explicit continuation states, narrow physical ownership, deterministic event ordering, and readable single-responsibility code  
**Compatibility:** no internal compatibility constraint; the package is pre-alpha  
**Behavioral constraint:** existing behavior remains unless this design explicitly replaces it and records the new ordering, cancellation, failure, or callback semantics

---

## 1. Executive decision

Rebuild each drag feature around one authoritative finite-state machine whose accepted event branch returns both:

1. the complete next state;
2. the semantic commands caused by that transition.

```text
event
  -> decide(state, event)
       -> complete next state
       -> ordered semantic effects
  -> commit next state
  -> execute effects
  -> executors dispatch typed observations/results
  -> process the next queued event
```

The machine decides **what an event means**.

Effect executors decide **how to interact with the browser, consumers, timers, promises, and mechanically owned resources**.

The target architecture has:

- a stable controller-state wrapper plus a hierarchical lifecycle union;
- `Decision<State, Effect>` as the only machine result;
- effects emitted in the same branch that accepts the event;
- FIFO run-to-completion event processing;
- explicit batch-stop and terminal-close rules;
- self-contained semantic commands;
- typed observations and results with complete currency;
- state-local generations and replay-pure decisions;
- explicit `ReportingFailure` and `Finalizing` continuations;
- one physical owner for every browser handle, cache, watcher, resolver, and runner;
- no `Gesture.handle(from, to, event)`;
- no production `planEffects(from, to, event)`;
- no shared `Gesture` base class;
- no semantic-state mirrors inside executors.

This is an architecture project, not a bundle-size project. Size and hot-path allocations must be measured, but they do not choose the responsibility model.

---

## 2. Why the current structure must change

The current reducer/session foundation already has one valuable property: state is committed before the transition hook runs. Re-entrant work therefore observes the newly committed state.

The structural problem is that every gesture class currently combines three different responsibilities:

1. **semantic interpretation** — infer the meaning of `(from, to, event)`;
2. **effect execution** — touch DOM, promises, callbacks, and timers;
3. **resource ownership** — retain lift, renderer, placeholder, frame task, resolver, watcher, and landing runner handles.

The reducers are the official state machines, while the gesture classes are second implicit transition tables.

Consequences include:

- semantic edges are duplicated outside the reducer;
- sortable mirrors reducer-owned operation state for frame and invalidation work;
- terminal callbacks recover erased data from `from`;
- some user-visible errors are reported before failure state commits;
- readiness watches and landing runners lack isolated replaceable ownership;
- mutable external identity allocation prevents replay-pure reduction;
- async work does not always carry enough currency;
- very large classes accumulate unrelated reasons to change.

The redesign removes semantic interpretation from the physical runtime first. Narrow resource owners then become natural rather than artificial extractions.

---

## 3. Normative principles

### 3.1 One semantic authority

Only the FSM decides:

- whether an event is accepted;
- which lifecycle state follows;
- which proposal, outcome, recovery, stage, or continuation is selected;
- which semantic effects are requested;
- the order and dependency of those effects;
- whether an observation is stale or relevant;
- when an operation may advance, recover, finalize, or retire.

Executors must not inspect lifecycle phases or transition diffs to rediscover why they were called.

### 3.2 Physical work returns observations, not semantic decisions

Executors own:

- DOM reads and writes;
- pointer capture;
- document-level pointer input;
- lift, renderer, and placeholder handles;
- frame tasks and rectangle caches;
- animations and timers;
- promises and abort controllers;
- calls into consumer capabilities;
- normalization of success and failure into typed events.

An executor may report:

```text
target unavailable
insertion observed
animation started
callback failed
presentation barrier settled
```

The FSM decides what those facts mean.

### 3.3 One physical owner per mutable handle

Every mutable mechanical lifetime has exactly one physical owner.

A scope may retain a disposer for ordered cleanup, but that does not create a second owner of the underlying replaceable handle.

### 3.4 Effects are semantic data

An effect:

- is a tagged immutable record;
- contains no generated executable closure;
- contains no mutable machine-state reference;
- contains no implicit `from`, `to`, or originating event access;
- may carry explicitly typed external identities and capabilities required by the command;
- carries complete currency for stale-result rejection.

Existing consumer callbacks, DOM nodes, thenables, and one-shot external capabilities are permitted. They are explicit inputs, not hidden transition closures.

### 3.5 Commit before effects

The complete next state is committed before any effect runs, including public callbacks and error reporting.

### 3.6 FIFO run-to-completion for ordinary events

Synchronous `dispatch()` during an effect appends an event. It does not recursively interrupt the current decision.

```text
commit decision N
-> execute the non-aborted effect batch of decision N
-> reduce queued event N+1
```

### 3.7 Terminal close is an out-of-band barrier

`destroy()` is not an ordinary event.

It immediately revokes ingress and mechanical ownership. After the currently executing executor returns, the remainder of the batch is skipped.

### 3.8 Pure decisions

For equivalent `(state, event)` input, the machine returns an equivalent decision.

Identity generation therefore lives in state or arrives on an event. The machine never calls a mutable external `ids.next()` source.

---

## 4. Non-goals

This design does not attempt to:

- preserve current internal APIs;
- preserve current source-file organization;
- preserve recursive dispatch ordering;
- introduce a generic statechart framework;
- introduce an observable bus or subscriber layer;
- make every imperative statement a separate effect;
- share draggable and sortable settlement machines before their invariants are proven identical;
- optimize source duplication through inheritance;
- keep the current broad nullable state object where it permits invalid combinations;
- guarantee session recovery after an unknown programmer/invariant failure.

---

## 5. Core contracts

Effects must be tagged records so `single | batch` is unambiguous.

```ts
export type TaggedEffect = Readonly<{
  type: number;
}>;

export type Effects<Effect extends TaggedEffect> =
  null | Effect | readonly Effect[];

export type Decision<State, Effect extends TaggedEffect> = Readonly<{
  state: State;
  effects: Effects<Effect>;
}>;

export type Machine<State, Event, Effect extends TaggedEffect> = (
  state: State,
  event: Event,
) => Decision<State, Effect>;
```

Ignored and stale events return the same state reference and no effects:

```ts
export const ignored = <State, Effect extends TaggedEffect>(
  state: State,
): Decision<State, Effect> => ({
  state,
  effects: null,
});
```

Effect execution has an explicit batch disposition:

```ts
export const CONTINUE_BATCH = 0;
export const STOP_BATCH = 1;

export type EffectDisposition = typeof CONTINUE_BATCH | typeof STOP_BATCH;

export type Execute<Effect extends TaggedEffect> = (
  effect: Effect,
) => EffectDisposition;
```

`STOP_BATCH` means that later commands in the same decision must not run. The executor is responsible for queueing the corresponding typed result/failure event before returning it.

---

## 6. Stable controller state and hierarchical lifecycle

Stable controller policy and generations should not be copied into every phase variant.

```ts
type ControllerState<Policy, Lifecycle> = Readonly<{
  policy: Policy;
  nextOperationId: number;
  lifecycle: Lifecycle;
}>;
```

A feature lifecycle is a discriminated union.

Representative draggable shape:

```ts
type DraggableLifecycle =
  | IdleLifecycle
  | PendingPointerLifecycle
  | PendingKeyboardLifecycle
  | ActivatingAcquiringLifecycle
  | ActivatingStartingLifecycle
  | DraggingLifecycle
  | ResolvingProposalLifecycle
  | AwaitingConsumerLifecycle
  | SettlingLifecycle<FreeDropResult>
  | ReportingFailureLifecycle<FreeDropResult>
  | FinalizingLifecycle<FreeDropResult>;
```

Representative sortable shape adds spatial and transaction-specific data:

```ts
type SortableLifecycle =
  | IdleLifecycle
  | PendingPointerLifecycle
  | PendingKeyboardLifecycle
  | ActivatingAcquiringSortableLifecycle
  | ActivatingStartingSortableLifecycle
  | SortingLifecycle
  | ResolvingInsertionLifecycle
  | ResolvingProposalLifecycle
  | AwaitingConsumerLifecycle
  | SettlingLifecycle<ReorderTransactionResult>
  | ReportingFailureLifecycle<ReorderTransactionResult>
  | FinalizingLifecycle<ReorderTransactionResult>;
```

The exact set of variants should follow the accepted-event/effect/result matrix, not current enum names.

### 6.1 Admission variants

Pointer and keyboard admission are explicit and do not use sentinel pointer IDs.

```ts
type PendingPointerLifecycle = Readonly<{
  phase: typeof PHASE_PENDING_POINTER;
  operation: PointerOperation;
}>;

type PendingKeyboardLifecycle = Readonly<{
  phase: typeof PHASE_PENDING_KEYBOARD;
  operation: KeyboardOperation;
}>;
```

### 6.2 Activation substates

Acquisition and consumer start are separate continuation points:

```ts
type ActivatingAcquiringLifecycle = Readonly<{
  phase: typeof PHASE_ACTIVATING_ACQUIRING;
  operation: AdmittedOperation;
}>;

type ActivatingStartingLifecycle = Readonly<{
  phase: typeof PHASE_ACTIVATING_STARTING;
  operation: CandidateOperation;
}>;
```

Candidate data is committed before `onStart` runs.

### 6.3 Settlement is a nested two-gate state

Do not flatten landing × presentation into a Cartesian union.

```ts
type SettlingLifecycle<Domain> = Readonly<{
  phase: typeof PHASE_SETTLING;
  operation: SettlingOperation;
  outcome: SettlementOutcome<Domain>;
  recovery: SettlementRecovery;
  landing: LandingGate;
  presentation: PresentationGate;
}>;
```

Representative gates:

```ts
type LandingGate =
  | LandingPreparing
  | LandingStarting
  | LandingRunning
  | LandingCompleting
  | LandingTerminal
  | LandingSkipped;

type PresentationGate =
  PresentationAbsent | PresentationWatching | PresentationTerminal;
```

A pure join helper decides finalization exactly once:

```ts
function settlementReady(state: SettlingLifecycle<unknown>): boolean {
  return (
    isLandingTerminal(state.landing) &&
    isPresentationTerminal(state.presentation)
  );
}
```

The real helper must define:

- failure precedence;
- replacement generations;
- home-recovery replacement;
- stale completion rejection;
- exactly-once finalization.

### 6.4 Reporting and finalizing are explicit continuations

```ts
type ReportingFailureLifecycle<Domain> = Readonly<{
  phase: typeof PHASE_REPORTING_FAILURE;
  operation: OperationCurrency;
  failure: CommittedFailure<Domain>;
  continuation: FailureContinuation;
}>;

type FinalizingLifecycle<Domain> = Readonly<{
  phase: typeof PHASE_FINALIZING;
  operation: OperationCurrency;
  terminal: TerminalOutcome<Domain>;
}>;
```

There is no promise that every failure is represented by a universal `failed` phase. The normative guarantee is:

> `REPORT_FAILURE` is emitted only after a committed post-failure state exists.

---

## 7. State-local identity and complete currency

All generations are machine state.

```ts
type OperationCurrency = Readonly<{
  operationId: number;
}>;

type ResolutionCurrency = Readonly<{
  operationId: number;
  resolutionId: number;
}>;

type LandingCurrency = Readonly<{
  operationId: number;
  landingId: number;
}>;

type SpatialCurrency = Readonly<{
  operationId: number;
  collectionVersion: number;
  spatialId: number;
}>;

type PresentationCurrency = Readonly<{
  operationId: number;
  resolutionId: number;
  presentationId: number;
}>;
```

A separate `presentationId` is required only if one resolution may rearm or replace its readiness watch. Otherwise `ResolutionCurrency` is sufficient.

An accepted admission consumes `nextOperationId` deterministically:

```ts
const operationId = state.nextOperationId;

return {
  state: {
    ...state,
    nextOperationId: operationId + 1,
    lifecycle: createPendingOperation(operationId, event),
  },
  effects: /* ... */,
};
```

Subordinate counters live with the operation:

```ts
type OperationGenerations = Readonly<{
  nextResolutionId: number;
  nextLandingId: number;
  nextSpatialId: number;
  nextPresentationId: number;
}>;
```

Required invariant:

```text
same state + same event
-> equivalent Decision
```

A result event is rejected by complete currency before its payload is inspected.

---

## 8. Operation admission, arming, disarming, and retirement

The mechanical operation lifetime starts at accepted admission, before activation threshold crossing.

Required common effects:

```ts
type BeginPointerOperationEffect = Readonly<{
  type: typeof BEGIN_POINTER_OPERATION;
  currency: OperationCurrency;
  request: BeginPointerOperationRequest;
}>;

type BeginKeyboardOperationEffect = Readonly<{
  type: typeof BEGIN_KEYBOARD_OPERATION;
  currency: OperationCurrency;
  request: BeginKeyboardOperationRequest;
}>;

type DisarmOperationEffect = Readonly<{
  type: typeof DISARM_OPERATION;
  currency: OperationCurrency;
}>;

type RetireOperationEffect = Readonly<{
  type: typeof RETIRE_OPERATION;
  currency: OperationCurrency;
}>;
```

`BEGIN_POINTER_OPERATION`:

- creates a fresh operation resource aggregate;
- creates the operation abort signal;
- arms document move/up/cancel/Escape input;
- associates the runtime with the exact operation currency;
- dispatches `OPERATION_ARMED` or `OPERATION_ARM_FAILED`.

`BEGIN_KEYBOARD_OPERATION`:

- creates operation resources without pointer listeners;
- establishes keyboard-specific ingress;
- may proceed directly to activation acquisition.

Every pending exit that never activates emits `DISARM_OPERATION`.

`DISARM_OPERATION`:

- releases pending input silently;
- emits no finish/cancel callback;
- retires the pending mechanical operation when complete.

`RETIRE_OPERATION`:

- clears every operation-local owner and cache;
- detaches the operation resource aggregate;
- ensures the next operation starts cleanly.

A second operation must never reuse leaf owners still carrying handles from the previous currency.

---

## 9. Effect payloads are self-contained requests

Executors must not read current FSM state.

Commands carry immutable request records with every semantic input required for execution.

```ts
type AcquireSortableActivationEffect = Readonly<{
  type: typeof ACQUIRE_SORTABLE_ACTIVATION;
  currency: OperationCurrency;
  request: SortableActivationRequest;
}>;

type SortableActivationRequest = Readonly<{
  pointerId: number | null;
  item: HTMLElement;
  visual: HTMLElement;
  collection: CollectionSnapshot;
  coordinateSpace: CoordinateSpacePolicy;
}>;
```

Spatial requests carry the dragged identity, immutable snapshot, point, incumbent, and full currency:

```ts
type ResolveInsertionEffect = Readonly<{
  type: typeof RESOLVE_ACTIVE_INSERTION | typeof RESOLVE_PROPOSAL_INSERTION;
  currency: SpatialCurrency;
  request: SpatialInsertionRequest;
}>;

type SpatialInsertionRequest = Readonly<{
  item: HTMLElement;
  collection: CollectionSnapshot;
  point: Point;
  incumbent: Insertion | null;
}>;
```

Landing preparation carries immutable activation/settlement geometry or explicitly references mechanically retained activation measurements:

```ts
type PrepareSortableLandingEffect = Readonly<{
  type: typeof PREPARE_SORTABLE_LANDING;
  currency: LandingCurrency;
  request: SortableLandingRequest;
}>;
```

Mechanical owners may retain values that are truly mechanical and operation-stable, such as:

- measured origin rectangle;
- acquired lift handle;
- placeholder DOM lease;
- rectangle cache;
- last immutable spatial request descriptor.

They must not retain a mutable mirror of lifecycle state, transaction stage, operation collection authority, or current proposal semantics.

---

## 10. Semantic effect vocabulary

The exact production union must be exhaustive before implementation. The following categories are normative even when individual names change.

### 10.1 Operation lifetime

```text
BEGIN_POINTER_OPERATION
BEGIN_KEYBOARD_OPERATION
DISARM_OPERATION
STOP_INTERACTION
RETIRE_OPERATION
```

### 10.2 Activation and lifecycle callbacks

```text
ACQUIRE_FREE_ACTIVATION
ACQUIRE_SORTABLE_ACTIVATION
INVOKE_START
INVOKE_MOVE
```

### 10.3 Presentation and spatial work

```text
PRESENT_MOTION
RESOLVE_ACTIVE_INSERTION
RESOLVE_PROPOSAL_INSERTION
PLACE_COMMITTED_INSERTION
INVALIDATE_SPATIAL_GEOMETRY
```

### 10.4 Consumer resolution

```text
OPEN_DROP_RESOLUTION
OPEN_REORDER_RESOLUTION
```

### 10.5 Settlement mechanics

```text
WATCH_PRESENTATION
PREPARE_FREE_LANDING
PREPARE_SORTABLE_LANDING
START_LANDING
PIN_LANDING
```

### 10.6 Failure and terminal continuations

```text
REPORT_FAILURE
FINALIZE_OPERATION
```

Every router must exhaustively handle the production union and end with `assertNever`.

No command is added merely because a current method exists. Commands describe semantic work with a distinct owner, dependency, or result protocol.

---

## 11. Effect atomicity and batch dependency

An effect is one transactional semantic operation when its internal steps cannot safely be executed, failed, or rolled back independently.

Activation acquisition remains one effect:

```text
measure
-> acquire lift
-> install placeholder
-> capture pointer
-> arm invalidation
-> register rollback after every successful step
-> report ready/failure
```

It is not split into implementation-detail effects.

### 11.1 Ordering rules

- Commands that prepare a consumer callback appear before it.
- A command that invokes arbitrary consumer code is the last or only command in its batch.
- A synchronous known failure queues its typed event and returns `STOP_BATCH`.
- Later dependent commands do not run after `STOP_BATCH`.
- Independent tail commands may continue only when their independence is explicit in the decision.
- A command that starts async work cannot be followed by work depending on its eventual success.
- Async continuation always occurs through a result event and a later decision.
- Terminal `close()` stops the remaining tail after the current executor returns.

Example:

```ts
effects: [
  {
    type: PRESENT_MOTION,
    currency,
    delta,
  },
  {
    type: INVOKE_MOVE,
    currency,
    callback,
    geometry,
  },
];
```

If rendering fails synchronously:

1. the presenter dispatches `MOTION_PRESENTATION_FAILED`;
2. it returns `STOP_BATCH`;
3. `INVOKE_MOVE` does not run;
4. the failure event is reduced after the aborted batch.

### 11.2 Consumer capability ordering

A callback effect is always last/sole because the consumer may:

- dispatch cancel/update;
- destroy the controller;
- replace external collection data;
- throw;
- synchronously trigger other browser work.

After invoking consumer code, the executor must recheck its terminal/current-operation token before any subsequent browser write or dispatch in the same executor.

---

## 12. Typed observations and result events

Executors report facts. The FSM assigns meaning.

Representative results:

```text
OPERATION_ARMED / OPERATION_ARM_FAILED
ACTIVATION_READY / ACTIVATION_FAILED
START_SUCCEEDED / START_FAILED
MOTION_PRESENTATION_FAILED
MOVE_CALLBACK_SUCCEEDED / MOVE_CALLBACK_FAILED
ACTIVE_INSERTION_RESOLVED / SPATIAL_RESOLUTION_FAILED
PROPOSAL_INSERTION_RESOLVED
DROP_RESOLVED / DROP_RESOLUTION_FAILED
REORDER_RESOLVED / REORDER_RESOLUTION_FAILED
PRESENTATION_SETTLED
LANDING_PLAN_RESOLVED / LANDING_UNAVAILABLE
LANDING_STARTED / LANDING_START_FAILED
LANDING_PINNED / LANDING_PIN_FAILED
LANDING_FINISHED / LANDING_FAILED
FAILURE_REPORTED
FINALIZATION_COMPLETED / FINALIZATION_FAILED
OPERATION_RETIRED
```

The production event algebra should avoid success acknowledgements that do not guard any real asynchronous or fallible boundary. However, an acknowledgement is required when:

- the machine must wait before progressing;
- external code may re-enter;
- mechanical acquisition may fail;
- ordering must be visible;
- a continuation requires currency validation.

---

## 13. FIFO session with batch stop, terminal close, and panic

The session owns:

- current state;
- FIFO event ordering;
- commit-before-effects;
- batch disposition;
- terminal close;
- panic containment.

Representative contract:

```ts
export type Session<State, Event> = Readonly<{
  dispatch(event: Event): void;
  state(): State | null;
  close(): void;
  closed(): boolean;
}>;
```

Representative implementation shape:

```ts
export function createSession<State, Event, Effect extends TaggedEffect>(
  initial: State,
  decide: Machine<State, Event, Effect>,
  execute: Execute<Effect>,
  panic: (error: unknown) => void,
): Session<State, Event> {
  let state: State | null = initial;
  let running = false;
  let terminal = false;
  const queue: Event[] = [];

  const close = (): void => {
    if (terminal) {
      return;
    }

    terminal = true;
    queue.length = 0;
    state = null;
  };

  const runEffect = (effect: Effect): boolean => {
    const disposition = execute(effect);

    return !terminal && disposition === CONTINUE_BATCH;
  };

  const runEffects = (effects: Effects<Effect>): void => {
    if (!effects || terminal) {
      return;
    }

    if (!Array.isArray(effects)) {
      runEffect(effects);
      return;
    }

    for (const effect of effects) {
      if (!runEffect(effect)) {
        break;
      }
    }
  };

  const dispatch = (event: Event): void => {
    if (terminal) {
      return;
    }

    queue.push(event);

    if (running) {
      return;
    }

    running = true;

    try {
      for (let index = 0; !terminal && index < queue.length; index++) {
        const current = state;

        if (!current) {
          break;
        }

        const decision = decide(current, queue[index]!);
        state = decision.state;
        runEffects(decision.effects);
      }
    } catch (error) {
      close();
      panic(error);
    } finally {
      queue.length = 0;
      running = false;
    }
  };

  return {
    dispatch,
    state: () => state,
    close,
    closed: () => terminal,
  };
}
```

The actual generic implementation may use a tagged batch representation instead of `Array.isArray`, but its semantics must match this section.

### 13.1 Ordinary re-entry

Consumer-generated events are queued in arrival order.

Example:

```text
INVOKE_START calls cancel()
-> CANCEL_REQUESTED is queued
-> INVOKE_START dispatches START_SUCCEEDED
-> START_SUCCEEDED is queued after CANCEL_REQUESTED
-> current effect returns
-> machine processes CANCEL_REQUESTED first
```

The machine explicitly decides which event wins in the resulting phase.

### 13.2 Terminal destroy

Controller destroy sequence:

```text
return if already terminal
-> mark controller terminal
-> session.close()
-> effect runtime destroy()
-> controller-lifetime input teardown
```

Effects already executing must not continue touching DOM after a callback-triggered destroy. Leaf owners expose terminal/current-operation guards for this purpose.

### 13.3 Panic policy

An unexpected throw from `decide`, the router, or an executor is a programmer/invariant failure.

Production policy:

```text
poison session ingress
-> stop current batch
-> clear queue and retained state
-> synchronously destroy operation resources
-> report exactly one fatal error through a non-FSM platform boundary
-> optionally rethrow in development after cleanup
```

Known DOM, browser, promise, resolver, timing, animation, and consumer failures must not reach panic. They become typed events.

The session is not reusable after panic.

---

## 14. Composition root and dispatch cycle

Effects need `dispatch`; the session needs `execute`.

Resolve this with a factory that installs a late-bound dispatch capability once, not a broad mutable context object.

```ts
function createControllerRuntime<State, Event, Effect extends TaggedEffect>(
  initial: State,
  decide: Machine<State, Event, Effect>,
  createEffects: (dispatch: (event: Event) => void) => EffectRuntime<Effect>,
  reportFatal: (error: unknown) => void,
) {
  let dispatch!: (event: Event) => void;

  const effects = createEffects((event) => {
    dispatch(event);
  });

  const session = createSession(
    initial,
    decide,
    (effect) => effects.execute(effect),
    (error) => {
      effects.destroy();
      reportFatal(error);
    },
  );

  dispatch = session.dispatch;

  return {
    dispatch,
    state: session.state,

    destroy(): void {
      session.close();
      effects.destroy();
    },
  };
}
```

Requirements:

- effect-owner constructors are side-effect-free;
- no owner dispatches before `dispatch` is installed;
- `destroy()` is idempotent;
- the runtime becomes inert after destroy;
- panic cleanup and explicit destroy cannot double-dispose unsafely.

---

## 15. Physical ownership map

`OperationResources` coordinates scopes and teardown. Leaf executors own replaceable handles.

| Resource                       | Physical owner                     |
| ------------------------------ | ---------------------------------- |
| Operation abort signal         | `OperationResources`               |
| Interaction scope              | `OperationResources`               |
| Presentation scope             | `OperationResources`               |
| Pointer/document input         | operation-input owner              |
| Consumer resolver              | resolution executor                |
| Presentation-readiness watch   | presentation-barrier executor      |
| Landing runner                 | landing executor                   |
| Frame task and rectangle cache | spatial executor                   |
| Placeholder lease              | placeholder/presentation owner     |
| Lift and renderer              | motion/presentation owner          |
| Origin geometry                | activation or presentation owner   |
| Consumer callback capability   | effect payload or committed policy |

`OperationResources` does **not** retain duplicate references to every leaf handle.

Leaf owners:

- register appropriate disposal with interaction or presentation scope;
- expose idempotent `replace`, `stop`, `release`, or `destroy`;
- validate current operation currency before writes;
- clear their own handle on replacement and retirement.

### 15.1 Authoritative destroy order

```text
close ingress
-> stop/abort interaction and unresolved resolution work
-> stop spatial scheduling and readiness watch
-> destroy landing runner
-> release placeholder/lift/renderer presentation
-> release operation scopes and signal
-> release controller-lifetime resources
```

Normal finalization differs:

```text
stop interaction
-> wait for settlement gates
-> release presentation
-> invoke finish/cancel
-> retire operation
```

Destroy emits no normal outcome.

---

## 16. Failure reporting as an acknowledged continuation

A known failure follows:

```text
executor catches error
-> dispatch typed failure event
-> machine commits post-failure ReportingFailure state
-> machine emits REPORT_FAILURE only
-> reporter invokes onError
-> reporter always dispatches FAILURE_REPORTED
-> machine rechecks currency and terminality
-> machine begins recovery or retirement
```

Representative state:

```ts
type ReportingFailureLifecycle<Domain> = Readonly<{
  phase: typeof PHASE_REPORTING_FAILURE;
  operation: OperationCurrency;
  failure: Readonly<{
    cause: FailureCause;
    error: unknown;
    domain: Domain | null;
  }>;
  continuation:
    | RecoverHomeContinuation
    | SkipLandingContinuation
    | RetireContinuation
    | ResumeFinalizationContinuation;
}>;
```

`REPORT_FAILURE` is the only command in its batch.

The error reporter:

1. invokes `onError`;
2. catches an `onError` exception;
3. forwards that exception to platform `reportError`;
4. still dispatches `FAILURE_REPORTED` for the original failure;
5. never recursively creates another FSM failure.

A callback-triggered `destroy()` closes ingress; the acknowledgement dispatch becomes inert.

---

## 17. Terminal finalization protocol

Settlement does not transition directly to idle.

```text
landing gate terminal
+
presentation gate terminal
-> Finalizing state
-> FINALIZE_OPERATION
```

`FINALIZE_OPERATION` is a transaction:

1. release presentation;
2. invoke the appropriate finish/cancel capability;
3. dispatch `FINALIZATION_COMPLETED` or `FINALIZATION_FAILED`.

It is the only command in its batch.

```ts
type FinalizeOperationEffect<Domain> = Readonly<{
  type: typeof FINALIZE_OPERATION;
  currency: OperationCurrency;
  terminal: TerminalOutcome<Domain>;
  capability: FinishCapability<Domain> | CancelCapability<Domain> | null;
}>;
```

On success:

```text
Finalizing + FINALIZATION_COMPLETED
-> idle
-> RETIRE_OPERATION
```

On callback failure:

```text
Finalizing + FINALIZATION_FAILED
-> ReportingFailure(callback failure, terminal outcome preserved)
-> REPORT_FAILURE
-> FAILURE_REPORTED
-> idle
-> RETIRE_OPERATION
```

The domain outcome is not rewritten because notification failed.

If there is no finish/cancel capability, finalization still performs presentation release and dispatches completion.

---

## 18. Live policy and `update()` under FIFO semantics

Semantic configuration changes are queued events.

`update()` creates an immutable policy snapshot and dispatches:

```ts
type PolicyUpdated<Policy> = Readonly<{
  type: typeof POLICY_UPDATED;
  policy: Policy;
}>;
```

Rules:

- the current effect batch continues with the policy/capabilities captured when its decision was created;
- `POLICY_UPDATED` becomes visible only when its queued decision commits;
- later decisions use the new policy;
- an effect that invokes a consumer callback carries that exact external capability;
- executors do not read a mutable live options object after the decision;
- timing/target/provider capabilities required by an effect are captured explicitly in its request.

This prevents one batch from mixing old semantic policy with newly mutated executor options.

FIFO examples must be specified and tested for:

- `onStart` calls `cancel()` then returns;
- `onStart` calls `destroy()` then returns;
- `onMove` calls `update()` or `cancel()`;
- `onDrop` calls `cancel()` then resolves;
- `onError` calls `destroy()`;
- a consumer getter replaces a sortable collection during spatial observation.

Arrival order is deterministic; the phase handler decides which event remains relevant.

---

## 19. Mechanical invalidation and bounds

### 19.1 Sortable invalidation

The spatial executor may retain:

- rectangle cache;
- frame task;
- dirty flag;
- latest immutable `SpatialInsertionRequest` descriptor;
- current spatial currency.

It may not retain the full current operation or transaction state.

Scroll/resize invalidation:

1. marks geometry dirty;
2. replays the immutable latest request or dispatches a tagged invalidation event;
3. returns a result carrying complete `SpatialCurrency`.

Placeholder placement and collection replacement dirty the rectangle cache.

Release:

- cancels scheduled active work;
- marks geometry dirty;
- resolves the true release point with a fresh read-before-write pass;
- emits proposal insertion observation;
- leaves no stale active spatial command capable of committing.

Collection rebase remains semantic identity-gap work in the FSM.

### 19.2 Draggable bounds

- Static element/viewport bounds are executor-cached.
- Invalidation refreshes the cache.
- A function bounds provider is read for every accepted active move/release that requires it.
- No bounds read occurs for foreign or sub-threshold movement.
- Controlled position is an authoritative semantic update and bypasses pointer constraints where specified.
- If the pure machine needs an observed bound to decide motion, the effect returns a typed bounds observation event rather than hiding the read.

Normalized ingress data and browser observations are distinct concepts.

---

## 20. Accepted-transition/effect/result matrices

Before implementation, each feature must have an exhaustive matrix. The following common lifecycle matrix is normative as a minimum.

| Accepted state/event | Complete next state | Ordered effect(s) | Possible result event(s) |
| --- | --- | --- | --- |
| idle + pointer admission | pending pointer | `BEGIN_POINTER_OPERATION` | armed / arm failed |
| idle + keyboard admission | pending keyboard or activating/acquiring | `BEGIN_KEYBOARD_OPERATION`, optionally activation | armed / arm failed / activation result |
| pending + threshold crossed | activating/acquiring | acquire activation | ready / failed |
| pending + release/cancel/foreign termination | idle | `DISARM_OPERATION` | operation retired |
| acquiring + activation ready | activating/starting | `INVOKE_START` | succeeded / failed |
| acquiring + activation failed | reporting failure | `REPORT_FAILURE` | failure reported |
| starting + start succeeded | active | initial presentation if required | presentation result |
| starting + start failed | reporting failure | `REPORT_FAILURE` | failure reported |
| active + accepted move | active | present motion, invoke move | presentation/move failure |
| active + release | resolving | open consumer resolution or resolve release geometry | resolved / failed |
| active/resolving + cancel | settling/reporting as policy requires | stop interaction / report / prepare recovery | typed results |
| accepted consumer result | settling | stop interaction, watch presentation, prepare landing | barrier/plan results |
| landing plan resolved | settling/landing starting | start landing | started / failed |
| landing running + completion request | settling/completing | pin landing | pinned / failed |
| landing/presentation gates both terminal | finalizing | `FINALIZE_OPERATION` | completed / failed |
| finalizing + completed | idle | `RETIRE_OPERATION` | retired |
| finalizing + failed | reporting failure | `REPORT_FAILURE` | failure reported |
| reporting + failure reported | continuation-specific state | recovery/finalization/retire effect | typed result |
| any live state + destroy | terminal out-of-band | none through FSM | none |

The draggable matrix must additionally cover:

- pointer and keyboard activation;
- threshold/no-threshold paths;
- move callbacks absent/present;
- controlled position updates;
- static/dynamic bounds;
- release at true pointer-up point;
- drop resolver success, rejection, cancellation, failure;
- home target available/unavailable/invalid;
- presentation readiness overlap and failure.

The sortable matrix must additionally cover:

- pointer and keyboard convergence;
- placeholder acquisition and placement;
- active insertion resolution;
- frame invalidation;
- collection replacement/removal;
- proposal insertion resolution;
- no-op versus real proposal;
- reorder resolver outcomes;
- destination versus home landing;
- disconnected visual;
- stale spatial, collection, resolution, landing, and presentation results.

No router or machine implementation begins until its matrix is complete enough to make every command and result event discoverable.

---

## 21. Feature effect runtimes

There is no shared gesture interpreter.

Representative draggable runtime:

```text
DraggableEffects
├── OperationInput
├── FreeActivation
├── MotionPresentation
├── DropResolution
├── HomeTargetObservation
├── PresentationBarrier
├── Landing
├── Finalization
├── ErrorReporter
└── OperationResources
```

Representative sortable runtime:

```text
SortableEffects
├── OperationInput
├── SortableActivation
├── MotionPresentation
├── SpatialInsertion
├── PlaceholderPresentation
├── ReorderResolution
├── LandingTargetObservation
├── PresentationBarrier
├── Landing
├── Finalization
├── ErrorReporter
└── OperationResources
```

These are logical responsibilities, not a requirement for one class per line.

Use a class only when the entity owns mutable mechanical state or a replaceable resource. Use functions for stateless transformations and one-shot work.

The router:

- switches only on effect tag;
- never receives state;
- never inspects a phase;
- returns `CONTINUE_BATCH` or `STOP_BATCH`;
- is exhaustive with `assertNever`;
- becomes inert after destroy.

---

## 22. Direct implementation strategy

There is no temporary production planner.

### Step 1 — Complete the protocol design

Before coding:

- define lifecycle unions;
- complete accepted-transition matrices;
- define effect and result unions;
- define currency and generation locations;
- define reporting/finalization continuations;
- define batch dependency and stop rules;
- define live policy update behavior;
- define physical ownership and destroy order.

### Step 2 — Implement the kernel

Implement and test:

- `Decision`;
- `Effects`;
- FIFO session;
- batch disposition;
- terminal close;
- panic policy;
- controller runtime factory;
- currency helpers;
- operation resource scopes.

### Step 3 — Rebuild draggable as one vertical slice

Implement:

```text
DraggableState
DraggableEvent
DraggableEffect
decideDraggable()
createDraggableEffects()
controller facade
```

Use current code and tests only as behavioral references.

Delete the old draggable reducer/gesture path when the vertical slice is complete.

### Step 4 — Validate ownership and representation

Before sortable:

- test every callback re-entry sequence;
- test destroy from every callback;
- test reporting and finalization continuations;
- test watcher and landing replacement;
- record move-path allocation and bundle baselines;
- adjust physical effect representation without changing the logical algebra.

### Step 5 — Rebuild sortable

Implement the complete sortable vertical slice:

- hierarchical state;
- full spatial currency;
- immutable spatial request descriptors;
- no semantic mirrors;
- collection replacement/removal matrix;
- pointer and keyboard convergence;
- explicit proposal observation and semantic construction.

Delete the old sortable reducer/gesture path.

### Step 6 — Share only proven identical invariants

Potential shared pieces:

- session;
- decisions and currency helpers;
- operation resource scopes;
- presentation barrier;
- landing owner;
- pure two-gate settlement join;
- perhaps failure-reporting continuation helpers.

Do not share complete machines merely because state names resemble one another.

---

## 23. Testing strategy

### 23.1 Machine tests

For every accepted event:

- exact complete next state;
- exact ordered effect output;
- original identity plus no effects for ignored/stale events;
- deterministic replay;
- complete currency before payload inspection;
- candidate committed before start callback;
- failure reporting emitted only from reporting state;
- terminal data retained in finalizing state;
- exactly-once settlement join;
- no stale event reopens or advances a later operation.

### 23.2 Session tests

- state commits before effects;
- nested dispatch is FIFO queued;
- callback-generated events preserve arrival order;
- `STOP_BATCH` prevents dependent tail effects;
- terminal close prevents the remaining tail;
- close clears queued events and retained state;
- close/destroy is idempotent;
- panic closes ingress and destroys resources exactly once;
- session is not reused after panic.

### 23.3 Executor tests

- pointer admission arms input and creates operation resources;
- every pending exit disarms silently;
- partial activation rolls back in reverse order;
- known failures dispatch the correct typed event and disposition;
- every callback executor rechecks terminal/current-operation status;
- readiness watches dispose on replacement, completion, retirement, and destroy;
- landing replacement destroys the old runner first;
- spatial scheduler/cache resets between operations;
- resolver abort happens exactly once while unresolved and never after completion;
- presentation release precedes finish/cancel;
- finalization failure preserves terminal domain outcome;
- `onError` failure goes to platform reporting and still acknowledges the original failure;
- no executor touches DOM or dispatches after runtime destroy.

### 23.4 FIFO behavior tests

Record exact ordering for:

- `onStart -> cancel`;
- `onStart -> destroy`;
- `onMove -> update`;
- `onMove -> cancel`;
- `onDrop -> cancel -> return/resolve`;
- `onError -> destroy`;
- spatial consumer getter -> collection replacement;
- callback-generated event versus executor success event.

### 23.5 Integration characterization

Retain or add:

- true release point;
- bounds caching and dynamic-provider reads;
- controlled-position bypass;
- render-before-move contract;
- interaction stop before settlement;
- concurrent landing and presentation barriers;
- accepted/no-op finish;
- rejected/canceled cancel;
- failed neither finish nor cancel;
- keyboard/pointer sortable convergence;
- fresh read-before-write proposal resolution;
- placeholder placement dirties geometry;
- collection replacement/removal phase matrix;
- owning-realm API behavior;
- cross-realm structural input discrimination;
- stale async work cannot affect later operations;
- two consecutive operations reset every owner;
- destroy never manufactures a normal outcome.

### 23.6 Performance gates

Record before and after:

- draggable standalone Brotli;
- sortable standalone Brotli;
- combined Brotli;
- accepted pointer-move allocations;
- large-sortable movement and release latency;
- frame scheduling behavior.

Logical effect algebra may use a compact physical representation:

- numeric private tags;
- `null | single | tagged batch`;
- no one-element arrays;
- no per-command generated closures;
- combined motion-publication transaction if measurement and failure semantics justify it.

Performance representation must not reintroduce semantic transition decoding into executors.

---

## 24. File organization

Illustrative layout:

```text
kernel/
  decision.ts
  session.ts
  runtime.ts
  currency.ts
  operation-resources.ts
  presentation-barrier.ts
  landing.ts

draggable/
  machine/
    state.ts
    event.ts
    effect.ts
    decide.ts
    idle.ts
    pending.ts
    activating.ts
    active.ts
    resolving.ts
    settling.ts
    reporting.ts
    finalizing.ts
  effects/
    create-effects.ts
    operation-input.ts
    activation.ts
    motion.ts
    resolution.ts
    home-target.ts
    presentation-barrier.ts
    landing.ts
    finalization.ts
    errors.ts
  draggable.ts

sortable/
  machine/
    state.ts
    event.ts
    effect.ts
    decide.ts
    idle.ts
    pending.ts
    activating.ts
    active.ts
    spatial.ts
    resolving.ts
    settling.ts
    reporting.ts
    finalizing.ts
  effects/
    create-effects.ts
    operation-input.ts
    activation.ts
    motion.ts
    spatial.ts
    placeholder.ts
    resolution.ts
    landing-target.ts
    presentation-barrier.ts
    landing.ts
    finalization.ts
    errors.ts
  sortable.ts
```

Split by actual responsibility. Do not create tiny files solely to imitate the diagram.

---

## 25. Acceptance criteria

The redesign is accepted when:

1. One phase-specific FSM produces state and effects in the same accepted event branch.
2. No production runtime receives `(from, to, event)` to infer semantic work.
3. No production planner reconstructs effects from a state diff.
4. The lifecycle union represents pointer/keyboard admission, activation acquisition/start, active/resolving, settling, reporting, and finalizing continuations explicitly.
5. Operation and subordinate identities are state-local and replay-pure.
6. Admission creates operation resources through explicit effects.
7. Every pending exit disarms silently.
8. Every effect payload is executable without reading current FSM state.
9. Effects contain no generated closure or mutable machine-state reference.
10. FIFO run-to-completion ordering is explicit and tested.
11. Synchronous known failure can stop a dependent batch tail.
12. Terminal close interrupts the batch tail and revokes resource ownership.
13. Panic is terminal, cleans up, and reports through a non-FSM boundary.
14. Every mutable mechanical handle has one physical owner.
15. `OperationResources` coordinates scopes and teardown without duplicating leaf handles.
16. Failure reporting is an acknowledged continuation.
17. Finalization is explicit and presentation cleanup precedes finish/cancel callbacks.
18. `onError` failure cannot recursively enter the FSM.
19. Live updates do not mix old and new policy in one batch.
20. Sortable keeps no mutable mirror of reducer-owned semantic state.
21. Spatial, resolution, landing, and presentation results carry complete currency.
22. Invalidation uses immutable request descriptors or explicit events.
23. Routers are exhaustive and phase-blind.
24. No executor touches DOM or dispatches after destroy.
25. Two consecutive operations reset all owners and caches.
26. Existing behavioral contracts pass unless explicitly superseded and documented.
27. The source tree makes semantic decision, physical execution, and resource ownership independently discoverable.

Bundle size and allocation changes are recorded and bounded. A justified size delta does not invalidate a materially better responsibility model.

---

## 26. Final decision

Proceed directly with:

```text
stable controller state
+
hierarchical lifecycle FSM
+
Decision<State, Effect>
+
effects emitted in the accepting branch
+
FIFO run-to-completion queue
+
batch STOP/CONTINUE disposition
+
terminal close barrier
+
self-contained semantic requests
+
typed currency-tagged observations
+
explicit reporting/finalizing continuations
+
small single-owner physical executors
```

Do not add a temporary `planEffects(from, to, event)` production layer.

Do not retain the current gesture classes as semantic interpreters.

Do not extract a shared gesture base.

Use the existing implementation only as:

- a behavioral reference;
- an edge-case inventory;
- a source of mechanical helpers worth retaining;
- a characterization-test corpus.

The target is not merely smaller classes. The target is a system in which every semantic decision, continuation, physical effect, and resource lifetime has exactly one obvious home.
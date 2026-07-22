Thanks — I agree with most of these resolutions. I would like to adopt them, but with one broader architectural adjustment: represent substantially more of the interaction and transaction lifecycle in the composed FSM rather than leaving it inside stateful gesture/transaction entities.

## 1. Landing cancellation and destroy ownership

I agree with the ownership model:

- `LandingRunner` exclusively owns the animation and its cancellation mechanism.
- The feature gesture owns the current `LandingRunner` and the teardown order.
- `GestureScope` owns only the abort signal and the interaction/presentation resource scopes.
- Normal semantic cancellation lands home; only terminal controller destruction immediately stops landing.

The destroy sequence should be synchronous and terminal:

```text
controller.destroy()
  1. return if already terminal
  2. mark the controller terminal
  3. snapshot and clear currentGesture, revoking gesture currency
  4. close DragSession without running protocol effects
  5. abort the gesture signal
  6. dispose the interaction ResourceScope
  7. destroy the LandingRunner
       - mark it destroyed before Animation.cancel()
       - never pin the target
       - never dispatch landing completion
  8. dispose the presentation ResourceScope
  9. dispose controller-lifetime resources
```

No `onCancel` or `onFinish` callback runs.

`LandingRunner.destroy()` must be idempotent. It should not itself belong to either `ResourceScope`; otherwise animation ownership and destruction order become ambiguous.

I also agree with keeping landing completion distinct from semantic cancellation:

```ts
type LandingResult =
  | Readonly<{ type: 'finished' }>
  | Readonly<{ type: 'destroyed' }>
  | Readonly<{ type: 'interrupted'; error: unknown }>;
```

Intentional destruction is silent. Unexpected interruption enters deterministic failure recovery.

## 2. Reorder requests use one immutable collection snapshot

Agreed. The existing source-version/destination-version wording is incorrect.

Release should produce one proposal snapshot:

```text
1. apply any pending collection-change policy
2. flush insertion
3. capture S = { items, version }
4. require insertion.version === S.version
5. derive every operational request field from S
```

```ts
type ReorderRequest = Readonly<{
  item: HTMLElement;
  version: number;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;
```

`from`, `to`, `before`, and `after` must all belong to the same snapshot.

`SortableCollection` should own an immutable snapshot rather than retain a caller-owned mutable array. A shallow copy is sufficient:

```ts
snapshot = {
  items: [...items],
  version: previous.version + 1,
};
```

Runtime freezing is optional, but the library must own stable snapshot contents.

`Insertion` should also carry the collection version it describes:

```ts
type Insertion = Readonly<{
  version: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
  index: number;
}>;
```

Activation history, if useful, can be exposed separately as `activationVersion` / `activationIndex`; it must not become the operational `from`.

## 3. Removal is cancellation only while the transaction remains open

Agreed.

The transaction has one explicit terminal boundary:

```text
ReorderTransaction resolves exactly once.
```

Before that boundary:

- removal while pending or dragging cancels with `item-removed`;
- removal while the consumer decision is pending aborts/suppresses that decision and cancels;
- removal while collection acknowledgement is pending cancels;
- callback acceptance is provisional and does not by itself make the transaction terminal.

After `ReorderTransaction` resolves, its outcome is immutable. A later collection mutation does not retroactively rewrite it.

If the item or visual becomes unusable during landing after a terminal transaction outcome, presentation should terminate safely and dispose immediately, while preserving the already-final transaction outcome.

Under the current reorder-only contract, removal is not interpreted as a successful reorder.

## 4. Put more semantic state in the composed FSM

I agree that `failed` should become a real internal settlement result, but I think this exposes a more general extension requirement.

Rather than keeping transaction stages, acknowledgement state, landing interruption, and recovery status as mutable fields inside `FreeDragGesture`, `SortableGesture`, or a promise-based `ReorderTransaction`, I would prefer a Redux-like composed FSM:

```text
one event stream
one atomic state
one reducer pipeline
effects interpreted from committed transitions
```

The kernel owns the common lifecycle graph. Draggable and sortable extend the state and event unions with feature-specific fields and transitions.

Conceptually:

```ts
type Reducer<State, Event> = (
  state: State,
  event: Event,
  initial: State,
) => State;

function composeReducers<State, Event>(
  ...reducers: readonly Reducer<State, Event>[]
): (state: State, event: Event) => State {
  return (initial, event) => {
    let state = initial;

    for (const reducer of reducers) {
      state = reducer(state, event, initial);
    }

    return state;
  };
}
```

```ts
const transitionSortable = composeReducers(
  transitionKernel,
  transitionSortableFeature,
);
```

The complete next state is the output of the entire reducer pipeline. Intermediate results produced by individual reducers are not committed or observable.

`DragSession` retains the existing state-before-effects guarantee:

```ts
const from = current;
const to = transition(from, event);

current = to;

if (to !== from) {
  routeEffects(from, to, event);
}
```

### Internal convention rather than restrictive wrapper types

I do not think v1 needs a structurally separated shape such as:

```ts
{
  kernel: KernelState;
  feature: FeatureState;
}
```

The kernel is internal, and all reducers are package-owned. A convention is sufficient:

> The kernel reducer owns the common lifecycle fields and phase graph. Feature reducers may extend and refine the state with feature-specific fields, but must not contradict kernel transitions or mutate kernel-owned lifecycle fields except through supported kernel events.

A flat feature state may structurally extend the kernel state:

```ts
type FailedSettlementState = Readonly<{
  type: 'settling';
  result: 'failed';
  recovery: 'home' | 'immediate';
}>;

type SortableInterruptedSettlementState = FailedSettlementState &
  Readonly<{
    cause: 'landing-interrupted';
    error: unknown;
    transaction: ReorderTransactionResult | null;
  }>;
```

The kernel reads only:

```ts
state.type;
state.result;
state.recovery;
```

The sortable reducer and effects see the complete state.

If this extension point later becomes public or independently extensible, stronger structural enforcement can be reconsidered. It does not seem useful for an internal v1 implementation.

### What belongs in the FSM

Every meaningful logical fact about the current operation should preferably be represented in state:

- admitted item and visual identity;
- current pointer and insertion;
- collection and insertion versions;
- reorder proposal;
- decision stage;
- acknowledgement stage and result;
- accepted, rejected, canceled, or failed settlement;
- transaction outcome;
- landing running, finished, or interrupted;
- recovery policy;
- cancellation or failure reason.

What remains outside the FSM are live effect resources:

- `AbortController`;
- event listener disposers;
- `Animation`;
- pointer capture;
- `ResourceScope`;
- observers and subscriptions;
- pending promise objects;
- animation-frame ids;
- style, top-layer, placeholder, and other presentation leases.

The principle is:

> If a value is required to explain the current logical state or choose the next transition, it belongs in the FSM. If it exists only to execute or cancel an effect, it belongs to the effect/resource owner.

DOM elements do not need to be excluded from state. This is an internal browser-specific FSM, not a serializable Redux store.

## 5. `failed` as an extended settlement state

The kernel can define the common failure projection:

```ts
type KernelSettlement =
  | Readonly<{ result: 'accepted' }>
  | Readonly<{ result: 'rejected' }>
  | Readonly<{ result: 'canceled' }>
  | Readonly<{
      result: 'failed';
      recovery: 'home' | 'immediate';
    }>;
```

Feature reducers refine it with domain details.

For example, landing interruption after an already accepted reorder can be represented without losing either fact:

```ts
{
  type: 'settling',
  result: 'failed',
  recovery: 'immediate',

  cause: 'landing-interrupted',
  error,

  transaction: {
    type: 'accepted',
    acknowledgement: 'observed',
  },
}
```

The kernel projection says:

> The common settlement process failed and requires immediate recovery.

The feature extension says:

> The reorder transaction itself had already reached an accepted terminal outcome, and the subsequent presentation failed.

These are two projections of one complete state, not contradictory outcomes.

This lets us preserve the useful rules you proposed:

- active or awaiting-result engine failure enters `settling(failed, home | immediate)`;
- landing creation failure or interruption enters/refines `settling(failed, immediate)`;
- `failed` never invokes `onCancel`;
- an activated non-destroyed gesture invokes `onFinish` exactly once;
- activation failure before successful activation is transactional abandonment, not settlement failure;
- decision callback throw/rejection remains normalized to rejected;
- destroy has no settlement outcome or finish callback;
- `onCancel` failure is reported without changing canceled semantics unless later settlement itself fails.

The originating error should be reported exactly once. The entity that converts an exception into a typed failure event/result reports it; downstream reducers and effect consumers do not report the same error again.

## 6. Events should be extended similarly

Feature event unions may extend kernel events:

```ts
type SortableEvent =
  | KernelDragEvent
  | Readonly<{
      type: 'collection-replaced';
      snapshot: CollectionSnapshot;
    }>
  | Readonly<{
      type: 'decision-accepted';
      result: ReorderDecisionResult;
    }>
  | Readonly<{
      type: 'collection-observed';
      snapshot: CollectionSnapshot;
    }>
  | Readonly<{
      type: 'collection-timeout';
    }>
  | Readonly<{
      type: 'landing-interrupted';
      error: unknown;
    }>;
```

Feature-only events may change feature fields without changing the kernel phase.

When a feature condition must change the common lifecycle—for example, dragged-item removal—the feature layer should dispatch or translate it into a generic kernel event such as cancellation/failure rather than directly inventing an unsupported phase edge.

## 7. Reconsider stateful transaction entities

With this FSM-heavy approach, `ReorderTransaction` should probably not remain a stateful async object hiding the full process behind one promise:

```ts
const outcome = await transaction.run(request);
```

Instead, the transaction becomes visible in state:

```text
release
  -> awaiting-result(decision)

decision-accepted
  -> awaiting-result(acknowledgement)

collection-observed / collection-timeout
  -> settling(accepted)

decision-rejected
  -> settling(rejected)

item-removed while open
  -> settling(canceled)
```

The remaining entities are narrow effect launchers:

- invoke and normalize the consumer decision;
- subscribe for collection acknowledgement;
- dispatch typed completion/failure events;
- dispose their resources through the interaction scope.

The same principle applies to free-drop decisions.

This should prevent `FreeDragGesture`, `SortableGesture`, and `ReorderTransaction` from becoming new monolithic controllers containing hidden mutable lifecycle state. The gesture entities become primarily transition-effect interpreters and resource owners.

## Proposed document changes

Please revise the architecture document to incorporate:

1. the destroy ownership and synchronous teardown sequence above;
2. one immutable proposal collection version for every reorder request field;
3. explicit transaction terminality and the revised item-removal policy;
4. an internal ordered reducer pipeline allowing draggable/sortable to extend kernel state and event unions;
5. the convention that kernel owns the phase graph while feature reducers refine feature-specific state;
6. a preference for placing meaningful interaction, transaction, recovery, and settlement facts in the FSM;
7. live platform resources remaining outside the FSM;
8. `failed` as a real common settlement projection that feature states may refine without losing a previously completed domain transaction;
9. reconsideration of promise-hidden `ReorderTransaction` stages in favor of explicit FSM stages and narrow effect runners.

Please also call out any state that still appears duplicated between the composed FSM and the proposed gesture/transaction entities after this change. That duplication is likely a sign that ownership has not yet been fully resolved.
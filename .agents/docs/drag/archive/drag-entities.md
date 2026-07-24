# Drag logical entities

## Purpose

`@ydinjs/drag` already has a capable low-level kernel, but its two public entry points are difficult to read as compositions. `draggable.ts` and `sortable.ts` each combine configuration, pointer admission, mutable operation data, DOM resources, rendering, asynchronous consumer resolution, landing, error recovery, and public controller behavior in one closure.

This document derives the package's logical entities from first principles. An entity here is a cohesive unit with one reason to change, one explicit lifetime, and a narrow contract. An entity is not necessarily a class or a file. Several small entities may live in one module when that improves navigation without combining their ownership.

The target is an internal architecture for an unpublished pre-alpha package. The two public entry-point concepts remain:

- `draggable(item, options): FreeDragController`
- `sortable(container, options): SortableController`

Their exact option, update, collection, callback, and result contracts are provisional. The target architecture may intentionally replace those contracts where the current API encodes accidental, unclear, or incorrect behavior.

Every behavioral change must be stated as an explicit design decision, implemented separately from unrelated entity extraction where practical, and covered by focused tests. Backward compatibility with the current implementation is not itself a goal. Promising low-level entities may become public later, but their contracts should first be proved internally.

## What “programming lego” means here

The useful model in `packages/core` is its small composition spine and narrow controllers, not every file in that package. `ControlledElement` dispatches a small lifecycle protocol, while controllers such as `useEvents`, `useResizeObserver`, and `useAttributes` each own one platform behavior. Higher features are mostly wiring.

The drag package should follow the same rules:

1. An entity's responsibility can be stated as one verb-object sentence.
2. Every mutable value and acquired resource has one owner.
3. Acquiring a resource returns, or is itself, its matching release operation.
4. Pure calculation does not read the DOM or global state.
5. Effectful entities receive the elements and callbacks they need explicitly.
6. Entry points compose entities; they do not contain feature algorithms.
7. Sharing happens only for identical invariants, not merely similar-looking code.
8. Hot pointer movement stays allocation-light and does not perform matrix or layout work unnecessarily.
9. Contracts are small `Readonly<>` capabilities rather than a shared mutable “drag context.”
10. A new `DraggableSession` or `SortableSession` containing today's mutable fields would only move the monolith and is not a valid decomposition.
11. One authoritative root reducer owns the complete semantic state of each feature.
12. Pure state projections may be composed only in parallel from the same previous state and event; no projection observes another projection's partially built result.
13. Once a valid proposal enters consumer resolution, only its matching explicit resolution or an explicit library cancellation/failure event may terminalize it. Collection shape, DOM shape, elapsed time, and absent callback results never imply consumer acceptance, rejection, persistence, renderer readiness, or successful completion. Pre-proposal validation and pre-terminal operation invalidation remain engine-owned policies.

`packages/core/src/traits/reorderable.ts` is not the model to copy: it combines many of the concerns that this package is trying to separate.

## Current shape

The existing kernel has several strong seams:

- `kernel/fsm.ts` owns the pure transition graph.
- `kernel/session.ts` assigns state before running re-entrant effects.
- `draggable/bounds.ts` owns pure movement constraints.
- `kernel/coordinate.ts` owns viewport/local conversion.
- `kernel/commit.ts` isolates the current inferred sortable-commit behavior; the target replaces that inference with explicit consumer resolution.
- `sortable/resolve.ts` and `sortable/anchor.ts` are already small feature helpers.

The missing layer is between those primitives and the public façades. Both entry points still directly own the application-level entities that use the kernel.

### Responsibilities mixed in `draggable.ts`

- construction-time and live configuration;
- press/handle admission;
- controller, armed-session, active-drag, and landing resources;
- pointer, rect, delta, mapper, and controlled-position state;
- lift-mode selection and transform composition;
- movement constraints, rendering, geometry reporting, and invalidation;
- drop request construction and asynchronous consumer resolution;
- stale-result suppression;
- landing target selection and animation;
- transition-effect routing, error recovery, cleanup, and public methods.

### Responsibilities mixed in `sortable.ts`

- collection storage and updates;
- item/handle admission;
- all of the shared lifecycle and presentation concerns above;
- placeholder creation, placement, and removal;
- rectangle caching, rAF scheduling, hit testing, and hysteresis;
- source/destination index and neighbor calculation;
- reorder proposal construction and asynchronous consumer resolution;
- finish-outcome derivation;
- pointer and keyboard operation arbitration;
- public methods and callbacks.

The long files are a symptom. The deeper issue is that ownership and lifetimes are implicit in local variables and branch ordering.

## Lifetime model

The target architecture makes four nested lifetimes visible. Entities are created at, and may only own resources from, one of these levels.

| Lifetime | Begins | Ends | Representative resources |
| --- | --- | --- | --- |
| Controller | `draggable()` / `sortable()` construction | `destroy()` | `DragSession`, start listener, current collection/configuration |
| Admitted operation | accepted `pointerdown` or `keyboard-command` | session returns to idle, fails, or is destroyed | operation identity; pointer input additionally owns document listeners and pointer ownership |
| Activating operation | pointer threshold crossed or immediate keyboard activation | activation succeeds, fails, or controller is destroyed | transactional visual/placeholder acquisition |
| Active visual | `start-succeeded` | final cleanup | lift/style leases, pointer capture, invalidation listeners, motion/insertion effects |
| Resolution/landing | pointer release or cancellation | consumer resolution and landing complete, or destroy | dedicated resolution continuation, animation |

The controller owns at most one current pointer or keyboard operation. Every admitted operation composes two ordered resource scopes:

- **interaction scope** — document input listeners, invalidation listeners, pointer capture, scheduled preview work, and dedicated consumer-resolution continuations;
- **presentation scope** — top-layer state, inline styles, placeholder presence, and other visual resources that must survive through landing.

Entering settlement aborts the general gesture signal and disposes the interaction scope immediately. Each consumer-resolution invocation instead owns a dedicated `AbortController`, registered in the interaction scope through an unresolved-only disposer. The effect marks normal completion before dispatching its result, so settlement disposal cannot emit a false abort after acceptance or rejection. Normal landing completion disposes the presentation scope. Destruction destroys any current landing runner, disposes both scopes, and emits no normal finish. Both scopes dispose in reverse acquisition order and best-effort, so partial activation is transactional and one failed restoration cannot suppress later restorations.

Old asynchronous work therefore becomes inert without controller-global generation numbers. `LandingRunner` has its own animation lifetime: aborting interaction work does not abort the ordinary landing required to finish cleanup.

The feature FSM is the source of every authoritative semantic fact: phase, pointer history, admitted and activated identity, current logical geometry or insertion, proposal, consumer-resolution stage, transaction result, settlement, and landing status. Live platform resources and reconstructible caches remain outside it. An effect entity may retain an immutable input captured when that effect started, but it must not become a second mutable authority for the corresponding state slice.

## Dependency direction

```text
public facade
  -> feature gesture composer
    -> feature entities
      -> shared lifecycle / platform / presentation entities
        -> immutable value types and pure calculations
```

Dependencies must remain acyclic:

- kernel modules do not import entry points or complete option objects;
- press resolvers receive only the handle resolver they need;
- placeholder creation receives only its factory and owning document;
- feature resolution effects receive only their required callback, immutable proposal, dedicated resolution context, and currency;
- presentation entities do not know about free-drop or reorder semantics;
- sortable collection entities do not know about pointer or animation state.

## Shared entities

### Lifecycle protocol

#### `KernelPhaseProtocol`

**Responsibility:** decide one common lifecycle phase from a kernel projection and classified lifecycle event.

This is the reusable pure part of today's `kernel/fsm.ts`. Its phase graph is:

```text
idle -> pending -> activating -> dragging -> awaiting-result -> settling -> idle
          |            |
          +--> idle    +--> idle
```

`pending -> idle` disarms an unactivated operation. A pointer crossing its threshold, or an admitted `keyboard-command` immediately, enters `activating(acquiring)`. Acquisition effects dispatch `activation-ready(candidate)`, committing all semantic activation data while remaining in `activating`. Only then does `onStart` run; `start-succeeded` promotes the candidate and enters `dragging`. For keyboard input, that transition schedules a distinct internal `keyboard-propose` event carrying the destination gap; the admission event never causes two non-adjacent transitions. Activation failure or pre-success cancellation returns to idle and abandons partial acquisition without cancellation/finish semantics. Synchronous destruction is not a phase edge: it closes the session and tears resources down out-of-band. `awaiting-result` is intentionally common: draggable refines it with free-drop resolution state, while sortable refines it with proposal resolution and consumer-resolution state.

The helper receives only a kernel projection of the previous feature state and a lifecycle event already classified by that feature. It returns a phase decision, never a complete state, so it cannot erase or construct feature fields. It owns no current state and performs no DOM work.

Feature classification happens before phase reduction. For example, the sortable root classifies removal in `pending`/`activating` as abandonment, removal in `dragging` as cancellation, and removal during an open transaction as terminal transaction cancellation. The phase and every feature projection then process that same original event and classification atomically; no follow-up cancellation dispatch is required to correct an intermediate state.

Native `PointerEvent` objects remain synchronous inputs alongside small internal lifecycle signals. Event discrimination is structural or based on known internal signal names, never `instanceof PointerEvent`, so events from another DOM realm remain valid. Pointer event-name constants live with the protocol or in a neutral value module so protocol and platform input modules do not depend on each other.

#### Feature root reducers

**Responsibility:** construct one complete next feature state atomically.

`transitionDraggable` and `transitionSortable` are the only authoritative reducers. Each first classifies the original event and obtains a phase decision. It then computes semantic slices through parallel pure projections:

```ts
function transitionSortable(
  from: SortableState,
  event: SortableEvent,
): SortableState {
  const lifecycleEvent = classifySortableLifecycle(from, event);
  const phase = transitionKernelPhase(projectKernel(from), lifecycleEvent);
  const pointer = reducePointer(from, event, lifecycleEvent, phase);
  const operation = reduceSortableOperation(from, event, lifecycleEvent, phase);
  const insertion = reduceSortableInsertion(from, event, lifecycleEvent, phase);
  const transaction = reduceSortableTransaction(
    from,
    event,
    lifecycleEvent,
    phase,
  );
  const settlement = reduceSortableSettlement(
    from,
    event,
    lifecycleEvent,
    phase,
  );

  if (
    phase === from.phase &&
    pointer === from.pointer &&
    operation === from.operation &&
    insertion === from.insertion &&
    transaction === from.transaction &&
    settlement === from.settlement
  ) {
    return from;
  }

  return {
    phase,
    pointer,
    operation,
    insertion,
    transaction,
    settlement,
  };
}
```

Every projection receives the same immutable `from`, original `event`, lifecycle classification, and phase decision. A projection returns only its own slice and never observes a partially constructed next state. When several projections need the same derived fact, such as a terminal transaction result, one pure classifier computes that immutable fact before projection; projections do not reconstruct competing versions. The hot pointer path passes these values positionally and may skip projections that the classified event cannot affect; the parallel-projection rule is an ownership invariant, not a requirement to allocate a context object or execute every projection on every move.

The object construction remains explicit for v1. A generic `combineReducers` is justified only after both feature shapes stabilize and only if it reduces emitted code without obscuring ownership. If every projection and phase are unchanged, the root returns `from`, preserving the session's no-transition/effects guard. There is one complete-state root allocation per meaningful transition; unchanged projections return their previous slice identities, and changed slices allocate only their required immutable values. Pointer-path allocation and emitted size must be benchmarked before locking the physical field layout.

Phase-specific root-state unions or construction assertions encode these cross-slice invariants:

- `idle` has no operation, transaction, or settlement state;
- `pending` has admitted identity and input ownership but no activated operation; `PointerState` is required only for pointer input;
- `activating` has admitted data or a committed candidate with initial motion/insertion, but no successfully activated operation;
- `dragging` has an activation snapshot and active motion/insertion state;
- `awaiting-result` has an immutable release/proposal basis and one explicit consumer-resolution stage;
- `settling` has one settlement projection and no open transaction stage.

Effects never mutate these slices. They dispatch typed, currency-tagged result events; the root reducer accepts or ignores those events from current state.

The two roots share these semantic value contracts, not one shared mutable state object:

```ts
type MaybePromise<T> = T | Promise<T>;

type ResolutionContext = Readonly<{
  signal: AbortSignal;
}>;

type ResolutionCurrency = Readonly<{
  operationId: number;
  resolutionId: number;
}>;

type LandingCurrency = Readonly<{
  operationId: number;
  landingId: number;
}>;

type DragPhase =
  | 'idle'
  | 'pending'
  | 'activating'
  | 'dragging'
  | 'awaiting-result'
  | 'settling';

type PointerState = Readonly<{
  id: number;
  origin: Point;
  latest: Point;
  release: Point | null;
}>;

type LandingPlan = Readonly<{
  from: Point;
  target: Point;
}>;

type LandingState =
  | Readonly<{
      stage: 'preparing';
      currency: LandingCurrency;
      plan: LandingPlan | null;
    }>
  | Readonly<{
      stage: 'running';
      currency: LandingCurrency;
      plan: LandingPlan;
    }>
  | Readonly<{
      stage: 'completing';
      currency: LandingCurrency;
      plan: LandingPlan;
    }>
  | Readonly<{ stage: 'skipped' }>;

type FailureCause = Readonly<{
  stage:
    | 'move'
    | 'controlled-update'
    | 'invalidation'
    | 'scheduled-frame'
    | 'landing-timing'
    | 'animation-create'
    | 'landing-pin'
    | 'landing-interrupted'
    | 'home-target'
    | 'placeholder-target'
    | 'renderer-write'
    | 'presentation-lease'
    | 'drop-resolution'
    | 'reorder-resolution'
    | 'finish-callback'
    | 'cancel-callback';
}>;

type CancellationReason = Readonly<{
  type:
    | 'pointer-canceled'
    | 'escape'
    | 'consumer'
    | 'item-removed'
    | 'collection-invalidated';
  detail?: unknown;
}>;

type SettlementOutcome =
  | Readonly<{ result: 'accepted' }>
  | Readonly<{ result: 'rejected' }>
  | Readonly<{ result: 'no-op' }>
  | Readonly<{ result: 'canceled'; reason: CancellationReason }>
  | Readonly<{ result: 'failed'; failure: FailureCause }>;

type SettlementState<DomainResult> = Readonly<{
  outcome: SettlementOutcome;
  recovery: 'destination' | 'home' | 'immediate';
  domain: DomainResult | null;
  landing: LandingState;
}>;
```

`PointerState` persists from pointer admission until idle so release, consumer resolution, and settlement remain explainable without copied pointer fields in feature entities. `release` is set from the actual pointerup. Accepted sortable settlement uses destination recovery. Free acceptance, and any rejected/canceled recovery without an explicit valid home target, may use immediate authored-presentation restoration without changing the domain outcome. Failed settlement enters home/preparing only when an explicit home target capability is configured; otherwise it enters immediate/skipped directly. `LandingState` means: `preparing`, a currency has been committed and target/runner acquisition is in progress; `running`, a plan is committed and a runner exists; `completing`, tagged animation completion was accepted and pinning is the next committed effect; `skipped`, presentation leases are disposed through ordinary settlement completion without animation. Preparing begins with no plan; `landing-plan-ready` preserves its currency and commits one, after which the runner effect may dispatch `landing-started`. Finished/interrupted events carry the same `LandingCurrency`; they are not durable runner-owned flags. A previously terminal domain result remains in `domain` if later presentation failure changes the common outcome to `failed`.

Feature-specific state unions or root-construction assertions further require:

- accepted/rejected/no-op settlement contains a matching terminal free-drop or reorder result;
- cancellation before a domain resolution has `domain: null`;
- cancellation of an open sortable transaction contains its terminal canceled transaction result;
- failed settlement may have no prior domain result or retain exactly the result that became terminal before presentation failed;
- refining settlement to failed changes only common outcome/recovery/landing and never rewrites the retained domain result.

#### `DragTransition`

**Responsibility:** describe one meaningful protocol edge that has already occurred.

Its logical contract is `(from, to, event)`. It is not a second event hierarchy or state field. A concrete `{ from, to, event }` allocation is not required: the hot path passes the three values as callback arguments, as the current session already does. The name exists to make the effect-routing contract explicit without adding per-move allocation.

#### `DragSession`

**Responsibility:** store and advance one protocol state.

This retains the important behavior of today's `createSession`: call the feature root reducer, assign the complete state before effects, permit re-entrant dispatch, and skip effects for unchanged states. For each meaningful transition it invokes the `DragTransition` callback as three arguments. Its minimal capability is `state()`, `dispatch(event)`, and terminal idempotent `close()`. Recovery uses typed transitions rather than an effect-skipping reset escape hatch.

`close()` marks the session closed and replaces its stored value with the feature's initial idle state without invoking the transition callback. Later dispatches are inert. Controller destruction uses `close()` rather than manufacturing a semantic cancellation or settlement result.

It does not attach listeners, interpret feature data, interpret a drop, or clean DOM. Its only semantic ownership is the current complete immutable feature state.

#### `OperationIdentitySource`

**Responsibility:** issue never-reused identifiers for operation and asynchronous-effect currency.

It is a controller-lifetime monotonic counter or opaque-token factory. Every admitted pointer or keyboard operation receives an `operationId`; each consumer-resolution invocation receives a `resolutionId`; each landing attempt receives a `landingId`. The feature root stores these identifiers in their authoritative state slices. Resolution events echo `{ operationId, resolutionId }`, and landing events echo `{ operationId, landingId }`.

The root compares current phase, current stage, and the complete currency before inspecting an asynchronous payload. A mismatch is a strict no-op: the payload is not validated, state does not change, and neither `onError` nor another callback runs. Proposal collection version remains immutable request-basis data, never completion currency. The source owns no phase or “current operation” truth and is never consulted to decide currency; the reducer compares event tokens with state.

#### Feature effects routers

**Responsibility:** interpret one already-committed feature transition.

`DraggableEffects` and `SortableEffects` receive `(from, to, event)` and launch only the effects implied by that complete transition. Representative edges are:

- pending to idle without activation: disarm;
- pending to activating(acquiring): transactionally acquire activation resources and dispatch `activation-ready`/failure;
- activating admitted to activating candidate: invoke `onStart`, recheck currency, and dispatch `start-succeeded`/failure;
- activating candidate to dragging active: begin active rendering/observation;
- dragging to dragging: render the committed motion/insertion state;
- dragging to awaiting-result: request a free-drop resolution or stabilize a sortable proposal;
- first transition into settling: abort interaction work and prepare recovery/landing;
- settlement plan changing from `null` to `LandingPlan` while preparing: create `LandingRunner`, then dispatch `landing-started`;
- runner-originated interruption: handle the committed failed/skipped transition without invoking `interrupt()` again;
- running to completing: pin only after tagged completion has been accepted, then dispatch `landing-pinned` or presentation failure;
- completing/skipped to idle: dispose presentation before invoking the applicable public completion callback (`onFinish` or `onCancel`). Failed settlement invokes neither.

`disarm` aborts and disposes interaction resources, including document listeners, even though no visual resources were acquired. Activation failure paths dispose partial acquisitions explicitly. Release coordinates are reduced from the original `pointerup`, so they override the last move even when the browser delivered no final `pointermove`.

The effects routers do not recompute ownership, thresholds, collection policy, transaction stage, or settlement semantics. Those decisions belong to the root reducer. Asynchronous ingress still performs the mandated currency gate before touching consumer-controlled results, and the root repeats the authoritative phase/stage/currency match when the tagged event is dispatched. This protective check retains no semantic copy. Routers may own effect handles and resource references, but no copies of semantic slice values.

#### `ResourceScope`

**Responsibility:** dispose acquired resources in reverse order.

It owns a LIFO list of idempotent disposers. `use(disposer)` registers one successful acquisition; `dispose()` runs every registered disposer once, in reverse acquisition order, and reports failures without preventing later disposal. Destroy-time failures are reported only after operation currency has been revoked; a failing error callback falls through to platform `reportError`, and teardown continues. The scope owns no abort signal, phase, or feature policy.

#### `GestureScope`

**Responsibility:** own cancellation and disposal for one admitted operation.

One scope is created only after pointer or keyboard operation admission. It composes a general operation `AbortController`, one interaction `ResourceScope`, and one presentation `ResourceScope`. Non-resolution async work tests its signal instead of a free-floating `generation`/`destroyed` pair. Consumer resolvers never receive this signal; they receive the dedicated signal owned by their resolution effect.

- `disarm()` aborts and disposes interaction resources for a gesture that never activated;
- `settle()` aborts and disposes interaction resources while retaining presentation;
- `finish()` disposes presentation after landing;

There is deliberately no aggregate `GestureScope.destroy()`. The scope does not own `LandingRunner`, so only the feature effects interpreter can preserve the required interaction-dispose -> runner-destroy -> presentation-dispose order. The controller still has a terminal flag because `destroy()` prevents future operations. Operation currency is authoritative FSM state; abort signals terminate effect mechanics but do not duplicate phase or currency truth.

Terminal controller destruction is synchronous and ordered:

```text
controller.destroy()
  1. return if already terminal
  2. mark the controller terminal
  3. snapshot and clear the current operation, revoking operation currency
  4. DragSession.close() without routing effects
  5. abort the general operation signal
  6. dispose the interaction ResourceScope, aborting any unresolved consumer resolution exactly once
  7. LandingRunner.destroy(), if one exists
  8. dispose the presentation ResourceScope
  9. dispose controller-lifetime resources
```

`LandingRunner.destroy()` marks itself destroyed before canceling its animation. Destruction never pins a target, dispatches completion, creates a settlement result, or invokes `onCancel`/`onFinish`.

#### Effect failure policies

**Responsibility:** make recovery and callback ordering explicit at every effect boundary.

There is no universal `SafeEffectBoundary` entity. Different failures have different policies:

| Boundary | Required policy |
| --- | --- |
| Press resolver / handle resolver | Report; do not arm a gesture; leave the controller reusable. |
| Activation resolver, coordinate capture, lift acquisition, placeholder factory, `onStart` | While `activating`, dispatch typed activation failure, report, stop acquisition, dispose transactionally, and return to idle unless destroyed. No finish outcome exists. |
| Active `onMove`, controlled update, invalidation, scheduled frame work | Dispatch a typed failed event carrying the raw error and chosen `home`/`immediate` recovery; commit state; report; recheck currency; recover only if current. |
| `landingTiming` or animation creation | The factory cancels any partially created `Animation` before returning failure; dispatch failed/immediate, commit, report, and complete deterministically unless destroyed. No runner is exposed. |
| Drop/reorder resolution callback throw, throwing `then` access, invalid result, or returned-promise rejection | First verify `{ operationId, resolutionId }`. If current, mark the resolution completed, dispatch a typed `drop-resolution`/`reorder-resolution` failure, commit failed semantics, report once, recheck currency, and recover. If stale or aborted, consume it silently without validation or reporting. Explicit consumer rejection remains a normal domain result and never uses this failure path. |
| `onCancel` | Invoke only after rollback/immediate restoration and presentation cleanup. If it throws, report through `onError` with `cancel-callback`; never start another recovery or terminal callback. |
| `onFinish` | Invoke only after accepted/no-op settlement and presentation cleanup. If it throws, report through `onError` with `finish-callback`; never start another recovery or terminal callback. |
| `onError` | Invoke only for real execution failures after failed state commits and before recovery. Forward its own failure to platform `reportError`; never mask the original recovery. |

After every consumer-controlled resolver, getter, factory, or callback, the caller rechecks controller terminality and operation/effect currency before its next effect. User code may synchronously destroy the controller, cancel the operation, replace the collection, or otherwise invalidate the objects captured before the call. Small guarded-callback helpers may remove repetition, but the chosen policy remains visible at each call site.

Failure handling always preserves state-before-effects:

```text
receive callback result, continuation, or error
  -> verify current operation/effect currency before validation
  -> if stale, consume it and stop without reporting
  -> validate the resolution or classify the current error
  -> dispatch typed failure event carrying error
  -> commit failed state with stable stage/cause and recovery
  -> route effects and report through onError exactly once
  -> recheck controller and operation currency
  -> recover only if still current
```

The raw `unknown` error lives on the transition event only. State retains a stable failure stage/cause. A failed home recovery completes through ordinary landing. Failed/immediate reports, rechecks currency, and dispatches `settlement-completed` without disposing presentation first; the committed transition to idle then disposes presentation and clears the operation. Failed settlement invokes neither `onFinish` nor `onCancel`: the failure was already reported through `onError`. Failure in `onFinish` or `onCancel` is reported after cleanup through `onError` with a callback-specific cause and never begins another recovery or terminal callback; failure in `onError` goes to platform `reportError`.

The common settlement transitions are explicit:

```text
dragging | awaiting-result
  + effect-failed(stage, home)
  -> settling(failed, home, preparing)

dragging | awaiting-result
  + effect-failed(stage, immediate)
  -> settling(failed, immediate, skipped)

settling(*, preparing)
  + landing-plan-ready(operationId, landingId, plan)
  -> settling(same result, same recovery, preparing with plan)

settling(*, preparing with plan)
  + landing-started(operationId, landingId)
  -> settling(same result, same recovery, running)

settling(*, preparing | running | completing)
  + settlement-failed(operationId, landingId, stage)
  -> settling(failed, immediate, skipped)

settling(*, running) + landing-finished(operationId, landingId)
  -> settling(same result, same recovery, completing)

settling(*, completing) + landing-pinned(operationId, landingId)
  -> idle

settling(*, skipped) + settlement-completed(operationId)
  -> idle
```

Resolution failure chooses recovery from explicit configuration without probing the DOM: a configured home-target capability enters home/preparing, while absence enters immediate/skipped directly and is not another failure. A configured resolver then either supplies a plan or produces a separate presentation failure that refines to immediate. The transition into failed state precedes error reporting. If `onError` synchronously destroys the controller, the currency recheck suppresses recovery and finish.

#### Public completion callbacks

**Responsibility:** expose normal completion, normal rollback, and execution failure without leaking the internal settlement machine.

Internal `rejected` and `canceled` results remain distinct because they have different resolver-signal and currency semantics. At the public callback boundary they share one normal non-applied completion channel:

```ts
type DragErrorContext<DomainResult> = Readonly<{
  cause: FailureCause;
  domain: DomainResult | null;
}>;
```

Feature options expose:

- `onFinish(result)` for accepted results and sortable engine-owned no-op results;
- `onCancel(result)` for explicit consumer rejection and library/consumer cancellation;
- `onError(error, context)` only for real resolver, renderer, presentation, or callback failures.

`onFinish` and `onCancel` run only after landing or immediate restoration has completed, presentation resources have been disposed, and the visual is again consumer-owned. Explicit rejection therefore rolls back and then invokes `onCancel`; it never invokes `onError`. A pending resolver canceled by Escape, pointer cancellation, item removal, collection invalidation, or `controller.cancel()` is aborted first and invokes `onCancel` only after rollback cleanup. Engine no-op invokes `onFinish` after ordinary cleanup because it completed normally without rollback or mutation.

`onError` runs after failed state commits and before recovery, with the stable `FailureCause` and any domain result that became terminal before the later failure. Thus an accepted proposal followed by landing failure is reported as an error whose context retains the accepted domain result; it does not invoke `onFinish`. Failed settlement invokes no later normal completion callback. Activation failure reports `onError` but has no `onFinish`/`onCancel`, because activation never succeeded. `destroy()` remains silent.

A failure thrown by `onFinish` or `onCancel` occurs after cleanup and is forwarded once to `onError` with `finish-callback` or `cancel-callback`; it never changes the completed domain result or starts another recovery. A failure thrown by `onError` falls through to the platform `reportError`.

### Platform resources

#### `DOMRealm`

**Responsibility:** expose one controller's owning DOM environment.

It is derived through `ownerDocument` and `ownerDocument.defaultView`. Construction fails explicitly when `defaultView` is `null`; falling back to ambient `window` would mix realms. Document listeners, scroll offsets, animation frames, media queries, DOM constructors, element creation, and realm-sensitive type checks use this value rather than ambient globals. It is an immutable platform capability, not a broad mutable drag context, and lives in `kernel/realm.ts`.

#### `PointerSource`

**Responsibility:** forward browser input for the appropriate lifetime.

It owns the controller-lifetime `pointerdown` listener and creates an armed-gesture document listener lease for move/up/cancel and Escape. It only emits events. Primary-button policy, handle policy, and FSM phase checks remain in feature admission.

#### `PointerCaptureLease`

**Responsibility:** pair best-effort pointer capture with safe release.

It is acquired at activation from an element and pointer id. Failure to capture is non-fatal. Disposing it releases capture only when still held. This removes capture bookkeeping from feature cleanup.

#### Touch-action contract

**Responsibility:** require the consumer to establish touch gesture policy before pointer admission.

The package does not write, lease, or restore `touch-action`. The browser chooses touch behavior at pointerdown, while a dynamic handle may be resolved only for that press; inferring and mutating a target would therefore be unreliable and overly broad. Consumers must apply appropriate CSS, normally `touch-action: none`, to every element that may act as a drag handle before interaction begins. If they do not, native scrolling or a browser-generated `pointercancel` is valid behavior. Dynamic handle resolution remains independent from this consumer-owned CSS contract.

#### `InvalidationSource`

**Responsibility:** emit active-layout invalidations.

It owns active-gesture scroll and resize listeners and disposes them with the gesture signal. It does not know whether invalidation means re-clamping a free drag or remeasuring sortable items.

Future `ResizeObserver` or disconnect support belongs here only if it produces the same “layout may be stale” signal; the feature decides the response.

#### `FrameTask`

**Responsibility:** own one coalesced animation-frame task.

Its contract is `schedule(value)`, `flush()`, and `cancel()`. It is useful for sortable preview placement and keeps rAF ids, exception forwarding, and release flushing outside spatial algorithms.

### Coordinates and presentation

#### `CoordinateSpace`

**Responsibility:** convert points and deltas between local and viewport space.

This is the conceptual entity already represented by `CoordinateMapper`, `viewportMatrix`, and `createMapper`. DOM traversal captures a mapper at the required discrete moment; mapping calls are pure and reused in the pointer hot path. Matrix capture must happen before a top-layer lift severs layout context. A mapper is an immutable semantic value: a consumer that changes coordinate behavior supplies a replacement mapper through a typed update rather than mutating a captured mapper's meaning. `FreeDropProposal` can therefore retain the exact mapper reference that defined its request values while resolution is pending.

#### `InlineStyleLease`

**Responsibility:** restore every inline property presentation code overwrites.

It captures values and priorities before the first write and restores exactly once. The set of owned properties is part of the presentation strategy, rather than an implicit global cleanup assumption.

#### `TopLayerLease`

**Responsibility:** enter and restore top-layer/popover state.

It remembers the prior `popover` attribute and open state. Only faithful and flat top-layer strategies acquire it; an in-place drag never calls its release path. This makes partial activation and mode-specific cleanup transactional.

#### `VisualLiftSession`

**Responsibility:** establish and release one visual's active presentation mode.

The three strategies are explicit:

- faithful top layer: neutralize browser zoom/UA popover styling and reproduce the captured local-to-viewport matrix;
- flat top layer: render the natural border box upright at the current center;
- in place: suppress transitions while leaving the visual in its layout tree.

The acquired session composes `InlineStyleLease` and, where applicable, `TopLayerLease`. It exposes only the render parameters needed downstream: visual, base transform, and viewport-delta projection. It does not update drag geometry, write movement transforms, animate, or invoke consumer callbacks.

#### `DragRenderer`

**Responsibility:** write the engine-owned transform for one active visual.

It combines a projected translation with the lift session's base transform. During active movement it is the sole transform owner, ensuring pointer movement, invalidation, and controlled retargeting use identical composition rules. Entering settlement explicitly transfers transform ownership to `LandingRunner`; the renderer performs no later writes.

#### `LandingRunner`

**Responsibility:** own one landing animation's mechanics.

It owns the settlement transform from the renderer handoff until presentation disposal. It receives the committed `LandingCurrency`, creates the realm-local `Animation`, applies reduced-motion timing, and exposes distinct mechanics:

- `pin(): void` — idempotently commit the completed target only from an accepted `completing` transition;
- `destroy(): void` — silent terminal controller teardown; mark destroyed before `Animation.cancel()`, never pin, and dispatch nothing;
- `interrupt(error): void` — unexpected presentation failure; cancel without pinning and dispatch the currency-tagged failure event that refines settlement to failed/immediate.

Ordinary animation completion first checks the runner's private terminal bit and dispatches `landing-finished` tagged with `{ operationId, landingId }` without pinning. Unexpected interruption dispatches an equivalently tagged error. The root accepts either only while `running` and only when both identifiers match; a stale event is inert and cannot write presentation or invoke `onError`. Accepted completion enters `completing`; that committed transition calls the runner's idempotent `pin()`, then dispatches tagged `landing-pinned` or a concrete presentation failure. Only `landing-pinned` enters idle, after which presentation disposal restores authored transform state. `interrupt()` is the origin of `settlement-failed`; handling that committed transition must not call `interrupt()` again. The FSM, not the runner, owns whether landing is preparing/running/completing and whether settlement is accepted, rejected, canceled, or failed. The runner's private running/destroyed/pinned bits exist only for idempotency and browser callback races. It never selects a target, invokes feature callbacks, or independently changes semantic state.

`presentation-invalid` is a settlement-time typed ingress event family, not a generic retained failure cause or inferred platform state. The committed `FailureCause` records the concrete stage. During activation, lift/lease acquisition failures remain activation failures; during dragging, renderer/placeholder writes use ordinary active `effect-failed`; only settlement target/plan/write/animation/interruption failures may refine settlement. A restoration failure after the transition to idle is reported during best-effort cleanup and never restarts settlement. Collection membership, DOM order or neighbor inspection, `isConnected`, elapsed time, collection publication, and inferred renderer commitment never dispatch `presentation-invalid`. A future consumer invalidation API would have to be an explicit new signal.

## Draggable entities

### Draggable semantic state

The final draggable slices are:

```ts
type FreeOperation =
  | Readonly<{
      type: 'admitted';
      operationId: number;
      item: HTMLElement;
    }>
  | Readonly<{
      type: 'candidate' | 'active';
      operationId: number;
      item: HTMLElement;
      visual: HTMLElement;
      lift: 'faithful' | 'flat' | 'in-place';
      originRect: DOMRectReadOnly;
      coordinateSpace: CoordinateMapper;
    }>;

type FreePolicy = Readonly<{
  axis: DragAxis;
  coordinateOverride: CoordinateMapper | null;
}>;

type FreeMotion = Readonly<{
  viewportDelta: Point;
}>;

type FreeDropResolution =
  | Readonly<{ type: 'accepted' }>
  | Readonly<{ type: 'rejected'; reason?: unknown }>;

type FreeDropProposal = Readonly<{
  request: FreeDropRequest;
  coordinateSpace: CoordinateMapper;
}>;

type FreeDropResult =
  | Readonly<{
      type: 'accepted';
      proposal: FreeDropProposal;
    }>
  | Readonly<{
      type: 'rejected';
      proposal: FreeDropProposal;
      reason?: unknown;
    }>;

type FreeDragFinishResult = Extract<FreeDropResult, { type: 'accepted' }>;

type FreeDragCancelResult =
  | Extract<FreeDropResult, { type: 'rejected' }>
  | Readonly<{
      type: 'canceled';
      reason: CancellationReason;
      proposal: FreeDropProposal | null;
    }>;

type FreeDragCallbacks = Readonly<{
  onFinish?(result: FreeDragFinishResult): void;
  onCancel?(result: FreeDragCancelResult): void;
  onError?(error: unknown, context: DragErrorContext<FreeDropResult>): void;
}>;

type FreeDropState =
  | Readonly<{ stage: 'none' }>
  | Readonly<{
      stage: 'proposal-ready';
      proposal: FreeDropProposal;
    }>
  | Readonly<{
      stage: 'awaiting-consumer';
      proposal: FreeDropProposal;
      resolutionId: number;
    }>;

type DraggableState = Readonly<{
  phase: DragPhase;
  pointer: PointerState | null;
  policy: FreePolicy;
  operation: FreeOperation | null;
  motion: FreeMotion | null;
  drop: FreeDropState;
  settlement: SettlementState<FreeDropResult> | null;
}>;
```

`policy` contains retained controller choices that pure motion reduction must read: axis and an optional consumer coordinate override. A mapper derived from current layout belongs to the candidate/active operation and is cleared with that gesture; it never leaks into idle policy. Typed configuration events update policy atomically and may explicitly replace an active operation's effective coordinate space. Effectful bounds sources are resolved before dispatch into immutable motion-event input; after each getter/DOM read the ingress rechecks currency before dispatching. Reducers therefore never read mutable options or the DOM. Callbacks and landing timing remain effect configuration because they do not choose semantic transitions.

`pending` retains admitted identity. `activating(acquiring)` still has the admitted variant; `activation-ready` commits the candidate plus initial zero `FreeMotion`, then `onStart` derives its callback geometry from committed slices. Only `start-succeeded` changes candidate to active and enters `dragging`. Failure or cancellation before success abandons without `onCancel`/`onFinish`; synchronous destroy closes out-of-band. `dragging` owns current motion. Release first commits one immutable `proposal-ready` value. The effects layer then acquires the dedicated controller/id and dispatches `resolution-started`, which atomically commits `awaiting-consumer` before `onDrop` is invoked. The terminal result is created exactly once on the transition to `settling`, where it moves into `settlement.domain`; `drop` returns to `none`. Preparing/running/completing settlement owns landing currency and any plan; skipped settlement has no landing attempt or `landingId`. Returning to idle clears operation slices atomically while retaining controller policy.

The pointer slice is the sole owner of pointer id/origin/latest/release, and `FreeMotion.viewportDelta` is the sole canonical motion value. Local delta and current rect are pure derivatives of it, the active coordinate space, and activation origin rect; callback/render effects derive them without making them reducer inputs. Any memoization is a mechanical cache keyed by committed state identity. `FreeDropProposal` captures the coordinate-space snapshot that gave `request.localPosition` its meaning, so an asynchronous consumer never observes request values whose coordinate model changed while it was pending.

### `DraggableConfig`

**Responsibility:** expose options according to when they may change.

The current mutable `opts` object hides several time domains. The target makes them explicit:

- controller-captured: resolver functions, threshold, and other construction policy;
- press-captured: the currently resolved handle and admitted item;
- activation-captured: the currently resolved visual, lift mode, derived mapper, origin geometry, and authored transform;
- live semantic inputs: axis, coordinate-space changes, and controlled position updates, all dispatched into state;
- live effect inputs: bounds source, landing timing, required `onDrop`, optional home-target resolver, and other callbacks.

Resolver functions may be stable while the DOM elements they return change across renders, so elements are resolved at the relevant boundary rather than cached accidentally. Touch gesture policy is consumer-owned CSS and is not part of `DraggableConfig`; every possible dynamic handle must already have an appropriate `touch-action` before pointerdown. The home-target resolver is read only from a committed home/preparing settlement and receives its `LandingCurrency`; its output/error is gated again before inspection. `update()` patches only options intentionally defined as live. Values that affect semantic motion are carried through typed update events and committed by the root reducer; reducers never read a mutable options object. Operation snapshots are created by the root reducer rather than written back into configuration. The target option type requires `onDrop`; a missing runtime value throws synchronously during `draggable()` construction.

### `resolveDraggablePress`

**Responsibility:** decide whether one press may arm free dragging.

It receives the event, session-idle state, primary-press predicate, and resolved handle. It returns accepted arm data or `null`. It attaches no listeners and does not mutate gesture state.

### `FreeMotionProjection`

**Responsibility:** derive the next immutable free-motion slice.

It is a pure projection over the previous draggable state, pointer/configuration event, committed policy, and immutable resolved bounds input. Pointer-derived movement and its invalidation path apply the configured axis and bounds. An explicit consumer-controlled position is authoritative: after validation and conversion into the canonical motion representation, it bypasses axis and bounds rather than being silently clamped. Both paths still commit `FreeMotion` and share the same renderer; sharing the render path does not merge their authority policies. The projection owns no mutable geometry, reads no callbacks/DOM, and writes no styles.

### `FreeDropRequestFactory`

**Responsibility:** construct the public release snapshot.

It combines item and visual identity, final pointer/motion state, mapper output, and the visual's release rect into `FreeDropRequest`. It also captures the immutable coordinate-space snapshot that defines the request's local values, producing one `FreeDropProposal`. It is stateless and is called only after the release point has been flushed.

### `FreeDropResolutionEffect`

**Responsibility:** request one explicit consumer drop resolution and emit its normalized event.

The required consumer contract is:

```ts
type OnDrop = (
  request: FreeDropRequest,
  context: ResolutionContext,
) => MaybePromise<FreeDropResolution>;
```

Resolving `accepted` means the consumer accepts the immutable proposal and guarantees that its persistent authored presentation already contains the final position in the same authored coordinate model and is ready for the library to restore visual ownership. Persistence unrelated to presentation, such as remote storage, may continue. The library trusts this guarantee and does not inspect the DOM to verify it. Explicit `rejected` is a normal domain result and never invokes `onError`; there is no absent-handler or `undefined` acceptance path.

From committed `proposal-ready`, the effect allocates `resolutionId` and a dedicated `AbortController`, registers its unresolved-only disposer, and dispatches `resolution-started({ operationId, resolutionId })`. Only the resulting committed `awaiting-consumer` transition invokes `onDrop(request, { signal })`; effects never commit state directly. Before assimilating a returned value and again in every continuation, it gates on phase, stage, `{ operationId, resolutionId }`, and signal currency. It dispatches the current raw value/error with that currency; the root repeats the match before validation. A valid resolution is a non-null object with a recognized `type`; `undefined`, `null`, primitives, unknown tags, malformed objects, callback throws, throwing `then` access, and rejected promises are resolution failures. Failure state commits before `onError`.

The effect marks itself completed before dispatching any current raw completion/error event; the root then classifies it as accepted, rejected, or failed. For free drag, `cancel-requested`, terminal controller destroy, or a typed `resolution-superseded` event aborts an unresolved controller exactly once. No ordinary v1 input emits `resolution-superseded`; it names the only allowed future/restart path and prevents “supersession” from becoming implicit. Normal completion never aborts afterward. Every later fulfillment, rejection, malformed value, or callback continuation is consumed silently; this includes an abort-caused rejection and any stale error after synchronous re-entrancy. The effect owns only this controller/continuation and its captured immutable proposal/currency. Semantic resolution state belongs only to `DraggableState`.

### `FreeHomeTargetEffect`

**Responsibility:** request and validate one explicitly configured live rollback target.

A lifted visual cannot generally reveal the live layout slot it left. The library therefore never reconstructs a slot from parent, neighbors, collection or DOM order, copied footprint, elapsed layout, or activation geometry.

The public target is one finite viewport-space point naming the target border-box origin:

```ts
type FreeHomeTarget = Readonly<{
  position: Point;
  space: 'viewport';
}>;

type ResolveFreeHomeTarget = (request: FreeHomeRequest) => FreeHomeTarget;
```

The resolver is synchronous. With no configured resolver, the root enters immediate/skipped recovery directly and this entity is not created. Otherwise, a committed home/preparing settlement supplies `LandingCurrency` to the effect before it invokes the consumer resolver. After the call—and before inspecting either its output or a caught error—the effect rechecks settlement stage plus `{ operationId, landingId }`. Stale output and errors are inert without `onError`. A current target with `space === 'viewport'` and finite `x`/`y` becomes a home `LandingPlan`. A current throw, `null`, malformed object, unknown space, or non-finite point dispatches currency-tagged `presentation-invalid`, commits failed/immediate before reporting, and preserves any existing domain result. The resolver has no `null` fallback contract: absence of the option expresses immediate recovery; an invalid configured result is a presentation failure. The entity never reconstructs a slot from consumer DOM.

### `FreeLandingTarget`

**Responsibility:** select one immutable free-drag `LandingPlan`.

For v1, accepted free drops immediately dispose the temporary presentation leases and reveal the consumer-authored accepted position; they do not infer or animate to a destination target. Rejected/canceled drops animate only when `FreeHomeTargetEffect` supplies an explicit valid target. `FreeLandingTarget` converts that target, current visual position, and acquired lift mode into explicit `from` and `target` deltas before animation creation. A future animated accepted settlement requires a separate explicit target capability.

### `FreeDragGesture`

**Responsibility:** interpret committed draggable transitions and own their effect resources.

It acquires coordinates, lift, capture, and invalidation resources on entry to `activating`, then dispatches `activation-ready` with the immutable candidate. It invokes `onStart` only from that committed candidate and dispatches `start-succeeded` only if callback completion remains current. It renders committed `FreeMotion`, invokes the resolution effect for committed proposals, resolves a home target only when committed settlement requests one, acquires `LandingRunner` for committed landing plans, and performs ordered cleanup/callback effects. After presentation disposal it routes accepted completion to `onFinish` and explicit rejection or cancellation to `onCancel`; failed settlement was already reported through `onError` and invokes neither.

It may retain only mechanical references: `GestureScope`, leases, renderer, current resolution effect, and current `LandingRunner`. It must not retain copies of phase, pointer, active identity, motion, proposal, resolution result, cancellation/failure reason, landing plan, currency, or landing status. Those values are read from `(from, to, event)`.

### `draggable()` facade

The public function owns only controller-lifetime composition:

- create `DraggableConfig`, `DragSession`, and `PointerSource`;
- require and validate `onDrop`, throwing synchronously at construction if it is missing;
- resolve admitted presses and create the current `GestureScope`/ `FreeDragGesture`;
- connect protocol dispatch to the effects router;
- forward `update`, `cancel`, and terminal idempotent `destroy`.

## Sortable entities

### Sortable semantic state

The final sortable slices are:

```ts
type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

type SortableOperation =
  | Readonly<{
      type: 'admitted';
      operationId: number;
      input: 'pointer' | 'keyboard';
      item: HTMLElement;
      operationCollection: CollectionSnapshot;
    }>
  | Readonly<{
      type: 'candidate' | 'active';
      operationId: number;
      input: 'pointer' | 'keyboard';
      item: HTMLElement;
      visual: HTMLElement;
      activationVersion: number;
      activationIndex: number;
      operationCollection: CollectionSnapshot | null;
    }>;

type InsertionState =
  | Readonly<{ type: 'none' }>
  | Readonly<{ type: 'ready'; value: Insertion }>
  | Readonly<{
      type: 'resolving';
      spatialId: number;
      cause: 'pointer-move' | 'invalidation';
      incumbent: Insertion | null;
    }>;

type ProposalBasis = Readonly<{
  snapshot: CollectionSnapshot;
  spatialId: number;
  incumbent: Insertion | null;
}>;

type ReorderProposal = Readonly<{
  snapshot: CollectionSnapshot;
  request: ReorderRequest;
}>;

type ReorderResolution =
  | Readonly<{ type: 'accepted' }>
  | Readonly<{ type: 'rejected'; reason?: unknown }>;

type ReorderTransactionResult =
  | Readonly<{
      type: 'accepted';
      proposal: ReorderProposal;
    }>
  | Readonly<{
      type: 'rejected';
      reason: 'consumer';
      detail?: unknown;
      proposal: ReorderProposal;
    }>
  | Readonly<{
      type: 'no-op';
      proposal: ReorderProposal;
    }>
  | Readonly<{
      type: 'canceled';
      reason: CancellationReason;
      at: 'proposal' | 'consumer';
      proposal: ReorderProposal | null;
    }>;

type SortableFinishResult = Extract<
  ReorderTransactionResult,
  { type: 'accepted' | 'no-op' }
>;

type SortableCancelResult = Extract<
  ReorderTransactionResult,
  { type: 'rejected' | 'canceled' }
>;

type SortableCallbacks = Readonly<{
  onFinish?(result: SortableFinishResult): void;
  onCancel?(result: SortableCancelResult): void;
  onError?(
    error: unknown,
    context: DragErrorContext<ReorderTransactionResult>,
  ): void;
}>;

type SortableTransaction =
  | Readonly<{ stage: 'none' }>
  | Readonly<{ stage: 'resolving-proposal'; basis: ProposalBasis }>
  | Readonly<{
      stage: 'proposal-ready';
      proposal: ReorderProposal;
    }>
  | Readonly<{
      stage: 'awaiting-consumer';
      proposal: ReorderProposal;
      operationId: number;
      resolutionId: number;
    }>;

type SortableState = Readonly<{
  phase: DragPhase;
  pointer: PointerState | null;
  operation: SortableOperation | null;
  insertion: InsertionState;
  transaction: SortableTransaction;
  settlement: SettlementState<ReorderTransactionResult> | null;
}>;
```

`SortableCollection` remains the controller-lifetime owner of the latest global snapshot. The FSM's `operationCollection` is the immutable snapshot most recently accepted by this operation; it is deliberately named rather than masquerading as the global current value. `activationVersion`/`activationIndex` are history only. On release or `keyboard-propose`, ownership of the relevant snapshot transfers into `ProposalBasis` and `operation.operationCollection` becomes `null`; a completed proposal then owns that same basis as its immutable proposal snapshot. These non-overlapping lifetimes prevent competing collection authorities.

As with draggable, `activation-ready` commits the sortable candidate—including visual, activation history, and initial ready insertion—before `onStart` observes it. `start-succeeded` changes only candidate to active and enters `dragging`; failure/cancellation beforehand abandons it without a transaction or finish result.

`Insertion` has strict invariants against one snapshot `S`: remove the dragged item from `S.items`; `before` and `after` are the adjacent predecessor/successor around one gap in that destination view; `index` is that gap's index; and `insertion.version === S.version`. A resolving active insertion is not request-eligible. Pointer insertion reads the collection from `operation.operationCollection` and pointer from `PointerState.latest`; the slice stores only its unique spatial id and incumbent semantic hysteresis/rebase input, never duplicate inputs or hidden tracker state.

Pointer release enters `resolving-proposal`, transfers the last ready gap into `ProposalBasis.incumbent`, and clears the active insertion slice. After keyboard activation succeeds, the separate `keyboard-propose` event enters the same stage with the command's destination gap. The incumbent must already match `basis.snapshot.version` or be `null`; a collection-policy action rebases or clears it before basis creation. The final release point remains solely in `PointerState.release`; the pointer proposal effect reads it from committed state. Proposal-stabilization results carry operation id, collection version, and spatial id. The root accepts them only if all tokens still match and the returned insertion has the basis version. A pre-proposal collection replacement supersedes the basis, invalidates any pending stabilization result, and either synchronously rebases the exact identity gap into the replacement snapshot or cancels; stale results are inert. Only a stabilized result lets the pure request factory create a proposal. The proposal retains its snapshot and normalized request; it does not retain a second insertion record containing the same gap. Once created, that proposal is immutable and never rebased. Its version is request-basis data, not consumer-resolution currency.

`awaiting-consumer` means one immutable proposal has been sent through the required `onReorder` contract and its resolution is still open. Resolving `accepted` means the consumer accepts that proposal and guarantees that its persistent authored presentation is ready for the library to begin settlement and eventually restore the visual to consumer ownership. Persistence unrelated to presentation, such as remote storage, need not finish. The library trusts this guarantee and never inspects collection snapshots, DOM order, or elapsed time to verify it. Explicit rejection creates a rejected transaction result; a current callback/runtime failure creates failed settlement instead.

The current sortable contract is intra-collection reordering, so the dragged identity must remain in the collection through consumer resolution. Its removal is a separately defined operation invalidation, not an inferred consumer answer: it atomically creates canceled settlement and aborts the unresolved resolver exactly once. Re-entrant removal wins. If `onReorder` synchronously removes the item and then returns or resolves `accepted`, that completion is stale. Every other collection change leaves the resolution open. Once accepted, rejected, canceled, or failed is terminal, later collection changes—including removal—are inert for both transaction and settlement. A concrete presentation effect may still fail independently under the narrow `presentation-invalid` ingress.

### `SortableCollection`

**Responsibility:** publish the latest ordered item snapshot and version.

It exposes a read-only `{ items, version }` snapshot. `replace(items)` increments the version and notifies subscribers. Admission, spatial measurement, request construction, and pre-proposal collection policy consume explicit snapshots rather than a mutable array captured from different times. After a proposal exists, the only collection-shape transaction invalidation is removal of the dragged identity while consumer resolution remains open. Other replacements are application inputs but never consumer answers; after terminality, all replacements are inert for that transaction and its settlement.

`replace` first shallow-copies the caller's array, so published snapshot order cannot mutate without a version change. The root reducer receives each published snapshot as a typed event and records it under the appropriate gesture lifetime.

It does not invalidate geometry, rebase insertion, derive indices, or cancel gestures.

### `CollectionChangePolicy`

**Responsibility:** choose how one active sortable gesture responds to a new collection snapshot.

This is a pure policy over the prior snapshot, replacement snapshot, dragged item, and neighbor-based insertion. Collection replacement never silently recomputes consumer intent from the latest pointer. It returns exactly one action:

- rebase to the same identity gap in the replacement snapshot;
- cancel with `collection-invalidated`.

An internal gap survives only when both `before` and `after` remain present and adjacent after removing the dragged item. A start gap survives only when `after` remains the first destination item; an end gap survives only when `before` remains the last destination item. The rebased insertion receives the replacement version and the corresponding gap index, and the placeholder moves synchronously as the committed insertion effect. If the exact gap does not survive, the operation cancels; one surviving interior neighbor is not enough, and no pointer-based recomputation is inferred. Release therefore never waits for collection-change recomputation: it observes either a ready, version-matching rebased insertion or a canceled operation. This policy applies only before proposal creation; an immutable proposal is never rebased.

The policy never mutates the collection, placeholder, cache, or FSM. The sortable root consumes its rebase/cancel action while projecting `operation` and `insertion`.

### `resolveSortablePress`

**Responsibility:** resolve one admitted item from a pointer path.

This narrows today's `resolveItem` to `(event, items, getHandle)`. It validates tracked item identity and handle membership, including the item itself as its handle. It receives no complete `SortableOptions` object.

### `AnchorFactory`

**Responsibility:** create and configure one placeholder element.

It receives the optional factory, item, visual, rect, and owning document. It sets internal identification/ARIA, local border-box dimensions, and slot. It does not insert, move, measure, or remove the element.

### `PlaceholderLease`

**Responsibility:** own the placeholder's DOM presence.

It inserts the anchor at the original slot, exposes narrow placement operations and its current rect, can return it home, and removes it on disposal. This keeps DOM acquisition/restoration separate from insertion calculation.

### `RectIndex`

**Responsibility:** cache current visual rectangles for sortable candidates.

It measures through the collection and `getVisual`, excludes the dragged item, marks itself dirty on invalidation/collection replacement, and refreshes on demand. When `getVisual(item)` returns a descendant rather than the item itself, the consumer owns the remaining source-host layout and must ensure that lifting the inner visual does not leave an additional occupied slot alongside the placeholder. The library does not collapse, resize, reposition, or otherwise mutate the outer item automatically. `RectIndex` performs no hit testing and moves no DOM.

### `InsertionResolver`

**Responsibility:** choose a logical insertion from spatial inputs.

Given the pointer, incumbent placeholder rect, candidate rects, and ordered items, it applies nearest-center hysteresis and returns an immutable `Insertion` or the unchanged incumbent. DOM order primitives for index and neighbor identity remain pure helpers behind this contract.

### `SpatialInsertionEffect`

**Responsibility:** resolve and present spatial insertion effects requested by state transitions.

It composes `RectIndex`, `InsertionResolver`, `PlaceholderLease`, and `FrameTask`. It may cache rectangles, dirty epochs, the latest scheduled work item, and placeholder DOM operations. Given an explicit incumbent, pointer, collection snapshot, version, and spatial id, it dispatches a tagged active-`insertion-resolved`, `proposal-resolved`, or failure event according to the committed requesting slice. Placeholder movement is an effect of a committed ready insertion.

It does not own the current logical insertion, pending semantic pointer, collection version, or rebase policy. It never supplies request or consumer-resolution truth by reading placeholder DOM order. On release it flushes the true release point for the committed proposal basis; a stale tagged result cannot construct a request.

### `ReorderRequestFactory`

**Responsibility:** normalize a source plus destination into a reorder proposal.

It receives one stabilized `CollectionSnapshot S`, dragged item, and version-matching insertion. `from` is the item's index in `S.items`. It removes the item, validates that `before`/`after` are adjacent around one gap in the remainder, and sets `to` to that gap's index. `request.version`, `from`, `to`, `before`, and `after` therefore all describe `S`; mixed-version arithmetic is invalid. It returns a normalized proposal plus an explicit no-op flag, so an engine-owned no-op outcome still has a coherent proposal record and is not misrepresented as a consumer rejection. Foreign or contradictory identities fail construction explicitly. Pointer and internal keyboard paths use the same factory so request semantics cannot diverge accidentally.

### `ReorderResolutionEffect`

**Responsibility:** request one explicit consumer reorder resolution and emit its normalized event.

The required consumer contract is:

```ts
type OnReorder = (
  request: ReorderRequest,
  context: ResolutionContext,
) => MaybePromise<ReorderResolution>;
```

The proposal projection first commits `proposal-ready`. From that committed stage, the effect allocates a `resolutionId` and dedicated `AbortController`, registers its unresolved-only disposer, and dispatches `resolution-started({ operationId, resolutionId })`. Only the resulting committed `awaiting-consumer` transition invokes `onReorder(request, { signal })`; effects never commit state directly. Before Promise assimilation and in every continuation, the effect gates on current phase, stage, `{ operationId, resolutionId }`, and signal. It dispatches the current raw value/error with that currency; the root repeats the match before validation. Stale malformed values, callback errors, rejected promises, and throwing `then` access are therefore consumed without `onError`.

For a current completion, only a non-null object with recognized `accepted` or `rejected` type is valid. Explicit rejection is the only normal negative consumer answer and never invokes `onError`. `undefined`, `null`, primitives, unknown tags, malformed objects, callback throws, throwing `then` access, and rejected promises dispatch `reorder-resolution` failure after state currency is confirmed. The effect marks completion before dispatching the current raw completion/error; the root then classifies it. `cancel-requested`, `dragged-item-removed`, terminal controller destroy, or typed `resolution-superseded` aborts unresolved work exactly once. No ordinary v1 input emits `resolution-superseded`; it is the only allowed future/restart path. Normal accepted/rejected/failure completion never aborts later; all late continuations are inert. It owns the controller/continuation and captured immutable proposal/currency, but no semantic stage/result, animation, or outcome.

### `SortableTransactionProjection`

**Responsibility:** derive the next sortable transaction slice and terminal result.

This pure projection implements `resolving-proposal -> proposal-ready -> awaiting-consumer` and returns `none` when one explicit accepted/rejected/canceled result, or one engine-owned no-op, moves into settlement. It owns no promise, subscription, timer, mutable result, or independent completion method.

### `SortableLandingTarget`

**Responsibility:** select the sortable visual's immutable landing plan.

Accepted transactions use the proposed placeholder slot only after the consumer has supplied the authored-presentation-readiness guarantee. Rejected/canceled transactions first return the placeholder home and then target that explicitly owned live rect. The plan and a new `LandingCurrency` are committed in sortable settlement state before animation creation; `LandingRunner` owns only animation mechanics.

### Keyboard reorder input

**Responsibility:** adapt one keyboard intent into the shared proposal protocol.

Keyboard support is an internal input path, not a public imperative movement API. `keyboard-command` performs admission; after activation, `keyboard-propose` carries its destination gap into proposal stabilization. It produces the same immutable `ReorderProposal`, required consumer resolution, cancellation, settlement, and currency semantics as pointer input. The controller admits inputs only while idle. Pointer presses and keyboard commands received while non-idle are ignored with no state change or callback, and never supersede an open resolution. Proposal entities never depend on pointer-only state.

### `SortableGesture`

**Responsibility:** interpret committed sortable transitions and own their effect resources.

It performs transactional activation acquisition, renders committed pointer/insertion changes, launches tagged spatial and consumer-resolution effects, moves the placeholder only for committed insertion transitions, and acquires the runner for a committed landing plan. It performs interaction/presentation cleanup and callbacks in the order defined by the transition. After presentation disposal it routes accepted and no-op completion to `onFinish`, and explicit rejection or cancellation to `onCancel`; failed settlement invokes neither normal callback.

It may retain only mechanical references: `GestureScope`, placeholder/lift/style/capture leases, `RectIndex`, `FrameTask`, renderer, subscriptions, current resolution effect, and current `LandingRunner`. It must not retain copies of dragged/visual identity, collection/activation snapshot, current insertion, proposal, consumer-resolution stage/result, `from`/`to`, cancel reason, settlement result, landing plan, currency, or landing status.

Removal is phase-sensitive. Before activation it disarms without semantic callbacks. During active dragging, proposal resolution, or open consumer resolution it creates canceled settlement. During consumer resolution this invalidation wins over a synchronously returned result and aborts the dedicated signal. After entry to settlement it never rewrites the transaction or settlement. Post-terminal model removal does not interrupt presentation; only a concrete failed presentation operation may dispatch the currency-tagged failure that refines settlement to failed/immediate.

### `sortable()` facade

The public function owns controller-lifetime composition:

- create the collection, session, and pointer source;
- require and validate `onReorder`, throwing synchronously at construction if it is missing;
- arbitrate pointer and internal keyboard admission and create the current `GestureScope`/`SortableGesture`;
- forward `updateItems` to `SortableCollection`;
- forward `cancel` and terminal idempotent `destroy`.

The target `SortableController` has no public `move()` in v1. The current `SortableController.move`, `MoveResult`, and sortable-entry re-export of `MoveResult` are explicit removals, not deferred compatibility decisions. Keyboard results use the ordinary internal reorder outcome rather than a public imperative-move type.

## Semantic-state ownership audit

The following audit is normative. “Mechanical state” may exist only to execute, cancel, cache, or release an effect. Reducer decisions never query it as semantic truth.

| Entity | Authoritative FSM state it must not retain | Permitted retained state |
| --- | --- | --- |
| Controller facade | phase, pointer, operation, motion policy/outcome | terminal/idempotence flag, current operation capability, operation/effect-id allocator, controller resources |
| `DraggableConfig` | axis/coordinate policy already committed to state, operation snapshots | resolvers, required callbacks, landing timing, bounds source, and construction policy |
| `DragSession` | none elsewhere; it is the sole store | current complete feature state, closed flag |
| `GestureScope` | phase, cancellation, settlement, resolution currency | general operation abort signal and two resource stacks |
| `FreeMotionProjection` | none | none; pure calculation |
| `FreeDropResolutionEffect` | resolution stage/result | dedicated controller, completed bit, one promise continuation, and captured immutable proposal/currency |
| `FreeHomeTargetEffect` | motion, recovery, landing plan | configured resolver reference, captured `LandingCurrency`, and one invocation continuation |
| `DragRenderer` | logical motion, landing status | transform composition parameters and optional scheduled write data |
| `SortableCollection` | gesture/proposal snapshot or transaction status | latest controller-global shallow-copied snapshot and subscriber list |
| `RectIndex` | current insertion | version/epoch-tagged rectangles and dirty cache state |
| `SpatialInsertionEffect` | pointer, insertion, collection version, rebase choice | `RectIndex`, frame handle/latest scheduled work, placeholder effect handle |
| `PlaceholderLease` | insertion or proposal | placeholder DOM node, acquisition/restoration state |
| `ReorderResolutionEffect` | resolution stage/result | dedicated controller, completed bit, promise continuation, and captured immutable proposal/currency |
| `SortableTransactionProjection` | none outside the FSM | none; pure calculation/types |
| `LandingRunner` | settlement result/recovery or landing status | actual `Animation`, captured `LandingCurrency`, and private idempotency/race flags |
| `FreeDragGesture` / `SortableGesture` | any semantic slice | scope, leases, caches, effect continuations, renderer, current runner |

Specific current fields therefore disappear from effect composers: `activated`, `pointerId`, `originPointer`/`start`, `latestPointer`, `delta`, `dragged`, `visual`, `fromIndex`, `toIndex`, `cancelReason`, transaction outcome, and semantic landing booleans. `generation` is replaced by a controller-owned `OperationIdentitySource`, FSM currency for stale-event rejection, the general `GestureScope.signal`, and dedicated resolver signals. Style snapshots, lift parameters, placeholder presence, pointer capture, rAF ids, promise continuations, and animations remain with their narrow resource/cache owners.

Collection snapshots are intentional and named by lifetime: `SortableCollection.snapshot()` is the latest controller-global input; `operation.operationCollection` is the snapshot atomically accepted during the pre-proposal operation; `ProposalBasis.snapshot` and then `proposal.snapshot` own the transaction basis. The root transfers rather than independently updates those operation/transaction references. None may be mutated in place, inferred from another entity's DOM, or silently substituted for another lifetime.

## Composition flows

### Free drag

```text
draggable() facade owns DragSession<DraggableState>
PointerSource
  -> resolveDraggablePress
  -> dispatch -> transitionDraggable (one atomic commit)
       idle -> pending
         -> effect creates current GestureScope + FreeDragGesture
       pending -> activating
         -> effects acquire CoordinateSpace + VisualLiftSession
            + leases -> activation-ready
         -> committed candidate -> onStart -> start-succeeded -> dragging
       dragging -> FreeMotionProjection -> DragRenderer -> onMove
       release -> FreeDropRequestFactory -> proposal-ready
         -> FreeDropResolutionEffect acquires controller/id
         -> resolution-started -> awaiting-consumer(operationId, resolutionId)
         -> committed transition invokes onDrop -> accepted/rejected/failed event
       settling -> abort/dispose interaction scope
         -> accepted: immediate authored restoration reveals consumer state
         -> rejected/canceled with no home resolver: immediate authored restoration
         -> rejected/canceled with explicit valid home target: FreeLandingTarget commits plan
            -> DragRenderer yields transform -> LandingRunner
       landing-finished -> completing -> pin -> landing-pinned -> idle
       settlement-completed for skipped recovery -> idle
         -> dispose presentation -> onFinish(accepted) or onCancel(rejected/canceled)
       destroy -> session.close -> LandingRunner.destroy if present
         -> dispose both scopes; no semantic completion
```

Invalidation and controlled updates are typed events and use the same `FreeMotionProjection -> committed state -> DragRenderer -> onMove` path as pointer movement.

### Sortable

```text
sortable() facade owns DragSession<SortableState> + SortableCollection
PointerSource
  -> resolveSortablePress
  -> dispatch -> transitionSortable (one atomic commit)
       idle -> pending
         -> effect creates current GestureScope + SortableGesture
       pending -> activating
         -> effects acquire PlaceholderLease + VisualLiftSession
            + RectIndex/FrameTask resources -> activation-ready
         -> committed candidate -> onStart -> start-succeeded -> dragging
       dragging -> DragRenderer
         -> insertion resolving state -> SpatialInsertionEffect
         -> tagged result -> ready insertion -> placeholder effect
       pointer release / keyboard-propose -> awaiting-result(resolving-proposal)
         -> flush true release point for captured snapshot/version/id
         -> stable result -> ReorderRequestFactory -> proposal-ready
         -> ReorderResolutionEffect acquires controller/id
         -> resolution-started -> awaiting-consumer(operationId, resolutionId)
         -> committed transition invokes onReorder
            -> accepted/rejected/failed settlement
       settling -> abort/dispose interaction scope
         -> SortableLandingTarget commits plan
         -> DragRenderer yields transform -> LandingRunner
       landing-finished -> completing -> pin -> landing-pinned -> idle
       settlement-completed for skipped recovery -> idle
         -> dispose presentation -> onFinish(accepted/no-op) or onCancel(rejected/canceled)
       destroy -> session.close -> LandingRunner.destroy if present
         -> dispose both scopes; no semantic completion

SortableCollection.replace
  -> typed snapshot event -> transitionSortable
       pending missing item -> disarm
       dragging missing item -> canceled settlement
       pre-proposal -> CollectionChangePolicy -> exact-gap rebase/cancel
       resolving-proposal missing item -> terminal canceled settlement
         -> general operation signal makes proposal work stale
       awaiting-consumer missing item -> terminal canceled settlement
         -> dedicated resolution signal aborts exactly once
       other awaiting-consumer changes -> no resolution transition
       settling changes/removal -> preserve transaction and settlement
```

Internal `keyboard-command` admission schedules `keyboard-propose` only after activation succeeds. That second event enters proposal stabilization, shares `ReorderRequestFactory` and `ReorderResolutionEffect`, and is subject to the same idle-only admission gate. There is no public imperative movement path.

## Current-to-target mapping

| Current area | Target owner |
| --- | --- |
| `kernel/fsm.ts` | `KernelPhaseProtocol` plus feature lifecycle classifiers/root reducers |
| `kernel/session.ts` plus duplicated transition branches | generic `DragSession`, logical `DragTransition`, and feature effects routers |
| implicit pending-to-idle cleanup | explicit `disarm()` effect |
| ambient window/document access | `DOMRealm` |
| `kernel/pointer.ts` | `PointerSource` and `PointerCaptureLease`; inline touch-action mutation is removed in favor of documented consumer CSS |
| generation counters, session/drag abort controllers, scattered cleanup | `OperationIdentitySource`, FSM currencies, general/dedicated abort signals, interaction/presentation `ResourceScope`s, and explicit leases |
| duplicated effect/invalidation/async error guards | explicit effect failure policies and narrow guarded-callback helpers |
| scroll/resize setup in both entries | `InvalidationSource` |
| sortable rAF fields and flush logic | `FrameTask` |
| `kernel/coordinate.ts` | `CoordinateSpace` |
| style snapshots and popover state in `kernel/lift.ts` | `InlineStyleLease` and `TopLayerLease` |
| faithful/flat/in-place branches spread through draggable | `VisualLiftSession` strategies |
| entry-point `applyTransform` functions | `DragRenderer` |
| `kernel/animation.ts` plus entry landing fields | `LandingRunner` and explicit renderer-to-landing transform ownership |
| draggable pointer/rect/delta/mapper fields | draggable pointer/operation/motion FSM slices plus pure `FreeMotionProjection` |
| draggable request and promise branches | drop FSM slice, `FreeDropRequestFactory`, and `FreeDropResolutionEffect` |
| draggable rollback and settle-target branches | `FreeHomeTargetEffect`, `FreeLandingTarget`, and immediate authored restoration |
| sortable `items` variable and `updateItems` fan-out | `SortableCollection` |
| collection replacement behavior during a gesture | sortable operation/insertion projections using `CollectionChangePolicy` |
| `sortable/anchor.ts` plus anchor acquisition/removal | `AnchorFactory` and `PlaceholderLease` |
| sortable rects/dirty/frame/reposition/toIndex fields | `RectIndex`/`FrameTask` caches, `InsertionResolver`, `SpatialInsertionEffect`, and authoritative insertion slice |
| sortable request/no-op/index/neighbor logic | `ReorderRequestFactory` |
| `kernel/commit.ts` and inferred `commitObserved` behavior | removed; completion comes only from `ReorderResolutionEffect` and explicit consumer signals |
| sortable decision/commit promise branches | `ReorderResolutionEffect`, `SortableTransactionProjection`, and one consumer promise continuation |
| sortable settle target branch | `SortableLandingTarget` |
| public `move()`, `MoveResult`, and sortable `MoveResult` export | removed in v1; internal keyboard input uses the ordinary proposal/resolution path |
| entry-point semantic fields | authoritative `DraggableState` / `SortableState` stored by `DragSession` |
| entry-point transition effects | `FreeDragGesture` / `SortableGesture` effect-resource composition |

## Suggested module grouping

The target is logical ownership, not one file per row above. A practical grouping that remains easy to scan is:

```text
src/kernel/
  realm.ts          DOMRealm
  protocol.ts       KernelPhaseProtocol and immutable shared phase/event types
  session.ts        generic DragSession and logical DragTransition
  operation-id.ts   OperationIdentitySource and effect-currency allocation
  resource-scope.ts reusable LIFO ResourceScope
  gesture-scope.ts  GestureScope composition
  errors.ts         reporting and narrow failure-policy helpers
  pointer.ts        PointerSource and PointerCaptureLease
  invalidation.ts   InvalidationSource and FrameTask
  coordinate.ts     CoordinateSpace calculations
  presentation.ts   style/top-layer leases, lift strategies, DragRenderer
  animation.ts      LandingRunner

src/draggable/
  options.ts        public types and DraggableConfig
  admission.ts      resolveDraggablePress
  reducer.ts        DraggableState, lifecycle classifier, parallel projections
  bounds.ts         pure axis/bounds policies
  motion.ts         FreeMotionProjection and request snapshot calculation
  home.ts           explicit FreeHomeTargetEffect
  request.ts        FreeDropRequestFactory
  resolution.ts     FreeDropResolutionEffect
  landing.ts        FreeLandingTarget
  gesture.ts        FreeDragGesture

src/sortable/
  options.ts        public types
  collection.ts     SortableCollection snapshot/version publisher
  collection-policy.ts CollectionChangePolicy
  admission.ts      resolveSortablePress
  reducer.ts        SortableState, lifecycle classifier, parallel projections
  placeholder.ts    AnchorFactory and PlaceholderLease
  insertion.ts      RectIndex, InsertionResolver, SpatialInsertionEffect
  request.ts        ReorderRequestFactory
  resolution.ts     ReorderResolutionEffect
  transaction.ts    transaction types and SortableTransactionProjection
  keyboard.ts       internal keyboard-intent adapter
  landing.ts        SortableLandingTarget
  gesture.ts        SortableGesture
```

`draggable.ts` and `sortable.ts` remain the entry-point concepts and become short composition roots. Their exact public contracts may change only through the explicit decision-and-test process defined above. Internal module grouping does not itself require new package exports.

## Behavioral invariants and test ownership

The decomposition is valid only if these invariants—whether preserved from current behavior or explicitly redesigned above—remain visible, owned, and tested:

| Invariant | Owning entities | Current evidence / required coverage |
| --- | --- | --- |
| State advances before re-entrant effects without allocating a transition record on each move | `DragSession`, logical `DragTransition` | `kernel/session.node.test.ts` plus allocation-sensitive session coverage |
| Every projection reads the same previous state/event and only one complete state is committed | feature root reducer, projection invariant tests | focused root-reducer tests required |
| Foreign, duplicate, and stale currency-tagged events are rejected before payload validation or reporting | feature root reducers, `DragSession` | stale accepted/rejected/malformed/failure and landing-event coverage |
| Pending-to-idle always disarms without cancel/finish | feature effects router, `GestureScope` | click, pointercancel, Escape, removal, and destroy tests required |
| Activation is committed only after acquisition and `onStart` succeed | root reducer, activation effects, `ResourceScope` | activation re-entrancy/failure tests required |
| Release coordinates override the last move | pointer projection, feature motion/insertion projections | draggable and sortable browser tests |
| Document listeners exist only while armed | `PointerSource`, `GestureScope` | listener-lifetime browser tests |
| Every possible drag handle has consumer-authored touch policy before pointerdown; the package performs no inline touch-action mutation | public CSS contract, pointer admission | documentation/type examples plus browser coverage for native scroll/`pointercancel` when omitted |
| Stale promises/resolutions cannot settle a later operation or proposal basis | operation/resolution ids, resolution effects | draggable stale-drop plus sortable stale-version/id tests |
| Each consumer resolution owns a dedicated signal that aborts unresolved work exactly once and never aborts after normal completion | resolution effects, interaction `ResourceScope` | cancel/invalidation/supersession/destroy plus accepted/rejected/failure completion tests |
| Destroy closes event ingress, silently destroys landing, and performs ordered idempotent cleanup | controller facade, `DragSession.close`, `GestureScope`, `LandingRunner`, leases | both browser suites plus focused destroy-sequence tests |
| Partial/failing activation restores every acquisition in LIFO order | `ResourceScope`, leases, acquisition failure policy | draggable recovery test; focused scope tests required |
| Faithful/flat/in-place lifts preserve their geometry contracts | `CoordinateSpace`, `VisualLiftSession`, `DragRenderer` | coordinate and draggable browser tests |
| Pointer movement/invalidation apply axis and bounds, while controlled positions are authoritative and bypass those constraints; both use one committed state/render path | `FreeMotionProjection`, draggable root, `DragRenderer` | independent pointer-constraint and controlled-position bypass tests |
| Transform has one writer and explicit renderer-to-landing handoff | `DragRenderer`, `LandingRunner` | focused handoff/interruption tests required |
| Sortable preview uses coalesced effects but logical insertion lives only in state | sortable insertion projection, `FrameTask`, `SpatialInsertionEffect` | reducer plus preview browser tests |
| Proposal construction accepts only matching operation/version/spatial tokens | sortable root, `ReorderRequestFactory` | re-entrant collection update and stale-result tests required |
| Every reorder request field derives from one immutable proposal snapshot | `ReorderRequestFactory`, request invariant tests | forward/backward/edge/no-op coverage required |
| Sortable never mutates the persistent collection | `SortableCollection`, request/transaction projections | sortable browser tests and public contract |
| Consumer acceptance/rejection is completed only by one explicit sync/async resolution; collection/DOM changes and elapsed time never complete it | resolution effects, transaction projections | sync/async accepted/rejected, invalid-result, callback-failure, and unrelated-collection-update tests required |
| `accepted` is a trusted consumer guarantee that persistent authored presentation is ready before settlement | required resolver contracts, landing targets | accepted-ready ordering tests for free and sortable |
| Public normal callbacks run only after visual ownership is restored: accepted/no-op -> `onFinish`, rejected/canceled -> `onCancel`; failures use `onError` and no normal callback | feature effects routers, public callback contracts | exactly-once ordering, rollback-before-cancel, cleanup-before-finish, accepted-then-presentation-failed coverage |
| Removal disarms before activation, cancels while active/open, and never rewrites a terminal transaction | lifecycle classifier, sortable transaction/settlement projections | phase-complete removal matrix required |
| Post-terminal model removal preserves transaction and settlement completely | sortable settlement projection | accepted/rejected/canceled-then-removal no-change coverage required |
| Only concrete presentation-effect failures may emit `presentation-invalid` and refine settlement to failed | presentation effects, sortable settlement projection | source-complete invalidation and inference-exclusion coverage required |
| At most one pointer or internal keyboard reorder operation is active | sortable facade and root classifier | cross-input concurrency and unresolved-resolution admission tests |
| Owning iframe events and platform APIs use one realm | `DOMRealm`, structural discrimination | cross-realm browser tests required |

Future entity-level tests should cover:

- pending-to-idle disarm for pointerup, pointercancel, Escape, item removal, and destroy;
- `pending -> activating(acquiring) -> activating(candidate) -> dragging`, including acquisition failure, `onStart` failure, synchronous cancel/destroy, and stale `activation-ready`/`start-succeeded`;
- parallel projection invariants and absence of observable/committed intermediate states;
- `ResourceScope` LIFO/best-effort disposal, interaction/presentation separation, and stale continuation suppression;
- matched top-layer/style/capture acquisition and release, including partial activation;
- same-realm and iframe-realm admission without `instanceof` assumptions;
- consumer-owned `touch-action` documentation/examples and browser behavior when it is omitted, including native scroll or `pointercancel`;
- required `onDrop` and `onReorder` construction contracts, with no absent-handler default;
- explicit synchronous/asynchronous acceptance and rejection, plus indefinitely pending resolution;
- collection and DOM changes never completing consumer resolution;
- dedicated resolution signals: abort exactly once on cancel, invalidation, supersession, or destroy; no abort after accepted/rejected/failure completion; silently consumed rejection after abort;
- `{ operationId, resolutionId }` and `{ operationId, landingId }` currency, including stale accepted, rejected, malformed, failed, finished, pinned, and interrupted results;
- validation of `undefined`, `null`, primitives, unknown tags, malformed objects, callback throws, rejected promises, and throwing `then` access, only after current currency is confirmed;
- synchronous cancel, destroy, or reorder-only item removal from inside a resolver, including removal winning over a subsequently returned `accepted`;
- pointer free-motion axis/bounds constraints, controlled-position bypass semantics, persistent authored-presentation readiness before free acceptance, and immediate authored restoration without a home target;
- animated rollback to an explicit finite viewport-space home point, with malformed space/non-finite configured targets refining recovery to failed/immediate;
- renderer-to-landing transform handoff plus finished, silently destroyed, and unexpectedly interrupted animation paths;
- rect-cache invalidation, hysteresis, neighbor identity, and list/row/grid insertion independently of the full controller;
- inner sortable visual behavior proving that the package never mutates/collapses the outer item and that source-host layout remains consumer-owned;
- proposal stabilization under synchronous/re-entrant collection update, mismatched insertion version, and stale operation/spatial ids;
- same-snapshot `from`/`to`/neighbor invariants for every direction and edge;
- explicit reorder resolution for synchronous and asynchronous acceptance/rejection, indefinitely pending work, invalid results, thrown/rejected callbacks, item removal, cancellation, and destroy;
- collection replacement/removal during pending, activating, active, proposal resolution, consumer resolution, and settlement;
- exact identity-gap rebasing for internal/start/end gaps, plus cancellation for missing, non-adjacent, or contradictory neighbors;
- internal keyboard proposal parity and pointer/keyboard one-operation concurrency;
- post-terminal collection changes remaining inert, completion-before-pin ordering, and phase-specific concrete-only `presentation-invalid` ingress;
- every failure-policy row, including re-entrant destroy from each consumer resolver/getter/callback;
- public callback ordering: `onFinish` exactly once after accepted/no-op cleanup, `onCancel` exactly once after rejected/canceled rollback cleanup, `onError` only for real failures after failed-state commit, and no normal callback after destroy.

Tests that encode the superseded contracts are removed rather than adapted: `undefined => accepted`, collection/model commit observation, DOM-order acknowledgement, acknowledgement timeout, accepted-but-uncommitted outcomes, and public programmatic movement. Their replacements are the explicit-resolution, dedicated-signal, currency, removal-precedence, authored-restoration, and presentation-failure cases above.

## Contract decisions

The package is unpublished and pre-alpha, so provisional behavior may be replaced. Compatibility with the current implementation is not a decision criterion. Correctness, predictable ownership, pointer-path performance, bundle size, maintainability, and clear testable contracts are.

Structural extraction and semantic changes remain separate review units where practical. Every semantic change records:

- the old and new observable behavior;
- the chosen owner and lifetime;
- cancellation, failure, and re-entrancy behavior;
- focused acceptance tests;
- any public types or documentation that change.

### Decisions already made by this architecture

- Each feature has one authoritative root reducer assembled from parallel pure projections over the same previous state/event.
- The common phase protocol uses generic `awaiting-result`; sortable state refines it as proposal resolution or consumer resolution.
- Activation has an explicit candidate substep; only `start-succeeded` creates an activated operation eligible for cancel/finish semantics.
- Pending-to-idle has an explicit `disarm()` effect.
- Interaction and presentation resources are separate LIFO scopes.
- Dragged-item removal disarms before activation and cancels an active/open intra-collection reorder. During consumer resolution it wins synchronous re-entrancy and makes later resolver completion stale. After terminality it is inert.
- Every reorder request field is derived from one immutable, version-stabilized proposal snapshot; a proposal is never rebased.
- Transform ownership transfers from `DragRenderer` to `LandingRunner` at settlement and back to authored state through presentation disposal.
- Controller destroy is out-of-band terminal teardown with no settlement result; `LandingRunner.destroy()` is silent, while interruption produces deterministic failed/immediate recovery.
- Realm-sensitive platform work uses `DOMRealm`, and pointer-event discrimination is structural.
- Consumer-controlled calls always require controller and operation/effect currency checks before subsequent effects. Asynchronous payload currency is checked before runtime validation.
- `onDrop` and `onReorder` are required construction-time contracts. Missing callbacks throw synchronously; absent callbacks and `undefined` results never imply acceptance.
- Consumer-owned semantics complete only through explicit `MaybePromise<Resolution>` signals with dedicated unresolved-only abort lifetimes. Collection shape, DOM shape, elapsed time, and callback absence never imply acceptance, rejection, persistence, renderer readiness, or domain completion.
- `accepted` guarantees that the immutable proposal is accepted and persistent authored presentation is ready for settlement and eventual restoration. The library trusts rather than verifies this guarantee.
- Free-drag rollback uses only an explicit consumer home-target capability. Without one, presentation is restored immediately without animation or domain-result change; an invalid configured target is a presentation failure followed by immediate recovery. The library reconstructs no DOM home placeholder or anchor.
- Free accepted settlement restores authored presentation immediately in v1. Animated accepted landing requires a future separate explicit target capability.
- The free home target is a synchronous finite viewport-space point; absent capability means immediate restoration, while invalid configured output is a presentation failure.
- Pre-proposal sortable collection replacement uses exact identity-gap rebase or cancellation; it never recomputes intent from pointer position.
- Inner sortable visuals remain supported, but source-host layout is consumer-owned and never automatically collapsed.
- Touch action is entirely consumer-owned CSS; the package acquires no touch-action lease and performs no inline mutation.
- Controlled free-drag positions are authoritative and bypass pointer axis/bounds constraints.
- Public normal completion is split into `onFinish` for accepted/no-op and `onCancel` for rejected/canceled, both after cleanup; `onError` is reserved for real failures.
- Public `SortableController.move`, `MoveResult`, its sortable entry re-export, the implementation entity/module, and programmatic-movement tests are removed in v1. Internal keyboard input shares proposal and resolution semantics, with only one pointer or keyboard operation active at a time.

### Final decision: free home-target public value shape

The optional synchronous home resolver returns exactly `{ position: Point, space: 'viewport' }`, where `position` is the target border-box origin and both coordinates must be finite. The library converts that value deterministically into a `LandingPlan`. Absence of the resolver means immediate authored restoration. A configured resolver that throws or returns `null`, malformed data, an unknown coordinate space, or non-finite coordinates produces a concrete `home-target` presentation failure followed by immediate recovery. No DOM element, rect, parent/neighbor reconstruction, or automatic fallback is accepted.

### Final decision: contradictory sortable rebasing

Before proposal creation, collection replacement preserves the operation only when the exact identity gap survives. Internal gaps require the same `before` and `after` identities to remain adjacent after removing the dragged item; start/end gaps require the surviving edge neighbor to remain at that edge. The insertion is synchronously rebased to the replacement version/index and the placeholder follows the committed insertion. Missing, non-adjacent, or contradictory neighbors cancel with `collection-invalidated`; one surviving interior neighbor is insufficient. Collection changes never trigger pointer-based recomputation, so release observes either a ready rebased insertion or cancellation. Proposals remain immutable and are never rebased.

### Final decision: inner visual source layout

`getVisual(item)` may return a descendant rather than the sortable item itself. In that case the consumer owns the source host's layout and guarantees that lifting the inner visual does not leave an additional occupied slot alongside the placeholder. The library documents this limitation and does not automatically collapse, resize, reposition, hide, or otherwise mutate the outer item. A future explicit source-layout strategy may be added only if real usage demonstrates the need.

### Final decision: dynamic handles and touch action

Touch policy is consumer-owned CSS. The package exposes no stable touch-target option and performs no inline `touch-action` acquisition/restoration. Every element that may be returned as a dynamic handle must already have appropriate touch policy before pointerdown, normally `touch-action: none`. Without it, native scrolling or browser `pointercancel` is expected behavior and not an engine failure.

### Final decision: controlled free-drag positions and constraints

Pointer-derived movement and invalidation apply configured axis and bounds. A consumer-controlled position is an authoritative value and bypasses both. It is still validated and converted into the canonical committed motion representation, then rendered through the same state/render path. Consumers that want constrained controlled positions apply the desired constraint policy themselves before updating the controller.

### Final decision: public callback and result surface

Internal rejected and canceled states remain distinct, but both are normal non-applied outcomes at the public boundary. After settlement and presentation cleanup:

- `onFinish` receives accepted results and sortable engine-owned no-op results;
- `onCancel` receives explicit consumer rejection or library/consumer cancellation, preserving the concrete reason/result;
- `onError` is reserved for real execution failures and runs after failed state commits but before recovery.

Explicit rejection therefore performs rollback and invokes `onCancel`, never `onError`. Escape, pointer cancellation, item removal, collection invalidation, and `controller.cancel()` abort any unresolved resolution and invoke `onCancel` only after rollback cleanup. `onFinish` and `onCancel` each run at most once and only after visual ownership has returned to the consumer. Failed settlement invokes neither; `onError` receives the stable cause plus any prior domain result, covering accepted-then-presentation-failed. Activation failure invokes only `onError`; `destroy()` remains silent. Errors thrown by `onFinish`/`onCancel` are forwarded after cleanup through `onError` with callback-specific causes and do not begin another recovery.

## Definition of done for a future refactor

The architecture has reached the intended “lego” shape when:

- both public entry files read primarily as construction and wiring;
- each mutable field has one named owner and one lifetime;
- no cleanup path needs to infer whether a resource was acquired;
- free motion, spatial insertion, consumer transactions, and presentation can be tested independently;
- draggable and sortable share lifecycle/presentation entities without sharing feature policy;
- no broad context object or configurable mega-session replaces the current closures;
- every behavioral difference from the provisional implementation is an explicit, tested decision rather than an accidental consequence of extraction;
- every consumer-owned completion has one explicit signal channel, with no collection/DOM/time-based inference;
- callback ordering, tree-shaking, pointer-path allocations, runtime performance, and bundle-size budgets are explicit acceptance criteria.
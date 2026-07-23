# 06 — Effect Runtime Ownership and Source Simplification

**Status:** implementation plan for agent review  
**Repository snapshot:** `ausginer/material-x@0b13c9ef89dde36a312d3ff3dc1dfe8a8011f879`  
**Measured combined baseline:** 13.28 kB Brotli  
**Scope:** `packages/drag/src/draggable`, `packages/drag/src/sortable`, and directly related kernel effect-runtime helpers

---

## 1. Objective

Preserve the new explicit FSM architecture and redesign the physical effect layer so that:

1. each mutable browser/resource lifetime has one obvious owner;
2. feature effect roots are composition routers rather than imperative monoliths;
3. known failures return typed events with complete currency;
4. batch continuation rules remain explicit;
5. source navigation reflects responsibility boundaries;
6. trivial one-use helpers, forwarding wrappers, dead acknowledgements, and generated-looking scaffolding are removed;
7. the resulting source is smaller and easier to read without returning semantic decisions to effect executors.

This is not a request to revert `Decision<State, Effect>`, FIFO run-to-completion, explicit reporting/finalizing states, or currency-tagged results.

The current 13.28 kB combined Brotli result is the measurement baseline. Record draggable, sortable, and combined sizes after each coherent stage, but do not sacrifice the responsibility model merely to recover bytes.

---

## 2. Architectural invariants to preserve or establish

The architecture remains:

```text
event
-> authoritative phase-specific machine
-> Decision { state, effects }
-> commit complete state
-> execute semantic effects
-> dispatch typed observations/results
```

### 2.1 Invariants already established and to preserve

- no production `planEffects(from, to, event)`;
- no effect executor receives `from`, `to`, or current machine state;
- no shared `Gesture` base class;
- no semantic state mirror such as `currentOperation`;
- state commits before effects;
- ordinary nested dispatch is FIFO;
- terminal destroy closes ingress and stops the remaining batch tail;
- unknown executor/router errors use the terminal panic path;
- machine-state generations remain replay-pure.

### 2.2 Target invariants that this task must establish

These are design requirements, but they are **not yet uniformly true in the current snapshot**:

- the machine, not an effect owner, selects lifecycle phase, domain outcome, settlement recovery, and callback policy;
- async and replaceable results are rejected by complete currency **before** result payload validation or interpretation;
- a required missing owner cannot merely stop the batch and leave a committed waiting state stranded;
- every known effect failure either dispatches a typed continuation event or deliberately escalates to terminal panic.

Protocol corrections required to make these target invariants true are explicitly in scope.

---

## 3. Current structural assessment

### 3.1 Draggable

`draggable/effects.ts` is still one physical runtime that owns or implements:

- admitted pointer input;
- operation resources and scopes;
- lift and renderer;
- bounds caching;
- motion and controlled-position observation;
- release geometry and proposal construction;
- drop resolution;
- presentation readiness;
- landing runner;
- error reporting;
- terminal callbacks;
- retirement and destruction.

The FSM has been decomposed, but the physical side is still a large multi-reason module.

### 3.2 Sortable

`sortable/effects.ts` has begun extracting collaborators, but its root still owns:

- operation identity and input;
- `OperationResources`;
- frame scheduling;
- resolution replacement;
- readiness watch;
- landing replacement;
- terminal cleanup;
- callbacks and reporting;
- the exhaustive router.

The existing `createSortablePresentationOwner()` is also too broad. It currently owns:

- lift;
- renderer;
- placeholder lease;
- origin geometry;
- rectangle index;
- pointer capture registration;
- invalidation registration;
- active insertion resolution;
- committed placeholder placement;
- landing geometry access.

This is not one responsibility merely because all of it is presentation-adjacent.

---

## 4. Correctness and protocol issues to resolve during the extraction

These are blocking findings, not optional cleanup.

### 4.1 Sortable activation requires an explicit partial-acquisition transaction

Current activation acquires the lift before creating/inserting the placeholder, but registers both presentation disposers only after placeholder creation succeeds. If `createPlaceholder`, anchor construction, or insertion throws, the acquired lift is not registered in the presentation scope, and the current `destroy()` only clears references.

Required resolution:

- introduce an explicit sortable activation transaction/coordinator;
- register or locally retain rollback immediately after every successful acquisition;
- on failure, release acquired resources in reverse order;
- clear owner fields only after actual disposal;
- do not publish `ACTIVATION_READY` until the complete transaction succeeds;
- dispatch `ACTIVATION_FAILED` and return `STOP_BATCH` after rollback;
- add a test where lift acquisition succeeds and placeholder creation/insertion throws;
- verify no lift, top-layer lease, placeholder, pointer capture, invalidation listener, or owner reference survives.

The activation coordinator is an orchestrator, not a second owner. Visual, placeholder, and spatial owners still physically own their handles after commit.

### 4.2 `STOP_BATCH` alone must never strand a committed waiting state

`STOP_BATCH` truncates only the current effect array. It does not change the state that was already committed before execution.

Therefore, a required missing owner cannot be handled by:

```ts
if (!owner) {
  return STOP_BATCH;
}
```

when the machine is waiting for a result from that command.

Required rule:

- for a known/recoverable mechanical failure, dispatch the appropriate typed failure event and then return `STOP_BATCH`;
- for an impossible internal invariant violation, throw into the terminal panic path;
- silent optional chaining is allowed only for genuinely optional, non-acknowledged best-effort work;
- every branch returning `STOP_BATCH` must be audited to prove that the machine will either receive a continuation event or be terminally closed.

This applies to missing renderer, presentation, placeholder, landing runner, operation resources, frame owner, and resolver owner.

### 4.3 Sortable motion-presentation failure needs real currency in both contexts

The current `PRESENT_MOTION` branch converts renderer failure into `ACTIVE_INSERTION_FAILED` with sentinel spatial values:

```ts
collectionVersion: -1,
spatialId: -1,
```

The active machine accepts `ACTIVE_INSERTION_FAILED` only when complete currency matches `pendingSpatial`. The fake event is stale by construction and can be silently ignored.

A dedicated presentation failure protocol must cover both:

1. the initial render emitted after `START_SUCCEEDED`, where no `pendingSpatial` exists;
2. ordinary pointer motion, where presentation and spatial observation are emitted in the same decision.

Recommended shape:

```ts
type MotionCurrency = Readonly<{
  operationId: number;
  motionId: number;
}>;
```

Each accepted presentation command allocates and commits the current/latest motion generation before emitting `PRESENT_MOTION`. A failure event carries that currency. The relevant phase accepts it only when it matches the latest committed presentation attempt.

Required behavior:

- initial-render failure is accepted and enters reporting/recovery;
- current pointer-motion render failure is accepted;
- an older render failure after a newer motion was issued is stale;
- synchronous render failure dispatches the typed event and returns `STOP_BATCH`, preventing dependent spatial/callback tail work;
- never manufacture sentinel currency;
- do not reuse a spatial failure event for rendering merely to avoid a protocol tag.

An alternative currency model is acceptable only if it explicitly and testably covers both contexts.

### 4.4 Sortable placeholder write failure bypasses the FSM

`PLACE_COMMITTED_INSERTION` currently catches and sends the error directly to platform reporting, then continues the batch.

Required resolution:

- add a typed placeholder/presentation-write failure result;
- let the machine select failure stage, outcome, and recovery;
- define whether `OPEN_REORDER_RESOLUTION` depends on successful placement;
- stop the dependent tail when it does;
- reserve platform-only reporting for panic, disposer failures, or a failing `onError`.

### 4.5 Rectangle-cache invalidation must reflect an actual DOM change

Removing the unconditional `markRectIndexDirty()` before every resolution is necessary but insufficient.

The machine currently emits `PLACE_COMMITTED_INSERTION` even when a resolved insertion falls back to the unchanged incumbent. The current `place()` implementation then always marks the rectangle index dirty, so the following frame can still remeasure the entire collection.

Required resolution:

- `PlaceholderOwner.place()` determines whether the placeholder's DOM position actually changes;
- mark spatial geometry dirty only when placement changes DOM order/position;
- a no-op incumbent placement must not dirty the index;
- collection-version changes and external invalidation still force refresh;
- proposal/release resolution still performs the required fresh read-before-write pass;
- test the complete machine → effect router → placeholder owner → spatial owner path, not only `refreshRectIndex()` in isolation;
- prove that repeated unchanged active insertions do not trigger repeated full measurement.

### 4.6 Sortable landing pin may report success without a runner

The current pin implementation uses optional chaining and then always dispatches `LANDING_PINNED`.

Required resolution:

```ts
if (!runner) {
  throw new Error('drag: landing runner unavailable');
}
runner.pin();
```

A missing runner must:

- dispatch `LANDING_PIN_FAILED` and return `STOP_BATCH` when treated as a known mechanical failure; or
- throw into terminal panic when classified as an impossible invariant violation.

It must never report success.

### 4.7 Reorder callback receives an artificial async boundary

`ReorderResolutionOwner.invoke()` currently starts with:

```ts
Promise.resolve().then(() => callback(request, context));
```

This forces a synchronous callback into a later microtask, unlike draggable resolution and unlike normal effect execution.

Required resolution:

- invoke the consumer callback synchronously inside `try`;
- then normalize its returned value with `Promise.resolve(value)`;
- preserve FIFO ordering for callback-generated events versus the resolution result;
- add ordering tests;
- keep the artificial async boundary only if it is explicitly selected as public behavior and applied consistently to both features.

### 4.8 Callback policy must move out of finalization executors

Both feature finalization executors currently inspect terminal outcome and choose `onFinish` versus `onCancel`.

The machine already owns the terminal outcome and must own this semantic classification.

Required resolution:

- `FINALIZE_OPERATION` carries one already-selected terminal callback capability and its typed domain argument, or an explicit callback kind selected by the machine;
- the executor releases presentation, invokes exactly the supplied capability, and reports completion/failure;
- `FINALIZATION_FAILED` carries currency and error only;
- the machine derives `FAILURE_FINISH_CALLBACK` or `FAILURE_CANCEL_CALLBACK`;
- remove dead imported constants and `void` expressions.

### 4.9 Sortable finalization reporting is not an acknowledged continuation

The finalization-failure branch currently emits:

```ts
[REPORT_FAILURE, RETIRE_OPERATION];
```

This retires resources in the same batch before `FAILURE_REPORTED` is reduced.

Required resolution:

```text
Finalizing + FINALIZATION_FAILED
-> Reporting state
-> REPORT_FAILURE only
-> FAILURE_REPORTED
-> Idle + RETIRE_OPERATION
```

`REPORT_FAILURE` must remain the only command in its batch.

### 4.10 Dead or miswired events and acknowledgements

Audit every success/failure event against machine consumers.

Known candidates:

- draggable `MOVE_CALLBACK_SUCCEEDED` is dispatched but has no semantic continuation;
- sortable `PRESENTATION_FAILED` is declared/handled but is not correctly emitted for active rendering;
- success acknowledgements that always fall through to `ignored()` should be removed.

Rule:

> A success acknowledgement exists only when the machine must wait for it before advancing or when it closes a real fallible/re-entrant continuation.

### 4.11 Draggable policy capture is incomplete for coordinate-space updates

Draggable captures axis and callback in `pendingMotion`, but callback geometry is later built from the activation-time `operation.coordinateSpace`. Controlled-position resolution may use the newly committed policy mapper, producing mixed coordinate spaces in one motion.

Required resolution:

- capture the effective coordinate mapper in the accepted motion decision;
- use the captured mapper for both controlled-position observation and the eventual callback geometry;
- ensure one effect batch uses one committed policy snapshot.

### 4.12 Currency checks must be intentional, complete, and early

Do not accept a result merely because `operationId` matches when the result belongs to a replaceable motion/spatial/resolution/landing attempt.

For every result event, document whether:

- full subordinate currency is required; or
- any failure within the current operation is intentionally operation-fatal.

The latter is allowed only as an explicit rule with tests.

Validation order is also normative:

```text
check terminal/current complete currency
-> only then inspect, validate, or normalize result payload
-> dispatch accepted typed result
```

The current draggable drop path calls the resolution type guard before its `finish()` guard applies operation identity, and that guard does not compare `resolutionId`. Correct this so stale results are discarded before payload inspection.

Draggable motion failures that currently match only `operationId` must either:

- match the current `motionId`; or
- be explicitly documented and tested as operation-fatal regardless of attempt generation.

### 4.13 Exhaustiveness must survive source simplification

Inlining a one-use `assertNever()` helper is permitted only when compile-time exhaustiveness remains.

Valid patterns include:

```ts
default: {
  const unexpected: never = effect;
  throw new Error(
    `drag: unknown effect ${
      (unexpected as { type?: unknown }).type as string
    }`,
  );
}
```

or:

```ts
default: {
  effect satisfies never;
  throw new Error(...);
}
```

Retaining a shared `assertNever(value: never)` helper is also acceptable.

A cast followed directly by `throw` without a `never` assignment/check is forbidden because a newly added union member could compile without a router case.

---

## 5. Target ownership model

`OperationResources` remains the coordinator of:

- operation abort signal;
- interaction scope;
- presentation scope;
- ordered teardown.

It must not become a registry duplicating leaf handles.

### 5.1 Draggable owners

Suggested logical decomposition:

```text
DraggableEffectRuntime
├── OperationInputOwner
├── DraggablePresentationOwner
├── FreeMotionObserver
├── DropResolutionOwner
├── PresentationBarrierOwner
├── FreeLandingOwner
└── callback/reporting functions
```

#### `OperationInputOwner`

Owns:

- current operation ID;
- pointer ID;
- `OperationResources`;
- document/session input arming;
- current-currency guard;
- interaction stop;
- operation retirement.

It does not own lift, bounds, resolver, readiness watch, or landing runner.

#### `DraggablePresentationOwner`

Owns:

- lift;
- renderer;
- activation acquisition of presentation handles;
- rendering;
- presentation release.

Pointer capture is registered with operation interaction resources during acquisition, but the presentation owner does not become the operation owner.

#### `FreeMotionObserver`

Owns:

- static bounds cache;
- bounds version;
- dynamic bounds reads;
- controlled-position conversion;
- release geometry observation.

It returns typed observations and never commits state.

#### `DropResolutionOwner`

Owns:

- one abortable resolver;
- resolution currency;
- completed/aborted status;
- normalization of consumer result;
- replacement and teardown.

#### `PresentationBarrierOwner`

Owns exactly one readiness watch:

```ts
watch(currency, ready): void;
stop(): void;
destroy(): void;
```

A later watch replaces the previous one atomically.

#### `FreeLandingOwner`

Owns exactly one `LandingRunner` and performs:

- home-target observation/plan construction;
- runner start;
- pin;
- replacement;
- destroy.

If home-target observation is considered distinct enough, it may be a stateless resolver module while the owner retains only the runner.

### 5.2 Sortable owners

Suggested logical decomposition:

```text
SortableEffectRuntime
├── OperationInputOwner
├── SortableActivationCoordinator
├── SortableVisualOwner
├── PlaceholderOwner
├── SpatialInsertionOwner
├── ReorderResolutionOwner
├── PresentationBarrierOwner
├── SortableLandingOwner
└── callback/reporting functions
```

#### `SortableActivationCoordinator`

Coordinates the all-or-nothing activation transaction across:

- visual acquisition;
- placeholder creation/insertion;
- pointer capture;
- invalidation registration;
- initial insertion derivation.

It immediately records rollback after each successful step, rolls back in reverse order on failure, and transfers committed handles to their physical owners only after the transaction succeeds.

It owns no long-lived browser handle after commit.

#### `SortableVisualOwner`

Owns only:

- lift;
- renderer;
- origin rectangle;
- activation-time visual acquisition;
- motion rendering;
- visual release/connectivity access.

#### `PlaceholderOwner`

Owns only:

- placeholder lease;
- initial insertion derivation;
- committed placement;
- home restoration;
- placeholder rectangle;
- release.

Placeholder placement marks spatial geometry dirty through an explicit port/callback. It does not own the rectangle index.

#### `SpatialInsertionOwner`

Owns:

- frame task;
- rectangle index;
- dirty/version state;
- latest immutable request descriptor if needed for invalidation;
- active/proposal spatial observation.

It depends on narrow placeholder ports:

```ts
placeholderElement(): HTMLElement;
placeholderRect(): DOMRectReadOnly;
```

It does not own lift, renderer, operation state, proposal semantics, or settlement.

#### `ReorderResolutionOwner`

Keep the existing narrow ownership, but remove the artificial callback microtask and make abort/completion semantics explicit.

#### `SortableLandingOwner`

Owns one runner. It receives narrow visual/placeholder ports rather than the entire current presentation aggregate.

### 5.3 Shared owners

Do not force common abstractions during the first extraction.

After both feature-local implementations stabilize, consider sharing only contracts that are mechanically identical:

- presentation barrier;
- abortable consumer-resolution shell;
- landing-runner shell;
- operation input shell.

Do not create a generic feature context or base effect runtime.

---

## 6. Composition-root rules

`draggable/effects.ts` and `sortable/effects.ts` should become composition roots.

Normative constraints:

- root files may own the terminal flag and references to owners;
- root files do not retain leaf browser handles directly;
- root files do not call DOM APIs;
- root files do not contain resource-specific `try/catch`;
- switch cases delegate in a small number of statements;
- every switch is exhaustive;
- stale currency returns `STOP_BATCH` when the remaining batch belongs to the same obsolete decision;
- owner constructors are side-effect-free;
- owner `destroy()` methods are idempotent;
- root `destroy()` orders owner teardown once.

Illustrative router:

```ts
const execute = (effect: SortableEffect): EffectDisposition => {
  if (terminal) {
    return STOP_BATCH;
  }

  switch (effect.type) {
    case BEGIN_POINTER_OPERATION:
      return operation.beginPointer(effect);

    case ACQUIRE_SORTABLE_ACTIVATION:
      return activation.acquire(effect);

    case PRESENT_MOTION:
      return visual.render(effect);

    case RESOLVE_ACTIVE_INSERTION:
      return spatial.schedule(effect.request);

    case PLACE_COMMITTED_INSERTION:
      return placeholder.place(effect);

    case OPEN_REORDER_RESOLUTION:
      return resolution.open(effect);

    case WATCH_PRESENTATION:
      return barrier.watch(effect);

    case PREPARE_SORTABLE_LANDING:
    case START_LANDING:
    case PIN_LANDING:
      return landing.execute(effect);

    case REPORT_FAILURE:
      return reportFailure(effect, dispatch);

    case FINALIZE_OPERATION:
      return finalize(effect, presentation, dispatch);

    default: {
      const unexpected: never = effect;
      throw new Error(
        `drag: unknown sortable effect ${
          (unexpected as { type?: unknown }).type as string
        }`,
      );
    }
  }
};
```

The exact grouping may differ, but the root must visibly be a router rather than the implementation of every subsystem.

---

## 7. Helper-function simplification policy

The current generated code contains several helpers that add indirection without preserving an important abstraction.

Do not optimize toward an arbitrary function-count target. Use semantic criteria.

### 7.1 Keep a helper when at least one is true

Keep it when it:

1. has multiple nontrivial call sites;
2. names and centralizes a domain invariant;
3. is a type guard needed for narrowing;
4. is a stateful owner factory;
5. defines an ordered cleanup transaction;
6. is an independently testable pure domain transformation;
7. prevents duplicated currency checks that must remain identical.

Examples worth keeping:

- settlement-gate join;
- full landing/spatial/resolution currency match;
- settlement-state construction used across phases;
- resolver result type guard;
- owner `retire()` or `replace()` transaction;
- `spatialRequest()` when used by active and release paths.

### 7.2 Inline a helper when all are true

Inline it when it:

1. has one call site;
2. is short;
3. has no independently meaningful invariant;
4. merely forwards arguments or throws;
5. makes navigation harder than the expression it hides.

A one-use `assertNever()` may be inlined, but the inline branch must retain compile-time exhaustiveness:

```ts
default: {
  const unexpected: never = effect;
  throw new Error(
    `drag: unknown effect ${
      (unexpected as { type?: unknown }).type as string
    }`,
  );
}
```

Do not replace it with a cast-only `throw`. Retaining a shared `assertNever(value: never)` is preferable when several routers use it.

Also remove:

- feature-local wrappers that only call kernel `ignored(state)`;
- helpers with an unused placeholder parameter;
- helpers whose only purpose is one object literal used once;
- forwarding aliases around one owner method;
- comment-only branches and `void config`;
- imports retained only through `void SOME_CONSTANT`.

### 7.3 Do not replace names with magic literals

Source simplification does not mean authored manual minification.

Replace raw protocol values such as:

```ts
54;
51;
108;
{
  stage: 0;
}
{
  stage: 1 as const;
}
```

with named constants and domain constructors.

Numeric constants will still minify. Raw numbers in authored state-machine code obscure semantics and make reviews unsafe.

### 7.4 Remove redundant decision wrappers

Candidates to audit:

- `ignoreDraggable()` / `ignoreSortable()` forwarding to kernel `ignored()`;
- `settlementEffects(state, config)` where `config` is unused;
- `advance(_, next, config)` with an unused first parameter;
- success-result helpers whose events have no consumer;
- duplicated `createIdle()` if the object literal is clearer at its few call sites.

Do not remove a helper solely because it is small when it centralizes an important join or currency rule.

---

## 8. Effect protocol cleanup rules

### 8.1 No sentinel identities

Never use `-1`, `0`, or another impossible generation to squeeze one failure through an unrelated event type.

Add the correct event or carry the correct currency.

### 8.2 No known failure through platform reporting

Known effect failures return typed events.

Platform reporting is reserved for:

- unexpected panic;
- disposer errors where no safe FSM continuation exists;
- failure of `onError` itself.

### 8.3 Success acknowledgements are conditional

Do not dispatch success merely because a function returned.

Dispatch it only when:

- the machine is in an explicit waiting continuation;
- consumer re-entry must be ordered before advancement;
- resource acquisition must be acknowledged;
- async work completed.

### 8.4 Consumer callback invocation

For a callback effect:

- the callback is last/sole in its batch;
- invoke synchronously unless the public contract intentionally says otherwise;
- queue callback-generated events immediately;
- dispatch success/failure after callback return/throw;
- recheck terminal/current currency after callback;
- normalize returned promises without introducing a gratuitous microtask before invocation.

### 8.5 Batch disposition

Return `STOP_BATCH` when:

- currency is stale and the tail belongs to the same decision;
- a synchronous command failed and later effects depend on success;
- terminal destroy occurred;
- an invariant-required owner is unavailable.

Return `CONTINUE_BATCH` only when the tail is explicitly independent.

---

## 9. Suggested implementation sequence

### Stage A — Characterize current behavior

Before structural movement, add focused tests for:

- sortable activation rollback when lift acquisition succeeds and placeholder creation/insertion throws;
- required-owner absence either dispatches a typed failure or enters terminal panic without stranding state;
- sortable initial-render failure after `START_SUCCEEDED`;
- sortable renderer failure during ordinary active motion;
- placeholder placement failure before consumer resolution;
- unchanged active frame reuses rectangle cache through the complete machine/owner path;
- no-op committed insertion does not dirty the rectangle cache;
- pin with missing landing runner fails;
- synchronous `onReorder` re-entry ordering;
- finalization callback failure waits for `FAILURE_REPORTED`;
- draggable coordinate-space update during active operation;
- stale motion/spatial/resolution result rejection before payload validation;
- success acknowledgements that currently do nothing.

Record:

```text
draggable Brotli
sortable Brotli
combined Brotli = 13.28 kB
accepted pointer-move allocations
large-sortable frame measurements
```

### Stage B — Correct protocol defects

Fix sections 4.1–4.13 without broad ownership extraction.

Measure and test.

### Stage C — Extract sortable physical owners

Sortable already has partial seams, so complete them first:

1. add the explicit activation transaction/coordinator and partial rollback;
2. split visual, placeholder, and spatial ownership out of `effects/activation.ts`;
3. move frame ownership into spatial owner;
4. move readiness disposer into barrier owner;
5. keep resolution and landing owners narrow;
6. reduce `sortable/effects.ts` to composition and routing.

Measure and test.

### Stage D — Extract draggable physical owners

Extract operation, presentation, bounds/motion, resolution, barrier, and landing ownership.

Reduce `draggable/effects.ts` to composition and routing.

Measure and test.

### Stage E — Simplify helper surface

Apply section 7 across both feature machines and effect roots.

This stage must not:

- merge phase handlers;
- reintroduce transition interpretation;
- use magic numbers;
- remove domain-invariant helpers.

Measure and test.

### Stage F — Evaluate proven sharing

Compare feature-local owner contracts. Share only obviously identical mechanical owners when doing so improves navigation and does not recreate a generic gesture runtime.

Record final sizes and allocation results.

---

## 10. Testing requirements

### Ownership

- every admitted operation starts with clean owners;
- two consecutive operations retain no old resolver, frame, watch, runner, placeholder, lift, or cache;
- replacement destroys/aborts the previous handle first;
- destroy is idempotent;
- no owner dispatches or touches DOM after destroy;
- scope cleanup does not duplicate leaf ownership.

### Failure protocol

- partial sortable activation rolls back every already-acquired resource in reverse order;
- every known fallible DOM/browser/consumer boundary has a typed result;
- a missing required owner dispatches a typed failure or enters terminal panic; it never only stops the batch;
- dependent tails stop on synchronous failure;
- no sentinel currency;
- stale results are rejected before payload inspection or validation;
- reporting is acknowledged before recovery or retirement;
- finalization failure cause is selected by the machine;
- `onError` failure reaches platform reporting and still acknowledges the original failure.

### Spatial performance

- ordinary unchanged pointer frame does not rebuild all rectangles through the complete effect path;
- no-op placeholder placement does not dirty geometry;
- invalidation dirties exactly once until refresh;
- committed placeholder placement dirties geometry;
- collection version change forces refresh;
- release performs required fresh resolution;
- stale scheduled frames are inert.

### FIFO and callbacks

- callback-generated cancel/update arrives before success acknowledgement;
- synchronous resolver callbacks are not silently deferred;
- callback-triggered destroy stops the remaining batch;
- update does not mix old/new policy inside one decision;
- finalization callback is invoked after presentation release.

### Protocol inventory

- every event is consumed by at least one phase or intentionally documented as ingress-only;
- every effect is routed;
- every success acknowledgement advances or closes a real continuation;
- dead event/effect tags are removed.

---

## 11. Acceptance criteria

The task is complete when:

1. both FSMs remain the sole semantic authorities;
2. `draggable/effects.ts` and `sortable/effects.ts` are composition routers;
3. no root effect file directly owns lift, renderer, placeholder, rect index, frame, resolver, watch, or runner handles;
4. every mutable handle has one physical owner;
5. sortable activation is an all-or-nothing transaction with tested reverse-order rollback;
6. sortable visual, placeholder, and spatial ownership are separate;
7. a missing required owner dispatches a typed failure or enters terminal panic and cannot strand a waiting state;
8. known failures use typed complete-currency events;
9. stale async/replaceable results are rejected before payload inspection;
10. sortable initial and active motion render failures use a real presentation currency;
11. sortable render and placeholder failures cannot be silently ignored;
12. rectangle caching survives unchanged frames and no-op placements;
13. missing landing runner cannot report pin success;
14. reorder callback invocation ordering is explicit and tested;
15. callback policy is selected by the machine, not finalization executors;
16. finalization reporting is acknowledged before retirement;
17. draggable motion uses one captured coordinate-space policy;
18. dead success acknowledgements and events are removed;
19. one-use forwarding/throw helpers are inlined only when exhaustiveness is preserved;
20. unused parameters, `void` placeholders, and dead imports are removed;
21. authored machine code contains no unexplained protocol magic numbers;
22. retained helpers each encode reuse, ownership, narrowing, exhaustiveness, or a real invariant;
23. all existing behavior tests pass except explicitly documented corrections;
24. size and hot-path allocation deltas are recorded after every stage;
25. no cleanup step reintroduces a generic gesture base, transition-diff planner, or semantic runtime mirror.

---

## 12. Agent instruction summary

Preserve the FSM redesign.

First correct the current effect-protocol defects, including sortable partial-acquisition rollback and missing-owner continuation rules. Then split physical runtime ownership in both features. Keep feature roots as compile-time exhaustive routers. Inline trivial one-use helpers and remove generated scaffolding, but retain helpers or inline `never` checks that protect real state-machine invariants and exhaustiveness. Do not manually minify authored code, use magic numeric protocol values, push known failures outside the FSM, or use `STOP_BATCH` as a substitute for a continuation event or terminal panic.

The final source should make these questions answerable by opening one obvious module:

```text
Who decides this transition?
Who owns this browser handle?
Who reports this observation?
Who destroys this resource?
Why may the next command run?
```

Each question must have exactly one clear answer.
# Experiment 04c (design) — Share gesture mechanics through inheritance and lexical protected channels

**Plan reference:** Track B, item 4 — deduplicate the shared gesture/settlement mechanics.

**Status:** ❌ Implemented, measured, rejected on bytes (see [Result](#result--rejected)).

**Baseline:** current `main`, with two independent concrete gesture classes:

| bundle    | baseline Brotli |
| --------- | --------------: |
| draggable |         6,550 B |
| sortable  |         7,695 B |
| combined  |        12,634 B |

## Numbering

This is formally **experiment 04c**:

- **04a** — keep both concrete gesture classes and compose a nested `SettlementRunner`;
- **04b** — replace both concrete classes with one `Gesture` plus stateless singleton behaviors;
- **04c** — keep two stateful concrete classes, but move genuinely shared mechanics into an inherited base class.

04a was a valid measured rejection of nested composition. 04b exposed a flawed ownership assumption: the concrete draggable and sortable implementations require substantial private instance state, while the behavior design explicitly made the specialization stateless. The resulting implementation had to invent an opaque `FeatureState` bag and type-erased accessor plumbing. Its measured regression therefore does not answer whether inheritance can deduplicate the shared mechanics.

---

## Goal

Replace the duplicated shared mechanics in `FreeDragGesture` and `SortableGesture` with one base class while preserving the compact and natural ownership model of the existing concrete classes:

```text
Gesture
├── FreeDragGesture
└── SortableGesture
```

There must still be exactly one runtime object per gesture. A concrete instance contains both the base class private slots and its own concrete private slots.

```text
one SortableGesture instance
├── Gesture #private state
└── SortableGesture #private state
```

The experiment must not introduce a nested runner, a separate feature-state object, or a per-instance behavior/controller object.

---

## Core ownership rule

State belongs to the class whose mechanics require it.

### Base-owned state

The base owns only state shared by both gesture implementations:

- `GestureScope`;
- `VisualLiftSession | null`;
- `DragRenderer | null`;
- `LandingRunner | null`;
- pending presentation-ready watch disposer;
- the base's explicit dependencies (`realm` and typed `dispatch` only);
- resolved Child → Parent protected-call functions.

### `FreeDragGesture` state

The draggable child owns:

- its complete `FreeGestureDeps`;
- `DropResolutionEffect | null`;
- every other draggable-only mutable value discovered during migration.

### `SortableGesture` state

The sortable child owns:

- its complete `SortableGestureDeps`;
- placeholder lease;
- frame task;
- reorder resolution effect;
- origin rect;
- last pointer point and delta;
- packed rect index;
- current operation snapshot/reference;
- every other sortable-only mutable value discovered during migration.

Do not move child state into an opaque record held by the base. In particular, there must be no replacement for the rejected `#feature: FeatureState` design.

---

## Normative Parent ↔ Child relation pattern

`packages/drag/src/kernel/helpers.ts` already contains `createProtectedMethod`. Use the following code as the **reference model** for both directions of the relationship:

```ts
// oxlint-disable import/no-mutable-exports

import { createProtectedMethod } from './helpers.ts';

export let protectedP2C: (instance: Parent) => number;

export type ProtectedC2P = (instance: Parent) => string;
const [createCall, register] = createProtectedMethod<Parent, [], string>();

export class Parent {
  static {
    protectedP2C = (instance: Parent): number => instance.#parentField;
  }

  readonly #parentField = 10;
  readonly #call: (instance: Parent) => string;

  constructor() {
    this.#call = createCall(this);
  }

  call(): void {
    this.#call(this);
  }
}

export class Child extends Parent {
  static {
    register(Child, (instance) => instance.#childField);
  }

  readonly #childField = 'string';
}
```

This example is normative for the runtime shape, not merely illustrative.

### Parent → Child access

A child reaches selected base internals through direct mutable-export friend functions assigned inside the base class static block:

```ts
// oxlint-disable import/no-mutable-exports
export let gestureRenderer: (instance: Gesture<...>) => DragRenderer | null;

class Gesture<...> {
  static {
    gestureRenderer = (instance) => instance.#renderer;
  }
}
```

Important properties:

- export the mutable binding directly;
- assign it once from the lexical scope of the owning class;
- retain true runtime `#private` brand checks;
- expose only narrow capabilities actually required by children.

Never insert an internal binding plus an exported wrapper:

```ts
// Rejected.
let rendererOf_: (instance: AnyGesture) => DragRenderer | null;
export function gestureRenderer(instance: unknown): DragRenderer | null {
  return rendererOf_(instance as AnyGesture);
}
```

### Child → Parent calls

A base class reaches child-specific behavior through `createProtectedMethod`:

1. the child registers one implementation from its own lexical class scope;
2. the base resolves the implementation once in its constructor with `createCall(this)`;
3. the resolved singleton function is stored in a base `#private` field;
4. every later invocation calls that stored function and explicitly passes `this`;
5. no prototype-chain lookup occurs on the hot path;
6. no function is bound and no per-instance closure is created.

The only WeakMap/prototype lookup and the only variance cast belong inside `createProtectedMethod`.

For a large protected implementation, prefer registering a private static function directly when that produces cleaner output than an extra forwarding arrow:

```ts
class SortableGesture extends Gesture<...> {
  static #prepareLanding(
    instance: SortableGesture,
    state: SortableState,
  ): void {
    // Direct lexical access to instance.#placeholder, instance.#originRect, etc.
  }

  static {
    registerPrepareLanding(
      SortableGesture,
      SortableGesture.#prepareLanding,
    );
  }
}
```

A thin inline arrow, as in the normative example, is also valid. Measure rather than assuming which spelling minifies better.

---

## Required architecture

### Base class

The exact generic spelling may change to satisfy TypeScript and `isolatedDeclarations`, but the runtime ownership and call graph must remain equivalent to this:

```ts
abstract class Gesture<State, Event, Domain> {
  readonly #realm: DOMRealm;
  readonly #dispatch: (event: Event) => void;
  readonly #scope: GestureScope;

  #lift: VisualLiftSession | null = null;
  #renderer: DragRenderer | null = null;
  #landing: LandingRunner | null = null;
  #presentationWatchDisposer: Disposer | null = null;

  // Resolved once through createProtectedMethod(...).createCall(this).
  readonly #handleFeature: HandleFeatureCall<State, Event>;
  readonly #prepareLanding: PrepareLandingCall<State>;
  readonly #presentationOf: PresentationOfCall<Event>;
  readonly #reportFailure: ReportFailureCall<Domain>;
  readonly #landingTiming: LandingTimingCall;
  readonly #completeFeature: CompleteFeatureCall<Domain>;
  readonly #destroyFeature: DestroyFeatureCall;

  constructor(realm: DOMRealm, dispatch: (event: Event) => void) {
    this.#realm = realm;
    this.#dispatch = dispatch;

    this.#handleFeature = createHandleFeatureCall(this);
    this.#prepareLanding = createPrepareLandingCall(this);
    this.#presentationOf = createPresentationOfCall(this);
    this.#reportFailure = createReportFailureCall(this);
    this.#landingTiming = createLandingTimingCall(this);
    this.#completeFeature = createCompleteFeatureCall(this);
    this.#destroyFeature = createDestroyFeatureCall(this);

    this.#scope = createGestureScope((error) => {
      this.#reportFailure(
        this,
        error,
        { stage: FAILURE_PRESENTATION_LEASE },
        null,
      );
    });
  }

  get scope(): GestureScope {
    return this.#scope;
  }

  handle(from: State, to: State, event: Event): void {
    // Shared settlement path.
    // Shared settling -> idle completion path.
    // Shared pending -> idle disarm path.
    // Otherwise: this.#handleFeature(this, from, to, event).
  }

  destroy(): void {
    // Shared scope, presentation watch, and landing teardown.
    // Then this.#destroyFeature(this).
  }

  // Shared settlement, landing, presentation-watch, and completion methods.
}
```

The base must not store either complete feature dependency object. Its dependencies are explicit:

```ts
realm: DOMRealm

dispatch: (event: Event) => void
```

There must be no undeclared dependency recovered through casts such as:

```ts
(this.#deps as unknown as { dispatch(event: object): void }).dispatch(event);
```

### Concrete classes

The concrete classes remain real stateful classes:

```ts
export class FreeDragGesture extends Gesture<
  DraggableState,
  DraggableEvent,
  FreeDropResult
> {
  readonly #deps: FreeGestureDeps;
  #resolution: DropResolutionEffect | null = null;

  constructor(deps: FreeGestureDeps) {
    super(deps.realm, deps.dispatch);
    this.#deps = deps;
  }

  // Registered Child -> Parent implementations plus draggable-only helpers.
}
```

```ts
export class SortableGesture extends Gesture<
  SortableState,
  SortableEvent,
  ReorderTransactionResult
> {
  readonly #deps: SortableGestureDeps;

  #placeholder: PlaceholderLease | null = null;
  #frame: FrameTask<Point> | null = null;
  #resolution: ReorderResolutionEffect | null = null;
  #originRect: DOMRectReadOnly;
  #lastPoint: Point | null = null;
  #lastDelta: Point = ORIGIN;
  readonly #rectIndex = createRectIndex();
  #currentOperation: SortableState['operation'] = null;

  constructor(deps: SortableGestureDeps) {
    super(deps.realm, deps.dispatch);
    this.#deps = deps;
    this.#originRect = new deps.realm.window.DOMRectReadOnly();
  }

  // Registered Child -> Parent implementations plus sortable-only helpers.
}
```

The base constructor may resolve child registrations because the concrete class's static block has already run before any concrete instance can be constructed. The resolved child function must not be invoked from the base constructor before child fields initialize; storing it is safe, executing child logic there is not.

---

## Protected surface

Start with the smallest semantic protected surface that can express the existing code.

### Base capabilities exposed to children

Likely Parent → Child friends:

- read the current lift;
- read the current renderer;
- install/update lift and renderer together;
- possibly clear shared presentation state through a semantic operation.

Do not expose `realm` or `dispatch` through friends: each child already owns its typed full deps. Do not expose arbitrary raw setters when one semantic operation is sufficient.

### Child implementations called by the base

Likely Child → Parent protected methods:

- handle feature-specific non-settlement transitions;
- prepare the feature-specific landing plan;
- extract an optional presentation-ready handoff from the feature event;
- report a typed feature failure;
- resolve configured landing timing;
- clear feature resources and run completion callbacks;
- perform terminal feature-only teardown.

Do not combine these into an opaque mutable `FeatureState`. The child callback receives the actual concrete child instance and accesses its own `#private` fields lexically.

The first implementation should use method-level protected channels. Do not pre-emptively replace them with an opcode dispatcher, tuple vtable, or manually compressed protocol record. Those are separate representation experiments and would contaminate the result.

---

## Shared mechanics to move into the base

Move only mechanics that are genuinely shared between the two current classes:

- common `handle` branches for settlement, settlement completion, and pending cancellation;
- common settlement state interpretation;
- shared scope transition from interaction to settlement;
- presentation-ready barrier watching and disposal;
- landing runner creation, pinning, completion, failure dispatch, and destruction;
- common completion ordering and shared resource cleanup;
- common terminal `destroy()` mechanics.

Keep feature-specific fronts in their concrete classes:

- draggable acquisition, free geometry, movement callback, and drop resolution;
- sortable placeholder, rect-index, spatial insertion, proposal stabilization, and reorder resolution;
- feature-specific landing-plan preparation;
- feature-specific consumer callback domains and error reporting.

---

## `observe()`

Remove `SortableGesture.observe()` only if the concrete sortable protected handler can update `#currentOperation` directly from every committed transition before any asynchronous invalidation callback can observe it.

The replacement must remain concrete-instance state:

```ts
instance.#currentOperation = to.operation;
```

Do not move it to the base or an external feature record merely to remove `observe()`.

---

## Presentation-watch correctness fix

The current classes do not dispose a pending presentation-ready watch in `destroy()`. Preserve the correctness fix discovered during 04b, but measure it separately so it does not contaminate the inheritance delta:

1. apply the watch-disposal fix to current `main` without architectural changes;
2. run tests and record bundle sizes;
3. use that result as the baseline for 04c;
4. then implement inheritance.

Required teardown ordering:

```text
settle/disarm scope
→ dispose pending presentation watch
→ destroy landing runner
→ finish scope
→ concrete feature teardown
```

A late presentation promise after `destroy()` must not dispatch any event.

---

## Explicit non-goals and rejected shapes

The 04c spike must not introduce any of the following:

- `SettlementRunner` nested inside both concrete gestures;
- one replacement `Gesture` instance configured by behavior objects;
- `#feature: FeatureState` or any equivalent opaque state bag;
- module functions such as `featureOf(ctx).placeholder`;
- `AnyGesture`, `unknown` tunnels, or `object` dispatch;
- internal mutable binding plus exported wrapper functions;
- per-instance adapter objects;
- per-instance arrow callbacks capturing `this` or deps;
- a second runtime lifecycle owner;
- ordinary public/protected mutable fields used only to bypass `#private`;
- table-driven FSM or effect-bitmask changes;
- settlement event-tag promotion in the same measurement;
- unrelated reducer/session changes.

This experiment measures inheritance plus lexical protected channels, not a general cleanup branch.

---

## Type-system requirements

- `isolatedDeclarations` must pass.
- Child registration callbacks should infer the concrete child instance type where practical.
- Runtime casts for protected dispatch belong only inside `createProtectedMethod`.
- Do not repair generic friction by adding wrapper layers that accept and return `unknown`.
- Do not recreate the 04b pattern of erasing a concrete type and restoring it in every feature function.
- A narrow type-only compromise at the protected boundary is preferable to additional runtime functions or objects, but document it explicitly.

---

## Migration order

Implement in small, measurable steps:

1. Restore current `main`; remove all 04b files and protocol changes.
2. Apply and measure only the pending presentation-watch `destroy()` fix.
3. Confirm the existing `createProtectedMethod` helper passes lint, typecheck, and `isolatedDeclarations`; do not rewrite it as part of this spike.
4. Introduce `Gesture` with only shared private fields and Parent → Child friend functions.
5. Move draggable to `FreeDragGesture extends Gesture` first.
6. Run draggable tests and record all three bundle sizes.
7. Move sortable to `SortableGesture extends Gesture`.
8. Remove `observe()` only after the equivalent concrete-instance update is proven.
9. Run the full test suite, typecheck, lint/format checks, and final bundle measurement.
10. Inspect emitted/minified code before making any follow-up representation tweaks.

Do not perform multiple unmeasured redesigns between size snapshots.

---

## Required tests

Preserve the complete existing suite and add/retain focused regressions for:

- `destroy()` while a presentation-ready handoff is pending;
- late presentation resolution after destroy produces no dispatch;
- landing runner destroyed exactly once;
- interaction resources settle before completion callbacks;
- feature resources are cleared before `onFinish` / `onCancel`;
- synchronous callback re-entry observes already-cleaned resources;
- child registration exists before the first instance is constructed;
- missing registration fails deterministically;
- sortable invalidation reads the current operation after `observe()` removal;
- true `#private` brand checks remain intact across friend calls.

---

## Measurement and acceptance gate

Record exact Brotli bytes for:

Measured on the Rolldown size-limit preset. Two prerequisite snapshots were
taken (each a separate, isolated step) before the inheritance delta, per the
agreed sequence:

- **A** — current `main` plus the pending presentation-watch `destroy()` fix.
- **B** — A plus promoting the six settlement-lifecycle tags (`LANDING_STARTED`,
  `LANDING_FINISHED`, `LANDING_PINNED`, `SETTLEMENT_FAILED`,
  `SETTLEMENT_COMPLETED`, `PRESENTATION_SETTLED`) to `kernel/protocol.ts`.
  `LANDING_PLAN_READY` stayed feature-local. **No `GestureBase` yet.**
- **04c** — B plus the inherited `Gesture` base (both features migrated).

| bundle    | pure `main` | A (destroy fix) | B (tags promoted) | 04c   |
| --------- | ----------: | --------------: | ----------------: | ----: |
| draggable |        6.55 |            6.55 |              6.57 |  6.93 |
| sortable  |        7.70 |            7.71 |              7.71 |  8.11 |
| combined  |       12.63 |           12.64 |             12.69 | 13.01 |

Deltas (kB brotlied):

| bundle    | tag promotion (B − A) | inheritance (04c − B) | total (04c − A) |
| --------- | --------------------: | --------------------: | --------------: |
| draggable |                 +0.02 |            **+0.36**   |          +0.38  |
| sortable  |                 +0.00 |            **+0.40**   |          +0.40  |
| combined  |                 +0.05 |            **+0.32**   |          +0.37  |

Accept 04c only when all of the following hold:

1. all tests, typecheck, lint/format, and `isolatedDeclarations` pass;
2. the combined bundle has a clear measured reduction;
3. standalone bundles do not suffer a practically meaningful regression;
4. no type-erased accessor/wrapper architecture has appeared;
5. concrete feature state remains native `#private` state on each child instance;
6. source code is easier to reason about than the duplicated baseline;
7. the result does not depend on manually shortened property names, tuple state, or property mangling.

If the architecture is correct but the bytes lose, reject it honestly. Do not add manual minification tricks to rescue the experiment.

---

## Expected question answered by the spike

04c asks one narrow question:

> Can one inherited, truly stateful gesture base remove the duplicated settlement/lifecycle implementation while allowing each concrete gesture to keep its own native private instance state, and does that runtime shape beat the current two specialized classes after Brotli?

It does not ask whether inheritance is aesthetically preferable, whether the reducer should emit effect actions, or whether a general behavior/controller abstraction is possible.

---

## Result — ❌ rejected

**Status:** implemented in full, measured, rejected on bytes.

The architecture was built exactly as specified: one stateful `Gesture` base
owning the shared settlement/landing/presentation tail; two concrete children
keeping their own native `#private` state; Parent → Child behaviour resolved
once through `createProtectedMethod` singletons cached in `#private` fields;
Child → Parent lift/renderer access through mutable-export friends assigned in
the base static block. The narrow `SettlementLifecycleEvent` dispatch made every
base-emitted event a structural subset of each feature union, so **no runtime
cast appears at any dispatch site**. `isolatedDeclarations` passes, `tsc` passes,
and the full 292-test suite passes with both features on the base.

It still lost on every bundle. Against the acceptance gate:

1. tests / typecheck / `isolatedDeclarations` pass; one non-auto-fixable lint
   remains (`no-invalid-void-type` on the `void` generic argument of the channel
   `Call`/`Register` aliases — type-only, zero bundle impact);
2. **combined has no reduction — it *grew* +0.32 kB** → **fails**;
3. **both standalone bundles regress ~+0.36–0.40 kB (~5%)** → **fails**.

Gates 2 and 3 are decisive, so 04c is rejected.

### Why the bytes lost

The same mechanism that sank 04a (composition) and 04b (stateless behaviours):
on this toolchain (oxc/Rolldown minifier + Brotli) the two-copy settlement tail
is **already deduplicated by Brotli** — the second near-identical copy costs a
fraction of the first. Removing it via a shared base saves that fraction but adds
apparatus that is not deduplicable away:

- six `createProtectedMethod` channels, each a `WeakMap` plus a prototype-walk
  resolver;
- six resolved-call `#private` fields written in every constructor;
- twelve registration thunks (six per child) plus the generic base scaffolding;
- the friend accessors and the narrow-dispatch plumbing.

Notably 04c is **worse than 04a** (composition was +0.16 kB combined from an
un-promoted baseline; the inheritance apparatus here is heavier than 04a's
per-instance hook objects). The protected-channel machinery — chosen for its
single-prototype-lookup hot path — costs more static bytes than it saves.

The type-erasure friction the design anticipated was real but *not* the cause of
the loss: it was contained to one `this → BaseGesture` narrowing per calling
method and one `as`-narrow per registration thunk, with all feature logic keeping
concrete types. Even a hypothetically cast-free version would carry the same
channel/thunk apparatus and lose by a similar margin.

### Disposition

Consistent with 04a/04b: **revert.** The two prerequisite snapshots are also net
negative in isolation — the tag promotion (B) costs +0.05 kB combined with no
inheritance to amortise it, so it should be reverted together with the base. The
only piece worth keeping independently is the `destroy()` presentation-watch
disposal (snapshot A): it is a genuine correctness fix (a pending presentation
watch was not disposed on controller destroy) at ~+0.01 kB, unrelated to the
inheritance question.

Track B is now exhausted: representation-compression levers (01 tuples, 02
module-functions, 03 packed protocol) and mechanics-sharing levers (04a
composition, 04b behaviours, 04c inheritance) all regress on this toolchain,
because Brotli already captures the redundancy each was trying to remove.
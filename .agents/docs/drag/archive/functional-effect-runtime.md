# 07 — Functional effect runtime records

**Status:** design proposal; no production changes authorized  
**Repository snapshot:** `1ce3003d2340ea60baa3b8134639d820fd67173b`  
**Current measured size:** draggable 7,517 B, sortable 8,831 B, combined 14,609 B Brotli  
**Previous effect-redesign baseline:** 13.28 kB combined Brotli  
**Scope:** the physical effect runtimes in `packages/drag/src/draggable` and `packages/drag/src/sortable`

---

## 1. Decision

Represent each feature's physical effect state as exactly one explicit mutable record. Keep behavior in ordinary module-level functions, in the existing responsibility files, and pass the complete record directly to those functions. Use erased structural types to restrict which fields each module can name.

The target architecture is:

```text
FSM state       — immutable semantic data
machine         — pure decision functions
effects         — immutable semantic commands
effect runtime  — one mutable mechanical data record
effect handlers — module-level imperative functions
```

The word “functional” refers only to functions over explicit data. It does not imply immutable mechanical state, copying, currying, pipelines, combinators, or a functional-programming framework.

The full record is always passed:

```ts
resolveActiveInsertion(runtime, effect, deps, dispatch);
```

It is never projected at runtime:

```ts
// Forbidden: allocates a second representation.
resolveActiveInsertion(
  {
    operationId: runtime.operationId,
    placeholder: runtime.placeholder,
    rectIndex: runtime.rectIndex,
    frame: runtime.frame,
    latestSpatialRequest: runtime.latestSpatialRequest,
  },
  effect,
  deps,
  dispatch,
);
```

`Pick`, intersections, and explicit structural types are compile-time boundaries only. They emit no JavaScript and create no adapter, context, or sliced view.

This proposal changes physical representation only. The existing immutable FSM, effect protocol, state-before-effect commit, FIFO session, reporting and finalizing phases, and typed effect results remain authoritative.

## 2. Measurement baseline

The current Size Limit configuration measures draggable, sortable, and their combined graph independently in `packages/drag/.size-limit.json`.

| Measurement | Draggable | Sortable | Combined |
| --- | --: | --: | --: |
| Current | 7,517 B | 8,831 B | 14,609 B / 14.61 kB |
| Previous effect-redesign baseline | — | — | 13.28 kB |
| Current versus previous | — | — | +1.33 kB / about +10.0% |

The 13.28 kB number is a previous measured baseline, recorded in `drag-gesture-redesign-2.md`. The 1.33 kB difference must not be attributed entirely to owner objects: other behavior and correctness changes occurred between the measurements. The current 14.61 kB result is the baseline for this representation experiment.

Every implementation stage must record all three current Size Limit results, not only the combined result.

## 3. Diagnosis of the current representation

### 3.1 Objects created per feature

`createDraggableEffects()` constructs seven responsibility objects per controller:

1. `OperationInputOwner`
2. `DraggablePresentationOwner`
3. `FreeMotionObserver`
4. `DropResolutionOwner`
5. `PresentationBarrierOwner`
6. `FreeLandingOwner`
7. `DraggableCallbackOwner`

It then returns one required, immutable `{ execute, destroy }` `EffectRuntime` facade. The facade is the kernel integration capability, not another responsibility owner.

`createSortableEffects()` constructs nine responsibility objects per controller:

1. `OperationInputOwner`
2. `SortableVisualOwner`
3. `SortablePlaceholderOwner`
4. `SpatialInsertionOwner`
5. `SortableActivationCoordinator`
6. `PresentationBarrierOwner`
7. `ReorderResolutionOwner`
8. `SortableLandingOwner`
9. `SortableCallbackOwner`

It likewise returns one `EffectRuntime` facade.

The two features therefore create 16 architectural responsibility objects per pair of controllers, before an operation acquires any browser resource.

### 3.2 Persistent state and stateless factories

| Feature | Current factory | Persistent state in its closure |
| --- | --- | --- |
| draggable | `createOperationInputOwner` | operation ID, pointer ID, `OperationResources` |
| draggable | `createDraggablePresentationOwner` | lift, renderer |
| draggable | `createFreeMotionObserver` | bounds version, cached flag, cached bounds |
| draggable | `createDropResolutionOwner` | attempt wrapper, abort controller, completed bit |
| draggable | `createPresentationBarrierOwner` | readiness-watch disposer |
| draggable | `createFreeLandingOwner` | landing runner |
| draggable | `createDraggableCallbackOwner` | **none** |
| sortable | `createOperationInputOwner` | operation ID, pointer ID, `OperationResources` |
| sortable | `createSortableVisualOwner` | lift, renderer, origin rectangle |
| sortable | `createSortablePlaceholderOwner` | placeholder lease |
| sortable | `createSpatialInsertionOwner` | rectangle index, geometry adapter, latest request, frame task |
| sortable | `createSortableActivationCoordinator` | **none** |
| sortable | `createPresentationBarrierOwner` | readiness-watch disposer |
| sortable | `createReorderResolutionOwner` | abort controller, completed bit |
| sortable | `createSortableLandingOwner` | landing runner |
| sortable | `createSortableCallbackOwner` | **none** |

The draggable callback owner and sortable activation and callback objects encode source boundaries at runtime but own no persistent mutable value.

### 3.3 Method tables, closures, and forwarding

The seven draggable owner objects contain 34 method-table properties:

| Owner        | Method slots |
| ------------ | -----------: |
| operation    |           10 |
| presentation |            5 |
| motion       |            4 |
| resolution   |            3 |
| barrier      |            3 |
| landing      |            5 |
| callbacks    |            4 |

At source level, controller construction creates 36 function objects across the draggable owner factories and root wiring. That count excludes callbacks created only after an operation starts and treats aliases such as `destroy: stop` as one function.

The nine sortable responsibility objects contain 43 method-table properties:

| Owner/coordinator | Method slots |
| ----------------- | -----------: |
| operation         |           10 |
| visual            |            7 |
| placeholder       |            7 |
| spatial           |            5 |
| activation        |            1 |
| barrier           |            3 |
| resolution        |            3 |
| landing           |            4 |
| callbacks         |            3 |

The sortable effect layer creates roughly 51 source-level behavior, helper, and wiring functions at controller construction, excluding functions internal to genuine resources such as `FrameTask` and `OperationResources`. Exact engine allocation and optimized bundle output must be measured; these source counts are migration counters, not bundle-size promises.

Much of each table forwards to another object:

- operation `signal`, `resources`, `useInteraction`, `usePresentation`, `stopInteraction`, and `releasePresentation` expose `OperationResources`;
- visual `originRect`, `lift`, and `connected` expose fields already held in its closure;
- placeholder `element` and `rect` expose `PlaceholderLease`;
- every other owner calls `operation.current`;
- landing calls visual/presentation and placeholder getter ports;
- callbacks call presentation/visual/placeholder release ports;
- most `destroy` methods alias `stop`, `cancel`, `release`, or `retire`;
- root `stopSettlementOwners`, `stopMechanical`, and `resetOwners` closures fan out to method tables;
- cleanup closures are passed into other owners to call back into the root.

These calls do not add domain policy. They reify source architecture as objects, closure environments, and indirect calls.

### 3.4 Cross-owner ports and cyclic construction

Draggable has no mutually constructed owner pair, but its graph still has back-ports:

- root passes `() => !terminal` to operation;
- every responsibility receives the operation table as a currency/resource port;
- landing receives the presentation table;
- callbacks receive presentation plus root’s settlement-stop closure;
- root reset and destroy capture every owner.

Sortable additionally contains a concrete construction cycle:

```text
placeholder owner
  -> dirty closure
  -> not-yet-assigned spatial owner
  -> placeholder owner
```

`sortable/effects.ts` declares `let spatial!`, constructs placeholder with `() => spatial.invalidate()`, and then constructs spatial with placeholder. This is the reason for definite assignment and late dereferencing.

The spatial owner also creates a persistent `geometry` object with an element getter and rectangle forwarding method. It is an adapter over `PlaceholderLease`, not a resource.

### 3.5 JavaScript import cycles

There are currently no JavaScript strongly connected components under `packages/drag/src`. The responsibility files value-import kernel primitives, pure feature helpers, and machine tags. Cross-owner references are `import type` and erase.

The sortable cycle is therefore a constructed object-graph cycle, not a module cycle. No effect file must be merged to repair it.

`kernel/runtime.ts` separately uses the existing intentional late-bound dispatch wiring: effects are constructed with a forwarding closure before the session’s `dispatch` is assigned. That is generic session/effect integration, not a feature owner or a cycle in either mutable feature record. It remains unchanged in this representation-only proposal.

### 3.6 Genuine resources versus architectural objects

The following objects represent real capabilities, caches, or browser lifetimes and remain objects:

- `OperationResources`, including its abort signal and ordered scopes;
- `AbortController` for activation and consumer resolution;
- `FrameTask`;
- `VisualLiftSession`;
- `DragRenderer`;
- `PlaceholderLease`;
- `LandingRunner`;
- the readiness-watch disposer returned by `watchPresentationReady`;
- `RectIndex`, as packed mutable cache data;
- immutable `DOMRectReadOnly` snapshots.

The following are representation overhead and disappear:

- all feature owner and coordinator objects;
- their owner interfaces;
- `ResolutionAttempt` and its `completed()`/`complete()` method wrapper;
- sortable’s spatial `geometry` adapter;
- root-to-owner active, dirty, reset, and stop ports;
- field getter methods;
- duplicate `destroy` aliases.

The consumer callback’s `{ signal }` resolution context is a public protocol value and remains a small per-resolution object. It is not a runtime view.

## 4. Proposed `DraggableRuntime`

```ts
type DraggableRuntime = {
  terminal: boolean;

  operationId: number;
  pointerId: number;
  resources: OperationResources | null;

  lift: VisualLiftSession | null;
  renderer: DragRenderer | null;

  boundsVersion: number;
  boundsCached: boolean;
  boundsCache: DOMRectReadOnly | null;

  dropResolutionController: AbortController | null;
  dropResolutionCompleted: boolean;

  stopPresentationWatch: Disposer | null;
  landingRunner: LandingRunner | null;
};
```

The type is deliberately mutable. Mechanical state changes in place; no handler returns a cloned runtime.

### 4.1 Field ownership and lifetime

| Field | Meaning | Lifetime/reset |
| --- | --- | --- |
| `terminal` | irreversible effect-runtime closure | controller; set once before terminal teardown |
| `operationId` | current admitted mechanical currency | admitted operation; `0` while idle |
| `pointerId` | pointer input listener/capture currency | admitted operation; `0` while idle |
| `resources` | operation abort and ordered scopes | one admitted operation |
| `lift` | active authored-style/top-layer lease | activation through finalization/rollback |
| `renderer` | active transform writer | activation through settlement transfer/cleanup |
| `boundsVersion` | static bounds cache version | one operation |
| `boundsCached` | distinguishes cached `null` from unread | one operation |
| `boundsCache` | resolved static bounds rectangle | one operation |
| `dropResolutionController` | current consumer resolver cancellation | one resolution attempt |
| `dropResolutionCompleted` | prevents abort/double acceptance after settlement | one resolution attempt |
| `stopPresentationWatch` | current readiness timer/promise cancellation | one readiness wait |
| `landingRunner` | current landing animation resource | one landing attempt |

The resolution effect’s immutable `{ operationId, resolutionId }` remains captured by its promise continuations. It is not copied into the record. Controller identity, completion, abort state, current operation, and the FSM’s authoritative full resolution check together preserve currency.

### 4.2 Initialization

```ts
function createDraggableRuntime(): DraggableRuntime {
  return {
    terminal: false,
    operationId: 0,
    pointerId: 0,
    resources: null,
    lift: null,
    renderer: null,
    boundsVersion: -1,
    boundsCached: false,
    boundsCache: null,
    dropResolutionController: null,
    dropResolutionCompleted: false,
    stopPresentationWatch: null,
    landingRunner: null,
  };
}
```

Every field is present from construction. Handlers must not lazily add properties, because a stable object shape is important for the hot path.

### 4.3 Reset, retirement, and destroy

Beginning a new operation first performs unconditional idempotent cleanup of the previous one:

1. abort unresolved drop resolution;
2. stop presentation watch;
3. destroy landing runner;
4. reset all bounds fields;
5. release presentation and clear lift/renderer;
6. destroy and clear old `OperationResources`;
7. zero operation and pointer IDs;
8. install the new IDs and fresh `OperationResources`;
9. arm pointer input and dispatch its typed acknowledgement.

`DISARM_OPERATION` and `RETIRE_OPERATION` first require current operation currency. They then perform the same cleanup and zero the IDs. A stale retire returns `STOP_BATCH` without touching the record.

`STOP_INTERACTION` validates currency, stops the resolver, invokes `resources.stopInteraction()`, and dispatches `INTERACTION_STOPPED`. Presentation remains until the machine requests finalization.

Activation failure rolls back and clears every partially acquired mechanical field, destroys the operation resources, dispatches `ACTIVATION_FAILED`, and returns `STOP_BATCH`. IDs may remain until the FSM’s typed recovery retires the operation; no resource remains usable.

Finalization releases presentation and settlement resources before invoking the already-selected terminal callback synchronously. It then dispatches `FINALIZATION_COMPLETED` or `FINALIZATION_FAILED` while the operation is still current.

Terminal destroy is unconditional and idempotent:

1. return if already terminal;
2. set `terminal = true`;
3. stop all settlement resources;
4. reset bounds;
5. release presentation;
6. destroy operation resources;
7. clear all resource references and zero IDs.

Setting terminal first makes callbacks caused by resource teardown inert.

## 5. Proposed `SortableRuntime`

```ts
type SortableRuntime = {
  terminal: boolean;

  operationId: number;
  pointerId: number;
  resources: OperationResources | null;
  activationController: AbortController | null;

  lift: VisualLiftSession | null;
  renderer: DragRenderer | null;
  originRect: DOMRectReadOnly | null;
  placeholder: PlaceholderLease | null;

  rectIndex: RectIndex;
  frame: FrameTask<SortableRuntime>;
  latestSpatialRequest: SpatialRequest | null;

  reorderResolutionController: AbortController | null;
  reorderResolutionCompleted: boolean;

  stopPresentationWatch: Disposer | null;
  landingRunner: LandingRunner | null;
};
```

`activationController` makes a currently hidden persistent lifetime explicit. Today it survives successful activation only through an abort closure stored in the interaction scope. The controller is a real resource and belongs in the record even though `OperationResources` still coordinates its disposer.

`originRect` starts as `null`; allocating an empty `DOMRectReadOnly` at controller construction does not represent an acquired resource. A module-level `requireOriginRect()` performs the impossible-invariant check.

`frame` carries the same complete runtime record as its scheduled value. `latestSpatialRequest` carries the immutable work descriptor. Therefore `scheduleActiveInsertion()` can call:

```ts
runtime.latestSpatialRequest = effect.request;
runtime.frame.schedule(runtime);
```

This creates no wrapper per pointer move. The frame callback receives the actual runtime record and reads the latest request. It is created with dependencies and dispatch, not with a reference to a partially initialized runtime:

```ts
function createSortableRuntime(
  deps: SortableEffectDeps,
  dispatch: SortableDispatch,
): SortableRuntime {
  const runFrame = (runtime: SortableRuntime): void => {
    runScheduledInsertion(runtime, deps, dispatch);
  };

  return {
    terminal: false,
    operationId: 0,
    pointerId: 0,
    resources: null,
    activationController: null,
    lift: null,
    renderer: null,
    originRect: null,
    placeholder: null,
    rectIndex: createRectIndex(),
    frame: createFrameTask(deps.realm, runFrame),
    latestSpatialRequest: null,
    reorderResolutionController: null,
    reorderResolutionCompleted: false,
    stopPresentationWatch: null,
    landingRunner: null,
  };
}
```

The frame callback closes over only the stable dependencies and dispatch capability supplied to the effect factory. It does not close over a partially initialized runtime. The spelling must meet all three constraints:

1. no partially initialized runtime reference;
2. no runtime adapter allocation;
3. no per-frame handler/context allocation.

Stage 1 must settle this signature with a compile-only prototype before source migration.

### 5.1 Field ownership and lifetime

| Field | Meaning | Lifetime/reset |
| --- | --- | --- |
| `terminal` | irreversible runtime closure | controller |
| `operationId`, `pointerId` | current input/mechanical currency | admitted operation |
| `resources` | abort signal and ordered scopes | admitted operation |
| `activationController` | activation invalidation rollback/release | activated interaction |
| `lift`, `renderer` | active visual presentation resources | activation through finalization |
| `originRect` | activation geometry snapshot | activation through finalization |
| `placeholder` | owned placeholder DOM presence | activation through finalization |
| `rectIndex` | packed rectangle cache and reusable capacity | controller; content is operation-sensitive |
| `frame` | one coalesced rAF task | controller |
| `latestSpatialRequest` | replaceable spatial work identity | active/proposal spatial attempt |
| `reorderResolutionController` | consumer resolver cancellation | one resolution attempt |
| `reorderResolutionCompleted` | abort/double-accept guard | one resolution attempt |
| `stopPresentationWatch` | readiness wait cancellation | one readiness attempt |
| `landingRunner` | landing animation resource | one landing attempt |

### 5.2 Rectangle-cache rules

The packed buffer and capacity are reusable across operations, but cached content and element references are not blindly reusable.

- external invalidation, collection version change, a real placeholder move, placeholder acquisition/removal, and operation replacement mark the cache dirty;
- an unchanged committed insertion calls neither `placeBefore` nor cache invalidation;
- `returnHome()` invalidates only if the placeholder’s sibling position actually changes;
- proposal resolution performs the current required fresh-read path;
- operation retirement clears `items`, `count`, and version-specific content while retaining the numeric buffer/capacity for reuse;
- terminal destroy also drops the packed buffer so a retained destroyed controller does not retain unnecessary memory.

The hot-path invariant is normative:

> Repeated active insertion that leaves the placeholder in the same DOM position must perform no new full rectangle measurement.

### 5.3 Activation transaction

Sortable activation remains an all-or-nothing imperative transaction, now implemented as a module-level function over the record:

1. validate current operation;
2. acquire visual lift and renderer into their runtime fields and record their rollback;
3. create and insert placeholder into its runtime field and record its rollback;
4. acquire pointer capture when pointer-driven and retain its real disposer;
5. create the activation controller in its runtime field, arm invalidation, and retain its rollback;
6. derive initial insertion;
7. validate currency again;
8. register successful resources with the correct operation scopes;
9. dispatch `ACTIVATION_READY`.

On failure, release locally acquired resources in exact reverse order. Cleanup errors remain suppressed so they cannot replace the acquisition error. Clear every published field, dispatch `ACTIVATION_FAILED` if still current, and return `STOP_BATCH`.

The implementation may use local nullable resource variables for rollback. It must not recreate the current array of wrapper objects with `{ interaction, release }` method-table entries. Real disposer functions are allowed and necessary.

### 5.4 Reset, retirement, and destroy

Beginning replaces any prior operation:

1. stop resolver, frame work, readiness watch, and landing;
2. abort/clear activation controller;
3. release placeholder and visual resources;
4. clear origin and spatial request;
5. clear operation-specific rectangle-index references and mark dirty while retaining capacity;
6. destroy old operation resources;
7. zero IDs;
8. install new IDs/resources and arm the relevant input.

Stopping interaction destroys interaction resources and settlement resources but deliberately retains lift and placeholder for settlement/finalization.

Finalization stops settlement mechanics, releases the presentation scope, clears placeholder/visual/origin fields, invokes the supplied terminal callback synchronously, and dispatches the finalization acknowledgement while the operation is current.

Retirement performs complete idempotent cleanup, destroys resources, then zeros IDs.

Terminal destroy sets `terminal` first, cancels the frame and every replaceable resource, releases presentation, destroys operation resources, clears all DOM/resource references, empties the rectangle cache, and is silent and idempotent.

## 6. Compile-time runtime views

The runtime types and views should live in small data-only `draggable/effects/runtime.ts` and `sortable/effects/runtime.ts` modules. These files import resource types only. Handler modules use `import type`; no view exists in emitted JavaScript.

### 6.1 Draggable views

```ts
type DraggableCurrencyRuntime = Pick<
  DraggableRuntime,
  'terminal' | 'operationId'
>;

type DraggableOperationRuntime = Pick<
  DraggableRuntime,
  'terminal' | 'operationId' | 'pointerId' | 'resources'
>;

type DraggableActivationRuntime = DraggableCurrencyRuntime &
  Pick<DraggableRuntime, 'resources' | 'lift' | 'renderer'>;

type DraggablePresentationRuntime = DraggableActivationRuntime;

type DraggableMotionRuntime = DraggableCurrencyRuntime &
  Pick<DraggableRuntime, 'boundsVersion' | 'boundsCached' | 'boundsCache'>;

type DraggableResolutionRuntime = DraggableCurrencyRuntime &
  Pick<
    DraggableRuntime,
    'resources' | 'dropResolutionController' | 'dropResolutionCompleted'
  >;

type DraggableBarrierRuntime = DraggableCurrencyRuntime &
  Pick<DraggableRuntime, 'stopPresentationWatch'>;

type DraggableLandingRuntime = DraggableCurrencyRuntime &
  Pick<DraggableRuntime, 'lift' | 'landingRunner'>;

type DraggableCallbackRuntime = DraggableCurrencyRuntime;

type DraggableFinalizationRuntime = DraggableOperationRuntime &
  Pick<
    DraggableRuntime,
    | 'lift'
    | 'renderer'
    | 'dropResolutionController'
    | 'dropResolutionCompleted'
    | 'stopPresentationWatch'
    | 'landingRunner'
  >;
```

There is no draggable placeholder responsibility. No empty placeholder owner or placeholder view is introduced.

Responsibility mapping:

| Responsibility/module | View                           |
| --------------------- | ------------------------------ |
| operation             | `DraggableOperationRuntime`    |
| activation            | `DraggableActivationRuntime`   |
| presentation/visual   | `DraggablePresentationRuntime` |
| motion                | `DraggableMotionRuntime`       |
| placeholder           | not applicable                 |
| consumer resolution   | `DraggableResolutionRuntime`   |
| presentation barrier  | `DraggableBarrierRuntime`      |
| landing               | `DraggableLandingRuntime`      |
| callbacks/reporting   | `DraggableCallbackRuntime`     |
| finalization cleanup  | `DraggableFinalizationRuntime` |

### 6.2 Sortable views

```ts
type SortableCurrencyRuntime = Pick<
  SortableRuntime,
  'terminal' | 'operationId'
>;

type SortableOperationRuntime = Pick<
  SortableRuntime,
  'terminal' | 'operationId' | 'pointerId' | 'resources'
>;

type SortableActivationRuntime = SortableOperationRuntime &
  Pick<
    SortableRuntime,
    | 'activationController'
    | 'lift'
    | 'renderer'
    | 'originRect'
    | 'placeholder'
    | 'rectIndex'
  >;

type SortableVisualRuntime = SortableCurrencyRuntime &
  Pick<SortableRuntime, 'lift' | 'renderer' | 'originRect'>;

type SortablePlaceholderRuntime = SortableCurrencyRuntime &
  Pick<SortableRuntime, 'placeholder' | 'rectIndex'>;

type SortableSpatialRuntime = SortableCurrencyRuntime &
  Pick<
    SortableRuntime,
    'placeholder' | 'rectIndex' | 'frame' | 'latestSpatialRequest'
  >;

type SortableResolutionRuntime = SortableCurrencyRuntime &
  Pick<
    SortableRuntime,
    'resources' | 'reorderResolutionController' | 'reorderResolutionCompleted'
  >;

type SortableBarrierRuntime = SortableCurrencyRuntime &
  Pick<SortableRuntime, 'stopPresentationWatch'>;

type SortableLandingRuntime = SortableCurrencyRuntime &
  Pick<
    SortableRuntime,
    'lift' | 'originRect' | 'placeholder' | 'rectIndex' | 'landingRunner'
  >;

type SortableCallbackRuntime = SortableCurrencyRuntime;

type SortableFinalizationRuntime = SortableOperationRuntime &
  Pick<
    SortableRuntime,
    | 'activationController'
    | 'lift'
    | 'renderer'
    | 'originRect'
    | 'placeholder'
    | 'frame'
    | 'latestSpatialRequest'
    | 'reorderResolutionController'
    | 'reorderResolutionCompleted'
    | 'stopPresentationWatch'
    | 'landingRunner'
  >;
```

Responsibility mapping:

| Responsibility/module | View                          |
| --------------------- | ----------------------------- |
| operation             | `SortableOperationRuntime`    |
| activation            | `SortableActivationRuntime`   |
| presentation/visual   | `SortableVisualRuntime`       |
| spatial resolution    | `SortableSpatialRuntime`      |
| placeholder           | `SortablePlaceholderRuntime`  |
| consumer resolution   | `SortableResolutionRuntime`   |
| presentation barrier  | `SortableBarrierRuntime`      |
| landing               | `SortableLandingRuntime`      |
| callbacks/reporting   | `SortableCallbackRuntime`     |
| finalization cleanup  | `SortableFinalizationRuntime` |

Root lifecycle functions may accept the complete runtime because they intentionally coordinate all mechanical responsibilities. Leaf handlers use the narrowest view that expresses their actual field access.

Compile-only tests should prove that adding an unrelated field access to a leaf function fails typechecking. Runtime tests should prove that every leaf receives the same object identity.

## 7. Complete factory and method mapping

### 7.1 Draggable

| Current factory/method | Target |
| --- | --- |
| `createOperationInputOwner` | delete factory/interface; initialize operation fields in `createDraggableRuntime` |
| `operation.begin` | `beginPointerOperation(runtime, effect, deps, dispatch)` in `operation.ts` |
| `operation.current` | `isCurrentOperation(runtime, currency)` in `operation.ts` |
| `operation.signal` | `requireOperationResources(runtime).signal`; delete forwarding method |
| `operation.useInteraction` | direct `resources.interaction.use(...)` after required-resource check |
| `operation.usePresentation` | direct `resources.presentation.use(...)` after required-resource check |
| `operation.stop` | `stopInteraction(runtime, effect, dispatch)` plus root settlement cleanup |
| `operation.releasePresentation` | direct resource call inside `releaseDraggablePresentation` |
| `operation.failMechanical` | `rollbackDraggableActivation(runtime)` |
| `operation.retire` | `retireDraggableOperation(runtime, currency?)` |
| `operation.destroy` | delete alias; root terminal cleanup calls retirement primitives |
| `createDraggablePresentationOwner` | delete factory/interface |
| `presentation.acquire` | `acquireFreeActivation(runtime, effect, deps, dispatch)` in `presentation.ts` |
| `presentation.present` | `presentFreeMotion(runtime, effect, dispatch)` |
| `presentation.lift` | direct field through `requireLift(runtime)` where invariant checking is needed |
| `presentation.release` | `releaseDraggablePresentation(runtime)` |
| `presentation.destroy` | delete alias |
| `createFreeMotionObserver` | delete factory/interface |
| `motion.observe` | `observeFreeMotion(runtime, effect, deps, dispatch)` in `motion.ts` |
| `motion.controlled` | `observeControlledPosition(runtime, effect, deps, dispatch)` |
| `motion.release` | `resolveFreeRelease(runtime, effect, deps, dispatch)` |
| `motion.destroy` | `resetFreeMotion(runtime)` |
| factory-local `readBounds` | module-level `readBounds(runtime, source, version, refresh, realm)` |
| `createDropResolutionOwner` | delete factory/interface |
| `resolution.open` | `openDropResolution(runtime, effect, dispatch)` in `resolution.ts` |
| `resolution.stop` | `stopDropResolution(runtime)` |
| `resolution.destroy` | delete alias |
| `ResolutionAttempt` | delete wrapper; use flat controller/completed fields |
| `createPresentationBarrierOwner` | delete factory/interface |
| `barrier.watch` | `watchDraggablePresentation(runtime, effect, deps, dispatch)` in `barrier.ts` |
| `barrier.stop` | `stopDraggablePresentationWatch(runtime)` |
| `barrier.destroy` | delete alias |
| `createFreeLandingOwner` | delete factory/interface |
| `landing.prepare` | `prepareFreeLanding(runtime, effect, deps, dispatch)` in `landing.ts` |
| `landing.start` | `startFreeLanding(runtime, effect, deps, dispatch)` |
| `landing.pin` | `pinFreeLanding(runtime, effect, dispatch)` |
| `landing.stop` | `stopFreeLanding(runtime)` |
| `landing.destroy` | delete alias |
| `createDraggableCallbackOwner` | delete stateless factory/interface |
| `callbacks.start` | `invokeDraggableStart(runtime, effect, deps, dispatch)` in `callbacks.ts` |
| `callbacks.move` | `invokeDraggableMove(runtime, effect, deps, dispatch)` |
| `callbacks.report` | `reportDraggableFailure(runtime, effect, dispatch)` |
| `callbacks.finalize` | root mechanical cleanup, then `invokeDraggableFinalization(runtime, effect, dispatch)` |
| factory-local `geometry` | module-level `geometryOfRequest(request, realm)` or direct `geometryOf(...)` |
| root `stopSettlementOwners` | module-level root `stopDraggableSettlement(runtime)` |
| root `resetOwners` | module-level root `resetDraggableMechanical(runtime)` |

### 7.2 Sortable

| Current factory/method | Target |
| --- | --- |
| `createOperationInputOwner` | delete factory/interface; initialize operation fields in `createSortableRuntime` |
| `operation.begin` | `beginSortableOperation(runtime, effect, deps, dispatch)` in `operation.ts` |
| `operation.disarm` | root current check plus `retireSortableOperation(runtime)` |
| `operation.current` | `isCurrentOperation(runtime, currency)` |
| `operation.resources` | `requireOperationResources(runtime)`; delete getter |
| `operation.useInteraction` | direct `resources.interaction.use(...)`; delete forwarding method |
| `operation.stopInteraction` | `stopSortableInteractionResources(runtime)` |
| `operation.stop` | root-coordinated `stopSortableInteraction(runtime, effect, dispatch)` |
| `operation.releasePresentation` | direct resource call inside finalization cleanup |
| `operation.retire` | `retireSortableOperation(runtime, currency?)` |
| `operation.destroy` | delete alias |
| `createSortableActivationCoordinator` | delete stateless factory/interface |
| `activation.acquire` | `acquireSortableActivation(runtime, effect, deps, dispatch)` in `activation.ts` |
| `createSortableVisualOwner` | delete factory/interface |
| `visual.acquire` | `acquireSortableVisual(runtime, operation, realm)` in `visual.ts` |
| `visual.present` | `presentSortableMotion(runtime, effect, dispatch)` |
| `visual.originRect` | direct field through `requireOriginRect(runtime)` |
| `visual.lift` | direct field through `requireLift(runtime)` |
| `visual.connected` | direct `runtime.lift?.visual.isConnected` check |
| `visual.release` | `releaseSortableVisual(runtime)` |
| `visual.destroy` | delete alias |
| `createSortablePlaceholderOwner` | delete factory/interface |
| `placeholder.acquire` | `acquireSortablePlaceholder(runtime, operation, deps)` in `placeholder.ts` |
| `placeholder.element` | `requirePlaceholder(runtime).element`; delete getter |
| `placeholder.rect` | `requirePlaceholder(runtime).rect()`; delete getter |
| `placeholder.place` | `placeCommittedInsertion(runtime, effect, dispatch)` |
| `placeholder.returnHome` | `returnSortablePlaceholderHome(runtime)` |
| `placeholder.release` | `releaseSortablePlaceholder(runtime)` |
| `placeholder.destroy` | delete alias |
| `createSpatialInsertionOwner` | delete factory/interface |
| factory `index` | `runtime.rectIndex` |
| factory `frame` | `runtime.frame` |
| factory `latest` | `runtime.latestSpatialRequest` |
| factory `geometry` adapter | delete; use required `PlaceholderLease` directly |
| `spatial.schedule` | `scheduleActiveInsertion(runtime, effect, deps, dispatch)` in `spatial.ts` |
| `spatial.resolveProposal` | `resolveProposalInsertion(runtime, effect, deps, dispatch)` |
| `spatial.invalidate` | `invalidateSortableSpatial(runtime)` |
| `spatial.cancel` | `cancelSortableSpatial(runtime)` |
| `spatial.destroy` | delete duplicate |
| `createReorderResolutionOwner` | delete factory/interface |
| `resolution.open` | `openReorderResolution(runtime, effect, dispatch)` in `resolution.ts` |
| `resolution.stop` | `stopReorderResolution(runtime)` |
| `resolution.destroy` | delete alias |
| `createPresentationBarrierOwner` | delete factory/interface |
| `barrier.watch` | `watchSortablePresentation(runtime, effect, deps, dispatch)` in `barrier.ts` |
| `barrier.stop` | `stopSortablePresentationWatch(runtime)` |
| `barrier.destroy` | delete alias |
| `createSortableLandingOwner` | delete factory/interface |
| `landing.prepare` | `prepareSortableLanding(runtime, effect, deps, dispatch)` in `landing.ts` |
| `landing.start` | `startSortableLanding(runtime, effect, deps, dispatch)` |
| `landing.pin` | `pinSortableLanding(runtime, effect, dispatch)` |
| `landing.destroy` | `stopSortableLanding(runtime)`; delete owner method |
| `createSortableCallbackOwner` | delete stateless factory/interface |
| `callbacks.start` | `invokeSortableStart(runtime, effect, dispatch)` in `callbacks.ts` |
| `callbacks.report` | `reportSortableFailure(runtime, effect, dispatch)` |
| `callbacks.finalize` | root mechanical cleanup, then `invokeSortableFinalization(runtime, effect, dispatch)` |
| root `stopSettlementOwners` | module-level root `stopSortableSettlement(runtime)` |
| root `stopMechanical` | module-level root `stopSortableMechanical(runtime)` |
| root `resetOwners` | module-level root `resetSortableMechanical(runtime)` |
| placeholder dirty callback | delete; placeholder directly mutates `runtime.rectIndex` |
| extracted `operation.current` port | delete; spatial calls module-level currency guard |

No owner factory survives solely for test mocking. Tests should construct a runtime record with explicit fake genuine resources and invoke the module-level function under test.

## 8. Root effect runtime

The feature root creates one record and retains one small immutable integration facade. It does not construct an owner graph or handler map.

Illustrative sortable shape:

```ts
export function createSortableEffects(
  deps: SortableEffectDeps,
  dispatch: SortableDispatch,
): EffectRuntime<SortableEffect> {
  const runtime = createSortableRuntime(deps, dispatch);

  return {
    execute(effect) {
      if (runtime.terminal) {
        return STOP_BATCH;
      }

      switch (effect.type) {
        case BEGIN_POINTER_OPERATION:
        case BEGIN_KEYBOARD_OPERATION:
          resetSortableMechanical(runtime);
          return beginSortableOperation(runtime, effect, deps, dispatch);

        case ACQUIRE_SORTABLE_ACTIVATION:
          return acquireSortableActivation(runtime, effect, deps, dispatch);

        case PRESENT_MOTION:
          return presentSortableMotion(runtime, effect, dispatch);

        case RESOLVE_ACTIVE_INSERTION:
          return scheduleActiveInsertion(runtime, effect, deps, dispatch);

        case PLACE_COMMITTED_INSERTION:
          return placeCommittedInsertion(runtime, effect, dispatch);

        // Every remaining existing effect tag stays explicit.

        default: {
          const unexpected: never = effect;
          throw new Error(
            `drag: unknown sortable effect ${
              (unexpected as { type?: unknown }).type as string
            }`,
          );
        }
      }
    },

    destroy() {
      destroySortableRuntime(runtime);
    },
  };
}
```

The actual switch must retain every current case. A handler map is forbidden: it adds an object/table, weakens local exhaustiveness, and can inhibit tree-shaking and inlining.

### 8.1 Integration boundary

Keep the current `EffectRuntime<Effect>` and `createControllerRuntime` contracts. The effect factory receives one stable dispatch capability, and the two facade methods close over `runtime`, dependencies, and dispatch.

The generic controller’s pre-existing dispatch forwarder is outside the feature record and does not require partial construction of any feature field. Changing the session/executor signature is not required to flatten owners and would broaden this experiment unnecessarily.

Within each feature effect factory:

- no `let owner!` or late-assigned resource field is allowed;
- the complete runtime record is returned from one synchronous initializer;
- callbacks may close over the already constructed record only when an external resource genuinely invokes them later;
- the record never stores dispatch or dependencies;
- no leaf receives a generic context object.

### 8.2 Batch, failure, panic, and destroy rules

- Every handler returns `CONTINUE_BATCH` or `STOP_BATCH` directly.
- A stale effect returns `STOP_BATCH` when the rest of its batch belongs to the same obsolete decision.
- A known recoverable execution error dispatches its existing fully tagged typed failure before returning `STOP_BATCH`.
- A branch must never silently return `STOP_BATCH` while the committed machine state waits for an acknowledgement.
- Existing protocol classifications are preserved during flattening. This stage does not reclassify a typed renderer, placeholder, landing, or callback failure as panic merely because a required field is missing.
- Unknown effects and internal exceptions outside an existing typed failure boundary throw into the session panic path.
- Panic closes the session, destroys the one feature record once, then reports the fatal error.
- `destroy()` closes session ingress first, marks the effect record terminal, and stops the current effect batch tail.

The root facade owns no independent mutable state. Its two closures are the minimum kernel integration capability.

## 9. Dependency and import plan

Keep the current responsibility files:

```text
draggable/effects/
  runtime.ts
  operation.ts
  presentation.ts
  motion.ts
  resolution.ts
  barrier.ts
  landing.ts
  callbacks.ts

sortable/effects/
  runtime.ts
  operation.ts
  activation.ts
  visual.ts
  placeholder.ts
  spatial.ts
  resolution.ts
  barrier.ts
  landing.ts
  callbacks.ts
```

The only additions are the two data-only runtime modules. No existing responsibility file is merged.

Root files value-import handler functions. Leaf files type-import their runtime views. Useful acyclic value imports are allowed:

- activation may call visual, placeholder, spatial, and operation functions;
- spatial may call placeholder’s required-resource helper;
- landing may call visual and placeholder helpers;
- callbacks may call operation currency helpers.

Reverse edges are not allowed. In particular:

- placeholder never imports spatial through a callback port; it directly marks the rectangle index field;
- no leaf value-imports the root router;
- callbacks do not import root cleanup functions; root performs mechanical finalization before invoking the callback handler;
- runtime modules import no handler value.

Type-only root/leaf references are erased and are not JavaScript cycles. Before implementation, rerun the compiler-AST import-cycle check. Move code only if a real value cycle is introduced; do not merge files to reduce count.

## 10. Correctness preservation

### 10.1 Activation rollback

Sortable rollback remains reverse-order, best-effort, and preserves the original acquisition error. Draggable activation still destroys partial mechanics before dispatching failure. Tests must fail every acquisition step, including consumer placeholder creation, insertion after partial DOM mutation, pointer capture, invalidation arm, and synchronous destroy during a consumer factory.

### 10.2 Full currency

`isCurrentOperation()` checks:

```text
not terminal
and operationId is nonzero
and operationId equals effect.operationId
```

Replaceable work adds its complete mechanical identity:

- resolution: owned controller identity, incomplete, unaborted, current operation; dispatch full operation/resolution IDs;
- spatial: current operation and exact latest request operation/collection-version/spatial IDs before and after observation;
- presentation watch: current owned watch plus full operation/resolution currency;
- landing: current owned runner plus full operation/landing currency.

The FSM repeats the authoritative complete match before accepting the typed event. Payload validation occurs only after stale work is rejected.

Do not add semantic motion, resolution, landing, or transaction state mirrors to the runtime record.

### 10.3 Typed recoverable failure

Every existing recoverable boundary remains:

- input arming;
- activation;
- motion/controlled/release observation;
- renderer writes;
- placeholder writes;
- active/proposal spatial observation;
- consumer resolution;
- presentation readiness;
- landing plan, timing, creation, interruption, and pin;
- public start/move/finalization callbacks.

The handler dispatches exactly one typed continuation when still current and returns the existing disposition. `STOP_BATCH` truncates only the current effect array; the queued failure event must still reduce.

### 10.4 Terminal panic

Unknown effect tags remain compile-time exhaustive and throw at runtime. Unexpected internal errors not covered by a typed boundary close the session, clear queued events, destroy the runtime once, and report fatal once.

Flattening must not add broad `try/catch` around the root switch, because that would convert impossible invariants into unrelated typed failures.

### 10.5 Reporting and finalization acknowledgements

`REPORT_FAILURE` remains an acknowledged synchronous effect. `FAILURE_REPORTED` is dispatched only after `reportError_` and the supplied `onError` capability return and the operation remains current.

`FINALIZE_OPERATION` still:

1. restores visual ownership and stops settlement;
2. invokes the already-selected callback synchronously;
3. dispatches `FINALIZATION_COMPLETED` or `FINALIZATION_FAILED`;
4. lets the FSM decide reporting and eventual retirement.

No owner flattening may combine report and retire in one unacknowledged batch.

### 10.6 Placeholder no-op and rectangle cache

The current no-op predicate is preserved:

```text
reference is the placeholder itself
or placeholder.nextSibling is the reference
```

In that case, do not call `placeBefore` and do not dirty `rectIndex`. Real placement and a real return-home move dirty it exactly once.

### 10.7 Synchronous callbacks and FIFO ordering

The initial draggable drop and sortable reorder callbacks remain synchronous. Only `Promise.resolve(returnedValue)` settlement is microtasked. Start, move, timing, error-reporting, and finalization callbacks also remain synchronous.

A synchronous callback may enqueue cancel or destroy. While a session batch is running, ordinary cancel dispatch is queued rather than re-entered. The operation can therefore still appear current immediately after the callback. Correctness depends on preserving this exact order:

```text
consumer callback
-> callback-generated event enqueued
-> success/result acknowledgement enqueued
-> current effect batch finishes or stops
-> queued events reduce FIFO
```

Do not replace it with immediate nested reduction, an artificial microtask before callback invocation, or a direct state read.

### 10.8 Idempotent cleanup and replacement

Every stop/release function:

- may be called repeatedly;
- disposes the current resource at most once;
- clears its field after disposal;
- makes late browser/promise callbacks inert by resource identity and currency;
- replaces an old watch, resolver, frame request, or runner before installing the new one;
- does not abort an already completed consumer resolution.

Resource scopes retain their current drain-first, reverse-order, best-effort semantics.

## 11. Runtime and bundle-cost analysis

### 11.1 Construction work removed

Expected removals per controller:

| Feature | Responsibility objects removed | Owner method slots removed | Construction functions targeted |
| --- | --: | --: | --: |
| draggable | 7 | 34 | most of the current 36 layer/root functions |
| sortable | 9 | 43 | most of roughly 51 layer/root wiring functions |
| combined pair | 16 | 77 | measured, not summed as a bundle prediction |

Also removed:

- seven or nine captured owner environments;
- current/required/field getter functions;
- duplicate destroy aliases;
- root stop/reset forwarding closures;
- sortable geometry adapter object/getter;
- sortable placeholder/spatial back-port and `let spatial!`;
- draggable `ResolutionAttempt` object and its two-method boolean wrapper;
- owner mocks in tests.

The one mutable record replaces the scattered closure cells. The root switch calls imported functions directly, removing one owner property lookup and call for most effects.

### 11.2 Necessary objects and closures

The following allocation remains justified:

- the single mutable feature record;
- the immutable two-method `EffectRuntime` facade;
- genuine resource objects listed in section 3.6;
- pointer/document listener callbacks;
- operation resource error reporter;
- invalidation callback;
- lift coordinate projection and resource disposers;
- the one sortable frame callback;
- promise fulfillment/rejection callbacks carrying immutable currency;
- resolution abort disposer and public `{ signal }` context;
- presentation readiness settlement callback;
- landing finished/interrupted callbacks;
- callback error-context adaptation where the public API requires it.

These callbacks exist because an external resource invokes work later. They do not represent architectural responsibilities.

### 11.3 Likely bundle wins

Likely wins come from:

- deleting factory and owner-interface implementation code;
- fewer object literals and property names;
- fewer closure environments;
- fewer forwarding calls and aliases;
- better direct-call inlining;
- removal of cyclic construction scaffolding;
- smaller owner-mocking tests, though tests do not affect production bundles.

Brotli may already compress repeated owner vocabulary well, so source deletion does not translate byte-for-byte to compressed output.

### 11.4 Possible regressions

Measure these risks:

- repeated `runtime`, `deps`, and `dispatch` arguments may cost bytes;
- direct record property loads can replace cheap closure-cell loads;
- exported module-level functions may be inlined differently;
- repeated null/invariant checks may duplicate after flattening;
- a recursively typed frame payload may require an undesirable emitted helper if implemented carelessly;
- clearing a large record incorrectly could add cold-path code;
- lazily adding fields could destabilize the runtime’s object shape;
- accidental context/view creation would erase allocation wins.

Do not introduce a generic helper merely to reduce repeated spelling before measuring both feature-local implementations.

### 11.5 Deterministic tests and counters

Existing deterministic coverage to retain includes:

- session state-before-effects, FIFO nesting, `STOP_BATCH`, close, and panic;
- controller destroy-once and panic teardown ordering;
- synchronous resolver invocation and deferred normalized result;
- stale draggable resolution payload rejected before inspection;
- sortable activation rollback and synchronous destroy during acquisition;
- unchanged insertion rectangle reuse;
- cleanup before terminal callback and exactly one terminal callback;
- resolution abort/completion behavior;
- frame latest-only, coalescing, flush, cancel, and idempotence;
- operation resource order and idempotence.

Add:

1. root routing tests covering every effect tag and the exhaustive panic path;
2. terminal runtime tests proving every later effect returns `STOP_BATCH`;
3. direct handler replacement tests for resolver, frame, watch, and runner;
4. sortable stale proxy tests proving payloads are not inspected before full currency acceptance;
5. direct no-op placeholder tests proving neither DOM write nor invalidation;
6. consecutive-operation cache tests proving stale elements are not retained and the packed capacity remains reusable;
7. handler tests proving each recoverable throw emits one typed failure and the correct disposition;
8. compile-only view tests preventing cross-responsibility field access;
9. runtime identity tests proving every handler receives the exact same record;
10. construction counters proving one record, one sortable index/frame, zero owners/views/contexts, and no `OperationResources` before admission;
11. hot-path counters for rAF schedules, rectangle reads, renderer writes, and genuine resource factory calls;
12. repeated stop/finalize/retire/destroy counters proving exactly-once release.

Use spies and explicit factory/read/write counters for deterministic tests. Heap snapshots and GC timing are useful benchmark evidence but are not stable unit-test assertions. There is currently no allocation benchmark harness in `packages/drag`; add a focused benchmark only during implementation.

## 12. Staged implementation plan

### Stage 1 — Prove the data model

- Add compile-only prototypes of both records and all views.
- Settle the sortable `FrameTask` payload without partially initialized references or wrappers.
- Verify zero JavaScript import cycles.
- Add compile-only field-access and same-runtime-identity tests.
- Make no handler behavior change in this stage.

Review gate: approve exact fields, null sentinels, view boundaries, frame signature, and lifecycle order.

### Stage 2 — Flatten draggable first

Draggable is the smaller vertical slice and has no current owner-construction cycle.

- Create one `DraggableRuntime`.
- Convert each existing responsibility file from factory/object to module-level functions.
- Route the existing exhaustive switch directly.
- Preserve all current effect tags and dispositions.
- Keep temporary compatibility factories only if required to migrate tests; the production root must not invoke them.

Run the full draggable, kernel, and package suites.

### Stage 3 — Measure the first slice

Record:

- draggable standalone Brotli;
- sortable standalone Brotli;
- combined Brotli;
- controller-construction counters;
- admitted-operation resource counters;
- pointer-move layout, frame, renderer, and callback counters.

Compare against 7,517 B / 8,831 B / 14,609 B, not only 13.28 kB. Reject any runtime adapter or handler-map regression before continuing.

### Stage 4 — Validate behavior and allocation

- Run all deterministic tests in section 11.5.
- Add repeated-operation and re-entrant callback stress tests.
- Confirm panic and terminal destroy release the record once.
- Confirm no view/context allocation exists in built output.
- Inspect minified output for failed inlining or repeated guards.

### Stage 5 — Flatten sortable

- Introduce one `SortableRuntime`.
- Replace placeholder/spatial cyclic construction with direct record access.
- Preserve the activation rollback transaction.
- Preserve frame coalescing and full spatial currency.
- Preserve no-op placeholder cache reuse.
- Clear stale rectangle element references at operation retirement while retaining capacity.
- Route every effect directly through the exhaustive switch.

Repeat standalone/combined size and deterministic counters immediately.

### Stage 6 — Remove obsolete representation

- Migrate remaining owner-based unit tests to record/function tests.
- Delete every owner/coordinator interface and factory.
- Delete forwarding ports, compatibility wrappers, `ResolutionAttempt`, and spatial geometry adapter.
- Remove dead imports and aliases.
- Re-run import-cycle analysis.
- Format, lint-fix, typecheck, test, and size the package.

### Stage 7 — Evaluate sharing only after both features stabilize

Compare emitted code and behavior for truly identical module-level functions. Consider sharing only when:

- failure tags and currency rules are identical;
- cleanup order and resource lifetime are identical;
- the shared function is smaller in draggable, sortable, and combined output;
- it introduces no generic context, behavior registry, or runtime adapter.

Do not share merely because two old owners had similarly named methods.

## 13. Explicit non-goals

- No change to the immutable FSM architecture.
- No transition-diff planner.
- No semantic state mirror in the effect runtime.
- No classes or inheritance.
- No behavior registry or vtable.
- No generic feature context.
- No immutable cloning of mechanical runtime state.
- No handler map.
- No currying, pipeline, higher-order handler combinator, or functional framework.
- No sliced runtime object, adapter object, or destructured runtime view.
- No file-count reduction objective.
- No merging responsibility files merely to reduce imports.
- No generic shared abstraction before two concrete flattened features exist and measure smaller.
- No callback timing or FIFO policy change.
- No effect tag, typed failure, reporting acknowledgement, or finalization acknowledgement redesign.
- No production edits during this design stage.

## 14. Authorization gate

Before production work begins, review and approve:

1. the exact record fields and null sentinels;
2. the sortable frame payload spelling;
3. activation commit/rollback order;
4. rectangle-cache reset versus capacity-retention rules;
5. finalization cleanup order;
6. the draggable-first migration order;
7. the deterministic counters and size acceptance criteria.

Until that review is complete, this document is the only intended change.

## 15. Inspection index

The proposal was derived from these current implementation points:

| Subject | Current source |
| --- | --- |
| draggable root construction/router/destroy | `packages/drag/src/draggable/effects.ts:38-171` |
| draggable operation fields and resource ports | `packages/drag/src/draggable/effects/operation.ts:34-187` |
| draggable presentation fields and activation rollback | `packages/drag/src/draggable/effects/presentation.ts:46-153` |
| draggable bounds cache | `packages/drag/src/draggable/effects/motion.ts:27-193` |
| draggable resolution attempt wrapper | `packages/drag/src/draggable/effects/resolution.ts:17-165` |
| draggable readiness disposer | `packages/drag/src/draggable/effects/barrier.ts:14-60` |
| draggable landing runner | `packages/drag/src/draggable/effects/landing.ts:35-212` |
| stateless draggable callback owner | `packages/drag/src/draggable/effects/callbacks.ts:28-156` |
| sortable root construction/cycle/router/destroy | `packages/drag/src/sortable/effects.ts:69-203` |
| sortable operation fields and resource ports | `packages/drag/src/sortable/effects/operation.ts:33-194` |
| stateless sortable activation coordinator | `packages/drag/src/sortable/effects/activation.ts:20-108` |
| sortable visual fields/getters | `packages/drag/src/sortable/effects/visual.ts:23-108` |
| placeholder lease and no-op placement | `packages/drag/src/sortable/effects/placeholder.ts:23-134` |
| spatial index/adapter/frame/latest request | `packages/drag/src/sortable/effects/spatial.ts:26-156` |
| sortable resolver fields | `packages/drag/src/sortable/effects/resolution.ts:29-141` |
| sortable readiness disposer | `packages/drag/src/sortable/effects/barrier.ts:15-57` |
| sortable landing runner | `packages/drag/src/sortable/effects/landing.ts:35-193` |
| stateless sortable callback owner | `packages/drag/src/sortable/effects/callbacks.ts:22-113` |
| operation resource lifetime | `packages/drag/src/kernel/operation-resources.ts:3-51` |
| scope order/idempotence | `packages/drag/src/kernel/resource-scope.ts:22-66` |
| frame task mechanics | `packages/drag/src/kernel/invalidation.ts:43-101` |
| presentation readiness mechanics | `packages/drag/src/kernel/presentation-ready.ts:30-85` |
| landing runner mechanics | `packages/drag/src/kernel/animation.ts:14-82` |
| FIFO, `STOP_BATCH`, close, and panic | `packages/drag/src/kernel/session.ts:25-131` |
| controller dispatch wiring and teardown | `packages/drag/src/kernel/runtime.ts:9-72` |

Existing behavioral evidence referenced by the migration plan:

| Invariant | Current test |
| --- | --- |
| session commit/FIFO/stop/close/panic | `packages/drag/tests/kernel/session.node.test.ts:40-230` |
| controller teardown and panic order | `packages/drag/tests/kernel/runtime.node.test.ts:28-93` |
| operation resource order/idempotence | `packages/drag/tests/kernel/operation-resources.node.test.ts:4-95` |
| frame coalescing/flush/cancel | `packages/drag/tests/kernel/invalidation.node.test.ts:47-131` |
| synchronous/stale draggable resolution | `packages/drag/tests/draggable/effects.node.test.ts:55-130` |
| draggable resolution cancellation and re-entry | `packages/drag/tests/draggable.browser.test.ts:1082-1204,1311-1445` |
| synchronous sortable resolution | `packages/drag/tests/sortable/resolution.node.test.ts:49-81` |
| sortable activation rollback | `packages/drag/tests/sortable.browser.test.ts:87-170` |
| unchanged insertion rectangle reuse | `packages/drag/tests/sortable.browser.test.ts:172-207` |
| sortable cleanup/callback exclusivity | `packages/drag/tests/sortable.browser.test.ts:780-848` |

The three size entries are defined in `packages/drag/.size-limit.json:1-13`; `packages/drag/Justfile:52-54` builds before measuring.
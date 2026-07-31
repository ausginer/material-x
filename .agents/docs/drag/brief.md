# `@ydinjs/drag2`: compositional vertical-sortable architectural probe

## Mission

Create a new, independent `packages/drag2` package and implement one complete, production-shaped **vertical sortable** interaction.

This is not merely a rewrite of the existing sortable implementation. Its primary purpose is to derive and validate a new compositional architecture built around:

```ts
const controller = draggable(
  sortable(
    vertical(),
    placeholder(/* ... */),
    callbacks({
      onReorder,
      // ...
    }),
  ),
);
```

The exact syntax is provisional. Preserve the architectural intent rather than treating this snippet as a fixed API specification.

The implementation must establish a useful division between:

- a reusable drag kernel;
- behavior-specific semantics;
- fine-grained behavior features;
- one authoritative runtime;
- consumer-owned persistent state.

The resulting vertical sortable must also be genuinely usable. Do not produce a reduced interaction demo that omits the difficult lifecycle, asynchronous rendering, animation, cancellation, or cleanup semantics.

---

## Existing implementation

The current implementation lives in:

```text
packages/drag
```

Its architecture and invariants are documented in:

```text
packages/drag/DESIGN.md
```

Treat the existing package as:

- a behavioral reference;
- a source of previously discovered edge cases;
- a correctness oracle;
- a source of test scenarios;
- a working implementation that must remain available during the experiment.

Do not modify `packages/drag`.

Do not make `packages/drag2` depend on `packages/drag` at runtime. Reuse ideas and semantics, but do not build the new architecture as an adapter around the old package.

There is no need to prepare publishing, CI integration, migration, compatibility aliases, or a permanent package name. `drag2` is a pre-alpha architectural laboratory.

---

## Architectural hypothesis

The experiment should start from the following model:

```text
draggable()
  creates and owns a kernel instance

kernel
  owns the common drag lifecycle and execution guarantees

behavior
  supplies domain-specific semantics to the kernel

features
  assemble one concrete behavior
```

Conceptually:

```ts
type DraggableBehavior<Controller> = (kernel: Kernel) => Controller;

function draggable<Controller>(
  behavior: DraggableBehavior<Controller>,
): Controller {
  const kernel = createKernel();

  return behavior(kernel);
}
```

A built-in behavior should be expressible as:

```ts
function sortable(
  ...features: readonly SortableFeature[]
): DraggableBehavior<SortableController>;
```

A user should eventually be able to write a custom behavior without having to recreate:

- the state machine;
- run-to-completion dispatch;
- reentrancy handling;
- cancellation precedence;
- async attempt identity;
- operation lifetimes;
- transactional state publication;
- terminal teardown.

The kernel should therefore be a genuine execution foundation, not merely a directory of unrelated helper functions.

However, the kernel must not know sortable-specific concepts such as:

- vertical geometry;
- placeholder insertion;
- item collections;
- reorder proposals;
- layout animation.

Those belong to the sortable behavior and its features.

---

## Do not over-design the final architecture

This first iteration must derive the minimum useful contracts from one real behavior.

Do not design a universal interaction framework in advance.

In particular, do not add abstractions solely for possible future support of:

- free dragging;
- horizontal sortable;
- two-dimensional sortable;
- sortable grids;
- transform-aware `box-quad` geometry;
- arbitrary third-party behaviors;
- dynamic plugin discovery.

The architecture should leave room for future extension, but the vertical sortable implementation must be the source of truth for the first kernel contract.

Document any place where a future free-drag behavior would likely challenge the resulting design, but do not solve that problem speculatively.

---

## Required visible behavior

### Activation

The consumer presses a sortable item.

Before activation:

- pointer input is admitted only for a currently valid item;
- an optional handle policy may restrict the valid press target;
- movement below the activation threshold must not begin a drag;
- cancellation or destruction during pending activation must leave no resources behind.

When activation succeeds:

- the dragged visual is lifted from normal layout participation;
- a placeholder is inserted;
- the placeholder becomes the dragged item’s authoritative layout footprint;
- the transition to lifted presentation must not cause a visible jump;
- pointer ownership must not be lost during the operation.

The exact presentation technique is open to design.

---

### Pointer movement

While active:

- the lifted visual must follow the pointer continuously;
- it must not freeze, disappear, detach from the cursor, or wait for React;
- React rendering must not participate in the movement hot path;
- pointer movement must remain correct during reentrant callbacks;
- stale or previously queued work must not overwrite newer committed state;
- scroll, resize, and relevant layout invalidation must not leave geometry permanently stale.

The movement path should be allocation-free after initialization.

Do not allocate per-move:

- context objects;
- candidate objects;
- tuples;
- result messages;
- temporary arrays;
- plugin descriptors;
- normalized event wrappers, unless a stable owned snapshot is semantically required.

The hot path should operate on one authoritative reusable runtime and direct function calls.

---

### Vertical insertion

The behavior only needs to support a one-dimensional vertical list.

As the dragged visual moves through the list:

- a new insertion position must be selected at a defined vertical boundary;
- the placeholder must move to that insertion position;
- neighboring elements must occupy or vacate space correctly;
- movement near a boundary must not cause unstable placeholder oscillation;
- the current insertion must remain authoritative until a genuinely better insertion is selected.

Use a vertical-specific geometry model. Do not include horizontal or grid logic merely for future extensibility.

The implementation may use item centers, directional thresholds, gaps, or another well-defined vertical rule. The selected rule must be documented and tested.

---

### Placeholder semantics

The placeholder is the dragged item’s authoritative footprint throughout the active operation.

It must:

- preserve the relevant layout size;
- occupy exactly one insertion position;
- move without duplicating or disappearing;
- remain valid while the lifted visual is landing;
- remain owned until both persistent rendering and landing requirements allow temporary presentation to be released.

The placeholder’s appearance must be configurable by the consumer.

The feature API may allow:

- a custom element factory;
- consumer-provided classes or attributes;
- CSS variables;
- a completely custom placeholder presentation.

Avoid hard-coded visual styling beyond the minimum required mechanics.

---

### Release

On pointer release:

1. close further motion ingress;
2. retire pending movement or geometry work that could change the result;
3. synchronously refresh any geometry required for the final decision;
4. commit exactly one final insertion;
5. construct exactly one reorder request;
6. invoke the consumer callback;
7. begin persistent-render readiness and landing;
8. release temporary presentation only when all required gates are complete.

Nothing queued before release may later move the placeholder or alter the accepted proposal.

The lifted visual must land at the current placeholder position, not at an earlier measured position.

---

## React integration

The implementation must work correctly with React’s asynchronous rendering model.

The consumer owns persistent ordered state:

```ts
const [items, setItems] = useState(/* ... */);
```

When a reorder is proposed, the consumer updates that state:

```ts
onReorder(request) {
  setItems(items => applyReorder(items, request));
}
```

The library must not assume that returning from `onReorder` means React has already committed the authored DOM.

Use the established readiness approach:

- the consumer supplies or exposes a readiness signal for the accepted update;
- a React integration may resolve that signal from `useLayoutEffect()`;
- the library keeps temporary drag presentation alive until React confirms that its authored DOM has committed.

A representative integration may conceptually resemble:

```ts
const readiness = createPresentationReadiness();

onReorder(request) {
  setPendingRequest(request);
  setItems(items => applyReorder(items, request));

  return accept({
    presentationReady: readiness.promise,
  });
}

useLayoutEffect(() => {
  readiness.resolve();
}, [items]);
```

The exact API is open to design.

Required semantics:

- React readiness must be explicit;
- a fulfilled reorder callback alone must not imply DOM readiness;
- landing and React rendering should run concurrently where possible;
- temporary presentation is removed only after both gates are complete;
- readiness must be bound to the exact operation or settlement attempt;
- late readiness from an older operation must be inert;
- an unresolved readiness signal must not retain the drag forever without a deliberate policy such as timeout, cancellation, or destruction.

Provide a small React example or test fixture demonstrating the intended `useLayoutEffect()` handshake.

---

## Consumer callbacks

Expose consumer interaction callbacks through a coherent feature such as:

```ts
callbacks({
  onReorder,
  onStart,
  onMove,
  onFinish,
  onCancel,
  onError,
});
```

The exact callback set and signatures should be derived during contract design.

At minimum, the implementation needs:

- an explicit reorder resolver;
- an observable accepted result;
- an observable rejected or canceled result;
- classified error reporting;
- terminal notification after temporary presentation has been released.

Do not silently infer acceptance from:

- callback silence;
- DOM mutation;
- collection order;
- elapsed time;
- React eventually rendering something.

The consumer must explicitly resolve the reorder.

---

## Animation and presentation customization

There are at least two independent animation concerns.

### Layout displacement

When the placeholder moves, neighboring elements may animate between their old and new positions.

The consumer must be able to configure this behavior externally, preferably through CSS.

The architecture must allow:

- no animation;
- ordinary CSS transitions;
- arbitrary durations;
- arbitrary easing;
- interruption and retargeting;
- correct cleanup when placeholder movement happens again before a previous animation completes.

Do not require one specific technique such as FLIP, although a FLIP-like implementation may be appropriate.

The library may perform the measurements and temporary transform writes required to make CSS animation possible.

---

### Landing

On release, the lifted visual moves from its current position to the placeholder.

The consumer must be able to configure:

- zero-duration landing;
- arbitrary duration, including deliberately extreme values such as ten seconds;
- arbitrary easing;
- CSS-driven landing where feasible;
- a custom animation runner for behavior that CSS timing functions cannot naturally express, such as a physical spring.

A spring animation must not be architecturally impossible merely because the default implementation uses CSS transitions or the Web Animations API.

Landing completion must be tied to an explicit attempt identity.

A stale completion must not mutate or finalize a newer operation.

---

### Default presentation behavior

The default must be minimal:

- placeholder movement is immediate;
- landing is immediate;
- no animation dependency is required;
- absence of animation must not create fake asynchronous work;
- optional animation code should remain tree-shakeable where practical.

A basic vertical sortable should work without installing an animation feature.

---

## Long-running animation correctness

Treat a deliberately long landing animation as an important correctness case.

During a long animation:

- the lifted visual and placeholder remain valid and owned;
- `destroy()` must clean them immediately;
- cancellation policy must remain deterministic;
- stale animation completion must be inert;
- collection changes must not make the visual land at an obsolete target;
- inline styles or temporary transforms must be restored exactly once;
- cleanup failure must not strand the controller in a half-owned state.

Animation is therefore part of the lifecycle model, not cosmetic post-processing.

---

## Kernel responsibilities

Derive the minimal `Kernel` interface needed by vertical sortable.

The kernel should own or guarantee the common execution skeleton, including:

- native input admission into a controlled boundary;
- FIFO run-to-completion processing;
- reentrant dispatch behavior;
- one active operation per controller;
- lifecycle phase legality;
- operation identity;
- cancellation precedence;
- destruction as a synchronous terminal barrier;
- transactional state publication;
- known resource lifetime scopes;
- async attempt identity and retirement;
- panic teardown;
- base controller methods such as `cancel()` and `destroy()`.

A behavior author should not have to manually reimplement this state machine.

The exact phases may be based on the proven current lifecycle:

```text
IDLE
PENDING
ACTIVATING
ACTIVE
RELEASING
SETTLING
REPORTING
FINALIZING
```

Changing or simplifying that vocabulary is allowed only when the resulting semantics remain equally explicit and correct.

The kernel should call behavior operations directly. Do not recreate an event/effect/result protocol.

Avoid architecture shaped like:

```text
kernel emits an event
→ behavior emits an effect
→ kernel interprets the effect
→ behavior receives a result message
```

Prefer:

```text
kernel validates and opens a transition
→ direct behavior operation
→ direct feature operations
→ kernel commits and performs lifecycle continuation
```

---

## Runtime model

There must be one authoritative runtime object per controller.

The kernel may own its creation and lifecycle while the behavior defines its domain-specific shape.

A likely conceptual composition is:

```ts
type SortableRuntime = KernelRuntime &
  SortableRuntimeState &
  VerticalRuntimeState &
  PlaceholderRuntimeState;
```

Do not require the implementation to use this exact TypeScript shape.

Runtime ownership must nevertheless be clear:

- kernel-owned fields support execution guarantees;
- behavior-owned fields support sortable semantics;
- feature-owned fields support optional capabilities;
- operation-local semantic state is transactionally published;
- caches, resources, arrays, attempts, and disposer stacks remain outside transactional frames where appropriate.

The final runtime may become part of a public advanced feature-authoring API.

It is acceptable to expose type-only projections of the full runtime with `Pick<>` or explicit structural interfaces.

A feature operation may receive the same physical runtime object through a narrower TypeScript type:

```ts
type PlaceholderRuntime = Pick<
  SortableRuntime,
  'current' | 'draft' | 'placeholder'
>;
```

Do not materialize runtime views or capability wrappers in the movement hot path.

Type-level restriction is sufficient; this is not a security boundary.

---

## Behavior responsibilities

The sortable behavior should:

- define sortable-specific runtime and frame data;
- define the collection and insertion model;
- assemble and validate sortable features;
- translate kernel lifecycle seams into sortable semantics;
- construct reorder requests and results;
- expose sortable-specific controller methods;
- invoke feature operations at defined semantic points.

The behavior must not reimplement the full common state machine.

It should supply direct operations or hooks to the kernel rather than owning an independent queue.

---

## Feature model

Features are construction-time contributors to one behavior.

Examples for the first implementation may include:

```ts
vertical();
placeholder(/* ... */);
callbacks(/* ... */);
layoutAnimation(/* ... */);
landing(/* ... */);
```

The exact list is open to design.

Features must not become runtime plugins with generic event subscriptions.

Avoid:

```ts
for (const plugin of plugins) {
  plugin.onEvent(event);
}
```

Avoid hot-path filtering:

```ts
features.filter((feature) => feature.type === 'geometry');
```

Instead, each feature should install itself into behavior-defined semantic slots during construction.

A feature may contribute to more than one semantic seam. For example, an animated-placeholder feature may need to participate in:

- pre-mutation measurement;
- placeholder relocation;
- post-mutation measurement;
- animation cleanup;
- operation retirement.

The feature architecture must permit this without forcing every feature into one generic callback interface.

After construction, the hot path should contain only preassembled direct operations or compact prebuilt pipelines.

The set of installed features is immutable after controller creation.

Feature policy may be updateable if the feature deliberately supports live updates.

---

## Tree-shaking

The point of fine-grained composition is that consumers should only pay for selected behavior and features.

A minimal vertical sortable must not include code for:

- horizontal geometry;
- grid geometry;
- free drag;
- optional layout animation;
- optional landing animation;
- unrelated input modes.

Avoid global registries and eager objects containing every built-in feature.

Judge tree-shaking through consumer fixtures, not source-code intuition.

At minimum, measure:

1. minimal vertical sortable with no animation;
2. vertical sortable with placeholder layout animation;
3. vertical sortable with configurable landing;
4. the complete first-iteration feature set.

Use the repository’s established size tooling where possible.

Report minified and compressed size, including Brotli if already used by the project.

---

## Correctness invariants

The implementation must preserve the difficult guarantees of the existing package.

### Reentrancy

- nested public calls do not interrupt the current action;
- callbacks may call `cancel()` or `destroy()`;
- each queued invocation retains its own input;
- post-callback continuation validates the operation that created it.

### Cancellation and destruction

- cancellation cannot be followed by resurrection;
- the first valid cancellation has deterministic precedence;
- destroy is terminal;
- no callback fires after completed destruction;
- pending asynchronous work becomes inert.

### Transactionality

- committed state is always valid;
- preparation failure cannot partially publish state;
- resource ownership transfers only at a deliberate commit boundary;
- partial acquisition rolls back locally in reverse order;
- committed transitions are not silently reverted by post-commit failure.

### Async currency

- readiness, landing, and consumer resolution are bound to attempts;
- stale completions cannot mutate a newer operation;
- asynchronous completion must be validated both before admission and when applied if both race windows exist.

### Resources

- every acquisition has one release path;
- cleanup is idempotent;
- cleanup is best-effort;
- one failing disposer does not prevent remaining cleanup;
- temporary DOM presentation does not outlive the operation;
- idle controllers do not retain DOM from completed drags.

### Release stability

- motion closes before final proposal construction;
- pending movement and invalidation cannot alter the proposal afterwards;
- final required geometry is measured synchronously;
- exactly one immutable reorder proposal is resolved.

---

## Collection changes

The controller must provide an explicit way to update or replace its item collection.

The exact method is open to design, for example:

```ts
controller.updateItems(items);
```

or:

```ts
controller.update({
  items,
});
```

Collection changes must be identity-based.

During an active operation:

- preserve the current insertion only when its relevant item relationships remain valid;
- do not infer intent again from an unrelated latest pointer position;
- terminate or reconcile deterministically when the dragged item disappears;
- do not let changes after release rewrite a proposal whose transaction has already been decided.

The first implementation does not need a general multi-container sortable system.

---

## Input scope

Pointer-driven vertical sorting is required.

Handle and activation-threshold policies should be supported either through:

- kernel admission configuration;
- sortable behavior configuration;
- one or more sortable features.

Choose the cleanest contract based on the implementation.

Keyboard sorting is not required for this first architectural probe.

The design should not make a future keyboard feature impossible, but do not add abstractions solely for it.

---

## Testing

Create tests for observable behavior and architectural guarantees.

At minimum, cover:

### Basic flow

- press below threshold;
- activation after threshold;
- placeholder insertion;
- continuous pointer following;
- downward reorder;
- upward reorder;
- release at the current insertion;
- no-op release;
- immediate landing.

### Boundary behavior

- placeholder does not oscillate at an insertion threshold;
- rapid alternating pointer samples preserve FIFO semantics;
- release uses the final synchronous geometry;
- pending frame work cannot alter the released proposal.

### React readiness

- consumer accepts but React readiness is delayed;
- landing completes before React;
- React completes before landing;
- both complete immediately;
- stale readiness from an older operation;
- readiness never settles and the chosen timeout or teardown policy applies;
- readiness is resolved from a React `useLayoutEffect()` fixture.

### Reentrancy

- `onStart` cancels;
- `onStart` destroys;
- `onReorder` cancels;
- `onReorder` destroys;
- callback queues work and then throws;
- terminal callback destroys.

### Async attempts

- late reorder resolution after a newer operation;
- late landing completion;
- interrupted landing;
- stale layout animation completion.

### Resource cleanup

- partial activation failure;
- placeholder factory throws;
- presentation acquisition throws;
- animation creation throws;
- destroy during active movement;
- destroy during consumer resolution;
- destroy during long landing;
- disposer failure does not prevent remaining cleanup.

### Collection changes

- collection updates during active movement;
- dragged item disappears;
- neighbor identity changes;
- collection update during release;
- collection update during settlement.

### Styling and animation

- no-animation default;
- CSS layout transition;
- long landing duration;
- custom animation runner;
- interrupted and retargeted layout displacement.

Use DOM-observable assertions rather than asserting private implementation details unless the test directly protects a kernel invariant.

---

## React demonstration

Provide a small React fixture or story showing:

- a controlled array rendered with stable keys;
- `draggable(sortable(...))` controller creation;
- item collection updates;
- `onReorder` updating React state;
- `useLayoutEffect()` signaling authored-presentation readiness;
- customizable placeholder CSS;
- no-animation mode;
- an animated mode.

The React adapter does not need to become a polished public package during this iteration.

Its purpose is to prove that the core contract works under asynchronous controlled rendering.

---

## Performance review

Inspect and document the pointer-move path.

Verify that it does not allocate per move.

Record:

- the exact functions executed on a normal active pointer move;
- the loops and indirect calls involved;
- DOM reads and writes;
- any rAF scheduling;
- any coalescing;
- reusable mutable storage;
- reasons for unavoidable work.

Avoid performance theatre: do not add complexity merely to remove a branch that measurements show to be irrelevant.

However, do not accept obviously avoidable allocation or protocol overhead in the hot path.

---

## Required deliverables

### 1. Implementation

A working independent package at:

```text
packages/drag2
```

containing the new kernel, vertical sortable behavior, and necessary features.

Do not prescribe the internal file layout before the architecture is understood.

### 2. Tests

Comprehensive tests covering the scenarios and invariants above.

### 3. React fixture

A controlled React example using `useLayoutEffect()` to signal presentation readiness.

### 4. Size measurements

Report bundle sizes for the required consumer compositions.

### 5. Hot-path analysis

Document allocations, indirect calls, DOM access, and scheduling on active pointer movement.

### 6. Architecture report

Write a concise design document describing the contract that emerged from implementation:

- final `draggable()` responsibility;
- final `Kernel` interface;
- kernel-owned FSM semantics;
- behavior contract;
- feature assembly contract;
- runtime ownership and shape;
- transactional boundaries;
- lifecycle seams;
- callback and readiness protocol;
- animation integration;
- controller extension model;
- public versus internal types;
- compromises and unresolved questions.

Include representative TypeScript signatures and one complete lifecycle trace.

### 7. Comparison with `packages/drag`

Explain:

- which guarantees were preserved;
- which implementation mechanisms changed;
- which code became unnecessary for vertical-only sorting;
- what became smaller or clearer;
- what became more indirect or expensive;
- which current edge cases are not yet implemented;
- whether the new kernel appears plausible for a later free-drag behavior.

---

## Success criteria

The iteration succeeds when:

- the vertical sortable behaves correctly in a controlled React application;
- the lifted item follows the pointer independently of React renders;
- the placeholder is a stable authoritative footprint;
- insertion changes are predictable and non-jittery;
- release lands at the current placeholder;
- React readiness and landing synchronize correctly;
- animation is externally configurable and optional;
- zero-animation behavior is genuinely immediate;
- long or custom animations do not compromise lifecycle correctness;
- cancel, destroy, reentrancy, and stale async work remain safe;
- the pointer-move path is allocation-free;
- unused future behaviors and features do not enter the minimal bundle;
- a custom behavior author would receive a useful kernel-managed FSM rather than a bag of unrelated utilities;
- the resulting architecture is derived from working code rather than speculative generalization.

The goal is not to prove that this is the final architecture of `@ydinjs/drag`.

The goal is to produce the first complete architectural specimen from which the next iteration can proceed with evidence.
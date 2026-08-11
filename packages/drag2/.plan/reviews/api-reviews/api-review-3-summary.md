# API redesign synthesis v3 — pre-probe working draft

This document consolidates three API-review rounds and the owner discussion that followed them.

It is the **final design draft before executable probes**. It is still challengeable, but the purpose of the next step is no longer another prose review: unresolved claims should be tested against small executable fixtures.

The design goal remains:

> Preserve useful capability and extensibility; remove public guarantees and internal machinery whose consumer value does not justify their lifecycle, implementation, testing, or reasoning cost.

Several earlier simplifications were deliberately rolled back after adversarial review:

- live collection reconciliation has real value; the problem was its delivery API, not necessarily reconciliation itself;
- serial authored commit does not remove post-commit semantic re-anchoring;
- placeholder contract validation and library acquisition safety are different things;
- geometry and lifted presentation can legitimately use different DOM elements;
- `onError` is orthogonal to domain termination and cannot be folded completely into `onEnd`;
- custom feature composition needs one ordered namespace;
- deferred physical destruction removes statement-level liveness machinery, but not transaction-boundary validity checks.

The third review also exposed why a pure pull collection source is insufficient: it has no prompt notification path for a stationary drag and can move O(n) consumer reads onto a previously warm path.

---

# 1. Public API layers

The intended layering is progressive disclosure:

```text
ordinary consumer
    sortable(...)
    freeDrag(...)

sortable extension author
    sortable/feature-utils

custom behavior author
    kernel/*
```

The ordinary API should not expose the current intermediate pattern:

```ts
draggable(root, sortable(...));
```

Built-in behaviors install themselves:

```ts
sortable(root, ...fragments);
freeDrag(root, ...fragments);
```

The low-level kernel layer may still expose `draggable`, but as the **behavior installation primitive**, not as the ordinary consumer constructor.

The kernel needs to exist before a behavior can construct its controller/spec because the behavior needs the host (`dispatch`, `fail`, `realm`, `root`, etc.). The current atomic installation property is useful and should be preserved. All three third-round reviews independently caught that a preconstructed plain `{ ...behaviorParts }` object cannot express this.

Working low-level shape:

```ts
import { draggable } from '@ydinjs/drag/kernel';

const controller = draggable(root, (host) => {
  const runtime = createRuntime(host);

  return {
    spec: {
      // behavior lifecycle
    },

    controller: {
      // public behavior controller
    },
  };
});
```

Conceptually:

```text
create kernel
    ↓
create host
    ↓
invoke behavior factory(host)
    ↓
receive complete { spec, controller }
    ↓
arm ingress exactly once
    ↓
return controller
```

Built-ins use the same primitive internally:

```ts
function sortable(root, ...fragments) {
  return draggable(root, (host) => {
    const config = mergeSortableFragments(fragments);
    return installSortable(host, config);
  });
}
```

The exact public kernel vocabulary remains a separate design/probe question. A real third-party behavior should determine how much of the current kernel SPI genuinely needs to become public.

---

# 2. One ordered fragment list

The high-level sortable API uses one ordered list of fragments:

```ts
const controller = sortable(
  root,

  {
    items,
    handle,
    visual,
    box,
    placeholder,
    threshold,
    onReorder,
    onStart,
    onEnd,
    onError,
  },

  y(),

  landing({
    duration: 200,
    easing: 'cubic-bezier(.2, 0, 0, 1)',
  }),

  layoutAnimation(),

  customFeature(),
);
```

There is no separate unordered options world and ordered feature world.

However, **not every fragment has identical merge semantics**.

Two semantic categories are intentional.

## Configuration / strategy fragments

Examples:

```ts
{
  items,
  threshold,
  visual,
}

y()

xy()

landing(...)
```

They are declarative descriptions.

They must be **inert before installation**:

```ts
const axis = y();
```

must not:

- allocate a rect index;
- attach listeners;
- read DOM;
- create runtime resources;
- acquire anything requiring retirement.

Fragments are merged first and materialized only afterwards.

Therefore:

```ts
sortable(root, y(), xy());
```

can safely mean:

```text
axis = xy
```

because `y()` was only a descriptor and its runtime was never constructed.

Merge semantics are domain-defined, not generic deep merge:

```text
scalar/function slot
    → later contribution wins

atomic capability
    → later capability replaces the entire earlier capability

paired/grouped source
    → replaced atomically, never field-by-field

defaults
    → derived after the complete merge
```

For example an axis is one ownership unit:

```ts
{
  axis: {
    install(/* ... */) {
      // creates resolve/invalidate/retire runtime together
    },
  },
}
```

not a recursively mergeable object.

## Plugin fragments

Examples:

```ts
layoutAnimation();
customFeature();
```

These contribute ordered multi-writer hooks/pipelines.

Their semantics are:

```text
plugin fragments
    → append in argument order

retirement
    → reverse acquisition order
```

Supplying the same plugin twice means installing it twice. This is ordinary plugin-list behavior rather than an implicit deduplication guarantee.

Consumers need not know which internal hooks a plugin contributes, but they **do** know whether they are supplying a configuration/strategy fragment or installing a plugin.

`layoutAnimation()` should remain implemented through the same public extension machinery to dogfood the feature-authoring surface.

---

# 3. `destroy()`

The current guarantee that physical teardown can happen synchronously in the middle of arbitrary consumer-reachable code is not worth the machinery required to defend it.

Working semantics:

```text
destroy requested
    ↓
controller becomes logically closed immediately
    ↓
no new operation or later lifecycle publication is allowed
    ↓
if no library transaction is active:
    physical teardown completes synchronously
else:
    physical teardown is deferred until the outermost
    synchronous library transaction unwinds
    ↓
destroy completion settles
```

Likely API:

```ts
destroy(): Promise<void>;
```

The Promise is mainly a completion token for the rare reentrant case.

Ordinary teardown:

```ts
void controller.destroy();
```

still physically completes synchronously when invoked outside library execution.

The kernel currently has no single concept covering the outermost synchronous transaction across all relevant entry points. That concept should become an explicit kernel primitive.

This does **not** mean all safety checks disappear.

The intended replacement is:

```text
OLD
every consumer/DOM getter or write
    → live?
    → live?
    → live?

NEW
consumer/library transaction
    → execute
    → revalidate before publication / next lifecycle callback
```

The small remaining validity set must cover all synchronous library entry points and be exception-safe.

`cancel()` and classified failures remain separate state-machine operations and should not perform physical retirement underneath an active consumer stack.

`panic()` is the hardest exceptional path and must be explicitly decided by executable evidence rather than assumed to behave like ordinary `destroy()`.

---

# 4. Placeholder ownership and acquisition

The public placeholder API remains a callback:

```ts
placeholder(context): HTMLElement;
```

not:

```ts
placeholder: {
  create(context): HTMLElement;
}
```

Contract:

> The callback returns a fresh detached element. Once adopted, the library owns it for the operation.

The reviews established three different categories that must not be conflated.

## Consumer ownership validation

Cheap checks preventing destructive ownership confusion remain justified.

Examples:

```text
placeholder is the dragged item
placeholder is the lifted visual
placeholder is already connected/page-owned
duplicate sortable item identity
```

These prevent the library from later deleting or corrupting authored DOM.

## Library write verification

Checks that our own DOM mutation succeeded also remain justified.

Examples:

```text
placeholder insertion actually landed
anchor belongs to the expected container
```

These are checks of library state, not consumer nannying.

## Acquisition safety

A separate real defect exists today: the library can mutate the consumer-created placeholder during preparation before rollback ownership is registered.

The rule should be:

> Library-authored placeholder mutations are all-or-nothing with respect to preparation.

If preparation does not commit, the externally retained element must not be left carrying partial library state.

This should be solved as a **local acquisition/rollback problem**, not by restoring global statement-level I-36 liveness machinery.

---

# 5. `visual()` and `box()`

One DOM element is not sufficient for every sortable layout.

Working vocabulary:

```ts
visual(item): HTMLElement;
box(item): HTMLElement;
```

Roles:

```text
item
    → logical sortable identity

visual
    → actual element physically lifted and transformed

box
    → source of sortable spatial geometry
```

Default:

```ts
box(item) = visual(item);
```

so ordinary consumers still configure one resolver.

A valid advanced case is:

```html
<x-row style="display: contents">
  <div class="row-box">
    <article class="card">...</article>
    <aside>controls...</aside>
  </div>
</x-row>
```

where:

```text
item   = x-row
box    = .row-box
visual = .card
```

## Pre-lift measurement

`box` and `visual` geometry must be captured **before** the visual is removed from normal flow.

At activation:

```text
resolve item
resolve box
resolve visual

capture pre-lift:
    box rect
    visual rect
    lifted visual footprint
    visual offset relative to box

then acquire faithful lift
```

The third review correctly caught that measuring an ancestor `box` after `visual { position: fixed }` can observe an already-collapsed box.

## Placeholder footprint

`box` should not automatically define placeholder size.

If only a nested `visual` leaves flow while sibling content remains, replacing the entire box footprint double-counts the content that remains.

The default placeholder footprint should therefore correspond to the **pre-lift footprint removed by the visual**, not blindly to the full geometry box.

For the simple/common case:

```text
box === visual
```

this naturally becomes the whole item footprint.

## Landing offset

If:

```text
box.left    = 100
visual.left = 120
```

the captured offset:

```text
visualOffsetX = +20
```

must be preserved when deriving the landing target.

The exact placeholder anchoring semantics for complex `display: contents`, grid and slotted layouts remain a probe target. The current draft does **not** assume that simply changing `item.after(placeholder)` to `box.after(placeholder)` is universally correct.

The lifted visual itself is stable for the operation:

> Once acquired, the exact visual node remains the lifted presentation until the operation ends.

Framework remount/recycling of that exact node during a live operation is currently an integration constraint rather than something the library attempts to repair automatically.

---

# 6. Collection source + invalidation

The controller should not receive and own a second independently synchronized long-lived collection via:

```ts
sortable(root, { items });
controller.updateItems(nextItems);
```

However, pure pull:

```ts
itemCount();
itemAt(index);
```

was also rejected.

It removes the change signal, fails to notice stationary remote updates promptly, and can put O(n) consumer calls onto paths where the current geometry cache is warm.

The working model combines pull ownership with explicit invalidation:

```ts
sortable(root, {
  items: () => itemsRef.current,
});
```

and:

```ts
controller.invalidate();
```

The two pieces have different responsibility:

```text
items()
    → where the committed truth lives

invalidate()
    → the committed external world may have changed
```

`invalidate()` carries **no collection payload**.

## Source contract

```ts
items(): readonly HTMLElement[];
```

returns the current committed sortable collection.

Working convention:

> Array identity remains stable while collection membership/order is unchanged and changes on structural collection updates.

Therefore structural updates should use a fresh array:

```ts
itemsRef.current = reorder(itemsRef.current, ...);
controller.invalidate();
```

In-place mutation of the same array is outside the structural-change detection contract.

## Invalidation semantics

On invalidation:

```ts
const next = items();
```

If:

```ts
next === current;
```

then:

```text
collection structure unchanged
→ invalidate derived geometry/presentation state
```

No collection allocation or O(n) scan is required.

If:

```ts
next !== current;
```

then:

```text
collection structurally changed
→ reconcile active operation
→ replace current source identity
→ invalidate derived geometry
```

This makes geometry-only invalidation cheap:

```text
same array
new box()
new dimensions
new fonts/images/layout
→ rebuild geometry when next required
```

while structural changes remain explicit through source identity.

The exact source may be retained by reference rather than shallow-copied if the readonly/new-identity convention proves sufficient. Whether a defensive operation copy still earns its cost is a probe question.

---

# 7. Collection reconciliation

Reconciliation itself remains.

Example:

```text
A B C D E
```

Dragging `B` toward:

```text
C | D
```

External structural update:

```text
A B C D E X
```

The semantic destination `C | D` survives.

The drag remains meaningful and may continue.

But:

```text
A B C X D E
```

destroys the destination gap.

The current operation should cancel.

Working pre-release rule:

```text
dragged item still belongs to the source
+
semantic before/after gap still exists
    → adopt new collection source and continue

otherwise
    → cancel
```

This remains useful for:

- collaborative updates;
- unrelated additions/removals;
- infinite-list changes;
- harmless framework structural republishes.

After release:

```text
proposal is frozen
```

Structural invalidation may update state used by future operations and invalidate derived geometry, but it does not reinterpret the released proposal.

There is therefore no longer a public temporal distinction such as:

```text
updateItems means one thing during ACTIVE
and another during SETTLING
```

The consumer always says only:

```ts
controller.invalidate();
```

and the library owns phase-specific interpretation.

Public collection `version` is not currently justified by this model.

Internal cache identity/versioning may remain where useful.

Neighbour identity (`before` / `after`) remains valuable independently of reconciliation, including for server APIs, CRDT/fractional ordering and validating application-side application of a stale request. Do not remove those fields merely because public collection versioning disappears.

Initial scope remains **mounted sortable DOM items**. Full logical virtualization across unmounted items requires a different identity/geometry model and is not implicitly solved by this API.

---

# 8. Release is a semantic boundary

The operation is cancelable while the user is still deciding:

```text
PENDING
ACTIVE
```

At pointer release:

```text
proposal becomes immutable
```

and the operation enters the consumer decision/commit phase.

Working direction:

> User cancellation closes at release.

Once `onReorder` has begun, Escape or ordinary `controller.cancel()` does not attempt to roll back consumer work already initiated by the resolver.

This avoids an impossible promise:

```text
setOrder(next)
    ↓
consumer hits Escape
    ↓
library says canceled
    ↓
React commits next anyway
```

The library cannot generally undo arbitrary consumer side effects once the consumer has begun them.

`destroy()` remains different: it terminates the entire controller relationship and makes later library continuations stale, but does not promise to undo application side effects already performed by consumer code.

This boundary should be attacked explicitly in probes, because it changes current cancellation reachability during the consumer round-trip.

---

# 9. Serial authored commit before landing

`onReorder` already supports asynchronous consumer work.

Working lifecycle:

```text
release
    ↓
proposal frozen
    ↓
onReorder(request)
    ↓
consumer updates application state
    ↓
framework/authored DOM commits
    ↓
consumer resolution settles
    ↓
library re-establishes its own DOM state
    ↓
authoritative landing measurement
    ↓
landing
    ↓
terminal callback
```

Consumer example:

```ts
async onReorder(request) {
  const next = applyReorder(current, request);

  const committed = commit.waitFor(next);

  setState(next);

  await committed;

  return accept();
}
```

This deliberately serializes framework commit and landing.

Expected simplifications include removal of:

```text
accept({ presentation: true })
controller.ready(request)
request-identity acknowledgement API
early/armed/duplicate acknowledgement states
readiness gate
LandingHandle.retarget() for commit-time retargeting
part of provisional landing target machinery
```

## Post-commit re-anchor remains

Serialization does **not** mean the library may assume its unmanaged placeholder survived or remained in the correct semantic position.

The consumer commit is explicitly allowed to reorder authored DOM around library-owned presentation nodes.

Therefore, after consumer commit and before authoritative measurement:

> The library re-establishes the placeholder from the frozen semantic proposal.

This is **commit recovery**, not readiness-protocol machinery.

An imperative renderer may move or detach the placeholder entirely; React may leave it connected but in the wrong semantic gap. Existing probes already demonstrate the latter class.

The library owns repairing its own temporary DOM after consumer commit.

## React helper

The mechanism connecting `setState` to “that intended authored state actually committed” is framework-specific.

It should initially live as documentation/reference integration rather than as a core drag state-machine protocol.

A correct React helper must eventually be tested for:

```text
expected commit identity
unrelated commits
Suspense
unmount
coalesced updates
never-committing transitions
```

The core abstraction remains ordinary async consumer work:

```ts
ReorderResolution | PromiseLike<ReorderResolution>;
```

---

# 10. Landing

The high-level sortable API no longer exposes arbitrary consumer-owned landing runners.

Remove:

```ts
landing({
  run(...)
});
```

The library owns the landing animation through WAAPI.

Working surface:

```ts
landing({
  duration: 200,
  easing: 'cubic-bezier(.2, 0, 0, 1)',
});
```

The zero-argument:

```ts
duration: () => number;
```

does not justify itself: it cannot even observe the distance that motivated dynamic timing.

Contextual duration may be added later if a real first-party/product need proves fixed duration insufficient:

```ts
duration({ distance, from, to }): number
```

Accepted-vs-return-home travel distance is an obvious future falsifier, but it does not reopen arbitrary `run` ownership.

Advanced kernel authors are not necessarily restricted to the high-level sortable WAAPI contract; whether the low-level kernel exposes a generic settlement capability is part of the kernel-authoring design, not the sortable consumer surface.

---

# 11. Terminal lifecycle and diagnostics

Domain termination and diagnostic failure remain separate concepts.

Working callbacks:

```ts
onStart(...)
onEnd(result)
onError(error)
```

`onError` is orthogonal.

Example:

```text
operation accepted
    ↓
onEnd({ type: 'accepted' })
    ↓
consumer's onEnd throws
    ↓
onError(error)
```

There must not be a second `onEnd`.

However, failures occurring **after `onStart` but before any domain result exists** still terminate that interaction.

Therefore the likely terminal shape includes an explicit no-domain-result arm:

```ts
type EndResult =
  | { type: 'accepted' /* ... */ }
  | { type: 'noop' /* ... */ }
  | { type: 'rejected' /* ... */ }
  | { type: 'canceled' /* ... */ }
  | { type: 'aborted' };
```

Intended lifecycle property:

> If `onStart` fires and the controller itself remains alive, exactly one `onEnd` eventually follows.

A consequential internal failure can therefore produce:

```text
onError(error)
onEnd({ type: 'aborted' })
```

A diagnostic after an already delivered domain terminal does not produce another terminal callback.

`destroy()` is currently treated as teardown of the entire subscription relationship rather than an interaction outcome. Whether destruction after `onStart` should still emit `onEnd` is intentionally left for a targeted lifecycle probe rather than assumed.

---

# 12. Error API

The current ordinary public numeric `FAILURE_*` stage constants should disappear.

Use one consumer-facing error object:

```ts
class DraggableError extends Error {
  readonly code: DraggableErrorCode;
  readonly cause?: unknown;
}
```

Current preference:

```ts
type DraggableErrorCode =
  'consumer' | 'interaction' | 'presentation' | 'platform';
```

Exact names/categories are not frozen.

The important direction is:

> Consumer error codes describe actionable fault classes, not internal pipeline seams.

Detailed failure stages may continue to exist internally and may be available to low-level kernel authors if that authoring contract genuinely requires them.

---

# 13. Faithful lift remains a deliberate guarantee

The actual rendered visual is lifted.

Do not replace it with a clone merely to simplify internal teardown.

Faithful lift preserves:

```text
form-control state
canvas/video state
focus
custom-element identity
running presentation state
framework identity
actual rendered content
```

Clone-based lift moves complexity outward and changes observable behavior.

This decision is considered closed unless executable evidence demonstrates that faithful lift is not viable.

---

# 14. Input behavior remains unresolved

The API redesign does not implicitly solve input policy.

Browser probes are still required for:

- pointer default prevention before activation threshold;
- nested buttons/links/inputs;
- selectable text;
- `contenteditable`;
- sliders/comboboxes;
- keyboard arrows inside editable controls;
- modifier keys;
- IME composition;
- pointer handle vs keyboard focus policy.

These are user-visible release requirements independent of the lifecycle redesign.

---

# Concrete sketch A — imperative consumer

Illustrative rather than normative:

```ts
import { accept, landing, layoutAnimation, sortable, y } from '@ydinjs/drag';

let items: readonly HTMLElement[] = [itemA, itemB, itemC, itemD];

const controller = sortable(
  root,

  {
    items: () => items,

    visual: (item) =>
      item.querySelector<HTMLElement>('[data-drag-visual]') ?? item,

    // Optional. Defaults to visual(item).
    box: (item) =>
      item.querySelector<HTMLElement>('[data-drag-box]') ??
      item.querySelector<HTMLElement>('[data-drag-visual]') ??
      item,

    placeholder: () => {
      const element = document.createElement('div');
      element.className = 'drop-placeholder';
      return element;
    },

    onReorder(request) {
      items = applyReorder(items, request);

      // Preserve/reorder the authored item nodes.
      // The renderer is not required to preserve the library placeholder;
      // the library re-establishes it after this callback completes.
      for (const item of items) {
        root.append(item);
      }

      controller.invalidate();

      return accept();
    },

    onStart() {
      root.dataset.dragging = '';
    },

    onEnd() {
      delete root.dataset.dragging;
    },

    onError(error) {
      console.error(error.code, error);
    },
  },

  y(),

  landing({
    duration: 200,
    easing: 'cubic-bezier(.2, 0, 0, 1)',
  }),

  layoutAnimation(),
);

// Later, when external committed state changes:
items = remoteItems;
controller.invalidate();

// Later, during actual owner teardown:
void controller.destroy();
```

Notable properties:

```text
no updateItems(payload)
no itemCount/itemAt frame scans
no ready(request)
```

`items()` is the source.

`invalidate()` is the signal.

---

# Concrete sketch B — React consumer

Also illustrative:

```tsx
import { accept, landing, layoutAnimation, sortable, y } from '@ydinjs/drag';

function SortableList() {
  const [order, setOrder] = useState(['A', 'B', 'C', 'D']);

  const rootRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SortableController | null>(null);

  const elements = useRef(new Map<string, HTMLElement>());

  // Structural source: replace this array only when the committed
  // sortable collection membership/order changes.
  const committedItems = useRef<readonly HTMLElement[]>([]);

  // Application identity used by the example reorder logic.
  const committedOrder = useRef(order);

  const commit = useCommitBarrier();

  useLayoutEffect(() => {
    committedOrder.current = order;

    committedItems.current = order
      .map((id) => elements.current.get(id))
      .filter((item): item is HTMLElement => item !== undefined);

    // External committed state may have changed.
    controllerRef.current?.invalidate();

    // Resolve only the waiter corresponding to this intended commit.
    commit.committed(order);
  }, [order]);

  useEffect(() => {
    const root = rootRef.current;

    if (root === null) {
      return;
    }

    const controller = sortable(
      root,

      {
        items: () => committedItems.current,

        visual: (item) =>
          item.querySelector<HTMLElement>('[data-drag-visual]') ?? item,

        box: (item) =>
          item.querySelector<HTMLElement>('[data-drag-box]') ??
          item.querySelector<HTMLElement>('[data-drag-visual]') ??
          item,

        placeholder: () => {
          const element = document.createElement('div');
          element.className = 'drop-placeholder';
          return element;
        },

        async onReorder(request) {
          const current = committedOrder.current;
          const next = applyReorder(current, request);

          // Register before scheduling the state update.
          const committed = commit.waitFor(next);

          setOrder(next);

          await committed;

          return accept();
        },

        onStart() {
          // ...
        },

        onEnd(result) {
          // accepted / noop / rejected / canceled / aborted
        },

        onError(error) {
          console.error(error.code, error);
        },
      },

      y(),

      landing({
        duration: 200,
        easing: 'cubic-bezier(.2, 0, 0, 1)',
      }),

      layoutAnimation(),
    );

    controllerRef.current = controller;

    return () => {
      controllerRef.current = null;
      void controller.destroy();
    };
  }, []);

  return (
    <div ref={rootRef}>
      {order.map((id) => (
        <div
          key={id}
          data-id={id}
          ref={(element) => {
            if (element === null) {
              elements.current.delete(id);
            } else {
              elements.current.set(id, element);
            }
          }}
        >
          <div data-drag-box>
            <div data-drag-visual>{id}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

For a geometry-only committed update that does not structurally change the item array:

```ts
useLayoutEffect(() => {
  controllerRef.current?.invalidate();
}, [expanded, fontLoaded, layoutMode]);
```

`items()` returns the same array identity, so this means:

```text
geometry changed
→ rebuild derived geometry
→ no collection reconciliation
```

For structural change, the integration replaces `committedItems.current` with a new array before calling `invalidate()`.

---

# Current working contract in one screen

```ts
const controller = sortable(
  root,

  {
    items: () => readonlyItems,

    handle,
    visual,
    box,
    placeholder,
    threshold,

    onReorder,
    onStart,
    onEnd,
    onError,
  },

  y(),

  landing({
    duration,
    easing,
  }),

  layoutAnimation(),

  customFeature(),
);
```

Controller:

```ts
interface SortableController {
  invalidate(): void;
  cancel(reason?: unknown): void;
  destroy(): Promise<void>;
}
```

with the important temporal rule:

```text
cancel
    → user interaction before release

release
    → proposal frozen; ordinary cancellation closes

invalidate
    → committed external state changed
    → same items array: geometry invalidation
    → new items array: reconcile + geometry invalidation

destroy
    → logical close immediately
    → physical teardown synchronously unless reentrant
    → reentrant teardown at outer transaction unwind
```

Low-level:

```ts
draggable(root, (host) => ({
  spec,
  controller,
}));
```

from the advanced kernel surface.

---

# Remaining probe targets

The prose design is now intentionally finished. The following claims should be settled by executable probes rather than another architecture-review round:

1. transaction bracket / deferred physical `destroy()`, including panic;
2. placeholder partial-acquisition rollback;
3. `items() + invalidate()` semantics and array-identity contract;
4. semantic gap reconciliation under structural invalidation;
5. serial React commit + post-commit placeholder re-anchor;
6. pre-lift `box` / `visual` measurement, residual footprint and landing offset;
7. `display: contents` / grid placeholder anchoring;
8. declarative fragment merge before materialization;
9. post-release cancellation closure;
10. `onStart → exactly one onEnd` for consequential failure;
11. custom behavior authoring against `kernel/draggable`;
12. pointer/keyboard interactive-descendant behavior.

At this point a failed probe should change the model. Another prose objection without a falsifier should not.
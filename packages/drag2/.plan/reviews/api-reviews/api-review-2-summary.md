# API redesign synthesis v2 — working model to attack

This document consolidates:

- the first independent API reviews;
- the owner discussion that followed;
- the second adversarial review round;
- the resulting corrections to the proposed simplifications.

It is **not a decision record**. The purpose of the next review is to attack this model before implementation.

The main lesson from the second review is that the previous synthesis was directionally useful but too aggressive in several places:

- deferred physical `destroy()` remains promising, but it does not eliminate all transaction safety;
- live collection reconciliation has more consumer value and less implementation cost than initially assumed;
- `updateItems()` still appears suspicious, but the likely problem is **push-based collection delivery**, not reconciliation itself;
- serial authored commit before landing remains promising and may remove more machinery than originally expected;
- placeholder contract validation and library-side acquisition safety are different concerns;
- geometry and lifted presentation may legitimately use different elements;
- ordinary configuration and true extensibility should share one ordered fragment model rather than becoming two unrelated APIs.

The second review round independently exposed several of these corrections.

---

## 1. Public layering

The intended model is progressive disclosure:

```text
high-level built-ins
  sortable(...)
  freeDrag(...)

behavior-specific extension
  sortable/feature-utils

low-level behavior authoring
  kernel/*
```

Custom behaviors and custom sortable features are both real product requirements.

However, the ordinary consumer should not need to traffic in an opaque intermediate `Behavior`:

```ts
draggable(root, sortable(...))
```

The preferred high-level surface is:

```ts
sortable(root, ...config);
freeDrag(root, ...config);
```

Internally, a built-in may still be implemented as:

```ts
function sortable(root, ...config) {
  const spec = assembleSortable(config);
  return draggable(root, spec);
}
```

`draggable()` can therefore remain the low-level atomic installer exposed from the kernel authoring layer rather than the ordinary package surface:

```ts
import { draggable } from '@ydinjs/drag/kernel';

const controller = draggable(root, {
  // low-level behavior/kernel parts
});
```

The useful property of the current installer must be preserved: the complete behavior/spec exists before input is armed.

**Attack:** determine whether this low-level shape exposes too much kernel architecture, or whether some safer/narrower authoring boundary can preserve the same atomic-installation guarantee.

---

## 2. One ordered config-fragment model

The previous synthesis proposed direct options plus a separate feature array. The second review correctly identified a problem: that creates **two ordering namespaces** for things that may contribute to the same lifecycle pipelines.

The current working model is instead:

```ts
sortable(
  root,

  {
    itemCount,
    itemAt,
    onReorder,
    visual,
    box,
    placeholder,
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

Every argument after `root` is conceptually a **config fragment**.

A plain object is a fragment.

`y()` is a fragment.

`landing()` is a fragment.

A third-party sortable feature is also a fragment.

The assembler knows the semantics of each field and merges left-to-right.

Conceptually:

```ts
const result = mergeFragments(
  baseConfig,
  y(),
  xy(),
  landing({ duration: 200 }),
);
```

but this is **not generic recursive deep merge**.

Merge rules are domain-defined:

```text
ordinary scalar/function slot
    → last contribution wins

atomic capability
    → whole capability replaced by the last contribution

ordered hook/pipeline
    → append in fragment order

cleanup/retire pipeline
    → acquire in fragment order, release in reverse order

undefined
    → contributes nothing
```

For example, if:

```ts
y()  -> { axis: yCapability }
xy() -> { axis: xyCapability }
```

then:

```ts
sortable(root, y(), xy());
```

simply means:

```text
axis = xyCapability
```

The implementation must not recursively combine half of `y` with half of `xy`.

This intentionally replaces current duplicate-contribution errors with ordinary configuration override semantics.

True multi-writer extensions remain ordered:

```ts
sortable(root, layoutAnimation(), customFeature());
```

so extension authors have one explicit ordering model.

At least one meaningful first-party capability such as `layoutAnimation()` should remain implemented through the same feature machinery, so the public extension API is continuously dogfooded.

**Attack:** find cases where last-wins atomic replacement creates unsafe or surprising partial lifecycle ownership, or where a third-party feature needs ordering semantics this model cannot express.

---

# 3. `destroy()`: logical close now, physical teardown on unwind

The current synchronous reentrant physical teardown remains the clearest unnecessary machinery magnet.

Working semantics:

```text
destroy()
    ↓
logical close immediately
    ↓
no new operation/work may be published
    ↓
if not inside library execution:
    physical teardown synchronously
else:
    current outermost library transaction unwinds
    physical teardown synchronously at that boundary
    ↓
destroy completion resolves
```

Likely API:

```ts
destroy(): Promise<void>
```

The Promise is primarily a completion token for the rare reentrant case.

Ordinary lifecycle cleanup remains effectively synchronous:

```ts
void controller.destroy();
// outside a library transaction, physical cleanup is already complete
```

The kernel currently has no single abstraction representing the outermost library transaction across all relevant synchronous entry points. If this model is adopted, such an execution bracket becomes an explicit kernel primitive rather than continuing to approximate it through distributed `live()` checks.

The intended simplification is **not**:

> every safety check disappears.

It is:

> statement-by-statement liveness checks around arbitrary DOM getters, style writes and consumer accessors disappear; a much smaller set of transaction publication/callback boundaries remains.

Consumer throws/classified failures and `cancel()` must be checked against this model separately; they should not silently reintroduce physical mid-stack retirement.

**Attack:** define the minimum transaction boundary precisely. Find execution paths that escape it, especially panic, cancellation, native admission, async completion and nested dispatch.

---

## 4. Placeholder: trust the consumer contract, fix our own acquisition discipline

Custom structured placeholders remain useful:

```ts
placeholder: (context) => HTMLElement;
```

Contract:

> Return a fresh detached element. The library assumes ownership of the element for the operation.

Do not create a `{ create() }` wrapper for one callback.

The second review exposed an important distinction.

### Consumer-contract validation

Checks such as:

```text
returned the dragged item
returned the visual
returned an already-connected page-owned node
```

protect the library from accidentally adopting and later deleting authored DOM.

These are cheap and potentially worth keeping in production.

They should be evaluated individually rather than removed under a general anti-validation rule.

### Library acquisition safety

The current implementation may apply attributes/styles/classes to the returned placeholder during preparation **before the operation has adopted it and registered rollback**.

If preparation is later discarded, mutations can remain on the consumer-created element.

That is not consumer nannying and not fundamentally an I-36 problem.

It is an ordinary all-or-nothing acquisition defect.

The fix should ensure that library-owned mechanics are either:

```text
fully acquired + rollback registered
```

or:

```text
not externally left behind
```

without adding general-purpose defensive machinery around arbitrary consumer behavior.

Checks verifying that **our own DOM insertion succeeded and remained valid** are also library-state checks, not consumer-contract nannying.

**Attack:** classify the existing placeholder checks into consumer ownership validation, library write verification, and unnecessary defensive validation. Do not treat them as one category.

---

# 5. `visual()` and `box()`

The previous model used one element for both geometry and lifted presentation.

A concrete counterexample shows that these can legitimately differ:

```html
<x-row style="display: contents">
  <div class="row-box">
    <article class="card">...</article>
    <aside>controls that should remain in the list</aside>
  </div>
</x-row>
```

The logical sortable identity is `<x-row>`.

The layout footprint/candidate geometry may be `.row-box`.

The desired lifted presentation may be only `.card`.

Therefore the current working vocabulary is:

```ts
visual(item): HTMLElement
box(item): HTMLElement
```

where:

```text
visual
    → element physically lifted/transformed/landed

box
    → source element for sortable geometry and layout footprint
```

The default should likely be:

```ts
box(item) = visual(item);
```

so ordinary consumers still configure one thing.

The library retains control of geometry semantics:

```text
box.getBoundingClientRect()
    → spatial candidate geometry

box.offsetWidth / offsetHeight
    → placeholder/layout footprint
```

rather than making consumers manufacture a `DOMRect`.

Candidate boxes may be re-resolved on geometry rebuild.

The **lifted visual** is a different lifetime: once acquired for the dragged item, that exact node must remain the lifted visual for the operation. Framework remount/recycling of that node during an active operation should be treated as a consumer/integration constraint unless a later requirement proves otherwise.

**Attack:** find cases where `box = visual` is not a safe default, or where even two elements are insufficient to represent real layout/presentation semantics.

---

# 6. Collection ownership: move from push synchronization to pull snapshots

`updateItems()` still smells wrong, but the second review showed that **reconciliation itself is useful**.

The likely mistake is collection delivery.

Current push model:

```text
consumer owns collection
    ↓
sortable(initialItems)
    ↓
controller stores copy
    ↓
consumer changes collection
    ↓
controller.updateItems(nextItems)
    ↓
controller stores another copy
```

The controller becomes a second long-lived owner of data whose authority actually lives in the application/framework.

The proposed model is pull-based:

```ts
{
  itemCount: () => number,
  itemAt: (index: number) => HTMLElement,
}
```

The consumer remains authoritative forever.

A drag operation pulls a temporary snapshot when needed.

Conceptually:

```ts
function readCollection() {
  const count = itemCount();
  const result = new Array<HTMLElement>(count);

  for (let i = 0; i < count; i++) {
    result[i] = itemAt(i);
  }

  return result;
}
```

The operation owns the snapshot, not the controller.

### Before release

The library may re-read the source at relevant interaction/geometry boundaries.

If the collection differs:

```text
dragged item still exists
+
current identity destination gap still survives
    → update operation snapshot and continue

otherwise
    → cancel
```

Example:

```text
snapshot:
A B C D E

dragging B toward:
C | D
```

Remote update:

```text
A B C D E X
```

The semantic gap `C | D` survives, so the drag remains meaningful.

But:

```text
A B C X D E
```

destroys `C | D`, so cancellation is appropriate.

This is useful behavior for collaborative changes, harmless framework republishes, infinite lists, and potentially virtualization. The existing reconciliation rules should therefore be simplified only if evidence says they are unnecessary, not deleted merely because they are dynamic.

### At release

Re-read/reconcile once more, then freeze the proposal.

### After release

The proposal is immutable.

There is no collection publication protocol for the current operation.

The next operation simply pulls the current collection again.

This removes the need for:

```ts
controller.updateItems(...)
```

entirely if the pull model proves sufficient.

It also removes the temporal question:

```text
is this update for the current drag
or for the next drag?
```

Each operation owns exactly the snapshot it read.

### Detecting changes

Pull delivery does not itself provide invalidation.

The first probe should therefore be deliberately simple:

```text
at relevant active interaction/geometry boundaries:
    read itemCount
    compare item references by index
```

No allocations are necessary for an unchanged source.

Do **not** introduce a collection version, invalidation callback, observer, subscription or push notification until measurement shows the simple scan is too expensive.

A DOM geometry read is likely much more expensive than reference comparisons, but this must be measured rather than assumed.

The initial contract should cover **currently sortable mounted DOM items**, not attempt full logical virtualization where `itemCount` includes unmounted rows. Supporting that would require a separate identity/geometry model.

**Attack especially hard:** stationary drags under remote updates, large collections, virtualization, framework recycling, and whether the library has enough natural pull points to notice changes without continuous polling.

---

# 7. Serial authored commit before landing

The current API already supports:

```ts
onReorder(): ReorderResolution | PromiseLike<ReorderResolution>
```

so serial commit can be tested against the current implementation before changing the API.

Working model:

```ts
async onReorder(request, { signal }) {
  setState(next);
  await authoredCommit;
  return accept();
}
```

Lifecycle:

```text
release
    ↓
proposal frozen
    ↓
onReorder
    ↓
application/framework commit
    ↓
accept resolves
    ↓
measure final authored DOM
    ↓
landing
    ↓
terminal result
```

This potentially removes:

```text
accept({ presentation: true })
controller.ready(request)
request-identity acknowledgement
early/armed/duplicate acknowledgement states
readiness gate
readiness-specific re-anchor
LandingHandle.retarget()
part of provisional-target machinery
```

and may improve correctness because landing geometry is measured against the already-committed destination rather than a DOM that is known to change underneath it.

The cost is serialization of commit latency and landing latency.

That must be measured.

### Framework helper

The Deferred/commit bridge is framework-specific, not necessarily a core drag concept.

The initial React integration should therefore live as documentation/reference code rather than kernel machinery.

A correct helper cannot simply mean:

```text
resolve on next useLayoutEffect
```

because an unrelated urgent commit can happen before the desired concurrent transition.

It must be tied to the expected committed state/operation, and should handle:

```text
unmount
abort
wrong/unrelated commit
never-committing transition
optional timeout
```

If this pattern proves common enough, it can later become a small framework package such as a React adapter.

**Attack:** measure serial vs parallel latency under normal and deliberately slow React commits. Construct Suspense, aborted transition, unrelated-commit and visual-remount cases.

---

# 8. Landing

Arbitrary consumer-owned landing runners are no longer considered worth their public lifecycle protocol.

Remove:

```ts
landing({ run });
```

The library owns landing through WAAPI.

The ordinary public shape should resemble a small subset of animation timing options:

```ts
landing({
  duration: 200,
  easing: 'cubic-bezier(.2, 0, 0, 1)',
});
```

Do not preserve custom spring ownership merely because it was once architecturally possible.

Dynamic duration also needs a real shape.

The current zero-argument:

```ts
duration: () => number;
```

cannot express its historical distance-scaled motivation because it receives no distance.

Current preference is therefore to keep a fixed numeric duration and add contextual timing later only when a real consumer requires it, potentially in a shape such as:

```ts
duration({ distance, from, to }): number
```

No decision on that future shape is needed now.

**Attack:** identify an existing required motion behavior that fixed WAAPI timing/easing genuinely cannot support.

---

# 9. Terminal result vs diagnostics

The current numeric runtime `FAILURE_*` exports should disappear from the ordinary consumer surface.

Use one error object:

```ts
class DraggableError extends Error {
  readonly code: DraggableErrorCode;
  readonly cause?: unknown;
}
```

Current preference is a small **string** consumer-facing code union.

Detailed kernel failure classification may still exist internally or in the advanced kernel-authoring API.

Do not freeze ordinary consumer codes around current pipeline stages.

Terminal business/domain outcome and diagnostic failure are different dimensions.

A useful simplification remains:

```ts
onFinish + onCancel
    ↓
onEnd(result)
```

because those are mutually exclusive domain terminal outcomes.

However, `onError` cannot simply be folded into exactly-once `onEnd`.

Counterexample:

```text
onEnd({ type: accepted })
    ↓
consumer's onEnd throws
    ↓
diagnostic error still has to be reported
```

Calling `onEnd` again would violate exactly-once and relabel a result already delivered.

Similarly, some failures happen before operation identity exists or after a domain result is already known.

Working model:

```ts
onEnd(result) {
  // exactly-once domain termination
}

onError(error) {
  // orthogonal diagnostics
}
```

The exact terminal union should be derived after lifecycle simplification rather than frozen now.

**Attack:** identify lifecycle paths where domain outcome itself truly becomes `failed` rather than a normal result plus diagnostic failure.

---

# 10. Faithful live-element lift remains intentional

The library continues to lift the consumer's actual rendered element rather than a clone.

Clone-based presentation can reduce internal restoration machinery but moves substantial complexity to consumers and changes semantics for:

```text
form controls
canvas/video
focus
custom elements
running state/animation
inherited CSS
framework identity
```

This is currently considered a high-value product guarantee rather than accidental machinery.

Do not reopen it during this API reduction unless executable evidence demonstrates that faithful lift is untenable.

---

# 11. Input behavior remains independently unresolved

Two ordinary consumer-facing behaviors still require browser probes:

- `pointerdown.preventDefault()` currently occurs before drag activation threshold;
- keyboard ingress may interfere with editable/interactive descendants.

These are release-level product behavior questions and should not disappear behind lifecycle refactoring.

Required probes include nested:

```text
button
link
input
textarea
contenteditable
slider
combobox
selectable text
```

plus modifier keys, IME composition and pointer-handle/keyboard interaction.

---

# Concrete API sketch A — imperative consumer

This is intentionally illustrative, not normative.

```ts
import { accept, landing, layoutAnimation, sortable, y } from '@ydinjs/drag';

let items = [...initialElements];

const controller = sortable(
  root,

  {
    itemCount: () => items.length,
    itemAt: (index) => items[index]!,

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

    onReorder(request) {
      items = applyReorder(items, request);
      render(items);

      return accept();
    },

    onEnd(result) {
      console.log(result);
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

// No updateItems().
// The next operation reads the current `items` through itemCount/itemAt.

void controller.destroy();
```

Questions this sketch makes visible:

- Is synchronous imperative `accept()` sufficient only if `render(items)` is itself synchronous?
- Does the pull source need to represent committed presentation rather than merely application data?
- Are `visual` and `box` correctly named and defaulted?
- Does fragment order communicate override semantics clearly?

---

# Concrete API sketch B — React consumer

Again, illustrative rather than normative.

```tsx
import { accept, landing, layoutAnimation, sortable, y } from '@ydinjs/drag';

function SortableList() {
  const [order, setOrder] = useState(['A', 'B', 'C', 'D']);

  const rootRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());

  // The drag source must describe committed DOM, not a render that
  // React may later abandon.
  const committedOrder = useRef(order);

  const commit = useCommitBarrier();

  useLayoutEffect(() => {
    committedOrder.current = order;
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
        itemCount: () => committedOrder.current.length,

        itemAt: (index) => {
          const id = committedOrder.current[index]!;
          return elements.current.get(id)!;
        },

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

        async onReorder(request, { signal }) {
          const current = committedOrder.current;
          const next = applyReorder(current, request);

          // Register before setState so the expected commit cannot
          // outrun the waiter.
          const committed = commit.waitFor(next, signal);

          setOrder(next);

          // The drag core waits only on ordinary consumer async work.
          await committed;

          return accept();
        },

        onEnd(result) {
          console.log(result);
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

    return () => {
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

Notably absent:

```ts
controller.ready(request);
controller.updateItems(items);
```

The controller does not own an independently synchronized long-lived collection.

The operation pulls committed DOM items when it needs a snapshot; the React helper handles the framework-specific fact that a requested state transition has actually committed.

The helper shown here is deliberately hypothetical. Its correctness requirements are part of the review:

```text
must identify the intended commit
must not resolve on unrelated commits
must abort on unmount / operation cancellation
must not wait forever without an explicit policy
```

---

# Fragment model, made explicit

For reviewers evaluating the feature/config proposal, the intended equivalence is approximately:

```ts
sortable(
  root,
  baseConfig,
  y(),
  xy(),
  landing({ duration: 200 }),
  layoutAnimation(),
);
```

conceptually becomes:

```ts
const fragments = [
  baseConfig,
  y(),
  xy(),
  landing({ duration: 200 }),
  layoutAnimation(),
];

const assembled = mergeSortableFragments(fragments);
```

with domain-aware rules such as:

```text
axis:
  y() then xy()
  → xy wins as one atomic capability

landing:
  later landing contribution replaces earlier landing capability

beforeMove:
  append all contributions in fragment order

afterMove:
  append all contributions in fragment order

retire:
  acquire in fragment order
  release in reverse order
```

The user should not need to know whether a first-party helper internally contributes one atomic slot or five pipeline hooks.

That is assembler responsibility.

---

# What should now be attacked

Do not spend the next review defending the current implementation or polishing this API.

Try to falsify the model above.

The highest-value targets are:

1. **Pull collection source**

   - Can `itemCount/itemAt` replace `updateItems()` without polling continuously?
   - Are there collection changes the operation must observe immediately but has no natural pull boundary for?
   - Does this actually improve virtualization, or merely hide the same synchronization problem?
   - Should collection identity eventually be separate from `HTMLElement` identity?

2. **Serial React commit**

   - Measure actual release→landing latency.
   - Test Suspense, abandoned transitions, unrelated urgent commits and unmount.
   - Test keyed DOM replacement/recycling of the dragged visual.
   - Determine what belongs in documentation/helper code vs core.

3. **Config-fragment merge**

   - Can lifecycle ownership remain coherent under last-wins replacement?
   - Are there fragments that require explicit before/after dependencies rather than simple positional order?
   - Does third-party authoring remain type-safe without exposing the current assembler internals?
   - Does the model accidentally make typo-driven override too silent?

4. **Deferred physical destroy**

   - Define the actual outermost execution bracket.
   - Prove panic/cancel/failure do not recreate physical teardown under an active stack.
   - Count which existing `live()`/stretch obligations really disappear.

5. **Placeholder acquisition**

   - Separate valid production ownership checks from unnecessary consumer babysitting.
   - Make preparation all-or-nothing with respect to library-authored mutations.

6. **`box` vs `visual`**

   - Find realistic layouts where the distinction helps.
   - Find layouts where it is still insufficient.
   - Determine the precise stability contract of the lifted visual.

7. **Kernel public authoring**

   - Build one non-sortable third-party behavior against the proposed low-level layer.
   - Measure how much kernel vocabulary genuinely has to become public.
   - Preserve atomic installation without exposing accidental internals.

Prefer executable counterexamples and small spikes over alternate complete architectures.

A proposed simplification should be considered successful only if it both improves the consumer model **and demonstrably deletes or localizes machinery rather than recreating equivalent machinery elsewhere**.
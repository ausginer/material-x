# Adversarial review of the API synthesis

Reviewed against `api-review-1-summary.md` at revision `0fe92bbf`. This review tries to falsify the synthesis, not complete its design. Findings are ordered by impact. Existing tests and probes are cited where they already execute the counterexample; otherwise a minimal falsifier is sketched.

## Verdict

The synthesis is not yet a safe basis for the next API. Its largest simplifications do not compose:

- serial commit-before-accept conflicts with cancel-on-active-`updateItems()` in the repository's own React integration;
- removing the readiness deadline turns a bounded missing-commit fault into an unbounded occupied drag;
- deferred physical teardown can remove statement-level I-36 checks, but it cannot remove transaction invalidation or all post-callback closed checks;
- trusting placeholder ownership in production permits a one-line consumer mistake to delete authored DOM;
- one `visual()` conflates logical layout geometry with the desired lifted presentation;
- exactly-once `onEnd()` cannot be the only error transport.

Several current mechanisms remain over-specified. In particular, the full readiness acknowledgement state machine, dense public collection versions, hostile thenable semantics, arbitrary landing-handle ownership, and fourteen public failure stages still look removable. The counterexamples below show that the proposed replacements need narrower guarantees of their own; they do not defend the current architecture wholesale.

## Findings

### 1. Blocker — the serial React recipe cancels itself

The proposed rules are mutually inconsistent:

1. `onReorder` authors state, awaits the authored commit, then returns `accept()` (summary lines 196–214).
2. `updateItems()` during any active operation cancels that operation (lines 164–174).

The actual React fixture's layout effect first publishes the committed element collection with `controller.updateItems(live)`, then signals that the commit is ready (`tests/sortable/react.browser.test.ts:181–223`). Replacing `ready()` with a Deferred produces the straightforward adapter:

```ts
async function onReorder(request) {
  setRows(apply(request));
  await authoredCommit.promise;
  return accept();
}

useLayoutEffect(() => {
  controller.updateItems(liveRows());
  authoredCommit.resolve();
});
```

`updateItems()` runs synchronously in the layout effect. The `await` continuation runs in a later microtask. Under the proposed collection rule the update therefore cancels the still-releasing operation before it can return `accept()`.

This is not avoidable by saying an authored reorder is not an update. The same tested commit can mount a new keyed row into the destination gap (`react.browser.test.ts:569–592`) or unmount/recycle the dragged row (`:594–688`). Those are real collection replacements which must become the controller's next collection.

**Required falsifier:** adapt the existing React fixture to serial acceptance and cancel-on-active-update. It should finish once, install the committed collection, and remain usable when the commit adds or removes a row. As written, it cannot.

A release-phase distinction is load-bearing even if active rebasing is deleted: pre-release updates may invalidate the operation; post-release publications must be allowed to install the next collection without rewriting the frozen proposal. The current code already makes that distinction (`src/sortable/spec.ts:691–703`).

### 2. Blocker — an awaited commit is neither bounded nor necessarily the right commit

Serializing readiness removes the second gate, but it does not remove commit failure modes. This handler never settles when a transition suspends forever, is abandoned, bails out because the state is unchanged, or the component unmounts before its effect:

```ts
async function onReorder(request) {
  startTransition(() => setRows(treeThatSuspendsForever(request)));
  await nextLayoutCommit();
  return accept();
}
```

The lifted presentation, placeholder, cancellation lifetime, and operation remain occupied indefinitely. The current readiness deadline explicitly bounds this condition (`src/kernel/kernel.ts:1188–1232`; executable cases in `tests/sortable/landing-space.browser.test.ts:296–330` and `tests/sortable/acknowledgement.browser.test.ts:315–329`). The exact 500 ms policy may be wrong, but removing the deadline from core merely requires every framework helper to rebuild timeout, unmount abort, and stale-operation handling.

A generic “next layout effect” can also acknowledge the wrong commit:

```ts
startTransition(() => setRows(reorderedRowsThatSuspend));
setSpinner(true); // urgent update commits first
```

An unqualified layout effect fires for the spinner commit and releases the Deferred while the list still has its old order. Landing then measures stale authored DOM. Request identity prevents one drag from acknowledging another; it does not prove that the observed commit contains the requested state. An executable helper must compare committed application state or a request-specific version, recreating some commit-specific bookkeeping.

**Required falsifiers:** a suspended transition plus urgent unrelated commit must not accept against the old list; an aborted/no-op transition and component unmount must not strand presentation.

### 3. High — serialization has a concrete latency and presentation-identity regression

The synthesis says there is no evidence that overlap matters (lines 220–222), but the repository's executable React placeholder probe already distinguishes the orderings. It found identical authoritative pins whether landing or readiness arrived first and concludes that delaying landing serializes the two for no final-position gain (`.plan/react-placeholder-probe.md:151–170`).

A simple timing test makes the product cost visible. Let the authored commit take 400 ms and landing take 200 ms:

- parallel gates: landing starts near release, finishes at 200 ms, and presentation releases when the commit arrives near 400 ms;
- serial semantics: the item remains at the released pointer for 400 ms, then starts landing and completes near 600 ms.

This is measurable by recording the first `visual.animate()` call. It is not merely “a little React latency”; a remote validation, Suspense boundary, or low-priority transition can make the pause conspicuous.

Commit-before-landing creates a second issue. The kernel captures the dragged visual once and later passes that same element to landing (`src/kernel/kernel.ts:1294–1308`). The React suite permits the accepting commit to unmount or recycle that element (`react.browser.test.ts:594–688`). Under serial semantics, landing can begin with `visual.isConnected === false`, or worse, animate a pooled element now representing a different record. Re-resolving candidate visuals on geometry rebuild does not refresh the dragged presentation.

**Executable falsifier:** in the recycling React case, assert at landing start that the visual is connected, still represents the dragged logical item, and belongs to the expected document/list. The synthesis currently has no guarantee that can make this pass.

This does not prove that the current two-call acknowledgement API should survive. It proves only that serial acceptance needs an explicit answer for responsiveness and dragged-visual replacement before its machinery savings can be counted.

### 4. High — deferred `destroy()` removes fine barriers, not transaction invalidation

The proposed logical-close-now/physical-retire-after-unwind rule is a sound weakening of statement-level I-36. It does not support the expectation that “most or all” liveness machinery disappears.

A valid fresh detached custom element can synchronously call `controller.destroy()` from `connectedCallback`. Inserting the placeholder invokes that reaction inside the activation transaction (`src/sortable/spec.ts:487–559`). If activation continues without a closed checkpoint, it can publish runtime state, listeners, or `onStart` after `destroy()` has already made the controller logically closed. That contradicts “no new work is admitted” and can leak consumer state:

```ts
class P extends HTMLElement {
  connectedCallback() {
    controller.destroy();
  }
}

onStart: () => {
  app.dragging = true; // must not run after logical closure
};
```

The same underlying rule applies to cancellation and classified failure, not only destruction. `onStart` can call `controller.cancel()`; the existing executable case is `tests/sortable/composition.browser.test.ts:561–588`. Physical retirement must wait for the activation seam to unwind, while a synchronous invalidation/checkpoint prevents the outer activation from committing ACTIVE state. Failure checkpoints have the same requirement.

The useful simplification is therefore narrower: stop checking after every getter, CSSOM write, and consumer-reachable DOM accessor. Retain checks at transaction publication and callback boundaries, plus an operation/attempt latch for queued continuations and acquisitions returned after logical close. Otherwise deferred teardown just changes when corrupt state becomes visible.

**Required falsifiers:** destroy/cancel from placeholder connection, `onStart`, `onReorder`, and finalization must never publish a later phase or invoke a later lifecycle callback after logical closure; resources returned by the triggering call must still be disposed after unwind.

### 5. High — making placeholder ownership validation development-only enables destructive DOM corruption

The production check the synthesis proposes dropping is small and high value. It rejects a placeholder that is the dragged item, its visual, non-element, or already connected (`src/sortable/placement.ts:154–170`). Without it, this ordinary typo hands an authored row to library teardown:

```ts
sortable(root, {
  placeholder: ({ item }) => item,
});
```

The library adopts the return, moves it as a placeholder, and eventually calls `remove()`, deleting consumer content. Returning another connected row has the same failure mode. The existing browser test around `tests/sortable/features.browser.test.ts:298–309` can be inverted to demonstrate the deletion if the check is removed.

This guard does not cause the large lifecycle state machine being targeted. It is one activation-time identity/connectivity branch that prevents destructive ownership confusion. The “fresh detached element” convention is still useful for subtler misuse, but it is too weak as the only production defense against deleting page DOM.

Also, custom elements show why a valid placeholder factory remains a legal source of synchronous reentrancy. Treating invalid ownership as consumer fault does not eliminate reactions from a fully compliant returned element.

### 6. High — unconditional cancel-on-update breaks virtualization and harmless republishes

Current collection reconciliation is narrower than the synthesis characterizes. It does not survive arbitrary mutations. It preserves only a destination gap whose identity neighbours still exist and remain adjacent (`src/sortable/collection.ts:66–123`). This pure check has concrete consumer value:

- a virtualizer mounts an overscan row below the held gap while auto-scrolling;
- an infinite list appends a page;
- collaborative state moves an unrelated item while the exact `A | B` destination gap survives;
- React republishes the same element refs after an unrelated render.

Canceling on every explicit update makes long-distance virtualized dragging self-cancel as soon as the window advances. A busy collaborative feed can starve every local drag. Even a same-items replacement during `handle()`/`visual()` admission would abandon a pending press or keyboard command; existing cases intentionally survive this (`tests/sortable/sortable.browser.test.ts:470–512`; `tests/sortable/keyboard.browser.test.ts:444–466`).

The current tests already distinguish safe from unsafe changes: unrelated changes with the incumbent gap intact continue, while a broken gap cancels (`tests/sortable/sortable.browser.test.ts:1649–1737`; `tests/sortable/composition.browser.test.ts:441–456`). Those are consumer scenarios, not internal-order curiosities.

Dropping dense public versions and much phase/reentrancy detail remains plausible. Dropping the exact-gap predicate should first pass an executable virtualized auto-scroll fixture where the mounted window changes during a drag.

### 7. High — “cancel, then replace” is reentrantly stale

The proposed ordering also regresses a simple last-write-wins invariant. Suppose outer `updateItems(V1)` invalidates the current drag. Its terminal cancellation callback observes a newer store state and reentrantly calls `updateItems(V2)`. If the outer call cancels first and publishes V1 afterward, it overwrites the newer V2:

```ts
controller.updateItems(V1);

onEnd = (result) => {
  if (result.type === 'canceled') {
    controller.updateItems(V2);
  }
};
```

The current effect deliberately publishes the replacement before consumer-observable cancellation (`src/sortable/spec.ts:850–875`), and `tests/sortable/sortable.browser.test.ts:1670–1691` pins the base publish-before-cancel ordering. The nested-V2 script above is the additional discriminating case. Gap rebasing and dense versions can disappear without reversing this order. At minimum, the collection visible from the terminal callback must already be V1 so that a nested V2 remains the final publication.

### 8. High — one `visual()` cannot represent both layout footprint and lifted presentation

The single-box guarantee fails for composite logical rows. Consider:

```html
<x-row style="display: contents">
  <div class="row-box">
    <!-- 200 × 120 layout/candidate box -->
    <article class="card">…</article>
    <!-- 160 × 40 desired preview -->
    <aside>expanded controls that must remain in the list</aside>
  </div>
</x-row>
```

Candidate centres and placeholder sizing must use `.row-box`; lifting and landing only `.card` is the intended product behavior. Resolving `.row-box` removes live controls and produces an oversized preview. Resolving `.card` measures wrong candidate centres and creates a 40 px placeholder for a 120 px footprint, collapsing flow by 80 px.

An executable geometry fixture with 100 px rows and 20 px top-aligned card visuals makes the error deterministic: candidate centres become 10/110/210 instead of 50/150/250, and placeholder insertion shifts subsequent rows by 80 px.

Tables (`<tr>` geometry with a liftable inner surface) and virtualized transformed wrappers have the same distinction. The current single mapping may remain the default shorthand, but the synthesis cannot preserve it as the only semantic mapping while claiming support for arbitrary logical/rendered structures.

### 9. High — a single exactly-once terminal callback cannot be the only failure channel

There are at least three failures with no coherent `onEnd({type: 'failed'})` representation:

1. Admission throws inside an event handler before operation identity exists. This is not synchronous API misuse, but there is no operation to end. The executable case reports the error and keeps the controller reusable (`tests/kernel/kernel.browser.test.ts:890–913`).
2. `onEnd()` itself throws. Calling `onEnd(failed)` again violates exactly-once; not calling it leaves the exception unreported. The current executable case proves retirement and a separate report (`kernel.browser.test.ts:2161–2177`).
3. A disposer, animation cancellation, or telemetry hook can fail without changing an already accepted domain outcome.

A terminal result also cannot flatten business outcome and presentation failure. In `kernel.browser.test.ts:2138–2158`, consumer data is already accepted, then the final renderer pin throws. The consumer must not treat that as a rejected reorder and roll back persisted state. The current failure context retains the accepted domain (`src/sortable/spec.ts:1191–1198`) precisely because outcome and presentation health are orthogonal.

Coarser string error codes are still justified; fourteen internal stages need not remain public. But the proposed transport needs both an operation terminal channel and a nonterminal/platform diagnostic channel, and a failed terminal result must preserve whether consumer data was already accepted. Exactly-once should describe domain termination, not every exception the library can observe.

### 10. High — removing custom landing contradicts an explicit product requirement and does not remove core landing lifecycle

The synthesis says physical springs are not important enough for the first stable API (lines 141–154), but the governing brief explicitly requires a custom runner for motion CSS timing functions cannot express and says a physical spring must not be architecturally impossible (`.plan/brief.md:396–412`). This is not a speculative feature unless that requirement is deliberately rescinded.

There is also a narrower realistic capability missing from fixed duration/easing: distance-dependent motion. A fixed 200 ms duration makes a 20 px drop travel at roughly 100 px/s and a 400 px drop at 2,000 px/s. Easing changes the velocity curve, not that scale. The current landing context exposes `from` and `target`, so a runner can choose duration or spring parameters from distance (`src/kernel/kernel.ts:1294–1308`); the existing duration thunk receives no such context.

Finally, library ownership removes hostile consumer-handle cases, but not the entire landing protocol. `animate()` and `Animation.finished` remain fallible; cancel can race completion; stale completion must not settle a newer operation; final target measurement, authoritative pin, and presentation release remain. Those duties are visible even in the built-in path (`src/sortable/landing.ts:115–187`; `src/kernel/kernel.ts:1363–1459`). The simplification should be measured as deletion of public runner ownership, retarget negotiation, and hostile-handle defense—not of attempt identity or landing completion lifecycle.

**Required falsifiers:** a long- and short-distance product motion should meet the same intended speed/feel; cancel/destroy racing `finished` must not finalize stale work; and the explicit spring requirement must either pass or be formally withdrawn.

### 11. Medium — preserving both raw kernel authoring and custom features retains much of the architecture being charged to wrappers

Direct typed built-in slots improve the common API and remove invalid first-party combinations. They do not, by themselves, remove assembly ordering, resource unwind, collision policy, or lifecycle views if arbitrary third-party sortable features remain supported.

A realistic `autoScroll()` feature needs pointer-frame ordering, scroll listeners/rAF ownership, geometry invalidation after scroll, access to the active operation, and reverse-order teardown. Questions that direct slots do not answer include:

- does built-in `layoutAnimation` run before or after custom invalidation?
- may a feature replace a direct `visual`/insertion slot, or only observe it?
- if feature installation throws after acquiring a listener, who unwinds it?
- how are two features claiming the same write phase rejected or ordered?

The feature API may be much smaller than the current branded wrappers, but supporting author-authored features means these policies remain on the advanced path. The synthesis should not count all of `assemble` as removable before an executable custom feature of this kind can be authored and retired safely.

The public-layer proposal has a related inversion. Current `draggable(root, behavior)` is the atomic construction barrier: it creates the kernel, lets the behavior return spec and controller together, then arms ingress exactly once (`src/drag.ts:49–71`; `src/kernel/spec.ts:406–450`). A behavior cannot accidentally admit input before installation completes. If completely custom behaviors remain a requirement, exposing a lower-level raw kernel while hiding this safe installer may enlarge and freeze more lifecycle architecture than retaining the opaque boundary.

**Executable falsifier:** implement one third-party behavior twice—through the proposed raw kernel and through the current behavior installer—and compare which kernel states/types must become public and which invalid installation sequences are expressible. There is real public `draggable()` value unless the lower layer preserves the same atomic installation property.

### 12. Medium — an “immutable proposal” of mutable/recyclable elements is only structurally immutable

The preserved guarantee says one immutable release proposal (lines 286–302), but item identity is currently `HTMLElement`. Freezing the proposal does not freeze the semantic identity of a recycled element:

```ts
const element = document.createElement('div');
element.dataset.id = 'A';
const proposal = Object.freeze({ item: element });

element.dataset.id = 'Z'; // virtualizer reuses its pooled node
console.assert(proposal.item.dataset.id === 'Z');
```

An async consumer can now apply a request that structurally names the same node but semantically names a different record. Cancel-on-update only helps if every recycler publication happens before recycling and is allowed to cancel; skipping it leaves the proposal wrong, while unconditional notification makes cross-window dragging impossible.

The preserved guarantee therefore needs to be stated as structural immutability unless the API also requires element identity to remain bound to one logical item through settlement, pins the node, or carries stable domain identity. This matters before `ReorderRequest` is minimized.

Neighbour anchors also have independent consumer value beyond internal rebasing. If release captures moving `a` from `[a,b,c,d]` to the gap `c | d`, then a remote insert produces `[x,a,b,c,d]` before the handler applies. Captured indices can move `x` or target the wrong live gap; stable item identity plus anchor `d` still expresses `[x,b,c,a,d]`. The synthesis correctly defers request redesign, but collection simplification is not evidence that anchors are disposable.

### 13. Release blocker — input semantics need the promised executable probes before the larger rewrite

The synthesis correctly leaves early pointer `preventDefault()` and keyboard ingress unresolved (lines 273–282). These are ordinary consumer failures with higher reach than most lifecycle edge cases, so they should be explicit release blockers rather than questions deferred behind architecture work.

Minimum browser probes:

- pointerdown/up below threshold on a nested button, link, text input, selectable text, and focusable row preserves focus, click, and selection;
- a real drag still activates reliably under the required `touch-action` policy;
- ArrowLeft/Right/Up/Down in input, textarea, contenteditable, slider, and combobox descendants does not reorder or prevent the native action;
- modified keys and IME composition are ignored;
- pointer handle policy does not accidentally make keyboard operation dependent on focusing a non-focusable pointer handle.

Until these pass, preserving the current input guarantees is unsupported. Conversely, no lifecycle simplification should be credited with fixing them accidentally.

## What survived the attack

The review did not find a consumer reason to preserve the current fourteen-stage public failure taxonomy, exact `ready(request)` arrival table, dense public collection versions, or statement-level interruption after every consumer-reachable DOM operation. Those remain strong simplification candidates.

The evidence does support narrower guarantees that the synthesis should carry forward:

- logical close/cancel is synchronous at transaction boundaries; physical teardown may wait for unwind;
- release freezes the current proposal, while post-release collection publication may prepare the next operation;
- collection replacement is visible before any cancellation callback it triggers;
- cheap production ownership checks prevent destructive placeholder adoption;
- terminal domain outcome and diagnostic failures are distinct dimensions;
- operation/landing attempt identity remains necessary even with library-owned animation;
- React commit evidence must be operation-specific, bounded/abortable, and compatible with collection publication;
- logical geometry and dragged presentation may be different boxes.

These are smaller than the present implementation's guarantees, but strong enough to survive the concrete consumers above.
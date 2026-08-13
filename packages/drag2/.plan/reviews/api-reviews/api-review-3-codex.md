# Adversarial review of API redesign synthesis v2

Reviewed against `api-review-2-summary.md` at revision `0fe92bbf`. This review attacks the working model rather than proposing a replacement. Findings are ordered by consumer impact and use existing executable cases where possible. A focused baseline run of the React, sortable, assembler, and kernel browser suites passed 298/298 tests.

## Verdict

The model corrects several problems from the previous round, but its central pieces still do not compose safely.

The most serious failures are:

- reference-only pull snapshots cannot observe same-node recycling, internal `box()` replacement, or geometry changes;
- pull delivery cannot promptly reconcile a stationary drag without reintroducing polling or push invalidation;
- aborting a React commit waiter does not cancel the state transition already scheduled, so a canceled drag can reorder later;
- measuring after a React commit does not make an unmanaged placeholder semantically correct;
- the motivating `box !== visual` example double-counts the layout that remains after only the visual is lifted;
- field-wise last-wins merging cannot replace a lifecycle capability atomically;
- some post-`onStart` failures are genuinely terminal outcomes, not diagnostics orthogonal to `onEnd`.

The new model can still delete public `updateItems()`, readiness acknowledgement states, numeric failure exports, and statement-level I-36 barriers, but only after it states which guarantees are being weakened and demonstrates that the replacement mechanisms are smaller. As written, several mechanisms are moved into undocumented consumer adapters or recreated behind fragment/pull abstractions.

## Findings

### 1. Blocker — reference-only pull cannot observe same-node semantic or geometry changes

The proposed change detector compares `itemCount()` and item element references by index (`api-review-2-summary.md:503–521`). Two common changes are invisible to that test.

First, a virtualizer can reuse the same mounted node for a different record:

```ts
const nodes = visiblePool;

// No array position or HTMLElement identity changes.
nodes[0]!.dataset.id = 'record-Z'; // previously record-A
```

Every `itemAt(i)` remains `Object.is`-equal to the operation snapshot, yet `request.item`, `before`, and `after` now name different domain records. An “immutable proposal” containing the element is structurally immutable but semantically mutable.

Second, React can retain a stable item host while replacing or resizing its rendered box:

```tsx
<x-row key={id}>
  {expanded ? <ExpandedBox data-drag-box /> : <CompactBox data-drag-box />}
</x-row>
```

The collection scan sees the same `<x-row>` references and reports no change. The geometry cache then remains warm and does not call `box()` again. The current rect index deliberately performs no work when its dirty/version keys are unchanged (`src/sortable/rect-index.ts:122–128`), with executable contracts in `tests/sortable/y.browser.test.ts:246–265` and `tests/sortable/xy.browser.test.ts:303–319`. Today, even `updateItems([...sameHosts])` advances snapshot identity and invalidates geometry (`src/sortable/spec.ts:850–867`). The pull model removes that explicit invalidation path.

The same problem occurs for image/font loading, expansion, CSS changes, or an inner-box remount that changes geometry without changing item identity. Re-reading boxes on every scan would detect it, but that changes the proposal from cheap reference comparison into an O(n) consumer-callback/layout path.

**Executable probes:**

1. Keep item references/order fixed, replace `[data-drag-box]`, move its centre across the pointer, and dispatch another spatial frame. The insertion must change.
2. Rebind a pooled node from record A to Z without changing the node array. A released proposal must still identify A, not Z.

The stated algorithm cannot pass either probe. It needs an explicit weaker contract or another identity/invalidation source.

### 2. Blocker — a stationary drag has no pull boundary

Pull delivery does not provide invalidation, which the synthesis acknowledges (`api-review-2-summary.md:503–523`). That is not just an implementation detail; it loses prompt cancellation.

Concrete sequence:

```text
1. Drag B to the identity gap C | D.
2. Stop moving the pointer.
3. A remote commit changes the list to A B C X D E, or removes B.
4. Wait two animation frames without pointer, scroll, or window resize events.
```

No natural callback re-reads the source. The placeholder continues advertising a gap that no longer exists, or the operation remains live after its dragged item was removed. With faithful live lift, a framework can disconnect the actual lifted node while the placeholder and input operation remain active.

Current `updateItems()` cancels synchronously when the gap or item disappears (`src/sortable/spec.ts:691–750,850–875`; `tests/sortable/composition.browser.test.ts:458–481`; `tests/sortable/sortable.browser.test.ts:1767–1776`). Current scroll/resize handling only marks geometry dirty and does not schedule a spatial action (`src/kernel/invalidation.ts:17–35`; `src/sortable/spec.ts:563–577`), so those listeners do not supply a general collection heartbeat either.

Scanning on every animation frame is continuous polling. Adding a collection-change callback/version/subscription is push invalidation under another name. Waiting until pointerup prevents a wrong request, but explicitly weakens active-presentation and prompt-cancellation guarantees.

**Executable probe:** after the final pointer frame, remove the dragged item through a remote render and wait without further input. Assert when cancellation occurs, when the placeholder disappears, and whether the terminal callback waits until pointerup. The model must choose that observable timing rather than claim pull preserves current reconciliation value.

### 3. High — pull moves synchronization and a new O(n) callback boundary into every integration

The source must describe committed DOM, not merely authoritative application data. The React sketch therefore maintains a second `committedOrder` mirror (`api-review-2-summary.md:858–883`). Any batched imperative, Web Component, or external renderer needs the same discipline:

```ts
items = remoteNext; // pull source now reports the new order
renderer.schedule(items); // DOM commit happens next frame
root.dispatchEvent(new Event('scroll'));
```

A pull between those statements reconciles against new data and measures old DOM. The controller no longer owns a synchronized copy, but every asynchronous renderer now has to own a committed copy plus a commit publication rule. The synchronization problem has moved and become implicit.

The scan itself also changes the warm hot path. A clean rect index currently returns in O(1) with respect to collection size and performs neither layout nor a list walk (`src/sortable/rect-index.ts:122–128`). Calling `itemCount()` plus every `itemAt(i)` at each interaction/geometry boundary is O(n) arbitrary consumer calls even when nothing changed. “References are cheaper than geometry” compares against the wrong baseline: warm pointer frames currently do no geometry pass at all.

Those callbacks need a production contract and failure policy. The conceptual implementation executes `new Array(itemCount())`; negative, fractional, infinite, and `NaN` counts all throw `RangeError`. Items can be missing, cross-realm, duplicated, or change during the synchronous scan:

```ts
const rows = [a, b];

const itemAt = (index: number) => {
  if (index === 0) {
    const first = rows[0]!;
    rows.reverse();
    return first;
  }

  return rows[index]!;
};

// One pull yields [a, a].
```

Current snapshot construction validates uniqueness once at the explicit boundary (`src/sortable/collection.ts:25–52`). Pull repeats validation/classification/reentrancy concerns at admission, active frames, and release. If any getter calls `cancel()` or `destroy()`, either the loop continues invoking consumer callbacks after logical closure or it restores per-item closed checks that the destroy simplification is intended to remove.

**Required measurements/probes:** count `itemAt` calls over 1,000 warm pointer frames at 800 and 10,000 mounted items; test invalid counts, duplicates, a throw, cancellation, destruction, and mutation during the scan at admission, active motion, and release.

### 4. Blocker — aborting a React waiter does not cancel the authored state update

The React handler schedules state before it awaits the commit barrier (`api-review-2-summary.md:900–913`):

```ts
const committed = commit.waitFor(next, signal);
setOrder(next);
await committed;
return accept();
```

Now let the update suspend. While the resolution is pending, Escape or `controller.cancel()` aborts `signal`; current semantics explicitly allow cancellation during the consumer round-trip (`tests/sortable/sortable.browser.test.ts:1267–1282`; resolver abort is exercised in `tests/kernel/kernel.browser.test.ts:1430–1445`). The helper can reject its waiter, but it cannot unschedule React's update:

```text
t0  startTransition/setOrder(nextThatSuspends)
t1  Escape aborts waitFor; onEnd reports canceled
t2  Suspense data resolves
t3  React commits next anyway
```

The application observes a canceled drag whose authored reorder appears later. A timeout has the same split-brain outcome: the operation fails at 500 ms and the UI commits at 600 ms. Unmount abort prevents a waiter leak but likewise does not undo state already sent to an external store or server.

This failure becomes ordinary under serial semantics because waiting for a framework commit is the recommended `onReorder` implementation rather than an exceptional long-running resolver. An adapter needs state supersession/rollback semantics, or the core must stop promising cancellation once consumer application begins. A Deferred plus `AbortSignal` alone cannot provide either behavior.

**Executable probe:** suspend the accepting transition, cancel the live resolution, then resolve Suspense. Assert both the terminal result and final authored order. The sketch currently produces `canceled` plus reordered DOM.

### 5. Blocker — post-commit measurement does not make the placeholder semantically correct

The model expects serial commit to remove the readiness-specific re-anchor and provisional-target machinery (`api-review-2-summary.md:567–580`). Existing executable evidence falsifies that implication.

In `.plan/react-placeholder-probe.md:42–75`, React accepts a reorder and mounts a new keyed item into the destination gap. React leaves the unmanaged placeholder connected but on the wrong side of the new item. Its post-commit rectangle is accurate for the wrong semantic gap. Measuring later therefore produces a confidently wrong landing target.

The probe's repair uses the React-owned dragged item as an authoritative semantic anchor after the commit (`.plan/react-placeholder-probe.md:108–149`). That repair is independent of whether landing ran in parallel or serially; final measurement timing alone does not replace it. The current behavior performs the corresponding destination re-anchor before authoritative measurement (`src/sortable/spec.ts:1207–1264`).

Serial landing also starts after the accepting commit has had an opportunity to unmount, reparent, or recycle the captured visual. The current React suite exercises unmount/recycle cases (`tests/sortable/react.browser.test.ts:594–688`). The new model declares exact visual-node stability to be a consumer constraint (`api-review-2-summary.md:368–370`), but neither usage sketch enforces or validates it. A row that swaps its inner visual on accepted state can make landing animate a disconnected element or a pooled element now representing another record.

**Executable probes:**

- reuse the “new keyed item in the destination gap” fixture with serial acceptance and no re-anchor; assert the placeholder is adjacent to the authored dragged item before landing measurement;
- replace or recycle `[data-drag-visual]` in the accepting commit; at landing start assert it is connected and still represents the dragged record.

Removing `ready(request)` remains plausible. Removing semantic re-anchoring and visual-stability handling does not follow from serialization.

### 6. Blocker — `box()` and `visual()` do not make the motivating composite-row example coherent

The split correctly recognizes that geometry and presentation can be different nodes. The stated mechanics are insufficient for the example used to justify it (`api-review-2-summary.md:310–370`).

Suppose `.row-box` contains a 40 px `.card` and 20 px `<aside>`. Faithful lift makes `.card` `position: fixed`, removing only that card from flow (`src/kernel/presentation.ts:423–428`). The `<aside>` and its enclosing `.row-box` remain in layout. A full 60 px placeholder sized from the pre-lift `.row-box` is then inserted after the logical item. The list occupies the remaining 20 px plus a 60 px placeholder: 80 px for a row whose original footprint was 60 px.

There is also an anchor-offset problem. If the box begins at x=100 and its inner card at x=120, a destination box at x=300 implies the card should land at x=320. Landing the visual at the placeholder/box origin loses the 20 px visual-within-box offset.

**Browser probe:**

```html
<x-row style="display: contents">
  <div class="row-box" style="padding-left:20px">
    <article class="card" style="height:40px">card</article>
    <aside style="height:20px">controls</aside>
  </div>
</x-row>
```

Record root height and `card.left - rowBox.left` before activation, after lift plus placeholder insertion, and after landing. The model should preserve both values. A second measurement element alone cannot do so because it does not describe the footprint actually removed or the visual's offset within that footprint.

The proposed default `box = visual` is also unsafe precisely when consumers customize `visual`. For a 72 px `<li>` with a 40 px inner button/card, configuring only `visual` silently creates 40 px candidate geometry and placeholder footprint. The split's common default recreates the original conflation in its most likely opt-in case.

### 7. High — field-wise fragment merging cannot preserve atomic lifecycle ownership

The merge algebra says atomic capabilities are replaced, hooks append, and retirement reverses (`api-review-2-summary.md:139–155,1015–1034`). A single fragment can contribute all three kinds. Field-wise rules cannot infer which contributions belong together.

```ts
function snapAxis() {
  const cache = makeCache();

  return {
    axis: snapResolve(cache),
    beforeMove: () => cache.begin(),
    afterMove: () => cache.play(),
    retire: () => cache.dispose(),
  };
}

sortable(root, base, snapAxis(), y());
```

If `y()` replaces only `axis`, `snapAxis`'s hooks survive and run even though their resolver never initialized the cache. If the assembler drops the entire earlier fragment, it also drops hooks that may have been independently append-only. If it retains the losing cache until controller teardown, a superseded capability consumes state for the controller's lifetime. Retiring it immediately requires knowing which cleanup belongs only to the replaced axis.

Current `InsertionGeometry` packages `resolve`, `invalidate`, `measure`, and `retire` as one ownership unit (`src/sortable/feature.ts:43–80`) and flattens it only after assembly (`src/sortable/assemble.ts:147–155`). The current collision tests also demonstrate that a losing factory has already allocated state and must be retired (`tests/sortable/assemble.browser.test.ts:329–359`). Last-wins changes the policy, not the need to track contribution provenance.

There are smaller atomicity failures in the plain slots:

```ts
sortable(
  root,
  { itemCount: () => A.length, itemAt: (i) => A[i]! },
  { itemAt: (i) => B[i]! },
);
```

The final count belongs to A and the elements to B. Likewise, if `box` is defaulted from an early `visual` and a later fragment overrides `visual`, the model must say whether `box` follows the final visual or remains bound to the earlier one. Defaults must be derived after the complete merge and paired sources must be atomic.

**Executable fragment probes:** replace a stateful axis that also contributes hooks; compose two FLIP-like after-move writers on the same rows; override only one collection-source function; and reuse a fragment in two controllers while destroying one. These should precede implementation of generic last-wins semantics.

### 8. High — ordered multi-writer hooks are not automatically composable

Positional order expresses call order but not dependency or isolation. Two displacement features illustrate the problem:

```text
before A: record row top
before B: record the same top
placeholder moves
after A: measure delta and start an additive translation
after B: measure while A's new translation is already visible
```

B can observe A's presentation offset and compute zero or a corrupted delta. Reversing the after order merely changes which feature wins. The current `layoutAnimation()` writes a WAAPI `translate` during `afterInsertionMove` (`src/sortable/layout-animation.ts:212–307`), so this is executable by composing it with a second FLIP-like custom feature over the same elements.

Similarly, a restriction feature may need to wrap or veto the selected axis resolution before placeholder movement. Last-wins can replace the axis and append-only before/after hooks run too late; positional order alone cannot express “decorate the current capability.” An `autoScroll` feature needs to invalidate geometry after scroll and coordinate with displacement measurement, not merely choose a place in one flat callback list.

Dogfooding `layoutAnimation()` proves that one feature can use the hooks. It does not prove that unrelated third-party writers compose safely. The public extension claim should be tested with at least one feature that depends on or wraps another capability, and with two features that touch the same rows.

### 9. High — fragment factory/reuse semantics and the custom-feature surface are still missing

The synthesis calls plain objects, `y()`, `landing()`, and third-party features all fragments, but does not say when a stateful fragment is instantiated. This matters for an ordinary reusable preset:

```ts
const axis = y();
const a = sortable(rootA, configA, axis);
const b = sortable(rootB, configB, axis);

void b.destroy();
// A's cache and hooks must remain live.
```

If `y()` contains one cache/retire closure, the two controllers cross-contaminate. Current `y()` returns a factory and creates its rect index when that factory is invoked per controller (`src/sortable/y.ts:80–85`; `src/sortable/assemble.ts:64–67`). The new public model needs the same explicit factory/reuse guarantee or must reject reuse.

More fundamentally, `customFeature()` is not yet an API proposition. No public sketch defines its factory signature, root/realm context, hook views, operation lifetime, failure channel, abort behavior, or means of contributing an ownership group. The current authoring type is deliberately closed and unconstructible outside the package (`src/sortable/feature.ts:170–200`). A feature-utils path name does not demonstrate that a third party can compile a nontrivial feature without importing assembler internals.

**Compile/runtime probe:** author a third-party feature that captures pre-move geometry, schedules one rAF, invalidates the selected axis after scroll, and cancels/releases everything on operation and controller teardown. Reuse one feature value across two controllers. Until this works with only declared public imports, “supported custom sortable features” remains an untested requirement rather than a preserved capability.

### 10. High — the low-level installer pseudocode cannot construct its controller or host-bound spec as written

The model sketches:

```ts
const spec = assembleSortable(config);
return draggable(root, spec);
```

and low-level `draggable(root, { /* parts */ })` (`api-review-2-summary.md:57–76`). A static spec built before `draggable` has no `KernelHost`. It therefore cannot:

- create controller methods backed by `host.dispatch`, `host.cancel`, or `host.destroy`;
- assemble features using the root's `realm` and `root`;
- infer an arbitrary custom controller as `draggable`'s return type.

Current assembly happens inside the host factory for exactly this reason (`src/sortable/behavior.ts:9–15,58–72`). The atomic handshake is `BehaviorFactory(host) -> { spec, controller }`, and only after it returns does `draggable` arm input (`src/kernel/spec.ts:406–424`; `src/drag.ts:63–71`).

**Compile-design probe:** implement a custom behavior controller with `setPolicy()` dispatching a behavior action and `destroy()` delegating to the host, plus one root/realm-dependent feature. Attempt to express it through the proposed object call while preserving “complete before arm.” If `draggable` must instead accept a callback from host to `{spec, controller}`, that is substantively the existing factory boundary even if its public naming/types change.

The public raw kernel may still be worthwhile, but the displayed API does not currently preserve the property it claims.

### 11. High — consequential failures after `onStart` are true terminal outcomes

The model keeps `onEnd` for accepted/noop/rejected/canceled domain outcomes and `onError` for orthogonal diagnostics (`api-review-2-summary.md:680–722`). That division fails before a business outcome exists.

```ts
onStart() {
  app.dragging = true;
}

onEnd() {
  app.dragging = false;
}

onError(error) {
  telemetry.capture(error);
}
```

If the active renderer write, insertion resolver, placeholder move, or release geometry throws after `onStart`, the operation is over but no normal domain result exists. The current executable renderer-write case emits only `onError`, with no finish/cancel callback (`tests/sortable/sortable.browser.test.ts:1284–1301`; `src/sortable/spec.ts:1191–1199,1272–1276`). Under the sketch above, `app.dragging` remains stuck forever.

This is meaningfully different from:

- admission failure before operation identity, which is controller-level diagnostic only;
- `onEnd` itself throwing, where the already delivered result must not be relabeled;
- a final pin/presentation failure after the consumer's accepted state committed, where acceptance remains real even though presentation failed.

At least pre-domain consequential failure must produce a terminal indication correlated to the started operation, whether that is `onEnd({type: 'failed'})` or an explicit terminal bit on the error channel. The sketch's `onError(error)` has neither operation correlation nor terminality, so consumers cannot clear one busy state exactly once.

**Executable callback-order probe:** record `onStart`, `onEnd`, and `onError` for admission throw, active renderer throw, resolver rejection, landing/pin failure, and throwing `onEnd`. Every delivered start must have one observable terminal end; diagnostics after an already delivered end must not produce another.

### 12. High — one execution-depth bracket cannot defer every resource needed for immediate logical close

The synthesis correctly retains transaction publication checks, but “logical close immediately; physical teardown after unwind” needs more than a depth counter around queue drains.

Relevant entry points include native admission, nested synchronous event dispatch, rAF callbacks, thenable callbacks, WAAPI `finished`, public cancellation, failure reporting, and teardown itself. Current teardown synchronously aborts signals and invokes LIFO disposers, feature retirement, placeholder removal/custom-element reactions, style restoration, and ingress abort (`src/kernel/lifetimes.ts:90–109`; `src/kernel/kernel.ts:464–525`). Any of those can run consumer-reachable code.

There is also a direct conflict between deferred resource teardown and “no new work.” A custom feature can own a native listener registered to an operation signal. If `destroy()` only marks the controller closed and leaves that signal/listener physically live until the outer transaction returns, a later synchronous `dispatchEvent()` in the same stack invokes the feature listener. Unless every feature callback checks the logical-close latch or routes all work through a closed host, new feature work occurs after logical closure. Aborting the signal immediately solves that, but `AbortController.abort()` is itself synchronous physical teardown and invokes abort algorithms/listeners.

Cancellation/failure machinery also remains independent of destruction. `onStart -> cancel()` must invalidate activation synchronously and settle after the seam (`src/kernel/kernel.ts:870–882,1901–1916`; `tests/sortable/composition.browser.test.ts:561–588`). Cancel/failure precedence, the admission no-drain boundary, hostile/late thenables, and attempt identities still remain. A central bracket removes fine I-36 stretches; it does not replace these state-machine obligations.

**Required probe matrix:** invoke destroy/cancel from admission getters, pull getters, placeholder connection, `onStart`, a feature listener, an abort listener, a promise callback, WAAPI completion, `onError`, and a teardown disposer. Assert no later phase/callback is published, no logically closed listener does feature work, teardown occurs exactly once, and all returned destroy tokens settle. Also define whether teardown failures reject `destroy()`; both sketches use `void controller.destroy()`, which would turn rejection into an unhandled promise.

### 13. Medium — placeholder rollback remains a mutation lease, not merely better sequencing

The synthesis correctly separates ownership validation from the library's own acquisition safety (`api-review-2-summary.md:248–306`). The proposed all-or-nothing statement still understates the retained machinery.

A discriminating valid factory is:

```ts
let retained: HTMLElement;

placeholder: () => {
  controller.cancel();
  retained = document.createElement('x-placeholder');
  return retained;
};
```

Cancellation does not logically destroy the controller. Current placeholder mechanics therefore proceed to write `data-drag-placeholder`, `aria-hidden`, `slot`, `boxSizing`, width, and height (`src/sortable/placement.ts:48–114`). The activation preparation is later invalidated, so its effect never adopts/inserts the node. The consumer-retained detached element keeps partial library state.

Registering rollback before the first write requires capturing and restoring every pre-existing attribute/style value and running the lease on prepare invalidation, cancellation, failure, and destroy. A throwing custom-element setter can fire reactions that restoration cannot undo. Moving mechanics after insertion instead exposes a connected but temporarily unmechanized element and its connection reaction.

This is localizable and far smaller than general I-36, but it should be counted as a mutation journal/lease with executable partial-write tests, not described as a cost-free acquisition discipline change.

### 14. Medium — landing capability is removed at the high level but retained or contradicted elsewhere

Fixed library-owned WAAPI landing removes consumer-handle misuse from the ordinary sortable API. It does not eliminate arbitrary landing ownership if the supported public kernel keeps the current settlement seam: `SettlementScope.holdForLanding(start)` accepts arbitrary `LandingStart`, including returned `destroy`/`retarget` handles (`src/kernel/spec.ts:232–289`). The kernel must then retain synchronous `done/fail`, stale-callback, returned-handle disposal, and transform-relinquishment machinery (`src/kernel/kernel.ts:1142–1459`). A public sortable feature that can contribute `startLanding` reopens the same surface.

Even with WAAPI-only ownership everywhere, landing still needs attempt identity, `animate()`/`finished` acquisition rollback, cancel-vs-completion handling, final authoritative measurement, relinquish-before-pin ordering, presentation release in `finally`, and stale-completion rejection (`src/sortable/landing.ts:115–187`; `src/kernel/kernel.ts:1363–1459`). Serial commit removes readiness-time retargeting and one provisional window, not the landing transaction.

The capability deletion also contradicts the active product brief, which requires CSS-driven landing and a custom runner for physical springs (`.plan/brief.md:396–412`). Fixed duration/easing cannot express a distance-scaled velocity either: 20 px and 400 px drops both taking 200 ms imply roughly 100 px/s versus 2,000 px/s. If those requirements are intentionally rescinded, the model should say so; otherwise the high-level API loses a specified consumer capability while the advanced API may still pay the machinery cost.

**Executable probe:** implement the required physical spring and CSS-driven landing using only supported public v2 surfaces. Separately assert reduced-motion collapse, cancel during `finished`, and final pin after destination geometry changes during a 10-second animation.

### 15. Medium — the usage sketches omit or misstate several required lifecycle details

These are individually smaller, but they prevent the sketches from serving as executable evidence.

#### Explicit rejection is absent

Both sketches import only `accept`, and v2 never names a `reject` constructor despite preserving explicit `ReorderResolution` (`api-review-2-summary.md:527–545,774–934`). A permission/validation rejection is not an exception:

```ts
onReorder(request) {
  if (!permissions.canMove(request)) {
    return reject('forbidden');
  }

  return accept();
}
```

Without a valid rejection value, returning `undefined` becomes an invalid resolution and throwing misreports a business decision through `onError`.

#### React teardown occurs after DOM removal

The React sketch installs and destroys the controller in passive `useEffect` (`api-review-2-summary.md:869–938`). On unmount, React removes host nodes and clears callback refs during the mutation phase before passive cleanup. An active faithful visual and placeholder can therefore be disconnected while pointer/cancel listeners and drag-owned styles remain live. The repository's React fixture deliberately destroys the controller before `root.unmount()` (`tests/sortable/react.browser.test.ts:372–379`).

The hypothetical `useCommitBarrier` must also return a stable object forever because it is captured by an empty-dependency effect. Matching only the expected `order` is insufficient: a Suspense fallback can commit that state while destination row refs/boxes are absent, and React may coalesce the reorder with another valid update so the exact expected array never appears. “Optional timeout” permits indefinite presentation retention.

#### Mounted-window indices are not global virtualization indices

The model limits `itemCount/itemAt` to currently mounted DOM (`api-review-2-summary.md:521`) while suggesting virtualization as a beneficiary. If the mounted window represents global rows 100–119, a request `{from: 5, to: 10}` is local; applying it directly to the full store moves global row 5. Stable logical IDs/anchors or an explicit offset mapping remain consumer work, and same-node recycling defeats element identity as described in finding 1.

#### The imperative cleanup line is literally immediate

Sketch A ends the top-level example with `void controller.destroy()` immediately after construction (`api-review-2-summary.md:783–834`). Read literally, the example arms and destroys the controller before input can occur. It should be placed in an actual teardown callback before the snippet is treated as runnable documentation.

## What survived the attack

The attack did not find consumer value in the current public numeric failure stages, duplicate-feature errors, hostile arbitrary-thenable guarantees, or exact statement-level destroy interruption. Those remain strong deletion candidates.

The evidence supports these narrower conclusions:

- pull snapshots can replace long-lived controller collection ownership only with an explicit invalidation/identity contract and measured scan cost;
- serial commit can remove the public readiness handshake, but not semantic post-commit anchoring, bounded/correlated commit waiting, or cancellation policy;
- `box` and `visual` are useful vocabulary, but two nodes alone do not define residual footprint or landing offset;
- last-wins configuration is safe only for genuinely independent scalar slots; lifecycle capabilities need explicit ownership groups;
- deferred physical teardown can remove fine liveness barriers, while logical ingress/resource gating, cancel/failure precedence, and async attempt identity remain;
- ordinary consumers can use library-owned landing, but advanced authoring boundaries and the product brief must agree on whether custom motion is truly gone;
- every delivered `onStart` needs an observable terminal outcome, including consequential pre-domain failure.

Those constraints are materially smaller than the current frozen contract, but the present sketches do not yet satisfy them.
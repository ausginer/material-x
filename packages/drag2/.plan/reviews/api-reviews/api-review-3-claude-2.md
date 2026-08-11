# Attack on API redesign synthesis v2

Adversarial pass over [api-review-2-summary.md](api-review-2-summary.md), against the current
`packages/drag2` implementation and against realistic consumers. Priority as briefed: falsifiers,
lost capabilities, complexity that merely relocates, invalid lifecycle assumptions, and snippets
that cannot run as written.

v2 absorbed most of the previous round — §3's caveat on `cancel()` and throws, §4's acquisition/
validation split, §6's "the proposal is immutable after release" (which dissolves the §6×§7
contradiction), §8's duration shape, §2's single ordering namespace, §5's lifted-visual stability
clause, §10's explicit decision to keep the faithful lift. I do not relitigate any of those. A
withdrawal list is in Part VII.

**Two of the new proposals do not survive contact with the sketches that illustrate them.** The
`box`/`visual` split is measured at a point in the lifecycle where `box` has already been destroyed
by the lift, and the imperative sketch's `render(items)` relocates the library's own placeholder
while §7 proposes deleting the mechanism that currently heals that. Both are blocking, both are
one-file browser probes, and both are visible in the sketches the document offers as its concrete
model.

---

## Findings

| # | § | Finding | Kind | Severity |
|---|---|---|---|---|
| R3-01 | 7, A | Consumer commit relocates/detaches the placeholder; §7 deletes the re-anchor that heals it | invalid lifecycle assumption | **blocking** |
| R3-02 | 5, A/B | `box` is measured **after** the lift; an ancestor `box` has already collapsed | snippet cannot work | **blocking** |
| R3-03 | 5 | `display: contents` breaks the placeholder *anchor*, not just the measurement — there are four roles, not two | insufficient model | **major** |
| R3-04 | B | Unmount during `await committed` produces an unhandled rejection in consumer code | snippet cannot work | **major** |
| R3-05 | 6, A | `applyReorder(items, request)` applies snapshot indices to a live array; pull deletes the version that made divergence detectable | lost capability | **major** |
| R3-06 | 6 | Stationary drag has no pull boundary; the sampling rate is the pointer's | lost capability | **major** |
| R3-07 | 6 | Pull supplies a *source*, not a *signal*; `updateItems()` splits rather than disappears | complexity moved | **major** |
| R3-08 | 6 | The virtualization claim is unsupported by the mounted-only contract | invalid assumption | **moderate** |
| R3-09 | 6 | A pull between `layoutAnimation`'s before/after hooks mismatches FLIP pairs | invalid lifecycle assumption | **moderate** |
| R3-10 | 2 | Last-wins atomic replacement requires side-effect-free fragment factories; today's are not, and replaced capabilities orphan their `retire` | invalid assumption | **major** |
| R3-11 | 2 | The fragment model forecloses compile-time checking of required slots | hidden cost | **minor** |
| R3-12 | 2 | Two spellings per slot; `handle()` is unaccounted for | underspecified | **minor** |
| R3-13 | 3 | The transaction bracket is an enumeration with no structural guard and fails silently | complexity moved | **moderate** |
| R3-14 | 3, 4 | §3's bracket and §4's all-or-nothing acquisition are one primitive at two scales | consolidation | **moderate** |
| R3-15 | 9 | `onStart` and `onEnd` are unpaired on two live paths | lost capability | **moderate** |
| R3-16 | 8 | Accept-vs-reject distance asymmetry is the concrete trigger for contextual duration; the sketch also changes the easing default silently | underspecified | **minor** |
| R3-17 | 1 | Plain-object `draggable` publishes the whole seam vocabulary; the sketch's own implementation drops realm/root | hidden cost | **moderate** |

---

# Part I — the sketches do not run

## R3-01 — the consumer's commit relocates the placeholder, and §7 removes the repair

**Blocking.** Sketch A, [api-review-2-summary.md:804-809](api-review-2-summary.md):

```ts
onReorder(request) {
  items = applyReorder(items, request);
  render(items);          // ← reorders authored DOM
  return accept();
}
```

At this moment the library has a **placeholder inserted in that same container**
([spec.ts:496](packages/drag2/src/sortable/spec.ts#L496), `item.after(placeholder)`), and that
placeholder is the landing target's measurement source — `anchorTarget` reads
`placeholder.getBoundingClientRect()` ([spec.ts:1262-1264](packages/drag2/src/sortable/spec.ts#L1262-L1264)).

An ordinary imperative `render()` does one of:

| `render` implementation | effect on the placeholder |
|---|---|
| `root.replaceChildren(...items)` | **removed from the document** |
| `for (const el of items) root.append(el)` | every item moves after it → placeholder ends up **first** |
| `insertBefore` diffing (React, Lit, Svelte) | survives, but at an arbitrary index relative to the new order |

In the first case `getBoundingClientRect()` on a detached element returns all zeros, and the item
lands at viewport `(0, 0)`. In the second, it lands at the top of the list. In the third, it lands
one slot off. All three are silent — nothing throws.

The current design does not have this problem, and the reason is the mechanism §7 proposes to
delete. §7's removal list ([:576](api-review-2-summary.md)) includes *"readiness-specific
re-anchor"*. That re-anchor is [spec.ts:1226-1240](packages/drag2/src/sortable/spec.ts#L1226-L1240)
— `item.before(placeholder)` — and `ChildNode.before()` **inserts a detached node**, so it heals
every one of the three cases above by re-deriving the placeholder's position from the committed
item.

**It is not readiness-specific. It is commit-specific.** Readiness is merely how the library
currently learns that a commit happened; serialization changes the *signal*, not the *need*. Under
serial commit `authoredReady` is unconditionally true by the time `anchorTarget` runs, so the
re-anchor should become **unconditional**, not deleted.

Restated as a contract requirement the model is missing:

> After the consumer's commit and before measuring the landing target, the library must re-establish
> its own DOM — the placeholder's position is derived from the committed item, never assumed to have
> survived.

This generalizes R3-04's and R3-09's shape: **§7 hands the consumer a window in which to mutate the
container the library is mid-operation inside, and the model does not say what the library
re-acquires afterwards.** That list is currently one item (the placeholder) and should be written
down before it becomes three.

**Probe P1.** Sketch A verbatim, `render = (items) => root.replaceChildren(...items)`, four items,
drag the first to the end, drop. Assert the landed item's `getBoundingClientRect().top` is within
1 px of the last slot. Expected as written: ~0.

## R3-02 — `box` is measured after the lift, so an ancestor `box` has already collapsed

**Blocking.** Both sketches define, and §5's motivating example implies, a `box` that is an
**ancestor** of `visual`:

```tsx
<div data-drag-box>          {/* box */}
  <div data-drag-visual>     {/* visual — this is what gets lifted */}
```

The lifecycle order is fixed and it is the wrong way round for that arrangement:

1. `acquireActivation` reads `target.getBoundingClientRect()` and calls `acquireLift(target, ...)` —
   [kernel.ts:899-900](packages/drag2/src/kernel/kernel.ts#L899-L900). The lift writes
   `position: fixed` ([presentation.ts:425](packages/drag2/src/kernel/presentation.ts#L425)).
2. **Only then** does the activation seam run —
   [kernel.ts:942-950](packages/drag2/src/kernel/kernel.ts#L942-L950).
3. `activation.prepare` creates the placeholder
   ([spec.ts:477-486](packages/drag2/src/sortable/spec.ts#L477-L486)) and `applyMechanics` reads
   `offsetWidth`/`offsetHeight` for its size —
   [placement.ts:64-65](packages/drag2/src/sortable/placement.ts#L64-L65).

Today that read targets the lifted element itself, which is fine: `position: fixed` takes an element
out of flow but preserves its own border box. Point `box` at an **ancestor** and the read happens
after that ancestor lost its only in-flow child. `box.offsetHeight` is now 0 (sketches A/B, where
`[data-drag-box]` contains nothing else) or shrunk (§5's example, where `.row-box` still holds the
`<aside>`).

Consequence: the placeholder gets `height: 0px`, the list collapses by one row the instant the drag
activates, every candidate rect below shifts up, and the insertion resolution is wrong from the
first frame.

The same ordering hazard applies to candidate geometry on rebuild
([rect-index.ts:163-164](packages/drag2/src/sortable/rect-index.ts#L163-L164)) — but only for the
dragged item, which is excluded from the destination view
([collection.ts:192-195](packages/drag2/src/sortable/collection.ts#L192-L195)). So the placeholder
sizing is the live wound.

**This is fixable, and the fix is a constraint the model must state.** Either:

- **(a)** measure `box` *before* `acquireLift` and carry the measurement into the seam — a kernel
  ordering change, since `originRect` is already captured there
  ([kernel.ts:899-902](packages/drag2/src/kernel/kernel.ts#L899-L902)); or
- **(b)** contractually forbid `box` from being an ancestor-or-self of `visual` — which forbids both
  sketches and §5's own example, so it is not really an option; or
- **(c)** require `box` to retain its footprint under the lift (`contain: size`, explicit height) —
  pushing a subtle CSS obligation onto every consumer, which is complexity moved, not removed.

I would take (a). It is a small change, it makes `box` mean what §5 says it means ("layout
footprint"), and it is the only option that does not make the documented example wrong.

**Probe P2.** Sketch B's DOM verbatim, `.row-box { }` with no explicit height. Activate a drag and
assert `placeholder.getBoundingClientRect().height` equals the pre-drag row height. Expected as
written: 0.

## R3-03 — `display: contents` breaks the placeholder *anchor*; there are four roles, not two

§5's motivating example is:

```html
<x-row style="display: contents">
  <div class="row-box">…</div>
</x-row>
```

`box`/`visual` correctly separates *what is measured* from *what is lifted*. But the placeholder is
inserted as a sibling of the **item**:
[spec.ts:496](packages/drag2/src/sortable/spec.ts#L496) `item.after(placeholder)`, validated as
`item.nextElementSibling !== placeholder`
([spec.ts:540-545](packages/drag2/src/sortable/spec.ts#L540-L545)), moved by `movePlaceholder`
against item-derived anchors ([placement.ts:245-247](packages/drag2/src/sortable/placement.ts#L245-L247)).

With `display: contents` on `<x-row>`, `<x-row>` **is not a layout box**. Its children participate
in the parent's formatting context. So in a grid or flex container:

- the actual layout children are the `.row-box` elements, not the `<x-row>` elements;
- inserting the placeholder as a sibling of `<x-row>` puts one extra box into the grid *alongside*
  the `.row-box`es;
- in a `grid-template-columns` layout, that shifts every subsequent row's column placement — the
  list visibly scrambles rather than opening a gap.

So the roles the model needs are four, not two:

| role | current source | correct source under `display: contents` |
|---|---|---|
| logical identity | `item` | `item` |
| layout footprint / geometry | `visual` | **`box`** ✅ (v2 adds this) |
| lifted presentation | `visual` | `visual` |
| **placeholder anchor** | `item` | **`box`** ❌ (v2 does not address this) |

The fourth is the one v2 misses, and it is what makes `display: contents` actually work rather than
merely measure correctly. Fixing it means `item.after(...)` becomes `box.after(...)`, the
sibling validation becomes box-relative, and `movePlaceholder`'s cross-container refusal
([placement.ts:238-242](packages/drag2/src/sortable/placement.ts#L238-L242)) compares box parents.

This also answers §5's own challenge — *"find layouts where even two elements are insufficient"* —
with the document's own example. Note the `slot` mirroring at
[placement.ts:87-91](packages/drag2/src/sortable/placement.ts#L87-L91) would need the same
treatment: it currently mirrors `item.slot`, which under `display: contents` is not where the box
lives.

**Probe P3.** `display: grid; grid-template-columns: 1fr auto` on the container, items
`display: contents` with two grid children each. Activate a drag; assert no column misalignment
(screenshot diff, or assert every remaining `.row-box`'s `gridColumnStart` is unchanged).

## R3-04 — unmount during `await committed` throws into the consumer's app

Sketch B, [api-review-2-summary.md:900-914](api-review-2-summary.md), awaits `commit.waitFor(next,
signal)` inside `onReorder`, and the effect cleanup calls `void controller.destroy()`.

Route away mid-drop — a genuinely common sequence, since a drop often *is* a navigation — and:

1. React unmounts, cleanup runs `controller.destroy()`.
2. `destroy()` is not inside a library transaction (it is inside React's commit), so under §3
   physical teardown is immediate; lifetimes are disposed
   ([kernel.ts:492-525](packages/drag2/src/kernel/kernel.ts#L492-L525)) and the resolution's
   `AbortController` ([kernel.ts:1598-1607](packages/drag2/src/kernel/kernel.ts#L1598-L1607)) fires.
3. `commit.waitFor` observes the abort and — as any signal-aware waiter does — **rejects**.
4. `await committed` throws inside `onReorder`, which is now an async function whose returned promise
   rejects.
5. The kernel is destroyed and no longer subscribed. The rejection lands nowhere.

Result: an unhandled promise rejection in the consumer's application, on a routine interaction. In
React that surfaces as a console error at minimum; with an error-reporting SDK installed it becomes
a production alert on every drop-then-navigate.

The model's helper requirements list ([:977-982](api-review-2-summary.md)) says *"must abort on
unmount / operation cancellation"* — but "abort" is ambiguous between **reject** and **resolve to a
sentinel**, and only one of them is safe. Under the current API this does not arise, because the
readiness protocol has no consumer-held promise: an unacknowledged commit hits the deadline and the
library reports it ([kernel.ts:1217-1225](packages/drag2/src/kernel/kernel.ts#L1217-L1225)).

Two things the model owes:

- **The helper must resolve, not reject, on abort** — and `onReorder` must then return something.
  `accept()` is wrong (nothing committed). So the terminal vocabulary needs a "the operation went
  away while I was waiting" return, or `onReorder`'s contract must state that a rejection after
  destruction is swallowed by the library. Today a rejected thenable is classified
  `FAILURE_REORDER_RESOLUTION` ([spec.ts:1131-1139](packages/drag2/src/sortable/spec.ts#L1131-L1139))
  — which cannot happen post-destroy because nothing is listening.
- **§3's `destroy(): Promise<void>` interacts here.** `void controller.destroy()` in the cleanup
  discards a promise while an operation is mid-resolution. If teardown is immediate the promise is
  already settled and this is fine — but that is exactly the case §3 says is *not* guaranteed when
  destroy is reentrant, and a React cleanup during a commit triggered by library code (see R3-13)
  can be reentrant.

**Probe P4.** Sketch B in a route; `onReorder` awaits a commit barrier; unmount the route from a
`setTimeout(0)` fired at `onReorder` entry. Assert `window.onunhandledrejection` does not fire.

## R3-05 — `applyReorder(items, request)` is unsound under pull, and pull removed the check that caught it

Sketch A: `items = applyReorder(items, request)`. `request` carries `from`/`to` indices
([domain.ts:46-53](packages/drag2/src/sortable/domain.ts#L46-L53)) into **the snapshot the library
pulled**, not into `items` as it stands when `onReorder` runs. Under the pull model the consumer can
mutate `items` at any moment with no notification to the library and no notification back — that is
the whole point of §6. So the two can diverge, and applying stale indices to a live array silently
corrupts the order.

The current design detects exactly this. `Insertion.version` and `ReorderRequest.version` are
matched against the snapshot in `buildReorderProposal`, which returns `null` — a broken invariant,
surfaced as a `SeamRejection`, not a silent no-op — on mixed versions or drifted neighbours
([collection.ts:302-341](packages/drag2/src/sortable/collection.ts#L302-L341), consumed at
[spec.ts:974-984](packages/drag2/src/sortable/spec.ts#L974-L984)).

The version exists **because** `updateItems()` exists. Delete the push and the version has no
meaning — v2 correctly implies this. But the *hazard* the version guarded does not go away; pull
makes it strictly more likely, because there is no longer any moment at which the consumer tells the
library the collection moved.

**This escalates a finding from the previous round that v2 did not address.** `ReorderRequest` must
carry the **neighbour identities** (`before`/`after`), not only indices:

- they make the consumer's application idempotent and checkable — `applyReorder` can assert that
  `before`/`after` are still adjacent in the live array, and reject otherwise;
- they are the only usable shape for non-array stores: fractional/lexicographic indexing (LexoRank),
  CRDT sequences (Yjs, Automerge), linked/tree models, and the near-universal server shape
  `{ moveId, afterId }`. An index pair is meaningless in all four.

Two references cost nothing and are already computed. Deriving the request shape "after collection
semantics settle" ([v1 §9]) against an array-backed reference app will conclude wrongly — and
sketch A is that array-backed reference app.

**Probe P5.** Sketch A; in `onReorder`, before applying, mutate `items` (splice an element in at
index 0) to simulate a concurrent change, then run `applyReorder(items, request)`. Assert the
resulting order matches what the user saw. Expected: it does not, and nothing reports it.

---

# Part II — §6, pull collection

The ownership argument is right and I want to say so plainly: the controller should not be a second
long-lived owner of data whose authority lives in the application. `itemCount`/`itemAt` fixes that,
and "each operation owns exactly the snapshot it read" genuinely dissolves the *is-this-update-for-
this-drag* question. Everything below is about the half the model does not fix.

## R3-06 — a stationary drag has no pull boundary

§6's change detection is *"at relevant active interaction/geometry boundaries: read `itemCount`,
compare item references by index"* ([:510-513](api-review-2-summary.md)). That makes the sampling
rate equal to the pointer's. When the pointer is still, it is zero.

The library's per-operation wakeups are exactly: pointer events
([pointer.ts:22-46](packages/drag2/src/kernel/pointer.ts#L22-L46)), scroll/resize
([invalidation.ts:23-36](packages/drag2/src/kernel/invalidation.ts#L23-L36)), and the rAF frame task
— which is scheduled *from* `moved` ([spec.ts:616-633](packages/drag2/src/sortable/spec.ts#L616-L633),
producer at [runtime.ts:165-175](packages/drag2/src/sortable/runtime.ts#L165-L175)) and therefore
also stops. A user holding an item still generates none of them.

Concrete sequence:

```
t=0    user grabs B, drags to the C|D gap, holds still (reading, distracted, deciding)
t=2s   collaborator deletes C   → consumer's array changes; nobody tells the library
       - the authored DOM reflows, the list is now A B D E
       - the placeholder is still sitting where the C|D gap used to be
       - the geometry cache still describes the old layout
t=12s  user releases
       - release-time re-read finds the gap gone → cancel
```

For ten seconds the user is shown a valid-looking drop target that no longer exists, and the drop is
then refused. Today `updateItems()` arrives as a queued action, `reconcileCollection` runs
([collection.ts:202-259](packages/drag2/src/sortable/collection.ts#L202-L259)), geometry is
invalidated ([spec.ts:862-868](packages/drag2/src/sortable/spec.ts#L862-L868)), and the cancel
happens at t=2s, when the user can still understand why.

This is not exotic. Kanban boards with live collaborators, lists behind a polling query
(`refetchInterval` is the default idiom in TanStack Query), and any app with a websocket feed all
produce collection changes during a held drag.

**The model's own attack list names "stationary drags under remote updates" and I think the answer
is: the pull model cannot address it without either continuous polling (which §6 forbids) or a push
signal (which §6 is trying to delete).** See R3-07 for what I think the resolution is.

**Probe P6.** Grab an item, hold the pointer still, and after 2 s remove a collection member from
outside the library. Assert the library notices within one animation frame. Expected under the model
as written: it does not notice until release.

## R3-07 — pull supplies a source, not a signal; `updateItems()` splits rather than disappears

R3-06 generalizes. The push model bundled two things the model treats as one:

| concern | push (`updateItems(next)`) | pull (`itemCount`/`itemAt`) |
|---|---|---|
| **who owns the data** | the controller keeps a copy — genuinely wrong | the consumer, forever — **fixed** |
| **who announces the change** | the consumer, explicitly | **nobody** |

§6 replaces the source and silently drops the signal, then tries to reconstruct it by sampling.
Sampling works when there is something to sample on, which is precisely when the change was going to
be noticed anyway.

**The honest conclusion is that `updateItems()` does not disappear — it loses its payload:**

```ts
itemCount: () => number;      // source
itemAt: (i) => HTMLElement;   // source
controller.invalidateItems(); // signal, no payload, no copy, no version
```

That is a strictly better API than today's and it keeps every claimed benefit of §6: the consumer
stays authoritative, the controller stores nothing long-lived, each operation owns its snapshot, and
the temporal question is gone (the signal says "re-read", not "here is the new truth", so it cannot
be for the wrong drag). It costs one method and one call site in the consumer — the same call site
`updateItems()` occupies today.

I would present §6 as *"pull the data, keep a payload-free signal"* rather than *"remove
`updateItems()` entirely if the pull model proves sufficient"*, because the sufficiency test in §6
is scoped to a case (moving pointer) where the answer is trivially yes, and the failing case
(stationary) has no pull boundary by construction.

If the owner wants to test the strong form anyway, the test must be R3-06, not a latency benchmark.

## R3-08 — the virtualization claim is not supported by the stated contract

§6 lists virtualization among the beneficiaries ([:472](api-review-2-summary.md)) and then scopes
the contract to *"currently sortable mounted DOM items, not... full logical virtualization where
`itemCount` includes unmounted rows"* ([:521](api-review-2-summary.md)). Those cannot both hold.

With a mounted-only contract, in a virtualizer with a 20-row window over 10 000 rows:

- `itemCount()` returns ~20;
- `from`/`to` in `ReorderRequest` are **window-relative indices**, which the consumer must translate
  against the virtualizer's scroll offset at the moment the snapshot was taken — an offset the
  library does not report;
- dragging to the window edge and scrolling replaces the window entirely; the identity gap survives
  only if both neighbours stay mounted, which at the edge they do not.

This is the same situation as today with `updateItems(mountedItems)` — so it is not a regression.
But §6 claims improvement where there is none, and R3-05's index problem is *worse* here, because
window-relative indices diverge from the consumer's model on every scroll.

**Recommendation:** either drop virtualization from §6's benefit list, or accept that the request
must be identity-based (R3-05) — which is what actually makes virtualization tractable, since
identities are stable across window changes and indices are not. This is the second independent
argument for the same fix.

## R3-09 — a pull between `layoutAnimation`'s hooks mismatches its FLIP pairs

`layoutAnimation()` is the only multi-writer contributor, hooking
`beforeInsertionMove`/`afterInsertionMove`
([layout-animation.ts:166](packages/drag2/src/sortable/layout-animation.ts#L166),
[:212](packages/drag2/src/sortable/layout-animation.ts#L212)), run around `movePlaceholder` at
[spec.ts:796-840](packages/drag2/src/sortable/spec.ts#L796-L840). It is a FLIP: `before` measures,
`after` re-measures and animates the delta.

Both passes iterate the collection. If a pull re-reads the source between them and the item set
changed, the `after` pass sees items the `before` pass never measured — those animate from an
undefined origin (typically from `(0,0)` or not at all), and items that vanished leave an orphaned
measurement.

Today this cannot happen: the collection arrives as a queued behavior action
([controller.ts:88-91](packages/drag2/src/sortable/controller.ts#L88-L91),
[runtime.ts:31-39](packages/drag2/src/sortable/runtime.ts#L31-L39)), never applied inline, so it can
only land between seams.

**Required property the model should state:** a pull is a seam-boundary event. It may not occur
inside a displacement pipeline, inside `activation.prepare`/`effect`, or between `anchorTarget` and
the pin. Which is to say: the pull points must be *enumerated*, not described as "relevant
interaction/geometry boundaries" — and that enumeration is the same kind of artifact as §3's
transaction bracket (R3-13). Two enumerations, one discipline; see R3-14.

---

# Part III — §2, the fragment merge model

The single-namespace correction is right. Two problems with last-wins.

## R3-10 — last-wins requires side-effect-free factories, and orphans the loser's `retire`

§2's worked example is `sortable(root, y(), xy())` → `axis = xyCapability`
([:160-176](api-review-2-summary.md)). Follow it through the current implementation.

Fragment factories are **invoked**, left to right, before any merge can happen — they are functions
returning contributions ([assemble.ts:65-66](packages/drag2/src/sortable/assemble.ts#L65-L66)), and
they receive `{ realm, root, report }` ([feature.ts:29-41](packages/drag2/src/sortable/feature.ts#L29-L41))
specifically so they can allocate against a live document. Both `y()` and `xy()` contribute an
`insertion` capability that carries its **own `retire`**
([y.ts:181](packages/drag2/src/sortable/y.ts#L181),
[xy.ts:182](packages/drag2/src/sortable/xy.ts#L182)).

So under last-wins:

- if `y()`'s `retire` was appended to the retire pipeline, the library releases a capability it never
  used — and `y()`'s rect index was built and measured for nothing;
- if it was not appended, whatever `y()` allocated leaks for the controller's lifetime.

Neither is acceptable, and the correct answer — *`y()`'s factory should not have run* — is
unreachable, because positional merge runs every factory before it knows which ones lost.

The current design does not have this problem because it **throws**:
`claim()` at [assemble.ts:34-48](packages/drag2/src/sortable/assemble.ts#L34-L48) raises
`TypeError: sortable: insertion geometry contributed by two features`. §2 describes replacing that
with "ordinary configuration override semantics" ([:179](api-review-2-summary.md)) — but a
configuration override is a value being discarded, and a capability is a value plus everything its
factory did on the way to producing it.

Worth reading the comment at
[assemble.ts:68-75](packages/drag2/src/sortable/assemble.ts#L68-L75) before adopting this: it
records that the retire-hook interleaving was already gotten wrong once, and the fix was to record
cleanup *before any claim can throw, in installation order*. Last-wins reopens exactly that ordering
question with more cases.

**What the model must decide:**

- **(a)** Fragment factories are pure — they may only build a plain contribution object, never
  allocate, never touch the DOM, never subscribe. Then last-wins is safe and `retire` for a losing
  fragment is simply never registered. This is a real constraint: `layoutAnimation()` and the axis
  features would have to defer all acquisition into their capability's own lifecycle, which is a
  design the current `FeatureContext` was explicitly built *against*.
- **(b)** Keep the throw for atomic capabilities and use last-wins only for scalar/function slots.
  This preserves the current diagnostic, costs the consumer nothing real (`sortable(root, y(), xy())`
  is a bug in every case I can construct), and confines the merge rules to values.

I would take (b), and note that §2's stated benefit — *"the user should not need to know whether a
first-party helper internally contributes one atomic slot or five pipeline hooks"* — is unaffected by
it. The user still does not need to know; they merely cannot supply two axes.

**Probe P7.** `sortable(root, base, y(), xy())`; assert `y()`'s rect index is never built (instrument
its factory) and that no retire hook runs for it at destroy. Under last-wins as specified, one of the
two assertions fails whichever way it is implemented.

## R3-11 — the fragment model forecloses compile-time checking of required slots

Two slots are mandatory and are enforced at runtime: an axis, and `onReorder`
([assemble.ts:112-127](packages/drag2/src/sortable/assemble.ts#L112-L127)).

With `sortable(root, ...fragments: readonly (SortableConfig | SortableFeature)[])`, TypeScript
cannot express *"at least one fragment must supply an axis"*. `sortable(root, { onReorder })` will
type-check and throw at run time. That is no worse than today — but today the shape is at least
*amenable* to a fix; a heterogeneous rest-arg union is not, short of variadic tuple types and
accumulating conditional types, which cost editor performance and are hostile to third-party
fragments.

Not a blocker, and possibly the right trade. It should be an acknowledged cost rather than a
discovery, since §2's own attack list asks whether "third-party authoring remains type-safe" and the
answer for *authoring* is yes while the answer for *completeness* is no.

## R3-12 — two spellings per slot, and `handle()` is unaccounted for

- The sketches place `visual`, `box`, `placeholder`, `onReorder` in a plain-object fragment and
  `landing`, `y`, `layoutAnimation` in factory fragments. Is `{ landing: { duration: 200 } }` a valid
  base-config key? If yes, there are two spellings for one slot and the merge order between them is
  a coin flip to the reader. If no, the rule "a plain object is a fragment, the assembler knows the
  semantics of each field" has an unstated exception list. Say which.
- `handle()` — a shipped feature ([handle.ts:26](packages/drag2/src/sortable/handle.ts#L26)) — appears
  nowhere in v2. It is presumably a base-config slot now (`handle: (item) => HTMLElement | null`),
  which is fine, but it is the one option with admission-time semantics and it should be placed
  deliberately rather than by omission.
- `threshold` and `readinessTimeout` are today plain numeric fields on `callbacks()`
  ([feature.ts:82-113](packages/drag2/src/sortable/feature.ts#L82-L113)), defaulted and range-checked
  in one place ([assemble.ts:166-177](packages/drag2/src/sortable/assemble.ts#L166-L177)).
  `readinessTimeout` dies with §7; `threshold` needs a home in the new base config, and whatever
  replaces the assembler should keep single-point defaulting and validation, which options objects
  make easy to scatter.

---

# Part IV — §3, the transaction bracket

v2's framing is right and materially better than v1's: an explicit outermost-transaction primitive
replacing distributed `live()` checks, with `cancel()` and throws called out as separate obligations.
Two structural points.

## R3-13 — the bracket is an enumeration with no structural guard, and it fails silently

The bracket must wrap every synchronous entry into library code. Today that is:

| entry point | source |
|---|---|
| `pointerdown` / `move` / `up` / `cancel` / `lostpointercapture` | [pointer.ts:22-46](packages/drag2/src/kernel/pointer.ts#L22-L46), [kernel.ts:660-668](packages/drag2/src/kernel/kernel.ts#L660-L668) |
| `keydown` (Escape), armed on the cancellation lifetime | [pointer.ts:48-71](packages/drag2/src/kernel/pointer.ts#L48-L71) |
| `scroll` / `resize` invalidation | [invalidation.ts:23-36](packages/drag2/src/kernel/invalidation.ts#L23-L36) |
| the rAF frame task | [runtime.ts:165-175](packages/drag2/src/sortable/runtime.ts#L165-L175) |
| the `onReorder` thenable continuation | [kernel.ts:1622-1643](packages/drag2/src/kernel/kernel.ts#L1622-L1643) |
| `animation.finished.then(...)` in the landing runner | [landing.ts:132-162](packages/drag2/src/sortable/landing.ts#L132-L162) |
| public controller methods (`cancel`, `destroy`, and whatever survives) | [controller.ts:36-134](packages/drag2/src/sortable/controller.ts#L36-L134) |

Eight, against the 62 stretches the current discipline enumerates. **That is a genuine ~8× reduction
and the strongest argument in v2.** But it is still an enumeration, it still has no type-level guard,
and its failure mode is worse than the current one: miss a bracket and teardown runs early *inside*
that path, which is precisely the mid-stack retirement §3 exists to abolish — reproducing today's
defect class in a code path nobody is looking at any more, because the discipline that used to cover
it was deleted.

**Cheap structural fix, worth demanding as an acceptance criterion:** make the bracket the *only*
way to reach the platform. `DOMRealm` is already the single choke point for `window`/`document`
([realm.ts:23-27](packages/drag2/src/kernel/realm.ts#L23-L27), public per D-30). If listener
registration and frame scheduling go through realm-level helpers that bracket automatically, adding
an unbracketed entry point becomes something you have to work at rather than something you can
forget. That converts an enumeration into an invariant, which is the difference between this and the
four previous terminating-set attempts.

Then §3's fourth attack question — *"count which existing `live()`/stretch obligations really
disappear"* — has a mechanical answer: every stretch whose only hazard was liveness disappears;
every stretch whose hazard is exception-safety (R3-14) does not.

## R3-14 — §3's bracket and §4's all-or-nothing acquisition are one primitive at two scales

§4 correctly separates consumer-contract validation from library acquisition discipline, and
correctly identifies the real defect: mechanics are applied to the consumer's element *before* the
operation adopts it and registers rollback. The source says so itself, at
[placement.ts:56-58](packages/drag2/src/sortable/placement.ts#L56-L58):

> "…the element is not adopted until `activation.prepare` returns, so a mutation left on it after
> `destroy()` is a residue teardown never undoes."

§4's fix — *"fully acquired + rollback registered, or not externally left behind"* — cannot be
satisfied against an arbitrary abort point by ordering alone, because the abort can be a **consumer
throw** from `placeholder.style`, not only a destroy. `applyMechanics` has by then written
`data-drag-placeholder`, `aria-hidden` and a mirrored `slot`
([placement.ts:71-91](packages/drag2/src/sortable/placement.ts#L71-L91)) with no disposer registered
until [spec.ts:492-495](packages/drag2/src/sortable/spec.ts#L492-L495).

The only mechanism that satisfies it is a scoped try/finally that rolls back partial acquisition —
which is the transaction bracket, at statement scope instead of entry-point scope.

**Recommendation:** specify one primitive with two uses (an outermost operation bracket and nested
acquisition brackets), rather than an execution bracket in §3 and an acquisition discipline in §4.
Otherwise the two will be designed separately and the seam between them is where the next C6-02
lives. R3-09's "pulls happen only at seam boundaries" is a third instance of the same discipline.

On §4's classification request, my reading of the current checks:

| check | class | keep? |
|---|---|---|
| placeholder is connected and is the item's next sibling ([spec.ts:540-545](packages/drag2/src/sortable/spec.ts#L540-L545)) | **library write verification** | yes — this is the library checking its own insertion |
| cross-container anchor refusal ([placement.ts:238-242](packages/drag2/src/sortable/placement.ts#L238-L242)) | library write verification | yes |
| item uniqueness ([collection.ts:177-189](packages/drag2/src/sortable/collection.ts#L177-L189)) | consumer ownership validation | yes — cheap, and a duplicate silently corrupts every index |
| "returned the dragged item / the visual / a connected node" | consumer ownership validation | yes — these are the ones that stop the library **deleting authored DOM**, which is unrecoverable |
| per-write `live()` in `applyMechanics` | defensive liveness | **no** — replaced by R3-14's acquisition bracket |

That is one row removed out of five. §4's instinct that these are different categories is right; the
practical consequence is that most of what looks like validation stays.

---

# Part V — terminal vocabulary and landing

## R3-15 — `onStart` and `onEnd` are unpaired on two live paths

§9's `onEnd(result)` is described as "exactly-once domain termination". It is not fired at all on two
paths that *did* fire `onStart`:

1. **Failure with no domain outcome.** `FAILURE_ACTIVATION` and friends report through `onError`
   only; `finalized` is never reached
   ([spec.ts:1191-1199](packages/drag2/src/sortable/spec.ts#L1191-L1199)), and the failure path
   retires without a join ([kernel.ts:2003-2019](packages/drag2/src/kernel/kernel.ts#L2003-L2019)).
2. **`destroy()` during an operation.** No terminal callback fires at all
   ([kernel.ts:492-525](packages/drag2/src/kernel/kernel.ts#L492-L525)).

The consumer pattern this breaks is the most ordinary one there is:

```ts
onStart() { setDragging(true); },
onEnd()   { setDragging(false); },   // never runs on either path
```

so the list stays visually in drag state after an activation failure, and a destroy-mid-drag leaves
the flag set on a component that is usually about to unmount anyway — but not always, since
`destroy()` is also how a consumer disables sorting.

§9 asks *"identify lifecycle paths where domain outcome itself truly becomes failed rather than a
normal result plus diagnostic."* My answer: **none — and that is the problem.** Because failure is
never a domain outcome, `onEnd` is not the counterpart of `onStart`, and consumers will use it as
one. The fix is a contract decision, not machinery:

- either `onEnd` fires on **every** path that fired `onStart`, with a type meaning "ended without a
  domain result" (`aborted`), and `onError` remains the orthogonal diagnostic — this preserves §9's
  correct separation while making the pairing true;
- or the contract states loudly that `onEnd` is not paired with `onStart` and the library offers no
  paired signal, which I think is the wrong choice for the most common consumer state machine.

Note this also settles v1's `onEnd`-timing objection: with an `aborted` type, the DOM-state
difference remains (a domain result fires after restoration, an abort fires before —
[kernel.ts:1441-1454](packages/drag2/src/kernel/kernel.ts#L1441-L1454) vs
[:1990-2019](packages/drag2/src/kernel/kernel.ts#L1990-L2019)), so the result type must document
whether the visual has been restored when the handler runs.

## R3-16 — accept-vs-reject distance asymmetry is the concrete trigger for contextual duration

§8 asks for *"an existing required motion behavior that fixed WAAPI timing/easing genuinely cannot
support."* There is one, and it is first-party rather than hypothetical.

A landing travels one of two very different distances:

- **accepted** — from the release point to the destination gap, typically a few tens of pixels;
- **rejected / cancelled** — `RECOVERY_HOME`, from wherever the user dragged to back to the grab
  slot ([spec.ts:1242-1247](packages/drag2/src/sortable/spec.ts#L1242-L1247),
  [collection.ts:269-285](packages/drag2/src/sortable/collection.ts#L269-L285)), which in a long list
  can be the full viewport.

One fixed duration cannot serve both: 200 ms is right for the first and reads as a teleport for the
second. This is not a niche consumer requirement — it is the library's own two paths, and in this
repo specifically, Material 3 specifies duration by distance and size class.

So the deferred `duration({ distance, from, to })` shape ([:651](api-review-2-summary.md)) has a
concrete first caller already, and §8's "add it later only when a real consumer requires it" will be
"later" almost immediately. Worth deciding now whether v1 ships one duration, two
(`duration` / `returnDuration`), or the contextual form.

Separately: the sketches use `easing: 'cubic-bezier(.2, 0, 0, 1)'` while the current default is
`'ease'`, chosen for parity ([landing.ts:56](packages/drag2/src/sortable/landing.ts#L56),
[:80](packages/drag2/src/sortable/landing.ts#L80)). If the default is changing, that is a parity
decision that should be recorded, not absorbed through a sketch.

---

# Part VI — §1, kernel authoring

## R3-17 — the plain-object `draggable` publishes the whole seam vocabulary; the sketch drops realm/root

§1 shows the low-level surface as
[api-review-2-summary.md:71-74](api-review-2-summary.md):

```ts
const controller = draggable(root, { /* low-level behavior/kernel parts */ });
```

A **plain object** rather than today's opaque `Behavior<C>` brand
([spec.ts:426-437](packages/drag2/src/kernel/spec.ts#L426-L437), with `brandBehavior`/
`unbrandBehavior` reaching no entry module). That is the right ergonomic call and it has a price the
section does not name: the object's type is `BehaviorSpec`, so **every seam signature, every scope
type, the phase model, `Frame<Part>`, the dispatch tags and `VisualLiftSession` become public API**.

§1's own attack question is *"measure how much kernel vocabulary genuinely has to become public"*.
Here is the spike that answers it, specified so it can be run:

**Build swipe-to-dismiss as a third-party behavior.** Not sortable-shaped, genuinely different, and
small: admit on `pointerdown` over a row; activate past a horizontal threshold; `moved` follows X
only; release either dismisses (animate out, remove) or springs back. Enumerate what it must import.
My prediction from the current source: `BehaviorSpec` with `admit`, `activation`, `moved`, `release`,
`settlement`, `anchorTarget`, `finalized`, `retire`, `reportFailure`; `KernelHost` with `dispatch`,
`fail`, `cancel`, `destroy`, `realm`, `root`; `ActivationScope`; `VisualLiftSession` (needed by
`moved`, and deliberately unexported today); `SeamRejection`; `LandingStart`/`LandingHandle` if it
wants an exit animation; `Frame<Part>`; the phase constants. That is ~15 types and the entire
lifecycle contract — contract 02 becomes public documentation.

That may well be worth it. But it is the single largest item in v2 and it is currently priced at
zero, and it should be decided as *"does v1 ship a supported custom-behavior surface at all?"*
before *"what shape is it?"* — the first question is cheap and "not in v1" is a legitimate answer
that §1 currently forecloses.

**Second, smaller, concrete:** §1's own implementation sketch is

```ts
function sortable(root, ...config) {
  const spec = assembleSortable(config);
  return draggable(root, spec);
}
```

`assembleSortable(config)` receives no `root`. But fragment factories are invoked with
`{ realm, root, report }` ([feature.ts:29-41](packages/drag2/src/sortable/feature.ts#L29-L41)), and
assembly runs *inside* `install` today precisely so a realm exists
([behavior.ts:63-71](packages/drag2/src/sortable/behavior.ts#L63-L71)) — the realm being derived from
the root's `ownerDocument.defaultView` ([realm.ts:23-27](packages/drag2/src/kernel/realm.ts#L23-L27),
D-30). `layoutAnimation()` needs it to create animations. So the sketch must be
`assembleSortable(root, config)`, or assembly must stay inside install. Trivial to fix; worth fixing
in the document, because §1 also promises to preserve the atomic-installation property and this is
the mechanism that currently delivers it.

---

# Part VII — what landed, and what I withdraw

Stated explicitly so the owner can see which attacks are spent.

**v2 absorbed and I consider closed:**

- `cancel()` and consumer throws as separate obligations under §3 — closed as *acknowledged*, and
  R3-13/R3-14 are about the shape of the answer, not whether the question is open.
- The placeholder acquisition defect, correctly reclassified in §4 as all-or-nothing acquisition
  rather than an I-36 problem. That reclassification is right and it is the most useful correction
  in v2.
- §6's "after release the proposal is immutable, no collection publication protocol for the current
  operation" dissolves the previous round's blocking §6×§7 contradiction. Cleanly resolved.
- §8's removal of `run` and of the zero-argument `duration` thunk.
- §2's single ordering namespace.
- §5's explicit lifted-visual stability clause.
- §9 keeping `onError` orthogonal rather than folding it into `onEnd` — with the counterexample about
  a throwing `onEnd`, which is better than the argument I made.

**I withdraw:**

- The clone-based-lift line of attack. §10 decides it, with reasons (form controls, canvas/video,
  focus, custom elements, running animation, inherited CSS, framework identity) that are correct and
  that I did not weigh properly. I raised it as an unexamined lever; it is now examined and decided,
  and it should not be reopened without executable evidence. I note only that the measurement I asked
  for was not taken, and that the decision is defensible without it.
- The serial-commit latency objection, in its strong form. v2's framing is right and the previous
  round already established that the lost overlap only affects consumers who declare
  `presentation: true` — a population that wants the gate. R3-01 is about the *placeholder*, not the
  latency.

**Still open from the previous round and not addressed in v2:**

- `ReorderRequest` neighbour identity — escalated, see R3-05 and R3-08.

---

# Part VIII — probes, in priority order

P1–P3 are the ones I would run before any implementation work; each is a single browser test against
the *current* build plus a small patch, and each falsifies a specific v2 claim.

| # | Probe | Falsifies | Expected as written |
|---|---|---|---|
| **P1** | Sketch A with `render = (i) => root.replaceChildren(...i)`; drag item 1 to the end; assert the landed position is the last slot | R3-01 | lands at ~viewport `(0,0)` |
| **P2** | Sketch B's DOM (`[data-drag-box]` wrapping `[data-drag-visual]`, no explicit height); activate a drag; assert the placeholder height equals the pre-drag row height | R3-02 | `0` |
| **P3** | `display: grid; grid-template-columns: 1fr auto`, items `display: contents` with two grid children; activate; assert no column misalignment | R3-03 | list scrambles |
| P4 | Sketch B in a route; `onReorder` awaits a commit barrier; unmount from `setTimeout(0)` at `onReorder` entry; assert no `unhandledrejection` | R3-04 | fires |
| P5 | Sketch A; splice into `items` inside `onReorder` before `applyReorder`; assert the final order matches what the user saw | R3-05 | silently wrong |
| P6 | Grab an item, hold still; remove a collection member externally at t=2 s; assert the library notices within one frame | R3-06 | notices only at release |
| P7 | `sortable(root, base, y(), xy())`; instrument `y()`'s factory; assert its rect index is never built **and** no retire hook runs for it | R3-10 | one assertion fails either way |
| P8 | `onStart` sets a flag; `destroy()` mid-drag; assert `onEnd` fired | R3-15 | never fires |
| P9 | Same, but trigger `FAILURE_ACTIVATION` (placeholder factory throws) | R3-15 | never fires |
| P10 | Spike: swipe-to-dismiss behavior against the proposed `draggable(root, spec)`; count the types that must be exported | R3-17 | ~15, incl. `VisualLiftSession` |
| P11 | Serial commit latency: 200-row list, 6× CPU throttle; count frames between `pointerup` and the first landing frame, parallel vs serial | §7's stated cost | — |
| P12 | Input probes per §11: nested `button`, link, `input`, `textarea`, `contenteditable`, slider, combobox, selectable text; assert focus/caret/selection behave | §11 | `preventDefault()` at [kernel.ts:719](packages/drag2/src/kernel/kernel.ts#L719) suppresses focus |

P12 is unchanged from the previous round and remains unrun. §11 is right that it should not
disappear behind the lifecycle work; it is also the only section whose findings ship as user-visible
behavior regardless of which way the API lands.

---

## Method

Read directly for this pass: `src/kernel/{kernel,presentation,realm,invalidation,pointer,spec}.ts`,
`src/sortable/{spec,assemble,placement,collection,controller,landing,feature,slots,rect-index,
runtime,behavior,y,xy,layout-animation,handle}.ts`, plus both sketches line by line against them.

The two blocking findings rest on ordering facts I verified myself rather than from a summary:
`acquireLift` at [kernel.ts:900](packages/drag2/src/kernel/kernel.ts#L900) precedes the activation
seam at [kernel.ts:942-950](packages/drag2/src/kernel/kernel.ts#L942-L950), which is what puts the
`offsetWidth`/`offsetHeight` read at
[placement.ts:64-65](packages/drag2/src/sortable/placement.ts#L64-L65) after the lift; and
`anchorTarget` measures the placeholder at
[spec.ts:1262-1264](packages/drag2/src/sortable/spec.ts#L1262-L1264) with the re-anchor at
[spec.ts:1226-1240](packages/drag2/src/sortable/spec.ts#L1226-L1240) as its only repair.

Nothing was modified. All probes are specified, none were run — P1–P9 need a browser runner and P10
needs a branch.

`LSP plugin - available; not used: this pass was API-shape and lifecycle-ordering analysis over
whole call sequences and export maps, which ranged reads plus grep answered directly; no symbol
definition, reference or type-hierarchy resolution was in question.`

# API review 3 — falsifying the v2 working model

Adversarial pass over [`api-review-2-summary.md`](api-review-2-summary.md), against the current implementation and against realistic consumers. Priority as briefed: capabilities lost, complexity relocated rather than removed, invalid lifecycle assumptions, and snippets that cannot work as written.

**v2 is a real improvement on v1.** It fixed four things the second review round raised — the acquisition/nannying split, `onEnd` vs `onError`, the two-ordering-namespace problem, and the claim that deferred teardown removes _all_ transaction safety. Those corrections are right and I do not re-litigate them.

What follows is what I could break. Three findings break a sketch as written. Six remove a capability or relocate its cost. Four are cross-section collisions where two adopted directions contradict each other.

---

## Falsifier summary

| # | Falsifier | Target | Class | Status |
| --- | --- | --- | --- | --- |
| **F1** | `draggable(root, { …parts })` cannot receive the kernel host, so the atomic-installation guarantee it is meant to preserve is unexpressible in that shape | §1 sketch | **snippet cannot work** | Verified |
| **F2** | Sketch A's `render(items)` inside `onReorder` destroys the library-owned placeholder and may detach the lifted visual | Sketch A | **snippet cannot work** | Verified by construction |
| **F3** | `layoutAnimation()` writes `translate` to snapshot items; §5's own `display: contents` example makes that a no-op | §5 + §2 | **snippet cannot work** | Verified |
| **F4** | A stationary drag has no pull boundary, so the pull model strictly delays detection — and the proposed measurement cannot detect this | §6 | **capability lost** | Reasoned, probe given |
| **F5** | Pull transfers _when to observe_ from consumer to library; virtualization gets harder, not easier | §6 | **capability lost** | Reasoned, probe given |
| **F6** | The pull scan is O(n) consumer calls on a path where today's warm cache costs zero | §6 | **cost relocated to hot path** | Verified against M-1's path |
| **F7** | Serial commit makes abort-during-commit a common path, and the resolution protocol has no vocabulary for it — Escape becomes `FAILURE_REORDER_RESOLUTION` | §7 | **capability lost** | Verified |
| **F8** | The only liveness bound in the package moves from library code into an optional property of a hypothetical documented helper | §7 | **complexity relocated** | Verified |
| **F9** | §6's pull points and §7's serial commit collide: a post-commit pull sees the consumer's own applied reorder and cancels an accepted drop | §6 × §7 | **cross-section collision** | Reasoned |
| **F10** | §5 requires the lifted visual node to be stable; §7 makes a framework commit mandatory mid-operation | §5 × §7 | **cross-section collision** | Reasoned |
| **F11** | The transaction bracket needs an exception-safe depth counter at every entry; its failure mode is an unresolved `destroy()` promise, which is worse than today's guarded teardown | §3 | **machinery returns, worse failure mode** | Reasoned |
| **F12** | Panic is raised from inside a seam precisely because the stack is unsound; "defer to the unwind" is least trustworthy exactly there | §3 | **unaddressed path** | Verified |
| **F13** | Duplication semantics depend on whether a helper contributes a slot or a pipeline — which §2 says consumers need not know | §2 | **invalid assumption** | Verified |
| **F14** | Both sketches configure `visual` _and_ `box` by hand, contradicting "ordinary consumers still configure one thing" | §5 sketches | ergonomics | Verified |
| **F15** | A small string code union still has no fault-attribution axis, which is the one decision an error code enables | §9 | capability lost | Carried from review 1 |

---

# Snippets that cannot work as written

## F1 — `draggable(root, { …parts })` breaks the guarantee it is meant to preserve

§1 keeps `draggable()` as the low-level installer and sketches it as:

```ts
const controller = draggable(root, {
  // low-level behavior/kernel parts
});
```

while stating the property to preserve: _"the complete behavior/spec exists before input is armed."_

**That shape cannot express it.** Verified at `src/drag.ts:63-72`:

```ts
export function draggable<Controller>(
  root,
  behavior: Behavior<Controller>,
): Controller {
  const kernel = createKernel<object>(root);
  const { spec, controller } = unbrandBehavior(behavior)(kernel.host);
  kernel.arm(spec);
  return controller;
}
```

The behavior is **a function of the host**. It must be, because a behavior's runtime needs `host.dispatch`, `host.fail`, `host.realm` and `host.root` to exist before it can build the spec and the controller — and the host does not exist until the kernel does. An object literal of "parts" has no way to receive it.

So the sketch collapses to one of two things:

- the object contains a factory (`{ install(host) { … } }`), which is the current two-phase handshake in an object costume, with the same opacity and one more layer; or
- the parts are host-free, which means either the kernel injects the host later — reintroducing the "input armed before the spec is complete" window that D-1 exists to make unexpressible — or `dispatch`/`fail` are not available to a behavior, which rules out every non-trivial behavior.

**This matters beyond the sketch** because §1's premise is that ordinary consumers "should not need to traffic in an opaque intermediate `Behavior`". Agreed — and the correct conclusion is that `sortable(root, …)` should _hide_ the handshake, not that the handshake should change shape for the advanced layer. The advanced layer needs it most: it is exactly where a behavior author must not be able to arm input before their spec exists.

**Probe.** Write one non-sortable behavior (§7 of the attack list already asks for this) against a host-free object shape. It will need `dispatch` in its first line.

## F2 — Sketch A instructs consumers to destroy the placeholder

```ts
onReorder(request) {
  items = applyReorder(items, request);
  render(items);
  return accept();
}
```

At the moment `onReorder` runs, the library owns two nodes inside `root`: the placeholder (inserted at the destination gap) and the lifted visual (promoted, transformed, still a child of its original parent unless the lift mode moved it).

`render(items)` is unspecified in the sketch, and the two most common imperative implementations both break:

- **`root.innerHTML = …` or a full rebuild** — removes the placeholder. Teardown's disposer then calls `placeholder.remove()` on a detached node (a no-op), and every geometry read between now and the join measures a placeholder that is not in the list. The drop completes against garbage.
- **A naive keyed diff over `root.children`** — the placeholder is an unrecognised child. Most hand-written diffs will either remove it or use it as an anchor for the wrong node.

React survives this (F-14 established it neither repositions nor detaches the placeholder), which is exactly why the _imperative_ sketch is the dangerous one: it has no reconciler with the necessary tolerance, and the sketch does not say what `render` may do.

**Sketches are specifications for what consumers copy.** This one currently reads as "re-render the whole list synchronously from inside `onReorder`", which is the single most hazardous instruction the API can give.

**Probe.** Implement `render(items)` as `root.replaceChildren(...items)` in a fixture, drive a complete drop, and assert the final DOM and whether `onEnd` reports `accepted`. I expect a placeholder-shaped hole in the assertions and a landing that pins against a detached node.

## F3 — `layoutAnimation()` cannot displace a `display: contents` item

§5's motivating example makes the logical item a `display: contents` host:

```html
<x-row style="display: contents">
  <div class="row-box">…</div>
</x-row>
```

Verified at `src/sortable/layout-animation.ts:223-256`: the displacement pass iterates `affected[i]` — **snapshot members, i.e. the items** — and writes

```ts
element.animate([{ translate: `0 ${delta}px` }, { translate: '0 0' }], …)
```

A `display: contents` element generates no box. `translate` on it has no effect. So under §5's own example, every non-dragged row's displacement animation silently does nothing, and the feature the model wants to keep as its dogfooding vehicle (§2: _"At least one meaningful first-party capability such as `layoutAnimation()` should remain implemented through the same feature machinery"_) stops working for the layout that motivated `box`.

**The model specifies `box` as a read source only** — _"source element for sortable geometry and layout footprint"_ — and never says what displacement should _write_ to. It has to be `box`, which means:

- `DisplacementView` needs a box resolver, a sixth additive widening of the consumer-declared view;
- the affected-set membership test (`Set<HTMLElement>` keyed on snapshot items) and the animation target diverge, so the feature must hold both mappings;
- `running: Map<HTMLElement, Animation>` keys on the write target, not the item, so a box swapped between moves orphans a running animation.

None of that is fatal. All of it is machinery the model does not account for, in the one feature it nominates to keep the extension API honest.

**Probe.** Compose `y() + layoutAnimation()` over rows whose items are `display: contents` wrappers, drag one, and count `animate()` calls with a non-zero delta. Expect zero.

---

# Capabilities lost

## F4 — A stationary drag has no pull boundary

§6's detection strategy:

> at relevant active interaction/geometry boundaries: read itemCount, compare item references by index

Every named boundary is driven by _input_: pointer samples, geometry rebuilds triggered by committed moves, scroll and resize. **A user who presses, drags to a gap, and holds still generates none of them.**

Concrete: a collaborative list. User A picks up row B and holds it over the `C | D` gap while reading. User C deletes row B remotely. The consumer's authoritative collection no longer contains the dragged item.

- **Today (push):** the consumer calls `updateItems`; reconciliation sees the dragged item gone; the operation cancels with `CANCEL_ITEM_REMOVED` immediately. The user sees the drag end.
- **Under pull:** nothing pulls. The user continues dragging a row that no longer exists, over a list that has re-rendered around them, until they move the pointer or release.

**The proposed validation cannot detect this.** §6 says:

> Do not introduce a collection version, invalidation callback, observer, subscription or push notification until **measurement shows the simple scan is too expensive**.

The failure mode is not expense. It is _latency of detection_, and no cost measurement will surface it. This is a wrong-metric error: the section proposes to validate a delivery model by measuring the thing that is not wrong with it.

**Probe.** Fixture with a controller and a mutable source array. Press, cross the threshold, then stop generating pointer events. Mutate the source to remove the dragged element. Assert elapsed time until the operation cancels, with and without a subsequent pointer sample. Under push this is zero; under pull it is unbounded.

## F5 — Pull takes _when to observe_ away from the consumer

§6's framing is that push makes the controller "a second long-lived owner of data whose authority actually lives in the application". True. But the model treats ownership of _data_ and control of _timing_ as the same thing, and they are not.

Under push, the consumer decides **when** the library learns about a change. That is not incidental — it is the mechanism by which a consumer keeps a drag alive across changes the library should not react to.

Under pull, the library reads whenever it wants, and the consumer has no way to say "not now".

**Virtualization is the counterexample, and it inverts §6's claim.** §6 lists virtualization as something pull "potentially" helps. Consider a windowed list where `itemCount` counts mounted rows (§6 explicitly scopes the contract to _"currently sortable mounted DOM items"_):

1. User drags row 12 toward the gap between rows 3 and 4.
2. The drag reaches the top edge; the user scrolls, or an autoscroller does.
3. The virtualizer unmounts rows 20–30 and mounts rows 1–10. `itemCount` and the element identities both change.
4. Scroll is a named pull boundary. The library re-reads, and applies §6's rule: _dragged item still exists_ — yes; _destination gap survives_ — the gap was `3 | 4`, both still mounted, so it survives. Continue.
5. Scroll further. Rows 3 and 4 unmount. The gap is destroyed. **Cancel.**

So under pull, scrolling a virtualized list far enough during a drag deterministically cancels it, and the consumer cannot prevent it, because the library reads the mounted set directly.

Under push the consumer simply does not call `updateItems` while a drag is live, and the drag survives — at the cost of a snapshot that has gone stale, which the release-time reconcile then repairs.

Neither is _correct_ for virtualization; a windowed list needs collection identity that outlives mounting, which §6 correctly defers ("Supporting that would require a separate identity/geometry model"). What is wrong is the claim that pull moves toward it. **It moves away**, because it binds the collection to the mounted set at the library's chosen instants rather than at the consumer's.

## F6 — The pull scan lands on the path M-1 measured

§6 reasons about cost as:

> A DOM geometry read is likely much more expensive than reference comparisons

That compares the scan against a geometry rebuild. **The scan's real peer is a warm cache, which costs nothing.**

Today's move path is three post-`MOVE` indirect calls (`spec.moved` · `lift.write` · `frame.schedule`) plus a coalesced spatial search over a packed `Float64Array`. On a warm cache — the common frame — **zero consumer functions are called**. That is the 2.64 µs sample M-1 measured.

A pull scan at the geometry boundary costs `1 + n` consumer calls per pull. At the 800 rows q7 used, that is 801 calls into consumer closures — in sketch B, each one an array index plus a `Map.get`, through two layers of indirection the optimiser cannot inline across a module boundary. If the pull runs per frame, that is a per-frame regression of roughly two orders of magnitude in consumer-call count on the path the package has most carefully measured.

If the pull runs less often than per frame, F4 gets worse.

**This is the load-bearing measurement and it is cheap.** Extend `tests/perf/m1.browser.test.ts` with a pull-scan variant at 20 / 200 / 800 rows and compare against the current warm-cache frame. The result decides whether pull needs an invalidation channel — which is the thing §6 forbids in advance.

## F7 — Serial commit has no vocabulary for abort

Sketch B:

```ts
async onReorder(request, { signal }) {
  const committed = commit.waitFor(next, signal);
  setOrder(next);
  await committed;
  return accept();
}
```

The user presses Escape while React is committing. The operation cancels; `signal` aborts; `waitFor` rejects; `await` throws; `onReorder`'s promise rejects.

Verified at `src/sortable/spec.ts:1134-1138`, a rejected thenable is:

```ts
return { stage: FAILURE_REORDER_RESOLUTION, error: input.error };
```

— a **classified failure**, deliberately, because the contract's position is that _"a rejected thenable is a resolver malfunction, not a considered consumer verdict"_.

So an ordinary Escape during the commit window produces `onError` with a failure stage, rather than a clean cancel.

**Today this is rare**, because the recommended path returns `accept({ presentation: true })` synchronously and the cancel lands against a settled resolution. **Under serial semantics the commit window is the longest phase of every accepted drop**, so abort-during-commit becomes the ordinary path, not the corner.

And the consumer has no correct response. The resolution vocabulary is `accept()` / `reject(reason)`:

- swallowing the abort and returning `accept()` accepts a reorder the user cancelled;
- returning `reject(reason)` routes to `onCancel` with a rejection reason, mislabelling a user cancel as a consumer refusal and triggering the home recovery;
- rethrowing produces the classified failure above.

There is no third member. **Serial semantics needs one** — or the abort must be handled by the kernel before the rejection reaches the settlement mapping, which is new machinery in exactly the place §7 is trying to remove some.

**Probe.** Drive a serial fixture, press Escape mid-commit, and assert which of `onEnd` / `onError` fires and with what. Then decide whether `AbortError` deserves a case in the settlement mapping.

## F8 — The liveness bound becomes documentation

§7 lists what the helper must handle:

```text
unmount
abort
wrong/unrelated commit
never-committing transition
optional timeout
```

and then places it: _"The initial React integration should therefore live as documentation/reference code rather than kernel machinery."_

`readinessTimeout` is the only deadline in the package — verified: the sole `setTimeout` in `src/kernel/kernel.ts` is `startReadinessDeadline` at `:1204`, bounded by `config.readinessTimeout`. The `onReorder` round-trip has no bound of any kind.

So the model deletes the library's only liveness bound and re-lists it as an _optional_ property of reference code the consumer is expected to copy. If the helper omits it — and "optional" invites that — a never-committing transition leaves the placeholder inserted, the visual lifted and promoted into the top layer, the collection frozen, and no recovery path except the consumer noticing.

**This is the clearest case of relocation rather than removal in the document.** The five bullets above are not simpler than the readiness protocol; four of them are the same obligations D-33 was designed to remove from the consumer, handed back with the note that a helper might address them.

**The honest position** is either that the library keeps a round-trip deadline (in which case `readinessTimeout` was never readiness-specific and survives under another name), or that the model accepts unbounded operations and says so. §7 currently implies the first and specifies the second.

---

# Cross-section collisions

## F9 — Pull points × serial commit: the library can cancel its own accepted drop

§6 places pull at _"relevant active interaction/geometry boundaries"_ and §7 places the authored commit _before_ the landing. Compose them:

```text
release → pull → freeze proposal → onReorder → consumer commits the reorder
        → accept() resolves → measure final authored DOM → landing
```

At "measure final authored DOM", the DOM has changed — that is the point. If any pull is coupled to that geometry boundary, the library re-reads the source and finds:

- the dragged item **is still present** — first conjunct passes;
- the destination gap `C | D` **no longer exists as a gap**, because the consumer just put the dragged item into it.

§6's rule then fires: _"otherwise → cancel"_. **The library cancels a drop it already accepted, because the consumer did what the library asked.**

Avoiding this requires a rule that no pull occurs after the proposal freezes. §6 half-states it (_"After release: The proposal is immutable"_) but immutability of the proposal is not the same as suppression of pulls, and §5 independently permits box re-resolution at geometry rebuilds. The two sections need one shared statement of which boundaries are live and which are frozen — which is a phase-dependent pull policy, i.e. the temporal question §6 claims to remove:

> It also removes the temporal question: is this update for the current drag or for the next drag?

It does not remove it. It relocates it from the consumer's call site to the library's pull policy.

**Probe.** Serial fixture, instrument `itemCount`/`itemAt`, drive a complete accepted drop, and log every pull with the phase it occurred in. If any pull happens at or after `RELEASING`, F9 is live.

## F10 — Stable lifted visual × mandatory framework commit

§5:

> The **lifted visual** is a different lifetime: once acquired for the dragged item, that exact node must remain the lifted visual for the operation. Framework remount/recycling of that node during an active operation should be treated as a consumer/integration constraint unless a later requirement proves otherwise.

§7 makes a framework commit a _required phase of every accepted operation_.

These are in direct tension. The model declares node stability a consumer constraint while simultaneously mandating the exact event most likely to violate it. A React commit that changes the dragged row's `key`, moves it into a different parent, or unmounts and remounts its subtree — all of which are ordinary consequences of a reorder in a list with derived keys — leaves the library holding a detached node that is still promoted into the top layer, still carrying the lift's inline styles, and about to be landed and pinned.

Under today's parallel protocol this is bounded: the library holds the readiness gate, re-anchors after the commit, and the join re-pins against final DOM. Under serial, the landing starts _after_ the commit against a node the commit may have replaced.

**Probe.** React fixture where `onReorder`'s state update changes the dragged row's key. Assert what `getAnimations()` and the final DOM look like after the drop, and whether the lifted node is still connected when the landing starts.

---

# Machinery that returns

## F11 — The transaction bracket's failure mode is worse than today's

§3 asks for the minimum bracket. The entry points are enumerable, which is the good news:

| Entry | Bracket |
| --- | --- |
| `pointerdown` / `keydown` admission | native listener → admission → single drain → listener exit |
| `pointermove` / `pointerup` / `pointercancel` / `lostpointercapture` | listener → dispatch → drain |
| scroll / resize invalidation listeners | listener → dispatch → drain |
| rAF frame task | task → dispatch → drain |
| `onReorder` thenable continuation | microtask → dispatch → drain |
| landing `finished` continuation | microtask → dispatch → drain |
| `controller.cancel()` / `.destroy()` from consumer code | may or may not be nested — that is the whole problem |

That is six library-owned entry points plus consumer calls, and they nest (a drain runs inside admission; a seam runs inside a drain). So the bracket is a **depth counter**, and deferred teardown fires when it returns to zero.

**The failure mode inverts.** Today, teardown is seven individually-wrapped steps with ingress abort in a `finally`, and the contract's claim is that _"no behavior callback in the sequence can stop a later step"_. A throw costs a report, not the teardown.

Under a depth counter, a single missed decrement — one entry point whose increment is not paired in a `finally`, one exception path through the seam driver's own catch/classify/rethrow — means the depth never returns to zero, teardown **never runs**, and `destroy()`'s promise **never resolves**. The consumer's unmount path awaits forever, the visual stays in the top layer, the listeners stay bound.

Today's worst case is a reported teardown step. The proposed worst case is a silent permanent leak plus a hung promise. That is a real regression in failure behaviour, and it is a property of the mechanism rather than of any particular implementation of it.

**Probe.** Once the bracket exists, force a throw from inside each nested level during a pending deferred destroy, and assert in every case that the promise resolves and all seven teardown steps ran.

## F12 — Panic is raised because the stack is unsound; deferring to its unwind is least safe there

Verified: `panic` is reached from the drain (`queue.ts:87`), from admission's `finally` (`kernel.ts:836`), and from the seam driver on a latched re-entry (`seams.ts:341`, `const panic = reentry`), with the documented order at `seams.ts:313`: _"refuse, then close, then panic, then classify"_.

And `SortableRuntime.closed` — the behavior's own latch — is documented as blind to it (`runtime.ts:127-131`): _"Its one blind spot is a kernel-internal `panic()` destroy, which does not route through the controller."_

§3 says consumer throws, classified failures and `cancel()` _"must be checked against this model separately"_. Panic is not in that list and it is the hardest case:

- **If panic defers** like `destroy()`, the kernel continues executing library code on a stack it has just declared unsound — a re-entry that violated the driver's own latch. The reason panic exists is that continuing is not safe.
- **If panic does not defer**, mid-stack physical teardown survives on the panic path, and every liveness reading that exists to see it must stay. `activation.effect` already reads `scope.presentation.signal.aborted` in preference to `rt.closed` for exactly this reason, so at least one reading and the two-liveness-source design survive the change untouched.

**Either answer costs something the model has not priced.** This is the concrete instance of §3's own attack prompt — "prove panic/cancel/failure do not recreate physical teardown under an active stack" — and the proof does not go through for panic.

## F13 — Duplication semantics depend on the shape §2 says consumers need not know

§2 ends with:

> The user should not need to know whether a first-party helper internally contributes one atomic slot or five pipeline hooks. That is assembler responsibility.

But the merge rules make the _observable behaviour of duplication_ depend on exactly that:

```ts
sortable(root, cfg, landing({ duration: 100 }), landing({ duration: 200 }));
// atomic capability → last wins → 200ms

sortable(root, cfg, layoutAnimation(), layoutAnimation());
// ordered pipeline → append → two features animating the same rows
```

Identical syntax, opposite semantics, and the difference is invisible at the call site. The second case is a real bug: two `layoutAnimation()` instances each hold their own `running: Map<HTMLElement, Animation>` and each writes additive `translate` to the same rows, so every displacement is doubled.

Today's model is uniform and loud: a duplicate single-writer slot throws `sortable: <slot> contributed by two features`, and a duplicated pipeline feature is the only case that silently doubles. §2 removes the loud half and keeps the silent half.

**The deeper point:** §2 replaces a _validation_ with a _convention_, and the convention is one the model explicitly says consumers should not have to learn. Either duplication is an error (in which case last-wins is not the rule) or consumers must know each helper's internal shape (in which case the closing sentence is false).

**Probe.** `layoutAnimation()` twice in one composition; count `animate()` calls per committed move. Expect double.

## F14 — Both sketches configure two resolvers, not one

§5 states the ergonomic goal: _"The default should likely be `box(item) = visual(item)`, so ordinary consumers still configure one thing."_

Both sketches then write both, with a hand-rolled fallback chain in each:

```ts
visual: (item) => item.querySelector('[data-drag-visual]') ?? item,
box: (item) =>
  item.querySelector('[data-drag-box]') ??
  item.querySelector('[data-drag-visual]') ??
  item,
```

That is the default re-implemented by the consumer, twice, in the two places the model uses to show what ordinary code looks like. If `box` defaults to `visual`, neither sketch should mention `box` at all — and the fact that both do suggests the authors of the sketches did not find the default sufficient for the layout they had in mind, which is worth resolving before the shape is fixed.

## F15 — Fault attribution, carried forward

§9 proposes a small string code union and says _"Do not freeze ordinary consumer codes around current pipeline stages."_ Agreed on the second half. The unaddressed half, from review 1:

The single decision an error code enables is **"is this my bug or the library's?"** The current 14 stages already encode it, badly — `ADMISSION` / `REORDER_RESOLUTION` / `TERMINAL_CALLBACK` are consumer-caused; `SCHEDULED_FRAME` / `RENDERER_WRITE` / `INVALIDATION` are not. A small union chosen for size rather than for that axis will lose it. The criticism of the current set is that it is granular on the wrong axis, not that it is granular.

---

# What survives, and where v2 is right

Stated plainly, because a review that only breaks things is not doing its job.

- **§4's three-way split is correct** and matches this review's independent finding: consumer-contract validation, library write verification, and defensive nannying are different categories. The insertion check (_did our own `after()` land?_) is library write verification and must stay. The all-or-nothing acquisition requirement for placeholder mechanics is right and is a real defect today, reachable with no `destroy()` in the fixture at all.
- **§9's `onEnd` / `onError` split is correct.** Folding diagnostics into an exactly-once terminal callback was unsatisfiable; v2 identifies the same counterexample and resolves it the right way.
- **§10 is well argued** and should not be reopened. Faithful lift is a product guarantee.
- **§7 removes more than it claims**, as the previous round noted: D-16's provisional/authoritative distinction, `authoredReady`, the three-conjunct guarded re-anchor, `retarget()`, and F-13/F-15/F-16 all become unnecessary once the landing measures a committed DOM. That is the strongest argument for serial and the document still undersells it.
- **§2's single ordering namespace is right.** Two namespaces for things contributing to one pipeline was a genuine defect in v1. The problem is last-wins, not the fragment list.
- **§6's diagnosis is right even though its remedy is not.** The controller being a second long-lived owner of the collection _is_ the smell. Pull fixes ownership and breaks timing (F4, F5) and cost (F6). A source-of-truth accessor plus an explicit consumer-driven invalidation signal would fix ownership without taking timing away — but that is a design, and this review is not the place for it.

---

# Probes, ranked by what they decide

| # | Probe | Decides | Effort |
| --- | --- | --- | --- |
| **P1** | Extend `tests/perf/m1.browser.test.ts` with a pull-scan variant at 20 / 200 / 800 rows against the current warm-cache frame | Whether pull needs an invalidation channel — the thing §6 forbids in advance (F6) | harness exists |
| **P2** | Stationary drag; mutate the source with no pointer events; measure time-to-cancel | Whether pull has enough boundaries at all (F4) | ~30 lines |
| **P3** | Serial fixture; Escape during the commit; assert `onEnd` vs `onError` and the reason | Whether the settlement mapping needs an abort case (F7) | ~40 lines |
| **P4** | Serial fixture; instrument `itemCount`/`itemAt`; log every pull with its phase | Whether the library can cancel its own accepted drop (F9) | ~40 lines |
| **P5** | `display: contents` items + `layoutAnimation()`; count non-zero-delta `animate()` calls | Whether `box` needs to be a write target as well as a read source (F3) | ~40 lines |
| **P6** | React fixture where the accepted commit changes the dragged row's key | Lifted-visual stability under a mandatory commit (F10) | ~60 lines |
| **P7** | `root.replaceChildren(...items)` as `render()` inside `onReorder`; assert final DOM and terminal result | Whether the imperative sketch is safe to publish (F2) | ~30 lines |
| **P8** | `layoutAnimation()` twice; count `animate()` calls per committed move | Whether last-wins can coexist with pipelines (F13) | ~20 lines |
| **P9** | Virtualized fixture; scroll during a drag until the destination gap unmounts | Whether pull helps or hurts virtualization (F5) | ~80 lines |

**P1 and P2 are the two to run first.** Between them they decide §6, which is the section with the most downstream consequences — §9's `ReorderRequest` shape is explicitly gated on it, and F9 makes §7's correctness depend on it too.

---

## One structural observation

v1 was attacked and produced v2. v2 is better, and the improvements came from the places where a section had a _concrete artifact_ to check against — the sketches, the merge table, the enumerated helper obligations. The sections without one (§6's pull boundaries, §3's bracket) are where this review found the most.

That is worth acting on directly: **§6 and §3 should each acquire an executable artifact before the next round**, not another prose iteration. For §3 that is the bracket as a real primitive with the depth counter and its `finally` discipline, measured against the C6 defect list. For §6 that is P1 and P2. Both are small, and both would move the argument from what the model predicts to what the artifact does — which is the same discipline contract 00's freeze rule already imposes on the SPI, and which the public API has never had.
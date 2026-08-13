# API review 2 — attack on the synthesis

An adversarial pass over [`api-review-1-summary.md`](api-review-1-summary.md). The brief was to attack rather than refine: find removed capabilities, hidden costs, invalid assumptions, and places where the synthesis solves the wrong problem again. Counterexamples and probes are preferred throughout; where I could verify a claim against source I did, and I say which ones I could not.

**Two of the synthesis's directions survive this pass intact and one of them is stronger than the document claims.** The rest have concrete counterexamples. I have tried to be equally concrete about both.

---

## Verdict summary

| # | Attack | Against | Class | Confidence |
| --- | --- | --- | --- | --- |
| **X1** | §4 and §6 give opposite answers to the same event | §4 / §6 | **internal contradiction** | Verified in source |
| **X2** | Deferred teardown does not fix two of the five open C6 defects, because they are not teardown-ordering defects | §3 | **invalid assumption** | Verified in source |
| **X3** | Serial `onReorder` removes the only bound the library has on consumer code | §7 | **capability removal** | Verified: `readinessTimeout` is the sole deadline in the kernel |
| **X4** | `panic()` recreates mid-stack teardown from inside a seam, and is blind to the controller latch by design | §3 | **machinery that remains** | Verified in source |
| **X5** | Cancel-on-update kills every drag that overlaps any React commit, in the package's own reference integration | §6 | **counterexample** | Verified against the reference fixture |
| **X6** | Placeholder mechanics leak onto consumer elements on _every_ discarded preparation, destroy or not | §3 / §4 | **misdiagnosed defect class** | Verified in source |
| **X7** | `onEnd()` exactly-once is unsatisfiable: `FAILURE_TERMINAL_CALLBACK` fires _after_ a terminal result | §8 | **counterexample** | Verified in source |
| **X8** | Removing `run` _and_ `duration: () => number` removes distance-scaled landing twice | §5 | **capability removal** | Verified against L-6 |
| **X9** | The stated benefit of the current readiness protocol is exactly zero for reduced-motion users | §7 | **supports the synthesis** | Reasoned from the reduced-motion collapse |
| **X10** | Serial semantics dissolves far more than the synthesis claims — F-13, F-15, F-16, `retarget`, `authoredReady`, the re-anchor and Q-12 | §7 | **synthesis undersells itself** | Reasoned |
| **X11** | Slot/value partition replaces one uniform rule with a per-option judgement call | §2 | hidden cost | Reasoned |
| **X12** | First-party features are what test the feature API; moving them to slots leaves the extension surface undogfooded | §2 | hidden cost | Reasoned |
| **X13** | `draggable()` is the kernel's public entry; "internal `draggable()`, public kernel" is a rename, not a removal | §1 | wrong problem | Reasoned |
| **X14** | Post-insertion validation is not nannying — it is the library checking its own write | §4 | over-broad principle | Verified in source |
| **X15** | Coarse error codes lose the "your bug or mine" split the 14 stages already encode | §8 | capability removal | Reasoned |

---

# X1 — §4 and §6 give opposite answers to the same event

This is the sharpest finding in the pass, because both sections are load-bearing and they contradict each other directly.

**§4 says the rendered element may be swapped mid-drag, and that this is a reason to keep re-resolving `visual()`:**

> Repeated resolution on geometry rebuild may actually be desirable because a framework can replace the internal rendered element while preserving the logical item.

**§6 says any collection change while active cancels the operation:**

```text
updateItems(newItems):
  while active  → invalidate/cancel current operation, then replace collection
```

**The contradiction.** The logical collection _is_ an array of `HTMLElement`. `updateItems(items: readonly HTMLElement[])` has no identity other than element identity — there is no key, no id, no logical handle. So a framework that "replaces the internal rendered element while preserving the logical item" produces an array in which one element is a different object. There is no way for the consumer to express "same logical item, new element" and no way for the library to distinguish it from "item removed, item added".

So the same event — a framework swaps a rendered node under a stable logical item — is:

- under §4, a routine occurrence the design should accommodate by re-resolving;
- under §6, either a cancellation (if the consumer reports it) or a silent divergence between the library's snapshot and the DOM (if it does not).

**Neither branch is acceptable.** If the consumer reports the swap, the drag dies for a reason the user did not cause. If the consumer does not report it, the library holds a stale element in its snapshot, and the survival conjuncts (`isConnected`, `nextElementSibling`) will read a detached node at release.

**What this exposes.** §4's justification for `visual()` — a logical item may have no box, or may have a box that changes — is an argument that **the collection's members are logical identities, not elements.** The current API conflates the two, and §6's cancel-on-update makes the conflation load-bearing rather than incidental. The synthesis inherits the conflation from the current implementation without noticing that its own §4 argument breaks it.

**Probe.** Compose a sortable over three rows. Mid-drag, replace row 2's DOM node with a fresh element carrying the same content and the same logical identity, and call `updateItems` with the new array. Assert what happens today, then assert what the working model would do. If the answer today is "rebase and continue" and the working model's answer is "cancel", the working model has removed a capability that §4 says is desirable.

---

# X2 — Deferred teardown does not fix two of the five open C6 defects

§3's central claim:

> This is expected to remove most or all of the I-36 `live()`/barrier/reach/stretch machinery.

I traced each of review 6's five open findings against the proposed semantics. **Three are fixed. Two are not, and the two that are not are the same species.**

| Finding | Site | Under deferred physical teardown |
| --- | --- | --- |
| **C6-01** | `landing.ts` `retarget` → `getComputedStyle` destroys → `play()` starts an animation nothing owns | **Fixed.** Teardown does not run mid-stack, so the handle is still published when it is destroyed |
| **C6-04** | `moved()` → `lift.write` → `visual.style` accessor destroys → one-shot restore runs → transform written back | **Fixed.** This is the cleanest case for the change: the restore now runs after the write, not before it |
| **C6-05** | activation publishes `rt.placeholder`/`rt.lift`/`rt.view` after `addEventListener` destroys | **Fixed.** The publications land in a live runtime and teardown nulls them afterwards |
| **C6-02** | `placement.ts` — `style` accessor destroys → `boxSizing` written to the placeholder | **Not fixed** |
| **C6-03** | `placeholder()` — `classList` accessor destroys → class added to the placeholder | **Not fixed** |

**Why the last two survive.** They are not about teardown ordering. Verified in `src/sortable/spec.ts:453-483` and `:488-500`:

- `activation.prepare` calls `createPlaceholder(...)`, which applies the mechanics — `data-drag-placeholder`, `aria-hidden`, the slot mirror, `box-sizing`, `width`, `height`, and any `className` — to an element the **consumer's factory returned**.
- The disposer that removes the placeholder is registered in `activation.effect`, not in `prepare`: `scope.presentation.use(() => { placeholder.remove(); })`.
- Between those two points the preparation can be discarded for reasons that have nothing to do with `destroy()` — revalidation failure, an invalidating collection action, a cancel latched during the same window.

So on **any** discarded activation preparation, the consumer's element is left carrying six library-authored mutations that nothing removes, because the library never adopted it and `remove()` on an element it never inserted would not undo attributes anyway.

**This is an all-or-nothing acquisition defect, not an I-36 defect.** It has the same shape as the one `landing()` already solves for itself (`landing.ts:122-156`: "acquisition is all-or-nothing: cancel what was started, then let the throw travel") and the one `acquireTopLayer` solves (`presentation.ts:177-200`: "it either fully owns the top layer or leaves the element exactly as it found it"). The placeholder path has no equivalent.

**Consequence for the synthesis.** §3 predicts these disappear with the destroy change and they do not, which means the stretch-table apparatus cannot be retired wholesale on that basis. More importantly it means **at least two of the six review passes were spent hardening the wrong invariant** — C6-02 and C6-03 were reported as I-36 breaches and would have been closed as I-36 breaches, when the defect is that the placeholder is mutated before it is owned.

**Probe (executable, no API change needed).** Compose a sortable with `placeholder({ className: 'x' })`. Force `activation.prepare` to be discarded after it returns — the simplest trigger is an `updateItems()` that removes the dragged item, queued from inside the placeholder factory. Assert the returned element carries no `data-drag-placeholder`, no `aria-hidden`, no inline `box-sizing`/`width`/`height`, and not the class. I expect this to fail today, with no `destroy()` anywhere in the fixture.

---

# X3 — Serial `onReorder` removes the only bound the library has on consumer code

§7 proposes:

```ts
async onReorder(request) {
  setOrder(next);
  await authoredCommit;
  return accept();
}
```

and states the cost as: "losing overlap between React commit latency and landing animation."

**That is not the cost. The cost is that the operation becomes unbounded.**

Verified: the only deadline anywhere in `src/kernel/kernel.ts` is `startReadinessDeadline` (`:1189-1225`), bounded by `config.readinessTimeout`. The consumer round-trip — the `onReorder` promise itself — has **no bound**. There is no timer, no abort, no fallback. Today that is acceptable because the recommended path is a _synchronous_ `accept({ presentation: true })` followed by a _bounded_ acknowledgement: the promise is short-lived and the long wait is the one with the deadline on it.

Serial semantics inverts this. The long wait moves _into_ the unbounded channel, and the bounded one is deleted in the same change.

**Concrete counterexample.** The consumer constructs a Deferred inside `onReorder`, calls `setOrder(next)`, and resolves the Deferred from `useLayoutEffect`. Then:

- React decides not to re-render, because `next` is referentially equal to the current state (a no-op reorder that the consumer computed rather than the library) — the layout effect never runs, the Deferred never resolves.
- Or the component subtree unmounts during the commit — a route change, an error boundary, a parent `key` change — and the layout effect never runs.
- Or the consumer's `onReorder` throws _after_ creating the Deferred but before wiring it up.

In every case the operation never settles. The placeholder stays in the list, the visual stays lifted and promoted to the top layer, the collection is frozen, and **there is no recovery path except the consumer noticing and calling `destroy()`** — which is exactly the consumer whose bookkeeping just failed.

**Why this is a removal and not a pre-existing gap.** The gap exists today, but it is reachable only by a consumer who deliberately returns a long-lived promise from `onReorder`. The synthesis makes that the _only_ shape. It moves an unbounded await from an opt-in corner onto the main road while deleting the mechanism that bounds the equivalent wait.

**The synthesis's own framing concedes the mechanism.** §7 lists what is removed: "the explicit readiness protocol, request-identity acknowledgement, readiness timeout, early/armed acknowledgement states, and the second settlement gate." Four of those five are protocol. `readinessTimeout` is not protocol — it is a liveness bound, and it is the only one in the package.

**Probe.** Write the serial fixture, then have the consumer's Deferred never resolve. Assert what state the DOM, the collection and the controller are in after 5 seconds. Then do the same with a `readinessTimeout`-equivalent bound on the round-trip and compare. If the answer is that serial semantics needs a round-trip deadline, then the deadline was never readiness-specific and deleting it was the wrong move regardless of which protocol wins.

---

# X4 — `panic()` recreates mid-stack teardown, from inside a seam, by design

§3 asks the right question — "cancellation, panic/failure, nested dispatch, retirement, or some other path may recreate the same mid-stack teardown problem" — and the answer is yes, for panic specifically, and it is worse than the `destroy()` case.

Verified in source:

- `panic` is `destroy()` plus reporting, with teardown strictly before reporting (`kernel.ts:531`, and contract `01` §Teardown).
- It is reached from three places: the queue's drain (`queue.ts:87`), the admission `finally` (`kernel.ts:836`, "a throw escaping admission — a panicking…"), and **from inside the seam driver on a latched re-entry** (`seams.ts:341`, `const panic = reentry`, with the documented order at `:313`: "**refuse, then close, then panic, then classify**").
- `SortableRuntime.closed` — the latch every behavior-side barrier reads — is **documented as blind to it** (`runtime.ts:127-131`): "Its one blind spot is a kernel-internal `panic()` destroy, which does not route through the controller."

So a panic raised from inside a seam tears the controller down mid-stack, and the behavior's own barriers cannot see it. Every argument §3 makes about `destroy()` applies to panic with one difference: **the panic path is the one where the stack is already known to be broken**, so deferring teardown there is the least attractive option and running it immediately is the mid-stack problem the synthesis is trying to delete.

**This is the "machinery that remains after the guarantee supposedly disappears" case the review task asks for.** If `destroy()` defers and panic does not, the behavior still needs a liveness reading that sees panic — which is the `presentation.signal.aborted` reading `activation.effect` already uses in preference to `rt.closed`, for exactly this reason. That reading, and the reasoning behind having two liveness sources, survives the change untouched.

**Probe.** Force a latched re-entry inside a seam (the driver's own re-entry path) while a consumer-reaching sequence is mid-flight, and assert whether the behavior's barriers observe the teardown. If they do not, the deferred-`destroy()` design has to state what panic does, and "panic defers too" needs to be checked against the case where the panic was raised _because_ the stack is unsound.

---

# X5 — Cancel-on-update kills every drag that overlaps any React commit

§6's working model:

```text
updateItems(newItems):
  while active  → invalidate/cancel current operation, then replace collection
```

**The package's own reference React integration calls `updateItems` unconditionally from a layout effect with no dependency array.** From `tests/sortable/react.browser.test.ts:206-210`:

```ts
// Undefined on the mount commit, which is the commit that produces the
// elements the controller is about to be armed against.
controller?.updateItems(live);
```

A layout effect with no dependency array runs after **every** commit. So under cancel-on-update, any React re-render during a drag — a sibling component's state change, a context update, a hover state, a timer, a websocket message, a parent re-render — cancels the drag.

**This is not a fixture artifact.** The story does the same thing from `onFinish`, and the general pattern "tell the library about the current elements after every commit" is the only correct one available, because the consumer has no way to know whether a given commit changed the collection: `live` is recomputed from the element map on every render, and comparing it to the previous array is work the consumer must now do.

**So the synthesis moves real complexity to every consumer.** To survive cancel-on-update, each consumer must:

1. remember the last array it published,
2. compare element-by-element on every commit,
3. suppress `updateItems` when nothing changed,
4. and know whether a drag is currently active — for which **there is no public predicate**. The consumer must track it from `onStart`/`onFinish`/`onCancel`, which has a window: `onStart` runs inside `activation.effect`, so a commit between admission and `onStart` sees no drag in progress.

Item 4 is the one that makes this a genuine hidden cost rather than a small chore: the synthesis's model requires consumers to know a piece of library state the library does not expose.

**Counterexamples beyond React.** The synthesis names virtualization and collaboration as places to look; both are worse than it suggests.

- **Collaboration.** Two users on one list. A remote peer appends an item while the local user is dragging. Today the end-gap survival rule keeps the drag alive. Under cancel-on-update, any remote edit aborts every local drag. In a collaborative product this is not a degradation, it is a non-feature.
- **Virtualization.** A virtualized list recycles nodes on scroll, and scrolling during a drag is ordinary (the library installs scroll invalidation listeners precisely because it expects it). Every recycle changes the element array. Under cancel-on-update, a virtualized list cannot be dragged past the edge of the viewport.

**The honest counter.** Nobody has demonstrated that drag2 supports virtualization today either — there is no fixture, and the reconciliation rules were written for a static list. So the accurate statement is not "cancel-on-update breaks virtualization"; it is **"cancel-on-update forecloses virtualization before anyone has checked whether reconciliation delivers it."** That is still a decision worth making deliberately rather than by omission, because reconciliation is expensive to remove and expensive to re-add.

**Probe.** Take the existing React fixture unchanged. Add a sibling `useState` counter incremented by a 100 ms interval. Drag a row. Under today's semantics the drag survives; under cancel-on-update it dies within 100 ms. This is a ten-line probe and it decides the section.

---

# X6 — The placeholder ownership convention is too weak in one specific place

§4 proposes:

> Return a fresh detached element. The library assumes ownership until the operation ends.
>
> Do not build production machinery to prove that the consumer complied.

I agree with the principle and it is correctly applied to most of the current checks. **One check is not compliance-proving and should not be swept up with them.**

`activation.effect` verifies that the placeholder insertion actually took (`spec.ts:498-500` and contract `02` §I-30). This is not the library checking the consumer's honesty; it is the library checking **its own write succeeded**, because `after()` connects the element and a custom element's `connectedCallback` runs synchronously inside that call and can remove or move it.

Under "trust the contract", the library proceeds with a placeholder it believes is in the list and which is not. Every subsequent geometry read — the placeholder's own rect, which is the incumbent candidate in both axis rules — is then garbage, and the failure is silent: the drag simply proposes wrong gaps.

**Concrete counterexample that is not consumer misbehaviour.** A placeholder that is a custom element with a `connectedCallback` performing any DOM work that reparents it — a portal, a tooltip anchor, a framework-managed wrapper. Also any container whose contents are reconciled by a framework that removes unknown children on the next tick. F-14 established that React does _not_ do this; it establishes nothing about Vue, Angular, Lit's `repeat`, or an `innerHTML` write from unrelated code.

**The distinction worth preserving:** checks that prove the consumer complied are nannying; checks that verify the library's own mutation landed are error handling. §4's principle is right and its blast radius needs a boundary, or the next review pass removes an error check and rediscovers it as a defect.

---

# X7 — `onEnd()` exactly-once is unsatisfiable as specified

§8 proposes:

> A single exactly-once terminal callback is worth investigating: `onEnd(result)` with `accepted | noop | rejected | canceled | failed`.

Verified counterexample in source. `FAILURE_TERMINAL_CALLBACK` is the stage for a throw from the consumer's own `onFinish`/`onCancel`, and `settlement.prepare` handles it specially (`spec.ts:1155-1166`):

```ts
// A terminal-callback failure has recovery "none": the operation
// already finalized, and rewriting the outcome now would relabel a
// drop that has been reported as accepted.
if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
  draft.outcome = OUTCOME_FAILED;
  ...
}
```

So the sequence is: operation completes → `onFinish(accepted)` → consumer's handler throws → `onError(FAILURE_TERMINAL_CALLBACK)`, with the accepted result deliberately _preserved_.

Under exactly-once `onEnd`, this is unrepresentable. The choices are:

- call `onEnd` twice (violates exactly-once);
- relabel the operation `failed` (the code comment says why this is wrong: it relabels a drop already reported as accepted);
- swallow the consumer's own exception (worst of the three — it is the case where the consumer most needs to be told).

**The general shape.** Not every failure is terminal. `FAILURE_LANDING_TARGET` has recovery _immediate_ and the contract states "the pin is skipped but presentation is still released" — the drop still completes. `FAILURE_TERMINAL_CALLBACK` has recovery _none_. Both fire after or alongside a successful outcome. A unified terminal callback needs a separate non-terminal error channel anyway, at which point it has not unified anything — it has renamed `onFinish`+`onCancel` to `onEnd` and kept `onError`.

**That renaming may still be worth it.** Collapsing `onFinish`/`onCancel` into one `onEnd` is a real ergonomic win and costs nothing, because they are already mutually exclusive and exactly-once ("once a start is notified, exactly one terminal callback follows", I-31). The claim that should be dropped is that `onError` folds into it.

---

# X8 — Removing `run` _and_ the duration thunk removes distance-scaled landing twice

§5 proposes library-owned `landing({ duration, easing })` and adds:

> `duration: () => number` should also have to justify itself independently.

It has already justified itself, on the record, and the justification is the exact requirement §5 asks for ("identify a realistic product requirement that cannot reasonably be expressed with library-owned timing/easing").

Ledger L-6 and probe 13b B-2: settle-time timing is a **shipped** capability of `@ydinjs/drag` (`landingTiming()` was read at settle time), and the requirement it serves is a **distance-scaled duration** — a drop travelling 40 px should not take as long as one travelling 600 px. That cannot be expressed by a construction-time constant, because the distance is not known until the settlement decides where the visual is going.

Before Phase 15, the only way to get it was to replace the whole runner and lose the reduced-motion collapse, the retarget replay and the generation guard. Phase 15 shipped the thunk specifically so the capability did not require the escape hatch.

**So the two removals interact badly.** Removing `run` is defensible precisely _because_ the thunk covers the ergonomic case. Removing both leaves distance-scaled duration — a shipped, retained, parity-classified capability — unexpressible.

**The thunk's cost is one call per landing and one range check.** Against `run`'s five public types and four-clause obligation, they are not comparable, and pricing them in the same paragraph is what makes the section look symmetric when it is not.

**One caveat in the synthesis's favour**, which it does not make: §5's concern that a custom runner "can weaken the final-position guarantee" is real but is _not_ removed by deleting `run`. Contract `02` makes I-24 conditional on successful relinquishment of runner control, and the library's own WAAPI runner also calls `cancel()` on a consumer element — which can fail on a detached node. The three-conjunct conditional on I-24 survives the removal. The five public types do not, and that is the real prize.

---

# X9 and X10 — where the synthesis is right, and undersells its own case

Two findings that cut in the synthesis's favour. A review that only attacks is not doing its job.

## X9 — the current readiness protocol's sole benefit is zero for reduced-motion users

The overlap between the consumer's commit and the landing animation is the entire justification for two independent gates — contract `02` calls it "a **structural property rather than a promise-handling convention**".

Under `prefers-reduced-motion: reduce`, the default runner collapses duration to zero. There is then **no animation to overlap with.** The gate is still held (a zero-duration landing still takes a hold — I-9, and contract 03 is explicit that `duration: 0` "is immediate but not the same code path"), the request-identity protocol still runs, the deadline still arms, the early/armed acknowledgement windows still exist — and the benefit they exist to deliver is exactly nil.

So for every reduced-motion user, the parallel protocol is pure cost. That is a materially stronger argument for §7 than "there is not yet evidence that the saved latency justifies its complexity", and it is available without measuring anything.

## X10 — serial semantics dissolves much more than §7 claims

§7 lists what goes away: "the explicit readiness protocol, request-identity acknowledgement, readiness timeout, early/armed acknowledgement states, and the second settlement gate."

Under serial semantics the authored commit lands **before** the landing starts. That means `anchorTarget` measures a DOM that is already final, and the following also become unnecessary:

- **D-16's provisional/authoritative target distinction** — the target is authoritative on first measurement.
- **`authoredReady`** — always true at the point it is read.
- **The readiness-time re-anchor and its three-conjunct guard**, and with it Q-12's degraded fallback and the two checked-in fixtures that pin it.
- **`LandingHandle.retarget()`** — it exists to correct a trajectory started before the commit. There is no such trajectory.
- **F-13** (stale landing target when the commit inserts content above the placeholder), **F-15** (a new keyed item in the destination gap), **F-16** (the visible step at the join when a short landing finishes before readiness). All three are artifacts of starting the landing before the DOM is final.

That is a substantially larger reduction than the section claims, and it lands in the part of the kernel that has been hardest to get right. **If §7 is adopted, this is the argument for it** — the latency question is a second-order trade, and the first-order effect is that a whole class of "the DOM moved under the landing" problems stops existing.

**The honest counter, which should be probed rather than assumed.** Serial semantics does not stop _unrelated_ re-renders from moving the placeholder during the landing. It removes the structured case (the commit this drag caused), not the general one. Whether the general one matters is a probe: render a sibling component that reflows the list on a timer, and see whether the join's pin is still sufficient without a re-anchor.

---

# X11–X15 — shorter attacks

## X11 — the slot/value partition replaces one uniform rule with a per-option judgement

§2 proposes three destinations: direct typed slots, independently importable values/modules, and a feature-authoring API. The consumer must then learn, per option, which of the three it is — `handle` is a slot, `landing` is an imported value, a custom insertion rule is a feature.

Today the rule is uniform and wrong-but-learnable: _everything is a feature you import and pass positionally._ The proposal is right-but-irregular. That is usually the better trade, and it is worth naming as a cost rather than assuming it is free: the current uniformity is why the story can spread a conditional feature into the argument list, and why there is exactly one place to look for "how do I configure X".

The partition also has a moving boundary. `layoutAnimation()` is an importable value today because it is 454 B. If a future first-party option grows past whatever threshold justifies that, it migrates from slot to import — a breaking change driven by an implementation detail.

## X12 — moving first-party config to slots leaves the extension API undogfooded

The feature mechanism's constraints were discovered by building first-party features against it. D-19 — geometry as a _paired_ `resolve`/`invalidate`/`retire` contribution rather than a lone read — exists because "contributing only `resolve` forced behavior code to reach into a private rect index, which could not compile". That constraint was found by writing `vertical()` as a feature.

If the first-party options become slots, the feature API's only inhabitants are third-party, and nothing in the library's own suite exercises it. The usual outcome is that the extension surface rots: it keeps compiling and stops being usable. Retaining one or two first-party features _as features_ specifically to dogfood the surface is cheap insurance, and choosing which ones is a real decision the synthesis does not make.

## X13 — "internal `draggable()`, public kernel" is a rename

§1 proposes `sortable(root, options)` / `freeDrag(root, options)` as the ordinary constructors, with `draggable()` demoted to an implementation primitive, while keeping "a supported lower-level kernel API" for custom behaviors.

But `draggable(root, behavior)` **is** that API. It is the two-phase handshake (D-1), and the handshake exists to make "no input can be admitted before install returns" unexpressible rather than a rule to obey: the behavior returns `{ spec, controller }` in one call and only `draggable()` holds the kernel handle and calls `arm()` exactly once.

A custom-behavior author needs precisely that entry point. Whatever it is called, it has the same signature and the same guarantee. So §1's question — "is there real value in keeping `draggable()` public that cannot be provided cleanly through the kernel authoring API?" — has the answer: the kernel authoring API _is_ `draggable()`, and the choice is what to name it, not whether to have it.

The genuine question underneath, which is worth asking: should `sortable(root, options)` be a thin wrapper over the public `draggable()`, or should the kernel entry be a separate, differently-shaped surface? The first keeps one mechanism; the second lets the ordinary path be ergonomic and the advanced path be explicit. That is a real choice; "make it internal" is not.

## X14 — see X6

Folded into X6 above; recorded here so the numbering matches the summary table.

## X15 — coarse error codes lose the "your bug or mine" split

§8 characterises the 14 `FAILURE_*` constants as exposing "internal pipeline decomposition". Partly true — but they already encode a distinction a consumer genuinely acts on:

- **Consumer-caused:** `ADMISSION` (a `handle`/`visual` resolver threw), `REORDER_RESOLUTION` (the resolver threw or returned a non-resolution), `TERMINAL_CALLBACK` (the consumer's own `onFinish`/`onCancel` threw), `PRESENTATION_READY` (the consumer did not acknowledge).
- **Library- or platform-caused:** `SCHEDULED_FRAME`, `RENDERER_WRITE`, `INVALIDATION`, `LANDING_CREATE`, `LANDING_INTERRUPTED`.
- **Ambiguous:** `ACTIVATION`, `INSERTION`, `PLACEHOLDER_MOVE`, `LANDING_TARGET`, `RELEASE`.

"Should I file a bug against the library, or fix my own resolver?" is the single most useful decision an error code enables, and a consumer-level code set should preserve it deliberately rather than by accident. The right criticism of the current set is not that it is too granular — it is that it is granular on the _wrong axis_ (pipeline stage) and offers nothing on the axis that matters (fault attribution).

This is the same inversion review 1 found in the cancel vocabulary (L-11): the surface is richest where consumers do not branch and absent where they do.

---

# Probes, in the order I would run them

Each is cheap and decides something the synthesis currently assumes.

| # | Probe | Decides | Cost |
| --- | --- | --- | --- |
| **P1** | Existing React fixture + a sibling `useState` on a 100 ms interval; drag a row | Whether cancel-on-update is viable at all (§6) | ~10 lines |
| **P2** | Discard an `activation.prepare` (queue an `updateItems` removing the dragged item from inside the placeholder factory); assert the returned element carries no library mutations | Whether C6-02/C6-03 are I-36 defects or acquisition defects (§3, §4) | ~30 lines |
| **P3** | Serial `onReorder` whose Deferred never resolves; assert DOM/collection/controller state after 5 s | Whether serial semantics needs a round-trip deadline (§7) | ~30 lines |
| **P4** | Swap a row's DOM node mid-drag for a fresh element with the same logical identity, then `updateItems` | Whether §4 and §6 can both be true (X1) | ~40 lines |
| **P5** | 200-row list, React concurrent, CPU throttled; measure time from `pointerup` to first landing motion, serial vs parallel | The actual size of the overlap benefit (§7) — currently unmeasured in either direction | harness exists in `tests/perf/` |
| **P6** | Force a latched seam re-entry during a consumer-reaching sequence; assert whether behavior barriers observe the panic teardown | Whether deferred `destroy()` leaves the mid-stack problem alive on the panic path (§3) | ~40 lines |
| **P7** | Reduced-motion + `duration: 0` landing, current protocol; confirm the gate is held and the overlap benefit is nil | Whether X9's argument holds, strengthening §7 at no cost | ~20 lines |

**P1 and P2 are the two I would run before anything else.** P1 can invalidate §6 outright, and P2 determines whether the destroy rewrite can retire the stretch table or only most of it — which is the difference between §3 being a simplification and §3 being a simplification plus a separate unfixed defect class.

---

# What survives this pass

Stated plainly, because the review task allows a finding that a current mechanism was justified, and it should also allow a finding that a proposed change is sound.

**Sound as proposed:**

- **§3's core insight.** Deferring physical teardown fixes three of five open defects, including the most consequential one (C6-04), and it removes the reason the enumeration was unbounded. It does not remove the enumeration — a transaction-boundary set replaces a liveness-reading set — but that set is smaller and closed, which is the real win.
- **§5's removal of `run`.** Five public types and a four-clause obligation for a capability nothing exercises. The thunk should stay (X8).
- **§8's collapse of `onFinish`/`onCancel`.** They are already mutually exclusive and exactly-once. Folding `onError` in is the part that does not work (X7).
- **§2's direction for genuinely optional implementation.** `landing()` and `layoutAnimation()` carry 90% of the measured differential and belong as importable values.
- **§9's discipline** — settle collection semantics before touching `ReorderRequest` — is correct and is the only sequencing decision in the document.

**Sound but under-argued:** §7, which is stronger than the synthesis claims (X10) and free for reduced-motion users (X9), and which needs a round-trip bound to be safe (X3).

**Not sound as stated:** §6's cancel-on-update (X1, X5), §3's claim to remove _all_ the I-36 machinery (X2, X4), §8's exactly-once `onEnd` (X7), and §5's pairing of the duration thunk with the runner escape hatch (X8).

---

## One methodological note

The synthesis opens by observing that expensive mechanisms exist "not because the underlying capability is inherently difficult, but because the public contract promises unusually strong behavior around misuse". That diagnosis is correct for `destroy()` and for readiness.

X2 and X6 suggest a second pattern sitting underneath it, which the synthesis does not name: **several defects attributed to the strong-guarantee pattern are actually ordinary all-or-nothing acquisition bugs on consumer-owned resources.** The placeholder is mutated before it is owned; the landing runner had the same shape and fixed it locally; `acquireTopLayer` had the same shape and fixed it locally. Nobody has stated it as one rule, so it has been rediscovered three times and misfiled once.

Weakening the `destroy()` guarantee will not fix that class, and — this is the part worth watching — it will make it _harder to find_, because the reentrant-destroy fixtures are currently the only tests that exercise these paths at all.
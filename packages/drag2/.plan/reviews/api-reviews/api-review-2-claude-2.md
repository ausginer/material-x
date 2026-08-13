# Attack on the API review synthesis

Adversarial pass over [api-review-1-summary.md](api-review-1-summary.md). I read the current `packages/drag2` source rather than the synthesis's account of it, and I looked for the four things the brief asks for: removed capabilities, hidden costs, invalid assumptions, and places where the programme is solving the wrong problem again.

Everything below cites source. Where I could not verify a claim from source I say so and give the probe that would settle it. Where the synthesis is right I say that too — §7 and §8 in particular survive better than the synthesis itself expects, and one current mechanism (§6's phase gate) turns out to be load-bearing for a _different_ proposal in the same document.

**The headline:** the synthesis is nine independent reductions, but three of them are coupled and two of them contradict. §6 and §7 cannot both ship as written. And §3 — the reduction every other section's cost case leans on — is a smaller saving than claimed, because it removes the _verdict_ column of the I-36 analysis but not the _enumeration_, which is where six checkpoint reviews spent their money.

---

## Findings

| # | § | Finding | Kind | Severity |
| --- | --- | --- | --- | --- |
| R-01 | 3 | `cancel()` reproduces mid-stack retirement, and cannot be deferred | invalid assumption | **major** |
| R-02 | 3 | A consumer `throw` is the residual escape; the enumeration survives | invalid assumption | **major** |
| R-03 | 3 | "no new work is admitted" is undefined for the transaction already running | underspecified | **major** |
| R-04 | — | The machinery's real generator is lifting the consumer's real node; unexamined | wrong problem | **major** |
| R-05 | 6×7 | Cancel-on-update destroys the serial commit; the two proposals contradict | contradiction | **blocking** |
| R-06 | 6 | Cancel-on-update breaks virtualization, which today works by design | removed capability | **major** |
| R-07 | 7 | `readinessTimeout` is the only automatic recovery from a never-committing render | removed capability | **moderate** |
| R-08 | 9 | `before`/`after` are not downstream of reconciliation; CRDT/fractional stores need them | removed capability | **moderate** |
| R-09 | 8 | `onEnd` merges four lifecycle moments with different DOM state | hidden cost | **moderate** |
| R-10 | 8 | `onEnd` is silent for `destroy()`; "exactly-once terminal" is false | underspecified | **moderate** |
| R-11 | 5 | `duration: () => number` cannot express the use case it exists for | wrong shape | **moderate** |
| R-12 | 1 | The kernel authoring layer does not exist; §1 debates the visibility of an unbuilt capability | invalid assumption | **major** |
| R-13 | 2 | Direct slots are a small size _regression_; the tree-shaking argument does not support them | hidden cost | **minor** |
| R-14 | 4 | §4 conflates placeholder _mechanism_ with placeholder _verification_; verification is ~5 lines | invalid assumption | **moderate** |
| R-15 | 4 | `visual()` re-resolution is safe for candidates and unsafe for the lift; one callback, two contracts | underspecified | **moderate** |

---

# Part I — §3, the load-bearing assumption

The synthesis says deferred physical teardown "is expected to remove most or all of the I-36 `live()`/barrier/reach/stretch machinery." Three counterexamples say it removes the `live()` calls and keeps the analysis.

## R-01 — `cancel()` reproduces the same mid-stack problem, and cannot be deferred the same way

`destroy()` is not the only synchronous consumer-initiated retirement. `controller.cancel(reason?)` is public today — [controller.ts:36](packages/drag2/src/sortable/controller.ts#L36), [:129](packages/drag2/src/sortable/controller.ts#L129), kernel entry [kernel.ts:2201](packages/drag2/src/kernel/kernel.ts#L2201) — and it is latched first-wins and **invalidates any open preparation synchronously** ([kernel.ts:558-565](packages/drag2/src/kernel/kernel.ts#L558-L565), [:588-597](packages/drag2/src/kernel/kernel.ts#L588-L597)).

So take C6-01, the sixth review's worst finding, and change one word. Today:

```
retarget() reads getComputedStyle(visual)     ← consumer-reachable
  → the getter calls controller.destroy()
  → retireAttempts() destroys the landing handle
  → control returns; retarget() calls play(); a new animation is published, unowned
```

Under the proposed contract this specific trace is fixed, because teardown waits. Now:

```
retarget() reads getComputedStyle(visual)
  → the getter calls controller.cancel()
  → the latch invalidates the open preparation synchronously
  → control returns; retarget() plays an animation for a target that is now the home gap
```

`cancel()` **must** take effect immediately — it is what Escape does ([pointer.ts:48-71](packages/drag2/src/kernel/pointer.ts#L48-L71), [kernel.ts:673-675](packages/drag2/src/kernel/kernel.ts#L673-L675)) and what the collection invalidation path does ([spec.ts:873-875](packages/drag2/src/sortable/spec.ts#L873-L875)). Deferring the _latch_ to transaction unwind would mean an Escape pressed during a long synchronous consumer callback is observably ignored.

The synthesis anticipates this — "Determine whether the underlying rule must apply to all physical retirement, not only destruction." **My answer: yes, and that is the whole cost.** There are three producers of synchronous mid-stack state change reachable from consumer code, not one:

| producer           | reachable from        | deferrable?                |
| ------------------ | --------------------- | -------------------------- |
| `destroy()`        | any consumer callback | yes — this is the proposal |
| `cancel()`         | any consumer callback | **no** — Escape semantics  |
| a consumer `throw` | any consumer callback | **no** — see R-02          |

Deferring one of three does not delete the analysis that enumerates where consumer code runs. It changes what that analysis asks at each site.

**Probe.** `landing({ run })` is not needed: install the default landing, `accept({presentation: true})`, and override `getComputedStyle` on the realm window so the first call during `retarget` invokes `controller.cancel()` and then delegates. Assert the item lands at the home gap, not the destination. If it lands at the destination, `cancel()` is a live instance of C6-01 that the `destroy()` change does not touch.

## R-02 — a consumer `throw` is the residual escape, and it is worse than `destroy()`

A consumer accessor can stop the library mid-statement without calling anything, by throwing. No contract change prevents this. So every invariant currently pinned by a stretch row must still hold under a mid-statement abort — the _enumeration_ of consumer-reaching call sites survives verbatim. Only the verdict column changes, from "is there a liveness reading?" to "is the interrupted state recoverable?"

And for at least one current site the answer is **no**, today, and the `destroy()` change does not help. Take C6-02's site, [placement.ts:48-114](packages/drag2/src/sortable/placement.ts#L48-L114) (`applyMechanics`), and replace "destroys" with "throws":

```
applyMechanics(placeholder, visual):
  placeholder.setAttribute('data-drag-placeholder', '')   ← :71   written
  placeholder.setAttribute('aria-hidden', 'true')         ← :77   written
  placeholder.slot = item.slot                            ← :87-91 written
  const { style } = placeholder                           ← consumer getter — THROWS
```

The consumer's element now carries three library attributes and a mirrored slot, and **nothing will remove them**, because `applyMechanics` runs inside `createPlaceholder` ([placement.ts:120](packages/drag2/src/sortable/placement.ts#L120)) during `activation.prepare` ([spec.ts:477-486](packages/drag2/src/sortable/spec.ts#L477-L486)), and the placeholder-removal disposer is not registered until `activation.effect` ([spec.ts:492-495](packages/drag2/src/sortable/spec.ts#L492-L495)). The throw is classified `FAILURE_ACTIVATION` and reported, but the element stays mutated. I-36 floor act 3, reached without any destroy.

This matters for the proposal specifically: today the `live()` checks make this path _rare_ by turning most consumer interference into a clean bail. Delete them and every one of these becomes throw-only-reachable — which is not "removed", it is "harder to notice". The synthesis's own category, _"machinery that remains even after the public guarantee supposedly disappears"_, applies to itself here.

**What I would take from this.** The reach table is not I-36 machinery. It is the enumeration of where consumer code executes, which is needed for _any_ correctness discipline — liveness, exception safety, or reentrancy. Keep the artifact; retire the verdict. That is a real saving (a branch per write on the pointer-move hot path) and it should be claimed honestly as such, not as "most or all of the machinery".

**Probe.** Public composition, `placeholder({ create })` returning an element whose `style` getter throws. Assert the returned element has no `data-drag-placeholder`, no `aria-hidden`, and an unchanged `slot` after `onError` fires.

## R-03 — "no new work is admitted" does not constrain the transaction already running

The working semantics say the controller "becomes logically closed immediately" and "no new work is admitted". Neither phrase says what happens to consumer callbacks the _current_ transaction has not yet reached.

Concretely: `getVisual` runs inside `seedDraft` during admission ([spec.ts:185-186](packages/drag2/src/sortable/spec.ts#L185-L186)), and today the kernel revalidates immediately after — [kernel.ts:721-726](packages/drag2/src/kernel/kernel.ts#L721-L726), whose comment names exactly this case:

> "An admission member runs consumer-supplied handle and visual resolvers during native dispatch, and a resolver can close over the already-returned controller and synchronously destroy it. Without this recheck a terminal controller publishes a new operation."

Under deferred teardown, `visual: (item) => { controller.destroy(); return item; }` produces: admission succeeds → `preventDefault()` fires ([kernel.ts:719](packages/drag2/src/kernel/kernel.ts#L719)) → an operation is minted → activation lifts the real element into the top layer and sets `position: fixed` ([presentation.ts:425](packages/drag2/src/kernel/presentation.ts#L425), [:464](packages/drag2/src/kernel/presentation.ts#L464)) → a placeholder is inserted into the consumer's list ([spec.ts:496](packages/drag2/src/sortable/spec.ts#L496)) → **`onStart(item)` is called** ([spec.ts:608](packages/drag2/src/sortable/spec.ts#L608)) → the transaction unwinds → teardown.

A consumer callback fired after `destroy()` returned. That is a direct regression against the current guarantee, and it is not obviously excluded by "no new work is admitted", because starting an operation is exactly the work the already-running transaction was doing.

The fix is a check at each consumer-callback site gated on `closed` — which is the C2-01 callback enumeration, the _first_ of the four sets the programme has already terminated over. So the domain question does not go away with `destroy()`; it reverts to its 2-passes-ago form. **That is fine** — 13 callback sites is much cheaper than 62 stretches — but it should be planned, not discovered.

**Decision the synthesis owes:** does "logically closed" mean (a) no new _operation_, (b) no new consumer _callback_, or (c) no new DOM _mutation_? These are three different contracts with three different implementation costs, and R-02 shows (c) is the one the defects are actually about.

**Probe.** `visual: (item) => { controller.destroy(); return item; }`; `pointerdown` + move past threshold; assert `onStart` was never called and the item's inline `position` is `''`.

## R-04 — the un-asked question: the machinery is downstream of lifting the consumer's real node

The synthesis frames the cost centre as "the public contract promises unusually strong behavior around misuse, reentrancy, or live mutation." I do not think that is where the money went.

`grep -rn cloneNode src/` returns nothing. drag2 promotes the **consumer's own element**: it writes `position: fixed`, `transform-origin`, `transform` ([presentation.ts:425-454](packages/drag2/src/kernel/presentation.ts#L425-L454)) and takes a top-layer/popover lease ([:177](packages/drag2/src/kernel/presentation.ts#L177), [:464](packages/drag2/src/kernel/presentation.ts#L464)) on a node the consumer's framework owns and may re-render at any moment.

Everything expensive follows from that one decision:

- `captureInlineStyles` and the one-shot latched per-property restore ([presentation.ts:129-158](packages/drag2/src/kernel/presentation.ts#L129-L158)) — needed only because the styles being overwritten are not ours.
- The ordering constraint that the landing runner must be `destroy()`ed _before_ the pin, so a live WAAPI animation cannot override the inline transform ([kernel.ts:1367-1372](packages/drag2/src/kernel/kernel.ts#L1367-L1372), [:1404-1434](packages/drag2/src/kernel/kernel.ts#L1404-L1434)) — needed only because the runner and the kernel are writing to the same consumer node.
- `fill: 'forwards'` being mandatory in the runner contract ([landing.ts:108-112](packages/drag2/src/sortable/landing.ts#L108-L112)).
- The entire "surviving mutation after teardown" defect class — C6-01, C6-02, C6-03, C6-04 are all _the library left a mark on a node it does not own_.

A clone-based lift deletes all of it: the lift target is library-created, so there is nothing to restore, nothing to sequence against, and a mid-stack abort leaves a detached node that GC collects. None of §1–§10 touches this, and all of §1–§10 together will not remove as much machinery.

**I am not proposing the change.** Faithful lift has real reasons: form-control state, `<canvas>`/ `<video>` contents, running CSS animations, Web Component internal state, and `:focus-within` continuity all die in a clone, and `LIFT_FAITHFUL` was chosen deliberately over a flat lift for zoom correctness ([spec.ts:371-380](packages/drag2/src/sortable/spec.ts#L371-L380)). It is a genuine trade.

**But it is the trade the synthesis should be making, and it is not in the document.** If the goal is "stop paying large runtime/lifecycle costs", the honest first measurement is: _what fraction of teardown machinery is downstream of lifting the real node?_ My estimate from the source is: most of it. That question is cheaper to answer than §3 is to implement.

**Probe.** Not a probe — a spike. Branch, replace `acquireLift` with a clone-based lift for the sortable composition only, and diff (a) bytes, (b) the stretch/reach table's surviving rows, (c) which of C6-01…C6-04 become unreachable. One afternoon; it either reframes the programme or retires the idea permanently.

---

# Part II — §6 × §7, the contradiction

## R-05 — cancel-on-update destroys the serial commit. These two cannot both ship.

§7 asks the consumer to commit authored DOM **during** the operation:

```ts
async onReorder(request) { setOrder(next); await authoredCommit; return accept(); }
```

§6 says: `updateItems()` while active → **cancel the current operation**.

In React, the idiomatic way to tell the library the collection changed is an effect keyed on the rendered order — and that effect fires on exactly the commit §7 introduces:

```tsx
useEffect(() => {
  controller.updateItems(refs.current);
}, [order]);
```

So the accepted drop cancels itself. Not a corner case: it is the _only_ path §7 defines.

§6 anticipates this and answers with a rule: _"Authored DOM movement caused by accepting the current reorder is not automatically a logical `updateItems()` event."_ **That rule is not implementable by the consumer.** A React effect cannot tell which commit was drag-caused; it sees an order array that changed. Following the rule requires the consumer to thread a "this render came from the drag" flag through their state — which is exactly the Deferred bookkeeping §7 set out to delete, reintroduced with worse ergonomics and no library help.

The current design does not have this problem, and not by accident. `updateItems()` at `RELEASING`/`SETTLING`/`REPORTING`/`FINALIZING` is **publish-only**: snapshot recorded, no reconcile, no rebase, no cancel — [spec.ts:694-703](packages/drag2/src/sortable/spec.ts#L694-L703), "the released proposal is frozen." That phase gate is precisely what makes commit-during-operation safe, and it is _not_ part of the live-reconciliation machinery §6 targets.

**So: §6's cancel-on-update must be phase-gated exactly the way today's reconciliation is.** Which means the simplification is "delete `reconcileCollection`", not "delete the phase discipline". The snapshot/version protocol and the four survival rules ([collection.ts:202-259](packages/drag2/src/sortable/collection.ts#L202-L259)) can go. The phase table cannot. That is a materially smaller win than §6 claims, and it should be re-scoped before anyone estimates it.

**Probe.** The reference integration already in the repo: [sortable.stories.tsx:108-113](packages/drag2/src/sortable.stories.tsx#L108-L113). Add `useEffect(() => controller.updateItems(refs), [order])`, make `updateItems` during an active operation cancel, and drag-drop once. Expected under §6+§7: `onCancel`, item snaps home, the committed order stays. That is the shipped behaviour of the composition of two accepted proposals.

## R-06 — cancel-on-update breaks virtualization, which works today by design

drag2 has no autoscroll (confirmed: no `scrollBy`/`scrollTop`/`scrollIntoView` in `src/`), but it binds `scroll` with `capture: true` during a drag ([invalidation.ts:23-36](packages/drag2/src/kernel/invalidation.ts#L23-L36)) — so scrolling during a drag is an expected, supported thing.

In a virtualized list, scrolling **is** a collection change: rows mount and unmount, and the consumer must call `updateItems()`. Under cancel-on-update, scrolling a virtualized list during a drag cancels the drag. There is no workaround: the consumer cannot suppress the notification without the library's geometry going stale, which is the failure §6 says explicit notification exists to prevent.

Today this works, and it works because reconciliation is _identity-gap-based, not array-based_. `reconcileCollection` cancels only if the specific gap the user was shown broke — the incumbent disappeared, or `before`/`after` stopped being adjacent ([collection.ts:207-256](packages/drag2/src/sortable/collection.ts#L207-L256)). A virtualizer mounting rows 40 rows away leaves the gap intact, so the operation **rebases** (`CHANGE_REBASE`) and survives.

The synthesis names virtualization as a place to look. It is not a place where cancel-on-update is _insufficient_; it is a place where cancel-on-update is _wrong_, and where the mechanism being deleted is the one doing the work.

**Recommendation:** if reconciliation must go, the cheap replacement is not "cancel" but "cancel iff the dragged item or one of its two gap neighbours left the collection" — that is three identity lookups, not the four survival rules plus versioning, and it keeps virtualization and long-list drags working.

**Probe.** TanStack Virtual, 10 000 rows, `overscan: 5`. Grab row 50, drag 3 rows, scroll the container 200 px (which mounts/unmounts ~6 rows), drop. Today: accepted with the intended gap. Under §6 as written: cancelled.

---

# Part III — capability losses

## R-07 — `readinessTimeout` is the only automatic recovery from a render that never commits

§7 removes the readiness timeout along with the protocol. The timeout is not protocol overhead; it is the answer to "what if the acknowledgement never comes."

Under React concurrent rendering, "never commits" is a _supported outcome_, not a bug: `startTransition(() => setOrder(next))` may be interrupted and re-rendered, and a render whose tree suspends never runs its layout effects. So `await authoredCommit` — a Deferred resolved in `useLayoutEffect` — can legitimately never settle.

Today: 500 ms default ([slots.ts:221](packages/drag2/src/sortable/slots.ts#L221)), `FAILURE_PRESENTATION_READY`, the hold is never released, the join never runs, and `retireOperation` restores the visual instantly ([kernel.ts:1217-1225](packages/drag2/src/kernel/kernel.ts#L1217-L1225), [:479-483](packages/drag2/src/kernel/kernel.ts#L479-L483)). The user gets their item back and the consumer gets `onError`. Ugly, but bounded.

Under serial semantics with no timeout, the item stays lifted at the drop point indefinitely, `position: fixed`, in the top layer, recoverable only by the user pressing Escape — which they have no reason to know about, because the drag looks finished.

The kernel is explicit that this gate has exactly three exits and no fourth ([kernel.ts:1192-1200](packages/drag2/src/kernel/kernel.ts#L1192-L1200)). Serialization moves the wait into `onReorder`, whose thenable has an `AbortSignal` and an Escape path ([kernel.ts:1598-1607](packages/drag2/src/kernel/kernel.ts#L1598-L1607)) — genuinely better plumbing — but it still needs a bound, because the failure mode is a stuck UI, not a leak.

**Verdict:** serialize, but keep a deadline on the resolution attempt. It is one timer, and it moves from the readiness gate to the resolver — a strictly smaller surface than today, and it stops §7 from trading a 500 ms failure for an unbounded one.

**Probe.** `onReorder: async () => { await new Promise(() => {}); }`. Assert the item is restored and `onError` fires within some bound. Then the concurrent variant: wrap `setOrder` in `startTransition` with a suspending sibling, and confirm the layout effect never runs.

## R-08 — `before`/`after` are not downstream of reconciliation, and consumers need them

§9 says the request's shape is "much of this may be downstream of live reconciliation" and defers. The version field is — `ReorderRequest.version` exists for the mixed-version check in `buildReorderProposal` ([collection.ts:302-341](packages/drag2/src/sortable/collection.ts#L302-L341)), which cancel-on-update makes unnecessary. But `before`/`after` ([domain.ts:46-53](packages/drag2/src/sortable/domain.ts#L46-L53)) are not.

Index pairs (`from`, `to`) are sufficient only for consumers whose backing store is an array. They are useless for:

- **fractional / lexicographic indexing** (LexoRank, `fractional-indexing`) — the whole point is computing a key _between two neighbours_; you need the neighbours' identities, not positions;
- **CRDT sequences** (Yjs `Y.Array`, Automerge) — an index is a local view; the operation is expressed relative to identity;
- **linked or tree-backed models** — an outline/nested list where "index" has no global meaning;
- **server-side reorder APIs** that take `{moveId, afterId}` — the overwhelmingly common shape.

For all of these the consumer would have to reconstruct the neighbours from indices against their own array, which is (a) work the library already did and (b) wrong the moment the consumer's array is not the same array.

`before`/`after` are two references. They cost nothing. **Keep them regardless of what happens to reconciliation** — and note that if §9 is derived "from actual application needs" using an array- backed reference app, it will conclude wrongly.

## R-09 — a unified `onEnd` merges four moments with different DOM state

§8's `onEnd(result)` with `accepted | noop | rejected | canceled | failed` reads as one callback at one moment. It is not. Today:

| result | fires at | is the visual restored? | is the placeholder removed? |
| --- | --- | --- | --- |
| `accepted`, `noop` | the join, via `finalized` ([kernel.ts:1452-1454](packages/drag2/src/kernel/kernel.ts#L1452-L1454)) | **yes** — after `presentation.dispose()` at [:1441](packages/drag2/src/kernel/kernel.ts#L1441) | yes |
| `rejected`, `canceled` | same | **yes** | yes |
| `failed` | the settlement effect at [kernel.ts:1990-1996](packages/drag2/src/kernel/kernel.ts#L1990-L1996) → [spec.ts:1195](packages/drag2/src/sortable/spec.ts#L1195) | **no** — `retireOperation` only at [:2019](packages/drag2/src/kernel/kernel.ts#L2019) | **no** |

I verified this ordering directly. `onError` fires with the item still `position: fixed` in the top layer and the placeholder still in the list; `onFinish`/`onCancel` fire after everything is back.

A consumer whose handler measures the list, re-enables a control, or triggers a follow-up animation gets different DOM depending on the discriminant. Today the _callback name_ warns them. A unified `onEnd` erases the warning and keeps the difference.

This is fixable — either move the failure report to after retirement (a behaviour change, and note [spec.ts:1191-1193](packages/drag2/src/sortable/spec.ts#L1191-L1193) deliberately chose the current routing), or state the DOM contract per discriminant. Either way it is a decision §8 does not currently make.

On the constants themselves: collapsing 14 numeric exports into `DraggableError.code` is a clear win, and worth noting it removes **14 of the 15 runtime exports** from `drag.js`. One caveat: `FAILURE_TERMINAL_CALLBACK` is load-bearing in the state machine, not just diagnostic — it is the one stage that does _not_ rewrite the outcome to failed ([spec.ts:1160-1164](packages/drag2/src/sortable/spec.ts#L1160-L1164)). Coarsening the public code set is fine; the internal distinction must survive.

## R-10 — `onEnd` is silent for `destroy()`, so "exactly-once terminal" is false

`destroy()` fires no terminal callback at all ([kernel.ts:492-525](packages/drag2/src/kernel/kernel.ts#L492-L525)). So an operation in flight when the controller is destroyed produces **zero** `onEnd` calls. "A single exactly-once terminal callback" is therefore already false unless a sixth discriminant is added.

This interacts with §3. Once `destroy(): Promise<void>` exists and completion is observable, consumers will reasonably expect one of: `onEnd({type: 'destroyed'})`, or a documented guarantee that `onEnd` never fires for a destroyed operation, or the destroy promise carrying the outcome. Pick one — and note that "no callback fires after `destroy()`" is I-6, the invariant six checkpoint reviews have been defending, so adding `onEnd('destroyed')` is a contract change with history.

## R-11 — `duration: () => number` cannot express the requirement it was added for

§5 says the thunk "should have to justify itself independently". It cannot, in its current shape.

The thunk takes **no arguments** ([landing.ts:39](packages/drag2/src/sortable/landing.ts#L39)) and is called once per landing ([:95-98](packages/drag2/src/sortable/landing.ts#L95-L98)). The motivation on record is distance-scaled duration ([README.md:101](packages/drag2/README.md#L101), [docs/probes/13b-settlement.ts:248-262](packages/drag2/docs/probes/13b-settlement.ts#L248-L262)) — and a zero-argument thunk **cannot compute distance**, because the travel distance is kernel state (`anchor − origin`, [kernel.ts:1427-1434](packages/drag2/src/kernel/kernel.ts#L1427-L1434)) that the consumer does not hold. Nothing in `src/` uses distance-based duration; the only usage is a bare `landing()` ([sortable.stories.tsx:137](packages/drag2/src/sortable.stories.tsx#L137)).

The remaining honest use for a no-arg thunk is reading app state that can change between landings — but the one such input that matters, `prefers-reduced-motion`, is already handled by the library ([landing.ts:99-113](packages/drag2/src/sortable/landing.ts#L99-L113)).

So the choice is: **delete it** (a plain `number` covers every demonstrated use), or **widen it** to `(context: { distance, from, to }) => number` and make the motivating case real. Keeping `() => number` is the one option that is definitely wrong, and it is the current state.

Given this repo is `material-x` and Material 3 specifies duration by distance and size class, I'd expect the widened form to be needed within the year — but that argues for widening later against a real caller, not for keeping a shape nothing can use now.

The rest of §5 survives. Removing `run` costs less than the synthesis fears: the _authoritative_ final position is the kernel's pin at the join ([kernel.ts:1386-1389](packages/drag2/src/kernel/kernel.ts#L1386-L1389), [:1427-1434](packages/drag2/src/kernel/kernel.ts#L1427-L1434)), not the runner, and `retarget` is already optional with the kernel skipping it when absent ([spec.ts:254-261](packages/drag2/src/kernel/spec.ts#L254-L261)). The "can weaken the final-position guarantee" worry is overstated — the pin is unconditional. I could not construct a product requirement that needs arbitrary runner ownership in a v1.

---

# Part IV — costs the synthesis under-prices

## R-12 — the kernel authoring layer does not exist; §1 debates the visibility of an unbuilt capability

§1 asks: "is there real value in keeping `draggable()` public that cannot be provided cleanly through the kernel authoring API?" The question presupposes a kernel authoring API. There isn't one.

`drag.js` exports exactly 15 runtime values: `draggable` and 14 `FAILURE_*` constants ([drag.ts:31-63](packages/drag2/src/drag.ts#L31-L63)), plus 4 types. `Behavior<Controller>` is a `declare`-only brand ([spec.ts:426-437](packages/drag2/src/kernel/spec.ts#L426-L437)), and `brandBehavior`/`unbrandBehavior` reach **no entry module** ([spec.ts:441](packages/drag2/src/kernel/spec.ts#L441), [:447](packages/drag2/src/kernel/spec.ts#L447)). `BehaviorSpec`, `KernelHost`, every seam type and every scope are internal by construction ([drag.ts:4-9](packages/drag2/src/drag.ts#L4-L9)).

So today **a third party cannot author a behavior at all** — they cannot mint a `Behavior<C>`, so `draggable()` accepts nothing they can produce. Three consequences:

1. Making `draggable()` internal reduces `drag.js` to fourteen numbers. Under §8 those become a `code` union — i.e. the kernel entrypoint becomes empty. §1 and §8 together delete an entrypoint; neither says so.
2. The capability §1 promises to preserve ("a developer who needs a completely new interaction should be able to use a supported lower-level kernel API") is not being _preserved_. It is being **specified for the first time**, and its cost is not "keep or hide `draggable`" — it is freezing `BehaviorSpec`, `KernelHost`, the seam vocabulary, the scope types and the phase model as public API. That is the largest single item in the synthesis and it is priced at zero.
3. `sortable()` returns a `Behavior` and cannot install itself ([sortable.ts:68-73](packages/drag2/src/sortable.ts#L68-L73)). The proposed `sortable(root, options)` therefore merges the behavior and the installation, which is fine — but note that assembly currently runs _inside_ `install`, after a realm and root exist ([behavior.ts:63-71](packages/drag2/src/sortable/behavior.ts#L63-L71)), specifically so features can receive `{realm, root}`. Whatever replaces it must preserve that.

Also unstated: today `sortable(items, ...features)` takes an **item array**, not a root. The proposed `sortable(root, options)` has no positional slot for items. If they move to `options.items`, fine — but if the intent is "derive items from `root`'s children", that is DOM observation, which §6 explicitly rejects.

**Recommendation:** split §1 into two decisions and sequence them. (a) Does v1 ship a _supported_ custom-behavior surface at all? (b) If yes, what is it? Answering (b) is a design programme comparable to the sortable contract; answering (a) "not in v1" is a legitimate and much cheaper option that the synthesis currently forecloses by assuming the surface exists.

## R-13 — direct slots are a small size regression, and the tree-shaking data does not support them

§2's measurement claim checks out. From C6-07's live figures:

| composition           |   Brotli | delta vs minimal |
| --------------------- | -------: | ---------------: |
| minimal (`y`)         | 10 199 B |                — |
| minimal (`xy`)        | 10 245 B |              +46 |
| + `layoutAnimation()` | 10 653 B |         **+454** |
| + `landing()`         | 10 487 B |         **+288** |
| complete              | 11 025 B |             +826 |

`landing` + `layoutAnimation` = 742 B of the 826 B all features cost together. Everything else — `placeholder`, `handle`, `visual`, `callbacks` — is ≤ 84 B combined. §2 is right that the tree-shaking benefit is concentrated.

But the conclusion doesn't follow. Converting those to direct slots does not _save_ the 84 B; it **links them unconditionally**, so the minimal composition grows by roughly that amount. §2 is a DX change with a small size cost, and it should be argued on DX. Framing it next to the tree-shaking measurement implies a saving that does not exist.

Two concrete things that are lost, both cheap to keep but currently un-noticed:

- **Duplicate-contribution detection.** `claim()` throws `TypeError: sortable: visual() contributed by two features` at construction ([assemble.ts:34-48](packages/drag2/src/sortable/assemble.ts#L34-L48), labels at [:84-101](packages/drag2/src/sortable/assemble.ts#L84-L101)). In an options object, a duplicate key is a silent JS overwrite. Minor, but it is a real diagnostic being deleted silently.
- **One ordering namespace.** Today ordering is positional in one array, and `retire` hooks are reversed exactly once ([assemble.ts:145](packages/drag2/src/sortable/assemble.ts#L145)), with a comment ([:68-75](packages/drag2/src/sortable/assemble.ts#L68-L75)) recording that they already got the interleaving wrong once. Split first-party config into an options object and third-party extension into a feature array, and you have **two** namespaces contributing to the same seams with no defined relative order.

  The multi-writer seams are real: `beforeInsertionMove`/`afterInsertionMove` ([feature.ts:154-168](packages/drag2/src/sortable/feature.ts#L154-L168)), currently written only by `layoutAnimation` ([layout-animation.ts:166](packages/drag2/src/sortable/layout-animation.ts#L166), [:212](packages/drag2/src/sortable/layout-animation.ts#L212)) and run in array order ([spec.ts:796-798](packages/drag2/src/sortable/spec.ts#L796-L798), [:840](packages/drag2/src/sortable/spec.ts#L840)). The first third-party feature that needs to run after `layoutAnimation`'s displacement hook has no way to say so if `layoutAnimation` is no longer in the same array.

  **Concrete probe:** author a third-party feature that adds a drop-shadow during displacement and must run _after_ layout animation's `afterInsertionMove`. Under the current design: pass it after `layoutAnimation()` in the array. Under §2: unspecified.

**Recommendation:** if `landing` and `layoutAnimation` stay importable values, keep them in the same positional array as third-party features, and let the options object hold only slots with no ordering semantics (`onReorder`, `threshold`, `handle`, `visual`, `placeholder`, axis). That preserves one ordering namespace, which is the part worth defending.

Two smaller notes: `threshold` and `readinessTimeout` are **already** plain numeric fields on `callbacks()` ([feature.ts:82-113](packages/drag2/src/sortable/feature.ts#L82-L113)), not features — §2 overstates how much masquerading there is. And the assembler is the single place where defaults and range validation live ([assemble.ts:147-187](packages/drag2/src/sortable/assemble.ts#L147-L187)); whatever replaces it should keep that property, which options objects make easy to lose.

## R-14 — §4 conflates placeholder _mechanism_ with placeholder _verification_

§4 says "do not build production machinery to prove that the consumer complied." Agreed in principle. But most of what looks like proving is mechanism, and deleting it removes function, not defence.

`applyMechanics` ([placement.ts:48-114](packages/drag2/src/sortable/placement.ts#L48-L114)) writes:

| write | why it is mechanism, not verification |
| --- | --- |
| `data-drag-placeholder` | consumer styling hook |
| `aria-hidden="true"` | the placeholder must not be announced — accessibility, not defence |
| mirrored `slot` ([:87-91](packages/drag2/src/sortable/placement.ts#L87-L91)) | **required** for shadow-DOM lists; without it a consumer placeholder lands in the default slot |
| `box-sizing: border-box` + `width`/`height` from `visual.offsetWidth/offsetHeight` ([:64-65](packages/drag2/src/sortable/placement.ts#L64-L65)) | the placeholder must occupy the item's box; offset box specifically so ancestor zoom and the item's own transform don't corrupt it ([:44-46](packages/drag2/src/sortable/placement.ts#L44-L46)) |

The `slot` mirroring is worth calling out: §4 correctly identifies `display: contents` / Web Components as a reason `visual()` must exist, then proposes a placeholder regime that would break the same environment.

The **actual** verification in the sortable path is small, and I can enumerate it:

1. [spec.ts:540-545](packages/drag2/src/sortable/spec.ts#L540-L545) — the placeholder is connected and is the item's next sibling after insertion. ~3 lines, one throw.
2. [placement.ts:238-242](packages/drag2/src/sortable/placement.ts#L238-L242) — refuse a cross-container anchor.
3. [collection.ts:177-189](packages/drag2/src/sortable/collection.ts#L177-L189) — item uniqueness at `updateItems()` time.

Each converts a silent geometry corruption into a loud `FAILURE_ACTIVATION` / `TypeError`. Together they are maybe fifteen lines and no runtime cost on any hot path. Deleting them does not "stop paying" for anything; it converts a diagnosable failure into a wrong layout the consumer will file as a library bug.

**Recommendation:** adopt §4's principle but apply it to the right list. Name these three explicitly and decide each on loud-vs-silent grounds, not as part of a general retreat from validation. My reading: keep 1 and 3, and 2 is arguable.

## R-15 — `visual()` re-resolution is safe for candidates and unsafe for the lift

§4 says: "Repeated resolution on geometry rebuild may actually be desirable because a framework can replace the internal rendered element while preserving the logical item." That is true for **candidate geometry** and false for **the lift**, and it is the same callback.

- Candidates: resolved per item on every rebuild inside [rect-index.ts:163-164](packages/drag2/src/sortable/rect-index.ts#L163-L164). Re-resolution is free — a fresh element yields a fresh rect.
- The dragged item: resolved **once**, at admission ([spec.ts:185-186](packages/drag2/src/sortable/spec.ts#L185-L186)), and that node is then held for the whole operation ([kernel.ts:895-921](packages/drag2/src/kernel/kernel.ts#L895-L921)) carrying an inline-style lease, a top-layer lease, and a transform. It **cannot** be re-resolved: the library must restore styles onto the node it modified.

If the consumer's framework replaces the dragged element mid-operation, the library ends up holding a detached node, animating it, and restoring inline styles onto something nobody can see — while the new element sits in the list untouched.

So §4's "trust the resolver contract" needs a second clause that the synthesis does not state:

> **The visual of the dragged item must remain the same node for the operation's lifetime.**

That is a materially stronger consumer obligation than "map logical identity to the rendered box", and it is the kind of thing frameworks violate casually — React remounting on a `key` change, Svelte keyed `each`, Lit `repeat` with a changed key. Worth noting the interaction with R-05: §7 asks the consumer to commit new DOM _during_ the operation, which is exactly when a framework is most likely to replace that node.

On §4's own challenge — "find a real semantic reason candidate geometry and dragged presentation should resolve different boxes" — **I could not.** They never overlap: the rect index measures the destination view, which excludes the dragged item ([collection.ts:192-195](packages/drag2/src/sortable/collection.ts#L192-L195)). One callback is right.

---

# Part V — what survives attack

Stated explicitly, because the brief allows it and because a review that only attacks is not useful.

- **§7's core move is right, and cheaper than the synthesis thinks.** The lost overlap it worries about only exists for consumers who pass `accept({presentation: true})` — and those consumers are precisely the ones asking for the commit to gate the landing. Consumers on plain `accept()` have no readiness protocol today. So "the cost is losing overlap between React commit latency and landing animation" is a cost on a population of size ~zero. The reduced-motion falsifier the synthesis asks for resolves the same way: with `presentation: true` the readiness gate is held regardless of duration, so reduced motion already serializes today.
- **The retarget/re-anchor machinery is not readiness machinery** and survives either way. The destination re-anchor ([spec.ts:1226-1240](packages/drag2/src/sortable/spec.ts#L1226-L1240)) and the join's authoritative re-measure + pin ([kernel.ts:1386-1434](packages/drag2/src/kernel/kernel.ts#L1386-L1434)) exist because the landing target is provisional, not because acknowledgement is asynchronous. Serialization does remove the _runner-side_ `retarget` ([landing.ts:180-186](packages/drag2/src/sortable/landing.ts#L180-L186)) and with it C6-01's defect site entirely — a real and under-claimed win.
- **§8's collapse of 14 numeric constants** is right, subject to R-09 and R-10.
- **§5's removal of `run`** is right, subject to R-11.
- **§4's `visual()` retention** is right, and its "don't split candidate from presentation" instinct is correct (R-15).
- **§10 is confirmed, not speculative.** `preventDefault()` fires at admission ([kernel.ts:719](packages/drag2/src/kernel/kernel.ts#L719)), i.e. on `pointerdown` before the threshold is crossed, from a single kernel-owned site. Concrete consequence: a `<input>`, `<button>` or `contenteditable` inside a sortable item cannot be focused by pointer, because focus is a default action of the pointer sequence. The stories mask this with `user-select: none; touch-action: none` ([stories.module.css:40-41](packages/drag2/src/stories.module.css#L40-L41)), so it will not show up in the demo. Agreed that this needs a probe, not a redesign — and the fix is one line plus a policy decision, since ownership is already centralized.

---

# Part VI — sequencing

The synthesis reads as nine parallel decisions. Three are coupled, and the dependency runs one way:

1. **Decide §3's scope first** — specifically R-03's question (does "logically closed" mean no new operation, no new callback, or no new mutation?) and R-01's (does the rule cover `cancel()` and throws, or only `destroy()`?). Every other section's cost estimate assumes an answer.
2. **Then re-scope §6** against R-05: the phase gate stays, `reconcileCollection` goes, and the cancel predicate is narrowed per R-06.
3. **Then §7**, which is mostly unblocked and mostly right, plus the deadline from R-07.
4. **§9 follows §6**, as the synthesis says — but with R-08's constraint fixed in advance so the derivation is not done against an array-backed reference app.
5. **§1 splits into "does v1 ship a custom-behavior surface?" and "what is it?"** (R-12). The first is answerable now and cheap; the second is a programme.
6. **§2, §4, §5, §8, §10 are independent** and can proceed in any order.

And one thing that should be measured before any of it: **R-04**. If most of the teardown machinery is downstream of lifting the consumer's real node, then the synthesis is optimizing the wrong axis, and a one-afternoon spike says so definitively either way. The synthesis asks for places where "we are again preserving or deleting something because of the current implementation rather than consumer need" — the faithful lift is the largest such thing in the package, and it is the one decision no section questions.

---

# Appendix — probes, in priority order

Each is falsifiable and small. P1–P3 are the ones I would run before the next owner discussion.

| # | Probe | Settles | Expected under current | Expected under proposal |
| --- | --- | --- | --- | --- |
| **P1** | Reference React story + `useEffect(() => controller.updateItems(refs), [order])`; one drag-drop | R-05 | accepted | **cancelled** |
| **P2** | `placeholder({create})` whose `style` getter **throws**; assert no `data-drag-placeholder` / `aria-hidden` / `slot` residue | R-02 | fails today | still fails |
| **P3** | Spike: clone-based lift for sortable only; diff bytes, surviving stretch rows, and which of C6-01…C6-04 become unreachable | R-04 | — | — |
| P4 | `visual: (i) => { controller.destroy(); return i; }`; pointerdown + move past threshold; assert `onStart` never fires and inline `position` is `''` | R-03 | passes | **fails** |
| P5 | `getComputedStyle` override that calls `controller.cancel()` during `retarget`; assert the item lands at the home gap | R-01 | fails (C6-01 shape) | still fails |
| P6 | TanStack Virtual, 10 000 rows; grab row 50, drag 3, scroll 200 px, drop | R-06 | accepted (`CHANGE_REBASE`) | **cancelled** |
| P7 | `onReorder: async () => { await new Promise(() => {}); }`; assert bounded restore | R-07 | restores at 500 ms | **hangs** |
| P8 | `startTransition(() => setOrder(next))` with a suspending sibling; assert the layout effect never commits | R-07 | — | confirms the hazard is reachable |
| P9 | Item containing `<input>`; tap it; assert `document.activeElement` | §10 | **not focused** | — |
| P10 | Item containing `contenteditable`; press ArrowRight; assert the caret moved | §10 | ? | — |
| P11 | Third-party feature contributing `afterInsertionMove` that must run after `layoutAnimation`'s | R-13 | expressible (array order) | unspecified |

---

## Notes on method

Read directly: `src/kernel/{kernel,presentation,invalidation,pointer,spec,failures,realm}.ts`, `src/sortable/{spec,assemble,placement,collection,controller,landing,feature,slots,rect-index}.ts`, `src/{drag,sortable}.ts`, `package.json`, `files.json`, and the C6-07 size table. I confirmed the two facts the strongest findings rest on — the `preventDefault()` admission site and the `onError` ordering relative to `retireOperation` — by reading `kernel.ts` myself rather than accepting a summary.

Nothing was modified. All probes are described, none were run: several require a browser runner and P3 requires a branch.

`LSP plugin - available; not used: this was a contract/API-surface review over module boundaries, export maps and call ordering, where whole-file and ranged reads plus grep gave the sequences directly; no symbol definition or reference resolution was in question.`
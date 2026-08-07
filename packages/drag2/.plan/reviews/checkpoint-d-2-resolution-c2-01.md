# Checkpoint D review 2 — architect resolution of C2-01

Scope: **C2-01** only, the reproduced terminal-barrier defect in [`checkpoint-d-2.md`](checkpoint-d-2.md). C2-02…C2-05 are documentary and parity items and belong to whoever takes them; they are named here only where this decision constrains one. D2 and D5 are not reopened — the fix is built **on** the restored geometry path, not against it. L-11 stays at Phase 23 and nothing is folded into it.

## Decision

**The terminal boundary is behavior-owned, at one latch with two readers, and the frozen SPI does not reopen.**

1. The destroy latch the D1/D3 pass put on the sortable controller moves from a closure variable in `createSortableController` to **one field on the behavior's private runtime**, `SortableRuntime.closed`. It stays exactly what it is today — behavior-private bookkeeping — and gains readers.
2. Every barrier inside the behavior reads it **directly**, in `spec.ts`, where `rt` is in scope.
3. The one site that cannot reach `rt` — the per-candidate loop inside `RectIndex.refresh`, which is feature-private by D-19 and H-4 — receives it through the per-operation view as `live: () => boolean`. That is the **fourth additive widening** of the D-13 consumer-declared view (8a `item`, 17 `pointerX`, D2 `getVisual`, now `live`), with no import edge and no allocation per operation.
4. A new invariant, **I-36**, states the rule at **tier C**, and states why it is not promotable.

Measured cost: **+30 B to +70 B** brotli depending on composition, zero added per-frame work in the minimal composition, one boolean-returning call per candidate **per rebuild** when a `visual()` is composed. Every composition stays inside its M-3 budget.

**Checkpoint D cannot close without this landing.** The reasoning is in §Timing, and it is not the reviewer's — it is that this is the last checkpoint before a second behavior, and the thing being decided is *how a behavior discharges a kernel invariant*.

---

## 1 — The claim that the SPI reopens is not verified

The review asserts C2-01 is "the failing executable lifecycle case contract 00 requires before reopening the frozen SPI". **Checked against contract 00's actual language, it is not.** §Normative precedence and freeze reads:

> A further contract change requires a failing executable lifecycle case **that the frozen SPI cannot express**; a prose-only review finding is not sufficient.

The bar has two conjuncts. C2-01 clears the first — the reproduction is real, I re-derived it from the source below and it is worse than reported. It **fails the second**: the frozen SPI expresses the fix completely, at zero SPI cost, and the mechanism it uses already exists in this package.

- The behavior owns a completely private runtime the kernel does not know, store, extend or type (H-2, D-4). A terminal latch is exactly the kind of thing that belongs there.
- The controller **already holds that latch** — `createSortableController`'s `closed`, added by D3 five days ago, with the reason recorded verbatim in `plan.md:786`: *"the latch lives on the controller rather than being read from the kernel because `KernelHost` does not expose `closed`, and widening a frozen SPI type for a controller's private bookkeeping is the change 00 forbids without a failing executable case."*
- The per-operation view is the designated channel for per-operation behavior guarantees and has absorbed three widenings without touching a kernel type.

So the D1/D3 precedent applies **and is not distinguishable**. D3's question was "the controller needs to know it has been destroyed"; C2-01's is "the behavior needs to know it has been destroyed". Same fact, same owner, same latch — the only difference is that D3 needed one reader and this needs four. A second latch, or a kernel-supplied one, would be duplicated state that can disagree, which is the argument D3 already made when it declined to put a latch in front of `cancel` and `destroy`.

**What the review found is a defect in the behavior, not a gap in the SPI.** The distinction matters beyond bookkeeping: reopening the SPI on this case would establish that any behavior-interior bug is grounds to widen `KernelHost`, and the four Checkpoint C passes exist because that is exactly how the sortable's shape got written into the kernel three times.

## 2 — The reproduction, and what it costs beyond the reported symptom

`RectIndex.refresh` (`src/sortable/rect-index.ts:82-129`) loops over the destination view and calls `getVisual(item)` per candidate. A resolver that calls `controller.destroy()` runs teardown to completion synchronously and returns; the loop then continues.

The review reports the visible half — later candidates are resolved after `destroy()` returned, violating I-6. **There is a second half it did not report, and it decides the shape of "stop".** `destroy()` step 4 runs `spec.retire()`, which runs the assembler's retire hooks, one of which *is* `index.retire()` (`assemble.ts:77`, `y.ts:155`, `xy.ts:152`) — emptying `items`, zeroing `count`, setting `dirty = true` and `measured = -1`. The loop that keeps going then writes elements back into `index.items[n]`, and its trailing bookkeeping sets `count = n`, `items.length = n`, `measured = snapshot.version`, `dirty = false`.

So a continued traversal does not merely call a consumer callback late. It **resurrects a cache teardown has retired**, marks it clean, and leaves an idle, destroyed controller pinning every row of the list — against I-20, through the one field `retire()` exists to clear. A naive `break` inside the loop fixes the callback and leaves the retention.

**The same missing boundary exists at two more sites, and the review named only one of them.**

| # | Sequence | Foreign code | Today |
| --- | --- | --- | --- |
| A | `RectIndex.refresh` | `getVisual` per candidate | no barrier — reported |
| B | `resolveItem` → `seedDraft` (`spec.ts:130-137` → `:158`) | `getHandle`, then `getVisual` | no barrier — reported |
| C | `action.effect(TAG_SPATIAL)` (`spec.ts:719-731`) | a placeholder custom element's `disconnectedCallback`/`connectedCallback`, run synchronously by `movePlaceholder` | **no barrier — not reported** |

C is the same species and is not hypothetical: `activation.effect` already guards the identical hazard one line after `item.after(placeholder)` (`spec.ts:455`, `if (scope.presentation.signal.aborted) return;`), with a comment naming I-6 explicitly. The spatial branch does the same DOM write and then runs `invalidateInSeam()`, the **eager cache rebuild** (which calls `getVisual` per candidate — defect A reached through a different door) and every `afterMove` hook, which with `layoutAnimation()` composed starts WAAPI animations on a torn-down controller.

## 3 — Where the boundary belongs, and what is rejected

### The generalization that decides it

Every barrier the kernel owns is already in place, and they are complete **at the kernel's granularity**: `runAdmission` revalidates after an admission member returns (`kernel.ts:726`); `runCore` stages a `Prepared` only if `preparationValid()` still holds after the effect (`seams.ts:428`); `runReleaseSeam` executes only a non-null staged command (`seams.ts:536`); the landing and join paths revalidate on both sides of every foreign call (F-30, F-38, `kernel.ts:1114-1131`).

What has no barrier is the **behavior's interior**, and the reason is structural rather than an oversight: *the kernel's granularity is one callback, and the behavior is the only party that calls foreign code more than once inside one of them.* D-26 stated post-callback revalidation as a rule about values the kernel **receives**; it was never stated for sequences a behavior **drives**.

**The party that owns the sequence owns the barrier.** Everything below follows from that one line.

### Rejected — a kernel-owned mechanism

Two forms, both rejected.

- **The kernel wrapping consumer invocations.** It cannot. `getHandle` and `getVisual` are *behavior slots*: they are assembled into `SortableSlots` and captured by the behavior's closures, and the kernel never sees them, names them or has a type for them (H-1, H-2, D-4). Giving the kernel the ability to wrap them means teaching it what a sortable's consumer surface is — the sortable's shape written into the kernel, which is precisely the error D-34 and D-35 corrected and precisely what Checkpoint D exists to catch before a second behavior arrives.
- **An `AbortSignal`-shaped liveness the behavior already has.** Half of it exists: `ActivationScope.presentation.signal` is handed to `activation.effect`, is aborted by `destroy()` (`kernel.ts:511`), and is already used for exactly this at `spec.ts:455`. It covers every geometry-path site. It **cannot** cover the admission path, because at admission there is no operation and therefore no lifetimes — `admit` runs before `mintOperation`. A mechanism that covers three of the four sites is not the mechanism.

  Minting a *controller-lifetime* `AbortController` inside the behavior would cover all four, and is rejected on the repository's stated priority order: it is an extra allocation pair per controller against M-2's measured 506 B baseline, to replace a boolean field that costs nothing. CLAUDE.md's `AbortController` rule is about `removeEventListener`, not about liveness latches.

- **A `KernelHost.closed` / `host.live()` member.** Rejected under §1: contract 00 forbids widening a frozen SPI type for private bookkeeping absent a case the SPI cannot express, and this is not one.

### Rejected — an axis-owned check

It cannot work, and that is a stronger objection than the duplication. **The loop is inside `RectIndex.refresh`, not inside `y.ts` or `xy.ts`.** An axis-level check can only guard *around* `refresh` — it stops the next frame, not the traversal that is running. Making it work means moving the loop into each axis module, which duplicates the cache Phase 17 extracted precisely to stop having two of.

The duplication objection stands as a secondary: two copies of a rule that must not drift, and a third when a future axis lands.

### Rejected — two shapes that avoid the view widening

- **Overloading `getVisual`'s return** — the behavior publishes a wrapper that returns `null` once closed, and `refresh` treats `null` as "stop". No fourth parameter, no view field. Rejected: it puts a control signal on a *consumer-visible* return type, so a consumer resolver that returns `null` silently truncates the candidate search, and it adds a closure layer on top of the consumer's own resolver on the one path D2 just put consumer code onto.
- **Passing the whole runtime view to `refresh`** instead of `(snapshot, getVisual, live)`. Fewer arguments, but it couples the deliberately dimension-neutral, view-agnostic cache to the view's shape. `rect-index.ts`'s header claims it "expresses no rule about which of them matters"; naming view fields inside it is the first crack in that.

### Accepted

| Path | Owner | Reading |
| --- | --- | --- |
| Candidate loop | `RectIndex.refresh` — the only place the loop exists, shared by both axes | `live()` off the view, threaded by the axis feature |
| Admission | `spec.ts`, between `getHandle` and `getVisual` | `rt.closed` directly |
| Committed-move bracket, eager measure | `spec.ts` | `rt.closed` directly |
| Placeholder-reaction window in `action.effect` | `spec.ts` | `rt.closed` directly |
| The existing `activation.effect` guard | unchanged | `scope.presentation.signal.aborted` |

**Why the existing activation guard is left alone, and why that is one rule and not two.** The *rule* is one — I-36. The *reading* is whichever liveness the site has. Where an operation exists and the seam was handed its scope, the presentation signal is available and is strictly stronger: it also reads true for a kernel-internal `panic()` destroy, which the behavior's latch does not see. Replacing it would trade a stronger reading for cosmetic uniformity and spend bytes for no behavior change.

**The latch's one blind spot, and why it is not reachable from a behavior-interior sequence.** `rt.closed` is set by `controller.destroy()`; a `panic()`-initiated `destroy()` does not set it. From inside a consumer callback running in a behavior sequence, `panic()` is unreachable: a throw from consumer code inside a seam is caught by `runPhase` and classified rather than panicking (`seams.ts:329-334`); a nested `dispatch` enqueues and returns without draining (`kernel.ts:543`, and inside a drain the re-entrant drain returns immediately); and `refuseReentry` cannot fire because no consumer callback opens a seam. **The only destroy a resolver can cause is `controller.destroy()`**, and every route to it goes through the sortable controller's own wrapper (`host.destroy` has exactly one caller, `controller.ts:130`). If a future path makes a kernel-internal destroy reachable from inside a resolver, *that* is an SPI question and should be argued as one.

## 4 — What "stop immediately" means, precisely

This is the part the tests pin, so it is defined per site as observable behavior.

### A · the candidate loop

On the first `live()` reading false, immediately after a `getVisual` call:

- **call no further resolver** and read no further geometry;
- **restore the retired state** — `items.length = 0`, `count = 0`, leaving `dirty === true` and `measured === -1` — rather than falling through to the trailing bookkeeping. Not a `break`: a `break` writes `count = n`, `items.length = n`, `measured = version`, `dirty = false`, which is the resurrection in §2.

**No new return channel is needed, and that is the point.** `count === 0` means the candidate scan finds nothing, so `nearest === -1`, so `resolve()` returns `null` — which is the pre-existing "the placeholder's own slot still wins, commit nothing" path (I-15, `y.ts:108-112`). `refresh` keeps returning `void`; `measure` keeps ignoring it; `resolve`'s control flow is untouched.

**The frame is discarded upstream regardless**, and the tests must not rely on that: `action.prepare` returns `null` on a `null` resolve, and even if it did not, `preparationValid()` would invalidate the transition. So an assertion about the resulting insertion **passes against the unfixed source**. The observable that distinguishes them is the resolver's call list. This is C4-04's lesson applied.

### B · admission

Between `getHandle` returning and `seedDraft` running: if closed, `resolveItem` returns `null` — admission **declines**, it does not throw.

The consequences are already specified by existing machinery and need no new rules: `runAdmission` receives `null`, does **not** call `event.preventDefault()`, mints nothing, and leaves the controller idle (I-32) — on the command path the arrow key keeps its native meaning, which is right for a controller that no longer exists. What is *new* is only that `visual()` is never called; the kernel's own post-callback recheck already stopped the operation from being minted.

Declining rather than throwing is deliberate: a throw reaches `reportFailure(FAILURE_ADMISSION)` and would tell the consumer that its own `destroy()` was a library failure.

### C · the committed-move bracket

- After `slots.resolveInsertion` in `action.prepare(TAG_SPATIAL)`: return `null`. One branch earlier than the kernel's discard, and it stops the behavior writing `draft.insertion`.
- After `movePlaceholder` in `action.effect(TAG_SPATIAL)`: return **from inside the `try`**, so the `finally` still clears `view.insertion` and no stale destination gap outlives the move. Neither the eager rebuild nor any `afterMove` hook runs.
- `measureInSeam` returns `!rt.closed` in place of `true`, so a destroy raised from inside the eager rebuild takes the same exit `action.effect` already has for a classified measure failure.

### D · release — deliberately no new guard

`release.prepare` calls `resolveInsertion` and therefore reaches the loop, and on an aborted traversal it falls back to `draft.insertion`, builds a proposal and stages an `invoke` closure. **It is never executed**: `runCore` stages nothing when `preparationValid()` is false, and `runReleaseSeam` runs only a non-null command — so `onReorder` cannot fire for an operation `destroy()` retired. Adding a behavior guard here would be duplicated state that can disagree, which is D3's own argument. Recorded so the next reviewer does not re-find it as an omission.

## 5 — The exact shape

Frozen SPI: **unchanged**. `KernelHost`, `BehaviorSpec`, every seam signature and every kernel type are untouched. Public surface: **unchanged** — `live` sits on an unexported per-operation type and `closed` on the behavior's private runtime, so this does not interact with Phase 23's re-measurement.

| File | Change |
| --- | --- |
| `src/sortable/runtime.ts` | `SortableRuntime` gains `closed: boolean`, initialized `false`. `PresentationView` gains `readonly live: () => boolean`. |
| `src/sortable/controller.ts` | The local `closed` becomes `rt.closed`; `destroy()` sets it before `host.destroy()`, exactly as today. No other change — the D3 behavior is preserved byte for byte. |
| `src/sortable/spec.ts` | One per-controller closure `const live = (): boolean => !rt.closed;`. Four guards: `resolveItem` after `getHandle`; `measureInSeam`'s return; `action.prepare` after `resolveInsertion`; `action.effect` after `movePlaceholder`. `live` written onto `rt.view` beside `getVisual`. |
| `src/sortable/rect-index.ts` | `refresh` takes a fourth argument `live: () => boolean`; the check and the retired-state restore live **inside the `getVisual !== null` branch**. |
| `src/sortable/slots.ts` | `InsertionRuntimeView` — the ceiling view — gains `live: () => boolean`. |
| `src/sortable/y.ts`, `src/sortable/xy.ts` | Each local `InsertionRuntimeView` gains `live`; both `refresh` call sites thread `runtime.live`. |
| `src/sortable/handle.ts` | `visual()` and `handle()` doc comments state the consequence: destroying from inside either stops the sequence at that call. |

**The check is inside the `getVisual !== null` branch, not around it.** That is the whole cost story: the minimal composition installs no `visual()`, never takes the branch, and pays nothing per candidate. It is also correct — with no resolver there is no consumer callback in the loop, so there is nothing for a barrier to stand between.

Typecheck against this shape: **production source is clean**; nine test fixtures that hand-build a `PresentationView` or an `InsertionRuntimeView` need `live` added (`sortable.browser.test.ts` ×4, `y.browser.test.ts` ×2, `xy.browser.test.ts` ×2, plus two `rt.view` null-narrowings). That is fixture cost, not design cost.

## 6 — Tests

Every case must be verified to **fail against the pre-fix source**, per Checkpoint D's own convention. Both paths; both axes, because the check lives in `RectIndex` but the *threading* is per-axis and a future axis can forget it.

**Admission — `tests/sortable/features.browser.test.ts`**

1. `handle()` + `visual()` composed; the handle resolver calls `controller.destroy()`. On `pointerdown`: the visual resolver's call list is **empty**, no operation is minted, `defaultPrevented` is false, the controller stays terminal. Pre-fix: one `visual()` call.
2. The same on the **command** path (`keydown`): visual resolver never called, the key's default not prevented, no operation minted.

**Candidate loop — `tests/sortable/y.browser.test.ts` and `xy.browser.test.ts`, mirrored**

3. Through real input, a three-item composition: the `visual()` resolver destroys the controller while resolving the **first** candidate. The recorded call list contains **exactly that one candidate**. Assert the call list — an assertion about the resulting insertion passes against the unfixed source. This is the reviewer's temporary regression, made permanent.
4. At the direct-fixture level these two suites already use: drive `resolve(frame, view)` with a `live` that flips false during the second candidate → returns `null`; then a second `resolve` with `live` true **rebuilds from scratch** (assert the resolver is called for every candidate again). This pins the half a `break` gets wrong — the cache must be left dirty and empty, not clean and partial.
5. `retire()`-equivalence: after an aborted traversal, `index.items` holds nothing. Asserted through 4's rebuild, which is only observable if `items` was emptied and `measured` reset.

**Committed-move bracket — `tests/sortable/displacement.browser.test.ts` / `features.browser.test.ts`**

6. `layoutAnimation()` composed; a `visual()` resolver destroys during the **eager** rebuild inside the bracket → no `afterMove` hook runs and no animation is created.
7. A custom-element placeholder whose `disconnectedCallback` destroys the controller during a committed `movePlaceholder` → the eager rebuild does not run (the visual resolver's call list is unchanged) and no `afterMove` hook runs. This is site C, which no current test reaches.

**Non-regression**

8. D2's call-exactness assertions are unchanged and still pass: once per candidate per rebuild, silent on a warm cache, for a resolver that does not destroy.
9. D3's `updateItems()`-after-destroy tests are unchanged and still pass — the latch moved, its behavior did not.

## 7 — Cost

Measured by prototyping the shape in place and reverting it (`npx just size`, five compositions plus both baselines; source restored and `git status` clean).

| Composition | Before | After | Δ |
| --- | --- | --- | --- |
| minimal | 10.01 kB | **10.07 kB** | +60 B |
| minimal (xy) | 10.05 kB | **10.11 kB** | +60 B |
| minimal + layoutAnimation | 10.42 kB | **10.49 kB** | +70 B |
| minimal + landing | 10.29 kB | **10.36 kB** | +70 B |
| complete | 10.82 kB | **10.85 kB** | +30 B |
| baseline A | 10.54 kB | **10.60 kB** | +60 B |

A reduced variant carrying only the two reported sites (admission + loop, no bracket guards) measured minimal **10.05 kB** and complete **10.87 kB** — i.e. the three defence-in-depth guards sit **inside brotli's noise band**, ±20 B in both directions. They are not worth trading away for a number that does not exist.

Every composition stays inside its M-3 budget. **Headroom falls from 0.22–0.27 kB to 0.17–0.20 kB**, and that is worth flagging: the budgets were set with ~0.3 kB — "roughly one module" — and after Checkpoint D's 40 B and this 60 B they are at ~0.19 kB. Phase 21 should re-base rather than absorb another change silently.

Per-frame work:

- **Minimal composition: zero.** The check lives inside a branch the minimal build never takes. `live` is passed to `refresh` — one argument, once per *rebuild*, not per candidate.
- **With `visual()` composed:** one indirect call returning a boolean per candidate per **rebuild**. A rebuild happens at most once per committed placeholder move and once per spatial frame with a dirty cache — **never on a warm cache**, which is the common frame. It sits on the same line as a `getBoundingClientRect()` that forces layout, and is roughly three orders of magnitude cheaper.
- **The hot path M-1 measured is untouched.** `moved` → `lift.write` → `frame.schedule` gains nothing; the coalesced spatial search is unchanged in shape.
- **Admission:** one boolean field read per press or keydown, only when `handle()` is composed.
- **Bracket guards:** one boolean field read each, per *committed* move — not per pointer move.
- **Heap:** one boolean on an existing object, plus one closure per controller copied by reference onto each per-operation view. Against M-2's measured 506 B per controller. No per-operation and no per-frame allocation.

## 8 — Scope: the class is wider than sortable, and the fix must say so

I-6 is a **kernel** invariant, so the enumeration below is what decides whether this is a sortable patch or a rule.

| Foreign call | Invoker | Barrier today |
| --- | --- | --- |
| `admit` / `command.admit` | kernel | post-callback revalidation (`kernel.ts:726`) |
| `getHandle` → `getVisual` | **behavior** | **none** (B) |
| `getVisual` per candidate | **feature, in a loop** | **none** (A) |
| `createPlaceholder` | kernel-driven `prepare` | `preparationValid()` between prepare and commit |
| placeholder `connectedCallback` at activation | **behavior**, via a DOM write | present — `presentation.signal.aborted` |
| placeholder reactions in the spatial bracket | **behavior**, via a DOM write | **none** (C) |
| `beforeMove` / `afterMove` hooks | **behavior**, in a loop | none — but no first-party hook reaches consumer code today |
| `onStart` | behavior | ordering: it is last (I-30) |
| `onReorder` | kernel | conditional staging + `runReleaseSeam` |
| `landing({ duration })` thunk | consumer runner, inside `start` | kernel revalidates after `start` (F-30); the rest of `start` is platform code |
| `LandingStart`, `anchorTarget`, `LandingHandle.destroy` / `retarget` | kernel | revalidated on both sides (F-38), `joinValid` |
| `onFinish` / `onCancel` / `onError` / `finalized` | terminal | nothing follows |
| `resetFramePart`, retire hooks | kernel | individually wrapped; reentrant destroy is inert |

Everything the **kernel** invokes has a barrier and is complete. Every gap is a sequence the **behavior** drives. That is the rule, and it is not sortable-specific: it holds for any behavior that calls consumer code more than once inside one seam or one native admission.

**Consequence for Phases 18–20.** Free drag will have its own consumer callbacks — admission resolvers, `onStart`, movement callbacks, a bounds or constraint resolver, `controller.update()`'s policy, a home-target resolver — and every one of them invoked in a sequence needs the same barrier. The *shape* transfers for free: each behavior already builds its own controller and its own private runtime, so a latch is one field and one line in `destroy()`. The *rule* does not transfer by itself, which is why it must be an invariant rather than a patch, and why Phase 18 gets an explicit deliverable: **enumerate every consumer callback the behavior invokes and state where its terminal barrier is.** A sortable-local patch would leave free drag to rediscover this at Checkpoint E, which is the scenario the review is right to name.

**If free drag needs a third copy of the latch**, that is the point at which a kernel-supplied controller-lifetime liveness earns its SPI cost — and it is a Checkpoint E question with a stated falsifier, not a Checkpoint D one. Two behaviors sharing a two-line idiom is not duplication worth a frozen-surface change; three would be evidence the kernel is withholding something both behaviors need.

## 9 — Contract, ledger and plan amendments

1. **`05` §Invariants — new row I-36, tier C.** *Foreign code invoked in a sequence is terminal-aware.* A participant that invokes consumer-supplied code more than once inside one kernel-driven seam, or inside one native admission, reads the controller's terminal latch **between** invocations and stops on the first closed reading — calling nothing further, publishing nothing, and leaving any cache it was rebuilding in its retired state. Mechanism: behavior-owned. **Not promotable to B**: the kernel does not know a behavior's consumer surface and cannot wrap those calls without that surface being written into it (H-1, H-2, D-4). Placed beside I-6, which it discharges for the behavior's interior; **I-6 itself is unchanged** and stays tier B for everything the kernel sequences.
2. **`05` §Findings — new F-47.** The terminal barrier stopped at the seam boundary. Records the reproduction, the third unreported site, the cache-resurrection half, and the root reading: D-26 stated post-callback revalidation for values the kernel **receives** and never for sequences a behavior **drives**.
3. **`05` §Test matrix — new group**, *Terminal barrier in a resolver sequence — new (C2-01)*, carrying the nine cases in §6 with their assert-the-call-list note.
4. **`01` §Teardown** — one paragraph after "No behavior callback in the sequence can stop a later step", stating the converse obligation and pointing at I-36.
5. **`03` §Feature composition** — record `live` on the consumer-declared view, and state the general fact the fourth widening establishes: **the per-operation view is the designated channel for per-operation behavior guarantees**, additively widened four times (8a `item`, 17 `pointerX`, D2 `getVisual`, C2-01 `live`) with no import edge appearing in any of them. Writing that down makes the fifth a routine act rather than a re-litigation of D-13.
6. **`03` §`visual()` and `src/sortable/handle.ts`** — the stated consequence of destroying from inside either resolver.
7. **`ledger.md` — L-12.** The terminal barrier is behavior-owned; the D3 precedent held; the SPI did not reopen; measured cost. **Not a parity row**: the shipped `rebuildRectIndex` (`packages/drag/src/sortable/rect-index.ts:86-117`) resolves the visual per candidate with no liveness check either, so drag2 inherits this defect rather than introducing it, and fixing it is not a parity break — it changes only what happens after a `destroy()` the shipped package's own contract also calls terminal.
8. **`plan.md`** — the C2-01 row under Checkpoint D; the Phase 18 deliverable in §8; a Phase 21 note on the shrinking size headroom.

## 10 — Timing

**This lands before Checkpoint D closes**, and the reason is not the review's exit condition.

- Checkpoint D is stated as *"the last cheap moment to change anything sortable-shaped that leaked into the kernel"*. The decision here is the mirror image of that — how a behavior discharges a kernel invariant the kernel cannot enforce — and it is exactly as expensive to defer for the same reason. Closing D with the rule unwritten means either two behaviors written against no rule, or free drag re-deriving it and the two copies drifting.
- It is a reproduced violation of a **tier-B invariant in a normative document** (00 ranks 00–04 normative, in precedence order). An artifact that contradicts I-6 cannot be recorded as a complete behavior, whatever the parity ledger says.
- The code is in `src/sortable/`, the shape compiles today, and it costs 40–70 B. There is nothing in it that becomes cheaper by waiting.

**What is *not* Checkpoint D's** is the free-drag half. There is no free-drag code to guard, so the Phase 18 deliverable is a deliverable and not deferred work — the rule lands now, the second application lands when the second behavior does.

## What this does not close

- **C2-02…C2-05.** Untouched. One collision to sequence: C2-05 corrects the candidate-"item" pseudocode in the `y.ts` and `xy.ts` module headers, and this decision edits the `InsertionRuntimeView` block a few lines below in both files. Whoever takes them second should rebase rather than re-resolve.
- **I-6's behavior-interior half stays tier C.** It is not promotable without the kernel learning a behavior's consumer surface, which is a worse trade than the discipline. Recorded as such rather than left as an implied B.
- **A `panic()`-initiated destroy does not reach the behavior's latch.** The argument for why that is unreachable from a resolver is in §3 and is reachability, not a type property. If a future path makes it reachable, that is an SPI question and must be argued as one rather than patched.
- **No kernel liveness member is added, and none is ruled out forever.** The falsifier is stated in §8: a third behavior-owned copy of the latch.
- **Nothing is added to the frozen public surface**, so L-11 and Phase 23's re-measurement are unaffected.
- **Whether a resolver that destroys should be classified.** It should not — a consumer destroying its own controller is not a library failure — and this decision keeps every such path silent rather than reporting. If a diagnostic is ever wanted it is a `DEV` report, not a `FailureStage`.

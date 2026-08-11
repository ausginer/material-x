# API review 2 — attacking the synthesis's deletion claims

An adversarial read of [`api-review-1-summary.md`](api-review-1-summary.md) against the current `@ydinjs/drag2` implementation. The synthesis asks to be attacked rather than refined, and specifically for *"machinery that remains even after the public guarantee supposedly disappears"*. That is the axis this review takes.

**No implementation. No designs proposed.** Every finding is a claim about the artifact, cited to source.

**Scope.** I am not attacking whether the proposed APIs are *better*. Several plainly are. I attack one thing: whether the machinery the synthesis expects to delete actually goes away. Where a deletion works, I say so — and in two places the synthesis is **stronger** than it claims.

Findings are prefixed by section: **T** teardown (§3), **F** features (§2), **V** visual/placeholder (§4), **C** collection (§6), **R** readiness (§7), **E** errors (§8), **L** layers (§1).

---

## Summary

| # | Claim | Verdict |
| --- | --- | --- |
| **T-1** | Deferred `destroy()` removes "most or all" of I-36 | **Most, not all.** 7 of 9 findings go; 2 survive, plus act 4 entirely |
| **T-2** | — | **Concession.** The synthesis's premise is right in kind: `destroy()` really is the only path that retires mid-stack |
| **T-3** | Deferral is a simplification | **It blinds the strongest reading.** The two panic-aware barriers are keyed on a *physical* teardown step |
| **T-4** | Teardown can wait for "the current synchronous library transaction" | **No such boundary exists.** Four disjoint entry points, no depth counter |
| **T-5** | `destroy(): Promise<void>` | **Complexity moved to consumers.** Synchronous unmount paths cannot await |
| **F-0** | Features "expose composition machinery to every consumer" | **Factually wrong.** The only exported type is a zero-member opaque brand — and third-party authoring is *not* supported today |
| **F-1** | Features → slots removes composition machinery | **Mostly false.** ~20% of the assembler is deletable; the model costs 266 B total |
| **F-2** | Tree-shaking benefit is concentrated in `landing()`/`layoutAnimation()` | **Correct and understated (89%)** — but `callbacks()` makes half the proposal size-neutral, and the axis is a separate case |
| **B-1** | `landing({ run })` is disproportionately expensive | **Right about types (3 of 4), wrong about code (99 B, 5.4%)** |
| **B-2** | Deleting `run` retires the runner protocol | **False.** The bracket's own witness is a *library-owned* runner |
| **V-1** | Repeated `visual()` resolution is desirable | **Internally contradictory.** The lifted visual is resolved once and cannot be re-resolved |
| **V-2** | Placeholder validation is runtime nannying | **False.** It stops the library deleting a page-owned node |
| **C-1** | Remove "gap survival" | **Ambiguous, dangerously.** "Gap" is mostly the placeholder engine |
| **C-2** | Live reconciliation is a major cost centre | **False.** ~35 lines; the idle path is already the proposal |
| **C-3** | "Dense public version protocol" | **False.** `version` is an internal cache key for two caches |
| **C-4** | Stop inferring mutation via `Object.is`/observers/polling | **Attacks machinery that does not exist** |
| **C-5** | `ReorderRequest` may be downstream of reconciliation | **False.** Zero of six fields removed |
| **C-6** | "Cancel, then replace" | **Hides an async gap.** Cancellation is a settlement |
| **R-1** | Serial `await onReorder` is a new capability | **It already works today.** The proposal deletes the *non*-serial option |
| **R-2** | Removes "the second settlement gate" | **False.** The surviving gate is the landing gate |
| **R-3** | Removes the readiness timeout | **False.** A promise that never settles is the same hang |
| **R-4** | Cost is "overlap between commit latency and landing" | **Incomplete.** Four consequences, and `cancel()` reachability *inverts* |
| **R-5** | — | **Concession.** By the package's own React probe, serialization is a correctness *improvement* |
| **E-1** | Collapsing `FAILURE_*` removes machinery | **False**, but the collapse is better-founded than argued: 14 stages → 4 recovery classes, 1 named branch. Also the count is **sixteen** |
| **E-2** | `onEnd(result)` replaces three callbacks | **Lossy, by design.** `FAILURE_TERMINAL_CALLBACK` fires `onFinish` *and* `onError` for one operation |
| **E-3** | §1 vs §8 | **Mutually inconsistent.** A public kernel cannot hide the stages |
| **L-1** | Making `draggable()` internal reduces surface | **Inverted.** There is no kernel entrypoint today |

---

## §3 — `destroy()`: the load-bearing claim

> "This is expected to remove most or all of the I-36 `live()`/barrier/reach/stretch machinery."

The I-36 floor forbids five acts once the controller is closed ([`05-lifecycle-invariants.md:54`](../../contract/05-lifecycle-invariants.md)): (1) publishing state that outlives the operation, (2) retaining a reference past `retire()`, (3) mutating DOM teardown will not undo, (4) invoking a declared consumer callback, (5) dereferencing state `retire()` may have nulled.

### T-2 — first, the concession: the premise is correct in kind

I expected to find that a consumer **throw** recreates mid-stack teardown, and it does not. Every consumer entry into the kernel is wrapped: `runPhase` catches and converts to a classified failure ([`seams.ts:329-358`](../../../src/kernel/seams.ts#L329-L358)), which `failOperation` **enqueues** ([`kernel.ts:613-617`](../../../src/kernel/kernel.ts#L613-L617)); `dispatchKernel`'s drain then returns immediately because a pass is already running ([`queue.ts:73-75`](../../../src/kernel/queue.ts#L73-L75)). A classified failure is therefore always a *separate queue entry*, reached after the failing function has already returned — never a teardown on the failing frame's stack.

`panic()` does call `destroy()` ([`kernel.ts:531-534`](../../../src/kernel/kernel.ts#L531-L534)), but it fires only on a throw that **escapes** the handler, and no consumer-reachable entry can produce one: `host.dispatch` enqueues, `host.fail` latches, `host.cancel` latches, `openIngress` refuses reentry, `host.presentationCommitted` only sets flags. The contract states the conclusion and the source bears it out:

> a throw from consumer code inside a seam is caught and classified rather than panicking, a nested `dispatch` enqueues without draining, and no consumer callback opens a seam — **so the only destroy a resolver can cause is `controller.destroy()`**.
> — [`05-lifecycle-invariants.md:392`](../../contract/05-lifecycle-invariants.md)

So §3 has identified the right lever. All eleven "was (d)" stretches are destroy-shaped, not throw-shaped. **The rest of this section is about how much the lever actually moves, and what it costs to pull.**

### T-1 — acts 1, 2 and 5 go; acts 3 and 4 stay

Taking the nine C5 findings one at a time against a deferred teardown:

| # | Site | Acts | Deferral prevents? |
| --- | --- | --- | --- |
| 1 | `seedDraft` / `command.admit` | 1, 2 | **yes** |
| 2 | `activation.effect` survival conjuncts | 1, **4** | **no** — the last statement is `onStart` |
| 3 | `release.prepare` frame writes | 1, 2 | **yes** |
| 4 | `release.effect` `lift.write` / `pendingRequest` | **5**, 1 | **yes** |
| 5 | `settlement.prepare` domain publication | 1 | **yes** |
| 6 | `anchorTarget` re-anchor | **3** | **yes** — the library *adopted* this placeholder |
| 7 | `placement.ts` `applyMechanics` ×6 | **3** | **NO** |
| 8 | `placeholder.ts` `classList.add` | **3** | **NO** |
| 9 | `layout-animation.ts` `running.set` | 2, 1 | **yes** |

**Seven of nine go.** Acts 2 and 5 are defined against `retire()` having run; acts 1's cases are publications into frames `scrub()` has already reset, and deferral moves the scrub after the write. That is the majority and the synthesis deserves the point.

**Acts 3 and 4 are the residue, and adoption is the discriminator.** #6 is prevented because the library *did* adopt that placeholder — the undo is registered (`scope.presentation.use(() => { placeholder.remove(); })`, [`spec.ts:493-495`](../../../src/sortable/spec.ts#L493-L495)) and deferral simply lets it fire after the re-anchor instead of before.

#7 and #8 are not, because the element is **never adopted**. The placeholder is created in `activation.prepare` and adopted only in `activation.effect`; a destroy from the factory invalidates the preparation, so `effect` never runs and the disposer is never registered. Teardown holds no reference to the element at all — deferred or not:

> the element is not adopted until `activation.prepare` returns, so a mutation left on it after `destroy()` is a residue **teardown never undoes**
> — [`placement.ts:56-59`](../../../src/sortable/placement.ts#L56-L59)

> `create` is consumer code and the element it returns is the consumer's own, **not yet adopted by anything**: teardown removes only the placeholder it inserted, so a class written here after `destroy()` returned **stays on that element forever**
> — [`placeholder.ts:44-60`](../../../src/sortable/placeholder.ts#L44-L60)

There is no `classList.remove` anywhere in `src/`.

**Act 4 is orthogonal to teardown timing by construction.** #2's publications are prevented, but its last statement is `slots.onStart(item)` — a declared slot the consumer filled. The synthesis keeps *"no new work is admitted"*, so either the library still calls `onStart` after `destroy()` returned, or every consumer-callback site keeps a reading. The contract already ships one *admitted* act-4 violation the same reasoning cannot reach: F-30's `runner.destroy()` on a consumer `LandingHandle` after teardown ([`kernel.ts:1349-1357`](../../../src/kernel/kernel.ts#L1349-L1357)), which the kernel **must** call or leak a runner nothing owns.

**Net:** the claim should read *"removes the publication-and-retention half of I-36; leaves the unadopted-mutation and consumer-callback half"*. Of the 31 threaded `live()` readings, the ones handed to modules **as a parameter** — `PlaceholderSlot`, `PresentationView.live`, `DisplacementView.live`, `RectIndex.refresh(…, live)` — are threaded precisely because those modules touch unadopted consumer nodes or must stop calling further consumer code. Deferral addresses none of them.

### T-3 — deferral blinds the strongest reading

This is the finding I did not expect, and it is the sharpest argument against §3 as scoped.

There are **two** liveness readings, and they are not the same fact:

- **`rt.closed`** is written in exactly one place, `controller.destroy()` ([`controller.ts:131-134`](../../../src/sortable/controller.ts#L131-L134)). Nothing in `src/kernel/` can set it. A `panic()`-initiated destroy therefore leaves `rt.closed === false` and `live()` returning `true` *after teardown has already run*. This is admitted as open at [`05:392`](../../contract/05-lifecycle-invariants.md).
- **`presentation.signal.aborted`** is the presentation lifetime's `AbortSignal`, aborted by `dispose()` — which both `destroy()` and `retireOperation` call unconditionally ([`kernel.ts:511-513`](../../../src/kernel/kernel.ts#L511-L513), [`:481-483`](../../../src/kernel/kernel.ts#L481-L483)). It is **route-independent** and so reads true for a `panic()` destroy too.

Two sites hold the panic-aware reading — both in `activation.effect`, at [`spec.ts:516`](../../../src/sortable/spec.ts#L516) and [`:557`](../../../src/sortable/spec.ts#L557). Thirty-one hold the panic-blind one.

**The signal is keyed on a physical teardown step.** Defer the teardown and `presentation.signal.aborted` stops meaning "logically closed" and starts meaning "already torn down" — which, by construction, is now false at exactly the moment the barrier needs to fire. Both panic-aware barriers must be re-based onto whatever the new logical-close flag is, and if that flag lives on the runtime like `rt.closed` does, **it is panic-blind**. That is precisely the regression [`05:390`](../../contract/05-lifecycle-invariants.md) refuses to accept as the reason `FeatureContext.live()` was not implemented.

So §3 does not merely shrink the barrier machinery; it degrades the quality of the two readings that are currently strongest, and it does so silently, because the type of the expression does not change.

### T-4 — there is no "current synchronous library transaction" to wait for

The proposed semantics — *"physical teardown waits for the current synchronous library transaction to unwind"* — presupposes a transaction boundary. There is not one.

`grep -n "depth"` over `src/kernel/` returns only the phrase "defence in depth". What exists is four independent single-level boolean latches and an identity pin — `queue.running`, `queue.closed`, `destroyRequested`, `admitting`, `openStage`/`reentry` (explicitly *"strictly non-reentrant"*, a latch and not a counter, [`seams.ts:296-303`](../../../src/kernel/seams.ts#L296-L303)), `reporting`, `pinned`. None answers "how deep".

More importantly the kernel is entered synchronously from **four disjoint places**, only one of which is the drain:

1. `drain` ([`queue.ts:68`](../../../src/kernel/queue.ts#L68)) — queued actions;
2. `openIngress` ([`kernel.ts:825-848`](../../../src/kernel/kernel.ts#L825-L848)) — a whole transaction run **outside** the queue, with `begin()`/`commit()` called directly rather than through `runCore`;
3. the native listeners `onPointer`/`onPointerDown`/`onCommand`;
4. async continuations — `completeLanding`, `settleResolution`, the readiness timer, and `host.presentationCommitted`. The last is the striking one: a consumer's `ready()` call can synchronously drive `handleReadinessSettled → advanceSettlement → joinSettlement → anchorTarget → handle.destroy() → RETIRE → retireOperation`, a full retirement inside one consumer call.

A deferred `destroy()` needs a new unwind-point abstraction spanning all four, plus a decision about `clearQueue(queue)` ([`kernel.ts:504`](../../../src/kernel/kernel.ts#L504)) — which today drops everything a resolver appended *before* those entries can run — and about `ingress.abort()`, whose entire point as step 7 is that *"no earlier step can prevent ingress from being released"* ([`kernel.ts:521-522`](../../../src/kernel/kernel.ts#L521-L522)).

**This is the correction I most want on the record.** I initially read `admitting` plus the queue as a reentrancy bracket §3 could reuse, and that is wrong: `admitting` suppresses drains during native admission, and `openIngress` is itself outside the queue. §3 is *new kernel machinery*, not a re-pointing of existing machinery — and it should be costed as such against the ~35 lines of I-36 readings it deletes.

The exclusion is also deliberate and documented:

> Behavior actions are unaffected — they are still deferred and drained by the boundary — and **`destroy()` is not queued at all, so it remains the synchronous terminal barrier I-6 requires.**
> — [`kernel.ts:820-823`](../../../src/kernel/kernel.ts#L820-L823)

### T-5 — `destroy(): Promise<void>` moves a problem to every consumer

Two proposed properties interact badly: *"if no library transaction is executing, teardown may complete immediately"* and *"if called reentrantly, physical teardown waits"*. Teardown timing becomes conditional on the caller's stack position, which the caller usually cannot know. Today there is one rule.

The consumers that matter cannot await. `disconnectedCallback()` and a React `useEffect` cleanup are both synchronous and both are the canonical teardown sites. Under the proposal, the window between logical close and physical teardown is one in which the library still holds pointer capture, still has ingress bound, and still has a placeholder inserted in a tree the consumer believes it has finished with.

---

## §7 — readiness

### R-1 — serial `await onReorder` already works, today

This reframes the whole section. `OnReorder` already returns `ReorderResolution | PromiseLike<ReorderResolution>` ([`domain.ts:143-146`](../../../src/sortable/domain.ts#L143-L146)), and `openResolution` fully implements the thenable path — reading `.then` exactly once, subscribing both arms, classifying a synchronous throw as `SETTLED_REJECTED` ([`kernel.ts:1582-1646`](../../../src/kernel/kernel.ts#L1582-L1646)) — with a hostile-thenable test suite behind it.

The synthesis's own snippet, minus `ready()`, is **valid working code against the current build**:

```ts
async onReorder(request) { setOrder(next); await authoredCommit; return accept(); }
```

With no `presentation: true`, `authoredReady` is `true` at seal, `anchorTarget` re-anchors immediately, and landing has not started because `openSettlement` is only reached from `handleResolutionSettled`.

**So §7 is not "return to serial semantics". It is "delete the non-serial option."** That is a legitimate proposal, but it must be argued as a removal of capability from consumers who have it, not as a simplification that restores a default. What such a consumer loses today is exactly two things: a bound on a commit that never arrives, and the landing overlap.

### R-2 — the surviving gate is the landing gate, so "removes the second settlement gate" is false

Almost none of the settlement machinery is readiness machinery. Sorting it:

| Machinery | Readiness-specific? |
| --- | --- |
| `holds`, `advanceSettlement`, `joinSettlement` | **no** — needed for landing alone |
| `settlementLive` (five conjuncts), `joinLive` | **no** — F-30/F-38 revalidation around `anchorTarget`/`start`/`destroy()` |
| `completeLanding`, `rollbackLandingHold` | **no** |
| `retireAttempts`, `ARM_STALE`/`ARM_FAILED` | **no** |
| `sealed`, arm-nothing-on-failed-seal | **no** — the landing request is dropped by the same code |
| `readinessHeld`, `readinessSettled`, `presentationLatched`, `authoredReady`, `startReadinessDeadline`, `handleReadinessSettled`, `host.presentationCommitted`, `controller.ready` | **yes** |

The landing gate stays asynchronous under any proposal, because it is a WAAPI animation. The whole reserve-call-revalidate sandwich — *"the first makes a synchronous `done()` safe, the second makes a synchronous `destroy()` safe"* ([`kernel.ts:1237-1243`](../../../src/kernel/kernel.ts#L1237-L1243)) — survives untouched. What dies is the readiness column, and only it.

Confirming from the other direction: a zero-duration or reduced-motion landing **still goes through every gate**. The duration is *collapsed, not skipped*, deliberately, so that there is one lifecycle whatever the user's motion preference is ([`landing.ts:99-113`](../../../src/sortable/landing.ts#L99-L113)); nothing in the hold decision reads the duration. The synthesis nominates reduced-motion as *"a useful falsifier"* — it falsifies in the opposite direction to the one implied.

### R-3 — the timeout is not removed by serialization

`readinessTimeout` exists because a consumer may never acknowledge. Under `async onReorder`, a consumer may never **resolve the promise** — the same hang, the same consequence, and the same operation pinned open. The timeout is a policy decision about how long the library waits, orthogonal to the protocol's shape. If the answer is "no timeout", that is available today without the rewrite and should be argued on its own rather than counted as a saving.

Losing it also makes `FAILURE_PRESENTATION_READY` unreachable: there is then no bounded terminal for a commit that never lands.

### R-4 — the cost is not only the overlap, and `cancel()` reachability inverts

`presentation: true` controls four things, not one:

1. **Who owns the lifted visual's transform, and for how long.** With readiness held, the runner keeps the transform for the entire commit latency and the kernel's authoritative pin is deferred behind it; without it, the runner's window is exactly the animation.
2. **What the placeholder does.** Its removal is registered on the presentation lifetime and released only in `joinSettlement`'s `finally`. Holding readiness is what keeps it in the list until the consumer's rows exist — the React suite pins the visible failure: *"Removing the placeholder before the authored rows exist is the visible form of finalizing early: the list collapses by one row and springs back"* (`react.browser.test.ts:527-546`).
3. **Where the landing aims.** `handleReadinessSettled` is the **only** caller of `LandingHandle.retarget`; deleting readiness makes `retarget` and its whole `generation` guard dead code.
4. **Whether a never-committing render has a terminal** — the timeout above.

And the sharpest consequence, which the synthesis does not mention at all: **cancellation reachability inverts.** At `SETTLING`, `cancel()` is inert today — the cancellation lifetime is disposed before the behavior effect, and `handleCancel`'s switch has no `SETTLING` case, so *"once the settlement is armed the cancellation lifetime is closed, so `cancel()` cannot end an operation waiting on readiness"* (`composition.browser.test.ts:768-772`). At `RELEASING` — which is where a serial `await` puts the commit wait — cancel is **live**, with the resolver's `AbortSignal` wired and Escape still armed.

So serialization moves the consumer's commit into a window where an Escape press produces `RECOVERY_HOME` **while the consumer's authored DOM already shows the new order**. Today that state is unreachable by construction. This is a new correctness question the section has to answer, and it is the opposite of a simplification.

Secondary losses worth pricing: the identity check relocates from a consumer-visible object to a kernel-private slot, so the diagnostic *"ready() received a request this operation never issued"* disappears and a late promise resolution is dropped **silently**; and six DEV diagnostics across the duplicate/contradiction/wrong-identity/out-of-window windows go with it. The dedicated `acknowledgement.browser.test.ts` is 20 tests, and `tests/support/gates.ts` — the F-6 witness that catches terminal callbacks delivered while a declared presentation is unacknowledged — would be deleted wholesale.

### R-5 — the concession: §7 is stronger than it claims

The package's own executable probe ([`react-placeholder-probe.md`](../../react-placeholder-probe.md), 35 tests) finds that the landing plan is built from **pre-commit** geometry, and that *"any commit that adds, removes, or resizes content above the gap moves the placeholder (e.g. `120 → 160`)"*. Its recommended fix is to measure **after** the consumer's commit — which serialization gives naturally.

The synthesis lists only a cost (*"losing overlap between React commit latency and landing animation"*). On its own evidence the more interesting consequence has the opposite sign: **serialization is a correctness improvement for landing geometry.** That belongs in the argument.

The probe also fixes what any design must still provide: the placeholder connected and *semantically* correct when the commit finishes. It found one reproducible case where it is not — a newly keyed item mounted into the destination gap during the accepting commit, after which *"remeasuring it yields a confidently wrong rect"*. That requirement is independent of whether acknowledgement arrives by handshake or by promise.

---

## §6 — collection semantics

The section least accurate about the artifact. Four premises are wrong, one dangerously.

### C-1 — "the gap" names two things, and only the smaller one is reconciliation

"Gap" in this package overwhelmingly means **the slot in the DOM the placeholder occupies**. That meaning is the placeholder engine: `movePlaceholder` is the gap writer ([`placement.ts:227-251`](../../../src/sortable/placement.ts#L227-L251)); both axes *produce* gaps from pixel geometry ([`y.ts:135-149`](../../../src/sortable/y.ts#L135-L149)); `homeGap` is a placeholder move inside `RECOVERY_HOME` ([`spec.ts:356-363`](../../../src/sortable/spec.ts#L356-L363)) and never touches `updateItems`; the `view.insertion` publication has a seven-test suite, every case named *"should clear the gap when …"*, none involving a collection update.

"Gap survival" in the review's sense — whether the identity gap the consumer was shown outlives a replacement — is four adjacency cases in [`collection.ts:66-123`](../../../src/sortable/collection.ts#L66-L123), called from exactly one site. **Taken literally, "no gap survival" deletes the wrong thing.** The section needs to say *identity* gap.

### C-2 — the deletable surface is ~35 lines, and the idle path is already the proposal

`updateItems()` is nine lines ([`controller.ts:70-92`](../../../src/sortable/controller.ts#L70-L92)). The idle branch already *is* the proposal, and is broader than the review's two-state model — it also covers the frozen transaction ([`spec.ts:698-703`](../../../src/sortable/spec.ts#L698-L703)):

```ts
if (phase === IDLE || phase >= RELEASING) {
  return { snapshot: next, cancelReason: null } satisfies PreparedCollection;
}
```

Net deletable by cancel-on-update: `reconcileCollection`, its `CollectionChange` union, and one branch — about 35 lines. That is the entire cost of the guarantee, and it should be weighed as such.

"Publish-before-cancel semantics" is two statements in one function ([`spec.ts:856`](../../../src/sortable/spec.ts#L856), [`:874`](../../../src/sortable/spec.ts#L874)); the proposal **inverts their order** rather than deleting a mechanism. The inversion is observable and pinned: today, after an invalidating update cancels the drag, the new collection is already live, so a newly added item is immediately draggable (`sortable.browser.test.ts:1670`).

### C-3 — `version` is an internal cache key, not a public protocol

Publicly it is two `number` fields on two exported records — no getter, no event, no API; `Insertion`, the one type where it does reconciliation work, **is not exported at all**. Internally it keys the axis geometry cache ([`rect-index.ts:126`](../../../src/sortable/rect-index.ts#L126), [`:206`](../../../src/sortable/rect-index.ts#L206)) and `layoutAnimation()`'s membership set, which exists to avoid an O(distance × list) walk ([`layout-animation.ts:86-93`](../../../src/sortable/layout-animation.ts#L86-L93)); it also feeds the insertion/snapshot coherence guard, which catches mixed-version arithmetic reachable from the **queue** regardless of reconciliation. Cancel-on-update still needs a monotonic snapshot identity.

### C-4 — the library already does not infer mutation

Zero `Object.is`, zero `MutationObserver`, zero polling, zero observers in `src/`; the single `setTimeout` is the readiness deadline. The contract already states the review's position: *"**Acceptance is never inferred** — not from callback silence, not from DOM mutation, not from collection order, not from elapsed time"* ([`domain.ts:108-112`](../../../src/sortable/domain.ts#L108-L112)). This paragraph should be struck so it does not read as a change.

### C-5 — cancel-on-update removes zero `ReorderRequest` fields

§9 defers this question; it can be answered now. Each field has an independent producer: `item` (what moved), `version` (two caches + the coherence guard), `from` (the consumer's own splice), `to` (the **axis** or the **keyboard**), `before`/`after` (`movePlaceholder` needs a real anchor to express an end gap; identity neighbours are what fixed F-31's silent start-gap no-op, and they drive `placeholderAt`'s inertness test).

The keyboard path would lose most: it has no pointer sample at all, so the indices and neighbours **are** the only description of what it did — and Phase 16's done-when is proposal *equivalence* between the two ingresses (`keyboard.browser.test.ts:579-608`). `copyUniqueItems` also survives, and its shallow copy matters *more* under cancel-on-update, since the array still crosses a queue boundary.

### C-6 — "cancel, then replace" hides an asynchronous gap

`cancel()` sets a latch and **dispatches** ([`kernel.ts:558-565`](../../../src/kernel/kernel.ts#L558-L565)). The queued `CANCEL` opens a cancellation settlement — the return-home landing — and the operation is not retired until it completes. So does the replacement land immediately, while a landing animation is still running against the old collection's geometry, or does it wait, making `updateItems()` asynchronous? Both cost something, and the second reintroduces the staged protocol §6 is trying to delete.

---

## §2 — features vs direct slots

### F-0 — the premise is factually wrong: nothing is exposed to consumers

> "This creates runtime collision/missing-feature validation and **exposes composition machinery to every consumer**."

The authoring types are deliberately unexported, and the built declarations confirm it. `sortable/feature.d.ts` emits only `SortableCallbacks` and `SortableFeature` — and `SortableFeature` is a **zero-member opaque brand**:

```ts
declare const FEATURE_BRAND: unique symbol;
export type SortableFeature = Readonly<{ [FEATURE_BRAND]: true }>;
```
— [`feature.ts:170-201`](../../../src/sortable/feature.ts#L170-L201)

`FeatureContext`, `InsertionGeometry`, `SortableContribution`, `FeatureFactory`, `brandFeature`, `unbrandFeature` and `assemble` are all pruned from the shipped `.d.ts` and absent from the frozen runtime surface in `tests/exports.node.test.ts`. What a consumer sees is **nine factory functions returning an opaque token**.

This has a consequence §2 does not appear to have priced: **third-party feature authoring is not supported today.** The brand is `declare const … unique symbol` and unexported, so a third party cannot mint a `SortableFeature` at all. §2's *"custom sortable extension → supported feature-authoring API"* is therefore not a preservation of an existing capability — it is **new public surface**, with the same freeze cost as any other. That should be argued on its merits rather than carried along as a thing that already exists.

### F-1 — the assembler survives, because `landing()`/`layoutAnimation()` stay features

The collision validation is fifteen lines ([`assemble.ts:34-48`](../../../src/sortable/assemble.ts#L34-L48)), each use one null comparison. The substantial machinery is the **retire-hook ordering** ([`assemble.ts:64-82`](../../../src/sortable/assemble.ts#L64-L82)) — cleanup recorded before any claim can throw, in installation order, so a collision does not leak the private state of the contribution that collided.

Measured on the built module (2,420 B of code), what survives if only `landing()` and `layoutAnimation()` remain features: the factory loop verbatim, `brandFeature`/`unbrandFeature` and the whole brand, the `claim` helper (191 B — `landing()` fills the single-writer `startLanding` slot, so two `landing()` calls must still collide), retire recording and reverse-order discharge (`layoutAnimation()` contributes `retire`; the axes contribute `insertion.retire`), the total unwind (171 B), the `beforeMove`/`afterMove` pipelines (`layoutAnimation()` is the writer), and slot flattening and defaults (634 B — these exist in the hand-written non-composed baseline too).

**Deletable: 3 of 6 `claim` call sites and 2 of 3 null checks — roughly 500 B of 2,420 B, about 20%.** For scale, the *entire* composition model costs **266 B brotli** (10,934 B composed against 10,668 B for the feature-matched non-composed baseline). The deletion target is a fraction of that.

The package then also has **two** configuration paths to specify, document, validate and test where it has one.

### F-2 — the tree-shaking claim is correct and understated, but incomplete in two ways

Measured, from [`README.md:109-117`](../../../README.md) and [`03-feature-composition.md:683-689`](../../contract/03-feature-composition.md):

| composition | brotli | vs minimal |
| --- | --- | --- |
| minimal (`y()`) | 10.12 kB | — |
| + `layoutAnimation()` | 10.56 kB | **+0.44 kB** |
| + `landing()` | 10.40 kB | **+0.29 kB** |
| complete | 10.93 kB | **+0.82 kB** |

`landing()` + `layoutAnimation()` are **0.73 kB of 0.82 kB — about 89%**. The residual for `placeholder()`, `handle()` and `visual()` combined is roughly **90 B** across three factories. The synthesis is right, and could say so more strongly.

Two things it misses.

**`callbacks()` is in every composition.** Every entry in the size harness imports `sortable/callbacks.js`, so moving `onReorder` and `threshold` to direct slots has **exactly zero** tree-shaking consequence in either direction. That half of Claim A is size-neutral by construction — which removes any size argument against it, and is worth stating, because it makes the ergonomic case the only case that has to be made.

**The axis is a separate tree-shaking case that the composed-vs-minimal delta cannot show,** because an axis is in every composition including the minimal one. It is `y()` **against** `xy()`, and it is mandatory — exactly one axis feature is required, and the two are mutually exclusive through the very single-writer collision §2 wants to delete ([`03-feature-composition.md:397`](../../contract/03-feature-composition.md)):

> an unrestricted 2-D default would live in the behavior core and could not be tree-shaken … **a single parameterized axis feature fails the same rule ~120 B more cheaply** and in the same direction. Two subpaths keep each composition paying for its own rule, and the packaging test asserts the absence in both directions.
> — [`03-feature-composition.md:441`](../../contract/03-feature-composition.md)

An `axis: 'y' | 'xy'` slot is precisely the parameterized axis feature that was measured and rejected. The synthesis's preserve-list keeps *"`y()` and `xy()` as genuinely different insertion strategies"* — which is the feature mechanism under another name.

Finally, headroom is currently 0.11–0.16 kB. Moving `handle`/`visual` into the always-loaded core spends from that, not into it.

---

## §5 — the custom landing runner

### B-1 — the code cost is 99 B; the type cost is the real one

`landing.ts` is 88 code lines; built, 1,821 B. The code that exists **only** for a consumer runner is one option field and one early return:

```ts
const { run } = options;

if (run !== undefined) {
  return brandFeature(() => ({ startLanding: run }));
}
```
— [`landing.ts:59-63`](../../../src/sortable/landing.ts#L59-L63)

Built, that is **99 B of 1,821 B — 5.4%**, inside the ±20 B noise band the contract itself uses after brotli. Everything else — defaults, thunk-vs-fixed resolution, the reduced-motion collapse, `fill: 'forwards'`, the generation guard, the all-or-nothing subscription acquisition, `play`, `destroy`, `retarget` — is needed for the library-owned animation.

The **type** surface is where the claim lands. Three of the four public type exports on the subpath exist only because `run` does: with `run` removed, `LandingOptions` collapses to `{ duration?, easing? }`, and `LandingStart`, `LandingContext` and `LandingHandle` all become unreachable from the public graph. Their declarations are ~55 lines of published API prose, most of it `LandingContext`'s coordinate-space contract. A documented domain exception goes with them (*"`landing({ run })` replaces the default runner entirely, so `duration` and `easing` are not read — and therefore not validated — when it is present"*).

So the synthesis is **right about the surface and materially wrong about the code**. It should make the argument in type-surface and documentation terms, where it is strong, rather than in runtime-cost terms, where it is 99 B.

### B-2 — deleting `run` does not retire the F-30 kernel bracket

This is the load-bearing correction. `armSettlement` has exactly one landing path, and the kernel cannot tell whether the `LandingStart` it holds came from `run` or from the library's own `duration`/`easing` path — the default runner **is** a `LandingStart` ([`landing.ts:82`](../../../src/sortable/landing.ts#L82)).

The suite's own bracket-discharge witness proves it: the test is `landing({ duration: () => { controller.destroy(); return 200; } })` — a **library-owned** runner with a consumer duration thunk (`features.browser.test.ts:832`). The `run`-specific test is a separate row pinning a different property. So the F-30 revalidation and its `runner.destroy()` remain reachable through `landing({ duration: thunk })`, a first-class documented option.

`runner.destroy()` is generic kernel machinery on three further counts, none involving `run`: it runs on **every** successful landing, ordered before the pin so a live WAAPI animation cannot override the inline transform; it destroys a handle returned alongside a synchronous `fail()` — which the library's own runner can produce, since `finished` is an accessor and `then` a call and either can throw; and `retireAttempts` disposes a published handle regardless of provenance.

**Consequence for the synthesis:** deleting `run` removes public types, not lifecycle machinery. The *"lifecycle protocol around arbitrary consumer-owned animation resources"* it objects to is the protocol around **any** runner, including the one the library ships. If the goal is to delete the protocol, `duration: () => number` has to go as well — which §5 does separately flag for justification, and this is the argument for taking those two decisions together rather than in sequence.

---

## §4 — consumer contracts instead of runtime nannying

### V-1 — the `visual()` position is internally contradictory

§4 asserts both that the same visual serves candidate geometry, placeholder sizing, lifted presentation and landing, *and* that repeated resolution on rebuild is desirable. The implementation runs two disciplines:

- the **dragged** item's visual is resolved **once**, at admission ([`spec.ts:185-186`](../../../src/sortable/spec.ts#L185-L186)), and that element is lifted, transformed, sized against and landed;
- **candidate** visuals are re-resolved on every rebuild ([`rect-index.ts:163-164`](../../../src/sortable/rect-index.ts#L163-L164)) — and the dragged item is excluded from candidates.

Repeated resolution is already the rule where it is harmless; single resolution is already the rule where it is not. The framework-swap case §4 wants to serve is the *dragged* item — the one that is pinned. Re-resolving it mid-gesture hands the transform to an element that has none; not re-resolving it keeps transforming a detached node. Making resolution uniform breaks one or the other. **§4 should decide which of its two sentences it keeps.**

### V-2 — the placeholder check protects the page

The check is four comparisons, and the comment states the failure mode:

> The factory is consumer code and its result is **adopted**: activation inserts it, every move relocates it, and **teardown removes it**. So returning the dragged item, its visual, or any node already in the document hands the library ownership of something the page owns — and the teardown removal then **deletes it**.
> — [`placement.ts:154-161`](../../../src/sortable/placement.ts#L154-L161)

This is not proving compliance; it is refusing ownership of a node whose owner will be surprised when the library deletes it. Demoting it to DEV-only means production silently removes the consumer's item, with no attribution — the outcome the comment says the check exists to prevent. The synthesis keeps *"custom placeholder factories under a simple ownership convention"*; a convention whose violation deletes user content is not simple.

---

## §8 — error and terminal API

### E-1 — the premise is right, and the artifact supports the collapse better than the synthesis argues

Count, kind and visibility all check out ([`failures.ts:15-28`](../../../src/kernel/failures.ts#L15-L28)) — though the true figure is **sixteen** exported numeric stage constants, not fourteen: `AT_PROPOSAL = 20` and `AT_CONSUMER = 21` ship from `sortable.js` as the `CancelStage` union.

Every stage has a live raise site; none is vestigial. But the artifact's own documentation makes the case for collapsing *the consumer-facing view* more strongly than §8 does: the fourteen stages map onto **four recovery classes** — none / immediate / home / none-retire ([`02-kernel-behavior-contract.md:1436`](../../contract/02-kernel-behavior-contract.md)) — and exactly **one** stage is branched on by name anywhere in the artifact, `FAILURE_TERMINAL_CALLBACK` at [`spec.ts:1160`](../../../src/sortable/spec.ts#L1160), which is behavior-internal rather than consumer code. The only consumer-facing stage with a documented actionable meaning is `FAILURE_PRESENTATION_READY` ("raise `readinessTimeout`"). Neither README nor the contracts publish a per-stage consumer-action table. **Fourteen exported numbers, four internal classes, one documented consumer action** — that is the argument §8 should be making.

What does **not** follow is that machinery goes away. They are the **kernel↔behavior classification protocol**: the behavior raises them (`host.fail(FAILURE_INVALIDATION, error)` at [`spec.ts:275`](../../../src/sortable/spec.ts#L275), [`:308`](../../../src/sortable/spec.ts#L308), [`:632`](../../../src/sortable/spec.ts#L632); `FAILURE_RELEASE` at [`:891`](../../../src/sortable/spec.ts#L891), [`:920`](../../../src/sortable/spec.ts#L920), [`:965`](../../../src/sortable/spec.ts#L965), [`:981`](../../../src/sortable/spec.ts#L981)), and the stage→recovery mapping is deliberately behavior-owned:

> The stage → recovery mapping is deliberately **not** here … the behavior maps a `SETTLED_FAILED` input to its own recovery (D-24, F-33).
> — [`failures.ts:9-12`](../../../src/kernel/failures.ts#L9-L12)

Collapsing the public export **hides** the stage set; the internal set stays exactly as large.

### E-2 — the `onEnd(result)` merge is lossy, and the artifact says so

I expected this to be a clean signature change. It is not.

Two of the three pairings are exclusive. `onFinish` vs `onCancel` is an exhaustive switch on `domain.type`, not a predicate ([`spec.ts:1265-1295`](../../../src/sortable/spec.ts#L1265-L1295)). `onError` vs the terminals is exclusive on the ordinary failure path, deliberately — *"A failed settlement reports through `onError` **only**: no `onFinish`, no `onCancel`"* ([`spec.ts:1190-1198`](../../../src/sortable/spec.ts#L1190-L1198)) — and the cancel-latch precedence exists to stop the double ([`kernel.ts:588-597`](../../../src/kernel/kernel.ts#L588-L597)).

**But `FAILURE_TERMINAL_CALLBACK` breaks it by design.** `spec.finalized` is the function that *calls* `onFinish`/`onCancel`, and the kernel wraps it: `driver.runLeaf(() => { spec!.finalized(current); }, FAILURE_TERMINAL_CALLBACK)` ([`kernel.ts:1452-1454`](../../../src/kernel/kernel.ts#L1452-L1454)). So if the consumer's own `onFinish` throws, `onFinish` has already been entered, the throw is classified, and `onError` then fires **for the same operation**. The behavior explicitly refuses to relabel the outcome:

> A terminal-callback failure has recovery "none": the operation already finalized, and rewriting the outcome now would relabel a drop that **has been reported as accepted**.
> — [`spec.ts:1155-1164`](../../../src/sortable/spec.ts#L1155-L1164)

There is a third channel too: a terminal-adjacent throw can produce **neither** — one `onCancel`, zero `onError`, and a platform report, because I-22 ranks the cancel above the failure checkpoint (`composition.browser.test.ts:681-707`).

So a single exactly-once `onEnd(result)` has to answer a question §8 does not raise: **what does a second invocation mean for an operation whose result has already been announced?** The options are all costly — suppress the error (loses it), re-invoke `onEnd` (breaks exactly-once, the property that motivated the merge), or keep a separate error channel (which is the current design). It remains a real DX improvement for the common path, and it still deletes nothing, because the precedence machinery that makes the common path single-valued is what does the work.

**A coverage gap found on the way.** The `onFinish` + `onError` pair is designed, documented, and reachable from any consumer whose `onFinish` throws — but the only test pinning it drives the *kernel* harness's `finalized` (`kernel.browser.test.ts:2160-2178`). **Nothing pins the combination through the public sortable surface.** Whatever §8 decides, that case should be pinned first, because it is the one the decision turns on.

### E-3 — §1 and §8 are mutually inconsistent

§1 wants the kernel to be a supported public authoring layer; §8 wants the failure stages to stop being public. A custom behavior author **must** classify failures — that is the kernel's contract with a behavior, and `FailureStage` is documented as public precisely because of it ([`failures.ts:6-7`](../../../src/kernel/failures.ts#L6-L7)). Promoting the kernel makes the stage vocabulary *more* public. The two cannot both land as written.

---

## §1 — public layers

### L-1 — there is no kernel entrypoint, so this adds surface

The package publishes nine runtime entrypoints ([`files.json`](../../../files.json)) — `drag`, `sortable`, and seven `sortable/*` subpaths. **None is `kernel`.** `drag.js` exports `draggable`, `Behavior`, `DOMRealm`, `Point`, `FailureStage` and the fourteen constants; that is today's entire behavior-authoring surface.

Making `draggable()` internal *while* promoting the kernel therefore **increases** committed public surface: the seam protocol, the frame model, the action tags, the settlement gates and the failure stages would all have to be specified and frozen, where today only `Behavior` is.

So §1's question — *"is there real value in keeping `draggable()` public that cannot be provided cleanly through the kernel authoring API?"* — has the sign reversed. `draggable(root, behavior)` **is** the kernel authoring API at its narrowest useful width. The biting question is the opposite: what does a wider public kernel buy that `draggable()` does not?

One further mismatch: `sortable()` does not take a root. Its signature is `sortable(items, ...features)` and the root belongs to `draggable(root, behavior)`. The proposed `sortable(root, options)` merges event ingress with the logical collection — and §6 depends on the collection remaining separately owned and separately replaceable.

---

## Where the synthesis is right

- **§3's core insight holds and is well targeted.** `destroy()` really is the only path that retires mid-stack, and deferral really would remove seven of the nine C5 findings.
- **§7 is stronger than it claims** — post-commit landing measurement is a correctness fix by the package's own probe.
- **§8's premise is factually correct, and the artifact argues the case better than §8 does**: fourteen exported stages collapse to four internal recovery classes, only one is branched on by name, and only one has a documented consumer action.
- **§2's direction is right for the thin wrappers**, even though the assembler stays — and the tree-shaking claim is understated at 89%.
- **§5 is right about `landing({ run })`'s type surface** — three of four public types on that subpath exist only for it.
- **§6's cancel-on-update is cheap to adopt** — the idle path already behaves that way, and only ~35 lines would go. The section overstates both the machinery removed and the guarantee lost.

---

## Falsifiers I would run before deciding

1. **An unadopted-mutation probe.** A `placeholder()` factory whose first `setAttribute` destroys the controller, under a prototype deferred teardown. If the writes still land, act 3 survives and C5-02's fix is permanent regardless of §3. (Predicted: they land — the disposer is never registered.)
2. **A panic-blindness probe.** Under deferred teardown, drive a `panic()` and check whether the two `presentation.signal.aborted` barriers still fire. This decides T-3, which is the strongest argument against §3 as scoped.
3. **A synchronous-unmount probe.** `destroy()` from `disconnectedCallback` with a drag in flight, asserting pointer capture released and no placeholder in the detached tree *before* the callback returns. Decides T-5.
4. **A cancel-during-commit probe.** Serial `await onReorder`, Escape pressed mid-commit, consumer DOM already showing the new order. Decides R-4 — and it is reachable today by writing an async `onReorder` without `presentation: true`, so it needs no rewrite to run.
5. **The probe's own unlanded recommendation:** move the landing measurement after the readiness point and re-run the scenario matrix. Local, independently valuable, and it produces the evidence §7 needs either way.

---

## One defect found while reviewing

Not an API question, but it surfaced here and belongs somewhere: the stretch table's `landing.ts` `retarget` row names **`retireSettlement`** as its kernel bracket ([`05:459`](../../contract/05-lifecycle-invariants.md)). There is no such symbol in `src/`; the function is **`retireAttempts`** ([`kernel.ts:395-418`](../../../src/kernel/kernel.ts#L395-L418)). A bracket-discharged row whose named bracket does not exist cannot be checked by a later reviewer, which is the one thing (b) rows are for.

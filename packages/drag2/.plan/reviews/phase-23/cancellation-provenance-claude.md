# Cancellation provenance: what the `reason` channel can and cannot carry

**Architect record, 2026-08-28.** Owner question, Phase 23: are the three kernel-minted cancellation reasons — `drag:escape`, `drag:pointercancel`, `drag:lostpointercapture` — intentionally part of the consumer-facing semantic result, or internal detail leaking through a generic channel? Decision only; no production change is made here.

This is **ledger L-11**, raised at Checkpoint D while resolving D5's `CancellationReason` row, deferred to Phase 23 by the owner's decision, and carrying a written deliverable in `plan.md` §Phase 23 that this record **declines and replaces**.

---

## 1. The question is not the one the standing plan answers

`plan.md` §Phase 23 already prescribes the fix: export the three kernel sentinels from `drag.js`, export the two sortable sentinels (`sortable:item-removed`, `sortable:collection-invalidated`) from `sortable.js`, leave `reason` typed `unknown`. That deliverable treats L-11 as **the last instance of L-2** — a name reachable from the public surface and not exported — and L-2's remedy is always the same: export it.

The owner's question is one level below that, and it is the right level. L-2 asks _is this name reachable and unexported_. It does not ask _is this channel the right place for this information_. Answering the first without asking the second is the move F-168 was filed for four days ago.

So the question here is: **can `CanceledReorderResult.reason` carry provenance at all?** If it can, exporting the sentinels is the fix and the standing plan stands. If it cannot, exporting them ships a discrimination that does not work, and the plan is wrong in a way no amount of exporting repairs.

---

## 2. What `reason` actually carries — five producers, one slot

Traced at `fb8bac0b`, not carried forward from the ledger's account.

| # | Producer | What lands in `reason` |
| --- | --- | --- |
| 1 | `controller.cancel(x)` — consumer | `x`, arbitrary |
| 2 | `controller.cancel()` — consumer | `undefined` |
| 3 | `host.cancel(x)` — behavior, [`sortable/spec.ts:1315`](../../src/sortable/spec.ts) | `'sortable:item-removed'` or `'sortable:collection-invalidated'` |
| 4 | the kernel, [`kernel.ts:834,837,845`](../../src/kernel/kernel.ts) | one of the three `drag:` strings |
| 5 | **a classified failure**, [`sortable/spec.ts:1614`](../../src/sortable/spec.ts) and [`free-drag/spec.ts:767`](../../src/free-drag/spec.ts) | `input.error` — **the caught throw** |

Producers 1–4 were known. **The fifth is the one that decides this.** There is no `failed` arm in either behavior's result union: `SETTLED_FAILED` maps to `{ type: 'canceled', reason: input.error, stage, … }`, and the mapping is deliberate and well-argued at both sites — the `??=` tie-break, the `MINTED` suppression and the `FAILURE_TERMINAL_CALLBACK` exclusion are all reasoned in place. Nothing about that mapping is wrong.

What it means for this question is: **`reason` is not a reason channel.** It is a slot that holds, indistinguishably, a value the consumer supplied, a value the behavior supplied, a value the kernel supplied, nothing at all, and **an error object thrown by code the library does not own**. A consumer writing `if (result.reason === CANCEL_ESCAPE)` is switching on a slot whose other legal occupants include arbitrary thrown values. The switch is not wrong today by accident; it is unsound by construction, and no discipline the library can adopt keeps the five apart, because keeping them apart means narrowing a channel the contract deliberately keeps open (`cancel(reason?: unknown)`).

**That is the answer to the owner's framing.** The kernel strings are not _leaking_ through a generic channel. They are being asked to do a job the channel cannot do for anyone — including the sortable's own two, which have the same defect and are merely luckier about it.

---

## 3. Provenance on a consumer-writable channel is a claim, not a fact

Second, independent reason the standing plan does not work.

`controller.cancel('drag:escape')` is, today, indistinguishable from a real Escape press. Exporting `CANCEL_ESCAPE` does not create that hazard — it exists now — but it **institutionalises** it: the library would be handing consumers the exact value whose appearance it also asks them to interpret as a fact about the platform. Provenance answers _who produced this_, and a channel every party can write cannot answer it. `stage: CancelStage` is not forgeable, and the difference is the whole reason it is a separate field.

This is D-143's argument in a different place: _a shape a consumer can read is a shape a consumer can also manufacture_. There it deleted a duck-type gate and a diagnostic. Here it says the same thing about a value.

---

## 4. Are the three kernel reasons three causes?

No. At most two, and the third is a DOM spelling.

- **`pointercancel`** and **`lostpointercapture`** are two platform events for one fact: _the pointer stream ended without a drop_. A consumer cannot act differently on them, and distinguishing them re-exports precisely the platform detail the kernel exists to absorb — the same objection that keeps `PointerEvent` off the behavior surface.
- **`Escape`** is different in kind. It is a deliberate user decision, and it is the one cancellation cause a consumer plausibly branches on: _the user changed their mind_ is not _the input was taken away_.

A structural asymmetry corroborates the split rather than being argued from taste. A **command (keyboard) operation arms no pointer input at all** — `pointerId === -1` at [`kernel.ts:942`](../../src/kernel/kernel.ts), so `armPointerInput` never runs — while `armCancelInput` runs unconditionally. Two of the three constants are therefore unreachable on the keyboard ingress and the third covers both. They are not siblings.

---

## 5. Reliability was checked, and it is not the problem

Worth stating because the obvious objection to keeping _any_ of this is that `lostpointercapture` fires on every normal drop, when the kernel releases capture itself.

It does not reach the cancel path. `armPointerInput` binds `onPointer` to `lifetimes.motion.signal` ([`kernel.ts:943`](../../src/kernel/kernel.ts)) and the capture disposer is registered on the **same** lifetime ([`kernel.ts:1212`](../../src/kernel/kernel.ts)). `Lifetime.dispose` calls `controller.abort()` **before** it runs its disposers ([`lifetimes.ts`](../../src/kernel/lifetimes.ts)), so the listener is detached and only then is capture released. The library never observes its own release.

**Provenance is accurate wherever it exists.** The defect is entirely in where it is carried.

---

## 6. What the test suite already believes

| Vocabulary | Asserted in the suite? |
| --- | --- |
| `sortable:item-removed`, `sortable:collection-invalidated` | **Yes** — [`tests/sortable/composition.browser.test.ts:456,468,594`](../../tests/sortable/composition.browser.test.ts) |
| `drag:escape`, `drag:pointercancel`, `drag:lostpointercapture` | **No** — zero occurrences in `tests/` |
| free-drag-minted reasons | **None exist** — the behavior mints no reason at all |

Not decisive, and it is evidence. The behavior-owned vocabulary is already treated as a **domain value the behavior chose to supply** and is pinned as such. The kernel-owned strings are pinned by nothing, which is what an incidental detail looks like when the suite is honest.

---

## 7. The decision — D-154

**Kernel-originated cancellation carries no `reason`. Provenance moves to a separate, closed, kernel-written field, `origin: CancelOrigin`, on the canceled arm of both behaviors. The three `drag:` strings are deleted.**

Three fields, three orthogonal questions, none of them overloaded:

| Field | Question | Written by | Shape |
| --- | --- | --- | --- |
| `origin` | **who decided, and of what kind** | the library, never the consumer | closed numeric union |
| `stage` | **when** — before or during the consumer round-trip | the library | closed numeric union (unchanged) |
| `reason` | **what the decider had to say** | whoever decided | `unknown`, open (unchanged) |

`CancelOrigin` is four values, exhaustive over the producers §2 enumerates:

| Value | Produced by | `reason` holds |
| --- | --- | --- |
| `CANCEL_SUPPLIED` | `cancel(reason?)` — consumer **or** behavior | the supplied value, possibly `undefined` |
| `CANCEL_ABORTED` | `Escape` | `undefined` |
| `CANCEL_INTERRUPTED` | `pointercancel` or `lostpointercapture` | `undefined` |
| `CANCEL_FAILED` | a classified failure decided the operation | the caught throw; `onError` has already fired |

**Why `SUPPLIED` does not split into consumer and behavior.** It cannot, and pretending otherwise would be the §3 mistake again: a behavior's controller spreads `KernelHost.cancel` through **unchanged** (07 §The controller), so the two are the same function and the kernel has no basis to tell them apart. Adding one would mean a second entry point purely to label the caller. The collapse is also the _right_ reading: `sortable:item-removed` is a domain value the sortable **chose to supply**, which is exactly what `SUPPLIED` says. The sortable's two constants therefore stay, become exported from `sortable.js` — the standing plan's second bullet, which survives intact — and are sound there for a reason the kernel's three never had: the behavior owns that vocabulary as domain, not as provenance, and publishes it beside the result type that carries it.

**`CANCEL_FAILED` is the value that pays for the field.** Today a `canceled` result whose `reason` is an `Error` is indistinguishable from one whose consumer passed an `Error` deliberately, and the contract's own note that the terminal and `onError` channels are _orthogonal_ is precisely the ambiguity. With `origin`, the consumer can say _this drag ended because something broke, and I have already been told about it_ without inspecting the payload.

**Orthogonality is load-bearing, not tidy.** Folding `origin` into `CancelStage` would make an eight-value cross product of two independent questions and destroy the exhaustiveness of both. The owner's third bullet — the separate `CancelStage` classification — is therefore untouched by this decision: `stage` keeps its meaning and its values exactly.

### Where it publishes

`CancelOrigin` and its four constants are declared in [`src/kernel/failures.ts`](../../src/kernel/failures.ts) beside `CancelStage`, and re-exported from **`kernel.js`, `sortable.js` and `free-drag.js`** — `CancelStage`'s existing route, verbatim.

**Not `drag.js`, and the standing plan's first bullet is void rather than relocated.** That bullet sited the three sentinels on `drag.js` because `drag.js` is the shared vocabulary root and the sentinels belonged to neither tier. `origin` is not in that position: it is a field of a **behavior-owned result type**, its sibling `stage` is already published on the three behavior-facing entries, and D-48's own note warns against exactly the split this would create — _a vocabulary where the consumer names the type at one entry and the values at another_. Following `CancelStage` costs nothing new and keeps one vocabulary at one set of entries.

---

## 8. What is declined, and its price

**The standing L-11 deliverable — export the five strings.** Declined on §2 and §3: it ships a discrimination that is unsound against producer 5 and forgeable against producers 1–2. It is the cheaper change and it is the one that would have to be un-shipped.

**Doing nothing.** Declined too, and this is the option D-154 must beat rather than the one it replaces. Today `canceled` means five unrelated things with no way to tell them apart, and a consumer who wants _stay silent when the user pressed Escape_ has no correct implementation available — the ledger's motivating story is not merely awkward to write, it is unwritable. That is worse than what `@ydinjs/drag` shipped, where `reason.type` was a closed union structurally readable off the exported result. L-11 records this as a parity regression and it is one.

**What D-154 costs.**

- **Public surface:** one type and four runtime cells, on three entries that already carry their sibling. The standing plan's cost was five cells on two entries plus a new vocabulary on `drag.js`; this is not obviously larger and is arguably smaller in concept count.
- **Runtime:** one field on `cancelRequest` (allocated at most once per operation), one on the `SETTLED_CANCELED` input, one on each behavior's canceled result. **Nothing on any per-sample path.** Three string literals are deleted and four small numeric constants added, so the runtime byte direction is plausibly negative; it is not measured and must not be claimed until `bench/size` says so.
- **SC-1 fires.** The frozen export map changes, which is one of M-3's six reproducibility preconditions (05 §Measurements — landed 2026-08-02), so M-3 re-measures whether or not a byte moves. SC-1's stated trigger text — _five runtime cells onto two frozen entrypoints_ — describes the declined deliverable and must be rewritten to this one when D-154 lands.
- **Contract amendments owed:** 03 §The export topology this requires; 07 §The results (the canceled row) and §The published names; the sortable's mirror in 06; and D-117's census note that five source strings are protocol identifiers rather than diagnostics, which becomes two.

---

## 9. Findings

**F-172 — the canceled arm's documented producer list names one that produces nothing.** Tier C. 07 §The results says `canceled` is produced by _"`cancel()`, `Escape`, `pointercancel`, a destroyed controller, or any classified failure"_. A destroyed controller publishes **no terminal at all** — `destroy()` sets `queue.closed` on the statement ([`kernel.ts:616`](../../src/kernel/kernel.ts)) and every guard then fails — and the suite asserts the absence twice, at [`tests/free-drag/free-drag.browser.test.ts:412`](../../tests/free-drag/free-drag.browser.test.ts) and [`tests/sortable/composition.browser.test.ts:642`](../../tests/sortable/composition.browser.test.ts). The row is a present-tense contract statement that is false, and it is corrected in this pass. Found only because D-154 required the producer set to be enumerated exhaustively rather than cited.

**F-173 — a channel acquired a fifth producer and no document recorded that it had.** Tier B. `SETTLED_FAILED → { type: 'canceled', reason: input.error }` is reasoned carefully at both behavior sites and is described in neither the ledger's L-11 entry, the Checkpoint D resolution, nor `plan.md`'s Phase 23 deliverable — each of which enumerates the `reason` producers and stops at four. The deliverable those documents prescribe is unsound **because** of the producer they omit. The general form is worth more than the instance: **an open channel's producer set is a contract fact and needs an owner**, because a decision about what a channel may carry is made against the set as enumerated, and nothing checks the enumeration. L-11 sat open for weeks against a four-producer census that was already five.

---

## 10. What would falsify this

- **`ABORTED` and `INTERRUPTED` collapse** if no consumer can be shown branching on the pair. The union becomes three, `origin` survives, and the record should say so rather than keep a value nobody uses. This is the falsifier I most expect to bite, and the demo corpus in Phase 24 is where it gets tested.
- **The whole decision falls to `SUPPLIED` alone** if the argument for `CANCEL_FAILED` is rejected — i.e. if the owner holds that `onError` already tells the consumer everything and the terminal need not. Then two values remain, and two values are a boolean, and a boolean is not worth a vocabulary; the honest outcome would be §8's _do nothing_ with the regression accepted and stated.
- **The forgeability argument fails** if a consumer passing `'drag:escape'` is judged to be lying rather than to be exercising an open channel. I do not think it is: `cancel(reason?: unknown)` is documented as accepting anything, and a library that accepts anything cannot then reserve part of the space.
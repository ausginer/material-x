# Checkpoint D review 6 — architect decision for C6-05, and the sweep's domain

Two things, because they are one thing. **C6-05 is upheld** — narrowed in its reasoning, unchanged in its remedy. And C6-05 is the second instance of the root cause [C6-04's resolution](checkpoint-d-6-resolution-c6-04.md) §6 named, so this document also decides what the sweep's domain is, which is the part with consequences past this checkpoint.

---

## Part A — C6-05

### A.1 What I verified

| Claim | Verdict |
| --- | --- |
| `invalidate(...)` reaches `realm.window.addEventListener` twice | **True.** `src/kernel/invalidation.ts:58-68` |
| It sits between the existing reading and the publications | **True.** `src/sortable/spec.ts:557-590` — reading at `:557`, `invalidate(...)` at `:566`, `rt.placeholder`/`rt.lift`/`rt.view` at `:581-590` |
| No reading exists after installation | **True** |
| `onStart` follows | **True**, `:608`, via `invalidateInSeam()` |
| `invalidateInSeam()` is itself consumer-reaching | **False.** It calls `slots.invalidateInsertion`, which is `RectIndex.invalidate` — `dirty = true` (`rect-index.ts:218-220`). No consumer call. This does not add a stretch |
| `realm.window` methods count as consumer-reachable | **True by the table's own commitment** — the `landing.ts` row already counts `realm.window.matchMedia` (`contract/05:459`). `DOMRealm` is derived from the consumer's own container (`realm.ts:23-27`) and is a **public** type (D-30) |
| "floor acts 1, 2 and 4" | **Acts 1 and 4. Not act 2** — see A.2 |

### A.2 The narrowing: the listener registration is not the defect

The review's mechanism has three steps and the middle one does not hold. If the first `addEventListener` destroys and returns normally, teardown aborts `scope.motion.signal`. The second call then receives an **already-aborted signal**, and `addEventListener` with an aborted signal is specified to do nothing. So the second listener is never installed, the first is never installed either, and **no listener leaks**. Act 2 does not occur.

What does occur is everything after `invalidate(...)` returns: `rt.placeholder`, `rt.lift` and `rt.view` are published into a runtime `retire()` has already nulled, and `slots.onStart(item)` announces the start of an operation that no longer exists. **Floor acts 1 and 4**, and act 1 in its most consequential form — the next drag finds the previous operation's placeholder, lift and per-operation view (I-20).

So the defect is not "the second call still runs". It is that **a consumer-reachable call restarted the stretch, and the publications inherited a reading that no longer heads them.**

That makes C6-05 the same species as C6-04 rather than a separate finding: in both, a stretch boundary was drawn in the wrong place because a call was not recognised as consumer-reaching. Part B is about why it was not recognised.

### A.3 A boundary this programme has not had to draw before, and now must

An objection to A.2: what if the consumer's override *ignores* `{ signal }` and registers unconditionally? Then a library closure is retained on `window` forever, and act 2 is back.

**Decision: the library depends on platform methods honouring their own specification, and does not depend on consumer accessors returning the truth.** These are different, and the difference is whether a library-side remedy exists.

- C5-03's sweep took the position (rows #6 and #10) that the library must not trust a consumer accessor's *return value* — `isConnected` may lie, `parentElement` may lie — because the library can always defend by not believing it.
- There is no corresponding defence here. If `addEventListener` does not honour `AbortSignal`, the library cannot unregister from an override that lied; `removeEventListener` on the same override is equally unavailable. A guard would buy nothing.

Registering with `{ signal }` is the correct discipline, and it discharges the registration. This rule belongs in the stretch table's rules paragraph, because it is what keeps A.2's narrowing principled rather than convenient — and because the same question will be asked of `requestAnimationFrame`, `setPointerCapture` and `showPopover`, all of which are on the paths Part B brings into the domain.

### A.4 The fix

**One reading after `invalidate(...)` returns and before `rt.placeholder = placeholder`**, in `src/sortable/spec.ts`'s `activation.effect`.

Read `scope.presentation.signal.aborted`, not `rt.closed` — the same latch the reading twenty lines above uses, for the reason C2-01 recorded when it chose it there: it is strictly stronger, catching a cancel raised from the registration as well as a destroy, and at this point in activation a cancelled operation must not publish either. The bail-out path is the one that already exists: the placeholder disposer registered earlier removes the placeholder, nothing was published, and `onStart` does not fire.

Cost: one signal read per **activation**. Nothing on the pointer-sample path.

**Rejected:** reordering so the publications precede `invalidate(...)`. The invalidation callback dispatches against the published runtime, and reordering to fix a barrier would create a window in which a scroll event reaches a half-published operation. A reading is the cheaper and more local answer.

### A.5 What the implementer owes for C6-05

**Source.** The one reading above. Nothing in `src/kernel/invalidation.ts` changes.

**Tests**, both verified to fail against a targeted revert:

1. *The regression.* Public composition, with the realm window's `addEventListener` temporarily wrapped so the first `scroll`-capture registration destroys the controller and then delegates. Assert `onStart` was never called, the placeholder is removed, and a subsequent drag on the same container sees no stale placeholder, lift or view. Restore the method in `finally`.
2. *The pin for A.2.* The same fixture, asserting that **no** scroll or resize listener survives — this is what makes the act-2 narrowing executable rather than an argument. It must be mutation-checked: it has to fail if the `{ signal }` option is dropped from either registration.

**Documents.** `contract/05`'s activation rows — the `(c)` row currently reading *`activation.effect`: reading → publications → `onStart`* has its stretch drawn wrongly and must be split at `invalidate(...)`, with the new reading heading the publications. Plus A.3's rule in the table's rules paragraph.

---

## Part B — the domain

### B.1 The diagnosis

C6-04 and C6-05 were both invisible to a sweep that declared `0 (d)`, and they were invisible for two different reasons that are really one:

- **C6-04** — the hazard is in `src/kernel/presentation.ts`. The table's domain is `ls src/sortable/*.ts`. It was out of bounds.
- **C6-05** — the hazard is at `spec.ts:566`, squarely *inside* the domain. The call is spelled `invalidate(...)`, which is a library-internal-looking call into a library module, and only bottoms out in `window.addEventListener` one frame down.

So the sweep enumerated over **text the sortable author wrote**, and judged consumer-reachability by **how a call looks at its own call site**. Both hazards are properties of *what executes*, and neither is visible at that resolution.

This is the fourth time the terminating mechanism has been found to terminate over the wrong set: consumer callbacks (C2-01), then call sites (C4-01), then modules (review 4), then stretches (C5-03). Each successive set was enumerable — which is what each pass was optimising for, and correctly, since the original I-36 clause failed precisely by not being enumerable. **None of them was closed under what the code actually calls.** That is the defect, and it has been the defect since C2-01.

### B.2 The decision: reach, not directory

**The domain is defined by reachability, and the artifact grows one level to make reachability mechanical.**

Two tables, and the first is the one that does the work:

**1. The reach table.** One row per module in `src/`, kernel and sortable alike, answering one question: *does calling into this module reach consumer code, and through which of its own calls?* It is a least-fixpoint over a finite call graph, so it terminates and it is checkable by a reviewer who disagrees with a row — the disagreement is about one edge, and that argument ends.

Its output is the rule the stretch table has been missing:

> **A call into a module whose reach is non-empty is a consumer-reaching call at its call site**, whatever it is spelled.

Under that rule `invalidate(...)`, `lift.write(...)`, `rt.frame.schedule(...)` and `realm.isElement(...)` are all consumer-reaching calls in behavior code, determined mechanically rather than by the author noticing.

**2. The stretch table**, unchanged in form — same three verdicts, same "does anything survive the stretch?" question — but with its boundaries **derived from the reach table** rather than from inspection. It covers every module with non-empty reach on a path the sortable composition executes.

**Why this is the right unit and the previous four were not.** Reach is closed under calling, which is the property every previous unit lacked; it is finite, because the call graph is; and it is *falsifiable per row* rather than per artifact. A reviewer who thinks a module was missed names an edge, not a feeling about coverage.

### B.3 Scope: what Checkpoint D does, and what it does not

**Checkpoint D lands both tables over `src/`, sortable and kernel, restricted to paths the sortable composition executes.**

The restriction matters and keeps this proportionate. Seventeen kernel modules exist; most are types, codes, or pure state machines and will have empty reach. I expect the stretch table to grow by roughly six — `presentation.ts`, `invalidation.ts`, `realm.ts`, `kernel.ts`, `pointer.ts`, and whichever of `lifetimes.ts`/`queue.ts` turns out to invoke feature-supplied disposers — not by seventeen. The reach table is the cheap mechanical part and is what makes that claim checkable instead of asserted.

**Why now rather than at Checkpoint E or Phase 21.** Checkpoint D's own stated purpose is that it is *the last cheap moment to change anything sortable-shaped that leaked into the kernel*. Deferring the first sweep of the kernel past the last cheap moment to change the kernel is exactly backwards. C6-04's defect is in kernel code, reached from behavior code, and was found by a reviewer rather than by the artifact that claimed completeness — deferring is how it stays that way.

**What Phase 18 inherits.** Its current deliverable — *enumerate every consumer callback free drag's behavior invokes and state where its terminal barrier is* — is replaced. Free drag **extends** both tables: it adds its own modules to the reach table, and it re-runs the stretch derivation for kernel modules whose reach changes because free drag executes paths the sortable composition does not. That is a smaller and better-specified obligation than the one it carries today, and it is the first time this programme's terminating argument transfers to a second behavior instead of being rebuilt.

### B.4 The consequence for the published headline

**`62 stretches / 0 (d)` is withdrawn**, and not only for the reasons C6-06 gives about `callbacks.ts`. It was a count over the wrong domain, and it is now known to have at least two `(d)` rows outside it. Nothing should re-publish a total until both tables are derived. The count that replaces it must state its domain in the same sentence as its total; that a bare number was quotable at all is part of how four passes went by.

I am not resolving C6-06 here — its module-accounting correction stands on its own and lands with the regenerated tables.

### B.5 What I would say to a seventh reviewer

The rows are now the cheap thing to check and the domain is the expensive one. If you think the artifact is still not closed, **attack the reach table's edges** — name a module whose reach I claim is empty and show a call that reaches consumer code — rather than looking for a ninth stretch. And the standing question, which I do not think this decision settles: reach is closed under calling, but it is computed over the *first-party* call graph, and a consumer-supplied object entering that graph (a custom landing runner, a placeholder custom element) can add edges the fixpoint never saw. A.3 draws one boundary there. It is unlikely to be the only one needed.

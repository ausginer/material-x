# Checkpoint D review 6 — architect decision for C6-04

**Finding upheld.** The `moved` row is a `(d)`, and the reviewer's diagnosis of the mechanism is correct in every particular I could check. The remedy is **not** the one the finding proposes, and the difference is the useful part: the hazard is not in `moved()`, it is in `VisualLiftSession.write()`, and `moved()` is the second of **three** callers that inherit it. One of the other two was already patched at the wrong level.

**ID collision, flagged now rather than later.** This is Checkpoint **D** review 6. `docs/revision/phase-14.ts:150` cites a *C6-01* that is Checkpoint **C**'s follow-up round, and §4 below overrides part of it. Same hazard the plan already flags for C3-01. Every ID in this document is Checkpoint D's unless it says otherwise.

---

## 1 — What I verified

| Claim | Verdict |
| --- | --- |
| `write()` is `visual.style.transform = compose(x, y)` — accessor read, then assignment | **True.** `src/kernel/presentation.ts:311-313` |
| `style` is an accessor a consumer-owned element may define | **True**, and it is the table's own stated rule (`contract/05:398`) |
| Teardown's inline-style restore is **one-shot and latched** | **True.** `captureInlineStyles`, `presentation.ts:140-146` — `restored` is set on first call and every later call returns immediately |
| `transform` is among the restored properties | **True.** `LIFTED_PROPS`, `presentation.ts:86` |
| `moved()` holds no liveness reading | **True.** `src/sortable/spec.ts:616-633` |
| The same accessor is guarded at the release render | **Half true.** `spec.ts:1054-1056` guards the *publication* of `rt.pendingRequest`. It does not guard the write. The row that claims it (`contract/05:411`) is therefore also overstated |
| The rescheduled frame publishes nothing | **True.** `runtime.ts:165-175` returns on `runtime.view === null` before `pendingSpatial` and before `dispatch` |
| The table's named `retireSettlement` bracket has no source symbol | **True**, but that is C6-01's row, not this one |

**The consequence, stated exactly.** A destroy raised from the `style` accessor during a pointer sample runs the full teardown — including the one-shot restore that removes `transform` — and then control returns into the middle of the assignment statement and writes a `translate(…)` back onto the consumer's element. The restore is latched and will never run again. The element is left in flow, unlifted, permanently displaced by the last delta. This is I-36 floor act 3 with a *visible* symptom, which makes it the most consequential `(d)` found in six passes.

---

## 2 — Why the fix goes in the kernel session, not in `moved()`

The reviewer's remedy — "an all-or-nothing/undo mechanism around the write itself and a closed check before scheduling" — is right about the first half and reaches for it from the wrong side. A behavior-side reading cannot work, and the reviewer says so: by the time `moved()` regains control the transform is already written and the undo has already been consumed. Any behavior-side remedy would have to *re-run* the restore, which means duplicating `captureInlineStyles`'s saved map outside the module that owns it.

`write()` has **three** callers:

| Caller | Site | Status today |
| --- | --- | --- |
| `moved` — the hot path | `sortable/spec.ts:617` | unguarded — C6-04 |
| `release.effect` — the release render | `sortable/spec.ts:1022` | write unguarded; the *following publication* guarded |
| the kernel's own authoritative pin at the join (D-16, I-24) | `kernel/kernel.ts:1430` | unguarded, and **not named by any review** |

Three callers, one hazard, one of them the kernel's own. Patching callers is how this checkpoint spent passes 2, 3 and 4; C4-01 already established the rule that *every participant that touches consumer DOM is handed the guarantee rather than having its caller patched*. Here the participant is the session.

**Decision.** `makeSession` latches on its own disposal, and `write` becomes ordered as *read the accessor, test the latch, then assign*:

```
write(x, y) {
  const { style } = visual;   // the consumer-reachable accessor
  if (disposed) { return; }   // the restore has run and will never run again
  style.transform = compose(x, y);
}
```

`disposed` is set at the head of the session's `dispose`, ahead of the existing restore, at both construction branches — which is why it belongs in `makeSession` and not at either call site. The property this buys is stronger than a liveness reading and is stated without reference to the controller at all:

> **`write` never writes a transform after the restore that would have undone it.**

That is an ordering invariant internal to one module, over two functions that already share a closure. It does not consult `rt.closed`, it does not consult the queue, and it needs no reading to be threaded anywhere.

**Rejected alternatives.**

- *A reading in `moved()`.* Detects, cannot undo. Also fixes one of three callers.
- *`write(x, y): boolean` — a return channel, as C3-01 chose for `RectIndex.refresh`.* Genuinely tempting, and it would additionally let `moved()` skip the scheduling residue in §3. Rejected: it changes a signature restated in the frozen SPI (`BehaviorSpec.moved`'s parameter type, `kernel/spec.ts:380`; `docs/revision/phase-14.ts:113-120`) to buy the removal of a residue §3 finds is not an act. The latch closes the act at zero SPI cost; the channel closes the act plus a non-act at SPI cost. C3-01's precedent argued from *hot-path cost*, and here both options cost the same test.
- *Re-running the restore from `moved()`.* Duplicates the module's saved state outside it.

**The frozen SPI does not reopen, and this is the same test C2-01 passed.** Contract 00's bar is two conjuncts: a failing executable lifecycle case, **and** one the frozen SPI cannot express. The first is satisfied once the implementer lands the regression §5 requires. The second is not: `write(x, y): void` keeps its signature, `VisualLiftSession` keeps its shape, `BehaviorLiftSession`'s positive selection is untouched, and the fixture stays green without a type edit. The change is entirely inside a function body plus one closure variable.

---

## 3 — The scheduling half is `(c)`, not `(b)`, and needs no guard

The row's stated undo — "the frame task's own `runtime.view === null` revalidation" — **is not an undo**. It is a decline. `(b)` requires a bracket that "revalidates after the stretch *and undoes what the stretch did*", and declining to dispatch does not cancel the animation frame that `moved()` registered after `retire()` ran `rt.frame.cancel()`. This is the same conflation C5-03 already corrected once, in the floor's antecedent; it survived in this row.

Classified correctly it is **`(c)`**, and the survives-the-stretch answer has to be written out rather than asserted as "none":

- `rt.spatialSeq += 1` — a scalar on a record that outlives every operation by design. No referent, pins nothing.
- `rt.frame.schedule(seq)` — registers **one** animation frame. When it fires, the producer's first statement is the `view === null` test, so nothing is published to `pendingSpatial`, nothing is dispatched, and no consumer code is reached. The closure is over `runtime`, which `runtime.frame` already holds, so no retention edge exists that teardown was going to break.

What survives is **one animation-frame registration that expires unconditionally at the next frame having done nothing.** That is a residue. It is not floor act 1 (publishes nothing), not act 2 (retains nothing teardown would have released), not act 3 (mutates no DOM), not act 4 (calls no consumer callback), not act 5 (dereferences nothing).

**Decision: no guard is added on the pointer-sample path.** `moved` is the package's only per-sample callback, and the barrier programme's measured per-frame cost is currently zero across every composition. That property is worth re-buying for an act and not for a residue. The row becomes `(c)` with the residue stated as above and an executable pin.

**Falsifier, recorded so the next reviewer can attack it cheaply:** if any future producer body does work before the `view === null` test, or if `view` can be non-null after `retire()`, the residue becomes an act and `moved()` must take a guard — at which point the `write(): boolean` channel rejected in §2 becomes the cheapest form, because the test is already computed.

---

## 4 — The Phase 14 fixture's contrary sentence, and how much of it survives

`docs/revision/phase-14.ts:145-153` decided, at Checkpoint C's follow-up round, that

> **`write` is retained and stays effective.** … calling it after that fights the landing runner, and calling it after `retire()` writes onto an element no live operation owns. Neither is refused, deliberately — a phase guard would put a branch on the hot path and turn a violation into a silent no-op.

That sentence covers **two** limbs under one rationale, and only one limb survives.

- **The post-`from`-sample limb stands, unchanged.** A behavior that calls `write` after `LandingContext.from` is sampled, while the session is still alive, still writes and still fights the runner. It is refused by nothing. The I-34 tier-C residue is intact and the "silent no-op" objection keeps its force there, because that *is* a first-party misuse and masking it would hide a library author's bug.
- **The post-`retire()` limb does not.** It was written at Checkpoint C, before I-36 existed, and I-36 now forbids precisely the act it licensed. It is also not the case the objection describes: `moved()` calls `write` exactly when licensed, and the destruction is raised by consumer code the library itself invoked mid-statement. Nothing is being masked — the library is conforming and the ground moved under it.

**This is a latch on session disposal, not a phase guard.** The distinction is what keeps the surviving limb coherent: the session cannot know whether `from` has been sampled and does not ask; it knows only whether its own restore has run. So the guarded window opens exactly where the restore closes, which is exactly the window I-36 governs, and not one statement earlier.

**It does not trip L-12's falsifier.** Ledger L-12 states that a **third** copy of the behavior-owned terminal latch is the trigger for making the latch kernel-supplied. This is not a copy of that latch. It has a different referent (one session's restore, not the controller's closure), a different owner (the module that owns the thing being restored), and a different lifetime (per operation, not per controller). Counting it toward that falsifier would be a category error, and I expect a seventh reviewer to try, so it is written here.

---

## 5 — What the implementer owes

**Source.**

1. `src/kernel/presentation.ts` — latch `disposed` in `makeSession`, set it at the head of the session's `dispose` ahead of the existing restore, at **both** construction branches, and reorder `write` to *accessor read → latch test → assign*. Nothing else in the module changes.
2. No change to `src/sortable/spec.ts`. In particular **do not remove** `release.effect`'s existing `rt.closed` reading at `spec.ts:1054`: it observes the behavior's latch where the new one observes the session's, they are different facts, and no landed reading has been removed in this checkpoint.

**Tests — three, each verified to fail against a targeted revert of this fix, not against a whole-file stash.**

1. *The hot path.* Public composition, a `visual()` resolver returning an element whose `style` accessor destroys the controller on a nominated read. Assert the visual's surviving inline `transform` is `''` and the other lifted properties are restored. Expected pre-fix: a surviving `translate(…)`.
2. *The kernel's own pin.* The same accessor, driven so destruction is raised from the join pin at `kernel.ts:1430`. This is the site no review named, and it is what proves the fix is at the right level rather than at `moved()`'s.
3. *The `(c)` pin for §3.* Same fixture as (1): assert no `TAG_SPATIAL` action is dispatched and `pendingSpatial` is unchanged after the frame fires. Must be mutation-checked — a pin that passes with the producer's `view === null` test removed is vacuous.

**Documents.**

4. `contract/05` — replace the `moved` row with the `(c)` row of §3, add the `write` row under whatever §6 decides about domain, and correct the `release.effect` row, which claims a reading that guards the publication and not the write.
5. `docs/revision/phase-14.ts` — the comment only, splitting the two limbs per §4. **No type edit**; the fixture must stay green untouched, and if it does not, this decision is wrong and should come back to me.
6. `plan.md` Checkpoint D bullets, and `ledger.md` L-12 with §4's non-trip paragraph.

**Measure.** One destructure and one boolean test per pointer sample, on a line that already forces a style write. I expect this to be unmeasurable and the byte cost to be single digits, but the per-frame claim in the Checkpoint D record currently reads *zero* and this pass changes it to *one test*. Re-state it honestly rather than rounding it back to zero. Phase 21's re-base rule applies if it does not fit: the budget re-bases and the fix lands.

---

## 6 — The finding behind the finding, and where it belongs

C6-04 was invisible to the sweep for a structural reason, and it is worth more than the fix.

**The stretch table declares itself "complete against `ls src/sortable/*.ts`".** The hazard is in `src/kernel/presentation.ts`. The behavior reaches consumer code *through kernel-owned objects it is handed* — `lift`, `host`, `scope`, `realm` — and every one of those is outside the swept domain while being invoked from inside it. The table's completeness claim is therefore true of its domain and its domain is not the one the claim implies.

This is not a lone instance: the reviewer's **C6-05** is the same species, reaching consumer-reachable platform methods through `realm.window` in the invalidator. Two instances from one root, found by a reviewer rather than by the sweep, in the pass immediately after the sweep declared `0 (d)`.

**Decision on scope.** C6-04's fix does not wait on this. But the table's opening paragraph must **state its domain honestly** rather than claim unqualified completeness, and the companion enumeration — kernel-owned objects the sortable behavior calls through, which is a small closed set, not an open quantifier — is Checkpoint D's obligation by C5-03 §7's own argument: a checkpoint cannot honestly close over an artifact nobody has swept, and half of this artifact has not been. I will scope that enumeration when I resolve C6-05, which is its second instance and should be decided together with its root cause rather than as another site patch.

**What I would say to a seventh reviewer.** Four consecutive passes have each found the previous pass's terminating mechanism to be terminating over the wrong set — callbacks, then call sites, then modules, then stretches, and now a directory. The honest reading is that the *domain* has been the recurring defect and the mechanism has not. Attack the domain paragraph, not the rows.

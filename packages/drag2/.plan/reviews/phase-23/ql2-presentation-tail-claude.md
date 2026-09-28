# Q-L2 settled: presentation ownership may outlive the operation, but a lease may not

**Architect decision, 2026-08-29. Phase 23 — D-155.** Contract only; no implementation. Settles the question [`landing-ownership-boundary-claude.md`](landing-ownership-boundary-claude.md) §10 named, and unblocks Q-L1 by changing what it measures.

> **Q-L2 — should presentation ownership be allowed to outlive semantic operation ownership, or is keeping the operation alive the necessary mechanism for retaining exclusive control of the lifted visual?**

---

## 1. The question is two questions, and they have different answers

The binary as posed hides a distinction that decides everything:

- **An exclusive lease on consumer-owned state** — the element is `position: fixed` in the top layer with its inline styles held under a lease, and a library-owned placeholder sits in the consumer's list. This is a _claim_ on the consumer's DOM, and only the library can end it.
- **An interpolation** — a bounded, self-reverting visual effect that claims nothing.

**Keeping the operation alive is the necessary mechanism for the first. It is not necessary for the second.**

> **The library may not hold an exclusive lease on consumer-owned state after telling the consumer the operation is over.** That is what the gate protects, it is a real contract, and it is why the gate cannot simply be deleted.
>
> **An interpolation holds no lease, so it needs no operation.**

Both halves of the owner's binary are right about different objects. The decision below is the line between them.

---

## 2. Two candidate tails, and only one is sound

### T1 — the deferred lease. **Rejected.**

Keep the lift acquired past the terminal: element still `fixed` and in the top layer, style lease still held, placeholder still in the consumer's list, released when the animation ends.

**T1 is strictly worse than the gate it would replace.** It fires the terminal while the library still holds the consumer's DOM in a foreign state, so `onEnd` runs with a library-owned placeholder in the consumer's list and the consumer's element out of flow. A framework that re-renders its list from `onEnd` — the ordinary reason `onEnd` exists — reconciles against a tree containing an element it did not author. The gate exists to prevent exactly this, and T1 keeps every hazard while removing the protection. **This is the shape any "just don't wait for it" proposal degenerates into, and it is why the answer to Q-L2 is not simply "yes".**

### T2 — the relinquished tail. **Accepted.**

Release presentation **completely** at the pin — inline styles restored, top layer exited, placeholder removed — and only then interpolate, as a **WAAPI animation effect on the element in flow**, from an inverse transform to identity.

**T2 is sound because it owns nothing that needs releasing.** An animation with no fill:

- writes nothing to `style`, so it is invisible to a consumer reading or setting inline styles;
- reverts by itself at its natural end, so there is no cleanup obligation to place anywhere;
- is cancellable to a settled state in one call;
- dies with the element, so removal and replacement need no handling at all.

The tail therefore holds **no lease** — only a cancel handle. That is the whole of the argument, and everything in §3 follows from it.

---

## 3. The eight cases

| # | Case | Under D-155 | Against today |
| --- | --- | --- | --- |
| 1 | Another drag immediately after semantic completion | **Permitted.** Retirement runs in the terminal's own drain; admission is open on the next event | **Better.** Today the controller is inert for the animation's length |
| 2 | Another drag on the **same** element with a tail alive | **Cancel the tail at `acquireLift`, before the origin measurement.** Not because measuring mid-flight is wrong — it is right, the drag should start where the element _looks_ — but because a running animation outranks inline styles in the cascade, so the new lift's writes would not render | one new obligation, at one site |
| 3 | Consumer mutates, removes or reparents the element after the terminal | **No obligation.** Removal ends the animation, reparenting continues it harmlessly, replacement discards it with the node | **Better.** Today a removal mid-landing leaves the library holding a lease on a detached node — the case I-7 exists for |
| 4 | `destroy()` while a tail is alive | **Cancel it**; the element settles instantly. I-6's shape, and I-36 already names an animation as a thing with _no consequence left to stop_ | **Simpler.** I-7's deferred-teardown rule loses its subject: no lift, no placeholder, only a cancel |
| 5 | Who owns the top-layer / inline-style lease | **The presentation lifetime, disposed at the pin, before the terminal. The tail never holds it** | unchanged, and it is why T2 works |
| 6 | May the tail write `transform` after the terminal? | **As an animation effect, yes. As an inline style write, never.** See §4 | a contract statement is owed |
| 7 | Interruption / replacement | **One tail per controller, in one slot, cancelled at the next admission** | see §5 |
| 8 | Terminal before or after presentation cleanup | **After. Unchanged** | **This is the invariant that decides T1 against T2**, and it survives untouched |

---

## 4. The one contract statement this owes the consumer

Case 6 is the honest cost and it must be written down rather than discovered.

A WAAPI animation outranks inline styles, so for the tail's duration the library overrides a consumer's own `transform` write on that element — **after** having told the consumer the operation is over. Today the same override happens, but inside a window where the consumer has not been told. So D-155 owes a statement:

> **The terminal means the semantic transaction is complete and the DOM is the consumer's again. It does not mean every pixel has stopped moving.** For a bounded interval afterwards the library may still be interpolating the dropped element's transform. The interpolation claims no inline style, ends by itself, and is abandoned the moment the consumer removes or replaces the element or starts another drag.

That is a statement a consumer can act on, and it is narrower than what the gate implicitly promises today.

---

## 5. One tail, not a set

Two tails can coexist in principle — drop A, drag and drop B, and A may still be gliding. Per-element ownership would preserve both.

**Declined.** One controller-scoped slot, cancelled at the next admission. A per-element map costs a `Map`, a keyed lifecycle and a removal path, to preserve an animation on an item the user demonstrably stopped caring about — they are already interacting with something else. `CODE_OF_SIZE.md` §Priorities decides where both are correct, and both are.

**Controller-scoped state that outlives the operation is not new here.** `disarmClick` is exactly that, and its own comment says why: _controller-scoped, not operation-scoped, and that is the load-bearing part — the `click` arrives after the operation ends._ The tail is the second member of a category that already exists.

---

## 6. What improves that is not size

Three consequences that are correctness or lifecycle, found while working the cases:

**6.1 A cosmetic fault can no longer touch a semantic result.** `FAILURE_LANDING_INTERRUPTED` exists because a gate can fail, and a settlement failure participates in the behavior's `SETTLED_FAILED → canceled` mapping. Under D-155 an interrupted interpolation **is not a failure** — there is nothing to release and nothing to classify. `FAILURE_LANDING_INTERRUPTED` and `FAILURE_LANDING_CREATE` both lose their producers.

**6.2 The pin and the animation cannot disagree, by construction rather than by discipline.** Today they agree because `anchorTarget` is measured once and handed to both, and the comment in `joinSettlement` has to say so. Under D-155 the pin happens _first_ and the tail is defined as the inverse of the delta the pin actually applied. There is no second value to keep in step.

**6.3 `destroy()` settles sooner.** Its promise waits on physical teardown, which today waits on the landing.

---

## 7. Sortable and free drag do **not** get the same answer, and the difference is not the mechanism

The ownership argument in §2 is behavior-independent — a tail holds no lease whoever created it — so **the mechanism generalizes.** The _value_ does not, and free drag's case is worse than expected.

`free-drag`'s `anchorTarget` on the **accepted** arm returns the visual's current position — _"the accepted arm answers from arithmetic the frame already holds… It is the visual's current position."_ So `fromX/fromY` equals `targetX/targetY`, and the landing interpolates **zero distance**. There is no zero-distance short circuit anywhere: `DEFAULT_DURATION` is a flat `200`, and a distance-derived duration is opt-in.

> **An accepted free drag holds the entire controller inert for 200 ms to animate nothing.** (F-187)

So free drag's landing is a **return-to-home** animation: real work on the rejected and cancelled paths, dead weight on the accepted one. D-155 removes the dead weight as a side effect — with no gate there is nothing to hold, and a zero-delta tail is not started at all.

**What is left open for free drag, deliberately.** Its accepted path restores inline styles like every other, so `accept()` — _keep it where it landed_ — depends on the consumer having committed the position, exactly as sortable's `onReorder` does. That is a separate contract question, it is **not** settled here, and D-155 must not be read as having answered it.

---

## 8. What `landing()` becomes

**It stays a first-class optional feature and stops being a lifecycle participant.** Three parts move in three directions:

| Part | Where it goes |
| --- | --- |
| duration (fixed or distance-derived), easing, reduced-motion collapse | **stays `landing()`** — this is interpolation _policy_, which is what the feature was always for |
| the inverse-transform computation and the cancel handle | **moves to the shared/kernel tier** — identical for every runner, and case 2 makes the cancel a correctness obligation rather than a runner's choice |
| `done`/`fail`, `LandingHandle`, `LandingStart`, `LandingContext`, `SettlementScope.holdForLanding` | **deleted** — there is no gate to release and no failure to classify |

**Could CSS replace it? Partly, and the reason to prefer WAAPI is ownership, not rendering.** A CSS-transition model (T3) would have the library publish the inverse delta as custom properties plus a state, and let a stylesheet own duration and easing. That is genuinely more authorable — but it leaves **residue on the element that something must remove**, which is precisely the obligation T2 avoids by having none. **T3 reintroduces the cleanup problem in exchange for authorability**, so it is declined here and recorded as a live option if authorable timing is later wanted badly enough to pay for a cleanup owner. This is the answer to _CSS vs WAAPI is secondary_: it is secondary, and the ownership argument still picks WAAPI.

---

## 9. Size, after the semantics

Per `CODE_OF_SIZE.md` §0 — _a byte figure cannot answer a runtime question_ — and this is a lifecycle question, so the ground above is lifecycle and what follows is consequence.

**Removed**: `holdForLanding` and `SettlementScope`; six of `SettlementAttempt`'s eleven fields and all `holds` accounting; `armSettlement`'s runner branch; `completeLanding`; `handleLandingSettled` and the `LANDING_SETTLED` action; `rollbackLandingHold`; two `FAILURE_*` stages; and the `LandingHandle`/`LandingStart`/`LandingContext` SPI, which is declaration surface as well as runtime.

**Added**: one controller-scoped slot, one cancel call at admission, an inverse-delta computation over two endpoints the library already holds, and a small runner.

**The direction is plausibly negative and it is not the ground.** If it turned out net-positive, D-155 would still stand on §2, §3 and §6 — which is the test `CODE_OF_SIZE.md` §0 asks of any decision that also happens to save bytes.

---

## 10. What must be accepted for this to be right

One visible change, stated plainly because it is the price and not a detail:

**The tail animates in flow rather than in the top layer.** It can be occluded by siblings and it scrolls with the list, where today it floats above everything and is viewport-fixed. **This is the direct cost of not holding a lease** — staying in the top layer means holding the popover, which is T1. For an item landing into its own slot the in-flow behaviour is arguably the more correct one, but it is a product judgement and D-155 is contingent on accepting it. **If it is rejected, the gate is right and the recorded reason should become "the top layer is a lease and a lease needs an operation"** — which is a better reason than the one recorded today, and reaching it would still be a gain.

---

## 11. The measurement this now implies

Q-L1's contract is **repurposed rather than resumed**. Its arm A — remove the hold capability entirely — is the **floor of D-155**, not a hypothetical ceiling, and it should be measured as such, with the tail's add-back priced separately so the net is a real number rather than a subtraction:

- **A′** — arm A as written, giving D-155's removal floor.
- **A″** — A′ plus the tail: one controller slot, the admission cancel, the inverse-delta runner. The difference `A″ − A′` is what D-155 _costs_, and `baseline − A″` is what it saves.
- Controls, thresholds and the untouchable set in [`ql1-landing-hold.md`](../measurements/ql1-landing-hold.md) §3–§4 carry over unchanged, **except** that `armSettlement`'s anchor half and `joinSettlement`'s pin are now untouchable for a stated architectural reason rather than a measurement one.

Arms B and C are withdrawn: B conditionalized a thing that no longer exists, and C degeneralized a counter that goes with it.

**This measurement is not a gate on D-155.** The contract is settled on §2 and §3; the numbers inform implementation sequencing.

---

## 12. Findings

**F-187 — an accepted free drag holds the controller inert for 200 ms to animate zero distance.** Tier B, open. `free-drag`'s `anchorTarget` returns the visual's current position on the accepted arm, so `from === target`; `DEFAULT_DURATION` is a flat 200 ms and no site short-circuits a zero delta. Dissolved by D-155 as a side effect, and recorded separately because **it is a defect today and would remain one under any decision that kept the gate**.

**F-188 — the sound form of a capability was reachable only by naming the unsound one first.** Tier C, open. T1 — defer the lease — is what "stop waiting for the animation" means on first reading, and it is strictly worse than the gate. T2 is sound for a reason that is invisible until T1 is written down: **the difference is not _when_ presentation is released but _whether the thing that outlives the operation holds a claim at all_.** Recorded because the same shape governs any future proposal to let library state outlive an operation, and the check is _what would this hold after the terminal?_ rather than _how long would this last?_
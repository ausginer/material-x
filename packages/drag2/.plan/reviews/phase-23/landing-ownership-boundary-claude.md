# Does landing belong to settlement? The ownership boundary, reassessed

**Architect analysis, 2026-08-29. Phase 23.** Owner question, raised from the two trace recordings and asked _before_ Q-L1's counterfactual: should landing animation be part of settlement semantics at all? Analysis only — nothing is decided, nothing is implemented, and **Q-L1 stays parked** because §7 changes what it would be optimizing.

The premise offered: the minimal composition reaches a correct synchronous terminal without either visual feature, so the features look like polish. The instruction: challenge that freely, and **if the hold is necessary for a contract beyond visual polish, identify that contract precisely.**

I went looking for that contract. **It exists, it is not polish, and the gate is not what satisfies it.**

---

## 1. What the hold actually is

Established from source and confirmed in both traces.

The lift is not a decoration on an element in flow. `acquireLift` puts the visual into a **foreign rendering context**: `position: fixed`, `inset: auto`, explicit width/height, UA properties neutralized, inline styles captured under a lease, and — for both lifted modes — `acquireTopLayer(visual)` via `showPopover()`. The consumer's element leaves the document flow entirely, and a **placeholder occupies its flow slot** so the list does not collapse.

So there is a real obligation, and it is the library's own doing:

> **The library removed the consumer's element from flow. It must put it back without a visible discontinuity.**

That is not polish. A jump at drop is a defect the library manufactured by lifting.

`joinSettlement` discharges it in a fixed order: destroy the runner → **pin** (`session.write(targetX, targetY)`) → `presentation.dispose()` in a `finally` → terminal callback → `RETIRE`.

---

## 2. The decisive fact: the pin runs in `minimal`, with no landing composed

`armSettlement` measures `anchorTarget` **before** the landing branch and unconditionally; `joinSettlement` writes that target to the lift session **whether or not a runner was installed**; only then is presentation released.

Both traces confirm it. In `sortable-minimal.json` — no `landing()` anywhere in the graph:

```
joinSettlement [kernel.ts:1645]
└ runLeaf → runPhase
  └ (anon) [kernel.ts:1706]        ← the pin
    └ write [presentation.ts:376]  ← session.write(targetX, targetY)
```

**So the continuity contract of §1 is already satisfied, synchronously, in the composition that has no landing feature at all.** The visual is written to exactly where flow will put it, and the swap from `fixed` back to authored styles is then visually inert.

That is the whole finding, and everything below follows from it:

> **The pin removes the discontinuity. The landing only makes the pin take 200 ms instead of 0. The gate exists to grant an interpolation a lifetime — not to satisfy a contract.**

---

## 3. Every candidate contract, tested

| # | Candidate contract the hold might carry | Does it need the gate? |
| --- | --- | --- |
| C1 | The visual returns to flow with no discontinuity | **No.** §2 — the pin does it, and does it in `minimal` |
| C2 | Exactly one terminal, ordered presentation-release-then-terminal | **No.** Holds in `minimal`, in the same drain |
| C3 | The placeholder occupies the flow slot while the visual is out of flow | **No.** That is the _presentation lifetime_, disposed with it |
| C4 | A landing failure is classified (`FAILURE_LANDING_INTERRUPTED`) | **Circular.** The failure class exists because a runner exists |
| C5 | I-7 — during a long landing, lift and placeholder stay owned and `destroy()` cleans them at the transaction boundary | **Circular.** A guarantee _about_ the window, which exists because the window does |

**No candidate survives.** C1 and C3 are real obligations and both are discharged by the **pin** and the **presentation lifetime** respectively — neither of which is the gate. C2 is gate-independent. C4 and C5 are self-referential: they are the cost of having a gate, described as its justification.

**The contract beyond polish is real and it is `presentation lifetime`, not `settlement gate`.** Those have been the same object since D-7, and §7 is why they need not be.

---

## 4. What the gate costs, stated as facts rather than as objections

**4.1 The whole controller is inert for the landing's duration.** `openIngress` refuses while `current.operation` is non-null, and the operation is cleared only by `RETIRE`, which `joinSettlement` dispatches after the animation completes. Measured: `closeOperation` at 1495.0 ms, `retireOperation` at 1701.6 ms — **206 ms in which no new drag can be admitted**. In `minimal` the same span is **2.1 ms**.

A user who drops an item and immediately grabs another is refused for the length of a cosmetic animation. **I could find no document that states this as a guarantee**, and no contract row claims it. It is a consequence of the gate, not a purpose of it.

**4.2 The gate is a two-holder generalization with a population of one.** D-41 deleted the readiness gate in full. Contract 02 §The settlement gate says so directly — _this section said "both gates" until Revision 2; there is one_ — and the code agrees: `attempt.holds` is a counter with **exactly one increment site**, `holdForLanding`, and `advanceSettlement`'s `failed` test is documented as _redundant with the hold accounting as things stand_.

**4.3 The design already knows the gate is landing-shaped.** The same section preserves the property as _no fake asynchronous work when landing is absent_ and notes that with no `landing()` installed _the behavior holds nothing and finalizes in the same drain_. The asynchrony is not settlement's; it is one optional feature's, borrowing settlement's lifetime.

**4.4 The hold is already conditional on semantic state, not only on composition.** `settlement.effect` requests it only when `slots.startLanding && current.recovery !== RECOVERY_IMMEDIATE` — so a failure-driven recovery skips the gate even with `landing()` composed, and the terminal is synchronous again. The gate is therefore not load-bearing for _any_ lifecycle guarantee; the lifecycle already runs both ways.

---

## 5. `landing()`, split three ways

| Part | Owner | Why |
| --- | --- | --- |
| The **anchor measurement** — where the item's final flow position is | **Library, semantic-adjacent.** Non-negotiable | It is a measurement of the consumer's committed DOM at the one instant it is final. Nothing else can take it, and `minimal` needs it |
| The **pin** — writing that target to the lift before release | **Library.** Non-negotiable | It is what discharges §1. Already unconditional |
| The **presentation lifetime** — lift, top layer, style lease, placeholder | **Library** | The library acquired these; only it can release them, exactly once |
| The **interpolation** — duration, easing, curve, reduced-motion collapse | **Policy. A candidate to delegate** | Nothing downstream reads the intermediate geometry — see §6 |
| The **gate** — deferring the operation's terminal and retirement until the interpolation finishes | **Neither.** This is the boundary under question | §3 finds no contract requiring it; §4 finds costs following from it |

**The clean cut is between the fourth row and the fifth.** A design that keeps the first three, delegates the fourth, and deletes the fifth loses nothing this document could identify.

---

## 6. `layoutAnimation()` splits differently — and the difference inverts the picture

`layoutAnimation` has **no gate at all.** It is `beforeInsertionMove` → the behavior's DOM write → `afterInsertionMove`, synchronously inside one seam effect, and it holds no lifetime. **The package already contains a cosmetic animation feature that owns no lifecycle.**

Its geometry, however, is _less_ delegable than landing's, not more:

- **The measure/mutate/measure bracket cannot be CSS.** Once the DOM has changed there is no "before" for CSS to interpolate from. FLIP's first read is irreducibly imperative and irreducibly the library's.
- **The cancel-and-replay discipline is a correctness requirement, not a visual one.** `beforeInsertionMove` cancels every running animation before the bracket, and its own comment says why: _everything downstream of this line — the axis rebuild, and this feature's own second measurement — has to see settled presentation geometry, and one element still carrying an offset is enough to corrupt both._ The library **reads the geometry these animations perturb**. If interpolation were handed to CSS, the library would still need to force every in-flight transition to a settled state before measuring — which is most of what it does today.
- The affected-set walk (`compareDocumentPosition`, membership by snapshot version, excluding the dragged item and placeholder) is ownership bookkeeping over the consumer's tree. Library's.

**Only the interpolation is policy**, and even that is constrained: the animation must be _cancellable to a settled value on demand_, which is a stronger requirement than a CSS transition offers ergonomically.

### The inversion

> **The feature whose animation the library genuinely must control — because it reads the geometry that animation perturbs — owns no lifecycle. The feature whose animation perturbs nothing the library ever reads again owns the operation's lifecycle.**

`layoutAnimation`'s animations run _during_ the drag, between geometry reads the axis index depends on. `landing`'s animation runs _after_ the last thing the library will ever measure: the anchor is already taken, the transaction is decided, the consumer's DOM is committed. Nothing downstream reads the intermediate positions of the landing at all.

**So the two features must not get the same answer, and the asymmetry runs opposite to the one the current design encodes.**

---

## 7. What a separated design would owe — the honest costs

Not a proposal. If the boundary moved, these are the obligations that move with it, and two of them are substantial.

**7.1 Someone must own a transform on an element after the operation ends.** The natural shape is FLIP applied to the dragged item — release presentation, then write an inverse transform and interpolate it to identity. But the style lease was just restored, so the library would be writing residue onto an element it no longer owns. **This is the strongest objection to any separation**, and it is why "no gate" cannot mean "no lifetime": it means **a presentation lifetime that outlives the operation**, rather than an operation that outlives its own semantics. Those are different objects, and only the second blocks the next drag.

**7.2 The next operation must be able to interrupt a landing in flight.** If a user re-grabs an item still gliding home, admission must cancel the residual animation and settle its transform before `acquireLift` measures — otherwise the lift is taken from a transformed position. **The package already implements exactly this discipline**, in `layoutAnimation`'s `running` map and generation counter. It is a known pattern here, not new machinery.

**7.3 Stacking context changes.** Today the landing animates in the top layer, above everything. Released first, it would animate inside the list's own stacking context and could be occluded. A real visible difference, and it may be the better behaviour — the item is landing into its own slot — but it is a change, not a refactor.

**7.4 Scroll behaviour changes**, from viewport-fixed to in-flow, for the same reason.

**7.5 Free drag needs its own answer and does not inherit this one.** Free drag has no placeholder and no flow slot; its accepted drop is carried by behavior-maintained `offsetX`/`offsetY` rather than by a consumer DOM commit. Whether its landing bridges to a flow position at all is a separate question, and **nothing in this note should be read as settled for `free-drag`.**

---

## 8. What this means for Q-L1

Q-L1 asks whether the landing-hold should be a kernel capability the behavior installs. That question takes the hold's _existence_ as its premise and asks where it should live.

**§3 asks whether it should exist**, and finds no contract requiring it. This is D-153's shape exactly — a settled-looking neighbour taken as having answered the prior question — and it is the third instance of the pattern F-168 named.

**Q-L1 must stay parked**, and the measurement contract is not wasted:

- Its **arm A** — remove the hold capability entirely — is a _closer_ counterfactual to this question than to the one it was written for. Its ceiling is what a separated design would recover.
- Its **arm C** (degeneralize in place) is now less interesting: §4.2 explains the generality, and if the gate goes, the generality goes with it.
- Its **arm B** — a conditional hold — may be optimizing a thing that should not exist. **Building B before this is settled is the waste the parking avoids.**

---

## 9. Findings

**F-184 — a lifecycle gate is justified by guarantees that exist only because it does.** Tier B, open. C4 and C5 in §3 — the landing failure class and I-7's long-landing cleanup rule — are both cited as things the hold provides, and both are consequences of the window rather than reasons for it. **The general form is worth more than the instance**: _a mechanism's own by-products are not evidence for it_, and the check is to ask whether the guarantee would be missed if the mechanism were absent, not whether it would still be true.

**F-185 — a cosmetic feature makes the controller inert for the duration of its animation, and no document says so.** Tier B, open. 206 ms measured against `minimal`'s 2.1 ms (§4.1). Whether a drop should refuse the next grab until the previous item has finished gliding home is a **behavioural** question the contract has never asked, and it is currently answered by a side effect of where the animation was implemented. Not a defect until the question is asked; it is unasked.

**F-186 — the two animation features' ownership is inverted against their actual coupling.** Tier B, open. `layoutAnimation`'s animations perturb geometry the library must read, and it owns no lifecycle; `landing`'s perturb nothing the library reads again, and it owns the operation's. §6. Recorded because it is the reason the two features must not be given one answer, and because it predicts which delegation is safe: landing's interpolation, not `layoutAnimation`'s.

---

## 10. The question, named and not settled

> **Q-L2 — should the settlement gate be replaced by a presentation lifetime that outlives the operation?**
>
> Semantic completion (terminal, retirement, readiness for the next drag) would end at the pin; the presentation lifetime (lift release or FLIP residue, placeholder, style lease) would end when the interpolation does; interpolation policy would be delegable. The library keeps the anchor measurement and the pin, which is what §2 shows it already does unconditionally.

**Q-L2 is prior to Q-L1 and must be settled first.** What it needs before a decision: §7.1's post-operation transform ownership answered concretely rather than gestured at; §7.3/7.4's visible differences assessed as product questions and not as refactors; §7.5's free-drag case worked separately; and a statement of whether refusing the next grab during a landing is wanted — because if it _is_ wanted, it should be a stated rule with its own mechanism, not a by-product.

---

## 11. What would falsify this

- **A consumer callback that must not run until the visual is home.** If any terminal-callback contract depends on the pixels having arrived, §3's table is wrong. I found none: `finalized` publishes the frame's committed domain result, which is decided at `settlement.prepare`, long before the runner starts.
- **A geometry read after the landing.** §6's inversion rests on nothing downstream reading the landing's intermediate positions. One such read — a post-landing measurement, a cache rebuild at retire — and landing becomes as coupled as `layoutAnimation`. `retireOperation`'s unwind chain reads none.
- **§7.1 having no acceptable answer.** If a transform on a released element cannot be owned safely, the gate is the _mechanism_ that avoids the problem, and keeping it is right — but then that should be recorded as the reason, which is not the reason recorded today.
- **Free drag needing the gate for a reason sortable does not** (§7.5). Unexamined here, and it could reverse the conclusion for one behavior without touching the other.
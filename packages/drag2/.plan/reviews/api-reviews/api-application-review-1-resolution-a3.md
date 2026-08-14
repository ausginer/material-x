# Resolution A-3 — the footprint's cross axis

Scope: **A-3 only**. Everything else in [`api-application-review-1.md`](api-application-review-1.md) and all of Revision 2 is treated as fixed. No redesign; the question asked is the smallest normative correction, and the answer is one expression and five contract paragraphs.

Input: [`api-application-review-1.md`](api-application-review-1.md) §A-3, [`contract/03-feature-composition.md`](../../contract/03-feature-composition.md) §The footprint is two windows §Scope limits, [`contract/02-kernel-behavior-contract.md:846-879`](../../contract/02-kernel-behavior-contract.md), D-43 / D-52 / D-58 / F-55.

---

## 1. The finding is confirmed, including inside its own test

[`src/sortable/spec.ts:650-656`](../../../src/sortable/spec.ts) subtracts on both axes; [`src/sortable/placement.ts:193-199`](../../../src/sortable/placement.ts) writes both. The composed branch therefore ships `width: 0px` whenever the box's cross extent is container-imposed — which is the ordinary case, because the composition D-43 exists for is a nested pair inside a vertical list, and a block-level box in a vertical list takes its width from its containing block on both sides of `acquireLift`.

The shipped covering test is an instance. [`tests/sortable/features.browser.test.ts:539-570`](../../../tests/sortable/features.browser.test.ts) builds `box` as a `display: flex` div inside an item that is `display: block; width: 100px` ([`:84-94`](../../../tests/sortable/features.browser.test.ts)). `box.offsetWidth` is 100 before the lift and 100 after it, so `footprint.width` is `0` in the fixture written to prove the rule, and the assertion — `getBoundingClientRect().height` — cannot see it.

Two corrections to A-3's severity account, both narrowing:

- **`width: 0px` is unconditional; the landing-target displacement is not.** `anchorTarget` reads `placeholder.getBoundingClientRect().left` ([`spec.ts:1614-1616`](../../../src/sortable/spec.ts)), and in a start-aligned block or stretch-aligned flex column a zero-width box has the same `left` as a full-width one. The `x` error appears under non-stretch cross alignment (`align-items: center` / `end`), `margin-inline: auto`, or `direction: rtl`. So: the size is always wrong, the landing is wrong in a stated subset. That is still release-relevant, and stating it precisely matters because the correction below should not be sold on the stronger claim.
- **It is not a `box`-only defect in principle.** It is reachable by any composition where the box's cross extent does not collapse, which is every one the scope limits currently admit.

---

## 2. Why the rule produced this: it conflates a collapse with a box

`boxPre − boxPost` measures a **collapse** — how much extent the box surrendered when its descendant left flow. That is a scalar on one axis. The footprint the placeholder is written from is a **box** — two extents. The contract states the first and writes the second, and the two coincided in every fixture that ever measured them: api-1's cases A and B, probe C1's `180 → 210`, F-55's identity correction and the shipped test are all height-only, so `OffsetBox` was carried through symmetrically without the substitution ever being checked.

On the cross axis the box surrenders nothing, so the collapse is `0` — **arithmetically correct and the wrong quantity**. Nothing was lost there, so there is nothing for the subtraction to restore; what the placeholder still owes on that axis is to stand where the row stood, because it is the item's slot in the light tree and it is the element `anchorTarget` measures. The pre-lift extent is exactly that value.

This is the sentence that makes the correction small. `boxPre − boxPost` was never a box subtraction; it is a one-dimensional correction on the list's flow axis, and the identity branch (`footprint = boxPre`) is not a second rule but the degenerate case where the collapse is zero.

---

## 3. Four candidate corrections

**R1 — subtract per axis, fall back to `boxPre` where the delta is zero.** Rejected. `offsetWidth` is integer-rounded, so the rule's output jumps from `boxPre.width` to `1` across a one-pixel input change; a measurement rule with a two-order-of-magnitude discontinuity in its domain is worse than the defect it fixes. It also cannot distinguish "contributed and did not collapse" from "never contributed".

**R2 — thread the flow axis from the axis feature into the slots, and subtract only there.** Rejected on two counts. It adds a discriminator to `SortableContribution`, whose own declaration says there is deliberately none because "a discriminator invites a runtime `switch`" ([`feature.ts:119-128`](../../../src/sortable/feature.ts)) — a new contribution member, a new slot field, a new `claim`, and a fourth thing an axis author must supply. And it buys nothing: it names the axis, but the value on the _cross_ axis is `boxPre` regardless, which R3 gets with no plumbing at all. Machinery for a constant.

**R3 — the subtraction is one-dimensional and fixed to `height`; the cross extent is always `boxPre.width`. Recommended.**

**R4 — write only the flow axis and leave the cross extent unset.** Rejected. An auto-width `div` is shrink-to-fit in precisely the non-stretch containers where the current defect bites, so it reproduces the defect in the same fixtures — and it makes the element `anchorTarget` measures a function of the consumer's stylesheet rather than of a measurement the library took.

---

## 4. Decision — R3

**The footprint's cross extent is `boxPre`'s on every composition. Only the vertical extent subtracts, and only when `box !== visual`.**

```text
before the lift      boxPre  = box.offsetWidth / box.offsetHeight       [kernel]
acquire the faithful lift    (the visual leaves flow)
after  the lift      boxPost = box.offsetHeight                         [behavior, only when box !== visual]

footprint.width  = boxPre.width                       — always
footprint.height = box === visual ? boxPre.height : boxPre.height − boxPost
```

Consistency with the three things the correction had to respect:

- **`y()`.** Its flow axis is vertical, and it is vertical _physically_: the rule is written on `pointerY`, `CENTRE_Y` and `rect.top/bottom` ([`y.ts`](../../../src/sortable/y.ts)). Naming the axis `height` rather than "the block axis" is therefore the consistent spelling — a logical-axis rule would give the footprint a writing-mode dependency the axis module it serves does not have.
- **`xy()`.** The composed branch is unreachable under the declared limit — grid requires `box === visual` — so `xy()` needs no rule here and gets none. The one residue is §5(a).
- **The declared unsupported cases.** No detection, no validation, no new refusal. The correction stays inside the stance 03 §Scope limits already takes: documented preconditions, checked by the consumer's layout, not by the library.

**What this costs the contract: nothing structural.** No seam signature moves, `ActivationScope` is unchanged, `boxPre` stays an `OffsetBox` because the width is still consumed, no slot or contribution member is added, and D-52's ownership split is untouched — the kernel still takes window 1, the behavior still takes window 2 first thing in `activation.prepare`. Window 2 narrows from a pair of reads to `box.offsetHeight`; that is a strict reduction (the same forced layout, one fewer value read, none discarded), not a saving worth claiming.

**What it buys beyond the fix.** The two branches stop being qualitatively different — the asymmetry A-3 names — and the identity branch becomes derivable rather than special-cased: `box === visual` ⇒ no collapse ⇒ `footprint = boxPre`. F-55's correction is preserved intact and is now a consequence of the rule instead of an exception to it.

**F-55 is not withdrawn, and neither is D-43's owner decision.** api-1's measurement — that no single-window rule reproduces the removed footprint in both nested cases — is untouched: it was a height measurement, it remains true, and it is still what two windows are for. What is withdrawn is the unmeasured generalisation of that result to the second axis.

---

## 5. Residues, stated rather than absorbed

**(a) `xy()` with `box !== visual` over a wrapping flex row.** Not grid, so not covered by the existing limit, and the rule above is wrong there in a new way: the flow axis is horizontal, so the placeholder gets the full pre-lift width (too wide by `boxPost`) and a spurious height delta. **Recommendation: widen the grid bullet to two-dimensional layouts** — `box !== visual` is supported with `y()`. One sentence, and it is the narrowest widening that makes the rule's silence honest. The alternative — leaving it undeclared — would repeat exactly the failure this resolution is correcting: a rule stated over a domain it was never measured on.

Note the failure mode there is bounded and in the same direction as the pre-D-43 behavior (a too-large placeholder), not the unbounded collapse `width: 0` produces. The rule stays **total**; it is correct only for the compositions the scope limits admit, which is the same treatment rule-placed layouts already get.

**(b) A `y()` list in a sideways writing mode.** No new limit needed, and recorded so it is not reopened: `y()` is defined on physical Y, so a sideways list is already outside its domain irrespective of the footprint.

**(c) D-58 is unaffected.** Candidate measurement is a rect read on the box, not a footprint; nothing here touches it.

**(d) Not decided here:** whether the placeholder should carry the box's cross-axis _margins_ as well as its border box. It is a separate question, it was never measured either, and A-3 does not raise it. Recorded as open, not answered.

---

## 6. Contract edits this implies

Nine sites state the rule; the ones that state history stay as they are.

| Document | Site | Edit |
| --- | --- | --- |
| [`03`](../../contract/03-feature-composition.md) | §The footprint is two windows, the `text` block and the three constraints | the `text` block gains the axis split; a fourth constraint states the cross axis and why (`nothing collapsed there`) |
| [`03`](../../contract/03-feature-composition.md) | §Scope limits, the grid bullet | widen per §5(a): `box !== visual` requires `y()` |
| [`02`](../../contract/02-kernel-behavior-contract.md) | `:850`, `:863-868` | the sentence and the ownership `text` block |
| [`02`](../../contract/02-kernel-behavior-contract.md) | `:420`, the `activation.prepare` seam row | the inline formula |
| [`02`](../../contract/02-kernel-behavior-contract.md) | `:816-818`, `:879` | window 2 is a single extent |
| [`06`](../../contract/06-vertical-sortable-trace.md) | `:216-222` | the WINDOW 2 lines and the `footprint =` line |
| [`00`](../../contract/00-index.md) | D-43 row `:213` | the removed-footprint sentence |
| [`00`](../../contract/00-index.md) | D-52 row `:224` | "reads `boxPost`" → the single extent |
| [`00`](../../contract/00-index.md) | findings table | a new row, **F-58** (F-57 is the current maximum), in F-55's own form: found in review, corrected in place, owner decision untouched |

[`05:407`](../../contract/05-lifecycle-invariants.md), [`05:435`](../../contract/05-lifecycle-invariants.md) and [`05:580`](../../contract/05-lifecycle-invariants.md) also say `boxPre − boxPost`. `:407` and `:435` are recording what D-43 _replaced_ and are correct as history; `:580` is the Checkpoint evidence line and states the rule, so it takes the same edit as `03`.

---

## 7. What the coverage must assert

Stated as a required property, not as a test:

1. **The existing D-43 fixture must assert both extents**, in the fixture it already builds. Its `footprint.width` is `0` today, so the assertion that would have caught this costs one line in a test that already exists — which is the strongest argument that the gap is an omission rather than a hard case.
2. **One non-stretch cross-alignment case.** A composed `box` inside an `align-items: center` column, asserting the placeholder's `left` against the row's. This is the row that makes the `x` error in §1 observable through `anchorTarget` rather than only through a style string, and it is the one that fails for a reason a width assertion alone would not explain.
3. **The identity branch keeps its current assertion unchanged.** If R3 is implemented as one rule with a degenerate case rather than as two branches, that existing row is what pins the degeneracy.

---

`LSP plugin - available; not used: the question turned on two literal expressions and their contract text — the footprint arithmetic in `activation.prepare`, the two `style`writes in`applyMechanics`, and the fixture's own element styling — all read directly, with no symbol resolution, reference set or type relationship in question.`
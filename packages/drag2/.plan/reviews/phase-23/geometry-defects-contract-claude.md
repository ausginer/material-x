# The two tier-A defects, and what the contract should say

F-212 and F-213 both falsify G1-presented, and the owner's question is whether to correct the implementation or narrow the published claim. This settles both against measurement, splits F-212 into the two different mechanisms it turns out to be, and prices the remedies.

Architecture and contract only. No production change. Every figure below comes either from a standalone browser probe over real layout, or from a prototype applied to a clean tree, built, measured and reverted.

## 1 — F-212 is two defects in one expression, and only one of them is G5

`shiftSpan` advances the hole by

```ts
const width   = hole[end] - hole[start];
const spacing = |delta| - width;
travelled    += (b - a) + spacing;      // summed over the crossed span
```

A probe reproduced every ordered gap pair on ten fixtures, comparing this arithmetic against what Chromium actually laid out.

| fixture | hole wrong | worst | crossed-row shift non-uniform |
| --- | --: | --: | --: |
| plain, unequal sizes, flex `gap`, grid `row-gap` | 0/20 | 0.00 | 0 |
| authored `translate` | 0/20 | 0.00 | 0 |
| ancestor `scale: 2` | 0/20 | 0.00 | 0 |
| **row with `rotate: 8deg`** | **12/20** | **264.74px** | 0 |
| **row with `scale: 1.2`** | **12/20** | **8.00px** | 0 |
| **flex, items `margin-bottom: 10px`** | **20/20** | **40.00px** | 0 |
| **block, items `margin-bottom: 10px`** | **20/20** | **40.00px** | 0 |
| flex/block, items **and placeholder** `margin-bottom: 10px` | **0/20** | 0.00 | 0 |

**The last row is the decisive control.** Give the placeholder the same margin the items carry and the margin failure disappears entirely. So the two limbs are **not the same defect**:

- **The transform limb is G5.** `b - a` is a _presented_ extent, and a `rotate` or `scale` makes the bounding rect larger than the border box. An authored `translate` is clean at 0/20, which is why the arc's own composition test never caught it: a translate moves a box without resizing it.
- **The margin limb has no transform in it at all.** `spacing` is one scalar derived from the _placeholder's_ flow footprint and then applied to every crossed row. `src/sortable/placement.ts` writes only `box-sizing`, `width` and `height`, from `offsetWidth`/`offsetHeight` — which **exclude margins** — so the placeholder is systematically margin-less while the rows need not be. It is a flow-modelling error, not a presented-versus-flow one.

**This is the wrong-fix risk, and it is real.** A remedy shaped by G5 — subtract authored presentation, compare like with like — closes the transform limb and leaves the margin limb standing at 40px per crossed row, on a fixture with no transform anywhere to hint that anything is wrong.

**The third limb does not exist.** `nonUniform` is **0 in every in-contract fixture** and the measured constant's spread is **0**. The per-row rule — the valuable half of D-156 — is sound, and neither limb touches it.

## 2 — The remedy, and it is a deletion

The hole's new position is a function of the crossed rows' **flow** footprints. Presented extents are not that quantity, and neither is the placeholder's own footprint. No same-element temporal difference yields it either, so **there is no G5-legal no-read prediction of the hole.** Stop predicting it.

`shiftSpan` loses `width`, `spacing`, `travelled` and the hole write; the hole is marked stale and the **next** spatial frame reads the placeholder once. That frame is post-paint, so the tree is clean and **nothing is forced**. Warm frames with no preceding move still read nothing.

With the hole measured and the rows predicted from the measured constant, the probe's worst **row** error is **0.0000px** across rotate, scale, flex margins and block margins — all twenty gap pairs each.

**It is strictly less machinery, and strictly less reading than before the arc.** The pre-arc implementation read the placeholder on _every spatial frame_; this reads it on the first frame after a _committed move_.

## 3 — The contract widens rather than narrows

The instrument's two halves were probed separately against layouts that are outside the rule:

| fixture | slot check fires | hole check fires |
| --- | --: | --: |
| two-column grid driven as a list | 30/42 | 30/42 |
| wrapping flex | 12/20 | 12/20 |
| **column whose flow gap varies row to row** | **0/20** | **18/20** |

The first two are caught by the **slot** half at full strength, so deleting the hole prediction costs no detection where a real violation lives.

The third is the finding. A column whose flow gap varies has **uniform, exact row displacement** — the slot half is silent because nothing is wrong. It failed only the hole rule, and the hole rule was the defect. **So that layout becomes supported**, and two published sentences move in the consumer's favour:

- `y.ts` G3-linear currently disqualifies _"one that wraps, or whose flow gap varies from row to row"_. **The second clause is deleted** — wrapping stays, varying flow gap does not belong there.
- D-156's _"per-item margins"_ clause is **vindicated**, not narrowed. It was true as written and the implementation did not honour it.

**And the negative conformance fixture _a column whose flow gap varies from row to row_ is testing the defect, not a boundary.** It must be retired, not preserved through the fix — a test that goes green by accident when the bug is removed is worse than no test.

## 4 — F-213, and the dependency already publishes the answer

Measured overshoot is exactly the ancestor scale:

| ancestor | viewport delta | visual move when issued as a local `translate` | wanted |
| --- | --: | --: | --: |
| `scale: 1` | −40.00 | 40.00 | 40.00 |
| `scale: 1.5` | −60.00 | **90.00** | 60.00 |
| `scale: 2` | −80.00 | **160.00** | 80.00 |
| `scale: 0.75` | −30.00 | **22.50** | 30.00 |

`@ydinjs/box-quad` already packs the ancestor linear map — `BOX_ANCESTOR_A` through `BOX_ANCESTOR_D` plus `BOX_ANCESTOR_ZOOM` — and its own documentation names this exact use: _"the space a transform authored on the element acts in, so inverting it turns a viewport delta into the translation to write."_ The package is **already in every sortable composition's graph**, so this is a call, not a module.

**The sink owns it, not the cache.** By D-158's own test — would this code exist if nothing animated? — the conversion belongs in `layout-animation.ts`, read once per committed move off the placeholder, which shares its container with every item a plan visits. A composition with no sink pays nothing. Inverting the 2×2 handles rotation and skew, not merely scale.

**One thing does not follow, and must be published rather than assumed.** The _axis_ remains incorrect under a non-axis-aligned ancestor transform: `y()` orders candidates by viewport `top`, which stops meaning flow order once an ancestor rotates. That was true before this arc and is not caused by the fix.

## 5 — The contract decision

**Preserve the supported cases and correct the implementation.** Narrowing was available and is refused: it would have to exclude per-element `rotate` and `scale`, per-item margins, and ancestor scaling — three ordinary things — and it would be a precondition invented at fix time to protect an implementation, which is the move `CONTRIBUTING.md` §1.1 names and rejects.

**Two exclusions are published because they were always true and were never written** (§1.2 — a constraint the compiler cannot state is still a constraint):

- **Position-sensitive collapsing margins are out.** Measured: a block list with a large placeholder margin gives a constant spread of **28px** across gap pairs, an asymmetric one **7px**, and in both, rows _outside_ the crossed span move — which breaks G2 as well as G3-linear. This was already named out-of-scope when the arc's premise was set; it has never been in the JSDoc.
- **The axis rule requires the flow axis to stay axis-aligned in the viewport.** Ancestor scale and zoom are supported; ancestor rotation and skew are not, for the axis, whatever the sink can now convert.

**And one new clause, which is Q-16 answered: G6 — the placeholder's own geometry is stable between invalidations.** The reviewer built a growing placeholder and the drag came out clean, so this is filed as an unpublished precondition rather than a defect — the staleness cancelled for that geometry. It is still relied on: `constant` describes the flow footprint at the instant it was measured, and nothing short of an `invalidate()` revisits it. A consumer animating their placeholder's size must call `controller.invalidate()`. Writing it down is what licenses not checking it (§1.1).

## 6 — What the remedies cost, measured

Prototyped jointly — the hole measured inside the linear module, the conversion inside the sink — built and measured against the landed tree:

| Composition | landed | fixed | Δ | versus the pre-arc parent |
| --- | --: | --: | --: | --: |
| minimal | 9844 | 9859 | **+15** | **−54** |
| minimal (xy) | 9704 | 9705 | **+1** | +125 |
| minimal + layoutAnimation | 10196 | 10320 | +124 | **−33** |
| xy + layoutAnimation | 10045 | 10152 | +107 | — |
| complete | 10439 | 10554 | +115 | **−41** |
| free drag ×4, `drag.js`, `kernel.js` | — | — | **0** | 0 |

**The allocation is the result.** The compositions that never animate pay +15 and +1; the correction is carried by the compositions that consume it. Both animating rows still land _under_ the model the arc replaced.

**Placement was worth measuring separately.** An earlier prototype put the ancestor read in the shared cache instead of the sink, and a variant put the stale-hole path in the shared cache instead of the linear module: that variant charged `minimal (xy)` **+49 B** for a branch `xy()` can never take, against **+1 B** when the same logic sits in the linear module. Same behaviour, same correctness, forty-eight bytes of difference on a row that consumes none of it.

**Runtime.** One `getBoundingClientRect()` on the placeholder, on the first spatial frame after a committed move, off a clean tree — no forced layout. One `coordinates()` per committed move, in animating compositions only. Warm spatial frames are unchanged and still read nothing.

## 7 — Two things the prototype taught that the handoff must carry

**The DEV instrument runs before the re-measure.** `verifyEquivalence` is called at the head of `refresh`, so a deliberately stale hole must be re-read _before_ it, or the oracle reports a mismatch at the placeholder on every move — which is what the first prototype did, on fixtures that are entirely correct.

**The residual conformance failures were a missing import**, not an architectural cost: `BOTTOM` was unbound in the prototype and surfaced as `ReferenceError` at stage 4. Recorded so the handoff is not read as carrying an unexplained red.

## 8 — F-218: widen mechanically, decline semantics

Three gaps were reported. Two are cheap and are taken:

- **package-root files are out of scope** — add them; `README.md` alone carries 18 anchored paths that nothing checks;
- **unanchored repo-relative paths are invisible** — accept a backticked string that ends in a known extension even without a leading anchor, which is what makes `sortable/verified-refresh.ts` in `src/globals.d.ts` a candidate.

**The third is declined.** An instrument that checks whether prose _describes a seam that exists_ is a semantic checker over English, and §2.2 is exactly about not building that. The class is caught by review, and this round is the evidence — four independent lenses found it nine times.

**One targeted assertion is added instead**, for the invariant that has now failed twice with two different wrong answers: the package has exactly one `__DEV__` binding, and any comment naming its home must name that file. That is an instrument for a named invariant, not a prose checker.

## 9 — F-219: unmute, because the gate costs nothing

The always-on `control` block covers the seven rows that **cannot move**; the eight that can — `minimal`, `minimal (xy)`, `minimal + layoutAnimation`, `xy + layoutAnimation`, `minimal + landing`, `complete`, `both behaviors`, `baseline A` — have no enforced number in a default run. The mechanism introduced to close F-208 watches only the immovable half.

**The gate's cost was assumed and is measurable.** `beforeAll` already builds and measures every composition for the 28 always-on graph assertions, so the fifteen budget assertions are arithmetic over results already in hand:

- default: `28 passed | 15 skipped`, 1.42 s;
- `DRAG2_SIZE_BUDGETS=1`: `43 passed`, 1.50 s.

**Eighty milliseconds.** The mute's own comment says _"Unmute at finalization"_; the arc is finalizing and the obligation costs 0.08 s to discharge. Unmute it.

## 10 — The tier vocabulary, defined

It was undefined and produced a three-way split on identical evidence. Tier is assigned by **consequence**, never by provenance, and never by how many lenses reported it:

- **A** — a correctly integrated consumer observes something different at runtime: rendering, behaviour, timing, or a published value.
- **B** — no program behaviour changes, but a correct integrator can be misled by what the package says, **or** an instrument the repository relies on is unsound.
- **C** — internal only: no consumer-observable effect, and nothing the repository relies on depends on it.

The reconciliation this round already used that basis; this makes it citable. A finding that is _systematic_ rather than isolated does not change tier — it changes priority within one, which is what the round's disagreement was actually about.

## 11 — Instrument notes

- Ten fixtures × every ordered gap pair, in Chromium, against real layout rather than against the library — so the arithmetic is judged by what the browser did, not by the package's own oracle.
- Six control rows reported exactly 0 bytes for every prototype.
- The restored tree reproduces the landed baseline byte-exact.
- **A fixture that could not fail was avoided by construction here**, and the margin control is why: `flexMbWithPhMargin` had to come out clean for the mechanism claim to mean anything, and it did.
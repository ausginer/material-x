# Final arc — review round consolidation

**Round:** the final `drag2` arc, `0beb9900..43b9f520` on `drag2/fin-review`, implementing D-156, D-158 and D-159.

**All four passes read files at `43b9f520`**, verified per report, so the reports merge without a tree reconciliation. Working tree at consolidation is `aead978f`; `git diff f670a0b4..HEAD -- src tests bench` is empty, so **no pass modified production code**. The only tracked change from the round is the feature-proof artifact.

**Passes run:** `reviewer`, `integrity`, `cleanup`, `der` — in parallel, in one message, none holding another's prompt, findings or artifact path. Only the feature-proof pass was given the owner's falsification checklist; the other three were given the arc and their role.

**The round is not clean.** Two tier-A runtime defects, both reproduced by the feature-proof pass in Chromium and both independently confirmed here from the source and from the package's own published contract.

---

## 1. Findings

| Canonical | Tier | Claim | From |
| --- | --- | --- | --- |
| **F-212** | **A** | `shiftSpan` advances the cached hole from a sum of _different elements'_ presented extents, which G5 forbids and which G1-presented and D-156 promise is supported | `reviewer-1` |
| **F-213** | **A** | `layoutAnimation()` spends a viewport-space delta as a CSS `translate`, which resolves in the element's local containing block | `reviewer-2` |
| **F-214** | B | The consumer-facing surface — `README.md` and the contract set — documents a vocabulary that no longer exists | `integrity-1`, `reviewer` (contract-set finding) |
| **F-215** | B | The deleted pre-write bracket and the deleted `project` step survive in internal prose at nine sites | `cleanup-3`, `cleanup-4`, `integrity-3`, `integrity-4`, `integrity-5`, `der-1`, `der-2`, `der-3`, `der-4`, `reviewer` (tier C) |
| **F-216** | B | The `__DEV__` binding's home is misstated in two places, with two _different_ wrong answers | `cleanup-1`, `cleanup-2`, `integrity-2`, `der-5` |
| **F-217** | C | `DisplacementView` is described in the present tense where it is retired | `integrity-6` |
| **F-218** | B | The reference instrument is structurally unable to see the defect class this round is made of, and is green | consolidation |
| **F-219** | B | No default-run test asserts a byte figure on any composition row this arc moved | `reviewer` |
| **F-220** | C | `remainingOf()`'s documented `[0, 1]` range is false — **the owner's hypothesis, answered** | `reviewer` |
| **F-221** | C | `xy()`'s `before` buffer is not released | `reviewer` |
| **Q-16** | — | A placeholder-stability precondition is relied on but not published | `reviewer` |

Ids continue from the high-water marks `F-211`, `Q-15`, `I-37`. No `I-` was minted. **No `D-*` was minted, amended or superseded by any pass or by consolidation.**

---

## 2. The two tier-A findings

### F-212 — the hole advance is not a flow quantity

`src/sortable/linear-shift.ts:192-231`. Per-row prediction is sound; the **hole** is not:

```ts
const width = hole[end]! - hole[start]!;
const spacing = (delta < 0 ? -delta : delta) - width;
travelled += b - a + spacing; // summed over the crossed span
```

`b - a` is one element's **presented** extent, read from `getBoundingClientRect()`. Summing it across the span and using the total to place the hole makes the hole's position a function of _other elements'_ presented geometry.

**That is the exact construction G5 forbids, published in the same package**, at `src/sortable/y.ts:120-125`: _"a prediction may consume only a same-element temporal difference of measured geometry. A difference between two different elements' measured rects carries the difference of their authored presentation and is not a flow quantity."_ The settle walk recovers flow position only for the sink's own additive `translate`; an authored `rotate` or `scale` is never subtracted, so for those rows presented extent ≠ flow extent.

Two published statements are falsified by this, and both were **written by this arc**:

- `y.ts:112-117` G1-presented — _"a `translate`, a `rotate`, a `scale`, an ancestor's transform … Authored presentation is fully supported"_;
- D-156 — _"permit unequal item sizes, `box !== item`, `display: contents` and per-item margins."_

**It is also a regression in error tolerance, verified from the arc's parent.** At `0beb9900:src/sortable/y.ts:144` the anchor was measured live every spatial frame — `const anchor = centreOf(placeholder);`. At `43b9f520:src/sortable/y.ts:191` it is `hole[CENTRE_Y]`. Drift that was previously corrected on every frame now accumulates for the whole operation in a shipped build, because the prediction is never resynced.

**Consolidation notes what it verified and what it relays.** The rotate/scale limb I confirmed statically: it follows from G5's own wording against the quoted arithmetic, needing no browser. The **per-item-margin limb I did not independently re-derive** — for a uniform margin the scalar `spacing` cancels correctly on my arithmetic, so if the reproduction is sound the mechanism is a placeholder-footprint-versus-border-box difference rather than the cross-element one above. The pass reports the library's own `DEV` oracle firing for it in both flex and block. **Remediation must confirm the margin case separately**; it may be a second defect wearing the first one's clothes, and the two would not be fixed by the same change.

The oracle is real and its message is the one quoted — `src/sortable/rect-index.ts:326-330`, raised _at the placeholder_, which is consistent with a sound per-row prediction and a wrong hole.

### F-213 — a viewport delta issued as a local-space translate

`src/sortable/layout-animation.ts:166` issues `translate: ${sx}px ${sy}px` from `dx`/`dy` the axis computed as viewport-space quantities (`dx = -delta * ux`). CSS `translate` resolves in the element's own coordinate system, so under an ancestor `scale: 2` a row that must travel 80 viewport px is told to translate 80 local px and renders 160 px out.

The same G1-presented clause names _"an ancestor's transform"_ as supported. The pass reports a control without the sink is clean, which localises the defect to the sink rather than the axis.

**The error compounds through the cache.** The settle walk at `layout-animation.ts:235-238` subtracts the same `dx`/`dy` from cached viewport rects to recover flow position. Under an ancestor scale the issued movement and the subtracted quantity disagree by the scale factor, so the "recovered" flow geometry is wrong too — which feeds F-212's cache.

**F-212 and F-213 are not merged.** They share a falsified clause and they compose badly, but they are different defects in different modules with different fixes, and the sink control isolates them.

---

## 3. The owner's hypothesis, answered

**`remainingOf()` — comment defect only. Confirmed here, not relayed.**

`src/sortable/layout-animation.ts:80-84` returns `1 - progress` from `getComputedTiming().progress`. An overshooting easing does drive that outside `[0, 1]`; the pass measured 1.0980 and −0.0982.

The `[0, 1]` sentence at line 72 is therefore false. **Nothing relies on it.** `remainingOf` has exactly four uses — lines 145, 146, 228, 229 — and every one is a bare multiplication into a displacement vector. There is no clamp, no comparison, no branch on the range. Because the keyframes interpolate linearly from the issued vector to zero, `issued × (1 - progress)` is the still-applied amount _including_ out of range, which is why the pass's measured offsets match at every sample.

The sentence is an internal maintainer note — `remainingOf` is a module-local `const` and reaches no `.d.ts` — so correcting it is a comment change with no surface consequence.

---

## 4. What was merged, and one correction to a pass's evidence

**F-215 is nine sites reported by four passes.** `src/sortable/spec.ts:1112`, `src/sortable/placement.ts:253`, `src/sortable/slots.ts:117`, `src/sortable/runtime.ts:72`, `src/shared/composition.ts:125`, and `tests/sortable/{y,xy,features,assemble}.browser.test.ts`. All verified present; `beforeMove`, `afterMove`, `project`, `DisplacementPlan` and `settleDisplacement` survive in `src/` as prose only.

**Correction to `integrity-4`'s supporting evidence.** It cited `runtime.ts` as the comment that _was_ correctly rewritten, framing `placement.ts` and `spec.ts` as two stragglers. `runtime.ts:72` still reads _"Written immediately before the projection"_. I traced the actual bracket at `spec.ts:1130-1187`: `view.insertion` is written before the **write**, and `movedInsertion` runs **after** it — D-158 collapsed the projection into the post-write hook, so nothing precedes a projection any more. `der-4` found this site independently, which is what surfaced the conflict. **The finding stands; the "straggler" framing does not** — the class is systematic, and that is what F-218 explains.

**Scope gap in `cleanup`.** Its sweep covered `src/` only, so the four test sites are absent from it. `der-2` covers two of them; the other two are consolidation-verified.

**`F-216` is one defect with two wrong answers, which is the interesting half.** There is exactly one `__DEV__` binding in the package, `src/sortable/rect-index.ts:152`. `src/globals.d.ts` names `sortable/verified-refresh.ts`, deleted in this arc. `tsdown.config.ts:33` was **edited during this arc** to fix that comment and landed on `src/sortable/linear-shift.ts`, which also does not hold it. A correction pass touched the sentence and still missed.

---

## 5. A disagreement resolved by evidence, and one I withdrew

**Withdrawn: the strikethrough question.** During validation I read `documentation.md` §5.2 — _"No strikethrough. A superseded sentence is deleted here"_ — against the struck spans this arc landed at `tests/sortable/feature.declaration.test.ts:160` and `tests/sortable/assemble.browser.test.ts:220`, and prepared to route it as a convention disagreement, since `integrity-6` treats the same construct as correct.

**The tree answers it and `integrity-6` is right.** `tests/references.node.test.ts:751-755` classifies a struck span as a first-class verdict — _"Struck through: a deliberate reference to something retired"_ — and asserts `retired > 0`. Strikethrough marking a **retired reference** is a mechanically enforced convention, and it is a different object from §5.2's ban on struck **superseded sentences**. The routing is withdrawn rather than sent to the architect, because a question the tree already answers is not a decision.

**Reconciled: the tier disagreement.** `der` rated the documentation findings tier A; `cleanup` rated the same evidence B; `integrity` rated it B/C. **The A/B/C vocabulary is defined nowhere in the repository** — not in `agent-workflow.md`, not in any agent definition, not in a prior artifact — so the passes were not applying a shared rule.

Reconciled at **B**, on a stated basis so it can be argued: F-212 and F-213 change what a correctly integrated consumer sees on screen; the prose findings do not change program behaviour at all. Putting them in one tier would flatten exactly the distinction the owner needs to sequence remediation. `der`'s argument is about **provenance** rather than consequence — the arc retired this machinery and failed to sweep its own prose — and that is real, and is why the class is B rather than C. **That the tier vocabulary is undefined is itself worth an owner decision**; it produced a three-way split on identical evidence in a single round.

---

## 6. F-218 — the instrument cannot see this round's defect class

Four independent passes converged on stale prose. The cause is mechanical, and the instrument that exists for exactly this is **green**: `npx vitest run tests/references.node.test.ts` passes 4/4 with every finding above live.

Three gaps, each verified by running the checker's own `PATH` regex against the defect sites:

| Gap | Evidence |
| --- | --- |
| Unanchored paths are invisible **by design** | `PATH` (`references.node.test.ts:155`) requires a `src\|tests\|bench\|docs\|packages\|.plan\|.scripts\|.agents` anchor. Run against `src/globals.d.ts` it extracts only `.scripts/vite-config.ts`; the stale `sortable/verified-refresh.ts` is never a candidate |
| Package-root files are out of scope | `ROOTS` (`:87-97`) covers `src/`, `tests/`, `bench/`, `.scripts/`, `.plan/contract/`, `obligations.md`. `README.md` carries **18** anchored paths, none checked. `tsdown.config.ts` is never scanned |
| The check is existence-only, not accuracy | `tsdown.config.ts`'s `src/sortable/linear-shift.ts` **exists** — it simply no longer holds the binding |

The third is the deepest: F-216's class and F-215's class are **structurally uncatchable** by this instrument however the roots are widened, because both name real files that no longer do the thing claimed. Widening scope is a design call with a cost, so it is routed rather than answered.

---

## 7. Routed to the architect

Consolidation minted no decision and settled no design question. These need architectural, contract or public-surface authority:

1. **F-212 and F-213 each have two admissible answers, and choosing is a contract act.** Either the implementation is corrected to honour G1-presented as published, or **G1-presented and D-156's "per-item margins" are narrowed to what the rules actually deliver**. The second is a published-contract narrowing on a frozen surface; the first has a runtime cost the arc was explicitly built to avoid. A reviewer may not choose, and neither may I.
2. **F-212's margin limb** — whether it is the same defect as the rotate/scale limb or a second one. This determines whether one fix closes the finding.
3. **F-218 — whether the reference instrument's scope widens**, and whether an accuracy check is wanted at all given the third gap cannot be closed by scope.
4. **Q-16 — the unpublished placeholder-stability precondition.** Under `CONTRIBUTING.md` §1.2 a precondition the compiler cannot state must still be findable by the integrator; this one is relied on and not written where they read.
5. **The A/B/C tier vocabulary is undefined**, and produced a three-way split on identical evidence this round.
6. **F-219 bears on §15's "check that the instrument can see the change."** D-159 added the `xy + layoutAnimation()` row permanently for exactly that reason; the feature-proof pass reproduces its 10045 B / 31 modules exactly, but reports the 15 budget rows are skipped unless `DRAG2_SIZE_BUDGETS=1` and that no always-on `control` row contains a `sortable/` module. Whether a default-run byte assertion is required is a measurement-policy call.

## 8. Verified sound

Recorded so a silent area is distinguishable from a clean one. The feature-proof pass verified: the no-sink path allocating nothing and reaching no animation-specific work; the `movedInsertion` retained `catch` and the double-failure latch ordering, traced through `runPhase`/`failOperation` and pinned by `sortable.browser.test.ts:3391`; the fold's continuity across repeated moves; and the new `xy + layoutAnimation()` row reproducing D-159's figures exactly. Full suite green; `npx just size` green. `der`'s **backward pass found nothing** — every surviving mechanism matches its governing decision, and no decision's substance is contested by any pass. `integrity` found no cross-package break into `material-x`, the new `displacement`/`report`/`settle` wiring mutually consistent, and `free-drag` untouched and still type-checking.

**Not covered by any pass:** accessibility, and the keyboard command path.

## 9. Local → canonical mapping

| Local | Canonical |
| --- | --- |
| `reviewer-1` | F-212 |
| `reviewer-2` | F-213 |
| `reviewer` (contract set) | F-214 (with `integrity-1`) |
| `reviewer` (budget rows) | F-219 |
| `reviewer` (`remainingOf`) | F-220 |
| `reviewer` (`before` buffer) | F-221 |
| `reviewer` (placeholder precondition) | Q-16 |
| `reviewer` (four comments), `cleanup-3`, `cleanup-4`, `integrity-3`, `integrity-4`, `integrity-5`, `der-1`, `der-2`, `der-3`, `der-4` | F-215 |
| `cleanup-1`, `cleanup-2`, `integrity-2`, `der-5` | F-216 |
| `integrity-1` | F-214 (with `reviewer`) |
| `integrity-6` | F-217 |
| — (consolidation) | F-218 |

Nothing was rejected. Every finding brought by every pass survived validation; two had their supporting evidence corrected (`integrity-4`'s counterexample, `cleanup`'s `src/`-only scope), and one limb of F-212 is carried as relayed-not-reverified.
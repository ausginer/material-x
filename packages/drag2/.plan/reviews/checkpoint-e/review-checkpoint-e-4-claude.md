# Checkpoint E — closure verification of D-90 and D-92

- **Reviewer:** Claude
- **Date:** 2026-08-18
- **Subject:** the detached calling convention across both middle tiers, after [review-checkpoint-e-3-claude.md](review-checkpoint-e-3-claude.md) re-opened D-90
- **Tree:** `ce386b7a` on `drag2/phase21`, working tree clean

**Scope.** D-90 and D-92 only: the two published statements, the two instruments, the first-party controls, 03's superseded flattening sentence, and whether the markers and the deferred ledger match the tree. No package audit, nothing modified. Every probe was made by editing the tree, running the gates, and restoring.

## Baseline

| Gate                 | Result                                |
| -------------------- | ------------------------------------- |
| `npx just typecheck` | clean                                 |
| `npx just test`      | 50 files, **1014 passed, 25 skipped** |

## Verdict

**Both conventions are stated and both instruments genuinely discriminate.** Every falsifier the two markers name reproduced exactly, and the first-party controls stayed non-discriminating exactly as recorded. The obligation is the same in both tiers, and the sortable's rows pin the obligation rather than the flattening's shape, which is the harder of the two things to get right.

Two items are open, both low, and one of them is the same class of overclaim the pair of decisions exists to eliminate.

| # | Item | State |
| --- | --- | --- |
| CE4-01 | free drag's published guarantee is not site-total, and its instrument cannot see the site | **open**, low |
| CE4-02 | 03's _flattens the pair into two direct slot fields_ misleads about the obligation's scope | **open**, low, prose-only |
| — | free drag pins the mechanism where the sortable pins the obligation | informational |
| — | D-90 / D-92 markers and the deferred ledger | verified honest |

## Falsification ledger

Each row is the fix reverted in the tree, the suite re-run, and the tree restored. Re-binding is expressed as `.bind(record)` at the lift, which reproduces the receiver a bound call site would hand with the smallest possible diff.

| Probe | Reversion | Observed | Claim under test |
| --- | --- | --- | --- |
| 1 | all four sortable lifts re-bound to the installer's record | **5 failed**; `y()` and `xy()` control rows **passed** | D-92 — _fails five rows … `y()` and `xy()` pass under the same reversion_ |
| 2 | only `measure` re-bound | **exactly 2** — that member's row plus the aggregate | D-92 — _re-binding a single lift fails exactly that member's row plus the aggregate_ |
| 3 | both `spec.ts` constraint lifts re-bound | **exactly 3** — apply, scroll invalidator, policy invalidator | D-90 — _binding the three `spec.ts` sites fails three rows_ |
| 4 | only the assembler's `retire` push re-bound | **exactly 1**, full suite otherwise green | D-90 — _binding the assembler's `retire` fails the fourth_ |

Both fixtures now **read** the receiver they are handed — [anchor.browser.test.ts:118-157](../../../tests/free-drag/anchor.browser.test.ts#L118-L157) and [calling-convention.browser.test.ts:69-107](../../../tests/sortable/calling-convention.browser.test.ts#L69-L107) — both use `function` shorthand rather than arrows for the stated reason, and both assert the site was **reached** before asserting anything about the receiver. The two ways a convention row can measure nothing — a fixture that ignores `this`, and a site that is never driven — are both closed.

**The mixed receiver is handled correctly, and the sortable's shape is the better of the two.** Confirmed against the source rather than taken from the prose: `slots.resolveInsertion(…)` ([sortable/spec.ts:949](../../../src/sortable/spec.ts#L949), [:1286](../../../src/sortable/spec.ts#L1286)) and `slots.invalidateInsertion()` ([:423](../../../src/sortable/spec.ts#L423), [:818](../../../src/sortable/spec.ts#L818)) receive the flat slot record; `const measure = slots.measureInsertion` then `measure(frame, view)` ([:442-449](../../../src/sortable/spec.ts#L442-L449)) and `guarded(hook)` ([:1719](../../../src/sortable/spec.ts#L1719)) receive `undefined`. Asserting `receiver !== own()` pins the obligation `InsertionGeometry` actually states and still fails under every reversion above; asserting `undefined` uniformly would fail the conforming tree at two of the four sites. The reasoning is written down in [03](../../contract/03-feature-composition.md) §Assembly and in [COVERAGE.md](../../../tests/COVERAGE.md) rather than left implied.

## CE4-01 — free drag's guarantee is stated for four sites and the tree has five

**Severity: low.** The author obligation is intact and no author can be harmed by the extra site. What is wrong is a published guarantee stronger than the tree holds, verified by an instrument that cannot reach the exception.

[free-drag/feature.ts:88-91](../../../src/free-drag/feature.ts#L88-L91) states the mechanism as well as the obligation:

> The behavior lifts `apply`, `invalidate` and `retire` out of the record once and **calls them as bare functions**.

[anchor.browser.test.ts:154-157](../../../tests/free-drag/anchor.browser.test.ts#L154-L157) pins that literally: every recorded receiver must be `undefined`.

There is a fifth `constrain.retire` call site the four rows never drive — the assembler's **construction-unwind** loop, [free-drag/assemble.ts:167-172](../../../src/free-drag/assemble.ts#L167-L172):

```ts
for (let i = retireHooks.length - 1; i >= 0; i -= 1) {
  try {
    retireHooks[i]!();
```

An indexed call sets the receiver to the object indexed, so the hook is handed the **`retireHooks` array**. Probed directly — a `constrain` installer followed by a throwing installer, so `freeDrag()` unwinds and rethrows:

```
count: 1   isUndefined: [false]   isArray: [true]
```

So `retire` is not invoked as a bare function on that path; the row titled _should hand the retire hook no receiver_ does not reach it; and the enumerations in [07](../../contract/07-free-drag-contract.md) §The motion constraint's calling convention and in COVERAGE — _each of the constraint's **four** call sites_ — are four where the tree has five. This is the same shape as the seam-enumeration error D-81 and D-89 each made once: the sites were counted from where retirement is **normally driven** rather than from where the member is **called**.

**The sortable's formulation survives the identical path**, which is the useful part of the finding. [sortable/assemble.ts:229-234](../../../src/sortable/assemble.ts#L229-L234) has the same loop, and _the receiver is never the record you return_ stays true when the receiver is an internal array. The weaker-but-total wording is the one that holds at every site in both tiers; free drag's extra clause is the half carrying the risk.

## CE4-02 — 03's flattening sentence now misleads about the obligation's scope

**Severity: low, prose-only.** It does not conflict with the contract — it makes no claim about `this` — but it supplies the antecedent the D-92 paragraph directly beneath it reasons from, and it names a two-member flattening.

[03:244-248](../../contract/03-feature-composition.md) reads three different counts in three consecutive sentences:

- _"Pairing the **three** operations in one contribution…"_
- _"The assembler flattens **the pair** into **two** direct slot fields, so the call sites stay one property read and one call: `slots.resolveInsertion(...)`, `slots.invalidateInsertion()`, `slots.measureInsertion` (nullable)"_ — **two**, followed by a list of **three**
- _"**That flattening is a calling convention, and it binds the author** (D-92) … the assembler lifts **four** members"_

A reader who takes "that flattening" to mean the sentence above it concludes the obligation binds `resolve` and `invalidate` and not `measure` or `retire` — which is precisely the scope question D-92 exists to settle.

Three things mark this as an oversight rather than deliberate scoping:

- D-92's own **Supersedes** cell names this exact sentence — _03's "the assembler flattens the pair … so the call sites stay one property read and one call" read as a performance note_ — so the decision knows the sentence is the thing being superseded, and left it unamended.
- The **identical sentence in the source was corrected in the same commit**: [sortable/feature.ts:72](../../../src/sortable/feature.ts#L72) now reads _"flattens the members into direct slot fields"_. Only 03's copy was missed.
- The code sample at [03:397](../../contract/03-feature-composition.md) still carries `// ← the pair, flattened`.

The **two**-against-a-three-item-list mismatch is independent of D-92 and predates it.

## Informational — the two tiers pin to different standards

Free drag's rows pin the **mechanism** (`undefined`); the sortable's pin the **obligation** (`!== own()`). Each matches its own published text, so neither is wrong today, and D-92 explains the asymmetry rather than hiding it.

Two consequences worth recording. A future free-drag refactor to the sortable's flat-slot shape would fail four rows without breaking the convention — the rows would be defending the flattening rather than the contract. And CE4-01 is the case where the mechanism claim turned out to be the half that does not hold everywhere, while the obligation held throughout. The sortable's shape would discriminate just as sharply in free drag: a bound site hands the record, which is both `!== undefined` and `=== own()`.

**Minor, same file.** [free-drag/feature.ts:89](../../../src/free-drag/feature.ts#L89) says _"the **behavior** lifts `apply`, `invalidate` and `retire`"_; the spec lifts two ([spec.ts:131-132](../../../src/free-drag/spec.ts#L131-L132)) and the **assembler** lifts `retire` ([assemble.ts:108](../../../src/free-drag/assemble.ts#L108)). 07's _How closure was measured_ paragraph draws the distinction correctly.

## Markers and the deferred ledger

Verified against the tree rather than against each other.

| Claim | Result |
| --- | --- |
| D-90 — _the sentence is on `MotionConstraint` itself_ | holds, [feature.ts:87-99](../../../src/free-drag/feature.ts#L87-L99) |
| D-90 — _three members reached through four sites_ | holds: one `apply` expression inside `deriveMotion`, two `invalidate` expressions, one `retire` push — subject to CE4-01 |
| D-90 — _three `spec.ts` sites bound fails three rows; the assembler's `retire` fails the fourth_ | reproduced exactly, probes 3 and 4 |
| D-90 — _the `spec.ts` comment … is true now and says so_ | holds; the comment is rewritten to the present-tense invariant, per the new production-comment rule |
| D-92 — _fails five rows; a single lift fails that member's row plus the aggregate_ | reproduced exactly, probes 1 and 2 |
| D-92 — _`y()` and `xy()` pass under the same reversion_ | holds; both control rows green under probe 1 |
| D-92 — the narrowing away from _every published contribution type_ | accurate, and stated **before** the claim: `PlaceholderSlot`, `LandingStart` and `DisplacementHook` are function-typed slots rather than method records, so the class-instance hazard is materially different |
| deferred ledger | table empty, no `Unimplemented (…)` marker on any decision row, `tests/decisions.node.test.ts` green |
| D-90's retirement from that table _on exactly that condition and not on a rename_ | backed by numbers reproduced independently here |

**One count caveat, not a defect.** Under the `.bind` reversion, probe 1 also fails a **sixth** row — [assemble.browser.test.ts:111](../../../tests/sortable/assemble.browser.test.ts#L111) _should flatten the geometry pair into two slot fields_, a pre-existing **reference-identity** assertion covering `resolve` and `invalidate` only. It is not a convention instrument: probe 2 leaves it green, and it says nothing about receivers. Its title carries the same _pair / two_ framing as CE4-02's sentence.

## Verified in passing, outside this scope

CE1-10's owed `root` sentence is now written normatively in [03:44-55](../../contract/03-feature-composition.md) and mirrored in [shared/composition.ts:26-42](../../../src/shared/composition.ts#L26-L42), naming both referents. C-2 and C-3 from [review 2](review-checkpoint-e-2-claude.md) are both addressed in 07 — the verbatim restatement is deleted, and the I-36 cell now states the per-seam measurement instead of a uniform barrier claim.

---

LSP plugin - available; not used: this pass turned on running reversions against the suite, observing a receiver at runtime, and comparing prose counts against source — compile-and-run and text questions rather than symbol-graph ones.
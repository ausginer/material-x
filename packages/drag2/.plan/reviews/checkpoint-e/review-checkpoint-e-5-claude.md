# Checkpoint E — closure verification of CE4-01, CE4-02 and D-93

- **Reviewer:** Claude
- **Date:** 2026-08-19
- **Subject:** the calling convention's published form, after [review-checkpoint-e-4-claude.md](review-checkpoint-e-4-claude.md) opened CE4-01 and CE4-02
- **Tree:** `9c91b67f` on `drag2/phase21`, working tree clean

**Scope.** CE4-01, CE4-02 and D-93 only: whether free drag now publishes and pins the durable obligation across all five sites, whether the sortable still satisfies the same obligation across its own five, whether the pair/two-fields drift is gone from normative, source and test wording, and whether D-93's marker, coverage evidence and deferred ledger match the tree. D-90 and D-92 are not re-opened and no package audit was run. Nothing was modified: every probe edited the tree, ran the gates, and restored it.

## Baseline

| Gate                 | Result                                |
| -------------------- | ------------------------------------- |
| `npx just typecheck` | clean                                 |
| `npx just test`      | 50 files, **1016 passed, 25 skipped** |

Re-run after the last probe: identical, and `git status --short` empty.

## Verdict

**The closure holds.** Free drag's published guarantee is the obligation alone, the withdrawn mechanism clause survives only as a struck record, and the three lift falsifiers reproduce the measured 1 / 2 / 2 exactly. The sortable satisfies the same obligation across its five sites, its aggregate falsifier now fails six rows, and both first-party axis rules stay non-discriminating as recorded. D-93's premise — that the construction unwind hands the hook the assembler's internal array rather than `undefined` — was verified directly rather than taken from the decision.

Four items are open. None blocks the closure; three are stale counts left behind by the correction pass, and the fourth is the withdrawn mechanism claim reappearing one tier over.

| # | Item | State |
| --- | --- | --- |
| CE5-01 | COVERAGE's second-tier paragraph contradicts the banner four lines above it | **open**, low |
| CE5-02 | the free-drag instrument's own comment still enumerates four rows, and its aggregate claim has no row | **open**, low |
| CE5-03 | the D-90 and D-92 ledger rows keep superseded counts, unstruck | **open**, low |
| CE5-04 | the sortable's published declaration names all five receivers, unpinned | informational |
| — | D-93 marker, coverage evidence, deferred ledger | verified against the tree |

## Falsification ledger

Each row is the fix reverted in the tree, the instrument re-run, and the tree restored. Re-attachment is expressed as the pre-fix call form or as `.bind(record)` at the lift, whichever reproduces the receiver a bound site would hand with the smallest diff.

| Probe | Reversion | Observed | Claim under test |
| --- | --- | --- | --- |
| 1 | `applyConstraint?.(motion, view!)` → `constrain?.apply(motion, view!)` (`spec.ts:154`) | **exactly 1** — the apply row | 07 §Current state — _**one** for `apply`_ |
| 2 | both invalidate sites re-attached (`spec.ts:312`, `:477`) | **exactly 2** — scroll invalidator, policy invalidator | 07 — _**two** for `invalidate` … share one lift_ |
| 3 | `.bind` on the assembler's push (`free-drag/assemble.ts:108`) | **exactly 2** — retire hook, construction unwind | 07 — _**two** for `retire` … share the assembler's_ |
| 4 | all four sortable lifts re-bound (`sortable/assemble.ts:111`, `:158`, `:159`, `:164`) | **6 failed**; `y()` and `xy()` rows **passed** | D-93 — _re-binding the sortable's four lifts fails all six of its_ |
| 5 | only the sortable's `retire` push re-bound | **exactly 3** — retire site, unwind, aggregate | D-92 — _a single lift fails that member's row plus the aggregate_ |
| 6 | receiver dumped at the sortable unwind, conforming tree | `count: 1`, `isArray: [true]`, `isOwn: [false]` | D-93 — _the unwind hands the hook the internal array, so `=== undefined` was genuinely false there_ |

Probes 1–3 are the three **independent lifts**, which is the right decomposition: the five sites are not five independently revertible things, and a falsifier stated per site would overclaim. Each lift falsifier fails every row its lift feeds and no other, which is what makes the rows attributable.

Probe 6 is the one that matters for the decision's honesty. D-93 rests on the claim that the stronger `=== undefined` assertion was false at the unwind in the **conforming** tree; had that been assumed rather than measured, the narrowing would have been a convenience rather than a correction. It was measured, and it holds in both tiers.

## What is closed

**Free drag publishes the obligation and nothing stronger.** [free-drag/feature.ts:88-93](../../../src/free-drag/feature.ts#L88-L93) states _never invoked with the contributed record as their receiver_, and [:96-101](../../../src/free-drag/feature.ts#L96-L101) adds _what the receiver **is** at any site is unspecified_ with the reason — a claim naming the receiver has to be re-derived whenever the calling code changes shape. The withdrawn clause survives only as a struck record at [07:418](../../../.plan/contract/07-free-drag-contract.md#L418), and `bare function` appears nowhere else in normative, source or test wording.

**The lift attribution is corrected and is accurate.** `MotionConstraint` now says the spec lifts `apply` and `invalidate` and the assembler lifts `retire` and owns both of its call sites, which matches [spec.ts:126-128](../../../src/free-drag/spec.ts#L126-L128) and [assemble.ts:108](../../../src/free-drag/assemble.ts#L108). CE4-01's secondary nit — _the behavior lifts … `retire`_ — is discharged.

**The fifth site is real and driven.** Both instruments gained a row that reaches the unwind by throwing from a later installer, so the hook runs on the construction path and nowhere else. Probe 3 and probe 5 confirm the unwind row fails together with its tier's normal-retirement row and independently of every other lift.

**CE4-02's drift is gone from live wording.** Corrected at [sortable/feature.ts:72](../../../src/sortable/feature.ts#L72), [sortable/slots.ts:10-13](../../../src/sortable/slots.ts#L10-L13), [03:246](../../../.plan/contract/03-feature-composition.md#L246), the code sample at [03:401](../../../.plan/contract/03-feature-composition.md#L401), and the test title at [assemble.browser.test.ts:112](../../../tests/sortable/assemble.browser.test.ts#L112). The old sentence is retained deliberately as a struck correction record at [03:248](../../../.plan/contract/03-feature-composition.md#L248), which is the right disposition — it is the antecedent the D-92 paragraph directly below reasons from, so deleting it would leave that paragraph pointing at nothing. Remaining matches for _the pair_ in the package are either unrelated uses or historical quotation inside decision rationale.

**D-93's marker and the deferred ledger match the tree.** Marked _Implemented, 2026-08-19_; no `Unimplemented (…)` marker exists anywhere; the §Decisions not yet implemented table is empty; `tests/decisions.node.test.ts` passes at 12. An empty table with no markers is the consistent state, and the instrument asserts both directions whether or not there is a row.

**The controls stayed non-discriminating.** Under probe 4 the only two survivors were _should leave y() working through the same lifted sites_ and _should leave xy() working through the same lifted sites_; under probe 3, _should retire detached as well_ and the `bounds()` row passed. That is F-74 demonstrating itself in both tiers — the recorded controls prove nothing about the convention, which is why they are recorded as controls.

## CE5-01 — COVERAGE's second-tier paragraph contradicts the banner above it

**Low. Documentation, and it is the paragraph a reader reasons from.**

[tests/COVERAGE.md:758](../../../tests/COVERAGE.md#L758) opens the section with the correction: counts are five per tier, the assertion form is `receiver !== own()` in both, `=== undefined` was a mechanism claim. Four lines later, [:762](../../../tests/COVERAGE.md#L762) still reads:

> **The rows assert the receiver is never the record the installer returned, not that it is `undefined`.** Measured rather than assumed: the **four** lifted members disagree on what `this` _is_ … while `measure` is read into a local and `retire` is pushed into `retireHooks`, so **both receive `undefined`**. **Free drag's rows can assert `undefined`** because **every one of its members is lifted into a local**; porting that assertion here would fail the conforming tree at **two** sites…

Three of those claims are false against the tree:

1. **Free drag's rows do not assert `undefined`.** They assert `!== own()` — [anchor.browser.test.ts:147](../../../tests/free-drag/anchor.browser.test.ts#L147) says so in its own header, and D-93 withdrew the assertion.
2. **Not every free-drag member is lifted into a local.** `retire` is pushed into `retireHooks` by the assembler, which is the attribution D-93 corrected on `MotionConstraint` in the same pass.
3. **The count is three of five, not two.** The sortable instrument's own header ([calling-convention.browser.test.ts:24-27](../../../tests/sortable/calling-convention.browser.test.ts#L24-L27)) says three.

The reason this is recorded rather than waved through is that D-93's _Supersedes_ cell names **_07's and COVERAGE's `each of the constraint's four call sites`_** explicitly. 07 was corrected; COVERAGE's free-drag row was corrected; this paragraph — in the same file, in the section the correction banner was added to — was not. It is the same shape as CE4-02: a corrected sentence shipping four lines from its uncorrected twin, with the twin carrying the reasoning. A reader who reaches :762 first concludes free drag and the sortable assert different things, which is precisely the two-formulations-in-one-package defect D-93 exists to remove.

## CE5-02 — the free-drag instrument still enumerates four rows

**Low. Test wording, in the file D-93 rewrote.**

[anchor.browser.test.ts:268-272](../../../tests/free-drag/anchor.browser.test.ts#L268-L272):

> **D-90's falsifier, one site per row** (CE1-03). The **four** rows below are driven so that each reaches exactly one of the constraint's call sites … Returning **all** of them to bound — the maximally non-conforming tree the decision forbids — fails **all four**.

There are five rows; the file's own header three sections above was rewritten to say five. The count is the same enumeration error D-93 was opened to correct, left in the one file whose job is to defend against it.

**Secondary, and worth separating:** that comment's aggregate claim — _returning all of them to bound … fails all four_ — is prose with no row behind it. The sortable has _should never hand any site the installer record_ pinning exactly that; free drag has no equivalent, so the aggregate is only ever established by running the three lift falsifiers by hand, as this review did. That is not a contract violation — the per-site rows are the discriminating part and they are total — but a claim stated in the instrument and pinned nowhere in it is the shape CE1-03 was.

## CE5-03 — the ledger rows D-93 supersedes in substance were not struck

**Low. Normative bookkeeping.**

D-93's _Supersedes_ cell names three things: D-90's _calls them as bare functions_, 07's and COVERAGE's four-call-site enumeration, and free drag's `=== undefined` assertions. It does not name the parallel enumerations in the ledger's own D-90 and D-92 rows, and neither row was struck or corrected.

[00-index.md:383](../../../.plan/contract/00-index.md#L383) (D-90) still states, in the present tense:

- _**three members reached through four sites**_ — measured: five sites;
- _binding the assembler's `retire` fails **the fourth**_ — measured: fails the fourth **and** the fifth (probe 3);
- and closes on _the unstated convention at `MotionConstraint`'s **three** call sites_.

[00-index.md:394](../../../.plan/contract/00-index.md#L394) (D-92) still states:

- _fails **five** rows_ — measured: six (probe 4);
- _the **four** sites disagree on what `this` is_ — measured: five;
- _would fail the conforming tree at **two** sites_ — measured: three.

The ledger therefore carries three different site counts for one convention, in three rows of the same table, with only the newest correct. This file's own practice everywhere else is to strike superseded text in place and correct it — both of these rows already contain `~~…~~` corrections made for exactly this reason — so the omission reads as oversight rather than as a deliberate freeze of historical rows. The distinction that would justify leaving them is between a past-tense record of what was measured on 2026-08-18 and a present-tense claim about the instrument; D-90's _three members reached through four sites_ and D-92's _the four sites disagree_ are the second kind.

## CE5-04 — the mechanism claim moved tiers rather than leaving the package

**Informational.** Not a contradiction with D-93's letter, and recorded because it is the class of statement D-93 was taken to remove.

[free-drag/feature.ts:96-101](../../../src/free-drag/feature.ts#L96-L101) argues the general case:

> **What the receiver _is_ at any site is unspecified** … any claim naming it would have to be re-derived each time the calling code changed shape…

[sortable/feature.ts:83-88](../../../src/sortable/feature.ts#L83-L88), on the published declaration, names all five:

> `resolve` and `invalidate` are called off the flat slot record and receive it, `measure` and the normal `retire` receive `undefined`, and the **construction-unwind** `retire` receives the assembler's internal hook array.

It is accurate today, it is framed as the reason the promise is negative rather than as a promise, and its closing sentence tells the author that depending on any of those values is out of contract. So it does not violate D-93. Two observations stand anyway:

1. **Nothing pins it.** Both instruments assert `!== own()` only; no row asserts any receiver's value. Any of the five could change and the suite would stay green, which is how the free-drag enumeration became wrong in the first place — the defect CE4-01 reported was a receiver claim nothing measured.
2. **The two published declarations still describe the convention asymmetrically.** Before D-93 free drag was the stronger and wrong one; after it, the sortable is the more specific one. The asymmetry D-92 and D-93 were both taken to remove is smaller than it was and pointed the other way, rather than absent. An author reading both still finds one tier declining to name the receiver on principle and the other naming it exhaustively.

07 already states the rule this touches — _no sentence here may say where a member is called from_ — but scopes it to 07, and locates the code-level attribution in §How closure was measured on the grounds that it is _about the code rather than about the guarantee_. A doc comment on an exported type is the guarantee's own surface, which is where the scoping question sits.

## Verified in passing

- The `should retire detached as well` row and the `bounds()` control are intact and pass under every probe above, so the retirement coverage D-90 landed is unaffected by the narrowing.
- [assemble.browser.test.ts:112](../../../tests/sortable/assemble.browser.test.ts#L112) — the reference-identity row renamed away from _the geometry pair_ — now records in its own comment that it covers two of the four members by identity and that `retire` is covered where the unwind drives it. The sixth-row caveat from review 4 is therefore documented in the file rather than only in a review.
- [03:246](../../../.plan/contract/03-feature-composition.md#L246) keeps _pairing_ while dropping the count, and states why: the word names the **claim** rule — a resolver cannot be installed without its invalidator — not the number of members lifted. That is the correct half to keep.

LSP plugin - available; used: `documentSymbol` on `src/free-drag/assemble.ts` to confirm the unwind loop's binding structure before probing it; the rest of the pass turned on running reversions against the suite, observing receivers at runtime, and comparing prose counts against source — compile-and-run and text questions rather than symbol-graph ones.
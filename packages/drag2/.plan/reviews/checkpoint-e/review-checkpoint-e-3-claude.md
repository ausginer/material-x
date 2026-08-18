# Checkpoint E — re-verified closure of CE1-01…CE1-11 at the finalized D-88…D-91 state

- **Reviewer:** Claude
- **Date:** 2026-08-18
- **Subject:** targeted re-verification of [review-checkpoint-e-1-claude.md](review-checkpoint-e-1-claude.md) and [review-checkpoint-e-2-claude.md](review-checkpoint-e-2-claude.md) against the finalized tree
- **Tree:** `b0be6c4d` on `drag2/phase21`, working tree clean

**Scope.** The eleven CE1 findings and their remediations only. No new audit, no Phase 21 work, nothing fixed. Every probe below was made by editing the tree, running the gates, and restoring; `git status` is clean and the suite is green at the end.

## The state under review is the state review 2 examined

`git diff --stat 7cd46e31 HEAD -- packages/drag2/` reports **one changed file**: `review-checkpoint-e-2-claude.md`, added. The history was curated onto `drag2/phase21` and the Checkpoint E work now lives in `9fe21685 drag2: share activation snapshot and restrict free-drag actions`, but the `packages/drag2` content is otherwise byte-identical to the tree review 2 closed against. **No remediation landed after review 2.** This pass therefore re-derives the evidence from scratch rather than re-reading it, so the verdicts below rest on probes run today.

## Baseline

| Gate | Result |
| --- | --- |
| `npx just typecheck` | clean |
| `npx just test` | 49 files, **1004 passed, 25 skipped** — the 25 are still the muted `ENFORCE_BUDGETS` size suite |

## Verdict

**Ten closed. CE1-03 still open, on both halves, unchanged.** One item CE1-10's disposition owes is still outstanding, and the three prose contradictions review 2 recorded are all still standing.

| # | State | Evidence |
| --- | --- | --- |
| CE1-01 | **closed, discriminating** | probe 1 — removing the four `?: never` produces 13 test failures and 9 type errors, including three _unused_ `@ts-expect-error` directives |
| CE1-02 | **closed, discriminating** | probe 2 — restoring `deriveMotion` in the accepted arm fails exactly one row |
| CE1-03 | **open** | probe 4 — all three call sites reverted to bound, **1004 passed**; and the sentence D-90 names is still absent from `MotionConstraint` |
| CE1-04 | **closed, discriminating** | probe 3 — removing the guard fails exactly two rows, with four controls holding the boundary |
| CE1-05 | closed | 07 §I-36 `bounds` row states the caller's reading and strikes the false claim |
| CE1-06 | closed | 05 §Free drag strikes the `Partial` fragment and states the first-argument spread with D-83's mechanism |
| CE1-07 | closed | `sortable.browser.test.ts:771` asserts `FAILURE_ADMISSION` **read from the mapping** and `calls === ['onError']` |
| CE1-08 | closed | `item` and `visual` are gone from `FreeDragRuntime`, with the removal explained at `runtime.ts:12` |
| CE1-09 | closed | 07's `onEnd` row now reads _kernel-bracketed_ and names both call sites |
| CE1-10 | dispositioned; one item still outstanding | `shared/composition.ts:26` is still bare `root: HTMLElement;` |
| CE1-11 | dispositioned, nothing owed | unchanged |

## Falsification ledger — run today

Each row is the fix reverted in the tree, the full suite re-run, and the tree restored.

| Probe | Reverted | Result |
| --- | --- | --- |
| 1 | the four `?: never` on `FreeDragContribution` | **13 failed / 991 passed, 9 type errors.** `composition.declaration.test.ts` — _unused_ `@ts-expect-error` at the two annotated-installer rows and at all three unannotated-installer rows, plus `keyof` equality and four `never` assertions; `free-drag/feature.declaration.test.ts` fails the same way. **Discriminates**, and the _unused-directive_ form is the important part: it proves those objects genuinely compile without the exclusions. |
| 2 | `deriveMotion` restored in `anchorTarget`'s accepted arm | **1 failed / 1003 passed** — _the accepted anchor > should call no constraint between the release write and the join_. **Discriminates.** |
| 3 | the `Number.isFinite` guard in `action.prepare(TAG_POSITION)` | **2 failed / 1002 passed** — _should write nothing into the committed frame_, _should surface the misuse on the platform channel_. **Discriminates.** |
| 4 | all three constraint call sites returned to bound (`constrain?.apply(…)`, `guarded(() => constrain!.invalidate())`, `constrain?.invalidate()`), with the two lifted `const`s deleted | **49 files, 1004 passed, 25 skipped, no type errors.** **Does not discriminate.** |

Probe 4 is stronger than the pre-remediation mix review 2 reverted to: **every** site bound, which is the maximally non-conforming tree D-90 exists to forbid, and nothing in the package notices.

## The one finding that remains open

### CE1-03 — the source defect is fixed; neither half of what D-90 claims to have delivered is in the tree

**Severity: low–moderate.** It is the same class as the finding it answers — a convention nothing states, and a fix nothing pins.

**The defect is genuinely gone.** [spec.ts:130-132](../../../src/free-drag/spec.ts#L130-L132) lifts `apply` and `invalidate` off the record once, and all three sites — `deriveMotion` ([:158](../../../src/free-drag/spec.ts#L158)), the scroll/resize invalidator ([:316](../../../src/free-drag/spec.ts#L316)), `action.prepare(TAG_POLICY)` ([:481](../../../src/free-drag/spec.ts#L481)) — call them detached, matching `retire`, which `assemble` already pushed as a bare function. The three-way split is not in this tree.

**(a) The obligation D-90 states is not discharged.** [00-index.md:383](../../contract/00-index.md) records D-90 as _"Implemented … **One sentence on `MotionConstraint`**"_, and [07 §The motion constraint's calling convention](../../contract/07-free-drag-contract.md) closes with _"The obligation this creates is **one sentence on the type**, not machinery."_

The contract section itself did land, and it is well stated. **The type did not.** [free-drag/feature.ts:89-94](../../../src/free-drag/feature.ts#L89-L94) is unchanged: `apply` allocates nothing, `invalidate` is lazy by contract, and nothing about detachment, bare functions or `this`. `grep -rn "detach\|bare function\|depend on \`this\`" src/`returns no hit in either middle tier, and`grep -rn "D-90" src/`returns exactly one line — a comment inside`spec.ts`. `InsertionGeometry` is likewise silent, which matters because D-90's stated reason for choosing detached over bound was to spare the author who writes against both middle tiers from **two conventions in one package**: one convention, stated in neither tier, is not what that argument buys.

That comment, [spec.ts:115-116](../../../src/free-drag/spec.ts#L115-L116), asserts the missing artifact directly:

> The convention is stated on `MotionConstraint`: a contribution's members are invoked as bare functions and an author may not depend on `this`.

It is not. So the only source-side statement of the convention lives in the implementation file that already implements it, and the published middle-tier type a third-party installer author reads — the reader CE1-03 named, and the one D-70 opened the slot for — still says nothing. A contract section is a real improvement over nothing, but it is not the artifact D-90 twice names, and it is not the artifact `spec.ts` claims exists.

**(b) The fix is unpinned, and the row that claims to pin it cannot fail.** [anchor.browser.test.ts:192-231](../../../tests/free-drag/anchor.browser.test.ts#L192-L231) carries _should be called without this at every site_, and [COVERAGE.md:748](../../../tests/COVERAGE.md) maps it to D-90.

The fixture builds `detached` as an object literal with shorthand methods, lifts the three members onto a fresh record, and each body pushes a string into a closure array. **No body reads `this`.** A bound call therefore hands the fixture a `this` it never looks at, and the row passes identically either way — which probe 4 confirms empirically, at the maximal reversion, with the whole suite green. The test's own comment says a bound site _"shows up here as an undefined-`this` throw on the platform channel"_, and that is exactly what cannot happen to a member that ignores `this`.

This is the case the request asks about directly: **the fix does not merely make the test pass — the fix is real — but the test does not measure the fix.** It measures that a constraint assembled by hand still runs at every site, which is true of the pre-remediation tree as well. The recorded control beside it (_should leave the first-party `bounds()` working through the same sites_) is honestly labelled as non-discriminating per F-74; the row above it is labelled as discriminating and is not.

**What would close it** — naming what a closure pass has to show, not how:

- The convention stated where D-90 twice says it is, on the published middle-tier type — and [spec.ts:115](../../../src/free-drag/spec.ts#L115) made true, or reworded to point at where the statement actually lives.
- Some instrument that fails when the sites are bound. The falsifier is written down above as probe 4: apply it and the suite must not stay green. A fixture whose members ignore `this` cannot do it, whichever way it is driven.

## Still outstanding from the dispositions

**CE1-10.** The disposition in 00-index concludes that _"the one thing genuinely owed is a sentence documenting `root`'s per-tier meaning — a doc fix, not a redesign."_ [shared/composition.ts:26](../../../src/shared/composition.ts#L26) is still `root: HTMLElement;` with no comment, and no other file states the per-tier difference. `realm` is likewise bare; `report` carries the only doc comment in the record. The disposition's single deliverable is unwritten.

**CE1-11.** Nothing owed, nothing changed. Correct outcome.

## Contradictions still standing

All three from review 2 are unchanged; they are recorded again because they are still active text, not because behavior is wrong.

- **C-1** — [spec.ts:116](../../../src/free-drag/spec.ts#L116) asserts an artifact that does not exist. Folded into CE1-03 (a).
- **C-2** — 07's `anchorTarget` cell strikes _"Accepted → the visual's current viewport position"_ and then restates it verbatim and unstruck two clauses later, with the strike-note saying the sentence _"described the value correctly"_. A reader cannot tell whether it is retracted or restated. P18A-17's class.
- **C-3** — the I-36 Category-1 row added for CE1-02 says `apply` is reached from four seams _"each behind that seam's own barrier"_. In [`moved`](../../../src/free-drag/spec.ts#L398-L407) the `apply` is followed immediately by `lift.write` with no reading between them; in [`action.effect(TAG_POSITION)`](../../../src/free-drag/spec.ts#L561-L569) there is no reading in the seam at all. Only `activation.effect` places a reading between `apply` and the first thing that survives it. Independently, `moved`'s unchanged comment still reads _"The latch is read **before** the one consumer call in this seam"_ while the table the remediation just added establishes that the seam has two. The underlying barrier question is outside CE1-01…CE1-11 and is not opened here; what is in scope is that a cell states uniformly a property the tree holds in one of four places, and that a source comment now reads against the table beside it.

## One contract-level note on D-88's reach — not a reopen of CE1-01

D-88's mechanism is **key-set totality over the seven known keys**, and against that statement it holds exactly. It does not, and cannot structurally, refuse a key that is in neither record. Probed today:

```ts
const unknownSlot = () => ({ onGridSnap: (): void => {}, retire });
export const probe: FreeDragContribution = unknownSlot(); // typechecks clean
```

A hoisted unannotated installer carrying an unrecognized slot compiles into `plugins` and is discarded by an assembler that reads three slots — the same _"a supported middle-tier API taking a value and doing nothing with it"_ shape CE1-01 objected to, arriving from typo'd or future slot names rather than from the other behavior's capabilities. Closing it would need exact/branded contribution types, which is machinery D-88 deliberately did not buy and which nothing in the current evidence justifies. Recorded so a later reader does not read the `keyof` row as a stronger guarantee than it is, and so the residue is a known bound rather than a gap.

---

LSP plugin - available; not used: this pass turned on whether reverting a fix breaks a test, whether a named sentence exists in a file, and whether a hand-written probe typechecks — compile-and-run and text questions rather than symbol-graph ones. The symbol evidence CE1-08 and CE1-10 rest on was gathered with LSP in the first audit and is unchanged in this tree.
# Checkpoint E — closure of CE1-01…CE1-11 after the D-88…D-91 remediation

- **Reviewer:** Claude
- **Date:** 2026-08-17
- **Subject:** targeted closure of [review-checkpoint-e-1-claude.md](review-checkpoint-e-1-claude.md) against the second Checkpoint E remediation
- **Tree:** `7cd46e31 drag: checkpoint e`, working tree clean

**Scope.** Closure of the existing eleven findings only. CE1-10 and CE1-11 are read as dispositioned evidence rather than defects. No new audit, no Phase 21 work, nothing fixed. Every probe below was made by editing the tree, running, and restoring; `git status` is clean and the suite is green at the end.

## Baseline

| Gate | Result |
| --- | --- |
| `npx just typecheck` | clean |
| `npx just test` | 49 files, **1004 passed, 25 skipped** — the 25 are still the muted `ENFORCE_BUDGETS` size suite |

## Verdict

**Ten of the eleven are closed. CE1-03 is not.**

CE1-01, CE1-02 and CE1-04 are closed with evidence I falsified against the pre-fix tree — each fails when the fix is reverted, and CE1-01's new rows fail for the right reason rather than for TypeScript's weak-type check. CE1-05 through CE1-09 are mechanical and landed. CE1-10 and CE1-11 are dispositioned; the one doc sentence CE1-10's disposition says it owes has not been written.

**CE1-03 is a different case, and the source defect is genuinely gone**: all three `MotionConstraint` call sites are detached now, so the split I reported no longer exists. What remains open is both halves of what D-90 says it delivered — the sentence it names is not in the tree, and the fixture that claims to pin the change cannot fail. Reverting the three call sites to the exact pre-remediation mix leaves **all 1004 tests green**, including the row titled _should be called without this at every site_.

Three prose contradictions introduced by the remediation are recorded at the end. Both stated evidence limitations check out; I verified the second empirically rather than accepting it.

| # | State | Evidence |
| --- | --- | --- |
| CE1-01 | **closed, discriminating** | falsified — three `@ts-expect-error` rows go unused, `keyof` equality fails |
| CE1-02 | **closed, discriminating** | falsified — the accepted-anchor row fails when the re-derivation returns |
| CE1-03 | **open** | the named sentence is absent; the fix survives full reversion with 1004 tests green |
| CE1-04 | **closed, discriminating** | falsified — two `moveTo` rows fail when the check is removed |
| CE1-05 | closed | 07's `bounds` barrier cell rewritten and the false claim struck |
| CE1-06 | closed | 05's clause corrected to the first-argument spread, with the D-83 mechanism named |
| CE1-07 | closed | a sortable row now asserts `FAILURE_ADMISSION` from the mapping, with `calls === ['onError']` |
| CE1-08 | closed | both fields deleted, and the removal is explained where the model is described |
| CE1-09 | closed | 07's `onEnd` cell corrected to kernel-bracketed, naming both call sites |
| CE1-10 | dispositioned; one item outstanding | the owed `root` sentence is not in `src/shared/composition.ts` |
| CE1-11 | dispositioned, nothing owed | closed against the count |

## Falsification ledger

Each row is the fix reverted in the tree and the suite re-run.

| Reverted | Result |
| --- | --- |
| the three `?: never` additions on `FreeDragContribution` | `composition.declaration.test.ts` — unused `@ts-expect-error` at the three unannotated-installer rows, plus `keyof` equality and four `never` assertions; `free-drag/feature.declaration.test.ts` fails the same way. **Discriminates.** |
| `deriveMotion` restored in `anchorTarget`'s accepted arm | `anchor.browser.test.ts` — _should call no constraint between the release write and the join_ fails, 10 others pass. **Discriminates.** |
| the `Number.isFinite` guard removed from `action.prepare(TAG_POSITION)` | `anchor.browser.test.ts` — _should write nothing into the committed frame_ and _should surface the misuse on the platform channel_ fail. **Discriminates.** |
| the three constraint call sites returned to the pre-remediation bound/detached mix | **the entire suite passes: 49 files, 1004 passed, 25 skipped.** Does not discriminate. |

The fourth row is CE1-03 and is worked through below.

## The one finding that remains open

### CE1-03 — the source defect is fixed; both halves of D-90's delivered claim are not

**Severity: low–moderate**, and it is the same class as the finding it is answering — a convention nothing states, and now also a fix nothing pins.

**The defect itself is gone.** `src/free-drag/spec.ts:130-132` lifts `apply` and `invalidate` off the record once, and all three sites — `deriveMotion`, the scroll/resize invalidator, `action.prepare(TAG_POLICY)` — now call them detached, matching `retire`, which `assemble` already pushed as a bare function. The three-way split I reported does not exist in this tree.

**(a) The sentence D-90 names is not in the tree.** D-90 reads:

> **Implemented, 2026-08-16 (second Checkpoint E remediation).** **Contribution members are invoked detached; an author may not depend on `this`.** **One sentence on `MotionConstraint`**, and free drag's three call sites made consistent with it.

`MotionConstraint`'s declaration and doc block (`src/free-drag/feature.ts:75-94`) are unchanged from the pre-remediation tree. It says `apply` allocates nothing, that `invalidate` is lazy by contract, and nothing about detachment, bare functions or `this`. `grep -n "detach\|bare function\|D-90" src/free-drag/feature.ts src/sortable/feature.ts` returns nothing, and `grep -rn "D-90" src/` returns exactly one line — the comment inside `spec.ts`.

That comment (`src/free-drag/spec.ts:115`) asserts the missing artifact directly:

> The convention is stated on `MotionConstraint`: a contribution's members are invoked as bare functions and an author may not depend on `this`.

It is not. So the only statement of the convention lives in the implementation file that already implements it, and the published middle-tier type a third-party installer author reads — which is the reader CE1-03 named, and the one D-70 opened the slot for — still says nothing. `InsertionGeometry` on the sortable side is likewise silent, which matters because D-90's stated reason for choosing detached over bound was to avoid _"two conventions in one package for the author who writes against both middle tiers"_: one convention, stated in neither tier, is not what that argument buys.

**(b) The fix is unpinned, and the row that claims to pin it cannot fail.** `tests/free-drag/anchor.browser.test.ts` §a detached constraint carries _should be called without this at every site_. Reverting the three call sites to their pre-remediation form —

```ts
slots.constrain?.apply(motion, view!); // bound
guarded(() => {
  constrain.invalidate();
}); // bound
slots.constrain?.invalidate(); // bound
```

— leaves that row passing, that file passing 11/11, and the whole suite at 1004 passed.

The reason is in the fixture. Its members push a string into a closure array and never read `this`, so bound invocation (`this` = the contribution object) and detached invocation (`this` = `undefined`) are observationally identical for them. Lifting them out of the record inside the fixture — `apply: detached.apply` — pre-applies the library's own transform, which removes rather than exercises the difference under test.

The row's comment also predicts the wrong failure mode:

> The tree was split three ways, so a bound site shows up here as an undefined-`this` throw on the platform channel rather than as a wrong value.

A **bound** call supplies a defined `this` and cannot throw for that reason. The hazard the convention exists for is the reverse: a `this`-**reading** member invoked detached. No fixture in the tree has one.

`tests/COVERAGE.md` §The second Checkpoint E audit is precise about which fixes were falsified — _"D-88 and D-91 were falsified against the pre-fix tree… D-89 needed its fixture rebuilt before it discriminated at all"_ — and it does not claim D-90 was. The gap is that the table nonetheless lists the row as D-90's evidence, beside the `bounds()` row it correctly labels non-discriminating. Both are non-discriminating.

This is the standard the remediation itself sets twice: D-88's own note that _"a fix leaving the suite unchanged is unpinned exactly where the boundary escaped"_, and F-74's that a guard whose only test cannot fail is indistinguishable from a deleted one. I am not proposing a fixture; I am recording that the promised property is the one property here that nothing holds.

## The two stated evidence limitations

Both are accurate. I checked the second rather than accepting it, because it is the one that decides whether a real property was left unpinned.

**"The accepted anchor has no directly observable public value" — accurate, and nothing is lost by it.**

Free drag arms a landing only when `current.domain?.type !== 'accepted'`, so `holdForLanding` is never called on that arm, `attempt.start` stays `null`, and `armSettlement` returns `ARM_ARMED` without ever building a `LandingContext`. The kernel's authoritative pin is written in the join and `owned.presentation.dispose()` runs in the same `finally`, so the value exists for one statement and is released. There is no public surface that reads it.

More to the point, **the value cannot differ between the two trees**: the deleted re-derivation recomputed from the same committed frame with the same constraint state, which is why `release.effect`'s write and the anchor agreed before the fix and agree after it. The property D-89 actually asserts is _the constraint is not re-entered_, and that is pinned discriminatingly. So the substitute — the two `home` rows on the arms that do reach a landing — leaves no promised property unheld, and 05's _the anchor still equals `originRect` plus the committed delta_ is genuinely unreadable through the public surface rather than merely inconvenient.

**"Destroy-before-`anchorTarget` cannot discriminate D-89 because the kernel skips the seam" — accurate, verified.**

I instrumented `anchorTarget` to report on entry and drove two paths:

| Path | `anchorTarget` entries |
| --- | --- |
| `onDrop` returns a resolution whose `type` accessor calls `destroy()` | **none** |
| ordinary rejected drop with a configured `home` | one, `host.closed === false`, `domain.type === 'rejected'` |

So the seam is not reached at all once the controller is closed, and the accepted arm additionally cannot be reached in that state by construction: `settlement.prepare`'s `if (host.closed) return true` runs before `draft.domain` is written, so a destroy from the one consumer call on that path leaves the domain `null` rather than `accepted`. There is no fixture that can tell the two trees apart on the barrier half, and the file is right to say so rather than write a row that passes either way.

One observation that follows and is **not** a finding: the same fact makes the `host.closed` read inside `anchorTarget`, immediately before `home`, currently unreachable. It is defence in depth against a kernel-side ordering change, it costs one comparison on a once-per-drop path, and nothing about it should move on this evidence.

## Contradictions introduced by the remediation

Reported because they are new text, not because they are defects in behaviour.

**C-1 — `src/free-drag/spec.ts:115` asserts an artifact that does not exist.** Folded into CE1-03 (a) above; listed here so the three are countable together.

**C-2 — 07's `anchorTarget` row strikes a sentence and then restates it.** [07-free-drag-contract.md](../../contract/07-free-drag-contract.md) §The seam mapping, the `anchorTarget(current)` cell:

> …no consumer call and no DOM read — which is what the seam's own comment already claimed. ~~Accepted → the visual's current viewport position~~ described the value correctly and the method wrongly. **Accepted → the visual's current viewport position.** Rejected or canceled → `home(subject)`…

The struck clause reappears verbatim and unstruck two clauses later. A reader cannot tell whether the sentence is retracted or restated, and the note explaining the strike says the sentence _"described the value correctly"_ — which is the case for keeping it. This is P18A-17's class: prose left standing beside the edit that superseded it.

**C-3 — the new I-36 Category-1 row asserts a uniformity two of its four seams do not have, and `moved`'s own comment now contradicts it.** The row added for CE1-02 reads:

> `apply` is reached from `activation.effect`, `moved`, a `TAG_POSITION` effect and `release.prepare` — D-81's four — **each behind that seam's own barrier**.

In `moved` (`src/free-drag/spec.ts:398-407`) the third-party `apply` is followed immediately by `lift.write` with no reading between them; the latch is read after the write, before `onMove`. In `action.effect(TAG_POSITION)` (`:551-570`) there is no reading in the seam at all. Only `activation.effect` places a reading between `apply` and the first thing that survives it, and that placement is E-02's fix, described in the row directly above.

Independently, `moved`'s unchanged comment says:

> The latch is read **before** the one consumer call in this seam (I-36).

naming `onMove`. The whole point of the row the remediation just added is that `constrain.apply` is a declared slot the behavior invokes; after it, `moved` has two, and the source comment says one.

I am deliberately not opening the barrier question that sits underneath this — it is outside CE1-01…CE1-11 and I was asked not to expand. What is in scope is that the cell states a property uniformly where the tree holds it in one of four places, and that a source comment the remediation left alone now reads against the table it added.

## Disposition tracking

Not defects, recorded so the ledger closes against something.

- **CE1-10.** The disposition in 00-index concludes: _"the one thing genuinely owed is a sentence documenting `root`'s per-tier meaning — a doc fix, not a redesign."_ `src/shared/composition.ts:26` still reads `root: HTMLElement;` with no comment, and no other file states the per-tier difference. The disposition's own single deliverable is outstanding.
- **CE1-11.** Closed against the count in the ledger. Nothing owed and nothing changed, which is the right outcome.

## What would close CE1-03

Naming what a closure pass has to show, not how.

- The convention stated where D-90 says it is, on the published middle-tier type rather than only in `spec.ts` — and `src/free-drag/spec.ts:115` made true, or reworded to say where the statement actually lives.
- Some instrument that fails when the three call sites are bound. The falsifier is already written down: revert `applyConstraint?.(…)`, `guarded(invalidateConstraint!)` and `invalidateConstraint?.()` to their bound forms and the suite must not stay green. A fixture whose members ignore `this` cannot do it, whichever way it is driven.

---

LSP plugin - available; not used: this pass turned on whether reverting a fix breaks a test and whether a named sentence exists in a file, which are compile-and-run and text questions rather than symbol-graph ones; the symbol evidence CE1-08 and CE1-10 rest on was gathered with LSP in the first audit and is unchanged here.
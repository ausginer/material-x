# First clarity batch: cleanup review

**Reviewed:** `947adc7b8` against `772069f66`, branch `drag2/terminology-ste`. Files were read at `947adc7b8`. Lens: cleanup (code discipline).

## Summary

The batch does what the plan says. The four renames are the only executable change, and the bundles are byte-identical. The comment rewrite keeps nearly all technical meaning. I found four small wording problems (tier C, internal comments only) and one existing claim that the code contradicts. Nothing blocks the batch.

## Scope

**Covered:** the four changed files — `src/kernel/kernel.ts`, `contract/02-kernel-behavior-contract.md`, `terminology-ste-brief.md` and `plan.md` — and the plan's "First clarity batch" section, the brief, and `CONTRIBUTING.md` Part I/II and `documentation.md` §5.

**Not covered:** the other pilot findings, other `tail` and `leaf` uses outside `kernel.ts`, and performance. I did not rerun tests, typecheck or lint. The plan reports them passing, and the emit check below leaves no code change for them to catch.

## Verification

**Executable change is limited to the four private renames.**

- I compiled both versions of `kernel.ts` with esbuild (type stripping only), removed comment lines, and substituted `#startTail`, `#cancelTail`, `#movedLeaf` and `#tail` in the old output. The two outputs are identical.
- `git diff --name-only` shows no change under `src/` other than `kernel.ts`. The API, the SPI (`landingTail`, `LandingTail`) and runtime messages are untouched. No string literal in the diff changed.

**Exact bundle sizes.** I built both commits and ran `bench/size/measure.ts --files`, then compared the emitted files byte for byte.

| Composition    | Minified B (both) | Brotli B (both) |
| -------------- | ----------------- | --------------- |
| minimal        | 33723             | 10329           |
| complete       | 35032             | 10791           |
| kernel root    | 20337             | 6418            |
| both behaviors | 42572             | 12298           |

- All 15 `measured/` bundles are byte-identical, and so are their Brotli sizes. The plan's rounded figures (10.33, 10.79, 6.42 kB) match the exact ones.
- The 13 `entry.js` fixtures differ only in the absolute checkout path, so they are not part of the comparison.
- The published declarations are 115605 B in both builds.
- None of the old or new private names appears in any bundle.
- I checked that the instrument can see the change: the measured graphs include `kernel.ts`, so an identical result is evidence rather than a blind spot (`CONTRIBUTING.md` §15).

## Findings

Tier C means internal only. No consumer reads these comments, and nothing the repository relies on depends on them.

### cleanup-1 (C): the "one slot" example describes a state the code does not reach

_Carried over from the original text, not introduced. This is the plan's question 1._

- **Claim.** The `#landingAnimation` comment says two landing animations can coexist in principle. It gives this case: drop one item, drag and drop a second, and the first may still be running.
- **Code.** `#acquireActivation` calls `#cancelLandingAnimation()` first, before every activation. The second drag cannot activate while the first animation is running. `#startLandingAnimation` replaces the slot without cancelling, so two animations would need two joins with no activation between them. I found no path to that, but I did not search exhaustively.
- **Why it matters.** The comment gives this state as the reason for a single slot. A maintainer is told to guard against a case that the activation order already rules out, and is not told that the activation order is what makes one slot enough.
- **Required property.** The example in the comment is a reachable state, or the stated reason for the single slot does not depend on an unreachable one.
- **Handling.** The batch correctly left this unrepaired. Whether the reason is the cancel at activation or a missed path is an owner or architect decision. The rewrite only changed "gliding" to "running".

### cleanup-2 (C): three degree words changed meaning

_Introduced by the batch._

| Location | Before | After | Change |
| --- | --- | --- | --- |
| `#joinSettlement` doc | "what makes the tail **sound**" | "what makes the landing animation **safe**" | "Sound" means correct. "Safe" claims protection from harm. |
| comment before `landingTail` call | "whether this drop has a **journey worth interpolating**" | "whether this drop **needs** an animation" | "Worth" is a judgment about value. "Needs" is a requirement. |
| `#retireAttempts` doc | "outlives the operation **deliberately**" | "**can** outlive the operation" | The intent is dropped, and "can" is weaker than the code's "does". |

- The first is in the passage that finding `pilot-5` disputes. The plan says that passage keeps its meaning, and a changed adjective is a small exception to that.
- **Required property.** A rewrite keeps the original's degree of certainty and its kind of claim (`terminology-ste-brief.md` §3).

### cleanup-3 (C): `#callMoved` comment uses "arrow" in three roles

_Partly introduced._

- **Text.** "It is a field, not an arrow at the call site … The emitted bundle keeps that arrow. It is an arrow, not a prototype method."
- **Problem.** The field is an arrow function, so "not an arrow" and then "is an arrow" within a few lines read as a contradiction. "That arrow" could mean the inline arrow or the field. The original "keeps the arrow" was already ambiguous, and the new text adds a second use of the word next to it.
- **Not checked.** I did not verify the claim that the bundle keeps the closure. It was in the original, and the batch kept it without checking.
- **Required property.** Each use of "arrow" names one thing: the inline arrow that is not used, or the field.

### cleanup-4 (C): vocabulary is mixed inside one document and across files

_Known scope limit, noted for the next batch._

- In `02-kernel-behavior-contract.md`, the changed line `startLandingAnimation(from, target)` sits one line above "no tail". The plan lists this as intended, because contract prose that says "tail" keeps its text.
- `phases.ts`, `presentation.ts`, `spec.ts`, `shared/landing.ts` and `sortable/slots.ts` still say "the tail". `kernel.ts` now says "landing animation". The member name `landingTail` links the two, and the new comments put it in backticks where they mention it.
- **Required property.** A reader of one concept finds one term, or a stated reason for two. The next batch decides this; it is not a defect in this one.

## Assessment of the two recorded questions

**Question 1** is cleanup-1 above. It is an existing claim, not an introduced problem.

**Question 2** (the "inverse of `space`") is not a defect.

- `ActivationRecord.visualSpace` is documented as the inverse of the linear part the visual inherited.
- The code applies `space` directly (`a·dx + c·dy`), which fits that.
- The original comment said "the inverse of the space above the visual", so the new "through `space`, the inverse of the space above the visual" has the same meaning. It adds the parameter name.
- The pilot's reading ("the inverse of `space`") was its own misreading, and the plan's note is accurate.
- The word "space" still carries several meanings in this file, but that is outside the batch.

## Checks with no defect

- **Preserved:** the `translate` versus `transform` reasoning, the additive composition, the unit change through `space`, the best-effort continuity, and the three-way reason for `cancel()`. The bullet form of the `#startLandingAnimation` doc keeps every condition I compared.
- **New precondition is supported:** "Call this after presentation is disposed" matches the call site and the ordering comment. `dispose()` is the actual method name there, so the brief's concern about renaming `dispose` does not apply.
- **`null` slot:** "`null` means that no animation is in flight" is the true direction. The old "`null` when nothing is in flight" was not true after an animation finished, because the slot is never reset. This is a side effect of the rewrite, and it is an improvement.
- **Documents:** the brief edits are accurate, and the plan's lists of changed and unchanged references match the diff. The shipped `.d.ts` is unchanged, so `documentation.md` §5.1 is not engaged.
- **Names:** `#landingAnimation`, `#startLandingAnimation` and `#cancelLandingAnimation` match the published `landingTail` role without sharing a name. `#callMoved` names the action. All four are private.

## Unresolved

- cleanup-1 needs an owner or architect decision.
- cleanup-2 and cleanup-3 are small enough to fix in the next batch.

**Next task:** the owner reviews this report, then decides cleanup-1 and the scope of the next batch.
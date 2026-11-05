# Comment reduction: cleanup review

**Reviewed:** `9b2cc4516..738fd813b`, branch `drag2/terminology-ste`. Files were read at `738fd813b`. Lens: cleanup (code discipline).

## Summary

The reduction removes repetition and keeps nearly all reasons, conditions and technical meaning. Executable code is unchanged. I found two small wording problems (tier C, internal comments only). Nothing blocks the batch. The recorded activation-measurement question is untouched and unresolved.

## Scope

**Covered:** the two changed files (`src/kernel/kernel.ts` and `plan.md`), the brief, `CONTRIBUTING.md` Part I/II and `documentation.md` §5. I compared each edited comment with its original and with the code around it.

**Not covered:** other files, the pilot's other questions, and performance. I did not rerun tests, typecheck, lint or the bundle comparison. I used the plan's bundle evidence. This diff changes no executable code, so I found no reason to repeat it.

## Verification

- **Executable code is unchanged.** I listed every changed line in `src/` that is not a comment line. Only two remain: the trailing comments on `return; // no measurement` and `return; // the visual is already where the drop decided`, both removed. No identifier, string literal or statement changed.
- **"Once per committed settlement" is correct.** `#measureTarget` has one call site, at `kernel.ts:1720`, inside `if (outcome === SEAM_COMMITTED)`.
- **The `#acquireActivation` comment is not touched by this diff.** The activation-measurement question stays as the plan records it. I did not resolve it and I treat it as separate from the pilot questions.
- **Preserved as intended:** the `translate` versus `transform` reasoning and its three reasons, the `space` projection and the `null` for both lifted modes, the `=== null` rule for `targetX`, the detached-placeholder warning, the unwind reasons, the `cancel()` versus `finish()` reason, and the allocation reason for `#callMoved`.
- **Cancellation rules are consistent.** `#landingAnimation` now states them once. `#retireAttempts` no longer repeats them. Both agree with the code: `#cancelLandingAnimation` is called at lines 716 and 1298 only, from teardown step 7 and `#acquireActivation`.

## Findings

### cleanup-1 (C): ambiguous "It" in `#startLandingAnimation`

- **Current text:** after the bullet list ending "...need no handling.", the next paragraph starts "It adds to the individual `translate` property."
- **Why it is a problem:** the nearest subject is the last bullet's "the element". The animation is meant, and the brief asks for explicit references when more than one object could fit. The original said "The animation adds to...".
- **Evidence:** `kernel.ts` lines 1519–1530 at `738fd813b`.
- **Required property:** the sentence names the animation as its subject.

### cleanup-2 (C): two supporting reasons were shortened to bare claims

- **`#measureTarget`:** the original said the call is unconditional and "cannot be conditional", because the behavior's policy is asked with the delta this measurement produces. The new text says the call "does not depend on whether an animation follows" and that `landingTail` receives the delta. The reader must infer why the call cannot be skipped.
- **`#joinSettlement` `finally` comment:** the original gave the reason for "Nothing above it can throw today": the sample is a kernel-private read. The new comment keeps the claim without the reason, so a later edit cannot tell what to re-check.
- **Why it is a problem:** `documentation.md` §5.2 keeps the consequence of breaking a constraint. In both places the claim stays but the cause is gone.
- **Required property:** each comment keeps the cause beside the claim, or the claim is dropped.

## Observations, no defect

- The `anchor === undefined` comment no longer says the operation joins immediately and ends normally. The code shows this, so the omission is acceptable.
- "Read back from the same record" now depends on the `originRect` comment directly above it. That is clear at this position.
- The plan's word and line counts were not recomputed.

## Next

No required action. The owner may fix cleanup-1 and cleanup-2 in the next batch or accept them.
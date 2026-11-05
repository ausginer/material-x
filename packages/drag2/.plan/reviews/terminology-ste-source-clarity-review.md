# Source clarity unit: cleanup review

**Reviewed:** `2f96cf3d4..0e84c7ed5`, branch `drag2/terminology-ste`. Files were read at `0e84c7ed5`. Lens: cleanup (code discipline).

## Summary

No defect was introduced in executable code, API, SPI, runtime messages or size attribution. I found one tier C finding: a current contract passage and a test comment still use renamed identifiers. The comment rewrites I read keep their reasons and conditions. The ESLint errors are the same 14 as at the input. The preserved questions are separate from this finding, and I did not resolve them.

## Scope

**Covered:** all 62 files in `src/` (executable and type level), current references to the renamed identifiers, the ESLint run at both revisions, the size attribution, and a sample of rewritten comments and published JSDoc (`drag.ts`, `kernel/spec.ts`, `sortable/rect-index.ts`). Brief, `plan.md` entries, `CONTRIBUTING.md` and `documentation.md` §5 were read.

**Not covered:** a line-by-line comparison of all rewritten comments (about 1,100 comments, rewritten by six agents). Tests, typecheck and the bundle build were not rerun. Readability was not measured. The questions the plan lists as unconfirmed were not validated.

## Verification

- **Executable code is rename-only.** I re-emitted every source file at both revisions with esbuild (comments removed) and substituted the plan's names, module paths and local parameter names in the old output. All 62 files are equal, except one import that moved to its sorted place in `kernel/kernel.ts`. The same comparison on the TypeScript printer output (`removeComments`, types kept) is equal too. No type, signature or exported name changed.
- **API, SPI and messages are unchanged.** The three public entries (`drag.ts`, `free-drag.ts`, `sortable.ts`) and `kernel/spec.ts` differ only in comments and that one import. Every runtime string is the same, including `drag: seam/failed-then-threw`, `drag: unwind/step-failed` and `drag: composition/unwind-failed`. Only the module path strings changed.
- **Size attribution reproduces.** The plan's two increments follow from the renamed unmangled property names. At the input, `runCore`, `runLeaf`, `runLeafValue` and `runUnclassifiedValue` occur 6, 4, 1 and 2 times. With their length deltas of 6, 4, 7 and 7 that is 73 B. `runIngress` and `isInSeam` occur 2 and 1 times, with deltas of 4 and 9, which is 17 B. The comment commits change no bundle (the plan reports 15 identical `measured/` bundles; I used that evidence). The re-declared controls form a chain from `2f96cf3d4` through `678a6ab18`.
- **ESLint errors are the input's.** I ran ESLint on `src` at `2f96cf3d4` (scratch worktree, removed) and at `0e84c7ed5`. Both report 14 errors. The files and rules are the same: `consistent-return` ×5, `no-unnecessary-condition` ×7 and `only-throw-error` ×2. Only line numbers moved, and `seams.ts` became `behavior-runner.ts`. The plan's wording "not run at the input" is now answered: none is new.

## Findings

### cleanup-1 (C): current text still uses a renamed identifier

- **Current text:** `contract/02-kernel-behavior-contract.md` lines 204, 211, 213 and 215 name `openStage`. The source renamed `#openStage` to `#runningStage`. These passages are in present tense (the "driver's point covers the window it marks"). The plan lists identifiers in 02 as updated. `tests/sortable/activation-barrier.browser.test.ts:9` also refers to `invalidateInSeam()`, which no longer exists. That comment describes the defect in the past tense and may be dated, so the owner decides whether it counts as a record.
- **Why it is a problem:** the brief and the plan say current documentation that depends on an implemented rename is updated. A reader searching the source for these names finds nothing, and `runningStage` appears nowhere in 02.
- **Evidence:** `git grep -n openStage -- .plan/contract` at `0e84c7ed5`; `git grep invalidateInSeam -- src tests`.
- **Required property:** current contract text names identifiers that exist, or states that the passage is dated.

## Observations, no defect

- **Comment rewrites read:** the rewrites I compared with the originals keep their conditions, reasons and degree of certainty. Examples: the `RectIndex` and `DisplacementSettle` JSDoc (the "cancelled" wording matches `layout-animation.ts`), `BehaviorContext` in `kernel/spec.ts`, and the `drag.ts` header. Where a file lost a sentence, the sentence repeated a later one. A count of reason words (`must`, `only`, `because`, `unless`, `until`, …) in comments drops in no file.
- **Removal was small:** comments went from 1,102 to 1,089 and words by about 2 %. A search for comments that narrate the next statement found one. Most of the unit is rewriting, so word count and bold removal (836 to 1) do not show clarity, and clarity was not measured. Remaining history words in comments are ordinary uses ("earlier step", "now owned"), not implementation history.
- **One term, two names:** published JSDoc (for example `BehaviorContext.fail`) now says "kernel-driven call into behavior code", while the runtime messages, the README and the contract keep "seam". The plan states this. A reader moving from JSDoc to the contract meets both words. This is the owner's open terminology question, not a defect of this unit.
- **Preserved questions I checked:** four claims in the plan's table match the code, so those questions are real. The "twelve" stage constants appear in published text (`drag.ts:34`, `kernel/errors.ts:17`) while `kernel/failures.ts` exports ten `FAILURE_*` constants. The `sortable/rect-index.ts` comment says the values are reallocated only when the collection outgrows them, but the branch at line 245 also reallocates when capacity exceeds `4 * length`. `linear-shift.ts:144` says every invalidation discards `#rowDistance`, but `#abandonCache` does not reset it. `free-drag/spec.ts:317` says there is no composed-path search, but `admit` calls `path.indexOf(this.#root)`. They existed at the input and the unit preserved them. I did not validate the others. The first is published text and belongs to the owner and architect. `pilot-1` to `pilot-9` and the activation-measurement question were not touched.
- **Untracked files:** `packages/drag2/.plan/free-drag.json` and `sortable-basic.json` appeared in the working tree during this review. They are not mine and were not committed.

## Next

No blocker. The owner may fix cleanup-1 with the next documentation change or accept it.
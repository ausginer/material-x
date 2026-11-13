# `coordinates` finiteness test: assessment

**Read:** [`coordinates-finiteness-report.md`](coordinates-finiteness-report.md) at `810021e0b` and the test at `0e90ec136`, on `box-quad/numeric-storage`. **Against:** [`coordinates-finiteness-handoff.md`](coordinates-finiteness-handoff.md) at `7132974b1`, and `BQ-12` property 5 in [`plan.md`](plan.md). Assessed by the architect on 2026-11-13.

**Outcome: accepted. reviewer-1 is closed, and `BQ-12` has no pending proof.** The batched rewording of `BQ-12` property 12 is in §3. No check was rerun, and no source changed.

## 1. What the architect checked

The report's runs are used as they stand. The architect checked these claims directly:

| Claim | Result |
| --- | --- |
| The unit touches only its boundaries | Yes. `7132974b1..810021e0b` changes `tests/coordinates.browser.test.ts`, with 27 lines added, and adds the report. `src/` and `tests/support/fixtures.ts` are unchanged |
| The test is where the handoff put it | Yes, in `describe('coordinates recognized limits')`, right after "should preserve every output sentinel on a recognized failure" |
| The fixture is connected and 2D | Yes. `createBox` appends to `document.body` or to the given parent. Its default styles set no `transform`, `perspective` or `transform-style`, and the ancestors set only `scale(1e38)` |
| The mutation is the one the review reported | Yes. `out[BOX_A] = a;` is the first write after `if (!finite(a + b + c + d + width + height))` in `src/index.ts`. Moved above that check, it writes the non-finite `a` into slot 0, and the test's `toStrictEqual` against `11` there fails |

## 2. Against the handoff

| Handoff property | Met by |
| --- | --- |
| 1. Reaches the finiteness check through the DOM | Nine nested `200px` boxes at `scale(1e38)` around one default box, the review's configuration |
| 2. The test shows the earlier checks pass | Before the call it asserts one client rect, `ancestry(source, space)` returning `true`, and a non-finite `space[SPACE_A]`. The element's own style is 2D, so `composeNode` can't refuse. Under another engine that refuses earlier, the test fails at a precondition instead of passing without reaching the check |
| 3. The output is untouched | `coordinates` returns `false`, and a `number[]` of eight distinct values passes `toStrictEqual` against a fresh copy. That checks values, `length` and keys |
| 4. The form without `above` | `coordinates(source, out)`. No `above` case was added, which the handoff allowed |
| 5. One behavior per `it`, named with "should" | "should preserve every output value when the result is not finite" |
| Witness | The report gives 1 failed and 239 passed under the mutation, with only the new test failing. After the revert, `git diff -- packages/box-quad/src` was empty |
| Verification | 239 passed at the base and 240 after. box-quad's typecheck and the test file's lint were clean, and `git diff --check` was clean |

The report's choices are accepted:

- **The storage is `number[]`.** A typed array can't gain keys or change its `length`, so a `number[]` is the store on which the keys and `length` assertion can fail.
- **No `above` case and no extra storage kinds.** Both were optional.
- **The fixtures file is unchanged.** The test needed no new helper.

**No return condition was hit.**

**Nothing is open.** The mutation evidence and the required path both hold from the report and the code. A rerun wouldn't answer any open concern.

## 3. The batched wording correction

`BQ-12` property 12 said a drag unit "reads that output as drag's clean result". The output is drag's `npx just typecheck` exiting 1 with exactly drag2's two `TS2724` errors. That isn't a clean pass, and calling it one invites a later reader to cite a failing typecheck as clean.

**It now says** the typecheck doesn't pass, and a drag unit reports the output as an expected set of known errors from the drag2 exclusion, not as a clean pass and not as a base failure. What a unit must check is unchanged: exactly those two errors, and any other error, or any error under `packages/drag/`, is a failure. So this is a wording edit under [`documentation.md`](../../../.agents/docs/documentation.md) §6. It is made in place with no new id, and the old wording is kept beside the new in:

- `BQ-12`'s row in `plan.md`;
- the record entry "BQ-11 lands without drag2, as BQ-12";
- [`numeric-storage-assessment.md`](numeric-storage-assessment.md) §3.

## 4. What stays separate

- **`F-1`** stays open.
- **drag's five red size rows** are still the base's.
- **drag2** is untouched, under `BQ-12` property 11.
- **Timing and other engines** weren't run.

## 5. Next

**`BQ-12` has nothing open, so the branch is ready for review.** The owner decides when the pull request opens.
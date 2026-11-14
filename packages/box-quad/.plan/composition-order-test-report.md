# Composition-order test report

**For:** the owner and the architect, reading against `F-7` in [`plan.md`](plan.md). **Branch:** `box-quad/numeric-storage`. **Base:** `0b2a458fb`. **Test commit:** `56fbf2b06`. This report is the commit after it.

**Status: done, pending review.** Two new Chromium tests use two ancestors whose transforms do not commute. Each test fails when the ancestor composition is reversed, and no other test fails. No source, public API, storage choice, budget or drag2 file changed. `plan.md` isn't updated: `F-7`'s status is left for the final record update.

## The tests

Both are in [`tests/coordinates.browser.test.ts`](../tests/coordinates.browser.test.ts), and both use the new local fixture `createNonCommutingAncestry()`:

- an outer ancestor at `left: 100px` with `transform: rotate(90deg)`;
- inside it, an inner ancestor with `transform: scale(2, 1)`;
- inside that, the default 20 × 10 `createBox` at `left: 10px; top: 20px`.

Each transform origin is the top-left corner of its own element (`createBox`'s `0 0`).

| `describe` › test | Asserts |
| --- | --- |
| `ancestry` › "should compose non-commuting ancestor transforms in CSS order" | the `Space` linear part `a, b, c, d` = `0, 2, -1, 0` |
| `coordinates` › "should compose non-commuting ancestor transforms in CSS order" | all eight `Box` slots: `0, 2, -1, 0, 80, 20, 20, 10` |

**How the expected values were found.** By hand, from CSS: the inner scale acts first and the outer rotation last. A local point (x, y) is at (x + 10, y + 20) in the inner ancestor. The scale takes it to (2x + 20, y + 20), and the rotation takes that to (−y − 20, 2x + 20). The outer offset then adds 100 to the first term. So the local x axis maps to (0, 2), the local y axis to (−1, 0), and the local origin to (80, 20). The size is the authored 20 × 10. The expected values are literals. They are not computed by the implementation or by a `DOMMatrix`. The test comments give this derivation.

In the reversed order the linear part is `0, 1, -2, 0`.

## Why the `coordinates` test asserts the size, not the projected corners

The first version of the `coordinates` test projected the corners with `projection` and expected `(80, 20), (80, 60), (70, 60), (70, 20)`. **It passed under the mutation.** With the wrong matrix, `coordinates` derives a 40 × 5 size from the client rect, and at a multiple of 90° that wrong matrix and size give the same rectangle. The test was replaced, before the commit, with one that asserts the matrix and the size. The test comment records this limit.

## Verification

| Check | Result |
| --- | --- |
| box-quad suite, Chromium, base `0b2a458fb` | 240 passed, in 7 files (the base's test file restored over `56fbf2b06`, whose source is the base's) |
| box-quad suite, at `56fbf2b06` | 242 passed, in 7 files |
| `npx just typecheck` in box-quad | clean |
| `fmt`, `lint-fix`, `fmt`, `lint` on the test file | clean |
| `git diff --check` | clean |

The suite ran through `npx just test` in `packages/box-quad` (Vitest's `browser (chromium)` project). No performance measurement ran. drag and drag2 were not run or changed.

## Mutation

In `src/index.ts`'s `ancestry` walk, `matrix.preMultiplySelf(node);` was changed to `matrix.multiplySelf(node);`. That is the only call site. The suite then gave **2 failed, 240 passed**:

- `coordinates` › should compose non-commuting ancestor transforms in CSS order: the `BOX_B` assertion failed, at 1 against the expected 2.
- `ancestry` › should compose non-commuting ancestor transforms in CSS order: the `SPACE_B` assertion failed, at 1 against the expected 2.

The source was restored with `git checkout -- src/index.ts`. Afterwards `src/index.ts` was byte-identical to a copy saved before the mutation, `git diff -- packages/box-quad/src` was empty, and the suite gave 242 passed. The scratch copy was then deleted.

## Choices left open by the request

- **Fixture.** Rotation and non-uniform scale, the smallest familiar pair that does not commute. The fixture is local to the test file. `tests/support/fixtures.ts` is unchanged.
- **Two tests, not one.** The mutation is in `ancestry`, and `coordinates` gets its inherited part from `ancestry` when no `above` is given. The second test shows that the error reaches the `Box`, and that a size check is needed to see it there.

## Next

Review of `56fbf2b06` and this report. Then the final record update: `F-7`'s status in [`plan.md`](plan.md), which this unit leaves unchanged.
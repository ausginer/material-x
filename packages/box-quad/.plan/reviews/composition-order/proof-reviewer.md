# F-7 composition-order test review

**Lens:** feature proof, by the `reviewer` role. **Read at:** `fa1345103` on `box-quad/numeric-storage`. **Range reviewed:** `0b2a458fb..fa1345103`, which is the test commit `56fbf2b06` and the report commit `fa1345103`. **Governing records:** `F-7` in [`plan.md`](../../plan.md) and [`composition-order-test-report.md`](../../composition-order-test-report.md). **Browser:** Chromium only, through Vitest's `browser (chromium)` project.

**Result: no findings.** The two new tests meet `F-7`'s closing condition: "one such two-ancestor scenario, asserted against expected values and shown to fail under that mutation". I derived the fixture's expected values by hand, and they match the literals in the tests. The tests fail when the ancestor composition is reversed, and their oracle is not the implementation or `DOMMatrix`. Every claim in the report that I checked is accurate. `F-7`'s status in `plan.md` is unchanged in this range, as the report says. The architect updates it.

## Scope

**Covered:**

- The diff `0b2a458fb..fa1345103`: `tests/coordinates.browser.test.ts` (the `createNonCommutingAncestry()` fixture and the two tests) and `composition-order-test-report.md`.
- `F-7` in `plan.md`, and the support fixture `createBox` that the new fixture uses.
- `ancestry` and `coordinates` in `src/index.ts`, read only to find the mutation site and to calculate what the mutation produces.
- The suite at `fa1345103`, the report's mutation, and one temporary probe of the full outputs in both orders.
- Formatting, lint and `git diff --check` for the two changed files, and the report's two links.

**Not covered:**

- **The base reading.** I did not run the suite at `0b2a458fb`. The report's 240 agrees with `F-7`'s 240 at `27c8f5495` and with the two `it` blocks that this range adds. The source is the same in both.
- **Other composition orders.** The measured element in the fixture has no transform of its own. So these tests do not exercise the order of `coordinates`' inherited × own product, or the order inside `composeNode`. `F-7` does not ask for either, and I did not test them by mutation.
- **Typecheck, other engines, performance and drag/drag2.** I ran no performance measurement, as the request asked.

## The expected values, derived independently

`createBox` gives every box `position: absolute`, `box-sizing: border-box` and `transform-origin: 0 0`. `resetDocument` sets the body margin to 0. So:

- **outer:** at (100, 0), 400 × 400, `rotate(90deg)` about its top-left corner;
- **inner:** at (0, 0) inside outer, 200 × 200, `scale(2, 1)` about its top-left corner;
- **target:** at (10, 20) inside inner, 20 × 10, with no transform.

CSS applies the innermost transform first. For a target-local point (x, y):

| Step                              | Point              |
| --------------------------------- | ------------------ |
| offset into inner                 | (x + 10, y + 20)   |
| `scale(2, 1)`                     | (2x + 20, y + 20)  |
| `rotate(90deg)`, (u, v) → (−v, u) | (−y − 20, 2x + 20) |
| outer offset (100, 0)             | (80 − y, 2x + 20)  |

So the x axis maps to (a, b) = (0, 2), the y axis to (c, d) = (−1, 0), and the origin to (e, f) = (80, 20). The inherited linear part is R·S = [[0, −1], [1, 0]]·[[2, 0], [0, 1]] = [[0, −1], [2, 0]], so `Space` a, b, c, d = 0, 2, −1, 0. Both match the literals in the tests. The authored size is 20 × 10.

**The reversed order** is S·R = [[0, −2], [1, 0]], so a, b, c, d = 0, 1, −2, 0. The client rect is the same in both orders, because it comes from layout and not from the walk: left 70, top 20, 10 × 40. I calculated `coordinates`' output from that rect by following its arithmetic:

- determinant = |a||d| − |b||c| = −2, which is outside the fallback band, so the inversion path is used;
- width = (10·0 − 40·2) / −2 = 40, and height = (40·0 − 10·1) / −2 = 5;
- e = 70 − min(0, 0) − min(0, −2·5) = 80, and f = 20 − min(0, 1·40) − min(0, 0) = 20.

So the mutated `Box` is 0, 1, −2, 0, 80, 20, 40, 5. **Which assertions discriminate:** `b`, `c`, `width` and `height` change, and `a`, `d`, `e` and `f` do not. The `coordinates` test asserts all eight slots, so it includes the four that change. The `ancestry` test asserts `b` and `c`, which change.

**The corner claim.** The projected corners in both orders are (80, 20), (80, 60), (70, 60), (70, 20): 20·(0, 2) = 40·(0, 1) and 10·(−1, 0) = 5·(−2, 0). So the report is right that a corner-only assertion passes under the mutation, and the test comment states this limit correctly.

**The oracle.** The expected values are numeric literals, and the derivation in the comments uses only the CSS order and the offsets. Neither test calls `DOMMatrix`, `projection` or a second measurement to calculate an expected value. The tests depend on the browser only through the layout that they measure.

## Evidence

All runs were at `fa1345103`, in `packages/box-quad`.

| Check | Result |
| --- | --- |
| `npx just test` | 7 files, **242 passed** |
| Mutation at `src/index.ts:262`: `matrix.preMultiplySelf(node);` → `matrix.multiplySelf(node);` | **2 failed, 240 passed**. `coordinates` › "should compose non-commuting ancestor transforms in CSS order" failed at line 159 (`BOX_B`). `ancestry` › the test with the same name failed at line 387 (`SPACE_B`). Each message is `expected 1 to be less than or equal to 0.000001`: the absolute difference \|1 − 2\| |
| Temporary probe, mutated | `Space` `[0,1,-2,0,1]`, `Box` `[0,1,-2,0,80,20,40,5]`, corners `[80,20,80,60,70,60,70,20]`, client rect `[70,20,10,40]` |
| Temporary probe, restored | `Space` `[0,2,-1,0,1]`, `Box` `[0,2,-1,0,80,20,20,10]`, the same corners and the same client rect |
| After restoring with `git checkout -- src/index.ts` | `src/index.ts` matched its saved SHA-256 `29139da1…`, `git diff -- src` was empty, the suite gave 242 passed, and the working tree matched `fa1345103` |
| Production source in the range | `git diff 0b2a458fb fa1345103 -- packages/box-quad/src` is empty. The range changes only the test file and the report |
| Call sites | `preMultiplySelf` occurs once in `src/index.ts`, at line 262. The other `multiplySelf`, at line 202, is the node-local composition in `composeNode` |
| `oxfmt --check` on both changed files, `just lint` on the test file, `git diff --check 0b2a458fb fa1345103` | clean |
| Report links `plan.md` and `../tests/coordinates.browser.test.ts` | both targets exist |

The probe was a temporary test file, `tests/zz-reviewer-probe.browser.test.ts`. I ran it on its own, both with and without the mutation, and deleted it before the final suite run. Each probe value equals the hand derivation above.

## For the architect

`F-7`'s closing condition is met at `fa1345103`. This review does not change the `F-7` row or decide its status. The final record update is the architect's.
# `coordinates` finiteness test handoff

**For:** one `implementer` unit on `box-quad/numeric-storage`. **Base:** the commit that carries this handoff. Its code is `057c39b94`'s.

**Governing records:** `BQ-12` property 5 in [`plan.md`](plan.md), which carries `BQ-11`'s property 5 unchanged. The finding is reviewer-1 in [`reviews/13-numeric-storage/implementation-reviewer.md`](reviews/13-numeric-storage/implementation-reviewer.md), and its disposition is [`numeric-storage-assessment.md`](numeric-storage-assessment.md) §2. CONTRIBUTING §Unit tests governs the test.

**Goal:** one test proves that `coordinates` leaves `out` untouched when its finiteness check fails, and the test fails when a write moves above that check. The unit changes no source and no behavior.

## Environment

As in [`numeric-storage-handoff.md`](numeric-storage-handoff.md) §Environment. Use the installed tree and Chromium through `/usr/local/bin/chrome`, and don't install browsers. If the worktree is fresh, run the prerequisite builds there, in that order.

## Boundaries

**In scope:**

- `packages/box-quad/tests/coordinates.browser.test.ts`;
- `packages/box-quad/tests/support/fixtures.ts`, only if the fixture needs a helper there;
- the report, `packages/box-quad/.plan/coordinates-finiteness-report.md`.

**Out of scope:**

- `src/index.ts` and every other source file. The path is correct today, and the unit proves it;
- every other test, the contract, the record, and any other package;
- drag2, under `BQ-12` property 11;
- timing and other engines.

## The test

**Site:** `tests/coordinates.browser.test.ts`, in `describe('coordinates recognized limits')`, beside "should preserve every output sentinel on a recognized failure".

**Required properties:**

1. **It reaches the finiteness check through the DOM.** The element is connected, has exactly one client rect, and has no 3D transform, `perspective` or `preserve-3d` on itself or any ancestor. `ancestry` returns `true` for it. Its composed linear part or its derived size is non-finite. The review reached this in Chromium with nine nested ancestors at `transform: scale(1e38)`. Chromium clamps each transform component to about 3.4e38, so one ancestor isn't enough. The implementer may use another configuration that meets this property.
2. **The test itself shows the earlier checks pass.** Before the call under test, assert that the element has one client rect and that `ancestry` returns `true` for it. The element's own style is 2D by construction, as property 1 requires. A `false` from `coordinates` can then come only from the finiteness check. If the non-finite value is in the ancestry, as in the review's configuration, also assert that the space `ancestry` wrote has a non-finite slot. In an engine that refuses earlier or saturates differently, the test fails at its own precondition rather than passing without reaching the check.
3. **It asserts the output is untouched.** `coordinates` returns `false`, and a store filled with eight distinct sentinels keeps its keys, its values and its `length`. The existing `sentinels()` store, or a filled `number[]`, will do. Testing more storage kinds is optional. `storage.browser.test.ts` already covers the kinds through a different `false`.
4. **It uses the form without `above`.** That is the fallback, so `coordinates` reads the ancestry itself. A second case that passes the same `ancestry` result as `above` is allowed, but not required. Both forms reach the same write block.
5. **One behavior per `it`,** named with "should", as CONTRIBUTING §Unit tests requires.

**Witness, run once, reverted, and reported.** In `src/index.ts`, move `out[BOX_A] = a;` from the write block to the line just above `if (!finite(a + b + c + d + width + height))`. This is the review's mutation.

- The new test must fail, and the report names every test that fails.
- Revert the move, then confirm that `git diff -- packages/box-quad/src` is empty.

## Verification

Record the base result first, then the result after the change.

| Check | Base | After |
| --- | --- | --- |
| box-quad browser project | 239 passed, in 7 files | 239 plus the new tests, all passing |
| `npx just typecheck` in box-quad | clean | clean |
| `npx just lint` on the changed test files | clean | clean |

Finalize each edited file as [`handoff.md`](../../../.agents/docs/handoff.md) says: `fmt`, `lint-fix`, `fmt`, `lint`, by file. `git diff --check` must be clean. drag doesn't need to be rerun, because nothing it consumes changes.

## Commits, report and push

- **Commits:** one for the test, and the report as a second.
- **The report gives:**
  - the base and resulting commits;
  - the fixture, and why the `false` it produces can only come from the finiteness check;
  - the base and after results in the table above;
  - the witness and every test it failed;
  - any choice this handoff left open.
- **Push** `box-quad/numeric-storage`. Don't open a pull request.

## Return conditions

Stop and report, without working around it, if any of these happens:

- the finiteness check can't be reached through the DOM in Chromium without changing `src/index.ts`;
- the new test passes under the witness mutation;
- any existing test changes its result;
- the change seems to need a file outside the boundaries.

## After this unit

The architect reads the report and closes the pending proof in `BQ-12`'s status. The owner decides when the pull request opens.
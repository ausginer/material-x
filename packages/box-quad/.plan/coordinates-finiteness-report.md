# `coordinates` finiteness test report

**For:** the architect, reading against `BQ-12` property 5 in [`plan.md`](plan.md). **Handoff:** [`coordinates-finiteness-handoff.md`](coordinates-finiteness-handoff.md) at `7132974b1`. **Branch:** `box-quad/numeric-storage`. **Base:** `7132974b1`. **Test commit:** `0e90ec136`. This report is the commit after it.

**Status: done.** One new test reaches `coordinates`' finiteness check through the DOM in Chromium and asserts that the output is untouched. The witness mutation fails it, and it fails no other test. No source file changed.

## The test

[`tests/coordinates.browser.test.ts`](../tests/coordinates.browser.test.ts), `describe('coordinates recognized limits')`, directly after "should preserve every output sentinel on a recognized failure": **"should preserve every output value when the result is not finite"**.

**Fixture.** Nine nested `createBox` ancestors, each `200px` × `200px` with `transform: scale(1e38)`, and one default `createBox` inside the innermost. This is the review's configuration. Chromium clamps each transform component to about 3.4e38, so one ancestor can't overflow. Nine compose to 1e342, which is beyond the Float64 range.

**Why `false` can come only from the finiteness check.** `coordinates` has four `false` returns. The test asserts the preconditions for the first three before the call:

1. **Rect count.** `source.getClientRects()` has length 1.
2. **Ancestry.** `ancestry(source, space)` returns `true`, so no ancestor is 3D, has `perspective` or has `preserve-3d`. The test also asserts that `space[0]` isn't finite, so the non-finite value is present.
3. **Own 3D transform.** The element's own style comes from `createBox` defaults: no `transform`, `rotate`, `scale`, `translate`, `perspective` or `transform-style`. `composeNode` can't return `false` for it.

The call uses the form without `above`, so `coordinates` reads the ancestry itself. The output is a `number[]` holding `[11, 22, 33, 44, 55, 66, 77, 88]`. After `coordinates` returns `false`, `toStrictEqual` checks its values, its length and that it has no added or missing keys.

## Verification

| Check | Base `7132974b1` | After `0e90ec136` |
| --- | --- | --- |
| box-quad browser project | 239 passed, in 7 files | 240 passed, in 7 files |
| `npx just typecheck` in box-quad | clean | clean |
| `npx just lint tests/coordinates.browser.test.ts` | clean | clean |

The test file was finalized with `fmt`, `lint-fix`, `fmt` and `lint`. `git diff --check` is clean. Every run used Chromium through `/usr/local/bin/chrome`, in the installed tree. drag and drag2 weren't run or changed.

## Witness

In `src/index.ts`, `out[BOX_A] = a;` was moved from the write block to the line just above `if (!finite(a + b + c + d + width + height))`. The browser project then gave 1 failed and 239 passed. The only failure was the new test:

- `coordinates.browser.test.ts` › coordinates recognized limits › should preserve every output value when the result is not finite

The move was reverted with `git checkout -- src/index.ts`. Afterwards `git diff -- packages/box-quad/src` was empty, and `src/index.ts` was byte-identical to a copy saved before the mutation. The copy was then deleted.

## Choices the handoff left open

- **Fixture.** The review's nine-ancestor configuration, not another one.
- **Storage.** A filled `number[]`, not the `sentinels()` `Float64Array`. Unlike a typed array, a `number[]` can gain keys or change its `length`, so the assertion on keys and `length` can fail.
- **Optional cases.** No second case with `above`, and no extra storage kinds.
- **Fixtures file.** Unchanged. The test needed no new helper.
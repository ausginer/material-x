# Probe: the two stops of the `y()` geometry terms unit

**By:** the architect, on 2026-11-15, at `1c1e93bd9` on `drag2/removal`, after a fresh `tsdown` build. **For:** §Disposition of the `y()` geometry terms report in [`00-index.md`](../../decisions/), `drag:DRD-65` properties 5 and 6, and `drag:DRD-67` property 2 and its property 7 stop.

Each mutation was applied to the tree, the named projects were run, and the file was restored with `git checkout`. The tree was clean afterwards.

## The tie witnesses

The two diffs are the implementer's, in [`../drag2-guarantees/mutations/`](../drag2-guarantees/mutations/).

| Mutation | Command (from `packages/drag`) | Result |
| --- | --- | --- |
| `S2-tie-0.diff` | `vitest run -c vitest.config.ts --project consumer tests/y-geometry.browser.test.ts` | 13 passed of 13 |
| `S2-tie-exact.diff` | the same | 1 failed: `:120` _should agree with an authored rotate on a row_, `expected [ 'at 95: proposed 1, measured 2' ] to deeply equal []` |
| `S2-tie-0.diff` | `vitest run -c vitest.engines.config.ts --project browser --project browser/firefox tests/y-geometry.browser.test.ts` | 26 passed of 26 |

So no fixture in the suite, in Chromium or Firefox, needs the tolerance to be wider than an exact tie.

## `layout-animation.browser.test.ts:266`

| Tree | Command (from `packages/drag`) | Result |
| --- | --- | --- |
| `1c1e93bd9` | `vitest run -c vitest.config.ts --project browser --project consumer tests/layout-animation.browser.test.ts -t "consumer animation on transform"` | 2 failed, one per project: `Error: the predicted insertion geometry disagreed with a fresh measurement at slot 0` |
| with [`consumer-transform-constant.diff`](consumer-transform-constant.diff): both keyframes `translateX(10px)` | `vitest run -c vitest.config.ts --project browser --project consumer tests/layout-animation.browser.test.ts` | 32 passed of 32 |

## The emitted `y()` JSDoc

After the build, `sortable/y.js` contains the word "collapse", from `y()`'s JSDoc. So a change to that JSDoc changes the emitted file.
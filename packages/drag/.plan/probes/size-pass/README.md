# Size pass probe

The experimental code for [`size-pass-assessment.md`](../../size-pass-assessment.md). It prices removal candidates by composition and changes no production code or instrument. `bench/size/measure.ts` stays the gate, and its ceilings are unchanged.

**Base:** `0a28f909a` on `drag/size`. Every candidate was built in a detached worktree of that commit in the architect's scratch directory, which was removed after the readings. **Nothing is merged, and production source on the branch is unchanged.**

| File | What it is |
| --- | --- |
| [`size.ts.txt`](size.ts.txt) | The probe. It imports `COMPOSITIONS` from `bench/size/measure.ts`, bundles each row with the same Rolldown options from a given tree, and prints minified, gzip-9, gzip-6 and Brotli-11 bytes and the bytes of surviving string literals. `--modules` adds each module's minified bytes as its own chunk, and `--strings` lists the literals. Its header records the compression settings |
| [`delta.ts.txt`](delta.ts.txt) | Prints the difference of candidate readings from a base reading, as minified, gzip-9 and Brotli bytes per row |
| [`patches/`](patches/) | One unified diff per candidate, against `0a28f909a`. From the repository root, `git apply packages/drag/.plan/probes/size-pass/patches/<name>.diff.txt` applies it |

**The patches** (the assessment's §5 describes each one):

| Patch | Candidate |
| --- | --- |
| `C1-idle-step-through-list` | `DRF-20`: an idle `requestStep` goes through the step list |
| `C2-callback-list-factories` | `CallbackList` without `queue()`, `stack()` and the private constructor |
| `C3-drf13-insertion-non-null` | `DRF-13`: `AxisQuery.insertion` is never `null`, and `y.ts` and `xy.ts` lose their `null` arms |
| `C3b-drf13-with-shift-sentinels` | C3, and the two `gap < 0` branches in `linear-shift.ts` that C3 makes unreachable |
| `C4-drf14-single-invalidation` | `DRF-14`: `freeDrag`'s invalidation step marks the bounds stale once |
| `C5-lift-inline-captures` | `captureInlineStyles` and `captureTopLayer` inlined into `acquire` |
| `C6-y-only-cache-writes-out-of-rect-index` | `RectIndex.advance` and `remeasurePlaceholder` moved into `linear-shift.ts`, which writes the cache's buffers through its read-only getters |
| `U1-recommended-unit` | C3b and C4 together: the recommended first unit |
| `K-kernel-pair` | C1 and C2 together |
| `J1-clean-set` | C1, C2, C3 and C4 together |
| `J2-all-measured` | J1, C5 and C6 together |

**How the readings were made:** `node <scratch>/size.ts --root <worktree>/packages/drag --json <file>` for each tree, from the repository root, with `size.ts.txt` copied to a scratch `.ts` file. The raw tables are in [`2026-11-12-size-pass-readings.txt`](../../measurements/2026-11-12-size-pass-readings.txt), and the JSON per tree is in [`2026-11-12-size-pass-json/`](../../measurements/2026-11-12-size-pass-json/). The probe's Brotli column equals `measure.ts`'s output for every row at the base.

**The recommended unit, checked by the architect on the patched worktree.** This is a probe, not the unit's verification:

- `npx tsc -p tsconfig.json --noEmit` in `packages/drag`: no errors.
- `npx vitest run -c vitest.config.ts` on `sortable`, `free-drag`, `drop-targets`, `order`, `hot-path` and `landing` in Chromium: 6 files, 105 tests passed, no type errors. The other test files and the other engines weren't run.

The worktree's `node_modules` and `packages/drag/node_modules` were symbolic links to the main checkout's.
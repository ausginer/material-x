# RectIndex ownership probe

The experimental code for [`rect-index-ownership-proposal.md`](../../rect-index-ownership-proposal.md). It revisits C6 of the [size pass](../../size-pass-assessment.md) (`DRO-14` item 2). It changes no production code or instrument, and `bench/size/measure.ts` stays the gate with its ceilings unchanged.

**Base:** `c0d6b9205` on `drag/size`, whose `packages/drag/src` is identical to `0a28f909a`. Every variant was built in a detached worktree of that commit in the architect's scratch directory. **Nothing is merged, and production source on the branch is unchanged.** The owner's staged `Callbacks` edit in the main checkout was read only through `git diff --cached`, and applied only to scratch copies for one joint reading.

| File | What it is |
| --- | --- |
| [`patches/`](patches/) | One unified diff per variant, against `c0d6b9205`. From the repository root, `git apply packages/drag/.plan/probes/rect-index-ownership/patches/<name>.diff.txt` applies it |
| [`alloc-probe.test.ts.txt`](alloc-probe.test.ts.txt) | Bytes allocated per pointer sample under `src/sortable/`, for `y()` and for `xy()`. 20 rows, 300 warm moves, then 400 sampled moves inside one slot, so every frame resolves and none commits a move |
| [`move-probe.test.ts.txt`](move-probe.test.ts.txt) | Bytes allocated per committed move under `src/sortable/linear-shift.ts` and `src/sortable/rect-index.ts`, for `y()`. 20 rows, 100 warm crossings, then 200 sampled crossings, one placeholder relocation each, counted by a `MutationObserver` |

**The patches.** Each letter names a variant in the proposal's measured trade-offs.

| Patch | Variant |
| --- | --- |
| `A-lend-both-writes-inline` | `RectIndex.lend(write)` lends both buffers to a closure. Both y-only writes move into `linear-shift.ts` |
| `B-shared-placeholder-measurement` | `remeasurePlaceholder` becomes `measurePlaceholder`, the placeholder packed like a slot, which `collect` also calls. `advance` stays a method |
| `C-B-with-closure-lend` | B, with `advance` moved into `linear-shift.ts` through `lend(write)` and a closure per move |
| `D-B-with-xy-rebuild-in-xy` | B, with `RectIndex.refresh`, which only `xy()` calls, moved into `xy.ts` as a module function. No lend |
| `E-D-with-closure-lend` | D, with `advance` moved into `linear-shift.ts` through `lend(write)` and a closure per move |
| `F-D-with-cast-write` | D, with `advance` moved into `linear-shift.ts` through C6's cast of the read-only `values` getter. It prices the lend |
| `G-E-with-every-access-lent` | E, with every access to both buffers through `lend`, and the `values` and `placeholderRect` getters removed |
| `H-E-with-writer-once-and-span-state` | E, with the writer created once per `y()` instance and the span in three rule variables |
| `P-proposed-range-lend` | **The proposal.** D, with `advance` moved into `linear-shift.ts` through `lend(lo, hi, write)`, a writer created once per `y()` instance, and the committed move's `delta` as rule state |

**How the readings were made.**

- **Size:** `node <scratch>/size.ts --root <worktree>/packages/drag --json <file>` for each tree, with [`../size-pass/size.ts.txt`](../size-pass/size.ts.txt) copied to a scratch `.ts` file, and deltas printed by [`../size-pass/delta.ts.txt`](../size-pass/delta.ts.txt). The compression settings are in the readings file's header.
- **Allocation:** each probe's text was appended to the worktree's `tests/hot-path.browser.test.ts`, which runs in the `shipped` project with `__DEV__` false. It was then run alone with `npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t '<name>' --silent=false` from `packages/drag`. Heap sampling at 16 B counts objects that are collected before the profile stops. The base and E were sampled three times per probe. D, H and P were sampled three times per committed move and once per sample.

The raw tables, the probe output with each function's bytes, and the joint readings are in [`2026-11-12-rect-index-ownership-readings.txt`](../../measurements/2026-11-12-rect-index-ownership-readings.txt). The JSON for each tree is in [`2026-11-12-rect-index-ownership-json/`](../../measurements/2026-11-12-rect-index-ownership-json/).

**P, checked by the architect on its worktree.** This is a probe, not the unit's verification:

- `npx tsc -p tsconfig.json --noEmit` in `packages/drag`: no errors. The same holds with U1's patch applied first.
- `npx vitest run -c vitest.config.ts` in `packages/drag`, in Chromium: 30 files, 414 tests passed, 5 failed. The 5 failures are the five size rows that are already over their ceilings at the base: "draggable alone", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". No type errors. Firefox and WebKit weren't run, and neither was lint.

The worktrees' `node_modules` and `packages/drag/node_modules` were symbolic links to the main checkout's.
# RectIndex ownership probe

The experimental code for [`rect-index-ownership-proposal.md`](../../rect-index-ownership-proposal.md). It revisits C6 of the [size pass](../../size-pass-assessment.md) (`DRO-14` item 2). It changes no production code or instrument, and `bench/size/measure.ts` stays the gate with its ceilings unchanged.

**Base:** `c0d6b9205` on `drag/size`, whose `packages/drag/src` is identical to `0a28f909a`. Every variant was built in a detached worktree of that commit in the architect's scratch directory. **Nothing is merged, and production source on the branch is unchanged.** The owner's staged `Callbacks` edit in the main checkout was read only through `git diff --cached`, and applied only to scratch copies for one joint reading.

| File | What it is |
| --- | --- |
| [`patches/`](patches/) | One unified diff per variant, against `c0d6b9205`. From the repository root, `git apply packages/drag/.plan/probes/rect-index-ownership/patches/<name>.diff.txt` applies it |
| [`alloc-probe.test.ts.txt`](alloc-probe.test.ts.txt) | Bytes allocated per pointer sample under `src/sortable/`, for `y()` and for `xy()`. 20 rows, 300 warm moves, then 400 sampled moves inside one slot, so every frame resolves and none commits a move |
| [`move-probe.test.ts.txt`](move-probe.test.ts.txt) | Bytes allocated per committed move under `src/sortable/linear-shift.ts` and `src/sortable/rect-index.ts`, for `y()`. 20 rows, 100 warm crossings, then 200 sampled crossings, one placeholder relocation each, counted by a `MutationObserver` |
| [`warm-move-probe.test.ts.txt`](warm-move-probe.test.ts.txt) | The move probe with 2,000 unsampled crossings before the 200 sampled ones, as the size pass's first unit ran it. Its line is tagged `C6-WARM-MOVE-PROBE`, and `DRD-52` property 9's result is read with it |
| [`placeholder-x-witness.test.ts.txt`](placeholder-x-witness.test.ts.txt) | Added for `DRD-52`. A development-project drag in which only the placeholder moves along x, by its position's parity. It prints the faults the drag raised. Appended to a scratch copy of `tests/sortable.browser.test.ts` and run with `-t 'placeholder x witness'` |

**The patches.** Each letter names a variant in the proposal's measured trade-offs. All are against `c0d6b9205` except P5, which is against `1d304128b`, and which the proposal doesn't list.

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
| `P5-decided-with-held-placeholder-x` | **The decided form, `DRD-52`, against `1d304128b`.** P, with the development check given the placeholder's x as the cache held it before the re-read. That state is written only inside `__DEV__` branches, and the patch reads 0/0/0 against P on every row |

**How the readings were made.**

- **Size:** `node <scratch>/size.ts --root <worktree>/packages/drag --json <file>` for each tree, with [`../size-pass/size.ts.txt`](../size-pass/size.ts.txt) copied to a scratch `.ts` file, and deltas printed by [`../size-pass/delta.ts.txt`](../size-pass/delta.ts.txt). The compression settings are in the readings file's header.
- **Allocation:** each probe's text was appended to the worktree's `tests/hot-path.browser.test.ts`, which runs in the `shipped` project with `__DEV__` false. Each probe test was then launched alone, one axis at a time, as [§Launching the allocation probes](#launching-the-allocation-probes) gives it. Heap sampling at 16 B counts objects that are collected before the profile stops. The base and E were sampled three times per probe. D, H and P were sampled three times per committed move and once per sample.

The raw tables, the probe output with each function's bytes, and the joint readings are in [`2026-11-12-rect-index-ownership-readings.txt`](../../measurements/2026-11-12-rect-index-ownership-readings.txt). The JSON for each tree is in [`2026-11-12-rect-index-ownership-json/`](../../measurements/2026-11-12-rect-index-ownership-json/).

**P, checked by the architect on its worktree.** This is a probe, not the unit's verification:

- `npx tsc -p tsconfig.json --noEmit` in `packages/drag`: no errors. The same holds with U1's patch applied first.
- `npx vitest run -c vitest.config.ts` in `packages/drag`, in Chromium: 30 files, 414 tests passed, 5 failed. The 5 failures are the five size rows that are already over their ceilings at the base: "draggable alone", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". No type errors. Firefox and WebKit weren't run, and neither was lint.

The worktrees' `node_modules` and `packages/drag/node_modules` were symbolic links to the main checkout's.

## Launching the allocation probes

**Each launch runs exactly one probe test.** Append the probe files to a scratch copy of `tests/hot-path.browser.test.ts` in a scratch worktree, and launch from that worktree's `packages/drag`. The `-t` pattern selects one test:

| Probe test | Command |
| --- | --- |
| `y()` per sample | `npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 probe y:' --silent=false` |
| `xy()` per sample | `npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 probe xy:' --silent=false` |
| Per committed move | `npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 move probe' --silent=false` |
| Per committed move, warm | `npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 warm move probe' --silent=false` |

**Why one per launch.** In the size pass's first unit, one launch with `-t 'C6 probe'` ran `C6 probe y:` and then `C6 probe xy:`. Every `xy()` line read `perMove=0.00 keys={}`, at the base and at the unit. Launched alone, `xy()` reads about 50 B per sample. The cause isn't established, and the documented launch avoids it. Record: [the unit's allocation readings](../../measurements/2026-11-12-size-unit-alloc.txt) and [`size-pass-unit-assessment.md`](../../size-pass-unit-assessment.md) §4.

**A line that reads 0 B with no function under `sortable/` isn't a reading.** Discard its launch, keep it in the record with the reason, and repeat the probe test alone.

**A sequence of launches runs through [`bench/campaign.ts`](../../../bench/campaign.ts) `run`, one command per step.** The runner runs the steps in order, stops at the first failure, and writes `status.json` and one log per step under `.campaigns/<id>/`. Wait for it through the runner itself, not by searching the process table. The four launches, from the scratch worktree's `packages/drag`:

```sh
node bench/campaign.ts run --id c6-probes -- \
  "npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 probe y:' --silent=false" \
  "npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 probe xy:' --silent=false" \
  "npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 move probe' --silent=false" \
  "npx vitest run -c vitest.config.ts tests/hot-path.browser.test.ts -t 'C6 warm move probe' --silent=false"
```
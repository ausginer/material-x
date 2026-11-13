# xy() held-geometry probe

The prototype for [`xy-held-geometry-proposal.md`](../../xy-held-geometry-proposal.md): `xy()`'s previous geometry, the left and top of each slot kept across the rebuild of a committed move, moves from `xy()`'s `before` buffer into `rect-index.ts`. **It changes no production source, test, build file or instrument on the branch.** Every patch is against `61f883d09` and changes only `src/sortable/rect-index.ts` and `src/sortable/xy.ts`.

| File | What it is |
| --- | --- |
| [`patches/VX-retaining-subclass.diff.txt`](patches/VX-retaining-subclass.diff.txt) | **The recommendation, with its final names.** `RetainingRectIndex extends RectIndex` holds `#retained`, its own `number[]`, and adds `retain()` and `retained(slot, field)`. `xy()` constructs it. `y()` still constructs `RectIndex` |
| [`patches/VX-held-as-measured.diff.txt`](patches/VX-held-as-measured.diff.txt) | VX as the allocation campaign, the flows and the mutations ran it: the read is `held`, the field `#held`, and `xy.ts` imports `RectIndex` as a value. The final patch differs from it only in those names and in `import { type RectIndex }` |
| [`patches/P-second-array.diff.txt`](patches/P-second-array.diff.txt) | `RectIndex` itself gains `#held`, `retain()` and `held(slot, field)` |
| [`patches/VS-wider-stride.diff.txt`](patches/VS-wider-stride.diff.txt) | `STRIDE` becomes 8, with `HELD_LEFT` and `HELD_TOP` in every slot. `retain()` copies within the slot array, and `xy()` reads through `at` |
| [`patches/VXd-drift-read.diff.txt`](patches/VXd-drift-read.diff.txt) | VX as measured, with `drift(slot, field)`, the held value minus the current one, in place of `held` |
| [`xy-held-flows.browser.test.ts.txt`](xy-held-flows.browser.test.ts.txt) | **The runnable flows:** wrapping, animation and growth, through the real `xy()` installer with a recording sink |
| [`xy-held-alloc-probe.test.ts.txt`](xy-held-alloc-probe.test.ts.txt) | Allocation on `xy()`'s committed-move path with `layoutAnimation()`, and a calibration of what heap sampling sees of each buffer form |
| [`timing/page.ts.txt`](timing/page.ts.txt), [`timing/runner.ts.txt`](timing/runner.ts.txt) | **The timing check, not run.** It waits for the owner's hold |

## Inspecting the prototype

In a scratch worktree, so that the branch stays as it is. `PROBE` is this directory in a checkout of `drag/rect-index-ownership`:

```sh
PROBE=/workspaces/material-x/.claude/worktrees/drag-rect-index-ownership/packages/drag/.plan/probes/xy-held-geometry
INSPECT=/tmp/xyh-inspect
git -C /workspaces/material-x worktree add --detach "$INSPECT" 61f883d09
ln -s /workspaces/material-x/node_modules "$INSPECT/node_modules"
ln -s /workspaces/material-x/packages/drag/node_modules "$INSPECT/packages/drag/node_modules"
cd "$INSPECT"
git apply "$PROBE/patches/VX-retaining-subclass.diff.txt"
git diff --stat
```

**Read the code.** In `packages/drag/src/sortable/rect-index.ts`, read `RetainingRectIndex`, after `RectIndex`. It reads through `at` and `count` and writes only `#retained`. Then read `xy.ts`'s `moved`: `retain()`, the rebuild, and the compare through `retained` and `at`. `y.ts` and `linear-shift.ts` don't change.

**Run the flows** (Chromium, `browser` project only, because the consumer project rejects imports of `src/sortable/`):

```sh
cd packages/drag
cp "$PROBE/xy-held-flows.browser.test.ts.txt" tests/xy-held-flows.browser.test.ts
npx vitest run -c vitest.config.ts --project browser tests/xy-held-flows.browser.test.ts --silent=false
```

The output is in [`2026-11-13-xy-held-geometry-flows.txt`](../../measurements/2026-11-13-xy-held-geometry-flows.txt):

- **`FLOW wrapping`:** each committed move prints the target, the new gap and one line per reported cell, with the vector `xy()` passed to the sink. A cell that wraps reports `dx=±200 dy=∓60`, and one that moves within a row reports `dx=±100 dy=0`.
- **`FLOW animation`:** the same moves, with every move after the first measuring cells that a running 60-second animation draws away from flow. The vectors are the same as in the wrapping flow, because the rebuild settles each cell.
- **`v2`** lines are the second operation, over 21 cells.

To compare with the base, run the same file in a worktree at `61f883d09` with no patch, and diff the `FLOW` lines: they are identical.

**Run the suite** (Chromium), with the flows file removed first:

```sh
rm -f tests/xy-held-flows.browser.test.ts
npx vitest run -c vitest.config.ts
```

**Measure the size:** `npx just size`. "sortable + y", "complete" and the seven control rows read the base's figures exactly.

**Remove the worktree** when done: `git -C /workspaces/material-x worktree remove --force "$INSPECT"`.

## How the readings were made

All readings are Chromium only, on one machine with 12 CPUs, in detached scratch worktrees of `61f883d09` with the main checkout's `node_modules` linked in.

- **Size:** `npx just size` in each tree. [Readings](../../measurements/2026-11-13-xy-held-geometry-size.txt).
- **Flows and mutations:** the flows file in each tree's `browser` project. The mutations were applied to VX as measured one at a time and reverted. [Readings](../../measurements/2026-11-13-xy-held-geometry-flows.txt), [checks](../../measurements/2026-11-13-xy-held-geometry-checks.txt).
- **Allocation:** `DRD-52`'s four probes from [`../rect-index-ownership/`](../rect-index-ownership/README.md) and this directory's probe were appended, as one block, to a scratch copy of `tests/hot-path.browser.test.ts`, which runs in the `shipped` project with `__DEV__` false. Each probe test was launched alone, as [`../rect-index-ownership/README.md`](../rect-index-ownership/README.md#launching-the-allocation-probes) requires, through `bench/campaign.ts run`, in three rounds. Each round ran the base, VX, P and VS in that order. The base and VX ran every probe, and P and VS the `y()` sample, the cold `y()` move and both `xy()` move probes. The calibration ran once, in the base. [Readings](../../measurements/2026-11-13-xy-held-geometry-alloc.txt).

  Launch one `xy()` probe test with `-t 'XYH move probe'`, `-t 'XYH first move probe'` or `-t 'XYH calibration'`.

## The timing check

**It runs only under the owner's hold** (`DRD-44` property 6): the owner holds the owner's sessions before the first browser process and releases them after the last, both times are recorded, and nothing else from the running session runs in between. `--check-only` and `--bundle-only` time nothing and may run outside the hold.

```sh
T=<scratch>/timing
mkdir -p "$T/out"
cp "$PROBE/timing/page.ts.txt" "$T/page.ts"
cp "$PROBE/timing/runner.ts.txt" "$T/runner.ts"
cp -r <a worktree at 61f883d09>/packages/drag/src/sortable "$T/before"
# page.ts imports production from the VX worktree by absolute path: edit the three
# production imports to point at a worktree with the VX patch applied.
node "$T/runner.ts" "$T/out" --check-only   # one operation per arm, no timing
node "$T/runner.ts" "$T/out"                # under the hold only
```

`probe.json`, `bundle.js.txt` and the console output go under `measurements/` with the unit's prefix, with the hold's times. The verdict reads as `DRD-61` property 11 and the [RectIndex access handoff](../../rect-index-access-handoff.md)'s item 7 say.
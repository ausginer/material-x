# RectIndex access probe

The prototype for [`rect-index-access-proposal.md`](../../rect-index-access-proposal.md). `RectIndex` owns its geometry storage and every write to it, and the code outside it reads one number at a time. **It changes no production source, test, build file or instrument on the branch.** Every patch is against `f552e0ec9` on `drag/size`, which is also where `drag/rect-index-ownership` starts.

| File | What it is |
| --- | --- |
| [`patches/P-owned-storage.diff.txt`](patches/P-owned-storage.diff.txt) | **The proposal.** The scratch slot, the placeholder and the slots share one `number[]`. The axis is chosen at construction. `_at`, `_item`, `_insertion`, `_shift` and `_travel` are added, and `_lend`, the view getters and `settle` are removed. The sink's `settle` is replaced by `displaced(element)` and read-only `dx` and `dy`. The patch also changes `tests/displacement-sink.browser.test.ts` and regenerates `build/property-names.json` |
| [`patches/VY-fixed-y-axis.diff.txt`](patches/VY-fixed-y-axis.diff.txt) | P, but `_shift` and `_travel` are written for y and the constructor has no axis. It prices the choice at construction |
| [`patches/VSEP-separate-placeholder.diff.txt`](patches/VSEP-separate-placeholder.diff.txt) | P, but the placeholder stays in its own `Float64Array`, read through `_placeholder(field)`. It prices the shared storage |
| [`patches/VF-module-functions.diff.txt`](patches/VF-module-functions.diff.txt) | VY, but the shift and the travel are module functions in `rect-index.ts`. They reach the slot array through an accessor set in a static block, so a composition without `y()` doesn't carry them |
| [`rect-index-flows.browser.test.ts.txt`](rect-index-flows.browser.test.ts.txt) | **The runnable flows.** A `y` flow, a `y` flow with a row in flight, and an `xy` flow, against `RectIndex` alone with real layout. Each step prints `FLOW` lines and asserts the result |
| [`sink-drop-probe.test.ts.txt`](sink-drop-probe.test.ts.txt) | Bytes allocated per drag-and-drop cycle under `rect-index.ts`, `linear-shift.ts` and `layout-animation.ts`, with `layoutAnimation()` composed. Each cycle makes one committed move, which reads a row through the sink, and one drop, which confirms a slot through the sink |
| [`inline-check.ts.txt`](inline-check.ts.txt) | A Node script that drives `y()`'s and `xy()`'s scans and a measurement against stub elements until TurboFan optimizes them. Run with `--trace-turbo-inlining`, it shows whether `_at`, `#read` and `displaced` are inlined |

The allocation probes per sample and per committed move are `DRD-52`'s, in [`../rect-index-ownership/`](../rect-index-ownership/README.md): `alloc-probe`, `move-probe` and `warm-move-probe`.

## Inspecting the prototype

In a scratch worktree, so that the branch's own tree stays as it is. `PROBE` is this directory in a checkout of the branch:

```sh
PROBE=/workspaces/material-x/.claude/worktrees/drag-rect-index-ownership/packages/drag/.plan/probes/rect-index-access
git -C /workspaces/material-x worktree add --detach /tmp/ria-inspect f552e0ec9
cd /tmp/ria-inspect
ln -s /workspaces/material-x/node_modules node_modules
ln -s /workspaces/material-x/packages/drag/node_modules packages/drag/node_modules
git apply "$PROBE/patches/P-owned-storage.diff.txt"
git diff --stat
```

**Read the code.** Read `packages/drag/src/sortable/rect-index.ts` first. Then read `linear-shift.ts`, `y.ts` and `xy.ts`, which only read and decide, and `layout-animation.ts`, which only answers `displaced`.

**Run the flows** (Chromium, `browser` project only: the consumer project would reject the import of `src/sortable/rect-index.ts`):

```sh
cd packages/drag
cp "$PROBE/rect-index-flows.browser.test.ts.txt" tests/rect-index-flows.browser.test.ts
npx vitest run -c vitest.config.ts --project browser tests/rect-index-flows.browser.test.ts --silent=false
```

The output is [`2026-11-13-rect-index-access-flows.txt`](../../measurements/2026-11-13-rect-index-access-flows.txt):

- **`FLOW y grow`:** the window grows from the placeholder's gap. Each line is one slot, read field by field through `_at`.
- **`FLOW y move`:** `_travel` returns the constant, and `_shift` applies it. Each `predicted` line is followed by the `measured` line of a fresh index, and the two are equal.
- **`FLOW sink`:** a row drawn 30 px low by a running animation is cached at its flow position, and `_holds` answers `false` after the list shifts by 13 px.
- **`FLOW xy move`:** the vector `xy()` reports for each cell that moved. It is computed from `_at` readings before and after a rebuild.

**Run the suite** (Chromium), in the patched tree, with the flows file removed first, because the consumer project can't import it:

```sh
rm -f tests/rect-index-flows.browser.test.ts
npx vitest run -c vitest.config.ts
```

At the base, four size rows fail. With P, three fail, because "complete" is under its ceiling.

**Remove the worktree** when done: `git -C /workspaces/material-x worktree remove --force /tmp/ria-inspect`.

## How the readings were made

All readings are in Chromium only, as [`performance-plan.md`](../../performance-plan.md) §3 directs, on one machine with 12 CPUs. Every tree was a detached worktree of `f552e0ec9` in the architect's scratch directory, with the main checkout's `node_modules` linked in.

- **Size:** for each tree, the map was regenerated with `node build/generate-property-names.ts`. Then `npx just size` ran twice: once as the base builds, with `DRD-56`'s rename step, and once with the step removed from `tsdown.config.ts`, which keeps the `_` names. The second reading stands in for the build after the owner's mangle revert, which this probe didn't read. Readings, script and deltas: [`2026-11-13-rect-index-access-size.txt`](../../measurements/2026-11-13-rect-index-access-size.txt).
- **Allocation:** the four `DRD-52` probes and the sink drop probe were appended, as one block, to a scratch copy of `tests/hot-path.browser.test.ts` in both trees. That file runs in the `shipped` project with `__DEV__` false. Each probe test was launched alone, three times per tree, through `bench/campaign.ts run`, with the base's campaign first and P's after it. The launch rules in [`../rect-index-ownership/README.md`](../rect-index-ownership/README.md#launching-the-allocation-probes) apply. Readings: [`2026-11-13-rect-index-access-alloc.txt`](../../measurements/2026-11-13-rect-index-access-alloc.txt).
- **Inlining:** `node --allow-natives-syntax --trace-turbo-inlining inline-check.ts <tree>/packages/drag/src/sortable/rect-index.ts`, on Node's V8 and not Chrome's. Trace: [`2026-11-13-rect-index-access-inlining.txt`](../../measurements/2026-11-13-rect-index-access-inlining.txt).
- **Suite, flows and mutations:** [`2026-11-13-rect-index-access-checks.txt`](../../measurements/2026-11-13-rect-index-access-checks.txt).
- **No timing was measured.** The owner coordinates timing runs.
# Owner refactor verification: box-quad and drag class conversions

**Input:** the owner's uncommitted edits on `drag/class-refactor`, against baseline `5b581fbdf` (HEAD). Fourteen tracked files changed in `packages/box-quad/src/index.ts`, `packages/drag/src/**` and `packages/drag/tsconfig.json`, and two new files: `src/sortable/invalidatable.ts` and `src/sortable/retirable.ts`. The tracked diff is saved with sha256 `019cd4569ca6526d…` ([diff](measurements/2026-11-14-owner-refactor/input/tracked.diff.txt)). The 16 file hashes are saved too ([hashes](measurements/2026-11-14-owner-refactor/input/hashes.txt)).

**Scope:** checks and measurements only. This unit makes no review judgement on the class conversions. That independent review follows separately. No source was formatted, fixed, reverted or committed. No dependency was installed, and no budget changed. drag2, Firefox and WebKit, and the `--prove` and `--floors` campaigns are out of scope.

**The owner's edits are preserved.** After the last run, `git status`, the tracked diff hash and all 16 hashes are identical to the input ([before](measurements/2026-11-14-owner-refactor/input/status-before.txt), [after](measurements/2026-11-14-owner-refactor/input/status-after.txt)).

## Summary

| Area | Result |
| --- | --- |
| box-quad suite | 242 of 242 pass in both trees |
| drag suite | 747 of 752 pass in both trees. **New failure:** the `declaration` project fails `tests/callbacks.declaration.test.ts` on two unused `@ts-expect-error` directives (`drag:DRD-35`) |
| Typecheck | Baseline: only the two drag2 TS2724 errors. **New:** the same two TS2578 errors |
| Lint | Baseline drag lint exits 0. **New:** the edited drag lint fails on `.plan/probes/callback-list/allocation.ts`, which the owner's `tsconfig.json` edit removes from the project. All owner-changed source files lint clean |
| Format check | The same pre-existing files fail in both trees: 54 in drag, 2 in box-quad, all under `.plan/`. No source file fails |
| Size | box-quad −15 B Brotli. Every drag row is +53 to +895 B minified. Brotli changes by −32 to +40 B. The same five rows are red, with different margins |
| Declarations | Published declarations change: `MotionConstraint` and `DropTargetTracker` become classes with `#private`, the receiver (`this:`) declarations on `retire` and `invalidate` are dropped, and two new `.d.ts` files ship |
| Timing | **No difference shown** on every row of all three instruments, which is inconclusive. No layout count changed |
| Allocation | **More:** `y()`'s committed move before warm-up, about +24 B per move, all in `linear-shift.ts:moved`. **Less:** every controller lifetime (−118 to −732 B), and 728 B less retained after 200 operations and destroy |

## Method and environment

- **Tools:** both trees used the same installed tools ([versions](measurements/2026-11-14-owner-refactor/tools.txt)): Node v26.13.0, rolldown 1.3.2, tsdown 0.23.7, vitest 5.1.0, playwright 1.65.0, TypeScript 6.0.2, oxlint 1.93.0, ESLint 10.14.0, oxfmt 0.78.0 and size-limit 14.3.0. The browser was Chrome for Testing 157.0.8103.38 at `/usr/local/bin/chrome`, with `CHROME_EXECUTABLE` unset. The machine has 12 CPUs.
- **Trees:** the main checkout holds the owner's edits. Two scratch worktrees were made outside the checkout, removed afterwards:
  - **Baseline:** `5b581fbdf`, unedited.
  - **Edited:** `5b581fbdf` with the saved diff and the two new files applied. Its source hashes were verified to equal the input's.
- **Dependencies:** each worktree's `node_modules` symlinks to the main checkout's installed packages, entry by entry. `@ydinjs/*` link to the worktree's own packages, so each tree resolves its own box-quad. `vite-traits-plugin` and `vite-custom-element-assets` are build tooling, unchanged at HEAD, and point at the main checkout's builds. The first baseline attempt failed on every step because the tooling was unbuilt. It was discarded ([status](measurements/2026-11-14-owner-refactor/checks/base-first-attempt-env-failure-status.txt)).
- **box-quad before drag:** each tree's box-quad was built before its drag checks ([script](measurements/2026-11-14-owner-refactor/harness/checks.sh.txt)). The builds differ in `index.js`, with baseline `d0e87f22…` and edited `51dc4e4f…`, and have identical `index.d.ts`. The edited worktree's box-quad build, used for the allocation probes, equals the main checkout's `51dc4e4f…`.
- **Order:** the correctness checks ran sequentially, edited (main checkout) then baseline. The timed runs came only after the harness checks below. The allocation probes ran after the owner released the hold.

## Correctness

Logs are under [`checks/`](measurements/2026-11-14-owner-refactor/checks/), one directory per tree, with each step's exit code and times in `status.txt`.

### Suites (Chromium)

- **box-quad:** 7 files and 242 tests pass in both trees.
- **drag:** all projects ran, including `consumer`, `shipped`, `declaration` and `node`. The result is 752 tests, 747 pass, in both trees.
  - **Baseline:** 1 failed file. The five failures are the known size rows in `tests/size.node.test.ts`: draggable alone, example: drop zone, freeDrag, freeDrag + bounds + landing, and complete. **Verified:** five red size rows, as recorded.
  - **Edited:** the same five size rows fail, and a second file fails: `|declaration| tests/callbacks.declaration.test.ts`. Its `TypeCheckError` is "Unused '@ts-expect-error' directive" at lines 172 and 174, in `passAlone` under `drag:DRD-35 capabilities declare their receiver`. `drag.use(geometry.retire)` and `controller.use(sink.retire)` now typecheck. The cause is the declaration change below: `retire` loses its `this: InsertionGeometry` and `this: DisplacementSink` parameters through `Retirable`. **This is a new failure.**

### Typecheck

- **box-quad:** exits 0 in both trees.
- **drag, baseline:** the two drag2 TS2724 errors in `../drag2/src/kernel/presentation.ts`, lines 13 and 15, for `box` and `space`. **Verified:** two drag2 TS2724, as recorded.
- **drag, edited:** the same two errors, plus **new** TS2578 at `tests/callbacks.declaration.test.ts` lines 172 and 174. This is the same fault as the declaration-project failure.

### Lint

- **box-quad:** identical in both trees: 9 pre-existing ESLint `no-meaningless-void-operator` errors in `tests/api.declaration.test.ts`. `src/index.ts` passes oxlint and ESLint.
- **drag, baseline:** `just lint` exits 0.
- **drag, edited, a new failure:** oxlint reports 11 type-aware errors (`no-unsafe-call` and `no-unsafe-member-access`) in `.plan/probes/callback-list/allocation.ts`. `just lint` stops there, so ESLint was run separately with no fix ([output](measurements/2026-11-14-owner-refactor/checks/edited/drag-eslint-only.log)). It reports one parsing error: the same file "was not found by the project service". **Cause:** the owner's `tsconfig.json` edit removes that file from `include`. No source file is involved.
- **The owner-changed files alone,** the 12 tracked drag sources and the 2 new ones, pass oxlint and ESLint with exit 0 ([log](measurements/2026-11-14-owner-refactor/checks/edited/drag-lint-changed-src.log)).

### Format check (read-only)

`just fmt-check` fails in both trees on the same list: 54 drag files and 2 box-quad files, every one a `.plan/` JSON or data file. After the run times are normalised, the lists differ only in drag's checked-file count, 452 against 454, which is the two new source files. **No owner-edited file needs formatting.**

## Size

`npx just size` builds and then measures the published build. The box-quad figure is `npx size-limit --json`, whole module, Brotli. No budget or control row was re-based.

**box-quad:** 1,197 B → **1,182 B** (−15).

**drag**, as min / gz / br in bytes ([baseline](measurements/2026-11-14-owner-refactor/checks/base/drag-size.log), [edited](measurements/2026-11-14-owner-refactor/checks/edited/drag-size.log)):

| Row | Baseline | Edited | Δ | Modules | Verdict, baseline → edited |
| --- | --- | --- | --- | --- | --- |
| draggable alone (control) | 6,728 / 2,422 / 2,189 | 6,728 / 2,422 / 2,189 | 0 / 0 / 0 | 7 → 7 | red → red, same lines: over by 50 B, control moved by 165 B |
| draggable + lift | 11,459 / 4,369 / 3,927 | 11,677 / 4,362 / 3,932 | +218 / −7 / +5 | 9 → 9 | — |
| example: resize handle | 9,264 / 3,632 / 3,283 | 9,496 / 3,607 / 3,265 | +232 / −25 / −18 | 9 → 9 | — |
| example: drop zone | 13,055 / 5,061 / 4,562 | 13,287 / 5,058 / 4,570 | +232 / −3 / +8 | 13 → 12 | red: over by 131 → 139 B |
| example: canvas group | 9,434 / 3,604 / 3,286 | 9,487 / 3,573 / 3,261 | +53 / −31 / −25 | 9 → 9 | — |
| freeDrag | 15,035 / 5,531 / 4,987 | 15,272 / 5,527 / 4,985 | +237 / −4 / −2 | 15 → 15 | red: over by 20 → 18 B |
| freeDrag + bounds + landing | 16,199 / 6,021 / 5,416 | 16,630 / 6,041 / 5,456 | +431 / +20 / +40 | 19 → 18 | red: over by 206 → 246 B |
| sortable + y | 20,137 / 7,261 / 6,555 | 20,852 / 7,243 / 6,547 | +715 / −18 / −8 | 20 → 20 | — |
| sortable + xy | 20,049 / 7,254 / 6,544 | 20,559 / 7,223 / 6,512 | +510 / −31 / −32 | 19 → 19 | — |
| complete | 21,673 / 7,915 / 7,132 | 22,568 / 7,910 / 7,150 | +895 / −5 / +18 | 24 → 23 | red: over by 67 → 85 B |

- **The control row reads 0 / 0 / 0.** It doesn't reach box-quad or any edited module, which was predicted.
- **Minified and Brotli disagree in direction** on five rows. Shipped bytes are the Brotli column (CONTRIBUTING §15). The governing reading is −32 to +40 B. Two red rows grow, by +40 and +18 B, and one shrinks by 2 B.
- **The box-quad share was split out** with a cross-arm read: baseline drag built against the edited box-quad ([log](measurements/2026-11-14-owner-refactor/checks/cross-base-drag-edited-box-quad-size.log)). That read already equals the edited figures on draggable + lift, resize handle, drop zone and canvas group, module counts included. Those rows' deltas, and drop zone's 13 → 12 modules, come entirely from the box-quad edit. On the other rows, the drag edits add to the cross read, in Brotli:

  | Row                         | Drag edits' share |
  | --------------------------- | ----------------: |
  | freeDrag                    |                −3 |
  | freeDrag + bounds + landing |               +32 |
  | sortable + y                |                +2 |
  | sortable + xy               |               −20 |
  | complete                    |               +26 |

  These single readings are shares, not ablations to add (§15).

## Emitted public declarations

The baseline build emits 27 `.d.ts` files and the edited build 29. The changed files are in [`drag-declarations.diff.txt`](measurements/2026-11-14-owner-refactor/checks/drag-declarations.diff.txt). box-quad's `index.d.ts` is byte-identical.

- **`free-drag/bounds.d.ts`:** `export interface MotionConstraint` becomes `declare class MotionConstraint { #private; constructor(window: Window, source?: BoundsSource); … }`, exported as a type only.
- **`free-drag/drop-targets.d.ts`:** `export interface DropTargetTracker` becomes the same kind of type-only class. It gains `#private`, gains a constructor, and changes `readonly current` to a getter `get current()`. `DropTargets`' JSDoc says "A third party may supply its own". A declared class with `#private` can't be satisfied structurally, so a third-party `DropTargets` can no longer return its own object as a `DropTargetTracker`. This is recorded as a fact for the review, not judged here.
- **`sortable/axis.d.ts`:**
  - `DisplacementSink extends Retirable` and `InsertionGeometry extends Invalidatable, Retirable`.
  - `retire(this: DisplacementSink)`, `retire(this: InsertionGeometry)` and `invalidate(this: InsertionGeometry)` are replaced by the receiver-less `retire(): void` and `invalidate(): void`. This is the cause of the `drag:DRD-35` failure.
  - `invalidate`'s JSDoc ("Staleness only, because scroll calls it many times a second.") no longer appears.
- **New files:** `sortable/invalidatable.d.ts` and `sortable/retirable.d.ts`. `axis.d.ts` imports both. They are in the published file set, because `package.json` `files` lists `sortable`.
- **`sortable/layout-animation.d.ts`:** `export declare const layoutAnimation: (…) => DisplacementInstaller` becomes `export declare function layoutAnimation(…)`.

## Performance: preparation

### Instruments and per-arm versions

Each comparison arm bundles its own drag **and** its own box-quad.

- **`bench/compare.ts --before 5b581fbdf`:** a copy in the edited worktree, modified as [`compare-and-lab.diff.txt`](measurements/2026-11-14-owner-refactor/harness/compare-and-lab.diff.txt) shows:
  1. **Per-arm box-quad:** the stock script aliases `@ydinjs/box-quad` to the working tree's `packages/box-quad/src/index.ts` in every arm. So `--before` would have bundled the edited box-quad in both arms. The copy also archives `packages/box-quad/src` at the `--before` revision and aliases the before arm to it.
  2. **Four new freeDrag rows:** `freeDrag` with `bounds()` and `dropTargets()` over 10 or 400 targets of 20 px. Each count gets 300 moves and 50 activate-and-drop cycles. A cycle drops over a target in even cycles and over none in odd ones. The standard free-drag row composes neither `bounds` nor `dropTargets`, the two free-drag files the owner changed, and no standard row times a freeDrag drop. The rows use the existing `exact-and-floor` rule.
  3. **An environment-guarded bundle dump,** used only to verify the arms.
- **xy() focused harness:** [`probes/xy-held-geometry/timing/`](probes/xy-held-geometry/README.md), with three cases:
  - A: `xy()` rebuild.
  - M: `xy()` committed move with `layoutAnimation()`.
  - C: `y()` scan of 2,000 items.

  The adapted copy ([page](measurements/2026-11-14-owner-refactor/harness/xy-page.ts.txt), [runner](measurements/2026-11-14-owner-refactor/harness/xy-runner.ts.txt)) imports `before` from the baseline worktree and `production` and `control` from the edited worktree. It resolves `@ydinjs/box-quad` by the importer's worktree. The decision rule is unchanged.

- **box-quad `coordinates`:** box-quad's [`coordinates-walk/compare.ts.txt`](../../box-quad/.plan/probes/coordinates-walk/README.md), unmodified. Each arm is a whole `index.ts`: `base` and `base2` are `5b581fbdf`'s file, the A/A pair, and `edited` is the owner's file.
- **Allocation:** DRD-52's C6 probes and the XYH probes ([`rect-index-ownership/`](probes/rect-index-ownership/README.md), [`xy-held-geometry/`](probes/xy-held-geometry/README.md)), each launched alone through `bench/campaign.ts` as documented. The block was appended to a scratch copy of `tests/hot-path.browser.test.ts` in each worktree ([block](measurements/2026-11-14-owner-refactor/harness/allocation-probes.test.ts.txt)). It differs from the stored probes in two ways:
  - Each print line also reports `allSrc`, the total sampled bytes under `/src/`.
  - One new probe, `VERIFY lifetime probe`, samples 40 controller lifetimes after 5 warm-ups. A lifetime is create, then an optional single activate-and-drop, then `requestDestroy`. There are three compositions: `y()`; `xy()` with `layoutAnimation()`; and `freeDrag` with `bounds()` and `dropTargets()`.

  Heap sampling keys bytes by each frame's served source URL, so no allocation here is attributed through `DRF-21`'s comment markers.

### Harness checks before the hold

- **compare arms:** in the dumped bundles, `before` holds baseline box-quad (`out[0] = x` in `localDelta`) and baseline drag (no `MotionConstraint` class). `production` holds the edited box-quad (`out[DELTA_X] = x`) and the edited classes. Both contain the new lab entry.
- **compare new rows:** one round ran over the four new rows only. Every cycle ended in every arm, with 2 layouts per cycle. The round was unheld, so **its readings are discarded** and kept only as the check ([log](measurements/2026-11-14-owner-refactor/prehold/compare-new-rows-smoke-discarded.log)).
- **xy() `--check-only`:** one operation per arm, no timing ([log](measurements/2026-11-14-owner-refactor/prehold/xy-check-only.log)). All three arms read the same rects: 2,001 in A, 4,002 in M and 0 in C. They give the same results, and M reports the same vectors (`1001 40 0`, `1001 -40 0`). The bundle holds two `localDelta` functions, one from each tree.
- **box-quad allocation, `<rounds>` 0:** run before the hold as the harness check ([log](measurements/2026-11-14-owner-refactor/prehold/box-quad-allocation.log)). It is reported with the in-hold reading below.

## Performance: timing (under the owner's hold)

[`hold.txt`](measurements/2026-11-14-owner-refactor/hold/hold.txt):

| Event                          | Time (UTC)           |
| ------------------------------ | -------------------- |
| Hold confirmed                 | 19:37:54             |
| compare                        | 19:37:54 to 20:33:11 |
| xy()                           | 20:33:11 to 20:34:12 |
| box-quad                       | 20:34:12 to 20:41:36 |
| Release confirmed by the owner | after 20:41:40       |

Every step exited 0. The load average read 0.61 at the start and 2.89 at the end. The three steps ran sequentially, with nothing else from this session. The only exception is one read-only progress check (`cat`, `tail`, `ls`) at 20:09:29, at the owner's request.

**Decision rules,** unchanged:

- `compare.ts`'s `judge`: slower or faster needs the same sign in at least 6 of 7 rounds and a median beyond the largest A/A difference. Layouts are exact.
- The xy() harness and the box-quad harness apply the same paired rule.

**"No difference shown" is inconclusive.** It doesn't establish equality.

### drag, compare.ts, 7 rounds

[log](measurements/2026-11-14-owner-refactor/hold/compare.log), [raw](measurements/2026-11-14-owner-refactor/hold/compare.json.txt). Every layout count is equal between before and production.

| Row | script median Δ / A/A bound (µs) | task median Δ / A/A bound (µs) | Verdict |
| --- | --- | --- | --- |
| 300 moves, 20 items (y(), layoutAnimation) | +5 / 50 | +38 / 758 | no difference shown |
| 300 moves, 2000 items | −9 / 43 | −204 / 797 | no difference shown |
| press and release, 4 rows (20/2000, cached/children) | −12 to −2 / 42 to 138 | −36 to −1 / 135 to 287 | no difference shown |
| 50 cycles, 20 items, no landing | −77 / 685 | −431 / 4,088 | no difference shown |
| 50 cycles, 20 items, with landing | +12 / 514 | +253 / 2,188 | no difference shown |
| 50 cycles, 2000 items, no landing | +63 / 301 | +603 / 5,695 | no difference shown |
| 50 cycles, 2000 items, with landing | −103 / 399 | +705 / 7,628 | no difference shown |
| 50 keyboard reorders, 20 / 2000 | −32 / 123; +52 / 172 | −42 / 229; +57 / 520 | no difference shown |
| free drag, 300 moves (no bounds, no targets) | +1 / 24 | −23 / 402 | no difference shown |
| free drag + bounds + 10 targets, 300 moves (new) | −24 / 50 | −379 / 600 | no difference shown |
| 50 free-drag cycles, bounds + 10 targets (new) | −153 / 481 | −128 / 2,508 | no difference shown |
| free drag + bounds + 400 targets, 300 moves (new) | −3 / 31 | +55 / 384 | no difference shown |
| 50 free-drag cycles, bounds + 400 targets (new) | −120 / 984 | −299 / 3,682 | no difference shown |
| in the page: 300 moves, 20 / 2000 | −3 / 49; +2 / 28 | −52 / 280; −21 / 268 | no difference shown |
| in the page: 50 cycles, 20 items | −15 / 467 | −161 / 1,335 | no difference shown |
| in the page: driver alone | 0 / 3 | +4 / 135 | no difference shown |

### xy() focused harness, 7 rounds

[log](measurements/2026-11-14-owner-refactor/hold/xy.log), [raw](measurements/2026-11-14-owner-refactor/hold/xy-probe.json.txt), [bundle](measurements/2026-11-14-owner-refactor/hold/xy-bundle.js.txt). Every timed batch lasted at least 355 ms.

| Case | Before median | Median Δ | A/A bound | Signs | Verdict |
| --- | --: | --: | --: | --- | --- |
| A: xy() rebuild, no sink | 895.1 µs | +56.6 µs (+6.3 %) | 197.3 µs | 4 higher, 3 lower | no difference shown |
| M: xy() committed move, layoutAnimation(), one cell in flight | 4,212.5 µs | −418.0 µs (−9.9 %) | 582.0 µs | 3 higher, 4 lower | no difference shown |
| C: y() scan of a grown window | 1.442 µs | +0.123 µs (+8.5 %) | 0.163 µs | **7 higher**, 0 lower | no difference shown |

**Case C** is higher in all 7 rounds, but its median stays inside the A/A bound, so the rule doesn't flag it. It is reported as a consistent direction without a verdict. It is not a measured slowdown.

### box-quad `coordinates`, 7 pages

[log](measurements/2026-11-14-owner-refactor/hold/box-quad.log), [raw](measurements/2026-11-14-owner-refactor/hold/box-quad.json.txt). Each value is the harness's recorded ns per sample span. The reference arm is `base`.

| Scenario | Reference median | edited median Δ | edited signs | A/A (`base2`) median Δ | A/A bound | Verdict |
| --- | --: | --: | --- | --: | --: | --- |
| fallback (no `above`), depth 2 | 7,700 | +250 | 5 higher | +650 | 6,000 | no difference shown |
| fallback, depth 14 | 71,675 | −2,525 | 6 lower | −2,700 | 6,525 | no difference shown |
| fallback, depth 32 | 166,800 | −1,125 | 5 lower | −4,550 | 18,350 | no difference shown |
| with `above`, depth 14 | 4,200 | 0 | 4 higher | −25 | 225 | no difference shown |

## Performance: allocation

Allocation is reported apart from speed. The vitest probes ran after the release, outside the hold, as the probe records allow. Sampled bytes measure allocation, not time.

### drag, heap sampling at 16 B, 3 rounds per tree

Every probe ran in a launch of its own, in the `shipped` project. The rounds alternated baseline and edited, from 21:01:42 to 21:23:44 UTC, with load average 1.9 to 2.9. Every campaign exited 0, and no launch read 0 B. [readings](measurements/2026-11-14-owner-refactor/allocation/readings.txt), [table](measurements/2026-11-14-owner-refactor/allocation/table.txt), [load](measurements/2026-11-14-owner-refactor/allocation/load.txt), [commands](measurements/2026-11-14-owner-refactor/allocation/commands.txt).

"Probe" is the stored probe's own figure, filtered to its modules. "All `/src/`" is every sampled byte under `/src/` per unit.

| Probe | Unit | Probe value, baseline | Probe value, edited | Δ mean | All `/src/` Δ mean |
| --- | --- | --- | --- | --: | --: |
| C6 y sample (warm, per pointer sample) | move | 49.5–50.5 | 48.2–51.3 | −0.6 | +0.3 |
| C6 xy sample | move | 49.4–52.3 | 48.9–50.7 | −0.7 | −0.3 |
| **C6 y committed move, cold** (200 crossings) | move | **111.0–116.7** | **137.3–140.4** | **+23.9** | **+23.3** |
| C6 y committed move, warm (after 2,000) | move | 15.0–16.3 | 16.3–17.4 | +1.5 | −3.2 |
| XYH xy committed move, layoutAnimation | move | 831.0–845.2 | 840.2–849.3 | +6.5 | −2.1 |
| XYH xy first move, fresh sortable each | operation | 6,633–6,695 | 6,532–6,619 | −93.5 | −603.8 |
| lifetime y, idle | lifetime | 3,161–3,214 | 2,827–2,844 | −358.6 | same |
| lifetime y, one operation | lifetime | 18,906–18,951 | 18,518–18,545 | −397.6 | same |
| lifetime xy + layoutAnimation, idle | lifetime | 3,720–3,743 | 3,071–3,110 | −647.0 | same |
| lifetime xy + layoutAnimation, one operation | lifetime | 22,820–22,930 | 22,059–22,219 | −732.4 | same |
| lifetime freeDrag + bounds + targets, idle | lifetime | 2,833–2,854 | 2,718–2,736 | −117.5 | same |
| lifetime freeDrag + bounds + targets, one operation | lifetime | 17,268–17,343 | 16,610–16,729 | −622.3 | same |

- **More allocation, on `y()`'s cold committed-move path.** The ranges are disjoint in all three rounds. By served-URL key, the whole increase is in `sortable/linear-shift.ts:moved`: 1,140–1,200 B over 200 moves at the baseline, and 5,868–6,120 B in the edited tree. `rect-index.ts:#read` and `shift` are unchanged in range. After 2,000 unsampled crossings, the warm probe samples nothing under `linear-shift.ts:moved` in either tree. Its +1.5 B overlaps at 16.3 B, so it is inconclusive. The mechanism isn't identified. The pattern, allocation that disappears once the code is warm, is consistent with tiering, but that is not established. **This is reported and not changed.**
- **Less allocation, on controller lifetimes.** All six lifetime readings, and the XYH first-move all-`/src/` reading, are lower in the edited tree, with disjoint ranges. The lifetime probe is new to this unit and has no mutation witness yet.
- **Warm per-sample movement:** the y and xy sample probes and the warm xy committed move show differences within each tree's spread. They are inconclusive.

### drag, compare.ts rows recorded under the hold

- **Retained objects after 200 operations and destroy, 3 rounds:**
  - before: growth 20,868 B in every round;
  - production and control: 20,140 B in every round.

  The rule reads **retains less**: a median of −728 B against an A/A bound of 0 B.

- **Bytes per move, 20 items, 7 rounds:** the per-function readings were summed per round. The medians are before 5,682, production 5,658 and control 5,636. Production's range lies within the before and control ranges. The row's module-keyed kernel verdicts rely on `DRF-21`'s comment markers, so they aren't used, and nothing is attributed to a module from this row.

### box-quad `coordinates`, 3 pages per run

Bytes per call, edited against base, with the A/A pair `base2` against base. Two runs: [before the hold](measurements/2026-11-14-owner-refactor/prehold/box-quad-allocation.log) and [in the hold](measurements/2026-11-14-owner-refactor/hold/box-quad.log).

| Scenario           | base            | edited          | base2           |
| ------------------ | --------------- | --------------- | --------------- |
| fallback, depth 2  | 366.7–368.7     | 366.5–367.4     | 366.9–369.0     |
| fallback, depth 14 | 3,025.7–3,029.0 | 3,026.2–3,030.5 | 3,024.0–3,029.1 |
| fallback, depth 32 | 6,830.6–6,840.1 | 6,839.8–6,845.4 | 6,832.2–6,842.2 |
| `above`, depth 14  | 216.1–217.7     | 215.8–217.7     | 216.6–217.6     |

At depth 32, edited reads 2 to 11 B per call above the run's base median on every page of both runs. `base2` reads −6 to +4 B against the same medians. The coordinates-walk record held a similar +6.3 B and didn't claim it. This one isn't claimed either. Every other row overlaps the A/A pair.

## Evidence limits and unavailable coverage

- **Firefox and WebKit:** not run.
- **The four new freeDrag compare rows** have no `--prove` sensitivity witness. Their "no difference shown" carries less than the validated rows'. The **lifetime allocation probe** is likewise new and unwitnessed.
- **xy() activation and drop timing:** the CDP compare rows use only `y()`. xy() is timed only through the focused harness's rebuild and committed-move cases. No xy() activate-and-drop cycle and no pointer-driven xy() move row was timed.
- **Landing:** freeDrag landing is outside every timed row. Sortable landing is timed in the two "with landing" cycle rows.
- **Module attribution through `compare.ts`'s bytes rows** is unavailable under `DRF-21`, and wasn't used. Allocation attribution here comes from the vitest heap-sampling keys only.
- **box-quad `ancestry` alone** has no timing or allocation window.
- **Timing ran on a machine that wasn't idle:** load average 0.61 rising to 2.89, unpinned. The wide A/A bounds on the cycle rows, up to 7.6 ms per 50 cycles of task time, limit what any row could detect.
- **Out of scope:** the deferred `--prove` and `--floors` campaigns, drag2, threshold and budget changes, and dependency installation.

## Record checks

This report was formatted with `just fmt`, and its 39 relative links resolve. `git diff --check` passes on it. In the saved evidence, `git diff --check` reports only what the raw files carry: trailing spaces in command output, and blank context lines in the saved diffs. They are kept unedited. Lint doesn't apply to Markdown here.

## Open and next

New findings for the owner and the review that follows, reported without any change to source:

1. The `drag:DRD-35` declaration test fails. TS2578 at `tests/callbacks.declaration.test.ts` lines 172 and 174: the receiver declarations on `retire` and `invalidate` are gone.
2. drag lint fails, because `tsconfig.json` drops `.plan/probes/callback-list/allocation.ts`.
3. The published declarations change: type-only classes with `#private` replace the `MotionConstraint` and `DropTargetTracker` interfaces, against `DropTargets`' "A third party may supply its own". Two new `.d.ts` files ship.
4. `y()`'s cold committed move allocates about +24 B more per move, in `linear-shift.ts:moved`.
5. Size: Brotli changes by −32 to +40 B per row. The same five rows are red, two of them with larger margins.

**Stopping boundary:** this report and its evidence are committed on `drag/class-refactor` and pushed. The owner's source edits stay uncommitted. No PR was opened. The independent review of the class conversions is next, and the owner starts it.
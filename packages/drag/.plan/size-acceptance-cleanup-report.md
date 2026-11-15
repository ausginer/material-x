# Report: the size re-base, the owner's source edit, the prototype arm's retirement, and the cleanup of five findings

**Handoff:** [`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md), items 1 to 10 and the final re-measure. **Input:** `91b13613f` on `drag/size-acceptance`. **Governing records:** `drag:DRD-68` as amended, `DRD-69`, `DRO-20`, `DRO-21`, `DRO-5` as answered, `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21` and `DRF-42`, and §Disposition of the size acceptance in [`00-index.md`](00-index.md).

**Outcome:** all ten items are implemented, and **no stop was hit.**

- Item 1's table reads the architect's figures, and `npx just size` exits 0 at its commit.
- The final re-measure moves no row, and "draggable alone" reads exactly 2189.
- `npx just test` and the Chromium and Firefox engine runs exit 0. Typecheck and lint exit 0.
- The emitted `.js` differs from a build of `988643dc9` only by item 2's move and the one JSDoc sentence from item 7.

There are two open points: `SortableBehavior.invalidate` still declares `this` (§Open), and a stale comment in `bench/lab.ts`, which is outside this handoff's scope.

## Commits

| Commit | Content |
| --- | --- |
| `e9ca3732f` | Item 1 alone |
| `a3423c793` | Items 2 to 10. Item 5's runs, item 10's witnesses, the final re-measure and the checks ran at this tree |
| this report's commit | The witness diffs, logs and probe under [`probes/size-acceptance-cleanup/`](probes/size-acceptance-cleanup/), and this report |

## Edits

Line numbers are at `a3423c793`, under `packages/drag/`.

| Item | Edits |
| --- | --- |
| 1 | `bench/size/measure.ts:58-143`: each `budget` and the control take the handoff's figures. `:36-40`: the `budget` docblock says that until the first release of `@ydinjs/drag`, each change the owner approves moves every ceiling and the control to its reading (`drag:DRD-68`), and that after release a reading over its ceiling is a decision again |
| 2 | `src/shared/landing.ts:3-5`: `DEFAULT_LANDING_DURATION` and `DEFAULT_LANDING_EASING` are module-private, with the module's one-line comment. `src/shared/timing.ts` is deleted |
| 3 | `tests/support/commands.node.ts`: `tap` is removed. `tests/support/browser-commands.ts`: its declaration is removed. The comment at `tests/click-guard.browser.test.ts:290` stays |
| 4 | `tests/support/harness.ts:233-258`: `focusableList(count, parent?)`, `row` and `makeBox` are defined once. `activation`, `keyboard`, `landing`, `order`, `focus`, `commit` and `free-drag` import them, and their local copies and the imports those copies alone used are removed. `tests/support/heap-snapshot.node.ts` is new. It holds `HeapSnapshot`, a `SnapshotSession` with `send`, `on` and `off`, and `takeHeapSnapshot`, which subscribes, calls `HeapProfiler.takeHeapSnapshot`, unsubscribes in a `finally` block and parses the chunks. It collects no garbage. `tests/support/commands.node.ts:94-101`: `countHeapObjects` collects once, then calls it. `bench/heap-snapshot.ts:10, 37`: `retainedObjects` enables the profiler, collects twice, then calls it. Each caller keeps its own count. `mount` in `commit` and `free-drag`, and `makeBox` in `drop-targets`, are unchanged |
| 5 | `bench/compare.ts:96-241`: `Bundle` holds the key of each line (`lines`). `bundle` generates with `sourcemap: true`, and `sourcemapPathTransform` makes each source absolute. A source that isn't one of the chunk's modules throws. `sourcesPerLine` decodes the `mappings` VLQs, with arithmetic because lint forbids bitwise operators. A line whose segments name exactly one source takes that module's key, and any other line is `null`. Keys keep their form: the path under the arm's source root, or else the path from the package. `moduleAt` throws on a line it can't place. The trace record's `modules` comes from `moduleStarts`, the first line of each run of a module, so the record keeps its shape. `samplingProfile` (`:492`) and every arm, `--before` included, use the same `bundle` |
| 6 | `bench/size/measure.ts`: `--prototype`, `PROTOTYPE_ROWS`, `measurePrototype`, `PROTOTYPE_REVISION`, the comparison column, the docblock sentence and the `execFile` and `promisify` imports are removed. Two more went because they served only the prototype: `bundleSize`'s `boxQuad` parameter, and the `__DEV__` define with its comment. The current source doesn't read `__DEV__`, and the readings are unchanged. `bench/compare.ts`: `prototypeArm` and `PROTOTYPE_REVISION` are removed. `:4-12` and `:33-35`: the docblock describes the before arm as production's `src` at `--before <revision>`. `:2158-2172`: a comparison, `--profile` and `--attribute` build that before arm. `:2236-2240`: without `--before`, they throw before any build or browser starts: `compare: a comparison, --profile and --attribute need a before arm: pass --before <revision>`. `:954`: `judge`'s `against` defaults to `['before']`. `packageArmsOnly` is removed with its filter, because every arm is now built from this package's source. `Justfile:61`: "Compare per-operation cost with an earlier revision". `git grep 599684791 -- packages/drag ':!packages/drag/.plan'` finds nothing |
| 7 | `README.md:241`: `controller.use(lifter.cancelLanding, lifter)`. `:175`: "The members of the `sortable` and `freeDrag` controllers also work when detached." is removed, and "Call `draggable`'s controller methods on the controller" becomes "Call a controller's methods on the controller", so that no sentence singles out which members work detached. `src/lift.ts:374`: "It works when detached." is removed. `tests/classes.browser.test.ts`: `drag:DRD-20 detached controller methods` is removed with its three tests. The file comment (`:1-4`) no longer claims detached calls work, and the now-unused imports are removed |
| 8 | `src/sortable/retirable.ts:14`: `retire(): void`. `src/free-drag/drop-targets.ts:103, :131`: `#resolve()` and `#release()`. `tests/callbacks.declaration.test.ts`: `passAlone` with `drag:DRD-35 capabilities declare their receiver`, and `passSwapped` with `drag:DRD-63 each built-in receiver is its own type`, are removed, along with the imports only they used (`DisplacementSink`, `InsertionGeometry`, `RectIndex` and `DraggableController`). `drag:DRI-8`, `drag:DRI-9 and drag:DRI-10` and `drag:DRD-35 the receiver is an object` stay. The sites `sortable.ts:59`, `sortable/behavior.ts:207, :209` and `sortable.ts:67` still pass their receivers |
| 9 | `src/sortable/invalidatable.ts`: TSDoc on the interface and on `invalidate`. It says that `invalidate` marks what the implementer holds as stale and reads no layout, because scroll and resize call it many times a second. `sortable` calls the axis geometry's as a step on each scroll and resize and on `invalidate()`, and a geometry calls its own index's or shift's. `src/sortable/retirable.ts`: TSDoc on the interface and on `retire`. It says that `retire` releases what the implementer holds for its controller or operation. `sortable` passes the axis geometry's to the operation's `use` and the sink's to the controller's `use`. False comments are removed: `RectIndex.collect`'s "Locals, not repeated field reads inside the loops." and the tracker `#resolve`'s "Read once, outside the hit-test loop." No other comment in the loops `988643dc9` changed says that a value is read into a local or read once |
| 10 | `tests/destruction.browser.test.ts:381-449`: the sentinel is a `const` created inside `operateThenDestroy` (`:397`), and only `onStart` reads it (`:416`). The test's own variable that held it is gone, along with `behavior = null`. `refs[0]`, `refs[1]` and `refs[2]` are the sentinel, the first row and the list, pushed at the same point in the same order. The title becomes _should retain no item, callback or behavior instance after 3 operations and destruction_, because the body asserts the sentinel, the first row and the class count, and doesn't assert the list. The operations, the other assertions and `isChromium` are unchanged |

## Item 1: the ceilings at `e9ca3732f`

`npx just size` exits 0. At the input, `91b13613f`, the same readings failed on five rows and the control, as `DRD-68` records. Brotli, in bytes:

| Row                            | Ceiling | Reading | Modules |
| ------------------------------ | ------: | ------: | ------: |
| draggable alone (control 2189) |    2189 |    2189 |       7 |
| draggable + lift               |    3932 |    3932 |       9 |
| example: resize handle         |    3265 |    3265 |       9 |
| example: drop zone             |    4570 |    4570 |      12 |
| example: canvas group          |    3261 |    3261 |       9 |
| freeDrag                       |    4984 |    4984 |      15 |
| freeDrag + bounds + landing    |    5465 |    5465 |      18 |
| sortable + y                   |    6533 |    6533 |      20 |
| sortable + xy                  |    6484 |    6484 |      19 |
| complete                       |    7143 |    7143 |      23 |

## The final re-measure, at `a3423c793`

Log: [`size-final.log`](probes/size-acceptance-cleanup/size-final.log). `npx just size` exits 0. **No row moves against `988643dc9`'s readings,** so every ceiling already equals its reading and nothing is re-based. "draggable alone" reads exactly 2189.

| Row                         | `988643dc9` | `a3423c793` | Modules          |
| --------------------------- | ----------: | ----------: | ---------------- |
| draggable alone             |        2189 |        2189 | 7                |
| draggable + lift            |        3932 |        3932 | 9                |
| example: resize handle      |        3265 |        3265 | 9                |
| example: drop zone          |        4570 |        4570 | 12 → 11 (item 2) |
| example: canvas group       |        3261 |        3261 | 9                |
| freeDrag                    |        4984 |        4984 | 15               |
| freeDrag + bounds + landing |        5465 |        5465 | 18 → 17 (item 2) |
| sortable + y                |        6533 |        6533 | 20               |
| sortable + xy               |        6484 |        6484 | 19               |
| complete                    |        7143 |        7143 | 23 → 22 (item 2) |

Item 2 matches the architect's probe: every Brotli figure is unchanged, and the three rows that import `shared/landing` each lose one module.

## Item 5

Each log and diff is under [`probes/size-acceptance-cleanup/`](probes/size-acceptance-cleanup/).

**1. The placement before and after.** [`placement.ts`](probes/size-acceptance-cleanup/placement.ts) cuts `bundle` and `moduleAt` from a given copy of `compare.ts`, builds the base arm (`bench/lab.ts` on a given `src`) with them, and prints each placement. All three runs build the same bundle, so the line numbers are comparable.

| Function | Input instrument, input `src` ([log](probes/size-acceptance-cleanup/placement-input.log)) | Repaired instrument, input `src` ([log](probes/size-acceptance-cleanup/placement-new-on-input.log)) | Repaired instrument, repaired `src` ([log](probes/size-acceptance-cleanup/placement-repaired.log)) |
| --- | --- | --- | --- |
| `RectIndex` and its 16 methods | `sortable/domain.ts` | `sortable/rect-index.ts` | `sortable/rect-index.ts` |
| `directionOf` | `sortable/collection.ts` | `sortable/keyboard.ts` | `sortable/keyboard.ts` |
| `keyboardInsertion` | `sortable/collection.ts` | `sortable/keyboard.ts` | `sortable/keyboard.ts` |
| Modules placed on no line | `sortable/rect-index.ts`, `sortable/keyboard.ts` | none | none |

At the input, `RectIndex` falls under `sortable/domain.ts`, the last marker before it. When `DRF-21` was registered it fell under `shared/landing.ts`, because the bundle's order has changed since then.

**2. An allocation in `sortable/rect-index.ts`.** [`rect-index-allocation.diff`](probes/size-acceptance-cleanup/rect-index-allocation.diff) makes `RectIndex`'s `first` getter allocate a four-number array per call, which `y()`'s `resolve` reads once per frame. The diff was applied for one run of _bytes per move by function, 20 items_ with `--before 91b13613f --rounds 3`, then reverted ([log](probes/size-acceptance-cleanup/rect-index-allocation.log), [reading](probes/size-acceptance-cleanup/rect-index-allocation.json)).

- The allocation is keyed `sortable/rect-index.ts:get first`: 147, 143 and 137 B per move in the production arm, and 141, 142 and 139 B in the control arm. It is absent from the before arm.
- Every other `RectIndex` frame is keyed under `sortable/rect-index.ts` in every arm, including the before arm built from `91b13613f`.
- The bytes rule judges only kernel modules, so this row flags nothing, as intended.
- **A first attempt** assigned the array to a module-level `let` that nothing read. Rolldown dropped the store and kept `this.#first, this.#end, …;` as a bare expression, so the getter read 1 B per move. The diff that was kept stores the array on `globalThis`, as `1 KB allocated per move` does. I only saw that first run's figures, and its log was overwritten.

**3. The bytes rule still selects the kernel.**

- `--prove --dry --only "1 KB allocated per move|an array of four numbers per sample, in Gesture.enter|one entry on the step list per frame"` applies all three and exits 0 ([log](probes/size-acceptance-cleanup/prove-dry.log)).
- `--prove` with the same `--only` exits 0 ([log](probes/size-acceptance-cleanup/prove.log), [record](probes/size-acceptance-cleanup/prove.json)):
  - _1 KB allocated per move_ flags at 1052, 1052 and 1051 B per move;
  - _an array of four numbers per sample, in Gesture.enter_ flags at 91, 103 and 98 B per move;
  - _one entry on the step list per frame_ stays quiet;
  - the A/A pass ran in full, and every row is quiet.

None of `DRD-45` property 9's entries was selected.

**`--rejudge` of a recording that holds a prototype arm still works.** `node bench/compare.ts --rejudge .plan/measurements/2026-11-07-compare.json` reads a recording with the arms `drag2`, `prototype`, `production` and `control`. It judges against each before arm the recording holds and exits 0 ([log](probes/size-acceptance-cleanup/rejudge-prototype.log)). Its output is identical to the input `compare.ts`'s on the same file, and the file's SHA-256 is unchanged.

**Item 6's check:** `node bench/size/measure.ts` runs and prints the table. `npx just size` runs it, as above.

## Item 10's witnesses

Each run is `npx just test --project browser tests/destruction.browser.test.ts -t "<title>"` at `a3423c793`, with the diff applied for the run and then reverted. Logs and diffs are under [`probes/size-acceptance-cleanup/`](probes/size-acceptance-cleanup/).

| Case | Result |
| --- | --- |
| Unmutated ([log](probes/size-acceptance-cleanup/item10-unmutated.log)) | passes |
| **A retained callback:** [`options-kept.diff`](probes/size-acceptance-cleanup/options-kept.diff) makes `sortable()` push every config into a module-level array, so the callbacks outlive `requestDestroy`. No `SortableBehavior` instance is kept ([log](probes/size-acceptance-cleanup/item10-options-kept.log)) | fails at the sentinel's assertion, `expected [ {}, undefined ] to deeply equal [ undefined, undefined ]`. The sentinel is retained and the row isn't |
| The same mutation, with [`sentinel-soft.diff`](probes/size-acceptance-cleanup/sentinel-soft.diff), a probe-only edit that makes the sentinel's assertion `expect.soft` so that the class count is read too ([log](probes/size-acceptance-cleanup/item10-options-kept-soft.log)) | the sentinel's assertion fails as above. It is the only error, so **the class count passes** |
| **The proof's row 3:** [`live-controller-kept.diff`](probes/size-acceptance-cleanup/live-controller-kept.diff) keeps the live controller, never destroyed, in an array in the test's frame ([log](probes/size-acceptance-cleanup/item10-live-controller-kept.log)) | fails at the sentinel's assertion, `expected [ {}, undefined ] to deeply equal [ undefined, undefined ]`. At the input, the proof read this case passing the sentinel |
| Contrast: the input's test, from `91b13613f`, under `options-kept.diff` ([log](probes/size-acceptance-cleanup/item10-input-test-options-kept.log)) | passes. This is the gap `DRF-42` describes |

## Checks

| Check | Result |
| --- | --- |
| `npx just test` in `packages/drag` | exit 0: 66 files, 928 tests passed, no type errors. At `cc3b839f9` the count was 931 passed and 5 failed (the size rows). The difference of 8 is the three removed `DRD-20` tests in the source and consumer projects, and the two removed declaration tests. The five size rows now pass |
| `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox` | exit 0: 62 files, 898 passed and 10 skipped. The earlier 904 passed included the three removed tests in each of the two engines. WebKit wasn't run (`DRO-18`) |
| `npx just typecheck` | exit 0. The unused `@ts-expect-error` at `tests/callbacks.declaration.test.ts:197` is gone with its test. Removing the `this` parameters made no other line fail |
| `npx just fmt`, `lint-fix`, `fmt`, `lint` on every edited `.ts` | lint exits 0. The edits removed the unused imports that the first lint pass reported. `Justfile` has no formatter or linter. `README.md` and this report are formatted with `oxfmt`, and no linter applies to Markdown |
| `git grep 599684791 -- packages/drag ':!packages/drag/.plan'` | nothing |
| Markdown links in this report | checked by a script that resolves each relative link from this file. Every target exists |

## The emitted tree against `988643dc9`

I built `988643dc9` in a temporary worktree, removed afterwards, and compared each `.js`, `.js.map` and `.d.ts` at the package root and in its subdirectories with `a3423c793`'s build.

- **Files:** `shared/timing.js` and `shared/timing.js.map` are gone (item 2). No file is added.
- **`.js` that differ:**
  - `shared/landing.js`: the import of `./timing.js` goes, and the two constants are declared in the module with their comment. The duration default is now the named constant, where `988643dc9`'s build had inlined 200;
  - `lift.js`: `cancelLanding`'s JSDoc loses "It works when detached." (item 7).
- **No other `.js` differs,** including `free-drag/drop-targets.js` and `sortable/rect-index.js`. The removed `this` parameters and the comments inside their method bodies don't reach the emitted code.
- **`.d.ts` that differ:**
  - `lift.d.ts`: the JSDoc (item 7);
  - `sortable/invalidatable.d.ts` and `sortable/retirable.d.ts`: the TSDoc (item 9), and `retire(): void` (item 8).
- **Maps** differ for `free-drag/drop-targets`, `lift`, `shared/landing` and `sortable/rect-index`, where source lines changed.

## Open

- **`SortableBehavior.invalidate` still declares `this: SortableBehavior`** (`src/sortable/behavior.ts:121-124`). `sortable.ts:67` passes it to `requestStep` with `behavior` as its receiver. `DRD-63` added that declaration as a receiver declaration, for "`sortable`'s `invalidate` step". `DRD-69` property 4 says "no built-in member declares `this` for a receiver check", but its list, `Retirable.retire` and the tracker's `#resolve` and `#release`, leaves this member out, and so does the handoff's scope. **I left it unchanged.** The architect should decide whether property 4 covers it. If it does, removing it changes no emitted `.js`.
- **`bench/lab.ts:3`** still says "The production and prototype arms bundle this file". `lab.ts` isn't in this handoff's scope, so the comment is unchanged. The arms are now the before arm and production.
- **`--profile` and `--attribute` now need `--before`.** Before this change they compared the prototype with production. With the prototype gone they compare the `--before` arm with production, and without `--before` they end with item 6's error.
- `drag/prototype` can now be deleted, because no instrument reads `599684791`. Deleting it is the owner's (`DRO-5`).

## Next

The architect reads this report.
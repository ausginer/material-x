# Activation result report

**Input:** `drag/production` at `1d5d3fa13`, the owner's commit of the pending built-in edits, on `02a2d74c2`, which carries the `DRF-3` repair's report. **Governing records:** [`activation-result-handoff.md`](activation-result-handoff.md) and `DRD-30` in [`00-index.md`](00-index.md).

**Outcome: `DRD-30` is implemented, and no return condition was met.** Every suite run fails only the three size rows that fail at the base. One expectation changed: `authoring.browser`'s list of a `Drag`'s keys lost `'state'`, which is the change `DRD-30` makes to the `Drag`. It is listed under §Tests for the reviewer. No cost is accepted, no ceiling or threshold is re-based, and no timing or `compare.ts` run was made.

| Commit | Content |
| --- | --- |
| `1d5d3fa13` | The owner's edits to `src/free-drag.ts` and `src/sortable.ts`, committed by the owner. Item 1 checked it and made no commit |
| `da139407e` | Item 2: `DRD-30` in the kernel, the built-ins, every behavior outside `src/`, and the README |
| `3a67df0ea` | One lifecycle witness added after item 2, for a row no test observed (§Lifecycle map) |
| the commit carrying this report | This report and [`2026-11-08-activation-result.txt`](measurements/2026-11-08-activation-result.txt) |

Raw output is in [`2026-11-08-activation-result.txt`](measurements/2026-11-08-activation-result.txt).

## Item 1: the owner's edits

`git diff 02a2d74c2 1d5d3fa13 -- packages/drag/src | sha256sum` gives `bdcb626a5b1b0737febb6f657a223c38f535e0bfc69c222c42b787a9f2267e45`, and `--shortstat` gives `2 files changed, 24 insertions(+), 23 deletions(-)`. Both match the handoff. The commit is unchanged. `just test` at `1d5d3fa13`: 327 passed and 3 failed, the three size rows.

## Item 2: the kernel

**Types.** `Behavior<State, Verdict, Operation extends BehaviorOperation<Verdict>>` keeps `threshold`, `admit`, `command` and a required `activate(drag: Drag<Operation>, state: State): Operation | null`. `BehaviorOperation<Verdict>` holds `start`, `move`, `drop`, `settle` and `end`, none of which takes a `Drag`. `Drag<Operation = unknown>` has no `state`, and its `requestStep` step receives `Operation | null`. `DraggableController<Operation>` and `draggable<State, Verdict, Operation>` follow. `draggable.js` exports the type `BehaviorOperation`. The type parameters are those of `DRD-30`'s sketch, with `Operation` defaulting to `BehaviorOperation<Verdict>`.

**Inference.** A literal behavior infers `State` and `Verdict` as before. Its operation type falls to the default `BehaviorOperation<Verdict>` unless the type arguments name it, because `activate`'s parameter is typed by `Operation` too. So a behavior whose steps read members of its own operation names the three type arguments. That covers both built-ins, `canvas-group`, and four tests. A class instance gives no inference site for the operation either, and the declaration test names it.

**Order.** `#activate`, `#drop`, `#conclude`, `#endPending`, `terminate` and the reader keep their statements in order. The changes, statement by statement:

| Site | Change |
| --- | --- |
| Constructor | `admission.state as State` moves from the `Drag` literal to the field `#state`, one statement earlier. It is the kernel's one cast, as before |
| `#activate` | `this.#behavior.activate?.(this.#drag) === false` becomes `const operation = this.#behavior.activate(this.#drag, this.#state)` and `if (!operation)`. `this.#started = true` becomes `this.#operation = operation`, at the same place: before `start`. `start` is called on the operation |
| `#activate`, command | The drop step passes the operation: `this.#drop(operation)` |
| `#move` | `this.#behavior.move?.(this.#drag)` becomes `operation.move?.()`, with no argument |
| `#up` | Passes the operation to `#drop` |
| `#drop` | Takes the operation, and calls `operation.drop?.()` |
| `#conclude` | `settle` and `end` are called on the operation |
| `stepTarget` | Returns `this.#operation` under the unchanged condition `this.#phase === ACTIVE && !this.#decision` |
| Fields | The `AbortController` named `#operation` is renamed `#presentation`, because `#operation` now holds the operation. `#started` is gone: the reference replaces it, and no field holds both |

**Where a test of the operation reference replaces a phase or `#started` test:**

| Site | Before | After | Why they agree |
| --- | --- | --- | --- |
| `handleEvent`, `Escape` | `this.#started && !this.#decision` | `this.#operation && !this.#decision` | The reference is set exactly where `#started` was set, and neither is cleared |
| `#conclude`, `settle` and the terminal | `this.#started`, twice | `operation`, read once before `settle` | As above. Nothing between `settle` and the terminal can set it, because only `#activate` sets it, and it runs once per session |
| `#move` | `this.#phase === ACTIVE` | `operation` | `#move` runs only while motion is open, which is while the phase is `PENDING` or `ACTIVE`: `#drop`, `#conclude`, `#endPending` and `terminate` close it. The reference is set in the same step that sets `ACTIVE`, before `start`, and no pass runs between the two. A `start` that throws leaves the phase `PENDING` with the reference set, but its fault is concluded in that pass, which closes motion |
| `#up` | `this.#phase === PENDING` | `!operation` | The same argument, for the complement |

The kernel has no non-null assertion on the operation, and no new cast. Its non-null assertions are the same four in `gesture.ts` and one in `session.ts` as at the base. `grep -rniE 'lift|landing' src/kernel src/draggable.ts` finds nothing.

**Allocation per sample.** `#move` reads one field and calls `operation.move?.()` with no argument. The `DRF-2` figures are under §`DRO-8`.

## Item 2: the built-ins

**Members by lifetime.**

| Class | Members |
| --- | --- |
| `FreeDragBehavior`, per controller | `threshold`, `root`, `config`, `window`, `#lifter`, `axis`, `bounds`, `landing`, `motion` (the scratch, written before every read), `invalidate` |
| `FreeDragOperation`, per operation | `#behavior`, `#drag`, `#lift`, `#offsetX`, `#offsetY`, `#request`, `#result` |
| `SortableBehavior`, per controller | `threshold`, `config`, `#window`, `#lifter`, `axis`, `displacement`, `landing`, `#measuredBox`, `#version`, `invalidate`, `#invalidateGeometry`, `#retireAxis` |
| `SortableOperation`, per operation | `#behavior`, `#drag`, `#lift`, `#direction`, `#frame`, `#context`, `item`, `snapshot`, `insertion`, `pointerX`, `pointerY`, `#request`, `#result` |

- **The operation reads controller-lifetime values through its `#behavior`.** It receives that one reference at construction, and owns none of those values. So the behavior members it reads are public members of a module-private class: `config`, `axis`, `bounds`, `landing`, `motion`, `root` and `window` in `freeDrag`, and `config`, `axis`, `displacement` and `landing` in `sortable`. Neither class is exported.
- **No activation resource is nullable.** `insertion` isn't either. The nullable members that remain:
  - `#request`, in both: `null` until the drop, because a cancel before the drop has none;
  - `#result`, in both: written by `settle` and read by `end`. It stays a field;
  - `#direction` in `sortable`: `null` names a pointer operation. It isn't a resource.
- **The admission's `state`:** `freeDrag` passes the visual itself. `sortable` passes `{ visual, box, direction }`, and no longer keeps the admission's snapshot.

**`activate`'s order against `f40c32f32`.** The owner's commit didn't change it.

- `freeDrag`: `acquire`, then the invalidation listener when there are bounds, then the operation's construction, then the first translate. The translate was `activate`'s last statement and still is.
- `sortable`: `acquire`, the second pull, the declines with `null`, the placeholder and its removal, its insertion and check, the frame task and its cancel, the axis retirement, the invalidation listener, then the operation's construction, then the axis invalidation. Each disposer is registered right after its resource, before the next acquisition.
- **No acquisition moved into an operation's constructor.** Both constructors only store what they receive. The context literal and the snapshot and insertion that were `drag.state` writes are now constructor arguments. Nothing outside `activate` could read them in between.

**Every function passed out, with its lifetime:**

| Function | Lifetime |
| --- | --- |
| `freeDrag`: `invalidate`, the controller step and invalidation listener | Per controller. Ignores its argument |
| `freeDrag`: `moveTo`'s step, `(operation) => operation?.moveTo(point)` | Per call (`DRD-25`) |
| `freeDrag`: the verdict closure from `drop` | Per drop, as at the base |
| `sortable`: `invalidate`, the controller step | Per controller. Calls `operation.rebase` with a fresh pull |
| `sortable`: `#invalidateGeometry`, `#retireAxis` | Per controller |
| `sortable`: `updateInsertion`, the frame step | **Per module.** It was a per-controller arrow. It now only forwards to `operation.updateInsertion()`, so it closes over nothing. The step list is per controller, so coalescing is unchanged |
| `sortable`: the placeholder removal, the frame callback, the frame cancel and the invalidation listener | Per operation, created in `activate` |
| `sortable`: the verdict closure from `drop` | Per drop, as at the base |
| Both: `lifter.cancelLanding` | Per controller |

Nothing is created per sample.

**The `AxisQuery` and `AxisContext` choice.** **`SortableOperation` is the `AxisQuery`, and the `AxisContext` literal stays.** The operation has the query's five members: `item`, `snapshot`, `insertion`, `pointerX` and `pointerY`. That replaces `drag.state` as the query and allocates nothing more. Serving as the context too would need `AxisContext`'s `settle` renamed, which collides with the hook. `y.ts`, `xy.ts` and `linear-shift.ts` read `context.settle`, and they aren't in item 2's file table. So the literal stays, with the allocation `DRD-30` expects: one more object per activation, the operation. `src/sortable/axis.ts` is unchanged.

**Non-null assertions** (the full lists are in the raw output):

| Files | Base | After | What remains, and the value asserted |
| --- | --: | --: | --- |
| `src/sortable.ts` | 16 | 6 | `#request!` ×3 in `#recordResult`: a skipped or verdict outcome exists only after a drop, which writes it. `#result!` in `end`: `settle` wrote it. `defaultView!` ×2: the root is connected |
| `src/free-drag.ts` | 11 | 5 | `#request!` ×2 in `settle`: a verdict exists only after a drop. `#result!` in `end`. `defaultView!` ×2 |
| `src/sortable/*`, `src/free-drag/*`, `src/kernel/*`, `src/draggable.ts` | 40 | 40 | Unchanged, the same sites |

The operation asserts no lift, frame, context, placeholder or insertion.

## Behaviors outside `src/`

- **Fixtures.**
  - `resize-handle`: `activate` returns `{ move, end }`, which closes over the `Drag` and the press state.
  - `drop-zone`: `admit` returns no `state`. `activate` acquires the lift, creates the `{ zone }` record, and returns `{ move, drop, settle }`. `zoneAt` and `highlight` stay module-level functions.
  - `canvas-group`: the press state keeps the origins, guides and basis. The nudge and the rendered offset move into `activate`. The operation literal has `render`, `nudge`, `move` and `drop`, and the frame step `render` is module-level. The controller's `nudge` steps call `operation?.nudge(amount)`.
- **`src/draggable.stories.tsx` and `bench/lab-no-lift.ts`:** `activate` returns the hooks. The other two stories use the built-ins and are unchanged.
- **`tests/support/harness.ts`:** unchanged. `managed` is typed `typeof draggable`, so it follows the new signature.
- **Tests:** every behavior moved its hooks into the operation that `activate` returns. `false` became `null`. A step's parameter is now the operation. The test files of three groups were migrated by forked subagents under the handoff's rules. I reviewed their diffs, and checked mechanically that no `expect`, `toEqual`, `toBe` or logged string changed. That check found only the line below and the added witness assertions.
  - **The one changed expectation:** `authoring.browser` › "should give a lifted behavior a drag with only the kernel keys" no longer lists `'state'`. It is the `Drag`'s public key set, which `DRD-30` changes ("`Drag` has no `state`"), and not an order, outcome, focus, fault or DOM result. **It is for the reviewer to confirm.**
  - In `terminals`, the two tests where `activate` throws or declines keep their hooks. They are now on an operation that `activate` constructs and discards, so `log` = `[]` still observes that no `start` or `end` runs.
- **README:** the authoring section's hook table, the `requestStep` rule and its example, and the lift composition. `src/lift.ts`: its module comment says that the `Lift` is kept in the operation.

## Witnesses

- **`authoring.declaration`** (type-checked):
  - a `Drag` has no `state`, and `activate` receives it;
  - a `Behavior` with `start`, `move`, `drop`, `settle` or `end` is refused;
  - `activate` is required;
  - it returns an operation or `null`, and `false` and `undefined` are refused;
  - a step's parameter is the operation type or `null`, through the controller and through a `Drag`, and a step typed for a `Drag` is refused.

  The existing lift, admission, class and session witnesses moved to the new shape.

- **Browser, by identity:** `requests` › "should give a step the operation activate returned while the operation is active" is the existing active-window test, extended:
  - a step through the controller and one through the `Drag` both receive the returned operation by identity;
  - after the drop, a step receives `null`.

  "null before activation", "null while a verdict is pending" and "null behind a decision" are existing tests, migrated.

## Lifecycle map

Each `DRD-30` row, and the tests that observe it once migrated:

| Row | Tests |
| --- | --- |
| Item disconnected at activation | `activation` › "should run no hook for a custom behavior whose item was disconnected during the press" |
| `activate` returns `null` | `terminals` › "should deliver no start or end when activate declines, and no report". `operation-lifecycle` › "should release a partial acquisition with the outcome when activate declines": the disposer receives `skipped`. `operation-lifecycle` › "should keep a cancel recorded in activate when activate then declines": the decision stands. `activation` › the two command declines |
| `activate` throws | `terminals` › "should deliver no terminal without a start: %s before start" (`cancel`, `destroy`, `fault`), whose discarded operation never reaches the kernel. `operation-lifecycle` › "should keep a cancel recorded in activate when activate then throws". `faults` › "should restore the visual and let the acquisition fault decide" |
| Partial acquisition | `operation-lifecycle` › "should release a partial acquisition…" and "should release with the fault when the operation constructor throws after a use". `release` › "should remove the sortable placeholder before the lift is released" |
| A step requested during `activate` | `operation-lifecycle` › "should run a step requested in activate after it, with the returned operation", and "should give a step requested in activate null behind a cancel requested there" |
| A cancel during `activate` | `operation-lifecycle` › "should start, settle and end with a cancel requested in activate". `requests` › "should finish the step when a custom element reaction asks to cancel during activate" |
| Destruction during `activate` | `destruction` › "should tear down totally when requested from activate". `requests` › the same reaction test with `destroy` |
| Verdict | `verdict` › "should keep a late %s after a cancel from reaching the next drag" and "should let a late %s after destruction reach nothing" (`resolve`, `reject`). `requests` › "should give a step null while a verdict is pending" |
| After release | `release` › "should release in the fixed order": `end` follows every disposer. `release` › "should run a late use at once with the outcome" |

**Added:** `tests/operation-lifecycle.browser.test.ts`, with seven tests in all engines. Five were in item 2's commit. The cancel-then-decline and cancel-then-throw pair is in `3a67df0ea`: no migrated test observed the outcome when a decision recorded in `activate` stands.

## Checks

| Check | Result |
| --- | --- |
| Format, lint-fix, format, lint on the 33 changed `.ts` and `.tsx` files | Pass. Lint asked for each operation class to be declared before its behavior, which `new` uses |
| `just typecheck` | Pass |
| `just test` at `3a67df0ea` | 339 passed and 3 failed, 342 in all. The failures are the size rows: the `draggable alone` control moved by 99 B (83 at the base), `freeDrag` 152 B over its ceiling (56), and `freeDrag` + `bounds` + `landing` 158 B over (66) |
| `just test-engines` at `3a67df0ea` | 930 passed, 18 skipped, 948 in all, with no failure. The `DRF-3` unit's run on the same source as `1d5d3fa13` had 909 passed: the 21 more are the seven lifecycle tests in three engines |
| `just build` | Pass |
| `just docs-api-prepare` | 0 errors and 5 warnings. The base, in a scratch worktree, also gave 0 errors and 5 warnings |
| Kernel `grep` | No match |
| README | Formatted. `git diff --check` clean |

**`compare.ts` injections,** checked and not fixed. They go to `DRF-1` and the instrument repair's item 2:

| Injection | File | `find` at `1d5d3fa13` | After item 2 |
| --- | --- | --- | --- |
| about 1 ms of script per cycle, at the drop | `sortable.ts` | no | no |
| one object of about 1 KB retained per operation past destruction | `sortable.ts` | yes | no |
| one forced layout per move | `sortable.ts` | yes | no |
| one O(n) walk per move | `sortable.ts` | yes | no |
| 1 KB allocated per move | `draggable.ts` | no | no |
| one entry on the step list per frame | `draggable.ts` | no | no |

## `DRO-8`

**Size,** `just size`, minified and Brotli. The base is `1d5d3fa13`. Item 1 made no commit, and `3a67df0ea` changes only a test.

| Row                               | `1d5d3fa13` | `da139407e` |    Change |
| --------------------------------- | ----------: | ----------: | --------: |
| `draggable alone` (control)       |  6464, 2107 |  6435, 2123 |  −29, +16 |
| `draggable` + `lift`              | 11920, 4112 | 11891, 4129 |  −29, +17 |
| example: resize handle            |  9131, 3210 |  9092, 3229 |  −39, +19 |
| example: drop zone                | 12790, 4420 | 12690, 4420 |   −100, 0 |
| example: canvas group             |  9285, 3235 |  9228, 3230 |   −57, −5 |
| `freeDrag`                        | 14978, 5023 | 15080, 5119 | +102, +96 |
| `freeDrag` + `bounds` + `landing` | 15663, 5276 | 15765, 5368 | +102, +92 |
| `sortable` + `y`                  | 20202, 6606 | 20122, 6668 |  −80, +62 |
| `sortable` + `xy`                 | 19818, 6545 | 19738, 6608 |  −80, +63 |
| `complete`                        | 21235, 6985 | 21155, 7054 |  −80, +69 |

- **The kernel's share** is the `draggable alone` row: −29 minified and +16 Brotli. `draggable` + `lift` moves by the same minified figure, because `lift.ts` changed only in a comment.
- **The examples, minified, after the kernel's −29:** about −10 for the resize handle, −71 for the drop zone and −28 for the canvas group. A fixture's share in Brotli isn't separable, because compressed differences don't add.
- **The built-ins** grow in Brotli: `freeDrag` +96, `sortable` +62.
  - By reading, much of that is the operation classes' member names, which the minifier keeps. `DRO-8` expected that.
  - `freeDrag` also grows minified, +102. `sortable` shrinks minified, −80, because its state type, `recordResult` and `landingTarget` went into the class.
  - This is reading, not an ablation.
- **Gates:** `freeDrag` is now 152 B over its ceiling, `freeDrag` + `bounds` + `landing` 158 B over, and the control 99 B off. Nothing is re-based.

**Allocation, counted by reading,** with the [ownership report](ownership-report.md)'s rules: the objects and functions that library code creates at a site it owns, arrays and typed arrays included, not closure contexts, strings or platform objects. Against `1d5d3fa13`:

| Code | Per press that never activates | Per activation | Per controller | Per landing |
| --- | --- | --- | --- | --- |
| Kernel | 0 | 0. The command's drop step is still one closure | 0 | 0 |
| `freeDrag` | −1 object: the admission's `state` is the visual | +1 object, the operation | 0 | 0 |
| `sortable` | 0: the press state is smaller, still one object | +1 object, the operation | −1 function, `updateInsertion` | 0 |
| Example: resize handle | 0 | +1 object, +2 functions (`move`, `end`) | 0 | 0 |
| Example: drop zone | −1 object: no `state` | +2 objects (`{ zone }` and the operation), +3 functions (`move`, `drop`, `settle`) | 0 | 0 |
| Example: canvas group | 0: the press state keeps its arrays, one object | +1 object, +4 functions (`render`, `nudge`, `move`, `drop`) | −1 function, `render` became module-level | 0 |
| `bench/lab-no-lift` | 0 | +1 object, +2 functions | 0 | 0 |

- **Where this differs from what `DRO-8` expects by reading:** the kernel, `freeDrag` and `sortable` agree. `sortable` takes the "otherwise one more" branch, because the context literal stays.
  - `DRO-8` expected one operation per activation in the examples "where the example has no state object today".
  - Every example now allocates an operation literal, with one function per hook, because a literal's hooks close over the `Drag`, and `DRD-30` gives hooks no `Drag`.
  - The drop zone also moved its `{ zone }` record from the press to the activation.
  - A class written for an example would allocate one object per activation and no functions. The fixtures were migrated in shape only, so they use literals.
- **Per sample:** nothing in the kernel, the built-ins or the examples allocates per sample. Each operation's `move` exists before the first sample. `canvas-group`'s frame callback is created once per frame it schedules, as at the base.

**Per sample, measured:** the `DRF-2` test passed in 5 of 5 runs, in Chromium. The temporary log was removed after them.

| Run | `lift.ts:translate`, B per move |
| --: | ------------------------------: |
|   1 |                          136.73 |
|   2 |                          136.97 |
|   3 |                          140.09 |
|   4 |                          138.15 |
|   5 |                          139.39 |

The `DRF-3` unit recorded no `DRF-2` figures. For reference, the [lift representation report](lift-representation-report.md) recorded 135.87–140.84 at `b33890461`. The bound is 153.

## The kernel per-sample test

Its result in each suite run of this unit:

| Run | Result |
| --- | --- |
| `just test` at `1d5d3fa13` (item 1) | Passed |
| `just test`, item 2's working copy, before the lifecycle tests | Passed |
| `just test-engines`, item 2's working copy | Passed (Chromium only) |
| `just test` at `da139407e`'s content | Passed |
| `just test` at `3a67df0ea` | Passed |
| `just test-engines` at `3a67df0ea` | Passed (Chromium only) |

## Open

- **For the reviewer:** the `'state'` key removed from `authoring.browser`'s expected `Drag` keys (§Behaviors outside `src/`).
- **`DRO-8`:** the owner reads the figures above beside `DRO-7`. Nothing is accepted.
- **Inference:** a behavior whose steps read its own operation's members names `draggable`'s three type arguments (§Item 2: the kernel).
- **The kernel per-sample reading and `DRF-1`** stay open, apart from this unit.
- **Scratch:** the base worktrees and the run logs were removed after their content was copied into the raw output.

**Next:** the owner's `DRO-7` and `DRO-8` readings, then the combined independent review.
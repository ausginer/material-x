# Gesture receiver handoff

**Status, 2026-11-09:** implemented at `fd7ae3e43` and read by the architect in [`gesture-receiver-assessment.md`](gesture-receiver-assessment.md). The assessment's §3, item 1, corrects G1, G5 and G6 below against the saved base: that base has no second argument to `requestStep`, and its `freeDrag` wraps `cancelLanding`.

**One bounded unit for one implementer.** It completes the owner's uncommitted `Gesture` edit so that it meets `DRD-34` in [`00-index.md`](00-index.md). It then updates the tests and documentation that the decision affects.

**Read before starting:**

- **In the index:** `DRD-34`, then `DRD-32` and `DRD-20`'s binding bullets.
- **In [`contract.md`](contract.md):** the `draggable` paragraph of the public surface, DRI-6, DRI-7, DRI-8, DRI-9, DRI-10 and DRI-17.
- **CONTRIBUTING's TypeScript section:** declare a member that depends on its receiver as a method, and keep a callback that works when detached as a function type.

## Base

**`drag/feature-composition` at the commit that carries this file, with the owner's uncommitted edit in the working tree.** The edit changes five files under `src/`. The architect read it on `39af0ef44` and saved it as [`owner-edit.diff.txt`](probes/gesture-receiver/owner-edit.diff.txt).

- **Before starting, from the repository root, `git diff HEAD -- packages/drag/src | cmp - packages/drag/.plan/probes/gesture-receiver/owner-edit.diff.txt` must succeed.** If it fails, stop and return. Don't stash, reset or rewrite the owner's edit.
- **The edit is the starting point, not a patch to replace.** Keep its shape where `DRD-34` agrees with it: the methods on `Gesture`, `draggable` returning `new Gesture(...)`, one `enter` with an optional receiver, and `enter()` with no work for a request. The implementation commit carries the owner's edit together with your completion of it.

## The gaps in the edit

At the base, typecheck fails ([`typecheck.txt`](probes/gesture-receiver/typecheck.txt)). The other rows were found by reading. Each row names the `DRD-34` property it breaks.

| # | Gap | Effect | Property |
| --- | --- | --- | --- |
| G1 | `Session` still imports `InputHandler`, calls `enter(this, pointer)` and calls `apply()`. `freeDrag` passes a second argument to `requestStep` | Typecheck fails | 3 |
| G2 | `requestDestroy` sets `#destroyed` and then calls `enter()`, which refuses on `#destroyed` | Destruction requested while idle never tears down, and its promise never settles | 4 |
| G3 | `raise` is a prototype method, and `runDragDisposer` still receives it detached: in `Gesture.use`, in `#teardown`, in the `Drag`'s `use` and in `Session.#release` | A throwing disposer makes `raise` throw a `TypeError`. The walk stops: the remaining disposers don't run, and in `#teardown` the listeners stay and the promise doesn't settle. The report is for the `TypeError` and not for the thrown value | 7 |
| G4 | An idle `requestStep` calls the step with the controller as `this`. A step from the list gets no receiver | Behavior code reaches the controller through `this`, and the two paths differ | 6 |
| G5 | `FreeDragBehavior.invalidate` is a prototype method passed by identity, and `requestStep` ignores the second argument | Idle, it runs with the controller as `this`, so `this.bounds` is `undefined` and the bounds are silently not invalidated. During a pass it runs with no receiver and throws | 8 |
| G6 | `Lifter.cancelLanding` is a prototype method, and `sortable`, `freeDrag` and the README pass it to `use` detached | At destruction it throws, a fault is reported, and a running landing is not cancelled | 8 |
| G7 | `sortable` still copies `kernel.requestCancel` and `kernel.requestDestroy` into its controller | Its `requestCancel` and `requestDestroy` throw on every call, detached or not, because `this` is the controller record | 8 |
| G8 | `freeDrag`'s `requestCancel` is `() => kernel.requestCancel()` | The `reason` is lost, so `onEnd` doesn't carry it (DRI-4) | 8 |
| G9 | `countRefused` lost its per-event set, and it decides whether the argument is an event from an `isTrusted` property | A nested press during `start` counts twice. `terminals` › "should refuse a nested press, and take the next real one" expects one | 5 |
| G10 | `gesture.ts` starts with a file-wide `eslint-disable @typescript-eslint/unbound-method` | It hides G3 to G6 in that file | 9 |
| G11 | JSDoc and comments: `DraggableController`'s "Each method works when detached", the `Gesture` class comment's "`draggable` hands out only the latter", `Session`'s class comment on `handleInput`, and `enter`'s comment | They describe a removed design | 1, 3 |

## Work

**Two commits:** the implementation, and then the report.

### 1. Source

Meet `DRD-34`'s properties 1 to 10. Close every gap above.

- **The method form is yours** where `DRD-34` doesn't fix it. For example: how `enter` tells input from a request when it refuses or counts, how `runDragDisposer` receives the controller, and whether `Gesture` declares `implements DraggableController<Operation>`.
- **Restore** `FreeDragBehavior.invalidate` and `Lifter.cancelLanding` to the form they had at `39af0ef44`, or to another form that works when detached with one stable identity per instance. `freeDrag`'s `invalidate` passes `behavior.invalidate` by identity again, with no second argument.
- **The built-ins' controllers** wrap the kernel's `requestCancel` and `requestDestroy`, created once per controller. `requestCancel` forwards its `reason`. `SortableController` and `FreeDragController` keep their types.

### 2. Tests

Change only what is listed here.

- **`tests/classes.browser.test.ts`:**
  - The `draggable` test calls `requestStep`, `requestCancel`, `requestDestroy` and `use` on the controller. It keeps `use(lifter.cancelLanding)` passed detached, and keeps its assertions. Rename it so that its title says that, and update the file comment to cite `drag:DRD-20` and `drag:DRD-34`.
  - In the `sortable` and `freeDrag` detached tests, `onEnd` also logs the cancel's `reason`, and the expectation includes `'detached'`.
  - **Add a test for property 6:** a step written as a `function`, requested through the controller while idle and through a `Drag` during a pass, records `this` in both cases. Both are `undefined`.
  - **Add a test for property 8's `invalidate`:** `freeDrag`'s `invalidate`, called from a consumer callback that runs inside a pass, such as `onMove`, re-reads the bounds and reports no fault.
- **`tests/authoring.declaration.test.ts`:** in "should not let a controller or a drag reach the session", assert with `@ts-expect-error` that the controller's type has no `enter`, `raise`, `raiseInPass`, `detach` or `handleEvent`.

Existing tests already cover G2, G3, G6, G7 and G9. Don't edit them.

### 3. Documentation

- **`README.md`:** the sentence "Every controller method works when detached, as in `return controller.requestDestroy`" now says that `draggable`'s controller methods are called on the controller, as in `return () => controller.requestDestroy()`, and that the `sortable` and `freeDrag` controllers' members also work when detached. Search the README for any other text that says `draggable`'s controller methods work detached, and correct it.
- **Comments in `src/`:** the ones in G11, and any other comment the change makes false.

## Do not change

- **The signatures of `requestStep` and `use`,** on the controller and on the `Drag`. Don't add a receiver parameter or a binding helper.
- **How any other callback is represented:** steps, disposers, hooks, capability callbacks, `sortable`'s `invalidate`, and the `Drag`'s members.
- **The reader:** its precedence and its catch on each turn.
- **Public types,** apart from `DraggableController`'s JSDoc.
- **Size ceilings, `bench/`, and any test not listed above.** No re-base, and no timing.

## Checks

**WebKit is required.** Run every engine suite after `source ~/.cache/ms-playwright/webkit-env.sh`. If WebKit doesn't launch with the script, stop and return.

- The suite in Chromium, Firefox and WebKit (`npx just test-engines`). Size rows that fail at the base may still fail. Every other test passes.
- The per-sample test in `tests/hot-path.browser.test.ts` passes.
- Typecheck, and the [handoff](../../../.agents/docs/handoff.md) loop on each changed file. Lint passes with no file-wide suppression, and with at most the one line-scoped `unbound-method` suppression that `DRD-34` property 9 allows.
- **Size:** `node bench/size/measure.ts` at `39af0ef44` (in a scratch worktree) and after the implementation commit. Report each row's difference in minified and Brotli bytes. The owner has approved no figure (`DRD-34`, Cost).

**Mutations.** Apply each one to the implementation commit's source, run the named test, confirm that it fails, and revert. Commit none of them. Each mutation puts back the owner's edit at one site:

| Mutation | Test that must fail |
| --- | --- |
| `enter` refuses a request on a closed controller (G2) | `destruction` › "should settle the promise after teardown" |
| `Session.#release` passes `raise` to `runDragDisposer` detached (G3) | `release` › "should run disposers last in first out, past a throw" |
| No per-event set in the count (G9) | `terminals` › "should refuse a nested press, and take the next real one" |
| An idle step is called with the controller as its receiver (G4) | The new property 6 test |
| `FreeDragBehavior.invalidate` is a prototype method (G5) | The new `invalidate` test |
| `Lifter.cancelLanding` is a prototype method (G6) | `destruction` › "should cancel a running landing and the row animations" |
| `freeDrag`'s `requestCancel` drops the `reason` (G8) | `classes` › the `freeDrag` detached test |

## Report

Write `gesture-receiver-report.md` in this directory, and save raw output under `measurements/` as `2026-11-09-gesture-receiver.txt`. The report includes:

- the base check's result, and the implementation commit;
- for each gap, the change that closes it;
- each mutation's failing assertion;
- the suite's results in the three engines, and the per-sample test;
- the size table at `39af0ef44` and after, and the functions created per controller, by reading;
- any deviation from this handoff, with its reason, and any finding. Mint no `DRF`; the architect records findings.

Commit the report, push `drag/feature-composition`, and stop. The architect reads the report next.
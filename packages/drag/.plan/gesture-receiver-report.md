# Gesture receiver report

**Input:** `drag/feature-composition` at `c492e713e`, which carries [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md), with the owner's uncommitted edit to five files under `src/`. **Governing records:** `DRD-34`, `DRD-32` and `DRD-20` in [`00-index.md`](00-index.md), and [`contract.md`](contract.md).

**Base check:** `git diff HEAD -- packages/drag/src | cmp - packages/drag/.plan/probes/gesture-receiver/owner-edit.diff.txt` succeeded before any edit.

**Implementation commit:** `fd7ae3e43`. It carries the owner's edit and its completion. The raw output is [`2026-11-09-gesture-receiver.txt`](measurements/2026-11-09-gesture-receiver.txt).

**Outcome:** every gap in the handoff is closed, and the seven mutations fail their named tests. The suite passes in three engines. Three size rows fail, as they do at the base. **No cost is accepted and no budget is re-based.**

## Gaps

| # | Change that closes it |
| --- | --- |
| G1 | `Session` imports only `Gesture`. Its `handleEvent` enters the pass with `this.#move`, `this.#up` or `this.#endPending`, the event and the session as the receiver, so `handleInput` is gone. The session's cancel and a verdict's acceptance call `enter()`. Typecheck passes. See the first finding about `freeDrag`'s second argument |
| G2 | `enter` refuses only while a pass runs or after teardown: `this.#running \|\| (this.#destroyed && !this.#resolveDestroyed)`. Destruction requested while idle still has its slot filled, so its own pass opens and the reader tears down |
| G3 | `runDragDisposer(dispose, outcome, controller)` takes the controller and calls `controller.raise(error)`. Its parameter type is `Pick<Gesture<never, never, never>, 'raise'>`. All four sites pass the controller: `Gesture.use`, `#teardown`, the `Drag`'s `use` and `Session.#release`. No function is created per disposer or per report |
| G4 | An idle `requestStep` calls `enter(step, target)` with no receiver. The reader already called a listed step with none |
| G5 | `FreeDragBehavior.invalidate` is an arrow field again, as at `39af0ef44`. `freeDrag`'s `invalidate` passes it by identity, with one argument |
| G6 | `Lifter.cancelLanding` is an arrow field again, as at `39af0ef44`. `freeDrag` passes it to `use` detached again, as `sortable` and the README do |
| G7 | `sortable`'s controller wraps the kernel: `requestCancel: (reason) => { kernel.requestCancel(reason); }` and `requestDestroy: () => kernel.requestDestroy()`, created once per controller |
| G8 | `freeDrag`'s `requestCancel` forwards `reason`, in the same form as `sortable`'s |
| G9 | The per-event `WeakSet` is back, and `countRefused` takes an `Event`. `enter` counts only when a pass is running and a step was passed. While a pass runs, only input arrives with a step: a request passes none, and a step or a fault requested during a pass doesn't enter |
| G10 | The file-wide suppression is removed. One line-scoped suppression remains, with its reason, on `raiseInPass`'s `this.enter(this.raise, error, this)`. Without it, `@typescript-eslint/unbound-method` reports that line, which I checked by removing it |
| G11 | `DraggableController`'s JSDoc says to call each method on the controller. The `Gesture` class comment says that `draggable` returns the instance typed as `DraggableController`, which names only the public methods, and it says "the pass" in place of "the gate". `Session`'s class comment describes `handleEvent` entering the pass with a private method. `enter`'s comment states each kind of entry and its rule |

**Method form,** where `DRD-34` leaves it to the implementer:

- `enter()` takes an optional step, argument and receiver, with three overloads: a request, an idle step with no receiver, and work with its receiver. `NOOP` is gone, because a request passes no step.
- `Gesture` declares `implements DraggableController<Operation>`.

**Documentation.** In the README, the sentence in the handoff now says: "Call `draggable`'s controller methods on the controller, as in `return () => controller.requestDestroy()`. The members of the `sortable` and `freeDrag` controllers also work when detached." No other README text says that `draggable`'s methods work detached. `controller.use(lifter.cancelLanding)` stays as it is, because `cancelLanding` works detached.

**Tests,** as the handoff lists them:

- The `draggable` test in `classes.browser.test.ts` calls the four methods on the controller. It still passes `lifter.cancelLanding` detached, and it keeps its assertions. Its new title is "should run draggable controller methods called on the controller, with cancelLanding passed detached". The file comment cites `drag:DRD-20` and `drag:DRD-34`.
- In the `sortable` and `freeDrag` detached tests, `onEnd` also logs a cancel's `reason`. The expectations are `['end:canceled', 'detached', 'end:accepted']` and `['end:canceled', 'detached']`.
- A new `drag:DRD-34 receivers` block has two tests. **Property 6:** a `function` step requested through the controller while idle and through a `Drag` in `activate` records `[undefined, undefined]`. **`invalidate`:** `freeDrag`'s `invalidate` is called from `onMove` while the bounds shrink from 300 px to 200 px. Two samples later the box's right edge is at 200 and no fault is reported.
- `authoring.declaration.test.ts` asserts with `@ts-expect-error` that the controller's type has no `enter`, `raise`, `raiseInPass`, `detach` or `handleEvent`.

## Mutations

Each one was applied to `fd7ae3e43`, run in Chromium, and reverted. The tree was clean afterwards.

| Mutation | Test | Failure |
| --- | --- | --- |
| G2: `enter` refuses on `this.#destroyed` | `destruction` › "should settle the promise after teardown" | Timed out after 15000 ms, because the promise never settles |
| G3: `Session.#release` passes `{ raise: this.#gesture.raise }` | `release` › "should run disposers last in first out, past a throw" | `expected [ 'last added' ] to deeply equal [ 'last added', 'first added' ]`, with an uncaught `DragFault` for "Cannot read private member #session" |
| G9: no per-event set | `terminals` › "should refuse a nested press, and take the next real one" | `expected { trusted: +0, untrusted: 2 } to deeply equal { trusted: +0, untrusted: 1 }` |
| G4: an idle step gets the controller as `this` | `classes` › "should call a step with no receiver, requested while idle and during a pass" | `expected [ Gesture{}, undefined ] to deeply equal [ undefined, undefined ]` |
| G5: `FreeDragBehavior.invalidate` is a prototype method | `classes` › "should re-read freeDrag bounds on invalidate called during a pass" | `expected 90 to be close to 200`, with a `DragFault` for "reading 'bounds'" |
| G6: `Lifter.cancelLanding` is a prototype method | `destruction` › "should cancel a running landing and the row animations" | `expected 2 to be +0`, with a `DragFault` for "reading '#runningAnimationCanceller'" |
| G8: `freeDrag`'s `requestCancel` drops `reason` | `classes` › "should run freeDrag controller methods detached" | `expected [ 'end:canceled', 'undefined' ] to deeply equal [ 'end:canceled', 'detached' ]` |

## Checks

- **`npx just test-engines`,** with `webkit-env.sh` sourced: 69 files and 981 tests passed, with 18 skipped. Chromium passed 333, Firefox 324 and WebKit 324. Firefox and WebKit skip 9 tests each, by conditions already in the tests. I did not run the engines at the base.
- **The per-sample tests in `hot-path.browser.test.ts`.** "should allocate per sample only the CSS string a lifted write needs" and the `drag:DRF-2` variant pass in Chromium. Firefox and WebKit skip them by their existing condition. "should run no consumer callback per sample" passes in all three engines.
- **`npx just test`,** in Chromium with the node and declaration projects: 356 passed and 3 failed. The three failures are the size rows in §Size.
- **`npx just typecheck`** passes. The [handoff](../../../.agents/docs/handoff.md) loop ran on each changed TypeScript file, and `just lint` reports nothing. This report, the README and the raw output were formatted with `just fmt`. Links were checked by hand. `git diff --check` is clean. No Markdown linter is configured, so lint did not apply to the Markdown files.

## Size

`node bench/size/measure.ts` ran at `39af0ef44` and at the base in scratch worktrees, and at `fd7ae3e43`. The source under `src/`, `bench/` and `tests/` is the same at `39af0ef44` and `c492e713e`. "Base" is `c492e713e` with `owner-edit.diff.txt` applied. Each figure is minified / Brotli bytes, and a second run gave the same figures.

| Composition | `39af0ef44` | Base | After | After − `39af0ef44` | After − base |
| --- | --- | --- | --- | --- | --- |
| draggable alone | 6600 / 2138 | 6397 / 2093 | 6321 / 2066 | −279 / −72 | −76 / −27 |
| draggable + lift | 11411 / 3912 | 11205 / 3869 | 11132 / 3838 | −279 / −74 | −73 / −31 |
| example: resize handle | 9257 / 3249 | 9054 / 3204 | 8978 / 3181 | −279 / −68 | −76 / −23 |
| example: drop zone | 13050 / 4529 | 12844 / 4499 | 12771 / 4462 | −279 / −67 | −73 / −37 |
| example: canvas group | 9393 / 3248 | 9190 / 3212 | 9114 / 3179 | −279 / −69 | −76 / −33 |
| freeDrag | 15035 / 4986 | 14845 / 4920 | 14770 / 4897 | −265 / −89 | −75 / −23 |
| freeDrag + bounds + landing | 16200 / 5394 | 16010 / 5353 | 15935 / 5331 | −265 / −63 | −75 / −22 |
| sortable + y | 19739 / 6395 | 19533 / 6365 | 19474 / 6345 | −265 / −50 | −59 / −20 |
| sortable + xy | 19558 / 6362 | 19352 / 6330 | 19293 / 6303 | −265 / −59 | −59 / −27 |
| complete | 21412 / 7029 | 21208 / 6996 | 21147 / 6968 | −265 / −61 | −61 / −28 |

**Violations reported by the script:**

| Row | `39af0ef44` | Base | After |
| --- | --- | --- | --- |
| draggable alone (control) | moved by 114 B | moved by 69 B | moved by 42 B |
| example: drop zone (ceiling 4431 B) | over by 98 B | over by 68 B | over by 31 B |
| freeDrag (ceiling 4967 B) | over by 19 B | — | — |
| freeDrag + bounds + landing (ceiling 5210 B) | over by 184 B | over by 143 B | over by 121 B |

Every row is smaller than at `39af0ef44` and at the base. The rows that fail after the change also fail at the base. No ceiling or control was changed.

**Functions created per controller, by reading:**

| Controller | `39af0ef44` | After |
| --- | --- | --- |
| `Gesture`, in every composition | 5 arrow fields (`raise`, `requestStep`, `requestCancel`, `requestDestroy`, `use`), and `draggable`'s separate record | None, and no record |
| `sortable`'s controller | 1 (`invalidate`) | 3 (`invalidate`, `requestCancel`, `requestDestroy`) |
| `freeDrag`'s controller | 2 (`invalidate`, `moveTo`) | 4 (`invalidate`, `moveTo`, `requestCancel`, `requestDestroy`) |

So `draggable` alone creates 5 fewer functions and 1 fewer object per controller. `sortable` and `freeDrag` each create 3 fewer functions and 1 fewer object. `FreeDragBehavior.invalidate` and `Lifter.cancelLanding` are one arrow field per instance, as at `39af0ef44`. Nothing changes per operation or per sample: the session passes its private methods to `enter` and creates no function to do it. This agrees with `DRD-34`'s Cost paragraph.

## Deviations and findings

These are for the architect. No `DRF` is minted.

1. **G1's second argument to `requestStep` is not in the edit.** `owner-edit.diff.txt` changes `freeDrag`'s `use` and its `requestCancel` and `requestDestroy`. At the base, its `invalidate` already calls `kernel.requestStep(behavior.invalidate)` with one argument, so there was nothing to remove. The edit made the step a prototype method (G5), and that is what this unit reverts.
2. **After teardown, `enter` refuses every entry, and not only input.** Property 4 states the refusal for input. No request or step can reach `enter` after teardown: `requestStep` returns on `#destroyed`, `requestCancel` needs the session that teardown clears, and a verdict's completion finds its session ended. So the wider condition changes no reachable behavior, and it agrees with DRI-10's "a later request does nothing".
3. **The count uses one invariant to identify input.** While a pass runs, `enter` counts only when it was given a step. That holds because, during a pass, only input calls `enter` with a step. The comment at the check states this. If a later change made a request or a step enter with work during a pass, it would be counted.
4. **The G3 mutation has a different form.** `runDragDisposer` now takes the controller, so the mutation can't pass `raise` alone. It passes `{ raise: this.#gesture.raise }`, which is the owner's detached call.
5. **The G2 mutation fails by timeout,** not by an assertion, because the promise it awaits never settles.
6. **The size control row was red before this unit.** "draggable alone" has a control of 2024 B. It was 114 B over at `39af0ef44`, 69 B over at the base and is 42 B over now. This change is inside its graph, so the row was expected to move. Its earlier movement comes from units before this one, and this report does not assign it to any of them.
7. **`drag.ts` imports a type from `gesture.ts`,** for `runDragDisposer`'s parameter type. `gesture.ts` already imports `drag.ts`, so the two files now import each other. The `drag.ts` import is type-only and is removed at compilation.

## Stop

The unit is committed and pushed on `drag/feature-composition`. The architect reads this report next. No PR is open, and the combined review has not started.
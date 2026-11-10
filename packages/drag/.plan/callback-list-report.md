# Callback list report

**Input:** `drag/feature-composition` at `fd2c9631c`, which carries [`callback-list-handoff.md`](callback-list-handoff.md). **Governing records:** `DRD-35` and `DRO-12` in [`00-index.md`](00-index.md), `DRD-34`, `DRD-6` and `DRD-16`, and [`contract.md`](contract.md).

**Base check:** all four steps succeeded before any edit.

1. `git cat-file -e 9f885b9a9` succeeded with no fetch.
2. `sha256sum` of [`owner-edit.diff.txt`](probes/callback-list/owner-edit.diff.txt) gave `a5b8feec280f70d3f2cacd149a5f2ff63da8f855f4d355af5afc2e09bee46358`.
3. `git diff 25a67d4a9 HEAD -- packages/drag/src packages/drag/tests` was empty, and the tree was clean.
4. The model's diff and then the owner's edit applied with no conflict.

The owner's `drag/step-queue-model` worktree and the `drag/step-key-model` worktree were not read, written, stashed or reset.

**Implementation commit:** `53c87f988`. It carries the model, the owner's edit and their completion. The raw output is [`2026-11-09-callback-list.txt`](measurements/2026-11-09-callback-list.txt).

**Outcome:** every gap in the handoff is closed, and M1 to M12 fail their named checks. The suite passes in three engines, and the per-sample test passes. **Every size row grows by 424 to 448 B minified and 129 to 152 B Brotli, and four rows that passed at the base now fail.** No cost is accepted and no budget is re-based.

## Gaps

| # | Change that closes it |
| --- | --- |
| L1 | `gesture.ts` imports only `CallbackList` |
| L2 | `runDisposers` loops `while (!disposers.empty)` and calls `disposers.run(argument)` in a `try`. Its comment says that it walks a list `CallbackList.stack()` made, so last in first out |
| L3 | `Session#disposers` is `CallbackList.stack<Outcome \| null>()` |
| L4 | The session's `Drag` types `use` and `requestStep` with `(this: object \| undefined, …)` callbacks and `receiver?: object`. `enter`'s receiver overload is `R extends object` again, as at `25a67d4a9`. Its receiver parameter is `R \| undefined`, because a step requested while idle passes its receiver or none. `runDragDisposer` takes `receiver: object \| undefined`. **`Gesture.requestStep` has a third overload,** `(step: (this: object \| undefined, …) => void, receiver: object \| undefined)`, which the session's `Drag` calls to forward a step with its receiver or with none. `DraggableController` doesn't declare it, so no exported type names it. No signature takes an `unknown` receiver |
| L5 | The receiver overloads of `requestStep` and `use`, on `Drag`, on `DraggableController` and on `Gesture`, declare `Receiver extends object` |
| L6 | `CallbackList`'s entries are `Array<ListedCallback<Argument> \| object \| undefined>`, where `ListedCallback<Argument>` is `(this: object \| undefined, argument: Argument) => void`. `Function` is not used. `oxlint` and ESLint report nothing on the file, with no disable |
| L7 | The ported tests use `CallbackList.queue()` and `CallbackList.stack()` |
| L8 | `InsertionGeometry.invalidate`, `InsertionGeometry.retire` and `DisplacementSink.retire` declare `this: InsertionGeometry` or `this: DisplacementSink`. M11 and M12 now fail typecheck |
| L9 | `callback-list.ts`'s file comment is removed. The class comment states the two factories, each list's own direction function and that `run` doesn't branch on direction. `run`'s JSDoc says to call it only when an entry is waiting. `enter`'s comment says that a step requested while idle passes the receiver it was requested with, if any. `SortableBehavior`'s class comment says that each step it requests is the same function on every request, or the axis's method passed with the axis. The ported tests' file comments and `describe` titles cite `drag:DRD-35`, `drag:DRI-8`, `drag:DRI-9` and `drag:DRI-10`, and no "model" wording remains |

**Form, where `DRD-35` leaves it to the implementer:**

- `has(callback: ListedCallback<Argument>, receiver: object | undefined)`. `add` keeps the owner's generic form, `add<Receiver extends object>(callback: (this: Receiver, argument: Argument) => void, receiver?: Receiver)`.
- The factories pass `Argument` to the constructor explicitly: `new CallbackList<Argument>(…)`.
- Each factory call creates its own arrow function, as in the owner's edit. `queue()`'s shifts the callback and then the receiver. `stack()`'s pops the receiver and then the callback.
- `DragDisposer` is exported and unchanged: `(outcome: Outcome | null) => void`. No signature uses it now.

**Documentation:**

- **README, §The `requestStep` rule:** a new paragraph says that a step passed alone is called with no receiver, and that one passed with an object, as in `controller.requestStep(this.refresh, this)`, is called on it. The same step requested twice before it runs runs once only with the same receiver, or with none both times.
- **README, §Cleanup with `use`:** a disposer passed with an object is called on it, and every `use` call is its own registration, so the same disposer registered twice runs twice. `controller.use` takes a receiver in the same way, and a late one runs at once on its receiver.
- **JSDoc:** `Drag.use` has JSDoc for the first time. Both overloads of `Drag.requestStep`, `Drag.use` and the controller's two members state the receiver rule. `Gesture`'s `#steps` and `#disposers` and `Session#disposers` say that each entry has its receiver.

## Tests

- **`callback-list.browser.test.ts`,** ported with every assertion except one:
  - **Changed:** "should keep duplicate checking apart from insertion" ran `runFirst`, `runLast` and `runFirst` on one list, and expected `[a, 1], [undefined, 2], [a, 3]`. A list now has one direction, so the test uses `queue()` and three `run` calls, and expects `[a, 1], [a, 2], [undefined, 3]`. Its `has` assertions are unchanged. `waiting` is `empty` with the opposite value.
  - "should remove an entry before calling it" uses `stack()` in place of `runLast`.
  - **New, for the list on its own:** "should run a queue first in first out, each entry on its receiver", "should run a stack last in first out, each entry on its receiver", and "should be empty before the first add and after the last run" for a queue and for a stack.
- **`callback-list.declaration.test.ts`,** ported unchanged except for the file comment, the titles and two imports. **New, with `@ts-expect-error`:**
  - a primitive receiver is refused by `requestStep` and `use` on a `Drag` and on the controller. With `extends object` removed from the overloads, the four directives are unused and typecheck fails;
  - `InsertionGeometry.retire` passed to a `Drag`'s `use`, and `DisplacementSink.retire` passed to the controller's `use`, without their receiver are refused. With the `this` declarations removed, the two directives are unused and typecheck fails.
- **`size.node.test.ts`:** `src/kernel/callback-list.ts` is in `draggable alone`'s module list. The module-graph test passes.
- **Unchanged and passing:** `classes` › "should call a step with no receiver, requested while idle and during a pass", and the DRI-8 tests in `requests.browser.test.ts`.
- **No other test changed.** No existing test broke under the new types.

## Mutations

Each one was applied to `53c87f988`, run in Chromium or by `tsc`, and reverted. The tree was clean afterwards.

| Mutation | Named check: failing assertion | Other failures |
| --- | --- | --- |
| M1. `has` ignores the receiver | "should run one method once per receiver, in request order": `expected [ 'start finished', 'a' ] to deeply equal [ 'start finished', 'a', 'b' ]` | "should keep a step requested with no receiver apart from the same step with one", and the list's duplicate test |
| M2. `requestStep` adds without `has` | `requests` › "should coalesce one function requested twice before it runs": `expected [ 'step', 'step' ] to deeply equal [ 'step' ]`. "should pull once for two invalidate calls in one callback": `expected 2 to be 1` | Three ported step tests |
| M3. `use` skips a waiting pair, in `Gesture.use` and in the session's `Drag` | "should run operation cleanup last in first out, on each receiver, once per call": `expected [ 'b:skipped', 'free', 'a:skipped' ] to deeply equal [ 'a:skipped', 'b:skipped', …(2) ]`. "should run controller cleanup on each receiver at teardown, and a late one at once": the first `'a:null'` is missing | None |
| M4. `queue()`'s direction takes the last entry | `requests` › "should keep the order of moveTo closures in one pass": `expected 100 to be close to 200` | Two more `requests` tests and four ported tests |
| M5. `stack()`'s direction takes the first entry | `release` › "should run disposers last in first out, past a throw": `expected [ 'first added', 'last added' ] to deeply equal [ 'last added', 'first added' ]` | Two more `release` tests and three ported tests |
| M6. Both direction functions call with no receiver | 11 ported tests, among them the queue and stack tests, every receiver step and cleanup test, and "should call the axis and the sink on themselves": `expected false to be true` | None |
| M7. A step requested while idle loses its receiver | "should call a step requested while idle on its receiver at once": `expected [] to deeply equal [ null ]` | Three ported tests, including the axis and sink spy test |
| M8. A late `use` loses its receiver, on the controller and in the session | "should run a late disposer at once, on its receiver, inside the walk that adds it": `'late:skipped'` is missing. "should run controller cleanup on each receiver at teardown, and a late one at once": `'b:null'` is missing | None |
| M9. `runDisposers` stops at the first throw | `release` › "should run disposers last in first out, past a throw": `expected [ 'last added' ] to deeply equal [ 'last added', 'first added' ]` | None |
| M10. The session's late `use` is added instead of run | `release` › "should run a late use at once with the outcome": `expected [] to deeply equal [ { type: 'skipped' } ]` | `release` › "should report a throw from a late use" |
| M11. `drag.use(this.axis.retire)`, disable kept | Typecheck: `src/sortable/behavior.ts(208,14): error TS2345: Argument of type '(this: InsertionGeometry) => void' is not assignable to parameter of type '(this: undefined, outcome: Outcome \| null) => void'` | — |
| M12. `kernel.use(displacement.retire)`, disable kept | Typecheck: `src/sortable.ts(60,16): error TS2345: Argument of type '(this: DisplacementSink) => void' is not assignable to parameter of type '(this: undefined) => void'` | — |
| M13. Teardown doesn't clear the steps | **No behavior test fails,** as expected | The full Chromium run fails 6 size rows instead of 7: without the clear, `example: canvas group` is back under its ceiling |

## Checks

- **`npx just test-engines`,** with `webkit-env.sh` sourced: 72 files and 1041 tests passed, with 18 skipped. Chromium passed 353, Firefox 344 and WebKit 344. Firefox and WebKit skip 9 each, by conditions already in the tests. The engines config runs no size row.
- **The per-sample tests in `hot-path.browser.test.ts`:** "should allocate per sample only the CSS string a lifted write needs" and the `drag:DRF-2` variant pass in Chromium. Firefox and WebKit skip them by their existing condition. "should run no consumer callback per sample" passes in all three engines.
- **`npx just test`,** in Chromium with the node and declaration projects: 378 passed and 7 failed, all of them size rows (§Size). Typecheck errors: none.
- **`npx just typecheck`** passes. The [handoff](../../../.agents/docs/handoff.md) loop ran on each changed TypeScript file. `just lint` reports nothing in `src/` and `tests/`. **On the probe, [`allocation.ts`](probes/callback-list/allocation.ts), `oxlint` reports three errors, which I left as they are:** `triple-slash-reference` on its `/// <reference types="node" />` line, and `no-console` on its two `console.log` calls. The probe prints its figures, and `tsconfig.json` doesn't include `.plan/`. The README, this report and the raw output were formatted with `just fmt`. Links were checked by hand, and `git diff --check` is clean. No Markdown linter is configured, so lint did not apply to the Markdown files.

### `unbound-method` disables

**In `src/`:** four line-scoped disables. No file has a file-wide disable.

| Site | Reason |
| --- | --- |
| `kernel/gesture.ts`, `raiseInPass`: `this.enter(this.raise, error, this)` | The pass calls `raise` on the receiver passed with it. `DRD-34` property 9 |
| `sortable/behavior.ts`: `drag.use(this.axis.retire, this.axis)` | Called on `this.axis`, passed with it. `DRD-35` property 8 |
| `sortable/behavior.ts`: `drag.requestStep(this.axis.invalidate, this.axis)` | Called on `this.axis`, passed with it. `DRD-35` property 8 |
| `sortable.ts`: `kernel.use(displacement.retire, displacement)` | Called on `displacement`, passed with it. `DRD-35` property 8 |

**In `tests/`:**

- `callback-list.browser.test.ts`, ported unchanged: four line-scoped disables, each "passed with its receiver", and three block disables that each cover the `use` calls of one test, each "each is passed with its receiver" and closed with `eslint-enable`.
- `callback-list.declaration.test.ts`: two ported line-scoped disables "called on `holder`" or "called on `sink`, passed with it", and four "the type error is the point", two of them new, on the lines that pass `retire` alone.
- Unchanged from the base: `order.browser.test.ts` and `activation.browser.test.ts` ("kept only to be put back"), `hot-path.browser.test.ts` and `landing.browser.test.ts` ("restored and called with `this`").

## Costs (`DRO-12`)

### Size

Minified / Brotli bytes from `node bench/size/measure.ts`. The base was measured once at `25a67d4a9` in a scratch worktree, which was then removed. `53c87f988` gave the same output in two runs.

| Composition | `25a67d4a9` | `53c87f988` | Difference | Ceiling (Brotli) |
| --- | --: | --: | --: | --- |
| draggable alone | 6321 / 2066 | 6769 / 2206 | +448 / +140 | **Over by 67 B.** The control moved by 182 B, from 42 B at the base |
| draggable + lift | 11132 / 3838 | 11580 / 3981 | +448 / +143 | Passes |
| example: resize handle | 8978 / 3181 | 9426 / 3323 | +448 / +142 | **Over by 10 B, newly** |
| example: drop zone | 12771 / 4462 | 13219 / 4614 | +448 / +152 | Over by 183 B, from 31 B |
| example: canvas group | 9114 / 3179 | 9562 / 3317 | +448 / +138 | **Over by 3 B, newly** |
| freeDrag | 14770 / 4897 | 15218 / 5040 | +448 / +143 | **Over by 73 B, newly** |
| freeDrag + bounds + landing | 15935 / 5331 | 16383 / 5472 | +448 / +141 | Over by 262 B, from 121 B |
| sortable + y | 19474 / 6345 | 19898 / 6474 | +424 / +129 | Passes |
| sortable + xy | 19293 / 6303 | 19717 / 6447 | +424 / +144 | Passes |
| complete | 21147 / 6968 | 21575 / 7114 | +428 / +146 | **Over by 49 B, newly** |

- **Rows that fail after the port and passed before:** `example: resize handle`, `example: canvas group`, `freeDrag` and `complete`. `draggable alone`, `example: drop zone` and `freeDrag + bounds + landing` failed at the base and fail by more. Every composition has one module more, `callback-list.ts`.
- **The sortable rows grow 24 B less** than the others, and `complete` 20 B less. Those are the rows that lose the two arrow fields and the `retire` wrapper.
- **The model's figures were +338 to +362 B minified** for a version without per-list direction functions (`DRD-35`, Cost). This version is 86 B larger on the kernel rows. I did not attribute the difference, because the handoff asks for no comparison.

### Allocation, measured

[`allocation.ts`](probes/callback-list/allocation.ts), run three times with `node --expose-gc` on Node v26.13.0. Each figure is the heap growth across 200,000 retained instances, read after a full collection, divided by 200,000.

| Row | Run 1 | Run 2 | Run 3 |
| --- | --: | --: | --: |
| Bare array, empty | 32.0 B | 32.0 B | 32.0 B |
| `queue()` list, empty, with its array and direction function | 128.1 B | 128.1 B | 128.1 B |
| `stack()` list, empty, with its array and direction function | 128.0 B | 128.0 B | 128.0 B |
| Bare array after one `push` and one `pop` | 181.6 B | 183.6 B | 171.5 B |
| `queue()` list after one `add` and one `run` | 224.1 B | 224.1 B | 224.1 B |
| `stack()` list after one `add` and one `run` | 295.8 B | 291.9 B | 295.6 B |

- **A list as made retains 96 B more than a bare array.** That is the `CallbackList` object, its direction function and its array, against an array alone.
- The "after use" rows include the backing store that the first push allocates. They are an observation and not a `DRO-12` figure. I did not find why a used stack retains about 70 B more than a used queue.

### Allocation, counted by reading, against `25a67d4a9`

| Per | `25a67d4a9` | `53c87f988` |
| --- | --- | --- |
| Controller (kernel) | 2 arrays | 2 lists: 2 `CallbackList` objects, 2 arrays and 2 direction functions. +192 B by the probe |
| Admitted press or command, including a press that never activates | 1 array | 1 list: 1 object, 1 array and 1 direction function. +96 B by the probe |
| `sortable` controller, without `displacement` | 2 arrow fields, `#invalidateGeometry` and `#retireAxis` | Neither: 2 functions fewer. The kernel's 2 lists are counted above |
| `sortable` controller, with `displacement` | The 2 arrow fields and the closure around `displacement.retire` | None of the three: 3 functions fewer |
| Step requested during a pass | 1 array slot | 2 array slots, no object |
| `use` call | 1 array slot | 2 array slots, no object |
| Step requested while idle | Nothing | Nothing |
| Pointer sample | Nothing | Nothing. The per-sample test passes |

## Deviations

- **One ported assertion changed,** in the list's duplicate test, because one list can no longer run from both ends (§Tests).
- **`Gesture.requestStep` has an internal third overload** for the session's forward (L4). The alternative was a cast at the session's call.

## Findings

Not minted. For the architect.

1. **Four size rows now fail that passed at the base,** and three failing rows fail by more (§Size). The owner decides under `DRO-12`.
2. **The contract's sketch of the public surface differs from `DRD-35` property 1 in one detail.** `contract.md` types the overload without a receiver as `requestStep(step: (operation: Operation | null) => void)` and `use(dispose: () => void)`. `DRD-35` property 1, which the code follows, declares `this: undefined` on the callback. Neither the contract nor the index was changed.
3. **`DragDisposer` is exported and no signature uses it.** It stays as `DRD-35` property 1 requires, as `(outcome: Outcome | null) => void`, which a `Drag`'s `use` still accepts. Whether it should declare `this: undefined` too is not decided.

## Stop

The implementation and this report are pushed on `drag/feature-composition`. **Next:** the owner reads the figures under `DRO-12`, and the architect assesses this report. No combined review starts before both.
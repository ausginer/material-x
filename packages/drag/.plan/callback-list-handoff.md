# Callback list handoff

**One bounded unit for one implementer.** It ports `DRD-35` in [`00-index.md`](00-index.md) to production: the model at `9f885b9a9` on `drag/step-queue-model` and the owner's edit on it, completed. It then updates the tests and documentation that the decision affects, runs the three engines, and reports the figures `DRO-12` asks for.

**Read before starting:**

- **In the index:** `DRD-35` and `DRO-12`, then `DRD-34`'s properties 6 to 9, `DRD-6` and `DRD-16`.
- **In [`contract.md`](contract.md):** the `draggable` paragraph and types of the public surface, DRI-7, DRI-8, DRI-9, DRI-10, DRI-17 and DRI-18. The contract already states the behavior after this unit.
- **The model's report:** `git show 9f885b9a9:packages/drag/.plan/callback-list-model.md`, §1, §2 and §4. Its figures in §3 describe a different version.
- **CONTRIBUTING:** the TypeScript and Class encapsulation sections.

## Base

**`drag/feature-composition` at the commit that carries this file.** Its `src/` and `tests/` equal `25a67d4a9`'s.

From the repository root, before anything else:

1. `git cat-file -e 9f885b9a9` succeeds. If it fails, run `git fetch origin drag/step-queue-model` and try again.
2. `sha256sum packages/drag/.plan/probes/callback-list/owner-edit.diff.txt` gives `a5b8feec280f70d3f2cacd149a5f2ff63da8f855f4d355af5afc2e09bee46358`.
3. `git diff 25a67d4a9 HEAD -- packages/drag/src packages/drag/tests` is empty, and `git status --short` shows a clean tree.
4. Build the starting tree:

   ```sh
   git diff 25a67d4a9 9f885b9a9 -- packages/drag/src packages/drag/tests | git apply
   git apply packages/drag/.plan/probes/callback-list/owner-edit.diff.txt
   ```

**If any step fails, stop and return.** The architect checked that these two steps reproduce the owner's eight files byte for byte ([probe README](probes/callback-list/README.md)).

- **The saved diff is the owner's edit.** Don't read from, write to, stash or reset the owner's `drag/step-queue-model` worktree.
- **The starting tree is the base for your work, not a patch to replace.** Keep its shape where `DRD-35` agrees with it: the two factories, the private constructor, each list's own direction function, `empty`, `run`, and `object` receivers. The implementation commit carries the model, the owner's edit and your completion of them.
- **Don't port the model's `.plan/` files.** The record cites them at `9f885b9a9`.

## Gaps in the starting tree

Typecheck fails ([`typecheck.txt`](probes/callback-list/typecheck.txt)), and so does `oxlint` ([`lint.txt`](probes/callback-list/lint.txt)). The other rows were found by reading. Each row names the `DRD-35` property it breaks.

| # | Gap | Effect | Property |
| --- | --- | --- | --- |
| L1 | `gesture.ts` imports `QUEUE` and `STACK`, which `callback-list.ts` doesn't export | Typecheck and lint fail | 5 |
| L2 | `runDisposers` in `drag.ts` calls `waiting` and `runLast`, which the edit removed | Typecheck fails | 4, 5 |
| L3 | `Session` creates its disposer list with `new CallbackList()`, and the constructor is private | Typecheck fails. Lint then reads the list as an error type | 5 |
| L4 | The `Drag` that `Session` builds types `use` and `requestStep` with `this: unknown` and `receiver?: unknown`. The model loosened `enter`'s receiver from production's `R extends object` to `unknown` | Typecheck fails at `runDragDisposer`. The receiver's type differs between layers | 1 |
| L5 | The public overloads `use<Receiver>` and `requestStep<Receiver>`, on `Drag` and on `DraggableController`, don't constrain `Receiver` | A primitive receiver typechecks at the public surface, while every internal signature declares an object | 1 |
| L6 | `callback-list.ts` uses the `Function` type in `Direction` and in the entries' array | `oxlint` reports `no-unsafe-function-type` twice | 8 |
| L7 | `tests/callback-list.browser.test.ts` constructs `new CallbackList()` three times | Typecheck fails | Tests |
| L8 | `InsertionGeometry.invalidate`, `InsertionGeometry.retire` and `DisplacementSink.retire` declare no `this` | Removing the receiver at one of `sortable`'s three sites typechecks and passes lint (the model's C11 to C13) | 7 |
| L9 | Comments describe the model or the old rule: `callback-list.ts`'s file comment ("not adopted") and class comment ("runs entries from either end"); `run` has no JSDoc and doesn't state that an entry must wait; `enter`'s comment in `gesture.ts` says that a step requested while idle passes no receiver; `SortableBehavior`'s class comment says that every function handed elsewhere is created once per instance for identity coalescing; the ported tests' file comments and `describe` titles say "callback-list model" | They describe a model or a removed rule | 5, documentation |

## Work

**Two commits:** the implementation, with its source, tests and documentation, and then the report.

### 1. Source

Meet `DRD-35`'s properties 1 to 9, and close L1 to L6, L8 and L9.

- **The form is yours where `DRD-35` doesn't fix it,** for example how `has` is typed, whether the factories pass `Argument` to the constructor explicitly, and the internal callback type's name.
- **Not yours:** each `queue()` or `stack()` call creates its list's own direction function. Don't replace it with a shared function, a flag or a subclass. The owner made that choice deliberately, and `DRO-12` counts it.
- **`enter` takes an `object` receiver again,** as at `25a67d4a9`.

### 2. Tests

Change only what is listed here, plus a test that the new types break, and list each such test in the report.

- **Port `tests/callback-list.browser.test.ts` and `tests/callback-list.declaration.test.ts`** from the starting tree.
  - Use the factories instead of the constructor (L7).
  - Rewrite the file comments and `describe` titles to cite `drag:DRD-35` and the contract entries each test checks: `drag:DRI-8`, `drag:DRI-9` or `drag:DRI-10`. Drop the "model" wording.
  - Keep every assertion. If one has to change, give its reason in the report.
- **The list on its own:** `queue()` runs its entries first in first out and `stack()` last in first out through `run`, and `empty` is true before the first `add` and after the last `run`.
- **The declaration test also asserts, with `@ts-expect-error`:**
  - a primitive receiver is refused by both overloaded members, on a `Drag` and on the controller (L5);
  - `InsertionGeometry.retire` and `DisplacementSink.retire` passed to `use` without their receiver are refused (L8). Import the interfaces from their source modules.
- **`tests/size.node.test.ts`:** add `src/kernel/callback-list.ts` to `draggable alone`'s module list. The list states DRI-18's module graph, and this kernel module belongs in it. Don't change any ceiling, control or `absent` entry.
- **Unchanged and passing:** `classes` › "should call a step with no receiver, requested while idle and during a pass", and the DRI-8 tests in `requests.browser.test.ts`.

### 3. Documentation

- **`README.md`, §The `requestStep` rule and the `use` paragraphs after it:**
  - a step or a disposer may be passed with a receiver and is then called on it;
  - the same step requested twice before it runs runs once only with the same receiver, or with none;
  - every `use` call is its own registration, so the same disposer registered twice runs twice.
- **JSDoc in `src/`:** `Drag.requestStep` and `Drag.use`, `DraggableController`'s two members, `CallbackList`, `Gesture`'s list fields, and the comments in L9. Correct any other comment that the change makes false.
- **Not `contract.md` or `00-index.md`.** The architect changed them with this handoff.

## Do not change

- **The representation.** `CallbackList` as `DRD-35` property 5 states it. No other representation, no key parameter and no comparative probe.
- **The reader:** its precedence and its catch on each turn. A late `use` still runs at once.
- **Every other callback,** as `DRD-35` property 7 lists them, and the controllers' members.
- **The lint configuration.** No file-wide disable. A line-scoped disable only where `DRD-35` property 8 or `DRD-34` property 9 allows one, each with its reason.
- **Size ceilings, controls, `bench/` and `compare.ts`.** No re-base, and no timing.

## Checks

**WebKit is required.** Run every engine suite after `source ~/.cache/ms-playwright/webkit-env.sh`. If WebKit doesn't launch with the script, stop and return.

- **The suite in Chromium, Firefox and WebKit** (`npx just test-engines`). Size rows that fail at `25a67d4a9` may still fail. Every other test passes. Name each size row that fails after the port and passed before it.
- **The per-sample test** in `tests/hot-path.browser.test.ts` passes.
- **Typecheck, and the [handoff](../../../.agents/docs/handoff.md) loop on each changed file.** Lint passes. List every `unbound-method` disable in `src/` and `tests/`, each with its reason.
- **Size:** `node bench/size/measure.ts` at `25a67d4a9`, in a scratch worktree that you remove afterwards, and twice at the implementation commit. Report each row's minified and Brotli bytes and its difference. The owner has approved no figure (`DRO-12`).
- **Allocation, measured:** a Node probe at `.plan/probes/callback-list/allocation.ts` that reads, after a collection with `--expose-gc`, the retained bytes per list made by `queue()` and per list made by `stack()`, each with its direction function, and per bare array. Run it three times and record each run, with the Node version.
- **Allocation, by reading:** the counts `DRO-12` lists, per controller, per admitted press or command, per `sortable` controller with and without `displacement`, per step requested during a pass, per `use` call and per sample, each against `25a67d4a9`.

**Mutations.** Apply each one to the implementation commit's source, run the named check, confirm that it fails, and revert. Commit none of them.

| Mutation | Check that must fail |
| --- | --- |
| M1. `has` ignores the receiver | The ported test that runs one method once per receiver |
| M2. `requestStep` adds without calling `has` | `requests` › "should coalesce one function requested twice before it runs" and "should pull once for two invalidate calls in one callback" |
| M3. `use` skips an entry whose pair is already waiting, on the controller and in the session | The ported tests that run a pair once per call |
| M4. `queue()`'s direction function takes the last entry | `requests` › "should keep the order of moveTo closures in one pass" |
| M5. `stack()`'s direction function takes the first entry | `release` › "should run disposers last in first out, past a throw" |
| M6. A direction function calls the callback with no receiver | The ported receiver tests, including the axis and sink spy test |
| M7. A step requested while idle loses its receiver | The ported test of a step requested while idle |
| M8. A late `use` loses its receiver | The ported late-disposer tests |
| M9. `runDisposers` stops at the first throw | `release` › "should run disposers last in first out, past a throw" |
| M10. A late `use` on an operation is added instead of run | `release` › "should run a late use at once with the outcome" |
| M11. `drag.use(this.axis.retire)`, with the receiver removed and the disable kept | Typecheck |
| M12. `kernel.use(displacement.retire)`, with the receiver removed and the disable kept | Typecheck |
| M13. Teardown doesn't clear the steps | Expected to fail nothing: the clear only releases references. Report the result |

## Report

Write `callback-list-report.md` in this directory, and save raw output under `measurements/` as `<date>-callback-list.txt`, with the date the figures were taken. The report includes:

- the base check's result, and the implementation commit;
- for each gap, the change that closes it;
- each mutation's failing assertion, or M13's result;
- the suite's results in the three engines, and the per-sample test;
- the size table, the allocation probe's runs and the counts by reading, as `DRO-12` lists them;
- every `unbound-method` disable, with its reason;
- any deviation from this handoff, with its reason, and any finding. Mint no `DRF`: the architect records findings.

**Commit the report, push `drag/feature-composition`, and stop.** The owner reads the figures under `DRO-12`, and the architect reads the report. No combined review starts before both.
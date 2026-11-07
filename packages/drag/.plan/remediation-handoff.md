# Remediation handoff

**One bounded unit for one implementer: bring `@ydinjs/drag` from `d7e7b0d3a` to the 2026-11-07 contract, restructure the built-ins as internal classes, repair the integration and evidence defects, validate the affected costs once, and stop for review.** The decisions are `DRD-14` to `DRD-23` in [`00-index.md`](00-index.md). The behavior owed is [`contract.md`](contract.md). Each item names the finding it closes, as listed under the index's disposition table.

**Base:** `drag/production` at the commit carrying this file. Work on that branch.

**Sources:** the production source. drag2 and the prototype at `599684791` stay reference evidence and the before arms.

**Do not expand:** no auto-scroll, no long-press activation, no horizontal linear axis, no stylesheet layer for the lift, no new public option, and no publication. Don't accept a cost for the owner. Report it.

## Work, in order

### 1. Toolchain and gates

- **`rolldown` (`integrity-1`).** Remove the nested `1.1.5` pin from `packages/drag/package.json` and the lock, so `npm ci` installs the root version the `overrides` names. Re-measure every size row under it, re-base the controls and ceilings, and record the re-base and both readings in `measurements/`. **Check:** from a clean worktree, `npm ci` then the package's `just test` passes.
- **Lint and format (`integrity-2`, `integrity-3`).** Fix the three `oxlint` errors in `.scripts/vitest-config.ts`. Run `oxfmt` on the five named files. A generated JSON whose reflow is large may be excluded from formatting instead, if it is named in the report.
- **`docs-api-*` (`integrity-4`).** Make the recipes succeed. TypeDoc may use a configuration that excludes `tests/`. Or drop the recipes if nothing consumes them, and say which.

### 2. Classes, preserving behavior (`DRD-20`)

**Its own commit, before any behavior change.** `sortable` and `freeDrag` each build one module-private class instance, which is the behavior passed to `draggable`, and return a plain controller object. Follow the binding and lifetime properties in `DRD-20` as written. The list it rejects is a stop condition.

- **Check:** the whole three-engine suite passes with no test edited, except the `WeakRef` destruction test, which gains the instance.
- **Measure this commit alone** against the commit before it, with the post-step-1 toolchain: every size row, and the 300-move row at 20 and 2,000 items in two arms, before and after the restructure, with the paired rule from step 6. **Report these readings for `DRO-4`, and accept none of them yourself.**
- **Name the step functions and callbacks for what they do.** That also settles `cleanup-4`'s `panel`.

### 3. Kernel

| Decision | Change |
| --- | --- |
| `DRD-15` | Order: release, landing, `end`, then focus in the terminal step, also when `end` throws. Without `start`, restore after release |
| `DRD-16` | `drag.requestStep` and `drag.requestCancel` act only while their session is current. A late disposer gets `null` only when destruction released the operation |
| `DRD-17` | Pointer stream and `Escape` on the window, in the capture phase. A pending press ends quietly on a sample without its button, and on a new primary press, which is then admitted. One admission per event across controllers. `Escape` that decides a started operation prevents its default |
| `DRD-18` | Kernel quiet decline kept and documented. A grab during a landing measures with the flight, then cancels it before the lift writes |
| `DRD-20` | `draggable`'s controller methods work when detached |

The hot path stays as DRI-17 states: the `buttons` read and the listener move add no allocation per sample.

### 4. Built-ins

- **`sortable`:** pull at activation for commands, keep the direction in the operation's state, and compute the target from that pull (`DRD-18`, `reviewer-2`). Remove the `-1` special cases (`cleanup-3`).
- **`freeDrag`:** read `home()` once at the drop for the request's offset (`DRD-19`). The `onDrop` JSDoc says it decides, and the commit goes in `onEnd` (`DRD-14`).
- **Discipline items:** `cleanup-1`, `-2`, `-4` (the remaining names: one name for the `Window`, and `describe`), `-5` to `-11`. Apply `DRD-21`: `LinearShift` and `RectIndex` lose the unused axis parameters, and `RectIndex` stops shrinking. `cleanup-9`'s shared resolution mechanism may stay duplicated if sharing it needs a new module. Say which.

### 5. Tests and witnesses

Browser tests in three engines with real input, each naming its `DRI-*`. **Each scenario below starts as a failing test on the base commit, where the base has the defect.** Record that failure, which is the witness, beside the mutation.

| Area | Scenarios |
| --- | --- |
| **Commit** (`DRI-9`, `DRI-20`) | A free-drag commit of `translate` in `onEnd` stays, and so does one of `left` and `top`. A write to a lifted property during the lift is reverted at release. The README examples run as tests |
| **Order** (`DRI-9`, `DRI-12`) | The landing starts before the focus call. A reorder in `end` keeps focus through two arrow presses. Focus is restored when `end` throws. A destruction requested in `end` doesn't prevent the restore. One requested before the terminal does |
| **Scoped requests** (`DRI-8`) | A retained `drag.requestStep` after its operation does nothing while a later operation is active, and also when idle. A late disposer after destruction of a concluded operation receives its outcome |
| **Input** (`DRI-19`) | `pointerup` stopped on a child, and on an ancestor of the root: a hover activates nothing, and the next press reorders. Release outside the window during a press, through moves with no buttons. A stopped `pointermove` doesn't stall an active drag. Nested sortables with no attribute: the inner list reorders and the outer doesn't start, and a press on a column header moves the column. Nested keyboard command. Links with `draggable="false"` reorder |
| **`Escape`** (`DRI-4`) | Inside a modal `<dialog>` and an `auto` popover, the container stays open and the drag cancels. During a pending verdict too. Before `start`, the key isn't prevented |
| **Activation** (`DRI-3`, `DRI-13`, `DRI-14`) | A custom behavior with a disconnected item gets no hook. A command whose item leaves during the lift declines quietly. One whose move becomes impossible declines too. A grab during an accepted and a rejected landing keeps the visual within 1 px of the grab point |
| **Free drag** (`DRI-20`) | With `home` given, a scroll during the drag commits where dropped and lands home with no jump. Without `home`, an unscrolled drag still commits where dropped |
| **Classes** (`DRD-20`) | Detached controller methods on all three factories. No instance retained after destruction |
| **From review** | `reviewer-3`: several samples in one task schedule one frame. `reviewer-6`: a keyboard command with a landing, a second pointer's moves during a drag. Tests naming `sortable/anchor-outside-container` and `sortable/insertion-placeholder-lost` (`DRD-21`) |

**Mutations.** Each is a throwaway edit, and some test must fail. Record test and engine, as [`mutations.py.txt`](measurements/mutations.py.txt) does, and re-run the 32 existing mutations with these:

| Entry | Mutation |
| --- | --- |
| `DRI-8` | Let `drag.requestStep` act after its operation |
| `DRI-9` | Restore focus before the landing starts. Restore focus before `end`. Keep a write made during the lift |
| `DRI-17` | Remove frame coalescing (`reviewer-3`) |
| `DRI-19` | Listen in the bubble phase. Skip the `buttons` check. Refuse a press while one is pending. Offer an admitted event to an outer controller |
| `DRI-4` | Don't prevent `Escape`'s default |
| `DRI-13` | Cancel the landing before measuring |
| `DRI-14` | Skip the command's activation pull |
| `DRI-20` | Ignore `home` at the drop |

### 6. Bounded validation

**Run once, after steps 1 to 5, on a machine with no other heavy work.** Raw output and a dated reading go in `measurements/`. **Don't edit the 2026-11-06 files.** Their status line points to `DRD-22`.

**First, re-judge the 2026-11-06 raw data** under the paired rule below, for every timing row. No new run is needed. Report each row's sign count and median paired difference.

**Then run `bench/compare.ts`** with the same four arms, interleaved in one browser process with fresh pages, for 7 rounds, on these rows only:

| Row | Why |
| --- | --- |
| 50 cycles, with and without a landing, 20 and 2,000 items | `reviewer-4`, `reviewer-7`, `DRD-15` |
| 50 keyboard reorders, 20 items | Focus restore moved, and the command pull |
| 300 moves, 20 and 2,000 items | Listener move, `buttons` read, classes |
| Press and release below the threshold, 20 and 2,000 items, both `items()` forms | New press handling, `DRO-1` |
| 200 operations, then destroy | Retained objects, `reviewer-5` |

**Rules, fixed before running:**

- **Layouts are exact:** production is at or below both before arms. A landed cycle is expected to read 350 per 50.
- **Timing is paired.** For each round, take production minus each before arm, and production minus control (A/A). Production is **slower** when it is higher in at least 6 of 7 rounds **and** the median paired difference exceeds the largest absolute A/A difference. **Faster** is the mirror. Anything else is **no difference shown**, which is not equality. Report the sign count, median and A/A bound for every row, whatever the verdict.
- **Retained memory is judged on JavaScript objects, by its own rule over 3 rounds.** The timing rule's 6 of 7 does not apply.
  - **Reading.** In each round, every arm runs on two fresh pages: one with 0 operations and one with 200, each followed by destruction and forced GC. Then take a heap snapshot, and sum the self size of object, closure, array and string nodes, excluding code and native nodes. An arm's growth `G` is the 200-operation sum minus the 0-operation sum, in that round.
  - **Paired differences, per round.** `D` is production's `G` minus a before arm's `G`, for each before arm. `A` is the control's `G` minus production's `G`. The bound is the largest absolute `A` over the 3 rounds.
  - **Verdict, per before arm.** Production **retains more** when `D` is positive in all 3 rounds **and** the median `D` exceeds the bound. **Retains less** is the mirror. Anything else is **no difference shown**. A bound of 0 B is allowed, so a difference that has the same sign in every round and any size above 0 flags.
  - **Report** each round's `G` per arm, every `D` and `A`, the bound and the verdict. A flag may be attributed from the same snapshots, by constructor and retainer, but it is not overridden. A flag that stands goes to the owner as `DRO-4`.
  - **Continuity.** The snapshot script is in the tree, under `bench/`. Absolute `JSHeapUsedSize` is still reported, and the `WeakRef` destruction tests stay a separate check.

**The instrument proves itself first, on the new rules.** In a scratch copy of production, inject about 1 ms of script into each cycle at the drop. Inject one object of about 1 KB retained per operation past destruction, which the retained rule must flag as retains more in 3 of 3 rounds. Both must be flagged. Also run the control against itself, A/A, as if it were production: no row may flag. If one fails, fix the instrument before reading a result.

**Bounded cause analysis.** A row that is slower gets one CPU profile per arm for that row, attributing the difference to functions. Report it for `DRO-4`. Don't run an optimization campaign, and don't change the contract to make a row pass.

**Size:** every row under the re-based toolchain, the step-2 rows, and causes for any growth over `d7e7b0d3a`.

### 7. Documents

- **`packages/drag/README.md`:**
  - commit ownership and the lifted property list, with the free-drag example committing in `onEnd`;
  - `home` in a scrolling container;
  - native drag and `draggable="false"`;
  - nesting works without an attribute;
  - `Escape` is consumed;
  - `drag.requestStep` and `drag.requestCancel` are scoped;
  - focus is restored after `end`;
  - one controller per root, because the collection is pulled.
- **Stories:** the free-drag story commits in `onEnd`.
- **drag2 and repository documents:**
  - `integrity-5`: `packages/drag2/README.md` says which package it means wherever it names `@ydinjs/drag`. In `.agents/docs/accessibility.md`, line 106 is corrected and the bare `Q-13` becomes `drag2:Q-13`.
  - `integrity-6`: `.agents/docs/coordinator.md`.
  - `integrity-7`: drag2's `05-lifecycle-invariants.md` sentence and the `COVERAGE.md` count.
- **`integrity-8`:** add the `drag` row to `SCOPES` in `packages/drag2/.scripts/entry.ts`, with a test that `entry.sh drag:DRD-1` resolves.

### 8. Finalize

Run the [handoff](../../../.agents/docs/handoff.md) checks. Then run the package's and the root's `lint`, `typecheck`, `build`, `test`, `size` and `fmt-check`, and the three-engine recipe. Compare the root gates with `d7e7b0d3a` as a set of failures. Write `packages/drag/.plan/remediation-report.md` with:

- each new decision with its test, its base-commit witness and its mutation;
- the re-judged 2026-11-06 rows and the new readings;
- the step-2 readings;
- faults found;
- any return to the architect;
- the limits.

Add a status line to `implementation-report.md` pointing to it. Push and stop.

## Return to the architect

Stop and return if:

- A `DRD-14` to `DRD-19` guarantee can't hold in an engine, or two guarantees conflict.
- Measuring with a running flight doesn't give the flight's offset in an engine.
- Scoped requests need a tag on the step list, or the class structure needs anything `DRD-20` rejects.
- The window-capture listening breaks an existing guarantee, such as the click guard or touch capture.
- A layout rule misses, or the instrument can't prove itself on the new rules.

A row that is slower is not a return. It goes to the owner as `DRO-4`.

## After this unit

A fresh review round reads the remediation. The owner then reads `DRO-1` to `DRO-5` with the report.
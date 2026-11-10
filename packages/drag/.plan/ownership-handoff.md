# Ownership handoff

**One bounded unit for one implementer.** It repairs the module split at `bb644d6d7` (`DRD-28`), gives the session its own end (`DRD-26`), and takes the lift out of the kernel, into the behavior's composition (`DRD-27`, as revised on 2026-11-07). The decisions are in [`00-index.md`](00-index.md), and the behavior owed is [`contract.md`](contract.md). **The costs aren't accepted.** This unit reports them for the owner's `DRO-7`.

**Base:** `drag/production` at the commit that carries this file. It contains the owner's split at `bb644d6d7`, whose typecheck fails. Work on that branch.

**Reference figures:** the [composition report](composition-report.md)'s gate results at `2506dcbb6`, whose source equals `0dcb80fb1`'s.

**Do not expand:**

- **The pass mechanism stays:** the gate, the reader and its precedence, the slots and the step list. Requests only fill slots. The landing's slot leaves the controller in item 3.
- **The interface between `Gesture` and `Session` changes only by removal:** `isCurrent` goes in item 2, and `takeLanding` and `keepLanding` go in item 3.
- **No kernel member replaces what the lift loses.** No hook, slot, interface member or option is added to keep an order. `DRD-27` names the kernel mechanisms that already give each guarantee.
- **No change to the built-ins' operation-state types** beyond restoring the four assertions in item 1 and adding `lift`, `visual` and `box` in item 3.
- **No change to `Admission`'s `state`.** `DRD-27` leaves that open.
- No new public option.
- No timing reading, accepted cost or re-based ceiling.

## Work, in order

Each item is its own commit.

### 1. Module layout and public entries (`DRD-28`)

**A behavior-preserving commit.**

- **Move `src/kernel/lift.ts` to `src/lift.ts` and `src/kernel/fault.ts` to `src/fault.ts`** with `git mv`, and fix the imports that point at them.
- **`src/draggable.ts` exports `draggable` and the kernel's types** that `DRD-28`'s table lists, as type-only re-exports. At this commit that includes `LiftedBehavior`, `LiftedAdmission` and `LiftedDrag`, which item 3 removes.
- **`src/lift.ts` exports `lift`, `Landing` and `LiftHold`.** Item 3 replaces them with `DRD-28`'s final list.
- **The built-ins import kernel values and types only from `./draggable.ts` and `./lift.ts`.** Their modules under `sortable/` and `free-drag/` import from `../draggable.ts` and `../lift.ts`. Nothing outside `src/kernel/` and `src/draggable.ts` imports from `src/kernel/`.
- **Restore the four `!` assertions** that `bb644d6d7` removed, as they were at `0dcb80fb1`:
  - in `sortable.ts`, `drag.state.context!` in `drop`, `drag.state.placeholder!` in `drop` and `drag.state.result!` in `end`;
  - in `free-drag.ts`, `drag.state.result!` in `end`.
- **Packaging.** Add `kernel` to `package.json`'s `files` and to `files.json`'s `clean.extras`, beside `shared`. `type-fest` stays until item 3.
- **Tests and instruments:**
  - The only test edit allowed here is the exact module list for `draggable` alone in `tests/size.node.test.ts`.
  - `files.json`, `typedoc.json`, `bench/size/measure.ts` and every other test should then resolve unchanged. If one doesn't, return.
- **Check:**
  - Typecheck and lint pass.
  - The three-engine suite passes.
  - `just build`, then `npm pack --dry-run` in the package, lists `kernel/*.js` and `kernel/*.d.ts`.
  - The emitted `draggable.d.ts` exports the listed types.
  - Record `just size` at this commit.

### 2. The session ends itself (`DRD-26`)

**A behavior-preserving commit. Write the witnesses first, and run them at item 1's commit, where they must pass.**

- **The session has an ended state.** It enters it at the four points in `DRD-26`'s table, which are the three detaches and the start of `terminate`.
- **The state replaces every `isCurrent` call:**
  - `drag.requestStep` and `drag.requestCancel` act only while the session hasn't ended;
  - `Escape` applies only while the session hasn't ended;
  - a verdict's completion is consumed when the session has ended or has decided.
- **Remove `isCurrent` from `Gesture`.**
- **Keep the ended state separate from release.** `drag.signal` and a late `use` disposer still depend on release.
- **Witnesses.** Each cites the rule it pins, and each needs a recorded mutation that makes it fail:

  | Witness | Cites | Mutation that must fail it |
  | --- | --- | --- |
  | A step requested through `drag.requestStep` in `settle` runs before `end` and receives `null`. One requested in `end` never runs | `drag:DRI-8` | (a) Enter ended at the start of conclusion: the `settle` step doesn't run. (b) Enter ended after `end`: the `end` step runs |
  | Destruction is requested inside a pass, from a controller step, while a started operation waits for a verdict. An `abort` listener on the verdict's signal dispatches a cancelable `Escape` `keydown` on the document. The event isn't default-prevented, and no hook runs | `drag:DRI-10` | `Escape` no longer checks the ended state |
  | The same destruction, where the verdict is a thenable whose `then` keeps its callbacks. The `abort` listener calls the rejection callback synchronously, and no `DragFault` is reported | `drag:DRI-10` | The completion no longer checks the ended state |

  **Destruction must be requested inside a pass.** Requested from idle, the gate refuses the fault's new pass, so the third witness wouldn't discriminate.

- **Check:**
  - The three-engine suite passes with no existing test edited.
  - The per-sample allocation test passes.
  - Typecheck and lint pass.
  - `grep isCurrent src` finds nothing.

### 3. The kernel knows no lift (`DRD-27`)

**A commit that changes the public types and how a behavior composes the lift.** Its only intended runtime differences are those that `DRD-27` lists under "Changes a consumer sees".

- **The kernel, in `src/kernel/` and `src/draggable.ts`:**
  - **`Session`:**
    - Remove `#lift`, the retained admission, the acquisition, the landing's take and its cancel, the hold's release, the use of `settle`'s result and the landing's start.
    - Activation is the decline for a disconnected item, capture, `activate`, then `start`.
    - Conclusion is unchanged otherwise.
  - **`Gesture`:**
    - Remove `#cancelLanding`, `takeLanding`, `keepLanding` and teardown's landing step.
    - Teardown is: close the controller, clear the slot and the steps, terminate the session, run the controller disposers, then abort the root's listeners.
  - **The `Drag` is built when the session opens,** as now.
    - The kernel holds it under a writable type that is declared in `src/kernel/drag.ts` and isn't exported from a public entry.
    - No `as`, `!` on the field, definite-assignment `!:`, `Writable` or `Partial` stands for its members.
    - `admission.state as State` stays.
  - **Types:**
    - One `Behavior<State, Verdict>`, with no `lift` member and with `settle` returning `void`.
    - `Admission<State>` has `item`, `handle?` and `state?`.
    - `Drag<State>` has the kernel's members only.
    - Remove `LiftedBehavior`, `LiftedDrag`, `LiftedAdmission` and `AnyBehavior`.
    - `draggable` has one signature and returns its controller with no assertion.
    - `DraggableController` doesn't change.
  - **Comments.** No comment in these files mentions the lift or the landing. Reword those that did, such as the disconnected item's decline: the reason is that there is nothing to drag.
- **The lift, in `src/lift.ts`:**
  - **Exports:** `createLifter`, and the types `Lifter`, `Lift` and `Landing`. `lift` and `LiftHold` go.
  - **Meet `DRD-27`'s required properties of the lift.**
  - **The `report` parameter and the local restore on a failed acquisition go.** The release is registered before the first write, so a throw needs no local restore. The captures in `captureInlineStyles` and `acquireTopLayer` still run before their writes.
  - **The form is yours,** a closure or a class, under `DRD-20`:
    - no function passed out depends on `this`;
    - `cancelLanding` works when detached.

    Report its allocation count per controller and per activation.
- **The built-ins, `sortable` and `freeDrag`:**
  - **The factory creates the `Lifter`** with the window the behavior already uses, passes it to the behavior's constructor, and passes `cancelLanding` to the controller's `use`. In `sortable` that registration comes after the displacement's, so it runs first at destruction, as the teardown step did.
  - **`activate`'s first statement acquires the lift.** In `sortable` that is before the second pull, as the lift came before it until now.
  - **The state holds `lift: Lift | null`,** which is `null` from admission.
    - The `visual` and `box` that admission computes now go into the state.
    - The consumer's `visual`, `box`, `placeholder` and `home` callbacks are called when they are called now.
  - **`settle` calls `land`** where it returned a landing, and does nothing where it returned `null`.
  - **A helper that read the lifted members from a `Drag` takes the `Lift`.** That covers `src/free-drag/geometry.ts`, `sortable`'s `landingTarget` and the placeholder's argument.
  - **Reading `drag.state.lift`.** In a hook or step that runs only after `activate`, a read may use `!`, as the state's other activation-filled fields do, or may narrow. No `as`.
- **Fixtures, stories and instruments compose the lift in the new form:**
  - `tests/fixtures/drop-zone.ts`, `src/*.stories.tsx` and `bench/compare.ts`;
  - `bench/lab-no-lift.ts`, if it names a removed type;
  - `bench/size/measure.ts`, which imports `createLifter` where it imported `lift`. Its row names and module lists stay, so the size table compares like with like.
- **Dependency.** Remove `type-fest` from `package.json`. After the commit, `git diff 0dcb80fb1 -- package-lock.json` from the repository root must be empty.
- **Existing tests.** These edits only:
  - **A behavior that composed `lift` composes it in the new form:**
    - a `Lifter` per controller, with `cancelLanding` passed to `use`;
    - `acquire` first in `activate`;
    - the `Lift` in the behavior's state;
    - `land` where `settle` returned a landing.

    A shared helper under `tests/support/` may do this, if it uses public values only.

  - **Reads of the ten members** go through the `Lift`.
  - **`tests/exports.node.test.ts` and `tests/authoring.declaration.test.ts`** change to the new surface and type requirement.
  - **No expected value, log, count or order changes.** "should release in the fixed order" in particular keeps its expected log. If an expectation must change, return.
- **New tests.** Each needs a recorded mutation that makes it fail:

  | Witness | Cites | Mutation that must fail it |
  | --- | --- | --- |
  | A lifted behavior's `Drag` has exactly the kernel's own keys, and the `Lift` has exactly its eleven | `drag:DRD-27` | `acquire` also assigns one of its members to the `Drag` |
  | In `sortable`, the placeholder is already removed when the lift is released | `drag:DRI-9` | `acquire` moved after the placeholder's `use` |
  | The visual's `showPopover` throws during acquisition. One `DragFault` with that error as `cause` decides `canceled` with origin `fault`. No `start` or `end` runs. Afterwards the visual's `style` and `popover` attributes and its open state equal those before the press | `drag:DRI-7`, `drag:DRI-9` | The release registered after the writes |
  | The same, where restoring the popover also throws. Two `DragFault`s are reported, the acquisition's first, and it decides | `drag:DRI-7` | The release's throw is swallowed |
  | A drop with a landing named, where releasing the top layer throws. The fault is reported, the outcome stands, and the landing starts | `drag:DRI-13` | The landing started after the release in one `try` with no `finally` |
  | A plain behavior's hook and a controller step can't name `drag.lift`, an admission can't have `visual`, and `draggable` accepts a class instance with extra members, with no overload | `drag:DRD-27`, declaration | `Drag` gains an optional `lift` member |

- **Documentation:**
  - The README's hook table (`settle`), §Coordinates and §The lift, which shows the composition in a short example and states DRI-18's condition.
  - The TSDoc on `draggable`, `Behavior`, `Admission`, `Drag`, `createLifter`, `Lifter`, `Lift` and `Landing`.
  - The contract already states the shape.
- **Check:**
  - The three-engine suite passes, with existing tests edited only as above.
  - The per-sample allocation test passes.
  - Typecheck and lint pass.
  - `grep -rniE 'lift|landing' src/kernel src/draggable.ts` finds nothing.
  - `grep -rn "type-fest\|Writable\|as unknown" src` finds nothing.
  - Importing `draggable` alone still brings no lift module, by the size test's graph.

### 4. Finalize

1. Run the [handoff](../../../.agents/docs/handoff.md) checks on every changed file.
2. Run the package's `lint`, `typecheck`, `test` and `fmt-check`, and the three-engine recipe.
3. **Write `ownership-report.md` beside this file.** It holds:
   - Your commits.
   - Each witness with its mutation, and for item 2's witnesses, their run at item 1's commit.
   - **Size:** `just size` at each of your commits, as a table against the reference figures at `2506dcbb6`, minified and Brotli.
   - **Allocation:** the counts that `DRO-7` lists. State whether you counted by reading or by an instrument, and how.
   - Anything you returned.

   **These are figures for `DRO-7`, not acceptance. Re-base nothing.**

4. Push and stop.

## Return to the architect

Stop and return if:

- An existing test needs an edit that this handoff doesn't allow.
- A witness from item 2 fails at item 1's commit. That would mean `DRD-26`'s equivalence argument is wrong.
- The session can't build or pass the `Drag` without an assertion about its members, or without an allocation per sample.
- An order that `DRD-27` requires can't be kept without lift-specific kernel code or a new kernel member.
- A built-in can't acquire the lift first in `activate` without changing when a consumer callback runs.
- `draggable` alone brings a lift module.
- A change conflicts with another contract entry.

## After this unit

The owner reads `DRO-7` from the report. A review round then reads the remediation, the composition unit and this unit at this unit's last commit.
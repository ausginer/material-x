# Ownership handoff

**One bounded unit for one implementer.** It repairs the module split at `bb644d6d7` (`DRD-28`), gives the session its own end (`DRD-26`), and separates the operation object from the lift's view (`DRD-27`). The decisions are in [`00-index.md`](00-index.md), and the behavior owed is [`contract.md`](contract.md). **The costs aren't accepted.** This unit reports them for the owner's `DRO-7`.

**Base:** `drag/production` at the commit that carries this file. It contains the owner's split at `bb644d6d7`, whose typecheck fails. Work on that branch.

**Reference figures:** the [composition report](composition-report.md)'s gate results at `2506dcbb6`, whose source equals `0dcb80fb1`'s.

**Do not expand:**

- **The pass mechanism stays:** the gate, the reader and its precedence, the slots, the landing's slot and the step list. Requests only fill slots.
- **The interface between `Gesture` and `Session` changes in two places only:** `isCurrent` goes, and the lift is called with new arguments.
- **No change to the built-ins' operation-state types** beyond restoring the four assertions.
- **No change to `Admission`'s `state`.** `DRD-27` leaves that open.
- No new public option.
- No timing reading, accepted cost or re-based ceiling.

## Work, in order

Each item is its own commit.

### 1. Module layout and public entries (`DRD-28`)

**A behavior-preserving commit.**

- **Move `src/kernel/lift.ts` to `src/lift.ts` and `src/kernel/fault.ts` to `src/fault.ts`** with `git mv`, and fix the imports that point at them.
- **`src/draggable.ts` exports `draggable` and the kernel's types** that `DRD-28`'s table lists, as type-only re-exports.
- **`src/lift.ts` exports `lift`, `Landing` and `LiftHold`.** `Lift` arrives in item 3.
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

### 3. The operation object and the lift's view (`DRD-27`)

**A commit that changes the public types. Its only intended runtime difference is the keys of a `Drag` and of `drag.lift`.**

- **The session:**
  - **Before activation, the session holds the press in its own fields:** the item, the pointer id, the origin and the admission.
  - **The `Drag` is built at activation, as one object literal, after the lift has built its view.** It is built after the decline for a disconnected item. Its `lift` is the view, or `undefined`.
  - **The orders that `DRD-24`'s required properties fix stay as they are,** in particular the landing taken before the lift measures and cancelled after it.
  - **No assertion stands for a member that the operation or the view lacks.** That excludes `as`, `!` on the field that holds the `Drag`, a definite-assignment `!:`, `Writable` and `Partial`.
    - One form that needs none: the field that holds the `Drag` is set where `#started` is set today, and its presence replaces `#started`. Each step that needs the `Drag` then reads the field once and tests it, in place of the phase test it already makes, or receives it as an argument.
    - Choose the form, but keep `DRI-17`: no allocation per sample, and each gate step a stable function.
  - `admission.state as State` stays. `DRD-27` leaves it open.
- **Types:**
  - `Drag<State>` has `lift: undefined`, and `LiftedDrag<State>` has `lift: Lift`. Each `requestStep` step receives its own type.
  - The kernel's behavior type replaces `AnyBehavior`. Its hooks receive a `Drag` whose `lift` is a `Lift` or `undefined`.
  - `draggable`'s overloads need no assertion.
  - The [type check](probes/drag-ownership/README.md) is one model that compiles. Under the repository's options, `lift?: typeof lift | undefined` may be needed.
- **The lift:**
  - **`lift(admission, window, report)` returns a hold:** the view, `release()` and `land(landing)`.
  - **The view is created with all ten members set,** and afterwards only its `translate` writes to it.
  - **The landing reads the lift's own values.**
  - **No member of the hold reaches a behavior.**
  - **You may avoid a separate hold object,** for example with prototype methods, if the hold still doesn't reach a behavior. Report what you chose and its allocation count.
- **Dependency.** Remove `type-fest` from `package.json`. After the commit, `git diff 0dcb80fb1 -- package-lock.json` must be empty.
- **Consumers of the lifted members.** Read the ten members from `drag.lift` everywhere that reads them from a `Drag`:
  - `src/sortable.ts`, `src/free-drag.ts` and `src/free-drag/geometry.ts`;
  - the fixtures and `bench/compare.ts`;
  - the tests that read them.
- **Documentation:**
  - Update the README's §The lift, which lists the members the lift "adds to the `Drag`".
  - Update the TSDoc on `Drag`, `LiftedDrag`, `Lift` and `lift`.
  - The contract already states the shape.
- **New tests, citing `drag:DRD-27`.** The public surface has no `DRI` address, as with `DRD-25`'s test.
  - **Runtime:**
    - A lifted `Drag`'s own keys are the kernel's members plus `lift`. `drag.lift`'s own keys are exactly the ten, and `'release' in drag.lift` and `'land' in drag.lift` are false.
    - `drag.lift` is the same object in every hook of one operation, and `translate` updates its `translatedX` and `translatedY`.
    - A `Drag` without `lift` has `lift === undefined`.
    - **Witness:** the first assertion fails at item 2's commit.
  - **Declaration:** a behavior without `lift` can't name `drag.lift.visual` from a hook or a controller step, and a lifted behavior can. Update the existing type-requirement assertions to the new shape.
- **Check:**
  - The three-engine suite passes. Existing tests are edited only to read the members from `drag.lift`.
  - The per-sample allocation test passes.
  - Typecheck and lint pass.
  - `grep -rn "type-fest\|Writable\|as unknown" src` finds nothing.
  - Importing `draggable` alone still brings no lift module, by the size test's graph.

### 4. Finalize

1. Run the [handoff](../../../.agents/docs/handoff.md) checks on every changed file.
2. Run the package's `lint`, `typecheck`, `test` and `fmt-check`, and the three-engine recipe.
3. **Write `ownership-report.md` beside this file.** It holds:
   - Your commits.
   - Each witness with its run at the earlier commit and its mutation.
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
- The kernel needs to read `drag.lift`.
- `draggable` alone brings a lift module.
- A change conflicts with another contract entry.

## After this unit

The owner reads `DRO-7` from the report. A review round then reads the remediation, the composition unit and this unit at this unit's last commit.
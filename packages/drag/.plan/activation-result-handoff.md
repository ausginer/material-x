# Activation result handoff

**One bounded unit for one implementer.** It implements `DRD-30` in [`00-index.md`](00-index.md): `activate` returns the behavior's operation, which holds the hooks from `start` to `end`. Steps receive that operation, and the `Drag` loses `state`. `sortable` and `freeDrag` become a behavior class and an operation class each. The required behavior is in [`contract.md`](contract.md), whose public surface, DRI-3, DRI-8, DRI-9 and DRI-18 already state it. The evidence behind the decision is [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §2.

**Base:** `drag/production` at the commit that carries the report of the `DRF-3` repair ([`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §3). **If that repair hasn't landed, stop and return.** This unit doesn't do it.

**The owner's uncommitted edits.** At `f40c32f32` the working tree held the owner's edits to `src/free-drag.ts` and `src/sortable.ts`:

- `git diff -- packages/drag/src | sha256sum` gave `bdcb626a5b1b0737febb6f657a223c38f535e0bfc69c222c42b787a9f2267e45`;
- `git diff --shortstat -- packages/drag/src` gave `2 files changed, 24 insertions(+), 23 deletions(-)`.

The `DRF-3` unit leaves them as they are. Item 1 handles them.

**Do not change:**

- **The kernel per-sample test's threshold, interval, scenario, selection or assertions.** That is `hot-path` › "should allocate per sample only the CSS string a lifted write needs". Its reading is still open ([`instrument-repair-report.md`](instrument-repair-report.md)). Don't run it alone, and don't analyze it. Record its result in each suite run under the report's own heading for it.
- **The `DRF-2` test's bound, scenario or sampling.** Its behavior moves to the new shape and nothing else.
- **`bench/compare.ts`** and **`tests/support/commands.node.ts`.**
- **`src/lift.ts`'s code.** Its module comment and JSDoc change where they say where the `Lift` is kept.
- **The `.plan/` records,** other than your report and its raw output.

**Not authorized:**

- no timing and no `compare.ts` run;
- no measurement beyond the runs this handoff names;
- no accepted cost, and no re-based ceiling or threshold.

`DRO-8` is the owner's.

## Work, in order

### 1. The owner's edits

- **If the owner has committed them,** check that the commit's diff of `src/free-drag.ts` and `src/sortable.ts` has the fingerprint above. Name the commit in the report. Don't change it.
- **Otherwise,** check the working-tree fingerprint. Commit the two files exactly as they are, as their own commit, and name it the owner's edits in the message. Stage nothing else.
- **If the fingerprint differs, stop and return.** Don't stash, reset or rewrite the edits.

**Check:** `just test` shows only the known failures, which are listed under item 2's checks.

### 2. `DRD-30`

**One commit.** The kernel's types and every behavior have to change together for the typecheck to pass. Implement `DRD-30`'s contract, lifecycle, kernel requirements and built-in requirements. They are not restated here.

**Files in scope:**

| Area | Files |
| --- | --- |
| Kernel | `src/kernel/behavior.ts`, `drag.ts`, `admission.ts` if needed, `session.ts`, `gesture.ts`, and `src/draggable.ts` for the `BehaviorOperation` export and `draggable`'s type parameters |
| Built-ins | `src/free-drag.ts`, `src/sortable.ts`, and `src/free-drag/*` and `src/sortable/*` where a helper's parameter type names the state or the `Drag`. `src/sortable/axis.ts` only for the `AxisQuery` and `AxisContext` choice below |
| Lift | `src/lift.ts`'s comments only |
| Behaviors outside `src/` | every behavior in `tests/` (23 files, 102 `admit`s by `grep`), `tests/fixtures/*`, `tests/support/harness.ts`'s `managed`, `bench/lab-no-lift.ts`, `src/draggable.stories.tsx` and the other stories if they define one |
| Documentation | `README.md`: the authoring section, the `requestStep` rule and its examples, and the lift composition |

**Kernel properties to show in the report:**

- **Order.** `#activate`, `#drop`, `#conclude`, `#endPending`, `terminate` and the reader keep their order, statement by statement. The only changes are where a hook is read from, the operation's assignment, and the `state` argument.
- **The operation's assignment** happens before `start` is called, where `#started` is set now.
- **Assertions.** List every site where a phase test became a test of the operation reference, with the argument that the two agree there. The kernel has no non-null assertion on the operation, and no new cast.
- **The step target** is `stepTarget()`'s current condition, returning the operation.
- **Allocation per sample.** None from `#move`'s hook call. `move` is called with no argument.

**Built-in properties to show in the report:**

- **Each class's members, split by lifetime.** The behavior keeps controller-lifetime values only. The operation holds no nullable activation resource. List any nullable member that remains, with its reason. `request` is expected to be one.
- **`activate`'s order** against `f40c32f32`: `acquire` first, then `sortable`'s second pull and quiet decline, then each later acquisition with its disposer registered before the next. Say which acquisitions moved into the operation's constructor.
- **Every function passed out,** with its lifetime: per controller, per operation, or per call for `moveTo`. None is created per sample.
- **The `AxisQuery` and `AxisContext` choice.** Either the operation serves as both, with `AxisContext`'s `settle` renamed, or the context literal stays. Report which, and its allocation.
- **Non-null assertions** in `src/free-drag.ts`, `src/sortable.ts`, `src/sortable/*`, `src/free-drag/*` and `src/kernel/*`, before item 2 and after it, each with the value it asserts.

**Tests change only in shape.** That means:

- moving hooks into the returned operation;
- `false` becoming `null`;
- reading values from the operation instead of `drag.state`;
- a step's parameter now being the operation;
- explicit type arguments where inference needs them;
- the declaration tests' new types.

An expectation about behavior must not change: no order log, outcome, focus, fault count or DOM result. If one has to, stop and return.

**Witnesses:**

- **`authoring.declaration`:**
  - a `Drag` has no `state`;
  - a `Behavior` has no `start`, `move`, `drop`, `settle` or `end`;
  - `activate` returns the operation or `null`;
  - a step's parameter is the operation type or `null`. This holds through the controller and through a `Drag`.
- **In the browser:** a step requested through the controller receives, by identity, the operation that `activate` returned. That holds from the end of activation until the drop, and the step receives `null` before activation and after the drop. If an existing test in `requests` or `scoped-requests` asserts that window once migrated, extend it rather than adding one.
- **A lifecycle map.** For each row of `DRD-30`'s lifecycle table, the report names the test that covers it once migrated. Add a test only for a row with none. A row is covered only by a test that observes it. Expected candidates:
  - decline after a partial acquisition;
  - a throw from an operation's constructor after a `drag.use`;
  - a cancel, a step or destruction requested inside `activate`;
  - `end` after release.

**Checks:**

- the [handoff](../../../.agents/docs/handoff.md) checks on every changed file;
- `just test` and `just test-engines` show only the known failures. These are the size rows failing at the base, and the kernel per-sample test if it fails intermittently. Record that test's result and nothing more;
- `just build` passes, and `just docs-api-prepare` reports 0 errors;
- `grep -rniE 'lift|landing' src/kernel src/draggable.ts` finds nothing;
- **the `DRF-2` test passes in 5 runs in Chromium,** with `lift.ts:translate`'s bytes per move recorded for each;
- **`bench/compare.ts` is unchanged, but its injections are checked against the new source.** For each injection, record whether its `find` text occurs at the base and after item 2. Don't fix any. They go to `DRF-1` and the instrument repair's item 2.

### 3. Report, for `DRO-8`

1. **Run the [handoff](../../../.agents/docs/handoff.md) checks.**
2. **Write `activation-result-report.md` beside this file.** It holds:
   - your commits;
   - item 1's result;
   - item 2's kernel and built-in properties above;
   - the assertion lists;
   - the lifecycle map, and the witnesses;
   - the suite counts, the build and typedoc results, and the grep;
   - the `compare.ts` injection table.
3. **`DRO-8`'s figures, in their own section:**
   - **Size:** every row of `just size`, minified and Brotli, at the base, at item 1 if it made a commit, and at item 2. Each is compared with the base. The example rows include the fixtures' new shape, so say how much of their change is the fixture and how much is the kernel, as far as the build shows.
   - **Allocation, counted by reading, with the [ownership report](ownership-report.md)'s method:** per press that never activates, per activation, per controller and per landing. Count the kernel, `freeDrag`, `sortable` and each example in the size table separately, against the base. `DRO-8` lists what reading expects. Where your count differs, say why.
   - **Per sample:** the five `DRF-2` figures, beside the `DRF-3` unit's if it recorded any.
4. **The kernel per-sample test, in its own section:** each result from the suite runs, with no interpretation.
5. **Put the raw output in `measurements/<date>-activation-result.txt`.**
6. **Push and stop.**

## Return to the architect

Stop and return if:

- The `DRF-3` repair hasn't landed, or the owner's edits don't match the fingerprint.
- The kernel needs to name a behavior resource, needs a non-null assertion or a new cast on the operation, or needs any change to the order of a transition.
- A test's expectation about behavior has to change, or a test other than the known failures fails.
- The `DRF-2` test fails in any run. That would be a per-sample cost, which `DRD-30` doesn't accept.
- A lifecycle row can't be kept as `DRD-30` states it.
- The type parameters can't be arranged so that the built-ins and the declaration tests type-check without `any`.
- The work needs a file outside item 2's table, timing, `compare.ts` or a measurement this handoff doesn't name.

## After this unit

- **The owner reads `DRO-8`,** beside `DRO-7`.
- **The kernel per-sample reading and `DRF-1` stay open,** apart from this unit.
- **The combined review** waits for the owner's `DRO-7` and `DRO-8` readings and the instrument repair's outcome.
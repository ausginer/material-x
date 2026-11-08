# Activation result assessment

**Read:** `drag/production` at `d99ebd304`. That covers the `DRD-30` implementation at `da139407e` and `3a67df0ea`, its [report](activation-result-report.md), and the `DRF-3` repair at `d7828a280` with its report in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §3. **Governing records:** `DRD-30`, `DRD-20`, `DRF-3`, `DRO-7` and `DRO-8` in [`00-index.md`](00-index.md), and [`activation-result-handoff.md`](activation-result-handoff.md).

**Outcome:**

- `DRD-30` is implemented. The kernel conforms, and so does the lifecycle.
- The `'state'` key removal is the intended change.
- `DRF-3` is closed.
- One built-in ownership point leaves operation state on the behavior. `DRD-30` is amended for it (§2).
- The report's claim that a class instance can't infer its operation is false. A migrated witness no longer observes the `Drag`. These two are `DRF-4` (§3).
- Using the three type arguments has a real cost for literal behaviors, but no redesign is justified (§4).
- §6 is one bounded remediation, to be done before the combined review.
- No cost is accepted (§5).

**Not done:** no production edit, no timing, and no suite or measurement run. The type probes in §4 are the only checks I ran myself. They were type-checks, run in a scratch directory that has since been removed.

## 1. What conforms

**Kernel.** I read `session.ts`'s diff against `1d5d3fa13`:

- **Order.** `#activate`, `#drop`, `#conclude`, `#endPending`, `terminate` and the reader keep their order.
- **The operation reference** is assigned where `#started` was set, before `start`.
- **`stepTarget`** keeps its condition and returns the operation.
- **`move`** is called with no argument.
- **The `admission.state as State` cast** moved to the constructor, and no cast was added.
- **The four sites** where a test of the reference replaces a phase or `#started` test agree, for the reasons the report gives.
  - A `start` that throws leaves the reference set while the phase is still `PENDING`. The fault is concluded in that same pass, which closes motion. So neither `#move` nor `#up` can observe that state.
- **`grep -rniE 'lift|landing' src/kernel src/draggable.ts`** finds nothing at `d99ebd304`.

**Lifecycle.** The report's map names a test for each `DRD-30` row. Only the cancel-then-decline and cancel-then-throw pair needed a new witness, which is `3a67df0ea`. I didn't open each mapped test to confirm that it observes its row. The combined review owns that.

**The `'state'` key, confirmed as intended.**

- **The test.** `authoring.browser` › "should give a lifted behavior a drag with only the kernel keys" belongs to `DRD-27`. It shows that composing the lift adds no key to the `Drag`.
- **What changed.** `DRD-30` removes `state` from the `Drag`. The expected list is now the ten members of `DRD-30`'s `Drag` type, and only `'state'` left it.
- **What the test observes.** It still observes the runtime `Drag` that `activate` receives, so its subject didn't change.
- **One stale label.** The test's `describe` title, "the lift in the behavior state", names the `DRD-27` shape. It goes to §6.

**Test migration, mechanically.** Across `tests/`, the diff from `1d5d3fa13` to `da139407e`:

- removes no `expect(` line and adds 16;
- removes 5 `@ts-expect-error` lines and adds 17;
- removes 52 `log.push(` lines and adds 58.

The removed `@ts-expect-error` lines reappear reworded. One of them changed its subject, which is `DRF-4` (b).

**Built-ins: activation order and nullability.**

- **Order.** `freeDrag`: `acquire`, the invalidation listener, construction, `translate`. `sortable`: `acquire`, the second pull, two declines with `null`, then each resource with its disposer registered before the next. Both match `DRD-30`'s list.
- **Nullable members.** No activation resource is nullable. The nullable members left are `#request`, `#result`, and `sortable`'s `#direction`, which isn't a resource.
- **Function identities** meet `DRD-20`. `updateInsertion` is now per module. That is stronger than DRD-20 requires, and coalescing is still by each controller's step list.

## 2. Ownership: the operation keeps its behavior

The question: both operations keep their whole behavior and read its public fields, and `FreeDragOperation` also writes the behavior's `motion`. Does that match the owner's model of independent operations?

**The direction of the reference is sound.**

- An operation lives within its controller and points at the longer-lived object. No behavior member refers to an operation. `FreeDragBehavior` and `SortableBehavior` have no field for one, and their steps receive the operation as an argument.
- So `DRD-20`'s retention property still holds: a stale callback can't reach a later operation through the instance.
- The owner didn't require every resource to be passed through the constructor. One reference to the behavior is the smallest way to reach collaborators that last as long as the controller.

**What each operation reads through the reference.** All of it lasts as long as the controller, except `motion`:

| Kind | `freeDrag` | `sortable` |
| --- | --- | --- |
| Configuration, fixed at construction | `config`, `root`, `window`, `axis` (a mode), `landing` | `config`, `landing` |
| Collaborator with its own lifecycle | `bounds`: a constraint whose cache is invalidated by a listener for each operation | `axis`: the insertion geometry, invalidated and retired for each operation through the behavior's functions. `displacement`: the sink |
| **Operation state** | **`motion`** | none |

- **Configuration and collaborators are the expected shared values.** Every behavior field the operation reads is `readonly`, so the operation can't replace one.
- `sortable`'s operation changes the axis cache only through the cache's own methods: `resolve`, `moved` and `invalidate`. That cache's lifecycle comes from before `DRD-30` and isn't in scope here.
- The collection version stays on the behavior, as `DRD-30` requires.

**`motion` is on the wrong object.**

- **What it is.** The visual's delta for the current call: the pointer's travel plus the operation's own offset, projected to the axis and clamped. `FreeDragOperation` is its only writer and its only reader.
- **Not every read follows a write in the same hook.** `start` reads the value that `activate`'s `translate` wrote. That works only because nothing runs between those two calls.
- **Why it sat on the behavior.** `DRD-20` let the behavior hold "scratch buffers rewritten before every read", because the behavior was the only object that persisted between hooks. `DRD-30` made the operation that object. So the reason no longer holds, and the buffer now carries operation state on the controller's lifetime.
- **It isn't a runtime defect.** Only one operation per controller exists at a time. The single gate drops a pointer event that arrives during a pass, so `#computeMotion` can't be re-entered.
- **It isn't a defect against the record.** `DRD-30` points to `DRD-20`'s list, and that list includes scratch buffers. So it is a gap in the decision, and the decision is amended.

**Amendment to `DRD-30`, recorded in [`00-index.md`](00-index.md):**

- A scratch buffer belongs to the object whose work writes it.
- The behavior keeps scratch only for its own admission and activation, and an operation writes no member of its behavior.
- `FreeDragOperation` owns its motion.
- `DRD-20`'s scratch-buffer sentence now applies only to the behavior's own work.

**Representation.** The operation keeps one `{ x, y }` object as a private field.

- That costs one more object per activation and one fewer per controller, and adds nothing per sample.
- **Rejected:** the operation itself as the point, with public `x` and `y`. It allocates nothing, but `operation.x` would sit beside `drag.x` and mean something else.
- `MotionConstraint.apply`'s parameter is public through `BoundsInstaller`, so it stays as it is.

## 3. `DRF-4`: two statements and a witness the migration left wrong

Tier C. The [`00-index.md`](00-index.md) entry is the record.

**(a) A class instance infers its operation.**

- **What's wrong.** The report says "a class instance gives no inference site for the operation either". The declaration test says so in a comment, and names `draggable`'s three type arguments for its class witness. Both built-ins name them too.
- **What the probe showed.** I copied `src/` at `d99ebd304`, removed the built-ins' type arguments, and the copy type-checked with no error. `freeDrag`'s `moveTo` step is an arrow whose parameter gets its type only from inference, and it calls `moveTo`, a member only `FreeDragOperation` has. That is enough to show the inference. I didn't analyze whether `sortable`'s `invalidate` step would show it too.
- **A smaller probe agrees.** A class shaped like the built-ins, with private fields, a typed `settle` and a verdict from `drop`, infers its operation without type arguments. A step can then call one of its own methods.
- At `1d5d3fa13`, the same witness called `draggable(root, new Lifted())` with no arguments.

**(b) The session-reach witness lost its `Drag`.**

- **Before.** `authoring.declaration` › "should not let a controller or a drag reach the session" asserted that a step's `Drag` has no `phase`, `next` or `decision`.
- **After migration.** The step's parameter is now the operation, so the test asserts that about `BehaviorOperation`. That type is the author's, and never had those members, so the test can't fail.
- **What still covers the `Drag`.** The browser test that lists the `Drag`'s keys still covers it at runtime. At the type level, nothing does.

## 4. The three explicit type arguments

**What the probes show,** at `d99ebd304` with `tsc`:

| Behavior | Operation inferred | Verdict inferred |
| --- | --- | --- |
| Class instance, as in the built-ins | yes | not needed: the class annotates `settle` |
| Literal, `activate`'s parameters not annotated | no, falls to `BehaviorOperation<Verdict>` | no: `settle`'s `outcome` is `Outcome<unknown>` |
| Literal, `activate`'s parameters and return annotated, and the operation type has at least one hook | yes | n/a |
| Literal whose operation type has no hook member | no: it fails `BehaviorOperation`'s weak-type check even when named | n/a |
| Literal at `1d5d3fa13`, with `drop` returning the verdict | n/a | **yes** |

**Why.**

- **The operation.** In a literal, `activate`'s unannotated `drag` is typed by `Drag<Operation>`. TypeScript fixes `Operation` to give that parameter its type before it reads the return value.
- **The verdict.** `Verdict` now occurs only in `Operation`'s constraint, and TypeScript infers nothing from a constraint.

**Usability.**

- The requirement is narrower than the report states. It applies only to literal behaviors, and there to two needs:
  - a step that reads the operation's own members;
  - a hook that needs the verdict's type.
- A literal whose hooks only close over values needs no type arguments.
- **Not partial.** TypeScript has no partial inference, so naming the operation means writing `State` and `Verdict` as well.
- **One regression against `1d5d3fa13`.** A literal's `settle` and `end` no longer get the verdict's type from `drop`. Two type arguments, `draggable<State, Verdict>`, still restore it.

**Disposition: no redesign.**

- The candidates are to derive `Verdict` from the operation type, or to type `activate`'s `Drag` without the operation.
- Each one gives up something `DRD-30` decided:
  - the verdict as a parameter of its own;
  - a step through a `Drag` receiving the typed operation.
- Neither was probed, so this record doesn't choose one. If the combined review or the owner finds the authoring cost unacceptable, that is a new decision, with probes.
- **For now, `README.md` states when a literal names the type arguments, and that a class instance needs none (§6).**

## 5. Costs: `DRO-7` and `DRO-8`, read and not accepted

**`DRO-7`, from the `DRF-3` repair.**

- **Size.** +15 to +17 B minified on every lifted row, and −6 to +6 B Brotli.
- **The ceiling.** `freeDrag` + `bounds` + `landing` goes from 62 B to 68 B over its ceiling from the fix alone.
- It repairs a Tier A defect, so declining it means keeping the defect.

**`DRO-8`, from `DRD-30`.**

- **Size.**
  - The kernel: −29 B minified and +16 B Brotli.
  - `freeDrag`: +102 B minified and +96 B Brotli. It is now 152 B over its ceiling, up from 56. With `bounds` and `landing` it is 158 B over, up from 66.
  - `sortable`: −80 B minified and +62 to +69 B Brotli.
  - The control is 99 B off, up from 83.
  - The report attributes the growth to class member names the minifier keeps. That is reading, not an ablation, and I add no attribution of my own.
  - One thing I didn't check: whether the size build's minifier shortens `#private` names. So it isn't known how much of the growth comes from behavior fields that became public for the operation to read.
  - An attribution needs an ablation, which this record doesn't authorize.
- **Allocation.** I confirmed the report's counts for the kernel and the built-ins by reading `session.ts`, `free-drag.ts` and `sortable.ts`. I didn't check the examples' counts.
  - One thing differs from what `DRO-8` expected: the examples. A literal operation's hooks close over the `Drag`, so each activation also allocates one function per hook.
  - That follows from `DRD-30`'s "hooks take no `Drag`". Its "Rejected" paragraph counted only the object.
  - An operation written as a class avoids it.
  - §6's motion change adds one object per activation to `freeDrag` and removes one per controller.
- **Per sample.**
  - The `DRF-2` test passed in 5 of 5 runs, at 136.73 to 140.09 B per move. That is inside the earlier unmutated range of 135.87 to 144.85.
  - Its demonstrated sensitivity is about 54 B per move. So these figures show no added per-sample object of that size, and say nothing about anything smaller.
  - By reading, nothing is added per sample.
- **The kernel per-sample test** passed in all six suite runs the report lists. It isn't interpreted here, and its reading stays open.

**For the owner:** `DRO-8` now records the example closures and §6's motion object. Nothing is accepted.

## 6. Remediation before the combined review

**One bounded unit, for one implementer.**

**Base:** `drag/production` at the commit that carries this record.

**Items:**

1. **`FreeDragOperation` owns its motion.**
   - `motion` leaves `FreeDragBehavior` and becomes a private `{ x, y }` field of the operation.
   - `#computeMotion`, `translate`, `drop` and `#geometry` use that field.
   - No behavior member is written by an operation. The behavior's doc comment no longer mentions a scratch buffer.
   - Behavior is unchanged: `start`'s geometry still reads the motion that `activate`'s `translate` computed.
2. **`DRF-4` (a).**
   - `freeDrag` and `sortable` call `draggable(root, behavior)` with no type arguments.
   - The declaration test's class witness drops its comment and its type arguments. It shows inference with a step through the controller that calls a member only the class operation has.
3. **`DRF-4` (b).**
   - "should not let a controller or a drag reach the session" asserts again that a `Drag` has no `phase`, `next` or `decision`. Use the `Drag` that `activate` receives.
   - The operation assertions may stay.
4. **Labels and documentation.**
   - `authoring.browser`'s `describe` title "the lift in the behavior state" names the operation instead.
   - `README.md` § Writing a behavior gets one or two sentences. A literal behavior names `draggable`'s type arguments when its steps read its operation's own members or its hooks need the verdict's type. A class instance infers them.

**Files:**

- `src/free-drag.ts`
- `src/sortable.ts`: the type arguments only
- `tests/authoring.declaration.test.ts`
- `tests/authoring.browser.test.ts`: the title only
- `README.md`

**Checks:**

- the [handoff](../../../.agents/docs/handoff.md) checks on each changed file;
- `just typecheck`;
- `just test` and `just test-engines`. Only the three size rows may fail. Record the kernel per-sample test's result without interpreting it;
- the `DRF-2` test passes in those suite runs. Run it no further;
- `just size` before and after, every row, minified and Brotli, for `DRO-8`.

**Not authorized:**

- timing, `compare.ts`, or any other measurement;
- any file outside the list above;
- a changed behavioral expectation in any test;
- an accepted cost, or a re-based ceiling.

**Return to the architect if:**

- item 1 needs a per-sample allocation, or changes a test's behavioral expectation;
- item 2's type-check fails without the type arguments;
- any test other than the size rows fails.

**Report:** append a section to this record. Give:

- the commit;
- the size rows;
- the allocation change counted by reading;
- the suite counts and the kernel per-sample result.

Then push and stop.

**After this unit:**

- the owner reads `DRO-7` and `DRO-8`;
- `DRF-1` and the kernel per-sample reading stay open, apart from this unit;
- the combined review follows those, as recorded.

**Note for the combined review.** `DRF-4` (b) is a migrated test whose subject changed: the step's target was the `Drag`, and became the operation. Other migrated tests can fail the same way, and this record didn't search for them.

## 7. Remediation report

**Commit:** `79be2c938` on `drag/production`, from `4babe0758`. It touches only the five files §6 lists.

**Items:**

1. **Motion.** `FreeDragOperation` owns `readonly #motion = { x: 0, y: 0 }`. `translate`, `drop`, `#computeMotion` and `#geometry` read it. `FreeDragBehavior` has no `motion`, its doc comment no longer mentions scratch, and no operation writes a behavior member. `activate`'s `translate` still writes the motion that `start`'s geometry reads. No test expectation changed.
2. **`DRF-4` (a).** `freeDrag` and `sortable` call `draggable(root, behavior)`, and the type-check passes. The class witness has no comment and no type arguments. Its operation gained `nudge()`, and a step through the controller calls `operation?.nudge()`, which only the inferred class type allows.
3. **`DRF-4` (b).** The session test again asserts, on the `Drag` that a literal's `activate` receives, that it has no `phase`, `next` or `decision`. The operation assertions stay.
4. **Labels and documentation.** `authoring.browser`'s title is "the lift in the operation". `README.md` § The `requestStep` rule says, after the `Nudged` example, when a literal names the type arguments and that a class instance infers them.

**Checks:**

- The handoff loop ran on the four TypeScript files: `fmt`, `lint-fix`, `fmt`, then `lint`, with no diagnostic left. `README.md` was formatted. No link changed, and `git diff --check` is clean.
- `just typecheck` passes. All `@ts-expect-error` directives are used.
- `just test`: 339 of 342 passed. The three failures are the size rows (`draggable alone`, `freeDrag`, `freeDrag + bounds + landing`).
- `just test-engines`: 930 passed and 18 skipped, across 66 files.
- **Kernel per-sample test:** passed in both runs (Chromium only). Not interpreted.
- **`DRF-2` test:** passed in `just test` (Chromium only). It was not run further, so no B-per-move figure was recorded.

**Size for `DRO-8`.** `just size` at `4babe0758` and at `79be2c938`. Not accepted, and no ceiling was re-based.

| Row | Before min | After min | Δ | Before br | After br | Δ |
| --- | --: | --: | --: | --: | --: | --: |
| draggable alone | 6435 | 6435 | 0 | 2123 | 2123 | 0 |
| draggable + lift | 11891 | 11891 | 0 | 4129 | 4129 | 0 |
| example: resize handle | 9092 | 9092 | 0 | 3229 | 3229 | 0 |
| example: drop zone | 12690 | 12690 | 0 | 4420 | 4420 | 0 |
| example: canvas group | 9228 | 9228 | 0 | 3230 | 3230 | 0 |
| freeDrag | 15080 | 15047 | −33 | 5119 | 5097 | −22 |
| freeDrag + bounds + landing | 15765 | 15732 | −33 | 5368 | 5353 | −15 |
| sortable + y | 20122 | 20122 | 0 | 6668 | 6668 | 0 |
| sortable + xy | 19738 | 19738 | 0 | 6608 | 6608 | 0 |
| complete | 21155 | 21155 | 0 | 7054 | 7054 | 0 |

- `freeDrag` is now 130 B over its 4967 B ceiling, down from 152.
- `freeDrag` + `bounds` + `landing` is 143 B over its 5210 B ceiling, down from 158.
- The control row is still 99 B off.
- Removing the type arguments changes no emitted code. The `freeDrag` change is the motion move. I made no ablation to attribute it further.

**Allocation, counted by reading:**

- `freeDrag`: one object more per activation (the operation's `#motion`), and one fewer per controller (the behavior's `motion`). Nothing changes per press or per sample.
- `sortable`, the kernel and the examples: unchanged.

**Open:** `DRO-7` and `DRO-8` for the owner. `DRF-1` and the kernel per-sample reading stay open, apart from this unit. Then the combined review.
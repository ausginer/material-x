# Activation lifetime in the built-ins, and the lift representation report

**Status, 2026-11-08: assessed by the architect, not decided.** Section 1 reads the [lift representation report](lift-representation-report.md) and is recorded in [`00-index.md`](00-index.md) as `DRF-2`'s closure, `DRF-3` and `DRD-29`'s status. Section 2 recommends a design for the built-ins' activation resources, which becomes a decision only after the owner answers §Questions for the owner. Section 3 is the next bounded handoff.

**Read at:** `d258573fa` on `drag/production`, with the owner's uncommitted edits to `src/free-drag.ts` and `src/sortable.ts`. Those edits are left as they are: `git diff -- packages/drag/src | sha256sum` gives `bdcb626a5b1b0737febb6f657a223c38f535e0bfc69c222c42b787a9f2267e45`, and `--shortstat` gives `2 files changed, 24 insertions(+), 23 deletions(-)`.

**Method:** reading only. The architect ran no suite, probe or measurement. The figures quoted from the unit are the implementer's, checked against [`2026-11-08-lift-representation.txt`](measurements/2026-11-08-lift-representation.txt) and by arithmetic.

## 1. The lift representation report

| Item | Result |
| --- | --- |
| 1, the owner's `Lifter` with its callers, `9cd7e37c5` | Conforms. The owner's commit `5401500f8` matches the handoff's fingerprint, and item 1 changes nothing under `src/` |
| 2, `DRF-2`, `8c5ace665` | Conforms. `DRF-2` is closed, with the sensitivity stated below |
| 3, `DRD-29`, `b33890461` | Conforms to every listed property, except `DRF-3` |
| 4, the report | Its size and allocation figures are consistent. One per-sample sentence claims more than the test shows, see below |

**Checked against `DRD-29` by reading `b33890461`:** `Lift` has the seven snapshot members, `translate` and `land`, all set in `acquire` and never written again. The displacement is a private record that only `translate` writes. `land` calls `timing` once, at the call, with the displacement, then `x - rect.x` and `y - rect.y`. A throw records nothing, because the timing runs inside the record's literal. The last call wins. The landing disposer reads the displacement, reduced motion and the restored position at release. `lift.js` exports `Lifter`, `Lift` and the type `LandingTiming`, and `cancelLanding` is a read-only field. Under `src/kernel/` only `KernelDrag` changed, and the lift grep finds nothing.

### `DRF-3`: `land` keeps the object the timing returned

**Yes, a caller-owned timing that reuses its result object can change an already recorded landing.**

- **At `89995c27e`,** both built-ins copied the timing's values at `settle` with a spread, `{ x, y, ...timing(...) }`. Only a custom behavior's `land(landing)` kept the caller's object.
- **At `b33890461`,** `land` records `{ x, y, timing: timing(...) }`. The landing disposer reads `landing.timing?.duration` and `landing.timing?.easing` at release.
- **Between `land` and that read, foreign code runs.** `#conclude` calls `settle` and then `#release`, which aborts `drag.signal` and runs every disposer added after `acquire`. Those include `sortable`'s removal of a consumer's placeholder, and any disposer of a custom behavior. Then the lift's release calls `hidePopover`, which dispatches `beforetoggle` synchronously, and may move focus. Code in any of these can call the same timing again, for example through another controller that shares it and settles in that window, or can change the returned object.
- **The library's own `landing()` returns a new object on every call,** so it isn't affected. A consumer's timing typed `LandingTiming` may return one reused object: the return type is `Readonly` for the reader, which doesn't stop the producer from writing it.

This is an incidental behavior change, which `DRD-29` and the owner's clarification don't authorize. It is Tier A, because a correctly integrated consumer sees a different duration or easing. **The fix is in `land`, not in the built-ins:** `land` copies `duration` and `easing` at the call. The record stays one object per `land` call, so the allocation count doesn't change. `DRD-29`'s `land` bullets now state this, and §3 is the handoff.

### Per-sample sensitivity of `DRF-2`'s test

- **Unmutated, 15 runs:** 135.87 to 144.85 B per move for `lift.ts:translate`. That is 5 calibration runs, 5 with the bound at item 1's source, and 5 at item 3's source.
- **L1, an object `{ x, y }` of two non-integer numbers per sample:** 187.53 to 196.99 B per move, about 54 B above the unmutated mean. The test failed in 5 of 5 runs, and the existing test passed.
- **The bound is 153:** 8.15 B above the largest unmutated figure, and 17.13 B above the smallest.

**What the test shows:** an added per-sample allocation of L1's size fails it. That meets `DRF-2`'s required property and `DRD-23`'s last bullet. **What it doesn't show:** whether an allocation smaller than L1's would fail. By the spread alone, an addition under about 8 B per move would pass every observed run, and one up to about 17 B would pass some of them. That is inference, not a mutation result.

So the report's "There is no rise" holds: the five runs after `DRD-29` lie inside the range before. Its next sentence, "`translate` allocates only its CSS string at a non-integer displacement, before and after", goes further than the test. Within the test's demonstrated sensitivity, **`DRD-29` adds no per-sample allocation of L1's size.** That the remaining bytes are the CSS string is a reading of `translate`'s source, not a measurement. The report is a dated record and isn't edited.

### `DRO-7`: this unit's figures, reviewed and not accepted

- **Size:** every difference in the size table matches its two columns. The minified figures are the deterministic ones. The Brotli differences of −22 to +24 B are of the size that small source changes move compressed output, so they're reported, not interpreted. Against `89995c27e`, minified:
  - the owner's class adds 42 to 54 B to every lifted row;
  - `DRD-29` then adds 15 B and 3 B to the two rows that compose only the lift, and removes 45 B from `freeDrag` and 60 B from `sortable`;
  - `freeDrag` stays over its ceiling by 56 B Brotli, and `freeDrag` + `bounds` + `landing` by 62 B. The control for `draggable` alone stays 83 B off.
- **Allocation, by reading:** the architect's count agrees.
  - Per lifted controller, one function fewer, because `acquire` is on the prototype.
  - Per lifted activation, one object more, the displacement record. `DRD-29` anticipated this cost.
  - Per landing, no change: two objects in the built-ins, one in a custom behavior.
  - `DRF-3`'s fix keeps these counts.
- **Per sample:** as above.

**Not established:** any timing, and the kernel's per-sample reading, which stays open apart from this unit. The `DRF-2` profiles also hold `kernel/` keys. They aren't interpreted here.

## 2. The built-ins' activation resources

### What the assertions are evidence of

The working tree holds 23 non-null assertions on `drag.state` in the two built-ins:

| Field | `freeDrag` | `sortable` | What the value is |
| --- | --: | --: | --- |
| `lift` | 6 | 3 | Activation resource |
| `placeholder` |  | 2 | Activation resource |
| `frame` |  | 2 | Activation resource |
| `context` |  | 2 | Activation resource |
| `insertion` |  | 1 | Set at activation, then replaced, never cleared |
| `request` | 2 | 3 | Produced by `drop`. A verdict or a skip implies a drop |
| `result` | 1 | 1 | Written in `settle` for `end` |

**16 of the 23 read an activation resource.** Each of these values is acquired in `activate`, is never replaced or cleared, and is released by the operation's disposers. So it exists for exactly one interval: from the end of a successful `activate` to the release.

**The kernel already guarantees that interval.** A hook after `activate` runs only if `activate` returned without declining or throwing (`Behavior.activate`). A step receives the `Drag` only from the end of activation until the drop or the decision (`Drag.requestStep`). So every assertion on an activation resource relies on the same kernel guarantee, and the type can't see it, because the state record is created at admission. Each field is still nullable on its own. The record so encodes a phase, admitted or activated, one field at a time. `DRD-20` rejects a phase in a behavior.

**Two more signs of the same cause:**

- `sortable`'s `invalidate` step tests `drag.state.insertion` for `null`. A step that receives a `Drag` can only run after activation, where `insertion` is never `null`, so that branch never runs.
- `xy.ts` asserts `query.insertion!`, because `AxisQuery` types the committed gap as nullable.

The owner's uncommitted `sortable` edit reads `drag.state.lift.visual` six times without `!`. TypeScript narrows the field after its assignment in `activate` and keeps the narrowing through later calls. That narrowing is the compiler's assumption, not a guarantee, and it doesn't reach the other hooks.

**`request` and `result` aren't activation resources:**

- `request` is absent until the drop, and a cancel before the drop gives a result whose `request` is `null`. That is a real optional value. Its assertions rely on the kernel's rule that a verdict or a skip follows a drop.
- `result` passes a value from `settle` to `end`. `end` also receives the outcome.

Neither belongs in an object constructed at activation. Both are out of scope here.

### Recommendation: one activated-operation object per built-in

**These responsibilities belong to an operation object constructed at the end of `activate`, with its resources as constructor arguments.** It is the smallest design that matches the interval above, and it needs no change to the kernel or to any public type.

**Required properties:**

1. **Two lifetimes, two objects.**
   - The admission's `state` holds what admission decides: `visual`, and in `sortable` also `box` and `direction`. It also holds one reference to the operation, `null` until the end of `activate`.
   - The operation is a module-private class instance in each built-in. Its constructor receives every activation resource:
     - in `freeDrag`, the `Lift`;
     - in `sortable`, the `Lift`, the snapshot, the insertion, the placeholder, the frame task and the axis context's values.
   - None of those members is nullable.
2. **Acquisition order and release don't change.** `activate` keeps its order statement by statement: `acquire` first, as `DRD-27` requires, then the second pull and the quiet decline, then each resource with its disposer registered before the next acquisition. The operation is constructed after the last acquisition and written to the state as `activate`'s last effect. The constructor acquires nothing and can't fail. So a failed or declined activation is restored by the disposers, as now, and no operation exists for it.
3. **The operation owns its transitions.** Translation, the motion and geometry, the drop's request, `settle`'s landing, `sortable`'s per-frame insertion update and the reconciliation after a pull are its methods, on its own non-null members.
4. **The behavior instance keeps controller-lifetime values only,** as `DRD-20` requires. That is the configuration, the `Lifter`, the axis and displacement runtimes, the landing timing and the collection version. Its hooks and its controller steps reach the operation through the one reference.
   - That read carries the only assertion on the activation boundary, once per hook or step. The comment at the read names the kernel guarantee it relies on.
   - The operation receives the controller-lifetime collaborators it uses as constructor arguments, and holds no reference to the behavior instance.
5. **Function identities follow `DRD-20`.** A step or callback that closes over the operation is created once per operation, and none per sample. `behavior.invalidate` stays one function per controller, because the public controller requests it when no operation exists.
6. **No new per-sample cost.** Each sample reads one reference, the operation, where it now reads the `lift` field. It allocates nothing new. The `DRF-2` test and the kernel's per-sample test must pass as now.
7. **Allocation per activation is reported, not accepted.** Expected by reading:
   - `freeDrag`: one object more, the operation;
   - `sortable`: none more, if the operation also serves as the `AxisQuery` and the `AxisContext`, which the axis rules read during calls and don't keep. That replaces the context literal. Otherwise, one more.
8. **No behavior change, public type change or kernel change.** The tests don't change. `grep -rniE 'lift|landing' src/kernel src/draggable.ts` stays empty. `AxisQuery.insertion` may become non-null, because `AxisQuery` is internal. Then `xy.ts`'s assertion goes.

**Out of scope:** `request` and `result`. Building the result in `end` from its outcome would remove `result`'s field. That is a separate small choice, not part of the activation lifetime.

**Cost: size.** A second class adds code, and its members are called from another class, so their names can't be `#`-private and the minifier doesn't shorten them. `DRD-24` measured 439 B of minified growth from such names in the kernel. **No figure is estimated here.** The unit measures every row of `just size`. `freeDrag` already fails its ceiling, so this cost needs the owner's reading before the unit starts.

### Rejected or deferred

- **Keep the nullable fields and add a narrowing helper per field.** It moves the assertions, and every field still encodes the phase separately.
- **The operation acquires its own resources in a static factory.** That would put acquisition and use in one class. But `activate`'s order, the quiet decline and the failed-acquisition path would move with it, which is a larger change to show as behavior-preserving. The owner's direction is also resources supplied at construction.
- **An operation class shared by the two built-ins, or a base class.** `DRD-20` rejects both, and the two operations share no member beyond the `Lift`.
- **Deferred to the owner: a typed activation in the kernel.** `activate` would return the activated state, and later hooks would receive a `Drag` of that type. The kernel would still know no lift, so the owner's constraint holds. It is the only design that removes the boundary assertion everywhere. That includes custom behaviors: the tests write `drag.state.lift!` 22 times in 9 files, because `lift.js` documents keeping the `Lift` in `drag.state`. But it changes `draggable`'s public authoring types (`DRD-2`), the contract, the README and every behavior in the tests. It isn't the smallest design, and nothing here needs it first. If the owner wants it later, the built-ins' operation objects become its activated state unchanged.

### Questions for the owner

1. **Is this boundary the one you mean?** That is, an operation object constructed at the end of `activate`, one nullable reference in the admission's state, and the boundary assertion only at that reference. Or do you want the kernel's typed activation now?
2. **May the unit measure the size cost and bring it back,** knowing that `freeDrag` is already over its ceiling? Or do you set a limit for it before it starts?
3. **Your uncommitted edits** to `free-drag.ts` and `sortable.ts` overlap the code this unit rewrites. Will you commit them before the unit starts, or should the unit commit them unchanged as its first item, checked against the fingerprint above?

On your answers, the architect records the decision as `DRD-30` and writes its handoff.

## 3. Next bounded handoff: `DRF-3`

**For one implementer. It is ready now and needs no decision from the owner.** It restores the built-ins' landing as it was at `89995c27e`, and touches neither file the owner is editing.

**Base:** `drag/production` at the commit that carries this record. The working tree holds the owner's uncommitted edits to `src/free-drag.ts` and `src/sortable.ts`. Check their fingerprint above, and stop if it differs. Don't stage, stash, reset or change them. Suite runs include them.

**Change:** `src/lift.ts` only. `land` copies the timing's `duration` and `easing` into its record at the call. The landing disposer reads those copies, and applies the default duration and easing when no timing was given. Reduced motion is still read at release. Nothing else in the lift changes.

**Witness,** in `tests/landing.browser.test.ts`, in every engine:

- A behavior written in the test composes the lift as `lift.js` documents. Its timing returns one object, which it reuses.
- After `acquire`, `activate` registers a disposer that writes a different `duration` and `easing` into that object. That disposer runs before the lift's own, because disposers run in reverse order.
- The test asserts that the flight animation's duration and easing are the values returned at the `land` call.
- **The test must fail against `d258573fa`'s `src/lift.ts` before the fix, and pass after it.** Record both results.

**Checks:**

- the [handoff](../../../.agents/docs/handoff.md) checks on every changed file;
- `just test` and `just test-engines` show only the known failures: the three size rows, and the kernel per-sample test if it fails intermittently. Record that test's result as before, without interpreting or rerunning it;
- `just size`: the lifted rows' minified and Brotli change against `b33890461`, reported for `DRO-7`.

**Not authorized:** timing, `compare.ts`, any further measurement, any change outside `src/lift.ts` and that test file, and any change to an existing test's expectation.

**Return** if the witness doesn't fail before the fix, any other test fails, or the fix needs another file.

**Report:** a short section appended to this record's §3, with the commit, the witness's before and after results, the suite counts and the size rows. Then push and stop.
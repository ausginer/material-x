# Callback and closure representation in `src/`

**Status, 2026-11-08: assessed by the architect, not decided.** No `DRD`, `DRF` or `DRO` entry is minted or amended. The recommendations below wait for the owner's discussion, and the combined review still waits for the owner's inspection.

**Read at:** `ee9ddef52` on `drag/production`, from the commit's tree with `git show`. The owner was editing `src/sortable/layout-animation.ts` during the reading. Those edits were left as they were, and §3 reads them only where they meet this assessment. At one moment of the reading, `git diff -- packages/drag/src | sha256sum` gave `6b29da087f219f1fc635e94bed83e5e41a4eb61a22806ee203d88e384f344dcb` and `--shortstat` gave `1 file changed, 102 insertions(+), 9 deletions(-)`. The edit was still changing.

**Method:** reading only. No suite, probe or measurement ran. Counts follow the [ownership report](ownership-report.md)'s rules and count functions only: the function objects that library code creates at a site it owns. Closure contexts are not counted. **Every runtime effect below is unmeasured.**

**Governing rules:** `DRD-20`'s binding and lifetime bullets, the contract's "No controller method depends on `this`" and `cancelLanding`'s "Works when detached", `DRI-8`'s identity coalescing, `DRI-17`'s stable gate step, `DRD-24`'s gate interface, `DRD-2`'s "no third-party `axis` or plugin seam", and CONTRIBUTING's Shape, §2.1, §9 and §17.

## 1. Where functions are created, and why each form is used

| Site at `ee9ddef52` | Form | Who calls it, and with which receiver | Created | Verdict |
| --- | --- | --- | --- | --- |
| `Gesture.requestStep`, `requestCancel`, `requestDestroy`, `use` (`kernel/gesture.ts:215–260`) | Arrow fields | Consumers, detached. `draggable` copies them into its own record (`draggable.ts:44–49`) | 4 per controller | **Keep.** The contract requires detached calls |
| `Gesture.raise` (`:191`) | Arrow field | `runDragDisposer` and `enter` call it unbound | 1 per controller | **Keep** |
| `#runStep`, `#press`, `#command` (`:229`, `:266`, `:289`) | Arrow fields | `enter(step, argument)` calls `step(argument)` unbound | 3 per controller | **Keep** while the gate has that signature. See the rejected receiver form below |
| `#onPress`, `#onCommand` (`:262`, `:285`) | Arrow fields that forward to `enter` | The platform, as listeners on the root | 2 per controller, `#onCommand` also with no `command` hook | **Keep.** A `handleEvent` on `Gesture` would save 2 per controller and add a type branch. That gain is too small to justify the change |
| `Session` as its own listener (`kernel/session.ts:228`, `:237`) | `handleEvent` with `this` registered | The platform | 0 | **Keep.** Explicit receiver registration already, for six event types |
| `#move`, `#endPending`, `#up` (`:357`, `:393`, `:400`) | Arrow fields | `enter`, unbound | 3 per press | **Keep.** See below |
| The `Drag` record's `use`, `requestStep`, `requestCancel` (`:194–213`) | Arrow properties that close over the session | Behaviors, as methods or detached | 3 per press | **Keep.** See below |
| `#next` transitions (`:232`, `:441`, `:454–460`, `:590`) | Closures over the transition's data | `advance`, once | At most 3 per operation | **Keep.** Each one carries exactly its transition's data (`operation`, `invoke`, `outcome`). Fields and stable methods would put that data in long-lived mutable fields, and "taken before it runs" would then depend on resetting those fields |
| `#requestVerdict`'s `complete` and the two `then` callbacks (`:470`, `:506–514`) | Closures | The thenable, with no receiver | 1, plus 2 for a thenable, per verdict | **Keep.** `PromiseLike.then` takes two functions |
| `armClickGuard` (`:64–113`) | One function per listener, and `expire` | The platform, and `setTimeout` | 5 per pointer activation | **Keep.** The guard outlives its session and its controller by design. A listener object would save about 4 functions and merge four conditions that are clear when separate |
| `drop()`'s verdict closure (`free-drag.ts:153`, `sortable.ts:217`) | Closure over the request | The kernel, with no receiver | 1 per drop | **Keep.** The public `BehaviorOperation.drop` returns a function |
| `FreeDragBehavior.invalidate` (`free-drag.ts:263`) | Arrow field | A step through the controller, and the scroll and resize listener (`:300`) | 1 per controller | **Keep.** A stable identity coalesces (`DRI-8`), and one function serves both uses |
| `SortableBehavior.invalidate`, `#invalidateGeometry`, `#retireAxis` (`sortable.ts:397`, `:505`, `:510`) | Arrow fields | Steps and a disposer, unbound | 3 per controller | **Keep.** Stable identities. `#retireAxis` avoids a function per activation |
| `updateInsertion` (`sortable.ts:130`) | Module function | Step | 0 | **Keep** |
| `moveTo`'s step (`free-drag.ts:325`) | Closure over the point | Step | 1 per call | **Keep.** `DRI-8` orders distinct steps, and each call needs its own |
| `sortable` activation: placeholder removal, the frame task's `run`, `fire`, `schedule` and `cancel`, the frame cancel, the invalidation listener (`sortable.ts:458–481`, `shared/invalidation.ts:21–40`) | Closures and literal methods | Disposers, `requestAnimationFrame`, listeners | 7 per activation | **Keep.** `createFrameTask` has one user now, so §2.1 applies to it. A coalesced animation frame is still a meaningful unit, and folding it into `SortableOperation` would save 3 functions and 1 object per activation |
| `Lifter.acquire` (`lift.ts:336–397`) | Closures | Disposers, and `Lift` members called as methods | 7 per activation | **Keep.** `DRD-29` decided this shape recently |
| `Lifter.cancelLanding` (`lift.ts:439`) | Arrow field | `use`, detached | 1 per controller | **Keep.** The contract requires it |
| Controller records' `requestCancel`, `requestDestroy` (`free-drag.ts:328–329`, `sortable.ts:591–592`) | Wrappers around the kernel's members | Consumers, detached | 2 per controller, per built-in | **Change**, R1 |
| `layoutAnimation`'s `finished.then` callbacks (`sortable/layout-animation.ts:107–114`) | The fulfillment callback closes over `element` and `record`. The rejection callback closes over nothing | Promise reactions | 2 per displaced row per committed move | **Change the rejection callback**, R2 |
| The sink's `report` and `settle`, read off the sink (`sortable.ts:281`, `:494`) | Read as detached functions | `y`, `xy`, `LinearShift` and `RectIndex`, unbound | Per controller, inside the sink | **Works at `ee9ddef52`. The class conversion in progress breaks it**, §3 |

Nothing is created per sample.

**Rejected: a gate that takes a function and its receiver.** `enter(step, receiver, argument)` calling `step.call(receiver, argument)` would let `#move`, `#up`, `#endPending`, `#press`, `#command` and `#runStep` be private methods. That saves 3 functions per press and 3 per controller. It changes `DRD-24`'s gate at every call site. `raise` and the four public members stay arrows anyway. A press is not a hot path, and the session already creates several objects per press. Reconsider it only if a per-press allocation target is set (see `DRO-1`).

**Rejected: a `Drag` class with a private link to the session.** It would save 3 functions per press. Today `drag.requestStep` and the other members work when detached. A behavior may rely on that, although the contract doesn't promise it. A class with prototype methods would change public behavior to save 3 functions per press.

**The two invalidation listeners differ, and they should keep differing.** `freeDrag`'s listener calls `behavior.invalidate` directly. `sortable`'s listener requests `#invalidateGeometry` as a step through the operation's `Drag`, so it costs one closure per activation and one pass per event. The difference follows from where each cache clears its stale flag:

- `bounds()` sets `stale = false` (`free-drag/bounds.ts:31`) before it calls the consumer's `source()` (`:44`). An invalidation that foreign code makes during that call is kept.
- `RectIndex.refresh` clears `#dirty` (`rect-index.ts:160`) after it calls the consumer's `box` and the sink's `settle` (`:145`). `LinearShift.refresh` clears its own flag after that (`linear-shift.ts:100`). A direct write from foreign code during those calls would be lost, and a step runs after them.

So harmonizing `sortable` to the direct form would need the flags cleared before foreign code runs. Harmonizing `freeDrag` to the step form would add a closure per activation for nothing. By `DRD-2` a hand-written `MotionConstraint` is not a supported seam, so a throwing `invalidate` outside a pass is outside the supported domain.

## 2. Recommendations

**R1. The built-ins' controllers pass the kernel's `requestCancel` and `requestDestroy` directly.** `kernel.requestCancel` and `kernel.requestDestroy` are already `Gesture`'s arrow fields. They are detached-safe, and consumers can't reach the kernel's record. The wrappers adapt nothing. Removing them saves 2 functions per controller in each built-in and one call frame per request. Detached behavior, arity in practice and what a consumer can reach stay the same. The `invalidate` and `moveTo` wrappers stay, because each one supplies a step. In the same edit, `FreeDragBehavior.invalidate` can become `readonly`, as `sortable`'s is.

**R2. `layoutAnimation` creates its empty rejection callback once.** `() => {}` closes over nothing and is created once per displaced row on every committed move. By reading, that is the package's most frequent function creation during a drag. A module-level `function` saves 1 function per displaced row and changes no behavior. The fulfillment callback has to capture `element` and `record`, so it stays.

- **Not recommended without measurement:** replacing `finished.then` with one `finish` listener per sink, which reads the element from `animation.effect.target`. It would remove both callbacks and the derived promise per row. It also changes the cleanup from a microtask to an event task, and nothing measured shows that the gain is worth that change.

**R3. Shape rule conformance, folded into a unit that touches these files.** At `ee9ddef52`, `remainingOf` (`layout-animation.ts:50`), `capacityFor` (`rect-index.ts:55`) and `verifyEquivalence` (`rect-index.ts:227`) are top-level `const` arrows, and the rule says `function`. The owner's edit already converts `remainingOf`. `Lift`'s `translate` and `land` (`lift.ts:352`, `:357`) are arrow properties in an object literal whose type declares them as methods, and the rule says shorthand. Neither reads `this`, so detached calls still work, and the allocation is the same. The `Drag` record's arrows are not covered by this rule, because they need the session as their lexical `this`.

## 3. The displacement sink class in the owner's edit

At `ee9ddef52`, `sortable` reads `displacement.report` (`sortable.ts:281`) and `displacement.settle` (`:494`) off the sink. It hands them on as plain functions, and `xy.ts:125`, `LinearShift` and `rect-index.ts:145` call them with no receiver. The factory's methods close over `running` and never read `this`, so this works.

The edit in progress adds `class LayoutAnimationDisplacementSink implements DisplacementSink` with prototype `report` and `settle`. If those methods read instance state through `this`, the first displaced row throws a `TypeError`, and so does the first `settle` while rows are in flight. **No current check catches this:**

- **Typecheck:** a method satisfies the function-typed properties `report: DisplacementReport` and `settle: DisplacementSettle`.
- **Lint:** `@typescript-eslint/unbound-method` is enforced repository-wide, but it checks the declared member, which is a property signature, not a method.

The root ESLint configuration names this failure as the characteristic one when a factory becomes a class.

**Recommended, if the class is kept:** pass the sink itself as the receiver. Every receiving API is internal: `AxisContext`, `InsertionGeometry.moved` and `RectIndex.refresh`, with no third-party axis by `DRD-2`. Concretely:

- `AxisContext` carries `displacement: DisplacementSink | null` in place of `settle`.
- `moved` reads the sink from the context instead of taking `report` as a parameter.
- `DisplacementSink` declares `report` and `settle` in method syntax, as `retire` already is.
- `unbound-method` then guards every extraction.

This also ends the sink being unpacked into two loose functions across three layers, which is §9's packing smell. The sink becomes one object per controller with no functions of its own, apart from the per-row callbacks in R2. Arrow fields in the class would also work. They keep the unpacking and create 2 functions per sink, the same count as the factory.

**Side effect, noted and not proposed:** with `settle` gone from `AxisContext`, the reason the [activation result report](activation-result-report.md) gave for keeping the context literal no longer applies. That reason was a name collision with the `settle` hook. Whether `SortableOperation` should serve as the context is a separate question.

## 4. Bounded follow-up

One unit, with the owner's class edit or after it, recipient `implementer`:

1. §3's receiver form, if the sink class stays. A witness must show that a sink whose `report` and `settle` read `this` works in a drag with rows in flight. That witness must fail against the edit as it stood, with the methods passed detached.
2. R1 and R2.
3. R3 for the files that this unit touches.

The unit's size and allocation are recorded as `DRO-8`'s are. No new gate is proposed.
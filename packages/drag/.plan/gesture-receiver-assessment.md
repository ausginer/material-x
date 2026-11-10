# Gesture receiver assessment

**Read at:** `03d1449e2` on `drag/feature-composition`. That commit carries [`gesture-receiver-report.md`](gesture-receiver-report.md). The implementation is `fd7ae3e43`, and the handoff's base is `c492e713e` with the owner's edit ([`owner-edit.diff.txt`](probes/gesture-receiver/owner-edit.diff.txt)).

**Governing records:** `DRD-34` in [`00-index.md`](00-index.md), [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md), and the contract's public surface, DRI-6 to DRI-10 and DRI-17.

**Method:** a reading of `git diff c492e713e fd7ae3e43` under `src/`, `tests/` and `README.md`, and of the report. Some checks were repeated (§4). Everything else in §4 is the implementer's result, and it is marked as reported.

## 1. Result

**`DRD-34` is implemented at `fd7ae3e43`, and it conforms.** All ten properties hold by reading, and every gap in the handoff is closed. Of the report's seven deviations and findings, six are accepted as they stand. The remaining one, item 1, shows an error in the handoff, which §3 corrects. No `DRF` is opened.

**Costs stay unaccepted, and no budget changes.** The report measures every composition as smaller than at `39af0ef44`, by 50 to 89 B Brotli. The rows that were red before this unit are still red: `draggable alone`'s control, `example: drop zone` and `freeDrag + bounds + landing`. These figures are the owner's to read. This assessment re-bases nothing.

## 2. The properties, by reading

| `DRD-34` property | At `fd7ae3e43` |
| --- | --- |
| 1. The public type | `DraggableController`'s four members are methods. Their JSDoc tells the caller to call them on the controller. `authoring.declaration.test.ts` asserts that the type has no `enter`, `raise`, `raiseInPass`, `detach` or `handleEvent` |
| 2. What `draggable` returns | `new Gesture(root, behavior)`. `Gesture` declares `implements DraggableController<Operation>`, and `#session` stays private |
| 3. One pass | `enter` is the only place that sets `#running`, and it contains the only bracket. `#run`, `apply()`, `InputHandler` and `handleInput` are removed. Every input passes a private method together with its receiver: `#press` and `#command` with the `Gesture`, and `#move`, `#up` and `#endPending` with the `Session`. A request passes no step. An idle step passes no receiver. An idle verdict fault passes `raise` with the controller |
| 4. Only input is refused | §2.1 |
| 5. The count | The per-event `WeakSet` is restored. A refused entry is counted only while a pass runs and a step was passed. Report item 3 |
| 6. A step has no receiver | An idle step runs through `enter(step, target)`. A step from the list runs as `step(target)`. In both cases the step has no receiver. The new test covers both paths |
| 7. Fault reports | `runDragDisposer(dispose, outcome, controller)` calls `dispose(outcome)` with no receiver and calls `controller.raise(error)`. All four of its call sites pass the controller, and none creates a function |
| 8. Unchanged calling rules | `src/lift.ts` and `src/free-drag/behavior.ts` are byte-identical to `39af0ef44`, so `cancelLanding` and `FreeDragBehavior.invalidate` are arrow fields again. The built-ins' controllers wrap `requestCancel(reason)` and `requestDestroy()` once per controller |
| 9. Lint | No suppression for the whole file. One suppression on a single line, in `raiseInPass`, gives its reason |
| 10. Other guarantees | §2.1 and §2.2. The reader is moved within the file, and its text is unchanged |

### 2.1 Request entry

`enter` refuses when `#running || (#destroyed && !#resolveDestroyed)`. For each kind of entry:

| Entry | While a pass runs | Idle, controller open | Closed, before teardown | After teardown |
| --- | --- | --- | --- | --- |
| Input | Refused, counted once | Opens a pass | Only reached during a pass | Refused. The listeners are already aborted |
| `requestCancel`, the session's cancel, a verdict's acceptance | Slot filled. The running reader applies it | Opens a pass with no step | Only during a pass | `requestCancel` needs a session, and teardown clears it. A completion finds its session ended |
| `requestDestroy` | Slot filled. The running reader tears down | Closes the controller and opens the pass that tears it down | Returns the same promise | Returns the same promise |
| `requestStep` | Listed, coalesced by identity | First step of its own pass, with no receiver | Returns, because `#destroyed` is set | Returns |
| A verdict's fault | `raise` at once | `raise` is the first step, with the controller as its receiver | Its session has ended | Its session has ended |

**The case the owner's edit broke is fixed.** A `requestDestroy` on an idle controller fills its slot before it enters, so `#resolveDestroyed` is non-null and the entry is not refused. The closed state is only refused once the slot is empty, which happens at teardown. "Closed, before teardown" is never idle. `requestDestroy` closes and enters in one call, and inside a pass `#running` refuses first.

### 2.2 Cleanup

- **DRI-9.** `Session.#release` walks the operation's disposers last in first out. Each one runs through `runDragDisposer`, which reports a throw and lets the walk continue. A `use` after release runs at once with `#releasedWith` and the same reporter.
- **DRI-10.** `#teardown` keeps its order: it takes the slot and the resolver, clears them, empties the step list, calls `terminate`, walks the controller disposers, aborts the listeners and resolves the promise. A controller `use` after teardown runs at once with `null`. During teardown `#running` is still set and `#resolveDestroyed` is `null`, so a disposer's `use` runs at once, its `requestStep` returns, and its `requestCancel` finds no session.
- **The landing.** `cancelLanding` is passed to `use` detached in `sortable`, `freeDrag` and the README, and it works that way again. The report's G6 mutation fails "should cancel a running landing and the row animations".

## 3. The report's deviations and findings

1. **G1 and the `freeDrag` second argument: the report is right, and the handoff was wrong.** The architect first read the working tree at session start. In that tree, `freeDrag`'s `invalidate` called `kernel.requestStep(behavior.invalidate, behavior)` and passed `lifter.cancelLanding` to `use` unwrapped. Typecheck reported `src/free-drag.ts(58,63): TS2554`. The owner then changed the tree before the architect saved `owner-edit.diff.txt` and `typecheck.txt`: `invalidate` went back to one argument, and `use` received `() => lifter.cancelLanding()`. The handoff's table still described the first tree. **Correction to the handoff, measured against its own base:**
   - G1 has no `freeDrag` clause. Its other clauses stand.
   - In G5, `requestStep` has no second argument to ignore. The defect stands: `FreeDragBehavior.invalidate` is a prototype method passed by identity.
   - G6 applies to `sortable` and the README only, because the saved edit's `freeDrag` wrapped `cancelLanding`. The defect stands for those two sites.

   This changes none of the work. The implementer restored `freeDrag`'s `kernel.use(lifter.cancelLanding)` from `39af0ef44`, as property 8 requires.

2. **After teardown, `enter` refuses every entry: accepted.** `DRD-34` property 4 requires input to be refused after teardown. It does not require other entries to be accepted then. §2.1 shows that no request or step reaches `enter` after teardown. The result agrees with DRI-10's "A later request does nothing".
3. **The count tells input apart by the presence of a step: accepted.** This is the same invariant that `DRD-32` relied on: during a pass, only input enters with work. The comment at the check states it. A later change that enters with work during a pass would break more than the count, because the pass would also refuse that work and lose it. So the invariant is a property of the pass and not only of the instrument, and the count needs no mechanism of its own.
4. **The G3 mutation's form: accepted.** `{ raise: this.#gesture.raise }` is the owner's detached call, adapted to the new parameter.
5. **The G2 mutation fails by timeout: accepted.** A promise that never settles can only fail that way. The architect's repetition did not finish either (§4).
6. **The size control was already red: noted.** It moves toward its control, and its earlier movement is outside this unit. It stays red until the owner re-bases under `DRO-4`.
7. **`drag.ts` and `gesture.ts` import each other: accepted.** The import in `drag.ts` is type-only and compiles away, and lint passes. A structural type, `{ raise(error: unknown): void }`, would remove the import cycle without changing runtime. It is not required.

## 4. Verification

**Reported by the implementer, not repeated:**

- The base check passed before any edit.
- `npx just test-engines` with WebKit: 981 tests passed and 18 were skipped (Chromium 333, Firefox 324, WebKit 324).
- `npx just test`: 356 passed. Three size rows failed, and those rows also fail at the base.
- The per-sample tests passed in Chromium.
- Size at `39af0ef44`, at the base and at `fd7ae3e43`, two runs each.
- The seven mutations and their failing assertions.

**Repeated by the architect at `03d1449e2`, in the main checkout:**

- `npx just typecheck` passes.
- `npx just lint` passes on the eight changed `.ts` files.
- In Chromium, `npx just test` on `classes`, `destruction`, `release`, `terminals`, `faults`, `requests`, `verdict`, `scoped-requests` and `authoring.declaration`: 9 files and 131 tests passed.
- **The G2 mutation.** `enter`'s condition was changed to `#running || #destroyed`. Under it, `destruction` › "should settle the promise after teardown" did not finish within 200 s, and the run was killed. The source was restored with `git checkout`, and the tree was clean afterwards.

**Not repeated:** Firefox, WebKit, the per-sample test, size, and the other six mutations.

## 5. What stays open

- **The `sortable` and `freeDrag` controllers' detached guarantee.** Withdrawing it would save each built-in its two wrappers. It is the owner's choice (`DRD-34`, Rejected), and nothing here changes it.
- **Receiver support for `requestStep` and `use`, and binding helpers,** are left for a later discussion with the owner. This assessment makes no recommendation.
- **The costs.** Nothing is accepted. The red rows wait for a re-base under `DRO-4`.

**Next:** the owner inspects `fd7ae3e43`. The combined review has not started.
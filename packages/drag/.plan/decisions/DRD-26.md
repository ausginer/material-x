#### DRD-26 — A session ends itself, and a request through its `Drag` asks the session

**Status:** active, implemented at `433a0e06c` ([`ownership-report.md`](../ownership-report.md) item 2). `DRD-32` adds `apply` to the session's members on the controller

**The session owns its lifetime. It has a final state, ended, which it enters at each point where it stops being the controller's operation. A request through its `Drag`, its `Escape` and its verdict's completion read that state. The controller's `isCurrent` is removed. Deferred execution stays the controller's: a step the session accepts goes to the controller's `requestStep` as now.**

Owner requirement, 2026-11-07, on the decomposition at `bb644d6d7`. There the session asks the controller whether it is still current, in four places. That asks another object about the session's own lifetime.

**Where the session ends.** It ends at the points where the controller's slot stops holding it, in the same order:

| Path | Where the session enters ended |
| --- | --- |
| A press that never activates | In `#endPending`, after both aborts, where it detaches |
| A concluded operation without `start` | After release and the landing, where it detaches, before focus is restored |
| A concluded operation with `start` | In the terminal step, where it detaches, before `end` |
| Destruction | First in `terminate`, before motion closes and the verdict aborts, because the abort runs foreign code. Teardown clears the slot just before it calls `terminate`, with nothing between |

**Why every check keeps its result.** The slot is written only by `#open`, which fills an empty slot, by the three detaches and by teardown. At each of these four points the session enters ended with no foreign code between the two writes. So whenever foreign code runs, "the slot holds this session" and "this session hasn't ended" have the same value, and each check below gives the result it gives at `bb644d6d7`.

| Check | At `bb644d6d7` | Now |
| --- | --- | --- |
| `drag.requestStep`, `drag.requestCancel` | `isCurrent` | the session hasn't ended |
| `Escape` | `isCurrent` | the session hasn't ended |
| A verdict's completion | consumed if not current or decided | consumed if ended or decided |

**Where the checks matter.** The request checks matter whenever a `Drag` is retained after its operation (DRI-8). The `Escape` and completion checks matter only while `terminate` runs foreign code: an `abort` listener on the verdict's signal can dispatch an `Escape`, or settle a thenable that calls its callbacks synchronously. No test reaches those two cases, so the handoff adds witnesses for them.

**Three lifetimes, each with one owner:**

- **The operation's lifetime is the session's.** Its ended state decides whether a request through the `Drag` still acts, whether `Escape` applies and whether a verdict's completion is consumed.
- **Deferred execution is the controller's.** A step the session accepts goes to the controller's step list, which runs it in a pass, coalesces it by identity and drops it at destruction (DRI-8, DRI-10). The session queues nothing.
- **Release is the presentation's lifetime, and stays as it is.** `drag.signal` and a late `use` disposer depend on release (DRI-9), which comes before the end for an operation with `start`.

**A late verdict is consumed:** a completion after the end or after a decision records nothing, reports nothing and enters no pass, as now.

**`DRD-24`'s interface loses one member.** The session reaches the controller through `enter`, `raise`, `raiseInPass`, `detach`, `takeLanding`, `keepLanding` and `requestStep`. `DRD-27` then removes `takeLanding` and `keepLanding`. Everything else in `DRD-24` stands.

**Rejected:**

- **Recording a decision at destruction,** so that the decision alone covers the completion. Destruction delivers no outcome (DRI-10), and an outcome that nothing applies is a false state.
- **An `AbortController` for the operation's lifetime.** It allocates once per operation, and the phase already holds the state.
- **Ending the session at conclusion.** Then a step requested in `settle` or a disposer wouldn't run, and at `bb644d6d7` it runs before `end`, receiving `null`.
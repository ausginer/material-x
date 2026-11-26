#### DRD-24 — An operation owns its state and transitions, and the controller owns what spans operations

**Status:** active, adopted at `276947f82` under `DRO-6`. `DRD-26` removes `isCurrent` from its interface. `DRD-27` removes `takeLanding` and `keepLanding`, and the landing leaves the controller. `DRD-32` changes the gate's row, adds `apply`, and removes the three per-operation gate steps that `DRO-6` accepted. `DRD-34`: `draggable()` returns the `Gesture`, so the controller's interface for the session is reachable at runtime and named by no exported type. The session stays unreachable

**Owner requirement, 2026-11-07. The controller owns its lifetime across operations. A session owns one operation and performs it. The two talk through a small interface, and neither reads or writes the other's fields. The [prototype](../probes/session-owner/README.md) at `b54832a0e` meets this model. The owner approved its cost in `DRO-6`, and it was adopted at `276947f82`. `DRD-26` removes the `isCurrent` member from the interface below, and the fallback is no longer needed.**

Revised after reading `fbe2839c3` and the probe's candidate, which the owner applied on `drag/session-class-preview`. The earlier text decided a record passed to each step as a parameter (`6f8ea3d91`), and then defined the probe of a shared state with a read-only view (`184f430bb`). Those commits hold the superseded text.

**Prototype result, `b54832a0e`: the model meets the requirement.** The [record](../probes/session-owner/README.md) built this boundary in `src/draggable.ts` against `e06476d2b`, whose source is production's.

- **Test evidence, recorded by the implementer and not repeated by the architect:**
  - In Chromium, Firefox and WebKit, the base and the candidate fail the same two tests with no test edited. Those tests are `DRD-25`'s displacement defect.
  - `just test` adds failures of the size gate only.
  - The per-sample allocation test passes in Chromium. The scratch heap test counts one session during each operation and none after destruction.
  - Typecheck and lint pass.
- **Verified by the architect's reading, with the diff applied at `e06476d2b` in a scratch worktree:**
  - `Gesture` reaches the session only through its construction, `advance`, `decide`, `stepTarget` and `terminate`. The session reaches the controller only through `enter`, `raise`, `raiseInPass`, `isCurrent`, `detach`, `takeLanding`, `keepLanding` and `requestStep`. Every field of both classes is `#`-private.
  - `#running` is set only in `enter`. `advance` has one caller, `#applyRequests`, whose precedence is unchanged.
  - `#endPending`, both branches of `#conclude`, `#activate`'s landing and `#teardown` keep the base's order statement by statement. Each kept local stays with its comment.
  - `draggable()` returns a separate object with the four members.
  - Two checks now rest on the session's own resources instead of the slot:
    - The pointer listener no longer tests the slot, because motion is aborted before every clearing of the slot. `handleEvent`'s doc comment states this.
    - `Escape` tests `isCurrent` where the base tested the slot for non-null.
    - Both agree with the base on every path. That includes teardown, where a verdict signal's `abort` listener runs after the slot is cleared and motion is closed.
- **Adopted as built:**
  - the member names;
  - the session as its own listener through `handleEvent`, which only the platform calls;
  - `raiseInPass` as a faulted verdict's way in, while an accepted verdict records its decision and enters the gate;
  - the fixed values, copied into the session at construction.
- **No further experiment is owed.** The cost is the owner's decision in `DRO-6`. Timing is read under `DRO-4`.

**The boundary:**

- **The controller, `Gesture`,** holds what exists across operations or with no operation. That is the root, the behavior, the window and the threshold, the root's listeners, controller disposers, admission, the gate, the step list, the destruction slot, the reader, the current-operation slot and the landing. It creates a session, attaches it to the slot, clears the slot when the session asks, and tears down.
- **The session** holds one operation and makes all of its transitions. It holds the operation's `Drag` and admission, the motion and operation signals with the listeners on them, disposers, phase, decision, next step, verdict, lift, focus and release outcome. Its transitions are samples and the threshold, ending a pending press, activation, the drop, the verdict, conclusion, the terminal step, and release when destruction ends it.
- **Each side calls the other's interface below.** Everything else in each class is `#`-private.

**The interface.** This is the smallest set found by reading the kernel at `fbe2839c3`. The prototype needed nothing beyond it.

From the controller to the session:

| Member | What it does | What it replaces at `fbe2839c3` |
| --- | --- | --- |
| Construction | Opens the operation: builds its `Drag` and installs its listeners. A command operation sets its own first step, the activation | `#open`, and `#command`'s write to `next` |
| Advance | One turn of the reader for the operation. It concludes a decision that isn't applied yet, or else takes and runs the next step. It reports whether it did either | The reader's decision and next-step branches |
| Decide | Records an outcome if none is recorded. It enters no pass | `decision ??=` in `#raise` and `#cancel` |
| Step target | The `Drag` that a deferred step receives: the operation's from activation until the drop or the decision, and `null` otherwise | `#runStep`'s condition |
| Terminate | Destruction's part. It closes motion, aborts the verdict and releases with `null` | The session branch of `#teardown` |

From the session to the controller:

| Member | What it does | What it replaces at `fbe2839c3` |
| --- | --- | --- |
| The gate | Enters a pass with a stable step and its argument, or refuses | `#enter`, unchanged. It stays the only entry |
| Raise | Reports a fault, and decides the current operation if nothing has | `#raise`, unchanged. The lift receives it as now |
| Is current | Whether this session is the one in the slot | `this.#session === session` in the `Drag`'s scope checks and in the verdict's completion |
| Detach | Clears the slot. The session calls it at the three points where the base clears it | The three writes of `null` to `#session` outside teardown |
| Take and keep the landing | At activation, takes and clears the landing before the lift measures. At conclusion, stores the new one | `#activate`'s and `#conclude`'s writes to `#cancelLanding` |
| The verdict's way in | Lets a verdict that settles inside a pass be applied by that pass, and one that settles outside enter a new pass. Built as `raiseInPass` for a fault | `complete`'s read of `#running` |
| `requestStep` | The controller's public method, which a `Drag` forwards to | Unchanged |
| The fixed values | The behavior, root, window and threshold | Read only |

**The slot and the landing stay the controller's.** Only controller code writes them, and the session decides when. In the probe, the controller also decided when, and that is the difference.

**What the probe at `fbe2839c3` showed.** The [probe](../probes/session-class/README.md) is evidence about the boundary it was told to build. It is not evidence against an operation class. It kept every ordering, and its Chromium results equal the base's. It missed the owner's goal because this entry's earlier text set four restrictions:

| Restriction | What it produced | Now |
| --- | --- | --- |
| Only `Gesture` writes the slot and the landing, so only `Gesture` makes a transition that writes them | A split lifecycle. Ending a pending press, activation, conclusion with focus, the terminal step and the verdict's completion stayed in `Gesture`. Result codes from the sample step told `Gesture` which of them to run | **Withdrawn.** The controller still owns and writes them. The session calls it, inside the step that makes the transition. No step returns a code |
| Only `Gesture` enters a pass | `complete` on the shared record | **Narrowed to one gate.** The gate is the controller's `#enter`, and the session's listeners and its verdict call it. The property is one gate, not one caller |
| An interface between the two classes is the forwarding layer that CONTRIBUTING §2.2 warns against | A shared record in place of calls | **Withdrawn.** §2.2 is about generic mechanisms built to remove duplication. A fixed interface between two lifetimes is the static construction-time topology that §2.2 prefers, and each member names a controller responsibility |
| `draggable()` returns the `Gesture` instance, so a member without `#` is reachable from the controller | The interface had to be a record that the consumer can't reach | **Changed.** `draggable()` returns a separate object with exactly `requestStep`, `requestCancel`, `requestDestroy` and `use`, as `DRD-20` already requires of the built-ins. The controller's interface is then reachable only inside the module |

**Also withdrawn: the claim that under CONTRIBUTING §10 a class "would add methods, not a semantic".** An operation has a meaningful lifecycle identity, which the scope checks compare. Under the owner's boundary the class carries that identity and encapsulates the operation's state. A record whose fields `Gesture` reads does neither.

**Still rejected: moving controller state into the session.** The slot, the landing, the gate, the step list and the destruction slot exist when no operation does:

- **The slot** says whether an operation exists. Admission, `#cancel`, `#runStep` and the scope checks read it when it may be empty.
- **The landing** outlives its operation, and the next activation or destruction cancels it (DRI-13). On the session it would keep the finished operation alive until the next press, which breaks idle as absence (`DRD-1`) and `DRD-20`'s retention rule.
- **The gate, the step list and the destruction slot** also serve passes with no operation: the press that admits one, and `requestStep` or `requestDestroy` on an idle controller.

**Rejected ways for the session to reach the controller:**

- **A class nested in `Gesture`'s body,** which could use `Gesture`'s `#` names. The names would stay mangled, but the two lifetimes would read as one class again.
- **A record of closures created once per controller.** It has the same members and adds one closure for each. It gains nothing over methods once `draggable()` returns a separate object.
- **A shared state with a read-only view,** which is the probe's form. `Readonly` is shallow, and the controller still reads the session's fields.

**Required properties:**

- **One gate and one reader.** The reader's precedence stays destruction, deferred steps, the operation's decision, then its next step. The decision and the next step are applied only during the reader's turn.
- **Requests only fill slots, and only the reader applies them** (`DRD-1`).
- **The slot is cleared at the same three points as at `fbe2839c3`, in the same order.** A pending press clears it after both aborts. Without `start`, it is cleared before focus is restored. With `start`, it is cleared before `end` (DRI-8). Teardown keeps its order.
- **The landing is taken before the lift measures, and cancelled after it.** It is stored at conclusion, so a destruction applied later in the same pass cancels it (DRI-13).
- **Nothing is allocated per sample** (DRI-17). A step passed to the gate is a stable function. The development refusal count still reads the refused event (DRI-6).
- **Neither the controller object, a `Drag` nor any hook argument reaches the session or the controller's interface.**
- **A local that captures a value before its field is cleared or replaced stays, with its comment.** Removing locals is not a goal, and `using` is not introduced.
- **The tests and the public types don't change.** Adoption lands as its own behavior-preserving commit.

**Fallback.** If the owner declines `DRO-6`, `Session` stays a record. `#move` and `#up` then receive the session that `#onPointer` tested, and no `this.#session!` remains. [`composition-handoff.md`](../composition-handoff.md) §1a states this form.

**The implementer's safety explanation was checked and is correct.** At `3084191bb`, nothing between the reads of `this.#session` in `#onPointer`, `#move` and `#up` can clear or replace the field, so no assertion fails. But each assertion depends on an invariant of the whole class, which its read site doesn't show. Both forms remove the assertions. In the class form, the session's methods have the operation as `this`. The commit's other inlinings, in `lift.ts`, `sortable.ts`, `free-drag.ts` and the helpers, read fields that nothing writes between the reads, so they preserve behavior.

**Reconciled:**

- **`DRD-1`:** one session object, with idle as its absence. A class instance is that object, and the gate and the reader stay in the controller.
- **`DRD-16`:** the scope check still compares with the slot. The session asks the controller.
- **`DRD-20`:** its sentence "`Gesture` stays the only class that holds a session" becomes: `Gesture` is the only class that holds the current session, and the session class is the operation. `DRD-20` said that a way for an operation class to reach controller state without forwarding would reopen the question. The owner's requirement reopened it, and the interface above answers it. `DRD-20`'s other rules apply to the session class: stable identities for every function passed out, no `bind` at a call site, and nothing retained after destruction.
- **The contract doesn't change.** The members of `DraggableController` stay. The contract already forbids a behavior to reach the session, and no entry says the controller is the `Gesture` instance.

**Size and allocation: `DRO-6`, the owner's.** The prototype adds 103 B Brotli to `draggable` alone, and three functions to each operation. Interface names, which the minifier can't shorten, account for 439 B of the minified growth. The record fields they replaced, which were also unmangled, save 612 B. No timing was taken. `DRO-4`'s reading includes it, under `DRD-22`'s rules.
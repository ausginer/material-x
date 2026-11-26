#### DRD-32 — Input enters the gate with its handler, and requests through one named entry

**Status:** active, decided on 2026-11-08 on the owner's approval of v3, from [`execution-boundary-assessment.md`](../execution-boundary-assessment.md), with its cost in `DRO-9`. Amends `DRD-1`, `DRD-24`, `DRD-26`, `DRO-6`'s accepted functions and the contract's DRI-6. Implemented at `a8327a7c8` from `8943f14e5`. Reported in [`execution-boundary-report.md`](../execution-boundary-report.md), with every row inside `DRO-9`. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-34` merges the input gate and the request entry into one shared pass that receives internal work with its receiver, removes `InputHandler`, `apply()` and `#run`, makes `raise` a method, and withdraws the rejection of a receiver argument. `DRF-20`, open since 2026-11-10, says that its reason for keeping an idle step off the list no longer holds. The rule stands. `DRF-20` closed on 2026-11-12: the owner kept the idle branch (`DRO-14` item 3), whose reason is now the work it saves per idle request

**`Gesture.enter(handler, event)` takes input only, and calls the handler's `handleInput(event)` as the pass's first step. A request fills its slot and calls `apply()`, which applies it now unless a pass is running. A step requested while idle, `apply()` and a verdict's fault share one private pass. Its optional first step is a function only where the work is one already: the consumer's step, or `raise`. The reader applies every request, including destruction requested while idle. Development builds count each refused event once. Pass execution stays the controller's.**

Decided on 2026-11-08 on the owner's approval of v3 from [`execution-boundary-assessment.md`](../execution-boundary-assessment.md) §3, with its reported cost (`DRO-9`) and counting each refused event once. The prototype is [`probes/execution-boundary/`](../probes/execution-boundary/README.md).

**Why.** The owner asked whether preventing nested passes and applying deferred requests deserve a separate owner, because `enter(fn, argument)` made `Gesture` and `Session` hand internal work to the gate as functions.

- **No separate owner.** The gate's state has the controller's lifetime, and its reader is where destruction, the deferred steps and the operation's decision meet. A separate owner would need a two-way interface with `Gesture` and wouldn't change how work is passed in (assessment §2).
- **The signature was the gap.** One `enter(fn, argument)` served four kinds of entry. So internal work had to be arrow fields, "no work" needed `NOOP`, "refused" meant "lost" for input and "deferred" for a request, and destruction requested while idle was applied outside the reader (assessment §1).

**The required properties,** G1 to G8 of the assessment's §3:

- **Input:** one gate, `enter(handler, event)`. A running pass or a closed controller refuses it. A throw from the work is a fault, the reader follows, and the gate reopens in `finally`.
- **`Gesture` and `Session` are each the platform's listener object and the gate's handler.** `handleEvent` runs outside a pass: it filters, and it turns `Escape`, `pointercancel` and `lostpointercapture` into requests. `handleInput` runs inside the pass and dispatches on `event.type` to private methods.
- **Requests:** `requestCancel`, the session's cancel, a verdict's acceptance and `requestDestroy` fill their slots and call `apply()`. It refuses nothing and counts nothing.
- **A step requested while idle is the first step of its own pass, and never enters the list.** Through the list it allocated on every sample (assessment §3, G4).
- **A verdict's fault** is raised at once in a running pass, and is otherwise the first step of a new pass.
- **One private pass** serves idle steps, requests and faults. `#running` is set there and in the input gate, and nowhere else.
- **The reader is unchanged:** its precedence, its catch on each turn, and a step's argument computed when the step runs.
- **The development count counts each refused event once.** A nested primary press during `activate` or `start` reaches the session's pending-press listener and the root's listener. It counts once, through a set that exists only in development builds.

**What this amends:**

- **`DRD-24`'s interface table.** From the session to the controller, the gate's row becomes "the input gate: `enter(handler, event)` runs the handler's `handleInput` as the first step of a new pass, or refuses". A row is added for `apply()`, which applies the requests now unless a pass is running and replaces `enter(NOOP, null)`. The handler interface has one method, in method syntax, and stays inside the kernel. Its required property "a step passed to the gate is a stable function" becomes: the gate receives no function for input, and the only function that opens a pass is the consumer's step or `raise`.
- **`DRD-26`'s member list.** The session reaches the controller through `enter`, `apply`, `raise`, `raiseInPass`, `detach` and `requestStep`.
- **`DRD-1`.** One reader applies every request, including destruction requested while idle, which used to tear down outside the reader.
- **`DRO-6`'s accepted cost.** The three functions per operation, `#move`, `#up` and `#endPending`, are no longer created.
- **The contract's `DRI-6`:** development builds count each event a running pass refuses once.

**Unchanged:** the public types, `DraggableController`, every other contract entry, the reader's precedence, and `raise` as an arrow field, because `runDragDisposer` receives it detached.

**Rejected,** in the assessment's §2 and §6: a separate pass owner, a receiver argument `enter(step, receiver, argument)`, a bracket at each call site, running all of `handleEvent` inside the gate, an idle step through the list, and four explicit brackets.

**Implementation.** One unit, recipient `implementer`, **based on `8943f14e5`** on `drag/production`.

- **v3's diff was written against `ef8c6cd96` and doesn't apply verbatim at `8943f14e5`.** That commit already makes `Gesture` the root's listener object: its `handleEvent` dispatches on `event.type` to `enter(this.#press, …)` and `enter(this.#command, …)`. The unit ports v3's properties onto it, and the dispatch belongs in `handleInput`.
- **One commit, with no test edited.**
- **Checks:** the suite in Chromium, Firefox and WebKit, the per-sample test, typecheck, and the handoff loop on each changed file.
- **Mutations,** each run, shown to fail, reverted and not committed, as the assessment's §7 lists: an idle step through the list, no per-event set in the count, `apply` refusing on a closed controller, and `enter` not refusing during a pass.
- **A report,** `execution-boundary-report.md`, with the diff, each mutation's failing assertion, and size and allocation at `8943f14e5` and after the commit, against `DRO-9`'s figures.
- **Not authorized:** timing, a re-based ceiling, or any test or instrument edit beyond the counting change.

The `unbound-method` gap in the assessment's §1, point 5, is a repository instrument question, and it isn't part of this unit.
#### DRD-34 — `draggable` returns its `Gesture`, and one pass serves every entry

**Status:** active, decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit on `39af0ef44` ([`owner-edit.diff.txt`](../probes/gesture-receiver/owner-edit.diff.txt)). Amends `DRD-20`, `DRD-24`, `DRD-32` and the contract's public surface. Implemented at `fd7ae3e43` from [`gesture-receiver-handoff.md`](../gesture-receiver-handoff.md), reported at `03d1449e2` ([report](../gesture-receiver-report.md)). Read by the architect at `03d1449e2` ([assessment](../gesture-receiver-assessment.md)): conforms. Its costs are reported and not accepted. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-35` amends its properties 6, 8 and 9 and supersedes its exclusion of receiver support. `DRD-37` supersedes its property 9. **Amended on 2026-11-14 by `DRD-63`:** property 8, for `sortable`'s `invalidate` step

**`DraggableController`'s members are methods, and a caller calls them on the controller. `draggable` returns its `Gesture` typed as `DraggableController`. One private pass implementation serves input, requests, a step requested while idle and a verdict's fault, and internal work enters it with its receiver. The `sortable` and `freeDrag` controllers, `Lifter.cancelLanding`, steps and disposers keep their current calling rules.**

Decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit to `src/draggable.ts`, `src/free-drag.ts`, `src/free-drag/behavior.ts`, `src/kernel/gesture.ts` and `src/lift.ts` on `39af0ef44`. The architect read that edit and saved it as [`owner-edit.diff.txt`](../probes/gesture-receiver/owner-edit.diff.txt) (SHA-256 `b65152c5…aed53`). Its typecheck output is [`typecheck.txt`](../probes/gesture-receiver/typecheck.txt). [`gesture-receiver-handoff.md`](../gesture-receiver-handoff.md) completes the edit.

**The owner's direction:**

- **The detached-call guarantee for `DraggableController` is withdrawn.** Its methods may require the controller as their receiver.
- **`draggable` may return the `Gesture` through that interface.** It no longer builds a separate record.
- **Keep the intent to share one pass implementation.** At `39af0ef44`, `enter` and the private `#run` each contain the same bracket: they set `#running`, run a first step whose throw is a fault, run the reader, and clear `#running` in `finally`.
- **Not in this decision:** receiver support for `requestStep` or `use`, automatic binding helpers, and any other change to how callbacks are represented. Existing call sites keep working without them.

**Required properties:**

1. **The public type.** `DraggableController`'s four members are declared as methods, as CONTRIBUTING's TypeScript section requires for a member that depends on its receiver. The JSDoc tells the caller to call them on the controller. No exported type names another `Gesture` member.
2. **What `draggable` returns.** It returns the `Gesture` instance. At runtime that object also has the members that the session calls. Only `Session` calls them, and calling them from consumer code is outside the contract (CONTRIBUTING §1.1). The session stays unreachable from the controller object, because `#session` is private.
3. **One pass implementation.** `#running` is set in one place. The bracket is written once, and every kind of entry runs through it:
   - **Input:** `Gesture`'s press and command, and `Session`'s sample, release and the primary press that ends a pending press. The work is a private method of the class that receives the event, and the pass calls it with that object as its receiver. No arrow field and no function per operation is created for this.
   - **A request that filled its slot:** `requestCancel`, the session's cancel, a verdict's acceptance and `requestDestroy`. It opens a pass with no first step when no pass is running. A running pass's reader applies it.
   - **A step requested while idle:** the first step of its own pass. It never enters the list (`DRD-32`, DRI-17).
   - **A verdict's fault while idle:** `raise` is the first step of a new pass, called on the controller.
4. **Refusal applies to input only.** A running pass refuses input, and that input is lost (DRI-6). After teardown, input is refused. **A request is never lost.** `requestDestroy` on an idle controller opens the pass whose reader tears it down. The controller being closed by that same request must not refuse it.
5. **The development count** counts each refused input event once, including a nested press that the session's listener and the root's listener both refuse (`DRD-32`, DRI-6). It counts no request and no step argument.
6. **A consumer's step is called with no receiver,** both as the first step of an idle pass and from the list. No step, `Drag` member, hook argument or disposer receives the controller or the session as `this`.
7. **Fault reports reach `raise` on the controller.** Wherever a disposer runs, a throw is reported once through `raise` called on the controller, and the walk continues to the next disposer (DRI-7, DRI-9, DRI-10). No function is created per disposer call or per report for this.
8. **Unchanged calling rules:**
   - **The `sortable` and `freeDrag` controllers** keep their members as function-type properties that work when detached. `requestCancel` passes its `reason` to the kernel unchanged.
   - **A step passed by identity stays one stable function** that works with no receiver. That includes `sortable`'s and `freeDrag`'s `invalidate` steps, so that DRI-8's coalescing by identity still holds.
   - **`Lifter.cancelLanding`** works when detached, as the contract's public surface says. It is passed to `use` as it is now.
9. **Lint.** No file-wide `unbound-method` suppression. At most one line-scoped suppression is allowed, with its reason, at the site that passes `raise` to the pass together with the controller as its receiver.
10. **Every other guarantee holds:** DRI-1 to DRI-10, DRI-17 and DRI-18, the reader's precedence, and `requestDestroy`'s one promise by identity. The per-sample test still passes.

**What this amends:**

- **`DRD-20`.** Its bullet "Controller methods don't depend on `this`" now applies to the `sortable` and `freeDrag` controllers. `draggable`'s controller is the `Gesture` instance, and its methods take it as their receiver. "The returned object is not the instance" now applies only to the built-ins' controllers.
- **`DRD-24`.** In the table of withdrawn restrictions, `draggable()` returns the `Gesture` instead of a separate object, so the controller's interface for the session is reachable at runtime and named by no exported type. The required property "Neither the controller object, a `Drag` nor any hook argument reaches the session or the controller's interface" now reads: no `Drag`, hook argument or step receiver reaches the session or the controller. The controller object reaches the controller's interface only at runtime. The session class itself stays unreachable.
- **`DRD-32`.** The input gate and the request entry become one entry into one shared pass. Internal work is passed as the caller's private method together with its receiver. That replaces `enter(handler, event)`, the `InputHandler` interface with `handleInput`, `apply()` and `#run`. **The rejection of "a receiver argument" in `DRD-32` and in the assessment's §6 is withdrawn,** on the owner's direction:
  - "One signature for four kinds of entry." Properties 3 to 5 now state each kind's rule.
  - "Binding by hand at every call site." Accepted for internal work. The work stays a method with no arrow field, which was `DRD-32`'s goal.
  - "The lint can't check private methods." Accepted: the receiver is passed at the call, so a private method passed this way is correct.

  `DRD-32`'s other properties stand. Its "`raise` as an arrow field" is withdrawn: `raise` is a method (property 7).

- **The contract's public surface.** "No controller method depends on `this`" is replaced (see its change record).

**Rejected:**

- **Keeping `raise` and the four controller members as arrow fields** next to prototype methods. The owner's direction is that the controller's methods take it as their receiver.
- **Extending the withdrawal to the `sortable` and `freeDrag` controllers, and to `cancelLanding`, in this decision.** The owner named `DraggableController`. Each built-in pays two closures per controller to keep its detached members (`requestCancel` and `requestDestroy`). Withdrawing that guarantee too would save them, and it is a separate decision for the owner.
- **A wrapper closure per call around `invalidate`.** It would break coalescing by identity under DRI-8.

**Cost.** By reading, a controller creates 5 fewer functions: the four public arrow fields and `raise`. `draggable` creates no separate record, and each built-in creates 2 closures. Nothing changes per operation or per sample. The owner has approved no size figure for this decision. The handoff measures each composition at `39af0ef44` and after the change, and reports the difference without re-basing.

**Amended 2026-11-09 by `DRD-35`.** Properties 6, 8 and 9 and the "Not in this decision" bullet are amended there. The text above is unchanged.

**Amended 2026-11-14 by `DRD-63`.** Property 8: `sortable`'s `invalidate` step is a method passed with its behavior as the receiver, and it declares `this`. `freeDrag`'s step keeps its form. The text above is unchanged.
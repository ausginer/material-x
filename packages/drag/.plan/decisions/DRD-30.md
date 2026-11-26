#### DRD-30 — `activate` returns the behavior's operation

**Status:** active, decided on 2026-11-08 on the owner's proposal. Implemented at `da139407e` and `3a67df0ea` ([report](../activation-result-report.md)). Read by the architect at `d99ebd304` ([assessment](../activation-result-assessment.md)): conforms. Amended the same day: the behavior keeps no operation state, the operation may keep its behavior, and the type-argument rule. [`activation-result-assessment.md`](../activation-result-assessment.md) §6 implements the amendment, with `DRF-4`. Amends `DRD-2`, `DRD-6`, `DRD-11`, `DRD-20`, `DRD-27`, and the contract's vocabulary, public surface, DRI-3, DRI-8, DRI-9 and DRI-18. Replaces [`operation-lifetime-assessment.md`](../operation-lifetime-assessment.md) §2

**`Behavior` keeps what lasts as long as its controller: `threshold`, `admit`, `command` and `activate`. `activate(drag, state)` returns a `BehaviorOperation`, which holds the hooks `start`, `move`, `drop`, `settle` and `end` for that operation, or `null` to decline. The kernel keeps the operation `activate` returned, calls those hooks on it, and gives it to steps. The `Drag` loses `state`. The kernel names no lift and no behavior resource. `sortable` and `freeDrag` implement `SortableOperation` and `FreeDragOperation`.**

Decided on 2026-11-08 on the owner's proposal. It replaces [`operation-lifetime-assessment.md`](../operation-lifetime-assessment.md) §2, where each hook forwarded through one nullable operation reference with an assertion. **The owner's terms:** nothing is published, so a public authoring change is allowed and compatibility is no reason to keep the current shape. The kernel stays independent of the lift and of behavior resources. The behavior need not acquire every resource or pass every resource to a constructor.

**Why it fits.** At `f40c32f32`, 16 of the 23 non-null assertions in the built-ins read a value that exists exactly from the end of a successful `activate` to the release (assessment §2). The kernel already runs `start` to `end` and gives a step its target only in that interval. A return value from `activate` is the type of that interval. The behavior never needs the operation outside it, so neither side holds a nullable reference to it.

**The contract.** Type parameters are illustrative. The implementer may arrange them differently if inference needs it, and reports why:

```ts
type Behavior<State, Verdict, Operation extends BehaviorOperation<Verdict>> = {
  threshold?: number;
  admit(event: PointerEvent): Admission<State> | null;
  command?(event: KeyboardEvent): Admission<State> | null;
  /** `null` declines quietly. A throw is a fault. Neither gets `start`. */
  activate(drag: Drag<Operation>, state: State): Operation | null;
};

type BehaviorOperation<Verdict> = {
  start?(): void;
  move?(): void;
  drop?(): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  settle?(outcome: Outcome<Verdict>): void;
  end?(outcome: Outcome<Verdict>): void;
};

type Drag<Operation> = {
  item: HTMLElement;
  pointerId: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  signal: AbortSignal;
  use(dispose: DragDisposer): void;
  requestStep(step: (operation: Operation | null) => void): void;
  requestCancel(reason?: unknown): void;
};

type DraggableController<Operation> = {
  requestStep(step: (operation: Operation | null) => void): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
  use(dispose: () => void): void;
};
```

- **`Admission` is unchanged.** Its `state` is passed to `activate` by identity, and the kernel never reads it.
- **`activate` is required,** because without it no operation exists.
- **The operation's hooks take no `Drag`.** An operation that needs the `Drag` keeps it from `activate`.
- **A step receives the operation `activate` returned,** from the end of activation until the drop or the decision, and `null` otherwise. This holds through the controller and through a `Drag`.
- **`draggable.js` also exports the type `BehaviorOperation`.** `lift.js` is unchanged.

**The lifecycle.** Every row keeps the order the kernel has at `f40c32f32`. Only where a hook lives changes.

| Case | What happens |
| --- | --- |
| Item disconnected at activation | `activate` isn't called. The operation is skipped quietly, as now |
| `activate` returns `null` | Skipped, unless a decision was already recorded, which then stands. No `start`, `settle` or `end`. The disposers `activate` registered run at release with the outcome |
| `activate` throws | A fault, unless a decision was already recorded. Released as above. An operation constructed before the throw never reaches the kernel |
| Partial acquisition | Each resource's release is registered with `drag.use` when that resource is acquired, before the next acquisition. Either `activate` or the operation's constructor may do this. The kernel never calls the operation to clean up. `BehaviorOperation` has no release member |
| A step requested during `activate` | Deferred. It runs after the step that called `activate`, and receives the returned operation if that operation is then active and undecided |
| A cancel during `activate` | Recorded. If `activate` returns an operation, `start` still runs, then `settle` and `end` with the cancel, as now |
| Destruction during `activate` | Applied after that step. `start` has run, and `settle` and `end` don't run (DRI-10) |
| Verdict | `drop` returns it, and the operation's `settle` and `end` receive its outcome. A completion behind a decision or after the end reaches nothing |
| After release | `end` runs as the next step, after every disposer. So the operation's resources are already released, and `end` uses only the outcome and its own values. A disposer added after release runs at once |

**Kernel requirements:**

- **One gate, one reader, its precedence, the three points where the slot is cleared, and DRI-9's order all stay** (`DRD-1`, `DRD-24`, `DRD-26`).
- **The session keeps the operation from `activate`'s return.** "`start` was reached" is the same as holding it. So the reference may replace `#started`, and no field holds both.
- **No new non-null assertion or cast in the kernel.** Where a phase test now guards a hook call, it may become a test of the reference only where the two agree. The report gives the argument for each such site.
- **Hooks are called as methods,** read when called: `admit`, `command` and `activate` on the behavior, and the rest on the operation.
- **Nothing per sample:** `move` is called with no argument. DRI-17 holds.
- **The admission's `state` is kept by the session until `activate`.** The kernel's one cast, `as State`, moves with it.
- `grep -rniE 'lift|landing' src/kernel src/draggable.ts` stays empty.

**The built-ins:**

- **Two classes in each built-in, both module-private.**
  - The behavior, `FreeDragBehavior` or `SortableBehavior`, keeps the controller-lifetime values that `DRD-20` lists, and admits and activates.
  - The operation, `FreeDragOperation` or `SortableOperation`, owns one activated operation: its `Drag`, its `Lift`, its resources, its transitions and its steps.
  - No base class is shared (`DRD-20`).
- **`activate` acquires the lift as its first statement** (`DRD-27`). In `sortable` it then pulls again and declines with `null`, before any operation exists.
  - The remaining resources may be acquired in `activate` or in the operation's constructor, in the order they have at `f40c32f32`, statement by statement.
  - That order is the placeholder and its removal, its insertion and check, the frame task and its cancel, the axis retirement, the invalidation listener, and then the axis invalidation.
- **No activation resource is nullable.** `insertion` isn't either. `request` may stay nullable, because a cancel before the drop has none. Whether `result` stays a field or is built in `end` is the implementer's choice.
- **The admission's `state` holds only what `activate` needs from the press:**
  - `freeDrag`: the visual, which needs no object;
  - `sortable`: the visual, the box and the direction. The admission's snapshot isn't kept, because activation pulls again.
- **Function identities follow `DRD-20`.**
  - Controller steps such as `invalidate` stay one per controller, and receive the operation or `null`.
  - A step or callback that belongs to the operation is created once per operation.
  - `moveTo` stays one step per call (`DRD-25`).
- **The operation doesn't own controller-lifetime state.** It receives the references it uses at construction. `sortable`'s collection version stays on the behavior.
- **Amended on 2026-11-08 at `d99ebd304`** ([assessment](../activation-result-assessment.md) §2):
  - **The behavior keeps no state of an operation's.** A scratch buffer belongs to the object whose work writes it. The behavior keeps scratch only for its own admission and activation, and an operation writes no member of its behavior. `FreeDragOperation` owns its motion, as a private `{ x, y }` field.
  - **The operation may keep its behavior** and read, through it, configuration and collaborators that last as long as the controller. Each such member is `readonly`. No behavior member refers to an operation.
  - **Type arguments.** A class instance infers its operation. A literal behavior names `draggable`'s type arguments when its steps read its operation's own members or its hooks need the verdict's type. That is because a literal's unannotated `activate` fixes the operation type before its return is read, and the verdict occurs only in the operation's constraint. No type-parameter redesign is decided (assessment §4).
- **`SortableOperation` may serve as the `AxisQuery` and the `AxisContext`,** which would remove the context literal. That needs `AxisContext`'s internal `settle` member renamed, because it would collide with the hook. The implementer chooses, and reports the allocation either way.
- **Option callbacks receive what they receive now** (`DRD-25`).

**Changes a consumer sees:**

- the hooks after activation move to the operation that `activate` returns;
- `activate` is required, receives the admission's `state` and declines with `null`;
- `Drag` has no `state`, and a step receives the operation;
- `BehaviorOperation` is exported.

The built-ins' options and controllers don't change.

**Rejected:**

- **One nullable operation reference in `state`, with an assertion in each hook** (assessment §2). The owner's proposal removes both.
- **Hooks that also receive the `Drag`.** That gives each hook two ways to reach the same values, and typing the `Drag` inside a hook needs a self-referential type. It would let a behavior share one operation across activations. Without it, a behavior whose hooks need the `Drag` allocates its operation each activation. That cost is reported.
- **Keeping `drag.state`.** Only `activate` reads it. After activation it would be a second per-operation record beside the operation.
- **Steps that receive the `Drag`.** A controller step such as `invalidate` or `moveTo` would then reach the operation only through a field on `state`, which is the nullable forward this decision removes.
- **Different targets for a step through a `Drag` and one through the controller.** The step list would need a tag, which `DRD-6` excludes.
- **A release hook on the operation.** `drag.use` already orders every release, including a failed acquisition's. A second mechanism would split that order.
- **Any knowledge of the lift or of a behavior's resources in the kernel.**

**Costs: `DRO-8`.** None is accepted here, and timing stays deferred. **Before implementation:** the `DRF-3` repair ([`operation-lifetime-assessment.md`](../operation-lifetime-assessment.md) §3), as its own unit. [`activation-result-handoff.md`](../activation-result-handoff.md) implements this decision.
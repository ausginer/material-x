#### DRD-33 — Capability slots extend the built-ins and the lift

**Status:** active, decided on 2026-11-09 on the owner's acceptance of the slot model, from [`feature-composition-assessment.md`](../feature-composition-assessment.md), with the slot's charge in `DRO-10`. Amends `DRD-2` in place, `DRD-27`, `DRD-28`, `DRD-29`, and the contract's vocabulary, public surface, DRI-9, DRI-13, DRI-17, DRI-18 and DRI-20, and adds DRI-21. Repairs `DRF-5`. Implemented at `8626b04fd`, `59cc79e74`, `bfc2bfb0e` and `11950690f` from [`feature-composition-handoff.md`](../feature-composition-handoff.md), and reported at `0bb03f3ea` ([report](../feature-composition-report.md)). The `targets` slot's +78 B and +59 B are above `DRO-10`'s 45 B and wait for the owner. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-52` amends choice 9. **Choice 9 amended on 2026-11-13 by `DRD-61`:** reads return one value, and no write leaves the class

**A host, which is `freeDrag`, `sortable` or the lift, declares a closed set of named, typed slots. A capability is a value imported on its own that fills one slot, and it meets C1 to C10 below. The landing animation leaves the lift and becomes the `Landing` capability, which `land` requires. `freeDrag` gains the `targets` slot, which `dropTargets()` fills. Its state for one operation is an object that operation holds. `freeDrag` invalidates its `bounds` at each activation. The kernel doesn't change.**

Decided on 2026-11-09, on the owner's acceptance of closed, named slots for v1, with a whole behavior as the fallback (`DRO-10`). The reading, the alternatives and the evidence are in [`feature-composition-assessment.md`](../feature-composition-assessment.md), and the revised prototype is [`probes/feature-composition/`](../probes/feature-composition/README.md) at `5cf267d6d`. **The owner's terms:** a lift without its landing animation, and drag and drop added to `freeDrag` with nothing charged to a composition that omits it beyond the slot's call sites. The terms also keep:

- one configuration reused across controllers;
- the single pass, the separation of requests from their effects, and resource ownership;
- CONTRIBUTING's class-encapsulation rule;
- the owner's closure-based `layoutAnimation`;
- no runtime readonly enforcement.

**Required properties of every capability and slot:**

|  | Property |
| --- | --- |
| C1 | **Closed slots.** A host declares each slot by name and type. One value fills a slot. There is no list of extensions, no registry, no runtime discriminator and no merge. A new slot is a library decision |
| C2 | **A slot value holds no controller or operation state.** It is one of three things: a stateless value, such as `landing()`; an installer that the host calls once per controller, such as `bounds()`; or a factory that the host calls once per operation, such as `dropTargets()`. So one configuration serves any number of controllers |
| C3 | **Inert installation.** An installer allocates. It attaches no listener, writes no DOM and acquires nothing that needs release. A per-operation factory acquires only what that operation releases (C4) |
| C4 | **Ownership by lifetime.** See below |
| C5 | **Single pass.** A capability's code runs only when its host calls it from a hook or a step, or in a step it requested through the operation's `requestStep`. It never opens a pass, listens for input or calls the gate |
| C6 | **Requests and effects.** A capability's foreign callback, such as a frame, only requests a step, and its effect runs in that step (DRI-8). **One exception:** a scroll or resize listener may set a staleness flag directly. A staleness flag only makes the next read measure again, so nothing observes the write before that read |
| C7 | **Tree-shaking.** The host names only the slot's type. A capability's code reaches a bundle only through the consumer's import. A composition that omits it pays only the host's call sites. Each new slot's call-site cost is measured and is the owner's to accept |
| C8 | **The hot path.** A capability reads no layout on a sample, and coalesces any spatial search to a frame (DRI-17). It allocates nothing per sample |
| C9 | **Types grant, and nothing enforces.** A capability receives the operation's `Drag` narrowed by type, such as `Pick<Drag, 'x' \| 'y' \| 'use' \| 'requestStep'>`. Nothing wraps or freezes it at runtime |
| C10 | **The kernel doesn't change.** `draggable alone` stays byte-identical |

**C4, ownership by lifetime.** It separates what an operation must release from what a controller may keep and reuse.

- **Operation references and resources are released with the operation.**
  - An operation reference is the operation, its `Drag` or its `Lift`, or an element pulled from the consumer for that operation, such as `items()` or `targets()`.
  - A resource is anything that needs release, such as a listener, a frame request, an animation, a placeholder, or an attribute or inline style the library wrote.
  - Each resource is released by a disposer registered with the operation's `drag.use` when it is acquired. When a capability calls consumer code after acquiring something, the release of that thing is registered before the call. So a throw from consumer code faults the operation under DRI-7, and the operation's release frees what was acquired.
  - **A controller-lifetime runtime never holds the operation, its `Drag` or its `Lift`.** It may hold an operation's elements only while that operation runs. The operation's release drops them, as `sortable`'s axis retirement empties its element array. It never keeps an operation's reference in a field that is `null` between operations and read with a non-null assertion.
  - A per-operation object, such as the drop-target tracker, may hold any of these. It becomes unreachable with its operation, and its release disposes its resources.
- **Reusable geometry caches are invalidated, not discarded.**
  - Numeric state derived from layout may live as long as the controller and be reused by later operations without being discarded, zeroed or reallocated. Examples are buffers, boxes, distances and staleness flags, such as `RectIndex`'s `Float64Array` and `bounds`' box.
  - What such a cache owes is validity. **No operation uses a value that was measured before that operation activated.** So the host invalidates the cache at activation, as `sortable` does for its axis, and the invalidation listener invalidates it during the operation.
  - Invalidating only marks the cache stale, and it releases nothing. Discarding or resetting numeric state at release is allowed and never required.
- **How a capability receives operation state.** Either the host passes it as arguments, as `sortable`'s axis receives its query and context, or the operation holds an object the capability created for it, as with `dropTargets`.
- **A controller-lifetime runtime that holds a resource** is disposed through the controller's `use`, registered in the factory that installed it (`DRD-25`).

**The landing capability:**

- **`Landing` is `{ timing, start }`.**
  - `timing(fromX, fromY, toX, toY)` returns `{ duration, easing }`, as `LandingTiming` did.
  - `start(visual, visualSpace, dx, dy, duration, easing, window)` starts the animation and returns its cancel, or `null` when nothing animates.
  - `landing(options)` returns one. Its `start` is the animation that `lift.ts` held: additive flight, separate elevation, and zero duration under reduced motion. It returns a new object per call, and holds no state.
- **`Lift.land(x, y, landing)` requires its `Landing`.** It calls `landing.timing` once and copies `duration` and `easing`. It keeps the `Landing` value, which is configuration under C2, and keeps no object that `timing` returned. When `timing` throws, nothing is recorded. The last call wins, and without a call nothing lands.
- **The lift's release disposer calls the recorded `Landing`'s `start` right after the release,** with the offset of the visual from where it lands, read at release as now. The `Lifter` keeps the returned cancel. Its next `acquire`, after measuring, and its `cancelLanding` both cancel it, as now.
- **The lift holds no animation code, no elevation constant and no default timing.** A lifted composition that composes no landing carries none of them.
- The built-ins pass `config.landing` as before, and call `land` only when a landing is composed.
- Custom behaviors import `landing` from `lift/landing.js`, as `free-drag/landing.js` and `sortable/landing.js` re-export it.

**The drop-target capability:**

- **`dropTargets({ targets })`** returns a `DropTargets`, `(drag: DropTargetDrag, window: Window) => DropTargetTracker`.
- **`freeDrag`'s `activate` calls it once per operation,** after acquiring the lift. The `FreeDragOperation` holds the tracker in a read-only private field, and nothing else holds it. `FreeDragBehavior` gains no field.
- **The factory runs in this order:**
  1. it allocates its state and the frame task, neither of which acquires anything;
  2. it registers its release with `drag.use`. The release cancels the frame and removes the mark;
  3. it pulls the consumer's `targets()`.
- **The tracker:**
  - `move()` only schedules the frame;
  - the frame's callback only requests a step, and the step measures the targets when stale, hit-tests `drag.x` and `drag.y` against the cached rects, and moves the `data-drop-over` mark;
  - `drop()` cancels the frame and resolves at once;
  - `invalidate()` sets the staleness flag;
  - `current` is the marked target, or `null`.
- **Invalidation reaches the operation.** The scroll and resize listener is the `FreeDragOperation`, through a `handleEvent` method that invalidates the bounds and the tracker. It is registered when `bounds` or `targets` is configured. The behavior's `invalidate` step receives the current operation under DRI-8, and reaches the operation's `handleEvent` as well as the bounds.
- **`FreeDragRequest.target`** is `HTMLElement | null`, so `onDrop` and `onEnd`'s result carry it. It is `null` without the capability.

**The `bounds` repair (`DRF-5`).** `freeDrag`'s `activate` invalidates `bounds` before its first read in the operation. That is C4 applied to an existing controller-lifetime cache. `bounds` holds no operation reference, so it needs no retirement.

**Settled here,** from the assessment's §9, so that none goes to the owner:

- **Choice 2, where custom behaviors import `landing`:** `lift/landing.js`. It follows the pattern of the two existing landing entries, and keeps `lift.js` a one-value entry.
- **Choice 3, `land` without a landing:** the argument is required. Without a call nothing lands, so an optional argument would be a second way to say the same thing. `DRD-29` already rejected two argument forms.
- **Choice 4, how a target is shown:** the `data-drop-over` attribute only, whose release the capability owns. A consumer callback would run consumer code once per frame, and its cleanup would be the consumer's. One can be added later without breaking anything. A third party that needs another presentation fills the slot with its own tracker.
- **Choice 6, how the targets' staleness is set:** directly, as `bounds` does, under C6's exception. A step per scroll event cost bytes on every composition in the first draft.
- **Choice 7, a scroll with the pointer still:** the mark is updated at the next sample, as `sortable`'s insertion is. A sample does no work without movement (DRI-17). **The drop is always correct:** `drop()` resolves at the release position and measures again after any invalidation. **Amended on 2026-11-12 by `DRD-48`:** the drop marks the targets and the bounds stale before it resolves, so it measures every target again. Measuring only after an invalidation missed a scroll whose event hadn't arrived (`DRF-22`).
- **Choice 8, published slot interfaces:** `Landing`, `LandingOptions` and `LandingTimingContext` from each landing entry. `DropTargets`, `DropTargetTracker`, `DropTargetDrag` and `DropTargetsOptions` from `free-drag/drop-targets.js`. `bounds.js` keeps exporting its types as now. The `axis` and `displacement` interfaces stay private (`DRD-2`).
- **Choice 9, `RectIndex`:** private fields read through getters typed as read-only views, as measured in [`rect-index.diff.txt`](../probes/feature-composition/rect-index.diff.txt). CONTRIBUTING's class-encapsulation rule requires the change, and this is the form chosen. A closure is also allowed, but a class keeps the development check's access in one declaration. **Amended 2026-11-12 by `DRD-52`:** writes leave the class only through `lend`, which is scoped to one call and one slot range. **Amended 2026-11-13 by `DRD-61`:** no getter returns a view. Code outside reads one value at a time through `at`, `item` and `insertion`, and no write leaves the class. It used to say that the private fields are read through getters typed as read-only views, and that writes leave only through `lend`.
- **Choice 10, names:** `targets`, `free-drag/drop-targets.js`, `dropTargets`, `target`, `data-drop-over`, `DropTargets`, `DropTargetTracker`, `DropTargetDrag` and `DropTargetsOptions`, as prototyped. They may change only for clarity.

**Returned to the owner:** choice 5, an accepted drop's landing into its target, is `DRO-11`. Choice 1, the slot's cost, is `DRO-10`.

**What this amends:**

- **`DRD-2`'s rule and rationale,** in place.
- **`DRD-27`:**
  - the table row "The landing after release": the release disposer calls the recorded `Landing`'s `start`;
  - the public types, through `DRD-29`'s.
- **`DRD-28`'s export table:**
  - `lift.js` exports `Lifter` and the types `Lift` and `Landing`;
  - `lift/landing.js` and `free-drag/drop-targets.js` are new entries.
- **`DRD-29`:**
  - `land(x, y, landing)` replaces `land(x, y, timing?)`;
  - `Landing` replaces `LandingTiming`;
  - the default timing leaves the lift;
  - the `DRF-3` bullet now reads: the record copies `duration` and `easing` at the call, keeps the `Landing` value that the caller passed, and keeps no object that `timing` returned.
- **The contract:** the vocabulary, the public surface, DRI-9, DRI-13, DRI-17, DRI-18, DRI-20, and the new DRI-21.

**Unchanged:**

- `DRD-25`. `targets` is not a controller-lifetime installer: its factory runs once per operation, and its state is the operation's.
- `DRD-1`, `DRD-30`, `DRD-32` and every kernel order.

**Rejected,** with reasons in the assessment's §2, §3.3 and §3.5:

- an open extension list on a behavior;
- drag2's `plugins`, fragments and `mergeFragments`;
- a capability that wraps the operation;
- a kernel hook for capabilities;
- a hit test on each sample;
- a default animation kept in the lift;
- runtime enforcement of what a capability may use;
- the first prototype's controller-held drop-target state, and its pull of `targets()` before registering the release;
- the first draft's per-sample hit test and step-routed invalidation.

**Costs:** `DRO-10` approves the slot's charge. Every other cost is reported and not accepted, and timing and optimization stay deferred. [`feature-composition-handoff.md`](../feature-composition-handoff.md) implements this decision.
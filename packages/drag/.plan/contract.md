# `@ydinjs/drag` contract

**Current state: the behavior the production package owes.** Decisions and their reasons are in [`00-index.md`](00-index.md). Production tests cite these entries by address, such as `drag:DRI-7`. **As of 2026-11-07 this states the behavior after remediation**: `DRD-14` to `DRD-23` and `DRD-25` changed the entries listed under [Change record](#change-record). [`remediation-report.md`](remediation-report.md) records the implementation of `DRD-14` to `DRD-23`, and [`composition-handoff.md`](composition-handoff.md) implements `DRD-25`. `DRD-27` and `DRD-28` changed the public surface, DRI-9, DRI-10, DRI-13, DRI-17 and DRI-18, and [`ownership-handoff.md`](ownership-handoff.md) implements them. `DRD-29` changed `lift.js`'s surface and was implemented at `b33890461`. On 2026-11-08, `DRD-30` moved the hooks after activation to the operation that `activate` returns, and [`activation-result-handoff.md`](activation-result-handoff.md) implements it. `DRD-31` changed DRI-14, and `DRD-32` changed DRI-6's development count. The implementation at `d7e7b0d3a` is described in [`implementation-report.md`](implementation-report.md).

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Behavior** | What is passed to `draggable`. It lasts as long as its controller, and admits and activates. `sortable` and `freeDrag` are behaviors |
| **Behavior operation** | What `activate` returns: the hooks from `start` to `end` for one activated operation |
| **Operation** | One press or command, from admission to its end |
| **Pass** | One synchronous run of library work, from a native event, a frame, a settled verdict or a request made while idle. Passes do not nest |
| **Step** | One unit inside a pass. The library reads requests only between steps |
| **Request** | `requestStep`, `requestCancel` or `requestDestroy`. A request does not change the running step |
| **Decision** | The operation's first cancel, fault or verdict |
| **Lift** | Top-layer promotion of the visual, with the visual's rendering preserved |
| **Landing** | The animation from the drop position to the visual's target. It outlives the operation |

## Public surface

| Entry | Exports |
| --- | --- |
| `draggable.js` | `draggable`, and the types `Behavior`, `BehaviorOperation`, `Admission`, `Drag`, `DragDisposer`, `DraggableController`, `Outcome`, `SkippedOutcome`, `VerdictOutcome`, `CanceledOutcome` and `CancelOrigin` |
| `lift.js` | `Lifter`, and the types `Lift` and `LandingTiming` |
| `fault.js` | `DragFault` |
| `sortable.js` | `sortable`, `ReorderResolution` |
| `sortable/y.js`, `sortable/xy.js` | `y`, `xy` |
| `sortable/landing.js`, `sortable/layout-animation.js` | `landing`, `layoutAnimation` |
| `free-drag.js` | `freeDrag`, `FreeDragResolution` |
| `free-drag/bounds.js`, `free-drag/landing.js` | `bounds`, `landing` |

`@ydinjs/box-quad` is the coordinate API for behaviors. This package does not re-export it. The `sortable` and `freeDrag` options are those of the prototype's `sortable.ts` and `free-drag.ts`, with the changes below. **A callback in those options receives only the values its type documents, in an object of its own.** It never receives the kernel's `Drag` or a behavior's operation.

### `draggable`

Names may change only for clarity. The members may not grow without a decision. **The kernel reads each hook when it calls it, and calls it as a method: `admit`, `command` and `activate` of the behavior, and the others of the operation `activate` returned**, so either may be a class instance. **No controller method depends on `this`**, so each works when detached.

```ts
type Outcome<Verdict> =
  | { type: 'skipped' }
  | { type: 'verdict'; value: Verdict }
  | {
      type: 'canceled';
      reason: unknown;
      origin: 'request' | 'escape' | 'interrupted' | 'fault';
    };

type Behavior<State, Verdict, Operation extends BehaviorOperation<Verdict>> = {
  threshold?: number;
  admit(event: PointerEvent): Admission<State> | null;
  command?(event: KeyboardEvent): Admission<State> | null; // One complete operation with no pointer.
  activate(drag: Drag<Operation>, state: State): Operation | null; // `null` declines. A throw is a fault. Neither gets `start` or `end`.
};

type BehaviorOperation<Verdict> = {
  start?(): void;
  move?(): void;
  drop?(): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  settle?(outcome: Outcome<Verdict>): void; // The presentation is still held.
  end?(outcome: Outcome<Verdict>): void; // After release.
};

type Admission<State> = {
  item: HTMLElement;
  handle?: HTMLElement;
  state?: State; // Passed to `activate` by identity. The kernel never reads it.
};

type Drag<Operation> = {
  item: HTMLElement;
  pointerId: number; // -1 for a command.
  x: number;
  y: number;
  originX: number;
  originY: number; // Viewport.
  signal: AbortSignal; // Aborts when the operation releases its presentation.
  use(dispose: (outcome: Outcome<unknown> | null) => void): void; // `null`: destruction released this operation.
  requestStep(step: (operation: Operation | null) => void): void; // Acts only while this operation is the controller's current one.
  requestCancel(reason?: unknown): void; // The same scope.
};

type DraggableController<Operation> = {
  requestStep(step: (operation: Operation | null) => void): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
  use(dispose: () => void): void; // Runs on destruction.
};

// `lift.js`. Nothing in `draggable.js` names these.
class Lifter {
  constructor(window: Window); // One per controller.
  acquire(drag: Drag<unknown>, visual?: HTMLElement, box?: HTMLElement): Lift; // First in `activate`. `visual` defaults to `drag.item`, `box` to `visual`.
  readonly cancelLanding: () => void; // Pass it to the controller's `use`. Works when detached.
}

type Lift = {
  visual: HTMLElement;
  box: HTMLElement;
  rect: DOMRectReadOnly;
  boxWidth: number;
  boxHeight: number;
  visualSpace: Space;
  itemSpace: Space; // From `@ydinjs/box-quad`.
  translate(x: number, y: number): void; // Viewport delta.
  land(x: number, y: number, timing?: LandingTiming): void; // From `settle`: the viewport position of the visual's top-left. `timing` is called once, now, and its values are copied. The landing starts when the lift is released.
};

type LandingTiming = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) => { duration: number; easing: string };
```

**Type requirement:** `Drag`, `Behavior`, `BehaviorOperation` and `Admission` name no lift member, and `draggable` has one signature. Declaration tests assert that a `Drag` has no `lift`, `visual`, `translate` or `state`, that an admission has no `visual` or `box`, and that a behavior has no `start`, `move`, `drop`, `settle` or `end`. The mechanism is the implementer's.

**The behavior and its operation.** The kernel builds a `Drag` when the operation opens, and writes only its `x` and `y` afterwards. It carries the admission's `state` to `activate` and never reads or writes it. It keeps the operation `activate` returns until the operation ends, and reads only its hooks. A step receives that operation. No kernel module names the lift, the landing or a behavior's resources (`DRD-27`, `DRD-30`). Each resource of an operation is released by a `use` disposer registered when it is acquired, by `activate` or by the operation, so a declined or failed activation is restored at release.

**Composing the lift.** A behavior that lifts creates one `Lifter` with its controller, and passes `cancelLanding` to the controller's `use`. In `activate` it calls `acquire` before any other `drag.use`, and the operation it returns keeps the `Lift`. `acquire` registers the lift's release with `drag.use` before it writes anything. So the release runs after every disposer that the behavior adds later, and it also restores a failed acquisition. `land` from the operation's `settle` names the landing, and the lift starts it right after its release. The next `acquire` cancels a running landing after it has measured, and so does `cancelLanding`.

**What a behavior does not receive:** the session, its slots, its state or its next step, in types or at runtime.

**Admission:** the kernel refuses an admission when a hop before `handle ?? item` in the event path has `data-drag-ignore`. A primary button press is required. `sortable` and `freeDrag` also decline `altKey`. An event that one controller admitted is offered to no other controller (DRI-19).

## Guarantees

### Requests and outcomes

#### DRI-1 — A request does not change the running step

A request made from a hook, a custom-element reaction, a listener or an `error` listener during a step is applied after that step and before the next. A request made while no pass runs applies before the call returns.

#### DRI-2 — One reader and fixed precedence

One reader takes requests between steps, in this order: destruction, deferred steps, the decision, the next step of the sequence. A request made by anything it runs is seen on its next turn.

#### DRI-3 — Terminals

`end` runs exactly once for an operation that reached `start`, unless destruction is applied first. `end` does not run without `start`. `start` runs only after `activate` returned an operation. An item disconnected at activation declines the operation quietly for every behavior: no `activate`, no `start`, no `end`, no report.

#### DRI-4 — Cancel

The first decision wins and keeps its reason and origin. A cancel on an idle controller or after the decision does nothing. `Escape` cancels with `origin: 'escape'`. An `Escape` that decides an operation that reached `start` has its default prevented, so it doesn't also close the dialog or popover that holds the list. It still propagates. `pointercancel` and `lostpointercapture` cancel with `origin: 'interrupted'`.

#### DRI-5 — Verdict

The first completion wins. `then` is read once. A throwing `then` accessor or call is a fault. A completion behind a decision or past its operation reaches nothing, including a later drag. The verdict's signal aborts on cancel or destruction and never on acceptance. `drag.signal` is a different signal, which aborts when presentation is released.

#### DRI-6 — Reentrant input

Reentrant input, including a nested press, is refused, and the next real press works. No event with `isTrusted` true is refused in any engine. Development builds count each event a running pass refuses once, so that the suite can assert this. A press whose release the library missed is DRI-19's.

#### DRI-7 — Faults

A throw from a hook, a step, a disposer, a verdict or a platform call reaches the library realm's `reportError` exactly once, when caught, as a `DragFault` whose `cause` is the thrown value by identity, whatever that value is. The message includes the original's message when it can be read safely. The first fault decides the outcome if nothing has, and `onEnd` carries the same instance. A later fault is reported and does not change the outcome. A listener's cancel after the deciding fault changes nothing. A listener's destruction applies before the terminal, so no `onEnd` runs. A fault with no operation is only reported.

#### DRI-8 — Deferred writes

Code outside a hook writes behavior state through `requestStep`.

- When no pass is running, the step runs at once. During a pass, it runs between steps, in request order.
- The same function requested again before it runs runs once. So a stable `invalidate` coalesces, and closures such as `moveTo` keep their order.
- **Through the controller,** the step receives the operation that `activate` returned only from the end of activation until the drop or the decision, whichever comes first. Otherwise it receives `null`, including before activation, while a verdict is pending and behind a cancel. So a `moveTo` behind a cancel changes nothing, and neither the view nor a landing moves.
- **Through a `Drag`,** a request acts only while that operation is the controller's current one, and the same window applies. Afterwards it does nothing, and so does `drag.requestCancel`. A retained `Drag` never reaches a later operation.
- A throw is a fault under DRI-7.
- A pass with no deferred step allocates nothing for this mechanism.

A hook may write its own state directly. Foreign code cannot be stopped from writing state directly, and this rule is documented for authors.

### Ending an operation

#### DRI-9 — Release order and cleanup

When a decision is applied, the order is:

1. Motion closes and the pointer capture is released. The verdict's signal aborts if the decision is a cancel.
2. The operation's `settle` runs if `start` was reached. A lifted behavior names the landing there with `lift.land`.
3. `drag.signal` aborts.
4. `use` disposers run last in first out, each with the outcome.
5. With the lift composed, the lift is released as the last disposer of step 4, because `acquire` registered it first. The visual's inline declarations and popover state are exactly as they were.
6. The landing starts right after the release, in the same disposer, with its target measured only if `settle` named one.
7. `end` runs as the next step, in the same task as the decision. A landing does not delay it.
8. Focus is restored under DRI-12 when `end` returns or throws, in the same step. Without `start`, it is restored right after step 4.

**The lift owns what it writes.** From activation to release the lift owns the visual's inline declarations of every property it writes: position and inset, size, margin, padding, border, `zoom`, `box-sizing`, `transform` and the individual transforms, `transform-origin`, transitions, overflow, `color` and `background-color`. Step 5 restores them over any write made during the lift. **A commit to one of those properties is made after release, in `end`.** A commit the lift doesn't own, such as DOM order, attributes, classes, custom properties, another element or a model, may be made in the verdict.

Every disposer runs, whatever another one throws. A disposer added after release runs at once, with the operation's outcome, or `null` if destruction released it. After an operation, no placeholder, listener, capture or inline style from the library remains. The only exceptions are a running landing and the click guard, under DRI-11.

#### DRI-10 — Destruction

`requestDestroy` returns one promise, by identity, on every call. It settles after teardown. Teardown closes the controller first. It then closes motion, aborts a pending verdict, releases the operation and runs controller disposers last in first out. A lifted composition's `cancelLanding` is a controller disposer, and the built-ins register it last, so it runs first.

- Once destruction is applied, no hook runs except `use` disposers, which receive `null`.
- Destruction does not deliver `settle` or `end`, so framework cleanup receives no callback during unmount. An `end` already running finishes.
- Destruction applied before the decision's terminal step removes that terminal.
- Disposers, and the lift among them, are released with the same totality as DRI-9. A fault during teardown is reported and doesn't stop it.
- A later request does nothing. A later `use` runs its disposer at once.
- Focus is not restored.
- **The click guard stays until it expires.** It holds no reference to the item, the behavior or the controller, and it runs no consumer code.

#### DRI-11 — Input policy

A press is never prevented. Only the move that crosses the threshold is prevented. Crossing arms a click guard for that pointer.

The guard swallows one click from that pointer, including after a cancel or destruction with the button held. **It expires at the first of:** that click, the task after that pointer's `pointerup`, that pointer's `pointercancel`, or the next primary `pointerdown`. A press below the threshold keeps its click. No later click is swallowed.

#### DRI-12 — Focus

The library does not choose where focus goes. It only keeps focus through its own operation.

- **The lift does not move focus.** Promotion runs the popover focusing steps, which focus an `autofocus` descendant, so the lift puts focus back.
- **A reorder does not lose focus, in any hook.** Removing a focused element sends focus to `body`, in pointer and keyboard reorders, in all three engines. The kernel records the focused element inside `item` at the drop, through open shadow roots. After `end` (DRI-9 step 8), if that element is connected and the document's focus is on nothing (`activeElement` is `null` or `body`), the kernel focuses it. A reorder in the verdict or in `end` is covered.
- A pointer operation restores with `preventScroll`. A command restores with normal focus scrolling, so that a row moved by keyboard stays visible.
- The library never takes focus from an element the user or the consumer has focused since the drop.

The consumer still owns `tabindex`, roles and any announcement of the new order.

#### DRI-13 — Landing

The landing is additive and starts from the position last translated to. A landing that can't run is reported and skipped, and the outcome stands. It is cancelled by the same `Lifter`'s next `acquire` or by its `cancelLanding` at destruction, and not by a press that never activates. **A grab during a landing keeps the visual under the pointer:** the activation measures the visual with the flight's current offset, then cancels the flight before the first lifted frame.

- **Elevation.** For the whole flight the visual is above its siblings in its stacking context, including siblings with their own `z-index`.
- **No residue.** Elevation leaves no inline style. It uses a replacing animation for `z-index`, separate from the additive flight, and `position: relative` only when the computed position is `static`.
- **Limit.** The visual has left the top layer, so an ancestor can still clip it or stack above it during the flight. `drag:DRO-2` records this choice.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, every landing has zero duration, including one a custom behavior named with no timing.

### Sortable and free drag

#### DRI-14 — Collection

`items()` is pulled at each admission and again at activation, for a pointer and a command alike, so a consumer who changes the list between drags or during a press has to call nothing. An item no longer in the collection at activation declines the operation: no `onStart`, no `onEnd`, no report. A command computes its target from the activation pull, and declines the same way when the move is no longer possible.

**The library borrows the array and doesn't copy it.**

- **An admission's array** is read only within that admission.
- **The retained array.** The operation keeps the array from activation, or from its last rebase, until the drop. Before the drop, the library may read it in any step it runs for the drag: a frame, a pointer event, the activation, and a command's drop. That includes reading it right after a consumer callback returns.
- **What never reads it:** applying a cancel, `Escape`, a verdict or destruction. A landing at home uses the item's gap saved from the pull that is the operation's collection, at activation or at the last rebase. After the drop, the library doesn't read the array.

**Consistency.** Between drags, during a press, and from the drop on, the consumer may change its array however it likes. From activation until the drop, it changes the collection in one of two ways:

- **In place,** when the change completes before the library can read again. Completing it means changing the array, making the DOM show the change, and calling `invalidate()`.
  - **Code that the library called** completes the change before it returns, because the drag continues when the code returns. Such code includes `onStart`, the placeholder factory, and a listener that a library DOM write triggers. A command's drop follows `onStart` synchronously. `invalidate()` called there runs before the library's next step.
  - **Code the library didn't call** may complete the change in the microtasks it queues, provided no animation frame or pointer event reaches the library before `invalidate()`. Such code includes an event handler, a timer, and an `await` continuation. A `requestCancel()` or `requestDestroy()` before `invalidate()` is allowed.
  - **No in-place change from `handle`, `visual`, `box` or the placeholder element's own callbacks,** which run in the middle of a read.
- **By replacement, otherwise.** The consumer leaves the retained array unchanged, makes later `items()` calls return a new array, and calls `invalidate()` once the DOM shows the change. Rendering may then be deferred, for example a framework update scheduled from `onStart`, because the retained array still matches the DOM.

An in-place change that the library can read before `invalidate()` is outside this contract, and so is a change during a drag without `invalidate()`. The library doesn't detect either.

During a drag, `invalidate()` re-reads the collection. A surviving gap rebases. A lost adjacency or a removed item cancels. After the drop, a collection change no longer affects the operation. The request carries `item`, `from`, `to`, `previous` and `next`, so `insertBefore(item, next)` is correct.

#### DRI-15 — Placeholder integrity

A placeholder that removes or moves itself, or takes the list with it, ends the activation clean with a fault and no `onStart`. An anchor that leaves the container cancels the drag and reports the fault. The placeholder is `aria-hidden` and mirrors the item's slot.

### Geometry and cost

#### DRI-16 — One coordinate model

Every coordinate conversion in this package and its examples uses `@ydinjs/box-quad`. No ratio or other simplified model exists beside it.

| To write | Basis | Read with |
| --- | --- | --- |
| `translate`, `left` or `top` on an element | That element's `Space` | `ancestry` |
| `width`, `height` or anything else in the element's own box | That element's `Box` | `coordinates` |

`localDelta(basis, dx, dy, out)` converts a viewport delta for either basis, with no allocation. A behavior without `lift` reads its basis in `activate`. A `false` from `ancestry` or `coordinates` is its fault to raise.

**Limit.** A `Space` excludes the element's own `zoom`, so a behavior that moves an element with its own `zoom` divides by it. The lift covers ancestor and own transforms and zoom with no code from the behavior.

**Required environments:** ancestor rotate, scale, skew and `zoom`, including combinations. Own transform. Scrolling containers. Shadow DOM. A same-origin iframe controlled by its parent.

#### DRI-17 — Hot path

The kernel allocates nothing per pointer sample. The lift's `translate` allocates only the CSS string it writes. A sample reads no layout. The spatial search is coalesced to a frame. No consumer callback runs per sample unless a behavior makes one. `sortable` measures a landing target only when a landing is composed.

#### DRI-18 — Custom behaviors get the same guarantees

DRI-1 to DRI-13, DRI-17 and DRI-19 hold for a behavior through this API, with no code from its author beyond its behavior and its operation, and no `try`. **The lift's guarantees** are DRI-9's steps 5 and 6, DRI-12's promotion and DRI-13. They hold for a behavior that composes the lift as `lift.js` documents: one `Lifter` per controller whose `cancelLanding` is passed to the controller's `use`, and `acquire` first in `activate`. `sortable` and `freeDrag` import only public `draggable` and `lift` values and types from the kernel. Importing `draggable` alone brings no lift, `box-quad`, sortable, axis, cache or landing code.

### Input

#### DRI-19 — Input ownership

- **Listening.** An operation reads its pointer stream and `Escape` on the window in the capture phase. A `stopPropagation` in the page doesn't hide them.
- **Button held.** A press never activates without the button that admitted it. A sample without that button ends a pending press quietly.
- **A missed release doesn't block.** A primary press while a press is pending ends the pending press quietly and is admitted itself.
- **Nested roots.** An event that one controller admitted, by `admit` or `command`, is offered to no other controller of the same library copy. The innermost admitting root wins, and an outer root still admits what its inner roots declined.
- **Native drag is the consumer's.** A natively draggable item or handle, such as a link or an image, needs `draggable="false"` from the consumer, as touch needs `touch-action: none`.

### Free drag

#### DRI-20 — Committed position

`localDeltaX` and `localDeltaY` in the request are the offset from home to the drop position, in the space a transform authored on the visual acts in. Home is `config.home()`, read once at the drop, or the activation rect without `home`. Without `home`, the value is exact only when nothing moved the home during the drag, such as a scrolling ancestor. A home landing reads `home()` at `settle`. `onMove`'s geometry is pointer travel. An accepted position is committed in `onEnd` (DRI-9).

## Accepted differences from drag2

- Destruction delivers no terminal, even after `start` (DRI-10).
- There is no FIFO between kinds of request (DRI-2).
- A landing can be clipped by an ancestor (DRI-13).
- A step's own platform throw is a fault, and the controller survives (DRI-7).
- An `Escape` that cancels a started operation doesn't reach the platform's close request (DRI-4).

## Change record

| Date | Entry | Change |
| --- | --- | --- |
| 2026-11-08 | `DRI-6` | **Changed:** development builds count each refused event once. An event refused by both the session's listener on the window and the root's listener used to count only where the root refused it, because the session passed no event. `DRD-32` |
| 2026-11-08 | `DRI-14` | **Changed:** the library borrows the `items()` array, keeps it from activation or the last rebase until the drop, and lands at a home gap saved at those pulls. The consumer keeps the retained array consistent: it completes an in-place change before the library can read again, or it replaces the array. It used to say that each pull copies the array, and that the consumer may change it at any time. `DRD-31` |
| 2026-11-08 | Vocabulary, public surface, `DRI-3`, `DRI-8`, `DRI-9`, `DRI-18` | **Changed:** `activate` returns the behavior's operation, which holds `start`, `move`, `drop`, `settle` and `end`, or `null` to decline. It used to return `undefined` or `false`, and those hooks were the behavior's, called with the `Drag`. A step receives the operation, and used to receive the `Drag`. The `Drag` has no `state`: `activate` receives it. `activate` is required. **Added:** the type `BehaviorOperation`. `DRD-30` |
| 2026-11-08 | Public surface | **Changed:** `lift.js` exports the class `Lifter` and the type `LandingTiming`. `Lift` has no `translatedX` or `translatedY`, and `land(x, y, timing?)` copies the timing's values at the call. It used to export `createLifter` and `Landing`, and `land` took a `Landing`. This entry was not updated when `DRD-29` was implemented at `b33890461`. `DRD-29`, `DRF-3` |
| 2026-11-07 | Public surface, `DRI-9`, `DRI-10`, `DRI-13`, `DRI-17`, `DRI-18` | **Changed:** the kernel has no lift. A behavior composes it with `createLifter`, acquires it in `activate`, keeps the `Lift` in its state and calls `land` in `settle`. The lift's release and landing are its first `use` disposer, and its landing's cancel is a controller disposer. It used to be the behavior's `lift` member: the kernel acquired it, released it after the disposers, started the landing that `settle` returned and cancelled it at destruction, and the ten lifted members were on the `Drag`. `Behavior.lift`, the lifted types and `Admission`'s `visual` and `box` are removed, and `settle` returns nothing. `Landing` is exported from `lift.js`, and it used to be exported from `draggable.js`. **Added:** each entry's types. This replaces the text at `6d5ba89e7`, never implemented, in which the members moved to `drag.lift`. `DRD-27`, `DRD-28` |
| 2026-11-07 | Public surface | **Added:** an option callback of `sortable` or `freeDrag` receives only its documented values. The `placeholder` factory had received the operation's `Drag` at `3084191bb`. `DRD-25` |
| 2026-11-07 | `DRI-14` | **Added:** each pull copies the array that `items()` returns. `DRD-25` |
| 2026-11-07 | Public surface | **Added:** hooks are called as methods of the behavior, and controller methods don't depend on `this`. `DRD-20` |
| 2026-11-07 | `DRI-3`, `DRI-14` | **Added:** the kernel's quiet decline for a disconnected item. A command is pulled at activation too. It used to skip the second pull. `DRD-18` |
| 2026-11-07 | `DRI-4`, `DRI-19` | **Added:** `Escape` is consumed when it decides a started operation, and the input rules. `DRD-17` |
| 2026-11-07 | `DRI-8` | **Changed:** requests through a `Drag` are scoped to its operation. A retained `Drag`'s step used to receive a later operation's `Drag`. `DRD-16` |
| 2026-11-07 | `DRI-9`, `DRI-12` | **Changed:** the landing starts before focus, and focus is restored after `end`. Focus used to be step 6, before the landing and before `end`. **Added:** the lift owns what it writes. `DRD-14`, `DRD-15` |
| 2026-11-07 | `DRI-13` | **Added:** a grab during a landing keeps the visual under the pointer. `DRD-18` |
| 2026-11-07 | `DRI-20` | **Added:** free drag's offset is measured against home at the drop. `DRD-19` |
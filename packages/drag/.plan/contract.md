# `@ydinjs/drag` contract

**Current state: the behavior the production package owes.** Decisions and their reasons are in [`00-index.md`](00-index.md). Production tests cite these entries by address, such as `drag:DRI-7`. The implementation and its one open return to the architect are in [`implementation-report.md`](implementation-report.md).

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Behavior** | The hooks passed to `draggable`. `sortable` and `freeDrag` are behaviors |
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
| `draggable.js` | `draggable` |
| `lift.js` | `lift` |
| `fault.js` | `DragFault` |
| `sortable.js` | `sortable`, `ReorderResolution` |
| `sortable/y.js`, `sortable/xy.js` | `y`, `xy` |
| `sortable/landing.js`, `sortable/layout-animation.js` | `landing`, `layoutAnimation` |
| `free-drag.js` | `freeDrag`, `FreeDragResolution` |
| `free-drag/bounds.js`, `free-drag/landing.js` | `bounds`, `landing` |

`@ydinjs/box-quad` is the coordinate API for behaviors. This package does not re-export it. The `sortable` and `freeDrag` options are those of the prototype's `sortable.ts` and `free-drag.ts`, with the changes below.

### `draggable`

Names may change only for clarity. The members may not grow without a decision.

```ts
type Outcome<Verdict> =
  | { type: 'skipped' }
  | { type: 'verdict'; value: Verdict }
  | {
      type: 'canceled';
      reason: unknown;
      origin: 'request' | 'escape' | 'interrupted' | 'fault';
    };

type Behavior<State, Verdict> = {
  threshold?: number;
  lift?: typeof lift; // Absent: no top layer, no measurement, and no lift code in the bundle.
  admit(event: PointerEvent): Admission<State> | null;
  command?(event: KeyboardEvent): Admission<State> | null; // One complete operation with no pointer.
  activate?(drag): void | false; // `false` declines. A throw is a fault. Neither gets `start` or `end`.
  start?(drag): void;
  move?(drag): void;
  drop?(drag): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  settle?(drag, outcome: Outcome<Verdict>): Landing | null; // Landing only with `lift`.
  end?(drag, outcome: Outcome<Verdict>): void;
};

type Admission<State> = {
  item: HTMLElement;
  handle?: HTMLElement;
  state?: State;
}; // With `lift`, also `visual?`, `box?`.
type Landing = { x: number; y: number; duration?: number; easing?: string }; // Viewport position of the visual's top-left.

type Drag<State> = {
  item: HTMLElement;
  state: State;
  pointerId: number; // -1 for a command.
  x: number;
  y: number;
  originX: number;
  originY: number; // Viewport.
  signal: AbortSignal; // Aborts when the operation releases its presentation.
  use(dispose: (outcome: Outcome<unknown> | null) => void): void; // `null`: destruction.
  requestStep(step: (drag: Drag<State> | null) => void): void;
  requestCancel(reason?: unknown): void;
};

type LiftedDrag<State> = Drag<State> & {
  visual: HTMLElement;
  box: HTMLElement;
  rect: DOMRectReadOnly;
  boxWidth: number;
  boxHeight: number;
  visualSpace: Space;
  itemSpace: Space; // From `@ydinjs/box-quad`.
  translatedX: number;
  translatedY: number;
  translate(x: number, y: number): void; // Viewport delta.
};

type DraggableController<State> = {
  requestStep(step: (drag: Drag<State> | null) => void): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
  use(dispose: () => void): void; // Runs on destruction.
};
```

**Type requirement:** a behavior without `lift` cannot name a `LiftedDrag` member, `visual`, `box` or a landing. Declaration tests assert this. The mechanism is the implementer's.

**What a behavior does not receive:** the session, its slots, its state or its next step, in types or at runtime.

**Admission:** the kernel refuses an admission when a hop before `handle ?? item` in the event path has `data-drag-ignore`. A primary button press is required. `sortable` and `freeDrag` also decline `altKey`.

## Guarantees

### Requests and outcomes

#### DRI-1 — A request does not change the running step

A request made from a hook, a custom-element reaction, a listener or an `error` listener during a step is applied after that step and before the next. A request made while no pass runs applies before the call returns.

#### DRI-2 — One reader and fixed precedence

One reader takes requests between steps, in this order: destruction, deferred steps, the decision, the next step of the sequence. A request made by anything it runs is seen on its next turn.

#### DRI-3 — Terminals

`end` runs exactly once for an operation that reached `start`, unless destruction is applied first. `end` does not run without `start`. `start` runs only after `activate` returned and did not decline.

#### DRI-4 — Cancel

The first decision wins and keeps its reason and origin. A cancel on an idle controller or after the decision does nothing. `Escape` cancels with `origin: 'escape'`. `pointercancel` and `lostpointercapture` cancel with `origin: 'interrupted'`.

#### DRI-5 — Verdict

The first completion wins. `then` is read once. A throwing `then` accessor or call is a fault. A completion behind a decision or past its operation reaches nothing, including a later drag. The verdict's signal aborts on cancel or destruction and never on acceptance. `drag.signal` is a different signal, which aborts when presentation is released.

#### DRI-6 — Reentrant input

Reentrant input, including a nested press, is refused, and the next real press works. No event with `isTrusted` true is refused in any engine. Development builds count refusals so that the suite can assert this.

#### DRI-7 — Faults

A throw from a hook, a step, a disposer, a verdict or a platform call reaches the library realm's `reportError` exactly once, when caught, as a `DragFault` whose `cause` is the thrown value by identity, whatever that value is. The message includes the original's message when it can be read safely. The first fault decides the outcome if nothing has, and `onEnd` carries the same instance. A later fault is reported and does not change the outcome. A listener's cancel after the deciding fault changes nothing. A listener's destruction applies before the terminal, so no `onEnd` runs. A fault with no operation is only reported.

#### DRI-8 — Deferred writes

Code outside a hook writes behavior state through `requestStep`.

- When no pass is running, the step runs at once. During a pass, it runs between steps, in request order.
- The same function requested again before it runs runs once. So a stable `invalidate` coalesces, and closures such as `moveTo` keep their order.
- The step receives the operation's `Drag` only from the end of activation until the drop or the decision, whichever comes first. Otherwise it receives `null`, including before activation, while a verdict is pending and behind a cancel. So a `moveTo` behind a cancel changes nothing, and neither the view nor a landing moves.
- A throw is a fault under DRI-7.
- A pass with no deferred step allocates nothing for this mechanism.

A hook may write its own state directly. Foreign code cannot be stopped from writing state directly, and this rule is documented for authors.

### Ending an operation

#### DRI-9 — Release order and cleanup

When a decision is applied, the order is:

1. Motion closes and the pointer capture is released. The verdict's signal aborts if the decision is a cancel.
2. `settle` runs if `start` was reached, and names the landing.
3. `drag.signal` aborts.
4. `use` disposers run last in first out, each with the outcome.
5. The lift is released. The visual's inline declarations and popover state are exactly as they were.
6. Focus is restored under DRI-12.
7. The landing starts, with its target measured only if `settle` returned one.
8. `end` runs as the next step, in the same task as the decision. A landing does not delay it.

Every disposer runs, whatever another one throws. A disposer added after release runs at once. After an operation, no placeholder, listener, capture or inline style from the library remains. The only exceptions are a running landing and the click guard, under DRI-11.

#### DRI-10 — Destruction

`requestDestroy` returns one promise, by identity, on every call. It settles after teardown. Teardown closes the controller first. It then closes motion, aborts a pending verdict, releases the operation, cancels the landing and runs controller disposers.

- Once destruction is applied, no hook runs except `use` disposers, which receive `null`.
- Destruction does not deliver `settle` or `end`, so framework cleanup receives no callback during unmount. An `end` already running finishes.
- Destruction applied before the decision's terminal step removes that terminal.
- Disposers and the lift are released with the same totality as DRI-9. A fault during teardown is reported and doesn't stop it.
- A later request does nothing. A later `use` runs its disposer at once.
- Focus is not restored.
- **The click guard stays until it expires.** It holds no reference to the item, the behavior or the controller, and it runs no consumer code.

#### DRI-11 — Input policy

A press is never prevented. Only the move that crosses the threshold is prevented. Crossing arms a click guard for that pointer.

The guard swallows one click from that pointer, including after a cancel or destruction with the button held. **It expires at the first of:** that click, the task after that pointer's `pointerup`, that pointer's `pointercancel`, or the next primary `pointerdown`. A press below the threshold keeps its click. No later click is swallowed.

#### DRI-12 — Focus

The library does not choose where focus goes. It only keeps focus through its own operation.

- **The lift does not move focus.** Promotion runs the popover focusing steps, which focus an `autofocus` descendant, so the lift puts focus back.
- **A reorder does not lose focus.** Removing a focused element sends focus to `body`, in pointer and keyboard reorders, in all three engines. The kernel records the focused element inside `item` at the drop, through open shadow roots. After presentation is released, if that element is connected and the document's focus is on nothing (`activeElement` is `null` or `body`), the kernel focuses it.
- A pointer operation restores with `preventScroll`. A command restores with normal focus scrolling, so that a row moved by keyboard stays visible.
- The library never takes focus from an element the user or the consumer has focused since the drop.

The consumer still owns `tabindex`, roles and any announcement of the new order.

#### DRI-13 — Landing

The landing is additive and starts from the position last translated to. A landing that can't run is reported and skipped, and the outcome stands. It is cancelled by the next activation or destruction, and not by a press that never activates.

- **Elevation.** For the whole flight the visual is above its siblings in its stacking context, including siblings with their own `z-index`.
- **No residue.** Elevation leaves no inline style. It uses a replacing animation for `z-index`, separate from the additive flight, and `position: relative` only when the computed position is `static`.
- **Limit.** The visual has left the top layer, so an ancestor can still clip it or stack above it during the flight. `drag:DRO-2` records this choice.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, every landing has zero duration, including one a custom behavior returned with no timing.

### Sortable and free drag

#### DRI-14 — Collection

`items()` is pulled at each admission and again at activation, so a consumer who changes the list between drags or during a press has to call nothing. An item no longer in the collection at activation declines the operation: no `onStart`, no `onEnd`, no report.

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

The kernel allocates nothing per pointer sample except the CSS string a lifted write needs. A sample reads no layout. The spatial search is coalesced to a frame. No consumer callback runs per sample unless a behavior makes one. `sortable` measures a landing target only when a landing is composed.

#### DRI-18 — Custom behaviors get the same guarantees

DRI-1 to DRI-13 and DRI-17 hold for a behavior through this API, with no code from its author beyond its hooks and no `try`. `sortable` and `freeDrag` import only public `draggable` and `lift` values and types from the kernel. Importing `draggable` alone brings no lift, `box-quad`, sortable, axis, cache or landing code.

## Accepted differences from drag2

- Destruction delivers no terminal, even after `start` (DRI-10).
- There is no FIFO between kinds of request (DRI-2).
- A landing can be clipped by an ancestor (DRI-13).
- A step's own platform throw is a fault, and the controller survives (DRI-7).
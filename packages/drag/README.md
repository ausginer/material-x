# `@ydinjs/drag`

Drag, sort and custom drag behaviors for the web, with one public authoring API. `sortable` and `freeDrag` are written on the same `draggable` you can use. The package is `private` until the owner releases it.

## Quick start

```ts
import { y } from '@ydinjs/drag/sortable/y.js';
import { ReorderResolution, sortable } from '@ydinjs/drag/sortable.js';

const controller = sortable(list, {
  items: () => [...list.querySelectorAll<HTMLElement>('.row')],
  axis: y(),
  onReorder({ item, next }) {
    list.insertBefore(item, next);
    return ReorderResolution.accept();
  },
});

// On unmount:
await controller.requestDestroy();
```

Give each row `touch-action: none` for touch input and `user-select: none` for text. A natively draggable item or handle, such as a link or an image, also needs `draggable="false"`, or the browser's own drag takes the pointer. Add features by importing them: `landing` from `sortable/landing.js`, `layoutAnimation` from `sortable/layout-animation.js`, and `xy` from `sortable/xy.js` for a wrapping field.

`items()` is pulled at each press and command, and again at activation, so a list that changed between drags or during a press needs no call. During a drag, call `controller.invalidate()`. A surviving gap rebases, and a lost neighbor or a removed item cancels the drag. Because the collection is pulled, create **one controller per root** and keep it while the list changes: destroying it during a drag removes that drag's `onEnd` and landing.

The library keeps the array `items()` returned at activation, or at the last `invalidate()`, until the drop, and doesn't copy it. Between drags, during a press, and from the drop on, including in `onReorder`, change your array however you like. During a drag, change it in one of two ways:

- **In place,** when the change is complete before the library can read again: the array changed, the DOM showing the change, and `invalidate()` called. In a callback the library called, complete it before the callback returns. A microtask is too late in `onStart`, because a keyboard command drops as soon as `onStart` returns. In your own code, such as an event handler, a timer or an `await` continuation, complete it within the microtasks that code queues.
- **By replacement,** otherwise. Leave the array unchanged, return a new one from later calls, and call `invalidate()` once the DOM shows the change. Rendering may then wait, because the kept array still matches the DOM.

Never change the array in place from `handle`, `visual`, `box` or the placeholder element's own callbacks, which run in the middle of a read.

```ts
// In place, completed before returning. `items: () => rows`.
const rows = [...list.querySelectorAll<HTMLElement>('.row')];

function insertRow(row: HTMLElement, index: number): void {
  list.insertBefore(row, rows[index] ?? null);
  rows.splice(index, 0, row);
  controller.invalidate();
}
```

```ts
// By replacement, with rendering deferred. `items: () => rows`.
let rows: readonly HTMLElement[] = [
  ...list.querySelectorAll<HTMLElement>('.row'),
];

function prependRow(row: HTMLElement): void {
  rows = [row, ...rows];
  requestAnimationFrame(() => {
    list.prepend(row);
    controller.invalidate();
  });
}
```

Lists nest with no marking. An event that one controller admitted is offered to no other, so the innermost list that admits a press takes it, and an outer list still takes a press its inner lists declined, such as on a column header.

```ts
import { bounds } from '@ydinjs/drag/free-drag/bounds.js';
import { freeDrag, FreeDragResolution } from '@ydinjs/drag/free-drag.js';

let x = 0;
let y = 0;

freeDrag(box, {
  bounds: bounds(arena),
  onDrop: () => FreeDragResolution.accept(),
  onEnd(result) {
    if (result.type === 'accepted') {
      x += result.request.localDeltaX;
      y += result.request.localDeltaY;
      box.style.translate = `${x}px ${y}px`;
    }
  },
});
```

`onDrop` decides, and **`onEnd` commits.** During the drag the lift owns the visual's inline position and inset, size, margin, padding, border, `zoom`, `box-sizing`, `transform` and the individual transforms, `transform-origin`, transitions, overflow, `color` and `background-color`, and release restores them exactly, over any write made in between. So a position written in `onDrop` is put back at release, and one written in `onEnd`, which runs after release in the same task, stays with no frame at home. A framework must not write those properties to a lifted visual. A commit the lift does not own, such as DOM order, attributes, classes or a model, may be made in `onDrop`. That is how `sortable` commits.

`localDeltaX` and `localDeltaY` are the offset from home to where the visual was dropped, in the space a transform authored on the visual acts in. Home is the visual's place at the grab. If a scrolling container can move it during the drag, give `home`, which is read at the drop and again for a landing home:

```ts
freeDrag(box, {
  home() {
    const frame = scroller.getBoundingClientRect();

    return {
      x: frame.left + boxLeft - scroller.scrollLeft + x,
      y: frame.top + boxTop - scroller.scrollTop + y,
    };
  },
  onDrop: () => FreeDragResolution.accept(),
  onEnd(result) {
    // Commit as above.
  },
});
```

Without `home`, the offset is exact only when nothing moved the home during the drag.

For drag and drop, import `dropTargets` from `free-drag/drop-targets.js` and give it to `targets`. `targets()` is pulled once per drag, at activation, and where targets overlap the first in the array wins. During the drag, the target under the pointer has the `data-drop-over` attribute, so it can be styled, and the request's `target` names the target under the release position, or `null` outside every target and without `targets`:

```ts
import { dropTargets } from '@ydinjs/drag/free-drag/drop-targets.js';
import { freeDrag, FreeDragResolution } from '@ydinjs/drag/free-drag.js';

freeDrag(card, {
  targets: dropTargets({
    targets: () => [...document.querySelectorAll<HTMLElement>('.zone')],
  }),
  onDrop: (request) =>
    request.target ? FreeDragResolution.accept() : FreeDragResolution.reject(),
  onEnd(result) {
    if (result.type === 'accepted') {
      result.request.target!.append(card);
    }
  },
});
```

```css
.zone[data-drop-over] {
  outline: 2px solid;
}
```

The mark follows the pointer at most once per frame, and the targets are measured again after a scroll, a resize or `controller.invalidate()`. The drag's release removes the mark, however the drag ends. **An accepted drop stays where it was dropped:** nothing lands into the target, and `onEnd` commits the new parent or position, as for any accepted drop. A rejected drop or a cancel lands home when a `landing` is composed. Drop targets are pointer-only, because `freeDrag` has no keyboard command.

## Writing a behavior

`draggable(root, behavior)` gives `activate` a `Drag`, a view of one operation. It does not give you the session. The behavior holds what lasts as long as the controller: `threshold`, `admit`, `command` and `activate`. `activate` returns the operation, which holds the hooks from `start` to `end`. They take no `Drag`: an operation that needs it keeps it from `activate`.

| Hook | When |  |
| --- | --- | --- |
| `admit(event)` | A primary press on the root | Return `{ item, handle?, state? }`, or `null` to decline |
| `command(event)` | A key on the root | An admission runs one complete operation with no pointer. `pointerId` is `-1` |
| `activate(drag, state)` | The pointer crossed the threshold | Receives the admission's `state`. Set up everything that can fail, and return the operation. Return `null` to decline quietly. A throw is a fault. Neither gets `start` or `end`. An item disconnected by then declines with no hook at all |
| `operation.start()` | After `activate` | From here `end` is guaranteed, unless destruction is applied first |
| `operation.move()` | Each pointer sample | Read no layout here. Coalesce expensive work to a frame |
| `operation.drop()` | The pointer was released | Return `(signal) => verdict`, or `null` to skip it |
| `operation.settle(outcome)` | The outcome is decided, and `drag.signal` has not aborted | A lifted behavior names its landing here with `lift.land` |
| `operation.end(outcome)` | After release, in the same task | A landing starts at release and does not delay it. Focus returns after it, so a reorder here keeps focus |

The kernel calls each hook as a method, read when it is called, so a behavior and its operation may be class instances. An operation's resources are released with `drag.use`, registered when each is acquired, in `activate` or in the operation's constructor. The operation has no release hook.

The `outcome` is `skipped`, `verdict` with its `value`, or `canceled` with its `reason` and `origin` (`request`, `escape`, `interrupted` or `fault`).

### The `requestStep` rule

**A hook may write its own operation's state directly. Code outside a hook writes it through `requestStep`.** A consumer's method, a frame callback or a listener can run in the middle of a DOM write the kernel makes, so a direct write could change the running step. Nothing can detect a direct write, so this is a rule for you to keep.

```ts
type Nudged = BehaviorOperation & { nudge(amount: number): void };

const controller = draggable<undefined, unknown, Nudged>(root, { ... });

function nudge(amount: number): void {
  controller.requestStep((operation) => {
    operation?.nudge(amount);
  });
}
```

A literal behavior names `draggable`'s type arguments, as here, when a step reads its operation's own members or a hook needs the verdict's type. A class instance infers them.

The step runs at once when no pass is running, and otherwise between steps, in request order. It receives the operation `activate` returned, from the end of activation until the drop or the decision, and `null` otherwise, so a write behind a cancel changes nothing.

A step passed alone is called with no receiver. Pass an object after it, as in `controller.requestStep(this.refresh, this)`, and the step is called on that object. The same step requested twice before it runs runs once only when it comes with the same receiver, or with none both times. So a stable function coalesces, and one method requested for two objects runs once for each.

Hooks also have `drag.requestStep` and `drag.requestCancel`. **They are scoped to their operation:** they act only while it is the controller's current one, and afterwards do nothing, so a `drag` kept in a timer never reaches a later drag. Cleanup after an operation belongs in `use`. Call `draggable`'s controller methods on the controller, as in `return () => controller.requestDestroy()`. The members of the `sortable` and `freeDrag` controllers also work when detached.

### Cleanup with `use`

`drag.use(dispose)` runs when the operation releases its presentation, last in first out, and every disposer runs whatever another one throws. Like a step, a disposer passed with an object, as in `drag.use(this.release, this)`, is called on that object, and one passed alone is called with no receiver. Every `use` call is its own registration, so the same disposer registered twice runs twice. A disposer receives the outcome, or `null` when destruction released the operation, where neither `settle` nor `end` runs. A disposer added after release runs at once with the same value. So one disposer can state a rollback:

```ts
drag.use((outcome) => {
  if (outcome?.type !== 'verdict') {
    rollBack();
  }
});
```

`controller.use(dispose)` is cleanup for the controller's lifetime, and takes a receiver in the same way. A disposer added too late runs at once, on its receiver.

### Faults

Do not write `try` for the library's sake. A throw from a hook, a step, a disposer, a verdict or a platform call goes to the library realm's `reportError` as one `DragFault`, whose `cause` is the thrown value by identity. The first fault decides the outcome if nothing has, as `canceled` with `origin: 'fault'`, and `end` receives the same instance. A later fault is reported and changes nothing.

```ts
addEventListener('error', (event) => {
  if (event.error instanceof DragFault) {
    logToService(event.error.cause);
  }
});
```

### Coordinates

`@ydinjs/box-quad` is the coordinate API, and this package does not re-export it. `localDelta(basis, dx, dy, out)` converts a viewport delta, with no allocation.

| To write | Basis | Read with |
| --- | --- | --- |
| `translate`, `left` or `top` on an element | That element's `Space` | `ancestry` |
| `width`, `height` or anything else in the element's own box | That element's `Box` | `coordinates` |

A behavior that does not compose the lift reads its basis in `activate`, and a `false` from `ancestry` or `coordinates` is its fault to raise. A `Space` excludes the element's own `zoom`, so a behavior that moves an element with its own `zoom` divides by it.

### The lift

`Lifter` from `@ydinjs/drag/lift.js` promotes the visual to the top layer, which escapes clipping, transformed and stacking ancestors. The kernel does not know about it: a behavior composes it in `activate` and keeps the `Lift` in the operation it returns.

```ts
import { draggable } from '@ydinjs/drag/draggable.js';
import { Lifter } from '@ydinjs/drag/lift.js';
import { landing } from '@ydinjs/drag/lift/landing.js';

const lifter = new Lifter(window);
const cardLanding = landing();
const controller = draggable(root, {
  admit: () => ({ item: card }),
  activate(drag) {
    const lift = lifter.acquire(drag);

    return {
      move() {
        lift.translate(drag.x - drag.originX, drag.y - drag.originY);
      },
      settle() {
        lift.land(lift.rect.left, lift.rect.top, cardLanding);
      },
    };
  },
});

controller.use(lifter.cancelLanding);
```

`acquire(drag, visual?, box?)` returns a `Lift` with `visual`, `box`, `rect`, `boxWidth`, `boxHeight`, `visualSpace` and `itemSpace`, all measured at the grab, and `translate(x, y)` and `land(x, y, landing)`. `visual` defaults to the item, and `box` to `visual`. `translate` takes a viewport delta and covers ancestor and own transforms and zoom. `land` takes the viewport position of the visual's top-left, and a `Landing` such as `landing()` from `lift/landing.js`. Its `timing` is called once, at the call, with the delta last translated to and the delta to the landing, and when it throws nothing is recorded. Its `start` starts the animation right after the lift is released, from where the visual is then, and the last call wins. **Without a landing, nothing animates:** the lift has no default animation or timing, so a behavior that never calls `land` carries no animation code, and one that does not import `lift.js` carries no lift code. `landing()` takes the same options as `landing` from `sortable/landing.js` and `free-drag/landing.js`, and a custom timing is `{ ...landing(), timing }`.

**The lift's guarantees hold when you compose it this way:** one `Lifter` per controller, with its `cancelLanding` passed to the controller's `use`, and `acquire` as the first statement of `activate`, before any other `drag.use`. `acquire` registers the release with `drag.use` before it writes anything. So the release runs after every disposer you add later, a failed acquisition is restored at release, and the landing starts after the release and before `end`. Nothing checks a composition that differs.

## Focus and landing limits

- **Focus.** The library does not choose where focus goes. The lift keeps focus where it was, and a reorder keeps focus on the element inside the item that had it, through open shadow roots. Focus is restored after `end`, so a reorder in the verdict or in `end` keeps it. A pointer operation restores with `preventScroll`, and a keyboard operation with normal scrolling, so that a row moved by keyboard stays visible. It never takes focus from an element focused since the drop, and it does not restore on destruction. **You own `tabindex`, roles and any announcement of the new order.** A row that cannot take focus cannot be reordered from the keyboard.
- **Landing.** The visual has left the top layer during a landing, so an ancestor can clip it or stack above it for the length of the flight. It stays above its siblings in its own stacking context. With `prefers-reduced-motion: reduce`, every landing that `landing()` starts has zero duration. A custom `Landing` handles that preference itself. `layoutAnimation`'s row animations do not change with that preference.
- **`Escape`.** `Escape` cancels an operation. Once the operation has started, the library prevents the key's default, so the dialog or popover holding the list stays open. The key still propagates. Before the threshold it is not prevented.
- **Input.** The library reads an operation's pointer stream and `Escape` on the window in the capture phase, so a `stopPropagation` in the page doesn't hide them. A press never activates without its button, and a press whose release the library missed ends at the next sample with no button or the next press.
- **Destruction.** A trailing click after a destruction with the button held is still swallowed, by a guard that holds no reference to the item or the controller and runs no consumer code.
- **Real devices.** Touch is tested through Chromium's emulated input. Physical touch and pen are unverified.

## Development

```sh
npx just test           # Chromium: browser, shipped, declaration and node projects
npx just test-engines   # the browser suite in Chromium, Firefox and WebKit
npx just size           # sizes and module graphs
npx just compare        # before/after cost, about half an hour
```

The record is in [`.plan/00-index.md`](.plan/00-index.md), and the owed behavior in [`.plan/contract.md`](.plan/contract.md).
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

Give each row `touch-action: none` for touch input and `user-select: none` for text. Add features by importing them: `landing` from `sortable/landing.js`, `layoutAnimation` from `sortable/layout-animation.js`, and `xy` from `sortable/xy.js` for a wrapping field.

`items()` is pulled at each press and again at activation, so a list that changed between drags or during a press needs no call. During a drag, call `controller.invalidate()`. A surviving gap rebases, and a lost neighbor or a removed item cancels the drag.

```ts
import { bounds } from '@ydinjs/drag/free-drag/bounds.js';
import { freeDrag, FreeDragResolution } from '@ydinjs/drag/free-drag.js';

freeDrag(box, {
  bounds: bounds(arena),
  onDrop({ localDeltaX, localDeltaY }) {
    box.style.translate = `${localDeltaX}px ${localDeltaY}px`;
    return FreeDragResolution.accept();
  },
});
```

An accepted free drag does not move back and does not move by itself: `onDrop` writes the position. `localDeltaX` and `localDeltaY` are in the space a transform authored on the visual acts in.

## Writing a behavior

`draggable(root, behavior)` calls your hooks with a `Drag`, a view of one operation. It does not give you the session or its state.

| Hook | When |  |
| --- | --- | --- |
| `admit(event)` | A primary press on the root | Return `{ item, handle?, state? }`, or `null` to decline |
| `command(event)` | A key on the root | An admission runs one complete operation with no pointer. `pointerId` is `-1` |
| `activate(drag)` | The pointer crossed the threshold | Set up everything that can fail. Return `false` to decline quietly. A throw is a fault. Neither gets `start` or `end` |
| `start(drag)` | After `activate` | From here `end` is guaranteed, unless destruction is applied first |
| `move(drag)` | Each pointer sample | Read no layout here. Coalesce expensive work to a frame |
| `drop(drag)` | The pointer was released | Return `(signal) => verdict`, or `null` to skip it |
| `settle(drag, outcome)` | The outcome is decided, presentation is still held | With `lift`, return a `Landing` or `null` |
| `end(drag, outcome)` | After release, in the same task | A landing does not delay it |

The `outcome` is `skipped`, `verdict` with its `value`, or `canceled` with its `reason` and `origin` (`request`, `escape`, `interrupted` or `fault`).

### The `requestStep` rule

**A hook may write its own state directly. Code outside a hook writes behavior state through `requestStep`.** A consumer's method, a frame callback or a listener can run in the middle of a DOM write the kernel makes, so a direct write could change the running step. Nothing can detect a direct write, so this is a rule for you to keep.

```ts
const panel = draggable(root, { ... });

function nudge(amount: number): void {
  panel.requestStep((drag) => {
    if (drag) {
      drag.state.offset += amount;
    }
  });
}
```

The step runs at once when no pass is running, and otherwise between steps, in request order. It receives the `Drag` from the end of activation until the drop or the decision, and `null` otherwise, so a write behind a cancel changes nothing. The same function requested twice before it runs runs once, so a stable function coalesces. Hooks also have `drag.requestStep` and `drag.requestCancel`.

### Cleanup with `use`

`drag.use(dispose)` runs when the operation releases its presentation, last in first out, and every disposer runs whatever another one throws. A disposer receives the outcome, or `null` on destruction, where neither `settle` nor `end` runs. So one disposer can state a rollback:

```ts
drag.use((outcome) => {
  if (outcome?.type !== 'verdict') {
    rollBack();
  }
});
```

`panel.use(dispose)` is cleanup for the controller's lifetime. A disposer added too late runs at once.

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

A behavior without `lift` reads its basis in `activate`, and a `false` from `ancestry` or `coordinates` is its fault to raise. A `Space` excludes the element's own `zoom`, so a behavior that moves an element with its own `zoom` divides by it.

### The lift

Import `lift` from `@ydinjs/drag/lift.js` and pass it as the behavior's `lift` to promote the visual to the top layer. It escapes clipping, transformed and stacking ancestors, and it adds `visual`, `box`, `rect`, `boxWidth`, `boxHeight`, `visualSpace`, `itemSpace`, `translatedX`, `translatedY` and `translate(x, y)` to the `Drag`. `translate` takes a viewport delta and covers ancestor and own transforms and zoom. `settle` can then return `{ x, y, duration?, easing? }`, the viewport position of the visual's top-left. A behavior without `lift` carries no lift code, and its types cannot name these members.

## Focus and landing limits

- **Focus.** The library does not choose where focus goes. The lift keeps focus where it was, and a reorder keeps focus on the element inside the item that had it, through open shadow roots. A pointer operation restores with `preventScroll`, and a keyboard operation with normal scrolling, so that a row moved by keyboard stays visible. It never takes focus from an element focused since the drop, and it does not restore on destruction. **You own `tabindex`, roles and any announcement of the new order.** A row that cannot take focus cannot be reordered from the keyboard.
- **Landing.** The visual has left the top layer during a landing, so an ancestor can clip it or stack above it for the length of the flight. It stays above its siblings in its own stacking context. With `prefers-reduced-motion: reduce`, every landing has zero duration. `layoutAnimation`'s row animations do not change with that preference.
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
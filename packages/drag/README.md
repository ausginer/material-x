# @ydinjs/drag

A compact, dependency-free drag engine for modern browsers (Baseline 2025). Two
tree-shakeable entry points share one internal kernel:

- **`@ydinjs/drag/draggable`** — free dragging: lift an element, move it through
  2-D space, drop it at an arbitrary position.
- **`@ydinjs/drag/sortable`** — spatial reordering: move an element within a
  collection (list, row, wrapping layout, or grid) treated as one field of
  rectangles.

The engine owns the transient interaction (pointer tracking, the lifted visual,
the placeholder, animation, cleanup). The **consumer owns the persistent result**
— final position or collection order — and applies it in its own state.

## Free dragging

```ts
import { draggable } from '@ydinjs/drag/draggable';

const drag = draggable(element, {
  axis: 'both', // 'x' | 'y' | 'both'
  bounds: 'viewport', // 'viewport' | HTMLElement | () => DOMRect | null
  touchAction: 'none',
  async onDrop(request) {
    const position = constrain(request.localPosition);
    await savePosition(position);
    return { accepted: true, position };
  },
});

// later
drag.update({ position }); // controlled position, or revise runtime options
await drag.cancel(); // roll back the active gesture
drag.destroy(); // tear down; safe to call repeatedly
```

`onDrop` may be async and returns `{ accepted, position? }`; the visual stays
under engine control until the transaction resolves. A rejected drop animates the
element home.

## Controlled reordering

```ts
import { sortable } from '@ydinjs/drag/sortable';

const list = sortable(container, {
  items: () => currentItems, // read once at construction; keep in sync with updateItems()
  getHandle: (item) => item.querySelector('[data-handle]'),
  createPlaceholder: ({ rect }) => makePlaceholder(rect), // optional
  onReorder(request) {
    // request: { item, from, to, before, after }
    setOrder((order) => move(order, request.from, request.to));
  },
});

list.updateItems(nextItems); // after the collection changes
```

The engine **never mutates the collection** — it dispatches a proposed reorder and
watches for the consumer's commit (by neighbour identity, tolerating async
renders). A no-op or rejected drop animates home and reports no change.

`onFinish(item, outcome)` reports how the gesture concluded so an
accepted-and-committed reorder is distinguishable from one that was accepted but
never landed:

- `committed` — accepted, and the DOM commit was observed;
- `accepted` — accepted, but no commit arrived before the ~500 ms wait timed out
  (the item may still sit in its original slot);
- `rejected` — rejected by the consumer, or a no-op drop;
- `canceled` — cancelled, escaped, or destroyed.

### Placeholder

`createPlaceholder` is optional. When omitted, the engine inserts an internal,
non-styleable anchor (`[data-drag-placeholder]`, `aria-hidden`) purely for
geometry. Supply one to style the gap; it is sized to the item and joins the
item's slot.

## Contracts and caveats

- **Touch policy.** Pass `touchAction` to have the engine install a
  `touch-action` for the controller's lifetime — on the handle/item (draggable) or
  the container (sortable) — restored on `destroy()`. It must be in place before
  `pointerdown`, so it is not applied per-gesture.
- **`items()` is read once** at construction and after every `updateItems()`. It
  is not a live getter — call `updateItems()` whenever the collection changes so
  hit testing and commit tracking stay correct.
- **Inner visuals.** `getVisual` may return an element inside the item (including
  a shadow descendant). The lift assumes the visual vacates its layout box when
  promoted; hosts that keep flow space (e.g. not `display: contents`) can
  double-occupy alongside the placeholder.
- **Coordinate space (current).** Geometry is viewport-space. Zoom and nested
  CSS transforms on the visual/container are **not yet** composed — that is the
  next milestone. `coordinateSpace` accepts a `CoordinateMapper` but defaults to
  identity today.
- **Lifecycle.** `destroy()` is idempotent and terminal: it cancels any animation,
  releases pointer capture, removes temporary DOM, restores styles, and prevents
  any later callback or async continuation from running. `cancel(reason)` rolls
  the active gesture back through the same path and forwards `reason` to
  `onCancel`.
- **Reduced motion** is respected; **Escape** cancels an active gesture.

## License

Apache-2.0

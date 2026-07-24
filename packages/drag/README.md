# @ydinjs/drag

A compact, dependency-free drag engine for modern browsers (Baseline 2025). Two tree-shakeable entry points share one internal kernel:

- **`@ydinjs/drag/draggable.js`** — free dragging: lift an element, move it through 2-D space, drop it at an arbitrary position.
- **`@ydinjs/drag/sortable.js`** — spatial reordering: move an element within a collection (list, row, wrapping layout, or grid) treated as one field of rectangles.

The engine owns the transient interaction (pointer tracking, the lifted visual, the placeholder, animation, cleanup). The **consumer owns the persistent result** — final position or collection order — and applies it in its own state.

Both entry points require an explicit resolution. The engine never infers acceptance from a return value or from the DOM: you say `accept()` or `reject()`.

## Free dragging

```ts
import { draggable, FreeDropResolution } from '@ydinjs/drag/draggable.js';

const drag = draggable(element, {
  axis: 'both', // 'x' | 'y' | 'both'
  bounds: 'viewport', // 'viewport' | HTMLElement | () => DOMRectReadOnly | null
  lift: 'top-layer', // 'top-layer' | 'flatten' | 'none'
  threshold: 8, // activation travel, viewport px

  async onDrop(request, { signal }) {
    const position = constrain(request.localPosition);
    const saved = await savePosition(position, { signal });

    return saved
      ? FreeDropResolution.accept()
      : FreeDropResolution.reject('rejected by server');
  },

  onFinish: (result) => applyPosition(result.proposal.request.localPosition),
  onCancel: (result) => rollBack(result),
});

drag.update({ position }); // controlled position, or revise runtime options
drag.cancel('reason'); // roll back the active gesture
drag.destroy(); // terminal, idempotent, synchronous
```

`onDrop` may be sync or async and receives a dedicated `AbortSignal` that aborts if the gesture ends before it settles. The visual stays under engine control until it resolves.

`resolveHomeTarget` is optional; supply it to animate a rejected or cancelled drop back to a specific viewport position rather than releasing in place.

### Lift mode

- `lift: 'top-layer'` (default) promotes the visual into the top layer — it escapes clipping and stacking and paints above everything — and re-applies the element's captured local→viewport matrix so it keeps its exact appearance (own + ancestor `zoom`/`transform`) with no distortion. Costs one matrix computation at grab.
- `lift: 'flatten'` also lifts into the top layer but renders the visual axis-aligned at its natural (untransformed) size, dropping ancestor transforms. Use it to drag a visual "upright" out of a rotated or scaled container.
- `lift: 'none'` drags in place: the visual stays inside its (possibly transformed) container, keeping any ancestor `zoom`/`transform`, at the cost of that container's clipping and stacking.

Every mode maps movement through the coordinate space, so the pointer stays anchored under a scaled or rotated container.

## Controlled reordering

```ts
import { sortable, ReorderResolution } from '@ydinjs/drag/sortable.js';

const list = sortable(container, {
  items: () => currentItems, // read at construction and on updateItems()
  getHandle: (item) => item.querySelector('[data-handle]'),
  createPlaceholder: ({ rect }) => makePlaceholder(rect), // optional

  onReorder(request, { signal }) {
    // request: { item, version, from, to, before, after }
    setOrder((order) => move(order, request.from, request.to));
    return ReorderResolution.accept();
  },

  onFinish: (result) => {
    /* accepted, or a no-op drop */
  },
  onCancel: (result) => {
    /* rejected, or cancelled */
  },
});

list.updateItems(nextItems); // after the collection changes
```

The engine **never mutates the collection** — it proposes a reorder and you apply it. A no-op drop still completes: it reports through `onFinish` with an `OUTCOME_NO_OP` result.

Arrow keys on a focused item perform one discrete reorder: a complete one-slot move rather than an interactive drag. It is inert at the collection's edge.

### Waiting for your render

Both `accept()` and `reject()` take an optional `presentationReady` promise. The engine holds the lift and the placeholder until it settles, so your authored DOM is never revealed before it exists:

```ts
onReorder(request) {
  const rendered = applyOrderAndWaitForPaint(request);
  return ReorderResolution.accept(rendered);
}
```

Apply the change and return the promise — do not `await` it before returning, which serialises your render ahead of the landing animation instead of overlapping it. The wait is bounded at 500 ms; a promise that never settles reports a presentation failure through `onError` and cleans up, because a stuck gesture is worse than a late render.

### Placeholder

`createPlaceholder` is optional. When omitted, the engine inserts an internal, non-styleable anchor (`[data-drag-placeholder]`, `aria-hidden`) purely for geometry. Supply one to style the gap; it is sized to the item and joins the item's slot.

## Contracts and caveats

- **`items()` is not a live getter.** It is read at construction and after every `updateItems()`. Call `updateItems()` whenever the collection changes so hit testing stays correct. A replacement that removes the dragged item, or that breaks the proposed gap's neighbour identity, ends the gesture.
- **Touch policy is yours.** The engine does not install `touch-action`; set it in your own CSS on the handle, item or container. It must be in place before `pointerdown`, so it cannot be applied per-gesture.
- **Inner visuals.** `getVisual` may return an element inside the item (including a shadow descendant). The lift assumes the visual vacates its layout box when promoted; hosts that keep flow space (e.g. not `display: contents`) can double-occupy alongside the placeholder.
- **Coordinate space.** Active pointer tracking is viewport-space; `viewport*` values are raw. `localDelta`/`localPosition` are mapped into the consumer's coordinate space by a mapper derived at grab time from the element's layout context — a `DOMMatrix` compositor that composes cumulative `zoom` and nested CSS transforms (translate, scale including non-uniform, rotate, skew, `matrix()`, custom `transform-origin`). Matrices are read only at grab, drop, and settle, never in the pointer-move hot path. The visual's own authored transform is preserved and the drag translation is composed with it. Pass `coordinateSpace` to override the derived mapper.
- **Release closes input.** Once you release, pointer movement can no longer change the proposal. Cancellation stays available while your resolver is pending: `cancel()` and <kbd>Esc</kbd> both still work, and cancelling aborts the resolver's signal.
- **Lifecycle.** `destroy()` is idempotent and terminal, and tears down synchronously even when called from inside a callback: it cancels any animation, releases pointer capture, removes temporary DOM, restores styles, and prevents any later callback or async continuation from running. `cancel(reason)` rolls the active gesture back through the same path and forwards `reason` to `onCancel`.
- **Errors.** `onError(error, { cause, domain })` reports classified failures — a throwing callback, a failed resolver, a landing that could not run. It never re-opens the gesture.
- **Reduced motion** is respected; <kbd>Esc</kbd> cancels an active gesture.

## Architecture

See [DESIGN.md](./DESIGN.md).

## License

Apache-2.0
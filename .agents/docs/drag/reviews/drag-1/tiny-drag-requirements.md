# Package Requirements: Tiny DOM-Native Drag Engine

## 1. Product definition

The package is a compact, dependency-free drag engine for modern web applications.

It provides two primary interaction modes:

1. **Free dragging** A DOM element can be lifted, moved through two-dimensional space, and dropped at an arbitrary position.

2. **Spatial reordering** A DOM element can be moved within a collection represented by a vertical list, horizontal row, wrapping layout, CSS Grid, or irregular two-dimensional arrangement.

Both modes share the same pointer lifecycle, coordinate model, visual feedback, animation, cancellation, and cleanup machinery.

The package targets **Baseline 2025** and uses modern browser APIs directly.

---

# 2. Design goals

## 2.1. Small runtime

The package should remain small enough to be embedded in lightweight component libraries.

Initial size budgets:

- free-drag entry point: at most **3 KB gzip**;
- spatial-reordering entry point: at most **5 KB gzip**;
- both entry points in one application: preferably at most **6 KB gzip**.

Bundle size should be measured automatically in CI.

## 2.2. Zero runtime dependencies

The package should use browser platform APIs and its own implementation without requiring an external reactive runtime, geometry library, gesture framework, or animation library.

## 2.3. Framework independence

The package should operate directly on DOM elements and integrate with:

- plain DOM applications;
- Web Components;
- React;
- Vue;
- Svelte;
- Lit;
- other renderers capable of providing DOM elements and updating application state.

The package should not require a particular component lifecycle or state-management model.

## 2.4. Controlled persistent state

The engine owns the temporary interaction:

- pointer tracking;
- activation;
- lifted visual;
- placeholder;
- preview position;
- animation;
- pending drop transaction;
- cleanup.

The consumer owns the persistent result:

- final free-drag coordinates;
- final collection order;
- domain-specific acceptance or rejection;
- application state.

The package should support renderers whose DOM commit happens asynchronously after the drop callback returns.

---

# 3. Package structure

The package should expose separate tree-shakeable entry points:

```ts
import { draggable } from '@ydinjs/drag/draggable';
import { sortable } from '@ydinjs/drag/sortable';
```

The free-drag entry point should include only:

- pointer lifecycle;
- coordinate conversion;
- movement;
- visual feedback;
- free-drop transactions.

The sortable entry point may reuse the same internal kernel and additionally include:

- collection geometry;
- insertion detection;
- placeholder movement;
- controlled reorder transactions.

---

# 4. Core concepts

The public model should distinguish the following concepts.

## 4.1. Item

The logical DOM element participating in the interaction.

```ts
type DragItem = HTMLElement;
```

For sortable collections, item identity is based on the element reference rather than an application-specific string ID.

## 4.2. Handle

An optional element that activates dragging for an item.

The handle may be:

- the item itself;
- a descendant;
- an element inside the item’s shadow tree;
- an element returned by a callback.

## 4.3. Visual

The element that is visually lifted and moved.

By default, the visual is the item itself. A consumer may provide another element:

```ts
getVisual(item) {
  return item.shadowRoot?.querySelector<HTMLElement>('.surface') ?? item;
}
```

The engine should preserve the distinction between logical item identity and visual presentation.

## 4.4. Placeholder

A temporary DOM element that occupies the collection position represented by the dragged item.

The placeholder:

- preserves layout occupancy;
- communicates the proposed insertion position;
- matches the relevant dimensions of the item;
- can be created by the consumer;
- can be styled by the integrating component;
- participates in the same slot as the item when necessary;
- remains present while an external reorder commit is pending.

## 4.5. Container

The DOM element whose collection is being reordered.

The container provides the layout context but does not have to be a dedicated drop-zone element.

## 4.6. Coordinate space

A clearly defined coordinate system in which positions, deltas, bounds, and transformations are expressed.

The package should expose viewport-space values and support conversion into a consumer-selected local coordinate space.

## 4.7. Drag session

A single pointer-driven interaction with an explicit lifecycle.

```ts
type DragSessionState =
  | 'pending'
  | 'dragging'
  | 'dropped'
  | 'awaiting-commit'
  | 'settling'
  | 'finished'
  | 'canceled';
```

State transitions should be explicit and internally consistent.

---

# 5. Modern platform foundation

The implementation may directly use:

- Pointer Events;
- Pointer Capture;
- Popover API;
- top-layer rendering;
- Web Animations API;
- `DOMMatrix`;
- `DOMPoint`;
- `getBoundingClientRect()`;
- `AbortController`;
- `ResizeObserver`;
- `requestAnimationFrame`;
- modern ES modules;
- modern CSS properties.

The selected APIs should be compatible with the Baseline 2025 target.

---

# 6. Pointer lifecycle

## 6.1. Input devices

The engine should support:

- mouse;
- touch;
- pen.

All devices should use the same Pointer Events-based lifecycle.

## 6.2. Pointer ownership

A drag session should:

- start from one primary pointer;
- store the initiating `pointerId`;
- react only to events from that pointer;
- acquire pointer capture after activation;
- preserve tracking when the pointer leaves the item or container;
- release capture during cleanup.

Events belonging to another pointer should not affect the active session.

## 6.3. Activation

Activation should support:

- minimum movement distance;
- optional press delay;
- optional handle;
- optional excluded interactive regions;
- preservation of normal clicks when drag activation does not occur.

A pointer press should enter the `pending` state. The element should be lifted only after the configured activation condition is satisfied.

## 6.4. Completion and interruption

The session should handle:

- `pointerup`;
- `pointercancel`;
- `lostpointercapture`;
- Escape;
- item disconnect;
- container disconnect;
- controller destruction;
- animation interruption;
- errors during activation or settling.

Every completion path should converge on safe and idempotent cleanup.

## 6.5. Touch interaction policy

The package should expose an explicit touch-action policy.

It should support applying an appropriate `touch-action` value to:

- the item;
- the handle;
- an element selected by the consumer.

Any inline style changed by the package should be preserved and restored.

The touch policy should allow an integrating component to choose between:

- immediate drag interaction;
- scroll-friendly handle-based interaction;
- delayed activation.

---

# 7. Coordinate and transformation model

Support for zoom and transformed element trees is a primary requirement.

## 7.1. Viewport-space tracking

Pointer input should be tracked in viewport coordinates using `clientX` and `clientY`.

The engine should avoid assuming that raw pointer deltas can be applied directly as local CSS translation values.

## 7.2. Nested CSS transforms

Dragging should remain correctly anchored when the item, visual, container, or any ancestor uses combinations of:

- `translate`;
- `scale`;
- non-uniform scale;
- `rotate`;
- `skew`;
- `transform-origin`;
- `matrix()`;
- nested transform compositions.

The visual should remain attached to the same pointer-relative point throughout the drag.

## 7.3. CSS zoom

Dragging should work when `zoom` is applied to:

- the item;
- the visual;
- the container;
- one or more ancestors.

The engine should account for cumulative zoom rather than assuming a one-to-one relationship between CSS pixels in local space and viewport pixels.

## 7.4. Combined zoom and transforms

The coordinate model should support combinations such as:

```css
.workspace {
  zoom: 0.8;
  transform: rotate(2deg) scale(1.25);
}

.panel {
  transform: translateX(30px) skewY(3deg);
}

.item {
  transform: scale(0.95);
}
```

Pointer tracking, free placement, placeholder hit testing, and landing animation should remain geometrically consistent.

## 7.5. Matrix conversion

The engine should maintain or derive the transformations needed to map:

- local points to viewport space;
- viewport points to local space;
- viewport-space movement to visual-space translation;
- container-space positions to consumer coordinates.

The public API may expose helpers such as:

```ts
type CoordinateMapper = {
  toViewport(point: Point): Point;
  fromViewport(point: Point): Point;
  deltaFromViewport(delta: Point): Point;
};
```

The precise implementation may use `DOMMatrix`, measured quads, computed transforms, or equivalent platform geometry.

## 7.6. Transform preservation

The engine should preserve pre-existing transforms.

If the visual already has:

```css
transform: rotate(5deg) scale(0.9);
```

drag movement should be composed with that transform rather than replacing it.

Conceptually:

```text
existing visual transform
× drag translation
× temporary lift transform
```

Cleanup should restore the exact original inline values and priorities.

## 7.7. Stable pointer anchor

The pointer should remain attached to the point where the user grabbed the visual.

The anchor should remain stable when:

- the visual is promoted to the top layer;
- ancestors are transformed;
- the page scrolls;
- the container scrolls;
- zoom is active;
- the visual has a custom transform origin.

## 7.8. Geometry types

Public geometry should use immutable value objects:

```ts
type Point = Readonly<{
  x: number;
  y: number;
}>;

type DragGeometry = Readonly<{
  pointer: Point;
  originPointer: Point;
  viewportDelta: Point;
  localDelta: Point;
  originRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}>;
```

The coordinate space of every exposed value should be documented explicitly.

---

# 8. Free dragging

## 8.1. Basic interaction

Free drag should allow an item to be:

- activated;
- lifted;
- moved through two-dimensional space;
- previewed continuously;
- dropped at an arbitrary position;
- committed or rejected by the consumer;
- animated to its accepted or restored position.

No destination element is required.

## 8.2. Movement axes

The consumer should be able to select:

```ts
type DragAxis = 'both' | 'x' | 'y';
```

## 8.3. Bounds

Free dragging should support optional bounds expressed as:

- viewport bounds;
- an element;
- a callback returning a rectangle or region;
- a consumer-defined coordinate-space constraint.

Bounds should remain correct under zoom, transforms, and scrolling.

## 8.4. Position result

A free-drop request should provide enough geometry for the consumer to persist the result:

```ts
type FreeDropRequest = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  pointer: Point;
  viewportPosition: Point;
  localPosition: Point;
  viewportDelta: Point;
  localDelta: Point;
  visualRect: DOMRectReadOnly;
}>;
```

## 8.5. Drop transaction

The consumer should be able to:

- accept the proposed position;
- provide an adjusted final position;
- reject the drop;
- commit asynchronously.

Example direction:

```ts
draggable(element, {
  async onDrop(request) {
    const position = snapToWorkspaceGrid(request.localPosition);
    await savePosition(position);

    return {
      accepted: true,
      position,
    };
  },
});
```

The visual should remain under engine control until the drop transaction reaches a stable result.

## 8.6. External position updates

The controller should support external position updates:

```ts
controller.update({
  position: nextPosition,
});
```

This allows the consumer to keep persistent position state controlled while the engine manages transient pointer movement.

---

# 9. Spatial collection reordering

## 9.1. Unified two-dimensional model

Sortable collections should be treated as a spatial field of item rectangles.

The same model should support:

- vertical lists;
- horizontal lists;
- wrapping rows;
- CSS Grid;
- tile layouts;
- irregular collections;
- items with different dimensions.

A one-column list and a one-row list are special cases of the same spatial collection model.

## 9.2. Collection source

The consumer provides the current ordered item collection:

```ts
sortable(container, {
  items: () => currentItems,
});
```

or updates it explicitly:

```ts
controller.updateItems(currentItems);
```

DOM element identity should be preserved across updates.

## 9.3. Spatial geometry

For each item, the engine should derive:

```ts
type SpatialItem = Readonly<{
  item: HTMLElement;
  rect: DOMRectReadOnly;
  index: number;
}>;
```

Rects should be interpreted in a common viewport coordinate space so that transformed items can be compared consistently.

## 9.4. Insertion positions

Hit testing should produce an insertion position rather than only a collided item.

```ts
type Insertion = Readonly<{
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;
```

The insertion should represent the proposed linear DOM order while being selected through two-dimensional geometry.

## 9.5. Spatial selection behavior

The built-in spatial strategy should:

- select a stable insertion position near the pointer or placeholder;
- work across rows and columns;
- account for item dimensions;
- account for gaps;
- account for transformed item geometry;
- avoid rapid oscillation between two insertion positions;
- use movement direction or hysteresis where needed;
- resolve equal-distance cases deterministically;
- preserve a predictable relationship with DOM order.

## 9.6. Irregular layouts

The geometry model should continue to work when:

- rows contain different item counts;
- items have different widths or heights;
- the layout wraps responsively;
- the visual order is produced by CSS Grid;
- the container changes size during drag;
- individual items resize during drag.

## 9.7. Placeholder lifecycle

When sorting begins:

1. the visual is lifted;
2. a placeholder is created;
3. the placeholder occupies the item’s original collection position;
4. spatial hit testing determines new insertion positions;
5. the placeholder moves between those positions;
6. the visual follows the pointer independently;
7. the visual lands at the final placeholder position.

The placeholder should preserve relevant physical dimensions in viewport space while participating correctly in the container’s local layout.

## 9.8. Placeholder creation

The consumer should control placeholder construction:

```ts
createPlaceholder({ item, visual, rect }) {
  const placeholder = document.createElement('div');
  placeholder.dataset.dragPlaceholder = '';
  return placeholder;
}
```

The engine should configure the geometry and lifecycle required for correct placement.

## 9.9. Slotted collections

When an item is assigned to a named slot, the placeholder should be capable of participating in the same slot.

The consumer or adapter may provide the required slot assignment.

## 9.10. Reorder request

A proposed reorder should provide both indices and stable neighboring identities:

```ts
type ReorderRequest = Readonly<{
  item: HTMLElement;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;
```

This supports simple array movement while giving the engine enough identity information to verify an asynchronous commit.

---

# 10. Controlled reorder transactions

## 10.1. Proposal

Dropping a sortable item creates a proposed reorder transaction.

The engine should:

1. capture the final insertion;
2. begin landing;
3. notify the consumer;
4. wait for the collection to reflect the accepted order;
5. complete cleanup after both visual settling and external commit.

## 10.2. Asynchronous commit

The contract should support ordinary asynchronous renderer behavior:

```ts
onReorder(request) {
  setItems((items) => move(items, request.from, request.to));
}
```

The integration should not require a synchronous DOM commit.

## 10.3. Commit observation

The engine should be able to verify a commit when the consumer supplies the updated item collection.

Verification should primarily use item and neighbor identity:

```text
the dragged item appears after the expected previous item
and before the expected next item
```

Numeric index may be used as an additional signal.

## 10.4. Explicit completion

The API may also support explicit asynchronous acknowledgement:

```ts
sortable(container, {
  async onReorder(request) {
    await commitOrder(request);
    return { accepted: true };
  },
});
```

Collection observation and callback completion should participate in one coherent transaction model.

## 10.5. Rejection

A rejected reorder should:

- retain the original persistent order;
- return the visual to the original insertion position;
- animate the rollback;
- restore the item and placeholder safely;
- report a rejected result.

## 10.6. No-op

Dropping at the original insertion should produce a successful no-op result and animate the visual home without requiring an application-state update.

## 10.7. Collection updates during a session

The engine should inspect collection updates during active dragging and settling.

It should be able to distinguish:

- the expected reorder commit;
- item geometry changes;
- item removal;
- container replacement;
- unrelated structural changes.

The resulting session behavior should be deterministic and should always preserve safe cleanup.

---

# 11. Lifted visual and top-layer feedback

## 11.1. Promotion

The visual should support promotion to the top layer through the Popover API.

This allows the drag visual to:

- render above stacking contexts;
- escape clipping ancestors;
- remain visible outside scroll containers;
- use viewport-based positioning;
- retain inherited custom properties and component styles.

## 11.2. Geometry preservation

Promotion should preserve the visual’s screen-space geometry.

Immediately before and after promotion:

- the visual should occupy the same viewport position;
- its rendered dimensions should remain stable;
- the pointer anchor should remain unchanged;
- its existing transform should remain composed correctly.

This should work under ancestor zoom and transforms.

## 11.3. Existing styles and state

The engine should snapshot and restore any properties it modifies, including:

- `position`;
- `inset`;
- `top`;
- `left`;
- `width`;
- `height`;
- `margin`;
- `border`;
- `transform`;
- `translate`;
- `transform-origin`;
- `touch-action`;
- `user-select`;
- popover attributes or state;
- temporary classes and data attributes.

Property priorities should be preserved where relevant.

## 11.4. Consumer styling

The engine should expose stable interaction hooks through callbacks, classes, attributes, or state information so that a component library can style:

- pending item;
- lifted item;
- active visual;
- placeholder;
- settling visual;
- accepted drop;
- rejected drop.

---

# 12. Animation

## 12.1. Lift animation

Activation should support an optional lift animation.

The consumer should be able to define:

- duration;
- easing;
- keyframes or transform contribution;
- elevation-related styles;
- scale;
- opacity;
- shape changes.

## 12.2. Direct manipulation

During pointer movement, the visual should track the pointer without transition lag.

Layout-sensitive work should be synchronized to animation frames while visual transform updates remain responsive.

## 12.3. Landing animation

The engine should animate the visual from its current viewport geometry to:

- the accepted free-drag position;
- the final sortable placeholder;
- the original position after rejection or cancellation.

Landing geometry should remain correct under:

- CSS zoom;
- ancestor transforms;
- item transforms;
- scrolling;
- responsive layout changes.

## 12.4. Transform composition

Animation should compose with the visual’s existing transform rather than replacing it.

The final cleanup should restore the original authored transform exactly.

## 12.5. Reduced motion

The engine should respect `prefers-reduced-motion`.

Reduced-motion behavior should preserve the same session and commit semantics while minimizing or removing movement animation.

## 12.6. Interrupted animations

Canceled or interrupted Web Animations should be treated as an expected lifecycle event.

Cleanup should not depend on `animation.finished` resolving successfully.

---

# 13. Scrolling and geometry invalidation

## 13.1. Scroll support

Dragging should remain correct when scrolling occurs in:

- the document;
- the container;
- any ancestor scroll container;
- nested scroll regions.

The engine should update geometry even when the pointer remains stationary in viewport space.

## 13.2. Resize support

Geometry should be invalidated when:

- the viewport resizes;
- the container resizes;
- an item resizes;
- responsive layout changes move items;
- zoom or transform values change through application state.

## 13.3. Measurement model

The engine should:

- batch geometry reads;
- cache stable measurements;
- invalidate them explicitly;
- avoid repeated read/write interleaving;
- perform spatial hit testing at most once per animation frame;
- flush the latest pending pointer position before drop.

## 13.4. Coordinate consistency

All measured item geometry should be converted into the common space used for hit testing.

Placeholder placement and landing should map that result back into the relevant local layout or visual coordinate space.

---

# 14. Shadow DOM and composed trees

The engine should support:

- items implemented as custom elements;
- visuals inside shadow roots;
- handles inside shadow roots;
- event targeting through `composedPath()`;
- slotted collection items;
- named slots;
- containers implemented as custom elements;
- consumer-provided item lists derived from `slot.assignedElements()`.

The package should allow an adapter to provide item, visual, handle, and placeholder elements without assuming a particular shadow-tree structure.

---

# 15. Programmatic movement and accessibility integration

## 15.1. Shared movement transaction

The same movement model used by pointer drag should be available programmatically.

For sortable collections:

```ts
await controller.move(item, {
  before,
  after,
});
```

For free dragging:

```ts
await controller.moveTo({
  x,
  y,
});
```

## 15.2. Component-level accessibility

Programmatic movement should allow component libraries to implement:

- keyboard controls;
- Move before / Move after actions;
- Move up / Move down buttons;
- context menus;
- screen-reader announcements.

Pointer and programmatic movement should produce equivalent commit results.

## 15.3. Cancellation

Escape should cancel an active interaction and trigger the same rollback lifecycle used by programmatic cancellation.

---

# 16. Controller lifecycle

A free-drag controller should expose:

```ts
type DragController = {
  update(options: Partial<DragOptions>): void;
  cancel(reason?: unknown): Promise<void>;
  destroy(): void;
};
```

A sortable controller should additionally expose:

```ts
type SortableController = DragController & {
  updateItems(items: readonly HTMLElement[]): void;

  move(
    item: HTMLElement,
    destination: {
      before: HTMLElement | null;
      after: HTMLElement | null;
    },
  ): Promise<MoveResult>;
};
```

`destroy()` should:

- cancel the active session;
- release pointer capture;
- abort listeners;
- disconnect observers;
- cancel animations;
- remove temporary DOM;
- restore modified styles and state;
- safely tolerate repeated calls.

---

# 17. Events and callbacks

The API should expose typed lifecycle information.

```ts
type DragStart = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  pointerEvent: PointerEvent;
  geometry: DragGeometry;
}>;

type DragMove = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  pointerEvent: PointerEvent;
  geometry: DragGeometry;
}>;

type DragCancel = Readonly<{
  item: HTMLElement;
  reason: unknown;
}>;

type DragFinish = Readonly<{
  item: HTMLElement;
  accepted: boolean;
}>;
```

The package may use callbacks as its primary integration API. Component adapters may convert callbacks into DOM events.

Lifecycle names should reflect whether an operation is:

- proposed;
- accepted;
- committed;
- rejected;
- canceled;
- fully settled.

---

# 18. Error handling and invariants

The engine should maintain the following invariants:

- one item participates in at most one active session;
- one controller owns at most one active pointer session;
- the initiating pointer exclusively controls the session;
- the visual and placeholder are restored or removed exactly once;
- activation can be rolled back after partial completion;
- cleanup is idempotent;
- an asynchronous callback failure cannot strand temporary DOM;
- an animation rejection cannot strand temporary DOM;
- item identity remains stable throughout a commit transaction;
- coordinate conversions use invertible mappings;
- invalid geometry is detected and reported.

Consumer errors during asynchronous callbacks should produce a controlled rejection and complete cleanup.

An optional `onError` callback may receive recoverable lifecycle errors.

---

# 19. Performance requirements

The package should:

- avoid a global drag manager for independent controllers;
- attach only the listeners needed by active controllers;
- use pointer capture rather than continuous document-wide fallback tracking;
- process layout-sensitive movement once per animation frame;
- group geometry reads;
- cache item rectangles;
- avoid unnecessary DOM movement when the insertion has not changed;
- avoid a reactive runtime;
- avoid per-item controller objects when a container-level representation is sufficient;
- handle ordinary collections containing tens or hundreds of elements smoothly.

The geometry model should remain suitable for future optimization through spatial indexing without requiring that complexity in the initial implementation.

---

# 20. Testing requirements

## 20.1. Pointer lifecycle

Tests should cover:

- mouse;
- touch;
- pen;
- activation distance;
- activation delay;
- handle activation;
- click without drag;
- foreign pointer events;
- pointer capture;
- `pointercancel`;
- `lostpointercapture`;
- Escape;
- disconnect;
- destroy;
- exceptions during activation;
- exceptions during settling.

## 20.2. Zoom and transform geometry

Tests should cover dragging under:

- item scale;
- ancestor scale;
- non-uniform scale;
- rotation;
- skew;
- translated ancestors;
- custom transform origins;
- nested transform matrices;
- CSS zoom;
- nested CSS zoom;
- combined zoom and transform;
- transformed scroll containers;
- pre-existing visual transforms.

The pointer anchor should remain stable in every tested configuration.

## 20.3. Free drag

Tests should cover:

- unrestricted two-dimensional movement;
- X-only movement;
- Y-only movement;
- viewport bounds;
- transformed local bounds;
- zoomed coordinate spaces;
- accepted drops;
- adjusted drops;
- rejected drops;
- asynchronous persistence;
- landing;
- rollback;
- scrolling during drag.

## 20.4. Spatial reordering

Tests should cover:

- vertical list;
- horizontal list;
- CSS Grid;
- wrapping flex layout;
- irregular rows;
- items with different dimensions;
- transformed items;
- transformed container;
- zoomed container;
- movement between rows and columns;
- movement forward and backward;
- no-op drop;
- delayed external commit;
- rejected reorder;
- collection resize;
- item resize;
- scroll during drag;
- collection changes during an active session.

## 20.5. Integration environments

Browser integration tests should include:

- plain DOM;
- custom elements;
- slotted custom elements;
- named slots;
- React-controlled collection using ordinary state updates;
- nested Shadow DOM.

React integration should complete without requiring synchronous renderer escape hatches.

## 20.6. Visual tests

Visual regression coverage should include:

- lift;
- pointer movement;
- placeholder movement;
- grid reordering;
- landing;
- rollback;
- zoom;
- rotation;
- nested transforms;
- reduced motion.

---

# 21. Documentation requirements

The documentation should clearly explain:

- the shared drag-session model;
- free dragging;
- spatial collection reordering;
- viewport and local coordinate spaces;
- transform and zoom handling;
- visual, item, handle, and placeholder roles;
- top-layer promotion;
- controlled drop transactions;
- asynchronous reorder commits;
- React integration;
- Shadow DOM integration;
- touch-action configuration;
- programmatic movement;
- animation configuration;
- lifecycle cleanup.

Examples should include complete setup and destruction.

---

# 22. Acceptance criteria

The package succeeds when it can provide a small API for both primary use cases.

## Free drag

```ts
const drag = draggable(element, {
  handle,

  coordinateSpace: workspace,

  async onDrop(request) {
    const position = constrainPosition(request.localPosition);
    await savePosition(position);

    return {
      accepted: true,
      position,
    };
  },
});
```

This should remain correct when the workspace and element use nested zoom, scale, rotation, skew, and translation.

## Controlled spatial reordering

```ts
const grid = sortable(container, {
  items: () => currentItems,

  getHandle,
  getVisual,
  createPlaceholder,

  onReorder(request) {
    updateApplicationOrder(request);
  },
});
```

This should support lists, rows, wrapping layouts, and two-dimensional grids through one spatial geometry model.

The package should provide:

- stable mouse, touch, and pen interaction;
- precise behavior under zoom and transforms;
- top-layer visual feedback;
- a movable placeholder;
- animated lift and landing;
- asynchronous controlled commits;
- safe cancellation and cleanup;
- direct integration with Web Components and framework-owned DOM;
- a runtime footprint measured in a few kilobytes.
## Confirmed bugs

1. High — cancellation silently commits the reorder.

pointercancel and unexpected lostpointercapture call finalize(false), but false only suppresses the event. Landing still moves the item to the footprint.

- Cancellation handlers: packages/core/src/traits/reorderable.ts:450
- Unconditional DOM move: packages/core/src/traits/reorderable.ts:295

On touch scrolling, OS interruption, or lost capture, the DOM order can change without a ReorderEvent. Consumer state and DOM then disagree.

Cancellation should restore the item’s original position and emit nothing.

2. High — every press starts a drag; the documented handle is ignored.

The only hit test is “does the composed path contain an item?”:

packages/core/src/traits/reorderable.ts:433

This conflicts with the documented data-handle contract:

packages/material-x/src/list/list.ts:48

The story still uses the old native draggable mechanism, which the custom implementation also ignores:

packages/material-x/src/list/list.stories.tsx:246

Consequences:

- Pressing a nested button, link, or trailing action starts dragging.
- Right-click can start dragging.
- A click with zero movement lifts and settles the item.
- It dispatches reorder even when from === to.
- preventDefault() can interfere with native focus and activation.

The 8px threshold currently gates only footprint movement, not drag activation.

3. Medium–high — disconnecting during landing does not stop landing.

cancel() aborts pointer tracking and removes the footprint, but it does not cancel or invalidate an already-running land() task:

- Disconnect: packages/core/src/traits/reorderable.ts:423
- Cancellation: packages/core/src/traits/reorderable.ts:344
- Later asynchronous completion: packages/core/src/traits/reorderable.ts:289

If the host disconnects during the animation and reconnects, the old session can subsequently:

- Dispatch a stale reorder event.
- Clear styles belonging to a newly started drag.
- Manipulate an item that application state has already removed.

A canceled flag and owned Animation reference are needed, with every asynchronous continuation checking the session state.

4. Medium — synchronous animation failures leave the UI corrupted.

timing() and visual.animate() execute before the try block:

packages/core/src/traits/reorderable.ts:271

If either throws, the session reference is eventually released, but the footprint, fixed positioning, and :state(drag) remain. Cleanup needs to be in an outer finally.

5. Medium — the session is not tied to its initiating pointer.

The initiating pointerId is used for capture but not retained for filtering:

packages/core/src/traits/reorderable.ts:220

Any pointer moving or lifting over the host can move or finish the active drag. A second touch can therefore drop the first touch’s item. Start should also require an appropriate primary pointer/ button.

6. Medium — returning inside the threshold can leave a stale insertion point.

After the threshold has been crossed and a frame has run, returning close to the original position updates the ghost transform but skips footprint repositioning:

packages/core/src/traits/reorderable.ts:309

The user can drag to the bottom, return to the start, release, and still land at the bottom. The threshold should be a one-time activation transition:

pending → threshold crossed → dragging

Once dragging is active, every subsequent move must update hit testing.

7. Medium — existing inline styles are destroyed.

Setup overwrites position, top, left, width, z-index, and transform, while cleanup removes them rather than restoring their previous values:

- Properties: packages/core/src/traits/reorderable.ts:69
- Cleanup: packages/core/src/traits/reorderable.ts:233

This is observable for any custom target with pre-existing inline geometry or transforms. Original values and priorities should be snapshotted and restored.

8. Medium — geometry becomes stale after scrolling or reflow.

Rects are measured initially and only refreshed after the footprint has already moved:

packages/core/src/traits/reorderable.ts:226

Scrolling, resizing, content loading, or item expansion can invalidate every midpoint. The next move/drop can use old viewport coordinates. Rects need invalidation on scroll/resize/layout mutation, or remeasurement immediately before hit testing.

9. Medium — transformed ancestors can make the ghost jump.

getBoundingClientRect() returns viewport coordinates, but position: fixed can be relative to a transformed/filter/contain ancestor:

packages/core/src/traits/reorderable.ts:200

Inside such a containing block, assigning the viewport left/top produces the wrong position. A document-level overlay/clone is generally more robust than making the original shadow descendant fixed.

10. Low–medium — named slots are broken.

slotSelector suggests named slots are supported, but the footprint does not copy item.slot:

packages/core/src/traits/reorderable.ts:207

For <slot name="items">, the footprint is unassigned and can have no rendered geometry.

11. Contract mismatch — the trait does reorder DOM itself.

The event documentation says DOM reordering is left to the consumer:

packages/core/src/traits/reorderable.ts:14

But footprint.replaceWith(item) physically reorders the item before dispatch. That may be intentional for controlled rendering, but the documentation and cancellation behavior must reflect the actual ownership model.

## What is good

Several choices are solid:

- Gesture-specific state is isolated in a session closure.
- drop() is idempotent, correctly handling the normal pointerup → lostpointercapture sequence.
- Pointer capture is placed on the stable host instead of the movable footprint.
- The pointer listener uses an AbortController.
- Move hit testing is frame-coalesced.
- flush() addresses pointerup arriving before a pending animation frame.
- Measurement happens after inserting the footprint, preserving initial layout.
- Index calculation is correct for a stable, vertical, single-column list.
- ReorderEvent bubbling/composed/noncancelable configuration is appropriate for a genuine post- commit notification.

- The WeakMap registration for inner visual targets does not create ownership leaks.

## Improvements and limitations

The trait is hard-coded to physical Y coordinates, so horizontal layouts and vertical writing modes are unsupported. width/height are also assigned to logical inlineSize/blockSize, which swaps dimensions under vertical writing modes.

Touch dragging needs an explicit interaction policy. preventDefault() during pointerdown is not a substitute for touch-action; applying an appropriate policy to an actual drag handle would avoid browser panning taking over the gesture.

Accessibility is incomplete: there is no keyboard reordering, cancellation key, or positional announcement. At minimum, keyboard users need move-up/move-down commands and a live announcement of the resulting position.

For long lists, linear midpoint scanning and synchronous remeasurement of every item after DOM mutation may jank. This is probably acceptable initially, but should be benchmarked before using it for large collections.

## Recommended redesign order

1. Introduce explicit pending, dragging, settling, and canceled states.
2. Require primary-button activation from the configured handle.
3. Do not lift, prevent defaults, or dispatch anything until the threshold is crossed.
4. Scope every event to the initiating pointerId.
5. Make cancel restore the original position; make successful drop the only commit path.
6. Put all cleanup in a single idempotent finally, restoring original inline styles.
7. Cancel/invalidate animations and asynchronous continuations on disconnect.
8. Rework geometry invalidation and transformed-ancestor behavior.
9. Add keyboard reordering and announcements.

The existing targeted browser suite passes all 17 tests. However, it lacks coverage for cancellation after movement, handles, zero-movement presses, secondary/multiple pointers, disconnect during settling, failed timing, style restoration, scrolling, transforms, named slots, and the real inner-target integration.
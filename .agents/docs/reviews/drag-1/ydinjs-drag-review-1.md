## Confirmed correctness bugs

1. High — destroy() starts or leaves asynchronous work after cleanup.

Both controllers cancel the current animation, transition through destroy, and then clean up:

- packages/drag/src/draggable.ts:350
- packages/drag/src/sortable.ts:430

But transitioning from dragging or awaiting-commit to canceled settling synchronously starts a new landing animation. That new animation is not canceled before cleanup. Later it can:

- Write an engine-generated transform back after authored styles were restored.
- Run cleanup a second time.
- Invoke onFinish after destruction.
- In sortable, enter commit-waiting logic after destruction.

Destruction needs its own terminal state or generation token so no asynchronous continuation can mutate state or invoke callbacks afterward.

2. High — activation and settling exceptions can strand partially modified DOM.

The session assigns the new FSM state before effects, which is correct for reentrancy, but effect exceptions are not recovered:

packages/drag/src/kernel/session.ts:45

Potentially throwing operations include:

- getVisual
- createPlaceholder
- showPopover
- setPointerCapture
- onStart, onMove, or onCancel
- landingTiming
- HTMLElement.animate

Examples: packages/drag/src/draggable.ts:143, packages/drag/src/sortable.ts:162, packages/drag/src/sortable.ts:277.

A throw can leave the FSM in dragging or settling, with an open popover, anchor, capture, or temporary styles. Effects need an exception boundary with idempotent rollback. onError should itself be guarded and must not prevent the rejecting transition.

3. High — pending mouse tracking can be lost permanently.

Pointer listeners are attached only to the item/container:

packages/drag/src/kernel/pointer.ts:20

Pointer capture is acquired only after crossing the threshold. With a mouse, pressing near an edge and leaving the element before activation means later pointermove and pointerup events target another element. The session can remain pending indefinitely and reject future drags.

Pending tracking needs temporary document/window listeners, or capture must begin during pending and be released without interfering with normal clicks.

4. High — touchAction is applied too late to affect the gesture.

It is changed only after threshold activation:

- packages/drag/src/draggable.ts:143
- packages/drag/src/sortable.ts:162

The browser decides touch gesture behavior from the effective touch-action when the gesture starts. Applying it after movement begins cannot reliably prevent scrolling, so native panning may issue pointercancel before activation.

The policy must be installed before pointerdown, usually for the controller’s lifetime. Sortable should apply it to the configured handle rather than always to the item.

5. High — SortableController.move() computes incorrect indices.

packages/drag/src/sortable.ts:399

It uses the current index of destination.after without compensating for removal of the moved item. It also emits list.length when moving to the end.

For [A, B, C]:

- Moving A between B and C produces to: 2, but the final index is 1.
- Moving A to the end produces to: 3, while valid final indices are 0..2.

It also does not validate inconsistent or foreign neighbors. This is particularly important because move() is the intended keyboard/accessibility integration point.

6. High — authored transforms are discarded during dragging.

Both controllers replace the visual’s transform with a raw translation:

- packages/drag/src/draggable.ts:112
- packages/drag/src/sortable.ts:200

Although animateTranslate accepts a base transform, neither caller supplies one:

packages/drag/src/kernel/animation.ts:35

A rotated, scaled, skewed, or already-translated visual loses that transform for the gesture. Measuring its transformed bounding box, pinning that size, and then removing the transform can also resize or jump it.

Top-layer lifting solves transformed ancestor containing blocks, but not the visual’s own transform or the still-identity coordinate mapper.

7. Medium — items() is shaped like a live getter but used once.

options.items() is called only during construction:

packages/drag/src/sortable.ts:81

All later behavior uses the cached array until updateItems() is called. Consumers that update the value captured by the getter but omit updateItems() get stale hit testing and commit tracking.

Choose one clear API:

- items: readonly HTMLElement[] plus mandatory updateItems(), or
- A live items() getter that is reread at defined boundaries.

Having both is misleading.

8. Medium — updateItems() does not invalidate active geometry.

packages/drag/src/sortable.ts:393

It updates the array and notifies the commit tracker, but does not set rectsDirty or schedule remeasurement. Newly added items have no cached rect and are skipped, while resized or relaid-out items retain stale geometry.

At minimum, updateItems() should invalidate geometry. A ResizeObserver is needed if individual item size changes must be supported without an explicit update.

9. Medium — sortable accumulates global listeners after every drag.

Each activation registers new window scroll/resize listeners using the controller- lifetime signal:

packages/drag/src/sortable.ts:189

Cleanup does not remove them. After N drags, every scroll invokes N copies of invalidate(). Draggable already demonstrates the correct per-session AbortController approach.

10. Medium — Escape cancellation is usually unreachable.

The keydown listener is attached to the item/container:

packages/drag/src/kernel/pointer.ts:33

Generic dragged elements are often not focused, and pointer capture does not redirect keyboard events. Escape should be listened for on the owning document during an active session.

11. Medium — pointer ownership is correct in the FSM but leaks through effects.

Foreign pointer events correctly leave the FSM state unchanged. However, createSession runs effects even when previous === next, and the entry-point effects identify movement using only the state types and event type.

Consequently, a foreign pointermove can still trigger onMove or sortable repositioning using the owning pointer’s previous coordinates.

The transition boundary should skip effects for identity transitions, or expose explicit transition commands.

12. Medium — capture is not explicitly released.

Capture is acquired during activation but cleanup never calls releasePointerCapture. This matters for Escape, programmatic cancellation, and destruction while the pointer remains pressed.

Cleanup should safely check hasPointerCapture(pointerId) and release it.

13. Medium — disconnects are not observed.

Removing a pending item, active item, or sortable container does not directly transition the session. Depending on capture and current state, temporary DOM and asynchronous work can remain alive until another event, timeout, or explicit destroy().

The controller needs a connectivity policy—observer, lifecycle adapter, or checks at every asynchronous boundary.

14. Medium — cancellation reasons are discarded.

The public controller accepts cancel(reason?: unknown):

packages/drag/src/kernel/types.ts:126

Both implementations ignore the argument and always report 'canceled'. That is a direct type/runtime contract mismatch.

## Geometry and layout risks

When sortable uses an inner visual, the logical outer item may remain in layout while an additional anchor is inserted. This duplicates occupancy unless the item host happens to collapse, as Material X’s display: contents hosts do. The generic package does not document or enforce that assumption.

The placeholder uses the visual’s viewport dimensions as local CSS width and height:

packages/drag/src/sortable/anchor.ts:9

Under container scaling or zoom, viewport pixels and local CSS pixels differ. A 100px item rendered at 2× can produce a 200px anchor that is itself rendered at 2×. This means the current implementation does not yet support transformed sortable layouts despite the top-layer lift working better than the old trait.

Rejection and cancellation animate toward ORIGIN, meaning the activation-time viewport position. If the page, container, or original slot moves during the drag, the visual animates to the stale position and then snaps when cleanup restores normal layout.

## Performance

The broad strategy is reasonable:

- Pointer movement uses transforms.
- Sortable hit testing is frame-batched.
- Squared distances avoid unnecessary square roots.
- Item rects are cached.
- Full measurement happens mainly after insertion changes.

The main performance concerns are:

- Sortable’s duplicate global listeners.
- Draggable writes transform and then calls geometry(), which reads getBoundingClientRect(), potentially forcing layout on every pointer event.

- Scroll invalidation is not frame-coalesced for free dragging.
- Sortable performs an O(n) nearest-item scan and may synchronously remeasure all items after each boundary crossing. Reasonable for small/medium collections, but large lists should be benchmarked.

- getVisual() is repeatedly called for every measurement; caching it per item/ session would make both behavior and cost more predictable.

The build succeeds. Emitted entry files report 2.26 KB gzip for draggable and 2.59 KB for sortable, but because the build is unbundled those numbers exclude imported internal modules and should not be treated as final consumer bundle sizes.

## Consistency and maintainability

A few package-level inconsistencies stand out:

- Public examples import @ydinjs/drag/draggable, while the export map exposes only ./draggable.js. The documented path will not match exact package exports.

- Important types such as Point, CoordinateMapper, DragGeometry, FreeDropRequest, and ReorderRequest cannot be imported directly from public entry points.

- DragUpdate accepts all Partial<DraggableOptions>, but threshold and getVisual are captured at construction and do not actually update.

- update({position}) does not truly retarget an already-running WAAPI landing animation, despite its comment.

- resolveTarget, COMMIT_OBSERVED, ANIMATION_CANCELED, and several lifecycle payload types are currently unused. They look like unfinished architecture rather than useful kernel surface.

- type-fest is an unused runtime dependency.
- TypeDoc references nonexistent docs/api.ts, and the Justfile writes drag documentation into api/core: packages/drag/typedoc.json:5, packages/drag/ Justfile:18.

- The README contains only the license, leaving critical contracts—touch policy, controlled commits, updateItems, inner visuals, and destruction—undocumented.

The 500ms commit timeout is a reasonable safety valve, but its semantics need clarification. If no commit was observed, the item can return to its original persistent position while onFinish(item, true) still reports acceptance. Consider distinguishing “consumer accepted” from “commit observed” or “commit timed out.”

## What is particularly good

- The FSM is small, pure, readable, and independently tested.
- Assigning state before effects is the right reentrancy rule.
- Pending activation preserves ordinary clicks.
- Primary-button and pointer-ID checks fix major defects in the old trait.
- Sortable cancellation no longer silently commits DOM order.
- The engine correctly leaves persistent order to the consumer.
- Neighbor identity is better than relying only on stale indices for asynchronous commits.

- Inline style values and priorities are restored.
- Named-slot placeholders and aria-hidden are handled.
- Reduced-motion behavior is incorporated.
- Draggable and sortable sharing a kernel while remaining separate entry points is a sound package structure.

## Recommended priority

1. Fix destruction/exception-safe cleanup and explicitly release capture.
2. Fix pending pointer tracking and install touch policy before pointerdown.
3. Correct and test move().
4. Preserve authored transforms and define the coordinate-space milestone clearly.
5. Remove sortable listener accumulation and invalidate geometry on updateItems().
6. Make Escape/disconnect cancellation dependable.
7. Resolve the items()/updateItems() and update() API contracts.
8. Repair exports, public type exports, docs configuration, and README.
9. Add tests for every issue above before expanding geometry strategies.

Verification completed successfully: 40 tests, typecheck, lint, formatting, and build all pass.
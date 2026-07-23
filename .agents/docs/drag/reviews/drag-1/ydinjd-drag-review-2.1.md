## Findings

1. High — zoom on the visual itself still causes jumps and incorrect tracking. liftMatrix() excludes all zoom, while ancestorZoom() deliberately excludes the visual’s own zoom. The visual retains that zoom in the top layer, so matrix translations and pointer translations are scaled again.

   In a Chrome geometry probe with zoom: 2, a visual starting at (170,130) and dragged 40px landed around (350,210) instead of (210,130). Its size stayed stable, but its position and movement were wrong.

   See packages/drag/src/kernel/coordinate.ts:107, packages/drag/src/ draggable.ts:186, and packages/drag/src/sortable.ts:266.

2. High — authored transform transitions interfere with direct manipulation. If the visual has something like transition: transform 10s linear, changing style.transform to the lift matrix animates rather than applying immediately. Every pointer move then retargets that transition, causing an activation jump and severe drag lag.

   The lift snapshots neither transition nor transition-property: packages/ drag/src/kernel/lift.ts:36. Engine-controlled transform writes occur at packages/drag/src/draggable.ts:202 and packages/drag/src/sortable.ts:273.

   The active interval should suppress transform transitions while preserving and restoring the authored values and priorities.

3. Medium — fractional dimensions are rounded during lifting. offsetWidth and offsetHeight return integers. A 50.5px border box may therefore become 51px after lifting, with scale/zoom amplifying the difference. See packages/drag/src/kernel/lift.ts:147. The current distortion test uses an integral 50px box and cannot detect this.

4. Medium — existing open-popover state is not restored. The new code correctly restores the popover attribute, but always hides the popover and does not remember whether it was open before dragging. See packages/drag/src/kernel/lift.ts:193.

## What is working

The new strategy—pinning the untransformed layout box at the viewport origin and applying the captured local-to-viewport matrix—is the right fix. It no longer reapplies a transform to an already-transformed bounding box.

Additional browser probing confirmed correct rendered geometry and 1:1 pointer movement for combinations of:

- scale, rotation, and skew;
- custom transform origins;
- ancestor transforms;
- ancestor zoom.

The targeted draggable, sortable, and coordinate browser tests passed: 53/53. Typechecking also passed.

I’d consider #3 substantially fixed, but not complete until visual-owned zoom and authored transform transitions are handled. No files were changed during this review.
#### DRD-48 — `freeDrag`'s drop measures its drop targets and its bounds again before it resolves

**Status:** active, decided on 2026-11-12 by the architect on `DRF-22` ([assessment](../performance-drop-assessment.md) §4). Amends `DRD-33` choice 7. Amended the contract's `DRI-20` and `DRI-21` at `71f20df20`. **Implemented at `71f20df20`** ([report](../free-drag-drop-report.md) at `7cb2207ae`, [assessment](../free-drag-drop-assessment.md)), which closes `DRF-22`. The owner approved the reads at the drop and accepted +5 B Brotli on 2026-11-12 (`DRO-4`)

**`DRF-22` is decided. Before `freeDrag`'s drop resolves, the host marks its bounds and its drop-target tracker stale, through the `invalidate` members its scroll and resize listener already calls. So the drop clamps against a box read at the drop, and names the target under the release position in the tree at the drop, even after a scroll whose event hasn't reached the library yet. Drop targets aren't one list, so one target can't confirm the others, and every target is measured. No sample or frame reads more.**

Decided on 2026-11-12 by the architect, on `DRF-22` after `DRD-47`'s unit reported ([assessment](../performance-drop-assessment.md) §4). The owner asked for `DRF-22` to be assessed and the next bounded task prepared.

**Why:**

- **The window is the one `DRD-47` closed for `sortable`.** A scroll made after the browser's last rendering update dispatches its `scroll` event at the next update. A consumer's autoscroll usually scrolls in an animation-frame callback, so a release during it falls in that window after most frames. **Inferred from the HTML event loop, not measured.** W1 of `DRD-47` shows the window in all three engines for a scroll made in a `pointerup` listener.
- **The cache can be older than the screen.** When the autoscroll's callback runs after the library's frame, the user saw the scrolled tree, and the cached rects predate it. Keeping them doesn't resolve against what the user saw. The error is one frame's scroll, which names a neighbouring target whenever the release is that close to an edge.
- **One target can't confirm the others.** `targets()` returns any elements: in several scrollers, fixed or sticky ones that a scroll doesn't move, and overlapping ones whose order decides. `sortable`'s rows share one list, and `DRD-47`'s confirmation relies on that.
- **The cost is small and once per operation.** `DRD-47`'s run measures the full scan at about 1.2 µs per row, packing included. A target list is usually far shorter than a sortable list. The first read forces any pending style and layout, which the next frame would otherwise do. Under CONTRIBUTING §0 this is added work at the drop for correctness, so it is reported, and the owner may refuse it before the unit runs.
- **One signal reaches both caches.** The listener's body already invalidates the bounds and the tracker (`DRD-33`, "Invalidation reaches the operation"). A staleness flag only makes the next read measure (`DRD-33` C6), so an extra call at the drop is safe for any implementation. A third-party tracker or constraint receives it through the member it already implements, and no published type gains a member.

**Required properties:**

1. **Site.** In `FreeDragOperation.drop` (`free-drag/operation.ts:89–109` at `8eda874f0`), before the motion is computed and before the tracker's `drop()`, the bounds and the tracker are marked stale through their `invalidate` members. Samples, frames, the listener, activation, `settle`, the landing and `home` don't change. `dropTargets()` and `bounds()` don't change, except their documentation.
2. **Reads.** At a drop, `dropTargets` measures each target once, and `bounds` reads its element once or calls its function once. Without `targets` and `bounds`, a drop reads what it reads at `8eda874f0`. No sample or frame reads more.
3. **Behavior.** The request's `target` is the target under the release position in the tree at the drop, and the drop position is clamped by the bounds box at the drop, whether or not a scroll's event has arrived.
4. **Published types.** `DropTargetTracker` and `MotionConstraint` keep their members. The documentation of each `invalidate` names the drop among its callers.
5. **Contract and README,** in the same commit as the code:

   - `DRI-21`'s drop bullet becomes:

     > - **The drop.** The request's `target` is the target under the release position. The drop measures every target again before it resolves, so it sees a scroll whose event hasn't reached the library yet. It is `null` outside every target. A drop with no frame before it is resolved too.

   - `DRI-20` gets this sentence after "The request's `target` is DRI-21's, and `null` without `dropTargets`.":

     > With `bounds`, the drop reads the box again before it clamps the drop position.

   - A change record row names this decision and `DRF-22`.
   - The README's drop-target paragraph says that the targets are also measured again at the drop.

6. **Witnesses, each shown by a mutation it catches.**
   - **W3, the targets:** `freeDrag` with `dropTargets`, two or more targets in a scrolling container, and a drag with real input that waits a frame with the pointer over one target. A capture-phase `pointerup` listener on the window, added before the press, scrolls the container far enough that another target, or none, is under the release position. The request's `target` is the one under the release position after the scroll. **M3**, the tracker not marked stale at the drop, fails W3, and so does `8eda874f0`'s source.
   - **W4, the bounds:** `freeDrag` with an element `bounds` inside a scrolling container, and a drag that holds the visual clamped at the bounds' edge and waits a frame. The same kind of listener scrolls the container by more than a pixel. The drop position, as the request's `localDeltaX` or `localDeltaY` shows it, is the clamp against the box after the scroll. **M4**, the bounds not marked stale at the drop, fails W4.
   - The existing test "should re-read the targets after a scroll" and the census tests still pass.
7. **Measurement.** No `compare.ts` row reaches a `freeDrag` drop: "free drag, 300 moves, one frame each" reads its metrics before the release and composes neither capability. So the unit runs no paired comparison. A row for it is an instrument change, and the expected cost is far below any row's A/A bound. The unit counts the layout reads at one drop with ten targets and an element `bounds`, and runs the size table. The bytes are the owner's to accept (`DRD-33` C7, `DRD-40` property 6). "draggable alone" and the three `sortable` rows are the control and read 0.
8. **What it doesn't change.** `sortable`, `DRD-47`'s confirmation, the kernel, `judge`, every row, injection, floor entry and recorded reading. `DRF-21` isn't part of it. `DRD-45` property 9's repair is still owed before any `--prove` or `--floors`.

**Rejected:**

- **Keep the cache, and state the window outside the contract.** The cache can be older than the screen, and `sortable`'s drop now sees the pending scroll, so two built-ins would answer the same release differently.
- **Confirm one target, as `DRD-47` does.** Unsound for drop targets, as above.
- **Mark only the tracker stale, inside `dropTargets`' `drop()`.** It leaves `bounds` with the window, and a third-party tracker without the signal.
- **`elementsFromPoint` at the drop.** It skips `pointer-events: none` targets and honors clipping, which the mark's rect test doesn't, so the drop could disagree with the mark.
- **Record scroll offsets at measurement.** `DRD-47`'s reason: the library doesn't track scrolling ancestors, and a layout shift isn't a scroll.

**What this amends:**

- **`DRD-33` choice 7:** "the drop is always correct" now holds by measuring at the drop, and the choice carries a note.
- **The contract:** `DRI-20` and `DRI-21`, by property 5, when the unit lands.
- **The plan:** [`performance-plan.md`](../performance-plan.md) §2 P3 names [`free-drag-drop-handoff.md`](../free-drag-drop-handoff.md) as the next unit. It is a correctness unit inside the phase, and not an optimization unit under `DRD-46` property 8.
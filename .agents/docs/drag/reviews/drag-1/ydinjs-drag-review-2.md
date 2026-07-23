## Findings

1.    High — stale async results can settle a later drag session. Async onDrop/onReorder continuations use the controller-global transit without a per-session generation token. If session A is canceled while its promise is pending, session B can start; A’s eventual result can then accept or reject B when B reaches awaiting-commit. See packages/drag/src/draggable.ts:327 and packages/ drag/src/sortable.ts:315.

2.    High — destroy() is still not terminal in all re-entrant/animation cases. If onCancel or landingTiming calls destroy(), beginSettling() continues afterward and starts a new animation against already-restored DOM. Separately, canceling an existing animation resolves through pin(), which can write its final transform in a microtask after destruction cleanup. See packages/drag/src/draggable.ts:367, packages/drag/src/sortable.ts:387, and packages/drag/src/kernel/animation.ts:53.

      Rejected async callbacks also still call onError after destruction because the .catch() branches lack the destroyed guard used by .then(): packages/drag/src/ draggable.ts:361, packages/drag/src/sortable.ts:372.

3.    High — default top-layer lifting distorts visuals with authored transforms. The lift pins the visual to getBoundingClientRect() dimensions, which already include its transform, and then reapplies that transform. A 100px element with scale(2) is pinned at 200px and scaled again to roughly 400px. Rotation/skew have analogous distortion. Existing tests verify the transform string, not the rendered geometry. See packages/drag/src/kernel/lift.ts:115, packages/drag/src/ draggable.ts:224, and packages/drag/src/sortable.ts:209.

4.    High — SortableController.move() still calculates invalid indices. It uses the current index of destination.after without compensating for removal of the moved item, and uses list.length for an end insertion. For [A,B,C], moving A between B and C reports to: 2 instead of 1; moving A to the end reports 3 instead of 2. Foreign or contradictory neighbors are not validated. See packages/drag/src/ sortable.ts:551. There are no tests for move().

5.    High — exception-safe cleanup covers only synchronous transition effects. Draggable’s scroll/resize handler invokes bounds resolution and onMove outside the effect boundary. Sortable’s scheduled rAF performs measurement, consumer getVisual calls, and DOM movement outside it. A throw there strands the FSM in dragging, potentially retaining capture, popover, and placeholder. See packages/drag/src/ draggable.ts:207 and packages/drag/src/sortable.ts:181.

      Partial activation also remains unsafe: if createPlaceholder throws before styles are snapshotted, sortable cleanup restores from an empty snapshot and can remove authored inline styles.

6.    High — documented package imports do not resolve. Documentation and source examples use @ydinjs/drag/draggable and /sortable, but the export map exposes only ./draggable.js and ./sortable.js. Exact Node resolution produces ERR_PACKAGE_PATH_NOT_EXPORTED. See packages/drag/ package.json:5 and packages/drag/README.md:18.

7.    Medium-high — release coordinates are discarded. pointerup transitions to awaiting-commit without recording its clientX/clientY. Drop geometry and sortable insertion therefore use the last pointermove, even when release occurred elsewhere. This violates the “flush latest pointer position before drop” requirement. See packages/drag/src/kernel/fsm.ts:220.

8.    Medium — disconnect and resize lifecycle requirements remain unimplemented. There is no connectivity observer/check for item or container removal. Pending, dragging, or awaiting sessions can retain document listeners and temporary DOM until another signal or timeout. Sortable also only invalidates on window resize/ scroll or explicit updateItems(); individual item/container resizing and responsive relayout leave cached rectangles stale. See packages/drag/src/ sortable.ts:229.

9.    Medium — several geometry/integration cases remain incorrect.
      - The coordinate mapper walks only offsetParents, so scrolling in an intermediate static overflow ancestor is omitted: packages/drag/src/kernel/coordinate.ts:60.

      - Free-drag rollback accounts only for document scroll, not nested scrolling or general layout movement: packages/drag/src/draggable.ts:367.

      - Sortable rejects getHandle: item => item because the resolved item is excluded from the searched path slice: packages/drag/src/sortable/resolve.ts:25.

      - Lifting a pre-existing popover permanently removes its authored popover state: packages/drag/src/kernel/lift.ts:129.

      - An inner sortable visual leaves its host in layout while adding a placeholder, producing duplicate occupancy. The README acknowledges this, but it conflicts with the generic inner/shadow-visual requirement.

10.   Medium — draggable.update() exposes options it cannot update consistently. DragUpdate allows touchAction, handle, and lift. Touch action remains installed on the construction-time target, while changing lift during a session changes movement/settling math without changing how the current visual was lifted. See packages/drag/src/draggable/options.ts:68 and packages/drag/src/draggable.ts:493.

11.   Medium — runtime size budgets are not currently met or enforced. Minified consumer-bundle measurements using esbuild and gzip -9n:

      Entry Gzip Budget ━━━━━━━━━━━━━━━━━━━━━━━ ━━━━━━━━━ ━━━━━━━━━━━━━━━━━ Draggable 3,518 B 3 KB ─────────────────────── ───────── ───────────────── Sortable 3,708 B 5 KB ─────────────────────── ───────── ───────────────── Combined split output 6,368 B preferably 6 KB

     The build is unbundled, so its reported entry gzip sizes omit imported kernel

     modules. There is no automated size check in packages/drag/package.json:19.

12. Medium — published package contents are unnecessarily broad. npm pack --dry-run produced 72 files, 83,763 B compressed and 304,849 B unpacked because there is no files allowlist. Tests, stories, sources, configs, and source maps are included. The tarball also lacks both a license field and license text because the repository license is an escaping symlink.

## Previous review status

Meaningful progress has been made. Pending pointer tracking, early touch-action installation, foreign-pointer effects, capture release, Escape handling, listener accumulation, cancel reasons, geometry invalidation after updateItems(), public type exports, and README coverage were addressed.

Still unresolved or only partially resolved from review 1:

- destruction and asynchronous terminality;
- exception-safe cleanup;
- move() indices;
- transformed visual geometry;
- disconnect handling;
- exact package exports;
- automated size measurement.

## Verification

- Full test suite: 72/72 passed, 5 files.
- Typecheck: passed.
- Build: passed.
- Current coverage is notably missing move(), stale async results, destroy-during- settling, disconnects, actual item/container resize, transformed sortable visuals, touch/pen lifecycle, irregular/grid integration, and nested Shadow DOM cases.
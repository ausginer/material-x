# Checkpoint D first review — not ready to close

I reviewed the Phase 15–17 artifact against Checkpoint D in [`plan.md`](../plan.md), the parity ledger, the live 00–06 contract, the shipped `@ydinjs/drag` sortable, the public entrypoints, and the current test/measurement evidence.

The implementation is well covered and the full suite is green, but the checkpoint's exit condition is not met yet. There are four observable behavior/parity defects, an incomplete retained public surface, and source-of-truth documents that still describe the pre-keyboard, pre-`y()`/`xy()` artifact. The next free-drag phase should not start until the sortable findings below are fixed or explicitly reclassified in the ledger.

## Verdict

| Area | Verdict |
| --- | --- |
| D-33 authored-presentation acknowledgement | Accepted by this pass; no new lifecycle defect found |
| D-32 keyboard sorting | Keep open — admission invokes a public resolver twice |
| `y()` / `xy()` feature model | Structurally sound, but parity and diagnostics remain open |
| Sortable parity ledger | Keep open — retained behavior and exports are missing or contradictory |
| Checkpoint D | **Keep open** |

## D1 — major: keyboard admission invokes `getHandle` twice

`command.admit` first calls `resolveItem(event, snapshot)` to decide the keyboard insertion (`src/sortable/spec.ts:349-356`), then calls `admitFrom(event, draft)` (`:363`), which calls `resolveItem` again (`:149-160`). Every `resolveItem` invokes the consumer's `handle()` resolver (`:130-136`). A single keydown therefore calls `getHandle` twice, while the shipped command path and drag2's pointer path call it once.

This is observable, not just duplicate work. A stateful resolver can accept the first call and decline or throw on the second. More importantly, admission resolvers are explicitly allowed to queue `updateItems()`; the keyboard path currently queues that side effect twice and can reconcile through two snapshots for one native command. The existing handle-gating test (`tests/sortable/keyboard.browser.test.ts:372-383`) checks only the final admission result, so it does not catch the duplicate call.

Resolve the item/handle once, use that item both to compute `keyboardInsertion` and to seed the draft/resolve the visual, and add an exact-once regression including a resolver that dispatches an update.

## D2 — major: retained `visual()` geometry is not retained for insertion candidates

The parity ledger classifies shipped `getVisual(item)` as retained through `visual()` (`ledger.md:46`). The shipped rect index measures `getVisual(item).getBoundingClientRect()` for every non-dragged candidate (`packages/drag/src/sortable/rect-index.ts:86-108`). Drag2 uses the resolver only for the dragged item at admission; its shared `RectIndex` measures each candidate item directly (`src/sortable/rect-index.ts:89-103`).

For a collection whose visual is an offset or differently sized descendant, `y()` and `xy()` therefore search different centres from the shipped package and cross gaps at different pointer positions. Phase 8a recorded measuring the item as a deliberate implementation choice, but the later parity ledger still calls the capability retained and Checkpoint D requires every sortable parity row to be closed or explicitly declined.

Either restore candidate measurement through the installed visual resolver, or reclassify the row as a redesign/drop and document the exact consumer-visible loss. Until one of those happens, this is an open sortable parity item.

## D3 — major: `updateItems()` is not a no-op after `destroy()`

The retained controller row promises that `updateItems()` is a no-op after destruction (`ledger.md:31`). The current method validates and copies the input before dispatching to the already-closed host (`src/sortable/controller.ts:53-70`). Consequently, `controller.destroy(); controller.updateItems([item, item])` throws for duplicates instead of returning inertly. Valid calls also perform the copy and advance the private version even though the kernel drops the dispatch.

The shipped controller checks its closed latch before validation. Give the sortable controller an equivalent terminal check (shared by the public methods as appropriate), and pin both valid and invalid post-destroy `updateItems()` calls. Testing only that no action reaches the kernel misses the observable throw.

## D4 — moderate: reduced motion skips the settle-time duration callback

Phase 15 says `duration: () => number` is resolved **once per landing** and validated at settle time (`plan.md:691-702`). The shipped `landingTiming()` callback is likewise invoked before its result is adjusted for reduced motion. In drag2, the conditional duration expression returns `0` when `prefers-reduced-motion` matches and never calls `timing()` (`src/sortable/landing.ts:77-94`).

This contradicts the public option's documented call timing and suppresses both consumer side effects and a thrown/invalid result only for reduced-motion users. Resolve and validate the authored duration once first, then apply the reduced-motion collapse to the resolved value. Add coverage for a thunk under a matching media query, including its failure path.

## D5 — moderate: the retained sortable type exports are absent

The shipped sortable entry exports `AnimationTiming`, `DragSubject`, and `ReorderRequest`; the ledger retains those re-exports (`ledger.md:67`) and separately retains `DragSubject` as a shared type (`:177-179`). Drag2's `sortable.js` exports `ReorderRequest`, but not `AnimationTiming` or `DragSubject` (`src/sortable.ts:14-41`). A source-compatible type-only import promised by the ledger therefore fails.

The same ledger section also claims that `ResolutionContext`, `CancellationReason`, and public result discriminant constants are redesigned as named exports (`ledger.md:62,68,208-210`), while the frozen entrypoint exposes none of them. Some of those claims conflict with the later contract table, so this needs a decision rather than blindly adding names: either complete the ledger-promised surface, or reclassify each omitted name and state what a consumer loses. Checkpoint D cannot exit with the authority for parity disagreeing with the frozen public surface.

## D6 — moderate: the default landing easing differs from the retained value

The ledger explicitly retains the shipped default landing timing `{ duration: 200, easing: 'ease' }` and says `landing()` uses the same default (`ledger.md:185`). The implementation uses `DEFAULT_EASING = 'ease-out'` (`src/sortable/landing.ts:50-51`). Every consumer that installs `landing()` without an easing therefore gets observably different motion.

Use `'ease'`, or classify and document this as a deliberate redesign and add a test for the chosen default. It cannot remain both “retained” and different.

## D7 — moderate: the normative feature contract and parity ledger were only partially advanced to Phase 17

Contract 00 says documents 00–04 are normative, but contract 03 still declares `vertical(): SortableFeature`, calls it the only axis module, shows the exact minimal fixture importing `vertical()`, requires all non-pointer input to be absent, and publishes the pre-Phase-15 M-3 table (`contract/03-feature-composition.md:374-401,630-663`). Only the later export-topology section was amended to `y()`/`xy()`. Those statements now contradict the implementation, mandatory keyboard input, and the Phase 17 decomposition.

The parity ledger has the same partial-update problem: its 2-D section still says the public shape is deferred to Phase 17 and names the removed `sortable/vertical.ts` (`ledger.md:115-129`); it says `SortableController` retains three members despite Phase 15 adding `ready()` (`:61-67`); and it classifies admission resolver failures as `FAILURE_ACTIVATION` even though the kernel and test matrix correctly use `FAILURE_ADMISSION` (`:88`, `src/kernel/kernel.ts:700-708`).

Update or explicitly supersede the live normative sections and close the ledger's deferred Phase 17 shape. Historical plan/review prose can retain the old name as provenance; the documents declared as current authorities cannot give two executable readings.

## D8 — minor: Phase 17's diagnostics and evidence still name the removed axis

Assembly accepts either `y()` or `xy()`, but the missing-axis error says only `sortable: y() is required` and the test locks that wording (`src/sortable/assemble.ts:112-114`, `tests/sortable/assemble.browser.test.ts:249`). Use axis-neutral wording so a valid `xy()` composition is not described as missing the required feature.

The evidence map also points to the nonexistent `tests/sortable/vertical.browser.test.ts` (`tests/COVERAGE.md:27`), and the README's live size table still reports the pre-keyboard four-composition results — 9.34/10.11 kB and 29/33 modules — while the harness now includes `minimal (xy)` and measures 9.96/10.74 kB and 31/35 modules (`README.md:100-115`, `bench/size/measure.ts:98-169`). Refresh these claims so the next checkpoint can verify the tests and M-3 boundary from the documented artifact.

## Verification performed

From `packages/drag2`:

```text
npx just typecheck
  PASS

npx just test
  PASS outside the sandbox (the browser runner requires a local port)
  33 test files passed
  709 tests passed
  18 skipped
  no type errors

npx just size
  PASS
  minimal:       9.96 kB Brotli, 31 modules
  minimal (xy): 10.01 kB Brotli, 31 modules
  complete:     10.74 kB Brotli, 35 modules
```

The first sandboxed test attempt failed because the browser runner could not bind `0.0.0.0:9876`; the permitted rerun passed. No production or test source was changed during this review.
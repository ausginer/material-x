# The list's sortable items on `@ydinjs/drag` — implementation report

**Implemented 2026-11-21 by the implementer (Mx Implementer B)** on `repo/list-sortable-1`, against the [plan](list-sortable-plan.md) at `59650e176` and `repo:RD-31` with its sixth amendment, in the commit that adds this version of the report. The unit first stopped on a size bound at `88801757e`, and the architect ruled task 3a on it ([the readings](#the-readings-task-6)). Every stop bound now holds. The owner approved the unit, relayed by the coordinator. The unit continued on the plan's branch, so #90 is its pull request. The branch merges `origin/main` at `2b1d8276f`. `main` has since moved to `bd1dee7df`, and the branch doesn't merge it yet: it merges `main` once `RF-69` (#100) is there. `RF-68` (#92) is out of scope.

## What changed

- **core (task 5).** `src/traits/reorderable.ts` and `tests/traits/reorderable.browser.test.ts` are deleted, with the `./traits/reorderable.js` export, the `files.json` entry, the `.size-limit.json` row and the README section. `.agents/docs/architecture.md` no longer lists `Reorderable` among the shared traits. The plan didn't name that line, and it would have been false. The late-provider repair isn't here: it is `RF-69`'s unit.
- **`mx-sortable-list` (task 2).** `src/list/sortable-list.ts` defines it, with the `ReorderEvent` class, and is in `files.json`'s `runtime` list, `package.json`'s `exports`, `src/react.ts` and the custom-element manifest, which lists its `reorder` event and no attribute. It imports only `@ydinjs/drag/sortable.js`, `sortable/y.js` and `sortable/landing.js`.
- **The shared list core.** `src/list/ListCore.ts` holds the template, the `list` role and the styles that `mx-list` and `mx-sortable-list` share. The footprint rule matches `[data-drag-placeholder]`.
- **The plain list and the items (task 3).** `list.ts` loses the trait, the event and the landing's CSS props. `ListItemCore.ts` loses `useReorderableItem` and `enhanceHandle`.
- **The list and its items, through context,** as the rulings [How a static item takes focus](list-sortable-plan.md#how-a-static-item-takes-focus) and [Where the sortable writes live](list-sortable-plan.md#where-the-sortable-writes-live) have it (task 3a). `src/list/sortable-list-context.ts` holds the context token and the value's types, and no other runtime code. Its value is a writer, a function that `mx-sortable-list` provides. `src/list/sortable-item.ts` holds the writer's code and `handleOf`, the one handle rule: a child with `data-handle` in the `lead` or `trail` slot. Only `list/sortable-list` imports that module, and drag's `handle(item)` uses the same `handleOf`. When an item's context resolves, `ListItemCore` calls the value with its own host and control. If the providing list isn't the item's parent, the call writes nothing. Otherwise it writes on the item's own elements:
  - **with a handle:** `tabindex`, `role="button"`, the name _Reorder_, the description and `touch-action: none` on the handle;
  - **without a handle:** the description on its control, and for `mx-list-item` also `tabindex="0"` on its inner `.host`.

  The call returns an update, which the item runs on each `lead` and `trail` slot change, and a release, which the context effect's cleanup runs when the item disconnects. `ListItemCore` holds no description text, attribute name or record. A value the consumer set is kept: what the writer wrote on a handle or an interactive item's control is recorded, and only that is removed. `mx-list-item`'s inner `.host` has no other writer, so it needs no record. `mx-list-item` composes `FocusForwarding`, its root delegates focus, and it adds the focus indicator's styles. `FocusForwarding` is unchanged. **The element that takes focus is the inner `.host`,** and nothing is written on any item's host. The list keeps no registry and queries no item.

- **The dependency.** `@ydinjs/drag` `0.1.0` is an optional peer and a dev dependency of material-x, recorded with `aube install --fix-lockfile`. `aube add -D @ydinjs/drag@0.1.0` fails with _"package not found"_, because drag is a private workspace package that no registry has, so both fields were written by hand, as `@ydinjs/core`'s version is.
- **Builds.** The root `build` and `typecheck` now build drag before material-x, through Nx's `^build` on the new dev dependency: with drag's `sortable.d.ts` deleted, the root `build` wrote it again. The root `_package-builds` recipe now also builds drag, because material-x's tests and stories import it by name and resolve its build.
- **Stories (task 3).** `Draggable` moves to `mx-sortable-list`. `DraggableButtons` has button items and no handles, and `DraggableMixedHandles` has static items with and without handles. Their handlers are React state updates.
- **Docs (task 7).** The element's JSDoc covers the handle, the static item's tab stop, the arrow keys, `data-drag-ignore`, the event and the commit wait, and the peer. `list.mdx` has a _Sortable lists_ section, the element in its anatomy and API tables, and a delta that replaces _"Reveal, reorder, …"_.

## Departures from the plan

- **A disconnect destroys the controller, and a connect creates one.** The plan had a disconnect call `requestCancel()`, which raises `DragFault: drag: sortable/landing-placeholder-lost` when the list has left the document. The fifth amendment adopted destruction, and `drag:DRF-54` is proposed for the cancel. A destruction calls no `onEnd`, so the list clears the item's `drag` state itself.
- **The commit wait reads the slot directly.** After `reorder` is dispatched, the wait checks the slot's assigned elements at once and on each `slotchange`, so a synchronous commit in the handler settles without waiting for the event.
- **Two commands for the tests.** `tests/support/input-commands.node.ts` gains `pointerMove`, a move with the button held, and `emulateReducedMotion`, which is Playwright only. The reduced-motion row is skipped where the provider isn't Playwright (`RD-6` property 6).
- **The standing check builds material-x.** material-x's node project now has a global setup, `tests/support/build-package.node.ts`, which runs `tsdown` once per run, with `require-build.ts` raising a failed build, as drag's node project does. No project built material-x before, so a test over its built files needs it.

## Tests (task 4)

`tests/list/sortable-list.browser.test.ts` has the test map's material-x rows, 62 of them, against the real elements with real pointer and keyboard input. `traits-baseline` changes in exactly the four ways task 4 states: `Reorderable` leaves `TRAITS`, `mx-list` loses `reorderable`, `mx-sortable-list` is added with no attribute, and `mx-list-item` gains `FocusForwarding`'s flag, `focus` and the trait's symbol. Its observed attributes don't change.

- **The rows the context ruling adds:** a button item that gains a handle, and loses it again, moves the description between its button and the handle. An item moved into an `mx-list` loses what it wrote and keeps the consumer's `aria-label`. The items of an `mx-list` nested in a sortable item stay plain.
- **Definition order, with the markup parsed first,** in an iframe with its own registry. When `sortable-list.js` is evaluated first, the static item becomes a tab stop. When `list-item.js` is evaluated first, it doesn't until `RF-69`'s repair is on the base, so that row is `it.fails`: it turns red once the repair lands, and becomes an ordinary row then. **Every other row defines the list before its items connect,** as the coordinator directed until `RF-69` merges.
- **Runs:** `tests/list` in Chromium, Firefox and WebKit, three times in a row with the final source, 207 rows each time (69 per engine, 62 of them this file's), all passing, with the definition-order row failing as expected. Safari isn't run locally.
- **Rows that were wrong at first and were corrected before they counted:** the `data-drag-ignore` row and the row for another focused element in a handled item focused an element before its slot had laid it out, so focus didn't land and the second row passed for the wrong reason. Both now wait a frame and assert the focused element.

## The readings (task 6)

- **Size:** [before](checks/size-before-2b1d8276f.txt), at the merged `main`, and [after](checks/size-after.txt), with the table, the ablation's _no sortable code_ column, and the modules of each row. `list/list` 3,673 → 685 B, `list/list-item` 2,567 → 2,739 B, `list/list-button-item` 4,575 → 4,601 B, `list/list-link-item` 4,746 → 4,788 B, `list/sortable-list` 8,579 B, and `complete` 16,975 → 22,004 B. No plain list row contains a module of drag or box-quad, or `sortable-item.js`, and the description text is only in `sortable-list.js` and `sortable-item.js`. The before reading is new because `main`'s other packages changed since `e4b0e475d`: `complete` read 16.98 kB, against the plan's 16.93 kB.
- **The stop bounds.** At `88801757e` the interactive items grew by 266 B and 302 B, more than the plan's 150 B, because each item carried about 280 B of writes that only a sortable list runs. After task 3a they grow by 26 and 42 B. By ablation, the context consumer is 145 to 168 B of each plain item, and nothing else in it is the sortable list's. `list/list-item` reads 2,739 B, under 3.1 kB, and `list/sortable-list` 8,579 B, under 9.6 kB. Every row matches the ruling's estimates.
- **Accessibility, in Chromium** ([reading](checks/list-a11y-after.txt), [probe](probes/list-a11y.ts), extended to `mx-sortable-list` and to each focused element's own node). Read again after task 3a, and it is identical. The probe evaluates `list/sortable-list.js` first, because its markup is parsed before the bundle runs. With `list/list-item.js` first, the sortable list's items took no semantics at all, which is `RF-69`:
  - The tab order: `mx-list`'s button item and link item, then the sortable list's handle, its handle-less static item and its button item. `mx-list`'s static items and its `[data-handle]` take no tab stop, and the handle there is plain text.
  - The handle: `button`, named _Reorder_, described _Use the arrow keys to move_.
  - The handle-less static item: its inner `.host`, `generic`, named by its text, _"Sortable static without handle"_, described _Use the arrow keys to move_. `RF-68`'s fix isn't on the base, so it isn't a `listitem`.
  - The handle-less button item: its `<button>`, with the same description.
- **The focus reading** that the ruling rests on: [probe](probes/item-focus.browser.test.ts) and [reading](checks/item-focus.txt), at `be89be254`.
- **The standing check:** `tests/package-entries.node.test.ts` follows each runtime entry's static imports through the built files and the `@ydinjs` packages' published files. With a temporary `import '@ydinjs/drag/sortable.js'` at the top of `list.ts`, _"should not reach @ydinjs/drag from list/list"_ fails, and with it reverted all 19 rows pass. The proof was run again after task 3a ([proof](checks/standing-check-proof.txt)).

## Verification

On the final source, after task 3a:

- `handoff.md`'s format and lint loop on every changed `.ts` file: clean.
- `tests/list` in Chromium, Firefox and WebKit, three runs in a row: 204 rows pass each time, and the definition-order row fails as expected in each engine. Every row is unchanged by task 3a, and `traits-baseline` passes unchanged in all three engines.
- material-x's whole suite (`just test`, Chromium and node): 507 rows pass, and the definition-order row fails as expected. The node project includes the standing check's 19 rows.
- core's suite: 260 rows pass.
- material-x's `just typecheck`, and the root `just typecheck`, `just typecheck-declarations` and `just docs-build`: all pass.
- The accessibility probe and the standing check's mutation proof: run again, above.
- Not run: Safari.

## After `RF-69` — 2026-11-21

**By the implementer,** on the coordinator's request once #100 merged into `main` at `87fc2d2db`. This is the first part of the follow-up that the RF-69 bullet under _Open_ names. `RF-68`'s knock-on (#99) isn't part of it.

- **The merge,** `5194f5069`, takes `origin/main` into this branch. Its one conflict was in `.plan/00-index.md`, where this branch's `RD-31` and `main`'s `RD-32` and `RD-33` were added at the same place. All three entries are kept, in that order.
- **The consumer,** `f354bbaf8`. `ListItemCore` passes `SORTABLE_LIST_ELEMENTS`, `['mx-sortable-list']`, to `useContext`, as [revision 2's decision 6](../context-late-provider-1/context-late-provider-handoff-r2.md#6-the-callers) says. The constant is beside `SORTABLE_LIST_CTX` in `sortable-list-context.ts`, and that module's JSDoc now names it. An item whose parent is anything else, `mx-list` included, still requests synchronously.
- **The definition-order row** _"should make a static item a tab stop when list-item.js is evaluated first"_ is now `it`, and its comment about `RF-69` is gone. It passes in Chromium, Firefox and WebKit. With the wait removed from core's `useContext`, or with `SORTABLE_LIST_ELEMENTS` empty, it fails in each engine, while the row that evaluates `sortable-list.js` first still passes ([output](checks/rf69-order-mutations.txt)). Both mutations were reverted.
- **Sizes** against `main` at `87fc2d2db` ([reading](checks/size-after-rf69.txt)), Brotli bytes:

  | Row | `main` | Before this merge | After | Against `main` | Bound |
  | --- | --: | --: | --: | --: | --- |
  | `list/list` | 3,673 | 685 | 685 | −2,988 | doesn't grow |
  | `list/list-item` | 2,567 | 2,739 | 2,828 | +261 | ≤ 3,100 |
  | `list/list-button-item` | 4,575 | 4,601 | 4,667 | +92 | ±150 |
  | `list/list-link-item` | 4,746 | 4,788 | 4,885 | +139 | ±150 |
  | `list/sortable-list` | — | 8,579 | 8,579 | new row | ≤ 9,600 |
  | `complete` | 17,079 | 22,004 | 22,144 | +5,065 | — |
  - Every bound holds. `list/list-link-item` is 11 B inside its bound.
  - The items grow by 66 to 97 B over the branch's reading before the merge, because their consumer now carries `RF-69`'s wait and the name. The button rows grew by a similar amount under `RF-69`. `list/list` and `list/sortable-list` don't move. Every row outside the list reads as on `main`.
  - _Before this merge_ is the [earlier reading](checks/size-after.txt), on `main` before `RF-69`. Its `main` column read `complete` as 16,975.

- **Gates** ([output](checks/rf69-gates.txt)):
  - material-x's browser suite with `MX_TEST_ENGINES=chromium,firefox,webkit`: 848 rows pass, and the one expected failure fails as expected. That row is `button.browser.test.ts`'s Firefox row (`RF-33`), not this branch's.
  - The root `aube exec just test`: 151 files and 2,467 rows pass. These include the standing check over the built entries.
  - `fmt`, `lint-fix`, `fmt` and `lint` on the three changed files, and material-x's `typecheck`: clean.
- **Not rerun:** the accessibility probe, which still evaluates `list/sortable-list.js` first, and Safari.

## `reviewer-1` of the feature proof — 2026-11-21

**By the implementer,** on [`reviewer-1`](../reviews/list-sortable-1/feature-proof-claude.md#reviewer-1) of the feature proof at `586a99e60`, relayed by the coordinator. No decision changes, and drag's source doesn't change.

- **The defect.** With the markup parsed first and `list/sortable-list.js` evaluated before `list/list-item.js`, the list's first `slotchange` sees items that aren't upgraded yet, so its collection is empty. An upgrade fires no `slotchange`. The items became tab stops and didn't move, by keyboard or by pointer.
- **The fix,** `6921f9aa9`, in `sortable-list.ts`: when an item resolves the list's context and isn't in the collection yet, the provider's writer reads the slot again before it applies the item's semantics. The read is the one the slot callback already runs, and it calls `invalidate()` only when the collection changed. It goes through the existing context link, so the list still keeps no registry. An item that the slot callback already found pays one `includes` per lookup.
- **The rows.** The definition-order block gains four rows, in which two items are parsed and both modules are evaluated: a keyboard move (`ArrowDown` on the focused first item) and a pointer move (a drag from the first item onto the second). Each runs once with `sortable-list.js` first and once with `list-item.js` first, and asserts the dispatched moves, `[[0, 1]]`. The two tab-stop rows are unchanged. The block's frames are now removed at the end of each row.
- **Witness** ([output](checks/order-move-mutations.txt)), in Chromium, Firefox and WebKit:
  - **The fix reverted:** both `sortable-list.js`-first move rows fail in each engine, and the other four rows pass.
  - **Core's definition wait removed:** the `list-item.js`-first tab-stop and keyboard rows fail in each engine.
  - **With the fix:** all six rows pass in each engine.
  - **What isn't witnessed.** No mutation fails the `list-item.js`-first pointer row. In that order the items are upgraded when the slot callback runs, so a pointer drag needs neither the fix nor the wait. The row shows that the move holds in that order.
- **Sizes** against `main`'s merge base `87fc2d2db` ([reading](checks/size-after-reviewer-1.txt)), Brotli bytes. `origin/main` is at `9377c7e1d`, which changes only `CONTRIBUTING.md`.

  | Row | `main` | Before the fix | After | Against `main` | Bound |
  | --- | --: | --: | --: | --: | --- |
  | `list/list` | 3,673 | 685 | 685 | −2,988 | doesn't grow |
  | `list/list-item` | 2,567 | 2,828 | 2,828 | +261 | ≤ 3,100 |
  | `list/list-button-item` | 4,575 | 4,667 | 4,667 | +92 | ±150 |
  | `list/list-link-item` | 4,746 | 4,885 | 4,885 | +139 | ±150 |
  | `list/sortable-list` | — | 8,579 | 8,605 | new row | ≤ 9,600 |
  | `complete` | 17,079 | 22,144 | 22,092 | +5,013 | — |
  - The fix is in `list/sortable-list` only, and the item rows don't move.
  - `complete` reads 52 B smaller although `list/sortable-list` grew by 26 B. This wasn't explained, and no ablation was run.

- **Gates** ([output](checks/reviewer-1-gates.txt)):
  - material-x's browser suite with `MX_TEST_ENGINES=chromium,firefox,webkit`: 860 rows pass, and the one expected failure is `button.browser.test.ts`'s Firefox row (`RF-33`).
  - The root `aube exec just test`: 151 files and 2,471 rows pass.
  - `fmt`, `lint-fix`, `fmt` and `lint` on the two changed files, and material-x's `typecheck`: clean.
- **Not run:** Safari.

## Open

- **`RF-69` (#100):** merged and taken in, as _After `RF-69`_ says. The definition-order row passes. The accessibility probe wasn't rerun in the other import order.
- **The disconnect departure** is in the fifth amendment and `drag:DRF-54`'s proposal.
- **A pre-existing mismatch, not changed:** `mx-list-item`'s JSDoc names its slots `start` and `end`, and its template names them `lead` and `trail`. The plan's ruling says `start` and `end`. The code and the JSDoc of `mx-sortable-list` use the template's names.
- `RF-36` closes with this unit, as property 8 says. Its rows and the code they tested are deleted.
- The owner's acceptance of the unit, and the merge of #90.
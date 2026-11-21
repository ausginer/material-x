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

## Open

- **`RF-69` (#100):** once it is on `main`, this branch merges `main`, the definition-order row's `it.fails` becomes `it`, and the accessibility probe's import order no longer matters.
- **The disconnect departure** is in the fifth amendment and `drag:DRF-54`'s proposal.
- **A pre-existing mismatch, not changed:** `mx-list-item`'s JSDoc names its slots `start` and `end`, and its template names them `lead` and `trail`. The plan's ruling says `start` and `end`. The code and the JSDoc of `mx-sortable-list` use the template's names.
- `RF-36` closes with this unit, as property 8 says. Its rows and the code they tested are deleted.
- The owner's acceptance of the unit, and the merge of #90.
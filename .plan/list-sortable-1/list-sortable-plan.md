# The list's sortable items on `@ydinjs/drag` — plan

**Status: planned, waiting for the owner's answers to [Q1 to Q3](#questions-for-the-owner).** The architect wrote this plan on 2026-11-20 at `e4b0e475d` (`origin/main`), on `repo/list-sortable-1`, for the coordinator's task on issue #86. The owner asked for it in these words: _"reorderable in core needs to be replaced with our new shiny drag, with a separate import for List where sortable items are needed"_. The decision is [`repo:RD-31`](../00-index.md). Where the entry and this plan differ, the entry governs. `RD-30` is the highest decision number on any branch on `origin` (`core/side-effects-1`), so `RD-31` is the next free number.

The plan is repository-level because the work changes three packages: it deletes code from `core`, adds code to `material-x`, and makes `material-x` depend on `drag`.

## Readings

Read by the architect at `e4b0e475d`.

**Core's trait.** `packages/core/src/traits/reorderable.ts` (1,265 lines) is published as `@ydinjs/core/traits/reorderable.js`. It exports `Reorderable` (a `reorderable` boolean attribute trait), `ReorderEvent`, `useReorderable`, `useReorderableItem`, `ReorderableProps` and `AnimationTiming`.

- **Pointer drag.** After an 8 px threshold, the item's visual goes into the top layer, and a `[data-footprint]` placeholder follows the nearest item center. The rule has no axis, so rows and grids work too.
- **Handle.** A press must land on the item's `[data-handle]` when the item has one. An item with no handle drags by its whole surface.
- **Keyboard: a grab mode.** Space or Enter on a handle grabs the item. Arrow keys move it one slot at a time. Space or Enter drops it, Escape cancels, and Tab cancels. A handle is required. Every step is announced through an `aria-live="assertive"` region in the host's shadow root. Pointer drops aren't announced.
- **The event.** A cancelable, bubbling, composed `reorder` event (`item`, `from`, `to`). The consumer commits the move, and the trait never moves the DOM. The landing starts when the event is dispatched. The session waits until the slot shows the move, or for at most `COMMIT_TIMEOUT` (500 ms) after the landing. `preventDefault()` makes the item land home.
- **State.** The item has the custom state `drag` while it is lifted. After a pointer drop the state is cleared when the landing starts, and after a keyboard drop it is cleared at the end of the commit wait.
- **Lifecycle.** A disconnect ends the session. A press while a landing is settling is ignored.

**material-x's use.**

- `src/list/list.ts` composes `Reorderable`, so `mx-list` has a `reorderable` attribute. It calls `useReorderable(this, cssProps)` with `--_drag-duration` and `--_drag-easing` as the landing's timing. Its `ListEvents` is `{ reorder: ReorderEvent }`.
- `src/list/ListItemCore.ts` runs in every list item. It calls `useReorderableItem(host, target)` to register the inner `.host` element as the visual. Its `enhanceHandle` gives a slotted `[data-handle]` `tabindex="0"`, `role="button"`, `aria-label="Reorder"` and `touch-action: none`, unless the consumer set them. So a `[data-handle]` in a list that doesn't reorder is announced as a _Reorder_ button that does nothing.
- The item's host is `display: contents`, so the visual must be the inner `.host`. The list's `:host` is a flex column with a `gap`. `::slotted([data-footprint])` styles the placeholder from `--_footprint-color` and `--_footprint-opacity`.
- `list.stories.tsx`'s `Draggable` story uses `reorderable`, `onreorder` and `data-handle`.
- `tests/traits-baseline.browser.test.ts` imports core's `Reorderable` into its `TRAITS`, and `__snapshots__/traits-baseline.json` records `mx-list`'s `reorderable` attribute.
- `list.mdx` doesn't describe reordering.

**What else depends on core's trait: nothing.** A search of the tree outside `.plan/` finds core's `package.json` export, its `files.json` entry, its `.size-limit.json` row, its README section and its test file, and the four material-x files above. No other package, script, workflow or configuration names it. **core is on no registry** (nothing `@ydinjs` is published yet; `RD-27`). So `CONTRIBUTING.md` §8 applies: the export is deleted completely, with no alias. `AnimationTiming` has no other user.

**drag's sortable**, as its source and README describe it at `e4b0e475d`:

- `sortable(root, config)` takes `items()`, `axis`, `onReorder`, and optionally `onStart`, `onEnd`, `threshold`, `handle`, `visual`, `box`, `placeholder`, `landing` and `displacement`. It returns `invalidate()`, `requestCancel()` and `requestDestroy()`. `items()` is pulled at each press and command and again at activation. The consumer calls `invalidate()` when the collection changes during a drag.
- **`onReorder(request, { signal })` decides,** and it may return a promise. The request has `item`, `from`, `to`, `previous` and `next`. After an accepted verdict, the visual lands where the item is in the DOM at that moment (`SortableOperation.#landingTarget`). So a commit made before the verdict resolves lands the item at its new slot, and an accepted verdict with no commit lands it home.
- **Keyboard: one command per key press.** An arrow key on the item, or on its handle when `handle` is given, moves the item one slot. The move is proposed through `onReorder` and dropped immediately. At the collection's edge the key isn't admitted and keeps its native meaning. Escape cancels. There is no grab mode (`sortable/keyboard.ts`, `SortableBehavior.command`).
- **Focus:** the kernel gives focus back to the element inside the item that had it, so a second arrow press works after a reorder (`drag:DRD-9`). The README's _Focus_ item says: _"You own `tabindex`, roles and any announcement of the new order."_
- **`handle(item)`** gates pointer presses and keyboard commands alike. When it returns `null`, the item isn't admitted.
- **The placeholder** has `data-drag-placeholder`, is `aria-hidden`, gets the item's `slot`, and is sized inline. The library writes no other styling.
- **`y()`** accepts a flex column with a `gap`.
- **`landing()`** from `sortable/landing.js` gives the landing zero duration under `prefers-reduced-motion: reduce`. A custom timing is `{ ...landing(), timing }`.
- **Nesting:** an event that one controller admitted is offered to no other, _"within one copy of the library"_ (`drag:DRD-17`).
- **Size:** "sortable + y" is 6,533 B Brotli at `988643dc9` (`drag:DRD-68`). That row has no landing. The size of material-x's list rows is read by task 1.
- **`drag` is `private`,** at `0.1.0`, and depends on `@ydinjs/box-quad` `1.0.0`.

**Open findings this work touches.**

- `repo:RF-36`: in Safari, two rows of core's trait sometimes keep the visual in the top layer after the drop. Both rows are skipped in Safari, the cause isn't established, and #44 tracks it.
- `drag:DRF-49`: in Safari, the `y()` sweep through `box` with a `visual` sometimes stalls until its timeout. The row is skipped in Safari. That is the configuration the sortable list uses.
- `RD-30`, on `core/side-effects-1` and not yet on `main`, counts the 27 core modules at `e4b0e475d`, and `traits/reorderable` is one of them. Whichever branch merges second updates the count.

## What drag covers, and what the list adds

| The list needs | drag gives | The sortable list adds |
| --- | --- | --- |
| Reordering a column by pointer | `sortable` with `y()` | — |
| A visual inside the item's shadow root | `visual(item)` | The item's inner `.host` |
| Dragging by a handle | `handle(item)` | The item's `[data-handle]` |
| Reordering from the keyboard | One arrow command per key press, focus kept | Nothing, if [Q2](#questions-for-the-owner) is (a) |
| Announcing the new position | Nothing: the consumer's job | A live region in its shadow root |
| A `reorder` event that the consumer commits | An `onReorder` that may resolve later, with a `signal` | Dispatching the event, and waiting until its slot shows the move |
| The `drag` state for elevation | `onStart` and `onEnd` | Setting and clearing the state |
| Landing timing from CSS custom properties | A custom `timing` on `landing()` | Reading `--_drag-duration` and `--_drag-easing` |
| Ending a drag on disconnect | `requestCancel()` | Calling it |
| Items added or removed during a drag | `invalidate()` | Calling it when its items change |
| A handle for keys while the whole surface takes the pointer | Not available | Nothing, if [Q3](#questions-for-the-owner) is (a) |

**Nothing in drag is missing for the recommended answers.** drag changes only if the owner chooses (b) for Q2 or Q3.

## Decided here

`repo:RD-31` records these as properties. This section explains them.

### 1. Core's trait goes

The module, its export, its `files.json` entry, its size row, its README section and its test file are deleted. Nothing in core replaces them. Core keeps `attribute-traits`, `useEvents` and `useSlot`, which other code uses.

### 2. Sorting is a separate element in a separate entry (Q1)

`@ydinjs/material-x/list/sortable-list.js` defines `mx-sortable-list`, whose class `SortableList` is the module's default export. It renders and styles like `mx-list`: same template, slot, role, parts, CSS custom properties and tokens. `mx-list` doesn't sort, and it has no `reorderable` attribute and no `reorder` event. Both elements take the same item elements.

- **Why an element and not a switch on `mx-list`.** A side-effect import that makes `mx-list` sort when the import is present depends on evaluation order. `list/list.js` defines `mx-list` when it is evaluated, and the browser upgrades every `mx-list` already in the document at that moment. A module that imports `list.js` and then adds sorting is evaluated after that upgrade, so those lists never sort. An attribute that works only after an import also fails silently when the import is missing.
- **Why not a function** such as `sortableList(element)`: HTML and framework users would need a reference and an effect for each list. An element is declarative: the custom-element manifest picks it up, and `src/react.ts`, which is maintained by hand, gets one more entry.
- **The published declarations name no drag type.** `react.d.ts` imports the types of every element, so a type from `@ydinjs/drag` in `sortable-list.d.ts` would make `react.d.ts` fail to resolve for a consumer who hasn't installed drag. The event class and the element's types are material-x's own.
- **Turning sorting off** needs no attribute: an item with no handle isn't dragged (section 4). To lock a list for a moment, a consumer can cancel the event.
- The two elements share one list core, as the list items share `ListItemCore`. `SortableList` doesn't have to extend `List`.

### 3. A list that doesn't sort carries no drag code

Only `list/sortable-list` imports `@ydinjs/drag`. No module that another runtime entry reaches imports it, directly or through another module. That includes the list items, so `useReorderableItem`'s registry and `enhanceHandle` leave `ListItemCore`. A standing test checks the import graph of the built package (task 6), so the property can't regress silently. A size reading proves the effect once (task 6).

### 4. The sortable list's behavior

- **The collection** is the list's slotted item elements in slot order, as a new array after each change. The placeholder isn't an item. During a drag, the list calls `invalidate()` once its slot shows a changed collection. A slot change that changes only the placeholder isn't a collection change, so moving the placeholder doesn't make drag measure the rows again.
- **Handle (Q3).** An item is dragged by its `[data-handle]` element, by pointer and keyboard, and an item with no handle isn't dragged. It is still displaced by the others.
- **Handle semantics.** In a sortable list, a `[data-handle]` gets `tabindex="0"`, `role="button"`, the accessible name _Reorder_ and an accessible description that names the arrow keys, and `touch-action: none`. Values the consumer set are kept, as today. This also applies to a handle added to an item after the item is slotted. In `mx-list`, nothing is written to a `[data-handle]`.
- **Keyboard (Q2).** drag's command model: an arrow key on a focused handle moves the item one slot and proposes the move, and the key is inert at the edge. Focus stays on the handle.
- **The `reorder` event** is dispatched on the list from `onReorder`. It bubbles, is composed and is cancelable, and it carries `item`, `from`, `to`, `previous` and `next`. `previous` and `next` are the items on either side of the new slot. So `list.insertBefore(event.item, event.next)` applies the move, even while the placeholder is a child of the list. `preventDefault()` rejects the move, and the item lands home. The event class is material-x's own, exported from the entry as a type and a class.
- **The commit wait.** If the event isn't canceled, the verdict is accepted once the list's slot shows `item` at `to`. The consumer may commit synchronously in the handler or later, for example in a framework render. The item stays lifted until then. If the slot doesn't show the move within a bound, the verdict is accepted anyway, and the item lands where the DOM has it. The bound is a named constant, 500 ms as today. An aborted `signal` ends the wait.
- **Announcements.** Each accepted move is announced through a live region in the list's shadow root. The announcement names the item's new position and the number of items, for example _"Item 3 of 5."_ drag doesn't tell its callbacks whether a pointer or a key started the drag, so pointer moves are announced too. That is a change from today, where only keyboard steps were announced.
- **State.** The item has the custom state `drag` from `onStart` to `onEnd`, however the drag ends.
- **Placeholder.** The list's footprint rule matches `[data-drag-placeholder]` and keeps today's shape, color and opacity.
- **Landing.** Composed from `sortable/landing.js`, with a timing that reads `--_drag-duration` and `--_drag-easing` at each landing. Under `prefers-reduced-motion: reduce`, the landing has zero duration, as `landing()` gives. No `layoutAnimation`: the other rows move without animation, as today.
- **Lifecycle.** One controller per list for the list's life. A disconnect cancels the operation, and a reconnected list sorts again. If drag's controller holds a listener outside the list between operations, the list destroys it on disconnect and creates a new one on connect.

### 5. drag is an optional peer of material-x

`CONTRIBUTING.md` §Dependencies of a published package, question 2: the package must share the consumer's copy. `drag:DRD-17`'s nesting rule holds within one copy of drag, so a sortable list inside a consumer's own drag sortable would see one press admitted twice with two copies. Only an optional entry imports drag, so `peerDependenciesMeta` marks it optional. The workspace installs it in material-x's `devDependencies`. A consumer that doesn't use `mx-sortable-list` installs nothing new. box-quad comes in through drag's own `dependencies`. The peer's range is set at material-x's release, under `RD-27` property 1 and the peer rules. Until then, it names the workspace version.

### 6. Behavior tests move to material-x

Core's suite tests the trait through a synthetic host. Its rows that describe the list's behavior become rows of the real `mx-sortable-list`, with real browser input. Rows that test drag's own mechanics are covered by drag's suite and aren't copied. Rows for behavior that no longer exists are deleted. The [test map](#test-map) lists every row.

### 7. RF-36 ends with the code it is about

Both of `RF-36`'s rows and the code they test are deleted. The finding closes with its cause unknown, because the code no longer exists. Its required property doesn't carry over to the new rows. A Safari stall in a sortable-list row is either `drag:DRF-49` or a new finding.

### 8. Release order

- **box-quad, then drag: unchanged.** This plan changes no drag source under the recommended answers, so drag's release (#57) doesn't wait for this work, and drag's size ceilings don't move.
- **material-x's release now also comes after drag's.** `RD-27` property 1 requires every `@ydinjs` dependency to be on the registry at the dependent package's release. drag's version at that point is the owner's answer at drag's release, and material-x's peer range follows it.
- **This work doesn't wait for drag's release:** material-x uses drag's workspace build.
- **If the owner chooses (b) for Q2 or Q3,** drag gains an API before material-x can use it. That change should land before drag's first release, or it becomes drag's first change after release. Then #57 should wait for it.

## Questions for the owner

Implementation waits for the answers. Each one changes what is built.

**Q1. What does a consumer import to get sortable items?**

- **(a) Recommended:** a separate element, `<mx-sortable-list>`, from `@ydinjs/material-x/list/sortable-list.js`. `<mx-list>` stays as it is, without sorting. Switching a list between the two means a different tag.
- (b) A side-effect import, `@ydinjs/material-x/list/sortable.js`, after which `<mx-list reorderable>` sorts. A list that is already in the page when `list.js` loads never sorts (see [section 2](#2-sorting-is-a-separate-element-in-a-separate-entry-q1)), and the attribute does nothing if the import is missing.
- (c) A function to call on a list, `sortableList(listElement)`. It isn't declarative: React and HTML users need a reference and an effect for each list.

**Q2. Keyboard reordering: drag's model, or today's grab mode?**

- **(a) Recommended:** drag's model. An arrow key on the focused handle moves the item one slot, and each move is committed and announced. Space and Enter do nothing. No drag change.
- (b) Today's model: Space grabs, the arrows move, Space drops and Escape cancels. drag gains a grab mode before its release.

**Q3. Does an item need a handle?**

- **(a) Recommended:** yes. An item is dragged only by its `[data-handle]`, by pointer and keyboard. Today an item with no handle can be dragged by its whole surface with a pointer. No drag change.
- (b) Keep dragging by the whole surface for items with no handle. drag can't do that without a change: its `handle` gates pointer and keyboard together, so arrow keys anywhere in a handle-less item, including in a text field, would move the item. drag would gain a way to require the handle for keys only.

**Not a question here:** neither core's trait nor drag offers a way to reorder without dragging, such as move buttons, which WCAG 2.2 §2.5.7 asks for. This plan neither adds one nor removes one.

## Implementation

One unit, on a branch from `main`, after the owner's answers. If an answer is (b), the architect amends this plan before the unit starts. Use the `test-component` skill for every material-x test.

**Task 1. The reading before.** Before any change, build and run `aube exec just size` in `packages/material-x` and `packages/core`. Save the transcript to `.plan/list-sortable-1/checks/size-before.txt`. Also save, for `list/list`, `list/list-item` and `complete`, the list of modules that the size bundle contains. Any bundling of the built entry with rolldown that lists the modules will do. Name the commit.

**Task 2. The sortable list.** Add `src/list/sortable-list.ts`, which defines `mx-sortable-list` with the behavior in [section 4](#4-the-sortable-lists-behavior). Add it to `files.json`'s `runtime` list, to `package.json`'s `exports`, and as an optional peer and a dev dependency on `@ydinjs/drag` (section 5). Import only drag's public entries: `sortable.js`, `sortable/y.js` and `sortable/landing.js`. Add the tag to `src/react.ts` with its `reorder` event, and check that the custom-element manifest lists both. Check that the built `list/sortable-list.d.ts` and `react.d.ts` contain no `@ydinjs/drag` specifier. Check that the root `build` and `typecheck` build drag before material-x.

**Task 3. The plain list and the items.** Remove `Reorderable`, `useReorderable`, `ReorderEvent` and the CSS props for the landing from `list.ts`. Remove `useReorderableItem` and `enhanceHandle` from `ListItemCore.ts`. Move the `Draggable` story to `mx-sortable-list`. Its handler may stay a React state update, which the commit wait allows.

**Task 4. Tests.** Write the material-x rows in the [test map](#test-map), in `tests/list/`. They run in the gate's engines. A row that needs media emulation, such as the reduced-motion row, runs only where the engine supports it (`RD-6` property 6). Update `traits-baseline` as follows, and in no other way: `Reorderable` leaves `TRAITS`, `mx-list` loses `reorderable`, and `mx-sortable-list` is added.

**Task 5. Remove core's trait.** Delete `src/traits/reorderable.ts`, `tests/traits/reorderable.browser.test.ts`, the `./traits/reorderable.js` export, the `files.json` entry, the `.size-limit.json` row and the README section. Rebuild core before typechecking material-x.

**Task 6. The reading after, and the standing check.**

- Run `just size` again in both packages. In `.plan/list-sortable-1/checks/size-after.txt`, tabulate `list/list`, `list/list-item`, `list/list-button-item`, `list/list-link-item`, `list/sortable-list` and `complete`, with the reading before beside each. Give the reason for each change.
- Save the module lists again, and add `list/sortable-list`'s. **Required:** no module under `packages/drag` or `packages/box-quad` is in any row except `list/sortable-list` and `complete`, and none of the four plain list rows grows.
- **The standing check:** a test over the built package that follows the static imports of each `files.json` runtime entry. It fails if any entry other than `list/sortable-list` reaches `@ydinjs/drag`. Prove it can fail: temporarily add `import '@ydinjs/drag/sortable.js'` to `list.ts`, and record the failure in the report.

**Task 7. Documentation and record.**

- Document `mx-sortable-list` in its JSDoc: the handle, the keys, the event, the commit wait, and that the consumer installs `@ydinjs/drag`.
- Add the sortable list to `list.mdx`, and replace _"Reveal, reorder, …"_ with what is now true.
- Write `.plan/list-sortable-1/list-sortable-report.md`. Add dated lines to `RD-31` and `RF-36`, naming the commit.

**Verification:** `handoff.md` for every changed file. Run material-x's and core's test suites, the root `just typecheck` and `just typecheck-declarations`, and `just docs-build`.

**Stop and report to the architect if:**

- a behavior in section 4 needs a drag change. One example is a lifted visual inside the item's shadow root that doesn't land correctly when the consumer moves the item during the commit wait. That would be a drag finding;
- `traits-baseline` changes in any other way than task 4 states;
- a plain list row reaches drag, or grows;
- a sortable-list row stalls or fails intermittently in WebKit or Firefox.

**The pull request** says `Closes #86` and `Closes #44`, the issue that tracks `RF-36`.

## Test map

Core's rows in `tests/traits/reorderable.browser.test.ts` at `e4b0e475d`. **M**: becomes a material-x row on `mx-sortable-list`. **D**: drag's suite covers the mechanism, so the row isn't copied. **X**: the behavior is gone, so the row is deleted.

| Core row | Disposition |
| --- | --- |
| `ReorderEvent`: bubbles; crosses shadow DOM; is cancelable | **M**, on material-x's event |
| `Reorderable`: the attribute's three rows | **X**: no attribute (Q1) |
| not set dragged state when reorderable is false | **X**. Replaced by **M**: an item with no handle doesn't drag, and `mx-list` doesn't drag |
| set dragged state once the drag activates; not before the threshold | **M**: the `drag` state follows `onStart` |
| create a footprint placeholder once the drag activates | **D** for the placeholder. **M**: the placeholder has the list's footprint color |
| move the footprint when a sibling midpoint is crossed | **D**: `y()`'s gap rows |
| reorder a horizontal row; reorder in a 2D grid | **X**: the list is a column |
| dispatch `ReorderEvent` with correct indices on pointerup | **M**, with `previous` and `next` |
| propose a move without reordering the DOM itself | **M** |
| not dispatch a reorder for a no-op drop (skipped in Safari, `RF-36`) | **D**: a drop on its own gap doesn't ask `onReorder` |
| animate home and not move when the intent is prevented | **M** |
| settle once the consumer commits the proposed move | **M**, for a synchronous commit and for a commit one task later |
| not dispatch on pointercancel after movement; restore the item and remove the footprint on pointercancel | **D** |
| re-hit-test near the origin | **D** |
| not dispatch when no drag is active | **D** |
| clear dragged state on pointercancel | **M** |
| take pointer capture on the host | **D** |
| tear down when the host disconnects mid-drag | **M** |
| a new drag after disconnecting mid-drag and reconnecting | **M** |
| ignore pointerdown while a previous drag is settling | **D** |
| start a drag when the press lands on the handle | **M** |
| not start a drag when the press misses the handle | **M** |
| not start a drag on a non-primary press | **D** |
| stop the landing and dispatch nothing when the host disconnects during settling | **M**, for a disconnect during the commit wait |
| clean up when the landing setup throws | **D**: drag's fault rows |
| not finish the drag when a different pointer is released | **D** |
| restore pre-existing inline styles after landing | **D**: the lift restores what it owns (`drag:DRD-14`) |
| assign the footprint to the item's named slot | **D** |
| lift the visual into the top layer as a popover | **D** |
| take the visual out of the top layer once the drag lands (skipped in Safari, `RF-36`) | **D** |
| remeasure item geometry after a scroll | **D** |
| not dispatch for a press that never crosses the threshold | **D** |
| keyboard: grab on Space on the handle; step the footprint on ArrowDown | **X** (Q2). Replaced by **M**: ArrowDown on the handle moves the item one slot and dispatches `from`, `to` |
| keyboard: not grab when the key lands off the handle | **M**: an arrow key off the handle moves nothing |
| keyboard: dispatch the stepped indices on drop | **M**, as above |
| keyboard: settle promptly on the consumer commit, not the timeout | **M** |
| keyboard: no reorder when Escape cancels the grab; no reorder for a drop that never moved | **X** (Q2). The edge rule is **D** |
| keyboard: announce the grab through a shadow-owned live region | **M**, changed: each accepted move is announced by position |

**New M rows:**

- a second ArrowDown after a reorder moves the item again: focus stayed on the handle;
- a consumer that never commits: the item lands within the bound, and its `drag` state is cleared;
- handle semantics are written in a sortable list, consumer values are kept, a handle added later is covered, and nothing is written in `mx-list`;
- an item added during a drag: the drop's `from` and `to` describe the new collection;
- reduced motion: the landing has zero duration.

## Not adopted

- **A side-effect import, or a function call,** instead of an element: [section 2](#2-sorting-is-a-separate-element-in-a-separate-entry-q1).
- **drag as a regular dependency.** It is simpler, but two copies of drag break the nesting rule, and every material-x install would fetch drag and box-quad.
- **Keeping the `reorderable` attribute on `mx-sortable-list`.** An element whose only job is sorting, behind an attribute that turns sorting on, is a second switch. A missing handle already means "not sortable".
- **`layoutAnimation` for the displaced rows.** Today's rows don't animate. Adding it is a separate choice, with its bytes.
- **Moving core's synthetic-host rows into material-x unchanged.** They test a trait that no longer exists, through a host that isn't the component.
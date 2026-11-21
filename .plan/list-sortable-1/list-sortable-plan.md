# The list's sortable items on `@ydinjs/drag` — plan

**Status: the owner answered Q1 to Q5 on 2026-11-20 and Q6, with its two follow-ups, on 2026-11-21 ([Owner's answers](#owners-answers)). No question is open, and the plan is ready for implementation.** The architect wrote this plan on 2026-11-20 at `e4b0e475d` (`origin/main`), on `repo/list-sortable-1`, for the coordinator's task on issue #86. It was revised twice the same day for the answers, and on 2026-11-21 for Q6 ([what Q6 changes](#q6-a-handle-less-item-takes-focus)).

**Revised 2026-11-21 on the implementer's size stop at `88801757e`:** the items' sortable writes move into a module that only `list/sortable-list` imports, and reach the item through the context's value. The stop bounds don't change. [Where the sortable writes live](#where-the-sortable-writes-live) has the ruling, and task 3a the work.

The owner asked for it in these words: _"reorderable in core needs to be replaced with our new shiny drag, with a separate import for List where sortable items are needed"_. The decision is [`repo:RD-31`](../00-index.md). Where the entry and this plan differ, the entry governs. Grab mode was proposed as [`drag:DRD-70`](../../packages/drag/.plan/00-index.md), and the owner deferred it, so it isn't part of this plan. **This plan changes no drag source.**

The plan is repository-level because the work changes three packages: it deletes code from `core`, adds code to `material-x`, and makes `material-x` depend on `drag`.

## Readings

Read by the architect at `e4b0e475d`.

**Core's trait.** `packages/core/src/traits/reorderable.ts` (1,265 lines) is published as `@ydinjs/core/traits/reorderable.js`. It exports `Reorderable` (a `reorderable` boolean attribute trait), `ReorderEvent`, `useReorderable`, `useReorderableItem`, `ReorderableProps` and `AnimationTiming`.

- **Pointer drag.** After an 8 px threshold, the item's visual goes into the top layer, and a `[data-footprint]` placeholder follows the nearest item center. The rule has no axis, so rows and grids work too.
- **Handle.** A press must land on the item's `[data-handle]` when the item has one. An item with no handle drags by its whole surface.
- **Keyboard: a grab mode.**
  - Space or Enter on a handle grabs the item, and a handle is required.
  - Arrow keys move it one slot at a time.
  - Space or Enter drops it. Escape and Tab cancel.
  - Every step is announced through an `aria-live="assertive"` region in the host's shadow root.
  - No role changes during the grab. Pointer drops aren't announced.
- **The event.** A cancelable, bubbling, composed `reorder` event (`item`, `from`, `to`).
  - The consumer commits the move, and the trait never moves the DOM.
  - The landing starts when the event is dispatched.
  - The session waits until the slot shows the move, or for at most `COMMIT_TIMEOUT` (500 ms) after the landing.
  - `preventDefault()` makes the item land home.
- **State.** The item has the custom state `drag` while it is lifted. After a pointer drop, the state is cleared when the landing starts. After a keyboard drop, it is cleared at the end of the commit wait.
- **Lifecycle.** A disconnect ends the session. A press while a landing is settling is ignored.

**material-x's use.**

- `src/list/list.ts` composes `Reorderable`, so `mx-list` has a `reorderable` attribute. It calls `useReorderable(this, cssProps)` with `--_drag-duration` and `--_drag-easing` as the landing's timing. Its `ListEvents` is `{ reorder: ReorderEvent }`.
- `src/list/ListItemCore.ts` runs in every list item.
  - It calls `useReorderableItem(host, target)` to register the inner `.host` element as the visual.
  - Its `enhanceHandle` gives a slotted `[data-handle]` `tabindex="0"`, `role="button"`, `aria-label="Reorder"` and `touch-action: none`, unless the consumer set them.
  - So a `[data-handle]` in a list that doesn't reorder is announced as a _Reorder_ button that does nothing. The [accessibility reading](checks/list-a11y.txt) shows it.
- The item's host is `display: contents`, so the visual must be the inner `.host`. The list's `:host` is a flex column with a `gap`. `::slotted([data-footprint])` styles the placeholder from `--_footprint-color` and `--_footprint-opacity`.
- **Focus and roles.** `mx-list` sets `role="list"`.
  - `mx-list-item` renders a `<div class="host">` with no `tabindex` and no role.
  - `mx-list-button-item` and `mx-list-link-item` render a native `<button>` and `<a>`, and delegate focus to them.
  - No item sets a role of its own, `listitem` included.
  - In Chromium 158 the tab order is the handle, then the button item's `<button>`, then the link item's `<a>`. The static items have no tab stop, and every item is `generic` inside the `list` ([reading](checks/list-a11y.txt), [probe](probes/list-a11y.ts)). That is `RF-68`. It was registered beside this plan, and its entry now lives on `material-x/list-roles-1`, the fix's branch.
- **No arrow-key navigation.** No list module handles a key.
- `list.stories.tsx`'s `Draggable` story uses `reorderable`, `onreorder` and `data-handle`.
- `tests/traits-baseline.browser.test.ts` imports core's `Reorderable` into its `TRAITS`, and `__snapshots__/traits-baseline.json` records `mx-list`'s `reorderable` attribute.
- `src/react.ts` is maintained by hand and imports the types of every element.
- `useARIA` mirrors a host's `aria-*` attributes onto its target. The interactive items use it, so an `aria-*` attribute on the item reaches its inner button or link.
- `list.mdx` doesn't describe reordering. Its _Anatomy_ calls `mx-list-item` a _"static content item"_, `mx-list-button-item` a _"native button-backed action item"_ and `mx-list-link-item` a _"native anchor-backed navigation item"_.

**What else depends on core's trait: nothing.** A search of the tree outside `.plan/` finds core's `package.json` export, its `files.json` entry, its `.size-limit.json` row, its README section and its test file, and the material-x files above. No other package, script, workflow or configuration names it. **core is on no registry** (nothing `@ydinjs` is published yet; `RD-27`). So `CONTRIBUTING.md` §8 applies: the export is deleted completely, with no alias. `AnimationTiming` has no other user.

**drag's sortable**, as its source and README describe it at `e4b0e475d`:

- `sortable(root, config)` takes `items()`, `axis` and `onReorder`. It also takes `onStart`, `onEnd`, `threshold`, `handle`, `visual`, `box`, `placeholder`, `landing` and `displacement`, which are optional. It returns `invalidate()`, `requestCancel()` and `requestDestroy()`.
- `items()` is pulled at each press and command and again at activation. The consumer calls `invalidate()` when the collection changes during a drag.
- **`onReorder(request, { signal })` decides,** and it may return a promise. The request has `item`, `from`, `to`, `previous` and `next`.
  - After an accepted verdict, the visual lands where the item is in the DOM at that moment (`SortableOperation.#landingTarget`).
  - So a commit made before the verdict resolves lands the item at its new slot, and an accepted verdict with no commit lands it home.
- **Keyboard: one command per key press.**
  - An arrow key whose event path holds the item, or its handle when `handle` is given, moves the item one slot. The move is proposed through `onReorder`, and the item is dropped immediately.
  - At the collection's edge the key isn't admitted, and it keeps its native meaning.
  - Escape cancels. There is no grab mode.
- **Focus:** the kernel gives focus back to the element inside the item that had it, so a second arrow press works after a reorder (`drag:DRD-9`). The README's _Focus_ item says: _"You own `tabindex`, roles and any announcement of the new order."_
- **`handle(item)`** gates pointer presses and keyboard commands alike. When it returns `null`, the item isn't admitted. When it returns the item itself, any press or key inside the item is admitted.
- **`data-drag-ignore`:** _"A hop before it marked `data-drag-ignore` owns its own interaction and refuses the admission"_ (`kernel/admission.ts`). This holds for presses and commands.
- **The placeholder** has `data-drag-placeholder`, is `aria-hidden`, gets the item's `slot`, and is sized inline. The library writes no other styling.
- **`y()`** accepts a flex column with a `gap`.
- **`landing()`** from `sortable/landing.js` gives the landing zero duration under `prefers-reduced-motion: reduce`. A custom timing is `{ ...landing(), timing }`.
- **Nesting:** an event that one controller admitted is offered to no other, _"within one copy of the library"_ (`drag:DRD-17`).
- **`drag` is `private`,** at `0.1.0`, and depends on `@ydinjs/box-quad` `1.0.0`.

**Size**, read by the architect at `effe25460`, whose source equals `e4b0e475d`, after a fresh build ([transcript](checks/size-before.txt)). Brotli:

| Row | Bytes |
| --- | --: |
| core `traits/reorderable` | 3,110 (size-limit's 3.11 kB) |
| material-x `list/list` | 3,670 (3.67 kB) |
| material-x `list/list-item` | 2,570 (2.57 kB) |
| material-x `list/list-button-item` | 4,580 (4.58 kB) |
| material-x `list/list-link-item` | 4,750 (4.75 kB) |
| material-x `complete` | 16,930 (16.93 kB) |
| drag "sortable + y" | 6,533 |
| drag "sortable + y + landing", the list's composition | 6,866 |
| box-quad `index` | 1,180 (1.18 kB) |

The last drag row is a probe ([`probes/list-compositions.ts`](probes/list-compositions.ts)) that runs drag's own `bundleSize` on the published build. Its "sortable + y" control reads 6,533 B, as drag's row does. The drag rows include box-quad.

**Open findings this work touches.**

- `repo:RF-36`: in Safari, two rows of core's trait sometimes keep the visual in the top layer after the drop. Both rows are skipped in Safari, the cause isn't established, and #44 tracks it.
- `drag:DRF-49`: in Safari, the `y()` sweep through `box` with a `visual` sometimes stalls until its timeout. The row is skipped in Safari. That is the configuration the sortable list uses.
- `repo:RF-68`: `mx-list`'s items aren't exposed as list items. `RD-31` doesn't change it. The owner has it fixed in a separate unit (#92).
- `RD-30` counts the 27 core modules at `e4b0e475d`, and `traits/reorderable` is one of them. **Dated 2026-11-21:** `RD-30` reached `main` first, in #91 at `2b1d8276f`. Its count names the commit it was read at, so it stays true when task 5 deletes the module, and neither record needs a change.

## What drag covers, and what the list adds

| The list needs | drag gives | The sortable list adds |
| --- | --- | --- |
| Reordering a column by pointer | `sortable` with `y()` | — |
| A visual inside the item's shadow root | `visual(item)` | The item's inner `.host` |
| Dragging by the whole item, or by a handle | `handle(item)` | The handle when the item has one, otherwise the item |
| Reordering from the keyboard | One arrow command per key press, focus kept | Nothing |
| A focusable element to press the key in | Nothing: the consumer owns `tabindex` | A tab stop on the handle, or on a static item without one (Q6) |
| Leaving a nested control's arrow keys alone | `data-drag-ignore` | Nothing: the consumer marks the control |
| Announcing the new position | Nothing: the consumer's job | A live region in its shadow root |
| A `reorder` event that the consumer commits | An `onReorder` that may resolve later, with a `signal` | Dispatching the event, and waiting until its slot shows the move |
| The `drag` state for elevation | `onStart` and `onEnd` | Setting and clearing the state |
| Landing timing from CSS custom properties | A custom `timing` on `landing()` | Reading `--_drag-duration` and `--_drag-easing` |
| Ending a drag on disconnect | `requestCancel()` | Calling it |
| Items added or removed during a drag | `invalidate()` | Calling it when its items change |

**Nothing in drag is missing.**

## Decided here

`repo:RD-31` records these as properties. This section explains them.

### 1. Core's trait goes

The module, its export, its `files.json` entry, its size row, its README section and its test file are deleted. Nothing in core replaces them. Core keeps `attribute-traits`, `useEvents` and `useSlot`, which other code uses.

### 2. Sorting is a separate element in a separate entry (Q1)

`@ydinjs/material-x/list/sortable-list.js` defines `mx-sortable-list`, whose class `SortableList` is the module's default export.

- It renders and styles like `mx-list`: the same template, slot, role, parts, CSS custom properties and tokens.
- `mx-list` doesn't sort. It has no `reorderable` attribute and no `reorder` event.
- Both elements take the same item elements.
- The two elements share one list core, as the list items share `ListItemCore`. `SortableList` doesn't have to extend `List`.

**Why an element.**

- **Not a switch on `mx-list`.** A side-effect import that makes `mx-list` sort depends on evaluation order. `list/list.js` defines `mx-list` when it is evaluated, and the browser upgrades every `mx-list` already in the document at that moment. A module that imports `list.js` and then adds sorting is evaluated after that upgrade, so those lists never sort. An attribute that works only after an import also fails silently when the import is missing.
- **Not a function** such as `sortableList(element)`: HTML and framework users would need a reference and an effect for each list.
- **An element is declarative:** the custom-element manifest picks it up, and `src/react.ts` gets one more entry.

**The published declarations name no drag type.** `react.d.ts` imports the types of every element. So a type from `@ydinjs/drag` in `sortable-list.d.ts` would make `react.d.ts` fail to resolve for a consumer who hasn't installed drag. The event class and the element's types are material-x's own.

### 3. A list that doesn't sort carries no drag code

Only `list/sortable-list` imports `@ydinjs/drag`. No module that another runtime entry reaches imports it, directly or through another module. That includes the list items, so `useReorderableItem`'s registry leaves `ListItemCore`. The items' sortable behavior, their handle semantics and their tab stop, is in `ListItemCore` and imports no drag module: it runs only while the item resolves an `mx-sortable-list` through context ([How a static item takes focus](#how-a-static-item-takes-focus)). A standing test checks the import graph of the built package (task 6), so the property can't regress silently. A size reading proves the effect once.

### 4. The sortable list's behavior

- **The collection** is the list's slotted item elements in slot order, as a new array after each change. The placeholder isn't an item. During a drag, the list calls `invalidate()` once its slot shows a changed collection. A slot change that changes only the placeholder isn't a collection change, so moving the placeholder doesn't make drag measure the rows again.
- **The handle decides how an item drags (Q3, Q6).** It is optional, and each item follows from whether it has one:
  - **An item with a `[data-handle]`** drags only by its handle, by pointer and by keyboard. drag's `handle` is the handle, so a press or a key elsewhere in the item isn't admitted. This is today's pointer rule.
  - **An item without a handle** drags by its whole surface. drag's `handle` is the item itself.
  - **No `handle-only` attribute.** The owner retired it on 2026-11-21: a handle's presence switches handle-only dragging on for its item. So the choice is per item, and one list may mix items with and without handles. Every item of a sortable list can be dragged.
- **The keyboard is drag's ordinary model (Q4).** An arrow key moves the item one slot at once and proposes the move. Who can press it follows from the same `handle`:
  - **An item with a handle** moves from its focused handle.
  - **An interactive item without a handle** moves from its own focused button or link. Space and Enter still activate it, because this model doesn't use them.
  - **A static `mx-list-item` without a handle** becomes a tab stop in a sortable list, and moves from the keyboard while it has focus (Q6). The rules for that tab stop are [below](#focus-on-a-handle-less-static-item).
  - At the collection's edge, the key keeps its native meaning. After a move, focus stays where it was, so the next arrow press moves the item again (`drag:DRD-9`).
- **Nested controls.** In an item without a handle, an arrow key pressed in any focused element inside the item moves the item. A control that uses the arrow keys itself, such as a text field, a slider or a radio group, carries `data-drag-ignore`, which drag already honors for presses and keys. Without it, the control's arrow keys move the item. A handle avoids the question. The JSDoc says both.
- **Handle semantics.** In a sortable list, a `[data-handle]` gets:
  - `tabindex="0"`, `role="button"` and the accessible name _Reorder_;
  - an accessible description, _Use the arrow keys to move_;
  - `touch-action: none`.

  An interactive item with no handle gets the same description, on its button or link. A static item that becomes a tab stop gets it too, on its inner `.host`. **The item writes all of these itself,** while it is in a sortable list: its handle's semantics, and its control's description and tab stop. The list writes nothing on an item, its handle or its host ([How a static item takes focus](#how-a-static-item-takes-focus)). Values the consumer set are kept, as today. This also applies to a handle added to an item after the item is slotted. In `mx-list`, nothing is written to a `[data-handle]` or to an item.

- <a id="focus-on-a-handle-less-static-item"></a>**Focus on a handle-less static item (Q6).**
  - **When.** A static item is a tab stop exactly while it is in the collection of an `mx-sortable-list` and has no `[data-handle]`. Otherwise the list leaves the item as it would be in `mx-list`, with no tab stop. So the tab stop goes when a handle is added, and when the item leaves the list or moves to an `mx-list`. It comes back when the handle is removed or the item returns.
  - **Which items.** Only items that take no focus themselves, which today is `mx-list-item`. The list writes nothing that changes the focus of a button or link item, which keeps its own control as its only tab stop.
  - **How it is written.** The item sets `tabIndex = 0` and the description _Use the arrow keys to move_ on its own inner `.host`, and removes both when the conditions end. Nothing is written on the item's host. The item doesn't change or remove a value it didn't write.
  - **What the item does with it.** The inner `.host` takes focus in every engine the gate runs, and the host stays `display: contents`. It shows Material's list focus indicator, from the list item's `focus-indicator` tokens. [How a static item takes focus](#how-a-static-item-takes-focus) has the mechanism. `mx-list-item` has no public way to take focus: a `tabindex` on its host does nothing, in `mx-list` or in the sortable list.
  - **What a screen reader gets on focus.** [The Q6 section](#q6-a-handle-less-item-takes-focus) states it: the item's own role and text, the description, and after a move the live region's position.

- **The `reorder` event** is dispatched on the list from `onReorder`. It bubbles, is composed and is cancelable.
  - It carries `item`, `from`, `to`, `previous` and `next`. `previous` and `next` are the items on either side of the new slot.
  - So `list.insertBefore(event.item, event.next)` applies the move, even while the placeholder is a child of the list.
  - `preventDefault()` rejects the move, and the item lands home.
  - The event class is material-x's own, exported from the entry as a type and a class.
  - Each arrow press is its own move and its own event.
- **The commit wait.**
  - If the event isn't canceled, the verdict is accepted once the list's slot shows `item` at `to`.
  - The consumer may commit synchronously in the handler or later, for example in a framework render. The item stays lifted until then.
  - If the slot doesn't show the move within a bound, the verdict is accepted anyway, and the item lands where the DOM has it. The bound is a named constant, 500 ms as today.
  - An aborted `signal` ends the wait.
- **Announcements.** Each accepted move is announced through a polite live region in the list's shadow root. The announcement names the item's new position and the number of items, for example _"Item 3 of 5."_ A pointer drop is announced too, because drag's `onEnd` doesn't say what started the drag. Today only keyboard steps are announced.
- **State.** The item has the custom state `drag` from `onStart` to `onEnd`, however the drag ends.
- **Placeholder.** The list's footprint rule matches `[data-drag-placeholder]` and keeps today's shape, color and opacity.
- **Landing.** Composed from `sortable/landing.js`, with a timing that reads `--_drag-duration` and `--_drag-easing` at each landing. Under `prefers-reduced-motion: reduce`, the landing has zero duration, as `landing()` gives. No `layoutAnimation`: the other rows move without animation, as today.
- **Lifecycle.** One controller per connection. On disconnect the list calls `requestDestroy()`, as drag's README says for an unmount, and clears the lifted item's `drag` state itself, because a destroy calls no `onEnd`. On connect it creates a new controller, so a reconnected list sorts again. A disconnect ends any operation, and nothing is announced for it. (Revised 2026-11-21 on Mx Implementer B's finding: `requestCancel()` on a list that has left the document reports `DragFault` `sortable/landing-placeholder-lost`. See [the proposed drag finding](#proposed-drag-finding-a-cancel-after-the-root-left-the-document).)

### 5. drag is an optional peer of material-x

The rule is `CONTRIBUTING.md` §Dependencies of a published package, question 2: the package must share the consumer's copy.

- `drag:DRD-17`'s nesting rule holds within one copy of drag. With two copies, one press on a sortable list inside a consumer's own drag sortable would be admitted twice.
- Only an optional entry imports drag, so `peerDependenciesMeta` marks it optional. The workspace installs it in material-x's `devDependencies`.
- A consumer that doesn't use `mx-sortable-list` installs nothing new. box-quad comes in through drag's own `dependencies`.
- The peer's range is set at material-x's release, under `RD-27` property 1 and the peer rules. Until then, it names the workspace version.

### 6. Behavior tests move to material-x

Core's suite tests the trait through a synthetic host. Its rows that describe the list's behavior become rows of the real `mx-sortable-list`, with real browser input. Rows that test drag's own mechanics are covered by drag's suite and aren't copied. Rows for behavior that no longer exists are deleted. The [test map](#test-map) lists every row.

### 7. RF-36 ends with the code it is about

Both of `RF-36`'s rows and the code they test are deleted. The finding closes with its cause unknown, because the code no longer exists. Its required property doesn't carry over to the new rows. A Safari stall in a sortable-list row is either `drag:DRF-49` or a new finding.

### 8. Release order

- **box-quad, then drag: unchanged.** This plan changes no drag source, so drag's release (#57) doesn't wait for it, and drag's size ceilings don't move.
- **material-x's release now also comes after drag's.** `RD-27` property 1 requires every `@ydinjs` dependency to be on the registry at the dependent package's release. drag's version at that point is the owner's answer at drag's release, and material-x's peer range follows it.
- **This work doesn't wait for drag's release:** material-x uses drag's workspace build.

## Why `mx-list-item` doesn't take focus

The owner asked: _"Почему? 🤔"_ ("Why?"). This section is the answer given on 2026-11-20, with the recommendation he didn't take in Q6. [The next section](#q6-a-handle-less-item-takes-focus) has what replaced it.

**What is so.** The coordinator's reading is correct, with one addition.

- `mx-list-item` is the static item. Its template is a plain `<div>`, with no `tabindex` and no role, and its shadow root doesn't delegate focus.
- `mx-list-button-item` and `mx-list-link-item` contain a real `<button>` and `<a>` and delegate focus to them. That is why they take focus.
- The only thing made focusable in a static item is a slotted `[data-handle]` (`enhanceHandle` in `ListItemCore.ts`). Today that happens in every list, including one that doesn't sort.
- **The addition:** no item has the role `listitem` either (`RF-68`).

**Why it is that way.** No record entry decided it. It follows from Material's split and from ARIA's rule for focus:

- Material splits list items into static content and items that do something. `list.mdx`'s _Anatomy_ calls them a _"static content item"_, a _"native button-backed action item"_ and a _"native anchor-backed navigation item"_.
- A keyboard focus stop is for something a user can operate. A list item isn't an interactive role in ARIA.
- A static item has no action, so a tab stop on it would be one more Tab press with nothing to do there. Screen-reader users read static content in reading mode, without moving focus to it.

**What making it focusable would cost.** The bytes are small: a `tabindex` written by the sortable list, a few tens of bytes. The cost is in what the user gets.

- **Tab stops:** every static item in a sortable list becomes a tab stop.
- **Nothing to announce:** the focused element has no interactive role, and today no role at all (`RF-68`). A screen reader announces it as a bare piece of text, with no hint that it can be moved.
- **Naming the action:** the item would need its own description of the arrow keys.

A handle is a named button that says what it does (_Reorder_), and it is exactly the thing that takes focus for this purpose. So it is a real option, but a worse one. **Recommendation: no.** A static item that should move from the keyboard gets a handle (Q6).

## Q6: a handle-less item takes focus

The owner answered on 2026-11-21 ([his words](#owners-answers)): with a handle, the item drags by the handle, keyboard included. Without a handle, the item itself becomes draggable and a tab stop. A list item isn't a tab stop permanently, only when the developer chooses no handle. This replaces the recommendation (a), and [section 4](#4-the-sortable-lists-behavior) states the result. The coordinator then asked him the two points below, and he answered both the same day.

**What the answers mean for each item.**

| Item in `mx-sortable-list` | Pointer drags by | Tab stop | Arrow keys move it from |
| --- | --- | --- | --- |
| Any item with a `[data-handle]` | The handle | The handle | The focused handle |
| `mx-list-item` without a handle | The whole item | The item, while it has no handle | The focused item |
| Button or link item without a handle | The whole item | Its own button or link, as in `mx-list` | Its focused button or link |

In `mx-list`, no item becomes a tab stop. The items there change only by section 3's removal of the handle code, and by `mx-list-item` registering its inner `.host` as its control, which has no effect there.

**The pointer with a handle: `handle-only` retires.** The owner: _"Yes, probably the handle's presence should switch on handle-only by itself"_ (translated by the coordinator).

- **For an item with a handle, nothing changes.** In this plan it already dragged only by its handle, by pointer and keyboard: drag's `handle(item)` returns the handle, and a press outside it isn't admitted. That is core's rule today too. Whole-surface drag only ever applied to an item without a handle.
- **What goes is the attribute.** Q3 had `handle-only` make an item without a handle undraggable. The handle itself now carries the choice, so the plan drops the attribute, its property, its reflection row and its React entry. None of them was implemented. Q3's _"if someone wants to make it required"_ is met by giving the items handles.
- **What a consumer loses:** a sortable list can't hold an item that never drags. A consumer who needs one rejects its moves with `preventDefault()` on the `reorder` event, or keeps it out of the list.
- **The choice is per item.** Leaving `[data-handle]` out of an item is the choice _"no handle"_, so one list may mix items with and without handles. A list-level switch would say what the markup already says.

**The role: `RF-68` is a separate fix.** The owner calls the missing `listitem` role a bug to fix. `RF-68` (#92) is planned as its own unit, outside `RD-31`. The items of both lists get the role from that fix, and the sortable list adds no role of its own. Neither unit waits for the other.

**What the focused handle-less item announces.** When an `mx-list-item` without a handle takes focus in a sortable list, a screen reader can announce:

- **the item's role and text,** as `RF-68`'s fix exposes them in both lists. Until that fix is on `main`, the item is `generic`, and a screen reader may read only its text;
- **that it can be moved, and how:** the accessible description _Use the arrow keys to move_. It is the description that a handle and a handle-less interactive item already get, so this answer adds no new contract text;
- **after each accepted move,** the live region's position, as for every move.

The description sits on the element that takes focus, the item's inner `.host` ([below](#how-a-static-item-takes-focus)).

No owner question is needed for this. The description is section 4's existing rule, applied to one more kind of item. Two other ways to say _"movable"_ aren't adopted: `aria-roledescription`, because a screen reader announces it instead of the role, so the item would stop being announced as a list item; and `aria-grabbed`, which ARIA 1.1 deprecated. The implementer reads the focused item's role, name and description in Chromium's accessibility tree with the [probe](probes/list-a11y.ts) (task 6). Firefox, WebKit and the screen readers themselves aren't read, as for `RF-68`.

## How a static item takes focus

Ruled on 2026-11-21 on Mx Implementer B's finding during task 3, revised the same day on Mx Architect's reading for `RF-68`, and **revised again the same day on the owner's direction**. [What the revisions changed](#what-the-revisions-changed) lists them.

**The owner's direction,** relayed by the coordinator in translation, on the registry that the list read at `9f90572fb`: _"Isn't that a re-implementation of context?"_, and _"That context works through an event that costs something is true. But Justin Fagnani explained to me that you mustn't use registries for DOM: it tests and carries over very badly."_ The coordinator then narrowed it: the rule is **no registry for a contextual parent–child link**. A parent component and its children are linked through context. A registry that maps an element to its own parts, such as `FocusForwarding`'s, isn't covered.

**What the readings show.**

- **Mx Implementer B's [probe](probes/item-focus.browser.test.ts) and [reading](checks/item-focus.txt),** at `be89be254`, in Chromium 158, Firefox 159 and WebKit 27.2:
  - The real `mx-list-item` with `tabindex="0"` takes focus in no engine, by Tab or by `focus()`. Its host is `display: contents`, and that box can't take focus.
  - An inner block with `tabindex="0"` under such a host is one tab stop in every engine, forward and back. It matches `:focus-visible`, and the host matches `:focus`. That holds with or without `delegatesFocus`.
  - `host.focus()` reaches the inner element in Chromium and WebKit with `delegatesFocus`, and in no engine without it. Firefox doesn't delegate from a `display: contents` host. That is `RF-33`, and `FocusForwarding` already works around it for the interactive items.
  - The inner element is a tab stop on its own `tabindex`, whatever the host has.
  - drag restores focus by calling `focus()` on the element inside the item that had it (`kernel/session.ts`'s `restoreFocus`, through `shared/focus.ts`), and that element is the inner `.host`.
- **Mx Architect's reading for `RF-68`,** `.plan/list-roles-1/checks/list-roles.txt` on `material-x/list-roles-1` at `45272694c`, from each engine's own accessibility tree:
  - **A `display: contents` host with a `tabindex` gets a node of its own:** `generic` in Chromium, around its item, and `group` in WebKit, beside its item and holding the item's slotted text. It still takes no focus.
  - `RF-68`'s fix puts `listitem` on the item's row, which for `mx-list-item` is its inner `.host`. So the element that takes focus here is the list item.
- **Core's context, read in `packages/core/src/controllers/useContext.ts` at `5295713b5`, not run:** `useContext` dispatches its request only in the consumer's `connected`, and `useProvider` answers only once the provider is upgraded. So a consumer that connects before its provider is defined never resolves it. An item that `list/list-item.js` upgrades before `list/sortable-list.js` defines the list, in a page whose markup was parsed first, would stay unsortable. Section 2 rejected a side-effect import for this ordering. `button-group` has the same gap today. It is [`RF-69`](#the-context-repair-is-cores-unit-rf-69).

**The ruling, as revised.**

1. **The list provides a context, and each item consumes it.** `mx-sortable-list` calls core's `useProvider` with a context of its own, whose value is the list element. `ListItemCore` calls `useContext` with it. An item is in a sortable list while it has resolved a provider **that is its parent element**. So an item of an `mx-list` nested inside a sortable list's item doesn't take the outer list's behavior.
2. **The item writes on its own elements only.** While it is in a sortable list:
   - **with a handle,** it gives the handle the semantics of section 4, and writes nothing on its control;
   - **without a handle,** it writes the description on its control: the inner `.host` of `mx-list-item`, or the button or link of an interactive item. `mx-list-item` also sets `tabIndex = 0` on its inner `.host`.

   Nothing is written on the host. The list writes nothing on an item, a handle or a shadow tree. The code that writes lives in the sortable list's module and reaches the item through the context's value, and the item runs it on its own elements ([Where the sortable writes live](#where-the-sortable-writes-live)).

3. **The item detects its own handle,** from the nodes assigned to its `start` and `end` slots, as `enhanceHandle` did. A handle is a child element of the item with `data-handle`, in either slot. The JSDoc says so, and drag's `handle(item)` in the list uses the same rule at each press and command. So the item and the list can't disagree. The item observes its slots, and the rule, `handleOf`, runs in the context's value ([Where the sortable writes live](#where-the-sortable-writes-live)).
4. **When the tab stop goes.** When the item gains a handle, its slot change moves the semantics to the handle and removes the tab stop and the description from the control. When the handle goes, the reverse. When the item leaves the list, its disconnect runs the context effect's cleanup, which removes everything the item wrote. A reconnect resolves the context again, so an item moved into `mx-list` takes nothing, and one moved into another sortable list takes it again. The item removes only values it wrote.
5. **An item resolves the list's context in whatever order the two are defined.** That is `RF-69`'s repair in core, which this unit depends on ([below](#the-context-repair-is-cores-unit-rf-69)). The items resolve through the same `useContext` as `button-group`'s buttons, so the list adds no repair of its own.
6. **The item composes `FocusForwarding`,** as the interactive items do, and its root delegates focus. So `item.focus()` reaches the inner `.host` in every engine, Firefox included. The Firefox gap isn't documented as a limit. `FocusForwarding`'s registry maps an element to its own control, which the owner's rule doesn't cover, and nothing else reads it.
7. **`mx-list-item` has no public way to take focus.** A consumer's `tabindex` on its host does nothing, in either list, as the owner's Q6 rule wants.

**Why.**

- **Context, not a registry,** for the link between the list and its items: the owner's rule. The per-connect event is a cost he accepted.
- **The item writes, and the list provides.** Each element writes only on elements it owns, so no shadow tree is reached into, and the host stays free of `tabindex` and `aria-*`, which the `RF-68` reading rules out for a `display: contents` host.
- **One observer of the handle** (`CONTRIBUTING.md` §6). The item already watches its `start` and `end` slots, and it needs the handle for its own tab stop. A handle added to an item later is a slot change of the item, not of the list, so the list could see it only with an observer of its own.
- **The parent check** keeps a nested plain list's items out of an outer sortable list's behavior. It is a comparison, with no extra context on `mx-list`.
- **The late-provider repair is core's (`RF-69`),** because the gap is the controller's, and `button-group` has it too. Doing it in the list alone would leave the button group broken and give context two behaviors.
- **The Firefox gap would be a correctness failure under valid use,** caused by the platform (`CONTRIBUTING.md` §1.1), and the package already has its fix.

**What it costs.** Estimates, which task 6 replaces with readings. Revised for [where the sortable writes live](#where-the-sortable-writes-live).

- **`list/list-item`:** it loses `useReorderableItem` and the handle code. It gains `useContext`'s consumer, its call into the context's value, `FocusForwarding` and the focus indicator's styles. About 2,600 to 3,100 B.
- **The interactive items:** they lose the handle code and gain the consumer and its call. About the same as today, within 150 B either way.
- **`list/sortable-list`:** it loses the registry read, and gains `useProvider` and the items' writes. About 8,500 to 9,500 B.
- **`complete`:** the consumer in `ListItemCore` once and the provider once. `list/list` doesn't change.
- **Run time:** one context event per item connect, which the owner accepted.

`RF-69`'s repair is that unit's bytes, not this one's. That unit reads them before and after.

**Not adopted.**

- **The list reading the item's control from `FocusForwarding`'s registry,** the revision at `9f90572fb`: a registry for a parent–child link, which the owner's rule excludes.
- **The host's `tabindex` as the switch,** the first ruling at `5bf743235`: the extra accessibility node.
- **A new public attribute on `mx-list-item`,** such as `focusable`: `CONTRIBUTING.md` §4 and §12, and no consumer needs it.
- **The list writing handle semantics:** it would need an observer of every item's children to see a handle added later.
- **`mx-list` providing the context too,** with a "not sortable" value, to stop nested items: the parent check does it without a listener on every plain list.
- **A late-provider repair in the list alone:** above.
- **The provider telling its child elements to resolve again when it connects,** which this plan proposed at `6214e3b57`: the owner chose the consumer's wait for its parent's definition, in `RF-69`'s unit.
- **`useARIA` for the description:** it copies from the host, which mustn't carry the attribute.
- **The host stops being `display: contents`:** the list's flex layout and the item's styling depend on it, and the plan's stop condition excludes it.

#### What the revisions changed

- **At `5bf743235`:** the host's `tabindex` was the item's public switch, for the sortable list and for a consumer, and the inner `.host`'s `tabindex` followed it. `mx-list-item` ran `useARIA`, so the description that the list wrote on the host reached the focused element. The item observed `tabindex`, and `traits-baseline` expected it in the observed attributes. A consumer's `tabindex` in `mx-list` was a supported way to focus the item.
- **At `9f90572fb`:** the item registered its inner `.host` through `useFocusForwarding`, and the list read the control from that registry and wrote `tabIndex` and the description on it. The list wrote the handle semantics. `FocusForwarding`'s JSDoc was to say that its registry outlives the trait.
- **At `6214e3b57`:** item 5 had core's `useProvider` tell the provider's child elements to resolve the context again when it connects, as task 5's second part. On the owner's direction, `RF-69`'s unit repairs the gap instead, with the consumer's wait for its parent's definition.
- **At `88801757e`:** the writes and the record of what the item wrote were in `ListItemCore`, so every item carried them, in a plain list too. [The next section](#where-the-sortable-writes-live) moves them.

### Where the sortable writes live

Ruled on 2026-11-21 on Mx Implementer B's size stop at `88801757e`, relayed by the coordinator.

**What the reading shows** ([`size-after.txt`](checks/size-after.txt), [report](list-sortable-report.md#the-readings-task-6)):

- `list/list-button-item` reads 4,575 → 4,841 B (+266), and `list/list-link-item` 4,746 → 5,048 B (+302). The bound is 150 B either way.
- By ablation, the items without any sortable code read 4,451 and 4,646 B. The context consumer adds 110 and 129 B, and the writes 280 and 273 B. So the reading before held about 100 to 125 B of ungated handle code, which is gone, and the growth is the writes.
- **The writes run only under `mx-sortable-list`, and every user of an item pays for them,** in `mx-list` too. `CONTRIBUTING.md` §7 says that an optional feature pays for itself, and task 6's required property says that an interactive item grows, if at all, only by the context consumer. The estimate in [What it costs](#how-a-static-item-takes-focus) counted the writes in the item, which contradicted that property. The estimate was wrong, not the bound.

**The ruling: the shape changes (option b), and the bounds stay.**

1. **The writes move into a module that only `list/sortable-list` imports:** the handle semantics, the description, the static item's tab stop, the record of what the item wrote, and the handle rule `handleOf`, which drag's `handle(item)` also uses. No module that `list/list`, `list/list-item`, `list/list-button-item` or `list/list-link-item` reaches contains them. The size reading proves it (task 3a).
2. **The context's value carries them.** When the context resolves, the item calls the value with its host and its control. If the providing list isn't the item's parent, the call writes nothing and the item stays plain, so the parent check moves with the writes. Otherwise the call writes, and gives the item an update to run on each `lead` and `trail` slot change, and a cleanup that the context effect's cleanup runs. The value's form, a function or an object, is the implementer's.
3. **The item keeps what only it can do:** it consumes the context, observes its own slots (`CONTRIBUTING.md` §6), and hands over its own control, as it does to `useFocusForwarding`. It holds no description text, attribute name or record.
4. **Nothing else changes.** The elements written, their values and their removal are as ruling items 1 to 7 state. The writes still run only in the item's context resolution, its slot changes and its disconnect, so their timing doesn't change. The public API, the events, `traits-baseline` and every row of `tests/list` stay as they are.

**Against the owner's parent–child rule.** The list and its items are still linked only through context. The list keeps no registry, queries no item, and observes no item's children or shadow tree. The item passes its control to the value itself. A behavior that a provider passes to its consumers through the context's value is what context is for.

**Against `RF-69`.** `RF-69` changes when the consumer dispatches its request, not what the value is. An item still resolves the value in a microtask after it connects, a connection that ends before the wait settles writes nothing, and an item of an `mx-list` nested in a sortable item waits for `mx-list`, resolves the outer list, and is refused by the value's parent check. Until `RF-69` is on the base, the definition-order row stays `it.fails`, as now.

**The bounds stay as task 6 and the stop conditions give them.** From the ablation, the items should read about 4,560 to 4,620 B and 4,780 to 4,830 B, within 150 B of the reading before, `list/list-item` about 2,720 to 2,780 B, under 3.1 kB, and `list/sortable-list` about 8,600 B, under 9.6 kB. These are estimates. If an interactive item still grows by more than 150 B, the unit stops again with the ablation.

**The record of what the item wrote is needed, but only for two of its three elements.** The other writer isn't the list: it is the consumer, or `useARIA` on the consumer's behalf. Keeping its values is property 4's _"Values the consumer set are kept"_, for valid input, so this isn't a check against misuse (`CONTRIBUTING.md` §1.1).

- **The handle** is the consumer's own light-DOM element. Its `aria-label`, `aria-labelledby`, `role` or `tabindex` is valid markup. When the item leaves the list, it removes what it wrote and keeps the consumer's values, so it must know which values are its own. Without the record, an item moved into `mx-list` either keeps a tab stop on its handle or loses the consumer's label. A test row checks this.
- **An interactive item's button or link** receives the host's `aria-*` through `useARIA`. So a consumer's `aria-description` on the item's host is on the control, and the item mustn't remove it when it disconnects.
- **`mx-list-item`'s inner `.host`** has no other writer: it is in the item's shadow root, and `mx-list-item` runs no `useARIA`. Its tab stop and description are written and removed without a record.
- **Its form is the implementer's.** An item has at most one handle and one control, so a map keyed by element isn't needed. Its bytes now count in `list/sortable-list`.

**No owner question.** No byte is traded for API or behavior: the change moves code between internal modules, and neither the context nor its value is a package export.

**Not adopted.**

- **Accepting the bytes, with a wider bound (option a).** Every user of a button or link item would carry about 280 B that runs only under a sortable list. That is against `CONTRIBUTING.md` §7, task 6's required property, and `RD-31`'s separate import for sorting, and no behavior or API needs it.
- **The smaller write variant in the item:** owned pairs, and `touch-action` from a `::slotted([data-handle])` rule. It saves about 30 B, which doesn't clear the bound, and the slotted rule would apply `touch-action: none` to a handle in `mx-list` too.
- **An `import()` of the writes from the item:** a second request and an asynchronous step for each consumer's bundle.
- **A hook that `sortable-list.js` installs in `ListItemCore` when it's evaluated:** a module-level channel between the list and its items, which the owner's rule excludes as it excludes a registry, and which depends on evaluation order, as section 2 rejected.
- **The list running the writes on its slotted items:** it would need an observer of every item's children for a handle added later (above).

#### Proposed sixth amendment of `RD-31`, for the main slot's architect

This slot doesn't amend record entries, so the text is proposed here.

**Registered on 2026-11-21 by the main slot's architect,** with one change. The item on handle semantics now says that the item applies these writes, the (Q6) item's tab stop included, and that the code runs only when the item calls the value with its own host and control, writing only on that item's elements. The proposed _"The list writes nothing on an item"_ is replaced by _"The list keeps no registry and queries no item"_, because the code that writes is now in the list's module. The new reason adds that the item hands the value its own elements. Property 7 is as proposed. [`RD-31`](../00-index.md) holds the text in force.

In property 4's item on handle semantics, replace _"The item writes it on its own handle or control while it is in a sortable list, and never on its host. The list writes nothing on an item."_ with:

> The item applies it to its own handle or control while it is in a sortable list, and never to its host. The code that writes it is in a module that only `list/sortable-list` imports, and reaches the item through the context's value, so a plain list's items don't contain it. The list writes nothing on an item.

In property 7, replace _"`list/list` and the interactive items don't grow, and `list/list-item` grows, if at all, only by its focus indicator and what taking focus needs."_ with:

> `list/list` doesn't grow. The interactive items grow, if at all, only by the context consumer, and `list/list-item` only by the consumer, its focus indicator and `FocusForwarding`. The items' sortable writes are in `list/sortable-list`.

Add to the reasons: _"**The items' writes travel in the context's value,** because only a sortable list runs them, and an item in a plain list doesn't carry them (`CONTRIBUTING.md` §7)."_ Add the replaced passages to the end of the entry, and a dated line under the status, as for the fifth amendment.

### Proposed fifth amendment of `RD-31`, for the main slot's architect

This slot doesn't amend record entries, so the text is proposed here.

In property 4's (Q6) item, replace from _"While the item is in its collection and has no `[data-handle]`, the list sets"_ to _"through `FocusForwarding`'s registry,"_ with:

> `mx-sortable-list` provides a context, and each item consumes it through core's `useContext`, and is in the list while the provider is its parent element. While it is and has no `[data-handle]`, the item sets `tabIndex = 0` and the arrow-key description on its own inner `.host`, and removes them when it gains a handle or disconnects. The item resolves the context in whatever order the two are defined (`RF-69`).

and keep the rest of the item from _"and nothing is written on the item's host"_.

In the item on handle semantics, replace _"written on the item's control and never on its host"_ with _"which the item writes on its own handle or control while it is in a sortable list, and never on its host. The list writes nothing on an item."_

In property 4's last item, replace _"A disconnect cancels the operation, and a reconnected list sorts again."_ with _"A disconnect destroys the list's drag controller and clears the lifted item's `drag` state, and a connect creates a new one, so a reconnected list sorts again."_

Add to the reasons: _"**Context for the list and its items,** on the owner's rule that a contextual parent–child link uses context, not a registry."_ Add the replaced passages to the end of the entry, and a dated line under the status, as for the fourth amendment.

### The context repair is core's unit (RF-69)

**`RF-69` is registered** in [`00-index.md`](https://github.com/ausginer/material-x/blob/ce1544fed/.plan/00-index.md) on `core/context-late-provider-1`, at `ce1544fed`, with its [handoff](https://github.com/ausginer/material-x/blob/ce1544fed/.plan/context-late-provider-1/context-late-provider-handoff.md). On the owner's direction, a consumer whose parent is a custom element waits, on every connect, for `customElements.whenDefined` of its parent's name, and then dispatches its request. The provider doesn't change. The text that this plan proposed for the finding is at `6214e3b57`.

**What this unit takes from it:**

- **It merges first.** Task 3's focus part starts once the repair is on this branch's base.
- **The items' writes are asynchronous.** A sortable list is a custom element, so an item applies its tab stop, description and handle semantics in a microtask after it connects, even when the list is already defined. A test that reads them in the task of the insertion awaits the resolution first.
- **Only the parent is waited for,** which matches ruling item 1's parent check.
- **A connection that ends before the wait settles writes nothing,** and runs no cleanup.

### Proposed drag finding: a cancel after the root left the document

For Mx Architect to register in `packages/drag/.plan/00-index.md`, as the next free `DRF-` (the highest on `origin` is `DRF-53`). `RD-31` doesn't wait for it: the list destroys its controller on disconnect, which is the README's path for an unmount.

> #### DRF-54 — `requestCancel()` after the root left the document reports a fault
>
> Tier C, **open**. Seen by Mx Implementer B on `repo/list-sortable-1` while implementing `repo:RD-31`, relayed by the coordinator on 2026-11-21. Not yet reproduced in drag's own suite.
>
> - **What happens:** a `sortable` list is removed from the document during a drag, and `requestCancel()` is called. The landing finds the placeholder disconnected and throws `sortable/landing-placeholder-lost` (`sortable/operation.ts`), which reaches `reportError` as a `DragFault`.
> - **Why it is a finding:** the README states no precondition that the root be connected when a cancel is requested, and a framework or the user can remove a list at any time. By `CONTRIBUTING.md` §1.1 an input the contract doesn't exclude is valid. Either the contract states the precondition, with `requestDestroy()` as the unmount path, or a cancel whose placeholder is disconnected ends the operation with `onEnd` and no landing.
> - **Not established:** whether `requestCancel()` with the root still connected and only the placeholder removed faults the same way.

## Q2: the keyboard model

The owner asked which model is more correct. The comparison stays here because the deferred keyboard design (`drag:DRD-70`) starts from it.

**The three models in use:**

- **Move controls:** buttons or a menu, such as _Move up_ and _Move down_.
- **Immediate arrows:** each arrow press, bare or with a modifier such as Alt, moves the item at once. This is drag's model, and the list's (Q4).
- **Grab, move, drop:** Space or Enter picks the item up, the arrows move it, Space or Enter drops it, and Escape puts it back. This is core's model today.

**What established patterns use.**

- **Grab, move, drop:**
  - [dnd-kit](https://docs.dndkit.com/guides/accessibility): Space or Enter picks up and drops, the arrows move.
  - [react-beautiful-dnd](https://raw.githubusercontent.com/atlassian/react-beautiful-dnd/HEAD//docs/sensors/keyboard.md) and its fork `@hello-pangea/dnd`: the spacebar lifts and drops, and Escape cancels. The lift is announced with the controls.
  - [React Aria](https://react-aria.adobe.com/dnd): pressing Enter on a draggable element starts drag and drop mode.
  - [GitHub](https://github.blog/engineering/exploring-the-challenges-in-creating-an-accessible-sortable-list-drag-and-drop/), after testing with screen-reader users: arrow keys after activation, with Enter or Escape to finish.
- **Immediate arrows with a modifier, beside buttons:** the [APG's rearrangeable listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/) moves an option with Alt + Up and Alt + Down, and also with toolbar buttons. Bare arrows move focus there.
- **Move controls:**
  - [Atlassian's Pragmatic drag and drop guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/): a menu on the handle.
  - [Chrome's guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/drag-and-drop): visible buttons or a menu are the _"Best default for discoverability and screen-reader compatibility"_.

The architect read Chrome's guidance, GitHub's article and the APG example in full. The other libraries' behavior is from their documentation as search results quoted it.

**What screen-reader users meet.** NVDA and JAWS read the page with the arrow keys in their browse mode, so a bare arrow press on a button doesn't reach the page.

- Chrome's guidance warns that _"screen-reader browse modes may intercept bare arrow keys on a `<button>` handle"_.
- It says of grab, move, drop: _"Arrow keys do nothing until the item is grabbed, which keeps them from conflicting with screen-reader navigation."_
- GitHub found that _"the arrow keys ignored drag-and-drop actions and performed typical screen reader navigation instead"_. They set `role="application"` on the handle only while a move is in progress.

**The recommendation was grab mode,** for those reasons. The owner deferred it (Q5) and chose drag's ordinary model for now (Q4).

**What that leaves.** A screen-reader user in browse mode must switch to focus mode before the arrow keys move an item.

- **It is the same limit as today:** core's grab mode also moved with bare arrows, and it set no role that changes the mode.
- **So nothing needs the owner's decision now.** It is a note for the deferred keyboard design, and for move controls, which also meet WCAG 2.2 §2.5.7 (dragging movements) and which neither core nor drag has.
- **A second note for later:** `mx-list` has no arrow-key navigation today. If it gains arrow-key focus movement between items, as Material's earlier MDC list had, it would conflict with arrow reordering from a handle-less item.

## Size: what each consumer pays

Read rows are in [Readings](#readings). The rest are **estimates**, and task 6 replaces them with readings.

| Consumer | Today | After |
| --- | --: | --: |
| drag, every composition | 2,189 to 7,143 | unchanged: no drag source changes |
| `mx-list` | 3,670 | about 1,000 to 1,500 (estimate): it loses core's trait |
| The interactive items | 4,580 to 4,750 | about the same (estimate): they lose the handle code and gain the context consumer, whose value carries the writes |
| `mx-list-item` | 2,570 | about 2,600 to 3,100 (estimate): it loses the handle code, and gains the context consumer, the focus indicator and `FocusForwarding` (Q6) |
| `mx-sortable-list` | — | about 8,500 to 9,500 (estimate) |

- **The plain list gets about 2 to 2.5 kB smaller.** It no longer carries core's 3.11 kB trait, minus the modules it shares with it.
- **The items' writes are the sortable list's bytes.** Each item applies its own handle semantics, description and tab stop, with code that the context's value carries from `list/sortable-list` ([Where the sortable writes live](#where-the-sortable-writes-live)), so a plain list's items carry only the consumer. `mx-list-item` also gains Material's focus indicator, whose source styles are under 1 kB before compression, and `FocusForwarding`. `RF-68`'s role is that unit's bytes, not this one's.
- **A sortable list costs about 5 kB more than today's reorderable list** (3.67 kB). drag's sortable with landing is 6.87 kB, against core's trait at 3.11 kB. That is the cost of moving to drag, which the owner chose. Task 6 checks it by reading.

## Owner's answers

Relayed by the coordinator: Q1 to Q5 on 2026-11-20, and Q6 with its follow-ups on 2026-11-21.

- **Q1: (a), the separate element `<mx-sortable-list>`.** _"Я думаю, стоит сделать отдельный элемент 🤔 Не очень хочется, но это более правильно."_ ("I think a separate element is worth it. I don't much want to, but it's more correct.")
- **Q2: a question, then a direction.**
  - He first asked _"Хммм... А как правильнее? 😮"_ ("Which is more correct?").
  - Then he directed grab mode as an option: _"надо его предусмотреть. Т.к. мы делаем универсальную библиотеку, то надо, чтобы такая опция была. Но важно, чтобы это нам не портило размер (ну или не сильно портило 🤔). Я думаю, можно отдельной фичей сделать"_ ("it has to be provided for. Since we're building a general-purpose library, that option should exist. But it mustn't hurt our size, or not much. I think it can be a separate feature").
  - He clarified: _"фичей — в смысле sortable feature"_ ("a feature, as in a sortable feature").
  - `drag:DRD-70` wrote the feature down, and Q5 deferred it.
- **Q3: the handle isn't required by default, and a consumer can require it.** _"Нет, не обязательна; однако если человек хочет сделать её обязательной — это надо предусмотреть."_ ("No, not required; but if someone wants to make it required, that has to be provided for.") The `handle-only` attribute that answered it retired after Q6: a handle now makes its own item handle-only.
- **Q5: the grab feature is deferred.** _"Так, фичу с захватом откладываем. Мне не очень нравится направление, тут надо, наверное, посидеть и отдельно подумать 🤔 Особенно мне не нравится идея "операция живёт между нажатиями", это прям подножка текущей архитектуре"_ ("So, we're deferring the grab feature. I don't much like the direction; I probably need to sit down and think about it separately. I especially dislike the idea that 'an operation lives across key presses'. That really trips up the current architecture.")
- **Q4: drag's ordinary mode, for now.** _"Соответственно, Q4 - пока что это будет обычный режим drag."_ ("Accordingly, Q4: for now it will be drag's ordinary mode.")
- **On focus:** _"Почему? 🤔"_ ("Why?"), about `mx-list-item`. Answered [above](#why-mx-list-item-doesnt-take-focus).
- **Q6: answered on 2026-11-21, neither as (a) nor exactly as (b).** Relayed by the coordinator in English translation only: _"If we make everything draggable, we must give a choice. Either through a handle: then dragging, keyboard included, is by the handle. Or, if the author wants no handle, the items must *become* draggable and get a tabindex. List items must not be tab stops permanently, but must become one when the developer chooses 'no handle'."_ It is (b) in substance, with the tab stop made conditional. [Q6: a handle-less item takes focus](#q6-a-handle-less-item-takes-focus) reads it.
- **Q6's follow-ups, answered on 2026-11-21,** on two points the coordinator asked him. Relayed in English translation only.
  - **The pointer with a handle:** _"Yes, probably the handle's presence should switch on handle-only by itself."_ The `handle-only` attribute from Q3 retires.
  - **The focused item's role:** the missing `listitem` role (`RF-68`, #92) is a bug to fix, in its own unit outside `RD-31`.

**What the plan asked, in short.**

- **Q1:** (a) a separate element, (b) a side-effect import that makes `<mx-list reorderable>` sort, or (c) a function.
- **Q2:** (a) drag's immediate arrows, or (b) today's grab mode, added to drag.
- **Q3:** (a) a handle is required, or (b) whole-surface drag stays, with a drag option to require the handle for keys only.
- **Q4:** (a) grab mode always in `<mx-sortable-list>`, or (b) immediate arrows by default with grab mode behind an attribute.
- **Q5:** (a) a kernel hold for keyboard operations, or (b) grab mode built from one-step commands.
- **Q6:** can a static `mx-list-item` without a handle be moved from the keyboard? (a) No, only through a handle (recommended). (b) Yes: in a sortable list without `handle-only`, it gets a tab stop and the arrow-key description.

## Questions for the owner

None is open. Q1 to Q6 are answered above.

## Implementation

One unit, on this plan's branch, `repo/list-sortable-1`: the implementer continues there, and the unit has one pull request, #90. That is the owner's rule of 2026-11-21, which #93 writes into `agent-workflow.md`. It doesn't wait for `RF-68`'s unit, and that unit doesn't wait for it. Use the `test-component` skill for every material-x test.

**Task 1. The reading before.** If `main`'s source differs from `e4b0e475d` in core, material-x or drag, read `just size` again in those packages and the probe, and save the result beside [`checks/size-before.txt`](checks/size-before.txt). Also save, for `list/list`, `list/list-item` and `complete`, the list of modules that the size bundle contains. Any bundling of the built entry with rolldown that lists the modules will do.

**Task 2. The sortable list.** Add `src/list/sortable-list.ts`, which defines `mx-sortable-list` with the behavior in [section 4](#4-the-sortable-lists-behavior).

- Add it to `files.json`'s `runtime` list and to `package.json`'s `exports`. Add `@ydinjs/drag` as an optional peer and a dev dependency (section 5).
- Import only drag's public entries: `sortable.js`, `sortable/y.js` and `sortable/landing.js`.
- Add the tag to `src/react.ts` with its `reorder` event, and check that the custom-element manifest lists it. The element has no attribute of its own.
- Check that the built `list/sortable-list.d.ts` and `react.d.ts` contain no `@ydinjs/drag` specifier.
- Check that the root `build` and `typecheck` build drag before material-x.
- The list provides its context, whose value carries the items' writes (task 3a), and writes nothing on its items. On disconnect it calls `requestDestroy()` and clears the lifted item's `drag` state, and on connect it creates a new controller ([section 4](#4-the-sortable-lists-behavior), Lifecycle).

**Task 3. The plain list and the items.** Remove `Reorderable`, `useReorderable`, `ReorderEvent` and the landing's CSS props from `list.ts`. Remove `useReorderableItem` and `enhanceHandle` from `ListItemCore.ts`. Move the items' sortable behavior into `ListItemCore`, gated by the list's context, as [How a static item takes focus](#how-a-static-item-takes-focus) rules: the item consumes the context with a parent check, detects its handle from its `start` and `end` slots, writes the handle semantics or its control's description, and, for `mx-list-item`, the tab stop on its inner `.host`. `mx-list-item`'s root delegates focus, and it composes `FocusForwarding`. `RF-69`'s unit lands first ([above](#the-context-repair-is-cores-unit-rf-69)). Those are the only additions to an item, and none imports a drag module. If an engine in the gate doesn't then give one tab stop on the inner `.host`, with `item.focus()` reaching it, stop and report. Move the `Draggable` story to `mx-sortable-list`, and add one story with button items and no handles, and one with static items, some with handles and some without. A story's handler may stay a React state update, which the commit wait allows. Task 3a moves the writes out of `ListItemCore`.

**Task 3a. The writes leave the items,** on top of `88801757e`, as [Where the sortable writes live](#where-the-sortable-writes-live) rules.

- Move the handle semantics, the description, the static item's tab stop, the record of what the item wrote and `handleOf` into a module that only `list/sortable-list` imports. The context's value carries them, with the parent check. `ListItemCore` keeps the consumer, its slot observers and its call into the value, and holds no description text or record.
- The record covers the handle and an interactive item's control. `mx-list-item`'s inner `.host` needs none.
- Every row of `tests/list` passes unchanged, and `traits-baseline` doesn't change. A row that needs a change is a stop, because no behavior changes.
- Read task 6's sizes and module lists again, with the ablation's _no sortable code_ column, and replace the table in `checks/size-after.txt`. Show that the description text is in no module of a plain item's row. Run the accessibility probe again, and confirm that `checks/list-a11y-after.txt` reads the same.
- Then task 7's dated lines, naming the final commit.

**Task 4. Tests.** Write the material-x rows in the [test map](#test-map), in `tests/list/`.

- They run in the gate's engines. A row that needs media emulation, such as the reduced-motion row, runs only where the engine supports it (`RD-6` property 6).
- Update `traits-baseline` in exactly four ways: `Reorderable` leaves `TRAITS`, `mx-list` loses `reorderable`, `mx-sortable-list` is added with the same attributes as `mx-list`, none, and `mx-list-item` gains `FocusForwarding` (its `instanceOf` flag, and `focus` and the trait's symbol on the prototype). Its observed attributes don't change.

**Task 5. Remove core's trait.** Delete `src/traits/reorderable.ts`, `tests/traits/reorderable.browser.test.ts`, the `./traits/reorderable.js` export, the `files.json` entry, the `.size-limit.json` row and the README section. Rebuild core before typechecking material-x.

**Task 6. The reading after, and the standing check.**

- Run `just size` again in core and material-x. In `checks/size-after.txt`, tabulate `list/list`, `list/list-item`, `list/list-button-item`, `list/list-link-item`, `list/sortable-list` and `complete`, with the reading before beside each. Give the reason for each change, and compare with the [estimates](#size-what-each-consumer-pays).
- Save the module lists again, and add `list/sortable-list`'s. **Required:** no module under `packages/drag` or `packages/box-quad` is in any row except `list/sortable-list` and `complete`. `list/list` doesn't grow. `list/list-button-item` and `list/list-link-item` grow, if at all, only by the context consumer, and `list/list-item` only by the consumer, its focus indicator and `FocusForwarding`. The report gives those bytes.
- **The accessibility reading:** run the [probe](probes/list-a11y.ts), extended to an `mx-sortable-list` with a handle-less static item, and save it as `checks/list-a11y-after.txt`. Record the tab order, and the focused item's role, name and description in Chromium. Its role is `generic` unless `RF-68`'s fix is on the branch's base.
- **The standing check:** a test over the built package that follows the static imports of each `files.json` runtime entry. It fails if any entry other than `list/sortable-list` reaches `@ydinjs/drag`. Prove it can fail: temporarily add `import '@ydinjs/drag/sortable.js'` to `list.ts`, and record the failure in the report.

**Task 7. Documentation and record.**

- Document `mx-sortable-list` in its JSDoc:
  - the handle, which makes its item drag only by the handle;
  - that a static item without a handle becomes a tab stop, and only in a sortable list;
  - the arrow keys, and which items they reach;
  - `data-drag-ignore` for nested controls that use arrow keys;
  - the event and the commit wait;
  - that the consumer installs `@ydinjs/drag`.
- Add the sortable list to `list.mdx`, and replace _"Reveal, reorder, …"_ with what is now true.
- Write `list-sortable-report.md`. Add dated lines to `RD-31` and `RF-36`, naming the commit.

**Verification:** `handoff.md` for every changed file. Run material-x's and core's test suites, the root `just typecheck` and `just typecheck-declarations`, and `just docs-build`.

**Stop and report to the architect if:**

- a behavior in section 4 needs a drag change. One example: a lifted visual inside the item's shadow root that doesn't land correctly when the consumer moves the item during the commit wait. That would be a drag finding;
- `traits-baseline` changes in any other way than task 4 states;
- a plain list row reaches drag, or grows;
- `mx-sortable-list` reads more than 9.6 kB Brotli, the top of the estimate;
- `mx-list-item` reads more than 3.1 kB Brotli, or grows by anything other than the context consumer, its focus indicator and `FocusForwarding`;
- an interactive item grows by more than 150 B;
- a new row stalls or fails intermittently in WebKit or Firefox.

**The pull request** says `Closes #86` and `Closes #44`, the issue that tracks `RF-36`.

## Test map

Core's rows in `tests/traits/reorderable.browser.test.ts` at `e4b0e475d`:

- **M:** becomes a material-x row on `mx-sortable-list`.
- **D:** drag's suite covers the mechanism, so the row isn't copied.
- **X:** the behavior is gone, so the row is deleted.

| Core row | Disposition |
| --- | --- |
| `ReorderEvent`: bubbles; crosses shadow DOM; is cancelable | **M**, on material-x's event |
| `Reorderable`: the attribute's three rows | **X**: no `reorderable` attribute (Q1), and no `handle-only` (Q6) |
| not set dragged state when reorderable is false | **X**. Replaced by **M**: `mx-list` doesn't drag |
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
| keyboard: grab the item when Space is pressed on its handle; step the footprint forward on ArrowDown | **X** (Q4). Replaced by **M**: ArrowDown on the focused handle moves the item one slot and dispatches `from`, `to` |
| keyboard: not grab when the key lands off the handle | **M**: in an item with a handle, an arrow key on another focused element moves nothing |
| keyboard: dispatch the stepped indices on drop | **M**, as above |
| keyboard: settle promptly on the consumer commit, not the timeout | **M** |
| keyboard: no reorder when the grab is canceled with Escape; no reorder for a keyboard drop that never moved | **X** (Q4). The edge rule is **D** |
| keyboard: announce the grab through a shadow-owned live region | **M**, changed: each accepted move is announced by position |

**New M rows:**

- with no handle, a press anywhere on the item drags it. With a handle, a press on the item outside the handle doesn't drag it;
- ArrowDown on a focused `mx-list-button-item` without a handle moves it, and Space still activates it;
- a static `mx-list-item` without a handle is a tab stop in `mx-sortable-list`, and ArrowDown on it moves it. Its focus indicator shows. It isn't a tab stop in `mx-list`, nor once it has a handle, nor after it leaves the sortable list, and it is one again when the handle is removed. The list writes no attribute on the item's host in any of these states;
- a handle-less static item in `mx-sortable-list`: Tab reaches its inner `.host` once and leaves it, Shift+Tab returns, and `item.focus()` focuses it in every engine. In `mx-list`, neither Tab nor `item.focus()` focuses it;
- after a keyboard move of a static item, focus is on its inner `.host`, and a second ArrowDown moves it again;
- the focused handle-less static item has the arrow-key description, and a button item has no tab stop added;
- ArrowDown in a text field marked `data-drag-ignore` inside a handle-less item moves the caret and not the item;
- after a keyboard move, focus is where it was, and a second ArrowDown moves the item again;
- a consumer that never commits: the item lands within the bound, and its `drag` state is cleared;
- handle semantics are written in a sortable list, the description reaches a handle-less interactive item, consumer values are kept, a handle added later is covered, and nothing is written in `mx-list`;
- an item added during a drag: the drop's `from` and `to` describe the new collection;
- definition order: with the markup parsed first, a handle-less static item becomes a tab stop whether `list/list-item.js` or `list/sortable-list.js` is evaluated first;
- an `mx-list` nested inside a sortable list's item: its items take no tab stop, no description and no handle semantics;
- a handle-less button item gains a handle: the description leaves the button and the handle gets its semantics, and the reverse when the handle is removed;
- an item moved from the sortable list into an `mx-list`: everything the item wrote is gone, and a consumer's own values are still there;
- a disconnect during a drag clears the item's `drag` state, reports no `DragFault`, and a reconnected list sorts again;
- a pointer drop and a keyboard move are announced;
- reduced motion: the landing has zero duration.

## Not adopted

- **A side-effect import, or a function call,** instead of an element: [section 2](#2-sorting-is-a-separate-element-in-a-separate-entry-q1).
- **drag as a regular dependency.** It is simpler, but two copies of drag break the nesting rule, and every material-x install would fetch drag and box-quad.
- **A `reorderable` attribute on `mx-sortable-list`.** An element whose only job is sorting doesn't need a second switch. A canceled event covers what an attribute would.
- **Grab mode in this unit.** The owner deferred it (Q5). `drag:DRD-70` keeps the proposal, not in force.
- **Passing the event to `handle(item, event)`** so that pointer and keyboard can differ. With drag's ordinary model, the same rule serves both, and `data-drag-ignore` covers nested controls.
- **Making the list mark nested controls `data-drag-ignore` itself.** The list can't know which of a consumer's controls use arrow keys, and drag's attribute is the consumer's.
- **`layoutAnimation` for the displaced rows.** Today's rows don't animate. Adding it is a separate choice, with its bytes.
- **Moving core's synthetic-host rows into material-x unchanged.** They test a trait that no longer exists, through a host that isn't the component.
- **`handle-only`.** The owner retired it after Q6: a handle's presence makes its item drag only by the handle ([Q6](#q6-a-handle-less-item-takes-focus)).
- **A list-level switch between handles and no handles.** Whether an item has `[data-handle]` already says it, per item.
- **A tab stop on every static item, or in `mx-list`.** The owner's Q6 answer makes it conditional: only a handle-less static item in a sortable list.
- **`aria-roledescription` or `aria-grabbed` to say that an item moves.** The first replaces the role in what a screen reader announces, and ARIA 1.1 deprecated the second. The arrow-key description says it.
- **The `listitem` role in this unit.** `RF-68` is its own unit (#92), on the owner's direction.
- **Move controls in this unit.** They are the strongest model for screen readers, and a separate feature ([Q2](#q2-the-keyboard-model)).
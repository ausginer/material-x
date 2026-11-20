# The list's sortable items on `@ydinjs/drag` — plan

**Status: the owner answered Q1 and Q3 and gave a direction for Q2 on 2026-11-20 ([Owner's answers](#owners-answers)). Two new questions, [Q4 and Q5](#questions-for-the-owner), are open, and implementation waits for them.** The architect wrote this plan on 2026-11-20 at `e4b0e475d` (`origin/main`), on `repo/list-sortable-1`, for the coordinator's task on issue #86, and revised it the same day for the answers. The owner asked for it in these words: _"reorderable in core needs to be replaced with our new shiny drag, with a separate import for List where sortable items are needed"_. The decisions are [`repo:RD-31`](../00-index.md) for the list and core, and [`drag:DRD-70`](../../packages/drag/.plan/00-index.md) for drag's grab mode. Where an entry and this plan differ, the entry governs.

The plan is repository-level because the work changes three packages:

- it deletes code from `core`;
- it adds code to `material-x`, which then depends on `drag`;
- it adds a feature to `drag`.

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
  - Pointer drops aren't announced.
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
  - So a `[data-handle]` in a list that doesn't reorder is announced as a _Reorder_ button that does nothing.
- The item's host is `display: contents`, so the visual must be the inner `.host`. The list's `:host` is a flex column with a `gap`. `::slotted([data-footprint])` styles the placeholder from `--_footprint-color` and `--_footprint-opacity`.
- **No arrow-key navigation.** No list module handles a key. `mx-list-button-item` and `mx-list-link-item` render a `<button>` and an `<a>`, which take focus in the tab order. `mx-list-item` doesn't take focus.
- `list.stories.tsx`'s `Draggable` story uses `reorderable`, `onreorder` and `data-handle`.
- `tests/traits-baseline.browser.test.ts` imports core's `Reorderable` into its `TRAITS`, and `__snapshots__/traits-baseline.json` records `mx-list`'s `reorderable` attribute.
- `src/react.ts` is maintained by hand and imports the types of every element.
- `list.mdx` doesn't describe reordering.

**What else depends on core's trait: nothing.** A search of the tree outside `.plan/` finds core's `package.json` export, its `files.json` entry, its `.size-limit.json` row, its README section and its test file, and the material-x files above. No other package, script, workflow or configuration names it. **core is on no registry** (nothing `@ydinjs` is published yet; `RD-27`). So `CONTRIBUTING.md` §8 applies: the export is deleted completely, with no alias. `AnimationTiming` has no other user.

**drag's sortable**, as its source and README describe it at `e4b0e475d`:

- `sortable(root, config)` takes `items()`, `axis` and `onReorder`. It also takes `onStart`, `onEnd`, `threshold`, `handle`, `visual`, `box`, `placeholder`, `landing` and `displacement`, which are optional. It returns `invalidate()`, `requestCancel()` and `requestDestroy()`.
- `items()` is pulled at each press and command and again at activation. The consumer calls `invalidate()` when the collection changes during a drag.
- **`onReorder(request, { signal })` decides,** and it may return a promise. The request has `item`, `from`, `to`, `previous` and `next`.
  - After an accepted verdict, the visual lands where the item is in the DOM at that moment (`SortableOperation.#landingTarget`).
  - So a commit made before the verdict resolves lands the item at its new slot, and an accepted verdict with no commit lands it home.
- **Keyboard: one command per key press.**
  - An arrow key on the item, or on its handle when `handle` is given, moves the item one slot. The move is proposed through `onReorder`, and the item is dropped immediately.
  - At the collection's edge the key isn't admitted, and it keeps its native meaning.
  - Escape cancels.
  - There is no grab mode. The kernel drops a command's operation right after it activates (`Session`'s constructor and `#activate`).
- **Focus:** the kernel gives focus back to the element inside the item that had it, so a second arrow press works after a reorder (`drag:DRD-9`). The README's _Focus_ item says: _"You own `tabindex`, roles and any announcement of the new order."_
- **`handle(item)`** gates pointer presses and keyboard commands alike. When it returns `null`, the item isn't admitted.
- **The placeholder** has `data-drag-placeholder`, is `aria-hidden`, gets the item's `slot`, and is sized inline. The library writes no other styling.
- **`y()`** accepts a flex column with a `gap`.
- **`landing()`** from `sortable/landing.js` gives the landing zero duration under `prefers-reduced-motion: reduce`. A custom timing is `{ ...landing(), timing }`.
- **Features fill named slots** (`drag:DRD-33`): `axis`, `landing`, `displacement` and `placeholder`. A feature is a value imported on its own. A composition that omits it pays only the slot's call sites, and _"The kernel doesn't change"_ (C10).
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
- `RD-30`, on `core/side-effects-1` and not yet on `main`, counts the 27 core modules at `e4b0e475d`, and `traits/reorderable` is one of them. Whichever branch merges second updates the count.

## What drag covers, and what the list adds

| The list needs | drag gives | The sortable list adds |
| --- | --- | --- |
| Reordering a column by pointer | `sortable` with `y()` | — |
| A visual inside the item's shadow root | `visual(item)` | The item's inner `.host` |
| Dragging by the whole item, or by a handle | `handle(item)` | The handle when the item has one, otherwise the item |
| Grab mode from the keyboard, on a handle only | **Missing.** `DRD-70` adds `grab()` | Its keyboard handle, and its hooks |
| Announcing the grab, the steps and the drop | Nothing: the consumer's job | A live region in its shadow root |
| Screen readers passing arrow keys during a grab | Nothing: the consumer owns roles | `role="application"` on the handle during the grab |
| A `reorder` event that the consumer commits | An `onReorder` that may resolve later, with a `signal` | Dispatching the event, and waiting until its slot shows the move |
| The `drag` state for elevation | `onStart` and `onEnd` | Setting and clearing the state |
| Landing timing from CSS custom properties | A custom `timing` on `landing()` | Reading `--_drag-duration` and `--_drag-easing` |
| Ending a drag on disconnect | `requestCancel()` | Calling it |
| Items added or removed during a drag | `invalidate()` | Calling it when its items change |

**One thing is missing from drag:** a keyboard operation that stays lifted across key presses. Q3's answer also needs a keyboard handle separate from the pointer's, and `DRD-70` property 3 gives the grab its own.

## Decided here

`repo:RD-31` and `drag:DRD-70` record these as properties. This section explains them.

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

Only `list/sortable-list` imports `@ydinjs/drag`. No module that another runtime entry reaches imports it, directly or through another module. That includes the list items, so `useReorderableItem`'s registry and `enhanceHandle` leave `ListItemCore`. A standing test checks the import graph of the built package (task B6), so the property can't regress silently. A size reading proves the effect once.

### 4. The sortable list's behavior

- **The collection** is the list's slotted item elements in slot order, as a new array after each change. The placeholder isn't an item. During a drag, the list calls `invalidate()` once its slot shows a changed collection. A slot change that changes only the placeholder isn't a collection change, so moving the placeholder doesn't make drag measure the rows again.
- **The handle is optional (Q3).**
  - By default, a press on an item's `[data-handle]` drags the item. If the item has no handle, a press anywhere on the item drags it. These are today's rules.
  - With the boolean attribute **`handle-only`** (property `handleOnly`), an item is dragged only by its handle, and an item with no handle can't be dragged. It is still displaced by the others.
- **The keyboard is grab mode (Q2, Q4),** with `DRD-70`'s `grab()`.
  - Space or Enter on a focused handle grabs the item. The arrow keys move it one slot at a time, and Space or Enter drops it. Escape, Tab or focus leaving the handle cancels the grab, and the item returns to where it started.
  - Arrow keys do nothing until an item is grabbed. Space and Enter on a `mx-list-button-item` or a `mx-list-link-item` keep activating it.
  - **The keyboard always needs a handle,** whatever `handle-only` says. Space and Enter activate an interactive item, and `mx-list-item` can't take focus. So a list without handles can be reordered only by pointer, and the JSDoc says to give items a handle for keyboard users. This is today's rule as well.
- **Handle semantics.** In a sortable list, a `[data-handle]` gets:
  - `tabindex="0"`, `role="button"` and the accessible name _Reorder_;
  - an accessible description: _Press Space to grab, use the arrow keys to move, Space to drop, Escape to cancel_;
  - `touch-action: none`.

  Values the consumer set are kept, as today. This also applies to a handle added to an item after the item is slotted. During a grab, the handle has `role="application"`, so that NVDA and JAWS pass the arrow keys to the page instead of reading with them. Its own role comes back when the grab ends. In `mx-list`, nothing is written to a `[data-handle]`.

- **The `reorder` event** is dispatched on the list from `onReorder`. It bubbles, is composed and is cancelable.
  - It carries `item`, `from`, `to`, `previous` and `next`. `previous` and `next` are the items on either side of the new slot.
  - So `list.insertBefore(event.item, event.next)` applies the move, even while the placeholder is a child of the list.
  - `preventDefault()` rejects the move, and the item lands home.
  - The event class is material-x's own, exported from the entry as a type and a class.
  - A grab dispatches one event for the whole move, at the drop.
- **The commit wait.**
  - If the event isn't canceled, the verdict is accepted once the list's slot shows `item` at `to`.
  - The consumer may commit synchronously in the handler or later, for example in a framework render. The item stays lifted until then.
  - If the slot doesn't show the move within a bound, the verdict is accepted anyway, and the item lands where the DOM has it. The bound is a named constant, 500 ms as today.
  - An aborted `signal` ends the wait.
- **Announcements** go through a polite live region in the list's shadow root, and only when something changed. They name the position and the number of items:
  - _Grabbed. Item 2 of 5._ at the grab, followed by the keys;
  - _Item 3 of 5._ after each step;
  - _Dropped. Item 3 of 5._ at an accepted drop;
  - _Reorder canceled. Item 2 of 5._ at a cancel or a rejection.

  A pointer drop is announced too, because drag's `onEnd` doesn't say what started the drag. Today only keyboard steps are announced.

- **State.** The item has the custom state `drag` from `onStart` to `onEnd`, however the drag ends.
- **Placeholder.** The list's footprint rule matches `[data-drag-placeholder]` and keeps today's shape, color and opacity.
- **Landing.** Composed from `sortable/landing.js`, with a timing that reads `--_drag-duration` and `--_drag-easing` at each landing. Under `prefers-reduced-motion: reduce`, the landing has zero duration, as `landing()` gives. No `layoutAnimation`: the other rows move without animation, as today.
- **Lifecycle.** One controller per list for the list's life. A disconnect cancels the operation, and a reconnected list sorts again. If drag's controller holds a listener outside the list between operations, the list destroys it on disconnect and creates a new one on connect.

### 5. drag is an optional peer of material-x

The rule is `CONTRIBUTING.md` §Dependencies of a published package, question 2: the package must share the consumer's copy.

- `drag:DRD-17`'s nesting rule holds within one copy of drag. With two copies, one press on a sortable list inside a consumer's own drag sortable would be admitted twice.
- Only an optional entry imports drag, so `peerDependenciesMeta` marks it optional. The workspace installs it in material-x's `devDependencies`.
- A consumer that doesn't use `mx-sortable-list` installs nothing new. box-quad comes in through drag's own `dependencies`.
- The peer's range is set at material-x's release, under `RD-27` property 1 and the peer rules. Until then, it names the workspace version.

### 6. Behavior tests move to material-x

Core's suite tests the trait through a synthetic host. Its rows that describe the list's behavior become rows of the real `mx-sortable-list`, with real browser input. Rows that test drag's own mechanics are covered by drag's suite, including `DRD-70`'s new rows, and aren't copied. Rows for behavior that no longer exists are deleted. The [test map](#test-map) lists every row.

### 7. RF-36 ends with the code it is about

Both of `RF-36`'s rows and the code they test are deleted. The finding closes with its cause unknown, because the code no longer exists. Its required property doesn't carry over to the new rows. A Safari stall in a sortable-list row is either `drag:DRF-49` or a new finding.

### 8. Release order

- **box-quad, then drag: unchanged order, and drag's release (#57) now waits for `DRD-70`.** Grab mode is new public API in drag, so it lands before drag's first release. After the release, it would be drag's first change.
- **material-x's release now also comes after drag's.** `RD-27` property 1 requires every `@ydinjs` dependency to be on the registry at the dependent package's release. drag's version at that point is the owner's answer at drag's release, and material-x's peer range follows it.
- **The list's work doesn't wait for drag's release.** material-x uses drag's workspace build. It needs `DRD-70` on `main`, or the list's branch stacks on drag's.

## Q2: the keyboard model

The owner asked which model is more correct. This is the answer, with its sources.

**The three models in use:**

- **Move controls:** buttons or a menu, such as _Move up_ and _Move down_.
- **Immediate arrows:** each arrow press, bare or with a modifier such as Alt, moves the item at once. This is drag's model today.
- **Grab, move, drop:** Space or Enter picks the item up, the arrows move it, Space or Enter drops it, and Escape puts it back. This is core's model today.

**What established patterns use.**

- **Grab, move, drop:**
  - [dnd-kit](https://docs.dndkit.com/guides/accessibility): Space or Enter picks up and drops, the arrows move.
  - [react-beautiful-dnd](https://raw.githubusercontent.com/atlassian/react-beautiful-dnd/HEAD//docs/sensors/keyboard.md) and its fork `@hello-pangea/dnd`: the spacebar lifts and drops, and Escape cancels. The lift is announced with the controls.
  - [React Aria](https://react-aria.adobe.com/dnd): _"pressing Enter on a draggable element puts it into drag and drop mode"_.
  - [GitHub](https://github.blog/engineering/exploring-the-challenges-in-creating-an-accessible-sortable-list-drag-and-drop/), after testing with screen-reader users: arrow keys after activation, with Enter or Escape to finish.
- **Immediate arrows with a modifier, beside buttons:** the [APG's rearrangeable listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/) moves an option with Alt + Up and Alt + Down, and also with toolbar buttons. Bare arrows move focus there.
- **Move controls:**
  - [Atlassian's Pragmatic drag and drop guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/): a menu on the handle.
  - [Chrome's guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/drag-and-drop): visible buttons or a menu are the _"Best default for discoverability and screen-reader compatibility"_.

**What screen-reader users meet.** NVDA and JAWS read the page with the arrow keys in their browse mode, so a bare arrow press on a button doesn't reach the page.

- Chrome's guidance warns that _"screen-reader browse modes may intercept bare arrow keys on a `<button>` handle"_.
- It says of grab, move, drop: _"Arrow keys do nothing until the item is grabbed, which keeps them from conflicting with screen-reader navigation."_
- GitHub found that _"the arrow keys ignored drag-and-drop actions and performed typical screen reader navigation instead"_. They set `role="application"` on the handle only while a move is in progress.
- Space and Enter on a button do reach the page in browse mode, so a grab can start there. The grab is also the moment to tell the user the keys.
- With immediate arrows, a screen-reader user in browse mode can't reorder at all, unless they switch modes by hand.

**Arrow keys and the list's own focus movement.** `mx-list` has no arrow-key navigation (see [Readings](#readings)), so neither model conflicts with it. With the owner's Q3 answer, an item without a handle is dragged by its whole surface, and such an item can hold a text field. Immediate arrows admitted on the whole item would take that field's arrow keys. Grab mode leaves every arrow key alone until a grab starts on a handle.

**Fit with Q3, where no handle is the default.** Both models need a focusable handle for the keyboard. Space and Enter on `mx-list-button-item` and `mx-list-link-item` activate them, and `mx-list-item` can't take focus. Grab mode's Space or Enter on the handle doesn't interfere with the whole-surface pointer drag.

**Discoverability and announcements.**

- **Grab mode** announces the grab with the keys, each step and the drop or cancel. Escape returns the item to where it started, and the consumer sees one `reorder` event per move.
- **Immediate arrows** have no moment to announce the keys, only the handle's description. Each press is a committed move with its own event, so Escape can't undo the earlier presses.

**The cost.** Grab mode isn't in drag today. `DRD-70` adds it as a `sortable` feature, `grab()`, which a consumer imports only to use. The kernel needs a hold for a keyboard operation that stays active across key presses, which every drag composition pays (Q5). It is new public API, so drag's release (#57) waits for it.

**Recommendation: grab mode for `mx-sortable-list`.** It is the model that keyboard and screen-reader users meet most often in other products. It tells them the keys when they pick an item up. It leaves the arrow keys alone until they ask to move something. Escape really puts the item back. Immediate arrows are smaller, but in a screen reader's normal reading mode their key presses never reach the page. So drag keeps immediate arrows as its default for consumers who don't import `grab()`, and the list uses grab mode.

**The strongest model for screen readers is move controls**, which also meet WCAG 2.2 §2.5.7, dragging movements. Neither core nor drag has them, and this plan doesn't add them. They are a separate feature for a later decision.

## Size: what each consumer pays

Read rows are in [Readings](#readings). The rest are **estimates**, and tasks A5 and B6 replace them with readings.

| Consumer | Today | After |
| --- | --: | --: |
| drag without `grab()`, such as "sortable + y" | 6,533 | 6,533 plus the kernel hold: estimated tens of bytes |
| drag with `grab()`: "sortable + y + landing + grab" | — | 6,866 plus about 300 to 600 (estimate) |
| `mx-list` | 3,670 | about 1,000 to 1,500 (estimate): it loses core's trait |
| `mx-list-item` and the interactive items | 2,570 to 4,750 | slightly less: they lose the handle code |
| `mx-sortable-list` | — | about 9,000 to 10,000 (estimate) |

- **The plain list gets about 2 to 2.5 kB smaller.** It no longer carries core's 3.11 kB trait, minus the modules it shares with it.
- **A sortable list costs about 5 to 6 kB more than today's reorderable list** (3.67 kB). drag's sortable with landing is 6.87 kB, against core's trait at 3.11 kB, and grab mode adds a few hundred bytes. That is the cost of moving to drag, which the owner chose. The estimate is checked by reading in task B6.
- **A drag consumer who doesn't import `grab()` pays only the kernel hold,** which the owner accepts or refuses at Q5.

## Owner's answers

Relayed by the coordinator on 2026-11-20.

- **Q1: (a), the separate element `<mx-sortable-list>`.** _"Я думаю, стоит сделать отдельный элемент 🤔 Не очень хочется, но это более правильно."_ ("I think a separate element is worth it. I don't much want to, but it's more correct.")
- **Q2: grab mode as an option, as a sortable feature, without hurting the size.** First he asked _"Хммм... А как правильнее? 😮"_ ("Which is more correct?"). Then he wrote _"надо его предусмотреть. Т.к. мы делаем универсальную библиотеку, то надо, чтобы такая опция была. Но важно, чтобы это нам не портило размер (ну или не сильно портило 🤔). Я думаю, можно отдельной фичей сделать"_ ("it has to be provided for. Since we're building a general-purpose library, that option should exist. But it mustn't hurt our size, or not much. I think it can be a separate feature"). He then clarified: _"фичей — в смысле sortable feature"_ ("a feature, as in a sortable feature"). `DRD-70` is that feature, and Q4 asks which model the list uses.
- **Q3: the handle isn't required by default, and a consumer can require it.** _"Нет, не обязательна; однако если человек хочет сделать её обязательной — это надо предусмотреть."_ ("No, not required; but if someone wants to make it required, that has to be provided for.") This is neither (a) nor (b) as the plan first wrote them. Section 4 has the result: whole-surface drag by default, and `handle-only` to require the handle.

**What the plan asked before the answers,** in short:

- **Q1:** (a) a separate element, (b) a side-effect import that makes `<mx-list reorderable>` sort, or (c) a function.
- **Q2:** (a) drag's immediate arrows, or (b) today's grab mode, added to drag.
- **Q3:** (a) a handle is required, or (b) whole-surface drag stays, with a drag option to require the handle for keys only.

## Questions for the owner

**Q4. Which keyboard model does `<mx-sortable-list>` use?**

- **(a) Recommended:** grab mode, always. `list/sortable-list` includes `grab()`, a few hundred bytes, and no attribute chooses. Plain `mx-list` is unaffected. The reasons are in [Q2: the keyboard model](#q2-the-keyboard-model).
- (b) Immediate arrows by default, and grab mode with an attribute. `list/sortable-list` still includes `grab()`, because an attribute can't keep code out of a bundle. So the bytes are the same as (a), and the list offers a second model that screen readers handle worse.

**Q5. Does drag's kernel get a hold for keyboard operations?**

- **(a) Recommended:** yes. The kernel keeps a command's operation active until the operation asks to drop, and passes it the key presses meanwhile. Every drag composition pays this, "draggable alone" included, estimated at tens of bytes Brotli. drag's unit measures it, and the owner approves the reading before the change merges (`DRO-20`).
- (b) No kernel change: `grab()` is built from today's one-step commands. Then every arrow press commits a move, fires a `reorder` event and animates a landing. Escape can put the item back only with a second reorder.

## Implementation

Two units, after the owner's answers to Q4 and Q5. If an answer isn't (a), the architect amends this plan and the entries first. Unit A is drag's. Unit B is the list's, and it starts once unit A is on `main`, or stacks on unit A's branch.

### Unit A: drag's grab mode (`drag:DRD-70`)

- **A1. The kernel hold** (`DRD-70` property 6). Measure every drag row before and after, "draggable alone" included. **Stop and report the readings, so that the owner can approve them before the unit goes on (Q5).**
- **A2. `grab(options?)`** in `src/sortable/grab.ts`, the `keyboard` slot in `SortableConfig`, and the `./sortable/grab.js` entry in `package.json`'s `exports` and in `files.json`. The behavior is `DRD-70` properties 2 to 5.
- **A3. Tests** (`DRD-70` property 8): run them in the source and consumer projects, in Chromium, Firefox and WebKit.
- **A4. The contract and the README** describe the slot, the keys, the hooks, and what the consumer owns: roles and announcements.
- **A5. Size.** Add the row "sortable + y + landing + grab", with `grab` in its `present` list, and add `sortable/grab` to the `absent` list of every other row. Move the ceilings to the readings under `DRO-20` once the owner has approved them. In the report, give each row's reading against the unit's input.

### Unit B: the list (`repo:RD-31`)

Use the `test-component` skill for every material-x test.

- **B1. The reading before.** If `main`'s source differs from `e4b0e475d` in core, material-x or drag, read `just size` again in those packages and the probe, and save the result beside [`checks/size-before.txt`](checks/size-before.txt). Also save, for `list/list`, `list/list-item` and `complete`, the list of modules that the size bundle contains. Any bundling of the built entry with rolldown that lists the modules will do.
- **B2. The sortable list.** Add `src/list/sortable-list.ts`, which defines `mx-sortable-list` with the behavior in [section 4](#4-the-sortable-lists-behavior).
  - Add it to `files.json`'s `runtime` list and to `package.json`'s `exports`. Add `@ydinjs/drag` as an optional peer and a dev dependency (section 5).
  - Import only drag's public entries: `sortable.js`, `sortable/y.js`, `sortable/landing.js` and `sortable/grab.js`.
  - Add the tag to `src/react.ts` with its `reorder` event and its `handle-only` attribute, and check that the custom-element manifest lists them.
  - Check that the built `list/sortable-list.d.ts` and `react.d.ts` contain no `@ydinjs/drag` specifier.
  - Check that the root `build` and `typecheck` build drag before material-x.
- **B3. The plain list and the items.** Remove `Reorderable`, `useReorderable`, `ReorderEvent` and the landing's CSS props from `list.ts`. Remove `useReorderableItem` and `enhanceHandle` from `ListItemCore.ts`. Move the `Draggable` story to `mx-sortable-list`, and add one story without handles and one with `handle-only`. A story's handler may stay a React state update, which the commit wait allows.
- **B4. Tests.** Write the material-x rows in the [test map](#test-map), in `tests/list/`.
  - They run in the gate's engines. A row that needs media emulation, such as the reduced-motion row, runs only where the engine supports it (`RD-6` property 6).
  - Update `traits-baseline` in exactly three ways: `Reorderable` leaves `TRAITS`, `mx-list` loses `reorderable`, and `mx-sortable-list` is added with `handle-only`.
- **B5. Remove core's trait.** Delete `src/traits/reorderable.ts`, `tests/traits/reorderable.browser.test.ts`, the `./traits/reorderable.js` export, the `files.json` entry, the `.size-limit.json` row and the README section. Rebuild core before typechecking material-x.
- **B6. The reading after, and the standing check.**
  - Run `just size` again in core and material-x. In `checks/size-after.txt`, tabulate `list/list`, `list/list-item`, `list/list-button-item`, `list/list-link-item`, `list/sortable-list` and `complete`, with the reading before beside each. Give the reason for each change, and compare with the [estimates](#size-what-each-consumer-pays).
  - Save the module lists again, and add `list/sortable-list`'s. **Required:** no module under `packages/drag` or `packages/box-quad` is in any row except `list/sortable-list` and `complete`, and none of the four plain list rows grows.
  - **The standing check:** a test over the built package that follows the static imports of each `files.json` runtime entry. It fails if any entry other than `list/sortable-list` reaches `@ydinjs/drag`. Prove it can fail: temporarily add `import '@ydinjs/drag/sortable.js'` to `list.ts`, and record the failure in the report.
- **B7. Documentation and record.**
  - Document `mx-sortable-list` in its JSDoc: the handle and `handle-only`, the keys, the event, the commit wait, that the keyboard needs a handle, and that the consumer installs `@ydinjs/drag`.
  - Add the sortable list to `list.mdx`, and replace _"Reveal, reorder, …"_ with what is now true.
  - Write `list-sortable-report.md`. Add dated lines to `RD-31` and `RF-36`, naming the commit.

**Verification for each unit:** `handoff.md` for every changed file, and the changed packages' test suites. Run the root `just typecheck` and `just typecheck-declarations`. Unit B also runs `just docs-build`.

**Stop and report to the architect if:**

- a behavior in section 4 needs more from drag than `DRD-70` gives. One example: a lifted visual inside the item's shadow root that doesn't land correctly when the consumer moves the item during the commit wait. That would be a drag finding;
- `traits-baseline` changes in any other way than task B4 states;
- a plain list row reaches drag, or grows;
- `mx-sortable-list` reads more than 10 kB Brotli, the top of the estimate;
- a new row stalls or fails intermittently in WebKit or Firefox.

**Pull requests:** unit A's says `Refs #86`. Unit B's says `Closes #86` and `Closes #44`, the issue that tracks `RF-36`.

## Test map

Core's rows in `tests/traits/reorderable.browser.test.ts` at `e4b0e475d`:

- **M:** becomes a material-x row on `mx-sortable-list`.
- **D:** drag's suite covers the mechanism, so the row isn't copied.
- **X:** the behavior is gone, so the row is deleted.

| Core row | Disposition |
| --- | --- |
| `ReorderEvent`: bubbles; crosses shadow DOM; is cancelable | **M**, on material-x's event |
| `Reorderable`: the attribute's three rows | **X**: no `reorderable` attribute (Q1). `handle-only`'s reflection is **M** |
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
| keyboard: grab the item when Space is pressed on its handle | **M** |
| keyboard: not grab when the key lands off the handle | **M** |
| keyboard: step the footprint forward on ArrowDown | **D**: `DRD-70`'s rows |
| keyboard: dispatch the stepped indices on drop | **M**: one event for the whole move |
| keyboard: settle promptly on the consumer commit, not the timeout | **M** |
| keyboard: no reorder when the grab is canceled with Escape | **M**: the item returns, and no event fires |
| keyboard: no reorder for a keyboard drop that never moved | **M** |
| keyboard: announce the grab through a shadow-owned live region | **M**, for the grab, a step, the drop and a cancel |

**New M rows:**

- with no handle, a press anywhere on the item drags it. With `handle-only`, an item without a handle doesn't drag, and the others pass it;
- Space on a focused `mx-list-button-item` activates it and doesn't grab;
- arrow keys before a grab do nothing to the list;
- the handle has `role="application"` during a grab, and its role comes back after;
- after a drop, focus is on the handle, and a second grab works;
- a consumer that never commits: the item lands within the bound, and its `drag` state is cleared;
- handle semantics are written in a sortable list, consumer values are kept, a handle added later is covered, and nothing is written in `mx-list`;
- an item added during a drag: the drop's `from` and `to` describe the new collection;
- a pointer drop is announced;
- reduced motion: the landing has zero duration.

## Not adopted

- **A side-effect import, or a function call,** instead of an element: [section 2](#2-sorting-is-a-separate-element-in-a-separate-entry-q1).
- **drag as a regular dependency.** It is simpler, but two copies of drag break the nesting rule, and every material-x install would fetch drag and box-quad.
- **A `reorderable` attribute on `mx-sortable-list`.** An element whose only job is sorting doesn't need a second switch. `handle-only` and a canceled event cover what an attribute would.
- **Grab mode in the list, built over drag's one-step commands.** It needs no drag change, but each arrow press commits and lands, and Escape needs a second reorder. The owner asked for a sortable feature in drag.
- **Passing the event to `handle(item, event)`** so that pointer and keyboard can differ. `grab()`'s own keyboard handle does the same within the feature that needs it. `handle` would stay shared by the one-step commands, so a consumer without `grab()` would have nothing to gain from it.
- **`layoutAnimation` for the displaced rows.** Today's rows don't animate. Adding it is a separate choice, with its bytes.
- **Moving core's synthetic-host rows into material-x unchanged.** They test a trait that no longer exists, through a host that isn't the component.
- **Move controls in this unit.** They are the strongest model for screen readers, and a separate feature ([Q2](#q2-the-keyboard-model)).
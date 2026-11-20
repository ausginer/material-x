# The list's sortable items on `@ydinjs/drag` — plan

**Status: the owner answered Q1 to Q5 on 2026-11-20 ([Owner's answers](#owners-answers)). One question, [Q6](#questions-for-the-owner), is open, and implementation waits for it.** The architect wrote this plan on 2026-11-20 at `e4b0e475d` (`origin/main`), on `repo/list-sortable-1`, for the coordinator's task on issue #86. It was revised twice the same day for the answers.

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
  - In Chromium 158 the tab order is the handle, then the button item's `<button>`, then the link item's `<a>`. The static items have no tab stop, and every item is `generic` inside the `list` ([reading](checks/list-a11y.txt), [probe](probes/list-a11y.ts)). That is `RF-68`, registered beside this plan.
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
- `repo:RF-68`: `mx-list`'s items aren't exposed as list items. `RD-31` doesn't change it.
- `RD-30`, on `core/side-effects-1` and not yet on `main`, counts the 27 core modules at `e4b0e475d`, and `traits/reorderable` is one of them. Whichever branch merges second updates the count.

## What drag covers, and what the list adds

| The list needs | drag gives | The sortable list adds |
| --- | --- | --- |
| Reordering a column by pointer | `sortable` with `y()` | — |
| A visual inside the item's shadow root | `visual(item)` | The item's inner `.host` |
| Dragging by the whole item, or by a handle | `handle(item)` | The handle when the item has one, otherwise the item |
| Reordering from the keyboard | One arrow command per key press, focus kept | Nothing |
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

Only `list/sortable-list` imports `@ydinjs/drag`. No module that another runtime entry reaches imports it, directly or through another module. That includes the list items, so `useReorderableItem`'s registry and `enhanceHandle` leave `ListItemCore`. A standing test checks the import graph of the built package (task 6), so the property can't regress silently. A size reading proves the effect once.

### 4. The sortable list's behavior

- **The collection** is the list's slotted item elements in slot order, as a new array after each change. The placeholder isn't an item. During a drag, the list calls `invalidate()` once its slot shows a changed collection. A slot change that changes only the placeholder isn't a collection change, so moving the placeholder doesn't make drag measure the rows again.
- **The handle is optional (Q3).**
  - By default, drag's `handle` is the item's `[data-handle]` when it has one, and otherwise the item itself. So a press on the handle drags an item that has one, and a press anywhere drags an item that has none. These are today's pointer rules.
  - With the boolean attribute **`handle-only`** (property `handleOnly`), `handle` is the item's `[data-handle]` or `null`. An item with no handle can't be dragged, but it is still displaced by the others.
- **The keyboard is drag's ordinary model (Q4).** An arrow key moves the item one slot at once and proposes the move. Who can press it follows from the same `handle`:
  - **An item with a handle** moves from its focused handle.
  - **An interactive item without a handle** moves from its own focused button or link. Space and Enter still activate it, because this model doesn't use them.
  - **A static `mx-list-item` without a handle** can't be moved from the keyboard, because nothing in it takes focus (Q6, and [why](#why-mx-list-item-doesnt-take-focus)).
  - **With `handle-only`,** only a handle moves its item.
  - At the collection's edge, the key keeps its native meaning. After a move, focus stays where it was, so the next arrow press moves the item again (`drag:DRD-9`).
- **Nested controls.** In an item without a handle, an arrow key pressed in any focused element inside the item moves the item. A control that uses the arrow keys itself, such as a text field, a slider or a radio group, carries `data-drag-ignore`, which drag already honors for presses and keys. Without it, the control's arrow keys move the item. A handle avoids the question. The JSDoc says both.
- **Handle semantics.** In a sortable list, a `[data-handle]` gets:
  - `tabindex="0"`, `role="button"` and the accessible name _Reorder_;
  - an accessible description, _Use the arrow keys to move_;
  - `touch-action: none`.

  An interactive item with no handle gets the same description, on the item, which `useARIA` passes to its button or link. Values the consumer set are kept, as today. This also applies to a handle added to an item after the item is slotted. In `mx-list`, nothing is written to a `[data-handle]`.

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
- **Lifecycle.** One controller per list for the list's life. A disconnect cancels the operation, and a reconnected list sorts again. If drag's controller holds a listener outside the list between operations, the list destroys it on disconnect and creates a new one on connect.

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

The owner asked: _"Почему? 🤔"_ ("Why?").

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
| `mx-list-item` and the interactive items | 2,570 to 4,750 | slightly less: they lose the handle code |
| `mx-sortable-list` | — | about 8,500 to 9,500 (estimate) |

- **The plain list gets about 2 to 2.5 kB smaller.** It no longer carries core's 3.11 kB trait, minus the modules it shares with it.
- **A sortable list costs about 5 kB more than today's reorderable list** (3.67 kB). drag's sortable with landing is 6.87 kB, against core's trait at 3.11 kB. That is the cost of moving to drag, which the owner chose. Task 6 checks it by reading.

## Owner's answers

Relayed by the coordinator on 2026-11-20.

- **Q1: (a), the separate element `<mx-sortable-list>`.** _"Я думаю, стоит сделать отдельный элемент 🤔 Не очень хочется, но это более правильно."_ ("I think a separate element is worth it. I don't much want to, but it's more correct.")
- **Q2: a question, then a direction.**
  - He first asked _"Хммм... А как правильнее? 😮"_ ("Which is more correct?").
  - Then he directed grab mode as an option: _"надо его предусмотреть. Т.к. мы делаем универсальную библиотеку, то надо, чтобы такая опция была. Но важно, чтобы это нам не портило размер (ну или не сильно портило 🤔). Я думаю, можно отдельной фичей сделать"_ ("it has to be provided for. Since we're building a general-purpose library, that option should exist. But it mustn't hurt our size, or not much. I think it can be a separate feature").
  - He clarified: _"фичей — в смысле sortable feature"_ ("a feature, as in a sortable feature").
  - `drag:DRD-70` wrote the feature down, and Q5 deferred it.
- **Q3: the handle isn't required by default, and a consumer can require it.** _"Нет, не обязательна; однако если человек хочет сделать её обязательной — это надо предусмотреть."_ ("No, not required; but if someone wants to make it required, that has to be provided for.")
- **Q5: the grab feature is deferred.** _"Так, фичу с захватом откладываем. Мне не очень нравится направление, тут надо, наверное, посидеть и отдельно подумать 🤔 Особенно мне не нравится идея "операция живёт между нажатиями", это прям подножка текущей архитектуре"_ ("So, we're deferring the grab feature. I don't much like the direction; I probably need to sit down and think about it separately. I especially dislike the idea that 'an operation lives across key presses'. That really trips up the current architecture.")
- **Q4: drag's ordinary mode, for now.** _"Соответственно, Q4 - пока что это будет обычный режим drag."_ ("Accordingly, Q4: for now it will be drag's ordinary mode.")
- **On focus:** _"Почему? 🤔"_ ("Why?"), about `mx-list-item`. Answered [above](#why-mx-list-item-doesnt-take-focus).

**What the plan asked, in short.**

- **Q1:** (a) a separate element, (b) a side-effect import that makes `<mx-list reorderable>` sort, or (c) a function.
- **Q2:** (a) drag's immediate arrows, or (b) today's grab mode, added to drag.
- **Q3:** (a) a handle is required, or (b) whole-surface drag stays, with a drag option to require the handle for keys only.
- **Q4:** (a) grab mode always in `<mx-sortable-list>`, or (b) immediate arrows by default with grab mode behind an attribute.
- **Q5:** (a) a kernel hold for keyboard operations, or (b) grab mode built from one-step commands.

## Questions for the owner

**Q6. Can a static `mx-list-item` without a handle be moved from the keyboard?**

- **(a) Recommended:** no. It moves by pointer, and from the keyboard only through a handle. The JSDoc says to give static items a handle for keyboard users. Interactive items and handles behave as section 4 says.
- (b) Yes: in a sortable list without `handle-only`, a static item without a handle gets a tab stop and the arrow-key description. That is a few tens of bytes. But it adds a tab stop to every such item, and a screen reader announces it as bare text with no role and no hint that it moves ([why](#why-mx-list-item-doesnt-take-focus)).

## Implementation

One unit, on a branch from `main`, after the answer to Q6. If the answer is (b), the architect amends this plan and `RD-31` first. Use the `test-component` skill for every material-x test.

**Task 1. The reading before.** If `main`'s source differs from `e4b0e475d` in core, material-x or drag, read `just size` again in those packages and the probe, and save the result beside [`checks/size-before.txt`](checks/size-before.txt). Also save, for `list/list`, `list/list-item` and `complete`, the list of modules that the size bundle contains. Any bundling of the built entry with rolldown that lists the modules will do.

**Task 2. The sortable list.** Add `src/list/sortable-list.ts`, which defines `mx-sortable-list` with the behavior in [section 4](#4-the-sortable-lists-behavior).

- Add it to `files.json`'s `runtime` list and to `package.json`'s `exports`. Add `@ydinjs/drag` as an optional peer and a dev dependency (section 5).
- Import only drag's public entries: `sortable.js`, `sortable/y.js` and `sortable/landing.js`.
- Add the tag to `src/react.ts` with its `reorder` event and its `handle-only` attribute, and check that the custom-element manifest lists them.
- Check that the built `list/sortable-list.d.ts` and `react.d.ts` contain no `@ydinjs/drag` specifier.
- Check that the root `build` and `typecheck` build drag before material-x.

**Task 3. The plain list and the items.** Remove `Reorderable`, `useReorderable`, `ReorderEvent` and the landing's CSS props from `list.ts`. Remove `useReorderableItem` and `enhanceHandle` from `ListItemCore.ts`. Move the `Draggable` story to `mx-sortable-list`, and add one story with button items and no handles, and one with `handle-only`. A story's handler may stay a React state update, which the commit wait allows.

**Task 4. Tests.** Write the material-x rows in the [test map](#test-map), in `tests/list/`.

- They run in the gate's engines. A row that needs media emulation, such as the reduced-motion row, runs only where the engine supports it (`RD-6` property 6).
- Update `traits-baseline` in exactly three ways: `Reorderable` leaves `TRAITS`, `mx-list` loses `reorderable`, and `mx-sortable-list` is added with `handle-only`.

**Task 5. Remove core's trait.** Delete `src/traits/reorderable.ts`, `tests/traits/reorderable.browser.test.ts`, the `./traits/reorderable.js` export, the `files.json` entry, the `.size-limit.json` row and the README section. Rebuild core before typechecking material-x.

**Task 6. The reading after, and the standing check.**

- Run `just size` again in core and material-x. In `checks/size-after.txt`, tabulate `list/list`, `list/list-item`, `list/list-button-item`, `list/list-link-item`, `list/sortable-list` and `complete`, with the reading before beside each. Give the reason for each change, and compare with the [estimates](#size-what-each-consumer-pays).
- Save the module lists again, and add `list/sortable-list`'s. **Required:** no module under `packages/drag` or `packages/box-quad` is in any row except `list/sortable-list` and `complete`, and none of the four plain list rows grows.
- **The standing check:** a test over the built package that follows the static imports of each `files.json` runtime entry. It fails if any entry other than `list/sortable-list` reaches `@ydinjs/drag`. Prove it can fail: temporarily add `import '@ydinjs/drag/sortable.js'` to `list.ts`, and record the failure in the report.

**Task 7. Documentation and record.**

- Document `mx-sortable-list` in its JSDoc:
  - the handle and `handle-only`;
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
- `mx-sortable-list` reads more than 9.5 kB Brotli, the top of the estimate;
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
| keyboard: grab the item when Space is pressed on its handle; step the footprint forward on ArrowDown | **X** (Q4). Replaced by **M**: ArrowDown on the focused handle moves the item one slot and dispatches `from`, `to` |
| keyboard: not grab when the key lands off the handle | **M**: in an item with a handle, an arrow key on another focused element moves nothing |
| keyboard: dispatch the stepped indices on drop | **M**, as above |
| keyboard: settle promptly on the consumer commit, not the timeout | **M** |
| keyboard: no reorder when the grab is canceled with Escape; no reorder for a keyboard drop that never moved | **X** (Q4). The edge rule is **D** |
| keyboard: announce the grab through a shadow-owned live region | **M**, changed: each accepted move is announced by position |

**New M rows:**

- with no handle, a press anywhere on the item drags it. With `handle-only`, an item without a handle doesn't drag, and the others pass it;
- ArrowDown on a focused `mx-list-button-item` without a handle moves it, and Space still activates it;
- with `handle-only`, ArrowDown on that button item moves nothing;
- ArrowDown in a text field marked `data-drag-ignore` inside a handle-less item moves the caret and not the item;
- after a keyboard move, focus is where it was, and a second ArrowDown moves the item again;
- a consumer that never commits: the item lands within the bound, and its `drag` state is cleared;
- handle semantics are written in a sortable list, the description reaches a handle-less interactive item, consumer values are kept, a handle added later is covered, and nothing is written in `mx-list`;
- an item added during a drag: the drop's `from` and `to` describe the new collection;
- a pointer drop and a keyboard move are announced;
- reduced motion: the landing has zero duration.

## Not adopted

- **A side-effect import, or a function call,** instead of an element: [section 2](#2-sorting-is-a-separate-element-in-a-separate-entry-q1).
- **drag as a regular dependency.** It is simpler, but two copies of drag break the nesting rule, and every material-x install would fetch drag and box-quad.
- **A `reorderable` attribute on `mx-sortable-list`.** An element whose only job is sorting doesn't need a second switch. `handle-only` and a canceled event cover what an attribute would.
- **Grab mode in this unit.** The owner deferred it (Q5). `drag:DRD-70` keeps the proposal, not in force.
- **Passing the event to `handle(item, event)`** so that pointer and keyboard can differ. With drag's ordinary model, the same rule serves both, and `data-drag-ignore` covers nested controls.
- **Making the list mark nested controls `data-drag-ignore` itself.** The list can't know which of a consumer's controls use arrow keys, and drag's attribute is the consumer's.
- **`layoutAnimation` for the displaced rows.** Today's rows don't animate. Adding it is a separate choice, with its bytes.
- **Moving core's synthetic-host rows into material-x unchanged.** They test a trait that no longer exists, through a host that isn't the component.
- **Move controls in this unit.** They are the strongest model for screen readers, and a separate feature ([Q2](#q2-the-keyboard-model)).
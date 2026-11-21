# Handoff: each list item is exposed as a list item (`RF-68`)

**Recipient:** the implementer. **Branch:** `material-x/list-roles-1`, from `main` at `7c2732d1d`. **Input:** the architect's commit that adds this file. **Authorized** by the owner, relayed by the coordinator on 2026-11-21: _"it's just a bug, it needs fixing"_, in its own unit, outside `RD-31`. **The plan and its implementation share one pull request.** Continue on this branch, and open that pull request after the implementation, with `Closes #92`. #92 tracks `RF-68`.

**Re-ruled 2026-11-21 by the architect,** at `001f8d833`, on the owner's principle for hosts and his rule on shadow-tree elements, relayed by the coordinator. The listitem is now the item's host, which takes a box: [The decision](#the-decision). The row element is gone. [What the re-ruling replaces](#what-the-re-ruling-replaces) records the decision and the properties as they were. **The implementer reworks the branch's implementation** to this decision: [What the implementer changes](#what-the-implementer-changes).

**Re-ruled a second time 2026-11-21 by the architect,** at `4c727d25d`, on the owner's direction to fold `mx-list-item`'s inner `div` into its host in this unit, relayed by the coordinator. `mx-list-item` has no `.host`: its host is its box. Every item's drag lifts its host, so the `lifted` state goes. [What the second re-ruling replaces](#what-the-second-re-ruling-replaces) records the decision and the properties as they were at `4c727d25d`. The branch merges `main` at `555ab85bc` for `CONTRIBUTING.md`'s rules on hosts and shadow trees. The implementer's rework, from `001f8d833`, is to this decision.

**Governing records:**

- `RF-68` in [`../00-index.md`](../00-index.md): its required property and its datings. This branch carries the entry, as [Where `RF-68`'s record lives](#where-rf-68s-record-lives) explains;
- `RD-31`'s ruling [How a static item takes focus](https://github.com/ausginer/material-x/blob/5bf743235e8434676d056911e2c45646d8faf415/.plan/list-sortable-1/list-sortable-plan.md#how-a-static-item-takes-focus), on `repo/list-sortable-1` (#90, not merged);
- `RF-33`: `FocusForwarding`, which forwards `focus()` in Firefox for an item whose host is `display: contents`;
- **the owner's principle for hosts,** in translation: _"The convention isn't that a host must be `display: contents`. It's that we have no need to merge a native element's logic, where there is one, into the custom element. But a `div` isn't a native element with logic, so here we can simply remove `display: contents`. Yes, there will be some correction, but we avoid an extra HTML element in the template."_;
- **the owner's rule on shadow-tree elements,** in translation: _"A soft goal is to minimize the number of HTML elements inside the shadow DOM: don't make unnecessary elements if CSS can cover it. A balance must be kept, of course, so that it doesn't bloat the CSS and JS much. But in general, bloating the CSS a bit is better than creating a couple of new DOM elements."_ Both are now `CONTRIBUTING.md`'s, Part I, [Shadow tree structure](../../CONTRIBUTING.md#shadow-tree-structure) (#101);
- **the owner's direction on the inner `div`,** answering the ruling at `4c727d25d`, verbatim: _"По #99 всё ещё не согласен 😅 > Внутренний div пока остаётся. — Первую причину не понял 🤔 — Атрибуты в разметке потребителя допустимы (мы уже такое делаем с button-group например, или tabindex). А про картинку тоже не понял 🤔 — Фокус можно поменять )"_ In translation: _"On #99 I still disagree 😅 > The inner div stays for now. — I didn't understand the first reason 🤔 — Attributes in the consumer's markup are acceptable (we already do that with button-group, for example, or tabindex). And I didn't understand the one about the picture either 🤔 — Focus can be changed )"_ The coordinator relayed it with the direction to fold the `div` in this unit;
- [the `.host` invariant](../../.agents/docs/architecture.md#components-ydinjsmaterial-x) and its exceptions (`RF-43`), to which this re-ruling adds a case;
- `@ydinjs/drag`'s lift, [`packages/drag/src/lift.ts`](https://github.com/ausginer/material-x/blob/52d32b21e257a1de28cb0c8b9e02e285daa21233/packages/drag/src/lift.ts) on `repo/list-sortable-1` at `52d32b21e`, which `RD-31`'s sortable list uses;
- `RD-24`: the size rows, which have no limits yet;
- [`accessibility.md`](../../.agents/docs/accessibility.md#list), the list's section.

## What the readings show

The [probe](probes/list-roles.ts) reads each engine's own accessibility tree, not Playwright's `ariaSnapshot`, which computes roles in page script. It uses CDP in Chromium, Marionette in Firefox and the inspector protocol in WebKit. The [reading](checks/list-roles.txt) covers five variants in Chromium 158, Firefox 159 and WebKit 27.2, on the built package at `main`'s source. The fixture is a list with two static items (one with a `data-handle` trail), a static item whose host has `tabindex="0"`, a button item and a link item.

| Where `listitem` sits | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Nowhere, as on `main` | each item `generic` | each item's content directly in the list | the list is `group`, not `list`, and no item has a node |
| The host, through its internals | `listitem`, with the item's content inside | the same | `listitem` under the list, but the shadow content (the slots, the button, the link) is the list's child, outside its item |
| The row: the item's outermost box in its shadow tree | `listitem` under a `generic` host, with the content inside | `listitem`, with the content inside | `listitem` with its button or link inside. The slotted light-DOM nodes (the label text and the handle) are the list's children, as on `main` |
| The host, and the host has a box | clean | clean | clean |

1. **WebKit parents an item's shadow content by its box and its slotted light-DOM nodes by the DOM, past a `display: contents` host.** The split is on `main` already, and it doesn't depend on where the role sits. Only a host with a box removes it. The role on the host puts the button and the link outside their item, and the role on the row puts the label text outside it. Each item's name is still computed from its content in WebKit.
2. **`role: 'none'` on the host** removes Chromium's `generic` between the list and the row, but WebKit then gives each host a `none` node under the list. ARIA allows a `generic` between a `list` and its `listitem`, so the `generic` stays.
3. **A host with `tabindex` gets a node of its own:** `generic` in Chromium and `group` in WebKit, beside or around its item. It doesn't take focus in any engine, which `RD-31`'s reading shows too.
4. **A row element around an interactive item's control leaves a box in the list while the control is lifted** ([probe](probes/list-lift.ts), [reading](checks/list-lift.txt)). Core's reorderable trait lifts the item's `.host` into the top layer and puts a footprint before the item. With the control lifted, the empty row is still a flex item, so the list grows by one `gap` (192 to 204 px with a 12 px gap) in all three engines. With `display: contents` on the row while its control is `:popover-open`, the list keeps its height, as on `main`.
5. **The role was on the host until 2026-05-18.** `743739ab0` (_"introduce basic draggability"_) dropped it, and no reason is recorded. The accessibility guide still says the hosts expose `listitem`.

**Read for the re-ruling,** on the package built in the main checkout, whose list and core sources equal `origin/main`'s at `bd1dee7df`, in Chromium 158, Firefox 159 and WebKit 27.2. A box host is emulated by `:host { display: block }`, adopted by each item's shadow root after its own styles.

6. **A box host lays out as `main` does.** Every item's `.host` rect and the list's rect are identical with and without the box host, for every fixture of property 5, in all three engines ([reading](checks/list-layout-hostbox.txt), [probe](probes/list-layout.ts)'s new `hostbox` argument). The `.host` already has `inline-size: 100%`, so it fills the host as it filled the list's column.
7. **A box host stays in the flow when its `.host` is lifted** ([reading](checks/list-lift-hostbox.txt), [probe](probes/list-lift.ts)'s new modes). The list grows from 192 to 204 px, as the row did in finding 4, for the button item and for the static item.
   - **`:host:has(.host:popover-open) { display: contents }` keeps 192 in Chromium and WebKit, and not in Firefox.** Firefox matches `:host:has(.y)`, and `.w:has(.x:popover-open)` inside the tree, but never `:host:has(.x:popover-open)`, after any number of frames and with a popover open from the start ([reading](checks/host-has-popover.txt), [probe](probes/host-has-popover.ts)).
   - **A `beforetoggle` listener on the `.host` that toggles a host state, with `:host(<state>) { display: contents }`, keeps 192 in all three engines,** for both items. `beforetoggle` runs inside `showPopover()` and `hidePopover()`, so the box goes and comes back in the same task. The probe toggles a class on the host, because it can't reach the item's internals. `:host(:state(…))` already styles the items in every engine.
   - **Lifting the host itself** keeps 192, but the lifted rect differs from the item's, because the UA's popover styles (padding, background, overflow) apply to the host. The `.host` has `all: unset`, which removes them.
8. **Focus delegates through a box host in Firefox.** `host.focus()` with `delegatesFocus` reaches the inner `<button>` or `<a>` in all three engines when the host has a box, and in Firefox doesn't when it is `display: contents` ([reading](checks/focus-delegation.txt), [probe](probes/focus-delegation.ts)). So `FocusForwarding`, which exists for that gap (`RF-33`), isn't needed by an item with a box host. `checkbox`, `radio` and `text-field` already rely on this: their hosts have a box, delegate focus, and don't compose it.
9. **Hosts with a box exist,** as the owner recalls. `mx-list` and both button groups are `display: flex` and set `list` or `group` through their internals. `mx-checkbox` and `mx-radio` are `inline-grid` around a native `<input>` that carries `part="impl"`, and `mx-text-field` is `grid` around its `<input>`. The hosts that are `display: contents` are the button family and the FAB, where the native `<button>` or `<a>` is the component's box, and, on `main`, the list items.

**Read for the second re-ruling,** on the same build, whose list and core sources also equal `origin/main`'s at `555ab85bc`, in Chromium 158, Firefox 159 and WebKit 27.2 ([probe](probes/list-fold.ts), [reading](checks/list-fold.txt)). The fold is emulated in the page. Each static item's `div` is removed and its children move to the shadow root. Each of its sheets' `.host` rules is rewritten for `:host`, without `all: unset`. Each interactive item's host is `display: block`. The reference is the build unchanged.

10. **A folded static item lays out and paints as `main`'s.** Every item's box and the list's box are equal for property 5's fixture. Screenshots of the whole list are byte-equal at elevation level 0 and at level 6, in all three engines. `:host::before` and `:host::after` draw the elevation's two pseudo-element layers as `.host`'s did.
    - **One difference had to be kept out: the penumbra.** The elevation stylesheet draws its penumbra as `.host`'s own `box-shadow`. The item stylesheet, adopted after it, starts `.host` with `all: unset`, which resets that `box-shadow` to `none`. So on `main` the list items draw only the two pseudo-element layers. A folded host without `all: unset` draws the penumbra too, and the pixels at level 6 differ. With `box-shadow: none` on the folded host, they are equal.
    - The other computed differences are the host's transition of the elevation level, which is the `:host` rule's on `main` too, and `unicode-bidi`, which `all` doesn't reset and which the `div` has as `isolate` in Chromium and Firefox. Neither moves a pixel.
11. **A lifted host leaves no box in the list, so no state is needed.** With the host itself in the top layer, the list stays 192 px and the next item doesn't move. This holds for the static and the button item, lifted as core's trait lifts and as drag's lift does. Finding 7's `host-lift` row showed the same.
12. **What finding 7's rect difference was.** Core's trait writes only `position`, `inset`, `top`, `left`, `width`, `height`, `margin` and `border` inline. The UA's `[popover]` rule also sets `padding: 0.25em`, `overflow: auto`, `color: CanvasText` and `background-color: Canvas`. Each of these that the host's own rules don't set applies while the host is lifted.
    - **A box host around a button or a link** sets none of them. Lifted by core's trait, it gets 4 px of padding on each side. The trait's `width` and `height` set its content box, so the host grows by 8 px each way, and the button inside moves 4 px right and 4 px down, on a white (`Canvas`) frame. `overflow: auto` also clips the button's shadow layers. The pixels differ from `main`'s lift in all three engines.
    - **A folded static host** sets its own padding, color and background, so only `overflow: auto` applies. Its rect is kept, but the elevation's pseudo-element layers, which paint outside the box, are clipped. The pixels differ.
    - **With the host's own values** for those properties, the lifted rect and the pixels of the item's area equal `main`'s lift of `.host`, in all three engines. That is `overflow: visible` on the folded host, and `padding: 0`, `overflow: visible`, `background: none` and `color: inherit` on a box host. A plain `:host` rule is enough, because author rules beat the UA's.
    - **Drag's lift needs none of them.** `lift.ts` writes the computed padding, border, overflow, color and background inline before it promotes the visual, so the UA's values never apply. Emulated as that code does it, both items keep their rect and their pixels without the resets.
13. **Focus.** On a folded static host with `tabindex="0"`, `focus()` and Tab reach the host, and `:focus-visible` matches after Tab. Focus stays on the static host, and on the button inside a box host, through a lift of the host and its drop. This holds in all three engines.
14. **The trees** ([reading](checks/list-roles-fold.txt), [probe](probes/list-roles.ts)'s new `hostbox-fold` variant). With the fold, each static item is a `listitem` whose slots are its direct children. Chromium's `generic` for the `div` goes. Firefox and WebKit read as with the box host alone. The static host with `tabindex` is a tab stop and a `listitem`, with no node of its own.

## The decision

**Re-ruled 2026-11-21, and again for decisions 1 and 3.** **Each item's host takes a box and the `listitem` role, through its internals.** `useListItemCore` passes `{ role: 'listitem' }` to `useCore`, as `mx-list` passes `list` and the button groups pass `group`. The item stylesheet's `:host` is `display: block` instead of `display: contents`, and `mx-list-item`'s box rule makes its host `display: flex`. The interactive items' templates are `main`'s again: no row, and no `role` attribute. `mx-list-item`'s template has no element (decision 1).

1. **`mx-list-item` has no inner element: its host is its box.** Its shadow root holds the shared content (the slots and `.content`) directly. Its layout and its elevation are on `:host`, and it has no part `impl`. The `div` goes because CSS covers it, and it has no behavior of its own (`CONTRIBUTING.md` Part I, Shadow tree structure).
   - **The shared stylesheet doesn't need the `div`.** The fold costs a selector split: the item's box rule, today's `.host` block, and the elevation's pseudo-element layers style `:host` in `mx-list-item` and `.host` in the interactive items.
   - **Each item's stylesheets carry the box rule once, under its own selector, and none of them holds a rule that matches nothing in its tree.** The elevation stylesheet is shared with the buttons and the FAB and stays as it is. Its `.host` rules match nothing in `mx-list-item`, which adopts it for its tokens.
   - **Recommended:** the box rule leaves `main.styles.css` for one stylesheet per kind: a new one that `mx-list-item` adopts, on `:host`, and a new one that the interactive items adopt, on `.host`. The declarations are then written twice in source. That is two direct paths, not a mechanism (`CONTRIBUTING.md` Part II §2.2), and each bundle carries one copy. `interactive.styles.css` isn't that sheet: no module imports it on `main`, and adopting it would change the items' press and disabled styles ([seen, not registered](#seen-not-registered)).
   - **The folded rule has no `all: unset`.** A custom element has no UA styles to remove, and `all` would reset the host's own transition of the elevation level. It has `box-shadow: none`, so the host draws the two layers that `main` draws (finding 10).
   - **This adds a case to the `.host` invariant:** _the host is the box_. The architect writes it into `architecture.md` with this re-ruling. In the list module, a lookup of `.host` then finds an interactive item's control, and code that handles `mx-list-item` uses its host.
2. **The interactive items take the same host.** The host is the list item around the native `<button>` or `<a>`, which keeps its own logic: focus, `aria-*`, disabling, the ripple, the link attributes and `part="impl"`. That is the owner's principle: nothing native is merged into the host. It is also how `mx-checkbox`, `mx-radio` and `mx-text-field` wrap their `<input>` (finding 9). The rows of the first decision are gone, and so is `mx-list-item`'s `div`, so the owner's rule is met by three fewer elements than that decision had.
3. **Each item's drag lifts its host.** `useListItemCore` registers the host as the item's visual with core's trait, which is `useReorderableItem`'s default. `RD-31`'s sortable list lifts the item itself ([below](#knock-on-for-rd-31-90-a-follow-up-on-its-branch)). A lifted host is out of the list's flow, so the list keeps its size with no state, listener or rule (finding 11).
   - **While core's trait lifts a host, its padding, overflow, color and background are the item's, not the UA popover's** (finding 12). A box host's `:host` rule sets `padding: 0`, `overflow: visible`, `background: none` and `color: inherit`. `mx-list-item`'s, which sets the others itself, sets `overflow: visible`. These are initial or inherited values, so they change nothing outside a lift.
   - **During a drag, the consumer's element carries `popover`, the trait's inline styles, and the popover's `beforetoggle` and `toggle` events.** The owner accepts the item writing in the consumer's markup. Core's trait restores the inline values it overwrites.
4. **The interactive items no longer compose `FocusForwarding`.** Their hosts have a box, so `delegatesFocus` reaches the control in Firefox (finding 8). `FocusForwarding`'s JSDoc says it exists because every adopter's host is `display: contents`, which these items' hosts no longer are. `@ydinjs/material-x` isn't published, so the obsolete composition is deleted (`CONTRIBUTING.md` Part II §8). The trait stays for the button family and the FAB.

**Why the host and not the row:**

- **It is clean in all three engines,** with every control and every slotted node inside its item (table, last row). So it also repairs WebKit's split of slotted light-DOM nodes (finding 1) for the list items, which the row left as it was.
- **The layout doesn't move** (finding 6). The decision before rejected a host with a box because, by `RD-31`'s ruling, the list's layout and the item's styles depend on `display: contents`. That is read false: `.host` fills a block host as it filled the list's column.
- **The owner's principle allows it,** and his rule on shadow-tree elements prefers it.

**Not adopted, for the re-ruling:**

- **The row:** an element that the host's box makes unnecessary.
- **`:host:has(.host:popover-open)`,** which would be CSS alone: Firefox never matches it (finding 7).
- **The `drag` state, which both drags already set on the item,** as the rule's trigger: `RD-31`'s sortable list clears it when the landing starts, while the visual is still in the top layer. The host would then regain its box during the landing, beside the placeholder.
- **Keeping `FocusForwarding` on the interactive items:** machinery whose reason the box host removes, with a JSDoc that would no longer be true.
- **`role: 'none'` on the host:** finding 2.

**Not adopted, for the second re-ruling:**

- **Keeping `mx-list-item`'s `div`.** None of its three reasons holds. The shared stylesheet costs a selector split, not an element (decision 1). The lift writes in the consumer's markup, which the owner accepts, and the UA's styles are undone by four declarations with core's trait and by drag's own lift with `RD-31` (finding 12). Focus moves to the host in `RD-31`'s follow-up, which adapts to this unit.
- **The `lifted` state** of the ruling before: with the host lifted, no box remains in the list to take away.
- **Lifting `.host` in the interactive items and the host in `mx-list-item`:** it keeps the state for two kinds, and with it the WebKit note on a lifted item ([`reviewer-1`](#reviewer-1-re-ruled)).
- **The resets under `:host(:popover-open)`:** a plain `:host` rule is shorter. Nothing else sets these properties on the host.
- **Core's trait writing the computed values, as drag's lift does:** `RD-31` deletes that trait, and the item needs only four declarations.
- **The penumbra on the folded host:** it would change `main`'s pixels. It is [seen, not registered](#seen-not-registered).

## What the implementer changes

On this branch, from `001f8d833`, merged with `main`:

- **The templates:** `list-button-item.tpl.html` and `list-link-item.tpl.html` lose the row and are `main`'s again. `list-item.tpl.html` loses its `div`, so `mx-list-item`'s shadow root holds the shared content directly. Whether it then passes an empty template or none is the implementer's choice.
- **`ListItemCore.ts`:** `useCore`'s internals argument becomes `{ role: 'listitem' }`. `useReorderableItem` takes the host alone. The shared content goes into `.host` where the template has one, and into the shadow root otherwise. There is no `beforetoggle` listener and no `lifted` state.
- **Styles:** in `main.styles.css`, `:host`'s `display` becomes `block` and the `.row` rule goes. The box rule moves to one stylesheet per kind (decision 1). `mx-list-item`'s is on `:host`, with the elevation's two pseudo-element layers, `box-shadow: none` and `overflow: visible`. The interactive items' is on `.host`, as today, and their `:host` sets `padding: 0`, `overflow: visible`, `background: none` and `color: inherit`, with a one-sentence comment.
- **`list-item.ts`:** the `@csspart impl` line goes.
- **`ListInteractiveItemCore.ts`:** `FocusForwarding` leaves `ListInteractiveItemCoreTraits`, its import and the `useFocusForwarding` call. The shadow root still delegates focus.
- **Tests:** `list-roles.browser.test.ts`'s structure and lift rows follow proof 2. `list-item.browser.test.ts` keeps its `.host` lookups, which are interactive items'. `focus-forwarding.browser.test.ts` drops the two list items from its adopters, and its `mx-list-button-item` subclass case. `traits-baseline.json` changes as property 7 says.
- **`accessibility.md`:** as property 8 says. `architecture.md` already has the new case of the `.host` invariant.
- **The report:** the proofs again, and the size table. The owner question is answered: (a).

## Required properties

1. **Each item of `mx-list` is exposed as a list item.** This holds in Chromium, Firefox and WebKit, for `mx-list-item`, `mx-list-button-item` and `mx-list-link-item`, enabled or disabled. In each engine's tree, the list has one `listitem` for each item, in DOM order. The nearest ancestor of each one that isn't `generic` is the list.
2. **The role is the host's, through its internals,** and the host has a box. The host's `role` attribute stays the consumer's. No template carries a `role`. The interactive items' templates have the elements that `main`'s have, no more. `mx-list-item`'s shadow tree has the shared content only, and no element of its own.
3. **An interactive item's control is inside its `listitem` in all three engines, and keeps its role, its name and its focus.**
   - `focus()` and Tab reach the same element as on `main`, in the same order, in Firefox too, without `FocusForwarding`.
   - A disabled link item leaves the tab order as on `main`.
   - The host's `aria-*` attributes reach the control as on `main`.
4. **This unit adds no focus behavior to `mx-list-item`.** In `mx-list` it takes no focus, as on `main`. One thing changes with the box: a consumer's `tabindex` on an `mx-list-item` host makes the host a tab stop, as on any element with a box. On `main` it does nothing. It stands: the owner answered the [owner question](#owner-question) with (a).
5. **The layout and the pixels don't change.** In each engine, each item's box and the list's box are the same as on `main`. An item's box is its `.host` in the interactive items and its host in `mx-list-item`. That holds for one-, two- and three-line items, with lead and trail content, in a list with a `gap`. An interactive item's host draws nothing: no padding, border, margin, background or shape of its own. `mx-list-item`'s host draws what its `.host` drew: the list's pixels are `main`'s, at elevation level 0 and raised.
6. **A lift doesn't change the layout or the visual.** Each item's drag lifts its host. While it is lifted, the list's size and the other items' boxes are the same as on `main`, and the host's rect, padding, overflow and background are what they were before the lift, in all three engines. Core's trait lifts the host: `useReorderableItem(host)`.
7. **No part, attribute, property, event, slot or export is added or removed, except `mx-list-item`'s part `impl`.** It goes with the `div`, and a consumer styles the item element, which now has a box. `@ydinjs/material-x` isn't published, so nothing deprecates it (`CONTRIBUTING.md` Part II §8). The interactive items keep `part="impl"` on their control.
   - **The interactive items' compositions lose `FocusForwarding`** (decision 4). `ListInteractiveItemCoreTraits` loses `typeof FocusForwarding`, and in `traits-baseline` only the two items' `FocusForwarding` entries change. `focus()` behaves as on `main` (property 3).
   - **Each item's host is now the list's flex item.** An interactive item's `::part(impl)` is inside it, so `order`, `flex` and `align-self` go on the item element itself, as on any element with a box. No other `@csspart` line changes ([`reviewer-1`, re-ruled](#reviewer-1-re-ruled)).
   - **No custom state is added.**
8. **The accessibility guide states what holds.** Its list section says that each item's host is its `listitem`, through its internals, and has a box, and why, and that `mx-list-item` has no inner element. WebKit's split of slotted nodes is no longer a limit of the list items, and the entry on a host with `tabindex` is restated: the host takes focus, and its node is its `listitem`.
9. **Comments state what holds, without finding ids.** The interactive host's resets say why, in one sentence.

## Scope and boundaries

**In scope:**

- the list item templates: the interactive items' back to `main`'s, and `mx-list-item`'s without its `div`;
- `ListItemCore.ts`, for the role, the reorderable registration and where the shared content goes, `ListInteractiveItemCore.ts`, for `FocusForwarding`, and `list-item.ts`, for its part line;
- the item styles, for `:host`'s `display`, the box rule of each kind and the resets;
- material-x tests, `traits-baseline` and the test command for the Chromium tree;
- `focus-forwarding.browser.test.ts`'s list of adopters;
- the list section of `accessibility.md`;
- the report.

**Out of scope:**

- `mx-list`'s own role;
- the elevation stylesheet, and the penumbra that the list items and the FAB don't draw;
- `interactive.styles.css`;
- the `FocusForwarding` trait itself, and its other adopters;
- core's reorderable trait;
- `@ydinjs/drag`;
- everything `RD-31` plans, `mx-sortable-list` included.

**Stop and report if:**

- a property needs a public surface change beyond property 7's;
- an item's box, the list's box or the list's pixels differ from `main` in any engine;
- a lifted host's rect, padding, overflow or background differs from its own before the lift;
- an engine doesn't expose an item as `listitem` with its control inside, in the committed probe's tree;
- `focus()` doesn't reach an interactive item's control in Firefox without `FocusForwarding`.

Use the `test-component` skill for every material-x test.

## Proofs

1. **The Chromium tree, in CI.** A material-x browser test reads the accessibility tree through CDP, through a new Playwright-only command in `tests/support`, as drag's `cdpOf` does. It asserts property 1 for a list with every kind of item, including a disabled link item, and property 3's roles and names. The row runs in the Chromium project and is skipped elsewhere, with the reason written where it is skipped.
2. **The structure, in every engine of the gate.** A material-x browser test asserts property 2 for each item kind:
   - the shadow tree has no element with a `role` attribute. An interactive item's elements are its template's. `mx-list-item`'s shadow root's children are the shared content's, and no element has the class `host`;
   - the host's computed `display` is `block` in the interactive items and `flex` in `mx-list-item`;
   - the host has no `role` attribute.

   It also asserts property 6, for a static and an interactive item. With the host lifted by core's trait, the host matches `:popover-open`, the list's height and the next item's top are unchanged, and the host's rect and computed `padding`, `overflow` and `background-color` equal their values before the lift. After the lift ends, the host has no `popover` attribute.

3. **Three engines' trees, by the committed probe.** Rerun [`probes/list-roles.ts`](probes/list-roles.ts) against the branch's build, in its `main` variant, which reads the built package unchanged. Save the reading under `checks/`, and show properties 1 and 3 in Chromium, Firefox and WebKit, with the slotted nodes inside their items in WebKit. Also rerun [`probes/list-lift.ts`](probes/list-lift.ts)'s `none` mode, and save it.
4. **The layout and pixel reading.** For the fixtures in property 5, read every item's box and the list's rect in all three engines, on `main`'s build and on the branch's, with [`probes/list-layout.ts`](probes/list-layout.ts). It reads an item without a `.host` by its host. The readings are equal. Save both under `checks/`. With `--png <dir>`, it also writes a screenshot per engine at elevation level 0 and 6. Each of the branch's screenshots is byte-equal to `main`'s (`cmp`); record the comparison in the report.
5. **Mutations.** Each fails, and each is reverted:
   - with `{ role: 'listitem' }` removed from the `useCore` call, proofs 1 and 2 fail;
   - with the interactive host's resets removed, proof 2's lift row for the interactive item fails;
   - with `overflow: visible` removed from `mx-list-item`'s host, its lift row fails.
6. **Safari, when it runs.** If the owner dispatches the Safari workflow on the branch, a row reads the computed roles through WebDriver (`getElementComputedRole`): `listitem` on each row, and `button` or `link` on each control. Otherwise the scheduled run reads it after merge. It doesn't gate the merge.
7. **The existing gates.** Every existing test passes, including `list-item.browser.test.ts` and its focus rows in Firefox, `focus-forwarding.browser.test.ts` without the two list items among its adopters, core's reorderable rows and `traits-baseline` with property 7's change. So do `fmt`, `lint` and `typecheck`, and the root `aube exec just test`.
8. **Sizes.** `aube exec just size` before and after. The readings at `7c2732d1d`'s source, in Brotli bytes:

   | Row                     | Before |
   | ----------------------- | ------ |
   | `list/list`             | 3,673  |
   | `list/list-item`        | 2,567  |
   | `list/list-button-item` | 4,575  |
   | `list/list-link-item`   | 4,746  |
   | `complete`              | 16,929 |

   **Estimated, against the table above:**
   - every item row gains the role in `useCore`'s call and loses `display: contents` for `display: block`, and loses the second argument of `useReorderableItem`;
   - `list/list-item` loses the `div` and gains its own stylesheet's module, the elevation's two layers on `:host`, `box-shadow: none` and `overflow: visible`. The box rule's declarations move and don't grow: about +30 to +100 B;
   - the two interactive rows gain the four resets and lose `FocusForwarding`'s code, so they may end below their size on `main`;
   - `complete` carries the box rule twice, under two selectors, which Brotli mostly absorbs, and keeps `FocusForwarding` for the buttons and the FAB: about +50 to +150 B;
   - `list/list` doesn't import the items and doesn't change.

   The rows have no limits (`RD-24`), so nothing can fail. Report each difference, and stop if a row grows by more than 150 B.

## `reviewer-1`, re-ruled

**Re-ruled 2026-11-21 with the decision.** On `main`, an interactive item's `<button>` or `<a>` is a flex item of `mx-list`. Under the decision before, the row was. Now the host is, for all three kinds, and `mx-list-item` has no part `impl` any more (property 7). A consumer puts `order`, `flex` or `align-self` on the item element itself, as on any element with a box. On `main`, none of the three items took them on its own element, because its host was `display: contents`.

- **No `@csspart` line changes.** The ruling before had the part's line say that the part isn't a flex item, because no other way existed. Now the plain way exists, so the line would describe what holds for every element in a flex container.
- **Not an owner question,** as before: `@ydinjs/material-x` isn't published (`CONTRIBUTING.md` Part II §8), and nothing in the repository sets a flex-item property on `::part(impl)` or a list item.

**The WebKit note on a lifted item goes with the second re-ruling.** It said that WebKit may drop an item from its tree while its host is `display: contents` during a lift. Each drag now lifts the host, which keeps its box in the top layer.

## Knock-on for `RD-31` (#90): a follow-up on its branch

**Planned, not yet written into `RD-31`'s plan; restated with the second re-ruling.** `RD-31` is dated implemented on `repo/list-sortable-1` (`52d32b21e`). The architect amends `RD-31` there with what follows, and the implementer applies it there after this unit is on `main`. If `RD-31` merges first, this unit's implementer applies the same changes when merging `main`, because the fold removes the element that `RD-31`'s static writes and its `visual` callback target.

**What `RD-31` changes:**

- **Ruling item 6 goes.** `mx-list-item` composes neither `FocusForwarding` nor `delegatesFocus`. Its host is the element that takes focus, in every engine (finding 13). Its focus indicator draws on `:host(:focus-visible)`, because the shared focus stylesheet's rule is on `.host:focus-visible`. `list/list-item`'s estimate loses the trait.
- **A static item's sortable writes go on its host.** A handle-less static item's `tabindex="0"` and `aria-description` are written on the host. They are recorded and kept as the handle's are: a value the consumer set stays, and only what the item wrote is removed. The owner accepts the item writing in the consumer's markup. `sortItem`'s test for a static item becomes the control being the host.
- **The sortable list's `visual` callback goes.** Drag's `visual` defaults to the item, which is now what every item lifts. Drag's lift writes the computed padding, border, overflow, color and background inline (finding 12), so the interactive items' resets go too, with core's trait.
- **Ruling item 7 changes.** A consumer's `tabindex` on the host no longer does nothing: the host becomes a tab stop, in either list, and the item doesn't suppress it (the [owner question](#owner-question), answered (a)).
- **_Not adopted_'s _"The host stops being `display: contents`"_ goes,** and so does the reason that the host must carry no `tabindex` or `aria-*`. Both were about a `display: contents` host's extra node.
- **The focused element is the list item.** A handle-less static item's focus lands on its host, which is its `listitem`, so `RD-31`'s Q6 section holds as written: the focused item is announced with its role.
- **Stop if drag needs a change.** None is expected: the item is drag's default visual.

## Owner question

**Answered 2026-11-21 by the owner, relayed by the coordinator: (a).** Verbatim: _"tabindex забыл - тут (а)"_ ("I forgot about tabindex: here it's (a)"). A consumer's `tabindex` on `mx-list-item` stands, so the item is a tab stop in `mx-list` and in `mx-sortable-list`, and the item doesn't suppress it. Nothing is added in this unit. `RD-31`'s ruling item 7 says the opposite, and its follow-up amends it. The question as it was put follows.

**With a box host, does a consumer's `tabindex` on `mx-list-item` stand as a tab stop?** On `main` and under `RD-31`'s ruling item 7, it does nothing, _"as the owner's Q6 rule wants"_. With a box, the platform makes the host focusable, in `mx-list` and in `mx-sortable-list`, and its accessibility node is its `listitem`, with no extra node (finding 3 doesn't apply to a box host).

- **(a) It stands.** The consumer wrote `tabindex`, and the item does what any element with a box does. Nothing is added.
- **(b) The item stops it,** for example by removing or overriding the consumer's attribute. That is code against valid markup (`CONTRIBUTING.md` Part II §1.1).

**The architect recommends (a).** Q6 governs what the library makes a tab stop, and this is the consumer's own choice. This unit doesn't wait for the answer: (a) needs no code, and (b) would be `RD-31`'s.

**The fold strengthens (a).** In `mx-sortable-list`, a handle-less static item's tab stop is now `tabindex` on its host, which the item writes when the consumer hasn't. Under (a), the consumer's attribute and the item's are one mechanism. Under (b), the item would remove a consumer's `tabindex` in `mx-list` and keep one in `mx-sortable-list`, on the same attribute of the same element. Before the fold, a consumer's `tabindex` in the sortable list gave a static item two tab stops, its host and its `div`, and the fold removes that case.

## What the re-ruling replaces

The full text before is this file at `001f8d833`.

- **The decision** said: _"**`listitem` goes on the item's row: the outermost element of its shadow tree, which has a box and holds everything the item renders.**"_ `mx-list-item`'s row was its `.host`, and each interactive item gained a row element around its button or link. The host stayed `display: contents`, because _"`RD-31`'s ruling rejects a host with a box, because the list's flex layout and the item's styles depend on it"_. _Not adopted_ held _"**A host with a box:** clean in all three engines, but it changes the list's layout and its drag, and `RD-31` excludes it."_ WebKit's split of slotted nodes was _"Not repaired here"_.
- **Property 2** said: _"**The role is on the row, in the item's template, as a `role` attribute.** The row has a box. The host's internals set no role, and the host's `role` attribute stays the consumer's."_
- **Property 4** said: _"**Nothing changes about focus.** This unit adds no focus behavior to `mx-list-item`. Its row is `.host`, so `RD-31`'s ruling holds unchanged: the inner `.host` takes focus, its `tabindex` follows the host's, and `useARIA` places the description on it."_
- **Property 5's last sentence** said: _"The row draws nothing: no padding, border, margin, background or shape of its own."_
- **Property 6** said: _"While an interactive item's `.host` is in the top layer, the row has no box, so the list's size and the other items' boxes are the same as on `main`."_
- **Property 7** said: _"**No public surface is added or removed.** No part, attribute, property, event, slot, export or type is added or removed. `part="impl"` stays on the same elements. `traits-baseline` doesn't change. **An interactive item's `impl` part is no longer a flex item of `mx-list`,** because its row is. [...] The part's `@csspart` line in `list-button-item.ts` and `list-link-item.ts` says so."_
- **Property 8** kept _"WebKit's split as a noted limit"_, and **property 9** asked for a comment on the row's `display: contents` during a lift.
- **The scope** had the host's `display`, focus and `FocusForwarding` out of scope, and a change to the host's `display` as a stop.
- **Proofs 2 and 5** asserted one element with `role="listitem"` in each shadow tree, the row or the `.host`, and mutated the role in a template and the row's lift rule.
- **The ruling on `reviewer-1`** accepted the part's new context and had the two interactive items' `@csspart` lines say that the part isn't a flex item of `mx-list`.

## What the second re-ruling replaces

The full text before is this file at `4c727d25d`.

- **The decision's opening** said: _"The three templates are `main`'s again: no row, and no `role` attribute."_
- **Decision 1** said: _"**`mx-list-item` keeps its inner `.host` `div` in this unit,** and its layout stays on it."_ Its reasons were that the stylesheet is shared and _"Folding the static item's `div` into `:host` repeats the `.host` block and the elevation's `.host::before` and `::after` under `:host` for one kind"_; that the `div` _"is the element that both drags lift. Lifting the host instead needs the UA's popover styles undone on `:host` (finding 7), and it puts `popover` and inline styles on the consumer's element"_; and that it _"is `RD-31`'s focus target"_. It made the fold `RD-31`'s follow-up.
- **Decision 2** ended: _"The row element of the decision before is gone, so the owner's rule is met by two fewer elements, not one more."_
- **Decision 3** said: _"**While an item's `.host` is in the top layer, its host has no box.** `useListItemCore` listens to `beforetoggle` on its `.host` and toggles a custom state, `lifted`, on its internals from the event's `newState`. The stylesheet has `:host(:state(lifted)) { display: contents; }`."_
- **_Not adopted, for the re-ruling_** held _"**Lifting the host itself** in this unit: finding 7 and decision 1. It is the follow-up's question."_
- **Property 2** said that _"each template has the elements that `main`'s has, no more"_. **Property 4** said: _"Its inner `.host` stays the element that `RD-31`'s ruling makes take focus."_ **Property 5** was _"The layout doesn't change"_, for each item's `.host` box, and said that _"The host draws nothing"_.
- **Property 6** said: _"While any item's `.host` is in the top layer, its host has the state `lifted` and no box [...]. Core's trait still lifts `.host`: the `useReorderableItem(host, target)` call doesn't change."_
- **Property 7** said: _"**No part, attribute, property, event, slot or export is added or removed.** `part="impl"` stays on the same elements."_, and _"**`lifted` is a custom state,** undocumented like `lead-large` and `drag`."_ **Property 9** asked for a comment on the `lifted` rule or its listener.
- **The scope** had _"`mx-list-item`'s inner `.host`, which stays (decision 1)"_ out of scope. **Proof 2's lift rows** asserted `:state(lifted)`, and **proof 5** removed the `lifted` rule. **Proof 4** read every item's `.host` rect and no pixels. **Proof 8** estimated the listener, the state and one rule on every row.
- **The ruling on `reviewer-1`** kept the WebKit note on a lifted item, inferred and not read.
- **The knock-on for `RD-31`** listed the changes of the box host alone, with _"The focused element is no longer the list item"_, and made the fold its follow-up's main task.

## Seen, not registered

Found while reading for the second re-ruling. Neither is this unit's property, and neither has been raised with the owner.

- **The list items and the FAB draw no penumbra.** The elevation stylesheet draws its penumbra as `.host`'s own `box-shadow`, and its umbra and ambient layers on `.host::before` and `::after`. `useListItemCore` and `mx-fab` adopt the elevation stylesheet before their own, whose `.host` rule starts with `all: unset`, so the penumbra is reset to `none` (finding 10). `useButtonCore` adopts it after its own stylesheet, so the buttons draw it. This unit keeps `main`'s pixels.
- **`interactive.styles.css` ships nowhere.** `src/list/styles/item/interactive.css.ts` builds it, and no module imports that file on `main`. So the interactive items' transition of their shape on press, and their disabled `cursor`, `pointer-events` and slot opacity, aren't applied.

## Where `RF-68`'s record lives

**Decided: in this branch.** `RF-68`'s entry was registered on `repo/list-sortable-1` (#90), which isn't merged. This unit repairs it, so the entry has to be on `main` when the repair lands, and #90's merge date isn't known.

- This branch adds the entry to `../00-index.md`, as it stands on #90 at `5bf743235`, after `RF-67`, plus the architect's dating of the repair.
- It also adds byte-identical copies of the entry's [reading](../list-sortable-1/checks/list-a11y.txt) and [probe](../list-sortable-1/probes/list-a11y.ts), at the same paths. Their links resolve on either branch, and identical files merge cleanly in either order.
- **#90 removes its copy of the entry from `00-index.md`.** It keeps or removes the two files as it likes, unchanged. Further datings of `RF-68` are made on this branch.

## The report

Write `list-roles-report.md` beside this handoff. Include:

- each proof's result, with links to its saved readings;
- the size table, after;
- any stop, with its output;
- which element takes focus in a static item, which stays `.host`.

The architect dates `RF-68` from the report.
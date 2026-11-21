# Handoff: each list item is exposed as a list item (`RF-68`)

**Recipient:** the implementer. **Branch:** `material-x/list-roles-1`, from `main` at `7c2732d1d`. **Input:** the architect's commit that adds this file. **Authorized** by the owner, relayed by the coordinator on 2026-11-21: _"it's just a bug, it needs fixing"_, in its own unit, outside `RD-31`. **The plan and its implementation share one pull request.** Continue on this branch, and open that pull request after the implementation, with `Closes #92`. #92 tracks `RF-68`.

**Re-ruled 2026-11-21 by the architect,** at `001f8d833`, on the owner's principle for hosts and his rule on shadow-tree elements, relayed by the coordinator. The listitem is now the item's host, which takes a box: [The decision](#the-decision). The row element is gone. [What the re-ruling replaces](#what-the-re-ruling-replaces) records the decision and the properties as they were. **The implementer reworks the branch's implementation** to this decision: [What the implementer changes](#what-the-implementer-changes).

**Governing records:**

- `RF-68` in [`../00-index.md`](../00-index.md): its required property and its datings. This branch carries the entry, as [Where `RF-68`'s record lives](#where-rf-68s-record-lives) explains;
- `RD-31`'s ruling [How a static item takes focus](https://github.com/ausginer/material-x/blob/5bf743235e8434676d056911e2c45646d8faf415/.plan/list-sortable-1/list-sortable-plan.md#how-a-static-item-takes-focus), on `repo/list-sortable-1` (#90, not merged);
- `RF-33`: `FocusForwarding`, which forwards `focus()` in Firefox for an item whose host is `display: contents`;
- **the owner's principle for hosts,** in translation: _"The convention isn't that a host must be `display: contents`. It's that we have no need to merge a native element's logic, where there is one, into the custom element. But a `div` isn't a native element with logic, so here we can simply remove `display: contents`. Yes, there will be some correction, but we avoid an extra HTML element in the template."_;
- **the owner's rule on shadow-tree elements,** in translation: _"A soft goal is to minimize the number of HTML elements inside the shadow DOM: don't make unnecessary elements if CSS can cover it. A balance must be kept, of course, so that it doesn't bloat the CSS and JS much. But in general, bloating the CSS a bit is better than creating a couple of new DOM elements."_ Another architect slot adds both rules to `CONTRIBUTING.md` in a pull request of its own;
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

## The decision

**Re-ruled 2026-11-21.** **Each item's host takes a box and the `listitem` role, through its internals.** `useListItemCore` passes `{ role: 'listitem' }` to `useCore`, as `mx-list` passes `list` and the button groups pass `group`. The item stylesheet's `:host` is `display: block` instead of `display: contents`. The three templates are `main`'s again: no row, and no `role` attribute.

1. **`mx-list-item` keeps its inner `.host` `div` in this unit,** and its layout stays on it.
   - **The stylesheet is shared.** In the interactive items, `.host` is the native control, which must stay the box that is pressed, focused and rippled. Folding the static item's `div` into `:host` repeats the `.host` block and the elevation's `.host::before` and `::after` under `:host` for one kind.
   - **It is the element that both drags lift.** Lifting the host instead needs the UA's popover styles undone on `:host` (finding 7), and it puts `popover` and inline styles on the consumer's element. Core's trait, which this unit must keep working (property 6), lifts `.host`, and `RD-31` replaces that trait.
   - **It is `RD-31`'s focus target,** and Mx Implementer B is writing the sortable list's writes on it now.
   - So the fold is `RD-31`'s follow-up ([below](#knock-on-for-rd-31-90-a-follow-up-on-its-branch)), which decides the drag visual and the focus target anyway, and the owner's rule favours it there.
2. **The interactive items take the same host.** The host is the list item around the native `<button>` or `<a>`, which keeps its own logic: focus, `aria-*`, disabling, the ripple, the link attributes and `part="impl"`. That is the owner's principle: nothing native is merged into the host. It is also how `mx-checkbox`, `mx-radio` and `mx-text-field` wrap their `<input>` (finding 9). The row element of the decision before is gone, so the owner's rule is met by two fewer elements, not one more.
3. **While an item's `.host` is in the top layer, its host has no box.** `useListItemCore` listens to `beforetoggle` on its `.host` and toggles a custom state, `lifted`, on its internals from the event's `newState`. The stylesheet has `:host(:state(lifted)) { display: contents; }`. That is one listener and one rule, and no element (finding 7). It follows the popover itself, so it holds for core's trait now and for `RD-31`'s sortable list, which lifts `.host` too.
4. **The interactive items no longer compose `FocusForwarding`.** Their hosts have a box, so `delegatesFocus` reaches the control in Firefox (finding 8). `FocusForwarding`'s JSDoc says it exists because every adopter's host is `display: contents`, which these items' hosts no longer are. `@ydinjs/material-x` isn't published, so the obsolete composition is deleted (`CONTRIBUTING.md` Part II §8). The trait stays for the button family and the FAB.

**Why the host and not the row:**

- **It is clean in all three engines,** with every control and every slotted node inside its item (table, last row). So it also repairs WebKit's split of slotted light-DOM nodes (finding 1) for the list items, which the row left as it was.
- **The layout doesn't move** (finding 6). The decision before rejected a host with a box because, by `RD-31`'s ruling, the list's layout and the item's styles depend on `display: contents`. That is read false: `.host` fills a block host as it filled the list's column.
- **The owner's principle allows it,** and his rule on shadow-tree elements prefers it.

**Not adopted, for the re-ruling:**

- **The row:** an element that the host's box makes unnecessary.
- **`:host:has(.host:popover-open)`,** which would be CSS alone: Firefox never matches it (finding 7).
- **The `drag` state, which both drags already set on the item,** as the rule's trigger: `RD-31`'s sortable list clears it when the landing starts, while the visual is still in the top layer. The host would then regain its box during the landing, beside the placeholder.
- **Lifting the host itself** in this unit: finding 7 and decision 1. It is the follow-up's question.
- **Keeping `FocusForwarding` on the interactive items:** machinery whose reason the box host removes, with a JSDoc that would no longer be true.
- **`role: 'none'` on the host:** finding 2.

## What the implementer changes

On this branch, from `001f8d833`:

- **The templates:** `list-button-item.tpl.html` and `list-link-item.tpl.html` lose the row, and `list-item.tpl.html` loses `role="listitem"`. All three are `main`'s again.
- **`ListItemCore.ts`:** `useCore`'s internals argument becomes `{ role: 'listitem' }`. A `beforetoggle` listener on the `.host` toggles the state `lifted` from the event's `newState`.
- **`styles/item/main.styles.css`:** `:host`'s `display` becomes `block`. `.row:has(> .host:popover-open)` is replaced by `:host(:state(lifted)) { display: contents; }`, with its one-sentence comment.
- **`ListInteractiveItemCore.ts`:** `FocusForwarding` leaves `ListInteractiveItemCoreTraits`, its import and the `useFocusForwarding` call. The shadow root still delegates focus.
- **Tests:** `list-roles.browser.test.ts`'s structure rows follow proof 2, and its lift rows cover a static item too. `focus-forwarding.browser.test.ts` drops the two list items from its adopters, and its `mx-list-button-item` subclass case. `traits-baseline.json` changes as property 7 says.
- **`accessibility.md`:** as property 8 says.
- **The report:** the proofs again, the size table, and the answer to the owner question if it has come.

## Required properties

1. **Each item of `mx-list` is exposed as a list item.** This holds in Chromium, Firefox and WebKit, for `mx-list-item`, `mx-list-button-item` and `mx-list-link-item`, enabled or disabled. In each engine's tree, the list has one `listitem` for each item, in DOM order. The nearest ancestor of each one that isn't `generic` is the list.
2. **The role is the host's, through its internals,** and the host has a box. The host's `role` attribute stays the consumer's. No template carries a `role`, and each template has the elements that `main`'s has, no more.
3. **An interactive item's control is inside its `listitem` in all three engines, and keeps its role, its name and its focus.**
   - `focus()` and Tab reach the same element as on `main`, in the same order, in Firefox too, without `FocusForwarding`.
   - A disabled link item leaves the tab order as on `main`.
   - The host's `aria-*` attributes reach the control as on `main`.
4. **This unit adds no focus behavior to `mx-list-item`.** Its inner `.host` stays the element that `RD-31`'s ruling makes take focus. One thing changes with the box: a consumer's `tabindex` on an `mx-list-item` host makes the host a tab stop, as on any element with a box. On `main` it does nothing. The [owner question](#owner-question) asks whether that stands.
5. **The layout doesn't change.** In each engine, each item's `.host` box and the list's box are the same as on `main`. That holds for one-, two- and three-line items, with lead and trail content, in a list with a `gap`. The host draws nothing: no padding, border, margin, background or shape of its own.
6. **A lift doesn't change the layout.** While any item's `.host` is in the top layer, its host has the state `lifted` and no box, so the list's size and the other items' boxes are the same as on `main`, in all three engines. The state is set and cleared in the same task as the popover. Core's trait still lifts `.host`: the `useReorderableItem(host, target)` call doesn't change.
7. **No part, attribute, property, event, slot or export is added or removed.** `part="impl"` stays on the same elements.
   - **The interactive items' compositions lose `FocusForwarding`** (decision 4). `ListInteractiveItemCoreTraits` loses `typeof FocusForwarding`, and in `traits-baseline` only the two items' `FocusForwarding` entries change. `focus()` behaves as on `main` (property 3).
   - **Each item's host is now the list's flex item.** `::part(impl)` is inside it, so `order`, `flex` and `align-self` go on the item element itself, as on any element with a box. No `@csspart` line changes ([`reviewer-1`, re-ruled](#reviewer-1-re-ruled)).
   - **`lifted` is a custom state,** undocumented like `lead-large` and `drag`.
8. **The accessibility guide states what holds.** Its list section says that each item's host is its `listitem`, through its internals, and has a box, and why. WebKit's split of slotted nodes is no longer a limit of the list items, and the entry on a host with `tabindex` is restated: the host takes focus, and its node is its `listitem`.
9. **Comments state what holds, without finding ids.** The `lifted` rule or its listener says why, in one sentence.

## Scope and boundaries

**In scope:**

- the list item templates, back to `main`'s;
- `ListItemCore.ts`, for the role, the `beforetoggle` listener and the state, and `ListInteractiveItemCore.ts`, for `FocusForwarding`;
- the item styles, for `:host`'s `display` and the `lifted` rule;
- material-x tests, `traits-baseline` and the test command for the Chromium tree;
- `focus-forwarding.browser.test.ts`'s list of adopters;
- the list section of `accessibility.md`;
- the report.

**Out of scope:**

- `mx-list`'s own role;
- `mx-list-item`'s inner `.host`, which stays (decision 1);
- the `FocusForwarding` trait itself, and its other adopters;
- core's reorderable trait;
- `@ydinjs/drag`;
- everything `RD-31` plans, `mx-sortable-list` included.

**Stop and report if:**

- a property needs a public surface change beyond property 7's;
- an item's box or the list's box differs from `main` in any engine;
- an engine doesn't expose an item as `listitem` with its control inside, in the committed probe's tree;
- `focus()` doesn't reach an interactive item's control in Firefox without `FocusForwarding`.

Use the `test-component` skill for every material-x test.

## Proofs

1. **The Chromium tree, in CI.** A material-x browser test reads the accessibility tree through CDP, through a new Playwright-only command in `tests/support`, as drag's `cdpOf` does. It asserts property 1 for a list with every kind of item, including a disabled link item, and property 3's roles and names. The row runs in the Chromium project and is skipped elsewhere, with the reason written where it is skipped.
2. **The structure, in every engine of the gate.** A material-x browser test asserts property 2 for each item kind:
   - the shadow tree has no element with a `role` attribute, and its elements are the template's;
   - the host's computed `display` is `block`;
   - the host has no `role` attribute.

   It also asserts property 6, for a static and an interactive item: with the `.host` lifted as core's trait lifts it, the host matches `:state(lifted)`, and the list's height and the next item's top are unchanged. After the lift ends, the state is gone.

3. **Three engines' trees, by the committed probe.** Rerun [`probes/list-roles.ts`](probes/list-roles.ts) against the branch's build, in its `main` variant, which reads the built package unchanged. Save the reading under `checks/`, and show properties 1 and 3 in Chromium, Firefox and WebKit, with the slotted nodes inside their items in WebKit. Also rerun [`probes/list-lift.ts`](probes/list-lift.ts)'s `none` mode, and save it.
4. **The layout reading.** For the fixtures in property 5, read every item's `.host` rect and the list's rect in all three engines, on `main`'s build and on the branch's, with [`probes/list-layout.ts`](probes/list-layout.ts). The readings are equal. Save both under `checks/`.
5. **Mutations.** Each fails, and each is reverted:
   - with `{ role: 'listitem' }` removed from the `useCore` call, proofs 1 and 2 fail;
   - with the `lifted` rule removed, proof 2's lift rows fail.
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
   - every item row gains the role in `useCore`'s call, the listener, the state and one rule, and loses `display: contents` for `display: block`: about 40 to 90 B;
   - the two interactive rows also lose `FocusForwarding`'s code, so they may end below their size on `main`;
   - `complete` gains about the same as one item, because the buttons and the FAB keep `FocusForwarding`;
   - `list/list` doesn't import the items and doesn't change.

   The rows have no limits (`RD-24`), so nothing can fail. Report each difference, and stop if a row grows by more than 150 B.

## `reviewer-1`, re-ruled

**Re-ruled 2026-11-21 with the decision.** On `main`, an interactive item's `<button>` or `<a>` is a flex item of `mx-list`. Under the decision before, the row was. Now the host is, for all three kinds, so `::part(impl)` of `mx-list-item` isn't one either. A consumer puts `order`, `flex` or `align-self` on the item element itself, as on any element with a box. On `main`, none of the three items took them on its own element, because its host was `display: contents`.

- **No `@csspart` line changes.** The ruling before had the part's line say that the part isn't a flex item, because no other way existed. Now the plain way exists, so the line would describe what holds for every element in a flex container.
- **Not an owner question,** as before: `@ydinjs/material-x` isn't published (`CONTRIBUTING.md` Part II §8), and nothing in the repository sets a flex-item property on `::part(impl)` or a list item.

**The WebKit note on a lifted item, restated, inferred and not read:** while an item's `.host` is lifted, its host, which is its `listitem`, is `display: contents` (property 6). By finding 1 and the `inner-contents` [reading](checks/list-roles-inner-contents.txt), WebKit may then drop the item from its tree for the drag's duration. No tree was read in that state. If the follow-up lifts the host itself, the host keeps its box in the top layer, and the note goes.

## Knock-on for `RD-31` (#90): a follow-up on its branch

**Planned, not yet written into `RD-31`'s plan.** Mx Implementer B is finishing task 3a and task 7. Once they are in, the architect amends `RD-31` on `repo/list-sortable-1` with what follows, and the implementer applies it there after this unit is on `main`. If `RD-31` merges first, the same changes become a unit of their own. In that order, this unit's implementer also removes `FocusForwarding` from `mx-list-item` when merging `main`, for decision 4's reason.

**What `RD-31` changes, with the box host alone:**

- **Ruling item 6 goes.** `mx-list-item` doesn't compose `FocusForwarding`: with a box host, `delegatesFocus` reaches its inner `.host` in Firefox (finding 8). `list/list-item`'s estimate loses the trait.
- **Ruling item 7 changes.** A consumer's `tabindex` on the host no longer does nothing: the host becomes a tab stop, in either list (the [owner question](#owner-question)).
- **_Not adopted_'s _"The host stops being `display: contents`"_ goes,** and so does the reason that the host must carry no `tabindex` or `aria-*`. Both were about a `display: contents` host's extra node.
- **The focused element is no longer the list item.** A handle-less static item's focus lands on its inner `.host`, a `generic` inside the host's `listitem`. `RD-31`'s Q6 section says that the focused item is announced with its role, which then holds only through the ancestor.

**The follow-up's main task, recommended under the owner's rule: fold `mx-list-item`'s inner `div` into `:host`.** Its required properties:

- `mx-list-item`'s shadow tree has no wrapper. Its layout and its elevation are on `:host`, and the UA's popover styles are undone there.
- The drag visual of a static item is its host. A handle-less static item takes focus on its host, which is its `listitem`, and carries its description there. The sortable writes keep a consumer's `tabindex` and `aria-description` on the host, with the record that the item already keeps for its handle.
- Whether the interactive items' visual becomes the host too, which would remove the `lifted` state, is read and decided there.
- Stop if the fold's CSS grows `list/list-item` by more than 150 B, or if drag needs a change.

## Owner question

**With a box host, does a consumer's `tabindex` on `mx-list-item` stand as a tab stop?** On `main` and under `RD-31`'s ruling item 7, it does nothing, _"as the owner's Q6 rule wants"_. With a box, the platform makes the host focusable, in `mx-list` and in `mx-sortable-list`, and its accessibility node is its `listitem`, with no extra node (finding 3 doesn't apply to a box host).

- **(a) It stands.** The consumer wrote `tabindex`, and the item does what any element with a box does. Nothing is added.
- **(b) The item stops it,** for example by removing or overriding the consumer's attribute. That is code against valid markup (`CONTRIBUTING.md` Part II §1.1).

**The architect recommends (a).** Q6 governs what the library makes a tab stop, and this is the consumer's own choice. This unit doesn't wait for the answer: (a) needs no code, and (b) would be `RD-31`'s.

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
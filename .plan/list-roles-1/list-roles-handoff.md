# Handoff: each list item is exposed as a list item (`RF-68`)

**Recipient:** the implementer. **Branch:** `material-x/list-roles-1`, from `main` at `7c2732d1d`. **Input:** the architect's commit that adds this file. **Authorized** by the owner, relayed by the coordinator on 2026-11-21: _"it's just a bug, it needs fixing"_, in its own unit, outside `RD-31`. **The plan and its implementation share one pull request.** Continue on this branch, and open that pull request after the implementation, with `Closes #92`. #92 tracks `RF-68`.

**Governing records:**

- `RF-68` in [`../00-index.md`](../00-index.md): its required property and its datings. This branch carries the entry, as [Where `RF-68`'s record lives](#where-rf-68s-record-lives) explains;
- `RD-31`'s ruling [How a static item takes focus](https://github.com/ausginer/material-x/blob/5bf743235e8434676d056911e2c45646d8faf415/.plan/list-sortable-1/list-sortable-plan.md#how-a-static-item-takes-focus), on `repo/list-sortable-1` (#90, not merged);
- `RF-33`: `FocusForwarding`, which forwards `focus()` in Firefox for an item whose host is `display: contents`;
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

## The decision

**`listitem` goes on the item's row: the outermost element of its shadow tree, which has a box and holds everything the item renders.**

- `mx-list-item`'s row is its `.host`. That is the element that `RD-31`'s ruling makes take focus, so a focused static item is a list item, and its description reaches the same element through `useARIA`.
- An interactive item's `.host` is its `<button>` or `<a>`, which can't take the role without losing its own. So a new row element holds it. The `.host` stays the button or the link, and keeps every job it has: focus, `aria-*`, disabling, the ripple, the link attributes and `part="impl"`.

**Why:**

- **It is the only placement that keeps each interactive control inside its item in all three engines.** The host role puts it outside in WebKit, by finding 1.
- **The host stays `display: contents`.** `RD-31`'s ruling rejects a host with a box, because the list's flex layout and the item's styles depend on it. A host with a box would also stay in the flow when its visual is lifted, as the row does in finding 4. That is inferred, not read.
- **Neither unit waits for the other.** `RD-31` ruled that `RF-68`'s fix may put `listitem` on the host or on the inner `.host`. A row with `display: contents` while its control is lifted means a drag can keep lifting `.host`, for core's trait now and for `RD-31`'s sortable list, which lifts `.host` too ([its plan](https://github.com/ausginer/material-x/blob/5bf743235e8434676d056911e2c45646d8faf415/.plan/list-sortable-1/list-sortable-plan.md), _"A visual inside the item's shadow root"_).

**Not adopted:**

- **The host's internals, `{ role: 'listitem' }`:** one line, and correct in Chromium and Firefox, but WebKit puts the button and the link outside their item.
- **A host with a box:** clean in all three engines, but it changes the list's layout and its drag, and `RD-31` excludes it.
- **The row as the drag visual,** in place of the `display: contents` rule: it works for core's trait, but `RD-31`'s sortable list would then have to lift a different element for interactive items. That makes the two units depend on each other.
- **`role: 'none'` on the host:** finding 2.

**Not repaired here:** WebKit's split of the slotted light-DOM nodes (finding 1). It isn't `RF-68`'s property, it is on `main` for every `display: contents` host with slotted content, and it has been read only in Playwright's WebKit build, not in Safari with VoiceOver. It is recorded with `RF-68`'s dating and isn't registered.

## Required properties

1. **Each item of `mx-list` is exposed as a list item.** This holds in Chromium, Firefox and WebKit, for `mx-list-item`, `mx-list-button-item` and `mx-list-link-item`, enabled or disabled. In each engine's tree, the list has one `listitem` for each item, in DOM order. The nearest ancestor of each one that isn't `generic` is the list.
2. **The role is on the row, in the item's template, as a `role` attribute.** The row has a box. The host's internals set no role, and the host's `role` attribute stays the consumer's.
3. **An interactive item's control is inside its `listitem` in all three engines, and keeps its role, its name and its focus.**
   - `focus()` and Tab reach the same element as on `main`, in the same order.
   - A disabled link item leaves the tab order as on `main`.
   - The host's `aria-*` attributes reach the control as on `main`.
4. **Nothing changes about focus.** This unit adds no focus behavior to `mx-list-item`. Its row is `.host`, so `RD-31`'s ruling holds unchanged: the inner `.host` takes focus, its `tabindex` follows the host's, and `useARIA` places the description on it.
5. **The layout doesn't change.** In each engine, each item's `.host` box and the list's box are the same as on `main`. That holds for one-, two- and three-line items, with lead and trail content, in a list with a `gap`. The row draws nothing: no padding, border, margin, background or shape of its own.
6. **A lift doesn't change the layout.** While an interactive item's `.host` is in the top layer, the row has no box, so the list's size and the other items' boxes are the same as on `main`. Core's trait still lifts `.host`: the `useReorderableItem(host, target)` call doesn't change.
7. **No public surface is added or removed.** No part, attribute, property, event, slot, export or type is added or removed. `part="impl"` stays on the same elements. `traits-baseline` doesn't change. **An interactive item's `impl` part is no longer a flex item of `mx-list`,** because its row is. So `order`, `flex` and `align-self` on `::part(impl)` no longer move or size the item. The part's `@csspart` line in `list-button-item.ts` and `list-link-item.ts` says so ([ruling on `reviewer-1`](#ruling-on-reviewer-1-the-impl-parts-layout-context)).
8. **The accessibility guide states what holds.** Its list section says where `listitem` sits and why, and keeps WebKit's split as a noted limit, read in Playwright's WebKit. Its _Missing requirements_ entry is resolved or restated.
9. **Comments state what holds, without finding ids.** The template or the style that gives the row `display: contents` during a lift says why, in one sentence.

## Scope and boundaries

**In scope:**

- the list item templates and `ListItemCore.ts`/`ListInteractiveItemCore.ts`, where the row is created or found;
- the item styles, for the row;
- material-x tests and a test command for the Chromium tree;
- the list section of `accessibility.md`;
- the report.

**Out of scope:**

- `mx-list`'s own role;
- the host's `display`;
- focus;
- `FocusForwarding`;
- core's reorderable trait;
- `@ydinjs/drag`;
- everything `RD-31` plans, `mx-sortable-list` included;
- WebKit's split of slotted nodes.

**Stop and report if:**

- a property needs a public surface change, or a change to the host's `display`;
- an item's box or the list's box differs from `main` in any engine;
- an engine doesn't expose an item as `listitem` with its control inside, in the committed probe's tree.

Use the `test-component` skill for every material-x test.

## Proofs

1. **The Chromium tree, in CI.** A material-x browser test reads the accessibility tree through CDP, through a new Playwright-only command in `tests/support`, as drag's `cdpOf` does. It asserts property 1 for a list with every kind of item, including a disabled link item, and property 3's roles and names. The row runs in the Chromium project and is skipped elsewhere, with the reason written where it is skipped.
2. **The structure, in every engine of the gate.** A material-x browser test asserts property 2 for each item kind:
   - exactly one element with `role="listitem"` in the shadow tree;
   - it is the row and holds the `.host`, or is the `.host` for `mx-list-item`;
   - the host has no `role` attribute.

   It also asserts property 6: with an interactive item's `.host` lifted as core's trait lifts it, the list's height and the next item's top are unchanged.

3. **Three engines' trees, by the committed probe.** Rerun [`probes/list-roles.ts`](probes/list-roles.ts) against the branch's build, in its `main` variant, which reads the built package unchanged. Save the reading under `checks/`, and show property 1 and property 3 in Chromium, Firefox and WebKit. Also rerun [`probes/list-lift.ts`](probes/list-lift.ts) with the real row.
4. **The layout reading.** For the fixtures in property 5, read every item's `.host` rect and the list's rect in all three engines, on `main`'s build and on the branch's. The readings are equal. Save both under `checks/`.
5. **Mutations.** Each fails, and each is reverted:
   - with the role removed from one item kind's template, proof 1 and proof 2 fail;
   - with the `display: contents` rule removed, proof 2's lift row fails.
6. **Safari, when it runs.** If the owner dispatches the Safari workflow on the branch, a row reads the computed roles through WebDriver (`getElementComputedRole`): `listitem` on each row, and `button` or `link` on each control. Otherwise the scheduled run reads it after merge. It doesn't gate the merge.
7. **The existing gates.** Every existing test passes, including `list-item.browser.test.ts`, `focus-forwarding.browser.test.ts`, core's reorderable rows and `traits-baseline`. So do `fmt`, `lint` and `typecheck`, and the root `aube exec just test`.
8. **Sizes.** `aube exec just size` before and after. The readings at `7c2732d1d`'s source, in Brotli bytes:

   | Row                     | Before |
   | ----------------------- | ------ |
   | `list/list`             | 3,673  |
   | `list/list-item`        | 2,567  |
   | `list/list-button-item` | 4,575  |
   | `list/list-link-item`   | 4,746  |
   | `complete`              | 16,929 |

   **Estimated:**
   - `list/list-item` gains a `role` attribute, a few bytes.
   - The two interactive rows each gain the row element, its role and one rule, about 30 to 60 B.
   - `complete` gains about the same, because the interactive items share their template code and styles.
   - `list/list` doesn't import the items and doesn't change.

   The rows have no limits (`RD-24`), so nothing can fail. Report each difference, and stop if a row grows by more than 150 B.

## Ruling on `reviewer-1`: the `impl` part's layout context

**Ruled 2026-11-21 by the architect,** on the [feature proof](../reviews/list-roles-1/feature-proof-claude.md) at `1deacdc54`: **the change is accepted and documented on the part.** The row stays a box, and `part="impl"` stays on the control.

**What changed.** On `main`, an interactive item's `<button>` or `<a>` is a flex item of `mx-list`, because the host is `display: contents`. On this branch the row is, and the part is the row's child. A consumer's `#x::part(impl) { order: -1 }` moves the item first on `main` and does nothing here, in all three engines ([reading](../reviews/list-roles-1/checks/part-layout.txt)). `mx-list-item` is unaffected, because its part is its row.

**Why the change is accepted:**

- **Keeping `main`'s context loses the item in WebKit.** With the row `display: contents`, as the coordinator's option (a) suggests, WebKit's tree under the list has no node for either interactive item: no `listitem`, no `button` and no `link`. Chromium's and Firefox's trees don't change ([reading](checks/list-roles-inner-contents.txt), the probe's new `inner-contents` variant). That fails properties 1 and 3, and it is worse than `main`, where the control is at least the list's child.
- **Moving `part="impl"` to the row changes what the part is.** It is documented as the native button or anchor. On the row, `::part(impl):focus-visible` and `::part(impl):disabled` would stop matching, and the part's padding and shape would land on a wrapper, not the control. That breaks more than the flex-item properties it would keep.
- **No compatibility is owed.** `@ydinjs/material-x` isn't published (the npm registry has no `@ydinjs/material-x`), so `CONTRIBUTING.md` Part II §8 applies. No guide, story or test of the package uses a flex-item property on `::part(impl)`.
- **What is lost is small.** `order` on a list item shows the items in a different order from the one that the accessibility tree and Tab use. Nothing in the repository sets `flex` or `align-self` on a list item.

So it isn't an owner question: it is unreleased surface, and both ways of keeping `main`'s context are worse. Adding a `row` part to restore the capability is outside this unit (property 7) and has no user.

**What the implementer changes:**

- The `@csspart impl` line of `list-button-item.ts` and of `list-link-item.ts` adds one sentence, such as: _"It is inside the item's list-item row, so it isn't a flex item of `mx-list`."_ That JSDoc reaches the declarations, which is where the part is documented.
- `list-item.ts`'s `@csspart` line doesn't change.
- No source, style, test or size changes. The declarations of the two items change by that sentence only. The report states it under property 7.

**Inferred, not read, and not registered:** the row is `display: contents` while its control is lifted (property 6), so by the same reading WebKit may have no node for the item under the list during a drag. No tree was read in that state, the control is then in the top layer, and the drag's announcements are `RD-31`'s.

**Property 7 said, before this ruling:** _"**No public surface changes.** No part, attribute, property, event, slot, export or type is added or removed. `part="impl"` stays on the same elements. `traits-baseline` doesn't change."_

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
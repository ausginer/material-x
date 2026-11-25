# `useSlot` listens from its call (RF-131, #234, #256) — feature proof

**Files were read at:** `96442bad3c629446f5b2769d41924883b721f369`, the head of `core/slot-listener-1`, in slot `g`, clean and equal to `origin`. **Diff reviewed:** `751b1fb81..96442bad3`. `main` at `4e2972514` merges without a conflict (`git merge-tree`). Files that a probe or mutation changed were restored, and core rebuilt. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2.

**Contract:** `repo:RF-131` in [`00-index.md`](../../00-index.md), and [`slot-out.txt`](../../aria-removed-1/checks/slot-out.txt).

**Verdict: pass. Properties 2 and 3 hold. Property 1 holds for each caller in `src`, with one remainder of another cause: `reviewer-1`, Tier A, pre-existing, for the architect to route.** Three Tier C findings. None needs a change of `useSlot`, and no callback while out was found to do harm.

## Required properties

| Property | Reading |
| --- | --- |
| 1. After a connect, the content is said as if connected at each change | **Holds** in 117 of 126 readings in each engine, three ways of 42 cases ([`callers.txt`](checks/callers.txt)). The other nine are `reviewer-1` |
| 2. One call for each change, with the slot's nodes; a connect adds none | **Holds** in 37 sequences ([`lifetime.txt`](checks/lifetime.txt)) |
| 3. The callback can run while out, and the JSDoc says so | **Holds** |

## Scope

**Covered, in the three engines unless said:**

- **Lifetime** ([probe](probes/lifetime.browser.test.ts.txt)), the new hook and the former one on the same host. Where the host stays connected at each dispatch, both make the same number of calls with the same nodes: content and connect in one task, three changes in one task, in three tasks and in three microtasks, the parser, an upgrade, a move by `append` and by `moveBefore`, 20 reconnects. A change that is undone out of the document is one call, as a slot signals it. WebKit also dispatches `slotchange` for changed text data, connected or not, and both hooks pass it on while connected. No call is doubled, and no connect adds one.
- **Hosts that are hard to place:** adopted into an iframe, changed and removed there, and put back; adopted into a document without a window; changed in `connected` and in `disconnected`; removed in the slot's own handler and in an earlier one; in an outer shadow tree with a slot as content; cloned; imported from a template; upgraded out of the document. Each change is one call.
- **A declarative shadow root** that the hook finds: content that was assigned before the upgrade is reported by neither hook, and later changes by the new one also while out. If the upgrade comes in the same task, both report it. It is unchanged by this unit. A host that is upgraded late gets its call after the upgrade, as before.
- **Collection** ([reading](checks/gc.txt), [probe](probes/gc.mjs)): of 300 hosts each, never connected, with content, removed, and reconnected ten times and changed while out, none survives, as without the hook. A host that only its child keeps still answers a change.
- **Order among listeners:** the hook's listener is now before one that a component adds after its `useSlot` call, where it was after one added before the connect. No component in `src` adds its own `slotchange` listener.
- **Callers** ([probe](probes/callers.browser.test.ts.txt)): text field and multiline (each slot, and the label with `aria-labelledby` set or lost, before, after and in one task with it), connected group, standard group, the three list items, sortable list, slider and the top app bar of `4e2972514`, whose sources and 36 behavior rows ran on this head in Chromium. Each element is changed while connected, after a disconnect, before the first connect, and after a disconnect with two more reconnects. With the former hook, 107 of the 126 readings in Chromium aren't as while connected ([reading](checks/callers-former-hook.txt)).
- **The standard group's press effect,** which the entry had by reading: a group that was changed while out, or made out, has no press effect with the former hook, and the right one now.
- **The slider needs no silence:** its three cases read as while connected with both hooks, and `labels` and the reflected elements throw nothing while out. No row is owed for it.
- **The top app bar** has the defect on `main`, by `useHasSlottedPolyfill`: an added `lead` or `trail` isn't rendered (0 by 0 pixels), and the states are wrong in each of three cases. It is right with this unit.
- **Harm while out:** no focus moves, nothing blurs and no `focusin`, `input` or `change` fires while another control has focus. The tab stop of a group that had focus stays on the same button, by Tab and an arrow key. A focused button moved into a group that is out, and back, leaves each group with one tab stop. A sortable list that is changed while out, removed with a pending commit that is then applied while out or in the same task, removed in its `reorder` handler, or put back before the commit, moves an item by keyboard afterward with the right positions, with no popover and no `drag` state left. No error and no rejected promise.
- **Witnesses** ([mutations](checks/mutations.txt), [script](probes/mutations.mjs), Chromium): nine wrong lifetimes and no listener. Core's rows fail for each, and the reconnect row alone catches a second listener at each reconnect. The two changed core rows fail for the right reason: the former with a guard on `isConnected`, with the listener until the first disconnect and with the missed call made at the connect; the reconnect row also for a leaked listener. The 29 material-x rows fail when the listener is silent while out, 15 when it ends at the first disconnect, and 14 when it starts at the first connect.

**Not covered:** Safari, screen readers, the visual and spec projects, a pointer drag in flight, and the sizes, which I didn't measure again. CI's `verify` passes at the head (read).

## Findings

### reviewer-1 — a connected group whose buttons were cloned from a template while it was out has no roving tab stop

**Tier A, pre-existing.** Routed to the architect.

- **Current behavior.** A button from `template.content.cloneNode(true)` isn't upgraded until it is connected. If it is appended to an upgraded `mx-connected-button-group` that is out, or was never connected, and the group is connected in a later task, the slot's call comes before the upgrade. `useRovingTabindex` drops nodes that aren't items, and an upgrade dispatches no `slotchange`. So the group gives these buttons no `tabindex`. With all three cloned, each is a tab stop, and the arrow keys do nothing: Tab 1, ArrowRight 1, Tab 2, Tab 3. While connected: Tab 1, ArrowRight 2. It lasts until the next slot change. The end shapes are right. The former hook reads the same.
- **Against.** Property 1: had the group been connected at the change, the buttons would have been upgraded by then. The same when only one button is a clone (it gets no `tabindex`), and when the clone replaces the first (no managed tab stop).
- **Evidence.** [`callers.txt`](checks/callers.txt), _cloned from a template_ and _template clone keys_, the three engines. Content set with `innerHTML` and by `importNode` is upgraded at once and reads right.
- **Beside it, and not this entry's:** a connected group whose items are defined in a later task also gives none a `tabindex` ([`late-items.txt`](checks/late-items.txt), [probe](probes/late-items.browser.test.ts.txt)). I found no record of either in `00-index.md`. The sortable list reads its slot again when an item upgrades, and has neither.
- **Required property.** A button that upgrades after the group's last slot change is in the group's roving order, or the record states the limit of property 1.

### reviewer-2 — the list item's two rows pass without the large image's height

**Tier C.** With `lead-large` never set, all 290 rows of `slotted-content` and `tests/list` pass in Chromium ([reading](checks/large-image-removed.txt)). The two rows compare the item with one that was changed while connected, so both lose the height. They do witness this repair. No other test names `data-large` or `lead-large`.

- **Required property.** A row fails when a large leading image doesn't change its item's height.

### reviewer-3 — two effects of the repair have no row

**Tier C.** The standard group's press effect and the top app bar's slots differ with the former hook and are right now. The entry has the first by reading, and the second came to `main` after this branch's base, so neither is in the entry's table, and the implementer's rows follow the table. The property that the hook gives them is held by core's rows.

- **Required property.** The record says whether these two owe rows.

### reviewer-4 — the record calls the slots of two probes as while connected where they compare less

**Tier C.** The entry says that a button's icon, a standard group's first button and a sortable list's added item _read as while connected, in what the probe compares_. In this proof a sortable list's item with the former hook lacks the `has-default` state, and a handle added while out isn't rendered (0 by 0 pixels, not 9 by 19), both through the item. The repair makes both right. Only the entry's account of the defect is narrower than the defect.

- **Required property.** The entry's account names the sortable list's items and handles, if it is corrected at closure.
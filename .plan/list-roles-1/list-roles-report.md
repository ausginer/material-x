# Report: each list item is exposed as a list item (`RF-68`)

**Input:** `material-x/list-roles-1` at `a52f3bbd8`: the [handoff](list-roles-handoff.md) as the second re-ruling left it, with the owner's answer (a) recorded. The implementation is reworked from `001f8d833`, as the handoff's _What the implementer changes_ says. **Governing records:** `RF-68` in [`../00-index.md`](../00-index.md), the handoff's decisions 1 to 4 and properties 1 to 9, `RF-33`, `RD-24`, [`accessibility.md`](../../.agents/docs/accessibility.md#list) and [the `.host` invariant](../../.agents/docs/architecture.md#components-ydinjsmaterial-x). All local readings are in Playwright 1.65.0's builds: Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2. `main`'s readings are on `origin/main` at `7cc702e1b`. Its material-x and core sources, and its lockfile, equal the branch's merge base `555ab85bc`.

**Outcome: the second re-ruling is implemented, and no stop condition was met.** Proofs 1 to 5, 7 and 8 hold. Proof 6 waits for a Safari run. Core's reorderable trait and `@ydinjs/drag` don't change.

The earlier report, for the row, is this file at `001f8d833`.

## What changed

- **Templates:** `list-button-item.tpl.html` and `list-link-item.tpl.html` are `main`'s again. `list-item.tpl.html` is deleted: `mx-list-item` passes no template, and its shadow root holds the shared content (`list-item-shared.tpl.html`) directly.
- **`ListItemCore.ts`:** `useCore` gets `{ role: 'listitem' }`. `useListItemCore(host, styles, template?, init?)`: with a template, the shared content goes into its `.host`, which the function returns, and without one into the shadow root. `useReorderableItem(host)` registers the host as the visual.
- **`ListInteractiveItemCore.ts`:** `FocusForwarding` leaves `ListInteractiveItemCoreTraits`, its import and the `useFocusForwarding` call. The shadow root still delegates focus.
- **`list-item.ts`:** adopts `static-box.css.ts`. The `@csspart impl` line goes.
- **Styles:** in `styles/item/main.styles.css`, `:host` is `display: block`, and the `.host` block and the `.row` rule go. The box rule moves to one stylesheet per kind:
  - `static-box.styles.css`, adopted by `mx-list-item`: the box rule on `:host`, without `all: unset`, with `box-shadow: none` and `overflow: visible`, and the elevation's two pseudo-element layers on `:host::before` and `:host::after`. The layers are flat selectors, not nested under `:host`, because a nested `&` would become `:is(:host)`.
  - `interactive-box.styles.css`, adopted by the two interactive items: the box rule on `.host` as before, and `:host { padding: 0; overflow: visible; background: none; color: inherit }` with a one-sentence comment.
  - Each has a `.css.ts` that exports the sheet. No module adopts both.
- **Tests:** `list-roles.browser.test.ts`'s structure and lift rows follow proof 2. `list-item.browser.test.ts`'s line-height rows read `mx-list-item`'s host, its box. `focus-forwarding.browser.test.ts` drops the two list items and the `mx-list-button-item` subclass case. `traits-baseline.json` changes only in the two items' `FocusForwarding` entries: `instanceof` false, and no `focus` or `symbol:FocusForwarding` key on their prototype.
- **`accessibility.md`, the list section:** each item's host is its `listitem`, through its internals, and has a box, and why. `mx-list-item` has no inner element. A consumer's `tabindex` on its host stands. WebKit's split is no longer a limit of the list items. Lines 53 and 58 of the earlier text are replaced.
- **`probes/list-lift.ts`:** a new `item-lift` mode lifts the item's host with nothing added to the build, as the branch's trait does. An optional third argument selects modes. The emulation modes query a static `.host`, which the branch's build no longer has.

The interactive items keep `part="impl"` on their control. No custom state is added.

## Proofs

### 1. The Chromium tree, in CI

`list-roles.browser.test.ts` › _Chromium's accessibility tree_, for a static item, a button item, a disabled button item, a link item and a disabled link item:

- the root is `list`, with 5 `listitem` nodes reached through `generic` nodes only;
- each `listitem`'s children are `generic ""` for the static item, `button "Item 1"`, `button "Item 2"`, `link "Item 3"` and `link "Item 4"`.

The block runs only in Chromium, with the reason written above it.

### 2. The structure and the lift, in every engine of the gate

For each kind, enabled and disabled: no element in the shadow tree has a `role` attribute; the host has no `role` attribute; the host's computed `display` is `flex` for `mx-list-item` and `block` for the interactive items. `mx-list-item`'s shadow root's children are `slot.lead`, `div.content` and `slot.trail`, with no `.host`. Each interactive item's shadow root has one child, its `<button>` or `<a>`, which is its `.host`.

**The lift rows,** for `mx-list-item` and `mx-list-button-item`. The item is in a list with a 12 px gap between two static items, and has a `[data-handle]` in its trail. With `reorderable` on the list, the handle is focused and Space is pressed. Core's trait then lifts the item from the keyboard: these rows run the trait itself, not a copy of its steps.

- the host matches `:popover-open`;
- the list's height and the next item's top are unchanged;
- the host's rect, and its computed `padding`, `overflow` and `background-color`, equal their values before the lift;
- after Escape, the host has no `popover` attribute.

**The Tab row** (property 3) is unchanged: three Tabs reach the button item's `<button>`, then the enabled link item's `<a>` past the disabled one, then a button after the list.

`MX_TEST_ENGINES=chromium,firefox,webkit vitest run tests/list/list-roles.browser.test.ts`: 83 passed and 4 skipped. The skipped rows are the two Chromium tree rows in Firefox and WebKit.

### 3. Three engines' trees, by the committed probe

[`probes/list-roles.ts`](probes/list-roles.ts), variant `main`, on the branch's build: [reading](checks/list-roles-branch.txt).

| Engine | Each item | Its content |
| --- | --- | --- |
| Chromium | `listitem` on the host, directly under the list | the slots, the handle's `button "Reorder"`, and `button "Button item"` or `link "Link item"`, inside it |
| Firefox | `listitem` directly under the list, named from its content | the same |
| WebKit | `listitem` on the host, whose parent is the list | the same. Each slotted light-DOM node's parent is a slot inside its item: the label text and the handle `span` are no longer the list's children |

- **Properties 1 and 3 hold in all three engines.**
- **The host with `tabindex="0"` (`#s3`)** is a `listitem` and a tab stop, with no node of its own, in each engine. Tab order is `span | #s3 | #b > button | #a > a | #after | body`. That is the owner's answer (a).

[`probes/list-lift.ts`](probes/list-lift.ts): [reading](checks/list-lift-branch.txt).

- **`item-lift`, the branch's lift:** the list stays 192 px and the link's top stays 144 px, for the button item and the static item, in each engine. `main`'s build in mode `none`, `main`'s own lift, reads the same.
- **`none` on the branch's build** reads 192 → 204. It lifts the inner `.host`, which no code on the branch lifts: the host keeps its box. It is recorded as the handoff asks and doesn't describe the branch.

### 4. The layout and the pixels

[`probes/list-layout.ts`](probes/list-layout.ts) with `--png`, on [`main`'s build](checks/list-layout-main.txt) and [the branch's](checks/list-layout-branch.txt). On the branch, the probe reads `mx-list-item` by its host. **The two readings are equal in all three engines**: `diff` of the whole output is empty, and the list is `0 0 360 880` in each.

**Each of the branch's six screenshots is byte-equal to `main`'s** (`cmp`), at elevation level 0 and 6 in each engine ([reading](checks/list-layout-pixels.txt)). In each engine, level 0 and level 6 differ, so the level does raise the items.

### 5. Mutations

Each was run in the three engines on `list-roles.browser.test.ts` and then reverted by the inverse edit. The clean file passes again.

| Mutation | Result |
| --- | --- |
| `{ role: 'listitem' }` replaced by `{ }` in `useCore`'s call | Proof 1 fails: both Chromium tree rows. **Proof 2 doesn't fail:** no engine lets page script read a role set through `ElementInternals`. Proof 1 and the probe observe the role. |
| The interactive host's `:host` resets removed | The button item's _rect, padding, overflow and background_ row fails in Chromium, Firefox and WebKit |
| `overflow: visible` removed from `mx-list-item`'s host | The static item's same row fails in all three engines |

The handoff expected the first mutation to fail proof 2 too. Proof 2 asserts property 2's structure, and the role itself is a property of the accessibility tree.

### 6. Safari

Not run. Safari runs only through the owner's dispatch or the scheduled workflow. It doesn't gate the merge.

### 7. The existing gates

- **Material X, all browser, spec and node projects in Chromium, Firefox and WebKit** (`MX_TEST_ENGINES=chromium,firefox,webkit vitest run`): 61 files, 1,338 passed, 1 expected fail and 4 skipped. This includes `list-item.browser.test.ts`, whose focus rows pass in Firefox without `FocusForwarding`, `focus-forwarding.browser.test.ts`, and `traits-baseline` with property 7's change.
- **Root `aube exec just test`** (Chromium): 148 files, 2,368 passed. This includes core's reorderable rows.
- **Root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations`:** passed.
- **In `packages/material-x`, on every changed file:** `just fmt`, `just lint-fix`, `just fmt` and `just lint` passed. The only output is ESLint's five _"File ignored"_ warnings for the HTML and CSS files, for which no linter is configured. `just typecheck` passed. `oxfmt` formatted the guide, the probe and this report. `git diff --check` is clean. Links were checked by resolving each relative path.

### 8. Sizes

Brotli bytes, from `aube exec just size-reading` on each build ([reading](checks/list-sizes.txt)).

**Two figures, because the build renames private custom properties in the order it finds them.** The branch and `main` have the same 227 properties, but the branch's two new stylesheets change the order, and 92 get a different short name. That moves rows the branch doesn't touch: `text-field/text-field` +27, `button/icon-button` +22. So the branch was also built with `main`'s name list, which isolates the change.

| Row | `main` | Branch | Difference | Branch, `main`'s names | Difference |
| --- | --- | --- | --- | --- | --- |
| `list/list` | 3,673 | 3,670 | −3 | 3,673 | 0 |
| `list/list-item` | 2,567 | 2,586 | +19 | 2,601 | +34 |
| `list/list-button-item` | 4,575 | 4,581 | +6 | 4,562 | −13 |
| `list/list-link-item` | 4,746 | 4,757 | +11 | 4,778 | +32 |
| `complete` | 16,975 | 17,050 | +75 | 17,060 | +85 |

- **No row grows by more than 150 B,** in either figure.
- **The control row holds:** with `main`'s names, `list/list` and every row outside the list are unchanged.
- `list/list-item` is within the estimate of +30 to +100 B. `complete` is within its estimate of +50 to +150 B.
- `list/list-button-item` ends below `main`, as estimated: it gains the four resets and loses `FocusForwarding`. `list/list-link-item` grows by 32 B on the same change. The reading doesn't say why the two differ.

## Focus in a static item

**In `mx-list`, a static item takes no focus**, as on `main`. A consumer's `tabindex` on its host makes the host a tab stop. The owner answered (a), so the item doesn't suppress it, and the host is its `listitem` (proof 3). There is no `.host` in a static item any more. **Interactive items keep focus on their `.host`,** the `<button>` or `<a>`, reached through `delegatesFocus` in every engine.

## Stopping point

The unit stops at the pull request. The architect dates `RF-68` from this report. Open:

- proof 6, Safari, until a Safari run reads it;
- `RD-31`'s follow-up on #90, which adapts to this unit after it lands.
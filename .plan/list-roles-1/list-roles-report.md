# Report: each list item is exposed as a list item (`RF-68`)

**Input:** `material-x/list-roles-1` at `709e9fb55`. That is the [handoff](list-roles-handoff.md)'s [On top of `RD-31` (#90)](list-roles-handoff.md#on-top-of-rd-31-90) and its ruling [The rise in WebKit, ruled](list-roles-handoff.md#the-rise-in-webkit-ruled), over the step-1 merge `7b90a846f` of `origin/main` at `73f081dc4`. **Governing records:** `RF-68` in [`../00-index.md`](../00-index.md), the handoff's decisions 1 to 4 and properties 1 to 9 as re-planned, `RD-31` with its seventh amendment (`75ba6bf5b`), `RD-24`, [`accessibility.md`](../../.agents/docs/accessibility.md#list) and [the `.host` invariant](../../.agents/docs/architecture.md#components-ydinjsmaterial-x). All local readings are in Playwright 1.65.0's builds: Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2.

**Outcome: the unit is implemented on top of `RD-31`.** Step 2 stopped once: the lift's rise stayed instant in WebKit with the `transition` rule. The architect ruled the stop at `709e9fb55`, and the ruling is implemented. Proofs 1, 2, 3, 5, 7 and 8 hold. Proof 4 holds for the layout and the pixels, but its `fold-cascade.ts` rerun can't run on this build ([below](#4-the-layout-and-the-pixels)). Proof 6 waits for a Safari run. `@ydinjs/drag` and `@ydinjs/core` don't change.

The earlier report, for the fold before #90, is this file at `709e9fb55`.

**Updated 2026-11-21 for the feature proof on `RD-31`,** at `d1df5e19d`: [the fix for `reviewer-1`](#the-fix-for-reviewer-1), as the handoff's [ruling](list-roles-handoff.md#the-proof-on-rd-31-reviewer-1-ruled) states, and `reviewer-2`'s two corrections, in [proof 2](#2-the-structure-and-the-lift-in-every-engine-of-the-gate) and [proof 8](#8-sizes).

## The fix for `reviewer-1`

**A value is the item's from its write until anyone else writes or removes that attribute on that element.** From then on it's the consumer's, and the item never removes it. This holds on a handle, an interactive item's control and a static host (`sortable-item.ts`).

- **The mechanism:** one `MutationObserver` per sorted item, with an `attributeFilter` of the claimed names (`tabindex`, `role`, `aria-label` and `aria-description`). It observes the control and the current handle.
  - The item runs its own writes and removals inside one function. That function first takes the pending records, which are another writer's, and drops ownership of each recorded name on its element. After the writes it takes the records again and discards them, so they are the item's own.
  - The observer's callback drops ownership in the same way for the records it receives.
  - When the handle changes, the observer is disconnected and observes the control and the new handle. At the release, the pending records are applied first, then the item removes what it still owns, and the observer is disconnected. So a write in the same task as the release is the consumer's, and nothing observes the elements after the release.
- **`touch-action`** is an inline style, which the observer doesn't see. The item removes it only if it is still `none`, the item's value, so a consumer's write of the same value isn't told apart. The comment says so.
- **A consumer's removal** is a record too, so the item stops owning the attribute and doesn't write it again until its next update.
- **The comments** on `claim` and `sortItem` state the rule. `accessibility.md`'s list section says that a value anyone else writes or removes, at any time, is the consumer's. `mx-sortable-list`'s and `mx-list-item`'s JSDoc name no time, so they already state the rule, and they don't change.

**The rows,** in `sortable-list.browser.test.ts` › _values a consumer writes after the claim_. Each starts with the item's claim:

- a handle's `aria-label` written by the consumer, then the handle is removed: the handle keeps `aria-label` and nothing else of the item's;
- the host's `tabindex="-1"` and `aria-description`, then a move into `mx-list`: both stay;
- the host's `tabindex="0"`, the item's own value, then a handle: `tabindex="0"` stays, and the item's description goes;
- the host's `tabindex="0"`, then a move into `mx-list`: `focus()` reaches the host and Tab stops on it;
- the host's `tabindex="0"` written in the same task as the item leaves the list: it stays;
- a button item whose host gets `aria-description="Mine"`, which useARIA forwards to the control, then leaves the list: the control keeps `Mine`;
- the same button item, then a handle instead: the control keeps `Mine`. This row releases the control's record without a reconnect, because a reconnect makes useARIA forward the host's `aria-*` again;
- the consumer removes the host's `tabindex`, then the item moves into `mx-list`: the item doesn't write it again, and the host ends with neither attribute.

`MX_TEST_ENGINES=chromium,firefox,webkit`: `sortable-list.browser.test.ts` passes 228 rows, 76 in each engine, the existing rows included.

**The mutation** (proof 5): `disown` iterates no record, so the release removes every recorded name again ([output](checks/mutations-reviewer-1.txt)). In each engine, six of the eight rows fail: the handle's, both `mx-list` cases, the handle on the host, the same-task write and the button item's handle. **Two rows don't fail under it.** The button item that leaves the list passes because the reconnect forwards the host's `aria-*` again. The consumer's removal passes because the item's removal of an absent attribute changes nothing. Both rows read the rule's outcome, and neither observes the record. After the revert, all 228 rows pass.

**Gates:** material-x in Chromium, Firefox and WebKit passes 1,630 rows, with 1 expected fail and 4 skipped. The root `aube exec just test` passes 2,517 rows. Root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations` pass, and so do `fmt`, `lint-fix`, `fmt` and `lint` on the two changed files.

**Sizes** ([reading](checks/list-sizes-reviewer-1.txt)), Brotli, against `de24d50d5`: `list/sortable-list` 8,548 → 8,686 (+138), under `RD-31`'s 9,600 B. `complete` 22,198 → 22,379 (+181). `list/list`, `list/list-item`, `list/list-button-item`, `list/list-link-item` and every row outside the list are unchanged.

## What changed

**Step 1, the merge `7b90a846f`** of `origin/main` (`73f081dc4`), resolved to the handoff:

- `ListItemCore.ts` has `RD-31`'s body, its context consumer and its slot observers. It also has this unit's role, optional template and shared content. The context's value gets the item's host and its control: the template's `.host` in an interactive item, and the host itself in `mx-list-item`.
- `list-item.ts` keeps this unit's version, with no `FocusForwarding`, no `delegatesFocus` and no `impl` part. It adopts the focus stylesheet after `static-box.css.ts`. Its JSDoc says that a `tabindex` set on the item stands, in either list.
- `traits-baseline.json` is regenerated. Against `73f081dc4`, only the three list items' `FocusForwarding` entries change.
- `00-index.md` has both sides, with `RF-68` before `RF-69`. `.plan/list-sortable-1/probes/list-a11y.ts` is `main`'s copy.

**Step 2:**

- **`sortable-list.ts`:** the `visual` callback goes, so drag lifts the item itself. `onStart` reads the item's computed `--_level` before it sets the `drag` state. This is one style read per activation, with a one-sentence comment, as [the ruling](list-roles-handoff.md#the-rise-in-webkit-ruled) says. The JSDoc states what a drag does to the item element. It carries `popover="manual"` and matches `[popover]` and `:popover-open`. The lift keeps the item's size, position, padding, border, overflow, color and background color. A page's popover rule that sets other properties applies while the item is lifted. A consumer's `tabindex` on a static item stands.
- **`sortable-item.ts`:** a static item's tab stop and description go on its host, through the same claim record as a handle and an interactive item's control. A value the consumer set stays, and only what the item wrote is removed. A static item is recognized by its control being its host. The module's comment says that a static item's host is its control, and that an interactive item writes nothing on its host.
- **`static-box.styles.css`:** the host's padding and `overflow: visible` go. The spacing is now margins of `.lead`, `.content` and `.trail`. Each takes the block space. The leading space goes on `.lead`, and on `.content` when `.lead` isn't slotted. The trailing space goes on `.trail`, and on `.content` when `.trail` isn't slotted. A one-sentence comment says why. `:host(:focus-visible)` has the shared focus rule's declarations.
- **`interactive-box.styles.css`:** the four `:host` lift resets and their comment go.
- **`main.styles.css`:** `:host(:popover-open) { transition: --_level … !important }`, with a comment. The comment on `--md-list-item-leading-space` and `--md-list-item-trailing-space` says that they set an item's inline spacing.
- **`accessibility.md`, the list section:** in `mx-sortable-list`, a handle-less `mx-list-item` takes focus on its host, which is its `listitem`. The item writes `tabindex` and the description only where the consumer hasn't set them. The focus indicator draws on `:host(:focus-visible)`. The section links the rerun reading.
- **Tests:** see proofs 2 and 7.

## After merging `main` at `71a516e92` (#106)

**Merged 2026-11-21 at `82b0bab46`.** #106 removes core's attribute operator, `$`, `$$` and `define()`. Each conflict is resolved to this unit's behavior, written with `main`'s API:

- `ListItemCore.ts`: the optional template's `.host` is found with `host.shadowRoot!.querySelector`;
- `sortable-list.ts`: no `visual` callback, as in step 2;
- `focus-forwarding.browser.test.ts`: the single `mx-button` subclass row, with `shadowRoot.querySelector`;
- `sortable-list.browser.test.ts`: `visualOf` falls back to the host with `shadowRoot.querySelector`.

`list-roles.browser.test.ts`, which only this branch has, used `$`, and now uses `shadowRoot.querySelector`. `sortable-item.ts` uses only the DOM's own attribute methods. The gates pass: material-x in Chromium, Firefox and WebKit has 1,630 passed, 1 expected fail and 4 skipped, and the root `aube exec just test` has 2,508 passed. Root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations` pass too.

**Sizes against `main`** ([reading](checks/list-sizes-main-106.txt)), Brotli, with `main`'s private-property names: every row outside the list, and `list/list`, equals `main`'s. `list/list-item` is −14, `list/list-button-item` −8, `list/list-link-item` +21, `list/sortable-list` +103 (8,695 B, under 9,600 B) and `complete` +210. With the merge's own names, rows outside the list move by −11 to +31 B, which is the renaming of 92 private properties.

## Proofs

### 1. The Chromium tree, in CI

`list-roles.browser.test.ts` › _Chromium's accessibility tree_ is unchanged and passes. The root is `list`, with 5 `listitem` nodes below it, and each button and link is inside its item with its role and name.

### 2. The structure and the lift, in every engine of the gate

The structure rows are unchanged and pass. Every row below passes in Chromium, Firefox and WebKit (`MX_TEST_ENGINES=chromium,firefox,webkit`, 119 passed and 4 skipped in `list-roles.browser.test.ts`).

**The lift rows,** for `mx-list-item` and `mx-list-button-item`, now run in `mx-sortable-list`. Real pointer input presses the item's center, moves 12 px past the threshold, and moves back to the grab point while the button stays down. Drag's lift then holds the host.

- the host matches `:popover-open`;
- the list's height and the next item's top are unchanged;
- the host's rect and its computed `padding`, `overflow`, `color` and `background-color` equal their values before the lift. This holds with no page rule, and with `[popover] { padding: 16px; background: red; overflow: auto; color: blue }`. For the static item it also holds with the consumer's `#s { padding-inline: 24px; background-color: rgb(0, 0, 255) }`;
- after the pointer is released, the host has no `popover` attribute.

**The reset row:** `*, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid }`. It covers an item with one, two or three lines, and an item with only a label, only a lead or only a trail. For each, the item's box in a 360 px list and the boxes of its `.lead`, `.content` and `.trail` in the item equal the reading without the rule.

**The rise row,** for `mx-list-item` and `mx-list-button-item` in `mx-sortable-list`. Rest is 0, the raised value read from `--_container-elevation` is 8, and the first `--_level` reading above rest is below 8. The ruling asks for the value one frame after `onStart`. In Chromium, Firefox and WebKit that value can still be 0, before the transition's first tick (see the [reading](checks/lift-rise.txt), whose `state` column is 0 in each engine). So the row waits for the first frame that has left rest and asserts that the level hasn't jumped. **Corrected 2026-11-21 on `reviewer-2`:** this said _"In WebKit that value can still be 0"_, but the reading shows it in all three engines.

**The new tab stop row:** an `mx-list-item` with a consumer's `tabindex="0"` in `mx-list` is reached by Tab.

### 3. Three engines' trees, by the committed probe

[`probes/list-roles.ts`](probes/list-roles.ts), variant `main`, on this build: [reading](checks/list-roles-on-rd31.txt). In Chromium, Firefox and WebKit, each of the five items is a `listitem` whose parent is the list, and each button and link is inside its item. In WebKit, each slotted node's parent is a slot inside its item. The host with `tabindex="0"` is a `listitem` and a tab stop, with no node of its own. **Properties 1 and 3 hold.**

[`probes/list-lift.ts`](probes/list-lift.ts), mode `none`: [reading](checks/list-lift-on-rd31.txt). 192 → 204 in each engine. The mode lifts an interactive item's inner `.host`, which nothing on the branch lifts, because drag lifts the host. Proof 2's lift rows read the branch's lift.

**`RD-31`'s accessibility probe,** rerun on this build: [`../list-sortable-1/checks/list-a11y-roles.txt`](../list-sortable-1/checks/list-a11y-roles.txt). In Chromium, the focused handle-less static item is `MX-LIST-ITEM`: role `listitem`, name _"Sortable static without handle"_, description _"Use the arrow keys to move"_. The CDP tree has one `listitem` per item and no node around it.

### 4. The layout and the pixels

[`probes/list-layout.ts`](probes/list-layout.ts) with `--png`, on [`73f081dc4`'s build](checks/list-layout-on-rd31-main.txt) and [this one](checks/list-layout-on-rd31-branch.txt). **The readings are equal in all three engines:** `diff` of everything after the headers is empty. **The six screenshots are byte-equal** (`cmp`) at elevation level 0 and 6 in each engine.

**`probes/fold-cascade.ts` doesn't run on this build.** It reads `padding-block` from the built `static-box.css.js` to emulate the spacing fix, which this build has, so the read throws before any page opens. Its lift section also drives core's reorderable trait, which #90 deleted. Two parts of its reading are now proof 2's rows, in every engine: the reset section's boxes, and the lift section's kept values under the popover rule and the consumer's rule. **The reset section's screenshots under the universal reset have no rerun.** The reset row reads the boxes, not the pixels.

### 5. Mutations

Each mutation was applied, run on `list-roles.browser.test.ts` in Chromium, Firefox and WebKit, and reverted. The unmutated file and the file after every revert pass ([output](checks/mutations-on-rd31.txt)).

| Mutation | Fails |
| --- | --- |
| `{ role: 'listitem' }` replaced by `{}` in `useCore`'s call | Proof 1's two Chromium tree rows. Proof 2's rows don't observe the role, as the earlier report found. |
| Drag's `UA_PROPS` emptied in `packages/drag/src/lift.ts`, with drag rebuilt, then restored and rebuilt | The kept-values rows in each engine: the static item under each rule, the button item under no rule and under the popover rule. The static item also fails with no page rule, because its host no longer sets `overflow: visible`, so the UA's `overflow: auto` applies |
| The `:host(:popover-open)` transition rule removed | Both rise rows in each engine |
| `onStart`'s style read removed | Both rise rows in WebKit only |
| `mx-list-item`'s spacing on its host's padding again, with the margins zeroed | The six reset rows in each engine |

### 6. Safari

Not run. Safari runs only through the owner's dispatch or the scheduled workflow. It doesn't gate the merge.

### 7. The existing gates

- **Material X, every project in Chromium, Firefox and WebKit** (`MX_TEST_ENGINES=chromium,firefox,webkit aube exec just test` in `packages/material-x`): 71 files, 1,606 passed, 1 expected fail and 4 skipped. This includes #90's `sortable-list.browser.test.ts` with the static-item rows on the host, `package-entries.node.test.ts`, and `traits-baseline`.
- **`sortable-list.browser.test.ts`'s static rows,** amended. Tab, Shift+Tab, `item.focus()`, and the focus after a keyboard move are on the host. The host has `tabindex="0"` and the description, and loses both when the item gains a handle, leaves the list or moves into `mx-list`. In a sortable list the host carries those two attributes and nothing else. A consumer's `tabindex="-1"` and `aria-description` stay through every one of those changes. The nested `mx-list`'s static item has no attribute.
- **Root `aube exec just test`** (Chromium): 152 files, 2,509 passed, and no type errors.
- **Root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations`:** passed.
- **In `packages/material-x`, on every changed file:** `just fmt`, `just lint-fix`, `just fmt` and `just lint` passed. The only output is ESLint's _"File ignored"_ warnings for the three CSS files, for which no linter is configured. `just typecheck` passed.

### 8. Sizes

Brotli bytes. The base is `aube exec just size-reading` on `73f081dc4`, the merge's parent from `main`, read before any step-2 change ([reading](checks/list-sizes-on-rd31.txt)). As in the earlier report, the branch's new stylesheets change the order of the 227 private custom properties, and 92 get a different short name. So the branch is also measured with the base's name list.

| Row | Base | Branch | Difference | Branch, base names | Difference |
| --- | --- | --- | --- | --- | --- |
| `list/list` | 685 | 686 | +1 | 685 | 0 |
| `list/list-item` | 2,828 | 2,789 | −39 | 2,803 | −25 |
| `list/list-button-item` | 4,667 | 4,664 | −3 | 4,654 | −13 |
| `list/list-link-item` | 4,885 | 4,883 | −2 | 4,865 | −20 |
| `list/sortable-list` | 8,605 | 8,548 | −57 | 8,549 | −56 |
| `complete` | 22,092 | 22,198 | +106 | 22,192 | +100 |

- **No row grows by more than 150 B.** `list/list-item` reads 2,803 B, under 3.1 kB, and `list/sortable-list` reads 8,549 B, under 9.6 kB. `list/list` gains no module.
- **The control rows hold:** with the base's names, `list/list` and every row outside the list are unchanged. The drag, core and box-quad rows are unchanged in both figures.
- Each list row is within its estimate. **`complete` is +106 B in the build's own figure, 6 B over its estimate of −150 to +100 B,** and +100 B with the base's names. It carries the box rule twice, under `:host` and under `.host`, and the spacing margins, while each item row carries only its own stylesheet. The reading doesn't break the difference down further. **Corrected 2026-11-21 on `reviewer-2`:** this said _"`complete` is at the top of its estimate"_, which holds only for the figure with the base's names.
- **After the fix for `reviewer-1`,** `list/sortable-list` is 8,686 B and `complete` 22,379 B: [above](#the-fix-for-reviewer-1).

### The lift's rise

The handoff asked for the rise to be read first, in each engine. The host's computed `--_level` is read per frame after the `drag` state, for `mx-list-item` and `mx-list-button-item`, with a duration of .65s ([reading](checks/lift-rise.txt), [probe](probes/lift-rise.browser.test.ts)):

|  | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| No rule, no read | 8 at once | 8 at once | 8 at once |
| The rule, no read | 0, 0.67, 1.35, 2.0 … | 0, 0.65, 1.35, 1.99 … | 8 at once |
| The rule and the read (the branch) | 0, 0.67, 1.35, 2.01 … | 0, 0.66, 1.35, 1.99 … | 0.24, 1.17, 2.01, 2.36 … (static), 0, 0.65, 1.49, 2.05 … (button) |

So the rule was added, and the stop and its ruling added the read. On `73f081dc4` the host isn't lifted, and the rise runs over the duration in each engine.

## Focus in a static item

**In `mx-sortable-list`, a handle-less `mx-list-item` takes focus on its host,** which is its `listitem`. It has no `.host`. In `mx-list` it takes no focus unless the consumer gives it a `tabindex`, which stands in either list. **Interactive items keep focus on their `.host`,** the `<button>` or `<a>`, reached through `delegatesFocus` in every engine, and nothing is written on their host.

## Stopping point

The unit is finalized with the pull request, #99. The architect dates `RF-68` from this report. Open:

- proof 6, Safari, until a Safari run reads it;
- the reset section's screenshots under a universal reset, which `fold-cascade.ts` read and which have no rerun on this build (proof 4).
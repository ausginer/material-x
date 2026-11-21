# Report: each list item is exposed as a list item (`RF-68`)

**Input:** `material-x/list-roles-1` at `45272694c`, which carries the [handoff](list-roles-handoff.md), merged with `origin/main` at `640658b5c` in `afca2d68f`. **Governing records:** `RF-68` in [`../00-index.md`](../00-index.md), `RD-31`'s ruling, `RF-33`, `RD-24` and [`accessibility.md`](../../.agents/docs/accessibility.md#list), as the handoff lists them. All local readings are in Playwright 1.65.0's builds: Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2.

**Outcome: the decision is implemented, and no stop condition was met.** Proofs 1 to 5, 7 and 8 hold. Proof 6 waits for a Safari run. The only failure in any run is drag's `DRI-17` allocation row in the Chromium root run, which this branch doesn't touch (§Proof 7).

| Commit | Content |
| --- | --- |
| the commit carrying this report | The row in the templates and its rule, the Chromium tree command, the tests, the accessibility guide, the layout probe, the readings and this report |

## What changed

- **`list-item.tpl.html`:** `role="listitem"` on the `.host`, which is the static item's row.
- **`list-button-item.tpl.html` and `list-link-item.tpl.html`:** a `<div class="row" role="listitem">` around the `<button>` or `<a>` `.host`. The `.host` keeps `part="impl"` and every job it had. `ListItemCore.ts` and `ListInteractiveItemCore.ts` don't change, because `$(host, '.host')` still finds the control.
- **`styles/item/main.styles.css`:** `.row:has(> .host:popover-open) { display: contents; }`, with one comment saying why. The row has no other rule, so it draws nothing: a `div`'s block box with no padding, border, margin or background.
- **`tests/support/accessibility-commands.node.ts`:** `readAccessibilityTree(selector)`, a Playwright-only command that reads Chromium's tree through CDP `Accessibility.getFullAXTree`, for the frame that runs the test. It finds that frame by its URL in `DOM.getDocument` with `pierce: true`. Its node is `{ role, name, children }`, with ignored nodes left out and text nodes dropped. It is registered in `commands.node.ts` and declared in `browser-commands.ts`.
- **`tests/list/list-roles.browser.test.ts`:** proofs 1 and 2, and a Tab row for property 3.
- **`accessibility.md`, the list section:** where `listitem` sits and why, what the tests check, and WebKit's split of slotted nodes as a noted limit, read in Playwright's WebKit. The old _Missing requirements_ entry is resolved. The `tabindex` host's own node (handoff finding 3) is stated in its place.

No public surface changes: no part, attribute, property, event, slot, export or type (property 7). `traits-baseline` passes unchanged.

## Proofs

### 1. The Chromium tree, in CI

`list-roles.browser.test.ts` › _Chromium's accessibility tree_ reads a list with a static item, a button item, a disabled button item, a link item and a disabled link item.

- _"should expose one listitem per item, in DOM order, below the list"_: the root is `list`, and there are 5 `listitem` nodes reached from it through `generic` nodes only.
- _"should keep each item's content and control inside its listitem"_: each `listitem`'s children are `generic ""` for the static item, `button "Item 1"`, `button "Item 2"`, `link "Item 3"` and `link "Item 4"`.

The block is `describe.runIf(server.browser === 'chromium')`, with the reason written above it: Playwright opens a CDP session only in Chromium, and the other engines' trees are read by the probe.

### 2. The structure, in every engine of the gate

In Chromium, Firefox and WebKit, for `mx-list-item`, `mx-list-button-item` and `mx-list-link-item`, enabled and disabled:

- exactly one `[role="listitem"]` in the shadow tree;
- it is a child of the shadow root and contains the `.host`, or is the `.host` for `mx-list-item`;
- the host has no `role` attribute.

**The lift row,** for the button item and the link item: in a list with a 12 px gap, the row applies the steps of core's reorderable trait to `.host`. It puts a footprint of the control's size before the item, pins the control at its rect, and shows it as a manual popover. The list's height and the next item's `.host` top are then unchanged: 192 px and 160 px.

**The Tab row** (property 3): with a button item, a disabled link item and a link item, followed by a button, three Tabs reach the button item's `<button>`, the enabled link item's `<a>` and the button, in that order.

`MX_TEST_ENGINES=chromium,firefox,webkit vitest run --project 'browser*' tests/list/list-roles.browser.test.ts`: 56 passed and 4 skipped. The skipped rows are the two Chromium tree rows in Firefox and WebKit.

### 3. Three engines' trees, by the committed probe

[`probes/list-roles.ts`](probes/list-roles.ts), variant `main`, on the branch's build: [reading](checks/list-roles-branch.txt).

| Engine | Each item | Its control |
| --- | --- | --- |
| Chromium | `listitem` on `div.host` or `div.row`, under a `generic` host, under the list | `button "Button item"` and `link "Link item"` inside their `listitem` |
| Firefox | `listitem` directly under the list, named from its content | the same |
| WebKit | `listitem` on `div.host` or `div.row`, whose parent is the list | `button` and `link`, whose parent is `div.row` |

- **Property 1 and property 3 hold in all three engines.**
- **Tab order** is `span | #b > button | #a > a | #after | body | span` in each engine, as in the architect's `main` reading.
- **WebKit, as recorded and not repaired:** the slotted label text and the handle `span` have the list as their parent, as on `main` (handoff finding 1). The host with `tabindex="0"` (`#s3`) has a `group` node under the list (finding 3).

[`probes/list-lift.ts`](probes/list-lift.ts) on the branch's build: [reading](checks/list-lift-branch.txt). Its `none` line reads the built package as it is, which now has the real row and its rule. In each engine, the list stays at 192 px and the link's top stays at 144 px while the button item's control is lifted. The probe's `wrapper` and `collapse` lines add its own wrapper inside the real row. That moves `.host` out of the row's direct children, so those two lines don't describe the branch.

### 4. The layout reading

[`probes/list-layout.ts`](probes/list-layout.ts) is new: a list with a 12 px gap and an inline size of 360 px, holding one-, two- and three-line items of each kind with lead and trail content, and a disabled button and link item. It prints the list's rect and each item's `.host` rect in each engine. The readings are on [`main`'s build](checks/list-layout-main.txt) (the source of `640658b5c`, at the merge) and on [the branch's build](checks/list-layout-branch.txt). **They are equal in all three engines**: `diff` of the two readings without their headers is empty. The list is `0 0 360 880` in each.

### 5. Mutations

Each was run in the list-roles file and then reverted.

| Mutation | Result |
| --- | --- |
| `role="listitem"` removed from `list-button-item.tpl.html` | In Chromium, 6 rows failed: the two structure rows for the enabled and the disabled button item, twice each, and both tree rows (proof 1 and proof 2) |
| The `display: contents` rule removed | Both lift rows failed in Chromium, Firefox and WebKit: `[204, 172]` against `[192, 160]`, one 12 px gap, as in handoff finding 4 |

**One slip, repaired:** the first mutation was reverted with `git checkout`, which restored the committed template without the row. The next run caught it, as 14 failures in the button item's structure rows. The template was rewritten, and the clean file then passed 53 of 53 in the three engines, with 4 skipped, before the second mutation ran. The first mutation's reading was taken before the revert, so it stands.

### 6. Safari

Not run. Safari runs only through the owner's dispatch or the scheduled workflow. It doesn't gate the merge.

### 7. The existing gates

- The root `fmt-check`, `lint`, `typecheck` and `typecheck-declarations`, the gate's `static` steps, passed.
- In `packages/material-x`, on the changed `.ts` files: `just fmt`, `just lint-fix`, `just fmt` and `just lint` passed with no diagnostics. The HTML and CSS files get only ESLint's _"File ignored because no matching configuration was supplied"_ warnings, because no linter is configured for them. `just typecheck` passed. `oxfmt` formatted the guide and the probe. `git diff --check` is clean. Links were checked by resolving each relative path.
- **Root `aube exec just test`, Chromium:** 2,362 passed and 1 failed of 2,363. The failure is `|shipped/drag (chromium)| tests/hot-path.browser.test.ts:261`, `DRI-17` › _"should allocate per sample only the CSS string a lifted write needs"_, at 24.99 B per move, with `kernel/session.ts:handleEvent` at 7,496 B. That is `drag:DRF-53`, which PR #94 repairs and which isn't on `main` yet. This branch has no change under `packages/drag`.
- **Firefox,** as the gate runs it (`--project '*/firefox' --tags-filter '!measurement'`): 1,779 passed, 1 expected fail and 20 skipped.
- **WebKit,** the same: 1,780 passed and 20 skipped.

These runs include `list-item.browser.test.ts`, `focus-forwarding.browser.test.ts`, core's reorderable rows and `traits-baseline`. The root runs were taken before the Tab row was added. That row was then run alone in the three engines (§Proof 2).

### 8. Sizes

`aube exec size-limit --json` in `packages/material-x`, after `just build`, in Brotli bytes. The before figures are at `afca2d68f`, the branch after the merge with `main`, before any change. `complete` there is 16,975, not the handoff's 16,929, because `main` moved.

| Row                     | Before | After  | Difference |
| ----------------------- | ------ | ------ | ---------- |
| `list/list`             | 3,673  | 3,673  | 0          |
| `list/list-item`        | 2,567  | 2,593  | +26        |
| `list/list-button-item` | 4,575  | 4,610  | +35        |
| `list/list-link-item`   | 4,746  | 4,803  | +57        |
| `complete`              | 16,975 | 16,983 | +8         |

- **No row grows by more than 150 B.** Every other row is unchanged.
- `list/list-item` grows more than the estimated few bytes: +26 for one attribute. `list/list-link-item` grows a little near the top of the 30 to 60 B estimate.

## Focus in a static item

**Nothing here changes it.** On this branch, as on `main`, a static item doesn't take focus. In the probe's tab order, the first stop is the handle `span` in the first static item's trail, not the item. A host with `tabindex="0"` takes no focus in any engine (handoff finding 3). The element that `RD-31`'s ruling makes take focus is the static item's `.host`. That `.host` is the row and carries `role="listitem"`, so once `RD-31` lands, a focused static item is a list item. Interactive items keep focus on their `.host`, the `<button>` or `<a>`, inside the row.

## Stopping point

The unit stops at the pull request. The architect dates `RF-68` from this report. Open:

- proof 6, Safari, until a Safari run reads it;
- drag's `DRI-17` row, which fails the local Chromium root run until PR #94 lands.

**Scratch work:** the worktree, the run logs and the size readings are in this session's scratchpad. They are removed when the unit is handed off.
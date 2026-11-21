# Feature proof: each list item is exposed as a list item (`RF-68`), PR #99

**Read at** `1deacdc54` on `material-x/list-roles-1`, against the [handoff](../../list-roles-1/list-roles-handoff.md) and the [report](../../list-roles-1/list-roles-report.md), both at `1deacdc54`, and `RF-68` in the [register](../../00-index.md). The branch's base on `main` is `640658b5c`. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-21. Everything ran in a worktree at `1deacdc54`, in Playwright 1.65.0's Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2, with Node 26.13.1.

**Scope:**

- **Covered:** required properties 1 to 9, proofs 1 to 5, 7 and 8, the new `readAccessibilityTree` command, and the `accessibility.md` change.
- **Rerun, not taken from the report:**
  - `list-roles.browser.test.ts` in three engines, and both mutations, with the role removed from the link item rather than the button item;
  - the lift row pinned to 192 / 160 on the branch and on `main`'s list sources ([tests, mutations, sizes](checks/tests-mutations-sizes.txt));
  - `probes/list-roles.ts`, `probes/list-lift.ts` and `probes/list-layout.ts`, on the branch's build and, for the layout, on `main`'s ([trees and layout](checks/trees-layout.txt));
  - sizes on both builds;
  - the existing list, `focus-forwarding` and `traits-baseline` tests in three engines, and material-x's `typecheck`.
- **Probe of this pass:** [`part-layout.browser.test.ts`](probes/part-layout.browser.test.ts) ([transcript](checks/part-layout.txt)). It reads a consumer's flex-item property on `::part(impl)`, and a disabled item's hit target and click path, on the branch and on `main`'s sources.
- **Not rerun:** the root `aube exec just test`, `fmt`, `lint`, and core's reorderable rows. Core's source isn't changed. `RD-31`'s sortable list is out of scope.
- **Deferred by the owner, as the coordinator relayed:** proof 6, Safari.

**Verdict:** the unit implements the decision. Properties 1 to 6, 8 and 9 hold, and so does property 7 as written. Proofs 1 to 5, 7 and 8 reproduce. One finding, Tier A, is routed to the architect: an interactive item's `::part(impl)` is no longer a flex item of the list (`reviewer-1`). In my view it doesn't block the merge, but whether it is acceptable is the architect's call.

## Properties

| # | Holds | Evidence |
| --- | --- | --- |
| 1 | Yes, in three engines | Chromium: `list-roles.browser.test.ts:178` passes, and `listItemsBelow` (`:56`) descends through `generic` only. Firefox and WebKit: the probe reading matches the committed [`list-roles-branch.txt`](../../list-roles-1/checks/list-roles-branch.txt) line for line. There are five `listitem` nodes in DOM order, and each one's nearest ancestor that isn't `generic` is the list ([trees](checks/trees-layout.txt)) |
| 2 | Yes | `list-item.tpl.html:1` and `list-button-item.tpl.html:1` and `list-link-item.tpl.html:1` carry `role="listitem"`. No `internals(host).role` is set in `ListItemCore.ts` or `ListInteractiveItemCore.ts`. Tested at `list-roles.browser.test.ts:71`, `:79` and `:89` in three engines |
| 3 | Yes | The control is inside its `listitem` in all three trees, with its role and name kept (`button "Button item"`, `link "Link item"`). Tab order is `span \| #b > button \| #a > a \| #after \| body \| span` in each engine, identical to the architect's `main` reading in [`list-roles.txt`](../../list-roles-1/checks/list-roles.txt) at lines 27, 54 and 84. The Tab row (`:97`) skips the disabled link item. `focus()` and the `aria-*` forwarding hold by construction: `useARIA(host, target)` and `useFocusForwarding(host, target)` (`ListInteractiveItemCore.ts:58-59`) take the element that `$(host, '.host')` finds (`ListItemCore.ts:78`), which is the same control. `list-item.browser.test.ts`'s focus rows pass. No new row tests `aria-*` |
| 4 | Yes | No focus code changes. The static item's row is its `.host` |
| 5 | Yes | The layout reading on `main`'s build equals the branch's in three engines, and `main`'s equals the committed [`list-layout-main.txt`](../../list-roles-1/checks/list-layout-main.txt). `.row` has no rule except the lift rule (`main.styles.css:89`) |
| 6 | Yes | The lift row is `[192, 160]` before and during the lift, on the branch and on `main`'s sources, in three engines. `useReorderableItem(host, target)` is unchanged (`ListItemCore.ts:83`). The row's steps match core's `reorderable.ts` (footprint at `:247-261`, pin at `:298-311`, popover at `:324-325`) |
| 7 | Yes, as written | Nothing is added or removed, and `part="impl"` is on the same elements. See `reviewer-1` for the part's layout context |
| 8 | Yes | `accessibility.md` §List states the row, why it isn't the host, the lift rule, the tests, and WebKit's split as `[Docs]` |
| 9 | Yes | The CSS comment (`main.styles.css:85-88`) is one sentence and says why. No finding id appears in the added source, test or guide lines |

## Proofs

1. **Chromium tree in CI: holds.** `describe.runIf(server.browser === 'chromium')` is at `list-roles.browser.test.ts:169`, with the reason above it.
2. **Structure in three engines: holds.** 56 passed and 4 skipped, as reported.
3. **Three engines' trees: holds.** The tree reading is identical to the committed one. The lift probe's `none` line is 192 → 192 and the link's top is 144 → 144 in each engine. The `wrapper` and `collapse` lines nest the probe's own wrapper in the real row, as the report says.
4. **Layout: holds.** `diff` of `main`'s build and the branch's build is empty in three engines.
5. **Mutations: both fail, and both are reverted.**
   - **The role removed from `list-link-item.tpl.html`:** 14 rows fail. They are both Chromium tree rows, plus the link item's two structure rows, enabled and disabled, in Chromium, Firefox and WebKit.
   - **The lift rule's selector renamed:** 6 rows fail. They are both lift rows in each engine, at `[204, 172]` against `[192, 160]`.
   - The worktree was clean after each revert.
6. **Safari: deferred by the owner,** as the coordinator relayed. Not a gap of this proof.
7. **Existing gates: hold for what I reran.** 134 passed and 4 skipped, in 12 files, and `typecheck` passed. The branch changes no file under `packages/drag`, so the report's `DRI-17` failure, at 24.99 B per move, isn't this unit's. That is the flake that #94 repairs. It is on `main` at `bd1dee7df`, and this branch's base predates it.
8. **Sizes: hold.** The figures are `list/list` +0, `list/list-item` +26, `list/list-button-item` +35, `list/list-link-item` +57 and `complete` +8 B, identical to the report's. No row grows by more than 150 B.

## The test command

`readAccessibilityTree` (`tests/support/accessibility-commands.node.ts`) is test-only and Chromium-only:

- It reads `Accessibility.getFullAXTree` for the test's frame (`:131-132`). It finds that frame by URL through `DOM.getDocument` with `pierce: true`, and starts from the first element of the test's document that matches the selector.
- **Outside Playwright, it throws** (`:110-114`) with the message that drag's Playwright-only commands use (`packages/drag/tests/support/commands.node.ts:105-108`).
- **Under Playwright in Firefox and WebKit,** it fails at `newCDPSession` (`:59`), as its module comment says. The only caller is the Chromium-gated block.

## Findings

### reviewer-1 — Tier A, routed to the architect: an interactive item's `::part(impl)` is no longer a flex item of the list

- **Current behavior:**
  - On `main`, the item host is `display: contents`. So the `<button>` or `<a>` that carries `part="impl"` is a flex item of `mx-list`'s column.
  - On the branch, the flex item is the new `.row` (`list-button-item.tpl.html:1`, `list-link-item.tpl.html:1`), and the part is a block child of the row.
  - A consumer's flex-item property on the part therefore no longer applies: `order`, `flex-*` and `align-self`.
  - `mx-list-item` is unaffected, because its part is still its row.
- **Why it matters:**
  - `impl` is a documented part (`list-button-item.ts:41`, `list-link-item.ts:52`).
  - The handoff's property 7 covers whether parts are added or removed. It doesn't cover the part's layout context.
  - Neither the handoff nor the guide records this consequence of the row.
- **Evidence:** `#second::part(impl) { order: -1 }` on the second of two button items.
  - On `main`'s sources, the tops are `first: 82, second: 24`, so the second item is moved first.
  - On the branch, the tops are `first: 24, second: 82`, so it isn't moved.
  - The result is the same in Chromium, Firefox and WebKit ([transcript](checks/part-layout.txt)).
- **Not affected:** a disabled item's hit target and click path. `elementFromPoint` gives the item, and no click reaches the item or the list, on both sides in three engines.
- **Required property:** the part's layout context is either the same as on `main`, or is stated as changed where the part is documented. Choosing between those is a public-surface call, which is why it is routed.

## Other points

- **`accessibility.md` in this PR:** settled by the owner, as the coordinator relayed: it stays. In my view, too, it belongs: it is the feature's own documentation, which RD-32 keeps with the feature.
- **Record:** this pass adds only this directory. The PR body is untouched.
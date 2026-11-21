# Feature proof: RF-68's second re-ruling, the folded host (PR #99)

**Read at** `6a2c21a68` on `material-x/list-roles-1`. I read it against the [handoff](../../list-roles-1/list-roles-handoff.md) at `a52f3bbd8` (findings 10 to 14, decisions 1 to 4, properties 1 to 9, _What the implementer changes_ and _What the second re-ruling replaces_), the [report](../../list-roles-1/list-roles-report.md) at `6a2c21a68`, and `RF-68` in the [register](../../00-index.md). `main` here is the branch's merge base `555ab85bc`, whose material-x, core and drag sources equal `origin/main`'s at `e4b0e475d`. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-21. Everything ran in private worktrees of both commits, each installed and built with `aube exec just build`, in Playwright 1.65.0's Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2, with Node 26.13.1.

The earlier proof, [`feature-proof-claude.md`](feature-proof-claude.md), read the first implementation. Its `reviewer-1` is withdrawn by the re-ruling, and this pass doesn't reopen it.

**Scope:**

- **Covered:** properties 1 to 9, proofs 1 to 5, 7 and 8, the probe's new `item-lift` mode, and the points the coordinator asked about: the footprint and the flow during a lift, focus in Firefox without `FocusForwarding`, a consumer's `tabindex`, the elevation pixels, the `:host::before` and `::after` layers, and the private property names.
- **Rerun, not taken from the report** ([reruns](checks/fold-rerun.txt)):
  - the whole material-x suite in three engines;
  - the three mutations of proof 5;
  - `probes/list-roles.ts`, `probes/list-lift.ts` and `probes/list-layout.ts --png` on both builds;
  - sizes on both builds;
  - the custom elements manifest of both builds.
- **Probes of this pass:**
  - [`fold-proof.ts`](probes/fold-proof.ts) ([reading](checks/fold-proof.txt)) runs on both builds in three engines. It lifts each item with core's reorderable trait itself, from the keyboard, and reads the list's flow, the footprint, the lifted element's styles and layers, and a screenshot during the lift. It also reads `focus()` and a click on each kind, the Tab order with a consumer `tabindex`, the box-shadow layers, and two document rules of a consumer.
  - [`private-props-remap.ts`](probes/private-props-remap.ts) compares every built file of both builds after mapping the short private property names back.
- **Not rerun:** the root `aube exec just test`, `fmt`, `lint` and `typecheck`. Core and drag are unchanged by the branch.
- **Deferred by the owner, as the coordinator relayed:** proof 6, Safari.
- **Out of scope, already queued:** the elevation penumbra (#103), and `interactive.styles.css` being imported nowhere (#104).

**Verdict:** the unit implements the second re-ruling as the handoff states it. Properties 1 to 9 hold for the handoff's fixtures, and proofs 1 to 5, 7 and 8 reproduce with the report's figures. Two findings, both Tier A, are routed to the architect. A folded host takes its styles on `:host`, and a document rule of the consumer beats `:host`. So a universal reset removes `mx-list-item`'s padding (`reviewer-2`), and a consumer's `[popover]` rule restyles a lifted host (`reviewer-3`). On `main`, neither rule reaches the item. One Tier C note on the probe goes to the implementer (`reviewer-4`). Whether the Tier A findings block the merge is the architect's call.

## Properties

| # | Holds | Evidence |
| --- | --- | --- |
| 1 | Yes | The tree reading of `probes/list-roles.ts`, variant `main`, on the branch's build, is line for line the committed [`list-roles-branch.txt`](../../list-roles-1/checks/list-roles-branch.txt) in three engines. The Chromium rows (proof 1) pass |
| 2 | Yes | `useCore(…, { role: 'listitem' }, …)` (`ListItemCore.ts:77`). `list-item.tpl.html` is deleted, and the two interactive templates are one element each, as on `main`. The structure rows pass in three engines |
| 3 | Yes | `focus()` reaches the same element as on `main` for every kind, enabled and disabled, in all three engines, Firefox included. A click on each interactive item focuses its control. The Tab order is the same as `main`'s apart from property 4's stop ([reading](checks/fold-proof.txt), `## focus` and `## tab`) |
| 4 | Yes, with (a) | `tabindex="0"` on an `mx-list-item` host adds one stop, the host, which matches `:focus-visible`. `focus()` reaches it. Without `tabindex`, a static item takes no focus, as on `main`. `tabindex="-1"` on any of the three kinds gives the same order as on `main`: the host and its shadow content are skipped |
| 5 | Yes, for the fixture | The layout reading is equal on both builds, and the six screenshots at elevation level 0 and 6 are byte-equal (`cmp`), in three engines. Level 0 and level 6 differ in each engine, so the screenshots show the raised level. For a consumer with a universal reset, see `reviewer-2` |
| 6 | Yes, for the fixture | Core's trait itself lifts the host. The list's height, the next item's top, the footprint and the lifted rect are the same as in `main`'s lift of `.host`, and the host's padding, overflow and background are its own before the lift. The screenshots during the lift are byte-equal to `main`'s in three engines. For a consumer's `[popover]` rule, see `reviewer-3` |
| 7 | Yes | The manifests of the two builds differ only by `mx-list-item`'s part `impl`. `traits-baseline` changes only in the two items' `FocusForwarding` entries |
| 8 | Yes | `accessibility.md`'s list section states each of property 8's points |
| 9 | Yes | Each new stylesheet's comment says why, and no finding id appears in source |

## The points the coordinator asked about

- **The footprint, with the host lifted.** Core's trait puts a `[data-footprint]` of 360 × 56 px before the item, at the item's place. The list's flow is then the other items and the footprint. The sum of their heights and gaps equals the list's height, 260 px before, during and after the lift. No host with a box is left around a lifted element, and the footprint goes after Escape. This holds for `mx-list-item` and `mx-list-button-item` in all three engines, and equals `main`'s lift. The host carries `popover="manual"` and the trait's inline styles during the lift, and neither after it.
- **Focus without `FocusForwarding` in Firefox.** `host.focus()` reaches `button.host` and `a.host`, as on `main`. A disabled button item takes no focus, and a disabled link item's `a.host` takes it, as on `main`. `list-item.browser.test.ts`'s focus rows pass in Firefox.
- **The tab stop from a consumer's `tabindex`.** Tab order with `tabindex="0"` on a static, a button and a link host: `st(focus-visible) | b>button | bt>button | at>a | after`. `main` has the same order without `st`. The host is a `listitem` with no node of its own (proof 3's reading).
- **The elevation pixels.** At rest, level 0 and 6 equal `main` (proof 4). During a lift, the drag raises the level, and the screenshot equals `main`'s for both kinds in three engines.
- **The `:host::before` and `::after` layers.** On the branch, `mx-list-item`'s host's `::before` and `::after` compute as `main`'s `.host::before` and `::after`: content `""`, `position: absolute`, `inset: 0`, the inherited radius, `pointer-events: none`, and the umbra or ambient shadow. During a lift they rise to the drag's level as on `main`. The interactive hosts' `::before` and `::after` have `content: none`, so they generate no box. Their `.host` layers are unchanged.
- **The private property renaming is a size artifact.** Both builds have the same 227 names, and 92 get a different short name. 71 built files are byte-equal. The other 14 outside the changed modules are equal once each short name is mapped back. Only the six changed list modules differ, and two new ones are added. The sizes equal the report's, row for row.
- **The probe mode `item-lift`.** It reproduces in three engines, and `main`'s `none` reads the same. It copies the trait's steps instead of running the trait. See `reviewer-4`. Proof 2's lift rows and `fold-proof.ts` run the trait itself, and they agree with it.

## Proofs

1. **Chromium tree in CI: holds.**
2. **Structure and lift in three engines: holds.** `list-roles.browser.test.ts`: 83 passed and 4 skipped.
3. **Three engines' trees: holds.** The reading is identical to the committed one. `list-lift.ts`: `item-lift` and `item-lift-static` read 192 → 192 and 144 → 144 in each engine. `none` on the branch reads 192 → 204, and on `main` 192 → 192, as reported.
4. **Layout and pixels: holds.** `diff` is empty, and the six screenshots are byte-equal.
5. **Mutations: reproduce.** Removing the interactive resets fails the button item's _rect, padding, overflow and background_ row in three engines. Removing `overflow: visible` from the static host fails the static item's same row. Replacing the role by `{}` fails only the two Chromium tree rows. The handoff expected proof 2 to fail too, but page script can't read a role set through `ElementInternals`. In Firefox and WebKit, only the probe reads the role. The report states this.
6. **Safari: deferred by the owner.**
7. **Existing gates: hold for what I reran.** Material X in three engines: 61 files, 1,338 passed, 1 expected fail and 4 skipped.
8. **Sizes: hold.** `list/list` −3, `list/list-item` +19, `list/list-button-item` +6, `list/list-link-item` +11, `complete` +75 B, the same as the report's. No row grows by more than 150 B.

## Findings

### A universal reset removes `mx-list-item`'s padding (`reviewer-2`): Tier A, routed to the architect

- **Current behavior:** the static item's box rule is on `:host` (`static-box.styles.css:6-29`), with its `padding-block` and `padding-inline`. In the cascade, a normal declaration from the document beats a normal declaration of the shadow tree's `:host`, whatever their specificity. So a document rule that matches every element overrides the item's padding. On `main`, the padding was on `.host`, inside the shadow tree, where no document rule reaches it.
- **Evidence:** with `*, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid }` in the document, `mx-list-item`'s computed padding is `0px`. Its label starts at x = 0 instead of 16, and its box keeps 360 × 56. The button and link items, whose padding is on `.host`, don't change. On `main`, all three items are unchanged. This is the same in Chromium, Firefox and WebKit ([reading](checks/fold-proof.txt), `## reset`).
- **Why it is a problem:** this rule is Tailwind CSS v4's preflight, without its `::backdrop` and `::file-selector-button` selectors. Its `preflight.css` has `*, ::after, ::before, ::backdrop, ::file-selector-button { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; }` at the top level. So a correctly integrated consumer that uses that preflight gets a static item without its inline and block spacing, while the interactive items keep theirs. Property 5 was proved on a page without document styles, and neither the handoff nor the guide records this consequence of the fold. `button-group`'s standard variant already puts `padding-inline` on `:host`, so the exposure isn't new to the package, but it is new to the list items.
- **Required property:** the list items look the same beside a document reset as on `main`, or the guide states which `:host` properties a document rule overrides. Which of the two is a decision about the folded host (decision 1), so this is routed.

### A consumer's `[popover]` rule restyles a lifted host (`reviewer-3`): Tier A, routed to the architect

- **Current behavior:** while core's trait lifts a host, the host carries `popover="manual"` and matches `[popover]` and `:popover-open` in the document. The handoff's resets are `:host` rules, `padding: 0`, `overflow: visible`, `background: none` and `color: inherit` on an interactive host, and `overflow: visible` on a static host. Finding 12 and decision 3 rely on _"A plain `:host` rule is enough, because author rules beat the UA's"_ (handoff `:58`, `:75`, and `:98`: _"Nothing else sets these properties on the host"_). That is true against the UA, but a document rule of the consumer beats `:host`. On `main`, the lifted element was the shadow tree's `.host`, which no document rule matches.
- **Evidence:** with `[popover] { padding: 16px; background: red; overflow: auto }` in the document, core's trait lifts each host from the keyboard ([reading](checks/fold-proof.txt), `## popover`):
  - **`mx-list-button-item`:** the lifted host's rect grows from 360 × 56 to 392 × 88, because the trait's `width` and `height` set its content box. It has 16 px of padding, a red background and `overflow: auto`. The button is drawn 16 px in, on a red frame.
  - **`mx-list-item`:** its padding becomes 16 px on every side, its background red, and its `overflow` `auto`, which clips the elevation layers.
  - **On `main`,** both lifts keep the item's own values, and the screenshots differ from the branch's in all three engines.
- **Why it is a problem:** property 6 requires the lifted host's rect, padding, overflow and background to be what they were before the lift. A page that styles its own popovers through `[popover]` or `:popover-open` is correctly integrated, and it breaks that property for every reorderable list on the page. The handoff states that drag's lift, which `RD-31`'s follow-up uses, writes the computed values inline before the promotion (finding 12). Inline values beat a document rule, so the exposure is that of core's trait, which `mx-list`'s `reorderable` uses on this branch and on `main` after the merge.
- **Required property:** a lift keeps the host's rect, padding, overflow and background whatever document rules match a popover, or the guide states which document rules apply to a lifted item. Which of the two is a decision about the lift (decision 3), so this is routed.

### The probe mode `item-lift` copies the trait instead of running it (`reviewer-4`): Tier C, to the implementer

- **Current behavior:** the report says that `item-lift` _"lifts the item's host with nothing added to the build, as the branch's trait does"_. The mode copies the trait's steps in page script: a plain `div` as the footprint, without `data-footprint`, `aria-hidden` or the item's slot, the trait's inline styles, and `showPopover()`. `open: true` in its output is a constant, and nothing checks `:popover-open`. Its last column, _"list after hidePopover"_, is read with the footprint still in place and the host still `position: fixed`, so it doesn't describe the state after a drop. The `open` constant and the last column come from the architect's earlier modes.
- **Why it matters little:** the reading is right for what it compares, the list and the next item during a lift. Proof 2's lift rows and this pass's `fold-proof.ts` run the trait itself and agree with it. No gate depends on the probe.
- **Required property:** the report's description of the mode matches what the mode does.

## Other points

- **No other differences were found.** The fold's computed styles, the layers, focus, the Tab order apart from (a), the flow and the pixels at rest and during a lift all equal `main`'s for the handoff's fixtures.
- **Record:** this pass adds only this file and its probes and readings. The PR body is untouched.
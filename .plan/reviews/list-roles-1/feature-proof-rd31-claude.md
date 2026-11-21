# Feature proof: RF-68 on top of RD-31 (PR #99)

**Read at** `de24d50d5` on `material-x/list-roles-1`. That is the implementation commit, over the step-1 merge `7b90a846f`. I read it against the [handoff](../../list-roles-1/list-roles-handoff.md) at `709e9fb55`, chiefly:

- [On top of `RD-31` (#90)](../../list-roles-1/list-roles-handoff.md#on-top-of-rd-31-90);
- [The rise in WebKit, ruled](../../list-roles-1/list-roles-handoff.md#the-rise-in-webkit-ruled);
- decisions 1 to 4, properties 1 to 9 and proofs 1 to 8.

I also read `RD-31`'s seventh amendment in the [register](../../00-index.md) (`75ba6bf5b`, `11331a545`), the [report](../../list-roles-1/list-roles-report.md) at `de24d50d5`, and the report's readings. **The base** is `73f081dc4`: `main`, and the merge's parent from `main`. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-21. **Everything ran in two private detached worktrees,** one at each commit, each installed and built with `aube exec just build`. The browsers were Playwright 1.65.0's Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2, with Node 26.13.1.

The earlier proofs, [`feature-proof-claude.md`](feature-proof-claude.md) and [`feature-proof-fold-claude.md`](feature-proof-fold-claude.md), read the first implementation and the fold. Their findings are ruled, and this pass doesn't reopen them.

**Scope:**

- **Covered:** step 1's resolutions as the code shows them, and every item of step 2. Properties 1 to 9 on top of `RD-31`, and the seventh amendment's text against the code. Proofs 1 to 5, 7 and 8, and the five limits the coordinator named.
- **Rerun, not taken from the report** ([reruns](checks/rd31-rerun.txt)):
  - `list-roles.browser.test.ts` and `sortable-list.browser.test.ts` in three engines: 323 passed and 4 skipped. `list-item.browser.test.ts` and `focus-forwarding.browser.test.ts` in three engines: 60 passed;
  - the five mutations of proof 5, in three engines;
  - the implementer's rise probe, [`lift-rise.browser.test.ts`](../../list-roles-1/probes/lift-rise.browser.test.ts), in three engines;
  - `aube exec just size-reading` on both commits;
  - the committed probe [`list-roles.ts`](../../list-roles-1/probes/list-roles.ts), variant `main`, on the branch's build.
- **Probes of this pass:**
  - [`list-layout-reset.ts`](probes/list-layout-reset.ts) is a copy of [`list-layout.ts`](../../list-roles-1/probes/list-layout.ts) with a `reset` mode. That mode puts proof 2's universal reset in the page's head. The probe adds four static items: a label alone, a lead alone, a trail alone and a large lead. It ran on both builds, with and without the reset, and on a control build ([reruns](checks/rd31-rerun.txt)).
  - [`consumer-writes.browser.test.ts`](probes/consumer-writes.browser.test.ts) writes the consumer's `tabindex`, `aria-description` or `aria-label` on a static host or a handle after the item has claimed it. It then reads what stays ([reading](checks/consumer-writes.txt)).
- **Not rerun:**
  - the whole material-x suite in three engines and the root `aube exec just test`;
  - `fmt`, `lint` and `typecheck`;
  - `probes/list-lift.ts`'s `none` mode, which lifts an element that nothing on the branch lifts.
- **Not run:** proof 6, Safari.
- **Owner decisions, not findings:**
  - a consumer's `tabindex` stands (a);
  - a consumer's `padding` on `mx-list-item` adds to the item's spacing;
  - the `onStart` style read is the architect's ruling.

**Verdict:** the unit implements the handoff's re-plan on top of `RD-31`, and the ruling on the rise. **Properties 1 to 9 hold** for the handoff's fixtures, and **proofs 1 to 5, 7 and 8 reproduce** with the report's figures. **Of the five limits,** four are sound as the report states them. This pass closes limit 4: under a universal reset, the pixels are byte-equal to those without it, at elevation level 0 and 6, in all three engines.

- **One Tier A finding is routed to the architect** (`reviewer-1`). The claim record removes a `tabindex` or a description that the consumer wrote on a static host after the item claimed it. So a consumer's `tabindex` doesn't always stand, in either list.
- **One Tier C finding on the report goes to the implementer** (`reviewer-2`).

Whether `reviewer-1` blocks the merge is the architect's call.

## Properties

| # | Holds | Evidence |
| --- | --- | --- |
| 1 | Yes | The committed probe's tree reading on the branch's build is the committed [`list-roles-on-rd31.txt`](../../list-roles-1/checks/list-roles-on-rd31.txt) line for line, in three engines. Proof 1's Chromium rows pass |
| 2 | Yes | `useCore(…, { role: 'listitem' }, …)` in `ListItemCore.ts`. The structure rows pass in three engines |
| 3 | Yes | `ListInteractiveItemCore.ts` keeps `delegatesFocus` and composes no `FocusForwarding`. `list-item.browser.test.ts`'s focus rows and `focus-forwarding.browser.test.ts` pass in three engines, Firefox included |
| 4 | Yes, except `reviewer-1` | In `mx-list`, the static item takes no focus (_should not take focus by Tab in mx-list_). The new row makes an item with a consumer's `tabindex="0"` a tab stop in `mx-list`. A value that the consumer writes after the item's claim isn't kept (`reviewer-1`) |
| 5 | Yes | Below, proof 4 and limit 4 |
| 6 | Yes | Proof 2's lift rows pass in three engines, under no rule, the `[popover]` rule and the consumer's `#s` rule. The rise rows pass, and the rise reading reproduces |
| 7 | Yes | Against `73f081dc4`, `traits-baseline.json` changes only in the three list items' `FocusForwarding` entries: `true` to `false`, and no `focus` or `symbol:FocusForwarding` key. The other source changes add no part, attribute, property, event, slot or export |
| 8 | Yes, except `reviewer-1` | [`accessibility.md`](../../../.agents/docs/accessibility.md#list) states each point. Its _"removes only what it wrote"_ doesn't hold for a consumer's later write (`reviewer-1`) |
| 9 | Yes | The `:host(:popover-open)` rule, the spacing margins and `onStart`'s read each have a one-sentence comment, with no finding id. `sortable-item.ts`'s module comment says that a static item's host is its control |

**Step 2, item by item:**

- **The `visual` callback is gone.** `sortable-list.ts` changes by that, its JSDoc and the read in `onStart` alone.
- **The static writes go on the host** through the claim record, and `control === host` identifies a static item.
- **`mx-list-item` composes neither `FocusForwarding` nor `delegatesFocus`.** Its `:host(:focus-visible)` has the declarations of the shared `.host:focus-visible`.
- **The items' lift resets are gone.**
- **`RD-31`'s amended property 4 and its new item on drag's `visual` describe the code,** except as `reviewer-1` reads. Its property 7 holds: `list/list-item` shrinks.
- **No drag source changes:** the branch's diff from `73f081dc4` has no file under `packages/drag`, and every drag size row is unchanged.

## Proofs

1. **The Chromium tree: reproduces.** Both rows pass, and both fail when the role is removed.
2. **The structure, the lift and the reset: reproduce** in three engines. The lift rows hold with drag's lift through real pointer input, under each rule.
3. **Three engines' trees: reproduce.** The rerun of `list-roles.ts` differs from the committed reading by one trailing empty line. [`list-a11y-roles.txt`](../../list-sortable-1/checks/list-a11y-roles.txt) shows the focused handle-less static item as `MX-LIST-ITEM`, with role `listitem`, its name and the arrow-key description.
4. **The layout and the pixels: reproduce, with more fixtures.** `list-layout-reset.ts` reads the original fixture and the four extra static items. The rects are equal on `73f081dc4`'s build and the branch's in all three engines. The six screenshots are byte-equal (`cmp`). Limit 4 is below.
5. **Mutations: reproduce,** each as the report's table says. Each was reverted, and the clean file then passes (119 passed and 4 skipped).

   | Mutation | Fails |
   | --- | --- |
   | The role replaced by `{}` | Proof 1's two Chromium rows only |
   | Drag's `UA_PROPS` emptied, drag rebuilt | 15 rows. In each engine: the static item under no rule, the `[popover]` rule and `#s`, and the button item under no rule and the `[popover]` rule |
   | The `:host(:popover-open)` rule removed | Both rise rows, in each engine (6) |
   | `onStart`'s read removed | Both rise rows, in WebKit only (2) |
   | `mx-list-item`'s spacing on its host's padding again | The six reset rows, in each engine (18) |

6. **The existing gates:** the four test files above pass in three engines. The rest isn't rerun (scope).
7. **Sizes: reproduce** byte for byte. `list/list` 685 → 686, `list/list-item` 2,828 → 2,789, `list/list-button-item` 4,667 → 4,664, `list/list-link-item` 4,885 → 4,883, `list/sortable-list` 8,605 → 8,548, `complete` 22,092 → 22,198. No row grows by more than 150 B, and both of `RD-31`'s bounds hold. The drag, core and box-quad rows are unchanged.

## The five limits, judged

1. **The rise row asserts the first reading above rest, not the value one frame after `onStart`.** **Sound, but the report's reason is narrower than its reading.** The row tells a jump from a transition: without the rule, it fails in each engine, and without the read, it fails in WebKit. The ruling's literal witness can't hold in any engine. On the first frame that sees the `drag` state, the level is 0 in Chromium and Firefox too, for both items, in the implementer's [reading](../../list-roles-1/checks/lift-rise.txt) and in this rerun. In WebKit it is 0 for the button item, and 0.04 or 0.24 for the static item. The report gives WebKit as the reason (`reviewer-2`). The row doesn't read the duration or the easing, and the ruling's witness didn't either.
2. **Removing the role fails only proof 1's Chromium rows.** **Sound.** Proof 2's assertions, as the handoff lists them, read the template, `display` and the `role` attribute. None of them can observe a role set through `ElementInternals`. The fold's proof found the same. In Firefox and WebKit the role is observed only by the committed probe, which reproduces. Proof 5's first bullet in the handoff still expects proofs 1 and 2 to fail. That is a note for the architect, not a defect of the implementation.
3. **With `UA_PROPS` emptied, the static item's no-rule row fails too.** **Sound, and expected by the plan.** Step 2 removes the static host's `overflow: visible`, so only drag's lift keeps the host's `overflow`. Without it, the UA's `overflow: auto` applies with no page rule. Proof 5's bullet doesn't name this row. So the mutation catches more than the bullet expects, and nothing less.
4. **`fold-cascade.ts` doesn't run, so the screenshots under the reset have no rerun.** **Closed by this pass.**
   - On the branch's build, with the reset in the page's head, every item's rect equals its rect without the reset, in all three engines. That holds for the original fixture and for a label alone, a lead alone, a trail alone and a large lead.
   - The screenshots at level 0 and 6 are byte-equal to those without the reset, and to `73f081dc4`'s.
   - **The probe discriminates.** With proof 5's last mutation built, the screenshots without the reset still equal the base's. Under the reset, all six screenshots differ, and the large lead's item shrinks from 76 to 56 px in every engine.
   - The other half of `fold-cascade.ts`, the lift under a popover rule and the consumer's rule, is proof 2's rows. Its `box-shadow` case is the documented limit in `mx-sortable-list`'s JSDoc.
5. **Safari hasn't run.** **Sound.** Proof 6 doesn't gate the merge, and the accessibility guide's _Missing requirements_ states that the trees weren't read in Safari.

## Findings

### A consumer's later `tabindex` or description on a static host is removed (`reviewer-1`): Tier A, routed to the architect

**Finding.** In `mx-sortable-list`, a handle-less `mx-list-item` claims `tabindex="0"` and `aria-description` on its host when it enters the list. If the consumer then writes either attribute, the item removes the consumer's value. That happens when the item gains a handle, leaves the list or moves into `mx-list`.

**Current behavior.** `claim` writes an attribute that the element doesn't have and records its name. `release` removes every recorded name, whatever the attribute's value is at that time and whoever wrote it last (`sortable-item.ts`). The test _should keep the consumer's tabindex and description on the host_ writes both before the item enters the list, so the record never holds them.

**Evidence** ([reading](checks/consumer-writes.txt)). The same result holds in Chromium, Firefox and WebKit:

- the item claims, the consumer writes `tabindex="-1"` and `aria-description="Mine"`, and the item moves into `mx-list`: the host has neither attribute;
- the consumer writes `tabindex="0"` after the claim, and the item gains a handle: the host has no `tabindex`;
- the consumer writes `tabindex="0"` after the claim, and the item moves into `mx-list`: the host has no `tabindex`, and `focus()` doesn't reach it. So in `mx-list` the item isn't the tab stop the consumer asked for.

**Why it is a problem.** Each of these says that a value the consumer set is kept, with no condition on when it was set:

- the owner's answer (a), as `RD-31`'s amended property 4 states it: _"A consumer's `tabindex` on its host stands, in either list"_, and _"Values the consumer set are kept"_;
- the handoff's step 2: _"a value the consumer set stays, and only what the item wrote is removed"_;
- `mx-sortable-list`'s JSDoc: _"A `tabindex` the consumer set on it stands"_;
- `mx-list-item`'s JSDoc;
- `accessibility.md`: _"removes only what it wrote"_.

A consumer that sets `tabindex` from state after first render, as a framework binding does, is correctly integrated, and sees its attribute removed.

**What is new, and what is `main`'s.** `claim` and `release` are unchanged from `73f081dc4`, where the same record holds a handle's attributes. The probe's fourth case shows a consumer's `aria-label` that was written on a handle after the claim, and removed when the handle leaves the item. By the same code, not run, an interactive item's control loses an `aria-description` that the consumer gave the host after the claim. This unit puts the record on the consumer's own item element, and on `tabindex`, which the owner's answer (a) covers.

**Routed, not answered.** Whether "kept" covers a value written after the claim, or the contract states when the consumer's value must be there, is a contract question on `RD-31`'s record and on the owner's answer (a). It reaches the handle on `main` too.

**Required property.** A `tabindex` or `aria-description` that the consumer set on a static host stays when the item gains a handle, leaves the list or moves into `mx-list`. Either that holds whenever the consumer set it, or the contract states the timing in which it holds, and the JSDoc and `accessibility.md` say the same.

### Two statements of the report don't match its readings (`reviewer-2`): Tier C, to the implementer

- **The rise row's reason.** The report says that one frame after `onStart`, _"In WebKit that value can still be 0"_. The report's own [reading](../../list-roles-1/checks/lift-rise.txt) and this rerun show the level at 0 on that frame in Chromium and Firefox as well (limit 1). The deviation from the ruling's witness holds in every engine, not only WebKit.
- **`complete`'s estimate.** The report says that `complete` _"is at the top of its estimate of −150 to +100 B"_. The build's own figure is +106 B, which is 6 B over that top. The figure with the base's names is +100 B. No limit or stop applies.

**Required property:** the report states what its readings show. The row and the code are sound.

## Other points

- **The claim record and `tabindex` on the interactive items:** `control === host` is false for an interactive item, so it claims only the description on its control, as before. The row _should add no tab stop to a button item_ passes.
- **The nested `mx-list` in a sortable list:** the handle-semantics row now reads the nested static item's host, and finds no attribute. The item's `parentElement !== list` check returns no item, as on `main`.
- **Scratch work:** both worktrees and their builds are this pass's, under its scratchpad, and are removed after the commit.
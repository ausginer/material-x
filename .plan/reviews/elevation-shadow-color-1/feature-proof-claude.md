# Feature proof: RF-77 and RF-78, the elevation layers' shadow colour and level 0 (PR #152)

**Read at** `afa794ea7` on `material-x/elevation-shadow-color-1`, against `RF-77` and `RF-78` in the [register](../../00-index.md) and their dated implementation paragraphs on the branch, with the implementer's evidence in [`elevation-shadow-color-1/checks/`](../../elevation-shadow-color-1/checks/). Issues #129 and #130. The base is `main` at `4fd8b9a67`. `main` is at `6a67badfd` now. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-22.

Everything ran in slot `e`, which holds the branch, with Playwright's Chromium, Firefox and WebKit through `MX_TEST_ENGINES=chromium,firefox,webkit`. Each source mutation changed only `src/core/styles/elevation/tokens.ts` and `src/list/styles/item/tokens.ts`, and [`mutate.sh`](probes/mutate.sh) restored both from `HEAD` after each run. The probes ran from `tests/core/` and were removed from there, and the slot's tree is clean apart from this review.

**Scope:**

- **Covered:** every claim the coordinator listed, the implementer's stated limit, the stylesheet that tproc renders, the size readings, and CI on the PR head.
- **Rerun, not taken from the record:**
  - the elevation rows on the head, on the base sources, and under five mutations ([reading](checks/mutations.txt));
  - the material-x browser and spec projects on the head in the three engines ([summary](checks/material-x-suite-head.txt));
  - `just size-reading` on the head and on the base sources ([comparison](checks/sizes.txt)).
- **Probes of this pass**, all in [`probes/`](probes/):
  - [`rf77-rf78-probe.spec.browser.test.ts`](probes/rf77-rf78-probe.spec.browser.test.ts). P1 checks that the level-0 screenshot row can see layers at all. P2 gives the elevated button and the FAB a `container.shadow-color` other than `md.sys.color.shadow`. P3 checks that each list item declares its own `--_shadow-color`;
  - [`rf77-rest-colour-probe.spec.browser.test.ts`](probes/rf77-rest-colour-probe.spec.browser.test.ts): whether a colour row read at level 0 can see the colour ([reading](checks/rest-colour-probe.txt));
  - [`render.ts`](probes/render.ts) and [`render-list.ts`](probes/render-list.ts) print the CSS that tproc renders for the elevation and list-item packages. [`sizecmp.ts`](probes/sizecmp.ts) compares the size readings.
- **Read from CI:** run `45008013029` on the head, its failing `chromium` job, and the diff images of its `screenshots` artifact ([reading](checks/visual-ci.txt), [diffs](checks/visual-ci/)). `git merge-tree` against `origin/main` ([reading](checks/merge-tree.txt)).
- **Not run:** the visual project, which runs in CI only. Safari, which needs macOS. The root `fmt`, `lint` and `typecheck`, which CI's `static` job passed on the head.

**Verdict:** the head meets both required properties in the three engines. The elevated button draws its own token's colour even when that colour differs from `md.sys.color.shadow` (P2). At level 0, a resting list item and a filled button paint as they do with no layers. The new rows discriminate the level-0 change well. The colour rows are weaker than the record presents them:

- They can't tell the head from the default-only alternative that `RF-77` rejects (`reviewer-2`). The implementer's limit is accurate, but I judge it a finding and not an acceptable limit, because the property it leaves unguarded is the one the decision states.
- The link item's colour row can't see a colour at all, because `RF-78` makes level 0 transparent (`reviewer-3`).

The PR's `verify` gate fails on six stale button baselines. The record doesn't mention them (`reviewer-1`), and the PR conflicts with `main` in the register (`reviewer-4`). The result is three Tier B findings and two Tier C findings, and none of them is a defect in the source. Whether any of them blocks the merge is the architect's call, and the baselines are the owner's.

## The claims

| Claim | Holds | Evidence |
| --- | --- | --- |
| The elevation package no longer sets `--_shadow-color` | Yes | tproc renders `:host { --_default-shadow-color: var(--md-sys-color-shadow, #000000); … }` and no `--_shadow-color` ([`render.ts`](probes/render.ts), head section of [mutations](checks/mutations.txt)) |
| Each layer mixes `var(--_shadow-color, var(--_default-shadow-color))` | Yes | The same rendering, in all three layers |
| A component's colour wins whatever the adoption order | Yes, at the head | `ButtonCore` still adopts the elevation sheet after the button's default sheet (`ButtonCore.ts:96-97`), and P2 passes for the elevated button in three engines. It fails on the base and under `m1`, the default-only alternative. The FAB passes P2 under all three |
| The list item takes `md.comp.list.reorder.list-item.shadow-color` | Yes | `listItemTokens` renders `--_shadow-color: var(--md-sys-color-shadow, #000000)` ([`render-list.ts`](probes/render-list.ts)). P3: each of the three items has a non-empty `--_shadow-color` at the head, where the elevation sheet no longer declares one |
| Each mix percentage is scaled by `min(var(--_level), 1)` | Yes | The rendering. `m3` (unscaled) fails the 12 alpha rows, the 3 continuity rows, and the 4 screenshot rows in Firefox only, which is 19 rows |
| The colour rows resolve each token through the bridge, and don't read the box | Yes | The diff of `expectedLayers`. See `reviewer-2` and `reviewer-3` for what those rows can see |
| Level 0: every layer has alpha 0 | Yes | 12 rows pass at the head, and fail on the base in three engines |
| Level 0: the screenshot equals the one with the layers set to `none` | Yes | It passes at the head. On the base it fails in Firefox only, which is `RF-78`'s witness. P1: at level 3, the same comparison differs in all three engines, on the head and the base, so the row sees layers when there are any |
| Level 0: the penumbra's alpha rises strictly from 0.25 to 0.5 to 1 | Yes | It passes at the head and fails on the base. `m4`, a stepped `min(level × 1000, 1)`, fails only this row, in three engines |
| 31 rows fail before the change, and all 45 pass after | Yes | Base sources: 34 failed, which is the record's 31 plus P2 in three engines. Head: all 45 rows and the probes pass |
| The material-x browser and spec projects pass | Yes | 72 files: 1759 passed, 1 expected fail, 4 skipped, which equals the record |
| The Brotli deltas | Yes | All 33 rows equal the committed `size-before-fix.json` and `size-after-fix.json`. One wording nit is `reviewer-5` |

**By reading, not run:** for level ≥ 1, `min(level, 1) × p% = p%`, so each layer from level 1 up is the base's layer. No row checks this: `m5`, `min(level / 3, 1)`, passes all 45 rows. This is #120's stated limit, that the layer formula is on both sides of the row, so it isn't a finding here.

## Findings

### reviewer-1 — The PR's visual gate fails on six stale button baselines, and the record says everything passes

**Tier B.** Route: the implementer for the record. The re-recording is the owner's, through `RD-13`'s recording workflow.

- **Current behaviour:** CI run `45008013029` on `afa794ea7` fails the `chromium` job, so `verify` fails. Six of the seven rows in `tests/button/button.visual.browser.test.ts` differ from their baselines: the colour variants, the icon composition, the switch variants, enabled and disabled, hovered, and focused. They differ by 175 to 490 px. In each diff image, the differing pixels are only at the shadow edge of the elevated buttons. The disabled elevated button (level 0) and the size matrix (filled buttons only) don't differ. The Firefox and WebKit jobs pass.
- **Why it is a problem:** the change is the intended one. The baselines were recorded with the elevated button drawing surface tint, and `RF-77` makes it draw `md.sys.color.shadow`. But the dated paragraphs and the PR description say that all rows pass, and they don't mention the visual project or the baselines the change makes stale. `RF-77`'s entry doesn't anticipate baseline changes either. So a reader of the record can't tell that the PR's gate is red, or why. `test-architecture.md` requires changed baselines to be recorded by the recording workflow and reviewed by the owner (`RD-13`).
- **Evidence:** [reading](checks/visual-ci.txt), [diff images](checks/visual-ci/).
- **Required property:** the record states which baselines the unit changes and why. The PR's gate passes against baselines recorded and reviewed under `RD-13`.

### reviewer-2 — The colour rows can't tell the decided cascade from the default-only alternative that RF-77 rejects

**Tier B.** Route: the architect, because `RF-77`'s Rows bullet defines what the unit owes.

- **Current behaviour:** `m1` restores the old cascade: the elevation package sets `--_shadow-color` itself, to `md.sys.color.shadow`, and the layers read it with no fallback. Under `m1`, all 45 rows pass in three engines. The reason is the one the implementer gives: every component's shadow-colour token and the default resolve to `md.sys.color.shadow`.
- **Why it is a problem:** `RF-77`'s required property includes _"whatever order it adopts the elevation stylesheet in"_. The decision rejects changing only the default, because _"the button's own token still loses to the order"_. The rows pass for that rejected state, so a change that brings back `shadow-color` in the elevation package would pass the suite. The head does satisfy the property: P2 passes at the head and fails under `m1` and on the base. But no row in the repository guards it.
- **On the stated limit:** the limit is true as stated. It is a finding and not an acceptable limit, for three reasons. The property it leaves open is the decision's own. The alternative it can't detect is the one the decision names and rejects. And P2 shows that the two can be separated in the three engines today. P2 sets the button's private `--_container-shadow-color` on its host, as the branch's screenshot rows set `--_elevation-*` and `--_level`.
- **Evidence:** the `m1` and `head` sections of the [mutations reading](checks/mutations.txt). Under `m1`, P2 for the elevated button is the only failure, in three engines.
- **Required property:** a row that fails when the elevated button's layers take the elevation package's colour instead of the colour of the button's own token package.

### reviewer-3 — The link item's colour row reads the item at level 0, where every shadow colour serializes the same

**Tier B.** Route: the architect. The row reads the item at rest until `RF-76` lets a pointer drag lift it, which `RF-70`'s closure accepted for the layers. Whether `RF-77`'s colour is owed for this item before then is the architect's call.

- **Current behaviour:** _"should draw the three elevation layers of the resting level (mx-list-link-item)"_ compares the layers at the item's resting level, which is 0. After `RF-78`, every layer at level 0 is `color-mix(… 0%, transparent)`, which each engine serializes as `color(srgb 0 0 0 / 0) 0px 0px 0px 0px`, whatever the colour. With `--_shadow-color: rgb(255, 0, 0)` on the item, the row's comparison against black still passes in three engines. The same comparison for `mx-list-item` at level 1 fails, as it should.
- **Why it is a problem:** the record lists this row among the colour rows, and says that _"the three list rows fail because the list package has no `shadow.color`"_. For this row, the failure on the base is the bridge's `Missing token "shadow.color"` error and not a colour difference (`m2`). After the fix, the row can't see the link item's colour at all. The list-item package is shared, so the other two items' rows imply the colour, but this row doesn't observe it.
- **Evidence:** [reading](checks/rest-colour-probe.txt), and the `m2` section of the [mutations reading](checks/mutations.txt).
- **Required property:** each row that the record lists as a colour row fails when its box draws a colour other than its token's. Otherwise, the record says that the row doesn't observe the colour.

### reviewer-4 — The PR conflicts with main in the register

**Tier C.** Route: the implementer.

- **Current behaviour:** GitHub reports the PR's merge state as `DIRTY`. `git merge-tree` of `origin/main` (`6a67badfd`) and the head conflicts in `.plan/00-index.md` only. #132 added `RF-79` to `RF-92` right after `RF-78`'s entry, and the branch adds `RF-78`'s dated paragraph at the same place. `main` changed no source or test since the base.
- **Why it is a problem:** the PR can't merge as it is. The only risk is placement: `RF-78`'s dated paragraph has to stay under `RF-78`.
- **Evidence:** [reading](checks/merge-tree.txt).
- **Required property:** the branch merges cleanly with `main`, with each dated paragraph under its own entry, and without rewriting history (`AGENTS.md`).

### reviewer-5 — The size paragraph's list of rows that don't move is incomplete

**Tier C.** Route: the implementer.

- **Current behaviour:** the record says _"`list/list` and `icon/icon` don't move"_. `button-group/button-group` doesn't move either: it is 3115 bytes on both trees. Every number in the record is right.
- **Evidence:** [comparison](checks/sizes.txt).
- **Required property:** the record names every row that doesn't move, or none of them.

## Not findings

- **The order and inheritance of `--_shadow-color`.** Each component that adopts the elevation sheet declares its own `--_shadow-color` on its host: the buttons through `button/styles/default/tokens.ts`, the FAB through `fab/styles/default/tokens.ts`, and the list items through the new token. So an ancestor's value doesn't reach a nested component's layers through that property, and every value resolves to `md.sys.color.shadow` in any case.
- **The source comment** in `core/styles/elevation/tokens.ts` gives the reason for the scaling and the fallback, and names no finding id.

## Recheck, 2026-11-22: the remediation at 75f36c32c

**Read at** `75f36c32c`, which is the remediation commit. It comes after `76d227f3d`, the merge of `main` at `6a67badfd`. The rulings are `RF-77`'s _"Ruled 2026-11-22 by the architect"_ and the implementer's dated remediation paragraph after it. This is a targeted recheck of this report's five findings, not a fresh proof, on the coordinator's task. It ran in slot `e`, which is clean again.

- **Rerun:** the elevation rows on the head and under six mutations, in Chromium, Firefox and WebKit ([reading](checks/recheck-mutations.txt), [script](probes/recheck-mutate.sh)). A merge check against today's `main`, and PR #156's duplicate-address check, read at this commit.
- **Taken from the record, not rerun:** the full material-x browser and spec run, with 1765 passed, 1 expected fail and 4 skipped. The remediation changes only `tests/core/elevation.spec.browser.test.ts` and the record, and no source.

| Finding | Resolved | Evidence |
| --- | --- | --- |
| `reviewer-1`: the stale baselines and _"all pass"_ | Yes, as a record correction | The dated paragraphs name the six rows of `button.visual.browser.test.ts` and why they differ. They say the visual project doesn't pass, and they no longer say that every row passes. The PR description says the same. Re-recording the baselines is the owner's, and isn't checked here |
| `reviewer-2`: the rows can't see the cascade | Yes | Under `m1`, the default-only alternative, the button's new row fails in three engines and nothing else fails, the same as the implementer's witness |
| `reviewer-3`: the link item's colour row reads level 0 | Yes | The row reads the item in `mx-list` at `--_level: 1` with `transition: none`. A red `--_shadow-color` on the item (`mL`) fails it in three engines, and nothing else fails |
| `reviewer-4`: the conflict with `main` | Yes | `main` is merged with no rewrite. Each dated paragraph is under its own entry, and the ruling is under `RF-77`. `origin/main` has moved on to `4936e77b9`, and the branch still merges with no conflict. #156's `--duplicates`, read at `75f36c32c`, finds no duplicated address |
| `reviewer-5`: the size wording | Yes | `RF-78`'s size paragraph names `list/list`, `icon/icon` and `button-group/button-group` |

**On the head:** 51 of 51 elevation rows pass, 17 per engine.

### Does the FAB's row earn its place?

**Yes, though for a narrower reason than _"the two rows cover both orders"_ suggests.** The FAB adopts the elevation stylesheet first, so under `m1` its own colour wins anyway, and its row passes, as the ruling expected. On its own, the row can't tell the decided cascade from the rejected one. That is the button's row's job, and only the button's row fails under `m1`.

What the FAB's row does guard, and no other row does:

- **The FAB's own shadow-colour wiring.** `mF` removes `'shadow.color'` from `fab/styles/default/tokens.ts`, and the FAB's new row fails in three engines and nothing else does. The FAB's two token-colour rows pass, because the FAB then falls back to the elevation package's default, which equals its token. The button's row guards the button's wiring in the same way (`mB`).
- **The adopted-first order.** `m1` combined with the FAB adopting the elevation stylesheet last fails the FAB's row as well as the button's. So at the head, each row observes one adoption order drawing the component's own colour. That is the half of _"whatever order"_ that the button's row can't observe.

The record's phrase is accurate as a description of what the two rows observe at the head. The discrimination against the rejected alternative comes from the button's row alone, and the ruling's witness bullet says so. No finding.

**Result:** all five findings are resolved. The new rows discriminate what the ruling asks of them. No new finding. #152's gate still waits on the six baselines, which are the owner's.
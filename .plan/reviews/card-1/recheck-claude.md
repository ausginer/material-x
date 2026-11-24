# Recheck: `mx-card`'s remediation (PR #213, `RD-53`)

**Read at** `dc3a98c82` on `material-x/card-1`, 2026-11-24. The remediation is `f63cc1e79..dc3a98c82`, with `main` at `a4dee53d8` merged. It is read against the [plan](../../card-1/card-plan.md) as amended on 2026-11-24, the [report](../../card-1/card-report.md)'s _Disposition of `reviewer-1`, implemented_, and the [feature proof](feature-proof-claude.md). Reviewer: Claude, which didn't implement the unit, on the coordinator's task. Issue #171.

**Verdict:** `reviewer-1`, `reviewer-3` and `reviewer-4` are closed. The built card keeps its background, shape, outline and shadow on the host's box in every case read, in the three engines, and `mx-list-item` changes in its shadow only. There are five new findings: one Tier A, three Tier B and one Tier C. None is a regression of the remediation's paint. The Tier A one is a promise of the amended plan that doesn't hold on the inline axis, and it is routed.

**Scope:**

- **Built:** core and material-x, in worktree `b`. The old host-box stylesheet (`f63cc1e79`'s) was also built into this tree, to compare the list item, and restored.
- **Probes,** in [`probes/recheck/`](probes/recheck/): they read painted pixels and computed styles in Playwright's Chromium 158, Firefox 159 and WebKit 27.2.
- **Mutations:** 25 and a control, each in the three engines, on `tests/card` without the visual file, `tests/core/elevation.spec` and `tests/list` ([reading](checks/recheck/mutations.txt)). The control passes: 276 in Chromium, 271 and 5 skipped in Firefox and in WebKit. 13 of them are recorded witnesses. _No penumbra_, _no ambient_ and _box on `::after`_ were not repeated. The source is restored and clean.
- **CI** on the head, run `45349623647`: `firefox` and `webkit` pass, and `chromium` fails one test, the visual one with no reference screenshot. `verify` fails with it. Typecheck of material-x passes here.
- **Not run:** the visual project, Safari, Edge, a mobile browser, the rest of the suite, and the size, docs, format, lint and publint checks. Classic scrollbars: the box probe sets `scrollbar-width: none`. WebKit's emulation forces no color, so forced colors are read in Chromium and Firefox.

## Status of the findings

| Finding | Status | Evidence |
| --- | --- | --- |
| `reviewer-1` | **Closed** | Question 1 |
| `reviewer-3` | **Closed.** The boxes it was about no longer exist | The three layers are read from the host's own list. Without the umbra, in another order, or with the three boxes again, the card's and the lifted item's rows fail. A box on a pseudo-element fails only its rows |
| `reviewer-4` | **Closed** | Without `!important`, only the reset's row fails, in the three engines |

## 1. The host's box

**Yes for the paint, and the focus indicator shows unless the page removes it.**

- **The box** ([reading](checks/recheck/box.txt)): the card's screenshot equals that of a plain `div` with literal declarations, in 13 cases for each variant. They are natural, stretched, smaller in the block axis, the inline axis and both, `overflow` `hidden`, `clip`, `auto` and `scroll`, and scrolled to the start, the middle and the end. Each was read under no reset, a universal reset, an `!important` one with `outline-offset`, a utility preflight, and a page's `outline: none` with an offset. The content is invisible, so it covers nothing. The differences are 0 pixels in Chromium and Firefox, and at most 1 pixel by 2 of 255 in WebKit, for the outlined card with `overflow: hidden` or `clip`. The reference scrolls when the card does: against one that doesn't, Chromium differs at a scroller's corners by up to 23.
- **Forced colors:** the same cases are equal in Chromium and Firefox.
- **Focus** ([reading](checks/recheck/focus.txt)): a focused card paints the browser's indicator, in the three variants, for `tabindex="0"`, a scrolling card, and a smaller one, also in forced colors. A page's `:focus-visible` and `:focus` rules apply, the first also with a reset. WebKit doesn't focus a scrolling card with no `tabindex`.
- **Under a reset with `outline: 0`, normal or `!important`, and no focus rule, no indicator shows,** and an outlined card also loses its outline while focused. The plan accepts this limit, and a plain element loses its indicator there too.

## 2. `mx-list-item`

**Yes** ([reading](checks/recheck/list-item.txt), [where](checks/recheck/where.txt)). Old host-box against head, in `mx-list` and `mx-sortable-list`: at rest, at levels 1 and 8, with a reset, its own shape and color, `overflow: hidden`, RTL, focus, lifted, lifted under a reset, dropped, and the same in forced colors.

- **Computed styles** of the host and its whole shadow tree: the host's `box-shadow` is the only difference, beside the pseudo-elements. Positions, sizes and states are equal.
- **Pixels:** 0 at rest, under focus, dropped, and in every forced-colors case. Lifted: at most 4 (Chromium), 18 (Firefox) and 24 (WebKit) of 255. At levels 1 and 8 and lifted, nothing inside the item's box differs, other than at its rounded corners. With `overflow: hidden` the shadow returns, as the plan says. Head against head is 0.
- The probe stops if a page doesn't hold the bundle it names. Its first run compared a bundle with itself and is not used.

## 3. The rows

- **All 12 recorded witnesses repeated here, other than `position: relative`, fail as the report says.** Not adopting the stylesheet fails 4 rows for the card, and 3 for the item.
- **Removed rows:** the corners' property has its row per variant (a host with no shape fails 4). The outline in a stretched grid is the host's own now, and the slot's stretch has its row. The four rows' boxes are gone.
- **`position: relative`:** it is right that no row reads it, and the report's reason is incomplete. See `reviewer-8`.

## 4. JSDoc, `card.mdx` and the description

They match the element, except in `reviewer-6`, `reviewer-7` and `reviewer-9`.

## New findings

### Local `reviewer-5` — Tier A: the padding isn't reached at the end of an inline scroll

- **Contract:** plan property 2: _"the 16px after the last of the content is reached at the end of the scroll"_. The disposition: _"The padding and the content behave as in any box"_.
- **Current behavior:** it holds in the block axis only. With `overflow: auto` and content wider than the card, 0px follows the content at the inline end, where a `div` with `padding: 16px` has 16px, in the three engines ([reading](checks/recheck/focus.txt)). The content ends on an outlined card's outline.
- **Why it is a problem:** a card that scrolls a wide table or code block shows no end padding. The slot's layout was the same before the remediation, so it isn't a regression. The promise is new.
- **Required property:** the padding behaves as promised in both axes, or the promise names the block axis. **Routed** to the architect: which one is a contract choice.

### Local `reviewer-6` — Tier B: the docs say that a card isn't a tab stop, and a scrolling card is one

- **Current behavior:** JSDoc says the card _"takes no focus"_ and `card.mdx` says _"The card is not a tab stop"_. Both now also say that a card may scroll. A scrolling card with no focusable content takes focus on Tab in Chromium and Firefox, and not in WebKit ([reading](checks/recheck/focus.txt)). The plan states this as the reason for the focus exception.
- **Required property:** a reader who makes a card scroll isn't told that it takes no focus.

### Local `reviewer-7` — Tier B: the docs misname what paints over the outline

- **Current behavior:** `card.mdx` says _"Positioned content at the card's edge, such as full-bleed media, paints over the outline"_. Full-bleed media that isn't positioned, as in the page's own _Full-bleed media_ story, leaves the outline visible. Content that isn't positioned but has `opacity` or `transform` paints over it, and neither JSDoc nor the page names it. All in the three engines ([reading](checks/recheck/focus.txt)).
- **Required property:** the sentence doesn't say that full-bleed media as such covers the outline.

### Local `reviewer-8` — Tier B: promised properties with no row

Each mutation passes every row in the three engines ([mutations](checks/recheck/mutations.txt)). The effect is read on the built element ([survivors](checks/recheck/survivors.txt), [where](checks/recheck/where.txt)).

| Mutation | What changes | What promises it |
| --- | --- | --- |
| The slot shrinks | 0px and not 16px follow the content at the end of a block scroll | Property 2 |
| The slot shrinks and inherits `overflow` | The host's `scrollTop` stays 0, so the slot scrolls | The disposition's reason against that candidate |
| `outline-offset` not `!important` | A page's `outline-offset` moves the outline. By the cascade: the head holds, and the mutated card wasn't read in a browser | Property 3 |
| The outline rule in every variant | A page's `outline` on a filled card becomes `none`. In the proof, before `!important`, this mutation was harmless | JSDoc: _"On an outlined card"_ |
| `:not(:focus)` for `:not(:focus-visible)` | A click on an outlined card with `tabindex` removes its outline | Property 3, and the disposition's reading of a click |
| No `position: relative` | Below | Property 4 |

- **`position: relative` is observable.** The report says that _"nothing in the card is positioned against the host now"_, which is true of the shadow tree. A slotted `position: absolute` child takes the card as its containing block. Also, the shadow paints over the next block's background, which covers it without the declaration: 756 to 962 pixels differ, by up to 92 of 255. For `mx-list-item` no pixel differs, in the two cases read.
- **Also without a row, and not new:** a host with `overflow: clip` passes every row, although clause 3 says that the card doesn't clip its content.
- **The report's _"One mutation passes"_** is true of its own 16.
- **Required property:** a row fails when a promised property doesn't hold, or the plan says which ones have none. For `position: relative`, whether the plan wants a row is the architect's, because the plan gives it none.

### Local `reviewer-9` — Tier C: where the shadow's difference lies

- **Current claim:** the description, and `RD-53`, say _"at most 24 of 255 per channel, mostly at the corners"_.
- **Evidence** ([where](checks/recheck/where.txt)): for a lifted list item, 208 of 996 differing pixels are at the corners in Chromium, 428 of 1794 in Firefox and 577 of 2541 in WebKit. The others differ by 1. The plan's own reading has 101 of 802 in Chromium at level 8. For the card, WebKit reads up to 26, at level 3, and up to 5 away from the corners.
- **Required property:** the claim is about the size of the difference (above 1, only at the corners for the item), and not about the number of pixels. No source change follows.
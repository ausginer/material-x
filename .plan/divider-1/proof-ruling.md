# `mx-divider` and `mx-card`'s split padding: the architect's ruling on #343's feature proof

**Dated 2026-11-27 by the architect, on `material-x/divider-1`,** requested by the coordinator. **Read:** the [feature proof](../reviews/divider-1/feature-proof-claude.md) at `421cb217f`, which read the branch at `540c238a9`; `RD-70` with its amendments; `RD-53`'s note of 2026-11-27; the [plan](divider-plan.md); `RD-68`. **The architect's own reading:** [`flex-alignment`](checks/flex-alignment.txt) ([probe](probes/flex-alignment.browser.test.ts.txt)), in Chromium, Firefox and WebKit.

**What this commit changes in the record:**

- `RD-70`: the third amendment and property 2's last bullet (`reviewer-1`, `reviewer-3`); Q3's pointer (`reviewer-5`); the status sentence (`reviewer-6`).
- `RD-53`: the note of 2026-11-27 starts its own paragraph (`reviewer-9`), and its status names no merge (`reviewer-6`).
- The plan: geometry 2, 3 and 9, the pointer in _Accessibility_, [Q3](divider-plan.md#q3--a-divider-with-an-id), and a pointer to this file from _Tests_.

## The rulings

| Finding | Tier | Ruling | For |
| --- | --- | --- | --- |
| `reviewer-1` | A | **The contract:** the divider keeps its thickness in a flex container that has less room than its items need. `RD-70` property 2, by the third amendment | implementer |
| `reviewer-2` | B | **A fixture fault, as the proof says.** Under the third amendment, the fixture's row draws its vertical divider. The baseline is re-recorded | implementer |
| `reviewer-3` | B | **The divider stretches itself:** it spans its flex line or its grid area, whatever the container's `align-items` or `justify-items`. `RD-70` property 2, by the third amendment | implementer, after the amendment |
| `reviewer-4` | B | **Confirmed:** a row reads a vertical direct child's inline position in the card | implementer |
| `reviewer-5` | B | **An owner question:** the plan's [Q3](divider-plan.md#q3--a-divider-with-an-id). (a), the internals' role `none`, is recommended. Option (a) brings back the role, so the architect doesn't decide it | owner, then implementer |
| `reviewer-6` | B | **Fixed by this commit,** because the architect edited both files for the amendment and `reviewer-9` | — |
| `reviewer-7` | C | **Confirmed, in this unit:** a row holds the line's size under a page's `box-sizing` reset | implementer |
| `reviewer-8` | C | **Confirmed:** the count is corrected. The new declarations change the sizes again, so the count is read again | implementer |
| `reviewer-9` | C | **Fixed by this commit:** the note is the architect's | — |

### `reviewer-1` and `reviewer-3`: the property and its rows

**The property** is `RD-70` property 2's last bullet. The divider keeps its thickness when its flex container has less room than its items need. It spans its flex line or its grid area, whatever the container's `align-items` or `justify-items`: a horizontal divider in the inline axis, a vertical divider in the block axis. A page's own `flex-shrink`, `align-self`, `justify-self` or size on the divider applies.

**The mechanism read:** `flex-shrink: 0`, `align-self: stretch` and `justify-self: stretch` on the host, none of them `!important` ([reading](checks/flex-alignment.txt)). An equivalent is the implementer's choice if the rows below hold. The stylesheet's comment on a vertical divider's height and the docs follow the property. Today they say _"a flex row or a grid stretches it"_. The JSDoc, `divider.mdx`'s _Vertical_ and the comment then say that a vertical divider takes a flex row's or a grid row's height, whatever the row's alignment, and that elsewhere the page gives it a height.

**Rows,** in the three engines, each with the size of the line, less the padding:

1. A horizontal divider in an `mx-list` with a fixed `block-size` and `overflow: auto`, whose items overflow it, is the thickness high.
2. A vertical divider in a flex row whose `flex: none` items are wider than the row is the thickness wide.
3. A vertical divider in a flex row with `align-items: center` and a fixed `block-size` is the row's height. A `start` vertical divider there starts its line 16px below the row's top, and ends it at the row's bottom.
4. A horizontal divider in a flex column with `align-items: center` is the column's width.
5. A vertical divider in a grid with `align-items: center` is the grid row's height. A horizontal divider in a grid with `justify-items: center` is the grid area's width.
6. A page's `align-self: center` and a page's `block-size` on a vertical divider in a flex row apply. These two guard that the page's value wins. No witness is owed.

**Witnesses,** each in the three engines (`RD-62`), because each removes a required property's mechanism:

- Without the shrink declaration, rows 1 and 2 fail.
- Without the `align-self` declaration, rows 3, 4 and the first of 5 fail.
- Without the `justify-self` declaration, the second of 5 fails.

### `reviewer-2`: the visual row

**Required:** the visual row's vertical divider is drawn, and the recorded baseline shows it.

- **The fixture** can keep `align-items: center`. Under the third amendment, its vertical divider is 32px high, the row's height ([reading](checks/flex-alignment.txt), `row-centered`).
- **The baseline:** `f58200ea1` on `origin/baselines/material-x/divider-1` records the empty box. The recording workflow records the image again on the remediation's head (`RD-13`).
- **Before asking the owner** to review it, the implementer reads the new image's pixels, as the proof did ([reading](../reviews/divider-1/checks/dividers-png.txt)), and reports where the vertical line is: the _Before | After_ band holds a line one pixel wide and the row's height, in the line's colour.

### `reviewer-4`: the card's exclusion of a vertical divider

**Required:** a row fails when the card's rule reaches a vertical direct child.

- **The row** reads where a vertical direct child of `mx-card` is in the inline axis, and not only its width, top and bottom. Under the card's `display: flex`, the line's inline start is its previous sibling's inline end, and its inline end is its next sibling's inline start. The proof's probe reads both as 0 apart ([reading](../reviews/divider-1/checks/probe-layout-ax.txt), `vertical-in-card`). An equivalent in a block card is fine: the line starts where the card's content starts.
- **Witness:** `card-rule-all` (`::slotted(mx-divider)`) fails the row, in the three engines (`RD-62`), because that selector's match is what differs by engine.

### `reviewer-7`: `box-sizing`

**Required:** a row fails when a page's `box-sizing` reset changes the line.

- **The row:** under a page's `* { box-sizing: border-box }`, a `start` divider with a page's `inline-size: 200px` draws a 200px line ([proof's reading](../reviews/divider-1/checks/probe-sizing.txt): 184px without the declaration).
- **Witness:** `no-box-sizing` fails it in the three engines, and `box-sizing-not-important` in Chromium.

### `reviewer-8`: the size count

**Required:** the count names the rows it says it names. The implementer reads the sizes again after the remediation, and the report and the PR's description count the other rows apart from `card/card`, `divider/divider` and `complete`. `divider/divider` grows by the new declarations.

### `reviewer-5`: until the owner answers

The rest of the remediation doesn't wait for Q3. When the owner answers:

- **(a):** the constructor sets the internals' role to `none`. One row in Chromium: a divider with an `id` between `mx-list`'s items has no node, and the list's items stay `listitem`s. **Witness:** the role removed fails it. The JSDoc's and `divider.mdx`'s _"it has no role"_ becomes _"it is presentational"_. The `aria-label` warning stays. The architect amends `RD-70` property 3 before the implementer starts.
- **(b):** the architect narrows property 3. The JSDoc and `divider.mdx`'s _Accessibility_ say that in Chromium an `id` makes the divider an unnamed `generic` node, and advise against an `id` on a divider in `mx-list`. No row: a row would read Chromium's rule for any element with an `id`, not the divider's.

## The implementer's list

1. **Source:** the third amendment's property in `divider/styles/default/main.styles.css`, with its comment.
2. **Docs:** the JSDoc and `divider.mdx`'s _Vertical_, for a vertical divider's height.
3. **Rows:** those under `reviewer-1` and `reviewer-3`, `reviewer-4` and `reviewer-7`, with their witnesses in the three engines, recorded with the implementer's other witnesses.
4. **The visual row:** re-recorded, its pixels read (`reviewer-2`).
5. **The report and the PR's description:** the size readings and their count (`reviewer-8`). `RD-70`'s third amendment gains _"**Implemented** by #343"_ (`RD-68` property 2).
6. **`reviewer-5`:** after the owner's answer to Q3, as above.
7. **Checks:** `handoff.md`'s `.css`, `.ts` and Markdown checks. The divider's, the card's and the list's files in Chromium, with every witness above. The other two engines are CI's. Sizes by the gate.

**Stopping boundary:** the implementer stops and returns to the architect if a row above fails in an engine with the declarations in place, if a row of `mx-list` or `mx-card` other than those named here changes, or if a visual baseline other than `dividers.png` changes.

**Review:** the coordinator compares the remediation's diff with this list. A recheck of the feature proof reads the new rows' witnesses, and the new `dividers.png`.
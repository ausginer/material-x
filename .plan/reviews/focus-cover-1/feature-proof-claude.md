# The covered focus indicators (RF-125, RF-126; #226, #227) — feature proof

**Files were read at:** `e00c28db4`, the head of #231 (`material-x/focus-cover-1`), in slot `g`. The base is `origin/main` at `ee7d838cc`. "`main`" below is a build of this tree with the six changed source files as at `ee7d838cc`. The files were restored and the package rebuilt. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2.

**Subject:** `repo:RF-125` and `repo:RF-126` in [`00-index.md`](../../00-index.md) with the implementer's notes, the readings in [`sortable-observations-1`](../../sortable-observations-1/) and [`focus-cover-1`](../../focus-cover-1/), and the diff `ee7d838cc...e00c28db4`.

**Verdict:**

- **RF-125 holds.** The indicator has the list's three values, and no sibling covers a pixel of it. One consequence of the inside indicator isn't in the entry: an item's own full-bleed media can cover one side of it (`reviewer-3`, the architect's).
- **RF-126 doesn't hold as a whole.** No button covers the indicator. But _"Outside the group, stacking is unchanged"_ fails, at rest and without any focus, in the three engines (`reviewer-1`, tier A, and a regression). The entry's own direction asks for the stacking context that does it, so the architect decides.

## Scope

**Covered** (probes in [`probes`](probes/), on the built elements; every reading is the same in the three engines unless stated):

- **The indicator's samples.** I sampled the indicator's middle line along each straight edge, at device scale 2, and compared each sample with the indicator's own color.
- **Lists** ([readings](checks/list.txt)): `mx-list` and `mx-sortable-list`; each item kind beside each kind; neighbors plain, selected, disabled and hovered; the item itself plain, selected and hovered; first, middle and last; `ltr`, `rtl`, `vertical-rl`, `vertical-lr` and `sideways-lr`; square corners, no gap, and ten kinds of content. 1,117 of 1,135 cases are whole, on all four sides. The other 18 are `reviewer-3`. `main` has 350.
- **Forced colors,** Chromium and Firefox, light and dark: whole in each case but `reviewer-3`'s, and opaque content in Chromium alone, where the outline has an alpha of 0.8 and shows the image through. The indicator is a system color. It is kept for the three kinds.
- **Lifted and moved:** a focused item that a pointer lifts keeps its indicator (static and button items in each engine, and the link item in WebKit; in Chromium and Firefox the link item didn't lift in my probe, on `main` either), and so does each kind after a keyboard move.
- **Dropping the shared focus sheet loses nothing** ([readings](checks/focus-and-contrast.txt)). Tab, `focus()` and a click were read for 13 fixtures: each kind, selected, disabled, a link with no `href`, an item outside a list, a handle, a slotted button and a slotted `mx-checkbox`. The active element and the indicator's thickness, style and color are `main`'s in each, and only the offset differs. A click draws nothing. A disabled link item can be focused by script and draws the indicator, as on `main`. Without focus, the screenshots are `main`'s for the lists and for the groups. In Firefox, two of the screenshots swap between two values that both builds give.
- **Other elements in a list item.** 12 elements were focused in each of three items and in a wrapper in a connected group, and outside. None differs, so the list's −3px doesn't leak into a nested button, checkbox, radio, FAB, text field or list item.
- **Groups** ([readings](checks/groups.txt)): five button kinds × five colors × five sizes × three members (375); `rtl`, vertical and column; every value of the switch buttons; a hovered next button; a disabled neighbor; the Space press; and each member of the split button, 5 colors × 5 sizes × `open` or not × two directions (200). Also a standard group, a connected group in a standard and in a connected group, a split button in a connected group, and wrapped members. 688 of 688 are whole. `main` has 429.
- **The split button's 6 or 7 pixels are antialiasing, as the note supposed.** Each is at one column, at the two curved ends of the outline. With the second button hidden, the edge blends with white (165 179 149). With it shown, it blends with the second button's green (68 102 21). Of the indicator's own color, 0 of 117 or 118 are lost, where `main` loses 89 or 90.
- **Contrast** ([readings](checks/focus-and-contrast.txt)). The ripple's tint doesn't take the indicator below 3:1 against the item's container, in any state that I read: 6.17 at rest, 5.57 to 5.61 hovered and 5.03 to 5.07 pressed. Selected: 5.05, 4.58 to 4.61 and 4.18 to 4.22. A color that the page gives an item (`--md-list-item-container-color`) isn't in this.
- **Stacking around a group, and the private variable's reach** ([readings](checks/stacking.txt)): `reviewer-1` and `reviewer-2`.
- **The rows fail without what they guard** ([readings](checks/mutations.txt)). I reran all 14 of the implementer's mutations in Chromium, and six of them in Firefox and WebKit. The counts are as recorded. Two mutations of my own pass: `reviewer-4`.
- **CI** on `e00c28db4` passes.

**Not covered:** Safari, forced colors in WebKit (no emulation), the visual project, sizes, a user's dark theme, real media (`<video>`) in the lead slot, and screen readers.

## Findings

### reviewer-1

**Tier A, a regression.** A connected group and a split button now take stacking from the page, whether or not a button is focused.

- **Required property:** _"Outside the group, stacking is unchanged: nothing of the page is covered by a focused button that it wasn't covered by."_
- **Observed.** `isolation: isolate` makes the group a stacking context at rest. In the three engines, as built:

  | Page | `main` | Branch |
  | --- | --- | --- |
  | A tooltip in a slotted button's content, `position: absolute; z-index: 10`, then a following `position: relative` block, transform, text field, list, `mx-button` or a second connected group | on top | covered |
  | The same in a split button's label; slotted beside the buttons; or `position: fixed; z-index: 1000` over a following `z-index: 1` | on top | covered |
  | A page button, `position: absolute`, **before** the group, over the group's empty end | the click reaches it | **the click reaches the group** |
  | The same before a split button, and a positioned menu before it | reaches it | reaches the split button |
  | A `z-index: -1` decoration or a `mix-blend-mode` in a group's content | `main`'s paint | the paint differs |

  The same in a plain `mx-button` or a standard group: unchanged on both. A popover in the top layer is unaffected.

- **Why it is a problem.** The tooltip rows are the usual shape of a hand-made tooltip. In the click row the page button is **still visible** (the group has no background), so the page looks right and its button doesn't work. A focused button isn't involved.
- **What the note says.** _"The stacking context changes no paint without focus"_ is right for a group alone. The probe has no page around it. _"A page's `z-index` on a button's content no longer leaves the group"_ is right, and calls it _"not read"_. It is the first two rows of the table.
- **Contract.** The entry's direction says _"the group needs one"_, and the required property says that stacking is unchanged outside. I found no third reading under which both hold. The rows that witness the isolation only test a positioned element **after** the group, which the isolation helps, and not one of the rows above.
- **Required property:** either stacking outside a group is `main`'s, or the entry states which of it changes and why.
- **Route:** the architect. The contract asks for both.

### reviewer-2

**Tier A, a regression, small; the same leak as `repo:RF-122`.** `--_focus-z-index` reaches a button that is inside a group's slotted content, and not only the group's own.

- **Observed.** A focused `mx-button` has `z-index: 1` where it had `auto`: in a popover inside a slotted button or span, in a standard group in a slotted wrapper, and in a popover in a split button's label. In the popover it is then above a positioned overlay of the same popover that covered it on `main` (the hit test gives the button, not the overlay).
- **Bounds.** It doesn't reach a button outside a connected group. A page's own `--_focus-z-index` has no effect, because the published name is another one.
- **Why it is a problem.** The focused button rises over a sibling of its own, in a place that the entry doesn't name. `RF-122` requires a declaration on the reader's own host for this, and lists the reader's exposed names. `--_focus-z-index` is a new one, and no exception for it is recorded.
- **Required property:** a button that isn't a member of the group doesn't take the group's value, or the record lists it as inherited on purpose.
- **Route:** the architect, with `RF-122`, whose check will list it.

### reviewer-3

**Tier A.** A list item's own media that creates a stacking context covers the inside indicator's whole inline start.

- **Observed.** An `img[slot=lead][data-large]` sits on the item's start edge by design (`--_leading-space: 0`). If the image is positioned, or has an opacity below 1, or sits in a positioned wrapper, the indicator's start side has 0 of 84 samples. A plain image is painted below the indicator and is fine. Three item kinds, two lists, three engines (18 cases).
- **Contract.** The required property 2 covers siblings only, so it holds. On `main` the offset was outside, and nothing in an item could cover it. The specification puts the indicator inside, and the entry says that it _"lies inside the item, where `md.comp.list` puts it"_.
- **Why it is a problem.** A lazy image that fades in, or one with a skeleton, meets it. The indicator then has three sides.
- **Also:** an inside indicator lies on the image's colors, and no contrast is guaranteed there. I didn't count it.
- **Required property:** the entry states whether an item's content may cover the indicator.
- **Route:** the architect.

### reviewer-4

**Tier C.** Two wrong repairs of RF-126 pass all 86 rows, in the three engines.

- **Only the first button is raised** (`--_focus-z-index` on `::slotted([data-first])`). The middle member's indicator is then covered. The rows focus the first button only. Required: a row for a button that isn't the first.
- **`position: relative; z-index: 0` instead of `isolation`.** By reading, it has `reviewer-1`'s effects and is a containing block besides. No row tells the two apart or sees either's effect on a page, and the six isolation rows only read a positioned element that follows. Required: rows that match what the architect rules on `reviewer-1`.
- **Route:** the implementer, after the ruling.

## Observations, no finding

- **Uncovering the edge doesn't make it visible in a filled group.** The indicator's color against the next filled button is 75 102 42 on 62 103 0: 1.03:1. The rows tell them apart by a channel (75 against 62, a tolerance of 12). The edge still ends visibly at the 2px gap, and an `elevated` neighbor is 5.87:1. The token's choice and the group's gap, the same as on `main`. For the architect, if the entry meant a visible edge.
- A slotted badge after the buttons, with no `z-index`, is covered by a focused button inside the group, as the direction implies. With `z-index: 1` it isn't.
- With each token misspelled, 21 to 24 rows fail, not only the token's own three, because the value rows and the pixel rows depend on it. The note's _"its row fails for the three kinds"_ is right and not the whole.
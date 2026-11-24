# `mx-card` — plan

**Status: decided as [`repo:RD-53`](../00-index.md), with no question open. Ready for an implementer.** Written by the architect on 2026-11-23, on the coordinator's task for [#171](https://github.com/ausginer/material-x/issues/171), on `material-x/card-1` from `origin/main` at `92a386a17`. It is unit B of the [landing plan](../landing-1/landing-plan.md#order) (`repo:RD-47`). Where the entry and this plan differ, the entry governs. Size: medium. **Amended 2026-11-24** on `reviewer-1` of the feature proof: the [disposition](#disposition-of-reviewer-1-the-host-draws-the-outline-and-the-whole-shadow) has the reason and what it replaced. **Amended again 2026-11-24** on the recheck's findings: the [disposition of the recheck](#disposition-of-the-recheck-the-host-draws-the-padding-too) has the rulings and the work.

## Readings

- **M3's card pages** (_specs_, _guidelines_ and _accessibility_ under `https://m3.material.io/components/cards/`, rendered in Chromium on 2026-11-23):
  - _"The card container is the only required element of a card. All other elements are optional."_ _"Card layouts can vary."_
  - Measurements: shape 12dp, left/right padding 16dp, between cards 8dp at most, label text start-aligned. No vertical padding is given.
  - _"Non-actionable cards are purely containers, so they don't need a role."_ _"the card itself is not a tab stop. However, every actionable element in the card is a tab stop"_. Non-actionable cards don't ripple and have no hover state.
- **The store's sets** `md.comp.elevated-card`, `filled-card` and `outlined-card`. None has a text colour, a text style or a padding token. Each has `icon.*`, and interaction groups (focused, hovered, pressed, dragged, disabled).
- **The elevation stylesheet** at `92a386a17` already carries `RF-77`'s and `RF-78`'s fixes: #152 merged as `986ad3719`. Only the two entries' closures are missing.
- **[`card-box`](probes/card-box.mjs)** ([reading](checks/card-box.txt)), in the three engines: a page's `* { padding: 0; border: 0; outline: 0 }` takes away the host's padding and border, and the host's pseudo-elements' border, and none of the slot's. A slot fills a stretched flex host. The three elevation layers in one `box-shadow` list don't paint as the stylesheet's three boxes do: 65 to 1187 pixels of 44800 differ, by up to 25 per channel.

## The element

|  |  |
| --- | --- |
| Tag, entry | `mx-card`, `card/card` in `files.json`, typed in `react.ts` |
| Attribute, property | `variant`: `'elevated'` or `'outlined'`. Omitted is filled, as `mx-button`'s omitted `color` is |
| Slot | The default slot, and no named slot |
| CSS properties | `--md-card-container-color`, `--md-card-container-shape`, `--md-card-outline-color`, `--md-card-padding` |
| CSS parts, events, methods | None |

- **`variant`, not `color`, because each element follows its own page of the specification** (read in rendered Chromium on 2026-11-23). The card's pages say _"Three variants:"_ ([overview](https://m3.material.io/components/cards/overview)), _"There are three card variants:"_ ([guidelines](https://m3.material.io/components/cards/guidelines)) and _"Select a component variant below"_ ([specs](https://m3.material.io/components/cards/specs)). The button's [overview](https://m3.material.io/components/buttons/overview) says _"Two variants: default and toggle"_ and _"Five color options: elevated, filled, tonal, outlined, and text"_, which is what `mx-button`'s `color` follows. The cost is that the two elements spell `elevated` and `outlined` under different names, as the specification does.
- **Filled is the default,** because it has no shadow and no outline, so it adds nothing to what the consumer puts beside it.
- **One slot, because M3 requires only the container** and the sets have no text tokens. Slots for a headline, a subhead or actions would add typography that M3 doesn't specify. A consumer writes its own headings and buttons, with its own heading level. A `media` slot can come later and break nothing.
- **Padding is 16px on every side.** The inline value is M3's. The block value is this plan's choice, equal to it. `--md-card-padding: 0` gives full-bleed content. The card doesn't clip its content, because clipping would cut focus rings and popups. A full-bleed image rounds its own corners.
- **The card sets no text colour or font.** Content inherits the page's, which is `on-surface` on the landing page.

### Anatomy, as required properties

1. **The host is the card's box** (the `.host` exception _The host is the box_, as `mx-list-item`). It carries the container colour, the shape, the outline, the padding and the elevation layers, so all of them stay on its box whatever the card's size and `overflow` are. The shadow root holds the slot and nothing else, and the slot generates no box, so the content is laid out in the host. Size comes from the content or from the consumer's layout.
2. **The host draws the padding, `!important`,** so that a page's universal reset doesn't change it. Its `box-sizing` is `border-box`, `!important`, so a size that the page gives the card includes the padding, and the card is never smaller than its padding: by default 32px in each axis. The padding behaves as a `div`'s: in a card that is smaller than its content, in either axis, the 16px after the content is reached at the end of the scroll. The host is a block formatting context (`flow-root`), so the content's margins stay inside the card. A host that the layout stretches or sizes is definite for its content, so content with a percentage block size fills the card.
3. **The outline takes no layout space:** the content is inset 16px from the container's edge in every variant, and changing `variant` moves nothing. The outline stays visible in forced colors, so it isn't a shadow. The host's declarations of it are `!important`, so a page's rule, such as a universal reset, doesn't change it. While the host matches `:focus-visible` the card declares no outline, so that the focus indicator, the browser's or the page's, shows.
4. **The host's `box-shadow` is the three elevation layers in one list,** umbra, penumbra, ambient, and no pseudo-element draws one. The host is still `position: relative`, as the `.host` of the other elements is: it is the containing block of the content's absolutely positioned elements, and its shadow paints over the background of the block that follows it. `mx-list-item` and the card adopt one stylesheet in `core/styles/elevation` for it.
5. **`variant` selects a custom state,** through `useAttributes` and `switchState`, as every component's variant does.

### Tokens

|  | Read (the enabled state) | Not read |
| --- | --- | --- |
| All three | `container.color`, `container.shape`, `container.elevation`, `container.shadow-color` | `icon.*`: there is no icon slot. `container.surface-tint-layer.color`: deprecated |
| Outlined | and `outline.color`, `outline.width` |  |
| Interaction groups | — | Focused, hovered, pressed, dragged and disabled: they belong to the interactive card |

Each variant has a token package of its own, with filled as the default. An allow-list selects the tokens, as in the FAB. `shadow.color` comes from `container.shadow-color`, so the card draws its own shadow colour.

### Elevated

**All three variants ship.** The landing plan kept v1 cards filled or outlined until `RF-77` was fixed, and it is fixed on `main`. The elevated card takes level 1 and `md.sys.color.shadow` from its own tokens, and the rows prove both. Filled and outlined cards adopt the same stylesheet at level 0, which paints nothing (`RF-78`).

### Accessibility

The host has no role, no `tabindex` and no ARIA of its own. It doesn't handle a click, a key or focus, and it has no disabled state. A `role`, an `aria-*` or a `tabindex` that the consumer sets on the host stands. Where the card is a list item or an article, the consumer sets the role or puts the card inside the element that has it. The component page says so.

## The interactive card later

Not designed here: whether it is an element of its own or not, and its name. What this unit keeps open:

- **`mx-card` takes no interactive vocabulary:** no `disabled`, `href`, role, event or part, so adding one later breaks no consumer.
- **The token grouping keeps the state in the token's path** (`default`, `hovered`, …), so the interaction groups need only an allow-list change.
- **`variant` and the four CSS properties name the container,** and not the static card, so an interactive card can take them as they are.

## Divider

**Not in this unit.** No part of the page uses it: v1 separates sections by spacing and colour, and M3 itself asks for spacing before dividers where they would do. `RD-47` adds a component outside the first set when a page or a consumer asks for it. Its tokens are in the store, and it stays a small unit in the landing plan's table. The issue's _"possibly a divider"_ is answered: no.

## Work

1. **Source:** `src/card/`, with the element, its template, the styles and three token packages; the shared host-box elevation stylesheet; `files.json` and `react.ts`.
2. **Docs of the component:** JSDoc for the manifest, `card.stories.tsx` (playground, variants, content with actions, full-bleed media) and `card.mdx`, with the accessibility guidance.
3. **Tests,** below, and the runtime-shape snapshot of `traits-baseline`.
4. **Size:** the new row and `complete`, and `list/list-item` before and after. No limit applies.

### Tests

- **`card.browser.test.ts`:** `variant` reflects between attribute and property, and a change replaces the previous state. The card isn't a tab stop, and a link and a button inside it are reached in order. In Chromium's accessibility tree (the existing command) the card adds no role, its heading and link keep theirs, and a consumer's `role="article"` with a name stands.
- **`card.spec.browser.test.ts`,** with contracts `card.elevated`, `card.filled` and `card.outlined`, in each engine at `RD-20`'s floor:
  - per variant, the container's colour and its four corners;
  - the outline's colour and width on the outlined card, and no outline on the other two;
  - the content's inset from the container's edge, 16px, the same in the three variants. The literal carries its provenance: M3's measurements for inline, this plan for block;
  - each of the four CSS properties overrides what it names;
  - the host draws the outline and the slot draws none. **Witness:** the row fails with the outline on the slot;
  - with a page's universal reset of padding, border and outline, the inset and the outline are unchanged. **Witness:** the inset's row fails without `!important` on the host's padding, and the outline's row fails, alone, without it on the outline;
  - the rows of the [disposition of the recheck](#disposition-of-the-recheck-the-host-draws-the-padding-too), each with its witness;
  - on an outlined card with `tabindex="0"` that has keyboard focus, a page's `mx-card:focus-visible` outline is the host's, and without that rule the host's computed outline style is the browser's `auto`. **Witness:** both fail without `:not(:focus-visible)`;
  - in a grid that stretches the card, content with `block-size: 100%` ends 16px from the card's end edge. **Witness:** the row fails with the slot as a block.
- **`core/elevation.spec`:** an elevated card's `box-shadow` is the three layers, in order, at its token's level and in its token's colour, and its pseudo-elements generate no box. The same holds for a static list item, lifted. **Witness:** the row fails without each layer. The four rows on the pseudo-elements' boxes go, because there is no such box. With its own `--_container-shadow-color` set to red, it draws red. **Witness:** the red row fails when the package gives no `shadow.color`. A filled and an outlined card join the level-0 rows.
- **`card.visual.browser.test.ts`:** one screenshot of the three variants with a heading, text and a button. The owner records its baseline (`RD-13`).

### Stopping boundary

The implementer stops and returns to the architect if a property above can't hold in an engine at the floor, or if sharing the host-box elevation rules changes a list item's rendering or its tests.

## Disposition of `reviewer-1`: the host draws the outline and the whole shadow

**Decided 2026-11-24 by the architect,** on the coordinator's task, for `reviewer-1` of the [feature proof](../reviews/card-1/feature-proof-claude.md) at `f63cc1e79`. **Accepted: an element change.** Readings are on the built element in Playwright's Chromium 158, Firefox 159 and WebKit 27.2, and each candidate is a stylesheet adopted after the card's own: [`outline-owner`](probes/outline-owner.ts) ([reading](checks/outline-owner.txt)) reads the outline as painted pixels, and [`elevation-overflow`](probes/elevation-overflow.ts) ([reading](checks/elevation-overflow.txt)) the shadow outside the box.

**The promise:** whatever the consumer's layout and `overflow` do to the card's size, the background, the shape, the outline and the shadow are on the host's box. The padding and the content behave as in any box: they overflow, are clipped, or scroll.

### The outline

| Candidate | On the host's box when smaller, and when scrolled | Universal reset | What it costs |
| --- | --- | --- | --- |
| The slot (until now) | No, no | Kept | — |
| The slot, which shrinks | Yes, no | Kept | The padding after the content is lost in a scroll |
| The slot, which shrinks and inherits `overflow` | Yes, yes | Kept | The slot scrolls, so the host's `scrollTop` and `scrollHeight` don't work |
| The host's outline | Yes, yes | **Lost** | A focus indicator of the browser's is never shown |
| The host's outline, `!important` | Yes, yes | Kept | No focus indicator at all, the browser's or the page's |
| **The host's outline, `!important`, not when `:focus-visible`** | Yes, yes | Kept | A page's own `outline` on an unfocused outlined card isn't applied |
| The host's border, `!important` | Yes, yes | Kept | The content is 17px from the edge, and the card 2px higher. With padding 0, 1px and 2px |
| The same, the slot's margin −1px | Yes, yes | Kept | Full-bleed content covers the border. In Chromium 32px follow the content at the end of a scroll, and not 16px |
| The host's inset shadow | Yes, yes | Kept | Not painted in forced colors (Chromium, Firefox). Content covers it, and a classic scrollbar |
| The host's `::after`, with a border | Yes, no | **Lost** | — |

- **Chosen: the host's outline, `!important`, and not while the host matches `:focus-visible`.** It is the only one that keeps the outline on the host's box, the 16px inset and `--md-card-padding: 0`, forced colors, a page's reset, the focus indicator and the host's own scrolling. An unscrolled card paints the same screenshot as before, natural and stretched, with the default shape, in the three engines.
- **Why `!important` is right here:** a page's rule beats `:host` in the cascade, and for `!important` declarations the order is reversed, so the element's wins. `item/main.styles.css` uses it on the host already. It holds against a reset whose own declarations are `!important` as well.
- **Why the focus exception isn't optional:** Chromium and Firefox make a scrolling card with no focusable content a tab stop with no `tabindex`. Without the exception that card shows no focus. The exception also lets a page's `mx-card:focus-visible` rule apply. A click on a card with `tabindex="0"` keeps the card's outline, because it doesn't match `:focus-visible`.
- **The border was the close second.** It also leaves `outline` to the page, and positioned content doesn't cover it in a scroll. But its 1px is layout space: subtracting it from the padding in `calc()` refuses `--md-card-padding: 0`, which the element documents, and a list such as `8px 24px`.

**Limits, accepted:**

- While the host is `:focus-visible`, the focus indicator replaces the outline. A page that removes both (`* { outline: 0 }`) gets neither.
- On an outlined card, a page's `outline` is applied only while the host is `:focus-visible`. `--md-card-outline-color` changes the color. Until now a page's outline was drawn beside the card's.
- Content at the card's edge that is positioned, or has an `opacity` or a `transform`, paints over the outline, full-bleed or passing the edge in a scroll. Content that has none of them doesn't. The slot's outline had the same limit, and `isolation` doesn't change it.
- `min-block-size` gives no definite size, so percentage content doesn't fill such a card. It didn't before.

### The shadow, which is the same defect

`overflow` other than `visible` clips the host's pseudo-elements, so a card with `overflow: auto`, `hidden` or `clip` loses the umbra and the ambient. The shadow loses up to 61 to 66 of its 93 to 98 levels per channel, in the three engines, and `mx-list-item` the same. `overflow: hidden` is how a consumer would clip full-bleed media, so this is not only the scrolling card. No mechanism for the outline repairs it.

**With the three shadows in one list on the host, the difference between `overflow` and none is 0 pixels,** for both elements, at levels 1 and 3 or 8, in the three engines. So the list is adopted on the host box, and `RD-53`'s clause 4 is amended. The list's difference from three boxes, for which clause 4 rejected it, is read again: at most 3 (Chromium), 18 (Firefox) and 24 (WebKit) of 255, with a mean of 1.0 to 6.3. At level 1 it is 20 to 280 pixels: in Chromium and Firefox all are at the corners. The recheck reads the card too ([where](../reviews/card-1/checks/recheck/where.txt)): away from the corners the differences are at most 1 for the list item, and for the card at most 1 in Chromium and Firefox and 5 in WebKit. At the corners they are up to 24 for the list item and 26 for the card, in WebKit. Most of the pixels that differ are away from the corners, at most 1 for the list item. That difference is accepted: it is small, where clipping takes about two thirds of the shadow's darkest point.

It costs that the host-box elements are drawn unlike `.host` ones, which keep the three boxes, and that `mx-list-item`'s shadow changes by those pixels. It removes two pseudo-elements for each element, and `reviewer-3`'s class of defect, because a host's own shadow can't be missing its box.

### What the implementer changes

1. **`card/styles/outlined/main.styles.css`:** the outline and its offset go from the slot to `:host(:state(outlined):not(:focus-visible))`, `!important` on both. **`default/main.styles.css`:** the slot's `border-radius` goes, its comment says what it still draws, and `flex: 1 0 auto` and the two resets stay (`RF-122` removes the resets).
2. **`core/styles/elevation/host-box.styles.css`:** one `box-shadow` list on `:host`, `position: relative` stays, the pseudo-elements go.
3. **Tests,** as amended above. The row on the outline's corners reads the host only. `reviewer-3`'s four rows go with the boxes they read. `reviewer-4`'s row keeps its meaning, with the witness above. The screenshot's baseline is recorded after this change.
4. **JSDoc and `card.mdx`:** the card's own outline limits above (the page's `outline`, and positioned full-bleed content), and one sentence that a card may be smaller than its content or scroll.
5. **The report:** witnesses, the suite's affected files in the three engines, and the size rows. The elevation rows of `.host` elements don't change.

**The implementer stops** if one of the host's declarations can't hold in an engine, or if a list-item row other than those named must change.

**Nothing is the owner's to answer.** The element is unreleased, its surface doesn't change, and clause 3 already gave the outline to the card.

**Not read:** Safari, Edge, a mobile browser, a page zoom or a device pixel ratio other than 1, print, RTL scrollbars, and classic scrollbars outside Chromium. Forced colors in WebKit aren't emulated. A real implementation wasn't built.

## Disposition of the recheck: the host draws the padding too

**Decided 2026-11-24 by the architect,** on the coordinator's task, for `reviewer-5` to `reviewer-9` of the [recheck](../reviews/card-1/recheck-claude.md) at `dc3a98c82`. All five are accepted. One property changes its owner, and nothing is the owner's to answer: the element is unreleased and its surface doesn't change.

### `reviewer-5`: the element keeps the promise, and the padding moves to the host

Read on the built element in Playwright's Chromium 158, Firefox 159 and WebKit 27.2, each candidate as a stylesheet adopted after the card's own: [`padding-owner`](probes/padding-owner.ts) ([reading](checks/padding-owner.txt)). The engines agree on each line below.

| Candidate | 16px after the content, block and inline (RTL and `vertical-rl` too) | A reset, with `!important` too | What else changes |
| --- | --- | --- | --- |
| The slot (until now) | Block only | Kept | — |
| The slot, as wide as its content's min-content | Both | Kept | **A `pre` with `overflow: auto` in the card doesn't scroll:** 396px wide in Chromium and WebKit, 366px in Firefox, and not 168px. Text beside wide content doesn't wrap at the card's edge |
| The host, `!important`, with a slot that has a box | Block only | Kept | — |
| The host, `!important`, no box on the slot, host `block` | Both | Kept | With padding 0, the content's margins leave the card |
| **The host, `!important`, no box on the slot, host `flow-root`** | Both | Kept | A page's `padding` on the card is ignored. Until now it was added to the slot's (56px, and not 16px, for `padding: 40px`) |
| The same, not `!important` | Both | **Lost** | — |

- **Chosen: `padding: var(--md-card-padding, 16px)` and `box-sizing: border-box` on `:host`, both `!important`, `display: flow-root` on `:host`, and no box on the slot** (`display: contents`, the browser's own for a slot). It is the one candidate in which the padding is that of a plain box, which is what the disposition above promises. The reading equals a `div` with `padding: 16px` in the six scrolled cases: block, inline, inline in RTL, both, both with `overflow: hidden`, and `vertical-rl`.
- **Nothing else changes in what was read here:** the 14 cases of size and inset (a natural card, the two resets, `inline-size: 100%` and `fit-content`, `--md-card-padding` of `0` and `8px 24px`, margins with padding 0, percentage content in a stretching grid and flex line, in a block size and in `flex: 1`, an absolute child, and a page's `padding`) read as the built card, apart from the last. A screenshot of 18 cards (three variants, with a button, headings, full-bleed content, a smaller card, a scrolled one and bare text) is the built card's, to the pixel, in the three engines. A checkbox in the card still doesn't paint the container color.
- **One more thing changes, and it is accepted** (2026-11-24, by the architect, on the [report](card-report.md#disposition-of-the-recheck-implemented-2026-11-24)'s reading): the card can't be smaller than its padding. With `block-size: 10px` it is 32px high, where it was 10px with the padding on the slot. No case above is below 32px, so this list missed it: it said _"Nothing else changes"_, and property 2 said only that a size that the page gives the card _"includes the padding"_. Both are corrected.
  - **Why it is accepted:** it is what "the padding is that of a plain box" means. A `div` with the same padding and `border-box` is 32px high too, and no pixel of the case differs from it in the three engines ([reading](checks/box-padded-reference.txt)). CSS takes the padding from a `border-box` size and stops at a content size of 0, in either axis (the block axis was read). The host can't draw the padding and be smaller than it, so the alternative is the padding on the slot, which loses `reviewer-5`.
  - **The cost:** `block-size: 0` doesn't collapse a card, and neither does a layout that shrinks it to nothing. A page that collapses one also sets `--md-card-padding: 0`, or puts the card in an element that it collapses, as for a `div`. Neither was run.
  - **The promise of the first disposition stands:** the background, the shape, the outline and the shadow are on the host's box, which is 32px high here.
  - **No row and no sentence in the documentation.** The size row in the work list reads the declaration, and a row on this would test how the browser computes it. The JSDoc and `card.mdx` say that a card may be smaller than its content, which still holds.
- **The narrower promise was rejected.** It would have left a card that scrolls a wide table ending on its own outline, where this costs two `!important` declarations and removes the slot's layout.
- **`!important` on padding has the same reason as the outline's,** and it leaves one way to set the padding, `--md-card-padding`. A page that styles `mx-card { padding }` changes nothing. The JSDoc says so.
- **The content is laid out by the host,** so a page's own `display: grid` or `flex` on the card lays out the content directly. Before, it laid out the slot. Not read.
- **Not read:** Safari, classic scrollbars, page zoom, print, a percentage `--md-card-padding` (it resolves against the card's container, and not the card), and fragmentation. A real implementation wasn't built.

### `reviewer-8`: the rows

| Mutation | Ruling |
| --- | --- |
| The slot shrinks, and the slot shrinks and inherits `overflow` | **One row.** The slot's layout that they mutate is gone, so their place is the row below on the end of a scroll |
| `outline-offset` without `!important` | **A row** |
| The outline rule in every variant | **A row** |
| `:not(:focus)` for `:not(:focus-visible)` | **A row** |
| No `position: relative` | **Kept, and a row.** The pseudo-elements were its first reason and are gone. It stays for the second one: the card is the containing block of its content, and its shadow paints over the next block's background. It is also what the other elements' `.host` gives. Without it, 756 to 962 pixels differ, by up to 92 of 255 (the recheck's reading) |
| `overflow: clip` on the host (the recheck's _not new_) | **A row.** Clause 3 says that the card doesn't clip its content |

`mx-list-item` shares the stylesheet and no pixel differs for it without the declaration, so it gets no row of its own.

### `reviewer-6`, `reviewer-7` and `reviewer-9`

- **`reviewer-6`: the route stands,** JSDoc and `card.mdx`, with this property: neither says that the card takes no focus, or isn't a tab stop, without saying that a card that scrolls can be one. They say that the card adds no tab stop of its own, and that a browser may make a scrolling card one: Chromium and Firefox do when it has no focusable content, and WebKit doesn't (Playwright's was read, and not Safari, so the words name WebKit). `card.mdx`, _Keyboard_, adds that such a card needs `tabindex="0"`, a role and a name to be scrolled from the keyboard in each browser.
- **`reviewer-7`: the route stands.** JSDoc and `card.mdx` say that content at the card's edge that is positioned, or has an `opacity` or a `transform`, paints over the outline. They don't name full-bleed media as such. Other properties that create a stacking context weren't read, so the list isn't called complete.
- **`reviewer-9`: corrected,** in `RD-53` and above. The claim that the shadow's difference is _"mostly at the corners"_ is about the size of the difference, and not the number of pixels. The pull request's description says the same words and is the implementer's.

### The work list

1. **`card/styles/default/main.styles.css`:** the declarations of _Chosen_ on `:host`, `display: flow-root` in place of the flex column, and the slot with its two resets only (`RF-122` removes them). The comment says why the padding is `!important`.
2. **`card.spec` rows:**
   - **The end of a scroll:** an outlined card with `overflow: auto`, smaller than its content in both axes, scrolled to its end: 16px follow the content in each axis, and the card's own `scrollTop` and `scrollLeft` aren't 0. **Witness:** the row fails with the padding on a block slot (inline) and with a slot that scrolls.
   - **The content's margins:** with `--md-card-padding: 0`, content with a margin of 20px makes the card 40px higher than without it. **Witness:** fails with `display: block`.
   - **The size:** under a page's `* { box-sizing: content-box !important }`, a card with `inline-size: 200px` is 200px wide. **Witness:** fails without `border-box`, and without its `!important`.
   - **The page's padding:** `mx-card { padding: 40px }` leaves the inset at 16px, in the three variants. **Witness:** fails without `!important`. (The reset rows read the same declaration with 0.)
   - **The page's `outline-offset`:** `mx-card { outline-offset: 4px }` leaves an outlined card's offset at `-width`. **Witness:** fails without `!important` on the offset alone.
   - **The other variants:** a page's `mx-card { outline: 2px dotted … }` is the computed outline of a filled and an elevated card. **Witness:** fails with the outline rule on every `:host`.
   - **A click:** a pointer click on an outlined card with `tabindex="0"` leaves its outline as the token's. The row first asserts that the card is focused and doesn't match `:focus-visible`. **Witness:** fails with `:not(:focus)`.
   - **The containing block:** a slotted `position: absolute; inset: 0` element has the card's box. **Witness:** fails without `position: relative`.
   - **No clipping:** content that passes the card's edge is hit by `elementFromPoint` outside the card. **Witness:** fails with `overflow: clip` on the host.
3. **The witnesses of the existing rows, again:** the inset under a reset, _without_ `!important` in place of _on the host_. The percentage row, with the slot as a block. The outline's and the layers' as they are. _Should draw no outline on the slot_ stays.
4. **JSDoc and `card.mdx`:** `reviewer-6` and `reviewer-7`. One sentence in JSDoc: `--md-card-padding` sets the padding, and a page's `padding` on the card doesn't.
5. **The report:** the witnesses in the three engines, the affected files of the suite, the size rows, and the pull request's description corrected for `reviewer-9` and for what draws the padding.
6. **Stop** and return to the architect if a property above can't hold in an engine at the floor, or if a list-item row must change.

**Recheck owed, and narrow:** the box probe of the recheck (its 13 cases for each variant), the focus probe and the mutations, on the implementation. The screenshot's baseline may be recorded before it: no pixel of the 18 cards changes. They aren't the visual file's own page.

## Owed after the merge

**One documentation unit,** because project documentation has its own pull request: `architecture.md` (`mx-card` in _The host is the box_ and in the component list), `accessibility.md` (a Card section) and the package README's component list, which also lacks the checkbox, the radio and the list elements.
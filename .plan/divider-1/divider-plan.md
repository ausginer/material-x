# `mx-divider` — plan

**Status: decided as [`RD-70`](../decisions/RD-70.md), and ready for an implementer.** The owner answered [Q1](#q1--the-inset-attribute) (a) and [Q2](#q2--a-divider-in-a-card) A2. Until then, Q2 was open, and the decision was to be minted on its answer. Written by the architect on 2026-11-27, on the coordinator's task for [#333](https://github.com/ausginer/material-x/issues/333), on `material-x/divider-1` from `origin/main` at `e7fa0d5f8`. Size: **small** (the issue says medium; the element has one token set with two tokens and no behavior).

## Readings

- **M3's divider pages** (_overview_, _specs_, _guidelines_, _accessibility_ under `https://m3.material.io/components/divider/`, rendered in Playwright's Chromium 158 on 2026-11-27, [probe](probes/m3-pages.mjs), [reading](checks/m3-pages.txt)):
  - Measurements: _"Divider full-width 100%"_, _"Divider inset left margin 16dp"_, _"Divider inset right margin 0dp"_, _"Divider middle-inset left margin 16dp"_, _"Divider middle-inset right margin 16dp"_. The other three rows (_"Space between divider & supporting-text 4dp"_, right and bottom margin 8dp) place a divider in a layout, and belong to the layout.
  - _"The divider can be used in two ways: Full width, Inset"_. _"Inset dividers are equally indented from both sides of the screen by default"_ contradicts the measurements, which give the inset 16dp on one side only. This plan follows the measurements.
  - _"Configurations: Ability to have vertical dividers"_, and _"A vertical divider can be used to arrange content on a larger screen"_. No measurement is given for a vertical divider.
  - Full-width dividers _"can be used directly on a surface or inside other components like cards or lists"_. _"Do: Use full-width divider lines to separate interactive and non-interactive areas of a container such as a card"_.
  - _"Dividers are decorative elements, which have no contrast minimums."_
- **The store's set `md.comp.divider`:** `color` → `md.sys.color.outline-variant`, and `thickness` 1dp. Nothing else. `md.comp.list` has `divider.leading-space` and `trailing-space` (16dp) and `top-space` and `bottom-space` (0). Its `divider.color` and `divider.height` are deprecated.
- **material-web's `md-divider`:** three booleans, `inset` (both sides), `inset-start` and `inset-end`, 16px each; `--md-divider-color` and `--md-divider-thickness`; no role, and _"Add a `role="separator"` attribute to non-decorative dividers"_; the line is a pseudo-element painted `CanvasText` in forced colors; no vertical divider.
- **[`aria`](probes/aria.mjs)** ([reading](checks/aria.txt)), Chromium 158 with the repository's axe-core: a divider-like element with no role isn't in Chromium's accessibility tree, in a plain container or in an element whose `ElementInternals` role is `list`, as `mx-list`'s is. With `role="separator"` it is a `separator`, horizontal, or vertical with `aria-orientation`. axe reports no violation in any case, because it doesn't see an internals role. ARIA still allows only `listitem` in a `list`, so a separator there is invalid though nothing reports it.
- **`mx-sortable-list`** takes every `ControlledElement` child as a sortable item (`sortable-list.ts`), so a divider there would be reordered with the items.

## The element

|  |  |
| --- | --- |
| Tag, entry | `mx-divider`, `divider/divider` in `files.json`, typed in `react.ts` |
| Attributes, properties | `inset`: `'start'` or `'middle'`, full-width when omitted ([Q1](#q1--the-inset-attribute)). `orientation`: `'horizontal'` or `'vertical'`, horizontal when omitted |
| CSS properties | `--md-divider-color`, `--md-divider-thickness` |
| Slots, parts, events, methods | None |

- **Vertical is in,** because M3 lists it as a configuration. It costs one state and its rows. `orientation` is the ARIA word, so it maps to `aria-orientation` with no translation.
- **No inset property.** M3 gives the inset as a measurement and the store has no token for it, so the 16px is a literal. A page aligns a divider with something else by its own `margin` on a full-width divider. A property can be added later without breaking a consumer.
- **No margin of its own.** The space around a divider is the layout's, as M3's 4dp and 8dp rows are.
- **Attributes resolve to custom states** (`useAttributes`, `switchState`), as `mx-card`'s `variant` does.

### Geometry, as required properties

1. **The host is the box** (the `.host` exception _The host is the box_, as `mx-list-item` and `mx-card`). The shadow root holds no element. `architecture.md`'s exception names `mx-divider`.
2. **Horizontal:** the line is `thickness` high and as wide as its container, less the insets. The host takes exactly that block size.
3. **Vertical:** the line is `thickness` wide and as high as the layout makes the host. In a flex row or a grid the default stretch gives it the row's height. Elsewhere it has no height, and the page gives it one. The docs say so.
4. **Insets** are logical: they mirror in a right-to-left container. On a vertical divider they apply along the line, from its block start, which is this plan's choice, because M3 has no measurement for it.
5. **A page's universal reset** (`* { margin: 0; padding: 0; border: 0 }`) changes neither the line, its thickness, nor its insets. **A page's `margin` on the divider applies,** except a direct child's inline margin in a card, which doesn't move the line (Q2 A2).
6. **In forced colors** the line is `CanvasText`.
7. **The line's color and thickness come from the token package,** and the two CSS properties override them.
8. **The line is an absolutely positioned box whose containing block is the divider's host,** which is `position: relative`. It takes its thickness from its own size and its block position from its static position, never from `inset-block`. `mx-card` relies on this, so a comment in each stylesheet names the other.

### Accessibility

**Decorative by default, as M3 says:** the internals' role is `none`, and there is no tab stop and no node in the accessibility tree. Without a role, Chromium gives a host that holds an absolutely positioned line a `generic` node ([reading](checks/host-role.txt)), and `none` removes it (`RD-70`'s amendment). A page's `aria-label` on the divider overrides `none`, so the docs say that a decorative divider takes no label. That is also what makes it valid directly inside `mx-list`. A page that wants a separator announced sets `role="separator"` on a divider outside a list. `orientation` sets the internals' `ariaOrientation`, so a vertical separator is exposed as vertical without the page writing `aria-orientation`, and a page's `aria-orientation` stands. The docs say not to give a divider `role="separator"` in `mx-list`.

## Composition

- **`mx-list`:** a divider is a direct child of the list, between items. The list is a flex column, so a horizontal divider takes the list's width. The list's items inset their content 16px at each side by default (`md.comp.list.list-item.leading-space` and `trailing-space`), so `inset="start"` lines the divider up with the items' content, and the middle inset matches the list set's 16dp `divider.leading-space` and `trailing-space`. **`mx-list` doesn't change.** `list.mdx`'s delta _"dividers are not included"_ becomes a pointer to `mx-divider`.
- **`mx-sortable-list`:** not supported, because the list would sort the divider with its items. M3 says _"Use dividers to group things, not separate individual items"_. The divider's page says so, and the sortable list doesn't change.
- **`mx-card`:** [Q2](#q2--a-divider-in-a-card).

## Questions for the owner

### Q1 — the inset attribute

**Answered by the owner on 2026-11-27, (a): `inset="start" | "middle"`,** relayed by the coordinator, who translated his words. He gave two reasons. The decision records both:

- _"Three booleans mean all three can technically be set at once, and then how do you tell which one applies 😅 That's why I gave up booleans like that in mx."_ **This is a rule for every component.** Asked whether to record it, the owner said, on 2026-11-27: _"Yes, let's record it. It's an important parameter that I try to stick to."_ `RD-71` puts it into [`attribute-vs-state-styling.md` §Public Attributes](../../.agents/docs/attribute-vs-state-styling.md#public-attributes), with #337, and `RD-70` applies it. Until then, no record stated it: it wasn't in `CONTRIBUTING.md`, `attribute-vs-state-styling.md`, `architecture.md`, the decisions or the index (searched on 2026-11-27 for _boolean_, _booleans_ and _mutually exclusive_).
- _"And `variant` looks like extra noise, because it all comes down to inset anyway."_

What M3 names, and the options he chose from: full-width, _inset_ (16dp at the start) and _middle-inset_ (16dp on both sides). (b) was material-web's `inset`, `inset-start` and `inset-end`, and (c) was `variant="inset" | "middle-inset"`. `end` can be added later without breaking a consumer, but M3 has no end-only inset.

### Q2 — a divider in a card

**Answered by the owner on 2026-11-27: A2,** relayed by the coordinator: `position: static` on a horizontal direct-child divider in `mx-card`, so its line is positioned against the card's padding box. `RD-70` records it. What follows is what he chose from. Until his answer, this said _"Open."_

The owner declined both earlier options (the card names `mx-divider`, or nothing). He proposed his own idea, the card's padding on its slotted content, and asked to have it challenged. He then proposed `::slotted(mx-divider)` with a negative margin. He leans to the earlier (a), which that idea is a mechanism of, and that isn't an answer yet.

`mx-card` has 16px of padding on its own box (`RD-53` clause 3 and its notes), so a divider inside it ends 16px from each edge. M3's example of a full-width divider in a card reaches the card's edges, and M3 measures the inset from the container's edge.

**[`card-bleed`](probes/card-bleed.mjs)** ([Chromium 158](checks/card-bleed-chromium.txt), [Firefox 159](checks/card-bleed-firefox.txt), [WebKit 27.2](checks/card-bleed-webkit.txt)). It runs five card stylesheets, each with `mx-card`'s host rule, and a divider-like element whose line is an absolutely positioned box. It reads each target's distance from the card's edges, on a plain page and under a universal reset of margin, padding and border. The inline geometry is the same in the three engines. The figures below differ only where a text width does.

| px from the card's start / end edge | Today | P: padding on `::slotted(*)` | A1: `::slotted(mx-divider)` negative margin | A2: `::slotted(mx-divider)` `position: static` |
| --- | --- | --- | --- | --- |
| Full-width divider | 16 / 16 | **0 / 0** | **0 / 0** | **0 / 0** |
| `inset="start"` | 32 / 16 | **16 / 0** | **16 / 0** | **16 / 0** |
| `inset="middle"` | 32 / 32 | **16 / 16** | **16 / 16** | **16 / 16** |
| Full-width, `--md-card-padding: 8px 24px` | 24 / 24 | 0 / 0 | 24 / 24 (the `calc()` is invalid) | **0 / 0** |
| Divider in a child `div` | 16 / 16 | 16 / 16 | 16 / 16 | 16 / 16 |
| Divider with a page `margin-inline-start: 56px` | 72 / 16 | 56 / 0 | 0 / 0 | 0 / 0 |
| Vertical divider in a page's flex card | 35.6 | its box takes 32px of padding | unchanged | unchanged |
| A text node | 16 | **0** | 16 | 16 |
| A direct `display: contents` button (as `mx-button`) | 16 | **0** | 16 | 16 |
| Media, first, `inline-size: 100%` | 16 / 16 | **0 / −32** (overflows) | 16 / 16 | 16 / 16 |
| A `p` with a page `padding: 8px` | 24 | **16** (the page's is ignored) | 24 | 24 |
| Second column of a page's two-column grid | 160 | 176 | 160 | 160 |

A1 and A2 hold under the universal reset as on a plain page, and so does P, with `!important`. A fifth stylesheet, every slotted element bleeding out by a negative margin and padded back in, is in the readings. It keeps text and buttons in place, and moves a `box-sizing: border-box; inline-size: 100%` child 16px off centre. It also ignores a page's padding and inline margin on every direct child. It isn't an option.

**What `::slotted` costs, in every design:**

- **It reaches only the card's direct children.** A divider in a child `div` spans that `div` in every design.
- **Its declarations lose to every page rule on the element, whatever their specificity.** For normal declarations, the outer tree's rule wins over the shadow tree's, before specificity is compared. So a `::slotted` declaration that a universal reset touches (`margin`, `padding`) needs `!important`, and then no page rule can change it. A declaration that no reset touches (`position`) can stay normal, and then a page's rule on the element still wins. A2 is the only design that takes this route.

#### The options

- **P — the padding on the slotted content (the owner's first idea). Not recommended: it costs more than it gives.** It gives full-bleed media and dividers with no rule naming an element. What it costs:
  - **Content that isn't a box that pads loses its inset:** a text node directly in the card (`<mx-card>Filled</mx-card>`, the _Variants_ story and the axe row), and every `display: contents` host, such as `mx-button` directly in the card (_Content with actions_).
  - **A page's own padding on a direct child is ignored,** because the card's needs `!important` against a universal reset. In _Full-bleed media_, the body `div`'s `padding: 16px` and the card's `--md-card-padding: 0` give its text no inset at all.
  - **A child's own box takes the padding:** media with `inline-size: 100%` overflows by 32px. A divider and a vertical divider get padding that their line has to ignore.
  - **`--md-card-padding` changes meaning:** with two values, `padding-inline` reads them as start and end (the text's start moves from 24 to 8).
  - **`RD-53`'s contract moves:** clause 3 (the host draws the padding, and the card is never smaller than it), the scroll's end padding, the grid and flex rows, and most of `card.spec`'s inset rows, with three of the four stories.
- **A — the card's rule names `mx-divider` (the earlier (a), and the owner's second idea is its mechanism A1).** Only a horizontal divider that is a direct child of the card changes. A vertical divider, a nested divider and all other content don't. The insets are measured from the card's edge, as M3 measures them. `--md-card-padding`, the card's sizes, its stories and its existing rows don't move.
  - **A1, a negative margin of `calc(-1 * var(--md-card-padding, 16px))`, `!important`:** with a `--md-card-padding` of two or more values the `calc()` is invalid, so the divider spans the content box. A page's inline margin on the divider is ignored.
  - **A2, `position: static` on the divider. Recommended.** The divider's line is then positioned against the card's padding box: the card is `position: relative` (`RD-53` clause 4) and has no border. It reaches the edges with any `--md-card-padding`, and it needs no `!important`, because no reset sets `position`. A page's `position: relative` on the divider opts it out: the line then spans the content box ([reading](checks/card-bleed-chromium.txt), _"divider, page position: relative on it"_). A page's inline margin on the divider doesn't move the line. **The cost is a contract between the two stylesheets:** the card relies on the divider's line being an absolutely positioned box against its host (geometry 8). A divider row and a card row keep it, and a comment in each stylesheet names the other. Not read: a card that scrolls horizontally. There, the line spans the card's padding box and not its scroll width.
- **(b) — nothing.** The divider spans the card's content box, and the page pulls it out with its own negative margin, repeating the card's padding.

**Recommended: A2.** It is the only design that meets M3's geometry for every `--md-card-padding` and leaves the rest of the card's content and contract as they are. Its coupling is one rule, which the tests keep.

**What changes in `mx-card`:** one rule in `card/styles/default/main.styles.css`, which makes a horizontal `mx-divider` direct child `position: static`, with its comment. It selects the divider's state (`::slotted(mx-divider:not(:state(vertical)))`), or its attribute where `:state()` doesn't match inside `::slotted()` in an engine. The JSDoc and `card.mdx` gain one sentence: _"A horizontal `mx-divider` that is a direct child of the card reaches the card's edges, and its inset is measured from the card's edge."_ `card.stories.tsx` gains a story with a divider. `card/card`'s size row grows by the rule. Nothing else in the card moves: no attribute, property, padding, size, existing row or story.

## Work

1. **Source:** `src/divider/`: the element with its trait (`DividerLike`), the styles and one token package from `md.comp.divider` with both tokens; `files.json`; `react.ts`. The card's rule, its comment, and a story with a divider in `card/`.
2. **Docs:** JSDoc for the manifest (`@attr`, `@cssprop`, the decorative default, `role="separator"` outside a list, the vertical divider's height, the sortable list). `divider.mdx` with `card.mdx`'s sections: Summary, When to use, When not to use, Quick start, Insets, Vertical, In a list, In a card, Accessibility, Anatomy, Theming, API reference, Material 3 reference and deltas, Changelog. `divider.stories.tsx`: _Playground_ (inset and orientation controls), _Insets_, _Vertical_, _In a list_, _In a card_. `list.mdx`'s delta, and the card's JSDoc and `card.mdx`.
3. **`architecture.md`:** the exception _The host is the box_ names `mx-divider`.

### Tests

The rows run in each engine at `RD-20`'s floor. A literal 16px carries its provenance: M3's specs page, _Measurements_, read 2026-11-27 ([reading](checks/m3-pages.txt)).

- **`divider.browser.test.ts`:** both attributes reflect between attribute and property, and a change replaces the previous state. The divider isn't a tab stop. In Chromium's accessibility tree (the existing command), a divider has no node bare, in a container, in `mx-list` and as a horizontal direct child of `mx-card`, and the list's items stay `listitem`. **Witness:** the `mx-list` row fails without `internals.role = 'none'`, because the host is then a `generic`. With `role="separator"` it is a horizontal `separator`, and vertical with `orientation="vertical"` and no `aria-orientation`. **Witness:** the vertical row fails without the `ariaOrientation` mapping. A page's `aria-orientation="horizontal"` on a vertical divider stands.
- **`divider.spec.browser.test.ts`,** contract `divider`:
  - the line's color and thickness against the contract, horizontal and vertical, and the host's block size (horizontal) or inline size (vertical) equal to the thickness;
  - full-width spans its container; `start` starts 16px from the start edge and reaches the end edge; `middle` is 16px from both; both mirror under `dir="rtl"`; on a vertical divider in a 48px-high flex row, the line is 48px high, and the insets are measured from its block start;
  - each CSS property overrides what it names;
  - with a page's universal reset, the line and the insets are unchanged. **Witness:** the row fails when the inset is a host declaration that the reset beats;
  - a page's `margin-block` and `margin-inline-start` on a full-width divider apply;
  - with `emulateForcedColors(true)`, the line is `CanvasText`. **Witness:** the row fails without the forced-colors rule, if the line is painted in a way that forced colors overrides;
  - in `mx-list`, a horizontal divider has the list's width;
  - in `mx-card`: a horizontal direct-child divider spans the card's border box with the default padding, with `--md-card-padding: 24px` and with `8px 24px`; `start` is 16px from the card's start edge, and `middle` 16px from both; it mirrors under `dir="rtl"`. **Witness:** these fail without the card's rule. A page's universal reset changes none of them. A page's `position: relative` on the divider makes it span the content box. A vertical direct child and a divider in a child of the card are as they are outside a card;
  - the divider's side of the contract: with a page's `position: static` on a divider in a `position: relative` container with 16px of padding, the line spans the container's padding box. **Witness:** the row fails when the line is in flow.
- **`axe.browser.test.ts`:** rows for `mx-divider` bare (`hasNoRule`), with `role="separator"`, vertical with `role="separator"`, and in `mx-list`.
- **`traits-baseline`:** `DividerLike`'s runtime-shape snapshot.
- **`divider.visual.browser.test.ts`:** one screenshot: the three insets, a vertical divider in a row, a list with dividers, and a card with one. The recording workflow records its baseline, and the owner reviews it (`RD-13`).

### Size

`divider/divider` is a new row. `complete` is read before and after. **Every other row is the control and stays byte for byte,** except `card/card`, whose growth is reported. No limit applies yet (`RD-24`).

### Stopping boundary

The implementer stops and returns to the architect if a property above can't hold in an engine at the floor, if the forced-colors row and the universal-reset row need mechanisms that conflict, or if a row of `mx-list` or `mx-card` other than those named here changes. If `:state()` doesn't match inside `::slotted()` in an engine, the card's rule selects the `orientation` attribute, and the return says so. **Dated 2026-11-27 by the implementer: the unit stops at the stopping boundary, because in Chromium a `position: relative` host gives the divider a node in the accessibility tree,** on `material-x/divider-1`, after merging `origin/main` at `2ed4b96ab` (`537d37f53`), requested by the coordinator. The owner, asked on 2026-11-27, chose to return it to the architect rather than to set an internals role of `none` or to keep the node. No pull request is open.

- **What conflicts:** geometry 8 makes the host `position: relative`, so the line's containing block is the host, and `mx-card`'s A2 rule relies on it. _Accessibility_ and `RD-70` property 3 ask for no role and no node. In Chromium 158 they don't both hold ([probe](probes/ax-positioned.mjs), [reading](checks/ax-positioned.txt)):
  - With no role, a host with `display: block; position: relative` is a `generic` node: `paragraph > generic > paragraph` in a container, and `list > listitem > generic > listitem` in an element whose internals role is `list`, as `mx-list`'s is. It has no name.
  - The same host without `position` has no node, with or without the line's `::before`. So `position` alone causes it. The plan's [`aria`](probes/aria.mjs) probe had no styles, which is why it read no node.
  - With an `ElementInternals` role of `none`, the positioned host has no node in either place, and a page's `role="separator"` still makes it a `separator`, horizontal or, with `aria-orientation="vertical"`, vertical.
- **Not read:** Firefox and WebKit, and what a screen reader does with the unnamed `generic`.
- **Options the owner was shown:** an internals role of `none`, which keeps every other property and changes _"no role"_. Keeping the node, which drops the _"no node"_ rows. Returning to the architect, for example for a containing-block mechanism other than `position`, which would change the card's A2 rule. He chose the last.
- **What was built and isn't committed:** in slot f's working tree, `src/divider/` (the element, its token package and stylesheet), its entries in `files.json`, `package.json` and `react.ts`, the card's rule and its comment, and `tests/divider/divider.browser.test.ts`. In Chromium, that file's attribute, state, shadow-tree, focus and separator rows pass (17), and its three _"no node"_ rows fail as above. No other row, doc, story or size reading was made.
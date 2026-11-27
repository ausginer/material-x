# `mx-divider` — plan

**Status: proposed, with two questions for the owner ([Q1](#q1--the-inset-attribute), [Q2](#q2--a-full-width-divider-in-a-card)). The decision is minted when he answers them,** at the next free `RD-` at that time. Mx Architect B is planning `mx-select` in parallel, so a number taken now could collide. Written by the architect on 2026-11-27, on the coordinator's task for [#333](https://github.com/ausginer/material-x/issues/333), on `material-x/divider-1` from `origin/main` at `e7fa0d5f8`. Size: **small** (the issue says medium; the element has one token set with two tokens and no behavior).

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
| Attributes, properties | The inset ([Q1](#q1--the-inset-attribute)), and `orientation`: `'horizontal'` or `'vertical'`, horizontal when omitted |
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
5. **A page's universal reset** (`* { margin: 0; padding: 0; border: 0 }`) changes neither the line, its thickness, nor its insets. **A page's `margin` on the divider applies.**
6. **In forced colors** the line is `CanvasText`.
7. **The line's color and thickness come from the token package,** and the two CSS properties override them.

### Accessibility

**Decorative by default, as M3 says:** no role, no tab stop, and no node in the accessibility tree. That is also what makes it valid directly inside `mx-list`. A page that wants a separator announced sets `role="separator"` on a divider outside a list. `orientation` sets the internals' `ariaOrientation`, so a vertical separator is exposed as vertical without the page writing `aria-orientation`, and a page's `aria-orientation` stands. The docs say not to give a divider `role="separator"` in `mx-list`.

## Composition

- **`mx-list`:** a divider is a direct child of the list, between items. The list is a flex column, so a horizontal divider takes the list's width. The list's items inset their content 16px at each side by default (`md.comp.list.list-item.leading-space` and `trailing-space`), so `inset="start"` (Q1 (a)) lines the divider up with the items' content, and the middle inset matches the list set's 16dp `divider.leading-space` and `trailing-space`. **`mx-list` doesn't change.** `list.mdx`'s delta _"dividers are not included"_ becomes a pointer to `mx-divider`.
- **`mx-sortable-list`:** not supported, because the list would sort the divider with its items. M3 says _"Use dividers to group things, not separate individual items"_. The divider's page says so, and the sortable list doesn't change.
- **`mx-card`:** [Q2](#q2--a-full-width-divider-in-a-card).

## Questions for the owner

### Q1 — the inset attribute

M3 names full-width, _inset_ (16dp at the start) and _middle-inset_ (16dp on both sides), and leaves the API open.

- **(a) `inset="start" | "middle"`, full-width when omitted. Recommended.** One attribute, two values, and the logical word survives right-to-left. `end` can be added later without breaking a consumer, but M3 has no end-only inset.
- **(b) material-web's three booleans, `inset`, `inset-start` and `inset-end`.** Familiar to a material-web user. Its `inset` is M3's middle inset, not M3's inset, and `inset-start inset-end` is a second spelling of `inset`.
- **(c) `variant="inset" | "middle-inset"`.** M3's measurement names, and `mx-card`'s word for its configurations. M3's divider pages don't call them variants, and `orientation` would sit beside it as a second axis.

### Q2 — a full-width divider in a card

`mx-card` has 16px of padding, so a divider inside it ends 16px from each edge. M3's example of a full-width divider in a card reaches the card's edges.

- **(a) The card makes a horizontal `mx-divider` that is its direct child reach its edges. Recommended.** The insets are then measured from the card's edge, which is what M3 measures, so `inset="start"` lines up with the card's content. It is a rule in the card's stylesheet that names `mx-divider`, and the card's size row grows. It holds for `--md-card-padding` with one value. With two or more values, the divider spans the card's content box. A vertical divider and a divider deeper than a direct child don't change.
- **(b) Nothing.** A divider in a card spans the card's content box. A full-width one takes the page's own negative `margin-inline`, which repeats the card's padding, and the docs show it.

## Work

1. **Source:** `src/divider/`: the element with its trait (`DividerLike`), the styles and one token package from `md.comp.divider` with both tokens; `files.json`; `react.ts`. Under Q2 (a), `card/styles/default/main.styles.css`.
2. **Docs:** JSDoc for the manifest (`@attr`, `@cssprop`, the decorative default, `role="separator"` outside a list, the vertical divider's height, the sortable list). `divider.mdx` with `card.mdx`'s sections: Summary, When to use, When not to use, Quick start, Insets, Vertical, In a list, In a card, Accessibility, Anatomy, Theming, API reference, Material 3 reference and deltas, Changelog. `divider.stories.tsx`: _Playground_ (inset and orientation controls), _Insets_, _Vertical_, _In a list_, _In a card_. `list.mdx`'s delta, and under Q2 (a) `card.mdx`.
3. **`architecture.md`:** the exception _The host is the box_ names `mx-divider`.

### Tests

The rows run in each engine at `RD-20`'s floor. A literal 16px carries its provenance: M3's specs page, _Measurements_, read 2026-11-27 ([reading](checks/m3-pages.txt)).

- **`divider.browser.test.ts`:** both attributes reflect between attribute and property, and a change replaces the previous state. The divider isn't a tab stop. In Chromium's accessibility tree (the existing command), a divider has no node bare, in a container and in `mx-list`, and the list's items stay `listitem`. With `role="separator"` it is a horizontal `separator`, and vertical with `orientation="vertical"` and no `aria-orientation`. **Witness:** the vertical row fails without the `ariaOrientation` mapping. A page's `aria-orientation="horizontal"` on a vertical divider stands.
- **`divider.spec.browser.test.ts`,** contract `divider`:
  - the line's color and thickness against the contract, horizontal and vertical, and the host's block size (horizontal) or inline size (vertical) equal to the thickness;
  - full-width spans its container; `start` starts 16px from the start edge and reaches the end edge; `middle` is 16px from both; both mirror under `dir="rtl"`; on a vertical divider in a 48px-high flex row, the line is 48px high, and the insets are measured from its block start;
  - each CSS property overrides what it names;
  - with a page's universal reset, the line and the insets are unchanged. **Witness:** the row fails when the inset is a host declaration that the reset beats;
  - a page's `margin-block` and `margin-inline-start` on a full-width divider apply;
  - with `emulateForcedColors(true)`, the line is `CanvasText`. **Witness:** the row fails without the forced-colors rule, if the line is painted in a way that forced colors overrides;
  - in `mx-list`, a horizontal divider has the list's width;
  - under Q2 (a), a direct-child divider of `mx-card` spans the card's border box, with the default padding and with `--md-card-padding: 24px`, and `start` is 16px from the card's edge; a divider in a child of the card spans that child. **Witness:** the first fails without the card's rule. The universal reset changes none of them.
- **`axe.browser.test.ts`:** rows for `mx-divider` bare (`hasNoRule`), with `role="separator"`, vertical with `role="separator"`, and in `mx-list`.
- **`traits-baseline`:** `DividerLike`'s runtime-shape snapshot.
- **`divider.visual.browser.test.ts`:** one screenshot: the three insets, a vertical divider in a row, a list with dividers, and a card with one. The recording workflow records its baseline, and the owner reviews it (`RD-13`).

### Size

`divider/divider` is a new row. `complete` is read before and after. **Every other row is the control and stays byte for byte,** except `card/card` under Q2 (a), whose growth is reported. No limit applies yet (`RD-24`).

### Stopping boundary

The implementer stops and returns to the architect if a property above can't hold in an engine at the floor, if the forced-colors row and the universal-reset row need mechanisms that conflict, or if a row of `mx-list` or `mx-card` other than those named here changes.
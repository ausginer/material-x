# `mx-card` — plan

**Status: decided as [`repo:RD-53`](../00-index.md), with no question open. Ready for an implementer.** Written by the architect on 2026-11-23, on the coordinator's task for [#171](https://github.com/ausginer/material-x/issues/171), on `material-x/card-1` from `origin/main` at `92a386a17`. It is unit B of the [landing plan](../landing-1/landing-plan.md#order) (`repo:RD-47`). Where the entry and this plan differ, the entry governs. Size: medium.

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

1. **The host is the card's box** (the `.host` exception _The host is the box_, as `mx-list-item`). It carries the container colour, the shape and the elevation layers. The shadow root holds the slot and nothing else. Size comes from the content or from the consumer's layout.
2. **The slot draws the padding and the outline,** so that a page's universal reset changes neither. They cover a host that the layout stretches, such as a grid item.
3. **The outline takes no layout space:** the content is inset 16px from the container's edge in every variant, and changing `variant` moves nothing. The outline stays visible in forced colors, so it isn't a shadow.
4. **The elevation layers are the three boxes** that the other components draw, and not one list, so that an elevated card paints as an elevated button does. `static-box.styles.css` has these rules for a host box today. The card is their second user, so they move into a shared stylesheet in `core/styles/elevation`, which both adopt. `mx-list-item` renders as before.
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
  - with a page's universal reset of padding, border and outline, the inset and the outline are unchanged. **Witness:** the row fails with the padding or the outline on the host;
  - in a grid that stretches the card, the outline's box is the host's box. **Witness:** the row fails with a host that doesn't stretch its slot.
- **`core/elevation.spec`:** an elevated card draws the three layers at its token's level and in its token's colour. With its own `--_container-shadow-color` set to red, it draws red. **Witness:** the red row fails when the package gives no `shadow.color`. A filled and an outlined card join the level-0 rows. The list item's rows pass unchanged.
- **`card.visual.browser.test.ts`:** one screenshot of the three variants with a heading, text and a button. The owner records its baseline (`RD-13`).

### Stopping boundary

The implementer stops and returns to the architect if a property above can't hold in an engine at the floor, or if sharing the host-box elevation rules changes a list item's rendering or its tests.

## Owed after the merge

**One documentation unit,** because project documentation has its own pull request: `architecture.md` (`mx-card` in _The host is the box_ and in the component list), `accessibility.md` (a Card section) and the package README's component list, which also lacks the checkbox, the radio and the list elements.
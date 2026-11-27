# `mx-divider` — implementation report

**Canonical entry: `repo:RD-70` — `mx-divider` is decorative by default, and a horizontal divider directly in `mx-card` reaches the card's edges.** This report is the implementer's for the [plan](divider-plan.md) and `RD-70` with its second amendment, and for `RD-53`'s note of 2026-11-27 on the card's padding. Written on 2026-11-27 on `material-x/divider-1`, from `e33a9a810` merged with the implementer's stop note (`640ffb9cf`), requested by the coordinator. In Chromium (`RD-62`), and CI reads Firefox and WebKit.

## What was built

- **`src/divider/`:** `divider.ts` (`DividerLike` with `inset` and `orientation`, each a custom state; `orientation` also sets the internals' `ariaOrientation`; no internals role), `styles/default/tokens.ts` (`md.comp.divider`'s `color` and `thickness`), `main.styles.css`, `divider.mdx` and `divider.stories.tsx` (_Playground_, _Insets_, _Vertical_, _In a list_, _In a card_). `files.json`, `package.json` and `react.ts` name it.
- **The line is the host:** its background, clipped to its content box, with the insets as its padding. `box-sizing: content-box`, `padding` and `background-clip` are `!important`. The forced-colors rule draws `CanvasText`. The shadow root holds no element.
- **`mx-card`:** `padding-inline` and `padding-block` from `--md-card-padding-inline` and `--md-card-padding-block`, and `::slotted(mx-divider:not(:state(vertical))) { margin-inline: calc(-1 * var(--md-card-padding-inline, 16px)) !important; }`, with a comment in each stylesheet naming the other. `card.ts`'s `CardCSSProperties`, JSDoc and `@cssprop`s, `card.mdx` (_Full-bleed media_, a _With a divider_ section, _Theming_), the `FullBleedMedia` story and a `WithADivider` story. `:state()` matches inside `::slotted()` in Chromium, so the rule selects the state. Firefox and WebKit are CI's to read, by the card rows.
- **Docs elsewhere:** `list.mdx`'s delta points to `mx-divider`, and `architecture.md`'s _The host is the box_ names it.
- **A shared test helper:** `capture`, a frame's painted pixels, moves from `tests/focus-indicator.ts` to `tests/browser.ts`, because the divider's paint rows use it too.

## Rows

- **`tests/divider/divider.browser.test.ts`** (21): `inset` and `orientation` each reflect both ways, are `null` by default, and replace and clear their state. The shadow root holds no element. The divider isn't a tab stop. In Chromium's accessibility tree, a divider adds no node directly in the body, in a container, in `mx-list` (whose items stay `listitem`) and as a direct child of `mx-card`. With `role="separator"` it is a horizontal `separator`, vertical with `orientation="vertical"`, and a page's `aria-orientation="horizontal"` stands.
  - **Two readings shaped these rows.** Chromium gives any element with an `id` a `generic` node, a plain `div` too, so only the separator rows give the divider one. And the command reports the node it is asked for even where its parent's tree has none, so the rows without a role read the parent. Each row reads the tree two frames after the fixture.
- **`tests/divider/divider.spec.browser.test.ts`** (45), contract `divider`, registered in `visual-contracts.node.ts`: the line's color and thickness, horizontal and vertical, and the host's block or inline size; `background-clip`; the three insets in a container and mirrored; under a universal reset and under a page's `padding` on the divider; a vertical divider's insets in a 48px flex row; the two CSS properties; a page's `margin-block` and `margin-inline-start`; `CanvasText` in forced colors (Chromium and Firefox, which Playwright emulates); the list's width; in `mx-card`, the border box with the default padding, `--md-card-padding-inline` of 24px and of 0, and a block padding that differs, the three insets from the card's edges, mirrored, under a reset, a page's ignored `margin-inline-start` and applied `margin-block`, a vertical direct child and a divider in a child of the card as outside a card; and the line's painted pixels, read from a screenshot, with a page `margin-inline: -16px` in a padded container, full-width and `start`. The line's box is the host's `DOMRect` less its padding. The two paint rows read what is painted.
- **`tests/card/card.spec.browser.test.ts`:** _"should apply --md-card-padding to the inset"_ is two rows, each changing its own axis and not the other, and _"should keep its content's margins inside"_ sets both properties to `0`.
- **`tests/axe.browser.test.ts`:** `mx-divider` decorative and in `mx-list` (`hasNoRule`), and a horizontal and a vertical separator, with no violation.
- **`traits-baseline`:** `mx-divider`'s runtime shape and `DividerLike`, which every other element reads as `false`.
- **`tests/divider/divider.visual.browser.test.ts`:** `dividers.png`, the three insets, a vertical divider in a row, a list with dividers and an outlined card with one. No image is committed (`RD-13`).

## Witnesses

[Reading](checks/witnesses.txt), [script](probes/mutate.py), Chromium. Each mutation edits one source file and runs its rows' file:

- **The host is `position: relative`:** the four no-node rows fail, the `mx-list` row among them.
- **No `ariaOrientation` mapping:** the vertical separator row fails, alone.
- **No `!important` on the host's padding:** the reset rows of `start` and `middle`, in a container and in a card, and the three page-padding rows fail (7).
- **No forced-colors rule:** the `CanvasText` row fails, alone.
- **No card rule:** the card's border-box rows with the default padding, with 24px and with a differing block padding, the nine inset rows from the card's edges (plain, mirrored and under a reset), and the ignored margin row fail (13). With `--md-card-padding-inline: 0` the row passes, as it should.
- **The line is an absolutely positioned `::before`:** the `start` paint row fails, and so do the color rows that read the host's background. The full-width paint row passes under this mutation, because the unpositioned host passes the line to the viewport, which the container fills.

## Checks

material-x's `spec` (1,445 passed, 2 expected failures), `browser` (1,480) and `node` (39) projects pass in Chromium. Format, lint and typecheck are clean. Firefox, WebKit and visual are CI's.

## Size

Brotli bytes, `just size-reading` at the merge base `2ed4b96ab` and at the implementation, with the same tools ([base](checks/size/base.json), [head](checks/size/head.json)). No limit applies (`RD-24`).

| Row               |  Base |  Head | Change |
| ----------------- | ----: | ----: | -----: |
| `divider/divider` |     — |  1040 |  added |
| `card/card`       |  1354 |  1394 |    +40 |
| `complete`        | 26920 | 27187 |   +267 |

**Eighteen other material-x rows move, by −8 to +34 bytes, and that isn't the control's failure: it is attributable.** `.scripts/css/collect-props.ts` gives every `--_*` property a global short name in the order it finds them. The divider's `--_color` and `--_thickness` are new, and they are found before 36 other names, which each take a different name. With the divider's two names registered last, a reading with only that change to the script ([reading](checks/size/head-divider-names-last.json), the script restored after) has every row byte for byte as at the base except `card/card` (+38), `divider/divider` (1040) and `complete` (+276). So the card's growth is its rule and its split padding, and the other rows' drift is the registry's order. The drag, core and box-quad rows don't move.

## Baselines

`dividers.png` is new, and the recording workflow proposes it. No other image is expected to change: the card's visual row sets no padding and has no divider, and no other row draws a divider.

## Not done

- **No row reads the internals' role,** which a page can't read. The no-node rows and their witness stand for it.
- Firefox's and WebKit's accessibility trees, which this repository can't read.
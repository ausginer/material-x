# Second recheck: `mx-card`'s host draws its padding (PR #213, `RD-53`)

**Read at** `ac8ab1d26` on `material-x/card-1`, 2026-11-24. The implementation is `88db2f729..b3058bde1`, with `main` merged and the architect's acceptance after it. It is read against the plan's [_Disposition of the recheck_](../../card-1/card-plan.md#disposition-of-the-recheck-the-host-draws-the-padding-too), the [report](../../card-1/card-report.md), and the [recheck](recheck-claude.md)'s `reviewer-5` to `reviewer-9`. Reviewer: Claude, which neither implemented the unit nor wrote the earlier rounds, on the coordinator's task. Issue #171.

**Verdict: the disposition is implemented and holds in the three engines. `reviewer-5` to `reviewer-9` are closed.** Two new findings. One sentence of the documentation, which the plan worded, is inexact for Firefox (`reviewer-10`, tier B). Two small mutations of the host's layout pass every row (`reviewer-11`, tier C). No source defect was found.

**Scope:**

- **Built** core and material-x in a scratch copy of the tree, and beside it the same tree with the card's two source files of `dc3a98c82`, as _the layout before_. Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux.
- **What the plan owes:** the box probe, the focus probe and the 29 mutations, each in the three engines.
- **Mine,** in [`probes/recheck-2/`](probes/recheck-2/): `ring` (the focus ring), `inherit` (the two resets), `docs` (what the texts say), and 12 mutations. They need the first recheck's `lib.mjs` and `bundle.mjs`.
- **Not run:** the visual project, Safari, a mobile browser, classic scrollbars, page zoom, print, the rest of the suite, and the docs build. CI on `ac8ab1d26` passes every job except `chromium`, which fails one test, the visual one with no reference screenshot, and the `verify` job that collects it.

## Status of the findings

| Finding | Status | Evidence |
| --- | --- | --- |
| `reviewer-5` | **Closed.** 16px follow the content in both axes at the end of a scroll, as in the `div` | The focus probe's last part. The row fails with the padding on the slot, with a slot that scrolls, and with a host that is a flex column |
| `reviewer-6` | **Closed as ruled.** JSDoc and `card.mdx` say what the plan's words say. Those words are `reviewer-10` | — |
| `reviewer-7` | **Closed.** Neither text names full-bleed media. The probe's four cases at the edge still read as the texts say | The focus probe |
| `reviewer-8` | **Closed.** Each of the plan's rows fails under its witness | The mutations |
| `reviewer-9` | **Closed** in `RD-53`, the plan and the description | — |

## What the plan owes

- **The box probe** ([reading](checks/recheck-2/box.txt)): 12 of 13 cases equal the reference in each of 75 sets (three variants, five page rules, the three engines, and forced colors in two). The differences in those 12 are 1 pixel by 2 of 255, in WebKit, for `overflow: hidden` and `clip`, as before. The 13th is `block-size: 10px`, the accepted one. With `padding: 16px` on the reference, the probe gives the committed [reading](../../card-1/checks/box-padded-reference.txt) line for line, and no pixel of that case differs. A first run in Firefox stopped on a page that took 30 seconds to load, while the mutations ran beside it, and I ran it again.
- **The focus probe** gives the committed [reading](../../card-1/checks/focus-built.txt) line for line.
- **The mutations:** `mutate-4.mjs`, 29 and a control, gives the committed [reading](../../card-1/checks/witnesses-4.txt) line for line.

## The changed-pixel count of _smaller, tabindex_

**Settled: the ring is now a plain `div`'s, and the slot's box is why it wasn't** ([reading](checks/recheck-2/ring.txt)). In Chromium and WebKit the browser's own ring on an element that is smaller than its content goes around its overflowing children as well. It went around the slot's box, which was the content and the padding, 72px high, and goes around the content alone now, 16px less at the bottom. With a content of 10px, where the slot's own box was 42px, it stayed 2px outside the card before and is on it now.

- The head equals a `div` with the same declarations, in the pixel count and in the box of the changed pixels, in all 12 cases of each engine. The layout before differed from it in eight in WebKit and in six in Chromium. Firefox draws the ring around the host's own box only, so there the three are equal, which is why its count didn't change.
- **In WebKit one case improves:** with `inline-size: 80px` and wide content, the ring began 16px inside the card and left its edges out. It goes around the card now.

## The two resets on a slot without a box

**Both hold** ([reading](checks/recheck-2/inherit.txt)). In the three engines, 14 pieces of content (buttons of each color, checkboxes, list items, an element nested two deep, bare text) compute the same inside a card as outside it, on the host, its shadow tree and its pseudo-elements, in each variant, and with a page's `overflow`, `grid`, `flex`, `inline-block`, `static` and `display: contents` on the card. `display` itself isn't compared inside a page's grid or flex. The slot's computed `display` is `contents`. The probe sees them: with the resets taken away, 4 boxes differ. Moved to the host, both rows fail.

## `mx-list-item`

**Unchanged.** `packages/material-x/src` differs from `dc3a98c82` in the card's three files only, and the one other change under `packages/core/src` is `main`'s deleted hook (#221). The built `list/` is the same byte for byte with the card's source of `dc3a98c82` and with the head's. The first recheck's item probe, old against head, gives 0 differing pixels and no differing computed style in its 70 cases.

## JSDoc, `card.mdx` and the description

They match the element, except `reviewer-10` ([reading](checks/recheck-2/docs.txt)). A page's `padding` doesn't apply, as a rule, as a rule with `!important`, inline, or inline with `!important`, and `--md-card-padding` does. The sizes 1314, 2838 and 23066 are what my build gives. A page's `display: grid`, `flex` and `columns` lay out the content directly, as the plan expects without having read it.

## New findings

### Local `reviewer-10` — Tier B: in Firefox a scrolling card is a tab stop with focusable content too

- **Current claim,** in JSDoc and `card.mdx`, in the plan's words: _"A browser may make a scrolling card a tab stop: Chromium and Firefox do when it has no focusable content, and WebKit doesn't."_
- **Observed** ([reading](checks/recheck-2/docs.txt)): Tab goes to a scrolling card in Firefox with a button, a link or an `mx-button` in it, and then to the control. In Chromium it goes to the control. A `div` is the same in each. The first recheck's probe had no focusable content, so it couldn't tell the two apart.
- **Why it is a problem:** a reader with a scrolling card that holds a button concludes that it adds no tab stop, and in Firefox it adds one, with no role and no name. The next sentence of `card.mdx`, _"Such a card needs `tabindex="0"`, a role and a name"_, then also misses the case.
- **Required property:** the sentence doesn't limit Firefox to a card without focusable content.
- **Route:** the architect, because the plan gives the words; then the implementer.

### Local `reviewer-11` — Tier C: two changes of the host's layout that no row sees

Each passes all 77 rows in the three engines ([mutations](checks/recheck-2/mutations.txt)).

- **`display: grid` for `flow-root`.** Property 2 says that the host is a block formatting context. The margins row, the percentage row and the scroll row all pass in a grid, where the margins between two pieces of content don't collapse, so a card of two paragraphs lays out differently from a plain box. Not read in pixels.
- **`inline-size: fit-content` on the host.** The card then no longer fills its container, and no row reads a natural card's width.
- **Not a gap:** the two resets on `::slotted(*)` in place of the slot pass, because each slotted element then resets for its own descendants. Nothing that a page sees differs, apart from bare text, which reads neither.
- **Required property:** a row fails when adjacent content lays out otherwise than in a plain box, and when a natural card doesn't fill its container; or the plan says that they have none.
- **Route:** the implementer, if the architect wants the rows.

## Next

The architect's words for `reviewer-10`, and the implementer. It changes two sentences of documentation and no pixel, so the owner's baseline, `card-variants.png`, needn't wait for it.
# A focused handle's indicator, and the trail slot's clip (RF-128, RF-135, #267) — feature proof

**Files were read at:** `b9428b5df`, the head of #267 (`material-x/handle-focus-1`), in slot `c`, clean and equal to `origin`. **Diff reviewed:** `0dca6e5a0..b9428b5df`, against the merge base with `origin/main`. Core and material-x were built at this head. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2.

**Subject:** `repo:RF-128`, with the architect's list and the implementer's note of 2026-11-25, and `repo:RF-135`, in [`00-index.md`](../../00-index.md), with the [evidence](../../handle-focus-1/).

**Verdict: pass. Both required properties hold for every element that the list makes a handle, and for every control read, in the three engines.** One finding is for the architect: the rule also replaces the indicator of a consumer's own element (`reviewer-1`, tier A, introduced here). The other three are tier C. None asks for a change of the `trail` repair.

## Scope

**Covered.** Readings: [ring](checks/ring.txt), [behaviour](checks/behaviour.txt), [other places](checks/other-places.txt), [mutations](checks/mutations.txt), [mutations with other files](checks/mutations-other-files.txt), [edge rows that fail](checks/mutations-edges.txt). Probes: [ring](probes/ring.mjs), [behaviour](probes/behaviour.mjs), [other places](probes/other-places.mjs), [mutations](probes/mutations.mjs).

- **Paint.** The middle of the indicator's ring, at a device scale of 2, for a keyboard-focused control: 1,545 readings, **all 100%**. They are six kinds of handle and nine other controls, in `lead` and `trail`, in static, button and link items, by these modes: LTR, RTL, the item's spaces at 0 with a container height of 20px, disabled, selected, forced colors, lifted, and the first of three items. Three more, of `mx-radio` in `trail` in WebKit's first of three, were lost when I moved the probe's output. `mx-icon-button` runs from xsmall to xlarge.
- **The lifted item:** a real pointer drag of a handle with keyboard focus. The handle keeps `:focus-visible`, the ring is whole, and the host scrolls nothing, in each of 72 readings.
- **Forced colors:** Chromium paints `rgb(55, 51, 109)` and Firefox black, whole. WebKit paints the theme's color, because its emulation forces none, so WebKit isn't read here.
- **One indicator.** A handle that is `mx-icon-button` or `mx-button` has none on its host and Material's on its inner button. `mx-checkbox` with `data-handle` has none on its host.
- **Focus by pointer:** no indicator after a click on a handle, in the three engines.
- **A page's rule wins:** `[data-handle] { outline: none }`, `:focus-visible { … }`, a rule of `outline-color` alone, a rule in a `@layer`, `* { outline: 0 }` and an inline `outline`. The rule doesn't reach a handle that is nested in another slotted element, which the list doesn't make a handle either.
- **The clip.** 19 more contents (form controls, media, percentages, floats, margins, a grid, `display: contents` and others), in two widths and two kinds of item: 228 readings, and no box moves between the head and the head with the former `overflow: hidden; text-overflow: ellipsis`. The page gets no horizontal scroll from any of them. What spills is what the entry says: overflow that a page made itself.
- **Rows.** 125 pass in each engine. The diff's 52 rows are 36, 4 and 12, as the note says. 16 mutations in each engine: 11 fail rows, and five fail none (`reviewer-3`).
- **The WebKit departure: accepted.** The 12 thickness rows pass in WebKit without the rule, as the note says. They aren't blind there: with `outline: 2px` all 12 fail in each engine, and the same items' 24 rows of offset and color fail without the rule. No assertion is missing for thickness.
- **`focus.default`: accepted.** The list names `focusTokens` as the oracle, the registry is the place for it, and the rows read computed values of the handle.
- **The baseline stop rule** (item 6): `chromium` in #267's CI, at this commit, passes, with the seven visual files (32 rows), and no baseline changes in the diff. It reads nothing of this unit, because none of those files renders a list (`reviewer-4`). `firefox`, `webkit`, `static`, `docs` and `measurements` pass too.
- **Root format check:** passes with the probes in the tree.

**Not covered:** Safari, screen readers, WebKit's forced colors, Windows' own high contrast, the implementer's probes again, the sizes again (CI's gate passes), and a whole browser suite locally (CI ran it).

## Findings

### reviewer-1 — A consumer's own element as a handle loses its own focus indicator, or shows two

Tier A, introduced by this unit. To the architect: it decides what _"a page's own rule on it still wins"_ covers.

- **Current behavior.** A handle that is the consumer's custom element, with its indicator in its own shadow tree, takes the package's outline over its `:host(:focus-visible)` rule. The item's shadow tree is an outer one for that element, and `::slotted` beats the element's `:host` rule whatever its specificity.

  | The element's own sheet | Computed outline, before the rule | With the rule |
  | --- | --- | --- |
  | `:host(:focus-visible) { outline: 4px dotted red; outline-offset: 1px }` | dotted, 4px, red, 1px | solid, 3px, `rgb(75, 102, 42)`, 2px |
  | `:host(:focus-visible) { outline: none }`, and a red outline on an inner box | none on the host | solid, 3px, on the host **and** the inner red one |

  Read in the three engines ([other places](checks/other-places.txt)), in a sortable list's `lead` slot. In `trail` the computed values are the same (_consumer element_ in [behaviour](checks/behaviour.txt)). The second case changes 110 to 116 pixels without the rule and 457 to 467 with it.

- **Why it matters.** The list writes `tabindex="0"` on the handle, so an element without `delegatesFocus` takes focus on its host. Its own style, which it shows everywhere else, is replaced here. A page can restore it only with a rule outside the element, such as `x-grip:focus-visible { outline: … }`. The package's own controls aren't affected, because focus goes to their inner control.
- **What the record says.** `RF-128` requires that _"a page's own rule on it still wins"_, its option (a) says _"whatever the consumer used"_, and the source comment says that the page's rule wins. The entry reads `mx-icon`, `span`, `button` and `mx-icon-button`, and no consumer's element.
- **Required property:** the record says whether an element's own `:host` rule is a page's rule here. If it is, it wins. If it isn't, the limit is recorded.

### reviewer-2 — The rule also reaches a `data-handle` that the list doesn't make a handle

Tier C.

- **Current behavior.** `handleOf` takes a child in `lead` or `trail`. The rule is `::slotted([data-handle]:focus-visible)` without a slot, so it also reaches one in the label, `overline` and `support` slots, which still clip. There the new indicator shows less than the browser's did: a focused `b` in the label changes 183 pixels with the rule and 288 without it in Chromium, 72 and 164 in Firefox, and 72 and 178 in WebKit. It is cut, and not gone. A handle in `support` reads about the same either way.
- **Why it is small.** Such an element needs its own `tabindex`, and neither the documentation nor the list calls it a handle. A focusable one in `lead` or `trail` of a plain `mx-list` takes the rule too, as the entry says.
- **Required property:** the rule covers what `handleOf` covers, or the entry says that it covers more.

### reviewer-3 — Five changes of the unit's rules fail no row

Tier C. The unit's code is right. These mutations pass in the three engines:

| Mutation | Rows of the file |
| --- | --- |
| `::slotted([data-handle])`, so a handle always has the outline | 125 pass |
| `:focus` for `:focus-visible`, so a click shows it | 125 pass |
| `::slotted(:focus-visible)`, so any focusable child gets it, as the item's own | 125 pass |
| `dashed` for `solid` | 125 pass |
| `align-content: center` out of `.trail` | 125 pass |

The first three also pass with all of `tests/list` and `focus-layer.spec.browser.test.ts`, 379 rows, in Chromium. `focus-layer` has the sibling row _"should draw no focus indicator after a mouse click"_ for the package's own controls, and the handle has none. So the property _"focused"_ is read only where a handle has focus. Two limits of the edge rows: with both slots clipped, the three left-edge rows of `mx-icon-button` pass in Chromium and WebKit (9 of 12 rows fail, and all 12 in Firefox), and with `overflow: clip` and a 4px margin, which cuts 1px, only the three `mx-icon` rows fail in Chromium and Firefox, and all 12 in WebKit. The edges with several items aren't in the rows. I read them, and they hold.

- **Required property:** rows fail when an unfocused handle, a clicked handle, or a child without `data-handle` has the indicator.

### reviewer-4 — No visual baseline renders a list

Tier C, pre-existing. Item 6 asks to stop _"if a visual baseline … changes"_. The seven visual files of material-x are of buttons, button groups, card, checkbox, radio, slider and top app bar. None has a list item in it, so this stop rule can't fire for this unit, and _"CI runs it"_ in the implementer's note is true and empty. I don't ask for a baseline: the readings above take its place.

## Observations

- **Disabled items.** `:host(:state(disabled)) slot` has the disabled opacity, and it dims the indicator too, of a handle and of any other control in `lead` or `trail` of a disabled button or link item: `rgb(181, 193, 160)` on `rgb(247, 251, 234)`, which is about 1.8:1. `main` has the same opacity on the browser's outline. The focused control is enabled. It isn't covered or cut, so it isn't against `RF-135`. I register nothing.
- **The documentation** (`list.mdx`, the JSDoc of `mx-sortable-list`) doesn't say that a handle shows Material's indicator, nor how a page replaces it. The list of the unit doesn't ask for it.
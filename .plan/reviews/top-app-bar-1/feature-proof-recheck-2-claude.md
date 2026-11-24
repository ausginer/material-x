# `mx-top-app-bar` (RD-54, #172) — second recheck: the area above the viewport

**Files were read at:** `634dae5ef`, the head of #211 (`material-x/top-app-bar-1`), in slot `d`, clean and equal to `origin`, with `@ydinjs/core` and `@ydinjs/material-x` rebuilt there. **Diff reviewed:** `8f5ad01db..634dae5ef`, in the bar's source and tests. The mutation runs edited the sources in the slot and restored them. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux.

**Subject:** the plan's [disposition of the recheck](../../top-app-bar-1/top-app-bar-plan.md#disposition-of-the-recheck-at-8f5ad01db) and its implemented section, `repo:RD-54` with its third amendment, and the [first recheck](feature-proof-recheck-claude.md) at `3ce65b561`. I wrote neither the feature proof nor the first recheck.

**Verdict: the new area holds, and `reviewer-8` and `reviewer-9` are settled.** A bar that is shown at the document's start draws its resting color from its first frame, in each way that I tried, apart from the known Firefox case. Four new findings, and none of them asks for another mechanism: no row guards `visibility: hidden`, which the box needs now that it has a size (`reviewer-10`, tier B); one sentence of the component page is false for a bar that is removed (`reviewer-11`, tier B); in WebKit a frame with a CSS zoom above 1 has a wrong state, with the former area too (`reviewer-12`, tier A, pre-existing); and #211's size line reads as the bar's whole cost (`reviewer-13`, tier C).

## Status of the earlier findings

| Finding | Status |
| --- | --- |
| `reviewer-8` | **Settled.** No frame and no transition at the start, and the texts say the rest, except as `reviewer-11` says |
| `reviewer-9` | **Settled.** `popover="auto"` fails both popover rows, and `hint` the second only. _Do nothing when the box is open_ fails only the moved row |

## What was read

- **The first rendering** ([`extra.txt`](checks/recheck-2/extra.txt), [`flash.txt`](checks/recheck-2/flash.txt)), in 15 ways:
  - `display: none` on the bar and on a parent, the `hidden` attribute with a page rule, and a wrapper that becomes `display: contents`;
  - a modal, a full-screen and a non-modal dialog, a manual and an `auto` popover;
  - a media query and a container query;
  - an unslotted bar, a closed `details`, `content-visibility: hidden` and `hidden="until-found"`.

  **At the start:** off while hidden, and 0 frames and no transition when it is shown. The exception is Firefox with the last three, which fade from transparent for about 200ms. The plan's _Costs_ names it for two of them, and `until-found` is the same property. **Hidden on a scrolled page and shown at the start:** 0 frames, for the five ways read. **Shown on a scrolled page:** the resting color, then 6 to 10 frames (110 to 136ms; about 215ms in Firefox for those three), and on, as the component page says. The non-modal dialog scrolls the page to the start when it opens, so it reads off there. Hidden and shown in one task at 300: no change. Hidden for one frame: the fade.

- **The plan's [`first-rendering`](../../top-app-bar-1/probes/first-rendering.ts),** run again on the built bar ([`first-rendering.txt`](checks/recheck-2/first-rendering.txt)). With the frame counts and times left out, it equals the committed reading line for line: 29 pages, 8 scales, 6 heights, the long pages and the callbacks.
- **The state on the earlier pages:** the proof's 27 pages ([`pages.txt`](checks/recheck-2/pages.txt)) and the first recheck's probe ([`state.txt`](checks/recheck-2/state.txt)) equal their earlier readings in the three engines, with the wheel, the keys, the smooth scroll, the fractions at four scales, the frames, the reconnects and moves, the scroll locks and quirks mode. The one line that differs is the hidden bar's, which is off and draws 0 frames. [`overflow.txt`](checks/recheck-2/overflow.txt) is the same.
- **More frames** (`extra.txt`): scaled, rotated, clipped, transparent, with no height, cross-origin and sandboxed with an opaque origin, half out of view, and scrolled while out of view. All match when they are drawn. Chromium doesn't draw a cross-origin frame that is out of view, so the state follows once it is back. A zoomed frame is `reviewer-12`. A page reloaded while scrolled, and returned to, matches. Forced colors and reduced motion match.
- **What the 1px box takes part in: nothing found, as built.** The first recheck's probe ([`layer.txt`](checks/recheck-2/layer.txt)) reads the same with the box shown and hidden, in each engine: the Tab order, light dismiss and Escape, the dialog's focus, the hits, the document's size, the aria snapshot, Chromium's accessibility tree, and print and the PDF's pages. 13 more readings beside a page without the box, on nine pages, tall and short, RTL, both vertical modes, zoom 3 and 0.1: the furthest scroll, scroll anchoring at five positions, the hits and clicks at the corner, a drag from it, the selection, a `hint` popover, `focus()` on the box, and Chromium's layout shifts. The differences are not the box's: WebKit's color transition was running where the state follows, and one layout-shift entry of 0.0016 comes and goes in Chromium in both.
- **The mutations** ([`mutations.txt`](checks/recheck-2/mutations.txt)): the implementer's script gives the committed [reading](../../top-app-bar-1/checks/mutations-2.txt) line for line. Of 15 more, eight fail rows, and the three engines agree: no size in either axis alone, `<= 0`, a top margin of 0px, a bottom margin of −99% and −101%, a fixed box, and a hidden bar that keeps its state. Seven pass: `visibility: hidden` removed (`reviewer-10`), and six under _Not findings_.
- **The implementer's differing line** (WebKit, `visibility: hidden` from 300 to 0): **explained, and not the state's.** The bar is rendered while it is `visibility: hidden`, so the transition that the scroll starts runs then. I showed the bar at six times after the state turned off, six readings each. In each engine some frames differ at 0 and 60ms, none from 120ms on. A bar that was never hidden fades too, and is at rest from 120ms on. The frames are the same in Chromium and Firefox. In WebKit the hidden bar has 6 frames left at 60ms, and the other one 3, so its transition runs later while it is hidden. The probe shows it at about 100ms, so a few milliseconds decide whether it reads 0 or 4 frames. The former area read 3 to 5 frames there in WebKit ([reading](../../top-app-bar-1/checks/first-rendering.txt)).
- **JSDoc, the component page and #211:** right, except as `reviewer-11` and `reviewer-13` say. CI on `634dae5ef` fails in `chromium` only on the two visual rows with no baseline (3316 rows pass), and in the `verify` job that collects it.

**Not covered:** Safari, its overscroll, its page zoom and a physical pinch; a dynamic mobile toolbar; printing outside Chromium other than emulated print media; the accessibility tree outside Chromium, except through the aria snapshot; the visual project; the merge with `origin/main`.

## Findings

### reviewer-10

**Tier B.** No row fails without the box's `visibility: hidden`, and with the 1px box the declaration is what keeps the box from being drawn and hit.

- **Contract:** the plan's _"It takes no hit, no focus and no place in the accessibility tree"_, and _"It is 1px by 1px … and is `visibility: hidden`"_. The disposition of `reviewer-9` says that a row isn't owed, _"nothing that was read changes without it"_. That was read with a box of 0px.
- **Evidence,** in the three engines, light and dark ([`visible.txt`](checks/recheck-2/visible.txt)), with the bar in a color of the page's and a button of the page's in the corner:

  | The box | The corner's pixel | A click on the button there |
  | --- | --- | --- |
  | 1px, hidden, as built | the bar's color | reaches the button |
  | 0px, hidden, or 0px, visible | the bar's color | reaches the button |
  | 1px, visible | another color, from the user agent's popover background: white, gray or near black | reaches the box, and not the button |

  With the declaration taken out of the stylesheet, all 245 test runs of the three engines pass.

- **Why it matters:** the reason for owing no row ended with the size. A spot in the page's corner and a dead pixel are a consumer's to see.
- **Required property:** a row fails when the box can be drawn or hit.
- **Route:** the architect, whose ruling it was, then the implementer.

### reviewer-11

**Tier B.** The component page says that a bar that isn't rendered isn't in the state. A bar that is removed on a scrolled page is in it, and draws the scrolled color where it is inserted next.

- **The text:** _"A bar that isn't rendered isn't in the state, and a bar that the page shows or inserts while the document is scrolled draws its resting color and then changes."_
- **Evidence,** in the three engines (`extra.txt`, and `first-rendering.txt`'s _inserted again_): removed at 300 and inserted at the start, it fades from the scrolled color (8 to 11 frames). Removed and inserted at 300, it draws the scrolled color at once and no transition. The row _should keep its value while the bar is disconnected_ pins the state. So both halves of the sentence are wrong for a bar that the page inserts again.
- **The plan** accepts the behavior, under _Costs_, and the disposition states the exception: _"The exception is a bar that is inserted again after a removal (above)"_. `RD-54` says that only the first cost is documented.
- **Why it matters:** a page that keeps its bar and changes views removes and inserts it, and the text tells it that it starts at rest.
- **Required property:** the sentence doesn't promise it of a bar that is inserted again.
- **Route:** the architect for the words, which the work list gave, then the implementer.

### reviewer-12

**Tier A, pre-existing, narrow.** In WebKit, a bar in a frame whose CSS `zoom`, or an ancestor's, is above 1 stays off until the frame's document is scrolled by about the frame's height times (zoom − 1).

- **Evidence** ([`zoom.txt`](checks/recheck-2/zoom.txt)), a frame of 300px: at 1.1 it is off at 20 and on at 100, at 1.5 off at 150 and on at 300, at 2 off at 300 and on at 600, and at 3 off at 600 and on at 1500. A zoom of 1 or less is right, as is a zoom on the frame's own root. Chromium and Firefox are right at each of the 11 factors. **The former area, built from the bundle's options, state and 0px box, is wrong at the same positions,** so the new area doesn't introduce it. The earlier rounds zoomed the root and the body, and not a frame.
- **The cause, by reading the numbers:** the engine's layout viewport in that frame isn't scaled: at 2 the window is 400 by 300, and `clientWidth`, `clientHeight`, the root's box and the observer's `rootBounds` are 800 by 600. So the area's edge isn't where the page sees it. A page can't correct it.
- **Not established:** whether Safari has it, and whether a page zoom there, which the user makes, takes the same path. Playwright can't zoom a page in WebKit. The second question decides how much this matters.
- **Required property:** the state matches the document's position; or the plan names a zoomed frame in WebKit as a limit.
- **Route:** the architect.

### reviewer-13

**Tier C.** #211's description gives `complete` as _"23219 to 23288 B with it (+69 B)"_, under the bar's checks. That is the last change's effect. The gate's report on #211 gives 22844 to 23288, +444, for the bar.

- **Why it matters:** the owner reads the description before he merges, and _"with it"_ reads as the bar.
- **Required property:** the line says what the number compares, or gives the bar's.
- **Route:** the implementer, with the description.

## Not findings

- **Six more mutations pass.** The state from `isIntersecting` and from the ratio read the same on the pages, which the disposition says. _The first entry_ passed in the earlier rounds. A top margin of 1000000px differs only on a page longer than that. A 20px box differs only in what it could cover, and it is hidden. A threshold of 1 is right at whole pixels and wrong, by reasoning, at a fraction below the first one, which no row reads at a device scale of 1.
- The comment on the observer's options in `top-app-bar.ts` has one line of 106 characters, where a wrap was missed.
- The baselines that #211 waits for aren't affected: nothing that I read changes a bar that is rendered from the start.

## One next task

The architect answers `reviewer-10`, `reviewer-11` and `reviewer-12`. The implementer takes `reviewer-13` and what those answers ask.
# `mx-top-app-bar` (RD-54, #172) — recheck of the remediation

**Files were read at:** `8f5ad01db`, the head of #211 (`material-x/top-app-bar-1`), in slot `d`. Every run used a scratch copy of that tree with `@ydinjs/core` and `@ydinjs/material-x` rebuilt in it. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux.

**Subject:** the remediation `6dbdcbbd1..8f5ad01db`, the plan's [dispositions](../../top-app-bar-1/top-app-bar-plan.md#disposition-of-the-feature-proof-at-6dbdcbbd1), the [ruling on a connect while disconnected](../../top-app-bar-1/top-app-bar-plan.md#ruling-on-a-connect-while-disconnected), the two implemented sections, `repo:RD-54` with its second amendment, and the [feature proof](feature-proof-claude.md) at `6dbdcbbd1`.

**Verdict: the remediation holds. While the bar is rendered, the state matches the document's block scroll position in the three engines on every page read. The `isConnected` check and its rows are right, and the six findings that were owed here are settled.** Two new findings: a bar first rendered at the start draws a fade from the scrolled color, longer than the plan's accepted cost and not documented (`reviewer-8`, tier A, the architect), and no row guards the box's popover kind (`reviewer-9`, tier B). Neither needs another mechanism.

## Status of the earlier findings

| Finding | Status |
| --- | --- |
| `reviewer-1` | **Settled.** `body { position: absolute }` and `html { height: 0 }` match at every position. The rows fail with the root element as the target |
| `reviewer-2` | **Settled.** `html { margin-top: 46px }`, a relative offset, a negative margin and a translated root match from 1px on. Same witness |
| `reviewer-3` | **Routed, as ruled,** to `RF-122`. Nothing is owed here. I didn't read it again |
| `reviewer-4` | **Settled.** A listener that does nothing, on `window`, bare or on `document`, fails the steps row and only it |
| `reviewer-5` | **Settled.** The row reads off before the crossing, and fails with a top margin of 2px |
| `reviewer-6` | **Settled.** Each of the six declarations, taken away, fails both of its rows |
| `reviewer-7` | **Settled.** `position: fixed`, `flex: initial` and no `align-items` each fail their new rows |

I reran the implementer's [script](../../top-app-bar-1/probes/mutations.mjs), 24 mutations and a control. It gives the committed [reading](../../top-app-bar-1/checks/mutations.txt) line for line. One line differs for a reason of mine: during _headline without line-height_ my own copy of the pages probe was in the directory, and it throws its results.

## Question 1: the top-layer box

On the built element, in the three engines:

- **The proof's pages** ([`pages.txt`](checks/recheck/pages.txt)): its probe reports 27 pages and none `BAD`, and the wheel, the keyboard and the smooth scroll match. A typography-only mutation was on disk during that run, which the state doesn't depend on.
- **24 more pages** ([`state.txt`](checks/recheck/state.txt)): quirks mode, `zoom` of 0.5, 1.5 and 3, RTL, a transformed, contained and perspective root, snap points, `overflow-x: clip`, and the bar itself fixed, clipped, filtered, strictly contained or `display: contents`. All match at 0, 1, 300, the end and 0. A 25th page, `div { position: fixed }`, didn't scroll, so it reads off only.
- **Page CSS that targets `[popover]`, `:popover-open` or `::backdrop`,** and a universal rule with margins, padding, borders and `inset`, all with `!important`: no effect. None of them reaches the shadow tree. `document.querySelectorAll(':popover-open')` finds nothing and the host doesn't match.
- **Frames:** out of view, half in view, and hidden and shown again.
- **Fractional positions** at device scale 1 to 3: the state matches `scrollY`, down to 0.25px in Firefox. Chromium and WebKit round the position.
- **Reconnect and move:** removed and inserted, moved, moved twice in a task, `moveBefore`, cloned, into and out of an open modal dialog, the box hidden by force and reconnected, and two bars. In each the box is shown and the state matches.
- **Scroll locks:** a body fixed at `-300px` reads off, because the document is then at 0, and it is on again after the unlock. `html { overflow: hidden }` keeps it on.
- **Pinch zoom,** in Chromium by emulation, at 2 and 3: matches. A pan of the visual viewport alone, with `scrollY` at 0, reads off, as `scrollY` does. An emulated pull past the start reads off.
- **Print** ([`layer.txt`](checks/recheck/layer.txt)): under emulated print media the state follows the position, and returns. In Chromium's PDF the page count is the same with the box shown or hidden, and the state at `beforeprint` and `afterprint` matches the position.
- **Fullscreen** of another element: matches during and after.

**What the box takes part in: nothing found.** Each of these was read with the box shown and with it hidden, and the two are the same in each engine ([`layer.txt`](checks/recheck/layer.txt)): the Tab order; light dismiss and Escape of an `auto` popover, and light dismiss and Escape of a modal dialog with `closedby="any"`, and its initial focus; the hits at four points, one of them over the box; the document's scrollable size; the aria snapshot; and Chromium's full accessibility tree. The box stays open through all the dismissals. Its `::backdrop` is hidden, transparent and takes no pointer. When a bar connects or is removed beside an open `auto` popover with focus in it, focus and popover stay, and no `toggle`, `beforetoggle`, focus, `scroll`, `cancel` or `close` event reaches the document.

## Question 2: the `isConnected` check

- **It is right.** A bar that another element removes as it connects reports no error, and inserted again it follows the position. A bar that another element **moves** as it connects, which no row reads, is shown and follows too ([`state.txt`](checks/recheck/state.txt)).
- **The rows discriminate:** without the check, only the error row fails, in the three engines. A `try`/`catch` in its place, with the check gone, fails it too. With the check around the `observe` only, 48 rows fail. With it around the show only, none does: observing a disconnected box has no effect, and the disconnect that follows clears it, so that is equivalent.

## Question 4: JSDoc, the component page and #211

They match the element, except as `reviewer-8` says. The overflow sentence of _Position_ is right in the three engines ([`overflow.txt`](checks/recheck/overflow.txt)): with `overflow-x: hidden` on `html` and `body` the bar's top is −300px at 300, and with `clip` on `body` it is 0. In #211, 1418 and 23134 are what my build gives, and 24 mutations and 27 pages reproduce. CI on `8f5ad01db` fails in `chromium` only, on the two visual rows with no baseline, and in the `verify` job that collects it.

## Scope

**Covered:** the state, the box, the check, the changed rows, the dispositions, and the texts. The bar's rows: 77 pass in Chromium, and 75 pass with 2 skipped in each of Firefox and WebKit. Sixteen runs of my own, one of them clean ([`mutations.txt`](checks/recheck/mutations.txt)).

**Not covered:** Safari, its overscroll and a physical pinch; a touch scroll; printing in Firefox and WebKit other than emulated print media; the accessibility tree outside Chromium, except through Playwright's aria snapshot; the visual project; a merge with `origin/main`, which has moved since the branch began; what the first proof settled and the remediation doesn't touch.

## Findings

### reviewer-8

**Tier A, introduced by the new target; partly accepted by the plan.** A bar that isn't rendered is on, so a bar first rendered at the document's start draws the scrolled color and fades from it.

- **What was accepted:** the plan's _Costs_ and `RD-54`: "While the bar is `display: none` its state is on", and "a bar shown again at the start" draws the scrolled color "for its first frame" ("for one frame" in `RD-54`), by reasoning and not by reading.
- **Observed,** in the three engines, with the document at 0 throughout ([`flash.txt`](checks/recheck/flash.txt)):
  - A bar in a full-screen `<dialog>` that is opened, and a bar that a media query shows in a wider viewport, start at `on-scroll.container.color` and run the `background-color` transition to rest. The drawn color differs from rest for about 110 to 135 ms, which is 7 to 9 frames. A bar that connects rendered runs no such transition.
  - This is the bar's **first** rendering, not only a bar shown again. A closed dialog, a closed popover and a `content-visibility: hidden` parent read on at `scrollY` 0, in the same way ([`layer.txt`](checks/recheck/layer.txt)).
- **What the texts say:** JSDoc: "The document is scrolled away from its start"; the component page: "matches `:state(scrolled)` while the document is scrolled". Neither mentions a bar that isn't rendered. A page rule such as `body:has(mx-top-app-bar:state(scrolled))` matches at the start while the bar is hidden.
- **Why it matters:** a bar in a full-screen dialog and a bar shown at one breakpoint are ordinary pages. The cost that was accepted is one frame. What is drawn is a visible fade.
- **Not established:** how noticeable it is between these two colors, which differ little in the baseline theme and by as much as a page's two custom properties make them.
- **Required property:** a bar first rendered at the start draws its resting color at once; or the architect accepts the measured cost, `RD-54` and the plan state it as it is, and the JSDoc and the component page say that the state is meaningful only while the bar is rendered.
- **Route:** the architect.

### reviewer-9

**Tier B.** No row fails when the box's popover is `auto`.

- **Contract:** the plan's "`popover="manual"`", and "It takes no hit, no focus and no place in the accessibility tree".
- **Observed:** with `popover="auto"` in the template all 227 rows pass. On the built element, with the attribute changed at run time ([`auto.txt`](checks/recheck/auto.txt)), a bar that connects then closes the page's own open popover, and one click on the page hides the box, so the state is on at the start until the next connect. Three engines. Removing `visibility: hidden` passes too, and changes nothing that I read.
- **Why it matters:** it is a one-word change with two visible effects on a page, and it is the property that the mechanism's safety rests on. The readings that show it are of a prototype and of this recheck, and neither runs in the suite.
- **Required property:** a row fails when the box closes another popover or is itself dismissed.
- **Route:** the implementer.

## Not findings

- _`entries[0]`_ passes, as in the first proof.
- The user agent's size for the box, a bottom margin of 10px or −100%, and a show deferred by a microtask pass. The first two are equivalent: an empty popover's fit-content size is 0, and the box touches the area's top edge. The plan rules the last one out by reasoning about the delay, and owes no row.
- With a fixed body as a scroll lock, the state is off while the page looks scrolled. The document's position is 0 then, so the definition holds.

## One next task

The architect answers `reviewer-8`. The implementer takes `reviewer-9` and what that answer asks of the texts. The owner's baselines aren't affected by either.
# `mx-top-app-bar` — plan

**Status: decided as [`repo:RD-54`](../00-index.md), and implemented at `6dbdcbbd1`. After the [feature proof](../reviews/top-app-bar-1/feature-proof-claude.md), the [scrolled state](#the-scrolled-state) has another target, and the [dispositions](#disposition-of-the-feature-proof-at-6dbdcbbd1) are [implemented](#dispositions-implemented-2026-11-24). The [connect while disconnected](#ruling-on-a-connect-while-disconnected) is ruled on and [implemented](#the-ruling-implemented-2026-11-24). The recheck is next.** Written by the architect on 2026-11-23, on the coordinator's task for [#172](https://github.com/ausginer/material-x/issues/172), on `material-x/top-app-bar-1` from `origin/main` at `92a386a17`. It is unit H of the [landing plan](../landing-1/landing-plan.md#order) (`repo:RD-47`), and answers its [six properties](../landing-1/landing-plan.md#top-app-bar-the-first-sets-third-component). Where the entry and this plan differ, the entry governs. Size: medium.

## Readings

- **M3's app bar pages** (_specs_ and _guidelines_ under `https://m3.material.io/components/app-bars/`, rendered in Chromium on 2026-11-23):
  - _"On scroll, the container changes color to surface container."_ The _Scroll states_ image shows a flat bar and a scrolled bar that differ in color only.
  - The small bar's measurement image gives, along the inline axis: 4, a 48 target, 4, the headline, 4, two 48 targets with nothing between them, and 4.
  - _"Don't use curved shapes"_, _"Don't make an app bar shorter than its default height"_, _"Don't truncate the headline text"_, _"Don't wrap text in a small app bar"_.
- **The store, on the shadow.** `md.comp.app-bar` has `on-scroll.container.elevation` (level 2) and no shadow color. The deprecated set it replaces had `md.comp.top-app-bar.small.on-scroll.container.shadow-color`, and upstream's deprecation message on it is: _"Bug: should not have been created. Remove any shadows on navigation bars."_
- **[`scroll-state`](probes/scroll-state.mjs)** ([reading](checks/scroll-state.txt)), in Playwright's Chromium 158, Firefox 159 and WebKit 27.2:
  - `container-type: scroll-state` exists in Chromium only. `animation-timeline: scroll()` exists in the three.
  - One `IntersectionObserver` on the document's root element follows the scroll position in every case tried: at each crossing of the start, from 1px, after a jump to the end and back, with `height: 100%` on `html` and `body`, with a body margin, in RTL with horizontal overflow (not scrolled sideways), in a 100000px document, and in a frame whose own page is scrolled. 200 scroll steps away from the start make 1 callback. With a top margin of 1px, the `height: 100%` case loses the state, and with the default root the frame never gets it.
  - A sticky bar pins as a child of `body`. Inside a `<header>` of its own height it scrolls away (top −2000px), and inside a `<header>` with `display: contents` it pins. With `height: 100%` on `body` it scrolls away with the body.
  - Positioned content paints over a sticky bar with `z-index: auto`, and under one with `z-index: 1`.
- **[`scroll-sideways`](probes/scroll-sideways.mjs)** ([reading](checks/scroll-sideways.txt)), in the same engines, with a 1280px viewport and 6000px content. With 0px sides, the state is off at every position from `scrollX` 1280 that is scrolled down, 15 of 40, because the root element's box is one viewport wide and has left the root's area. With sides as large as the top, none of the 40 is wrong, also in RTL, with `html { height: 100% }` and with `html { width: max-content }`, and 48 sideways steps away from the start make no callback.
- **[`mechanisms`](probes/mechanisms.mjs)** ([reading](checks/mechanisms.txt)), in the same engines, after the feature proof: the state against `scrollY > 0` at 15 positions on each of 22 pages, four ways.
  - The observer on the root element is wrong on the same 8 pages in each engine. They are the proof's kinds, and a negative margin, a translated and a rotated root besides.
  - **The observer on a box in the top layer is right on all 22, in each engine,** and runs once over 200 scroll steps.
  - A scroll-driven animation read through its events is right on all 22 in Chromium and Firefox. In WebKit it is wrong on 21, off at the end of the page.
  - A `scroll` listener is right on all 22, and runs 200 times.
  - [An earlier run](checks/shifted-edge-chromium.txt) in Chromium had the root-element observer with its edge moved just above the start. It is wrong on all 22.
- **[`mechanism-details`](probes/mechanism-details.mjs)** ([reading](checks/mechanism-details.txt)):
  - **The box** is right in a frame, on a page that grows and shrinks, after a reload and a reconnect, under reduced motion, and in and after a screenshot with animations disabled. When a bar connects, the focus stays, an open `auto` popover stays open, no `toggle` event reaches the document, the document's size and the hit target at its corner are unchanged, and a modal dialog opens as before. WebKit's reload didn't restore a position, so it read nothing.
  - **The animation** stays on when a scrolled page shrinks to one that doesn't scroll, in Chromium and WebKit. In Firefox a screenshot with animations disabled turns it on, and it stays on.
  - **1000 scroll steps in Chromium:** the box and the root-element observer add no style recalculation and no measurable script. The animation adds 999 recalculations, about 11ms. The listener adds about 14ms of script.
- **[`top-layer-box`](probes/top-layer-box.mjs)** ([reading](checks/top-layer-box.txt)): the box is right in RTL, in vertical writing, in a scrolled frame and after `moveBefore` (not in WebKit, which has none). Each requirement below, taken away, gives a wrong state in the three engines.
- **Scroll-driven animations are Baseline** since 2026-10-27, newly available (webstatus.dev, read on 2026-11-23), so `RD-20`'s floor has them. That isn't why the animation isn't taken.
- **Limits:** scrolling was programmatic, and the proof adds the wheel and the keyboard. Safari, its overscroll, touch scrolling and pinch zoom weren't read.

## The element

|  |  |
| --- | --- |
| Tag, entry | `mx-top-app-bar`, `top-app-bar/top-app-bar` in `files.json`, typed in `react.ts` |
| Attributes, events, parts | None |
| Slots | The default slot is the headline. `lead` is the navigation icon, and `trail` the actions, as in the list item's names |
| Custom state | `:state(scrolled)`, public and in the manifest |
| CSS properties | `--md-top-app-bar-container-color`, `--md-top-app-bar-on-scroll-container-color` |

**Waits,** and none is precluded: the subtitle, the centered headline and the search bar, with the landing plan's list. Each would be a new slot or attribute.

### Required properties

1. **The host is the box** (the `.host` exception _The host is the box_). The shadow root holds the three slots and the scrolled state's box (amended 2026-11-23). The insets are on the slots, so a page's universal reset changes none of them, as in `RD-53`.
2. **The host places itself:** `position: sticky` at `inset-block-start: 0`, with `z-index: 1`, so that positioned content scrolls under it. They are ordinary `:host` declarations, so a page rule on `mx-top-app-bar` overrides them, and `position: static` unpins it.
3. **Layout:** the height is the token's 64px as a minimum. `lead` and `trail` keep their width, the headline takes the rest, and everything is centered on the block axis. Insets: the tokens' 4px at both edges, 4px between neighboring slots that have content, and `icon-button-space` between the actions. With no `lead`, the headline starts 16px from the edge, and with no `trail` it ends 16px from it. The spec gives no figure for an empty slot, so 16px is this plan's choice, the headline's inset in M3's medium bar.
4. **The headline** takes the title's text style and color. A slotted heading takes that style too, with no margin, unless the page styles it. It isn't truncated and may wrap, and the bar then grows, because a narrow or zoomed page must not lose text.
5. **`lead` and `trail`** set `leading-icon.color`, `trailing-icon.color` and `icon.size` on the slot, for what inherits them, such as `mx-icon`. `mx-icon-button` and `mx-link-button` keep their own.

### The scrolled state

**One `IntersectionObserver` per bar,** on a box without size that the component places at the document's scroll start. The state is on while the box is outside the viewport's block axis. [`top-layer-box`](probes/top-layer-box.mjs) is the pattern. (Amended 2026-11-23. The target was the document's root element, [below](#disposition-of-the-feature-proof-at-6dbdcbbd1).)

- **The box is in the top layer,** as a `popover="manual"` in the shadow tree that the component shows at connect. It is `position: absolute` at the start, so its containing block is the document's initial one. It scrolls with the document, and no page style moves it or reaches it. Outside the top layer the host, which is positioned, holds it, and the state is never on.
- **It has no size, margin, border or padding, and it is `visibility: hidden`.** The user agent's popover styles set most of these. It takes no hit, no focus and no place in the accessibility tree.
- **The state is the opposite of `isIntersecting`,** with no threshold. A box without size at the area's edge intersects it. From the box's top alone, a bar hidden at the start and shown at a scrolled position stays off.
- **`root: document`** is required: with the default root, a frame's observer measures against the outermost page.
- **Side margins too large for a page to exceed** are required: with 0px, a page scrolled sideways is on at the start. **The block margins are 0.** A top margin delays the state by its size.
- **It starts at connect and stops at disconnect,** and the box is shown again at each connect, because a disconnect hides it. The first callback sets the initial state, also for a restored scroll position. **A connect callback that runs while the bar is disconnected shows nothing and reports no error** ([ruling](#ruling-on-a-connect-while-disconnected), added 2026-11-24).
- **No scroll listener and no layout read.** The state changes at a crossing only, which is property 4 of the landing plan.
- **The state is the platform's, as `:hover` is.** No consumer sets it and no event reports it.

**Costs:** one element and a few declarations. The bar's box counts as an open popover in its own shadow tree. While the bar is `display: none` its state is on. By reasoning and not by reading, a bar shown again at the start then draws the scrolled color for its first frame, and transitions to rest.

**Not taken:**

- **The root element as the target,** the first mechanism. Its place and size are the page's, so each page shape is a correction: the top margin, the side margins, and now an offset root and a root with no height. A margin can't follow an offset that the page changes, as at a breakpoint. The one patch for the second kind that was tried, a shifted edge, is wrong on every page in Chromium.
- **Documenting these pages as limits.** `html { margin-top }` is how a page makes room for an admin bar, and it isn't invalid usage. The box is right there, at the cost above.
- **A scroll-driven animation read through its events.** It is inside the floor, and this plan first dropped it because it gives no state, which its events do. It isn't taken because it is wrong in the three engines (readings above), and it recalculates a style on each scroll frame, which property 4 excludes.
- **A `scroll` listener.** It is right everywhere and simplest, and it runs on each scroll frame, with a layout read. Property 4 excludes both, and the box meets it.
- `scroll-state(stuck)`: Chromium only. It also styles only what is inside the bar, so a consumer couldn't use it.
- The bar as its own target, at `inset-block-start: -1px`: it moves the box by 1px, and it reports a stuck bar rather than a scrolled page.
- A sentinel in the page's tree. The top-layer box is a sentinel that isn't in it.

**Scroll container:** the document's, by property 5 of the landing plan. In another scroll container the bar is sticky there and stays at rest.

### Scrolled: color, and no shadow

**The container color changes to `on-scroll.container.color`, and no shadow is drawn.** The landing plan's property 3 says _"container colour and elevation"_. It was written before this reading: the spec shows and describes a color change only, and upstream calls the shadow on these bars a bug and says to remove it. material-x draws elevation only as a shadow, so `container.elevation` and `on-scroll.container.elevation` are excluded by ruling (`RD-34`), and property 3 is amended.

- **The cost:** a page whose content has the color `surface-container` at the top shows no edge under the bar.
- **The owner chose color only on 2026-11-23** (`RD-54`), relayed by the coordinator: _"(а), и поехали"_ ("(a), and let's go"). The next bullet is the option he didn't take.
- **If the owner wanted the shadow:** the bar would adopt the elevation stylesheet on its host at the token's level, and then wait for `RD-53`'s shared host-box stylesheet. The shadow would also be the first one in material-x that no component token colors.

**Motion:** `background-color` transitions over `expressive.default-effects` (200ms), because the tokens give no motion and the effects scheme is M3's for color. It isn't motion under `RF-107`'s policy, so a reduced-motion preference leaves it. A page loaded at a restored scroll position runs it once.

### Tokens

| Read | Not read |
| --- | --- |
| `md.comp.app-bar`: `container.color`, `on-scroll.container.color`, `container.shape`, `title.color`, `leading-icon.color`, `trailing-icon.color`, `icon.size`, `leading-space`, `trailing-space`, `icon-button-space` | `container.elevation` and `on-scroll.container.elevation` (above); `subtitle.*`, `search.*` and `avatar.size`, which wait |
| `md.comp.app-bar.small`: `container.height`, `title.font` with all its parts, tracking included | The deprecated `icon.size`; `subtitle.*` and `search.*`; every `md.comp.top-app-bar.*` set |

The package keeps the scrolled values in a state of their own, rendered on `:host(:state(scrolled))`.

### Accessibility

**The bar exposes no landmark and no role.** A bar inside a region isn't the page's banner. The page sets `role="banner"` on the bar itself, which keeps it a child of `body` and so pinned. A `<header>` around it needs `display: contents`. The bar takes no focus of its own, and Tab goes through `lead`, the headline and `trail` in order. The consumer chooses the heading level.

The owner confirmed the role on the bar on 2026-11-23 (`RD-54`): _"Да, тогда role="banner" выглядит правильнее всего"_ ("Yes, then role="banner" looks the most correct").

**A pinned bar covers focused and targeted content** unless the page sets `scroll-padding-block-start` on its scroller. No component can set it. The component page says so, and the story does it.

### Known differences from M3

- `mx-icon-button` is 40px wide and has no 48px target, so its icon is 4px nearer the edge than in M3's image.
- `mx-icon-button` in `lead` draws its own `on-surface-variant`, and not `leading-icon.color`. Overriding it would reach into another component's private properties in each of its states.

## Work

1. **Source:** `src/top-app-bar/`, with the element, its template, its styles and one token package; `files.json` and `react.ts`. The observer is used once, so it stays in the component.
2. **Docs of the component:** JSDoc with the custom state, stories (playground, actions, a scrolling page with the banner and `scroll-padding`), and the component page.
3. **Tests,** below, and the runtime-shape snapshot of `traits-baseline`.
4. **Size:** the new row and `complete`. No limit applies.

**No dependency on `material-x/card-1`:** with no shadow, the bar doesn't use the host-box elevation stylesheet. Both branches add lines to `files.json`, `react.ts`, the snapshot and the index, where `RD-53` and `RD-54` go to the same place. The later one to merge keeps both.

### Tests

In each engine at `RD-20`'s floor, with real scrolling of the document:

- **`top-app-bar.browser.test.ts`:**
  - the state is off at the start, and then on after 1px and after a jump to the end, each a crossing from an observed off, and off again at the start. **Witness:** the 1px row fails with a top margin of 2px;
  - it is on when the bar connects to a scrolled page, and after a disconnect and a reconnect at another position it matches that position;
  - it is read at 0, at 1px, past one viewport and at 0 again, with each of `html { margin-top: 46px }`, `html { position: relative; top: 20px }`, `body { position: absolute; inset: 0 0 auto }`, `html { height: 0 }` and `html { height: 100% }`. **Witness:** the first four fail with the observer on the root element;
  - with content wider than the viewport and `body { width: max-content }`, a page scrolled sideways past one viewport is off at the start and on when it is scrolled down too. **Witness:** the row fails with side margins of 0px;
  - a scrolled page that becomes too short to scroll is off;
  - a bar hidden with `display: none` at the start and shown at a scrolled position is on. **Witness:** the row fails with the state taken from the box's top;
  - a bar that another element's `connectedCallback` removes in the same insertion reports no error on the window, and inserted again at a scrolled position it is on, and off at the start. **Witness:** the row fails without the check, and with a bar that starts at its first connect only (added 2026-11-24);
  - many scroll steps away from the start change the host's states once, with no `scroll` listener added to the document or the window. **Witness:** the row fails with a listener that does nothing, in either place, and with one that sets the state;
  - the bar's top stays 0 on a scrolled page, positioned content stays under it, and a page's `position: static` unpins it;
  - the bar adds no role and no tab stop, the focus order is `lead`, headline, `trail`, and a consumer's `role="banner"` stands in Chromium's accessibility tree.
- **`top-app-bar.spec.browser.test.ts`,** with a contract for the package: the container's color at rest and scrolled, its corners and height; the headline's color and whole text style, for text and for a slotted `<h1>`; the slots' icon colors and size, on an `mx-icon`; the insets with and without `lead` and `trail`, with provenance for each literal, and in RTL; no shadow when scrolled; each CSS property; the insets under a page's universal reset; a long headline wraps and nothing is cut; the color change runs over the motion token's duration.
- **`top-app-bar.visual.browser.test.ts`:** two screenshots, at rest and scrolled, because the state is the document's and one document can't show both (amended 2026-11-23; the plan said one). The owner records its baseline (`RD-13`).

### Stopping boundary

The implementer stops and returns to the architect if the state differs from the scroll position in an engine at the floor, or if a property can't hold with the host as the box.

## Owed after the merge

In the documentation unit that `RD-53`'s plan describes: `architecture.md` (the component list, and _The host is the box_), `accessibility.md` and the README's list. One unit may carry both components.

## Implemented 2026-11-23

On `material-x/top-app-bar-1` from `49e4b9e9b`, for [#172](https://github.com/ausginer/material-x/issues/172). No visual run and no Safari run was made.

- **Tests:** the bar's behavior and spec rows pass in Playwright's Chromium, Firefox and WebKit. The whole material-x run passes in the three, and the node project passes after the build.
- **Witnesses, each in the three engines:**
  - A top margin of 1px fails only the `html { height: 100% }` row.
  - Side margins of 0px fail only the sideways row.
  - An added scroll listener that sets the state fails the steps row, and the row that keeps the state while the bar is disconnected.
- **Size, Brotli:** `top-app-bar/top-app-bar` 1357 B. `complete` goes from 22736 to 23160 B (+424 B), measured by taking the entry out of `files.json`.
- **Visual rows:** two screenshots, `top-app-bar-rest` and `top-app-bar-scrolled`, where the plan says one. The state is the document's, so one document can't show both, and the rows scroll for real. Both baselines are missing until the owner records them (`RD-13`).
- **The space between slots and the 16px headline inset are literals of the token package,** with their provenance in the spec file, because no token gives them.
- **`package.json`'s `files`** gains `top-app-bar`, which the build doesn't write itself.

## Disposition of the feature proof at `6dbdcbbd1`

By the architect, 2026-11-23, on the [report](../reviews/top-app-bar-1/feature-proof-claude.md) at `4b4d73016`, relayed by the coordinator. All seven findings are accepted.

**The ruling on the mechanism.** Property 4 of the landing plan stands, and the mechanism stays one observer. Its target changes, because both corrections and both tier A findings have one cause: the observer read the scroll position from the root element's box, and the page owns that box. A box in the top layer has a place that no page style moves. The readings and the options not taken are [above](#the-scrolled-state). Nothing here is the owner's: no property that he answered changes.

| Finding | Ruling |
| --- | --- |
| `reviewer-1` | **Accepted, repaired by the new target.** The box is right with a root element that has no height |
| `reviewer-2` | **Accepted, repaired by the new target.** The state follows the scroll position, not the root's offset. With the bar's own `inset-block-start: 0` the bar may not be pinned yet when the state turns on, and that is the state's definition. No limit is documented for `reviewer-1` or `reviewer-2` |
| `reviewer-3` | **Accepted as a case of `RF-122`** (`main` at `3aef04f7e`). **Nothing is owed here:** the owner chose that the reader declares what it reads, so the repair is the checkbox's, and the bar gets no slot reset. Until `RF-122` lands, an unchecked checkbox in the bar is an exception to `RD-47` property 1. Its row for the top app bar lands with whichever of the two lands second |
| `reviewer-4` | **Accepted, and it survives.** The row fails when a listener is added to the document or to the window. **A row for a layout read or an `onscroll` handler isn't owed:** the count of state changes and the two listener places are what a later edit would plausibly break |
| `reviewer-5` | **Accepted, and it survives,** with another witness. The thresholds are gone, so a top margin of 2px replaces them: the 1px row must fail |
| `reviewer-6`, `reviewer-7` | **Accepted, unchanged.** The mechanism doesn't touch them |

**The rows that change with the mechanism:** the `html { height: 100% }` row joins the pages row, the sideways row gains the start (at a scrolled position its witness no longer fails), the shadow root's row expects the three slots and the box, and the rows for a page that shrinks and a bar shown again are new. The other rows stay. The witness _a top margin of 1px fails the `html { height: 100% }` row_ is withdrawn.

**For the implementer, also:**

- the proof's [`pages.browser.test.ts`](../reviews/top-app-bar-1/probes/pages.browser.test.ts), rerun on the repaired bar in the three engines, reports no page as `BAD`;
- the comment on the observer's options and the JSDoc say what is true now;
- the component page's _Position_ names the common form of another scroll container, from the proof's _Not findings_: `overflow-x: hidden` on both `html` and `body` makes `body` one, so the bar scrolls away, and `overflow-x: clip` on `body` doesn't;
- the size of `top-app-bar/top-app-bar` and of `complete`, again.

**Two screenshots:** the _Tests_ section now says two. The reason in _Implemented_ is right.

**Then a recheck** by the reviewer, of the state and the changed rows only. The [stopping boundary](#stopping-boundary) stands.

## Dispositions implemented 2026-11-24

On `material-x/top-app-bar-1` from `27e02d677`. `origin/main` at `3aef04f7e` adds only records and merges cleanly, so it wasn't merged. No visual run, no Safari run and no Storybook build was made.

- **Source:** the template's fourth element is `<div class="scroll-start" popover="manual">`. The bar shows it at each connect and observes it, and the state is the opposite of `isIntersecting`.
- **Tests:** the whole material-x run passes: 3188 passed, 24 skipped and 7 expected failures, with the browser and spec rows in Playwright's Chromium, Firefox and WebKit. The runtime-shape snapshot didn't change. Typecheck, lint and formatting pass.
- **Witnesses** ([reading](checks/mutations.txt), [script](probes/mutations.mjs)): 22 mutations and a clean control, in the three engines. Each named row fails in the three:
  - the root element as the target, with its former options, fails exactly the first four pages;
  - a 2px top margin fails the 1px row, and the five pages, which read 1px too;
  - 0px sides fail only the sideways row, and the box's top only the row of a bar shown again;
  - a listener that does nothing, on `window`, bare or on `document`, fails only the steps row, and one that sets the state fails it and the row for a disconnected bar;
  - a state that never turns off fails the row of a page that shrinks, and a fifth element fails the shadow root's row. The plan named no witness for these two;
  - without the show the state is always on, and with one show only, the reconnect at the start fails;
  - `position: fixed`, `flex: initial` and no `align-items` on the slots each fail their new rows, and each of the headline's six declarations, taken away, fails both of its rows.
- **The proof's pages** ([reading](checks/pages.txt)): no page is `BAD` in the three engines, and the wheel, the keyboard and the smooth scroll match.
- **The default root** still fails the sideways row in the three engines, and only that one, where it failed 11 rows with the root element as the target.
- **Size, Brotli:** `top-app-bar/top-app-bar` 1357 to 1407 B (+50 B). `complete` 23160 to 23154 B (−6 B).
- **No departure from the plan.** In the row for a page that shrinks, the fixture clears the `min-height` that Vitest's page gives `body`, which otherwise leaves 48px to scroll.

**One reading for the architect, not repaired.** If another element's `connectedCallback` removes the bar in the same insertion, the bar's own callback runs while it is disconnected. `showPopover` then throws, so an `InvalidStateError` is reported in the three engines ([reading](checks/removed-while-connecting.txt), [probe](probes/removed-while-connecting.browser.test.ts.txt)). The observer isn't started. The root-element target didn't throw there by construction, and I didn't run it. The repair would be a check that the plan doesn't have: `isConnected`.

## Ruling on a connect while disconnected

By the architect, 2026-11-24, on the implementer's reading above at `c3b71774b`, relayed by the coordinator. **A change is required: the bar shows and observes the box only while it is connected.** `scrollStart.isConnected` in `connected` is enough, around both calls.

- **It is inside the contract** (`CONTRIBUTING.md` §1.1, the gate). No misuse is needed. A container that takes its children out when it connects is an ordinary element, and the platform then runs the bar's own connect callback after the removal. §1.1 names reentrancy and event ordering as what the library must be correct under.
- **The check isn't nannying.** It validates nothing that a consumer passes. `showPopover` requires a connected element, and the call is the bar's own. Without the check, a correct page gets an uncaught error from the library's code.
- **The other elements report nothing in the same case** ([reading](checks/disconnected-connect.txt), [probe](probes/disconnected-connect.browser.test.ts.txt), in Chromium, Firefox and WebKit). Of the package's 20 tags, the bar alone reports an error. The others' connect callbacks add listeners, observe or request a context, and none of these throws on a disconnected element. With the check, none of the 20 reports one.
- **The harm is the error report only.** A removal's own callback follows, and without the check a bar inserted again later is also right. So the change is for the error, and the second half of the row is for the check itself: it must not cost a later connect.
- **A bar that is moved rather than removed is right today,** and stays right with the check: the box is shown, and the state matches at both positions.
- **Not taken:** a `try`/`catch`, which hides every other failure of the show; a microtask, which delays the state and needs the same check; a check in core's `connectedCallback`, which changes the lifecycle of every element for one element's call.
- **Outside the contract: a document with no window,** such as `createHTMLDocument()`. The bar reports an error there, and `isConnected` doesn't change that. No element of the package works in another document: its constructed stylesheets belong to the document that made them, and in Chromium three other tags report that. No check and no row are owed.
- **The implementer** adds the check and the row, reruns the bar's rows in the three engines and the two witnesses, and reads the size of `top-app-bar/top-app-bar` and `complete` again. Then the recheck, which includes this row.
- **Limits:** Safari isn't run, and the size of the check isn't measured.

## The ruling implemented 2026-11-24

On `material-x/top-app-bar-1` from `85f7c64d0`. `origin/main` wasn't merged.

- **Source:** `connected` shows and observes the box only if `scrollStart.isConnected`.
- **Tests:** the row is three `it`s: no error on the window, and the state of the bar inserted again at the start and at a scrolled position. Both positions are followed to the other one, so that a bar without an observer doesn't match. The bar's rows pass in Playwright's Chromium, Firefox and WebKit. The whole material-x run was made in Chromium with the node project: 1098 passed and 2 expected failures. Typecheck, lint, formatting and publint pass.
- **Witnesses** ([reading](checks/mutations.txt), [script](probes/mutations.mjs)), now 24 mutations and a clean control, read again in the three engines. Without the check, only the error row fails. A bar that starts at its first connect only, where a connect while disconnected counts, fails both rows of a later insertion, and both older reconnect rows. Every former mutation fails rows in the three engines, as before.
- **Size, Brotli:** `top-app-bar/top-app-bar` 1407 to 1418 B (+11 B). `complete` 23154 to 23134 B (−20 B). No other row moved.
- **No departure from the ruling.** Safari and the visual project weren't run, and neither was the Storybook build.
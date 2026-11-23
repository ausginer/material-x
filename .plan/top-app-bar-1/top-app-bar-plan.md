# `mx-top-app-bar` — plan

**Status: decided as [`repo:RD-54`](../00-index.md). Ready for an implementer, and it doesn't wait for `mx-card`.** Written by the architect on 2026-11-23, on the coordinator's task for [#172](https://github.com/ausginer/material-x/issues/172), on `material-x/top-app-bar-1` from `origin/main` at `92a386a17`. It is unit H of the [landing plan](../landing-1/landing-plan.md#order) (`repo:RD-47`), and answers its [six properties](../landing-1/landing-plan.md#top-app-bar-the-first-sets-third-component). Where the entry and this plan differ, the entry governs. Size: medium.

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
- **Limits:** scrolling was programmatic. Safari's overscroll and touch scrolling weren't read.

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

1. **The host is the box** (the `.host` exception _The host is the box_). The shadow root holds the three slots and nothing else. The insets are on the slots, so a page's universal reset changes none of them, as in `RD-53`.
2. **The host places itself:** `position: sticky` at `inset-block-start: 0`, with `z-index: 1`, so that positioned content scrolls under it. They are ordinary `:host` declarations, so a page rule on `mx-top-app-bar` overrides them, and `position: static` unpins it.
3. **Layout:** the height is the token's 64px as a minimum. `lead` and `trail` keep their width, the headline takes the rest, and everything is centered on the block axis. Insets: the tokens' 4px at both edges, 4px between neighboring slots that have content, and `icon-button-space` between the actions. With no `lead`, the headline starts 16px from the edge, and with no `trail` it ends 16px from it. The spec gives no figure for an empty slot, so 16px is this plan's choice, the headline's inset in M3's medium bar.
4. **The headline** takes the title's text style and color. A slotted heading takes that style too, with no margin, unless the page styles it. It isn't truncated and may wrap, and the bar then grows, because a narrow or zoomed page must not lose text.
5. **`lead` and `trail`** set `leading-icon.color`, `trailing-icon.color` and `icon.size` on the slot, for what inherits them, such as `mx-icon`. `mx-icon-button` and `mx-link-button` keep their own.

### The scrolled state

**One `IntersectionObserver` per bar,** on `document.documentElement`, with `root: document`. The root's margins leave only the area above the scroll start, and the state is on while the root element reaches into it. The probe's observer is the pattern: top and side margins too large for a page to exceed, `-100%` at the bottom, and a threshold just above 0.

- **`root: document`** is required: with the default root, a frame's observer measures against the outermost page.
- **The large top margin** is required: with a margin of 1px, `html { height: 100% }` leaves the strip again once the page has scrolled past it.
- **The large side margins** are required (amended 2026-11-23, on Mx Implementer B's stop, relayed by the coordinator): with 0px, a page scrolled sideways by a viewport turns the state off while content is under the bar. `body { width: max-content }` is such a page whose bar is still in view. The alternative, the wide page as a recorded limit, isn't taken, because the margins cost a few bytes and nothing at run time.
- **It starts at connect and stops at disconnect.** The first callback sets the initial state, also for a restored scroll position.
- **No scroll listener and no layout read.** The state changes at a crossing only.
- **The state is the platform's, as `:hover` is.** No consumer sets it and no event reports it.

**Not taken:**

- `scroll-state(stuck)`: Chromium only. It also styles only what is inside the bar, so a consumer couldn't use it.
- A scroll-driven animation: every engine has it, but it gives no state to style against, and its progress is the scroll position, so the change has no duration of its own.
- The bar as its own target, at `inset-block-start: -1px`: it moves the box by 1px, and it reports a stuck bar rather than a scrolled page.
- A sentinel element: it would be in the page's tree, because anything in a sticky bar moves with it.

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
  - the state is off at the start, on after 1px and after a jump to the end, and off again at the start;
  - it is on when the bar connects to a scrolled page, and after a disconnect and a reconnect at another position it matches that position;
  - with `html { height: 100% }` it stays on past one viewport. **Witness:** the row fails with a top margin of 1px;
  - with content wider than the viewport and `body { width: max-content }`, it stays on when the scrolled page is scrolled sideways past one viewport. **Witness:** the row fails with side margins of 0px;
  - many scroll steps away from the start change the host's states once, with no `scroll` listener added. **Witness:** the row fails with a scroll listener that sets the state;
  - the bar's top stays 0 on a scrolled page, positioned content stays under it, and a page's `position: static` unpins it;
  - the bar adds no role and no tab stop, the focus order is `lead`, headline, `trail`, and a consumer's `role="banner"` stands in Chromium's accessibility tree.
- **`top-app-bar.spec.browser.test.ts`,** with a contract for the package: the container's color at rest and scrolled, its corners and height; the headline's color and whole text style, for text and for a slotted `<h1>`; the slots' icon colors and size, on an `mx-icon`; the insets with and without `lead` and `trail`, with provenance for each literal, and in RTL; no shadow when scrolled; each CSS property; the insets under a page's universal reset; a long headline wraps and nothing is cut; the color change runs over the motion token's duration.
- **`top-app-bar.visual.browser.test.ts`:** one screenshot, at rest and scrolled. The owner records its baseline (`RD-13`).

### Stopping boundary

The implementer stops and returns to the architect if the observer's state differs from the scroll position in an engine at the floor, or if a property can't hold with the host as the box.

## Owed after the merge

In the documentation unit that `RD-53`'s plan describes: `architecture.md` (the component list, and _The host is the box_), `accessibility.md` and the README's list. One unit may carry both components.
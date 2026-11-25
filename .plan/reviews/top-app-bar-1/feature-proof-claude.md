# `mx-top-app-bar` (RD-54, #172) — feature proof

**Files were read at:** `6dbdcbbd1`, the head of #211 (`material-x/top-app-bar-1`), in slot `e`, detached. The base is `origin/main` at `92a386a17`. The task named the revision `6dbdcbbb1`, which doesn't exist. The branch's tip differs from it by one character, so I read the tip. Mutations were written into slot `e`'s files and restored after each run. Browsers: Playwright's Chromium, Firefox and WebKit, one suite at a time.

**Subject:** the [plan](../../top-app-bar-1/top-app-bar-plan.md) with its probes and readings, `repo:RD-54` in [`00-index.md`](../../00-index.md), `repo:RD-47`'s six properties in the [landing plan](../../landing-1/landing-plan.md#top-app-bar-the-first-sets-third-component), and the diff `92a386a17...6dbdcbbd1`.

**Verdict: the bar meets the plan's properties in the three engines, on the pages the plan read and on most others. The state is wrong on two other kinds of page, in all three engines (`reviewer-1`, `reviewer-2`, both tier A), so the plan's stopping boundary applies and they go to the architect. One more tier A finding is narrow (`reviewer-3`). Four findings (tier B) are rows that pass without what they guard. The tokens read and not read are as the plan says.** The three witnesses that the plan names reproduce. The plan's own assertion that no `scroll` listener is added doesn't work for a listener on `window` (`reviewer-4`).

## Scope

**Covered.**

- **Rows.** The bar's browser and spec rows: 185 passed, 4 skipped, across the three engines. CI on `6dbdcbbd1` passes every job that finished except `chromium`. That job fails on the two visual rows only (_"No existing reference screenshot found"_), and its other rows pass (3,297).
- **Mutations** ([`mutations.txt`](checks/mutations.txt), [`mutations-follow-up.txt`](checks/mutations-follow-up.txt)): 79 in the first run, and 12 runs in the follow-up, two of them clean controls. Each ran in the three engines. Two of the first 79 were invalid, because they used `this` inside `connected()`: _role attribute at connect_ and _host tabindex_. The follow-up repeats them correctly, and the row fails.
- **The witnesses.** A top margin of 1px fails only the `html { height: 100% }` row. Side margins of 0px fail only the sideways row. A scroll listener that sets the state fails the steps row, and the row that keeps the state while disconnected. Beyond the plan: `root` left at its default fails 11 rows, so the frame case is guarded, because each row runs in Vitest's frame.
- **The state on 27 pages** ([`pages.txt`](checks/pages.txt), probe [`pages.browser.test.ts`](probes/pages.browser.test.ts)). Zoom, a root with a transform, `contain`, `overflow-x`, `display: contents` on `body`, vertical writing and others match `scrollY > 0` in the three engines. Five pages don't: `reviewer-1` and `reviewer-2`.
- **Real input, which the plan's limits leave out.** A wheel step down, up and of 1px, `End` and `Home`, and a smooth scroll, in the three engines: the state matches. I didn't read touch or Safari's overscroll.
- **Layout and the six properties** ([`layout.txt`](checks/layout.txt), probe [`layout.browser.test.ts`](probes/layout.browser.test.ts)). Insets with an icon button in `lead` (4px, 40px, 4px, headline), mixed actions in `trail`, centering, the 64px height, a link button that keeps its width in a narrow bar, and the bar taking its space in the flow. `mx-icon-button` renders the same in the bar as alone. A link button in `trail` renders the same too: only its host inherits the slot's font size, and the host draws nothing.
- **Slotted controls** ([`inherited-properties.txt`](checks/inherited-properties.txt), probe [`inherit.browser.test.ts`](probes/inherit.browser.test.ts)), in `lead`, the headline and `trail`, with and without the bar's private custom properties: `reviewer-3`.
- **Tokens.** From the store and the generated CSS: every token in the plan's _Read_ column is in the package and read by a rule, every one in _Not read_ is absent, and no declared property goes unread. `on-scroll.container.color` is the scrolled state's `container.color`. The store marks no token that the package reads as deprecated. `container.elevation` and `on-scroll.container.elevation` are absent, as the ruling in `RD-54` says.
- **The two deviations.**
  - **Two screenshots:** the stated reason holds, because the state is the document's. The plan's _"one screenshot, at rest and scrolled"_ doesn't match what was built, so it's the architect's to amend.
  - **The literals 4px and 16px in the token package:** this matches the text field's packages, and the rows compare against their own literals, not the bridge's. A value of 5px or 15px in the package fails 6 rows.
- **The plan's surface.** Attributes, events and parts: none. `:state(scrolled)` is in the JSDoc and the compiled CSS. The three slots are the only children of the shadow root. `files.json`, `package.json` and `react.ts` agree.

**Not covered:** Safari and the visual project (no baselines), a touch scroll, an overscroll, the size row and the build (from the implementer's report and CI only), the Storybook pages in a browser, and the accessibility tree outside Chromium. The plan's _"reduced motion leaves it"_ wasn't run.

## Findings

### reviewer-1

**Tier A, introduced by this change.** On a page whose root element has no height, the state is on at the scroll start, in the three engines.

- **Contract:** `:state(scrolled)` is _"the document is scrolled away from its start"_ (JSDoc), and the plan's test says the state is off at the start.
- **Current behavior:** with `body { position: absolute; inset: 0 0 auto }`, the document scrolls (4344px in the probe) and its root element has a height of 0. The state is on at `scrollY` 0, stays on at every position, and is on again after a return to 0. `html { height: 0 }` gives the same.
- **Why:** a target with no area has an intersection ratio of 1 whenever the observer reports an intersection, so `intersectionRatio > 0` is true when the root element's edge touches the observed area at the start. A document whose content is all absolutely positioned, or whose `body` is, is a real page shape, and the plan's _"Scroll container"_ section doesn't exclude it.
- **Why it matters:** the bar shows `on-scroll.container.color` on a page that isn't scrolled, and a consumer's rule on `:state(scrolled)` matches there.
- **Evidence:** [`pages.txt`](checks/pages.txt), _body absolute_ and _html height 0_, three engines.
- **Required property:** the state is off at the scroll start of any document, or the plan states which documents it doesn't cover, and the component's documentation says so. The stopping boundary sends this to the architect.

### reviewer-2

**Tier A, introduced by this change.** A root element that starts below the page's top keeps the state off until it reaches the top.

- **Current behavior:** with `html { margin-top: 46px }` (a page with an admin bar, for example), the state is off at 1, 20 and 45px and on at 47px. With `html { position: relative; top: 20px }` it is off at 1px and 20px, and on at 45px. All three engines agree.
- **Why it matters:** the JSDoc says the document is scrolled away from its start, and the plan's test says on after 1px. The bar reads as at rest while the page is scrolled by up to the offset.
- **Evidence:** [`pages.txt`](checks/pages.txt), _html margin-top 46px_ and _html relative top 20_.
- **Required property:** as `reviewer-1`'s: it matches the scroll position, or the contract and the documentation state the offset. On such a page the bar isn't pinned yet when the state turns on (its top is 23px at `scrollY` 47). The call is the architect's.

### reviewer-3

**Tier A, narrow.** The bar's private custom properties inherit into slotted content, and an unselected `mx-checkbox` in the bar takes `--_container-color`.

- **Current behavior:** `mx-checkbox` draws its box with `var(--_container-color, transparent)`. In the bar, its unselected and disabled box is the bar's `surface` token, where alone it is transparent. With `--md-top-app-bar-container-color` set, the bar is blue in the probe and the box is `rgb(247, 251, 234)`.
- **Reach:** of the components and forms I tried, only the checkbox changes. In `mx-list-item`, the box takes the same value on this tree and the list isn't in the diff, so the effect is already in the library, and this change adds a container. Card (`material-x/card-1`, unmerged) resets `--_container-color` on its slot, and its slots' rows guard it.
- **Contract:** `RD-47` property 1: the trailing slot takes any element.
- **Evidence:** [`inherited-properties.txt`](checks/inherited-properties.txt). The checked box's `clip-path` differences are its animation, not inheritance.
- **Required property:** content in the bar's slots looks as it does outside the bar, or the plan states the exception.

### reviewer-4

**Tier B.** The steps row can't see a `scroll` listener on `window`.

- **Current behavior:** the row spies on `EventTarget.prototype.addEventListener`. In Vitest's browser page `window` has its own `addEventListener`, so a call on `window`, the usual place for a scroll listener, isn't counted (bare and `window.` calls: 0; `document` and `body`: 1 each). A listener on `window` that does nothing leaves all rows passing. A `document.onscroll` handler that reads layout passes too, so _"no layout read"_ has no row either.
- **What still works:** a listener that sets the state fails the row in either place, through its `changes` count, and a listener on `document` fails through `listeners`. The plan's witness is that one, and it reproduces.
- **Evidence:** [`mutations-follow-up.txt`](checks/mutations-follow-up.txt), _window listener, no work_ and _document listener, no work_; [`mutations.txt`](checks/mutations.txt), _scroll listener only_ and _onscroll reads layout_.
- **Required property:** the plan's _"with no `scroll` listener added"_ is a row that fails when one is added, in the place that a listener is usually added.

### reviewer-5

**Tier B.** _Should be on after 1px_ and _after a jump_ measure the initial state, not a crossing.

- **Current behavior:** the row creates the page and scrolls at once, so the observer's first callback runs at the new position. A threshold of 0.01 or of 0.0005 in the component leaves all rows passing, though after a real crossing of 1px the state would stay off. With one more `await observed()` before the scroll, both rows pass at `6dbdcbbd1`, and the 1px row fails under both thresholds, in the three engines.
- **Why it matters:** this is the row that the plan states as _"on after 1px"_, and 1e-9 is the plan's reason for it. The rows that do cross the start (_off again at the start_, the steps row and the spec rows) use larger steps, so none reads a 1px crossing.
- **Evidence:** [`mutations-follow-up.txt`](checks/mutations-follow-up.txt), _1px row waits_, and [`mutations.txt`](checks/mutations.txt), _threshold_.
- **Required property:** a row changes the scroll position from 0 to 1 after the state has been observed off, and reads it on.

### reviewer-6

**Tier B.** The two `font-family` rows pass with the declaration removed.

- **Current behavior:** the rows' surroundings are `body { font: italic 900 9px/99px serif; … }`, and the test page's `.mx-test-body { font-family: Roboto }` beats that rule, so the bar inherits Roboto, which is also the token's value. Without `font-family` on the headline, every row passes. With the surroundings' selector as specific as the test body's, the same removal fails both rows.
- **Evidence:** [`mutations-follow-up.txt`](checks/mutations-follow-up.txt), _surroundings beat the test body_.
- **Required property:** each row of the headline's text style fails when its declaration is removed, as the comment above the rows says.

### reviewer-7

**Tier B.** Three properties of the plan have no row that fails without them. The built bar meets all three ([`layout.txt`](checks/layout.txt)).

- **`position: fixed` instead of `sticky`:** every row passes. The bar's place in the flow isn't read.
- **`flex: none` on the slots:** `flex: initial` passes. _"`lead` and `trail` keep their width"_ (plan, property 3) has no row. The fixture's 24px icons can't shrink, so the row needs content that can.
- **Centering within a slot:** removing `align-items` from the slots passes, because the fixture's icons are equal in height.
- **Evidence:** [`mutations.txt`](checks/mutations.txt), _position fixed_, _slots shrink_ and _slots not centered_.

## Not findings

- Seven survivors are equivalent or can't differ: `isIntersecting` and `entries[0]` (no row differs; I didn't compare them on the pages of `reviewer-1`); `border-radius` and `gap` removed, since `container.shape` and `icon-button-space` are 0; the physical `lead` margin, since both sides are 4px; `min-inline-size: 0`, because in the rows' text `overflow-wrap: anywhere` already shrinks the minimum width; and the unread elevation token, which no rule reads. The corner and gap rows can still fail on a changed token.
- _Disconnect clears the state_ passes, because the row's bar is off when it disconnects. The plan doesn't ask for that.
- _transition: all_ and a `drop-shadow` filter pass. The plan's row reads the running transitions and `box-shadow`.
- `[hidden]` doesn't hide the bar (`display: flex`). `mx-list-item`, `mx-icon`, `mx-text-field` and `mx-button` are the same on this tree.
- An `<h1>` inside another element in the headline slot keeps the user agent's margin and size. The rule is for a slotted heading.
- `html, body { overflow-x: hidden }` makes `body` the scroller, so the bar scrolls away with the page. The plan's _"another scroll container"_ covers it, and the mdx doesn't name this common form.
- `mx-text-field`, `mx-fab`, the buttons and the groups render the same in the bar as outside it, in the forms I tried. The probe took its attribute values from memory, and it didn't check that each is a real variant.

## One next task

The architect answers `reviewer-1` to `reviewer-3`. The implementer then repairs `reviewer-4` to `reviewer-7`.
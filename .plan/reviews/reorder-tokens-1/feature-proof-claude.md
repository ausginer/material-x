# `repo:RF-129` (#230) — feature proof

**Files were read at:** `78dc6d983`, the head of #261 (`material-x/reorder-tokens-1`), in slot `b`. The merge base is `ab4e536bd`. Core, drag and material-x were rebuilt from that tree. Browsers: Playwright's Chromium 158, Firefox 159 and WebKit 27.2, headless, on Linux.

**Subject:** `RF-129` in [`00-index.md`](../../00-index.md), with the owner's answers and the implementer's dating, `RD-31`'s eighth amendment, `RF-68`'s lift rule, the diff `ab4e536bd...78dc6d983`, and #261's description.

**Verdict: the seven required properties hold, in the three engines. No finding is tier A.** Two findings are tier B. The change removed the only rows that read the lift's hold on an interactive item's color and background color (`reviewer-1`). The public text says that the reorder colors go over a page's background color on every item, and on an interactive item they don't (`reviewer-2`). The element's behavior is correct in both.

## Scope

**Covered, on the built elements with real input** ([`look.txt`](checks/look.txt), [probe](probes/look.mjs)). The expected tokens come from the store, not from the package's sheets: twelve tokens, none deprecated, eleven in the new sheet and the shadow color already in the items' sheet.

- **Property 1:** a static, a button, a selected button, a link and a selected link item, with a handle and without, show the container, the six content colors, the 16 px corners and the press wave of the set, hovered, pressed and focused. This includes what the implementer didn't read: **a link item without a handle,** which WebKit lifts by itself, and Chromium and Firefox lift when the page stops the native drag. With that, Firefox's link item takes the tokens too, with a handle and without. A disabled button item and a selected disabled one change no color, corner or wave.
- **Property 2, in each frame:** the container's color and the text's never differ in a frame, from the press to the end of the flight, for a static, a button and a selected item. The flight is in the resting colors. A refused drop, a re-grab in the flight, an Escape and a disconnection in the middle leave the resting look. Escape leaves no `style` attribute.
- **Property 3:** the drop zone is `surface-container-low`, opaque, with the list's shape and with a page's `--md-list-container-shape`.
- **Property 4:** in the built sheets, `:host(:state(drag))` sets the elevation alone. No other `dragged` token is rendered.
- **Property 5:** a key move by a static item, by a static and a selected item's handle, and by a link and a selected link item, with a commit in the handler, after 100 ms, refused and never: each read in the handler and in each frame equals the rest, and the drop zone is hidden. A press on another item during a pending key move starts nothing and shows nothing.
- **Property 6:** `--md-list-item-container-color` and a theme on the list or on the item reach the lifted item. A page's `background-color` and `color` on a static item, also as `!important`, and a `[popover]` rule, hold at rest and after the operation, and not in a pointer drag. Without a page's rule the host is at rest again.
- **Property 7:** in the build, only `list/sortable-list.js` imports the sheet, and `list/list`'s sheet has no drop zone.

**Covered, of the suite and the gates:** `tests/list` with the clean tree: 297, 285 with 2 skipped, and 295 with 2 skipped. Three of the implementer's mutations repeated, with his counts, and five of mine ([`mutations.txt`](checks/mutations.txt), [runner](probes/mutations.mjs)). The root `fmt-check`, the root typecheck and the lint of the changed files pass. CI on `78dc6d983` passes in each job.

**The departures:**

- **The drop zone's rules in the new sheet:** right, by property 7. One effect isn't in the record: a consumer's own drag `sortable` on a plain `mx-list` had the footprint, and has none now. Nothing documents it for `mx-list`, and the element has no such feature, so this isn't a finding.
- **The important rule for `mx-list-item`:** it does what property 6 asks, and is the contract's candidate. It beats a page's `!important` in the drag too, as the property says.
- **No link rows in Firefox:** true. It is `RF-76`, which this diff doesn't change. See the observations.
- **The sizes:** not measured here. CI's `measurements` job passes. In the built sheets the private names are numbered across all sheets, so the list's and the items' names shift. That this is the whole cause wasn't read.

**Forced colors, read in Chromium and Firefox:** the lifted item is in system colors, and the drop zone is the canvas's color, as a footprint with any background would be. Playwright's WebKit doesn't force the colors. The important rule doesn't escape them.

**Not covered:** Safari; touch and a pen; assistive technology; a real high-contrast theme; the drop zone's contrast, which the owner accepted; the visual project, which has no list baseline.

## Findings

### reviewer-1

**Tier B.** No row reads that the lift keeps an interactive item's color and background color, and the diff removed the rows that did.

- **Observed:** at the merge base, `list-roles`' lift row read the host's rect, padding, overflow, `color` and `background-color` for `mx-list-item` and `mx-list-button-item`, with no page rule and with `[popover] { background: red; color: blue }`. The diff takes the last two out of `LIFT_STYLES` for both tags, and adds rows with the new values for `mx-list-item` alone. The button item's host isn't read anywhere now: `sortable-list.spec` reads `.host`.
- **The requirement:** it is in force. `RD-31` property 4, as amended: drag's lift _"keeps its color and background color too, except where a pointer drag's `reorder` tokens replace them"_. `RF-129` property 6 changes it for an `mx-list-item` in a pointer drag alone. `RF-129`'s rows list says _"keeps rect, padding and overflow"_ without naming a tag, so the diff follows its letter.
- **Evidence** ([`lift-colors.txt`](checks/lift-colors.txt), [`mutations.txt`](checks/mutations.txt)):
  - With drag's lift keeping no color and no background color (`color` and `background-color` removed from `UA_PROPS` in `packages/drag/src/lift.ts`, drag rebuilt), all the rows of `tests/list` pass in the three engines, and drag's 461 browser and shipped rows pass in Chromium. The merge base's `list-roles` fails the two button rows in each engine. Without the mutation they pass.
  - With the static item's rule on each item's host (`::slotted(:state(drag))`), which paints a square container behind a button's rounded one, all the rows pass in the three engines.
- **The element:** correct. A button item's host keeps its values under a `[popover]` rule ([`look.txt`](checks/look.txt)).
- **Required property:** a row fails when an interactive item's host doesn't keep its color and background color while it is lifted, with a page's `[popover]` rule and without one.
- **Route:** the implementer for the rows. The architect, if `RF-129`'s rows list meant otherwise.

### reviewer-2

**Tier B.** The public text of `mx-sortable-list` says what holds for a static item alone.

- **Observed:** the _Lift_ item of the JSDoc, which the API reference shows: _"In a pointer drag the item takes Material's reorder colors, over a page's `color` and `background-color` on it"_. It speaks of any item.
- **What the element does** ([`corners.txt`](checks/corners.txt), [probe](probes/corners.mjs)): with `background-color: rgb(0, 0, 255)` on the item, a lifted static item's corner pixel is the drop zone's or the page's color, so the page's rule is gone. A lifted button item's corner is blue in the three engines, outside its 16 px corners, because the host keeps the page's color.
- **A disabled item** is in the sentence too, and takes no reorder color.
- **The requirement:** `RF-129` property 6 says it for _"an `mx-list-item` host"_, and property 1 says that a disabled item keeps its look. #261's description says both correctly.
- **Required property:** the text says which items it is about.
- **Route:** the implementer.

## Observations, no finding

- **A link item by its handle** is lifted by Chromium and WebKit, and not by Firefox. `RF-129`'s _Not read_ says that a pointer drag doesn't lift one in Chromium or Firefox, and `RF-76` speaks of an item without a handle. Firefox's case by the handle is in neither property. The architect's, for `RF-76`.
- **Property 7 has no row.** With `mx-list` adopting the sheet, all the rows pass. The contract asks for no row, and the size rows show it.
- **The row _"should have the page's background-color at rest and after the drop"_** reads it after the drop alone. The mutation _"the static item's rule at rest too"_ fails it, so it discriminates.
- **A key move's corners:** it is true that no row can tell them apart. Focus within the item sets 16 px, the same as the set.
- **A page's background image** on a static item stays over the reorder container in a pointer drag. Property 6 names the two colors alone. By reading, not run.
# A link item lifts in `mx-sortable-list` in every engine (RF-76): feature proof

**Lens:** `reviewer`, feature proof of [`RF-76`](../../00-index.md), with the architect's note of 2026-11-25 (the handle, and `LIFTED_ITEMS` with Firefox) and the implementer's note of 2026-11-27, for pull request #325. The coordinator requested it.

**Commit read:** `85a96ba5a` on `material-x/link-item-drag-1`, one commit on `origin/main` at `085be1e2b` (#315). The commit changes `packages/material-x/src/list/sortable-item.ts`, `src/list/styles/item/interactive-box.styles.css` and three test files, and it adds the unit's [reading](../../link-item-drag-1/chromium-cause.md), probes and checks, and the entry's note.

**Outcome: accepted. One finding, tier B.** Each part of the required property holds at the head in Chromium, Firefox and WebKit:

- a link item lifts under a pointer drag of its surface and of its handle;
- a released drag doesn't follow the link;
- outside `mx-sortable-list`, the link item drags natively as before.

The cause reproduces in each engine with the unit's own probe. The rows witness the lift and the anchor's attribute, and three of my five mutations fail rows in the expected engines. The finding is that no row witnesses the native drag outside the list: a mutation that removes it in Chromium passes every row. A released drag doesn't follow the link because of where the browser sends the click, not because of a mechanism of this unit or drag's click guard. The location rows hold the property and witness neither. That is an observation, not a finding. CI's `verify` passed on `85a96ba5a`.

## Scope and method

- **Unmutated, in Chromium:** every project of `packages/material-x` ([reading](checks/chromium.txt)). 2854 rows pass, 2 are expected to fail, and 9 fail. The 9 are the `axe-core` rows of `mx-checkbox` and `mx-radio` (`aria-prohibited-attr`), and they aren't this unit's:
  - they fail in the same way with the unit's source changes reverted;
  - the unit touches neither element;
  - CI's `chromium` job passes the same file on the head.

  Before the run I rebuilt `packages/core` and `packages/drag` from the head's source in slot g. Their builds were older than core's last source change, and material-x's tests import both builds. So I can't tell whether these 9 rows failed in slot g before the rebuild.

- **Firefox and WebKit, unmutated,** are read from CI's run 45981565822 on `85a96ba5a` (`RD-62`): Firefox 4355 rows passed, WebKit 4356, each with 137 files passed and 1 skipped. Chromium passed 5531 rows, and `verify` succeeded ([reading](checks/ci.txt)).
- **Mutations,** each run in Chromium, Firefox and WebKit at once ([script](probes/mutations.mjs.txt), [readings](checks/mutations.txt)), against `sortable-list.browser`, `sortable-list.spec` and `elevation.spec`:
  - M1: `sortItem` sets no `draggable`.
  - M2: the stylesheet loses its `-webkit-user-drag` rule.
  - M3: `release` leaves the attribute.
  - M4: the rule applies without the attribute.
  - M5: drag arms no click guard. It edits drag's build, and runs against `sortable-list.browser` alone.
- **Probes of my own,** each copied into `tests/list/` for its run and removed after it:
  - [`outside`](probes/outside.browser.test.ts.txt) presses a link item's anchor in `mx-list`, after a move from `mx-sortable-list` into `mx-list`, after a move out to `<body>`, and in `mx-sortable-list`, moves it 12 px and records `dragstart` ([reading](checks/outside.txt)).
  - [`click`](probes/click.browser.test.ts.txt) records where the trailing click goes for a dragged and for a clicked link item, by its surface and by a handle ([reading](checks/click.txt)).
- **The cause:** the unit's `draggable-false.browser.test.ts`, run again in each engine ([reading](checks/cause.txt)).
- **Not covered:** Safari, which is outside `RD-62`'s three engines, and the visual project. Format, lint and typecheck were not run again. CI's `static` job passed.

## The required property

- **Cause.** The unit's probe gives the reading's table in each engine:
  - In Chromium, `a[draggable=false]` under `all: unset` computes `-webkit-user-drag: auto` and starts a `text/uri-list` drag, in the light DOM and in a shadow root. With the added `[draggable=false]` rule, it computes `none` and starts no drag.
  - WebKit computes the same values and starts no drag under its driver.
  - Firefox starts none.
  - M2 confirms the stylesheet half of the repair: without the rule, only Chromium's surface rows of the link item fail (7).
- **The lift, by surface and by handle.** At the head, every row of _mx-sortable-list interactive item pointer_ and of `LIFTED_ITEMS` passes in each engine. M1 fails 28 rows: 8 in Chromium, 19 in Firefox and 1 in WebKit. They are the same rows that the implementer's witness gives at `085be1e2b`. WebKit fails only _"should make a link item's anchor not draggable"_, because its driver starts no native drag.
- **The removal when an item leaves.** `release` removes the attribute, outside `write`. `draggable` isn't among the attributes that the observer watches, so the item's ownership records are unaffected. `useContext`'s cleanup in `ListItemCore` calls `release`. The `outside` probe reads `attribute: null`, `draggable: true` and a native `dragstart` in Chromium and Firefox, both after a move into `mx-list` and after a move out to `<body>`. M3 fails _"should restore a link item's native drag once the item moves into mx-list"_ in each engine. A nested `mx-list` inside the sortable list gets no `sortItem`, because `host.parentElement !== list`, so its link items keep the native drag.
- **Outside `mx-sortable-list`, a native link drag.** It holds at the head: in `mx-list`, Chromium and Firefox fire `dragstart` on the anchor, and Chromium computes `-webkit-user-drag: auto` there. No row witnesses it (fp-1).
- **A released drag doesn't follow the link.** The `click` probe shows the following in each engine, by surface and by handle:
  - The trailing click of a dragged link item targets `mx-sortable-list`, the common ancestor of the press and the release, and `location` doesn't change.
  - A plain click on the same item targets the anchor's content and follows the link, so the probe can tell the two cases apart.
  - M5 removes drag's click guard. The click still targets the list, the link isn't followed, and both location rows pass in each engine.

  So the property holds, by where the platform sends the click, and neither this unit's code nor drag's guard decides it. The two location rows guard it against a change of that path, as the entry says they _"fix the property and don't witness the change"_. I found no change in material-x or in drag's guard that fails them. Whether drag's click guard is witnessed elsewhere is drag's question and outside this pass.

- **The entry's rows.**
  - The interactive item group, the location rows, the anchor's `draggable` in the list and after a move into `mx-list`, and `LIFTED_ITEMS` with a link item without a handle and with Firefox included are all present.
  - `RF-70`'s elevation row reads the link item at its dragged level, and the level-1 stand-in row is gone. That row fails under M1 in Chromium and Firefox and under M2 in Chromium.
- **The comments.** The JSDoc paragraph in `sortItem` and the stylesheet comment state the reason for each part of the repair, and match the code.

## Findings

### fp-1 — No row witnesses that a link item outside `mx-sortable-list` still drags natively

- **Tier B.** The code is correct at the head. The instrument that the entry relies on for this part of the property passes when the property fails.
- **Current behavior.** The row _"should restore a link item's native drag once the item moves into mx-list"_ reads `hasAttribute('draggable')` and the `draggable` property of the anchor. It doesn't read the computed `-webkit-user-drag` or observe a drag. M4 makes the stylesheet rule `.host { -webkit-user-drag: none }`, without the attribute selector. Under M4, every row of the three files passes in each engine.
- **Why it matters.** Under M4, the `outside` probe shows that a link item in `mx-list`, and one moved from the sortable list into `mx-list` or `<body>`, computes `-webkit-user-drag: none` in Chromium and WebKit and starts no native drag in Chromium. The required property says _"Outside `mx-sortable-list`, the link item drags as a native link does"_. The row is named for that property and observes only the attribute, so the stylesheet half of the repair can break the property with every row green.
- **Evidence.** [`checks/mutations.txt`](checks/mutations.txt) (M4: 0 failed in each engine) and [`checks/outside.txt`](checks/outside.txt) (head: Chromium `userDrag: auto` and `dragstart: ["a"]` outside; M4: `userDrag: none` and `dragstart: []`).
- **Required property.** A row fails when a link item outside `mx-sortable-list` stops dragging natively, in an engine whose driver starts a native drag. At the head those are Chromium and Firefox.

## Open issues

No open issue's description stops holding. The pull request closes #128, `RF-76`'s issue. #318 (`RF-155`, drag's stories and the dark theme), #306 (`RF-150`, a drop-zone row in WebKit) and #289, #276 and #200 (drag's findings) don't depend on a link item's native drag.

## Next

The coordinator routes fp-1 to the architect or the implementer, as the owner directs. It doesn't block the merge of the lift itself. CI's `verify` passed on `85a96ba5a`.
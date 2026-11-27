# PR #343, `mx-divider` (`RD-70`) and `mx-card`'s split padding (`RD-53`): feature proof

**Files were read at:** `540c238a9`, the head of `material-x/divider-1` and of PR #343, detached in slot c. **Diff reviewed:** `2ed4b96ab..540c238a9`, all of it.

**Governing records:**

- `RD-70` with both amendments. The second governs, and withdraws the first.
- `RD-53`'s note of 2026-11-27.
- `RD-71`, which is on #337. #337 is open, not merged, at this writing.
- The [plan](../../divider-1/divider-plan.md) and its [`simple-box`](../../divider-1/checks/simple-box.txt) reading.
- The implementer's [report](../../divider-1/divider-report.md), and `RD-68` for the status sentences.

**Lens:** feature proof. Every claim below comes from my own reading or from a run I made.

- **Runs:** in [`checks/`](checks/).
- **Scripts:** in [`probes/`](probes/).
  - The mutation script.
  - Three probe files, which I placed in `tests/divider/` while they ran.
  - A PNG reader.
- **Restoring:** each mutated file was restored from its text before the edit, and `collect-props.ts` from `HEAD`. The probe files are removed, and `git status` was clean before this record.

**An addition from the coordinator,** sent mid-proof: the recorded `dividers.png`, `f58200ea1` on `origin/baselines/material-x/divider-1`. Its two questions are answered under [_The recorded baseline_](#the-recorded-baseline).

**Verdict: `RD-70`'s geometry holds outside constrained flex layouts, and `RD-53`'s note holds. Five Tier B findings and three Tier C findings stand, but the unit isn't ready to merge because of one Tier A finding:**

- **`reviewer-1`, Tier A:** where a flex container has less room than its items need, the divider is shrunk to nothing. A horizontal divider in an `mx-list` that scrolls is 0px high, and a vertical divider in a flex row that overflows is 0px wide. This happens in the three engines.
- **What holds:**
  - The host is the line, and the insets are logical and survive a universal reset.
  - Forced colors draw the line in `CanvasText`.
  - `mx-card` pulls a horizontal direct child to its edges, for every inline padding, in the three engines.
  - The no-node claim holds for a divider with no `id`.
  - The size explanation reproduces byte for byte.
  - Every card row passes in the three engines.
- **The Tier B findings:**
  - The visual row's vertical divider draws nothing (`reviewer-2`). Whether a vertical divider stretches itself is the architect's call (`reviewer-3`).
  - No row keeps the card rule's `:not(:state(vertical))` (`reviewer-4`).
  - An `id` makes the divider a node in Chromium, and the docs say nothing of it (`reviewer-5`, routed).
  - The two status sentences say _"not yet merged"_ (`reviewer-6`).
- **CI:** `verify` on the head fails only on `dividers.png`, which had no baseline (`RD-13`). Firefox and WebKit pass every affected file.

## Scope

- **Read:**
  - The source: `src/divider/` and the card's changes.
  - The docs: `divider.mdx`, the JSDoc, `card.mdx`, `list.mdx`'s delta and `architecture.md`'s exception.
  - The stories, every new and changed row, and `readAccessibilityTree`.
  - `collect-props.ts`, the plan, `RD-70`, `RD-53`'s note, `RD-71` on #337, `RD-68`, and the PR's description and commit messages.
- **Ran, one engine at a time:**
  - The affected files unmutated in Chromium: 11 files, 700 rows, all pass.
  - Eighteen mutations in Chromium, and nine of them again in Firefox and WebKit.
  - Three probes: layout in the three engines, and the accessibility tree in Chromium.
  - The size readings at the base, at the head, and at the head with the divider's names registered last.
  - A pixel reading of the recorded `dividers.png`.
- **Not read:**
  - M3's pages myself: I took the plan's [reading](../../divider-1/checks/m3-pages.txt) of them.
  - Firefox's and WebKit's accessibility trees, which no instrument here reads.
  - Screen readers and Safari.
  - Storybook rendered.
  - The visual project locally, which is CI's.

## The claims

### The design: the host is the line

**Holds.**

- **The shadow root and the stylesheet:** the shadow root holds no element. The stylesheet has no pseudo-element, no `position` and no `contain`. `divider.ts` sets no internals role.
- **The line** is the host's background, clipped to its content box. `box-sizing`, `padding` and `background-clip` are `!important`, and so are the insets.
- **The mechanisms, removed:** each mutation that removes one is killed in the three engines by the rows the implementer names. These are `padding-not-important` (7 rows), `no-card-rule` (13), `line-outside-box` (5 in Chromium and Firefox, 4 in WebKit, where the forced-colors row is skipped), `no-background-clip` (2) and `vertical-insets-inline` (2) ([Chromium](checks/mutations-chromium.txt), [Firefox and WebKit](checks/mutations-firefox-webkit.txt)).
- **Forced colors:** with the forced-colors rule removed, the `CanvasText` row fails in Chromium and Firefox. In WebKit the row is skipped, because Playwright doesn't emulate forced colors there, as the row's condition says.
  - **What is painted,** in Chromium and Firefox with forced colors emulated: the line is `rgb(0, 0, 0)` on a white `Canvas` ([probe](checks/probe-layout-ax.txt), `forced-colors-paint`). The row reads the computed colour, and the pixels agree.
- **Logical insets:** `insets-physical`, a `padding-left`, fails the two right-to-left `start` rows. `start-at-end` fails eight rows.
- **`box-sizing: content-box !important` has no row:** see `reviewer-7`.

### Composition

- **`mx-list`:** a direct child takes the list's width, and the list's items stay `listitem`s in Chromium. The list doesn't change. But a list that scrolls shrinks the divider to 0px: see `reviewer-1`.
- **`mx-card`:**
  - **The rule** is `::slotted(mx-divider:not(:state(vertical))) { margin-inline: calc(-1 * var(--md-card-padding-inline, 16px)) !important }`, as `RD-70` property 5 states it.
  - **It is killed in the three engines:** with the rule removed, and with it selecting nothing, the same 13 rows fail.
  - **The inline padding:** `card-rule-fixed`, a fixed `-16px`, fails the three rows with another inline padding, in the three engines. `card-rule-not-important` fails the reset rows and the ignored-margin row.
  - **`:state()` inside `::slotted()`:** it matches in the three engines ([probe](checks/probe-layout-ax.txt), `vertical-in-card`, `horizontal-in-card`). A vertical direct child has `margin-inline: 0`, and a horizontal one has `-16px`. No row would notice if it didn't: see `reviewer-4`.
- **A horizontal direct child in a page's two-column grid card** isn't covered by `RD-70`'s statement. Its box runs from its cell's start, less 16px, to the card's end edge ([probe](checks/probe-sizing.txt), `grid-card`). It reaches into the column gap, and not into the first column's content. This is a reading, not a finding.

### The card: `RD-53`'s note

**Holds.**

- **The host** draws `padding-inline` and `padding-block` from the two properties, each `!important`. The note's six items are each in the diff.
- **No `--md-card-padding` is left** in the tree outside `.plan/`: `git grep` finds none in `packages/*/src`, `.storybook` or the tests.
- **`card-inline-from-block`,** where the inline padding reads the block property, fails both new `card.spec` rows. It also fails the divider's three card rows with another inline padding.
- **The card's files pass:**
  - Locally in Chromium: `card.spec` 50, `card.browser` 12.
  - In CI's Firefox and WebKit: `card.spec` 50, `card.browser` 12 with 3 skipped.
  - In CI's Chromium: `card.visual` 1. No card image changed.
- **The stories:** `FullBleedMedia` sets both properties to `0`. `WithADivider` is new, and no other story moved.

### The no-node claim, and the two Chromium readings

**The claim holds for a divider with no `id`, and the parent-reading method is right.**

- **Reading 1, _"any element with an `id` gets a `generic` node"_: confirmed** ([probe](checks/probe-layout-ax.txt)).
  - A plain `<div id>` in a `group` is an unignored `generic`. So is an `mx-divider` with an `id`, in a `group` and between two `listitem`s of `mx-list`.
  - The same elements without an `id` aren't in the tree.
  - So a row that gave the divider an `id` would read a node that the `id` makes. Only the separator rows giving it one is right.
- **Reading 2, _"the command reports the node you ask for even where the tree has none"_: confirmed, with a detail.**
  - The command returns the node asked for as the root, which may be `ignored`. An `mx-divider` with no `id`, asked for directly, is `{ role: 'none', ignored: true }`.
  - The parent's `children` leave ignored nodes out and lift their children. So the parent reading shows exactly what an assistive technology walks.
  - `host-positioned` makes it show a `generic` in all four rows, Chromium.
- **What else I read in Chromium,** with no `id`:
  - A vertical divider in a flex row has no node.
  - An inset divider in `mx-list` has none.
  - In a card under a reset that includes `box-sizing`, the card's children are its two paragraphs.
  - With an `aria-label`, the divider is a named `generic`, as the docs warn.
- **`host-contain-layout`:** `contain: layout` on the host, with no positioned box, adds no node in Chromium. It survives. The first, withdrawn amendment's list of what makes a node (_"`position: relative`, `contain: layout` or a transform, with or without the `::before`"_) doesn't hold for `contain: layout` alone on this host. The amendment is withdrawn, so this is not a finding.
- **The `id` case is `reviewer-5`.**

### Rows and witnesses

**The implementer's six witnesses reproduce,** with the implementer's rows and counts, in Chromium. The four that `RD-62` asks for in the three engines reproduce there too.

- **The no-node and orientation rows** run only in Chromium, because only Chromium's tree is readable, as the row says. So `host-positioned` and `no-aria-orientation` are Chromium's.
- **The rows read geometry** as the host's `DOMRect` less its computed padding. The line is the content box only because `background-clip` is `content-box`. `no-background-clip` is killed by the computed-style row and by the `start` paint row, so the inference is kept.

### The recorded baseline

The coordinator's addition. The reading is from [`dividers.png`](checks/dividers-png.txt), `f58200ea1`, at a device pixel ratio of 1. The fixture's own 16px of padding puts its content at x = 16.

1. **The vertical divider is invisible.**
   - **The image:** no pixel in the _Before | After_ band, rows 58 to 108, has the line's colour.
   - **The cause:** the fixture's row is `display: flex; block-size: 32px; align-items: center`. Under `align-items: center` a vertical divider is 1px wide and 0px high, in the three engines ([probe](checks/probe-sizing.txt), `vertical-align-items-center`).
   - **Against the contract,** the divider behaves as stated. Plan geometry 3 says the default stretch gives it the row's height, and _"elsewhere it has no height, and the page gives it one"_. The fixture gives it none.
   - **So the fixture is at fault:** the visual row shows an empty box where the plan's visual list has _"a vertical divider in a row"_, and the baseline records that empty box. That is `reviewer-2`.
   - **Whether the contract should say more** is `reviewer-3`. The docs say _"a flex row or a grid stretches it"_, which isn't true of a row that centres its items, a common toolbar layout.
   - **No spec or browser row** puts a vertical divider under `align-items: center`. `createRow` and the card's vertical row both use the default stretch.
2. **The line after _One_ is where the contract puts it.**
   - **The list:** it spans x = 16 to 335, read from the items' backgrounds.
   - **The `inset="start"` line** (y = 173) runs from x = 32 to 335. It starts 16px from the list's start edge, which is the items' content inset, and reaches the list's end edge.
   - **The full-width line** after _Two_ (y = 234) runs from x = 16 to 335.
   - **The others:** the middle inset (y = 50) runs from 32 to 319. The card's divider (y = 360) runs from 16 to 335, the card's outline edges.
   - So the owner sees `inset="start"` working as M3's inset, measured from the list's edge.

### Sizes

**The explanation is true, and the count is wrong by two** (`reviewer-8`).

- **My three readings** ([files](checks/size/), [how](checks/size/README.txt)) are identical, row for row and byte for byte, to the implementer's `base.json`, `head.json` and `head-divider-names-last.json`. CI's size report on #343 has the same base and head figures.
- **What moves:** `divider/divider` is new at 1040. `card/card` goes from 1354 to 1394 (+40), and `complete` from 26920 to 27187 (+267).
- **With the divider's names registered last,** every row is as at the base except `card/card` (+38), `divider/divider` and `complete` (+276).
- **The count:** 16 other rows move, by −8 to +34. That is 18 with `card/card` and `complete`, and the report and the PR description say _"Eighteen other rows"_.

### Records and the description

- **`RD-71`:** `inset` and `orientation` are each one enumerated attribute, so the divider meets it.
- **`RD-68`:** the status sentences name #343, and say _"not yet merged"_ (`reviewer-6`).
- **`RD-53`'s note** starts inside the last bullet of the previous note (`reviewer-9`).
- **No session link:** neither the PR description nor any commit message in `2ed4b96ab..540c238a9` has one. The description's facts match the tree, apart from `reviewer-8`'s count.

## Findings

### Local id `reviewer-1` — a flex container shrinks the divider to nothing

**Tier A, introduced here.** For the implementer.

- **Current contract:**
  - `RD-70` property 2: _"a horizontal host's block size is the thickness, and a vertical host's inline size"_.
  - Plan geometry 2: _"The host takes exactly that block size"_.
  - `RD-70` property 4: _"In `mx-list` a divider is a direct child between items, and the list doesn't change"_.
- **Observed,** in Chromium, Firefox and WebKit ([probe](checks/probe-layout-ax.txt)):
  - An `mx-list` with `block-size: 120px; overflow: auto` holds six items and a divider. The divider's height is 0, and the list scrolls 348px.
  - A vertical divider in a 200px flex row between two 150px `flex: none` spans has a width of 0.
- **Why:**
  - The host is a flex item with the initial `flex-shrink: 1`.
  - It has no content, so its automatic minimum size is 0.
  - The list's items keep their content height, so the shortfall goes to the divider until it is gone.
- **Why it is a problem:** a list that scrolls is ordinary, and so is a crowded toolbar. The line disappears with no error, in every engine.
- **No row covers it:** every list and row fixture has room for its items.
- **Required property:** the line keeps its thickness in a flex container that has less room than its items need, horizontal in `mx-list` and vertical in a row.

### Local id `reviewer-2` — the visual row's vertical divider draws nothing, and the baseline records that

**Tier B, introduced here.** For the implementer. The baseline isn't on the PR's head yet.

- **Current fixture:** `divider.visual.browser.test.ts` puts `<mx-divider orientation="vertical">` in `display: flex; block-size: 32px; align-items: center`.
- **Observed:**
  - In `dividers-chromium-linux.png` at `f58200ea1`, no pixel of the _Before | After_ band has the line's colour ([reading](checks/dividers-png.txt)).
  - The divider there is 1 × 0 px in the three engines ([probe](checks/probe-sizing.txt)).
- **Why it is a problem:**
  - The plan's visual row has _"a vertical divider in a row"_, and its picture has none.
  - The baseline would pass with the vertical divider removed, or with its colour or thickness wrong. So that part of the row is unsound.
  - The image that the owner reviews (`RD-13`) shows a component that looks broken.
- **Required property:** the visual row's vertical divider is drawn, and the recorded baseline shows it.

### Local id `reviewer-3` — whether a vertical divider stretches itself in a row that aligns its items

**Tier B, introduced here.** Routed to the architect, because it is about the contract.

- **Current contract:**
  - Plan geometry 3: _"In a flex row or a grid the default stretch gives it the row's height. Elsewhere it has no height, and the page gives it one."_
  - The JSDoc and `divider.mdx`: _"a flex row or a grid stretches it, and elsewhere the page gives it a height"_.
- **Observed:** under `align-items: center`, which is common in toolbars and in the fixture `reviewer-2` names, the divider is 0px high and draws nothing, in the three engines.
- **Why it is a problem:**
  - The docs name _"a flex row"_ without the condition _"that stretches its items"_. A page that follows them sees no line, and no error.
  - Whether the divider takes the row's height whatever the row's `align-items` is a property of the component, not of the fixture. M3 gives no measurement for a vertical divider.
- **Required property:** the contract says which rows a vertical divider takes its height from, and the docs say the same.

### Local id `reviewer-4` — no row keeps the card rule's exclusion of a vertical divider

**Tier B, introduced here.** For the implementer.

- **Current contract:**
  - `RD-70` property 5: _"A vertical divider … unchanged"_.
  - The plan's stopping boundary: _"If `:state()` doesn't match inside `::slotted()` in an engine, the card's rule selects the `orientation` attribute"_.
  - The report: _"Firefox and WebKit are CI's to read, by the card rows"_.
- **Observed:** `card-rule-all` changes the selector to `::slotted(mx-divider)`, so the rule also takes a vertical divider. It survives in Chromium, Firefox and WebKit: 45 of 45, or 44 with one skipped ([mutations](checks/mutations-chromium.txt), [Firefox and WebKit](checks/mutations-firefox-webkit.txt)).
- **Why:** _"should leave a vertical direct child as it is outside a card"_ reads the line's width, top and bottom, and not its inline position or its margin. Under the mutation, the rule gives the vertical divider `margin-inline: -16px` on each side, and none of the three values that the row reads changes. I didn't measure where the neighbouring content then sits.
- **Why it is a problem:**
  - Suppose an engine didn't match `:state()` inside `::slotted()`. `:not(:state(vertical))` would then match every divider, and every row would still pass.
  - So CI's Firefox and WebKit pass doesn't show what the report says it shows.
  - It holds today. In the three engines a vertical direct child has `margin-inline: 0`, and a horizontal one `-16px` ([probe](checks/probe-layout-ax.txt)). But the reading is mine, and no row keeps it.
- **Required property:** a row fails when the card's rule reaches a vertical direct child.

### Local id `reviewer-5` — an `id` makes the divider a node in Chromium, and the docs say it is never one

**Tier B, introduced here.** Routed to the architect: whether the property holds with an `id` is a contract call.

- **Current contract and docs:**
  - `RD-70` property 3: _"no node in the accessibility tree, which is also what makes it valid directly in `mx-list`"_.
  - The JSDoc and `divider.mdx`: _"isn't in the accessibility tree. Don't give a decorative divider an `aria-label`, which makes it a node."_
- **Observed,** in Chromium ([probe](checks/probe-layout-ax.txt)): an `mx-divider id="…"` is an unignored `generic` in a `group`, and between the two `listitem`s of `mx-list`. That is the structure that the first amendment called the defect: _"a `generic` between the `listitem`s"_.
- **What the implementer knew:** the report records the reading, and the rows avoid it. But no record or doc carries it to a page.
- **For the architect, a reading only:** an element whose internals role is `none`, with an `id`, has no node in a `group` or in `mx-list` in Chromium ([probe](checks/probe-internals-none.txt)). The owner set the internals role aside on the second amendment. I don't weigh that.
- **Why it is a problem:** `id` is a global attribute that a page may set for an anchor, a test hook or a script. Nothing tells the page that it changes the list's structure.
- **Required property:** the contract says whether the divider stays out of the tree with an `id`, and the docs say what the contract says.

### Local id `reviewer-6` — both status sentences say _"not yet merged"_

**Tier B, introduced here.** For the implementer.

- **Current text:**
  - `RD-70`'s status: `**Implemented** by #343, not yet merged ([report](../divider-1/divider-report.md))`.
  - `RD-53`'s note: _"**Implemented** by #343, the unit that implements `RD-70`, not yet merged."_
- **The rule:** `RD-68` property 3 and `documentation.md` §6 say _"The implementing branch names no merge: no "not yet merged"…"_.
- **Why it is a problem:** both sentences reach `main` with the merge, and are false there from that moment. That is the staleness the rule exists to prevent. `RD-68` property 5 makes it a review finding. `RD-70`'s second amendment says _"**Implemented** by #343, with the rest of the decision"_, which is right.
- **Required property:** each status names #343 and no merge.

### Local id `reviewer-7` — no row keeps `box-sizing: content-box !important`

**Tier C, introduced here.** For the implementer.

- **Current contract:** `RD-70` property 2 says that the host's `box-sizing: content-box` is `!important`, so that a page's universal reset doesn't move the line.
- **Observed:**
  - `no-box-sizing` and `box-sizing-not-important` survive in the three engines.
  - The spec rows' `RESET` has no `box-sizing`, and no row sets a size on the divider.
  - The declaration does matter. Under a page's `* { box-sizing: border-box }`, a `start` divider with a page `inline-size: 200px` draws a 200px line at the head, and a 184px line without the declaration, in Chromium ([probe](checks/probe-sizing.txt)).
- **Why it is Tier C:** a consumer sees what the contract says today. A later change could remove the declaration with every row passing.
- **Required property:** a row fails when a page's `box-sizing` reset changes the line.

### Local id `reviewer-8` — 16 other size rows move, not 18

**Tier C, introduced here.** For the implementer.

- **Current text:**
  - The report: _"Eighteen other material-x rows move, by −8 to +34 bytes"_.
  - The PR description: _"Eighteen other rows move by −8 to +34 bytes"_.
- **Observed:** 18 rows move from base to head. Two of them are `card/card` (+40) and `complete` (+267), which the same paragraph reports apart. The other 16 move by −8 to +34 ([readings](checks/size/)).
- **Required property:** the count names the rows it says it names.

### Local id `reviewer-9` — `RD-53`'s note begins inside the previous note's last bullet

**Tier C, introduced here.** For the implementer or the architect, as the record's owner decides.

- **Observed:** the note's opening sentence, _"**Dated 2026-11-27 by the architect…** **Implemented** by #343…"_, follows _"Safari; screen readers."_ on the same line. That line is the last bullet, _"Not run"_, of the note of 2026-11-24. The new note's bullets then follow as a separate list.
- **Why it is a problem:** read rendered, the note's date and status are part of the earlier note's _"Not run"_ bullet.
- **Required property:** the note starts its own paragraph, as `RD-68` property 1 places a status.

## Mutations

The implementer's six come from [`mutate.py`](../../divider-1/probes/mutate.py). The other twelve are mine. My script is [`mutations.py`](probes/mutations.py.txt).

| Id | Mutation | Engines | Result |
| --- | --- | --- | --- |
| `host-positioned` | `position: relative` on the host | Chromium | **Killed:** the 4 no-node rows (rows are Chromium's) |
| `no-aria-orientation` | `orientation` doesn't set `ariaOrientation` | Chromium | **Killed:** the vertical separator row (rows are Chromium's) |
| `padding-not-important` | no padding declaration is `!important` | C, F, W | **Killed** in each: 7 rows |
| `no-forced-colors` | no forced-colors rule | C, F, W | **Killed** in Chromium and Firefox. WebKit skips the row, because Playwright can't emulate forced colors there |
| `no-card-rule` | the card's rule removed | C, F, W | **Killed** in each: 13 rows |
| `line-outside-box` | the line is an absolutely positioned `::before` | C, F, W | **Killed:** 5 rows, or 4 in WebKit, where the forced-colors row is skipped |
| `card-rule-all` | `::slotted(mx-divider)`: the rule takes vertical dividers too | C, F, W | **Survives** in each (`reviewer-4`) |
| `card-rule-none` | the rule selects nothing | Chromium | **Killed:** 13 rows |
| `card-rule-not-important` | the rule without `!important` | Chromium | **Killed:** 3 reset rows and the ignored-margin row |
| `card-rule-fixed` | `-16px` in place of the inline padding | C, F, W | **Killed** in each: 3 rows |
| `card-inline-from-block` | the card's inline padding reads the block property | Chromium | **Killed:** 2 `card.spec` rows and 3 divider rows |
| `no-background-clip` | `background-clip` removed | C, F, W | **Killed** in each: 2 rows |
| `box-sizing-not-important` | `box-sizing` without `!important` | Chromium | **Survives** (`reviewer-7`) |
| `no-box-sizing` | `box-sizing` removed | C, F, W | **Survives** in each (`reviewer-7`). The probe shows it isn't equivalent |
| `vertical-insets-inline` | a vertical divider's insets on the inline axis | C, F, W | **Killed** in each: 2 rows |
| `start-at-end` | `start`'s inset at the end | Chromium | **Killed:** 8 rows |
| `insets-physical` | `padding-left` for `start` | Chromium | **Killed:** the 2 right-to-left `start` rows |
| `host-contain-layout` | `contain: layout` on the host | Chromium | **Survives,** equivalent for the tree: no node is added. See _The no-node claim_ |

- **Repeated in the three engines** (`RD-62`):
  - The mutations that remove a required property's mechanism: `padding-not-important`, `no-forced-colors`, `no-card-rule`, `line-outside-box`, `no-background-clip`, `vertical-insets-inline` and `card-rule-fixed`.
  - The selector whose support differs by engine, `card-rule-all`.
  - The two that survived in Chromium, `no-box-sizing` for both.
- **The accessibility-tree mutations stay in Chromium,** because their rows run only there, by the rows' stated condition.
- **No mutation is caught in one engine and missed in another,** except where a row's condition skips that engine.

## CI

`verify` run [46065249445](https://github.com/ausginer/material-x/actions/runs/46065249445), `pull_request`, on `540c238a91a541d2dc430d702e9f61aa6c4d9cfc`: **failure**, from the `chromium` job's visual project only ([lines](checks/ci.txt)).

| Job | Files | Rows | Divider and card files |
| --- | --- | --- | --- |
| `chromium` | 1 failed, 195 passed | 1 failed, 5651 passed, 2 expected fail, 12 skipped | `divider.browser` 21, `divider.spec` 45, `card.spec` 50, `card.browser` 12, `card.visual` 1. `divider.visual` fails: _"No existing reference screenshot found"_ |
| `firefox` | 139 passed, 1 skipped | 4460, 3 expected fail, 214 skipped | `divider.browser` 21 (7 skipped), `divider.spec` 45, `card.spec` 50, `card.browser` 12 (3 skipped) |
| `webkit` | 139 passed, 1 skipped | 4460, 2 expected fail, 215 skipped | `divider.browser` 21 (7 skipped), `divider.spec` 45 (1 skipped), `card.spec` 50, `card.browser` 12 (3 skipped) |

- **The other affected files** pass in each engine's job: `traits-baseline`, `axe` (Chromium only, by its condition), and the five files that use the moved `capture`.
- **`static`, `docs` and `measurements`** passed.
- **The one failure** is the new image, which waits for its recording by `RD-13`. The recording workflow committed it as `f58200ea1` on `origin/baselines/material-x/divider-1`. `reviewer-2` is about what it shows.
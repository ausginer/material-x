# `repo:RF-134` (#241) — feature proof

**Files were read at:** `71b839f4a`, the head of #291 (`material-x/group-rtl-1`), in slot `b`. Its parent is `main` at `ee0afea12`, and core and drag are as built in the slot after their last source change. Browsers: Playwright's Chromium, Firefox and WebKit, headless, on Linux, one at a time with nothing else running (`RD-62` property 4).

**Subject:** `RF-134` in [`00-index.md`](../../00-index.md) with its notes: the required property of 2026-11-24 and the architect's additions of the same day, and the implementer's note. Also the diff `ee0afea12...71b839f4a` and #291's description. `RF-143` (#287) is read only where this unit's rules meet it.

**Verdict: the required property holds in the three engines, with `dir` on the group or on an ancestor, also in the cases beyond the rows.** The implementer's witnesses give his numbers in each engine. There are two findings. `reviewer-1` is tier B: two parts of the selectors that this unit adds have no row. `reviewer-2` is tier A, pre-existing: a page that mirrors the group by CSS `direction` gets the corners of `main`. It is the implementer's stated limit, and it is for the architect.

## Scope

**Rows of the affected files, unmutated:** `tests/button-group` without the visual project, and `tests/button/split-button.browser`. That is the two new files and every file that tests the connected group's sheet and the split button. Results: Chromium 261 passed; Firefox and WebKit 257 passed and 4 skipped, which are the split button's accessibility-tree rows, Chromium's alone ([Chromium](checks/affected-chromium.txt), [Firefox](checks/affected-firefox.txt), [WebKit](checks/affected-webkit.txt)). CI on `71b839f4a` passes in each job, `verify` included.

**The implementer's ten mutations, repeated in each engine** (by `RD-62` property 5, each touches `:dir()`, the slotted selectors or focus by key): each fails the same rows in Chromium, Firefox and WebKit, and those are his [witnesses](../../group-rtl-1/checks/witnesses.txt) row for row ([Chromium](checks/implementer-mutations-chromium.txt), [Firefox](checks/implementer-mutations-firefox.txt), [WebKit](checks/implementer-mutations-webkit.txt)). `main`'s sheet fails 26 of 72 rows, and with it the property's mechanism is gone.

**Mine** ([program](probes/mutations.mjs); readings: [Chromium](checks/mutations-chromium.txt), [Firefox](checks/mutations-firefox.txt), [WebKit](checks/mutations-webkit.txt)). On the affected files, in each engine:

| Mutation | Rows that fail | What changes, by the probe |
| --- | --- | --- |
| The RTL first-button rule on every member but the last (`[data-first]` out of it) | none of 261 / 257 / 257 | In each RTL group of three or more, each member between the ends has its outer corners at the right (`reviewer-1`) |
| The RTL last-button rule on the only member (`:not([data-first])` out) | none | The only member in RTL has its outer corners at the left in place of the right (`reviewer-1`) |
| The RTL block moved before the base rules | none | nothing: equivalent in the three engines. The RTL rules win by specificity, not by their order |

**My probe, on the elements from source** ([probe](probes/rtl-probe.browser.test.ts.txt); readings with each mutation: [Chromium](checks/probe-chromium.txt), [Firefox](checks/probe-firefox.txt), [WebKit](checks/probe-webkit.txt)). Each case reads, for each member, its four corners and where it is drawn. The three engines give the same result in every case, and the positions differ only where the labels are Hebrew. Unmutated, the drawn ends have their outer corners outside, and the members between them have four inner corners:

- `dir` set after the render on the parent, on the grandparent, on the split button and on its parent; `dir="rtl"` and then `ltr`; `dir` on the root element, and removed again. The rows change only the group's own `dir`.
- `dir="auto"` on the group with Hebrew labels, and on an ancestor whose first text is Hebrew.
- The group in a shadow root whose host has `dir="rtl"`, and the same host changed to `ltr`; the group in a `dir="rtl"` element inside a shadow root.
- Four members in RTL; a member appended, and the first removed, while RTL.
- **The exception** is CSS `direction: rtl` on an ancestor with no `dir` (`reviewer-2`).
- **The only member** has 8, 8, 20, 20 (left top, left bottom, right top, right bottom), in both directions, as the implementer's note says.

**The departures and the note:** `:host(:dir(rtl))` in place of logical corner properties, which the note explains, is right by the probe: a member with its own `dir` keeps the group's corners (also by the rows), and `:dir()` reaches through the split button's shadow root and the page's. The pressed and selected rows read what the note says they read.

**Sizes, Brotli, by `size-limit`** ([reading](checks/sizes.txt)), `main`'s sheet then the head: `button-group/connected-button-group` 4042 to 4069, `button/split-button` 7766 to 7796, `complete` 25924 to 25980. These are the implementer's numbers. The other 20 rows of material-x are the same. The rows of the other packages weren't read, because their sources don't change.

**Not covered:** Safari; the visual project, which has no RTL baseline; the focus indicator's pixels in RTL, which by reading follow `border-radius` (`RF-126`'s outline); forced colors; the standard group's press (`RF-80`); the declarations' typecheck and `docs-build`, beyond CI's `docs` job; `RF-143`'s rows.

## Findings

### reviewer-1

**Tier B.** Two parts of the RTL rules' selectors have no row that fails without them, and each changes what a consumer sees.

- **Observed,** in the three engines ([readings](checks/mutations-chromium.txt), [probe](checks/probe-chromium.txt)):
  - **`[data-first]` out of the first-button rule:** all 261 rows pass (257 in Firefox and WebKit). In each RTL group of three or more members, each member between the ends then has 8, 8, 20, 20 in place of four 8px corners, so its outer corners face its neighbor. The rows read only the first and the last button.
  - **`:not([data-first])` out of the last-button rule:** all rows pass. The only member of an RTL group then has 20, 20, 8, 8 in place of `main`'s 8, 8, 20, 20.
- **The requirement:** `RF-134`'s required property and _"Witness: a deliberate reversal of the mapping fails them"_. On the second part, the note's _"the rules here leave out a member that is both"_ and #291's _"Beside #287 … the rules here leave out a member that is both first and last"_, which `RF-143`'s rule depends on in RTL. The entry's list of rows names the first and the last button, so the rows meet the list as written.
- **The element:** correct in each case, in the three engines.
- **Required property:** a row fails when a member between the ends of an RTL group doesn't have its four inner corners, and when the only member's corners in RTL change.
- **Route:** the implementer for the rows. The architect, if the list of rows was meant to be complete.

### reviewer-2

**Tier A, pre-existing, not a regression.** A page that mirrors the group with CSS `direction` and no `dir` sees the group mirrored, but its corners stay on the inner side.

- **Observed,** in the three engines ([probe](checks/probe-chromium.txt), the case _CSS direction rtl on ancestor, no dir_): the computed `direction` of the group is `rtl`, and it doesn't match `:dir(rtl)`. The first member is drawn at the right, and has its outer corners at its left. The last member is at the left, with its outer corners at its right. That is `main`'s defect.
- **Inside the group, two mechanisms read the direction from different sources:** the corners read `:dir()`, which follows `dir` only. The arrow keys read `getComputedStyle(host).direction` in core's `useRovingTabindex`, the same function that the implementer's mutation _the arrow keys without a direction_ changes. So in this case the keys follow what is seen, and the corners don't: ArrowRight moves from the middle member to the one at its right, and ArrowLeft to the one at its left, in the three engines ([reading](checks/keys.txt), [probe](probes/keys-probe.browser.test.ts.txt)).
- **The requirement:** `RF-134`'s required property says _"in RTL"_. The architect's reading and the list of rows name `dir` on the group and on an ancestor. The implementer's note and #291 state the limit. The package's own texts (JSDoc, `.mdx`) say nothing about direction, so a consumer can't read it.
- **Required property:** either the corners follow the direction that the group is drawn in, or the published texts say that the corners follow `dir` only.
- **Route:** the architect: whether the property covers CSS `direction`, and if not, where the limit is published.

## Observations, no finding

- **`RF-143` (#287):** the guard that `reviewer-1` reads is what lets #287's `::slotted([data-first][data-last])` hold in RTL. Whichever merges second resolves the sheet, as the coordinator says. Not read further here.
- **The only member** has the same physical corners in both directions, so its outer corners are at the inline end in LTR and at the inline start in RTL. That is `main`'s shape and `RF-143`'s subject.
# `repo:RF-134` (#241) — recheck of the remediation

**Files were read at:** `6bde42160`, the head of #291 (`material-x/group-rtl-1`), in slot `b`. It merges `main` at `3fdd384b7`, with `RF-143` (#287) and `RD-62`'s trial (#295), into the remediation `5061a5108`. Core was rebuilt in the slot at that head, because its build predated `RF-143`'s change to `useRovingTabindex`. Browsers: Playwright's Chromium, Firefox and WebKit, headless, on Linux, one at a time with nothing else running.

**Subject:** the architect's triage of the [feature proof](feature-proof-claude.md), dated 2026-11-26 at the end of `RF-134` in [`00-index.md`](../../00-index.md), and its _Recheck_: the two rows in the three engines with the two mutations, and the two texts read. The implementer's note of the same day, and the diff `cc92031db...5061a5108`. Because this unit reaches `main` second, also row 2 and `RF-143`'s rows of the only member on the merged head. Nothing else of the proof is read again.

**Verdict: `reviewer-1` is closed, and the texts that `reviewer-2` owed are right.** Each row fails under its mutation, and under no other, in the three engines. With `RF-143`'s sheet, both rows and `RF-143`'s rows pass unmutated. No new finding.

## The two rows

In `button-group-rtl.spec.browser.test.ts`, under _connected group corners of a member at neither end or at both_:

1. _should have four inner corners on the middle member of an RTL group_: `dir="rtl"` on a group of three, and the middle member's four corners equal the group's resting inner corner. It is the triage's row 1.
2. _should have the same corners on the only member in RTL as in LTR_: a group of one with no `dir`, and one with `dir="rtl"` on the group. The row compares the two readings and names no value. It is the triage's row 2.

**The mutations,** by the proof's [program](probes/mutations.mjs) on the merged sheet, on `tests/button-group` and `tests/button/split-button`:

| Mutation | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| `[data-first]` out of the RTL first-button rule | row 1 alone fails, 274 pass | row 1 alone, 270 pass | row 1 alone, 270 pass |
| `:not([data-first])` out of the RTL last-button rule | row 2 alone fails, 274 pass | row 2 alone, 270 pass | row 2 alone, 270 pass |

The four skipped rows in Firefox and WebKit are the split button's accessibility-tree rows, which are Chromium's alone. Readings: [Chromium](checks/recheck-mutations-chromium.txt), [Firefox](checks/recheck-mutations-firefox.txt), [WebKit](checks/recheck-mutations-webkit.txt).

**Mutation 2 still has an effect after the merge.** `RF-143`'s `::slotted([data-first][data-last])` and the mutated `:host(:dir(rtl)) ::slotted([data-last])` have the same specificity, and the RTL rule comes later. So without the guard, the only member in RTL takes the last button's RTL corners in place of four outer corners, and row 2 fails. That is the dependence that the proof's `reviewer-1` and #291 describe.

## On the merged head, unmutated

- **Chromium, locally** ([reading](checks/recheck-affected-chromium.txt)): `tests/button-group` without the visual project, and `tests/button/split-button.browser`, 275 passed and none failed. Both rows pass, and so do `RF-143`'s seven rows under _corners with hidden members_, _should all be outer on the only shown member_ among them.
- **Row 2 with `RF-143`:** `RF-143`'s row pins four outer corners on the only member with no `dir`, and row 2 makes RTL equal to it. Together they hold the only member at four outer corners in both directions, and neither row names the other's value. This is the outcome the triage expected.
- **Firefox and WebKit, from CI:** see [CI](#ci).

## The two texts

- **`connected-button-group.mdx`**, _Direction_: _"The outer corners of the group's first and last buttons follow the `dir` attribute on the group or an ancestor. A page that sets the CSS `direction` alone gets the corners of left-to-right text, so set `dir`."_ **`split-button.mdx`**, _Direction_: the same, naming the split button and _"on the split button or an ancestor"_. Both keep the triage's substance: `dir` on the element or an ancestor, the CSS `direction` limit, and what to do. The split button's sentence names the split button, as the triage asks. The proof's probe read `dir` on the split button and on its parent.
- **The sentence that the architect asked me to judge:** _"the group's first and last buttons"_. Since `RF-143`, the outer corners belong to the first and the last member without `hidden`. **It holds, and it isn't a finding.** A hidden member isn't drawn, so the first and last buttons a reader sees are the ones that have the outer corners. The list's _Hidden and disabled members_ bullet, two above it, says that a hidden member is out of the group's order. The sentence says nothing about which member is an end, and it says nothing false about the only member, whose four outer corners don't change with `dir`.

## CI

`verify` run [45789925724](https://github.com/ausginer/material-x/actions/runs/45789925724) on `6bde42160` passed: every job succeeded, and `records` and `deploy` were skipped. Its `firefox` and `webkit` jobs ran `button-group-rtl.spec.browser.test.ts` with 68 rows, `button-group.spec.browser.test.ts` with 57, which carries `RF-143`'s rows, and `button-group-rtl.browser.test.ts` with 6, and each passed. Those jobs are this recheck's unmutated Firefox and WebKit reading, as `RD-62`'s trial says.

## Not covered

Safari; the visual project, which has no RTL baseline; everything else of the proof, which the triage doesn't reopen.
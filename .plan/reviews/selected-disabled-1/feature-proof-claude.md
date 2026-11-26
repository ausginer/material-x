# Rows for a list item that is selected and disabled (RF-149): feature proof

**Lens:** `reviewer`, feature proof of [`RF-149`](../../00-index.md#rf-149--no-row-reads-a-selected-list-item-that-is-also-disabled) for pull request #308 (`Closes #305`). Requested by the coordinator.

**Commit read:** `85a1a1989` on `material-x/selected-disabled-1`. Its parent is `1a0ea8984`, which is `origin/main` before #303. `origin/main` is at `5d867401f` now, and #303 changes no file of this unit. The branch was read at its head, without a merge.

**Outcome: accepted. No finding.** The four rows read `RF-149`'s required property for both items and both orders. #288's mutation fails each of them in Chromium, Firefox and WebKit, and the 8 other rows pass. Three mutations of my own show that each order and each assertion has a row that fails without it. `verify` passes on the head, and the file passes in its `firefox` and `webkit` jobs. Two observations are at the end.

## Scope and method

- **The change:** `packages/material-x/tests/list/list-item-selected.browser.test.ts`, +22 lines, 4 rows. No other file changes, and no source changes. So the affected file is this one test file. No source change means no other test file is affected.
- **Locally,** one engine at a time with nothing else running: the file without a mutation and under five mutations, in Chromium, Firefox and WebKit ([readings](checks/mutations.txt), [program](probes/mutations.mjs.txt)). The mutations rewrite the selection's write in `src/list/ListInteractiveItemCore.ts`. The program restores the source after each run, and `git status` was clean after the runs.
- **From CI:** `verify`'s run [45864331547](https://github.com/ausginer/material-x/actions/runs/45864331547) on `85a1a1989` passes. The file passes, 12 of 12, in its `firefox` job 140063663610, its `webkit` job 140063663465 and its `chromium` job 140063663777 ([readings](checks/ci.txt)).
- **Not read:** the accessibility trees, which #288's proof read for a selected, disabled item in the three engines ([readings](../list-selected-1/checks/trees.txt)). This unit changes no source, so those readings still apply. Also not read: the other files of `tests/list` locally, Safari, and visual.

## The required property

`RF-149` requires that, for each of the button and link items, a row asserts that a selected, disabled item's control has its `aria-current`, selected before the connect and after it, and no `aria-selected`.

| Item | Selected before the connect | Selected after the connect |
| --- | --- | --- |
| `mx-list-button-item` | `aria-current` is `"true"`, no `aria-selected` | The same |
| `mx-list-link-item` | `aria-current` is `"page"`, no `aria-selected` | The same |

**Holds.** The two new rows of the `describe.each` give four rows. Each row sets `disabled`, then sets `selected` before or after `document.body.append`, and asserts `toHaveProperty('aria-current', current)` and `not.toHaveProperty('aria-selected')` on the control's `aria-*` attributes. The row names say which order they read.

**The witness holds in the three engines.** #288's mutation _"a disabled item says nothing"_ fails all 4 new rows, and the 8 other rows pass, in Chromium, Firefox and WebKit. This repeats the implementer's Chromium result.

## Mutations

Of the 12 rows of the file, the same rows in each engine:

| Mutation | Chromium | Firefox | WebKit | Rows that fail |
| --- | --: | --: | --: | --- |
| None | 0 | 0 | 0 | — |
| #288's: a disabled item says nothing | 4 | 4 | 4 | the 4 new rows, at `aria-current` |
| own: a disabled item says nothing when selected before the connect | 2 | 2 | 2 | the 2 _before the connect_ rows |
| own: a disabled item says nothing when selected after the connect | 2 | 2 | 2 | the 2 _after the connect_ rows |
| own: a disabled item also says `aria-selected` | 4 | 4 | 4 | the 4 new rows, at `aria-selected` |

- **#288's mutation** removes the property's mechanism for a disabled item. RD-62 property 5 asks for it in the three engines.
- **The two timing mutations** show that each order has its own row: a regression in one order fails only the rows of that order. The selection's write runs from `attributeChangedCallback`, which is custom element timing, so RD-62 property 5 asks for these in the three engines too.
- **The `aria-selected` mutation** shows that the second assertion is not redundant. The 8 other rows don't set `disabled`, so they don't read this attribute on a disabled item. Chromium's message is `expected { 'aria-current': 'true', …(1) } to not have property "aria-selected"`. In Firefox and WebKit the failure is on the line of the second assertion.

No mutation fails in one engine and passes in another.

## Observations

Not findings.

1. **The rows assert two properties, not the whole set of attributes.** The other rows of the file use `toEqual`. A disabled link item's control also has `aria-disabled="true"`, which Chromium's messages show (`expected { 'aria-disabled': 'true' } …`). So `toEqual({ 'aria-current': current })` would fail on the link item. The two assertions are what `RF-149` requires.
2. **The entry `RF-149` is still _open, ready_ at the head.** The pull request says `Closes #305`, and [`work-queue.md`](../../../.agents/docs/work-queue.md#closing) says that the same pull request carries the record changes that the completion requires. With #288, `RF-132` was closed later, by #304. Whether this pull request closes the entry, or a later one does, is the architect's and the coordinator's decision. This proof doesn't decide it.

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and a script check of the relative links and the anchor. Lint doesn't apply to Markdown.
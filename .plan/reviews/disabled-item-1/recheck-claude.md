# `repo:RF-142` (#271) — recheck of the remediation

**Files were read at:** `218c3ec0b`, the head of #278 (`material-x/disabled-item-1`), in slot `d`. Core and drag are as built in the slot, after their last source change. Browsers: Playwright's Chromium, Firefox and WebKit, headless, on Linux, one at a time.

**Subject:** the delta from the [feature proof](feature-proof-claude.md) at `380920c2a`, against the architect's ruling on it in `RF-142`'s notes in [`00-index.md`](../../00-index.md) and `RD-61`'s amendment of the same day: the condition in `sortable-item.ts`, the five rows in `sortable-list.browser.test.ts`, and the five mutations in the implementer's [probe](../../disabled-item-1/probes/mutate.mjs).

**Verdict: accepted.** No findings.

## Scope

- **The condition matches the ruling.** `sortItem` observes the host's `disabled` only when `control !== host`. `useListItemCore` passes `target ?? host`, and only an interactive item has a `target`, so the condition is true for a button or link item and false for every `mx-list-item`, with a handle or without. Setting `disabled` on an `mx-list-item` then runs no update, which is amended property 8. So the tab index that the page removed from an `mx-list-item` doesn't come back (`reviewer-2`'s observation). On an interactive item's handle a removed value still comes back, which amended property 2 allows. No other source line changes.
- **Each of the five rows fails under its mutation and passes on the head, in the three engines.** Each mutation fails its own row and no other. _No observer_ fails its four rows as before. The four mutations of `reviewer-1` are textually those of my [runner](probes/mutations.mjs), so the rows answer the finding as it was read.

  | Mutation | Row that fails | Chromium | Firefox | WebKit |
  | --- | --- | --- | --- | --- |
  | None | — | 198 pass | 188 pass | 198 pass |
  | No observer | the four rows of a later change | 4 | 4 | 4 |
  | `aria-disabled` isn't watched | _should keep the aria-disabled that the page writes on a disabled handle_ | 1 | 1 | 1 |
  | The state observer is never disconnected | _should write nothing on the handle of an item that left when it is disabled_ | 1 | 1 | 1 |
  | A page's `touch-action` is removed | _should keep the touch-action that the page writes on a handle after the claim_ | 1 | 1 | 1 |
  | A press whose item is disabled before the lift is canceled | _should lift and move an item that is disabled between the press and the lift_ | 1 | 1 | 1 |
  | The `disabled` attribute of any item observed | _should not make an mx-list-item a tab stop again when the attribute is set after the page removed its tabindex_ | 1 | 1 | 1 |

  Readings: [Chromium](checks/recheck-mutations-chromium.txt), [Firefox](checks/recheck-mutations-firefox.txt), [WebKit](checks/recheck-mutations-webkit.txt). Chromium's are the implementer's [witnesses](../../disabled-item-1/checks/remediation-witnesses.txt), row for row. Firefox's 188 is the implementer's 183 at `754e2089f` and the five new rows.

- **The rows hold what `reviewer-1` required:** a value that the page writes after the claim (`touch-action`), or while the item is disabled (`aria-disabled`), stands through disabling and enabling; an admitted press is lifted although its item was disabled before the lift; an item that left the list writes nothing on its handle.
- **The suite:** `tests/list`, unmutated, six files, passes in each engine ([reading](checks/recheck-list.txt)): 407 in Chromium, 395 and 2 skipped in Firefox, 405 and 2 skipped in WebKit. These are the implementer's counts at `754e2089f` and the five new rows. The suite includes `list-item.spec` and `list-roles`, which also build sortable lists. CI on `218c3ec0b` passes in each job.

**Not read again:** the feature proof's behavior probe, the other former mutations, the sizes beyond the implementer's reading and CI's `measurements` job, an `mx-list-item` _with_ a handle under the mutation of the condition (by reading, the condition covers it), Safari, and touch.
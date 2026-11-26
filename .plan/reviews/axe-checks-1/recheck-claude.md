# axe-core over material-x's elements (RD-57, RD-58, #293) — bounded recheck

**Files were read at:** `4012b5bb1`, the head of `repo/axe-checks-1` (#293), in slot `h`, equal to `origin`. Since the [feature proof](feature-proof-claude.md) of `d20c356bd`: the architect's triage and merge of `main` (`148f70588`), the implementer's test changes (`d03183ea5`), the owner's answer to `RD-58` Q1, (a) (`75966eb9a`), and its implementation with its notes and readings (`c7863961e`, `4012b5bb1`). Core's build in the slot has `RF-143`'s change. Material-x's built split button template is from after `c7863961e`. Playwright's Chromium, Firefox and WebKit, headless, one engine at a time with nothing else running. Mutations changed sources and restored them, and `packages/` is unchanged.

**Subject:** `RD-58`'s note of 2026-11-26, item 5: _"the new row and its witness, and the split button's rows in the three engines"_. Also, as the coordinator asks: whether `reviewer-1` and `reviewer-2` now read as `RD-57`'s triage says, and whether `repo:RD-58` and `repo:RD-59` each resolve with `.scripts/entry.sh`.

**Verdict: the remediation does what `RD-57`'s triage and `RD-58` (a) say, and it holds.** The new row fails without the template's attribute and nothing else does. The split button's rows pass in the three engines, and fail under a mutation of the names they hold. Both entries resolve. One Tier C note, `recheck-1`, on a comment's line breaks.

## The new row and its witness

- **The row:** _mx-split-button, without secondarylabel_ in `tests/axe.browser.test.ts` lists `button-name` at `mx-split-button > mx-icon-button > button`, owned by `repo:RD-58`, as item 2 says. It passes unmutated.
- **The template** (`split-button.tpl.html`): `<mx-icon aria-hidden="true">keyboard_arrow_down</mx-icon>`, with a comment. The comment says what item 1 requires: in the browsers the attribute changes no name, because `mx-icon` hides its slot; axe-core doesn't apply the hidden slot (accname 1.2, step 2F.3), so without the attribute an audit doesn't report a missing `secondarylabel`; and it stays harmless once axe-core implements the step. The built `button/split-button.tpl.html.js` has the attribute and not the comment.
- **The mutations** ([program](probes/recheck-mutations.mjs)), on `axe.browser`, `button/split-button.browser`, `icon/icon.browser`, `button-group/button-group-focus.spec.browser` and `traits-baseline.browser`. Those are every test file that names the split button. Firefox and WebKit skip the 71 axe rows (`RD-57`) and the Chromium-only tree rows, 92 in all.

  | Mutation | Chromium | Firefox | WebKit |
  | --- | --- | --- | --- |
  | None | 202 pass | not run: [CI](#ci) | not run: [CI](#ci) |
  | The template's `aria-hidden` on the trailing icon removed | **1 fails:** the new row, because axe reports nothing at the trailing button | none of 110 | none of 110 |
  | The icon's slot not hidden (`RF-137`'s `setAttribute`) | 19 fail, all in `icon.browser` | 2 of `icon.browser` | 2 of `icon.browser` |
  | `useARIA`'s call out of `ButtonCore` (`RD-57`'s witness 2) | 24 fail: the 11 axe control rows, the split button's three among them, and 13 rows of names and state | the 7 `secondarylabel` and `open` rows of the split button | the same 7 |

  Readings: [Chromium](checks/recheck-chromium.txt), [Firefox](checks/recheck-firefox.txt), [WebKit](checks/recheck-webkit.txt).

- **What this reads:**
  - **The witness is item 2's,** and it agrees with the implementer's [reading](../../axe-checks-1/checks/rd58-witness.txt): without the attribute, only that row fails.
  - **Witness 2 fails 11 axe rows,** the implementer's [eleven](../../axe-checks-1/checks/witness2-rd58.txt), row for row. So item 3 holds.
  - **In Firefox and WebKit, removing the attribute fails nothing,** and the split button's rows pass. Those rows read the trailing button's `aria-label` and `aria-expanded`, not the engines' trees. That the browsers give no name either way is the [reading](../icon-name-1/checks/names-chromium.txt) that the owner answered, and wasn't read again.

## The split button's rows

- **Unmutated, Chromium:** `split-button.browser` 59 passed, among them _should expose no name of the trailing button without a label_ and _should expose no text of the icon_. `icon.browser` 21, `axe.browser` 71, `button-group-focus.spec.browser` 50, `traits-baseline.browser` 1.
- **Under witness 2, in each engine,** the split button's `secondarylabel` and `open` rows fail. In Chromium, its three tree rows fail too.
- **The icon is hidden twice now, as `RD-58` (a) says.** With `RF-137`'s slot not hidden, the split button's rows still pass: its trailing icon is hidden by the template's attribute. The 19 rows of `icon.browser` hold `RF-137` in Chromium, and 2 in Firefox and WebKit. So the split button's two rows hold the template's attribute, and no longer `RF-137`. This isn't a finding: the owner chose that the icon is hidden twice, and `RF-137` has rows of its own.

## The findings' texts

- **`reviewer-1`:** the header's bullet on icons in `axe.browser.test.ts` gives the triage's reason: _"axe takes an `mx-icon`'s text into the control's name although the icon's slot is hidden from the browsers' trees, so without the attribute a control that loses its name isn't reported."_ _Limits_ gains _"axe names an `mx-icon` by its text"_. `RD-57`'s note, `RD-58`'s _Why_ and `RF-137`'s _Not read_ each have a dated note from the architect that corrects them. The fixtures keep their `aria-hidden`.
- **`reviewer-2`:** the row's state is _"with an icon as a handle and no label of the page's"_, as the triage says, and its fixture is unchanged.

## The entries

`.scripts/entry.sh repo:RD-58` prints `RD-58` alone, from its heading to the implementer's note of (a), and exits 0. `.scripts/entry.sh repo:RD-59` prints `RD-59` from its heading, and exits 0. Its text matches its text at `75966eb9a^` line for line. The only difference is the trailing blank line that the comparison's `awk` keeps and `entry.sh` doesn't. Since `75966eb9a^`, the index has only additions.

## CI

`verify` run [45793831160](https://github.com/ausginer/material-x/actions/runs/45793831160) on `4012b5bb1` passed: every job succeeded, and `records` and `deploy` were skipped. Its `firefox` and `webkit` jobs ran each affected file: `split-button.browser` 59 rows, 4 of them skipped; `icon.browser` 21, 17 of them skipped; `button-group-focus.spec.browser` 50; `traits-baseline.browser` 1; and `axe.browser`'s 71 skipped, by `RD-57`. Each file passed. Those jobs are this recheck's unmutated Firefox and WebKit reading.

## Findings

### recheck-1

**Tier C.** In `axe.browser.test.ts`, the _Limits_ paragraph of the header comment breaks its lines unevenly after the implementer's insertion: _"… and it reports only what it has a rule / for. `color-contrast` is off, because / contrast belongs to the palette …"_. The text is right. Nothing reads it but a person, and the format check passes, because the formatter doesn't rewrap comments.

## Not covered

Safari; the visual project; the sizes, which are the implementer's [reading](../../axe-checks-1/checks/rd58-sizes.txt) and weren't measured again; everything of the proof that the triage doesn't reopen.
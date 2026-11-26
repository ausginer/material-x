# An inline `mx-icon` stands its middle on its text's lowercase middle (RF-147): feature proof

**Lens:** `reviewer`, feature proof of [`RF-147`](../../00-index.md) answer (a), with the architect's ruling of the stop, for pull request #307. Requested by the coordinator.

**Commit read:** `7ef948b2e` on `material-x/icon-middle-1`, which has `main` at `7ac961122` (#296) merged. "`main`" below is the head's build with `vertical-align:middle;` removed from the compiled `icon.ctr.css.js`, which is the one source line that the unit changes outside its rows.

**Outcome: accepted. One finding, tier C, in the record.** The required property holds in the three engines: the rows pass, and each fixed offset and `text-bottom` fails at least one row in each engine. The ruled condition holds in the three engines: no package element and no child that the package places moves. Only a page's own inline text moves, which the ruling accepts. The ruling moved into `RF-147` without a change. CI's `verify` passes on the head, run 45859654992.

## Scope and method

- **The affected files,** unmutated, in Chromium: `tests/icon/icon.browser.test.ts`, which the unit changes, and the files that test `mx-icon` in other elements: `tests/top-app-bar/top-app-bar.spec.browser.test.ts`, `tests/list/list-item.spec.browser.test.ts`, `tests/list/list-item-overflow.spec.browser.test.ts` and `tests/list/sortable-list.browser.test.ts` ([reading](checks/chromium-affected.txt)). Firefox and WebKit are read from CI (`RD-62` property 4).
- **Mutations** of `icon.ctr.css`'s declaration, against `icon.browser.test.ts`, in Chromium, Firefox and WebKit, one engine at a time ([script](probes/mutations.sh.txt), [readings](checks/mutations.txt)): the three of the implementer's record, and two of mine.
- **A probe of my own,** [`engines-boxes`](probes/engines-boxes.mjs.txt), in the three engines: the implementer's `boxes.mjs` cases, plus `mx-checkbox` (unchecked, checked, and in a line of text), `mx-radio` (unchecked and checked), `mx-split-button`, `mx-switch-button` and `mx-link-button` with an icon, and `mx-top-app-bar` with `mx-icon`s and with `mx-icon-button`s in `lead` and `trail`. These elements place an `mx-icon` and `boxes.mjs` doesn't read them. It reads the rects of every `mx-icon`, those in open shadow roots included, and a screenshot of each case at rest, with `main` against the head and the head against itself as the control ([Chromium](checks/boxes-chromium.txt), [Firefox](checks/boxes-firefox.txt), [WebKit](checks/boxes-webkit.txt)).
- **The record:** `RF-147`'s ruling, compared line for line between `8bfbc7927` and the head, and where `.scripts/entry.sh repo:RF-147` ends.
- **Not read:** Safari, a real page font, focused screenshots (the implementer's control shows that they differ between two runs of one build), the visual project locally (it is CI's), and material-x's full suite.

## Properties

| Property | Reading |
| --- | --- |
| The middle of an inline `mx-icon` is within 1 px of its text's baseline plus half its x-height, at 16 and 24 px, in a `span` and in a native button | **Holds,** Chromium locally, Firefox and WebKit locally and in CI. Without the declaration, all six rows fail in each engine: in Chromium by 3.5 and 5.5 px, and 2.4 and 3.6 px for the `font-size-adjust` rows. |
| The boxes of `mx-icon` in the package's own elements don't change | **Holds,** in the three engines. Of 46 cases, the rects and the pixels at rest are the same for each element and each child that the package places: the six handles in `lead` and `trail` of both items, slotted icons in list items, buttons, FABs, the text field and the top app bar, and the icons that the checkbox and the radio render. |
| The ruling's condition: no package element or package-placed child moves after #296 | **Holds,** in the three engines. What moves is a page's own text: `icon-alone`, the icon in a page's `span` of 24 px text, and the icon in a page's `<span slot="trail">`, by 2.97 px in Chromium and 2.5 px in Firefox and WebKit. The item's box is `20, 20, 300, 56` before and after in each engine. |
| No visual baseline changes | **Read from the probe, not from a run,** and CI's visual rows are in its `chromium` job. The checkbox and radio suites draw `mx-icon`s, and their rects and pixels don't change in any engine. |

**Mutations,** rows of `icon.browser.test.ts` that fail, the same in Chromium, Firefox and WebKit:

| Mutation | Rows that fail | Group |
| --- | --: | --- |
| None | 0 |  |
| Without the declaration (the witness) | 6 | repeated: removes the mechanism |
| `vertical-align: -0.125em` | 4: the `span` and button rows at both sizes | repeated: layout rounding |
| `vertical-align: -0.25em` | 2: the `font-size-adjust` rows | repeated: layout rounding |
| own: `vertical-align: -0.2em` | 1: the `font-size-adjust` row at 24 px, by 1.197 px in Chromium and WebKit and 1.200 px in Firefox | doubted |
| own: `vertical-align: text-bottom` | 2: the `font-size-adjust` rows | doubted |

No mutation is left for the implementer's Chromium record alone: its three are repeated. In each engine the same rows fail, so no mutation is caught in one engine and missed in another. Vitest prints one message for failures it groups, so the readings give a distance for every row in Chromium and for some rows only in Firefox and WebKit. Where both engines show a row's distance, it agrees with Chromium's to within 0.004 px, except `text-bottom`, which Firefox misses by 3.6 px at one size where Chromium misses by 2.6 and 4.4.

**The `font-size-adjust` row is the only row that tells a fixed offset near Roboto's from the mechanism.** `-0.2em`, `-0.25em` and `text-bottom` pass the four Roboto rows in each engine. `-0.2em` fails only at 24 px, by 0.2 px over the tolerance. That is what the property asks (within 1 px at 16 and 24 px), and the row catches each of them, so it is not a finding.

**The record.** The architect's ruling is the same 8 lines at `8bfbc7927`, under _Questions_, and at the head, in `RF-147` (`diff` reports nothing). It stands after the implementer's note that it rules on and before the note of the reading after #296. `entry.sh repo:RF-147` prints it, and _Questions_ no longer has it: the ruling's heading appears once in the file. The note of the reading after #296 counts 85 `same` lines, 33 of rects and 52 of screenshots, over 36 cases. Its other 11 lines are the 3 cases of a page's text, in rects and in pixels (one as a size), and 5 focused screenshots, whose differences the control of `boxes.txt` explains.

## Findings

### reviewer-1 — the record's reason for _no visual baseline changes_ misses two suites

**Tier C.** Owner: the architect, who decides whether the record is corrected.

- **What the record says:** `RF-147`'s note of the implementer, _Visual baselines_: _"The only `mx-icon`s in the visual suites are in `mx-top-app-bar`'s `lead` and `trail`, which are flex containers, so the icons are flex items. That is read from the test files and the compiled CSS."_
- **What is so:** `tests/checkbox/checkbox.visual.browser.test.ts` and `tests/radio/radio.visual.browser.test.ts` render `mx-checkbox` and `mx-radio`, and each renders an `mx-icon` in its shadow root (`checkbox.tpl.html`, `radio.tpl.html`). A search of the test files for `mx-icon` doesn't find them.
- **Why it doesn't change the outcome:** those icons are grid items of `inline-grid` hosts (`checkbox/styles/default/main.styles.css`, `radio/styles/default/main.styles.css`), so `vertical-align` doesn't apply to them. The probe reads their rects and their pixels unchanged in the three engines.
- **Required property:** the record's reason for a claim covers the cases the claim is about. No consumer sees a difference, and no instrument depends on the sentence.

## Observations

Not findings.

1. **The `trail` case moves less in Firefox and WebKit,** 2.5 px against Chromium's 2.97 px, from 40.5 or 41 to 43 or 43.5. That is rounding on an 11 px icon in a 16 px line. The ruling accepts the move without naming a distance.
2. **`checkbox-in-text`** differs by 27 pixels between `main` and the head in Chromium, and by the same 27 in the control, so the difference is in the renderer and not in the unit. Its rects are the same.

## CI

`verify`, run [45859654992](https://github.com/ausginer/material-x/actions/runs/45859654992), on `7ef948b2e`: **success**, with `records` and `deploy` skipped ([lines](checks/ci.txt)). In its `firefox` and `webkit` jobs each affected file passes: `icon.browser.test.ts` 10 of 27, with the 17 that run in Chromium only skipped, `sortable-list.browser.test.ts` 172 of 184 with 12 skipped, `list-item.spec` 134, `list-item-overflow.spec` 504 and `top-app-bar.spec` 48. Its `chromium` job passes all five, with the visual project: `checkbox.visual` 4, `radio.visual` 4 and `top-app-bar.visual` 2 among 192 files.

Locally, `icon.browser.test.ts` passes unmutated in Firefox and WebKit too, 10 of 27, as the first line of each engine in [the mutations](checks/mutations.txt).

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the relative links checked against the files with a script. Lint doesn't apply to Markdown. The scratch builds are in this session's scratchpad and are removed after the commit. The package's own build at `packages/material-x` was not rebuilt or changed.
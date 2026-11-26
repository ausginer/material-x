# A sortable item's handle centers its content and holds its line (RF-145, properties 3 and 4): bounded recheck

**Lens:** `reviewer`, the bounded recheck that the architect's note of `f529f3264` under [`RF-145`](../../00-index.md) owes, for #282 and #283 and pull request #296. Requested by the coordinator. It follows the [feature proof](feature-proof-claude.md) of `df577d7df`.

**Commit read:** `4cc69c603` on `material-x/touch-handle-1`, the remedy on the merge `b203e154e` of `main` at `6aa5330e3`. "Unmutated" below is that head.

**Outcome: properties 3 and 4 and the touch rows hold, in the three engines. One finding, tier B, for the architect:** no row guards the `lead` `line-height` rule's exclusion of a bare `mx-icon`. Without the exclusion, the stories' handle moves at device scale 1 in each engine. The grid rule's exclusion has no effect that a pixel shows, and needs no row. The owner has seen the boxes, which `RF-145`'s witness requires.

## The owner's look

The coordinator relays the owner on the before and after images in [`checks/boxes/remedy/`](../../touch-handle-1/checks/boxes/remedy/): _"картинки выглядят отлично 👍"_ ("the images look great"). That is the owner's look at the changed screenshots, which `RF-145`'s witness requires. The [pending item](feature-proof-claude.md#pending) of the feature proof is closed by it.

## Scope and method

- **Firefox and WebKit, unmutated, from CI:** `verify`'s run [45789723449](https://github.com/ausginer/material-x/actions/runs/45789723449) on the head, which passes. It is a full run, with 131 files in each engine. In its `firefox` and `webkit` jobs, the five browser and spec files of `tests/list` pass ([lines](checks/recheck/ci.txt)). These files are the affected files: the remedy changes the item's styles and `sortable-list.browser.test.ts`.
- **Chromium, unmutated, locally:** the same five files, 417 rows, none fails ([reading](checks/recheck/files-chromium.txt)).
- **Mutations, in the three engines,** one at a time in the item's styles, against `sortable-list.browser.test.ts` ([script](probes/recheck/mutations.mjs.txt), [readings](checks/recheck/mutations.txt)). They are the implementer's W1 to W4, with W4 in two parts, W4a and W4b. They also include the mechanisms of properties 1 and 2 under the new rule and four of my own. The mutation list follows the rule of [_Engines in development and in review_](../../../.agents/docs/test-architecture.md#engines-in-development-and-in-review). Every mutation repeats in the three engines, because layout rounding and touch are on its list, so none is read from the implementer's Chromium record alone.
- **A probe of my own,** [`proof-recheck`](probes/recheck/proof-recheck.browser.test.ts.txt), the feature proof's probe with a reading of gaps added. It ran unmutated and under W4, W4a, W4b and "without the handle rule", in the three engines ([reading](checks/recheck/probe.txt)). In Chromium, it reads the CDP touch at six points of each handle again with the new `display`.
- **The bare `mx-icon`'s pixels:** [`proof-shot`](probes/recheck/proof-shot.browser.test.ts.txt) screenshots a static item with a bare `mx-icon` handle, at rest and focused, at the harness's device scale of 1. It ran unmutated and under W4a and W4b, in the three engines ([reading](checks/recheck/bare-mx-icon-shots.txt), [comparison](probes/recheck/cmp.mjs.txt)).
- **Engines:** Chromium 158.0.8127.18, and Playwright 1.65.0's Firefox and WebKit. All runs used one engine at a time ([chains](probes/recheck/chains.sh.txt)). Another session's Vitest in slot `c` ran at the same time as some of them. No row was flaky, and each mutation's result is consistent across engines.
- **Not read:** the rest of the suite, which is CI's, the visual project, which is CI's too and has no list baseline, a real device, Safari and touch in Firefox and WebKit. CDP's touch is Chromium's. The texts are as the feature proof read them, with the remedy's sentence in the JSDoc and in `list.mdx`.

## Properties

| Property | Reading |
| --- | --- |
| 3 | **Holds, three engines.** The gaps of an `mx-icon` in a `span` handle above and below are 0 and 0 in `lead` and `trail`. In a native button, they are 3 and 3 in Chromium and Firefox, and 4 and 5 in WebKit, in both slots. A `span` that the page sizes centers its icon both ways. |
| 4 | **Holds, three engines.** The text of a `lead` `span` handle lies inside its box. The gaps are 0 and 0 in Chromium and Firefox, and 0.5 and 1.5 in WebKit. The box is 9x19 in Chromium and 13x21 in Firefox and WebKit. |
| 1, touch | **Holds, Chromium.** Every touch row passes. In the probe, each of the six handles in `lead` and in `trail` proposes the move at each of the six points, with no scroll and no `pointercancel`. Each handle other than a bare `mx-icon` is `inline-grid`, and a bare `mx-icon` is `inline-block`. A disabled item, a page's `touch-action: pan-y` and a page's `display: inline` pan and are canceled. A page's `display: block` takes the touch. Each of these reads as in the feature proof. |
| 2 | **Holds.** A mouse drag by each of the twelve handles proposes the move in the three engines. The rows of a page's `display`, a hidden handle and `until-found` pass in each engine. |

**Witnesses, three engines,** failing rows of 183 in Chromium and 171 in Firefox and WebKit:

| Mutation | Chromium | Firefox | WebKit |
| --- | --: | --: | --: |
| None | 0 | 0 | 0 |
| W1: the handle rule of `f529f3264` | 6 | 6 | 6 |
| W2: no `line-height: normal` in `lead` | 1 | 1 | 1 |
| W3: no `place-items: center` | 1 | 1 | 1 |
| W4: both rules on a bare `mx-icon` too | 0 | 0 | 0 |
| W4a: the grid rule on a bare `mx-icon` too | 0 | 0 | 0 |
| W4b: the `lead` `line-height` on a bare `mx-icon` too | 0 | 0 | 0 |
| Without the handle rule | 12 | 7 | 6 |
| Own: `inline-block`, keeping `place-items` and `line-height` | 6 | 6 | 6 |
| Own: `align-items` in place of `place-items` | 1 | 1 | 1 |
| Own: the handle `inline` | 14 | 7 | 6 |
| Without the `hidden` guard | 1 | 1 | 1 |
| The handle rule `!important` | 1 | 1 | 1 |
| Own: `hidden="until-found"` hidden too | 1 | 1 | 1 |

The rows are the same in each engine, except in three places. Chromium adds the touch rows, which run there alone, as their rows say. Firefox adds the text row under two mutations (observation 1). W2 fails the text row alone and W3 fails the sized `span` alone, as the implementer reads them. In Chromium, W1's six include the native button in `lead`, 3 and 6, and the `trail` `span`, 0 and 5. The `until-found` row now catches its mutation in each engine, which closes the feature proof's observation 3.

## Findings

### Finding reviewer-1 (tier B): no row guards the `lead` `line-height` rule's exclusion of a bare `mx-icon`

- **Current behavior:** at the head, a bare `mx-icon` handle keeps its own line height, and its box and screenshots are as on `main`. The rule `.lead::slotted([data-handle]:not(mx-icon)) { line-height: normal; }` does it by the `:not(mx-icon)`.
- **Evidence:** W4b removes that `:not(mx-icon)` and changes nothing else. Then the `lead` bare `mx-icon`'s line of text moves 2 px down in its 20x20 box in each engine: its gaps go from −2 and −2 to 0 and −4. The screenshot of a static item with that handle differs in 119 pixels at device scale 1, at rest and focused, in Chromium, Firefox and WebKit alike. The `trail` handle doesn't change. No row of the 183 fails, in any engine. The visual project has no list baseline, so CI doesn't catch it either. The stories' handle is a bare `mx-icon` in `lead`.
- **Why it is a problem:** the architect's note lists _"the box and screenshots of a bare `mx-icon` handle, the stories' handle"_ under **Unchanged**, and names the exclusion as what keeps them so. Of the remedy's mechanisms, this is the only one that changes what a page draws and that no row or baseline guards. A change of that selector would pass the suite and CI, and move the icon of every bare `mx-icon` handle in `lead`.
- **The grid rule's exclusion is not part of this finding.** W4a puts the `inline-grid` rule on a bare `mx-icon`. It changes only the computed `display`, to `inline-grid`. The box, the gaps of the text and every pixel of the screenshots stay the same, in the three engines. The implementer's note says that _"putting the rule on a bare mx-icon too fails no row and changes no screenshot at scale 1"_. That agrees with W4a. His record doesn't say whether his W4 included the `line-height` rule's `:not(mx-icon)`. Its rects and pixels match W4a and not W4b. The architect's scale-4 reading, `E`, put both rules on the bare `mx-icon`.
- **Required property:** the **Unchanged** clause on a bare `mx-icon` handle holds against a change of the `lead` rule's selector. A mutation that moves its glyph fails a row.
- **Routed to the architect:** the note owes rows for properties 3 and 4 only, so whether the **Unchanged** clause owes a row is the architect's call.

## Observations

Not findings.

1. **The text row catches two mutations in Firefox alone:** "without the handle rule" and the handle `inline`. With an `inline` `span` handle in `lead`, the text overflows the box by 1 px above and below in Firefox, a 19-high box for 21 of text. It lies inside the box in Chromium and WebKit, with gaps of 0 and 0. So under those mutations, property 4 fails in Firefox and holds in the other two. The row reads it correctly in each engine. Neither mutation removes property 4's mechanism. W2 does, and it fails in all three. Each of the two mutations is caught in every engine, by the rows of property 3 and the `until-found` row. I read the rule on engines per mutation, so this isn't a finding. Under a per-row reading, the row doesn't say why, and it would be tier C.
2. **A `trail` `span` handle with text isn't centered,** and no property asks for it. Property 4 is about `lead`. The gaps above and below are 1 and 2 in Chromium, 1 and 0 in Firefox, and 1.5 and 1.5 in WebKit. The owner saw `trail-span-text-focus` among the images.

## CI

`verify` passes on the head `4cc69c603`, in run 45789723449.

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the root format check. The relative links were checked against the files with a script. Lint doesn't apply to Markdown. The scratch probes were copied into the working tree only while they ran and were removed after. The style file was restored after each mutation, and `git status` showed no other change.
# Feature proof: the token tables for card, app bars, slider and divider (PR #188, `RD-47` unit T)

**Read at** `6b8b538c8` on `tproc/landing-tables-1`, against `repo:RD-47` with its dated note, the [landing plan](../../landing-1/landing-plan.md)'s Order item 1, and the `use-tokens-db` skill. Issue #170. The base is `986ad3719`. `main` is at `246b64754` now, which changes the record only, and `git merge-tree` is clean. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-23.

**Verdict:** the unit meets its requirement, and every claim the implementer made that I checked holds. It brings no defect. There are two findings: `reviewer-1` (Tier A) was there before this unit and isn't its to fix, and `reviewer-2` (Tier C) is a stale sentence in the plan. Neither blocks the merge. CI's `webkit` job passed, and `chromium` and `firefox` were still pending when I read them.

**Scope:**

- **Covered:** every claim in the task, the report, the record's note, and the effect on published packages.
- **Rerun:** a fresh fetch of all 18 tables at the release, held in memory, and a conversion through the branch's converter. The material-x CSS with either store. tproc's suite and typecheck. The transcript is [`proof.txt`](checks/proof.txt), with the probes beside it.
- **Not rerun:** material-x's suite. Its generated CSS is identical, and CI runs the suite. The visual, Firefox, WebKit and Safari runs.

## The claims

| Claim | Holds | Evidence |
| --- | --- | --- |
| Four rows: the three card variants, the small app bar, the slider and the divider | Yes | The tables fetched under the four ids name themselves _Cards_, _App bars_, _Sliders_ and _Divider_. Each reports database 41.1.12. `refetch.ts` |
| One update at the manifest's current release | Yes | `source` is equal. The site's release today is `2026-11-19_06-20-01`, and `check-release.ts` finds that the store has its database |
| 20 sets and 324 tokens, 123 deprecated | Yes | Counted through the reader. The per-set counts equal the record's |
| 103 earlier files byte-identical | Yes | Compared with the base's files, and with the two manifests' SHA-256 |
| Every token's selection, deprecation and set is equal | Yes | 3980 tokens: the whole record, the default and `dark` selections, `isTokenDeprecated` and the set |
| A second update gives an identical store | Yes | A fresh conversion equals all 124 committed files, with 0 conflicts |
| The report is the update's | Yes | Regenerated, it has the same lines as the committed report, apart from the added heading and the sentence under it |
| material-x's CSS is identical with either store | Yes | 35 of 35 files. The base store was read through a redirect of `readFile`, so the slot wasn't changed. A changed token in that store changes two files, so the check sees a change |
| Each new set resolves | Yes | All 324 tokens give a CSS value through `processTokenSet` and `resolveSet`. No one-hop reference or tree node names a token outside the store. No new token has more than one value entry, so no contextual choice is made inside the new sets |
| A row is a whole table | Yes | The row is `kind`, `componentId` and a name, and the raw App bars table lists all ten sets. The converter has no set filter |
| `md.comp.top-app-bar.small` is deprecated for `md.comp.app-bar` and `md.comp.app-bar.small` | Yes | All 19 tokens carry their own message: _"Use the corresponding token from the 'md.comp.app-bar' and 'md.comp.app-bar.small' tokens instead."_ |
| No personal data in the store | Yes | No `emailAddress`, `gaiaId` or author key, and no Google or Gmail address, in `packages/tproc/tokens` |
| tproc's suite | Yes | 13 files, 129 passed. Typecheck passes |

**What unit H reads.** `RD-47`'s note says it: `md.comp.app-bar` and `md.comp.app-bar.small`. The plan's top app bar section and #172 name no set, so the note is the only place.

**Published packages.** None changes. `tproc` is private, and material-x's published directories don't include the store. material-x's CSS is identical, and CI's `measurements` job passes. The store grows from 63.3 MB to 68.9 MB on disk. I saw no difference in load time beyond the noise of the runs (0.5 s to 0.8 s).

## Findings

### Finding: the CSS layer takes the deprecated iOS-bold weights and the 1P typefaces from the type scale

**`reviewer-1`, Tier A, pre-existing.** Priority: it affects every component whose text uses these styles, and the site's type scale (`RD-48`).

- **Current behaviour / contract:** the reader's selection takes the first contextual entry whose tags include `web` or `expressive` (`RD-28`, property 8). In `md.sys.typescale.*.weight`, the first entry with `web` is `{ "font": "ios.bold", "platform": "web" }`. Upstream describes the `font` group as deprecated, its tag `ios.bold` as _"Bolds iOS weights by one level"_, and gives `static` as its default tag.
- **Why it is a problem:** 10 of the 15 base styles take a weight one level too heavy: display and headline (500 instead of 400), `title-large` (500 instead of 400), `title-medium`, `title-small` and `label-large` (700 instead of 500). The styles on the plain typeface also take the fallback `"Google Sans Text"`, the 1P font, where the 3P entries say Roboto or Roboto Flex. The composite entry that the reader selects for the same token says 400, so the reader and the CSS layer disagree.
- **Evidence:** `typescale-weights.ts` in [`proof.txt`](checks/proof.txt). In this unit's sets, `md.comp.app-bar.small.title.font` gives `font-weight: 500`, and `title-large` is 400 in the 3P web entry. In material-x today, `button/styles/default/main.css.ts` renders `--_label-text-font-weight: var(--md-ref-typeface-weight-bold, 700)`. Upstream's 3P web entries for `md.comp.button.small.label-text`, `static` and `variable` alike, have 500. The base store gives the same CSS.
- **Required property:** the default selection picks the value that the published 3P web context gives. Not a defect of this unit: the plan of `tokens-source-1` says that a stricter rule is a separate decision. I found no record of this consequence. **Routed to the architect**, before unit H or the site reads these styles.

### Finding: the plan says that the larger app bars need two more token tables

**`reviewer-2`, Tier C.** The plan's [component table](../../landing-1/landing-plan.md#missing-components-sized), which `RD-47` makes the list of further work, says that the medium and large bars need _"Two more token tables"_, and that Card needs _"Three token tables"_. The one App bars row already holds the medium and large bars, and one Cards row holds the three cards. `RD-47`'s note says so, and the table doesn't. Required property: the two don't disagree. The architect's document.

## Notes for the component units

None of these is a finding. The store repeats upstream.

- **Some deprecations name a replacement that the store doesn't have.** Of the 12 new tokens with a replacement, 9 name one that isn't in the store: six `md.comp.slider.*.tick-marks.*` tokens, and `asset.comp.app-bar.icon.size`, three times. None of the 9 earlier tokens with a replacement does. For the small bar's icon size, upstream's message points to the common set, so H reads `md.comp.app-bar.icon.size` (24 px).
- **Reading a deprecated set gives no warning.** `processToken` warns for a deprecated token that a value refers to, and not for a deprecated token that is read. H must not take `md.comp.top-app-bar.small`.
- **The slider's value indicator mixes two styles upstream:** its font, size and line height come from `label-large`, and its weight and tracking from `body-large`.

No other finding. The store, the rows, the report and the record's note are as the plan requires.
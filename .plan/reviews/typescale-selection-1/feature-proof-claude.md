# Feature proof: one complete token context, and the tracking applied (PR #196, `RF-110` with `RF-92`)

**Read at** `d636f20a1` on `tproc/typescale-selection-1`, base `35ea25892`, against `repo:RF-110`, `repo:RF-92`, `repo:RD-28` property 9 and `repo:RF-81`'s tracking part. Issues #189 and #146. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-23 and its addition about M3 Expressive.

**Verdict:** the unit meets every required property, and I found no defect in the code. There are three findings, all Tier C. None blocks the merge. **The selection is right for M3 Expressive** ([below](#m3-expressive)). The 11 baselines are still to be recorded.

**Scope:**

- **Covered:** each property of `RF-110`, `RF-92`'s readers and rows, the implementer's readings, CI's results, and the Expressive question.
- **Run here:** tproc's suite (211 passed), the material-x `spec` project in Chromium, Firefox and WebKit (431 passed and 2 expected failures in each), the rendered probe in the three engines, 23 mutations of tproc, 14 of the stylesheets, and the root typecheck. The transcript is [`proof.txt`](checks/proof.txt), with the probes beside it.
- **From CI, not rerun:** the `browser`, `node` and visual projects, the size report, and the drag package. Run [45147496659](https://github.com/ausginer/material-x/actions/runs/45147496659) at this head.
- **Not covered:** Safari, the recorded baselines (none had landed), and the text of the m3.material.io specification pages.

## The claims

| Claim | Holds | Evidence |
| --- | --- | --- |
| The fixture is material-web's published data | Yes | I fetched both files at `a0bab1d94` and parsed them without the store. 75 of 75 values are equal, and no style is missing or added. `fixture.ts` |
| 34 of the 75 fail on the old rule | Yes | With the old rule in `select`, 35 of 76 rows fail: 15 fonts, 10 weights, 9 trackings, and the chain row |
| One entry for each token | Yes | Read from the raw JSON with my own matcher: 4286 tokens have exactly one, 18 have no tree and one value. The most specific of the token's values is the same one for all 4304. Every tag and group of the context exists in the store, and the context names every group. `entries.ts` |
| The chain row's 22 against 21 | Yes, both | The old rule gives 22 on this store and 21 on the store at `246b64754`. The added one is `md.comp.slider.value-indicator.label.label-text.font`, from #188. The new rule gives 0 of 4157. `chain.ts` |
| The converter's refusals | Yes | The 18 tables refetched at the release convert to 124 files identical to the committed store. A renamed group, a renamed `static`, `web` or `3p`, an emptied tree, a duplicated untagged entry, and an untagged entry added to a tagged tree are each refused and named. A renamed unused tag is accepted. `conv.ts` |
| Legacy conversion | Yes | The 14 tables of `a182ba6aa` convert to 103 files. `legacy.ts` |
| 5 stylesheets change and 30 don't | Yes | I compiled all 35 at both commits. The 5 diffs equal the record's line for line. The other 30 are byte-identical |
| Each tracking reader has a row | Yes | Every one of the 4 packages' readers, removed, fails its rows: button 5, FAB 3, input 4, prefix and suffix 8, supporting text and counter 8, the text field's label 4, and each of the list's five texts 2. A constant 0.1 px in the button and a constant 0 in the FAB fail too, and so does supporting text that reads the input's tracking |
| The FAB's contract ids | Yes | `extendedTokens[0]`, `.at(-1)` and `.at(-2)` are small (16 px), medium (22 px) and large (24 px) |
| Rendered weight, family and letter spacing | Yes | 22 texts and the input, with and without a theme. Each value is the entry's table's. The three engines agree |
| Sizes | Yes | CI's report: `complete` goes from 22724 to 22578 bytes, and `checkbox` alone grows, by 3 |
| Visual rows | Yes | CI's Chromium fails in exactly the 11 named rows of buttons and button groups, and the 8 checkbox and radio rows pass. I looked at the actual images of the size matrix and the icon composition: Roboto 500 to medium, 400 in large and extra large |
| The suites in CI | Yes | `firefox`, `webkit`, `static`, `docs` and `measurements` pass, so the record's _"Owed: Firefox and WebKit in CI"_ is met |

**Mutations of tproc, in `mutate-tproc.mjs`.** Caught: `font` (25 and 11 rows), `platform` (the synthetic `Store` row), `audience` (24), `motion.scheme` (22), a fallback to the first entry, `some` for `every`, ignored changes, changes that replace the context, untagged entries that don't match, the value index, and each half of the converter's check. The six that aren't caught are `reviewer-1`.

## M3 Expressive

**The owner's question:** material-web implements M3 and material-x implements M3 Expressive. Are the witness and the context right for Expressive?

- **What the 75 values are:** the 15 base type styles only. The `v0_192` export has no emphasized style. Expressive adds 15 emphasized styles, and doesn't change the base ones.
  - material-web's own Expressive-era export, `tokens/versions/latest` in the same commit, names its context as `audience: 3p`, `font: static` and `platform: web`, with design system version 34.0.21. Its 423 base and emphasized type scale variables and 5 typeface variables are all equal to this unit's selection: **428 compared, 0 differ**. `latest.ts`
  - Compose's `TypeScaleTokens` at androidx `1d46c08fb`: 120 values, base and emphasized, 0 differ. `MaterialExpressiveTheme` uses the same default `Typography()`, with a TODO that it may change.
- **Where a token has an Expressive choice:** only the `motion.scheme` group, which the context sets to `expressive`. 53 tokens have tags in it: 19 of `md.sys.motion` and 34 component springs. Of them 52 select the `expressive` and `web` entry. The other, `md.sys.motion.easing.emphasized`, has no such entry for web: its web entry has no scheme, and the old and the new value are the same reference.
  - The 12 springs equal Compose's `ExpressiveMotionTokens`, and the `standard` ones equal its `StandardMotionTokens`. `latest` publishes the standard springs, because its context names no scheme, so it isn't a source for them.
  - The rest of Expressive is separate tokens and sets: `md.sys.typescale.emphasized`, sets named _(baseline)_, and the list's `expressive` tokens. The selection doesn't choose among them, and no component token refers to an emphasized style, by the store or by `latest`.
- **Did a value move from Expressive to baseline?** In the 5 stylesheets, no: only the font, the weight, the tracking and the axes changed, and no emphasized or Expressive token is among them. The springs moved from iOS's `undefined` to their Expressive values. In the store, one arguable case: `md.sys.typescale.emphasized.headline-medium.rond` went from 100 to 0. 100 is its `variable` entry, so it is the owner's `static` (Q2 (a)). Every other emphasized `rond` has the same value in both, and the emphasized weights didn't change. No package reads it.
- **Component cross-check:** the label style of each button size, each extended FAB size, and the list item's five texts in the store equal Compose's `Button.textStyleFor` (label large, title medium, headline small, headline large), `FloatingActionButton.kt`'s (title medium, title large, headline small) and `ListTokens`, and the 19 label mixins of `latest` that the store has. material-web's `labs/gb` button and list, its Expressive components, name the same styles and read the same tracking. The text field's input, label and supporting text equal Compose's.
- **What I couldn't check:** Compose's button and FAB sets are `v0_11_0` and `v0_14_0`, and the store is database 41.1.12, so they are older. The text field has no Expressive source that differs from M3's. I read no text of the specification pages.
- **For the owner, not a finding:** `labs/gb` renders `'Roboto Flex', 'Roboto', …` and, for emphasized text, `'ROND' 100`, with a TODO that the emphasized tokens are to be fixed. Its tracking is the `static` one. That bears on a later move to `variable` (Q2), which stays his decision.

## Findings

### Finding: six of the ten tags of the rendered context can change without a row failing

**`reviewer-1`, Tier C.**

- **Current behaviour / contract:** `RD-28` property 9 names one tag for each of the ten groups. Changing `theme`, `contrast`, `language.height`, `device`, `ios.dark.theme.elevation` or `ios.weight.setting` in `RENDERED_CONTEXT` leaves all 211 rows passing.
- **Why it is a problem:** three of the six select other values in the store: `theme: dark` changes 34 `md.sys.color` tokens, `contrast` 30, and `language.height` 15 line heights. The chain row passes in any consistent context, and the 75 values don't reach these. `RD-28` writes the tags out so that a change doesn't alter what tproc renders, and nothing sees one.
- **Consequence:** none for a consumer today. No compiled sheet reads them, because the CSS layer takes colours from the theme. `device` and the two iOS groups change no token at this release.
- **Evidence / reproduction:** `mutate-tproc.mjs` and `tags.ts`.
- **Required property:** a change of a context tag that changes a selected value fails a row.

### Finding: the outside witness is an export from before Expressive, and a newer one is beside it

**`reviewer-2`, Tier C. Routed to the architect.**

- **Current behaviour / contract:** `RF-110` property 2 asks for material-web's values, and `material-web-typescale.ts` takes `v0_192`. Its header names the context, _"Audience: 3P"_ and _"Platform: Web"_, with no `font` tag.
- **Why it is a problem:** the same commit's `tokens/versions/latest` is the Expressive-era export, names `font: static` as this unit's context does, and also carries the emphasized styles. The choice rests on the older one without saying so, and nothing from outside judges the emphasized styles or the springs.
- **Consequence:** none today: the two exports agree in every base value, and the emphasized styles have no reader in material-x.
- **Evidence:** [above](#m3-expressive), `latest.ts`.
- **Required property:** the record says what the witness covers and that it isn't the Expressive part, or the witness is one that covers it.

### Finding: the record doesn't hold the root typecheck's failed run

**`reviewer-3`, Tier C.** The coordinator's task names one unexplained failure of the root typecheck run. Neither `implementation.txt`, the `RF-110` note nor the pull request mentions it, and `handoff.md` asks that a check failure and its scope be recorded. I ran the root `typecheck` 8 times in the slot, and it passed each time, as CI's `static` does. With no output kept, I can't say what failed, and I don't attribute it to this unit. **Required property:** the failure's output, or the fact that it wasn't kept, is in the record.

## Not a finding

`.agents/docs/test-architecture.md` still describes the old selection. The record says that it gets its own pull request. `RD-28` property 8 says _"Until `RF-110`'s unit merges"_, which is the architect's to update after the merge.

No other finding: the reader, the converter, the report, the skill, the fonts of `browser-setup.ts`, the readers and their rows are as the records require.
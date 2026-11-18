# `RF-40`'s rows and report — feature proof, handoff items 1 and 2

**Files were read at:** `90789d260` (`repo/host-has-fallback-1`, slot `e`, clean, equal to `origin`). **Diff reviewed:** `479d8fcf7` to `90789d260`, which is `14dfbd9df`, `c10d73f1d` and `90789d260`. **Records read at the same commit.**

**Governing records:** `repo:RF-40` in [`00-index.md`](../../00-index.md); the [handoff](../../host-has-fallback-1/host-has-fallback-handoff.md)'s _Item 1. The tests_ and _Item 2. The report_; the [report](../../host-has-fallback-1/host-has-fallback-report.md) and its witnesses under [`checks/`](../../host-has-fallback-1/checks/).

**Lens:** feature proof. Each claim below is my own reading of the tree or a local run, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: items 1 and 2 hold, except for the pull request's `firefox` and `webkit` run identifiers, which are still open.** The rows pass in all three engines and observe outcomes, not mechanism. Without the states, every row fails in Firefox. When a slot's class disagrees with its name, the lead rows fail in Firefox alone. That is the coupling `RF-40` describes. There are three Tier C findings, and none of them is in the product or in what the rows prove:

- `reviewer-1`: the handoff and the report explain witness 3's failures by a mechanism that the rows don't observe;
- `reviewer-2`: a JSDoc and the report say the rows find their elements by `part`, but two lookups use a class;
- `reviewer-3`: `RF-40` lists one rule that relies on the fallback and that no row observes.

I also judge the implementer's `implementer-1` below. It holds.

## Scope

**Covered.**

- **The three changed test files,** against each _Required_ point of item 1, the [`test-component`](../../../.claude/skills/test-component/SKILL.md) skill and the [`test-visual-contract`](../../../.claude/skills/test-visual-contract/SKILL.md) skill's bridge rules.
- **Witness 1, locally.** I ran the `browser` project in Chromium, Firefox and WebKit in one run: 33 file runs, 647 passed and 1 expected fail, out of 648 (3 × 216), exit 0. That agrees with the report's 216 for Chromium and its 431 passed and 1 expected fail for Firefox and WebKit.
- **Witness 2,** from the transcript and the code. I didn't repeat it.
- **Witness 3,** repeated, with a probe that reads the host's state, the host rule's custom properties and the lead slot's grid placement. I also ran a mutation of my own that isolates the coupling (_3c_ in my runs).
- **Witness 4.** `typecheck` exits 0. `lint` exits 0 on the three changed files. `fmt-check` is clean.
- **Item 2:** the report's contents against the item, the report's links (checked by script), and `git diff --check` on the diff.
- **Where items 1 and 2 touch item 3.** They change no file under `src/`. In the report, item 3's section changes only in its headings, in a line saying that item 1's rows pass in all three engines, and in a line on item 3's feature proof. Its claims are otherwise those the item 3 review read. `RF-40`'s and `RF-59`'s entries are unchanged.

My runs and the probe's source are in [`checks/feature-proof-rf40-runs.txt`](checks/feature-proof-rf40-runs.txt).

**Not covered.**

- **The pull request's `firefox` and `webkit` jobs.** The pull request was being opened while I read, and I didn't wait for its run.
- **The `visual` project,** which is item 3's open witness and runs only in the gate.
- **The `outlined` sheet.** Its `:has-slotted` rules are slot-level (`.prefix:has-slotted`, `.suffix:has-slotted`, `.label :has-slotted`). The build rewrites them to the class that the polyfill toggles in every engine, and no state is involved. Item 1 doesn't name them.

## Item 1, point by point

| Required | Observed |
| --- | --- |
| text-field: one row per slot (`lead`, `trail`, `prefix`, `suffix`, `support`, `counter`), applied while the slot has content and withdrawn after the content is removed | Six rows, run for both `mx-text-field` and `mx-multiline-text-field`, so 12 rows. Each one measures the empty state, slots content, asserts, removes the content, and asserts that the empty measurement returns. The two elements share `text-field-core.tpl.html` and `default/main.styles.css`, and they differ in their field element, whose start and end the rows measure. |
| list item: `support`, `overline`, and the two together | Three rows on `mx-list-item`. The row for both together asserts the three-line height only. See `implementer-1`. |
| Observe the outcome: the lead column's size, the input's inline start, the row and its gap, `.host`'s block size. No state, class or private custom property | The rows assert geometry only: the slot's width, the input's offset from the host's start or end, the supporting row's height and its offset below `.notched-outline`, and `.host`'s height. Nothing asserts a state, a class or a custom property. |
| Exact values from tokens, with no literal copied | `text-field.default` and `list-item.default` register `defaultTokens` and `listItemTokens`. `main.css.ts` builds each component's CSS from those same signals, as the visual-contract skill requires. Values are read with `values[token]!` and `pixels`, and comparisons use `toBe`. The 24px slotted box is fixture content, not a token value. |
| Render the real element, wait without sleeping, one `it` per slot | Real elements are appended to `document.body`, and the shared setup cleans up. Each wait is `nextFrame` from `tests/browser.ts`. `slotchange` is dispatched before the next animation frame, so the polyfill has run when the frame resolves. As the item 3 review noted, `tests/support` has no slot-settlement helper. `support` and `counter` share one `it.each`, which gives one `it` per slot. |
| No product change | None. `useHasSlottedPolyfill`'s JSDoc came with item 3 (`0b6bc4d30`), and the item 3 review checked it. |

**The rows aren't vacuous where they could have been.** The supporting row's height assertion could hold without the rule. Witness 2's transcript shows that it doesn't: without the state, the row's height reads 0 against its slot's 16 in Firefox. The row sits in a fixed `0` track, so the stretched `div` takes the track's height.

## The witnesses

1. **Witness 1.** The rows pass in every engine locally (above). The run identifiers are open.
2. **Witness 2.** The transcript shows 15 failures, all in Firefox, and 30 passes in Chromium and WebKit. The code explains that pattern: Chromium 158 and WebKit 27.2 match `:host:has(.<class>.has-slotted)`, so they don't need the state, and Firefox does. My mutation _3c_ confirms the Firefox half from another direction.
3. **Witness 3, repeated, and the coordinator's question on WebKit.** My run reproduces the implementer's result: the two lead rows fail in Chromium, Firefox and WebKit with _expected 12 to be 24_, and every other row passes. **The failure in WebKit is what the handoff's intent requires.** The intent is that the rows observe the rule's outcome in the engines that take the class path, so that a class which disagrees with its sheet fails a row and not only a lookup. WebKit takes the same path as Chromium (reading D), so it was always going to fail with Chromium. The handoff didn't list it, and that omission doesn't describe a defect in the rows. **The mechanism is different from what the handoff and the report give.** My probe shows that the host rule still applies in all three engines; see `reviewer-1`.
4. **Witness 4** holds (above).

**Mutation _3c_: the coupling itself.** I renamed the class from `lead` to `leading` in both `default/main.styles.css` and `text-field-core.tpl.html`, and left the slot's `name` as `lead`. This is the mismatch that `RF-40` and the JSDoc describe: the build derives `has-leading` from the class, and the runtime sets `has-lead` from the name.

- The two lead rows **fail in Firefox only,** with _expected 0 to be 24_.
- They pass in Chromium and WebKit.
- The probe reads `--_lead-column-size` as empty in Firefox and `min-content` in the other two.

So the rows witness the Firefox-only failure that `RF-40` says no test in the gate saw. Witness 2 also does that, but more broadly: it removes every state.

## Item 2, point by point

| Required | Observed |
| --- | --- |
| The rows | A table of what each slot's presence selects, and what is asserted. It agrees with the code. |
| Each engine's result, with the pull request's run identifiers | Local results for all three engines are in the report. The run identifiers are marked as pending, so this is an open obligation and not a defect. |
| Both mutations' outputs under `checks/` | `rf40-mutation-no-state.txt` and `rf40-mutation-lead-class.txt`, each with its diff. |
| `RF-40`'s and `RF-59`'s statuses unchanged | `.plan/00-index.md` isn't in the diff. |
| Item 3's witnesses in a section of their own | They are kept, under _Item 3_. |

## `implementer-1`, judged

**It holds, at Tier C.**

- `--_support-row-size` is set once, at `list/styles/item/main.styles.css:48`, and nothing in `packages/` reads it.
- Its reader was removed in `ede90d958` (_refactor(material-x): fix list-item styling_). That commit replaced `.support`'s `max-block-size: var(--_support-row-size, 0)` with `max-block-size: calc(2 * var(--_supporting-text-line-height))`, whatever the line count.
- So the _doubled support row_ named in the handoff's item 1 has no rendered outcome. The only thing left to assert is the private custom property, which item 1 forbids.
- The row for both slots is therefore right to assert the three-line height alone.

**Not established:** whether the two-line clamp on `.support` is meant to apply regardless of the line count. I didn't read a two-line item whose supporting text wraps. That is a design question for the architect, and this review doesn't count it as a defect.

## Findings

### reviewer-1 — The handoff and the report explain witness 3 by a mechanism that the rows don't observe

- **Tier:** C. This is internal to the record, and the rows themselves are sound.
- **What the records say:**
  - The handoff's witness 3 says that renaming `class="lead"` fails Chromium because _"the class path loses the rule"_, and fails Firefox because _"the fallback's derived name no longer matches"_.
  - The report says that WebKit fails _"because it takes the class path, as Chromium does"_.
- **What happens** (my runs, _3b_):
  - Since item 3, every engine sets `has-lead` from the slot's `name`. The build derives `has-lead` from the sheet's class, and the template mutation doesn't change that class.
  - So in all three engines, `:host(:state(has-lead))` matches, and the host rule applies: `--_lead-column-size` is `min-content`, and `--_padding-inline-start` is 12px.
  - What the rename removes is the slot's own rule, `.lead { grid-area: L; … }`. The slot is auto-placed, with `grid-column-start: auto`, and is 12px wide.
  - No engine depends on the class path in this mutation, and no derived name stops matching.
- **Why it matters:** whoever closes `RF-40` from the report would read witness 3 as evidence of the class path in Chromium and WebKit, and of a name mismatch in Firefox. What witness 3 does show is that the rows fail in every engine when the template's class disagrees with its sheet. That still meets the handoff's intent (_The witnesses_, 3).
- **Evidence:** [`checks/feature-proof-rf40-runs.txt`](checks/feature-proof-rf40-runs.txt) §3a and §3b. The handoff's _Item 1_, witness 3. The report's _Witnesses_, 3.
- **Required property:** the record of witness 3 states the mechanism that makes the rows fail, as observed.
- **Routed to** the architect for the handoff's text. The report's sentence is the implementer's.

### reviewer-2 — `getShadowElement`'s JSDoc and the report say the rows find their elements by `part`, but two lookups use a class

- **Tier:** C. A test comment and the record are inaccurate. Nothing a consumer observes depends on them.
- **What is written:** _"The slot rows find their elements by `part`, which no stylesheet rule selects"_ (`text-field.browser.test.ts`, above `getShadowElement`). The report says the same of _"the shadow elements"_.
- **What the code does:**
  - The slots and the supporting rows are found by `part`.
  - The `support` and `counter` rows call `getShadowElement(field, '.notched-outline')`.
  - Every row measures the field element through `getInput`, which looks up `.input`.
- **Why it matters:** the comment explains why a renamed class fails an assertion and not a lookup. That holds for the classes that appear beside `:has-slotted`. Neither `.notched-outline` nor `.input` appears in such a selector, so no coupling mutation is hidden today. But the comment says more than the code does.
- **Evidence:** `tests/text-field/text-field.browser.test.ts` at `90789d260`, lines 21–29 and 217. No material-x stylesheet selects `[part`.
- **Required property:** the comment and the report describe the lookups as they are written.

### reviewer-3 — `RF-40` lists `list/styles/item/main.styles.css:184` as relying on the fallback, and no row observes it

- **Tier:** C. No consumer-observable effect follows from the gap today.
- **What:**
  - `RF-40`'s _Who relies on it_ lists the list item's `:35`–`:43` and `:184`.
  - `:184` is the nested rule `:host:has(.support:has-slotted):has(.overline:has-slotted) &`. It gives a slotted leading video its large size when the item has three lines, and the build gives it a state fallback.
  - The rows observe `:35`–`:43` only. The handoff's item 1 names the three-line height and the doubled support row, and not this rule, so this isn't a defect against the handoff.
- **Why it matters:** `RF-40`'s required property is about each `:host:has()` rule, and `RF-40` closes on the rows. A closure that reads _witnessed in the gate_ would cover one rule that the gate doesn't observe.
- **Evidence:** `RF-40` in `.plan/00-index.md`. `list/styles/item/main.styles.css:184`. `tests/list/list-item.browser.test.ts` at `90789d260`.
- **Required property:** every rule that `RF-40` lists is witnessed in the gate, or the closure names the rules that aren't.
- **Routed to** the architect.
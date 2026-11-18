# Report: `RF-40`'s tests and `RF-59`'s repair (handoff items 1 to 4)

**Input:** `repo/host-has-fallback-1`. Item 3 was implemented at `0b6bc4d30` from `d23abc117`, and its feature proof is `f88437c6b`. Items 1 and 2 are implemented at `14dfbd9df` and `c10d73f1d` from `479d8fcf7`, and their feature proof is `3361b6b76`. Item 4, on that proof's findings as the architect disposed them at `52001d5bd`, is `f80e841b4`. The tasks are the [handoff](host-has-fallback-handoff.md)'s items 1 to 4. **Governing records:** `repo:RF-40` and `repo:RF-59`, in [`../00-index.md`](../00-index.md). The owner answered the handoff's question 1 on 2026-11-18, as the coordinator relayed: `RF-40` closes on tests. Proposal 1 is recorded at `836d4d003`. Neither entry's status is changed here.

## Item 1. The rows

**Changed:** tests only. `useHasSlottedPolyfill`'s JSDoc already names the coupling, from item 3 (`0b6bc4d30`), so item 1 doesn't change product code.

- `packages/material-x/tests/text-field/text-field.browser.test.ts`: a `describe` _`<tag>` slotted content_, for `mx-text-field` and `mx-multiline-text-field`. Both elements use the same `default/main.styles.css`. There are six rows per element, one per slot: `lead`, `trail`, `prefix`, `suffix`, `support` and `counter`.
- `packages/material-x/tests/list/list-item.browser.test.ts`: a `describe` _mx-list-item slotted content_, with three rows: `support`, `overline`, and the two together.
- `packages/material-x/tests/support/visual-contracts.node.ts`: two contracts on the existing bridge, `text-field.default` (`defaultTokens`) and `list-item.default` (`listItemTokens`). Each is the token package that generates the component's CSS. They let the rows take their exact values from tproc, as the [`test-visual-contract`](../../.claude/skills/test-visual-contract/SKILL.md) skill says, instead of copying literals. No helper's behavior changes.

Each row renders the real element and measures the empty state. Then it slots content, asserts the rule's outcome, removes the content, and asserts that the empty measurement returns. Each wait is `nextFrame` from `tests/browser.ts`. No row asserts a state, a class or a private custom property.

| Row | What the slot's presence selects | Asserted |
| --- | --- | --- |
| text field `lead` | `:host:has(.lead:has-slotted)` opens column L and changes the inline-start padding and gap | the `[part=lead]` width equals the content's width, and the input starts at `container.icon.padding.inline` + content + `container.padding.inline` |
| text field `trail` | the same at the end | the same, measured from the host's end to the input's end |
| text field `prefix` | opens column P | the `[part=prefix]` width equals the content's width, and the input starts at `container.padding.inline` + content + `input-text.prefix.gap` |
| text field `suffix` | opens column S | the same at the end, with `input-text.suffix.gap` |
| text field `support`, `counter` | gives the second grid row a height and a `row-gap` | the row's height equals its slot's height, and the row begins `supporting-text.row-gap` below `.notched-outline` |
| list item `support`, `overline` | the two-line container height | `.host`'s block size is `two-line.container.height` |
| list item both | the three-line container height | `.host`'s block size is `three-line.container.height` |
| list item leading video (item 4) | `:host:has(.support:has-slotted):has(.overline:has-slotted) .lead::slotted(video)` sizes the video large | a slotted `<video>` is `leading-video.width` by `small.leading-video.height` while empty and with `support` alone, `large.leading-video.width` by `large.leading-video.height` with both, and small again once both are removed |

Slotted boxes in the four column rows have a fixed inline size, so each column's width is an integer and the sums compare exactly. The text field rows find each slot and supporting row by `part`, which no stylesheet rule selects, so a class that disagrees with its stylesheet fails the rule's assertion and not the lookup. `.notched-outline` and `.input` are found by class. No selector beside `:has-slotted` names either one, so a class mutation of a slot doesn't reach those lookups (`reviewer-2`, corrected in `f80e841b4`).

## Witnesses

1. **The rows pass in every engine, locally.** At `c10d73f1d`:
   - Chromium, the whole `browser` project: 11 files, 216 passed, exit 0 ([output](checks/rf40-rows-chromium.txt)).
   - Firefox and WebKit, with `MX_TEST_ENGINES=firefox,webkit` in the devcontainer: 22 file runs, 431 passed and 1 expected fail, exit 0 ([output](checks/rf40-rows-firefox-webkit.txt)). The expected fail is `button.browser.test.ts`'s Firefox-only `it.fails` row (`repo:RF-33`), which this unit doesn't touch.
   - **In the gate,** #59's [run 44276212222](checks/rf40-pr-run.txt) on `4df80913f`, which is `f48143080` merged with `origin/main` at `7a4f82eb4`, concludes `success`. `tests/text-field/text-field.browser.test.ts` (26 tests) and `tests/list/list-item.browser.test.ts` (7 tests, item 4's row included) pass in the `chromium` job 134705238062, the `firefox` job 134705238220 and the `webkit` job 134705238152. The earlier runs 44269129560, 44270214696 and 44270981537 were cancelled and aren't cited.
2. **Firefox's rows test the fallback** ([output](checks/rf40-mutation-no-state.txt)). The mutation removed the polyfill's `toggleState` call, so no `has-<slot>` state is set. All 15 new rows fail in Firefox and pass in Chromium and WebKit. The mutation is reverted.
3. **The rows test the rules** ([output](checks/rf40-mutation-lead-class.txt)). The mutation renamed `class="lead"` on text field's lead slot to `class="lead-renamed"`. The `lead` row of both text field elements fails in Chromium, Firefox and WebKit, and every other row passes. The failure is the rule's assertion: the lead's width reads 12 and not 24. **The mechanism is the slot's own rule:** the renamed slot loses `.lead { grid-area: L; … }` and leaves column L. The host rule still applies in every engine, because since item 3 every engine sets `has-lead` from the slot's `name` (`reviewer-1`; the handoff's witness 3 is corrected). The mutation is reverted. **The coupling that `RF-40` names is witnessed by the review's mutation _3c_** ([runs](../reviews/host-has-fallback-1/checks/feature-proof-rf40-runs.txt), §3c). It renamed the class to `leading` in the sheet and the template and kept the slot's `name`, `lead`, so the build derived `has-leading` and the runtime set `has-lead`. The lead rows then failed in Firefox alone.
4. **`typecheck` and `lint`.** `aube exec just typecheck` exits 0 in `packages/material-x` and at the root, and `aube exec just lint` exits 0 at the root. The handoff loop on the three changed files ends with `just lint` at 0 errors. The `node` project's `tests/support` file, which exercises the bridge, passes: 5 tests.

**No row fails in one engine without a mutation,** so the handoff's stop doesn't apply.

**The first commit's lookup was found by witness 3.** At `14dfbd9df`, the text field rows found the lead by `.lead`. The rename then failed the lookup and not the rule, so witness 3 showed nothing. `c10d73f1d` switches the lookups to `part`, and the witnesses above are read at that commit.

## Finding

### implementer-1 — the three-line rule's `--_support-row-size` is read by no rule

- **Tier:** C. No consumer-observable effect.
- **What:** `list/styles/item/main.styles.css`'s three-line rule sets `--_support-row-size: calc(2 * var(--_supporting-text-line-height))`. No other rule in `packages/material-x/src` reads `--_support-row-size`. So a support row that doubles with three-line content has no observable outcome, and the list item's _both_ row asserts the three-line height only. Handoff item 1 names the _doubled support row_, but nothing renders it.
- **Not a rendering difference between engines,** so it isn't the handoff's stop.
- **Required property:** either a rule reads the custom property, or the declaration goes.
- **Registered** as `repo:RF-64` at `52001d5bd`, outside this unit.

## Item 4. The feature proof's findings

**Input:** the [feature proof](../reviews/host-has-fallback-1/feature-proof-rf40-claude.md) at `3361b6b76`, as the architect disposed it at `52001d5bd`. **Changed** in `f80e841b4`, tests only:

- `reviewer-2`: the JSDoc above `getShadowElement` names the slots and supporting rows as found by `part`, and `.notched-outline` and `.input` as found by class. The report's sentence on the lookups, under item 1, agrees.
- `reviewer-3`: the list item row _should select the large leading video size only while support and overline both have content_, for the rule at `list/styles/item/main.styles.css:184`. Its expected sizes come from `list-item.default`'s `leading-video.width`, `small.leading-video.height`, `large.leading-video.width` and `large.leading-video.height`.
- `reviewer-1`: item 1's witness 3 states the mechanism as observed, and cites the review's _3c_.

**Witnesses:**

1. **The row passes in every engine.** Locally at `f80e841b4`, in Chromium, Firefox and WebKit, with every other row of both changed files: 99 passed, exit 0 ([output](checks/rf40-video-row.txt)). In the gate, it is in run 44276212222 (item 1's witness 1).
2. **It tests the fallback** ([output](checks/rf40-video-row-no-state.txt)). With the polyfill setting no state, the row fails in Firefox, where the video stays `[100, 56]` against the expected `[114, 64]`, and passes in Chromium and WebKit. The mutation is reverted.
3. **The handoff loop** on the two changed test files ends with `just lint` at 0 errors, and `aube exec just typecheck` in `packages/material-x` exits 0.

The row doesn't fail in any engine without the mutation, so the stop doesn't apply.

## Item 2. This report

This file. The rows, each engine's local result and both mutations' outputs are above and under [`checks/`](checks/). `RF-40`'s and `RF-59`'s statuses are unchanged.

Nothing is outstanding for items 1, 2 and 4.

## Item 3. `RF-59`: the polyfill sets its states in every engine, and detects nothing

**Changed:** `packages/material-x/src/core/utils/polyfills.ts`. `HOST_HAS_SUPPORTED` is gone. On every `slotchange`, `useHasSlottedPolyfill` sets the slot's `has-slotted` class and the host's `has-<slot name, or default>` state in every engine. Its JSDoc names the coupling with `hasSlottedFallbackVisitor`, and states the three points the handoff requires. The module evaluates declarations only. Nothing else changed: not the visitor, the stylesheets, the templates or `TextFieldCore.ts`.

**Added:** `packages/material-x/tests/core/utils/polyfills.browser.test.ts`, two rows in the `browser` project.

- _should neither append to the document nor compute a style when imported_ loads a fresh instance of the module through a query string, while it spies on `document.body.append` and `getComputedStyle`.
- _should set the host's has-<slot> state in every engine_ slots content into a text field's `lead` slot and waits until the host matches `:state(has-lead)`.

### Item 3's witnesses

1. **The rows fail before the repair and pass after it** ([before](checks/rf59-import-row-before.txt), [after](checks/rf59-import-row-after.txt)). Before, the import row fails in Chromium, Firefox and WebKit: one `append` and one `getComputedStyle`. The state row fails in Chromium and WebKit, where the detection read true, and passes in Firefox. After, all six runs pass.
2. **The import before `<body>` no longer fails** ([reading](checks/rf59-head-import-after.txt)). The head-import probe, re-run against slot `e`'s build of this branch, defines the element in every scenario, in all three engines and at both holds, with no error. That includes `classic-bundle`, `module-src-async` and both dynamic imports, which threw before.
3. **The rendering.**
   - The `browser` project passes in Chromium, Firefox and WebKit, run locally with `MX_TEST_ENGINES=chromium,firefox,webkit`: 11 files, each once per engine, 603 tests, none failed.
   - Item 1's rows, added after this reading, pass in all three engines (item 1's witness 1).
   - **The `visual` project passes with no baseline changed,** in [run 44276212222](checks/rf40-pr-run.txt)'s `chromium` job 134705238062 on `4df80913f`. Its four files pass: `button-group`, `button`, `checkbox` and `radio`. The job's screenshot upload, which runs only on failure, is skipped, and the branch changes no file under `__screenshots__` against `origin/main`. So the handoff's stop doesn't apply. The `browser` project passes in that run's `chromium`, `firefox` and `webkit` jobs.
4. `aube exec just typecheck` in `packages/material-x` exits 0. The handoff loop on both changed files ends with `just lint` at 0 errors.

**Feature proof:** [`feature-proof-claude.md`](../reviews/host-has-fallback-1/feature-proof-claude.md) at `f88437c6b`. Item 3 holds except for the `visual` reading, and its finding `reviewer-1` against `RF-59`'s record is addressed at `479d8fcf7`.

Nothing is outstanding for item 3.
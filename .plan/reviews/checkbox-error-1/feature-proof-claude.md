# `mx-checkbox` draws Material's error appearance, and disabled wins over error (RF-95): feature proof

**Lens:** `reviewer`, feature proof of [`RF-95`](../../00-index.md), with the architect's ruling of 2026-11-27 and the implementer's note of the same day, for pull request #328. The coordinator requested it. This pass redoes one that was lost uncommitted when the slots' volume was deleted. No part of that pass is cited here.

**Commit read:** `00040d137` on `material-x/checkbox-error-1`. That is the unit's `42751b60e`, on `main` at `9342359bf`, plus the owner's baseline merge (#330), which adds only `checkbox-error-chromium-linux.png`. The unit changes:

- `src/checkbox/checkbox.ts`, `checkbox.mdx`, `checkbox.stories.tsx`, `styles/utils.ts`, `styles/default/tokens.ts` and `styles/default/main.css.ts`;
- `tests/checkbox/checkbox.spec.browser.test.ts` and `checkbox.visual.browser.test.ts`, `tests/core/focus-layer.spec.browser.test.ts` and `tests/support/visual-contracts.node.ts`;
- the entry, and the reading `checks/witnesses.txt` with its probe.

The branch merges into `origin/main` at `2b193971e` without a conflict.

**Outcome: accepted. Three findings:**

- **fp-1, tier C, for the architect:** the ruling's witness doesn't hold under a mechanism that the ruling allows.
- **fp-2, tier B, closed 2026-11-27:** the disabled-with-error rows can't see the error icon color, because the fixture theme draws `on-error` and `on-primary` in the same white.
- **fp-3, tier A, pre-existing and outside the unit:** the checkbox draws non-Material values in four states that its rows don't read.

The required property holds in Chromium, Firefox and WebKit. With `error`, the checkbox draws Material's error outline, container, icon and state layers. With `error` and `disabled`, it draws exactly what it draws with `disabled` alone, in each selection. The existing compiled blocks are unchanged. The baseline shows the three error states. Every unmutated row passes, here in Chromium and on CI in all three engines, and CI's `verify` passed on `00040d137`.

## Scope and method

- **Unmutated, in Chromium:** every project of `packages/material-x`, in slot d after `aube install`, `just _test-builds` and Playwright's browsers. 52 files, 2869 rows passed and 2 expected to fail ([reading](checks/chromium.txt)). `tests/axe.browser.test.ts` passes here: in this fresh container, the 9 `aria-prohibited-attr` rows that earlier sessions saw fail don't fail.
- **CI's run 45988263765 on `00040d137`** passed every job ([reading](checks/ci.txt)):
  - Chromium has 5560 rows, with `axe.browser` (71), `checkbox.spec` (17), `focus-layer.spec` (74) and `checkbox.visual` (5) among them.
  - Firefox has 4373 rows and WebKit 4384, and both pass `checkbox.spec` and `focus-layer.spec`.
  - `verify` succeeded.
- **Mutations,** each run in Chromium, Firefox and WebKit at once against `checkbox.spec` and `focus-layer.spec` ([script](probes/mutations.mjs.txt), [readings](checks/mutations.txt)):
  - W1 to W4 are the implementer's modes.
  - M5 to M9 are mine. Each removes one part of the error package or of its selector.
- **Probes,** each copied into `tests/checkbox/` for its run and removed after it:
  - [`layers`](probes/layers.spec.browser.test.ts.txt) reads the hover and press layers of each selection, with and without `error`, against the contracts ([reading](checks/layers.txt)).
  - [`disabled`](probes/disabled.spec.browser.test.ts.txt) repeats the unit's disabled comparison in the fixture theme and with distinct `on-error` and `on-primary`, at the head and under W2 ([reading](checks/disabled.txt)).
- **The sheet:** [`sheet`](probes/sheet.mjs.txt) renders the token sheet from `main`'s sources and from the head's ([reading](checks/sheet.txt)). [`tokens`](probes/tokens.mjs.txt) lists `md.comp.checkbox`'s error tokens and the tokens cited below from tproc's store ([reading](checks/tokens.txt)).
- **Not covered:** Safari, and format, lint and typecheck, which CI's `static` job passed. The baseline image was judged by looking at it, not by its pixels.

## The required property

- **The tokens.** The store has 24 tokens with an `error` part. 6 are deprecated, the `*.error.{hover,focus,pressed}.outline.width` ones, and 18 are live. Each live token selects `md.sys.color.error`, `md.sys.color.on-error` or a `md.sys.state.*` opacity. No token combines `error` with `disabled`, and none has a selection with a state layer. So the six error blocks carry every live value:
  - a focus layer;
  - the hover, focus and pressed state layers;
  - the unselected outline;
  - the selected container and icon.

  The per-state outline, container and icon tokens equal the error default and are deduplicated into it.

- **The existing blocks are unchanged.** Rendered with the default package alone, the head's sheet equals `main`'s apart from blank lines. With both packages, the only additions are the six error blocks, between the enabled states and the disabled ones. Each error selector carries `:state(error):not(:disabled)`. The selected one names both `:state(checked)` and `:state(indeterminate)`.
- **The rows.**
  - All pass unmutated in the three engines.
  - W4, no error package, fails 13 rows in each engine: the outline, the two container rows, the two icon rows, the three press rows, and five focus-layer rows.
  - M5 to M9 each fail the rows of the part they remove, in each engine:
    - M5, no `icon.color`: the two icon rows;
    - M6, no `state-layer.color`: 8;
    - M7, no `outline.color`: the outline row;
    - M8, no focus layer: 4;
    - M9, the selected error selector names only `:state(checked)`: the indeterminate container and icon rows.
- **The untouched states.** The `layers` probe reads the hover and press layers of an error checkbox in each selection, which no row reads for checked or indeterminate. All 18 cases equal `checkbox.error`'s `error.hover` or `error.pressed` color in each engine. The error selectors outrank the enabled states by specificity and come after them in the sheet.
- **Neighbours.**
  - Outside the checkbox, the unit adds one registry line, `'checkbox.error': checkbox.errorTokens`, to `visual-contracts.node.ts`.
  - It adds three cases to `focus-layer.spec`, and no existing case changes.
  - `checkbox/styles/utils.ts` has no importer outside `src/checkbox/`. `groupTokens` now returns no `null`, and its only callers are the checkbox's two packages.
  - No existing baseline changed: the branch's only image is `checkbox-error-chromium-linux.png`.
- **The baseline.** The 184 × 72 image shows, in the row's order:
  - an unselected checkbox with a red outline;
  - a checked one with a red container and a white check;
  - an indeterminate one with a red container and a white dash.

  CI's visual row passes against it.

- **The fixture theme isn't circular.** The icon rows put `--md-sys-color-on-error: rgb(1, 2, 3)` on the root.
  - The left side is the browser's computed `color` of the shadow `.icon`.
  - The right side is the contract's `icon.color` for `error.selected.default`, `var(--md-sys-color-on-error, #FFFFFF)`, resolved by `resolveComputed` in a probe under the same root.
  - So the comparison is computed-to-computed through a public variable, which the `test-visual-contract` skill prescribes. The generated `--_icon-color` is never read back.
  - The override is what makes the rows discriminate: in the fixture theme `on-error` and `on-primary` are both white. The implementer's reading records that the icon rows failed under W4 only once they set the override, and here M5 fails both of them.
- **Docs.** The JSDoc of `error` and `checkbox.mdx` say that the checkbox draws Material's error appearance, and that a disabled one draws its disabled appearance and keeps the state and the announcement. Both statements hold. The Playground story has an `error` control.

## The ruling's witness

The ruling names: _"with the error states rendered after the disabled ones, the row fails, in each engine."_ The ruling also leaves the mechanism to the implementer: _"the renderer's order, or a selector that excludes `:disabled`"_.

- **W1, the ruling's mutation, fails no row in any engine.** With the exclusion in place, no error declaration applies to a disabled checkbox, so the order no longer decides. So under one of the two mechanisms the ruling allows, the witness it names is a mutation that changes nothing (fp-1).
- **W2, the substitute, fails one row in each engine:** the unselected one. Without the exclusion, the order still keeps the checked and indeterminate disabled container. The `disabled` probe under W2 shows what is left:
  - a disabled checked or indeterminate checkbox with `error` draws the error icon color, `on-error`, instead of `on-primary`;
  - the unit's rows can't see it, because both colors are white in the fixture theme (fp-2).
- **W3, both mutations together, fails all three rows in each engine.**
- **My judgment.** The rows do witness the ruled property for each selection, through W3. W2 alone witnesses it for the unselected checkbox only. The leak that W2 leaves in the other two selections is real, and the rows are blind to it.

## Findings

### fp-1 — The ruling's witness changes nothing under a mechanism that the ruling allows. For the architect

- **Tier C.** The record. The implementation and its rows are correct.
- **Current behavior.** `RF-95`'s ruling names its witness as rendering the error states after the disabled ones, and it allows a selector that excludes `:disabled`. The unit uses that selector. Under it, W1 fails no row in Chromium, Firefox or WebKit. The implementer's note says so and substitutes W2, which fails only the unselected row.
- **Why it matters.** The ruling's witness is the check that the property is discriminated. As worded, it can't fail for one of the two mechanisms that the ruling admits. Nothing in the entry says which mutation stands for it instead. W3 is the mutation that fails each selection's row, and W2 alone doesn't.
- **Evidence.** [`checks/mutations.txt`](checks/mutations.txt): W1 0, W2 3 (1 per engine), W3 9 (3 per engine).
- **Required property.** The entry's witness for _disabled wins_ fails a row in each selection and each engine, whichever mechanism the implementation uses.

### fp-2 — The disabled-with-error rows can't see the error icon color

- **Tier B.** The code is correct at the head. The instrument that the ruling relies on passes when the property fails for two selections.
- **Current behavior.** _mx-checkbox disabled with error_ compares the container, the outline, the host's opacity and the icon color in the fixture theme. There, `on-error` and `on-primary` are both `#FFFFFF`. The rows of the error icon set a distinct `on-error` for that reason, and these rows don't.
- **Why it matters.** Under W2, a disabled checked or indeterminate checkbox with `error` draws the icon in `on-error`, and with `disabled` alone in `on-primary`. In Chromium, Firefox and WebKit, the `disabled` probe gives `differs: ["icon"]` with distinct colors and `differs: []` in the fixture theme. The unit's rows under W2 fail only the unselected selection. So a change that let the error icon color reach a disabled checkbox fails no row, although the ruled property, _"exactly what it draws with `disabled` alone"_, fails in any theme where the two colors differ.
- **Evidence.** [`checks/disabled.txt`](checks/disabled.txt) and [`checks/mutations.txt`](checks/mutations.txt) (W2).
- **Required property.** The disabled-with-error rows fail when any value that the error states set (container, outline or icon color) reaches a disabled checkbox, in each selection.
- **Closed 2026-11-27 by the implementer,** on `material-x/checkbox-error-1` after `2424da17a`, with no source change. The disabled-with-error rows now draw both checkboxes with `--md-sys-color-on-error` set to a color of its own, the same one that the error icon rows set, through one helper. Under W2, in Chromium, every selection's row fails: the unselected one by the outline, and the checked and indeterminate ones by the icon, `rgb(1, 2, 3)` against `rgb(255, 255, 255)`. W3 fails the same three rows, and the unmutated rows pass. Reading: [`../../checkbox-error-1/checks/disabled-icon.txt`](../../checkbox-error-1/checks/disabled-icon.txt). Firefox and WebKit are CI's, by `RD-62` property 1.

### fp-3 — The checkbox draws non-Material values in four states. Pre-existing

- **Tier A.** A consumer sees colors that Material's tokens don't give. The same cascade is on `main`: the head's default blocks equal `main`'s. The unit doesn't cause or change it, and it is outside `RF-95`.
- **Current behavior,** observed in Chromium, Firefox and WebKit:

  | State | Drawn | Material's token |
  | --- | --- | --- |
  | Checked or indeterminate, hovered | state layer `on-surface` (`rgb(25, 29, 19)`) | `selected.hover.state-layer.color` = `primary` (`rgb(62, 103, 0)`) |
  | Unselected, pressed | press wave `on-surface` | `unselected.pressed.state-layer.color` = `primary` |
  | Unselected, disabled | outline `on-surface-variant` (`rgb(66, 73, 55)`) at 0.38 | `unselected.disabled.outline.color` = `on-surface` |
  | Checked or indeterminate, disabled | icon `on-primary` | `selected.disabled.icon.color` = `surface` |

- **Why it happens,** by reading.
  - **The state layers.** The packages deduplicate a state against the states it extends. `selected.hover` doesn't extend `unselected.hover`, so its `primary` is dropped as inherited from the default. In CSS, though, `:host(:hover)` also matches a checked host and sets `on-surface`. Likewise, a press focuses the input, and `:host(:focus-within)` sets `on-surface` for an unselected checkbox whose pressed block was dropped.
  - **The disabled values.** `allowedTokensSelector` keeps neither `outline.color` nor `icon.color` for any state but the default.
- **Why it matters here.** The ruling's reason for _disabled wins_ is that _"Disabled has a complete set of its own"_ and _"Every drawn value stays a Material token"_. At the head, the disabled appearance that the ruling keeps isn't Material's in its outline or its icon. The ruled property itself holds, because it compares with disabled alone. Open `RF-88` (#142) registers that no contract covers the selected, pressed or disabled states. It doesn't register that what they draw is wrong.
- **Evidence.** [`checks/layers.txt`](checks/layers.txt) (the four `error false` mismatches), [`checks/disabled.txt`](checks/disabled.txt) (at the head: `outline: rgb(66, 73, 55)`, and `icon` equal to `on-primary`), [`checks/sheet.txt`](checks/sheet.txt) and [`checks/tokens.txt`](checks/tokens.txt).
- **Required property.** In each of these states, the checkbox draws the color that its Material token gives, in each engine at `RD-20`'s floor.

## Open issues

No open issue's description stops holding. The pull request closes #149 (`RF-95`). #142 (`RF-88`) still holds, because the unit adds only error rows. fp-3 is a candidate for that entry or for one of its own, and the architect decides.

## Next

The coordinator routes fp-1 to the architect, fp-2 to the implementer or the architect, as the owner directs, and fp-3 to the architect for registration. None of them blocks the merge of the error appearance. CI's `verify` passed on `00040d137`.
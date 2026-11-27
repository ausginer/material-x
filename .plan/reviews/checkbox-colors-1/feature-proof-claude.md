# PR #338, `RF-157`'s repair: feature proof

**Files were read at:** `7b392714d`, the head of `material-x/checkbox-colors-1` and of PR #338, detached in slot d. **Diff reviewed:** `2ed4b96ab..7b392714d`, all of it.

**Governing record:** `RF-157` in [`00-index.md`](../../00-index.md), with the implementer's note of 2026-11-27.

**Lens:** feature proof. Every claim comes from my own reading or from a run I made.

- **Runs:** in [`checks/`](checks/).
- **Scripts:** in [`probes/`](probes/): two probe files that I placed in `tests/checkbox/` while they ran, the mutation script and a token listing.
- **The base:** where a reading names it, it is the head with `2ed4b96ab`'s `src/checkbox/styles/utils.ts` and `styles/default/tokens.ts`. That is `main`'s sheet, since #328 merged at `2ed4b96ab`.
- **Restoring:** each edit was restored from `HEAD`. The probe files are removed, and `git status` is clean.

**Verdict:** the repair meets `RF-157`'s first clause.

- Each state that the table names draws its Material token's colour, in Chromium, Firefox and WebKit.
- `RF-95`'s rows pass, and the disabled error states draw the disabled appearance.
- The mechanism-removing mutations are killed in the three engines. The witness reproduces.

The second clause doesn't hold as written. That is `reviewer-1`, Tier A, introduced here: a keyboard activation of a checked or indeterminate checkbox now draws its press wave in `primary`, where `main` draws `on-surface`. `reviewer-2`, Tier A, is pre-existing: the unselected outline when hovered, focused or pressed isn't Material's. It doesn't block.

## Scope

- **Read:**
  - `createExtensions` and `defaultTokens`, before and after, and the compiled sheet ([head](checks/sheet-head.css.txt), and the implementer's [diff](../../checkbox-colors-1/checks/sheet.diff)).
  - tproc's `resolveInheritance`, which deduplicates.
  - The rows and the bridge, `resolveTokenContract` → `TokenPackage.effective`.
  - The ripple's `click` handler. Every `outline.color` and `icon.color` token in `md.comp.checkbox` ([tokens](checks/tokens.txt)).
- **Ran:**
  - The spec file unmutated in the three engines.
  - The implementer's witness.
  - Ten mutations in Chromium, three of them again in Firefox and WebKit.
  - A [state matrix](checks/matrix.txt) of 48 states in Chromium, at the head, at the base and under the widened selector.
  - A [keyboard probe](checks/keyboard.txt) in the three engines, at the head and at the base.
- **Not read:**
  - The radio.
  - The visual images themselves: CI's failing rows name the two images. The matrix reads what changed.
  - Touch.
  - #339's opacity, which the brief excludes.

## The claims

### The state layers

**Hold.**

- **The graph:** `createExtensions` gives each selected state the unselected state of its interaction as its last parent, and gives `unselected.pressed` the parents `unselected.hover` and `unselected.focus`.
- **The sheet** gains `:host(:active)` with `primary`. It gains `primary` for `:host(:state(checked|indeterminate):hover)` and `…:focus-within`, and loses checked hover's `0.08`, which `:host(:hover)` already sets.
- **What is drawn,** with real input in Chromium ([matrix](checks/matrix.txt)): the hover layer of a hovered checked or indeterminate checkbox, and the press wave of a pressed unselected one, are `rgb(62, 103, 0)`, `primary`. At the base they are `on-surface`. A pressed checked checkbox still draws `on-surface`, which is `selected.pressed.state-layer.color`.

### The disabled colours

**Hold, and the by-name append is right.**

- **The two tokens:** `defaultTokens` appends `unselected.disabled.outline.color` (`on-surface`) and `selected.disabled.icon.color` (`surface`).
- **Drawn:** a disabled unselected checkbox draws `rgb(25, 29, 19)`, and a disabled checked or indeterminate one draws `rgb(247, 251, 234)`. The same holds with `error` set.
- **Against the deprecated tokens** ([tokens](checks/tokens.txt)):
  - `disabled.selected.icon.color` and `disabled.unselected.icon.color`, both `primary`, group to `selected.disabled` and `unselected.disabled`. These are the paths of the two current tokens, as the note says.
  - The deprecated `unselected.{default,hover,focus,pressed}.icon.color` group to the unselected states as well.
- **The widening that the note rejects** (`widen`, in the matrix) adds `outline.color` and `icon.color` to `allowedTokensSelector`, with no appends.
  - The disabled icon still draws `surface`.
  - The deprecated `unselected.icon.color` recolours the unselected icon, and the spec row _"should render the tokenized icon color"_ fails.
  - The unselected outline changes when hovered, focused and pressed. That is outside `RF-157`'s table, and it is `reviewer-2`.
  - So the by-name append is what keeps the states that the table doesn't name unchanged.

### The sheet and every other state

**The changes are only those above, except `reviewer-1`.**

- **The matrix** reads three selections × error × enabled (rest, hover, focus, hover and focus, pointer press, held Space) or disabled (rest, hover). For each state it reads the drawn outline, container, icon, host opacity, hover layer and press wave, and every `--_*` property.
- **The diff from the base** lists exactly the states above. The disabled error states change with the disabled ones. Every error state that isn't disabled is identical, so the error blocks don't change. That matches the sheet.
- **One more change:** checked and indeterminate under `:focus-within` alone now hold `--_state-layer-color: primary`. That is what `reviewer-1` is about.

### Rows and witness

**Hold.**

- **The new rows:** six, in `checkbox.spec.browser.test.ts`. The file passes 23 of 23 unmutated in Chromium, Firefox and WebKit.
- **The witness, rerun** ([mutations](checks/mutations.txt), end): `witness.sh 2ed4b96ab` fails the six rows on the drawn colour, with the implementer's values, and passes the other 17.
- **The disabled rows aren't circular,** although their oracle is `TokenPackage.effective` of the package under test. With an append removed, `effective` has no such token for the disabled state, and the bridge throws _"Missing token "outline.color" in state "unselected.disabled""_.

### Baselines

**Hold.** In `verify`, only the visual rows of `checkbox-disabled.png` and `checkbox-hovered.png` fail. The states, error and focused images pass. The other engines have no visual project.

## Mutations

All of these are mine. The implementer's record lists none besides its witness.

| Id | Mutation | Engines | Result |
| --- | --- | --- | --- |
| `ext-base` | `createExtensions` as at `2ed4b96ab` (removes the state-layer mechanism) | Chromium, Firefox, WebKit | **Killed** in each: the two hover rows and the press row |
| `sel-hover-no-uhover` | `selected.hover` without `unselected.hover` | Chromium | **Killed:** the two hover rows |
| `upressed-no-parents` | `unselected.pressed` without either new parent | Chromium | **Killed:** the press row |
| `upressed-no-hover` | without `unselected.hover` only | Chromium | Survives, **equivalent:** the sheet is identical |
| `upressed-no-focus` | without `unselected.focus` only | Chromium | Survives. The sheet adds `--_state-layer-opacity: 0.1` to `:host(:active)`, #339's value, which no row reads. See Observations |
| `sel-focus-no-ufocus` | `selected.focus` without `unselected.focus` | Chromium | Survives. The sheet drops `:focus-within` from the checked `primary` block. That removes exactly `reviewer-1`'s change, which no row covers |
| `sel-pressed-no-upressed` | `selected.pressed` without `unselected.pressed` | Chromium | Survives, **equivalent:** the sheet is identical |
| `no-outline-append` | `unselected.disabled`'s append removed (removes the outline's mechanism) | Chromium, Firefox, WebKit | **Killed** in each: the outline row |
| `no-icon-append` | `selected.disabled`'s append removed (removes the icon's mechanism) | Chromium, Firefox, WebKit | **Killed** in each: the two icon rows |
| `widen` | both appends removed, with `outline.color` and `icon.color` in `allowedTokensSelector` | Chromium | **Killed:** _"should render the tokenized icon color"_. The matrix reads it, as above |

- **Repeated in the three engines** (`repo:RD-62`): the mutations that remove each required property's mechanism, `ext-base` and the two append mutations. They are killed by the same rows in each engine.
- **The two equivalent ones** compile to the same sheet.
- **The two that change the sheet and survive** are outside the rows. One is #339's opacity. The other is `reviewer-1`.

## CI

`verify` run [46060500126](https://github.com/ausginer/material-x/actions/runs/46060500126), `pull_request`, on `7b392714da4c1832899337c0008db1215202dd2a`: **failure**, from the `chromium` job's visual project only ([lines](checks/ci.txt)).

| Job | Files | Rows | Checkbox files |
| --- | --- | --- | --- |
| `chromium` | 1 failed, 192 passed | 2 failed, 5577 passed, 2 expected fail, 12 skipped | `browser` 15 of 15, `spec` 23 of 23, `visual` 3 of 5: _disabled state matrix_ and _hovered checkbox_ fail |
| `firefox` | 137 passed, 1 skipped | 4400, 3 expected fail, 203 skipped | `browser` 15 of 15, `spec` 23 of 23 |
| `webkit` | 137 passed, 1 skipped | 4401, 2 expected fail, 203 skipped | `browser` 15 of 15, `spec` 23 of 23 |

- `static`, `docs` and `measurements` passed.
- The two failures are the images the note names, so they wait for `record-baselines` by `RD-13`.
- No pass in any engine is missing.

## Findings

| Id | Tier | Blocks | Owner | Claim |
| --- | --- | --- | --- | --- |
| reviewer-1 | A | yes, as the entry is written | architect, to rule | A keyboard activation of a checked or indeterminate checkbox now draws its press wave in `primary`. `main` draws `on-surface`, which is `selected.pressed`'s token. |
| reviewer-2 | A, pre-existing | no | architect, to register | The unselected outline when hovered, focused or pressed draws `on-surface-variant`. Material's current tokens give `on-surface`. |

### reviewer-1 — a keyboard activation's press wave changes colour on a checked checkbox

- **Observed** ([keyboard](checks/keyboard.txt)): Space on a focused checkbox runs the press wave, the ripple's `::after`, from its `click` handler, the _"keyboard synthesized click event"_ path.
  - The host never matches `:active`, so the wave takes the colour of `:focus-within`.
  - In Chromium, Firefox and WebKit alike, a checked or indeterminate checkbox draws `rgb(62, 103, 0)` (`primary`) at 0.1, fading out. At the base it draws `rgb(25, 29, 19)` (`on-surface`).
  - An unselected one draws `on-surface` at both.
- **The cause, by reading:** `selected.focus` now extends `unselected.focus`, so its `primary` (`selected.focus.state-layer.color`) is no longer deduplicated. The sheet joins `:host(:state(checked|indeterminate):focus-within)` to the `primary` block. `sel-focus-no-ufocus` restores the base's wave and fails no row.
- **What it contradicts:**
  - **`RF-157`'s required property:** _"The states that the table doesn't name draw what they draw at `93f5e44d6`."_ The table names unselected pressed and checked hovered, not a checked keyboard activation.
  - **The implementer's note:** _"a checked focused host draws a new colour only when it is also hovered"_.
- **Why it matters:** a keyboard user who toggles a checked checkbox sees a `primary` wave, where Material's pressed token for a selected checkbox is `on-surface`.
  - For an unselected checkbox, the keyboard wave stays `on-surface`, and `unselected.pressed`'s token is `primary`.
  - So `RF-157`'s _"Unselected, pressed"_ row holds for a pointer press only.
- **Why it is routed:** whether a keyboard activation is the table's _pressed_ state is the architect's call. If it is, both selections draw the wrong token, and the property needs a keyboard row. If it is a focus state, `primary` is Material's `selected.focus` token, and the entry's second clause needs the exception.
- **Tier:** A. A consumer sees a different colour at runtime, in each engine.
- **Required property:** the press wave of a keyboard activation draws the colour that the architect's ruling names, in each selection and engine. Until there is a ruling, it draws what it draws at the base.

### reviewer-2 — the unselected outline when hovered, focused or pressed isn't Material's

- **Observed** (the matrix): an unselected checkbox draws `rgb(66, 73, 55)` (`on-surface-variant`) for its outline at rest, hovered, focused and pressed, at the head and at the base.
- **Material's tokens** ([tokens](checks/tokens.txt)): `unselected.hover.outline.color`, `unselected.focus.outline.color` and `unselected.pressed.outline.color` are current, not deprecated, and each is `on-surface`. `unselected.outline.color` is `on-surface-variant`.
- **The cause, by reading:** `allowedTokensSelector` has no `outline.color`, so only `default` sets the outline, from `specialTokens`' `unselected.outline.color`. The error states take theirs through `errorAllowedTokensSelector`, so an unselected error checkbox does follow its tokens.
- **Why it isn't this unit's:** `RF-157`'s table doesn't name these states, its second clause keeps them, and the entry lists _"States other than those that the proof probed"_ as not read. Under `widen`, the outline moves toward `on-surface` in these states (the matrix reads it mid-transition).
- **Tier:** A by consequence. A consumer sees a colour that no Material token gives for the state. It is pre-existing and doesn't block #338.
- **Required property, if registered:** an unselected checkbox's outline draws `unselected.{hover,focus,pressed}.outline.color` in those states, in each engine. Every other state stays unchanged.

## Observations

- **The deduplication doesn't model the cascade for a state with several parents.**
  - `resolveInheritance` merges the parents' _effective_ token sets in order. A later parent's effective set re-asserts its own inherited values over an earlier parent's own.
  - `unselected.pressed`'s parents are `…, unselected.hover, unselected.focus`.
    - The model's inherited opacity is `unselected.focus`'s effective `0.1`, so pressed's `0.1` is dropped.
    - In CSS, `:host(:hover)` declares `0.08`, and `:host(:focus-within)` declares no opacity. So a pointer press draws `0.08`.
  - That is #339's cause. `upressed-no-focus` shows it: without that parent, the sheet keeps `0.1` on `:host(:active)`.
  - No other state is affected at the head. The matrix finds no change outside the named states and `reviewer-1`.
  - A child's value is dropped wrongly only when it equals the model's inherited value and differs from the cascade's. So the gap matters to the next change of the graph, and to #339's repair.
- **A held Space gave the host no `:active`** in Chromium's matrix (`space`). So the CSS _pressed_ state is pointer-only there. That is why `reviewer-1` reads the focus colour.

## Queue

- **No open issue's description stops holding because of this record.**
- `reviewer-1` waits on the architect's ruling under `RF-157`, and #331 closes with #338 once that ruling is met.
- `reviewer-2`, if registered, is a new item.
- #339 is unchanged. The first observation is input for it.
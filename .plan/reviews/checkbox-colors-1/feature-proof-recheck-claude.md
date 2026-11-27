# PR #338, `RF-157` after the keyboard-pressed ruling: recheck

**Files were read at:** `2642a3baf`, the head of `material-x/checkbox-colors-1` and of PR #338, detached in slot d. **Diff reviewed:** `75241dece..2642a3baf`, the remediation, all of it. `92d96f9e2` is the ruling and `75241dece` the merge of `origin/main` at `ceb2c12a3`, which touches no checkbox or ripple file.

**Governing record:**

- `RF-157` in [`00-index.md`](../../00-index.md): the architect's ruling dated 2026-11-27, read at `29f5597d6`, and the implementer's note dated 2026-11-27 after it.
- The [feature proof](feature-proof-claude.md) at `7b392714d`, whose `reviewer-1` and `reviewer-2` the ruling decides.

**Lens:** recheck of what the remediation changed. Every claim comes from my own reading or from a run I made.

- **Runs:** in [`checks/recheck/`](checks/recheck/).
- **Scripts:** in [`probes/recheck/`](probes/recheck/). The two probe files sat in `packages/material-x/tests/checkbox/` while they ran.
- **Readings named `29f5597d6` or `origin/main`:** the head with that commit's `src/checkbox/styles/utils.ts`, `styles/default/tokens.ts` and `styles/default/main.styles.css`. `origin/main` is `bec75d638`, whose checkbox styles and ripple are `2ed4b96ab`'s.
- **Restoring:** every edit was restored from `HEAD`. The probe files are removed, and `git status` is clean apart from this record.

**Verdict:** the ruling's clauses hold in Chromium, Firefox and WebKit, in my probes.

- **The press wave** draws its selection's pressed colour at `0.1`, for Space and for a hovered pointer press. With `error`, it draws `error`.
- **The unselected outline** draws `on-surface` when hovered, focused and pressed.
- **Nothing else drawn changes** in the 48-state matrix, except what the ruling accepts.
- **The rows and the witness** pass and fail as the implementer says.

`reviewer-1` and `reviewer-2` are resolved. There are two new findings:

- `reviewer-3`, Tier B: the three outline rows can't fail when the outline's mechanism is removed. Their oracle is the token package that carries the mechanism.
- `reviewer-4`, Tier C: the PR's title and description say slightly less, and in one place more, than the unit does.

**CI hasn't run on the head:** the PR conflicts with `main`, so there is no `verify` run. The Firefox and WebKit pass that CI owes is pending, and nothing is accepted until it passes on the reviewed head.

## Scope

- **Read:**
  - The remediation's diff of `tokens.ts`, `main.styles.css`, the spec file and `witness.sh`.
  - The compiled sheet at the head ([sheet](checks/recheck/sheet-head.css.txt)), at `29f5597d6` and at `origin/main`.
  - The ripple's animations in `src/core/animations/ripple/ripple.ts` and its stylesheet.
  - The bridge, `resolveTokenContract` → `TokenPackage.effective` of `checkbox.defaultTokens`, and the checkbox's visual tests.
- **Ran:**
  - The three affected files unmutated in Chromium.
  - The implementer's witness.
  - 13 mutations in Chromium, 7 of them again in Firefox and WebKit.
  - The [matrix](checks/recheck/matrix.txt) in Chromium, at the head, at `29f5597d6`, at `origin/main` and under three mutations.
  - A [press-wave probe](checks/recheck/wave.txt) in the three engines at the head, and in Chromium at `29f5597d6` and `origin/main`.
  - The [oracle](checks/recheck/oracle.txt) and the [tokens](checks/recheck/tokens.txt) in Node.
- **Not read:**
  - Touch.
  - The images, which are CI's.
  - The focus ring as drawn: the sheet diff doesn't touch `.indicator`.
  - The radio, which is `RF-158`.
  - The outline of a hovered host that isn't focused, in Firefox and WebKit. CI's run of the outline rows covers it, because at the head their oracle is `on-surface`.

## The ruling

### A keyboard activation is the pressed state

**Holds in the three engines** ([wave](checks/recheck/wave.txt)). Space on a focused checkbox draws the wave as follows:

- unselected: `rgb(62, 103, 0)`, `primary`;
- checked and indeterminate: `rgb(25, 29, 19)`, `on-surface`.

It draws each at `0.100` until the fade, and the fade runs. The host matches `:focus-within` and never `:active`.

At `29f5597d6` the colours are the other way round, and at `origin/main` every selection draws `on-surface`. That is the table's _"Drawn at"_ column.

### The pointer press's opacity, hovered

**Holds in the three engines.** A press at the centre is `:hover :focus-within :active`. In each selection it draws its pressed colour at `0.100` while it is held and after the release, until the fade. At `29f5597d6` the reading is `0.08` (the matrix, `press`).

### Error follows `error.pressed.*`

**Holds, as the implementer says, in the three engines.**

- In each selection with `error`, Space, a hovered press and a press that moves out all draw `rgb(186, 26, 26)` at `0.100` ([wave](checks/recheck/wave.txt)).
- The tokens: `error.pressed.state-layer.color` is `md.sys.color.error`, and the opacity is `md.sys.state.pressed.state-layer-opacity`, which renders `0.1` ([tokens](checks/recheck/tokens.txt)).
- `error.default` carries the values, under `:host(:state(error):not(:disabled))`. That selector is more specific than the selected block, so a checked error host takes `error`.
- **"Which the head already draws":** at `origin/main`, an error wave under Space or a press is `error` at `0.1` as well. `no-error-press` is killed in each engine by `RF-95`'s three error press rows.

### The selection while the wave draws

**Holds in the three engines.** A consumer can toggle the selection on `change` (`space-toggle`). The wave then draws the new selection's colour from the first sampled frame: unselected to checked draws `on-surface`, and checked or indeterminate to unselected draws `primary`.

### The unselected outline

**Holds.**

- In Chromium's matrix, the outline is `rgb(25, 29, 19)` when hovered, focused, both, pressed and Space-focused. It is `rgb(66, 73, 55)` at `29f5597d6` and at `origin/main`.
- In the three engines, a press that is held draws `on-surface`, and so does one moved outside the host while held, which stays `:focus-within :active` (`press-out`).
- The tokens give `on-surface` for all three states, and `on-surface-variant` at rest.
- **A checked or indeterminate outline** stays `primary` in each of those states. The error outline stays `error`.

### The mechanism, as the note states it

**Holds by reading and in the sheet.**

- **The diff:** only `tokens.ts` and `main.styles.css` change in `src`. `utils.ts`, the ripple and its `::before` are unchanged.
- **The sheet:** the head's sheet differs from `29f5597d6`'s exactly as [`press-wave-sheet.diff`](../../checkbox-colors-1/checks/press-wave-sheet.diff) shows, apart from the file names in its header.
- **The pressed outline:** `unselected.pressed`'s `outline.color` is deduplicated against its parents, and `no-upressed-outline` compiles to the same sheet.

## Every other state

**Unchanged, except what the ruling accepts** ([matrix](checks/recheck/matrix.txt)). The matrix reads 48 states: three selections, with and without `error`, either enabled (rest, hover, focus, hover and focus, pointer press, held Space) or disabled (rest, hover).

- **`29f5597d6` → head:**
  - The drawn outline changes only in the five unselected states above.
  - The wave's computed values change in every state. The wave has a width only while an activation runs, and a disabled host shows no ripple, so that is what the wave probe reads.
  - The hover layer, container, icon and host opacity don't change in any state.
- **`origin/main` → head:**
  - The drawn changes are those of the two implementer notes: the checked and indeterminate hover layer, the disabled outline and icon, and the unselected outline.
  - The one other change is the hover layer of a pressed unselected host, from `on-surface` to `primary` at `0.08`. The ruling's property 4 accepts it.
- **The first proof's `reviewer-1`** is gone. Checked and indeterminate still set `--_state-layer-color: primary` under `:focus-within`, but the wave no longer reads it, and nothing that is drawn does (`sel-focus-no-ufocus`, below).
- **This matrix finishes the host's own animations** before it reads, as the outline rows do. The first proof's matrix didn't, so its outline readings of a hovered state could be mid-transition. The states that matter here read the same at both bases.

## Rows, witness and baselines

- **Unmutated** ([run](checks/recheck/unmutated.txt)): the spec, browser and ripple files pass, 76 of 76, in Chromium. The spec file has 31 rows.
- **The witness, rerun** ([witness](checks/recheck/witness.txt)): `witness.sh 29f5597d6` fails exactly the eight new rows, and 23 pass.
  - The Space rows fail on the colour, with `on-surface` for `primary` when unselected and `primary` for `on-surface` when selected.
  - The pointer rows fail on `0.08` for `0.1`.
  - The outline rows fail on `rgb(66, 73, 55)` for `rgb(25, 29, 19)`.
- **The Space rows' timing margin:** a row reads the wave as soon as the keyboard command returns. The fade starts 14 to 16 frames after that in each engine, about 230 ms, because `MINIMUM_PRESS_MS` is 225.
- **Baselines, by reading `checkbox.visual.browser.test.ts`:**
  - `checkbox-focused.png` is an unselected checkbox focused by Tab, so its outline changes.
  - `checkbox-hovered.png` is a hovered checked one, which changes by its hover layer and not by its outline.
  - `checkbox-states.png` and `checkbox-error.png` are at rest, and the matrix reads no change at rest.
  - No other visual test renders `mx-checkbox`.
  - So the note's list is consistent. The images themselves wait for CI.

## Mutations

All of these are mine ([mutations](checks/recheck/mutations.txt)). The implementer's record lists none besides its witness, so none is read from it.

| Id | Mutation | Engines | Result |
| --- | --- | --- | --- |
| `no-press-rule` | the `:host .ripple::after` rule removed (removes the wave's mechanism) | Chromium, Firefox, WebKit | **Killed** in each: the three Space rows and the two pointer rows |
| `no-press-color` | its `background-color` removed | Chromium | **Killed:** the three Space rows |
| `no-press-opacity` | its `opacity` removed | Chromium | **Killed:** the two pointer rows |
| `no-unselected-press` | `unselected.default`'s two `press-layer` appends removed | Chromium | **Killed:** the first note's press row, the unselected Space row and the unselected pointer row |
| `no-selected-press` | `selected.default`'s removed | Chromium | **Killed:** the checked and indeterminate Space rows |
| `no-error-press` | `error.default`'s removed (removes the error wave's mechanism) | Chromium, Firefox, WebKit | **Killed** in each: `RF-95`'s three error press rows |
| `no-uhover-outline` | `unselected.hover`'s `outline.color` append removed | Chromium, Firefox, WebKit | **Survives** in each. `reviewer-3` |
| `no-ufocus-outline` | `unselected.focus`'s removed | Chromium, Firefox, WebKit | **Survives** in each. `reviewer-3` |
| `no-upressed-outline` | `unselected.pressed`'s removed | Chromium | Survives, **equivalent:** the sheet is identical, so each engine's run is the unmutated one |
| `no-outline-appends` | all three removed (removes the outline's mechanism) | Chromium, Firefox, WebKit | **Survives** in each. The matrix reads the outline back at `on-surface-variant` in all five states. `reviewer-3` |
| `upressed-no-parents` | `unselected.pressed` without `unselected.hover` and `unselected.focus` | Chromium, Firefox, WebKit | **Survives** in each. It changes only the pressed host's hover layer. See Observations |
| `sel-focus-no-ufocus` | `selected.focus` without `unselected.focus` | Chromium, Firefox, WebKit | **Survives** in each. It changes nothing drawn in the matrix. See Observations |
| `ext-base` | `createExtensions` as at `2ed4b96ab` | Chromium | **Killed:** the two hover rows. The first note's press row no longer fails, because the wave doesn't read the graph |

- **Repeated in the three engines** (`repo:RD-62`):
  - the mutations that remove a mechanism: `no-press-rule`, `no-error-press` and `no-outline-appends`;
  - the survivors, apart from the equivalent one.
  - Each mutation gives the same result in each engine.
- **Chromium only:** the partial wave mutations, `no-upressed-outline` and `ext-base`.
- **Not run:** the first proof's `sel-hover-no-uhover`. Its exact-once edit matches twice in `utils.ts`, which doesn't change here, and `ext-base` covers it.

## CI

**No `verify` run on `2642a3baf`** ([reading](checks/recheck/ci.txt)).

- **No check runs:** the commit has none, and the newest run on the branch is 46064268341, on `92d96f9e2`.
- **The pull request:** GitHub reports `mergeable: false`, `mergeable_state: dirty`.
- **The conflict:** `git merge-tree` of the head with `bec75d638`, and with `origin/main` (`aca446b94`), conflicts in `.plan/00-index.md`.
  - The `main` side is #332's change to `RF-156`, the entry just before `RF-157`: its closed status and its implementer note.
  - #332 merged at 20:43:13, and the head was pushed at 20:44.
- **Why there is no run:** GitHub starts no `pull_request` run while the branch conflicts.
- **What waits on it:** the rule reads the run on the reviewed head, and the head changes source, so no earlier run stands in. The Firefox and WebKit verdict, and the visual job's three expected failures, wait for a run after the conflict is resolved. That is the implementer's, and it changes only records.

## Findings

| Id | Tier | Blocks | Owner | Claim |
| --- | --- | --- | --- | --- |
| reviewer-3 | B | not the behaviour; the outline rows don't prove it until ruled | architect, to rule | The three unselected outline rows can't fail when the outline's mechanism is removed, in any engine. Their oracle comes from the same token package as the mechanism. |
| reviewer-4 | C | no | implementer | The PR's title says _"colours"_ where the unit also repairs an opacity. Its description says _"Every other state draws what it drew before"_, and against `main` the hover layer of a pressed unselected host changes. |

### reviewer-3 — the outline rows' oracle follows the outline's mechanism

- **Observed:**
  - `no-outline-appends` removes `defaultTokens`' three by-name `outline.color` appends, and with them the sheet's `--_outline-color` under `:host(:hover)` and `:host(:focus-within)`.
  - The matrix then reads the outline as `rgb(66, 73, 55)`, `on-surface-variant`, in every unselected hovered, focused and pressed state.
  - The spec file still passes 31 of 31 in Chromium, Firefox and WebKit. `no-uhover-outline` and `no-ufocus-outline` survive the same way.
- **The cause, by reading and in Node** ([oracle](checks/recheck/oracle.txt)):
  - The rows compare with `color(state, 'outline.color')`. That is `resolveTokenContract` → `checkbox.defaultTokens.value.effective(state)`, the package under test.
  - With the appends removed, `effective('unselected.hover' | 'unselected.focus' | 'unselected.pressed')['outline.color']` is the inherited `on-surface-variant`. So the oracle moves with the drawn colour.
- **Why the witness doesn't show it:** `witness.sh` pairs `29f5597d6`'s sheet with the head's token package as the oracle. A regression of the package itself moves both sides.
- **How the other rows differ:**
  - The hover-layer and wave rows compare with Material's own `state-layer.*` tokens, which the mechanisms don't author, and their mutations are killed.
  - The first note's disabled outline row is protected from the same kind of removal only by accident: there, the bridge throws for a token missing from `unselected.disabled`.
- **What it contradicts:**
  - `repo:RD-62`'s mutation set: the mutation that removes a required property's mechanism, here the ruling's outline row, is caught by no row in any engine.
  - The ruling asks for the outline rows _"each against its token's contract"_. The token is `unselected.{hover,focus,pressed}.outline.color`, and what the rows read is the package's effective state, which contains that token only while the append that the property needs is present.
- **Why it is routed:** the visual-contract skill sets the oracle at `resolveTokenContract` → `effective`, and says that raw store values aren't an independent oracle. For a value that the package names by hand, those two rules leave no oracle independent of the mechanism. Which oracle a row uses there is a rule for the architect, not a choice in this file.
- **Tier:** B. The head draws the right colour in each engine. The instrument that the property relies on can't detect its loss.
- **Required property:** for each of the three states, a row fails when the package stops drawing `unselected.{hover,focus,pressed}.outline.color`, in each engine.

### reviewer-4 — the PR's title and description

- **The title** is _"mx-checkbox draws Material's colours in its hover layer, press wave, outline and disabled icon"_. The unit also changes the press wave's opacity, which the ruling added. `RF-157`'s heading on the branch says _"values"_.
- **The description** says _"Every other state draws what it drew before."_ The matrix, `origin/main` → head, reads the hover layer of a pressed unselected host changed from `on-surface` to `primary` at `0.08`.
  - The ruling's property 4 accepts that change.
  - The implementer's note states it correctly, against `29f5597d6`.
  - The description compares with `main`, so the sentence is wrong there.
- **The rest matches:**
  - `RF-157`'s status sentence: _"#338 implements the implementer's two notes, the second for the architect's ruling of the same day"_.
  - `Closes #331`.
  - The description's mechanism, rows, witness and baselines.
- **Tier:** C. No consumer behaviour depends on it. It is what the owner reads to merge.
- **Required property:** the title and the description describe what the unit changes, against `main`.

## Observations

- **Two of the first note's graph parents no longer carry a property that the ruling names.**
  - `upressed-no-parents` changes only the hover layer of a pressed unselected host, back to `main`'s `on-surface`, and property 4 allows either.
  - `sel-focus-no-ufocus` changes nothing drawn in the matrix.
  - The first note's row _"should color the press ripple with the unselected pressed state layer"_ now reads the wave's `press-layer` values, so `ext-base` no longer fails it. `selected.hover` ← `unselected.hover` is still required, and `ext-base` fails the hover rows.
  - This is input for a cleanup or DER pass, not a defect against the ruling.
- **`no-upressed-outline` is equivalent:** a pressed host's `on-surface` outline comes from `:host(:hover)` or `:host(:focus-within)`.
  - In each engine, a pointer press focuses the input, so a press moved outside the host keeps the outline.
  - A press that neither hovers nor focuses, such as touch, isn't read.

## Queue

- **`reviewer-3` waits on the architect.** It doesn't change `RF-157`'s required behaviour, which holds.
- **`reviewer-4` and the conflict** are the implementer's. Once the conflict is resolved, `verify` on the new head is the gate.
- **#331** closes with #338.
- **No open issue's description stops holding because of this record.**
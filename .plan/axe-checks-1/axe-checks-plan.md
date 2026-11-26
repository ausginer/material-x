# axe-core checks over material-x's elements — plan

**For `repo:RD-57` (#239).** Planned on 2026-11-25 by the architect, on the coordinator's task, on `repo/axe-checks-1` from `main` at `8bed561de`. The owner approved the dependency (`RD-57`). **Status: accepted, ready for an implementer. No question is the owner's.** `RD-57`'s properties 1 to 4 stand. Labels `AX-…` are local to this plan.

## The answer in short

- One file, `packages/material-x/tests/axe.browser.test.ts`, in the existing `browser` project. It runs in Chromium only, and its cost there is about 6.5 s locally.
- `axe-core` 4.14.1, exact, in material-x's `devDependencies`.
- A row for each element and state. Its expected violations are exactly the listed ones, so a new violation and a repaired one both fail.
- The list starts with three owners: `RF-94`, `RF-132` and `RF-144`, which this plan's readings found.

## Readings

On `main` at `8bed561de`, 73 fixtures, one at a time, the same in Chromium, Firefox and WebKit ([results](checks/elements.txt), [probe](probes/elements.browser.test.ts.txt)). Eight of the fixtures are invalid on purpose, to see what axe answers.

| What axe reports | Where | Owner |
| --- | --- | --- |
| `label` | `mx-checkbox` and `mx-radio`, in each state, with a host `aria-label` or a `<label for>` (read for the checkbox) | `RF-94` (#148) |
| `aria-allowed-attr` | a selected `mx-list-button-item`, and one that was selected and no longer is. `RF-132` says nothing of the second | `RF-132` |
| `nested-interactive` | a control in a slot of `mx-list-button-item` | `RF-144`, registered here |
| `label-content-name-mismatch` | the split button's trailing button, with `secondarylabel` | none: an artifact of the test font ([reading](checks/glyph-and-internals.txt)) |

**The artifact:** the vendored icon subset has no `keyboard_arrow_down`, so the icon renders its ligature name as text. With the glyph loaded, the violation is gone. The same applies to a fixture that names any icon outside the subset, so the page-side icons of the fixtures are `check`.

**`RF-130`, `RF-131`, `RF-136` and `RF-138`,** which are on `main`: no violation is left on what they changed, with `secondarylabel` given. `RF-121` isn't on `main`. axe leaves out what isn't rendered, so its repair has no line here.

**What axe doesn't report, read:** a duplicate name on a host (`RF-94`'s second node), a control nested in `mx-list-link-item`, an empty list, a list with a `div`, or an item outside a list. It answers nothing about the roles that a host has through `ElementInternals` either, also when they are given to it. The rows that assert those stay, as property 1 says.

**`incomplete`,** what axe can't decide, isn't asserted. Without `color-contrast` it was `aria-allowed-attr` on an inner host and `label-content-name-mismatch` on a one-character name, and neither says that something is wrong.

## Decisions

- **`AX-1`, the dependency.** `"axe-core": "4.14.1"` in `packages/material-x/package.json`, `devDependencies`, as with `@fontsource/roboto`: the package whose tests import it. The lockfile gains that one package, MPL-2.0, with no dependencies, published on 2026-11-16, so older than the 7-day minimum. eslint's own 4.11.1 stays nested. After the `aube add`, the workspace links are gone (`RF-48`): `aube install --frozen-lockfile --force` restores them.
- **`AX-2`, where it runs.** In the `browser` project of material-x, in Chromium only. The other engines skip the file without importing axe or the elements, so `MX_TEST_ENGINES` and Safari cost nothing. The readings give no difference between engines, at `eddf39e7b` and now. A new project would cost another browser start.
- **`AX-3`, axe is pre-bundled.** `axe-core` is in the project's `optimizeDeps.include`. Without it, the first run on a cold cache, which every CI run is, reloads the page: Firefox and WebKit then failed to run the file ([reading](checks/time-and-cold-start.txt)). With it, no reload in the three engines.
- **`AX-4`, the rules.** axe's defaults, minus `color-contrast`. Contrast is Material's palette and the page's theme, and not the element's semantics, and axe leaves most of it undecided here. Each run is limited to the row's own fixture, which leaves out the page-level rules (`region`, `page-has-heading-one`).
- **`AX-5`, one fixture per row.** So that axe's target selector doesn't depend on another fixture, and a failure names its state.
- **`AX-6`, the split button's icon.** A one-glyph file with `keyboard_arrow_down`, made as `fonts/README.md` describes and named there, is loaded by this file only. The shared subset isn't regenerated, because its outlines may differ from the vendored ones, and other tests and baselines render from it. Disabling the rule was the alternative: it would stop checking a real one, a label that doesn't contain the visible text.

## Required properties

1. **Coverage.** Each tag that a runtime entry of `files.json` defines has at least one row. A new element without one fails.
2. **States.** The rows are at least those of the probe, without its invalid fixtures (the unnamed secondary, `div` in a list, orphan item and empty list) and its four witnesses. They include a deselected `mx-list-button-item`, a handle and a trailing control in a button item, and `mx-checkbox` with a `<label for>`. Every icon the fixtures name is `check`, or the split button's own.
3. **Exactness.** The rule id and target of each row's violations equal those that the list gives for that row, both ways. The list entry has the owner's address as data, and the failure message shows it. An empty list is the normal case.
4. **The engine ran.** Each row also asserts that axe applied at least one rule to the fixture. The elements with no applicable rule (`mx-icon`, `mx-card`, `mx-list` with static items) are marked as such, and a mark that isn't true fails. One standing row checks an unnamed `mx-icon-button` and expects `button-name` on the inner button, inside the shadow tree.
5. **Nothing in `src` imports axe,** and no published file names it.
6. **Cost.** The file adds at most 10 s to a Chromium run here, over a file that imports axe and every element and has one row. Read: 3.5 s for that file and 10 s with 73 rows, so about 6.5 s. axe itself is 0.7 s of it, and the rest is each row's set-up. GitHub's runner wasn't read. If it exceeds 10 s, one row per element with its states inside is the first repair.

## Witnesses

Each is a temporary change, reverted, with its failing row saved under `checks/`:

1. A listed violation's line removed: that state fails. Then a line added to a clean state: it fails.
2. `useARIA`'s call out of `ButtonCore`: each row whose control in a button, an icon button or a switch has its name from a host `aria-label` fails with `button-name`, and the standing row passes.
3. `axe.run` replaced by an empty result: the standing row and the rows with violations fail, and so do the rows with no mark, by property 4.
4. A new element in `files.json` with no row: the coverage row fails.
5. Without the glyph file: the split button's three rows fail with `label-content-name-mismatch`.
6. On a cold Vite cache: Firefox and WebKit skip the file, and Chromium passes, without the reload message.

## Interactions

- **`RF-132`** (#238, ruled on now in slot b, `material-x/list-selected-1`): with slot b's working tree (`aria-current`), the violation is gone for a selected and a deselected item ([reading](checks/branches.txt)). Whichever lands second edits the list: the second unit removes the line, or the first doesn't write it. Its ruling decides nothing here.
- **`RF-94`** (#148): the `label` lines go with its repair, by whatever mechanism. A name by element reference is seen by axe (`RD-57`). If the repair covers only some states, the remaining lines stay, and the rows fail by name otherwise.
- **`RF-142`** (#278): nothing changes: the five rows read the same on its branch.
- **`RF-144`:** registered here. Its line is the two rows of a control in a button item.

## Documentation

- **In this unit's pull request:** the file's own header comment, saying what is checked, how a line is added and removed, and the limits. The font file's entry in `fonts/README.md`.
- **Not in it,** because project documentation is a unit of its own: one paragraph in `test-architecture.md` that names the check as the supplementary rule engine the oracle table already allows, and one line in the `test-component` skill, that a new element or state takes a row and that a repair removes its line. Routed to the coordinator after the unit merges.
- `accessibility.md` doesn't change: it states requirements, and the owners of the lines are the registers' entries.

## For the implementer

Everything above, on this branch: the dependency with the lockfile, `.scripts/vitest-config.ts` for `AX-3`, the test file, the font file and its README line, and the witnesses. Then the record: `RD-57`'s status and the readings under `checks/`. The root `fmt-check`, lint, the root typecheck, material-x's `browser` project in Chromium, and the `firefox` and `webkit` runs of the new file. The pull request says `Closes #239`.

**Not read:** Safari, GitHub's runner, real Firefox and WebKit with the final file.
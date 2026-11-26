# axe-core over material-x's elements (RD-57, #293, #239) — feature proof

**Files were read at:** `d20c356bdd9c4d070350470a2a7c60a4ac5a7ee5`, the head of `repo/axe-checks-1`, in slot `h`, equal to `origin`. **Diff reviewed:** `ee0afea12..d20c356bd`, after the plan at `f36c6e817`. `main` isn't merged. Mutations changed sources and the test file for a run and restored them, and `packages/` is unchanged. Playwright's Chromium 158, Firefox 159 and WebKit 27.2, one engine at a time (`RD-62`).

**Contract:** `repo:RD-57` in [`00-index.md`](../../00-index.md), with its notes, and the unit's [plan](../../axe-checks-1/axe-checks-plan.md) (`AX-1` to `AX-6`, properties 1 to 6, witnesses 1 to 6). Evidence: [`.plan/axe-checks-1/`](../../axe-checks-1/).

**Verdict: two findings, both Tier B, both for the architect. No Tier A.** The unit does what its plan says, at this head, in each property and in the three engines. The findings are about what axe sees of an `mx-icon`'s hidden text. On this branch that already makes one row blind to the property in its name (`reviewer-2`). Once `RF-137` (#292) lands, it makes the unit's own note about the fixtures' icons wrong, and so the reason that `RD-58` gives (`reviewer-1`).

## Readings

**Rows.** `tests/axe.browser.test.ts`, locally: Chromium 70 passed in 8.5 s, Firefox and WebKit 70 skipped, in 3.7 s and 1.9 s. Material-x's `browser` project in Chromium: 26 files, 1278 passed.

**CI at the head**, run [45683346868](https://github.com/ausginer/material-x/actions/runs/45683346868), `pull_request`, all green. Vite's cache isn't restored there, so each job is a cold start:

| Job | The file | The suite | No reload message |
| --- | --- | --- | --- |
| `chromium` [139449672257](https://github.com/ausginer/material-x/actions/runs/45683346868/job/139449672257) | 70 passed, 6564 ms | 184 files, 4464 passed, 404.8 s | yes |
| `firefox` [139449672228](https://github.com/ausginer/material-x/actions/runs/45683346868/job/139449672228) | 70 skipped | 128 passed and 1 skipped, 3314 passed, 598.6 s | yes |
| `webkit` [139449672568](https://github.com/ausginer/material-x/actions/runs/45683346868/job/139449672568) | 70 skipped | 128 passed and 1 skipped, 3325 passed, 246.1 s | yes |

These are witness 6 on GitHub's runner. The same base without the file (#292's run [45680385814](https://github.com/ausginer/material-x/actions/runs/45680385814)) took 420.0, 595.0 and 248.4 s, so the runner's noise is larger than the file.

**The engines agree with the final file** ([probe](probes/passes.mjs); [Chromium](checks/passes-chromium.txt), [Firefox](checks/passes-firefox.txt), [WebKit](checks/passes-webkit.txt)). A copy of the file without the `runIf`, which prints each row's passes, violations and incomplete results with their targets: 70 of 70 rows pass in each engine, and the 68 rows' results are identical, line for line. `AX-2`'s reason holds for the final rows. The plan left this unread.

**No row is vacuous by property 4.** Every row but `mx-card`, `mx-icon` _exposed_ and `mx-list` _with a static item_ has rules that pass on the element's own nodes, and those three are marked `hasNoRule`. A row's rules are the inner control's (`button-name`, `link-name`, `label`, `aria-required-attr`, `aria-roles`, `aria-command-name`) as well as the ARIA attribute rules. The exception is `reviewer-2`.

**The implementer's witnesses** ([readings](../../axe-checks-1/checks/witnesses.txt)) aren't repeated. **The review's mutations** ([Chromium](checks/mutations-chromium.txt), [program](probes/mutations.mjs)) are of the elements, not of the list, and fail the rows they should:

| Mutation | Fails | Rows |
| --- | --: | --- |
| The switch has no `aria-checked` | 8 | Every switch row: 4 of `mx-switch-button`, 3 of `mx-switch-icon-button`, and the connected group's |
| The switch's role is `swich` | 8 | The same |
| The slider's input isn't labelled | 4 | Its rows with a label slot. The row with `aria-label` is named by the host's attribute |
| The text field's input isn't labelled by its label | 8 | Every row of both fields with a label slot |
| The sortable list doesn't name a handle | 1 | _with a handle that the component names_. Not _with an icon as a handle that the component names_: `reviewer-2` |
| The slider's or the text field's label by one path of two | 0 | Equivalent: each input is labelled by the shadow `<label for>` and by `aria-labelledby` |
| The group's role through `ElementInternals` is `gruop` | 0 | The limit that `RD-57` and the header state: axe doesn't see such a role |

**Cost** ([reading](checks/suite-time-chromium.txt)). The `browser` project in Chromium, its 26 files against the 25 without this one, three pairs at a load of 9 to 15: 86.3 against 83.7 s, 95.1 against 97.5 s, 92.3 against 84.6 s. That is +2.6, −2.5 and +7.7 s, within property 6's 10 s, and within the noise of a loaded machine. The implementer's file pairs gave +4.9 to 8.2 s at a load under 6. In Firefox and WebKit the file costs its skip. `optimizeDeps.include` pre-bundles axe at each cold start of the `browser` project in every engine, which wasn't timed.

**The dependency.** `axe-core` 4.14.1, exact, in material-x's `devDependencies` alone. The registry gives the lockfile's integrity, MPL-2.0, no dependencies, 3.44 MB unpacked (`axe.js` 1.48 MB, the file that the test imports), published on 2026-11-16, 10 days before this reading, so past the 7-day minimum, and the latest version. It loads in one place: the dynamic `import('axe-core')` in `check()`, inside the Chromium `describe`, pre-bundled by the `browser` project's `optimizeDeps.include`. Nothing in `src` names it, and `package.json`'s `files` has no test. The lockfile records 4.14.1 under `packages/material-x/node_modules` and eslint's 4.11.1 at the root. The installed tree has them the other way round, which `node-linker=hoisted` gives. Each consumer resolves its own version (read: material-x 4.14.1, `eslint-plugin-jsx-a11y` 4.11.1), and CI's frozen install passes.

**Properties 1 to 5.** The coverage row compares the rows' tags with the tags that the runtime entries define. The rows are the probe's 65 valid fixtures plus the three that the plan adds. Each failure message names the owner. The standing row expects `button-name` inside the shadow tree. Nothing published depends on axe. The glyph file is loaded by this file alone, and its README entry is there.

## Scope

**Covered:** the above. **Not covered:** Safari, screen readers, the other projects (`spec`, `visual`, `node`; CI ran them), a cold local cache (CI's runs are cold), and the size of `optimizeDeps`' pre-bundle. `RF-137`'s effect was read with its icon (`icon.ts`, `icon.ctr.css`) and its split button template at `6083534cf` applied on this branch. Chromium's own tree is read through `readAccessibilityTree`; axe's results are the same in the three engines.

- **Main has moved:** the merge conflicts in `.plan/00-index.md` alone, as the coordinator says. Not merged here.
- **With `RF-137` as it is,** with the fixtures' icons still `aria-hidden`, the 70 rows pass ([reading](checks/with-rf137-chromium.txt)). Whichever lands second needs no change to the list.

**The root `fmt-check` passes.**

## Findings

### reviewer-1 — axe takes an `mx-icon`'s text into a name though its slot is `aria-hidden`, so after `RF-137` the check doesn't report an unnamed icon-only control

Tier B, for the architect: no consumer observes it, and an instrument that the repository relies on, and two records' statements about it, are wrong once `RF-137` lands.

- **Current behavior:** `RF-137` hides an icon's content by `aria-hidden` on the icon's shadow slot. The browsers then give an icon-only control without `aria-label` no name. axe-core 4.14.1 doesn't apply that `aria-hidden` to the slotted text, and still names the control by the ligature.
- **What the records say:**
  - **This unit's note:** _"When `RF-137` lands, the attribute is redundant, and whichever unit lands second may remove it with witness 2 again"_ (`RD-57`'s implementation note). The header comment says the icons are hidden _"because the name of an exposed icon would be the control's"_, which stays true for axe.
  - **`RF-137`'s _Not read_:** _"what `RD-57`'s check gives after the repair: its `button-name` and `link-name` would then report an icon-only control with no label."_ They don't.
  - **`RD-58`'s reason:** _"An unnamed button is reported by axe-core's `button-name` (`RD-57`)."_ It is on this branch, and isn't once `RF-137`'s split button template, which drops its icon's `aria-hidden`, lands.
- **Why it is a problem:** removing the fixtures' attribute, as the note allows, takes every control row's sensitivity to its name away. The check then can't see the regression it was set up to report for icon-only controls. The note's _with witness 2 again_ would catch it, if it is run.
- **Evidence** ([readings](checks/icon-names-chromium.txt), [probe](probes/icon-names.browser.test.ts.txt), [script](probes/icon-names.sh); [witness 2 with `RF-137`](checks/with-rf137-witness2-chromium.txt), [script](probes/with-rf137-witness2.sh)), Chromium:

  | Fixture | This branch: axe, tree | With `RF-137`: axe, tree |
  | --- | --- | --- |
  | `<mx-icon-button><mx-icon>check</mx-icon></mx-icon-button>` | none, `"check"` | **none**, `""` |
  | The same with `aria-hidden` on the icon | `button-name`, `""` | `button-name`, `""` |
  | `<span role="button">` with an icon | none, `"check"` | **none**, `""` |
  | `<mx-split-button>Go</mx-split-button>`, the trailing button | `button-name`, `""` | **none**, `""` |

  With `RF-137` and without the fixtures' `aria-hidden`, witness 2 (`useARIA`'s call out of `ButtonCore`) fails none of the 11 control rows that it fails on this branch. The one row that fails is `mx-icon` _hidden_, whose fixture is the edited constant.

- **Required property:** the records say what axe sees of an `mx-icon`'s content once it is hidden by its shadow tree. The rows keep a form of hiding that axe reads, or don't depend on it, so that witness 2 fails with `RF-137` landed. `RD-58`'s reason, and `RF-137`'s _Not read_, agree with what axe reports.

### reviewer-2 — The row _with an icon as a handle that the component names_ doesn't see the component's name

Tier B, for the architect, with `reviewer-1`: the row is the instrument for a property its name states, and it passes without it.

- **Current behavior:** the fixture's handle is `<mx-icon data-handle slot="lead">check</mx-icon>`. The sortable list gives it `role="button"` and `aria-label="Reorder"`. Without that `aria-label` (the mutation _the sortable list doesn't name a handle_), axe names the handle by its ligature `check` and reports nothing, on this branch and with `RF-137`'s icon ([reading](checks/with-rf137-chromium.txt)). Chromium's tree names it `"check"` here and `""` with `RF-137`.
- **Contract:** plan property 2 includes the probe's row _handle named by the component_. Property 4 requires each row to apply a rule, which it does (`aria-command-name` passes).
- **Why it is a problem:** the row's state is that the component names the handle, and nothing in it fails when the component doesn't. Its neighbour _with a handle that the component names_, a span with a hidden icon, fails with `aria-command-name`, so that property is held once. An icon as a handle isn't.
- **Required property:** a row that states that the component names a handle fails when the component doesn't, or its state is named for what it checks.

**Null result:** nothing was found against properties 1, 3, 4, 5 and 6, `AX-1` to `AX-6`, the CI runs, or the engines' agreement.
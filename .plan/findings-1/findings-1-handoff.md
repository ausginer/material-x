# Handoff: the open repository findings and the docs workflow, first unit

**Recipient:** the implementer. **Branch:** `repo/findings-1`, from `main` at `275ad0f5c`. **Input:** the architect's commit that adds this file. **Authorized** by the owner, relayed by the coordinator on 2026-11-16: resolve every open `repo:RF-` finding in one unit, and repair `.github/workflows/docs.yml`.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-14`: the docs workflow;
- `repo:RF-23`, `RF-30`, `RF-33`, `RF-34`, `RF-35`, `RF-36` and `RF-37`, each with its required property and its dated notes;
- `repo:RD-6`, `RD-8`, `RD-12` and `RD-13`: the gate, how a row is disabled, Safari's provider and commands, and how baselines are recorded;
- box-quad's [contract](../../packages/box-quad/.plan/contract/00-index.md), whose tolerance rule in `02-behavior-scenarios.md` is amended for `RF-34`.

## What this unit covers

| Finding | State before this unit | Here |
| --- | --- | --- |
| `RF-8` | open until the branch rule | **Closed** by the architect's record commit: the rule is on, and `RD-2` is met |
| `RF-29`, `RF-32`, `RF-38` | repaired by the CI unit | **Closed** by the same commit |
| `RF-23`, `RF-30` | open, one comment and one sentence | Item 2 |
| `RF-36` | open, Safari skips 2 rows | Item 3 |
| `RF-33` | open, Firefox expects 4 rows to fail | Item 4 |
| `RF-34` | open, Firefox expects 1 row to fail | Item 5 |
| `RF-37` | open, low priority | Item 6 |
| `RF-35` | open, the owner's question | Item 7, after the owner's answer |
| `RF-39` | registered during item 7 | Item 7, as amended again on 2026-11-16 |
| `docs.yml` | fails on every push to `main` | Item 1, `RD-14` |

Every other `RF-` row is closed, except `RF-40`, which was registered during this unit and routed to the owner to order. `drag:DRF-48` to `DRF-51` are drag's findings, not this unit's.

## Owner questions and preconditions

Ask through the coordinator when you reach the item that needs one. Don't guess.

1. **`RF-35`: do `mx-radio`, `mx-checkbox` and `mx-button` draw the focus state layer that their tokens define?** **The architect recommends yes:** the components already draw their hover layer from the same token family (`ripple.color` and `ripple.opacity` from `state-layer.*`), and the focused baselines hid the gap. The alternative is that the record states why they don't, and nothing changes. **If yes,** three visual baselines change (`radio-focused`, `checkbox-focused`, `button-focused`), and the owner reviews the recording workflow's proposal. Item 7 waits for this answer, and the unit can report without it.
2. **Does `verify` require the docs build?** `RD-14` property 5 keeps the docs build outside the gate. **The architect recommends adding it once item 1 has passed on `main`,** because it was broken for three months unseen. Yes would amend `RD-6` and `RD-14`, in a later unit. Nothing in this unit waits for the answer.
3. **A pull request from `repo/findings-1` to `main` that is not a draft,** for the Firefox, Safari and docs readings. Open it yourself only if the owner's prompt authorizes it. Adding the label `record-baselines` (item 7) and rerunning jobs need the same authorization. **The ruleset requires the branch to be up to date with `main` before merge.** Bring `main` in with a merge, not a rebase. Never merge the pull request.

## How the unit works

- **Each item stands alone.** A stop in one item stops that item only. Report it with its output, and continue with the next item.
- **Product source changes only where an item's required property needs it.** No public export, public type, attribute or event changes. A change to a decided contract, such as core's landing or `COMMIT_TIMEOUT`, is a stop.
- **Evidence:** Firefox and Safari results are read in CI on the pull request (`RD-13` property 8). A local Firefox run, after `npx playwright install firefox` in the devcontainer, may be used to find a cause, but it isn't evidence. A scratch probe is removed after it gives its reading. Save every reading under `.plan/findings-1/checks/` and cite it.
- **Removing a marking:** a row loses its `it.fails` or `skipIf` only when it passes in the engine where it was disabled, in the number of CI runs that its item names.
- **Conventions:** [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for source, the `test-component` and `test-visual-contract` skills for material-x tests, and `use-tokens-db` for token queries.

## 1. The docs workflow (`RD-14`)

1. **Reproduce.** On a fresh clone of `275ad0f5c` after `npm ci`, `npx just docs-build` fails with the box-quad import error. Save the output.
2. **The recipe** (`RD-14` property 4). `just docs-build` succeeds on a fresh clone after `npm ci`. It builds every workspace package that the Storybook or the API documentation resolves to a build. Choose how, for example an `nx` dependency or a shared private recipe like `_test-builds`, and say why. No package's exports or build output change.
3. **The workflow** (`RD-14` properties 1 to 3). For an action that `verify.yml` also uses, use the same commit hash. For `configure-pages`, `upload-pages-artifact` and `deploy-pages`, use the commit of a released tag, and name the tag in a comment, as `verify.yml` does.
4. **Read the `github-pages` environment's deployment branch policy** through the API, and report it. Don't change it.

**Checks:**

- the fresh-clone build passes;
- on the pull request, `build` passes, its artifact holds the site, and `deploy` is skipped;
- `actionlint`, run in the devcontainer or another container, reports nothing for `docs.yml`.

The deployment after merge is read by the coordinator, not by this unit.

**Stop:** the docs build needs a change to a package's exports or build output.

## 2. `RF-23` and `RF-30`

- **`RF-23`:** the root `Justfile`'s comment on `test` states no project count that the configuration doesn't keep. The count now depends on `MX_TEST_ENGINES` and `MX_TEST_VISUAL`. Describe what the root configuration contributes without a number, or give the number for the default variables and say that it is for the defaults.
- **`RF-30`:** the refusal in `.scripts/vitest-one-shot.ts` states what a `--sequence.*` flag does in the installed Vitest, as the finding describes. The refusal still fires where it fires now. Run the repository's node tests that cover it.

## 3. `RF-36`: the Safari top-layer wait

`RF-36`'s dated note says that the inferred cause covers only the first row. Read before changing anything.

1. **Timing probe.** Add a scratch test, run only in the `safari` job, that repeats both rows' gestures several times and records `performance.now()` at each of these points:
   - the end of `ue.pointer`;
   - the host's `pointerup`;
   - the visual's animation start and `finished`;
   - the item's `toggle` to closed;
   - the start of the wait.

   Record `document.visibilityState`, `document.hasFocus()` and the interval between two animation frames as well. Also run the probe once in Chromium for comparison. Run up to five attempts of the `safari` job, or until a slow landing is caught. Save the readings, then remove the probe.

2. **Decide by the reading:**
   - **The cause is in the test or the test environment,** such as a release that arrives after `ue.pointer` returns, or a throttled or unfocused Safari window. Repair it there, under `RD-8` property 2. A Safari window change belongs with `.scripts/safari-window.ts`'s setup.
   - **Then the waits.** Every row in `reorderable.browser.test.ts` with a fixed wait states what it covers: the landing, from the duration that the test's own `timing()` gives, plus `COMMIT_TIMEOUT` where the row takes the commit path, plus a stated allowance for frames. `COMMIT_TIMEOUT` stays private to core. The test may name the value in a constant whose comment cites `src/traits/reorderable.ts`.
   - **Remove the two Safari skips** and their citations.
3. **Check:** five attempts of the `safari` job at the item's head, in which both rows and the eight other rows with a fixed wait pass. Chromium and Firefox are unchanged.

**Stop:** the reading puts the delay in core's landing or teardown, which is a core contract question; or no attempt catches a slow landing and the timings don't explain the two failures. Report the readings either way.

## 4. `RF-33`: focus delegation in Firefox

1. **Find the cause by elimination.** Start from the plain host that delegates focus in Firefox (`RF-33`'s _What is established_). Add one of `mx-button`'s ingredients at a time until `focus()` stops delegating:
   - `attachInternals()`;
   - `static formAssociated = true`;
   - `mx-button`'s stylesheet;
   - its template, including the slots;
   - the ripple;
   - the remaining controllers.

   `RF-33`'s note names the first candidate. Then remove the ingredient from a real `mx-button` in a scratch copy and confirm that delegation returns. Read the result in Firefox in CI. Save the matrix.

2. **Repair** where the cause is, in material-x or core. `mx-button` stays form-associated, keeps `delegatesFocus`, and behaves as it does now in Chromium and Safari. Remove the four `it.fails` markings and the comments that cite `RF-33`.
3. **Checks:**
   - the four rows pass in three runs of the `firefox` job, and every other material-x row still passes in every engine;
   - in a scratch row, `Tab` from the page moves focus to an `mx-button`'s native button in each engine. Report the result whatever it is.

**Stop:** the cause is in Firefox and no repair inside material-x or core keeps the public surface. Report the smallest reproduction. The markings stay, and the report proposes the text of `RF-33`'s cause.

### Item 4, amended 2026-11-16: forward `focus()`

The elimination found `:host { display: contents }` to be the cause, in local Firefox (`RF-33`'s ruling). **The stop isn't reached:** a `focus()` forward keeps the public surface. Step 2 becomes:

1. **Confirm in CI.** Run the smallest reproduction in the `firefox` job, and the same file in Chromium and Safari: with `display: contents`, without the rule, and with `display: inline`. Save the reading. If CI doesn't reproduce the local reading, stop.
2. **Which elements.** List every material-x element whose host has `display: contents` and whose shadow root delegates focus. The button family through `useButtonCore`, FAB if it delegates, and interactive list items are the known candidates. The list is the repair's scope.
3. **The forward**, one mechanism for every listed element, in the shared code that builds their shadow roots. No copy per class (CONTRIBUTING §6).
   - **Signature:** `focus(options?: FocusOptions): void`, as `HTMLElement.prototype.focus` declares it. No other member or type changes.
   - **Target:** the element that delegation focuses in Chromium today, such as `useButtonCore`'s target. Show that it is the same element for each listed element, in Chromium.
   - **Options:** passed through unchanged.
   - **A control that can't be focused:** for example a disabled one. The forward focuses nothing, and focus stays where it was, as delegation does.
   - **Every engine:** the forward detects no engine and runs everywhere. The shadow roots keep `delegatesFocus: true`.
   - **Its comment** says what the forward works around, cites `RF-33`, and says when it can be removed: when Firefox delegates through a `display: contents` host.
4. **The markings.** Remove the four `it.fails` markings and their `RF-33` comments. Add one row per listed element that doesn't have one, asserting that `focus()` on the host focuses its control in every engine.
5. **A row that watches Firefox.** Add one row that calls `HTMLElement.prototype.focus.call(host)` on a listed host, which bypasses the forward, and asserts that focus reaches the control. Mark it `it.fails` in Firefox, with a comment citing `RF-33`. When Firefox conforms, the row fails, and the forward can go.

**Checks,** in place of step 3's first bullet:

- the four rows and the new rows pass in three runs of the `firefox` job;
- the watching row is an expected failure there;
- every other row passes in every engine;
- no visual baseline changes.

Step 3's `Tab` check stands. In the same scratch file, also read whether the host's `autofocus` attribute moves focus to the control in each engine. Report each result, whatever it is. The architect decides what stays in `RF-33`.

**For the owner:** the report gives the smallest reproduction in a form that can be filed to Mozilla. Filing it is the owner's decision.

## 5. `RF-34`: box-quad's precision in Firefox

The decision is in `RF-34`'s dated note: the measurement stays, and the contract's tolerance rule admits an engine's measured client-rect quantization.

1. **Confirm the cause.** From inside the row's fixture, in CI, read `getClientRects()` and `getBoundingClientRect()` in each engine. For each edge, report whether it is a multiple of 1/60 px to within 1e-9. Save the reading.
2. **Derive the bound.** Next to the fixture, derive the largest error in the recovered width and height that a rounding of ±q/2 on each rect edge causes through box-quad's recovery, where q is the engine's quantum. Derive it from the formula the code uses, not from the observed 0.0076.
3. **The row** asserts 1e-4 in an engine with no measured quantization, and 1e-4 plus the derived bound in an engine with one. Remove the `it.fails` marking.
4. **The contract.** In box-quad's `contract/04-support-matrix.md`, add one row: _the recovered size of a transformed box is exact to 1e-4 px where the engine's client rects are unquantized, and to the derived bound where they are quantized_. Name each engine's reading and cite the evidence.
5. **Check:** the row passes in three runs of the `firefox` job and in Chromium and Safari, with every other box-quad row unchanged.

**Stop:** the edges aren't multiples of 1/60 px, or the derived bound is smaller than the observed error. In either case the inferred cause is refuted, and the decision in `RF-34`'s note doesn't apply.

### Item 5, amended 2026-11-16: the reporting resolution

Run 43872551455 confirmed the cause (`RF-34`'s ruling). Firefox's edges are k/60 rounded to a multiple of 2^-14, so they meet the test of _"a multiple of 1/60 to within 1e-9"_ only to within 4.1e-6. **The stop isn't reached.** Steps 1 to 4 change as follows:

1. **Step 1's test:** an edge is quantized at q when it equals a multiple of q rounded to the engine's reporting resolution r. Report q and r for each engine. Firefox's reading gives q = 1/60 and r = 2^-14. Read Safari too. An engine whose edges fit no q coarser than 1e-4 is unquantized.
2. **Step 2's rounding per edge** is ±(q/2 + r/2). Derive the bound from box-quad's formula, as before. For this fixture it is 1.821 (q + r) ≈ 0.0305 px.
3. **Step 3's tolerance:** 1e-4 plus that bound, in an engine with a measured q.
4. **Step 4's row** names each engine's q and r.

## 6. `RF-37`: the Vite warning

1. **Read:**
   - whether a local Chromium root run and the CI `chromium` and `firefox` jobs print the warning;
   - what puts `vite/module-runner` into the browser's dependency pre-bundle, from Vitest's source and the repository's `optimizeDeps` configuration.

   Save both.

2. **If the repository's configuration causes it,** change the configuration so that the warning doesn't appear and no other pre-bundle entry changes. Show the pre-bundle metadata before and after.
3. **If Vitest or Vite causes it,** change nothing, and don't filter the warning by its text. The report gives the source with file and line in the installed package, and links an upstream issue if one exists. Don't open an upstream issue without the owner. `RF-37`'s required property allows the record to state why the warning stays.

## 7. `RF-35`: the focus state layer, after the owner's answer

**If the owner answers no,** do nothing. The architect records why in `RF-35`.

**If yes:**

- On keyboard focus (`:focus-visible`, the trigger of each component's existing focus indicator), each of `mx-radio`, `mx-checkbox` and `mx-button` draws its state layer with the color and opacity that tproc selects for the focus state.
- Find the tokens with `use-tokens-db`. The layer uses the same element as the hover layer (`core/animations/ripple`).
- **Hover together with focus:** apply the precedence that the component's existing states already follow. If the component's styles and the tokens don't decide it, stop and ask.
- Add spec-contract rows (`test-visual-contract`) that read the focused layer's color and opacity from the rendered element against the tokens.
- Record the three changed baselines through `RD-13`'s labeled run on the pull request. Ask the owner, through the coordinator, to review and merge the proposal.
- **Check:** the gate's `chromium` job then matches every baseline. No other baseline changes in the proposal. If another one does, stop.

### Item 7, amended 2026-11-16: hover and focus together

The owner answered yes. The architect ruled the hover-and-focus question in `RF-35`: **the focus layer shows, through variables of its own.** The _hover together with focus_ bullet is replaced by these properties:

1. **The values.** Each component reads the focused state's state-layer color and opacity, for each selection state the tokens define, into variables that only the focus layer reads. The variables are available whatever state the host is in. The implementer names them.
2. **The trigger.** The layer draws on the trigger of the component's existing focus indicator: `.host:focus-visible` for the button, and `:host:has(.input:focus-visible)` for radio and checkbox. It doesn't draw on `:focus-within` alone.
3. **The precedence.** Under keyboard focus and hover together, the focus layer's color and opacity show. A press keeps its ripple wave. A disabled host draws none.
4. **Nothing else changes.** The existing state-layer and ripple variables keep their values under every state, so hover, press and mouse focus look as they do now.
5. **Where the values come from.** They come from the components' own token selection and style utilities in material-x. **Stop** if this needs a change to tproc's processing, which is a tproc decision.

**Spec-contract rows**, in place of the bullet that asks for them. Each reads the rendered element in each component against the tokens:

- keyboard focus shows the focused color and opacity;
- keyboard focus with hover shows the same;
- hover alone shows the hovered values;
- after a mouse click with the pointer moved off the host, no focus layer shows.

### Item 7, amended again 2026-11-16: one trigger that every engine matches

In Firefox, `:host:has(.input:focus-visible)` doesn't match, so radio's and checkbox's keyboard focus indicator is already missing there (`RF-39`, registered for this item). Property 2 of the previous amendment changes for radio and checkbox, and `RF-39` is resolved here. The button's trigger, `.host:focus-visible`, stands.

1. **One trigger per component, inside the shadow tree.** In radio and checkbox, the indicator and the focus layer both draw under `.input:focus-visible ~ …`, from the input to a later sibling, or a descendant of one. No selector in either component's focus rules uses `:host:has()` or a script-set state.
2. **Radio:** the indicator stays on its current element (`.off`), and the layer stays on the ripple's `::before`.
3. **Checkbox:** the indicator moves from the host to an element after the input. Use an existing element, or add one without a `part` attribute.
   - In Chromium, the indicator's box, outline width, offset and radius equal today's on the host. Show it with a scratch reading of both, before and after.
   - **Stop** if they can't be kept equal.
4. **Rows.**
   - The spec rows of the previous amendment run in every engine, Firefox included, with no engine marking.
   - Add a row for each component asserting that keyboard focus draws the indicator, and that a mouse click doesn't, in every engine.
   - Read both in Firefox in CI.
5. **Baselines:** the proposal's only changes are still `radio-focused`, `checkbox-focused` and `button-focused`. A changed checkbox indicator position is a stop.
6. **The report** gives `RF-39`'s readings for its closure.

`RF-40`, the `:host:has()` fallback that no stylesheet reads, isn't in this unit. Don't change `polyfills.ts`.

### Item 7, amended a third time 2026-11-16: Tab in Safari

In run 43886020747 at `c34cb01d7`, Safari fails 9 rows: _keyboard focus_, _keyboard focus with hover_ and _draw the focus indicator on keyboard focus_, for each of the three components. In Safari, Tab doesn't move focus to buttons, checkboxes or radios by default. `RD-12` property 10 gains the bullet _Tab_, and this amendment implements it.

1. **The job.** Before the tests, the `safari` job turns on Safari's _"Press Tab to highlight each item"_ as the runner's user. Add it beside the Reduce Motion step, or in that step. The step reads the value back, logs it, and fails if it isn't on. Choose the keys with a reading. The candidates are `WebKitTabToLinksPreferenceKey` and `com.apple.Safari.ContentPageGroupIdentifier.WebKit2TabsToLinks` in `com.apple.Safari`. Use only what the reading shows is needed. Don't turn on the system's keyboard navigation.
2. **The rows stay as they are:** the same `{Tab}` in every engine, with no engine condition, no `focus()` and no other key.
3. **Reaching focus is asserted on its own.** Before it reads the layer or the indicator, each keyboard-focus row asserts that Tab focused the component's control. That means the host is `document.activeElement`, and its shadow root's `activeElement` is the native control. A failed reach then can't be read as a missing layer.
4. **The reading:** the whole Safari job in CI, with the 9 rows passing. Report every other Safari row whose result changes from run 43886020747. No other row presses Tab, so a change elsewhere is a finding, not something this item absorbs.
5. **Stop** under `RD-8` property 5 if the step can't write or read back the setting, or if after it is set the assertion of property 3 fails in Safari. Don't limit or disable the rows. Report what the step and the rows read. Option-Tab in Safari is the owner's to weigh, not this item's.

## Checks for every item

- The Verify steps of [`handoff.md`](../../.agents/docs/handoff.md) for each changed file.
- `verify` passes on the pull request at the unit's last commit.

## Report

`.plan/findings-1/findings-1-report.md`:

- for each item: its changes as `file:line`, its readings and checks, the CI run links and any stop;
- for each finding: the text that the architect needs to close it, or the stop.

The unit stops at the pushed report. **Next:** the architect reads the report, and a feature-proof review follows before the owner merges.

## Disposition of the report at `fc3b89680`

**Decided 2026-11-16 by the architect,** on the [report](findings-1-report.md) and the coordinator's reading of pull request #29: `verify` run 43895450645 fails only in Safari's `focus-layer.spec.browser.test.ts`, and _Publish Docs_ run 43895450612 built and skipped `deploy`. The register entries named below hold each decision's reasons.

| Item | Finding | Disposition |
| --- | --- | --- |
| 1 | `RD-14` | **Accepted.** The actionlint check is waived, with reasons in `RD-14`. The coordinator reads `deploy`'s first run after the merge |
| 2 | `RF-23`, `RF-30` | **Accepted.** Both are closed |
| 3 | `RF-36` | **The stop is accepted.** The skips stay. The probe refutes the commit-grace inference. The required property is amended. The next reading is routed to core's owner as its own unit |
| 4 | `RF-33` | **Accepted.** It stays open as Tier C for Firefox's own delegation (the watching row) and `autofocus` |
| 5 | `RF-34` | **Accepted.** Closed |
| 6 | `RF-37` | **Accepted.** Closed |
| 7 | `RF-35`, `RF-39` | **Accepted in Chromium and Firefox.** The 9 Safari keyboard rows are registered as `RF-42`, for the owner. The screenshot result is registered as `RF-41` and doesn't block. Both findings close when `RF-42` is resolved |

`RD-12` property 10's _Tab_ bullet is amended: the preference changed nothing, and the job sets none. The unit's report is complete. Nothing is owed except what follows.

### Owner decision: Safari's 9 keyboard-focus rows (`RF-42`)

`verify` stays red on #29 until this is decided and implemented. These are the options:

- **(a) Option-Tab in Safari.** In Safari only, the rows press Option-Tab (`{Alt>}{Tab}{/Alt}`). Chromium and Firefox keep Tab.
  - **For:** it is real keyboard input, and with Safari's default settings it is the key that moves focus to every control. So the row reads what a Safari keyboard user sees.
  - **Against:** one engine condition on the input. **Unread:** whether WebDriver's Option modifier reaches WebKit's Tab handling. The rows' reach assertion would show it.
- **(b) Disable the 9 rows in Safari** under `RD-8`, as `it.fails`, because they fail in every run, citing `RF-42`.
  - **For:** no new input path, and the marking watches for Safari's behaviour to change.
  - **Against:** Safari loses keyboard coverage of the layer and the indicator.
- **(c) Limit them under `RD-12` property 5.** **Not recommended:** property 5 covers instruments that a driver lacks, and Tab exists here.
- **(d) Focus by script in Safari.** **Not recommended:** that isn't keyboard input, and `:focus-visible` depends on how focus arrived.

**The architect recommends (a), with (b) as its fallback without a second question.** If one CI reading shows that Option-Tab doesn't reach the control, the implementer takes (b). (a) is the one option that keeps Safari's keyboard coverage, and its only cost is a different key in one engine, which is that engine's real keyboard behaviour.

### If the owner answers (a): item 7, amended a fourth time

1. **The key.** In Safari only, the 9 rows reach focus with Option-Tab. Chromium and Firefox keep Tab. One helper in the spec file chooses the key by engine. Its comment cites `RF-42`, and says that Safari's default Tab skips these controls.
2. **The reach assertion stays,** before the layer or the indicator is read.
3. **The reading:** the full Safari job in CI, with the 9 rows passing. Report every other Safari row whose result changes.
4. **Fallback.** If the reach assertion fails in Safari with Option-Tab, mark the 9 rows `it.fails` in Safari only, citing `RF-42`, and keep the reading. Then the full Safari job must pass with the 9 expected failures.
5. **The report** adds a section for this amendment, with the run links.

**If the owner answers (b),** take step 4 alone, with no Option-Tab reading. For any other answer, the architect amends this section first.

### Feature-proof review before merge: required

The unit changes product source in material-x, the shared build recipe, the Vite configuration, and a workflow that holds a Pages token. As with the CI unit, a feature-proof review reads it before the owner merges.

- **When:** it starts now, at `fc3b89680`, in parallel with the owner's decision. The Safari change for `RF-42` touches only the spec file's input, and a targeted recheck covers it.
- **The diff:** `275ad0f5c..fc3b89680`, excluding `.plan/`. The report's claims are checked against the code and the cited readings.
- **Against:** this handoff with its amendments, `RD-14`, `RD-12` property 10, and the register entries above.
- **Its focus:**
  1. `docs.yml` against `RD-14` properties 1 to 5:
     - the token scopes, and that a pull request's run can't publish;
     - each pin resolves to the tag it names;
     - the concurrency, including `queue: max`;
     - the expressions, in place of the waived actionlint check.
  2. `_package-builds`: it builds exactly what the tests and the docs need, and `test` behaves as before.
  3. `forwardFocus`:
     - it focuses what delegation focuses, for every caller;
     - no public surface changes;
     - the behaviour when the control can't take focus.
  4. The focus layer and indicator, against item 7's amendments:
     - the values come only from material-x's own token selection;
     - the existing variables are unchanged;
     - focus wins over hover, and a disabled host draws nothing;
     - no `:host:has()` remains in the focus rules;
     - the checkbox's new `.indicator` span: no `part`, `aria-hidden`, geometry unchanged;
     - the icon button's mapping.
  5. The spec rows:
     - their expectations come from the components' states, not from the `focus-layer.*` mapping;
     - the reach assertion;
     - the mutation reading.
  6. `RF-34`'s bound derivation, the row and the support-matrix row.
  7. The `cacheDir` removal: nothing else reads `.vite`.
- **The record:** `.plan/reviews/findings-1/feature-proof-claude.md`.
- **Who decides:** the architect decides the findings, and the owner merges.

### Still open, outside this unit

- The owner's question 2, whether `verify` requires the docs build.
- `RF-36`'s next reading.
- `RF-40`, which the coordinator will send as its own task.
- `RF-41`.
- `RF-43`: the switch buttons break the `.host` invariant, and every other template is audited against it, in the next material-x unit.
- `RF-33`'s report to Mozilla.

## Disposition of the feature-proof review at `a22c109b7`

**Decided 2026-11-17 by the architect,** on the [feature-proof review](../reviews/findings-1/feature-proof-claude.md), which read the code at `fc3b89680` and the records at `8ca27201a`, relayed by the coordinator. Focus items 1, 2, 5, 6 and 7 hold. The register entries named below hold each decision's reasons.

| Finding | Disposition |
| --- | --- |
| `reviewer-1`: the switch buttons draw no focus layer | **Accepted and deferred.** Registered as `RF-43`, outside this unit. It doesn't block the merge: `RF-35`'s property names `mx-button`, `mx-checkbox` and `mx-radio`, and no switch button drew a focus layer before the unit |
| `reviewer-2`: `focus` is an own property of each instance | **Accepted. It changes before merge** (item 8, step 1). It deviates from `RF-33`'s ruling, and no owner decision is needed |
| `reviewer-3`: no row reads most of the focus-layer mappings | **Accepted. Rows are added before merge** (item 8, step 3) |
| `reviewer-4`: the claim about a control that can't take focus has no reading | **Accepted. Rows are added before merge** (item 8, step 2) |

### Item 8: the feature-proof findings

Take it on this branch after item 7's Option-Tab reading (verify 44003141576) is reported. It changes the forward and adds rows. Nothing else changes.

1. **The forward moves to the prototype chain.** (`reviewer-2`) **Replaced** by _Item 8, step 1, amended 2026-11-17: the forward as a trait_, below. The bullets are kept for the record.
   - **No own property:** for each of the seven hosts the forward covers, `Object.hasOwn(host, 'focus')` is false, and `focus` resolves to a method of material-x's own classes.
   - **A subclass's own `focus()` is called,** and `super.focus(options)` in it focuses the control, in every engine, Firefox included.
   - **One body:** the forward's logic exists once (CONTRIBUTING §6). If each class declares the method, the declaration only calls the shared code.
   - **Unchanged:** item 4's signature, target, options, engines and comment. The shadow roots keep `delegatesFocus: true`. The declared member restates `HTMLElement.prototype.focus`'s signature, and no other member or type changes.
   - **Rows:** add one for a subclass of `mx-button`'s class and one for a subclass of `mx-list-button-item`'s, each under a tag of the test's own. The subclass declares `focus()`, which counts its calls and calls `super.focus()`. The row asserts that the instance has no own `focus`, that the subclass's method ran once, and that the control has focus, in every engine.
   - **The watching row** (`HTMLElement.prototype.focus.call(host)`) keeps its code and its Firefox marking.
   - **Size:** report the `measurements` job's change for the affected entries. A budget that fails is a stop.
2. **A control that can't take focus.** (`reviewer-4`) Add one row for a disabled `mx-button` and one for a disabled `mx-list-button-item`. Each row focuses another element first, calls `focus()` on the disabled host, and asserts that `document.activeElement` is still that element, in every engine. **Stop** if a disabled host's control takes focus in any engine. Report it, and don't repair it here.
3. **The focus-layer mappings.** (`reviewer-3`) Add one _keyboard focus_ row for each mapping that a component declares and no row reads:
   - `mx-checkbox` checked and indeterminate, and `mx-radio` checked, each against its selected focused state;
   - `mx-button` in `elevated`, `outlined`, `text` and `tonal`;
   - `mx-icon-button` in its default colour, and in each colour whose token package declares a focus-layer variable.

   Each row's expectation comes from that state's own focused tokens through the bridge, as the existing rows' do. Each row asserts the reach first. In Safari it uses item 7's key, or it carries item 7's Safari marking if item 7 ended in its fallback. If a state has no contract in the bridge, register the component's existing token package for it. If that isn't enough, don't add the row: the report names the mapping as standing without a row.

4. **Checks:**
   - the gate passes in every engine, with only the markings that `RF-33` and `RF-42` hold;
   - read locally in one engine, the new rows of step 3 fail under a mutation that drops their mappings. Save the reading;
   - no visual baseline changes.
5. **The report** adds a section for item 8, with the run links and the size reading.

### Item 8, step 1, amended 2026-11-17: the forward as a trait

The owner directed that while the forward ships, it is a trait, relayed by the coordinator. It stays a workaround for Firefox and goes when the watching row passes. `RF-33` holds the reasons. Step 1 becomes:

1. **The trait.** One trait, made with `trait(transformer, brand)` from `@ydinjs/core/traits/primitives.js`. Its class declares `focus(options?: FocusOptions): void`, which focuses the host's registered control. A `use*` function in the same module registers the control, called where `forwardFocus` is called today: `useButtonCore` and `useInteractiveListItemCore`. `forwardFocus` is removed. This is core's own pattern, where a trait declares the surface and a `use*` function wires it, as `Disableable` and `useDisableable` do.
   - **Where it lives:** in material-x's shared code. Not in `@ydinjs/core`, and not in material-x's `exports`.
   - **No change to `@ydinjs/core`.** `traits/primitives` is an exported subpath, and its `trait` takes any pure class transformer. **Stop** if the trait can't be written, or composed through `impl`, without changing `@ydinjs/core`'s runtime or types. That would be core's decision, and it isn't in this unit.
   - **The flattener lowers it.** The trait stays inside the generic subset that `vite-traits-plugin` supports ([`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md) §Eligibility). That means a module-scoped declaration, a pure transformer, and a method with no private names. So the registered controls are module-scoped state, not a `#private` field. **Stop** if the build warns that the plugin retained the trait.
2. **Exactly the seven hosts that register a control adopt it,** each through its trait list:
   - `button.ts`'s list, `ICON_BUTTON_CORE_TRAITS` and `link-button.ts`'s list;
   - `SWITCH_CORE_TRAITS`, which covers both switch buttons;
   - `LIST_INTERACTIVE_ITEM_CORE_TRAITS`, which covers both interactive list items.

   It isn't added to `BUTTON_CORE_TRAITS`, because the split button and `ButtonGroupCore` also use that list, and they register no control. FAB, the split button, the button groups and `mx-list-item` don't adopt it. The registering function's host type requires the trait's interface, so a class that registers a control without adopting the trait fails to typecheck.

3. **What stands from step 1:**
   - `Object.hasOwn(host, 'focus')` is false for each of the seven, and `focus` resolves to the trait's method;
   - a subclass's own `focus()` is called, and `super.focus(options)` in it focuses the control, in every engine, Firefox included;
   - item 4's signature, target, options and engines, and `delegatesFocus: true` on the shadow roots;
   - the comment, now on the trait: what it works around, `RF-33`, and that it goes when Firefox delegates through a `display: contents` host;
   - the subclass rows for `mx-button` and `mx-list-button-item`, and the watching row with its Firefox marking;
   - the `measurements` job's change is reported, and a budget that fails is a stop.
4. **What changes in the types:** each adopting class's instance type gains the trait's brand, as every adopted trait adds one. No member changes. Neither the trait nor its brand is exported.
5. **Removal:** when the watching row passes in Firefox, its marking, the trait's module, its five list entries and its two registrations are removed in one change. Delegation then focuses the control in every engine, and nothing exported changes.

**The parked attempt at `891d672ec`** (`implementer/item8-step1-wip`, unpushed) may be reused. Its module `WeakMap` and its `focusControl` become the trait module's registry and the body of the trait's method, and the registering function takes `forwardFocus`'s place. Its seven per-class `override focus()` declarations are dropped, because the trait declares the method. Its rows in `tests/core/utils/useCore.browser.test.ts` stand: `Object.hasOwn` for the seven hosts, and the two subclass rows.

**Step 4's mutation check, ruled 2026-11-17 on the implementer's note:** a mapping that tproc deduplicates into the button default doesn't fail its row when it's dropped. `mx-icon-button`'s filled mapping is one, because its focused colour equals the default's. The row stands, because it reads what is drawn. The default's mapping is what a mutation must drop to fail it. The report names each such row.

### Before the owner merges #29

1. Item 7's Option-Tab reading is reported. The architect records the owner's `RF-42` answer and its outcome in `RD-12` property 10 and `RF-42`.
2. Item 8 is implemented and reported. The architect then decides whether `RF-35`, `RF-39` and `RF-42` close. The two reports can come to the architect together.
3. **A targeted feature-proof recheck** reads the code diff from `fc3b89680` to the head, excluding `.plan/`: item 7's key helper and item 8, with step 1 as amended. It records at `.plan/reviews/findings-1/feature-proof-recheck-claude.md`, and the architect decides its findings.
4. `verify` and _Publish Docs_ pass on #29's head.
5. The reviewer's `a22c109b7` and this disposition are merged into `repo/findings-1`.

The owner's question 2 and the entries under _Still open, outside this unit_ don't block the merge.
# Handoff: CI verification, first unit

**Recipient:** the implementer. **Branch:** `ci/verification`. **Input:** the architect's record commit that revises this handoff, from `81d4c91b1`. The code base is unchanged since `a8726c57d`.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-6`: the workflow, the runner, the engine selection, coverage and the aggregate check;
- `repo:RD-12`: Safari as the third engine, its provider, its runner and its commands;
- `repo:RD-13`: the recording workflow, the proposal pull request, and local runs in Chromium only, without visual;
- `repo:RD-9`: the pinned visual environment, the one-time re-recording, and how the environment changes later;
- `repo:RD-10`: names that another program defines, and how they pass `camelcase`;
- `repo:RD-11`: two ESLint rules that the oxlint configuration already decides;
- `repo:RD-7`: measurement rows and the size comment;
- `repo:RD-8`: the checks that fail today, the reading at `a8726c57d`, and the stops;
- `repo:RD-2`: the order and acceptance this unit works toward, and its reporter rule (dated 2026-11-05);
- `repo:RF-29` and `repo:RF-32`, which `RD-8` takes into this unit;
- `drag:DRO-18`: local runs are Chromium only, and neither Safari nor Playwright's WebKit runs locally.

The [design](ci-verification-design.md) describes the workflow and the owner's setup. Where a decision and the design disagree, the decision is authoritative.

**Scope:** `.github/workflows/`, `codecov.yml`, `.devcontainer/` (its post-create and on-start scripts), the root and material-x `package.json` and the lockfile (for the Roboto package, `@vitest/browser-webdriverio` and `webdriverio` only), `.scripts/`, the root and package `Justfile`s, lint and format configuration, `.claude/skills/test-component/SKILL.md` (the two places that name the visual recipes), `packages/*/tests/`, including material-x's baselines, `packages/drag/bench/size/measure.ts`, `packages/drag/vitest.engines.config.ts` (deleted), the `.plan/` files that `RD-8` property 3 formats, and new findings in the `repo` and `drag` registers. **No product source under `packages/*/src/` changes,** apart from lint repairs that change no emitted behavior. `docs.yml` doesn't change.

## Resuming after the stop at item 5

**Dated 2026-11-16.** The unit stopped under `RD-8` property 5 and reported at `c2dbf6292` ([report](ci-verification-report.md)). The architect decided the stop in `RD-10`. **Resume from item 5, from the architect's commit that adds this section.** Items 1 to 4 and item 5's first two bullets stand as reported. These points from the report are settled:

- **The `camelcase` sites:** item 5 now carries `RD-10`. No file under `.claude/` changes.
- **material-x's five `main.styles.css` files** are authored and tracked, so formatting them was the right repair. Item 5's last bullet no longer mentions them.
- **`placement.ts`'s trailing commas** are not a data change. The program is the one that ran.
- **Visual is declared only when the list names `chromium`** (report §2). That reading is accepted.
- **19 baselines, not 23.** `RD-9`'s reading is corrected.
- **`bench/compare.ts`'s `CHROME_EXECUTABLE`** stays out of this unit. It is a manual comparison, not a test run. It is carried in the design's §6.

## Resuming after the second stop

**Dated 2026-11-16.** The unit stopped again under `RD-8` property 5 and reported at `a2a4c5488` (report §Resumed at item 5, and the second stop). The architect decided it in `RD-11`. **Resume at item 5, from the architect's commit that adds this section.** `e9da25c08`'s allow list and its 31 repairs stand as reported.

- In the root `eslint.config.ts`, set `@typescript-eslint/no-generated-empty-object-type` to `off`. Its comment names the `allow` of `typescript/no-empty-object-type` in `.oxlintrc.json`.
- Add `@typescript-eslint/no-unnecessary-type-parameters` to the block after `buildFromOxlintConfigFile` that turns off rules oxlint duplicates.
- Change no source file. `ButtonGroupCore.ts`, `ListItemCore.ts` and `DOM.ts` stay as they are.
- **Check:** with `DOM.ts`'s `oxlint-disable-next-line` comment removed in a scratch edit, oxlint reports `no-unnecessary-type-parameters` there, from core's directory and from the root. Revert. Save the output.
- **Check:** ESLint, run from each package's directory and from the root, reports no error, and oxlint reports none either.
- Then item 5's last bullets: `just fmt-check`, `just lint` and `just typecheck` on a fresh checkout after `npm ci`. Then continue with item 6.

## Resuming with Safari as the third engine

**Dated 2026-11-16.** The owner corrected O2: _WebKit_ means real Safari on a macOS runner (O13). The architect decided it in `RD-12`, which amends `RD-6`, `RD-8` property 1 and `RD-9` property 1. **Continue from the architect's commit that adds this section,** with the work in progress. At `9c96be2d8` the `webkit` job runs Playwright's WebKit on `ubuntu-24.04`, and pull request #27's first run uses it.

- **Playwright WebKit's results aren't an inventory.** Register no finding and disable no row for them. If you already did, revert it and say so in the report. The readings of `static`, `chromium`, `firefox` and `measurements` stand.
- Items 2, 7 and 8 and the checks below now say Safari. Do this work in this order:

1. **Dependencies** (`RD-12` property 2). Add `@vitest/browser-webdriverio` and `webdriverio` as exact root `devDependencies`. Show with `npm ls @vitest/browser` that one copy, 5.1.0, resolves.
2. **Engine selection** (`RD-12` properties 1 and 3). `safari` replaces `webkit` in the shared factory. A Safari project uses the WebdriverIO provider with `{ browser: 'safari' }`, isn't headless, has one worker and no file parallelism, and has Vitest's trace view off. Chromium and Firefox projects don't change. drag's `test-engines` sets no engine list (`RD-13` property 7; this step said `MX_TEST_ENGINES=chromium,firefox`).
3. **The workflow** (`RD-12` property 6). Rename the job `webkit` to `safari`, on `macos-26`. It installs no Playwright browser. Before the tests, it runs `sudo safaridriver --enable` and logs the macOS version (`sw_vers`) and Safari's version. It runs `npx just test --project '*/safari' --tags-filter '!measurement'` with `MX_TEST_ENGINES=safari`. (Amended at `347d4e499`: it runs `npx just test-safari --tags-filter '!measurement'`; see _Resuming after the Safari driver stop_.) `verify` needs `safari` in place of `webkit`. Nothing else in the workflow changes for Safari.
4. **A first CI reading, before the commands.** Push and read whether `npm ci` succeeds on macOS and whether each Safari project loads. A project that can't load is a stop (`RD-8` property 5). So is an `npm ci` failure on macOS: report it with its output, and don't edit the lockfile to get past it.
5. **The test frame** (`RD-12` property 3). From inside a Safari test in CI, read the frame's inner size and whether a scale transform applies to it. It must be 1280 × 720, unscaled. If it isn't, make the Safari window large enough in the Safari configuration, and read again. Save both readings. (Amended at `83ff45024`: also read the top-level viewport, which must contain the whole frame; see _Resuming after the Safari inventory_.)
6. **Commands** (`RD-12` property 4). Give each repository browser command that a Safari row calls a WebdriverIO implementation, with the same name, arguments, result and coordinate frame. Pointer state lasts from `pointerDown` to `pointerUp`. A command with no WebDriver counterpart throws an error that names the command and the provider. Rows that compare `server.browser` with engine names, such as `click-guard.browser.test.ts:372`, name `safari`.
7. **Rows limited for Safari** (`RD-12` property 5). Give each row that needs a command Safari's driver lacks an engine condition, including the reduced-motion reset in `landing.browser.test.ts`'s `beforeEach`. List each row and the command it needs. A row that fails in Safari for any other reason is an `RD-8` row, not a limited one.
8. **Item 8 in Safari:** the inventory, the dispositions under `RD-8` properties 2 and 4 and three CI runs for intermittent failures. Findings use the same registers as item 6.
9. `.devcontainer/post-create/playwright-browsers.sh`'s comment says why the devcontainer installs no WebKit: CI runs Safari, and nothing runs Playwright's WebKit.

**Stops added by `RD-12`:** an incompatibility between the provider and Vitest 5.1.0 other than the trace view; a test frame that can't be made unscaled at 1280 × 720; and a command whose Playwright behavior WebDriver actions can't reproduce, such as a coordinate frame that differs. Report each with its output.

## Recording baselines on GitHub's runner

**Dated 2026-11-16.** The unit stopped on the visual result at run 43813617164 (`RD-8` property 5, `RD-9` property 4): the `chromium` job doesn't reproduce 16 of the 19 baselines recorded in the devcontainer. The owner decided that baselines are recorded on GitHub's runner by a separate workflow that proposes them in a pull request, and that local runs are Chromium only, without visual. The architect decided it in `RD-13`, which amends `RD-2`, `RD-6`, `RD-9`, `RD-12` and `drag:DRO-18`. **Continue from the architect's commit that adds this section.** The Safari work above continues in parallel. Where this section and the Safari section disagree about local engines, this section governs.

1. **The stop's evidence.** Commit the images under `visual/ci-run-43813617164/` and the report's account of the stop, with the run's link, if they aren't committed yet.
2. **Local runs** (`RD-13` property 7):
   - the shared factory declares the visual project only when `MX_TEST_VISUAL=1`, and the gate's `chromium` job sets the variable;
   - remove material-x's `test-visual` and `test-visual-update` recipes, and change the two places in `.claude/skills/test-component/SKILL.md` that name them: the table row's command, and _"Update baselines only via `just test-visual-update`"_. Both now say that the recording workflow records baselines (`repo:RD-13`) and that visual runs only in CI;
   - the devcontainer's post-create and on-start scripts install only Playwright's Chromium, and their comment says why;
   - drag's `test-engines` sets no `MX_TEST_ENGINES`, so it runs the engines the variable lists, Chromium by default.
3. **Diagnostics** (`RD-13` property 9). Before the tests, the gate's `chromium` job logs `ImageOS`, `ImageVersion` and the processor model.
4. **The recording workflow** (`RD-13` properties 1 to 6), `.github/workflows/baselines.yml`, with the triggers, the two jobs and their permissions, the proposal branch and pull request, the dispatch of `verify` for a proposal into `main`, and concurrency. The `record` job runs the visual project with Vitest's update flag through the root `just test`, with `MX_TEST_VISUAL=1`, and logs what property 9 names. Third-party actions are pinned to a full commit hash.
   - **Before relying on it,** show what Vitest 5.1.0's update flag writes for a baseline that still matches. If it rewrites the file, `record` uploads only the files whose comparison failed or that didn't exist (`RD-13` property 4).
   - **Check:** the path filter of `propose` accepts every current baseline path and refuses a path outside `__screenshots__/` and a file that isn't PNG. Run the filter on a list of paths, and save the output.
5. **Owner setup**, through the coordinator: the label `record-baselines` exists, and the repository setting _Allow GitHub Actions to create and approve pull requests_ is on. Without it, `gh pr create` fails with `GITHUB_TOKEN`.
6. **This unit's recording.** Push. Then the label goes on pull request #27, added by the owner, or by you if the owner's prompt authorizes it. The workflow records all 19 baselines on the runner and opens a proposal from `baselines/ci/verification` into `ci/verification`. In the report, give the run's link, the files that it added or changed (16 are expected), and the runner image's version and processor model. **Ask the owner, through the coordinator, to review and merge the proposal. Don't merge it.** The owner's review of this proposal is design §5's step 1. Item 1's old, new and diff images remain the evidence of the change from Liberation Sans to Roboto.
7. **Reproduction.** After the owner merges, pull request #27's `verify` runs.
   - Confirm that every baseline matches in the `chromium` job.
   - Rerun the job twice more, so that there are three runs. Note the runner image's version and the processor model of each run.
   - **Stop** (`RD-8` property 5, `RD-9` property 4) if the runner doesn't reproduce the workflow's own recording, or a visual row is intermittent over the three runs. Save the diff images. Don't record again to make CI pass.
8. **A second labeled run** on pull request #27, after the merge, pushes nothing and opens nothing, and its summary says so. This is the check that property 4's _"when nothing changed"_ holds.

**Stops added by `RD-13`:** the runner doesn't reproduce a recording made on the runner; a visual row is intermittent in CI; and the token can't push `baselines/*`, open the proposal or dispatch `verify`. A repository rule that refuses these is reported, not worked around.

## Resuming after the Safari driver stop

**Dated 2026-11-16.** The `safari` job stopped at run 43821740209 ([evidence](checks/safari-driver-stop.txt), committed at `347d4e499`). `browser/material-x/safari` ran all 141 tests, and each later Safari project failed to open Safari. The architect amended `RD-12` properties 3, 6 and 8. Within one Vitest process, Vitest opens the next project's browser before `RD-3`'s release closes the previous project's session. Safari allows one session, and `safaridriver` allows one driver per Node process. **So each Safari project runs in its own Vitest process.** **Continue from the architect's commit that adds this section.** The Safari section's steps 1 to 5 and the input commands of `347d4e499` stand.

1. **Push timing.** Push `347d4e499`, and the architect's commit on top of it, only after pull request #27's `chromium` reproduction runs have finished. `verify` cancels a pull request's run that is in progress when a new commit arrives.
2. **The recipe `test-safari`** in the root `Justfile` (`RD-12` property 6):
   - it sets `MX_TEST_ENGINES=safari`;
   - it builds what `test` builds, once. Share those build steps with `test`, for example through a private recipe that both depend on, instead of copying them;
   - it lists the Safari projects with `vitest list --filesOnly --json` and takes the distinct project names. The listing opens no browser (`RD-12`'s readings at `347d4e499`);
   - it runs `vitest run --project <name>` with the recipe's arguments, once per listed name and one after another. It continues after a project fails, logs each name and exit status, and exits non-zero if the listing fails or is empty, or if any project's run fails.
   - **Check:** for each listed name, `vitest list --filesOnly --json --project <name>` lists exactly that project's files and no other project's. Names end in `(safari)`, so quote them. Save the output.
   - **Check:** the recipe exits non-zero when its listing finds no project. Show this with a scratch edit that makes the listing empty, and revert it. Save the output.
3. **The workflow.** The `safari` job's test step runs `npx just test-safari --tags-filter '!measurement'`. The step no longer needs `MX_TEST_ENGINES`. Nothing else in the job changes. (Amended at `83ff45024`: the job also turns off Reduce Motion before the tests; see _Resuming after the Safari inventory_.)
4. **The CI reading.** Push, observing step 1. In the `safari` job, every listed Safari project opens Safari and runs, and the log names each project and its exit status. Then continue with the Safari section's steps 6 to 8. A project's test failure is an `RD-8` row, not this stop.

**Stops added at `347d4e499`:**

- a Safari project that can't open Safari when it is the only project in its Vitest process;
- a listing that opens a browser;
- a listed name whose `--project` selection isn't exactly that one project.

Report each with its output.

## Resuming after the Safari inventory

**Dated 2026-11-16.** In run 43827320614, every Safari project ran. `browser/drag` failed 29 rows and `consumer/drag` failed 27. The probe of run 43829273272 found two causes: Safari on the runner reports `prefers-reduced-motion: reduce`, and the top-level viewport is 1280 × 668, which clips the 1280 × 720 frame. The architect amended `RD-12` property 3's last item and added property 10. **Continue from the architect's commit that adds this section.** `2497189df` committed the inventory, grew the Safari window and removed the probe.

1. **Evidence.** Save the probe's output from run 43829273272's log under `checks/`: the `PROBE env` line, and the pointer readings you use. The readings in steps 2 and 3 come from a scratch test run in CI, which you remove after it gives them.
2. **The window** (`RD-12` property 3). `2497189df` grows the window until the frame fits. From inside a Safari test in CI, read the top-level viewport's size, the frame's inner size and whether a scale transform applies. Save the reading. The Safari section's step 5 already allows this change.
3. **Reduce Motion** (`RD-12` property 10). In the `safari` job, add a step after `sudo safaridriver --enable` and before the tests. The step:
   - turns Reduce Motion off as the runner's user, not with `sudo`, for example with `defaults write com.apple.universalaccess reduceMotion -bool false`;
   - reads the value back and logs it;
   - fails if the value isn't off.

   **Check:** from inside a Safari test in that run, `matchMedia('(prefers-reduced-motion: reduce)').matches` is `false`. Save the reading.
   - drag's two reduced-motion rows and the reset in `landing.browser.test.ts`'s `beforeEach` stay limited to `canEmulateReducedMotion` (`bacc42841`). Give no other row an engine condition for motion.

4. **A new inventory.** Run the job again with the probe removed, and save its inventory. Rows that failed only because of the preference or the clipped viewport must now pass. Each row that still fails in Safari goes through the Safari section's step 8 under `RD-8`, as item 6 describes. Examples are the `commit` scroll example's offset and `flight.effect` in the keyboard-command row; they aren't disabled as part of this section.

**Stops added at `83ff45024`:**

- the runner's user can't turn Reduce Motion off, or the value read back isn't off;
- Safari still reports `reduce` after the step;
- the window can't be made large enough for the top-level viewport to contain the frame.

Report each with its output, and don't limit or disable rows to get past it.

## Owner preconditions

From the design §5. Ask through the coordinator for any that is missing when you reach the item that needs it. Don't guess.

- **The owner's review and merge of the baseline proposal** (step 1), before the pull request merges. _Recording baselines on GitHub's runner_ asks for it.
- **The label `record-baselines` and the setting that lets GitHub Actions create pull requests** (step 1), needed by that section's step 6.
- **`CODECOV_TOKEN`** (step 2), needed in item 8 for the upload to succeed.
- **A pull request that is not a draft,** from `ci/verification` to `main` (step 3), needed by item 8. Open it yourself only if the owner's prompt authorizes it. Never merge it.

## 1. The pinned visual environment (`RD-9`)

- **Chromium is Playwright's build** (`RD-9` property 1). Remove `CHROME_EXECUTABLE`, the `/usr/local/bin/chrome` default and `executablePath`. Launch the full Chromium build in new headless mode. Before relying on the configuration, show which binary Playwright starts and its version, from `browser.version()` and the process's executable path: Chromium 158.0.8127.18, not `chromium-headless-shell`. Keep the launch arguments that `RD-6` property 6's rows need.
- **The devcontainer** installs the locked Chromium build with `npx playwright install chromium` when it is created and each time it starts (`RD-13` property 7; this bullet said _"Chromium and Firefox builds"_), through `.devcontainer/post-create/` and `.devcontainer/on-start/`. Leave `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` as it is, so `npm ci` downloads nothing. A missing build fails with Playwright's own message, which names the install command.
- **Roboto** (`RD-9` property 2). Add an npm package that ships Roboto's font files, such as `@fontsource/roboto`, as an exact `devDependency` of `@ydinjs/material-x`. Load the faces the fixtures use as web fonts in `tests/support/browser-setup.ts`, as the icon font is loaded, and await them before the first fixture. Set the text stacks there to Roboto alone. The icon font doesn't change.
- **Superseded by `RD-13`:** the baselines are recorded on the runner by the recording workflow. This bullet's work is done and stays as evidence. It said: **Re-record the baselines once** (`RD-9` property 5), in the devcontainer, with the explicit update command, in a commit that changes only files under `__screenshots__/`. Before re-recording, run the visual suite once against the old baselines and save its diff images. In the report, list each baseline as changed or unchanged, and attach the old image, the new image and the diff for each changed one. **Ask the owner, through the coordinator, to review them.** The unit can continue meanwhile, but the pull request doesn't merge until the owner has reviewed them.
- Nothing else is guarded in advance (`RD-9` property 4). Add no fontconfig configuration, no font-usage check and no version check.

## 2. One engine selection (`RD-6` property 4)

- `MX_TEST_ENGINES` in `.scripts/vitest-config.ts`, with the behavior and names `RD-6` property 4 states. Visual projects, node projects and declaration projects are declared once, whatever the variable says.
- In a run whose list doesn't include `chromium`, no Chromium browser project is declared, so the Firefox and Safari jobs run only their engine's projects together with the node and declaration projects. A CI job selects only the browser projects with `--project`.
- Delete `createDragAllEnginesTestConfig` and `packages/drag/vitest.engines.config.ts`. drag's `test-engines` sets no engine list against `vitest.config.ts` (`RD-13` property 7). It runs `browser` and `shipped` locally, and their Firefox projects when the list names Firefox (`RD-13` property 7). Whether it also runs drag's node projects is your choice. Say which in the report.
- `assignGroupOrder` still gives each browser project its own group, so `RD-3` and the one-shot release hold with three engines in one process.
- Each browser project's non-Chromium variants take over the existing `isChromium`-style conditions. Add an engine condition to a row only where the row needs an instrument that an engine's driver lacks (`RD-6` property 6, `RD-12` property 5). A row that fails for any other reason falls under `RD-8`.

## 3. Measurement rows (`RD-7` properties 1 to 3)

- Declare the Vitest tag `measurement` in the shared factory, with a one-line description. Before relying on it, confirm against Vitest 5.1.0 that `--tags-filter` selects and excludes tagged rows, including inside `it.each`.
- Split each composition in `size.node.test.ts` into a graph row (`present`, `absent`) and a ceiling row (ceiling and control). Only the ceiling row carries the tag. `violations` can split into two functions or take a selector. The messages stay word for word, and `npx just size` still prints and exits as before.
- Tag the two allocation rows in `hot-path.browser.test.ts`. Search every package for any other row that matches `RD-7` property 1, and list what you found and what you didn't tag, with reasons.

## 4. Machine-readable sizes and the size report (`RD-7` property 5)

- Each instrument that the root `just size` runs gives a machine-readable reading on request: `bench/size/measure.ts` for drag, and size-limit's `--json` for `box-quad` and `core`. A reading names the package, the row, the Brotli bytes, the gzip bytes where the instrument reports them, and the row's limit.
- A repository script under `.scripts/` combines a head reading and an optional base reading into the comment's Markdown, with the hidden marker. It is pure: it takes files and writes text, and it calls no network. It has `repo` node tests for a row that grew, shrank or stayed the same, a row added or removed, a row over its limit, and a missing base reading.
- The workflow posts or updates the comment. That is the only step that writes to the pull request.

## 5. Static checks (`RD-8` properties 2 and 3)

- Lint stops reading `.plan/` directories. Use the lint configuration, not a disable comment in a file.
- Format the tracked `.plan/` files that `fmt-check` reports. Check that the diff is whitespace only. If any file's data changes, stop.
- **Names that another program defines** (`RD-10`). Add each name the report lists to `camelcase`'s `allow` option in the root `eslint.config.ts`, as an anchored exact pattern, grouped by the interface that fixes it, with one comment per group that names the interface. Don't change the rule's level or its `properties` option, and add no file-scoped override. Before adding any name, check that it meets `RD-10` property 2. A name that doesn't qualify is renamed, or is a stop if another program reads it.
- **Repair every other lint error** under `RF-32`'s required property: the report's 34. A repair under `src/` shows that the emitted JavaScript is unchanged. Where a `require-unicode-regexp` repair adds `u` or `v`, show that the pattern matches the same strings, for example by running both patterns over the inputs the code passes them. If a pattern can't take either flag without matching differently, stop.
- Rerun each package's lint with oxlint and ESLint run separately, as the report's inventory did, so that ESLint is read even where oxlint fails.
- On a fresh checkout after `npm ci`, the root `just fmt-check`, `just lint` and `just typecheck` exit 0.
- **Check:** with one listed name changed to a near miss in a scratch edit (`session_idx`), ESLint reports it. Revert.

## 6. The local inventory and its dispositions (`RD-8`)

- Run the root suite in Chromium, with coverage and without `measurement` rows, as CI will. Then run every browser project except visual in Firefox. List every failing row with its file, its engine, its first error line, and whether it failed in all five runs.
- Handle each row under `RD-8` properties 2 and 4. `RF-29`'s `tproc` row is the first one. Register each disabled row as a finding: `drag:DRF-` for drag, and `repo:RF-` from `RF-33` for everything else. Each finding states the required property, and the marking cites the finding's address.
- **A measurement row isn't disabled.** It is outside the gate, and CI reports it (`RD-7`). If one fails, register a finding in its owner's register, leave the row as it is, and note in the finding that the local `npx just test` fails on it until the owner of the budget decides. **`hot-path.browser.test.ts:261`**, which allocates 28 to 37 B per move against 16 in Chromium 158, becomes a `drag:DRF-` finding. The budget is drag's, and the CI unit doesn't change it.
- **`radio.visual` _should match the selection state matrix_** is `RF-29`'s row, and it is intermittent (1 in 5). First look for a cause in the test, such as a state that hasn't settled before the screenshot, and repair it there if you find one. Otherwise skip it in Chromium under `RD-8` property 4, with the marking citing `repo:RF-29`, and add a dated note to `RF-29`. The owner then decides under `RD-9` property 4.
- Stop under `RD-8` property 5. Report the inventory as it is at the stop.

## 7. The workflow (`RD-6`, `RD-7` property 4)

- `.github/workflows/verify.yml`, with the triggers, jobs, runner, permissions and aggregate check that `RD-6` states, and the measurement job that `RD-7` states. The jobs and their commands are in the design §3.
- `codecov.yml`: project and patch statuses are informational. Coverage covers source under `packages/*/src/`, not tests, fixtures, `.scripts/` or build output.
- The `chromium`, `firefox` and `measurements` jobs install their browser with `npx playwright install --with-deps <engine>`. Cache Playwright's download directory keyed on the lockfile, if you cache anything. The `safari` job installs no browser (`RD-12` property 6).
- The reporter rule from `RD-2` (2026-11-05): each test job reads the exit status and keeps a base-family reporter.
- Each job's `timeout-minutes` is about twice its slowest observed duration in item 8.

## 8. CI readings and the Safari and visual dispositions

- Push `ci/verification`. On the pull request, read the four gate jobs and the measurement job. **Pushing intermediate states of this branch for CI readings is part of this unit.**
- Handle Safari failures under `RD-8`, as in item 6. The local five-run test for intermittent failures becomes three CI runs of the job.
- **The visual suite in CI:** confirm from the job's log that Chromium is 158.0.8127.18, and that every baseline the recording workflow recorded matches (_Recording baselines on GitHub's runner_, step 7). If one doesn't, or a visual row is intermittent over three runs, stop (`RD-8` property 5, `RD-9` property 4). Save the diff images. Don't re-record anything to make CI pass. The owner decides.
- Iterate until `verify` passes, the Codecov upload succeeds, and the measurement job posts the comment with "no base reading", since `main` has no machine-readable reading yet.

## Checks

- Every check in items 1 to 8, with its output saved under `.plan/ci-verification-1/` and cited.
- **Chromium:** the binary and version read in item 1, locally and in CI.
- **Roboto:** with the package's faces removed from the load list, the visual run fails at the load, not at a comparison. Revert.
- **Engine selection:** the project list (`vitest list --json` or an equivalent that only lists) for the default, for `MX_TEST_ENGINES=firefox`, for `MX_TEST_ENGINES=safari`, and for all three engines, at the root and for drag. Read the Safari lists locally with a listing that starts no browser, such as `--filesOnly`. If every listing starts one, read them in CI. drag's `test-engines` lists `browser` and `shipped` by default, and `browser/firefox` and `shipped/firefox` beside them with `MX_TEST_ENGINES=chromium,firefox`. `MX_TEST_ENGINES=webkit` gives the unknown-engine error.
- **Visual selection:** the default project list at the root and in material-x has no visual project. With `MX_TEST_VISUAL=1` it has one, in Chromium.
- **Safari:** the job log names the macOS and Safari versions, each Safari project with its exit status, and the Reduce Motion value read back; Safari reports no reduced-motion preference; the top-level viewport contains the frame; the frame reading of the Safari section's step 5; a Safari project's resolved configuration shows `headless: false`, one worker and the trace view off, and a Chromium project's shows Vitest's default trace view; calling a command that has no WebDriver counterpart with a WebdriverIO context throws the named error. Show the last one with a scratch call, and revert it.
- **Measurement tag, with mutations:** lowering one drag ceiling by 1 B fails only that ceiling row, under both `npx just test` and `--tags-filter measurement`. The run with `!measurement` passes. Adding to a composition's fixture an import of a module that its `absent` list forbids fails that composition's graph row under `!measurement`. Revert both.
- **Measurement job:** on the pull request, with one ceiling lowered by 1 B in a pushed commit, the comment and the summary report the excess, the job and `verify` succeed, and the run's conclusion is success. Revert the commit and push again.
- **The gate:** on the pull request, with one intentionally failing gate row in a pushed commit, `verify` fails. Revert and push again.
- **Draft:** marking the pull request as a draft and pushing skips every job. Ask the owner to do this if you can't.
- The Verify steps of [`handoff.md`](../../.agents/docs/handoff.md) for every changed file.

## Stops

`RD-8` property 5, a formatted `.plan/` file whose data changes (item 5), the Safari stops in _Resuming with Safari as the third engine_, _Resuming after the Safari driver stop_ and _Resuming after the Safari inventory_, the stops in _Recording baselines on GitHub's runner_, and any requirement in `RD-6`, `RD-7`, `RD-12` or `RD-13` that the tools can't meet as written. Report each stop with its output. Don't change a decision's requirement to get past it.

## Report

`.plan/ci-verification-1/ci-verification-report.md`: each item's changes as `file:line`, the inventory with each row's handling and finding, each check and its result, the CI run links, the job durations, any stop, and the commits.

The unit stops at the pushed report, with `verify` green on the pull request. Next, the architect reads the report. The owner turns on the branch rule after the pull request is merged (design §5, step 5).
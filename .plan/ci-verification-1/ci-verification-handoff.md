# Handoff: CI verification, first unit

**Recipient:** the implementer. **Branch:** `ci/verification`. **Input:** the architect's record commit that revises this handoff, from `81d4c91b1`. The code base is unchanged since `a8726c57d`.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-6`: the workflow, the runner, the engine selection, coverage and the aggregate check;
- `repo:RD-9`: the pinned visual environment, the one-time re-recording, and how the environment changes later;
- `repo:RD-10`: names that another program defines, and how they pass `camelcase`;
- `repo:RD-7`: measurement rows and the size comment;
- `repo:RD-8`: the checks that fail today, the reading at `a8726c57d`, and the stops;
- `repo:RD-2`: the order and acceptance this unit works toward, and its reporter rule (dated 2026-11-05);
- `repo:RF-29` and `repo:RF-32`, which `RD-8` takes into this unit;
- `drag:DRO-18`: WebKit doesn't run locally.

The [design](ci-verification-design.md) describes the workflow and the owner's setup. Where a decision and the design disagree, the decision is authoritative.

**Scope:** `.github/workflows/`, `codecov.yml`, `.devcontainer/` (its post-create and on-start scripts), the root and material-x `package.json` and the lockfile (for the Roboto package only), `.scripts/`, the root and package `Justfile`s, lint and format configuration, `packages/*/tests/`, including material-x's baselines, `packages/drag/bench/size/measure.ts`, `packages/drag/vitest.engines.config.ts` (deleted), the `.plan/` files that `RD-8` property 3 formats, and new findings in the `repo` and `drag` registers. **No product source under `packages/*/src/` changes,** apart from lint repairs that change no emitted behavior. `docs.yml` doesn't change.

## Resuming after the stop at item 5

**Dated 2026-11-16.** The unit stopped under `RD-8` property 5 and reported at `c2dbf6292` ([report](ci-verification-report.md)). The architect decided the stop in `RD-10`. **Resume from item 5, from the architect's commit that adds this section.** Items 1 to 4 and item 5's first two bullets stand as reported. These points from the report are settled:

- **The `camelcase` sites:** item 5 now carries `RD-10`. No file under `.claude/` changes.
- **material-x's five `main.styles.css` files** are authored and tracked, so formatting them was the right repair. Item 5's last bullet no longer mentions them.
- **`placement.ts`'s trailing commas** are not a data change. The program is the one that ran.
- **Visual is declared only when the list names `chromium`** (report §2). That reading is accepted.
- **19 baselines, not 23.** `RD-9`'s reading is corrected.
- **`bench/compare.ts`'s `CHROME_EXECUTABLE`** stays out of this unit. It is a manual comparison, not a test run. It is carried in the design's §6.

## Owner preconditions

From the design §5. Ask through the coordinator for any that is missing when you reach the item that needs it. Don't guess.

- **The owner's review of the re-recorded baselines** (step 1), before the pull request merges. Item 1 asks for it.
- **`CODECOV_TOKEN`** (step 2), needed in item 8 for the upload to succeed.
- **A pull request that is not a draft,** from `ci/verification` to `main` (step 3), needed by item 8. Open it yourself only if the owner's prompt authorizes it. Never merge it.

## 1. The pinned visual environment (`RD-9`)

- **Chromium is Playwright's build** (`RD-9` property 1). Remove `CHROME_EXECUTABLE`, the `/usr/local/bin/chrome` default and `executablePath`. Launch the full Chromium build in new headless mode. Before relying on the configuration, show which binary Playwright starts and its version, from `browser.version()` and the process's executable path: Chromium 158.0.8127.18, not `chromium-headless-shell`. Keep the launch arguments that `RD-6` property 6's rows need.
- **The devcontainer** installs the locked Chromium and Firefox builds with `npx playwright install chromium firefox` when it is created and each time it starts, through `.devcontainer/post-create/` and `.devcontainer/on-start/`. Leave `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` as it is, so `npm ci` downloads nothing. A missing build fails with Playwright's own message, which names the install command.
- **Roboto** (`RD-9` property 2). Add an npm package that ships Roboto's font files, such as `@fontsource/roboto`, as an exact `devDependency` of `@ydinjs/material-x`. Load the faces the fixtures use as web fonts in `tests/support/browser-setup.ts`, as the icon font is loaded, and await them before the first fixture. Set the text stacks there to Roboto alone. The icon font doesn't change.
- **Re-record the baselines once** (`RD-9` property 5), in the devcontainer, with the explicit update command, in a commit that changes only files under `__screenshots__/`. Before re-recording, run the visual suite once against the old baselines and save its diff images. In the report, list each baseline as changed or unchanged, and attach the old image, the new image and the diff for each changed one. **Ask the owner, through the coordinator, to review them.** The unit can continue meanwhile, but the pull request doesn't merge until the owner has reviewed them.
- Nothing else is guarded in advance (`RD-9` property 4). Add no fontconfig configuration, no font-usage check and no version check.

## 2. One engine selection (`RD-6` property 4)

- `MX_TEST_ENGINES` in `.scripts/vitest-config.ts`, with the behavior and names `RD-6` property 4 states. Visual projects, node projects and declaration projects are declared once, whatever the variable says.
- In a run whose list doesn't include `chromium`, no Chromium browser project is declared, so the Firefox and WebKit jobs run only their engine's projects together with the node and declaration projects. A CI job selects only the browser projects with `--project`.
- Delete `createDragAllEnginesTestConfig` and `packages/drag/vitest.engines.config.ts`. drag's `test-engines` sets `MX_TEST_ENGINES=chromium,firefox,webkit` against `vitest.config.ts`. It runs the same browser and shipped projects under the same names as at `a8726c57d`. Whether it also runs drag's node projects is your choice. Say which in the report.
- `assignGroupOrder` still gives each browser project its own group, so `RD-3` and the one-shot release hold with three engines in one process.
- Each browser project's non-Chromium variants take over the existing `isChromium`-style conditions. Add such a condition to a row in another package only where the row needs a Chromium-only instrument (`RD-6` property 6). A row that fails for any other reason falls under `RD-8`.

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
- Each job that runs a browser installs it with `npx playwright install --with-deps <engine>`. Cache Playwright's download directory keyed on the lockfile, if you cache anything.
- The reporter rule from `RD-2` (2026-11-05): each test job reads the exit status and keeps a base-family reporter.
- Each job's `timeout-minutes` is about twice its slowest observed duration in item 8.

## 8. CI readings and the WebKit and visual dispositions

- Push `ci/verification`. On the pull request, read the four gate jobs and the measurement job. **Pushing intermediate states of this branch for CI readings is part of this unit.**
- Handle WebKit failures under `RD-8`, as in item 6. The local five-run test for intermittent failures becomes three CI runs of the job.
- **The visual suite in CI:** confirm from the job's log that Chromium is 158.0.8127.18, and that every baseline re-recorded in item 1 matches. If one doesn't, or a visual row is intermittent over three runs, stop (`RD-8` property 5, `RD-9` property 4). Save the diff images. Don't re-record anything to make CI pass. The owner decides.
- Iterate until `verify` passes, the Codecov upload succeeds, and the measurement job posts the comment with "no base reading", since `main` has no machine-readable reading yet.

## Checks

- Every check in items 1 to 8, with its output saved under `.plan/ci-verification-1/` and cited.
- **Chromium:** the binary and version read in item 1, locally and in CI.
- **Roboto:** with the package's faces removed from the load list, the visual run fails at the load, not at a comparison. Revert.
- **Engine selection:** the project list (`vitest list --json` or an equivalent that only lists) for the default, for `MX_TEST_ENGINES=firefox`, and for all three engines, at the root and for drag. drag's `test-engines` names equal those at `a8726c57d`.
- **Measurement tag, with mutations:** lowering one drag ceiling by 1 B fails only that ceiling row, under both `npx just test` and `--tags-filter measurement`. The run with `!measurement` passes. Adding to a composition's fixture an import of a module that its `absent` list forbids fails that composition's graph row under `!measurement`. Revert both.
- **Measurement job:** on the pull request, with one ceiling lowered by 1 B in a pushed commit, the comment and the summary report the excess, the job and `verify` succeed, and the run's conclusion is success. Revert the commit and push again.
- **The gate:** on the pull request, with one intentionally failing gate row in a pushed commit, `verify` fails. Revert and push again.
- **Draft:** marking the pull request as a draft and pushing skips every job. Ask the owner to do this if you can't.
- The Verify steps of [`handoff.md`](../../.agents/docs/handoff.md) for every changed file.

## Stops

`RD-8` property 5, a formatted `.plan/` file whose data changes (item 5), and any requirement in `RD-6` or `RD-7` that the tools can't meet as written. Report each stop with its output. Don't change a decision's requirement to get past it.

## Report

`.plan/ci-verification-1/ci-verification-report.md`: each item's changes as `file:line`, the inventory with each row's handling and finding, each check and its result, the CI run links, the job durations, any stop, and the commits.

The unit stops at the pushed report, with `verify` green on the pull request. Next, the architect reads the report. The owner turns on the branch rule after the pull request is merged (design §5, step 5).
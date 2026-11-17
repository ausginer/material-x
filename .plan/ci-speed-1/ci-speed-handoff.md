# Handoff: a faster gate, with WebKit in place of Safari, a `[noci]` path, and the installer chosen by measurement

**Recipient:** the implementer.

**Branch:** `repo/ci-speed-1`, from `main` at `21392e738` (pull request #30, squash-merged), with `d5fbdeed5` merged in at `229829ef7`. That merge brings only the Safari flake records: `RF-36`'s note, `drag:DRF-52` and the two logs. Its diff from `main` equals `d5fbdeed5`'s diff from its parent. **Input:** the architect's commit that adds this file.

**Decided** by the owner, relayed by the coordinator on 2026-11-17:

1. **Engines.** The required `verify` runs Chromium, Firefox and Playwright's WebKit, on Linux and headless. Real Safari leaves the gate for a separate workflow that no rule requires. It runs weekly, and can be started by hand on any branch or commit. Safari is not sharded for now.
2. **aube instead of npm for installs, if it holds the tree,** with a measurement against `npm ci` with `setup-node`'s cache deciding which wins.
3. **A commit-message marker, `[noci]`.** `verify` still runs, recognizes it, and succeeds quickly, but only if everything changed since the last fully verified commit is a record or Markdown.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-12`, amended 2026-11-17: the engines, the gate's WebKit job (property 11) and the Safari workflow (property 12);
- `repo:RD-6`, amended with it: properties 2, 3, 4, 7, 8 and 9;
- `repo:RD-15`, new: the `[noci]` marker;
- `repo:RD-16`, new: the installer, and the rule that decides it;
- `repo:RD-8` property 1 and `repo:RD-13` properties 7 and 8, amended;
- the Safari findings `repo:RF-36` and `drag:DRF-49` to `DRF-52`, and `drag:DRO-18`, each with a dated note of 2026-11-17.

The architect's readings are [`checks/aube-probe.txt`](checks/aube-probe.txt) and [`checks/webkit-local-probe.txt`](checks/webkit-local-probe.txt). The records hold the reasons and the alternatives weighed, and this file doesn't repeat them.

**Out of scope:**

- the harness simplification (`cl.sh` slots, worktrees, stacked pull requests, and removing `claude-role.sh` and the effort guard), which is the next unit;
- repairing any Safari finding;
- sharding Safari.

**Beside this file:** [`devimage-handoff.md`](devimage-handoff.md), for the agent that maintains the development image. It installs aube and WebKit's system libraries in the image. Nothing in this unit waits for it.

## What moving Safari out does to the Safari findings

Once this unit merges:

- The timing failures `RF-36` (three rows), `drag:DRF-49`, `DRF-50` and `DRF-52`, and `drag:DRF-51`'s 16 px offset, **stop failing `verify`.**
- **Their Safari conditions stay,** and apply to the weekly run. The two unskipped rows, `RF-36`'s third row and `DRF-52`'s, can still turn a weekly run red, and that run's issue names them.
- **None is closed.** No cause is established, and Safari still runs them.
- **The same rows run in WebKit in the gate.** This unit reads whether WebKit reproduces any of them (item 1). If WebKit passes them, that's evidence that the failures are particular to Safari, its driver or its runner, and not to the WebKit engine. It is a reading, not a repair, and the report states it.

## Item 1. WebKit in the gate (`RD-12` properties 1, 8 and 11, `RD-6`)

**Required properties:**

- **Engine.** `webkit` is an engine of `MX_TEST_ENGINES`, served by Playwright's provider with `deviceScaleFactor: 1`, as Firefox is. Its projects are `<name>/webkit`, and visual stays Chromium only.
- **Engine conditions.** No test file names `webkit` to be skipped:
  - a `safari` condition (`isSafari`, `server.browser === 'safari'`, `canEmulateReducedMotion`) doesn't cover WebKit;
  - an `isChromium` condition still limits a row to Chromium.
- **Keyboard.** `focus-layer.spec.browser.test.ts`'s `TAB` is unchanged: Option-Tab in Safari, and Tab everywhere else, WebKit included.
- **The `webkit` job.** `verify` replaces `safari` with `webkit`:
  - it runs on `ubuntu-24.04`;
  - it installs its engine with `npx playwright install --with-deps webkit`;
  - it runs `npx just test --project '*/webkit' --tags-filter '!measurement'` with `MX_TEST_ENGINES: webkit`, as `firefox` does;
  - `verify`'s `needs` names `webkit`, not `safari`.
- **Timeout.** `timeout-minutes` starts at Firefox's 20, then is set to about twice the longest WebKit run that this unit reads, which is the workflow's existing rule.
- **Parallelism** follows `RD-12` property 11's reading, below. Until that reading, WebKit is serial, as Firefox is.
- **Locally,** `.devcontainer/post-create/playwright-browsers.sh` installs `chromium webkit`, and its comment states `RD-13` property 7's sentence.
- **Documentation.** `.agents/docs/test-architecture.md` §CI policy and `verify.yml`'s header comment describe the new engine set and the Safari workflow.

**Witnesses:**

1. **The listing.** `MX_TEST_ENGINES=webkit npx vitest list --filesOnly --json --project '*/webkit'` lists the same projects and file counts as the Firefox listing, with `/webkit` in place of `/firefox`. Save both.
2. **The first WebKit run in CI** (on the pull request, below). Save its job log's summary.
   - **If any WebKit row fails, stop and return the inventory.** For each failing row, give the file, the row, the failure, and the result of five runs of its file (`RD-8` property 1), and say whether the row carries a Safari condition. The architect then decides each row. This includes the Safari findings' rows above.
3. **Keyboard.** The 9 keyboard-focus rows of `focus-layer.spec.browser.test.ts` pass in `spec/material-x/webkit`. **If Tab doesn't reach a button, checkbox or radio there, stop.** Don't substitute Option-Tab. `RD-12` property 11 says why.
4. **Reduced motion.** drag's rows that emulate reduced motion run, not skip, in `browser/drag/webkit`. The report lists their results.
5. **Parallelism.** Three consecutive runs of the WebKit job with `fileParallelism: true` and Chromium's worker count, each beside a serial run. The rule is `RD-12` property 11: parallel only if no row fails in parallel that passes serially, and the test step is at least 20 % faster. Save the six step times. The configuration and its comment state which case holds.

## Item 2. The Safari workflow (`RD-12` properties 6, 7 and 12)

**Required properties,** with `RD-12` property 12 as the reference:

- **The job.** `.github/workflows/safari.yml` holds today's `safari` job, moved unchanged:
  - remote automation;
  - Reduce Motion off and read back;
  - the macOS and Safari versions;
  - `npx just test-safari --tags-filter '!measurement'`.

  The `test-safari` recipe doesn't change.

- **Triggers.** A weekly `schedule`, and `workflow_dispatch` with an optional `ref` input that the checkout uses.
- **Concurrency.** It is grouped by the checked-out ref, and `cancel-in-progress` is false.
- **The issue job.** A second job runs only when the test job failed on a `schedule` event, and only it holds `issues: write`. It runs no repository code, so it has no checkout and no install. It opens one issue labelled `safari`, or comments on the open one, naming:
  - the run;
  - the commit;
  - the macOS and Safari versions;
  - each failed project.

  The test job passes those to it as outputs. The recipe already logs each project's exit status.

- **Permissions.** The test job has `contents: read` and nothing else.

**Witnesses.** `workflow_dispatch` can start only a workflow that exists on the default branch, so before the merge:

1. **A run on the branch:** add a `push` trigger limited to `repo/ci-speed-1` in a witness commit, read one run, and remove the trigger in a later commit. The run is green, or red only on rows the Safari findings name. Save its job list and the per-project statuses.
2. **The issue path,** only if the owner authorizes it (owner decision 2): in the same temporary form, make the test job fail on purpose, with a step that exits 1 after the tests, and let the issue job's condition accept a `push` event for that run. Read that it opens one issue. In a second run, read that it comments on that issue instead of opening another. Close the issue and remove both temporary changes. Save the issue's link. **Without that authorization,** the report says that the issue path is unwitnessed. The review then reads it.
3. **After the merge,** read by the coordinator and not owed before it: one `workflow_dispatch` on `main` with `ref` set to a commit SHA, and the first scheduled run.

## Item 3. The `[noci]` marker (`RD-15`)

**Required properties,** with `RD-15` properties 1 to 7 as the reference:

- **`scope`** is the first job of `verify`, and every other job of the workflow needs it, except `deploy`, which keeps needing only `docs`. It checks out with full history, and decides the mode in `.scripts/ci-scope.ts`, a Node script that uses only Node's built-in modules, `git` and `gh`. It installs no dependencies.
  - It outputs `mode`: `full` or `reduced`.
  - It logs _H_, _B_ with its run's link, the mode, and the paths that kept the run full. It writes the mode to the step summary.
- **Every gate job and `measurements`** runs only in full mode.
- **`records`** runs only in reduced mode. It runs the install, `npx just fmt-check`, and the record resolver's tests (`.scripts/entry.node.test.ts`).
- **`verify`'s check** follows `RD-15` property 5. For each job, it compares the result with the mode:
  - a job of the mode must be `success`;
  - a job outside the mode must be `skipped`.
- **Tests.** `.scripts/ci-scope.node.test.ts` tests the path rule and the mode decision. It builds its histories in a temporary `git` repository, as `entry.node.test.ts` does, and fakes the API's answer. Its cases:
  - a `.plan` directory at the root and in a package;
  - `.md` and `.mdx`;
  - a rename out of `.plan/`;
  - a merge commit;
  - an empty range;
  - no marker;
  - `[no ci]` with a space;
  - no _B_;
  - an API error;
  - _B_ not an ancestor.
- **The search for other readers** (`RD-15` property 4). Search tests, scripts, Storybook and TypeDoc configuration for anything that reads a `.plan/` path or a `.md` file as input. The report lists the matches and states for each one whether `records` covers it.

**Witnesses** on the pull request, each a pushed commit:

1. **Reduced:** a `[noci]` commit that changes one `.plan/` Markdown file. `scope` chooses `reduced`, `records` succeeds, and every other gate job is skipped. `verify` succeeds. Give its wall time.
2. **Full despite the marker:** a `[noci]` commit that changes a `.ts` file. `scope` chooses `full`, and the log names the file.
3. **The range:** push a commit that changes a `.ts` file, without the marker. While its run is in progress, push a `[noci]` commit that changes only `.plan/`. The first run is cancelled. The second chooses `full`, because _B_ comes before the `.ts` change, and the log names that file.
4. **`records` fails:** a `[noci]` commit with a misformatted `.md`. `records` fails, and `verify` fails. Repair it in the next commit.

Revert each witness's source change before the review.

## Item 4. The installer (`RD-16`)

1. **Hold the tree first** (`RD-16` property 2). On the branch, in a commit that switches every `npm ci` in `verify.yml` to aube 2.10.1 with the hoisted layout and `aube.allowBuilds`, read:
   - `aube why vite` and `aube why rolldown`;
   - `package-lock.json` unchanged;
   - `aube ignored-builds`, which lists only `edgedriver` and `geckodriver`;
   - every gate job, `docs-smoke` included;
   - the Safari workflow's install and listing, through the temporary `push` trigger of item 2.

   If any item fails, B is out. Revert the switch, and go to step 3 with that reason.

2. **Measure** (`RD-16` properties 3 and 4) with a temporary workflow, `.github/workflows/install-bench.yml`. It is triggered by `push` to this branch only, and removed before the review.
   - Each arm runs in fresh jobs on `ubuntu-24.04` and `macos-26`: one cold run, then five warm runs, one after another, so that each warm run restores the cache that an earlier run saved.
   - Read each time from the API's step timings, from the end of checkout to the end of the install.
   - Save the raw timings as `checks/install-bench.tsv`.
3. **Apply the rule.** If B wins, keep the switch, and extend it to the Safari workflow and `baselines.yml` (`RD-16` property 5). If A wins, `verify.yml` is as it was before step 1. Either way, the report gives the figures and the outcome, and the architect dates `RD-16` and the [dev image handoff](devimage-handoff.md) with it.

## Order

1. Items 1 and 2 locally: the listing witness, and the handoff's checks on every changed file. Commit.
2. Push. **Open a non-draft pull request** from `repo/ci-speed-1` to `main` (owner decision 1). Read the first run: item 1's witnesses 2 to 4, and item 2's witness 1.
3. Item 1's parallelism reading (witness 5).
4. Item 3 and its witnesses.
5. Item 4.
6. The report, then a final run in which every gate job and `verify` succeed, with every temporary trigger, workflow and witness change removed.

**Owed for every changed file** ([`handoff.md`](../../.agents/docs/handoff.md)):

- `npx oxfmt` on Markdown and YAML;
- the TypeScript checks on `.scripts/` and the test files;
- `git diff --check`;
- a reading of each workflow expression that changed.

## Stops

Return to the architect with what you have if:

- any WebKit row fails (item 1, witness 2);
- Tab doesn't reach a control in WebKit (item 1, witness 3);
- `scope` would reduce a run whose range holds anything outside `.plan/` and `*.md`;
- the search in item 3 finds a reader of records or Markdown that `records` can't run;
- `workflow_dispatch` with a SHA `ref` can't be made to check out that commit;
- the `verify` aggregate can't tell `skipped` from `success` per job;
- aube needs a change to `package-lock.json`, to the root `overrides` or to source to hold the tree.

## The report

Write `.plan/ci-speed-1/ci-speed-report.md`. It covers:

- **Per item:** what changed, the witnesses with run links, and the saved readings under `checks/`.
- **Item 1:**
  - the WebKit inventory, with the Safari findings' rows called out;
  - the parallelism figures and outcome;
  - the WebKit job's time, beside Firefox's and Chromium's.
- **Item 2:** the Safari run's per-project statuses, and the issue path, or why it is unwitnessed.
- **Item 3:** the reduced run's wall time against a full run's, and the search's matches.
- **Item 4:** the tree readings, the timing table, the medians and the rule's outcome.
- **What wasn't verified.**

## Owner decisions and authorizations

1. **Needed:** a non-draft pull request from `repo/ci-speed-1` to `main`, for the runs that items 1 to 4 read. `verify` runs on `pull_request` and on pushes to `main` only. Never merge it. The ruleset requires the branch to be up to date with `main`, so bring `main` in with a merge, not a rebase.
2. **Needed:** item 2's witness issue in this repository, opened by the workflow, commented on once and closed by the implementer. Without it, the issue path is unwitnessed until the first scheduled failure after the merge.
3. **No ruleset change.** The required check stays `verify`, and the Safari workflow is never required.
4. **Settled by the owner's decisions above,** and not reopened here: Linux and headless WebKit in the gate, Safari weekly and manual, no sharding, aube only through `RD-16`'s rule, and the `[noci]` range.

## Review before merge

A targeted feature-proof review reads the diff from `229829ef7` to the head. It covers:

- **`scope`:** that it can't reduce a run whose range holds a source change. Its tests, its fallback to full mode, and witness 3.
- **`verify`'s aggregate in both modes,** and that a cancelled or failed job fails it in either.
- **Permissions:**
  - only `scope` holds `actions: read`;
  - only the Safari issue job holds `issues: write`, and it runs no repository code;
  - the measurement, deploy and recording workflows are otherwise unchanged.
- **The WebKit inventory** and the parallelism reading against `RD-12` property 11.
- **If B won:** the tree readings against `RD-16` property 2, and the measurement against its rule.

It records at `.plan/reviews/ci-speed-1/feature-proof-claude.md`, and the architect decides its findings.

**Stopping boundary:** the report is committed and pushed, and the pull request is open with a green final run. The review follows.
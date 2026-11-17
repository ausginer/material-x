# Handoff: a faster gate, with WebKit in place of Safari, a `[noci]` path, and a full move to aube

**Recipient:** the implementer.

**Branch:** `repo/ci-speed-1`, from `main` at `21392e738` (pull request #30, squash-merged), with `d5fbdeed5` merged in at `229829ef7`. That merge brings only the Safari flake records: `RF-36`'s note, `drag:DRF-52` and the two logs. Its diff from `main` equals `d5fbdeed5`'s diff from its parent. **Input:** the architect's commit that adds this file.

**Decided** by the owner, relayed by the coordinator on 2026-11-17:

1. **Engines.** The required `verify` runs Chromium, Firefox and Playwright's WebKit, on Linux and headless. Real Safari leaves the gate for a separate workflow that no rule requires. It runs weekly, and can be started by hand on any branch or commit. Safari is not sharded for now.
2. **A full move from npm to aube,** for local development, CI and the records, with no speed condition. It was first decided as a measured choice, and amended the same day. Only a capital problem stops it. Yarn and pnpm are rejected. The owner's main concern is the supply chain, so only listed packages, at listed versions, run install scripts.
3. **A commit-message marker, `[noci]`.** `verify` still runs, recognizes it, and succeeds quickly, but only if everything changed since the last fully verified commit is a record or Markdown.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-12`, amended 2026-11-17: the engines, the gate's WebKit job (property 11) and the Safari workflow (property 12);
- `repo:RD-6`, amended with it: properties 2, 3, 4, 7, 8 and 9;
- `repo:RD-15`, new: the `[noci]` marker;
- `repo:RD-16`, new and amended the same day: aube, the lockfile, the script policy and the capital problems;
- `repo:RD-8` property 1 and `repo:RD-13` properties 7 and 8, amended;
- the Safari findings `repo:RF-36` and `drag:DRF-49` to `DRF-52`, and `drag:DRO-18`, each with a dated note of 2026-11-17.

The architect's readings are [`checks/aube-probe.txt`](checks/aube-probe.txt), [`checks/aube-policy-probe.txt`](checks/aube-policy-probe.txt) and [`checks/webkit-local-probe.txt`](checks/webkit-local-probe.txt). The records hold the reasons and the alternatives weighed, and this file doesn't repeat them.

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
2. **The issue path,** authorized by the owner (owner decision 2). In the same temporary form, make the test job fail on purpose, with a step that exits 1 after the tests, and let the issue job's condition accept a `push` event for that run. Read that it opens one issue. In a second run, read that it comments on that issue instead of opening another. Close the issue and remove both temporary changes. Save the issue's link.
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

## Item 4. The move to aube (`RD-16`)

**Item 4 comes first** (see _Order_). After it lands, read every `npx <binary>` in this file as `aube exec <binary>`, and every `npm ci` as `aube ci`.

**Required properties,** with `RD-16` properties 1 to 9 as the reference:

- **`package.json`:**
  - `"packageManager": "aube@2.10.0"`;
  - `aube.catalog` with the five pinned versions, and `catalog:` in place of each `$` override and of each direct dependency on them;
  - `aube.allowBuilds` exactly as `RD-16` property 4 lists it;
  - `allowScripts` deleted;
  - the `concurrently npm:<script>` scripts rewritten as `aube run <script>` commands, because `concurrently`'s shorthand doesn't know aube.
- **`.npmrc`:**
  - `strictDepBuilds=true` and `useDefaultTrustedDependencies=false`;
  - `managePackageManagerVersions=false`, `packageManagerStrict=error` and `packageManagerStrictVersion=true`;
  - `minimumReleaseAge=10080` and `minimumReleaseAgeStrict=true`, with no `minimumReleaseAgeExclude`. None is needed: the gate applies only to versions that are resolved anew, and this item resolves none (`RD-16` property 6). If a step does re-resolve, add exact-version entries only, as property 6 says, and list each one in the report;
  - `node-linker=hoisted` and `defaultLockfile=package-lock.json`;
  - each of today's keys (`git-tag-version`, `prefer-dedupe`, `save-exact`) kept only if aube reads it. The report says which, and how that was read.
- **`package-lock.json`:** `aube install` writes it once after the catalog change, and a second `aube install` leaves it unchanged. No `aube-lock.yaml` is committed.
- **Workflows** (`verify.yml`, with `measurements`' merge-base tree, then the Safari workflow and `baselines.yml`):
  - `setup-node` without `cache: npm`;
  - `npm install -g @endevco/aube@2.10.0` as the bootstrap, run outside the checkout (for example with `working-directory: ${{ runner.temp }}`), so npm doesn't read the repository's `.npmrc`;
  - aube's store cached under a key of the OS, the aube version and the lockfile's hash;
  - `aube ci`, and `aube exec` for every `npx`.

  The aube version is written once in the workflow, beside `NODE_VERSION`.

- **Scripts and editor files:**
  - `aube exec` in place of `npx` in `.scripts/size-reading.ts`, `.scripts/oxlint-migrate.ts` and `packages/drag/tests/support/build-package.node.ts`;
  - `aube run` in `.scripts/zed-test.sh`, `.zed/tasks.json` and `.vscode/launch.json`;
  - the `npm run build:cem` hint in `.storybook/docs/ApiTables.tsx` and `SummaryOrWarning.tsx`;
  - `.scripts/vitest-config.ts`'s comment, which says `consumer.node` runs `npm pack`. It no longer does: the file spawns `tsc`.
- **The `Justfile`s** name neither npm nor `npx`. Their recipes call binaries such as `vitest`, `nx` and `oxfmt` from `PATH`. `npx just` puts `node_modules/.bin` there today, and `aube exec just` must do the same. Every gate job running through `aube exec just` is the witness.
- **The devcontainer:**
  - `post-create/playwright-browsers.sh`'s hint names `aube install`.
  - `post-create/typescript-language-server.sh` installs the language server globally at an exact version, with aube if aube installs global packages. Otherwise it uses npm at that exact version with `--ignore-scripts`, and the report names it as npm's second remaining use.
  - `on-start/fix-zed-timeout.sh` patches the npm that Zed bundles for its own language servers. It installs nothing of the repository, so it stays.
- **Documentation:**
  - `AGENTS.md` gains one sentence under _Evidence_: dependencies are installed and binaries run with aube (`aube install`, `aube add`, `aube exec`), never with npm, `npx`, `aubx` or `aube dlx`.
  - `.agents/docs/handoff.md` and `.agents/docs/architecture.md` name `aube exec` where they name `npx`.
  - `.claude/agents/implementer.md`'s dependency rule becomes `aube add <name>`, with the 7-day release age and the `allowBuilds` pin noted. `der.md`'s commands name `aube exec`.
  - Each README's development commands move to aube. Commands addressed to the packages' consumers keep `npm install`.
  - `CONTRIBUTING.md` names neither tool, so it doesn't change.
  - Historical records stay as they were written.

**Witnesses:**

1. **The tree,** on a clean checkout after `aube ci`:
   - `aube why vite` and `aube why rolldown` show one vite 8.4.0-beta.1 and one rolldown 1.3.2;
   - `git status` is clean;
   - `aube install` run twice leaves `package-lock.json` unchanged. Save the one diff that the catalog change wrote, and state whether it touches more than the root package's entries;
   - `package-lock.json` keeps `lockfileVersion: 3`, and each package entry keeps `version`, `resolved` and `integrity`.
2. **The script policy,** locally:
   - `aube ignored-builds` lists only `edgedriver` and `geckodriver`, and `fsevents` on macOS;
   - with `nx@24.0.6` removed from `allowBuilds`, `aube ci` fails and names nx;
   - with `esbuild@0.28.0` in place of `esbuild@0.28.1`, it fails and names esbuild.

   **In CI:** one witness commit with the nx entry removed fails `aube ci` in `static`. The next commit restores it. Save the failing step's log.

3. **The pin:** with an aube other than 2.10.0 on `PATH`, `aube install` fails and names both versions, and nothing is downloaded. The 2.10.1 binary from the npm package serves.
4. **Release age,** locally, each step reverted afterwards:
   - `aube ci` passes with vite 8.4.0-beta.1 locked and no exception;
   - `aube add -D` of any version published less than 7 days earlier fails with `ERR_AUBE_NO_MATURE_MATCHING_VERSION`;
   - with that version as an exact `minimumReleaseAgeExclude` entry, the same `aube add` passes;
   - with the entry as a bare name, the report states what it exempts. It is never committed in that form.
5. **The gate and the Safari workflow on aube's tree:** every gate job, `docs-smoke` included, and the Safari workflow's install and listing. **A job that fails only on aube** is read again at the same commit on npm, by a temporary revert of the switch, before it is called a capital problem (`RD-16` property 11).
6. **Timing, as a reading:** take `aube ci`'s step times from the gate's own runs, cold on the first run after a cache-key change and warm afterwards, on `ubuntu-24.04` and `macos-26`. Put them beside `npm ci`'s step times on #30's last green run. Save `checks/install-times.tsv`.
7. **After the merge,** read by the coordinator: GitHub's dependency graph for `main` (`gh api repos/ausginer/material-x/dependency-graph/sbom`) lists vite 8.4.0-beta.1 and rolldown 1.3.2.

## Order

1. **Item 4 locally:** its witnesses 1 to 4, and the handoff's checks on every changed file. Commit.
2. Push. **Open a non-draft pull request** from `repo/ci-speed-1` to `main` (owner decision 1). Read the first run on aube's tree, with the gate still on Safari: item 4's witnesses 2 (CI), 5 and 6.
3. **Items 1 and 2:** the listing witness, then a run with item 1's witnesses 2 to 4 and item 2's witness 1.
4. Item 1's parallelism reading (witness 5).
5. Item 3 and its witnesses.
6. The report, then a final run in which every gate job and `verify` succeed, with every temporary trigger and witness change removed.

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
- a capital problem of `RD-16` property 11 appears. Nothing else about aube is a stop, and a resolution blocked by the release age isn't one: it gets an exact-version entry under `RD-16` property 6.

## The report

Write `.plan/ci-speed-1/ci-speed-report.md`. It covers:

- **Per item:** what changed, the witnesses with run links, and the saved readings under `checks/`.
- **Item 1:**
  - the WebKit inventory, with the Safari findings' rows called out;
  - the parallelism figures and outcome;
  - the WebKit job's time, beside Firefox's and Chromium's.
- **Item 2:** the Safari run's per-project statuses, and the issue path with the issue's link.
- **Item 3:** the reduced run's wall time against a full run's, and the search's matches.
- **Item 4:**
  - the tree and policy readings;
  - the `.npmrc` keys kept and dropped;
  - the language server's install;
  - the timing table beside npm's.
- **What wasn't verified.**

## Owner decisions and authorizations

1. **Granted 2026-11-17 by the owner:** a non-draft pull request from `repo/ci-speed-1` to `main`, for the runs that items 1 to 4 read. The implementer already holds standing permission to open pull requests. `verify` runs on `pull_request` and on pushes to `main` only. Never merge it. The ruleset requires the branch to be up to date with `main`, so bring `main` in with a merge, not a rebase.
2. **Granted 2026-11-17 by the owner:** item 2's witness issue in this repository, opened by the workflow, commented on once, and closed by the implementer.
3. **No ruleset change.** The required check stays `verify`, and the Safari workflow is never required.
4. **Settled by the owner's decisions above,** and not reopened here: Linux and headless WebKit in the gate, Safari weekly and manual, no sharding, a full move to aube with `RD-16`'s policy, and the `[noci]` range.

## Review before merge

A targeted feature-proof review reads the diff from `229829ef7` to the head. It covers:

- **`scope`:** that it can't reduce a run whose range holds a source change. Its tests, its fallback to full mode, and witness 3.
- **`verify`'s aggregate in both modes,** and that a cancelled or failed job fails it in either.
- **Permissions:**
  - only `scope` holds `actions: read`;
  - only the Safari issue job holds `issues: write`, and it runs no repository code;
  - the measurement, deploy and recording workflows are otherwise unchanged.
- **The WebKit inventory** and the parallelism reading against `RD-12` property 11.
- **aube:** the tree readings, the script policy's witnesses, including the CI failure, and `.npmrc` and `package.json` against `RD-16` properties 2 to 7 and 12, including that every `minimumReleaseAgeExclude` entry is an exact version that the report justifies. Also that no `npx`, `npm ci`, `aubx` or `aube dlx` remains in a recipe, script, workflow, editor task, agent definition or current document, except consumer instructions and `RD-16` property 9's bootstrap.

It records at `.plan/reviews/ci-speed-1/feature-proof-claude.md`, and the architect decides its findings.

**Stopping boundary:** the report is committed and pushed, and the pull request is open with a green final run. The review follows.

## Disposition of the stop at `4136c0eea`

Decided 2026-11-17 by the architect, on the [report](ci-speed-report.md) and the [WebKit inventory](checks/webkit-inventory.txt) (pull request #31; runs 44049217432 and 44050452080, and 44050444079 for the five runs per file). Both rows fail in `browser/drag/webkit` and `consumer/drag/webkit`, in 5 of 5 runs of their file. Neither has a Safari condition, and both pass in Safari. **Neither is a WebKit defect, and neither is disabled.** Both are repaired in the test, under `RD-8` property 2: the cause is in the test or its instrument, and no product behavior, public surface or decided contract changes. **No finding is registered for them, and nothing needs the owner.**

### Row 1: a test that names engines

`click-guard.browser.test.ts` › _"should prevent nothing on a press"_ ends with `expect(engine).toMatch(/chromium|firefox|safari/u)`. Its behavioral assertion, `expect(prevented).toBe(false)`, holds in WebKit.

- **History.** The line was added as `/chromium|firefox|webkit/u` in `a9c323f6a` (#14). `RD-12`'s Safari unit rewrote it to `safari`. It is a list of engine names, which each change of engine set has to edit.
- **What it asserts:** nothing about the click guard. An unknown engine is already an error of the shared factory (`MX_TEST_ENGINES`).
- **Repair:** delete the line. Nothing replaces it.

### Row 2: the oracle on a list outside its rule

`sortable.browser.test.ts:636` › _"should cancel and report when an anchor leaves before the release"_ fails at the equivalence oracle's `afterEach`: _"the predicted insertion geometry disagreed with a fresh measurement at slot 1"_. The row's own assertions hold: one `canceled` result, one fault, and a clean list.

- **Reading.** The row moves `#r2` out of the list to `document.body` in the middle of a drag, on purpose, and the product reports the fault at the release. From that removal until the release, the list is outside the rule the oracle checks: the oracle's prediction is the one the product made before an anchor left. `takeMismatches()` exists for this: _"a test about a list outside the rule reads the ones it expects and still passes"_, and `equivalence-check` and `y-geometry` rows use it so.
- **Why only WebKit:** WebKit records a check in that window, and Chromium and Firefox don't. The likeliest cause is that WebKit has one more geometry collection between the removal and the release. That is a difference in event or frame timing, not in the geometry. This is an inference, and the witness below reads it.
- **Repair.** The row takes the oracle's mismatches at two points:
  - just before `document.body.append(...)`, it expects them empty, so the oracle still checks the part of the drag inside the rule;
  - after the release, it takes them and asserts nothing about them, because they belong to the list outside the rule.

  The row has no engine condition. The same code runs in every engine.

- **Not the same as `drag:DRF-52`,** whose Safari row removes nothing. The dated note on `DRF-52` says so.

## Remediation of the stop

For the implementer, on `repo/ci-speed-1`, after merging the architect's commit that adds this section.

1. **Row 1:** delete the line. **Witness:** the row passes in `browser/drag/webkit` and `consumer/drag/webkit`, and in Chromium.
2. **Row 2:** the two `takeMismatches()` points above.
   - **Witness:** in WebKit, the first point reads `[]`, and the second reads a non-empty list that names slot 1. In Chromium and Firefox, the row passes, and the second point reads whatever it reads. Record both readings.
   - **Stop** if WebKit's first point is not empty. The disagreement would then come before the list left the rule, which would make it a WebKit geometry finding for the architect, not a test repair.
3. **`RF-47`:** `aube install --fix-lockfile`, in its own commit.
   - **Witness:** the lockfile diff touches only the three entries and their platform or child packages. Afterwards, `aube why lightningcss` under `packages/vite-custom-element-assets` reads 1.33.0. `aube ci` then leaves the lockfile unchanged.
   - **Stop** if the re-resolution touches anything else, or if the release age blocks it.
4. **`@oxlint/migrate`:** `aube add -D -W @oxlint/migrate@1.93.0`, in a later commit than item 3. **Witness:** `just oxlint-migrate` runs and leaves `.oxlintrc.json` unchanged, or the report shows its diff. If the package has an install script, its `allowBuilds` entry is pinned to 1.93.0.
5. **No auto-install** (`RD-16` property 12, added after this section): `.npmrc` gains `aubeNoAutoInstall=true`, in its own commit, under a comment saying that `aube run` and `aube exec` then install nothing.
   - **Witness,** locally, on a tree that `aube install` has just brought up to date. Afterwards, restore every changed file with `git checkout`, `package-lock.json` included, because the control's install rewrites it. Then run `aube install`, and `git status` is clean.
     1. In the root `package.json`, put `^` before `concurrently`'s exact version, add a script `"witness-no-install": "node -e 0"`, and create a marker file `m` in the scratchpad.
     2. `aube exec -- tsc --version` and `aube run witness-no-install` both run, neither prints _Auto-installing_, and `find node_modules/.aube-state -newer "${m:?}"` prints nothing.
     3. **The control,** after step 2 and never before it, because its install brings the state up to date and step 2 would then pass under any setting: with the `.npmrc` line removed and `package.json` still changed, `aube exec -- tsc --version` prints _Auto-installing_. If it doesn't, the edit is one the check ignores: use another dependency spec, repeat from step 1, and report which edit served.
   - **Stop** if step 2 installs: aube 2.10.0 then doesn't read the key. Don't substitute `--no-install`, an environment variable or another key. The architect decides.
   - **Corrected 2026-11-17, after the witness held at `e60626671`.** Step 1 said only _"Add a script … to the root `package.json`"_, which the staleness check ignores. Steps 2 and 3 said _"`aube exec tsc --version`"_, which prints aube's own version (`RD-16` property 8's `--` rule). The restore didn't name `package-lock.json`. The implementer's run used the corrected form, so the witness stands.
6. **Then the unit resumes** where the report's _Next_ says:
   - item 1 witness 5 (parallelism);
   - item 2 witness 2 (the issue path, which the owner authorized);
   - item 3's witnesses on the pull request;
   - the final green run.

   **Reading item 3 witness 1 needs _B_.** The first `scope` run (44052524310 at `4136c0eea`) chose full with _"B: none"_, which is right: no earlier run had a successful `webkit` job, so none counted as full (`RD-15` property 6). Item 3's witnesses can reduce a run only after one full run in which every gate job succeeds.

The report gains a section for this remediation, with the readings above.

## Disposition of the stop at `633ef72d8`

The remediation stopped at step 3: `aube install --fix-lockfile` repaired the three entries and rewrote much more. The architect reproduced the diff and read it by resolution ([reading](checks/rf47-resolution.txt), [instrument](checks/rf47-resolution.mjs)).

- **`RF-47`'s repair takes the whole diff, and stays in this unit.**
  - No `name@version` is new to the lockfile, and the only ones to leave it are the stale ones.
  - Nine resolutions change, each within its range, and `RF-47` lists them. Out-of-range resolutions go from four to two, the eslint 10 peers that the catalog overrides on purpose.
  - A second `aube install` leaves the file byte-identical.
  - The rest is aube placing versions the file already holds. Every later `aube add` would write this layout anyway, so confining the repair to three entries would only move the same diff into step 4.
  - The owner isn't alarmed by the size. `RF-47`'s _Repair_ has the reasons.
- **Step 4 waits for step 3's commit,** and is then isolated by it. Once aube has written the layout, an `aube add` changes only what it adds. That is step 4's new witness.
- **`aube exec` reads its own options after the binary's name.** `RD-16` property 8 now requires `--` before the binary whenever the binary gets an option. That is a repair across the files this unit migrated, and it fixes a real defect: `.agents/docs/handoff.md`'s eslint command never passes `-c` to eslint.
- **Step 5's departures are accepted,** and its text is corrected in place.

## Remediation of the stop at `633ef72d8`

For the implementer, on `repo/ci-speed-1`, after merging the architect's commit that adds this section. Steps 1, 2 and 5 above are done. Step 3 and step 4 are replaced by steps A and B.

A. **`RF-47`:** `aube install --fix-lockfile`, in its own commit, with its whole diff.

- **Witness,** locally:
  - `node .plan/ci-speed-1/checks/rf47-resolution.mjs <before> package-lock.json`, with `<before>` being `package-lock.json` at `633ef72d8` saved outside the checkout, prints the reading's three sections, unchanged.
  - A second `aube install` leaves `package-lock.json` unchanged.
  - In a fresh scratch worktree of the commit, `aube install` runs the root `postinstall` (`.scripts/link-tsserver.ts`), and what it links exists. The rewrite drops the root's `hasInstallScript`, so this reading shows that the script still runs.
- **Witness,** on the pull request after the push:
  - the full gate run on the commit is green;
  - `gh api repos/ausginer/material-x/dependency-graph/compare/main...<sha>` lists no removal of `vite` or `rolldown`.

  The lockfile's root entry now names them as `catalog:`, and nx and GitHub's dependency graph both read that entry. From the architect's session, the compare endpoint answered 403, and item 4 witness 7's SBOM endpoint answered 404. If neither answers for the implementer either, the report says so. The graph is then read after the merge, by item 4 witness 7 or on the repository's _Dependency graph_ page.

- **Stop** if the instrument's output differs from the reading, or if a second install changes the file. Also stop if the graph comparison loses `vite` or `rolldown`, or if an nx command of the gate fails: those two are `RD-16` property 11's capital stops, so report and wait for the owner. B. **`@oxlint/migrate`:** `aube add -D -W @oxlint/migrate@1.93.0`, in a later commit than A.
- **Witness:**
  - the instrument, run between A's file and B's, prints in section 1 only `@oxlint/migrate` and its own dependencies, and in section 2 only the root's new devDependency;
  - section 3 is unchanged;
  - `just oxlint-migrate` runs and leaves `.oxlintrc.json` unchanged, or the report shows its diff;
  - if the package has an install script, its `allowBuilds` entry is pinned to 1.93.0.
- **Stop** if the `aube add` changes anything else. That would mean aube's layout isn't stable after its first write, which `RD-16` property 11 assumes. C. **`--` before an option** (`RD-16` property 8):
- **What changes.** Every current file that runs `aube exec <binary>` with an argument beginning with `-` writes `aube exec -- <binary> …`. That covers workflows, `.scripts/`, `packages/drag/tests/support/build-package.node.ts`, `.agents/docs/handoff.md`, agent definitions, READMEs and editor files, and the argument arrays given to `spawn`. Records stay as written.
- **Witness:**
  - a search for `aube exec` followed by a name and then an argument beginning with `-` finds nothing outside records;
  - `.agents/docs/handoff.md`'s eslint command, run as written on one file with `-c` pointing at a missing file, fails on loading that config;
  - the gate is green. D. **Then the unit resumes** with step 6 above.

**Observed on run 44055280400, not decided here:** `measurements`' _Measurement rows_ step reports one failed test file, which `|| true` absorbs. The report names that file and whether it fails on `main`.
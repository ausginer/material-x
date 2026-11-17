# CI-speed unit report

**Status: done.** Items 1 to 4 are implemented and witnessed, and the final run is green: [_Final run_](#final-run). The unit stopped twice on the way, and the architect resolved each stop:

- **At item 1's WebKit inventory** (`4136c0eea`): two rows failed in WebKit in every run. `d631e7432` decided both as test repairs. See [_Remediation of the stop_](#remediation-of-the-stop).
- **At `RF-47`'s re-resolution** (`633ef72d8`): `aube install --fix-lockfile` rewrote far more than the three entries. `f480cc1de` accepted the whole write. See [_Remediation of the stop at `633ef72d8`_](#remediation-of-the-stop-at-633ef72d8).

The sections from _Item 4_ to _What wasn't verified_ are the report of the first stop. Each one that a later step changed carries a dated note.

**Branch** `repo/ci-speed-1`, pull request [#31](https://github.com/ausginer/material-x/pull/31) (non-draft, open). The input was `183053ca6`. The head this report describes is the commit that adds it. **Governing records:** `repo:RD-12` as amended, `repo:RD-15` and `repo:RD-16`, in [`../00-index.md`](../00-index.md).

## Runs read

| Run | Workflow | Commit | Result | What it shows |
| --- | --- | --- | --- | --- |
| [44046829370](https://github.com/ausginer/material-x/actions/runs/44046829370) | verify | `e9e8f92a2` | success | Item 4 on aube's tree, with the gate still on Safari: every gate job, `docs-smoke`, and Safari's install and listing. Cold `aube ci`. |
| [44048707632](https://github.com/ausginer/material-x/actions/runs/44048707632) | verify | `6092c5f26` | failure, on purpose | Item 4 witness 2 in CI: without `nx@24.0.6` in `aube.allowBuilds`, `aube ci` fails in every job. |
| [44049217432](https://github.com/ausginer/material-x/actions/runs/44049217432) | verify | `5ab74f309` | failure | Items 1 and 2: the first WebKit run. Two rows fail, in two projects each. Warm `aube ci`. |
| [44049207091](https://github.com/ausginer/material-x/actions/runs/44049207091) | safari | `5ab74f309` | success | Item 2 witness 1: the Safari workflow on the branch, through a temporary `push` trigger. |
| [44050444079](https://github.com/ausginer/material-x/actions/runs/44050444079) | webkit-inventory | `078574da3` | success | Five runs of each failing row's file, and witnesses 3 and 4, through a temporary workflow. |
| [44050452080](https://github.com/ausginer/material-x/actions/runs/44050452080) | verify | `078574da3` | failure | The second WebKit run: the same two rows. |
| [44055280400](https://github.com/ausginer/material-x/actions/runs/44055280400) | verify | `633ef72d8` | success | The first full run with both WebKit rows repaired. Its `measurements` step absorbs one failing file: [below](#the-measurement-rows-failing-file). |
| [44058089546](https://github.com/ausginer/material-x/actions/runs/44058089546) | verify | `57c8849a2` | success | Step A: the gate on aube's write of the lockfile, nx's jobs included. |
| [44059513528](https://github.com/ausginer/material-x/actions/runs/44059513528) | verify | `8a5017d68` | success | Steps B and C. |
| [44060878670](https://github.com/ausginer/material-x/actions/runs/44060878670) | webkit-parallel | `86b2fddc2` | success | Item 1 witness 5, through a temporary workflow: three parallel and three serial WebKit test steps. |
| [44060878452](https://github.com/ausginer/material-x/actions/runs/44060878452) | safari | `86b2fddc2` | failure, on purpose | Item 2 witness 2: opens issue [#32](https://github.com/ausginer/material-x/issues/32). |
| [44060886935](https://github.com/ausginer/material-x/actions/runs/44060886935) | verify | `86b2fddc2` | failure | The witness commit's own run. `static` and `docs` fail on the temporary toggle's TS4111 error ([below](#what-went-wrong-on-the-way)). |
| [44062592521](https://github.com/ausginer/material-x/actions/runs/44062592521) | safari | `36915512b` | failure, on purpose | Item 2 witness 2: comments on #32 and opens no second issue. |
| [44062603945](https://github.com/ausginer/material-x/actions/runs/44062603945) | verify | `36915512b` | failure | The same TS4111 error. |
| [44065100765](https://github.com/ausginer/material-x/actions/runs/44065100765) | verify | `791701529` | success | WebKit in parallel in the gate, with the witnesses removed. |
| [44066465139](https://github.com/ausginer/material-x/actions/runs/44066465139) | verify | `503f613ec` | failure | The first reduced run. `scope` chooses reduced, and `records` fails because nothing in it built what the Vitest config loads ([below](#what-went-wrong-on-the-way)). |
| [44066844320](https://github.com/ausginer/material-x/actions/runs/44066844320) | verify | `9afdd3ad0` | success | `records` repaired. A full run, so _B_ for witnesses 1 and 2. |
| [44068384079](https://github.com/ausginer/material-x/actions/runs/44068384079) | verify | `a542fb992` | success | Item 3 witness 1: reduced, in 77 s. |
| [44068663234](https://github.com/ausginer/material-x/actions/runs/44068663234) | verify | `b247c053e` | cancelled | Item 3 witness 2: full despite the marker. Cancelled by witness 3's first push, after `scope` decided. |
| [44069053052](https://github.com/ausginer/material-x/actions/runs/44069053052) | verify | `e49a802c8` | cancelled | Item 3 witness 3: the source change's run, cancelled by the next push. |
| [44069866771](https://github.com/ausginer/material-x/actions/runs/44069866771) | verify | `2eaccc745` | success | Item 3 witness 3: full despite the marker, because _B_ precedes the source change. |
| [44071394306](https://github.com/ausginer/material-x/actions/runs/44071394306) | verify | `7314a5060` | failure, on purpose | Item 3 witness 4: `records` fails on a misformatted record. |

## Item 4: the move to aube (`RD-16`), done

**What changed** (`e9e8f92a2`):

- `package.json` names `"packageManager": "aube@2.10.0"`. `aube.catalog` holds the five pinned versions, and the five overrides and five root dependencies on them are `catalog:`. `aube.allowBuilds` is exactly `RD-16` property 4's list. `allowScripts` is deleted. `check` and `lint` run `aube run <script>` through `concurrently`.
- `.npmrc` holds `RD-16`'s keys: properties 4 to 7, `node-linker=hoisted` and `defaultLockfile=package-lock.json`.
- Every workflow job installs aube with `npm install -g "@endevco/aube@$AUBE_VERSION"` in `runner.temp`. It caches aube's store (`aube store path`) under `aube-<OS>-<aube version>-<hash of package-lock.json>` with `actions/cache` v6.1.0, pinned to its commit, and runs `aube ci` and `aube exec`. `AUBE_VERSION` is written once per workflow, beside `NODE_VERSION`.
- Scripts, editor tasks, the devcontainer, `AGENTS.md`, `.agents/docs/handoff.md`, `.agents/docs/architecture.md`, `implementer.md`, `der.md` and the READMEs' development commands use aube, as the handoff lists. Consumer `npm install` lines and dated records (`spec-consistency.md`, `.plan/`) are unchanged.

**The `.npmrc` keys.** aube reads none of the three old keys. `aube config explain` answers _"unknown setting"_ for `git-tag-version`, `prefer-dedupe` and `save-exact`, in both spellings, so all three are dropped. **One key is added: `savePrefix=`** (empty). It is aube's setting for what `save-exact=true` did, so `aube add` writes an exact version, as every dependency here is. `RD-16` property 7 doesn't list it. The architect may drop it.

**The tree** ([local witnesses](checks/aube-local-witnesses.txt) §1):

- After the catalog change, `aube install` wrote **no** `package-lock.json` diff, and a second one reported _"Already up to date"_. So there is no diff to save. The root entry keeps the resolved versions (`"vite": "8.4.0-beta.1"`), not `catalog:`. (_Corrected 2026-11-17:_ since `57c8849a2`, aube's first write of the lockfile, the root entry has `"vite": "catalog:"` and `"rolldown": "catalog:"`.)
- `aube why` shows one vite 8.4.0-beta.1 and one rolldown 1.3.2, and the hoisted tree holds one copy of each on disk.
- The lockfile keeps `lockfileVersion: 3`, and all 1,259 installed entries keep `version`, `resolved` and `integrity`.
- On a clean copy, `aube ci` exits 0 and leaves `git status` clean. The root `postinstall` ran.
- `aube exec just fmt-check`, `lint` and `typecheck` exit 0 locally. `nx run-many` works on aube's tree. In CI, every gate job passed in run 44046829370, `docs-smoke` included.

**The script policy** ([local](checks/aube-local-witnesses.txt) §2, [CI](checks/aube-ci-nx-witness.txt)):

- `aube ignored-builds` lists `edgedriver@8.0.0` and `geckodriver@8.0.0`. `fsevents` installs only on macOS, so it isn't in the Linux tree.
- Locally, without `nx@24.0.6`, `aube ci` fails with _"dependencies with build scripts must be reviewed before install: nx@24.0.6"_. With `esbuild@0.28.0` listed in place of 0.28.1, it fails and names `esbuild@0.28.1`.
- In CI, commit `6092c5f26` dropped nx's entry, and `aube ci` failed in `static` with the same message (run 44048707632). `5ab74f309` restored the entry.

**The pin** (§3). With aube 2.10.1 first on `PATH`, `aube install` fails: _"packageManager requires aube@2.10.0, but this is aube@2.10.1"_. Nothing was downloaded.

**Release age** (§4), using `electron-to-chromium` 1.5.487 (published 2026-11-17) and 1.5.486 (2026-11-14), which have no dependencies and no install script:

- `aube ci` passes with vite 8.4.0-beta.1 locked and no exception.
- `aube add -D -W electron-to-chromium@1.5.487` fails with `ERR_AUBE_NO_MATURE_MATCHING_VERSION`.
- With `minimumReleaseAgeExclude=electron-to-chromium@1.5.487`, the same add passes. 1.5.486 stays blocked under that entry.
- **A bare name** (`minimumReleaseAgeExclude=electron-to-chromium`) exempts every version of the package: both 1.5.486 and 1.5.487 pass under it. It was never committed.
- No exception is committed, because nothing was re-resolved.

**What the release-age witness also showed:**

- **`aube add` at the root needs `-W`.** Without it, aube refuses to add to a workspace root. `implementer.md` therefore says `aube add -D -W <name>`.
- **`aube add` re-resolves the hoisted layout.** Adding one package changed 4,430 lockfile lines. By name and version, it also dropped three nested copies that npm's lockfile keeps out of date with the workspace manifests:
  - lightningcss 1.32.0 and its 12 platform packages, under `packages/vite-custom-element-assets`, whose `package.json` names 1.33.0;
  - `@types/node` 26.1.1 and `undici-types` 8.3.0, under `packages/size-limit-preset-rolldown`, which names 26.6.6;
  - `ansi-regex` 6.6.0.

  `aube ci` and `aube install` keep those entries, so the committed lockfile installs lightningcss 1.32.0 for `vite-custom-element-assets` under npm and aube alike. **This is a defect in the lockfile, and this unit didn't cause it.** The next `aube add` corrects it as a side effect. It is reported, not repaired. (_Corrected 2026-11-17:_ `RF-47` repaired these entries at `57c8849a2`, and the lockfile at the head has none of them. See step A of [_Remediation of the stop at `633ef72d8`_](#remediation-of-the-stop-at-633ef72d8).)

- **`aube exec` installs first when `package.json` changed** (_"Auto-installing: package.json has changed"_), unless it is given `--no-install`. After the witness commit's edit to `allowBuilds`, `aube exec oxfmt` ran an install, which the policy refused, and the tool didn't run.
- **`aube exec <bin> --version` and `--help` print aube's own output.** Every other argument reaches the binary. (_Corrected 2026-11-17:_ aube takes its own options directly after the binary's name, up to the first argument it doesn't own, and these are some of them. See [step C](#remediation-of-the-stop-at-633ef72d8).) A scratch recipe received every flag that the workflows and scripts pass, unchanged (§5).

**The language server.** aube installs global packages. `post-create/typescript-language-server.sh` runs `aube add -g typescript-language-server@6.0.3` from `$HOME`, with `AUBE_GLOBAL_BIN_DIR=$HOME/.local/bin`. aube's own global bin directory isn't on `PATH`, and `~/.local/bin` is. 6.0.3 is from 2026-11-02, and 6.1.0 is 5 days old. Tried in this container: the binary resolves from `~/.local/bin` and prints 6.0.3. **npm's only remaining command** is CI's bootstrap.

**`aube exec @oxlint/migrate`.** (_Since resolved by step B:_ the package is an exact devDependency.) `.scripts/oxlint-migrate.ts` now runs `aube exec @oxlint/migrate`, as the handoff asks. `@oxlint/migrate` isn't a dependency, so `just oxlint-migrate` now fails until it is added. `npx` used to fetch it. This is `RD-16` property 8 working as decided. Whether to add the package is open.

**Timing, a reading only** ([`checks/install-times.tsv`](checks/install-times.tsv)). Seconds per step: npm's `setup-node` includes its cache restore, and aube's total adds `Install aube`, the cache restore and, when cold, the cache save.

| Runner | npm ci (#30, run 44030423689) | aube ci, cold (run 44046829370) | aube ci, warm (run 44049217432) | Install total, npm / aube cold / aube warm |
| --- | --- | --- | --- | --- |
| ubuntu-24.04 | 21 to 78 | 3 to 5 | 0 to 2 | 29–86 / 11–19 / 8–13 |
| macos-26 | 38 | 25 (22 in run 44049207091) | not read | 50 / 61 / — |

A warm macOS install wasn't read. Both macOS runs were cold, because the pull request's runs and the branch's push runs save to different cache scopes.

**The merge base's size reading** (`measurements`) fails on this pull request. `main` has no aube settings, so `aube ci` installs it in the isolated layout, and the base's `tsdown` config can't import `@ydinjs/vite-traits-plugin`. The step reports _"The merge base gave no machine-readable size reading"_, as it is written to. The failure lasts until this pull request merges and the merge base carries `.npmrc`.

## Item 1: WebKit in the gate, done

**What changed** (`5f2522c3e`):

- `webkit` is an engine of `MX_TEST_ENGINES`, served by Playwright's default provider with `deviceScaleFactor: 1`. It is serial, as Firefox is, until the parallelism reading.
- `verify`'s `webkit` job replaces `safari`, and `verify` needs `webkit`. Its timeout starts at 20.
- The devcontainer installs `chromium webkit`.
- `test-architecture.md` §CI policy, `verify.yml`'s header and drag's `test-engines` comment describe the new engine set.
- No test file changed. Every engine condition names `safari` or `chromium`.

**Witness 1, the listing** ([`checks/webkit-listing/`](checks/webkit-listing/summary.txt)). `MX_TEST_ENGINES=webkit aube exec vitest list --filesOnly --json --project '*/webkit'` lists the 7 projects and 104 files that the Firefox listing does, file for file, with `/webkit` in place of `/firefox`.

**Witness 2, the first WebKit run: two rows fail** ([inventory](checks/webkit-inventory.txt)). Runs 44049217432 and 44050452080 report 4 failed, 1,613 passed and 18 skipped, out of 1,635 rows. The 4 failures are two rows, each in `browser/drag/webkit` and `consumer/drag/webkit`. **Neither row carries a Safari condition, and each failed in 5 of 5 runs of its file in each project** (run 44050444079), so neither is intermittent. Both pass in real Safari: runs 44046829370 and 44049207091.

| File | Row | Failure in WebKit |
| --- | --- | --- |
| `packages/drag/tests/click-guard.browser.test.ts` | `drag:DRI-11 the click guard` › "should prevent nothing on a press" | `expected 'webkit' to match /chromium\|firefox\|safari/u`. The row's last line asserts that the engine is one of three names (line 372). Its behavioural assertion before it, `expect(prevented).toBe(false)`, holds. |
| `packages/drag/tests/sortable.browser.test.ts` | `drag:DRI-15 placeholder integrity` › "should cancel and report when an anchor leaves before the release" (line 636) | _"the predicted insertion geometry disagreed with a fresh measurement at slot 1"_. The equivalence oracle throws it in its `afterEach` (`tests/support/oracles.ts:311`), not the row's own assertions. `drag:DRF-52`'s intermittent Safari failure is the same oracle message, at slot 0. |

**The Safari findings' rows in WebKit.** `repo:RF-36`'s rows, `drag:DRF-49`, `DRF-50`, `DRF-51` and `DRF-52` are not among the failures. Their Safari conditions are false in WebKit, and WebKit skips 18 rows, as many as Firefox. `sortable.browser.test.ts` reports 55 passed and 0 skipped in WebKit. So each of those rows ran and passed in both full WebKit runs. This is evidence that their failures are particular to Safari, its driver or its runner, and not to the WebKit engine. It is a reading, not a repair.

**Witness 3, keyboard: holds.** All 28 rows of `focus-layer.spec.browser.test.ts` pass in `spec/material-x/webkit`, including each _"on keyboard focus"_ row for `mx-button`, `mx-checkbox` and `mx-radio`. Tab reaches the button, the checkbox and the radio in WebKit.

**Witness 4, reduced motion: holds.** `landing.browser.test.ts`'s 25 rows pass in `browser/drag/webkit`, including the two reduced-motion rows, which run there.

**The WebKit job's time.** In run 44049217432, the test step took 280 s for WebKit, serially. Firefox's took 428 s, serially, and Chromium's took 290 s, in parallel with coverage and visual. WebKit's job took about 6 minutes. **The timeout stays at 20 minutes** until the job passes. It will then be set to about twice the longest WebKit run. (_Corrected 2026-11-17:_ the timeout has been 8 minutes since `368ffeea2`. See _The timeout: 8 minutes_ below.)

**Witness 5, parallelism: WebKit runs in parallel** ([reading](checks/webkit-parallelism.txt)). Run 44060878670, a temporary workflow, ran the WebKit test step three times serially and three times with Chromium's setting (`fileParallelism`, 2 workers), in alternating order:

| Job                   | Serial step | Parallel step | Shorter by |
| --------------------- | ----------- | ------------- | ---------- |
| run 1, serial first   | 284 s       | 148 s         | 48 %       |
| run 2, parallel first | 282 s       | 171 s         | 39 %       |
| run 3, serial first   | 281 s       | 145 s         | 48 %       |

Every step passed all 1,617 rows (18 skipped). No row fails in parallel that passes serially, and each parallel step is more than 20 % faster, so both conditions of `RD-12` property 11 hold. `.scripts/vitest-config.ts` gives WebKit Chromium's parallelism, and its comment states the reading (`368ffeea2`). In the gate, WebKit's job went from 352 s (run 44059513528) to 239 s (run 44065100765).

**The timeout: 8 minutes.** The job spends about 70 s outside its test step, so the longest parallel job is about 70 + 171 = 241 s. Twice that is about 8 minutes.

## Item 2: the Safari workflow

**What changed** (`5f2522c3e`):

- `.github/workflows/safari.yml` holds the `safari` job, which is unchanged except for three outputs. The macOS and Safari versions step also writes the versions as outputs. The test step tees the recipe's log. A step that runs only on failure collects each `<project> exited with <non-zero>` line.
- Its triggers are a weekly `schedule` (Mondays 05:00 UTC) and `workflow_dispatch` with an optional `ref`, which the checkout uses.
- Concurrency is grouped by `inputs.ref || github.ref`, with `cancel-in-progress: false` and `queue: max`, as `deploy` has.
- The test job has `contents: read` only. The `issue` job runs only when the test job failed on a `schedule` event. It holds `issues: write` only, runs no checkout and no install, and takes the run, the commit, the versions and the failed projects from the test job's outputs. It creates the `safari` label if it is missing, then comments on the open `safari` issue or opens one.

**Witness 1: holds** ([record](checks/safari-workflow-witness-1.txt)). Run 44049207091 is green on macOS 26.7.2 (25G332) with Safari 27.2 and Reduce Motion read back as 0. All 7 projects exited 0. The `push` trigger was removed at `078574da3`.

**Witness 2, the issue path: holds.** One temporary commit (`86b2fddc2`) added a `push` trigger for `safari.yml` on this branch, a step that exits 1 after the tests, and `push` to the issue job's condition. A second commit (`36915512b`) changed only a comment, to start the second run.

- Run 44060878452 opened [#32](https://github.com/ausginer/material-x/issues/32), _"The scheduled Safari run failed"_, labelled `safari`, with the run, the commit, macOS 26.7.2 (25G332) and Safari 27.2.
- Run 44062592521 commented on #32 with its own run and commit, and opened no other issue.
- In both runs, every Safari project passed, and only the deliberate step failed.
- The implementer closed #32 with a comment naming the witness. `368ffeea2` removed all three temporaries. `safari.yml` is byte-identical to its state at `8a5017d68`.

**A wording defect, not repaired:** when every project passed and a later step failed, the issue's _Failed projects_ reads _"none named: the job failed before a project reported its status"_. Here the projects did report: they all exited 0. Only a failure after the tests produces this case, so a real scheduled run would show it only if a later step fails. The architect decides whether the wording changes.

Witness 3 is the coordinator's, after the merge.

## Item 3: the `[noci]` marker, done

**What changed** (the commit that adds this report):

- `.scripts/ci-scope.ts` decides the mode. It uses Node's built-in modules, `git` and `gh`. Its rules:
  - A `workflow_dispatch` run is always full, and so is a run whose head message lacks `[noci]`.
  - _B_ is found among `verify.yml`'s 100 most recent successful runs. A run counts if its head is an ancestor of _H_ and its `static`, `chromium`, `firefox`, `webkit` and `docs` jobs each concluded `success`. Of those, _B_ is the one with the fewest commits to _H_. A commit that the checkout doesn't hold isn't an ancestor.
  - The range is `git diff --name-only --no-renames B H`, and every path in it must be under a `.plan` directory or end in `.md`.
  - Any failure to read leads to full mode, with the reason in the log.
  - The script logs _H_, _B_ with its run link, the mode and the paths that kept the run full. It writes `mode` to the step output and a line to the step summary.
- `verify.yml`:
  - `scope` is its first job, with `actions: read` and a full-history checkout. Every other job except `deploy` needs it.
  - The gate jobs and `measurements` run only in full mode. `records` runs only in reduced mode.
  - `verify` checks `scope`'s result and each job against the mode. In full mode, the five gate jobs must be `success` and `records` must be `skipped`. In reduced mode, `records` must be `success` and the five gate jobs `skipped`. Any other mode fails.
- `eslint.config.ts` allows GitHub's REST field names `workflow_runs`, `head_sha` and `html_url` in `camelcase`, beside the other names that other programs define.

**Tests.** `.scripts/ci-scope.node.test.ts` has 20 cases, on temporary `git` repositories and a faked API. They cover:

- the path rule, with `.plan` at the root and in a package, `.md`, `.mdx`, a source file, and a file named `.plan`;
- a reduced range;
- a `.mdx` change;
- a rename out of `.plan`, and a rename into `.plan`;
- a merge commit and an empty range;
- no marker, and `[no ci]`;
- no _B_, and a successful run whose full-mode jobs were skipped;
- an API error;
- _B_ not an ancestor, a commit missing from the checkout, and the nearer of two verified ancestors;
- `workflow_dispatch`.

All 20 pass. **Mutations** checked whether the tests detect each change. The tests failed for each of these:

- `.mdx` accepted;
- `[no ci]` accepted;
- `--no-renames` dropped, which only the rename-into-`.plan` case detects;
- the farthest _B_ chosen;
- every commit treated as an ancestor;
- source paths ignored;
- `workflow_dispatch` not forced full.

**The search for other readers** (`RD-15` property 4). Tests, scripts, Storybook and TypeDoc configuration were searched for a `.plan/` path or a `.md` file read as input:

| Match | Reader | Covered by `records` |
| --- | --- | --- |
| `.scripts/entry.ts` (`currentState` lists, `.md` filters) | the record resolver | yes: `.scripts/entry.node.test.ts` |
| `.oxfmtrc.json`'s ignore list, and `oxfmt` over the tree | formatting | yes: `just fmt-check` |
| **`packages/drag/tsconfig.json` includes `./.plan/probes/callback-list/allocation.ts`** | drag's typecheck, in `static` | **added:** `records` also runs `aube exec just typecheck` |
| `.oxlintrc.json`, `eslint.config.ts`, packages' `.oxlintrc.json` | lint, which ignores `.plan/` | not a reader |
| TypeDoc configuration (`readme: none` in core, box-quad and drag) | — | not a reader |
| Storybook's `stories` (`**/*.@(mdx\|stories.tsx)`) | `.mdx` only, which counts as source | not a reader |
| `.claude/plugins/harness-effort-guard/scripts/resolve-role.ts` reads `.claude/agents/*.md` | the effort guard's tests, which no gate job runs | not in the gate |
| `drag:DRI-9 README examples` in `commit.browser.test.ts` | copies the README's code, and reads no file | not a reader |

`records` therefore runs the install, `just fmt-check`, `just typecheck` and the resolver's tests. The typecheck is the one addition to `RD-15` property 4's list, and the search is what required it. It is the root recipe, so any later `tsconfig` that includes a record is covered too.

**`records` runs its tests through `just test`** (`9afdd3ad0`). The first reduced run, 44066465139, failed in `records`. The root Vitest config loads the custom-element plugin, which imports `node_modules/.cache/css/css-private-props.json`, and nothing in `records` built that file. The root `test` recipe builds it first (`_test-builds`), as for every other gate job. Locally, with the file removed, `aube exec -- just test --project repo .scripts/entry.node.test.ts` rebuilt it, and the 14 tests passed. My earlier local check passed only because the file was already there.

**Witnesses on the pull request:**

1. **Reduced: holds.** `[noci]` on `a542fb992`, which changed only `.plan/ci-speed-1/checks/noci-witnesses.md`. Run 44068384079: _"B: 9afdd3ad0… (run 44066844320)"_, _"mode: reduced, because [noci], and every path in the range is a record or Markdown"_. `records` succeeded, the other seven jobs were skipped, and `verify` succeeded. **Wall time 77 s,** against 518 s for the full run at `9afdd3ad0`. The reduced run at `a542fb992` wasn't taken as _B_ by the next run, as `RD-15` property 2 requires.
2. **Full despite the marker: holds.** `[noci]` on `b247c053e`, which added a comment to `.scripts/ci-scope.ts`. Run 44068663234: _"mode: full, because the range changes paths that are neither records nor Markdown"_, _"kept full by: .scripts/ci-scope.ts"_. Witness 3's first push cancelled the run after `scope` had decided.
3. **The range: holds.** `e49a802c8`, with no marker, reworded that comment, so the source change stayed in the range. While its run 44069053052 was in progress, `2eaccc745`, `[noci]` and changing only the record, was pushed. 44069053052 was cancelled. Run 44069866771 chose full, with _B_ `9afdd3ad0`, _"kept full by: .scripts/ci-scope.ts"_, and went green.
4. **`records` fails: holds.** `[noci]` on `7314a5060`, with a misformatted line in the record. Run 44071394306 chose reduced (_B_ `2eaccc745`, the green full run of witness 3). `just fmt-check` failed naming `.plan/ci-speed-1/checks/noci-witnesses.md`, and `verify` failed.

The witnesses' source change and their scratch record are removed in the commit that brings this report up to date, and the final run reads that commit.

## Temporary changes still on the branch

None. `webkit-inventory.yml` was removed at `4136c0eea`, `webkit-parallel.yml` and `safari.yml`'s three witness changes at `368ffeea2`, and `nx`'s `allowBuilds` entry was restored at `5ab74f309`. Item 3's comment in `.scripts/ci-scope.ts` and `checks/noci-witnesses.md` are removed in the commit that brings this report up to date.

## What wasn't verified

- A warm `aube ci` on `macos-26`.
- **GitHub's dependency graph.** From this session, with a token that has admin on the repository, `gh api repos/ausginer/material-x/dependency-graph/compare/main...57c8849a2` answers HTTP 403 _"Forbidden"_, and `…/dependency-graph/sbom` answers HTTP 404. That matches what the architect saw. The graph is read after the merge, by item 4 witness 7 or on the repository's _Dependency graph_ page. nx, the other reader of the lockfile's root entry, ran in every gate job of run 44058089546 at `57c8849a2` and later, and all of them passed.
- WebKit locally. The image lacks WebKit's system libraries (the [dev image handoff](devimage-handoff.md)'s Part B). For the row repairs, they were installed in this container only (`sudo aube exec playwright install-deps webkit`), and the image is unchanged.

## Remediation of the stop

On `repo/ci-speed-1`, after `d631e7432` (fast-forward) and `f63e3d1e4` (merged at `cf0f9f344`).

1. **The click-guard row: done,** at `c8bacf0eb`. The engine-name line and its unused import are deleted. The row passes in `browser/drag/webkit`, `consumer/drag/webkit`, `browser/drag` and `consumer/drag` ([reading](checks/webkit-rows-repair.txt)).
2. **The sortable row: done,** at `c8bacf0eb`. The row expects `takeMismatches()` to be `[]` just before `#r2` leaves the list, and takes them after the release with no assertion. **The witness holds.** A temporary probe, not committed, logged both readings in the six drag browser projects:

   | Project | Before the removal | After the release |
   | --- | --- | --- |
   | `browser/drag/webkit`, `consumer/drag/webkit` | `[]` | `["slot 1"]` |
   | `browser/drag`, `consumer/drag` (Chromium) | `[]` | `[]` |
   | `browser/drag/firefox`, `consumer/drag/firefox` | `[]` | `[]` |

   WebKit's first reading is empty, so the step's stop doesn't apply. Both whole files pass in all six projects. These readings are local, in the devcontainer, with WebKit's system libraries installed in the container.

3. **`RF-47`: stopped.** `aube install --fix-lockfile` exits 0, and its lockfile diff is 2,160 insertions and 1,781 deletions. Compared entry by entry ([reading](checks/rf47-fix-lockfile.txt), [instrument](checks/rf47-lockdiff.mjs)), it adds 40 entries, removes 18, changes no version in place, and edits fields in 15. It does repair the three: lightningcss 1.33.0, `@types/node` 26.6.6 and `ansi-regex` 6.6.0 all leave their stale nests. Beyond them it:
   - adds nested `@typescript-eslint/*` 8.72.2 trees under three `eslint-plugin-import-x` placements, with a second `eslint-plugin-import-x` at 4.17.1 and `semver` 7.8.6;
   - adds `@emnapi/core` and `runtime` 2.0.0-beta.2 and `wasi-threads` 2.2.0 under `vite-custom-element-assets` and `vite-traits-plugin`, and `@emnapi/*` 1.11.0 under `@napi-rs/wasm-runtime`;
   - moves `@fontsource/roboto` and `@size-limit/file` from the root to under `material-x` and `size-limit-preset-rolldown`;
   - edits `license` on six workspace entries, `dev` on five `@emnapi` entries, `peerDependenciesMeta` on three vitest entries, and the root's `hasInstallScript` and `devDependencies`, and drops the lockfile's root `version`.

   The lockfile was restored with `git checkout`, and the tree with `aube install`. `aube ci` can't remove `node_modules` in this container, because it's a mounted volume. **The architect decides** whether this re-resolution is acceptable, or another way to repair the three. (_Decided by `f480cc1de`:_ the whole write is accepted. It is committed at `57c8849a2`, step A below.)

4. **`@oxlint/migrate`: not done here.** The handoff puts it in a later commit than step 3. (_Done as step B_, at `9dab0c066`.)
5. **No auto-install: done,** at `e60626671`. `.npmrc` sets `aubeNoAutoInstall=true`. **aube 2.10.0 reads the key** ([reading](checks/aube-no-auto-install-witness.txt)):
   - **Step 2 held in both rounds.** No _Auto-installing_ was printed, and nothing in `node_modules/.aube-state` was newer than the marker.
   - **`aube exec tsc --version`, the handoff's literal command, never reaches tsc.** aube takes `--version` wherever it stands and prints its own version, before any staleness check. Both rounds therefore also ran `aube exec -- tsc --version`, which runs tsc 7.0.2.
   - **The first edit, an added script, didn't serve:** the control installed nothing either, so the check ignores it.
   - **The edit that served** was `concurrently` `10.0.7` → `^10.0.7`. Under the control, without the line, `aube exec -- tsc --version` printed _"Auto-installing: package.json has changed"_, rewrote five `.aube-state` files, and also rewrote `package-lock.json`.
   - **Restored:** `git checkout`, the line put back, `aube install`, and `git status` clean apart from the unit's own changes.

## Remediation of the stop at `633ef72d8`

After `f480cc1de` (fast-forward). Readings: [A, B and C](checks/remediation-abc.txt), [`.oxlintrc.json`'s regeneration](checks/oxlintrc-migrate-compare.txt).

**A. `RF-47`: done,** at `57c8849a2`, with the whole of aube's write.

- `aube install --fix-lockfile` gives the architect's 2,160 insertions and 1,781 deletions. The instrument, run against the lockfile at `633ef72d8`, prints the reading's three sections, and `diff` against them is empty.
- A second `aube install` answers _"Already up to date"_, and `cmp` finds the file byte-identical.
- **The root `postinstall` still runs.** In a fresh worktree of `57c8849a2`, `aube install` wrote `node_modules/typescript/lib/tsserver.js`. It has a link count of 1, while the store's files have 4, and it carries the script's _"Generated by .scripts/link-tsserver.ts"_ line. Its target exists.
- **The gate is green on it:** run 44058089546, nx's jobs included.
- **The dependency-graph comparison didn't answer:** 403, and 404 for the SBOM. See _What wasn't verified_.

**B. `@oxlint/migrate` 1.93.0: done,** at `9dab0c066`. `aube add -D -W @oxlint/migrate@1.93.0` gives exactly the expected change:

- **Section 1** of the instrument, run between A's file and B's, lists only the package and its own dependencies: `commander` 15.1.0, `globals` 17.14.0, and `oxc-parser` 0.157.0 with its bindings and `@oxc-project/types`.
- **Section 2** lists only the root's new devDependency, and **section 3** is unchanged.
- **The lockfile entries:** 24 added, none removed, and only the root entry modified.
- **No `allowBuilds` entry is needed,** because no added entry has an install script.

**`just oxlint-migrate` runs, and rewrites `.oxlintrc.json`** (160 insertions, 143 deletions). With comments and key order ignored, the regenerated file:

- drops every comment;
- narrows `ignorePatterns` from 76 to the 15 of `eslint.config.ts`;
- drops one top-level rule and adds three (`typescript/no-unsafe-enum-assignment`, `typescript/strict-void-return`, `typescript/unbound-method`);
- loses the seventh override, the hand-written one for the harness guard plugin's tests;
- changes rules inside the others.

So the committed file is hand-maintained beyond the tool's output. **Not committed:** the file was restored. Whether the recipe stays, and what it should leave unchanged, is the architect's.

**C. `--` before an option: done,** at `8a5017d68`. It covers:

- 3 lines in `.agents/docs/handoff.md` and 1 in `.claude/agents/der.md`;
- 2 in `baselines.yml`, 1 in `safari.yml` and 11 in `verify.yml`;
- the `spawn` arrays of `.scripts/oxlint-migrate.ts`, `.scripts/size-reading.ts` and `packages/drag/tests/support/build-package.node.ts`.

Witnesses:

- **The search** for `aube exec <name>` followed by an argument beginning with `-`, outside records, in command lines and in `spawn` arrays, finds nothing. The `aube run` lines in the editor files and `zed-test.sh` aren't `aube exec`, and already pass `--`.
- **`handoff.md`'s eslint command, as written,** with `-c /nonexistent-cfg.ts` on one file, fails in `loadConfigFile` with `ENOENT … '/nonexistent-cfg.ts'`. With `-c eslint.config.ts`, it exits 0.
- **Each changed `spawn` runs:**
  - `consumer/drag`, whose global setup runs `build-package.node.ts`: 20 passed;
  - `node/drag`: 49 passed;
  - `just size-reading` writes its JSON;
  - `just oxlint-migrate` runs.
- **The gate is green:** run 44059513528.

**A reading that contradicts the disposition.** The disposition says `handoff.md`'s eslint command never passed `-c` to eslint. It did. The old form, `aube exec eslint --flag … -c /nonexistent-cfg.ts`, also fails on loading the config. aube takes its own options only **directly after the binary's name**, up to the first argument it doesn't own:

- `aube exec eslint -c x` and `aube exec tsc --version` lose the option to aube;
- `aube exec eslint --flag … --version` prints eslint's version;
- `aube exec eslint package.json -c x` passes `-c` to eslint.

`RD-16` property 8's rule holds by form, so this changes no file. It changes only the reason the disposition gives.

**`aube add` broke the workspace links in place.** After B's `aube add`, `node_modules/@ydinjs/` was gone from the main checkout. The root typecheck then failed (nx: _"Cannot find package '@ydinjs/vite-traits-plugin'"_), and `aube install` still answered _"Already up to date"_.

Fresh worktrees of `633ef72d8`, `57c8849a2` and `9dab0c066` each link all seven workspace packages on `aube install`, and all three lockfiles keep the seven `link` entries. **So the committed state is sound,** and the defect is in aube's incremental `add` with the hoisted linker. `aube install --frozen-lockfile --force` repaired the tree. **It is a finding for the architect,** because every `aube add` a developer runs can leave a tree that typechecks fail on.

**Then the unit resumed,** with item 1 witness 5, item 2 witness 2 and item 3's witnesses above.

## What went wrong on the way

- **A witness commit failed `static` and `docs`.** The temporary parallelism toggle read `process.env.MX_WITNESS_WEBKIT_PARALLEL`, and typecheck requires bracket access there (TS4111). I linted that change but didn't typecheck it. Runs 44060886935 and 44062603945 failed on it. The witnesses themselves ran in their own workflows, and the toggle is gone at `368ffeea2`.
- **`records` couldn't run its tests** until `9afdd3ad0` (see item 3).
- **A `vitest list --json <path>` command** took the path as its output file and overwrote `click-guard.browser.test.ts` with the listing. I restored it from git before any commit.

## nx runs package scripts through npm

The `docs` job's log on run 44060886935 shows nx running a package script with npm: _"npm error Lifecycle script `docs:api:build` failed … command sh -c just docs-api-build"_. The local nx log shows the same, with npm's _"Unknown project config"_ warnings for `.npmrc`'s aube keys.

nx picks its package manager from the lockfile, and `package-lock.json` reads as npm's. So the `package.json` scripts that nx targets run through `npm run`. That is npm running repository code, which `RD-16` property 1 says only aube does, apart from CI's bootstrap. Everything installed is aube's, and the gate is green, so it isn't a capital problem.

It wasn't in the handoff's scope, and I haven't changed it. nx can be told which package manager to use, but that is the architect's decision.

## The measurement rows' failing file

The `measurements` job's _Measurement rows_ step on run 44055280400 reports one failed file, which `|| true` absorbs:

- **File:** `packages/drag/tests/hot-path.browser.test.ts` in `shipped/drag (chromium)`.
- **Row:** _"drag:DRI-17 hot path › should allocate per sample only the CSS string a lifted write needs"_.
- **Failure:** the kernel's bytes per move are 29.33, against a limit of 16 (`tests/hot-path.browser.test.ts:310`).

**It fails on `main` too.** On `main`'s last verify run, 44035423615 at `21392e738` under npm, the same row fails with 18.77 against 16. On the run before it, 44013920613 at `4e85ac046`, both measurement files pass.

So the row is intermittent on `main` and predates this unit. It is `drag`'s, for `RD-8`.

## Final run

**Run [44077720154](https://github.com/ausginer/material-x/actions/runs/44077720154)** (verify, pull request) at `cf82c53c9`, the feature proof's step E, proves the stopping boundary. Its mode is full: scope says _"mode: full, because cf82c53c9…'s message carries no [noci]"_. `scope`, `static`, `chromium`, `firefox`, `webkit`, `docs` and `measurements` passed, and `verify` passed. `records` and `deploy` were skipped.

The run before it is [44071947594](https://github.com/ausginer/material-x/actions/runs/44071947594) at `e5fd8329e`, also full and green, with the same job results.

This report's own commit carries `[noci]`, so its run is reduced, with _B_ at `cf82c53c9`.

## Next

The stopping boundary: pull request #31 green, this report, and the head and run IDs sent to the coordinator. The owner merges. `RD-12` property 12 witness 3 and the dependency graph's reading (remediation step A) come after the merge.

(_Dated 2026-11-17:_ the feature proof is done. The architect decided each open item in the handoff's [_Disposition of the feature proof at `c57722b67`_](ci-speed-handoff.md#disposition-of-the-feature-proof-at-c57722b67).)

- `aube add`'s workspace links: recorded for later, as `RF-48`.
- nx's use of npm: `RD-16` property 1's second exception, with property 9's reason corrected. `.npmrc`'s comment follows it (step E).
- `.oxlintrc.json` against `just oxlint-migrate`: recorded for later, as `RF-49`.
- The Safari issue's _Failed projects_ wording: closed, no change.
- The corrected reading of `aube exec`'s options: corrected in `RD-16` and the handoff (`reviewer-1`).
- `hot-path`'s intermittent row: recorded for later, as `drag:DRF-48`.
# CI-speed unit report: stopped at item 1's WebKit inventory

**Status: stopped,** under the [handoff](ci-speed-handoff.md)'s first stop: _"any WebKit row fails (item 1, witness 2)"_. Two rows fail in WebKit in every run. The inventory is below, and the architect decides each row. Item 4 is done. Items 1 and 2 are implemented, and their remaining witnesses wait for that decision. Item 3 is implemented and unit-tested, and its CI witnesses haven't run.

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

## Item 4: the move to aube (`RD-16`), done

**What changed** (`e9e8f92a2`):

- `package.json` names `"packageManager": "aube@2.10.0"`. `aube.catalog` holds the five pinned versions, and the five overrides and five root dependencies on them are `catalog:`. `aube.allowBuilds` is exactly `RD-16` property 4's list. `allowScripts` is deleted. `check` and `lint` run `aube run <script>` through `concurrently`.
- `.npmrc` holds `RD-16`'s keys: properties 4 to 7, `node-linker=hoisted` and `defaultLockfile=package-lock.json`.
- Every workflow job installs aube with `npm install -g "@endevco/aube@$AUBE_VERSION"` in `runner.temp`. It caches aube's store (`aube store path`) under `aube-<OS>-<aube version>-<hash of package-lock.json>` with `actions/cache` v6.1.0, pinned to its commit, and runs `aube ci` and `aube exec`. `AUBE_VERSION` is written once per workflow, beside `NODE_VERSION`.
- Scripts, editor tasks, the devcontainer, `AGENTS.md`, `.agents/docs/handoff.md`, `.agents/docs/architecture.md`, `implementer.md`, `der.md` and the READMEs' development commands use aube, as the handoff lists. Consumer `npm install` lines and dated records (`spec-consistency.md`, `.plan/`) are unchanged.

**The `.npmrc` keys.** aube reads none of the three old keys. `aube config explain` answers _"unknown setting"_ for `git-tag-version`, `prefer-dedupe` and `save-exact`, in both spellings, so all three are dropped. **One key is added: `savePrefix=`** (empty). It is aube's setting for what `save-exact=true` did, so `aube add` writes an exact version, as every dependency here is. `RD-16` property 7 doesn't list it. The architect may drop it.

**The tree** ([local witnesses](checks/aube-local-witnesses.txt) §1):

- After the catalog change, `aube install` wrote **no** `package-lock.json` diff, and a second one reported _"Already up to date"_. So there is no diff to save. The root entry keeps the resolved versions (`"vite": "8.4.0-beta.1"`), not `catalog:`.
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

  `aube ci` and `aube install` keep those entries, so the committed lockfile installs lightningcss 1.32.0 for `vite-custom-element-assets` under npm and aube alike. **This is a defect in the lockfile, and this unit didn't cause it.** The next `aube add` corrects it as a side effect. It is reported, not repaired.

- **`aube exec` installs first when `package.json` changed** (_"Auto-installing: package.json has changed"_), unless it is given `--no-install`. After the witness commit's edit to `allowBuilds`, `aube exec oxfmt` ran an install, which the policy refused, and the tool didn't run.
- **`aube exec <bin> --version` and `--help` print aube's own output.** Every other argument reaches the binary. A scratch recipe received every flag that the workflows and scripts pass, unchanged (§5).

**The language server.** aube installs global packages. `post-create/typescript-language-server.sh` runs `aube add -g typescript-language-server@6.0.3` from `$HOME`, with `AUBE_GLOBAL_BIN_DIR=$HOME/.local/bin`. aube's own global bin directory isn't on `PATH`, and `~/.local/bin` is. 6.0.3 is from 2026-11-02, and 6.1.0 is 5 days old. Tried in this container: the binary resolves from `~/.local/bin` and prints 6.0.3. **npm's only remaining command** is CI's bootstrap.

**`aube exec @oxlint/migrate`.** `.scripts/oxlint-migrate.ts` now runs `aube exec @oxlint/migrate`, as the handoff asks. `@oxlint/migrate` isn't a dependency, so `just oxlint-migrate` now fails until it is added. `npx` used to fetch it. This is `RD-16` property 8 working as decided. Whether to add the package is open.

**Timing, a reading only** ([`checks/install-times.tsv`](checks/install-times.tsv)). Seconds per step: npm's `setup-node` includes its cache restore, and aube's total adds `Install aube`, the cache restore and, when cold, the cache save.

| Runner | npm ci (#30, run 44030423689) | aube ci, cold (run 44046829370) | aube ci, warm (run 44049217432) | Install total, npm / aube cold / aube warm |
| --- | --- | --- | --- | --- |
| ubuntu-24.04 | 21 to 78 | 3 to 5 | 0 to 2 | 29–86 / 11–19 / 8–13 |
| macos-26 | 38 | 25 (22 in run 44049207091) | not read | 50 / 61 / — |

A warm macOS install wasn't read. Both macOS runs were cold, because the pull request's runs and the branch's push runs save to different cache scopes.

**The merge base's size reading** (`measurements`) fails on this pull request. `main` has no aube settings, so `aube ci` installs it in the isolated layout, and the base's `tsdown` config can't import `@ydinjs/vite-traits-plugin`. The step reports _"The merge base gave no machine-readable size reading"_, as it is written to. The failure lasts until this pull request merges and the merge base carries `.npmrc`.

## Item 1: WebKit in the gate, stopped at witness 2

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

**The WebKit job's time.** In run 44049217432, the test step took 280 s for WebKit, serially. Firefox's took 428 s, serially, and Chromium's took 290 s, in parallel with coverage and visual. WebKit's job took about 6 minutes. **The timeout stays at 20 minutes** until the job passes. It will then be set to about twice the longest WebKit run.

**Not done, waiting for the decision on the two rows:** witness 5, the parallelism reading.

## Item 2: the Safari workflow

**What changed** (`5f2522c3e`):

- `.github/workflows/safari.yml` holds the `safari` job, which is unchanged except for three outputs. The macOS and Safari versions step also writes the versions as outputs. The test step tees the recipe's log. A step that runs only on failure collects each `<project> exited with <non-zero>` line.
- Its triggers are a weekly `schedule` (Mondays 05:00 UTC) and `workflow_dispatch` with an optional `ref`, which the checkout uses.
- Concurrency is grouped by `inputs.ref || github.ref`, with `cancel-in-progress: false` and `queue: max`, as `deploy` has.
- The test job has `contents: read` only. The `issue` job runs only when the test job failed on a `schedule` event. It holds `issues: write` only, runs no checkout and no install, and takes the run, the commit, the versions and the failed projects from the test job's outputs. It creates the `safari` label if it is missing, then comments on the open `safari` issue or opens one.

**Witness 1: holds** ([record](checks/safari-workflow-witness-1.txt)). Run 44049207091 is green on macOS 26.7.2 (25G332) with Safari 27.2 and Reduce Motion read back as 0. All 7 projects exited 0. The `push` trigger was removed at `078574da3`.

**Not done:** witness 2, the issue path. Witness 3 is the coordinator's, after the merge.

## Item 3: the `[noci]` marker, implemented and unit-tested

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

**Not done:** witnesses 1 to 4 on the pull request.

## Temporary changes still on the branch

- `.github/workflows/webkit-inventory.yml` is removed in the commit that adds this report.
- None remains in `safari.yml`: the `push` trigger was removed at `078574da3`.
- `package.json`'s `nx` entry was restored at `5ab74f309`.

## What wasn't verified

- A warm `aube ci` on `macos-26`.
- Item 1 witness 5, item 2 witness 2, and item 3's CI witnesses. A full-mode `scope` run follows from this report's push, but no reduced run has happened.
- WebKit locally. The image lacks WebKit's system libraries (the [dev image handoff](devimage-handoff.md)'s Part B), and installing them in this container was not done.
- GitHub's dependency graph after `aube` (item 4 witness 7) is the coordinator's, after the merge. The lockfile is byte-identical to `main`'s, so the graph reads what it read before.

## Next

**The architect decides the two WebKit rows.** Then the unit continues with item 1 witness 5, item 2 witness 2, item 3's witnesses, and the final green run.
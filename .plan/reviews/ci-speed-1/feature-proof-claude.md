# CI-speed unit — feature proof

**Files were read at:** `e5fd8329e6262e0d809700e44ae0330a712ca6b5` (`repo/ci-speed-1`, the main checkout, clean), the head of pull request [#31](https://github.com/ausginer/material-x/pull/31) (open, non-draft, mergeable). **Diff reviewed:** `229829ef7` (exclusive) → `e5fd8329e` (inclusive). **Records read at the same commit.**

**Governing records:** [`ci-speed-handoff.md`](../../ci-speed-1/ci-speed-handoff.md) items 1 to 4, its _Review before merge_, and the architect's dispositions at `d631e7432` and `f480cc1de` with their remediations; [`ci-speed-report.md`](../../ci-speed-1/ci-speed-report.md) and its readings under [`checks/`](../../ci-speed-1/checks/); `repo:RD-12` as amended, `repo:RD-15`, `repo:RD-16` with properties 8 and 12, and `repo:RF-47`, in [`00-index.md`](../../00-index.md).

**Lens:** feature proof. Each claim below is my own reading of the tree, the CI runs or a local probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: the proof holds.** The four checks the coordinator named hold. The handoff's _Review before merge_ items hold, with four Tier C findings. None of them changes the gate's result. reviewer-2 needs the architect, because it leaves `RD-16` property 1 unmet in CI.

## Scope

**Covered.**

- `.scripts/ci-scope.ts` line by line, and its 20 tests, which I ran (20 passed). I also ran a scratch probe of nine failure inputs to `decide()` (_Readings_).
- `.github/workflows/verify.yml` and `safari.yml` line by line. The `deploy` and `measurements` jobs and `baselines.yml` were compared with `229829ef7`.
- The tree diff from `229829ef7`, and the non-record diff from `9afdd3ad0` and from `503f613ec^`, to find witness temporaries.
- `package-lock.json` at `633ef72d8`, `57c8849a2`, `9dab0c066` and `e5fd8329e`, through the architect's instrument [`rf47-resolution.mjs`](../../ci-speed-1/checks/rf47-resolution.mjs), and an entry-by-entry comparison.
- A search of every tracked file outside records for `aube exec <binary>` followed by an argument that begins with `-`, for the `spawn` arrays, and for `npx`, `aubx`, `aube dlx`, `npm ci`, `npm run` and `npm exec`.
- `aube exec`'s option parsing, reproduced locally on aube 2.10.0 with eslint 10.14.0.
- These runs, through `gh`: their head, event and job results, and the `scope` job's log for each verify run. They are 44071947594 (the final run), 44066844320, 44068384079, 44068663234, 44069053052, 44069866771, 44071394306, 44065100765, 44060878670 (with its step times), 44060878452 and 44062592521. I also read the `records` log of 44071394306, the `docs` and `measurements` logs of 44071947594, the `webkit` job durations of five runs, and issue #32.
- The two drag test repairs, against the disposition at `d631e7432`.

**Not covered.** These areas are unread, which isn't the same as clean.

- I ran no `aube install`, `aube ci`, `aube add` or worktree install. Other sessions share this checkout's `node_modules`. The second-install idempotence and the root `postinstall` reading are the report's. Every gate job's `aube ci` is frozen and passed on the final lockfile.
- I ran no WebKit, Firefox or Safari tests locally. The WebKit inventory, the keyboard and reduced-motion witnesses, and the row repairs' local readings are the report's and CI's.
- I didn't run actionlint, and I didn't read the GitHub dependency graph. The report records 403 and 404 answers for it, and the coordinator reads it after the merge.
- I didn't read the `devimage-handoff.md` work, which is outside this unit.
- The handoff's `RD-12` property 12 witness 3 (a `workflow_dispatch` with a SHA `ref`, and the first scheduled run) comes after the merge.

## The coordinator's four checks

### Witness temporaries are gone: holds

- `git diff 9afdd3ad0 e5fd8329e -- . ':!.plan'` is empty. `9afdd3ad0` is the last source commit before item 3's witnesses, and it was verified in full by run 44066844320. Every non-record file is the same at both commits.
- From `503f613ec^`, the only non-record change is `9afdd3ad0`'s `records` repair in `verify.yml`, which is a fix and not a witness.
- `.plan/ci-speed-1/checks/noci-witnesses.md` is absent. The witness comment in `.scripts/ci-scope.ts` was removed in `e5fd8329e`.
- `.github/workflows/` holds only `baselines.yml`, `safari.yml` and `verify.yml`. `webkit-inventory.yml` existed at `078574da3` and is gone at `4136c0eea`. `webkit-parallel.yml` existed at `86b2fddc2` and `36915512b` and is gone at `368ffeea2`.
- `safari.yml` is byte-identical to its state at `8a5017d68`. It has no `push` trigger, no deliberate `exit 1`, and `schedule` alone in the issue job's condition.
- `MX_WITNESS` appears nowhere in the tree. `aube.allowBuilds` holds `nx@24.0.6`.
- Issue #32 is closed, with the `safari` label and two comments. It is the only issue that has ever carried the label.

### `RF-47`'s write and `@oxlint/migrate`'s addition match their readings: holds

- **Step A.** The instrument, run on the lockfiles at `633ef72d8` and `57c8849a2`, prints sections 1 to 3 identical to [`rf47-resolution.txt`](../../ci-speed-1/checks/rf47-resolution.txt) lines 11–40. `diff` is empty. `57c8849a2` changes only `package-lock.json`, with 2,160 insertions and 1,781 deletions, as recorded.
- **Step B.** The instrument run on `57c8849a2` → `9dab0c066` gives these sections:
  - Section 1 lists exactly 24 new pairs: `@oxlint/migrate@1.93.0`, `commander@15.1.0`, `globals@17.14.0`, `oxc-parser@0.157.0`, its 19 bindings, and `@oxc-project/types@0.157.0`. No pair is removed.
  - Section 2 lists only the root's new `@oxlint/migrate`.
  - Section 3 is the same two eslint peer ranges as after A.
- **The entry comparison** finds 24 entries added, none removed, and only the root entry modified. None of the added entries has `hasInstallScript`, so no `allowBuilds` entry is owed. `package.json` gains `"@oxlint/migrate": "1.93.0"` as an exact version, and nothing else changes.
- **The lockfile at `e5fd8329e`** is byte-identical to `9dab0c066`'s (same SHA-1). It has `lockfileVersion: 3`. Every non-link, non-workspace entry carries `version`, `resolved` and `integrity`. The eight entries without them are the workspace packages, as at `633ef72d8`.

### `aube exec --` wherever an argument starts with `-`, and no `npx`, `aubx` or `aube dlx`: holds

- **The search for `aube exec <binary> … -<option>`** outside records finds nothing. The command lines that remain without `--` pass the binary no option: `aube exec just fmt-check`, `aube exec oxfmt <files>` and `aube exec just size-reading "<path>"`.
- **The `spawn` arrays** all put `'--'` before the binary when the binary gets an option:
  - `.scripts/oxlint-migrate.ts:57–64`;
  - `.scripts/size-reading.ts:82`;
  - `packages/drag/tests/support/build-package.node.ts:34`.

  `size-reading.ts:77` and `:102` give `just build` no option.

- **The editor files and `zed-test.sh`** use `aube run <script> -- <args>`, or `aube run <script>` alone.
- **The other search** finds no `npx`, `aubx`, `aube dlx`, `npm ci`, `npm run` or `npm exec` outside records, except these:
  - `AGENTS.md:43`'s prohibition, which names them;
  - `RD-16` property 9's bootstrap, `npm install -g "@endevco/aube@$AUBE_VERSION"`, in all nine jobs that install;
  - the consumer lines `npm install @ydinjs/core` and `npm install @ydinjs/material-x`;
  - `npx just debug` in four `packages/material-x/src/*/spec-consistency.md` files, which are dated method records. The report classes them as records, under the handoff's _"Historical records stay as they were written"_.

### `.scripts/ci-scope.ts` falls back to full on every failure: holds

- **By reading.** Each step that can fail is inside a `try` whose `catch` returns `full(reason)`:
  - the head's message (`:206`–`:210`);
  - the whole search for _B_, which includes the runs request, each jobs request, the ancestry test, `rev-list --count` and any malformed answer (`:217`–`:223`);
  - the range (`:230`–`:244`).

  Finding no _B_ is full (`:225`–`:227`). `isAncestor` turns exit status 1 into _no_, and throws on any other non-zero status (`:129`–`:131`). A commit the checkout doesn't hold is _not an ancestor_ (`:117`–`:119`), which can only remove candidates. The script fails, and with it `scope` and `verify`, only when the environment is missing or an output file can't be written. That is `RD-15` property 6.

- **By probe** (_Readings_, table 1): nine failure inputs that the tests don't cover all give `full`, with the reason logged.
- **By test.** The suite's API-error, no-_B_, not-an-ancestor and missing-commit cases pass. They are in the 20 cases I ran.
- **In CI** (_Readings_, table 2):
  - every verify run's `scope` log names _H_, _B_ with its run, the mode, and the paths that kept the run full;
  - _B_ was never a cancelled or reduced run's head;
  - the cancelled runs 44068663234 and 44069053052 concluded `verify=failure`, so a cancelled job fails the aggregate.
- **One non-failure path picks a farther _B_.** If `rev-list --count` printed something that isn't a number, the candidate's distance would be `NaN`, and the loop at `:178`–`:182` would keep the first candidate. A farther _B_ only widens the range, so this can't reduce a run. It is not a finding.

## The implementer's correction of the `-c` claim

**The implementer is right, and the record is wrong.** This is reviewer-1.

The disposition at `f480cc1de` (handoff line 338) and `RD-16`'s readings (`00-index.md:733`) both say that `.agents/docs/handoff.md`'s eslint command _"never passes `-c` to eslint"_. Until `8a5017d68`, that command was `aube exec eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts …`, as `git show 633ef72d8:.agents/docs/handoff.md` lines 31 and 34 show. I reproduced it on aube 2.10.0:

| Command | eslint's result |
| --- | --- |
| `aube exec eslint --flag unstable_native_nodejs_ts_config -c /nonexistent-cfg.ts package.json` (the old form) | `ENOENT … stat '/nonexistent-cfg.ts'` in `loadConfigFile`, exit 2: **eslint received `-c`** |
| `aube exec -- eslint --flag unstable_native_nodejs_ts_config -c /nonexistent-cfg.ts package.json` (the new form) | the same `ENOENT` in `loadConfigFile`, exit 2 |
| `aube exec eslint -c /nonexistent-cfg.ts package.json` (the architect's probe) | _"No files matching the pattern "/nonexistent-cfg.ts""_: aube took `-c` as its `--shell-mode` |

The architect's reading ([`rf47-resolution.txt`](../../ci-speed-1/checks/rf47-resolution.txt) line 64) put `-c` directly after the binary. The handoff's command had `--flag …` first, and aube stops reading its own options at an argument it doesn't own. So the old command wasn't a defect. `RD-16` property 8's rule (`--` before any binary that gets an option) is written by form, so it still holds and needs every change that `8a5017d68` made. Only the reason the record gives for the rule is wrong.

## Items that hold, with no finding

- **`scope` and the modes** (`RD-15` properties 1 to 7, handoff item 3).
  - `scope` is the first job (`verify.yml:44`). It has `contents: read` and `actions: read`, and is the only job of either kind there. It checks out with `fetch-depth: 0` and runs `node .scripts/ci-scope.ts` with no install. `HEAD_SHA` is the pull request's head or `github.sha` (`:64`).
  - Every job except `deploy` needs `scope`. The five gate jobs and `measurements` run only when the mode is `full`, and `records` only when it is `reduced`.
  - `records` runs `aube ci`, `just fmt-check`, `just typecheck` and the resolver's tests through the root `test` recipe (`:93`–`:98`). That is `RD-15` property 4 as amended at `4136c0eea`. I repeated the search for other readers: no source, config or story imports a `.md` file or a `.plan/` path, apart from those the report lists.
  - `verify` (`:265`–`:296`) checks `scope` for `success`, and each job against the mode. Any mode other than `full` or `reduced` fails. A `cancelled`, `failure` or wrongly `skipped` job fails it, because only the exact expected string passes.
  - The witnesses hold as the report says (_Readings_, table 2). The reduced run took 77 s, by the timing API's `run_duration_ms` of 77,000. The full run at `9afdd3ad0` took 518 s, from creation to update.
  - `records` failed in 44071394306 on `just fmt-check`, naming `.plan/ci-speed-1/checks/noci-witnesses.md`.
- **The final run, 44071947594, at `e5fd8329e`:** `scope`, `static`, `chromium`, `firefox`, `webkit`, `docs`, `measurements` and `verify` succeeded. `records` and `deploy` were skipped. The head's subject contains the literal `[noci]`, so the marker was read. The run stayed full because the range from _B_ `2eaccc745` contains `.scripts/ci-scope.ts`, the removed witness comment. So the final run is a full run, as the handoff's _Order_ step 6 requires.
- **Permissions.**
  - `scope` is the only job that holds `actions: read`. `baselines.yml`'s `actions: write` is older than this unit and unchanged.
  - The Safari `issue` job is the only holder of `issues: write`. It has no checkout and no install.
  - `deploy` is character-for-character the same as at `229829ef7`.
  - `measurements` changes only in `needs: scope`, its mode condition and the npm-to-aube commands.
  - `baselines.yml` changes only in its install and its `aube exec -- …` commands.
- **The Safari workflow** (`RD-12` property 12, item 2).
  - The triggers are `schedule` and `workflow_dispatch` with an optional `ref`, which the checkout uses.
  - The concurrency group is the ref, with `cancel-in-progress: false`.
  - The test job has `contents: read`, and its outputs feed the issue job.
  - In run 44062592521's log, the recipe's lines read `<project> (safari) exited with 0`, which the `Failed projects` step's `sed` pattern matches when the status is non-zero. No CI run shows that pattern catching a non-zero status, because witness 2's failure came after every project had exited 0.
- **WebKit** (`RD-12` property 11, item 1).
  - The jobs API gives the parallelism step times 284/148, 282/171 and 281/145 s, with every step green, matching [`webkit-parallelism.txt`](../../ci-speed-1/checks/webkit-parallelism.txt).
  - `vitest-config.ts:292` makes WebKit parallel at Chromium's worker count.
  - In the five gate runs since then, the `webkit` job took 218 to 239 s, within `timeout-minutes: 8`.
  - The two row repairs (`c8bacf0eb`) are exactly the disposition's: the engine-name line and its import are deleted, and `takeMismatches()` is called at the two points.
- **`.npmrc` and `package.json`** (`RD-16` properties 2 to 7 and 12).
  - `.npmrc` sets every listed key, `aubeNoAutoInstall=true`, and `savePrefix=`, which `00-index.md:716` accepts. There is no `minimumReleaseAgeExclude` entry.
  - `packageManager` is `aube@2.10.0`. The five overrides are `catalog:`, and the catalog holds the five pins.
  - `allowBuilds` is property 4's list, and `allowScripts` is gone.

## Findings

### reviewer-1 — Two records give a wrong reason for `RD-16` property 8's `--` rule

**Tier C.** Internal only: no file needs to change, and nothing the repository relies on depends on the wrong sentence.

- **Current contract.** `ci-speed-handoff.md:338` says the `--` rule _"fixes a real defect: `.agents/docs/handoff.md`'s eslint command never passes `-c` to eslint"_. `00-index.md:733` says _"`aube exec` reads its own options after the binary, so … `aube exec eslint … -c eslint.config.ts` never passes `-c` to eslint"_. Property 8 (`00-index.md:766`) says _"aube 2.10.0 reads its own options after the binary's name too"_, without saying where that stops.
- **Evidence.** The table above: the old command gave `-c` to eslint. aube reads its own options only until the first argument after the binary that it doesn't own. `--flag` was such an argument. The implementer's report (`ci-speed-report.md:315`–`:321`) records the same reading.
- **Why it is a problem.** A later reader of `RD-16` learns a mechanism that is false: that `-c` is lost anywhere after the binary. The reader may then audit or "repair" commands for a defect that isn't there.
- **Required property.** The records' account of `aube exec`'s option parsing agrees with what aube 2.10.0 does. The rule itself can stay as written.
- **Routed** to the architect, who owns `RD-16` and the handoff's disposition.

### reviewer-2 — In the gate, nx runs `package.json` scripts through `npm run`, so `RD-16` property 1 doesn't hold

**Tier C.** No consumer-observable effect, and the gate is green. It is a decided property that the implementation doesn't meet, so the report's _"Status: done"_ can't cover all of `RD-16`.

- **Current behavior.** The `docs` job of the final run 44071947594 logs `> @ydinjs/core@0.1.0 docs:api:build` and `> @ydinjs/material-x@0.1.0 docs:build`, with npm's prefix format. It also logs npm's _"Unknown project config"_ warning, twice, for each of `aubeNoAutoInstall`, `defaultLockfile`, `managePackageManagerVersions`, `minimumReleaseAge`, `minimumReleaseAgeStrict`, `node-linker`, `packageManagerStrict` and `packageManagerStrictVersion`.
- **Contract.** Property 1 says that _"npm … install nothing and run nothing of the repository, except npm's one bootstrap step in CI"_. Property 9 runs that bootstrap outside the checkout _"so that npm doesn't read the repository's `.npmrc`"_. Both are crossed here. npm runs repository scripts, and it reads the repository's `.npmrc`.
- **Evidence.** The log lines above. The report (`ci-speed-report.md:335`–`:341`) reads the same thing on run 44060886935, and the cause it gives is that nx picks npm from `package-lock.json`. I didn't verify that cause. npm installs nothing here, so the script policy of properties 4 to 6 isn't bypassed.
- **Required property.** In CI and locally, every `package.json` script that nx runs goes through aube. Otherwise `RD-16` states the exception.
- **Routed** to the architect. The implementer has already listed it as open. Whether it waits until after the merge is the architect's call.

### reviewer-3 — The report doesn't record the final run, and three of its sentences contradict the tree without a dated note

**Tier C.** Record completeness only.

- **Current behavior.**
  - `ci-speed-report.md:3` says _"the final run is green: Final run"_, linking to its _Final run_ section. The section at `:355`–`:357` holds only the placeholder _"Read after this commit's push, and sent to the coordinator with its run ID."_ Run 44071947594 appears nowhere in the record.
  - `:8` promises a dated note on every section that a later step changed. Three sentences have none:
    - `:52`, _"The root entry keeps the resolved versions (`"vite": "8.4.0-beta.1"`), not `catalog:`"_. Since `57c8849a2`, the lockfile's root entry has `"vite": "catalog:"` and `"rolldown": "catalog:"`, which I read at `e5fd8329e`.
    - `:82`, _"It is reported, not repaired"_, about the stale nests. `RF-47` repaired them at `57c8849a2`.
    - `:127`, _"The timeout stays at 20 minutes until the job passes"_. It has been 8 since `368ffeea2`. `:139` in the same section says so, but `:127` carries no note.
- **Why it is a problem.** The handoff's stopping boundary is _"the pull request is open with a green final run"_. The record that should prove that boundary doesn't name the run. A reader of `:52` gets the lockfile's root entry wrong, and that entry is the one the dependency-graph reading depends on.
- **Required property.** The report names the final run that proves the stopping boundary. Each statement it makes about the current tree is either true at the head or carries a dated correction.
- **Routed** to the implementer, through the architect.

### reviewer-4 — The comment that states the WebKit parallelism case quotes Vitest's durations as step times

**Tier C.**

- **Current behavior.** `.scripts/vitest-config.ts`'s comment above `fileParallelism` says _"its test step was 41 to 49 % faster"_. By the jobs API, the step times are 48 %, 39 % and 48 % shorter. 41 to 49 % are the Vitest durations in [`webkit-parallelism.txt`](../../ci-speed-1/checks/webkit-parallelism.txt).
- **Contract.** `RD-12` property 11 and handoff item 1 witness 5 measure the test step, and the handoff asks the comment to state which case holds. The case is stated correctly, and both measures are far above 20 %.
- **Required property.** The figure in the comment names the measure it comes from.
- **Routed** to the architect, for the implementer.

## The open items, against the proof

- **`aube add` dropping the `@ydinjs` workspace links.** This doesn't affect the proof. CI installs with `aube ci`. The report reads fresh worktrees of `633ef72d8`, `57c8849a2` and `9dab0c066` as linking all seven packages, and the lockfile at `e5fd8329e` keeps a `link` entry for each of the seven `@ydinjs` packages, which I read, besides one for `size-limit-preset-rolldown`. It does affect the dependency rule that `implementer.md` now teaches (`aube add -D -W <name>`), so a developer who follows the rule can be left with a tree that fails to typecheck.
- **nx running scripts through `npm run`.** This affects the proof: see reviewer-2.
- **`.oxlintrc.json` against the migrate tool's output.** This doesn't affect the proof. Remediation step B allowed _"or the report shows its diff"_, and [`oxlintrc-migrate-compare.txt`](../../ci-speed-1/checks/oxlintrc-migrate-compare.txt) holds a summary of it. The file in the tree is unchanged.
- **The Safari issue's _Failed projects_ wording.** This doesn't affect the proof. In the final `safari.yml`, no step after `Safari projects` can fail, apart from `Failed projects` itself. A failed scheduled run therefore gives the _"none named"_ text only when it failed before any project reported a status, and in that case the text is accurate. Only the witness's extra `exit 1` step made the wording inaccurate.
- **The drag hot-path measurement row.** This doesn't affect the proof. `measurements` is outside the gate, and its `|| true` absorbs the row. The report shows that the row fails on `main` too.

## Observations, not findings

- **The bootstrap.** In every job, npm warns _"1 package has install scripts not yet covered by allowScripts: @endevco/aube@2.10.0 (preinstall: node installArchSpecificPackage.js)"_. aube runs anyway. Whether npm ran that `preinstall` belongs to npm's own global policy, outside the repository's.
- **`measurements`' merge-base tree.** On final run 44071947594, the base `21392e738` installed with aube's defaults, and aube ignored the build scripts of `edgedriver`, `rs-module-lexer` and `unrs-resolver`, so no install script of the base ran. The size reading then failed, as the report predicts, until the merge.

## Readings

**Table 1.** `decide()` on a scratch repository, where _B_ changes `a.ts` and _H_ is `[noci]` and changes only `x.md`. The probe was a scratch script in the session's scratchpad, not committed. Its repository was removed.

| Input | Mode | Logged reason |
| --- | --- | --- |
| control: a valid answer | reduced | `[noci], and every path in the range is a record or Markdown` |
| the runs answer has no `workflow_runs` | full | `… can't be found: TypeError: Cannot read properties of undefined (reading 'map')` |
| the runs answer is `null` | full | `… can't be found: TypeError: Cannot destructure property 'workflow_runs' …` |
| the jobs request rejects | full | `… can't be found: Error: 500` |
| the jobs answer has no `jobs` | full | `… can't be found: TypeError: … (reading 'some')` |
| the runs request rejects | full | `… can't be found: Error: 403` |
| _H_ is not in the checkout | full | `the message of ffff… can't be read: … exited with 128` |
| a run's `head_sha` is `--output=/tmp/x` | full | `no fully verified ancestor of the head was found` |
| `cwd` is not a repository | full | `the message of … can't be read: … exited with 128` |

**Table 2.** The `scope` job's log and the job results, through `gh run view --log`.

| Run | Head | _B_ (run) | Mode | Kept full by | `records` / gate jobs | `verify` |
| --- | --- | --- | --- | --- | --- | --- |
| 44068384079 | `a542fb992` | `9afdd3ad0` (44066844320) | reduced | — | success / skipped | success |
| 44068663234 | `b247c053e` | `9afdd3ad0` (44066844320) | full | `.scripts/ci-scope.ts` | skipped / cancelled | failure |
| 44069053052 | `e49a802c8` | none: no marker | full | — | skipped / cancelled | failure |
| 44069866771 | `2eaccc745` | `9afdd3ad0` (44066844320) | full | `.scripts/ci-scope.ts` | skipped / success | success |
| 44071394306 | `7314a5060` | `2eaccc745` (44069866771) | reduced | — | failure / skipped | failure |
| 44071947594 | `e5fd8329e` | `2eaccc745` (44069866771) | full | `.scripts/ci-scope.ts` | skipped / success | success |

In 44068663234, the gate jobs that were still running were cancelled: `firefox`, `chromium` and `webkit`. In 44069053052, they were `chromium` and `firefox`.
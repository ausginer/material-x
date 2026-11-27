# `@ydinjs/mutator` — unit 1's report

**By the implementer, on 2026-11-26,** on `repo/mutations-1` from `cf378ad2e`, for `repo:RD-65` and its [plan](mutations-plan.md). Requested by the coordinator (#300).

## What is in the unit

- **The package,** [`packages/mutator/`](../../packages/mutator/), private, with the CLI `mutator` and no runtime dependency. `vitest` is its peer, `^5`, and the root's `devDependencies` install it. It names nothing of material-x: the engines, the setup and the builds are the [config](../../mutator.config.ts)'s.
  - [`format.ts`](../../packages/mutator/src/format.ts): the data of a mutation file and of a config. Every path is relative to the repository's root. A mutation has a `name`, a `group` (`mechanism`, `engine`, `doubted` or `other`, `RD-62` property 5's three groups and the rest), `edits`, an `expect` that `fails` rows or `survives` for a reason, and optionally its own `engines` and a `byEngine` expectation with its reason.
  - [`run.ts`](../../packages/mutator/src/run.ts): refuses stale edits from the commit before anything runs, makes the copy, runs the config's setup, runs the unmutated files in each engine, refuses a selector that covers no row that ran before any mutation, and then applies each mutation once for all its engines, rebuilds, runs and restores.
  - [`copy.ts`](../../packages/mutator/src/copy.ts): the copy is a detached worktree in a temporary directory, locked with the reason `mutator <pid>`. See [the copy](#the-copy).
  - [`report.ts`](../../packages/mutator/src/report.ts): the outcomes, the engines' comparison and the Markdown summary.
  - [`cli.ts`](../../packages/mutator/src/cli.ts): `run`, `check` and `summary`. `run` exits with 0 when every outcome is _as expected_ and nothing differs, 1 otherwise, 2 on a refusal, 128 plus the signal's number when `SIGINT` or `SIGTERM` stops it, and 3 on any other failure.
- **The config,** [`mutator.config.ts`](../../mutator.config.ts) at the root: the setup is `aube install --frozen-lockfile` and `just _test-builds`, each engine is `MX_TEST_ENGINES=<engine>`, and an edit of the source of `box-quad`, `core`, `drag`, `tproc`, `vite-custom-element-assets` or `vite-traits-plugin` rebuilds that package with Nx.
- **The workflow,** [`mutations.yml`](../../.github/workflows/mutations.yml): `workflow_dispatch` alone, with `ref`, `file` and `shards`, `contents: read` and no secret. See [the workflow](#the-workflow).
- **The workspace:** the package's node project, `node/mutator`, in the root's Vitest projects, and the package in the root recipes' project lists for format, lint and typecheck. The lockfile records the new member, with `aube install --fix-lockfile`. No other version changes.

## Choices the record doesn't make

For the reviewer, each a reading of `RD-65` and the plan:

- **A row that ran and passed unmutated, and doesn't run with the mutation, has no verdict,** as `RD-66` property 3 decides. Until `RD-66` it counted as failed: `reviewer-1`.
- **_Survives_ is judged on rows that passed unmutated,** so a row that already fails doesn't make it _caught_. _Void_ is only for a selected row, as the plan defines it.
- **A selector covers only the rows that ran unmutated in that engine.** A selector whose rows an engine skips is refused there, so a file with a row that only one engine runs needs that engine's own expectation, which is the plan's _"for a row with an engine condition"_.
- **An engine with a `byEngine` expectation is left out of the engines' comparison,** because that expectation gives the reason for its difference. The engines whose expectation is the mutation's own are still compared. Until `reviewer-2`, any `byEngine` expectation suppressed _differs_ for every engine.
- **A mutation is applied once and run in each of its engines,** where the plan's legs run one engine each. Locally that rebuilds once per mutation, not once per engine. In CI each leg has one engine, so nothing differs.
- **`--shard <i>/<n>`, `--report` and `--summary`** are beyond the four options of property 8. The workflow needs them, because a leg is one shard. `RD-66` property 2 lists them and removes `--workdir`.
- **The CLI's exit codes** in CI: a leg treats 1 as a completed run, whose outcomes the summary judges, so a leg fails only for a reason outside the tests.

## The copy

**The owner's word, (b):** _"Я бы сделал detached worktree, (b)…"_, recorded under `RD-65` by the architect. It covers the worktree that `mutator run` makes for one run, and nothing else. How the tool keeps to that:

- **One worktree per run,** in a new temporary directory (`$TMPDIR/mutator-*/copy`), detached at the commit, locked with the reason `mutator <pid>`. No ref and no file of the invoking checkout changes.
- **Removed when the run ends,** after a success, a failure, `SIGINT` or `SIGTERM`: unlocked, removed with `--force`, pruned, and its directory deleted. On a signal, the tool first stops the command that runs with `SIGTERM` and waits for it to exit, so nothing that the command writes outlives the copy (`reviewer-5`).
- **A run that is killed** can't remove its worktree. The next run of the tool in that repository removes every worktree locked with `mutator <pid>` whose process no longer runs, before it makes its own. A worktree whose process still runs is another run's, and is left.
- **The node rows** make each worktree in a fixture repository that the row creates in a temporary directory, never in this repository.

## Evidence

**The package's rows,** 23, in [`tests/mutator.node.test.ts`](../../packages/mutator/tests/mutator.node.test.ts), on a fixture repository made from [`fixture/`](../../packages/mutator/fixture/) for each row, with a node project and a browser project. They cover:

- each refusal;
- the checkout and the temporary directory unchanged after a run, after a failed one and after `SIGTERM` to the tool alone, with no process left, even when the command that the signal stops takes half a second to exit;
- a stale worktree removed;
- each outcome, including _void_ for a file that doesn't load, under _fails_ and under _survives_;
- an engine's own expectation, and the browser project;
- the flag, and three cases that don't raise it: a skipped row, a row that doesn't run in one engine, and an engine whose own expectation gives the reason, while two other engines still differ;
- the restore between mutations, and a rebuild for a matching path and not for another.

The 18 rows of `9a65f1a89` are described in [after the feature proof](#after-the-feature-proof).

**Their witnesses are the tool's own run** ([file](mutator.mutations.ts)), in Chromium, as `RD-65`'s Q3 asks of an implementer:

- **The first run, at `ef6a78b93`** ([summary](checks/mutator-chromium-1.md), [report](checks/mutator-chromium-1.json)), found a defect: 16 of the 17 rows fail unmutated, and 11 outcomes are _void_. The root's `.gitignore` ignores `packages/**/*.js`, so the fixture's `built/value.js` was never committed. The rows passed in the slot because the file was in its working tree. The copy is the commit, and the setup's build fails there. `472edce31` renames the file to `built/value.ts`.
- **The second run, at `472edce31`** ([summary](checks/mutator-chromium-2.md), [report](checks/mutator-chromium-2.json)): 18 rows unmutated, and every outcome _as expected_. 12 mutations remove a mechanism and fail its rows, and one is predicted to survive: _a row that doesn't run counts as passing_, because no fixture row's file fails to load with a mutation. It is a gap in the rows, kept as a prediction rather than a row.

**The acceptance run** (`RD-65` property 10), `RF-142`'s review runner rewritten as [data](acceptance/rf-142.mutations.ts), at `9173a25a1`, the head that review read:

1. **Rewritten:** each mutation's edits are the runner's, and each expectation is the review's Chromium [reading](../reviews/disabled-item-1/checks/mutations.txt): the rows that each of 10 mutations failed, one selector per row, 34 in all, and for the 4 that failed none, the reason from the feature proof's `reviewer-1`. The review recorded no group, so the groups are the implementer's: the 4 survivors are _doubted_, and the others remove a required property's mechanism.
2. **Run locally in Chromium** ([summary](acceptance/checks/chromium.md), [report](acceptance/checks/chromium.json)), in 12 minutes: 193 rows unmutated, as the review read, and **every outcome _as expected_**. Each mutation fails exactly the rows of the review's reading, compared row by row, not only by count. A first run with a clone in place of the worktree, before the owner's answer, read the same.
3. **Dispatched in the three engines:** not yet. See [the workflow](#the-workflow).
4. **A wrong prediction** ([file](acceptance/rf-142-wrong.mutations.ts), [summary](acceptance/checks/wrong-chromium.md), [report](acceptance/checks/wrong-chromium.json)): _a disabled control keeps its description_, predicted to fail a row of the handle's semantics too. The run reports it **_missed_**, names that row, lists the two rows it does fail, and exits with 1.

**The workflow** has no run: GitHub dispatches a workflow only from the default branch. What was read before the merge:

- The YAML parses, with `workflow_dispatch` alone, its three inputs, `contents: read`, and the jobs `plan`, `leg` and `summary`.
- `plan`'s two steps, run locally: `mutator check` on the acceptance file at `9173a25a1` gives the commit and the three engines, and the matrix step gives one leg per engine and shard (six for `shards: 2`). On [a stale file](acceptance/stale.mutations.ts), `check` exits with 2 and names the edit.
- A leg's command is the local run's, with the file and the config from `.mutator/`. The tool makes its worktree of `ref` from the leg's checkout and doesn't write to that checkout, which the row _should leave the checkout and the temporary directory as they were after a run_ covers.
- **Not read:** the jobs on GitHub's runners, the browser action from the sparse checkout, the artifacts and the summary job. **Owed after the merge, by `RD-66` property 4:** the acceptance dispatch on `main`, with `ref: 9173a25a1` and `file: .plan/mutations-1/acceptance/rf-142.mutations.ts`, in the three engines, with its outcomes recorded as information. Its summary names `9173a25a1` as the commit run and `main`'s commit as the file's. Also owed: the dispatch of `acceptance/stale.mutations.ts` with `ref: main`, which `plan` refuses before any leg starts.

## After the feature proof

**`RD-66` and the [feature proof](../reviews/mutations-1/feature-proof-claude.md)'s other findings, by the implementer, on 2026-11-26,** on `repo/mutations-1` from `08b72380c`, with `origin/main` at `e457ed209` merged in `81e8b18dc`. Requested by the coordinator. The owner approved `RD-66`'s three rulings. The code is at `10b3be83d`, and the rows and witnesses at `a1ba81d6c` and `d643d8f4d`. Until then, the package had 18 rows, and the `--workdir` row was one of them.

- **`reviewer-3`, `RD-66` properties 1 and 4.** The workflow's sparse checkout of the dispatch ref adds `inputs.file`. `plan` and `leg` pass `.mutator/<file>`, so `ref` doesn't have to hold the file. The header and the two inputs' descriptions say so. `run` reads the file's commit and its path from the checkout that holds it. The report's `fileCommit` and the summary's first line name it beside the commit whose code ran. Property 4's dispatch is the witness, after the merge.
- **`reviewer-4`, `RD-66` property 2.** `--workdir` is removed from the CLI, its header, `RunOptions` and `run`. The leg calls `run` without it, and the `--workdir` row is gone. Every run makes its own worktree.
- **`reviewer-1`, `RD-66` property 3.** In `judge`, a row has a verdict only when it passed unmutated and ran with the mutation.
  - For _fails_, the order is _void_, then _missed_, then _as expected_. For _survives_, it is _caught_, then _void_, then _as expected_.
  - `runVitest` keeps the message of a test file that failed as a whole. The report's `unrun` gives each row that didn't run with that reason, and the summary prints it under the row.
  - The engines' comparison counts only rows with a verdict in each engine compared.
  - New rows: a mutation that breaks `src/math.ts`'s parse reads _void_ under _fails_, with the parse error as the reason, and _void_ under _survives_. A row that doesn't run in one engine isn't flagged.
- **`reviewer-2`.** An engine with its own expectation is left out of the comparison, and the others are still compared. `hasEngineExpectations` is gone, because `engineReason` already says it. New row: three engines, `a` with its own expectation, and `b` and `c` differ: flagged.
- **`reviewer-5`.** `exec` takes an `AbortSignal`. When the signal aborts, `exec` waits for the command to exit before it rejects. The run then unwinds through every `finally`, so Vitest's report directory and the copy are removed. The CLI exits with 128 plus the signal's number: 130 for `SIGINT` and 143 for `SIGTERM`. New rows:
  - `SIGTERM` to the tool alone during a mutated run: exit 143, no report, nothing in the temporary directory and no process left.
  - The same during a setup command that takes half a second to exit and then writes into the copy.
- **`reviewer-6`.** The implementer's file has a witness for each row, the three of the feature proof among them.
  - The browser row's mechanism is the engine's environment, so its witness removes the environment. That witness also fails the five rows of the other engines.
  - The `--workdir` part goes with the option.
- **`reviewer-7`.** A leg that exits with 2 writes `refused.txt`, naming its engine and shard, and uploads it. For each refused leg, `summary` says that it refused the file and that running it again refuses it again. It says _run it again_ only when fewer legs reported than `plan` planned. Read, not run: GitHub can't dispatch the workflow before the merge.

**The witnesses, in Chromium:**

- **Run 3, at `a1ba81d6c`** ([summary](checks/mutator-chromium-3.md), [report](checks/mutator-chromium-3.json)): 22 rows unmutated, and 21 of 22 outcomes _as expected_. _A stopped command is not waited for_ was **missed**. The `SIGTERM` row passed without the wait, because the Vitest it stops exits before the copy is removed, so the row couldn't see the mechanism. `d643d8f4d` adds the row with the slow command. The scratch reading before the commit: that row fails with the mutation, and passes without it once the command has printed its ready line. When the signal came before that line, the command died before it set its handler, and the row passed both ways.
- **Run 4, at `d643d8f4d`** ([summary](checks/mutator-chromium-4.md), [report](checks/mutator-chromium-4.json)): 23 rows unmutated, and **every outcome _as expected_**. Four older witnesses fail rows beyond their selectors, and those rows are newer than the predictions:
  - _the copy stays after a run_ fails the two signal rows and the stale-copy row;
  - _engines never differ_ fails the three-engine row;
  - _a row that one engine skips counts_ fails the row of a file that doesn't load in one engine;
  - _nothing rebuilds_ fails _after a run that fails midway_.

## After the recheck

**The [recheck](../reviews/mutations-1/feature-proof-recheck-claude.md)'s four findings, by the implementer, on 2026-11-26,** on `repo/mutations-1` from `bf08f711d`. Requested by the coordinator. The code, the rows and the witnesses are at `0ec97ff3f`. The package has 30 rows.

- **`recheck-1`, a browser that doesn't start.** Vitest then exits with 1, prints the reason on its standard error, and its JSON lists the file as passed with no row. `runVitest` now keeps that output as the run's `failure` when Vitest exits non-zero and neither a failed row nor a test file's message reports why. The stack frames are left out, so the reason fits in the lines kept.
  - **Unmutated:** the run fails with 3, with Vitest's output, and isn't a refusal. In CI, the leg uploads no report, and the summary says _run it again_. The engine failed, not the file, and the next run may start it. No ruling was needed: `RD-65`'s CLI gives 2 to a refusal of the file and 3 to any other failure. The CLI's header now says so.
  - **With a mutation:** each row that didn't run reads _void_, with Vitest's output as its reason in the report and the summary.
- **`recheck-2`, a local run's file commit.** `fileCommit` is set only when one checkout holds the file, the config and the tool's own source, and `git status --ignored` shows none of them modified, new or ignored. Otherwise the summary says _"the file and the runner at no commit that holds them as they ran"_. A CI leg's `.mutator/` checkout holds all three and is clean, so a dispatched run reads as before. No ruling was needed: `RD-66` property 1 names the commit that the file and the runner came from, and the new form names one only when that is true.
- **`recheck-3`, rows for the summary.** The helper now writes the summary and can commit the file and the config, and also a copy of the tool's source, in a second commit after the fixture's. New rows:
  - The code at `HEAD~1`, the file, the config and the runner at `HEAD`: the summary names both commits, and the report's `fileCommit` is `HEAD`.
  - The same with the file modified after its commit: no commit.
  - The file and the config committed, and the runner from the package's own checkout: no commit.
  - The summary prints the first reason under the row, for a test file that doesn't load, for a skipped row and for a browser that doesn't start.
  - A survivor whose row the mutation skips (`it.skip`) reads _void_, with _the row was skipped_.
- **`recheck-1`'s rows:** a mutation of the fixture's config that stops its browser from starting reads _void_ with Vitest's output, and the same edit committed before the run makes the run exit with 3, not 2.
- **`recheck-4`.** `parseArgs` runs inside `main`, so an unknown option exits with 3, as a failure outside the tests. New row: `--workdir .` exits with 3 and names the option.
- **The workflow** is unchanged, except that its header names a browser that doesn't start as a failure outside the tests.
- **A short `TMPDIR`:** the rows and the witnesses ran with `TMPDIR=/tmp` and a directory directly under it, as the recheck advises.

**The witnesses, in Chromium:**

- **Run 5, at `0ec97ff3f`** ([summary](checks/mutator-chromium-5.md), [report](checks/mutator-chromium-5.json)): 30 rows unmutated, and **every outcome of the 32 _as expected_**, the recheck's three mutations among them. The ten new witnesses fail their rows: the file's commit as the code's fails the three commit rows, and the summary without the reason fails the three rows that read it. The summary's first line names `0ec97ff3f` for the file and the runner, which held them as they ran. Nothing named `mutator-*` was left in the temporary directory, and no worktree.

## After the second recheck

**The [second recheck](../reviews/mutations-1/feature-proof-recheck-2-claude.md)'s three findings, by the implementer, on 2026-11-27,** on `repo/mutations-1` from `c921af6c7` and the merge of `main` `9bf745912`. Requested by the coordinator. The code, the rows and the witnesses are at `970338cb9`. The package has 34 rows.

- **`recheck2-1`, the cases of exit 3.** `runVitest` keeps a `failure` only when Vitest's report lists a test file. A run whose tests match no test file has no row again, so the file's selectors refuse it with 2, as at `0cc0d9516` and as `RD-65` property 5 says. Vitest also runs with the `dot` reporter, which prints unhandled errors on its standard error, because the JSON report has none. The reason is the first lines of that standard error, without stack frames, code frames or the reporter's banner, or _"Vitest printed no error"_. It no longer falls back to the standard output, whose only line was the JSON report's path.
  - **A browser that doesn't start:** exit 3, as before, and the reason's second line is _"Error: browserType.launch: Failed to launch chromium …"_.
  - **An unhandled error in a row that passes** (the recheck's case H): exit 3, as at `0c38a4f7b`, and the reason is _"Error: left unhandled"_. Its class is unchanged, because no decision settles it ([Open](#open)).
  - The reviewer's probe P3, run again on the fix ([transcript](checks/p3-after-recheck-2.txt)): case N exits with 2 and names the selector, and case H exits with 3 with the error.
- **`recheck2-2`.** `RD-66`'s second dated note is a paragraph of its own (`18c152d0d`).
- **`recheck2-3`.** Two rows: a config modified after its commit, and a file that the checkout's `.git/info/exclude` ignores. In both, the report has no `fileCommit`. The recheck's two mutations that survived are now witnesses that fail them.
- **New rows for `recheck2-1`:** a run that selects no test file is refused by its selector, and an unhandled error in a passing row exits with 3 with Vitest's error. The browser row also reads that the reason doesn't name the JSON report.

**The witnesses, in Chromium:**

- **Run 6, at `970338cb9`** ([summary](checks/mutator-chromium-6.md), [report](checks/mutator-chromium-6.json)): 34 rows unmutated, and **every outcome of the 38 _as expected_**. The six new witnesses each fail their rows: a run with no test file as a failure fails the refusal row, no `dot` reporter fails the unhandled-error row, the standard output as the reason fails three rows, the banner kept fails the browser's void row, and the reviewer's two survivors now fail the config row and the ignored-file row. The summary names `970338cb9` for the code, the file and the runner. Nothing named `mutator-*` was left in the temporary directory, and no worktree.

## After RD-66's rulings of 2026-11-27

**`RD-66`'s ruling on case H, and the owner's (a) on a run that selects no test file, by the implementer, on 2026-11-27,** on `repo/mutations-1`. Requested by the coordinator. The code is at `97923379f` (case H), `e373f8eb8` ((a)) and `acc9083ac` (colors), with the merges of `main` `6a9ff612d` and `9cd303406`. The package has 37 rows.

- **Case H.** A run whose rows ran, beside an error that Vitest prints outside every row and every test file's message, is judged by property 3, and its exit follows the outcomes. `runVitest` keeps that error as the run's `runError`: the section under the `dot` reporter's _Unhandled Errors_ banner, or Vitest's standard error when there is no banner. The report keeps it for the unmutated run in each leg and for each mutated run that has one, and the summary names the unmutated run's error in each engine. A run still fails with 3 only when a listed test file has no row and no message, as when a browser doesn't start. Row: _"should judge a run whose rows pass beside an unhandled error, and report the error"_, which replaces the row that read exit 3.
- **(a).** In each engine, after the unmutated runs and before any mutation, the file is refused with 2 and no report when Vitest's report for one of its runs lists no test file, for any expectations. The refusal names each such run, by its tests and directory, and the engine: _"a: the run of tests/nothing in . selects no test file"_. It comes before the selector refusal, so a selector into that run isn't listed. Rows: a file with only _survives_ whose run selects no test file (2, no mutation applied, no rebuild), a file with two runs that names only the run without a test file, and the existing row, renamed _"should refuse a file whose run selects no test file"_, which reads this refusal's line.
- **Colors on CI.** CI sets `FORCE_COLOR`, so Vitest's standard error carried ANSI codes: the banner wasn't stripped, and the error lines didn't match. `verify` failed the browser void row and the case H row at `e373f8eb8` (run 46046386597), and at `bd14b5e04` before it (run 45981371449). The cause arrived with `970338cb9`'s `dot` reporter. `runVitest` now strips control characters from the standard error. `NO_COLOR` was tried and rejected: with `FORCE_COLOR` set, Node prints a warning on the standard error, which became the reason's first line. Row: the case H run with `FORCE_COLOR=1`. The 37 rows pass with and without `FORCE_COLOR`. The `RolldownError` lines in the same job are coverage's parse of material-x's `.mdx` and `.md` files, and they are in the green run at `c921af6c7` too.
- **Witnesses:** _an unhandled error beside rows that ran is a failure outside the tests_ and _the summary doesn't name the unmutated run's error_ for case H, _a run that selects no test file is not refused_ for (a), _Vitest's colors are kept_ for the colors, and _a run that selects no test file is a failure outside the tests_ predicted again against (a)'s three rows. Three earlier witnesses take the code's new text.

**The witnesses, in Chromium:**

- **Run 7, at `acc9083ac`** ([summary](checks/mutator-chromium-7.md), [report](checks/mutator-chromium-7.json)): 37 rows unmutated, and **every outcome of the 42 _as expected_**. The new witnesses fail 2, 1, 3, 1 and 3 rows. The summary names `acc9083ac` for the code, the file and the runner. Nothing named `mutator-*` was left in the temporary directory, and no worktree. A first run 7 at `e373f8eb8` was stopped after 26 mutations, when the color fix changed a witness's edit text, and its copy was removed by hand.

## Checks

**After RD-66's rulings of 2026-11-27:** `packages/mutator`: format, lint and typecheck, and its 37 rows, with and without `FORCE_COLOR=1`. The witnesses above, run 7. **Not run:** the workflow on GitHub.

**After the second recheck:** `packages/mutator`: format, lint and typecheck, and its 34 rows. The witnesses above, run 6. **Not run:** the workflow on GitHub.

**After the recheck:** `packages/mutator`: format, lint and typecheck, and its 30 rows. The witnesses above, run 5. The workflow's `oxfmt --check`. **Not run:** the workflow on GitHub.

**After the feature proof:** `packages/mutator`: format, lint and typecheck, and its 23 rows. The witnesses above, run 4 with no worktree and no `mutator-*` directory left after it. The workflow's YAML parses and `oxfmt --check` passes on it. **Not run:** the workflow on GitHub.

**At `9a65f1a89`:** `packages/mutator`: format, lint and typecheck, and its 18 rows. The root's typecheck with `mutator.config.ts`, and lint of the changed root files. The root's `fmt-check`, `lint` and `typecheck`, which now list the package. **Not run:** the workflow on GitHub, and the other packages' suites, whose sources this unit doesn't change.

## Open

- The two dispatches above, after the merge, on `main`'s workflow.
- Unit 2, the documentation of `RD-62`'s amendment and the worktree's exception in `agent-workflow.md` and `coordinator-setup.md`.
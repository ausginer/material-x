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

## Checks

**After the feature proof:** `packages/mutator`: format, lint and typecheck, and its 23 rows. The witnesses above, run 4 with no worktree and no `mutator-*` directory left after it. The workflow's YAML parses and `oxfmt --check` passes on it. **Not run:** the workflow on GitHub.

**At `9a65f1a89`:** `packages/mutator`: format, lint and typecheck, and its 18 rows. The root's typecheck with `mutator.config.ts`, and lint of the changed root files. The root's `fmt-check`, `lint` and `typecheck`, which now list the package. **Not run:** the workflow on GitHub, and the other packages' suites, whose sources this unit doesn't change.

## Open

- The two dispatches above, after the merge, on `main`'s workflow.
- Unit 2, the documentation of `RD-62`'s amendment and the worktree's exception in `agent-workflow.md` and `coordinator-setup.md`.
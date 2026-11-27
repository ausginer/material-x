# `repo:RD-65` unit 1, `@ydinjs/mutator` (#301): recheck after `RD-66`

**Files were read at:** `0cc0d9516`, the head of #301 (`repo/mutations-1`), in slot `e`. The proof was read at `9a65f1a89`. Since then: `10b3be83d` (code), `a1ba81d6c` and `d643d8f4d` (rows and witnesses), `a833f16a3` (report), `d5d28ae92` (formatting of saved outputs), `0cc0d9516` (`RD-64`'s move), and the merges of `main` `81e8b18dc` and `2f5b50162`.

**Subject:** [`RD-66`](../../decisions/RD-66.md) properties 1 to 4 with the implementer's note, the plan's [_After the feature proof_](../../mutations-1/mutations-plan.md#after-the-feature-proof-2026-11-26), the report's [_After the feature proof_](../../mutations-1/mutations-report.md#after-the-feature-proof), and the [feature proof](feature-proof-claude.md)'s `reviewer-2` and `reviewer-5` to `reviewer-7`. Requested by the coordinator.

**Verdict: `RD-66` properties 1 and 2 hold, and property 3 holds except for a browser that doesn't start. `reviewer-2` and `reviewer-5` to `reviewer-7` hold.** Each of the 23 rows has a witness, and the implementer's 22 witnesses fail the same rows as his run 4 in Chromium, Firefox and WebKit. Four findings: two are tier B and two are tier C, one of them pre-existing. All four are the implementer's. **`verify` passed on the head:** run [45868373455](https://github.com/ausginer/material-x/actions/runs/45868373455). The two dispatches stay owed after the merge.

## Scope

**Covered:**

- **The diff** `9a65f1a89..0cc0d9516` of `packages/mutator/src/`, its rows and `.github/workflows/mutations.yml`. The rest of the diff is the two merges of `main`.
- **`d5d28ae92`:** each of its 8 JSON files parses to the same data before and after. The one Markdown file loses only its last newline. `0cc0d9516` changes three links, and its two decision files are new.
- **The 23 rows,** run directly: 23 passed in 30 s, with nothing left in the temporary directory. They also ran, 23 of 23, in `verify`'s `chromium` job.
- **The witnesses:** every row is failed by at least one mutation in the implementer's [run 4](../../mutations-1/checks/mutator-chromium-4.json). Runs 3 and 4 were read, and run 4 was repeated in the three engines.
- **The recheck's own mutations** ([file](recheck.mutations.ts)), in the three engines.
- **Probes:** [P1](probes/recheck/p1-ci-shape.sh) is `RD-66` property 1 in CI's shape ([transcript](checks/recheck/p1-ci-shape.txt)). [P2](probes/recheck/p2-browser.sh) is a browser that doesn't start ([transcript](checks/recheck/p2-browser.txt)). Both ran on repositories made from the fixture in the scratch directory.
- **CI:** `verify` run [45868373455](https://github.com/ausginer/material-x/actions/runs/45868373455) on `0cc0d9516`, success, every job green. Its `chromium` job ran `node/mutator`'s 23 rows, 23 passed (job 140077368662). The `firefox` and `webkit` jobs run no node project.

**Not covered:** the workflow on GitHub's runners, which can't be dispatched before the merge. Safari. A screen of the step summary.

**The engines.** The tool's rows are node rows, and an engine only sets `MX_TEST_ENGINES` for the run, which no row reads. A row reads a browser only through the fixture's own `chromium` engine. So the three engines are three runs of the same rows. Each tool run made only its own worktree, in its own temporary directory, and removed it. `git worktree list` and `git status` read the same after each run.

**A mistake in the method, corrected.** The first two tool runs used a `TMPDIR` of 93 characters in the scratch directory ([recheck](checks/recheck/recheck-long-tmpdir.md), [implementer](checks/recheck/implementer-long-tmpdir.md)). In it, the row _should run in a browser project_ failed unmutated in each engine, so two of the implementer's witnesses read _void_. The cause is Chromium's `SingletonSocket`, whose path is then longer than a Unix socket allows (P2, U'). The runs were repeated with a `TMPDIR` of 13 characters. The first runs are kept, because they found `recheck-1`. P1's saved run overlapped with the first tool run. P1 is a node run of one mutation.

## `RD-66`

| Property | Reading |
| --- | --- |
| 1, the file from the dispatch ref | **Holds.** P1, case 1: the root is checked out at `A`, which doesn't hold the file. The file and the config are in `.mutator/`, a checkout of their own, and the run uses `--ref A`. The run reads the file. The report's `commit` is `A` and its `fileCommit` is the runner checkout's commit. The summary's first line names both. Both checkouts read the same afterwards. The workflow's sparse checkout adds `inputs.file`, `plan` and `leg` pass `.mutator/$FILE`, and the inputs' descriptions say so. For a local run with a modified file, see `recheck-2`. |
| 2, no `--workdir` | **Holds.** No source and no workflow step names it. `run --workdir .` is refused as an unknown option. The leg calls `run` with `--ref`, `--engine`, `--shard`, `--config` and `--report`. The recheck's mutation _the mutations are applied in the invoking checkout_ fails 15 rows in each engine. |
| 3, a row that didn't run has no verdict | **Holds for a test file that doesn't load.** The rows read _void_ with the parse error, under _fails_ and under _survives_, and a row that doesn't run in one engine isn't compared. **Not for a browser that doesn't start,** which the property names: `recheck-1`. |
| 4, the dispatch owed | **Recorded as the ruling says.** The report's _Checks_ and `RD-65`'s note name `ref: 9173a25a1` with the file on `main`. It is still owed (below). |

## The proof's findings

| Finding | Reading |
| --- | --- |
| `reviewer-1` | `RD-66` property 3, above. |
| `reviewer-2` | **Holds.** `differs` leaves out only the engines that have an expectation of their own. The row _should flag a difference between engines that another engine's own expectation doesn't explain_ is the proof's P2: three engines, `a` with its own expectation, and `b` and `c` differ. The witness _one engine's own expectation accounts for every engine's difference_ fails it in the three engines. |
| `reviewer-3` | `RD-66` properties 1 and 4, above. |
| `reviewer-4` | `RD-66` property 2, above. |
| `reviewer-5` | **Holds.** `exec` passes an `AbortSignal` to `spawn` and rejects after the command closes. `run` aborts on the first `SIGINT` or `SIGTERM` and unwinds through each `finally`. The rows read exit 143, no report, nothing in the temporary directory and no process, for Vitest and for a setup command that takes half a second to exit. The recheck's mutations _Vitest doesn't get the signal_ and _a signal exits with 130_ fail the rows in the three engines. |
| `reviewer-6` | **Holds.** Each of the 23 rows has a witness ([map](checks/recheck/witnesses.txt)). The browser row's witness removes the engine's environment, and it fails 7 rows. The `--workdir` row is gone with the option. |
| `reviewer-7` | **Holds as written, read and not run.** A leg that exits with 2 uploads `refused.txt`, and `summary` says that it refused the file. It says _run it again_ only when fewer legs reported than `plan` planned. A browser that doesn't start also takes this path: `recheck-1`. |

## Mutations

**The implementer's 22, in the three engines,** every outcome _as expected_, and each one fails the same rows as in run 4, in each engine. That makes 66 readings: 20 mutations from the first run ([summary](checks/recheck/implementer-long-tmpdir.md)), and the two that it voided, run again with a short `TMPDIR` ([summary](checks/recheck/implementer-2.md), [report](checks/recheck/implementer-2.json)). The [file](probes/recheck/mutator-3.mutations.ts.txt) is the implementer's, with its engines widened to three.

**The recheck's 6** ([summary](checks/recheck/recheck-2.md), [report](checks/recheck/recheck-2.json)):

| Mutation | Expected | Chromium | Firefox | WebKit |
| --- | --- | --: | --: | --: |
| The mutations are applied in the invoking checkout | fails | 15 | 15 | 15 |
| Vitest doesn't get the signal | fails | 1 | 1 | 1 |
| A signal exits with 130 | fails | 2 | 2 | 2 |
| The file's commit is the code's commit | survives | 0 | 0 | 0 |
| The summary gives no reason for a row that didn't run | survives | 0 | 0 | 0 |
| A row that the mutation skips has a verdict (doubted) | survives | 0 | 0 | 0 |

No mutation differs between engines.

## Findings

### recheck-1 — B — A browser that doesn't start reads as a test file without rows: unmutated, the tool refuses the file, and with a mutation, it gives no reason

- **Current behavior:** `runVitest` reads Vitest's JSON report and ignores its exit code when a report exists (`vitest.ts`). When Playwright can't start the browser, Vitest exits with 1 and prints the reason on its standard error. Its JSON lists the test file with status `passed`, no `message` and no rows, and `success: true`.
  - **Unmutated:** the file has no row in that engine. `checkSelectors` then refuses it with _covers no row that ran_, and the run exits with 2.
  - **With a mutation:** each row is _void_, with the reason _Vitest reported no row of its file_. Vitest's message is lost.
- **Evidence:**
  - P2, U: a `TMPDIR` of 103 characters, where Chromium refuses its socket path. The run exits with 2 and reads _label, chromium: … should hold its text covers no row that ran_.
  - P2, U': Vitest alone in that `TMPDIR` exits with 1, with `FATAL … Socket path too long`. Its JSON has the file `passed` with 0 rows.
  - P2, M: the browser starts unmutated, and a mutation of the fixture's config to `executablePath: '/nonexistent/chrome'` stops it. The outcome is _void_ with _Vitest reported no row of its file_, and the summary shows only that.
  - The first tool runs: the row _should run in a browser project_ fails in each engine because its inner run is refused in this way, so there is no report (`TypeError: Cannot read properties of undefined (reading 'legs')`).
- **Why it matters:** `RD-66` property 3 says that the report and the summary give "the reason that Vitest reported for its file, such as a load error or a browser that didn't start". In a CI leg, the unmutated case exits with 2. The leg writes `refused.txt`, and the summary says _"running it again refuses it again"_ about a file that is valid in its engine, when a browser that didn't start on a runner may start on the next run. `RD-65` property 5 makes a file invalid for a selector that covers no row, which is a statement about the file. Here the engine didn't run.
- **Required property:** a Vitest run that exits non-zero without a failed row isn't read as a run with no rows. The report and the summary give Vitest's output as the reason, and a run whose engine didn't start isn't reported as the file's refusal.
- **Routing:** the implementer. If the exit code of such a run needs a ruling, the architect: `RD-65` gives 2 to a refusal and 3 to any other failure.

### recheck-2 — B — A local run's summary names a commit for a file that differs from it

- **Current behavior:** `cli.ts` takes `fileCommit` from `git rev-parse HEAD` in the file's directory. A local run reads the file from the working tree (`RD-65` property 8). The summary's first line says _"the file and the runner at <HEAD>"_ whether the file, or the tool's own source, is modified or not committed.
- **Evidence:** P1, case 2: the file in `.mutator/` is modified and not committed (`git status`: ` M mutations.ts`). The report holds the modified mutation's name. Its `fileCommit` and the summary name `.mutator`'s `HEAD`, whose file has the other name. The recheck's own [summary](checks/recheck/recheck-2.md) is another case: it says _"the file and the runner at 0cc0d9516…"_, and `recheck.mutations.ts` wasn't committed when it ran. The runner of a local run is the invoking checkout's `packages/mutator/src/cli.ts`, not the file's checkout, so _"the runner at"_ names a commit of another checkout when the two differ.
- **Why it matters:** a review saves the summary as its evidence (`RD-65` property 9), and a reviewer's own mutation file is often not committed when it runs. A reader who takes the file from the named commit doesn't get the file that ran. In CI both checkouts are clean, so a dispatched run is not affected.
- **Required property:** the summary names a commit as the file's or the runner's only when it holds the content that ran, or it says that the content differs.
- **Routing:** the implementer. `RD-66` property 1 states only the dispatched form, so the architect, if the local form needs a ruling.

### recheck-3 — C — No row reads the summary's file commit, the reasons that the summary prints, or a row that the mutation skips

- **Current behavior:** each row's mutation file is in the row's temporary directory, outside any repository, so `fileCommit` is never set in a row. The rows read the JSON report and never the summary. No row has a mutation that skips a row that passed unmutated.
- **Evidence:** the recheck's mutations _the file's commit is the code's commit_, _the summary gives no reason for a row that didn't run_ and _a row that the mutation skips has a verdict_ each fail no row, in the three engines.
- **Why it matters:** `RD-66` property 3 asks the summary to say why a row has no verdict, and the rows hold only the report's `unrun`. `RD-66` names property 4's dispatch as property 1's witness. That dispatch shows the two commits, but its file runs no row that fails to load, so it doesn't show the summary's reasons. A skipped row's _the row was skipped_ has no row.
- **Required property:** a row reads the summary's two commits and its reason for a row without a verdict, and a row reads a row that the mutation skips. Each has a witness.
- **Routing:** the implementer.

### recheck-4 — C, pre-existing — An unknown option exits with 1, which means a completed run

- **Current behavior:** `parseArgs` runs outside `main`'s `try` (`cli.ts`), so an unknown option throws, uncaught, and Node exits with 1. The CLI's header gives 1 to "an outcome other than as expected", 2 to a refusal and 3 to any other failure.
- **Evidence:** `node packages/mutator/src/cli.ts run … --workdir .` prints `ERR_PARSE_ARGS_UNKNOWN_OPTION` and exits with 1. The code was the same at `9a65f1a89`.
- **Why it matters:** a leg accepts exit 1 as a completed run. A leg whose command line is wrong uploads no report, and `summary` tells the reviewer to run it again. No leg passes an unknown option today, and the next edit of the step is when it could.
- **Required property:** a usage error exits with the code that the header gives to a failure outside the tests.
- **Routing:** the implementer.

## Observations

Not findings.

1. **A browser that fails to start leaves Playwright's directories in `TMPDIR`:** two `playwright_chromiumdev_profile-*` and two `playwright-artifacts-*` after P2, M. A normal browser run leaves nothing (P2, U'). They are Playwright's files, not the tool's, and no row reads a browser that fails to start.
2. **The proof's subject line** now links `RD-65`'s file under the text `` `00-index.md` ``, after `0cc0d9516`'s link rewrite. The link resolves. The proof stays as it was written.

## The dispatches owed after the merge

GitHub dispatches only a workflow on the default branch, so both run `mutations.yml` from `main`:

1. **The acceptance run, `RD-66` property 4:** `ref: 9173a25a1`, `file: .plan/mutations-1/acceptance/rf-142.mutations.ts`, in the three engines. Its outcomes and flags are recorded as information (`RD-65` property 10). Its summary names `9173a25a1` as the code's commit and `main`'s commit as the file's. If a leg's browser doesn't start, `recheck-1` applies to how its summary reads.
2. **The witness of a stale edit:** `ref: main`, `file: .plan/mutations-1/acceptance/stale.mutations.ts`, `shards: 1`. Expected: `plan`'s `check` exits with 2 and names the edit, and `leg` and `summary` are skipped.

## Checks

- `packages/mutator`: 23 rows, `aube exec -- vitest run -c vitest.config.ts`, 23 passed. Format, lint and typecheck were read from CI's `static` job.
- This recheck's files: `recheck.mutations.ts` formatted with `oxfmt`, and `mutator check` reads it clean at the head. The root's lint configs ignore `.plan/`. The shell probes have no formatter. Markdown and the saved outputs: `oxfmt`, the links checked by a script, and `git diff --check`.
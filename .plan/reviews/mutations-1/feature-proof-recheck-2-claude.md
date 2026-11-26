# `repo:RD-65` unit 1, `@ydinjs/mutator` (#301): second recheck, of the recheck's fixes

**Files were read at:** `0c38a4f7b`, the head of #301 (`repo/mutations-1`), in slot `e`. The [recheck](feature-proof-recheck-claude.md) was read at `0cc0d9516`. Since then: `bf08f711d` (the recheck), `0ec97ff3f` (code, rows and witnesses) and `0c38a4f7b` (report, `RD-66`'s dated note, witness run 5, the workflow's header). This record's own files are in `7f32e02b8` and the commit that adds this file. They add only files under `.plan/reviews/mutations-1/`.

**Subject:** the recheck's `recheck-1` to `recheck-4`, against `RD-66` properties 1 and 3 and `RD-65` property 5. Also the implementer's [_After the recheck_](../../mutations-1/mutations-report.md#after-the-recheck) and `RD-66`'s second dated note. Requested by the coordinator.

**Verdict: `recheck-1` to `recheck-4` hold for what they name.** Each of the 30 rows ran and passed. The implementer's 32 witnesses read every outcome _as expected_ in Chromium, Firefox and WebKit, and so do this recheck's 5. **The exit-3 reading of `recheck-1` is within the decisions, and the architect isn't needed for the browser case.** But the condition that the fix gives exit 3 is wider than an engine that didn't run: `recheck2-1`, tier B. There are two more findings, both tier C. All three are the implementer's. **`verify` passed on the head:** run [45883201628](https://github.com/ausginer/material-x/actions/runs/45883201628), and its `chromium` job ran the 30 rows. The two dispatches stay owed after the merge.

## Scope

**Covered:**

- **The diff** `0cc0d9516..0c38a4f7b`, without `bf08f711d`: `packages/mutator/src/`, the rows, the implementer's mutation file, run 5, the report, `RD-66` and the workflow's header.
- **The 30 rows,** run directly with `TMPDIR=/tmp/mxe`: 30 passed in 54 s, and nothing was left in the temporary directory.
- **The implementer's 32 mutations and this recheck's 5** ([file](recheck-2.mutations.ts)), at `--ref 0c38a4f7b`, one engine at a time, each run in its own `TMPDIR` of 30 characters or fewer ([script](probes/recheck-2/engines.sh), [log](checks/recheck-2/engines.txt)).
- **Probes:** P3 is the cases besides a browser where the fix's exit 3 applies, and a config modified after its commit ([script](probes/recheck-2/p3-exit-3.sh), [transcript](checks/recheck-2/p3-exit-3.txt)). P4 is `RD-66` property 1 in CI's shape, with the tool run from the runner's checkout as a leg runs it ([script](probes/recheck-2/p4-ci-shape.sh), [transcript](checks/recheck-2/p4-ci-shape.txt)). Both ran on repositories made from the fixture.
- **CI:** `verify` run [45883201628](https://github.com/ausginer/material-x/actions/runs/45883201628) on `0c38a4f7b`, success, every job green. Its `chromium` job ran `node/mutator`'s 30 rows, and 30 passed (job 140127608643).

**Not covered:** the workflow on GitHub's runners, which can't be dispatched before the merge. Safari. A screen of the step summary.

**The engines,** as in the recheck: the rows are node rows, and an engine only sets `MX_TEST_ENGINES`, which no row reads. So the three engines are three runs of the same rows. After each tool run, `git worktree list` and the checkout's status read as before. The temporary directory held no `mutator-*` entry, only `fslock` and `node-compile-cache`, which the setup's tools write. The file and the runner were committed at `7f32e02b8` before the runs, so each summary names that commit for them, and `0c38a4f7b` for the code.

## The recheck's findings

| Finding | Reading |
| --- | --- |
| `recheck-1` | **Holds for a browser that doesn't start.** `runVitest` keeps a `failure` when Vitest exits non-zero with no failed row and no test file's message. Under a mutation, each row that didn't run reads _void_ with Vitest's output: the row _should read a selected row whose browser doesn't start as void, with Vitest's output_ holds _"Vitest exited with 1 and reported no failed row:"_ and _"Failed to launch chromium"_, in the report and in the summary. Unmutated, `run` throws before `checkSelectors`, and the CLI exits with 3 (row _should exit with 3, not refuse the file, …_). In a leg, exit 3 writes no `refused.txt` and no report, so `summary` says _run it again_ (the workflow, read and not run). **The condition is wider than the engine:** `recheck2-1`. |
| `recheck-2` | **Holds.** `fileCommit` is set only when the file, the config and `import.meta.dirname` have one top, and `git status --porcelain --ignored` shows none of them. P4, case 1, the leg's form: the root at `A` and the tool run from `.mutator/packages/mutator/src/cli.ts`. The summary names `A` for the code and `.mutator`'s head for the file and the runner. Case 2, the file modified: _"no commit that holds them as they ran"_. Case 3, the tool from the slot's checkout: no commit. P3, case C, the config alone modified: no commit. The config and `--ignored` parts have no row: `recheck2-3`. |
| `recheck-3` | **Holds.** Three rows read the summary's commits: both named, a modified file, and a runner from another checkout. Three rows read the summary's line and first reason for a row without a verdict: a test file that doesn't load, a skipped row and a browser that doesn't start. The row _should read a survivor whose row the mutation skips as void_ reads _the row was skipped_. The recheck's three mutations are among the implementer's witnesses, now predicted to fail: they fail 3, 3 and 1 rows in each engine. |
| `recheck-4` | **Holds.** `parseArgs` runs inside `main`, so its throw reaches the handler, and the row _should exit with 3 on an unknown option_ reads exit 3 and _"Unknown option '--workdir'"_. The implementer's witness _options are read outside the failure handling_ fails it, and so does this recheck's _an unknown option is accepted_ (`strict: false`). |

### The exit-3 reading of `recheck-1`

**Within the decisions, and no ruling is needed for a browser that doesn't start.**

- **`RD-66` property 3** is about a mutated run: _"a row that ran unmutated and doesn't run with the mutation"_. It doesn't govern the unmutated run.
- **`RD-65` property 5** governs the unmutated run: _"a selector that covers no row of the unmutated run makes the file invalid"_. Its subject is the file's selectors against the rows that ran. When the engine didn't start, no row ran, and nothing in the file is shown wrong.
- **The exit codes are the CLI's,** not a decision's. The plan's rule for a leg, _"a leg that failed for a reason outside the tests: run it again"_ (`RD-62` after this unit), fits an engine that didn't start. The CLI already gave 2 to a refusal and 3 to any other failure.

**Where the architect could be needed:** `recheck2-1`. A run whose test filter matches no file is the file's own error, which property 5 makes invalid. The fix now reads it as a failure outside the tests. If the implementer can't tell an engine that didn't run from a run that the file gives no test file, the classification of an unmutated Vitest run that exits non-zero without a failed row is the architect's. P3 shows that the three cases leave different JSON reports.

## Mutations

**The implementer's 32,** in the three engines ([Chromium](checks/recheck-2/implementer-chromium.md), [Firefox](checks/recheck-2/implementer-firefox.md), [WebKit](checks/recheck-2/implementer-webkit.md)): 30 rows unmutated, none failed. Every outcome is _as expected_, each run exits with 0, and no mutation differs between engines. Each mutation fails the same rows in each engine as in the implementer's [run 5](../../mutations-1/checks/mutator-chromium-5.json). That makes 96 readings. The report's _"ten new witnesses fail their rows"_ holds: the file's commit as the code's fails 3, the summary without the reason fails 3, and a skipped row with a verdict fails 1.

**The recheck's 5** ([Chromium](checks/recheck-2/recheck-chromium.md), [Firefox](checks/recheck-2/recheck-firefox.md), [WebKit](checks/recheck-2/recheck-webkit.md)):

| Mutation | Expected | Chromium | Firefox | WebKit |
| --- | --- | --: | --: | --: |
| A run that fails a row is a failure outside the tests | fails | 6 | 6 | 6 |
| The failure is read from Vitest's standard output | fails | 2 | 2 | 2 |
| An unknown option is accepted | fails | 1 | 1 | 1 |
| The config isn't compared with the file's commit (doubted) | survives | 0 | 0 | 0 |
| An ignored file names a commit (doubted) | survives | 0 | 0 | 0 |

Every outcome is _as expected_, the same rows fail in each engine, and no mutation differs between engines. The first mutation fails the selected row and five more rows that run the engine `b` or `c`, where a row fails unmutated. The two survivors are `recheck2-3`.

## Findings

### recheck2-1 — B — The fix's exit 3 applies to any Vitest run that exits non-zero without a failed row, and its reason is the line that names Vitest's report

- **Current behavior:** `runVitest` sets `failure` when Vitest's exit code is non-zero, no row failed and no test file has a message (`vitest.ts`). An unmutated run with a `failure` throws, and the CLI exits with 3 (`run.ts`). The reason is the first lines of Vitest's standard error, or of its standard output when its standard error is empty.
  - **A run whose test filter matches no test file.** Vitest exits with 1, writes a report with no test file, and prints nothing on its standard error. At `0cc0d9516` the tool refused the file with 2, naming the selector that covered no row. Now it exits with 3.
  - **An unhandled error in a row that passes.** Vitest exits with 1, and its report lists every row as passed with `success: true`. It prints nothing on its standard error. At `0cc0d9516` the run was judged, and every outcome was _as expected_. Now it exits with 3.
  - **The reason in both cases** is _"Vitest exited with 1 and reported no failed row:"_ followed by _"JSON report written to …/mutator-report-…/report.json"_. That is the JSON reporter's line on standard output, and it names a directory that the tool removes. It says nothing about the cause.
- **Evidence:** P3, cases N and H, each run with the tool at the head and at `0cc0d9516`, and Vitest alone in case N. The browser case is unchanged: its standard error carries _"Failed to launch chromium"_, which the rows read.
- **Why it matters:** in a leg, exit 3 makes `summary` say _"A leg ended with failure, outside the tests: run it again."_ For case N, running it again fails again, and `RD-65` property 5 makes the file invalid. The leg used to refuse it. That is `recheck-1`'s harm reversed: there, a valid file was refused, and here an invalid file reads as a failure outside the tests. In both cases the reviewer's log gives no cause. A typo in a reviewer's `tests` filter is enough to reach case N.
- **Required property:** an unmutated run is read as a failure outside the tests only when the engine didn't run its test files. A run in which the file selects no test file stays the file's refusal, as `RD-65` property 5 says. Whatever the class, the reason that the tool reports gives Vitest's cause, or says that Vitest gave none. It doesn't give only the line that names the tool's own temporary report. Whether case H is judged or fails outside the tests isn't settled by a decision.
- **Routing:** the implementer. The architect only if the cases can't be told apart (above).

### recheck2-2 — C — `RD-66`'s second dated note continues the last bullet of the first

- **Current behavior:** `0c38a4f7b` appends _"**Dated 2026-11-26 by the implementer: the recheck's four findings are fixed …**"_ to the line _"- **Owed after the merge:** property 4's dispatch."_ The note's two bullets follow it after a blank line.
- **Evidence:** `git show 0c38a4f7b -- .plan/decisions/RD-66.md`. Rendered, the second note is part of the first note's list item _Owed after the merge_, and its two bullets join the first note's list as items four to seven of one list.
- **Why it matters:** a reader of the decision sees one dated note, not two. The second note's date and subject read as part of what is owed after the merge.
- **Required property:** each dated note is a paragraph of its own, as the first one is.
- **Routing:** the implementer, who wrote the note.

### recheck2-3 — C — No row reads a modified config or an ignored file in the file's commit

- **Current behavior:** `commitHolding` checks the file, the config and the tool's source, with `--ignored`. The rows modify only the file, or take the runner from another checkout.
- **Evidence:** this recheck's mutations _the config isn't compared with the file's commit_ and _an ignored file names a commit_ survive in the three engines, as predicted. P3, case C, shows that the code reads a modified config: _"no commit that holds them as they ran"_.
- **Why it matters:** `recheck-2`'s required property covers the config, which the fix's note and the CLI's header name. A change that drops it would pass the rows.
- **Required property:** a row reads the summary's commit for a config that differs from its commit, with a witness. A row for an ignored file is optional, because a reviewer's file is rarely ignored.
- **Routing:** the implementer.

## Observations

Not findings.

1. **The implementer's run 5** names `0ec97ff3f` for the code, the file and the runner, which held them as they ran. Its summary is the first one of the tool's own runs to name the file's commit truthfully under the new rule.

## The dispatches owed after the merge

Unchanged from the recheck: the acceptance run of `RD-66` property 4, and the stale-edit witness. A leg whose browser doesn't start now fails with 3, and the summary says _run it again_.

## Checks

- `packages/mutator`: 30 rows, `vitest run -c vitest.config.ts` with `TMPDIR=/tmp/mxe`, 30 passed. Format, lint and typecheck were read from CI's `static` job.
- This recheck's files: `recheck-2.mutations.ts` formatted with `oxfmt`, and `mutator check` reads it clean at `0c38a4f7b`, as it does the implementer's file. The root's lint configs ignore `.plan/`. The shell probes have no formatter. Markdown and the saved outputs: `oxfmt`, the links checked by a script, and `git diff --check`.
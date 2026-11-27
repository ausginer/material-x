# `repo:RD-65` unit 1, `@ydinjs/mutator` (#301): third recheck, of case H, the owner's (a) and the color fix

**Files were read at:** `345037725`, the head of #301 (`repo/mutations-1`), in slot `h`. The [second recheck](feature-proof-recheck-2-claude.md) was committed at `c921af6c7`. Since then: `bd14b5e04` and `0d6041dbd` (`RD-66`'s notes), `97923379f` (case H), `e373f8eb8` (the owner's (a)), `acc9083ac` (Vitest's errors without colors), the merges of `main` `6a9ff612d` and `9cd303406`, and `345037725` (the record). This record adds only files under `.plan/reviews/mutations-1/`, on a branch of its own.

**Subject:** `RD-66`'s two notes of 2026-11-27, case H and the owner's (a), and `RD-65` property 5 as that answer amends it. Also the color fix, the implementer's [_After RD-66's rulings of 2026-11-27_](../../mutations-1/mutations-report.md#after-rd-66s-rulings-of-2026-11-27), the status sentences of `RD-65` and `RD-66` under `RD-68`, and #301's description. Requested by the coordinator.

**Verdict: the three changes meet `RD-66`'s case H, the owner's (a) and `RD-65` property 5 as amended. No findings.** The 37 rows pass, with and without `FORCE_COLOR=1`. Each new mechanism has a row that fails when the mechanism is removed. The implementer's six new witnesses read every outcome _as expected_ in Chromium, Firefox and WebKit, and so do this recheck's nine mutations. The status sentences are right, and #301's description matches the branch. **`verify` passed on the head:** run [46056134318](https://github.com/ausginer/material-x/actions/runs/46056134318), every job green. The two dispatches stay owed after the merge.

## Scope

**Covered:**

- **The diff** `c921af6c7..345037725` under `packages/mutator/src/`, the rows, the implementer's mutation file and run 7, the report, `RD-65` and `RD-66`. The merges bring `main`'s changes, which this unit doesn't touch.
- **The 37 rows,** run directly in the package: 37 passed in 55 s, and 37 passed again with `FORCE_COLOR=1`.
- **This recheck's nine mutations** ([file](recheck-3.mutations.ts)), and **the implementer's six new witnesses** of the three changes, selected with `--only` from [its file](../../mutations-1/mutator.mutations.ts). Each ran at `--ref 345037725`, one engine at a time, with nothing else running. The summaries and reports are in [`checks/recheck-3/`](checks/recheck-3/). After each run, `git worktree list` showed no copy, and the temporary directory held no `mutator-*` entry.
- **CI:** `verify` run [46056134318](https://github.com/ausginer/material-x/actions/runs/46056134318) on `345037725`, success. Its `chromium` job (140699171991) ran `node/mutator`'s 37 rows, and 37 passed. Also read: run [46050447313](https://github.com/ausginer/material-x/actions/runs/46050447313) on `acc9083ac`. Its `chromium` job ran the 37 rows, and they passed. Its only failure was `tests/button/button.visual.browser.test.ts`, _should match the keyboard-focused button_, _"1 pixels (ratio 0.01) differ"_. This branch doesn't touch that file. That confirms the implementer's claim.

**Not covered:** the workflow on GitHub's runners, which can't be dispatched before the merge. The other 36 of the implementer's witnesses, which run 7 records in Chromium and which these changes don't touch beyond three new edit texts.

**The engines.** The affected file is `packages/mutator/tests/mutator.node.test.ts`, a node project. CI's `firefox` and `webkit` jobs select `--project '*/firefox'` and `'*/webkit'`, so they don't run it, and no Firefox or WebKit pass of it exists to read. The `chromium` job's pass is the unmutated pass. As in the earlier rechecks, an engine only sets `MX_TEST_ENGINES`, which no row reads, so the three local engines are three runs of the same rows. The rows' browser fixture launches Chromium in every engine.

**The summaries of this recheck's file** say _"the file and the runner at no commit that holds them as they ran"_, because the file was run uncommitted. That is `RD-66` property 1 as `recheck-2` fixed it. The implementer's file ran from the checkout of `345037725`, and its summaries name that commit for the code, the file and the runner.

## The changes against the decisions

| Change | Reading |
| --- | --- |
| **Case H** (`97923379f`) | **Meets `RD-66`'s note.** `runVitest` adds the `dot` reporter beside JSON and reads the section under its _Unhandled Errors_ banner as `runError`. A run with a non-zero exit, no failed row and no test file's message reads `failure`, which gives exit 3 unmutated, only when a listed test file has no row and no message. Otherwise it is judged, and its `runError` is the banner's section, or Vitest's standard error. The report keeps `runError` on each leg and on each mutated result, and the summary names the unmutated run's error by engine, and by shard when there are several. Row: _should judge a run whose rows pass beside an unhandled error, and report the error_, with exit 0, _as expected_, the error on the leg and on the mutation, and the summary's line. The browser row keeps exit 3 and reads no _"JSON report written"_ line. |
| **The owner's (a)** (`e373f8eb8`) | **Meets the rule and `RD-65` property 5 as amended.** `runAll` collects each run whose report lists no test file. After every engine's unmutated run, and before `checkSelectors` and any mutation, `run` throws a `Refusal`, so the exit is 2 and there is no report. Each line names the engine, the run's tests and its directory: _"a: the run of tests/nothing in . selects no test file"_. A mutated run's unselected list is never read, so a mutated run is never refused. Rows: the renamed _should refuse a file whose run selects no test file_, a file with only _survives_ (2, no report, one build only, the mutation's name absent), and a file with two runs, which names only the run without a test file. |
| **Colors** (`acc9083ac`) | **Holds.** The standard error is read through `stripVTControlCharacters`, so the banner matches and the error lines compare equal under CI's `FORCE_COLOR`. Row: the case H run with `FORCE_COLOR=1`. Probe 2 below found no control character in the failure messages or the summary under `FORCE_COLOR`. Those come from the JSON report, which the fix doesn't touch. |

`runVitest`'s comment now says that a run with no test file has neither a failure nor an error. The report's _Open_ no longer carries the question of (a). The witness _a run that selects no test file is a failure outside the tests_ is predicted again against (a)'s three rows, as the note asks.

## Mutations

**This recheck's nine,** in Chromium, Firefox and WebKit, with the same rows in each:

| Mutation | What it removes | Each engine |
| --- | --- | --- |
| _a mutated run's error isn't kept_ | the `runError` on a mutated result | _as expected_, the case H row |
| _the unmutated run's error isn't kept_ | the `runError` on a leg | _as expected_, the case H row and the `FORCE_COLOR` row |
| _the reporter's banner isn't found_ | the banner's section; only the standard error is left | _as expected_, the case H row. Unmutated, the error comes from the standard error. The mutated run fails a row, so only the banner gives its error. |
| _the JSON report is named for every reporter_ | `--outputFile.json=` becomes `--outputFile=` | _as expected_, survives: the `dot` reporter writes no file |
| _a run that selects no test file isn't excused from the unexplained exit_ | the term `files === 0` | _as expected_, survives. See below. |
| _the refusal doesn't name the engine_ | the engine in the refusal's line | _as expected_, (a)'s three rows |
| _a run is refused only when every run before it selects no test file_ | (a) becomes (b) for a run after a listed one | _as expected_, the two-run row |
| _probe: case H in the browser project_ | puts the unhandled row in the browser fixture's test file, and the case H row in `browserFile([LABEL])` | _as expected_. The case H row passes in the browser project: exit 0, _as expected_, and _"Error: left unhandled"_ on the leg, on the mutation and in the summary. The `FORCE_COLOR` row fails, as predicted, because its node file no longer has the unhandled row. |
| _probe: failure messages have no colors with FORCE_COLOR_ | adds to the `FORCE_COLOR` row that the mutation's messages and the summary hold no ESC | _as expected_, survives: none holds one |

**The implementer's six new witnesses,** in Chromium, Firefox and WebKit: _a run that selects no test file is a failure outside the tests_ (3 rows), _Vitest's unhandled errors aren't printed_ (2), _an unhandled error beside rows that ran is a failure outside the tests_ (2), _the summary doesn't name the unmutated run's error_ (1), _a run that selects no test file is not refused_ (3) and _Vitest's colors are kept_ (1). Each is _as expected_, and no mutation differs between engines. The two that fail 2 rows predict only the case H row, and also fail the `FORCE_COLOR` row, which is the same run with colors on. Run 7 records the same counts in Chromium.

**Read from run 7, in Chromium only:** the other 36 witnesses, 3 of them with the code's new text (_Vitest's failure is not kept_, _the failure is read from Vitest's standard output_, _the reporter's banner is kept_). Every outcome _as expected_, at `acc9083ac`. After `acc9083ac`, `345037725` changes nothing under `packages/mutator`, and in the mutation file only its header comment.

### The two survivors

- **`--outputFile.json=`:** with `json` and `dot`, the two forms read the same. Only `json` writes a file. Equivalent here, and no decision asks for either form.
- **`files === 0 ||`:** unmutated, it is equivalent. A run with no test file and exit 1 has no listed file without a row, so `some` gives no `failure`, and the run is refused before its error would be reported. In a mutated run that lists no test file, the term decides whether Vitest's _"No test files found"_ is kept as the run's `runError`. The run's rows read _void_ either way. No decision asks for that error, so this is not a finding.

## Records and the pull request

- **`RD-66`'s status:** _"**Implemented** by #301, except property 4's dispatch, which runs after the merge."_ Right under `RD-68` properties 2 and 3: it names the pull request, says which part is left, and names no merge commit. _"Which runs after the merge"_ names the owed work, not a merge's state.
- **`RD-65`'s status:** _"**Implemented** in part by #301: unit 1, the package, its tests, the config, the workflow and the acceptance run in Chromium. Property 10's dispatches, after the merge, and unit 2's documentation are not."_ Right: it names what is implemented and what remains. The dated note that amends property 5 records `RD-66`'s supersession. The change is `RD-66`'s, and `RD-66`'s status covers it.
- **`RD-66`'s implementer note of 2026-11-27** names the three commits, case H, (a), the rows, and run 7 with 37 rows and 42 mutations. It matches the tree and [run 7](../../mutations-1/checks/mutator-chromium-7.md).
- **#301's description,** read at head `345037725`: it has no session link and no bare `@name`. Its second bullet under _The package_ gives (a)'s refusal before the selector refusal, with exit 2 and no report. Its fourth gives exit 3 for a listed test file that didn't run, and case H judged with the error reported. Its evidence gives 37 rows and 42 witnesses at `acc9083ac` (run 7). It is `Refs #300`, with the two dispatches owed. Each matches the branch.

## Findings

None.
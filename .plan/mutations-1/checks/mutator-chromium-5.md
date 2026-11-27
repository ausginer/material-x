# Mutations: .plan/mutations-1/mutator.mutations.ts

The code at 0ec97ff3f6c25e005a69bc286def1dcd2d63a05d, the file and the runner at 0ec97ff3f6c25e005a69bc286def1dcd2d63a05d, in chromium.

- chromium, unmutated: 30 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| a stale edit runs | mechanism | as expected (1) |  |
| a selector that covers no row runs | mechanism | as expected (1) |  |
| the copy stays after a run | mechanism | as expected (5) |  |
| a mutation is not restored | mechanism | as expected (1) |  |
| a stale copy is kept | mechanism | as expected (1) |  |
| a void row is judged | mechanism | as expected (4) |  |
| a survivor is never caught | mechanism | as expected (1) |  |
| engines never differ | mechanism | as expected (2) |  |
| an engine's own expectation doesn't account for a difference | mechanism | as expected (1) |  |
| a row that one engine skips counts | mechanism | as expected (2) |  |
| nothing rebuilds | mechanism | as expected (2) |  |
| every edit rebuilds | mechanism | as expected (1) |  |
| a row that doesn't run counts as passing | mechanism | as expected (5) |  |
| a row that doesn't run counts as failed | mechanism | as expected (5) |  |
| one engine's own expectation accounts for every engine's difference | mechanism | as expected (1) |  |
| an engine's environment doesn't reach Vitest | mechanism | as expected (9) |  |
| a signal stops nothing | mechanism | as expected (2) |  |
| a stopped command is not waited for | mechanism | as expected (1) |  |
| a row that doesn't run in one engine is compared | mechanism | as expected (1) |  |
| a selected row that passes is never missed | mechanism | as expected (1) |  |
| nothing is read as expected | mechanism | as expected (11) |  |
| a survivor is always caught | mechanism | as expected (5) |  |
| an engine that fails unmutated runs on | mechanism | as expected (1) |  |
| an engine that fails unmutated refuses the file | mechanism | as expected (1) |  |
| Vitest's failure is not kept | mechanism | as expected (2) |  |
| Vitest's failure is not a row's reason | mechanism | as expected (1) |  |
| the file's commit is the code's commit | mechanism | as expected (3) |  |
| a modified file names its checkout's commit | mechanism | as expected (1) |  |
| the runner's checkout is not compared with the file's | mechanism | as expected (1) |  |
| the summary gives no reason for a row that didn't run | mechanism | as expected (3) |  |
| a row that the mutation skips has a verdict | mechanism | as expected (1) |  |
| options are read outside the failure handling | mechanism | as expected (1) |  |

Groups: mechanism 32, engine 0, doubted 0, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### a stale edit runs, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should refuse each stale edit by name
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse each stale edit by name before anything runs

### a selector that covers no row runs, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should refuse a selector that covers no row
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a selector that covers no row before any mutation runs

### the copy stays after a run, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should leave the checkout and the temporary directory as they were after a run; packages/mutator/tests/mutator.node.test.ts > should leave them as they were after a run that fails midway
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave them as they were after a run that fails midway
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should wait for a command that a signal stops before it removes the copy
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs

### a mutation is not restored, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs

### a stale copy is kept, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs

### a void row is judged, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void; packages/mutator/tests/mutator.node.test.ts > should read a selected row that doesn't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### a survivor is never caught, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a survivor that fails rows as caught
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails rows as caught

### engines never differ, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain

### an engine's own expectation doesn't account for a difference, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one

### a row that one engine skips counts, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### nothing rebuilds, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should rebuild after a matching edit and after its restore
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave them as they were after a run that fails midway
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### every edit rebuilds, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not rebuild for an edit that doesn't match
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should not rebuild for an edit that doesn't match

### a row that doesn't run counts as passing, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should read a selected row that doesn't run as void; packages/mutator/tests/mutator.node.test.ts > should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose row the mutation skips as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### a row that doesn't run counts as failed, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should read a selected row that doesn't run as void; packages/mutator/tests/mutator.node.test.ts > should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose row the mutation skips as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### one engine's own expectation accounts for every engine's difference, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain

### an engine's environment doesn't reach Vitest, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine; packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips; packages/mutator/tests/mutator.node.test.ts > should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, failures outside the tests should exit with 3, not refuse the file, when the unmutated run's browser doesn't start
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### a signal stops nothing, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should wait for a command that a signal stops before it removes the copy; packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should wait for a command that a signal stops before it removes the copy

### a stopped command is not waited for, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should wait for a command that a signal stops before it removes the copy
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should wait for a command that a signal stops before it removes the copy

### a row that doesn't run in one engine is compared, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### a selected row that passes is never missed, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a selected row that passes as missed
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that passes as missed and fail the run

### nothing is read as expected, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should leave the checkout and the temporary directory as they were after a run; packages/mutator/tests/mutator.node.test.ts > should remove a locked copy whose process no longer runs; packages/mutator/tests/mutator.node.test.ts > should read a mutation that fails every selected row as expected; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs; packages/mutator/tests/mutator.node.test.ts > should rebuild after a matching edit and after its restore
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name the commit that holds the file, the config and the runner, apart from the code
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name no commit for a file that differs from its commit
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name no commit for a runner from another checkout than the file's

### a survivor is always caught, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a survivor that fails no row as expected; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should read a survivor whose rows don't run as void; packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails no row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose row the mutation skips as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs

### an engine that fails unmutated runs on, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should exit with 3, not refuse the file, when the unmutated run's browser doesn't start
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, failures outside the tests should exit with 3, not refuse the file, when the unmutated run's browser doesn't start

### an engine that fails unmutated refuses the file, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should exit with 3, not refuse the file, when the unmutated run's browser doesn't start
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, failures outside the tests should exit with 3, not refuse the file, when the unmutated run's browser doesn't start

### Vitest's failure is not kept, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should exit with 3, not refuse the file, when the unmutated run's browser doesn't start; packages/mutator/tests/mutator.node.test.ts > should read a selected row whose browser doesn't start as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, failures outside the tests should exit with 3, not refuse the file, when the unmutated run's browser doesn't start
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output

### Vitest's failure is not a row's reason, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a selected row whose browser doesn't start as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output

### the file's commit is the code's commit, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should name the commit that holds the file, the config and the runner; packages/mutator/tests/mutator.node.test.ts > should name no commit for a file that differs from its commit; packages/mutator/tests/mutator.node.test.ts > should name no commit for a runner from another checkout than the file's
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name the commit that holds the file, the config and the runner, apart from the code
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name no commit for a file that differs from its commit
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name no commit for a runner from another checkout than the file's

### a modified file names its checkout's commit, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should name no commit for a file that differs from its commit
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name no commit for a file that differs from its commit

### the runner's checkout is not compared with the file's, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should name no commit for a runner from another checkout than the file's
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the summary should name no commit for a runner from another checkout than the file's

### the summary gives no reason for a row that didn't run, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a selected row that doesn't run as void; packages/mutator/tests/mutator.node.test.ts > should read a survivor whose row the mutation skips as void; packages/mutator/tests/mutator.node.test.ts > should read a selected row whose browser doesn't start as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose row the mutation skips as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output

### a row that the mutation skips has a verdict, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a survivor whose row the mutation skips as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose row the mutation skips as void

### options are read outside the failure handling, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should exit with 3 on an unknown option
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, failures outside the tests should exit with 3 on an unknown option
# Mutations: .plan/reviews/mutations-1/recheck.mutations.ts

The code at 0cc0d9516f0f0968c98ae587f5e7183bf0632643, the file and the runner at 0cc0d9516f0f0968c98ae587f5e7183bf0632643, in chromium, firefox, webkit.

- chromium, unmutated: 23 rows ran, 1 failed, 0 skipped
- firefox, unmutated: 23 rows ran, 1 failed, 0 skipped
- webkit, unmutated: 23 rows ran, 1 failed, 0 skipped

| Mutation | Group | chromium | firefox | webkit | Engines |
| --- | --- | --- | --- | --- | --- |
| the mutations are applied in the invoking checkout | mechanism | as expected (14) | as expected (14) | as expected (14) |  |
| Vitest doesn't get the signal | mechanism | as expected (1) | as expected (1) | as expected (1) |  |
| a signal exits with 130 | mechanism | as expected (2) | as expected (2) | as expected (2) |  |
| the file's commit is the code's commit | mechanism | as expected (0) | as expected (0) | as expected (0) |  |
| the summary gives no reason for a row that didn't run | mechanism | as expected (0) | as expected (0) | as expected (0) |  |
| a row that the mutation skips has a verdict | doubted | as expected (0) | as expected (0) | as expected (0) |  |

Groups: mechanism 5, engine 0, doubted 1, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### the mutations are applied in the invoking checkout, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that passes as missed and fail the run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails rows as caught
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### the mutations are applied in the invoking checkout, firefox: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that passes as missed and fail the run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails rows as caught
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### the mutations are applied in the invoking checkout, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that passes as missed and fail the run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails rows as caught
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### Vitest doesn't get the signal, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone

### Vitest doesn't get the signal, firefox: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone

### Vitest doesn't get the signal, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone

### a signal exits with 130, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should wait for a command that a signal stops before it removes the copy

### a signal exits with 130, firefox: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should wait for a command that a signal stops before it removes the copy

### a signal exits with 130, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should wait for a command that a signal stops before it removes the copy

### the file's commit is the code's commit, chromium: as expected

- expected survives: Each row's mutation file is outside any repository, so no row has a file commit

### the file's commit is the code's commit, firefox: as expected

- expected survives: Each row's mutation file is outside any repository, so no row has a file commit

### the file's commit is the code's commit, webkit: as expected

- expected survives: Each row's mutation file is outside any repository, so no row has a file commit

### the summary gives no reason for a row that didn't run, chromium: as expected

- expected survives: The rows read the JSON report and never the summary

### the summary gives no reason for a row that didn't run, firefox: as expected

- expected survives: The rows read the JSON report and never the summary

### the summary gives no reason for a row that didn't run, webkit: as expected

- expected survives: The rows read the JSON report and never the summary

### a row that the mutation skips has a verdict, chromium: as expected

- expected survives: No row is read with a mutation that skips a row that ran unmutated

### a row that the mutation skips has a verdict, firefox: as expected

- expected survives: No row is read with a mutation that skips a row that ran unmutated

### a row that the mutation skips has a verdict, webkit: as expected

- expected survives: No row is read with a mutation that skips a row that ran unmutated
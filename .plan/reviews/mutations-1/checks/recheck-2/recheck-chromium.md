# Mutations: .plan/reviews/mutations-1/recheck-2.mutations.ts

The code at 0c38a4f7bdb443483149d4a60e1f8c778b04c528, the file and the runner at 7f32e02b85e22a0824f28e4940dfa1c48a4a04a8, in chromium.

- chromium, unmutated: 30 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| a run that fails a row is a failure outside the tests | mechanism | as expected (6) |  |
| the failure is read from Vitest's standard output | mechanism | as expected (2) |  |
| an unknown option is accepted | mechanism | as expected (1) |  |
| the config isn't compared with the file's commit | doubted | as expected (0) |  |
| an ignored file names a commit | doubted | as expected (0) |  |

Groups: mechanism 3, engine 0, doubted 2, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### a run that fails a row is a failure outside the tests, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### the failure is read from Vitest's standard output, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should exit with 3, not refuse the file, when the unmutated run's browser doesn't start; packages/mutator/tests/mutator.node.test.ts > should read a selected row whose browser doesn't start as void, with Vitest's output
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, failures outside the tests should exit with 3, not refuse the file, when the unmutated run's browser doesn't start
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row whose browser doesn't start as void, with Vitest's output

### an unknown option is accepted, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should exit with 3 on an unknown option
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, failures outside the tests should exit with 3 on an unknown option

### the config isn't compared with the file's commit, chromium: as expected

- expected survives: no row modifies the config alone after its commit; probe P3, case C, reads it

### an ignored file names a commit, chromium: as expected

- expected survives: no row runs a file that its checkout ignores
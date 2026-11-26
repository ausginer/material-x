# Mutations: $S/impl/mutator-3.mutations.ts

The code at 0cc0d9516f0f0968c98ae587f5e7183bf0632643, the file and the runner at no commit, in chromium, firefox, webkit.

- chromium, unmutated: 23 rows ran, 0 failed, 0 skipped
- firefox, unmutated: 23 rows ran, 0 failed, 0 skipped
- webkit, unmutated: 23 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | firefox | webkit | Engines |
| --- | --- | --- | --- | --- | --- |
| an engine's environment doesn't reach Vitest | mechanism | as expected (7) | as expected (7) | as expected (7) |  |
| nothing is read as expected | mechanism | as expected (8) | as expected (8) | as expected (8) |  |

Groups: mechanism 2, engine 0, doubted 0, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### an engine's environment doesn't reach Vitest, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine; packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips; packages/mutator/tests/mutator.node.test.ts > should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### an engine's environment doesn't reach Vitest, firefox: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine; packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips; packages/mutator/tests/mutator.node.test.ts > should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### an engine's environment doesn't reach Vitest, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine; packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips; packages/mutator/tests/mutator.node.test.ts > should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

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

### nothing is read as expected, firefox: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should leave the checkout and the temporary directory as they were after a run; packages/mutator/tests/mutator.node.test.ts > should remove a locked copy whose process no longer runs; packages/mutator/tests/mutator.node.test.ts > should read a mutation that fails every selected row as expected; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs; packages/mutator/tests/mutator.node.test.ts > should rebuild after a matching edit and after its restore
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### nothing is read as expected, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should leave the checkout and the temporary directory as they were after a run; packages/mutator/tests/mutator.node.test.ts > should remove a locked copy whose process no longer runs; packages/mutator/tests/mutator.node.test.ts > should read a mutation that fails every selected row as expected; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs; packages/mutator/tests/mutator.node.test.ts > should rebuild after a matching edit and after its restore
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore
# Mutations: .plan/reviews/mutations-1/reviewer.mutations.ts

At 9a65f1a89e278ab4e972d953b001aba49e9406a2, in chromium.

- chromium, unmutated: 18 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| a selected row that passes is never missed | mechanism | as expected (1) |  |
| nothing is read as expected | mechanism | as expected (8) |  |
| a survivor is always caught | mechanism | as expected (3) |  |
| --workdir is ignored | mechanism | as expected (0) |  |

Groups: mechanism 4, engine 0, doubted 0, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### a selected row that passes is never missed, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a selected row that passes as missed
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that passes as missed and fail the run

### nothing is read as expected, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, an existing checkout should run in the checkout that --workdir names and make no worktree
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a mutation that fails every selected row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### a survivor is always caught, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a survivor that fails no row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails no row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs

### --workdir is ignored, chromium: as expected

- expected survives: The row reads the outcome, the invoking checkout and the temporary directory's listing, and a copy in place of the workdir leaves the same three

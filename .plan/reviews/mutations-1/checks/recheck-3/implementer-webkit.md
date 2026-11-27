# Mutations: .plan/mutations-1/mutator.mutations.ts

The code at 3450377252aa1e4608e281ac12cd1af333a52c45, the file and the runner at 3450377252aa1e4608e281ac12cd1af333a52c45, in webkit.

- webkit, unmutated: 37 rows ran, 0 failed, 0 skipped

| Mutation | Group | webkit | Engines |
| --- | --- | --- | --- |
| a run that selects no test file is a failure outside the tests | mechanism | as expected (3) |  |
| Vitest's unhandled errors aren't printed | mechanism | as expected (2) |  |
| an unhandled error beside rows that ran is a failure outside the tests | mechanism | as expected (2) |  |
| the summary doesn't name the unmutated run's error | mechanism | as expected (1) |  |
| a run that selects no test file is not refused | mechanism | as expected (3) |  |
| Vitest's colors are kept | mechanism | as expected (1) |  |

Groups: mechanism 6, engine 0, doubted 0, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### a run that selects no test file is a failure outside the tests, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should refuse a file whose run selects no test file; packages/mutator/tests/mutator.node.test.ts > should refuse a file with only survivors whose run selects no test file, before any mutation; packages/mutator/tests/mutator.node.test.ts > should name only the run that selects no test file, of two runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a file whose run selects no test file
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a file with only survivors whose run selects no test file, before any mutation
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should name only the run that selects no test file, of two runs

### Vitest's unhandled errors aren't printed, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read Vitest's error without colors when FORCE_COLOR is set

### an unhandled error beside rows that ran is a failure outside the tests, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read Vitest's error without colors when FORCE_COLOR is set

### the summary doesn't name the unmutated run's error, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge a run whose rows pass beside an unhandled error, and report the error

### a run that selects no test file is not refused, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should refuse a file whose run selects no test file; packages/mutator/tests/mutator.node.test.ts > should refuse a file with only survivors whose run selects no test file, before any mutation; packages/mutator/tests/mutator.node.test.ts > should name only the run that selects no test file, of two runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a file whose run selects no test file
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a file with only survivors whose run selects no test file, before any mutation
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should name only the run that selects no test file, of two runs

### Vitest's colors are kept, webkit: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read Vitest's error without colors when FORCE_COLOR is set
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read Vitest's error without colors when FORCE_COLOR is set
# Mutations: .plan/reviews/mutations-1/recheck-3.mutations.ts

The code at 3450377252aa1e4608e281ac12cd1af333a52c45, the file and the runner at no commit that holds them as they ran, in chromium.

- chromium, unmutated: 37 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| a mutated run's error isn't kept | mechanism | as expected (1) |  |
| the unmutated run's error isn't kept | mechanism | as expected (2) |  |
| the reporter's banner isn't found | mechanism | as expected (1) |  |
| the JSON report is named for every reporter | mechanism | as expected (0) |  |
| a run that selects no test file isn't excused from the unexplained exit | mechanism | as expected (0) |  |
| the refusal doesn't name the engine | mechanism | as expected (3) |  |
| a run is refused only when every run before it selects no test file | mechanism | as expected (1) |  |
| probe: case H in the browser project | mechanism | as expected (1) |  |
| probe: failure messages have no colors with FORCE_COLOR | mechanism | as expected (0) |  |

Groups: mechanism 9, engine 0, doubted 0, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### a mutated run's error isn't kept, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge a run whose rows pass beside an unhandled error, and report the error

### the unmutated run's error isn't kept, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge a run whose rows pass beside an unhandled error, and report the error; packages/mutator/tests/mutator.node.test.ts > should read Vitest's error without colors when FORCE_COLOR is set
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read Vitest's error without colors when FORCE_COLOR is set

### the reporter's banner isn't found, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge a run whose rows pass beside an unhandled error, and report the error
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge a run whose rows pass beside an unhandled error, and report the error

### the JSON report is named for every reporter, chromium: as expected

- expected survives: the dot reporter writes no file, so the output is the same

### a run that selects no test file isn't excused from the unexplained exit, chromium: as expected

- expected survives: a run with no test file has no listed file without a row, and is refused before its error is read

### the refusal doesn't name the engine, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should refuse a file whose run selects no test file; packages/mutator/tests/mutator.node.test.ts > should refuse a file with only survivors whose run selects no test file, before any mutation; packages/mutator/tests/mutator.node.test.ts > should name only the run that selects no test file, of two runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a file whose run selects no test file
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a file with only survivors whose run selects no test file, before any mutation
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should name only the run that selects no test file, of two runs

### a run is refused only when every run before it selects no test file, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should name only the run that selects no test file, of two runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should name only the run that selects no test file, of two runs

### probe: case H in the browser project, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read Vitest's error without colors when FORCE_COLOR is set
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read Vitest's error without colors when FORCE_COLOR is set

### probe: failure messages have no colors with FORCE_COLOR, chromium: as expected

- expected survives: Vitest's JSON report gives failure messages without colors under FORCE_COLOR
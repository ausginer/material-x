# Mutations: .plan/mutations-1/mutator.mutations.ts

At 472edce3107215c4f471789f05a343d7936e5c0d, in chromium.

- chromium, unmutated: 18 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| a stale edit runs | mechanism | as expected (1) |  |
| a selector that covers no row runs | mechanism | as expected (1) |  |
| the copy stays after a run | mechanism | as expected (3) |  |
| a mutation is not restored | mechanism | as expected (1) |  |
| a stale copy is kept | mechanism | as expected (1) |  |
| a void row is judged | mechanism | as expected (1) |  |
| a survivor is never caught | mechanism | as expected (1) |  |
| engines never differ | mechanism | as expected (1) |  |
| an engine's own expectation doesn't account for a difference | mechanism | as expected (1) |  |
| a row that one engine skips counts | mechanism | as expected (1) |  |
| nothing rebuilds | mechanism | as expected (2) |  |
| every edit rebuilds | mechanism | as expected (1) |  |
| a row that doesn't run counts as passing | doubted | as expected (0) |  |

Groups: mechanism 12, engine 0, doubted 1, other 0.

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
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs

### a mutation is not restored, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs

### a stale copy is kept, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should remove a locked copy whose process no longer runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs

### a void row is judged, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void

### a survivor is never caught, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a survivor that fails rows as caught
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails rows as caught

### engines never differ, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine

### an engine's own expectation doesn't account for a difference, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one

### a row that one engine skips counts, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips

### nothing rebuilds, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should rebuild after a matching edit and after its restore
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave them as they were after a run that fails midway
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### every edit rebuilds, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not rebuild for an edit that doesn't match
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should not rebuild for an edit that doesn't match

### a row that doesn't run counts as passing, chromium: as expected

- expected survives: No fixture row's test file fails to load with a mutation, so no row sees a row that stops running. A mutation that breaks its file's import is then read as passing.
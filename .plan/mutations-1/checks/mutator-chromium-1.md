# Mutations: .plan/mutations-1/mutator.mutations.ts

At ef6a78b93c3d2ced7b95c336dea48803144d0a6d, in chromium.

- chromium, unmutated: 17 rows ran, 16 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| a stale edit runs | mechanism | as expected (1) |  |
| a selector that covers no row runs | mechanism | void (0) |  |
| the copy stays after a run | mechanism | void (0) |  |
| a mutation is not restored | mechanism | void (0) |  |
| a stale copy is kept | mechanism | void (0) |  |
| a void row is judged | mechanism | void (0) |  |
| a survivor is never caught | mechanism | void (0) |  |
| engines never differ | mechanism | void (0) |  |
| an engine's own expectation doesn't account for a difference | mechanism | void (0) |  |
| a row that one engine skips counts | mechanism | void (0) |  |
| nothing rebuilds | mechanism | void (0) |  |
| every edit rebuilds | mechanism | void (0) |  |
| a row that doesn't run counts as passing | doubted | as expected (0) |  |

Groups: mechanism 12, engine 0, doubted 1, other 0.

An outcome other than _as expected_, or a mutation that differs between engines, is the reviewer’s to judge.

## Each mutation

### a stale edit runs, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should refuse each stale edit by name
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse each stale edit by name before anything runs

### a selector that covers no row runs, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should refuse a selector that covers no row
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, refusals should refuse a selector that covers no row before any mutation runs

### the copy stays after a run, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should leave the checkout and the temporary directory as they were after a run; packages/mutator/tests/mutator.node.test.ts > should leave them as they were after a run that fails midway
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave the checkout and the temporary directory as they were after a run
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should leave them as they were after a run that fails midway

### a mutation is not restored, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs

### a stale copy is kept, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should remove a locked copy whose process no longer runs
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, a copy that an earlier run left should remove a locked copy whose process no longer runs

### a void row is judged, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void

### a survivor is never caught, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a survivor that fails rows as caught
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails rows as caught

### engines never differ, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine

### an engine's own expectation doesn't account for a difference, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one

### a row that one engine skips counts, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips

### nothing rebuilds, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should rebuild after a matching edit and after its restore
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should rebuild after a matching edit and after its restore

### every edit rebuilds, chromium: void

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not rebuild for an edit that doesn't match
  - void, fails unmutated: packages/mutator/tests/mutator.node.test.ts > mutator run, rebuilds should not rebuild for an edit that doesn't match

### a row that doesn't run counts as passing, chromium: as expected

- expected survives: No fixture row's test file fails to load with a mutation, so no row sees a row that stops running. A mutation that breaks its file's import is then read as passing.
# Mutations: .plan/mutations-1/mutator.mutations.ts

The code at a1ba81d6c2dbd1135d1f863e9573aeb3036c45ea, the file and the runner at a1ba81d6c2dbd1135d1f863e9573aeb3036c45ea, in chromium.

- chromium, unmutated: 22 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| a stale edit runs | mechanism | as expected (1) |  |
| a selector that covers no row runs | mechanism | as expected (1) |  |
| the copy stays after a run | mechanism | as expected (4) |  |
| a mutation is not restored | mechanism | as expected (1) |  |
| a stale copy is kept | mechanism | as expected (1) |  |
| a void row is judged | mechanism | as expected (3) |  |
| a survivor is never caught | mechanism | as expected (1) |  |
| engines never differ | mechanism | as expected (2) |  |
| an engine's own expectation doesn't account for a difference | mechanism | as expected (1) |  |
| a row that one engine skips counts | mechanism | as expected (2) |  |
| nothing rebuilds | mechanism | as expected (2) |  |
| every edit rebuilds | mechanism | as expected (1) |  |
| a row that doesn't run counts as passing | mechanism | as expected (3) |  |
| a row that doesn't run counts as failed | mechanism | as expected (3) |  |
| one engine's own expectation accounts for every engine's difference | mechanism | as expected (1) |  |
| an engine's environment doesn't reach Vitest | mechanism | as expected (7) |  |
| a signal stops nothing | mechanism | as expected (1) |  |
| a stopped command is not waited for | mechanism | missed (0) |  |
| a row that doesn't run in one engine is compared | mechanism | as expected (1) |  |
| a selected row that passes is never missed | mechanism | as expected (1) |  |
| nothing is read as expected | mechanism | as expected (8) |  |
| a survivor is always caught | mechanism | as expected (4) |  |

Groups: mechanism 22, engine 0, doubted 0, other 0.

An outcome other than _as expected_, or a mutation that differs between engines, is the reviewer’s to judge.

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
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### a row that doesn't run counts as failed, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should read a selected row that doesn't run as void; packages/mutator/tests/mutator.node.test.ts > should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that doesn't run as void, with its file's reason
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### one engine's own expectation accounts for every engine's difference, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain

### an engine's environment doesn't reach Vitest, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should not flag a row that doesn't run in another engine; packages/mutator/tests/mutator.node.test.ts > should run in a browser project; packages/mutator/tests/mutator.node.test.ts > should read a selected row that fails unmutated as void; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should flag a mutation that fails other rows in another engine; packages/mutator/tests/mutator.node.test.ts > should not flag a row that another engine skips; packages/mutator/tests/mutator.node.test.ts > should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a selected row that fails unmutated as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should run in a browser project
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a mutation that fails other rows in another engine
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should flag a difference between engines that another engine's own expectation doesn't explain
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that another engine skips
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, engines should not flag a row that doesn't run in another engine

### a signal stops nothing, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone

### a stopped command is not waited for, chromium: missed

- expected fails: packages/mutator/tests/mutator.node.test.ts > should stop its Vitest and leave nothing after SIGTERM to the tool alone
  - missed: packages/mutator/tests/mutator.node.test.ts > mutator run, the invoking checkout should stop its Vitest and leave nothing after SIGTERM to the tool alone

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

### a survivor is always caught, chromium: as expected

- expected fails: packages/mutator/tests/mutator.node.test.ts > should read a survivor that fails no row as expected; packages/mutator/tests/mutator.node.test.ts > should judge each engine by its own expectation; packages/mutator/tests/mutator.node.test.ts > should read a survivor whose rows don't run as void; packages/mutator/tests/mutator.node.test.ts > should restore each mutation before the next one runs
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor that fails no row as expected
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should read a survivor whose rows don't run as void
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, outcomes should judge each engine by its own expectation when it gives one
  - failed: packages/mutator/tests/mutator.node.test.ts > mutator run, restore should restore each mutation before the next one runs
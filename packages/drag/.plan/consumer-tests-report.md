# Consumer tests report

**Unit:** [`consumer-tests-handoff.md`](consumer-tests-handoff.md), on `drag/size` from `9c7b73047`. **Governing records:** `drag:DRD-54`, and `drag:DRO-15` step 1.

**Outcome:** `npx vitest run -c vitest.config.ts` now also runs a `consumer` project. It runs 22 browser files and 326 tests against the files that `tsdown` emits, and every test passes. The source projects run the same titles with the same verdicts as at the base. W1, W2 and W3 hold. No return condition was met.

## Commits

| Commit | What it carries |
| --- | --- |
| `5ea7bb7e6` | The `consumer` project, its build setup and resolution, the source-only list, and the moved tests |
| The commit that carries this report | This report and `measurements/2026-11-12-consumer-*` |

The final suite and the three-engine run read the working tree that `5ea7bb7e6` commits. The runner records their revision as `9c7b73047`, dirty. After the commit, `git diff 5ea7bb7e6 -- .scripts packages/drag/tests packages/drag/vitest.config.ts` is empty.

## 1. The base

This command printed nothing:

```sh
git diff --stat fe529df4c HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json .scripts/vitest-config.ts
```

The Chromium suite at `9c7b73047`, through the runner (run `consumer-base-suite`):

| Project       | Files | Tests | Failed |
| ------------- | ----: | ----: | -----: |
| `browser`     |    23 |   354 |      0 |
| `shipped`     |     1 |     9 |      0 |
| `node`        |     3 |    37 |      6 |
| `declaration` |     3 |    20 |      0 |
| **Total**     |    30 |   420 |      6 |

The six failures are the known size rows in `tests/size.node.test.ts`: "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". 414 passed, as at `0c13786ea`. Vitest's duration: **58.20 s**. The runner's step time: 58.9 s.

## 2. The source-only tests

I read every file of the Chromium `browser` project except `hot-path.browser.test.ts` against `DRD-54` property 3. I checked their runtime imports, every read of `refusals()` and of the development check's fault, and every cast, `Reflect` call, spy and member assignment on a library object. The fixtures and the harness import only entries at runtime.

**Every source-only test, with its reason:**

| Test | What it reads |
| --- | --- |
| `callback-list.browser.test.ts`, all 20 tests | `src/kernel/callbacks.ts`, which no entry publishes |
| "sortable options should call the layoutAnimation sink with its receiver, with rows in flight" | the displacement sink's `report` and `settle`. **Not in the handoff's list**, see below |
| "sortable options drag:DRD-50 should settle each range y() measures in the cache's own buffer and element array" | the sink's `settle`, and `STRIDE` from `src/sortable/rect-index.ts` |
| "sortable options drag:DRD-50 should settle each xy() rebuild in the cache's own buffer and element array" | the sink's `settle`, and `STRIDE` |
| "sortable options drag:DRD-50 should settle a row in flight when the window grows over it, and hold the gap its flow position gives" | the sink's `settle`, `STRIDE` and `TOP` |
| "drag:DRD-52 development equivalence check should report a placeholder that a committed move displaces along x" | the development check's report |
| "drag:DRI-1 a request does not change the running step should finish the step when a custom element reaction asks to press during activate" | the refusal count. This is the `press` case only |
| "drag:DRI-6 reentrant input should refuse a nested press, and take the next real one" | the refusal count |
| "drag:DRI-6 reentrant input should refuse no trusted event during ordinary drags" | the refusal count. Against the build it reads 0 |

**The addition.** The receiver test spies on `report` and `settle` of the sink that `layoutAnimation()`'s installer returns. Those members are declared only by `DisplacementSink` in `sortable/axis.d.ts`. That is one of the installer types that `DRD-39` keeps unpublished, and the handoff calls the sink's `settle` unpublished for the `DRD-50` tests. By the same rule, the receiver test is source-only. Against the unmangled build it passes. It would fail if the names were mangled, as `DRO-15` option 2 would do.

**Not source-only:**

- "drag:DRD-25 option callbacks should pass the placeholder factory only item, visual, box and rect" reads the keys of the object passed to the public `placeholder` option. `PlaceholderContext` is exported from `sortable.js`.
- `faults.browser.test.ts` imports `src/lift.ts` dynamically. That is an entry.
- Every other `src` import in the selected files is an entry, or is type-only and erased.

**The source-only list** is `DRAG_SOURCE_ONLY_BROWSER_TESTS` in `.scripts/vitest-config.ts`, beside `DRAG_SHIPPED_BROWSER_TESTS`. Each entry has a comment with its reason:

| File | Reason in the list |
| --- | --- |
| `tests/callback-list.browser.test.ts` | `src/kernel/callbacks.ts`, which no entry publishes |
| `tests/displacement-sink.browser.test.ts` | the sink's `report` and `settle`, which only the unpublished installer types declare, and `STRIDE` and `TOP` from `src/sortable/rect-index.ts` |
| `tests/equivalence-check.browser.test.ts` | the development equivalence check's report |
| `tests/refusals.browser.test.ts` | the refusal count |

**Every moved test,** with its title and body unchanged, under a `describe` of the same title:

| Test | From | To |
| --- | --- | --- |
| "should call the layoutAnimation sink with its receiver, with rows in flight" | `sortable.browser.test.ts` | `displacement-sink.browser.test.ts` |
| the three `drag:DRD-50` tests above | `sortable.browser.test.ts` | `displacement-sink.browser.test.ts` |
| "should report a placeholder that a committed move displaces along x" | `sortable.browser.test.ts` | `equivalence-check.browser.test.ts` |
| "should finish the step when a custom element reaction asks to %s during activate", the `press` case | `requests.browser.test.ts` | `refusals.browser.test.ts` |
| "should refuse a nested press, and take the next real one" | `terminals.browser.test.ts` | `refusals.browser.test.ts` |
| "should refuse no trusted event during ordinary drags" | `terminals.browser.test.ts` | `refusals.browser.test.ts` |

- **Helpers.** `SettleCall`, `recordSettles`, `measurementsOf` and `expectCacheRanges` moved with the `DRD-50` tests, because no remaining test uses them. `noteOutcome` moved from `terminals.browser.test.ts` into `tests/support/harness.ts`, because tests that stay in `terminals` also use it. Its body is unchanged.
- **The `it.each`.** `requests.browser.test.ts` keeps `['cancel', 'destroy']`, and `refusals.browser.test.ts` has `['press']`. Both keep the same title template and body.
- **The check.** The moved blocks were compared byte for byte with `9c7b73047`'s, after `fmt` and `lint-fix`. They are identical.
- **The harness's check** that no trusted event is refused stays as it is.

## 3. The consumer project

**Where it is.** `createDragTestProjects` takes an optional `ConsumerProject`. `@ydinjs/drag`'s `vitest.config.ts` and the workspace configuration pass `DRAG_CONSUMER`. drag2's calls don't pass it, so drag2's projects don't change. `createDragAllEnginesTestConfig` is unchanged, so no three-engine configuration has the project. The engine run below lists no `consumer` project.

| Property | How |
| --- | --- |
| 1. The build | `tests/support/build-package.node.ts` is the project's global setup. It runs `node ../../.scripts/package-files.ts clean --package .`, then `npx tsdown --config tsdown.config.ts`, in the package root. These are the `just build` recipe's two commands. Vitest runs it once per run, before the project's files start |
| 2. A failed build | The global setup provides the failure as a string. `tests/support/require-build.ts` throws it in each consumer file. This is the `DRAG2_NODE_BUILD` pattern |
| 3. Resolution | The `resolve-published-entries` Vite plugin is in the consumer project only. A relative import that resolves under `src/` becomes `src/<path>.js`. If `./<path>.js` is a key of `package.json`'s `exports`, the plugin resolves `@ydinjs/drag/<path>.js` with Vite's resolver. That is the consumer path: the workspace link in `node_modules`, then the exports map, then the emitted file. `@ydinjs/box-quad` isn't under `src/`, so it resolves as in the source projects |
| 4. Non-entries | Any other module under `src/` is an error at resolution: `<path> is not a published entry of @ydinjs/drag` |
| 5. Selection | `include` is the `browser` project's. `exclude` is the `shipped` files plus `DRAG_SOURCE_ONLY_BROWSER_TESTS` |
| 6. Where it runs | Package and workspace Chromium configurations. Not in `vitest.engines.config.ts` |

`npx vitest list --filesOnly --project consumer/drag` from the repository root lists the same 22 files. That shows the workspace configuration has the project.

## Witnesses

Each scratch edit was made on a copy. Each restore was confirmed with `cmp`.

- **W1, resolution** (run `consumer-w1`). I added `import '../src/kernel/callbacks.ts';` to `landing.browser.test.ts`. Vite reported `src/kernel/callbacks.ts is not a published entry of @ydinjs/drag`, and the file failed to import. **Holds.**
  - **Collateral failures.** In the same run, 19 `coordinates` tests and 1 `sortable` test failed, after the failed import. A probe (run `consumer-w1-probe-source`) imported a missing `src` module in the source `browser` project. It also caused failures in other files: 1 in `requests` and 1 in `sortable`. **So a file that fails to import disturbs files that run after it in browser mode, in either project.** The consumer project doesn't cause this. One trial run during development showed the same: one `landing` failure next to a failed `sortable` import, and none once the import was fixed.
- **W2, the build** (run `consumer-w2`). A scratch edit to the global setup renamed `zIndex:` to `zIndexW2:` in the emitted `shared/landing.js` after a successful build. One run of `--project consumer --project browser tests/landing.browser.test.ts` gave four `drag:DRI-13` failures in `consumer`:
  - "should stay above relative siblings for the whole flight";
  - "should stay above z-index siblings for the whole flight";
  - "should keep an item with its own z-index on top, in every engine";
  - "should keep an absolutely positioned item on top".

  All 19 tests passed in `browser`. These are the same four landing tests that the exploration found. **Holds.**

- **W3, a failed build.**
  - **First attempt, discarded** (run `consumer-w3`, `2026-11-12-consumer-w3-discarded.json`). The handoff's example, `--config missing.config.ts`, doesn't fail. `tsdown` 0.23.2 reports `config file: …/tsdown.config.ts`, builds with the default configuration file, and exits 0. Every consumer file passed.
  - **The witness** (run `consumer-w3-throwing-config`). `--config` pointed at a scratch configuration that throws when it loads. `tsdown` exited 1. All 22 consumer files failed with `npx tsdown --config … exited with 1` and `tsdown`'s output. The source projects had 30 files and 420 tests, of which 414 passed, with the six size rows failing. That equals the base. **Holds.**

## Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat 9c7b73047..HEAD -- packages/drag .scripts` | `.scripts/vitest-config.ts`, `packages/drag/vitest.config.ts`, `tests/support/` (`harness.ts`, two new files), the three moved-from test files, the three new source-only files, this report and `measurements/`. `src`, `bench`, `tsdown.config.ts`, `package.json`, `files.json`, `vitest.engines.config.ts` and drag2 are unchanged |
| The source projects | Identical titles and verdicts to the base per project, with the moved tests matched by title (`2026-11-12-consumer-compare.txt`). Only the six size rows fail |
| The consumer project | 22 files and 326 tests. All pass |
| Selection | `browser` has 26 files. `consumer` has those minus `callback-list`, `displacement-sink`, `equivalence-check` and `refusals`. `hot-path` is in `shipped`. 354 − 28 source-only tests = 326 |
| W1, W2, W3 | Hold, as above |
| Three engines (`npx just test-engines`) | 81 files, **1,071 passed, 18 skipped**, no failure, as at `0c13786ea` (run `consumer-engines`) |
| `hot-path.browser.test.ts`, `shipped` | 9 of 9 pass in the final suite |
| Changed `.ts` files under `packages/drag` | `npx just fmt`, `lint-fix`, `fmt`, `lint`: clean. `npx just typecheck`: clean |
| `.scripts/vitest-config.ts` | `oxfmt`, `oxlint --fix`, `eslint --fix`, `oxfmt`, `oxlint`, `eslint`: clean. `npx tsc -p tsconfig.json --noEmit` from the root: exit 0 |
| Markdown | This report: `oxfmt`, links checked by hand, `git diff --check`. No Markdown linter is configured, so lint doesn't apply. `git diff --check` is clean on the report. It flags trailing whitespace in the runner logs under `measurements/`, which are kept unedited, as `fe529df4c`'s are |

**The final Chromium suite** (run `consumer-final`):

| Project       | Files | Tests | Failed |
| ------------- | ----: | ----: | -----: |
| `browser`     |    26 |   354 |      0 |
| `shipped`     |     1 |     9 |      0 |
| `consumer`    |    22 |   326 |      0 |
| `node`        |     3 |    37 |      6 |
| `declaration` |     3 |    20 |      0 |
| **Total**     |    55 |   746 |      6 |

**Wall time,** not gated. The base took **58.20 s**, and the final suite **99.60 s** (Vitest's duration; the runner's step times are 58.9 s and 100.4 s). The `consumer` project adds the build and one more serialized browser group. The machine has 12 CPUs, Node v26.13.0 and Chrome for Testing 157.0.8103.38.

**Runner sequencing.** The runner stops at the first failed step, and the Chromium suite always fails on the six size rows. So the three-engine step queued after the final suite didn't run. It ran as its own run, `consumer-engines`.

## Measurements

These are saved unedited under [`measurements/`](measurements/):

- `2026-11-12-consumer-runs/<run>/status.json` and `1.log` for every run: `consumer-base-suite`, `consumer-final`, `consumer-engines`, `consumer-w1`, `consumer-w1-probe-source`, `consumer-w2`, `consumer-w3` (discarded) and `consumer-w3-throwing-config`;
- `2026-11-12-consumer-base-suite.json`, `2026-11-12-consumer-final-suite.json`, `2026-11-12-consumer-w3.json` and `2026-11-12-consumer-w3-discarded.json`: Vitest's JSON reports;
- `2026-11-12-consumer-compare.txt`: the title and verdict comparison, and its script `2026-11-12-consumer-compare.ts.txt`.

## Notes for the architect

- **`tsdown` ignores a missing `--config` path** and falls back to `tsdown.config.ts`. A future witness that needs a failed build needs a configuration that fails to load, not an absent one.
- **The build's clean is `git clean -fx`** over every entry directory, `kernel`, `shared` and `_virtual`. Any untracked file under `packages/drag/sortable/` is deleted on each consumer run, as `just build` already does. The four `sortable/*-1.ts` inspection prototypes named in the owner's request weren't in the tree when this unit started: a search of the whole checkout found no `*-1.ts` file before any build ran. So nothing of them was touched or committed.
- **The emitted tree is no longer a stable artifact between runs.** Each Chromium run rebuilds it in the package root. Size and `compare.ts` runs that build their own trees are unaffected. A manual reading of the root tree reflects the last test run.
- **Step 2** (`DRO-15`, the gate on the published build) can reuse the global setup. The node project would need the same build before its files, and today it has no build of its own.

## Next

The architect reads this report and decides `DRO-15` step 2 as a separate unit (`DRD-54`). This unit stops here.
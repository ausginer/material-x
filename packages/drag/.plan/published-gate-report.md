# Published gate report

**Unit:** [`published-gate-handoff.md`](published-gate-handoff.md), on `drag/size` from `7154dd4c3`. **Governing records:** `drag:DRF-23`, `drag:DRD-54` property 2 as amended on 2026-11-13, `drag:DRD-55`, and `drag:DRO-15` step 2.

**Outcome:**

- **Part A.** The consumer project decides by the file that an import reaches. At `87288b9d2`'s resolver, F2, F3, F4, F5 and F6b loaded `src/kernel/callbacks.ts`. At the repair, every form fails at resolution with an error that names `src/kernel/callbacks.ts`. E passes, and both of its imports give the emitted `draggable`.
- **Part B.** `tests/size.node.test.ts` and `node bench/size/measure.ts` gate the files that `tsdown` emits, through the exports map. Every row's graph equals its graph at the base under the path mapping. G1 to G5 hold. One build serves the consumer and node projects in every run that has either of them.
- **Size.** No row's verdict changes. The figures move by −7 to +16 B Brotli. The ceilings and the control figure are unchanged.

No return condition was met.

## Commits

| Commit | What it carries |
| --- | --- |
| `79b4c3132` | Part A: `tests/support/published-entries.ts`, the shared resolution rule, and the consumer project's use of it in `.scripts/vitest-config.ts` |
| `69c260685` | Part B: one build per run for the consumer and node projects (`DRAG_NODE_BUILD`, `build-package.node.ts`, `require-build.ts`, both configurations), and the gate on the emitted tree (`measure.ts`, and the expected list in `size.node.test.ts`) |
| The commit that carries this report | This report and `measurements/2026-11-13-gate-*` |

**Which revision each run read.** The base runs read `7154dd4c3`. Part A's two witness runs and the two consumer runs after the repair read the working tree that `79b4c3132` commits, before its format and lint pass. That pass changed only formatting, and moved the import of `publishedEntries` into its import group. The runner records them as `7154dd4c3`, dirty. Every part B run read `69c260685`. Its only dirty files are the untracked measurement files and each witness's own scratch edit.

## 1. The base

This command printed nothing:

```sh
git diff --stat 87288b9d2 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json packages/drag/vitest.config.ts .scripts/vitest-config.ts
```

**The Chromium suite at `7154dd4c3`** (run `gate-base-suite`), as expected:

| Project       | Files  | Tests   | Failed |
| ------------- | ------ | ------- | ------ |
| `browser`     | 26     | 354     | 0      |
| `shipped`     | 1      | 9       | 0      |
| `consumer`    | 22     | 326     | 0      |
| `node`        | 3      | 37      | 6      |
| `declaration` | 3      | 20      | 0      |
| **Total**     | **55** | **746** | **6**  |

740 tests pass. The six failures are the known size rows: "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". Wall time: 95.5 s from the runner's start to its end, and 94.85 s by Vitest.

**The base size figures** (run `gate-base-size`). [`size.ts.txt`](probes/size-pass/size.ts.txt) read `src`, and so did `node bench/size/measure.ts` at the base. The probe's Brotli-11 figure equals `measure.ts`'s on every row. §5 lists both.

## 2. Part A: the consumer guard (`DRF-23`)

### The rule

`tests/support/published-entries.ts` states the rule once. Vite's and Rolldown's `plugins` options both take it.

- **Every specifier is resolved first,** by the resolution that would otherwise run, through `this.resolve(…, { skipSelf: true })`.
- **The resolved file decides.** If it isn't under `packages/drag/src/`, the plugin returns `null` and resolution runs as before.
- **A file under `src/`:**
  - if it is a published entry's source, `src/<entry>.ts`, it resolves as `@ydinjs/drag/<entry>.js` does, through the exports map, to the emitted file. The specifier's query or hash is kept;
  - otherwise it is an error at resolution: `<path under the package> is not a published entry of @ydinjs/drag`.
- **A specifier with no importer is decided too.** That covers a request that the browser makes by URL.

The consumer project's plugin in `.scripts/vitest-config.ts` is now `publishedEntries(<package root>)`. The old relative-only `resolvePublishedEntries` is removed.

### The witness

The handoff asked for one scratch consumer file per form, each with a runtime import of `src/kernel/callbacks.ts`, plus E. Their sources are in [`2026-11-13-gate-part-a-witness-files.txt`](measurements/2026-11-13-gate-part-a-witness-files.txt). Each file ran as its own Vitest run, with `--project consumer --project browser`, so that a failed import couldn't disturb another file (assessment §4).

| Form | Specifier | `browser` | `consumer` at `87288b9d2`'s resolver | `consumer` at the repair |
| --- | --- | --- | --- | --- |
| F1, relative | `../src/kernel/callbacks.ts` | loads | fails: `src/kernel/callbacks.ts is not a published entry` | fails: `src/kernel/callbacks.ts is not a published entry` |
| F2, absolute | `<checkout>/packages/drag/src/kernel/callbacks.ts` | loads | **loads** | fails: the same error |
| F3, from the Vite root | `/src/kernel/callbacks.ts` | loads | **loads** | fails: the same error |
| F4, `/@fs/` | `/@fs/<checkout>/packages/drag/src/kernel/callbacks.ts` | loads | **loads** | fails: the same error |
| F5, `file:` URL | `file://<checkout>/packages/drag/src/kernel/callbacks.ts` | loads | **loads** | fails: the same error |
| F6a, relative with a query | `../src/kernel/callbacks.ts?w` | loads | fails, for the wrong reason: `src/kernel/callbacks.ts?w is not a published entry` | fails: `src/kernel/callbacks.ts is not a published entry` |
| F6b, absolute with a query | `<checkout>/packages/drag/src/kernel/callbacks.ts?w` | loads | **loads** | fails: the same error |
| E, `draggable` by `../src/draggable.ts` and by its absolute path |  | 1 of 2 tests passes | the file fails: the absolute import loads `src/draggable.ts`, and its own import of `./kernel/gesture.ts` is rejected | **both tests pass** |

Runs: `gate-a-base` at the old resolver and `gate-a-repair` at the repair.

- **F2 loaded at the base**, as the owner reproduced, so the witness discriminates.
- **Vite resolved every form** in the source project, so no form is excluded as unresolvable.
- **E in the source project.** Its second test, "the emitted `draggable` by both forms", fails there. That is correct: the source project imports `src`.
- **E in `consumer` at the repair.** Both imports are the same function, and it is the function that `@ydinjs/drag/draggable.js` gives.

**The 22 committed consumer files** pass at the repair: 22 files and 326 tests (run `gate-a-consumer-2`).

- **The first run is discarded,** but kept as `gate-a-consumer`. The project's Vite configuration had changed, so the dependency optimizer started a new cache. It found `react` and `react-dom` during the run and reloaded the page: "optimized dependencies changed. reloading". One iframe then didn't become ready within 60 s, and four files didn't run: `focus`, `operation-lifecycle`, `order` and `scoped-requests`.
- **The cause is the optimizer.** The files that ran all passed, and none of the four imports anything that the others don't. The second run, on the optimizer's warm cache, passed every file. The final suite passed every file as well (§6).

The scratch files were removed. `git status` showed none of them before part A was committed.

## 3. Part B: one build per run

**The setup.**

- **Both projects take the same setup.** `DRAG_NODE_BUILD` gives the node project the same `globalSetup` and `setupFiles` as `DRAG_CONSUMER`. `packages/drag/vitest.config.ts` and the workspace configuration both pass it.
- **No other configuration builds.** `vitest.engines.config.ts` has neither project, so it doesn't build.
- **The build is `just build`'s,** unchanged: `package-files.ts clean`, then `tsdown --config tsdown.config.ts`.

**Why it runs once.**

- **Each project evaluates the setup module in its own module runner** (`_initializeGlobalSetup` in Vitest 5.0.5). A module-level variable therefore isn't shared between the two projects.
- **The first project starts the build** and keeps its promise on the process's global object, under `Symbol.for('@ydinjs/drag: the build of this run')`. Every other project awaits that promise, then provides the result to its own files.
- **It finishes before any file starts.** Vitest awaits every project's global setup before it starts any file, and each setup awaits the build.

**The counts.** Each witness run was traced with `strace -f -e trace=execve`. [`2026-11-13-gate-count-builds.sh.txt`](measurements/2026-11-13-gate-count-builds.sh.txt) counts the exact argv of the clean step and of the `tsdown` step:

| Run | Configuration and selection | Cleans | `tsdown` builds | Result |
| --- | --- | --- | --- | --- |
| G5 | package, `--project consumer --project node` | 1 | 1 | 25 files, 363 tests, the six size rows fail |
| G5 | package, `--project node` | 1 | 1 | 3 files, 37 tests, the six size rows fail |
| G5 | package, `--project consumer` | 1 | 1 | 22 files, 326 tests, all pass |
| G5 | workspace, `--project consumer/drag --project node/drag` | 1 | 1 | 25 files, 363 tests, the six size rows fail |
| G5, control | package, `--project browser` | 0 | 0 | 26 files, 354 tests, all pass |
| G3 | package, every project, with a throwing `tsdown.config.ts` | 1 | 1 | see §4, G3 |

Earlier runs:

- the G1, G2, G4 and missing-file runs built with `npx just build`, once each. Each G1 run built once more at its end to restore the tree, and G4's Vitest step built once more through the setup;
- the base suite, the final suite and part A's runs each built once through the consumer project's setup. Only the runs in the table above were traced.

## 4. Part B: the gate

### Resolution

`measure()` bundles each row with `publishedEntries(<package root>)`, the rule of §2.

- **A row's import** of `src/<entry>.ts` resolves to the emitted `<entry>.js`, through the exports map.
- **A fixture's import** of an entry's source does the same.
- **Any other module under `src/`** is an error at resolution that names it.
- **`@ydinjs/box-quad`** stays aliased to `packages/box-quad/src/index.ts`.
- **`--prototype`** keeps its `package-name` plugin, now built where the prototype tree is unpacked.
- **The row's imports are unchanged:** every row imports the same entries and named exports as at the base.

**Figures.** `measure.ts` prints minified, gzip-9 and Brotli-11 bytes per row. gzip-9 is `gzipSync(bytes, { level: 9 })`, with zlib's other defaults, as `size.ts.txt` states. Brotli-11 is gated, and gzip-9 is printed only.

**The header** says that `node bench/size/measure.ts` measures the tree as it is in the package root, and that `npx just size` builds first. The `size` recipe already depends on `build`.

**A missing emitted file fails the gate** (run `gate-missing`):

- with `kernel/drag.js` moved away, the bundle fails with Rolldown's `[UNRESOLVED_IMPORT] Could not resolve './drag.js' in kernel/gesture.js`;
- with an entry's file, `draggable.js`, moved away, the plugin fails with `could not resolve @ydinjs/drag/draggable.js`. **That is the plugin's error, not Rolldown's `UNRESOLVED_IMPORT` code.** If the plugin returned `null` there, Rolldown would resolve the original specifier and bundle `src/draggable.ts`;
- each file was moved back, and the next reading equals the end reading.

**`--prototype` is unchanged** (run `gate-prototype`). Its two columns, at the base's `measure.ts` and at `69c260685`, are identical on all nine prototype rows.

### The graphs and the fragments

**Each row's module list at the build equals its list at the base,** with each `src/<path>.ts` read as `<path>.js`:

- box-quad's module is `../box-quad/src/index.ts` at both;
- the fixtures are `tests/fixtures/*.ts` at both;
- the module counts are 7, 9, 9, 13, 9, 15, 19, 20, 19 and 24, as at the base.

Check: [`2026-11-13-gate-graphs.txt`](measurements/2026-11-13-gate-graphs.txt), by [`2026-11-13-gate-graphs.ts.txt`](measurements/2026-11-13-gate-graphs.ts.txt). It compares the build's lists with the base probe's JSON.

**Fragment mapping.** Only the three fragments that named `src/` change. The check confirms each mapping two ways:

- in every row, the new fragment selects the counterparts of the modules that the old fragment selected;
- over every module of `src`, the fixtures and box-quad, the new fragment selects the counterparts of the old fragment's selection.

| Fragment at the base | At the build | Selects, over the whole tree |
| --- | --- | --- |
| `src/lift` | `lift` | `lift.js`, `lift/landing.js` |
| `src/sortable` (`SORTABLE_ONLY`) | `sortable` | `sortable.js` and every `sortable/*.js` |
| `src/free-drag` (`FREE_DRAG_ONLY`) | `free-drag` | `free-drag.js` and every `free-drag/*.js` |
| `box-quad`, `rect-index`, `linear-shift`, `shared/invalidation`, `shared/landing`, `layout-animation`, `free-drag/bounds`, `free-drag/drop-targets`, `sortable/xy`, `sortable/y` | unchanged | the `.js` counterpart of each base selection |

**"draggable alone"'s expected list** in `size.node.test.ts` changed from `src/<path>.ts` to `<path>.js`. It selects the same seven modules: `draggable`, `fault`, `kernel/callbacks`, `kernel/drag`, `kernel/gesture`, `kernel/session` and `shared/focus`. The title, the matcher and the module set are unchanged.

### The witnesses

The injected statement is in [`2026-11-13-gate-g1-injection.txt`](measurements/2026-11-13-gate-g1-injection.txt). It assigns a string of 64 random characters to `globalThis.gateInjection`.

**Which rows contain each injected module** ([`2026-11-13-gate-g1-membership.txt`](measurements/2026-11-13-gate-g1-membership.txt)):

| Row                         | `kernel/drag.js` | `shared/landing.js` |
| --------------------------- | ---------------- | ------------------- |
| draggable alone             | yes              | no                  |
| draggable + lift            | yes              | no                  |
| example: resize handle      | yes              | no                  |
| example: drop zone          | yes              | yes                 |
| example: canvas group       | yes              | no                  |
| freeDrag                    | yes              | no                  |
| freeDrag + bounds + landing | yes              | yes                 |
| sortable + y                | yes              | no                  |
| sortable + xy               | yes              | no                  |
| complete                    | yes              | yes                 |

**G1a, the statement appended to `kernel/drag.js`** (run `gate-g1a-2`), Brotli-11:

| Row                         | Uninjected | Injected | Difference |
| --------------------------- | ---------- | -------- | ---------- |
| draggable alone             | 2196       | 2281     | +85        |
| draggable + lift            | 3963       | 4040     | +77        |
| example: resize handle      | 3321       | 3372     | +51        |
| example: drop zone          | 4603       | 4677     | +74        |
| example: canvas group       | 3302       | 3382     | +80        |
| freeDrag                    | 5026       | 5097     | +71        |
| freeDrag + bounds + landing | 5470       | 5544     | +74        |
| sortable + y                | 6645       | 6724     | +79        |
| sortable + xy               | 6534       | 6605     | +71        |
| complete                    | 7283       | 7358     | +75        |

Every row contains `kernel/drag.js`, and every row reads higher. "draggable alone" reports `control moved by 257 B`, against 172 B uninjected.

**G1b, the statement appended to `shared/landing.js`** (run `gate-g1b-2`):

- "example: drop zone" goes from 4603 to 4674 (+71), "freeDrag + bounds + landing" from 5470 to 5549 (+79), and "complete" from 7283 to 7361 (+78);
- the seven other rows equal the uninjected build to the byte, in all three figures. "draggable alone"'s control is among them, still reported as moved by 172 B.

**The first G1 runs are discarded,** but kept as `gate-g1a` and `gate-g1b`.

- **Why.** An emitted file ends in `//# sourceMappingURL=…` with no newline. The appended statement joined that comment, so nothing was injected, and every figure stayed the same.
- **The kept runs** prepend a newline. Their step 3 logs show the statement on its own line.

**G2, the same statement appended only to `src/kernel/drag.ts`,** after the build (run `gate-g2`):

- every row's three figures equal the uninjected reading;
- the source file was restored from its copy, and `cmp` confirmed it.

**G3, a failed build** (run `gate-g3`, the whole package configuration):

- **The scratch config.** `tsdown.config.ts` was replaced by `throw new Error('G3: a tsdown configuration that throws while it loads');`. It was restored afterwards, and `cmp` confirmed it.
- **The consumer files.** All 22 fail with `tsdown`'s output, `Error: G3: a tsdown configuration that throws while it loads`.
- **The node files.** All three fail with the same error: `size.node.test.ts`, and, as the handoff allows, `campaign.node.test.ts` and `exports.node.test.ts`.
- **The source projects.** `browser` (26 files, 354 tests), `shipped` (1, 9) and `declaration` (3, 20) pass in full, as at the base.
- **The count.** One clean and one `tsdown` run.

**G4, a fixture's non-entry import** (run `gate-g4`). `tests/fixtures/drop-zone.ts` received `import { queue } from '../../src/kernel/callbacks.ts';` and `globalThis.gateNonEntry = queue;`. It was restored afterwards, and `cmp` confirmed it.

- **`node bench/size/measure.ts`** printed the first three rows, then failed at "example: drop zone" with `[plugin published-entries] RolldownError: src/kernel/callbacks.ts is not a published entry of @ydinjs/drag`.
- **`size.node.test.ts`** fails with the same error, and its 11 tests are skipped. The file measures every row in one `beforeAll`, so one row's failure fails the whole file. The test's structure is outside this unit.

**G5, one build:** §3.

## 5. The size figures

**Base:** `src` at `7154dd4c3`, through `size.ts.txt` (run `gate-base-size`, [`2026-11-13-gate-base-size-probe.json`](measurements/2026-11-13-gate-base-size-probe.json)). **End:** the build at `69c260685`, through `measure.ts` (run `gate-end-size`, step 2). Figures are minified / gzip-9 / Brotli-11 bytes.

| Row | Ceiling | Base | Build | Difference | Verdict at the base | Verdict at the build |
| --- | --- | --- | --- | --- | --- | --- |
| draggable alone | 2139, control 2024 | 6731 / 2427 / 2196 | 6731 / 2427 / 2196 | 0 / 0 / 0 | red: 57 B over, control moved by 172 B | red: the same |
| draggable + lift | 4169 | 11542 / 4401 / 3963 | 11542 / 4401 / 3963 | 0 / 0 / 0 | green | green |
| example: resize handle | 3313 | 9388 / 3668 / 3321 | 9388 / 3668 / 3321 | 0 / 0 / 0 | red: 8 B over | red: 8 B over |
| example: drop zone | 4431 | 13181 / 5103 / 4603 | 13181 / 5103 / 4603 | 0 / 0 / 0 | red: 172 B over | red: 172 B over |
| example: canvas group | 3314 | 9524 / 3628 / 3302 | 9524 / 3628 / 3302 | 0 / 0 / 0 | green | green |
| freeDrag | 4967 | 15160 / 5569 / 5022 | 15166 / 5574 / 5026 | +6 / +5 / +4 | red: 55 B over | red: 59 B over |
| freeDrag + bounds + landing | 5210 | 16325 / 6058 / 5454 | 16331 / 6064 / 5470 | +6 / +6 / +16 | red: 244 B over | red: 260 B over |
| sortable + y | 6733 | 20559 / 7350 / 6652 | 20559 / 7351 / 6645 | 0 / +1 / −7 | green, 81 B under | green, 88 B under |
| sortable + xy | 6617 | 20103 / 7239 / 6541 | 20103 / 7239 / 6534 | 0 / 0 / −7 | green, 76 B under | green, 83 B under |
| complete | 7065 | 22238 / 8077 / 7284 | 22238 / 8079 / 7283 | 0 / +2 / −1 | red: 219 B over | red: 218 B over |

- **No row's verdict changes.** The same six rows are red at both readings, and nothing goes to `DRO-4` as a changed verdict.
- **The Brotli differences are −7 to +16 B,** the range that the exploration's emulated build read (§3).
- **gzip-9 and Brotli-11 disagree in sign on two rows.** On "sortable + y", gzip-9 is +1 and Brotli-11 −7. On "complete", gzip-9 is +2 and Brotli-11 −1. Minified is 0 on both: the emitted code there has the same length as the source bundle and different bytes.
- **Two readings of one build agree to the byte.** `gate-end-size` steps 2 and 3 are identical. The uninjected readings of `gate-g1a-2`, `gate-g1b-2` and `gate-g2` read three other builds of the same tree, and equal them.

## 6. Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty. The base suite and the base size figures are recorded (§1) |
| `git diff --stat 7154dd4c3..HEAD -- packages/drag .scripts` | `.scripts/vitest-config.ts`, `packages/drag/vitest.config.ts`, `tests/support/published-entries.ts`, `tests/support/build-package.node.ts`, `tests/support/require-build.ts`, `bench/size/measure.ts` and `tests/size.node.test.ts`, then this report and `measurements/2026-11-13-gate-*`. All are within §Boundaries |
| Part A's witnesses | `gate-a-base` at `87288b9d2`'s resolver: F2, F3, F4, F5 and F6b load. `gate-a-repair`: every form fails naming `src/kernel/callbacks.ts`, and E passes (§2) |
| The source projects | `browser` 26 files and 354 tests, `shipped` 1 and 9, `declaration` 3 and 20. Each test's title and verdict equal the base's |
| The node project | 3 files and 37 tests. The titles equal the base's. The six size rows fail, as at the base, and no verdict differs |
| The consumer project | 22 files and 326 tests. All pass, with titles and verdicts equal to the base's |
| The size figures | §5 |
| G1 to G5 | All hold (§3, §4) |
| Three engines (`npx just test-engines`) | 81 files: 1,071 passed and 18 skipped, as at `87288b9d2` (run `gate-engines-2`) |
| `tests/hot-path.browser.test.ts`, `shipped` project | 9 tests, all pass |
| The suite's wall time | 95.5 s at the base and 95.4 s at `69c260685`, from runner start to end. By Vitest, 94.85 s and 94.73 s. Not gated |
| Changed `.ts` files | `handoff.md`'s format and lint loop, with no remaining finding. `npx just typecheck` in `packages/drag` and `npx tsc -p tsconfig.json --noEmit` at the root pass. `.scripts/vitest-config.ts` took the repository-level commands |
| Markdown | `oxfmt`, `git diff --check`, and a scratch link check of this report. No linter is configured for Markdown, so none applies |

**The final suite** (run `gate-final-suite`, [`2026-11-13-gate-final-suite.json`](measurements/2026-11-13-gate-final-suite.json)) had 746 tests, of which 740 pass. [`2026-11-13-gate-summary.ts.txt`](measurements/2026-11-13-gate-summary.ts.txt) extracted every row as project, file, title and verdict from the base and final logs. The two lists are identical, all 746 rows.

**The first three-engine run is discarded,** but kept as `gate-engines`.

- **What happened.** Its WebKit projects couldn't launch the browser. Playwright reported missing host libraries, such as `libGLESv2.so.2` and `libx264.so`. Chromium and Firefox ran 54 files with no failure.
- **The cause.** `87288b9d2`'s engine run sourced `~/.cache/ms-playwright/webkit-env.sh` first, which points WebKit at its own copy of those libraries.
- **The kept run,** `gate-engines-2`, does the same and passes.

## Measurements

Saved unedited under [`measurements/`](measurements/):

- **`2026-11-13-gate-runs/<run>/`:** each run's `status.json` and step logs, for every run named above, the discarded ones included;
- **`2026-11-13-gate-runs/traces/`:** the `strace` logs of G3 and G5;
- **`2026-11-13-gate-base-suite.json` and `2026-11-13-gate-final-suite.json`:** Vitest's JSON reports;
- **`2026-11-13-gate-base-size-probe.json`:** `size.ts.txt`'s base reading, which includes each row's module list;
- **the checks and their outputs:**
  - `2026-11-13-gate-graphs.ts.txt` and `2026-11-13-gate-graphs.txt`;
  - `2026-11-13-gate-summary.ts.txt`;
  - `2026-11-13-gate-count-builds.sh.txt` and `2026-11-13-gate-build-counts.txt`;
- **G1's inputs:** `2026-11-13-gate-g1-injection.txt` and `2026-11-13-gate-g1-membership.txt`;
- **part A's inputs:** `2026-11-13-gate-part-a-witness-files.txt`.

## Notes for the architect

- **A missing entry file** fails with the plugin's own "could not resolve" error, not with Rolldown's `UNRESOLVED_IMPORT` code (§4). Both stop the gate, and the message names the specifier.
- **One fixture's non-entry import fails the whole size file,** not only its row. `size.node.test.ts` measures every row in one `beforeAll` (§4, G4). `measure.ts` stops at the row and names it.
- **`.scripts/vitest-config.ts` now imports from `packages/drag/tests/support/`,** with an `import-x/no-relative-packages` exception. The handoff places the shared rule there. The consumer project's plugin is therefore drag's own rule, applied with the root that the configuration gives.
- **A new consumer configuration starts a new dependency-optimizer cache.** That cache can reload the page during its first run (§2). The final suite, run on the warm cache, didn't.
- **`npx just test-engines` needs `~/.cache/ms-playwright/webkit-env.sh`** in this container (§6). It isn't in the recipe.

## Next

The architect reads this report. §5's table is the published build's result, which `DRO-15` step 3 waits for. No verdict changed, so nothing goes to `DRO-4` from this unit. No property-mangling work was started.
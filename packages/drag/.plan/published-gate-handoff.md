# Published gate handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the commit that carries this handoff. Its `packages/drag/src`, `tests`, `bench`, `tsconfig.json` and `vitest.config.ts`, and `.scripts/vitest-config.ts`, are `87288b9d2`'s.

**Governing records:**

- `DRF-23` and `DRD-54` property 2, as amended on 2026-11-13, in [`00-index.md`](00-index.md): part A;
- `DRD-55` in [`00-index.md`](00-index.md), with required properties 1 to 7: part B. `DRO-15` step 2;
- [`consumer-tests-assessment.md`](consumer-tests-assessment.md) §2 and §4;
- `DRD-51` properties 1 and 3, as `DRD-55` amends them;
- [`performance-plan.md`](performance-plan.md) §3, on sequencing runs and waiting for them.

**Goal:** after this unit, two things hold:

- the consumer project decides by the file an import reaches, so no file under `src/` loads there except through a published entry's emitted file, whatever form the import takes;
- `tests/size.node.test.ts` and `node bench/size/measure.ts` gate the files that `tsdown` emits for publication, through the package's exports map. The ceilings are the same as now.

Part B's figures are the published build's results, which `DRO-15` step 3 waits for.

## Boundaries

**Change only:**

- **`.scripts/vitest-config.ts`:**
  - the consumer project's resolution (part A);
  - `@ydinjs/drag`'s node project's build setup, and one shared build for the two projects (part B).

  No other package's project changes.

- **`packages/drag/vitest.config.ts`,** if a project needs an argument there.
- **`packages/drag/tests/support/`:**
  - the build setup and the setup file that raises a failed build;
  - a module that states the resolution rule once, if both parts use it.
- **`packages/drag/bench/size/measure.ts`:** resolution, the graph fragments, the printed gzip-9 column and the header comment (part B).
- **`packages/drag/tests/size.node.test.ts`:** only the paths in the expected list for "draggable alone", read as emitted paths. The title, the matcher and the module set stay.
- **Records:** the report, and `measurements/` files.

**Do not change:**

- `src`, `tsdown.config.ts`, `package.json`, `files.json` and `tests/fixtures/`;
- any row's name, imports, `budget` or `control`, Rolldown's options, `minify: true`, the `__DEV__` define or the Brotli settings;
- `--prototype`'s behavior;
- `vitest.engines.config.ts`, the `shipped` list, the source-only list, drag2's files, `packages/box-quad`, and any browser test;
- any assertion, test title or test body, apart from the one list above.

**Do not run:**

- `compare.ts`, `--prove` or `--floors`;
- the page check, B3' or the in-page floors;
- any property-mangling probe. `src` doesn't change, so no timing reading is owed. The mangle is `DRO-15` step 3, and the deferred campaigns stay stopped (`DRD-51` property 3).

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`. Wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table** (`performance-plan.md` §3).

**Scratch edits.** Make each one in a copy you can restore, and confirm each restore with `cmp`. **A build that must fail** uses a configuration that throws while it loads. `tsdown` 0.23.2 ignores a `--config` path that doesn't exist and builds with `tsdown.config.ts` ([assessment](consumer-tests-assessment.md) §4).

## Item 1. The base

Before any change, record in the report that this command prints nothing:

```sh
git diff --stat 87288b9d2 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json packages/drag/vitest.config.ts .scripts/vitest-config.ts
```

Then, through the runner:

- **the Chromium suite once.** Record each project's files, tests and failures, and the wall time. Expected, as at `87288b9d2`:
  - 746 tests, of which 740 pass;
  - `consumer` has 22 files and 326 tests;
  - the six known size rows fail: "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete".
- **The base size figures,** read from `src` as the gate reads them now. For every row, record minified, gzip-9 and Brotli-11 bytes with [`size.ts.txt`](probes/size-pass/size.ts.txt) (`DRD-51` property 1). Its Brotli figures must equal `node bench/size/measure.ts` at the base, row by row. Save both outputs.

## Part A. The consumer guard (`DRF-23`)

### Item 2. The witness at the base

**Do this before you change the resolver.** Prepare one scratch consumer file per form below. Each one makes a runtime import of `src/kernel/callbacks.ts`, and a test that passes when the import loads. The forms:

| Form | Specifier |
| --- | --- |
| F1, relative | `../src/kernel/callbacks.ts` |
| F2, absolute filesystem path | `<checkout>/packages/drag/src/kernel/callbacks.ts` |
| F3, from the Vite root | `/src/kernel/callbacks.ts` |
| F4, `/@fs/` | `/@fs/<checkout>/packages/drag/src/kernel/callbacks.ts` |
| F5, `file:` URL | `file://<checkout>/packages/drag/src/kernel/callbacks.ts` |
| F6, a query | `../src/kernel/callbacks.ts?w`, and the F2 path with `?w` |

Add one more scratch file, E. It imports `draggable` from `../src/draggable.ts`, and again from the F2-form absolute path of `src/draggable.ts`. It asserts that the two are the same function.

Run the consumer project with these files at `87288b9d2`'s resolver, and save the output. Record for each form whether it loaded. **This is the discriminating half. F2 must load here, as the owner reproduced.** If F2 doesn't load, stop and return. A form that Vite itself can't resolve in either project is recorded as such and isn't required to discriminate.

### Item 3. The repair

**Required properties** (`DRD-54` property 2, as amended):

1. **The resolved file decides.** In the consumer project, every import that would reach a file under `packages/drag/src/` ends one of two ways:
   - when the file is the source of one of the thirteen published entries, the import reaches that entry's emitted file, as `@ydinjs/drag/<entry>.js` resolves through `package.json`'s exports map;
   - otherwise it is an error at resolution, and the error names the module.

   This holds whatever the specifier's form, including F1 to F6.

2. **No module whose file is under `src/` loads** in the consumer project.
3. **Nothing else changes:**
   - an import that reaches no file under `src/` resolves as before;
   - a type-only import is erased, as before;
   - the source projects are untouched.

### Item 4. The witness at the repair

Run the same scratch files against the repair, and save the output.

- Each of F1 to F6 must fail with an error that names `src/kernel/callbacks.ts`.
- E must pass, with both imports giving the emitted `draggable`.
- The consumer project's 22 committed files must pass, as at the base.

Remove the scratch files, and confirm with `git status` that none is left.

## Part B. The gate on the published build (`DRD-55`)

### Item 5. One build per run

**Required properties** (`DRD-55` property 1):

1. **The build is `just build`'s, unchanged:** `package-files.ts clean`, then `tsdown --config tsdown.config.ts`.
2. **Once per run.** In every configuration that has `@ydinjs/drag`'s consumer project or its node project, the build runs exactly once per Vitest run. It finishes before any file of either project starts. This holds with both projects selected, and with either one alone (`--project`). No file builds the tree.
3. **A failed build:**
   - fails `size.node.test.ts` and every consumer file with `tsdown`'s output;
   - leaves the `browser`, `shipped` and `declaration` projects' verdicts standing.

   The other node files may fail with it, as drag2's do.

4. **The report shows how many builds** each witness run made.

### Item 6. The gate

**Required properties** (`DRD-55` properties 2 to 7):

1. **Resolution.**
   - Each row imports the same entries and named exports as now.
   - An entry resolves as `@ydinjs/drag/<entry>.js` does for a consumer: through `package.json`'s exports map, to the emitted file.
   - A fixture's import of an entry's source file resolves the same way. An import of any other file under `src/` is an error that names it, decided by the resolved file as in part A.
   - `@ydinjs/box-quad` stays bundled from `packages/box-quad/src/index.ts`, as now.
   - `--prototype` measures the prototype as before.
2. **The graphs keep their meaning.**
   - Each row's module list at the build equals its list at the base, with each `src/<path>.ts` read as `<path>.js`. box-quad's module is unchanged.
   - Every `present` and `absent` fragment, and "draggable alone"'s expected list, selects the emitted counterparts of the modules it selected at the base.
   - The report gives the mapping of each fragment.
3. **Fixed:** every row, `budget` and `control`, and the bundling settings.
4. **Printed figures.** `measure.ts` prints minified, gzip-9 and Brotli-11 bytes per row. gzip-9 is level 9 with zlib's other defaults, as `size.ts.txt` states. Brotli-11 is gated, and gzip-9 is recorded only.
5. **Standalone.**
   - `npx just size` builds, then measures, as its recipe already does.
   - `measure.ts`'s header says that it measures the emitted tree in the package root.
   - A missing emitted file fails as an unresolved import.

**Expected:** the figures move by a few bytes from the base's. The exploration's emulated build read −7 to +16 B Brotli ([exploration](property-mangling-exploration.md) §3). **A row whose verdict changes is not a return condition.** It is the measured result. The report lists it, the ceiling stays, and the architect routes it to `DRO-4`.

### Item 7. The witnesses

Save each output under `measurements/`.

- **G1, the injection** (`DRD-23`, `DRD-55` property 6). After a successful build, and before the gate reads the tree, add one top-level statement to one emitted module and to nothing else. The statement has a side effect that minification keeps, such as assigning a string of at least 64 random characters to a `globalThis` property. Run it twice, each as its own run:
  - **G1a, in `kernel/drag.js`.** Every row whose graph contains it must read a higher Brotli figure, and "draggable alone" must report its control moved.
  - **G1b, in `shared/landing.js`.** At the base, `shared/landing` is in the graphs of "example: drop zone", "freeDrag + bounds + landing" and "complete", and is absent from the other seven. Those three rows must read a higher figure. The seven others, "draggable alone"'s control among them, must equal the uninjected build's to the byte.

  The report lists, for each row, whether its graph contains each module.

- **G2, the source isn't read.** Make G1a's edit in `src/kernel/drag.ts` only, after the build and before the gate reads. Every row's figure must equal the uninjected build's.
- **G3, a failed build.** Use a configuration that throws while it loads. The required result is item 5, property 3.
- **G4, a fixture's non-entry import.** Add a runtime import of `../../src/kernel/callbacks.ts` to a scratch copy of one fixture that a row imports. That row must fail with an error that names the module.
- **G5, one build.** Run with both projects, then `--project` each alone. Each run must show one build.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty. The base suite and the base size figures are recorded |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files under §Boundaries, the report and `measurements/` |
| Part A's witnesses | Item 2 at `87288b9d2`'s resolver, and item 4 at the repair |
| The source projects | `browser`, `shipped` and `declaration` run the same titles with the same verdicts as at the base |
| The node project | The same titles. Only size rows fail, and each verdict that differs from the base is listed |
| The consumer project | 22 files and 326 tests. All pass |
| The size figures | Every row at the base (`src`) and at the end (the build), as minified, gzip-9 and Brotli-11, with the difference. Two readings of the same build agree to the byte |
| G1 to G5 | As item 7 states |
| Three engines (`npx just test-engines`) | No failure: 1,071 passed and 18 skipped, as at `87288b9d2` |
| `tests/hot-path.browser.test.ts`, `shipped` project | Every test passes |
| The suite's wall time | Recorded at the base and at the last commit. Not gated |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck. `.scripts/vitest-config.ts` takes the repository-level commands that `handoff.md` lists, and `npx tsc -p tsconfig.json --noEmit` from the repository root. Files under `packages/drag` take `npx just` from there |
| Markdown | `handoff.md`'s Markdown checks |

## Commits

- **Part A is its own commit,** before part B, so the guard's repair can be read alone.
- **Part B** may take one or more commits.
- **The report** goes in its own commit.

## Report

Write `published-gate-report.md` beside this file. Save under `measurements/`, unedited:

- the runner's status and logs for the base suite, the final suite and the three-engine run;
- part A's two witness runs;
- G1 to G5;
- both size readings, base and end.

The report gives:

- each commit and what it carries;
- part A's table, with each form's result at the base and at the repair;
- part B's mapping of fragments;
- the per-row table: at the base, at the build, the difference, and the verdict at each;
- every check above;
- the wall time before and after.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- F2 doesn't load at `87288b9d2`'s resolver;
- an import that reaches a file under `src/` can't be decided by that file in the consumer project alone;
- a consumer test fails after part A. That means a committed test reaches `src` by a form that the old resolver let through, and the architect decides that test;
- the build can't run once per run for both projects without changing `tsdown.config.ts`, `package.json`, `files.json` or the engines configuration;
- a row's graph at the build differs from its graph at the base beyond the path mapping. That would mean the build changes what an import brings, which is `DRI-18`'s subject;
- two readings of one build disagree;
- a row, ceiling, control or bundling setting would have to change;
- a source project's titles or verdicts change;
- the change needs a file outside §Boundaries.

## After this unit

The architect reads the report.

- **The per-row table is the published build's result** that `DRO-15` step 3 waits for. The owner decides the mangle from it.
- Any verdict that changed goes to `DRO-4`, which keeps the re-base.
- Whether the consumer project also runs in three engines is decided with step 3 (`DRD-54`).
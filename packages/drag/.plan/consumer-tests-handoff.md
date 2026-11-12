# Consumer tests handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the commit that carries this handoff. Its `packages/drag/src`, `tests`, `bench` and `tsconfig.json`, and `.scripts/vitest-config.ts`, are `fe529df4c`'s.

**Governing records:**

- `DRD-54` in [`00-index.md`](00-index.md): the decision, and required properties 1 to 6;
- `DRO-15`, as the owner answered it on 2026-11-12: this is its step 1;
- [`property-mangling-exploration.md`](property-mangling-exploration.md) §4 and §5, the runtime check that this unit makes part of the suite;
- [`performance-plan.md`](performance-plan.md) §3, on sequencing runs and waiting for them.

**Goal:** after this unit, `npx vitest run -c vitest.config.ts` also runs the public browser tests against the files that `tsdown` emits for publication. A behavior that the build breaks and `src` keeps fails a test. The source projects run every test they run now.

## Boundaries

**Change only:**

- **`.scripts/vitest-config.ts`:** `@ydinjs/drag`'s `consumer` project, its build setup, and the list of source-only files beside `DRAG_SHIPPED_BROWSER_TESTS`. No other package's project changes.
- **`packages/drag/vitest.config.ts`,** if the project needs an argument there.
- **`packages/drag/tests/support/`:** the global setup that builds, and the setup file that raises a failed build.
- **`packages/drag/tests/*.browser.test.ts`:** only to move source-only tests out of files that the consumer project runs, into new source-only files (item 2).
- **Records:** the report, and `measurements/` files.

**Do not change:**

- `src`, `bench`, `tsdown.config.ts`, `package.json`, `files.json`, the size gate, any ceiling or control figure;
- `vitest.engines.config.ts`, the `shipped` list, and drag2's files. drag2's `DRAG2_NODE_BUILD` is the pattern to follow, not a file to edit;
- any assertion, test title or test body. A moved test keeps both.

**Do not run** `compare.ts`, `--prove`, `--floors`, the page check, B3' or the in-page floors. `src` doesn't change, so no size or timing reading is owed, and the deferred campaigns stay stopped (`DRD-51` property 3).

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`, and wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table** (`performance-plan.md` §3).

## Items

### 1. The base

Before any change, record in the report that this command prints nothing:

```sh
git diff --stat fe529df4c HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json .scripts/vitest-config.ts
```

Then run the Chromium suite once through the runner, and record each project's test count, its failures and the suite's wall time. The known failures are the six size rows in `tests/size.node.test.ts`: "draggable alone", "example: resize handle", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". At `0c13786ea` the suite ran 420 tests, of which 414 passed.

### 2. The source-only tests

Read every file of the Chromium `browser` project, except the `shipped` files, against `DRD-54` property 3. A test is source-only when it reads a development instrument or an internal member. These are known, from the exploration's control run and the imports at the base. **The list is a starting point, not a complete audit:**

| File | Test | What it reads |
| --- | --- | --- |
| `callback-list.browser.test.ts` | the whole file | `src/kernel/callbacks.ts`, which no entry publishes |
| `sortable.browser.test.ts` | the three `drag:DRD-50` tests that call `recordSettles`, and that helper | `STRIDE` and `TOP` from `src/sortable/rect-index.ts`, and the sink's `settle`, which no published type declares |
| `sortable.browser.test.ts` | `drag:DRD-52 development equivalence check` | the development check's report |
| `requests.browser.test.ts` | "should finish the step when a custom element reaction asks to press during activate" | the refusal count, in its `press` case only |
| `terminals.browser.test.ts` | "should refuse a nested press, and take the next real one" | the refusal count |
| `terminals.browser.test.ts` | "should refuse no trusted event during ordinary drags" | the refusal count. Against the build it reads 0 and passes without checking anything |

- **A file whose every test is source-only** goes into the list as it is.
- **A source-only test in a file of public tests** moves to a new source-only file, with its title and body unchanged, under a `describe` of the same title. Its helpers move with it, or into `tests/support/` when a file that stays also uses them. Name each new file for what its tests read.
- **An `it.each` may move one case.** The case list changes in both files, and the title template and body don't.
- **Each entry of the source-only list says why** in a comment: the instrument or the internal member that its tests read.
- **A type-only import isn't a reason.** It is erased before resolution.
- **The harness's check that no trusted event is refused** reads the refusal count, so in the consumer project it checks nothing. It stays as it is, and the source projects carry it (`DRD-54`).

The report lists every source-only test with its reason, and every moved test with its old and new file.

### 3. The consumer project

**Required properties** (`DRD-54` properties 1 to 3):

1. **The build is `just build`'s,** unchanged: `package-files.ts clean`, then `tsdown --config tsdown.config.ts`. It runs once per test run, before any consumer file starts. No test builds the tree or reads it during a build.
2. **A failed build fails each consumer file** with `tsdown`'s output, and the other projects' verdicts stand, as `DRAG2_NODE_BUILD` does for drag2.
3. **Resolution.** In the consumer project, an import of a published entry's source file, `src/<entry>.ts`, resolves as the specifier `@ydinjs/drag/<entry>.js` resolves for a consumer: through `package.json`'s exports map, to the emitted file. The thirteen entries are `exports.node.test.ts`'s `ENTRIES`. `@ydinjs/box-quad` resolves as it does in the source projects.
4. **Any other module under `src/` is an error at resolution** in the consumer project, and the error names the module.
5. **Selection.** The consumer project runs every file of the Chromium `browser` project except the `shipped` files and the source-only files.
6. **Where it runs.** The consumer project is in every configuration that has `@ydinjs/drag`'s Chromium `browser` project, and in no three-engine configuration.

**Expected:** every test that the consumer project selects passes. The exploration's control, an unmangled build, failed only tests that item 2 makes source-only.

**The witnesses.** Save each output under `measurements/`. Make each scratch edit in a copy you can restore, and confirm each restore with `cmp`.

- **W1, resolution.** Add a runtime import of `../src/kernel/callbacks.ts` to one consumer file. The consumer project must fail at resolution with an error that names that module.
- **W2, the build.** After the build and before the consumer files start, change the emitted tree only: rename the `zIndex` key of the landing keyframe in the emitted `shared/landing.js`. This is the break the exploration found. At least one `drag:DRI-13` test in `landing.browser.test.ts` must fail in the consumer project and pass in the source `browser` project in the same run.
- **W3, a failed build.** Make the build exit non-zero, for example with a configuration path that doesn't exist. Every consumer file must fail with `tsdown`'s output, and the source projects' verdicts must equal the base's.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files under §Boundaries, the report and `measurements/` |
| The source projects | Each runs the same test titles as at the base, the moved tests included. Only the six known size rows fail |
| The consumer project | Every selected test passes. The report gives its file and test counts |
| Selection | The consumer project's files are the `browser` project's files minus the `shipped` files and the source-only list |
| W1, W2, W3 | As item 3 states |
| Three engines (`npx just test-engines`) | No failure, and the same counts as at `0c13786ea`: 1,071 passed, 18 skipped |
| `tests/hot-path.browser.test.ts`, `shipped` project | Every test passes |
| The suite's wall time | Recorded at the base and at the last commit. Not gated |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck. `.scripts/vitest-config.ts` takes the repository-level commands that `handoff.md` lists, and `npx tsc -p tsconfig.json --noEmit` from the repository root. Files under `packages/drag` take `npx just` from there |
| Markdown | `handoff.md`'s Markdown checks |

## Report

Write `consumer-tests-report.md` beside this file. Save under `measurements/`, unedited: the runner's status and logs for the base and final suites and the three-engine run, and the outputs of W1, W2 and W3.

The report gives each commit and what it carries, item 2's lists, the project counts at the base and at the end, every check above, and the suite's wall time before and after.

## Return to the architect

Stop and return if:

- item 1 isn't empty;
- **a consumer test fails, and you can't show that it reads a development instrument or an internal member.** That is a difference between the build and `src`, which is what this unit exists to find, and the architect decides it;
- a test can run in the consumer project only with a changed title, body or assertion;
- the build can't run once before the consumer files without a change to `tsdown.config.ts`, `package.json` or `files.json`;
- a non-entry module under `src/` can't be made an error at resolution in the consumer project only;
- a source project's test titles or verdicts change, apart from the moves;
- the change needs a file outside §Boundaries.

## After this unit

The architect reads the report. `DRO-15` step 2, the size gate on the published build, is decided from it as a separate unit (`DRD-54`). The mangle waits for the published build's results, and `DRO-4` keeps the re-base.
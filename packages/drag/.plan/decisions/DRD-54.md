#### DRD-54 — A consumer project runs the public browser tests against the package's own build, and the source projects keep every test

**Status:** active, decided on 2026-11-12 by the architect on the owner's answer to `DRO-15`, which started its steps 1 and 2. Decides step 1, the `consumer` project. [`consumer-tests-handoff.md`](../consumer-tests-handoff.md) implements it. Step 2, the gate on the published build, is decided when step 1 reports. **Implemented at `5ea7bb7e6`** and accepted on 2026-11-13 ([assessment](../consumer-tests-assessment.md)). **Property 2 amended on 2026-11-13** for `DRF-23`: the resolved file decides, whatever the specifier form. [`published-gate-handoff.md`](../published-gate-handoff.md) part A implements the amendment. Step 2 is `DRD-55`. The amendment was implemented at `79b4c3132`. `DRD-56` property 8 keeps the consumer project in Chromium only

**A Chromium browser project, `consumer`, runs the browser tests that observe only the published surface against the files that `tsdown` emits for publication, resolved through the package's exports map. The build runs once per test run, before any of the project's files starts. The source projects keep every test. The tests of internal behavior and of development instruments run only there. The size gate stays on `src` until a separate unit moves it (`DRO-15` step 2).** [`consumer-tests-handoff.md`](../consumer-tests-handoff.md) implements it.

Decided on 2026-11-12 by the architect, on the owner's answer to `DRO-15`: start its first two steps, keep source tests for internal behavior and development instruments, and adopt the mangle only after the published build's results exist.

**Why:**

- **Nothing reads the published build now.** Every test and the size gate import `src`. The exploration found the `zIndex` break only when the suite ran against a built tree ([`property-mangling-exploration.md`](../property-mangling-exploration.md) §4). The build already differs from what the gate bundles by −7 to +16 B Brotli (§3), so the build and `src` can differ without any mangle.
- **The source projects keep every test.** They run with `__DEV__` true, so every browser test also exercises the development checks, such as the harness's check that no trusted event is refused (`drag:DRI-6`). A test that ran against the build only would lose them. The consumer project adds runs and removes none.
- **A test that reads a development instrument or an internal member can't run against the build.** The build folds `__DEV__` away, and a module that no entry exports isn't published. In the exploration's control, an unmangled build, five tests failed for those reasons alone. A test that reads the refusal count and expects 0 passes against the build without checking anything. For the same reason, the harness's check reads 0 there and checks nothing, and the source projects carry it.
- **Selection is by file.** The consumer project's file list then states exactly what it covers, and no test reads which build it runs against. Vitest 5.0.5's tag filter, `tagsFilter`, is an option of the run's `UserConfig`, not of a project's `InlineConfig`, so it can't select tests per project. A source-only test in a file of public tests moves to a file that the consumer project excludes, with its title and body unchanged.
- **The tests keep importing `src` paths.** The consumer project resolves each published entry's source path to the package's own specifier. Rewriting the imports to package specifiers would make `tsc` and the source run depend on a build.
- **Chromium only, for now.** The build is the same code in every engine, and the three-engine source run covers engine differences. Whether the consumer project also runs in three engines before a mangle ships is decided with `DRO-15` step 3.

**Required properties:**

1. **The build.** The consumer project reads what `just build` emits: `package-files.ts clean`, then `tsdown --config tsdown.config.ts`, unchanged. It runs once per test run, before any consumer file starts, and no test builds the tree or reads it during a build. A failed build fails each consumer file with `tsdown`'s output, and the other projects' verdicts stand, as `DRAG2_NODE_BUILD` does for drag2.
2. **Resolution.** In the consumer project, an import of one of the thirteen published entries' source files, `src/<entry>.ts`, resolves as the specifier `@ydinjs/drag/<entry>.js` resolves for a consumer: through `package.json`'s exports map, to the emitted file. `@ydinjs/box-quad` resolves as it does in the source projects. **Any other module under `src/` is an error at resolution** in that project, and the error names the module.
3. **Selection.** The consumer project runs every file of the Chromium `browser` project except the `shipped` files and the source-only files. The source-only files are one list beside `DRAG_SHIPPED_BROWSER_TESTS`, each with the reason. A test is source-only when it reads a development instrument, such as the refusal count or a development check's report, or an internal member: a module that no entry exports, or a member that no published type declares. A type-only import isn't a reason.
4. **The source projects keep every test.** Each source project runs the same test titles as before. A moved test keeps its title and body, under a `describe` of the same title.
5. **Witnesses.** A runtime import of a non-entry module in a consumer file fails the consumer project at resolution. A fault placed in the emitted tree after the build, and only there, fails at least one consumer test whose source run passes. A failed build fails every consumer file and leaves the source projects' verdicts standing.
6. **Unchanged:** `src`, `bench`, `tsdown.config.ts`, `package.json`, `files.json`, the size gate and every ceiling. The `shipped` project and its hot-path census stay on `src` with `__DEV__` false. No three-engine configuration takes the consumer project.

**Step 2, the gate on the published build,** is a separate unit, decided when this one reports. Known now:

- it is an instrument change under `DRD-23`, so an injection shows that the gate catches bytes added to the emitted tree;
- every ceiling and `draggable alone`'s control figure stay as they are. A row whose verdict changes only because the gate reads the build goes to the owner under `DRO-4`, not into a re-base;
- `size.node.test.ts`'s graph assertions and `measure.ts`'s `present` and `absent` lists name `src/` paths, and they need the emitted paths;
- whether `@ydinjs/box-quad` is bundled from its source, as now, or from its build is decided in that unit.

**What this doesn't decide:** the publish step and its mangle (`DRO-15` step 3), whether the `shipped` census moves to the build, and `DRO-4`'s re-base.

**Result, 2026-11-13:** implemented at `5ea7bb7e6`, reported at `87288b9d2` and accepted with one guard gap ([assessment](../consumer-tests-assessment.md)).

- The `consumer` project runs 22 files and 326 tests against the emitted tree, and all of them pass.
- The source projects keep their titles and verdicts.
- The source-only list has four files. One test beyond the handoff's list joined it: the sink receiver test reads `report` and `settle`, which only an unpublished installer type declares.
- The Chromium suite went from 58.2 s to 99.6 s.
- **The gap is `DRF-23`.** The resolver handles only relative specifiers, so an absolute path to a non-entry module loads its source.

**Amended 2026-11-13, property 2 (`DRF-23`): the file an import reaches decides, not the form of its specifier.**

- **The rule.** In the consumer project, every import that would reach a file under the package's `src/` ends one of two ways:
  - it reaches the emitted file of the published entry whose source that file is, as `@ydinjs/drag/<entry>.js` resolves;
  - or it is an error at resolution that names the module.
- **The forms it covers:**
  - a relative specifier;
  - an absolute filesystem path;
  - a path from the Vite root;
  - a `/@fs/` path;
  - a `file:` URL;
  - any of these with a query or hash suffix.
- **No module whose file is under `src/` loads in that project.**
- **Property 5's first witness tries every one of those forms.** It runs against the resolver before the repair, where at least the absolute path loads the source module, and against the repair, where every form fails. A witness that only the repaired resolver can pass is the discriminating one.
- **The size gate's resolution follows the same rule** (`DRD-55`).
- **What property 2 used to say:** "an import of one of the thirteen published entries' source files, `src/<entry>.ts`, resolves as the specifier `@ydinjs/drag/<entry>.js` resolves", and "any other module under `src/` is an error at resolution". The handoff's W1 tried only the relative form. [`published-gate-handoff.md`](../published-gate-handoff.md) part A implements this amendment.
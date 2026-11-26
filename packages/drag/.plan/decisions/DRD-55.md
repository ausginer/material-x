#### DRD-55 — The size gate measures the package's published build, through its exports map, with every ceiling unchanged

**Status:** active, decided on 2026-11-13 by the architect on the owner's direction after `DRD-54`'s unit reported. `DRO-15` step 2: the size gate reads the published build. Amends `DRD-51` properties 1 and 3. [`published-gate-handoff.md`](../published-gate-handoff.md) part B implements it. Every ceiling and the control figure stay, and a changed verdict goes to `DRO-4`. **Implemented** at `69c260685`, with `DRF-23` repaired at `79b4c3132`, and accepted on 2026-11-13 (§Disposition of the published gate report). No verdict changed

**`tests/size.node.test.ts` and `bench/size/measure.ts` bundle each row from the files that `just build` emits. Entries resolve through `package.json`'s exports map, and the fixtures' imports follow the consumer project's rule. One build per Vitest run serves both the consumer and the node project. `@ydinjs/box-quad` stays bundled from its source. Every row, ceiling and control figure stays. A verdict that changes only because the gate reads the build goes to the owner under `DRO-4`.** [`published-gate-handoff.md`](../published-gate-handoff.md) part B implements it. This is `DRO-15` step 2.

Decided on 2026-11-13 by the architect, on the owner's request to decide step 2 after `DRD-54`'s unit reported ([assessment](../consumer-tests-assessment.md)).

**Why:**

- **The gate should measure what a consumer installs.**
  - The emulated build differs from `src` by −7 to +16 B Brotli per row ([exploration](../property-mangling-exploration.md) §3).
  - A publish-time mangle would change only the build, so its gain can be gated only there.
  - The owner holds the mangle until the published build's results exist, and this unit's per-row figures are those results.
- **One build per run.** `outDir` is the package root, so the build rewrites the files that the consumer project reads. A second build during a run could rewrite them while a file reads them. One build, finished before either project starts, keeps both projects on the same tree ([assessment](../consumer-tests-assessment.md) §4).
- **The resolution rule is the consumer project's.**
  - A row exists to measure what importing a published entry brings.
  - A fixture that reached a non-entry module would measure code that a consumer can't import.
  - The rule decides by the resolved file, as `DRD-54` property 2 does since its amendment.
- **box-quad stays on its source:**
  - Drag's run doesn't build box-quad. Its emitted `index.js` is what box-quad's last build left, and nothing in drag's run makes it. Reading it would make drag's gate depend on an artifact that the run doesn't produce.
  - The ceilings were set with box-quad from its source. Keeping it there leaves drag's build as the only thing that changes, so every verdict change is attributable to drag's build.
  - box-quad's publication has no transform beyond erasing types: it is unbundled, with no define and no mangle.
  - **Revisit this** if box-quad's publication gains a transform that changes its code.
- **The graphs keep their meaning.** The build is unbundled, so each module under `src/` has exactly one emitted file. A graph assertion that names `src/<path>` names `<path>.js` instead, and selects the same modules. If a row's graph changed beyond that mapping, the build would be changing what an import brings, which is `DRI-18`'s subject. That is a return condition, not a re-mapping.
- **gzip-9 is printed by the gate itself.** `DRD-51` property 1 books minified, gzip-9 and Brotli-11 readings. Once the gate reads the build, `size.ts.txt`, which reads `src`, can no longer reproduce its figures. The gate printing gzip-9 keeps property 1 satisfiable without a second probe.
- **A changed verdict isn't re-based.** The ceilings and `draggable alone`'s control stay as they are. A row that turns red or green only because the gate reads the build is a measured fact for the owner's re-base (`DRO-4`, `DRD-51` property 3).

**Required properties:**

1. **The build.**
   - It is `just build`'s build, unchanged: `package-files.ts clean`, then `tsdown --config tsdown.config.ts`.
   - In every configuration with `@ydinjs/drag`'s consumer or node project, it runs exactly once per Vitest run. That holds with both projects, and with either one alone. It finishes before any file of either project starts. No file builds the tree.
   - **A failed build** fails the gate's file and every consumer file with `tsdown`'s output. The `browser`, `shipped` and `declaration` projects' verdicts stand.
2. **Resolution.**
   - Each row imports the same entries and named exports as before.
   - An entry resolves as `@ydinjs/drag/<entry>.js` does for a consumer, through the exports map, to the emitted file.
   - A fixture's import follows `DRD-54` property 2's rule, as amended.
   - `@ydinjs/box-quad` resolves to `packages/box-quad/src/index.ts`.
   - `--prototype` is unchanged.
3. **The graphs.** Each row's module list at the build equals its list from `src`, with each `src/<path>.ts` read as `<path>.js`, and box-quad's module unchanged. Every `present` and `absent` fragment, and "draggable alone"'s expected list, selects the emitted counterparts of what it selected before.
4. **Fixed:** every row's name and imports, every `budget` and `control`, Rolldown's options, `minify: true`, the `__DEV__` define and the Brotli settings.
5. **Figures.**
   - `measure.ts` prints minified, gzip-9 and Brotli-11 bytes per row. Brotli-11 is gated, and gzip-9 is recorded only.
   - Two readings of one build agree to the byte.
   - `npx just size` builds, then measures. `node bench/size/measure.ts` measures the tree in the package root and says so in its header.
6. **Injection (`DRD-23`).**
   - Bytes added to one emitted module after the build, and to nothing else, raise the Brotli figure of every row whose graph contains that module. They move "draggable alone"'s control when its graph contains the module, and leave every other row's figure unchanged.
   - The same bytes added only to that module's source file leave every figure unchanged.
   - A fixture's runtime import of a non-entry module fails its row with an error that names the module.
7. **Readings.** The unit reports every row at its base, read from `src`, and at its end, read from the build, as minified, gzip-9 and Brotli-11, with the difference and the verdict at each.

**What this amends:**

- **`DRD-51` property 1.** Once this decision lands, a size reading is booked from the gate on the published build, using `measure.ts`'s printed figures. A candidate's joint reading builds the candidate tree first. `size.ts.txt` reads `src`, so it ranks candidates and no longer books them.
- **`DRD-51` property 3.** "`measure.ts` itself" stays as it is, except for this decision's instrument change. Every ceiling and the control figure stay.

**What this doesn't decide:**

- the publish step and its mangle (`DRO-15` step 3);
- whether the consumer project runs in three engines (`DRD-54`);
- whether the `shipped` census moves to the build;
- `DRO-4`'s re-base.

**Result, 2026-11-13:** part A landed at `79b4c3132` and part B at `69c260685`. Both were reported at `2d9a2f482` and accepted (§Disposition of the published gate report).

- **Size.** The gate reads the emitted tree, and every row's graph equals its graph from `src` under the path mapping.
- **Readings.** The figures moved by −7 to +16 B Brotli against `src`: +4 B on "freeDrag", +16 B on "freeDrag + bounds + landing", −7 B on each `sortable` row, −1 B on "complete", and 0 on the five other rows.
- **No row's verdict changed,** so nothing goes to `DRO-4` from this unit. The six rows over their ceilings are the same six as before.
- **Witnesses.** Bytes added to an emitted module raise exactly the rows whose graphs contain it, and the same bytes in `src` change nothing.
- **One build per run** serves both projects, counted by tracing the processes the run started.
- **`DRF-23` is closed at `79b4c3132`.**
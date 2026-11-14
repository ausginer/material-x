# Unit layout probe

The candidate code and the probes for [`unit-layout-exploration.md`](../../unit-layout-exploration.md). They change no production code, build configuration or instrument, and nothing here is adopted.

**Base:** `packages/drag` at `cc9818a96` on `drag/mangle-remediation`. Tools: `tsdown` 0.23.7, `rolldown` 1.3.2, `rolldown-plugin-dts` 0.30.2, `typescript` 6.0.2, installed with `npm ci` in that worktree.

**How they ran.**

- **The scratch tree.** The base tree was extracted with `git archive` into a scratch directory outside the checkout: `packages/drag`, `packages/box-quad`, `packages/vite-custom-element-assets`, `.scripts`, `types.d.ts`, and the root `package.json`, `tsconfig.json` and `tsconfig.base.json`.
- **Dependencies.** The scratch `node_modules` linked each of the worktree's entries, apart from `@ydinjs`. There, `drag` linked the scratch package, `box-quad` and `vite-traits-plugin` linked the worktree's built packages, and `vite-custom-element-assets` linked a build made in the scratch tree. The browser configuration also needed `node_modules/.cache/css/css-private-props.json`, which was written as `{}`.
- **The clean.** The scratch tree was made a git repository, because the package's clean runs `git clean`. The scratch `files.json` added `chunks` to `clean.extras`.
- **The probes.** Each `*.ts.txt` was placed in the scratch `packages/drag/probe/` as `<name>.ts`, and `units.config.ts.txt` in `packages/drag/` as `units.config.ts`.
- **The builds.** `npx tsdown --config units.config.ts` built the candidate. `OUT=` sets the directory, and the default is the package root.
- **The consumer project and the gate.** Both ran with the scratch `tsdown.config.ts` replaced by the build under test: `npx vitest run -c vitest.config.ts --project consumer`, then `node bench/size/measure.ts`.
- **`package.json`.** It was restored from a copy after each build of the current or of `DRD-59`'s configuration, whose `exports` option rewrites it. The candidate leaves it unchanged.
- **Afterwards,** the scratch directory was removed.

| File | What it does |
| --- | --- |
| [`units.config.ts.txt`](units.config.ts.txt) | **The candidate:** the kernel, sortable and free-drag units, each one input and one chunk under `chunks/` with native `minify.mangleProps`. Also the facades, the kernel's externalization in the feature units, and the declaration configuration with its JavaScript removed. `NOMIN=1` builds the units without minification |
| [`units.ts.txt`](units.ts.txt) | A source module's unit, by its path. `INVALIDATION=local` gives `shared/invalidation.ts` to no unit, so each feature unit bundles it |
| [`layout.ts.txt`](layout.ts.txt) | Reads, with the type checker, each public entry's runtime exports and the unit that declares each, and the names one unit imports from another. Writes each unit's input and gives each facade's text. Run directly, it prints both |
| [`input-kernel.ts.txt`](input-kernel.ts.txt), [`input-sortable.ts.txt`](input-sortable.ts.txt), [`input-free-drag.ts.txt`](input-free-drag.ts.txt) | The three inputs that `layout.ts` wrote at the base |
| [`audit.ts.txt`](audit.ts.txt) | The boundary audit: each marker name in property position, bound to its declarations. Lists crossings, marker names in more than one unit, and object types with marker properties from more than one unit |
| [`boundary.ts.txt`](boundary.ts.txt) | Every value import and member access that crosses a unit, for any name, by the declaration it binds to |
| [`unitnames.ts.txt`](unitnames.ts.txt) | Each unit's mangle cache, through Rolldown's API with the candidate's inputs and options, and the marker names that more than one unit renames. `WRITE=1` writes each cache to `probe/cache-<unit>.json` |
| [`rows.ts.txt`](rows.ts.txt) | Each size row bundled as `measure.ts` bundles it, with the emitted modules' maps loaded. Lists the `src` modules whose code the row keeps, and checks the row's `absent` and `present` fragments against them |
| [`row.ts.txt`](row.ts.txt) | Prints one row's bundle, unminified, or minified with `MIN=1` |
| [`mapcheck.ts.txt`](mapcheck.ts.txt) | The [publication-build probe](../publication-build/mapcheck.ts.txt) with one added line: `ONLY=` restricts it to one emitted file. It ran on each chunk with `NAMES=probe/cache-<unit>.json` |
| [`reach.ts.txt`](reach.ts.txt) | The `.js` bytes each public entry loads through relative imports, as a consumer without a bundler loads them |
| [`inval.ts.txt`](inval.ts.txt) | The minified bytes of one copy of `shared/invalidation.ts` |

The [publication-build probes](../publication-build/README.md) `pcur.config.ts.txt`, `p4.config.ts.txt` (with `DTS='{"sourcemap":false}'`), `mangle-plugin.ts.txt`, `names.ts.txt`, `annot.ts.txt` and `dtscmp.ts.txt` built and compared the current build and `DRD-59`'s, unchanged.

**Scratch edits, each restored and checked with `git status` in the scratch repository:**

- **The unprefixed variant:** `sed 's/\b_schedule\b/schedule/g; s/\b_cancel\b/cancel/g'` on `src/shared/invalidation.ts`, `src/sortable/behavior.ts`, `src/sortable/operation.ts` and `src/free-drag/drop-targets.ts`.
- **The annotation probe:** `src/fault.ts`, `src/sortable/y.ts` and `src/free-drag/bounds.ts` were each prefixed with three legal comments, an import of `box` from `@ydinjs/box-quad`, two annotated calls of it, and an annotated function, as the readings list.
- **The `box-quad` probe:** `"sideEffects": false` was added to `packages/box-quad/package.json` for one run of the gate.

The readings are in [`2026-11-13-unit-layout-readings.txt`](../../measurements/2026-11-13-unit-layout-readings.txt).
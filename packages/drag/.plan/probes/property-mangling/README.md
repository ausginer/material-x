# Property mangling probe

The scripts for [`property-mangling-exploration.md`](../../property-mangling-exploration.md). They change no production code, build configuration or instrument. `bench/size/measure.ts` stays the gate with its ceilings unchanged.

**Base:** `b0287f1ae` on `drag/size`, whose `packages/drag/src` is `237d65d2f`'s. Each script was copied to a scratch `.ts` file and run from `packages/drag` with `node <script>.ts`. Each script's header gives its options.

| File | What it does |
| --- | --- |
| [`published.ts.txt`](published.ts.txt) | Walks every export of every entry in `package.json`'s exports map with the type checker, and writes the property names a consumer can reach. `--opaque AxisInstaller,DisplacementInstaller` stops at `DRD-39`'s unpublished installer types |
| [`inventory.ts.txt`](inventory.ts.txt) | Bundles all thirteen entries, minified, and counts each property name's occurrences and bytes. It classifies each name by TypeScript's lib files and a published set |
| [`ownership.ts.txt`](ownership.ts.txt) | Resolves every property-name use site in `src` with the type checker, and writes the names eligible for mangling by the rules in the exploration's §1. `--names` writes the eligible list |
| [`size-mangle.ts.txt`](size-mangle.ts.txt) | [`size.ts.txt`](../size-pass/size.ts.txt) with `--mangle <names.json>`, which bundles each row with `minify: { mangleProps }`, and `--minify-object`, which checks that `minify: {}` equals `minify: true` |
| [`publish.ts.txt`](publish.ts.txt) | Builds the entries as unbundled modules, mangles each module's properties with `rolldown/utils`' `minifySync` and one shared cache, then bundles every row from the plain and the mangled modules. `--all-entries` makes every `src` module an entry, so tests that import internals can load the tree |
| [`vitest.tree.config.ts.txt`](vitest.tree.config.ts.txt) | A test config that resolves every `src` import, and `@ydinjs/box-quad`, to a built tree. It was placed in `packages/drag` as a scratch file, run with `--project browser --project shipped`, and removed |

**The order of a run:** `published.ts` twice, with and without `--opaque`; `inventory.ts`; `ownership.ts` against each published set; then `size-mangle.ts` and `publish.ts` with each list of names. `zIndex` was then removed from both lists by hand, after the runtime check (the exploration's §2).

**The runtime check** ran each suite as one step of `node bench/campaign.ts run`, with the JSON reporter. The runner's status files are kept with the readings.

The readings are in [`2026-11-12-property-mangling-readings.txt`](../../measurements/2026-11-12-property-mangling-readings.txt), and the JSON in [`2026-11-12-property-mangling-json/`](../../measurements/2026-11-12-property-mangling-json/).
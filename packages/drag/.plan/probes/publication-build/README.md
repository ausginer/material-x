# Publication build probe

The scripts for [`publication-build-proposal.md`](../../publication-build-proposal.md). They change no production code, build configuration or instrument.

**Base:** `packages/drag` at `1719df16c` on `drag/size`, after `DRD-57`'s rename at `b50204f66`. Tools: `tsdown` 0.23.2, `rolldown` 1.2.15, `rolldown-plugin-dts` 0.29.0-beta.2.

**How they ran.** The base tree (`packages/drag`, `packages/box-quad`, `.scripts`, and the root `package.json`, `tsconfig.json` and `tsconfig.base.json`) was extracted with `git archive` into a scratch directory outside the checkout, with `node_modules` linked to the checkout's. Each `*.config.ts.txt` was placed in the scratch `packages/drag` as `<name>.config.ts` and run with `npx tsdown --config <name>.config.ts`. Each other `*.ts.txt` was placed in a scratch `packages/drag/probe/` and run with `node probe/<name>.ts`. `tsdown`'s `exports` option rewrites `package.json`, so each build was followed by restoring it from a copy. The scratch directory was removed afterwards.

| File | What it does |
| --- | --- |
| [`pcur.config.ts.txt`](pcur.config.ts.txt) | `tsdown.config.ts` at the base, writing to `out-cur`: the current publication |
| [`p1.config.ts.txt`](p1.config.ts.txt) | Rolldown's native `output.minify.mangleProps` on the unbundled build, with the committed map as `cache`. Rolldown rejects it |
| [`p2.config.ts.txt`](p2.config.ts.txt) | The current renamer (`build/rename-properties.ts`) followed by native `minify: true`. A spy plugin prints what `renderChunk` receives, which shows that native minification runs after `renderChunk` |
| [`p3.config.ts.txt`](p3.config.ts.txt) | The committed map applied to each chunk by Oxc's `mangleProps` (`rolldown/utils` `minifySync`), then native `minify: true`. `NOMANGLE=1` builds without the rename, `OUT=` changes the directory |
| [`names.ts.txt`](names.ts.txt) | The map computed by one in-memory Rolldown build of every runtime entry as a single chunk, with native `minify.mangleProps`. Run directly, it computes the map twice and compares it with the committed map |
| [`mangle-plugin.ts.txt`](mangle-plugin.ts.txt) | The candidate plugin: the kept-name check, then the rename of each JavaScript chunk through Oxc with the computed map |
| [`p4.config.ts.txt`](p4.config.ts.txt) | One configuration with the candidate plugin and native `minify: true`. `DTS=` sets the `dts` option, which the declaration-map probes used |
| [`p5.config.ts.txt`](p5.config.ts.txt) | **The candidate:** two configurations, JavaScript with maps and the plugin, and declarations only without maps |
| [`p6.config.ts.txt`](p6.config.ts.txt) | One module, `src/fault.ts`, built with variants of minification and the plugin, for the legal comment probe. `src/fault.ts` was prefixed with three legal comments in the scratch copy only, and restored |
| [`edge.ts.txt`](edge.ts.txt), [`edge2.ts.txt`](edge2.ts.txt) | Oxc `mangleProps` on small inputs: shorthand keys, destructuring, quoted keys, `in`, computed keys, plain strings, a `cache` target equal to a kept name, and the listing of a chunk's kept names |
| [`mapcheck.ts.txt`](mapcheck.ts.txt) | Classifies the mapping of every identifier, private name and property token in each emitted module by the `src` text it leads to. `NAMES=` selects the map that identifies renamed properties |
| [`named.ts.txt`](named.ts.txt) | Checks that each mapping that carries a `name` leads to `src` text that starts with it, after class member modifiers |
| [`shorthand.ts.txt`](shorthand.ts.txt) | Lists the object keys that the candidate writes as shorthand and whose key is an output name |
| [`tsconfig.ref.json.txt`](tsconfig.ref.json.txt), [`jsdoc2.ts.txt`](jsdoc2.ts.txt) | TypeScript's own declaration emit of `src` into `out-tsc`, as the reference, and a classification of each of its JSDoc blocks that a published `.d.ts` lacks: a module header, a block on a declaration that the published file doesn't declare, or a lost block |

**Correction during the run.** The first runs of `p4.config.ts` used a plugin that didn't skip declaration chunks. Oxc reprinted them, and every `.d.ts.map` came out with empty `mappings`. The plugin was corrected to return `null` for a `.d.ts` chunk, as the current renamer does. Every reading in the readings file is from the corrected plugin.

The readings are in [`2026-11-13-publication-build-readings.txt`](../../measurements/2026-11-13-publication-build-readings.txt).
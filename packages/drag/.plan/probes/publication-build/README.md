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
| [`p5.config.ts.txt`](p5.config.ts.txt) | **The first reading's candidate:** two configurations, JavaScript with maps and the plugin, and declarations only without maps. The amendment replaces it with `p4` and `DTS='{"sourcemap":false}'` (proposal §9) |
| [`p6.config.ts.txt`](p6.config.ts.txt) | One module, `src/fault.ts`, built with variants of minification and the plugin, for the legal comment probe. `src/fault.ts` was prefixed with three legal comments in the scratch copy only, and restored |
| [`edge.ts.txt`](edge.ts.txt), [`edge2.ts.txt`](edge2.ts.txt) | Oxc `mangleProps` on small inputs: shorthand keys, destructuring, quoted keys, `in`, computed keys, plain strings, a `cache` target equal to a kept name, and the listing of a chunk's kept names |
| [`mapcheck.ts.txt`](mapcheck.ts.txt) | Classifies the mapping of every identifier, private name and property token in each emitted module by the `src` text it leads to. `NAMES=` selects the map that identifies renamed properties |
| [`named.ts.txt`](named.ts.txt) | Checks that each mapping that carries a `name` leads to `src` text that starts with it, after class member modifiers |
| [`shorthand.ts.txt`](shorthand.ts.txt) | Lists the object keys that the candidate writes as shorthand and whose key is an output name |
| [`tsconfig.ref.json.txt`](tsconfig.ref.json.txt), [`jsdoc2.ts.txt`](jsdoc2.ts.txt) | TypeScript's own declaration emit of `src` into `out-tsc`, as the reference, and a classification of each of its JSDoc blocks that a published `.d.ts` lacks: a module header, a block on a declaration that the published file doesn't declare, or a lost block |

**Correction during the run.** The first runs of `p4.config.ts` used a plugin that didn't skip declaration chunks. Oxc reprinted them, and every `.d.ts.map` came out with empty `mappings`. The plugin was corrected to return `null` for a `.d.ts` chunk, as the current renamer does. Every reading in the readings file is from the corrected plugin.

The readings are in [`2026-11-13-publication-build-readings.txt`](../../measurements/2026-11-13-publication-build-readings.txt).

## Recheck after the dependency update

[`publication-build-proposal.md`](../../publication-build-proposal.md) §9. **Base:** `packages/drag` at `63bb1bea1`, after merging `drag/size` at `31bac1381`. Tools: `tsdown` 0.23.7, `rolldown` 1.3.2, `rolldown-plugin-dts` 0.30.2, installed with `npm ci` in the `drag/mangle-remediation` worktree. The scratch tree was made as above, with `node_modules` linked to that worktree's, after building `@ydinjs/vite-traits-plugin` and `@ydinjs/box-quad` there. `p1`, `p4`, `p5`, `p6`, `pcur`, `names.ts`, `mapcheck.ts` and `jsdoc2.ts` ran unchanged, apart from two scratch edits stated below.

| File | What it does |
| --- | --- |
| [`p7.config.ts.txt`](p7.config.ts.txt) | `p5`'s declaration configuration alone, which shows the files it writes at 1.3.2 |
| [`p8.config.ts.txt`](p8.config.ts.txt) | `p4` with `minify: false`: the rename plugin without minification, which has no annotation left |
| [`dtscmp.ts.txt`](dtscmp.ts.txt) | Compares the `.d.ts` files of two outputs, after removing a trailing `sourceMappingURL` line, and counts the references |
| [`annot.ts.txt`](annot.ts.txt) | Counts `@__PURE__`, `#__PURE__` and `@__NO_SIDE_EFFECTS__` annotations per module in two outputs |
| [`annot-edge.ts.txt`](annot-edge.ts.txt) | `minifySync` on a small module with three annotations: the rename pass, the rename pass then minification, and minification alone |

**Scratch edits.** `p1` was also run with `, cache: names` removed. For `p6`, `src/fault.ts` was prefixed with the three legal comments, an import of `box` from `@ydinjs/box-quad`, two annotated calls of it and an annotated function, as the readings file lists, and restored and compared with `cmp`. The scratch `probe/mangle-plugin.ts` read `legalComments: process.env.NOLEGAL ? 'none' : 'inline'`, so that one `p6` run could turn the option off.

The readings are in [`2026-11-13-publication-build-recheck-readings.txt`](../../measurements/2026-11-13-publication-build-recheck-readings.txt).
# Publication build handoff

**For:** one `implementer` unit on `drag/mangle-remediation`, from the commit that adds this handoff's amendment. That branch contains `drag/size` up to `31bac1381`, the dependency update, merged at `63bb1bea1`, with `DRD-57`'s rename at `b50204f66`. If the owner merges this branch into `drag/size` first, the unit runs there from the merge, and nothing below changes. The unit builds, tests and measures.

**Tools:** `tsdown` 0.23.7, `rolldown` 1.3.2 and `rolldown-plugin-dts` 0.30.2, as the lockfile installs them. `DRD-59`'s amendment was read with these versions. **If the branch is checked out in a linked worktree without installed dependencies,** run `npm ci` there, then build `@ydinjs/vite-traits-plugin` and `@ydinjs/box-quad` in it. `tsdown.config.ts` imports the first, and the declarations resolve the second's `.d.ts`.

**Governing records:**

- `DRD-59` in [`00-index.md`](00-index.md), properties 1 to 9, and its reasoning in [`publication-build-proposal.md`](publication-build-proposal.md);
- `DRD-56` properties 1 to 3, 8 and 9, and `DRD-57` properties 1 to 3 and 6: the marker and the selection, which don't change;
- `DRD-55` property 1: one build per Vitest run, through `just build`'s two commands;
- `DRD-51` properties 1 to 3: readings, and the stopped campaigns;
- CONTRIBUTING Part I, and Part II §7 and §11.

**Goal:** after this unit, `just build` publishes minified JavaScript modules with complete source maps and declaration modules without map references. Oxc renames the internal properties through a map that each build computes. The custom renamer, the reader, the generator and the committed map are gone. The publication test checks `DRD-59` property 7.

**Evidence to reuse:** the probe scripts in [`probes/publication-build/`](probes/publication-build/README.md). [`mangle-plugin.ts.txt`](probes/publication-build/mangle-plugin.ts.txt), [`names.ts.txt`](probes/publication-build/names.ts.txt) and [`p4.config.ts.txt`](probes/publication-build/p4.config.ts.txt) with `DTS='{"sourcemap":false}'` are the candidate the amendment measured. `p5.config.ts.txt` is the first reading's two configurations, which the amendment drops. The probe plugin has no annotation guard. They are probes, not production code. Write the production files to the repository's conventions (CONTRIBUTING Part I, the technical English guide), and keep the behavior that `DRD-59` states.

## Boundaries

**Change only:**

- `packages/drag/tsdown.config.ts`: the one configuration (`DRD-59` property 1);
- `packages/drag/build/`: add the map's computation and the rename plugin, in one or two modules. Remove `rename-properties.ts`, `property-names.ts`, `generate-property-names.ts` and `property-names.json`;
- `packages/drag/tests/publication.node.test.ts`: property 7's standing checks. Remove the name-set test and the old V3 and V4;
- records: the report, and `measurements/` files with the prefix `2026-11-<day>-publication-build-`.

**Do not change:**

- `src/`, `bench/`, every other test file, every Vitest configuration, `package.json`, `files.json`, `Justfile`, `tsconfig.json` and `.scripts/`. `.scripts/tsdown-library.ts` and its plugins are shared with other packages, and any change there is the owner's (proposal §7);
- the `RectIndex` unit's files ([`slot-array-handoff.md`](slot-array-handoff.md)). Don't implement `DRD-58`;
- any size row, ceiling or control figure;
- `.plan/reviews/` and the committed probes.

**Do not run** `compare.ts` scenarios, `--prove` or `--floors` without `--dry`, the page check, B3' or the in-page floors. Run any sequence of long processes through `node bench/campaign.ts run`, and wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table.**

## Item 1. The base

Before any change, from `packages/drag`:

1. **The suite**, all projects, through the runner. Record the titles and verdicts. The four size rows that fail at `1719df16c` fail here too ([`mangle-selection-report.md`](mangle-selection-report.md) §1).
2. **The gate:** `npx just size`. Record every row.
3. **Keep the base tree:** copy the published files to a scratch directory outside the checkout, with their hashes.

## Item 2. The build

1. **One configuration** in `tsdown.config.ts`, as `DRD-59` property 1 states: the current one, with `minify: true`, `dts: { sourcemap: false }`, and the rename plugin in place of `renameProperties`. Don't add a second configuration or `emitDtsOnly`. At 1.3.2, a declaration-only configuration publishes foreign declaration files (proposal §9, A2).
2. **The map** (property 3a), computed once in each build, before any chunk renders. It uses the same entries (`files.json`'s `runtime`), `define` and shared plugins as the configuration, with `@ydinjs/box-quad` external, and writes nothing to disk. Fail when the result isn't exactly one chunk.
3. **The rename plugin** (property 3b to 3d). It returns nothing for a `.d.ts` chunk, which the same build now renders. Its errors name the chunk or the module, and the names:
   - **a kept name equal to an output name:** say that the name is both a property that stays and the output name of a prefixed property;
   - **a prefixed name without an output name:** say that the build's map doesn't cover the name, and that the map's single-chunk build should have seen the module;
   - **an annotation comment in a module under `src`:** say that the rename pass would delete it, and that Oxc's `minifySync` can't keep it. The check reads comments, not string literals.
4. **`legalComments: 'inline'`** in the rename pass's codegen, with a comment saying that without it the pass deletes license comments.
5. **Remove** the four files in §Boundaries. Nothing else imports them.

Run `npx just build` and confirm property 2 to property 6 by reading the output: one line of code per module, plus its `sourceMappingURL` and any legal comment; `.js.map` beside each module that has one; no `.d.ts` reference.

## Item 3. The publication test

Rewrite `tests/publication.node.test.ts` to `DRD-59` property 7. It reads the run's one build, and every file that `package.json`'s `files` selects:

- **V1:** unchanged in what it checks. Its title and comments no longer name `DRD-56` property 7 and the committed map.
- **V2:** identifiers, string literals and template texts in every `.d.ts`.
- **V3:** the three parts of property 7's V3. The test gets the map by calling the build's own function, not by reading a file. `src` lines are split at CR LF, LF, CR, U+2028 and U+2029. A failure names the module, the generated position, the output name, the prefixed name and the `src` text it leads to.
- **V4:** no `sourceMappingURL` in a `.d.ts`, and no `.d.ts.map` under the package root's published directories.

Decode the maps with `@jridgewell/gen-mapping`, which the root declares and the current test already imports. Don't add a dependency.

## Item 4. Witnesses

Each witness edits a copy-backed file and is then restored. Confirm every restore with `cmp`, and keep the script.

| Witness | Edit | Required result |
| --- | --- | --- |
| W1, the kept-name check | In the build's map, give one key the output name `x`, a kept property name | **The build fails,** naming `x` and a chunk. The consumer and node files fail with the build's output, and the source projects pass |
| W2, the unmapped name | Remove one key from the build's map | **The build fails,** naming that key and a chunk |
| W3, `quoted: true` | `this.#session?.['_decide'](fault, 'fault')` in `Gesture._raise`. That is `publish-mangle-report.md` §7's M4 | **The build renames the string key.** V1 passes, and the consumer project passes. Under the old step, M4 failed 37 consumer tests |
| W4, V1 | `Reflect.get(this.#session!, '_decide')` in the same place, or another plain string holding a marker name | **V1 fails,** naming the module and the string |
| W5, V2 | `_probe?(): void;` in `DraggableController`, as M6 | **V2 fails,** naming `kernel/gesture.d.ts` and `_probe`. Repeat with `'_probe'?(): void;` |
| W6, V3 positions | The rename plugin returns the renamed code without its map | **V3 fails,** naming at least one renamed property. If V3 passes, stop and return |
| W7, V3 sources | Rolldown's `sourcemapExcludeSources: true` in the configuration, through `outputOptions` | **V3 fails** on `sourcesContent` |
| W8, V4 | `dts: { sourcemap: true }` | **V4 fails** on the `.d.ts` references and the `.d.ts.map` files. The amendment's probe wrote 22 of each |
| W9, legal comments | `/*! probe */` and `/** @license probe */` at the top of `src/fault.ts` | Both are in `fault.js` and the build passes. Then remove `legalComments: 'inline'` from the rename pass: both are gone. That is the proposal's N5 |
| W10, the annotation guard | At the top of `src/fault.ts`, `import { box } from '@ydinjs/box-quad';` and `export const probe = /* @__PURE__ */ box();`. Then, in place of the second line, `export const probe = '@__PURE__';` | **The build fails** on the first, naming `src/fault.ts`. **It passes** on the second, and V1 passes. Then disable the guard and build the first: `fault.js` has no annotation. That is the proposal's §9 A3 |

## Item 5. One-time checks

1. **Byte identity:** two builds of the end tree give identical files.
2. **Annotations:** each published `.js` holds at least as many `@__PURE__`, `#__PURE__` and `@__NO_SIDE_EFFECTS__` annotations as the same module of the base tree from item 1. Record the counts per module. The amendment read 9 in 6 modules, against 8 in the base tree, with no module fewer ([`annot.ts.txt`](probes/publication-build/annot.ts.txt)). Don't compare against a build with the rename plugin and `minify: false`: the rename pass deletes every annotation, so that build has none.
3. **Documentation comments:** run [`jsdoc2.ts.txt`](probes/publication-build/jsdoc2.ts.txt) against TypeScript's emit ([`tsconfig.ref.json.txt`](probes/publication-build/tsconfig.ref.json.txt)) and the published `.d.ts` files. Required: no block lost on a declaration that a published `.d.ts` declares. Check the classifier's "lost" entries by hand. The amendment read 123 kept and one "lost" entry, on the third `requestStep` overload of the internal class `Gesture` (proposal §9).
4. **Declarations:** each published `.d.ts` is byte-identical to the base tree's, and the published directories hold no `.d.ts` that the base tree lacks. At 1.3.2 the base tree already has no `sourceMappingURL` in a `.d.ts`.
5. **Engines:** the consumer project's files in Firefox and WebKit, once, through `vitest.engines.config.ts` or a scratch configuration that's removed afterwards. Not added to the suite.
6. **The map:** record its keys and values. Required: exactly the 53 prefixed names in `src`, the same as the base map's keys.

## Item 6. Readings

- **The suite**, all projects, through the runner. Every project passes, apart from the size rows whose verdicts the gate gives. The consumer project passes every test.
- **The gate:** `npx just size`, every row minified, gzip-9 and Brotli-11, at the base and at the end, with the difference and the verdict. Expected, from the proposal at 1.2.15: −9 to +9 B Brotli, and no verdict change. The gate wasn't run at 1.3.2, so this is an expectation, not a reading. A changed verdict goes to `DRO-4`, and budgets don't change.
- **Build time:** `tsdown`'s reported times at the base and at the end.
- **Published size:** the total bytes of the published `.js`, `.js.map` and `.d.ts` files at the base and at the end.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | The base suite, gate and tree recorded |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| Item 2 | The build passes, and the output reads as stated |
| Witnesses | Every row of item 4 |
| Item 5 | Every check as required |
| Item 6 | The suite, the gate, the times and the sizes |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, with `npx just` from `packages/drag` |
| Markdown | `handoff.md`'s Markdown checks |

## Commits

1. The build, the test and the removals, in one commit. The build fails without the test change and the test fails without the build change, so they can't be split.
2. The report and its measurements.

## Report

`packages/drag/.plan/publication-build-report.md`. It identifies the base and the commits, then gives:

- the files changed and removed, and the line counts of the new `build/` code;
- the map's keys and values (item 5.6);
- every witness with its result, and the restore check;
- every one-time check;
- the readings, as item 6 lists them;
- anything that the decision didn't anticipate.

## Return to the architect

Stop and return, without working around it, when:

- the lockfile installs other versions of `tsdown`, `rolldown` or `rolldown-plugin-dts` than §For names;
- Rolldown or `tsdown` doesn't accept the configuration that `DRD-59` property 1 requires, or the build writes a `.d.ts` reference, a `.d.ts.map`, or a `.d.ts` that the base tree lacks;
- the map's build gives more than one chunk, or its keys differ from the 53 prefixed names in `src`;
- W6 passes V3, or any other witness doesn't give its required result;
- a published `.d.ts` differs from the base other than item 5.4's lines, or the JSDoc check finds a lost block;
- a consumer test fails, in any engine;
- a size verdict changes, or a row moves by more than 20 B Brotli;
- property 7 can't be checked without a reader of our own, such as a walk of `src` for prefixed names.

## After this unit

The architect reads the report, closes the findings that `DRD-59` decides, and integrates the result into `DRD-56` to `DRD-59`'s status rows. The owner's proposals S1 to S4 stay open until the owner answers them.
#### DRD-59 — The publication is minified by `tsdown`, Oxc renames the internal properties through a map that each build computes, and the declarations have no maps

**Status:** withdrawn on 2026-11-13 by `DRD-60`, before implementation, apart from property 8. Was: active, decided on 2026-11-13 by the architect on the owner's requirements for the publication. Supersedes `DRD-56` properties 4 to 6 and property 7's V2 to V4, and `DRD-57` property 4, amends `DRD-58` property 8, and withdraws the remediation proposal at `be151f9ed`. Decides `DRF-24` to `DRF-37`. [`publication-build-handoff.md`](../publication-build-handoff.md) implements it. Budgets are unchanged. Not implemented. **Amended on 2026-11-13 after the dependency update at `31bac1381`:** one configuration, and the build refuses an annotation in `src`. **`DRF-39`:** two consumer tests fail on its build, before its unit starts. `DRO-16` weighs the three-unit layout against it. **Withdrawn on 2026-11-13 by `DRD-60`:** the owner deferred property mangling. Property 8, what is publishable, stays

**`tsdown.config.ts` keeps one configuration. It minifies with `tsdown`'s `minify: true`, writes source maps with `sourcesContent`, and writes `.d.ts` files with no maps and no map references. The internal properties that `DRD-56` and `DRD-57` select are renamed by Oxc's own `mangleProps`. One plugin applies it in each JavaScript module, through a map that a single-chunk build of the same entries computes, and refuses an annotation comment in `src` that its rename would delete. The custom renamer, its reader, its generator and the committed map go. The publication test checks the maps and the declarations. Budgets are unchanged.** [`publication-build-proposal.md`](../publication-build-proposal.md) is the reasoning and the probes, and [`publication-build-handoff.md`](../publication-build-handoff.md) implements it.

Decided on 2026-11-13 by the architect, on the owner's requirements for the publication:

- separate `.js` and `.d.ts` modules;
- JavaScript fully minified, including the approved internal-property mangling;
- declarations that keep every documentation comment;
- a `.js.map` for each module that embeds the complete source through `sourcesContent` and supports debugging the minified code;
- declaration maps optional, and no reference to a map that doesn't exist;
- native `tsdown`, Rolldown and Oxc options first, and a custom plugin only for a demonstrated requirement that native tooling can't meet;
- the annotations that downstream bundlers need, and the required license notices.

**The owner withdrew** the requirement to preserve the previous JavaScript text and identical source map segments.

**Why:**

- **The custom pipeline existed for the withdrawn requirement.** `DRD-56` properties 5 and 6 required the step to change nothing but the names, and every other token to keep its mapping. That is why the step rewrites characters with its own map, why it has its own reader, and why V4 compares positions. With the requirement gone, Oxc renames in its own AST pass and Rolldown composes the maps ([proposal](../publication-build-proposal.md) §4.1).
- **One plugin is necessary, and its reason is demonstrated.** Rolldown refuses `output.minify.mangleProps` when a build has more than one JavaScript chunk, even with a complete `cache`: at 1.2.15 (proposal §2, L1), and still at 1.3.2 (proposal §9). drag's publication is unbundled. Bundling per entry would duplicate the kernel and split identity across entries, such as `DragFault` and the module-level `admitted` set.
- **Oxc's rename, applied in each chunk, matches the custom renamer.** With the committed map as `cache`, the minified `.js` is byte-identical to the custom renamer followed by native minification, at 1.2.15. Its maps also name every renamed property access (proposal §2, N2).
- **The map comes from the tools.** A single-chunk Rolldown build of every entry with native `mangleProps` returns a map with the same 53 keys, and it is deterministic, at 1.2.15 and at 1.3.2. Oxc picks the output names against every property name in that one chunk. That is `DRD-56` property 4's "equal to no name that stays", met without a reader (proposal §2, N3).
- **Oxc doesn't protect a pinned name** from a kept name in the same chunk, and Oxc can list a chunk's kept names. So the build checks each chunk with Oxc's own listing (proposal §2, N4).
- **`quoted: true`** renames a string key in property position together with its property, and keeps plain strings, which V1 catches (proposal §2, N4, `DRF-28`).
- **The rename pass needs `legalComments: 'inline'`.** Native minification keeps legal comments, and Oxc's codegen drops them by default (proposal §2, N5, and §9 at 1.3.2).
- **The rename pass deletes annotation comments, and no option keeps them.** Native minification keeps a `@__PURE__`, `#__PURE__` or `@__NO_SIDE_EFFECTS__` that `src` writes. After the rename pass none is left, and `minifySync`'s codegen offers only `removeWhitespace`, `asciiOnly` and `legalComments`. The annotations in today's output are Rolldown's own, and the minifier writes them again: 8 in 6 modules in the current build without minification, 9 in the same 6 with it. `src` writes none. So the build refuses an annotation in `src` rather than delete it without a word (proposal §9, A3).
- **One configuration writes the declarations.** `rolldown-plugin-dts` 0.30.2 removes each `.d.ts` reference when declaration maps are off, so the JavaScript maps and the declaration maps are set apart in one build. Its 27 `.d.ts` files are byte-identical to the current build's. A second, declaration-only configuration would now publish 216 foreign declaration files and added side-effect imports (proposal §9, A1 and A2).
- **No declaration maps.** They would point at `src/*.ts`, which the package doesn't publish (proposal §2, N8).
- **The declarations already keep their documentation.** Every JSDoc block on a declaration that a published `.d.ts` declares is in it, against TypeScript's own emit: 115 of 115 at 1.2.15, and 123 of 123 at 1.3.2, where the published files also keep the 8 module headers (proposal §9). The rest are maintainer notes under the [documentation model](../../../../.agents/docs/documentation.md) §5 (proposal §2, N9).
- **Size:** the gate moves by −9 to +9 B Brotli per row, and no verdict changes, at 1.2.15 (proposal §6). Not measured at 1.3.2.

**Required properties:**

1. **One configuration.**
   - `tsdown.config.ts` keeps its entries, platform, format, target, `define`, `unbundle`, `exports` and shared plugin list.
   - It sets `minify: true`, `sourcemap: true`, `dts: { sourcemap: false }` and the rename plugin.
   - Declaration maps are off in that option, and not because `tsconfig.base.json` leaves out `declarationMap`.
   - `just build` stays the clean, then `tsdown --config tsdown.config.ts`, so `DRD-55` property 1 is unchanged.
2. **Minification** is `tsdown`'s `minify: true` with Rolldown's comment defaults. No custom code minifies. `keepNames` stays off: function and class `name` values aren't part of the contract.
3. **The internal properties.** `DRD-56` properties 1 to 3 and `DRD-57` properties 1 to 3 stay: the marker `^_[A-Za-z]`, the selection by declaration, and the names that keep their names.
   - **(a) The map.** Before any module renders, one in-memory Rolldown build bundles every runtime entry in `files.json` into one chunk, with the configuration's `define` and shared plugins, and `@ydinjs/box-quad` external. It applies native `minify.mangleProps` with `include: /^_[A-Za-z]/` and `quoted: true`, and its `mangleCache` is the map. The build fails when that build gives more than one chunk. The map is written nowhere.
   - **(b) The rename.** In `renderChunk`, for each JavaScript chunk, and for no `.d.ts` chunk, `rolldown/utils`' `minifySync` runs with compression and identifier mangling off, whitespace kept, `legalComments: 'inline'`, a source map, and `mangleProps` with the same `include`, `quoted: true` and the map as `cache`. The plugin returns the code and the map. Rolldown composes the map and then minifies.
   - **(c) The build fails,** naming the chunk and the names, when a chunk's kept property names include an output name, or when Oxc assigns a name that the map lacks. The kept names are those that Oxc lists with `include: /^/`, the marker as `exclude`, and `quoted: true`.
   - **(d) The build fails,** naming the module, when a comment in a module under `src` is a `@__PURE__`, `#__PURE__`, `@__NO_SIDE_EFFECTS__` or `#__NO_SIDE_EFFECTS__` annotation. The rename pass would delete it.
   - **No other custom build code** for the JavaScript: no reader, no map arithmetic, no committed map, no generator and no second configuration.
4. **Source maps.**
   - Each published `.js` with mappings has a `.js.map` beside it and a `sourceMappingURL` that names it. A module with no mappings, a single re-export, has neither.
   - Each map's `sourcesContent` holds the full text of each source, equal to the file under `src`.
   - Each renamed property in a published module leads to the `src` text of its prefixed name, after class member modifiers. A key that the output writes as shorthand may lead to its value instead.
   - Other mappings are the tools'.
5. **Declarations.**
   - Separate `.d.ts` modules, as now.
   - No `.d.ts` holds a `sourceMappingURL`, and no `.d.ts.map` is emitted.
   - Every JSDoc block on a declaration that a published `.d.ts` declares is kept.
   - No `.d.ts` holds a marker name in any form.
6. **Annotations and license notices.**
   - Each published module keeps every `@__PURE__`, `#__PURE__` and `@__NO_SIDE_EFFECTS__` annotation that Rolldown's output of it has without the rename and without minification, and the minifier may add more.
   - `src` writes no annotation, and property 3d keeps it that way.
   - Each legal comment in a source module (`/*!`, `//!`, `@license`, `@preserve`) is kept in its published module. `src` has none today.
   - `LICENSE` is in the package root, and npm packs it whatever `files` lists. `@ydinjs/box-quad` stays external, so the publication bundles no third-party code.
7. **The publication test**, on `DRD-55` property 1's one build:
   - **V1:** unchanged. No published `.js` holds a property name, string literal or template text that matches the marker.
   - **V2:** no published `.d.ts` holds an identifier, string literal or template text that matches the marker.
   - **V3:** property 4's map checks. The test takes the map from the build's own function. It splits `src` lines at CR LF, LF, CR, U+2028 and U+2029.
   - **V4:** property 5's map references.
   - **Removed:** the name-set test, the old V3 and the old V4. V5 stays a one-time check in the unit.
8. **What is publishable.**
   - `just build` alone guarantees properties 1, 2 and 3. Every marker name that Oxc finds in property position is renamed, every module uses the same map, and no output name is a kept name.
   - A tree is publishable only when a Vitest run's node and consumer projects read it and passed.
   - **No publication hook.** No path publishes the package, and `@ydinjs/drag` is `private` ([remediation assessment](../mangle-remediation-assessment.md) §2).
   - **Obligation:** the change that makes the package publishable, by removing `"private": true` or by adding a workflow or script that packs or publishes it, makes the packed tree one that those projects read and passed in the same job.
9. **Budgets.** Every ceiling and the control figure stay. The unit reports every row at its base and its end. A changed verdict goes to `DRO-4`. The consumer project stays Chromium only, and the unit runs its files in Firefox and WebKit once, as `DRD-56` property 8 did.

**What this replaces:**

- **`DRD-56` property 4,** the committed map and its generator, by property 3a.
- **`DRD-56` property 5,** a step that changes nothing but names, keeps every comment and leaves the `.d.ts` output byte-identical, by properties 2, 3b, 5 and 6.
- **`DRD-56` property 6,** the renamed positions and every other token's mapping, by property 4.
- **`DRD-56` property 7:**
  - V1 stays;
  - V2 is extended;
  - V3, V4 and the name-set test are replaced by property 3c and the new V3 and V4;
  - V5 becomes the unit's one-time check.
- **`DRD-56`'s rationale bullets** on the committed map and on the step's placement, as far as they argue for them. The step is still part of the `tsdown` build.
- **`DRD-57` property 4:** the regenerated map, and the rule that the rename and the map change in one commit.
- **The remediation proposal at `be151f9ed`** ([assessment](../mangle-remediation-assessment.md), [handoff](../mangle-remediation-handoff.md)), withdrawn before implementation. Its validation decision never received a number. Its §2 finding and its rule on what is publishable are kept, in property 8 (proposal §4.2).

**Corrections, from the review:**

- **`DRF-30`:** `DRD-56`'s rationale said that V1 finds computed keys and enumerations. V1 finds literal strings and templates only. A key computed at runtime is excluded by `DRD-56` property 1 and by property 2's reading of the use sites.
- **`DRF-31`:** `DRD-56`'s rationale listed a publish among the paths that build the publication. None exists. Property 8 states what is publishable.

**What this amends:** `DRD-58` property 8's first bullet. Once this decision's unit lands, the map doesn't exist, and the bullet reads "the publication test passes". `DRD-58`'s unit stays separate (proposal §8).

**Revisit** when Rolldown accepts `mangleProps` for a build with several chunks. Property 3's plugin and map build then give way to a `minify.mangleProps` option, and property 3d goes with them. Until then, property 3d goes when `minifySync` can keep annotation comments.

**Amended on 2026-11-13, before implementation, after the dependency update at `31bac1381`** ([proposal](../publication-build-proposal.md) §9, [readings](../measurements/2026-11-13-publication-build-recheck-readings.txt)). Observed with `tsdown` 0.23.7, `rolldown` 1.3.2 and `rolldown-plugin-dts` 0.30.2.

- **Property 1** is one configuration. **It used to say** "Two configurations, one `tsdown` run": a JavaScript configuration with `dts: false`, and a declaration configuration with `dts: { emitDtsOnly: true }`, `sourcemap: false`, no rename plugin and no `exports`.
- **Property 3:** (b) excludes the `.d.ts` chunks, which the same build now renders. (d) is new.
- **Property 4's last bullet** used to add "Some minified locals carry no `names` entry, as they don't without the rename (proposal §2, L3)". At 1.3.2, every minified identifier and private name carries its name.
- **Property 6's first bullet** used to compare against "its unminified build". With the rename plugin and minification off, that build has no annotation at all, so the comparison was empty.
- **Unchanged:** properties 2, 3a to 3c, 5, 7, 8 and 9. L1 holds, so the plugin and the map's build stay.
- **Not repeated after the update,** and carried as assumptions that the unit tests: N2's byte identity with the custom renamer, N4's edge cases, and the size readings. W1 to W3 and the gate test them.

**What this doesn't decide:**

- the owner's shared-tooling proposals S1 to S4 (proposal §7): the dangling declaration references in other packages, `classVarCleanupPlugin`, a CONTRIBUTING statement of the marker, and the upstream limitation;
- `DRD-57`'s report at `1719df16c`, whose rename is this decision's base;
- the type-directed transform, `DRO-4`'s re-base and the `shipped` census.

**Withdrawn on 2026-11-13 by `DRD-60`, before implementation.** The owner deferred property mangling. [`publication-build-handoff.md`](../publication-build-handoff.md) doesn't run, and nothing that this decision requires is built.
# Publication build proposal

**Read:** the owner's requirements of 2026-11-13 for `@ydinjs/drag`'s publication, the build at `1719df16c` on `drag/size` (`DRD-57`'s rename landed at `b50204f66`), `DRD-55` to `DRD-58`, `DRO-15`, the [publish mangle review](reviews/publish-mangle/publish-mangle-summary.md) and its findings `DRF-24` to `DRF-37`, and the remediation proposal at `be151f9ed` ([assessment](mangle-remediation-assessment.md), [handoff](mangle-remediation-handoff.md)). Written by the architect on 2026-11-13 on `drag/mangle-remediation`, after merging `drag/size` into it. **Decision:** `DRD-59` in [`00-index.md`](00-index.md). **Handoff:** [`publication-build-handoff.md`](publication-build-handoff.md). **Evidence:** [`probes/publication-build/`](probes/publication-build/README.md) and [`2026-11-13-publication-build-readings.txt`](measurements/2026-11-13-publication-build-readings.txt).

**Outcome:**

- **`tsdown.config.ts` becomes two native configurations.** The JavaScript configuration uses `minify: true` and `sourcemap: true`. The declaration configuration uses `dts: { emitDtsOnly: true }` and `sourcemap: false`. Every requirement except the property rename is met by tool options alone.
- **The property rename keeps one small plugin, because Rolldown 1.2.15 refuses `mangleProps` for a build with more than one chunk** (§2, L1). The plugin calls Oxc's own `mangleProps` in each chunk. It replaces 386 lines of `build/`, the committed map and its generator.
- **The map is computed in each build** by one in-memory, single-chunk Rolldown build with native `mangleProps`. Nothing is committed.
- **The publication test keeps V1 and a string-aware V2.** It replaces V3, V4 and the name-set test with checks on the source maps and the declarations, which follow from the owner's requirements.
- **The custom renamer and the remediation proposal are withdrawn.** They existed for a requirement that the owner has withdrawn: unchanged JavaScript text and identical source map segments. §4 says what happens to each part and each finding.
- **Size:** the gate's readings move by −9 to +9 B Brotli per row, and no verdict changes (§6).
- **Shared tooling:** four proposals for the owner, none applied (§7).

## 1. The requirements

**The owner's requirements, 2026-11-13:**

| Id | Requirement |
| --- | --- |
| R1 | Publish separate `.js` and `.d.ts` modules |
| R2 | JavaScript is fully minified, including the approved internal-property mangling |
| R3 | Declarations keep all documentation comments |
| R4 | Every `.js.map` embeds the complete original source through `sourcesContent`, and supports debugging the minified code |
| R5 | Declaration maps are optional. If they are omitted, declarations must not reference maps that don't exist |
| R6 | Native `tsdown`, Rolldown and Oxc options first. A custom plugin only for a demonstrated requirement that native tooling can't meet |
| R7 | Keep the annotations that downstream bundlers need, and the required license notices |

**Withdrawn by the owner:** preserving the previous JavaScript text, and identical source map segments. `DRD-56` properties 5 and 6 required both, and the custom renamer and its validation exist to meet them (§4).

**How R2's "approved" reads.** The approved set is the `_` marker of `DRD-56` property 1, with its selection by declaration (`DRD-56` property 2, `DRD-57`). Neither changes here.

**How R3 reads.** [Documentation model](../../../.agents/docs/documentation.md) §5 defines consumer documentation mechanically: "A JSDoc block attached to a declaration that appears in a published `.d.ts`". Internal module headers, and JSDoc on declarations that the declaration bundle leaves out, are maintainer notes. R3 is checked against that definition.

**How R4's "supports debugging" reads.** Each module has a valid map. The map names the module's sources, and their full text is in `sourcesContent`. A breakpoint or a stack frame in the minified code resolves to the source position that produced it. A renamed property resolves to its prefixed name. Restoring the original names of every minified local is the tools' quality, and is not required (§2, L3).

## 2. What the native tools do

**Probe base:** a scratch copy of `1719df16c`. The README lists the scripts and how they ran.

|  | Probe | Result |
| --- | --- | --- |
| **L1** | `output.minify.mangleProps` on drag's unbundled build, with the committed map as `cache` (`p1`) | **Refused:** "property mangling is currently supported only when a build generates one JavaScript chunk". A complete `cache` doesn't change that. **This is the demonstrated limitation that the plugin exists for** |
| N1 | Native `minify: true` after a `renderChunk` plugin (`p2`, with a spy) | `renderChunk` receives the unminified chunk, and minification runs after it. Rolldown composes the plugin's returned map with its own |
| N2 | Oxc `mangleProps` (`rolldown/utils` `minifySync`) in each chunk, with the committed map as `cache`, then native minify (`p3`) | **The `.js` output is byte-identical** to the current renamer followed by native minify (`p2`). The maps carry each renamed property's source name in `names` (189 of 189 accesses). The renamer's maps carry none |
| N3 | One in-memory Rolldown build of every runtime entry as a single chunk, with native `mangleProps` (`names.ts`) | Returns a map with the same 53 keys as the committed map. Two runs are identical, at about 20 ms each. Its values are 52 one-character names and one two-character name, avoiding every property name in the bundle |
| N4 | Oxc `mangleProps` edge cases (`edge.ts`, `edge2.ts`) | Shorthand keys and destructuring are expanded correctly. With `quoted: true`, a string key in property position (`'_size' in o`, `o['_size']`, a computed class key) is renamed with its property, and a plain string (`'_plain'`, `Reflect.get(o, '_refl')`) is kept. **A `cache` target that equals a kept property name in the chunk collides silently** (`_size → k` beside `o.k`). With `include: /^/` and the marker as `exclude`, Oxc lists every kept property name in a chunk, quoted ones included |
| N5 | Legal comments: `/*!`, `/** @license */` and `// @preserve` at the top of `src/fault.ts` (`p6`) | Native `minify: true` keeps all three. **The Oxc rename pass drops them** unless its codegen has `legalComments: 'inline'`, because Oxc's default is `none` when minifying. With it, all three survive |
| N6 | `@__PURE__` annotations | Kept by the rename pass and by native minify: 9 in 6 modules, where the unminified build has 8 in the same 6. The minifier adds one, on a module-level expression in `lift.js` |
| **L2** | `dts: true`, `dts: { sourcemap: false }` and `dts: { sourcemap: true }`, each with `sourcemap: true` | With declaration maps off, 22 of the 27 `.d.ts` files end with `//# sourceMappingURL=<name>.d.ts.map`, and no map exists. **No `dts` option removes the reference while the build's `sourcemap` is on.** `tsdown` runs the JavaScript and the declarations as one Rolldown build with one `sourcemap` option. `drag2`'s `D-111` reached the same diagnosis and strips the comment after the build |
| N7 | A second configuration with `dts: { emitDtsOnly: true }` and `sourcemap: false` (`p5`) | No `.d.ts` references a map. Apart from the removed line and its trailing newline, every `.d.ts` is identical to the current build's, and the file list is the same |
| N8 | `dts: { sourcemap: true }` | 22 mapped `.d.ts.map` files without `sourcesContent`. Their `sources` are `src/*.ts` files that `package.json`'s `files` doesn't publish |
| N9 | JSDoc against TypeScript's own declaration emit (`jsdoc2.ts`) | TypeScript's emit has 153 blocks in the modules that publish a `.d.ts`. In the current build and in the candidate, every block on a declaration that a published `.d.ts` declares is kept: 115. Of the 38 not kept, 8 are module headers above the imports, and 30 are on declarations that the declaration bundle leaves out, such as the internal `Gesture` class. The classifier counts one of the 30 as "lost": it is on an overload of `Gesture`, and only its name matched the published `DraggableController` |
| L3 | Map quality (`mapcheck.ts`, `named.ts`) | The candidate equals or improves on native minify without any rename (`p0`) in every class. Positions: every source has `sourcesContent` equal to its file (30 of 30). 189 of 189 renamed accesses lead to their prefixed name. 11 renamed class field keys lead to the member's start, as Rolldown maps a field without the rename too. 3 renamed object keys that minification turned into shorthand lead to the value. **Names:** 380 minified identifiers and 82 minified private names lead to the right source identifier but carry no `name`, the same as without the rename |
| L4 | Re-export-only modules | `free-drag/landing.js`, `lift/landing.js` and `sortable/landing.js` are one `export … from` statement. Rolldown emits no map and no `sourceMappingURL` for them, as it does today |
| N10 | Determinism | Two candidate builds are byte-identical, 90 files |

## 3. The design

### 3.1 The build

- **One `tsdown` run, two configurations** in `tsdown.config.ts`. They share the entries, platform, format, target, `define`, `unbundle` and the shared plugin list. `just build` stays the clean, then `tsdown --config tsdown.config.ts`, and `DRD-55` property 1's one build per Vitest run is that command, unchanged.
  - **JavaScript:** `minify: true`, `sourcemap: true`, `dts: false`, the rename plugin, and `exports`, so that one configuration owns `package.json`.
  - **Declarations:** `dts: { emitDtsOnly: true }`, `sourcemap: false`, no rename plugin, no `exports`.
- **Minification is `tsdown`'s `minify: true`:** Oxc's compression, identifier mangling and whitespace removal, with Rolldown's defaults for comments, so that legal and annotation comments stay. Function and class `name` values are not part of the contract, and `keepNames` stays off. No test, contract clause or published type depends on them.
- **Source maps are Rolldown's,** with `sourcesContent` included, which is the default (`sourcemapExcludeSources: false`).
- **No declaration maps.** They would name `src/*.ts`, which the package doesn't publish (N8), so a consumer's editor can't follow them. R5 allows omitting them, and the declaration configuration's `sourcemap: false` writes no reference (N7).

### 3.2 The necessary glue

Two pieces of custom code, about 50 lines together. Each exists for L1 only.

1. **The map, computed in each build** (N3). Before any chunk renders, one in-memory Rolldown build bundles every runtime entry from `files.json` into one chunk, with the JavaScript configuration's `define` and shared plugins, `@ydinjs/box-quad` external, and native `minify.mangleProps` with `include: /^_[A-Za-z]/` and `quoted: true`. Its `mangleCache` is the map.
   - **Why a build, and not a committed file:** Oxc sees every property name of the publication in that one chunk, so it picks output names that none of them uses. That is `DRD-56` property 4's "equal to no name that stays", met by the tool and not by `build/property-names.ts`'s reader.
   - **Why it is consistent across modules:** every chunk is renamed with this one map.
   - **Costs:** output names follow the code. A change to `src` can reassign names, which moves a size reading by a few bytes with no change to the code it measures. The committed map had the same effect at each regeneration, which `DRF-32` noted. The owner has withdrawn text stability.
2. **The rename, in each JavaScript chunk's `renderChunk`.** `minifySync` from `rolldown/utils` runs with `compress: false`, `mangle: false`, `codegen: { removeWhitespace: false, legalComments: 'inline' }`, `sourcemap: true`, and `mangleProps` with the same `include`, `quoted: true` and the map as `cache`. The plugin returns the code and the map, and Rolldown composes the map and then minifies (N1). Before the rename, the same call with `include: /^/` and the marker as `exclude` lists the chunk's kept property names (N4). **The build fails, naming the names:**
   - when a kept property name equals an output name. Oxc's `cache` would rename into it silently (N4). The map's own computation avoids this, and the check makes it hold for every chunk, whatever the two builds' graphs do;
   - when Oxc assigns a name that the map lacks. The map then doesn't cover this chunk, and the modules would disagree.

`legalComments: 'inline'` is required, not optional: without it the rename pass deletes every license comment (N5).

### 3.3 Machinery not taken

| Option | Why it isn't taken |
| --- | --- |
| Keep the committed map, applied by Oxc (`p3`) | Brings back the generator, the JSON file, the name-set test and the regenerate-in-one-commit rule (`DRF-32`) for no property the computed map lacks. The kept-name check would still be needed |
| Thread one growing `cache` through the chunks with no global map | A chunk's new name avoids only that chunk's property names and the names assigned so far, not the kept names of later chunks. The order of `renderChunk` calls isn't fixed, so the output wouldn't be either |
| A single bundle per entry, so that native `mangleProps` applies | Entries share the kernel. Bundling each entry separately duplicates it and breaks identity across entries, such as `DragFault` for `instanceof` and the module-level `admitted` set. Bundling all entries together still produces shared chunks, which L1 refuses |
| Full minification inside the plugin, with `minify: false` | One pass fewer, but the minifier's configuration would move into custom code, and chunks the plugin skips wouldn't be minified. R6 prefers `tsdown`'s option |
| A plugin or hook that strips the `.d.ts` reference (`drag2`'s `D-111`) | N7 does it with configuration |
| Shipping declaration maps | N8: they point at files that aren't published |
| A source map `names` entry for every minified local | L3: Oxc's choice. No option or plugin is proposed. R4's reading doesn't need it |

### 3.4 Revisit

**When Rolldown accepts `mangleProps` for a build with several chunks,** the JavaScript configuration takes `minify: { mangleProps: { include: /^_[A-Za-z]/, quoted: true } }`, and both pieces of glue go. The kept-name check goes too, if Rolldown then picks names against the whole build.

## 4. The custom renamer and the remediation proposal

### 4.1 What the custom pipeline was for

`DRD-56` properties 5 and 6 required the step to change nothing in a module but the names, and every other token to keep its exact mapping. That requirement is why the step is a character-level rewrite with its own map (`build/rename-properties.ts`), why it needed its own AST reader (`build/property-names.ts`), and why its validation compares positions. **With the requirement withdrawn, none of it is needed:** Oxc renames the properties in its own AST pass, and Rolldown composes the maps (N1, N2).

| Part at `1719df16c` | Lines | Becomes |
| --- | --- | --- |
| `build/rename-properties.ts` | 94 | Removed. The rename plugin of §3.2 replaces it |
| `build/property-names.ts` (the reader) | 111 | Removed. Oxc finds the names in property position, quoted ones included |
| `build/generate-property-names.ts` | 181 | Removed. §3.2 item 1 computes the map |
| `build/property-names.json` | 53 keys | Removed |
| `tests/publication.node.test.ts` | 307 | V1 is kept. V2 is extended to strings. V3, V4 and the name-set test are replaced by §5's checks |
| `@jridgewell/gen-mapping` in `build/` | — | No longer imported by the build. The test may use it to decode maps |

### 4.2 The remediation proposal at `be151f9ed`

It was written for the custom pipeline and is withdrawn before implementation. Its validation decision was never given a number, and nothing in it is integrated. **Kept from it:** its §2 finding that no path publishes the package, and its §3.4 rule on what is publishable (`DRD-59` property 8).

| Remediation item | Becomes |
| --- | --- |
| §3.1 the reference build, and V4 (a) to (c) | Withdrawn. With the requirement on segments withdrawn, there is nothing to compare against |
| §3.2 the step's and the test's line rule (`DRF-26`, `DRF-27`) | The step goes. The new map check reads `src` lines with every ECMAScript line terminator (`DRF-27`) |
| §3.3 names that stay include strings (`DRF-28`), V2 sees strings (`DRF-29`) | `DRF-28`: `quoted: true` and the kept-name check, both Oxc's. `DRF-29`: kept as written |
| §3.4 V1's rationale (`DRF-30`), publishability (`DRF-31`) | Kept, restated in `DRD-59` |
| §3.5 the build message and the CONTRIBUTING sentence (`DRF-32`) | The map workflow goes. The marker sentence is a proposal to the owner (§7, S3) |
| §3.6 comments keep source names (`DRF-34`) | Moot: a minified module has no comments but legal ones and annotations |
| §3.7 one definition of the rules and the reader (`DRF-35`, `DRF-36`), `DRF-37` | Moot: the generator, the reader and the name sequence go |
| §6.2 `DRD-55` clarification on a second build | Moot: the map's build is in memory and writes nothing |

### 4.3 The findings

| Finding | Disposition under `DRD-59` |
| --- | --- |
| `DRF-24`, `DRF-25` | Withdrawn with the requirement they test. V4 and the step are removed. §5's map checks test R4 |
| `DRF-26` | Moot: the step that counted lines goes |
| `DRF-27` | Carried: the map check reads `src` with every line terminator |
| `DRF-28` | Decided: `quoted: true`, and the kept-name check in the build |
| `DRF-29` | Decided: V2 rejects identifiers, string literals and template texts |
| `DRF-30` | Decided: the record states what V1 finds |
| `DRF-31` | Decided: `DRD-59` property 8 |
| `DRF-32` | The workflow goes. The marker's statement is the owner's proposal S3 |
| `DRF-33` | Moot for drag: no requirement depends on a token's exact mapping. The plugin's inertness is shared tooling (S2) |
| `DRF-34`, `DRF-35`, `DRF-36`, `DRF-37` | Moot |

## 5. Validation

**Standing, in `tests/publication.node.test.ts`,** reading `DRD-55` property 1's one build:

- **V1 (kept):** no published `.js` holds a property name, string literal or template text that matches `^_[A-Za-z]`. The build already renames every marker name in property position, quoted ones included. V1 catches a plain string, which property 1 forbids. It doesn't find a key computed at runtime. `DRD-56` property 1 forbids those, and property 2's reading of the use sites excludes them (`DRF-30`).
- **V2 (extended):** no published `.d.ts` holds an identifier, string literal or template text that matches the marker (`DRF-29`).
- **V3 (new), the maps:**
  - each `sourceMappingURL` in a `.js` names its sibling `.js.map`, which exists, and each emitted `.js.map` is named by its module;
  - each map decodes, its `sources` resolve to files under `src`, and `sourcesContent` equals each file's text;
  - **each renamed property leads to its prefixed name.** In each published `.js`, every non-computed property name in property position whose name is an output name of the build's map has a mapping at its first character. That mapping leads to `src` text that is the prefixed name, after class member modifiers. The one exception is a key that the output writes as shorthand: it may lead to its value. `src` lines are split at CR LF, LF, CR, U+2028 and U+2029 (`DRF-27`). The test gets the map from the build's own function. The build's kept-name check makes every such occurrence a renamed property.
- **V4 (new), the declarations:** no `.d.ts` holds a `sourceMappingURL`, and no `.d.ts.map` exists in the package.

**In the build:** the kept-name check and the unmapped-name check of §3.2.

**Once, in the unit:** two builds are byte-identical. The annotations and legal comments survive (N5, N6 as witnesses). The JSDoc classification against TypeScript's emit (N9). The consumer files in Firefox and WebKit, as `DRD-56` property 8 did for the rename. Minification transforms more than renaming did.

**Why the map check covers renamed properties, and nothing else.** The rename plugin is the only custom code that touches a map, so its tokens are the ones to check. A check on the mappings that carry a marker name alone would pass with no mappings at all, for example when the plugin returns no map. Checking every renamed occurrence doesn't. Candidate counts: 189 accesses, 30 method keys and 30 object keys lead to their names, 11 class field keys lead to the member's start, and 3 shorthand keys (`_animation`, `_count`, `_first`) lead to their values. A check over every token would test the tools rather than the package. "Every named mapping leads to its name" already fails on Rolldown's own output in 6 places: a namespace member and TypeScript casts (`named.ts`).

## 6. Costs

**Size, the gate on the published build, current → candidate** (readings file):

| Row | Minified | gzip-9 | Brotli-11 | Verdict |
| --- | --- | --- | --- | --- |
| draggable alone | 6490 → 6490 | 2377 → 2376 | 2161 → 2161 | over by 22 B, control moved by 137 B, both unchanged |
| draggable + lift | 11265 → 11265 | 4349 → 4351 | 3926 → 3924 | within |
| example: resize handle | 9147 → 9147 | 3616 → 3618 | 3267 → 3270 | within |
| example: drop zone | 12904 → 12904 | 5054 → 5054 | 4550 → 4548 | over, 119 → 117 B |
| example: canvas group | 9283 → 9283 | 3580 → 3584 | 3268 → 3275 | within |
| freeDrag | 14647 → 14647 | 5490 → 5491 | 4943 → 4944 | within |
| freeDrag + bounds + landing | 15756 → 15756 | 5977 → 5979 | 5380 → 5389 | over, 170 → 179 B |
| sortable + y | 19677 → 19675 | 7210 → 7202 | 6510 → 6508 | within |
| sortable + xy | 19350 → 19346 | 7108 → 7097 | 6400 → 6392 | within |
| complete | 21310 → 21308 | 7935 → 7932 | 7151 → 7142 | over, 86 → 77 B |

The gate bundles each row from the published files and minifies it again, so publishing minified files changes its readings only through the output names. The differences come from the computed map's assignment. **No verdict changes.** The published `.js` files total 28,943 B, where the current build's total 80,259 B.

**Build time:** the current build reported 355 ms. The two configurations reported 138 ms and 379 ms, and run concurrently. The map's build took about 20 ms.

**Readability:** published modules are minified. Debugging goes through the maps (R4). `DRO-15` listed harder-to-read modules as a cost of the rename. The owner's R2 accepts it for the whole module.

## 7. Shared tooling, proposed to the owner

None of these is applied. Each is the owner's to open.

- **S1, the dangling declaration map references.** Every package that publishes declarations with `sourcemap: true` writes them. Local builds show: `core` 27 of 27, `material-x` 27 of 27, `tproc` 15 of 15, `vite-custom-element-assets` 4 of 4, and `box-quad`, `vite-traits-plugin` and `size-limit-preset-rolldown` 1 of 1 each, all pointing at maps that don't exist. `drag2` strips them in a `build:done` hook (`D-111`). **Proposal:** the two-configuration form of §3.1, applied package by package or as a shared helper in `.scripts/`, after which `drag2`'s strip could go. Report L2 upstream to `rolldown-plugin-dts` as well.
- **S2, `classVarCleanupPlugin`.** It returns `null` in every package while `experimental.nativeMagicString` is off ([publish mangle assessment](publish-mangle-assessment.md) §8, `DRF-33`). With minification in drag, it changes nothing in drag either way. The owner's question from §8 stays open. This decision doesn't depend on its answer.
- **S3, the marker in `CONTRIBUTING.md`.** `DRF-32` found that the `_` convention is stated only in the record. With the map computed, the workflow part goes. **Proposed text,** for Part I §Naming and self-documentation:

  > In `@ydinjs/drag`, a property that only the package's own code reads or writes, and that isn't `#private`, takes a `_` prefix: `_` and then a letter. The publication build renames every such property. Don't name one through a string or a computed key, and don't declare one in a published type. A name that a published `.d.ts` declares, that the platform reads, writes or calls, or that is one character long keeps its name.

- **S4, the upstream limitation.** L1 is the reason for the glue. When Rolldown lifts it, §3.4 applies.

## 8. Boundaries

- **The `RectIndex` unit (`DRD-58`) stays separate.** Its [handoff](slot-array-handoff.md) doesn't change, apart from `DRD-58` property 8's first bullet: once `DRD-59`'s unit has landed, the map doesn't exist, so the bullet reads "the publication test passes". Its `.d.ts` clause compares two builds of the same pipeline either way. The two units touch no common file. Whichever lands second reports against the other's tree.
- **`DRD-57`'s report at `1719df16c` isn't read here.** `DRD-59` uses its rename, the 30 declarations in `src`, as the base. That rename's acceptance is a separate reading. If the reading rejects a declaration, the fix changes `src` only, and the computed map follows it.
- **No campaign runs.** The deferred campaigns of `DRD-51` property 3 stay stopped. The unit runs the suite, the gate, one three-engine run of the consumer files, and the probes' witnesses.
- `DRO-4`'s re-base, the `shipped` census and the type-directed transform are unchanged.
# Publish mangle: feature proof

**Lens:** `reviewer`, feature proof against `DRD-56` as corrected by [`publish-mangle-assessment.md`](../../publish-mangle-assessment.md) §3 and §4, and `DRD-55` property 1 for the shared build. **Brief:** that assessment's §9.

**Commit read:** `436b105c6` on `drag/size`, with HEAD verified. `src`, `build/`, `tests`, `tsdown.config.ts`, `package.json` and `.scripts` are unchanged from `31f92f5a9` (`git diff --stat 31f92f5a9 436b105c6` on those paths is empty). The tree's emitted publication equals a fresh build of HEAD made in scratch: 60 of 60 `.js` and `.d.ts` files are byte-identical, and the maps' `mappings` are equal.

**Method:** every probe ran on a copy in the reviewer's scratch directory, and nothing in the tree was built or edited. The publication test at HEAD was copied with its imports pointed at absolute paths and run under a small `describe`/`it`/`expect` stand-in, with no Vitest. It passes unchanged on the scratch build of HEAD. The probes used three kinds of input:

- copies of that publication with one edit, such as appended code, an edited `.d.ts`, or one mapping moved in a `.js.map`;
- rebuilds of the real tree with a changed map or a changed copy of the step;
- small synthetic modules built with drag's options (`platform: 'neutral'`, `esnext`, unbundled, source maps) and the real step.

Scripts, step diffs and synthetic sources are in [`proof-reviewer-probes/`](proof-reviewer-probes/). Their paths name the scratch directory.

## Scope

**Covered:**

- `build/rename-properties.ts`, `build/property-names.ts`, `build/generate-property-names.ts` and `build/property-names.json`, all read in full;
- `tsdown.config.ts`, and `constructLibraryTsdownPlugins()` in `.scripts/tsdown-library.ts`;
- `tests/publication.node.test.ts`, `tests/support/build-package.node.ts` and `tests/support/require-build.ts`, with the node and consumer project wiring in `.scripts/vitest-config.ts`;
- the five targets of §9, plus the guarantees that `just build` gives without the test;
- the use sites of all 29 names in `src`, and the emitted `.d.ts` files that a consumer can reach.

**Not covered:**

- the integrity and cleanup lenses;
- the type-directed transform, budgets and `DRO-4`, the `shipped` census, `classVarCleanupPlugin`, timing and campaigns;
- consumer or engine runs. No consumer test was run. The probes check the publication test and the emitted files only.

**Not rerun, accepted as the brief states:** size, V5, the dry checks, the rename check, and M1 to M7. Analogous mutations were run on scratch copies. No accepted claim is disputed.

**How the test shares the run's one build (`DRD-55` property 1).** It holds. The node project and the consumer project share one global setup, `build-package.node.ts`. That setup keeps one build promise on the process's global object, and `require-build.ts` raises a failed build in every file of both projects. The publication test reads the files and starts no build. The map that the test reads is the file that `tsdown.config.ts` imported for the same run.

**Composition with `constructLibraryTsdownPlugins()`.** The step is the last `renderChunk` plugin. `classVarCleanupPlugin` returns `null` because no `magicString` is passed, and `dropEmptyChunksPlugin` acts in `generateBundle`, after the step. A build without the step and the tree's build were compared module by module, with each mapping's column moved by the length change of the renamed names before it on its line. **0 of the mappings moved in any module.** That matches the report's step check.

## Results by target

### Target 1: each check fails on a publication that breaks its property

**Null result for each check's stated property.** Every requested form that breaks a check's stated property makes that check fail. Each row below is one mutation of a publication copy (`mut.sh`, `mutmap.sh`) or one synthetic build:

| Form | Mutation | Fails |
| --- | --- | --- |
| Optional chaining | `o?._config; o?.p?._enter?.()` appended to `kernel/gesture.js` | V1, naming both names |
| Destructuring pattern in a parameter | `function z1({ _config: c }, [{ _root: r }])` | V1 |
| Getter, setter, static getter | `class Z2 { get _config() … set _config(v) … static get _root() … }` | V1, three entries |
| Constructor parameter property, as emitted | `class Z3 { _config; constructor(_config) { this._config = _config } }` | V1. The binding `_config` isn't a property, and V1 rightly ignores it |
| Computed key with a constant string | `o['_config']`, `({ ['_root']: 1 })`, `class Z4 { ['_window'] = 1 }` | V1, as strings |
| `in` | `'_config' in globalThis` | V1, as a string |
| `.d.ts` getter, constructor parameter, destructuring parameter | appended to `draggable.d.ts` | V2 |
| Duplicate output name | `_enter` → `a`, rebuilt | V3 ("`_config and _enter share a`"), and V4 |
| Reserved output name | `_enter` → `in`, rebuilt | V3. The build passes, because `x.in` is legal |
| Prefixed output name | `_enter` → `_b`, rebuilt | V1 and V3 |
| Non-identifier output name | `_enter` → `1b`, rebuilt | **The build fails.** Rolldown parses the step's output (`[PARSE_ERROR] Invalid characters after number`) |
| Collision with a kept name, in each form | `synth8`: kept `public kpp` parameter property, `private get kget`, `static kstat()`, `accessor kacc`, `readonly kro2` on a shared line, `private kpriv` after a JSDoc, `o?.kopt`, and `{ kpat: p }` in a parameter. Each is the output name of one renamed field | V3, once for every form |
| Renamed position maps onto another name | one mapping in `free-drag/behavior.js.map` moved from `_root` to `readonly _config` | V4 |
| Output-name occurrence with no mapping | `globalThis.o` appended, where `o` is `_dx`'s output name | V4 ("`_dx: no mapping`"). This is a kept property that V3 skips, and V4 catches it under the wrong key |
| Step bugs | a copy of the step that advances `column` by the output length (`step-bug-column`), or that omits the renamed name's segment (`step-bug-noseg`) | V4: 24 entries and 119 entries |
| Name set, extra key | `synth7` with a key that `src`'s syntax doesn't hold | the name-set test (`extra`) |

**Correct publications in these forms pass.** In `synth1` and `synth2`, Rolldown 1.2.15 maps these members at the name itself:

- getters and setters, static members, async members, generators, auto-accessors and parameter properties;
- optional-chain accesses, and destructuring keys in parameters and defaults;
- object getters and object methods;
- members whose first modifier stays in the output (`static`, `async`, `get`).

It maps a member at its start when the member starts with a modifier that the output erases, such as `readonly`, `private`, `protected` or `public override`. That applies to methods too: `protected _ab()` maps to `protected _ab(): number`. `MODIFIERS` covers every erased modifier observed, so all five tests pass on both builds.

**The forms that escape are outside each check's stated property.** They are reviewer-5, reviewer-6 and reviewer-7. One form fails closed. The name-set reader doesn't visit `TSParameterProperty`, so in `synth7` a member that `src` writes only as a constructor parameter property, `private readonly _w`, needs a map key for the build, and with that key the name-set test reports `extra: ["_w"]`. Property 1 forbids a prefixed parameter, so this isn't a finding.

### Target 2: the V4 exception's bound

**Refuted as stated, and confirmed in kind.** reviewer-1 has the details.

- **What holds.** The text bound holds. The mapped text must be modifiers and whitespace, then the same key. A different name fails (`t2d`). A decorator or comment before the name can't match `^${MODIFIERS}name`.
- **What doesn't hold.** The test applies the exception to every occurrence, so it accepts an access whose mapping lands on its declaration's member start (`t2a`). Property 6 rejects that, because the exception is for the declaring member's own token. The first-written form rejected it too, because `"readonly _root"` doesn't start with `_root`. So the test as written is weaker than the first form on this case, and §3's sentence "That doesn't make it weaker than V4 as first written" is incorrect as stated.
- **Why it is the same in kind.** The test isn't position-exact in either form. An access mapped to another access of the same name (`t2b`) passes both forms. So does a declaration mapped into another member's statement (`t2c`). Property 6 rejects both: "not … a position in another member".

### Target 3: V3's source-map inference against the generator's comparison

**For property-name forms, no difference was found.** In the publication at HEAD, the build has 212 kept property names with 1,038 occurrences, and every occurrence maps to `src` text that starts with modifiers and that name (`kept.ts`). A collision with any kept name would fail V3, as M3 and `synth8` show. No probed form maps a kept token onto another name's text. A kept occurrence without a mapping fails V4, under the wrong key.

**A property that stays can pass V3 and V4: one that is written as a string.** reviewer-5 has the details. A kept field written as `'k' = 2`, read as `this['k']`, beside `_size` renamed to `k`, passes all five tests. The function's result goes from 12 to 22. The generator has the same blind spot, because it uses the same reader. So the gap doesn't come from inferring from source maps. The publication at HEAD has no quoted key, computed string key or `in` with a string (`strkeys.ts`: none), so nothing is affected today.

**One theoretical difference remains.** V3 relies on Rolldown mapping each kept token at its own name. A map that pointed a kept token at a prefixed name's text would pass V3 and V4. The generator doesn't depend on maps. No such mapping was produced.

### Target 4: the step's map with characters outside the BMP, and at line boundaries

**Characters outside the BMP: null result.**

- Called directly on crafted code, the step's map is exact for every segment (`direct.ts`: 41 of 41), with astral characters before and between renamed names in strings and comments.
- Through Rolldown, with astral characters in a template literal, strings and comments (`synth5-astral-only`), 0 of 40 mappings move, and the test passes.
- Columns count UTF-16 code units, which is the unit that source maps use. A segment in the middle of a surrogate pair is harmless.

**Start and end of a line: null result.**

- Called directly, the step maps a renamed name at column 0, before a newline, and at the end of the file without a newline exactly (`direct.ts`, 0 wrong).
- Rolldown's code generator indents, so no property name in the publication is at column 0. 26 renamed names are the first token on their line, and 8 are the last before a newline. All of their mappings are kept (0 moved).

**Line separators: a defect.** These characters are LS (U+2028), PS (U+2029) and a lone CR.

- The step counts generated lines at LF only, and Rolldown counts LS as a generated line break. A raw LS that stays in an emitted module, which happens in a template literal, moves every later mapping in that module. That is reviewer-3.
- The test counts lines at LF only in both the generated module and the `src` text, and Rolldown's original lines count CR, LS and PS. That is reviewer-4.
- `src` contains no CR, LS or PS, and the publication contains no non-ASCII character, so nothing is affected today.

### Target 5: whether a consumer can reach any of the 37 declarations

**Null result.**

- **Published types.** No emitted `.d.ts` holds a prefixed identifier (V2), and no quoted `_` key or `_` string-literal type either (`grep`: none). `DraggableController`, `FreeDragController`, `SortableController` and `Drag` declare only unprefixed members. `free-drag/operation.d.ts` and `sortable/operation.d.ts` declare nothing, and neither operation type is the `Operation` argument of a published controller. The admission `state` that carries `_direction` goes to the behavior's own `activate`. `Drag` doesn't expose it, and `Session` keeps it in `#state`.
- **`DRD-39`'s installer types.** `AxisInstaller`, `DisplacementInstaller` and `BoundsInstaller` are declared in emitted `.d.ts` files, so a consumer can write one structurally. Their products are `InsertionGeometry`, `DisplacementSink` and `MotionConstraint`, and their contexts are `AxisContext` and `AxisQuery`. All of them declare unprefixed members only. Every call that the package makes on an installer's product uses those declared members. `_refresh`, `_lend`, `_holds` and the `RectIndex` members are called only on `linearShift()` and `RectIndex` objects that `y()` and `xy()` create internally, and the `RowAnimation` fields belong to the sink's own map.
- **The platform.** Every receiver of a prefixed name in `src` is internal: `this`, `index`, `shift`, `state`, `previous`, `held`, `frame`, `operation`, `#behavior`, `#gesture`, `#session`, `#steps`, `disposers` and `controller`. None is a platform object. The platform calls `handleEvent` on the session and the operations, and `fire` from `requestAnimationFrame`, and neither is prefixed. `src` has no `Object.keys`, `entries`, `assign`, `JSON`, `structuredClone`, `postMessage`, `CustomEvent`, `for…in`, `in` or object spread. Its three spreads copy an array of elements and, twice, a `{ handle }` object into an admission.
- **Consumer callbacks.** Each consumer callback is called on the consumer's own `config` (`this._config.onStart?.(…)`), never on an internal object.

## What a plain `just build` guarantees, and what only the publication test does

`just build` is the clean, then `tsdown` with the step. A publish runs no build at all. `package.json` has no `prepack` or `prepublishOnly` script, and no workflow publishes. So `npm pack` or `npm publish` ships whatever tree the last build left, and checks nothing.

| Property | Plain `just build` | Only when the publication test runs |
| --- | --- | --- |
| Every non-computed prefixed property name in an emitted `.js` has a map key | **Guaranteed.** The build fails and names the property (M1) |  |
| No prefixed shorthand key | **Guaranteed.** The build fails |  |
| Every such name is replaced by its map value | **Guaranteed, by construction** |  |
| V1, property names | Holds only if the map's values are unprefixed, and the build doesn't check that (`_enter` → `_b` builds) | V1 and V3 |
| V1, string literals and template texts | Not checked. M4's `?.['_decide']` builds | V1 |
| V2, `.d.ts` | Not checked. The step leaves `.d.ts` chunks alone by construction, and nothing reads them | V2 |
| V3: distinct, unprefixed, unreserved and not a kept name | Not checked. A duplicate or a collision (M3, `_config` → `x`) builds and ships. **One exception:** a value that can't be parsed in a declaration position fails Rolldown's parse of the output | V3 |
| V4 and the map's `src` positions | Not checked | V4 |
| Name set: no extra key, and every prefixed name in `src` keyed even if folded away | Not checked. A stale key (M7) builds | The name-set test |
| Property 6 bullets 1 and 3: every map valid, and every other token unmoved | Not checked | **Not checked by the test either** (reviewer-2) |
| `.d.ts` byte identity, and reproducibility (V5) | By construction for `.d.ts`. V5 isn't checked | Neither. V5 is a one-time check |
| Consumer project on the renamed build | Not checked | The consumer project, in the same run |

**In short,** a plain build guarantees only that no prefixed non-computed property name survives unrenamed and no prefixed shorthand key exists. Every other part of V1 to V4 and the name set holds only for a tree that a test run in that same run read and passed. That is reviewer-8.

## Findings

All eight findings are tier B. No finding is tier A: no consumer-observable change exists at HEAD. reviewer-3 to reviewer-6 are latent: no instance exists in the current `src` or publication.

### reviewer-1: V4 accepts any `src` position whose text names the key

**Tier:** B. **Claim:** V4 checks the name written at the mapped position, not the position that property 6 requires. Applying the exception to every occurrence widens what it accepts beyond the first form, so §3's "not weaker" is wrong as stated.

- **Current behavior.** `writes(mapped.text, key)` accepts any mapping whose `src` text is `MODIFIERS`, then the key, then a non-identifier character. The same check applies to declarations and accesses.
- **Why it's a problem.**
  - `DRD-56` property 6 says that a renamed position maps to the position where the name is written. The exception covers only "the renamed name is a class member … the start of the member that declares it", and "No other form passes: not … a position in another member". V4 in property 7 refers to property 6.
  - The assessment's §3 states that applying the exception to every occurrence doesn't make the test weaker than V4 as first written, and §1 summarizes the test as passing "only if its mapped `src` text is the prefixed key, or modifiers and then the key".
  - Both describe the text test, not property 6's position test.
- **Evidence**, `mutsrcmap.sh` on copies of the publication:
  - **`t2a`:** `free-drag/behavior.js` 41:37 (`this.e`, an access) is moved to `src/free-drag/behavior.ts` 63:3 (`readonly _root`). All five tests pass. The first form would reject it.
  - **`t2b`:** the same access is moved to 101:18, another access of `_root`. All pass.
  - **`t2c`:** the declaration at 20:2 is moved to 74:10, `_config = config` in the constructor. All pass.
  - **`t2d`:** the access is moved to 64:3 (`readonly _config`). V4 fails.
- **Required property.** The check that `DRD-56` property 7 calls V4 rejects whatever property 6 rejects, or the record states the bound that V4 actually enforces. The architect decides which, because it touches the wording of a decision.

### reviewer-2: Property 6's kept-token mappings have no standing check

**Tier:** B. **Claim:** a step regression that moves the mappings of kept tokens passes the build and the publication test.

- **Current behavior.** V4 inspects only occurrences of output names. Property 6 bullet 1, that every map is valid, and bullet 3, that every other token keeps its `src` position, were established once, by the report's step check, and nothing checks them in the suite.
- **Why it's a problem.** The assessment's §9 calls the publication test "the only thing that guards the publication". A future change to the step can break most published mappings without failing anything.
- **Evidence.**
  - `step-bug-sparse.diff.txt` keeps the renamed names' segments and adds a kept segment only at column 0. It moves 3,737 of 6,902 mappings, compared with the correct step's build (`cmpmaps.ts`). All five tests pass.
  - `step-bug-kept-off1` moves 150 mappings, and all five tests pass.
- **Required property.** `DRD-56` property 6 bullets 1 and 3 hold for every build the suite accepts, or the record states that they were a one-time acceptance. Whether a standing check is owed is the architect's call.

### reviewer-3: The step's map breaks after a raw line separator in emitted code

**Tier:** B, latent. **Claim:** the step counts generated lines at LF only. Rolldown treats a raw U+2028 in the emitted module as a line break, so every mapping after it in that module moves.

- **Current behavior.** In `rename-properties.ts`, only `code[i] === '\n'` starts a new line in the returned map. Rolldown keeps a raw LS inside a template literal. It escapes LS in a string literal and rewrites LS, PS and CR in a comment as LF.
- **Why it's a problem.** Property 6 says every token keeps its `src` position. When renamed names follow the separator, the failure is loud, because V4 fails. When they don't, it is silent, and only property 6 bullet 3 is broken (reviewer-2).
- **Evidence.**
  - **`synth6`:** ``String(o._alpha) + `x<U+2028>y${k.keep}` + k.other``, and a function after it. 7 of 25 mappings move against the build without the step (`cmpdelta.ts`), and all five tests pass.
  - **`synth5-ls-template`:** renamed names after the LS. 18 of 40 move, and V4 fails with "no mapping".
  - **Control:** the same sources with a space for the LS (`synth5-astral-only`), or with LS or CR only in strings or comments, move 0.
  - **Today:** `src` contains no LS, PS or CR, and the publication contains no non-ASCII character.
- **Required property.** The step's map keeps every token's position for any module that Rolldown can emit, including one with a raw LS or PS.

### reviewer-4: The publication test misreads positions after CR, LS or PS in `src`

**Tier:** B, latent and fails closed. **Claim:** `positionOf` and the `src` lookup split lines at LF only. Rolldown's original line numbers count CR, LS and PS, so V4 fails on a correct publication.

- **Current behavior.** `split('\n')` is used in `positionOf` and in the `src` lookup in `beforeAll`.
- **Why it's a problem.** A correct source change blocks the suite. An example is a comment that contains a pasted U+2028, or a CR in a comment. The step's map in these cases is verified correct.
- **Evidence.** In `synth5-ls-string`, `synth5-ls-comment` and `synth5-cr-comment`, the step moves 0 of 40 mappings, and V4 fails with entries such as `"_alpha: maps to src/probe.ts:4:17, \"\""`. `dump.ts` shows that Rolldown's original line and column point at `_alpha` when lines are counted at every JavaScript line terminator.
- **Required property.** V4 and V3 resolve generated and original positions with the line rule that the maps use.

### reviewer-5: A kept property written as a string can share an output name

**Tier:** B, latent. **Claim:** `readNames` doesn't treat quoted or computed string keys as property names. Neither the generator nor V3 sees a kept property written that way, so a collision passes the name set and V1 to V4, and changes behavior.

- **Current behavior.** The generator's `kept` set and V3's occurrences both come from `readNames(...).properties`, which skips `Literal` keys and computed members.
- **Why it's a problem.** `DRD-56` property 4 requires that output names equal "no property name that stays in the publication", and V3 is said to check property 4 against the build. Property 1 doesn't forbid unprefixed quoted keys.
- **Evidence.** `synth3`: `class Store { _size = 1; 'k' = 2; read() { return this._size * 10 + this['k']; } }` with the map `{ "_size": "k" }`. All five tests pass. `probe()` returns 22 with the step and 12 without. The publication at HEAD has no quoted key, computed string key or `in` with a string (`strkeys.ts`).
- **Required property.** No output name equals a property name that stays, however that name is written, as property 4 states.

### reviewer-6: V2 doesn't see prefixed member names written as strings in `.d.ts`

**Tier:** B, latent. **Claim:** V2 visits `Identifier` nodes only. A published type that declares a prefixed member through a quoted key, a computed string key or a string-literal type passes V2.

- **Current behavior.** In the test, V2 is `Visitor({ Identifier })` over each emitted `.d.ts`.
- **Why it's a problem.** If `src` declares a published member as `'_x': T` and reads it as `o._x`, the step renames the access while the `.d.ts` keeps `'_x'`. V1 passes, because no prefixed name remains in the `.js`. V3 and V4 pass too. A consumer then sees a declared member that doesn't exist at runtime. Property 1 requires that every member an emitted `.d.ts` declares keeps its name.
- **Evidence.** Appended to `draggable.d.ts`, `export interface Z { '_config': number; "_root"?: () => void; ['_window']: Window }` and `export type Z = Record<'_config', number> & { [K in '_root']: 1 }` pass all five tests (`v2-quoted`, `v2-literal-type`). The emitted `.d.ts` files at HEAD hold no such form.
- **Required property.** No emitted `.d.ts` declares a member under a prefixed name, in any syntax.

### reviewer-7: `DRD-56`'s rationale says V1 finds more than it can

**Tier:** B. **Claim:** the decision's Why says that string keys, computed keys and enumerations "Property 1 forbids …, and validation V1 finds them". V1 finds only literal strings and template texts that start with `_` and a letter, and prefixed property names.

- **Current behavior.** V1 doesn't fail on any of these:
  - `o['_' + 'config']`;
  - ``o[`_${'root'}`]``, whose cooked text is `_`;
  - `JSON.parse('{"_config":1}')`;
  - `Object.keys(o)`.

  V1 conforms to property 7's own wording.

- **Why it's a problem.** The record tells a reader that V1 guards against the dynamic forms, so a reader may rely on it for them. The selection's "None is read by name" rests on reading the code, not on V1.
- **Evidence.** `v1-concat` and `v1-json`: all five tests pass. My `grep` of `src` found no enumeration, `JSON`, spread of an internal object or string key.
- **Required property.** The record states what V1 detects, or V1 detects what the record says. The architect decides.

### reviewer-8: A plain build or a publish enforces almost none of the validation

**Tier:** B. **Claim:** V1's string half, V2, V3, V4 and the name set hold only when the node project's publication test runs on the same tree. `just build`, `just size` and a publish don't run it, and no publish path builds.

- **Current behavior.** See the table above. M3's collision, M4's string key, M6's `.d.ts` member and M7's stale key each build cleanly. `package.json` is `private`, and it has no `prepack` or `prepublishOnly` script. `npm pack` packs the tree as it is.
- **Why it's a problem.** `DRD-56` explains putting the step inside the build this way: "Every path that builds the publication then includes it: `just build`, the consumer project, the gate, and a publish. A separate step after the build could be skipped." The validation is that separate step, and nothing ties it to a publish. A tarball made after a plain `just build` can carry an M3-type collision with no failing check.
- **Evidence.** The rebuilt probes `v3-dup`, `v3-reserved` and `v3-prefixed` complete the build and fail only in the test. The only exception is `1b`, which Rolldown's parse rejects. See also the report's M3, M4, M6 and M7.
- **Required property.** A publication that a publish can ship satisfies `DRD-56` property 7, or the record states that only a tree that a passing test run read is publishable. Which one is a release-policy and contract call for the architect.
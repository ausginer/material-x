#### DRD-56 — Internal properties carry a `_` prefix in source, and the publication build shortens exactly those names through one committed map

**Status:** superseded on 2026-11-13 by `DRD-60`, apart from property 8's first sentence and the clarification of `DRD-51` property 3. Was: active, decided on 2026-11-13 by the architect on the owner's answer to `DRO-15` step 3: source prefixes, then publish-time mangling, with no selection by type. Clarifies `DRD-51` property 3 and answers `DRD-54`'s question on three engines. [`publish-mangle-handoff.md`](../publish-mangle-handoff.md) implements it. Budgets are unchanged. **Implemented** at `f7b7b300b` and `31f92f5a9`, reported at `78797ebf6`, and accepted on 2026-11-13 ([assessment](../publish-mangle-assessment.md)). Properties 1 and 6 corrected in place the same day: the members that a published type declares, and the bounded class member exception to V4. The two changed verdicts went to `DRO-4`. No independent review has read it yet. **Property 2's selection extended on 2026-11-13 by `DRD-57`.** The [publish mangle review](../reviews/publish-mangle/publish-mangle-summary.md) read it at `436b105c6`. **Superseded in part on 2026-11-13 by `DRD-59`:** properties 4 to 6 and property 7's V2 to V4. **Superseded on 2026-11-13 by `DRD-60`:** the owner deferred property mangling, and [`mangle-rollback-handoff.md`](../mangle-rollback-handoff.md) removes the prefixes, the step and the publication test

**A property that only this package's own code reads or writes, and that the publication build should shorten, is named with a `_` prefix in `src`. The `tsdown` build renames every such property in the emitted JavaScript, using one committed map from source name to output name. Public names, names the platform reads or calls, and `#private` members keep their names. No tool picks the names from types. The `.d.ts` output doesn't change, each module's source map still leads back to `src`, and a test validates the publication that the build actually produces. Budgets are unchanged.** This is `DRO-15` step 3, and [`publish-mangle-handoff.md`](../publish-mangle-handoff.md) implements it.

Decided on 2026-11-13 by the architect, on the owner's answer to `DRO-15`:

- explicit underscore prefixes in source for strictly internal properties, followed by publish-time mangling;
- public and platform names unchanged;
- the mangled set is not inferred from types.

The owner's direction is in [`performance-plan.md`](../performance-plan.md) §2 at `3b8f2d788`, and the type-directed transform is deferred in its §6.

**Why:**

- **The prefix makes each choice visible, and a person makes it.** The exploration chose names by type analysis, and the analysis was wrong about `zIndex` ([exploration](../property-mangling-exploration.md) §2). With a prefix, the name in `src` states that the property is internal, a reviewer sees each one in a diff, and the build needs no analysis.
- **The prefix removes the platform risk by construction.** `src` itself runs with `_config`, so a prefixed key that reached a platform API would already fail in the source projects. Renaming `_config` to a short name can only break something that reads the name as text: a string key, a computed key, or an enumeration whose result depends on the names. Property 1 forbids those, and validation V1 finds them.
- **One committed map keeps the modules consistent.** The build is unbundled, so the modules that share an object are renamed separately. Using one fixed map from source name to output name means every module renames `_config` the same way. Committing the map makes a build reproducible, and a new prefixed name shows up as a change to the map.
- **An output name must not equal a name that stays.** The renamer sees one module at a time, so on its own it could give a prefixed member a short name that another module uses unprefixed on the same object, such as `x`. The map is built with the whole publication in view, and V3 checks it.
- **The step belongs to `tsdown`'s build.** Every path that builds the publication then includes it: `just build`, the consumer project, the gate, and a publish. A separate step after the build could be skipped. `tsdown` composes the source map that a plugin returns with its own, so the published maps lead back to `src`.
- **This fits CONTRIBUTING.** §11 says to let the minifier shorten identifiers. The prefix is a marker for the tool, not a shortened name. Part I's priorities already rely on `#private` names being mangled, so those take no prefix. The class encapsulation rules still apply to a prefixed member: mutable state stays in `#private` fields.
- **Tier 2 isn't taken.** Its names are members of `DRD-39`'s installer types, and those types are declared in the emitted `.d.ts` files. The exploration recommended against it, and the owner didn't choose it.

**Required properties:**

1. **The marker.**
   - A property name of one `_` followed by a letter, `^_[A-Za-z]`, marks an internal property that the publication build shortens. It covers class members, object literal keys, member accesses and destructuring keys.
   - `src` uses no such name for anything else: not for a binding, a parameter, a module export, a string or a computed key, or a property that code enumerates by name.
   - Names with two leading underscores, such as `__DEV__` and `__dragRefused`, are not markers.
   - **These keep their names:**
     - `#private` members;
     - every member that an emitted `.d.ts` declares;
     - every name the platform reads, writes or calls, such as `handleEvent` and a keyframe's keys;
     - every property stored on a platform object;
     - every property of an object that a consumer creates, and every member that a published type declares on an object that a consumer receives;
     - every member of a development instrument that tests read through a global, such as the refusal count's `trusted` and `untrusted`.
2. **The selection is explicit, and made by reading the code.**
   - **The starting set** is the exploration's tier 1 that the bundle contains: `advance`, `animation`, `collect`, `config`, `count`, `decide`, `detach`, `direction`, `dx`, `dy`, `empty`, `enter`, `first`, `holds`, `lend`, `measure`, `measurePlaceholder`, `placeholderRect`, `raise`, `raiseInPass`, `rebase`, `refresh`, `root`, `run`, `schedule`, `stepTarget`, `terminate`, `updateInsertion` and `window`. That is 29 names.
   - **The prefix applies to a declaration, not to every use of a name.** For each name, every internal declaration with that name is renamed together with its uses. A parameter or local binding with the same name, such as `root: HTMLElement`, stays.
   - **Each declaration is confirmed by reading its use sites against property 1.** One that fails stays unprefixed, and the report gives the reason.
   - **No tool selects or adds a name.** A later prefixed name is added by hand, in a diff that also changes the map.
3. **The source rename changes no behavior.**
   - Each declaration is renamed with the type checker's rename, and `tsc` checks the result.
   - A test, bench or probe that names a renamed member follows the rename and changes nothing else. That includes `@ts-expect-error` lines that assert a published type lacks the member.
   - `compare.ts`'s injection texts follow the rename. **The rename makes no injection stale:** `--prove --dry` and `--floors --dry` report the same entries applying at the base and at the end. Entries that `DRD-45` property 9 already lists as stale stay as they are. The dry checks start no browser and measure nothing, so they aren't the deferred campaigns of `DRD-51` property 3.
4. **The map.**
   - One committed file, kept out of the publication, maps each prefixed name to its output name.
   - Its keys are exactly the prefixed property names in `src`, found by reading the syntax, and a test fails when the two differ.
   - Its output names are distinct, valid identifier names, unprefixed, and equal to no property name that stays in the publication.
   - A committed script generates it deterministically from the unrenamed publication, and a person reviews the diff.
5. **The step.**
   - It is part of the `tsdown` build, so `just build`'s two commands produce the renamed publication.
   - It renames properties in each emitted JavaScript module using the committed map, and changes nothing else in the module: its statements, its comments that bundlers read (`@__PURE__`, `#__PURE__`, `@__NO_SIDE_EFFECTS__`) and its `sourceMappingURL` stay.
   - **A prefixed name that the map lacks fails the build,** and the error names it.
   - The `.d.ts` and `.d.ts.map` output is byte-identical to a build without the step.
   - The step adds no runtime code.
6. **Source maps.**
   - Every emitted module's map is valid.
   - Every renamed property's position in the emitted code maps to the position in `src` where the prefixed name is written.
     - **One exception:** the renamed name is a class member, and the build without the step already maps that token to the start of the member that declares it. The mapping then stays at the member start. From that position, the `src` text holds only class member modifiers and whitespace, and then the same prefixed name. No other form passes: not a different name, a decorator, a comment, or a position in another member.
   - Every other token in the emitted code maps to the same `src` position as the corresponding token does without the step.
7. **The publication is validated.** A node test reads the run's one build (`DRD-55` property 1) and checks every file that `package.json`'s `files` selects:
   - **V1:** no emitted `.js` file holds a property name or a string literal that matches `^_[A-Za-z]`;
   - **V2:** no emitted `.d.ts` file holds an identifier that matches `^_[A-Za-z]`;
   - **V3:** the map satisfies property 4 against this build;
   - **V4:** each renamed position maps back as property 6 states;
   - **V5:** two builds of one tree give byte-identical `.js`, `.js.map`, `.d.ts` and `.d.ts.map` files. The handoff checks this once, outside the test.

   The consumer project's tests run against the renamed build and must all pass.

8. **Engines.** The consumer project stays Chromium only, which settles `DRD-54`'s open question. The renaming touches no name that an engine treats differently, by property 1. A one-time run of the consumer files in Firefox and WebKit against the renamed build validates that, and isn't added to the suite.
9. **Budgets.** Every ceiling and the control figure stay. The unit reports every row as read by the gate on the renamed build, against the build without the renaming. A verdict that changes goes to the owner under `DRO-4`.

**Expected:** the exploration's emulated publication read −30 to −66 B Brotli on the rows without `sortable`, and −103 to −119 B on the three `sortable` rows, at `b0287f1ae`. It also read that "freeDrag" and "example: resize handle" would fall below their ceilings. Those are estimates. The gate's joint reading is the booked figure (`DRD-51` property 1, as amended).

**What this amends:** `DRD-51` property 3 is clarified: `--prove --dry` and `--floors --dry` aren't campaigns. `DRD-54`'s question on three engines is answered by property 8.

**What this doesn't decide:**

- the type-directed transform ([`performance-plan.md`](../performance-plan.md) §6, deferred);
- whether the `shipped` census moves to the build;
- `DRO-4`'s re-base;
- prefixes for any package other than `@ydinjs/drag`. That would be a CONTRIBUTING change.

**Corrected on 2026-11-13, in place** ([assessment](../publish-mangle-assessment.md) §3 and §4):

- **Property 6, the class member exception.** Rolldown 1.2.15 maps a `readonly` class field to the start of its member, with or without the step, and a map that `renderChunk` returns can't move that mapping. Property 6's second bullet then contradicted its third for four renamed fields. On the owner's answer during the unit, the third bullet governs, within the bound that the exception states. V4 refers to property 6, so it applies the same bound. Before the correction, the second bullet had no exception.
- **Property 1, objects that a consumer receives.** The bullet read "every property of an object that a consumer creates, or receives under a published type". It now names the members that the published type declares. That is how the selection and the handoff read it: `Gesture`'s `enter`, `raise`, `raiseInPass` and `detach` aren't declared by `DraggableController`, and are prefixed. No selection changes.

**Result, 2026-11-13:** commit A at `f7b7b300b` and commit B at `31f92f5a9`, reported at `78797ebf6` and accepted ([assessment](../publish-mangle-assessment.md), §Disposition of the publish mangle report).

- **Selection.** All 37 declarations of the 29 names are prefixed. Each was read against property 1, and none stays.
- **Rename.** With each `_name` read as `name`, `src` doesn't differ. The `.d.ts` files are byte-identical, and the dry checks apply the same entries as at the base.
- **Step.** It renames 145 names in the emitted modules through 29 map entries, and changes nothing else. All 6,902 mappings keep their `src` positions. Four of them use property 6's exception.
- **Validation.** The publication test passes, and M1 to M7 fail as required. V5 holds. The consumer project passes 326 of 326 on the renamed build, and its files pass in Firefox and WebKit once.
- **Size, Brotli-11, base → end:** −31 to −66 B on the seven rows without `sortable`, and −102 to −110 B on the three rows with it. "example: resize handle" and "freeDrag" turn green. Ceilings and the control are unchanged, and the verdicts go to `DRO-4`.

**Extended on 2026-11-13 by `DRD-57`:** property 2's selection adds 30 declarations that its starting set missed, and a one-character name isn't selected.

**Superseded in part on 2026-11-13 by `DRD-59`,** on the owner's requirements for the publication, which withdraw the requirement to keep the JavaScript text and the source map segments. Properties 4, 5 and 6 and property 7's V2 to V4 are replaced. Properties 1 to 3, 8 and 9 and V1 stay. The rationale's claims about what V1 finds (`DRF-30`) and about a publish (`DRF-31`) are corrected there.

**Superseded on 2026-11-13 by `DRD-60`,** on the owner's decision to defer property mangling. The prefixes, the step and the publication test go. Two statements stay: property 8's first sentence, that the consumer project is Chromium only, and the clarification of `DRD-51` property 3.
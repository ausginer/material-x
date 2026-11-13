# Publish mangle: integrity pass

**Pass:** `integrity`, round `publish-mangle`, for `packages/drag`. **Brief:** [`publish-mangle-assessment.md`](../../publish-mangle-assessment.md) §9, `drag:DRD-56`, `drag:DRD-55`.

## Commit read

`436b105c6b855b8702a677ba42db850676e911a0` on `drag/size` (HEAD verified). The working tree held no tracked change. Untracked files under `reviews/publish-mangle/` belong to the round's other passes. Nothing was committed, and no implementation file was edited.

## Scope

**Covered**

- `build/rename-properties.ts`, `build/property-names.ts`, `build/property-names.json`, `build/generate-property-names.ts`, read in full.
- `tsdown.config.ts`, and how its plugin list composes with `constructLibraryTsdownPlugins()` in `.scripts/tsdown-library.ts`.
- The build that the consumer and node projects share: `tests/support/build-package.node.ts`, `require-build.ts`, and `.scripts/vitest-config.ts`'s `DRAG_CONSUMER` and `DRAG_NODE_BUILD`.
- `tests/publication.node.test.ts`, read in full.
- The neighbouring flows: `just build` and `clean-build`, `.scripts/package-files.ts` (`clean`, `customExports`), `size`, the `declaration` project, typedoc (`tsconfig.docs.json`, `typedoc.json`), `tsconfig.json`, lint and format coverage of `build/`, `.gitignore`, `nx.json`, and the root `Justfile`.
- The prefixed declarations in `src`: a syntax inventory of 50 declaration and literal-key sites for the 29 names, and the receivers of every `._name` access (35 `this`, 25 `index`, 14 `behavior`, 12 `gesture`, the rest local objects).
- Prose that names a renamed member, in `src`, in the emitted modules, and in current-state documents.
- Public surface: the exports map, the emitted `.d.ts` names, the published `.js.map` `names` arrays.
- Independent runs, all in a scratch copy of the package and never in the package root, because other passes read that tree:
  - a fresh build of the package, compared with the tree in the working copy;
  - the generator, run against the committed map;
  - the publication test, run against the fresh build;
  - three variations of the build (integrity-1 and integrity-2).
- Checks run read-only in the package: `npx just lint build tsdown.config.ts tests/publication.node.test.ts` (clean), `npx just fmt-check` on the same paths (clean), `npx just typecheck` (clean).

**Not covered**

- The discrimination of V1 to V4 and the name test against forms that M1 to M7 did not try, and the step's behaviour at non-BMP characters or line boundaries. These are the `reviewer`'s targets 1 to 4.
- Whether each of the 37 declarations is internal under `DRD-56` property 1 as corrected, beyond the structural checks above. This is the `reviewer`'s target 5. The checks here found no key enumeration (`Object.keys`, `for in`, spread, `in`, `Reflect`, `JSON`) on any prefixed object, no prefixed binding or parameter in `src`, and no `._name` access on a platform object.
- The accepted evidence: size readings, engine runs, V5, the dry checks, the rename check, M1 to M7. None was challenged. One accepted claim was confirmed by a second route: a fresh build of the tree is byte-identical to the build in the working copy, for every `.js`, `.js.map` and `.d.ts` file, and the generator reproduces the committed map byte for byte.
- Out of scope per the brief: the type-directed transform, budgets and `DRO-4`, the `shipped` census, `classVarCleanupPlugin` itself, timing runs and campaigns.

## Result

**Null on tier A and tier B.** The step is in every path that builds the publication, and every path that I could trace leaves the neighbouring flows intact:

- `just build` and the global setup of the consumer and node projects run the same two commands. `package-files.ts clean` is a `git clean` over the entry paths and `extras` only, so it touches neither `build/` nor `src/`.
- The step is the last entry of the package's own list, so a later addition to the shared list cannot move it. The shared list is unchanged by the unit (`git diff c42c5b084..HEAD -- .scripts` is empty).
- A prefixed name that is missing from the map fails the build, and the consumer and node projects raise that failure in each of their files while the source projects stand. This matches `.agents/docs/test-architecture.md` line 127.
- No output name equals a property name that stays. I checked this separately from V3: all 145 renamed occurrences in the fresh build are the only properties in the `.js` files that carry an output name, and no `.d.ts` file declares a property, method or qualified name that equals an output name.
- The published `.js.map` `names` arrays (67 of the package's maps have any) hold no prefixed name.
- The `.d.ts` files hold no prefixed text at all, in identifiers or in comments.
- Lint, format and typecheck cover `build/` (`tsconfig.json` includes it; the ESLint and Oxlint ignore lists don't exclude it).
- Other packages don't import `@ydinjs/drag`, so no other package observes the rename.

**Three tier C findings follow.** Two of them concern a precondition or a placement that nothing records. The third is a consequence of a choice the decision made.

## Findings

### integrity-1

**Tier:** C

**Claim:** The `_` marker and the workflow that keeps the map in line with it exist in the record only, and the build's failure for a missing name doesn't lead to the script that fixes it.

**Finding:** A contributor who adds an internal property to drag has to know three things: the `_` marker decides what the publication build renames, the map must have the new name, and `build/generate-property-names.ts` produces the map. None of them is in a current-state document.

**Current behavior / contract**

- `.agents/docs/documentation.md`, the table at the top: a convention ("What do I write?") has its home in `.agents/docs/` or `CONTRIBUTING.md` Part I. The record (`packages/*/.plan/`) answers "why is it like this?".
- `DRD-56` property 1 (`.plan/00-index.md`, "The marker") states the convention. Its "What this doesn't decide" says only that prefixes for **other** packages would be a CONTRIBUTING change. For drag, the convention has no other home.
- `grep` finds `generate-property-names` and `property-names.json` only in `packages/drag/.plan/`, in `build/` and in `tsdown.config.ts`. No `Justfile` recipe, no `package.json` script, no `README.md`, `CONTRIBUTING.md` or `.agents/docs/` file names the script. Its usage is in its own header comment.
- `CONTRIBUTING.md` line 44 (priority 2, code size) says "Private identifiers may have long names; they are mangled in production builds". A reader takes `#private` as the whole mechanism.

**Why it is a problem:** A contributor who writes `_novel` gets a source run that passes and a build that fails. The message is `kernel/callbacks.js: the prefixed property _novel has no output name in build/property-names.json`. It names the map, not the script, and it can't say that a `_` property has to be added by hand or by regeneration. The fix is found in the record or by reading `build/`. Regenerating changes more than the new key: the output names are assigned by occurrence count, so adding one prefixed name and four uses in the scratch copy moved 5 of the 29 existing assignments (`_animation` `h`→`i`, `_count` `f`→`g`, `_decide` `i`→`e`, among them). `DRD-56` says "a person reviews the diff", and that diff is larger than the new name.

**Evidence / reproduction**

- Scratch copy of the package, `src/kernel/callbacks.ts` given a method `_novel` that `clear()` calls, then `tsdown --config tsdown.config.ts`: the build exits 1 with the message above. The same tree typechecks and runs in the source projects.
- Generator, same scratch copy with one more prefixed name and four uses of `_decide`: 30 names, and the diff against the committed map changes 6 lines for existing keys as well as adding one.
- `grep -rl "generate-property-names\|property-names\|rename-properties" . --exclude-dir=node_modules --exclude-dir=.git` over the repository finds only `packages/drag/.plan/`, `packages/drag/build/`, `packages/drag/tsdown.config.ts` (which imports the map and the step) and `packages/drag/tests/publication.node.test.ts`. No current-state document is among them.

**Required property:** A contributor can learn from a current-state document, or from the failure itself, that a `_`-prefixed property is renamed in the publication, what is owed in the same change, and how the map is brought in line. Where that goes (CONTRIBUTING, a package document, or the message) is a placement call. **Routed to the owner.**

### integrity-2

**Tier:** C

**Claim:** `DRD-56` property 6 holds in this build only because `classVarCleanupPlugin`, which is in the shared plugin list, never acts here. If it acts, the renamed positions map to statement starts, V4 fails, and the step can't prevent it.

**Finding:** The step relies on the chunk's own source map having a token-level position for each property name. The shared list's `classVarCleanupPlugin` gives that up in any module where it rewrites `var X = class` to `class X`. Nothing in `tsdown.config.ts`, the step's header or the decision records this dependency.

**Current behavior / contract**

- `build/rename-properties.ts` header: "Rolldown passes each segment of the chunk's own map through it, so every token keeps the `src` position it had".
- `DRD-56` property 6: each renamed position maps to where the prefixed name is written in `src`.
- `.scripts/tsdown-library.ts`: `classVarCleanupPlugin` edits through `renderChunk`'s `magicString`, which Rolldown passes only when `experimental.nativeMagicString` is on. In drag's build the option is off, the plugin returns `null`, and 10 emitted modules keep `var <name> = class` (assessment §8).
- Assessment §8 says that enabling the option "would change the emitted modules and the step's input, so it would be a build change with its own size reading". It doesn't say that property 6 can no longer hold.

**Why it is a problem:** The precondition is real and unrecorded. A change to the shared plugin file, or to drag's configuration, that makes the cleanup act turns the publication test red (V4), so the failure is loud. It isn't attributed: the failing message names the renamed property and a statement start, not the plugin. And a reader of §8 would price the option by size only.

**Evidence / reproduction** (scratch copy of the package, root files linked, run in the scratch tree, not the package):

1. Add `inputOptions: { experimental: { nativeMagicString: true } }` to `tsdown.config.ts`, the step and the shared list unchanged. The build succeeds, the step renames the same 145 names, V1, V2, V3 and the name test pass.
2. `tests/publication.node.test.ts` then fails V4 with 79 renamed positions, in exactly the 8 modules that have `var X = class` and a renamed name: `kernel/gesture.js` 18, `free-drag/behavior.js` 16, `kernel/session.js` 13, `sortable/behavior.js` 12, `free-drag/operation.js` 11, `sortable/operation.js` 4, `sortable/rect-index.js` 4, `kernel/callbacks.js` 1. Example: `sortable/behavior.js:106:12 _config: maps to src/sortable/behavior.ts:260:5, "if (this._config.handle)"`.
3. Two controls, built without the step, with the option on:
   - with the shared list as it is, `sortable/behavior.js` line 106, `_config` at column 11, maps to `src/sortable/behavior.ts` 260:4, the start of the `if`;
   - with `tsdown:class-var-cleanup` filtered out of the list, the same token maps to 260:13, the name. So the coarser map comes from the plugin's rewrite, not from the step.
4. Without the option (the committed configuration), the same test passes 5 of 5.

**Required property:** The condition under which property 6 holds is stated where a change to it would be read, or is checked where it can fail with its cause. Whether the preferred behavior is to keep the cleanup inert in drag, to bound property 6 by the plugin, or to change the plugin, is not this pass's call. **Routed to the owner**, together with the `classVarCleanupPlugin` observation the assessment leaves with them.

### integrity-3

**Tier:** C

**Claim:** Twelve comment lines in the emitted modules name members by their source names, while the code beside them uses the output names. V1 doesn't speak to comments.

**Finding:** The step keeps every comment unchanged (`DRD-56` property 5: "changes nothing else in the module"). The comments are JSDoc copied from `src`, and `src` names the members as `_run`, `_collect` and so on. In the published file the member is `t` or `n`.

**Current behavior / contract**

- `DRD-56` property 5 and `rename-properties.ts` header: "the statements, every comment and the `sourceMappingURL` stay as they are". This is the decision's choice, not a defect in the step.
- V1 checks property names and string literals only.

**Why it is a problem:** A reader of the published file, who is a consumer reading `node_modules` or a stack trace, is told about a member that doesn't exist in that file. The comment and the code disagree within one file.

**Evidence / reproduction** (fresh build, 12 occurrences in 6 modules). Two sites in one file:

- `kernel/callbacks.js:11-12`: "`_run` takes the entry at the end for both, ... and `_run` does not branch on the kind";
- `kernel/callbacks.js:38`: the method is `t(argument) {`.

The others: `kernel/drag.js:4` and `:15` (`_raise`), `kernel/session.js:79` (`_advance`, `_decide`, `_stepTarget`, `_terminate`), `sortable/rect-index.js:25,51,52,74,114,120` (`_placeholderRect`, `_collect`, `_measure`), `sortable/xy.js:6` (`_collect`). Command: `grep -rnE "(^|[^A-Za-z0-9_$.])_(advance|collect|raise|run|...)\b" --include=*.js` over the built tree, with the 29 names.

**Required property:** Either a comment in a published module that names a renamed member doesn't mislead, or the decision records that it may. **Routed to the owner**: rewriting comments conflicts with property 5's "changes nothing else", so it is a decision, and I make none.

## Observed, not findings

- **A dangling `sourceMappingURL` in the `.d.ts` files, which the unit didn't cause.** Every emitted `.d.ts` ends with `//# sourceMappingURL=<name>.d.ts.map`, and the build emits no `.d.ts.map` file (none exists in the fresh build or in `files`). `DRD-56` property 5 requires the `.d.ts.map` output to be byte-identical, which then holds of nothing. The base build, `c42c5b084`, has the same configuration (`dts: true`, `sourcemap: true`).
- **`npx just fmt-check` on the whole package fails on 52 files, all under `.plan/`** (measurement JSON and review Markdown, none in the unit's subject). The changed code and test files pass.
- **The duplicated reserved-word list** is in `build/generate-property-names.ts` and `tests/publication.node.test.ts`, equal today. This belongs to the `cleanup` pass.
- **`tsconfig.json` now includes `./build/**/*`,** and `build/` imports `rolldown/utils`, `tsdown` and `@jridgewell/gen-mapping`, none declared in drag's `package.json`. The root declares all three, and `import-x/no-extraneous-dependencies` is off in the shared ESLint configuration. Consistent with how drag already uses `tsdown`.

## Cleanup

The scratch trees I made are under the session's scratchpad directory (`.../scratchpad/w`, `w3`, `probe` and two generator outputs). I removed them after writing this report.
# Publish mangle assessment

**Read:** [`publish-mangle-report.md`](publish-mangle-report.md) at `78797ebf6`, by the architect on 2026-11-13. The unit's code commits are `f7b7b300b` (A, the source rename) and `31f92f5a9` (B, the map, the step and the publication test). **Governing records:** `drag:DRD-56`, `DRD-55`, `DRD-51` properties 1, 3 and 4, and `DRO-15` step 3. **Handoff:** [`publish-mangle-handoff.md`](publish-mangle-handoff.md).

**Outcome:**

- **`DRD-56` is implemented and accepted.** Properties 1 to 9 hold, with two records made here:
  - property 6 and V4 state the bounded exception for a class field whose upstream mapping points at its modifiers (§3);
  - property 1's bullet on objects that a consumer receives is worded as the selection and the handoff read it: the members that the published type declares (§4).
- **The allocation probe's one-line rename is accepted.** `DRD-56` property 3 requires it, and the handoff's §Boundaries omitted the path (§5).
- **M2 holds as required.** Its consumer run aborted after the required failure, and it isn't rerun (§6).
- **`DRO-15`'s measured gain is base → end:** −31 to −66 B Brotli on the seven rows without `sortable`, and −102 to −110 B on the three rows with it. "example: resize handle" and "freeDrag" turn green. They go to `DRO-4` as measured facts. No ceiling or control changes (§7).
- **The type-directed transform stays deferred** ([`performance-plan.md`](performance-plan.md) §6).
- **A fresh independent review** of the publication pipeline and its validation is recommended before the branch's pull request. §9 gives its scope.

## 1. What the architect checked

The report's runs aren't repeated. The checks below are cheap and read existing evidence, or read the code.

| Check | Result |
| --- | --- |
| `git diff --stat c42c5b084..78797ebf6 -- packages/drag .scripts`, without `measurements/` | 15 `src` files, `build/` (4 files), `tsdown.config.ts`, `tsconfig.json`, three test files, `bench/compare.ts`, one probe line and the report. Nothing under `.scripts` |
| `tsconfig.json` at `c42c5b084` | Already includes `.plan/probes/callback-list/allocation.ts`. The unit adds only `./build/**/*` |
| `build/rename-properties.ts`, `build/property-names.ts`, `build/property-names.json`, `tests/publication.node.test.ts` | Read in full. 29 map keys. The step replaces only the characters of each prefixed name, fails on an unknown name and on a prefixed shorthand key, and leaves `.d.ts` chunks alone |
| V3 and V4 together | Every occurrence of an output name in an emitted module is checked. It passes only if its mapped `src` text is the prefixed key, or modifiers and then the key. A mapping onto the output name itself fails V3. Any other mapping, or none, fails V4 |
| Size, `mangle-base-2`, `mangle-a` and `mangle-end` step 1 | Every figure and module count in the report's §8 table equals the run logs |
| [`step-check.txt`](measurements/2026-11-13-mangle-step-check.txt) | Exactly four `member start` mappings, all `readonly` class fields, and 0 failures over 6,902 mappings |
| M2's log, [`2.log.gz`](measurements/2026-11-13-mangle-runs/mangle-witnesses/2.log.gz) | §6 |
| Emitted modules with `var <name> = class` | 10, among them `kernel/gesture.js` (§8) |

**Observed, not gated:** `tsdown` reported "Build complete in 362ms" at the base, 317 ms at commit A, and 2,119 ms at the end. The step adds one map segment per kept character. That is the method that keeps every mapping ([compose probe](measurements/2026-11-13-mangle-compose-probe.txt)). The compose probe also showed that one segment per token boundary keeps every mapping. No decision depends on the build's time.

## 2. Items

| Item | Result |
| --- | --- |
| Item 1, the base | Accepted |
| Item 2, the selection | Accepted. 37 declarations of the 29 names, all prefixed, with reasons. §4 records how property 1 applies to `Gesture` |
| Item 3, the source rename | Accepted. The rename check reads `src` with `_name` as `name` and finds 0 of 42 files that differ. The `.d.ts` files are byte-identical, and the dry checks match the base. The discarded first attempt, which renamed the bindings of shorthand keys, was restored and is recorded |
| Item 4, the map | Accepted. Two generator runs are equal, and a third equals the committed file |
| Item 5, the step | Accepted, with the V4 exception of §3 |
| Item 6, the publication test | Accepted. The publication is the 90 files that `files` selects, and `npm pack` adds only `package.json` and `README.md` |
| Item 7, M1 to M7 | Accepted. M2 is in §6 |
| Item 8, readings | Accepted: size (§7), V5, three engines with 1,071 passed and 18 skipped, and the consumer files in Firefox and WebKit with 638 passed and 14 skipped |
| No return condition was met | Confirmed. No consumer test fails on the renamed build, and none of the other return conditions applies |

## 3. The V4 exception

**Found:** Rolldown 1.2.15 maps a class field that has modifiers in `src` to the start of the member, which is the first modifier, and not to the field's name. Four renamed fields are like this:

- `_root`, `_config` and `_window` in `src/free-drag/behavior.ts`, lines 63 to 65;
- `_config` in `src/sortable/behavior.ts`, line 94.

Each is a `readonly` field. The chunk maps them this way with or without the step. A map that `renderChunk` returns can't move a chunk mapping to another `src` position.

**The conflict:** property 6 required that each renamed position map to the position where the prefixed name is written. It also required that every token keep the `src` position it has without the step. For these four tokens, both can't hold. The owner chose the second during the unit.

**Recorded in `DRD-56` property 6 and V4:**

- A renamed position maps to the position in `src` where the prefixed name is written.
- **The one exception:** the renamed name is a class member, and the build without the step already maps that token to the start of the member that declares it. The mapping then stays at the member start. From that position, the `src` text must hold only class member modifiers and whitespace, and then the same prefixed name.
- No other form passes: not a different name, a decorator, a comment, or a position in another member.

**Classification:** a correction, made in place. The two bullets of property 6 contradicted each other for these tokens. The correction makes the bullet that keeps every upstream position govern, and bounds the tolerance by the text that may come before the name. The decision's requirement that the maps lead back to `src` is unchanged. The test was written to this bounded form.

**How the test applies the exception:** it checks the text at the mapped position for every occurrence of an output name, and not only for class members. That doesn't make it weaker than V4 as first written. A mapping at an access that lands on the declaration's name also passed that form. The [step check](measurements/2026-11-13-mangle-step-check.txt) found the exception exactly four times, all at class fields whose mappings equal the build without the step. §9 gives this to the feature proof to confirm.

## 4. Property 1 and `Gesture`'s members

`draggable` returns its `Gesture`, typed as `DraggableController` (`DRD-34`). Property 1's bullet "every property of an object that a consumer … receives under a published type" can be read as every property of that object, including `enter`, `raise`, `raiseInPass` and `detach`. The report read it as the members that the published type declares. The handoff named those four members' `@ts-expect-error` lines as lines that follow the rename, which is the same reading.

**That reading is the decision's.** A consumer can use a received object only through the members that the published type declares. Members that no published type declares are internal by `DRD-24` and `DRD-34`, even though they can be reached at runtime. The bullet now says so. This is a wording correction, and no selection changes.

## 5. The allocation probe

`.plan/probes/callback-list/allocation.ts` changed one line, `list.run(null)` → `list._run(null)`.

- `DRD-56` property 3 says that a probe that names a renamed member follows the rename.
- `tsconfig.json` already included the probe at the base, so `npx just typecheck` fails without the change.

**The handoff's §Boundaries omitted the path.** That is the handoff's error, not the unit's. The change is accepted, and nothing else is owed.

## 6. M2's consumer run

**Required:** V1 fails and names the module. At least one consumer test fails, and the same test passes in the source run.

**What the log shows:**

- V1 fails and names `kernel/gesture.js: property _enter`.
- "drag:DRI-18 resize handle > should resize with no lift, and Escape should restore" fails in `consumer` ("expected 200 to be greater than 250"). It passes in `browser`, in the same run.
- The other failures are five size rows: the four that stay red at the end, and "freeDrag", because the unrenamed `kernel/gesture.js` is larger.
- Then `this[#steps]._run is not a function` repeats 644,152 times. The browser connection closes, and Vitest reports 34 of 56 files.
- The witness script restored `build/rename-properties.ts`, and `cmp` confirmed it.

**The abort follows from the edit.** M2 publishes a tree whose modules disagree: `kernel/gesture.js` calls `_run`, and `kernel/callbacks.js` defines that method as `t`. That publication isn't one the build can produce, because V1 rejects it in the same run. The library doesn't defend against a mismatched publication, and it shouldn't: CONTRIBUTING's library stance applies. The loop shows that the edit breaks the kernel, which is the required consumer failure.

**Not repeated.** A rerun would reproduce the same abort. A rerun with `--bail` would count the remaining consumer failures, but no decision needs that count. The witness requires one consumer failure, and the log records it before the abort.

## 7. Size

The gate on the published build (`DRD-55`), Brotli-11 bytes:

| Row | Ceiling | Base | End | Base → end | Verdict, base → end |
| --- | --- | --- | --- | --- | --- |
| draggable alone | 2139, control 2024 | 2196 | 2162 | −34 | red → red, 23 over. The control moved by 138 B, down from 172 |
| draggable + lift | 4169 | 3963 | 3932 | −31 | green → green |
| example: resize handle | 3313 | 3321 | 3270 | −51 | **red → green, 43 under** |
| example: drop zone | 4431 | 4603 | 4568 | −35 | red → red, 137 over |
| example: canvas group | 3314 | 3302 | 3265 | −37 | green → green |
| freeDrag | 4967 | 5026 | 4960 | −66 | **red → green, 7 under** |
| freeDrag + bounds + landing | 5210 | 5470 | 5419 | −51 | red → red, 209 over |
| sortable + y | 6733 | 6645 | 6543 | −102 | green → green |
| sortable + xy | 6617 | 6534 | 6425 | −109 | green → green |
| complete | 7065 | 7283 | 7173 | −110 | red → red, 108 over |

- **The booked gain is base → end** (`DRD-51` property 1, as amended by `DRD-55`). Minified, it is −221 to −599 B, and gzip-9 is −47 to −139 B.
- **The estimate held.** `DRD-56` expected −30 to −66 B and −103 to −119 B, and both rows that it named turned green. "sortable + y" came in 1 B outside the estimate.
- **Commit A isn't booked.** At commit A "example: canvas group" was 3 B over its ceiling, because each prefixed name is one character longer. It is green at the end.
- **Routed to `DRO-4`:** the two changed verdicts, and the four rows that stay red. No ceiling or control figure changes. A ceiling moves only as the owner's re-base.

## 8. The report's notes

- **`classVarCleanupPlugin` never acts in this build.** Confirmed. The plugin edits through `renderChunk`'s `magicString`, which Rolldown passes only with `experimental.nativeMagicString`. `packages/material-x` enables that option, and drag's configuration doesn't. Ten of drag's emitted modules keep `var <name> = class`. The plugin is shared, in `.scripts/tsdown-library.ts`, and the same applies to every package that uses it without the option. **This is a repository-level observation, and it isn't registered here** ([review findings](../../../.agents/docs/review-findings.md) §Artifacts). It's the owner's to open. Enabling the option in drag would change the emitted modules and the step's input, so it would be a build change with its own size reading.
- **`isPrefixed()` instead of an exported pattern.** Accepted.

## 9. A fresh independent review

**Recommended:** one review round, rooted at `consolidator`, at the commit that carries this assessment. `src`, `build/`, `tests` and `tsdown.config.ts` there are as at `31f92f5a9`. Its output goes to `reviews/publish-mangle/`.

**Subject:**

- `build/`: the step, the shared syntax reader, the map and its generator;
- `tsdown.config.ts`'s plugin list, and how the step composes with `constructLibraryTsdownPlugins()`;
- `tests/publication.node.test.ts`, and how it shares the run's one build (`DRD-55` property 1);
- the selection: the 37 prefixed declarations in `src`, against `DRD-56` property 1 as corrected here.

**Not in scope:**

- the type-directed transform;
- budgets and `DRO-4`;
- the `shipped` census's move to the build, which is still open;
- `classVarCleanupPlugin` (§8);
- timing runs, campaigns, and `--prove` or `--floors` without `--dry`.

**Evidence that is accepted and isn't rerun** unless a pass challenges a specific claim:

- the size readings;
- the three-engine and the Firefox and WebKit runs;
- V5;
- the dry checks;
- the rename check;
- M1 to M7, M2's abort included.

A pass that disputes one of them names the claim and reruns only what it needs.

**Lenses:**

| Lens | Why |
| --- | --- |
| `reviewer`, feature proof against `DRD-56` as corrected | The validation is new and is the only thing that guards the publication. Whether each check discriminates has to be shown independently of the unit that wrote it |
| `integrity` | The step is now in every path that builds the publication: `just build`, the consumer and node projects, the gate, and a publish. The shared plugin list and the build that both projects share are neighbouring flows |
| `cleanup`, limited to `build/` and the publication test | About 420 lines of new tooling, measured against the responsibility that `DRD-56` gives it |

`der` isn't recommended. The decisions are one day old, and their reasons haven't expired.

**Feature-proof targets, for the `reviewer` prompt only.** The other lenses form their own questions.

1. **V1 to V4 and the name set each fail on a publication that breaks their property,** including forms that M1 to M7 didn't try. Examples are optional chaining, a destructuring pattern in a parameter, a getter or setter, a constructor parameter property, a computed key with a constant string, and `in`.
2. **The V4 exception is bounded as `DRD-56` property 6 states.** The test applies it to every occurrence, and §3 explains why that is no weaker than the first V4. Confirm or refute that.
3. **V3 infers that a property stays from the source map,** where the generator compares against the build without the step. Show whether some property that stays can pass V3 and also pass V4.
4. **The step's map,** for code with characters outside the Basic Multilingual Plane, in strings or comments, and for a renamed name at the start or end of a line.
5. **The selection:** is any of the 37 declarations reachable by a consumer through a published type, through `DRD-39`'s installer types, or through the platform?

## Next

- **The owner** decides whether to start §9's review, and when. The re-base in `DRO-4` stays the owner's.
- **`classVarCleanupPlugin`** is the owner's to open or leave (§8).
- **Unchanged:** the type-directed transform stays deferred ([`performance-plan.md`](performance-plan.md) §6), and whether the `shipped` census moves to the build is still open.
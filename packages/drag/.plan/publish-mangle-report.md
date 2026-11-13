# Publish mangle report

**Unit:** [`publish-mangle-handoff.md`](publish-mangle-handoff.md), on `drag/size` from `c42c5b084`. **Governing records:** `drag:DRD-56` properties 1 to 9, `drag:DRD-54`, `drag:DRD-55`, `drag:DRD-51` properties 1, 3 and 4, and `drag:DRO-15` step 3.

**Outcome:**

- **The rename.** All 37 property declarations in `src` that carry one of `DRD-56` property 2's 29 names are prefixed. Each is internal by property 1, and none stays unprefixed (§2). The type checker's rename changed 185 locations. With each `_name` read as `name`, `src`'s diff is empty (§3).
- **The step.** `tsdown`'s build renames the 145 prefixed property names in its emitted modules through `build/property-names.json`, 29 entries. It changes nothing else: every module equals the step-less module with the names replaced. The annotations, the `sourceMappingURL` comments and every `.d.ts` are unchanged. All 6,902 mappings keep their `src` positions (§5).
- **Validation.** `tests/publication.node.test.ts` reads the run's one build and passes. M1 to M7 fail as the handoff requires. V5 holds. The consumer project passes 326 of 326 against the renamed build, and so do its files in Firefox and WebKit (§6 to §8).
- **Size.** Base → end is −31 to −66 B Brotli on the rows without `sortable`, and −102 to −110 B on the three rows with it. Two verdicts change from red to green: "example: resize handle" and "freeDrag". The ceilings and the control figure are unchanged (§8).

**One property was settled with the owner during the unit.** Rolldown's own map points a `readonly` class field at its `readonly` keyword, not at its name. That is so with or without the step, and four renamed names are such fields. On the owner's answer, V4 accepts a mapping to the start of the class member that declares the name, when only modifiers come before it (§5).

No return condition was met.

## Commits

| Commit | What it carries |
| --- | --- |
| `f7b7b300b` | **A:** the source rename in 15 `src` files, and the lines that follow it in `tests/authoring.declaration.test.ts`, `tests/callback-list.browser.test.ts`, `bench/compare.ts` and `.plan/probes/callback-list/allocation.ts` |
| `31f92f5a9` | **B:** `build/` (the map, its generator, the step and the shared syntax reader), the step in `tsdown.config.ts`, `build/` in `tsconfig.json`, and `tests/publication.node.test.ts` |
| The commit that carries this report | This report and `measurements/2026-11-13-mangle-*` |

## 1. The base

- **Item 1.1:** the command printed nothing.
- **The suite** (run `mangle-base`):
  - 746 tests, of which 740 pass;
  - the six known size rows fail;
  - `consumer` passes 326 of 326.
- **The size reading** (`mangle-base-2`, step 1) equals [the published gate report](published-gate-report.md) §5's build column on every row, in minified, gzip-9 and Brotli-11.
- **The base tree:** the 90 files that `package.json`'s `files` selects, copied outside the checkout. Their hashes are in [`2026-11-13-mangle-base-tree.sha256`](measurements/2026-11-13-mangle-base-tree.sha256).
- **The dry checks.** `--prove --dry` and `--floors --dry` stop at the first entry that fails, so each entry ran alone with `--only` ([`dry-each.sh`](measurements/2026-11-13-mangle-dry-each.sh.txt), run `mangle-base-dry`):
  - `--prove`: 6 entries apply. "one forced layout per move", "one O(n) walk per move" and "30 µs of script per move, in the page" don't;
  - `--floors`: 7 entries apply. The seven per-move entries don't;
  - the 10 that fail are all at `MOVE_SITE`, the entries that `DRD-45` property 9 lists as stale.

## 2. The selection

**Every declaration of the 29 names is a property of a type, class or object that only this package creates and reads.** [`inventory.ts`](measurements/2026-11-13-mangle-inventory.ts.txt) found 37 symbols, and its use sites are in [`2026-11-13-mangle-inventory.txt`](measurements/2026-11-13-mangle-inventory.txt). A type's member and the object literal that implements it are two symbols and one row here. The decision was made by reading each declaration and its use sites.

**The checks against `DRD-56` property 1 that apply to all 37:**

- **No `.d.ts` declares one.** In the base tree's declarations, the 29 names occur only as parameters, such as `root: HTMLElement` and `window: Window`, and in comments.
- **None is read by name.** No string, computed key, `in` test or enumeration in `src`, `tests` or `bench` reaches one.
- **None is a module export or a member of a platform object,** and the platform calls none. `handleEvent` isn't in the set.
- **No test reads one through a global.** The refusal count's `trusted` and `untrusted` aren't in the set.

Line numbers are at `c42c5b084`.

| Name | Declaration | Declared by | Use sites | Decision |
| --- | --- | --- | --- | --- |
| `advance` | `kernel/session.ts:254` | `Session`, an internal class | `kernel/gesture.ts` 347 | Prefix |
| `animation`, `dx`, `dy` | `sortable/layout-animation.ts:39`, `40`, `41`, and the record at `106` | `RowAnimation`, an internal type: the value in a `Map` that the sink owns | the same file: 80, 82 to 84, 133 to 135, 152 | Prefix. `animation` is a shorthand key at 106 and a destructuring key at 152; the local bindings stay |
| `collect`, `count`, `first`, `holds`, `lend`, `measure`, `measurePlaceholder`, `placeholderRect` | `sortable/rect-index.ts:142`, `124`, `129`, `257`, `229`, `183`, `241`, `116` | `RectIndex`, an internal class that each axis rule creates for itself | `rect-index.ts`, `xy.ts`, `y.ts` and `linear-shift.ts`; the inventory gives each line | Prefix. `RectIndex` isn't any published axis type's member |
| `config` | `free-drag/behavior.ts:64` | `FreeDragBehavior`, which `freeDrag` creates and passes to `draggable` | `free-drag/behavior.ts`, `free-drag/operation.ts` | Prefix. The kernel reads only `Behavior`'s members, and `config` isn't one. The object it holds is the consumer's, but the property is the behavior's |
| `config` | `sortable/behavior.ts:94` | `SortableBehavior`, likewise | `sortable/behavior.ts`, `sortable/operation.ts` | Prefix, as above |
| `root`, `window` | `free-drag/behavior.ts:63`, `65` | `FreeDragBehavior` | `free-drag/behavior.ts`, `free-drag/operation.ts` | Prefix. The parameters `root` and `window` stay |
| `decide`, `stepTarget`, `terminate` | `kernel/session.ts:273`, `281`, `291` | `Session` | `kernel/gesture.ts`, `kernel/session.ts` | Prefix |
| `detach`, `enter`, `raiseInPass` | `kernel/gesture.ts:258`, `186` to `193`, `249` | `Gesture` | `kernel/session.ts`, `kernel/gesture.ts` | Prefix. `draggable` returns the instance typed as `DraggableController`, which declares none of them. The handoff names their `@ts-expect-error` lines as followers |
| `raise` | `kernel/drag.ts:6` and `kernel/gesture.ts:238` | `Fallible`, an internal interface, and `Gesture`, which implements it | `kernel/drag.ts`, `kernel/session.ts`, `kernel/gesture.ts` | Prefix. `Fallible` isn't in any `.d.ts` |
| `direction` | `sortable/behavior.ts:70`, and the literal at `282` | `PressState`, the `State` of `SortableBehavior`'s admissions | `sortable/behavior.ts` 160, 162, 216 | Prefix. The kernel holds an admission's `state` as an opaque value and passes it back to `activate`. The parameter `direction` stays, and the shorthand key at 282 becomes `_direction: direction` |
| `empty`, `run` | `kernel/callbacks.ts:38`, `71` | `List`, the kernel's callback list | `kernel/drag.ts`, `kernel/gesture.ts`, `tests/callback-list.browser.test.ts`, the allocation probe | Prefix. No module exports `List`'s members, and no entry publishes `List` |
| `rebase`, `updateInsertion` | `sortable/operation.ts:155`, `179` | `SortableOperation` | `sortable/behavior.ts` 126, 75 | Prefix. `SortableController` exposes no step, so no consumer receives the operation |
| `refresh` | `sortable/linear-shift.ts:56`, and the literal at `126` | `LinearShift`, an internal interface, and the object that `linearShift()` returns | `sortable/y.ts` 46 | Prefix |
| `schedule` | `shared/invalidation.ts:16`, and the literal at `29` | `FrameTask`, and the object that `createFrameTask()` returns | `free-drag/drop-targets.ts` 123, `sortable/operation.ts` 100 | Prefix. The platform calls the closure `fire`, not `schedule` |

**`Gesture`'s members.** `DRD-56` property 1 keeps "every property of an object that a consumer … receives under a published type". The table reads that as the members that the published type declares. `DraggableController` declares `requestStep`, `requestCancel`, `requestDestroy` and `use`, and they stay. The handoff names `panel.enter`, `panel.raise`, `panel.raiseInPass` and `panel.detach` as lines that follow the rename, which is the same reading.

## 3. The source rename

**Method** ([`rename.ts`](measurements/2026-11-13-mangle-rename.ts.txt)):

- `findRenameLocations` from TypeScript 6.0.2's language service runs at each member or type declaration, with shorthand prefixes and suffixes, and not in comments or strings.
- Every location is computed on the unchanged tree, then applied.
- 185 locations in 17 files, listed in [`rename-locations.txt`](measurements/2026-11-13-mangle-rename-locations.txt).

**What the checker missed:** nothing. `tsc` then reported no error.

**One discarded attempt.** The first run also started a rename at shorthand keys. From a shorthand key, the rename also covers the binding that the key reads. So it renamed the locals `animation` (`layout-animation.ts` 99 and 111) and `direction` (`sortable/behavior.ts` 246 and 270), and `tsc` failed. The tree was restored with `git checkout`. The kept run starts only at member and type declarations, and a shorthand site is then renamed as a key.

**The shorthand and destructuring sites.** The checker writes these as `_name: name`, so the binding keeps its name:

- `sortable/behavior.ts` 282;
- `layout-animation.ts` 106 and 152;
- `rect-index.ts` 327 and 346;
- `xy.ts` 73 and 157;
- `y.ts` 57;
- `linear-shift.ts` 169.

`oxfmt` wraps three of them across lines, because they became longer.

**Comments that name a renamed member in code font now name `_name`:**

- `kernel/callbacks.ts` 20, 21;
- `kernel/gesture.ts` 180;
- `kernel/drag.ts` 80, 97;
- `kernel/session.ts` 123;
- `sortable/rect-index.ts` 10, 11, 16, 75, 109, 110, 139, 207, 220, 226;
- `sortable/xy.ts` 26;
- `sortable/linear-shift.ts` 168.

Other mentions keep their names:

- `config.visual`, `config.box`, `config.targets` and `config.home()` name the consumer's configuration;
- `` `advance` `` at `linear-shift.ts` 105 names a local function;
- `` `first` `` at `sortable/axis.ts` 16 names a published parameter.

**Changed test, bench and probe lines:**

| File | Lines | Change |
| --- | --- | --- |
| `tests/authoring.declaration.test.ts` | 136, 138, 140, 142 | `panel.enter`, `panel.raise`, `panel.raiseInPass`, `panel.detach` → `_enter`, `_raise`, `_raiseInPass`, `_detach`, so each `@ts-expect-error` still checks the member. `panel.run` at 171 ("should refuse the removed names") stays |
| `tests/callback-list.browser.test.ts` | 71 to 73, 92 to 94, 112 to 114, 130, 133 to 138, 155, 157, 158, 160, 170 | `list.run` → `list._run`, `list.empty` → `list._empty` |
| `bench/compare.ts` | 1138, 1140, 1246, 1248 | in the find and replace texts, `this.#behavior.config.onStart` → `this.#behavior._config.onStart` |
| `bench/compare.ts` | 1179, 1180 | `this.enter(` → `this._enter(`, `this.#session.stepTarget()` → `this.#session._stepTarget()`, and `this.enter();` → `this._enter();` |
| `.plan/probes/callback-list/allocation.ts` | 51 | `list.run(null)` → `list._run(null)` |

**Outside §Boundaries.** `.plan/probes/callback-list/allocation.ts` isn't one of the paths that §Boundaries lists. `tsconfig.json` includes it, so `npx just typecheck` fails without this line. `DRD-56` property 3 says a probe that names a renamed member follows the rename. The change is that one name.

**Two lines don't follow the rename.** The entry name "an array of four numbers per sample, in Gesture.enter" in `compare.ts` stays, because the dry checks select entries by name. The string `count ${held}, measured ${count}` in `rect-index.ts` is a message, not a property.

**`src`'s diff is a rename** ([`rename-check.sh`](measurements/2026-11-13-mangle-rename-check.sh.txt), [output](measurements/2026-11-13-mangle-rename-check.txt)):

- In `f7b7b300b`'s `src`, every `_name: name` is read as `name` and every `_name` as `name`.
- Both trees are formatted alike and compared with whitespace and trailing commas removed. Comments are included.
- Result: 42 files compared, 0 differ. `layout-animation.ts` differs in layout only, in the record literal that `oxfmt` keeps on several lines.

**The checks at commit A.** The runs were taken on the working tree, before the commit, so the runner records `c42c5b084` and a changed tree.

| Check | Result |
| --- | --- |
| `npx just typecheck`, format and lint | Clean |
| The Chromium suite (`mangle-a`, step 3) | 746 tests, 739 passing. The six known size rows fail, and so does "example: canvas group", 3 B over (§8). `consumer` passes 326 of 326 against the prefixed build. Every other title and verdict equals the base |
| `npx just test-engines` (`mangle-a`, step 4) | 1,071 passed, 18 skipped |
| The size reading (`mangle-a`, step 1) | §8 |
| `--prove --dry`, `--floors --dry` (`mangle-a`, step 2) | Identical to the base's output, byte for byte |
| `.d.ts` | All files identical to the base tree's. The build emits no `.d.ts.map`. No `.d.ts` holds an identifier that matches `^_[A-Za-z]`, so no comment in a declaration changed |

## 4. The map

- **[`build/property-names.json`](../build/property-names.json):** 29 keys, the prefixed property names that `src`'s syntax holds. Each maps to one character: `a` to `w`, `z` and `A` to `E`.
- **[`build/generate-property-names.ts`](../build/generate-property-names.ts) generates it:**
  - **Keys:** the prefixed names that the syntax holds, read with Rolldown's `parseSync`. They are class members, object keys, interface and type members, member accesses and destructuring keys.
  - **Output names:** from the publication built without the step. That is `tsdown.config.ts`'s build with every plugin but the step's, into a temporary directory, so the package tree isn't touched.
  - **Order:** the names that occur most often in that build get the shortest output names, with ties in key order. `_config` (`a`) and `_enter` (`b`) come first.
  - **Skipped:** reserved words, and every property name that stays in that build. `x` and `y` are skipped for that reason.
- **That build equals commit A's.** All 33 emitted modules equal commit A's tree, apart from the `sourceMappingURL` line, because the generator builds without maps ([`generator-build.txt`](measurements/2026-11-13-mangle-generator-build.txt)).
- **Two runs give equal output, and a third equals the committed file** ([`generator-runs.txt`](measurements/2026-11-13-mangle-generator-runs.txt)).

## 5. The step

[`build/rename-properties.ts`](../build/rename-properties.ts) is a `renderChunk` plugin, last in `tsdown.config.ts`'s plugins.

- **It works on parsed positions.** It reads each JavaScript chunk with `parseSync` and replaces only the characters of each prefixed property name. `minifySync` reprints the module, and wasn't used.
- **A `.d.ts` chunk passes unchanged.**
- **A name that the map lacks fails the build** with `<module>: the prefixed property <name> has no output name in build/property-names.json`. So does a prefixed shorthand key, which can't be renamed without its binding.
- **The returned map has a segment at every kept column, and one at the start of each renamed name.**

**Why that map** ([`compose-probe.ts`](measurements/2026-11-13-mangle-compose-probe.ts.txt), [output](measurements/2026-11-13-mangle-compose-probe.txt)):

- Rolldown 1.2.15 keeps the chunk's own mappings and passes each one through the map that `renderChunk` returns.
- With a segment at every column, or at every token boundary, the composed map equals the plain build's: 530 of 530 mappings for `kernel/gesture.js`.
- With one segment per line, 400 of the 530 move.

**Against the build without the step.** [`step-check.ts`](measurements/2026-11-13-mangle-step-check.ts.txt) ran on the end tree against commit A's tree ([output](measurements/2026-11-13-mangle-step-check.txt)). It checks:

- every emitted module equals commit A's module with each prefixed name replaced, computed independently of the step;
- every `@__PURE__`, `#__PURE__`, `@__NO_SIDE_EFFECTS__` and `sourceMappingURL` occurrence is the same, in order;
- every other published file, each `.d.ts` included, is byte-identical;
- every map decodes, with the same number of mappings. Each has the same source and `src` position as before, and its column moves only by the length change of the names renamed before it on its line;
- each renamed name has a mapping at its new position, onto the prefixed name in `src`.

Result: 90 files, 145 renamed names, 6,902 mappings, 0 failures. The step adds no code: each module differs from commit A's only inside the replaced names.

**The four `readonly` fields.** Rolldown's map points a class field with `readonly` at the start of the member, in commit A's build as in the end build:

- `_root`, `_config` and `_window` at `free-drag/behavior.js` 19 to 21 map to `src/free-drag/behavior.ts` 63 to 65, column 2;
- `_config` at `sortable/behavior.js` 21 maps to `src/sortable/behavior.ts` 94, column 2.

The step passes those mappings through unchanged, and a `renderChunk` map can't change a chunk mapping's `src` position. On the owner's answer, V4 and the step check accept this case: the mapping points at the start of the class member that declares the name, and only modifiers come before the name. The step check lists the four as `member start`, and every other renamed name maps onto the name itself.

## 6. The publication test

`tests/publication.node.test.ts`, in the node project, reads the run's one build. It takes no setup of its own: the node project's global setup builds once, and `require-build.ts` raises a failed build.

**The publication is every file that `package.json`'s `files` selects: 90 files.** `npm pack --dry-run --json` lists those 90 and also `package.json` and `README.md`, which npm always adds ([`npm-pack-files.txt`](measurements/2026-11-13-mangle-npm-pack-files.txt)).

| Test | Check |
| --- | --- |
| "should map exactly the prefixed property names in src" | The name set. It fails with `{ missing, extra }` |
| "… (V1)" | Each property name and each string literal or template text in every emitted `.js`. It names the file and the name or string |
| "… (V2)" | Each identifier in every emitted `.d.ts`, parsed as `dts` |
| "… (V3)" | Distinct output names that are identifier names, unprefixed and not reserved. It also fails on any occurrence of an output name whose mapped `src` text is that output name itself, which is a property that stays under that name. It names the key, the output name and the position |
| "… (V4)" | Every occurrence of an output name in an emitted module needs a mapping at its exact position, onto `_name` in `src`, or onto the start of the member that declares it (§5). It names the file, the position and the name |

`build/property-names.ts` holds the syntax reader that the step, the generator and the test share.

## 7. The witnesses

Each witness edited a copy-backed file and was then restored. Every restore was confirmed with `cmp` ([`witness.sh`](measurements/2026-11-13-mangle-witness.sh.txt), run `mangle-witnesses`). Each restored state is commit B's tree, and the end suite (§8) passes on it.

| Witness | Scratch edit | Result |
| --- | --- | --- |
| **M1** | `readonly _probe = 0;` in `List` (`kernel/callbacks.ts`), with no map entry | **Build:** fails with `kernel/callbacks.js: the prefixed property _probe has no output name in build/property-names.json`. **Suite:** all 22 consumer files and all 4 node files fail with `tsdown`'s output; `browser`, `shipped` and `declaration` pass 383 of 383 |
| **M2** | The step returns `null` for `kernel/gesture.js` | **V1:** fails and names `kernel/gesture.js: property _enter`, among 22 entries. **Consumer:** "drag:DRI-18 resize handle > should resize with no lift, and Escape should restore" fails, and the `browser` project passes it. **Then** an error loop (`this[#steps]._run is not a function`, about 644,000 times) closed the browser connection, and the rest of the consumer project didn't report. The source projects pass 383 of 383 |
| **M3** | `"_config": "x"` | **V3:** fails, for example "`_config: x stays as a property at free-drag/bounds.js:40:13, from src/free-drag/bounds.ts:70:18`" |
| **M4** | `this.#session?.['_decide'](fault, 'fault')` in `Gesture._raise` | **V1:** fails with `kernel/gesture.js: string "_decide"`. **Consumer:** 37 tests fail, in 12 files, among them 10 in `sortable.browser.test.ts` and 7 in `faults.browser.test.ts`: the fault path calls `_decide`, which the build named `i`. The source projects pass 383 of 383 |
| **M5** | The step returns no map | **V4:** fails, for example "`free-drag/behavior.js:41:37 _root: maps to src/free-drag/behavior.ts:91:34, "handle(this._root);"`". V1, V2 and V3 pass |
| **M6** | `_probe?(): void;` in `DraggableController`, with the map entry `"_probe": "F"` | **V2:** fails with `kernel/gesture.d.ts: _probe`. The name-set test passes |
| **M7** | The map key `"_stale": "G"` | **The name-set test:** fails with `extra: ["_stale"]` |

The M2 log is 137 MB, nearly all of it the repeated error. It is kept compressed as `2.log.gz`.

## 8. Readings and validation

### Size

Runs: base `mangle-base-2` step 1, commit A `mangle-a` step 1, end `mangle-end` step 1. Figures are minified / gzip-9 / Brotli-11 bytes.

| Row | Ceiling | Base | Commit A | End | Base → A | A → end | Base → end | Verdicts: base; A; end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| draggable alone | 2139, control 2024 | 6731 / 2427 / 2196 | 6776 / 2435 / 2204 | 6510 / 2376 / 2162 | +45 / +8 / +8 | −266 / −59 / −42 | −221 / −51 / −34 | red, 57 over, control moved by 172; red, 65 over, control 180; red, 23 over, control 138 |
| draggable + lift | 4169 | 11542 / 4401 / 3963 | 11587 / 4410 / 3973 | 11321 / 4354 / 3932 | +45 / +9 / +10 | −266 / −56 / −41 | −221 / −47 / −31 | green, 206 under; green, 196 under; green, 237 under |
| example: resize handle | 3313 | 9388 / 3668 / 3321 | 9433 / 3678 / 3318 | 9167 / 3618 / 3270 | +45 / +10 / −3 | −266 / −60 / −48 | −221 / −50 / −51 | red, 8 over; red, 5 over; **green, 43 under** |
| example: drop zone | 4431 | 13181 / 5103 / 4603 | 13226 / 5112 / 4608 | 12960 / 5055 / 4568 | +45 / +9 / +5 | −266 / −57 / −40 | −221 / −48 / −35 | red, 172 over; red, 177 over; red, 137 over |
| example: canvas group | 3314 | 9524 / 3628 / 3302 | 9569 / 3638 / 3317 | 9303 / 3578 / 3265 | +45 / +10 / +15 | −266 / −60 / −52 | −221 / −50 / −37 | green, 12 under; **red, 3 over**; green, 49 under |
| freeDrag | 4967 | 15166 / 5574 / 5026 | 15241 / 5587 / 5041 | 14811 / 5504 / 4960 | +75 / +13 / +15 | −430 / −83 / −81 | −355 / −70 / −66 | red, 59 over; red, 74 over; **green, 7 under** |
| freeDrag + bounds + landing | 5210 | 16331 / 6064 / 5470 | 16406 / 6077 / 5482 | 15976 / 5995 / 5419 | +75 / +13 / +12 | −430 / −82 / −63 | −355 / −69 / −51 | red, 260 over; red, 272 over; red, 209 over |
| sortable + y | 6733 | 20559 / 7351 / 6645 | 20653 / 7368 / 6665 | 20006 / 7221 / 6543 | +94 / +17 / +20 | −647 / −147 / −122 | −553 / −130 / −102 | green, 88 under; green, 68 under; green, 190 under |
| sortable + xy | 6617 | 20103 / 7239 / 6534 | 20187 / 7256 / 6545 | 19616 / 7123 / 6425 | +84 / +17 / +11 | −571 / −133 / −120 | −487 / −116 / −109 | green, 83 under; green, 72 under; green, 192 under |
| complete | 7065 | 22238 / 8079 / 7283 | 22343 / 8101 / 7302 | 21639 / 7940 / 7173 | +105 / +22 / +19 | −704 / −161 / −129 | −599 / −139 / −110 | red, 218 over; red, 237 over; red, 108 over |

- **The booked figure is base → end:** −31 to −66 B Brotli on the rows without `sortable`, and −102 to −110 B on the three rows with it. `DRD-56` estimated −30 to −66 B and −103 to −119 B. That estimate also expected "freeDrag" and "example: resize handle" to fall below their ceilings, and both do.
- **Verdicts that change, base → end:**
  - "example: resize handle", red → green;
  - "freeDrag", red → green.

  The ceilings are kept. These go to `DRO-4`.

- **At commit A,** "example: canvas group" was 3 B over its ceiling, because the prefixed names are one character longer. It is green again at the end. On "example: resize handle", base → A is +45 minified and −3 Brotli.
- **The module lists are unchanged.** Each row has the same module count at all three points: 7, 9, 9, 13, 9, 15, 19, 20, 19, 24. No graph violation is reported. "should bring no lift, box-quad, sortable, cache or landing code with draggable alone" passes at all three.

### Reproducibility (V5)

`mangle-end` step 2 ([`v5.sh`](measurements/2026-11-13-mangle-v5.sh.txt)) built twice from one tree. The 90 files are byte-identical, and the log holds their hashes.

### Engines

- **`npx just test-engines`** (`mangle-end` step 5): 1,071 passed and 18 skipped.
- **The consumer files in Firefox and WebKit, once** (`mangle-end` step 6, [config](measurements/2026-11-13-mangle-consumer-engines.config.ts.txt), [script](measurements/2026-11-13-mangle-consumer-engines.sh.txt)):
  - **Setup:** the consumer project's own configuration, with resolution, global setup and setup files, given one instance per engine as `createDragAllEnginesTestConfig` derives one;
  - **Result:** 44 files; 638 passed and 14 skipped, none failed;
  - **The skipped tests** are the same seven in each engine: two in `destruction.browser.test.ts`, three in `click-guard.browser.test.ts` (touch), and one each in `coordinates.browser.test.ts` and `classes.browser.test.ts`. The tests skip themselves in these engines, as the log's `↓` lines show;
  - **The scratch configuration** was deleted after the run.

### A look at the published code

[`2026-11-13-mangle-gesture/`](measurements/2026-11-13-mangle-gesture/) holds `kernel/gesture.js` and its map, from commit A's build and from the end build.

## 9. Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty. The base suite, size, tree and dry checks are recorded (§1) |
| `git diff --stat c42c5b084..HEAD -- packages/drag .scripts` | 15 `src` files, `tests/authoring.declaration.test.ts`, `tests/callback-list.browser.test.ts`, `tests/publication.node.test.ts`, `bench/compare.ts`, `build/` (4 files), `tsdown.config.ts` and `tsconfig.json`, then this report and `measurements/2026-11-13-mangle-*`. One path is outside §Boundaries, `.plan/probes/callback-list/allocation.ts`, one line (§3). Nothing under `.scripts` changed |
| Item 2's table | 37 declarations of the 29 names, each prefixed with its reason (§2) |
| `src`'s diff | Only renames: with `_name` read as `name`, 0 of 42 files differ, comments included (§3) |
| The source projects | `browser` 354, `shipped` 9 and `declaration` 20: the same titles with the same verdicts as at the base, at commit A and at the end |
| The node project | The base's 37 titles plus the publication test's 5, which pass. Only size rows fail: four at the end. The verdicts that changed are listed (§8) |
| The consumer project | 22 files and 326 tests against the renamed build. All pass |
| The publication test | Passes. M1 to M7 as item 7 states (§7) |
| `.d.ts` | Byte-identical to the base tree's, at commit A and at the end |
| `--prove --dry`, `--floors --dry` | The same entries apply at the base, at commit A and at the end. Both outputs are byte-identical to the base's |
| Size | §8 |
| V5 | §8 |
| Three engines | 1,071 passed and 18 skipped, at commit A and at the end |
| Consumer files in Firefox and WebKit, once | 638 passed and 14 skipped, none failed |
| `tests/hot-path.browser.test.ts`, `shipped` project | 9 of 9 pass, at the base, at commit A and at the end |
| The suite's wall time | Base: 96.4 s by the runner, 95.59 s by Vitest. End: 97.7 s and 96.84 s. Not gated. The end suite has 5 more tests |
| Changed `.ts` files | `npx just fmt`, `lint-fix`, `fmt`, `lint` and `typecheck`: clean |
| Markdown | `oxfmt`, links checked by a scratch script, `git diff --check` |

## Measurements

All under [`measurements/`](measurements/), with the prefix `2026-11-13-mangle-`:

- **`runs/`:** each run's `status.json` and step logs, unedited:
  - `mangle-base`: the base suite;
  - `mangle-base-2`: the base size reading, then the dry checks as the tool runs them, which stop at the first stale entry;
  - `mangle-base-dry`: the dry checks, one entry at a time;
  - `mangle-a`: commit A's size reading, dry checks, suite and three engines;
  - `mangle-witnesses`: M1 to M7;
  - `mangle-end`: the end size reading, V5, dry checks, suite, three engines, and the consumer files in Firefox and WebKit.
- **Suite JSON:** `base-suite.json`, `a-suite.json` and `end-suite.json`.
- **The base tree:** `base-tree.sha256`.
- **The selection:** `inventory.ts.txt` and `inventory.txt`.
- **The rename:** `rename.ts.txt`, `rename-locations.txt`, `rename-check.sh.txt` and `rename-check.txt`.
- **The map:** `generator-runs.txt`, `generator-build.ts.txt` and `generator-build.txt`.
- **The step:** `compose-probe.ts.txt`, `compose-probe.txt`, `step-check.ts.txt` and `step-check.txt`.
- **The scripts and the published sample:**
  - `dry-each.sh.txt`, `witness.sh.txt`, `v5.sh.txt`, `consumer-engines.sh.txt` and `consumer-engines.config.ts.txt`;
  - `npm-pack-files.txt`;
  - `gesture/`.
- **The per-project summaries** come from [`2026-11-13-gate-summary.ts.txt`](measurements/2026-11-13-gate-summary.ts.txt).

## Notes for the architect

- **V4 and the `readonly` fields** (§5). The owner chose the member start. Property 6's wording, "the position in `src` where the prefixed name is written", stands in the record. The test and this report apply it with that tolerance.
- **The probe line outside §Boundaries** (§3).
- **The M2 consumer run aborted** after its first failure, so "at least one consumer test fails" holds, and the rest of that project's results are absent from that run.
- **`classVarCleanupPlugin` in `.scripts/tsdown-library.ts` never acts in this build.** It edits through `renderChunk`'s native `magicString`, which Rolldown provides only with `experimental.nativeMagicString`, and `tsdown` doesn't enable that. The step doesn't use it either, because enabling it would also activate that plugin. This is an observation; nothing changed.
- **`isolatedDeclarations` and oxlint's `no-inferrable-types` disagree on an exported regular expression.** `build/property-names.ts` exports `isPrefixed()` instead of the pattern.

## Next

The architect reads this report. §8's base → end column is `DRO-15`'s measured gain. The two verdicts that changed, "example: resize handle" and "freeDrag", go to `DRO-4`, which keeps the re-base. The type-directed transform stays deferred. Whether the `shipped` census moves to the build is still open.
# Mangle selection report

**Unit:** [`mangle-selection-handoff.md`](mangle-selection-handoff.md), on `drag/size` from `ed759485e`, implemented on `6e8174f64`. That commit adds only the independent review's records, which this unit didn't read, stage or change. **Governing records:** `drag:DRD-57` properties 1 to 6, [`mangle-selection-audit.md`](mangle-selection-audit.md) §3 to §5, `drag:DRD-56` properties 1, 3 and 5 to 9, and `drag:DRD-51` properties 1, 3 and 4.

**Outcome:**

- **The rename.** The audit's 30 declarations are prefixed, and no other declaration is. That includes the `RectIndex` and `LinearShift` members named `invalidate`, `retire` and `moved`. The installer members with those names keep them. The type checker's rename, started at each declaration by file and line, changed 153 locations. With each `_name` read as `name`, `src`'s diff is empty (§2).
- **The map.** It has 53 keys: the 29 existing ones and the 24 new ones. Three generator runs gave the same file (§3).
- **Validation.** The publication test passes, unchanged, and every `.d.ts` is byte-identical to the base. The step check reports 0 failures over 263 renamed names. V5 holds. The consumer project passes 326 of 326 against the renamed build. The source projects and the dry checks are as at the base (§4).
- **Size.** Base → end is −1 to −39 B Brotli on every row except "example: canvas group", which is +3 B. Minified, every row is 20 to 329 B smaller. No verdict changes. The ceilings are unchanged (§5).

No return condition was met.

## Commits

| Commit | What it carries |
| --- | --- |
| `b50204f66` | The rename in 15 `src` files, the two comments, the test, bench and probe lines that follow, and the regenerated `build/property-names.json` |
| The commit that carries this report | This report and `measurements/2026-11-13-selection-*` |

## 1. The base

- **Item 1.1:** the command printed nothing.
- **The suite** (run `selection-base`, step 1):
  - 751 tests, of which 747 pass;
  - the four size rows fail: "draggable alone", "example: drop zone", "freeDrag + bounds + landing" and "complete";
  - `consumer` passes 326 of 326.
- **The size reading** (step 3): every row's minified, gzip-9 and Brotli-11 bytes and module count equal the end column of [`publish-mangle-report.md`](publish-mangle-report.md) §8.
- **The base tree** (step 2): the 90 published files, copied to a scratch directory outside the checkout with [`keep-tree.sh`](measurements/2026-11-13-selection-keep-tree.sh.txt). Their hashes are in [`2026-11-13-selection-base-tree.sha256`](measurements/2026-11-13-selection-base-tree.sha256).
- **The dry checks** (step 4, [`dry-each.sh`](measurements/2026-11-13-mangle-dry-each.sh.txt) unchanged): 6 `--prove` entries and 7 `--floors` entries apply. The 10 entries at `MOVE_SITE` don't.

**Files that this unit doesn't own.** Throughout the unit, the working tree held a change to `.plan/00-index.md` and two untracked files, `measurements/2026-11-13-slot-array-kinds.js.txt` and `measurements/2026-11-13-slot-array-kinds.txt`. They were there before the rename, and this unit didn't make them. They are not in either commit and were left as they are.

## 2. The rename

**Method.** [`rename.ts`](measurements/2026-11-13-selection-rename.ts.txt) takes the 30 declarations by file, line and name, as the audit's §3 gives them at `436b105c6`. It requires exactly one declaration name at each. It calls `findRenameLocations` at that name, with shorthand prefixes and suffixes, and not in comments or strings. It fails on a location in a `.d.ts`, and on two declarations that give one location different texts. Neither happened. Every location was computed on the unchanged tree, and a dry run gave the same 153 locations that the applied run printed.

**Locations,** in full in [`2026-11-13-selection-rename-locations.txt`](measurements/2026-11-13-selection-rename-locations.txt):

| Declaration | Locations | Where, apart from the declaration |
| --- | --- | --- |
| `RectIndex.values`, `rect-index.ts:112` | 9 | `rect-index.ts` 328, 347; `xy.ts` 74, 141, 162; `linear-shift.ts` 169, 236; `y.ts` 57 |
| `RectIndex.items`, `:120` | 8 | `rect-index.ts` 336, 349; `xy.ts` 77, 162; `linear-shift.ts` 221, 244; `y.ts` 82 |
| `RectIndex.end`, `:133` | 10 | `rect-index.ts` 327; `xy.ts` 39; `linear-shift.ts` 175, 176, 177, 179 (two), 184; `y.ts` 57 |
| `RectIndex.invalidate`, `:290` | 6 | `rect-index.ts` 338; `xy.ts` 54, 148; `linear-shift.ts` 210, 263 |
| `RectIndex.retire`, `:298` | 3 | `xy.ts` 178; `linear-shift.ts` 272 |
| `LinearShift.moved`, `linear-shift.ts:71` | 3 | the returned object's key, 196; `y.ts` 103 |
| `LinearShift.invalidate`, `:73` | 4 | the key, 259; `y.ts` 86, 98 |
| `LinearShift.retire`, `:75` | 3 | the key, 266; `y.ts` 107 |
| `List.has`, `kernel/callbacks.ts:43` | 6 | `gesture.ts` 285; the test, 62, 64, 65, 66 |
| `List.add`, `:60` | 19 | `session.ts` 202; `gesture.ts` 286, 328; the test at 14 places; the probe, 50 |
| `List.clear`, `:77` | 3 | `gesture.ts` 419; the test, 169 |
| `FrameTask.cancel`, `shared/invalidation.ts:17` | 6 | the returned object's key, 34; `drop-targets.ts` 113, 126; `sortable/operation.ts` 106; `sortable/behavior.ts` 205 |
| `FreeDragBehavior.axis`, `free-drag/behavior.ts:66` | 4 | `behavior.ts` 77; `free-drag/operation.ts` 155, 157 |
| `FreeDragBehavior.bounds`, `:67` | 6 | `behavior.ts` 78, 116, 126; `free-drag/operation.ts` 57, 161 |
| `FreeDragBehavior.landing`, `:68` | 4 | `behavior.ts` 79; `free-drag/operation.ts` 137, 143 |
| `SortableBehavior.axis`, `sortable/behavior.ts:97` | 13 | `behavior.ts` 117, 207 (two), 209 (two), 229; `sortable/operation.ts` 109, 113, 175, 183, 199, 203 |
| `SortableBehavior.displacement`, `:98` | 3 | `behavior.ts` 118, 224 (the value, not the `AxisContext` key) |
| `SortableBehavior.landing`, `:99` | 4 | `behavior.ts` 119; `sortable/operation.ts` 142, 146 |
| `SortableBehavior.invalidate`, `:124` | 2 | `sortable.ts` 67 |
| `FreeDragOperation.translate`, `free-drag/operation.ts:62` | 4 | `operation.ts` 73, 81; `free-drag/behavior.ts` 130 |
| `FreeDragOperation.moveTo`, `:68` | 2 | `free-drag.ts` 72 |
| `NamedLanding.duration`, `lift.ts:59` | 3 | the record's key, 306; 324 |
| `NamedLanding.easing`, `:60` | 3 | the record's key, 307; 325 |
| `NamedLanding.landing`, `:61` | 3 | the record's shorthand key, 308; 319 |
| `PressState.visual`, `sortable/behavior.ts:66` | 3 | 145; the literal's shorthand key, 280 |
| `PressState.box`, `:68` | 3 | 145; the literal's key, 281 |
| the bounds box's `left`, `top`, `right`, `bottom`, `free-drag/bounds.ts:23` | 4 each | 38 to 41, 56 to 59, 71, 72, 75, 76: only the box's side of each line |

**What kept its name.** No location reached a declaration that the audit's §4 or §5 lists:

- **The installer members:** `this._axis.retire`, `this._axis.invalidate`, `.confirm`, `.resolve` and `.moved` on `InsertionGeometry` keep their names. In `y.ts` only the `shift.` calls changed, and in `xy.ts` and `linear-shift.ts` only the `index.` calls.
- **`WeakSet`s and other same-name members:**
  - the `WeakSet`s in `gesture.ts` keep `has` and `add`;
  - `Animation.cancel()`, the controllers' `invalidate` keys, `Lift.translate` and `FreeDragController.moveTo` keep theirs.
- **Keys and reads beside the renamed names:**
  - the `AxisContext` key `displacement` stays;
  - `timing.duration`, `timing.easing` and `this._config.box` keep their names;
  - `read.left` and `originRect.left`, and the same for each side, keep theirs.

**Shorthand keys.** `landing` in `lift.ts` 308 became `_landing: landing`, and `visual` in `sortable/behavior.ts` 280 became `_visual: visual`. The local bindings kept their names. The type checker also wrote the destructuring reads in the same form, for example `const { _values: values, ... } = index`, so each local keeps its name. Those are reads, not keys.

**Comments.** The `RectIndex` class comment at `rect-index.ts` 74 and 75 now names `_values` and `_items`, and the `List` class comment at `callbacks.ts` 24 and 25 names `_has` and `_add`. A search of `src`'s comments for the 24 names in code font found no other comment about a renamed declaration. For example, `y.ts` 34 names the controller's `invalidate()`, and `lift.ts` 219 names `Lift`'s `translate`.

**Lines that follow the rename:**

| File | Lines |
| --- | --- |
| `tests/callback-list.browser.test.ts` | `has` at 62, 64, 65, 66; `add` at 63, 68, 69, 89, 90, 91, 109, 110, 111, 132, 134, 147, 150, 166; `clear` at 169. No title or assertion changed in any other way |
| `.plan/probes/callback-list/allocation.ts` | 50: `list._add(noop, receiver)` |
| `bench/compare.ts` | 1180: the replacement text `this.#steps._add(step, receiver);`. This is text in a string, so the type checker can't reach it |

`tsc` found no other line.

**Item 2.5, nothing else in `src`.** [`rename-check.sh`](measurements/2026-11-13-selection-rename-check.sh.txt), with `N` extended to the 53 names, ran on `436b105c6` against the renamed tree. [Output](measurements/2026-11-13-selection-rename-check.txt): 42 files compared, 0 differ.

- **The script needed one change.** The base already carries `DRD-56`'s 29 prefixes. As written, the script reads `_name` as `name` only on the revision's side, so its first run reported every file that holds one of those names as differing. The saved script reads both sides the same way.
- **What it can't detect:** a prefix on one of the 53 names that is added or removed in both trees at the same place. The `.d.ts` comparison and the publication test cover the declarations that matter for that.

**Format, lint and typecheck.** The 20 changed `.ts` files went through `fmt`, `lint-fix`, `fmt` and `lint` with `npx just` from `packages/drag`, and `npx just typecheck` passes. No lint error remained. The formatter wrapped lines that grew past the line width.

**Item 2.6, the dry checks.** At the end (run `selection-end`, step 2), the same entries apply as at the base: 6 `--prove` and 7 `--floors`. The two logs are identical. "one entry on the step list per frame" applies through its followed replacement text.

## 3. The map

`node build/generate-property-names.ts`, unchanged, ran three times on the renamed tree: twice with `--out` to a scratch file, and once onto the committed file ([log](measurements/2026-11-13-selection-generator-runs.txt)). Each run reported 53 names and 263 occurrences, and all three files are byte-identical.

**New keys (24):** `_add` → `r`, `_axis` → `b`, `_bottom` → `s`, `_bounds` → `m`, `_box` → `P`, `_cancel` → `p`, `_clear` → `Q`, `_displacement` → `F`, `_duration` → `R`, `_easing` → `S`, `_end` → `g`, `_has` → `T`, `_invalidate` → `d`, `_items` → `n`, `_landing` → `e`, `_left` → `w`, `_moveTo` → `V`, `_moved` → `W`, `_retire` → `q`, `_right` → `B`, `_top` → `C`, `_translate` → `D`, `_values` → `k`, `_visual` → `ab`.

**Existing keys whose output name changed (28):** `_advance` `w` → `O`, `_animation` `h` → `o`, `_collect` `n` → `E`, `_count` `f` → `j`, `_decide` `i` → `t`, `_detach` `j` → `u`, `_direction` `k` → `v`, `_dx` `o` → `G`, `_dy` `p` → `H`, `_empty` `q` → `I`, `_enter` `b` → `c`, `_first` `d` → `h`, `_holds` `r` → `J`, `_lend` `z` → `U`, `_measure` `l` → `z`, `_measurePlaceholder` `s` → `K`, `_placeholderRect` `m` → `A`, `_raise` `c` → `f`, `_raiseInPass` `A` → `X`, `_rebase` `B` → `Y`, `_refresh` `C` → `Z`, `_root` `e` → `i`, `_run` `t` → `L`, `_schedule` `u` → `M`, `_stepTarget` `v` → `N`, `_terminate` `D` → `$`, `_updateInsertion` `E` → `aa`, `_window` `g` → `l`.

`_config` keeps `a`.

**Two-character names.** The generator skips reserved words and every property name that stays, `x` and `y` among them. That leaves fewer than 53 one-character names, so the two least frequent keys get `aa` and `ab`.

## 4. Validation

All in runs `selection-end` and `selection-end-2`, at `b50204f66`:

- **The publication test:** passes unchanged, all five tests, in the end suite.
- **`.d.ts` (item 4.2):**
  - the end tree has the same 90 files as the base;
  - all 27 `.d.ts` files are byte-identical to the base tree's, and their hashes agree;
  - the build emits no `.d.ts.map`.

  No declaration was undone.

- **The step check (item 4.4):**
  - **Setup:** [`step-check.ts`](measurements/2026-11-13-selection-step-check.ts.txt) ran in `selection-end-2` step 1. It compared the end build against [`nostep-build.ts`](measurements/2026-11-13-selection-nostep-build.ts.txt)'s build of the same source, made outside the checkout. That build used every plugin but the step's, as `2026-11-13-mangle-generator-build.ts.txt` does, and kept the configuration's source maps and declarations.
  - **Changes from the mangle unit's script:** the step-less tree is built in another directory, so the check resolves a map's `sources` from each tree before comparing them. It would compare a `.d.ts.map` the same way, but the build emits none.
  - **Result:** 90 files, 263 renamed names, 6,912 mappings compared, 0 failures.
  - **11 `member start` mappings,** each a `readonly` class field with only that modifier before its name, within `DRD-56` property 6's exception:
    - `FreeDragBehavior`: `_root`, `_config`, `_window`, `_axis`, `_bounds` and `_landing`;
    - `SortableBehavior`: `_config`, `_axis`, `_displacement`, `_landing` and `_invalidate`.

    Four of them, `_root`, `_window` and both `_config`, were there at the mangle unit's end. The seven new ones are the selected `readonly` fields.

  - **A first attempt failed before checking anything:** in `selection-end` step 5, the scratch build script couldn't resolve `tsdown` from the scratch directory. It now imports `tsdown`'s entry by path, and `selection-end-2` ran that step and the two after it.
- **V5 (item 4.5):** [`v5.sh`](measurements/2026-11-13-mangle-v5.sh.txt), unchanged, in `selection-end-2` step 2. Both builds have the same 90 files and are byte-identical. Their hashes also equal the end tree's (`selection-end` step 4).
- **A look at the published code (item 4.6):** [`2026-11-13-selection-rect-index/`](measurements/2026-11-13-selection-rect-index/) holds `sortable/rect-index.js` and its map from the base tree and the end tree. The module is 6,269 B at the base and 6,246 B at the end. Its getters are now `k`, `n` and `g`. The comments keep the `src` names, as they did before.

**The suite** (`selection-end` step 3):

| Project | Files | Tests | Failed |
| --- | --- | --- | --- |
| `browser` | 26 | 354 | 0 |
| `consumer` | 22 | 326 | 0 |
| `declaration` | 3 | 20 | 0 |
| `node` | 4 | 42 | 4: the same four size rows |
| `shipped` | 1 | 9 | 0: `tests/hot-path.browser.test.ts`, all pass |

- **Totals:** 751 tests, of which 747 pass.
- **Against the base:** every project runs the same titles with the same verdicts, as a comparison of the two runs' per-test lists shows.

**Three engines** (`selection-end-2` step 3, `npx just test-engines` after sourcing `webkit-env.sh`): 81 files, 1,071 passed and 18 skipped, none failed.

The consumer files in Firefox and WebKit were not run, as the handoff requires.

**Wall time** (Vitest's `Duration`): 97.21 s at the base, 99.33 s at the end. Not gated.

## 5. Size

Runs: base `selection-base` step 3, end `selection-end` step 1. Figures are minified / gzip-9 / Brotli-11 bytes.

| Row | Ceiling | Base | End | Base → end | Verdicts: base; end |
| --- | --- | --- | --- | --- | --- |
| draggable alone | 2139, control 2024 | 6510 / 2376 / 2162 | 6490 / 2377 / 2161 | −20 / +1 / −1 | red, 23 over, control moved by 138; red, 22 over, control moved by 137 |
| draggable + lift | 4169 | 11321 / 4354 / 3932 | 11265 / 4349 / 3926 | −56 / −5 / −6 | green, 237 under; green, 243 under |
| example: resize handle | 3313 | 9167 / 3618 / 3270 | 9147 / 3616 / 3267 | −20 / −2 / −3 | green, 43 under; green, 46 under |
| example: drop zone | 4431 | 12960 / 5055 / 4568 | 12904 / 5054 / 4550 | −56 / −1 / −18 | red, 137 over; red, 119 over |
| example: canvas group | 3314 | 9303 / 3578 / 3265 | 9283 / 3580 / 3268 | −20 / +2 / +3 | green, 49 under; green, 46 under |
| freeDrag | 4967 | 14811 / 5504 / 4960 | 14647 / 5490 / 4943 | −164 / −14 / −17 | green, 7 under; green, 24 under |
| freeDrag + bounds + landing | 5210 | 15976 / 5995 / 5419 | 15756 / 5977 / 5380 | −220 / −18 / −39 | red, 209 over; red, 170 over |
| sortable + y | 6733 | 20006 / 7221 / 6543 | 19677 / 7210 / 6510 | −329 / −11 / −33 | green, 190 under; green, 223 under |
| sortable + xy | 6617 | 19616 / 7123 / 6425 | 19350 / 7108 / 6400 | −266 / −15 / −25 | green, 192 under; green, 217 under |
| complete | 7065 | 21639 / 7940 / 7173 | 21310 / 7935 / 7151 | −329 / −5 / −22 | red, 108 over; red, 86 over |

- **The booked figure is base → end** (`DRD-51` property 1): −20 to −329 B minified, and +3 to −39 B Brotli.
- **No verdict changes.** The four red rows stay red and come closer to their ceilings. The control figure moves by 1 B.
- **"example: canvas group" grows by 3 B Brotli** while it shrinks by 20 B minified. The unit didn't investigate why. Every row's output names changed with the map's new order (§3), so this row's compressed size can move either way. It stays green, 46 B under.
- **The module lists are unchanged:** 7, 9, 9, 13, 9, 15, 19, 20, 19 and 24 modules, as at the base. No graph violation is reported.
- **Against the audit's estimate:** the audit estimated about 128 new occurrences and about 600 characters before compression. The emitted modules have 263 renamed names, against 145 at the mangle unit's end. That is 118 more, and −20 to −329 B minified.

## 6. Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty; base suite, size, tree and dry checks recorded (§1) |
| `git diff --stat 6e8174f64..HEAD -- packages/drag .scripts` | `src` (15 files), `tests/callback-list.browser.test.ts`, `bench/compare.ts`, `.plan/probes/callback-list/allocation.ts`, `build/property-names.json`, this report and `measurements/2026-11-13-selection-*` |
| The selection | 30 declarations, each with its locations (§2); no other declaration |
| `src`'s diff | 0 of 42 files differ (§2) |
| Source projects | Same titles and verdicts as at the base |
| Node project | Same titles; only the four size rows fail, and no verdict changes |
| Consumer project | 22 files, 326 tests, all pass |
| Publication test | Passes |
| `.d.ts` | All 27 byte-identical |
| Dry checks | Same entries as at the base |
| Step check | 0 failures; 11 `member start` mappings, all `readonly` fields |
| V5 | Byte-identical |
| Three engines | 1,071 passed, 18 skipped |
| `hot-path.browser.test.ts`, `shipped` | 9 of 9 pass |
| Wall time | 97.21 s → 99.33 s |
| Format, lint, typecheck | Clean |
| Markdown | `npx just fmt` on this report, `git diff --check`, and its links checked by a scratch script |

## Measurements

All under [`measurements/`](measurements/), saved unedited:

- **Runner directories:**
  - `2026-11-13-selection-runs/selection-base/`: the suite, the base tree's hashes, size and the dry checks;
  - `selection-end/`: size, the dry checks, the suite and the end tree's hashes, with step 5 failing as §4 describes;
  - `selection-end-2/`: the step check, V5 and the three engines.
- **Suite results:** `2026-11-13-selection-base-suite.json` and `2026-11-13-selection-end-suite.json`.
- **The base tree's hashes:** `2026-11-13-selection-base-tree.sha256`.
- **The rename and its check:** `2026-11-13-selection-rename.ts.txt`, `-rename-locations.txt`, `-rename-check.sh.txt` and `-rename-check.txt`.
- **The step check and its build:** `2026-11-13-selection-step-check.ts.txt` and `-nostep-build.ts.txt`. Their output is in `selection-end-2/1.log`.
- **Other scripts:** `2026-11-13-selection-keep-tree.sh.txt`. `dry-each.sh` and `v5.sh` ran unchanged from the `mangle` unit's copies.
- **Generator runs:** `2026-11-13-selection-generator-runs.txt`.
- **The published module:** `2026-11-13-selection-rect-index/{base,end}/` hold `rect-index.js` and its map.

## Next

The architect reads this report. Base → end in §5 is `DRD-57`'s measured gain. No verdict changed, so nothing goes to `DRO-4` from this unit. The `number[]` conversion is the next unit. The independent review at `436b105c6` was not touched.
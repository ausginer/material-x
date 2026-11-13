# Slot array handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the tip of `drag/size`, at or after `31bac1381`, the dependency update. `DRD-57`'s unit has landed: its rename is `b50204f66`, and its report, [`mangle-selection-report.md`](mangle-selection-report.md), is `1719df16c`.

**One set of tools.** The base and the end are read with the same installed dependencies, which are those of `31bac1381`'s lockfile. Every check in this unit compares the end with this unit's own base. Readings in `mangle-selection-report.md` and in older records were taken with the tools before the update, so they aren't targets, and nothing in this unit is compared with them. Between item 1 and the end, don't run `npm install` or `npm ci`, and don't change `node_modules`, a lockfile or a browser.

**Owner amendment, 2026-11-13: local browser checks use Chromium only.** Firefox and WebKit checks are deferred to the separate CI that the owner plans; that CI is not established by this handoff. This replaces the browser installation, launch and three-engine requirements below as they stood at `8f18d2f67`. The return at `b66a9bf6d` remains historical evidence. Resume with the current container's Chrome (`/usr/local/bin/chrome`, configured in `.scripts/vitest-config.ts`), without restoring WebKit or installing browsers. The local verification rule is recorded in [the performance plan](performance-plan.md#3-rules-every-unit-follows).

**Governing records:**

- `DRD-58` in [`00-index.md`](00-index.md), properties 1 to 9 and its cost list. This is the owner's direction of 2026-11-13;
- `DRD-52` as `DRD-58` amends it: `RectIndex`'s ownership and `_lend`;
- `DRD-50` property 1 and its witnesses W7 and W8: range settling in the cache's own buffer;
- `DRD-39`: the installer types are unpublished;
- `DRD-56` property 4 and `DRD-57` property 4: the committed map;
- `DRD-51` properties 1 to 3: readings, control rows and the stopped campaigns;
- CONTRIBUTING Part I §Class encapsulation and Part II §8.

**Names.** `DRD-58` names members as they are at `436b105c6`. `DRD-57` prefixes `values`, `items`, `end`, `invalidate` and `retire` on `RectIndex`, so at this unit's base they are `_values`, `_items`, `_end`, `_invalidate` and `_retire`. Use the base's names.

**Goal:** after this unit, `RectIndex`'s slot buffer is one `number[]` that is created with the index, grows only by appending, and is never replaced. `#capacity` and `capacityFor` are gone. The `values` getter and `_lend` state no lifetime, and `_lend` has no reentrancy rule. The geometry, the window, every fixed-size buffer and every behavior are unchanged. The report gives the costs, and no cost reading returns the unit.

**The independent review stays pinned to `436b105c6`** and runs in its own sessions. This unit doesn't read, cite, stage or change `.plan/reviews/publish-mangle/`, and it doesn't wait for that review.

## Boundaries

**Change only:**

- **`packages/drag/src/sortable/rect-index.ts`:** `DRD-58` properties 1 to 7.
- **`packages/drag/src/sortable/axis.ts`** and **`packages/drag/src/sortable/layout-animation.ts`:** the type of `settle`'s `values` parameter (property 7), and nothing else.
- **`packages/drag/src/sortable/linear-shift.ts`:** the type of `advance`'s `values` parameter, and a comment whose reason is that `_collect` replaces the buffer.
- **`packages/drag/src/sortable/xy.ts`** and **`packages/drag/src/sortable/y.ts`:** only a comment whose reason is that `_collect` replaces the buffer. `xy.ts`'s `before` doesn't change.
- **`packages/drag/tests/displacement-sink.browser.test.ts`:** the `SettleCall` type, `measurementsOf`, `expectCacheRanges` and the comment above `recordSettles` (property 9). No test title or other assertion changes.
- **Records:** the report, and `measurements/` files with the prefix `2026-11-<day>-slot-array-`.

**Do not change:**

- any fixed-size buffer: `#placeholderRect`, `_holds`'s scratch, `linear-shift.ts`'s probe scratch and `heldPlaceholder`, `ReadonlyFloat64Array`, and everything outside `src/sortable/`, which includes box-quad's out parameters, `free-drag/geometry.ts`, the stories and the fixtures;
- `xy.ts`'s `before` buffer;
- `_lend`'s existence or its name. It stays the class's write method;
- `build/`, `tsdown.config.ts`, `tsconfig.json`, `tests/publication.node.test.ts`, `package.json`, `files.json`, `.scripts/`, `bench/` and every Vitest configuration. That includes every size row, ceiling and control figure. **The build pipeline stays as it is at the base.** The publication redesign is separate work, and nothing from it or from the pinned review enters this unit;
- the root `package.json`, any lockfile, `node_modules`, browser installations or the host libraries. This unit requires no environment recovery;
- any committed probe under `.plan/probes/`;
- `.plan/reviews/`.

**Do not run:**

- `compare.ts` scenarios, `--prove` or `--floors` without `--dry`. `DRD-58` measures no timing;
- the page check, B3' or the in-page floors.
- Firefox or WebKit checks, `npx just test-engines`, browser installation or WebKit dependency recovery.

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`. Wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table.**

## Item 1. The base

Before any change, from `packages/drag`:

1. **Record the tools:** the versions of Node, `rolldown`, `tsdown`, `vitest`, `@vitest/browser-playwright`, `playwright`, `typescript`, `typedoc`, `size-limit` and `@size-limit/file` as they resolve from `packages/drag`, and Chrome's `--version`. Record the same list again at the end. The two lists must be identical.
2. **Record that `DRD-57` landed:** `git log --oneline 436b105c6..HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/build` lists only `b50204f66`, and `build/property-names.json` has 53 keys, among them `_values`, `_items` and `_end`.
3. **Run the Chromium suite through the runner,** and record every title and verdict. Every test passes except size rows. Record each size row's verdict as it is: the end is compared with these verdicts.
4. **Take the base size reading** with `npx just size`, and record every row. Don't compare it with older records.
5. **Regenerate the map at the base:** `node build/generate-property-names.ts --out <scratch>`, unchanged. The file must be byte-identical to `build/property-names.json`. The architect's run at `31bac1381` with the updated tools gave 53 names and 263 occurrences, and the file was byte-identical.
6. **Keep the base build.** Copy the emitted `.d.ts` files to a scratch directory outside the checkout, for item 4.
7. **Run `typedoc --options typedoc.json --out <scratch>`** and record its warnings. Expected: exactly `AxisInstaller` and `DisplacementInstaller` (`DRD-39` property 3).
8. **Take the base allocation readings** (item 5).

## Item 2. The slot array

**Required properties:** `DRD-58` properties 1 to 7. In short:

1. **One `number[]`.** `#values` is `readonly` and created with the index. Nothing assigns it again. `#capacity` and `capacityFor` are removed, with every comment that states a capacity or a replacement.
2. **Growth by appending.** Before `_measure` writes a slot, the array's length covers it. `_collect` appends numbers at the array's end, and only when the collection has more slots than the array holds. No write lands past the array's length, and nothing assigns `length` upward. `DRD-58`'s §Why it must grow by appending gives the reason: `y()`'s window starts mid-collection. The array never shrinks, and `retire` keeps it.
3. **The geometry doesn't change.** `pack`'s arithmetic, `STRIDE` and the field offsets, the window, `_measure`'s and `settle`'s ranges, `_holds`, `verifyEquivalence` and every read site keep their logic.
4. **The `values` getter** returns `readonly number[]`. Its JSDoc says that the array is the same for the index's life and that its contents are valid inside the window. The sentence "Valid until the next `_collect` …" goes.
5. **`_lend`.** `write` receives `number[]`. The JSDoc keeps the extent rule, says that `write` writes the array only during the call, and keeps "This is the rule `_measure` gives the sink's `settle`, and nothing checks it at runtime". The lifetime bullet and the reentrancy bullet go.
6. **Shared signatures.** `pack`'s `target` and `settle`'s `values`, in `axis.ts` and in `layout-animation.ts`, are `number[] | Float64Array`, written in each parameter and not named. No call site casts, copies or converts.
7. **Comments.** The module JSDoc describes one `number[]` and `RectIndex` as the only code that grows it. `#values`'s JSDoc says that it grows by appending and never shrinks. A comment in `linear-shift.ts`, `xy.ts` or `y.ts` whose reason is that `_collect` replaces the buffer is rewritten or removed. The report lists each one. `xy.ts`'s "before the refresh rewrites the buffer" stays, because the refresh does rewrite the contents.

**Show property 2 by reading, not by an instrument.** The report lists every site that writes the slot array and the one site that grows it, each with its line, and says for each write why its index is below the length.

## Item 3. The tests

**Required properties** (`DRD-58` property 9):

1. **The helpers.** `measurementsOf` identifies a measurement's call by `Array.isArray(call.values)`, not by its `ArrayBuffer`. `expectCacheRanges` drops the `byteOffset` and `buffer.byteLength` assertions, and asserts that each call's `values` is an array, together with the identity, length and range assertions it has now. The `SettleCall` fields `values` and `settled` take the union. The comment above `recordSettles` describes the slot array and the one-slot scratch.
2. **No other change.** Every title, and every other assertion in the file, stays.
3. **The copy mutation.** In a scratch copy, make `_measure` pass `settle` a copy of the slot array (`values.slice()`) instead of the array itself. Run the two `drag:DRD-50` tests that call `expectCacheRanges`. Both must fail in Chromium. Save the patch and the output.
4. **M8 again.** Apply `DRD-50`'s M8, a `settle` that ignores the range's start, to the new tree in a scratch copy. "drag:DRD-50 should settle a row in flight when the window grows over it, and hold the gap its flow position gives" must fail in Chromium. Save the patch and the output.

## Item 4. The publication

1. **The map.** Run `node build/generate-property-names.ts --out <scratch>`, unchanged. Its output must be byte-identical to the committed map, as at item 1 step 5. If it isn't, stop and return.
2. **The publication test** (`tests/publication.node.test.ts`) passes, unchanged.
3. **`.d.ts` files.** Compare every emitted `.d.ts` and `.d.ts.map` with item 1 step 6's copy. **Exactly one difference is expected:** in `sortable/axis.d.ts`, `settle`'s `values` parameter is `number[] | Float64Array`. Its `.d.ts.map` may differ with it. No `.d.ts` is added or removed. Save the diff.
4. **`typedoc`** warns exactly as at item 1 step 7.

## Item 5. Readings

**Size.** Report every row with `npx just size` at the base and at the end: minified, gzip-9 and Brotli-11, the difference base → end, and each row's verdict at both points.

- **Control rows:** "draggable alone", "draggable + lift", "example: resize handle", "example: drop zone", "example: canvas group", "freeDrag" and "freeDrag + bounds + landing". None of them contains `sortable`. Each must read exactly 0/0/0. A non-zero control row is a finding: report it before you continue.
- "sortable + y", "sortable + xy" and "complete" are the rows that can change. Give each one's difference with its cause.
- Every row's module list must be unchanged.
- **A verdict that changes isn't a return condition.** List it, and keep the ceiling. The architect routes it to `DRO-4`.

**Allocation,** with `DRD-52`'s probes, at the base and at the end, in Chromium, in the `shipped` project. Use [the probe README](probes/rect-index-ownership/README.md)'s §Launching the allocation probes: a scratch worktree for each tree, the probe files appended to a scratch copy of `tests/hot-path.browser.test.ts` and never to the committed file, and one probe test per launch, through the runner. Both worktrees run with the checkout's installed packages and item 1 step 1's tools, and nothing is installed into either worktree.

- **Per sample:** `y()` and `xy()`, three runs each.
- **Per committed move, cold:** `move-probe.test.ts.txt` as written. Three runs.
- **Per committed move, warm:** `warm-move-probe.test.ts.txt`. Three runs.

Save every printed line, with each function's bytes. Report the means and spreads at both trees and the difference. **These readings aren't gated.** Name every function whose bytes grew, and say whether the difference is larger than the spread inside either tree. A line that reads 0 B with no function under `sortable/` isn't a reading. Discard it, keep it in the record with the reason, and repeat the launch.

**Timing isn't measured** (`DRD-58`). The report says so.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | The tools, `DRD-57`'s landing, the base Chromium suite, size, map, `.d.ts` copy, `typedoc` warnings and allocation readings are all recorded |
| The tools | Item 1 step 1's list is identical at the base and at the end |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| `grep -n "capacity\|Float64Array" src/sortable/rect-index.ts` | Only the fixed-size buffers and the `number[] \| Float64Array` parameters |
| Property 2 | The report's list of write and growth sites |
| The source projects | `browser`, `shipped` and `declaration` run the same titles with the same verdicts as at the base |
| The node project | The same titles and verdicts as at the base, apart from size rows. Each size verdict that changes is listed |
| The consumer project | The same files and tests as at the base. All pass |
| `drag:DRD-52 development equivalence check` and every `drag:DRD-50` test | Pass in Chromium |
| The copy mutation and M8 | Item 3.3 and item 3.4 |
| Item 4 | The map is byte-identical, the publication test passes, the `.d.ts` diff is item 4.3's one line, and `typedoc` is unchanged |
| Firefox and WebKit | Deferred to the owner's planned CI; not run or required for this local unit |
| `tests/hot-path.browser.test.ts`, `shipped` project | Every test passes |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, with `npx just` from `packages/drag` |
| Markdown | `handoff.md`'s Markdown checks |

## Commits

- **One commit:** the slot array, the signatures and the test helpers.
- **The report** goes in its own commit.

## Report

Write `slot-array-report.md` beside this file. Preserve its existing returned section and evidence, and add a resumed section for this implementation. Save under `measurements/`, unedited:

- the tool list at the base and at the end;
- the runner's status and logs for the base and end Chromium suites;
- the base and end size readings;
- every allocation probe line, with each discarded launch and its reason;
- the copy mutation and M8, each with its patch and output;
- the `.d.ts` diff, and both `typedoc` outputs.

The report gives:

- each commit and what it carries;
- every changed declaration against `DRD-58` property 7's table, and each rewritten or removed comment;
- property 2's write and growth sites;
- every check above;
- the size table, the allocation table and the costs that `DRD-58` lists as expected and not measured, each marked as observed or inferred.

## Return to the architect

Stop and return if:

- at the base, a Chromium or non-browser test other than a size row fails, or the regenerated map differs. Return before any source change;
- the tool list at the end differs from the base's;
- the slot array can't stay free of holes without a write past its length or an upward `length` assignment;
- a fixed-size buffer, `xy.ts`'s `before`, or a file outside §Boundaries would have to change;
- a call site needs a cast, a copy or a conversion between `number[]` and `Float64Array`;
- a test fails that passed at the base, apart from size rows;
- the copy mutation or M8 doesn't fail its witness;
- the generated map differs, or a `.d.ts` differs other than item 4.3's line, or `typedoc` warns about another type;
- a control row isn't 0/0/0.

A cost reading never returns the unit.

## After this unit

The architect reads the report.

- **The size table's base → end column and the allocation table are `DRD-58`'s measured costs,** and they go to the owner. Each verdict that changed goes to `DRO-4`.
- `xy.ts`'s `before`, and fixed-size buffers as `number[]`, stay outside `DRD-58` unless the owner extends it.
# Mangle selection handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the commit that carries this handoff. Its `packages/drag` `src`, `tests`, `bench`, `build`, `tsconfig.json`, `tsdown.config.ts`, `package.json` and `files.json`, and `.scripts/`, are `436b105c6`'s.

**Governing records:**

- `DRD-57` in [`00-index.md`](00-index.md), properties 1 to 6, and [`mangle-selection-audit.md`](mangle-selection-audit.md) §3 to §5, which hold the selection and the exclusions;
- `DRD-56` properties 1, 3 and 5 to 9, which apply as written;
- `DRD-51` properties 1, 3 and 4: readings, the stopped campaigns, and runtime checks;
- [`publish-mangle-handoff.md`](publish-mangle-handoff.md) and [`publish-mangle-report.md`](publish-mangle-report.md), for the scripts that this unit reuses;
- CONTRIBUTING Part I §Class encapsulation.

**Goal:** after this unit, the 30 declarations in the audit's §3 carry a `_` prefix in `src`, the committed map has 53 keys, and `just build` publishes all 53 names short. Nothing else changes: no public name, no platform name, no `#private` member, no installer member, no part of the pipeline and no budget.

**The independent review stays pinned to `436b105c6`** and runs in its own sessions. This unit doesn't read, cite, stage or change `.plan/reviews/publish-mangle/`, and it doesn't wait for that review.

## Boundaries

**Change only:**

- **`packages/drag/src/`:** renames of the 30 selected declarations and their uses, made with the type checker. A comment that names a renamed member in code font follows the rename. Nothing else changes.
- **Followers of the rename,** where code names a renamed member, and nothing else in them:
  - `tests/callback-list.browser.test.ts`: `add`, `has` and `clear` on the list;
  - `.plan/probes/callback-list/allocation.ts`, line 50: `add`;
  - `bench/compare.ts`, line 1180: the replacement text `this.#steps.add(step, receiver);`.

  The audit found no other test or bench line. If `tsc` finds one, it follows too, and the report lists it.

- **`build/property-names.json`,** generated again by `build/generate-property-names.ts`.
- **Records:** the report, and `measurements/` files with the prefix `2026-11-13-selection-` or the date of the run.

**Do not change:**

- `build/generate-property-names.ts`, `build/property-names.ts`, `build/rename-properties.ts`, `tsdown.config.ts`, `tsconfig.json`, `tests/publication.node.test.ts`, `package.json`, `files.json` or `.scripts/`;
- `bench/size/measure.ts`, `tests/size.node.test.ts` and the Vitest configurations: every row, ceiling, control, fragment and bundling setting;
- any declaration that the audit's §4 or §5 lists. That includes every installer member, every member that a `.d.ts` declares, and `x` and `y` everywhere;
- any test's title or assertion, apart from renames;
- `.plan/reviews/`.

**Do not run:**

- `compare.ts` scenarios, `--prove` or `--floors` without `--dry`;
- the page check, B3' or the in-page floors;
- the consumer files in Firefox and WebKit. `DRD-56` property 8 made that run once, and the renaming class doesn't change.

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`. Wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table.**

## Item 1. The base

Before any change:

1. **Record that this command prints nothing:**

   ```sh
   git diff --stat 436b105c6 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/build packages/drag/tsconfig.json packages/drag/tsdown.config.ts packages/drag/package.json packages/drag/files.json .scripts
   ```

2. **Run the Chromium suite through the runner.** Expected as at `mangle-end`:
   - 751 tests, of which 747 pass;
   - the four size rows fail: "draggable alone", "example: drop zone", "freeDrag + bounds + landing" and "complete";
   - `consumer` passes 326 of 326.
3. **Take the base size reading** with `npx just size`. Every row's minified, gzip-9 and Brotli-11 bytes must equal the end column of [`publish-mangle-report.md`](publish-mangle-report.md) §8.
4. **Keep the base tree.** Copy the published files, the 90 files that `package.json`'s `files` selects, to a scratch directory outside the checkout, and save each file's SHA-256 under `measurements/`.
5. **Record which injections apply at the base,** one entry at a time, with [`2026-11-13-mangle-dry-each.sh.txt`](measurements/2026-11-13-mangle-dry-each.sh.txt). Expected as in the report §1: 6 `--prove` entries and 7 `--floors` entries apply, and the 10 entries at `MOVE_SITE` don't.

## Item 2. The rename

**Required properties** (`DRD-57` properties 1 to 3, `DRD-56` property 3):

1. **Rename by declaration, not by name.** For each row of the audit's §3, rename that declaration, `name` → `_name`, with the type checker's rename at its declaration, so that every use follows. A declaration with the same name that isn't in §3 keeps its name. For example:
   - `RectIndex.invalidate` is renamed, and `InsertionGeometry.invalidate`, `MotionConstraint.invalidate`, `DropTargetTracker.invalidate` and the controllers' `invalidate` keys stay;
   - `FrameTask.cancel` is renamed, and every `Animation.cancel()` call stays;
   - `List.add` and `List.has` are renamed, and the `WeakSet`s in `kernel/gesture.ts` keep `add` and `has`.

   A script that selects by name, as [`2026-11-13-mangle-rename.ts.txt`](measurements/2026-11-13-mangle-rename.ts.txt) does, doesn't meet this property as it is. One that takes the 30 declarations by file and line does.

2. **Members that one declaration covers.** Where §3 gives an interface member and the object literal that implements it (`LinearShift` and `FrameTask`), or a type and the literal that builds it (`NamedLanding` and `PressState`), both are renamed together.
3. **Two shorthand keys change form:** `landing` in `lift.ts` 308 becomes `_landing: landing`, and `visual` in `sortable/behavior.ts` 280 becomes `_visual: visual`. The local bindings stay.
4. **Comments.** The `RectIndex` class comment at `rect-index.ts` 74 and 75 names `values` and `items`, and the `List` class comment at `callbacks.ts` 24 and 25 names `has` and `add`. They follow. A comment that names a member with the same name on another declaration doesn't.
5. **Nothing else changes in `src`.** No statement, type, member order or `#private` field changes. If prefixing a declaration would require any other change, stop and return.
6. **No injection goes stale.** After the rename, the dry checks, run as in item 1.5, must report the same entries applying as at the base. "one entry on the step list per frame" applies through its followed replacement text.

## Item 3. The map

**Required properties** (`DRD-57` property 4, `DRD-56` property 4):

1. **Generate the map** with `node build/generate-property-names.ts`, unchanged. It has 53 keys, the 29 existing ones and these 24: `_add`, `_axis`, `_bottom`, `_bounds`, `_box`, `_cancel`, `_clear`, `_displacement`, `_duration`, `_easing`, `_end`, `_has`, `_invalidate`, `_items`, `_landing`, `_left`, `_moveTo`, `_moved`, `_retire`, `_right`, `_top`, `_translate`, `_values`, `_visual`.
2. **Run it twice,** and record that both outputs are equal and equal the committed file.
3. **Report the map's diff:** every new key with its output name, and every existing key whose output name changed. The generator orders names by frequency, so existing entries may change.

**The rename and the map are one commit.** The step fails a build on a prefixed name that the map lacks, so a commit with the rename alone doesn't build.

## Item 4. Validation

1. **The publication test** (`tests/publication.node.test.ts`) passes, unchanged.
2. **`.d.ts` files.** Every emitted `.d.ts` and `.d.ts.map` file is byte-identical to the base tree's. If one differs, a selected declaration is published: undo that declaration's rename, keep it unprefixed, and record it in the report.
3. **`src`'s diff is only renames.** Run [`2026-11-13-mangle-rename-check.sh.txt`](measurements/2026-11-13-mangle-rename-check.sh.txt), with `N` extended to the 53 names, against `436b105c6`. It must report 0 files differing. Save the script as run.
4. **The step check.** Run [`2026-11-13-mangle-step-check.ts.txt`](measurements/2026-11-13-mangle-step-check.ts.txt) on the end tree, against the same source built without the step. Build that tree as [`2026-11-13-mangle-generator-build.ts.txt`](measurements/2026-11-13-mangle-generator-build.ts.txt) does, with every plugin but the step's, into a scratch directory outside the checkout, but keep the configuration's source maps and declarations. The check must report 0 failures. List every `member start` mapping. Each one must be a class field with only modifiers before its name, within `DRD-56` property 6's exception. The selected `readonly` fields of `FreeDragBehavior` and `SortableBehavior` are expected among them.
5. **V5.** Build twice from one tree, with [`2026-11-13-mangle-v5.sh.txt`](measurements/2026-11-13-mangle-v5.sh.txt). Every published file is byte-identical between the two builds.
6. **A look at the published code.** Save `sortable/rect-index.js` from the base tree and from the end tree, with its source map, under `measurements/`.

No witness is owed. The step and the publication test don't change, and `DRD-56`'s M1 to M7 still apply to them.

## Item 5. Readings

**Size.** Report every row with `npx just size` at the base (item 1.3) and at the end: minified, gzip-9 and Brotli-11, the difference base → end, and each row's verdict at both points.

- The booked figure is base → end (`DRD-51` property 1).
- Every row's module list must be unchanged.
- **A verdict that changes isn't a return condition.** List it, and keep the ceiling. The architect routes it to `DRO-4`.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty, and the base suite, size, tree and dry checks are recorded |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| The selection | Each of the audit's 30 declarations prefixed, and no other declaration: the report gives each with its rename locations |
| `src`'s diff | Item 4.3 |
| The source projects | `browser`, `shipped` and `declaration` run the same titles with the same verdicts as at the base |
| The node project | The same titles as at the base. Only size rows fail, and each verdict that changes is listed |
| The consumer project | 22 files and 326 tests against the renamed build. All pass |
| The publication test | Passes |
| `.d.ts` | Item 4.2 |
| The dry checks | Item 2.6 |
| The step check | Item 4.4 |
| V5 | Item 4.5 |
| Three engines (`npx just test-engines`) | No failure: 1,071 passed and 18 skipped. In this container, source `~/.cache/ms-playwright/webkit-env.sh` first |
| `tests/hot-path.browser.test.ts`, `shipped` project | Every test passes |
| The suite's wall time | Recorded at the base and at the end. Not gated |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, with `npx just` from `packages/drag` |
| Markdown | `handoff.md`'s Markdown checks |

## Commits

- **One commit:** the rename, the lines that follow it, and the generated map (item 3).
- **The report** goes in its own commit.

## Report

Write `mangle-selection-report.md` beside this file. Save under `measurements/`, unedited:

- the runner's status and logs for the base suite, the end suite and the three-engine run;
- the dry checks at the base and at the end;
- the base tree's hashes;
- the rename locations, the rename check, the step check and V5;
- both generator runs;
- the size readings.

The report gives:

- each commit and what it carries;
- every renamed declaration with its rename locations, the two shorthand keys, the followed comments, and every changed test, bench and probe line;
- the map's diff (item 3.3);
- every check above;
- the wall time before and after.

## Return to the architect

Stop and return if:

- item 1 isn't empty, or the base size reading differs from the report's end column;
- prefixing a declaration needs any change besides the rename and the two shorthand keys;
- the type checker's rename of a selected declaration reaches a declaration that the audit's §4 or §5 lists;
- **a consumer test fails on the renamed build and passed at the base.** The renaming broke something, and the architect decides it;
- a source project's titles or verdicts change, apart from size rows;
- a `.d.ts` changes and undoing the declaration doesn't restore it;
- an injection that applied at the base doesn't apply after the rename;
- the generator, the step or the publication test would have to change;
- a row's module list changes;
- two builds of one tree differ;
- the change needs a file outside §Boundaries.

## After this unit

The architect reads the report.

- **The size table's base → end column is `DRD-57`'s measured gain.** Each verdict that changed goes to `DRO-4`.
- The type-directed transform stays deferred ([`performance-plan.md`](performance-plan.md) §6).
- Findings of the independent review at `436b105c6` are routed by the architect when that review reports. This unit doesn't anticipate them.
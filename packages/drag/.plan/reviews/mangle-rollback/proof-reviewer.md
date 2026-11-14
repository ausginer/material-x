# Mangle rollback and main integration: feature proof

**Lens:** `reviewer`, feature proof. The owner pinned two separate scopes on `drag/size` at `55e109210`:

1. **The rollback:** `DRD-60` properties 1, 2 and 4, as §Independent review of [`mangle-rollback-handoff.md`](../../mangle-rollback-handoff.md) states them, with no browser run.
2. **The main integration:** the merge `6296b741a` against both of its parents and against [`main-integration-report.md`](../../main-integration-report.md). This covers the `layout-animation.ts` conflict and the `space()` migration in the new displacement-sink test helper, with focused checks.

The two scopes have separate evidence and separate conclusions below. I didn't repeat any timing, allocation or deferred campaign, and I didn't repair any baseline failure.

**Commit read:** `55e109210` on `drag/size`, the commit that adds §Independent review to the handoff. `DRD-60` and the handoff were read as they stand there. The historical commits were read in detached scratch worktrees (§Method).

**Order of reading.** For each scope I read the code before the report:

- **Rollback:** `DRD-60`, then `git diff 7420cbb9a b8e37b37c -- packages/drag ':!packages/drag/.plan'`, then my checks. I read [`mangle-rollback-report.md`](../../mangle-rollback-report.md) at `8904947f6` and its measurements only after that.
- **Integration:** the merge's diff against each parent, then my checks. I read the integration report last.

## Method

- **Three detached scratch worktrees** in my session's scratch directory, at the base `7420cbb9a`, commit A `cc752cc1b` and commit B `b8e37b37c`.
  - [`setup-worktree.sh`](proof-reviewer-probes/rollback/setup-worktree.sh.txt) made each one. Every `node_modules` entry links to the checkout's installed packages, except `@ydinjs/*`, which link to the worktree's own packages. Each package's own `node_modules` links to the checkout's. Nothing was installed.
  - In each worktree I built `@ydinjs/vite-traits-plugin`, `@ydinjs/box-quad` and `@ydinjs/drag` at that commit with `npx just build` ([log](proof-reviewer-probes/rollback/builds.txt) for the base and B; A's build printed the same "Build complete" line and wasn't saved).
  - A worktree-local box-quad matters: main's box-quad (`7d8d7a805`) removed the `space()`, `box()` and `delta()` factories that these commits import.
- **"Published"** means `npm pack --dry-run`'s file list for `packages/drag` ([base](proof-reviewer-probes/rollback/packlist-base.txt), [A](proof-reviewer-probes/rollback/packlist-a.txt), [B](proof-reviewer-probes/rollback/packlist-end.txt)).
- **Integration checks** ran in the main checkout. Its code outside `.plan/` is identical to `6296b741a`'s ([trees](proof-reviewer-probes/integration/trees.txt)).
- **No tracked file was edited** in the checkout or the worktrees. My outputs are in [`proof-reviewer-probes/`](proof-reviewer-probes/), unedited. Their paths name my scratch directory. The saved `git diff` outputs keep the trailing space of their blank context lines, which `git diff --check` reports in two files.

## Scope 1: the rollback

### Scope

**Covered:** `DRD-60` properties 1, 2 and 4, the part of property 3 that §Independent review lists, and the report's claims for items 2 to 4.

**Out of scope,** as the handoff states: the suite and the consumer project, the size rows and their verdicts, the baseline lint and typecheck errors (`DRF-38`, `repo:RF-31`), `DRF-40`, everything after `8904947f6`, timing, allocation, Firefox and WebKit. No browser ran in this scope.

### Property 1: the source names, at `b8e37b37c`

**Holds.**

- **Markers.** `git grep -nE '\b_[A-Za-z]'` finds nothing in `src` or `bench`. In `tests` it finds only the five `_name` parameters: `coordinates.browser.test.ts` 89, 146 and 284, `landing.browser.test.ts` 162 and `sortable.browser.test.ts` 585. The same five exist at `f7b7b300b^`, so they were never markers ([output](proof-reviewer-probes/rollback/property1-checks.txt)).
- **The code tree against `f7b7b300b^`,** outside `.plan/`: exactly `package.json` and the five files of `5ec3b4b2d`. The `package.json` change is only the dependency update, `@types/react` and `@types/react-dom` to 19.3.0.
- **`DRD-58`'s lines.** In each of the five files, the changed lines of `git diff -U0 f7b7b300b^ b8e37b37c` equal those of `git diff -U0 5ec3b4b2d^ 5ec3b4b2d` once each `\b_([A-Za-z])` in the latter is read as its letter. That is 2, 2, 4, 66 and 21 lines, 95 in all ([output](proof-reviewer-probes/rollback/property1-drd58-lines.txt)).
- **`.plan/probes/callback-list/allocation.ts`** is blob `3fc8936ea` at both `f7b7b300b^` and `b8e37b37c`.
- **`DRD-58` §Result's types** ([output](proof-reviewer-probes/rollback/drd58-types.txt)):
  - `get values(): readonly number[]`;
  - `lend`'s `write: (values: number[], lo: number, hi: number) => void`;
  - `pack`'s `target: number[] | Float64Array`;
  - `settle`'s `values: number[] | Float64Array` in `axis.ts` and `layout-animation.ts`;
  - no `capacity` anywhere in `src`;
  - the emitted `sortable/axis.d.ts` keeps `settle(values: number[] | Float64Array, …)`.
- **The rename is the marker reading and nothing else.** [`marker-read.sh`](proof-reviewer-probes/rollback/marker-read.sh.txt) compares each file that changed from the base to B, with every `\b_([A-Za-z])` in the base read as its letter ([output](proof-reviewer-probes/rollback/marker-read-base-end.txt)).
  - 14 `src` files, both followers, `bench/compare.ts` and the probe are equal under that reading.
  - The other seven `src` files differ only at the expanded keys, which are now shorthand: 24 keys in `lift.ts`, `sortable/behavior.ts`, `layout-animation.ts`, `linear-shift.ts`, `rect-index.ts`, `xy.ts` and `y.ts`. That equals the location files' 11 and 13 `name → _name: name` records.
  - The record literal in `layout-animation.ts` is on one line again.
  - Comments follow: no comment line differs from the reading.

### Property 2: the build, at `7420cbb9a` and `b8e37b37c`

**Holds.**

- **`build/`** has four files at the base and none at B. `tsdown.config.ts` is blob `0c81e0f32` and `tsconfig.json` is blob `745c8a8e0` at both `f7b7b300b` and B ([output](proof-reviewer-probes/rollback/property2-3-checks.txt)).
- **The published file list** is the same 92 paths at the base, A and B: 33 `.js`, 30 `.js.map` and 27 `.d.ts`, plus `README.md` and `package.json`.
- **Declarations.** All 27 `.d.ts` files at B are byte-identical to the base's, so they also equal the base's read without markers. No `.d.ts.map` is published or built, and no `.d.ts` has a `sourceMappingURL` ([comparison](proof-reviewer-probes/rollback/published-compare-base-end.txt), [probe](proof-reviewer-probes/rollback/published-compare.mjs.txt)).
- **No marker is published.** No published `.js` or `.d.ts` at B contains a `\b_[A-Za-z]` name, in code or in comments.
- **Source maps.**
  - Each of the 30 `.js.map` files has mappings, and its `.js` links it.
  - Each `sourcesContent` entry equals both its file under `src` at `b8e37b37c` and the worktree's file.
  - The three `landing.js` files are one-line re-exports, with no map and no link, at the base and at B.
  - Each map's `sources` list equals the base's.
- **For information:**
  - B's `.js` files differ from the base's on 19 files. Each differing line is a minified property name at the base and a source name at B, and each line count is unchanged.
  - Against commit A, the 27 `.d.ts` files are byte-identical. 27 of the 33 `.js` files are equal once A is read without markers. The other six differ on 10 lines, each a `key: key` at A and a shorthand key at B ([comparison](proof-reviewer-probes/rollback/published-compare-a-end.txt)).
  - Against the base, A's `.js` files differ only where A writes a `_` name in place of the base's output name. That gives 53 prefixed names, each with one output name, and no other difference ([probe](proof-reviewer-probes/rollback/base-a-js.mjs.txt), [output](proof-reviewer-probes/rollback/base-a-js.txt)).

### Property 3, as §Independent review lists it

**Holds.** Between `7420cbb9a` and `b8e37b37c`:

- `tests/publication.node.test.ts` is the only test file removed;
- `.scripts/`, `package.json`, `files.json`, the `Justfile`, `vitest.config.ts`, `vitest.engines.config.ts`, `tests/support/` and `bench/size/` have no diff;
- under `.plan/`, only the probe `allocation.ts` changed.

[Output](proof-reviewer-probes/rollback/property2-3-checks.txt).

### Property 4: the dry checks

**Holds.** I ran [`2026-11-13-mangle-dry-each.sh.txt`](../../measurements/2026-11-13-mangle-dry-each.sh.txt) unchanged from `packages/drag` in the base and B worktrees.

- **The two outputs are byte-identical** ([base](proof-reviewer-probes/rollback/dry-base.txt), [B](proof-reviewer-probes/rollback/dry-end.txt)). 13 entries apply: `--prove` 6 of 9 and `--floors` 7 of 14.
- **The 10 entries that fail** fail on the same `#lift.translate` find text in `sortable/operation.ts`. That matches the count of 10 stale entries in `DRD-45` property 9.
- **The script covers every entry.** At both commits, `INJECTIONS` names the script's 9 `--prove` entries. `FLOORS` expands its `us` lists to the script's 14 `--floors` entries.

No browser started.

### The report's claims for items 2 to 4

They agree with my results, apart from finding `rollback-reviewer-1`.

- **My builds reproduce the saved trees.** Each of the 90 hashes in `2026-11-13-rollback-base-tree.sha256`, `-a-tree.sha256` and `-end-tree.sha256` matches my build of that commit ([output](proof-reviewer-probes/rollback/saved-hash-check.txt)).
- **Item 2:** the removed line counts, the configuration diffs (+1 −5 and −1), the 90-path list and the 27 byte-identical `.d.ts` files all match. The base's 16 marker occurrences on 12 comment lines account for the report's "12 differing lines are all comments" ([output](proof-reviewer-probes/rollback/base-markers.txt)). My own A-against-base check found no code difference other than the prefixed names.
- **Item 3:**
  - the 95 equal lines, the five `_name` parameters, the six files of the stat and the probe's equality all match;
  - so do the 10 `.js` lines of item 3.6, as corrected on 2026-11-14, and the 24 shorthand keys.
  - The declaration table's 79 nodes match the probe output.
- **Item 4:** the dry outputs equal mine byte for byte. Item 4.2 and item 4.3 match.
- **Published size:** 307,432, 309,047 and 307,870 B at the base, A and B, as the report's table states ([output](proof-reviewer-probes/rollback/published-bytes.txt)).

### Finding

**No finding is tier A or B.**

#### The report's declaration count names 12 interface-typed keys, and its table marks 9 (`rollback-reviewer-1`, tier C)

- **Finding:** §Commit B of the report says "The probe visits 79 declaration nodes. They are the 67 declarations of the handoff. The three overload signatures … count with its implementation, and the 12 keys marked `*` belong to object literals typed by an interface".
- **Current state:**
  - the table below that sentence marks 9 keys with `*`: `lift.ts` 306 to 308, `sortable/behavior.ts` 280 to 282 and `sortable/layout-animation.ts` 107 to 109;
  - the probe's output has 13 `PropertyAssignment` nodes. Those are the same 9, plus the four keys in `free-drag/bounds.ts`'s untyped literal, which the table lists without `*`;
  - 79 − 3 − 9 = 67, which is the handoff's count. With 12, the text gives 64.
- **Why it is a problem:** the record's reconciliation of the probe's 79 nodes with the 67 declarations doesn't add up as written. The table, the probe output and the source agree with each other. The rename itself isn't affected.
- **Evidence:** [`declaration-count.txt`](proof-reviewer-probes/rollback/declaration-count.txt), and [`2026-11-13-rollback-rename-output.txt`](../../measurements/2026-11-13-rollback-rename-output.txt).
- **Required property:** the report's count of interface-typed keys equals the keys its table marks, and the stated reconciliation sums to 67.
- **Route:** architect, as part of the review's disposition. No source, test or decision is implicated.

### Evidence limits

- **One reading of the A-to-B `.js` lines.** The report read them with its own probe. I read them with a whole-file comparison under the marker reading, and the two lists agree.
- **Not rerun:** the rename probe itself. I checked its result through the tree comparisons, not by running it again.
- **No browser,** as the scope requires. The consumer project, the suite and the size rows weren't read.

## Scope 2: the main integration at `6296b741a`

### Scope

**Covered:**

- every path that changed on either side since the merge base `0a28f909a`, against both parents `f0b66c2ec` (`drag/size`) and `7d8d7a805` (main);
- the `layout-animation.ts` conflict;
- the test helper's `space()` migration, against box-quad's API at `7d8d7a805`;
- the integration report's claims.

**Focused checks:** drag's typecheck; lint and format of the two edited files; a Chromium run of the four browser test files that use `layoutAnimation` or the displacement sink, in the `browser` project.

**Not covered:** the whole suite and the consumer project, the size rows (read from the saved table, not rebuilt), whole-package lint, box-quad's own suite, Firefox and WebKit.

### Every path, against both parents

**Each path but two was taken whole from the only side that changed it.** [`merge-classify.sh`](proof-reviewer-probes/integration/merge-classify.sh.txt) compares each path's blob at the merge with the base and both parents. 852 paths were taken whole. Nine need reading ([output](proof-reviewer-probes/integration/merge-classify.txt)):

- seven are the integration report and its six measurements, which the merge adds;
- `src/sortable/layout-animation.ts`, which both sides changed;
- `tests/displacement-sink.browser.test.ts`, which only `drag/size` changed and the merge edits.

`git merge-tree` on the two parents reports one conflict, in `layout-animation.ts` ([output](proof-reviewer-probes/integration/layout-animation-merge.txt)).

### The `layout-animation.ts` conflict

**Both accepted changes are preserved, and nothing else changed.**

- **Main's change** (`0a28f909a..7d8d7a805`) has two lines: the import becomes `localDelta, type Delta, type Space`, and `const local = delta()` becomes `const local: Delta = []`.
- **`drag/size`'s change** (`0a28f909a..f0b66c2ec`, `DRD-61`) does four things:
  - it rewrites the module comment;
  - it removes the `rect-index.ts` import;
  - it adds `carriedX` and `carriedY`;
  - it replaces `settle` with the `dx` and `dy` getters and `displaced`.
- **The merge against `f0b66c2ec`** changes exactly main's lines. **The merge against `7d8d7a805`** changes exactly `drag/size`'s lines. I compared each pair by its `-` and `+` lines.
- **The conflict** was adjacency: main's `const local` line sits directly above `DRD-61`'s new `carriedX` and `carriedY` declarations. The resolution keeps both.
- **`local` is used as box-quad now requires:** `localDelta(space, sx, sy, local)` writes it, and the fallback writes `local[0]` and `local[1]`. Box-quad's `Delta` documentation says that growable storage such as `[]` may start empty.

### The test helper's `space()` migration

**It follows box-quad's API and changes no assertion or routing.**

- **The edit is two lines** ([output](proof-reviewer-probes/integration/displacement-sink-migration.txt)):
  - `import { ancestry, space }` becomes `import { ancestry, type Space }`;
  - in `installXy`, `const itemSpace = space()` becomes `const itemSpace: Space = []`.
- **Nothing else in the file changed.** The assertions, the fixtures and `ancestry(setup.list, itemSpace)` are untouched.
- **API:**
  - at `7d8d7a805`, box-quad exports no factory, and `Space` is `Record<number, number>`;
  - its documentation says that growable storage such as `[]` may start empty;
  - `ancestry(element, out: Space)` writes the five slots.
  - Main's own drag migrations use the same form, for example `const visualSpace: Space = []` in `lift.ts`.
- **Routing:**
  - the file name is unchanged;
  - `packages/drag/vitest.config.ts` and `.scripts/vitest-config.ts` are `f0b66c2ec`'s blobs, and main changed neither;
  - the file stays in the source-only list at `.scripts/vitest-config.ts:622`.
- **For information:** the old `space()` returned a zero-filled `Float64Array(5)`, and `[]` is empty. They differ only after `ancestry` returns `false`, which leaves `out` untouched. The helper doesn't read that return value, before or after the merge. Its 12-cell wrapping field has no 3D ancestor, so `ancestry` writes all five slots, and the tests read the same values either way.

### Focused checks

- **Chromium, `browser` project:** `displacement-sink`, `sortable`, `callbacks` and `destruction` pass 99 of 99. The three `drag:DRD-62` tests that use `installXy` (`:465`, `:471` and `:485`) pass under `|browser (chromium)|` ([verdicts](proof-reviewer-probes/integration/focused-browser-verbose.txt)).
- **Typecheck:** `npx just typecheck` from `packages/drag` reports three errors ([output](proof-reviewer-probes/integration/typecheck.txt)):
  - `repo:RF-31` at `.scripts/tsdown-library.ts(53,11)`;
  - two `TS2724` errors in `../drag2/src/kernel/presentation.ts`, for `box` (13,3) and `space` (15,3).

  These are the three the report lists. Box-quad's built `index.d.ts` in the checkout declares the new `Space`, `Delta` and `Box` types.

- **Lint and format of the two edited files** ([output](proof-reviewer-probes/integration/lint-fmt.txt)):
  - ESLint reports one error, `DRF-38`'s `func-name-matching` at `tests/displacement-sink.browser.test.ts:59:3`;
  - oxlint reports nothing;
  - `oxfmt --check` passes.

### The integration report's claims

**They agree with what I found.**

- **The conflict:** "The only Git conflict was in `src/sortable/layout-animation.ts`", and its resolution keeps `const local: Delta = []` and `carriedX` and `carriedY`, with the import `localDelta`, `Delta` and `Space`.
- **The test helper:** "one remaining factory call in DRD-62's new test helper", and "Test assertions and fixtures are otherwise unchanged".
- **Unchanged files:**
  - `rect-index.ts`, `xy.ts`, `y.ts` and `linear-shift.ts` are `f0b66c2ec`'s blobs;
  - the merge edits no drag2 file: `package.json` is taken whole from `f0b66c2ec`'s dependency update, and neither side changed any other drag2 file;
  - `bench/size/measure.ts` is `f0b66c2ec`'s blob.
- **Typecheck:** the same three errors as my run. The drag2 errors are the ones that box-quad's `BQ-12` records as known (`packages/box-quad/.plan/coordinates-finiteness-assessment.md:42`).
- **Lint:** the `func-name-matching` error at line 59.
- **Saved logs:**
  - box-quad passes 242 of 242;
  - drag passes 747 of 752, and the five failures are the size rows the report names;
  - the size table reads 6,555, 6,544 and 7,132 B Brotli for "sortable + y", "sortable + xy" and "complete", and "complete" is 67 B over its ceiling;
  - "example: resize handle" reads 3,283 B with no violation.
- **Links:** the report has the seven links it says it has.

### Findings

**None.** No tier A, B or C finding survived in this scope.

### Evidence limits

- **The saved drag suite ran on an uncommitted tree.** [`2026-11-14-main-integration-final-status.json`](../../measurements/2026-11-14-main-integration-final-status.json) records commit `f0b66c2ec` with `dirty: true`, which is the merge in progress. Nothing saved ties that tree to `6296b741a`. My focused run used code identical to `6296b741a`, but covered four files in the `browser` project only.
- **The saved logs list no per-test routing.** The drag suite log uses the default reporter, so I confirmed the helper's routing from the configuration and my own run, not from the log.
- **Size rows** were read from the saved table, not rebuilt.

### Observation outside the merge

**drag2 doesn't typecheck against main's box-quad.** Running `tsc` in `packages/drag2` at `55e109210` reports three `TS2724` errors for the removed factories, besides `repo:RF-31`:

- `src/kernel/presentation.ts`, `box` (13,3) and `space` (15,3);
- `tests/perf/m5.browser.test.ts`, `space` (54,20).

It also reports a `TS2322` at `tests/decisions.node.test.ts:740` that doesn't involve box-quad. [Output](proof-reviewer-probes/integration/drag2-typecheck.txt).

Neither side changed these drag2 files, and box-quad at the merge is main's blob, so the merge didn't introduce these errors. `BQ-12` defers drag2. I record this only so that a silent area isn't read as a clean one.

## Scratch work

**Removed:** the three detached scratch worktrees and their `node_modules` link directories. **Kept:** nothing outside this directory.

## Next

The architect decides `rollback-reviewer-1`, and then the rollback's independent proof under `DRD-60`. Nothing here returns either unit or asks for a change to source, tests or decisions.
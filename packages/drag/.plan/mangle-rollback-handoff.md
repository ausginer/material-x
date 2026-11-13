# Mangle rollback handoff

**For:** one `implementer` unit on `drag/mangle-remediation`, from the commit that last changed this handoff, which merges `drag/size` at `f552e0ec9`. `f552e0ec9` changed only records after `690769539`, so the code is `690769539`'s, and outside its `.plan/` directories the tree equals `f552e0ec9`'s. If the owner merges this branch into `drag/size` first, the unit runs there from the merge, and nothing below changes. The unit removes code, builds, tests and measures.

**Tools:** `tsdown` 0.23.7, `rolldown` 1.3.2, `rolldown-plugin-dts` 0.30.2 and `typescript` 6.0.2, as the lockfile installs them. **If the branch is checked out in a linked worktree without installed dependencies,** run `npm ci` there, then build `@ydinjs/vite-traits-plugin` and `@ydinjs/box-quad` in it. **Engines: Chromium only** ([`performance-plan.md`](performance-plan.md) §3). Don't run Firefox or WebKit.

**Governing records:**

- `DRD-60` in [`00-index.md`](00-index.md), properties 1 to 5;
- `DRD-54` and `DRD-55`: the consumer project and the gate on the published build, which this unit doesn't change;
- `DRD-58` and its §Result, accepted on 2026-11-13: the slot array stays, with its members renamed by property 1, and keeps the types that §Result lists;
- `DRF-38` (drag's lint) and `repo:RF-31` (the shared library plugins' typecheck): errors that exist at the base. This unit doesn't repair them, and its acceptance doesn't close them;
- `DRD-51` properties 1 to 3: joint readings, and the stopped campaigns;
- CONTRIBUTING Part I, and Part II §15.

**Goal:** after this unit, `src` names its internal properties as it did before `DRD-56`, with `DRD-58`'s slot array. `just build` publishes `tsdown`'s unbundled, unminified ESM through the shared plugins alone: one readable `.js` per module with its `.js.map`, and documented `.d.ts` files without maps. `build/` and the publication test are gone. The consumer project and the gate check the build as before.

**Evidence to reuse:**

- **The commits being undone:** `f7b7b300b` (`DRD-56`'s prefixes), `31f92f5a9` (the step, the map and the publication test) and `b50204f66` (`DRD-57`'s prefixes and the map). `5ec3b4b2d` (`DRD-58`) came after them and stays.
- **Every location that the prefixing renamed:** [`2026-11-13-mangle-rename-locations.txt`](measurements/2026-11-13-mangle-rename-locations.txt) for `DRD-56`'s 37 declarations, and [`2026-11-13-selection-rename-locations.txt`](measurements/2026-11-13-selection-rename-locations.txt) for `DRD-57`'s 30. A location written `name → _name: name` is a shorthand key that the rename expanded.
- **The rename scripts:** [`2026-11-13-mangle-rename.ts.txt`](measurements/2026-11-13-mangle-rename.ts.txt) and [`2026-11-13-selection-rename.ts.txt`](measurements/2026-11-13-selection-rename.ts.txt), the type checker's rename at each declaration. They are probes, and a reversed copy is a probe too. Keep any script you run under `measurements/`.
- **The dry checks:** [`2026-11-13-mangle-dry-each.sh.txt`](measurements/2026-11-13-mangle-dry-each.sh.txt) runs each `--prove` and `--floors` entry alone with `--dry`.

**Observed by the architect at `690769539`, not a reading:** reading each `\b_([A-Za-z])` in `src`, `tests` and `bench` as its letter gives `f7b7b300b^`'s files, plus `5ec3b4b2d`'s lines. The only exceptions are the expanded shorthand keys (`lift.ts`, `sortable/behavior.ts`, `layout-animation.ts`, `rect-index.ts`, `linear-shift.ts`, `xy.ts`, `y.ts`) and five test parameters named `_name` that aren't markers. In a scratch copy, that substitution, with the shorthand keys restored and `fmt` run, passed item 3.5's diff checks. Don't apply that substitution as the rename. Use the type checker, and use the substitution only to check.

## Boundaries

**Change only:**

- `packages/drag/src/`: property 1's rename, and nothing else;
- the followers: `tests/authoring.declaration.test.ts`, `tests/callback-list.browser.test.ts`, `bench/compare.ts` and `.plan/probes/callback-list/allocation.ts`;
- `packages/drag/tsdown.config.ts` and `packages/drag/tsconfig.json`, back to their text at `f7b7b300b`;
- remove `packages/drag/build/` (four files) and `packages/drag/tests/publication.node.test.ts`;
- records: the report, and `measurements/` files with the prefix `2026-11-<day>-rollback-`.

**Do not change:**

- `package.json`, `files.json`, `Justfile`, every Vitest configuration, `tests/support/`, `bench/size/`, `.scripts/`, and every test file other than the two followers;
- `DRD-58`'s code, other than the member names that property 1 renames;
- any size row, ceiling or control figure;
- any other file under `.plan/`, including the probes, the measurements and `reviews/`. The experiments are evidence;
- no plugin, minification option, `define`, entry or chunk layout is added.

**Do not run** `compare.ts` scenarios, `--prove` or `--floors` without `--dry`, the page check, B3' or the in-page floors. Run any sequence of long processes through `node bench/campaign.ts run`, and wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table.**

## Item 1. The base

Before any change, from `packages/drag`:

1. **The suite**, all projects, through the runner. Record the titles and verdicts. The four rows that are red at `690769539` fail: "draggable alone", "example: drop zone", "freeDrag + bounds + landing" and "complete" ([`slot-array-report.md`](slot-array-report.md) §Size).
2. **The gate:** `npx just size`. Record every row.
3. **The dry checks:** each `--prove` and `--floors` entry alone with `--dry`. Record which apply.
4. **The baseline errors:** `npx just lint` and `npx just typecheck` from `packages/drag`, whole package. Record each error. Expected, and nothing else: `DRF-38`, ESLint `func-name-matching` at `tests/displacement-sink.browser.test.ts:57:3`, and `repo:RF-31`, TS2322 at `.scripts/tsdown-library.ts(53,11)`.
5. **Keep the base tree:** copy the published files to a scratch directory outside the checkout, with their hashes.

## Item 2. Commit A: the pipeline goes

1. Remove `build/` and `tests/publication.node.test.ts`.
2. Write `tsdown.config.ts` and `tsconfig.json` as `git show f7b7b300b:packages/drag/<file>` gives them. They differ from now only by the rename plugin, its two imports and its comment, and by `./build/**/*`.
3. `npx just build`, then check:
   - the published file list equals the base tree's;
   - each published `.d.ts` is byte-identical to the base tree's;
   - each published `.js` holds its `src` property names, prefixed, where the base tree held output names.
4. Format and lint the changed `.ts` files as [`handoff.md`](../../../.agents/docs/handoff.md) says, then `npx just lint` and `npx just typecheck` for the whole package. Compare each error with item 1.4's list (§Baseline errors). Run the node and consumer projects once. Every consumer test passes, and the node project fails only on the size rows that the gate reports over their ceilings.
5. The gate: `npx just size`. Record every row.

## Item 3. Commit B: the names

1. **Rename each prefixed declaration back,** with the type checker's rename at the declaration, `_name` → `name`. At `690769539` that is 67 declarations under 53 names, listed in the two location files. A declaration added since then with a marker name, if any, is a return condition.
2. **Shorthand keys.** Where a location file records `name → _name: name`, the key is written `name` again, as at `f7b7b300b^`. There are 24 such records. **`fmt` keeps an object literal on several lines once its first key is on a new line,** so the record literal in `layout-animation.ts` at 106 is written on one line again by hand, as at `f7b7b300b^`. In the architect's simulation, `fmt` restored every destructuring pattern by itself.
3. **Comments.** A comment or JSDoc that names a renamed member names it without the `_`.
4. **Followers** (`DRD-60` property 1). They change nothing else. `tests/authoring.declaration.test.ts`'s `@ts-expect-error` lines keep asserting that the published type lacks the member.
5. **Check, and record each result:**
   - `grep -rnE '\b_[A-Za-z]'` over `src` and `bench` finds nothing. Over `tests` it finds only `_name` in `coordinates.browser.test.ts` (3), `landing.browser.test.ts` (1) and `sortable.browser.test.ts` (1).
   - `git diff --stat f7b7b300b^ HEAD -- packages/drag ':!packages/drag/.plan'` lists exactly `package.json`, `src/sortable/axis.ts`, `src/sortable/layout-animation.ts`, `src/sortable/linear-shift.ts`, `src/sortable/rect-index.ts` and `tests/displacement-sink.browser.test.ts`.
   - For those five files, the changed lines of `git diff -U0 f7b7b300b^ HEAD` equal the changed lines of `git diff -U0 5ec3b4b2d^ 5ec3b4b2d`, after each `\b_([A-Za-z])` in the second is read as its letter. Compare only the lines that start with `-` or `+`, without the `---` and `+++` headers.
   - **`DRD-58` §Result's types hold,** under the restored names: the `values` getter returns `readonly number[]`, `lend`'s `write` takes `number[]`, `pack`'s `target` and `settle`'s `values` are `number[] | Float64Array`, and `#capacity` and `capacityFor` don't exist. The emitted `sortable/axis.d.ts` keeps `settle`'s `number[] | Float64Array` line. Don't use `git revert b50204f66`: it conflicts with `5ec3b4b2d`, and its reverted getter returns `ReadonlyFloat64Array`.
   - `.plan/probes/callback-list/allocation.ts` equals `git show f7b7b300b^:packages/drag/.plan/probes/callback-list/allocation.ts`.
6. **Build and compare with commit A's build:**
   - the published file list is unchanged;
   - each `.d.ts` equals commit A's after each `\b_([A-Za-z])` in commit A's file is read as its letter;
   - each `.js` equals commit A's under the same reading, except lines where commit B's source writes a shorthand key that commit A's wrote as `_name: name`. The report lists each such line.
7. **Lint and typecheck** as item 2.4, compared with item 1.4's list.

## Item 4. One-time checks

1. **The dry checks** apply the same entries as at the base (`DRD-60` property 4). Entries that `DRD-45` property 9 lists as stale stay as they are.
2. **No marker in the publication:** no published `.js` or `.d.ts` holds a `\b_[A-Za-z]` identifier or property name. This is a one-time check. Don't add a test for it.
3. **Source maps:** each published `.js` with mappings has its `.js.map`, as at the base, and each map's `sourcesContent` equals the files under `src`.

## Item 5. Readings

- **The suite**, all projects, Chromium, through the runner. Every project passes, apart from the size rows that the gate reports. **The consumer project passes 326 of 326,** including `tests/classes.browser.test.ts:190` and `tests/destruction.browser.test.ts:381` (`DRF-39`).
- **Lint and typecheck,** whole package: the end's errors, in two lists (§Baseline errors).
- **The gate:** every row, minified, gzip-9 and Brotli-11, at the base, commit A and the end, with the differences and the verdicts. Expected: each row grows by about what the mangling took off, which was 34 to 135 B Brotli when it was measured at `rolldown` 1.2.15. "example: resize handle" and "freeDrag" are expected over their ceilings, and "example: canvas group" may follow. Verdicts go to `DRO-4`, and budgets don't change.
- **Published size:** the total bytes of the published `.js`, `.js.map` and `.d.ts` files at the base and at the end.

## Baseline errors

The package's lint and typecheck exit 1 at the base, on `DRF-38` and `repo:RF-31` (item 1.4). The report gives them **apart from any new error**, at the base, at commit A and at the end:

- **Existing:** each error that item 1.4 recorded, with its file, line, rule or code, and message, and whether it is unchanged. They aren't repaired here: `tests/displacement-sink.browser.test.ts` and `.scripts/` are outside §Boundaries.
- **New:** every other error. The required result is none. A new error is a return condition, not an entry in the existing list.

A failing exit code alone isn't a result. The lists are.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | The base suite, gate, dry checks, baseline errors and tree recorded |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| Items 2 and 3 | Every check as stated |
| Item 4 | Every check as stated |
| Item 5 | The suite, the gate and the sizes |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, with `npx just` from `packages/drag`. The errors are reported in §Baseline errors' two lists, and the new list is empty |
| Markdown | `handoff.md`'s Markdown checks |

## Commits

1. **A:** the pipeline goes (item 2). It builds and passes on its own: the source still has its prefixes, and the build now keeps them.
2. **B:** the names (item 3).
3. The report and its measurements.

## Report

`packages/drag/.plan/mangle-rollback-report.md`. It identifies the base and the commits, then gives:

- the files changed and removed, with line counts;
- the declarations renamed, by file, line and name, and the shorthand keys restored;
- every check of items 2 to 4 with its result, including the `.js` lines that item 3.6 lists;
- the readings, as item 5 lists them;
- §Baseline errors' two lists, at the base, commit A and the end;
- anything that `DRD-60` didn't anticipate.

## Return to the architect

Stop and return, without working around it, when:

- the lockfile installs other versions of `tsdown`, `rolldown`, `rolldown-plugin-dts` or `typescript` than §Tools names;
- a declaration's rename collides with a name already in scope, or `tsc` reports an error that the rename caused;
- a marker name in `src` isn't in either location file;
- any check of items 2 to 4 fails;
- a consumer test fails;
- lint or typecheck reports an error that item 1.4 didn't record, or one of `DRF-38`'s and `repo:RF-31`'s errors changes;
- a row's Brotli figure, base to end, falls, or grows by more than 160 B;
- removing the pipeline needs a change outside §Boundaries.

## After this unit

The architect reads the report, closes `DRF-24` to `DRF-37` and `DRF-39` (§Disposition of the mangling deferral), records the verdicts under `DRO-4`, and marks `DRD-60` implemented. **`DRF-38` and `repo:RF-31` stay open:** they are the baseline errors, routed to their own cleanup units, and this unit's acceptance doesn't close them.
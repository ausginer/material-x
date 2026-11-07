# Integration integrity of the production `@ydinjs/drag`

**Pass:** integrity, package coherence outside the change. **Reviewed tree:** `d7e7b0d3ac21800e12efb0c023aef1b11dc5756d`, range `a1d31e0d2..d7e7b0d3a`, branch `drag/production`. **Baseline:** `a1d31e0d2`.

Every check below ran in two detached worktrees, one at each commit, each with its own `npm ci --ignore-scripts` and `npm run build`. Nothing was run in the main checkout. The main checkout's `HEAD` moved past the reviewed commit while this pass ran (`756805fd7` and `853a9bdea`: a design-challenge review, devcontainer scripts, `.gitignore`, `cl.sh`). None touches source, so the reviewed tree is unaffected.

**Result:** no regression in what a consumer observes. One tier-B instrument defect (a clean install does not reproduce the toolchain the size controls were measured with), one tier-B documentation contradiction, and six tier-C items. The branch also repairs three failures that exist at the baseline.

## Scope

**Covered**

- Package integration: `package.json` `exports` and `files`, `files.json`, `tsdown.config.ts`, `typedoc.json`, `project.json`, `tsconfig.json`, both Justfiles, `.scripts/vitest-config.ts`, root `vitest.config.ts`, `.storybook` collection, `package-lock.json`.
- Built output: a packed tarball of `@ydinjs/drag` and `@ydinjs/box-quad` installed into a clean consumer, all 11 entries imported at runtime and typechecked with `skipLibCheck: false`, the README's snippets typechecked against it, relative-import closure of every shipped `.js` and `.d.ts`.
- Dependents and neighbours: `@ydinjs/box-quad` (`delta`, `localDelta`, `typedoc.json`), `@ydinjs/drag2` (baseline B retirement, citation repairs, size, references and decisions tests), the Storybook index, the repository documents that name `@ydinjs/drag` or `drag2`.
- Citations: markdown links across the whole tree, and `packages/drag/...` path mentions in every tracked text file.
- Whether the public surface equals the contract's public-surface table.

**Not covered**

- Whether the implementation meets `DRI-1` to `DRI-18`. That is another pass. I ran the suites as integration checks only.
- Performance measurements and the `compare` instrument (half an hour). I did not rerun it.
- Physical touch and pen, and Storybook behavior in a browser. I checked that the Storybook build succeeds and indexes the three Drag stories, not that they run.
- Tracked docs under `packages/drag2/.plan/reviews/` and `measurements/`, which are dated history by drag2's tense rule.

## Checks, branch against baseline

All commands are the repository's own recipes, run with `node_modules/.bin` on `PATH`. "Branch" is `d7e7b0d3a`.

| Check | Branch | Baseline | Verdict |
| --- | --- | --- | --- |
| Root `just typecheck` (nx, builds prerequisites) | 15 tasks pass | 14 tasks pass | No change |
| Root `tsc -p tsconfig.json` (`.scripts`, `vitest.config.ts`) | Pass | Pass | No change |
| Root `npm run build` (`nx run-many -t build --all`) | 9 tasks pass | 8 tasks pass | No change |
| Root `just lint`, package step | Fails in `core`, `tproc`, `vite-custom-element-assets`, `drag2`, `material-x` | The same five fail | **Existing at baseline.** Per-package error output is identical in all five. `drag` passes on the branch and failed at baseline (prototype) |
| Root `just lint`, repository-level files (`oxlint` and `eslint` with `packages/**` ignored) | **3 oxlint errors** in `.scripts/vitest-config.ts` | 0 | **Regression**: integrity-2. `just lint` stops at the package step, so the report never ran it |
| Root `just fmt-check` | Fails in `box-quad`, `drag`, `drag2`, `material-x` | Fails in `drag`, `drag2`, `material-x` | `material-x` is the same five generated `.styles.css` files. The rest is **regression**: integrity-3 |
| Root `just size` | Exit 0 | **Exit 1**: `drag2` baseline B `control moved by -6865 B` | Branch repairs a baseline failure |
| `drag2` node project | 438 pass | 439 pass, **2 fail** (`references` paths, baseline B control) | Branch repairs both |
| Root `vitest run` | 2,621 pass, 2 fail: `TokenPackageProcessor` (tproc), `radio.visual` | 2,332 pass, 4 fail: the same two, plus the two `drag2` failures above | `TokenPackageProcessor` is existing at baseline. `radio.visual` fails in both worktrees and is environmental (the report calls it unstable). Counts differ because the baseline run used `--maxWorkers=3`, after two runs were killed by memory pressure |
| `drag` `just test` (Chromium) after a clean `npm ci` | **272 pass, 1 fail**: `drag:DRI-18 ... draggable alone`, `control moved by -11 B` | No suite | **Regression**: integrity-1 |
| The same, with the main checkout's nested `rolldown@1.1.5` copied in | 273 pass | No suite | Reproduces the report |
| `drag` `just test-engines` (Chromium, Firefox, WebKit) | 745 pass, 14 skipped | No suite | Reproduces the report |
| `drag` `lint`, `typecheck`, `size` | Pass | `lint` fails, no `typecheck` or `size` target | Pass |
| `drag` `typedoc` (`docs-api-prepare`, `docs-api-build`) | **Exit 3**, 6 errors | No `typedoc.json` | **Regression**: integrity-4 |
| `box-quad` `typedoc` | Exit 0 | Exit 3 (`typedoc.json` named `@ydinjs/drag` with its entries) | Branch repairs it |
| `drag2` `typedoc` | Exit 0 | not run | No change |
| Storybook build (`nx run @ydinjs/material-x:docs:build`) | Pass. Index holds `drag-custom-behavior--resize-handle`, `drag-free-drag--bounded`, `drag-sortable--list`, `drag-sortable--grid` and the `drag2-*` stories. No `__DEV__` left in assets | Not run | No collision of titles between `Drag/` and `Drag2/` |
| Tarball consumer: 11 entries import in Node, `./shared/focus.js` refused with `ERR_PACKAGE_PATH_NOT_EXPORTED`, `tsc` with `skipLibCheck: false`, README snippets typecheck, 0 unresolved relative imports, one bare import (`@ydinjs/box-quad`) | Pass | n/a | Pass |
| `exports` regenerated by `tsdown` against the committed `package.json` | `git status` clean after `just build` | n/a | `exports`, `files.json`, `typedoc.json` entries and `tests/exports.node.test.ts` list the same 11 entries |
| `just clean-build` in `drag` | Leaves no ignored build file outside `node_modules` and `.vite` | n/a | Pass |
| Markdown links, whole tree (scratch script) | 484 broken | 489 broken | Five fewer lines. No new broken link; the four distinct links that disappear are the ones the citation repair struck |
| `git diff --check a1d31e0d2 d7e7b0d3a` | Clean | n/a | Pass |
| `drag:DRD-1` through `packages/drag2/.scripts/entry.sh` | `unknown scope: drag` | n/a | integrity-8 |

## Findings

### integrity-1 · Tier B · A clean install does not reproduce the rolldown the size controls were measured with, so `drag`'s own suite fails from a clean checkout

**Finding.** `packages/drag/bench/size/measure.ts` pins the exact Brotli figure of `draggable alone` (`control: 2035`). A checkout installed with `npm ci` from the committed lock measures 2024, and `drag:DRI-18 module graphs and size > should satisfy the declared graph and ceiling of draggable alone` fails.

**Current behavior and contract.** The implementation report states "Package suite ... 273 passed" and sets ceilings and the control from "this reading". The handoff §6 says the control row is `draggable alone`, which an edit to `sortable` must not move.

**Why it is a problem.** The two sites that disagree:

- `packages/drag/package.json:95` pins `rolldown` `1.1.5`, and `package-lock.json` carries `packages/drag/node_modules/rolldown` `1.1.5` with its platform bindings, about 340 added lines.
- Root `package.json:87` has `overrides: { "rolldown": "$rolldown" }`, and root `rolldown` is `1.2.15`. `npm ci` follows the override and installs no nested copy: in a fresh worktree `packages/drag/node_modules` holds only `@types`, and `npm ls rolldown` reports `rolldown@1.2.15 deduped` under `@ydinjs/drag`. In the main checkout, where the nested copy exists, `npm ls` reports `rolldown@1.1.5 invalid: "1.2.15" from packages/drag`.

So the figures were taken against a toolchain that the lock describes and `npm ci` does not produce. The repository's size instrument is the only detector for growth in this package, and it is red on a clean install. Any pull request gate built from `npm ci` fails on the first run.

**Evidence.**

- Branch worktree, `npm ci`, then `just test` in `packages/drag`: `Tests 1 failed | 272 passed (273)`, `expected [ 'control moved by -11 B' ] to deeply equal []` (`/tmp/.../scratchpad/integrity/build/drag-test-head.log`).
- `node bench/size/measure.ts` before and after copying the main checkout's `packages/drag/node_modules/{rolldown,@rolldown}` into the worktree: `draggable alone` 5840 min / 2024 br, then 5872 / 2035. With 1.2.15 every row is also larger than the report's table (`complete` 6960 against 6945, `sortable + y` 6600 against 6567) and still under its ceiling. Only the control row fails.
- With the copy in place the suite is 273 of 273, as reported.
- `drag2` is unaffected: its controls were re-based under 1.2.15, and its node project passes after the same `npm ci`.

**Required property.** The size controls, the ceilings and the figures in the report, the README and `00-index.md` are produced by the toolchain that a clean install of the committed lock gives. The lock holds no nested entry that the repository's own `overrides` makes invalid.

### integrity-2 · Tier C · Three lint errors in `.scripts/vitest-config.ts`, hidden because `just lint` stops at the package step

**Finding.** `createDragAllEnginesTestConfig` (new in the range) fails the repository-level `oxlint`: `.scripts/vitest-config.ts:592:12` `typescript(consistent-type-assertions)` and `typescript(no-unnecessary-type-assertion)` on `} as UserConfig`, and `:596:25` `typescript(no-base-to-string)` on `String(test?.name)`. The baseline file has none.

**Contract.** `handoff.md` §Verify: lint every edited file and report a surviving error.

**Why it is a problem.** The root recipe runs `nx run-many -t lint` first, and five packages fail it at the baseline, so the `oxlint ... --ignore-pattern 'packages/**'` line has not run on any tree since. The report's "Root `lint` ... `drag` and `box-quad` pass" is true of the packages and says nothing of these files.

**Evidence.** `oxlint --ignore-pattern 'packages/**' .` in each worktree: three errors, zero. `eslint` on the same files is clean in both.

**Required property.** Files changed by the range pass the lint that covers them, and the report states which lint ran over them.

### integrity-3 · Tier C · `fmt-check` is red on five files the range created or edited

**Finding.** `oxfmt --check` newly fails on `packages/box-quad/tests/local-delta.browser.test.ts`, `packages/drag/.plan/measurements/2026-11-06-compare.json`, `.../2026-11-06-instrument-proof.json`, `packages/drag2/.plan/contract/00-index.md` and `packages/drag2/.plan/measurements/budget-rebases.md`. The baseline fails only on `drag2`'s `api-review-3-summary.md`, `drag`'s two `probes/prototype/*.json` and the generated `material-x` CSS.

**Contract.** `handoff.md`: format every edited file, and Markdown files through `oxfmt`.

**Evidence.** `oxfmt --check .` per package in both worktrees. In `budget-rebases.md` the appended `## Baseline B retired` heading follows the last paragraph with no blank line, because the previous last line had no newline. In `instrument-proof.json` `oxfmt` reflows 44 lines into 826.

**Required property.** Every file the range touched is a fixed point of `oxfmt`, or the report names the exception.

### integrity-4 · Tier C · The package's own `docs-api-prepare` and `docs-api-build` recipes fail

**Finding.** `just docs-api-build` in `packages/drag` exits 3: `Found 6 errors`, all in `tests/authoring.declaration.test.ts` (TS2769 on the call and TS2578 `Unused '@ts-expect-error' directive` at lines 32, 39, 43). `drag2` and `box-quad` run the same recipe clean.

**Why it is a problem.** The recipes are in `package.json` and the Justfile (the comment says the cache is consumed by the Storybook dev server). TypeDoc 0.28.20 loads the TypeScript 6 module and walks the `tsconfig.json`, which includes `tests/**/*`. The package typechecks under `tsc` 7.0.2, and also under `node_modules/typescript` 6 with no TypeDoc, so the same directives are accepted by two compilers and refused inside TypeDoc. Nothing in the root `docs-*` recipes calls them today, so no output is lost.

**Evidence.** `typedoc --options typedoc.json --out ...` in the branch worktree, exit 3, no output directory. `tsc -p tsconfig.json --noEmit` with the 6.x module: no errors.

**Required property.** A recipe the package declares succeeds, or the package does not declare it.

### integrity-5 · Tier B · `drag2`'s README says the shipped `@ydinjs/drag` is untouched, and its own migration note says that package is gone

**Finding.** `packages/drag2/README.md:8` reads "The shipped `@ydinjs/drag` is untouched while this package is built. Merging the two is the last phase of the plan", and line 34 and line 67 compare against "the shipped" package and its stories. The paragraph the range added at line 48 says "The package this section describes is gone ... the package now named `@ydinjs/drag` is a different one". Line 112 tells a reader they never need `@ydinjs/drag/kernel`; no such entry exists in the package of that name, which now exports 11 other entries.

**Why it is a problem.** An integrator reading the README top to bottom meets the old claim first, in the headline paragraph, and the correction only in a later section. The same word "shipped" now names a package that exists, with a different design.

**Evidence.** The README lines above. The same drift sits in `.agents/docs/accessibility.md:106` (inside the drag2 section, "The shipped `@ydinjs/drag` is one-slot per key press") and in bare `Q-13` cited from the new `@ydinjs/drag` section at `accessibility.md:79`, an identifier that belongs to drag2's closed series.

**Required property.** A document that names `@ydinjs/drag` says which package it means wherever it names it, not once in a later section.

### integrity-6 · Tier C · `coordinator.md` still calls drag2 "the replacement"

**Finding.** `.agents/docs/coordinator.md:15` says "Keep the existing drag implementation and the private drag2 replacement distinct". `00-index.md` DRD-13 and `architecture.md:103` (both rewritten or added in the range) say drag2 is kept as reference evidence and `@ydinjs/drag` is the production package.

**Required property.** The document that scopes a coordinator's work agrees with the register about which package replaces which.

### integrity-7 · Tier C · The baseline B retirement leaves live sentences that name or count the row

**Finding.** D-210's acceptance (`deferred-integration.md`) requires that no live sentence counts or names the row. `packages/drag2/.plan/contract/05-lifecycle-invariants.md:987`, in the normative tree, still reads "Report the two baselines separately ... The shipped `sortable.js` ... answers _what does migrating cost_", two lines under the sentence the range amended at line 959. `packages/drag2/tests/COVERAGE.md:1049` says "Fifteen rows"; the instrument has fourteen.

**Why it is a problem.** drag2's `references.node.test.ts` checks that paths resolve and cannot see a sentence about a row that no longer exists. The two sites in `measure.ts` and `size.node.test.ts` that the same hunk fixed show the count was meant to be consistent.

**Required property.** After a row is retired, no present-tense sentence in the normative tree counts it or tells a reader to measure it.

### integrity-8 · Tier C · The record-retrieval tool cannot resolve the addresses the branch's documents cite

**Finding.** `architecture.md:101` cites `drag:DRD-1`, and the package's tests cite `drag:DRI-n`. `packages/drag2/.scripts/entry.sh drag:DRD-1` answers `unknown scope: drag` and says the build resolves `drag2` and `repo`. `CONTRIBUTING.md:17` still says "`drag2` is the only scope this build resolves" (already stale for `repo` at the baseline).

**Why it is a problem.** CONTRIBUTING makes the qualified address the stable one and names `entry.sh` as the reader. The `drag` register carries an `awk` fallback in its own header, so the content is reachable, but not through the documented tool.

**Required property.** An address the repository tells a reader to cite is one its documented reader resolves, or the documentation names the exception.

## Open questions

- **Struck-through paths that now exist.** The range strikes `packages/drag/src/sortable/keyboard.ts` in `drag2/tests/probes/13a-discrete-input.ts:45` and says it is "recoverable at `7723f3e8a`". That path exists in the tree again, as the production package's `keyboard.ts`. Dated drag2 records (`ledger.md`, `plan.md`, reviews) cite `packages/drag/src/sortable.ts`, `draggable.ts` and `rect-index.ts` in the same way and now resolve to a different implementation. drag2's tense rule puts those records out of scope for its references test, so nothing fails. Whether striking is still the convention when the path was reused, or the citation should carry the commit, is the owner's call.
- **Reachability of `599684791`.** `bench/compare.ts` and `bench/size/measure.ts --prototype` call `git archive 599684791`. The commit is an ancestor of `HEAD` and of `origin/drag/prototype`. It stays reachable only while a ref holds it; I did not test a squash merge.
- **`bench/lab-drag2.ts` imports `../../drag2/src`.** `drag`'s `tsconfig.json` and `lint` therefore include drag2 source. DRD-13 keeps drag2 as the "before" arm, so this is by design. Removing or renaming a drag2 file breaks `drag`'s typecheck.

## Verification limits

- Worktrees live under `/tmp`, installed with `npm ci --ignore-scripts`, so the `postinstall` (`link-tsserver.ts`) did not run.
- The machine ran other passes. Two root `vitest run` attempts were killed with signal 9 (memory and full swap). The baseline root run used `--maxWorkers=3`; the branch run completed with defaults. A later run of the branch with `--maxWorkers=3` was not made, so the 2,621 and 2,332 pass counts are not directly comparable. The failing sets are.
- `radio.visual` failed in both worktrees. I did not investigate it.
- The branch's `just test` for `drag` passes only with the nested `rolldown@1.1.5` present, which is the main checkout's state. The branch's Storybook, typedoc, tarball and engines runs used that state, except where a row says otherwise.
- I did not run `just compare` or mutate the code.
- Worktrees at `.../scratchpad/integrity/head` and `.../base` were removed when this report was written.
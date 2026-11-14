# Mangle rollback report

**Handoff:** [`mangle-rollback-handoff.md`](mangle-rollback-handoff.md), at `7420cbb9a` on `drag/mangle-remediation`, in its linked worktree. **Governing records:** `DRD-60`, `DRD-54`, `DRD-55`, `DRD-58` §Result, `DRF-38`, `repo:RF-31` and `DRD-51` in [`00-index.md`](00-index.md). **Engines:** Chromium only.

**Status: complete.** The two commits implement `DRD-60`, and every check of items 2 to 4 holds. The consumer project passes 326 of 326 at the end. Every row grows, by 35 to 144 B Brotli. There is no new lint or typecheck error. Two items need the architect:

- At commit A, one consumer test failed once on a timing tolerance. The owner directed one rerun of the same command, and it passed (§Commit A).
- **`DRF-38` understates the base.** The whole-package lint reports 49 ESLint errors at the base, not one (§Baseline errors).

| Commit | Content |
| --- | --- |
| `7420cbb9a` | Base |
| `cc752cc1b` | A: the build step, the map and the publication test go; `tsdown.config.ts` and `tsconfig.json` read as at `f7b7b300b` |
| `b8e37b37c` | B: the internal property names lose the `_` prefix |
| This commit | The report and its measurements, with the prefix `2026-11-13-rollback-` |

## Tools and environment

- `tsdown` 0.23.7, `rolldown` 1.3.2, `rolldown-plugin-dts` 0.30.2 and `typescript` 6.0.2, from the worktree's `node_modules`. They are the lockfile's versions, and the worktree's lockfile is byte-identical to the main checkout's.
- The worktree already had `node_modules`, and `@ydinjs/vite-traits-plugin` and `@ydinjs/box-quad` were already built. The Vitest configuration didn't load until three more ignored outputs existed in the worktree, so I created them. I changed no tracked file to do it:
  - `npx just build` in `packages/vite-custom-element-assets`;
  - `npx just build` in `packages/tproc`;
  - `npx just build-prepare` in `packages/material-x`, which writes `node_modules/.cache/css/css-private-props.json`.

  The handoff names only the first two prerequisites.

- No browser and no host library was installed. Each long process ran through `node bench/campaign.ts run`, and I waited for each one in the foreground.

## Item 1. The base

| Check | Result | Evidence |
| --- | --- | --- |
| 1.1 Suite, all projects | 747 passed, 4 failed. The failures are the size rows "draggable alone", "example: drop zone", "freeDrag + bounds + landing" and "complete", as expected | [log](measurements/2026-11-13-rollback-base-suite.log), [verdicts](measurements/2026-11-13-rollback-base-suite-verdicts.txt) |
| 1.2 Gate | Every row is in §Readings. Its figures equal the end of [`slot-array-report.md`](slot-array-report.md) | [log](measurements/2026-11-13-rollback-base-size.log) |
| 1.3 Dry checks | 13 entries apply: `--prove` 6 of 9 and `--floors` 7 of 14. The 10 that fail are `DRD-45` property 9's stale entries, on the `#lift.translate` find text in `sortable/operation.ts` | [output](measurements/2026-11-13-rollback-base-dry.txt) |
| 1.4 Lint and typecheck | Lint: 49 ESLint errors, and oxlint is clean. Typecheck: `repo:RF-31` only (§Baseline errors) | [lint](measurements/2026-11-13-rollback-base-lint.txt), [typecheck](measurements/2026-11-13-rollback-base-typecheck.txt) |
| 1.5 Tree | 90 published files: 33 `.js`, 30 `.js.map` and 27 `.d.ts`. They were copied to a scratch directory with their SHA-256 hashes | [hashes](measurements/2026-11-13-rollback-base-tree.sha256) |

The first suite attempt didn't start, because the worktree lacked the outputs listed in §Tools and environment. Its runs (`rollback-base-suite`, `-2`) are kept under `.campaigns/`. The suite in the table is `rollback-base-suite-3`.

## Commit A

**Files:**

| File | Lines |
| --- | --- |
| `build/generate-property-names.ts` | −181, removed |
| `build/property-names.json` | −55, removed |
| `build/property-names.ts` | −111, removed |
| `build/rename-properties.ts` | −94, removed |
| `tests/publication.node.test.ts` | −307, removed |
| `tsdown.config.ts` | +1 −5, now byte-identical to `f7b7b300b` |
| `tsconfig.json` | −1, now byte-identical to `f7b7b300b` |

**Checks:**

| Check | Result |
| --- | --- |
| 2.3 File list | Equal to the base tree's 90 paths |
| 2.3 `.d.ts` | All 27 are byte-identical to the base tree's |
| 2.3 `.js` | Holds. After each prefixed name in commit A's `.js` is replaced by its output name in the removed map, all 33 files equal the base tree's in code. The 12 differing lines are all comments, where the base build left the prefixed name unchanged and the probe's replacement changed it. [Output](measurements/2026-11-13-rollback-a-js-check.txt), [probe](measurements/2026-11-13-rollback-js-names.ts.txt) |
| 2.4 Format and lint of `tsdown.config.ts` | Clean. `fmt` changed nothing |
| 2.4 Whole-package lint and typecheck | The same errors as the base, line for line (§Baseline errors) |
| 2.4 Node and consumer projects | See below |
| 2.5 Gate | §Readings. "example: resize handle", "example: canvas group" and "freeDrag" go over their ceilings, and the base's four red rows stay red |

**The node and consumer run, and its rerun.** The first run had one consumer failure, `tests/activation.browser.test.ts:145`, "drag:DRI-13 a grab during a landing › should keep the visual under the pointer during a rejected landing": `expected 1.0501518249511719 to be less than 1`, at line 173 ([log](measurements/2026-11-13-rollback-a-node-consumer.log)).

- **What the test measures:** the landing runs 90 px over 20 s, linear, which is 4.5 px/s. So 1.05 px is about 230 ms between the read before the grab and the read after it.
- **Isolated runs:** the test, with its accepted case, passed in 10 of 10 isolated runs at commit A ([results](measurements/2026-11-13-rollback-a-landing-repeats.txt)). It also passed in the base suite.
- **The owner's direction:** rerun the same combined command once. Continue only if all 326 consumer tests pass, and return otherwise. Don't change the test, its tolerance or its timing, and don't repeat the command until it passes.
- **The rerun:** 326 of 326 consumer tests passed. The node project failed only on the seven size rows that the gate reports over their ceilings ([log](measurements/2026-11-13-rollback-a-node-consumer-rerun.log)).
- **The cause is unresolved.** Timing sensitivity under load is suspected: the first run built and measured the size compositions in the node project while the consumer tests ran. Commit A changes no runtime code path, only the output names. That is consistent with the suspicion and doesn't establish it.

## Commit B

**Declarations renamed.** The type checker's `findRenameLocations` ran at each declaration in `src` whose name is in the removed map's 53 names, with shorthand prefixes and suffixes. All locations were computed on commit A's tree and applied once. The rename is [this probe](measurements/2026-11-13-rollback-rename.ts.txt), and [its output](measurements/2026-11-13-rollback-rename-output.txt) lists each declaration and each of the 338 edited locations in 21 files. No location fell outside `src`, `tests`, `bench` and the probe file. No two declarations asked for different text at one location.

The probe visits 79 declaration nodes. They are the 67 declarations of the handoff. The three overload signatures of `gesture.ts`'s `_enter` count with its implementation, and the 12 keys marked `*` belong to object literals typed by an interface, which the interface member's rename reaches. Lines are at commit A.

| File | Declarations (name, line) |
| --- | --- |
| `src/free-drag/behavior.ts` | `_root` 63, `_config` 64, `_window` 65, `_axis` 66, `_bounds` 67, `_landing` 68 |
| `src/free-drag/bounds.ts` | `_left`, `_top`, `_right`, `_bottom`, all 23, in an untyped literal |
| `src/free-drag/operation.ts` | `_translate` 62, `_moveTo` 68 |
| `src/kernel/callbacks.ts` | `_empty` 38, `_has` 43, `_add` 60, `_run` 71, `_clear` 77 |
| `src/kernel/drag.ts` | `_raise` 6 |
| `src/kernel/gesture.ts` | `_enter` 186, 187, 188 and 193, `_raise` 238, `_raiseInPass` 249, `_detach` 258 |
| `src/kernel/session.ts` | `_advance` 254, `_decide` 273, `_stepTarget` 281, `_terminate` 291 |
| `src/lift.ts` | `_duration` 59, `_easing` 60, `_landing` 61; \*`_duration` 306, \*`_easing` 307, \*`_landing` 308 |
| `src/shared/invalidation.ts` | `_schedule` 16 and 29, `_cancel` 17 and 34 |
| `src/sortable/behavior.ts` | `_visual` 66, `_box` 68, `_direction` 70, `_config` 94, `_axis` 97, `_displacement` 98, `_landing` 99, `_invalidate` 124; \*`_visual` 280, \*`_box` 281, \*`_direction` 282 |
| `src/sortable/layout-animation.ts` | `_animation` 39, `_dx` 40, `_dy` 41; \*`_animation` 107, \*`_dx` 108, \*`_dy` 109 |
| `src/sortable/linear-shift.ts` | `_refresh` 56 and 126, `_moved` 71 and 196, `_invalidate` 73 and 259, `_retire` 75 and 266 |
| `src/sortable/operation.ts` | `_rebase` 155, `_updateInsertion` 179 |
| `src/sortable/rect-index.ts` | `_values` 100, `_placeholderRect` 104, `_items` 108, `_count` 112, `_first` 117, `_end` 121, `_collect` 130, `_measure` 173, `_lend` 217, `_measurePlaceholder` 229, `_holds` 245, `_invalidate` 278, `_retire` 286 |

Before the rename, the set of `\b_[A-Za-z]\w*` names in `src` equalled the map's 53 names and the location files' 53 names. No marker name was outside them.

**Shorthand keys restored: 24,** the location files' 11 and 13 records ([list](measurements/2026-11-13-rollback-shorthand-keys.txt), lines at commit A):

- `lift.ts`: 308 `landing`;
- `sortable/behavior.ts`: 280 `visual` and 282 `direction`;
- `sortable/layout-animation.ts`: 107 `animation`, and 156 `animation` in a pattern;
- `sortable/linear-shift.ts`: 169 `values` and `count`, and 244 `items`;
- `sortable/rect-index.ts`: 315 `first` and `end`, and 335 to 338 `values`, `placeholderRect`, `items` and `count`;
- `sortable/xy.ts`: 74 to 77 `values`, `count`, `placeholderRect` and `items`, and 162 `values`, `items` and `count`;
- `sortable/y.ts`: 57 `values`, `first` and `end`.

**`fmt` collapsed none of the `name: name` pairs. `lint-fix`'s `object-shorthand` autofix collapsed them all,** and then `fmt` restored the destructuring patterns to one line each. The handoff's simulation expected `fmt` to do it. As the handoff says, `fmt` kept the record literal in `layout-animation.ts` on several lines, so I wrote it on one line by hand, as at `f7b7b300b^`. I ran `lint-fix` on the changed `src` files only. On `tests/authoring.declaration.test.ts` and `bench/compare.ts`, it would also have autofixed base errors on lines this unit doesn't own.

**Comments.** Every comment line in `src` that named a renamed member as `_name` now names it without the `_`. That is 18 lines in `kernel/callbacks.ts`, `kernel/drag.ts`, `kernel/gesture.ts`, `kernel/session.ts`, `sortable/rect-index.ts` and `sortable/xy.ts`.

**Followers.**

- `tests/callback-list.browser.test.ts` and the probe changed through the type checker's rename.
- In `tests/authoring.declaration.test.ts` (the four `void panel._…` lines under `@ts-expect-error`) and `bench/compare.ts`'s injection texts (six lines), the names are text, not references the type checker resolves. Each of these files differed from `f7b7b300b^` only on those lines, so each is now its text at `f7b7b300b^`.
- `@ts-expect-error` still asserts that the published type lacks each member, and the declaration project passes 20 of 20.

**Checks:**

| Check | Result |
| --- | --- |
| 3.5 `grep -rnE '\b_[A-Za-z]'` over `src` and `bench` | Nothing |
| 3.5 The same over `tests` | Only `_name` in `coordinates.browser.test.ts` (89, 146, 284), `landing.browser.test.ts` (162) and `sortable.browser.test.ts` (585) |
| 3.5 `git diff --stat f7b7b300b^ HEAD`, outside `.plan` | Exactly `package.json`, `src/sortable/axis.ts`, `src/sortable/layout-animation.ts`, `src/sortable/linear-shift.ts`, `src/sortable/rect-index.ts` and `tests/displacement-sink.browser.test.ts` |
| 3.5 Changed lines of the five files against `5ec3b4b2d`'s, unmarked | Equal, 95 lines |
| 3.5 `DRD-58` §Result's types | `get values(): readonly number[]`; `lend`'s `write: (values: number[], lo: number, hi: number) => void`; `pack`'s `target: number[] \| Float64Array`; `settle`'s `values: number[] \| Float64Array` in `axis.ts` and `layout-animation.ts`; no `#capacity` and no `capacityFor`. The emitted `sortable/axis.d.ts` keeps `settle`'s `number[] \| Float64Array` line |
| 3.5 `.plan/probes/callback-list/allocation.ts` | Byte-identical to `f7b7b300b^` |
| 3.6 File list | Equal to commit A's |
| 3.6 `.d.ts` | All 27 equal commit A's, read unmarked. They hold no marker, so they are byte-identical |
| 3.6 `.js` | 27 of 33 equal commit A's, read unmarked. The other six differ only on the 10 lines below, where the source now writes a shorthand key. [Output](measurements/2026-11-13-rollback-end-js-check.txt) |
| 3.7 Lint and typecheck | The same errors as the base, line for line |

**The 10 `.js` lines (item 3.6),** commit A's unmarked line, then the end's. **Corrected on 2026-11-14** by the architect ([`00-index.md`](00-index.md) §Disposition of the mangling rollback report): this passage and the check above said "11 lines", and the saved output and this table list 10.

| File:line | Commit A, unmarked | End |
| --- | --- | --- |
| `lift.js:193` | `landing: landing` | `landing` |
| `sortable/behavior.js:117` | `visual: visual,` | `visual,` |
| `sortable/behavior.js:119` | `direction: direction` | `direction` |
| `sortable/layout-animation.js:62` | `animation: animation,` | `animation,` |
| `sortable/layout-animation.js:94` | `for (const { animation: animation } of running.values()) animation.cancel();` | `for (const { animation } of running.values()) animation.cancel();` |
| `sortable/linear-shift.js:42` | `const { values: values, count: count } = index;` | `const { values, count } = index;` |
| `sortable/linear-shift.js:74` | `const { items: items } = index;` | `const { items } = index;` |
| `sortable/xy.js:30` | `const { values: values, count: count, placeholderRect: placeholderRect, items: items } = index;` | `const { values, count, placeholderRect, items } = index;` |
| `sortable/xy.js:70` | `const { values: values, items: items, count: count } = index;` | `const { values, items, count } = index;` |
| `sortable/y.js:20` | `const { values: values, first: first, end: end } = index;` | `const { values, first, end } = index;` |

## Item 4. One-time checks

| Check | Result |
| --- | --- |
| 4.1 Dry checks | The end's output is byte-identical to the base's: the same 13 entries apply and the same 10 stale entries fail ([output](measurements/2026-11-13-rollback-end-dry.txt)) |
| 4.2 No marker in the publication | No `\b_[A-Za-z]` name in any published `.js` or `.d.ts`, in code or in comments. At the base, the code had none and the comments had 16 |
| 4.3 Source maps | 30 maps, each linked by its `.js`, each with mappings, as at the base. The three `landing.js` re-export modules have no map and no link, as at the base. Every `sourcesContent` entry equals its file under `src` ([output](measurements/2026-11-13-rollback-end-publication-check.txt), [probe](measurements/2026-11-13-rollback-publication-check.ts.txt)) |

## Readings

**The suite at the end,** all projects, Chromium: 740 passed, 6 failed, 746 tests ([log](measurements/2026-11-13-rollback-end-suite.log), [verdicts](measurements/2026-11-13-rollback-end-suite-verdicts.txt)).

- **Consumer:** 326 of 326, including `tests/classes.browser.test.ts:190` and `tests/destruction.browser.test.ts:381` (`DRF-39`).
- **Browser:** 354. **Declaration:** 20. **Shipped:** 9.
- **Node:** 31 passed. The six failures are the size rows that the gate reports over their ceilings.

Against the base, per test, the changes are:

- the five `tests/publication.node.test.ts` cases are gone;
- "example: resize handle" and "freeDrag" changed from passed to failed.

Every other test has its base verdict.

**The gate,** minified / gzip-9 / Brotli-11 in B ([base](measurements/2026-11-13-rollback-base-size.log), [commit A](measurements/2026-11-13-rollback-a-size.log), [end](measurements/2026-11-13-rollback-end-size.log)):

| Row | Base | Commit A | End | End − base | Modules |
| --- | --- | --- | --- | --- | --- |
| draggable alone | 6487 / 2373 / 2154 | 6781 / 2435 / 2200 | 6728 / 2422 / 2189 | +241 / +49 / +35 | 7 → 7 |
| draggable + lift | 11262 / 4346 / 3915 | 11598 / 4417 / 3982 | 11539 / 4397 / 3968 | +277 / +51 / +53 | 9 → 9 |
| example: resize handle | 9144 / 3613 / 3269 | 9438 / 3680 / 3333 | 9385 / 3664 / 3314 | +241 / +51 / +45 | 9 → 9 |
| example: drop zone | 12901 / 5051 / 4549 | 13237 / 5120 / 4615 | 13178 / 5101 / 4598 | +277 / +50 / +49 | 13 → 13 |
| example: canvas group | 9280 / 3576 / 3265 | 9574 / 3640 / 3322 | 9521 / 3623 / 3300 | +241 / +47 / +35 | 9 → 9 |
| freeDrag | 14638 / 5478 / 4932 | 15266 / 5592 / 5042 | 15157 / 5565 / 5018 | +519 / +87 / +86 | 15 → 15 |
| freeDrag + bounds + landing | 15747 / 5963 / 5362 | 16447 / 6086 / 5486 | 16322 / 6055 / 5450 | +575 / +92 / +88 | 19 → 19 |
| sortable + y | 19553 / 7179 / 6490 | 20600 / 7377 / 6672 | 20435 / 7323 / 6619 | +882 / +144 / +129 | 20 → 20 |
| sortable + xy | 19226 / 7077 / 6371 | 20120 / 7252 / 6541 | 19979 / 7206 / 6515 | +753 / +129 / +144 | 19 → 19 |
| complete | 21186 / 7906 / 7123 | 22290 / 8109 / 7310 | 22114 / 8049 / 7258 | +928 / +143 / +135 | 24 → 24 |

**Verdicts, for `DRO-4`.** No ceiling, control figure or budget changed.

| Row | Base | End |
| --- | --- | --- |
| draggable alone | over by 15 B; control moved by 130 B | over by 50 B; control moved by 165 B |
| example: resize handle | under | **over by 1 B** (3314 against 3313) |
| example: drop zone | over by 118 B | over by 167 B |
| example: canvas group | under | under, 14 B left (3300 against 3314). It was over by 8 B at commit A |
| freeDrag | under | **over by 51 B** |
| freeDrag + bounds + landing | over by 152 B | over by 240 B |
| complete | over by 58 B | over by 193 B |
| draggable + lift, sortable + y, sortable + xy | under | under |

**Against the return conditions:**

- No row's Brotli figure falls from base to end.
- The largest growth is 144 B ("sortable + xy"), within the 160 B limit.
- The growth is close to the 34 to 135 B that the mangling saved at `rolldown` 1.2.15. Without `sortable`, the rows grow 35 to 88 B, against 34 to 90 B saved. With it, they grow 129 to 144 B, against 132 to 135 B saved.

**Commit A is larger than the end** on every row, by 53 to 176 B minified. Commit A's build kept each prefixed name, which is one byte longer at every occurrence, and it kept each expanded `key: key`.

**Published size,** in bytes, summed over the published files:

|            | `.js`  | `.js.map` | `.d.ts` | Total   |
| ---------- | ------ | --------- | ------- | ------- |
| Base       | 79,809 | 192,012   | 35,611  | 307,432 |
| Commit A   | 81,413 | 192,023   | 35,611  | 309,047 |
| End        | 80,981 | 191,278   | 35,611  | 307,870 |
| End − base | +1,172 | −734      | 0       | +438    |

The 27 `.d.ts` files are byte-identical at the base, commit A and the end: no published declaration names a prefixed member.

## Baseline errors

### Existing

**Typecheck:** one error, `repo:RF-31`, the same at the base, commit A and the end:

- `.scripts/tsdown-library.ts(53,11)`, TS2322: "Type '…vite…Plugin<any>' is not assignable to type '…rolldown…E<any>'".

**Lint:** 49 ESLint errors, identical at the base, commit A and the end, apart from the absolute path. oxlint reports none. They are the same with and without a build in the package directory. The list is [base](measurements/2026-11-13-rollback-base-lint.txt), [commit A](measurements/2026-11-13-rollback-a-lint.txt) and [end](measurements/2026-11-13-rollback-end-lint.txt).

| File | Rule | Lines |
| --- | --- | --- |
| `tests/displacement-sink.browser.test.ts` | `func-name-matching` | 57:3, "Function name `recorded` should match property name `getBoundingClientRect`". This is `DRF-38` |
| `tests/hot-path.browser.test.ts` | `func-name-matching` | 1 |
| `tests/landing.browser.test.ts` | `func-name-matching` | 1 |
| `tests/order.browser.test.ts` | `func-name-matching` | 1 |
| `tests/authoring.declaration.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 31 |
| `tests/callback-list.declaration.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 5 |
| `tests/callback-list.declaration.test.ts` | `prefer-arrow-callback` | 1 |
| `tests/published-types.declaration.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 2 |
| `tests/classes.browser.test.ts` | `no-useless-assignment` | 1 |
| `tests/destruction.browser.test.ts` | `no-useless-assignment` | 1 |
| `tests/destruction.browser.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 1 |
| `bench/compare.ts` | `camelcase` | 2 |
| `bench/compare.ts` | `consistent-this` | 1 |

ESLint calls 39 of them fixable with `--fix`.

**`DRF-38` records one error, and the base has 49.** `DRF-38` says `npx just lint` from `packages/drag` reports one error. It cites [`slot-array-report.md`](slot-array-report.md), but that report linted only its five changed files, which is where the one error came from. The whole-package lint gives the same 49 errors in the main checkout at `f552e0ec9`, whose code equals this base's. None of the 48 others is in a file this unit owns except the followers, and the followers keep their base errors on the same lines. These are base errors that no finding registers. The architect decides whether `DRF-38` widens or a new finding takes them.

### New

None at commit A and none at the end. Item 1.4's `repo:RF-31` error is unchanged, and so are `DRF-38`'s and the other 48.

## Verification

| Check | Result |
| --- | --- |
| `git diff --stat 7420cbb9a..HEAD -- packages/drag .scripts` | The removed `build/` files and publication test; `tsdown.config.ts`, `tsconfig.json`; the 19 `src` files; the two follower tests, `bench/compare.ts` and the probe; this report and `measurements/2026-11-13-rollback-*`. Nothing in `.scripts/` |
| Changed `.ts` files | `fmt`, `lint-fix` (on `src` and `tsdown.config.ts`), `fmt`, `lint`. The lint of the changed files reports 34 errors, all base errors in `tests/authoring.declaration.test.ts` and `bench/compare.ts`. Typecheck: `repo:RF-31` only |
| Markdown | `npx just fmt` on this report, links checked by a scratch script, `git diff --check`. Markdown has no linter |

Not run, as the handoff requires: `compare.ts` scenarios, `--prove` or `--floors` without `--dry`, the page check, B3', the in-page floors, Firefox and WebKit.

## Not anticipated by `DRD-60`

- **`fmt` doesn't restore shorthand keys.** `lint-fix`'s `object-shorthand` does (§Commit B).
- **The suite needed three more ignored outputs in a fresh worktree** (§Tools and environment).
- **`DRF-38`'s scope** (§Baseline errors).
- **One intermittent consumer failure at commit A,** cause unresolved (§Commit A).

## State left

- **Branch:** `drag/mangle-remediation`, pushed.
- **The worktree** keeps the outputs listed in §Tools and environment, the build from the end readings in `packages/drag`, and the campaign directories under `.campaigns/`, all ignored. I created the scratch trees outside the checkout and removed them.

**Next:** the architect reads this report, as the handoff's §After this unit describes.
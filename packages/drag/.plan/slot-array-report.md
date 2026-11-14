# Slot array report

**Handoff:** [`slot-array-handoff.md`](slot-array-handoff.md), at `8f18d2f67` on `drag/size`. **Governing record:** `DRD-58` in [`00-index.md`](00-index.md).

**Status: returned at item 1 step 1.** WebKit doesn't launch after the browser install. This is the handoff's first return condition. No source, test or build file changed. Item 1 steps 2 to 10 and items 2 to 5 didn't run.

## What happened

1. From `packages/drag`, inside the container (Debian 13, `/.dockerenv`), `npx playwright --version` printed `Version 1.65.0`. I then ran `npx playwright install firefox webkit`, without `--with-deps`. [Output](measurements/2026-11-13-slot-array-browser-install.txt), unedited.
2. **Before it downloaded anything, the install removed four entries from `~/.cache/ms-playwright/`** as "unused browser":
   - `firefox-1555`;
   - `webkit-2370`;
   - `webkit-deps-trixie`;
   - `webkit-env.sh`.

   Playwright removes the cache entries that its installed version doesn't name, and it counted the deps directory and the env script among them. The environment variable `PLAYWRIGHT_SKIP_BROWSER_GC` turns this removal off (`node_modules/playwright-core/lib/coreBundle.js`). I didn't set it, because the handoff's command doesn't, and I didn't check for it before the install. That is my omission: the handoff said to leave the old builds in place. The removal can't be undone from the checkout.

3. The install then downloaded `firefox-1572` (Firefox 159.0) and `webkit-2388` (WebKit 27.2), and printed the host validation warning for WebKit's missing system libraries.
4. **The launch check** ([probe and output](measurements/2026-11-13-slot-array-browser-launch.txt)):
   - Firefox launches: `159.0`.
   - WebKit fails: `browserType.launch: Host system is missing dependencies to run browsers`, listing `libgstreamer-1.0.so.0`, `libgtk-4.so.1` and others.
   - `webkit-env.sh` no longer exists, so the check couldn't source it.

## Why WebKit can't launch now

[`probes/session-owner/README.md`](probes/session-owner/README.md) describes the earlier setup. WebKit's system libraries were fetched with `apt-get download` from Debian trixie and unpacked into a scratch directory, which was `webkit-deps-trixie`. They were linked into WebKit's own `sys/lib`, which was inside `webkit-2370`. `webkit-env.sh` set `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` and Mesa's EGL vendor directory. The install removed all of that. The new `webkit-2388` has no links to the libraries.

**Restoring WebKit is an environment change that the handoff doesn't allow.** The handoff permits only the browser install. Restoring WebKit means fetching and unpacking the Debian packages again, linking them into `webkit-2388/…/sys/lib`, and writing a new `webkit-env.sh`. I didn't do it.

## State left

- **Checkout:** unchanged, apart from this report and the two `measurements/` files.
- **`node_modules`, lockfiles, Chrome:** unchanged.
- **`~/.cache/ms-playwright/`:** `ffmpeg-1013`, `firefox-1572` and `webkit-2388`. The old builds, `webkit-deps-trixie` and `webkit-env.sh` are gone.
- **The publication redesign and its worktree:** not read and not changed. `.plan/reviews/` wasn't touched.
- No timing or deferred campaign ran.

## For the architect

1. **Decide whether to authorize rebuilding WebKit's user-space libraries for `webkit-2388`,** and who does it. The method is the one in `probes/session-owner/README.md`. The unit can start again at item 1 step 1's launch check once `webkit-env.sh` exists and WebKit launches with it.
2. **Item 1 step 1's command removes the old builds unless `PLAYWRIGHT_SKIP_BROWSER_GC=1` is set.** A handoff that needs them kept should name the variable.

---

# Resumed, Chromium only

**Resumed from `706b91481`** on `drag/size`, the owner's amendment of the handoff: local browser checks use Chromium only, and Firefox and WebKit checks are deferred to the owner's planned CI. The section above is the return at `b66a9bf6d` and stays as written. **WebKit recovery was cancelled:** no browser and no host library was installed, and no Firefox or WebKit check ran. **Base:** `706b91481`, whose `packages/drag/src`, `tests`, `bench` and `build` are those of `8f18d2f67`.

**Outcome: complete, and no return condition was met.** `DRD-58` properties 1 to 9 hold. The three `sortable` rows are 31 to 32 B Brotli smaller. The seven control rows read 0/0/0. Allocation shows no difference larger than the spread inside either tree. Timing isn't measured (`DRD-58`).

## Commits

- **`5ec3b4b2d`:** the slot array (`rect-index.ts`), the signatures (`axis.ts`, `layout-animation.ts`, `linear-shift.ts`) and the test helpers (`tests/displacement-sink.browser.test.ts`).
- **The report commit:** this section and the `2026-11-13-slot-array-*` files under `measurements/`.

## Item 1. The base

All readings are at `706b91481`, from `packages/drag`.

1. **Tools** ([list](measurements/2026-11-13-slot-array-tools.txt)): Node v26.13.0, `rolldown` 1.3.2, `tsdown` 0.23.7, `vitest` 5.1.0, `@vitest/browser-playwright` 5.1.0, `playwright` 1.65.0, `typescript` 6.0.2, `typedoc` 0.28.20, `size-limit` 14.3.0, `@size-limit/file` 14.3.0, and Google Chrome for Testing 157.0.8103.38. The list at the end is identical.
2. **`DRD-57` landed** ([output](measurements/2026-11-13-slot-array-landing-and-map.txt)): the `git log` lists only `b50204f66`. `build/property-names.json` has 53 keys, among them `_values`, `_items` and `_end`.
3. **The Chromium suite**, through the runner ([status](measurements/2026-11-13-slot-array-base-suite-status.json), [log](measurements/2026-11-13-slot-array-base-suite.log), [verdicts](measurements/2026-11-13-slot-array-base-suite-verdicts.txt)): 751 tests in 56 files. 747 pass and 4 fail, and the 4 are size rows: "draggable alone", "example: drop zone", "freeDrag + bounds + landing" and "complete". Per project: `browser` 354 passed, `consumer` 326, `declaration` 20, `shipped` 9, and `node` 38 passed and 4 failed. The verdict list comes from the verbose log, by [`verdicts.sh`](measurements/2026-11-13-slot-array-verdicts.sh.txt).
4. **Size** ([reading](measurements/2026-11-13-slot-array-base-size.txt)): see item 5. `npx just size` exits 1 on the four violations.
5. **The map**, regenerated: 53 names and 263 occurrences, byte-identical to `build/property-names.json`.
6. **The base build's 27 `.d.ts` files** are copied outside the checkout. The build emits no `.d.ts.map`.
7. **`typedoc`** ([output](measurements/2026-11-13-slot-array-base-typedoc.txt)): two warnings, `DisplacementInstaller` and `AxisInstaller`, and no error.
8. **Allocation:** see item 5.

## Item 2. The slot array

**Declarations against `DRD-58` property 7's table** (`5ec3b4b2d`):

| Declaration | After |
| --- | --- |
| `rect-index.ts` module JSDoc | "one `number[]` of packed slots plus one parallel element array"; "alone grows the slot array"; "The slot array holds measured geometry" |
| `pack(target, offset, rect)` | `target: number[] \| Float64Array` |
| `capacityFor` | Removed |
| `#values` and its JSDoc | `readonly #values: number[] = []`. "It grows only by appending, so it never has a hole, and it never shrinks: it holds the largest collection the index measured, and is released with the index." |
| `#capacity` | Removed, with its JSDoc |
| `get _values()` | `readonly number[]`. "The same array for the index's life. Its contents are valid inside the window." |
| `_collect` | The reallocation branch is replaced by property 2's append loop |
| `_lend`'s `write` and JSDoc | `(values: number[], lo: number, hi: number) => void`. It keeps the extent rule, adds "`write` writes the array only during the call", and keeps "This is the rule `_measure` gives the sink's `settle`, and nothing checks it at runtime". The lifetime and reentrancy bullets are removed |
| `verifyEquivalence`'s `predicted` | A `number[]` copy, from `slice` as before. The source line is unchanged |
| `axis.ts` `DisplacementSink.settle`'s `values` | `number[] \| Float64Array`. The JSDoc is unchanged |
| `layout-animation.ts` `settle`'s `values` | `number[] \| Float64Array`. The body is unchanged |
| `linear-shift.ts` `advance`'s `values` | `number[]` |
| `xy.ts` `before` | Unchanged |

**Other comments:**

- `_collect`: "A local, not repeated field reads: the loop writes it once per slot" became "Locals, not repeated field reads inside the loops", because the method now holds two locals. The append loop has a new comment: "Appended, because `_measure` may first write a slot in the middle of the collection, and a write past the length would leave a hole."
- `_retire`: "keeps the numeric buffer for reuse" became "keeps the slot array for reuse".
- **Rewritten because its reason was replacement:** `linear-shift.ts`, in `_refresh` after `_collect`: "Read once: `_measure` writes into this buffer and never replaces it" became "Read once, outside the loops."
- **`xy.ts` and `y.ts`:** no comment gives replacement as its reason, so neither file changed. `xy.ts`'s "before the refresh rewrites the buffer" stays.
- `ReadonlyFloat64Array`'s JSDoc is unchanged.

**`grep -n "capacity\|Float64Array" src/sortable/rect-index.ts`** finds `ReadonlyFloat64Array` (lines 32, 35, 38, 104, 312), `pack`'s union (43), `#placeholderRect` (81) and `_holds`'s scratch (263). No line holds `capacity`.

### Property 2: write and growth sites

Lines are `5ec3b4b2d`'s. `n` is the slot count that `_collect` computes. Every index a write uses is below `n * STRIDE`.

**The one growth site:** `rect-index.ts:154–156`, in `_collect` after the item loop. It runs `values.push(0)` from `values.length` up to `n * STRIDE`, so it appends only when the collection has more slots than the array holds. Nothing assigns `length`, and nothing removes elements. When `_collect` returns early (not stale, same version), `n` is the count that the last full `_collect` grew the array for.

**Write sites:**

| Site | Writes | Why the index is below the length |
| --- | --- | --- |
| `rect-index.ts:47–52`, `pack`, called from `_measure` at `:187` with `values` and `offset = i * STRIDE` | Six fields of slot `i`, for `lo ≤ i < hi` | Every `_measure` call follows a `_collect` of the same version, and `hi ≤ _count = n`. The callers are `linear-shift.ts:179` (`_end < count`), `linear-shift.ts:187` (`_first > 0`, range ending at `_first ≤ n`), `xy.ts:40` (`0` to `_count`) and `verifyEquivalence`'s `:329` (the previous window, at an unchanged version, so the same `n`) |
| `layout-animation.ts:146–151`, the sink's `settle`, called from `_measure` at `rect-index.ts:195` | Six fields of slot `i`, for `first ≤ i < end` | `_measure` passes `lo` and `hi`, as in the row above |
| `linear-shift.ts:119–121`, `advance`, called through `_lend` at `rect-index.ts:222` from `linear-shift.ts:240` | `TOP`, `BOTTOM` and `CENTER_Y` of slot `i`, for `lo ≤ i < hi` | By the extent rule, `lo` to `hi` is inside the window, which `_measure` built below `n`. `_moved` lends only when the cache isn't stale and its version is the snapshot's |

`pack` also writes `#placeholderRect` (`:230`) and `_holds`'s scratch (`:265`). The sink's `settle` also writes the one-slot scratch from `_holds` (`:266`) and from the probe (`linear-shift.ts:232`). These are fixed-size `Float64Array`s, not the slot array.

## Item 3. The tests

1. **The helpers** (`tests/displacement-sink.browser.test.ts`):
   - the `SettleCall` fields `values` and `settled` are `number[] | Float64Array`;
   - the comment above `recordSettles` describes the slot array and the one-slot `Float64Array` scratch;
   - `measurementsOf` filters by `Array.isArray(call.values)`;
   - `expectCacheRanges` asserts `Array.isArray(values)`, together with the identity, length and range assertions. The `byteOffset` and `buffer.byteLength` assertions are removed. The JSDoc of both functions says "slot array" where it said "buffer".
2. **No title and no other assertion changed.** The base and end verdict lists are identical once line numbers are removed.
3. **The copy mutation** ([patch and output](measurements/2026-11-13-slot-array-copy-mutation.txt)): `_measure` passes `values.slice()` to `settle`. Both `drag:DRD-50` tests that call `expectCacheRanges` fail in Chromium, on the identity assertion at line 102:
   - `y()`: "expected 2 to be 1";
   - `xy()`: "expected 3 to be 1".
4. **M8** ([patch and output](measurements/2026-11-13-slot-array-m8.txt)): `layout-animation.ts`'s loop becomes `for (let i = 0; i < end - first; i += 1)`. "drag:DRD-50 should settle a row in flight when the window grows over it, and hold the gap its flow position gives" fails in Chromium: "expected 119.94444274902344 to be close to 80". This is the settled-geometry failure that `DRD-50`'s record gives for M8.

Both mutations ran in a scratch worktree whose tree equals `5ec3b4b2d`, through the runner.

## Item 4. The publication

1. **The map** ([output](measurements/2026-11-13-slot-array-landing-and-map.txt)): 53 names and 263 occurrences, byte-identical to the committed map.
2. **`tests/publication.node.test.ts`:** its five tests pass in the end suite, as at the base.
3. **`.d.ts`** ([diff](measurements/2026-11-13-slot-array-dts.diff.txt)): the same 27 files. One line differs, in `sortable/axis.d.ts`: `settle(values: number[] | Float64Array, items: readonly HTMLElement[], first: number, end: number): void;`. No `.d.ts.map` is emitted at either point.
4. **`typedoc`** ([output](measurements/2026-11-13-slot-array-end-typedoc.txt)): the same two warnings, `DisplacementInstaller` and `AxisInstaller`.

## Item 5. Readings

### Size

Base `706b91481`, end `5ec3b4b2d`, from `npx just size` ([base](measurements/2026-11-13-slot-array-base-size.txt), [end](measurements/2026-11-13-slot-array-end-size.txt)). The figures are minified / gzip-9 / Brotli-11, and Brotli-11 is the gated figure.

| Row | Base | End | Δ | Verdict at base → end |
| --- | --- | --- | --- | --- |
| draggable alone (control) | 6487 / 2373 / 2154 | 6487 / 2373 / 2154 | 0 / 0 / 0 | red → red, 15 B over and control moved by 130 B |
| draggable + lift (control) | 11262 / 4346 / 3915 | 11262 / 4346 / 3915 | 0 / 0 / 0 | green → green |
| example: resize handle (control) | 9144 / 3613 / 3269 | 9144 / 3613 / 3269 | 0 / 0 / 0 | green → green |
| example: drop zone (control) | 12901 / 5051 / 4549 | 12901 / 5051 / 4549 | 0 / 0 / 0 | red → red, 118 B over |
| example: canvas group (control) | 9280 / 3576 / 3265 | 9280 / 3576 / 3265 | 0 / 0 / 0 | green → green |
| freeDrag (control) | 14638 / 5478 / 4932 | 14638 / 5478 / 4932 | 0 / 0 / 0 | green → green |
| freeDrag + bounds + landing (control) | 15747 / 5963 / 5362 | 15747 / 5963 / 5362 | 0 / 0 / 0 | red → red, 152 B over |
| sortable + y | 19674 / 7211 / 6521 | 19553 / 7179 / 6490 | −121 / −32 / −31 | green → green |
| sortable + xy | 19347 / 7106 / 6403 | 19226 / 7077 / 6371 | −121 / −29 / −32 | green → green |
| complete | 21307 / 7937 / 7154 | 21186 / 7906 / 7123 | −121 / −31 / −31 | red → red, 89 B over → 58 B over |

- **The seven control rows read 0/0/0.**
- **No verdict changed.** The same four rows are red at both points, so nothing goes to `DRO-4` from this unit. "complete" is 31 B nearer its ceiling.
- **Every row's module list is unchanged.** The scratch script [`modules.ts`](measurements/2026-11-13-slot-array-modules.ts.txt) printed the lists at both points, and they are identical. They are in the size files.
- **Cause, inferred from the diff:** `capacityFor` and `#capacity` are removed, and the capacity check, `capacityFor` call and `new Float64Array` are replaced by one append loop. The three `sortable` rows each contain `rect-index.ts`, and they move by the same minified amount. gzip and Brotli agree in sign on every row.

### Allocation

These readings use `DRD-52`'s probes in the `shipped` project in Chromium, heap sampling at 16 B, one probe test per launch through the runner. Each tree had its own scratch worktree, the probe files were appended to that worktree's copy of `tests/hot-path.browser.test.ts`, and the packages were linked from the checkout. Every printed line is in [the allocation record](measurements/2026-11-13-slot-array-alloc.txt). **No launch was discarded:** every line names a function under `sortable/`.

The figures are bytes per sample (`y()`, `xy()`) or per committed move (cold, warm).

| Probe | Base runs | Base mean (spread) | End runs | End mean (spread) | Δ mean |
| --- | --- | --- | --- | --- | --- |
| `y()` per sample | 85.31, 85.81, 85.40 | 85.51 (0.50) | 85.21, 84.56, 86.79 | 85.52 (2.23) | +0.01 |
| `xy()` per sample | 50.31, 49.92, 51.31 | 50.51 (1.39) | 48.06, 48.05, 51.09 | 49.07 (3.04) | −1.45 |
| Committed move, cold | 128.48, 129.52, 131.92 | 129.97 (3.44) | 130.24, 132.74, 126.82 | 129.93 (5.92) | −0.04 |
| Committed move, warm | 15.80, 16.08, 17.36 | 16.41 (1.56) | 16.84, 15.44, 16.08 | 16.12 (1.40) | −0.29 |

- **No difference is larger than the spread inside either tree.**
- **Functions whose bytes grew,** as the mean of three launches over the whole sampled pass: in `y()`, `linear-shift.ts:_refresh` (+56 B) and `operation.ts:move` (+265 B); in the cold move, `linear-shift.ts:_refresh` (+12 B), `rect-index.ts:_measurePlaceholder` (+69 B) and `rect-index.ts:pack` (+328 B). **Each growth is smaller than that function's spread in both trees.** Every other function's figure fell or stayed equal. `rect-index.ts:_collect` appears in one base launch (112 B) and in no end launch.

### Expected costs that weren't measured (`DRD-58` §Costs)

- **The first `_collect` of each index appends six numbers per slot,** where the base allocated one typed array. Inferred from the code. The cold probe's warm-up already grows the array, so the probes don't sample it.
- **V8 holds the first appended zeros as small integers, and the first fractional coordinate converts the array to doubles once.** Inferred from `DRD-58`'s kinds probe. Not observed in this unit.
- **`pack` and `settle` now receive two representations,** `number[]` and `Float64Array`. Observed in the types. The effect on inline caches isn't measured.
- **Timing isn't measured.** `DRD-58` measures no timing, so no `compare.ts`, `--prove`, `--floors`, page check, B3' or in-page floor ran.

## Verification

| Check | Result |
| --- | --- |
| Item 1 | Recorded, as above |
| The tools | Identical at base and end ([list](measurements/2026-11-13-slot-array-tools.txt)) |
| `git diff --stat 8f18d2f67..HEAD -- packages/drag .scripts` | The five source and test files, this report and `measurements/`. `performance-plan.md` and `slot-array-handoff.md` changed only in the architect's `706b91481`. `.scripts/` is unchanged |
| `grep -n "capacity\|Float64Array" src/sortable/rect-index.ts` | Only the fixed-size buffers, `ReadonlyFloat64Array` and `pack`'s union |
| Property 2 | §Property 2: write and growth sites |
| `browser`, `shipped`, `declaration` | Same titles and verdicts as at the base: 354, 9 and 20 passed ([end status](measurements/2026-11-13-slot-array-end-suite-status.json), [log](measurements/2026-11-13-slot-array-end-suite.log), [verdicts](measurements/2026-11-13-slot-array-end-suite-verdicts.txt)) |
| `node` | Same titles and verdicts: 38 passed, and the same four size rows fail. No size verdict changed |
| `consumer` | Same files and tests: 326 passed |
| `drag:DRD-52 development equivalence check` and every `drag:DRD-50` test | Pass in Chromium |
| The copy mutation and M8 | Each fails its witness in Chromium (item 3) |
| Item 4 | Map byte-identical, publication test passes, one `.d.ts` line, `typedoc` unchanged |
| Firefox and WebKit | Not run. Deferred to the owner's planned CI (`706b91481`) |
| `tests/hot-path.browser.test.ts`, `shipped` | 9 passed |
| Format and lint | `npx just fmt`, `lint-fix`, `fmt` and `lint` on the five files. **One ESLint error remains,** in a line this unit doesn't change: `tests/displacement-sink.browser.test.ts:57:3`, `func-name-matching`, "Function name `recorded` should match property name `getBoundingClientRect`". The base file reports the same error. §Boundaries keeps the line outside this unit |
| Typecheck | `npx just typecheck` exits 1 at the base and at the end, with one identical error in `.scripts/tsdown-library.ts(53,11)`, TS2322, from the `vite` and `rolldown` plugin types. No error in `packages/drag` ([output](measurements/2026-11-13-slot-array-typecheck.txt)) |
| Markdown | `npx just fmt` on this report, links checked by a scratch script, and `git diff --check`. Markdown has no linter. `git diff --check` reports trailing whitespace only inside unedited tool output under `measurements/` |

## State left

- **The checkout's environment is unchanged since the return:** no install, and no change to `node_modules`, a lockfile or a browser.
- **The scratch worktrees** for the two allocation trees and the mutations were created by this session and are removed after the report commit.
- The publication redesign, its worktree and `.plan/reviews/` weren't read or changed.

## For the architect

- **`DRD-58`'s measured costs** are the size table's Δ column and the allocation table. Both go to the owner.
- **No verdict changed,** so nothing goes to `DRO-4` from this unit.
- **Open item outside this unit:** the existing `func-name-matching` error in `tests/displacement-sink.browser.test.ts:57`.
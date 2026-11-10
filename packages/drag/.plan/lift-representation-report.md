# Lift representation report

**Input:** `drag/production` at `5401500f8`, the owner's commit of the three source edits that turn `Lifter` into a class. It sits on `ccaf2591c`, which carries [`lift-representation-handoff.md`](lift-representation-handoff.md). **Governing records:** `DRD-29` and `DRF-2` in [`00-index.md`](00-index.md), and the handoff.

**Outcome:** the three items landed in order, and no return condition was met. **No cost is accepted, and no ceiling, threshold or control is re-based.** No timing was taken, and `compare.ts` was not run. The kernel's per-sample reading stays open, and this unit didn't change, interpret or run it beyond the suites (§The kernel per-sample test).

| Commit | Item | Content |
| --- | --- | --- |
| `5401500f8` | Owner | `Lifter` as a class, in `src/lift.ts`, `src/sortable.ts` and `src/free-drag.ts`. Preserved as committed |
| `9cd7e37c5` | 1 | `new Lifter(window)` in the 14 callers, and `type-fest` 5.10.0 in `devDependencies` |
| `8c5ace665` | 2 | `DRF-2`: a new Chromium test bounds `lift.ts:translate`'s bytes per move |
| `b33890461` | 3 | `DRD-29`: a private displacement, `land(x, y, timing?)`, `lift.js`'s exports, `KernelDrag` as `Writable`, the built-ins, tests and README |
| the commit carrying this report | 4 | This report and [`2026-11-08-lift-representation.txt`](measurements/2026-11-08-lift-representation.txt) |

The raw output is in [`2026-11-08-lift-representation.txt`](measurements/2026-11-08-lift-representation.txt). It includes the diff of the owner's edits as committed.

## Item 1: the owner's `Lifter`, with its callers

**The owner's edits were verified as committed,** not as a working-tree diff, because the owner committed them as `5401500f8` before this unit started. `git diff ccaf2591c 5401500f8 -- src | sha256sum` gives `f489261c816fe49aa14513e237b412baa84a63f0fe495359b0e37c48c421f980`, and `--shortstat` gives `3 files changed, 144 insertions(+), 141 deletions(-)`. Both match the handoff. The commit is kept, and item 1 changes nothing under `src/`.

- `createLifter(window)` became `new Lifter(window)` in `bench/size/measure.ts` (its `imports` entry names `Lifter`), in the 12 named tests, and in `tests/fixtures/drop-zone.ts`. No file names only the `Lifter` type, so no import became type-only.
- `tests/faults.browser.test.ts` imported `createLifter` dynamically in one test. That test now imports the module dynamically and calls `new liftModule.Lifter(window)`, so the dynamic import stays the one in use.
- `type-fest` is declared at `5.10.0` in `devDependencies`, by `npm i -D type-fest@5.10.0 -w @ydinjs/drag` from the repository root. The lockfile diff is the single `type-fest` line in this package's entry.

| Check at `9cd7e37c5` | Result |
| --- | --- |
| Format, lint, typecheck | Pass, on the 14 changed files. The owner's three source files pass `fmt-check` and lint unchanged |
| `just test` | 3 failed, 325 passed (328). The failures are the known size rows: `draggable` alone's control, `freeDrag` and `freeDrag` + `bounds` + `landing` |
| `just test-engines` | 63 files, 905 passed, 16 skipped (921) |

The first three-engine run stopped with `browserType.launch` failing on missing host libraries, because `~/.cache/ms-playwright/webkit-env.sh` hadn't been sourced. That setup is the one the ownership unit used. With it sourced, the rerun above passed. Every later three-engine run sourced it.

## Item 2: `DRF-2`, the lift's per-sample bytes are bounded

A new test, "drag:DRF-2 should allocate per sample in the lift only its CSS string, at a non-integer displacement", runs in Chromium only, and the existing tests are unchanged:

- **Composition:** its behavior composes the lift as `lift.js` documents. It makes one `Lifter`, calls `acquire` first in `activate`, and passes `cancelLanding` to `use`.
- **Movement:** `move` translates by the drag's delta plus `0.25` and `0.5`.
- **Sampling:** 20 rows. After the threshold come 300 samples, sampled at a 16-byte interval and selected with `stopHeapSampling('/src/')`.
- **Assertions:** the only `lift.ts` key is `lift.ts:translate`, and its bytes per move are below `B`.

**Calibration, bound check disabled.** `lift.ts:translate` read 142.32, 141.21, 144.85, 140.03 and 140.45 B per move. They span 4.83 B, within 8. **`B` = ⌈144.85⌉ + 8 = 153.** The literal `153` is in the test, and the comment above the assertion states the rule and the five figures.

| Run | Source | Runs | Result |
| --- | --- | --: | --- |
| Calibration | Item 1's, no bound | 5 | 140.03–144.85 B per move, recorded |
| Unmutated | Item 1's, with `B` | 5 | **Passes in 5 of 5:** 142.13, 138.71, 136.56, 139.45, 141.81 |
| L1: `mutationSink = { x, y }` in `translate`, with `mutationSink` a module-level `export let` | With `B` | 5 | **Fails the bound in 5 of 5:** 191.68, 196.01, 196.99, 192.63, 195.35 |
| L1 | The existing test, its lift assertion as it is | 1 | **Passes. This shows `DRF-2`** |

In the last run, `just` split the `-t` phrase into words, so all seven tests in the file ran. The existing test passed, and the one failure was the new test's bound, at 187.53. Source and test were restored after each mutation.

**Check:** format, lint and typecheck pass on the test file.

## Item 3: `DRD-29`

- **`Lift`** has nine keys: the seven snapshot members, `translate` and `land`. `translatedX` and `translatedY` are gone. Every member is set in `acquire` and never written again, so the literal is typed `Lift`, and `lift.ts` no longer needs `Writable`. Its `type-fest` import went, because nothing used it.
- **`land(x, y, timing?)`** calls `timing` once, at the call, with the displacement, then `x - rect.x` and `y - rect.y`. It records `{ x, y, timing }`, with the timing's result or `null`. Because `timing` is called inside the record's literal, a throw records nothing. With `null`, the landing uses the default duration and easing. The last call wins.
- **The landing disposer** passes the displacement record to `startLandingAnimation`, which reads it at release, as before. Reduced motion and the restored position are read there too.
- **`lift.js`** exports `Lifter`, `Lift` and the type `LandingTiming`, re-exported from `shared/landing.ts`. `Landing` is now a module-private type, and `cancelLanding` is `readonly`. The emitted `lift.d.ts` confirms all three.
- **`KernelDrag`** is `Writable<Drag<State>>` from `type-fest`. It typechecks at the kernel's generic sites with no new assertion. It is the only change under `src/kernel/`.
- **The built-ins:**
  - `sortable`'s `landingTarget(drag, recovery)` returns the placeholder's `DOMRectReadOnly`, and `settle` calls `lift.land(left, top, composed)`.
  - `freeDrag`'s `settle` calls `lift.land(x, y, timing)` on `#home`'s point.
  - The code that read `translatedX` and `translatedY` is gone.
- **Tests,** only where the surface required, with no expectation about behavior changed:
  - `authoring.browser`: the key list loses `translatedX` and `translatedY`, and the title says nine keys.
  - `authoring.declaration`: `land(lift.rect.x, lift.rect.y)`, plus a `@ts-expect-error` that a lift has no `translatedX`, because the file asserts absent members.
  - `landing.browser`, the test formerly at line 86: `land(lift.rect.x, lift.rect.y)`.
  - `landing.browser`, the fixed durations: passed as `landing({ duration: -5 })`, `landing({ duration: 321, easing: 'linear' })` and `landing({ duration: 5000 })`.
  - `release.browser`: `landing({ duration: 50 })`.
  - `fixtures/drop-zone`: `land(x, y)`.
- **Documentation:** README §The lift states `new Lifter(window)`, the nine-member `Lift` and `land(x, y, timing?)`, and names `landing()` from `sortable/landing.js` as a timing. `lift.ts`'s JSDoc on `land` matches it.

**The displacement's form:** a private record `{ x, y }`, created in `acquire` and closed over by `translate`, `land` and the landing disposer. `translate` writes its two fields in place. It isn't reachable from the `Lift`. Closure variables were rejected by reading, because V8 boxes a non-integer number written to a function context slot, a new heap number on each write, while a double field of an object is updated in place. The `DRF-2` runs after this item show no rise.

| Check at `b33890461` | Result |
| --- | --- |
| Format, lint, typecheck | Pass, on every changed file and README |
| `just test` | 3 failed, 326 passed (329): the same three size rows |
| `just test-engines` | 63 files, 906 passed, 18 skipped (924). That is item 1's figures plus the new test: passed in Chromium, skipped in Firefox and WebKit |
| `just build` | Passes |
| `just docs-api-prepare` | 0 errors, 5 warnings |
| `type-fest` in the build's `.d.ts` files | **No match.** `KernelDrag` isn't emitted, so `type-fest` stays in `devDependencies` |
| `grep -rniE 'lift\|landing' src/kernel src/draggable.ts` | No match |
| `DRF-2` test, 5 runs | **Passes in 5 of 5:** 139.23, 135.87, 140.84, 139.01, 140.67 B per move |

## `DRO-7`: this unit's figures

### Size

`just size`, Brotli with minified in parentheses. The reference is the [ownership report](ownership-report.md)'s reading at `89995c27e`.

| Row | `89995c27e` | `9cd7e37c5` (1) | `b33890461` (3) | 3 against `89995c27e` | Gate at 3 |
| --- | --: | --: | --: | --: | --- |
| `draggable` alone | 2107 (6464) | 2107 (6464) | 2107 (6464) | 0 (0) | Control 83 B off, as before |
| `draggable` + `lift` | 4094 (11847) | 4089 (11889) | 4118 (11904) | +24 (+57) | Passes |
| example: resize handle | 3210 (9131) | 3210 (9131) | 3210 (9131) | 0 (0) | Passes |
| example: drop zone | 4411 (12717) | 4403 (12771) | 4415 (12774) | +4 (+57) | Passes |
| example: canvas group | 3235 (9285) | 3235 (9285) | 3235 (9285) | 0 (0) | Passes |
| `freeDrag` | 5022 (14959) | 5019 (15013) | 5023 (14968) | +1 (+9) | Over by 56 B (55 at `89995c27e`) |
| `freeDrag` + `bounds` + `landing` | 5272 (15645) | 5268 (15699) | 5272 (15654) | 0 (+9) | Over by 62 B, as before |
| `sortable` + `y` | 6605 (20098) | 6614 (20152) | 6611 (20092) | +6 (−6) | Passes |
| `sortable` + `xy` | 6558 (19714) | 6557 (19768) | 6542 (19708) | −16 (−6) | Passes |
| `complete` | 7006 (21130) | 6992 (21184) | 6984 (21124) | −22 (−6) | Passes |

- **Item 1, the owner's class:** +42 to +54 minified on every lifted row. Brotli moves −14 to +9.
- **Item 3, against item 1, minified:**
  - +15 and +3 on the rows that compose only the lift, because `land` now composes the timing;
  - −45 on the `freeDrag` rows and −60 on the `sortable` rows, because their landing code shrinks more than `land` grows.

  Against `89995c27e`, the net is +57 minified for the rows that compose only the lift, +9 for `freeDrag`, and −6 for `sortable`.

- The rows without the lift don't change.

### Allocation, counted by reading

**Method:** I read the source at `b33890461` and `89995c27e`, and counted with the ownership report's method. Counted: JavaScript objects and functions that library code creates at a site it owns. Not counted: closure contexts, strings, objects the platform returns, and array backing-store growth.

| Per | `89995c27e` | `b33890461` | Difference |
| --- | --- | --- | --- |
| Lifted controller, the `Lifter` | 1 object (the `{ acquire, cancelLanding }` literal), 2 functions (`acquire`, `cancelLanding`) | 1 object (the instance), 1 function (the `cancelLanding` field). `acquire` is on the prototype | **−1 function** |
| Lifted activation, inside the lift | 5 objects, 7 functions, plus 1 more object in each of two cases | 6 objects, 7 functions, plus the same two cases | **+1 object:** the displacement record. The `Lift` has two fewer properties |
| Landing | 2 objects in the built-ins: the spread `{ x, y, ...timing }` literal and the timing's result. 1 in a custom behavior: its `{ x, y }` | 2 in the built-ins: the lift's record and the timing's result. 1 in a custom behavior: the lift's record | **None.** The object moved from the caller into `land` |

The function counts at activation are the `map` callback, the two restore closures, `translate`, `land` and the two disposers. `startLandingAnimation`'s allocations are unchanged. The added object is the cost `DRD-29` anticipated ("about one object header"). It is **reported, not accepted**.

### Per sample

`lift.ts:translate`, bytes per move from the `DRF-2` test:

|  | Runs | Range |
| --- | --- | --- |
| Before `DRD-29` (item 2, unmutated with `B`) | 142.13, 138.71, 136.56, 139.45, 141.81 | 136.56–142.13 |
| After `DRD-29` (item 3) | 139.23, 135.87, 140.84, 139.01, 140.67 | 135.87–140.84 |

There is no rise: the range after is no higher than the range before. `translate` allocates only its CSS string at a non-integer displacement, before and after.

## The kernel per-sample test

"should allocate per sample only the CSS string a lifted write needs", as the suite runs report it. It was neither run alone nor interpreted, and a passing run prints no figure.

| Run | Result | Figure |
| --- | --- | --- |
| `just test` at `9cd7e37c5` | Passed | Not printed |
| `just test-engines` at `9cd7e37c5` | Passed | Not printed |
| `just test` at `b33890461` | Passed | Not printed |
| `just test-engines` at `b33890461` | Passed | Not printed |
| Item 2's L1 run against the existing test (all seven tests in the file) | Passed | Not printed |

## Checks and limits

- Every changed `.ts` file was formatted, lint-fixed, formatted again, linted and typechecked. README and this report were formatted with `npx just fmt`, and `git diff --check` is clean. Lint doesn't apply to Markdown. This report's links resolve to files in `.plan/`.
- Not run, as the handoff requires: timing, `compare.ts`, and any measurement beyond the named runs. The `DRF-2` runs used a temporary `console.log` in the working copy to print each figure, and it was removed before every commit.
- **Not done here:** `00-index.md`'s status for `DRD-29` and `DRF-2`. The register is the architect's.
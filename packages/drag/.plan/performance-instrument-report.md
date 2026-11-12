# Performance instrument report

**Input:** `drag/performance` at `35ee3f39e`, which carries [`performance-instrument-handoff.md`](performance-instrument-handoff.md). Its `src` and `tests` are `a9c323f6a`'s. **Governing records:** `DRD-40`, `DRD-23`'s last bullet, `DRF-1` and `DRF-7` in [`00-index.md`](00-index.md), and [`performance-plan.md`](performance-plan.md) §2 P1.

**Outcome: returned to the architect during item 2's proof.** Items 1 and 2 are committed. The gate injection "one entry on the step list per frame" applies, and its scenario reaches its site. The bytes rule selects the module of that site. But at the current source the injection adds no bytes, so it didn't flag in any of its 3 rounds (§Returned). That is the handoff's first return condition: the injection can't be written with the same cost on the same scenario. It would also fail §5 step 1. **Items 3, 4 and 5 weren't run:** there are no detection floors, no launch-context runs of the per-sample test, no `--prove` at the unit's last commit, no baseline and no size table.

Nothing under `src/` or `tests/` changed: `git diff --stat a9c323f6a..HEAD -- src tests` is empty. No threshold, rule, budget, scenario or existing injection cost moved.

| Commit | Content |
| --- | --- |
| `f50f4a35a` | Item 1: the six injections at the current source, the application pass before a browser starts, and `--prove --dry` |
| `ab14380c1` | Item 2: bytes keyed by module, the kernel selected by location, `--rejudge`'s exclusion, and the seventh gate injection |
| the commit carrying this report | This report |

## Environment

Every browser run recorded `nproc`, `node --version` and `uptime` before and after it, at the head of its raw file. Chrome's version is in each JSON file. Nothing else from this session ran during a browser run.

| Fact | Value |
| --- | --- |
| CPUs | 12 |
| Node | v26.13.0 |
| Chrome | Google Chrome for Testing 157.0.8103.38 (`/usr/local/bin/chrome`) |
| Load average during the runs | 0.95 to 2.95 (one-minute). Other sessions on the machine aren't under this session's control |

## Item 1: `DRF-7`

Raw output: [`2026-11-10-performance-injections-dry.txt`](measurements/2026-11-10-performance-injections-dry.txt).

**What changed in `bench/compare.ts`:**

- Each injection's `file` is its module's path under `src`, and its `find` is a text at the site the handoff names. The `name`, `scenario`, `expect` and injected cost of each are unchanged. The forced-layout injection writes `min-height` on the list, as run 2 of 2026-11-07 did, and not on the lifted item.
- `applyInjection` copies `src` to a temporary directory and bundles the copy. It then applies the patch and bundles again. It throws `injection does not apply in <file>: <find>` unless `find` occurs exactly once. It throws `injection does not apply: <name> leaves the bundle unchanged` when the two bundles are equal.
- `--prove` applies every selected injection before `chromium.launch`. `--prove --dry` stops after that pass. `--only` selects for both. The header comment documents it.

| Run, with `CHROME_EXECUTABLE=/nonexistent/chrome` | Required | Result |
| --- | --- | --- |
| `--prove --dry` | Exit 0, all six listed as applied | Exit 0, six listed |
| D1: the drop injection's `find` set back to its stale text | Non-zero, `injection does not apply`, no other error | Exit 1, `injection does not apply in sortable/operation.ts: const insertion = state.insertion!;…`. Without `--dry` the same error, with no launch error |
| D2: the session injection's `find` cut to the two assignments, which occur twice in `kernel/session.ts` | Non-zero, `injection does not apply` | Exit 1, after the four sortable injections applied |
| D3: the step-list injection's `replace` set equal to its `find` | Non-zero, naming the injection | Exit 1, `injection does not apply: one entry on the step list per frame leaves the bundle unchanged` |

`compare.ts` was restored after each mutation and compared byte for byte. After lint, `run` moved above its first use and nothing else changed. The dry run was repeated after that move, with exit 0.

**Call paths, by reading** (`src/` at `a9c323f6a`):

| Injection | Scenario | Path to the site |
| --- | --- | --- |
| About 1 ms per cycle, at the drop | 50 cycles, 20 items, no landing | `pointerup` on the window, captured by `Session.handleEvent` → `Gesture.enter(#up)` → `Session.#up` → `#drop` → `operation.drop()`, which is `SortableOperation.drop`, before `buildReorderRequest(` |
| 1 KB retained per operation | 200 operations, retained | `pointermove` → `Session.handleEvent` → `Gesture.enter(#move)` → `Session.#move` → `#activate` → `operation.start?.()`, which is `SortableOperation.start` |
| One forced layout per move | 300 moves, 20 items | `pointermove` → `Session.handleEvent` → `Gesture.enter(#move)` → `Session.#move` → `operation.move?.()`, which is `SortableOperation.move`, before `this.#lift.translate(` |
| One O(n) walk per move | 300 moves, 2,000 items | As the forced layout |
| 1 KB allocated per move | Bytes per move, 20 items | `pointermove` → `Session.handleEvent` → `Gesture.enter(#move)` → `Session.#move`, after the button check |
| One entry on the step list per frame | Bytes per move, 20 items | `SortableOperation.move` → `#frame.schedule()` → the animation frame → the frame task in `sortable/behavior.ts` → `drag.requestStep(updateInsertion)` → `Gesture.requestStep`. No pass is running in a frame callback, so the call takes the idle branch |
| Four numbers in `Gesture.enter` (item 2) | Bytes per move, 20 items | Every sample, through `Session.handleEvent`, and every frame, through the idle `requestStep` |

## Item 2: `DRF-1`

Raw output: [`keys`](measurements/2026-11-10-performance-keys.txt) ([JSON](measurements/2026-11-10-performance-keys.json)), [`keys-before`](measurements/2026-11-10-performance-keys-before.txt) ([JSON](measurements/2026-11-10-performance-keys-before.json)), [`n3-prove`](measurements/2026-11-10-performance-n3-prove.txt) ([JSON](measurements/2026-11-10-performance-n3-prove.json), [patch](measurements/2026-11-10-performance-n3-patch.txt)), [`rejudge`](measurements/2026-11-10-performance-rejudge.txt), and the discarded [`keys-discarded`](measurements/2026-11-10-performance-keys-discarded.txt) ([JSON](measurements/2026-11-10-performance-keys-discarded.json)).

**Choice: the bundler's module lines, not a source map.** `bundle` reads rolldown's output. A line `\t// <path from the working directory>` starts each module, and only a path in the chunk's `moduleIds` counts. Each module's key is its path relative to the arm's `src`, such as `kernel/session.ts`. A module outside that `src` is keyed by its path from the package, such as `bench/lab.ts` or `../drag2/src/kernel/queue.ts`. A sampled frame is keyed `<module>:<function>` when it is in the lab bundle's script. A frame with no script still takes its caller's key.

**How the lab bundle's script is found.** A sampled frame of a script that `addScriptTag` inserts has an empty `url`, even with a `//# sourceURL` comment. A probe showed this, and the first key check is discarded for that reason: every key in it carried no module. So `samplingProfile` asks for `[[FunctionLocation]]` of one of `lab`'s functions, through `Runtime.getProperties`, before sampling starts. It keys only frames with that `scriptId`. Nothing is evaluated in the page during sampling.

**Rule.** `isKernelFunction` is removed. `isKernelKey` selects a key that starts with `kernel/` or `draggable.ts:`, and the 16 B per move threshold is unchanged. `judge`'s comment says that only production is judged, and only a kernel module.

| Property | Evidence |
| --- | --- |
| 1. Keys by module and function | Production: `kernel/session.ts:handleEvent`, `kernel/gesture.ts:enter`, `lift.ts:translate`, `sortable/y.ts:resolve` ([`keys.json`](measurements/2026-11-10-performance-keys.json)) |
| 2. The rule selects by location | N1 and N3 below |
| 3. Every arm built from this package's source | Production and control (`keys`), a patched copy in a temporary directory (`n3-prove`), and `--before a9c323f6a` (`keys-before`, the same keys as production). drag2 and the prototype were keyed (`../drag2/src/…`, and the prototype's own `src`), and the run exited 0 |
| 4. `--rejudge` leaves out name-keyed bytes rows | `2026-11-06-compare.json`: both bytes rows print `not judged, the recording cannot carry its rule`. A module-keyed recording is still judged |
| 5. `judge`'s comment | States what the code checks |
| 6. The seventh injection | `an array of four numbers per sample, in Gesture.enter`. Its counter and array are module-level variables, which a new `declaration` field appends to the module. The patched bundle keeps the store |

**Proof, as a pre-check before the commit.** The handoff asks for N1 and N2 from item 5's `--prove`. That run wasn't made (§Returned). These figures come from one `--prove --only 'four numbers|step list|1 KB allocated' --rounds 3`, with N3 added temporarily. The bytes row runs 3 rounds in every `--prove`. The A/A pass in the same run ran at 3 rounds and was quiet on all 12 rows, but it isn't a reading at the prescribed 7 rounds. The run exited 1, because the step list didn't flag.

| Run | Required | Result |
| --- | --- | --- |
| N1: four numbers in `Gesture.enter` | Flags, under `kernel/gesture.ts:enter` | **Flags** in 3 of 3: 99, 108 and 96 B per move, under `kernel/gesture.ts:enter`. Base: 1 to 3 B |
| N2: 1 KB allocated per move | Flags, under its kernel module's key | **Flags** in 3 of 3: 1,050 to 1,051 B per move, under `kernel/session.ts:#move` |
| N2: one entry on the step list per frame | Flags, under its kernel module's key | **Doesn't flag** in any round. Kernel keys stay at 1 to 7 B each, as in base, for example `kernel/gesture.ts:#applyRequests` 2 to 6 and `kernel/callback-list.ts:add` 0 to 1 |
| N3: four numbers in `SortableOperation.move` | Doesn't flag, shown under `sortable/operation.ts:move` | **Doesn't flag.** `sortable/operation.ts:move` reads 53, 49 and 50 B per move. Base: 1 B |

## Returned

**"One entry on the step list per frame" can't produce its cost at the current source** (§Return to the architect, first bullet).

- **The site is reached and selected.** In its readings `kernel/callback-list.ts:add`, `kernel/callback-list.ts:run` and `kernel/gesture.ts:requestStep` appear, all under `kernel/`.
- **The entry allocates nothing measurable.** The steps are a `CallbackList` queue. It stores a callback and its receiver in two slots of one array that it keeps, and it removes an entry before running it. One entry added and run in each frame reuses the array's storage. The list's own comment says that an entry "allocates no object". At `b91db2818` the injection pushed onto `#steps` in `draggable.ts` instead, and it read 73 to 80 B per move under `requestStep` ([remediation report](remediation-report.md) §Instrument proof).
- **What is open for the architect:** whether the step-list injection keeps its cost and is withdrawn or replaced as a gate on the bytes row, or whether "one entry on the step list" should be a different cost that the bytes row can see. Either one changes an injection's cost or its `expect`, which the handoff doesn't allow. I haven't chosen.

**Not a return, and recorded:** the bytes keys now carry the module. So every recording made before `ab14380c1` is left out of `--rejudge` for its bytes rows (property 4). Its timing rows are judged as before.

## Not run

- **Item 3,** the detection floors. The calibration probe for its fixed work was written and not run, so no calibration is recorded.
- **Item 4,** the per-sample test in contexts A to D, with M1 to M3. Nothing in `tests/` was changed, even temporarily.
- **Item 5,** `--prove` at the unit's last commit, the floors, B1 to B3, the profiles and `npx just size`. **There is no baseline of `a9c323f6a`.** `DRO-4`'s timing has no reading from this unit.

## Checks

| Check | Result |
| --- | --- |
| `bench/compare.ts`: `just fmt`, `just lint-fix`, `just fmt`, `just lint` | Pass, in each commit |
| `npx just typecheck` | Pass |
| `git diff --stat a9c323f6a..HEAD -- src tests` | Empty |
| This report: `just fmt`, links checked with a script, `git diff --check` | See the commit. Lint doesn't apply to Markdown |

Scratch: the probes and the run wrapper were in this session's scratchpad. A temporary directory from the first bundle probe was removed. `compare.ts` removes its own.

## Resumed

**Input:** `drag/performance` at `3753fa294`, which carries `DRD-41` and the handoff's §Resumption after the return at `b8f1d1b35`. Items 1 and 2 weren't repeated.

**Outcome: complete.** 2a, 3, 4 and 5 ran as amended. `--prove` passes at the unit's last code commit, B3 flags nothing, and no return condition was met. **The baseline of `a9c323f6a` is B1 and B2 below.** `git diff --stat a9c323f6a..HEAD -- src tests` is still empty.

| Commit | Content |
| --- | --- |
| `676bdd3ba` | 2a: the quiet expectation, its dry check and Q1 |
| `016ba7d5a` | Item 3: `--floors`, its calibration and its dry check |
| `10e631943` | Item 4: the per-sample test's raw readings |
| the commit carrying this section | Item 5's raw readings and this section |

`bench/compare.ts` is the same in `016ba7d5a` and in every later commit, so item 5 ran at the unit's last code. Every browser run recorded `nproc`, `node --version` and `uptime` at the head and foot of its raw file. Load averages were 1.3 to 5.7 (one-minute), from other sessions. Chrome was 157.0.8103.38 throughout.

**A queuing error, no effect on any reading.** B2 and B3 were queued behind B1 by a loop that waited until no process matched `performance-b1.json`. The loop's own command line matched, so it never ended. B1 finished at 17:52. The loop was stopped at 20:27, and B2 and B3 then ran in sequence. Nothing ran in the gap.

### 2a. The quiet witness (`DRD-41`)

Raw output: [`quiet-dry`](measurements/2026-11-10-performance-quiet-dry.txt), [`q1-mutation`](measurements/2026-11-10-performance-q1-mutation.txt) ([JSON](measurements/2026-11-10-performance-q1-mutation.json)).

- An injection's `expect` is a pattern a verdict must match, or `'quiet'`: no verdict on its row flags. Only the step-list injection is quiet. Its name, file, `find`, `replace` and scenario are unchanged (property 1).
- `--prove` fails on a broken expectation of either kind. The line names it: `NOT FLAGGED, expected to flag`, or `FLAGGED, expected quiet`. A met quiet expectation prints `quiet as expected`. The JSON records `expect`, `flagged`, `met` and `counted` (property 2).
- The header comment and the injection's comment say what the witness tests (property 3).
- `counted` is false, and the line says `not counted: no injection expected to flag ran on its row`, when no injection expected to flag on the bytes row ran in the same run (property 4). It doesn't change the exit code.

| Run | Required | Result |
| --- | --- | --- |
| `--prove --dry`, `CHROME_EXECUTABLE=/nonexistent/chrome` | Exit 0, seven apply, the step list listed as quiet | Exit 0. `applies: one entry on the step list per frame, expected to stay quiet`, and six others |
| Q1, a **mutation**: the four-number injection set to `'quiet'`, `--prove --only 'four numbers' --rounds 3` | Non-zero, naming the injection and the broken quiet expectation | Exit 1. `FLAGGED, expected quiet: an array of four numbers per sample, in Gesture.enter ["FLAG 100 B per move","FLAG 98 B per move","FLAG 101 B per move"]`. `compare.ts` restored and identical byte for byte |

Q1's A/A pass at 3 rounds was quiet on all 12 rows. It isn't a reading.

### 3. Detection floors

Raw output: [`floor-calibration`](measurements/2026-11-10-performance-floor-calibration.txt), [`floors-dry`](measurements/2026-11-10-performance-floors-dry.txt), and item 5 step 2's [`floors`](measurements/2026-11-10-performance-floors.txt) ([JSON](measurements/2026-11-10-performance-floors.json)).

- `--floors` runs the series, with `--only`, `--out` and `--dry`. The header comment documents it. `--prove` doesn't run it, and `floors` sets no exit code (properties 1 and 2). Each entry runs with the injected copy as `production` and `control`, unpatched source as `base`, and `--prove`'s rounds: 7, or 3 on the bytes row.
- Each entry records its verdicts, which carry each round's difference, the sign count, the median and the A/A bound, and its raw readings. On the bytes row it also records the kernel bytes per move, injected minus base, per round (property 3).
- **The work** is a loop of `floorWork = Math.imul(floorWork ^ i, 0x5bd1e995)` over a fixed count, with `floorWork` a module-level variable. It reads no clock (property 4). **Calibration:** a scratch probe ran the same loop in a classic script in this Chrome, in 5 fresh pages. In each page, each size of 1,000, 10,000 and 100,000 iterations was called 300 times to warm and 2,000 times timed as one span. It read 38 to 115 iterations per µs, with a median of 59 across the 15 readings. The probe's rate fell after its first page. `ITERATIONS_PER_US` is 60. The sizes are nominal.

| Row | Entry, nominal | Measured script difference, median | Signs | A/A bound | Verdict |
| --- | --- | --: | --: | --: | --- |
| 50 activate-and-drop cycles, 20 items, no landing (µs per cycle) | 300 µs per cycle | 411 µs | 7 of 7 | 626 µs | No difference shown |
|  | 100 µs per cycle | 207 µs | 5 of 7 | 2,929 µs | No difference shown |
| 300 moves, one frame each, 20 items (µs per move) | 100 µs per move | 147 µs | 7 of 7 | 221 µs | No difference shown |
|  | 30 µs per move | 50 µs | 7 of 7 | 33 µs | **Flags slower** |
|  | 10 µs per move | 5 µs | 5 of 7 | 39 µs | No difference shown |
| Bytes per move by function, 20 items | One two-number object per sample, `Session`'s `#move` | Kernel bytes 30, 35 and 32 B per move over base | 3 of 3 | — | **Flags** 30, 31 and 32 B per move under `kernel/session.ts:#move` |
| 200 operations, then destroy: retained objects | One two-number object retained per operation | 5,012 B | 3 of 3 | 0 B | **Flags retains more** |

The script figures are against `base`, and the bounds are the injected arm against its own copy. Task-time verdicts are in the JSON, and none flags. **Reported, not a return:** the timing floors are coarser and less regular than the nominal series. 100 µs per move doesn't flag and 30 µs does, because the 100 µs entry's A/A bound was 221 µs. Neither drop-cycle entry flags. 300 µs per cycle measured 411 µs, but its A/A bound was 626 µs. The bytes and retained rows see the smallest object.

### 4. The kernel per-sample test

Raw output: one file per context and mutation, each run with its `nproc`, `node` and `uptime`, its summary line, and the full vitest output. [`A`](measurements/2026-11-10-performance-persample-A.txt), [`B`](measurements/2026-11-10-performance-persample-B.txt), [`C`](measurements/2026-11-10-performance-persample-C.txt), [`D`](measurements/2026-11-10-performance-persample-D.txt), [`M1-A`](measurements/2026-11-10-performance-persample-M1-A.txt), [`M1-B`](measurements/2026-11-10-performance-persample-M1-B.txt), [`M2-A`](measurements/2026-11-10-performance-persample-M2-A.txt), [`M2-B`](measurements/2026-11-10-performance-persample-M2-B.txt), [`M3-A`](measurements/2026-11-10-performance-persample-M3-A.txt), [`M3-B`](measurements/2026-11-10-performance-persample-M3-B.txt). **Discarded:** [`A-discarded`](measurements/2026-11-10-performance-persample-A-discarded.txt) and [`D-discarded`](measurements/2026-11-10-performance-persample-D-discarded.txt). Their command used the default reporter, which prints no console output for a passing test, so a passing run had no reading. A and D were rerun with `--reporter=verbose`, as B and C already used. The discarded A read 16.39 to 18.59 B per move in its 8 failing runs. [`setup-check`](measurements/2026-11-10-performance-persample-setup-check.txt) is one A run that checked the driver. It isn't counted.

**Method.** A scratch driver applied the temporary edits for each run and restored `src` and `tests` after it with `git checkout -- src tests`. It then checked `git diff --quiet -- src tests`. The edits were a `console.log` of the kernel figure and the bytes, a log of the `DRF-2` test's figure, D's warm pass, and the mutation. D's warm pass is the same 300-move loop, unsampled, then `await frames()`, before `startHeapSampling(64)`. M1 and M3 are at `#move`'s sample assignment after the button check, and M2 is before `this.#running = true` in `Gesture.enter`. Each stores into a module-level variable.

| Context | Runs | Kernel B per move: min / median / max | Failures | `DRF-2` B per move |
| --- | --: | --- | --: | --- |
| A: the test alone | 10 | 14.96 / 17.16 / 18.47 | 8 | 135.40 to 141.43 |
| B: its file | 10 | 0 / 0 / 0 | 0 | 135.16 to 139.11 |
| C: the Chromium suite | 5 | 0 / 0 / 0 | 0 | 135.99 to 138.40 |
| D: alone, warmed | 10 | 0.28 / 0.89 / 1.31 | 0 | 134.95 to 140.97 |
| M1, A | 5 | 62.57 / 64.23 / 68.68 | 5 | — |
| M1, B | 5 | 41.68 / 47.60 / 52.48 | 5 | 133.91 to 136.76 |
| M2, A | 5 | 103.99 / 111.05 / 112.52 | 5 | — |
| M2, B | 5 | 88.19 / 92.53 / 101.71 | 5 | 136.37 to 138.31 |
| M3, A (record only) | 3 | 43.31 / 46.29 / 48.11 | 3 | — |
| M3, B (record only) | 3 | 51.85 / 52.93 / 53.97 | 3 | 134.60 to 135.41 |

- **Per function.** In A every run has kernel keys: `kernel/session.ts:handleEvent` 4.4 to 6.3 B per move, `#move` 2.5 to 4.3, `kernel/gesture.ts:enter` 1.9 to 3.3, `#applyRequests` 1.7 to 3.1, `kernel/gesture.ts:requestStep` and `kernel/session.ts:requestStep` 0.7 to 1.7, and `advance`, `stepTarget` and `kernel/callback-list.ts:get empty` 0.3 to 0.6 in some runs. In B and C no kernel key appears in any run. In D only `kernel/session.ts:handleEvent` appears, at 0.3 to 1.3 in every run, with `kernel/gesture.ts:requestStep` at 0.3 in one run. Under each mutation the injected function carries the excess. M1 and M3 read under `#move`: 49.8 to 53.3 for M1 in A, and 29.8 to 36.3 for M3 in A. M2 reads 93.6 to 97.2 under `enter` in A. In B the injected function is the only kernel key.
- **Order before the test in B,** the same in every run: the five earlier tests of `hot-path.browser.test.ts`. They are "should read no layout in a sample…", "should run the spatial search at most once per frame", "should measure a landing target only with a landing composed" with `false` and with `true`, and "should run no consumer callback per sample". In C the same five run before it in that file.
- **C's failures** are the six size rows in each of its 5 runs, and nothing else.
- **Observed in A:** the `-t` filter also ran the `DRF-2` test, after the target test, in every run. A test that runs afterwards can't warm the target.
- **D against B.** Both are far under the threshold, but they aren't the same distribution. B reads exactly 0, with no kernel key, and D reads 0.28 to 1.31, with one key.
- **M1 and M2 fail in every run** of A and B. M3 fails in every run too, so the test's comment, "an object per sample would show as tens of bytes", holds at the smallest object.

**Hypotheses.** **The evidence supports H1.** Alone, the kernel's functions allocate a few bytes per sample each, 15 to 18.5 B per move in total. One unsampled pass of the same loop removes nearly all of it, to 0.28 to 1.31. The five earlier tests in the file remove all of it. **H2 doesn't explain the failures.** One 64 B sample is 0.21 B per move, and A's spread of 3.5 B per move is about 16 samples. A's failures come from the level the unwarmed code reads, which sits at the threshold, not from granularity. D's spread of 1 to 6 samples is consistent with granularity. No trace of optimization through `--js-flags` was taken, so the claim that unwarmed code is unoptimized code isn't observed directly. I haven't chosen a repair.

### 5. The proof, the floors and the baseline

#### Step 1: `--prove`

Raw output: [`prove`](measurements/2026-11-10-performance-prove.txt) ([JSON](measurements/2026-11-10-performance-prove.json)). Exit 0, 7 rounds, and 3 on the bytes row.

| Injection | Expected | Result |
| --- | --- | --- |
| About 1 ms of script per cycle, at the drop | Flag | Flags slower: 7 of 7, median 1,158 µs, A/A bound 508 µs |
| One object of about 1 KB retained per operation | Flag | Flags retains more: 3 of 3, median 207,392 B, bound 0 B |
| One forced layout per move | Flag | Flags more: 366 layouts against 83 |
| One O(n) walk per move | Flag | Flags slower: 7 of 7, median 1,016 µs, bound 827 µs |
| 1 KB allocated per move (**N2**) | Flag | Flags 1,051 B per move in 3 of 3, under `kernel/session.ts:#move` |
| One entry on the step list per frame (**N4**) | Quiet | Quiet as expected, and counted |
| Four numbers in `Gesture.enter` (**N1**) | Flag | Flags 106, 97 and 96 B per move, under `kernel/gesture.ts:enter` |

The A/A pass is quiet on all 12 validation rows. **N4's keys** in its injected arms: production has `kernel/callback-list.ts:add` 1 and `run` 1 B per move in round 1, and `run` 1 in round 3. Control has `add` 1 and `run` 1 in round 3. `kernel/gesture.ts:requestStep` reads 1 in production rounds 1 and 2 and in control round 1, and `kernel/session.ts:requestStep` reads 1 in production round 3. Base has `kernel/gesture.ts:requestStep` 1 in each round and no `callback-list` key. `DRF-1`'s condition, that the unit's `--prove` passes, is met at this commit.

#### Step 2: the floors

In §3 above.

#### Steps 3 and 4: B1 and B2, the baseline

Raw output: [`b1`](measurements/2026-11-10-performance-b1.txt) ([JSON](measurements/2026-11-10-performance-b1.json)) and [`b2`](measurements/2026-11-10-performance-b2.txt) ([JSON](measurements/2026-11-10-performance-b2.json)), each `node bench/compare.ts --out`: all rows, 7 rounds, arms drag2, prototype, production and control, in separate processes. Both exit 0. Each cell is the verdict, the sign count, then the median and the A/A bound in µs, unless the cell says B. "Faster" and "slower" are production's. A verdict whose kind differs between B1 and B2 is marked **unstable**.

| Row | Against | Measure | B1 | B2 |
| --- | --- | --- | --- | --- |
| 300 moves, one frame each, 20 items | drag2 | layouts | at or below: 83 against 83 | at or below: 83 against 83 |
| 300 moves, one frame each, 20 items | drag2 | scriptUs | faster, 0/7, -31 / 20 | no difference shown, 0/7, -21 / 22 **unstable** |
| 300 moves, one frame each, 20 items | drag2 | taskUs | no difference shown, 3/7, -36 / 230 | no difference shown, 3/7, -25 / 314 |
| 300 moves, one frame each, 20 items | prototype | layouts | at or below: 83 against 83 | at or below: 83 against 83 |
| 300 moves, one frame each, 20 items | prototype | scriptUs | no difference shown, 1/7, -2 / 20 | no difference shown, 6/7, 11 / 22 |
| 300 moves, one frame each, 20 items | prototype | taskUs | no difference shown, 1/7, -90 / 230 | no difference shown, 5/7, 169 / 314 |
| 300 moves, one frame each, 2000 items | drag2 | layouts | at or below: 83 against 83 | at or below: 83 against 83 |
| 300 moves, one frame each, 2000 items | drag2 | scriptUs | faster, 1/7, -34 / 20 | no difference shown, 0/7, -24 / 31 **unstable** |
| 300 moves, one frame each, 2000 items | drag2 | taskUs | no difference shown, 3/7, -35 / 408 | no difference shown, 3/7, -46 / 505 |
| 300 moves, one frame each, 2000 items | prototype | layouts | at or below: 83 against 83 | at or below: 83 against 83 |
| 300 moves, one frame each, 2000 items | prototype | scriptUs | no difference shown, 5/7, 5 / 20 | no difference shown, 3/7, -1 / 31 |
| 300 moves, one frame each, 2000 items | prototype | taskUs | no difference shown, 5/7, 88 / 408 | no difference shown, 4/7, 8 / 505 |
| bytes per move by function, 20 items | rule | bytes, kernel | nothing flags | nothing flags |
| press and release below the threshold, 20 items, [...root.children] | drag2 | scriptUs | no difference shown, 4/7, 10 / 55 | no difference shown, 0/7, -25 / 63 |
| press and release below the threshold, 20 items, [...root.children] | drag2 | taskUs | no difference shown, 4/7, 52 / 151 | no difference shown, 2/7, -26 / 171 |
| press and release below the threshold, 20 items, [...root.children] | prototype | scriptUs | no difference shown, 5/7, 13 / 55 | no difference shown, 4/7, 6 / 63 |
| press and release below the threshold, 20 items, [...root.children] | prototype | taskUs | no difference shown, 5/7, 28 / 151 | no difference shown, 5/7, 4 / 171 |
| press and release below the threshold, 20 items, cached array | drag2 | scriptUs | no difference shown, 1/7, -28 / 63 | no difference shown, 3/7, -14 / 54 |
| press and release below the threshold, 20 items, cached array | drag2 | taskUs | no difference shown, 1/7, -29 / 330 | no difference shown, 3/7, -20 / 211 |
| press and release below the threshold, 20 items, cached array | prototype | scriptUs | no difference shown, 2/7, -14 / 63 | no difference shown, 6/7, 7 / 54 |
| press and release below the threshold, 20 items, cached array | prototype | taskUs | no difference shown, 2/7, -62 / 330 | no difference shown, 5/7, 32 / 211 |
| press and release below the threshold, 2000 items, [...root.children] | drag2 | scriptUs | FLAG slower, 7/7, 385 / 357 | FLAG slower, 7/7, 472 / 430 |
| press and release below the threshold, 2000 items, [...root.children] | drag2 | taskUs | no difference shown, 7/7, 521 / 596 | no difference shown, 7/7, 511 / 563 |
| press and release below the threshold, 2000 items, [...root.children] | prototype | scriptUs | no difference shown, 3/7, -11 / 357 | no difference shown, 2/7, -106 / 430 |
| press and release below the threshold, 2000 items, [...root.children] | prototype | taskUs | no difference shown, 4/7, 8 / 596 | no difference shown, 2/7, -197 / 563 |
| press and release below the threshold, 2000 items, cached array | drag2 | scriptUs | no difference shown, 2/7, -19 / 68 | no difference shown, 0/7, -26 / 48 |
| press and release below the threshold, 2000 items, cached array | drag2 | taskUs | no difference shown, 6/7, 86 / 253 | no difference shown, 4/7, 49 / 157 |
| press and release below the threshold, 2000 items, cached array | prototype | scriptUs | no difference shown, 4/7, 24 / 68 | no difference shown, 5/7, 13 / 48 |
| press and release below the threshold, 2000 items, cached array | prototype | taskUs | no difference shown, 4/7, 112 / 253 | no difference shown, 5/7, 15 / 157 |
| 50 activate-and-drop cycles, 20 items, no landing | drag2 | layouts | at or below: 250 against 300 | at or below: 250 against 300 |
| 50 activate-and-drop cycles, 20 items, no landing | drag2 | scriptUs | no difference shown, 3/7, -90 / 334 | no difference shown, 1/7, -130 / 528 |
| 50 activate-and-drop cycles, 20 items, no landing | drag2 | taskUs | no difference shown, 6/7, 1484 / 2533 | no difference shown, 4/7, 309 / 4067 |
| 50 activate-and-drop cycles, 20 items, no landing | prototype | layouts | at or below: 250 against 250 | at or below: 250 against 250 |
| 50 activate-and-drop cycles, 20 items, no landing | prototype | scriptUs | no difference shown, 6/7, 132 / 334 | no difference shown, 3/7, -40 / 528 |
| 50 activate-and-drop cycles, 20 items, no landing | prototype | taskUs | no difference shown, 5/7, 1036 / 2533 | no difference shown, 3/7, -239 / 4067 |
| 50 activate-and-drop cycles, 20 items, with landing | drag2 | layouts | at or below: 350 against 350 | at or below: 350 against 350 |
| 50 activate-and-drop cycles, 20 items, with landing | drag2 | scriptUs | no difference shown, 1/7, -100 / 433 | no difference shown, 2/7, -51 / 423 |
| 50 activate-and-drop cycles, 20 items, with landing | drag2 | taskUs | no difference shown, 5/7, 353 / 2300 | no difference shown, 4/7, 524 / 2451 |
| 50 activate-and-drop cycles, 20 items, with landing | prototype | layouts | at or below: 350 against 350 | at or below: 350 against 350 |
| 50 activate-and-drop cycles, 20 items, with landing | prototype | scriptUs | no difference shown, 7/7, 64 / 433 | no difference shown, 4/7, 1 / 423 |
| 50 activate-and-drop cycles, 20 items, with landing | prototype | taskUs | no difference shown, 5/7, 553 / 2300 | no difference shown, 1/7, -173 / 2451 |
| 50 activate-and-drop cycles, 2000 items, no landing | drag2 | layouts | at or below: 250 against 300 | at or below: 250 against 300 |
| 50 activate-and-drop cycles, 2000 items, no landing | drag2 | scriptUs | no difference shown, 5/7, 42 / 1105 | no difference shown, 2/7, -289 / 1820 |
| 50 activate-and-drop cycles, 2000 items, no landing | drag2 | taskUs | FLAG slower, 6/7, 4095 / 3472 | no difference shown, 6/7, 2871 / 8249 **unstable** |
| 50 activate-and-drop cycles, 2000 items, no landing | prototype | layouts | at or below: 250 against 250 | at or below: 250 against 250 |
| 50 activate-and-drop cycles, 2000 items, no landing | prototype | scriptUs | no difference shown, 5/7, 551 / 1105 | no difference shown, 3/7, -179 / 1820 |
| 50 activate-and-drop cycles, 2000 items, no landing | prototype | taskUs | no difference shown, 5/7, 1686 / 3472 | no difference shown, 4/7, 942 / 8249 |
| 50 activate-and-drop cycles, 2000 items, with landing | drag2 | layouts | at or below: 350 against 350 | at or below: 350 against 350 |
| 50 activate-and-drop cycles, 2000 items, with landing | drag2 | scriptUs | no difference shown, 0/7, -507 / 948 | no difference shown, 2/7, -433 / 2601 |
| 50 activate-and-drop cycles, 2000 items, with landing | drag2 | taskUs | no difference shown, 5/7, 602 / 3227 | no difference shown, 4/7, 1935 / 14715 |
| 50 activate-and-drop cycles, 2000 items, with landing | prototype | layouts | at or below: 350 against 350 | at or below: 350 against 350 |
| 50 activate-and-drop cycles, 2000 items, with landing | prototype | scriptUs | no difference shown, 2/7, -326 / 948 | no difference shown, 4/7, 510 / 2601 |
| 50 activate-and-drop cycles, 2000 items, with landing | prototype | taskUs | no difference shown, 1/7, -2051 / 3227 | no difference shown, 3/7, -658 / 14715 |
| 50 keyboard reorders, 20 items, with focus restoration | drag2 | layouts | at or below: 50 against 100 | at or below: 50 against 100 |
| 50 keyboard reorders, 20 items, with focus restoration | drag2 | scriptUs | no difference shown, 1/7, -103 / 261 | no difference shown, 4/7, 17 / 132 |
| 50 keyboard reorders, 20 items, with focus restoration | drag2 | taskUs | no difference shown, 1/7, -172 / 471 | no difference shown, 5/7, 52 / 262 |
| 50 keyboard reorders, 20 items, with focus restoration | prototype | layouts | at or below: 50 against 50 | at or below: 50 against 50 |
| 50 keyboard reorders, 20 items, with focus restoration | prototype | scriptUs | no difference shown, 5/7, 40 / 261 | no difference shown, 5/7, 65 / 132 |
| 50 keyboard reorders, 20 items, with focus restoration | prototype | taskUs | no difference shown, 4/7, 39 / 471 | no difference shown, 4/7, 139 / 262 |
| 50 keyboard reorders, 2000 items, with focus restoration | drag2 | layouts | at or below: 50 against 100 | at or below: 50 against 100 |
| 50 keyboard reorders, 2000 items, with focus restoration | drag2 | scriptUs | no difference shown, 3/7, -4 / 351 | no difference shown, 3/7, -11 / 311 |
| 50 keyboard reorders, 2000 items, with focus restoration | drag2 | taskUs | no difference shown, 1/7, -382 / 1201 | faster, 0/7, -1003 / 993 **unstable** |
| 50 keyboard reorders, 2000 items, with focus restoration | prototype | layouts | at or below: 50 against 50 | at or below: 50 against 50 |
| 50 keyboard reorders, 2000 items, with focus restoration | prototype | scriptUs | no difference shown, 5/7, 291 / 351 | no difference shown, 3/7, -32 / 311 |
| 50 keyboard reorders, 2000 items, with focus restoration | prototype | taskUs | no difference shown, 5/7, 699 / 1201 | no difference shown, 2/7, -118 / 993 |
| 200 operations, then destroy: retained JavaScript objects | drag2 | retained objects | FLAG retains more, 3/3, 4076 / 0 B | FLAG retains more, 3/3, 4076 / 0 B |
| 200 operations, then destroy: retained JavaScript objects | prototype | retained objects | FLAG retains more, 3/3, 3396 / 0 B | FLAG retains more, 3/3, 3396 / 0 B |
| free drag, 300 moves, one frame each | drag2 | layouts | at or below: 0 against 0 | at or below: 0 against 0 |
| free drag, 300 moves, one frame each | drag2 | scriptUs | faster, 0/7, -15 / 14 | faster, 0/7, -21 / 7 |
| free drag, 300 moves, one frame each | drag2 | taskUs | no difference shown, 4/7, 26 / 172 | no difference shown, 3/7, -61 / 182 |
| free drag, 300 moves, one frame each | prototype | layouts | at or below: 0 against 0 | at or below: 0 against 0 |
| free drag, 300 moves, one frame each | prototype | scriptUs | no difference shown, 4/7, 3 / 14 | no difference shown, 2/7, -2 / 7 |
| free drag, 300 moves, one frame each | prototype | taskUs | no difference shown, 3/7, -11 / 172 | no difference shown, 4/7, 15 / 182 |
| draggable no-lift, move: script | — | report only, no verdict | — | — |
| draggable no-lift, move: bytes per move by function | rule | bytes, kernel | nothing flags | nothing flags |

- **Flags in both B1 and B2:** production is slower than drag2 in script on "press and release below the threshold, 2000 items, `[...root.children]`" (385 and 472 µs per press, bounds 357 and 430). It is a report row. Production retains more than drag2 (4,076 B) and the prototype (3,396 B) over 200 operations, with the same figures in both.
- **Faster in both:** script on "free drag, 300 moves" against drag2.
- **Unstable, 4 verdicts:** script against drag2 on both 300-move sortable rows (faster in B1, no difference in B2), task time against drag2 on "50 activate-and-drop cycles, 2000 items, no landing" (slower in B1, no difference in B2), and task time against drag2 on "50 keyboard reorders, 2000 items" (no difference in B1, faster in B2).
- Neither bytes row flags in either run.

#### Step 5: B3

Raw output: [`b3`](measurements/2026-11-10-performance-b3.txt) ([JSON](measurements/2026-11-10-performance-b3.json)). `--before a9c323f6a --rows validation`, exit 0. **No verdict flags** on any of the 12 validation rows. Every script and task verdict reads "no difference shown", and every layout verdict reads "at or below".

#### Step 6: profiles

Only the "press and release, 2000 items, `[...root.children]`" row flags slower against a before arm in both B1 and B2. The retained row flags "retains more", not slower, so no `--attribute` run was made. Raw output: [`profile-press-2000-children`](measurements/2026-11-10-performance-profile-press-2000-children.txt) ([JSON](measurements/2026-11-10-performance-profile-press-2000-children.json)), `--profile --only 'press and release below the threshold, 2000 items, [...root.children]'`. The top functions per arm, by self time in µs, apart from `(idle)` and `(program)`, as printed and not interpreted:

| Arm | Top functions |
| --- | --- |
| drag2 | `makeRows` 6,030; `dispose` 2,971; `addEventListener` 933; `sortable` 861; `(garbage collector)` 799; `(anonymous, line 8073)` 585; `#createOperation` 554 |
| prototype | `sortable.items` 24,987; `(anonymous, line 2090)` 8,647; `makeRows` 7,634; `(garbage collector)` 5,747; `append` 1,083; `resolveAdmission` 810; `sortable` 754 |
| production | `sortable.items` 19,443; `makeRows` 13,153; `(anonymous, line 2301)` 6,170; `(garbage collector)` 4,219; `append` 1,667; `sortable` 1,189; `#endPending` 1,083 |

#### Step 7: size

Raw output: [`size`](measurements/2026-11-10-performance-size.txt). `npx just size` exits 1. No ceiling was changed.

| Red row | Excess |
| --- | --- |
| draggable alone | Over its 2,139 B ceiling by 63 B. Also "control moved by 178 B" |
| example: resize handle | Over its 3,313 B ceiling by 4 B |
| example: drop zone | Over its 4,431 B ceiling by 177 B |
| freeDrag | Over its 4,967 B ceiling by 73 B |
| freeDrag + bounds + landing | Over its 5,210 B ceiling by 265 B |
| complete | Over its 7,065 B ceiling by 41 B |

These are the six red rows the handoff expects. "draggable alone" also reports its control moving by 178 B.

### Return conditions, after resumption

None was met. `--prove` passed, B3 flagged nothing, and no change needed an edit under `src/` or a committed test edit. **Reported, not returns:** four unstable verdicts between B1 and B2, the timing floors' coarseness, and M1 and M2 failing in every run, so none passed.

### Checks, after resumption

| Check | Result |
| --- | --- |
| `bench/compare.ts`: `just fmt`, `just lint-fix`, `just fmt`, `just lint` | Pass, in `676bdd3ba` and `016ba7d5a` |
| `npx just typecheck` | Pass |
| `git diff --stat a9c323f6a..HEAD -- src tests` | Empty |
| This section: `just fmt`, links checked with a script, `git diff --check` | See the commit. Lint doesn't apply to Markdown |

### Next

The architect reads this section. Per the handoff's §After this unit, the architect decides the per-sample test's repair and whether the floors are fine enough for optimization. `DRO-4`'s timing goes to the owner from B1 and B2.
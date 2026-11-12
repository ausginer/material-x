# Performance resolution report

**Input:** [`performance-resolution-handoff.md`](performance-resolution-handoff.md), carried by `9fb5ff3b2`. The unit started at `2e3697845`, which is `9fb5ff3b2` plus the [campaign runner](campaign-runner-report.md). `src` is `a9c323f6a`'s. **Governing records:** `DRD-42`, `DRD-43`, `DRD-40`, `DRD-23`'s last bullet and `DRO-4` in [`00-index.md`](00-index.md).

**Outcome: returned to the architect at item 4 step 6.** Items 1 and 2 are committed. Item 1 meets every requirement. Item 2's rows run, every cycle ends, and the dry checks pass. **`--prove` exited 1:** neither new gate injection flagged on its in-page row. That is the handoff's third return condition, so **B3' didn't run** and the new rows have no baseline. F1, F2 and item 3 ran before `--prove` and are recorded below.

| Commit | Content |
| --- | --- |
| `a600abc51` | Item 1: the per-sample test's warm pass and comment |
| `a7b3851c1` | Item 2: the four in-page rows, two gate injections, seven floor entries, and `lab.list` |
| the commit carrying this report | Raw output and this report |

## Environment

Every run went through [`bench/campaign.ts`](../bench/campaign.ts) as one campaign, `resolution`. Its status file is [`campaign-status.json`](measurements/2026-11-11-resolution-campaign-status.json). Each browser run records `nproc`, `node --version` and `uptime` at the head and foot of its raw file, and the per-sample runs record them around each run. The [wrapper](measurements/2026-11-11-resolution-record-wrapper.sh.txt) and the [per-sample driver](measurements/2026-11-11-resolution-persample-driver.py.txt) are saved beside them. Nothing else from this session ran during a browser run.

| Fact | Value |
| --- | --- |
| CPUs | 12 |
| Node | v26.13.0 |
| Chrome | 157.0.8103.38 (`/usr/local/bin/chrome`), in each JSON file |
| Load average, one-minute | 4.0 to 9.9. It was 4.0 to 9.5 during item 1, 4.0 to 7.8 during the mutation runs, and 5.6 to 9.9 during F1, F2, item 3 and `--prove`. Other sessions on the machine aren't under this session's control |

## Item 1: `DRD-42`, the warm pass

**The change.** Before `startHeapSampling(64)`, the test runs the same 300-move loop, at the same positions and in the same operation, without sampling, and then `await frames()`. `< 16`, the 64 B interval, the 300 sampled moves, the kernel selection and the lift assertion are unchanged. The comment now says that the unsampled pass lets the kernel's code reach its optimized form, that the test bounds what warm code allocates, and that an allocation that escapes shows as tens of bytes. The `DRF-2` test is unchanged.

**Method.** The driver applies a temporary `PERSAMPLE` log of the kernel figure and the bytes, and the mutation. After each run it restores `src` and `tests` with `git checkout`, then checks them with `git diff --quiet`. Each run is `--reporter=verbose`. The mutations, at the sites of the [previous report](performance-instrument-report.md) §4, are:

- M1: `mutationWitness = [event.clientX, event.clientY, event.clientX, event.clientY]` in `Session`'s `#move`, after the button check.
- M2: `mutationWitness = [n, n, n, n]` in `Gesture.enter`, before `this.#running = true`.
- M3: `mutationWitness = { x: event.clientX, y: event.clientY }` at M1's site.
- M4: `const sample = { x: event.clientX, y: event.clientY }` at M1's site. `#move` then reads `sample.x` and `sample.y` into the sample, and nothing stores `sample`.

The witness is a module-level variable.

| Run | Launch | Runs | Kernel B per move: min / median / max | Failures | Required | Raw |
| --- | --- | --: | --- | --: | --- | --- |
| U-A | test alone | 10 | 0 / 1.03 / 2.47 | 0 | Pass in every run: **met** | [UA](measurements/2026-11-11-resolution-persample-UA.txt) |
| U-B | its file | 5 | 0 / 0.56 / 1.03 | 0 | Pass in every run: **met** | [UB](measurements/2026-11-11-resolution-persample-UB.txt) |
| M1 | alone | 5 | 43.71 / 48.59 / 49.88 | 5 | Fail in every run: **met** | [M1-A](measurements/2026-11-11-resolution-persample-M1-A.txt) |
| M2 | alone | 5 | 80.69 / 85.44 / 87.99 | 5 | Fail in every run: **met** | [M2-A](measurements/2026-11-11-resolution-persample-M2-A.txt) |
| M3 | alone | 5 | 27.63 / 29.03 / 30.80 | 5 | Fail in every run: **met** | [M3-A](measurements/2026-11-11-resolution-persample-M3-A.txt) |
| M1 | its file | 3 | 64.53 / 68.44 / 70.31 | 3 | Fail in every run: **met** | [M1-B](measurements/2026-11-11-resolution-persample-M1-B.txt) |
| M2 | its file | 3 | 80.48 / 81.31 / 84.64 | 3 | Fail in every run: **met** | [M2-B](measurements/2026-11-11-resolution-persample-M2-B.txt) |
| M3 | its file | 3 | 47.67 / 49.45 / 51.53 | 3 | Fail in every run: **met** | [M3-B](measurements/2026-11-11-resolution-persample-M3-B.txt) |
| M4 | alone | 3 | 27.91 / 28.75 / 29.77 | 3 | Record only | [M4-A](measurements/2026-11-11-resolution-persample-M4-A.txt) |
| C | the Chromium suite | 1 | 0.56 | 0 | Only the six size rows fail: **met** | [C](measurements/2026-11-11-resolution-persample-C.txt) |

**Per run,** in launch order. P means pass and F means fail:

- U-A: 0.75 P, 1.59 P, 1.03 P, 0 P, 0.28 P, 1.03 P, 2.47 P, 1.03 P, 1.31 P, 0.56 P.
- U-B: 1.03 P, 0.28 P, 0.56 P, 0.75 P, 0 P.
- M1-A: 49.88, 47.36, 49.64, 43.71 and 48.59, all F.
- M2-A: 83.09, 80.69, 85.44, 85.75 and 87.99, all F.
- M3-A: 29.77, 27.63, 30.80, 28.47 and 29.03, all F.
- M1-B: 68.44, 64.53 and 70.31, all F.
- M2-B: 84.64, 81.31 and 80.48, all F.
- M3-B: 49.45, 51.53 and 47.67, all F.
- M4-A: 29.77, 27.91 and 28.75, all F.
- C: 0.56 P.

**Per function,** in B per move over the runs. Each run's full per-function bytes are on its `PERSAMPLE` line.

- **U-A:** `kernel/session.ts:handleEvent` 0.28 to 1.59 in 9 of 10 runs, and `kernel/session.ts:stepTarget` 0.88 in one. Run 4 has no kernel key.
- **U-B:** `handleEvent` 0.28 to 1.03 in 4 of 5. **C:** `handleEvent` 0.56.
- **M1 and M3:** `kernel/session.ts:#move` carries the excess. It reads 42.96 to 49.60 for M1 and 26.32 to 30.52 for M3 alone, and 62.67 to 68.72 for M1 and 46.64 to 50.51 for M3 in the file. **M2:** `kernel/gesture.ts:enter` reads 80.13 to 86.40 alone and 79.73 to 83.33 in the file. Under each mutation, `handleEvent` stays at 0.28 to 1.87.
- **C's failures** are the six size rows of `tests/size.node.test.ts`: draggable alone, example: resize handle, example: drop zone, freeDrag, freeDrag + bounds + landing, and complete. No other test failed.

**M4 shows,** under `kernel/session.ts:#move` at 27.16 to 28.75 B per move, and it fails in 3 of 3 runs. That is about M3's figure alone. So the object isn't removed in this test, although nothing stores it.

**Not counted:** one M4 run that checked the driver, [`persample-setup-check`](measurements/2026-11-11-resolution-persample-setup-check.txt), which read 31.36. It has no machine record per run, because the driver at that time recorded it only in the file header.

## Item 2: `DRD-43`, rows driven in the page

**Rows.** An id that starts with `in the page:` mirrors the CDP row named by the rest of the id. The header comment says this, and says what the rows drive in the page and why.

| Row | Mirrors | Rule | In the window |
| --- | --- | --- | --- |
| `in the page: 300 moves, one frame each, 20 items` | "300 moves, one frame each, 20 items" | `exact-and-floor` | One evaluation dispatches 300 `pointermove` events at `movePhase(i)`, each followed by one awaited animation frame. The press and crossing are `grabAndCross` through CDP, before the window |
| `in the page: 300 moves, one frame each, 2000 items` | "300 moves, one frame each, 2000 items" | `exact-and-floor` | The same, on 2,000 items |
| `in the page: 50 activate-and-drop cycles, 20 items, no landing` | "50 activate-and-drop cycles, 20 items, no landing" | `exact-and-floor` | One evaluation runs every event of every cycle: a move to `(X, Y0)`, the press, moves to `Y0 + 6`, `Y0 + 12` and `Y0 + 45`, one frame, the release, then the 90 ms wait. The row checks that 50 cycles ended |
| `in the page: driver alone, 300 moves, 20 items, no behavior` | The first row's press, crossing and moves | `report` | The first row's events, on a list from `lab.list(20)` with no behavior mounted |

- **The events.** Each event is a `PointerEvent` with Chrome's mouse fields: `pointerId` 1, `pointerType` `'mouse'`, primary, bubbling, cancelable and composed. A move carries `button` −1, a press `button` 0 with `buttons` 1, and a release `buttons` 0.
- **Where the events go.** Each move of a move row goes to the list, as the root's pointer capture sends real moves. The driver-alone row dispatches to its list in the same way. A cycle's event goes to the root while it holds capture, and otherwise to `document.elementFromPoint`.
- **The library's code is unchanged.** Nothing under `src/` changed, and the events reach the window and root listeners as real input does. `lab.ts` gained only `list(count)`.
- **Where the rows run.** All four are in `VALIDATION_ROWS`. A new `packageArmsOnly` field leaves them out of a run without `--before`, so they don't run with drag2 and the prototype.

**Gate injections:** `30 µs of script per move, in the page` at `MOVE_SITE` on the 20-item move row, and `300 µs of script per cycle, in the page` at `DROP_SITE` on the cycle row. Both use `work()` and `FLOOR_WORK_DECLARATION`, and expect `FLAG slower`. **Graded entries:** 30, 10, 5 and 2 µs per move, and 300, 100 and 30 µs per cycle, at the same sites. The floor constants moved above `INJECTIONS`, unchanged, because an injection now uses `work()`.

**Dry checks** (item 4 step 1, `CHROME_EXECUTABLE=/nonexistent/chrome`):

- [`prove-dry`](measurements/2026-11-11-resolution-prove-dry.txt): 9 apply, the step list is listed as expected to stay quiet, exit 0.
- [`floors-dry`](measurements/2026-11-11-resolution-floors-dry.txt): 14 apply, exit 0.
- `--floors --dry --only 'in the page'` selected exactly the seven new entries. That was checked before the campaign and isn't saved.

**Pre-check, discarded:** [`inpage-precheck-discarded.json`](measurements/2026-11-11-resolution-inpage-precheck-discarded.json) is one round of `--before a9c323f6a --rows validation --only 'in the page'`, run before the commit to check that the rows drive the library and that the cycles end. It has no machine record and isn't a reading. Production read 101 µs of script per move on 20 items, 113 on 2,000, 1,253 per cycle, and 5 for the driver alone, with 83, 83 and 250 layouts.

## Item 4 steps 3 and 4: F1 and F2

Raw output: [`f1`](measurements/2026-11-11-resolution-f1.txt) ([JSON](measurements/2026-11-11-resolution-f1.json)) and [`f2`](measurements/2026-11-11-resolution-f2.txt) ([JSON](measurements/2026-11-11-resolution-f2.json)): `--floors --only 'in the page'`, separate processes, 7 rounds, exit 0. **No entry flags script slower in either run,** and no task or layout verdict flags. The ratio column is the largest absolute A/A difference divided by the median absolute A/A difference.

| Run | Entry, nominal | Verdict | Signs | Median, µs | A/A bound, µs | Differences per round, µs | A/A differences per round, µs | Ratio |
| --- | --- | --- | --: | --: | --: | --- | --- | --: |
| F1 | 30 µs per move | no difference shown | 6 of 7 | 65 | 120 | 96, −37, 65, 95, 6, 24, 115 | 120, −27, −35, 62, −5, −63, 78 | 1.9 |
| F1 | 10 µs per move | no difference shown | 4 of 7 | 14 | 53 | 14, −51, 47, 16, −38, 49, −1 | 53, 24, 3, 44, −38, 4, 19 | 2.2 |
| F1 | 5 µs per move | no difference shown | 4 of 7 | 57 | 96 | −19, 143, 70, −26, −6, 57, 59 | 35, 96, −64, −15, −13, −29, 84 | 2.7 |
| F1 | 2 µs per move | no difference shown | 5 of 7 | 4 | 47 | 4, −67, 47, −29, 1, 37, 40 | 34, −26, 47, −13, 29, 33, 23 | 1.6 |
| F1 | 300 µs per cycle | no difference shown | 5 of 7 | 651 | 1,245 | 1280, −669, 471, 1531, −7, 2004, 651 | 955, −49, 990, 1187, −774, 783, 1245 | 1.3 |
| F1 | 100 µs per cycle | no difference shown | 5 of 7 | 234 | 1,097 | −51, −681, 498, 569, 251, 234, 167 | −1045, −1097, −193, 696, 161, −434, 544 | 2.0 |
| F1 | 30 µs per cycle | no difference shown | 6 of 7 | 140 | 1,290 | 64, −401, 282, 678, 97, 140, 473 | 630, −899, 29, 22, 312, 1290, 657 | 2.0 |
| F2 | 30 µs per move | no difference shown | 4 of 7 | 33 | 167 | −26, 110, 43, 33, −38, 59, −36 | −76, 17, 58, −64, −167, 21, 5 | 2.9 |
| F2 | 10 µs per move | no difference shown | 5 of 7 | 29 | 78 | 29, −6, 27, 42, −26, 29, 46 | 78, −50, −70, 44, 5, −19, 56 | 1.6 |
| F2 | 5 µs per move | no difference shown | 5 of 7 | 12 | 78 | 12, −76, 0, 90, −69, 37, 61 | 28, −4, −26, 78, 1, 8, 65 | 3.0 |
| F2 | 2 µs per move | no difference shown | 4 of 7 | 1 | 26 | 1, −31, 7, 19, −31, 38, −8 | 23, −11, −20, 11, 6, 15, −26 | 1.7 |
| F2 | 300 µs per cycle | no difference shown | 6 of 7 | 655 | 1,322 | 180, 278, 1406, 1581, −512, 655, 686 | −311, 48, 879, 1322, −1027, 22, 585 | 2.3 |
| F2 | 100 µs per cycle | no difference shown | 4 of 7 | 546 | 1,571 | 576, −1529, 966, −1628, 1067, 546, −973 | 1309, −91, 563, −1106, −1571, 941, 1450 | 1.4 |
| F2 | 30 µs per cycle | no difference shown | 3 of 7 | −65 | 1,065 | −304, 1090, 500, −1337, −858, 499, −65 | 106, 123, 1065, −892, −511, −226, 1032 | 2.1 |

The unpatched base arm's median script in these runs was 119 to 197 µs per move and 1,582 to 2,849 µs per cycle.

**Floor, as `DRD-43` property 6 defines it.** No entry flags, so neither row has a floor in either run. On both rows the result is the same in F1 and F2: no entry flagged. Whether "no floor in both runs" counts as stable under property 6 is the architect's reading.

**Sufficiency figure, property 7: not available.** It needs B3', which didn't run. In `--prove`'s A/A pass (below), production's median script was:

| Row | Production's median script | Range over 7 rounds |
| --- | --: | --- |
| In-page moves, 20 items | 119 µs per move | 98 to 246 |
| In-page moves, 2,000 items | 152 µs per move | 109 to 329 |
| Driver alone | 6 µs per move | 5 to 7 |
| In-page cycles | 1,582 µs per cycle | 1,265 to 4,362 |

The CDP rows in the same pass read 178 µs per move (20 items), 182 (2,000 items) and 2,224 µs per cycle.

That isn't the figure the handoff names, and I haven't judged sufficiency.

## Item 3: `DRO-4`, the retained row's attribution

Raw output: [`attribute`](measurements/2026-11-11-resolution-attribute.txt) ([JSON](measurements/2026-11-11-resolution-attribute.json)), `--attribute --only '200 operations'`, exit 0.

**`--attribute` has no control arm.** `diagnose` builds drag2, the prototype and production only, and the handoff boundaries don't cover changing it. So the run has three arms, not four.

**Growth per constructor, 200 operations against 0.** The printout lists each arm's 25 largest by absolute growth, and the JSON lists all of them.

| Constructor | drag2 | prototype | production |
| --- | --: | --: | --: |
| `string` | 10,356 | 10,152 | 10,212 |
| `array ` (an array with an empty internal name) | 60 | 60 | **4,124** |
| `array (object elements)` | 992 | 992 | 1,028 |
| `Object` | 944 | 884 | 852 |
| `Array` | 80 | 112 | 96 |
| `concatenated string` | 300 | 180 | 240 |
| `array (object properties)` | −736 | 352 | −352 |

The `system / Context` entries are keyed by snapshot node id, which differs between snapshots, so their growth isn't comparable by name. Every arm has them, positive and negative, at 32 to 1,440 B.

**Constructors whose growth differs between production and each before arm:**

- **`array `:** +4,064 B against both drag2 and the prototype.
- **Smaller differences,** against drag2 and then against the prototype:

  | Constructor                 | Against drag2 | Against the prototype |
  | --------------------------- | ------------: | --------------------: |
  | `array (object elements)`   |           +36 |                   +36 |
  | `Object`                    |           −92 |                   −32 |
  | `Array`                     |           +16 |                   −16 |
  | `string`                    |          −144 |                   +60 |
  | `concatenated string`       |           −60 |                   +60 |
  | `array (object properties)` |          +384 |                  −704 |

- **The same in all three arms:** the platform constructors in the lists, such as `DOMMatrixReadOnly`, `AnimationEffect`, `PointerEvent` and `Selection`, at 48 to 60 B each.

**Fixed or growing: an additional reading, kept out of the instrument.** The scratch probe [`attribute-scale-probe.ts.txt`](measurements/2026-11-11-resolution-attribute-scale-probe.ts.txt) is `compare.ts` with its main block replaced, and it ran from a git-ignored directory. It runs `operateAndDestroy` at 0, 25, 50, 100, 200 and 400 operations, for each of the three arms, in two repeats, one page each. Raw output: [`attribute-scale`](measurements/2026-11-11-resolution-attribute-scale.txt) ([JSON](measurements/2026-11-11-resolution-attribute-scale.json)). Its first attempt ended on an argument error before a browser started: [`attribute-scale-discarded`](measurements/2026-11-11-resolution-attribute-scale-discarded.txt). **Both repeats gave identical figures.**

| Operations | Production's `array `, B | drag2's | prototype's | Production's total growth minus drag2's | minus the prototype's |
| --: | --: | --: | --: | --: | --: |
| 0 | 35,168 | 35,196 | 35,068 | — | — |
| 25 | 35,708 | 35,256 | 35,128 | 456 | −224 |
| 50 | 36,220 | 35,256 | 35,128 | 968 | 288 |
| 100 | 37,244 | 35,256 | 35,128 | 2,028 | 1,348 |
| 200 | 39,292 | 35,256 | 35,128 | 4,076 | 3,396 |
| 400 | 39,292 | 35,256 | 35,128 | 4,076 | 3,396 |

- **The before arms' `array ` stays the same after 25 operations.**
- **Production's `array ` grows with the operations from 0 to 200:** by 540, 512, 1,024 and 2,048 B over the steps, which is 20.5 B per operation from 50 to 200. It is the same at 400 as at 200.
- **The totals at 200 match the retained row's figures exactly:** 4,076 B against drag2 and 3,396 B against the prototype.
- So within 200 operations, production's excess grows with the number of operations. Between 200 and 400 it doesn't grow. I haven't interpreted this further.

## Item 4 step 6: `--prove`

Raw output: [`prove`](measurements/2026-11-11-resolution-prove.txt) ([JSON](measurements/2026-11-11-resolution-prove.json)). **Exit 1.**

| Injection | Expected | Result |
| --- | --- | --- |
| About 1 ms of script per cycle, at the drop | Flag | Flags slower: 7 of 7, median 1,230 µs, bound 778 µs |
| One object of about 1 KB retained per operation | Flag | Flags retains more: 3 of 3, 207,392 B, bound 0 B |
| One forced layout per move | Flag | Flags more: 368 layouts against 83 |
| One O(n) walk per move | Flag | Flags slower: 7 of 7, median 690 µs, bound 96 µs |
| 1 KB allocated per move | Flag | 1,051 B per move in 3 of 3 |
| One entry on the step list per frame | Quiet | Quiet as expected, and counted |
| Four numbers in `Gesture.enter` | Flag | 94, 91 and 99 B per move |
| **30 µs of script per move, in the page** | Flag | **Not flagged:** 7 of 7 higher, median 26 µs, A/A bound 83 µs. Task: 4 of 7, median 33 µs, bound 351 µs |
| **300 µs of script per cycle, in the page** | Flag | **Not flagged:** 6 of 7 higher, median 502 µs, A/A bound 622 µs. Task: 5 of 7, median 911 µs, bound 1,793 µs |

**The A/A pass is quiet on all 16 validation rows,** including the four new ones. The new rows' script bounds were 75 µs per move on 20 items, 119 on 2,000, 1,478 µs per cycle, and 1 µs for the driver alone.

**Same path, from `--prove` instead of B3'.** Every in-page cycle ended, because the row throws otherwise and none threw. In the A/A pass, production's median layouts are:

| Row                | In-page layouts | CDP layouts, same run |
| ------------------ | --------------: | --------------------: |
| Moves, 20 items    |              83 |                    83 |
| Moves, 2,000 items |              83 |                    83 |
| Cycles             |             250 |                   250 |

The prescribed comparison is against B3, for every round of B3', and B3' didn't run. Neither gate injection flagged, so property 3 isn't shown.

## Step 7: B3'

**Not run.** The campaign stops at the first non-zero exit, and `--prove` exited 1. The new rows have no baseline.

## Return to the architect

**`--prove` fails** (§Return to the architect, third bullet). On their in-page rows, both gate injections measured below their run's A/A bound:

- **30 µs per move:** measured 26 µs, against a bound of 83 µs.
- **300 µs per cycle:** measured 502 µs, against a bound of 622 µs.

F1 and F2 agree: no entry of either series flagged, and the bounds were 26 to 167 µs per move and 1,065 to 1,571 µs per cycle.

**Recorded, not interpreted:**

- **The load average was 5.6 to 9.9** for these four runs, against 4.0 to 9.5 during item 1. It came from other sessions.
- **The pre-check's one round,** at an unrecorded load, had production at 101 µs per move and A/A differences of 11 µs per move and 23 µs per cycle.
- **The cycle row's ratio of largest to median A/A difference** was 1.3 to 2.3, and the move row's was 1.6 to 3.0. One disturbed round doesn't set these bounds.

**What is open for the architect:** whether to repeat F1, F2 and `--prove` under a lower load, or to decide on `judge`'s bound or on the number of events per reading (`DRD-43`, rejected or deferred), from these readings. I haven't chosen.

**Not returns, and reported:** M4 shows at about 28 B per move. `--attribute` has no control arm. The attribution's result is above.

## Checks

| Check | Result |
| --- | --- |
| `bench/compare.ts`, `bench/lab.ts`, `tests/hot-path.browser.test.ts`: `just fmt`, `just lint-fix`, `just fmt`, `just lint` | Pass, in each commit |
| `npx just typecheck`, `npx just lint` | Exit 0 |
| `git diff --stat a9c323f6a..HEAD -- src` | Empty |
| `git diff --stat a9c323f6a..HEAD -- tests` | `tests/hot-path.browser.test.ts` in `a600abc51`, and `tests/campaign.node.test.ts` from `2e3697845`, the campaign runner's commit. The runner preceded this unit, so the handoff's "only `tests/hot-path.browser.test.ts`" doesn't hold literally at this base. This unit changed only `hot-path.browser.test.ts` |
| Item 1 | As required |
| Item 2's dry checks | As required |
| Item 4 | Stopped at step 6, as above |
| This report: `just fmt`, links checked with a script, `git diff --check` | See the commit. Lint doesn't apply to Markdown |

Scratch: the driver and wrapper are in this session's scratchpad and copied into `measurements/`. The probe's directory under `.campaigns/` was removed after its source was copied. The campaign's own logs stay in the git-ignored `.campaigns/resolution/`, as the runner keeps them.

## Next

The architect reads this report, and decides how the in-page rows reach a floor before P1b can close.
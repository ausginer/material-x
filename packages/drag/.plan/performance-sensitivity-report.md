# Performance sensitivity report

**Unit:** [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md), one `implementer` unit on `drag/performance-resolution`. **Input revision:** `25b8c7a8f`. Its `src/` is `a9c323f6a`'s and its `bench/` is `a7b3851c1`'s. **Governing records:** `DRD-44`, `DRD-43`, `DRD-40` and `DRD-23`'s last bullet in [`00-index.md`](00-index.md).

**Outcome:** the probe ran in all four processes, U1, E1, U2 and E2, as one campaign. Every process exited 0, every row ran and every cycle ended. **No reading in any process is settled by `DRD-44` property 7, so no row has a settled round in any process.** This report gives the figures. It doesn't classify the outcome; the architect applies `DRD-44` property 8.

## Machine state and the hold

- **Hold:** the owner confirmed that the other sessions were holding heavy checks at **04:51:48Z**, before the first browser process, which was the recorder self-check. The hold ended at **05:23:38Z**, after the last process, and the owner then released the sessions. **The owner reports that no build, size run, typecheck or test suite overlapped any process**, from the owner's sessions or from any session outside the owner's control. Other load was recorded and not controlled.
- **Nothing else from this session ran during a browser process.** The campaign ran in the background, and this session made no tool call until it ended.
- **Core sets:** `/sys/devices/cpu_core/cpus` read `0-3` and `/sys/devices/cpu_atom/cpus` read `4-11` at the head and foot of every raw file. CPU: 12th Gen Intel(R) Core(TM) i7-1255U. `nproc` 12 unpinned and 8 under `taskset -c 4-11`. Node v26.13.0, Chrome 157.0.8103.38.
- **One-minute load:** 3.24 at the head of U1 and 2.14 at the foot of E2. Over all readings it was 1.38 to 3.28 in U1, 1.35 to 2.55 in E1, 1.43 to 4.00 in U2, and 1.02 to 2.59 in E2.
- **`dirty: true`** in the campaign status comes from this unit's untracked raw files under `measurements/`. Each machine record's `git status --porcelain` lists them, and no tracked file is modified.

| Step | Condition         | Started (UTC) | Ended (UTC)  | Exit |
| ---- | ----------------- | ------------- | ------------ | ---: |
| U1   | Unpinned          | 04:54:45.257  | 05:01:57.762 |    0 |
| E1   | `taskset -c 4-11` | 05:01:57.776  | 05:09:11.601 |    0 |
| U2   | Unpinned          | 05:09:11.610  | 05:16:24.196 |    0 |
| E2   | `taskset -c 4-11` | 05:16:24.207  | 05:23:37.846 |    0 |

Each process took about 7 minutes 13 seconds, against the handoff's estimate of about 10.

## The probe

[`2026-11-11-sensitivity-probe.ts.txt`](measurements/2026-11-11-sensitivity-probe.ts.txt) is a scratch copy of `bench/compare.ts` at the input revision. It ran from `.campaigns/sensitivity-probe/probe.ts`, which is git-ignored. As in the scale probe, it changes the `heap-snapshot.ts` import and `ROOT` for its directory and replaces the main block. It adds the recorder and the gauge, and it adds one line per reading and a record beside each reading in `runScenarios`. The scenarios, `judge`, `summarize`, `openPage`'s page set-up, the injections, the floor entries and `ITERATIONS_PER_US` are unchanged.

- **Rows and arms (property 2):** the gate "30 µs of script per move, in the page" on "in the page: 300 moves, one frame each, 20 items", then the gate "300 µs of script per cycle, in the page" on "in the page: 50 activate-and-drop cycles, 20 items, no landing". Each ran as `--prove` runs an injection, with arms `production` (injected), `base` and `control` (injected). Then came the A/A of "300 moves, one frame each, 20 items" with three production arms. Each ran 7 rounds, and each was judged by the unchanged `judge` against `base`.
- **The window** of a reading is the interval between the scenario's two `metrics()` calls. The probe's `metrics` wraps `Performance.getMetrics`. Its first call lists the renderers, runs the gauge, reads the metrics and then starts the recorder. Its second call stops the recorder, reads the metrics and then runs the gauge. So the recorder adds no CDP command and no page evaluation inside the window (property 3), and the gauge runs outside it (property 4).
- **The recorder** reads `/proc` from Node only. Before the gauge, it lists the processes descended from the probe whose command line holds `--type=renderer`; there were 3 in every reading. For each one it reads the main thread's `/proc/<pid>/task/<pid>/schedstat` at both ends of the window, and the main thread's last CPU, field 39 of `stat`, every 20 ms. The page's renderer is the one whose main thread has the most on-CPU time in the window. Every chosen thread was the renderer's main thread, named `chrome`. Over the window it also reads the `some` total of `/proc/pressure/cpu`, and it reads the one-minute load from `/proc/loadavg` at the start.
- **The gauge** is 1,200,000 iterations of the floor entries' loop body, timed with `performance.now()` in the page. The loop stores into a variable captured by an inner function, as the entries store into a module-level variable of the lab bundle; see §Deviations.
- **Settled (property 7)** is computed at the end of each process. A reading is settled when its wait is at most 5 % of on-CPU plus wait, at least 90 % of its placement samples are in one core class, and both of its gauges are within 10 % of the process's median of all gauge values. A reading with no placement samples is not settled; none had fewer than 239.
- **Output:** each process writes one JSON file and its printed output. The JSON holds `summary` and `raw` in the shape `compare.ts` writes, with `records` beside `raw` and keyed alike, plus `settledRounds`, `gaugeMedianMs`, `injected` and the machine record at the head and the foot. `node bench/compare.ts --rejudge` reads the file and exits 0. It judges against `drag2` and `prototype`, which these files don't have, so it gives no verdict for these rows. The verdicts against `base` are the probe's own.
- **Wrapper:** [`2026-11-11-sensitivity-record-wrapper.sh.txt`](measurements/2026-11-11-sensitivity-record-wrapper.sh.txt) writes the machine record at the head and foot of each `.txt` file: the time, `nproc`, `node --version`, `uptime`, the CPU model, both core sets, the first line of `/proc/pressure/cpu` and `git status --porcelain`.
- **Tables** below were generated from the JSON files by [`2026-11-11-sensitivity-analysis.py.txt`](measurements/2026-11-11-sensitivity-analysis.py.txt).

## Deviations

1. **The first self-check pair is discarded.** Its loop, and the probe's gauge at that point, stored into a local variable. In the page that loop ran 18,000,000 iterations in 17.6 ms unpinned and 21.7 ms pinned, about 1,000 iterations per µs, not 60. So neither the loop nor the gauge was the floor entries' loop body in effect. The probe was changed so that both loops store into a variable captured by an inner function, as the floor entries' module-level `floorWork` is. The gauge in all four experiment processes is that loop. Kept as `…-selfcheck-unpinned-discarded.txt` and `…-selfcheck-ecores-discarded.txt`.
2. **The 300 ms self-check failed unpinned and is kept.** At 18,000,000 iterations, 300 ms nominal, the unpinned loop took 180.1 ms on a P-core at a load of 0.97. The recorder counted 179.4 ms on-CPU with 0.16 ms of wait, below the required 200 ms. Pinned, it took 228.6 ms, with 227.9 ms on-CPU and every sample in 4 to 11, and passed. The architect's return condition was put to the owner. **At the owner's direction, only the self-check's loop was lengthened, to 500 ms nominal (30,000,000 iterations).** The 200 ms requirement and every experiment parameter stayed unchanged. Kept as `…-selfcheck-unpinned-300ms.txt` and `…-selfcheck-ecores-300ms.txt`.
3. **The passing self-check, at 500 ms nominal:**

   | Condition | Loop ms | On-CPU ms | Wait ms | Samples | CPU 0–3 share | Required result |
   | --- | --: | --: | --: | --: | --: | --- |
   | Unpinned | 296.4 | 294.8 | 0.51 | 14 | 0.93 | On-CPU ≥ 200 ms: met |
   | `taskset -c 4-11` | 409.0 | 407.4 | 0.19 | 20 | 0.00 | On-CPU ≥ 200 ms and every sample in 4–11: met |

   Files: [`…-selfcheck-unpinned.txt`](measurements/2026-11-11-sensitivity-selfcheck-unpinned.txt), [`…-selfcheck-ecores.txt`](measurements/2026-11-11-sensitivity-selfcheck-ecores.txt).

## Dry checks

| Check | Result |
| --- | --- |
| 1. `--dry` with `CHROME_EXECUTABLE=/nonexistent/chrome` | Both injections apply, no browser, exit 0: [`2026-11-11-sensitivity-dry.txt`](measurements/2026-11-11-sensitivity-dry.txt) |
| 2. Recorder self-check | Met at 500 ms nominal, §Deviations 3 |
| 3. Core sets | `0-3` and `4-11` |

## Summary across processes

Script verdicts against `base`, with the bound ÷ the base arm's median, and settled rounds:

| Row | U1 | E1 | U2 | E2 |
| --- | --- | --- | --- | --- |
| Move gate, 30 µs per move | FLAG, 7 of 7, median 37, bound 37, 0.36; 0 settled | FLAG, 7 of 7, 43 against 34, 0.29; 0 settled | no difference shown, 7 of 7, 35 against 36, 0.32; 0 settled | no difference shown, 6 of 7, 34 against 48, 0.38; 0 settled |
| Cycle gate, 300 µs per cycle | FLAG, 7 of 7, 181 against 172, 0.14; 0 settled | no difference shown, 6 of 7, 269 against 559, 0.39; 0 settled | FLAG, 7 of 7, 315 against 271, 0.21; 0 settled | FLAG, 7 of 7, 502 against 380, 0.29; 0 settled |
| CDP move row, A/A | no difference shown, bound 29, 0.19; 0 settled | no difference shown, bound 32, 0.20; 0 settled | no difference shown, bound 17, 0.11; 0 settled | no difference shown, bound 30, 0.19; 0 settled |

In U1, the move gate's median and bound both round to 37 µs. `judge` compares the unrounded values, and it flagged.

**Why readings were unsettled:**

- **Run-queue wait** exceeded 5 % in one reading of 252: U1, cycle gate, round 3, control, at 6.85 %. The median wait over all readings was 0.2 to 0.8 % of on-CPU plus wait, by process and row.
- **Placement** failed in every unpinned reading and in no pinned one. Unpinned, the share of samples on CPUs 0 to 3 was 0.14 to 0.70, with a median of 0.37 in U1 and 0.35 in U2. Pinned, it was 0 in every reading.
- **The gauge** was outside 10 % of the process median, before or after, in 16 to 20 of 21 readings per row and process, pinned or not. The gauge before a window is slower than the one after it in every process:

  | Process | Median gauge, ms | Median before | Median after | Before within 10 % | After within 10 % |
  | --- | --: | --: | --: | --: | --: |
  | U1 | 15.45 | 16.6 | 14.1 | 26 of 63 | 20 of 63 |
  | E1 | 18.00 | 18.9 | 16.4 | 36 of 63 | 22 of 63 |
  | U2 | 15.75 | 17.3 | 14.4 | 21 of 63 | 17 of 63 |
  | E2 | 17.50 | 18.4 | 16.1 | 35 of 63 | 18 of 63 |

  Gauge values ranged from 9.9 to 47.8 ms unpinned and from 13.4 to 33.9 ms pinned.

**CDP row beside property 8's table:** bound ÷ base median was 0.19, 0.20, 0.11 and 0.19 in U1, E1, U2 and E2. That is within B1 to B3's 0.12 to 0.21, except U2 at 0.11, below that range. No process is settled, so property 8's limit-of-the-recorder sentence has no process to apply to.

## Per process and row

### U1

Gauge median 15.45 ms.

| Row | Production median script | Base median script | Verdict, script | Signs | Median | Bound | Bound ÷ base median | Settled rounds |
| --- | --: | --: | --- | --: | --: | --: | --: | --: |
| Move gate (30 µs per move) | 143 | 102 | FLAG slower | 7 of 7 higher | 37 | 37 | 0.36 | 0 of 7 |
| Cycle gate (300 µs per cycle) | 1560 | 1270 | FLAG slower | 7 of 7 higher | 181 | 172 | 0.14 | 0 of 7 |
| CDP move row, A/A | 148 | 156 | no difference shown | 2 of 7 higher | -7 | 29 | 0.19 | 0 of 7 |

Task-time and layout verdicts, from the same `judge` call:

- Move gate (30 µs per move): layouts — at or below: 83 against 83; scriptUs — FLAG slower: higher in 7 of 7, median 37 µs, A/A bound 37 µs; taskUs — no difference shown: higher in 4 of 7, median 70 µs, A/A bound 182 µs
- Cycle gate (300 µs per cycle): layouts — at or below: 250 against 250; scriptUs — FLAG slower: higher in 7 of 7, median 181 µs, A/A bound 172 µs; taskUs — no difference shown: higher in 4 of 7, median 20 µs, A/A bound 511 µs
- CDP move row, A/A: layouts — at or below: 83 against 83; scriptUs — no difference shown: higher in 2 of 7, median -7 µs, A/A bound 29 µs; taskUs — no difference shown: higher in 2 of 7, median -92 µs, A/A bound 372 µs

Per round, script in µs per event:

| Row | Round | Production | Base | Control | Difference | A/A | Unsettled readings |
| --- | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | 114 | 105 | 118 | 10 | -4 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 2 | 139 | 102 | 176 | 37 | -37 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 3 | 151 | 94 | 126 | 57 | 25 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 4 | 116 | 95 | 122 | 21 | -6 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 5 | 143 | 116 | 145 | 27 | -3 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 6 | 183 | 100 | 159 | 83 | 24 | production: placement; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 7 | 188 | 107 | 161 | 81 | 27 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | 1560 | 1497 | 1445 | 63 | 115 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | 1493 | 1415 | 1571 | 78 | -78 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 3 | 1440 | 1265 | 1502 | 175 | -62 | production: placement, gauge; base: placement; control: wait, placement, gauge |
| Cycle gate (300 µs per cycle) | 4 | 1590 | 1176 | 1418 | 414 | 172 | production: placement; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 5 | 1451 | 1270 | 1601 | 181 | -150 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | 1639 | 1298 | 1553 | 342 | 86 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 7 | 1755 | 1205 | 1919 | 550 | -164 | production: placement, gauge; base: placement; control: placement, gauge |
| CDP move row, A/A | 1 | 150 | 162 | 162 | -11 | -11 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 2 | 147 | 152 | 155 | -5 | -8 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 3 | 148 | 156 | 144 | -7 | 5 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 4 | 131 | 148 | 159 | -17 | -29 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 5 | 167 | 163 | 160 | 4 | 6 | production: placement, gauge; base: placement, gauge; control: placement |
| CDP move row, A/A | 6 | 148 | 162 | 167 | -14 | -19 | production: placement, gauge; base: placement; control: placement, gauge |
| CDP move row, A/A | 7 | 147 | 137 | 145 | 10 | 2 | production: placement; base: placement, gauge; control: placement, gauge |

### E1

Gauge median 18.00 ms.

| Row | Production median script | Base median script | Verdict, script | Signs | Median | Bound | Bound ÷ base median | Settled rounds |
| --- | --: | --: | --- | --: | --: | --: | --: | --: |
| Move gate (30 µs per move) | 158 | 119 | FLAG slower | 7 of 7 higher | 43 | 34 | 0.29 | 0 of 7 |
| Cycle gate (300 µs per cycle) | 1758 | 1439 | no difference shown | 6 of 7 higher | 269 | 559 | 0.39 | 0 of 7 |
| CDP move row, A/A | 158 | 160 | no difference shown | 2 of 7 higher | -4 | 32 | 0.20 | 0 of 7 |

Task-time and layout verdicts, from the same `judge` call:

- Move gate (30 µs per move): layouts — at or below: 83 against 83; scriptUs — FLAG slower: higher in 7 of 7, median 43 µs, A/A bound 34 µs; taskUs — no difference shown: higher in 6 of 7, median 49 µs, A/A bound 199 µs
- Cycle gate (300 µs per cycle): layouts — at or below: 250 against 250; scriptUs — no difference shown: higher in 6 of 7, median 269 µs, A/A bound 559 µs; taskUs — no difference shown: higher in 3 of 7, median -34 µs, A/A bound 1665 µs
- CDP move row, A/A: layouts — at or below: 83 against 83; scriptUs — no difference shown: higher in 2 of 7, median -4 µs, A/A bound 32 µs; taskUs — no difference shown: higher in 2 of 7, median -93 µs, A/A bound 356 µs

Per round, script in µs per event:

| Row | Round | Production | Base | Control | Difference | A/A | Unsettled readings |
| --- | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | 148 | 119 | 133 | 29 | 15 | production: gauge; base: gauge |
| Move gate (30 µs per move) | 2 | 169 | 113 | 143 | 57 | 27 | production: gauge; base: gauge; control: gauge |
| Move gate (30 µs per move) | 3 | 158 | 119 | 159 | 39 | -0 | base: gauge; control: gauge |
| Move gate (30 µs per move) | 4 | 150 | 91 | 145 | 59 | 5 | production: gauge; base: gauge; control: gauge |
| Move gate (30 µs per move) | 5 | 164 | 121 | 146 | 43 | 18 | production: gauge; control: gauge |
| Move gate (30 µs per move) | 6 | 145 | 126 | 179 | 19 | -34 | production: gauge; base: gauge; control: gauge |
| Move gate (30 µs per move) | 7 | 183 | 114 | 163 | 69 | 20 | production: gauge; base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 1 | 1868 | 1254 | 1528 | 614 | 340 | production: gauge; base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 2 | 1790 | 1325 | 1481 | 465 | 309 | production: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 3 | 1664 | 1395 | 1706 | 269 | -43 | production: gauge; base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 4 | 1758 | 1692 | 1783 | 66 | -26 | production: gauge |
| Cycle gate (300 µs per cycle) | 5 | 1393 | 1559 | 1952 | -166 | -559 | base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 6 | 1754 | 1685 | 1562 | 69 | 192 | production: gauge; base: gauge |
| Cycle gate (300 µs per cycle) | 7 | 1815 | 1439 | 2177 | 376 | -363 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 1 | 170 | 184 | 187 | -14 | -16 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 2 | 151 | 154 | 155 | -2 | -4 | production: gauge; base: gauge |
| CDP move row, A/A | 3 | 174 | 178 | 156 | -4 | 18 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 4 | 154 | 153 | 173 | 2 | -19 | production: gauge; base: gauge |
| CDP move row, A/A | 5 | 177 | 181 | 175 | -4 | 2 | base: gauge; control: gauge |
| CDP move row, A/A | 6 | 158 | 144 | 178 | 14 | -19 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 7 | 148 | 160 | 181 | -12 | -32 | production: gauge; base: gauge; control: gauge |

### U2

Gauge median 15.75 ms.

| Row | Production median script | Base median script | Verdict, script | Signs | Median | Bound | Bound ÷ base median | Settled rounds |
| --- | --: | --: | --- | --: | --: | --: | --: | --: |
| Move gate (30 µs per move) | 152 | 113 | no difference shown | 7 of 7 higher | 35 | 36 | 0.32 | 0 of 7 |
| Cycle gate (300 µs per cycle) | 1709 | 1295 | FLAG slower | 7 of 7 higher | 315 | 271 | 0.21 | 0 of 7 |
| CDP move row, A/A | 152 | 155 | no difference shown | 3 of 7 higher | -5 | 17 | 0.11 | 0 of 7 |

Task-time and layout verdicts, from the same `judge` call:

- Move gate (30 µs per move): layouts — at or below: 83 against 83; scriptUs — no difference shown: higher in 7 of 7, median 35 µs, A/A bound 36 µs; taskUs — no difference shown: higher in 4 of 7, median 31 µs, A/A bound 179 µs
- Cycle gate (300 µs per cycle): layouts — at or below: 250 against 250; scriptUs — FLAG slower: higher in 7 of 7, median 315 µs, A/A bound 271 µs; taskUs — no difference shown: higher in 5 of 7, median 113 µs, A/A bound 680 µs
- CDP move row, A/A: layouts — at or below: 83 against 83; scriptUs — no difference shown: higher in 3 of 7, median -5 µs, A/A bound 17 µs; taskUs — no difference shown: higher in 1 of 7, median -45 µs, A/A bound 210 µs

Per round, script in µs per event:

| Row | Round | Production | Base | Control | Difference | A/A | Unsettled readings |
| --- | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | 152 | 123 | 149 | 30 | 3 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 2 | 132 | 86 | 148 | 45 | -16 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 3 | 162 | 113 | 163 | 49 | -1 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 4 | 136 | 120 | 149 | 17 | -13 | production: placement, gauge; base: placement; control: placement, gauge |
| Move gate (30 µs per move) | 5 | 155 | 120 | 166 | 35 | -11 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 6 | 161 | 96 | 124 | 65 | 36 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Move gate (30 µs per move) | 7 | 119 | 109 | 135 | 10 | -16 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | 1721 | 1207 | 1589 | 514 | 132 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | 1712 | 1205 | 1684 | 507 | 28 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 3 | 1500 | 1295 | 1412 | 205 | 88 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 4 | 1820 | 1178 | 1723 | 642 | 97 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 5 | 1709 | 1393 | 1605 | 315 | 104 | production: placement, gauge; base: placement; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | 1589 | 1490 | 1859 | 99 | -270 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| Cycle gate (300 µs per cycle) | 7 | 1582 | 1420 | 1715 | 162 | -134 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 1 | 157 | 155 | 154 | 2 | 3 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 2 | 158 | 147 | 162 | 12 | -4 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 3 | 145 | 159 | 152 | -14 | -7 | production: placement, gauge; base: placement, gauge; control: placement |
| CDP move row, A/A | 4 | 156 | 169 | 154 | -13 | 2 | production: placement, gauge; base: placement, gauge; control: placement |
| CDP move row, A/A | 5 | 152 | 157 | 162 | -5 | -9 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 6 | 147 | 152 | 142 | -6 | 5 | production: placement, gauge; base: placement, gauge; control: placement, gauge |
| CDP move row, A/A | 7 | 150 | 149 | 168 | 1 | -17 | production: placement, gauge; base: placement, gauge; control: placement, gauge |

### E2

Gauge median 17.50 ms.

| Row | Production median script | Base median script | Verdict, script | Signs | Median | Bound | Bound ÷ base median | Settled rounds |
| --- | --: | --: | --- | --: | --: | --: | --: | --: |
| Move gate (30 µs per move) | 144 | 127 | no difference shown | 6 of 7 higher | 34 | 48 | 0.38 | 0 of 7 |
| Cycle gate (300 µs per cycle) | 1831 | 1315 | FLAG slower | 7 of 7 higher | 502 | 380 | 0.29 | 0 of 7 |
| CDP move row, A/A | 171 | 167 | no difference shown | 5 of 7 higher | 10 | 30 | 0.18 | 0 of 7 |

Task-time and layout verdicts, from the same `judge` call:

- Move gate (30 µs per move): layouts — at or below: 83 against 83; scriptUs — no difference shown: higher in 6 of 7, median 34 µs, A/A bound 48 µs; taskUs — no difference shown: higher in 4 of 7, median 17 µs, A/A bound 268 µs
- Cycle gate (300 µs per cycle): layouts — at or below: 250 against 250; scriptUs — FLAG slower: higher in 7 of 7, median 502 µs, A/A bound 380 µs; taskUs — FLAG slower: higher in 6 of 7, median 1066 µs, A/A bound 864 µs
- CDP move row, A/A: layouts — at or below: 83 against 83; scriptUs — no difference shown: higher in 5 of 7, median 10 µs, A/A bound 30 µs; taskUs — no difference shown: higher in 5 of 7, median 133 µs, A/A bound 371 µs

Per round, script in µs per event:

| Row | Round | Production | Base | Control | Difference | A/A | Unsettled readings |
| --- | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | 143 | 124 | 174 | 19 | -30 | base: gauge; control: gauge |
| Move gate (30 µs per move) | 2 | 175 | 131 | 156 | 44 | 19 | production: gauge; base: gauge |
| Move gate (30 µs per move) | 3 | 144 | 110 | 152 | 34 | -8 | production: gauge; base: gauge |
| Move gate (30 µs per move) | 4 | 183 | 127 | 135 | 56 | 48 | base: gauge; control: gauge |
| Move gate (30 µs per move) | 5 | 134 | 133 | 120 | 1 | 15 | production: gauge; base: gauge; control: gauge |
| Move gate (30 µs per move) | 6 | 132 | 137 | 131 | -5 | 0 | production: gauge; base: gauge; control: gauge |
| Move gate (30 µs per move) | 7 | 174 | 104 | 154 | 71 | 21 | production: gauge; base: gauge |
| Cycle gate (300 µs per cycle) | 1 | 1937 | 1158 | 1873 | 779 | 64 | production: gauge; base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 2 | 1817 | 1315 | 2033 | 502 | -216 | production: gauge; base: gauge |
| Cycle gate (300 µs per cycle) | 3 | 2194 | 1433 | 1860 | 760 | 334 | production: gauge; base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 4 | 2082 | 1523 | 1930 | 559 | 151 | production: gauge; base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 5 | 1831 | 1590 | 1728 | 241 | 103 | production: gauge; base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 6 | 1763 | 1307 | 2144 | 456 | -380 | base: gauge; control: gauge |
| Cycle gate (300 µs per cycle) | 7 | 1535 | 1230 | 1743 | 304 | -208 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 1 | 171 | 184 | 153 | -13 | 18 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 2 | 174 | 138 | 158 | 37 | 16 | production: gauge; control: gauge |
| CDP move row, A/A | 3 | 171 | 167 | 181 | 4 | -10 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 4 | 184 | 175 | 155 | 10 | 30 | production: gauge |
| CDP move row, A/A | 5 | 171 | 150 | 174 | 21 | -3 | base: gauge; control: gauge |
| CDP move row, A/A | 6 | 156 | 140 | 160 | 16 | -4 | production: gauge; base: gauge; control: gauge |
| CDP move row, A/A | 7 | 172 | 180 | 176 | -8 | -4 | production: gauge; base: gauge; control: gauge |

## Per row and condition

Median absolute A/A script difference, µs per event, over the two processes of each condition.

| Row | Condition | Settled rounds | Median over settled | Unsettled rounds | Median over unsettled |
| --- | --- | --: | --: | --: | --: |
| Move gate (30 µs per move) | Unpinned | 0 | none | 14 | 14.2 |
| Move gate (30 µs per move) | E-cores | 0 | none | 14 | 18.2 |
| Cycle gate (300 µs per cycle) | Unpinned | 0 | none | 14 | 109.4 |
| Cycle gate (300 µs per cycle) | E-cores | 0 | none | 14 | 212.0 |
| CDP move row, A/A | Unpinned | 0 | none | 14 | 6.5 |
| CDP move row, A/A | E-cores | 0 | none | 14 | 16.1 |

## Unsettled readings by criterion

| Process | Row | Readings | Wait over 5 % | Placement under 90 % in one class | A gauge outside 10 % |
| --- | --- | --: | --: | --: | --: |
| U1 | Move gate (30 µs per move) | 21 | 0 | 21 | 20 |
| U1 | Cycle gate (300 µs per cycle) | 21 | 1 | 21 | 18 |
| U1 | CDP move row, A/A | 21 | 0 | 21 | 18 |
| E1 | Move gate (30 µs per move) | 21 | 0 | 0 | 18 |
| E1 | Cycle gate (300 µs per cycle) | 21 | 0 | 0 | 16 |
| E1 | CDP move row, A/A | 21 | 0 | 0 | 18 |
| U2 | Move gate (30 µs per move) | 21 | 0 | 21 | 20 |
| U2 | Cycle gate (300 µs per cycle) | 21 | 0 | 21 | 20 |
| U2 | CDP move row, A/A | 21 | 0 | 21 | 19 |
| E2 | Move gate (30 µs per move) | 21 | 0 | 0 | 16 |
| E2 | Cycle gate (300 µs per cycle) | 21 | 0 | 0 | 19 |
| E2 | CDP move row, A/A | 21 | 0 | 0 | 17 |

## Per reading

Times are UTC on 2026-11-11. CPU 0–3 share is the share of placement samples on the P-core threads. Pressure is the `some` total's change over the window.

### U1 readings

| Row | Round | Arm | Start | End | Window ms | Renderer pid | Renderers | On-CPU ms | Wait ms | Samples | CPU 0–3 share | Pressure µs | Load 1 min | Gauge before ms | Gauge after ms | Script µs | Task µs | Settled |
| --- | --: | --- | --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | production | 04:54:46.075 | 04:54:51.056 | 4981 | 850748 | 3 | 214.9 | 0.50 | 246 | 0.27 | 31774 | 3.24 | 18.6 | 13.7 | 114 | 646 | no: placement, gauge |
| Move gate (30 µs per move) | 1 | base | 04:54:51.317 | 04:54:56.290 | 4972 | 850883 | 3 | 239.2 | 0.74 | 246 | 0.37 | 25411 | 3.22 | 17.6 | 13.5 | 105 | 742 | no: placement, gauge |
| Move gate (30 µs per move) | 1 | control | 04:54:56.525 | 04:55:01.506 | 4981 | 850932 | 3 | 223.6 | 0.95 | 247 | 0.23 | 24280 | 3.04 | 13.9 | 22.1 | 118 | 676 | no: placement, gauge |
| Move gate (30 µs per move) | 2 | production | 04:55:12.309 | 04:55:17.289 | 4980 | 851124 | 3 | 256.5 | 1.16 | 246 | 0.38 | 24678 | 2.85 | 13.9 | 9.9 | 139 | 771 | no: placement, gauge |
| Move gate (30 µs per move) | 2 | base | 04:55:01.808 | 04:55:06.789 | 4981 | 851019 | 3 | 233.2 | 2.66 | 247 | 0.27 | 27066 | 3.28 | 27.9 | 15.5 | 102 | 701 | no: placement, gauge |
| Move gate (30 µs per move) | 2 | control | 04:55:07.090 | 04:55:12.072 | 4983 | 851075 | 3 | 319.8 | 1.38 | 245 | 0.40 | 23594 | 3.02 | 23.1 | 12.4 | 176 | 954 | no: placement, gauge |
| Move gate (30 µs per move) | 3 | production | 04:55:22.803 | 04:55:27.788 | 4985 | 851234 | 3 | 278.7 | 2.26 | 247 | 0.38 | 37358 | 2.56 | 23.1 | 13.7 | 151 | 845 | no: placement, gauge |
| Move gate (30 µs per move) | 3 | base | 04:55:28.044 | 04:55:33.023 | 4979 | 851286 | 3 | 223.0 | 0.37 | 247 | 0.16 | 22902 | 2.6 | 16.1 | 18.5 | 94 | 670 | no: placement, gauge |
| Move gate (30 µs per move) | 3 | control | 04:55:17.546 | 04:55:22.522 | 4977 | 851183 | 3 | 238.6 | 0.87 | 246 | 0.37 | 24734 | 2.79 | 18.0 | 17.1 | 126 | 714 | no: placement, gauge |
| Move gate (30 µs per move) | 4 | production | 04:55:33.265 | 04:55:38.238 | 4973 | 851343 | 3 | 218.6 | 0.94 | 247 | 0.19 | 22295 | 2.63 | 17.9 | 16.2 | 116 | 664 | no: placement, gauge |
| Move gate (30 µs per move) | 4 | base | 04:55:38.513 | 04:55:43.488 | 4975 | 851395 | 3 | 224.4 | 0.71 | 246 | 0.24 | 26549 | 2.66 | 17.8 | 15.4 | 95 | 670 | no: placement, gauge |
| Move gate (30 µs per move) | 4 | control | 04:55:43.761 | 04:55:48.738 | 4977 | 851449 | 3 | 228.6 | 0.65 | 247 | 0.17 | 34086 | 2.61 | 16.2 | 26.6 | 122 | 694 | no: placement, gauge |
| Move gate (30 µs per move) | 5 | production | 04:55:59.449 | 04:56:04.420 | 4971 | 851614 | 3 | 261.4 | 0.46 | 245 | 0.48 | 20889 | 2.24 | 17.9 | 12.9 | 143 | 803 | no: placement, gauge |
| Move gate (30 µs per move) | 5 | base | 04:55:49.022 | 04:55:54.004 | 4982 | 851506 | 3 | 274.9 | 0.84 | 246 | 0.28 | 26665 | 2.48 | 26.6 | 13.3 | 116 | 821 | no: placement, gauge |
| Move gate (30 µs per move) | 5 | control | 04:55:54.240 | 04:55:59.220 | 4980 | 851557 | 3 | 269.9 | 1.39 | 246 | 0.39 | 23813 | 2.44 | 14.1 | 11.1 | 145 | 810 | no: placement, gauge |
| Move gate (30 µs per move) | 6 | production | 04:56:09.892 | 04:56:14.871 | 4979 | 851721 | 3 | 322.2 | 4.18 | 245 | 0.25 | 27164 | 2.21 | 16.5 | 15.6 | 183 | 973 | no: placement |
| Move gate (30 µs per move) | 6 | base | 04:56:15.112 | 04:56:20.086 | 4974 | 851781 | 3 | 240.0 | 1.28 | 246 | 0.43 | 17085 | 2.27 | 15.6 | 10.6 | 100 | 703 | no: placement, gauge |
| Move gate (30 µs per move) | 6 | control | 04:56:04.672 | 04:56:09.653 | 4981 | 851665 | 3 | 292.9 | 1.01 | 245 | 0.44 | 21460 | 2.22 | 22.4 | 12.1 | 159 | 877 | no: placement, gauge |
| Move gate (30 µs per move) | 7 | production | 04:56:20.333 | 04:56:25.319 | 4986 | 851872 | 3 | 334.5 | 1.03 | 246 | 0.40 | 22162 | 2.23 | 20.1 | 12.8 | 188 | 999 | no: placement, gauge |
| Move gate (30 µs per move) | 7 | base | 04:56:25.571 | 04:56:30.554 | 4983 | 851920 | 3 | 261.6 | 1.38 | 246 | 0.61 | 22379 | 2.14 | 13.5 | 19.0 | 107 | 774 | no: placement, gauge |
| Move gate (30 µs per move) | 7 | control | 04:56:30.808 | 04:56:35.787 | 4979 | 851977 | 3 | 302.3 | 1.22 | 246 | 0.37 | 19847 | 1.96 | 12.2 | 16.2 | 161 | 895 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | production | 04:56:35.950 | 04:56:40.860 | 4910 | 852026 | 3 | 258.4 | 0.66 | 241 | 0.50 | 20440 | 1.89 | 14.7 | 11.5 | 1560 | 4721 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | base | 04:56:41.017 | 04:56:45.921 | 4903 | 852084 | 3 | 295.7 | 1.70 | 242 | 0.50 | 25082 | 1.82 | 14.5 | 11.9 | 1497 | 5367 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | control | 04:56:46.076 | 04:56:50.960 | 4884 | 852142 | 3 | 242.9 | 0.90 | 241 | 0.44 | 28353 | 1.67 | 12.8 | 10.8 | 1445 | 4423 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | production | 04:57:01.298 | 04:57:06.184 | 4886 | 852297 | 3 | 244.3 | 1.16 | 241 | 0.36 | 22256 | 1.77 | 24.6 | 11.2 | 1493 | 4535 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | base | 04:56:51.107 | 04:56:56.042 | 4935 | 852195 | 3 | 277.6 | 1.02 | 244 | 0.51 | 22342 | 1.62 | 13.4 | 14.6 | 1415 | 5019 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | control | 04:56:56.197 | 04:57:01.127 | 4930 | 852244 | 3 | 254.7 | 1.73 | 244 | 0.37 | 27330 | 1.49 | 14.6 | 20.1 | 1571 | 4704 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 3 | production | 04:57:11.428 | 04:57:16.361 | 4933 | 852413 | 3 | 232.9 | 2.38 | 245 | 0.14 | 24961 | 1.94 | 16.2 | 12.4 | 1440 | 4382 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 3 | base | 04:57:16.514 | 04:57:21.425 | 4910 | 852477 | 3 | 241.5 | 0.33 | 242 | 0.55 | 26443 | 1.87 | 16.1 | 14.2 | 1265 | 4362 | no: placement |
| Cycle gate (300 µs per cycle) | 3 | control | 04:57:06.354 | 04:57:11.259 | 4905 | 852353 | 3 | 239.6 | 17.61 | 242 | 0.30 | 25210 | 2.03 | 15.4 | 10.8 | 1502 | 4462 | no: wait, placement, gauge |
| Cycle gate (300 µs per cycle) | 4 | production | 04:57:21.584 | 04:57:26.525 | 4941 | 852528 | 3 | 261.9 | 0.53 | 244 | 0.57 | 23591 | 1.72 | 16.6 | 14.1 | 1590 | 4795 | no: placement |
| Cycle gate (300 µs per cycle) | 4 | base | 04:57:26.675 | 04:57:31.615 | 4940 | 852579 | 3 | 224.9 | 0.70 | 245 | 0.49 | 21063 | 1.66 | 12.3 | 13.9 | 1176 | 4096 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 4 | control | 04:57:31.809 | 04:57:36.741 | 4933 | 852636 | 3 | 234.1 | 3.74 | 245 | 0.50 | 31049 | 1.77 | 21.4 | 16.6 | 1418 | 4283 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 5 | production | 04:57:47.084 | 04:57:52.007 | 4923 | 852801 | 3 | 233.2 | 1.11 | 244 | 0.26 | 29896 | 1.97 | 20.6 | 14.1 | 1451 | 4308 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 5 | base | 04:57:36.912 | 04:57:41.867 | 4955 | 852697 | 3 | 238.4 | 1.09 | 245 | 0.16 | 23783 | 1.71 | 16.6 | 19.9 | 1270 | 4393 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 5 | control | 04:57:42.057 | 04:57:46.907 | 4849 | 852744 | 3 | 256.8 | 0.84 | 239 | 0.35 | 25667 | 2.05 | 18.3 | 11.3 | 1601 | 4720 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | production | 04:57:57.289 | 04:58:02.259 | 4970 | 852921 | 3 | 258.9 | 1.02 | 246 | 0.33 | 19545 | 2.13 | 20.8 | 18.5 | 1639 | 4791 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | base | 04:58:02.462 | 04:58:07.366 | 4904 | 852979 | 3 | 252.2 | 1.10 | 242 | 0.63 | 24859 | 1.96 | 15.2 | 11.3 | 1298 | 4570 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | control | 04:57:52.163 | 04:57:57.123 | 4961 | 852869 | 3 | 257.8 | 0.73 | 245 | 0.31 | 29089 | 2.05 | 13.3 | 11.1 | 1553 | 4763 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 7 | production | 04:58:07.519 | 04:58:12.392 | 4873 | 853039 | 3 | 280.8 | 1.15 | 241 | 0.40 | 24009 | 1.88 | 15.3 | 12.1 | 1755 | 5180 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 7 | base | 04:58:12.545 | 04:58:17.489 | 4944 | 853090 | 3 | 234.1 | 0.44 | 244 | 0.61 | 18678 | 1.73 | 16.9 | 14.4 | 1205 | 4215 | no: placement |
| Cycle gate (300 µs per cycle) | 7 | control | 04:58:17.654 | 04:58:22.591 | 4937 | 853146 | 3 | 306.3 | 3.54 | 242 | 0.70 | 26189 | 1.67 | 14.7 | 10.4 | 1919 | 5639 | no: placement, gauge |
| CDP move row, A/A | 1 | production | 04:58:22.833 | 04:58:32.814 | 9981 | 853196 | 3 | 619.1 | 5.77 | 494 | 0.44 | 48437 | 1.62 | 23.1 | 14.5 | 150 | 1846 | no: placement, gauge |
| CDP move row, A/A | 1 | base | 04:58:33.053 | 04:58:43.031 | 9978 | 853267 | 3 | 658.0 | 4.41 | 493 | 0.46 | 45078 | 1.45 | 15.7 | 13.3 | 162 | 1953 | no: placement, gauge |
| CDP move row, A/A | 1 | control | 04:58:43.277 | 04:58:53.265 | 9987 | 853324 | 3 | 650.0 | 3.35 | 493 | 0.28 | 54106 | 1.38 | 18.8 | 18.2 | 162 | 1947 | no: placement, gauge |
| CDP move row, A/A | 2 | production | 04:59:13.980 | 04:59:23.962 | 9982 | 853519 | 3 | 578.0 | 3.54 | 495 | 0.21 | 57945 | 1.82 | 23.7 | 15.3 | 147 | 1756 | no: placement, gauge |
| CDP move row, A/A | 2 | base | 04:58:53.527 | 04:59:03.513 | 9986 | 853389 | 3 | 633.5 | 2.45 | 493 | 0.39 | 41660 | 1.55 | 20.2 | 14.5 | 152 | 1891 | no: placement, gauge |
| CDP move row, A/A | 2 | control | 04:59:03.752 | 04:59:13.730 | 9978 | 853449 | 3 | 642.9 | 5.58 | 494 | 0.43 | 54664 | 1.78 | 16.4 | 17.3 | 155 | 1923 | no: placement, gauge |
| CDP move row, A/A | 3 | production | 04:59:34.453 | 04:59:44.446 | 9993 | 853635 | 3 | 586.1 | 1.78 | 495 | 0.34 | 53594 | 2.13 | 28.4 | 47.8 | 148 | 1764 | no: placement, gauge |
| CDP move row, A/A | 3 | base | 04:59:44.751 | 04:59:54.728 | 9976 | 853703 | 3 | 618.7 | 2.52 | 495 | 0.19 | 58111 | 1.87 | 17.4 | 15.4 | 156 | 1856 | no: placement, gauge |
| CDP move row, A/A | 3 | control | 04:59:24.221 | 04:59:34.195 | 9974 | 853574 | 3 | 587.5 | 13.02 | 494 | 0.34 | 62985 | 2.25 | 20.3 | 13.3 | 144 | 1769 | no: placement, gauge |
| CDP move row, A/A | 4 | production | 04:59:54.982 | 05:00:04.961 | 9979 | 853758 | 3 | 531.6 | 2.52 | 493 | 0.25 | 55381 | 2.27 | 15.6 | 27.3 | 131 | 1604 | no: placement, gauge |
| CDP move row, A/A | 4 | base | 05:00:05.317 | 05:00:15.295 | 9978 | 853821 | 3 | 585.0 | 5.25 | 495 | 0.22 | 57058 | 2.39 | 30.6 | 17.7 | 148 | 1774 | no: placement, gauge |
| CDP move row, A/A | 4 | control | 05:00:15.530 | 05:00:25.509 | 9979 | 853889 | 3 | 658.2 | 6.78 | 495 | 0.33 | 45536 | 2.18 | 14.9 | 13.1 | 159 | 1976 | no: placement, gauge |
| CDP move row, A/A | 5 | production | 05:00:46.202 | 05:00:56.175 | 9973 | 854075 | 3 | 666.1 | 8.61 | 494 | 0.42 | 50019 | 1.82 | 17.7 | 12.0 | 167 | 2000 | no: placement, gauge |
| CDP move row, A/A | 5 | base | 05:00:25.744 | 05:00:35.727 | 9983 | 853944 | 3 | 661.5 | 6.01 | 491 | 0.40 | 47060 | 2 | 12.9 | 16.3 | 163 | 1996 | no: placement, gauge |
| CDP move row, A/A | 5 | control | 05:00:35.983 | 05:00:45.960 | 9977 | 854005 | 3 | 643.3 | 2.13 | 494 | 0.36 | 41229 | 2.06 | 15.3 | 16.8 | 160 | 1920 | no: placement |
| CDP move row, A/A | 6 | production | 05:01:06.626 | 05:01:16.608 | 9981 | 854199 | 3 | 615.9 | 6.74 | 493 | 0.41 | 56677 | 2 | 12.4 | 13.4 | 148 | 1837 | no: placement, gauge |
| CDP move row, A/A | 6 | base | 05:01:16.867 | 05:01:26.841 | 9974 | 854270 | 3 | 640.1 | 2.81 | 494 | 0.29 | 52398 | 1.84 | 16.8 | 14.1 | 162 | 1919 | no: placement |
| CDP move row, A/A | 6 | control | 05:00:56.414 | 05:01:06.393 | 9979 | 854132 | 3 | 672.7 | 5.70 | 493 | 0.37 | 41738 | 2 | 17.6 | 14.6 | 167 | 2016 | no: placement, gauge |
| CDP move row, A/A | 7 | production | 05:01:27.080 | 05:01:37.057 | 9977 | 854321 | 3 | 586.7 | 6.67 | 495 | 0.35 | 49467 | 1.79 | 16.2 | 15.4 | 147 | 1775 | no: placement |
| CDP move row, A/A | 7 | base | 05:01:37.311 | 05:01:47.290 | 9979 | 854387 | 3 | 547.8 | 2.49 | 495 | 0.29 | 55523 | 1.58 | 14.5 | 13.5 | 137 | 1654 | no: placement, gauge |
| CDP move row, A/A | 7 | control | 05:01:47.545 | 05:01:57.523 | 9978 | 854450 | 3 | 576.4 | 5.81 | 495 | 0.19 | 66973 | 1.64 | 16.8 | 18.6 | 145 | 1742 | no: placement, gauge |

### E1 readings

| Row | Round | Arm | Start | End | Window ms | Renderer pid | Renderers | On-CPU ms | Wait ms | Samples | CPU 0–3 share | Pressure µs | Load 1 min | Gauge before ms | Gauge after ms | Script µs | Task µs | Settled |
| --- | --: | --- | --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | production | 05:01:58.786 | 05:02:03.773 | 4987 | 854698 | 3 | 280.0 | 1.88 | 246 | 0.00 | 26417 | 1.78 | 20.8 | 14.1 | 148 | 845 | no: gauge |
| Move gate (30 µs per move) | 1 | base | 05:02:04.030 | 05:02:09.006 | 4975 | 854777 | 3 | 267.9 | 0.88 | 245 | 0.00 | 23212 | 1.88 | 18.2 | 14.5 | 119 | 833 | no: gauge |
| Move gate (30 µs per move) | 1 | control | 05:02:09.266 | 05:02:14.239 | 4973 | 854832 | 3 | 237.0 | 1.22 | 246 | 0.00 | 26847 | 2.05 | 18.0 | 18.1 | 133 | 741 | yes |
| Move gate (30 µs per move) | 2 | production | 05:02:25.103 | 05:02:30.088 | 4985 | 854988 | 3 | 314.8 | 0.72 | 246 | 0.00 | 23059 | 2.28 | 23.5 | 13.7 | 169 | 936 | no: gauge |
| Move gate (30 µs per move) | 2 | base | 05:02:14.552 | 05:02:19.541 | 4989 | 854889 | 3 | 265.8 | 1.73 | 247 | 0.00 | 29173 | 2.04 | 22.3 | 16.8 | 113 | 803 | no: gauge |
| Move gate (30 µs per move) | 2 | control | 05:02:19.828 | 05:02:24.805 | 4977 | 854939 | 3 | 244.0 | 0.81 | 246 | 0.00 | 21382 | 2.04 | 22.8 | 18.0 | 143 | 737 | no: gauge |
| Move gate (30 µs per move) | 3 | production | 05:02:35.579 | 05:02:40.555 | 4976 | 855091 | 3 | 302.3 | 0.48 | 246 | 0.00 | 21340 | 2.35 | 17.4 | 16.6 | 158 | 906 | yes |
| Move gate (30 µs per move) | 3 | base | 05:02:40.837 | 05:02:45.821 | 4984 | 855146 | 3 | 295.7 | 0.19 | 245 | 0.00 | 16968 | 2.16 | 19.4 | 13.9 | 119 | 878 | no: gauge |
| Move gate (30 µs per move) | 3 | control | 05:02:30.346 | 05:02:35.321 | 4975 | 855040 | 3 | 302.5 | 1.18 | 246 | 0.00 | 17026 | 2.55 | 17.4 | 15.7 | 159 | 914 | no: gauge |
| Move gate (30 µs per move) | 4 | production | 05:02:46.077 | 05:02:51.054 | 4977 | 855201 | 3 | 281.6 | 1.56 | 246 | 0.00 | 30750 | 2.15 | 17.2 | 13.5 | 150 | 846 | no: gauge |
| Move gate (30 µs per move) | 4 | base | 05:02:51.321 | 05:02:56.304 | 4983 | 855250 | 3 | 212.9 | 1.89 | 247 | 0.00 | 26182 | 1.97 | 21.2 | 22.9 | 91 | 645 | no: gauge |
| Move gate (30 µs per move) | 4 | control | 05:02:56.660 | 05:03:01.637 | 4977 | 855299 | 3 | 259.3 | 1.66 | 246 | 0.00 | 27926 | 2.14 | 30.7 | 13.8 | 145 | 810 | no: gauge |
| Move gate (30 µs per move) | 5 | production | 05:03:12.379 | 05:03:17.353 | 4974 | 855458 | 3 | 313.4 | 0.74 | 246 | 0.00 | 20775 | 1.95 | 17.5 | 13.7 | 164 | 939 | no: gauge |
| Move gate (30 µs per move) | 5 | base | 05:03:01.896 | 05:03:06.872 | 4976 | 855354 | 3 | 300.4 | 4.83 | 246 | 0.00 | 28068 | 2.13 | 19.6 | 19.6 | 121 | 891 | yes |
| Move gate (30 µs per move) | 5 | control | 05:03:07.138 | 05:03:12.121 | 4983 | 855410 | 3 | 280.1 | 0.15 | 246 | 0.00 | 17230 | 2.12 | 22.2 | 13.4 | 146 | 837 | no: gauge |
| Move gate (30 µs per move) | 6 | production | 05:03:22.889 | 05:03:27.871 | 4982 | 855563 | 3 | 277.3 | 0.70 | 247 | 0.00 | 19664 | 1.95 | 25.6 | 19.6 | 145 | 836 | no: gauge |
| Move gate (30 µs per move) | 6 | base | 05:03:28.134 | 05:03:33.119 | 4985 | 855610 | 3 | 304.7 | 0.26 | 246 | 0.00 | 19926 | 2.11 | 22.4 | 13.6 | 126 | 900 | no: gauge |
| Move gate (30 µs per move) | 6 | control | 05:03:17.626 | 05:03:22.604 | 4978 | 855518 | 3 | 336.9 | 0.67 | 244 | 0.00 | 22106 | 2.03 | 17.0 | 16.1 | 179 | 998 | no: gauge |
| Move gate (30 µs per move) | 7 | production | 05:03:33.384 | 05:03:38.370 | 4987 | 855665 | 3 | 351.8 | 0.74 | 246 | 0.00 | 25727 | 2.02 | 22.5 | 19.2 | 183 | 1054 | no: gauge |
| Move gate (30 µs per move) | 7 | base | 05:03:38.642 | 05:03:43.618 | 4977 | 855721 | 3 | 277.1 | 0.39 | 246 | 0.00 | 20673 | 1.86 | 16.8 | 14.0 | 114 | 821 | no: gauge |
| Move gate (30 µs per move) | 7 | control | 05:03:43.887 | 05:03:48.869 | 4982 | 855774 | 3 | 301.1 | 1.20 | 246 | 0.00 | 24234 | 1.79 | 21.8 | 18.6 | 163 | 904 | no: gauge |
| Cycle gate (300 µs per cycle) | 1 | production | 05:03:49.049 | 05:03:53.959 | 4910 | 855823 | 3 | 316.6 | 0.80 | 241 | 0.00 | 27731 | 1.73 | 18.9 | 14.3 | 1868 | 5806 | no: gauge |
| Cycle gate (300 µs per cycle) | 1 | base | 05:03:54.134 | 05:03:59.026 | 4892 | 855871 | 3 | 245.6 | 0.32 | 242 | 0.00 | 19953 | 1.59 | 17.1 | 20.3 | 1254 | 4496 | no: gauge |
| Cycle gate (300 µs per cycle) | 1 | control | 05:03:59.205 | 05:04:04.142 | 4938 | 855918 | 3 | 245.6 | 0.39 | 244 | 0.00 | 22114 | 1.54 | 18.1 | 14.3 | 1528 | 4544 | no: gauge |
| Cycle gate (300 µs per cycle) | 2 | production | 05:04:14.597 | 05:04:19.475 | 4878 | 856085 | 3 | 289.8 | 0.84 | 241 | 0.00 | 27652 | 1.5 | 18.8 | 14.5 | 1790 | 5401 | no: gauge |
| Cycle gate (300 µs per cycle) | 2 | base | 05:04:04.317 | 05:04:09.261 | 4944 | 855974 | 3 | 262.2 | 0.80 | 245 | 0.00 | 24192 | 1.5 | 17.7 | 18.6 | 1325 | 4822 | yes |
| Cycle gate (300 µs per cycle) | 2 | control | 05:04:09.447 | 05:04:14.408 | 4961 | 856033 | 3 | 241.5 | 3.33 | 246 | 0.00 | 25805 | 1.46 | 16.5 | 14.8 | 1481 | 4503 | no: gauge |
| Cycle gate (300 µs per cycle) | 3 | production | 05:04:24.833 | 05:04:29.725 | 4891 | 856185 | 3 | 250.1 | 1.08 | 242 | 0.00 | 35666 | 1.35 | 27.9 | 19.6 | 1664 | 4683 | no: gauge |
| Cycle gate (300 µs per cycle) | 3 | base | 05:04:29.947 | 05:04:34.874 | 4928 | 856241 | 3 | 255.4 | 0.60 | 244 | 0.00 | 23770 | 1.56 | 21.4 | 14.6 | 1395 | 4717 | no: gauge |
| Cycle gate (300 µs per cycle) | 3 | control | 05:04:19.645 | 05:04:24.592 | 4947 | 856135 | 3 | 266.4 | 0.82 | 245 | 0.00 | 21137 | 1.38 | 16.3 | 20.4 | 1706 | 4985 | no: gauge |
| Cycle gate (300 µs per cycle) | 4 | production | 05:04:35.051 | 05:04:39.957 | 4907 | 856289 | 3 | 286.1 | 0.27 | 243 | 0.00 | 19624 | 1.84 | 20.3 | 14.7 | 1758 | 5310 | no: gauge |
| Cycle gate (300 µs per cycle) | 4 | base | 05:04:40.129 | 05:04:45.061 | 4932 | 856344 | 3 | 305.8 | 0.14 | 244 | 0.00 | 21887 | 2.01 | 16.7 | 19.0 | 1692 | 5619 | yes |
| Cycle gate (300 µs per cycle) | 4 | control | 05:04:45.250 | 05:04:50.186 | 4936 | 856398 | 3 | 304.1 | 1.32 | 243 | 0.00 | 28434 | 1.78 | 16.4 | 17.0 | 1783 | 5599 | yes |
| Cycle gate (300 µs per cycle) | 5 | production | 05:05:00.578 | 05:05:05.473 | 4894 | 856554 | 3 | 227.0 | 0.77 | 242 | 0.00 | 27452 | 1.77 | 16.9 | 16.4 | 1393 | 4236 | yes |
| Cycle gate (300 µs per cycle) | 5 | base | 05:04:50.364 | 05:04:55.273 | 4909 | 856448 | 3 | 289.8 | 0.07 | 243 | 0.00 | 17165 | 1.72 | 18.0 | 14.8 | 1559 | 5348 | no: gauge |
| Cycle gate (300 µs per cycle) | 5 | control | 05:04:55.451 | 05:05:00.406 | 4955 | 856495 | 3 | 320.2 | 0.38 | 244 | 0.00 | 27366 | 1.66 | 16.4 | 13.8 | 1952 | 5901 | no: gauge |
| Cycle gate (300 µs per cycle) | 6 | production | 05:05:10.761 | 05:05:15.673 | 4912 | 856672 | 3 | 288.0 | 0.29 | 243 | 0.00 | 22505 | 1.8 | 19.2 | 14.3 | 1754 | 5334 | no: gauge |
| Cycle gate (300 µs per cycle) | 6 | base | 05:05:15.847 | 05:05:20.773 | 4927 | 856727 | 3 | 314.6 | 0.22 | 243 | 0.00 | 28129 | 1.89 | 17.5 | 14.5 | 1685 | 5793 | no: gauge |
| Cycle gate (300 µs per cycle) | 6 | control | 05:05:05.675 | 05:05:10.575 | 4900 | 856615 | 3 | 247.5 | 1.47 | 243 | 0.00 | 29634 | 1.87 | 19.7 | 19.6 | 1562 | 4596 | yes |
| Cycle gate (300 µs per cycle) | 7 | production | 05:05:20.946 | 05:05:25.795 | 4849 | 856776 | 3 | 306.3 | 0.43 | 239 | 0.00 | 16943 | 1.74 | 16.2 | 17.2 | 1815 | 5688 | no: gauge |
| Cycle gate (300 µs per cycle) | 7 | base | 05:05:25.980 | 05:05:30.889 | 4909 | 856824 | 3 | 260.7 | 0.11 | 243 | 0.00 | 16839 | 1.68 | 16.6 | 14.8 | 1439 | 4825 | no: gauge |
| Cycle gate (300 µs per cycle) | 7 | control | 05:05:31.060 | 05:05:36.023 | 4963 | 856881 | 3 | 354.2 | 0.20 | 244 | 0.00 | 21083 | 1.71 | 19.9 | 17.5 | 2177 | 6518 | no: gauge |
| CDP move row, A/A | 1 | production | 05:05:36.287 | 05:05:46.264 | 9977 | 856929 | 3 | 693.5 | 0.80 | 493 | 0.00 | 35481 | 1.57 | 17.0 | 15.3 | 170 | 2073 | no: gauge |
| CDP move row, A/A | 1 | base | 05:05:46.526 | 05:05:56.515 | 9988 | 856995 | 3 | 725.3 | 4.01 | 494 | 0.00 | 52990 | 1.8 | 22.2 | 21.0 | 184 | 2179 | no: gauge |
| CDP move row, A/A | 1 | control | 05:05:56.798 | 05:06:06.781 | 9983 | 857047 | 3 | 734.0 | 2.02 | 493 | 0.00 | 48164 | 1.9 | 23.5 | 20.1 | 187 | 2209 | no: gauge |
| CDP move row, A/A | 2 | production | 05:06:27.561 | 05:06:37.545 | 9984 | 857231 | 3 | 597.5 | 4.66 | 496 | 0.00 | 55281 | 1.62 | 23.6 | 18.8 | 151 | 1814 | no: gauge |
| CDP move row, A/A | 2 | base | 05:06:07.053 | 05:06:17.029 | 9976 | 857116 | 3 | 622.4 | 2.15 | 494 | 0.00 | 48270 | 1.69 | 17.9 | 15.5 | 154 | 1872 | no: gauge |
| CDP move row, A/A | 2 | control | 05:06:17.285 | 05:06:27.262 | 9976 | 857179 | 3 | 614.8 | 2.99 | 495 | 0.00 | 48694 | 1.65 | 17.9 | 18.7 | 155 | 1864 | yes |
| CDP move row, A/A | 3 | production | 05:06:48.056 | 05:06:58.044 | 9987 | 857358 | 3 | 700.3 | 1.62 | 494 | 0.00 | 48382 | 1.8 | 20.4 | 16.0 | 174 | 2099 | no: gauge |
| CDP move row, A/A | 3 | base | 05:06:58.301 | 05:07:08.278 | 9977 | 857411 | 3 | 730.4 | 1.19 | 495 | 0.00 | 43694 | 1.68 | 17.8 | 20.9 | 178 | 2192 | no: gauge |
| CDP move row, A/A | 3 | control | 05:06:37.821 | 05:06:47.794 | 9974 | 857296 | 3 | 617.0 | 2.32 | 495 | 0.00 | 54021 | 1.68 | 18.3 | 14.9 | 156 | 1867 | no: gauge |
| CDP move row, A/A | 4 | production | 05:07:08.553 | 05:07:18.526 | 9973 | 857478 | 3 | 607.8 | 3.81 | 494 | 0.00 | 52892 | 1.73 | 18.0 | 20.3 | 154 | 1844 | no: gauge |
| CDP move row, A/A | 4 | base | 05:07:18.841 | 05:07:28.826 | 9985 | 857541 | 3 | 606.6 | 4.08 | 496 | 0.00 | 55465 | 1.7 | 24.5 | 15.9 | 153 | 1836 | no: gauge |
| CDP move row, A/A | 4 | control | 05:07:29.083 | 05:07:39.061 | 9978 | 857592 | 3 | 680.4 | 4.81 | 494 | 0.00 | 52007 | 1.67 | 17.8 | 19.6 | 173 | 2045 | yes |
| CDP move row, A/A | 5 | production | 05:07:59.848 | 05:08:09.826 | 9978 | 857779 | 3 | 695.1 | 1.82 | 494 | 0.00 | 49510 | 1.73 | 16.8 | 18.6 | 177 | 2085 | yes |
| CDP move row, A/A | 5 | base | 05:07:39.346 | 05:07:49.327 | 9981 | 857658 | 3 | 725.2 | 3.96 | 492 | 0.00 | 50221 | 1.57 | 24.5 | 22.2 | 181 | 2184 | no: gauge |
| CDP move row, A/A | 5 | control | 05:07:49.608 | 05:07:59.591 | 9984 | 857720 | 3 | 696.0 | 2.26 | 494 | 0.00 | 48314 | 1.49 | 21.0 | 15.3 | 175 | 2096 | no: gauge |
| CDP move row, A/A | 6 | production | 05:08:20.352 | 05:08:30.324 | 9972 | 857901 | 3 | 640.3 | 2.31 | 494 | 0.00 | 51097 | 2.03 | 20.6 | 16.3 | 158 | 1935 | no: gauge |
| CDP move row, A/A | 6 | base | 05:08:30.580 | 05:08:40.556 | 9976 | 857960 | 3 | 570.9 | 2.09 | 494 | 0.00 | 48015 | 1.87 | 17.8 | 22.1 | 144 | 1724 | no: gauge |
| CDP move row, A/A | 6 | control | 05:08:10.088 | 05:08:20.075 | 9987 | 857839 | 3 | 715.5 | 1.91 | 494 | 0.00 | 47358 | 1.93 | 20.3 | 22.3 | 178 | 2149 | no: gauge |
| CDP move row, A/A | 7 | production | 05:08:40.852 | 05:08:50.839 | 9987 | 858023 | 3 | 593.2 | 4.01 | 496 | 0.00 | 65598 | 1.74 | 22.4 | 21.8 | 148 | 1799 | no: gauge |
| CDP move row, A/A | 7 | base | 05:08:51.181 | 05:09:01.172 | 9991 | 858082 | 3 | 634.4 | 8.34 | 495 | 0.00 | 73377 | 2.1 | 33.5 | 16.2 | 160 | 1920 | no: gauge |
| CDP move row, A/A | 7 | control | 05:09:01.432 | 05:09:11.407 | 9975 | 858138 | 3 | 715.6 | 2.32 | 495 | 0.00 | 53489 | 2.16 | 19.6 | 20.1 | 181 | 2155 | no: gauge |

### U2 readings

| Row | Round | Arm | Start | End | Window ms | Renderer pid | Renderers | On-CPU ms | Wait ms | Samples | CPU 0–3 share | Pressure µs | Load 1 min | Gauge before ms | Gauge after ms | Script µs | Task µs | Settled |
| --- | --: | --- | --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | production | 05:09:12.362 | 05:09:17.358 | 4996 | 858419 | 3 | 278.5 | 1.29 | 246 | 0.53 | 23736 | 2.28 | 30.0 | 14.1 | 152 | 836 | no: placement, gauge |
| Move gate (30 µs per move) | 1 | base | 05:09:17.603 | 05:09:22.588 | 4986 | 858477 | 3 | 286.3 | 3.28 | 246 | 0.46 | 25481 | 2.18 | 21.0 | 13.6 | 123 | 850 | no: placement, gauge |
| Move gate (30 µs per move) | 1 | control | 05:09:22.824 | 05:09:27.806 | 4982 | 858527 | 3 | 281.7 | 1.08 | 246 | 0.39 | 29301 | 2.01 | 13.2 | 14.8 | 149 | 845 | no: placement, gauge |
| Move gate (30 µs per move) | 2 | production | 05:09:38.579 | 05:09:43.554 | 4975 | 858688 | 3 | 249.0 | 3.12 | 246 | 0.45 | 22761 | 2.08 | 14.1 | 10.7 | 132 | 744 | no: placement, gauge |
| Move gate (30 µs per move) | 2 | base | 05:09:28.066 | 05:09:33.038 | 4972 | 858575 | 3 | 194.4 | 2.44 | 246 | 0.30 | 24461 | 2.01 | 16.8 | 17.6 | 86 | 607 | no: placement, gauge |
| Move gate (30 µs per move) | 2 | control | 05:09:33.354 | 05:09:38.338 | 4984 | 858632 | 3 | 278.6 | 2.51 | 247 | 0.24 | 23268 | 2 | 24.4 | 10.0 | 148 | 839 | no: placement, gauge |
| Move gate (30 µs per move) | 3 | production | 05:09:49.009 | 05:09:53.989 | 4979 | 858800 | 3 | 303.1 | 1.47 | 246 | 0.39 | 22403 | 2.73 | 15.0 | 18.0 | 162 | 911 | no: placement, gauge |
| Move gate (30 µs per move) | 3 | base | 05:09:54.258 | 05:09:59.239 | 4981 | 858852 | 3 | 278.4 | 3.00 | 245 | 0.37 | 27869 | 2.91 | 27.2 | 13.8 | 113 | 826 | no: placement, gauge |
| Move gate (30 µs per move) | 3 | control | 05:09:43.792 | 05:09:48.771 | 4979 | 858749 | 3 | 291.9 | 1.16 | 246 | 0.38 | 28381 | 2.88 | 15.7 | 10.6 | 163 | 877 | no: placement, gauge |
| Move gate (30 µs per move) | 4 | production | 05:09:59.504 | 05:10:04.487 | 4983 | 858907 | 3 | 253.3 | 1.68 | 246 | 0.51 | 23023 | 2.92 | 19.6 | 10.7 | 136 | 760 | no: placement, gauge |
| Move gate (30 µs per move) | 4 | base | 05:10:04.726 | 05:10:09.705 | 4978 | 858961 | 3 | 292.2 | 1.10 | 246 | 0.48 | 22689 | 3 | 16.7 | 14.7 | 120 | 858 | no: placement |
| Move gate (30 µs per move) | 4 | control | 05:10:09.940 | 05:10:14.921 | 4980 | 859019 | 3 | 278.0 | 4.47 | 246 | 0.37 | 18425 | 2.76 | 14.0 | 15.5 | 149 | 841 | no: placement, gauge |
| Move gate (30 µs per move) | 5 | production | 05:10:25.640 | 05:10:30.619 | 4979 | 859173 | 3 | 292.5 | 0.85 | 246 | 0.36 | 28463 | 2.95 | 15.0 | 13.6 | 155 | 873 | no: placement, gauge |
| Move gate (30 µs per move) | 5 | base | 05:10:15.191 | 05:10:20.169 | 4978 | 859076 | 3 | 281.7 | 3.97 | 246 | 0.27 | 18510 | 2.7 | 23.1 | 13.9 | 120 | 842 | no: placement, gauge |
| Move gate (30 µs per move) | 5 | control | 05:10:20.421 | 05:10:25.402 | 4981 | 859123 | 3 | 305.5 | 2.33 | 247 | 0.35 | 24604 | 2.59 | 22.9 | 11.0 | 166 | 917 | no: placement, gauge |
| Move gate (30 µs per move) | 6 | production | 05:10:36.074 | 05:10:41.052 | 4979 | 859285 | 3 | 296.2 | 4.68 | 245 | 0.33 | 29592 | 2.65 | 15.9 | 12.9 | 161 | 892 | no: placement, gauge |
| Move gate (30 µs per move) | 6 | base | 05:10:41.308 | 05:10:46.285 | 4977 | 859344 | 3 | 237.6 | 1.03 | 246 | 0.28 | 23353 | 2.6 | 17.5 | 13.3 | 96 | 711 | no: placement, gauge |
| Move gate (30 µs per move) | 6 | control | 05:10:30.854 | 05:10:35.837 | 4983 | 859236 | 3 | 237.0 | 0.90 | 246 | 0.31 | 22255 | 2.71 | 13.2 | 15.0 | 124 | 713 | no: placement, gauge |
| Move gate (30 µs per move) | 7 | production | 05:10:46.533 | 05:10:51.518 | 4985 | 859401 | 3 | 225.6 | 0.88 | 247 | 0.27 | 31653 | 2.55 | 22.5 | 16.8 | 119 | 685 | no: placement, gauge |
| Move gate (30 µs per move) | 7 | base | 05:10:51.813 | 05:10:56.784 | 4972 | 859454 | 3 | 244.4 | 0.56 | 246 | 0.26 | 36411 | 2.59 | 20.5 | 13.0 | 109 | 760 | no: placement, gauge |
| Move gate (30 µs per move) | 7 | control | 05:10:57.043 | 05:11:02.018 | 4975 | 859506 | 3 | 253.5 | 1.82 | 246 | 0.22 | 23608 | 2.46 | 19.2 | 20.0 | 135 | 767 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | production | 05:11:02.196 | 05:11:07.108 | 4913 | 859560 | 3 | 268.7 | 2.10 | 243 | 0.42 | 32730 | 2.26 | 17.7 | 12.9 | 1721 | 5008 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | base | 05:11:07.289 | 05:11:12.209 | 4920 | 859621 | 3 | 218.3 | 1.33 | 244 | 0.28 | 21465 | 2.08 | 19.0 | 16.2 | 1207 | 4049 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 1 | control | 05:11:12.393 | 05:11:17.308 | 4915 | 859671 | 3 | 257.7 | 1.13 | 243 | 0.37 | 21828 | 2 | 19.3 | 14.2 | 1589 | 4737 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | production | 05:11:27.699 | 05:11:32.564 | 4865 | 859830 | 3 | 274.8 | 3.24 | 241 | 0.49 | 30114 | 1.7 | 18.6 | 11.9 | 1712 | 5104 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | base | 05:11:17.472 | 05:11:22.392 | 4921 | 859734 | 3 | 229.0 | 1.56 | 244 | 0.27 | 41531 | 1.84 | 14.0 | 16.5 | 1205 | 4216 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 2 | control | 05:11:22.561 | 05:11:27.508 | 4947 | 859780 | 3 | 266.1 | 1.00 | 245 | 0.31 | 25566 | 1.85 | 15.8 | 18.6 | 1684 | 4935 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 3 | production | 05:11:37.750 | 05:11:42.674 | 4924 | 859953 | 3 | 241.6 | 1.23 | 244 | 0.19 | 30918 | 1.51 | 14.3 | 18.0 | 1500 | 4494 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 3 | base | 05:11:42.898 | 05:11:47.873 | 4975 | 860005 | 3 | 236.0 | 0.87 | 247 | 0.19 | 22206 | 1.63 | 22.1 | 22.3 | 1295 | 4381 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 3 | control | 05:11:32.734 | 05:11:37.592 | 4858 | 859893 | 3 | 231.7 | 1.36 | 240 | 0.33 | 21465 | 1.64 | 13.6 | 11.7 | 1412 | 4267 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 4 | production | 05:11:48.148 | 05:11:53.091 | 4944 | 860067 | 3 | 292.8 | 1.25 | 244 | 0.42 | 22073 | 1.66 | 23.2 | 16.6 | 1820 | 5400 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 4 | base | 05:11:53.273 | 05:11:58.190 | 4917 | 860117 | 3 | 222.0 | 0.76 | 243 | 0.35 | 24624 | 1.61 | 35.1 | 11.7 | 1178 | 4058 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 4 | control | 05:11:58.355 | 05:12:03.240 | 4885 | 860168 | 3 | 277.7 | 0.67 | 241 | 0.67 | 19421 | 1.64 | 17.3 | 11.1 | 1723 | 5082 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 5 | production | 05:12:13.530 | 05:12:18.456 | 4926 | 860337 | 3 | 273.2 | 0.57 | 243 | 0.55 | 26383 | 2.08 | 17.5 | 10.9 | 1709 | 5011 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 5 | base | 05:12:03.393 | 05:12:08.307 | 4913 | 860226 | 3 | 270.7 | 0.86 | 243 | 0.40 | 21367 | 1.67 | 16.0 | 16.9 | 1393 | 4952 | no: placement |
| Cycle gate (300 µs per cycle) | 5 | control | 05:12:08.466 | 05:12:13.358 | 4891 | 860285 | 3 | 261.9 | 0.97 | 241 | 0.40 | 25021 | 2.18 | 13.9 | 18.8 | 1605 | 4800 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | production | 05:12:23.698 | 05:12:28.626 | 4928 | 860450 | 3 | 257.6 | 1.57 | 243 | 0.36 | 30802 | 2.24 | 13.4 | 13.4 | 1589 | 4731 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | base | 05:12:28.792 | 05:12:33.738 | 4946 | 860502 | 3 | 279.0 | 1.04 | 244 | 0.44 | 19284 | 2.46 | 19.9 | 14.8 | 1490 | 5077 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 6 | control | 05:12:18.619 | 05:12:23.546 | 4927 | 860399 | 3 | 293.3 | 0.43 | 243 | 0.44 | 18194 | 2 | 15.8 | 10.9 | 1859 | 5411 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 7 | production | 05:12:33.917 | 05:12:38.840 | 4923 | 860563 | 3 | 259.2 | 0.53 | 244 | 0.45 | 22079 | 2.5 | 12.4 | 11.8 | 1582 | 4765 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 7 | base | 05:12:38.989 | 05:12:43.873 | 4884 | 860644 | 3 | 271.7 | 1.93 | 242 | 0.33 | 23014 | 2.46 | 13.7 | 14.6 | 1420 | 4948 | no: placement, gauge |
| Cycle gate (300 µs per cycle) | 7 | control | 05:12:44.037 | 05:12:48.956 | 4918 | 860702 | 3 | 274.5 | 2.62 | 242 | 0.36 | 36023 | 2.58 | 21.4 | 11.0 | 1715 | 5075 | no: placement, gauge |
| CDP move row, A/A | 1 | production | 05:12:49.186 | 05:12:59.163 | 9977 | 860758 | 3 | 602.9 | 3.67 | 494 | 0.37 | 52567 | 2.78 | 17.0 | 12.1 | 157 | 1802 | no: placement, gauge |
| CDP move row, A/A | 1 | base | 05:12:59.384 | 05:13:09.362 | 9979 | 860818 | 3 | 634.6 | 6.62 | 494 | 0.25 | 53884 | 3.49 | 15.8 | 12.3 | 155 | 1920 | no: placement, gauge |
| CDP move row, A/A | 1 | control | 05:13:09.599 | 05:13:19.579 | 9980 | 860872 | 3 | 578.3 | 3.98 | 495 | 0.21 | 59090 | 4 | 14.5 | 20.0 | 154 | 1749 | no: placement, gauge |
| CDP move row, A/A | 2 | production | 05:13:40.456 | 05:13:50.427 | 9971 | 861063 | 3 | 619.2 | 4.21 | 494 | 0.28 | 58293 | 2.95 | 19.0 | 15.5 | 158 | 1860 | no: placement, gauge |
| CDP move row, A/A | 2 | base | 05:13:19.916 | 05:13:29.895 | 9979 | 860939 | 3 | 567.7 | 5.67 | 495 | 0.28 | 58934 | 3.63 | 28.9 | 20.0 | 147 | 1733 | no: placement, gauge |
| CDP move row, A/A | 2 | control | 05:13:30.209 | 05:13:40.196 | 9987 | 861002 | 3 | 650.6 | 4.40 | 495 | 0.33 | 48754 | 3.31 | 22.8 | 19.6 | 162 | 1948 | no: placement, gauge |
| CDP move row, A/A | 3 | production | 05:14:00.900 | 05:14:10.877 | 9977 | 861182 | 3 | 596.0 | 4.83 | 495 | 0.24 | 53257 | 2.95 | 17.2 | 12.4 | 145 | 1787 | no: placement, gauge |
| CDP move row, A/A | 3 | base | 05:14:11.114 | 05:14:21.093 | 9979 | 861245 | 3 | 653.6 | 2.88 | 494 | 0.38 | 41904 | 2.71 | 14.6 | 12.3 | 159 | 1947 | no: placement, gauge |
| CDP move row, A/A | 3 | control | 05:13:50.682 | 05:14:00.660 | 9978 | 861124 | 3 | 605.0 | 1.76 | 494 | 0.18 | 45770 | 3.12 | 15.6 | 14.4 | 152 | 1818 | no: placement |
| CDP move row, A/A | 4 | production | 05:14:21.322 | 05:14:31.309 | 9987 | 861309 | 3 | 659.8 | 3.41 | 493 | 0.44 | 43637 | 2.45 | 19.2 | 15.3 | 156 | 1961 | no: placement, gauge |
| CDP move row, A/A | 4 | base | 05:14:31.574 | 05:14:41.560 | 9986 | 861369 | 3 | 674.9 | 2.83 | 494 | 0.37 | 46376 | 2.15 | 20.6 | 25.6 | 169 | 2006 | no: placement, gauge |
| CDP move row, A/A | 4 | control | 05:14:41.813 | 05:14:51.792 | 9979 | 861434 | 3 | 637.5 | 2.32 | 493 | 0.42 | 47205 | 1.9 | 15.5 | 15.3 | 154 | 1894 | no: placement |
| CDP move row, A/A | 5 | production | 05:15:12.508 | 05:15:22.490 | 9982 | 861621 | 3 | 596.0 | 2.86 | 495 | 0.23 | 49263 | 1.83 | 40.3 | 11.8 | 152 | 1796 | no: placement, gauge |
| CDP move row, A/A | 5 | base | 05:14:52.032 | 05:15:02.008 | 9976 | 861499 | 3 | 605.0 | 2.31 | 493 | 0.30 | 46059 | 2 | 17.3 | 12.5 | 157 | 1812 | no: placement, gauge |
| CDP move row, A/A | 5 | control | 05:15:02.244 | 05:15:12.224 | 9980 | 861559 | 3 | 672.7 | 2.41 | 494 | 0.38 | 44504 | 2.07 | 12.8 | 13.1 | 162 | 2006 | no: placement, gauge |
| CDP move row, A/A | 6 | production | 05:15:32.988 | 05:15:42.974 | 9986 | 861745 | 3 | 581.0 | 2.41 | 495 | 0.23 | 59570 | 1.6 | 20.2 | 21.8 | 147 | 1752 | no: placement, gauge |
| CDP move row, A/A | 6 | base | 05:15:43.237 | 05:15:53.222 | 9986 | 861805 | 3 | 617.2 | 5.12 | 494 | 0.44 | 52674 | 1.51 | 20.3 | 14.9 | 152 | 1838 | no: placement, gauge |
| CDP move row, A/A | 6 | control | 05:15:22.728 | 05:15:32.707 | 9980 | 861682 | 3 | 577.2 | 3.97 | 495 | 0.20 | 82832 | 1.71 | 15.5 | 18.5 | 142 | 1752 | no: placement, gauge |
| CDP move row, A/A | 7 | production | 05:15:53.482 | 05:16:03.455 | 9973 | 861870 | 3 | 593.1 | 5.08 | 495 | 0.24 | 52533 | 1.43 | 21.9 | 27.8 | 150 | 1792 | no: placement, gauge |
| CDP move row, A/A | 7 | base | 05:16:03.742 | 05:16:13.722 | 9980 | 861928 | 3 | 602.7 | 2.09 | 494 | 0.26 | 50402 | 1.76 | 15.5 | 20.2 | 149 | 1815 | no: placement, gauge |
| CDP move row, A/A | 7 | control | 05:16:14.021 | 05:16:24.005 | 9984 | 861995 | 3 | 634.9 | 4.86 | 495 | 0.21 | 54539 | 1.71 | 22.9 | 20.9 | 168 | 1914 | no: placement, gauge |

### E2 readings

| Row | Round | Arm | Start | End | Window ms | Renderer pid | Renderers | On-CPU ms | Wait ms | Samples | CPU 0–3 share | Pressure µs | Load 1 min | Gauge before ms | Gauge after ms | Script µs | Task µs | Settled |
| --- | --: | --- | --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |
| Move gate (30 µs per move) | 1 | production | 05:16:25.100 | 05:16:30.073 | 4973 | 862264 | 3 | 265.5 | 0.34 | 245 | 0.00 | 17186 | 1.6 | 17.3 | 17.1 | 143 | 821 | yes |
| Move gate (30 µs per move) | 1 | base | 05:16:30.353 | 05:16:35.338 | 4984 | 862318 | 3 | 302.5 | 0.53 | 246 | 0.00 | 17209 | 1.64 | 20.9 | 13.9 | 124 | 903 | no: gauge |
| Move gate (30 µs per move) | 1 | control | 05:16:35.617 | 05:16:40.587 | 4970 | 862365 | 3 | 316.3 | 1.90 | 245 | 0.00 | 19436 | 1.7 | 17.8 | 13.7 | 174 | 978 | no: gauge |
| Move gate (30 µs per move) | 2 | production | 05:16:51.345 | 05:16:56.320 | 4975 | 862523 | 3 | 313.5 | 1.33 | 245 | 0.00 | 24119 | 1.55 | 28.6 | 13.9 | 175 | 973 | no: gauge |
| Move gate (30 µs per move) | 2 | base | 05:16:40.844 | 05:16:45.821 | 4976 | 862422 | 3 | 315.0 | 1.04 | 244 | 0.00 | 23163 | 1.56 | 17.6 | 13.8 | 131 | 935 | no: gauge |
| Move gate (30 µs per move) | 2 | control | 05:16:46.077 | 05:16:51.055 | 4978 | 862478 | 3 | 295.2 | 0.46 | 245 | 0.00 | 22003 | 1.6 | 17.3 | 18.9 | 156 | 883 | yes |
| Move gate (30 µs per move) | 3 | production | 05:17:01.823 | 05:17:06.804 | 4982 | 862627 | 3 | 274.7 | 0.44 | 247 | 0.00 | 18993 | 1.84 | 21.8 | 15.6 | 144 | 828 | no: gauge |
| Move gate (30 µs per move) | 3 | base | 05:17:07.066 | 05:17:12.053 | 4987 | 862682 | 3 | 272.7 | 2.23 | 247 | 0.00 | 25714 | 1.77 | 20.5 | 13.4 | 110 | 812 | no: gauge |
| Move gate (30 µs per move) | 3 | control | 05:16:56.578 | 05:17:01.553 | 4975 | 862571 | 3 | 297.9 | 0.25 | 246 | 0.00 | 17629 | 1.83 | 18.0 | 16.7 | 152 | 896 | yes |
| Move gate (30 µs per move) | 4 | production | 05:17:12.309 | 05:17:17.286 | 4977 | 862731 | 3 | 345.8 | 0.37 | 244 | 0.00 | 19186 | 1.71 | 16.8 | 16.0 | 183 | 1031 | yes |
| Move gate (30 µs per move) | 4 | base | 05:17:17.546 | 05:17:22.519 | 4973 | 862789 | 3 | 300.8 | 0.16 | 245 | 0.00 | 18049 | 1.65 | 17.2 | 19.8 | 127 | 925 | no: gauge |
| Move gate (30 µs per move) | 4 | control | 05:17:22.807 | 05:17:27.785 | 4979 | 862838 | 3 | 254.7 | 0.18 | 246 | 0.00 | 24613 | 1.52 | 26.4 | 13.4 | 135 | 764 | no: gauge |
| Move gate (30 µs per move) | 5 | production | 05:17:38.629 | 05:17:43.618 | 4990 | 862996 | 3 | 251.6 | 2.81 | 247 | 0.00 | 30420 | 1.76 | 33.9 | 18.1 | 134 | 763 | no: gauge |
| Move gate (30 µs per move) | 5 | base | 05:17:28.050 | 05:17:33.035 | 4985 | 862885 | 3 | 297.7 | 0.64 | 247 | 0.00 | 25145 | 1.72 | 24.2 | 13.8 | 133 | 891 | no: gauge |
| Move gate (30 µs per move) | 5 | control | 05:17:33.296 | 05:17:38.268 | 4972 | 862939 | 3 | 216.2 | 0.64 | 247 | 0.00 | 22098 | 1.74 | 20.9 | 21.2 | 120 | 673 | no: gauge |
| Move gate (30 µs per move) | 6 | production | 05:17:49.180 | 05:17:54.168 | 4988 | 863098 | 3 | 250.1 | 0.13 | 246 | 0.00 | 22283 | 1.8 | 20.2 | 14.3 | 132 | 755 | no: gauge |
| Move gate (30 µs per move) | 6 | base | 05:17:54.437 | 05:17:59.418 | 4981 | 863147 | 3 | 298.1 | 1.91 | 246 | 0.00 | 23041 | 1.74 | 23.5 | 13.9 | 137 | 890 | no: gauge |
| Move gate (30 µs per move) | 6 | control | 05:17:43.932 | 05:17:48.918 | 4986 | 863052 | 3 | 249.9 | 0.92 | 247 | 0.00 | 23807 | 1.78 | 22.9 | 17.1 | 131 | 756 | no: gauge |
| Move gate (30 µs per move) | 7 | production | 05:17:59.672 | 05:18:04.652 | 4979 | 863200 | 3 | 329.2 | 0.69 | 246 | 0.00 | 20564 | 1.6 | 16.9 | 23.7 | 174 | 991 | no: gauge |
| Move gate (30 µs per move) | 7 | base | 05:18:04.924 | 05:18:09.900 | 4976 | 863250 | 3 | 251.2 | 0.13 | 246 | 0.00 | 20772 | 1.63 | 17.1 | 14.0 | 104 | 753 | no: gauge |
| Move gate (30 µs per move) | 7 | control | 05:18:10.174 | 05:18:15.150 | 4976 | 863305 | 3 | 292.1 | 0.21 | 246 | 0.00 | 24201 | 1.58 | 17.4 | 18.5 | 154 | 878 | yes |
| Cycle gate (300 µs per cycle) | 1 | production | 05:18:15.335 | 05:18:20.243 | 4908 | 863364 | 3 | 298.8 | 0.56 | 243 | 0.00 | 20063 | 1.53 | 16.7 | 14.7 | 1937 | 5604 | no: gauge |
| Cycle gate (300 µs per cycle) | 1 | base | 05:18:20.425 | 05:18:25.300 | 4875 | 863414 | 3 | 217.3 | 0.53 | 242 | 0.00 | 32143 | 1.69 | 17.3 | 22.2 | 1158 | 4020 | no: gauge |
| Cycle gate (300 µs per cycle) | 1 | control | 05:18:25.562 | 05:18:30.558 | 4996 | 863462 | 3 | 276.4 | 1.19 | 248 | 0.00 | 36294 | 1.95 | 30.1 | 24.9 | 1873 | 5191 | no: gauge |
| Cycle gate (300 µs per cycle) | 2 | production | 05:18:41.055 | 05:18:45.943 | 4888 | 863620 | 3 | 294.8 | 0.91 | 241 | 0.00 | 26176 | 1.73 | 18.4 | 20.2 | 1817 | 5502 | no: gauge |
| Cycle gate (300 µs per cycle) | 2 | base | 05:18:30.864 | 05:18:35.765 | 4901 | 863518 | 3 | 232.5 | 2.83 | 243 | 0.00 | 23223 | 1.96 | 32.1 | 15.0 | 1315 | 4276 | no: gauge |
| Cycle gate (300 µs per cycle) | 2 | control | 05:18:35.943 | 05:18:40.877 | 4935 | 863565 | 3 | 326.1 | 0.15 | 244 | 0.00 | 17659 | 1.88 | 18.6 | 17.5 | 2033 | 6066 | yes |
| Cycle gate (300 µs per cycle) | 3 | production | 05:18:51.233 | 05:18:56.156 | 4923 | 863725 | 3 | 352.1 | 0.60 | 241 | 0.00 | 18752 | 1.54 | 16.1 | 13.9 | 2194 | 6488 | no: gauge |
| Cycle gate (300 µs per cycle) | 3 | base | 05:18:56.326 | 05:19:01.259 | 4933 | 863774 | 3 | 267.8 | 0.29 | 242 | 0.00 | 26247 | 1.41 | 16.7 | 15.6 | 1433 | 4921 | no: gauge |
| Cycle gate (300 µs per cycle) | 3 | control | 05:18:46.122 | 05:18:51.057 | 4934 | 863676 | 3 | 306.0 | 0.57 | 244 | 0.00 | 23938 | 1.67 | 18.2 | 14.2 | 1860 | 5629 | no: gauge |
| Cycle gate (300 µs per cycle) | 4 | production | 05:19:01.440 | 05:19:06.365 | 4925 | 863828 | 3 | 341.3 | 0.42 | 243 | 0.00 | 19569 | 1.46 | 20.4 | 14.0 | 2082 | 6263 | no: gauge |
| Cycle gate (300 µs per cycle) | 4 | base | 05:19:06.533 | 05:19:11.436 | 4903 | 863877 | 3 | 281.2 | 0.21 | 242 | 0.00 | 17329 | 1.42 | 16.1 | 15.1 | 1523 | 5197 | no: gauge |
| Cycle gate (300 µs per cycle) | 4 | control | 05:19:11.607 | 05:19:16.559 | 4952 | 863933 | 3 | 305.8 | 0.33 | 245 | 0.00 | 17200 | 1.47 | 19.7 | 20.1 | 1930 | 5689 | no: gauge |
| Cycle gate (300 µs per cycle) | 5 | production | 05:19:26.927 | 05:19:31.840 | 4913 | 864089 | 3 | 299.0 | 0.25 | 241 | 0.00 | 21864 | 1.37 | 17.1 | 14.2 | 1831 | 5520 | no: gauge |
| Cycle gate (300 µs per cycle) | 5 | base | 05:19:16.741 | 05:19:21.655 | 4914 | 863994 | 3 | 302.1 | 2.07 | 243 | 0.00 | 27673 | 1.43 | 17.5 | 15.0 | 1590 | 5544 | no: gauge |
| Cycle gate (300 µs per cycle) | 5 | control | 05:19:21.829 | 05:19:26.755 | 4926 | 864040 | 3 | 297.9 | 0.53 | 243 | 0.00 | 17917 | 1.32 | 16.1 | 14.2 | 1728 | 5438 | no: gauge |
| Cycle gate (300 µs per cycle) | 6 | production | 05:19:37.129 | 05:19:42.050 | 4921 | 864199 | 3 | 289.7 | 3.93 | 243 | 0.00 | 25352 | 1.31 | 16.3 | 15.8 | 1763 | 5373 | yes |
| Cycle gate (300 µs per cycle) | 6 | base | 05:19:42.228 | 05:19:47.079 | 4851 | 864250 | 3 | 245.7 | 0.47 | 240 | 0.00 | 22073 | 1.29 | 17.2 | 19.8 | 1307 | 4531 | no: gauge |
| Cycle gate (300 µs per cycle) | 6 | control | 05:19:32.013 | 05:19:36.955 | 4942 | 864143 | 3 | 337.8 | 0.66 | 244 | 0.00 | 24968 | 1.34 | 18.5 | 20.3 | 2144 | 6237 | no: gauge |
| Cycle gate (300 µs per cycle) | 7 | production | 05:19:47.256 | 05:19:52.187 | 4932 | 864302 | 3 | 246.6 | 1.89 | 245 | 0.00 | 32669 | 1.43 | 16.8 | 13.8 | 1535 | 4593 | no: gauge |
| Cycle gate (300 µs per cycle) | 7 | base | 05:19:52.358 | 05:19:57.271 | 4913 | 864351 | 3 | 233.6 | 0.85 | 243 | 0.00 | 25071 | 1.63 | 17.0 | 14.7 | 1230 | 4301 | no: gauge |
| Cycle gate (300 µs per cycle) | 7 | control | 05:19:57.455 | 05:20:02.354 | 4899 | 864398 | 3 | 272.4 | 0.95 | 241 | 0.00 | 18243 | 1.66 | 18.2 | 14.3 | 1743 | 5047 | no: gauge |
| CDP move row, A/A | 1 | production | 05:20:02.625 | 05:20:12.613 | 9988 | 864455 | 3 | 681.9 | 3.53 | 494 | 0.00 | 46651 | 1.53 | 22.5 | 21.7 | 171 | 2057 | no: gauge |
| CDP move row, A/A | 1 | base | 05:20:12.885 | 05:20:22.862 | 9977 | 864515 | 3 | 725.2 | 1.16 | 495 | 0.00 | 40420 | 1.44 | 17.4 | 19.8 | 184 | 2190 | no: gauge |
| CDP move row, A/A | 1 | control | 05:20:23.130 | 05:20:33.111 | 9981 | 864576 | 3 | 628.3 | 4.84 | 495 | 0.00 | 54922 | 1.37 | 22.3 | 15.2 | 153 | 1895 | no: gauge |
| CDP move row, A/A | 2 | production | 05:20:53.866 | 05:21:03.843 | 9978 | 864754 | 3 | 708.7 | 1.34 | 495 | 0.00 | 37303 | 1.45 | 17.0 | 22.0 | 174 | 2129 | no: gauge |
| CDP move row, A/A | 2 | base | 05:20:33.370 | 05:20:43.344 | 9975 | 864634 | 3 | 551.9 | 3.42 | 494 | 0.00 | 64852 | 1.24 | 18.4 | 18.2 | 138 | 1683 | yes |
| CDP move row, A/A | 2 | control | 05:20:43.623 | 05:20:53.611 | 9987 | 864694 | 3 | 639.3 | 7.16 | 495 | 0.00 | 56848 | 1.44 | 22.7 | 15.9 | 158 | 1937 | no: gauge |
| CDP move row, A/A | 3 | production | 05:21:14.357 | 05:21:24.342 | 9985 | 864879 | 3 | 687.4 | 1.05 | 494 | 0.00 | 43671 | 1.24 | 22.4 | 15.5 | 171 | 2059 | no: gauge |
| CDP move row, A/A | 3 | base | 05:21:24.604 | 05:21:34.576 | 9972 | 864935 | 3 | 675.7 | 3.39 | 494 | 0.00 | 47249 | 1.12 | 20.0 | 15.8 | 167 | 2031 | no: gauge |
| CDP move row, A/A | 3 | control | 05:21:04.107 | 05:21:14.095 | 9987 | 864812 | 3 | 716.6 | 2.66 | 493 | 0.00 | 41039 | 1.38 | 20.4 | 21.6 | 181 | 2156 | no: gauge |
| CDP move row, A/A | 4 | production | 05:21:34.842 | 05:21:44.825 | 9984 | 864994 | 3 | 747.2 | 1.22 | 493 | 0.00 | 41934 | 1.11 | 23.4 | 20.7 | 184 | 2236 | no: gauge |
| CDP move row, A/A | 4 | base | 05:21:45.102 | 05:21:55.075 | 9973 | 865063 | 3 | 695.3 | 2.48 | 493 | 0.00 | 45668 | 1.02 | 17.5 | 16.2 | 175 | 2103 | yes |
| CDP move row, A/A | 4 | control | 05:21:55.331 | 05:22:05.308 | 9977 | 865116 | 3 | 617.7 | 1.24 | 495 | 0.00 | 50270 | 1.25 | 17.4 | 16.6 | 155 | 1865 | yes |
| CDP move row, A/A | 5 | production | 05:22:26.096 | 05:22:36.074 | 9978 | 865300 | 3 | 680.2 | 1.26 | 495 | 0.00 | 54292 | 1.54 | 17.7 | 16.9 | 171 | 2052 | yes |
| CDP move row, A/A | 5 | base | 05:22:05.564 | 05:22:15.540 | 9977 | 865175 | 3 | 579.7 | 1.88 | 494 | 0.00 | 60615 | 1.43 | 17.2 | 20.5 | 150 | 1759 | no: gauge |
| CDP move row, A/A | 5 | control | 05:22:15.851 | 05:22:25.823 | 9973 | 865245 | 3 | 678.4 | 4.27 | 493 | 0.00 | 51857 | 1.74 | 20.8 | 16.1 | 174 | 2050 | no: gauge |
| CDP move row, A/A | 6 | production | 05:22:46.598 | 05:22:56.572 | 9974 | 865425 | 3 | 626.3 | 5.19 | 493 | 0.00 | 66375 | 1.31 | 19.6 | 22.0 | 156 | 1890 | no: gauge |
| CDP move row, A/A | 6 | base | 05:22:56.912 | 05:23:06.889 | 9977 | 865480 | 3 | 553.9 | 3.64 | 495 | 0.00 | 66044 | 1.66 | 31.7 | 20.0 | 140 | 1675 | no: gauge |
| CDP move row, A/A | 6 | control | 05:22:36.338 | 05:22:46.323 | 9984 | 865356 | 3 | 643.5 | 2.41 | 495 | 0.00 | 53210 | 1.46 | 22.3 | 19.3 | 160 | 1941 | no: gauge |
| CDP move row, A/A | 7 | production | 05:23:07.204 | 05:23:17.190 | 9986 | 865548 | 3 | 678.7 | 5.00 | 495 | 0.00 | 48194 | 2.03 | 24.3 | 18.9 | 172 | 2049 | no: gauge |
| CDP move row, A/A | 7 | base | 05:23:17.450 | 05:23:27.437 | 9987 | 865609 | 3 | 711.6 | 0.96 | 494 | 0.00 | 42201 | 2.59 | 19.9 | 17.3 | 180 | 2134 | no: gauge |
| CDP move row, A/A | 7 | control | 05:23:27.698 | 05:23:37.671 | 9973 | 865661 | 3 | 705.9 | 2.16 | 494 | 0.00 | 47223 | 2.43 | 17.8 | 15.7 | 176 | 2126 | no: gauge |

## Files

All under [`measurements/`](measurements/), unedited:

- `2026-11-11-sensitivity-{U1,E1,U2,E2}.{json,txt}`: the four experiment processes;
- `2026-11-11-sensitivity-campaign-status.json`: `campaign.ts`'s status for run `sensitivity`. Its step logs are empty, because the wrapper writes each step's output to its `.txt` file;
- `2026-11-11-sensitivity-dry.txt`: dry check 1;
- `2026-11-11-sensitivity-selfcheck-{unpinned,ecores}.txt`: the passing self-check, and `…-300ms.txt` and `…-discarded.txt`, the earlier attempts (§Deviations);
- `2026-11-11-sensitivity-probe.ts.txt`, `2026-11-11-sensitivity-record-wrapper.sh.txt` and `2026-11-11-sensitivity-analysis.py.txt`: the probe, the wrapper and the table generator.

## Verification

| Check | Result |
| --- | --- |
| `git diff --stat 25b8c7a8f..HEAD -- src tests bench` | Empty |
| Item 2 | Dry check 1 and the core sets as required; the self-check as required at 500 ms nominal, after §Deviations 1 and 2 |
| Item 3 | Four processes, each exit 0 |
| Markdown | `just fmt`, a scratch link check and `git diff --check` |

No TypeScript source is committed, so lint and typecheck aren't owed. Lint doesn't apply to Markdown here.

## Limits

- **Placement is the last CPU sampled every 20 ms,** not a continuous record. A thread that is not running reports the CPU it last ran on.
- **The gauge criterion is computed against one median per process,** across all rows and both sides of every window. That is how property 7 states it, and these readings show that it isn't met by most readings in any condition.
- **Overlap from the owner's sessions is the owner's report.** This session can't observe other sessions' commands.

## Next

The architect applies `DRD-44` property 8 to each gate row from these figures. No row has a settled round in any process.
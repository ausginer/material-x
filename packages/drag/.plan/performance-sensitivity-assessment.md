# Performance sensitivity: assessment

**Read:** [`performance-sensitivity-report.md`](performance-sensitivity-report.md) at `24cdadc48` on `drag/performance-resolution`, with its raw files under `measurements/`. **Governing records:** `DRD-44`, `DRD-43` and `DRD-40` in [`00-index.md`](00-index.md), and [`performance-resolution-assessment.md`](performance-resolution-assessment.md) §4. **Read by:** the architect, on 2026-11-11.

**Outcome:**

- By `DRD-44` property 8, both gate rows are **not resolved**. No process has a settled round on either row.
- The speed gauge can't tell machine instability from its own warm-up. The reading before each window is the gauge's first run in a fresh page, and that first run is about 20 % slower than the second in every one of 252 readings. So property 7's gauge test rejects readings for the gauge's own behavior.
- An unchanged rerun can't settle either. Every unpinned reading ran on both core classes, and the gauge test fails pinned or not.
- At the quietest machine state on record, the gates' bounds are still 0.14 to 0.39 of the base arm's median. So a launch condition alone can't meet `DRD-43` property 8, and the method has to change whatever the outcome.
- `DRD-45` withdraws the gauge test and the rerun. It decides one same-page check, which shows whether the spread comes from the page, from inside the window, or from the clock.

## 1. Checks made in this pass

No browser was launched, and no timing was run.

| Check | Result |
| --- | --- |
| `git diff --stat 25b8c7a8f..24cdadc48 -- src tests bench` in `packages/drag` | Empty |
| Settled readings and rounds, recomputed from the four JSON files | E1 has 11 settled readings and E2 has 11. U1 and U2 have none. No process has a settled round on any row |
| The CDP row's bound ÷ base median, unrounded | 0.186, 0.202, 0.111 and 0.177 in U1, E1, U2 and E2 |
| Gauge analysis | [`2026-11-11-sensitivity-gauge-analysis.py.txt`](measurements/2026-11-11-sensitivity-gauge-analysis.py.txt), output in [`…-gauge-analysis.txt`](measurements/2026-11-11-sensitivity-gauge-analysis.txt). §4 cites it |
| Earlier gate bounds, from [`2026-11-11-resolution-prove.json`](measurements/2026-11-11-resolution-prove.json) | Move gate: bound 83 µs, base median 126.9 µs. Cycle gate: bound 622 µs, base median 1,413 µs |
| Injection find texts against `566ebfc65`'s `src`, text only | 5 of the 15 definitions are stale, all at `MOVE_SITE`, which is 10 of the 23 applied entries. All 15 apply once at `a9c323f6a` |
| The clock files | `/sys/devices/system/cpu/cpu<N>/cpufreq/cpuinfo_avg_freq` can be read without privilege for CPUs 0 to 11. The driver is `intel_pstate`, the governor is `powersave` and the energy preference is `balance_performance`. Five reads at 08:58Z, not during the campaign: CPUs 4, 7 and 11 at 2.39 to 2.51 GHz, CPU 1 at 0.72 to 3.40 GHz |

## 2. Status corrections

1. **Settled readings aren't settled rounds.** The report's outcome line says that no reading in any process is settled by property 7. That's wrong:
   - E1 has 11 settled readings: 3 on the move gate row, 5 on the cycle gate row and 3 on the CDP row.
   - E2 has 11: 5, 2 and 4.
   - U1 and U2 have none.

   **No round of any row is settled in any process,** because a round is settled only when every arm's reading in it is. The report's last section says this correctly. The outcome below rests on rounds, so the correction doesn't change it.

2. **E2's CDP ratio.** It is 0.18 (29.5 ÷ 167.0), not 0.19 as in the summary table and the paragraph beside property 8's table. The per-process table has it right. It is still within B1 to B3's 0.12 to 0.21.
3. **The handoff's self-check threshold.** The [handoff](performance-sensitivity-handoff.md) asked for at least 200 ms of on-CPU time from a 300 ms nominal loop. "Nominal" assumed 60 iterations per µs. On a P-core the loop ran at about 100: 18,000,000 iterations took 180 ms. That error is the architect's. The owner directed a longer loop, 500 ms nominal, and that is accepted. What the check exists to show did hold: it found the main thread, and counted 294.8 of 296.4 ms on-CPU unpinned and 407.4 of 409.0 ms pinned.
4. **`dirty: true` is explained.** Each machine record's `git status --porcelain` lists only this unit's untracked raw files. That closes the item in the resolution assessment §2.

## 3. `DRD-44` property 8, applied

| Gate row | Settled rounds: U1, E1, U2, E2 | Verdicts: U1, E1, U2, E2 | Outcome |
| --- | --- | --- | --- |
| 30 µs per move, in the page | 0, 0, 0, 0 | flag, flag, none, none | **Not resolved** |
| 300 µs per cycle, in the page | 0, 0, 0, 0 | flag, none, flag, flag | **Not resolved** |

**The CDP row beside the table:** bound ÷ base median is 0.19, 0.20, 0.11 and 0.18. No process is settled, so the sentence about the recorder's limit applies to none of them.

**The table says the experiment then runs once more. That consequence isn't taken**, because an unchanged rerun can't settle a round:

- **Placement.** Every one of the 126 unpinned readings failed it. The share of samples on CPUs 0 to 3 was 0.14 to 0.70, at one-minute loads of 1.0 to 4.0. Unpinned, a 5-second window always spans both core classes. So U processes never settle.
- **The gauge.** It failed in 16 to 20 of 21 readings per row and process, pinned or not. §4 shows that the failure comes from the gauge itself.

`DRD-45` replaces the rerun.

## 4. The gauge

### 4.1 The difference between before and after

The gauge before each window is the first time the gauge function runs in that page. The page is new and its renderer process is new, since the renderer pid differs in every reading. The gauge after the window is the second run, about 5 seconds later.

| Process | Median before, ms | Median after, ms | Lowest before ÷ lowest after | Before slower | Before within 5 % of the lowest after |
| --- | --: | --: | --: | --: | --: |
| U1 | 16.6 | 14.1 | 12.2 ÷ 9.9 = 1.23 | 47 of 63 | 0 of 63 |
| E1 | 18.9 | 16.4 | 16.2 ÷ 13.4 = 1.21 | 46 of 63 | 0 of 63 |
| U2 | 17.3 | 14.4 | 12.4 ÷ 10.0 = 1.24 | 42 of 63 | 0 of 63 |
| E2 | 18.4 | 16.1 | 16.1 ÷ 13.4 = 1.20 | 48 of 63 | 0 of 63 |

**The difference doesn't come from the machine.** The first run's lowest value sits 20 to 24 % above the second run's lowest, in all four processes, pinned and unpinned. Over 29 minutes, not one first run came within 5 % of the lowest second run. Machine instability changes over time. It can't raise the floor of every first run and leave the run 5 seconds later free to reach a lower one.

**The difference comes from where the gauge sits.** Either the gauge pays for its own warm-up on its first run, or the fresh page slows it. These records can't tell the two apart, because the gauge before the window is always both the first run and the run in the fresh page.

### 4.2 What the gauge does and doesn't follow

- **Its two sides don't agree.** Pearson r between a reading's before and after gauges is +0.26, +0.09, +0.03 and +0.09. If the gauge read a machine state, that state would persist across the 5-second window.
- **It depends on the row.** On the E-cores, the median gauge after the window is 14.8 to 15.7 ms after an in-page row, and 18.2 to 18.8 ms after the CDP row. The median before the window falls and rises again: 20.8, 17.7 and 20.3 ms in E1's three rows, which run in that order. A drift over time would move one way. So the gauge reads the page's state, too.
- **It doesn't predict the reading.** Correlate each reading's script with its gauge, after dividing the script by its arm's median: r is −0.42 to +0.28 by row and process, with no consistent sign.
- **It does show the core class.** The lowest gauge after a window was 9.9 to 10.0 ms unpinned and 13.4 ms pinned. That ratio, 1.34, is the clock ratio of 4.7 to 3.5 GHz. Placement already records the core class.

### 4.3 What that does to property 7

The test pools both sides into one process median. The two sides' medians are 15 to 20 % apart, so the median of the pool sits about 8 % from each side's median. A 10 % band around it leaves out most of either side's spread. In E1 and E2 every reading met the wait and placement tests, so the gauge was the only test that failed. **The gauge test measures the gauge, not the machine.** `DRD-45` withdraws it.

### 4.4 What the readings show with the gauge set aside

None of this is an outcome.

- **The pinned readings would read "method", and that isn't taken.** Without the gauge test, all 126 pinned readings would be settled, and each gate fails in one pinned process: the cycle gate in E1 (269 µs against 559) and the move gate in E2 (34 µs against 48). That is property 8's method outcome.
  - The gauge test was there to rule out clock changes. Without it, nothing in the record does, and the clock does vary on this machine (§1).
  - The verdicts are known now. A test chosen after them can't decide the outcome: by `DRD-40`, no rule moves with a reading.
- **Pinning didn't narrow the spread.** All 126 pinned readings had at most 5 % wait and ran on one core class. Their median absolute A/A difference was still larger than unpinned, on every row:

  | Row        | Pinned, µs | Unpinned, µs |
  | ---------- | ---------: | -----------: |
  | Move gate  |       18.2 |         14.2 |
  | Cycle gate |        212 |          109 |
  | CDP row    |       16.1 |          6.5 |

  So neither run-queue wait nor placement across both core classes explains the spread. That removes placement as the candidate mechanism in the resolution assessment §4.3. One limit: `taskset` puts all of Chrome on the 8 E-cores, not only the page's thread.

- **The load did matter.**

  | Run | One-minute load | Gates flagged | Move gate bound ÷ base median | Cycle gate bound ÷ base median | CDP row bound, µs |
  | --- | --- | --- | --- | --- | --- |
  | `--prove` at `39c8b432c` | 4.9 to 9.0 | 0 of 2 | 0.65 | 0.44 | 143 |
  | This experiment | 1.0 to 4.0 | 5 of 8 | 0.29 to 0.38 | 0.14 to 0.39 | 17 to 32 |

- **The quietest state still doesn't reach P3.** `DRD-43` property 8 lets an optimization unit start only on a row whose floor is at most 10 % of the library's share of that row's script. At this experiment's load, the move gate's bound is 34 to 48 µs against an injected 30 µs nominal, and the cycle gate's bound is 0.14 to 0.39 of its base median. **A launch or admission condition can't close that gap alone. The method changes in any outcome.** What is still open is which part of the method, and whether the clock needs an admission condition as well.

## 5. Decision: `DRD-45`

`DRD-45` in [`00-index.md`](00-index.md) decides five things:

- The gauge test of `DRD-44` property 7 is withdrawn.
- `DRD-44`'s outcome is final as not resolved, and the rerun is replaced.
- One unpinned process measures each in-page gate row in four windows per page across ten pages. Each window records the clock of the CPU the page's thread ran on.
- Its table, fixed before the run, reads each row as **page**, **clock** or **window**:
  - **Page:** windows on adjacent pages differ at least twice as much as windows on the same page, at the same spacing.
  - **Clock:** they don't, and the window's script falls as its clock rises.
  - **Window:** neither holds.
- The gauge stays as a record only. A first and second run back to back in each fresh page separate its warm-up from the page's state.

**Why this check is the smallest useful one:**

- **A gauge-only check** would confirm §4.1 and leave the machine-or-method question open.
- **A warmed gauge** would still be an arithmetic loop outside the window. It can't see the clock during the window's short bursts of work, or contention for cache and memory.
- **Same-page windows** hold the machine equal and change only the page. They need no injection, no `judge` and no second arm, so they take one process of about 9 minutes, against four of about 7 minutes in `DRD-44`.

## 6. The pending injection repair for `566ebfc65`

The alias cleanup at `566ebfc65` on `drag/performance` reformats the move site in `sortable/operation.ts` across three lines. So `MOVE_SITE` no longer occurs there.

**What is stale.** Ten of the 23 applied entries:

- The gates "one forced layout per move", "one O(n) walk per move" and "30 µs of script per move, in the page".
- The floor series of 100, 30 and 10 µs per move through CDP.
- The floor series of 30, 10, 5 and 2 µs per move in the page.

The drop-site entries still apply. At `566ebfc65`, `this.#lift.translate(` occurs twice in that file: in `move()`, and in the request path at its line 127. `alias-cleanup-report.md` at `566ebfc65`, which isn't on this branch, left the repair to the owner. The owner has now directed that it land before any campaign on that source. `DRD-45` property 9 records that.

**What the repair requires:**

- Each stale find text occurs exactly once, in `move()`, before its `#lift.translate` call, where the entries apply at `a9c323f6a`.
- `--prove --dry` applies 9 entries and `--floors --dry` applies 14, with no browser.
- No other entry, rule, scenario, count or wait changes.

**When it lands.** Before any campaign on `566ebfc65` or a descendant. The check in §5 runs on this branch's `src`, which is `a9c323f6a`'s, and uses no injection, so it doesn't wait for the repair.

## 7. Next unit

[`performance-page-check-handoff.md`](performance-page-check-handoff.md), one `implementer` unit in this worktree, under the same hold of the owner's other sessions. Its report gives the figures, and the architect applies `DRD-45` property 7.

## 8. Open after this assessment

- `DRO-4`: the retained excess and its retainer-path probe, offered to the owner.
- The injection repair for `566ebfc65` (§6), before any campaign on that source.
- `drag/performance-resolution` and `drag/performance` have split from `39c8b432c`. The owner decides how they rejoin. The next campaign on the instrument runs on the source that results, after the repair.
- `DRD-43`'s floors, B3' and F1, F2 and `--prove` wait for `DRD-45`'s outcome.
#### DRD-45 — The gauge is withdrawn, and one same-page check splits the page, the window and the clock

**Status:** active, decided on 2026-11-11 by the architect on the sensitivity report at `24cdadc48` ([assessment](../performance-sensitivity-assessment.md) §4). Amends `DRD-44` properties 4, 7 and 8, and [`performance-plan.md`](../performance-plan.md) §2 P1b. Property 9 holds the injection repair for `566ebfc65`. Its check, [`performance-page-check-handoff.md`](../performance-page-check-handoff.md), returned at `f344a0ea8` before any browser process. `DRD-46` stopped properties 3 to 8 on the owner's direction and keeps them for possible later use. Properties 1, 2 and 9 are in force. Property 9 amended on 2026-11-24, and still owed

**`DRD-44`'s outcome is final as not resolved, on both in-page gate rows. Its gauge test is withdrawn, because the gauge measures its own first run and the page's state, not the machine. Its rerun is withdrawn, because an unchanged rerun can't settle a round. One unpinned process measures each in-page gate row in four windows per page across ten pages, and records the clock of the CPU the page's thread runs on. The outcome table below, fixed before the run, reads each row as page, clock or window. F1, F2, `--prove` and B3' still aren't repeated.**

Decided on 2026-11-11 by the architect, on [`performance-sensitivity-report.md`](../performance-sensitivity-report.md) at `24cdadc48` ([assessment](../performance-sensitivity-assessment.md) §3 and §4).

**Why:**

- **The gauge's first run is slower in every reading, and the machine doesn't explain it.** In each process, the lowest gauge before a window is 20 to 24 % above the lowest after it. Not one of 252 gauges before a window came within 5 % of its process's lowest after. The gauge before is the first run of its function in a fresh renderer, so it carries either its own warm-up or the fresh page's state.
- **It doesn't read the machine at a reading's scale.** Pearson r between a reading's two gauges is +0.03 to +0.26. The gauge's median changes with the row that ran before it, and its correlation with the reading's script is −0.42 to +0.28, with no consistent sign. The one machine property it shows is the core class, and placement records that already.
- **An unchanged rerun can't settle.** Every one of 126 unpinned readings ran under 90 % on one class, at loads of 1.0 to 4.0. The gauge test failed in 16 to 20 of 21 readings per row and process, pinned or not.
- **The pinned readings can't be read now as the method outcome.** With the gauge test dropped, each gate fails in one fully settled pinned process. But the test was there to rule out the clock, which varies on this machine, and a test changed after the verdicts are known would move a rule with a reading (`DRD-40`).
- **The method changes in any outcome.** At loads of 1.0 to 4.0, the gates' bounds were 0.29 to 0.38 and 0.14 to 0.39 of the base median. `DRD-43` property 8 needs a floor of at most 10 % of the library's share. What is still open is which part of the method makes the spread, and whether the clock needs an admission condition besides.
- **Same-page windows separate the page from the machine.** Windows two runs apart are about the same time apart whether they share a page or not, so the machine adds to both alike, and only the page differs.

**Required properties:**

1. **The gauge test is withdrawn.** `DRD-44` property 4's gauge and property 7's third test no longer decide whether a reading is settled, in any process recorded or to come. The gauge stays in this check as a record only (property 8).
2. **`DRD-44`'s outcome is final**, as not resolved, for "30 µs of script per move, in the page" and "300 µs of script per cycle, in the page". Its rerun is replaced by this check.
3. **A probe, not an instrument change.** A scratch copy of the sensitivity probe at `24cdadc48`, with its recorder and gauge as they ran there and its main block replaced. It uses the unchanged scenarios and `openPage`'s page set-up. It has no injection and no `judge`. Its source is saved under `measurements/` as text. No tracked file under `bench/`, `src/` or `tests/` changes.
4. **Pages and windows.** One process, unpinned, as every run before `DRD-44`.
   - The rows are "in the page: 300 moves, one frame each, 20 items" and then "in the page: 50 activate-and-drop cycles, 20 items, no landing", both on the production arm.
   - Each row runs on 10 pages in sequence. Each page is set up as `openPage` sets up an arm.
   - In each page, the row's unchanged `run` runs 4 times, with only `lab.destroy()` between runs. Each run's window is one reading, s(p, k), the script per event of window k in page p.
   - Each window's layout count equals the row's: 83 per window for moves and 250 for cycles. Any other count returns the unit.
5. **The record.**
   - **Each window:** `DRD-44` property 3's record.
   - **The clock:** at each 20 ms placement sample, the recorder reads `cpuinfo_avg_freq` of the CPU the main thread last ran on, from Node. The window's clock is the mean of those reads. A failed read is recorded as missing. A window with fewer than half its reads present returns the unit.
   - **The gauge:** two runs back to back after the page's set-up and before the first `run`, g1 and g2. Each window keeps the sensitivity probe's gauges, b_k before it and a_k after it. Each gauge has its own clock reads, and every gauge runs outside a window.
6. **Machine state.** The hold of `DRD-44` property 6, and the machine record of its amendment to `DRD-40` property 4. The record at the head and the foot also gives each CPU's `scaling_governor` and `energy_performance_preference`.
7. **The outcome, per row, fixed before the run.**
   - **W** is the median over the 10 pages of |s(p, 4) − s(p, 2)|.
   - **B** is the median over the 9 adjacent pairs of |s(p + 1, 2) − s(p, 4)|.
   - **ρ** is Spearman's coefficient between s and the window's clock, over the row's 40 windows.

   W and B both compare warm windows two runs apart. Window 1 of each page carries its own warm-up, so neither uses it.

   | Outcome | Condition | What follows |
   | --- | --- | --- |
   | **Page** | B ≥ 2 W | The method: the new page per reading. The decision `DRD-43` deferred, extended to the page. Candidates include warm windows in one page, the remedy `DRD-44` rejected "now" |
   | **Clock** | B < 2 W and ρ ≤ −0.5 | The machine: an admission condition on the clock record, then F1, F2, `--prove` and B3' under it, and the method decision after them |
   | **Window** | B < 2 W and ρ > −0.5 | The method, inside the window: the decision `DRD-43` deferred, on events per reading or `judge`'s bound |

   ρ ≤ −0.5 means script falls as the clock rises. A busier window can also raise its own clock, which gives a positive ρ, and that doesn't count as the clock outcome.

   Reported beside the table, per row:
   - W and B ÷ the row's median;
   - each page's s(p, 1) ÷ the median of its windows 2 to 4;
   - the median spacing in seconds of the pairs in W and in B;
   - each window's share of samples on CPUs 0 to 3.

8. **The gauge decides nothing here.** If g1 exceeds g2 in at least 18 of the 20 pages, `DRD-44`'s difference between before and after was the gauge's own warm-up. Otherwise it was the fresh page's state. The report gives that count, the medians of g1 − g2, b1 − g2 and a1 − b1, and Spearman's ρ between each gauge and its clock. No reading's status depends on them.
9. **The injection repair for `566ebfc65`.** At `566ebfc65` on `drag/performance`, `MOVE_SITE` no longer occurs, and 10 of the 23 applied entries are stale. Before any campaign on that source or a descendant, a unit repairs them:
   - each stale find text occurs exactly once, in `move()`, before its `#lift.translate` call;
   - `--prove --dry` applies 9 entries and `--floors --dry` applies 14, with no browser;
   - no other entry, rule, scenario, count or wait changes.

   This check doesn't wait for the repair: it runs on this branch's `src`, which is `a9c323f6a`'s, and has no injection.

10. **What it doesn't decide.** It measures no floor, and its readings aren't a baseline. `DRD-43` properties 7 and 8 are unchanged. After each outcome, the architect chooses the remedy from the check's readings.

**Rejected:**

- **Rerun `DRD-44` unchanged.** Unpinned readings fail placement every time, and the gauge test fails on the gauge.
- **Read E1 and E2 as the method outcome with the gauge test dropped.** The test would be chosen after the verdicts, and nothing would then rule out the clock.
- **Warm the gauge and rerun `DRD-44`.** A 20 ms arithmetic loop outside the window still can't see the clock during the window's short bursts of work, or contention for cache and memory. The clock is read inside the window instead.
- **A gauge-only check.** It would confirm the assessment's §4.1, and leave the machine-or-method question open.
- **Pin the check to the E-cores.** `taskset` put all of Chrome on 8 cores and widened the spread on every row. The instrument runs unpinned.
- **Add more events per reading now.** That is a remedy, and the window outcome leads to it.

**What this amends:**

- **`DRD-44`:** properties 4, 7 and 8, as its amendment note states.
- **The plan:** [`performance-plan.md`](../performance-plan.md) §2 P1b gets a sixth step.
- **`DRD-43`:** B3' and the in-page floors wait for this outcome.
- **`DRD-23`'s last bullet** doesn't apply, because no instrument changes. The repair in property 9 restores where entries apply, and its dry checks show that.

**Stopped on 2026-11-11 by `DRD-46`,** on the owner's direction, before any browser process: properties 3 to 8, the check. They are kept as written, with the handoff and its return, and resume only on the owner's direction. Properties 1, 2 and 9 stay in force.

**Amended on 2026-11-24 by the architect, property 9,** on the same failure reported as new by `DRD-71`'s implementer and its feature proof, and read at `2e2c80ca0`. The repair is still owed, and no identifier is minted for it: this property is its address. `--prove --dry` and `--floors --dry` stop at the first stale entry, _one forced layout per move_ and _100 µs of script per move_, with the same message as at `566ebfc65`.

- **Read one entry at a time, the same 10 of 23 are stale:** three of the nine `--prove` entries (_one forced layout per move_, _one O(n) walk per move_, _30 µs of script per move, in the page_), and the seven `--floors` entries at `MOVE_SITE`. The other 13 apply. On `main` the source changed at `0a28f909a` (#15), and `bench/compare.ts` didn't.
- **Added: each replacement names only what `move()` binds.** Every stale replacement ends with the stale call, which names `drag`, and _one forced layout per move_ also reads `drag.item` and `drag.y`. `move()` has no `drag` now. So a repair of the find texts alone would pass the dry checks and throw in the page, by reading: the bundle isn't type-checked. _No other entry changes_ means the 13.
- **Added: the proof.** The dry checks can't show that, so the three stale `--prove` entries also run with `--prove --only`, and each flags as it expects. This is a limited run, as `DRF-21`'s was. It doesn't resume the campaigns that `DRD-46` stopped.
- **The direction is already stated:** a find text without its indentation matches `drop()` too.
- **Why it keeps being reported:** nothing in `compare.ts` says that the entries are stale, and no check runs it. Nothing that a decision uses depends on it until a `--prove` or a `--floors`, and a `--before` run applies no injection.
- **Ready** for an implementer, with nothing for the owner to answer. It can go with any unit that edits `SortableOperation.move`. **Size:** _small_.
# Performance page check handoff

**For:** one `implementer` unit on `drag/performance-resolution`, in the worktree `.claude/worktrees/drag-performance-resolution`. **Base:** the commit that carries this handoff. Its `packages/drag/src` is `a9c323f6a`'s, and its `bench/` is `a7b3851c1`'s.

**Governing records:** `DRD-45`, and `DRD-44` as it amends, in [`00-index.md`](00-index.md). Also [`performance-sensitivity-assessment.md`](performance-sensitivity-assessment.md) §4 and §5. The previous unit is [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md). Its [report](performance-sensitivity-report.md) and its probe, [`2026-11-11-sensitivity-probe.ts.txt`](measurements/2026-11-11-sensitivity-probe.ts.txt), are this unit's starting point.

**Goal:** after this unit, the architect can read each in-page gate row as page, clock or window, by `DRD-45` property 7's table. The architect can also tell whether the gauge's slower first run is its own warm-up, by property 8.

## Boundaries

**Do not change:**

- any tracked file under `src/`, `tests/` or `bench/`. The probe is a scratch copy in a git-ignored directory, as the sensitivity probe was;
- any scenario's events, counts or waits, `openPage`'s page set-up, the recorder's existing fields, the gauge's loop, or `ITERATIONS_PER_US`;
- any recorded reading under `measurements/`.

**Do not run:**

- F1, F2, `--prove`, `--floors`, B3', any `compare.ts` comparison, or the `DRD-44` processes.
- Any injection: this check has none.
- Any synthetic load.

**The source is this branch's.** This unit doesn't read, merge or measure `drag/performance`. Its stale entries (`DRD-45` property 9) are another unit's work.

**Machine state, for every browser process:**

- **The hold.** The same as the last unit's: ask the owner's other sessions to hold builds, size runs, typechecks and test suites before the first browser process, and release them after the last one. Record the start and end times of the hold, and any heavy check that overlapped a process.
- **Nothing else** from this session runs during a browser process.
- **The machine record** at the head and foot of each raw file holds the sensitivity wrapper's fields. It also holds each CPU's `scaling_governor` and `energy_performance_preference` from `/sys/devices/system/cpu/cpu<N>/cpufreq/`.

## Items

### 1. The probe

**Required properties:** `DRD-45` properties 3 to 6 and 8, and these:

- **Selection:** a dry run launches no browser, lists the two rows, and exits 0.
- **The order:**
  - 10 pages of the move row, one after another, then 10 pages of the cycle row.
  - In each page, after set-up: g1 and g2 back to back. Then four times, the row's `run`. Its window keeps the sensitivity probe's gauges, b_k before it and a_k after it.
  - Between two runs in a page, `lab.destroy()`, and nothing else.
- **The clock:** at each placement sample, read `cpuinfo_avg_freq` of the CPU the main thread last ran on. Record each value and the CPU with the sample. Record each gauge's reads in the same way, with that gauge's own start and end.
- **Per-process output:**
  - one JSON file with every window's script, task and layout count per event, its `DRD-44` property 3 record, its clock reads and their mean, and every gauge with its clock reads;
  - one text file with the printed output.
- **Exit code:** 0 when every window ran with its row's layout count and every cycle ended.

### 2. Dry checks, with no timing reading

1. **The dry run,** with `CHROME_EXECUTABLE=/nonexistent/chrome`: both rows listed, exit 0.
2. **The clock self-check.** From Node, with no browser, read `cpuinfo_avg_freq` for CPUs 0 to 11, 50 times at 20 ms. **Required:** at least 90 % of reads succeed on every CPU. Save the output.
3. **The repeat self-check.** Launch one browser, open one page per row, and run that row's `run` twice with `lab.destroy()` between. **Required:** both windows have the row's layout count, 83 and 250. Save the output. It launches a browser, so it comes under the hold.

### 3. The check

One process, unpinned, through [`bench/campaign.ts`](../bench/campaign.ts) with `--out`. Name the raw files `2026-11-<day>-page-check.{json,txt}`. It should take about 9 minutes.

## Report

Write `performance-page-check-report.md` beside this file. Put every raw output, the probe's source as `.ts.txt`, the wrapper and any analysis script in `measurements/`, unedited. Keep a discarded run, with its reason.

**Per row:**

- every s(p, k), with its window's clock, its share of samples on CPUs 0 to 3, its wait, and its start time;
- W, B and ρ, by `DRD-45` property 7's definitions;
- W and B ÷ the row's median;
- each page's s(p, 1) ÷ the median of its windows 2 to 4;
- the median spacing, in seconds, of the pairs in W and in B.

**The gauge, over both rows:** g1, g2, and b_k and a_k for each window, per page, with their clocks. Then:

- the number of pages where g1 exceeds g2;
- the medians of g1 − g2, b1 − g2 and a1 − b1;
- Spearman's ρ between each gauge and its clock.

**Then** the hold's times, and every overlap. **Don't classify the outcome yourself.** Give the figures, and the architect applies `DRD-45` properties 7 and 8.

## Verification

Follow [`handoff.md`](../../../.agents/docs/handoff.md) for the Markdown. No TypeScript source is committed, so no lint or typecheck is owed. Record that.

| Check | Required result |
| --- | --- |
| `git diff --stat <this handoff's commit>..HEAD -- src tests bench` | Empty |
| Item 2 | As each check states |
| Item 3 | One process, exit 0 |

## Return to the architect

Stop and return if:

- a dry check fails;
- a repeated `run` gives another layout count, or can't run again after `lab.destroy()`;
- a window has fewer than half its clock reads;
- the recorder can't identify the page's renderer main thread;
- the probe needs a change to a tracked file;
- the hold can't be arranged. Don't run the check without it.

**Not a return, and reported:** any W, B or ρ, and a heavy check from a session outside the owner's control that overlapped the process.

## After this unit

The architect applies `DRD-45` property 7 to each row:

- **Page or window:** a method decision, which `DRD-43` deferred, made from these readings.
- **Clock:** an admission condition, then F1, F2, `--prove` and B3' under it. Any campaign on `566ebfc65`'s source waits for the repair of `DRD-45` property 9.
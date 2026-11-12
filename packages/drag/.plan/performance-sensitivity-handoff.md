# Performance sensitivity handoff

**For:** one `implementer` unit on `drag/performance-resolution`, in the worktree `.claude/worktrees/drag-performance-resolution`. **Base:** the commit that carries this handoff. Its `packages/drag/src` is `a9c323f6a`'s, and its `bench/` is `a7b3851c1`'s.

**Governing records:** `DRD-44`, `DRD-43`, `DRD-40` and `DRD-23`'s last bullet in [`00-index.md`](00-index.md), and [`performance-resolution-assessment.md`](performance-resolution-assessment.md) §4. The previous unit is [`performance-resolution-handoff.md`](performance-resolution-handoff.md), and its [report](performance-resolution-report.md) holds the readings this unit starts from.

**Goal:** after this unit, the architect can tell whether the in-page gates failed because of the machine or because of the method, by `DRD-44` property 8's table, from readings that record their own run-queue wait, core class and speed.

## Boundaries

**Do not change:**

- any tracked file under `src/`, `tests/` or `bench/`. The probe is a scratch copy, in a git-ignored directory, as the [scale probe](measurements/2026-11-11-resolution-attribute-scale-probe.ts.txt) was;
- `judge`, its rules, the rounds, any scenario's events, counts or waits, any injection, any floor entry, or `ITERATIONS_PER_US`;
- any recorded reading under `measurements/`.

**Do not run** F1, F2, `--prove`, `--floors`, B3' or any `compare.ts` comparison. Add no synthetic load.

**The source is this branch's.** The alias cleanup on `drag/performance` makes 10 of the 23 entries stale there. This unit doesn't read, merge or measure that branch.

**Machine state, for every browser process:**

- Ask the owner's other sessions to hold builds, size runs, typechecks and test suites before the first browser process, and release them after the last one. Ask through the owner, or directly if the sessions can message each other. Record the hold's start and end times, and any heavy check that overlapped a process.
- Nothing else from this session runs during a browser process.
- The machine record at the head and foot of each raw file holds `nproc`, `node --version`, `uptime`, the CPU model from `lscpu`, and `/sys/devices/cpu_core/cpus` and `/sys/devices/cpu_atom/cpus` (`DRD-44`'s amendment of `DRD-40` property 4). It also holds `git status --porcelain`, so that a `dirty: true` in the campaign status has its cause in the record.

## Items

### 1. The probe

**Required properties:** `DRD-44` properties 1 to 4, and these:

- **Selection.** `--dry` applies the two injections, launches no browser, and exits 0. It fails as `--prove --dry` fails when an injection doesn't apply.
- **Per-process output.** One JSON file with every reading, its record and the verdicts, and one text file with the printed output. The JSON keeps the probe's readings in the shape `compare.ts` writes, with the record beside each reading, so that `--rejudge` can read the readings.
- **Exit code.** 0 when every row ran and every cycle ended, whatever the verdicts. A gate that doesn't flag is a reading here, not a failure.
- **The recorder's output, per reading:** the window's start and end times, the renderer's pid and how many renderers existed, the main thread's on-CPU ms and run-queue wait ms, the number of placement samples and the share on CPUs 0 to 3, the CPU pressure delta in µs, the one-minute load at the start, and the gauge before and after in ms.

The gauge is 1,200,000 iterations of the floor entries' loop body, which is 20 ms at 60 per µs. Its duration comes from `performance.now()` in the page. That clock can be coarsened to 100 µs, which is 0.5 % of 20 ms.

### 2. Dry checks, with no timing reading

1. `--dry`, with `CHROME_EXECUTABLE=/nonexistent/chrome`: both injections apply, exit 0.
2. **Recorder self-check.** Launch one browser, open one page, and run a fixed loop of 300 ms nominal in it while recording, once unpinned and once under `taskset -c 4-11`. **Required:** the identified main thread has at least 200 ms of on-CPU time in each. Under `taskset` every placement sample is in 4 to 11. Save the output. This launches a browser briefly, so it comes under the hold too.
3. The core sets read `0-3` and `4-11`.

### 3. The experiment

Four steps of one campaign through [`bench/campaign.ts`](../bench/campaign.ts), in this order, each a new process with `--out`:

| Step | Condition | Command shape                  |
| ---- | --------- | ------------------------------ |
| U1   | Unpinned  | `node <probe>`                 |
| E1   | E-cores   | `taskset -c 4-11 node <probe>` |
| U2   | Unpinned  | As U1                          |
| E2   | E-cores   | As E1                          |

Name the raw files `2026-11-<day>-sensitivity-<step>.{json,txt}`. Each process runs about 10 minutes.

## Report

Write `performance-sensitivity-report.md` beside this file. Put every raw output, the probe's source as `.ts.txt`, and the wrapper in `measurements/`, unedited. A discarded run is kept with its reason.

**Per process and row:**

- production's median script per event, and the base arm's median;
- per round, each arm's script, the difference and the A/A difference;
- the verdict, with its sign count, median and bound;
- the bound ÷ the base arm's median;
- the number of settled rounds by `DRD-44` property 7, and for each unsettled reading, which criterion it failed.

**Per reading:** every recorder field, the reading's script and task per event, and whether it is settled.

**Per row and condition, over the two processes of that condition:** the median absolute A/A difference over settled rounds and over unsettled rounds.

**Then,** the hold's times, and every overlap. **Don't classify the outcome yourself.** Give the figures, and the architect applies `DRD-44` property 8.

## Verification

Follow [`handoff.md`](../../../.agents/docs/handoff.md) for the Markdown. No TypeScript source is committed, so no lint or typecheck is owed. Record that.

| Check | Required result |
| --- | --- |
| `git diff --stat <this handoff's commit>..HEAD -- src tests bench` | Empty |
| Item 2 | As each check states |
| Item 3 | Four processes, each exit 0 |

## Return to the architect

Stop and return if:

- a dry check fails, or the core sets aren't `0-3` and `4-11`;
- the recorder can't identify the page's renderer main thread, or `schedstat` or `/proc/pressure/cpu` can't be read;
- a cycle doesn't end, or the probe needs a change to a tracked file;
- the hold can't be arranged. Don't run the experiment without it.

**Not a return, and reported:** any verdict, any settled-round count, and a heavy check from a session outside the owner's control that overlapped a process.

## After this unit

The architect applies `DRD-44` property 8 to each gate row. A machine outcome leads to a decision on the launch and admission condition, and then to F1, F2, `--prove` and B3' under it. A method outcome leads to the decision `DRD-43` deferred. If neither result is shown, the experiment runs once more in a window the owner provides.
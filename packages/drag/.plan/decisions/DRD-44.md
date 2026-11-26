#### DRD-44 — One experiment separates the machine from the method before the in-page rows' resolution changes

**Status:** active, decided on 2026-11-11 by the architect on the resolution report at `39c8b432c` ([assessment](../performance-resolution-assessment.md) §4). Amends `DRD-43`'s sequence, `DRD-40` property 4's machine record, and [`performance-plan.md`](../performance-plan.md) §2 P1b. Run at `24cdadc48` from [`performance-sensitivity-handoff.md`](../performance-sensitivity-handoff.md). Read by the architect ([assessment](../performance-sensitivity-assessment.md) §3): not resolved on both gate rows, final. `DRD-45` withdraws its gauge test and its rerun

**The in-page gates' failure is attributed by one experiment before anything else changes. The experiment runs the two in-page gate injections and the CDP 20-item move row's A/A, unchanged, in four processes: unpinned, pinned to the E-cores, unpinned, pinned. Each reading records its main thread's run-queue wait, the core class it ran on, and a speed gauge. The outcome table below, fixed before the run, decides what changes next. Until then, F1, F2, `--prove` and B3' aren't repeated, and `judge`, the rounds, events per reading, every row, every injection and the launch are unchanged.**

Decided on 2026-11-11 by the architect, on [`performance-resolution-report.md`](../performance-resolution-report.md) at `39c8b432c` ([assessment](../performance-resolution-assessment.md) §4).

**Why:**

- **The recorded noise moved with the machine.** The CDP move row at 20 items had script A/A bounds of 20 to 36 µs per move in every run at a one-minute load of 3.8 or less. In this campaign's `--prove`, at 5.6 to 8.3, it was 143 µs. The in-page rows in the same pass were no noisier than their mirrors, at 0.63 to 0.93 of their median against 0.51 to 0.81. In round 6 every arm of 13 of the 15 timing rows read above 1.1 times its row's base median, and in rounds 1 to 5 no row did.
- **The machine has 4 fast threads.** It is an i7-1255U: CPUs 0 to 3 are P-core threads at 4.7 GHz, and CPUs 4 to 11 are E-cores at 3.5 GHz. Every earlier timing run had a load below 4, and this campaign had 4.0 to 9.5. So a reading can run partly on a slower core, or wait for one, by an amount that changes with the load. This is inferred, not observed.
- **The record can't separate that from the method.** The gates' bounds come from differences between pages a few seconds apart, not from the disturbed round. A reading has no time stamp and no record of where it ran. A new page per arm and `judge`'s largest-difference bound could give the same spread on a quiet machine.
- **Each outcome leads to a different change.** A machine limit is removed by a launch condition, and the instrument stays. A method limit needs the remedies `DRD-43` deferred. Choosing either without the attribution would change the instrument on a guess.

**Required properties:**

1. **A probe, not an instrument change.** It is a scratch copy of `bench/compare.ts` at this decision's base, with its main block replaced and a recorder added, as the scale probe was. It uses the unchanged scenarios, `judge`, `openPage`, and the injections "30 µs of script per move, in the page" and "300 µs of script per cycle, in the page". Its source is saved under `measurements/` as text. No tracked file under `bench/`, `src/` or `tests/` changes.
2. **Rows and arms.** Per process, as `--prove` runs them, at 7 rounds each: the 30 µs gate on "in the page: 300 moves, one frame each, 20 items", the 300 µs gate on "in the page: 50 activate-and-drop cycles, 20 items, no landing", each with arms injected, base and injected control, and then the A/A of "300 moves, one frame each, 20 items" with three production arms. Verdicts come from the unchanged `judge` against `base`.
3. **The recorder.** For each reading it records the wall-clock start and end of the window, and the main thread of the renderer process that hosts the page. For that thread it records on-CPU time and run-queue wait over the window, from `schedstat`, and the CPU it last ran on, sampled every 20 ms. When several renderers exist, the page's renderer is the one whose main thread has the most on-CPU time in the window. The recorder also takes the system's CPU pressure, the `some` total of `/proc/pressure/cpu`, over the window, and the one-minute load at its start. It reads `/proc` from Node only, and adds no CDP command and no page evaluation inside the window.
4. **The speed gauge.** Fixed work of the floor entries' loop body, 20 ms nominal at `ITERATIONS_PER_US`, run by its own page evaluation just before and just after the window, outside it. Its duration is measured in the page.
5. **Conditions, in this order, as four steps of one campaign:** U1, E1, U2, E2. U starts the probe as every run so far, and E starts the whole probe, and so Chrome, under `taskset -c 4-11`. The core sets are checked first from `/sys/devices/cpu_core/cpus` and `/sys/devices/cpu_atom/cpus`. No synthetic load is added.
6. **No heavy check from the owner's sessions overlaps a process.** That covers builds, size runs, typechecks and test suites. The unit asks those sessions to hold before the first browser process and releases them after the last one, and records both times. Other load is recorded, not controlled.
7. **Settled, fixed before running.** A reading is settled when three things hold: its main thread's run-queue wait is at most 5 % of its on-CPU time plus wait, at least 90 % of its placement samples are in one core class, and both gauges are within 10 % of the process's median gauge. A round of a row is settled when every arm's reading in it is settled. These thresholds are below the gates' size: 30 µs is 25 % of the move row's 119 µs, and 300 µs is 19 % of the cycle row's 1,582 µs.
8. **The outcome, read per gate row, by the architect.**

   | Outcome | Condition | What follows |
   | --- | --- | --- |
   | **Machine** | The gate flags in every process where its row has at least 6 settled rounds, and at least one such process exists. In every process where it fails, its row has at least 2 unsettled rounds | A decision on the launch and admission condition for timing runs: the core set, and a settled-round or quiet-window rule. Then F1, F2, `--prove` and B3' under that condition. The reason readings were unsettled decides the condition. If it was placement, the condition is pinning. If it was run-queue wait in both conditions, it is admission |
   | **Method** | The gate fails in a process where its row has at least 6 settled rounds | The decision `DRD-43` deferred, on events per reading or `judge`'s bound, from that process's readings |
   | **Not resolved** | No process has 6 settled rounds on the row | Nothing changes. The experiment runs once more in a window the owner provides |

   The CDP row's bound ÷ median in each process is reported beside the table. A settled process whose CDP row reads above B1 to B3's 0.12 to 0.21 is quieter by the recorder than by its readings, and that is reported as a limit of the recorder.

9. **What it doesn't decide.** It measures no floor, and `DRD-43` property 7 is unchanged. The probe's readings aren't a baseline.

**Rejected:**

- **Repeat F1, F2 and `--prove` at a lower load.** The load isn't under control, and a pass or a fail would not show the mechanism or the launch condition that keeps it out.
- **Change `judge`'s bound or events per reading now.** That would change the method before the readings show that the method is the limit. `DRD-43` deferred both for this reason.
- **Pin every timing run to a core set now.** Placement is inferred from the load and the topology, and nothing has shown it.
- **Add a synthetic load.** It slows the other sessions on a shared machine, and the ambient load already varies. The recorder measures it in each reading.
- **A warm pass inside the page now.** It is a method change. If the method outcome follows, it is a candidate there.
- **Pin to the P-core threads.** With a load above 4 they are the most contended CPUs, and two pairs of them share a core.

**What this amends:** `DRD-43`: B3' and the in-page floors wait for this outcome. [`performance-plan.md`](../performance-plan.md) §2 P1b gets a fifth step. `DRD-40` property 4: from this decision on, every browser run's machine record also names the CPU model and its core sets. `DRD-23`'s last bullet doesn't apply, because no instrument changes.

**Amended on 2026-11-11 by `DRD-45`:**

- Property 4's gauge and property 7's third test no longer decide whether a reading is settled. The settled flags in the experiment's files stay as recorded.
- Property 8's "not resolved" row no longer leads to a rerun. `DRD-45`'s check replaces it.
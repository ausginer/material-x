# Runtime performance plan

**Opened:** 2026-11-10 on `drag/performance` from `a9c323f6a`, the squash merge of #14. **Governing decision:** `DRD-40` in [`00-index.md`](00-index.md), with `DRD-13`, `DRD-22`, `DRD-23` and `DRO-4`. **First unit:** [`performance-instrument-handoff.md`](performance-instrument-handoff.md).

**Goal:** make `@ydinjs/drag` faster at runtime, then smaller. Each change is shown by a reading that could have shown the opposite. Runtime wins over bytes by CONTRIBUTING §0 and §14. The contract's invariants and the ownership decisions hold through every step (`DRD-40` property 7).

## 1. The instruments and what each can show

| Instrument | What it measures | How it decides | State at `a9c323f6a` |
| --- | --- | --- | --- |
| `bench/compare.ts`, timing rows | Script and task time, and layout count, per cycle, move, press or key. Chromium only, one browser process, arms interleaved, a new page per run | `judge`: paired differences within rounds, a sign in 6 of 7 rounds and a median beyond the largest A/A difference. Layouts are exact | The last `--prove` ran at `b91db2818`. All six injections are stale (`DRF-7`). **Detection floor unknown** below the injected 1 ms per cycle and about 900 µs per move |
| `compare.ts`, bytes rows | Sampled bytes per move by function, interval 64 B | A kernel function at 16 B per move or more flags | Selects the kernel by function name (`DRF-1`) |
| `compare.ts`, retained row | Retained JavaScript objects after 200 operations and destruction | Paired, 3 of 3 rounds, beyond the A/A bound (0 B at `b91db2818`) | Its injection is stale (`DRF-7`) |
| `tests/hot-path.browser.test.ts`, kernel per-sample test | Sampled kernel bytes per move over 300 moves, interval 64 B | `kernelPerMove < 16` | Selects by location. **Fails in some runs on accepted source:** 6 of 11 runs launched alone with `-t` failed, at 13.33 to 17.49 B ([`instrument-repair-report.md`](instrument-repair-report.md) §Item 1). Every recorded whole-file and suite run passed. M1 and M2 were never run against it |
| `hot-path`, `DRF-2` test | The lift's sampled bytes per move, interval 16 B | `< 153` B per move | Proven at `8c5ace665` with a 54 B object |
| `hot-path`, census tests | Layout reads per sample, spatial searches per frame, consumer callbacks per sample | Exact counts | Pass |
| `bench/size/measure.ts` and `size.node.test.ts` | Minified and Brotli bytes per composition, and module graphs | Ceilings and `absent` lists | Six rows red with unchanged budgets (`DRO-4`) |

**Why the floor matters.** At `b91db2818` production's script time was about 192 µs per move and 2.5 ms per cycle at 20 items, against A/A bounds of 44 µs and 387 µs ([`2026-11-07-compare.json`](measurements/2026-11-07-compare.json)). Task time's bounds were 0.7 ms per move and 2.6 ms per cycle. A 10 % saving in script time is inside both script bounds. Until the floor is measured, a "no difference shown" says nothing about an optimization.

**After P1, at `c279973a3`** ([assessment](performance-instrument-assessment.md) §4). Layout counts are exact. The bytes row flags one two-number object per sample, and the retained row flags one per operation. The kernel per-sample test fails alone and passes after other tests, and `DRD-42` repairs it. **No timing row resolves an optimization.** The 20-item move row flagged 50 µs measured and missed 147 µs and 5 µs, with A/A bounds of 20 to 221 µs per move. The 20-item cycle row missed 411 µs, with bounds of 334 to 3,283 µs per cycle. `DRD-43` adds rows driven from inside the page (P1b).

## 2. Phases

### P1. Instruments, then the baseline

One implementer unit: [`performance-instrument-handoff.md`](performance-instrument-handoff.md).

1. `DRF-7`: every injection applies to the current source, and a dry check proves it with no browser.
2. `DRF-1`: the bytes rule selects the kernel by module location.
3. A graded series of injected regressions gives each judged row type its detection floor. The series is recorded and doesn't gate.
4. `--prove`: every injection expected to flag flags, the step-list injection stays quiet, and the A/A pass is quiet. **Amended on 2026-11-10 by `DRD-41`:** it said "every gate injection flags". At the current source the step list allocates nothing per entry, so that injection shows that the bytes rule doesn't flag kernel work with no allocation.
5. The kernel per-sample test is run in four launch contexts, with M1 and M2, to find what its result depends on. Nothing in the test changes in this unit.
6. The baseline: two full comparisons at the unit's last commit against drag2 and the prototype, one `--before` A/A run of the baseline commit against itself, and the size table.

### P2. The architect reads P1

- **The kernel per-sample test.** The architect decides its repair from item 5's evidence, as a decision in the register. Possible outcomes include a warm-up before sampling, a different launch for the test, or a finding about the threshold for the owner. None is chosen before the evidence.
- **The detection floors.** If a floor is coarser than the effects worth pursuing, the architect decides how to raise the resolution before any optimization. Examples: more rounds, more events per reading, or an in-page row that dispatches events without CDP input. A change to `judge` or to a scenario is a decision (`DRD-40` property 3).
- **`DRO-4`.** The baseline's timing against drag2 and the prototype goes to the owner, with each slower row and the profile that attributes it.

**Decided on 2026-11-11** ([assessment](performance-instrument-assessment.md)): the per-sample test gets one unsampled pass of its own loop before sampling (`DRD-42`). The timing floors are too coarse, and P1b raises the resolution on the move path and the cycle (`DRD-43`). `DRO-4` holds the baseline's reading for the owner. The retained row's attribution is in P1b.

### P1b. Resolution

One implementer unit: [`performance-resolution-handoff.md`](performance-resolution-handoff.md).

1. `DRD-42`: the per-sample test's warm pass, with M1, M2 and M3 failing under it.
2. `DRD-43`: rows driven from inside the page for 300 moves at 20 and 2,000 items and for 50 cycles at 20 items, a row that measures the driver alone, two gate injections, and graded entries measured in two runs.
3. The retained row's attribution, for `DRO-4`.
4. `--prove`, and a `--before a9c323f6a` A/A run that gives the new rows their baseline. B1, B2, the CDP floors and the size table aren't repeated.

The architect then reads each new row's floor against `DRD-43` property 7.

### P3. Optimization units

**Entry condition** (`DRD-43` property 8): a unit starts only on a row whose floor is stable and at most 10 % of the library's share of that row's script. Until a row meets it, no optimization unit starts.

Each unit is one bounded change, chosen from the baseline's attribution (`compare.ts --profile --only <row>`) and not from reading alone. Each unit:

- states the row it expects to move and the floor of that row;
- measures with `compare.ts --before <baseline commit>`, all rows that the change can reach, and reports each verdict with its sign count, median and A/A bound;
- runs the three-engine suite, the per-sample tests and the size table;
- reports a size change with its timing rows, and a timing change with its size rows.

A unit whose target row shows no difference doesn't land as an optimization. The owner decides whether it lands for another reason.

### P4. Size pass

After the runtime units, under CONTRIBUTING Part II: delete machinery before compressing syntax (§16), and measure each change by composition (§15). Any byte saving that adds work on a hot path goes to the owner (§0). `DRO-4`'s re-base is the owner's decision, and it is made against the figures the owner accepts.

## 3. Rules every unit follows

`DRD-40`'s properties, in short:

- **Raw readings are kept** under `measurements/`, unedited, with the commit, Chrome and Node versions, the CPU count, and the load average before and after. A discarded run is kept with its reason.
- **No threshold, rule, scenario or budget moves with a reading.** A change is a decision first, which names its reading.
- **An instrument change is shown by an injection it catches** (`DRD-23`), and the floors are measured again after it.
- **Nothing else runs on the machine from the same session** during a timing run. Other sessions can't be controlled, so the load average is the record of them.
- **A long sequence of runs goes through [`bench/campaign.ts`](../bench/campaign.ts).** It runs the commands in order, stops at the first failure, and records each command's revision, process, times, exit code and log in `.campaigns/<id>/status.json`. `campaign.ts status` reports each run as running, succeeded, failed or interrupted from that file and `/proc`, not from a log. It writes nothing while a step runs. It changes no scenario, rule or threshold. Report: [`campaign-runner-report.md`](campaign-runner-report.md).

## 4. Open items this plan doesn't decide

- `DRO-4`'s size re-base and the six red rows. The owner's.
- Decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2: `DRO-10`'s excess and the costs no approval covers. The record holds no answer.
- `DRO-3`, real touch and pen devices, before release.
- The optional findings `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17` and `DRF-18`. An optimization unit that touches one of their sites may repair it, if the handoff says so.
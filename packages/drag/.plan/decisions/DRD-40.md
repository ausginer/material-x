#### DRD-40 — The performance phase measures before it optimizes, and a reading decides each change

**Status:** active, decided on 2026-11-10 by the architect on the owner's request to open the runtime-performance phase. Ends `DRO-4`'s timing deferral. Applied by [`performance-plan.md`](../performance-plan.md). Its first unit is [`performance-instrument-handoff.md`](../performance-instrument-handoff.md). That unit returned at `b8f1d1b35`, and `DRD-41` decides the return. It completed P1 at `c279973a3`, and the baseline of `a9c323f6a` is recorded. `DRD-42` and `DRD-43` decide P2. Its properties 2 and 5 apply to the in-page rows. `DRD-46` amends both: a selected candidate is confirmed by a "faster" verdict with no floor, and P3 no longer waits for `DRD-43` property 7. `DRD-44` adds the CPU model and core sets to property 4's machine record. The owner closed P3, the runtime pass, on 2026-11-12, with no budget change ([plan](../performance-plan.md) §2 P3)

**No production change is made for speed or size before the instruments are repaired and proven and a baseline is recorded. After that, each change is accepted on a same-session reading against the baseline commit. Runtime comes first and bundle size second.** [`performance-plan.md`](../performance-plan.md) applies this decision.

Decided on 2026-11-10 by the architect, on the owner's request to open the runtime-performance phase on `drag/performance` from `a9c323f6a`.

**Why:**

- **The instruments can't show a result today.** `DRF-1` and `DRF-7` are open, the last `--prove` run was at `b91db2818`, and the kernel's per-sample test passes or fails by how it is launched ([`instrument-repair-report.md`](../instrument-repair-report.md) §Item 1). An optimization measured with them could not be told apart from noise or from a broken selection.
- **The detection floor is not known at the size of a likely optimization.** At `b91db2818` production's script time was about 192 µs per move and 2.5 ms per cycle at 20 items, against A/A bounds of 44 µs and 387 µs ([`2026-11-07-compare.json`](../measurements/2026-11-07-compare.json)). The proof injected 1 ms per cycle and about 900 µs per move. A 10 % saving is below both bounds, so the floor must be measured before a "no difference shown" or a "faster" can be read.
- **`DRD-13` and `DRD-22` already require same-session, paired readings with a noise control.** This decision applies them to optimization, where the "before" arm is the baseline commit and not drag2.

**Required properties:**

1. **Order.** The instrument unit ([`performance-instrument-handoff.md`](../performance-instrument-handoff.md)) comes first, then the baseline, then optimization units. Each optimization unit is one bounded change with its own reading.
2. **A result is a verdict of the unchanged `judge`.** It compares the candidate with the baseline through `compare.ts --before <baseline commit>` in one browser process, with the A/A control. "No difference shown" is not a result in either direction. A row's verdict is read against that row's measured detection floor.
3. **Thresholds, rules and budgets don't move with a reading.** This covers the per-sample test's `< 16`, the bytes rule's 16 B per function, `judge`'s sign counts and A/A bounds, every size ceiling and control figure, and the instrument's scenarios. A change to any of them is a decision in this register that names the reading it rests on, made before the change lands. `DRO-4` holds the size re-base, and the owner decides it.
4. **Raw readings are kept.** Every run whose figures a report uses is saved unedited under `measurements/`, with the commit, the Chrome and Node versions, the CPU count and the load average before and after. A discarded run is kept and labeled with the reason.
5. **Sensitivity is demonstrated, not assumed.** Each judged row type has a detection floor from graded injected regressions, recorded with the instrument that measured it. The floor is measured again when the instrument, the judge or the machine changes. `DRD-23`'s rule for an instrument repair still applies.
6. **Runtime first.** A size change that costs runtime on a hot path, as CONTRIBUTING §0 and §14 define it, is reported to the owner and not taken by default. A size change is measured with `bench/size/measure.ts` and with the timing rows it could affect.
7. **Correctness and ownership hold.** An optimization keeps the contract's invariants and the ownership decisions (`DRD-24`, `DRD-26`, `DRD-27`, `DRD-33`): what the kernel, a behavior, its operation and the lift each own doesn't move. A change that needs to move one is a decision first. The three-engine suite passes with only the known failures.

**What this amends:** `DRO-4`'s timing deferral ends, because the owner asked for timing. `DRD-23`'s instrument rule is unchanged and applies to every instrument change in the phase.

**Amended on 2026-11-11 by `DRD-46`:**

- Property 2's last sentence applies to a row that has a measured floor. A candidate under `DRD-46` is confirmed by a verdict of "faster" beyond the A/A bound, with no floor.
- Property 5 no longer comes before an optimization unit. A floor is measured when a reading needs one: for an instrument change, or when the architect has to read a "no difference shown" on a selected candidate.
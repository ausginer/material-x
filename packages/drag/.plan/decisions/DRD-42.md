#### DRD-42 — The kernel per-sample test samples after one unsampled pass of its own loop

**Status:** active, decided on 2026-11-11 by the architect on the per-sample readings at `c279973a3`. Decides [`performance-plan.md`](../performance-plan.md) §2 P2's first bullet. Implemented at `a600abc51` from [`performance-resolution-handoff.md`](../performance-resolution-handoff.md) item 1, and reported at `39c8b432c`. Read by the architect ([assessment](../performance-resolution-assessment.md) §3): conforms. Its second withdrawal doesn't apply to M4's form at Chrome 157, which the warm test catches

**`hot-path` › "should allocate per sample only the CSS string a lifted write needs" runs its 300-move loop once without sampling, waits for frames, and then samples the same loop. Its `< 16`, its 64 B interval and its 300 sampled moves are unchanged. The test bounds what the kernel allocates per sample once its code is warm. The repair is accepted only if M1, M2 and M3 fail with the same warm pass in place.**

Decided on 2026-11-11 by the architect, on [`performance-instrument-report.md`](../performance-instrument-report.md) §4 at `c279973a3` ([assessment](../performance-instrument-assessment.md) §3).

**Why:**

- **The result depends on what ran before the test.** Launched alone, the kernel reads 14.96 to 18.47 B per move and fails in 8 of 10 runs. After the five earlier tests of its file, or in the Chromium suite, it reads 0 in 15 of 15 runs, with no kernel key. One unsampled pass of the same loop brings the alone figure to 0.28 to 1.31 in 10 of 10 runs, with only `kernel/session.ts:handleEvent` left.
- **The alone figure is spread over every kernel function on the path,** 0.3 to 6.3 B per move each, in `handleEvent`, `#move`, `enter`, `#applyRequests` and both `requestStep` methods. No single function holds an object per sample. That is the pattern of code that hasn't reached its optimized tier and allocates small values as it runs (H1). No optimization trace was taken, so this cause is inferred and not observed. One 64 B sample is 0.21 B per move, so granularity (H2) can't explain a level of 15 to 18 B.
- **The test's claim is about the library's allocation.** What the code allocates before it is optimized depends on V8's tiering, which can change with a Chrome version and with what ran earlier. A test that measures it is order-dependent: a `-t` run and a whole-file run disagree on the same source.
- **Warm code still shows an allocation that escapes.** M1, M2 and M3 store into a module-level variable. In the file context, where the code is already warm, they failed in every run: 41.68 to 101.71 B per move, and 51.85 to 53.97 for M3, the smallest object. That is evidence for the warm pass, not proof of it. Property 4 is the proof.

**Required properties:**

1. Before sampling starts, the test runs the same 300-move loop, at the same positions and in the same operation, without sampling. It then waits for frames as it does before sampling now. Nothing else in the test changes, and the `DRF-2` test doesn't change.
2. `< 16`, the 64 B interval, the 300 sampled moves, the kernel selection by location and the lift assertion are unchanged.
3. The comment says that the first pass lets the kernel's code reach its optimized form, that the test bounds the warm figure, and that an allocation that escapes, such as an object per sample, shows as tens of bytes. It no longer says that a few bytes per move remain from reading an event field: warm, the figure is 0 to 1.31.
4. **Sensitivity under the same warm pass.** With the warm pass in place, M1, M2 and M3 of the [report](../performance-instrument-report.md) §4, at the same sites, each fail in every run, launched alone and launched as its file. M3, one object with two number properties per sample, is the smallest that must fail.
5. Launched alone, the unmutated test passes in every run.

**What it withdraws, stated completely:** the test no longer bounds what the kernel allocates before its code is optimized: 15 to 18.5 B per move over the first 300 moves of a page, about 4.5 to 5.5 KB once. It also doesn't bound an allocation that the optimizing compiler removes because the value doesn't escape. The handoff's M4 records whether such an allocation shows. The file and suite runs were already warm, so neither was bounded there before this decision.

**Rejected:**

- **Raise `< 16`.** Alone the figure reaches 18.47, so a limit that passes needs about 24. That limit would follow V8's tiering, not the library, and the reading shows that the level comes from the launch context.
- **Run the test only as part of its file.** Its verdict would still depend on the tests before it, and a `-t` run is a normal way to run one test.
- **Sample more moves to dilute the first ones.** The figure would still depend on when the code is optimized, and each run would take longer.

**What this amends:** [`performance-plan.md`](../performance-plan.md) §2 P2, first bullet, which it decides. The test's setup is an instrument scenario under `DRD-40` property 3, so this decision comes before the change, and names the reading.
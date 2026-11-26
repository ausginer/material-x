#### DRD-46 — Short scenario traces choose the optimization candidates, and a focused paired measurement confirms the one selected

**Status:** active, decided on 2026-11-11 by the architect on the owner's direction. Stops `DRD-45` properties 3 to 8, supersedes `DRD-43` property 8, and amends `DRD-40` properties 2 and 5 and [`performance-plan.md`](../performance-plan.md) §2. [`performance-trace-handoff.md`](../performance-trace-handoff.md) recorded the first traces at `743921de0` and `e92e21eed` ([report](../performance-trace-report.md)). Read by the architect ([assessment](../performance-trace-assessment.md)): accepted. `DRD-47` selects the first candidate under property 8

**`DRD-45`'s check is stopped before it ran, and kept for possible later use. The phase now records short, inspectable Chrome traces of named scenarios, with each scenario's set-up outside the traced interaction, and names optimization candidates from them. The first scenarios are `sortable` moves that reorder, at 20 and 2,000 items, and the press and release below the threshold at 2,000 items. The trace unit changes no production source. An optimization unit starts on one candidate that the architect selects from the trace report, and a focused paired measurement of the scenario it targets confirms it. No row has to meet `DRD-43` property 7 first.**

Decided on 2026-11-11 by the architect, on the owner's direction to stop the page check and redirect the performance work to short scenario traces. [`performance-trace-handoff.md`](../performance-trace-handoff.md) applies it.

**Why:**

- **The owner's direction.** The owner stopped `DRD-45`'s check, asked for short scenario traces starting with reordering moves and the 2,000-item press, and asked that a selected candidate be confirmed later by a focused paired measurement, not after the timing rows are shown to be sensitive in general.
- **General sensitivity hasn't converged, and one optimization doesn't need it.** P1, P1b and `DRD-44` gave no row the floor that `DRD-43` property 7 asks for. At the quietest load on record the in-page gates' bounds were 0.14 to 0.39 of the base median ([assessment](../performance-sensitivity-assessment.md)). A candidate chosen from a trace comes with a scenario and an expected saving, so its measurement only has to see that one effect.
- **The existing attribution can't choose a candidate.** `compare.ts --profile` profiles a whole run, set-up included, and reports self time by function name only. It can't show which event, task or frame the time falls in, which layout a script forces, or how the consumer's and the harness's code compare with the library's. A trace shows all of these, and the owner can open it.
- **Both first scenarios are known costs.** The move rows' positions cross a row boundary about every 7 moves, so reorders are the move path's heaviest events. The press at 2,000 items with `[...root.children]` is the one timing row slower than drag2 in both B1 and B2, by 385 and 472 µs per press. That is `DRO-1`'s pull at a press. The cached-array row at 2,000 items separates the consumer's copy from the library's own work.

**Required properties:**

1. **The check is stopped and kept.** `DRD-45` properties 3 to 8 aren't run. [`performance-page-check-handoff.md`](../performance-page-check-handoff.md) and its return stay as written. If the owner resumes the check, the architect first decides the return's blocker, the cycle row's end check, and states the base the check then runs on. `DRD-45` properties 1, 2 and 9 stay in force: property 9's repair comes before any `--prove` or `--floors` on `566ebfc65`'s source or a descendant. A trace and a `--before` comparison apply no injection, so they don't wait for it.
2. **A trace attributes, and measures no difference.** Nothing in a trace report is a verdict, and no threshold, rule, scenario, row, injection or budget changes on one. Trace files that a report cites are kept as `DRD-40` property 4 keeps raw readings, with the machine record of `DRD-44`'s amendment. No hold is required.
3. **The traced code is the measured code.** The trace builds the production arm as `compare.ts` builds it: this branch's `bench/lab.ts`, `__DEV__` false, unminified, from `packages/drag/src` at a named revision. The first unit traces `566ebfc65`, the source after the alias cleanup, which the move path's modules changed. No existing row, injection, floor entry, lab file or mode of `compare.ts` changes.
4. **Set-up is outside the trace.** Tracing starts after the page is set up, the composition is mounted, any untraced warm pass has run and the page is idle. User-timing marks divide the traced interaction into its phases, and each input event can be found in the trace.
5. **The first scenarios.** Each is a short form of an existing `compare.ts` row, with that row's mount options, positions and waits, driven by CDP input as that row is:
   - **Reordering moves, 20 and 2,000 items:** the press and crossing, the move row's positions for i = 0 to 60 with one frame each, the release and the landing.
   - **Press and release below the threshold, 2,000 items:** with `[...root.children]` and with the cached array, and the cached array at 20 items as the reference.

   Each scenario has warm traces after one untraced pass of its interaction in the same page, and one cold trace of the page's first interaction.

6. **Inspectable.** Each trace opens in Chrome DevTools' Performance panel. For the page's main thread it holds the tasks, input dispatch, animation frames, JavaScript samples with stacks that name the bundle's functions and lines, style and layout with the script that forced them, paint, garbage collection and the user-timing marks. The bundle a trace ran is kept with it, so a sample's line resolves to its module.
7. **A candidate is a site with a cost and a mechanism.** The report names, for each candidate: the function and lines at the traced revision, the scenario and phase, how often it runs, its cost per event in the warm and cold traces, the avoidable work and why behavior doesn't change, the expected saving (marked estimated), the existing row that would confirm it, and every decision, invariant or owner decision it touches. A candidate that moves ownership, a contract invariant, or `DRO-1`'s pull is a decision first (`DRD-40` property 7). A cost the library can't change, the consumer's or the browser's, is reported but isn't a candidate.
8. **Confirmation is focused and paired.** The architect selects one candidate and records the selection. Its unit makes one bounded change, then runs `compare.ts --before <baseline revision> --only <rows>` in one browser process, with the unchanged `judge`, rounds and A/A control. The rows are the existing rows that the scenario mirrors, CDP and in the page where both exist, and any existing row on another path that the change reaches. The run is under `DRD-44` property 6's hold, with its machine record.
   - **Confirmed:** the target row's verdict is "faster" in script beyond the A/A bound, or, for a layout candidate, the layout count falls.
   - **Not confirmed:** "no difference shown" is no result. The architect decides what follows: the change doesn't land as an optimization, or one focused injection of the expected size at the candidate's site shows whether the row could see it, or a longer row is added, which is an instrument change and a decision first.
   - **Returned:** a "slower" verdict on any row.
   - The unit also runs the three-engine suite, the per-sample and census tests and the size table, as P3 states.
9. **What it doesn't change.** `judge`, its rounds, every row, injection and floor entry, and `DRD-40` properties 1, 3, 4, 6 and 7. The in-page rows stay as `DRD-43` properties 1 to 6 define them.

**Rejected:**

- **Resume the page check with a remedy for its return.** The owner stopped it. Its readings would decide a method change for every row, which this decision no longer needs before an optimization.
- **`compare.ts --profile` as the attribution.** See above. It stays for its own use.
- **Trace a whole 300-move or 100-press row.** Most of the trace would repeat one event, and the set-up would sit beside the interaction. A short form of the same row keeps the row's positions, so the row can confirm what the trace found.
- **In-page dispatch for the traces.** The in-page rows skip the browser's input path. A trace should show the input path a consumer gets.
- **Prototype candidates in this unit.** The owner asked for no production optimization yet. A saving is estimated from the trace and measured in the candidate's own unit.

**What this amends:**

- **`DRD-45`:** properties 3 to 8 are stopped, as its note states.
- **`DRD-43`:** property 8 is superseded, as its note states.
- **`DRD-40`:** properties 2 and 5, as its note states.
- **The plan:** [`performance-plan.md`](../performance-plan.md) §2 gets P1c, and P3's entry condition changes.
- **`DRD-23`'s last bullet** doesn't apply to the trace mode, because it produces no reading and changes no instrument. The handoff's dry checks show that the existing modes are unchanged.
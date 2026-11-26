#### DRD-43 — The timing rows can't resolve an optimization yet, and in-page rows on the move path and the cycle come first

**Status:** active, decided on 2026-11-11 by the architect on the floors and the baseline at `c279973a3`. Decides P2's second bullet, adds P1b, and sets P3's entry condition in [`performance-plan.md`](../performance-plan.md). Implemented at `a7b3851c1` from [`performance-resolution-handoff.md`](../performance-resolution-handoff.md) item 2, and reported at `39c8b432c`. Read by the architect ([assessment](../performance-resolution-assessment.md) §4): properties 1, 2, 4 and 5 hold, and property 3's path holds. Its gate injections don't flag, and no entry flags in F1 or F2, which isn't a stable floor under property 6. `DRD-44` decides the return, and its outcome is not resolved. B3' and the floors waited for `DRD-45`'s outcome, and aren't scheduled since `DRD-46` stopped its check. `DRD-46` supersedes property 8

**No optimization unit starts before a timing row it reads has a floor fine enough for its expected effect. The CDP timing rows stay as they are, for the before arms and `DRO-4`. Rows driven from inside the page are added for 300 moves and for 50 activate-and-drop cycles. They are measured and judged as every timing row is, and their floors are measured twice, in separate processes. `judge`, its rounds, and every existing row, injection and floor entry are unchanged.**

Decided on 2026-11-11 by the architect, on [`performance-instrument-report.md`](../performance-instrument-report.md) §3 and §5 at `c279973a3` ([assessment](../performance-instrument-assessment.md) §4).

**Why:**

- **No timing row resolves a likely optimization.** On "300 moves, one frame each, 20 items" the script A/A bound was 20 to 221 µs per move across seven runs, against production's 163 to 168 µs. The graded entries flagged at 50 µs measured, and missed at 147 µs and at 5 µs. On "50 activate-and-drop cycles, 20 items, no landing" the bound was 334 to 3,283 µs per cycle against 1,792 to 2,120 µs, and the entries missed at 411 µs and 207 µs. On the press and keyboard rows the bound alone was 42 to 624 µs and 101 to 351 µs. Task-time bounds were 151 µs to 31,745 µs.
- **Most of a move row's script isn't the library's.** Each move costs one CDP input command and one page evaluation that awaits a frame. The no-lift `draggable` row reads 102 to 115 µs per move and free drag 106 to 117 µs, against the sortable row's 163 to 168 µs. So `sortable`'s own share at 20 items is at most about 55 to 65 µs, by difference, and a 10 % saving of it is about 6 µs. That is below every floor the row showed. The share that the harness takes isn't measured; the new rows measure it.
- **One disturbed round sets a row's bound.** In the 100 µs per move entry, round 1's A/A difference was 221 µs and the other six were within 35 µs. Across B1's and B2's timing rows, the largest absolute A/A difference was 1.3 to 10.9 times the median one. That is a property of `judge`, which `DRD-40` property 2 keeps. Less noise in each reading lowers the bound with it, so the readings come first and `judge` second.
- **The other instruments are fine enough.** Layout counts are exact. The bytes row flags one two-number object per sample, 30 to 35 B per move over base in 3 of 3 rounds. The retained row flags one two-number object per operation, 5,012 B against a bound of 0 B. The per-sample tests are `DRD-42` and `DRF-2`.

**Required properties:**

1. **No CDP command per event in the timed window.** An in-page row's events are dispatched by one page evaluation, which awaits one animation frame per move as the CDP row's moves do. The positions are those of the CDP row it mirrors. A press and crossing before the window may use CDP input.
2. **The same measure and rule.** Script, task and layouts come from CDP's metrics before and after the window, per event. The rule is `exact-and-floor`, judged by the unchanged `judge` at the same rounds.
3. **The same path.** The events reach the library's listeners as real input does, with no change under `src/`. A gate injection at the CDP row's site flags on the in-page row, and every cycle ends.
4. **Arms built from this package's source only:** production, control, the `--before` arm and injected copies. The rows run under `--before`, `--prove` and `--floors`, are validation rows, and don't run with drag2 and the prototype.
5. **The harness's share is measured.** A report row dispatches the move row's events to a list with no behavior mounted.
6. **Floors, stated before running.** Graded entries of fixed work, at the gate injection's site. A row's floor in one run is the smallest entry that flags script slower, provided every larger entry flags in that run. The floor is stable when two runs in separate processes give the same entry.
7. **Sufficiency, stated before running.** A row is fine enough for an optimization unit when its floor is stable and the floor's measured median is at most 10 % of the library's share of the row's script: production's median per event minus the harness row's, for the move row, and production's median, for the cycle row.
8. **Optimization waits.** [`performance-plan.md`](../performance-plan.md) P3 starts only on a row that meets property 7. A unit states that row and its floor.

**Rejected or deferred:**

- **More rounds on the CDP rows.** The bound is the largest absolute A/A difference, which grows with the number of rounds.
- **More events per CDP reading.** The harness's share grows with the events, and each event costs a CDP round trip.
- **A change to `judge`'s bound now.** Deferred. If the in-page floors aren't stable between two runs, their readings decide it, as a decision first.
- **An in-page clock.** `performance.now()` can be coarsened to 100 µs in a page that isn't cross-origin isolated, and a second measure would need rules of its own.
- **Repeating B1 and B2.** The CDP rows are unchanged, so B1 and B2 remain their baseline.

**What this amends:** [`performance-plan.md`](../performance-plan.md) §2: it decides P2's second bullet, adds P1b and sets P3's entry condition. `DRD-40` property 5 applies to the new rows, and `DRD-23`'s last bullet to the instrument change.

**Amended on 2026-11-11 by `DRD-46`:** property 8 is superseded. An optimization unit starts on a candidate the architect selects from a trace report, and no row has to meet property 7 first. Properties 1 to 6 still define the in-page rows, and property 7 still says when a row's floor is fine for an effect of a given size.
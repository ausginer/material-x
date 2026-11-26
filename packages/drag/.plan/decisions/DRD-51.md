#### DRD-51 — The size pass removes what the gate rejects first, and the owner decides each item that moves a decision, a boundary or hot-path work

**Status:** active, decided on 2026-11-12 by the architect on the owner's request to open P4, from [`size-pass-assessment.md`](../size-pass-assessment.md). Amends `DRD-40` property 6 for the size pass, and `DRF-14`'s required property. Applied by [`performance-plan.md`](../performance-plan.md) §2 P4. Its first unit, `DRF-13` and `DRF-14`, is recommended and not started. `DRO-14` holds the owner's items. **Amended on 2026-11-12 by `DRD-52`:** its first unit also carries `DRD-52` and `DRD-53`, and [`size-pass-unit-handoff.md`](../size-pass-unit-handoff.md) implements all three. **First unit landed on 2026-11-12** at `237d65d2f` and accepted ([assessment](../size-pass-unit-assessment.md)). **Amended on 2026-11-12:** §First unit item 2's step becomes a module function, which [`size-pass-followup-handoff.md`](../size-pass-followup-handoff.md) implements, and property 3 separates `bench/campaign.ts` from the deferred campaigns. **The amendment of item 2 landed on 2026-11-12** at `e22db849c` and was accepted (§Disposition of the size pass follow-up report). With `DRO-14` answered in full, no measured candidate remains. **Properties 1 and 3 amended on 2026-11-13 by `DRD-55`:** readings are booked from the gate on the published build, and `measure.ts` changes for that instrument change only

**P4 measures every row as minified, gzip-9 and Brotli-11 bytes, books only joint readings, and names its control rows before it measures. Its first unit removes the unreachable `null` gap (`DRF-13`) and the duplicate bounds invalidation (`DRF-14`). A candidate that changes an owner-directed decision, a semantic boundary or an accepted encapsulation, or that adds hot-path work, waits for `DRO-14`.** [`performance-plan.md`](../performance-plan.md) §2 P4 applies this decision.

Decided on 2026-11-12 by the architect, on the owner's request to open the size pass on `drag/size` from `0a28f909a`, from [`size-pass-assessment.md`](../size-pass-assessment.md).

**Why:**

- **The gate removes nothing here.** Three read-only inventories and the architect's reading found every guard reachable through correct use, no runtime vocabulary that isn't folded, and shipped diagnostics that are already identities (assessment §3). Part II's first three classes have no candidate.
- **What remains is small, and most of it is a decision.** The seven measured candidates take 1 to 76 B Brotli off a row (assessment §5). Two of them repair open findings and touch no decision. The others amend `DRD-36`, trade `RectIndex`'s encapsulation, remove a §2.1 boundary, or add per-frame work against §0.
- **No measured set closes a red row.** With every candidate, "complete" is still 216 B over its ceiling and "draggable alone" 32 B over. The excess is the costs the owner accepted, so the re-base is `DRO-4`'s and comes after the pass (§18).

**Required properties:**

1. **Readings.** A unit reports every row of `bench/size/measure.ts` as minified, gzip-9 and Brotli-11 bytes at its base and at its last commit, with the settings of the assessment's §1, through [`size.ts.txt`](../probes/size-pass/size.ts.txt) or a tool that reproduces its base figures. Brotli-11 is the figure the ceilings gate. gzip is recorded and not gated. Where the figures disagree in sign, the report says so. Only a joint reading of what lands is booked, and per-candidate ablations only rank.
2. **Control rows.** Before it measures, a unit names the rows that its change can't reach, and each of them must read exactly 0/0/0. A non-zero control is a finding before the unit continues.
3. **Fixed during the pass.** Every ceiling, `draggable alone`'s control figure and `measure.ts` itself stay as they are, and `DRO-4` holds the re-base. The deferred campaigns stay stopped: the page check, B3', the in-page floors, `--prove` and `--floors`.
4. **Runtime.** A change that only removes operations from the paths it touches is checked by the exact instruments: the per-sample tests and the hot-path censuses, with the suite in three engines. It runs no `compare.ts` row. A change that adds or moves work on a per-sample, per-frame, drop or activation path also runs `compare.ts --before <its base> --only <the rows that reach the path>`, and its size and timing go to the owner together under §0.
5. **Owner items.** A candidate in `DRO-14` isn't implemented before the owner answers that item. A new candidate of the same kind goes to the owner the same way.
6. **Correctness and ownership hold,** as `DRD-40` property 7 states. A size change that would move an owner in `DRD-24`, `DRD-26`, `DRD-27` or `DRD-33` isn't a size change (§13).

**First unit: `DRF-13` and `DRF-14`** (patch `U1-recommended-unit`, which leaves out the type changes of item 1):

1. **`DRF-13`.** `AxisQuery.insertion` is `Insertion`. `y.ts` and `xy.ts` read `query.insertion.index` with no `null` arm and no `!`. `SortableOperation`'s query type no longer removes a `null` with `SetNonNullable`, and an import left unused goes. `LinearShift.refresh` receives a gap that is never negative: its `gap < 0 ? 0 : gap` and its `if (gap >= 0)` go, and its JSDoc no longer offers `-1` for that parameter. **What stays:** `lastGap`'s own `-1`, which means no known gap after `retire` or after a move the shift can't predict, `RectIndex.holds`, and `xy.ts`'s `last`.
2. **`DRF-14`.** `FreeDragBehavior.invalidate` calls only `operation?.handleEvent()`, which marks the bounds and the drop targets stale. With no operation, nothing is lost, because each activation marks the bounds stale before its first read. **This decision withdraws `DRF-14`'s naming half:** the scroll and resize listener is the operation object, so its entry must be `handleEvent`, and a second name would cost a member for no behavior. The step's comment says which entry it calls.
3. **Expected:** −17 B Brotli on "sortable + y" and "complete", −2 B on "sortable + xy", −1 B on "freeDrag" and −2 B on "freeDrag + bounds + landing", against `0a28f909a`. **Control rows:** "draggable alone", "draggable + lift" and the three examples read exactly 0/0/0.
4. **Verification:** typecheck, format and lint on the changed files, the full suite in Chromium and in three engines with only the known failures (the five `DRO-4` size rows), the per-sample tests, `measure.ts`, and property 1's readings. By property 4, no `compare.ts` row runs.
5. **Nothing else changes.** `DRF-15`, `DRF-20` and every `DRO-14` item are outside this unit.

**What this amends:** `DRD-40` property 6's last sentence, "A size change is measured with `bench/size/measure.ts` and with the timing rows it could affect", is replaced by property 4 above for this pass. A change that only removes work can't make a timing row slower, and no timing row resolves a change of a few branches (`DRD-43`). The exact instruments can show an allocation or a layout read that a change adds. `DRD-36` and `DRD-32` stand until the owner answers `DRO-14`.

**Amended 2026-11-12 by `DRD-52`:** item 5 of the first unit no longer holds as written. The unit also carries `DRD-52` and `DRD-53`, and runs `compare.ts` by property 4. `DRO-14` items 3 and 4 and `DRF-15` stay outside it.

**Result, 2026-11-12:** the first unit landed in `15e9d1ef2`, `312f4ec32` and `237d65d2f`, reported at `ed4bd589f` and accepted in [`size-pass-unit-assessment.md`](../size-pass-unit-assessment.md).

- **Size, against `1d304128b`, Brotli-11:** −62 B on "sortable + y", −56 B on "sortable + xy", −65 B on "complete", −1 B on "freeDrag" and 0 B on "freeDrag + bounds + landing", which is −26 B minified. The five control rows read 0/0/0. gzip and Brotli never disagree in sign. Every row equals the architect's joint reading.
- **No ceiling closes.** Six rows stay over: "freeDrag" by 56 B, "complete" by 219 B, "freeDrag + bounds + landing" by 249 B, and "draggable alone", "example: resize handle" and "example: drop zone" as before. "sortable + y" has 81 B of headroom and "sortable + xy" 76 B. Budgets are unchanged, and `DRO-4` holds the re-base.
- **Runtime:** see `DRD-52`'s result. The suite fails only on the six size rows in Chromium, and passes in three engines.
- **Item 2's lint finding:** `DRF-14`'s change left `FreeDragBehavior.invalidate` reading no `this`, and `class-methods-use-this` reports it. Repaired by the amendment below.

**Amended 2026-11-12, §First unit item 2:** the step that `FreeDragController.invalidate` requests is a function of `free-drag/behavior.ts`'s module, not a member of `FreeDragBehavior`. It calls only `operation?.handleEvent()` and reads no other state. The controller requests the same function on every call, so calls coalesce in its own step list as before. It takes 1 B Brotli off "freeDrag" and 5 B off "freeDrag + bounds + landing", against `ed4bd589f`, and the other eight rows read 0/0/0 (assessment §3). [`size-pass-followup-handoff.md`](../size-pass-followup-handoff.md) implements it.

**Amended 2026-11-12, property 3:** "the deferred campaigns" are the measurement work it names, and no other. **`bench/campaign.ts` isn't one of them.** It sequences the runs a unit's handoff asks for, and a unit uses it for that. A unit waits for a process through the process itself, never by searching the process table for a pattern that its own command line contains ([`performance-plan.md`](../performance-plan.md) §3, assessment §5).

**Result of the amendment of item 2, 2026-11-12:** landed at `e22db849c`, reported at `fe529df4c` and accepted (§Disposition of the size pass follow-up report).

- **Size, against `d5ab84a83`:** −13/−7/−1 on "freeDrag" and −13/−5/−5 on "freeDrag + bounds + landing", minified/gzip-9/Brotli-11, equal to the architect's reading. The eight control rows read 0/0/0.
- **The lint finding is closed.** `class-methods-use-this` reports nothing on the two files.
- **No ceiling closes.** "freeDrag" is 55 B over and "freeDrag + bounds + landing" 244 B over. The other four red rows and the four green rows read as at `ed4bd589f`.

**P4's machinery candidates are done, 2026-11-12.** U1, C6 (`DRD-52`) and the `invalidate` step landed. The owner rejected C2 (`DRD-53`), and C1 and C5 (`DRO-14` items 3 and 4). No measured candidate remains. What remains of the pass is `DRO-15`'s steps (`DRD-54`), and `DRO-4`'s re-base against figures the owner accepts.

**Amended 2026-11-13 by `DRD-55`, properties 1 and 3.**

- **Property 1:** once `DRD-55` lands, a reading is booked from the gate on the published build, using `measure.ts`'s printed minified, gzip-9 and Brotli-11 figures. `size.ts.txt` reads `src`, so it then ranks candidates and no longer books them.
- **Property 3:** `measure.ts` changes for `DRD-55`'s instrument change. Every ceiling and the control figure stay.
- **What they used to say:**
  - property 1: readings were taken "through `size.ts.txt` or a tool that reproduces its base figures";
  - property 3: "`measure.ts` itself" stayed as it was during the pass.
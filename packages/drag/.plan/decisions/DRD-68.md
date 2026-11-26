#### DRD-68 — Every size ceiling moves to its reading at `988643dc9`, and until release each change the owner approves moves them again

**Status:** active, decided on 2026-11-15 by the architect on the owner's acceptance of drag's current size, at `3228d1f07` on `drag/size-acceptance`. **Amended the same day at `988643dc9`, before implementation,** on the owner's policy `DRO-20`: every row's ceiling and the control move to their readings at `988643dc9`, and until release each change the owner approves moves them again. Answers `DRO-4`'s size re-base, and records the owner's acceptance of decisions 1 and 2 of [`combined-review-remediation-assessment.md`](../combined-review-remediation-assessment.md) §5.2. **When decided, unimplemented:** [`size-acceptance-cleanup-handoff.md`](../size-acceptance-cleanup-handoff.md) item 1 implements it. **Implemented at `e9ca3732f`,** and the unit's final re-measure at `a3423c793` moved no row. Read by the architect at `7f963e54a` (§Disposition of the size acceptance cleanup report)

**Decided on 2026-11-15 by the architect, on the owner's acceptance of drag's current size,** relayed by the coordinator on `drag/size-acceptance` at `3228d1f07`. **Amended the same day, before implementation, on the owner's ceiling policy (`DRO-20`) and the owner's commit `988643dc9` (`DRO-21`).** What it said before is at the end.

**The reading.** `npx just size` at `988643dc9`, run by the architect on 2026-11-15 after a fresh build, with the architect's reading at `3228d1f07` beside it. Brotli, in bytes:

| Row | Ceiling was | `3228d1f07` | `988643dc9`: the new ceiling |
| --- | --: | --: | --: |
| draggable alone | 2139 | 2189 | 2189 |
| draggable + lift | 4169 | 3932 | 3932 |
| example: resize handle | 3313 | 3265 | 3265 |
| example: drop zone | 4431 | 4570 | 4570 |
| example: canvas group | 3314 | 3261 | 3261 |
| freeDrag | 4967 | 4985 | 4984 |
| freeDrag + bounds + landing | 5210 | 5455 | 5465 |
| sortable + y | 6733 | 6547 | 6533 |
| sortable + xy | 6617 | 6512 | 6484 |
| complete | 7065 | 7150 | 7143 |

"draggable alone"'s control was 2024, and becomes 2189. **`988643dc9` against `3228d1f07`:** −28 B on "sortable + xy", −14 B on "sortable + y", −7 B on "complete", −1 B on "freeDrag", +10 B on "freeDrag + bounds + landing", and 0 B on the other five rows.

**Properties.**

1. **Every row's ceiling equals its reading at `988643dc9`,** and the control equals 2189. No row has slack.
2. The graph assertions (`present`, `absent`) and "draggable alone"'s module list don't change.
3. **Until release, the ceilings follow the code (`DRO-20`).** A unit that lands a change the owner approved re-measures every row after its last change, and moves each ceiling, and the control, to its reading. Its report gives each row's reading against the unit's input. No further approval is asked.
4. **What still stops a unit until release:**
   - a row that grows from a change the owner hasn't approved;
   - in a unit that changes no file in "draggable alone"'s graph, a control that moves.
5. **What this withdraws until release,** against what `violations` in `bench/size/measure.ts` asserts: "over its ceiling" and "control moved" still fail `npx just size` and `npx just test` until the unit re-bases. **They no longer send a change the owner approved back for a decision on its bytes.** The last ceilings before the withdrawal are the "Ceiling was" column.
6. **The boundary is release:** the first publication of `@ydinjs/drag` to a registry, which the owner performs. Before that publication, the architect states the rule that governs the ceilings after it, and a reading over a ceiling is a decision again (CONTRIBUTING §18). Giving release up is the owner's act, and it ends this policy with a decision of its own. **The `budget` docblock in `bench/size/measure.ts` states the rule and names this decision,** so that a unit standing at a candidate release can find it.
7. After the re-base, `npx just size` exits 0, and `npx just test` has no failing size row.

**Why.**

- **It is the owner's policy (`DRO-20`).** Until release the owner approves each change, so a second decision about the same change's bytes repeats the first.
- **Zero slack on every row** makes the re-measure after each approved change show that change's whole cost, on every composition.
- **The old ceilings would keep the gate red for good.** `npx just test` has exited non-zero on every run since `a9c323f6a`, so a new failure read the same as the accepted ones.
- **CONTRIBUTING §18 holds.** A reading triggers each re-base, not the boundary. The boundary is an act the owner performs, and it is identified here and where the ceilings are written. The withdrawal is stated against the assertion, with the last figures.

**Not adopted.**

- **Keeping the ceilings and listing the five red rows as accepted failures.** The gate stays red, which is what hides a new failure.
- **Removing the red rows.** They also assert each composition's module graph, which no other check does.
- **Slack on the new ceilings,** such as each row's old margin.

**What it answers.**

- **`DRO-4`'s size re-base:** answered.
- **Decisions 1 and 2 of [`combined-review-remediation-assessment.md`](../combined-review-remediation-assessment.md) §5.2,** `DRO-10`'s excess and the reported costs that no approval covers: **accepted by the owner, with nothing removed** (`DRO-10`).
- **Decision 3** was answered by the merge at `a9c323f6a`. Once the re-base lands, it no longer arises.

**What it doesn't decide.**

- **`DRO-4`'s timing and retention readings:** the per-cycle cost that no row resolves, and the retained plateau of about 4 KB whose retainer isn't known. They stay in [`performance-plan.md`](../performance-plan.md) §4.
- **`Landing`'s shape,** the next change the owner will approve after inspecting it (`DRO-20`).
- **Release,** which comes after documentation, examples and CI.

**What it said before the amendment.** The five red rows' ceilings and the control moved to their readings at `3228d1f07`: 2189, 4570, 4985, 5455 and 7150 B, and the control 2189 B. The five passing rows kept their ceilings. A later reading over a ceiling went to the owner as a decision, and a pass that left a row well under its ceiling could re-base it. The answer to decisions 1 and 2 was the architect's reading of the acceptance, for the owner to correct. **Why it changed:** the owner set the policy and confirmed that reading.

**Implemented by** [`size-acceptance-cleanup-handoff.md`](../size-acceptance-cleanup-handoff.md) item 1, at `e9ca3732f`. The unit's final re-measure at `a3423c793` moved no row, so every ceiling and the control still equal their readings at `988643dc9` (§Disposition of the size acceptance cleanup report).

**Dated 2026-11-16, by the architect:** `repo:RD-7` tags the ceiling and control verdicts of `tests/size.node.test.ts` as `measurement`. CI reports them and never fails on them. Each composition's row splits into a graph row, which stays in the CI gate (`DRI-18`), and a ceiling row. Locally `npx just test` runs both, so property 5 holds as written. The figures, the ceilings and the assertions don't change.
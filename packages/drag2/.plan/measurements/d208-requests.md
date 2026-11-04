# D-208 — the measurement record

> **Written 2026-11-04. D-208 is still `Unimplemented (Remediation)`.** The final proof runs in the consolidator's round, and only the architect's whole-decision acceptance removes D-208's row and marker, closes F-432 to F-435 and F-441, and marks the decision implemented ([record §29.9](../reviews/architecture/request-application-claude.md)).

**Canonical entry: `drag2:D-208`,** as [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §20.5, §21.8, §23.3 and §24.5 step 6 state it, as §28.7 and §29.7 amend them. Step-6 figures are cited from [`d208-step6.md`](d208-step6.md), and each earlier step's from its own record.

**The input** for the runtime comparison is `6905af249`.

**The freeze.** `src/` is tree `c6c5e6ea59697efa8f27beae2700a574e6f3df4c`, at comment commit `65649c6d0`. It differs from 6R's `c0713204a` only by that commit, whose identity checks are in `d208-step6.md` §The final tree. It holds until the whole decision is accepted, and any other `src/` change goes to the architect first (§29.4). **Dated note, 2026-11-04 (§30.8):** `src/` is now tree `626180a058af7374a68c5544fefc4111eec6003c`, at comment commit `1a74d547a`, which changes five comment sites and no code that runs. Rows R33 (i) to (l) landed with no `src/` change. The checks, N1's reading and the failing set are in `d208-step6.md` §The bounded remediation. Row (j) is free drag only, because sortable has no `onMove` slot, and the final proof's sortable `onMove` probe never invoked its callback, so it is not evidence of diagnostic behavior. §30.4 and the matching review and §30.1 claims need the architect's factual correction at acceptance.

**The outcome of the runtime work:** _retained heap A; allocation a3; no regression demonstrated and none excluded; the remaining uncertainty accepted by the owner, 2026-11-04._

## This file reddens the witness row, by design

Creating this file makes `tests/decisions.node.test.ts`'s _should hold every witness it claims_ fail, reporting `D-208: .plan/measurements/d208-requests.md exists` (§29.8). The row stays, the marker stays, and the witness is not weakened. **The branch therefore cannot read clean before acceptance, which is a correct gate on the merge.**

**The failing set from this file's commit until acceptance, by name:**

- `decisions.node`: _should hold every witness it claims_;
- `docs.node`: _should resolve every reference a public type makes_, and the closure rows for the kernel, ordinary and free-drag tiers.

`tests/sortable/react.browser.test.ts` and `stories.browser.test.ts` do not load, on incompatible `react` and `react-dom` versions, as before. **Every declared control passes,** and none is unattributed.

## The owner's dispositions

**2026-11-03, the four overruns, quoted:**

> Rebase the size budgets to the current architecture under the standing budget policy. A compression pass will happen separately, after this phase. This decision does not accept runtime regressions or retained-heap growth.

**2026-11-04, the allocation uncertainty, quoted:**

> The owner agrees to stop investigating the small allocation uncertainty and finish this phase:
>
> - Do not run Q-a3.
> - Accept the remaining allocation uncertainty documented by M-2″, including moveTo's positive differences.
> - Preserve outcomes A and a3, the raw figures and their limits. Do not relabel a3 as a1, discharged, or proof of zero regression.
> - Allow the recorded shared-refusal candidate to proceed through a bounded independent recheck.

The owner also directed that the recheck run no new statistical rounds solely to resolve this uncertainty, that new correctness defects still get reported, and that F-442, F-443 and the compression pass stay separate (§28). Q-a3 did not run. The acceptance is for this candidate only, sets no tolerance and is not a precedent (§28.1). The 2026-11-03 condition stands.

## Composition

**Brotli bytes per step,** read by `measureAll()` at each step's commit, with dependencies rebuilt there, while re-declaring the controls. Every figure in the columns from step 1 to 6R appears in that step's own record, and the input column in `d204-step1.md`'s before column. Those records remain the citations:

- steps 1 and 2: [`d204-step1.md`](d204-step1.md), [`d206-step2.md`](d206-step2.md);
- step 3: [`d207-step3.md`](d207-step3.md);
- steps 4, 5, 5R and 5R.1: [`d208-step4.md`](d208-step4.md), [`d208-step5.md`](d208-step5.md), with 5R's row as §21.2 books it;
- 6R and the final tree: `d208-step6.md` §Costs and §The final tree.

| Row | `6905af249` input | step 1 | step 2 | step 3 | step 4 | step 5 | 5R | 5R.1 | 6R | final |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 10,358 | 10,445 | 10,563 | 10,322 | 10,218 | 10,218 | 10,201 | 10,201 | 10,221 | 10,221 |
| minimal (xy) | 10,223 | 10,315 | 10,451 | 10,196 | 10,099 | 10,099 | 10,094 | 10,094 | 10,117 | 10,117 |
| minimal + layoutAnimation | 10,683 | 10,788 | 10,915 | 10,663 | 10,543 | 10,543 | 10,533 | 10,533 | 10,558 | 10,558 |
| xy + layoutAnimation | 10,574 | 10,659 | 10,787 | 10,545 | 10,417 | 10,417 | 10,413 | 10,413 | 10,435 | 10,435 |
| minimal + landing | 10,507 | 10,600 | 10,744 | 10,483 | 10,366 | 10,366 | 10,386 | 10,386 | 10,393 | 10,393 |
| complete | 10,835 | 10,943 | 11,066 | 10,817 | 10,692 | 10,692 | 10,688 | 10,688 | 10,722 | 10,722 |
| free drag minimal | 8,108 | 8,193 | 8,327 | 8,229 | 8,262 | 8,262 | 8,262 | 8,262 | 8,281 | 8,281 |
| free drag + bounds | 8,277 | 8,348 | 8,482 | 8,381 | 8,495 | 8,495 | 8,495 | 8,495 | 8,514 | 8,514 |
| free drag + landing | 8,272 | 8,351 | 8,487 | 8,400 | 8,437 | 8,437 | 8,437 | 8,437 | 8,449 | 8,449 |
| free drag complete | 8,423 | 8,518 | 8,646 | 8,529 | 8,628 | 8,628 | 8,628 | 8,628 | 8,652 | 8,652 |
| both behaviors | 12,299 | 12,374 | 12,534 | 12,281 | 12,198 | 12,198 | 12,209 | 12,209 | 12,235 | 12,235 |
| vocabulary root - drag.js | 142 | 142 | 142 | 142 | 142 | 142 | 142 | 142 | 142 | 142 |
| kernel root - kernel.js | 6,178 | 6,261 | 6,389 | 6,300 | 6,320 | 6,320 | 6,320 | 6,320 | 6,340 | 6,340 |
| baseline A - feature-matched, non-composed | 10,667 | 10,740 | 10,885 | 10,655 | 10,507 | 10,507 | 10,508 | 10,508 | 10,525 | 10,525 |
| baseline B - shipped @ydinjs/drag sortable.js | 6,916 | 6,916 | 6,916 | 6,916 | 6,916 | 6,916 | 6,916 | 6,916 | 6,916 | 6,916 |

**Minified and modules, input and final tree:**

| Row | Minified, `6905af249` | Minified, final | Modules, `6905af249` | Modules, final |
| --- | --: | --: | --: | --: |
| minimal | 34,363 | 33,419 | 33 | 33 |
| minimal (xy) | 33,682 | 32,776 | 32 | 32 |
| minimal + layoutAnimation | 35,342 | 34,335 | 34 | 34 |
| xy + layoutAnimation | 34,661 | 33,692 | 33 | 33 |
| minimal + landing | 34,756 | 33,812 | 35 | 35 |
| complete | 35,735 | 34,728 | 36 | 36 |
| free drag minimal | 26,869 | 27,063 | 27 | 27 |
| free drag + bounds | 27,335 | 27,707 | 28 | 28 |
| free drag + landing | 27,262 | 27,456 | 29 | 29 |
| free drag complete | 27,728 | 28,100 | 30 | 30 |
| both behaviors | 43,131 | 42,268 | 47 | 47 |
| vocabulary root - drag.js | 252 | 252 | 2 | 2 |
| kernel root - kernel.js | 19,812 | 20,033 | 16 | 16 |
| baseline A - feature-matched, non-composed | 35,028 | 34,019 | 31 | 31 |
| baseline B - shipped @ydinjs/drag sortable.js | 22,618 | 22,618 | 26 | 26 |

**6R's row and the comment commit's row are equal on all fifteen rows,** in minified, Brotli and modules.

**Ceilings.** The thirteen package ceilings were re-based at tree `4630579d2` on the 2026-11-03 disposition, and none moved after that. Every row at the final tree is under its ceiling, with 116 to 143 B of slack on the thirteen package rows, 63 B on `drag.js` and 124 B on baseline B (`d208-step6.md` §The final tree).

**Controls,** re-declared once, each with its whole interval attributed by a reading at every seam ([`budget-rebases.md`](budget-rebases.md), _Controls re-declared 2026-11-04_):

| Control | Declared 2026-09-09 | Re-declared | Interval |
| --- | --: | --: | --: |
| `free drag minimal` | 8,116 | 8,281 | +165 |
| `free drag + bounds` | 8,274 | 8,514 | +240 |
| `free drag + landing` | 8,276 | 8,449 | +173 |
| `free drag complete` | 8,426 | 8,652 | +226 |
| `kernel root - kernel.js` | 6,185 | 6,340 | +155 |
| baseline B | 6,889 | 6,916 | +27, all at `01d88645f`, the dependency update |
| `vocabulary root - drag.js` | 142 | 142 | 0, not re-declared |

## M-1: the move path

**Timing, against `6905af249`, under step 3's pre-registered rule, at the frozen tree `4630579d2`:** 24 paired rounds, resolution 0.0488 µs, `d` = tip − base. Full results: `d208-step6.md` §M-1's follow-up.

| Arm | Slower / faster / tied | One-sided `p` | `m` | Verdict |
| --- | --: | --: | --: | --- |
| free drag bare, primary | 7 / 16 / 1 | 0.983 | −0.244 µs | no regression |
| free drag `bounds(thunk)`, primary | 10 / 12 / 2 | 0.738 | −0.049 µs | no regression |
| free drag `axis` | 8 / 15 / 1 | 0.953 | −0.098 µs | no finding |
| free drag `bounds(element)` | 8 / 16 / 0 | 0.968 | −0.195 µs | no finding |
| sortable, 50 rows | 8 / 12 / 4 | 0.868 | −0.098 µs | no finding |
| sortable, 200 rows | 8 / 13 / 3 | 0.905 | −0.049 µs | no finding |

**Outcome: _no regression_ for timing, and it carries to the final tree (§29.1):** the comment-stripped diff of 6R changes no code in a per-sample function, the per-sample call counts are identical, and the comment commit changes no code that runs. Its limits: Chromium only, under `__DEV__` `true`, one engine and one machine.

### I-26's structural check

**I-26's wording and tier stay.** It counts objects created per sample, by inspection, and it is tier C. **It is not _allocates nothing_** (§24.3.3). At the frozen tree and at `6905af249` alike, one sample allocates about 189 B: about 105 B is the transform string, which I-26 permits, and about 84 B is the queue's store (F-443).

**D-208's statement at the frozen tree is _no per-sample difference_:** measured equal between that tree and `6905af249`, shipped and DEV, with `OPEN_RESOLUTION` per drop and `moveTo`'s copy per call (`d208-step6.md` §Allocation per sample, §Call counts).

**That statement is not restated for 6R's tree (§28.7).** What holds there:

- 6R's diff touches no per-sample function;
- the call counts are identical: `#handleMove` 2,001 and `#handleOpenResolution` 0 over press and 2,000 samples; `#handleMove` 100, `#handleUp` 50 and `#handleOpenResolution` 50 over 50 drops; `moveTo` 2,000 and `#handleOpenResolution` 0 over 2,000 calls;
- each per-sample cell's paired reading, candidate − input, in bytes:

| Cell | Project | `k`/`n` | `p` | `m` | `r` | §26.7 reads, for this cell |
| --- | --- | --: | --: | --: | --: | --- |
| sortable sample | shipped | 5/12 | 0.8062 | −0.13 | 1 | no regression |
| free sample bare | shipped | 7/12 | 0.3872 | 0.16 | 3.6 | no regression |
| free sample `bounds(element)` | shipped | 6/10 | 0.3770 | 0.13 | 4.6 | no regression |
| free sample `bounds(thunk)` | shipped | 7/12 | 0.3872 | 0.16 | 0.9 | no regression |
| free sample `onMove` | shipped | 9/11 | 0.0327 | 0.25 | 0.3 | no regression |
| sortable sample | DEV | **10/12** | 0.0193 | 0.40 | 0.9 | no regression |
| free sample bare | DEV | 6/11 | 0.5000 | 0.51 | 0.8 | no regression |
| free sample `bounds(element)` | DEV | 3/12 | 0.9807 | −0.38 | 5.4 | no regression |
| free sample `bounds(thunk)` | DEV | 3/12 | 0.9807 | −0.15 | 0.2 | no regression |
| free sample `onMove` | DEV | 7/11 | 0.2744 | 0.10 | 0.2 | no regression |

`onMove` shipped and sortable sample DEV have `p` under 0.05, and each stays as read (§28.1).

## M-2: controller cost with the façade

**Retained heap, protocol M-2″ at src tree `c0713204a` against `6905af249`: outcome A, set G.** Raw data: [`d208-m2pp-raw.jsonl`](d208-m2pp-raw.jsonl), and [`d208-m2pp-rule.json`](d208-m2pp-rule.json) is the one computation. Bytes per controller.

| Population | Count | `k`/`n` | `p` | `m` | Tip range | Base range | Literal misses |
| --- | --: | --: | --: | --: | --- | --- | --: |
| sortable | 100 | 0/12 | 1.0000 | −75.1 | 3,565.9 – 3,625.8 | 3,648.1 – 3,700.9 | 0 |
| mixed | 100 | 1/12 | 0.9998 | −38.3 | 3,099.4 – 3,238.8 | 3,144.2 – 3,277.1 | 1 |
| free | 100 | 2/12 | 0.9968 | −5.9 | 2,618.9 – 2,708.1 | 2,479.9 – 2,714.0 | 2 |
| sortable | 1000 | 1/12 | 0.9998 | −64.7 | 3,552.1 – 3,639.9 | 3,637.4 – 3,704.9 | 1 |
| mixed | 1000 | 1/12 | 0.9998 | −33.4 | 3,076.9 – 3,149.7 | 3,127.0 – 3,182.0 | 1 |
| free | 1000 | 3/12 | 0.9807 | −5.4 | 2,610.5 – 2,670.1 | 2,621.7 – 2,675.4 | 3 |

`R` reads no regression on all six rows, on `E1` and on `E2`. V0, V1 and V2 pass. `L` is 2 of 36, so under §26.4 `R` replaces _in every round_ at 100 controllers. `T`: base 5 of 72, candidate 9 of 72, p = 0.3997.

**The five literal cells at 100 controllers.** Each is the candidate's usual figure against a low base figure, and all five stay on the record:

| Where      | Population, round  | Candidate |    Base |
| ---------- | ------------------ | --------: | ------: |
| resumed 6R | mixed, round 2     |     3,239 |   3,024 |
| resumed 6R | sortable, round 4  |     3,626 |   3,522 |
| set G      | mixed, round 2     |   3,238.2 | 3,144.2 |
| set G      | free drag, round 2 |   2,708.1 | 2,634.2 |
| set G      | free drag, round 6 |   2,708.1 | 2,479.9 |

**§27.4's limits:**

- **The low state's cause is unestablished at both trees,** and it is outside what `R` measures.
- **Low figures at 1000 controllers lean to the candidate:** 21 of 72, against 5 of 72 at base. `T` covers only 100 controllers, and lower candidate minima could flatter `E1` at 1000. `E2` reads the same way: `k` at most 2 of 12, `m` −58.1, −31.5 and −5.4 B.
- **At 1000 controllers the row bounds gross growth only.** V1's 1000-controller rows read inconclusive at the 4 B injection.

## Allocation

**Outcome a3, with no regression demonstrated and none excluded, and the remaining uncertainty accepted by the owner, 2026-11-04.** Under §26.1's labels: the criterion stays unreached, which the owner lifted as the landing gate for this candidate only; no cell reaches `p < 0.0005`; and the uncertainty stays unresolved.

`d` = candidate − input, unrounded:

| Cell | Project | `k`/`n` | `p` | `m` | `r` | Range of `d` | §26.7 reads |
| --- | --- | --: | --: | --: | --: | --: | --- |
| `moveTo` | DEV | 9/11 | 0.0327 | 1.010 B | 1.0 B | −1.1 to 2.6 B | **inconclusive** |
| `moveTo` | shipped | 9/11 | 0.0327 | 0.61 B | 7.7 B | −0.5 to 7.4 B | no regression |

The other 18 cells are in `d208-step6.md` §Allocation, and each read _no regression_ as a named cell.

**The rest of the lean, from §27.2:** three more cells have `p` under 0.05: `onMove` shipped (`k` 9/11, `m` 0.25 B), sortable sample DEV (`k` 10/12, `m` 0.40 B) and the moving committed frame in DEV (`k` 10/12, `m` 34.74 B). The post-hoc family test gives `S` 20.5, `p` about 0.002, which raises a question only.

**The nine cells of the resumed 6R stay as recorded,** above step 6's tip ranges, four rounds, tip only. Bytes:

| Cell | Candidate | Step 6's tip | Above by |
| --- | --- | --- | --: |
| sortable sample, shipped | 194.0 – 200.1 | 193.6 – 194.6 | 5.5 |
| free drag bare, DEV | 192.1 – 195.9 | 191.7 – 192.5 | 3.4 |
| free drag `bounds(element)`, shipped | 195.7 – 196.8 | 191.5 – 196.1 | 0.7 |
| free drag `bounds(element)`, DEV | 196.2 – 196.8 | 191.3 – 196.7 | 0.1 |
| free drag `bounds(thunk)`, DEV | 191.4 – 191.8 | 191.5 – 191.7 | 0.1 |
| committed move, moving, shipped | 1,133.0 – 1,180.9 | 1,117 – 1,179 | 1.9 |
| free-drag drop, shipped | 15,290.3 – 15,311.7 | 15,266 – 15,308 | 3.7 |
| free-drag drop, DEV | 15,271.9 – 15,317.3 | 15,287 – 15,302 | 15.3 |
| sortable drop, DEV | 16,751.3 – 16,809.4 | 16,750 – 16,789 | 20.4 |

**Attribution:** 0 B on `ArmedController`, `channel`, `#arm`, `deliverUnlessApplied`, `reportToSpec` or a frame named `report`, in all 20 windows and all 24 candidate runs. `kernel/kernel.ts:(anonymous)` books bytes in the drop windows at both trees, and ~~the profile cannot name which anonymous function~~ **corrected 2026-11-04 (record §27.3, §30.6):** the harness keys on `functionName` and `url`, so it cannot tell two anonymous functions apart. The candidate's new arrow is anonymous too, so this is a limit of the attribution.

**What stopping leaves unanswered (§28.1).** Nothing here answers these:

- whether `moveTo`'s lean is a per-call cost or a lump in the window;
- whether the lean recurs, and whether it follows the code or the worktree's identity;
- the anonymous arrow's exact call count. The recheck's reading supports it not running in the windows, which is not a count, and the fixtures set no `onError`, so a delivered warning there would be silent.

## R21: the read census, and the `channel` mint sites

**`tests/kernel/capture.node.test.ts` passes at the final tree,** with the one re-pin §25.3 permits. By location:

| Place | Reads |
| --- | --- |
| the runner, `kernel/execution.ts` | `ExecutionBracket.#leave`, `#step`, `dispatch`, `requestClose` read `#lifecycle`; the accessors `closed` and `idle` themselves; `runIngress` reads `idle` |
| intake, `kernel/kernel.ts` | `ArmedController.#cancelWith` and `#failOperation` (`closed`, `cancelRequest`); `Kernel.dispatch` (`closed`) |
| the runner's ingress refusal | `ArmedController.#onPointerDown` (`idle`) |
| the one diagnostic refusal | `deliverUnlessApplied` (`closed`), replacing `Kernel.channel`'s entry |
| unit entries | `#handleActivate`, `#handleCancel`, `#handleFailed`, `#handleMove`, `#handleStartCommitted` (`cancelRequest`); `#handleOpenResolution` (`cancelRequest`, `failureRegistered`) |
| outside `src/kernel/` | **none** |

**The mint sites: four, by location.** §20.5's and §23.3's _five expected_ is superseded by §25.5's expected fall, and a fifth is now a finding.

| Site                                                      | Mints over       |
| --------------------------------------------------------- | ---------------- |
| `sortable/spec.ts:317`, `SortableBehavior`'s constructor  | `#deliver`       |
| `free-drag/spec.ts:243`, `FreeDragBehavior`'s constructor | `#deliver`       |
| `sortable/behavior.ts:126`, the composition's `report`    | `merged.onError` |
| `free-drag/behavior.ts:52`, the composition's `report`    | `merged.onError` |

The declaration is `kernel/spec.ts:105` and the definition `kernel/kernel.ts:2600`. The census is a text search at these lines, and the recheck's syntax-tree search found the same four at `70368bfde`.

**The mutations**, from the recheck, once each in Chromium: M1 reddens 19 rows, M2 11 and M3 2, each by name against the record.

## step4-D's remainder

**Free drag's per-sample allocation, net of the harness's own `PointerEvent`,** at the frozen tree and `6905af249`, four rounds, bytes per sample. The harness's share is 0.0 to 0.1 B (`d208-step6.md` §Allocation per sample):

| Arm | Tip, shipped | Base, shipped | Tip, DEV | Base, DEV |
| --- | --- | --- | --- | --- |
| free drag, bare | 192.0 – 195.6 | 191.9 – 196.0 | 191.7 – 192.5 | 192.1 – 195.9 |
| free drag, `bounds(element)` | 191.5 – 196.1 | 192.3 – 196.7 | 191.3 – 196.7 | 195.9 – 196.3 |
| free drag, `bounds(thunk)` | 191.2 – 192.1 | 191.6 – 191.8 | 191.5 – 191.7 | 191.8 – 192.3 |
| free drag, `onMove` installed | 260.0 – 260.3 | 260.0 – 260.7 | 260.3 – 260.5 | 259.9 – 260.5 |

**The committed move is measured, not stated by analysis:** a harness reaches the frame. Ten rows and `y()`, 200 frames per arm, bytes per frame, at the same trees:

| Arm    | Tip, shipped  | Base, shipped | Tip, DEV      | Base, DEV     |
| ------ | ------------- | ------------- | ------------- | ------------- |
| moving | 1,117 – 1,179 | 1,137 – 1,184 | 2,543 – 2,602 | 2,634 – 2,638 |
| still  | 694 – 704     | 688 – 699     | 693 – 702     | 696 – 698     |

The paired readings at 6R's tree are in `d208-step6.md` §Allocation. That includes the moving frame's DEV reading, `k` 10/12 and `m` 34.74 B, named in §Allocation above.

## Closed items this record relies on

Each where it closed:

- R34, `e46e11493`;
- step3-B, §20.2;
- step4-A's census and 5R's supplementary census;
- step5-A, step5-C and #1, closed in 5R, §21;
- the uniqueness text, closed in 5R.1, §22;
- 5r1-A, I-31's qualification and L-2's citation, `7f1900ccf`, §23.1;
- **6R,** closed at `70368bfde`, §29.1;
- **reviewer-1,** the seven comment sites, landed at `65649c6d0`;
- **reviewer-2,** 05:253's wording, corrected at `5b181a052`, §29.2.

**F-444's claims** carry dated corrections at `57d5b7326`. F-443's code fix and F-442 stay open and separate.

## Limits

- **All of §27.4's and §28.1's limits above stand,** and none is summarized away here.
- **The recheck's own limits (§29.1):** the mutations ran once each, in Chromium. The search behind reviewer-1 is not a census. `channel`'s receiver and extra-argument properties rest on reading.
- **Measurements came from different trees, and each says which.** M-1 timing and step 4-D's ranges are at frozen tree `4630579d2`; M-2″ and the paired allocation are at `c0713204a`; composition and the census are at the final tree. The later trees differ as §29.1 and §29.4 state.
- **Chromium only,** one engine version and one machine. The host's load varied, and M-2″'s was telemetry only.
- **The control readings** ran today, at one Node version, not on each commit's date (`budget-rebases.md`).
- **No retained-heap, allocation or timing round ran for this record.** It runs no new measurement beyond `measureAll()`.

**Reported, not fixed:** `kernel/unwind.ts:35` (line corrected 2026-11-04, record §30.6) and `sortable/spec.ts:1685` carry channel wording beside the corrected sites (`d208-step6.md` §Step 1), and §29.3 is not a census.

**Open and separate:** `drag2:F-445`, the estimator, tier B, the architect's before Phase 24 exits; F-442, F-443 and the compression pass.

## Next

The final proof, within the consolidator's review round (§29.9), at this file's commit. It is an independent feature proof of the whole decision against the record, the contract and this file. It tests that this file states a3, its limits and the owner's words truthfully, and it does not reopen a3 or run rounds to resolve it. The architect's whole-decision acceptance follows, and then the owner's merge.
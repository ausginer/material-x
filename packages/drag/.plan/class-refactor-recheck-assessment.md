# Owner class refactor: reading of the remediation and its recheck

**Read by the architect on 2026-11-14** on `drag/class-refactor`. **The inputs:**

- the [remediation report](owner-class-refactor-report.md) at `6ec32ad06`, whose code equals `42f42a164`'s, with its evidence under [`measurements/2026-11-14-class-refactor-remediation/`](measurements/2026-11-14-class-refactor-remediation/);
- the independent [recheck](reviews/owner-class-refactor-remediation/recheck-reviewer.md) at `8a4548e96`, with its probes under [`recheck-reviewer-probes/`](reviews/owner-class-refactor-remediation/recheck-reviewer-probes/).

**The governing records:**

- `DRD-63` in [`00-index.md`](00-index.md), and what it amends: `DRD-35` property 7 and `DRD-37` property 4;
- `DRD-35` property 1, the kernel's receiver signatures;
- the [assessment](owner-class-refactor-assessment.md), with the owner's answer to Q2, and the [handoff](owner-class-refactor-handoff.md);
- CONTRIBUTING Part II §1.1 and §14.

**The architect's own checks:**

- read `Retirable`, `Invalidatable` and `axis.ts` at `42f42a164`, and the receivers of `axis.ts` at `5b581fbdf`;
- read `tests/callbacks.declaration.test.ts`;
- confirmed that the receivers at sites 4 to 6 are classes with `#private` members;
- compared the size logs' ceiling lines at `5b581fbdf` and at the end;
- ran one standalone typecheck probe, saved with its output as [`receiver-this-probe.ts.txt`](measurements/2026-11-14-class-refactor-recheck/receiver-this-probe.ts.txt) and [`receiver-this-probe.txt`](measurements/2026-11-14-class-refactor-recheck/receiver-this-probe.txt) (§2).

The architect ran no suite, no mutation and no campaign. Those results are the report's and the recheck's. This record changes no source.

## 1. Result

**Items 1 and 3 to 6 meet `DRD-63`'s properties.** The recheck reproduced every witness and mutation, and its own D1 and D2 add a check of `DRD-52`'s witness.

**Item 2 meets property 2 as it was written,** but that text didn't state the guarantee that the decision intended. **`class-refactor-recheck-1` is confirmed,** and property 2 is revised in place (§2). One small follow-up unit implements the revision: [`class-refactor-receiver-handoff.md`](class-refactor-receiver-handoff.md). It changes types and one test file only.

**The refactor isn't accepted yet.** §5 lists what remains.

## 2. `class-refactor-recheck-1`: a swapped receiver typechecks at sites 1 to 3

**Decision: the narrowing isn't accepted.** At each site, the receiver that the passed member declares is the type through which the site reads that member:

- `InsertionGeometry` at sites 1 and 2;
- `DisplacementSink` at site 3;
- `SortableBehavior` at site 4;
- the tracker's class at sites 5 and 6.

So passing one built-in's method with another built-in as its receiver fails typecheck, as it did at `5b581fbdf`.

**Why:**

1. **The guarantee was per type.** `DRD-35` property 1 says that "a receiver of another type is refused". Its property 7 declared the receivers as `InsertionGeometry` and `DisplacementSink`. `DRD-63` property 2 was meant to restore that guard and extend it to the three new sites, not to widen it. Its words "that declaration carries `this`" didn't name the type, and a receiver of the supertype met them. That gap is in the decision's text, not in the implementation.
2. **The conversion makes a swapped receiver a fault.** At `5b581fbdf` the closures never read `this`, so a swapped receiver was refused by types and harmless at run time. Now `YAxisGeometry.retire` reads `this.#shift`, and `LayoutAnimationSink.retire` reads `this.#running`. On another class's object, each read throws a `TypeError`. `DRD-63` restored the guard against a missing receiver for the same reason.
3. **The test that property 2 keeps already states it.** In `tests/callbacks.declaration.test.ts`, the descriptions say that "`retire` declares the axis as its receiver" and "declares the sink". At `42f42a164` the declared receiver is `Retirable`, so they are false. The revision makes them true, with no change to the existing test lines.
4. **It costs nothing, and the adopted forms stay.** It is a type change. `Retirable` and `Invalidatable` stay, and the `this` declaration can stay on them. The architect's probe is standalone. It copies the shape of `Drag.use` and `Drag.requestStep`, and it declares the two supertypes' receivers with the polymorphic `this` type:
   - it accepts the three correct sites;
   - it refuses each missing receiver;
   - it refuses the axis's `retire` on the sink, the sink's `retire` on the axis, and the axis's `invalidate` on a `RectIndex`.

   The control declares the receivers as at `42f42a164`. It accepts the last three, which reproduces the recheck. This shows that one form meets the property. It isn't a requirement of that form, and the probe isn't drag's typecheck.

**What the property doesn't cover.** Types are structural, so no declaration refuses another object of the same type, such as a second axis. It also doesn't refuse a third party's object that has every member of the type. At sites 4 to 6 the receiver is a class with `#private` members, so any object of another type is already refused there. Those sites need no change.

**Rejected:**

- **Accepting the narrowing.** The decision would then withdraw `DRD-35` property 1's refusal at three built-in sites, where a mistake now throws. Nothing gains from it.
- **A runtime check of the receiver,** under CONTRIBUTING Part II §1.1.
- **Removing `Retirable` and `Invalidatable`** to declare each receiver on `InsertionGeometry` and `DisplacementSink` again. `DRD-63` adopted the supertypes, and the property doesn't need their removal.

**The revision** is in `DRD-63` property 2 and its summary, marked as revised in place. It amends nothing else. `DRD-35` property 7 and `DRD-37` property 4, as `DRD-63` amends them, already depend on property 2.

## 3. The recheck's two qualifications

### The saved M1 diff

**What the recheck found.** [`M1a.diff.txt`](measurements/2026-11-14-class-refactor-remediation/mutations/M1a.diff.txt) is a diff located by line numbers, taken at item 1's commit. At `42f42a164` it doesn't apply cleanly, because item 6 added two lines to `bounds.ts`. [`at-end.txt`](measurements/2026-11-14-class-refactor-remediation/mutations/at-end.txt) records which case failed, and not the error. So the report's record can't show how its end run applied M1.

**Disposition: a limit of the report's record, and no rework.** Property 1's witness stands on the recheck's own M1 at the end ([`m1.txt`](reviews/owner-class-refactor-remediation/recheck-reviewer-probes/m1.txt)):

- it applies each mutation by content;
- it saves the diff and the error;
- it gets the same failing cases as the report: T3 for `MotionConstraint`, and T1 and T2 for `DropTargetTracker`;
- the unmutated control passes.

The emitted `bounds.d.ts` and `drop-targets.d.ts` are also byte-identical to `5b581fbdf`'s, by both reports' `cmp`. **For the follow-up,** the handoff requires each mutation to be applied by content, and its record to save the error that the run gives. No general rule changes.

### The Godbolt probe

**The owner's answer to Q2 stands.** `DRD-63` property 5 records it as the owner's approval under CONTRIBUTING Part II §14. It rests on the owner's decision, with case C's inconclusive reading. The probe was always described as a temporary diagnostic for one example and one engine, and the approval doesn't depend on reading it again.

**What changes in the record:** property 5 now says that the probe's files weren't kept, so the record holds only its reported result.

**The three untracked files** were removed from the repository root while the remediation ran, and the report couldn't establish what removed them. No tracked file was affected:

- the input check passed before commit A;
- the recheck found the checkout clean at `6ec32ad06`.

The record takes no action on it. If the owner needs the probe again, the owner reproduces it.

## 4. Q4: the costs at the remediated end

**These are the final figures for the owner's reading.** The follow-up changes types and a declaration test, and it must leave every emitted `.js` file byte-identical to `42f42a164`'s (handoff, check 3). If it can't, it returns. So no figure below can move.

### Size

The figures are those of `npx just size` on the published build. The recheck measured both columns again on its own builds, and they equal the report's.

| Row | `5b581fbdf` min / gz / br | End min / gz / br | Δ min | Δ gz | Δ br | Ceiling verdict, `5b581fbdf` → end |
| --- | --- | --- | --: | --: | --: | --- |
| draggable alone (control) | 6,728 / 2,422 / 2,189 | 6,728 / 2,422 / 2,189 | 0 | 0 | 0 | over by 50 → 50 |
| draggable + lift | 11,459 / 4,369 / 3,927 | 11,677 / 4,362 / 3,932 | +218 | −7 | +5 | within |
| example: resize handle | 9,264 / 3,632 / 3,283 | 9,496 / 3,607 / 3,265 | +232 | −25 | −18 | within |
| example: drop zone | 13,055 / 5,061 / 4,562 | 13,287 / 5,058 / 4,570 | +232 | −3 | +8 | over by 131 → 139 |
| example: canvas group | 9,434 / 3,604 / 3,286 | 9,487 / 3,573 / 3,261 | +53 | −31 | −25 | within |
| freeDrag | 15,035 / 5,531 / 4,987 | 15,272 / 5,527 / 4,985 | +237 | −4 | −2 | over by 20 → 18 |
| freeDrag + bounds + landing | 16,199 / 6,021 / 5,416 | 16,630 / 6,041 / 5,455 | +431 | +20 | +39 | over by 206 → 245 |
| sortable + y | 20,137 / 7,261 / 6,555 | 20,852 / 7,243 / 6,547 | +715 | −18 | −8 | within |
| sortable + xy | 20,049 / 7,254 / 6,544 | 20,559 / 7,223 / 6,512 | +510 | −31 | −32 | within |
| complete | 21,673 / 7,915 / 7,132 | 22,568 / 7,910 / 7,150 | +895 | −5 | +18 | over by 67 → 85 |

- **Brotli:** −32 to +39 B per row. Five rows shrink, four grow and the control doesn't change.
- **Gzip:** −31 to +20 B per row.
- **Minified:** 0 to +895 B per row. Every row that reaches a converted module grows.
- **The red rows are the same five as at `5b581fbdf`.** No new row turns red.
  - Three grow: drop zone by 8 B, "freeDrag + bounds + landing" by 39 B and "complete" by 18 B.
  - "freeDrag" shrinks by 2 B, and the control doesn't move.
- **A correction.** The first assessment's Q4 and `DRD-63`'s costs named two growing red rows at the snapshot. Drop zone grew by 8 B there too. The remediation itself moves one figure: −1 B Brotli on "freeDrag + bounds + landing".
- **No budget moves.**

### Allocation

Three alternating rounds in the `shipped` project, with `__DEV__` false. The figures are sampled bytes per unit, from the report's §6, and the recheck recomputed them from the saved readings.

| Probe | `5b581fbdf` | End | Δ mean | Reading |
| --- | --- | --- | --: | --- |
| `y` committed move, cold, 200 crossings | 116.4 / 117.1 / 117.2 | 135.4 / 139.7 / 141.3 | +21.9 B per move | higher, disjoint ranges, keyed to `LinearShift.moved` |
| `y` committed move, warm, after 2,000 | 14.8 / 15.7 / 16.0 | 15.6 / 16.7 / 16.9 | +0.9 B per move | ranges overlap, no difference shown |
| `y()` lifetime, idle, 40 lifetimes | 3,196.2 / 3,196.7 / 3,200.1 | 2,762.0 / 2,780.1 / 2,790.1 | −420.3 B per lifetime | lower, disjoint ranges |
| `y()` lifetime, one operation, 40 lifetimes | 18,875.0 / 18,918.6 / 19,012.5 | 18,430.0 / 18,487.3 / 18,560.8 | −442.7 B per lifetime | lower, disjoint ranges |

- **Retained after 200 operations and destruction:** 728 B less at the snapshot, by the verification report. It wasn't measured at the end.
  - **By reading,** the remediation adds no retained object.
  - Item 6 changes one initial boolean.
  - Item 5 removes two fields from the published `LinearShift`. Its map exists only under `__DEV__`, and `shipped` folds it away.
- **The lifetime probe has no mutation witness,** as before.
- **Allocation isn't speed.**

### Timing

**No difference shown at the snapshot, which is inconclusive.** It wasn't run again, and no campaign is owed. Between the snapshot and the end, the published code differs in two places only:

- a fresh `bounds` constraint measures at its first `apply`;
- `LinearShift` has no development-only fields.

### What the owner answers

**Accept these costs,** and the architect records the refactor as accepted after the follow-up. **Or name the cost that is declined,** and the architect decides what follows. These figures carry the refactor's per-row costs:

- the per-move cost is the cold committed move's +22 B on `y()`, in `LinearShift.moved`, which falls as the code warms up;
- the per-row size cost is three red rows that grow by 8 to 39 B Brotli, and every minified row that reaches a converted module.

## 5. What remains before acceptance

1. **The follow-up unit,** [`class-refactor-receiver-handoff.md`](class-refactor-receiver-handoff.md), on `drag/class-refactor`, which the owner starts.
2. **The architect's reading of the follow-up.** The architect repeats its mechanical checks: the appended cases, the mutation, the six removals, and the byte-identity of the emitted JavaScript.
   - **No fresh reviewer is owed.** The change is types-only, its witness is a typecheck, and the recheck's other results stand.
   - The owner may still ask for a reviewer.
3. **The owner's answer to Q4,** on §4. It doesn't wait for the follow-up, because the follow-up can't move any figure.
4. **Q3** was built on its defaults: `DRO-13` stands, the receiver guard stays in the types, and the probe stays in the project. These stand unless the owner records otherwise.

**Then the architect records the acceptance:**

- `DRD-63` is implemented;
- `class-refactor-reviewer-1` to `-6` and `class-refactor-recheck-1` are closed;
- the status rows are updated.

**Opening and merging the pull request are the owner's.** No timing campaign is owed, and budgets are unchanged.
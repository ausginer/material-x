# RectIndex access: assessment

**Read:** [`rect-index-access-report.md`](rect-index-access-report.md) at `f788b2b80` on `drag/rect-index-ownership`, and the unit's source and test commit `010a9ef39`. **Governing records:** [`rect-index-access-handoff.md`](rect-index-access-handoff.md), and `DRD-61` and what it amends in [`00-index.md`](00-index.md). Assessed by the architect on 2026-11-13, in Chromium only.

**Outcome: accepted.** `010a9ef39` implements `DRD-61`, and no return condition was met. The size readings equal the figures `DRD-61` recorded, and no verdict changes. Allocation falls on three of the five probes. That is a reduction in bytes allocated, and it shows nothing about speed. The timing check reads "no difference shown" in all three cases. That result is inconclusive, so a speed change in either direction is unmeasured.

**One correction, to the architect's own records.** `DRD-61` property 11 and the handoff's item 7 treated the A/A threshold as a limit on a slowdown that the check could have missed. It isn't one, and `DRD-50`'s result had already said so (§3). Both records are corrected. The recorded verdicts and the paired rule stay as they are.

## 1. What the architect checked

The architect read the diff and the saved evidence. Nothing was rerun, because no concern needed a rerun to investigate it.

| Check | Result |
| --- | --- |
| `git diff --stat 2e47e7afe 010a9ef39` | The seven files of the handoff's §Boundaries, and nothing else. `f788b2b80` adds only the report and `measurements/2026-11-13-rect-index-access-unit-*` |
| The source diff, against the reference patch | `P-restored-names.diff.txt` applied to `8904947f6` in a scratch index (tree `efd1d98df`), then diffed against `010a9ef39`. Five differences, all listed in the report's §Where the code differs from the reference patch (§2) |
| Size | The saved base and end gate outputs differ only on the three `sortable` rows, by the figures the report gives. The six `VIOLATION` lines at the end are the base's six rows, and "complete" is over by 101 B |
| Suite verdicts | The saved base and end lists differ in four lines: the two W7 titles, and W8 and the receiver test at new line numbers |
| Lint and typecheck | The saved base and end ESLint lists differ only in `DRF-38`'s line, 57:3 → 53:3. The typecheck outputs are identical: `repo:RF-31` only |
| Mutations | Each saved output fails what the report's table states, and the four patches are the changes item 4 names |
| Allocation | The 30 totals were recomputed from the raw lines. The means equal the report's table |
| Timing | Sign counts, medians, thresholds, base medians and the shortest batches were recomputed from the saved JSON. They equal the report's table. The probe's `verdict` is `compare.ts`'s `pairedVerdict` with `timingSigns(7)` = 6. Its A/A difference has the opposite sign to `compare.ts`'s, and the rule takes the absolute value |
| The hold | In the implementing session's transcript, the probe is one foreground call made at 13:04:04. The next call is the release question at 13:05:06, and the one after it is at 13:06:57, after the release. The session started no background task or monitor |

## 2. The implementation

**Properties 1 to 10 hold** as the report's table states. The architect's comparison with the reference patch, which the architect ran at the port before `DRD-61` was recorded, reaches the same result. The five differences are accepted:

1. **The held placeholder x is two numbers, `heldLeft` and `heldRight`, with `NaN` for "none".** The reference patch kept a `[number, number] | null` tuple, which `DRD-61` properties 1 and 9 didn't allow. That was an error in the architect's patch, and the unit was right to correct it. The variables are written only in `__DEV__` branches, and the published bytes equal the patch's.
2. **The sink's `record` literal stays on one line.** The patch's reflow wasn't part of the decision.
3. **The module comment names all three reads and the axis.** It is accurate.
4. **The `#axis` comment** says that an index that never shifts keeps the default. That is true of `xy()`'s index, and the patch's "has none" wasn't.
5. **Three comments are rewrapped,** so `axis.d.ts` wraps one summary differently from the architect's diff. The words are the same.

The receiver test's spy moved from `settle` to `displaced`, as in the patch. Its title and assertions are unchanged.

**One reading convention differs from the handoff, and it is accepted.** The handoff asked for shares of "the base's mean operation". Each round's figure is a mean per operation, and the report divides by the median of `before`'s seven figures. That is the base figure the rule compares against.

## 3. Timing

### 3.1 The verdicts, as recorded

| Case | Rounds higher / lower | Median `production` − `before` | A/A threshold | Verdict |
| --- | --- | --: | --: | --- |
| A: `xy()` rebuild, no sink | 4 / 3 | +27.344 µs (+1.9 %) | 336.719 µs (23.4 %) | no difference shown |
| B: `xy()` rebuild, `layoutAnimation()`, nothing in flight | 3 / 4 | −32.812 µs (−2.2 %) | 669.922 µs (45.6 %) | no difference shown |
| C: `y()` scan of a grown window | 0 / 7 | −0.424 µs (−18.2 %) | 0.460 µs (19.7 %) | no difference shown |

These verdicts stand as recorded, under `compare.ts`'s paired rule as `DRD-50` property 2 applies it. The run completed on its first attempt, inside the hold, and it isn't repeated.

**What the verdicts show.** The rule found neither "slower" nor "faster" in any case. That doesn't show equal speed, and it puts no limit on a slowdown. Whether `xy()`'s rebuild, with or without the sink, or `y()`'s scan is faster or slower at `010a9ef39` is unmeasured. Case C's 7 of 7 lower rounds don't meet the rule, because the median is below the threshold, so case C isn't reported as faster. No case is "slower", so nothing goes to the owner under Part II §0 and §14.

### 3.2 The correction

**What `DRD-61` and the handoff said.** `DRD-61` property 11: "'No difference shown' bounds only a slowdown larger than its A/A bound", and "The speed below the timing check's bound is unmeasured". The handoff's item 7: "Report the median difference and the A/A bound … A slowdown smaller than the bound is unmeasured", with "`DRD-50`'s bounds were 27 % and 39 % of a rebuild". Its report contents also asked for "each case's verdict and bound".

**Why that is wrong.** Each sentence implies that a "no difference shown" reading rules out a slowdown larger than the A/A figure. It doesn't:

- the A/A figure is the largest absolute `control` − `production` difference among one run's seven rounds. The rule uses it as a threshold, and it has no stated confidence level;
- "slower" needs both a median above that threshold **and** `production` higher in at least 6 of 7 rounds. A slowdown larger than the threshold still reads "no difference shown" when noise reverses its sign in two rounds. In case B, single rounds ran up to 47 % above their arm's median;
- another run gives another threshold.

So a slowdown smaller than the threshold can't read "slower", and a larger one isn't excluded either. **`DRD-50`'s result and [`performance-window-correction-assessment.md`](performance-window-correction-assessment.md) §2 recorded this on 2026-11-12. The architect's `DRD-61` wording went back on it.** The report kept to the rule as the result stated it, and didn't use the wrong reading.

**What is corrected, in place, with what each used to say:**

- **`DRD-61` property 11,** the timing bullet and the bullet on allocation and speed;
- **the handoff's item 7,** §How the report reads it, and the report-contents line on timing.

Their new wording follows the report's proposal. "No difference shown" is inconclusive: the run met neither directional rule. The report gives the sign counts, the median difference and the threshold the rule used, and none of them limits the size of a slowdown that the check could have missed.

**What doesn't change:** the three verdicts, the rule, its 6-of-7 sign count, its threshold, and `DRD-61`'s routing of a "slower" verdict to the owner.

**The same reading elsewhere, not corrected here.** `DRD-52`'s result and `performance-plan.md`'s P4 summary of the size pass unit say that "no difference shown" on ten rows "doesn't exclude a slowdown below/smaller than" their A/A bounds. That implies that a larger slowdown is excluded. Both belong to an accepted earlier unit, and their verdicts aren't in question. The owner decides whether they are reworded the same way.

## 4. Allocation

**These are bytes allocated, not speed.** Heap sampling in the `shipped` project, Chromium, with `__DEV__` false. Three launches per probe and tree, all valid. A function's figure is a sampling estimate, and the attribution doesn't name a cause.

| Probe | End − base, mean | Larger than the spread in either tree? |
| --- | --: | --- |
| Per `y()` sample | −34.74 B (−40.5 %) | Yes |
| Per `xy()` sample | +0.21 B | No |
| Per committed move, cold | −11.77 B (−9.1 %) | Yes |
| Per committed move, warm | +1.39 B | No. The ranges overlap |
| Per drop with `layoutAnimation()` | −406.53 B (−10.9 %) | Yes |

The three reductions are the ones the proposal expected, and the two readings without a difference are as expected too. **They aren't a speed result.** §3 leaves the speed of the same paths unmeasured, and no record infers a speed change from these bytes.

The report doesn't establish what allocates in `shift`, `#read` and `at`, whose source constructs no object. That doesn't change the totals, and no unit is recommended for it.

## 5. What stays separate

- **Budgets:** no ceiling or control figure changes. The six red rows are the base's, "complete" stays over by 101 B, and nothing new goes to `DRO-4`.
- **Lint and typecheck:** the base's 49 ESLint errors, including `DRF-38`, and `repo:RF-31`, with nothing added and nothing repaired. `DRF-38`'s scope stays open.
- **The rollback report at `8904947f6`:** this assessment doesn't read or accept it. It stays pending.
- **Firefox and WebKit:** not run, and deferred to the owner's planned CI.
- **The deferred campaigns** stay stopped.

## 6. Next

`DRD-61` is implemented and accepted, and nothing in this unit is left open. The architect's next task in this record is reading the rollback report, when the owner asks for it.
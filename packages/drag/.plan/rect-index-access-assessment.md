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

**The same reading elsewhere, not corrected here.** `DRD-52`'s result and `performance-plan.md`'s P4 summary of the size pass unit say that "no difference shown" on ten rows "doesn't exclude a slowdown below/smaller than" their A/A bounds. That implies that a larger slowdown is excluded. Both belong to an accepted earlier unit, and their verdicts aren't in question. The owner decides whether they are reworded the same way. **Since then,** the owner directed the rewording, and both are corrected (§7.4).

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

`DRD-61` is implemented and accepted, and nothing in this unit is left open. The architect's next task in this record is reading the rollback report, when the owner asks for it. **Since then,** an independent review read the unit, and §7 records what the architect decided on it. The acceptance stands, and one follow-up item is open.

## 7. The independent review

**Read:** the [feature proof](reviews/rect-index-access/proof-reviewer.md) at `bdb2c73c8`, with its [probes](reviews/rect-index-access/proof-reviewer-probes/). It read `2e47e7afe..f788b2b80` and ran its checks at `30bf21e6e`, whose `src` and `tests` equal `010a9ef39`'s. It didn't read this assessment. Read by the architect on 2026-11-13 against `DRD-61` and §1 to §6 above. **Nothing was rerun:** the saved outputs and the review's probes answer each question below, and no concern is left that a run would settle.

**Outcome:** the three findings are accepted, each at tier C. Two are corrections of the architect's wording in `DRD-61`, made in place. One is a stale comment outside the unit's boundaries, which goes to a follow-up. The acceptance in §1 to §6 stands, and no verdict changes.

### 7.1 The source-only list's comment (`reviewer-1`)

At `010a9ef39`, `.scripts/vitest-config.ts:620–622` gives two reasons for keeping `tests/displacement-sink.browser.test.ts` out of the consumer project: the sink's "`report` and `settle`", and "`STRIDE` and `TOP` from `src/sortable/rect-index.ts`". `settle` no longer exists, and the test file imports neither constant. From `src`, it imports only the type `DisplacementSink`, `layoutAnimation` and `xy`, and its module comment already names `report` and `displaced`. **The list entry is still right,** because `report` and `displaced` are declared only by the unpublished installer types. Only the reasons are out of date.

The handoff's §Boundaries kept `.scripts/` out of the unit, so the unit couldn't fix the comment. **The fix is one comment, and it goes to the [handoff](rect-index-access-handoff.md)'s §Follow-up after the independent review.** That is the smallest follow-up: one implementer item with no test change, carried by the record that already holds the unit. No `DRF-` entry is registered, because the follow-up names the finding and closes it.

### 7.2 "Allocate nothing" and the bytes attributed to `at` (`reviewer-2`)

**Two readings of "allocate nothing".** Property 3 said "`at` and `item` allocate nothing". That can mean:

- **the source constructs nothing:** the function creates no array, view, closure or object, and returns a value that already exists;
- **the heap sampler attributes no bytes** to the function's frame.

**The property meant the first.** `DRD-61`'s rationale says "a read returns a number", and the things the decision removed are the scratch `Float64Array`s and their one-element arrays, which the source constructed. The wording didn't say so, and the report's "Yes" could be read against the second meaning.

**What the evidence shows:**

| Observation | Source |
| --- | --- |
| `at` is `return this.#values[(slot + LEADING) * STRIDE + field]!;`, and `item` is `return this.#items[slot]!;`. Neither constructs anything | `rect-index.ts:112–119` at `010a9ef39` |
| In the per-drop probe with `layoutAnimation()`, the sampler attributes 3,300, 3,288 and 3,600 B to `rect-index.ts:at` over 60 drops, about 55 to 60 B per drop, against totals of 3,293 to 3,336 B per drop | `…-alloc-end.txt` lines 139, 284 and 429 |
| No probe attributes bytes to `item` | the same file |
| The per-`y()`-sample and per-`xy()`-sample probes attribute no bytes to `at` in any of the six end launches. Their resolutions call `at` on every sample (`y.ts:57`, `64` and `79`, `xy.ts:74–81`) | `…-alloc-end.txt` lines 23, 52, 168, 197, 313 and 342 |

So **the source constructs nothing in `at` or `item`, and the sampler observes bytes in `at`'s frame in one probe's context and not in two others that also call it.** The bytes aren't a cost that every call of `at` pays. What object is allocated there, and why the sampler attributes it to `at`, isn't established. The report names numbers stored as heap objects as a likely cause and says it didn't verify it. This assessment doesn't adopt that cause either.

**Why the requirement is the source reading.** A byte attribution depends on the engine, its compilation tier and inlining, and on how the sampler assigns frames. The source can't promise it, and a reader can't check it from the source. What a consumer pays is the total per operation, which property 11 reports as allocation and keeps apart from speed. That total fell by 406.53 B per drop, beyond its spread.

**Decided:**

- **`DRD-61` property 3 is corrected in place.** `at` and `item` construct nothing: each returns a value the index already holds, and neither creates an array, a view or an object in its source. The property says that this isn't a byte count, and that a sampled reading attributed to either function is reported under property 11, with its cause stated only once it is established. **The report's "Yes" holds under it.**
- **`DRD-50`'s amendment by `DRD-61` is corrected the same way.** It said "Nothing is allocated for the sink" and that the drop's confirmation and `linearShift`'s probe "allocate nothing". The per-drop probe attributes bytes to `#read`, `travel` and `displaced`, so the same two readings apply. The amendment now says that nothing is constructed for the sink, and that the two reads construct no scratch of their own.
- **The rationale's "It removes allocation and adds none"** stays. It cites the probe totals at `f552e0ec9`, and at `010a9ef39` no total rose beyond its spread.
- **No probe is opened for the cause.** Knowing it would decide nothing that `DRD-61` requires, and the total it sits in fell.

### 7.3 W8's settled-top assertion and M8 (`reviewer-3`)

**What W8 asserts at `010a9ef39`** (`tests/displacement-sink.browser.test.ts:206–292`), after a resolution grows the window over `r3` while `r3` is in flight:

- **line 286**, `overR3.top - overR3.dy` equals `r3`'s flow top. `overR3.top` is the presented top that the test's own `getBoundingClientRect` wrapper recorded, and `overR3.dy` is what `layoutAnimation`'s sink answered. **Neither value is something `RectIndex` writes,** so this line checks property 6's sink against flow;
- **line 287**, the placeholder's gap equals the gap that the rows' flow positions give. The resolution chooses that gap from the index's settled centers, so **this line observes the index's settled value.**

**Which assertion fails under M8:**

| Run | Line 286 | Line 287 | Source |
| --- | --- | --- | --- |
| M8, development check on | passes | fails: −1 for 3. The check faults first, at slot 2, and the drag cancels | `…-unit-mutation-M8.txt` lines 25, 75 and 83–88 |
| M8, development check returned early | passes | fails: 2 for 3 | review's [`nocheck-M8.txt`](reviews/rect-index-access/proof-reviewer-probes/nocheck-M8.txt) |
| Development check returned early, no M8 | passes | passes, with all four tests | review's [`nocheck.txt`](reviews/rect-index-access/proof-reviewer-probes/nocheck.txt) |

**W8 detects M8 by itself, through line 287,** and the development check isn't what makes it fail. Line 286 passes in every run.

**The error was the architect's.** `DRD-61` property 10 said "W8, unchanged as a property: its settled top is the presented top minus `dy`", and the handoff's item 4.2 asked for that assertion. Once the index stopped exposing its storage, that line could no longer read the index. The unit implemented item 4.2 to the letter, and its report says only that W8 failed under M8, which is true.

**Decided:**

- **`DRD-61` property 10's W8 bullet is corrected in place.** W8 is unchanged as `DRD-50` states it: the gap a resolution holds when the window grows over a row in flight equals the gap of the rows' flow positions. The gap assertion observes the index's settled value, and M8 must fail it. The settled-top assertion is named as a check of the sink, which passes under M8.
- **No test changes.** The gap is what a consumer observes when a settled value is wrong. A test that reads the index's private storage would tie W8 to the layout that `DRD-61` hides. In development builds, the development check (property 9) also compares every window slot with a fresh measurement. The settled-top line stays as a check that the sink's `dy` describes the animation.
- **The handoff's item 4.2 stays as written.** It is the instruction the unit followed.

### 7.4 `DRD-52`'s result and the P4 summary

§3.2 found the same reading of the A/A bound in two records of the size pass unit and left them to the owner. The owner has directed both corrections. Both now say that "no difference shown" is inconclusive, that speed is unmeasured in either direction, and that the rows' A/A bounds are the rule's thresholds, not a limit on a slowdown. Each correction quotes what its record used to say. **The verdict of all ten rows, the bounds of 8 to 325 µs of script and 51 to 3,305 µs of task time, and the recorded overlap of four idle background tasks don't change.** [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md) §2.2 says only that a slowdown smaller than a bound can't read "slower", which is true, so it isn't changed.

### 7.5 The rest of the review

- **Timing evidence.** The review recomputed the three verdicts and agrees with §3. Its sign-test spans per case, from −28.9 % to +10.9 % for A, −45.6 % to +52.7 % for B and −38.7 % to −3.1 % for C, hold only if the rounds are independent and identically distributed. One unpinned process doesn't establish that, as the review says. They stay in the review as its reading, and no record turns them into a bound. Its account of case C agrees with the report: `control` was also lower than `before` in 5 of 7 rounds, so the pattern can come from the two bundled copies of the code. **The verdicts stand as recorded, and the speed of all three cases stays unmeasured.**
- **Ownership, geometry, sink protocol, tests and suite.** The review's null results agree with §2. Its note on W7, that rows read after a drag's last `displaced` call aren't checked, is recorded as a limit of the review's evidence, not as a finding. It changes no verdict, and no unit is opened for it.
- **Baseline errors and size.** The same 49 ESLint errors, `DRF-38`'s line moved, `repo:RF-31`, and the base's six failing size rows. Nothing changes.

### 7.6 Next

**One follow-up item:** the comment in the [handoff](rect-index-access-handoff.md)'s §Follow-up after the independent review, for an implementer, when the owner starts it. `DRD-61`'s acceptance stands. `DRF-38`'s scope, `repo:RF-31`, `DRO-4`'s re-base and the rollback report's acceptance stay separate. Budgets are unchanged, and the deferred campaigns stay stopped.
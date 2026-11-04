# D-208 final proof: the whole-decision feature proof

> **Consolidator's placement note, not part of the pass.** The `reviewer` pass's own `Write` to this path was refused by the harness ("Subagents should return findings as text, not write report files"), and it returned the report as text without routing around the refusal. The consolidator placed the text below unchanged, apart from formatting, as the round's artifact.
>
> **Two statements below need the summary beside them.** `integrity` used this pass's scratch worktree during about 09:05 to 09:22 UTC, unknown to both. So this pass's whole-suite run, mutation batch and probe are not cited from here. The consolidator repeated them on a private worktree at `bd3613d5f`: see [`d208-final-summary.md`](d208-final-summary.md) §The shared worktree. Every result repeated except **N8**: its 517 below is an artifact of that overlap, and the clean reading is 8 raw rows, 4 beyond the controls. This report's sentence that N8's count was unexplained stands as written, and that is its explanation.

**Round:** d208-final. **Pass:** independent feature proof, reviewer lens, as §29.9 of [`request-application-claude.md`](../architecture/request-application-claude.md) requires.

**Commit read:** `bd3613d5f` on `drag2/fin-review2`. **`src/` tree:** `c6c5e6ea59697efa8f27beae2700a574e6f3df4c`, read with `git rev-parse` at that commit. **Runtime comparison input:** `6905af249`.

## Outcome

**No correctness or semantic defect in `src/`. Nothing run here shows a regression against the input. The record's figures, its a3 wording and the owner's words hold.**

| Local id | Tier | Claim |
| --- | --- | --- |
| reviewer-1 | B | A classified fault raised after a destruction request in the same unit reaches no `onError`, while D-208 and I-36 say every diagnostic of that interval is delivered. No row pins the outcome. It equals the input's |
| reviewer-2 | C | `d208-requests.md` repeats _the profile cannot name which anonymous function_, the wording §27.3 corrected |
| reviewer-3 | C | `d208-requests.md` and `d208-step6.md` cite `kernel/unwind.ts:33` for a phrase at line 35 |

D-208 stays unimplemented. This pass marks nothing, closes no item and removes no row.

## Scope

**Covered:**

- the request/application and snapshot properties of §2, §6 and §18.4 against `src/`, by reading the kernel and running the suite, mutations and probes;
- the current D-208 entry in `00-index.md`, and §5's contract rows by spot check;
- every section of `d208-requests.md` against its sources;
- the seven comment corrections (§29.3);
- the composition evidence and the control attribution (§29.5).

**Not covered:**

- a3, the owner's acceptance, and any allocation, retained-heap or timing measurement. No statistical round ran;
- F-442, F-443, F-445, the compression pass and the planned terminology phase;
- a line-by-line reading of `sortable/` and `free-drag/`. I read their diagnostic routes, frame tasks and native listeners; the rest is covered only through the rows;
- 02, 03, 06 and 07 beyond §5's named rows. Old member names such as `destroy()` in the contract are outside the census by §20.4's own terms, so they are not reported;
- browsers other than Chromium.

**Isolation.** Everything ran in scratch worktrees under the session's scratchpad, removed afterwards. Nothing was run or written in the main checkout, apart from read-only `git` and `grep` and one `node bench/m2pp/rule.ts --help` that failed on a missing file and wrote nothing.

## Findings

### reviewer-1, tier B: a classified fault in the requested interval is discarded, and the text says it is delivered

**Finding.** A consumer slot that requests destruction and then throws gets no `onError`, in both behaviors.

**Current behavior and contract.**

- The fault reaches `#failOperation`, which reads `closed` as false, registers the failure and queues `FAILED` (`kernel/kernel.ts:823–859`). `#step` then declines that entry because the lifecycle is `REQUESTED` (`kernel/execution.ts:68–71`), and application clears the queue.
- D-208 (`00-index.md:2936`): _Before application, in `LIVE` and in the requested interval, every diagnostic is delivered_.
- I-36's operative statement (`05:248`): _the unit that registered the request completes as a live controller's, so its slots, its `onStart` or `onEnd`, its frame commits and its diagnostics are a live controller's_.
- The README (`README.md:74`) says the step _completes as a live controller's_.
- §2.4 and §2.10 point the other way: _Requests raised in the interval are recorded as usual and discarded at application_, and a failure is both a result and a request. I-22 gives destruction priority over a checkpoint. So the code has a design ground, and the texts disagree with each other.

**Why it is a problem.**

- A live controller reports the same throw, so _a live controller's_ is false for it, and the fault leaves no trace.
- The neighbouring routes do not lose it. An admission throw and an invalid `home` in the interval are delivered (_should report the admission failure of the unit that requested destruction_, _should report the invalid home of the unit that requested destruction_). A checkpoint a cancel supersedes arrives as a warning, under a comment saying _The error is not lost_ (`kernel.ts:2191`).
- No R33 row covers the case: rows (e) and (f) drive `report` and a retire hook. My search of `tests/` found no row that pins the outcome.

**It is not a regression.** The input gives the same result, so the first sentence of that D-208 paragraph, _the required behavior is the baseline's_, is met. That sentence and the next one cannot both be read literally on this path.

**Evidence, run here.** A scratch browser file through the public `freeDrag` and `sortable` entries with real pointer events, at `bd3613d5f` and at `6905af249`. Output was identical for both behaviors at both commits:

| Slot | `onError` and `onEnd` observed |
| --- | --- |
| `onStart` throws, no request (the control) | `DraggableError` stage 2 with the cause, then `onEnd` `canceled` |
| `onStart` requests destruction, then throws | nothing |
| `onMove` requests destruction, then throws | nothing |

> **Architect's dated correction, 2026-11-04 ([record §31.3](../architecture/request-application-claude.md)), not part of the pass.** _Identical for both behaviors_ overstates the `onMove` row. Sortable has no `onMove` slot, so its empty line shows a callback that never ran and is not evidence of its diagnostic behavior. The established scope is `onStart` in both behaviors and `onMove` in free drag. The pass's text stands as it placed it, and [`d208-final-summary.md`](d208-final-summary.md) holds the same correction beside the consolidator's table.

**Required property.** D-208's and I-36's statements about the interval agree with what a classified fault in that interval does, and a row pins the outcome. Whether the text narrows or the fault is reported is an architectural and contract call, routed to the architect and not decided here. A behavior change would touch `src/`, so it falls under §21.8.

### reviewer-2, tier C: the record repeats wording §27.3 corrected

**Finding.** `d208-requests.md:206` says _the profile cannot name which anonymous function_.

**Current behavior and contract.** §27.3: _The record's wording needs one correction. It says the profile cannot name which anonymous function. The harness's key is what loses it._ Reading the harness confirms it: `tests/perf/d208-step6.browser.test.ts:68` types `CallFrame` with `functionName` and `url` only, and `:122–126` key on those. §27.3 also says this frame books nothing in the `moveTo`, sample or committed-frame windows, so it cannot bear on the a3 cell. The record's sentence names only the drop windows and is true as far as it goes.

**Why it is a problem.** §29.9 asks whether the record states a3's limits truthfully, and this one attributes a limit of the harness to the instrument. It changes no outcome, and the record's next sentence, that this is a limit of the attribution, stands.

**Required property.** The final record states the limit as §27.3 corrected it. `d208-step6.md`'s original sentence is history and stays.

### reviewer-3, tier C: one line citation is off by two

**Finding.** `d208-requests.md:285` and `d208-step6.md:1495` cite `kernel/unwind.ts:33` for _the channel's identity_. At the frozen tree the phrase is on line 35, and line 33 reads _A closure per kernel_.

**Why it is a problem.** The record's limits name this site so that a reader can find it. The other site in that sentence, `sortable/spec.ts:1685`, is right.

**Required property.** The citation names the line at the tree the record freezes.

**Noted, not a finding.** `sortable/spec.ts:352` and `free-drag/spec.ts:255` read _The channel the spec publishes as `reportError`_ over the ungated `#deliver`. `#unwindArm`'s notifier (`kernel.ts:2813`) is an arrow over the route rather than the route. §29.3 is not a census and the freeze holds, so these are reported and left.

## Verification

**Key:** _ran_ means I executed it in this pass. _read_ means I read the code or text myself. _record_ means I took it from the record and did not repeat it.

### Identities

| Claim | Result | How |
| --- | --- | --- |
| `src/` at `bd3613d5f` and `65649c6d0` is `c6c5e6ea5…`; at `70368bfde` it is `c0713204a…` | holds | ran |
| The comment commit touches only five `src/` files; the record commit only `d208-requests.md`; the controls commit only `measure.ts` (six `control:` values, no `budget:`) and `budget-rebases.md` | holds | ran |
| No `budget:` changes after `71d91dbf6` | holds | ran |
| `budget-rebases.md` and `d208-step6.md` were appended to. Each diff's one deleted line is a trailing-newline change | holds | ran |

### The seven comment corrections (§29.3)

Each site reads as its _must state_ column requires, checked against the code it describes.

| Site, at the final tree | Now states | Result |
| --- | --- | --- |
| `free-drag/spec.ts:223–228` | one route and one channel over one sink, neither encoding severity | holds |
| `free-drag/spec.ts:207–208` | the kernel's own route refuses and discards a throwing handler | holds |
| `sortable/spec.ts:1693–1694` | callers are the kernel's own route and `panic`'s one delivery | holds |
| `kernel/kernel.ts:413` | the controller's route | holds |
| `kernel/unwind.ts:30–31` | built over one notifier: a minted channel or the controller's route | holds, with the note under reviewer-3 |
| `kernel/unwind.ts:38` | the notifier's terminus guarantees it does not throw | holds |
| `kernel/spec.ts:98` | each call allocates one function; the advice stays | holds |

**Run:**

- The diff changes only comment lines.
- All five files, transpiled with `removeComments`, equal their versions at `70368bfde` as strings.
- All 33 built declarations are byte-identical except `kernel/spec.d.ts`, whose one difference is that sentence.
- No changed comment carries a record identifier.

### The decision's properties

N-numbers refer to the mutation table below.

| Property | Result | How |
| --- | --- | --- |
| `requestClose` sets `REQUESTED` in a unit and applies at depth 0; `#leave` applies at the boundary; application is closed, queue cleared, teardown, promise (§2.4) | holds | read; N1, N2 |
| Destruction has priority, everything else is FIFO (§2.7) | holds | read; N1 |
| Panic is the one immediate application: close, report, tear down, behind its own terminus | holds | read; N13 |
| Ingress refused while a unit runs, before any state, with the disarm behind it (§2.1, F-433) | holds | read; N3 |
| Ledger read only at the runner, unit entries and intake; no read outside `src/kernel/` (§2.2, R21) | holds | ran `capture.node`, 15 of 15; read each entry |
| Cancel: phase rule, first registration wins, lapse, stage from the round-trip (§2.6, F-434, F-435) | holds | read; N9, N10 |
| Round-trip in its own unit, declining on a held cancel or a registered failure (§2.8, D-206) | holds | read; N4, N5 |
| Activation declines on a held cancel, at `ACTIVATE` and at `MOVE` at `PENDING` (D-207) | holds | read; N6, N7 |
| `START_COMMITTED` declines on a held cancel | holds | read; N8, see its note |
| Supersession captured at intake, decided at application (§2.10) | holds | read; N11 |
| U-C spans `draggable()`, window dispatch applied after publication, failure clears the queue (§2.9) | holds | read; N12 |
| Refusal written once, in `deliverUnlessApplied`; route and every channel deliver through it; four mint sites | holds | read; `grep` over `src/`; M1 to M3 |
| `channel`: delivers until application, absorbs a throw, works from the factory, drops after | holds | ran R33; read |
| Withdrawn machinery is gone: the `closed` member, `live`, the `rollback` members, `SEAM_INVALIDATED`, `#preparationValid`, `#settlementLive`, `#joinLive` | holds | ran `grep` |
| Slots captured at construction (§2.12, R19), in both behaviors | holds | ran a probe: reassigning `onEnd`, `onDrop`, `onReorder` and `onError` in `onStart` reaches none. R19's row is sortable only; this adds free drag |
| `moveTo` and the two query-result copies (R18, R34) | holds | ran the rows |
| Diagnostics in the interval | **see reviewer-1** | ran |

**Asynchronous entries.** `grep` over `src/` finds native listeners, one coalesced frame task and `animation.finished.then`. The frame task reaches the library through `dispatch`, so it is a unit. The scroll and resize listeners run at depth 0, where a request applies on its own statement and nothing further depends on it, as §2.3 states.

### R-cases

- **Every `_should …_` title** the `tests/COVERAGE.md` rows cite for R1 to R9, R11, R12 and R14 to R34 exists in the run and passes. Compared by script.
- **R10 and R13 have no coverage row.** Their tests exist and pass: _should have settled its promise when a request with no unit running returns_, _should return one promise from every request_, _should return one promise from every destroy call_.

### The whole suite, run once, every project

**1,424 pass, 5 fail, 68 skipped, of 1,497.** This agrees with the entry's 1,425 pass and 4 fail before the record existed. The failures are the record's failing set by name, and nothing else:

- `decisions.node`: _should hold every witness it claims_, the expected row. Not a defect, and not weakened;
- `docs.node`: _should resolve every reference a public type makes_, and the closure rows for the kernel, ordinary and free-drag tiers.

`react.browser` and `stories.browser` do not load, with React's _Incompatible React versions_ error: root `react` 19.3.1 against `packages/drag2`'s `react-dom` 19.2.7, as recorded. The 68 skipped rows are the gated `tests/perf` files.

**What the four `docs.node` rows actually see.**

- At the one configuration I ran with type checking on (`typedoc.json`), TypeDoc exits with code 3 on two type errors in `.scripts/`, in `vitest-config.ts` and `vitest-one-shot.ts`, before it reaches the surface. All four rows fail with code 3.
- So these rows cannot currently detect an unresolved reference in anything D-208 added.
- I ran each of the four TypeDoc configurations at the final tree with `--skipErrorChecking` and `--treatWarningsAsErrors`, and all four exit clean. The default configuration also exits clean at the input.
- That is a reading for this tree and not a repair of those rows. The record's _as before_ is true, but it does not say this. I report it as information, not as a finding, because these rows are a recorded limitation.

### Mutations, run once each, whole suite, at the final tree

Each was applied by exact-text patch and restored. Declared controls have been exact since `90c6dc41a`, so a kernel byte change also reddens the `size.node` control rows. The table counts rows beyond those, and M1 to M3 give the raw count in parentheses.

| Mutation | Rows beyond the controls | Against the record |
| --- | --: | --- |
| M1, the refusal removed | 19 (24) | equal, same names |
| M2, the refusal also reads `REQUESTED` | 11 (16) | equal, same names |
| M3, the route calls the sink without the refusal | 2 (7) | equal, same names |
| N1, `#step` stops only at `CLOSED` | 10 | mine |
| N2, `requestClose` applies inside a unit | 37 | mine |
| N3, ingress admitted while a unit runs | 5 | mine |
| N4, `OPEN_RESOLUTION`'s cancel clause dropped | 4 | mine |
| N5, its failure clause dropped | 6 | mine |
| N6, `ACTIVATE`'s held cancel dropped | 4 | mine |
| N7, `MOVE`'s held cancel dropped | 3 | mine |
| N8, `START_COMMITTED`'s held cancel dropped | 517 | mine; see below |
| N9, cancel stage read from the phase | 4 | mine |
| N10, cancel phase upper bound dropped | 1 | mine |
| N11, supersession not captured at intake | 5 | mine |
| N12, construction's drain removed | 2 | mine |
| N13, panic's report sent through the refusal | 3 | mine |

**No mutation escaped.** N8's 517 is far more than one clause explains, and it includes rows in files unrelated to cancellation. I did not establish why. It may be a run-wide cascade, so it shows that the mutation is seen and says nothing about which rows discriminate it.

### The record against its sources

| Claim in `d208-requests.md` | Result | How |
| --- | --- | --- |
| The outcome sentence, §28.1's wording | word for word | read |
| The owner's 2026-11-03 and 2026-11-04 quotations | verbatim against §24 and §28 | ran a string comparison |
| §28.1's _do not write_ list: none used as a claim. _a1_ and _discharged_ occur only inside the owner's quotation. _No regression_ for allocation appears only per named cell or as _the other 18 cells_, each named in `d208-step6.md` | holds | ran `grep`, read |
| Q-a3 did not run; the acceptance is this candidate's, sets no tolerance, is no precedent; the 2026-11-03 condition stands | holds | read against §28.1 |
| `node bench/m2pp/rule.ts` on the raw file reproduces `d208-m2pp-rule.json` | equal by value | ran |
| Set G's six rows, `R` on `E1` and `E2`, literal misses, `L`, `T`, V0 to V2 | match the rule's output | ran by script |
| V1's 1000-controller rows inconclusive at 4 B | holds, all three | ran |
| Low figures at 1000: 21 of 72 against 5 of 72; `E2` `k` at most 2, `m` −58.1, −31.5, −5.4 | holds | ran |
| The five literal cells | match set G's rounds and the resumed 6R's table | ran, read |
| The allocation rows and the per-sample table, against all 20 cells | match the rule's output. One inconclusive cell, none reaches `p < 0.0005`, lowest `p` is 0.0193 | ran |
| `S` 20.5 as the sum of `k − n/2`. `p` not recomputed, as §28.5 allows | holds | ran |
| The nine cells of the resumed 6R | match §Costs | read |
| §28.1's three unanswered questions and §27.4's limits, named | present, none summarized away | read |
| Attribution, 0 B in all 20 windows and 24 runs | `attributedBytes` 0 in the rule's output | ran. The anonymous-frame sentence is reviewer-2 |
| M-1's table and limits | match `d208-step6.md`. The carry holds: the 6R diff changes the constructor, `channel`, `#arm` and two new functions, none on the per-sample path | read. Call counts: record, from the recheck's run |
| I-26 as §24.3.3 states it, not restated for 6R's tree | holds | read |
| step4-D's two tables | match `d208-step6.md`. The `PointerEvent` is built outside the window, which is what makes the sum net of it | read |
| R21's table by location | matches `capture.node`'s pinned list, with the one re-pin since `71d91dbf6` | ran the row, read the diff |
| Mint sites, and the declaration and definition lines | correct at the final tree | ran |
| Closed items' commits (`e46e11493`, `7f1900ccf`, `70368bfde`, `65649c6d0`, `5b181a052`, `57d5b7326`) | each is what the record says | ran `git`, read |
| _Every declared control passes_, and the failing set | holds | ran the suite |
| The content items of §20.5, §21.8, §23.3, §24.5, §28.7 and §29.7 | present | read |

### Composition and the control attribution (§29.5)

| Claim | Result | How |
| --- | --- | --- |
| Final column, minified, Brotli and modules, all 15 rows | equal | ran `measureAll()` at `bd3613d5f` |
| Input column, minified, Brotli and modules, all 15 rows, at `6905af249` | equal | ran |
| 6R column, and the final minified and modules, all 15 rows, at `70368bfde` | equal | ran |
| Step 1 and step 4 Brotli columns, at `902810cae` and `dbbb62199` | equal | ran |
| Each figure in the per-step table appears in that step's own record | 150 of 150 | ran by script, as a text match on the row. This shows the figure is there and not its column |
| The 29 commits are complete for the paths the entry names | complete. `git log --full-history` finds none outside the table. `34aedf520`, `1a0e90487` and `2aeda69fd` are on the series the squash `bfd2832db` landed, so they are not ancestors of the final tree. Between `2aeda69fd` and `bfd2832db` only the root manifest and lockfile differ on those paths | ran |
| Readings at `34aedf520`, `0d89db92f`, `01d88645f`, `902810cae`, `dbbb62199`, `70368bfde` | equal the table on all six controls; `drag.js` 142 at each | ran, in detached worktrees with `npm ci --ignore-scripts` and rebuilds at each commit |
| The chain telescopes: moves per commit equal the delta table, and each column sums to its interval | +165, +240, +173, +226, +155, +27 | ran by script |
| Declared figures in `34aedf520`'s `measure.ts` | 8,116, 8,274, 8,276, 8,426, 142, 6,185, 6,889 | ran |
| `01d88645f` touches only the root manifest, the lockfile and `size-limit-preset-rolldown`'s manifest, and moves `rolldown` 1.1.5 to 1.2.15; baseline B moves there | holds | ran both sides |
| The one `packages/drag/src` change is `draggable/options.ts`, landing at `2aeda69fd` | holds; that it moves 0 rests on my readings either side of the series and the table | ran |
| No change to the other `tsdown` configs, `files.json` or `package-files.ts` | holds, at `box-quad`, `drag` and `vite-traits-plugin` | ran |
| Each `src/` commit's module reaches its row | sampled at `73d10432f` and `83c4433c1` | read. The rest: record |
| The other 22 commits' readings, and the second reading of eleven moving commits | not repeated | record |
| Slack: 116 to 143 B on thirteen rows, 63 B on `drag.js`, 124 B on baseline B | holds | ran from the table |

No control is unattributed, by the records and by every seam I repeated. Baseline B's cause stays what the entry says it is: the commit, not a named package.

## The four kinds of statement, kept apart

- **Measured and repeated here:** `measureAll()` at seven commits and the final tree, the suite, M1 to M3, the rule's output from the raw file, and the probe in reviewer-1.
- **Measured and taken from the record, not repeated:** M-1's 24 rounds, M-2″'s rounds, the allocation rounds, the call counts, the other 22 seam readings, and the run conditions such as host load.
- **Analysis in the record, read and found to agree with the code:** M-1's carry, and that no changed function runs in a sample, frame or `moveTo` window. That is reading and not a count, and the record says so.
- **Accepted uncertainty and unresolved limits, left as they are:** a3; `moveTo`'s lean, per call or lump; whether the lean recurs or follows the worktree; the arrow's exact count; the low state's cause at both trees; the 1000-controller lean; the 1000-controller row bounding gross growth only. This pass answers none of them, and nothing here should be read as doing so.

## Limits of this pass

- Mutations and probes ran once each in Chromium, on one machine, with other work on the host.
- The seam readings each had their own install. The probe worktrees shared the first scratch worktree's `node_modules`. A CSS cache file absent from a fresh install was copied from the main checkout so the test config would load; it feeds a package outside drag2's source.
- A mutation that reddens rows shows the rows see it. It does not show the property holds everywhere the mutation reaches.
- reviewer-1's search for a pinning row used `grep` over test titles and a reading of the neighbouring rows. It is not a census.
- I did not run the call-count row. It is gated, and the record's figure rests on the recheck's run.
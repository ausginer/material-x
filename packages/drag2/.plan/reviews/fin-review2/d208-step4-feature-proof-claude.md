# D-208 step 4: surface and behaviors — feature proof

**Trees read.** Implementation `dbbb62199`. Baseline `0c798ee17`, whose `src/` equals step 3's accepted `ef1e4ef6b`. Branch `drag2/fin-review2`. The suite ran in the shared checkout at `dbbb62199`, which was clean. Mutations, probes, composition, lint and the paired runtime runs used detached worktrees at `dbbb62199` and `0c798ee17`. Two more worktrees held the tip's tests over `c14ee4d5c`'s `src/` and over `0c798ee17`'s `src/`. One held `0c798ee17` with the façade's `closed` getter forced to `false`. One held the tip for the property-13 probes and the attribution builds.

**Subject.** `drag2:D-208` step 4, as `request-application-claude.md` §17.4 bounds it, amended by §18.4 and §18.6, together with what §17.4 requires step 4 to keep from steps 1–3. The inputs read were:

- D-208, D-207's superseded entry and F-441 in `contract/00-index.md`;
- `request-application-claude.md` §2.2, §2.5, §2.12, §3, §4, §5, §6, §7's R18, R21, R32 and R33 rows, §8 step 4, §17 and §18;
- `measurements/d208-step4.md`, and the step3-C correction in `d207-step3.md`.

**Scope.** The pass covered:

- the whole `src/` diff, read against the baseline: `kernel/kernel.ts`, `kernel/spec.ts`, both behaviors' `spec.ts`, `behavior.ts` and `controller.ts`, `free-drag/bounds.ts` and `runtime.ts`, `shared/composition.ts`, and the sortable's placement, rect-index, linear-shift, layout-animation, axis and slot modules;
- the new and changed rows in `diagnostic-intake.browser`, `kernel.browser`, `anchor.browser`, `features.browser`, `capture.node` and the declaration tests; the 32 deleted rows in `sortable.browser`, `placement.browser`, `y.browser`, `xy.browser` and `displacement.browser`; COVERAGE §Surface and behaviors;
- every claim in `d208-step4.md`: what landed, the published-surface table, the barrier inventory, cases, R21, the mutation census, composition, runtime analysis, property 13 and the contract list;
- the published `.d.ts` files, built at both trees and compared file by file;
- the contract and README diffs, and a search of 01, 02, 03, 05, 06 and 07 for statements that step 4 makes false.

It did **not** cover:

- step 5's comment pass or step 6's record;
- browsers other than Chromium, or M-2;
- `react.browser` and `stories.browser`, which load at neither tree;
- `docs.node`'s four rows, red at both trees, so the typedoc surface is checked only through the compiler and the declaration tests;
- a full read of 01, 02, 03, 05, 06 and 07. They were searched for `closed`, `live`, the old member names and the barrier vocabulary, and each hit was read in context.

## Result

**No step-4 blocker.** This pass raises four findings, all Tier C. None is a regression or a defect in what the code does. Every code and case requirement of §17.4, as §18.6 amends it, holds at `dbbb62199`. Two record obligations do not: step3-B's record correction (step4-B), and the allocation measurement §17.4 asks for (step4-D, discharged here by measurement):

- **API and SPI (§3).**
  - `destroy` and `cancel` are renamed `requestDestroy` and `requestCancel` on `BehaviorContext` (`kernel/spec.ts`), the façade (`kernel.ts:2567`, `:2581`), the armed controller (`:730`) and both controllers, with no alias. `InvalidationTask.cancel` keeps its name.
  - `BehaviorContext.closed` and the façade getter are gone. `channel(deliver)` is added, and the interface still names seven members.
  - `InsertionRuntimeView.live`, `DisplacementReport`'s `live` parameter and every threaded `live()` are gone. `RectIndex.refresh` and `LinearShift.refresh` return `void`.
  - The built declarations at both trees differ in exactly the files the record's table names, plus doc-comment-only changes in `kernel.d.ts`, `sortable/feature.d.ts` and both `domain.d.ts`. `CapturedPosition` is not published.
- **Diagnostic channel (§18.4).**
  - The refusal is written once, in `Kernel.channel` (`kernel.ts:2543–2557`). It reads `this.#bracket.closed`, which is `CLOSED` only, absorbs a throw from the sink and has no bypass.
  - The armed controller's route is a channel the façade mints at arming over `next.reportError` (`:2738`), and `#notify` is gone. Panic delivers to `spec.reportError` directly, behind its own terminus (`:680–689`). It is the one bypass, and it stays on the kernel's route.
  - Five channels are minted in `src/`, all at construction: the armed route, each behavior's own (`sortable/spec.ts:316`, `free-drag/spec.ts:234`), and each composition `report` (`sortable/behavior.ts:126`, `free-drag/behavior.ts:55`). The unwind guards run over them.
  - Field order is sound. `#deliver` is a field initializer and `#notify` and `#unwind` are assigned in the constructor body, so the channel never closes over an undefined sink.
  - Nothing under `sortable/` or `free-drag/` reads the lifecycle. A source-wide search finds no `.closed` and no `live()` outside `src/kernel/`.
- **Barrier removal.** The 23 in-unit `kernel.closed` reads and every `live()` read are deleted. Since step 1, `closed` reads `CLOSED` only, and destruction is applied only at a unit boundary, so every removed reading answered _live_ for the whole of its unit at the input.
  - I re-ran the record's experiment: the façade getter forced to `false` at `0c798ee17`. It adds exactly ten red rows to that tree's baseline run (1,385 passed, 10 failed). Five are `kernel.browser` rows that read `closed` as an instrument. Five are `sortable.browser` bench rows, deleted here, that call seams outside any unit. No production barrier was reached, which matches the record.
  - Every site in the record's inventory is synchronous within its unit. The behaviors' only deferred callbacks are the spatial frame task, which re-enters through `dispatch`, and `layoutAnimation`'s `finished` continuation, which only updates its own map. Neither carried a reading.
  - So each removal reaches code that already ran at the input, and §17.4's first and third escalation clauses are not triggered.
- **Capture (§2.12).**
  - `moveTo` copies `x` and `y` on the call into a `CapturedPosition`. A throw from the copy travels in the record and is thrown by the action's `prepare` (`free-drag/controller.ts:96–105`, `free-drag/spec.ts:570–579`), so D-91's `FAILURE_ACTION_PREPARE` holds.
  - `bounds()` copies the resolved rect field by field into a record allocated once per installation. All four fields are read before any is written, and the clamp reads only that record.
  - The landing tail destructures `duration` and `easing` before `element.animate` is looked up (`kernel.ts:1516`). At the input the member lookup ran first.
  - `home` and the sortable's `anchorTarget` already copied, as the record says.
- **Kept from steps 1–3.**
  - Every row outside the 32 withdrawn ones passes. None of the 32 belongs to steps 1–3, and those steps' rows include R3, R8, R16, R31's three rows, the five R30 rows, both null-command rows and reviewer-B's three.
  - `queue.ts`, `execution.ts` and `seams.ts` are unchanged, and `lifetimes.ts` changes only in a comment, so D-200 is untouched.
  - `OPEN_RESOLUTION`'s and D-207's entry clauses have no diff.
  - All eight N-mutations reproduce the record's counts (below).

| Check | Result |
| --- | --- |
| Full suite at `dbbb62199` (`vitest run`, every project) | 1,375 passed, 14 failed, 60 skipped. `react.browser` and `stories.browser` do not load. The 14 are the input's ten (six `size.node` controls, four `docs.node` rows) and the four budget rows. Matches the record |
| The tip's R18, R32 and R33 rows over `c14ee4d5c`'s `src/`, renames mapped back | R18's first row and all three R32 rows fail on their stated assertions: `[5, 5]` for R18, no `release.effect`, no action `effect`, and the pre-pull collection. All fourteen R33 behavior rows pass |
| The same over `0c798ee17`'s `src/` | R18's first row fails on its assertion. R32 passes, as step 3 delivered it. All fourteen R33 behavior rows pass, so their outcome is the baseline's, as §18.4 requires. The only other failures are rows that call `channel`, which does not exist there |
| Typecheck, drag2 | the two `.scripts/vitest-*.ts` errors only, as at the input |
| Lint, the 65 changed `.ts`/`.tsx` files | eslint: 13 errors at the tip, each also present at the baseline by rule and file. The baseline has 15: the tip's 13, plus `no-unnecessary-condition` in `sortable/spec.ts`, which went with a removed reading, and `prefer-includes` in `g3-conformance.browser`, which the tip no longer has. The record says the baseline has 14. oxlint: clean. `git diff --check`: clean |
| Composition (`just build`, then `measureAll()`, in both worktrees) | all 15 rows equal the record's _before_ and _after_ columns byte for byte. Module counts are equal on every row. Four rows are over budget (§Budget overruns) |
| Property 13 (`run.sh` at the input; at the tip, a scratch copy that maps `.destroy(`, `.cancel(` and `String(kernel.closed)` as the record does) | with the `closed=` field normalized and lines sorted (vitest interleaves P7's rows), the outputs are identical except P8's skipped count, down six with the deleted bench rows. All 18 model rows are `ok` at both trees. No probed row makes a consumer call that both the baseline and the target withhold. Matches the record |
| Published declarations | as under _API and SPI_ above |

**Mutations, all re-run at the committed tip**, each alone, over the whole suite, in a worktree. The counts exclude the input's ten rows, the four budget rows, and `references.node`'s on-disk path row. That row is red in a worktree at either tree, and red or green between unmutated runs there, but green in the shared checkout:

| Mutation | Red | Record |
| --- | --- | --- |
| **M1** the channel's refusal removed | 19: R33 (a)–(e) in both behaviors, (h), the R21 census, and seven kernel rows (R5, R28, R29, _refuse every later notification once onError destroys_, _run both scrubs when a reset throws during destroy_, the panic-order row, _read closed once the requesting unit has ended_) | 19 ✓ |
| **M2** the refusal also reads `REQUESTED`, through an added bracket accessor | 11: R33 (e) in both behaviors, (h), the R21 census, the accessor-derivation row, the two free-drag rows reporting the requesting unit's own failure, R5, armed dispatch's interval row, and the two instrument rows reading `applied()` inside the requesting unit | 11 ✓ |
| N1 `ACTIVATE`'s held-cancel clause | 4 | 4 ✓ |
| N2 `MOVE`'s clause at `PENDING` | 3 | 3 ✓ |
| N3 the phase rule's upper bound | 1 | 1 ✓ |
| N4 supersession not captured | 5 | 5 ✓ |
| N5 `FAILED`'s held-cancel reading | 5 | 5 ✓ |
| N6 intake demotes on a held cancel | 1 | 1 ✓ |
| N7 `OPEN_RESOLUTION`'s phase clause | 2: R4 and R32's release row | 2 ✓ |
| N8 `START_COMMITTED`'s held-cancel reading | 4 | 4 ✓ |
| step3-B witness, `if (!this.#bracket.idle) { void 0; }` in `#handleCancel` | 2: the ledger row and the R21 census | 2 ✓ |

**Reviewer-only mutations**, to check that each of the four replaced intake sites, and the census, is pinned on its own:

| Mutation | Red |
| --- | --- |
| RS: the sortable's own channel bypasses the kernel (a local `try`/`catch` over `#deliver`) | 5: the sortable's R33 (a)–(e) |
| RF: the same in free drag | 5: free drag's R33 (a)–(e) |
| CS: the sortable's composition `report` bypasses the kernel | 1: the sortable's R33 (d) |
| CF: the same in free drag | 1: free drag's R33 (d) |
| PB: panic delivers through the armed channel instead of directly | 3: R33 (c) in both behaviors and the kernel's panic-order row |
| BR: a `.closed` read added in the sortable spec's constructor | 2: both R21 rows |
| AL: `const { idle } = this.#bracket;` destructured inside `#handleCancel`, then read | **0**: the aliasing limit the record states |
| NB: `bounds()` keeps the consumer's rect instead of copying it | **0**: no row pins the copy |

## Cases and their discriminating evidence

- **R18.** _should commit the coordinates passed, not the object mutated afterwards_ discriminates. It fails at both earlier trees with `[5, 5]`, the mutated coordinates. _should read the coordinates once, on the call_ passes at both trees, because a depth-0 `moveTo` is applied before the call returns. The record says so. It pins the read count, not the timing.
- **R21.** Both rows are discriminating. Every N-mutation and the step3-B witness redden the census row, and BR reddens both rows (above). The census matches a lifecycle accessor or `#lifecycle` on **any** receiver, so an alias that reads through a property access is caught. A destructured accessor is not (AL), which is the aliasing limit the record states. R21 covers the cancel request and the registered failure source-wide. The supersession record is covered only inside the armed controller, by the ledger row, which the record says.
- **R32.** All three rows discriminate against `c14ee4d5c`'s `src/`, failing on their stated assertions rather than on a missing member. N7 reddens the release row. The sortable row's assertions match §7: one `canceled` with the reason, then `onReorder` with `version: 1, from: 0, to: 3`.
- **R33.** (a)–(g) have the baseline's outcome at `0c798ee17` and `c14ee4d5c`. They discriminate only through the refusal's mutations, which is what §18.6 requires. M1 reddens (a)–(e) and (h), and M2 reddens (e) and (h). RS, RF, CS and CF show that each behavior's own channel and composition `report` is pinned separately. The late-installer route is pinned by (d) alone: CS and CF redden only it. (c) reaches the panic through the kernel's unguarded `getSelection()` call at the threshold crossing, which is a platform stub rather than a harness flag.

## step3-B and step3-C

- **step3-B, the instrument half: repaired.**
  - `ledgerReads` matches every bracket getter whose body reads `#lifecycle`, derived from `ExecutionBracket`. A second row pins the derived set to `closed` and `idle`.
  - The armed controller's row lists `#onPointerDown: idle`, and its docblock states the per-member granularity as a limit.
  - The witness reddens the ledger row and R21.
- **step3-B, the record half: not done.** That is step4-B below.
- **step3-C: repaired.** `d207-step3.md` carries a dated correction. It says step 3 removed the published, optional `rollback` member from `Transition` and `ActionTransition`, both exported from `kernel.js`, and cites §3 on an unreleased API. That matches the declarations built at `c14ee4d5c` and `ef1e4ef6b`. `d208-step4.md` states its own published-surface changes with §3 as their authority, which was step3-C's lesson. One cosmetic slip: it names `sortable/runtime.d.ts`, which is not emitted. `InsertionRuntimeView` is declared in `sortable/slots.d.ts`.

## Budget overruns: attribution, kept apart from correctness

Step 4 grows four rows over unchanged budgets. Each component that causes the growth is one §2.12, §3 or §18.4 requires. I measured each cause separately by rebuilding the tip with one change reverted. Brotli is not additive, so a cause's figure holds only for the row it was measured on.

| Row | Brotli at the tip | Over | Tip with `bounds.ts` at the input | Tip with the landing-tail read reverted | Tip with panic routed through the channel |
| --- | --: | --: | --: | --: | --: |
| free drag + bounds | 8,495 | +72 | 8,435 (+12) | 8,474 (+51) | 8,474 |
| free drag + landing | 8,437 | +12 | 8,437 (+12) | **8,409 (−16)** | 8,436 |
| free drag complete | 8,628 | +52 | **8,575 (−1)** | 8,623 (+47) | 8,647 |
| kernel root — `kernel.js` | 6,320 | +8 | 6,320 (+8) | 6,316 (+4) | 6,319 |

- **`bounds()`'s copy** costs +178 B minified and +60 B Brotli on `free drag + bounds`, and +53 B Brotli on `free drag complete`. Without it, `free drag complete` would be 1 B under budget, and `free drag + bounds` still 12 B over. The record's +178 B minified figure is confirmed.
- **The landing tail's two-field read** costs +20 B minified and +4 B Brotli on the kernel root. On `free drag + landing` it costs +28 B Brotli. **It is the whole of that row's overrun**: without it the row is 16 B under budget. The record attributes the kernel root's growth to this read among others, but gives no per-row Brotli figure, so it does not show that `free drag + landing`'s overrun comes from the timing copy.
- **Panic's direct delivery** costs +8 B minified and 1 B Brotli on the kernel root.
- **The rest of the kernel root's +20 B Brotli**, about 15 B, is the channel restructure: `Kernel.channel`, the minted armed route, and the closures in place of `#notify` and the `closed` getter. Even with the landing-tail read reverted, the kernel root is 4 B over.
- **Nothing pins the two copies that cause three of the four overruns.** NB, `bounds()` without its copy, reddens no row. The landing tail's read order is verified only by reading. §17.4 requires no case for either, so this is evidence for the owner's disposition, not a defect.
- The sortable rows shrink by 83 to 148 B Brotli, as the record says. No module enters or leaves any graph.

The owner's disposition is outstanding. No budget was re-based, and no byte-recovery pass was made, as §17.4 requires.

## Runtime, kept apart from analysis

**Measured (this pass, not the record).** Both trees were run in one session, alternating which tree went first each round, with `VITE_DRAG_MEASURE=1`. Chromium. The host was shared, with a load average of about 5–7 on 12 cores.

| Measurement | Rounds per tree | Base `0c798ee17` | Tip `dbbb62199` | Paired |
| --- | --: | --- | --- | --- |
| M-1 allocation, sortable, 20,000 samples, no `gc()` between | 12 | 0.0 B/sample every round | 0.0 B/sample every round | equal |
| M-1 end-to-end, 50 rows | 36 | median 4.297 µs; 5 rounds above 6 µs | median 4.395 µs; 8 rounds above 6 µs | tip higher in 17, lower in 12, equal in 7; median difference 0 |
| M-1 end-to-end, 200 rows | 36 | median 4.102 µs; 4 above 6 µs | median 4.297 µs; 5 above 6 µs | 19 / 13 / 4; median difference 0.146 µs |
| free drag, bare, allocation | 12 | median 55.5 B/sample | median 54.0 B/sample | equal within noise |
| free drag, `bounds(element)`, allocation | 12 | 54.6 B | 53.5 B | equal within noise |
| free drag, `bounds(thunk)`, allocation | 12 | 45.5 B (one round 142) | 44.7 B (one round 142) | equal within noise |
| free drag, `bounds(thunk)`, per sample | 12 | median 4.297 µs | median 4.102 µs | tip lower in 8, higher in 3 |
| free drag, bare / `bounds(element)`, per sample | 12 | 3.906 / 4.199 µs | 4.199 / 4.102 µs | 6/4 and 5/5 |

- **Allocation.** Step 4 adds nothing per sample. The sortable reads 0.0 B at both trees, so I-26 holds there. The free-drag figures come from a review probe appended to a copy of `m1-prime.browser`, not tracked: the same harness, with warm-up, then 20,000 samples after one `gc()`. They include the harness's own `PointerEvent` per sample, about 50 B, at both trees. They bound step 4's change at about ±2 B, but they are not an absolute I-26 figure for free drag.
- **Timing.** **No difference is resolved.** The first 12 rounds leaned against the tip at both sizes, by 7 rounds to 2 and 8 to 2. The next 24 split 10 and 10 at both sizes, with a median paired difference of 0. The timer quantizes at about 0.195 µs, and both trees are bimodal, with a second mode near 10 µs that is somewhat more frequent at the tip (8 against 5 rounds at 50 rows). The figures bound a difference at about one quantum, roughly 5%. A smaller one cannot be excluded.
- **Consistent with the code.** M-1's sampled path is `MOVE` at `ACTIVE`, the sortable's `moved` seam and the frame-task schedule, and step 4 changes none of it. `bounds(thunk)`'s small lead at the tip is the direction the analysis predicts: the clamp no longer reads the consumer's rect each sample. It is within one quantum.

**Analysis (the record's, which I checked against the code).**

- Per active sample, the sortable loses its readings and free drag loses one property read before `onMove`. `bounds()`'s `apply` now reads one closure boolean and four fields of a record it owns. At the input, for a thunk source, it read the consumer's object four times per sample. Nothing is added to the per-sample path.
- Allocation per `moveTo` call: one record, and one more for a fault. Per controller: one closure per minted channel, five in all for a controller with its composition. Per composition report: the warning is now built before the refusal drops it, which after application allocates one object that is thrown away.
- `bounds()` with no source no longer allocates a `DOMRectReadOnly` per resolve.

The record makes no timing claim and measures nothing, though §17.4 requires that _allocation is measured_ (step4-D). The analysis predicts no per-sample regression, and none is measured.

## Failures by kind

- **Baseline failures, unchanged:**
  - six `size.node` control equalities and four `docs.node` rows;
  - `react.browser` and `stories.browser`, which do not load;
  - the two `.scripts` typecheck errors;
  - 13 of the baseline's eslint errors, by the same rules in the same files.
- **New failures:** the four budget rows. They are composition, not correctness, and they await the owner (§Budget overruns).
- **Regressions:** none. Every row from steps 1–3 that encodes a promise D-208 keeps passes, and no published outcome changes against the baseline.
- **Withdrawn promises: 32 rows**, all of which assert a barrier step 4 removes:
  - `sortable.browser` 6;
  - `placement.browser` 3;
  - `y.browser` 11, one of which is renamed into the surviving positive control;
  - `xy.browser` 8;
  - `displacement.browser` 4.

  I read the six `sortable.browser` rows. They call `spec.admit`, `command.admit` and other seams directly on a bench, outside any unit. The others drive `refresh`, `report` or `createPlaceholder` with a `live` predicate the API no longer has. COVERAGE strikes them with a dated note, and the README withdraws the destroying-resolver bullet.

- **Reserved for steps 5–6:**
  - the comment pass (step 5);
  - `d208-requests.md`, M-1's resolving measurement, and closing D-208, F-432 to F-435 and F-441 (step 6);
  - step3-B's record correction, which is now late (step4-B).

## Findings

### step4-A — contract text still states the withdrawn participant barriers as current · Tier C

- **Finding.** Step 4 removed every participant reading, and the restated I-36 says _the per-invocation reading is withdrawn in full_. Several contract passages outside the paragraphs step 4 amended still state the barriers, or `closed`, as current requirements:
  - **05 §Test matrix.** _Terminal barrier in a resolver sequence — new (C2-01)_ and _Terminal barrier on indirect consumer calls — new (C4-01)_ still require their rows. These include _the per-candidate resolver stopping at the candidate whose resolver destroyed, mirrored on both axes_, _a `refresh` entered already closed calling the resolver **zero** times_, and the direct-drive `live`-flipping rows. They are the rows step 4 deleted from `y.browser`, `xy.browser` and `placement.browser`.
  - **05 §The terminal barrier stopped at the seam boundary (F-47)** says _the defect is real and its fix survives at the floor: a participant that calls consumer code repeatedly inside one seam … reads the latch between calls_.
  - **02 §The phase is handed over** (`:784`) says _`BehaviorContext.closed` answers liveness (D-53)_.
  - **01** (`:486`) still says _D-203 withdraws it at its step 4, together with `closed` itself_, in the future tense.
- **Current contract.** F-63's rule: an amendment lands with the step that makes it true, and a present-tense statement the code does not implement is a defect. §17.4's contract list (I-36, I-37, 01 §`BehaviorContext`, 03, 07, README) does not name the 05 test matrix, 05's F-47 section or 02. The restated I-36 calls only the paragraphs before it _history_.
- **Why it is a problem.** No program behavior changes. But a reviewer using 05's test matrix as the list of required rows would report 32 legitimately withdrawn rows as missing, and 02 tells a behavior author there is a liveness member.
- **Required property.** No contract passage states a participant barrier, `live()`, or `BehaviorContext.closed` as a current requirement or member. Each is withdrawn or marked as history.
- **Routing.** The architect's, because the passages lie outside §17.4's contract list and their step is a contract call. Nonblocking for step 4.

### step4-B — step3-B's record correction to `d207-step3.md` was not made · Tier C

- **Finding.** §17.3's required property for step3-B has two halves. The instrument half is done. The other half reads: _`d207-step3.md`'s census table gets a dated correction. It moves the `dispatch` lifecycle read from the armed controller's list to the façade's, and adds `#onPointerDown` under the runner._ That correction is absent. `d207-step3.md`'s census row (`:79`) still lists _the armed controller's `#cancelWith`, `#failOperation` and `dispatch`_ and omits `#onPointerDown`. The commit's only change to that file is step3-C's correction.
- **Completion boundary missed.** §17.3 put the repair _before step 4's R21 row lands, or with it_. R21 landed in `dbbb62199`.
- **Mitigation.** `d208-step4.md` §R21 attributes every read correctly: `Kernel.dispatch` under intake, `#onPointerDown` under the runner's ingress refusal. So the evidence step 4 cites is right, and only the superseded table is wrong.
- **Required property.** As §17.3 states it.
- **Routing.** The implementer's. Nonblocking. step3-B should not be marked closed until it lands.

### step4-C — a minted channel reveals whether destruction has been applied, and the census cannot see it · Tier C

- **Finding.**
  - §18.4 item 3 says the channel _exposes no lifecycle value, so a behavior cannot branch on it_. D-208's _Not chosen_ rejects keeping a `CLOSED`-only predicate because _any behavior code could read it in any unit, and the read census cannot tell intake from a reading inside a unit by member_.
  - The tip's own `kernel.browser` helper `applied()` reads exactly that predicate through a probe channel. It mints a channel over a sink that sets a flag, calls it, and reports whether it delivered.
  - Any behavior can do the same in any unit, at the cost of one closure.
  - R21 cannot see such a read, because it is a call and not a property access.
- **Why it matters, and why it is only Tier C.** No consumer outcome is affected. §18.3's argument holds for the probe as for the refusal: inside any unit the applied lifecycle is never `CLOSED`, so a probe read in a unit always answers _live_ and cannot change what the unit does. The same argument would have held for a `CLOSED`-only `closed`, though, so the probe narrows the stated ground for rejecting option (2). The ground left is surface shape and intent, not capability.
- **Evidence.**
  - `tests/kernel/kernel.browser.test.ts`, `applied()`, used in seven rows: R5, R28, R29, the panic-order row, and the three execution-bracket rows.
  - `src/` mints five channels, all at construction, and no production code probes one (`grep '\.channel('`).
- **Required property.** D-208's record states what the channel does and does not prevent: a behavior can observe applied destruction through a probe, and the census does not detect it. Otherwise the decision's claim stands unqualified against a counter-example in its own tests.
- **Routing.** The architect's. No code change is implied. Nonblocking.

### step4-D — the record measures no allocation, which §17.4 requires · Tier C

- **Finding.** §17.4's _Keep_ list says: _Runtime evidence kept apart from analysis. Allocation is measured._ `d208-step4.md` §Runtime says _Not measured in this unit_, and states I-26 by analysis only (_nothing is allocated on it_). Step 4 changes free drag's per-sample path, through `bounds()`'s `apply` and `moved`. It also changes the sortable's committed move, which runs in the spatial frame's action rather than per sample.
- **Mitigation.** This pass measured the per-sample paths (§Runtime). Allocation per sample is equal at both trees on every arm, and the sortable's is 0.0 B, so I-26's status is unchanged. The committed move is not measured: M-1's samples run synchronously, so the spatial frame never fires in them. By reading, step 4 only deletes reads there.
- **Required property.** Step 4's runtime evidence includes a measured allocation figure for the paths it changed, kept apart from the analysis.
- **Routing.** The architect's: whether this pass's measurement discharges it, or step 6's record carries it. Nonblocking.

## Considered and not raised

- **R33 (c) uses a platform stub.** The panic is provoked by replacing `window.getSelection`, the one unguarded platform call at the threshold crossing. That is consumer-reachable and is not a harness flag, which is all §18.6 asks.
- **R33 (d) mixes two routes.** With RS or RF, (d) reddens through the teardown hook's report rather than the late `report`. CS and CF show that the late `report` alone also reddens it, so the route is pinned.
- **`FeatureContext.report` builds its warning before the refusal.** After application the object is thrown away. That is off any hot path, and the record states it.
- **`moveTo`'s published JSDoc** still says a malformed point _throws at the read_. The read is now at the call and the throw at `prepare`, and the classification it promises (`FAILURE_ACTION_PREPARE`) is unchanged. 07 and the README state the capture. The JSDoc pass is step 5's.
- **`reportError`'s SPI docblock** says it is _the one place in the library that invokes a consumer's `onError`_ and that _an implementation catches and discards_. Both composition channels call `merged.onError` directly, and the behaviors' `#deliver` does not catch. Both were already true at the input, and step 5's comment pass owns the wording.
- **The README's new bullet** says the library invokes no declared consumer slot _from application on_. It does not name I-36's relinquishment exception, under which teardown walks the installers' retire hooks. The previous bullet had the same omission.
- **03's D-37 table row on `placement.ts`'s `classList.add` reading** is history under its own _Survives D-37? — retired_ column, not a present-tense requirement.
- **`bounds()` with a throwing accessor.** All fields are read before any is written, so a throw leaves the previous bounds whole. With `stale` already cleared, later samples reuse them until the next invalidation. At the input a throwing accessor threw on every sample. Either way the first throw classifies, so I found no consumer-visible difference.

## Verification limits

- Chromium only. M-2 was not measured.
- `react.browser` and `stories.browser` load at neither tree, and `docs.node`'s four rows are red at both.
- Mutations and builds ran in detached worktrees with shared `node_modules`. `references.node`'s path row is unreliable there, and is excluded from every count.
- The baseline cross-runs mapped `requestCancel` and `requestDestroy` back by text. Each discriminating failure was checked to be its stated assertion and not a `TypeError`.
- Property 13 at the tip used a scratch copy of the probes with the record's three name mappings. The tracked probes are unchanged.
- The runtime figures come from one session on a shared host, with `__DEV__` true at both trees. They bound a difference and do not measure one. M-1' arms other than the review probe were not run.
- The contract was searched, not read in full (§Scope).
- All scratch worktrees were removed after the run, and the review probes are not tracked.
- This artifact was formatted with `just fmt`. `just lint` reports Markdown as ignored, so no lint pass applies.

## Dispositions proposed

| Item | Proposal |
| --- | --- |
| step4-A (Tier C) | The architect's: which step amends 05's test matrix and F-47 section, 02 §The phase is handed over and 01's future-tense sentence. Nonblocking |
| step4-B (Tier C) | The implementer's: step3-B's record half. step3-B stays open until it lands. Nonblocking |
| step4-C (Tier C) | The architect's: qualify §18.4's _cannot branch on it_ and the census's reach. Nonblocking |
| step4-D (Tier C) | The architect's: whether this pass's allocation measurement discharges §17.4's requirement, or step 6 carries it. Nonblocking |
| step3-B | Instrument half repaired and verified. Record half open (step4-B) |
| step3-C | Closed: the dated correction is accurate |
| Budget overruns | The owner's, at acceptance. Attribution above. No rebase was made |
| Step 4 | **No blocker found.** Acceptance is the architect's. D-208 stays `Unimplemented (Remediation)`, F-432 to F-435 and F-441 stay open, and the witness (`d208-requests.md` absent) holds. Step 5 does not start before acceptance |
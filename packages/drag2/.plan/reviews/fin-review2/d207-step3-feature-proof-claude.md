# D-207 step 3: kernel requests — feature proof

**Trees read.** Implementation `ef1e4ef6b`. Baseline `c14ee4d5c`, whose `src/`, `tests/`, `bench/`, `vitest.config.ts` and `.scripts/` equal step 2's accepted `877fb9612` (`git diff --stat` is empty). Branch `drag2/fin-review2`. The suite ran in the shared checkout at `ef1e4ef6b`, which was clean. Mutations, probes, composition, lint, typecheck and the paired runtime runs used detached worktrees at `ef1e4ef6b` and `c14ee4d5c`. One further worktree held the tip's tests over the baseline's `src/`.

**Subject.** `drag2:D-207` step 3, as `request-application-claude.md` §15.3 and §16.5 bound it, together with what §15.3 requires step 3 to keep from steps 1 and 2. The inputs read were:

- D-206 and D-207 in `contract/00-index.md`, and the F-440 entry;
- `request-application-claude.md` §2.2, §2.3, §2.6, §2.7, §2.10, §2.11, §3, §4, §6, §7, §15 and §16;
- `measurements/d207-step3.md`;
- the corrections in `d206-step2.md` and `d204-step1.md`.

**Scope.** The pass covered:

- the whole `src/kernel/kernel.ts` and `src/kernel/seams.ts` diffs, read against the baseline, with every handler that reads a ledger fact read in full at the tip. It also covered the `sortable/spec.ts`, `sortable/placement.ts`, `unwind.ts` and both `assemble.ts` diffs;
- the new and changed rows in `kernel.browser`, `features.browser`, `placement.browser`, `seams.node` and `capture.node`, and COVERAGE §Kernel requests;
- every claim in `d207-step3.md`: cases, the guard-site census, composition, runtime, property 12, the mutation census, property 13 and the contract list;
- the step2-A, step2-B and reviewer-F corrections.

It did **not** cover:

- steps 4–6: the renames, `closed`'s removal, the behaviors' `closed` and `live()` reads, `moveTo`, R18, R21 and I-36's rewrite;
- browsers other than Chromium, or M-2;
- `react.browser` and `stories.browser`, which load at neither tree. Their baseline status is carried from the earlier acceptances;
- a full read of the amended 02, 03, 05, 06 and 07. They were searched for every deleted member and predicate, and each hit was read in context.

## Result

**No step-3 blocker.** This pass found three findings, one Tier B and two Tier C. None is a regression, and none is a defect in what the implementation does. Every requirement §15.3 and §16.5 state for step 3 holds at `ef1e4ef6b`:

- **Request-read placement.** No handler reads a ledger fact below its entry.
  - The cancel request is read at intake (`#cancelWith`, `kernel.ts:744–758`; `#failOperation`'s supersession capture, `:825`) and at the entries of `MOVE` at `PENDING` (`:1813`), `OPEN_RESOLUTION` (`:1925`), `ACTIVATE` (`:1979`), `CANCEL` (`:2038`), `START_COMMITTED` (`:2114`) and `FAILED` (`:2154–2156`).
  - The registered failure is read only at `OPEN_RESOLUTION`'s entry, and the supersession record only at `FAILED`'s.
  - The lifecycle request is read at intake (`:748`, `:791`), by the channel (`:454`) and before an ingress pass (`:1161`). In the façade it is read by `dispatch` at intake (`:2584`) and by the `closed` getter (`:2553`), which step 4 removes.
  - This is §6's set. `#preparationValid`, `#settlementLive` and `#joinLive` are gone, and so are `#settleResolution`'s and `#handleErrorReported`'s lifecycle conjuncts and `#runAdmission`'s recheck.
- **Currency conjuncts.** The ones deleted below an entry were unreachable there:
  - `#runAdmission`'s `current.operation` conjunct, because `#openIngress` admits only when no operation exists and the bracket refuses a nested pass;
  - its `closed` conjunct, which has read `CLOSED` only since step 1, so a request inside admission could never satisfy it.

  `#settleResolution` keeps attempt identity. That is sufficient because applied destruction clears the attempt slot first (`#release` step 3, `#retireAttempts`). R20 holds it.

- **Cancellation.** `#cancelWith` registers only at `PENDING` to `RELEASING` (`phases.ts`: 1–4), is a no-op on a duplicate and once `CLOSED`, and queues `CANCEL` with the identity. `CANCEL` consumes the request at its entry and applies or lapses by phase.
- **Failure ordering.** The intake demotion on a held cancel is gone. The checkpoint records `superseded` at intake, and `FAILED` decides on that record or on a cancel still held at its entry. That is §2.10, both halves. R16's two orders behave as §2.10 states. I found no reachable order that disagrees with _or on a cancel still held at its entry_.
- **Rollback removal.**
  - `SEAM_INVALIDATED` is gone (outcomes renumbered 0–3), along with `Transition.rollback`, `ActionTransition.rollback`, the kernel's action adapter, `seam/rollback-failed`, the activation policy's invalidated arm and the staging conditional.
  - The sortable's D-39 ledger is deleted: `PlaceholderUndo`, `restoreAttribute`, `willWrite`, the `undo` parameters and `rollbackActivation`.
  - `#unclassifiedReason`'s initial value is now `''`. The landing measurement is the one `UNCLASSIFIED` opener (`seams.ts:348`), and it sets the reason first.
  - §2.11 holds. The ledger replayed only on an invalidated preparation, never on a throwing `prepare`, so no remaining `prepare` side effect was ever undone. §15.3's fifth escalation clause is not triggered.
- **D-207's clause.** `ACTIVATE` and `MOVE` at `PENDING` decline at their entry on a held cancel. Each reads one field before any work, and a declined `MOVE` writes no pointer coordinates. `MOVE` at `ACTIVE` gains only a comparison of a local. The clause landed in the same commit as the deletions.
- **R31.**
  - The keyboard row is unchanged (`keyboard.browser` has no diff) and passes.
  - The kernel command row and the pointer row pass. They assert no settlement and no report, and that the operation was retired. The `MOVE` clause has its own row, because a `pointermove` dispatched inside an action at `PENDING` is queued as `MOVE` ahead of the `CANCEL`.
  - R3 stays distinct: it is green under both N1 and N2.
- **Kept from steps 1 and 2.**
  - Every step-1 and step-2 row passes, including the five R30 rows, both null-command rows and reviewer-B's three.
  - `OPEN_RESOLUTION`'s five clauses are read at its entry. Registration is written only in `#failOperation`, beside the queued checkpoint.
  - `closed` reads the bracket and reports `CLOSED` only.
  - `lifetimes.ts`, `queue.ts` and `execution.ts` are unchanged, so D-200 is untouched.
  - The census row lost exactly its `#preparationValid` exception.

| Check | Result |
| --- | --- |
| Full suite at `ef1e4ef6b` (`vitest run`, every project) | 1,385 passed, 10 failed, 60 skipped. `react.browser` and `stories.browser` do not load. The 10 are `docs.node` ×4 and the six `size.node` control rows: the input's ten. The 13 budget rows step 2 left red pass. Matches the record |
| The tip's tests over the baseline's `src/` (`kernel.browser`, `features.browser`, `keyboard.browser`, `placement.browser`) | 312 passed, 7 failed. The 7 are R3 ×2, R8 ×2, R16's first order and the two kernel R31 rows: exactly the record's _at the input_ set. The keyboard R31 row passes at both trees |
| Typecheck, drag2 | the two `.scripts/vitest-*.ts` errors only, as at the input |
| Lint, the 12 changed `.ts` files | eslint: 10 errors at both trees, with the same rules in the same files (`seams.ts` `only-throw-error` ×2 and `no-unnecessary-condition` ×2; `no-unnecessary-condition` in both `assemble.ts` and in `sortable/spec.ts`; `consistent-return` in `sortable/spec.ts`; `unbound-method` in `kernel.browser` and `features.browser`). oxlint: clean |
| Composition (`just build`, then `measureAll()`, in both worktrees) | all 15 rows equal the record's _before_ and _after_ columns byte for byte, and module counts are equal on every row. All 13 kernel-carrying rows are under budget, by 12 B (kernel root) to 231 B. No budget changed |
| Property 13 (`probes/snapshot-units/run.sh` at both trees) | the outputs differ in exactly three lines: P4 (R8), P5's cancel line (R3) and P7's cancel-in-`release.prepare` line, as the record's table shows. All 18 model rows are `ok` at both trees. P8's four lines are unchanged |
| Census of object-valued library constants (independent TypeScript-API pass over `src/`) | 13, the same list as the repaired row. step2-A's required property holds |

**Mutations, all re-run at the committed tip**, each alone, over the whole suite, in a worktree. The counts exclude the ten baseline rows:

| Mutation | Red | Record |
| --- | --- | --- |
| N1 `ACTIVATE`'s clause | 3: keyboard R31, kernel command R31, ledger row | 3 ✓ |
| N2 `MOVE`'s clause at `PENDING` | 2: pointer R31, ledger row | 2 ✓ |
| N3 phase rule's upper bound | 1: R8's registration row | 0 over the run, then 1 alone after that row was written ✓ |
| N4 supersession not captured | 4: R16 first order, the two cancel-then-fail rows, ledger row | 4 ✓ |
| N5 `FAILED`'s held-cancel reading | 4: the two fail-then-cancel rows, `composition.browser` _should apply work a callback queued before it threw_, ledger row | 4 ✓ |
| N6 intake demotes on a held cancel | 1: R16 first order | 1 ✓ |
| N7 `OPEN_RESOLUTION`'s phase clause | 1: R4 | 1 ✓ |
| N8 `START_COMMITTED`'s held cancel | 3: _should not reach ACTIVE…_, both census rows | 3 ✓ |
| `OPEN_RESOLUTION`'s failure clause | 5: the four discriminating R30 rows, ledger row | 5 ✓ |
| `OPEN_RESOLUTION`'s cancel clause | 3: R22, the null-command cancel row, ledger row | 3 ✓ |
| the release unit opens the round-trip inline | 12: R4, R5, R22, R28, R29, the order row, both null-command rows, the two kernel resolver R30 rows and the two sortable R30 rows | 12 ✓ |

Under N1 one `references.node` row also went red. That row reads only documents, never `kernel.ts`. It passed when re-run under N1 alone. The red was transient and came while my probe and build runs used the machine at the same time.

**Corrections from earlier reviews.**

- **step2-A is closed by the repair.** `objectConstants` now looks through `as`, `satisfies`, parentheses, non-null and angle-bracket assertions. It lists 13 constants, and the independent pass finds the same 13. The dated correction in `d206-step2.md` names `877fb9612` and classifies the seven added constants by their uses. That matches what this pass read at step 2.
- **step2-B is closed.** The dated correction states one more field read, one more argument and one call fewer per active sample, for `877fb9612` against `222445777`. That is the required property.
- **reviewer-F is closed.** `d204-step1.md` now says four of the five. COVERAGE names `3e44eaf62` for the count of 6 and gives the later counts. This tree's 12 is checked in the mutation table above.

## Outcome differences against the contract

| Difference (probe or row) | Contract | Assessment |
| --- | --- | --- |
| R3: `onStart`, then `canceled` at `AT_PROPOSAL` (P5; `kernel.browser`, `features.browser`) | §4 item 3, §7 R3 | required |
| R8: no registration at `SETTLING`; the drag ends, retires, and the next press admits (P4) | §7 R8, F-434 | required |
| R16 first order: `failure/superseded-by-cancel` at `FAILED`'s application, one `canceled` | §4 item 7, §7 R16 | required |
| R31: no `activation.prepare`, then silent retirement; the baseline ran `activation.prepare` and discarded it | §16.3, §7 R31 | required. Consumer-visibly the same as the baseline |
| D-39: a cancelling `placeholder` factory's element is adopted, started, cancelled and removed, not returned clean | §2.11, §3, §15.3 | required. The ledger is deleted by decision |
| P7: a cancel raised in `release.prepare` now runs `release.effect` before the `canceled` settlement | not stated by §4 or §7 | **step3-A** |
| A cancel raised in a behavior action's `prepare` now runs that action's `effect` before `CANCEL` | not stated, not recorded, not probed | **step3-A** |

## Runtime, kept apart from analysis

**The record's measurement.** Three M-1 runs at the tip only, taken while a build ran: 20.3, 70.3 and 40.6 µs at 50 rows. The record makes no timing claim from them, and that reading is correct. Its allocation figure, 0.0 B per sample, is the measured property.

**Independent measurement.** The same harness and arms (`VITE_DRAG_MEASURE=1`, `tests/perf/m1.browser.test.ts`, end-to-end and allocation) ran at `c14ee4d5c` and `ef1e4ef6b` in the same session, in Chromium, in the `browser` project, with `__DEV__` true on both trees. There were two batches of 16 alternating pairs, the first 8 baseline-first and the last 8 tip-first: 32 runs per tree.

| Tree | Rows | Median, all runs | Runs in the >5 µs mode | Low-mode median (range) |
| --- | --- | --: | --: | --- |
| baseline | 50 | 5.273 µs | 18 of 32 | 4.199 µs (3.516–4.688) |
| tip | 50 | 4.590 µs | 10 of 32 | 4.297 µs (3.711–4.688) |
| baseline | 200 | 4.688 µs | 14 of 32 | 4.102 µs (3.418–4.883) |
| tip | 200 | 4.492 µs | 11 of 32 | 4.297 µs (3.711–4.688) |
| both | allocation arm, 32 runs each | — | — | **0.0 B per sample, every run** |

The figures are quantized at about 0.1 µs and are bimodal: a low mode around 3.5–4.9 µs and a high mode around 7–12 µs. Paired differences are dominated by which mode a run lands in. The session was noisier than step 2's, with a load average of about 8 on 12 cores.

- The tip landed in the high mode less often. The overall medians therefore favour the tip, but the mode is not a property of the tree: it varied between batches on both.
- The first batch's low-mode medians differed by two quanta (baseline 4.102 µs, tip 4.297 µs at both sizes). The second batch did not reproduce that: 4.297 µs on both trees at 50 rows, and 4.102 against 4.199 µs at 200 rows. The low-mode ranges overlap completely.

**No end-to-end difference is resolved at about 0.1–0.2 µs, roughly 3–5%. A smaller one cannot be excluded.** Allocation is the only measured runtime property, and I-26 holds.

**Code analysis.**

- **Per active sample (`MOVE` at `ACTIVE`).** The new clause adds one comparison of a local (`phase === PENDING`), which is false and short-circuits. Nothing else on the per-sample path changed. The `placement.ts` deletions (`willWrite`, the `undo` parameters) are reached from `createPlaceholder` at activation, not from `movePlaceholder`.
- **Per `MOVE` at `PENDING`.** One field read more.
- **Per activation.** The driver's predicate call is gone, and so are its two reads and the post-effect revalidation. With a `placeholder` slot composed, so are the ledger array and its four closures.
- **Per settlement.** `#settlementLive` and every `#joinLive` call on the join's route (up to four) are gone. So are `#settleResolution`'s and the error route's lifecycle reads.
- **Per failure.** One more boolean field on a checkpoint record that is already allocated.

**No runtime regression was demonstrated, and the analysis predicts none.** The deletions remove work from the activation and settlement paths, and the active path changes by one comparison. M-1's resolving run is still step 6's.

## Findings

### step3-A — §4 states the "effect still runs" consequence for activation only · Tier C

- **Finding.** Deleting `runCore`'s revalidation (`seams.ts`, the `#preparationValid` branch) means a cancel raised inside **any** seam's `prepare` no longer discards that preparation. The seam commits and its `effect` runs, and the `CANCEL` applies after the unit. §4 item 3 and R3 state this for activation only. Two more seams carry it:
  - **release.** P7 shows `release.effect` running. In the sortable that is `movePlaceholder` to the release gap and `lift.write` to the release point (`sortable/spec.ts:1376–1405`), before the cancellation settles. `release.prepare` reaches consumer code: the axis rebuild's `box` resolver and the custom placeholder, which the behavior's own comment names (`sortable/spec.ts:1316–1330`).
  - **behavior actions.** At the input, a cancel raised in an action's `prepare` returned `SEAM_INVALIDATED` and skipped `effect`. Now `effect` runs. The sortable's collection `prepare` calls the consumer's `items()` (`sortable/spec.ts:1006`), so a consumer that cancels from `items()` now has its collection published, and at `ACTIVE` the rect index invalidated, before the cancellation. This is reasoned from the code and was not probed. The record does not mention it.
- **Current contract.** §15.3's first escalation clause covers a deletion that changes a published outcome other than those §4 and §7 state. §4 is titled _complete_. The record treats P7 as consumer-invisible except through a custom placeholder's reaction, and records it rather than escalating.
- **Evidence.**
  - `run.sh`'s P7 line, which I reproduced.
  - A review probe (not tracked) appended to a copy of `features.browser`, with a cancelling `box` resolver armed only for the release and a custom-element placeholder that logs each connection. It gave the **same consumer trace at both trees**: the placeholder's connections, one `canceled` at stage 20 (`AT_PROPOSAL`), no finish. The probe did not establish whether `box` ran inside `release.prepare` in that trace. The placeholder was already at its final gap, so a same-gap move would not show a reconnection.
  - No consumer-observable difference has been demonstrated. Two that the code admits are a custom placeholder's reaction to a release move to a different gap, and a landing tail that starts from the release point rather than the last sample.
- **Why it is a problem.** Each change follows from §2.11's _no request can invalidate a successful prepare_ and from §7's trace-equivalence principle. They are not implementation defects. But §4 is the list the owner reads for consumer-visible change, and it names one of three seams. Whether these are published outcomes is a contract call, and the implementer decided it without the architect.
- **Required property.** §4, or the record, states the outcome for a cancel raised in each seam's `prepare`, or states why the release and action cases are not published outcomes.
- **Routing.** The architect's. Nonblocking for step 3: the code does what §2.11 and §15.3 require.

### step3-B — the ledger census row does not see a lifecycle read through `idle` · Tier B

- **Finding.** `capture.node`'s _should be read only at intake, the channel and unit entries_ (`ledgerReads`) recognizes a lifecycle-request read only as the property access `this.#bracket.closed`. `ExecutionBracket.idle` also reads the lifecycle request (`execution.ts:118–120`), and the armed controller reads it in `#onPointerDown` (`kernel.ts:1161`). That read is a legitimate one, the runner's refusal before an ingress pass. The row does not list it, and it would not list one placed anywhere else.
- **Evidence.**
  - I inserted `if (!this.#bracket.idle) { void 0; }` into `#handleCancel`'s body, after its entry reads. `capture.node` stayed 12 of 12 green. The source was restored afterwards.
  - By reading, the same holds for any member, because `idle` is not among the matched names.
  - The record's census table puts `idle` under _the runner_ only and does not list `#onPointerDown`. It also lists `dispatch` among _the armed controller's_ lifecycle reads, but the armed `dispatch` (`kernel.ts:2426–2444`) reads none. The read is the façade's (`:2584`).
- **A second, inherent limit.** The row reports `member: fact`. A further read of an already-listed fact later in the same handler, after the unit has done work, leaves the list unchanged. The record states the aliasing limit but not this one.
- **Why it is a problem.** §6 makes the reading-site set a structural acceptance criterion, and COVERAGE cites this row as holding _no unit reads the ledger after its entry_ for the armed controller. Tier B: an instrument the repository relies on is incomplete. **No such read exists today.** A `grep` for `idle`, `closed` and the three ledger fields finds only the sites listed under _Request-read placement_ above.
- **Required property.** The structural row detects every lifecycle-request read in the armed controller, `idle` included, and lists `#onPointerDown`'s. The record states the row's per-member granularity as a limit, or the row discriminates placement within a handler.
- **Routing.** The implementer's. Nonblocking for step 3. It is required before R21, step 4's structural case, or `d207-requests.md` relies on the census.

### step3-C — the record says no published declaration named the removed `rollback` members · Tier C

- **Finding.** `d207-step3.md` §What landed says: _"No published type changes except the removal of the `rollback` members, which no published declaration named."_
- **Current behavior.** At the baseline, the shipped `kernel/seams.d.ts` (the package's `files` include `kernel`) declares `rollback?` on both `Transition` and `ActionTransition`. `kernel.d.ts`, the `./kernel.js` export's types, exports both types. The removal is a change to the published kernel-tier SPI.
- **Why it matters.** It is decided: §3's SPI table removes all four members on an unreleased API. No declaration test names them, so no row had to change. The sentence misstates the surface, though, and a reader checking D-207's _Surface: none_ against the record is told nothing changed.
- **Required property.** The record states the published-surface change, with §3 as its authority.
- **Routing.** The implementer's, in this record or step 6's. Nonblocking.

## Considered and not raised

- **A checkpoint superseded at intake whose cancel later lapses.** If an entry queued ahead of `CANCEL` decided the operation, `FAILED` would still report `superseded-by-cancel` for a cancel that never applied. That follows §2.10's literal rule, which is decided on registration. I built no reachable order: every producer I traced queues the cancel ahead of the state change, or demotes. At the input the same failure was demoted at intake with another warning code, so neither tree delivers it as `onError`.
- **R1's admission row passes at both trees.** It cannot discriminate the deletion, because the deleted conjuncts were already unreachable (see _Currency conjuncts_). The record says it passes at the input.
- **`#cancelWith`'s `#operation!` during retirement.** Behavior and consumer code runs in steps 4 and 5 of `#release` while the frame still names the operation. The records are dropped only after step 6, so the assertion holds. This is unchanged from the input.
- **`#handleCancel` consumes the request before reading the phase.** A request that lapses is consumed too, which is §2.6's _consumed either way_.
- **The amended contract text.** Every hit of the deleted names in 02, 03, 05, 06 and 07 is struck, or carries a dated D-207 step-3 withdrawal, or is history (Q-22, D-178, D-186). D-179's dated paragraph in 00-index and 05's I-36 kernel mechanism say what step 3 deleted and leave the participant clause to step 4, as §15.3 allows.

## Verification limits

- Chromium only. M-2 was not measured.
- `react.browser` and `stories.browser` load at neither tree.
- The runtime figures come from one devcontainer session on a shared host (load average about 8 on 12 cores during the batches), with `__DEV__` true on both trees. They bound a difference and do not measure one.
- The consumer reachability of step3-A's two cases is reasoned from the code. One probe was run for the release case, and it was not discriminating.
- The contract amendments were checked by searching for every deleted member and reading each hit in context, not by a full read of 02, 03, 05, 06 and 07.
- Scratch worktrees were removed after the run. The P9 probe source is not tracked.
- This artifact was formatted with `just fmt`. `just lint` reports Markdown as ignored, so no lint pass applies.

## Dispositions proposed

| Item | Proposal |
| --- | --- |
| step3-A (Tier C) | The architect's: whether §4 states the release and action cases. Nonblocking for step 3 |
| step3-B (Tier B) | The implementer's. Nonblocking for step 3. Required before R21 or `d207-requests.md` relies on the ledger census |
| step3-C (Tier C) | The implementer's, in this record or step 6's. Nonblocking |
| step2-A, step2-B, reviewer-F | Closed by the corrections, verified here |
| Step 3 | **No blocker found.** Acceptance is the architect's. D-207 stays `Unimplemented (Remediation)`, F-432 to F-435 stay open, and the witness (`d207-requests.md` absent) holds. Step 4 does not start before acceptance |
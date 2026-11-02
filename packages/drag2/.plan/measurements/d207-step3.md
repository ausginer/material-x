# D-207 step 3 — kernel requests

> **Implemented 2026-11-02, not yet accepted.** Acceptance belongs to the step-3 feature review. This unit stops for it before step 4.

**Canonical entry: `drag2:D-207`**, step 3 as [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §15.3 and §16.5 state it. This record holds step 3's implementation status, its figures and its verification. It is **not** the decision's measurement record. `d207-requests.md` is written at step 6, and its absence is still the witness.

**Input.** `c14ee4d5c` on `drag2/fin-review2`. Its `src/` equals `add2d5ca8`'s, which equals step 2's accepted `877fb9612`. The baseline suite at the input: ten fail, and two browser files do not load, as at step 2's acceptance. The ten are six `size.node` controls and four `docs.node` surface rows. The two files are `react.browser` and `stories.browser`. Step 2 left 13 budget rows red; this tree reports them under budget (§Composition).

**The escalation and its decision.** Under §15.3's first escalation clause, the implementer escalated on 2026-11-01: deleting the activation's revalidation changed `keyboard.browser`'s _should enqueue an invalidate() rather than drain it_ from a silent end to `onStart` followed by `canceled`. Step 3 was paused, uncommitted. D-207 (§16, F-440) decided it with the held-cancel entry clause below, which lands in this commit together with the deletions. No other escalation was raised.

## What landed

| Item | Where |
| --- | --- |
| **Deleted, in the driver:** `#preparationValid`'s dependency, `SEAM_INVALIDATED` (outcomes renumbered 0–3), `Transition.rollback`, `ActionTransition.rollback`, the `seam/rollback-failed` path, the invalidated arm in the core and in the activation policy, and the staging conditional. `runCore` commits whatever `prepare` returned, and stages it unconditionally | `src/kernel/seams.ts` |
| **Deleted, in the kernel:** `ArmedController.#preparationValid` and the action adapter's `rollback`. Also deleted: the activation policy's `committed` revalidation (`START_COMMITTED` is queued unconditionally), `#settlementLive`, `#joinLive` at each of its sites, `#settleResolution`'s latch conjunct (attempt identity alone), `#handleErrorReported`'s latch, and `#runAdmission`'s recheck (admission publishes unconditionally, R1). `#measureTarget` no longer reports liveness | `src/kernel/kernel.ts` |
| **Deleted, the intake demotion on a held cancel.** `#failOperation` keeps its context checks (`CLOSED`, no operation, a report in flight). A failure raised while a cancel is held is queued and registered | `src/kernel/kernel.ts` |
| **Added, the cancel phase rule** (§2.6). `#cancelWith` registers only in `PENDING`, `ACTIVATING`, `ACTIVE` or `RELEASING`. It is a no-op otherwise, on a duplicate, and once `CLOSED` | `src/kernel/kernel.ts` |
| **Added, supersession captured at intake** (§2.10). `FailureCheckpoint.superseded` records whether a cancel for its operation was registered and unapplied. `FAILED`'s entry decides on that record or on a cancel still held at its entry, and reports `drag: failure/superseded-by-cancel` | `src/kernel/kernel.ts` |
| **Added, activation's held-cancel entry clause** (D-207, §16.3). `#handleActivate` declines while a cancel is registered. So does `#handleMove`, while the committed phase is `PENDING`. It reads one field, before anything else the unit does, and `ACTIVE`'s per-sample path reads nothing more | `src/kernel/kernel.ts` |
| **Deleted, the sortable's D-39 undo ledger:** `PlaceholderUndo`, `restoreAttribute`, `willWrite`, every `undo` parameter of `applyMechanics` and `createPlaceholder`, `#transaction.placeholderUndo`, `rollbackActivation` and the activation adapter's `rollback` | `src/sortable/placement.ts`, `src/sortable/spec.ts` |
| Comments that cited the ledger or the deleted readings | `src/kernel/unwind.ts`, `src/sortable/assemble.ts`, `src/free-drag/assemble.ts`, `src/kernel/kernel.ts` |
| **Contract**, in this commit (§Contract text) | `.plan/contract/02`, `03`, `05`, `06`, `07`, `00-index.md` D-179 |
| **COVERAGE**: §Kernel requests, new. The withdrawn rows are rewritten, the `preparationValid()` note is added to the D-181 section, and the D-205 table's inline-open count names its tree (reviewer-F) | `tests/COVERAGE.md` |
| **Corrections**: step2-A and step2-B in `d206-step2.md`, and reviewer-F in `d204-step1.md` (§Corrections) | `.plan/measurements/` |

`closed` stays readable and reports `CLOSED` only. ~~No published type changes except the removal of the `rollback` members, which no published declaration named.~~ **Corrected 2026-11-02 (step3-C, in `d208-step4.md` §Corrections):** the shipped `kernel/seams.d.ts` declared `rollback?` on `Transition` and `ActionTransition`, both exported from `kernel.js`, so step 3 removed a published, optional kernel-tier SPI member from both. §3 decides it, on an unreleased API. No other published type changed. The SPI renames and the behaviors' `closed` and `live()` reads are step 4's.

## Cases

All rows are driven through `draggable()` and the running controller, with no harness flag. COVERAGE §Kernel requests lists them.

| Case | Rows | At the input |
| --- | --- | --- |
| **R1**, admission half | `kernel.browser` — _should publish an admission whose admit requested destruction and tear it down after_ | passes |
| **R2** | _should deliver the start of an activation whose prepare requested destruction_ | passes |
| **R3** | `kernel.browser` — _should start and then cancel an activation whose prepare requested a cancel_; `features.browser` — _should adopt the placeholder, start and then cancel when the factory requests a cancel_ | **fails**: rollback, silent retirement |
| **R7** | _should finish the join whose anchorTarget requested destruction and retire nothing after it_ | passes |
| **R8** | _should register nothing for a cancel raised in anchorTarget_, _should not let a cancel raised in anchorTarget supersede a later failure_ | **both fail**: stranded in `SETTLING`, no `finalized`, the next press admits nothing |
| **R12** | _should apply requests from onStart in the order they were made_, _should apply none of the requests from onStart when destruction follows them_ | pass |
| **R14** | _should register nothing for a cancel raised in the terminal callback_ | passes |
| **R16** | _should report a failure a cancel in the same seam superseded_; _should report a failure applied before a cancel raised in a later unit_ | **the first fails**: intake demoted it to `failure/not-classified`. The second passes |
| **R20** | _should apply destruction at once while a resolution is pending and drop its late settle_ | passes |
| **R31** | `keyboard.browser` — _should enqueue an invalidate() rather than drain it_, **unchanged**; `kernel.browser` — _should retire a command whose admission queued work that cancelled it_, _should retire a press whose action dispatched a crossing move and then cancelled_ | the keyboard row passes. **The two kernel rows fail only on `activation.prepare`**: the baseline ran it and then discarded the preparation. Consumer-visibly the outcome is the same, with no start, no terminal and no report, as §16.3 says |
| **Structural** | `capture.node` — _should be read only at intake, the channel and unit entries_ | — (new) |

**R16's two orders agree with §2.10.** A cancel and then a failure in one seam: intake records the supersession, and `FAILED` reports it at its application. A failure and then a cancel in one seam (the existing _should drop a checkpoint classified before the cancel latch was set_): the cancel is still held at `FAILED`'s entry, which drops the checkpoint. A failure whose `FAILED` applies before a later unit cancels: the cancel finds `SETTLING` and registers nothing, and the failure is the terminal. No reachable order was found that disagrees with _or on a cancel still held at its entry_.

**R31's pointer witness is expressible**, so the `MOVE` clause has its own row. A `pointermove` dispatched from inside an action at `PENDING` reaches the kernel's listener as an ordinary sample. It is queued as `MOVE` ahead of the `CANCEL` the action registers next. No harness limitation applies.

**Withdrawn promises, revised in this commit.** These went with what they tested:

- `seams.node`: the `runCore` invalidation describe, the two rollback-failure rows, _commit a committed value into an invalidated seam_, _stage nothing when the effect abandoned the operation_, _retire the operation when activation is invalidated_ and _never invoke the consumer when the release effect abandoned the operation_. _should not rollback a transition that already committed_ becomes _should run nothing after a throwing effect_.
- `features.browser`: both D-39 rows, replaced by R3's sortable row.
- `placement.browser`: the snapshot row becomes _should read no attribute of the default placeholder_.

Reviewer-E's row in `seams.node` is untouched.

## What step 3 keeps

| Requirement | Evidence at this tree |
| --- | --- |
| Every step-1 and step-2 row green, including the five R30 rows, both null-command rows and reviewer-B's three | full suite (§Verification): none is in the failing set |
| `OPEN_RESOLUTION`'s five-clause entry; registration written only where a checkpoint is queued | unchanged. Its failure clause reddens the same four R30 rows, and its cancel clause the same two. The phase clause now has a witness, R4 (§Mutation census) |
| R3's in-activation outcome distinct from R31's | R3: `onStart`, then `canceled` `AT_PROPOSAL`. R31: nothing. Both pass, and removing either entry clause leaves R3 green |
| The panic promise property | reviewer-B's three `execution.node` rows pass. `execution.ts` is unchanged |
| D-200: no `Lifetime` or `ActionQueue` property changes | `lifetimes.ts`, `queue.ts` and `execution.ts` are unchanged |
| I-26: one pointer sample allocates nothing | §Runtime |

## Guard-site census

By `grep` over `src/kernel/`, comments excluded, at this tree. Writes are listed apart from reads.

| Fact | Read at | Written at |
| --- | --- | --- |
| cancel request (`cancelRequest`) | intake: `#cancelWith` (duplicate check), `#failOperation` (supersession capture). Unit entries: `#handleMove` at `PENDING`, `#handleActivate`, `#handleCancel`, `#handleStartCommitted`, `#handleOpenResolution`, `#handleFailed` | `#cancelWith` (registration), `#handleCancel` (consumption), `#mintOperation` (initial `null`) |
| registered failure (`failureRegistered`) | `#handleOpenResolution`'s entry | `#failOperation`, `#mintOperation` |
| supersession record (`superseded`) | `#handleFailed`'s entry | `#failOperation` |
| lifecycle request (`#lifecycle`, `closed`) | the runner: `ExecutionBracket#step` before each entry, `idle` before an ingress pass, `#leave` at the outermost boundary; intake: the bracket's `dispatch` and `requestClose`, the armed controller's `#cancelWith`, `#failOperation` and `dispatch`; the channel: `#notify`; the SPI getter `closed`, which step 4 removes | `ExecutionBracket` only |

These are §6's places and no others. `capture.node`'s ledger row holds the armed controller's share to the same set, by the TypeScript compiler API.

## Composition

`just build`, read through `measureAll()` from `bench/size/measure.ts`. **Before** is the input's `src/`, and it reproduces `d206-step2.md`'s "after" column byte for byte. **After** is this tree. Bytes. Brotli governs. **Budgets are unchanged**, under the owner's standing ruling.

| Row | min before | min after | Δ | Brotli before | Brotli after | **Δ** | budget | distance |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 34,984 | 33,874 | −1,110 | 10,563 | 10,322 | **−241** | 10,549 | −227 |
| minimal (xy) | 34,303 | 33,193 | −1,110 | 10,451 | 10,196 | **−255** | 10,421 | −225 |
| minimal + layoutAnimation | 35,963 | 34,853 | −1,110 | 10,915 | 10,663 | **−252** | 10,887 | −224 |
| xy + layoutAnimation | 35,282 | 34,172 | −1,110 | 10,787 | 10,545 | **−242** | 10,776 | −231 |
| minimal + landing | 35,377 | 34,267 | −1,110 | 10,744 | 10,483 | **−261** | 10,695 | −212 |
| complete | 36,356 | 35,246 | −1,110 | 11,066 | 10,817 | **−249** | 11,033 | −216 |
| free drag minimal | 27,490 | 26,935 | −555 | 8,327 | 8,229 | **−98** | 8,266 | −37 |
| free drag + bounds | 27,956 | 27,401 | −555 | 8,482 | 8,381 | **−101** | 8,423 | −42 |
| free drag + landing | 27,883 | 27,328 | −555 | 8,487 | 8,400 | **−87** | 8,425 | −25 |
| free drag complete | 28,349 | 27,794 | −555 | 8,646 | 8,529 | **−117** | 8,576 | −47 |
| both behaviors | 43,753 | 42,642 | −1,111 | 12,534 | 12,281 | **−253** | 12,493 | −212 |
| vocabulary root — drag.js | 252 | 252 | 0 | 142 | 142 | **0** | 205 | −63 |
| kernel root — kernel.js | 20,429 | 19,874 | −555 | 6,389 | 6,300 | **−89** | 6,312 | −12 |
| baseline A — feature-matched, non-composed | 35,649 | 34,539 | −1,110 | 10,885 | 10,655 | **−230** | 10,855 | −200 |
| baseline B — shipped @ydinjs/drag sortable.js | 22,618 | 22,618 | 0 | 6,916 | 6,916 | **0** | 7,040 | −124 |

**No growth to report, and no module entered or left any graph.** Module counts are equal on every row. The kernel's deletions account for −555 B minified on every kernel-carrying row. The sortable's ledger accounts for the other −555 on the sortable rows. **All 13 rows step 2 left over budget are now under it**, by 12 to 231 B. This came from the deletions §15.3 required, not from a size pass. The two controls that cannot see the kernel did not move. The six `size.node` control equalities stay red, as at the input.

## Runtime

**Measured.** `tests/perf/m1.browser.test.ts` with `VITE_DRAG_MEASURE=1`, end-to-end and allocation arms, three runs at this tree. Chromium, the package's browser project, this devcontainer.

- **Allocation: 0.0 B per sample over 20,000 samples, every run.** I-26 holds.
- **Timing is not resolved.** The end-to-end arm read 20.3, 70.3 and 40.6 µs at 50 rows, and 21.9, 96.9 and 18.0 µs at 200, while a build ran beside it. No runtime claim is made from these figures in either direction. M-1's resolving measurement is step 6's.

**Analysis, not measurement.**

- **Per active sample (`MOVE` at `ACTIVE`):** one comparison of a local more, `phase === PENDING`, which is false and short-circuits. No field read, call or allocation is added.
- **Per `MOVE` at `PENDING`:** one field read more. No allocation.
- **Per activation, release and settlement:** fewer calls and reads. Gone are the driver's predicate call and its reads, the activation's post-effect revalidation, `#settlementLive` and `#joinLive` (each called once per settlement), and the sortable's per-write ledger closures, which were allocated once per activation with a custom placeholder.
- **Per failure:** one boolean field more on the checkpoint record, which already existed.

## Property 12

step2-A's repair lands here. `capture.node`'s object-valued constant row now looks through `as`, `as const`, `satisfies`, parentheses, non-null assertions and angle-bracket assertions. It lists **13** library constants at this tree, as at `877fb9612`:

- the three frame defaults;
- `KERNEL_FRAME_KEYS`, `UA_PROPS` and `LIFTED_PROPS`;
- both `LAST_WINS_KEYS`;
- `SESSION_POINTER_EVENTS`;
- both `ACCEPTED`;
- `ReorderResolution` and `FreeDragResolution`.

Each was classified by reading its uses: frame defaults, iterated tables, identity-compared results, and consumer-facing factory tables. None is written. The module-binding row still finds no `let`, `var` or mutable `static`.

## Mutation census

Taken at this tree, in the shared checkout, each mutation applied alone to `src/kernel/kernel.ts` and restored, over **the whole suite**. The figures and their exclusions are COVERAGE §Kernel requests' table, and are not restated here. In summary:

- N1 (`ACTIVATE`'s clause) reddens both command R31 rows.
- N2 (`MOVE`'s clause) reddens the pointer R31 row.
- N3 (the phase rule's upper bound) reddened nothing over the run. The R8 registration row was written for it and reddens alone, checked on `kernel.browser`.
- N4 to N6 redden R16 and the cancel-against-failure rows.
- N7 (`OPEN_RESOLUTION`'s phase clause) now reddens R4. It was unreachable at step 1.
- The inline-open mutation reddens 12 here: 6 at `3e44eaf62`, and 11 at `44e2074f1` and `877fb9612`.

## Property 13 — interim accounting

The architect's `run.sh` was rerun at this tree and at the input's `src/`.

**The output differs in exactly three lines**, all browser probes:

| Probe line | Input | This tree |
| --- | --- | --- |
| P5, `cancel()` in `activation.prepare` (R3) | `activation.rollback`, `retire`, no `onStart` | `onStart`, then `settlement.prepare` `canceled` `AT_PROPOSAL`, `finalized`, `retire`. **Required** |
| P4, late `cancel()` in `anchorTarget` (R8) | first operation stops after `anchorTarget` (stranded); second press `[]` | first runs through `presentation.released`, `finalized`, `retire`; second press `onStart`. **Required** |
| P7, `cancel()` in `release.prepare` | no `release.effect`; then `canceled` `AT_PROPOSAL` | `release.effect`, then `canceled` `AT_PROPOSAL` |

The P7 line moves because the staging conditional is deleted, which §15.3 requires. A request registered in `release.prepare` is applied after the release unit, so the unit runs its effect. This is the shape R28 already requires for a destroy raised there, and P7's destroy line shows it at both trees. **Consumer-visibly nothing changes**: `onStart`, then one `onEnd` `canceled` at `AT_PROPOSAL`, and no round-trip, as §4 item 4 states. `release.effect` is a behavior seam, not a consumer call. In the sortable it moves the placeholder to the final gap before the presentation disposer removes it. That is a DOM write a custom placeholder's `connectedCallback` could observe. The same is true of R28 today, so this is recorded for the review rather than escalated.

Every model row is `ok` at both trees. **No probed row makes a consumer call that both the baseline and the target withhold.**

| Case | Outcome now |
| --- | --- |
| R1, R2, R4–R7, R9–R11, R13, R15, R17, R22–R30 | required, as at step 2 |
| **R3** | **required** (P5; `kernel.browser`, `features.browser`) |
| **R8** | **required** (P4; `kernel.browser`) |
| **R12, R14, R16, R20** | **required**, as tests through the running controller (§Cases). Not probed by `run.sh` |
| R19 | required, as a test (step 2) |
| **R31** | baseline and required coincide: no start, no terminal, no report. The witnesses are three tests (§Cases). Not probed by `run.sh` |
| R18, R21 | booked to step 4 |

## Contract text

Amended in this commit, as §15.3 lists:

- **02:**
  - §The tri-phase transition: `rollback` deleted from `Transition`, the outcomes without `SEAM_INVALIDATED`, `runCore` without the revalidation, the activation row's unconditional `START_COMMITTED` and the D-207 entry clause, and staging made unconditional;
  - §Every classification entrypoint latches: the `rollback` throw bullet withdrawn;
  - §Post-callback revalidation, now the unit-entry currency rule, with the `admit` recheck withdrawn (R1);
  - §What this actually guarantees: the I-16 row, and the new tier-B row _no unit reads the ledger after its entry_;
  - the D-39 paragraphs; the seam table's `activation.rollback` row; §Post-commit ordering; the sizing note;
  - §Commit, measure, join and the join's pseudo-code: no revalidation;
  - `ActionTransition`; §Release ordering's trace; §Attempts (no latch conjunct; the settlement row's liveness withdrawn).
- **05:**
  - I-3 retitled;
  - I-16 reduced;
  - I-17's D-39 note withdrawn;
  - I-21: registration phases, first wins, FIFO application, lapse, and the D-207 clause;
  - I-22, stated at application;
  - I-31: the antecedent counted from applied destruction, and R3 and R31;
  - I-36's kernel mechanism, and D-179's dated paragraph, as far as the deletions reach;
  - I-6 clause 3's barrier list;
  - the D-39 test obligation, withdrawn;
  - the C-row on the `placeholder` slot.
- **00-index D-179:** a dated paragraph on the two kernel routes. The participant clause stays until step 4.
- **03:** the four D-39 passages.
- **06:** illustrative, but bound to follow 02. Its trace lines, the `rollback` paragraph and the two "where it lands" rows.
- **07:** the `onEnd` row's kernel-side barrier.

D-207 §16.5's two contract items are carried in I-21, I-22 and 02 §Post-callback revalidation.

## Corrections

- **step2-A**: a dated correction in `d206-step2.md` §Property 12, giving 13 constants at `877fb9612`, and the row repaired (§Property 12).
- **step2-B**: a dated correction in `d206-step2.md` §Runtime. The bracket's handle callback was one call at both trees, so the counted difference at `877fb9612` against `222445777` is one field read and one argument more per active sample, and one call fewer. Both callbacks were read with `git show`.
- **reviewer-F**:
  - `d204-step1.md`'s "three of the five" is corrected to four of the five;
  - COVERAGE's D-205 inline-open count now names `3e44eaf62`, gives the later counts, and gives this tree's 12.

## Verification

- **Tests:** `vitest run`, every project. 1,385 pass and 10 fail, and the same two browser files do not load. The 10 are exactly the input's: six `size.node` controls and four `docs.node` rows. Every new row passes, and so does every step-1 and step-2 row. `coverage.node`, `references.node` and `decisions.node` pass.
- **Lint** over the changed files, after `fmt`, `lint-fix`, `fmt`. Ten eslint errors remain, and the same ten are reported at `HEAD` in a scratch worktree, by the same rules in the same files. The line numbers moved with the edits:
  - `seams.ts`: `only-throw-error` ×2 and `no-unnecessary-condition` ×2;
  - `no-unnecessary-condition` in both `assemble.ts` files and in `sortable/spec.ts`;
  - `consistent-return` in `sortable/spec.ts`;
  - `unbound-method` in `kernel.browser` and in `features.browser`.

  None is new. Markdown is formatted, and the linters report it as ignored.

- **Typecheck:** only the two `.scripts/vitest-*.ts` errors present at the input.
- `git diff --check` is clean.

## Limits

- **Browser runs used Chromium only.**
- **Runtime timing is unresolved** (§Runtime). Allocation is the measured evidence.
- **The mutations ran in the shared checkout**, one at a time, with the source restored after each and checked by `git diff --stat`.
- **The census is by `grep`**, plus the compiler-API row for the armed controller. An aliased access would escape both, and none exists.
- **P7's `release.effect` under a cancel in `release.prepare`** is recorded above, not escalated. It is consumer-invisible except through a custom placeholder's reaction to the release move, which R28 already exhibits for destroy.

## Unresolved obligations

- **Step 4:** the renames, `closed`'s removal, the behaviors' `closed` and `live()` reads, `moveTo`'s capture, R18 and R21, and the rest of I-36's rewrite, including step2-C's restatement.
- **Reviewer-E** is untouched and stays the owner's.
- **D-207 stays `Unimplemented (Remediation)`.** `d207-requests.md` is not created, F-432 to F-435 stay open, and D-200's independent acceptance is still pending.
- **Next:** stop for the step-3 independent feature review. Step 4 does not start before it.
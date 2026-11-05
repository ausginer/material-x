# D-208 remediation 5R: bounded recheck

**Trees read.** Review revision `2d17645f5`. Baseline `15a7fa53d`, whose `src/` and contract equal `0ba8afb64`'s. Branch `drag2/fin-review2`. The series:

- `e324ca8fa`: items 1–5;
- `39e243887`: item 6;
- `c595e96e3`: comment-only identifier removal;
- `2d17645f5`: the record.

Hashes, diffs and the census were taken from git objects in the shared checkout. The suite, the builds, the declarations and the probes ran in detached scratch worktrees:

- at `2d17645f5`, the tip;
- at `e324ca8fa`, item 6's parent;
- at `6905af249`, the request-application program's input, for two probes.

All three are removed.

**Subject.** Remediation 5R as [`request-application-claude.md`](../architecture/request-application-claude.md) §20.3 and §20.4 bound it, against the record's [`d208-step5.md`](../../measurements/d208-step5.md) §Remediation 5R and this lens's [step-5 feature proof](d208-step5-feature-proof-claude.md).

**Scope.** The pass covered:

- the whole `src/` and contract diff `15a7fa53d..2d17645f5`, read hunk by hunk against the code at the tip;
- runtime invariance for every `src/` module, by two instruments, commit by commit;
- item 6's stripped difference;
- composition at item 6's parent and at the tip;
- the published declarations, the suite, lint and typecheck;
- the supplementary census, reproduced, with every K, N and H hit read in context;
- items 3 and 4's established outcomes, by probe;
- the three escalations the record reports, and #13's wording.

It did **not** cover:

- comments 5R did not touch;
- contract text outside the diff and the 68 census hits;
- browsers other than Chromium; `react.browser` and `stories.browser`, which do not load at the tip.

## Result

**No implementation defect blocks 5R.**

- Items 1–5 change no runtime statement, and item 6's stripped difference is exactly the authorized guard and return type.
- Every rewritten comment I checked states what the code does.
- step5-A and step5-C (#6) are discharged.
- The census reproduces exactly.
- The suite, lint, typecheck and the published declarations meet §20.4's keep list.

**Acceptance still waits on three architect dispositions:**

1. **The Brotli growth** (the record's own escalation, reproduced byte for byte). §20.4's keep list says _any growth is a finding_, so the property is unmet as written. Item 6 changed nothing beyond what was authorized, so this is not an implementation defect.
2. **5r-A (Tier B, pre-existing).** A second two-fault path reaches a terminal callback without a start notification. It bears on F-442's scope and on the two places where 5R claims the admitted gap is unique: item 3's retained _one path_ and §Deviations 2's bound.
3. **§Deviations 1**, the citation conflict. The implementer's reading is the only one the gate admits, and it needs the architect's confirmation, not a decision.

**Two Tier C defects were introduced, both comment-only:** 5r-B and 5r-C.

The four budget rows the owner has not yet disposed of are unchanged.

| Check | Result |
| --- | --- |
| Runtime, items 1–5 | All 60 `src/` modules (every `.ts` except the stories) are equal across `0ba8afb64..e324ca8fa` by the TypeScript printer with `removeComments`, and again by a walk of the parse tree's leaf tokens with JSDoc nodes excluded. That is step 5's pair of instruments. A context-free token scanner flags three files on backticks inside comments; this is the same tooling artefact step 5 recorded, and both tree-based instruments agree |
| Runtime, item 6 | `e324ca8fa..39e243887`: only `sortable/spec.ts` differs, by both instruments. The printed diff is the return type `AdmissionSubject \| null` → `AdmissionSubject` and the three-line `if (!subject) { return null; }`, and nothing else. `c595e96e3` and `2d17645f5` equal `39e243887` on all 60 |
| Composition | Reproduced exactly at both trees. At item 6's parent, all 15 rows equal step 5's tip as this lens measured it, byte for byte. After item 6, every sortable-carrying row is −9 B minified. Under Brotli, four of those rows shrink and three grow: `minimal + landing` +20, `both behaviors` +11, `baseline A` +1. Every free-drag, kernel-root, vocabulary and baseline-B row is byte-equal. Module counts are unchanged |
| Budget rows (the owner's) | Unchanged at both trees: `free drag + bounds` 8,495 / 8,423 (+72), `free drag + landing` 8,437 / 8,425 (+12), `free drag complete` 8,628 / 8,576 (+52), `kernel root` 6,320 / 6,312 (+8). 5R moves none |
| Suite at the tip | 1,377 passed, 14 failed, matching the record. The 14 are step 5's set: six `size.node` controls, four `docs.node` rows and four budget rows. `references.node`'s _should carry no history in a comment_ passes |
| Lint | Seven eslint errors on the changed `src/` files, with the same rules on the same files as the record lists: `free-drag/assemble.ts` 1, `free-drag/spec.ts` 1, `kernel/seams.ts` 4, `sortable/spec.ts` 1. Each file carrying one is comment-only or item 6, so none is new. oxlint is clean |
| Typecheck | Only the two `.scripts/vitest-*.ts` errors |
| Published declarations | 33 files at both trees. Three differ (`free-drag/controller.d.ts`, `sortable/controller.d.ts`, `kernel/spec.d.ts`), each with an equal comment-stripped print |
| `git diff --check` | Clean |

## Items

**Item 1.** Each rewritten site was read against the code at the tip:

- **step5-A**, `stale`'s docblock (`sortable/spec.ts:1021–1029`): it names `movePlaceholder`'s throws and the caught `movedInsertion` return, and says a reaction's throw does not leave the bracket. This matches step 5's reaction probe. **Discharged.**
- **#3** (`:1096`): the preparation ground the handoff named.
- **#4** (`kernel.ts:2529`): the composition's `report` is minted through `Kernel.channel` (`sortable/behavior.ts:126`, `free-drag/behavior.ts:52`). R33 (d) is _a kept `report` is dropped after application_ (`tests/COVERAGE.md:1382`).
- **#5:** the five mint sites are both `behavior.ts` files, both specs' `#notify` (`free-drag/spec.ts:243`, `sortable/spec.ts:317`) and the façade's channel over `reportError` (`kernel.ts:2742`). Each composition sink calls `merged.onError` itself, and _two channels over one sink_ is accurate.
- **#7**, both behaviors:
  - `progress = STARTED` precedes `onStart` in both;
  - free drag's lift write precedes it (`free-drag/spec.ts:448`);
  - a request is only registered while a unit runs (`kernel.ts:704–707`), so _applied after this unit_ holds;
  - 07:478 and 07:487 are marked.
- **#8:** `fail`'s entry says its demotion is silent until arming (`kernel/spec.ts:79–81`).
- **#9:** `axis` is a `DragAxis` value, read once into `#axis` (`free-drag/spec.ts:247`).
- **#10:** the walk returns early only on an empty map.
- **#11:** both `resolve` bodies (`y.ts:198`, `xy.ts:189`) destructure `values`, `count` and `hole` once. Each reads `items` only after a candidate beats the placeholder.
- **#12:** `assemble.ts:77` pushes `axis.insertion.retire`, called bare at `:184`. `invalidateInsertion` is called as `this.#slots.invalidateInsertion()`.
- **#13:** see §#13 below.
- **#14:** the drain is the execution bracket's, and so is its panic path.
- **The spatial guard** (`sortable/spec.ts:858–862`): established false and corrected, and the correction is accurate.
  - The producer tests `#operation.activation` before it dispatches (`:343`).
  - The record is published in the effect (`:770`) before `START_COMMITTED` commits `ACTIVE`, and cleared only in `retire()` (`:1573`).
- **`kernel.ts:2431`:** rewrapped.
- **The frame task's figures:** removed. [`m2.md`](../../measurements/m2.md) §Answer 2 holds 148 B, 281 B and 309 B (`:36–38`, `:52–53`), and _half the price_ became _cheaper_, which is still true at 0.0034 µs against 0.0072 µs.

**Item 2.** Both controllers' `requestDestroy` JSDoc now names I-36's two exceptions by route, word for word with `README.md:74`. 01:440 carries the dated amendment. **step5-C is discharged.**

**Item 3.** I reproduced the record's probe at the tip (P1 below), with an identical outcome. The text is restated as §20.4 requires. The passage's outcome holds _for the path it names_; 5r-A shows it is not the only such path.

**Item 4.** The restatements agree with the code and with the R-cases:

- the bracket's step reads the lifecycle before each action and stops the drain at the next entry, and `#release` clears the queue (`kernel/execution.ts:68–75`, `:246–280`);
- R1's sortable half and admission half;
- R7, which runs the settlement through `finalized`.

06:162's _`visual` and `box` are still called_ matches `#seedDraft`. 06:789's asynchronous half, which the record reads from the code and pins with no row, was observed by probe P5:

- the signal handed to `onReorder` is aborted at application;
- a later `accept()` settlement publishes no terminal.

**Item 5: the supplementary census.** Reproduced at `0ba8afb64` with the record's pattern, excluding step 5's: **68 lines**, with the record's line set exactly in each of the six documents. Every K, N and H line was read in context. The A lines were checked in the diff. I agree with every class. Two K lines are worded in old vocabulary while stating a property that holds:

- 01:487's _after logical closure it is refused_;
- 05:248's _D-36's bracket_.

These are the same kind of thing as the old member names the handoff scopes out, and not an E. **No E** stands.

**Item 6.** It stays within the authorized guard and return-type cleanup (§Result table). `admitFrom`'s `item ? … : null` is untouched.

## Escalations the record reports

**Brotli growth (§Composition).** Reproduced exactly.

- **The evidence that it is a compression artefact:**
  - every row carrying `sortable/spec.ts` loses the same 9 minified bytes;
  - no module enters or leaves any graph;
  - the stripped difference is the authorized removal and nothing else.
- **Budgets:** none of the three rows is near its budget, with headroom of 309, 284 and 347 B, and no owner-pending row moves.
- **The open question:** §20.4 says _any growth is a finding_, and CONTRIBUTING §15 makes Brotli the governing figure, so the keep property is literally unmet. Keeping item 6, and booking the growth, are **the architect's**. The implementer was right not to revert: reverting would have decided the finding.

**Source citations against `references.node` (§Deviations 1).** Confirmed.

- **The gate.** `HISTORY_FORMS` in `tests/references.node.test.ts` (`:714–726`) fails any `F-`, `M-` or `D-` number, `§` or `.plan/` path in a `src/` comment. CONTRIBUTING §Comments and JSDoc allows one bare _decision_ pointer, and F-442 is not a decision.
- **What landed meets every part of §20.4 except the literal source citation:**
  - the source states the property, _the gap is admitted and open_;
  - both contract lines cite F-442;
  - `m2.md` holds the figures.
- **Why this is the only compliant reading:** §20.4 forbids test changes, so the architect only needs to confirm it. It is not a blocker.

**The `ACTIVATING` comment (§Deviations 2).** The comment is at `kernel.ts:2029–2034`. The record was right to report it rather than change it, under §19.5's first condition. Its bound is wrong, though. The record says the claim _holds on every path except F-442's gap_, and P2 falsifies it on a second path: there the placeholder is not in the DOM, the behavior's activation record is null and `onStart` never ran. See 5r-A.

## #13: the construction-boundary wording

The code agrees with the new text.

- `Kernel.construct` (`kernel.ts:2651`) runs `behavior(this)` and then `#arm(spec)`, both inside `ExecutionBracket.construct`, which marks a unit running (`execution.ts:187–200`).
- Ingress is attached only in `#arm`.
- A native ingress pass is refused while any unit runs.

The published `BehaviorInstall` sentence states this order as a fact. It states it about the library, not as an obligation on a behavior, and it is the property the old sentence gave as the handshake's purpose. **I read no contract change in it, and no escalation is needed.**

Two wording points, neither of which decides anything:

- The class doc says _no guard checks it_ right after _native ingress is refused while construction runs_. The refusal is the bracket's general rule for any running unit, not a check of this boundary, and the sentence is accurate as written.
- The class doc names its quotation's source as _Probe 1_. See 5r-B.

## Findings

### 5r-A: a second path reaches a terminal callback without a start notification

**Tier B, pre-existing.** It is present at `6905af249`, the request-application program's input, so neither 5R nor D-208 introduced it. **Route: the architect.** It bears on F-442's scope and on item 3's and §Deviations 2's text.

- **Current behavior.** A placeholder's `connectedCallback` requests a cancel and then removes the placeholder.
  - The effect's adjacency check throws `drag: sortable/insertion-placeholder-lost` (`sortable/spec.ts:747–748`) before step 3 publishes the activation record.
  - The registered cancel supersedes that `FAILURE_ACTIVATION` checkpoint, and `#handleCancel` settles `ACTIVATING`.
  - The settlement's `anchorTarget` (`:1458`) then destructures `this.#operation.activation!`, which is null.
- **Observed at the tip (P2):**
  - **calls:** `['onCancel']`; `onStart` never ran;
  - **`onEnd`:** one `canceled` result, `AT_PROPOSAL`, origin `CANCEL_SUPPLIED`, `proposal: null`;
  - **`onError`:** two `DraggableWarning`s:
    - `drag: landing/target-unavailable`, whose `cause` is the library's own `TypeError: Cannot destructure property 'placeholder' of 'this[#operation].activation' as it is null`;
    - `drag: failure/superseded-by-cancel`, with the placeholder-lost error as `cause`;
  - the placeholder is removed.
- **At `6905af249`:** the same terminal outcome and the same `TypeError` warning. The only difference is that the checkpoint's warning was `failure/not-classified` there.
- **Controls:** cancel alone (P3) gives `onStart` then `onCancel`; removal alone (P4) gives one `DraggableError` at `FAILURE_ACTIVATION` and no terminal.
- **Why it is a problem.** The package states the admitted gap is unique, and the record bounds the `ACTIVATING` comment's falsity to that gap:
  - `sortable/spec.ts:787`, _this is the one path that reaches a terminal callback without a start notification_, which 5R kept as current in the passage item 3 restated;
  - 02:884, _The one admitted gap_, with item 3's dated paragraph after it;
  - 05:203, _One admitted two-fault gap_, under I-31;
  - `d208-step5.md` §Deviations 2, _holds on every path except F-442's gap_.

  An integrator or a later decision reading any of these takes F-442 to cover one combination, when the same outcome follows a different second fault. The `TypeError` cause also leaves a library-internal null assertion visible on the published diagnostic channel.

- **Not Tier A:** both faults are consumer faults, so no correctly integrated consumer reaches the path.
- **Required property:**
  - the text that admits the gap names every path that reaches a terminal callback without a start notification, or states the class;
  - F-442's question covers that class.

  Whether the landing measurement on such a path is in F-442's scope is the architect's.

### 5r-B: a record address in a source comment

**Tier C, introduced** by `e324ca8fa`. **Route:** the implementer, if the architect agrees.

- **What it says.** `kernel/kernel.ts:2462–2463`, the `Kernel` class doc, reads _Probe 1's_ no input can be admitted before `install()` returns _names this boundary_.
- **Why it is a problem.** CONTRIBUTING §Comments and JSDoc forbids planning or review bookkeeping in source. The gate's _probe number_ form needs a hyphen, so `Probe 1` passes it unseen. It is the only probe reference in `src/`.
- **What the handoff asked.** §20.4 kept the phrasing _only as a quotation_. It did not ask for the quotation to be attributed.
- **Required property:** the comment states the boundary, and quotes the old phrasing if it must, without addressing a record.

### 5r-C: rewrites left unwrapped comment lines

**Tier C, introduced** by `e324ca8fa`. **Route:** the implementer.

- **What it is:**
  - `kernel/seams.ts:465` is 91 columns;
  - `kernel/seams.ts:434–435` leaves a short line, _run-to-completion, so a nested_, inside an otherwise filled paragraph;
  - `sortable/spec.ts:863` is 84 columns.
- **Why it is a problem.** It is the defect class §20.4 directed rewrapped at `kernel.ts:2431`, and the formatter does not rewrap comments.
- **Required property:** the rewritten paragraphs are wrapped like their neighbours.

## Probes

The probes were appended temporarily to `tests/sortable/sortable.browser.test.ts` in a scratch worktree. They use the suite's harness: `REENTRANT_PLACEHOLDER`, `createHarness` and `activate`. They ran alone in Chromium and were not committed.

| Probe | Construction | Tip `2d17645f5` | Input `6905af249` |
| --- | --- | --- | --- |
| P1 | `connectedCallback` requests a cancel; `invalidateInsertion` throws (item 3) | `['onCancel']`; one `canceled` `AT_PROPOSAL`/`CANCEL_SUPPLIED`; `failure/superseded-by-cancel` with the throw as `cause`; placeholder removed | the same terminal; the warning is `failure/not-classified` |
| P2 | `connectedCallback` requests a cancel, then removes the placeholder | as 5r-A | as 5r-A, `failure/not-classified` |
| P3 | cancel only | `['invalidateInsertion', 'onStart', 'onCancel']` | not run |
| P4 | removal only | one `DraggableError`, stage `FAILURE_ACTIVATION`; no terminal | not run |
| P5 | `onReorder` requests destruction and returns a pending promise, settled later with `accept()` | signal aborted at application; no `onEnd`; nothing reported | not run |

**P1's warning code moved between the input and the tip.** D-202 property 7, which D-203 carries, decides that a superseded checkpoint is reported as `failure/superseded-by-cancel` (`00-index.md:2532`). That is a stated change. The passage's outcome, _a terminal callback for a drag whose start was never notified_, is the same at both trees. So item 3's stop condition was not met, and **I raise nothing on it**. I did not bisect which step moved it.

## Considered and not raised

- **02:176 classed H.** The heading's section is amended in place by D-207 and states a current rule. The class makes no difference, because nothing reads that heading as stating the old model.
- **05:565's _the general rule in 02 §Post-callback revalidation stands_.** It is true: that section's D-207 note keeps the rule for a resource returned from a callback.
- **Stale test comments naming `TAG_POLICY`** in `tests/free-drag/anchor.browser.test.ts` and `actions.browser.test.ts`. Tests are out of 5R's scope, and 07's L-3 mark is accurate about the deleted rows.

## Verification limits

- Chromium only. `react.browser` and `stories.browser` do not load.
- The probes are one run each, in a scratch worktree, and were not committed. P2, P3 and P4 are mine; P1 reproduces the record's.
- 5r-A's input-tree result shows the path predates the program. I did not bisect the steps between the input and the tip.
- Lint was run over the 12 changed `src/` files only, as the record ran it.
- The census is a word search, with the limit the record states.

## Dispositions proposed

| Item | Proposed route |
| --- | --- |
| Brotli growth on three sortable rows | Architect: accept item 6 with the growth booked to it, or direct otherwise. **Before 5R's acceptance** |
| 5r-A (Tier B, pre-existing) | Architect: F-442's scope and the uniqueness wording at `sortable/spec.ts:787`, 02:884, 05:203 and `kernel.ts:2029–2034`. **Before 5R's acceptance**, so the acceptance does not certify the uniqueness text |
| §Deviations 1 | Architect: confirm the gate's reading. Not a blocker |
| §Deviations 2 | Subsumed by 5r-A |
| 5r-B, 5r-C (Tier C, introduced) | Implementer, comment-only, if the architect wants them before acceptance |
| The four budget overruns | The owner's, unchanged |
| step5-A, step5-C (#6), #1 | Discharged by 5R |
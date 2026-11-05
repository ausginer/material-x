# D-208 step 5: the comment pass — feature proof

**Trees read.** Implementation `0ba8afb64`. Baseline `4987d33dd`, whose `src/` equals step 4's accepted `dbbb62199`. Branch `drag2/fin-review2`. The series is `ae21d8d1c` (record corrections), `e46e11493` (R34, tests only) and `0ba8afb64` (comments, contracts and the step record). Hashes, the census and every diff were taken from git objects in the shared checkout. The suite, NB, NL, the build, the declaration comparison and lint ran in a detached worktree at `0ba8afb64`. R34's baseline run used a second worktree: `e46e11493` with `0c798ee17`'s `src/` restored and the two renames mapped back in the R34 test file and `tests/support/free-drag.ts`. Both worktrees are removed.

**Subject.** `drag2:D-208` step 5, as `request-application-claude.md` §19.5 bounds it, with §19.4's dispositions for step4-A, step4-B, step4-C and R34, and D-199's comment-pass rules as §19.5 carries them.

**Scope.** The pass covered:

- the whole `src/` diff `dbbb62199..0ba8afb64`, 28 files, read hunk by hunk against the code at the tip, including each deletion of reasoning and the place said to hold it now;
- runtime invariance for all 31 in-scope modules, by two independent instruments;
- the composition control and the published `.d.ts` files, built at both trees;
- every contract and README diff, and the step4-C sentences;
- the census: reproduced from `4987d33dd`'s 01, 02, 03, 05, 06 and 07, every K and N hit read in context, the H hits that carry no marker on their own line traced to their covering note, and the four E hits read;
- the three record corrections, checked against the trees they describe;
- R34's two rows at the tip, over `0c798ee17`'s `src/`, under the record's NB and under a reviewer mutation NL;
- the 14 source escalations: #1, #6 and #10 verified against the code, #4 and #7 read against the code, and the rest read but not verified.

It did **not** cover:

- a full read of every **unchanged** comment in the 31 files. Unchanged comments were searched for lifecycle vocabulary (`destroy`, `latch`, `closed`, `live`, `participant`, `barrier`, `notify`, `liveness`, deferral) and each hit was read in context;
- a full read of 01–07 outside the 269 census hits;
- `tests/COVERAGE.md`'s older dated sections, which are outside step4-A's documents;
- browsers other than Chromium; `react.browser` and `stories.browser`, which load at neither tree.

## Result

**No step-5 blocker.** Step 5 changes no runtime statement, and composition is byte-identical. The four known stale comments, step4-A's passages and step4-C's sentences are done as §19.4 and §19.5 direct. The census reproduces exactly. The three overdue record corrections are present and accurate, and R34 discriminates both copies.

This pass raises three findings, none of them a regression:

- **step5-A (Tier C):** introduced by the pass. One rewrite states a property the code does not hold.
- **step5-B (Tier C):** the census leaves one passage classed _current_ whose source twin is escalated, and its fourth class is unratified.
- **step5-C (Tier B):** predates step 4 and is the pass's own escalation #6. A published JSDoc contradicts I-36 and the README.

None of the 18 escalations prevents step 5's completion, because §19.5 makes escalation the required outcome for each class. They do bound what the acceptance can claim, which is set out in §Escalations below.

| Check | Result |
| --- | --- |
| Runtime invariance, 31 modules, `dbbb62199` vs `0ba8afb64` | **All 31 equal** by the TypeScript printer with `removeComments`, as the record does it. They are equal again by a second instrument: every leaf token of the parsed tree, JSDoc nodes excluded. Both instruments are sensitive: across `6905af249..dbbb62199` the token walk separates 22 files, and the comment-only `sortable/domain.ts` and `kernel/lifetimes.ts` hash equal. A context-free scanner I tried first desynchronised on backticks inside comments in `kernel/kernel.ts`, which is a tooling artefact; the AST walk replaced it. `git diff -U0` over `src/` has no added or removed line outside a comment, and no lint directive changed |
| Scope of the pass | `6905af249..dbbb62199` changes 33 `src/` files: 31 library modules and the two stories. Step 5 edits 28 of the 31 and nothing else in `src/` |
| Composition, 15 rows (`just build`, `measureAll()`) | **Byte-identical** to step 4's tip measurement, `dbbb62199`, and to the record's table: minified, Brotli and module count on every row. The four overruns are unchanged |
| Published declarations | The two trees emit the same 33 `.d.ts` files. Ten differ as raw text, and every one is equal once printed without comments: `kernel.d.ts`, `kernel/spec.d.ts`, both `controller` and `domain` declarations… (all ten listed in §Published declarations). **Doc comments only**, as the record says |
| Full suite at the tip (`vitest run`, every project) | 1,376 passed, 15 failed, 60 skipped. The 15 are the record's 14 (six `size.node` controls, four `docs.node` rows, four budget rows) plus `references.node`'s path row, which is red in worktrees only, as in step 4. `react.browser` and `stories.browser` do not load. Every non-`size`/`docs`/`references` row passes, R34's two included |
| Lint, the 29 changed `.ts` files | Seven eslint errors at the tip and the same seven at `4987d33dd`, by the same rules in the same files: `consistent-return` in both `spec.ts` files, `only-throw-error` ×2 and `no-unnecessary-condition` ×2 in `kernel/seams.ts`, `no-unnecessary-condition` in `sortable/assemble.ts`. Matches the record |
| Typecheck | Only the two `.scripts/vitest-*.ts` errors |
| `git diff --check 4987d33dd 0ba8afb64` | clean |
| Witness | `d208-requests.md` absent. D-208 still `Unimplemented (Remediation)`. `00-index.md` untouched by the series |

## Rewritten comments

**The four known stale comments (§19.5) are covered and true at the tip.**

- `moveTo`'s JSDoc (`free-drag/controller.ts:49–54`) says the coordinates are read at the call and a throwing read is reported when the move is applied, as `FAILURE_ACTION_PREPARE`. That matches `free-drag/controller.ts:96–105` and `free-drag/spec.ts:578–587`. The fault is thrown only after the `originRect` test, so a malformed point with no drag reports nothing, as before step 4.
- `reportError`'s SPI docblock (`kernel/spec.ts`): _the kernel calls this only through a channel it minted over it, and once from a panic, behind a discard of its own_. The kernel calls `reportError` in exactly two places: `kernel.ts:2739`, the armed route's channel sink, and `:687`, panic's direct delivery inside `try`/empty `catch`.
- `BehaviorContext.channel` keeps _exposes no lifecycle value_ and gains §19.2's sentence, word for word the same as 01 §`BehaviorContext`.
- The README bullet names both exceptions: retire hooks at teardown, and panic's one report before teardown. It matches `panic` at `kernel.ts:682–690`, which runs after closure and before teardown.

**Deleted reasoning, and where it is held now.** Each pointer the pass substituted for deleted text was followed to its target:

- `linear-shift.ts`'s G2 clause → `RectIndex.remeasureHole` (`rect-index.ts:380–383`), which states it;
- the DEV instrument's timing → `verifyEquivalence` (`rect-index.ts:451–452`);
- `seams.ts`'s latch reason and the swallowed-throw clause → `#reentry` (`seams.ts:190–200`), which states both;
- free drag's `home` classification paragraph → `anchorTarget`'s own docblock (`free-drag/spec.ts:847–851`), which carries the quality route and `drag: landing/target-unavailable`;
- the two orphaned `reportError` docblocks were folded into `#deliver` and the spec's `reportError`, with nothing lost.

The record's two cited deletions are held by D-152 and D-151. The remaining deletions are history, barrier narration made moot by step 4 (_no reading before `box`_, _no closure barrier to read after it_), or repeats.

**Local ordering proofs are kept.** Every removed comment line that mentions an order, a `finally`, a premise or a position was checked:

- `sortable/assemble.ts`'s retire-hook order is restated and still true: the axis hook is pushed first, at `:76–82`, and reversed last;
- `seams.ts`'s _before `begin()`_ replaces _one line later_ with the same constraint;
- the disarm condition, the field-order note and the arming order are unchanged in substance.

One rewrite that touches a `finally`'s premise is wrong (step5-A).

**Rewrites that restate a count** are true at the tip: _A new press is a disarm condition_, _`handle`, `panic` and `beginPass` reach the armed controller_ (the bracket takes four callbacks, `kernel.ts:2491–2504`), and _the `as never` assertions on `ACCEPTED` and in `reject`_.

### Published declarations

These ten built declarations differ in doc comments only:

- `free-drag/controller.d.ts` and `free-drag/domain.d.ts`;
- `kernel.d.ts` and `kernel/spec.d.ts`;
- `shared/composition.d.ts`;
- `sortable.d.ts`, `sortable/domain.d.ts`, `sortable/placement.d.ts`, `sortable/xy.d.ts` and `sortable/y.d.ts`.

`sortable/controller.ts`'s edits are `//` comments and are not emitted. No type, member or signature changed.

## Contract amendments

Each amendment listed in the record is present, dated, and names D-208 step 4 or §19.2. Each matches §19.4's disposition:

- 05's test matrix paragraph keeps D2's call exactness, and `y.browser`'s _should resolve each candidate visual once per rebuild_ exists and passes at the tip;
- the F-47 section note;
- I-36's _Mechanism_ note;
- I-36's operative restatement, qualified as §19.2 states: _not applied_ inside U-C, U-I and U-A, _applied_ inside U-T, tracking application outside every unit, and _R21 detects direct reads only_;
- 02's _`BehaviorContext.closed` answers liveness_, marked withdrawn;
- 01's D-203 sentence, in the past tense;
- 01's field count, marked;
- 01 §`BehaviorContext`'s `channel` entry.

The census-found amendments to I-6, the I-37 matrix group, 01 §The behavior instance, 02's two D-53 passages, 03's `placeholder()` and 07's two passages are each a dated mark that keeps the text. Nothing was deleted. No passage marked withdrawn states a guarantee the code still provides: each concerns a participant reading, and no participant reads the lifecycle at the tip.

## Census

**Reproduced exactly.** The record's search over `4987d33dd`'s six documents gives 269 lines: 01 35, 02 68, 03 33, 05 80, 06 21, 07 32. The record's table classes each of those lines exactly once, with none missing and none extra: K 65, H 66, A 43, N 91, E 4.

- **A.** Nine old lines are changed. The other 34 A lines are inside a passage that received a new section or paragraph note, which the record's rule (_a passage covered by a section or paragraph note is classed by that note_) allows. Each was checked to sit under one.
- **H.** The 17 H hits that carry no marker on their own line were traced to a covering note: 01:486's, 03:716's, 05:229–239 and 05:266's, the F-47 and stretch-table sections, and 06's readiness narrative.
- **K.** All 65 read in context. Each states a kernel-private fact that holds at the tip: the runner, request intake, the channel, I-21's registered cancel, the failure latch, `inSeam`, the re-entry latch, or _a live controller_ as the LIVE state. Some still use old names, such as `destroyRequested`, `runIngress`/`#closed` and two parallel arrays. The record states that names are not a census class. **One exception** is 02:880 (step5-B).
- **N.** All 91 read. None refers to the lifecycle. Each is _closed union_ or _closed world_, _lives in_, _live policy_, _live drag_, or _participant_ in the tier vocabulary (05:10–15, 02:788, 02:1878).
- **E.** The four escalated lines are as the record describes. 02:1846 calls `destroy()` _the synchronous terminal barrier I-6 requires_. 06:162 is the deleted post-callback `!closed` recheck. 06:779 and 06:789 describe D-36's deferral window. Each is unmarked, and none is within step4-A's three items: none is a participant barrier, `live()` or a latch predicate handed to participants, or `BehaviorContext.closed`.

## Record corrections (step4-B)

All three land in `ae21d8d1c`, step 5's first commit, as §19.4 requires.

- **`d207-step3.md`, the lifecycle-request row.** This is checked against `ef1e4ef6b`, the tree the table describes:
  - the armed controller's `dispatch` (`:2426`) has no lifecycle read;
  - `Kernel.dispatch` reads `this.#bracket.closed` (`:2584`);
  - `#onPointerDown` reads `this.#bracket.idle` (`:1161`).

  The correction moves `dispatch` to the façade and adds `#onPointerDown` under the runner. It is accurate, dated and struck-through-plus-restated. **step3-B's record half is discharged.**

- **`d208-step4.md` §Verification.** Fifteen, not fourteen, with `prefer-includes` in `g3-conformance.browser`. That is the count this reviewer reported at step 4.
- **`d208-step4.md` §Published-surface change.** `sortable/runtime.d.ts` is not emitted, and the built tree at either side has no such file.

## R34

| Row | Tip | Over `0c798ee17`'s `src/` | NB, `bounds()` without its copy | NL, the landing read moved after the `animate` lookup (reviewer) |
| --- | --- | --- | --- | --- |
| (a) _should keep the resolved bounds when the source rect is mutated_ | passes | **fails**: `expected [ 9900, +0 ] to deeply equal [ 200, +0 ]` | **fails**, the only red row outside the tip's set | passes |
| (b) _should start the tail with the timing the policy returned_ | passes | **fails** | passes | **fails**, the only red row outside the tip's set |

- **NB reproduces the record's count of one.** NL is this pass's own mutation, and the record did not run it. It applies `const animate = element.animate;` before the destructure and calls `animate.call(element, …)`. It shows that (b) pins the read order specifically, and not only the presence of a copy. Under NL, `size.node`'s _free drag + landing within its budget_ turns green, which agrees with step 4's attribution of that row's overrun to the read.
- **What (b)'s failure looks like.** In a whole-file run, (b) fails at the baseline and under NL with `expected undefined to match object { duration: 500, easing: 'linear' }`. The tail was started with a 1 ms duration and has finished by the time the assertion runs, so `getAnimations()` is empty. Run in isolation (`-t`), it fails on the timing object itself. A probe at the baseline recorded the options `animate` receives: `{"duration":1,"easing":"ease-in","composite":"add"}` on three of three runs. So the record's _the tail starts with `duration: 1`, `easing: 'ease-in'`_ is the mechanism, confirmed. The row's own message shows it only when the tail outlives the awaits.
  - The row cannot pass with the read misordered: either the tail is absent or its timing is wrong.
  - At the tip the tail is 500 ms long against two `settled()`s and one frame.
- **The R34 commit touches only tests**: the test file and `COVERAGE.md`.

## Escalations: whether any blocks step 5

§19.5 says _escalate rather than decide_ when:

- a comment states a property the code does not hold;
- a contract hit cannot be classified;
- a deletion would lose reasoning the record lacks.

Every escalated item is one of these, so escalating it is step 5's required outcome rather than a step left undone. **None prevents step 5's completion.** They do limit what an acceptance can claim. §19.5's postcondition, _each comment in those files states what the code there does now_, holds at the tip **except** at the 14 escalated source sites and step5-A. The four contract lines stay unmarked.

| Item | This pass | Consequence |
| --- | --- | --- |
| Source #1, `admitCommand`'s `// a consumer resolver destroyed the controller` (`sortable/spec.ts:624`) | **Confirmed.** `#seedDraft`'s two returns (`:469`, `:478`) are non-null, so the comment is false and the `if (!subject)` guard is unreachable | Tier C. Removing the guard is a code change, outside step 5 |
| Source #6, both controllers' `requestDestroy` JSDoc | **Confirmed**, and published | step5-C, Tier B |
| Source #10, `layout-animation.ts`'s _stops at the first miss_ | **Confirmed.** The early `return` is on an empty map only, and the loop at `:220` visits every slot | Tier C |
| Source #4, `Kernel.channel` item 1's example | Read. A resolver's request inside `OPEN_RESOLUTION`'s unit is registered, not applied, so the example's ordering cannot occur, while the invariant around it holds | Tier C |
| Source #7, `free-drag/spec.ts:455`, _last, because it may reentrantly cancel or destroy_ | Read. The kernel states its own reason for `onStart` last at `kernel.ts:1188`. The sortable twin was reworded (_may request cancellation or destruction_) although the record says the same question applies to it | Tier C. The reword should have been escalated beside its twin, and the architect's disposition of #7 covers both |
| Source #2, #3, #5, #8, #9, #11–#14 | Read, not verified | As the record classes them |
| Contract E, 02:1846, 06:162, 06:779, 06:789 | Read. Each is an unmarked pre-D-203 or pre-D-207 statement | Pre-existing. Outside step4-A's property, so not step 5's. Their omission repeats the step4-A pattern: the step 1 and step 3 contract lists did not name 02 §Queue semantics or 06 |

## Findings

### step5-A — a rewrite names a `finally` exit that no longer exists (Tier C)

- **Finding.** The docblock on `stale` in the sortable's spatial bracket now names, as an exit that leaves the flag set, _a placeholder reaction or a hook that threw_ (`sortable/spec.ts:1017–1022`). It was introduced by the pass.
- **Current behavior.** A placeholder reaction cannot exit the bracket. Custom-element reactions run inside `movePlaceholder`'s `before`/`after`, and a throw from one is reported to the global object, not propagated to the caller. A Chromium probe confirmed this: a throwing `connectedCallback` reached `window`'s `error` event, `after()` returned normally, and the element was connected. The exits that exist are:
  - `movePlaceholder`'s own throw, `drag: sortable/anchor-outside-container` (`placement.ts:165–169`), or a DOM exception from it;
  - the caught `movedInsertion` throw's `return` (`spec.ts:1059–1062`).

  At `0c798ee17` the reaction exit was real: the step-4-removed barrier after `movePlaceholder` returned early when a reaction had destroyed the controller.

- **Why it is a problem.** This comment is the stated premise of a `finally`, which is one of the local ordering proofs §19.5 keeps without exception. The pre-step-5 text (_a placeholder reaction that destroyed the controller_) already stated a property the code no longer held. §19.5 makes that an escalation, and the pass reworded it into a different false premise instead.
- **Evidence.** The diff hunk at `sortable/spec.ts:1018`; `placement.ts:154–176`; the probe above.
- **Required property.** The docblock names the exits the bracket has at the tip.
- **Route.** The architect, with the escalation list, since §19.5 governs rewording a comment whose property the code does not hold.

### step5-B — the census leaves one twin passage _current_, and its fourth class is unratified (Tier C)

- **Finding.**
  1. 02:880, _The one admitted gap … Recorded rather than closed, because closing it means carrying a per-operation "started" flag_, is classed **K**. Its source twin (`sortable/spec.ts:793–798`) is the record's escalation #2, on the ground that `#operation.progress = STARTED` now exists (`sortable/spec.ts:806`) and the cancel is registered rather than latched.
  2. Class **N** is outside §19.4's three classes. The record states this and invites escalation.
- **Why it is a problem.** For (1), the same rationale cannot be current in the contract and escalated in the source, and §19.4's rule sends a hit that is not clearly current to E. For (2), the reading is sound: all 91 N hits were read, and none mentions the lifecycle. But §19.4 states the classes, and only the architect can extend them.
- **Evidence.** The census table in `d208-step5.md`; the lines cited.
- **Required property.** 02:880 is either classed with escalation #2, or the architect's disposition of #2 names it. The census's class set is the one §19.4 states or the architect ratifies.
- **Route.** The architect.

### step5-C — the published `requestDestroy` JSDoc contradicts I-36 and the README (Tier B)

- **Finding.** Both controllers' `requestDestroy` JSDoc (`sortable/controller.ts:32–43`, `free-drag/controller.ts:63–74`, emitted into both `controller.d.ts`) says: _From application on nothing is admitted and no declared consumer slot is invoked_.
- **Current contract.** I-36's operative restatement names two exceptions:
  - teardown runs each installed feature's retire hook, and a retire hook is a declared consumer slot under D-176;
  - panic delivers one report to `onError` after closure (`kernel.ts:682–690`).

  The README bullet, fixed in this step, names both.

- **Why it is a problem.** It is published. A correct integrator, such as a feature author whose `retire` is a declared slot, is told the opposite of what the package does, and the package's own README says otherwise. This is Tier B by consequence. Its provenance is the pass's escalation #6: the sentence is already present at `0c798ee17`, so it predates step 4. §19.5 named the README bullet and not this twin, so the gap is in the handoff, as step4-A's was.
- **Required property.** The published JSDoc states what I-36 states.
- **Route.** The architect. It does not block step 5. It is consumer-facing, and the natural deadline is before `d208-requests.md`.

## Budget overruns

The four rows are over by the same bytes as at step 4: free drag + bounds +72, + landing +12, complete +52, and the kernel root +8. Step 5 moves no composition figure. Their attribution is as recorded at step 4 (§19.3), and R34 now pins both copies that cause three of them. The owner's disposition is still outstanding.

## Runtime

- **Measured:** nothing. No runtime statement moved, by two instruments, and the build output is byte-equal on every row, so there is nothing to time.
- **Analysis:** no change can be attributed to step 5, since equal stripped ASTs and equal minified bytes on all 15 rows leave no executable difference to explain. Byte-equal minified output is strong evidence of identical emitted code, but the bundles were not compared byte for byte.
- **Unresolved, and not step 5's:** M-1's resolving measurement and step4-D's remainder (step 6).

## Considered and not raised

- **`kernel.ts:2431` runs to 94 columns**, after the record's _rewrapped the over-long lines_. It is cosmetic, and formatting does not wrap comments.
- **`kernel.ts`'s bracket docblock keeps _Its four callbacks_** while `execution.ts`'s twin became _Every callback_. Both are true: the bracket takes four.
- **The sortable spatial guard's _The activation test is the one a producer reaches_** (`spec.ts:857`). The producer already tests `activation` before dispatching (`:343`), and `activation` is non-null throughout `ACTIVE`, so no conjunct may ever reject alone. The pass renamed the pre-existing _`view` test is what bites today_ without changing its claim. Its truth was not established here.
- **`tests/COVERAGE.md:604`** still says `kernel.closed` is a live getter. It sits inside a dated checkpoint section and is outside step4-A's documents.

## Verification limits

- Chromium only. `react.browser` and `stories.browser` load at neither tree, and `docs.node`'s four rows are red at both.
- The tip suite ran in a worktree, where `references.node`'s path row is red. The record's shared-checkout run was not repeated.
- R34's baseline run maps the renames back mechanically, as the record's does.
- Unchanged comments were searched by vocabulary, not read in full. Eight source escalations (#2, #3, #5, #8, #9, #11–#14) were read but not verified.
- The custom-element reaction probe is Chromium's behavior, which agrees with the HTML standard's _report the exception_ for reactions.

## Dispositions proposed

| Item | Proposed |
| --- | --- |
| Step 5 | No blocker. Acceptable, with the postcondition stated as holding except at the escalated sites and step5-A |
| step5-A (Tier C) | The architect's, with the source escalations |
| step5-B (Tier C) | The architect's: 02:880 joins escalation #2, and class N is ratified or refused |
| step5-C (Tier B) | The architect's. It is consumer-facing, so dispose of it before `d208-requests.md` |
| step4-B / step3-B | Record half present and accurate. step3-B can be marked closed |
| step4-A, step4-C | Done as directed. The census bounds the rest, apart from step5-B |
| R34 | Discriminating. NB reddens (a), and NL reddens (b) |
| The 14 source and 4 contract escalations | The architect's. None blocks step 5. #1, #6 and #10 are confirmed |
| The four budget overruns | The owner's, unchanged |
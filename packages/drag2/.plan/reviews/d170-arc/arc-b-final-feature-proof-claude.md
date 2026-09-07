# Arc B — final feature proof

**Subject** the landed Arc B implementation against [D-181](../../contract/00-index.md) as amended by [`arc-b-frame-transaction-claude.md`](arc-b-frame-transaction-claude.md) and [`arc-b-second-pass-claude.md`](arc-b-second-pass-claude.md). **Range** `185fb371..25be674c`, six commits, on `drag2/fin-review`. **Files read at `25be674c`.** Nothing in the tree was modified by this pass.

**Amended after filing**, at the round's request, on two mutation figures I had not run. `reviewer-5` is **restated and re-tiered C → B**: its premise was false, and testing it turned the finding into a different and larger one. The `185fb371` column of B-0's conjunct table is now in §1. Everything else stands as filed. The amendment is marked where it applies.

**The verdict in one line.** The architecture landed as amended and the instruments are stronger than the record claims — every one of the fifteen mutations `COVERAGE.md` tabulates reproduces, B-0's fork was decided on evidence that reproduces exactly on both trees, and all fifteen rows of the byte table reproduce to the byte on both figures against a rebuilt baseline — but the extraction moved two eagerly-constructed collaborators into `arm()` and changed behaviour on the pre-arm and destroy-during-arm windows in ways nothing in the record names and nothing in the suite observes, and one filed finding rests on a claim the suite refutes by thirty-four rows.

## 0. Scope

**Covered, with the evidence executed rather than read.**

- `src/kernel/transaction.ts`, `src/kernel/seams.ts` and `src/kernel/kernel.ts` in full, and the whole code-only diff of `kernel.ts` over the range statement by statement.
- Phase provenance: every `commit` call site, every `runCore` call site, and the residue sweep for `draft.phase` across `src/`, `tests/` and `.plan/`.
- The five-collaborator `SeamDriver` wiring, the `#pinned` fork, and the arm/unwind reordering.
- **B-0's evidence gate, re-derived**: all three `preparationValid()` conjunct mutations at `25be674c`, at `185fb371` and (for the terminal-latch conjunct) at `202581c6`; all three phase-swap mutations at both trees, and the report swap over the full suite.
- **All fifteen mutations of `COVERAGE.md`'s table**, run individually.
- **F-350's counterfactual**, executed rather than inherited — `runCore` opening the pair directly, at `25be674c`, over the behaviour directories and over the whole suite.
- **The Arc B measurement**: `measureAll()` at both trees, all fifteen rows, both figures and the module counts.
- `.plan/contract/00-index.md` (D-181, F-348…F-352), `02`, `03`, `06`, `challenge-response.md`, `plan.md`, `arc-b.md`, `budget-rebases.md`, `COVERAGE.md`; `.scripts/corpus-equivalence.ts` executed.
- Two behavioural probes over the construction and teardown windows, run at both trees.

**Not covered.** The M-1/M-1′ timing tables and the per-sample accessor counts were not re-run — the timings are a declared null result at a 0.0977 µs quantum and the accessor counts required a temporary probe the pass did not keep; I derived the free-drag figure (7) by hand from the source and it agrees exactly, and I did not attempt the sortable's 9.12. `tests/perf/*`, `tests/probes/*`, `tests/revision/*` and the sortable and free-drag behaviour tiers were run but not read. F-352's thirteen `queue.*` lines were not read individually — that is the finding's own deferral. The `retire(reset)` half of `reviewer-5`'s residue is argued, not mutated.

**Provenance of every mechanical result below.** All mutation runs, both behavioural probes, the baseline and arc `measureAll()` runs, the pinned full-suite runs and `corpus-equivalence.ts` were executed in detached `git worktree` checkouts pinned at `25be674c`, `185fb371` and `202581c6`, each `git status`-clean before and after every run, each removed afterwards. Nothing load-bearing rests on the main checkout: the two things I did run there — one full suite and one `measureAll()` — were both re-executed in the pinned worktree and the size table came back byte-identical on all fifteen rows and both figures. (During the round the main checkout briefly carried another pass's live mutant at `kernel.ts:2079`; my `commit(`/`.phase =` greps and my `Read` of that file all show `commit(ACTIVE)`, so they predate it, and the full suite I ran there reported 1299/1300 passing, which that mutant could not have allowed.) Nothing in this report is unpinned, and nothing was dropped for being unrepeatable.

**Suite state at `25be674c`, pinned.** 1297 passed, 60 skipped, 3 failed: `tests/consumer.node.test.ts` packaging rows that **reproduce identically at `185fb371`** in the same worktree shape. One earlier run also reddened `tests/perf/m5.browser.test.ts` arm A, which passes in isolation on both trees and is load-flaky. **Nothing in the range reddens a row.**

## 1. What holds — the null results, stated because they are results

**The five collaborators and the wiring.** `SeamDriver` takes `(frames, begin, preparationValid, fail, notify)` at [`kernel.ts:2477`](../../src/kernel/kernel.ts), `notify` is `#report` and not a fresh arrow, and `FrameTransaction` holds two frames and a reference to nothing. `#reporting`, `settlementInput` and `#actionTag`/`#actionArgument` all stayed on the kernel as the amendment requires.

**Phase provenance is exactly as claimed, and the seven are the seven.** `commit(PENDING)` `:1035`, `commit(FINALIZING)` `:1618`, `commit(RELEASING)` `:1891`, `commit(ACTIVE)` `:2079`; `runCore(…, ACTIVATING)` through `runActivationSeam` `:1317`, `runCore(…, SETTLING)` `:1693`, `runCore(…, checkpoint.stage, REPORTING)` `:2186`. The two that change no phase pass an explicit `null` — the sample commit `:1841` and the action seam `:2318` — and the release seam reaches `runCore`'s default because `#closeOperation` has already committed `RELEASING`. **No phase is reconstructed or inferred at any site.** Threading is strongly pinned: making `runCore` commit `null` instead of its argument reddens 385 of 1060 rows.

**B-0's fork reproduces exactly, on both trees.** Dropping each conjunct of `#preparationValid()`, over `tests/kernel` + `tests/sortable` + `tests/free-drag`, against a clean control of 0 on every tree:

| Conjunct dropped | `185fb371` | `202581c6` | `25be674c` | Record says |
| --- | --- | --- | --- | --- |
| `!this.#bracket.closed` | **0** | **1** — _should discard a preparation whose prepare destroyed the controller_ | **1** — same row | `COVERAGE.md`'s B-0 table: "**none** — the row now covering it was written first, against that tree" ✓; F-348 repaired: "reddens that row and no other behavioural row" ✓ |
| `!this.#operation?.cancelRequest` | — | — | **3** — the cancelling factory, the rolled-back element, the enqueued `invalidate()` | "3" ✓ |
| `this.#frames.current.operation === this.#pinned` | — | — | **0** | F-349: "none, and none could be written" ✓ |

**The three-tree column is what makes F-348's tier stand.** `202581c6` is the range's first commit — it adds the row and touches no source — so it is the tree that separates _the conjunct was uncovered_ from _the conjunct is uncoverable_. At `185fb371` the mutation reddens nothing because no row exists; at `202581c6`, over source byte-identical to `185fb371`, the same mutation reddens exactly the new row and nothing else. **The gap F-348 names is real on the tree it names, and the repair is real on the tree that carries it.**

**F-349's unreachability claim survives an independent derivation.** `#pinned` is written only in `#begin()` and read only in `#preparationValid()`, which is reached from two sites — twice inside `runCore` after that call's own `begin()`, and once from `#activationPolicy.committed()` after `runCore` returned. Between them the only foreign code is `prepare`/`effect`, whose reachable acts are `cancel()` (conjunct two), `destroy()` (conjunct one — deferred at depth > 0, and at depth 0 it nulls both sides so the conjunct reads `null === null`), `dispatch()` (appends), and a synchronous re-entrant ingress event, refused by `#openIngress`'s operation guard and by the bracket. `#retireOperation` scrubs and clears with no reentrant call between them. I could not construct a falsifier either. **This is a claim about the conjunct never firing; it is not a claim about the conjunct never firing wrongly — see `reviewer-5`.**

**B-0's phase-swap table reproduces, and its scope is the full suite.** Swapping the report seam's phase at `185fb371` reddens 16 rows over the three behaviour directories and **exactly 21** over the whole suite net of that tree's three pre-existing failures — the figure `COVERAGE.md` records. Activation and settlement redden 396 and 193 over the three directories against a recorded 408 and 202, consistent with the same wider denominator.

**All fifteen instrument mutations reproduce**, each reddening exactly the rows `COVERAGE.md` names. Nine of `transaction.ts` (including the two-row _phase written after the swap_), four type-level, and both `arm()` mutations — `#spec` published before the pair reddens only _tear down without reaching a frame when a factory destroys_, and the unwind reading the field instead of its locals reddens exactly three. The one label needing care is _the retired frame not handed back_: read as `this.#draft = { ...previous }` (the copy the row's own text names) it reddens one row; read as dropping the reassignment it reddens two. **The instrument is sound and the table is honest.**

**`seams.node.test.ts` constructs the real entity** and keeps the validity flag, as §2 required. Its `commits(): number` became `committed(): boolean` — a parity read rather than a count. That is strictly weaker in principle, and it costs nothing in practice: every row asserting it runs one `runCore`, and the one row about a _nested_ commit (_should not swap the frame pair a second time_) is the 1-vs-2 case parity distinguishes. Dropping the publish inside `commit` still reddens five of its 86 rows, so nothing there went vacuous.

**The measurement reproduces to the byte.** `measureAll()` at `185fb371` (rebuilt) and at `25be674c`, all fifteen rows: every Brotli figure, every minified figure and every module count in `arc-b.md`'s table is exact, including the +359/+357 split, the −7…−49 Brotli spread, the +18 on `minimal (xy)`, and the two zero-on-both-figures controls. No budget, control or graph violation on either tree. The union identity for `both behaviors` at 47 modules holds. `corpus-equivalence.ts` reports equivalence.

**The sweep landed.** All six `06` sites, all four `02` sites and both `challenge-response.md` sites named by §7 were rewritten; no live contract trace still spells `draft.phase = …`; `SeamContext` is gone from `src/`, `tests/` and every contract list; `FrameTransaction` appears in no published `.d.ts`.

## 2. Findings

### reviewer-1 — `kernel.fail()` throws a `TypeError` when a behavior calls it before `arm()` returns · tier A

**Finding.** The seam driver moved from an eagerly-initialised field to a definite-assignment field written inside `arm()`. `Kernel.fail()` dereferences it with no guard, so every `context.fail()` call made before `arm()` finishes — from the behavior factory's own body, or from inside `createFramePart`, which runs _inside_ `arm()` and before the assignment — now throws `TypeError: Cannot read properties of undefined (reading 'requestFailure')` out of `draggable()`.

**Current behavior / contract.** At `185fb371` the driver was `readonly #driver = new SeamDriver<Part>(this.#context)` (`kernel.ts:907`), constructed with the instance, so `fail` was always callable. At `25be674c` it is `#driver!: SeamDriver<Part>` (`:359`), assigned only at `:2477`, while `fail` at `:2408-2410` is unchanged:

```ts
  fail(stage: FailureStage, error: unknown): void {
    this.#driver.requestFailure(stage, error);
  }
```

The behavior-facing contract for a call outside a seam is explicit — `requestFailure`'s own doc in `seams.ts`: _"Valid **only inside a kernel-driven seam of the current operation**: a call outside one is reported as a warning instead"_ — and `#notify`'s `this.#spec?.reportError` is written to make that warning a silent no-op while no behavior is armed (`kernel.ts:428`). Before arm is a _supported position_, not an undefined one: `src/kernel.ts:227-231` documents that `draggable()` calls the factory with the kernel narrowed to `BehaviorContext` and arms ingress only after the factory returns.

**Why it is a problem.** A published entry point (`draggable`, from the kernel tier) now throws a platform `TypeError` at the integrator where it previously returned a working controller. The throw is not classified, not reported through `onError`, and carries no library message. From `createFramePart` it is worse than a bare throw: it escapes the factory, `arm()`'s catch unwinds `spec.retire()`, scrubs the one composed frame and aborts ingress, and rethrows — so the controller is destroyed by a call the contract says produces a warning. `fail` is the only member of `BehaviorContext` this regressed; `dispatch` and `closed` are unchanged, and `cancel` throws on both trees (it has always dereferenced the frame pair before arm), so the range introduced exactly one.

**Evidence / reproduction.** Probe run in pinned worktrees at both commits, calling each `BehaviorContext` member from the factory body of an otherwise-minimal `draggable()`:

| Member | `185fb371` | `25be674c` |
| --- | --- | --- |
| `fail` | **no-throw** | **THREW TypeError: Cannot read properties of undefined (reading 'requestFailure')** |
| `cancel` | THREW TypeError (`…reading 'operation'`) | THREW TypeError (`…reading 'current'`) |
| `dispatch` | no-throw | no-throw |
| `closed` | no-throw | no-throw |

The same throw reproduces with the `fail` call moved inside `createFramePart`. No row in the suite covers either position.

**Required property.** A `BehaviorContext` member reached from a documented pre-`arm` position must behave as its own contract states — for `fail`, reported and dropped — rather than throwing a platform error out of `draggable()`. Whichever way that is achieved, the property needs a row: the range changed this silently and 1360 tests did not notice.

### reviewer-2 — `destroy()` from inside `createFramePart` no longer runs teardown step 4, and the row written for the reordering does not observe it · tier B

**Finding.** `arm()` now publishes `#spec` _after_ composing both frames. Teardown's steps 3–6 are guarded by `if (this.#spec)`, so a `destroy()` raised from inside `createFramePart` now falls on the null side of that guard and **`spec.retire()` is never called** — not during teardown, because `#spec` is still null there, and not from `arm()`'s catch, because nothing threw and `arm()` returns normally.

**Current behavior / contract.** [`01-construction-ownership.md`](../../contract/01-construction-ownership.md) `:398-404` lists `spec.retire()` as step 4 of teardown, wrapped and best-effort; `:444` states what it is for — _"`retire()` drops references"_. The second pass's §5, which is where this reordering was decided, derived it from a reading of the old behaviour that is factually wrong: _"Today a `destroy()` raised from inside `createFramePart()` reaches a scrub that reads an unassigned field, and `frame(undefined)` allocates a throwaway — harmless."_ What it actually reached was `spec.retire()` **and then** two `resetFramePart` calls.

**Why it is a problem.** A behavior's declared teardown slot stops being called on a path where it was called, so any reference `createFramePart` acquired before destroying is never released — and the record contains no sentence saying so. The step's loss is not a side effect of the required property (`#spec !== null ⟹ both frames exist`); it is a second consequence of the chosen closure, and it was not priced. The new instrument does not cover it: _should tear down without reaching a frame when a factory destroys_ asserts `resets === 0` and its comment reads _"nothing was armed at the moment of the close, so nothing behavior-owned is reset"_ — which is true of the resets and says nothing about `retire`, the one call that changed.

**Evidence / reproduction.** The same probe at both commits, logging every behavior callback while `createFramePart` destroys:

|  | call order |
| --- | --- |
| `185fb371` | `createFramePart#1` → **`spec.retire`** → `resetFramePart` → `resetFramePart` → `createFramePart#2` |
| `25be674c` | `createFramePart#1` → `createFramePart#2` |

Both trees leave the two real frames unscrubbed on this path, so the retention is unchanged; the two `resetFramePart(throwaway)` calls disappearing is an improvement. **The one material difference is `spec.retire()`.**

**Required property.** Either teardown step 4 runs on every path a `destroy()` can reach, or the exemption is stated in `01` §Teardown and carried by a row that observes `retire` rather than `resetFramePart`. As it stands the tree and the contract disagree and no instrument can tell.

### reviewer-3 — the Brotli headline says thirteen of fifteen rows fell; twelve did, and the arc's own table shows it · tier C

**Finding.** Twelve of the fifteen rows fall on Brotli, one rises (`minimal (xy)`, +18 B) and two are zero. The claim of thirteen appears to have been carried over from the _module_ count, where thirteen is correct.

**Evidence / reproduction.** Reproduced exactly at both trees. Falling: `minimal` −25, `+ layoutAnimation` −32, `xy + layoutAnimation` −11, `+ landing` −19, `complete` −49, `free drag minimal` −7, `+ bounds` −34, `+ landing` −45, `free drag complete` −31, `both behaviors` −16, `kernel root` −8, `baseline A` −27 — **twelve**. Rising: `minimal (xy)` +18. Zero: `vocabulary root`, baseline B. 13 + 2 + 1 = 16 > 15, so the sentence is self-refuting against its own table, which `arc-b.md` then contradicts three sentences later (_"`minimal (xy)` is the one row that pays"_). The module claim of thirteen is correct and reproduces.

**Why it is a problem.** It is in four places, one of them the decision ledger: [`arc-b.md`](../../.plan/measurements/arc-b.md) §The result in one line and §Brotli, [`budget-rebases.md`](../../.plan/measurements/budget-rebases.md), [`plan.md`](../../.plan/plan.md) `:2311` and [`00-index.md`](../../contract/00-index.md) D-181 `:1781`. This is the F-347 shape — a summary generalizing past the table beneath it — recorded one arc later by the pass that recorded F-347.

**Required property.** A quantified byte claim in a decision entry counts the rows its own table shows.

### reviewer-4 — the instrument is thirteen rows, recorded as eleven · tier C

**Finding.** D-181's entry and `COVERAGE.md`'s own header say _eleven rows_. The tabulated instrument is thirteen: seven in `transaction.node.test.ts`, four in `transaction.declaration.test.ts`, and the two `kernel.browser.test.ts` rows the same table lists and the same fifteen mutations name as their witnesses (_tear down without reaching a frame when a factory destroys_ and _should discard a preparation whose prepare destroyed the controller_).

**Evidence / reproduction.** Counted at `25be674c`; the mutation table's right-hand column names both browser rows as sole witnesses, so they are inside the count by the table's own construction. Eleven is the count of the two new _files_.

**Why it is a problem.** [F-342](../../contract/00-index.md) is _"the Stage 1 plan entry counts thirteen instrument rows as eleven"_ — the identical numbers, the identical shape, and the ledger repeats it in the entry immediately after recording it. The count is how a later pass decides whether the instrument survived.

**Required property.** The row count in a decision entry is the count of the rows the entry's own coverage table carries.

### reviewer-5 — F-350's ground is refuted by the suite: the misuse it calls invisible reddens thirty-four rows · tier B

> **Restated and re-tiered after filing.** As filed this read _"the transaction ownership boundary is stated in prose and enforced by nothing"_ at tier C, and rested on F-350's own claim that the misuse would go unobserved. That premise was challenged, executed, and is false. The structural half survives and is demoted to a residue below; the finding is now about the record.

**Finding.** [F-350](../../contract/00-index.md) is the entry that justifies the driver's fifth collaborator. It states the wiring consequence correctly — under the selected fork `frames.begin()` "would take the copy and leave the pin behind … every transaction the driver opens would revalidate against whatever a previous one pinned" — and then grounds the whole finding on this:

> Since the conjunct has no reachable falsifier, **that degradation would have been invisible to the suite**, which is exactly why it is recorded rather than absorbed.

**Executing that substitution reddens 34 rows.** The degradation is not invisible; it is one of the loudest mutations in this pass.

**Why the inference fails.** F-349 and F-350 concern **opposite directions** of the same conjunct, and the record slides from one to the other. F-349 establishes that no reachable state makes `current.operation === #pinned` **false** under correct wiring — the conjunct never fires, so deleting it changes nothing. F-350's stale pin makes the conjunct false **when nothing is wrong** — the conjunct fires constantly. Unreachability of the first says nothing whatever about observability of the second.

And the tree is specific about why it is loud. With the pin left behind, any operation whose first driver transaction is **not** preceded by a kernel `#begin()` in the same drain revalidates against a pin an earlier transaction wrote. That is exactly the pointerless/command path — `#admitCommand` mints and dispatches `ACTIVATE`, so `#handleActivate` reaches `runCore` with `#pinned` still holding the `null` the admission's `beginPass` wrote, and the activation seam is invalidated before it can publish — plus the admission-queue-boundary rows, where a behavior action drains immediately after an admission that pinned `null`. The pointer path is unaffected because `#handleMove`'s own `#begin()` re-pins on every sample.

**Evidence / reproduction.** `seams.ts:292`, `this.#begin()` → `this.#frames.begin()`, with `#pinned` and the conjunct left exactly in place, at `25be674c` in a pinned worktree:

| Scope | Clean control | Mutant | Net |
| --- | --- | --- | --- |
| whole suite | 3 failed (the worktree's packaging rows) | 37 failed | **34** |
| `tests/kernel` + `tests/sortable` + `tests/free-drag` | 0 failed | 27 failed | **27** |

The 27: `tests/sortable/keyboard.browser.test.ts` × 16 (the whole command-ingress, pointerless-lifecycle, command-destination, proposal-equivalence and command-re-entry groups); `tests/sortable/sortable.browser.test.ts` × 6 (five admission-queue-boundary rows and _should not activate when the item left the collection_); `tests/sortable/input-policy.browser.test.ts` × 2 (both keyboard rows); `tests/kernel/kernel.browser.test.ts` × 2 (_should mint a pointerless operation and queue ACTIVATE_, _should report the origin for a pointerless operation_); and `tests/kernel/seams.node.test.ts` _should refuse the nested transaction before it rebuilds the draft_, which counts opens through the injected closure and is the most direct unit witness of the substitution.

**Why it is a problem.** The `.plan` record is what later passes act on. F-350 is filed **open**, and it tells its reader that the tree carries no coverage for this wiring — so a pass discharging it would reasonably file work to build an instrument that already exists thirty-four rows deep, or would treat a future edit in this area as unguarded when it is not. The error is also of a kind the round should be able to catch cheaply: the claim is a mutation, and running it costs one command.

**What survives, and what does not.** F-350's **conclusion** is correct and untouched — the fifth collaborator is the right wiring, and its forward statement ("the four-argument shape returns if and when F-349 is discharged by deleting the conjunct") is sound, since with the conjunct gone there is no pin left to go stale. Only the ground is wrong.

**The residue, stated so it is not lost with the premise.** The structural observation still holds: the driver is handed the entity itself, `transaction.declaration.test.ts` pins `begin` and `retire` into its member set, and nothing in the types or at runtime stops `seams.ts` from calling either — one transaction is opened by one collaborator and committed by another with no shared object enforcing the pairing (`seams.ts:160-166` states the rule as a comment). But it no longer needs a guard **on coverage grounds**, which was the only ground I had: `begin` is covered thirty-four rows deep. `retire(reset)` is the smaller and still-unmutated half, and whether an unenforced-but-instrumented boundary is worth closing is a design call for the architect, not a defect.

**Required property.** A filed finding's stated ground is true of the tree it names. Where a finding asserts that the suite would not observe something, that assertion is executed rather than inherited from a neighbouring finding about a different failure direction.

### reviewer-6 — `#begin`'s doc states a settled ground for the pin's location that the record explicitly declines · tier C

**Finding.** [`kernel.ts:473-480`](../../src/kernel/kernel.ts) explains why `#pinned` is the kernel's:

> The pin is the kernel's rather than the pair's because the question it serves is: `preparationValid()` composes it with the terminal latch and the operation's cancel request, and two of those three facts are owned elsewhere. What the pair owns is the copy.

**Why it is a problem.** That is the second pass's §2 argument for keeping **`preparationValid`** on the kernel, and §2 applies it while _simultaneously_ moving `#pinned` onto the entity as `operationUnchanged()` — the two are separable and the amendment separates them. The reason the pin actually stayed is §3's third fork arm and F-349: the conjunct has no reachable falsifier, so relocating it into a new entity in the commit that would justify deleting it was refused. F-349 states plainly that the field's location is still **owed a reading** — _"either a reachable path and a row, or a deletion"_. A source comment that gives it a settled compositional ground pre-empts exactly that reading, and the sentence is also grammatically broken at the colon.

**Required property.** Where a field's location is an open finding, the source may not state a ground that closes it.

### reviewer-7 — three quantified statements in the measurement and ledger prose are false as written · tier C

**Finding.** Three, all in the same family as reviewer-3 and each cheap to check:

1. **`draft.phase` is assigned at no site in the package** — D-181 `:1777`, `plan.md` `:2303`, second pass §6. `src/kernel/transaction.ts:71` is `this.#draft.phase = phase;`. The true claim is _no site outside the call that commits_, which is the claim the whole arc rests on and which does hold; as written it is falsified by a one-line grep, and a later reader running that grep learns the wrong thing about which sentence to trust.
2. **"every row is 0.09 to 0.13 kB under its ceiling"** — `budget-rebases.md`, and `arc-b.md`'s _"Slack is 0.09 to 0.13 kB where it was 0.06 to 0.11"_. Over all fifteen rows the slack runs 0.063 kB (`vocabulary root`) to 0.151 kB (baseline B) on both trees. The stated ranges are correct **over the thirteen kernel-carrying rows** — I confirmed 90…133 B at `25be674c` and 67…108 B at `185fb371` — but the sentence quantifies over "every row", and the lower bound appears to move when the row that sets it (`vocabulary root`) is byte-identical on both trees.
3. **The accessor-undercount attribution.** `arc-b.md` says D-181 missed _"that `#begin` reads `current` to pin the operation, that `#handleMove` reaches the pair again through the phase test and the commit"_. `#handleMove`'s phase test is already one of the two reads D-181 counted, and `commit` reaches the pair only through private fields — `FrameTransaction.commit` invokes no accessor. Deriving free drag's figure by hand from the source gives exactly the seven it measured, and `#begin`'s `current.operation` is the single uncounted site: 1 (`#onPointer`) + 2 (`#handleMove` reads) + 1 (`#begin`) + 2 (draft writes) + 1 (`#runMoved`) = 7. **The number is right and the account of it is not.**

**Required property.** A claim written to be checked mechanically is stated so that the mechanical check confirms it.

### reviewer-8 — `ArmOutcome` is a second dead name in the very list F-351 was raised about, and B-5's correction of that list left it · tier C

**Finding.** `ArmOutcome` exists nowhere in `src/` (grep exits non-zero) but is still carried by [`vocabulary.node.test.ts`](../../../tests/kernel/vocabulary.node.test.ts) `:110`, by [`02`](../../contract/02-kernel-behavior-contract.md) §792's Not-published row and by [`03`](../../contract/03-feature-composition.md) §1347 — all three of which the range edited, in the same lines, to delete `SeamContext` and add `FrameTransaction`.

**Why it is a problem.** F-351's whole content is that this list is an allow-list, so _"an entry naming a type that no longer exists widens the allow-list by one dead name and asserts nothing"_, and that the hand correction _"was not caused by the instrument, and nothing would have caused it"_. A second dead entry sitting on the adjacent line, visible in the same hunk, went uncorrected — which is F-351's own point demonstrated rather than described, and is worth attaching to the finding while the reading is open.

**Required property.** A hand-maintained tier list corrected by a pass is corrected against the source, not against the one name the pass came to change.

## 3. What the findings do not touch

The two load-bearing claims stand. **The stamp is gone and the phase is an argument of the call that commits**, at all seven phase-changing sites, with no state carrying a phase between statements and no caller supplying one it did not derive. **The driver holds the entity rather than becoming it**, the entity holds a reference to nothing, and the fifth collaborator is a correct consequence of the fork the evidence selected rather than a drift from the plan — `reviewer-5` refutes the ground F-350 gives for it, not the wiring itself, which the same 34-row mutation confirms is the only correct one under this arm. Every mechanical claim the record makes about the instrument, the gate and the bytes reproduces on the tree it names. The two behavioural findings are both in the **construction and destruction windows** — the interval `arm()` newly reshaped — and neither reaches a live operation, a seam, a frame transition or the move path.
# Arc B — feature proof

**Files read at `25be674c`** on `drag2/fin-review`; mutations run in detached worktrees at `25be674c` and `185fb371` with `node_modules` symlinked, never in the repository tree. **Subject:** [D-181](../../contract/00-index.md) as amended, and [`arc-b-second-pass-claude.md`](arc-b-second-pass-claude.md). **Range** `185fb371..25be674c`.

**Verdict. Arc B's extraction holds.** Every structural claim on the checklist verified affirmatively and every instrument reproduced except where noted below. What did not hold is the arc's own **record of its evidence**: one B-0 measurement does not reproduce and the finding built on it rests on a false premise, one finding's stated reason is contradicted by its own counterfactual, and three smaller counting claims are wrong. No tier A. One tier B, four tier C.

## Scope

**Covered.** The stamp's disappearance and phase provenance at all seven phase-changing commits; `FrameTransaction`'s member set, imports and reference graph; the B-0 conjunct matrix re-run on **both** trees; F-350's counterfactual constructed and run; `arm()`'s locals, unwind and `#spec` ordering; the seam harness's substitution row by row; all fifteen recorded mutations reproduced individually; the whole fifteen-row byte table re-derived on both trees from `measureAll()` after building each; the per-sample accessor count re-measured with an independent probe; the contract sweep (`02` §240/§792/§1339/§1442/§1801, `03` §1347, `06`, `challenge-response.md`); F-351 and F-352 checked against the tree; `oxfmt`, `oxlint`, `eslint` and `tsc` over the arc's files; the full suite in the repository tree.

**Not covered.** M-1 and M-1′ timing medians were not re-run — the record's own reading is a null result at one quantum and re-running it can only reproduce a null. B-0's phase-mutation abundance counts were reproduced under my own choice of substitute phase (408 exactly; 199 and 22 against the recorded 202 and 21), which is the ambiguity of "swap", not a discrepancy. `.plan/reviews/**` is outside `references.node.test.ts`'s link scope, so this file's links were resolved by hand.

## What holds

**The stamp is gone and the phase is carried nowhere.** `#armedStamp`, `#stamp`, `#runStamped`, `NO_STAMP` and `ArmedStamp` have no occurrence in `src/` or `tests/`. The only assignment to a frame's `phase` in the package is [`transaction.ts:71`](../../../src/kernel/transaction.ts#L71), inside `commit`, guarded on `phase !== null`; the only other write of the field anywhere is the frame factory's `IDLE` in [`frames.ts:53`](../../../src/kernel/frames.ts#L53), which is composition, not a transaction. The **seven** phase-changing commits are four direct — [`:1035`](../../../src/kernel/kernel.ts#L1035) `PENDING`, [`:1618`](../../../src/kernel/kernel.ts#L1618) `FINALIZING`, [`:1891`](../../../src/kernel/kernel.ts#L1891) `RELEASING`, [`:2079`](../../../src/kernel/kernel.ts#L2079) `ACTIVE` — and three through the driver: `runActivationSeam(…, ACTIVATING, …)` at [`:1316`](../../../src/kernel/kernel.ts#L1316), `runCore(…, SETTLING)` at [`:1693`](../../../src/kernel/kernel.ts#L1693), `runCore(…, REPORTING)` at [`:2186`](../../../src/kernel/kernel.ts#L2186), each reaching the one write at [`seams.ts:312`](../../../src/kernel/seams.ts#L312).

**The entity holds a reference to nothing.** [`transaction.ts`](../../../src/kernel/transaction.ts) imports `Frame` and `Phase` as **types only**; the words `operation`, `bracket`, `spec`, `Kernel` and every DOM name appear in its prose and nowhere in its code. Its public members are exactly `current`, `draft`, `begin`, `commit`, `retire`, pinned by a declaration row whose mutation I ran.

**F-350's mechanism is sound.** `FrameTransaction.begin()` has exactly **one** caller in `src/` — [`kernel.ts:483`](../../../src/kernel/kernel.ts#L483), the second statement of `#begin`, whose first statement is the pin. `seams.ts` never names `#frames.begin`; it calls the injected `#begin` closure at [`:292`](../../../src/kernel/seams.ts#L292) and reaches the pair only through `.draft`, `.commit` and `.current`. `#pinned` is written at three sites: the pin, and two clears after the frame scrubs at [`:613`](../../../src/kernel/kernel.ts#L613) and [`:687`](../../../src/kernel/kernel.ts#L687). **No route copies without re-pinning and none pins without opening the transaction.**

**`arm()` closes both windows and opens none.** The pair is composed into two nullable locals, `FrameTransaction` is constructed once from both, `#spec = next` is published **after** the construction and before any listener, and the catch resets `current` and `draft` through `#resetFrame(next, …)` — the locals, not the field, and not through `#scrub`, whose `#spec!` is what would have broken. Totality survives the reshape: `#resetFrame` wraps each reset in `#unwind` itself, so `retire(#scrub)` still resets the second frame after the first throws. Between `new FrameTransaction(...)` and `#spec = next` nothing foreign runs, so the reordering introduces no window of its own.

**The seam harness is not weakened.** `SeamContext` is gone; the harness builds a real `FrameTransaction` and keeps three closures for the three edges that are genuinely the kernel's. The one substitution is `commits(): number` → `committed(): boolean`, read as swap parity. All eight call sites asserted `0` or `1`, and each row's own counterfactual still reddens — including the re-entry row, where a second swap reads `false` against an expected `true`. The narrow loss is real and worth naming: a mutation producing **exactly two** commits where a row expects none now reads as "not committed" and passes. No such mutation is among the fifteen and none is constructible from the shipped code, where a `runCore` commits at most once.

**All fifteen mutations reproduce**, each applied individually against a green baseline. The nine runtime mutations, the four type-level ones and the two `arm()` ones all redden their named row; `m15` reproduces its recorded three exactly (the partial-pair scrub plus _should unwind and rethrow when a frame factory throws_ and _should reject a `command.types` entry colliding with the pointer ingress_). Three counts are understated — `arc-b-4` below.

**The identity conjunct's result reproduces.** Dropping `this.#current.operation === this.#pinned` at `185fb371` reddens **no** behavioural row, twice run. F-349's conclusion and the fork's third arm stand, and the pin's staying put is the right arm of the fork.

**The measurement re-derives cell for cell.** `measureAll()` on freshly built trees at `185fb371` and `25be674c` reproduces all fifteen rows of `arc-b.md`'s table exactly on Brotli, minified and modules: +359 minified on thirteen rows, +357 on `kernel root`, 0 on `drag.js` and baseline B; module counts 32→33 … 26→26. Slack moves 67–108 B → 90–133 B, matching "0.09 to 0.13 kB where it was 0.06 to 0.11". **No `budget:` changed**; the five re-declared `control:` values in [`measure.ts`](../../../bench/size/measure.ts) equal the measured arc Brotli exactly. An independent accessor probe — `FrameTransaction.prototype`'s two getters wrapped, 100 `pointermove` samples one animation frame apart, drag confirmed live at 51 children under a 50-item root and `translate(0px, 149px)` on the lifted item — reads **6.09 / 3 / 9.09** for the sortable and **5 / 2 / 7** for free drag, against the recorded 6.12 / 3 / 9.12 and 5 / 2 / 7. D-181's prediction of six is refuted on both compositions, as recorded.

**The sweep reached the tree rather than a list.** `02` §240 carries the sharpened sentence; `02` §792 and `03` §1347 lose `SeamContext` and gain `FrameTransaction`; the `KernelFrame.phase` paragraph stops naming `stamp`; every phase-writing trace in `02`, `06` and `challenge-response.md` is rewritten. No live `SeamContext` reference survives outside D-181's own historical entry. F-351 is confirmed by reading: `INTERNAL_NAMES` is consulted only at [`vocabulary.node.test.ts:215`](../../../tests/kernel/vocabulary.node.test.ts#L215) as `!PUBLISHED_NAMES.has(name) && !INTERNAL_NAMES.has(name)`, an allow-list a dead entry can only widen. F-352's thirteen lines reproduce exactly at `185fb371`.

**The tree is clean.** `npx just fmt`, `npx just lint` and `npx just typecheck` over the arc's files produce no change and no diagnostic. The suite is green in the repository tree: 1,300 passing, 0 failing, 1,360 collected.

## Findings

### `arc-b-1` — tier B — the B-0 row that F-348 rests on does not reproduce: the terminal latch's conjunct had five witnesses at `185fb371`, not none

**Current record.** [`COVERAGE.md`](../../../tests/COVERAGE.md)'s B-0 table reads `!bracket.closed` dropped | **none** — the row now covering it was written first, against that tree. [`plan.md`](../../plan.md) and [`00-index.md`](../../contract/00-index.md) repeat it, and F-348 is graded **tier B** on that basis, with the reason stated generally: _the tree has many `destroy()`-inside-a-callback tests, and every one of them asserts what the controller looks like **afterwards**, where the teardown that follows erases the difference between a transaction that published and one that did not._

**Why it is a problem.** The measurement is the warrant for the finding, and it is not reproducible. Removing `!this.#bracket.closed &&` from `#preparationValid()` at `185fb371` reddens **five behavioural rows**, deterministically, over two runs against a green 1,347-row baseline:

- `tests/kernel/kernel.browser.test.ts` — _the landing tail should start no tail when the policy destroyed the controller_
- `tests/kernel/kernel.browser.test.ts` — _terminal destruction during the join should not call the terminal callback after `anchorTarget` destroyed the controller_
- `tests/kernel/kernel.browser.test.ts` — _terminal destruction during the join should start no tail after a presentation disposer destroyed the controller_
- `tests/free-drag/validation.browser.test.ts` — _an invalid home result should reach no `onError` when the resolver destroys and then throws_
- `tests/sortable/features.browser.test.ts` — _landing should leave nothing behind when the duration thunk destroys the controller_

(The five `size.node.test.ts` control rows also move, as they do for every source mutation, and are excluded.) These rows are precisely the shape the finding says the tree does not contain: they assert what happens **inside** the window — that a terminal callback does not fire, that a tail does not start — not what the controller looks like afterwards. The generalisation is stated in three documents and is what a later pass would reason from.

**Evidence.** Worktree at `185fb371`, `node_modules` symlinked, full suite via `--reporter=json`; baseline 0 failures; the mutation run twice with identical output. The other two rows of the same table reproduce exactly: `!operation.cancelRequest` reddens the three rows the record names, and the identity conjunct reddens none.

**Required property.** A recorded mutation result re-derives from the tree and commit it names. Where a finding's ground is a coverage gap, the gap is the measurement and not a generalisation about what a class of rows asserts.

**Not decided here.** Whether F-348 is withdrawn, re-worded or re-tiered, and whether the row written at `202581c6` — which is good and which I would keep — needs a different justification, is the architect's call. The row itself is correct and discriminating: at `25be674c` the same mutation reddens six behavioural rows, the five above plus _should discard a preparation whose prepare destroyed the controller_.

### `arc-b-2` — tier C — F-350's degradation is loud, not invisible; the stated reason inverts the direction F-349 established

**Current record.** [`00-index.md`](../../contract/00-index.md) §F-350 and [`plan.md`](../../plan.md): _every transaction the driver opened would revalidate against a stale pin — **invisible to the suite**, because F-349 is exactly the finding that nothing observes that conjunct. …which is exactly why it is recorded rather than absorbed._

**Why it is a problem.** F-349 establishes that the conjunct never fires when it should — a false negative. F-350's degradation is the opposite: a stale pin makes the conjunct fire when it should not, invalidating good transactions. The suite observes that loudly. Replacing `this.#begin()` with `this.#frames.begin()` in `runCore` — exactly the four-argument shape under this arm — reddens **27 behavioural rows** at `25be674c`: 16 in `sortable/keyboard.browser.test.ts`, 6 in `sortable/sortable.browser.test.ts` (the admission-queue-boundary group), 2 in `sortable/input-policy.browser.test.ts`, 2 in `kernel.browser.test.ts` (both pointerless-operation rows) and one in `seams.node.test.ts`. The concentration is itself informative: pointer drags survive because `#handleMove`'s own `#begin()` re-pins before the activation seam, and the discrete and keyboard paths, which have no preceding move, do not.

**Evidence.** Mutation worktree at `25be674c`, full suite, green baseline apart from the six known worktree packaging artefacts.

**Required property.** A finding's stated reason names the direction of the failure it is about. The **decision** F-350 records — that the driver keeps the `begin` collaborator, and that the four-argument shape returns only if the conjunct is deleted — is correct and is untouched by this; what is wrong is the claim that the alternative would have gone unseen.

### `arc-b-3` — tier C — "Brotli falls on thirteen of the fifteen rows" is twelve, contradicted by the table beside it

**Current record.** [`arc-b.md`](../../measurements/arc-b.md), [`00-index.md`](../../contract/00-index.md) §D-181 and [`plan.md`](../../plan.md) all say Brotli falls **on thirteen of the fifteen rows**.

**Why it is a problem.** The pass's own table shows twelve rows falling. `minimal (xy)` rises by 18 B — the record names it as the one row that pays — and `drag.js` and baseline B are both exactly 0. Thirteen is the **module** count (`kernel/transaction.js` enters thirteen of fifteen graphs), and the figure appears to have been carried across. The range, 7 to 49 B, is right.

**Evidence.** `measureAll()` on both freshly built trees: Δ Brotli −25, +18, −32, −11, −19, −49, −7, −34, −45, −31, −16, 0, −8, −27, 0. Twelve negative, one positive, two zero.

**Required property.** A summary generalisation is true of every row it quantifies over. This is the F-307 class the previous arc raised as `arc-5`, in the same document family.

### `arc-b-4` — tier C — three of the fifteen mutation rows understate their red-set, and one of them is bolded as a sole witness

**Current record.** [`COVERAGE.md`](../../../tests/COVERAGE.md): _each has a mutation that reddens it and no other row written for this entity_, with **bold** rows marking the witnesses that give a row its own failure.

**Why it is a problem.** Reproducing each mutation and counting over the thirteen rows the table itself lists:

| Mutation | Recorded | Measured | Extra row |
| --- | --- | --- | --- |
| **the retired frame not handed back as the next draft** | **1** (bold) | **2** | _publish the phase its draft holds when a commit carries none_ |
| the publish dropped, the draft still handed back | 1 (bold) | 2 | _discard a preparation whose prepare destroyed the controller_ |
| the phase ignored | 1 (bold) | 2 | _discard a preparation whose prepare destroyed the controller_ |
| the phase written after the swap | 2 | 3 | _discard a preparation whose prepare destroyed the controller_ |

The first is the one that matters, and it is not a scoping question: both rows it reddens live in `transaction.node.test.ts`, inside the eleven the record calls the instrument. Dropping `this.#draft = previous` leaves `#current` and `#draft` aliased, so a second `commit(null)` republishes the phase the first wrote and the no-phase row fails on `ACTIVE` against `IDLE`. It is bolded as a witness with a failure of its own and it has two. The other three turn on which scope "of this entity's" means; under the reading that makes the `#spec`-ordering entry meaningful — the thirteen rows tabulated above it, two of which live in `kernel.browser.test.ts` — three entries are one row short, and under the narrowest reading that entry names a row outside its own scope.

**Evidence.** Fifteen individual mutation runs at `25be674c`; the other eleven match exactly, including the four type-level ones, which each redden one declaration row and do not touch the whole-graph rows the record's caveat allows for.

**Required property.** Where a table asserts F-346's one-mutation-one-row standard, the counts are the measured ones and the scope they are counted over is stated once and used consistently.

### `arc-b-5` — tier C — the record's account of the commits that carry no phase is wrong in both count and spelling

**Current record.** [`00-index.md`](../../contract/00-index.md) §D-181: _`commit()` survives for the **two** commits that do not change phase, one of which is the sample path_, echoed by [`arc-b-second-pass-claude.md`](arc-b-second-pass-claude.md) §6 naming them as `#handleMove`'s sample commit and the action seam.

**Why it is a problem.** There are **three**. Besides the sample at [`kernel.ts:1841`](../../../src/kernel/kernel.ts#L1841) and the behavior action at [`:2314`](../../../src/kernel/kernel.ts#L2314), `runReleaseSeam` reaches `runCore` at [`:1898`](../../../src/kernel/kernel.ts#L1898) with no phase — release's commit 2, which the contract traces themselves draw as `preparationValid(); commit() ← commit 2` at [`02:1809`](../../contract/02-kernel-behavior-contract.md), [`06:462`](../../contract/06-vertical-sortable-trace.md) and [`challenge-response.md:276`](../../contract/challenge-response.md). And **`commit()` did not survive**: the landed signature is `commit(phase: Phase | null)` with no default, so all three sites spell `commit(null)`. Eight live trace lines across `02`, `06` and `challenge-response.md` still write a bare `commit()` where the code takes an argument — the same present-tense drift the arc's own F-345 sweep exists to close, one call shape over from the one it swept for.

**Evidence.** Enumerated from `src/kernel/`: five direct `#frames.commit` sites and five `runCore` entry points, seven carrying a phase and three not. `grep -n "commit()" .plan/contract/*.md` after excluding `00-index.md` and the four prose uses.

**Required property.** Where the record states a call shape, it is the shape that landed, and the traces spell the call the way the code does.

## Null results

- **No hidden dependency in the entity.** Two type imports, five members, no lifecycle edge. The `retire(reset)` shape is what no read-only reader could serve, as the amendment required, and each reset stays individually `#unwind`-wrapped through `#resetFrame`.
- **The stamp left no residue.** No identifier, no slot, no `finally`, no call-site wrapper. `02` §240's list is three with the sentence the amendment asked for.
- **Terminal-latch coverage is now discriminating** — six behavioural rows at the arc tree — and the identity conjunct still has none, on the tree where the fork was decided. The fork was decided correctly.
- **No SeamDriver route can copy without re-pinning**, and none pins without opening the transaction.
- **`arm()` opens no new window.** `#spec !== null` implies both frames exist; the unwind reads no field the success path has not written; the failed-arm state leaves `#spec` null and every frame-reaching route guarded on it.
- **No budget moved**, the two zero-controls are byte-identical on both figures, and the five re-declared exact controls equal the measured values.
- **F-351 and F-352 are accurate as written**, including F-352's thirteen at the tree it names. F-352's own entry now makes fifteen matching lines in `00-index.md`, which is the ledger quoting itself and not a drift.
- **No contract question needed routing.** Every finding above is a defect in the record of evidence, not a question about the architecture; the consequence of `arc-b-1` for F-348's tier and wording is left to the architect and not decided here.
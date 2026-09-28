# Arc C closure review — D-189's deletion, F-400 and F-401, and the no-re-base reading

**Range** `06ad3ff87..2cc773bd3`, one commit. **Files read at** `2cc773bd3`, tree `dc1c7e1df39b519319c44b73ce86c6fe0ae87a2d`; the baseline is `06ad3ff87`, tree `3fa0978288b8d1a5683077ffa25cef7fdb9ae1db`. Bounded closure pass: is D-189 implemented as settled, are F-400 and F-401 discharged, and does the measurement disposition follow §18 and D-187.

**Result: closure ratified, with one tier-B finding** — a fifth present-tense claim about the deleted settlement identity, in a normative contract document, which F-401's sweep did not reach. It is implementation-local and needs no `D-*`.

## Method

Every count and every figure below was **executed**, never read off the record. Two detached worktrees at `/tmp/…/scratchpad`, `node_modules` symlinked from the repository root, both left byte-clean and removed; the shared checkout was never mutated (`git status --porcelain` clean throughout, `git diff 2cc773bd3 HEAD -- packages/drag2/` empty before the artifact).

- **wt-c** at `2cc773bd3` — F-400's two mutations, the two neighbouring-conjunct mutations, a baseline, the landed measurement, `tsc --noEmit`.
- **wt-cbase** at `06ad3ff87` — the baseline measurement, a clean suite run, and the discrimination probe with its negative control.

Suite figures are over **all 1,366 rows in every project** at `2cc773bd3` and **1,364** at `06ad3ff87`, each mutation applied alone from a pristine copy. The three `consumer.node.test.ts` packed-package rows fail in every run including both baselines and are excluded from every figure.

## The settlement identity deletion is exactly the six deletions, and nothing else

A comment-stripped diff of `src/kernel/kernel.ts` — the only source file in the range — is exactly:

| Site | Change |
| --- | --- |
| `AttemptSlots` | `settlement: SettlementAttempt \| null;` member removed |
| `#attempts` initializer | `settlement: null,` removed |
| `#retireAttempts` | `this.#attempts.settlement = null;` removed |
| `#settlementLive` | signature `(attempt: SettlementAttempt)` → `()`; first conjunct `this.#attempts.settlement === attempt &&` removed |
| `#measureTarget` | sole call site updated to `this.#settlementLive()` |
| `#openSettlement` | `this.#attempts.settlement = attempt;` removed |
| `#handleFailed` | the dead write `this.#attempts.settlement = { targetX: null, targetY: 0 };` removed |

There is **no other code change in the range** — no reordering, no guard weakened, no signature moved. `SettlementAttempt` survives as the type of the local the measurement travels in; `#measureTarget` and `#joinSettlement` keep the parameter they already had. `#settlementLive`'s remaining four conjuncts and `#joinLive`'s three are byte-identical to the base. `tsc -p tsconfig.json --noEmit` exits 0.

## The unreachability argument, re-derived from the source

**Read path.** `#attempts.settlement` is read at one site, `#settlementLive`'s first conjunct (`base :1380`); `#settlementLive` has one caller, `#measureTarget:1439`; `#measureTarget` has one caller, `#openSettlement:1685`. Confirmed by enumeration over the base file: three occurrences of the symbol besides the writes, and one call site each for the two helpers.

**Writers.** `#retireAttempts:495` (reached from `#retireOperation:552`, `#runPhysicalTeardown:646`, `#handleFailed:2121`), `#openSettlement:1670`, `#handleFailed:2148`.

**The span.** `:1670` assigns; `runCore` then runs `settlement.prepare`, the two lifetime disposals and `settlement.effect`; `#measureTarget` then runs `anchorTarget`; `:1380` compares. Every one of those is foreign code, and foreign code re-enters the kernel by exactly three routes. Each is closed:

1. **`dispatch`.** `#openSettlement` is only reached from `#handleResolutionSettled:1976` and, through `#settleCancellation`, `#handleCancel:1948` — both queue handlers, so `#openSettlement` always runs inside `#handle` inside `#drain`, with `#running === true` and `#depth ≥ 1`. On a consumer thenable the dispatch _becomes_ the drain: `#settleResolution` latches and dispatches `RESOLUTION_SETTLED`, and `dispatch` increments `#depth` before draining. `#drain` returns immediately while `#running` (`execution.ts:212`), so a dispatch from behavior or consumer code appends and returns. That blocks `#handleFailed` (its **only** call site is the queue switch at `:2338`), `#handleCancel`, `#handleResolutionSettled`, `#handleUp`, `#handleErrorReported` and the `RETIRE` handler — every queue-reachable `#retireOperation` and every re-entrant `#openSettlement`.
2. **Native ingress.** `runIngress` calls `admit()` **directly**, not through the drain, so the re-entrancy guard does not cover it — this is the route the derivation actually turns on. It is closed one level up: `#openIngress:1077` returns without calling `runIngress` while `this.#frames.current.operation` is truthy, which it is throughout the span (`#openSettlement` is entered only from handlers that have already established a live operation, and only `#retireOperation`/`frames.retire` can null it). That closes the two remaining non-queue `#retireOperation` callers, `#mintOperation:1001` and `#activationPolicy.retire:1188`, both of which sit under `#admitPress`/`#admitCommand`.
3. **`close()` / `destroy()`.** `close()` sets `#closed` on the closing statement and, at `#depth !== 0`, sets `#teardownPending` instead of running `#runTeardown` — so `#runPhysicalTeardown`, the third `#retireAttempts` caller, is deferred to `#leave()` at depth 0, after `#openSettlement` has returned.

**So no legal writer can intervene, and the conjunct is constant-true at its only evaluation point.** This is the unreachability ground, not subsumption: the other four conjuncts are never consulted for it, and D-189's retirement of the subsumption half is not leaned on anywhere above.

**Executed corroboration, with a negative control.** In wt-cbase, `#settlementLive` was instrumented to report through `setTimeout` whenever `this.#attempts.settlement !== attempt` — the discrimination D-188 probed for — with the conjunct otherwise deleted:

| Run | Population | Reports | Unhandled-error section | Failure set |
| --- | --- | --- | --- | --- |
| base, unmutated | 1,364 | — | absent | the three packed-package rows |
| **probe** — report when it _would_ discriminate | 1,364 | **0** | **absent** | identical |
| **negative control** — report when it _does not_ | 1,364 | **1,254** | **present** | identical |

The control is what makes the probe falsifiable: the instrument fires 1,254 times when the condition it watches holds, and zero times for the discrimination. The identity never discriminated in any of the 1,364 rows.

## No collateral weakening

The parameter removal is mechanical — one declaration, one call site — and `#settlementLive` retains `!#bracket.closed`, `!#operation?.cancelRequest`, `current.operation !== null` and `current.phase === SETTLING` unchanged, which are the liveness, cancel-request, operation and phase checks it carried before. `#joinLive` is untouched and, as D-189 states, never carried an identity conjunct, so the attempt was already a measurement carrier at the join. `#handleFailed`'s replaced comment is accurate against the tree: `#retireAttempts()` there now clears `resolution` and `settlementInput`, which is what "a resolution that settles after this validates against an empty slot" says. `#openSettlement` goes on nulling `#attempts.resolution` at its head, so F-400's guards keep their state and their semantics.

## F-400 — both halves reddened independently, executed

Five runs in wt-c, each mutation applied alone from a pristine `kernel.ts`, full suite:

| Run | Rows red beyond baseline | Which row | Register says |
| --- | --: | --- | --: |
| baseline | — | the three packed-package rows only | — |
| `#settleResolution`'s `#attempts.resolution !== attempt` dropped | **1** | _should refuse a completion whose slot turned over before it settled_ | 1 ✓ |
| `#handleResolutionSettled`'s `#attempts.resolution !== attempt` dropped | **1** | _should refuse a completion whose slot turned over before it was applied_ | 1 ✓ |
| `attempt.completed` dropped from `#settleResolution` | **1** | _should keep the first completion when a thenable resolves and then throws_ | 1 ✓ |
| `phase !== RELEASING` dropped from `#handleResolutionSettled` | **0** | — | 0 ✓ |

Each new row reddens on **its own** conjunct and on no other, and neither leans on its sibling — which is F-400's required property, met from the mutation side as well as from the row side. The equivalent-mutant accounting reproduces exactly: `attempt.completed` **1** against `phase !== RELEASING` **0**, which is what §Equivalent mutants' new entry claims. No flake occurred in any of the five runs; the one COVERAGE.md reports under the first mutation did not recur here and is not contradicted by that.

**The scenarios are contract-compliant.** `SettlementTransition<Part>` is `{ prepare(draft, input): PreparedSettlement; effect(current, prepared): void }` with `PreparedSettlement = true` (`src/kernel/spec.ts:348,371`), and both tests supply exactly that shape through `createHarness`, which builds a real `BehaviorSpec` and slots the override in as the genuine seam. **The throwing `prepare` is the documented shape, not an abuse**: `#settlementTransition`'s docblock states that a `prepare` finding no coherent settlement _throws_ and is classified at the seam's own `FAILURE_RESOLUTION`. The window each row needs follows from that: `#openSettlement` clears the resolution slot on its way in, and a failed preparation commits no phase and never reaches the effect that disposes the operation's motion and cancellation lifetimes — which is why the first row's `signal.aborted` is still owed, and why the second row's phase is still `RELEASING`. The second row's asserted order `[SETTLED_CANCELED, SETTLED_FAILED]` is the direct consequence: cancel queued ahead of the completion, its settlement throws, the failure report follows, and a stale completion admitted between them would insert a third input.

## F-401 — the four repaired sites are truthful, and they were not exhaustive

The four D-189 lists are correct against the tree:

- `AttemptSlots`'s docblock and `#attempts`'s field docblock now say **two**, and the record has two members.
- `01-construction-ownership.md` §Teardown across two owners step 3 now says teardown drops the resolution attempt and clears the settlement input, which is what `#retireAttempts` does.
- `COVERAGE.md` §Async attempts' struck row is corrected rather than re-pointed, and its new claim is verifiable: _should replace an open settlement without disturbing a live tail_ (`kernel.browser.test.ts:3043`) contains exactly two assertions — `failures[0].stage === FAILURE_TERMINAL_CALLBACK` and `animation.playState !== 'idle'`. No identity, as stated.

§Probe A's sentence is struck rather than re-pointed and its replacement is true; the test comment at `kernel.browser.test.ts:1690` was updated in step with it and its "two rows below" are the two new rows in the same `describe`. The population sentence at `COVERAGE.md:1129` is now dated to `5a438352c` and reconciles: 1,364 there, 1,366 here, the difference being Arc C's two rows — both figures executed above.

**But the sweep stopped at the register and at `01`.** See `arc-c-1` below.

## The measurement reproduces on every figure

Both worktrees rebuilt (`npx just size`, which runs `build` first) and `measureAll()` dumped directly. **All fifteen rows, both columns, both trees, and the module counts — thirty byte figures and thirty graph sizes — reproduce the table in `arc-c.md` exactly.** Minified: **−136 B** on all thirteen kernel-carrying rows, **0** on `vocabulary root — drag.js` and `baseline B`. Brotli: **−38 B** (`xy + layoutAnimation`) to **+1 B** (`minimal + layoutAnimation`), the sign disagreement the record calls out under §15's second bullet. Graphs 33/32/34/33/35/36, 27/28/29/30/47, 2/16/31/26 on both sides. Both declared controls byte-identical: `vocabulary root` 142 B, `baseline B` 6,889 B — and both are structurally incapable of carrying this change, which is §15's third bullet met rather than a bare 0.

Slack reproduces on both stated populations, and the two are named separately rather than mixed: **63 to 161 B over all fifteen** (`vocabulary root` to `xy + layoutAnimation`) and **123 to 161 B over the thirteen** (`complete` to the same row). §15's other two bullets hold — one joint measurement of what landed, no ablations, and the figures come from a build rather than from source characters.

## The no-re-base decision, derived independently

**It is correct, and the arithmetic is reproducible.** Applying the standing convention — a ceiling is its landed Brotli figure plus the ~150 B headroom, stated at the Phase 17 re-base and restated at Checkpoint D 5, P-06 and D-108 in `budget-rebases.md` — to the thirteen moved rows against their current budgets in `measure.ts` gives:

- **nine raised**, by **1 to 27 B**: `minimal` +5, `minimal + layoutAnimation` +16, `minimal + landing` +23, `complete` +27, `free drag + bounds` +1, `free drag + landing` +1, `both behaviors` +7, `kernel root` +23, `baseline A` +6;
- **two lowered**: `minimal (xy)` −2, `xy + layoutAnimation` −11;
- **two unchanged**: `free drag minimal`, `free drag complete`.

Nine, two and two, in a 1-to-27 B band — exactly what `arc-c.md` and `budget-rebases.md` claim.

**§18's trigger is not "a shrink"; it is _landing well under budget_,** and the record's own operative sentence applies that test rather than the looser one it opens with: the pass lands **at** the standing headroom, not well under it — six of the thirteen rows have _less_ slack than the convention allows and two sit on it exactly. So the third bullet does not fire, and the first bullet ("a deliberately tight row is tight on purpose") points the other way: absorbing the ceilings upward after a shrink is precisely the instrument-loosening move it exists to prevent.

**The one place a different answer is arguable is the two rows that would tighten**, and it does not carry. `xy + layoutAnimation` at 161 B is 11 B above the convention, `minimal (xy)` 2 B above — inside "~150 B" on any reading, and 11 B on a 10.6 kB row. The failure the headroom is sized against is _a module appearing_, and `budget-rebases.md`'s own D-117 correction establishes that the byte half is unreliable for that in principle (154/149/157 B measured for the same module in three trees) and that the claim is carried by the graph declarations instead. Both rows declare topology, so nothing is left unwatched by the 11 B. **Preserving the existing tighter ceilings is the correct consequence.**

**And it is declined on the reading, not on the boundary** — which is D-187's severance, exercised for the first time and exercised correctly. Nothing in `arc-c.md`, `budget-rebases.md` or the amended O-13 makes the Arc D close a re-base trigger; O-13 still says in terms that the close "is **not** a re-base trigger". The two acts stay separate: the five controls remain suspended for Arc D either way, and the four free-drag rows and `kernel root` were read here under their `budget:` alone (slack 150, 149, 149, 150, 127), which is what a suspended `control:` leaves standing.

## O-13's wording

`the next occasion` → `an occasion` is accurate and changes no boundary. **Waiting for** is unchanged (the close of the D-170 arc series, Arc D); the "restores the five controls and authorises nothing else … **not** a re-base trigger" clause is unchanged; the withdrawal paragraph — byte transfer on five rows, stated as the capability rather than the coverage — is unchanged. The correction's premise is verifiable in `measure.ts`: the five rows carry `budget:` and no `control:`, so `budgetViolations` reads their ceilings on every pass, and Arc C's run is such a reading. The amendment **weakens** the boundary's role rather than strengthening it, which is the direction D-187 requires.

## Findings

### `arc-c-1` — tier B — a normative contract term still says staleness is answered by identity, and names the function that no longer checks it

**Finding.** `02-kernel-behavior-contract.md` carries two unstruck present-tense statements about the deleted slot. §The settlement gate, consequence 3 (`:1395`):

> **Staleness is answered by identity.** A settlement replaced between the measurement and the join is a different object, which is the check `settlementLive` performs.

and, ten lines under the `SettlementAttempt` block (`:1255`):

> What the object still earns is staleness by identity: the code between the measurement and the join runs behavior and consumer code, and a settlement that has been replaced in the meantime is a **different object** rather than a different flag.

**Current behavior / contract.** `#settlementLive()` performs no identity check at `2cc773bd3`; the slot it compared against does not exist. The second sentence is the near-verbatim twin of the `SettlementAttempt` docblock paragraph D-189 deleted from `kernel.ts` — the same claim, in the contract document rather than in the source.

**Why it is a problem.** `01`–`07` are revised-in-place normative documents and **the term in force is the unstruck text** (`contract/README.md`). Neither sentence is struck, dated or hedged, so a kernel-tier author reading document 02 is told the settlement seam answers staleness by object identity, and is told which function does it. The first sentence is false twice over: the check is gone, and the scenario it describes — a settlement replaced between the measurement and the join — is the one D-189 established cannot occur. This is F-401's defect class exactly, one document further out: a present-tense claim about a slot, surviving in the instrument a reader consults. D-189's implementation entry states that a fourth such statement was found "beside the three this entry lists" and that "**every one of the four** was a present-tense claim about a slot, which is what makes them one finding's worth of work rather than four" — an enumeration these two falsify. The sweep reached the register, the two source docblocks and `01`; it did not reach `02`.

**Evidence / reproduction.** `grep -rn "answered by identity\|staleness by identity" packages/drag2/.plan/contract packages/drag2/src packages/drag2/tests` at `2cc773bd3` returns seven hits. Five are accounted for: `COVERAGE.md:135` is struck and dated by the F-401 repair, and `00-index.md:2040`, `:2084`, `:4277` and `:4279` are D-188's superseded ledger row, D-189's own deletion list and F-401's heading and body. **The two in `02-kernel-behavior-contract.md` — `:1255` and `:1395` — are the only unstruck, undated, present-tense hits, and the only ones in a document 01–07.** Neither line is inside `~~…~~`; consequences 2, 4 and 6 in the same list _are_ struck, so the convention is being applied around them. `src/kernel/kernel.ts` at the same commit contains no `#attempts.settlement`, and `#settlementLive()` takes no argument.

**Required property.** No unstruck term in `00`–`07` describes state or a check the landed tree does not have. Where a decision deletes a mechanism, every normative document stating that mechanism in the present tense is struck in place with its replacement, and the decision's own enumeration of the statements it repaired is complete or does not claim to be.

**Disposition: implementation-local.** D-189 already supplies the replacement fact — the attempt is a measurement carrier, the join re-validates with `#joinLive()`, which carries no identity conjunct, and the liveness the settlement path relies on is the four remaining conjuncts. Nothing here needs a decision, an amendment or a routing back to architecture; it is the unfinished tail of D-189's own sweep, correctable in place under it. There is **no contradiction between D-189 and D-187**, and none between D-189 and the tree.

## Noted, not raised

- **`.plan/plan.md:2325`** describes `#attempts.settlement` in the present tense and repeats the subsumption argument D-189 retired as false in two clauses of three. It is inside the **dated journal entry for D-188**, which the entry immediately above it in the same file supersedes and explicitly corrects. `plan.md` is chronological and dated entries are not retro-edited here, so this is provenance sitting next to its own correction, not a live claim.
- **`00-index.md:2040`, `:2044`, `:2046`** are D-188's ledger rows and say the same things. A ledger row is a dated act and "a row stands as it stood; a later row supersedes it rather than editing it" (`contract/README.md`). D-189 supersedes them in place. Correct as recorded.
- **`01-construction-ownership.md:14`** — the ASCII sketch lists "resolution + settlement attempts" among kernel-private state. It is loosely still true (the attempt is a kernel local for the settlement's duration) and the same box is already stale for a larger, unrelated reason: it names `createKernel<Part>(root)`, retired by D-170 step 6. Older and wider than this range.
- **`01-construction-ownership.md:352`** — the ownership row "Resolution attempt; settlement attempt … which since D-155 is a measured target and nothing else" remains accurate: the row is about who owns the measurement, not about where it is stored, and the answer is still the kernel.
- **`COVERAGE.md`'s retained "two rows fail" claim** for the rejection-handler mutation was not re-executed. It is pre-existing and outside the repaired text, and re-running it was not part of this pass.

## Scope, and what this pass did not cover

Covered: the whole range diff, source and record; the unreachability derivation over `kernel.ts` and `execution.ts` at `06ad3ff87`; F-400's two mutations and the two neighbouring conjuncts; the discrimination probe with a negative control; both measurement trees rebuilt and re-dumped; the §18 / D-187 / O-13 reading; a package-wide sweep for surviving settlement-identity and three-slot prose.

Not covered: any Arc B or Arc A question already closed; the falsifiers of `#settlementLive`'s four remaining conjuncts, which the range does not touch; the sortable-side rows that pass either way by construction; `COVERAGE.md` claims outside the four repaired sites; Arc D and C4, both deferred by D-189.

## Result

**Arc C closure is ratified.** D-189 is implemented as settled and as nothing more — six deletions and one signature, with no semantic change beyond them, and its unreachability ground holds when re-derived from the source and when probed with a control. F-400 is discharged at the standard it set: two kernel-harness rows, each reddened by its own conjunct alone over a stated population, with the 1/0 neighbouring accounting reproduced. F-401 is discharged at the four sites it names, truthfully. The measurement reproduces on every figure, and the decision not to re-base is the correct consequence of §18 read with D-187.

One tier-B finding stands: `arc-c-1`, two unstruck normative sentences in `02` that the F-401 sweep did not reach. Implementation-local.
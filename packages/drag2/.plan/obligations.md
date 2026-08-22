# The register — live obligations and standing conditions (D-114, D-116)

**What is still owed by this package, what each item is waiting for, and who can discharge it.** One list, because assembling it took a full census: the items below were spread over `plan.md`, contracts 00, 02, 05 and 07, `bundle-structure.md` and four measurement records, and a human owner inheriting this library should not have to repeat that census to find out what is outstanding.

**Standing conditions were added 2026-08-22 by D-116**, which found that a live clause stated inside a decision-ledger row is unreachable by every instrument this package has: the row is a dated act, the resolver skips it by shape, and the clause inside it is neither. A condition is not an obligation — nobody owes work for one — so it gets its own table and its own id space rather than joining the list below.

**Opened 2026-08-22** by the maintainability entry ([`maintainability.md`](maintainability.md) §3), which found five obligations live, unwithdrawn and tracked by nothing.

## The rule this register exists to enforce

**An obligation names a destination that can receive it, and a condition is not an obligation.** Four parts, and only the last has any instrument behind it.

**(a) An _Overturned by_ clause states a standing condition, never owed work.** A standing condition is one an observer recognises without anyone doing anything — _evidence of a bundle-constrained supported deployment appears_. Owed work is an obligation and belongs here. The two read identically in prose, and API-03 is the proof that a careful reader cannot tell them apart: D-108's clause named _a measurement showing one of the four is not cold_, which nobody had booked and which the decision's own structural argument had already answered.

**(b) A destination must be a thing that can close, and closing it discharges or re-books every obligation booked to it.** This is a rule rather than an instrument because **no instrument can observe a destination closing**. `tests/decisions.node.test.ts` cannot spell `Phase R`, `Checkpoint E`, _a measurement_ or _the owner_ — its destination vocabulary is `Phase <n>`, `Before Phase <n>` and `Remediation` — and its witnesses are source-level facts, which cannot see a phase end. What _can_ observe a close is the pass that performs it. Phase R, Checkpoint E and the API deliverable each closed correctly on their own terms and each left something behind, because nothing asked them at the moment of closing. **Asking is now part of closing.**

**(c) The live set is carried here**, not distributed. A row leaves this file by being discharged, withdrawn, or re-booked to a destination that is currently open — never by being forgotten.

**(d) A standing condition is registered, not embedded** (D-116). A ledger row states a condition as it was decided and cites its `SC-n`; the register states it in the present tense, with citations re-derived at the moment of lifting. That is what keeps the whole ledger past tense — the row-shape skip in `tests/references.node.test.ts` is sound because nothing live is inside a row, not merely because rows are old.

## Live

Nothing below is decided by this register. Each row states what is owed and what it is waiting for.

| # | Obligation | Owed by | Waiting for |
| --- | --- | --- | --- |
| O-1 | **A machine-readable reason replacing the prose** for D-107's Class B — the classification a consumer receives when a decision is declined | D-107 | **A destination.** It routed itself to _the API deliverable_ in as many words; that deliverable ran and closed the door on the other side — _anything in the bundle entry stays closed at `d949cfeb`_. Both passes were correct and the obligation fell between them. It is an API change, so it needs an owner's call on whether the surface reopens at all |
| O-2 | **Whether a stage is a promise or a description** — the general question, of which D-81's `action.prepare` correction was one instance | D-81 | **A destination.** Routed to Checkpoint E, which ran eight passes and closed on a different seam. The phrase occurs once in the whole record, in D-81's own row |
| O-3 | **The touch measurement**: long-press context menus and tap highlighting, whose suppression cost was recorded as owed rather than assumed away | D-46 / D-54 | **A destination that can hold a measurement.** The deferred-decision vocabulary has no form for one, which is why nothing tracked it; D-95's Phase 21 obligation sweep scoped itself to 05's M-1…M-4 and did not reach it |
| O-4 | **A second engine.** Probe A's cases are Chromium only, and so is every browser suite that inherited them — `.scripts/vitest-config.ts` configures one browser | 05 §Test matrix | **A decision to pay for it.** Unchanged since it was written; stated here so it is visible rather than buried in a paragraph about probe carry-over |
| O-5 | **Is `RECOVERY_HOME` right for a rejected reorder?** With a placeholder-based sortable the home slot may have moved under an accepted concurrent update, and _the test matrix should include a rejection after a collection change_ — no such row exists | 05 §Q-6 | **An owner's answer, not a repair.** Re-read here rather than closed: the missing matrix row is bookkeeping, but what the row would assert is not settled, and choosing a recovery for a reorder rejected against a moved home is a semantic decision this pass declines to make locally |
| O-6 | **Whether `kernel/kernel.ts` should be split.** 2 468 lines against the 1 971 that prompted M-02; its duplicated-SPI half is closed | M-02 | **A judgment, and the human owner's.** M-02's own disposition was that _mechanical splitting before those decisions is not warranted_, and the decisions it named have all since been taken — so splitting is now live, buys navigation and risks nothing else. Not made on the last day of agent ownership |
| O-7 | **F-80's four API divergences** between the contract and the shipped surface | F-80 | **An owner's call on each.** Unchanged since the API entry; kept as one row here so the register is the whole list rather than most of it |

## Standing conditions

**A standing condition is recognised, not discharged.** Nobody is assigned one; an observer meets the stated circumstance and the named decision reopens. Each row is present tense and its citations resolve today (D-116 (c)) — **and they are checked**: a citation here is written as a citation rather than quoted inside a code span, so `tests/references.node.test.ts` resolves it instead of reading it as a specimen (C-01); the deciding row in [`00-index.md`](contract/00-index.md) keeps its own wording as it stood and cites the id here.

| # | Condition | Reopens | Where it was decided | Today |
| --- | --- | --- | --- | --- |
| SC-1 | **A bundle-budget row goes negative**, or **erosion stops being attributable to a named landed change**, or **L-11 lands** — `plan.md` §Phase 23's five runtime cells onto two frozen entrypoints. The third is not a size trigger: the frozen export map is one of the six reproducibility preconditions stated at [05 §Measurements — landed 2026-08-02](contract/05-lifecycle-invariants.md), so changing it re-measures M-3 whether or not it moves a byte | D-106 — the twelve declared rows re-base | D-106, and [`bundle-structure.md`](bundle-structure.md) §Headroom | **Not met.** Slack is 114–154 B against the ~150 B convention and the one drift, P-02's +34 B, added no module and was absorbed under M-3′'s own rule. L-11 has not landed, and it is the next scheduled re-base event |
| SC-2 | **Evidence of a bundle-constrained supported deployment**, or **a machine-readable reason replacing the prose** | D-107's Class B — the 424 B of runtime and consumer-callback diagnostic text stays unconditional | D-107 | **Not met**, and the second half is not free-standing: replacing the prose is an API change and is owed as **O-1**, so this condition is met by that obligation being discharged, never by anyone waiting for it here |
| SC-3 | **A call graph that makes one of the four un-gated assertions hot** — a `scrub()` or a frame-shape assertion reachable per frame rather than once per operation, most plausibly `assertFrameScrubbed`. Per-site: it does not require all four to be alike | D-108 — the author-facing assertions stay unconditional in every build | D-108, as rewritten by D-114 (a) | **Not met, and settled structurally rather than by a run**: `arm()` runs once per controller and all three `scrub()` sites are terminal. That is the whole of what API-03 asked for; **no measurement is owed** |
| SC-4 | **A behavior writes more than once per sample**, or **a device is materially above M-6's ~129 /s primary pace**. Both are measured quantities, which is what makes them recognisable rather than owed: an observer meets the number, nobody is assigned it | D-105 — the P-01 write-gate decline stands, and `moveTo()` traffic stays classified rather than gated | D-105 | **Not met on the evidence D-105 records**, and the decision is not re-opened or re-decided here. **Registered 2026-08-22 (C-02)**: D-116's census found three live clauses because it looked for the three lead-ins that _name_ a clause, and this one is a sentence about what would reopen a decision — the open premise D-116 (d) stated prospectively, with an instance already in the row above D-106's. The backstop's vocabulary now carries this fourth form |

## Withdrawn

| # | Obligation | Disposition |
| --- | --- | --- |
| O-8 | **Check D-56** — _run `bench/size` immediately before and after the three subpath deletions land_, predicting zero byte movement, with the check's own wording forbidding a later phase from recording it satisfied without the two numbers | **Withdrawn unsatisfied, 2026-08-22, by the owner.** The required before/after measurement belonged to the deletion's landing window, and that window was missed: Phase R landed the deletion and nobody took the numbers. **The check is not satisfied and must not be described as satisfied**, and no later measurement substitutes for it — a figure taken against any subsequent tree answers a different question, which is precisely what the check's own wording forbids. What is withdrawn is the **lost historical falsifier**; **D-56 itself remains accepted**, on its argument. Four records — `phase-21.md`, `m3-prime.md`, `m2-prime.md`, `m5.md` — each handed this back rather than take it, and this row is where it stops being handed on |

## Discharged here

| # | Obligation | Disposition |
| --- | --- | --- |
| O-9 | `bundle-structure.md` §Corrections to the record, item 3 — _recorded so the next pass over 05 either writes the section or re-points both_ | **Closed by D-112.** _The next pass over 05_ was never a destination, which is the (b) failure in its purest form. Both citations are re-pointed at `05 §Measurements — landed 2026-08-02`, and `tests/references.node.test.ts` now fails on the next one |
| O-10 | **API-03** — D-108's _Overturned by_ clause naming a runtime measurement nobody took | **Closed by D-114 (a).** The clause is rewritten as the standing condition it always was, and now says what already discharges it: the coldness of all four sites is settled by the call graph — `arm()` runs once per controller, all three `scrub()` sites are terminal — rather than by a run |
| O-11 | **Q-4's narrow half** — _whether a fourth action tag on one behavior indicates something is a question a second implemented behavior answers, not this one_ | **Closed as bookkeeping.** The answering event occurred: free drag landed at Phase 19 declaring **two** action tags against the sortable's three. The fourth tag never arrived, the count did not accumulate across behaviors, and the boundary Q-4 watches held. Nothing was decided here that the event had not already decided |

## What a pass that closes a destination must do

Before a phase, checkpoint or deliverable is recorded as closed, every obligation booked to it is **discharged, withdrawn with a reason, or re-booked here**. That is the whole of rule (b), and it is the only thing that would have prevented O-1, O-2 and O-8.
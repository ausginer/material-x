# Live obligations — the register (D-114)

**What is still owed by this package, what each item is waiting for, and who can discharge it.** One list, because assembling it took a full census: the items below were spread over `plan.md`, contracts 00, 02, 05 and 07, `bundle-structure.md` and four measurement records, and a human owner inheriting this library should not have to repeat that census to find out what is outstanding.

**Opened 2026-08-22** by the maintainability entry ([`maintainability.md`](maintainability.md) §3), which found five obligations live, unwithdrawn and tracked by nothing.

## The rule this register exists to enforce

**An obligation names a destination that can receive it.** Three parts, and none of them is a test.

**(a) An _Overturned by_ clause states a standing condition, never owed work.** A standing condition is one an observer recognises without anyone doing anything — _evidence of a bundle-constrained supported deployment appears_. Owed work is an obligation and belongs here. The two read identically in prose, and API-03 is the proof that a careful reader cannot tell them apart: D-108's clause named _a measurement showing one of the four is not cold_, which nobody had booked and which the decision's own structural argument had already answered.

**(b) A destination must be a thing that can close, and closing it discharges or re-books every obligation booked to it.** This is a rule rather than an instrument because **no instrument can observe a destination closing**. `tests/decisions.node.test.ts` cannot spell `Phase R`, `Checkpoint E`, _a measurement_ or _the owner_ — its destination vocabulary is `Phase <n>`, `Before Phase <n>` and `Remediation` — and its witnesses are source-level facts, which cannot see a phase end. What _can_ observe a close is the pass that performs it. Phase R, Checkpoint E and the API deliverable each closed correctly on their own terms and each left something behind, because nothing asked them at the moment of closing. **Asking is now part of closing.**

**(c) The live set is carried here**, not distributed. A row leaves this file by being discharged, withdrawn, or re-booked to a destination that is currently open — never by being forgotten.

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

## Withdrawn

| # | Obligation | Disposition |
| --- | --- | --- |
| O-8 | **Check D-56** — _run `bench/size` immediately before and after the three subpath deletions land_, predicting zero byte movement, with the check's own wording forbidding a later phase from recording it satisfied without the two numbers | **Withdrawn unsatisfied, 2026-08-22, by the owner.** The required before/after measurement belonged to the deletion's landing window, and that window was missed: Phase R landed the deletion and nobody took the numbers. **The check is not satisfied and must not be described as satisfied**, and no later measurement substitutes for it — a figure taken against any subsequent tree answers a different question, which is precisely what the check's own wording forbids. What is withdrawn is the **lost historical falsifier**; **D-56 itself remains accepted**, on its argument. Four records — `phase-21.md`, `m3-prime.md`, `m2-prime.md`, `m5.md` — each handed this back rather than take it, and this row is where it stops being handed on |

## Discharged here

| # | Obligation | Disposition |
| --- | --- | --- |
| O-9 | `bundle-structure.md` §Corrections item 3 — _recorded so the next pass over 05 either writes the section or re-points both_ | **Closed by D-112.** _The next pass over 05_ was never a destination, which is the (b) failure in its purest form. Both citations are re-pointed at `05 §Measurements — landed 2026-08-02`, and `tests/references.node.test.ts` now fails on the next one |
| O-10 | **API-03** — D-108's _Overturned by_ clause naming a runtime measurement nobody took | **Closed by D-114 (a).** The clause is rewritten as the standing condition it always was, and now says what already discharges it: the coldness of all four sites is settled by the call graph — `arm()` runs once per controller, all three `scrub()` sites are terminal — rather than by a run |
| O-11 | **Q-4's narrow half** — _whether a fourth action tag on one behavior indicates something is a question a second implemented behavior answers, not this one_ | **Closed as bookkeeping.** The answering event occurred: free drag landed at Phase 19 declaring **two** action tags against the sortable's three. The fourth tag never arrived, the count did not accumulate across behaviors, and the boundary Q-4 watches held. Nothing was decided here that the event had not already decided |

## What a pass that closes a destination must do

Before a phase, checkpoint or deliverable is recorded as closed, every obligation booked to it is **discharged, withdrawn with a reason, or re-booked here**. That is the whole of rule (b), and it is the only thing that would have prevented O-1, O-2 and O-8.
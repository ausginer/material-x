# F-275 adjudicated: the retirement ordering is a proof invariant, not a runtime boundary

**Read at `15b11845`**, branch `drag2/fin-review`. Evidence taken from [`d168-operation-record-feature-proof-claude.md`](d168-operation-record-feature-proof-claude.md)'s mutation table and re-derived from source; no production code or test was changed in this pass.

**The finding is upheld on its facts and neither of the consolidation's two alternatives is adopted.** The reviewer is right that D-168 attributes runtime necessity to a placement the runtime does not require. The consolidation's (a) and (b) are not equivalent and neither is correct: (a) is unbuildable and (b) under-specifies. The property splits in two.

---

## 1. What the evidence establishes

**The observable boundary is steps 4 and 5.** Behavior and consumer code runs inside `unwind(spec.retire)` and inside `unwind(operation.lifetimes.dispose)`, and `current.operation` still names the operation while it does, so every guard those callbacks can reach still authorises work.

**Between step 5 returning and the frame identity being nulled there is no reentrancy point, and this is now established rather than assumed.** The gap contains exactly two calls, and both are kernel-internal and structurally incapable of reentering:

- `unwind` is `try { return step(); } catch { notify(…) }` — it calls nothing before the callback (`src/kernel/unwind.ts`);
- `frame(target)` is `Object.assign(existing ?? {}, DEFAULT_FRAME)` over a plain literal — no accessors, no proxies (`src/kernel/frames.ts`).

**And `scrub` nulls the identity before it runs behavior code**: `frame(target)` precedes `active.resetFramePart(target)` inside the same `unwind`. So the reviewer's probe P4 — a `host.cancel()` raised from `resetFramePart`, returning on the `!current.operation` guard with zero reports — is not a lucky outcome but the only available one.

**Therefore mutations A2 and C are green for a correct reason.** Moving the drop into the gap is unobservable because the gap is empty, not because an instrument is missing. D-168's sentence — _"the one window in which a guard passes and the state it authorises is gone"_ — is true of every position **before step 6** and false of the position **immediately before `scrub(current)`**. That is the overstatement, and it is exactly as wide as the reviewer says.

---

## 2. Why neither proposed alternative is taken

**(a) Strengthen the test to reenter after step 5 is unbuildable.** I was asked to identify a real supported reentrancy point there before proposing a witness for it. There is none — §1 is that search, and it terminates. A test could only reach the gap if production code were given a call it does not need, so that an instrument could observe it. That inverts the relationship between the two: the code would carry a seam whose only purpose is to be watched.

**(b) Restating the property at the observable boundary alone is under-specified.** It would license moving the drop into the gap, and that changes not the behavior but the _kind of argument_ that keeps eleven unchecked non-null assertions sound. `operation!` appears at `src/kernel/kernel.ts` lines 769, 773, 821, 1245, 1397, 1586, 1632, 1778, 1912, 2004 and 2070. Every one of them rests on

> `current.operation !== null` ⟹ `operation !== null`

and the compiler checks none of them.

**With the drop last, that implication is a fact about statement order**, and the census is exhaustive: `operation` has **four** references that write it — its declaration at line 281, its construction at 1011, and the two nulls at 566 and 642 — and both nulls are the last statement of their sequence, after `scrub(current)` and `scrub(draft)`. Every write that nulls a record is textually after the write that nulls the frame identity. A reviewer discharges the implication by reading two adjacent statements.

**With the drop in the gap, it becomes a fact about the absence of calls in a window** — re-derived on every edit, by proving a negative about what is not there. §1 shows that proof is currently available; it is also currently three inlined bodies deep, and nothing marks the gap as a place where adding a call would silently unsound eleven assertions.

**That difference, and only that difference, is what the placement is worth.**

---

## 3. The decision

**D-168's required property 1 splits into two, and only one of them is a runtime property.**

**1a — the observable requirement, and it is witnessed.** Both records must survive `unwind(spec.retire)` and `unwind(operation.lifetimes.dispose)` at both retirement sites. This is consumer-observable in both directions: a drop above step 4 throws inside a reentrant guard (the reviewer's mutation B, red, with `TypeError: Cannot read properties of null (reading 'cancelRequest')`), and a drop between steps 4 and 5 silently **skips disposal entirely**, because the record docblock's own design makes `if (operation)` _"the whole test for whether there is anything to dispose"_ — pointer capture unreleased, placeholder left in the tree, inline styles unrestored, motion signals never aborted.

**1b — the structural requirement, and it is not a runtime property.** The drop is the last statement of retirement, after both scrubs, so that `current.operation !== null ⟹ operation !== null` holds by statement order rather than by the emptiness of a window. It is a proof obligation over the eleven assertions in §2, discharged by reading, and **D-168 must state it as that and stop claiming a window that is zero-width.**

**The placement itself does not change.** What changes is the register in which it is justified — and the difference is not cosmetic: a claim stated as a runtime necessity invites the next pass to test it, fail to, and conclude the placement is arbitrary. That is the failure mode this finding caught in progress.

---

## 4. What is corrected, and where

| Where | The overstatement | Correction |
| --- | --- | --- |
| [`f273-operation-record-claude.md`](f273-operation-record-claude.md) §3 | _"Moving the transition earlier would create the one window in which a guard passes and the state it authorises is gone"_ | True before step 6, false immediately before `scrub(current)`. **Not edited** — a review record is dated provenance and stands as written. The correction is carried by D-168's ledger row and by §3 above, which supersede it |
| `.plan/contract/00-index.md`, D-168's row | _"a `spec.retire` that re-enters through `host.cancel()` and fails if the records are dropped ahead of the scrubs"_ | The test does not fail then. It witnesses 1a's step-4 half |
| `src/kernel/kernel.ts` line 561, and line 641 which defers to it | The comment attributes the window to the scrubs | Remediation: state 1b — the drop is last so the implication holds by order, not because a guard could observe the gap |
| `tests/kernel/kernel.browser.test.ts` line 3681 | _"A record dropped before the scrubs would fail this re-entry outright"_ | Remediation: it pins step 4. Say so |

**The test is kept as it is, and is a sound witness for what 1a's step-4 half claims.** Only its comment is wrong. No witness is added for 1b, deliberately — per §2(a), one cannot be built without adding a seam to production code for an instrument to watch, and 1b is a reading obligation by construction.

---

## 5. One real gap, and it is not F-275's

**1a's step-5 half has no isolating witness.** Mutation B went red for a _step-4_ reason — the reentrant cancel inside `spec.retire` — and no mutation in the pass isolated a drop between step 4 and step 5. The mechanism in §3 says such a drop disables disposal outright, and the sortable suite's placeholder, capture and style-restoration assertions should catch that broadly; that is inference from the `if (operation)` guard, **not a run**, and it is stated as inference.

**One mutation settles it**: drop the three records immediately after `unwind(spec.retire)` and confirm the suite goes red for a disposal reason. Named for the bounded delta review. Not a blocker: the shipped ordering is correct, and a missing mutation over a boundary the code already satisfies is a coverage question, not a defect.

---

## 6. F-276 — the minimal fix, and the relocation declined

**Docblock remediation only.** Moving the `activation` assignment past `acquirePointerCapture` **would not make record presence a lifecycle discriminant**, which is the only thing that would justify paying for it: `activation.effect` runs later and may itself fail, so the operation would remain live with `activation !== null` and no effect run. The relocation buys a weaker version of the same imprecision and costs the ownership of the lift session between `presentation.use` and the throw.

**The docblock states the invariant that holds.** The record is **complete-or-absent**, never partial; a failed activation retains it, and that retention is load-bearing rather than incidental — the lift session it holds stays reachable for the disposal already registered against `presentation.use`. `activation === null` names _before the activation transaction succeeded_, not _before the behavior knows_.

**F-277 is outside this adjudication** and stands as recorded.

---

## 7. Status of D-168

**Amended in its rationale, not superseded and not reopened.** The two-record shape, the eight-field membership, the four exclusions, the tier ownership, the allocation figures and the size gate are all untouched — none of them was in question, and F-275 reaches only the justification of one ordering.

---

## 8. Method

The mutation results are the reviewer's, taken as reported. Everything used to adjudicate them was re-derived here: `unwind`, `frame`, `scrub`, `retireOperation`, `runPhysicalTeardown`, the `OperationRecord` and `ActivationRecord` docblocks, the witness test, and the eleven `operation!` sites, each read at `15b11845`. The step-5 mutation in §5 was **not** run — production source is out of bounds for this pass — and its absence is reported rather than papered over.

**LSP plugin — available; used.** `findReferences` on the `operation` declaration returned all 26 references in one file, which is what makes the four-write census in §2 exhaustive rather than a grep's best effort — and the census is the whole of 1b's argument. `grep` carried the plain-text reads.
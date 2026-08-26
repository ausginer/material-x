# Revision 2 — implementation handoff

> **Updated for Revision 2.2 — the kernel vocabulary pass, 2026-08-14.** One decision, **D-68**: the kernel tier publishes the structural closure of `BehaviorFactory` plus the values the SPI hands a behavior, because it published no value at all and was therefore **not authorable from its own entry** (F-59). No seam, no signature and no entry count changes. Three findings — F-59, F-60, F-61 — and F-60 is the one to read: the package's closure check cannot see this class of hole, in two independent ways.
>
> **Updated for Revision 2.1 and the owner's closing pass, 2026-08-13.** Q-14 is **resolved** (D-66), the landing thunk is **replaced** (D-67), the compiled fixture **exists**, and `drag.js`'s identity warrant is **disproved by measurement**. Four findings came out of the last two — F-51…F-54 — and three of them were found by the compiler rather than by a reader.
>
> **Original Revision 2.1 note.** The owner found **five owner-decision drifts** in the reconciled contracts — decisions already made in the earlier review rounds that Revision 2 recorded wrongly or dropped. They are **D-61…D-65** and they are folded into every section below. One of them opened a **genuine contradiction that is not resolved**: see §6, Q-14.

Deliverable of [`reviews/api-reviews/api-review-final-summary.md`](reviews/api-reviews/api-review-final-summary.md) §12. Written after documents 00–06, the README and this directory were reconciled against the owner decisions.

**The contract is the source of truth. This document is an index and a risk register, not a second contract.** Where it disagrees with `contract/`, the contract wins.

---

## 1. Status

**Thirty decisions, D-36…D-67.** Twelve are the owner's final-summary sections, **five more restore owner decisions from the earlier review rounds** (D-61…D-65, Revision 2.1), and **eleven were forced by reconciliation** — places where two decisions were individually sound and jointly unimplementable, each found by a reviewer refusing to paper over a conflict rather than anticipated in advance. That ratio is the main finding of the exercise, and it is the argument for reconciling a contract before implementing against it rather than after.

The freeze rule ([`contract/00-index.md`](contract/00-index.md) §Normative precedence and freeze) is discharged **per decision**, in writing:

|  | Decisions |
| --- | --- |
| Carried by a failing executable case | D-36…D-39, D-42, D-43, D-46 (probes A, C1, E, api-1) |
| Owner decisions about a public API, which the rule does not govern | D-40, D-41, D-44, D-45, D-47, D-48, D-50, D-54…D-58 |
| Repairs to holes the above opened | D-49, D-51, D-52, D-60 |
| **SPI changes — the rule governs them in full, and both are discharged** | **D-53** (added member, probe A) · **D-59** (seam signature, api-1) |
| Owner decisions the earlier rounds had already made, restored at Revision 2.1 | D-61…D-65 — **none crosses the SPI**, and D-63 is a tier move that leaves every seam unchanged |
| The kernel vocabulary pass | **D-68** — the rule the freeze governs is about the SPI, and D-68 **adds no member and changes no signature**; it publishes names that already exist. It is an addition to a frozen _surface_, which D-47 §11 queued explicitly |
| Owner decisions closing what the reconciliation surfaced | **D-66** (Q-14 — `onEnd` as exactly-once domain disposition) · **D-67** (contextual landing duration). **Neither crosses the SPI**: D-66 needs no new member because `reportFailure(stage, error)` already hands the behavior the error |

**Two decisions cross the frozen SPI, and the count matters more than either one.** Three separate draft claims that Revision 2 "asks the SPI to express nothing new" had to be corrected — all three caught by reviewers rather than by me, and the last one caught _after_ this handoff first asserted D-53 was the only crossing.

- **D-53** adds a `KernelHost` member. Probe A discharges it: the three `presentation.signal.aborted` sites exist _because_ the SPI could not express the reading D-38 requires.
- **D-59** widens `admit`'s return, which is a seam signature. Discharged by api-1 through a chain rather than a single probe, and the chain has to be written out because _"it repairs another decision"_ is not sufficient on its own: no single-window rule reproduces the removed footprint in both nested cases → D-43 needs two windows → the second needs the box element before `acquireLift` → the only carriers are the behavior's draft or admission's return → the draft form contradicts H-2 and D-15. The failing case is api-1's; D-59 is where it lands.

---

## 2. Changed contracts

| Document | What changed |
| --- | --- |
| [`00-index.md`](contract/00-index.md) | Revision 2 status and freeze discharge; D-36…D-60; F-47 back-filled, F-48…F-50 added; ten earlier rows retracted or narrowed (D-7, D-11, D-12, D-16, D-29, D-30, D-33, F-6, F-42, F-46); four new falsifiers |
| [`01-construction-ownership.md`](contract/01-construction-ownership.md) | Teardown split into logical close and deferrable physical teardown; `destroy(): Promise<void>`; panic reordered to _close → report → teardown_; `pendingRequest` deleted (eight fields → seven); `sortable(root, …fragments)` returning a controller; `draggable()` at the kernel tier; C4-03 relocated rather than overruled |
| [`02-kernel-behavior-contract.md`](contract/02-kernel-behavior-contract.md) | The entire readiness protocol deleted and replaced by the serial commit; one settlement gate; input policy (D-46, D-50, D-54); `canceled` given its post-release meaning; two measurement windows; D-49's skipped landing; D-60's orthogonal `onError` |
| [`03-feature-composition.md`](contract/03-feature-composition.md) | Fragments as plain partial config; feature brand withdrawn; four installer-less factories deleted; `items()` + `invalidate()`; two-window footprint; `box` candidates; ceilings withdrawn; three entry roots over two tiers (**eight entries over three tiers after D-61**) |
| [`04-frame-slicing.md`](contract/04-frame-slicing.md) | **Frame model unchanged.** Nothing in Revision 2 reaches it |
| [`05-lifecycle-invariants.md`](contract/05-lifecycle-invariants.md) | I-36 rewritten to the finite domain; **the 62-row stretch table deleted**; I-37 added; I-35 retracted; I-6, I-8, I-9, I-17, I-29, I-31 amended; F-15, F-16, F-17, F-46, F-47 amended; eight new test-matrix groups |
| [`06-vertical-sortable-trace.md`](contract/06-vertical-sortable-trace.md) | Readiness leg re-traced as the serial commit; `activation.rollback` reversed; two measurement windows; `preventDefault()` relocated; construction rewritten for D-45/D-48/D-56 |
| [`README.md`](../README.md) | Published ceiling withdrawn; export table rebuilt over three entries; migration table gains the parity gain; accessibility obligation stated |
| [`ledger.md`](ledger.md), [`plan.md`](plan.md) | Parity reclassified (83 rows); L-1 reversed, L-12 noted, L-13 added; §Revision 2 and §Phase R added |

**Revision 2.1 changes, by document:**

| Document | What changed |
| --- | --- |
| [`00-index.md`](contract/00-index.md) | Revision 2.1 status and drift table; **D-61…D-67**; §The unresolved arm, now marked resolved by D-66; findings **F-51…F-54**; D-40, D-45, D-47, D-48, D-51, D-56, D-60 amended in place; the probe-1 landing-runner row re-scoped to the kernel tier; four new falsifiers |
| [`01-construction-ownership.md`](contract/01-construction-ownership.md) | Landing-runner ownership row; `FailureStage` marked kernel-tier |
| [`02-kernel-behavior-contract.md`](contract/02-kernel-behavior-contract.md) | Terminal callback table and the five-row settlement mapping collapsed to `onEnd`; **§The join's terminal-skip rule retracted by D-66**, with the `SETTLED_FAILED` carrier, the `CancelStage` derivation and the `onError`-before-terminal ordering written out; §Landing's types re-scoped to the middle and kernel tiers; new §The stage is internal; the consumer gets a code |
| [`03-feature-composition.md`](contract/03-feature-composition.md) | `SortableConfig` schema (`onEnd`, `placeholder`, coarse `onError`); contribution published at the middle tier; export table rebuilt over **eight** entries and three tiers; identity clause 3 retracted; `landing({ run })` removed; the thunk/L-6 conflict surfaced |
| [`04-frame-slicing.md`](contract/04-frame-slicing.md) | **Frame model still unchanged — the only edit is a header saying so, and why.** D-66 came closest: storing the classifying error for the terminal would have added a part field, an initialiser and a reset obligation. Constructing the result at the failure site avoids all three, and the progress marker it needs is behavior-private runtime rather than frame state |
| [`05-lifecycle-invariants.md`](contract/05-lifecycle-invariants.md) | I-31 restored to a single exception; F-37 marked as dissolved rather than fixed; **Q-14 opened and then closed into the resolved table**; seven new test-matrix groups |
| [`06-vertical-sortable-trace.md`](contract/06-vertical-sortable-trace.md) | Trace and edge tables re-spelled for `onEnd` and `placeholder` |
| [`README.md`](../README.md) | Migration and export tables rebuilt; `drag.js`'s rationale replaced; middle tier documented |

**Revision 2.2 changes, by document:**

| Document | What changed |
| --- | --- |
| [`00-index.md`](contract/00-index.md) | Revision 2.2 status; **D-68** and its two subsections (§Published is not must-name, §What self-contained means); findings **F-59…F-61**; **the D-66/D-67 table break repaired** — D-67's row had been swallowed into D-66's tail again at the `\| \| D-67 \|` junction, and the pair had been split from the D-61…D-65 table by a blank line |
| [`02-kernel-behavior-contract.md`](contract/02-kernel-behavior-contract.md) | New normative **§The kernel tier's public vocabulary (D-68)** — the rule, the three justification classes, the 66-name surface, what stays internal and its substitute, the phase narrowing, the stage → code mapping, and the definition of _self-contained_ |
| [`03-feature-composition.md`](contract/03-feature-composition.md) | `kernel.js`'s export-table row rebuilt (and its stale **14** `FAILURE_*` corrected to **13**); `sortable/feature.js`'s landing types marked as re-exports; §Internal and unstable loses the phase and lift constants; §Internal to the ordinary tier enumerated, with `SeamOutcome`/`ArmOutcome` **struck**; `CancelStage`'s declaration site moved with its publication kept |
| [`05-lifecycle-invariants.md`](contract/05-lifecycle-invariants.md) | New test-matrix group **Kernel vocabulary** |
| [`ledger.md`](ledger.md) | L-14 answered and its claim corrected; §Open questions 5 resolved |
| **Not changed** | **01, 04 and 06.** No construction, frame or trace consequence — D-68 publishes names, it does not move one |

**Provenance marked, not deleted:** [`api-review-3-probe-plan.md`](reviews/api-reviews/api-review-3-probe-plan.md) and [`api-review-3-resolution-c5.md`](reviews/api-reviews/api-review-3-resolution-c5.md) carry supersession headers naming what in them is now wrong.

---

## 3. Acceptance tests that must survive

The owner's instruction is that remaining probe scenarios may become implementation acceptance tests. These are the ones that must:

**From probe E ([`probes/api-3-input-policy.md`](probes/api-3-input-policy.md)) — 22 tests, all release-blocking behavior.** A press on a nested control that never crosses the threshold consumes nothing: caret, selection, focus and form-control operation all survive. `ArrowRight` in a nested text input moves the caret and reorders nothing. `event.isComposing` never admits. Click, `href` and ctrl-click survive an admitted press.

> **The observable changed.** Probe E reads `pointerdown.defaultPrevented` as its primary signal. Under D-54 `admitted ⇒ defaultPrevented` is **false** between admission and threshold, so every promoted case needs a different observable — the crossing `pointermove`, or the suppressed `click`.

**From probe C1 ([`probes/api-2-commit-window.md`](probes/api-2-commit-window.md)).** The append loop and morphdom-style commit both land correctly. A destructive commit reports `onError` **and** `onEnd` (D-62), starts **no** animation, and arrives within one frame — the positive jump-cut assertion, which is probe C1's twelve-frame flight to `(0,0)` as a regression test. A drag with `box ≠ visual` does not run the list tall.

**From probe A ([`probes/api-4-transaction-bracket.md`](probes/api-4-transaction-bracket.md)).** Teardown order under a reentrant destroy is _close → report → teardown_. A liveness reading disagreeing with `signal.aborted` resolves by the latch — and the fixture must be one where the two **actually disagree**, or it proves nothing. An abandoned resolver's late rejection is consumed with a real `unhandledrejection` listener attached, settled once a **newer** operation owns the controller.

**New at the owner's closing pass.** **Three terminal-boundary rows that must be written as a set** (Q-15), because any one of them passes under a wrong marker placement: a throw in `activation.prepare` → one `onError`, **no** `onEnd`; a throw in `activation.effect` **before** the `onStart` call → the same; a throw in `activation.effect` **after** it → `onError` **and** one `onEnd({ type: 'canceled' })`; **`onStart` itself throws** → the same pair, and this is the row that fails if the marker advances after the call rather than before it. Plus the cancel-stage regression: **a throw in `release.effect` carries `AT_PROPOSAL`**, which is the row that fails if anyone re-derives the stage from `proposal !== null`. **Every** started operation on a live controller publishes exactly one `onEnd`, asserted across the whole failure-stage set rather than a sampled stage — this is the assertion that would have caught the skip, and the stage list is closed so it is cheap (D-66). A consequential failure after the authored commit publishes `{ type: 'accepted' }` **and** one `onError`; before any domain result it publishes `{ type: 'canceled' }` whose `reason` **is** the classifying error, by identity. `duration({ distance, from, to })` resolves once per landing at settlement, ahead of the reduced-motion collapse (D-67).

**New at the kernel vocabulary pass (D-68), and the first is the only one that tests the property rather than the list.** A **kernel-tier fixture behavior** imports `@ydinjs/drag/kernel` and `@ydinjs/drag/drag.js` and nothing else, declares every seam **out of line**, fills `config.liftMode`, discriminates all five `SETTLED_*` arms and derives D-66's fallback stage — 13c's free-drag probe is the candidate. **Out-of-line is load-bearing**: an inline factory is contextually typed and passes against the pre-D-68 surface. Then: `tests/exports.node.test.ts` asserts the 33 values **by value** (a type-only assertion cannot see F-59's hole); `typedoc.json`'s `intentionallyNotExported` is **empty**; **the docs check runs per entry** so `kernel.js`'s closure resolves within `kernel.js ∪ drag.js` (F-60 — the whole-run form reports nothing today while the kernel entry resolves `LandingStart` through `sortable/feature.js`); an import-graph assertion over `src/sortable/*` catches a new `../kernel/*` import that is neither published nor in a named internal group; `ActionTransition` and `SeamRejection` resolve to one declaration each (F-61); and the four re-homed names are asserted as **export identity** against the kernel entry, not merely as present.

**Three assertions the compiled fixture proved unavailable** — do not write tests that assume them, because they will pass vacuously: `duration: () => n` still compiles (F-52), `controller.destroy` still flows into a `void` position (F-53), and a narrowed `onEnd` handler compiles unless the slot is a named alias (F-51). The first two have no type-level test; the third does, and it is `n12`.

**New at Revision 2.1, with no probe behind them.** A third-party installer built against `sortable/feature.js` alone installs, contributes and retires (D-61), and a `sortable.js`-only fixture still cannot construct one. Every settlement arm reaches `onEnd` once, and an exhaustive `switch` over `ReorderTransactionResult` compiles with no `default` (D-62). `landing({ run })` is a compile error at the ordinary tier while a kernel-tier runner still works (D-63). **The stage → code mapping is total** — enumerate every `FAILURE_*` and assert a code for each; this is the test that stops the `default:` arm D-60's history warns about (D-64). `placeholder(context)` is adopted, and `data-drag-placeholder` is now the branding route and needs its own test (D-65).

**New, with no probe behind them.** `activation.rollback` leaves no library-authored attribute on a discarded consumer placeholder, with a negative control. D-51's exception list is **closed** — no slot filled by code the library does not own, other than `LandingHandle.destroy()`, fires after close, asserted over the whole slot set. **Under D-63 that assertion belongs at the kernel tier**: the sortable's runner is library-owned, so the ordinary tier has no such call to make and a test written there would pass vacuously. Array-identity structural detection: same identity invalidates geometry only.

---

## 4. Implementation order

The decisions have real dependencies. This order avoids rework:

0. **D-59 first — sort by blast radius, not by subject.** An earlier draft of this list put D-59 in step 4 with the geometry work, because `box` is a geometry concept. That is the wrong axis. D-59 widens `admit`, and **every declared `admit` in the repository moves with it** — the sortable spec, 13c's free-drag probe, the compiled fixtures, and every hand-written slot literal in the test corpus. Landing it late means re-touching every file the earlier steps already changed.
1. **D-36 / D-37 / D-38 / D-53** — the transaction bracket, the finite liveness domain, and the `KernelHost` reader D-38 requires. Probe A's spike is the starting point. Everything else assumes the bracket. D-53 _adds_ rather than widens, so nothing breaks if it arrives late — but arriving after the D-38 liveness audit means auditing twice.
2. **D-41** — delete the readiness protocol. The largest single deletion; it simplifies what D-49 and D-16 then have to say.
3. **D-45 / D-48 / D-55 / D-56 / D-57 / D-61 / D-64** — the composition and entry-topology change, now **eight entries over three tiers**. Touches the export table, the entrypoint manifest and `tests/exports.node.test.ts` together, and D-61 and D-64 both land here or the manifest is edited twice. **D-64 has a dependency the others do not**: the stage → code mapping must exist before any `onError` call site can be written, so write the mapping first and the entries after. 3b. **D-68 — the kernel vocabulary.** Immediately after step 3, and **not folded into it**: step 3 already edits the export table, the entrypoint manifest and `tests/exports.node.test.ts` together, and D-68 edits the same three. Folding them risks the export list being written from the old rule; sequencing them means the second pass has one job. Order inside the step: **F-61 first** — collapse the duplicate `ActionTransition`/`SeamRejection` declarations, because publishing either before that is publishing an ambiguity — then the value exports, then the type closure, then `KernelFrame.phase: Phase` (the internal `stamp` becomes `Phase \| typeof NO_STAMP` and narrows at its one write site through the sentinel test already there), then the four re-homings as re-exports, then empty `intentionallyNotExported`. **The closure will grow by two names when you export `Draft` and `Frame`**: `KernelFrame` and `OperationIdentity` become the next unresolved references, and they are in D-68's list for that reason — do not treat them as scope creep when TypeDoc reports them.

4. **D-43 / D-52 / D-58** — the rest of the geometry: two windows, `box` candidates.
5. **D-44** — collection delivery.
6. **D-46 / D-50 / D-54** — input policy. Independent of everything above; can run in parallel from the start.
7. **D-39 / D-42 / D-49 / D-60** — rollback, precondition, skipped landing, orthogonal `onError`.
8. **D-62 / D-63 / D-65 / D-66 / D-67** — the remaining surface changes. Deliberately last: each is mechanical, each touches many call sites, and doing them earlier means re-touching every file steps 1–7 change. **D-66 is the exception to "mechanical"** and should be written first within this step: it deletes 02 §The join's skip branch and replaces it with the two-line frame lookup, which is the only place in this step where behavior changes rather than a name.

**D-66's carrier, because the obvious guess is wrong.** Do **not** reach for `reportFailure(stage, error)` — it is admission-only by contract (_a failure with no operation to settle_) and an earlier draft of D-66 named it in error. The in-operation carrier is **`SettlementInput` with `SETTLED_FAILED`**, which already carries `{ stage, error }`, and the failure checkpoint already opens a settlement with it and runs the ordinary settlement seam stamped `REPORTING`. The change is confined to `settlement.prepare`, and its shape matters: **`prepare` writes the fallback into `draft.domain` and returns the existing `PreparedSettlement` sentinel.** `effect` receives a `Readonly<Frame<Part>>` and cannot write frame state, so it is not involved — an earlier draft said the behavior "publishes it in `effect`", which the seam does not admit. `finalized` then publishes `current.domain` unconditionally.

**Two consequences worth carrying:**

- **[04](contract/04-frame-slicing.md)'s frame model is unchanged, and deliberately so.** The fallback is constructed at the failure site and written into the `domain` field the part already has. Storing the raw error for later would have needed a new part field, a `createFramePart` initialiser and a `resetFramePart` obligation — i.e. it would have made 04 the third document this revision touches. It does not.
- **Two facts the kernel does not supply come from one behavior-private monotone marker** — `MINTED → STARTED → RESOLVING`, cleared in `retire()`. Advance it **immediately before invoking `onStart`** — before, not after, so a throw from `onStart` itself still owes a terminal — and as the **first statement of the `ResolutionCommand.invoke` closure**: the kernel runs that closure only after `release.effect` returns normally, so it marks the round-trip opening exactly. It answers the fallback's `CancelStage` (`RESOLVING` → `AT_CONSUMER`, else `AT_PROPOSAL`) and whether a terminal may be published at all.

  **Do not derive the stage from `proposal !== null`.** An earlier draft did; it is false, because the proposal commits in `release.prepare`, one seam before `onReorder` runs. A throw in `release.effect` leaves a committed proposal with the staged command never executed, and the wrong rule reports `AT_CONSUMER` for a drop the consumer never saw. §3 carries that as a named regression row.

- **No `onStart`, no `onEnd` — pinned, Q-15.** The owner's guarantee is an implication over _started_ operations, and D-66 does not make it a biconditional. A failure classified before the behavior's `onStart` call publishes `onError` and no terminal: the marker is at `MINTED`, no fallback is written, `finalized` finds `null`. `FAILURE_ADMISSION` never mints an operation at all; `FAILURE_ACTIVATION` does reach the checkpoint and must decline. **The split is immediately before the `onStart` call, not after it and not at the seam boundary.** Advancing after would drop the terminal for a throw from `onStart` itself — the one case where the consumer has definitely been told the drag began.

**One bounded check, not a redesign.** The checkpoint returns early when `phase === IDLE`, when the operation is stale, or when a `CANCEL` is already queued for the same operation — the last of which is correct and documented, since the cancel produces the single terminal. What implementation must confirm is that the **`IDLE` early return is unreachable after `onStart` has fired for a live controller**; if it is reachable, that is a path with no terminal and I-31 is false again. It is a test, and the assertion already exists in §3's terminal-totality row.

**Declare the callback slots as named type aliases** (F-51). Not stylistic: method shorthand is bivariant and this repo's `method-signature-style` rule rewrites the inline property form back to shorthand, so the aliases are the only form under which D-62's exhaustiveness is actually checked.

**The assumption to kill before starting: nothing here may assume the SPI is untouched.** Revision 2 was described as a consumer-surface change for most of its reconciliation, and that framing is what produced the mis-sort above and the three false single-crossing claims. **Free drag inherits a changed SPI** — 13c's typed probe is stale against _both_ crossings, and Phase 18 must re-read it rather than trust it.

---

## 5. Measured costs

Recorded so they are not rediscovered:

- **46 first-party `no-floating-promises` sites** from `destroy(): Promise<void>`, all plain `controller.destroy();`, including a React `useEffect` cleanup in the package's own demo. Remedy is `void controller.destroy();`.
- **+500 / −491 lines across 13 source files** for the bracket. **A complexity and invariant win, not a size win** — do not claim otherwise.
- **One extra forced layout per activation** for the second measurement window.
- **Subpaths 9 → 8.** D-56 removes three (`handle()` and `visual()` shared `sortable/handle.js`); D-48 adds `kernel.js`; **D-61 adds `sortable/feature.js`**, which has no runtime content and therefore adds no bytes — only a declaration file and an `exports` entry.

- **D-68 costs zero bytes and thirty-two names.** Every added type is erased; every added value is a numeric constant already in the graph; `toDraggableError` is already reachable from `sortable.js`. The entry count stays at **eight** and `sortable.js`'s bytes do not move — so M-3 must not move either, and if it does, something in the vocabulary pass was not a re-export. What it does cost is **semver surface**: thirty-two names that were public nowhere, including the eight-phase vocabulary D-14 has carried verbatim since probe 1.

- **The compiled fixture is 591 lines and cost three false contract claims to write** (F-51…F-53). Every one had survived a reconciliation, an owner pass and a review round in prose.

**A falsifiable prediction attached to D-56, checkable for almost nothing:** if the deleted subpaths carried no runtime machinery — D-45's stated reason for deleting them — then M-3's **bytes should not move, only the entry count**. If bytes move, something lived in `callbacks.ts`/`handle.ts`/`placeholder.ts` that the argument said was not there. Check this at implementation, not at Phase 21.

---

## 6. Open, and owed

**Needs an owner decision:**

0. ~~**Q-14 — blocking, and the only genuine contradiction this reconciliation found.**~~ **Resolved by the owner as D-66: `onEnd` is exactly-once domain disposition — the frame's existing result where it holds one, `canceled` with the classifying error as `reason` where it does not.** 02 §The join's skip rule and the `onError`-only rule are retracted; D-23 loses the clause _"no terminal callback"_ and keeps the rest; I-31's second exception is gone. No SPI change. Original text follows. ~~ What does a started operation publish when it fails consequentially and never produces a domain result? Owner final §4 requires one `onEnd` per started, still-subscribed operation **and** declines the `aborted` arm review 3 §11 proposed for exactly this case; [02](contract/02-kernel-behavior-contract.md) §The join skips the terminal after a consequential failure. All three cannot hold. Three ways out and a recommendation — publish the domain result the frame holds and let `onError` carry the fault — are in [05](contract/05-lifecycle-invariants.md) Q-14 and 00 §The unresolved arm. **Not resolved here, deliberately.**
1. ~~**The `landing({ duration })` thunk versus review 3 §10.**~~ **Resolved by the owner as D-67: `duration({ distance, from, to })` replaces the zero-argument thunk.** It discharges review 3 §10's second clause and keeps parity L-6, which D-63 had left the thunk carrying alone; removing the alternative is what proved the need §10 deferred it on. **Caveat from the fixture (F-52): the old thunk still compiles** — a zero-parameter function is assignable to any signature — so the migration is source-compatible and the deletion is documentary, not enforced. Original text follows. ~~ D-63 removes `run`; review 3 §10 also judged the zero-argument thunk unjustified and deferred a contextual `duration({ distance, from, to })`. With `run` gone the thunk is the **sole surviving carrier of shipped parity L-6** (settle-time `landingTiming()`), so removing it too drops a shipped capability with nothing in its place. This reconciliation keeps the thunk and records the conflict — [03](contract/03-feature-composition.md) §Public option domains.~~
2. **D-56** deletes `callbacks()`, `handle()`, `visual()` and `placeholder()` on the architect's judgement, not the owner's. Validation moves to the merge and gets stronger; four exports and three subpaths go.
3. ~~**A compiled type fixture for Revision 2.**~~ **Delivered: [`tests/revision/revision-2.ts`](../tests/revision/revision-2.ts), 591 lines, enforced by `npx just typecheck`.** Eighteen `@ts-expect-error` directives over seventeen live assertions, plus two positive exhaustiveness proofs — a `Record<FailureStage, DraggableErrorCode>` for D-64's total mapping, and a `default`-less switch over `ReorderTransactionResult` for D-62/D-66. **Three of the original sixteen assertions were false and are now findings F-51…F-53**, and `n17` was added when the patch review corrected D-66's carrier — `n17` pins that `SETTLED_FAILED` carries no `CancelStage` — which is what makes the derivation the behavior's — and `n18` pins that `settlement.effect` cannot write frame state, which is why the fallback is `prepare`'s write. What remains owed is narrower: the fixture restates the surface rather than importing it, because `src/` is still pre-revision, so it proves the surface is _self-consistent_ and not that the implementation matches it. That closes at Phase R. Original text follows. ~~ `tsconfig.json` includes `docs/**/*`, and Phase 14 shipped a 38 KB `tests/revision/phase-14.ts` that `typecheck` enforces. There is none for D-36…D-65, so **nothing mechanically catches drift** between these documents and the implementation. **Revision 2.1 raises this from owed to urgent**: the export table has now changed in five of the last six passes over it, every one of those changes is mechanically checkable, and none of them was mechanically checked — which is how five owner decisions went missing in the first place. `contract.ts` and `phase-14.ts` are now wrong about several decisions; 00's _"where the fixture disagrees, the fixture is the bug"_ covers the interval but not indefinitely.~~
4. **Probe A's spike** is three commits on `worktree-agent-a4d0ec4ad722d3a16` and is the only executable evidence for D-36…D-39. Land it or discard it deliberately.

**Still needs an owner decision:**

5. **Does `drag.js` survive?** [`measurements/error-identity.md`](measurements/error-identity.md) **disproves** the identity argument that kept it (F-54): a module reachable from two entries is emitted once in both build modes, so cross-entry `instanceof` holds however many entries re-export the class. That is the **second** justification for the third root to fail — D-48's structural-dependency argument was voided by D-64 first. What survives is one declaration site and a tier-neutral specifier, both maintenance arguments rather than correctness ones. **D-68 is neutral on this and adds one data point.** The kernel tier now names `DraggableError` twice over — as `toDraggableError`'s return type and in a behavior's own `instanceof` — which is the same _both tiers name it, neither owns it_ argument the shared root already rests on: neither strengthened nor weakened. Whichever way this question goes, D-68's vocabulary table is unchanged; if the recommendation below is applied, `kernel.js` re-exports the three shared names and the authoring tier becomes **one** specifier instead of two. **The measurement's recommendation, not applied:** keep `drag.js` as the declaration site and **also** re-export the shared vocabulary from each behavior entry, so an ordinary consumer needs one specifier rather than two, with a one-line export-equality assertion holding the copies in sync. Not applied because this would be the third re-derivation of the entry topology in a week and the first two both evaporated — the difference now is a measurement rather than an argument, which is a reason to trust the finding and not a reason to let its author take the decision.

6. **Should the kernel tier publish the D-46 input-policy helpers?** Raised by D-68 and **deliberately not decided**. `POINTER_OWNERS`, `COMMAND_OWNERS` and `pathOwnsInteraction` are what make admission decline on interactive and editable descendants; a third-party behavior that wants the library's policy must otherwise reimplement the walk, and D-46 is explicit that getting it wrong is an accessibility defect. They are not in any public closure, they are a **policy helper rather than SPI vocabulary**, and shipping a runtime helper at the kernel tier is the one addition in this area with a bundle consequence — which is why D-68 excludes them and names the exclusion instead of absorbing it. A later `kernel/policy.js` is the shape if the answer is yes.

**Owed measurements:**

- **Touch is unmeasured.** Probe E is Chromium and mouse only, and D-54's policy is unconditional. Long-press context menus and tap highlighting were also consumed by the admission `preventDefault()`. `touch-action` is named as the scroll answer, which is correct, but nothing has verified the rest.
- **M-1…M-4 predate the bracket.** D-36 adds a branch per drain, D-37 removes 27 predicate calls, D-43 adds a measurement window. The numbers are not wrong; they no longer describe the specified system.
- **WebKit and Gecko.** api-1's R-1/R-2 are box-model consequences with no engine-specific behavior suspected, but unverified.

**Known type risk.** D-48 replaces `brandBehavior`'s explicit type argument with inference through a factory's return position. Whether `BehaviorSpec<FreeDragPart>` still infers `Activation = true` while `BehaviorSpec<SortableFramePart, HTMLElement>` infers `HTMLElement` is **exactly the kind of claim this corpus has been wrong about twice in prose**. Only the compiler settles it.

**Not contract, and someone owns it:** the entrypoint manifest and `tests/exports.node.test.ts` still assert the Phase 14 topology.

---

## 7. Two things worth carrying forward

**The reach/stretch apparatus was retired by changing its domain, not by finishing it.** I-36 quantified over _every overridable member of every consumer-owned node_ — a set the document itself said "cannot be enumerated" — and three consecutive review passes each closed the one site the previous reviewer happened to reproduce. An obligation no implementation can discharge and no review can check is not a strong guarantee; it is an unfalsifiable one. D-37 replaced the domain with the finite list the export table already enumerates. **The lesson generalises: when a guarantee cannot be checked, narrow what it ranges over before strengthening how hard you try.**

**The instrument that caught the real defects was reconciliation, not review.** Three API review rounds and five probes preceded this work, and the eleven forced decisions still only surfaced when one document was read against another: D-53 came out of reconciling D-38 against the SPI, D-59 out of reconciling the trace against H-2, D-51 out of reconciling D-37 against a barrier table that had recorded the exception for two checkpoints. A review pass asks _is this right?_ and gets the author's own model back. Reconciliation asks _do these two say the same thing?_, which has an answer the author does not control. Note also what the record shows about the author: "Revision 2 asks nothing new of the SPI" was asserted three times and corrected three times, always by a reviewer, and it survived the first two corrections **because nobody re-derived it** — it was carried forward as settled. A freeze rule that is never invoked is not being honoured; it is being avoided.

**D-51 exists because a finite domain with an unstated exception is not finite.** The kernel must call `LandingHandle.destroy()` after closure or leak a runner nobody owns. Under the old prose floor that was a tolerable stated breach; under D-37 it was fatal, because the entire value of the narrowing is that the list can be checked. The exception is therefore named, enumerated at one member, and given a discriminating property — **relinquishment returns something to the consumer, it does not ask anything of them** — so it cannot be used to smuggle operation work past a close.

---

## 8. What Revision 2.1 is evidence of

**Five owner decisions went missing, and four of them lived only in the earlier review rounds.** The final summary's §12 asked to reconcile "against the decisions above", and Revision 2 read that literally: the twelve numbered sections of one document, closely, and the three review summaries underneath them loosely. The landing-runner removal is in review 1 §5, reaffirmed twice. The coarse error codes are in review 3 §12. The middle tier is in review 3 §1 **and** in final §11's ladder, and it was still lost — because the ladder's middle rung reads as a description of the built-in fragments unless you have read §1, where it is an authoring surface with a name.

**The closing pass changed the instrument, and that is the part to keep.** Revision 2.1 was caught by a reader; the four defects after it were caught by a **compiler** and a **build**. F-51, F-52 and F-53 are contract claims that TypeScript does not enforce, and all three had passed a reconciliation, an owner pass and a review round as prose. F-54 is an architectural argument disproved in ninety seconds by building four files. **Prose review found what prose review finds: disagreements between documents. It cannot find a claim that is internally coherent and untrue of the language or the toolchain.** Only an artifact does that.

The sharpest of the four is F-51, because it is two layers deep: `strict` does not make method parameters contravariant, **and** the repo's own `lint-fix` rewrites the property form that fixes it back into shorthand. A contract rule that the next format reverses is not a rule, and no amount of reading would have surfaced it.

**The generalisable rule: a digest is not a decision record.** A summary of decisions is written to be read by someone who has the history; a reconciliation is performed by someone who is about to replace it. Reconcile against the history, and use the digest to check that you have not missed anything recent — not the reverse.

**The second-order finding is more uncomfortable.** §7 already records that "Revision 2 asks nothing new of the SPI" was asserted three times and corrected three times. Revision 2.1 is the same failure mode at a different scale: the reconciliation converged on a self-consistent set of documents that was internally impeccable and wrong about five things nobody in the loop could check, because the only copy of those decisions was in files nobody re-opened. **Internal consistency is cheap to achieve and proves nothing about fidelity.** The compiled fixture in §6 is the only proposal on the table that would have caught any of this mechanically, and it would have caught two — D-62 and D-65 are type-level facts.
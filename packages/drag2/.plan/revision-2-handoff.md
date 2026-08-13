# Revision 2 — implementation handoff

Deliverable of [`reviews/api-reviews/api-review-final-summary.md`](reviews/api-reviews/api-review-final-summary.md) §12. Written after documents 00–06, the README and this directory were reconciled against the owner decisions.

**The contract is the source of truth. This document is an index and a risk register, not a second contract.** Where it disagrees with `contract/`, the contract wins.

---

## 1. Status

**Twenty-three decisions, D-36…D-60.** Twelve are the owner's sections. **Eleven were forced by reconciliation** — places where two decisions were individually sound and jointly unimplementable, each found by a reviewer refusing to paper over a conflict rather than anticipated in advance. That ratio is the main finding of the exercise, and it is the argument for reconciling a contract before implementing against it rather than after.

The freeze rule ([`contract/00-index.md`](contract/00-index.md) §Normative precedence and freeze) is discharged **per decision**, in writing:

|  | Decisions |
| --- | --- |
| Carried by a failing executable case | D-36…D-39, D-42, D-43, D-46 (probes A, C1, E, api-1) |
| Owner decisions about a public API, which the rule does not govern | D-40, D-41, D-44, D-45, D-47, D-48, D-50, D-54…D-58 |
| Repairs to holes the above opened | D-49, D-51, D-52, D-60 |
| **SPI changes — the rule governs them in full, and both are discharged** | **D-53** (added member, probe A) · **D-59** (seam signature, api-1) |

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
| [`03-feature-composition.md`](contract/03-feature-composition.md) | Fragments as plain partial config; feature brand withdrawn; four installer-less factories deleted; `items()` + `invalidate()`; two-window footprint; `box` candidates; ceilings withdrawn; three entry roots over two tiers |
| [`04-frame-slicing.md`](contract/04-frame-slicing.md) | **Untouched.** Nothing in Revision 2 reaches it |
| [`05-lifecycle-invariants.md`](contract/05-lifecycle-invariants.md) | I-36 rewritten to the finite domain; **the 62-row stretch table deleted**; I-37 added; I-35 retracted; I-6, I-8, I-9, I-17, I-29, I-31 amended; F-15, F-16, F-17, F-46, F-47 amended; eight new test-matrix groups |
| [`06-vertical-sortable-trace.md`](contract/06-vertical-sortable-trace.md) | Readiness leg re-traced as the serial commit; `activation.rollback` reversed; two measurement windows; `preventDefault()` relocated; construction rewritten for D-45/D-48/D-56 |
| [`README.md`](../README.md) | Published ceiling withdrawn; export table rebuilt over three entries; migration table gains the parity gain; accessibility obligation stated |
| [`ledger.md`](ledger.md), [`plan.md`](plan.md) | Parity reclassified (83 rows); L-1 reversed, L-12 noted, L-13 added; §Revision 2 and §Phase R added |

**Provenance marked, not deleted:** [`api-review-3-probe-plan.md`](reviews/api-reviews/api-review-3-probe-plan.md) and [`api-review-3-resolution-c5.md`](reviews/api-reviews/api-review-3-resolution-c5.md) carry supersession headers naming what in them is now wrong.

---

## 3. Acceptance tests that must survive

The owner's instruction is that remaining probe scenarios may become implementation acceptance tests. These are the ones that must:

**From probe E ([`probes/api-3-input-policy.md`](probes/api-3-input-policy.md)) — 22 tests, all release-blocking behavior.** A press on a nested control that never crosses the threshold consumes nothing: caret, selection, focus and form-control operation all survive. `ArrowRight` in a nested text input moves the caret and reorders nothing. `event.isComposing` never admits. Click, `href` and ctrl-click survive an admitted press.

> **The observable changed.** Probe E reads `pointerdown.defaultPrevented` as its primary signal. Under D-54 `admitted ⇒ defaultPrevented` is **false** between admission and threshold, so every promoted case needs a different observable — the crossing `pointermove`, or the suppressed `click`.

**From probe C1 ([`probes/api-2-commit-window.md`](probes/api-2-commit-window.md)).** The append loop and morphdom-style commit both land correctly. A destructive commit reports `onError` **and** `onFinish`, starts **no** animation, and arrives within one frame — the positive jump-cut assertion, which is probe C1's twelve-frame flight to `(0,0)` as a regression test. A drag with `box ≠ visual` does not run the list tall.

**From probe A ([`probes/api-4-transaction-bracket.md`](probes/api-4-transaction-bracket.md)).** Teardown order under a reentrant destroy is _close → report → teardown_. A liveness reading disagreeing with `signal.aborted` resolves by the latch — and the fixture must be one where the two **actually disagree**, or it proves nothing. An abandoned resolver's late rejection is consumed with a real `unhandledrejection` listener attached, settled once a **newer** operation owns the controller.

**New, with no probe behind them.** `activation.rollback` leaves no library-authored attribute on a discarded consumer placeholder, with a negative control. D-51's exception list is **closed** — no declared slot other than `LandingHandle.destroy()` fires after close, asserted over the whole slot set. Array-identity structural detection: same identity invalidates geometry only.

---

## 4. Implementation order

The decisions have real dependencies. This order avoids rework:

0. **D-59 first — sort by blast radius, not by subject.** An earlier draft of this list put D-59 in step 4 with the geometry work, because `box` is a geometry concept. That is the wrong axis. D-59 widens `admit`, and **every declared `admit` in the repository moves with it** — the sortable spec, 13c's free-drag probe, the compiled fixtures, and every hand-written slot literal in the test corpus. Landing it late means re-touching every file the earlier steps already changed.
1. **D-36 / D-37 / D-38 / D-53** — the transaction bracket, the finite liveness domain, and the `KernelHost` reader D-38 requires. Probe A's spike is the starting point. Everything else assumes the bracket. D-53 _adds_ rather than widens, so nothing breaks if it arrives late — but arriving after the D-38 liveness audit means auditing twice.
2. **D-41** — delete the readiness protocol. The largest single deletion; it simplifies what D-49 and D-16 then have to say.
3. **D-45 / D-48 / D-55 / D-56 / D-57** — the composition and entry-topology change. Touches the export table, the entrypoint manifest and `tests/exports.node.test.ts` together.
4. **D-43 / D-52 / D-58** — the rest of the geometry: two windows, `box` candidates.
5. **D-44** — collection delivery.
6. **D-46 / D-50 / D-54** — input policy. Independent of everything above; can run in parallel from the start.
7. **D-39 / D-42 / D-49 / D-60** — rollback, precondition, skipped landing, orthogonal `onError`.

**The assumption to kill before starting: nothing here may assume the SPI is untouched.** Revision 2 was described as a consumer-surface change for most of its reconciliation, and that framing is what produced the mis-sort above and the three false single-crossing claims. **Free drag inherits a changed SPI** — 13c's typed probe is stale against _both_ crossings, and Phase 18 must re-read it rather than trust it.

---

## 5. Measured costs

Recorded so they are not rediscovered:

- **46 first-party `no-floating-promises` sites** from `destroy(): Promise<void>`, all plain `controller.destroy();`, including a React `useEffect` cleanup in the package's own demo. Remedy is `void controller.destroy();`.
- **+500 / −491 lines across 13 source files** for the bracket. **A complexity and invariant win, not a size win** — do not claim otherwise.
- **One extra forced layout per activation** for the second measurement window.
- **Subpaths 9 → 7.** D-56 removes three (`handle()` and `visual()` shared `sortable/handle.js`); D-48 adds `kernel.js`.

**A falsifiable prediction attached to D-56, checkable for almost nothing:** if the deleted subpaths carried no runtime machinery — D-45's stated reason for deleting them — then M-3's **bytes should not move, only the entry count**. If bytes move, something lived in `callbacks.ts`/`handle.ts`/`placeholder.ts` that the argument said was not there. Check this at implementation, not at Phase 21.

---

## 6. Open, and owed

**Needs an owner decision:**

1. **D-56** deletes `callbacks()`, `handle()`, `visual()` and `placeholder()` on the architect's judgement, not the owner's. Validation moves to the merge and gets stronger; four exports and three subpaths go.
2. **A compiled type fixture for Revision 2.** `tsconfig.json` includes `docs/**/*`, and Phase 14 shipped a 38 KB `docs/revision/phase-14.ts` that `typecheck` enforces. There is none for D-36…D-60, so **nothing mechanically catches drift** between these documents and the implementation. `contract.ts` and `phase-14.ts` are now wrong about several decisions; 00's _"where the fixture disagrees, the fixture is the bug"_ covers the interval but not indefinitely.
3. **Probe A's spike** is three commits on `worktree-agent-a4d0ec4ad722d3a16` and is the only executable evidence for D-36…D-39. Land it or discard it deliberately.

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
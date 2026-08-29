# Q-L1 — a measurement contract for the landing-hold counterfactual

**Architect, 2026-08-29. Phase 23.** A contract for a size probe, not a probe and not a decision. It defines what must be built, what must not move, which numbers answer the question, and — stated in advance, so the answer cannot be argued after the fact — which results settle Q-L1 and which kill it.

Raised by [`trace-execution-topology-claude.md`](../reviews/phase-23/trace-execution-topology-claude.md) §8:

> **Q-L1 — should the settlement's landing-hold be a kernel capability the behavior installs, rather than a fixed part of the settlement protocol?**

**Why it cannot be answered from what exists.** The only figure in hand is ~697–825 B, and it is **minified source-map attribution by hand-read line range** in a Vite page build. The budgets are Brotli, from `bench/size`, on the package's own build. Those are different instruments measuring different artifacts, and the conversion between them is neither 1:1 nor stable (§5). No decision may rest on the first number.

---

## 1. The architectural property the counterfactual must preserve

The property under test is **not** "landing works". It is the reason the hold is in the kernel at all:

> The kernel owns the operation lifecycle, and it must be able to **defer retirement across an asynchronous, fallible gate implemented in foreign code**, releasing every resource it holds exactly once whichever way the gate ends.

Seven invariants carry that property. **A counterfactual that weakens any one of them is measuring a different settlement protocol, and its delta is void** — not "approximate", void, because the bytes it saved were paying for a guarantee the real design has to keep.

1. **One terminal per operation.** Exactly one terminal callback, whatever the gate does — including a gate that fails, completes twice, or completes synchronously inside `start`.
2. **Release-once, after the gate, in order.** `joinSettlement`'s ordering is normative: relinquish the runner, pin, release presentation, then the terminal callback. The release is in a `finally`.
3. **The pin is unconditional and is not part of the gate.** See §3 — this is the invariant most at risk in a careless ablation.
4. **Gate failure is classified.** `FAILURE_LANDING_INTERRUPTED`, latched through `requestFailure` inside a seam and queued through `failOperation` outside it. The two-channel split is the invariant, not the stage name.
5. **A returned handle is destroyed on every exit.** `ARM_FAILED`, `ARM_STALE`, teardown, and the ordinary join. A handle that is created and not destroyed is a leak the probe must not buy bytes with.
6. **`destroy()` is a synchronous terminal barrier across the gate**, and `settlementLive`/`joinLive` are how it is enforced on both sides of foreign code.
7. **The behavior requests, the kernel arms.** _The gate methods record a request; they arm nothing._ A shape in which the behavior arms its own runner has moved lifecycle ownership out of the kernel and is out of scope for a size probe.

---

## 2. The three arms

The probe is **three builds, not one**, and the order matters: without the ceiling, a candidate's saving cannot be judged, and without the cheap arm, an architectural change may be credited with a saving a local edit would also have produced.

### Arm A — the ceiling. _Not a candidate design._

Remove the hold capability entirely. `holdForLanding`, the runner branch in `armSettlement`, `completeLanding`, `handleLandingSettled`, the `LANDING_SETTLED` action, `rollbackLandingHold`, and the `holds`/`start`/`landing`/`landingHeld`/`relinquished`/`completed` fields of `SettlementAttempt`. `advanceSettlement` becomes an unconditional `joinSettlement`. On the behavior side, `settlement.effect`'s hold request and `slots.startLanding` go.

**`landing()` stays exported as a no-op installer that installs nothing**, so every `bench/size` row still builds and the row set is not edited (§4). `landing-runner.ts` then drops out of the graph on reachability, and `minimal + landing` collapsing onto `minimal` is the arm's own self-check.

**A is unshippable and that is the point.** It answers one question: _what is the most any conditional design could ever save?_ Every other arm is scored against it.

### Arm B — the candidate family. Measured at its **most favourable member**.

"Landing hold is installed only when the behavior composes landing." Two shapes are worth distinguishing, and the probe measures **whichever is cheapest while satisfying all seven invariants**:

- **B1 — a gate module in the shared tier.** `completeLanding`, the runner branch and the completion handling move to a module the behavior imports (`shared/settlement-gate.ts` in shape, not in name), installed through the existing construction handshake. The kernel keeps the deferral primitive: a hold count, `sealed`, and `advanceSettlement`'s test. **The known hard edge is the queue action**: `LANDING_SETTLED` is a `case` in `handle`'s switch, and a switch arm does not tree-shake. Whether the completion can re-enter through an existing action or must carry a callback is the shape question B1 exists to price.
- **B2 — an opaque deferral on the kernel SPI.** The kernel publishes only _defer my retirement until this is released_, and everything landing-shaped — the handle protocol, `LandingContext`, the once-only latch, the destroy-on-every-exit discipline — moves behind the behavior's `spec`. Strictly more moves than B1 and strictly more contract surface at risk.

**The probe does not choose between B1 and B2, and must not be built to make either look good.** It builds the _most favourable honest_ member it can. If the most favourable B does not clear §6's bar, no B does, and the conclusion is sound without having enumerated the family. If it does clear the bar, the probe has established that a design _exists_ in the band — not which one, which is the decision Q-L1 would then be worth taking.

### Arm C — degeneralize in place. _The arm that can kill the question._

No architectural change, no contract change, nothing conditional. Only the generality that has one user today:

- `holds: number` has **exactly one increment site** (`holdForLanding`) and its population is one. It is a counter because a second gate — the deleted readiness protocol — once existed. It could be a boolean, or fold into `landingHeld`.
- `SettlementAttempt` carries eleven fields for one gate; `completed`, `failed`, `relinquished`, `landing` and `start` are candidates for collapse under the same reading.
- `advanceSettlement`'s `failed` test is documented as _redundant with the hold accounting as things stand_.

**C is the honest competitor.** If C captures most of A's ceiling, the ~825 B was **generality, not topology**, and Q-L1 dies as a size question — the correct change is a local simplification with no contract cost, decided on its own terms.

---

## 3. What may change, and what must not

### Must remain byte-invariant in **every** arm

The trace analysis's §5.4 refinement is the load-bearing constraint here, and it is the easiest thing to get wrong:

> **The anchor measurement and the final pin are shared.** `armSettlement` measures `spec.anchorTarget` through `runUnclassifiedValue` **before** the landing branch, and `joinSettlement` pins to `targetX`/`targetY` **whether or not a runner was installed**. `minimal` — with no landing composed — reaches the pin and consumes it (`joinSettlement → runLeaf → runPhase → kernel.ts:1706 → presentation.write`).

So the following are **not** part of the capability under test and must be present and unmodified in A, B and C:

| Untouchable | Why |
| --- | --- |
| `armSettlement` lines up to the landing branch — `runUnclassifiedValue`, `spec.anchorTarget`, `targetX`/`targetY` | measured and consumed with no landing composed |
| `joinSettlement`'s pin, its ordering, its `joinLive` re-checks, its `finally` | invariants 2 and 6 |
| `openSettlement`'s `SEAM_COMMITTED` test, `dropStaged`, `sealed` | settlement protocol, not gate |
| `retireOperation`, `unwind`, `spec.retire` | lifecycle |
| `SETTLING → FINALIZING`, and _a gate release is not a frame transition_ | frame protocol |
| `seams.ts` in its entirety, incl. `runUnclassifiedValue` | shared; used by the anchor |
| `bench/size/measure.ts` — **the row set, the budgets, the graph and absence assertions** | editing the instrument voids every control |
| build config, minifier settings, `box-quad` | comparability |

**An arm that moves `baseline B` has changed the harness and is void.**

### May change, on a throwaway branch only

Anything else inside the hold's own boundary, plus whatever minimal edits each arm needs in `sortable/spec.ts`, `free-drag/spec.ts`, `assemble.ts` and `slots.ts` to stop requesting a hold. Tests may fail in arm A — it deletes a capability — and that is expected rather than a result; **arms B and C must keep the suite green**, because a B or C that breaks a test has almost certainly broken an invariant in §1 and its delta is void under that rule.

**Nothing from any arm is committed to `drag2/fin-review`.** Detached worktrees, as the D-153 ablation ran. The only artifact that lands is the measurement record.

---

## 4. Controls and answering deltas

Baseline taken 2026-08-29 on `drag2/fin-review`, and **the probe re-takes its own baseline** rather than quoting this one — a delta recorded at landing is a claim about the tree at landing.

| Row | Baseline | Role |
| --- | --: | --- |
| `minimal` | 9.91 kB | **the answer.** Q-L1 is only about what a landing-less page pays |
| `free drag minimal` | 7.75 kB | **independent replication.** Same kernel gate, different behavior |
| `kernel root - kernel.js` | 6.06 kB | **localization.** The claim is that the bytes are in the kernel |
| `minimal + landing` | 10.18 kB | **the cost side.** A conditional design usually costs bytes when the capability _is_ composed |
| `free drag + landing` | 8.02 kB | cost side, replicated |
| `both behaviors` | 11.93 kB | shared-set effect; the gate is shared machinery today |
| `minimal (xy)` | 9.58 kB | **control.** Composes no landing — must move by the _same_ amount as `minimal` |
| `minimal + layoutAnimation` | 10.35 kB | **control.** Same |
| `vocabulary root - drag.js` | 0.14 kB | **control. Must not move at all** |
| `baseline B` | 6.89 kB | **control. Must be byte-identical, or the harness changed** |

**The two deltas that answer Q-L1** are `Δminimal` and `Δ(minimal + landing)`. Everything else either replicates them, localizes them, or proves the arm did not leak.

---

## 5. The conversion, and what the probe is expected to find

The minified figure must be converted, and the conversion factor is **derivable from rows that already isolate a known module set** rather than assumed:

| Isolated module set | minified | Brotli delta | factor |
| --- | --: | --: | --: |
| `layout-animation.ts` (1374 B) | 1374 | `minimal + layoutAnimation` − `minimal` = 440 B | **32 %** |
| `landing.ts` + `landing-runner.ts` (678 B) | 678 | `minimal + landing` − `minimal` = 270 B | **40 %** |
| the same, on free drag | 678 | `free drag + landing` − `free drag minimal` = 270 B | **40 %**, replicated exactly |

Applied to the hold's 697–825 B minified, the **predicted band is ~225–330 B Brotli** — which straddles §6's threshold, and is precisely why the question needs a probe rather than an estimate.

**One hazard, stated in advance so it is not discovered as a disappointment.** Both calibration rows measure modules that are _wholly added_ to a graph. The hold is **interleaved** with kernel code Brotli already has in its window, so it may compress better than a standalone module and the true figure may sit at or below the low end. The prediction is therefore closer to an upper bound than a midpoint, and a result near 225 B should not be read as "worse than expected".

---

## 6. Thresholds, fixed before the numbers exist

Materiality is anchored to the package's own convention — M-3′'s ~150 B budget-slack unit and D-106's demonstrated sensitivity, where a ~60 B module does not trip a budget and a ~361–388 B one does. Current slack is 460–630 B on the behavior rows, so **nothing here is under budget pressure**; the question is materiality against a >10 kB headline, where 150 B is ~1.5 % and 300 B is ~3 %.

**Kills Q-L1 as a size-driven direction — either of:**

- **A's ceiling on `minimal` is < ~150 B Brotli.** No conditional design can beat the ceiling, and the ~825 B minified was compression illusion. Record the conversion factor for the next reader and close.
- **C captures ≥ ~70 % of A's ceiling.** The bytes were generality, not topology. The right change is a local simplification with no contract cost, decided on its own merits, and Q-L1 is withdrawn rather than declined.

**Makes Q-L1 worth settling — all four:**

- A's ceiling on `minimal` is **≥ ~300 B Brotli**;
- replicated on `free drag minimal` within **±25 %** — otherwise the saving is behavior-specific and the diagnosis is wrong;
- localized: **`kernel.js` moves by a comparable amount**. If `minimal` moves and `kernel.js` does not, the bytes came from somewhere else and the claim is misattributed;
- the most favourable **B recovers ≥ ~60 % of the ceiling while costing ≤ ~100 B on `minimal + landing`**.

**Everything between is _record and decline_** — D-106's disposition, and it must be reached explicitly rather than by fatigue. A middling result is a real answer and should be written as one.

---

## 7. Deliverable

A measurement record under `.plan/measurements/`, carrying: the re-taken baseline; the fourteen rows for each arm with every control's movement stated including the zeros; the derived conversion factor; which threshold in §6 the result meets; and, for arms B and C, the suite's status. **No production change lands from this probe**, whichever way it goes — a result that meets §6's bar makes Q-L1 worth _deciding_, and the decision is a separate act with a contract cost of its own.

---

## 8. What would invalidate the probe itself

- **An arm that moves `baseline B` or `drag.js`.** Void; the harness or the shared vocabulary was touched.
- **`minimal (xy)` and `minimal + layoutAnimation` moving by a different amount than `minimal`.** The arm reached something other than the hold.
- **Arm A's `minimal + landing` not collapsing onto `minimal`.** The capability was not fully removed, so the ceiling is not a ceiling.
- **A B or C arm with a failing test.** Almost certainly a broken §1 invariant, and the delta is void under §3's rule rather than being a number with a caveat.
- **A B arm built to be cheap rather than honest.** The probe bounds the family from its most favourable member; a member that satisfies six of the seven invariants bounds nothing.
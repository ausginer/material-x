# Phase 21 — the measurement contract for the complete package

**Status: planned, 2026-08-19. Not yet run.** This document is the Phase 21 measurement contract: five measurements, what each can change, and the four standing obligations it withdraws. It supersedes the per-row _What changes_ table in [`plan.md`](../plan.md) §Phase 21, which stated the subject and not the question.

**The rule this plan is written against.** A measurement is taken only if a **named decision** changes on at least one of its outcomes. Everything else is telemetry: recorded because a later reader will ask, never presented as a finding. Each measurement below therefore states its decision first and its workload second, and every output is labelled **decision-driving** or **telemetry**.

---

## What is withdrawn, and why

Four obligations carried into this phase cannot change a decision in the form they are written. They are withdrawn here rather than designed around, and each is replaced by the narrower question that survives.

**1. M-1's "does free drag's part cross the 12-to-16-field cliff?" — settled by counting, not measurable into a different answer.** M-1's cliff is in **behavior-part fields**, over a 7-field kernel slice. `SortableFramePart` is 8; `FreeDragFramePart` is **5** (`src/free-drag/frames.ts`). Both sit on the cheap side, the smaller one further from the edge than the shipped shape already measured. There is no workload on which this returns anything but _below the cliff_, and 07 §Carried to Checkpoint E item 4 — _five fields against eight, both under M-1's cliff_ — has already stated the answer as arithmetic. **What survives is the polymorphic call site**, which is a genuinely open number and is M-1′ arm B.

**2. M-2's "closure model vs opaque-`S` plus static spec, at mixed counts" — a model comparison with no live falsifier.** M-2 answered it with a stable per-controller ratio across two orders of magnitude and a hot-path call ratio that decided the question on the axis that matters. Neither stand-in is code that ships, and re-running two stand-ins against a second behavior measures the stand-ins. **What survives is the real per-controller heap for the free-drag shape**, which is M-2′ arm A and answers a different question — whether the per-controller cost is the kernel's or the behavior's.

**3. M-4's "re-check the shared layout read with two axis features rather than one" — not a constructible configuration.** Exactly one axis feature installs; `bench/size/measure.ts` encodes the exclusivity as an assertion (`withoutAxis`), and Phase 17 chose sibling features over one parameterized rule precisely so that a list consumer never carries the grid metric. There is no composition holding `y()` and `xy()` at once to measure. **What survives is sharper than the obligation it replaces** and is M-4′: q7's answer 2 was measured when the axis rebuild was **lazy**, and Phase 11's own answer 1 then made it **eager and interior to the committed-move bracket** — C4-03 recorded the change and recorded that the measurements were not re-run.

**4. F-72 is not a Phase 21 subject.** D-82 booked F-65 and F-72 into this phase as one question. **D-85 closed F-72** — as a correctness fix rather than as the overhead item it was filed as — and deleted the second traversal. There is nothing left to measure on that side. What D-85 left behind is unconditional kernel arithmetic that only free drag reads, which is **F-65's shape pointed the other way**, and D-85's own row says Phase 21 measures it beside F-65. It is arm B of **M-5** and travels under F-65, not under a closed finding.

**Not withdrawn and not re-imported: §Check D-56 is Phase R's**, one `bench/size` run at the commit where the deletion lands. Phase 21 may not record it as satisfied and must not inherit it.

---

## The reproducibility standard, preserved

05 §Measurements owed's six inputs apply unchanged to every file below: **a checked-in workload and harness; named engine and version; a warm-up and GC policy; the counts under test; a sampling and statistical policy; and a correctness-equivalence check for any specialized path measured against the general one.** Three operational rules learned since are part of the standard and not commentary:

- **One measurement file per run.** The browser project runs files in parallel and two measurement suites sharing a page inflate every absolute by roughly 2×. Ratios survive it; absolutes do not.
- **Both arms of a comparison in one session, on one machine.** The devcontainer CPU is shared and the absolutes have already drifted 2.64 → 3.3 µs between two runs of an unchanged path. Every before/after conclusion rests on the paired run, never on a column against an older table.
- **A one-tick null is a null, not an upper bound.** `performance.now()` is clamped to 100 µs; divided by the calibrated batch it sets the smallest expressible difference. _No resolvable regression at ~0.1 µs per sample_ is what such a run establishes, and writing it as _under 0.1 µs_ is a claim the sampling does not support.

Timings stay opt-in behind `VITE_DRAG_MEASURE=1` and assert nothing. Structural assertions — equivalence checks, module-graph absences, read counts — run on every suite run. **A measurement that asserts nothing structural is not checked in.**

---

## M-3′ — the composition surface, re-declared

**First, because it gates a rule.** It is deterministic, needs no CPU quiet, and until the budgets are re-based every later fix is planning against a number four absorbed changes have eroded.

**Decisions it can change.** (a) The budget re-base and what the headroom is _for_. (b) **The subpath topology at two behaviors** — the both-behaviors row is the test of D-48's `kernel.js` split: if the combined composition lands near _sortable + free drag − shared kernel_, the split is validated; if it lands near the sum, something the two behaviors both need is being counted twice and the export topology reopens under 05's own trigger. (c) The migration claim the README will make for `draggable`.

**Reused unchanged.** The whole harness mechanic: one declaration per composition, `imports`-or-`entry`, Rolldown at the lockfile version, brotli at default quality, no aliases, no repetition policy plus a byte-identity assertion across two runs, and the module-graph half.

**What must change.** The composition list, which currently has no free-drag row at all. Add: free-drag minimal; `+ bounds()`; `+ landing()`; free-drag complete; and **both behaviors in one graph**. The absence assertions gain the cross-behavior form — no `sortable/*` module in any free-drag graph and no `free-drag/*` module in any sortable graph — which is the tree-shaking claim restated at two behaviors and is new, not a re-run.

**Decision-driving:** the both-behaviors delta against the sum; every module-graph assertion; the re-based budgets. **Telemetry:** the per-composition absolute bytes, and baseline B.

---

## M-1′ — the shared publication site, and free drag's sample

**Decisions it can change.** (a) Whether kernel frame publication needs a shape-stable design once one page runs two behaviors. (b) Whether `bounds()`'s lazy resolve needs frame coalescing (D-70, D-81), which is the one design in the free-drag hot path that can degrade to a layout read per sample. (c) P-01, the per-sample visual render. (d) Whether I-26's allocation claim holds at the second behavior with a consumer callback installed.

**Reused unchanged.** `tests/perf/m1.browser.test.ts`'s policy and equivalence discipline: 5 discarded warm-ups, calibrated batch, 21 samples, median, and the assertion that any specialized path leaves a byte-identical committed frame before a ratio is quoted. The size-parameterized arm is re-run once — not for the cliff's existence, which is settled, but because **the cliff's location is Chromium's and not a portable constant**, and the engine has moved since 2026-08-02. That is one line of configuration, not a new measurement.

**Arm B — the polymorphic call site.** Controls: the 8-field part alone and the 5-field part alone, each monomorphic. Test: one call site driven alternately with both. Prior: M-1's 3/8/20 polymorphic case cost 6× the monomorphic 8-field figure. **Decision-driving:** the mixed/monomorphic ratio. **Telemetry:** absolutes. A ratio near 1 closes the question for two behaviors permanently; a ratio near M-1's 6× makes the shared publication site the first thing Phase 22 looks at, and does so on the composition a real page has.

**Arm C — one free-drag pointer sample, end to end.** Four compositions, which is the point: bare; `+ axis`; `+ bounds(element)`; `+ bounds(() => rect)`. The last is the only one that reaches consumer code per resolve. **Decision-driving:** the delta between bare and each constrained form — that is what `applyConstraint?.()` and the clamp actually cost, against a design that pays one property read and one predictable branch when no one filled the slot.

**Arm D — the staleness workload, in two shapes, because one of them cannot fail.** `invalidate()` is a flag and the resolve is deferred to the next `apply`. Scroll and resize raise staleness many times a second by design.

**The adversarial shape entails its own read count and must not be scored on it.** One scroll event dispatched between every pair of samples makes _one resolve per sample_ arithmetic: the flag is set once, read once, and no design in the tree could produce another answer. Counting resolves there measures the workload. So the two shapes are scored differently, and the split is the point of this arm.

- **Burst — the shape that can actually fail.** `k` scroll events between two samples, `k ∈ {1, 4, 16}`. **Decision-driving: resolves per sample.** Laziness claims to collapse `k` invalidations into **one** resolve; that claim is falsifiable, and a result above one at any `k` means the flag is being read somewhere it should not be. This is the only place a read _count_ is evidence.
- **Continuous — the shape that entails one read per sample.** Realistic pointer-plus-scroll pacing, one invalidation per sample. **Decision-driving: the per-sample cost delta against a no-scroll control**, with an element source and with a function source. **Telemetry: the read count**, which is known before the run and is recorded only so the write-up is legible.

**And the trigger this arm was originally given does not follow, which is the more important correction.** _One layout read per sample ⇒ a frame gate_ is wrong whenever the geometry genuinely changed between those samples: a frame gate serves the previous frame's rect to this frame's clamp, so under real scrolling it is a **correctness change that moves the visual**, not an optimization. A gate is justified only where both halves hold — **the resolve is a material fraction of the sample** (the continuous shape's cost delta), **and** the invalidations being collapsed fall **inside one frame**, where the rect they each describe is the same rect (the burst shape). Either half alone licenses nothing. If the burst shape shows laziness already collapses within-frame bursts to one resolve — which is what the design claims — then the frame gate has **no case left to make** regardless of the cost number, and D-70's staleness design is affirmed and closed rather than left open.

**Arm E — allocation, and what a heap reading can and cannot say.** Reframed from the standing obligation, which asked for `onMove` as a per-sample consumer callback: **timing a consumer callback measures the consumer.** What is ours is `buildGeometry`, which returns a fresh object per sample inside the `onMove` branch.

**That it allocates is not a measurable question and is not asked here.** The code constructs an object literal per sample; reading it settles the fact, and no workload can return _no_. **A `usedJSHeapSize` delta over 20 000 samples establishes net retention, not allocation** — a collector that keeps up makes churn invisible, which is exactly the bound M-1 wrote for I-26 and the reason I-26's tier stayed **C**. Scoring this arm as _0 B ⇒ no allocation_ would repeat, at the second behavior, the error M-1 was careful not to make at the first.

So the decision-driving quantity is the one the harness can legitimately establish: **whether the per-sample churn is observable as cost.**

- **Retention**, by M-1's method — 20 000 consecutive samples, `--enable-precise-memory-info`, no intervening `gc()`, with `onMove` installed and with the slot null. **Decision-driving:** any net growth at all, which would mean the geometry is being kept rather than churned and is a different and worse defect.
- **GC pressure**, which is where churn becomes visible if it matters. Over the same run, the sample-time **distribution** rather than its median: p95 and max against the null-slot control. Allocation churn that a generational collector absorbs shows up as tail, not as mean, and a tail indistinguishable from the control is the honest form of _this costs nothing observable_.

**What each outcome decides.** A tail separated from the control makes the reused-draft change — `buildGeometry` writing into a per-controller draft the way `motion` already does — a measured fix. A tail inside the control's spread closes it: the allocation is real, is stated as real, and is **not** presented as measured-free. **I-26's tier does not move on this arm**, and the write-up says so, because nothing here is capable of moving it.

---

## M-4′ — the committed-move bracket, in its eager position

**The question, stated exactly.** q7 answered _no shared read phase_ on a tree where the axis index rebuilt **lazily on the next spatial frame**. It now rebuilds **eagerly, inside the committed-move bracket**, in the one window where no displacement offset is applied — a correctness placement, chosen because a lazy rebuild measures items mid-animation. So the bracket as it runs today is: `beforeMove` span read and offset release → placeholder move → **full-candidate index rebuild** → `afterMove`. q7 measured that interleaving only as `write-between` over the whole list, and never with the rebuild in it.

**Decisions it can change.** (a) P-02, the six-scalar vertical cache, and (b) P-03, placeholder geometry per resolve — both are worth paying down only if the rebuild is the dominant term. (c) Whether the rebuild's **contents** shrink. **What is explicitly not up for re-decision on cost: the eager position itself.** It was chosen for correctness, and a cost number is not evidence against a correctness placement; if the rebuild proves expensive, the answer is a cheaper rebuild in the same window, not a lazier one.

**Reused unchanged.** `tests/perf/q7.browser.test.ts`'s workload and policy in full: `n` 40px rows in an `overflow: auto` container, one placeholder moved one slot per iteration so each iteration starts genuinely dirty; `n ∈ {50, 200, 800}`; 5 warm-ups, calibrated batch, 21 samples, median; coarse relational assertions that cannot become timing flakes.

**What must change.** The measured unit is the real bracket rather than four synthetic shapes, decomposed into span read, placeholder move, index rebuild and `afterMove`. Controls: the same bracket **without** `layoutAnimation()`, which removes the span read and the offsets and isolates the rebuild; and both axis features, run as **separate compositions** — which is what the withdrawn "two axis features" obligation should have said.

**Decision-driving:** the rebuild's share of one committed move, and the forced-layout count for the bracket. **Telemetry:** the absolute per-move cost at each `n`, and the 800-row figure against q7's 2.3 ms.

**The collection-mutation half stays structurally discharged** and is not re-opened: the bracket runs inside one `action.effect` and the queue is run-to-completion, so no replacement can interleave. Nothing about a second behavior changes that.

---

## M-5 — the unconditional activation work (F-65, and D-85 beside it)

**New, and the only genuinely new measurement in the plan.** F-65 has been carried since Phase 18 with _Phase 21 measures it; Checkpoint E decides_, and Checkpoint E closed without it. This is where the number is owed.

**Decisions it can change.** Whether D-52's **window 1** becomes conditional on something the behavior declares — an `ActivationScope` SPI change, which is the change F-65 says has no evidence behind it yet. Both outcomes decide: below a threshold the finding is **closed as an accepted, named cost** and the SPI does not move again for this reason; above it, the deferred SPI question opens with the evidence it was waiting for.

**Arm A — window 1.** The `boxPre` read runs unconditionally, once per activation, and free drag never names it. Controls: activation with the read, and with it stubbed, for each behavior.

**Arm B — D-85's `inheritedSpace`.** The inverse inherited linear part, derived unconditionally from the measurement `acquireLift` already took, and the sortable never names it. **This is arithmetic over a materialized buffer rather than a layout read**, which is the ground D-85 was accepted on; the arm exists to check that ground rather than to reopen the decision, and no cost result moves a correctness fix.

**The variable that decides the answer** is ancestry depth, because a box-quad traversal is depth-sensitive: a shallow tree can make either arm unmeasurable and prove nothing about a real page. Workload: activation at a shallow tree and at a deep, transformed ancestry, both behaviors.

**Decision-driving:** each arm's cost, **both as an absolute and as a share of the measured activation**, at the deepest ancestry tested and for the behavior that does not read the value. **Telemetry:** the shallow-tree figures, and absolute activation latency.

### The decision rule, fixed before the run

An SPI question that has been deferred twice cannot be settled by reading a number and then choosing which side of it to argue. The rule is therefore stated here, with its units, and the write-up applies it rather than re-deriving it.

**The quantity under the rule** is the cost of the unneeded arm — window 1 for free drag, `inheritedSpace` for the sortable — as the **median over the sampling policy above**, measured at the **deep transformed ancestry** (the worst case, because a box-quad traversal is depth-sensitive and a shallow tree can make either arm unmeasurable and prove nothing). Both the absolute and the relative figure are computed; the rule reads both.

| Outcome | Condition | What happens |
| --- | --- | --- |
| **F-65 closes** | **under 0.2 ms** absolute **and** **under 5%** of measured activation | Closed as an **accepted, named cost**, in F-65's own row with both figures. The `ActivationScope` SPI does not move again for this reason, and a later phase may not reopen it without a new workload showing a different number. |
| **The SPI question opens** | **over 0.5 ms** absolute **or** **over 10%** of measured activation | D-82's deferred question opens with the evidence it was waiting for: making window 1 conditional on something the behavior declares. Phase 22 designs it; this phase does not. |
| **Indeterminate** | anything between | **F-65 stays open, and neither side may be argued from this run.** The write-up states the figures, states that the rule did not resolve, and names the workload change that would — which is the outcome this band exists to make expensive rather than convenient. |

**Where the numbers come from, so they are not arbitrary.** The absolutes are borrowed from q7's measured layout costs on this machine class rather than invented: **0.2 ms** is roughly one full read pass over a 200-row list (0.194 ms) — below that, the unneeded work is smaller than a single ordinary layout read the page does anyway, and an SPI change cannot be justified by it. **0.5 ms** is roughly a second full pass over an 800-row list (0.53 ms), and ~3% of a 16 ms frame spent on work a behavior never reads is a cost worth an SPI change to remove. The **5% / 10%** relative gates exist because the absolutes alone would let a slow machine reclassify the finding: a fraction that stays small as the absolute grows means the whole activation grew, not this arm.

**The conjunction is deliberate and asymmetric.** Closing requires **both** conditions — a small number that is nonetheless most of the activation means the arm dominates and should not be dismissed. Opening requires **either** — a large absolute is worth removing whatever its share, and a large share is worth removing whatever the absolute.

**Two framings that must survive into the write-up.** Activation is **once per drag**: a cost large as a fraction and small as a number is not on its own a reason to change an SPI, which is why the closing rule takes both figures and why the write-up quotes both or neither. And **arm B's result cannot move D-85** — that decision was taken for correctness, and this arm exists to check the ground it was accepted on rather than to reopen it; if `inheritedSpace` proves expensive, the finding is that the kernel derives it unconditionally, not that the derivation should stop.

---

## M-2′ — controller cost at mixed populations

**Decisions it can change.** (a) The eager-retained frame-task policy, whose only losing case is many never-dragged controllers and whose margin is 148 B each. (b) Whether the per-controller cost is the kernel's or the behavior's — which is what Phase 22 needs before it reads the two surfaces as one.

**Reused unchanged, and this is the half that took two attempts to get right.** `gc()` before every reading; `--enable-precise-memory-info`, without which Chrome quantizes `usedJSHeapSize` to 100 kB and every figure is a rounding artifact; the **minimum of 5 runs after 3 warm-ups**, because heap noise is one-sided; and the module-level sink cleared before the baseline, without which each run frees one graph while allocating the next and every figure reads ≈ 0 — which looks exactly like _costs nothing_.

**What must change.** The population under test: `{ all sortable, half and half, all free drag }` at 100 and 1000 controllers, with **real controllers of both behaviors** rather than construction stand-ins.

**Decision-driving:** per-controller heap by behavior; cold frame-task cost at a mixed population; retention after 1000 mixed drags, which is the property that actually mattered last time. **Telemetry:** `schedule` and first-drag timings, which M-2 already showed are separated by ~4 ns and decide nothing.

---

## Order, and what "done" means

1. **M-3′** — deterministic, gates the budget re-base and the topology question.
2. **M-1′** — the hot path, and the only measurement that can find a per-sample regression.
3. **M-4′** — the committed-move bracket, which carries P-02 and P-03.
4. **M-5** — F-65's number, which closes or opens an SPI question standing since Phase 18.
5. **M-2′** — the population figures, which change the least and inform Phase 22 rather than gating it.

**Done when** every number carried in a contract document, a README or a size budget is either re-measured or explicitly re-affirmed with its workload named — and every measurement above has a written answer of the form _this decision changed / this decision is now closed_, per Phase 22's standing instruction that a measurement changing nothing was either already optimal or not worth taking, **and must say which**.
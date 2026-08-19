# Phase 21 — the measurement contract for the complete package

**Status: M-3′ and M-1′ run 2026-08-19; M-4′, M-5 and M-2′ not yet run. Corrected by a validity audit the same day (D-96)** — seven arms carried a defect that would have produced a number unable to support its decision, and each correction is marked where it lands. This document is the Phase 21 measurement contract: five measurements, what each can change, and the four standing obligations it withdraws. It supersedes the per-row _What changes_ table in [`plan.md`](../plan.md) §Phase 21, which stated the subject and not the question.

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
- **Every arm of a paired comparison disposes its fixture before the next is built** — learned at M-1′ and recorded here because M-4′, M-5 and M-2′ all run paired arms. A live controller listens on the document, so an undisposed arm receives every later arm's samples and each arm measures the sum of itself and its predecessors. M-1′'s first run read `axis: 'y'` — two comparisons — as 4.5 µs more expensive than no axis at all, which is what exposed it; see [`m1-prime.md`](m1-prime.md) §The operational rule this run added.

Timings stay opt-in behind `VITE_DRAG_MEASURE=1` and assert nothing. Structural assertions — equivalence checks, module-graph absences, read counts — run on every suite run. **A measurement that asserts nothing structural is not checked in.**

---

## M-3′ — the composition surface, re-declared

**First, because it gates a rule.** It is deterministic, needs no CPU quiet, and until the budgets are re-based every later fix is planning against a number four absorbed changes have eroded.

**Decisions it can change.** (a) The budget re-base and what the headroom is _for_. (b) **The subpath topology at two behaviors** — the both-behaviors row is the test of D-48's `kernel.js` split, and **the test is the module graph rather than the byte delta**. _Near the difference_ and _near the sum_ are not conditions a byte count can be scored against, and inventing a tolerance for them after the run is the post-hoc rule M-5's §The decision rule exists to refuse. The exact form is an **identity over graphs the harness already collects**: the both-behaviors graph must equal the **union** of the two single-behavior graphs, every shared kernel module appearing **once**. A module both behaviors need that resolves twice is duplication, is visible as duplication, and reopens the export topology under 05's own trigger — and the byte delta against the sum is then the _size_ of that duplication rather than the evidence for it. (c) The migration claim the README will make for `draggable`.

**Reused unchanged.** The whole harness mechanic: one declaration per composition, `imports`-or-`entry`, Rolldown at the lockfile version, brotli at default quality, no aliases, no repetition policy plus a byte-identity assertion across two runs, and the module-graph half.

**What must change.** The composition list, which currently has no free-drag row at all. Add: free-drag minimal; `+ bounds()`; `+ landing()`; free-drag complete; and **both behaviors in one graph**. The absence assertions gain the cross-behavior form — no `sortable/*` module in any free-drag graph and no `free-drag/*` module in any sortable graph — which is the tree-shaking claim restated at two behaviors and is new, not a re-run.

**Decision-driving:** the union identity and every other module-graph assertion; the re-based budgets. **Telemetry:** the per-composition absolute bytes, the both-behaviors delta against the sum, and baseline B.

**Run 2026-08-19; the record is [`m3-prime.md`](m3-prime.md).** The union identity **holds exactly** — 46 package modules on both sides, nothing extra in either direction, no module emitted into more than one chunk — so the topology-reopen condition did not trigger and D-48's `kernel.js` split stands at two behaviors. The four free-drag rows and the combined row are declared; the cross-behavior absence claim is asserted as a subtree prefix and holds in all ten rows. All twelve budgets are re-based to their measurement plus 150 B, with what the headroom is _for_ written down. The combined composition is 12,995 B against a 20,611 B sum of its parts — recorded as telemetry, and not the evidence for the topology claim, which the graph identity settles by itself.

**The identity was falsified before it was recorded**: scored against the wrong parts it reports five violations, so the passing result is a measurement rather than a tautology.

---

## M-1′ — the shared publication site, and free drag's sample

**Decisions it can change.** (a) Whether kernel frame publication needs a shape-stable design once one page runs two behaviors. (b) Whether the lazy resolve holds the contract it was accepted on — **one resolve per `apply`** — which is arm D's structural assertion and the only half of the frame-coalescing question still open, the gate itself closing on arithmetic (arm D). (c) P-01, the per-sample visual render. (d) Whether I-26's allocation claim holds at the second behavior with a consumer callback installed.

**Reused unchanged.** `tests/perf/m1.browser.test.ts`'s policy and equivalence discipline: 5 discarded warm-ups, calibrated batch, 21 samples, median, and the assertion that any specialized path leaves a byte-identical committed frame before a ratio is quoted. The size-parameterized arm is re-run once — not for the cliff's existence, which is settled, but because **the cliff's location is Chromium's and not a portable constant**, and the engine has moved since 2026-08-02. That is one line of configuration, not a new measurement.

**Arm B — the polymorphic call site.** Test: one call site driven alternately with an 8-field and a 5-field part. **The control must be alternation-matched, and M-1's was not.** M-1 quoted its 3/8/20 polymorphic figure against the _monomorphic 8-field_ run, so the 6× carries the alternation itself, two extra data sources and a different mean field count alongside the shape count it was attributed to. The control here is therefore **the same alternating driver over two distinct objects of one 8-field shape**, so the only difference between the arms is how many shapes the site sees.

**Decision-driving:** the ratio of the mixed arm to that alternation-matched control, named as such wherever it is quoted. The residual field-count difference — 6.5 fields against 8 — biases that ratio **toward 1**, so a measured ratio above 1 is conservative while a ratio near 1 is not, and the write-up says which. **Telemetry:** absolutes, and the two monomorphic figures, which are what make the bias computable. A ratio near 1 closes the question for two behaviors permanently; a ratio near M-1's 6× makes the shared publication site the first thing Phase 22 looks at, and does so on the composition a real page has.

**Arm C — one free-drag pointer sample, end to end.** Four compositions, which is the point: bare; `+ axis`; `+ bounds(element)`; `+ bounds(() => rect)`. The last is the only one that reaches consumer code per resolve. **Decision-driving:** the delta between bare and each constrained form — that is what `applyConstraint?.()` and the clamp actually cost, against a design that pays one property read and one predictable branch when no one filled the slot.

**Arm D — the staleness workload, and the frame gate the arithmetic closes before the run.** `invalidate()` is a flag and the resolve is deferred to the next `apply`. Scroll and resize raise staleness many times a second by design.

**The gate's benefit is bounded without measuring anything, and the bound is zero.** A frame gate removes _resolves_, and resolves are bounded above by `apply` calls — one per committed sample, at most one per staleness mark. **Free drag installs no frame task**: `createFrameTask` has exactly one caller, `src/sortable/runtime.ts`, so `moved` runs on the dispatched `pointermove` and the deployment path commits about one sample per frame. A gate can only collapse resolves where **more than one `apply` runs inside one frame**, which is not the shape free drag has. **The harness's own regime is what would hide this**: a calibrated batch dispatches hundreds of samples inside a single frame, so resolves _per sample_ measured there carry nothing about resolves _per frame_ in deployment, and a cost figure taken there cannot be converted into a saving a gate would make. The two shapes are therefore scored as follows, and the gate is not among the outcomes of either.

- **Burst — a structural assertion rather than a timing.** `k` scroll events between two samples, `k ∈ {1, 4, 16}`; the assertion is **one resolve per `apply` regardless of `k`**. This is the one place a read _count_ is evidence, and it is evidence of a **regression**: the flag is set once and read once, so a result above one means the rect is resolved somewhere the contract says it is not. It therefore runs on **every suite run and asserts**, with the other structural assertions, rather than behind `VITE_DRAG_MEASURE=1`.
- **Continuous — telemetry, and labelled as such.** Realistic pointer-plus-scroll pacing, one invalidation per sample; the per-sample cost delta against a no-scroll control, with an element source and with a function source. It is recorded because a later reader will ask what an element source costs under active scrolling. **No decision in this phase turns on it**, and the plan says so rather than leaving the label to the run: with the gate closed by the arithmetic above, a large number licenses nothing this plan is willing to do — holding a rect across frames serves the previous frame's rect to this frame's clamp, which **moves the visual**, and that is a correctness change wearing an optimization's clothes.

**What this arm decides.** With the structural assertion holding, **D-70's lazy resolve is affirmed and frame coalescing is withdrawn as an option** — withdrawn rather than deferred, so a later phase may not re-propose it without new evidence. What that evidence would be is named here: a path that runs `apply` **more than once per frame** — an input source dispatching faster than the frame, or a second consumer of the same constraint — and a re-proposal owes that workload before it owes a cost number.

**Arm E — allocation, and what a heap reading can and cannot say.** Reframed from the standing obligation, which asked for `onMove` as a per-sample consumer callback: **timing a consumer callback measures the consumer.** What is ours is `buildGeometry`, which returns a fresh object per sample inside the `onMove` branch.

**That it allocates is not a measurable question and is not asked here.** The code constructs an object literal per sample; reading it settles the fact, and no workload can return _no_. **A `usedJSHeapSize` delta over 20 000 samples establishes net retention, not allocation** — a collector that keeps up makes churn invisible, which is exactly the bound M-1 wrote for I-26 and the reason I-26's tier stayed **C**. Scoring this arm as _0 B ⇒ no allocation_ would repeat, at the second behavior, the error M-1 was careful not to make at the first.

So the decision-driving quantity is the one the harness can legitimately establish: **whether the per-sample churn is observable as cost.**

- **Retention**, which **M-1's method does not establish and this arm must not borrow it for.** M-1 reads `usedJSHeapSize` after 20 000 samples with **no** intervening `gc()`, and calls the result an upper bound on _allocation_ — correct for what it claimed. Growth under that method is uncollected churn or retention and the reading cannot tell them apart, so _any net growth means the geometry is being kept_ does not follow from it in either direction. The retention half therefore takes **M-2's discipline**: `gc()` before the baseline reading **and** before the final one, 20 000 samples between, `--enable-precise-memory-info`, 5 runs after 3 warm-ups because heap noise is one-sided, with `onMove` installed and with the slot null. **Decision-driving:** net growth across a **collected** pair, which is retention, and is a different and worse defect than churn.
- **GC pressure**, which is where churn becomes visible if it matters. Over the same run, the sample-time **distribution** rather than its median: p95 and max against the null-slot control. Allocation churn that a generational collector absorbs shows up as tail, not as mean, and a tail indistinguishable from the control is the honest form of _this costs nothing observable_.

**What each outcome decides.** A tail separated from the control makes the reused-draft change — `buildGeometry` writing into a per-controller draft the way `motion` already does — a measured fix. A tail inside the control's spread closes it: the allocation is real, is stated as real, and is **not** presented as measured-free. **I-26's tier does not move on this arm**, and the write-up says so, because nothing here is capable of moving it.

**Run 2026-08-19; the record is [`m1-prime.md`](m1-prime.md).** **Three of the four decisions close and one does not.** (a) **Closes**: against the alternation-matched control the shared publication site measures a ratio of **0.87**, and correcting the residual field-count bias with the two monomorphic figures puts the shape-count effect at **1.02** — nothing measurable, so kernel frame publication needs no shape-stable design for two behaviors. M-1's 6× is corrected by measurement rather than by argument: its own 3/8/20 scenario reproduces at 0.64 µs in the same session, and the 20-field frame in it costs 1.71 µs alone, so that figure was measuring its own largest frame across arm A's cliff — which arm A finds in the same place on an engine two majors newer. (b) **Closes**: one resolve per `apply` at every `k`, asserted continuously, and falsified against an eagerly-resolving `invalidate()` — where the `k = 1` row provably cannot discriminate, which is why the assertion is written _regardless of `k`_. D-70's lazy resolve is affirmed and frame coalescing is withdrawn. (d) **Closes**: no retention across a collected pair, with and without a consumer callback, and a tail inside the control's spread — so the allocation is real, is stated as real, and is not presented as measured-free; I-26's tier does not move. Arm C is a **one-tick null**: no resolvable per-sample cost to `applyConstraint?.()` or the clamp at ~0.1 µs. **No Phase 22 optimization opens.**

**(c) P-01 does not close, and no arm of this contract can close it.** The deciding quantity is how many samples a real high-rate input commits inside one frame, which is the same regime D-96 found unobservable when it withdrew the frame gate — a calibrated batch dispatches hundreds of synthetic samples inside one frame. Arm C measures the whole sample without decomposing the visual write, so quoting it against P-01 would substitute a convenient number for the deciding one. **There is a candidate closure on arithmetic and it is not this run's to take**: D-96 established that `moved` runs on the dispatched `pointermove` and commits about one sample per frame, and if that extends from resolves to visual writes then P-01's saving is bounded at ~zero by the same argument. D-96 applied it to resolves only, so extending it is a contract decision and is raised rather than assumed.

---

## M-4′ — the committed-move bracket, in its eager position

**The question, stated exactly.** q7 answered _no shared read phase_ on a tree where the axis index rebuilt **lazily on the next spatial frame**. It now rebuilds **eagerly, inside the committed-move bracket**, in the one window where no displacement offset is applied — a correctness placement, chosen because a lazy rebuild measures items mid-animation. So the bracket as it runs today is: `beforeMove` span read and offset release → placeholder move → **full-candidate index rebuild** → `afterMove`. q7 measured that interleaving only as `write-between` over the whole list, and never with the rebuild in it.

**Decisions it can change.** (a) P-02, the six-scalar vertical cache, and (b) P-03, placeholder geometry per resolve — both are worth paying down only if the rebuild is the dominant term. (c) Whether the rebuild's **contents** shrink. **What is explicitly not up for re-decision on cost: the eager position itself.** It was chosen for correctness, and a cost number is not evidence against a correctness placement; if the rebuild proves expensive, the answer is a cheaper rebuild in the same window, not a lazier one.

**Reused unchanged.** `tests/perf/q7.browser.test.ts`'s workload and policy in full: `n` 40px rows in an `overflow: auto` container, one placeholder moved one slot per iteration so each iteration starts genuinely dirty; `n ∈ {50, 200, 800}`; 5 warm-ups, calibrated batch, 21 samples, median; coarse relational assertions that cannot become timing flakes.

**What must change.** The measured unit is the real bracket rather than four synthetic shapes, decomposed into span read, placeholder move, index rebuild and `afterMove`. Controls: the same bracket **without** `layoutAnimation()`, which removes the span read and the offsets and isolates the rebuild; and both axis features, run as **separate compositions** — which is what the withdrawn "two axis features" obligation should have said.

**Decision-driving:** the rebuild's share of one committed move, and the bracket's **element read count** — q7's harness already counts `getBoundingClientRect` calls per field, and that instrument is reused unchanged. **It is a read count and must not be written up as a forced-layout count.** A forced layout is a read that _follows a write_; an in-page harness cannot observe one directly, and the two numbers differ by exactly the interleaving this measurement exists to characterise. What is recorded instead is the counter's value at each of the bracket's four boundaries, which places every read on one side or the other of the placeholder write and is the observable the interleaving question actually needs. **Telemetry:** the absolute per-move cost at each `n`, and the 800-row figure against q7's 2.3 ms.

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

**The quantity under the rule** is the cost of the unneeded arm — window 1 for free drag, `inheritedSpace` for the sortable — as the **median over the sampling policy above**, measured at the **deep transformed ancestry** (the worst case, because a box-quad traversal is depth-sensitive and a shallow tree can make either arm unmeasurable and prove nothing). Both the absolute and the relative figure are computed; the rule reads both, in the asymmetric way stated below.

**The denominator is defined here, because it is fixture-sensitive and would otherwise be a free parameter.** _Measured activation_ is the kernel and behavior activation path **excluding every consumer slot** — no `onStart`, no `visual` resolver body, no consumer `axis` source — taken in the **same session** on the **same fixture** as the arm. With consumer work inside it, a fixture author moves the share to either side of any gate by writing more or less of that work, which is a property of the fixture and not of the tree.

**The stub is a specialized path against a general one, so the standard's equivalence check applies to it.** The stubbed build must leave free drag's activation output identical to the shipped build's, asserted before any ratio is quoted. For the sortable the stub is **not** equivalent — the sortable reads window 1 — so no sortable figure is taken from it: arm A's number is free drag's, which is the behavior the finding is about.

| Outcome | Condition | What happens |
| --- | --- | --- |
| **F-65 closes** | **under 0.2 ms** absolute **and** **under 5%** of measured activation | Closed as an **accepted, named cost**, in F-65's own row with both figures. The `ActivationScope` SPI does not move again for this reason, and a later phase may not reopen it without a new workload showing a different number. |
| **The SPI question opens** | **over 0.5 ms** absolute, whatever the share | D-82's deferred question opens with the evidence it was waiting for: making window 1 conditional on something the behavior declares. Phase 22 designs it; this phase does not. |
| **Indeterminate** | anything else, **including a small absolute with a large share** | **F-65 stays open, and neither side may be argued from this run.** The write-up states the figures, states that the rule did not resolve, and names the workload change that would — which is the outcome this band exists to make expensive rather than convenient. |

**Where the numbers come from, corrected at the validity audit.** They were first derived from q7's `one` column — 0.194 ms over 200 rows, a second pass at 0.53 ms over 800 — and **that derivation does not hold.** q7's figures are full read passes over a _list_; the quantity here is one element's box and its ancestry, which is one to two orders of magnitude smaller, so a gate anchored to a list pass is not a gate at all — it would close F-65 on any result the tree can produce. The standard separately forbids importing an absolute from an older session on this shared CPU, which is what quoting that column is.

**The constants are kept and re-derived against the only budget a once-per-drag cost has: the frame the drag starts in.** **0.2 ms** is ~1.2% of a 16 ms frame — work at that scale cannot make activation miss its frame, whatever share of activation it happens to be. **0.5 ms** is ~3% of that frame, and once-per-drag work a behavior never reads at that size is worth an SPI change to remove. Both are fractions of a **display-fixed** budget rather than of a measured column, which is what makes them survive the CPU drift the standard warns about; the relative gate carries the machine-sensitivity the absolutes cannot.

**The conjunction is asymmetric, and the audit changed which way.** Closing requires **both**: a small number that is nonetheless most of the activation means the arm dominates a cheap path and should be recorded rather than dismissed, so a large share **blocks a close** and lands the run in the indeterminate band. **Opening requires the absolute alone.** The earlier rule opened on _over 10% of measured activation_ as an independent disjunct, and that contradicted this section's own framing two paragraphs down — _activation is once per drag, so a cost large as a fraction and small as a number is not on its own a reason to change an SPI._ A share cannot be a reason to refuse a close and also a sufficient reason to open. It is quoted with every result and decides nothing by itself.

**Two framings that must survive into the write-up.** Activation is **once per drag**: a cost large as a fraction and small as a number is not on its own a reason to change an SPI, which is why the closing rule takes both figures and why the write-up quotes both or neither. And **arm B's result cannot move D-85** — that decision was taken for correctness, and this arm exists to check the ground it was accepted on rather than to reopen it; if `inheritedSpace` proves expensive, the finding is that the kernel derives it unconditionally, not that the derivation should stop.

---

## M-2′ — controller cost at mixed populations

**Decisions it can change.** (a) ~~The eager-retained frame-task policy~~ — **withdrawn at the validity audit, because a mixed population cannot reach it.** The frame task is **sortable-owned and per-controller**: `createFrameTask` has one caller, `src/sortable/runtime.ts`, and free drag installs none. Replacing sortable controllers with free-drag ones therefore _removes_ frame tasks rather than stressing them, so every mixed population is strictly cheaper on this axis than the all-sortable case M-2 already measured, and no outcome of this workload moves the 148 B margin. (b) Whether the per-controller cost is the kernel's or the behavior's — which is what Phase 22 needs before it reads the two surfaces as one, and is now, with retention, the whole of what this measurement decides.

**Reused unchanged, and this is the half that took two attempts to get right.** `gc()` before every reading; `--enable-precise-memory-info`, without which Chrome quantizes `usedJSHeapSize` to 100 kB and every figure is a rounding artifact; the **minimum of 5 runs after 3 warm-ups**, because heap noise is one-sided; and the module-level sink cleared before the baseline, without which each run frees one graph while allocating the next and every figure reads ≈ 0 — which looks exactly like _costs nothing_.

**What must change.** The population under test: `{ all sortable, half and half, all free drag }` at 100 and 1000 controllers, with **real controllers of both behaviors** rather than construction stand-ins.

**Decision-driving:** per-controller heap by behavior; retention after 1000 mixed drags, which is the property that actually mattered last time. **Telemetry:** the cold frame-task cost at a mixed population, and `schedule` and first-drag timings, which M-2 already showed are separated by ~4 ns and decide nothing.

---

## Order, and what "done" means

1. **M-3′** — deterministic, gates the budget re-base and the topology question.
2. **M-1′** — the hot path, and the only measurement that can find a per-sample regression.
3. **M-4′** — the committed-move bracket, which carries P-02 and P-03.
4. **M-5** — F-65's number, which closes or opens an SPI question standing since Phase 18.
5. **M-2′** — the population figures, which change the least and inform Phase 22 rather than gating it.

**Done when** every number carried in a contract document, a README or a size budget is either re-measured or explicitly re-affirmed with its workload named — and every measurement above has a written answer of the form _this decision changed / this decision is now closed_, per Phase 22's standing instruction that a measurement changing nothing was either already optimal or not worth taking, **and must say which**.
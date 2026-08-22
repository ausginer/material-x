# Phase 22 — the bundle-structure entry

**Run 2026-08-22** against `e9590c3c`, on a clean tree, from a fresh `just build`. This is the second of Phase 22's four deliverables and it is read the way `plan.md` §Phase 22 states it: _composition costs across the full topology, and whether the subpath set is still the right shape with two behaviors and two axes._

**It re-measures rather than infers.** [M-3′](measurements/m3-prime.md) is the baseline, and P-06 and P-02's shrink have landed since it ran. Both recorded their own per-row deltas, and a delta recorded at landing is a claim about the tree at landing — so every figure below comes from a fresh build, and none is reconstructed by adding published deltas to M-3′'s table.

## Reproducibility

The six inputs [05](contract/05-lifecycle-invariants.md) §Measurements owed asks for. Five are unchanged from M-3′ because they are values in `bench/size/measure.ts` rather than flags, and the sixth is this run's tree.

| Input | Value |
| --- | --- |
| Workload and harness | `bench/size/measure.ts`, checked in, unmodified by this pass |
| Tree | `e9590c3c`, clean, `just build` immediately before measuring |
| Bundler | Rolldown **1.1.5** (workspace lockfile), `platform: 'neutral'`, ESM out, no aliases |
| Minifier / compression | Rolldown built-in `minify: true`; Brotli via `node:zlib` at default quality (**11**) |
| Engine | Node **v26.7.0**, Linux x86_64 |
| Sampling | None, and none is needed — the pipeline is deterministic, which `tests/bench/size.node.test.ts` asserts rather than assumes |

**One figure in this document is not produced by the checked-in harness** and is marked where it appears: the per-module attribution of the floor (§Where the fixed cost lives). It was taken by an ad-hoc script driving the same Rolldown configuration the harness declares, run from the package tree and discarded — **telemetry taken once**, not a standing assertion.

**The other one is no longer telemetry.** The bundled cost of the two root entries (§The two roots) was the second, and **F-77 closed on 2026-08-22**: both roots are declared compositions in `bench/size/measure.ts` and are asserted on every `just size`.

## The twelve declared rows

All figures Brotli bytes; `slack` is budget minus measurement; `mods` excludes the harness's synthetic entry.

| Composition | Brotli | Budget | Slack | Mods |
| --- | --: | --: | --: | --: |
| minimal | 11,139 | 11,260 | 121 | 31 |
| minimal (xy) | 10,801 | 10,940 | 139 | 30 |
| minimal + layoutAnimation | 11,571 | 11,700 | 129 | 32 |
| minimal + landing | 11,423 | 11,540 | 117 | 33 |
| complete | 11,849 | 11,970 | 121 | 34 |
| free drag minimal | 8,717 | 8,870 | 153 | 26 |
| free drag + bounds | 8,863 | 9,010 | 147 | 27 |
| free drag + landing | 9,016 | 9,170 | 154 | 28 |
| free drag complete | 9,162 | 9,310 | 148 | 29 |
| both behaviors | 13,396 | 13,520 | 124 | 47 |
| baseline A — feature-matched, non-composed | 11,566 | 11,680 | 114 | 30 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 7,040 | 151 | 26 |

**Every row is under budget and every graph assertion passes.** `just size` exits 0.

**Marginal cost of each optional feature**, which is the property §Tree-shaking asserts and the one a budget cannot express on its own:

| Feature                  | Marginal |
| ------------------------ | -------: |
| `layoutAnimation()`      |     +432 |
| sortable `landing()`     |     +284 |
| both sortable optionals  |     +710 |
| `bounds()`               |     +146 |
| free-drag `landing()`    |     +299 |
| both free-drag optionals |     +445 |
| `y()` over `xy()`        |     +338 |

The two optionals are additive on both behaviors to within brotli's noise — 432 + 284 = 716 against a measured 710, and 146 + 299 = 445 against a measured 445. **Additivity is the observable, not the totals**: it is what "each optional feature adds only itself" looks like in bytes, and it is the byte-side companion to the graph absences.

## The topology tests

**The union identity holds at 47 = 47.** The combined composition pulls exactly the union of `complete` and `free drag complete`; no module appears in the combined graph and neither single graph, and none is lost. D-48's `kernel.js` split still holds at two behaviors, two axes and one landed optimization, and no export-topology question is opened.

**Nothing is emitted into more than one chunk**, in any of the twelve rows.

**Cross-behavior absence holds on all ten behavior rows.** No sortable composition reaches a `free-drag/` module and no free-drag composition reaches a `sortable/` module, asserted as a subtree prefix so the claim stays total over a growing tree.

**The exclusivity assertions hold, including the one that has actually failed.** The unselected axis is absent from every composition; `sortable/verified-refresh.js` is absent from `minimal (xy)` and present on all six rows that reach it. That second pair is the important one: it is the claim P-06 broke, D-102 held the budgets red over, and the implementation then satisfied. **The instrument caught a real topology mistake once, which is the only evidence that it would catch the next one.**

## The two roots, measured for the first time

`files.json` publishes **ten** runtime subpaths. `bench/size` declares compositions over **eight** of them. The two it has never weighed are `drag.js` and `kernel.js` — the shared-vocabulary root and the kernel tier.

That omission is not incidental to this deliverable, because [03](contract/03-feature-composition.md) §The export topology this requires opens by saying what a subpath is _for_:

> A separate subpath entry per optional **capability** is what makes the measurement honest: the minimal fixture's import graph physically cannot reach geometry it did not import, independent of bundler heuristics.

and D-56 deleted three subpaths on the converse — **a subpath carrying no runtime machinery measures nothing** — admitting exactly one exception, a type-only entry that makes no isolation claim to be checked. `sortable/feature.js` and `free-drag/feature.js` are that exception and are correctly out of scope: they emit `.d.ts` and no `.js`.

`drag.js` and `kernel.js` are not that exception. Both carry runtime machinery, both make an isolation claim in the contract's own table, and neither has ever been weighed. **Measured here:**

| Root | Brotli | Modules | What it pulls |
| --- | --: | --: | --- |
| `drag.js` — `{ DraggableError }` | **121** | **1** | `kernel/errors.js` only |
| `kernel.js` — `{ draggable }` | **6,514** | **12** | the kernel floor |

**The 121 B figure is the strongest evidence the three-root topology has ever had, and it is the check the contract asked for by name.** 03 §The export topology records a standing doubt about that topology:

> **Two independent arguments have now produced the same three-root topology, and that deserves suspicion rather than confidence.** The first was structural type dependency and it lasted one revision; the second is runtime-value sharing. Both were derived from the same table, by the same author, in the same week. The topology has never been checked against a consumer who did not already believe it — `tests/packaging.node.test.ts` asserts what the table says, not that the table is right.

A bundled measurement of the roots is precisely a check that does not depend on believing the table. It says: a consumer who wants `err instanceof DraggableError` and nothing else pays **121 bytes and one module**, not the 6.5 kB kernel. The argument for giving shared vocabulary its own root — that neither tier should have to import the other to name a symbol both hand out — is now a **measured** property rather than a derivation, and **the doubt at 03 §The export topology closes**.

**And the isolation is real but not structural, which is why a standing assertion is worth having.** `src/kernel/errors.ts` imports thirteen runtime `FAILURE_*` constants from `./failures.ts` and uses them as computed keys in `STAGE_TO_CODE`. `drag.js` still bundles to one module because Rolldown shakes `STAGE_TO_CODE` and `toDraggableError` away from the `DraggableError` class in the same module. **That is a tree-shaking outcome, not a guarantee.** One runtime reference from the error class to the stage map, or one side effect in `failures.ts`, and `drag.js` grows from 121 B to carry `kernel/failures.js` — and it grows silently, because this is the one published runtime root with no bundled-graph assertion over it.

That is exactly the failure mode the harness's own doctrine names — _a module can be pulled in, shaken down to almost nothing, and show up as a small delta that reads like success_ — applied to a subpath the harness does not measure. It was recorded as **F-77**, and F-77 is **closed**: both rows are declared, and the two regressions they were built for were each injected and each caught. See §F-77.

**One fact the roots' graphs turned out to carry, which this section did not know when it first weighed them.** `kernel.js` does not pull `kernel/errors.js` either — `draggable` alone never names the class — so the two roots are **disjoint** rather than nested. D-48's _neither tier should have to import the other to name a symbol both hand out_ therefore holds in both directions, not one, and that is now asserted rather than observed.

**`tests/packaging.node.test.ts` is not the missing assertion and should not be mistaken for it.** It walks the _source_ import graph from declared entrypoints and asserts physical unreachability _independent of any bundler's tree-shaking heuristics_ — which is a stronger claim where it applies and a different one here. On the source graph `drag.js` **does** reach `kernel/failures.js`. The 121 B is a statement about the bundled graph, and only a bundled-graph instrument can hold it.

## Where the fixed cost lives

**The cross-behavior shared set is 16 modules**, and this is the first run to enumerate it rather than count it:

`kernel.js`, and under `kernel/`: `errors`, `frames`, `input-policy`, `invalidation`, `kernel`, `lifetimes`, `pointer`, `presentation`, `protocol`, `queue`, `realm`, `reporter`, `seams` — thirteen. Plus `shared/landing-runner.js`. Plus **`@ydinjs/box-quad`**.

**M-3′'s prose breakdown of this set is wrong and the total is right.** It reads _"the fifteen under `kernel/` plus `shared/landing-runner.js`"_. There are **thirteen** under `kernel/`; the fourteenth is `kernel.js` at the package root, and the sixteenth is an **external package**, not a kernel module. The correction is recorded in [`m3-prime.md`](measurements/m3-prime.md); the union identity M-3′ actually asserted is unaffected, because it was scored over module sets rather than over that sentence.

**The floor, and what can and cannot be divided:**

| Reading | Brotli | Modules |
| --- | --: | --: |
| `kernel.js` alone (`draggable`) | 6,514 | 12 |
| a free-drag-only consumer, minimal | 8,717 | 26 |
| a free-drag-only consumer, complete | 9,162 | 29 |
| a two-behavior page | 13,396 | 47 |
| doubly-counted content, `complete` + `free drag complete` − `both behaviors` | 7,615 | (16 shared modules) |

**A brotli bundle does not decompose into a shared part and a specific part, and the last row must not be used as though it did.** It estimates content counted twice **between the two complete compositions**, both of which contain all sixteen shared modules. It may not be subtracted from `free drag minimal`, which contains only fifteen of them — `shared/landing-runner.js` arrives with `landing()`, not with `freeDrag()`.

**What is exact is containment, and it gives a bound in each direction.** A free-drag-only bundle strictly contains the twelve-module `draggable` floor, so **at least 6,514 B — about 75% — is kernel a free drag cannot run without**, and the eleven-module free-drag layer of that composition is **at most 2,203 B, about 25%**. It is a bound rather than a split because free drag also reaches three kernel modules the `draggable`-only floor does not (`kernel/errors.js`, `kernel/input-policy.js`, `kernel/invalidation.js`), and those sit inside the 2,203 B alongside the free-drag code.

> **Correction, 2026-08-22, and it is this document's own error.** The first version of this section subtracted the 7,615 B figure from `free drag minimal` and reported _~7.6 kB of shared infrastructure to get ~1.1 kB of free drag_, at _~87% shared_. That is wrong three ways: it subtracts a sixteen-module shared set from a composition holding fifteen of them; it treats a non-additive estimate as a term in an exact subtraction; and the residual it produces describes the **minimal** free-drag layer while reading as though it described all free-drag code. **The claim is withdrawn and replaced by the bounds above and the marginals below.** The two-behavior figure — 7,615 B of 13,396 B, ~57% — is unaffected, because there both compositions do contain all sixteen, and it is an estimate quoted as one.

**Three kernel modules are in every behavior composition and not in the `draggable`-only floor**: `kernel/errors.js`, `kernel/input-policy.js`, `kernel/invalidation.js`. So the effective floor for anyone who installs a behavior is **15 modules, not 12**, and the 6,514 B row understates it. `kernel.js` alone is not a deployment — nobody ships `draggable` without a behavior — which matters for §The declines below.

**Within the floor, by rendered bytes** — a pre-minification proxy, quoted for ordering rather than as shipped bytes, since the module sum exceeds the emitted bundle several times over:

| Module                   |  Rendered | Note                    |
| ------------------------ | --------: | ----------------------- |
| `kernel/kernel.js`       |    45,024 | over half the floor     |
| `kernel/presentation.js` |    10,425 |                         |
| `kernel/seams.js`        |     9,205 |                         |
| **`@ydinjs/box-quad`**   | **6,291** | **external dependency** |
| `kernel/frames.js`       |     5,371 |                         |

**This corroborates M-2′ from an independent direction and that is the finding worth carrying.** M-2′ measured ~80% of per-controller _retained heap_ as common to both behaviors. This run bounds a free-drag consumer's _shipped bytes_ at **~75% common**. They are different quantities — space at runtime against bytes on the wire — and neither is evidence for the other. What they agree on is structural: **the kernel is the artifact and the behaviors are thin.** D-99 named that as prioritisation context and explicitly refused to make it a candidate; it is still context, and it is now context in two dimensions.

## The free-drag layer, reconciled against the source tree

**Added 2026-08-22 in response to a challenge to the withdrawn ~1.1 kB figure**, and it is the reconciliation that figure should have carried from the start. `src/free-drag/` holds **13** `.ts` files, which is not the number of modules any bundle contains.

|  | Modules | Which |
| --- | --: | --- |
| `src/free-drag/` source files | 13 | including `feature.ts` |
| of those, runtime-bearing | **12** | `feature.ts` is type-only — it emits `free-drag/feature.d.ts` and no `.js`, and never enters a runtime graph |
| plus the subpath root `src/free-drag.ts` | **13** | the full free-drag layer as a bundler sees it |
| reached by **free drag minimal** | **11** | root + `assemble`, `behavior`, `config`, `controller`, `domain`, `frames`, `geometry`, `runtime`, `slots`, `spec` |
| added by **free drag complete** | **+2** | `bounds.js`, `landing.js` — the two optional features |

So the counts reconcile exactly: 13 source files, one type-only, 12 runtime plus the root, and the complete composition reaches all 13. **The minimal composition reaches 11 of them, and that is the composition the withdrawn figure was computed from** — which is the second reason it could not have meant _all free-drag code_.

**What the layer costs is a marginal quantity, and marginals are exact where a decomposition is not:**

| Marginal | Brotli |
| --- | --: |
| the **complete** 13-module layer, added to a complete sortable page | **1,546** |
| the **minimal** 11-module layer, added to a complete sortable page | **1,396** |
| `bounds()` + `landing()` added to a standalone free drag | 445 |
| `bounds()` + `landing()` added to a page that already runs sortable's `landing()` | **150** |

**Those last two rows are the same two modules at 445 B and 150 B, and the gap is the whole point.** `shared/landing-runner.js` is already paid for when sortable's `landing()` is composed, so free drag's `landing()` adds only its installer. **There is no context-free answer to _what does the free-drag layer cost_** — it costs what it costs against a stated base, and this document states one every time it quotes a number.

**The sanity check the challenge was really asking for.** The free-drag layer is **30,778 B rendered across its 13 modules — 24.5%** of the complete free-drag graph's rendered bytes, and `free-drag/spec.js` alone is 14,462 B of that. Thirteen modules reaching a marginal ~1.5 kB compressed is minification and Brotli doing ordinary work on ~30 kB of source against a bundle that already shares a dictionary with the kernel. **It is not thirteen nearly-empty modules**, and the withdrawn phrasing invited exactly that reading.

## What composition costs, and a contract question that closes with it

**283 B, or 2.4% of `complete`** — 11,849 B composed against baseline A's 11,566 B feature-matched hand-written build.

03 §What isolation cannot shake asks for exactly this and has been waiting on it:

> Measure the fixed cost too, and compare it against a hand-written, non-composed sortable […] That plumbing may well be entirely acceptable. It has not been weighed.

**It has now been weighed twice and it has not moved**: 289 B at M-3′, 283 B here, across P-06's new module and P-02's new branch. The composition machinery — the optional keys in `SortableContribution`, the assembler property reads and `claim` branches, the nullable slot fields and their null checks, the three always-present pipeline arrays — costs a stable 2.4% and does not grow as features are added to it. **That is the property worth having, more than the number**: an overhead that grew with the feature count would be an argument against the composition model, and this one does not.

## The declines

**No size candidate is earned.** The test applied is D-99's — a measurement changes a named decision or it is telemetry — and the user's framing of this deliverable: a candidate must be **material and locally removable**. Everything material here is not locally removable, and everything locally removable is either immaterial or refused by a standing decision.

| Considered | Size | Why it is declined |
| --- | --- | --- |
| **Split the kernel further** so `draggable`-only consumers ship less | 6,514 B floor | The `draggable`-only configuration **is not a deployment**. Nobody ships the kernel without a behavior, and the effective floor is 14 modules rather than 11. Optimizing a graph no consumer builds is optimizing telemetry |
| **Make keyboard sorting optional** | ~1,534 B rendered | Locally removable and **refused by decision**. Phase 16, D-32/D-33: keyboard sorting is a `BehaviorSpec` member rather than a feature precisely so a consumer cannot tree-shake away the second input mode. That is a deliberate accessibility position, and **a bundle pass may not reopen an accessibility decision on byte grounds** |
| **Make `kernel/input-policy.js` optional** | ~4,030 B rendered | The same class. It exists because of a release-blocking input-policy finding; making it composable would make the safe configuration the opt-in one |
| **Split `sortable/spec.js`** | 24,395 B rendered, the largest behavior module | No measured problem attaches. A module boundary under `unbundle` is priced at ~60 B by the Phase 17 precedent, and the split buys nothing a consumer can tree-shake, because every composition that reaches `sortable.js` reaches all of it |
| **Trim or inline `@ydinjs/box-quad`** | 6,291 B rendered | Not drag2's to remove, doing work D-72 and D-85 depend on, and its placement is already asserted — `tests/packaging.node.test.ts` holds the geometry package out of every _behavior_ module, and it is reached from `kernel/presentation.ts` by design |
| **Recover P-02's absorbed +34 B** | 34 B | Immaterial, and recovering it would mean re-opening a landed optimization to save a quarter of one row's remaining slack |
| **Composition overhead** | 283 B, 2.4% | The price of the architecture, stable across two feature additions, and the thing 03 asked to have weighed rather than removed |

**The subpath set is the right shape.** Ten runtime entries, each carrying runtime machinery a composition either imports or does not; two type-only entries that measure nothing and say so, which D-56's rule admits by name. Two behaviors, two axes, and the union identity holds across all of it. **Nothing here argues for adding a subpath, and nothing argues for removing one.**

## Headroom: do not re-base, and the condition that changes that

Slack runs **114–154 B** against M-3′'s uniform _measurement plus ~150 B_ rule — tightest at baseline A (114) and `minimal + landing` (117), loosest on the free-drag rows (147–154), which nothing has touched since M-3′.

**The drift is fully attributable and it is one landed change.** P-02's shrink cost +34 B on the `y()` compositions and +14 B on `minimal (xy)`, absorbed rather than re-based. **That absorption followed M-3′'s rule rather than bending it**: _a change that fits inside it silently is a change that added no module_ — and P-02 added no module. The free-drag rows did not move because P-02 does not reach them, which is itself a small confirmation that the erosion is the change it is claimed to be.

**Do not re-base, and the reason is that the instrument's sensitivity where it matters has not changed.** The failure this headroom exists to catch is a module appearing in a graph. Two modules have actually appeared in this package's history: `sortable/verified-refresh.js` at 361–388 B and `sortable/rect-index.js` at ~60 B. At 150 B of slack the first trips the budget and the second does not; at 117 B the first trips the budget and the second does not. **Nothing about what this instrument detects has moved**, and a re-base would spend real detection margin to make a table look uniform.

It would also invert the instinct D-102 ratified — _an absorbed number is a number nobody reads again_ — by establishing that headroom is restored on a schedule rather than on an event. M-3′'s own rule is that a budget re-bases **on purpose, with its reason written down**.

**The re-base conditions, stated so the next pass does not have to re-derive them:**

- a row goes negative; or
- erosion stops being attributable to a named landed change — at which point the number to investigate is the attribution, not the budget; or
- **L-11 lands.** `plan.md` §Phase 23 books five runtime cells onto two frozen entrypoints, and 05 §Measurements owed makes the frozen export map part of M-3 by construction, so that change re-measures M-3 whether or not it moves a byte. It is the next scheduled re-base event and it is not Phase 22's.

## F-77 — two published runtime roots carry no bundled-isolation assertion

**Closed 2026-08-22, by the harness change it asked for and by one it did not.** `drag.js` and `kernel.js` are now declared compositions in [`bench/size/measure.ts`](../bench/size/measure.ts), asserted on every `just size`. **No production code changed**, which was the condition.

| Row | Brotli | Budget | Graph assertion |
| --- | --: | --: | --- |
| `vocabulary root - drag.js` | **121 B** | **150 B** | `only: ['kernel/errors.js']` |
| `kernel root - kernel.js` | **6,514 B** | 6,660 B | `present` + no `sortable/`, no `free-drag/` |

**The graph half needed a capability the harness did not have.** The invariant is _`drag.js` reaches `kernel/errors.js` and nothing else_, and neither `absent` nor `absentPrefixes` can say it: the one module that must appear lives inside the one subtree that must not, and enumerating today's absences answers a total claim with a list that goes stale the moment `kernel/` gains a file. So `Composition` gains **`only`** — the bundled graph, exactly — which is the same vacuity argument that produced `absentPrefixes` and is reserved for roots whose whole point is what they do not reach.

**And the graph half alone would not have closed this.** The packed `kernel/errors.js` carries a **bare** `import "./failures.js"`: `tsdown` inlines the thirteen `FAILURE_*` constants as literals, so machinery arriving from `failures.ts` lands _inside_ `errors.js` and moves no module count at all. This section's own prediction — _one runtime reference from the error class to the stage map_ — is precisely that shape.

**Both regressions were injected, and each is caught by exactly one half:**

| Injected | Graph | Bytes | Caught by |
| --- | --- | --- | --- |
| `DraggableError` method returning `STAGE_TO_CODE` | unchanged, 1 module | **121 → 190 B** | the **budget**, `over budget by 40 B` |
| a side effect in `failures.ts` | **+`kernel/failures.js`** | 121 → 140 B, _still under_ | the **graph**, `pulls kernel/failures.js` |

Each mutation was built, measured, reverted and rebuilt; `git diff src/` is empty. **The two halves are not redundant** — neither regression trips the other's half — which is the strongest available evidence that this row is an instrument rather than a formality, and it is the same standard the `xy()`/P-06 exclusivity claim met by actually failing once.

**The budget is 29 B of headroom rather than the standing ~150 B, deliberately.** That convention is sized to _roughly one module_ against 8–13 kB compositions; on a 121 B root, one module's worth of slack is larger than the artifact, and the row would report success through exactly the growth it exists to prevent. Under the first regression every other row moved ~10 B and stayed green — this row is about seven times more sensitive to it, which is the whole reason for declaring it. `plan.md` §Phase 22 warns against closing F-77 _by widening a budget instead of adding the assertion_; the assertion is added, and the budget is **narrowed**.

A legitimate change to `DraggableError` re-bases this number visibly, under the standing rule that a budget re-bases rather than a fix shrinking.

## Corrections to the record

Three, all in documents this deliverable had to read, none affecting a landed decision:

1. **M-3′'s shared-set breakdown** — _"the fifteen under `kernel/` plus `shared/landing-runner.js`"_ — misattributes an external package and `kernel.js` to the `kernel/` subtree. The total of 16 is right. Corrected in place, marked.
2. **03 §Tree-shaking publishes the 2026-08-08 table** — five sortable rows, no free-drag rows, and a headroom sentence quoting _0.11–0.16 kB against budgets set at ~0.3 kB_. It is stale by two re-bases, and 05 §Measurements owed points at it as the live location. Refreshed against this run.
3. **`05 §What would reopen this` does not exist.** It is cited as the authority for _adding a subpath reopens what "minimal" means_ in `plan.md` §Phase 17 and in `bench/size/measure.ts`'s `minimal (xy)` comment. The doctrine is real and 05 §Measurements owed carries it — the frozen export map is part of M-3 — but the heading was never written. **Not fixed here**: one of the two citations is in a source file, and re-pointing a citation is not this document's to land. Recorded so the next pass over 05 either writes the section or re-points both.

## What this closes, and what it does not

**Closed.** Composition costs are re-measured across the full topology from a fresh build. The subpath set is affirmed at two behaviors and two axes, with no addition and no removal. Optional code stays out of every composition that cannot execute it, including the one exclusivity claim that has actually failed and been fixed. The fixed cost is located and bounded: a 16-module shared set at ~7.6 kB across the two complete compositions, and at least the 12-module, 6,514 B `draggable` floor — ~75% — inside any free-drag-only bundle. Composition overhead is weighed at 283 B and shown stable, which closes 03 §What isolation cannot shake. The three-root topology's standing doubt at 03 §The export topology closes on a measurement that does not depend on believing the table. **No size candidate is earned, and the bundle-structure entry closes as justified.**

**Not touched.** The API and maintainability deliverables are Phase 22's next two and nothing here anticipates them — in particular, `kernel.d.ts` emitting 35 types against the contract table's 33, and `drag.js.map` appearing in `package.json` `files` without existing on disk, are both **noted and deliberately left** to the API pass, where the packed declaration surface is the subject. §Check D-56 stays Phase R's. L-11 stays Phase 23's. P-02's stride sub-candidate, the committed-move forced flush and P-04/P-05 are untouched by this pass and remain what they were: named, unmeasured, and not started.